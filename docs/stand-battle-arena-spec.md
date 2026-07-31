# Stand Battle Arena — Technical Design Specification
**Type:** Single-player *JoJo's Bizarre Adventure* roguelike, browser-based (JavaScript / CSS / Canvas)
**Scope target:** ~40 hours of player content
**Project nature:** personal, non-commercial fan project. It intentionally uses *JoJo's Bizarre Adventure* IP — canon characters, canon Stands, canon locations/arcs — not original reskins. Treat every named character, Stand, and location in this document as a real reference to the source material, not placeholder flavor text.
**Art style:** pixel art throughout (see §11).
**Companion document:** `docs/stand-battle-arena-gdd.md` is the *game* design document — run structure, item systems, progression, difficulty curve, and the moment-to-moment mechanics that make the loop worth 40 hours. This file remains the *technical* contract (architecture, rendering, audio, fairness constraints). Where the two disagree on gameplay specifics, the GDD wins; where they disagree on architecture or rendering, this file wins.
**Audience for this document:** an AI coding agent implementing the project. Treat every numbered section as a requirement or constraint, not a suggestion, unless explicitly marked optional. Where a design rule and an implementation detail conflict later in development, the design rule wins — flag the conflict rather than silently resolving it.

---

## 0. Architecture Philosophy (read first)

This is not a "hand-write every content item" project. It is a **generic engine** that reads an **unbounded, separate pile of data** (Stands, moves, enemies, relics, floors, dialogue as JSON/JS objects).

Concretely: build an **effect-hook architecture**. Systems register callbacks (`onHit`, `onKill`, `onFloorStart`, `onRunStart`, etc.) and a single dispatcher fires them. A new relic, enemy, or ability should be addable as a **data entry**, not a new code path. If you find yourself writing a bespoke function per content item, stop and refactor toward a hook the dispatcher can call generically.

**There is no line budget on this project.** Engine code may grow as large as the design requires; the constraint is *generality*, not size. The failure mode to avoid is not "too many lines" — it is "a bespoke code path per content item". A large engine that content plugs into as data is correct. A small engine with fifty `if (relicId === ...)` branches is not.

The only structural rule that still binds is the repo-wide one in `CLAUDE.md`: individual source files stay readable (split into siblings in the app folder when they get long). That is a file-organisation rule, not a cap on total engine size.

---

## 1. Core Loops

| Loop | Timescale | Player actions |
|---|---|---|
| Moment-to-moment | seconds | Attack, dodge, parry, spend Persistence on a special |
| Run | 25–40 min | Pick path nodes, collect Arrows, evolve abilities, fight a story boss |
| Meta | across runs (~40 hrs total) | Unlock Stand archetypes, hub story beats, Heat tiers, Archive rewards |

Design constraint: a run must remain engaging even when it ends in death. Do not gate all reward/progress feedback behind a win.

---

## 2. Combat System

### 2.1 Stats (Stand Parameters)
Implement as a stat block on every Stand instance, using JoJo's own canonical parameter set:

- **Power** (Destructive Power) — damage per hit
- **Speed** — attack/animation speed, dodge window length
- **Range** — hitbox reach (canonically inversely related to Power — enforce this trade-off in base stat values, not just flavor text)
- **Persistence** — special-move resource bar (canonically "how long a Stand can maintain an ability" — used here as a stamina/heat meter)
- **Precision** — crit chance / status-effect accuracy
- **Developmental Potential** — number of upgrade/mutation slots available to that Stand for the current run

The numeric values in §2.2 and §15.2 are original game-balance interpretations for this implementation, not a transcription of any official databook grades — treat the *relative* leans (e.g. "high Power, low Range") as the binding spec, not the literal numbers.

### 2.2 Starting Archetypes — canon characters and Stands
Implement exactly these 4 at launch. These are the actual named characters and Stands, not original designs standing in for them. Use their real names in code, data, UI text, and assets.

| Role (internal category) | Character | Stand | Canon source | Stat lean | Style |
|---|---|---|---|---|---|
| Brawler | Jotaro Kujo | Star Platinum | Stardust Crusaders (Part 3) | High Power, low Range | Close-range power, rapid-punch pressure |
| Rapier | Jean Pierre Polnareff | Silver Chariot | Stardust Crusaders (Part 3) | High Precision, high Speed | Technical swordplay, combo/parry-focused |
| Puppeteer | Noriaki Kakyoin | Hierophant Green | Stardust Crusaders (Part 3) | Long Range | Zoning, chain/tentacle reach, damage-over-time (Emerald Splash) |
| Trickster | Yoshikage Kira | Killer Queen | Diamond is Unbreakable (Part 4) | Utility/debuff | One unique gimmick power (bomb-conversion mechanic — see §2.3) |

Note: a character's status as a story antagonist in canon (Kira, notably) does not exclude them from the playable roster — they can be both a playable archetype and appear as an in-fiction boss elsewhere in the run, exactly as in official crossover fighting games (e.g. All-Star Battle). Do not treat "playable" and "story boss" as mutually exclusive for the same character.

### 2.3 Move Framework
- Light / Medium / Heavy normals: fast-weak / balanced / slow-strong.
- 2–3 equipped Special slots, each costing Persistence, filled by run rewards.
- One **Stand Rush** ultimate per run: high-commitment finisher, Persistence-gated, roughly one use per floor.
- Dodge with i-frames + a separate parry window. Tight parry → free counter-hit. Generous dodge → safe, no reward. Both must be implemented as distinct timing windows, not a single dodge mechanic with bonus damage bolted on.
- Movesets must draw on each Stand's canon ability set for their identity, even as specific numbers are tuned for balance:
  - **Star Platinum** — rapid-punch flurries ("ORA" rush) as its signature Special/Rush.
  - **Silver Chariot** — rapier thrusts and its retractable-armor defensive tech.
  - **Hierophant Green** — Emerald Splash as a ranged Special; chain-limb extension for zoning normals.
  - **Killer Queen** — its Sheer Heart Attack (auto-tracking bomb pursuit) and Bites the Dust-style gimmick as the Trickster's unique power (§2.2). Treat Bites the Dust specifically as a run-altering utility effect (e.g. a limited "reset/rewind" mechanic on a node), not a raw damage tool — that's its canon identity.

---

## 3. Run Structure

- **4 Acts**, each a real JoJo Part/arc setting (reduced from an original 5-Act draft to fit the 40-hour scope):
  1. **Morioh streets** — *Diamond is Unbreakable* (Part 4)
  2. **Cairo pursuit** (desert/train) — *Stardust Crusaders* (Part 3)
  3. **Naples vineyard** (gang war) — *Golden Wind* (Part 5)
  4. **Reality-warped finale** — draw on canon multiversal lore (e.g. Steel Ball Run's parallel-universe framing, or DIO's/Heaven's reality-bending) as the in-fiction justification for a non-linear final gauntlet, rather than an unexplained genre shift.
- *Stone Ocean* (Part 6, Green Dolphin Cove prison/casino) is cut from the launch scope for the 40-hour target — candidate for post-launch expansion, not omitted for narrative reasons.
- Each Act: 3–4 sub-layouts. Node types: Combat / Elite / Event ("Bizarre Encounter") / Rest / Shop / Treasure.
- 2–3 unique story bosses per Act → **8–10 total**, plus **2–3 optional secret superbosses** for post-clear content.
- Target run length: 25–40 minutes. At that pace, 40 hours ≈ **60–95 runs**. This number must come from build/content variety, not from artificially padding boss count — see §13.

---

## 4. Build Diversity

Two reward tracks, granted at node clears:

- **Arrows** — passive relics (common/rare/legendary). Every Arrow must have a real build-defining hook. See §6 for hard constraints on this pool.
- **Ability Evolution** — equipped Specials mutate into upgraded versions, consuming Developmental Potential slots. One ability per run can reach a **Requiem** tier — the build's keystone moment (a direct nod to canon Stand evolution, e.g. Gold Experience Requiem, King Crimson), equivalent in design weight to a duo-boon or item-transformation system in comparable roguelikes.

---

## 5. Fairness & RNG — hard constraints

Implement all of the following. These are not tunable-later polish items; they are structural requirements that prevent runs from ending in ways the player couldn't play around.

1. **Telegraph every heavy enemy attack**: minimum wind-up duration + a distinct color flash before the hit lands. No damage source may be unreactable.
2. **Guaranteed defensive floor**: every Rest/Shop node's reward pool must contain at least one defensive or healing option. A player must never be mathematically starved of an "out."
3. **Pity timer on rarity**: track nodes-since-last-Rare-Arrow per run; once a threshold N is hit, weight the next reward pool to guarantee a Rare+.
4. **Bad-luck mitigation, not luck removal**: do not eliminate RNG (it supports replayability) — eliminate the subset of RNG outcomes with zero counterplay.

---

## 6. Item Pool Rules (Arrows)

1. Every Arrow entry must have a real hook: a build-around effect, a synergy trigger with another system, or a strong standalone stat. No filler entries that do nothing meaningful.
2. Curate quality per rarity tier by hand. Pool size is not a target to optimize for — do not add entries just to hit a round number.
3. Negative-tradeoff Arrows (risk/reward items) are allowed and encouraged, but the risk must be visible at pickup time. Never implement a hidden downside.

---

## 7. Meta-Progression — two separate systems

Implement these as **structurally separate systems**, not two configs of the same system. Track A must never write to numeric combat stats. Track B must never unlock new content.

**Track A — Archive (unlocks, zero power creep):**
new starting Stand archetypes (see §13 for post-launch roster — additional canon Stand users), new hub scenes/dialogue, new node types, alternate Act variants, cosmetics.

**Track B — Menacing Presence (opt-in difficulty, mirrors a Heat/Pact system):**
a difficulty dial the player chooses to raise, in exchange for better rewards and bragging-rights unlocks. Off by default. This is the only place run difficulty should drift upward — never as an automatic default.

---

## 8. Narrative & Hub World

- Build a hub (a Speedwagon-Foundation-style safehouse) where NPCs react to the player's last run outcome.
- All hub dialogue must be **short and skippable** — never block input on a forced read.
- Do not gate all story delivery behind the hub. Scatter optional environmental storytelling directly into run nodes (notes, graffiti, one-off NPC encounters) so pacing varies.
- Boss variety: implement as **modular attack-pattern components** (see §9) that recombine, rather than committing to a large count of fully bespoke bosses that can't be finished within scope.

---

## 9. Boss Design

- Total: 8–10 core story bosses + 2–3 secret superbosses (§3), drawn from each Act's canon antagonist roster. Illustrative, non-exhaustive examples per Act:
  - **Morioh** (Part 4): Yoshikage Kira / Killer Queen, Angelo, Yuya Fungami.
  - **Cairo** (Part 3): DIO's Stand-user assassins (e.g. Hol Horse, N'Doul), with DIO himself as an Act-final or secret superboss.
  - **Naples** (Part 5): Passione hitmen (e.g. Formaggio, Illuso), with Diavolo/King Crimson as a secret superboss.
  - **Finale**: pull from whichever canon reality-warping antagonist best fits the multiversal framing chosen in §3.
- Build a shared library of attack-pattern modules: sweep, telegraphed slam, projectile wall, minion summon, phase-shift. Each boss = a unique combination of modules + exactly one fully bespoke signature move drawn from that character's canon Stand ability.
- Every phase transition must be tied to an explicit visual/audio cue. Never implement a silent stat-only phase change.

---

## 10. Game Feel / Juice — implementation specs

Concrete numbers, not vibes:

- **Hit-stop:** 3–5 frames (~50–83ms @ 60fps) on light hits, up to 8 frames on heavies/finishers. Stay inside the 50–100ms window — shorter reads as nothing, longer reads as lag.
- **Screen shake:** directional along the hit vector (a downward heavy attack shakes the camera down, not randomly). Fast exponential decay, 0.1–0.3s. Ship an accessibility toggle to reduce/disable shake — required, not optional. At pixel-art scale, snap shake offsets to whole pixels (no sub-pixel camera movement) to avoid shimmering.
- **Particles:** burst along the strike vector, bright initial color fading to darker debris, hard-capped particle count per frame. Render particles as small pixel blocks consistent with the sprite resolution (§11), not smooth/anti-aliased shapes.
- **Squash & stretch:** apply to character sprites on jumps/landings/heavy impacts via CSS transforms, in whole-pixel increments where possible.
- **Juice budget rule:** reserve the largest juice responses (biggest shake, longest hit-stop, most particles) for crits, parries, boss staggers, and finishers. Uniform juice on every hit reads as noise, not impact — do not apply max juice to routine attacks.

---

## 11. Visual Style — Pixel Art

The game is pixel art, full stop. Every rendering decision downstream of this must preserve crisp, non-blurred pixels.

- **Rendering pipeline:** render at a low internal canvas resolution and scale up by an integer factor (2x/3x/4x) for display. Never scale by a non-integer factor. Disable smoothing everywhere: `ctx.imageSmoothingEnabled = false` on Canvas 2D contexts, and `image-rendering: pixelated;` on any CSS-scaled image/canvas elements.
- **Internal resolution target:** ~384×216 or 480×270 native canvas, upscaled to fit the viewport. Confirm exact target during prototyping (§14 step 1) based on how much detail sprites need at target sprite sizes.
- **Sprite sizes (baseline, adjust during prototyping):**
  - Playable Stand user + Stand: 32×32 to 48×48 per frame.
  - Standard enemies: 24×24 to 32×32.
  - Bosses: 64×64 up to 96×96, may exceed for multi-part/phase-shifted forms.
  - Environment tiles: 16×16.
- **Palette:** limited, hand-picked palette per character (roughly 8–16 colors), matching that character's canon manga/anime color scheme where one is well established (e.g. Star Platinum's purple, Killer Queen's pink/black, Hierophant Green's green/purple). Do not use a single global palette across all characters — each Stand should be visually distinct at a glance.
- **Animation frame budgets** (keep tight — this is a solo/small-scope production constraint, not just an art-style choice):
  - Idle: 2–4 frames
  - Walk/move: 4–6 frames
  - Light attack: 3–4 frames
  - Medium/Heavy attack: 5–8 frames
  - Special/Rush: up to 10–12 frames (these are the marquee moments — see §10 juice budget rule, same principle applies to frame investment)
  - Hit reaction: 2 frames
  - Death/KO: 4–6 frames
- **UI:** pixel-style font (no anti-aliased system fonts), chunky bordered panels consistent with a retro JRPG/beat-em-up HUD — health bars, Persistence meter, and node-map icons should all read clearly at native pixel scale before upscaling.
- Juice and camera effects (§10) must be implemented with pixel-scale constraints in mind, not bolted on afterward — build the shake/hit-stop system against pixel sprites from the prototype stage, not retrofitted post-launch.

---

## 12. Audio

- **Adaptive music:** base loop + an added intensity layer triggered at low HP or high combo count.
- **Per-archetype leitmotif:** a 2–3 note musical signature per Stand, reused across that Stand's abilities (e.g. a distinct motif for Star Platinum's rush vs. Hierophant Green's Emerald Splash).
- **Vocal callout system:** procedural vocal barks on combo milestones (the "ORA ORA ORA" / "MUDA MUDA MUDA" instinct — appropriate per character), frequency-capped so it doesn't become grating over a 25–40 min run.
- **3-layer hit sound:** impact thump + material-specific crack + character vocal bark, each with ±5–10% pitch randomization so repeated hits don't sound identical.
- Unique boss themes required only for the 4 Act-final bosses; all other encounters may remix existing motifs.

---

## 13. Content Budget (40-hour scope)

| Content type | Launch target | Post-launch |
|---|---|---|
| Stand archetypes | 4 (§2.2) | 6–8 (additional canon Stand users, e.g. Joseph Joestar/Hermit Purple, Josuke/Crazy Diamond, Giorno/Gold Experience, Bruno Bucciarati/Sticky Fingers) |
| Arrows (relics) | 40–55, curated | +15–20 |
| Ability evolutions per archetype | 10–14 | — |
| Story bosses | 8–10 | +2–3 secret |
| Base enemy types | 10–14 (use a modifier system for perceived variety, don't hand-author variety) | +6–8 |
| Archive unlock nodes | 20–35 | ongoing |
| Heat/difficulty tiers | 4–7 | expandable |

The combinatorial spread (archetypes × relics × node paths × Heat tiers) is what produces the target 60–95 distinct-feeling runs — do not attempt to hit that number through raw boss count instead.

---

## 14. Technical Architecture

### 14.1 Engine module map (no line budget — see §0)

| Module | Responsibility |
|---|---|
| Core loop / render / input | Frame pump, input buffering, scene stack, camera |
| Combat system | Frame data, hitbox/hurtbox resolution, states, status effects |
| Procedural map generator | Seeded branching act layouts, node population |
| UI (HUD/map/shop/dialogue) | All screens |
| Save / meta-progression | Versioned save schema, Archive, Menacing Presence |
| Juice / particle system | Hit-stop, shake, particles |
| Audio manager | SFX bus, adaptive music |
| Effect-hook dispatcher | Hook registration, mutable effect contexts, stat pipeline |

Size each module to whatever the design needs. Content (Stand movesets, enemy patterns, Arrow/Fragment definitions, floor layouts, dialogue trees) still lives *outside* the engine as JSON/JS data consumed generically by the dispatcher — that separation is the requirement, not any particular line count.

### 14.2 Starting data schemas

These are starting points, not final — refine during implementation, but keep every content type in this same "data object + hook registration" shape.

```js
// Stand definition
{
  id: "star_platinum",
  character: "Jotaro Kujo",
  standName: "Star Platinum",
  role: "brawler",
  source: "Stardust Crusaders (Part 3)",
  stats: { power: 8, speed: 7, range: 2, persistence: 6, precision: 6, devPotential: 3 },
  moves: { light: "sp_light", medium: "sp_medium", heavy: "sp_heavy" },
  specialSlots: 3,
  standRush: "sp_ora_rush"
}

// Move definition
{
  id: "sp_ora_rush",
  type: "rush",              // "light" | "medium" | "heavy" | "special" | "rush"
  persistenceCost: 60,
  windupFrames: 10,
  activeFrames: 20,
  telegraphColor: "#ffcc33",
  onHit: ["applyDamage", "applyHitStop"],
  data: { hitCount: 8, damagePerHit: 4 }
}

// Arrow (relic) definition
{
  id: "arrow_broken_watch",
  rarity: "rare",             // "common" | "rare" | "legendary"
  hookType: "onKill",         // must match a dispatcher-registered hook
  effect: "grantPersistenceOnKill",
  data: { amount: 15 },
  tradeoff: null              // populate for negative-tradeoff items; must be surfaced in the pickup UI
}

// Enemy definition
{
  id: "morioh_thug_01",
  baseType: "melee",
  stats: { hp: 40, power: 5, speed: 4 },
  attackPatterns: ["sweep", "telegraphed_slam"],
  modifiers: []                // filled at runtime for perceived variety, per §13
}
```

Effect hooks the dispatcher must support at minimum: `onRunStart`, `onFloorStart`, `onHit`, `onKill`, `onDamageTaken`, `onNodeClear`, `onRunEnd`. Extend this list as content requires it, but register new hooks in one place, not ad hoc per content file.

---

## 15. Development Roadmap

1. **Prototype (2–4 weeks):** 1 archetype (Star Platinum), 1 Act (Morioh, 5–6 nodes), 1 boss, core combat + full juice pass, pixel rendering pipeline locked (internal resolution, upscaling, palette approach), zero meta-progression. Prove combat feels good with no relics — juice-first, not saved for last.
2. **Core loop complete (1–2 months):** full run structure for the first Act, map gen, shop/events, 15–20 Arrows, basic Archive track, save system.
3. **Content expansion (1.5–2.5 months):** remaining 3 Acts, remaining bosses/archetypes, full Arrow pool, hub world + dialogue, audio pass, pixel sprite production for all rostered characters within the frame budgets in §11.
4. **Balance & feel polish (ongoing):** playtest specifically for unwinnable-state reports, item-pool quality pass, accessibility options (shake toggle, colorblind-safe telegraph colors), Heat/Pact system, secret superbosses.
5. **Post-launch (optional, extends past 40 hrs):** NG+/Heat tiers, extra canon Stand archetypes, daily/challenge-seed mode for long-tail engagement.

---

## 16. Acceptance Checklist

Before considering any milestone complete, verify:

- [ ] No damage source is unreactable — every heavy attack telegraphs before it lands.
- [ ] No content pool contains filler entries added only to inflate a count.
- [ ] Numeric permanent power creep exists only through Track B (opt-in), never as default drift.
- [ ] Hub/story content is skippable and not the only delivery channel for narrative.
- [ ] Juice intensity scales with moment significance — routine hits are not maxed-out.
- [ ] Screen-shake/flash accessibility toggle is implemented, not deferred.
- [ ] New content is added as data, not new code paths (there is no line budget — see §0).
- [ ] All rendering uses integer scaling and disabled smoothing — no blurred pixel art anywhere in the build.
- [ ] Character/Stand identities in-game match named JoJo canon (§2.2, §9) — not generic reskins.
