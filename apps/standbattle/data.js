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

/* Move definitions. Timings are milliseconds; hitstopMs follows §10
   (3-5 frames light ~= 50-83ms, up to 8 frames ~= 133ms on heavies/rush). */
export const MOVES = {
  sp_light: {
    id: 'sp_light', type: 'light', persistenceCost: 0, persistenceGain: 5,
    windupMs: 50, activeMs: 90, recoverMs: 130, range: 34,
    hitCount: 1, damage: 4, knockback: 5, hitstopMs: 55, label: 'JAB'
  },
  sp_medium: {
    id: 'sp_medium', type: 'medium', persistenceCost: 0, persistenceGain: 8,
    windupMs: 110, activeMs: 110, recoverMs: 190, range: 38,
    hitCount: 1, damage: 8, knockback: 9, hitstopMs: 70, label: 'STRIKE'
  },
  sp_heavy: {
    id: 'sp_heavy', type: 'heavy', persistenceCost: 0, persistenceGain: 12,
    windupMs: 230, activeMs: 130, recoverMs: 340, range: 40,
    hitCount: 1, damage: 15, knockback: 16, hitstopMs: 110, label: 'HEAVY'
  },
  sp_barrage: {
    id: 'sp_barrage', type: 'special', persistenceCost: 35, persistenceGain: 0,
    windupMs: 90, activeMs: 260, recoverMs: 220, range: 36,
    hitCount: 4, damage: 4, knockback: 3, hitstopMs: 45, label: 'ORA BARRAGE'
  },
  sp_ora_rush: {
    id: 'sp_ora_rush', type: 'rush', persistenceCost: 80, persistenceGain: 0,
    windupMs: 140, activeMs: 620, recoverMs: 300, range: 42,
    hitCount: 9, damage: 5, knockback: 2, hitstopMs: 130, label: 'ORA ORA ORA!'
  }
};

/* Enemy definitions. attackPatterns reference the shared module library in
   ai.js — per §9, boss variety comes from recombining these, not bespoke
   code per enemy. */
export const ENEMIES = {
  morioh_thug: {
    id: 'morioh_thug', name: 'MORIOH DELINQUENT', baseType: 'melee',
    hp: 40, power: 5, speedPx: 70, precision: 3,
    attackPatterns: ['sweep', 'telegraphed_slam']
  },
  angelo: {
    id: 'angelo', name: 'ANGELO', baseType: 'elite',
    hp: 78, power: 7, speedPx: 95, precision: 6,
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
  hp: 200, power: 9, speedPx: 80, precision: 8,
  phases: [
    { hpAbove: 0.5, attackPatterns: ['sweep', 'telegraphed_slam', 'projectile'] },
    { hpAbove: 0, attackPatterns: ['sweep', 'telegraphed_slam', 'projectile', 'sheer_heart_attack'] }
  ],
  transitionLine: 'KIRA: "I JUST WANT TO LIVE QUIETLY."'
};

/* Temporary, run-scoped buffs offered by the Treasure/Event nodes — a taste
   of Build Diversity (§4) without a persisted Arrow pool, which is out of
   scope for this prototype milestone (§15 step 1: zero meta-progression). */
export const RUN_BUFFS = [
  { id: 'power', label: 'STAR-SHAPED FRAGMENT', desc: '+15% Power for this run', powerMult: 1.15 },
  { id: 'persistence', label: 'ARROW SLIVER', desc: '+20 max Persistence for this run', maxPersistenceBonus: 20 },
  { id: 'speed', label: 'CRACKED HOURGLASS', desc: '+12% move speed for this run', speedMult: 1.12 }
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
