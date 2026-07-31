/* Stand Battle Arena — content data.
   Everything here is a plain data object per docs/stand-battle-arena-spec.md
   §14.2: new content is a data entry, not a new code path. */

export const PAL = {
  black: '#000000', blue: '#0000AA', green: '#00AA00', cyan: '#00AAAA',
  red: '#AA0000', magenta: '#AA00AA', brown: '#AA5500', gray: '#AAAAAA',
  dgray: '#555555', lblue: '#5555FF', lgreen: '#55FF55', lcyan: '#55FFFF',
  lred: '#FF5555', lmagenta: '#FF55FF', yellow: '#FFFF55', white: '#FFFFFF'
};

/* Stand definition — stats per §2.1 (Power/Speed/Range/Persistence/
   Precision/Developmental Potential). Range and Power lean inversely,
   per canon and per §2.1's binding constraint. */
export const STANDS = {
  star_platinum: {
    id: 'star_platinum',
    character: 'Jotaro Kujo',
    standName: 'Star Platinum',
    role: 'brawler',
    source: 'Stardust Crusaders (Part 3)',
    stats: { power: 8, speed: 7, range: 2, persistence: 6, precision: 6, devPotential: 3 },
    moves: { light: 'sp_light', medium: 'sp_medium', heavy: 'sp_heavy', special: 'sp_barrage' },
    standRush: 'sp_ora_rush'
  }
};

/* Move definitions moved to moves.js (tech §2.4 frame-data timeline shape,
   Phase 2). Re-exported here so existing `import { MOVES } from './data.js'`
   call sites keep working without churn. */
export { MOVES } from './moves.js';

/* Enemy definitions. attackPatterns reference the shared module library in
   ai.js — per §9, boss variety comes from recombining these, not bespoke
   code per enemy. `poise` (GDD §3.9) is the hit count of poise damage the
   enemy can absorb before staggering -- resolved once by poise.js, never
   read as a raw number anywhere else. */
export const ENEMIES = {
  morioh_thug: {
    id: 'morioh_thug', name: 'MORIOH DELINQUENT', baseType: 'melee',
    hp: 40, power: 5, speedPx: 122, precision: 3, poise: 24,
    attackPatterns: ['sweep', 'telegraphed_slam']
  },
  angelo: {
    id: 'angelo', name: 'ANGELO', baseType: 'elite',
    hp: 78, power: 7, speedPx: 165, precision: 6, poise: 50,
    attackPatterns: ['sweep', 'projectile', 'telegraphed_slam']
  }
};

/* Modifiers apply at node-spawn time for perceived variety without
   hand-authoring new enemy types, per §13. */
export const MODIFIERS = {
  aggressive: { label: '(AGGRESSIVE)', hpMult: 1, speedMult: 1.35, tint: PAL.lred }
};

/* Boss — one bespoke signature move (sheer_heart_attack) layered on the
   shared pattern library, phase transition tied to an explicit cue per §9. */
export const BOSS_KILLER_QUEEN = {
  id: 'killer_queen', character: 'Yoshikage Kira', standName: 'Killer Queen',
  source: 'Diamond is Unbreakable (Part 4)',
  hp: 200, power: 9, speedPx: 140, precision: 8, poise: 70,
  phases: [
    { hpAbove: 0.5, attackPatterns: ['sweep', 'telegraphed_slam', 'projectile'] },
    { hpAbove: 0, attackPatterns: ['sweep', 'telegraphed_slam', 'projectile', 'sheer_heart_attack'] }
  ],
  transitionLine: 'KIRA: "I JUST WANT TO LIVE QUIETLY."'
};

/* Temporary, run-scoped buffs offered by the Treasure/Event nodes — a taste
   of Build Diversity (§4) without a persisted Arrow pool, which is out of
   scope for this prototype milestone (§15 step 1: zero meta-progression).

   Phase 3: ported off three bespoke fighter.js fields (`powerMult`,
   `speedMult`, a maxPersistence bonus) onto the hooks.js query pipeline —
   `queries[]` is installed by effect_lib.js's installRunBuffs() into the
   getDamage/getMaxPersistence/getMoveSpeed query hooks, the same generic
   mechanism a real Arrow will use later. Zero engine code is specific to
   any one of these three ids. */
export const RUN_BUFFS = [
  {
    id: 'power', label: 'STAR-SHAPED FRAGMENT', desc: '+15% Power for this run',
    queries: [{ hook: 'getDamage', fn: 'multiplyIfPlayerAttacker', data: { mult: 1.15 } }]
  },
  {
    id: 'persistence', label: 'ARROW SLIVER', desc: '+20 max Persistence for this run',
    queries: [{ hook: 'getMaxPersistence', fn: 'addFlat', data: { amount: 20 } }]
  },
  {
    id: 'speed', label: 'CRACKED HOURGLASS', desc: '+12% move speed for this run',
    queries: [{ hook: 'getMoveSpeed', fn: 'multiplyFlat', data: { mult: 1.12 } }]
  }
];

export const EVENTS = {
  stray_cat: {
    title: 'BIZARRE ENCOUNTER',
    text: 'A cat watches you from the alley mouth. Its front paw glints — not fur. Metal.',
    choices: [
      { label: 'PET IT', kind: 'buff', flavor: 'The cat purrs static. Something in your Stand feels sharper.' },
      { label: 'WALK AWAY', kind: 'heal', amount: 12, flavor: 'Nothing happens. You catch your breath instead.' }
    ]
  }
};

/* Act 1 — Morioh streets (Diamond is Unbreakable), §3. 6 nodes, prototype
   scope per §15 step 1. */
export const ACT1_MORIOH = {
  id: 'morioh', name: 'MORIOH — DIAMOND IS UNBREAKABLE',
  nodes: [
    { id: 'n1', type: 'combat', enemy: 'morioh_thug', label: 'BACK ALLEY' },
    { id: 'n2', type: 'event', event: 'stray_cat', label: 'A QUIET STREET' },
    { id: 'n3', type: 'combat', enemy: 'morioh_thug', modifier: 'aggressive', label: 'SHOPPING STREET' },
    { id: 'n4', type: 'rest', label: 'CAFE DEUX MAGOTS' },
    { id: 'n5', type: 'elite', enemy: 'angelo', label: 'BUDOGAOKA PARK' },
    { id: 'n6', type: 'boss', boss: 'killer_queen', label: 'KAMEYU DEPARTMENT STORE' }
  ]
};

export const NODE_ICON_COLOR = {
  combat: PAL.lred, elite: PAL.yellow, event: PAL.lcyan,
  rest: PAL.lgreen, boss: PAL.lmagenta, treasure: PAL.yellow
};
