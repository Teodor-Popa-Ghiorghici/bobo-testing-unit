# Stand Battle Arena — Game Design Document

**Companion to** `docs/stand-battle-arena-spec.md` (the *technical* contract) and
`docs/stand-battle-arena-tech.md` (engine gap analysis + build order).

This document answers one question: **what is the game, and why would anyone play it for 40 hours?**
It is the binding reference for gameplay. The spec remains binding for architecture, rendering, audio
and the fairness constraints in its §5.

There is **no line budget** on this project (spec §0). Nothing below should be cut for size reasons.

---

## 0. Where the project actually is today

Honest audit of the shipped prototype, gameplay/mechanics only (graphics, animation and audio are
excluded by request — those are in good shape and are not the bottleneck):

| System | State | Verdict |
|---|---|---|
| Arena | 1D lane, `Math.abs(dx) <= range` | **Replace.** One axis cannot carry 40 hours. |
| Enemies per fight | Exactly 1 | **Replace.** No crowd game, no target selection, no spacing. |
| Player moves | 5 fixed moves, no strings, no cancels, no input buffer | **Rebuild.** Inputs during recovery are dropped entirely. |
| Dodge | 260ms, 200ms i-frames, no cost, polled on hold | **Broken.** Holding the key is ~77% invulnerability uptime. |
| Parry | 200ms window, flat 12 damage | Skeleton is right, reward is not. |
| Enemy AI | One state machine, distance-weighted pattern pick | Fine as a base; no punish logic, no poise, no interrupts. |
| Stats | 6 defined; only `power` is read | Speed / Range / Precision / devPotential are dead. |
| Progression | 6 fixed linear nodes, 1 act | **Replace** with seeded branching DAG. |
| Items | 3 flat multiplier buffs | **Replace.** No synergy surface at all. |
| Hooks | 12 named events, notification-only | **Extend.** Payloads can't carry or mutate damage — no relic can hook them. |
| Meta | One saved boolean (`cleared`) | Absent. |
| Characters | `STANDS.star_platinum` hardcoded in `combat.js` | Absent. |

The **art, feel and hook-dispatcher seams are real assets** and should survive. Everything in the
"Replace/Rebuild" column is what this document specifies.

The single most important structural finding: **the hook dispatcher is an event bus, not an effect
pipeline.** `onHit` fires *after* damage is applied, with a payload of `{moveType, combo, finishing}`.
A relic reading "your third hit in a string deals +60% and applies Virus" cannot be expressed. Fixing
this is prerequisite to every item in §6. See `stand-battle-arena-tech.md` §2.

---

## 1. The pitch

> You are a Stand user walking into a fight you will probably lose. Your Stand is a second body —
> faster than you, stronger than you, and *bleeding when it bleeds*. Every fight is a negotiation
> between how far you push it away from your own ribs and how much damage you need it to do.

**Stand Battle Arena** is a run-based action roguelike where the core mechanical tension is not
"attack vs. dodge" but **User vs. Stand** — two bodies, one health pool, one leash. Runs are 25–40
minutes across four canon JoJo settings. Between fights you graft fragments of *other people's*
Stands onto your own moveset, and the run's identity emerges from which grafts you take.

**Why it is not just another roguelike brawler:** the leash. Reach, damage and safety are the same
dial, and you move it a hundred times a fight.

---

## 2. The three loops

| Loop | Length | The question the player is answering |
|---|---|---|
| **Beat** | 0.2–2s | Do I commit? Project the Stand for reach, or stay anchored and safe? Step, Guard, or Clash? |
| **Run** | 25–40 min | Which build am I chasing? Which path node — power, economy, or safety? Which Fragment gets Requiem? |
| **Campaign** | 40+ hrs | Which Stand / Aspect am I learning? Which Menace rank am I climbing? Which Archive entry am I hunting? |

Each loop must pay out on its own timescale. A run that ends in Act 1 still returns Fate, Archive
entries, Bond progress and (usually) a new piece of the story. Spec §1's constraint — "a run must
remain engaging even when it ends in death" — is implemented in §9.5.

---

## 3. Core combat

### 3.1 Two bodies, one health bar

The player controls a **User** (the human) and a **Stand** (the projection).

- **All HP lives on the User.** There is no separate Stand health bar.
- **The Stand deals all damage.** The User never attacks.
- **Damage to the Stand transfers to the User** at the Stand's *feedback rate* (§3.3).
- **Damage to the User transfers at 100%** and additionally staggers the Stand.

This is canon (a Stand's wounds are the user's wounds) and it is the whole game: the Stand is your
sword *and* a second hurtbox you are responsible for.

### 3.2 The leash — Range becomes a spatial stat

`Range` (spec §2.1) stops being flavour and becomes the **tether length**:

```
tetherPx = 26 * Range          // Range 2 → 52px, Range 5 → 130px, Range 9 → 234px
```

The Stand cannot exceed `tetherPx` from the User. Pushing past it drags the User along at 40% speed
(a real, punishable commitment) and applies **Strain**: 2 Persistence/second and a −20% damage
penalty while over-extended.

Canon's Power↔Range inverse (spec §2.1, binding) is now enforced *mechanically*, not just in a stat
table: short leash means you must physically stand inside the danger zone to deal your (very high)
damage.

### 3.3 Feedback rate

```
feedbackPct = clamp(0.70 - 0.065 * Range, 0.10, 0.70)
```

| Stand | Range | Feedback | Reading |
|---|---|---|---|
| Star Platinum | 2 | 57% | Your Stand getting hit nearly hits you. |
| Silver Chariot | 5 | 38% | Trades. |
| Hierophant Green | 9 | 11% | Your Stand is a expendable screen — but *you* are a separate target. |

### 3.4 Stand Classes — three genuinely different control schemes

Not stat reskins. Three ways the same game is played.

**Close-Range (Star Platinum, Crazy Diamond, Killer Queen)**
- Stand is **anchored**: rides ~22px in front of the User, mirrors movement. Plays as a normal brawler.
- **Project (hold key):** the Stand detaches and drives out to tether length in the movement
  direction. While held: attacks originate from the Stand (big reach and angles), **you cannot Step**,
  and the User is rooted and fully exposed. Release snaps the Stand back instantly, no recovery.
- Project is therefore a *held commitment button*, not a mode — pressed dozens of times a fight, always
  a real risk. This is the beat-loop decision.

**Mid-Range (Silver Chariot, Sticky Fingers, Aerosmith)**
- Stand **orbits** the User at a settable radius and can be flicked out on a timer (2.5s) rather than held.
- The User keeps mobility while the Stand is out, but only one Step charge.
- Rewards spacing and neutral play; the parry/counter game lives here.

**Long-Range (Hierophant Green, Echoes, Sex Pistols)**
- The Stand is **permanently detached**. Movement input drives the **Stand**; the User is a second
  body that follows on a leash with simple retreat AI and can be commanded to reposition (a second key).
- Enemies split aggro between Stand and User by an aggro weight. Low feedback, but the User is a real,
  killable target with a slow, clumsy dodge.
- Plays like a zoner with a bodyguard problem.

**Automatic (post-launch: Sheer Heart Attack, Sex Pistols, Bad Company)**
- The Stand acts under its own AI; the player issues orders and plays the User directly. Fourth class,
  scoped after launch.

### 3.5 The arena

**2.5D belt plane** (x horizontal, z depth) — the standard beat-'em-up solution, and the minimum
spatial complexity for crowd combat. It preserves every existing side-view sprite: z maps to a
y-offset plus draw order, no new art required.

- Arena: 720 × 260 world units, camera tracks the midpoint of User and Stand.
- Attacks have real **hitbox rectangles** in (x, z) driven by frame data — not the current
  `abs(dx) <= range` scalar check.
- Depth tolerance on melee is generous (±22 units) so z-alignment is not fiddly, but ranged and
  wall-type attacks respect it exactly.
- Some arenas add hazards (Morioh traffic, Cairo train carriages moving the floor, Naples vineyard
  terraces with height, the finale's shifting geometry).

### 3.6 Offense — frame data, strings, cancels

Every move is a **frame-data timeline** in data, not a `{windupMs, activeMs, recoverMs}` triple.
Frames at 60fps:

| Move | Startup | Active | Recovery | Notes |
|---|---|---|---|---|
| Light | 5 | 3 | 8 | Chains ×3. Cancelable into Medium/Special from frame 4 of recovery **on hit**. |
| Medium | 9 | 4 | 14 | Chains into Heavy. Launches on the 3rd Light→Medium. |
| Heavy | 16 | 5 | 22 | **Armored** from frame 8 (absorbs one non-Heavy hit). Guard-breaks. |
| Special | per-move | — | — | Persistence cost. 2 equipped slots. |
| Stand Rush | 14 | ~60 | 30 | Momentum-gated ultimate. |

- **Input buffer: 9 frames (150ms).** The current code drops any input made while not `idle`; that
  alone makes the combat feel unresponsive. Buffering is non-negotiable.
- **Cancel windows are data.** A Fragment that says "Light cancels into Step on hit" is a data entry
  that adds a cancel tag, not a new code path.
- **Strings** come from cancel routes, not from authored combo lists: Light→Light→Light→Medium→Heavy
  is emergent from three cancel entries.

### 3.7 Defense — three distinct tools

Spec §2.2 requires dodge and parry to be structurally distinct. Add a third so defense is not binary.

**Step** — i-frames, movement. 3f pre, 10f invulnerable, 6f recovery.
**Two charges, 1.4s recharge each.** This is the fix for the current spam exploit: the limit is charges,
not a cooldown timer, so skilled play still gets two fast Steps when it needs them.

**Guard** — hold. Reduces incoming damage 70%, converts the rest to *chip*. Drains 14 Persistence/sec
while absorbing. **Guard-broken** by any Heavy or by hitting 0 Persistence → 40f vulnerable stagger.
Guard is the "I don't know what's coming" answer, and it costs you your Special economy.

**Clash (parry)** — active frames 2–8 (7 frames, 116ms). Whiff recovery 20f (punishable, unlike Step).
On success:
- Attacker enters a 24f **Clash Stagger** (free punish window).
- +25 Momentum, +20 Persistence.
- Time-stop-lite: 90ms hit-stop on both parties (spec §10 juice budget: this is a marquee moment).
- **Perfect Clash** (parried on frames 2–3): also refunds a Step charge and applies **Break** — the
  next hit deals ×1.8.

Clash is the high-skill, high-reward answer. Step is the safe, low-reward answer. Guard is the
resource-expensive answer. That triangle is the defensive metagame.

### 3.8 Resources

**Persistence** (blue, 0–100) — the *options* resource.
- Gain: +5 light hit, +8 medium, +12 heavy, +20 Clash, +2/s passive out of contact.
- Spend: Specials (25–60), Guard drain, Strain penalty.

**Momentum** (yellow, 0–100) — the *aggression* resource.
- Gain: +8 per landed hit, +25 per Clash, +15 per kill.
- Decay: 15/sec after 1.5s without landing a hit; **−50% instantly on being hit** (not zeroed — the
  current code zeroes the combo, which punishes learners too hard).
- Effect: `damageMult = 1 + 0.004 * momentum` (up to +40%), and at 100 it unlocks **Stand Rush**.

Two resources, two behaviours: Persistence rewards *choosing*, Momentum rewards *pressing*. A player
who turtles has Specials but no damage; a player who rushes has damage but no outs. Builds pull on
one axis or the other and Fragments let you break the rule (e.g. a Fragment that converts overflow
Momentum into Persistence).

The current combo counter feeds only audio pitch. Momentum is what that counter should have been.

### 3.9 Poise, stagger and armor

Missing from the prototype and load-bearing for crowd combat.

- Every enemy has **Poise** (a second, invisible bar). Hits deal poise damage; poise regenerates after
  1.2s without a hit. At 0 → **Stagger** (36f, takes ×1.5 damage, cancels whatever it was doing).
- **Heavies and boss signature moves have Armor:** they cannot be poise-interrupted during their
  windup. This is what makes telegraphs *matter* — you must respect them rather than mashing through.
  Armor is always paired with the mandatory telegraph (spec §5.1), so it is never unfair, only firm.
- Player has 8 frames of i-frames after being hit, preventing crowd lock-loops.
- `enemyIsVulnerableToStagger()` already exists in `ai.js` and is never called. This is its job.

### 3.10 Status effects

A generic stack/duration system with tick hooks — the substrate most Fragments write to.

| Status | Effect | Primary donor |
|---|---|---|
| **Virus** | 3 dmg/s per stack; on death, spreads half its stacks to nearest enemy | Purple Haze |
| **Gravity** | −40% move & attack speed; grounded (can't be launched) | Echoes ACT3 |
| **Break** | Next hit ×1.8, consumed | Clash / Sticky Fingers |
| **Charge** | Every 4th hit chains 40% damage to 2 nearby enemies | Red Hot Chili Pepper |
| **Frozen** | Fully stopped; damage taken +25%; breaks on 3rd hit | The World |
| **Bomb-Primed** | Detonates on death for 30 + 15% max HP AoE | Killer Queen |
| **Mark** | +18% damage taken from all sources | Hermit Purple |
| **Bleed** | Damage per *distance moved*, not per second | Aerosmith / Chariot |

Statuses are the connective tissue between Fragments. Every Fragment either **applies**, **amplifies**,
**consumes** or **converts** a status — that is the rule that guarantees synergies exist rather than
hoping they emerge.

### 3.11 Stand Rush

One per Stand, Momentum-gated at 100. This is the "ORA ORA ORA" moment.
- Costs the whole Momentum bar; roughly 2–3 uses per encounter at high skill, 1 at low.
- Full i-frames on the startup frames, then committed.
- A Fragment in the **Rush slot** rewrites it wholesale (not +damage): *The World* makes it a genuine
  time-stop where you land free hits; *Gold Experience* makes it a heal-on-hit rush; *Purple Haze*
  detonates all Virus stacks in the arena.

### 3.12 The mastery ladder — why combat is still fun at hour 30

A 40-hour game needs skill expression that keeps unfolding. In order of acquisition:

1. **Hours 0–2:** learn the telegraph colours; Step everything.
2. **Hours 2–6:** learn Clash timing on the three common patterns; discover the Light→Medium cancel.
3. **Hours 6–12:** learn to Project on enemy recovery frames — the risk button becomes a rhythm.
4. **Hours 12–20:** poise management — deliberately staggering a Shielder to open a crowd; Guard as a
   Persistence trade rather than a panic button.
5. **Hours 20–30:** Perfect Clash into Break into Heavy-armor trades; routing whole encounters to keep
   Momentum from ever decaying (the "no-drop run").
6. **Hours 30+:** Menace-rank play — reading shortened telegraphs, Stalker management, and building
   for a target Duo Fragment from Act 1 onward.

A **Style rank** (D→S) is computed per encounter from Momentum uptime, damage taken, Clash count and
variety of moves used, and gates a small Yen bonus. It exists to *name* the mastery ladder so players
can see themselves improving; it never gates content.

---

## 4. Enemies and encounters

### 4.1 Behaviour modules

Extend the existing `PATTERNS` library in `ai.js`. Enemies are **compositions of modules + a
behaviour profile**, never bespoke state machines (spec §9).

Pattern modules: `sweep`, `slam`, `thrust`, `projectile`, `projectile_wall`, `charge_dash`, `grab`,
`shield_advance`, `summon`, `zone_denial`, `retreat_snipe`, `phase_shift`, `mirror_step`,
`bomb_plant`, `tether_pull`, `ground_pound_ring`.

Behaviour profiles (how the modules are *selected*): `aggressor`, `spacer`, `turtle`, `flanker`,
`opportunist` (waits for your recovery frames — the profile that teaches you not to over-commit),
`support` (buffs/heals others; the "kill this first" target).

### 4.2 Enemy roster — 14 base types at launch

Each is a module set + profile + a stat lean, all data.

| # | Type | Role in an encounter |
|---|---|---|
| 1 | Delinquent | Filler aggressor, teaches Clash |
| 2 | Knife Thug | Fast, low HP, punishes greed |
| 3 | Brute | High poise, armored slam, must be respected |
| 4 | Shielder | Frontal immunity; must be flanked or poise-broken |
| 5 | Sniper | Long telegraph projectile; forces you to close |
| 6 | Zoner | Places persistent hazard zones; denies your favourite space |
| 7 | Hound (Stand-beast) | Fast flanker that goes for your **User**, not your Stand |
| 8 | Bomber | Plants Bomb-Primed charges; corpse explosions |
| 9 | Puppeteer | Summons two weak minions on a timer; support profile |
| 10 | Duelist | 1v1 mirror of your own kit; parries *you* |
| 11 | Leech | Steals Persistence on hit |
| 12 | Warden | Anti-Project: punishes you hard while your Stand is detached |
| 13 | Phaser | Intangible except during its own attack frames |
| 14 | Caller | Harmless alone; summons reinforcements if not killed within 12s |

Note types 7 and 12: enemies designed specifically to attack the **User/Stand duality**, so the core
mechanic has a dedicated counter-play conversation rather than being free reach.

### 4.3 Affixes — perceived variety without hand-authoring

Applied at spawn (spec §13). ~18 affixes; elites roll 1–2, Menace ranks add rolls.

Examples: `Bomb-Primed` (explodes on death), `Mirrored` (spawns a 30%-HP clone at half health),
`Requiem-Touched` (revives once at 40%), `Vampiric` (heals on hit), `Warded` (immune to the first
status applied), `Hasted`, `Ironclad` (armor on all attacks, not just heavies), `Cornered` (+60%
damage below 30% HP), `Leashed` (tethered to a spot, can't chase), `Static` (Charge aura),
`Enraged-on-Kill` (buffs when an ally dies), `Split` (becomes two on death).

Affixes must be **visible before the fight starts** (banner + tint) — fairness, spec §5.

### 4.4 Encounter composition

Encounters are **wave definitions in data**, generated from a budget:

```
encounterBudget(act, tension, menace) → points
```
Each enemy type has a point cost; the generator fills the budget with composition rules:
- Never more than 2 ranged types at once (unfun).
- Never a Shielder without something pressuring you (it's a stalling puzzle otherwise).
- At most one Caller.
- Always at least one enemy that can be safely Clashed (the fairness floor).
- 1–3 waves per node; later waves telegraph 1.5s before arriving.

### 4.5 Bizarre Rule Fights — the differentiator

This is the single most JoJo thing the game can do, and it is the strongest replayability lever
available. **Canon JoJo fights are puzzles, not damage races.** Roughly 1 in 6 combat nodes and every
Act's mini-boss is a **Rule Fight**: an encounter whose *win condition is rewritten*.

Launch set (12):

| Rule Fight | The rule | The out |
|---|---|---|
| **Sheer Heart Attack** | An invulnerable homing bomb tracks heat. The real user is hidden. | Lure it into the hiding spot; it detonates on its owner. |
| **Illuso's Mirror** | The arena has a mirror layer. Enemy only vulnerable when you're on the same layer. | Learn the swap tell; time your Project across layers. |
| **Formaggio's Shrink** | You're shrunk: −60% damage, +80% Step distance, arena is huge. | Use hazards; you can enter spaces the enemy can't. |
| **N'Doul's Geb** | Blind. The screen shows only sound rings from movement and attacks. | Stop moving to hear. Play by audio telegraph. |
| **Death 13** | You "fall asleep" every 20s; sleeping damage doesn't persist. | Kill within a sleep cycle or find the wake condition. |
| **Yellow Temperance** | Contact damages *you*, not it. Immune to physical. | Force it to attack, punish the open frames only. |
| **Man in the Mirror** | Your User is pulled into the mirror; Stand fights alone. | Break the mirror anchor before the timer. |
| **Highway Star** | It chases you across the whole node and heals off you. | You cannot outrun it — you must out-tempo it. |
| **Bites the Dust** | If you die, the fight rewinds 20s **with your knowledge intact** and one free Fragment. | Use the loop deliberately; it's a *reward* framed as a curse. |
| **Cheap Trick** | Never turn your back — facing away applies stacking doom. | Positional discipline. |
| **Rolling Stones** | A "fate" marker predicts your death spot; standing there is lethal but doubles rewards. | Greed check. |
| **Baby Face** | Enemy learns your last-used move and gains resistance to it. | Forces move variety — directly rewards the mastery ladder. |

Each Rule Fight is authored once and re-appears with different enemy compositions, so 12 rules ×
14 enemy types × affixes is a large, memorable space. **These are what players will describe to each
other**, and memorable moments are what drive a game past 20 hours.

### 4.6 Bosses

10 story bosses + 3 secret superbosses (spec §9). Each is: a **module composition** + **exactly one
bespoke signature** + **3 phases**.

**Phase 3 is the design difference.** Phase 1 tests pattern reading; phase 2 adds a rule (an arena
hazard, a summon cadence, a status pressure); **phase 3 changes what winning means** — the boss
exposes its **User**. A boss's human body is a small, high-value hurtbox taking ×3 damage that hides
behind the Stand. Phase 3 becomes a positioning puzzle: get past the Stand to the person. This is
canon-perfect and it makes every boss fight end on the game's core mechanic.

**Reprise variants:** on repeat runs a boss rolls one of 3 *Reprise* modifiers (different signature
timing, an extra module, a swapped arena hazard) so the fortieth encounter is not the first one again.

### 4.7 The Stalker

An invading Stand user that enters a node uninvited (Menace-gated, plus a small base chance from Act 2).
Announced by a screen-wide ゴゴゴゴ and a distinct motif. It escalates the run's tension, drops the
best non-boss loot, and can be **fled** — leaving the node early, forfeiting its reward. A flee option
is important: the Stalker must never be a run-ending mandatory wall.

---

## 5. Run structure

### 5.1 Shape

**4 Acts** (spec §3), each a seeded branching map:

| Act | Setting | Rows | Encounters | Boss |
|---|---|---|---|---|
| I | Morioh streets — *Diamond is Unbreakable* | 9 | ~7 | Angelo → Kira / Killer Queen |
| II | Cairo pursuit (streets + train) — *Stardust Crusaders* | 10 | ~8 | N'Doul / Hol Horse → DIO / The World |
| III | Naples vineyard (gang war) — *Golden Wind* | 10 | ~8 | Formaggio / Illuso → Diavolo / King Crimson |
| IV | Reality-warped finale | 11 | ~9 | The gauntlet → the true final |

~32–36 nodes per run; ~45s average per combat plus menus lands at **28–38 minutes**, matching spec §3.

### 5.2 Map generation

Slay-the-Spire-style DAG, deterministic from `seed + act`:

- 6 lanes wide, 9–11 rows deep; 2–4 paths through, converging at the boss.
- **Guarantees per act** (fairness, spec §5.2): every path reaches ≥1 Rest and ≥1 Shop; every path
  hits 1–2 Elites; Treasure appears once per act on at least one branch; Act III always contains
  exactly one Requiem Altar.
- **Path identity:** branches are labelled by their reward lean so choices are legible —
  *the hard road* (Elite/Rule Fight, better rewards), *the long road* (more nodes, more economy),
  *the safe road* (Rest/Event, fewer rewards). Choosing is meaningful only if the choice is *readable*.
- Rows 1 and last are fixed (opener combat, boss). No two Rests adjacent. No three combats in a row
  without an Event/Shop between (pacing).

### 5.3 Node types

| Node | What it does |
|---|---|
| **Combat** | Standard wave encounter. Reward: Fragment offer (3 choices) or Yen. |
| **Elite** | Affixed enemy + escort. Reward: guaranteed Rare+ Fragment, extra Yen. Raises Tension. |
| **Rule Fight** | §4.5. Reward: guaranteed Epic Fragment or a Relic. |
| **Duel** | 1v1 against a rival Stand user, no adds. Pure skill test. Reward: a **Disc** (§6.4). |
| **Bizarre Encounter** | Choice-driven event, 2–3 options, occasionally a fight. |
| **Rest** (Cafe Deux Magots) | Pick one: heal 60% max HP / **upgrade a Fragment one level** / reroll a Relic / raise Tension for a free Fragment. |
| **Shop** (Owson) | Spend Yen: Fragments, Relics, healing, a Fragment-removal service, 1 reroll. |
| **Treasure** | Pick 1 of 3 Relics, no cost. |
| **Arrow Shrine** | Pay 15 *max* HP for a Legendary Fragment. Recurring greed decision. |
| **Gamble** | Risk Yen or HP on a coin-flip with escalating stakes. Optional, flavourful. |
| **Archive Node** | Free. Lore drop + Fate + an Archive entry. Story delivery outside the hub (spec §8). |
| **Requiem Altar** | Act III only, once per run. Elevate one Fragment to Requiem (§6.2). |

### 5.4 Tension — player-driven in-run difficulty

Each Act carries a **Tension** value (0–5), raised by taking Elite/Rule Fight/Stalker nodes and by
opting in at Rests. Tension raises encounter budget and affix rolls, and raises reward rarity weights
by the same amount. The player therefore chooses their own difficulty *mid-run*, continuously, which
is far better pacing than a fixed curve.

### 5.5 Act variants

Each Act has 2–3 unlockable layout/theming variants (Morioh Day / Morioh Night / Morioh Rain), each
with a different enemy weighting, hazard set and one exclusive Rule Fight. Unlocked via the Archive.
This is how the *same four acts* stay fresh across 60+ runs.

---

## 6. The item systems

Six layers, each answering a different design need. This is the heart of replayability.

| Layer | What it is | Analogue | Count at launch | Decisions/run |
|---|---|---|---|---|
| **Fragments** | Graft another Stand's power onto one of your move slots | Hades boons | ~60 | 10–14 |
| **Requiem** | One Fragment transcends | Hades legendary/duo keystone | 1 per run | 1 (huge) |
| **Relics** | Persistent objects with run-wide rules | Isaac/StS relics | ~55 | 4–7 |
| **Discs** | Swap a Special/Rush for another Stand's | Weapon swap | ~14 | 0–2 |
| **Aspects** | Pre-run rule rewrite of your own Stand | Hades weapon aspects | 16 | 1 (pre-run) |
| **Economy** | Yen, rerolls, removals | Shop currency | — | continuous |

### 6.1 Fragments — the boon system

A Fragment is a piece of another Stand's ability grafted onto **one of your slots**:

**Slots (9):** `light`, `medium`, `heavy`, `special_1`, `special_2`, `rush`, `step`, `clash`, `aura`.

A Fragment offer presents **3 choices**, each already assigned to a slot. Taking one either fills an
empty slot or *overwrites* — overwriting is a real cost and forces build commitment.

**Donors (8 at launch).** Each donor is a canon Stand with a mechanical identity and covers 6–8 slots:

| Donor | Identity | Signature statuses/verbs |
|---|---|---|
| **The World** (DIO) | Time | Frozen, stop, delay, extra actions |
| **Crazy Diamond** (Josuke) | Restoration | heal, undo, repair, return-to-position |
| **Gold Experience** (Giorno) | Life | life motes, summons, damage reflection |
| **Purple Haze** (Fugo) | Virus | Virus DoT, spread, self-risk |
| **Echoes ACT3** (Koichi) | Gravity | Gravity, slow, grounding, weight |
| **Sticky Fingers** (Bruno) | Zippers | mobility, teleport, armor Break |
| **Red Hot Chili Pepper** (Akira) | Electricity | Charge, chain damage, environment |
| **Hermit Purple** (Joseph) | Divination | rerolls, foresight, Mark, economy |

Post-launch donors (each adds 6–8 Fragments, i.e. real pool growth per unlock): Killer Queen,
King Crimson, Made in Heaven, Silver Chariot Requiem, Cream, Stone Free, Whitesnake, Bad Company,
Highway Star, Heaven's Door.

**Concrete examples** (the shape every entry must hit — a real hook, never a flat +%):

- *The World — Step:* Stepping leaves a 0.4s frozen bubble at your origin point.
- *The World — Clash:* Perfect Clash stops time for 1.2s (you act, the world doesn't).
- *Purple Haze — Light:* Light hits apply 1 Virus. Your light chain has no cap.
- *Purple Haze — Aura:* Enemies dying with 5+ Virus explode in a spreading cloud. **Tradeoff: you take 4 damage per cloud.**
- *Sticky Fingers — Medium:* Medium zips you to the target. If it hits an already-Broken enemy, it removes their armor entirely for the encounter.
- *Gold Experience — Heavy:* Heavy plants a life mote; walking over it heals 4 and grants 10 Momentum.
- *Echoes — Special:* A gravity well that pulls the crowd together and grounds them for 2s.
- *Hermit Purple — Aura:* All reward offers show one extra choice; Rest nodes offer two picks. (Economy Fragments must exist or every build converges on damage.)
- *Crazy Diamond — Rush:* Your Rush restores instead of destroys: heals for 30% of damage dealt and repairs 8 max HP lost to Arrow Shrines.
- *Red Hot Chili Pepper — Projection:* While Projected, the tether becomes a live wire dealing Charge to anything crossing it. **This is a Fragment that only exists because of the core mechanic** — the leash is a weapon.

**Rarity & upgrade:** Common / Rare / Epic ("Bizarre") / Legendary. Each Fragment has **3 levels**;
Rest nodes and shops upgrade a level. Rarity affects the *magnitude and the number of clauses*, not
just numbers — a Legendary version usually adds a second clause that changes how it's used.

**Duo Fragments** (the chase): offered only when you hold Fragments from two specific donors in
specific slots. ~20 at launch. These are the moments players screenshot:
- *The World + Purple Haze → **Frozen Contagion**:* Frozen enemies accumulate Virus at 4× and spread on thaw.
- *Gold Experience + Crazy Diamond → **Requiem of Life**:* Overhealing converts to a shield that refunds Persistence on break.
- *Sticky Fingers + Echoes → **Deadweight**:* Zips apply Gravity; Gravity-affected enemies take Break damage from every zip.
- *Red Hot Chili Pepper + The World → **Stopped Current**:* Charge chains do not tick during time-stop — they *all* release at once when it ends.
- *Hermit Purple + anything → **Fated**:* You see the next node's reward before choosing the path.

### 6.2 Requiem — the run's keystone

Once per run, at the Act III **Requiem Altar**, one owned Fragment is elevated to **Requiem**.

Requiem is not a numeric upgrade. It is a **rule rewrite**, and it is meant to be the moment the run
becomes *the* run:
- *The World Requiem:* Time-stop is on a passive 25s cycle. You keep your Stand Rush free.
- *Purple Haze Requiem:* Virus is permanent and untickable — it *never* expires, and cures nothing.
- *Gold Experience Requiem:* Enemy attacks that would kill you are reverted to zero, once per encounter.
- *Sticky Fingers Requiem:* You can zip to any enemy anywhere, instantly, at no cost — the arena stops being a distance problem.
- *Echoes Requiem:* Gravity applies to enemy *projectiles* — the screen becomes yours.

Choosing which Fragment to elevate — and building toward it from Act I — is the single largest
strategic decision in a run. It should take players 30 seconds of real thought.

### 6.3 Relics — objects

Persistent, run-wide, no slot. ~55 curated (spec §6: every entry has a real hook, tradeoffs are always
visible at pickup). Canon objects and artefacts:

- **Stone Mask** — +45% Power. You lose 1 HP/sec in combat. (Pure risk/reward.)
- **Aja Stone** — Once per Act, survive a lethal hit at 1 HP. Costs 20 max HP on use.
- **Rokakaka Fruit** — Consume: discard all Fragments, reroll the same number at +1 rarity. Equivalent exchange.
- **Dio's Bone** — Enemies drop +50% Persistence; your feedback rate is doubled.
- **Zeppeli's Hat** — Your first Clash each encounter is automatic. −10 max HP.
- **Lisa Lisa's Scarf** — Guard costs no Persistence for the first 2 seconds of each hold.
- **The Bow and Arrow** — Elites drop an extra Fragment offer. Elites also gain one extra affix.
- **Hermit Purple's Camera** — Reveals the whole act map, including hidden nodes.
- **Wall Eyes** — Rule Fights give double rewards. Rule Fights appear twice as often.
- **Speedwagon Foundation Kit** — Rest nodes heal fully instead of 60%. Shops charge +25%.
- **Cinderella's Kit** — Once per act, reroll your whole Fragment set's *slots* (same fragments, shuffled).
- **Achtung Baby** — You're partially invisible: enemy aggro on the **User** halves. Your Stand takes +20% feedback.
- **Sugar Mountain's Contract** — Take an item now; owe double at the next shop or take 30 damage.
- **The Arrow** — At the boss, choose an extra Fragment. The boss gains a phase.

Every one of those has a downside that is stated at pickup. Never a hidden clause (spec §6.3).

### 6.4 Discs

Stand Discs (canon: Whitesnake) let you **swap a Special or your Rush for a different Stand's**.
~14 at launch, dropped by Duel nodes and secret bosses. This is the "weapon variety inside a run" axis
and it lets a Star Platinum run *feel* like a Chariot run for its back half.

### 6.5 Economy

- **Yen (¥)** — in-run currency. Sources: combat (60–140 scaled by Style rank), Elites, selling
  Fragments back at Shops, Gamble nodes. Sinks: Shop Fragments (150–400), Relics (250–500),
  healing (2¥ per HP), **Fragment removal** (75¥, escalating — deck-thinning matters), rerolls (50¥,
  escalating within a shop).
- **Rerolls** are the single most important anti-frustration tool. One free reroll per reward offer
  from Act II onward; more purchasable.
- Target: a run generates ~1,400¥ and can meaningfully spend ~1,900¥. Scarcity should be real but not
  punishing.

### 6.6 Pool sizes and why

| Pool | Launch | Reason |
|---|---|---|
| Fragments | ~60 (8 donors × ~7.5) | Enough that a 12-pick run sees <20% of the pool. |
| Duo Fragments | 20 | Chase density: ~1–2 offered per run. |
| Requiems | 12 | One per donor + 4 cross-donor. |
| Relics | 55 | Isaac-scale variety without filler. |
| Discs | 14 | One per rostered/known Stand. |
| Enemy types | 14 base + 18 affixes | 250+ distinguishable spawns. |
| Rule Fights | 12 | Memorability, not count. |
| Bosses | 10 + 3 secret, × 3 Reprises | 39 distinct boss encounters. |
| Aspects | 16 (4 Stands × 4) | The pre-run variety engine. |

**Spec §6.2 is binding: never pad a pool to hit a number.** The counts above are what the synergy math
needs, not round numbers.

### 6.7 The rule that guarantees synergy

Every Fragment must do at least one of: **apply** a status, **amplify** a status, **consume** a status,
**convert** a resource, **rewrite a slot's behaviour**, or **change the economy**. A Fragment that only
adds damage is rejected at content review. This mechanically guarantees that any two Fragments have a
nonzero chance of interacting, which is what "build variety" actually means.

Every Fragment and Relic carries **tags** (`time`, `virus`, `heal`, `mobility`, `crowd`, `single-target`,
`economy`, `risk`, `projection`). Tags drive: offer weighting (a run that has leaned Virus is offered
slightly more Virus-adjacent choices — *convergence*, so builds actually cohere), Duo eligibility, and
the build-summary UI.

### 6.8 Fairness and RNG (implementing spec §5)

- **Pity timer:** nodes-since-last-Rare tracked; at 4, the next offer guarantees Rare+.
- **Defensive floor:** every Rest and Shop pool contains ≥1 defensive/healing option. Enforced at
  generation, asserted in tests.
- **Slot starvation guard:** if a slot has been empty for 6+ offers, weight it up.
- **Convergence weighting:** 25% of offer weight biased toward tags you already hold. This is the
  difference between "random items" and "a build".
- **No unreactable damage, ever** (spec §5.1). Automated check: every attack pattern's telegraph
  duration ≥ 260ms after all Menace modifiers are applied. A Menace rank may *never* push a telegraph
  below the reactable floor.

---

## 7. Stands and Aspects — the pre-run choice

4 Stands at launch (spec §2.2), 6–8 post-launch. Each has **4 Aspects**, unlocked through the Archive.
An Aspect **rewrites a rule**, it does not add stats.

**Jotaro Kujo / Star Platinum** — Close-Range brawler.
- *Aspect of Stardust* (base): the honest version. Highest raw damage in the game.
- *Aspect of the Ocean:* Star Platinum: The World — your Momentum bar becomes a time-stop charge instead of a Rush gate.
- *Aspect of the Crusader:* Persistence never decays and Guard is free, but max Momentum is halved.
- *Aspect of the Delinquent:* Every 5th Light in a chain is a free Heavy. No Special slots at all.

**Jean Pierre Polnareff / Silver Chariot** — Mid-Range technician.
- *Aspect of the Knight* (base).
- *Aspect of Armor:* shed the armor — +50% speed, but you take double feedback until you land 10 hits.
- *Aspect of Requiem:* your Clash window is doubled; every Perfect Clash permanently +2% damage for the run.
- *Aspect of the Duelist:* 1v1 encounters only (crowds split into sequential duels), massive rewards.

**Noriaki Kakyoin / Hierophant Green** — Long-Range zoner.
- *Aspect of Emerald* (base).
- *Aspect of the Barrier:* your tether is a physical wall enemies can't cross.
- *Aspect of the 20m Radius:* unlimited tether; the User cannot move at all during an encounter.
- *Aspect of the Rite:* your User is untargetable, but the Stand has its own HP bar that doesn't heal.

**Yoshikage Kira / Killer Queen** — Mid-Range trickster.
- *Aspect of the Quiet Life* (base): everything you touch can be detonated.
- *Aspect of Sheer Heart Attack:* a permanent autonomous bomb ally you don't control.
- *Aspect of Bites the Dust:* on death, rewind the whole *node* once per act with knowledge kept.
- *Aspect of the Third Bomb:* every kill primes the nearest enemy; chain detonations are the whole build.

**16 launch configurations**, each demanding a different Fragment strategy. This is the primary
replay engine: not "play again", but "play *differently* again".

---

## 8. How it gets harder

Three independent difficulty axes, deliberately separated.

### 8.1 Within a run (automatic, gentle)
Enemy tier by Act (T1→T4): +HP, +damage, more affix rolls, denser compositions, shorter recovery
windows (never shorter telegraphs — spec §5.1 floor). Act IV enemies are Act I enemies with T4 stats
*and* new modules, so knowledge transfers while pressure rises.

### 8.2 Within a run (player-chosen)
**Tension** (§5.4), Arrow Shrines (max HP for power), Gamble nodes, the greedy path branch, choosing
to fight the Stalker instead of fleeing. The player sets their own ceiling every few minutes.

### 8.3 Across runs — **Menacing Presence** (Track B, opt-in only)

A pact of conditions, Hades-style. Off by default; **the only source of permanent difficulty drift**
(spec §7). Each condition has ranks; total ranks = **Menace Rank**, and the ladder runs 0→30.

| Condition | Effect per rank | Ranks |
|---|---|---|
| Bloodthirst | Enemy HP +15% | 5 |
| Killing Intent | Enemy damage +12% | 5 |
| Sharpened Instinct | Enemy recovery frames −8% (telegraphs untouched) | 3 |
| Crowded | +1 enemy per encounter | 3 |
| Rationing | Healing −25% | 3 |
| Inflation | Shop prices +30% | 3 |
| Scarcity | One fewer choice per reward offer | 2 |
| Unyielding | Enemies gain armor on all attacks | 3 |
| Countdown | Node timer; overrun spawns a Stalker | 3 |
| Fragility | Feedback rate +25% | 3 |
| Hunted | Stalker invades +1× per act | 3 |
| Requiem Denied | No Requiem Altar this run | 1 |
| Pristine Condition | Start each act at 70% HP | 2 |
| Convergence | Bosses gain their hidden 3rd phase early | 1 |

Rewards: each new highest Rank cleared grants Fate, an Archive unlock, and a cosmetic title. Rank is
tracked **per Stand**, so mastering the ladder four times is four separate journeys — and it is honest
content, because each Stand solves the conditions differently.

---

## 9. Meta-progression

Two structurally separate systems (spec §7 — Track A never writes combat stats; Track B never unlocks
content).

### 9.1 Track A — the Archive (breadth, zero power creep)

Currency: **Fate**, earned every run win *or loss*, scaled by depth and Style.

Unlock tree (~34 nodes):
- Stands 5–8 (Josuke/Crazy Diamond, Giorno/Gold Experience, Bruno/Sticky Fingers, Joseph/Hermit Purple).
- 12 additional Aspects (4 are available from the start).
- **Fragment donors** — each unlock adds 6–8 Fragments to the pool. The item pool *grows* over the
  first 20 hours, so the game keeps feeling new instead of solved.
- Node types (Duel, Gamble, Arrow Shrine, Archive Node start locked).
- Act variants (§5.5).
- Hub scenes, dialogue tiers, cosmetics, alternate HUD skins.

**Nothing here makes a number bigger.** Unlocking a donor adds *options*, and options at equal power
are the correct roguelike meta-currency.

### 9.2 Track B — Menacing Presence
§8.3. Difficulty only. Never unlocks content; only bragging rights, Fate multipliers and titles.

### 9.3 Stand Bonds — the relationship engine

Each Stand has a **Bond track** (8–10 beats) that advances by *using* it: clearing acts, hitting
milestones, dying in specific ways. Beats deliver hub dialogue with that character, culminating in a
**Keepsake** (a starting Relic you may equip, sidegrade only — no power creep).

This is the mechanic that carried Hades past 40 hours: a reason to keep playing that isn't power. It
costs almost nothing to build once dialogue is data.

### 9.4 The Bizarre Archive — collection

A JoJo-databook-styled log: every enemy, boss, Fragment, Relic, Rule Fight and Stand, with stat pages,
flavour text and "seen / defeated / mastered" states. Completion is a long-tail goal with real pull for
the collection-minded player, and it costs only data entry.

### 9.5 What a loss gives you (spec §1 constraint)

Death is never zero. Every run end returns:
- **Fate** scaled by depth, Style rank and Menace rank.
- **Archive entries** for everything newly seen.
- **Bond progress** for the Stand used.
- A **"To Be Continued →" screen** with a run summary: your build, your best combo, your killer, and
  a one-line in-fiction epilogue.
- **Bizarre Missions** progress (§10.2).

---

## 10. Direction and long-tail

### 10.1 Choice-impact map

Every decision the player makes, and its weight:

| Decision | Frequency | Weight | What it changes |
|---|---|---|---|
| Project or stay anchored | ~100/fight | Small each, enormous cumulatively | Reach vs. survival, moment to moment |
| Step / Guard / Clash | ~60/fight | Medium | Resources and punish opportunity |
| Which enemy to focus | ~10/fight | Medium | Crowd control order |
| Path branch | ~9/act | Medium-High | Rewards vs. safety vs. economy |
| Which Fragment (of 3) | 10–14/run | **High** | Build direction; irreversible if it overwrites |
| Which Relic | 4–7/run | High | Run-wide rules and risks |
| Rest node option | 3–4/run | High | Heal now vs. compound power |
| Arrow Shrine / Gamble | 2–4/run | High | Max HP for power — the greed dial |
| **Requiem target** | 1/run | **Highest in-run** | Rewrites the run's identity |
| Stand + Aspect | 1/run | **Highest overall** | Rewrites how the game is played |
| Menace loadout | 1/run | High | The whole difficulty shape |

### 10.2 Bizarre Missions — the thing that turns 20 hours into 40

A visible checklist of ~120 specific, named challenges (Hades' Fated List; Isaac's completion marks).
Not achievements — **directives that make you play differently**:

- "Clear Act II without ever Projecting."
- "Win a Rule Fight with a Requiem'd Purple Haze build."
- "Reach the finale with zero Relics."
- "Perfect-Clash DIO's signature."
- "Clear Menace 12 with Kakyoin."
- "Kill a boss by attacking only its User."
- "Finish a run with all 9 slots filled by a single donor."

Each grants Fate and an Archive entry. Missions are what a player looks at when they finish a run and
think "okay, one more" — the most efficient replayability lever in the entire document, and it is
almost entirely data.

### 10.3 Endgame

After the first clear, three parallel endgames open:
1. **Menace ladder** per Stand (§8.3) — the skill endgame.
2. **The Heaven Ascension** — a true final boss reachable only by clearing Act IV with all three
   *Heaven conditions* met (a specific Requiem, a Menace floor, and a hidden Rule Fight cleared). One
   of the game's biggest secrets; a real reason to route a run deliberately.
3. **Secret superbosses** (3) — Diavolo/King Crimson, Kars, and one Requiem-tier fight — each gated by
   optional Act conditions rather than sequence.

Plus **daily/weekly seeds** with a fixed Stand+Aspect+Menace and a local leaderboard, giving a reason
to open the game on a day you weren't planning a long session.

---

## 11. Does the content math reach 40 hours?

| Phase | Content | Runs | Hours |
|---|---|---|---|
| Learning + first clear | Systems drip, Act I–IV first time | 10–14 | 5–7 |
| Clearing with 4 launch Stands | Different classes, different builds | 10–12 | 5–6 |
| Aspect exploration (16) | 2 runs each on the 12 unlocked ones | 24 | 11–13 |
| Menace ladder to ~15 on one Stand | Real difficulty progression | 12–15 | 6–8 |
| Bizarre Missions + Archive completion | Directed play | 12–18 | 6–8 |
| Endgame: Heaven Ascension + 3 superbosses | Routed, deliberate runs | 8–10 | 4–5 |
| **Total** | | **76–93 runs** | **37–47 hrs** |

That matches spec §3's target of 60–95 runs, and it gets there through **combinatorics** (4 Stands ×
4 Aspects × 8 donors × 55 relics × branching maps × 12 Rule Fights × Menace ranks), not through boss
count — which spec §13 explicitly requires.

---

## 12. Why the loop is fun (the honest argument)

1. **The core mechanic is a decision, not an execution.** Project-or-not is a genuine risk/reward
   choice made constantly, with immediate legible feedback. Games sustain long play when the
   *smallest* loop contains a choice.
2. **Three control schemes, not three stat lines.** A Hierophant run and a Star Platinum run are
   different genres. This is the cheapest large-variety lever available and it's canon-mandated.
3. **Builds cohere.** Convergence weighting + tags + Duo Fragments means the third hour of a run
   feels like a *thesis*, not a pile of loot.
4. **One enormous decision per run.** Requiem. Runs need a peak, and a keystone choice at the
   ~70% mark is where a run becomes a story you tell.
5. **Rule Fights make runs memorable.** Numbers are forgettable; "the fight where I was blind" is not.
6. **Failure pays.** Fate, Archive, Bond, Missions, and a story beat — every time, win or lose.
7. **The player sets the difficulty continuously.** Tension, Shrines, path choice, Menace. Players
   who set their own challenge level play far longer than players fed a fixed curve.
8. **The pool grows for 20 hours.** Unlocking donors means the item pool is still expanding well past
   the point most roguelikes have shown you everything.
9. **Directed goals exist.** Bizarre Missions answer "what am I doing tonight?" — the question that
   ends most roguelike sessions permanently when it has no answer.

---

## 13. Design self-audit — pass 1

*The exercise required by the brief: read the above and answer honestly — would this, in code, hold
someone for 40 hours?*

**Verdict: yes, but only because of six specific things** — and the first draft of this document was
missing four of them. Recorded here so they are treated as load-bearing, not decoration:

| Risk identified | Would it have failed? | Where it's now handled |
|---|---|---|
| Combat depth too shallow for hour 30 | **Yes.** A dodge/parry/3-button brawler is exhausted in 8 hours. | §3.4 Stand Classes, §3.6 cancels, §3.9 poise/armor, §3.12 mastery ladder |
| Items were flat bonuses | **Yes.** Nothing to build *toward*. | §6.7 synergy rule, §6.1 duos, §6.2 Requiem, tag convergence |
| No reason to play after the first clear | **Yes.** Most roguelikes die here. | §10.2 Bizarre Missions, §8.3 Menace ladder, §10.3 endgame, §7 Aspects |
| Runs would blur together | **Yes.** 4 acts × 60 runs = repetition. | §4.5 Rule Fights, §4.6 Reprises, §5.5 Act variants, §5.4 Tension |
| Loss felt like wasted time | Probably. | §9.5 loss payouts, §9.3 Bonds |
| Pool exhausted too early | Yes, at ~15h. | §9.1 donors as unlocks — the pool grows for 20 hours |

**Remaining risks, stated plainly:**

1. **Scope.** This is a large game. The Stand Class system alone (§3.4) is three control schemes to
   tune. Build order is in `stand-battle-arena-tech.md` §5; the first vertical slice must be one
   Close-Range Stand with real frame data and 12 Fragments, and it must be *fun before content is added*.
2. **The 2.5D conversion** touches the renderer, which is the project's strongest existing asset.
   It must be done as an additive z-axis on the current stamping, not a rewrite.
3. **Long-Range class balance** is genuinely hard — a zoner with an AI bodyguard can degenerate into
   "kite forever". Mitigation: Hound (#7) and Warden (#12) enemy types exist specifically to punish it,
   and Long-Range Stands take a −35% damage baseline.
4. **Rule Fights are the most expensive content per unit.** They are bespoke by nature. Twelve is the
   right number; twenty would eat the schedule. If the budget slips, cut Rule Fights to 8 before
   cutting Fragments — but do not cut them to zero, they are the memorability engine.
5. **Menace must never break the fairness floor.** §6.8's automated telegraph-duration check is a test,
   not a guideline.

**What is deliberately *not* here:** grinding, daily login rewards, currency drip, and any permanent
stat purchase. Every hour in the 40 comes from content or mastery. If a system in this document ever
starts justifying itself as "extends playtime", it is wrong and should be cut.

---

# Pass 2 — what pass 1 was still missing

Re-reading §§1–13 against the question *"would this, in code, produce 40 enjoyable hours?"*, the
**structure** holds up. But the answer was still **not fully yes**, because pass 1 described a game
that would be excellent at hour 20 and unplayable at minute 5. It specified what the systems *are*
and almost nothing about what the player *experiences*: no onboarding, no numbers, no crowd-AI
fairness rule, no session model, no hub, and no plan for the two failure states every roguelike hits
(the dead build and the god build).

Those are not polish. A game can have a perfect item system and still be abandoned in run 2. Sections
14–21 close that gap.

---

## 14. Onboarding — the first 90 minutes

A player facing three Stand Classes, two resources, three defensive tools, a leash, and six item
layers on run 1 quits on run 1. Systems are **dripped**, and every introduction is one sentence plus a
practice beat — never a modal wall, never blocked input (spec §8).

**Run 1** — you have Light, Medium, Step. That's it. Momentum is on screen but does nothing you must
manage. Act I only.
- After node 2: **Heavy and Clash** unlock in-fiction ("Jotaro: *Stand back. Watch how it moves.*"),
  and node 3 is deliberately composed of one slow, heavily telegraphed Brute — a Clash tutorial that
  never says the word tutorial.
- After node 4: a Bizarre Encounter teaches **Project** by making it the correct answer to a puzzle
  (a Shielder behind a barrier your anchored Stand cannot reach).
- Act I boss: **Stand Rush** unlocks on the phase-2 transition, as a gift, at the moment it feels
  earned.

**Run 2** — Guard, Specials and Fragments in full. Reward offers appear.
**Run 3** — Relics, Shops, Yen.
**Run 4+** — Tension, Arrow Shrines, Gamble. Requiem is introduced the first time you reach Act III.
**Menacing Presence** is offered only after the first clear.

Rule: **no run introduces more than two new systems.** A player should be able to explain the game to
someone else after run 3, and still be discovering Fragment interactions at run 60.

Onboarding is also why the mastery ladder in §3.12 works — the skills are taught in the order they
compound.

## 15. Encounter texture — variety without new content

Rule Fights (§4.5) are expensive. Most nodes are ordinary combats, and "kill all enemies" thirty-five
times per run is the fastest way to make a run feel long. **Encounter objectives** are near-free
variety built from enemies that already exist:

| Objective | What changes | Frequency |
|---|---|---|
| **Standard** | Clear all waves. | ~50% |
| **Ambush** | You start surrounded, mid-arena, no opening beat. Tests defense first. | ~10% |
| **Survive** | Hold 30s against continuous spawns; leaving early forfeits the reward. | ~8% |
| **Pinned** | Your User is trapped and cannot be moved — everyone plays Long-Range for 40 seconds. | ~7% |
| **Hazard** | Arena does the work: Morioh traffic, a moving Cairo train floor, Naples terraces with height, finale geometry that rewrites itself. | ~10% |
| **Bounty** | One marked enemy; killing it ends the fight early for bonus Yen, ignoring it lets it buff the others. | ~8% |
| **Sudden Death** | A single enemy at 1 HP that flees; chase it across the arena for a Fragment. | ~4% |
| **Rule Fight** | §4.5. | ~3% |

Objectives combine with the 14 enemy types, 18 affixes and Tension, and they are pure data.

## 16. Crowd AI — the attack-token rule

**Without this, five enemies is not difficulty, it is noise.** Pass 1 specified crowd encounters and
never said how a crowd behaves fairly.

- The encounter holds **2 attack tokens** (3 at Menace ranks with *Crowded*). Only a token-holder may
  commit to an attack; everyone else circles, repositions, feints, or holds spacing.
- A token is held for the duration of one pattern and then goes on a 0.6–1.2s cooldown before
  reassignment, so pressure comes in readable pulses.
- Token assignment prefers enemies with a clean line and biases toward *whoever the player is not
  looking at* — enough to feel intelligent, bounded enough to stay fair.
- Ranged enemies use a separate, smaller token pool so a sniper cannot fire during a melee commitment.
- **Off-token enemies still matter:** they apply spatial pressure, they can be staggered for area
  denial, and Hounds (§4.2 #7) ignore tokens when going for your exposed **User** — the one deliberate
  exception, telegraphed loudly, because it is the enemy designed to punish Projection.

This is the standard solution (Arkham, Hades, every beat-'em-up worth playing) and it is what makes
crowd combat readable instead of a pile-on.

Enemy **profiles** (§4.1) then describe token *usage*: an `opportunist` waits for your recovery frames
before spending its token; a `spacer` gives its token up rather than commit at bad range. This is the
difference between enemies that feel alive at hour 30 and enemies that feel like turrets at hour 3.

## 17. The power curve — actual numbers

Pass 1 had no balance targets, which means it could not be implemented without inventing them.

**Time-to-kill targets**

| Target | Act I | Act II | Act III | Act IV |
|---|---|---|---|---|
| Trash enemy HP | 55 | 110 | 190 | 300 |
| Elite HP | 220 | 420 | 700 | 1,100 |
| Boss HP (3 phases) | 900 | 1,800 | 3,000 | 4,500 |
| Player effective DPS | ~30/s | ~60/s | ~110/s | ~180/s |
| Trash TTK | 2s | 2s | 2s | 2s |
| Boss fight length | ~90s | ~110s | ~130s | ~150s |

**The central balance rule: damage grows ~6×; survivability stays flat.**

- Player max HP: 100, drifting to ~140–160 through Relics (and *downward* through Arrow Shrines).
- Incoming hit sizes scale with the acts: 8–14 in Act I, 25–40 in Act IV.
- Therefore the player can absorb roughly **4–6 hits at every point in the run**, from minute 1 to
  minute 38.

That is deliberate, and it is the most important number in this document. It means **your skill, not
your stats, is what keeps you alive** — which is why the game is still tense in Act IV of run 60, and
why it never degenerates into either "invincible by Act III" or "one-shot by Act IV".

**Difficulty targets (median player)**

| Milestone | Target |
|---|---|
| Runs to first clear | 10–14 |
| Steady-state win rate, Menace 0 | 55–65% |
| Menace 10 | ~35% |
| Menace 20 | ~15% |
| Menace 30 | <5%, aspirational |

**Yen:** a run generates ~1,400¥ and can usefully spend ~1,900¥ — scarcity is real, starvation is not.

## 18. The two failure states every roguelike hits

**A. The dead build** (bad offers, wrong slots, 20 minutes in). Pass 1 assumed pity timers were enough.
They are not — pity fixes rarity, not *coherence*. Explicit recovery tools:
- One **free reroll** per reward offer from Act II onward.
- **Fragment removal** at shops (75¥, escalating) — thinning is as important as acquiring.
- **Rokakaka Fruit** (§6.3) — the full reset button: discard everything, redraw at +1 rarity.
- **Rest node upgrade** — turning two mediocre Fragments into one strong one.
- **Slot-starvation weighting** (§6.8) — the game notices your empty Rush slot.
- The **Cinderella's Kit** relic reshuffles which slot each Fragment occupies, converting a
  mis-slotted build into a working one.

A dead build should always be *recoverable at a cost*. It should never be *silently unwinnable* —
that is the spec §5 constraint applied at the build layer instead of the combat layer.

**B. The god build** (everything died in Act III, Act IV is a formality). This is the more dangerous
one, because it makes the climax boring exactly when the run should peak.

The wrong fix is dynamic difficulty scaling to the player's build — it is invisible, it feels like
cheating, and players detect it and resent it. The right fix is **fixed, legible answers that any
mono-strategy build runs into**:

- Every boss has a **purge beat**: a phase moment that clears all statuses from itself and grants 6
  seconds of status immunity, announced with a cue. A pure-Virus build must have *something* else to
  do for six seconds. This is static, identical every run, and learnable.
- **Act IV is a gauntlet with no Rest nodes.** Accumulated power meets accumulated attrition.
- Elite affixes include `Warded` (immune to the first status applied) and `Ironclad` (armor on every
  attack) — always visible before the fight (§4.3).
- Secret superbosses and the Heaven Ascension (§10.3) exist precisely so a god build has somewhere
  to go. A run that trivialises the final boss should be *routed into a harder ending*, not nerfed.

## 19. Meta pacing — the Fate economy

Unlocks that arrive too slowly are a grind; too quickly and the game is spent by hour 12.

**Earning:** loss in Act I = 15 Fate, Act II = 30, Act III = 50, Act IV = 70. A win = 120.
Multiplied by `1 + 0.06 × Menace Rank`. Bizarre Missions pay 40–150 each. **Average run ≈ 60 Fate.**

**Spending:** the ~34-node Archive tree totals ≈ 4,200 Fate, front-loaded hard:

| Tier | Cost each | Unlocks | Reached around |
|---|---|---|---|
| 1 | 40–80 | First extra Aspect, first extra donor, Duel node | runs 2–6 |
| 2 | 100–160 | Stands 5–6, two donors, Act variants | runs 7–20 |
| 3 | 200–280 | Stands 7–8, remaining donors, Arrow Shrine | runs 21–45 |
| 4 | 300–400 | Final Aspects, endgame gates, cosmetics | runs 46–75 |

The player unlocks something **every 1–2 runs for the first ten hours**, then every 3–4 runs. The item
pool is still growing at run 45. Nothing in the tree makes a number bigger (spec §7).

## 20. The hub — the Speedwagon Foundation safehouse

Spec §8 requires it; pass 1 barely acknowledged it. It exists to hold the between-run decisions and to
deliver story without ever blocking the player.

Contents: the **Stand rack** (pick Stand + Aspect), the **Archive terminal** (Track A), the **Menace
board** (Track B), the **Bond room** (§9.3 dialogue), the **Mission board** (§10.2), and the
**Training Room**.

**The Training Room matters more than it sounds.** A free-play sandbox where any unlocked Fragment,
Relic and enemy can be spawned at will. In a game with 60 Fragments and a real execution ceiling, the
ability to learn a Clash timing or test a combo *without burning a 35-minute run* is one of the
highest-retention features available, and it costs almost nothing because everything in it already
exists.

**The hard rule:** from hub spawn to run start is **under 8 seconds** if the player wants it to be.
Every line of dialogue is skippable with one key. NPCs react to the last run (your killer, your depth,
your build) so returning to the hub is *informative*, not a toll booth. A player on run 60 should
never feel the hub is in the way.

## 21. Session design and accessibility

**This is a browser app running in a windowed OS shell — the window can be closed at any moment.**
A 35-minute run that cannot survive that is a run players will refuse to start.

- **Save on every node transition.** A run resumes exactly at the node boundary.
- Combat itself is not resumable mid-fight; the longest possible loss is one encounter (~90s). That is
  the standard, acceptable contract.
- Node-to-node time stays ≤ 90s so there is always a stopping point within a minute and a half.
- Meta save is written separately from run save, so a corrupted run never costs Archive progress.

**Accessibility** (spec §16 requires the shake toggle; the rest is what actually widens the audience):
- Shake/flash toggle — already shipped.
- **Telegraph cues carry a shape, not only a colour.** Colour-only telegraphs fail roughly 8% of male
  players outright; every telegraph gets a distinct outline glyph (ring = sweep, chevron = slam,
  crosshair = ranged) alongside its colour.
- **Ripple Assist** — independently adjustable: Clash window ×1.5, Step i-frames ×1.3, incoming
  damage ×0.7. It blocks nothing except Menace rank records.
- Project switchable between hold and toggle; full key rebinding; a "reduce particles" option.

---

## 22. Final verdict

**Would this, in code, be worth 40 hours?** Yes — and now for reasons that survive contact with an
actual player rather than only with a spreadsheet.

The load-bearing answer is four things, in order of importance:

1. **The beat loop contains a real decision.** Project-or-not is a risk/reward choice made a hundred
   times a fight, and §16's attack-token rule plus §17's flat-survivability curve are what keep that
   decision meaningful in Act IV of run 60 instead of being solved by stat growth.
2. **Builds cohere and peak.** Tag convergence, Duo Fragments and one Requiem choice per run mean a
   run has a thesis and a climax, not a loot pile.
3. **There is always a next thing.** 16 Aspects, a 30-rank Menace ladder per Stand, ~120 Bizarre
   Missions, an item pool that is still growing at run 45, and three parallel endgames.
4. **Nothing is padded.** No grind, no currency drip, no permanent stat purchases. Every hour comes
   from content or mastery.

**What would still make it fail:**
- Shipping Phase 2 (§tech 5) without the fun gate being honestly answered. If the vertical slice with
  12 Fragments is not fun for 40 minutes, no amount of §6 saves it.
- Under-tuning the Long-Range class into a kiting solution.
- Letting Menace ranks erode the reactability floor.
- Building the item pool before the effect pipeline, which forces bespoke code paths and quietly
  caps the pool at what one developer can hand-wire.

Those four are the actual risks. Everything else in this document is legible, testable, and mostly
data.
