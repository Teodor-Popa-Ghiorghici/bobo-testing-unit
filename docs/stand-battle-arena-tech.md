# Stand Battle Arena — Engine Plan

**Companion to** `docs/stand-battle-arena-spec.md` (technical contract) and
`docs/stand-battle-arena-gdd.md` (the game design).

This document covers only the **mechanical/technical** side — what exists, what is broken, what must
be built, and in what order. Rendering, animation and audio are out of scope here; they are in good
shape and are not the bottleneck.

**There is no line budget** (spec §0). The binding constraint is *generality*: content is data,
never a new code path. The repo rule that individual source files stay readable still applies —
split into siblings in `apps/standbattle/`.

---

## 1. Current implementation audit

### 1.1 What is solid and should survive
- `hooks.js` — the dispatcher *seam* is correct even though the payloads aren't (§2.1).
- `ai.js` — pattern-module library with distance-weighted selection and a clean
  `approachRange` derivation. The right shape; needs profiles and interrupts.
- `fighter.js` — generic player/enemy factory. The right idea; needs to become components.
- `juice.js` / `fx.js` / `arena.js` — render-only reactions that watch combat state without the
  simulation knowing. Genuinely good separation; keep it exactly as is.
- `data.js` — already data-driven in shape. Just very small.

### 1.2 Bugs and gaps in the shipped code

| # | Location | Issue | Severity |
|---|---|---|---|
| 1 | `combat.js:159` + `updatePlayer` | `keys.dodge` is polled while held and there is no cooldown. Dodge is 260ms with 200ms i-frames → **holding Space is ~77% invulnerability uptime.** | **Critical** |
| 2 | `combat.js:50` | `if (player.state !== 'idle') return;` — every input during startup/active/recovery is silently dropped. No input buffer. | **Critical (feel)** |
| 3 | `combat.js:127` | `(opts.hpMult ? 1 : 1)` — dead expression, always 1. Leftover. | Low |
| 4 | `combat.js:21` | `const stand = STANDS.star_platinum` hardcoded — no character selection possible. | High |
| 5 | `combat.js:79` | Hit detection is `Math.abs(enemy.x - player.x) <= m.range`. One axis, one target. | **Critical (design)** |
| 6 | `data.js:22` | `speed`, `range`, `precision`, `devPotential` are declared and never read. Move ranges are hardcoded per move instead of derived from `range`. | High |
| 7 | `ai.js:97` | `enemyIsVulnerableToStagger()` is exported and never called. There is no poise system. | High |
| 8 | `combat.js:99` | Enemy attacks cannot be interrupted; the player has no i-frames after being hit. | Medium |
| 9 | `combat.js:117` | Parry counter is a flat `12 * powerMult` — not derived from anything, doesn't scale into a build. | Medium |
| 10 | `combat.js:90` | `combat.outcome = 'win'` on a single kill — no wave/encounter concept. | High |
| 11 | `index.js:81` | `runState` is `{hp, maxHp, nodeIndex, buffs}` — no serialization, no versioning, no seed. | High |
| 12 | `index.js:106` | Node resolution reads a fixed array `ACT1_MORIOH.nodes[i]`. No graph, no branching. | High |
| 13 | `combat.js:14` | `ARENA_MIN/MAX` magic numbers duplicated between combat and render. | Low |
| 14 | everywhere | No seeded RNG — `Math.random()` direct. Blocks daily seeds, replays and reproducible balance testing. | High |

### 1.3 The one structural finding

**`hooks.js` is a notification bus, not an effect pipeline.**

```js
dispatcher.fire('onHit', { moveType: m.type, combo: player.comboCount, finishing: dead });
```

It fires *after* `applyDamage`, and the payload carries no fighter references and no mutable damage
value. Nothing a listener does can change the outcome. That means **not a single Fragment or Relic in
the GDD can be implemented against the current hooks** — not "+15% damage on the third hit", not
"apply Virus on light hits", not "your Clash heals". Fixing this is prerequisite to everything in
GDD §6.

---

## 2. Required engine systems

### 2.1 Effect pipeline (replaces the event bus)

Three hook kinds, one registry:

```js
// 1. EVENTS — notification, cannot change anything (what exists today)
bus.on('onKill', ctx => { ... });

// 2. EFFECTS — receive a MUTABLE context, run in priority order, may cancel
bus.effect('onHitResolve', 10, ctx => {
  // ctx = { attacker, defender, move, damage, tags, crit, cancelled, statuses }
  if (ctx.tags.has('light')) ctx.statuses.push({ id: 'virus', stacks: 1 });
});

// 3. QUERIES — pure reducers over a value, used for derived stats
bus.query('getMoveStartup', (frames, ctx) => ctx.move.type === 'heavy' ? frames - 2 : frames);
```

Rules:
- Effects run in **priority order** (`add` → `multiply` → `clamp` bands) so ordering is deterministic
  and content authors don't need to think about it.
- Every effect gets `ctx.source` (which Fragment/Relic fired it) for UI attribution and telemetry.
- A hook name must be declared in one registry file; content referencing an unknown hook fails
  **at load time**, not at runtime (§2.9).

Minimum hook surface (extends the current 12):

`onRunStart`, `onActStart`, `onNodeEnter`, `onNodeClear`, `onEncounterStart`, `onWaveStart`,
`onMoveStart`, `onHitResolve`, `onHitLanded`, `onCritCheck`, `onKill`, `onDamageIncoming`,
`onDamageTaken`, `onFeedbackDamage`, `onStatusApply`, `onStatusTick`, `onStatusExpire`,
`onStaggerStart`, `onStepStart`, `onStepEnd`, `onClashSuccess`, `onPerfectClash`, `onGuardBreak`,
`onProjectStart`, `onProjectEnd`, `onTetherStrain`, `onMomentumFull`, `onRushStart`, `onRushEnd`,
`onPersistenceSpend`, `onRewardOffer`, `onFragmentGain`, `onRelicGain`, `onShopOpen`, `onRest`,
`onPlayerDeathImminent`, `onRunEnd`.

Queries: `getDamage`, `getMoveFrames`, `getTetherLength`, `getFeedbackRate`, `getStepCharges`,
`getPersistenceCost`, `getRewardCount`, `getRarityWeights`, `getPrice`, `getPoiseDamage`.

### 2.2 Stat pipeline

Derived stats resolve through a cached, layered pipeline, recomputed only when modifiers change:

```
base → flat adds → multiplicative → set/override → clamp
```

`Range`, `Speed`, `Precision` and `Developmental Potential` become real inputs:
- `Range` → `tetherPx = 26 * range`, `feedbackPct = clamp(0.70 - 0.065*range, 0.10, 0.70)`
- `Speed` → global frame-timing scalar on the player's own move frame data
- `Precision` → crit chance and status application rate
- `Developmental Potential` → number of Fragment slots that may be *upgraded* in a run

### 2.3 Entities and components

`fighter.js` becomes an entity factory over components: `Transform(x,z)`, `Body(hurtbox)`,
`Health`, `Poise`, `Statuses`, `StandLink` (owner ↔ stand, tether), `Brain` (AI profile + module list),
`Frames` (current move timeline), `Aggro`.

The arena holds **N entities**, not `player` + `enemy`. `combat.js` splits into
`sim/` (step, resolve, collide) and `encounter.js` (waves, spawn, win conditions).

### 2.4 Frame data and hitboxes

Moves become timelines, not `{windup, active, recover}` triples:

```js
{
  id: 'sp_light', slot: 'light', type: 'light',
  frames: 16,
  hitboxes: [{ from: 5, to: 7, x: 18, z: 0, w: 34, d: 44, dmg: 4, poise: 6, tags: ['light','melee'] }],
  cancels: [{ from: 12, into: ['light','medium','special'], requires: 'onHit' }],
  armor: null,
  costs: { persistence: 0 }, gains: { persistence: 5, momentum: 8 }
}
```

Collision is AABB in (x, z) with a depth tolerance per tag. Multi-hit moves list multiple hitbox
windows rather than dividing `activeMs / hitCount` as today.

### 2.5 Input

- Ring buffer of `(action, frame)`; a buffered action fires when its window opens. **9-frame buffer.**
- Edge-triggered vs. held-triggered actions distinguished explicitly (Project is held, Step is edge).
- Step is **charge-based** (2 charges, 1.4s each) — this is the fix for audit item #1.
- Rebindable keymap persisted through `ctx.save`.

### 2.6 Status system

Generic: `{ id, stacks, duration, tickRate, tags, onTick, onExpire, onDeath }`, with stack rules
(`stack` / `refresh` / `independent`) and interaction hooks so Fragments can amplify, consume or
convert. Statuses are data; the engine only ticks them.

### 2.7 Seeded RNG

One PRNG (xorshift128) seeded per run; **derived sub-streams** per system
(`rng.stream('map')`, `rng.stream('rewards')`, `rng.stream('combat')`) so a combat reroll can't shift
the map. Enables daily seeds, reproducible balance runs and bug repro from a seed string.

### 2.8 Run state and save

```js
{ version: 3, seed, stand, aspect, menace: {...}, act, nodeId, graph,
  hp, maxHp, persistence, yen, tension,
  fragments: [{id, slot, level}], relics: [id], discs: [id], requiem: id|null,
  flags: {}, stats: {damageDealt, clashCount, ...} }
```
Versioned with migration functions. Meta save (`archive`, `fate`, `bonds`, `missions`, `menaceHigh`)
is **separate** from run save so a corrupt run never costs meta progress.

### 2.9 Content registry and validator

Every content file registers into one registry. On load, validate:
- hook names exist; slot names exist; tag names are in the tag vocabulary
- referenced donors/statuses/patterns resolve
- every Fragment satisfies GDD §6.7 (applies/amplifies/consumes/converts/rewrites/economy)
- every Relic with a downside has a non-null `tradeoff` string (spec §6.3)
- every attack pattern's telegraph ≥ 260ms after max Menace modifiers (spec §5.1)

Fail loudly at load. With 200+ content entries this is the only thing that keeps the pool honest.

### 2.10 Map generation

Seeded DAG builder with declarative constraints (`atLeastOnePerPath('rest')`,
`noAdjacent('rest')`, `exactlyOnce('requiem_altar', act=3)`, `maxRun('combat', 3)`), retrying
until satisfied. Act layouts are data.

### 2.11 Telemetry (local)

Append run summaries to app storage: stand, aspect, menace, fragments taken vs. offered, act reached,
killer, encounter durations. Balance without guessing — pick rate and win rate per Fragment is the
only way to keep a 60-entry pool honest.

---

## 3. Data schemas

Extends spec §14.2. Every content type keeps the "data object + hook registration" shape.

```js
// Stand
{ id:'star_platinum', character:'Jotaro Kujo', standName:'Star Platinum',
  standClass:'close', source:'Stardust Crusaders (Part 3)',
  stats:{ power:8, speed:7, range:2, persistence:6, precision:6, devPotential:3 },
  slots:{ light:'sp_light', medium:'sp_medium', heavy:'sp_heavy', rush:'sp_ora_rush' },
  specialSlots:2, aspects:['stardust','ocean','crusader','delinquent'] }

// Aspect — rewrites a rule, never adds a stat
{ id:'ocean', stand:'star_platinum', name:'Aspect of the Ocean',
  desc:'Momentum becomes a time-stop charge instead of a Rush gate.',
  effects:[{ hook:'onMomentumFull', fn:'convertRushToTimestop' }],
  unlockedBy:'archive.sp_ocean' }

// Fragment (boon)
{ id:'frag_purple_haze_light', donor:'purple_haze', slot:'light',
  name:'Infectious Jab', rarity:'common', levels:3,
  tags:['virus','dot','crowd'],
  effects:[{ hook:'onHitResolve', priority:20, fn:'applyStatus',
             data:{ status:'virus', stacks:[1,2,3] } }],
  tradeoff:null, duoWith:['the_world','red_hot_chili_pepper'] }

// Duo Fragment
{ id:'duo_frozen_contagion', name:'Frozen Contagion', rarity:'legendary',
  requires:[{donor:'the_world'},{donor:'purple_haze'}],
  effects:[{ hook:'onStatusTick', fn:'multiplyStatusRate',
             data:{ when:'frozen', status:'virus', mult:4 } }] }

// Relic (object)
{ id:'relic_stone_mask', name:'Stone Mask', rarity:'rare', tags:['risk','power'],
  effects:[{ hook:'getDamage', fn:'multiply', data:{ mult:1.45 } },
           { hook:'onCombatTick', fn:'selfDamage', data:{ perSec:1 } }],
  tradeoff:'You lose 1 HP per second while in combat.' }

// Enemy
{ id:'morioh_brute', name:'MORIOH BRUTE', tier:1, cost:3,
  profile:'aggressor', standClass:'close',
  stats:{ hp:90, power:6, poise:40, speed:3, aggro:1.2 },
  patterns:['slam','sweep','grab'],
  exposedUser:false, affixSlots:0 }

// Affix
{ id:'affix_bomb_primed', name:'Bomb-Primed', tint:'#FF55FF',
  effects:[{ hook:'onKill', fn:'explode', data:{ dmg:30, pctMaxHp:0.15, radius:70 } }],
  announce:true }

// Encounter
{ id:'enc_morioh_alley_2', act:1, budget:8, arena:'morioh_alley',
  waves:[{ budget:5, types:['morioh_thug','knife_thug'] },
         { budget:3, types:['morioh_brute'], delayMs:1500 }],
  rule:null }   // set to a Rule Fight id for GDD §4.5 encounters

// Rule Fight
{ id:'rule_sheer_heart_attack', name:'SHEER HEART ATTACK',
  brief:'It tracks heat. It cannot be hurt. Find where he is hiding.',
  winCondition:'lureIntoOwner',
  effects:[{ hook:'onEncounterStart', fn:'spawnInvulnerableTracker', data:{...} }],
  reward:{ rarity:'epic' } }

// Node
{ id:'n_a1_r5_l2', act:1, row:5, lane:2, type:'elite',
  next:['n_a1_r6_l1','n_a1_r6_l2'], payload:{ encounter:'enc_morioh_park_elite' } }

// Menace condition
{ id:'menace_crowded', name:'Crowded', maxRank:3,
  desc:'+1 enemy per encounter per rank.',
  effects:[{ hook:'onEncounterStart', fn:'addEnemies', data:{ perRank:1 } }] }

// Bizarre Mission
{ id:'mission_no_projection', name:'Restraint',
  desc:'Clear Act II without Projecting.',
  track:{ hook:'onProjectStart', fails:true, scope:'act', act:2 },
  reward:{ fate:80, archive:'archive.restraint' } }
```

---

## 4. Fairness assertions (automated, from spec §5)

These are **tests**, not guidelines. They run in CI over the content registry:

1. Every attack pattern's telegraph ≥ 260ms with maximum Menace modifiers applied.
2. Every Rest and Shop reward pool contains ≥1 defensive/healing option.
3. Pity timer: no simulated 10,000-run sweep goes >4 nodes without a Rare+.
4. Every Relic with a negative clause has a non-null `tradeoff` string.
5. No Fragment is purely additive (GDD §6.7).
6. Every enemy composition contains ≥1 Clash-able attack.
7. Simulated sweep: no seed produces a run with 0 Rests or 0 Shops on any path.

---

## 5. Build order

Each phase must be *playable and fun on its own* before the next starts.

**Phase 0 — unblock (small).**
Fix audit items 1, 2, 3, 13. Step charges, input buffer, dead code, shared arena constants. This alone
makes the existing prototype feel meaningfully better and validates the frame-data direction.

**Phase 1 — the pipeline.**
Effect pipeline (§2.1), stat pipeline (§2.2), seeded RNG (§2.7), content registry + validator (§2.9).
No new gameplay. This is the load-bearing refactor; everything after is data.

**Phase 2 — the vertical slice.**
2.5D arena, entities/components, frame data + hitboxes, poise/stagger/armor, Momentum + Persistence,
Step/Guard/Clash, and **the Project mechanic**. One Stand (Star Platinum), 3 enemy types, 12 Fragments,
one boss with 3 phases including the exposed-User phase.
**Gate: is this fun for 40 minutes with only 12 Fragments?** If no, stop and fix combat — do not add
content. (Spec §15 step 1: juice-first, prove the core before scaling.)

**Phase 3 — the run.**
Map DAG generator, all node types, Yen economy, shops, rewards + pity + convergence weighting, run
save, Act I complete at full length.

**Phase 4 — classes and content.**
Mid-Range and Long-Range Stand Classes, 4 Stands, 8 donors / ~60 Fragments, 55 Relics, 14 enemy types,
18 affixes, Acts II–IV, 10 bosses.

**Phase 5 — the long tail.**
Rule Fights (12), Aspects (16), Archive + Fate, Bonds, Bizarre Missions, Menacing Presence, Reprises,
Act variants, endgame and superbosses, telemetry-driven balance.

**Phase 6 — polish.** Accessibility, rebinding, seeds/dailies, balance passes off telemetry.
