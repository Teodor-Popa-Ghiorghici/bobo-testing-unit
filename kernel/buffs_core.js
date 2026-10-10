/* BUFFS: what HOLYC.EXE gives for doing something without help. Pure (no window, no storage of its own: `createBuffs(io)` is handed one), so Node holds all of it
   (scripts/check-buffs.mjs). A buff is a small gift to one OTHER game or tool, and the rule is that it is hidden: HOLYC.EXE never says which puzzle gives which, nor
   what is given, nor that a list exists. When one is earned the only thing said is that something, somewhere, got a little better; the game it is in is the one that tells you, by
   being different (a chip in Magen, a button in Stand Battle, a coaster on the Jäger's table). They are earned two ways:
     a PUZZLE solved with nothing shown: no hint opened, and the answer never looked at;
     the WORKSHOP: a program written from a blank page (not a template with a few words changed) that runs clean and is installed on the desktop.
   `rec.helped` is set the moment a hint is opened or the answer shown. A puzzle solved before that was kept (helped is absent) counts as unaided unless its answer was seen. */
export const KEY = 'templeos.buffs.v1';

/* `by.puzzle` is a puzzle id (apps/holyc/puzzles_*.js), `by.shop` a thing the workshop noticed (apps/holyc/buff_rules.js). `game` is the registry id of the one that has it. */
export const BUFFS = [
  { id: 'magen_money',   game: 'magen',       name: 'A BLESSING ON THE COUNT',  by: { puzzle: 'n_change' },  text: 'Six per cent more mitzvot from everything: pressing, buildings, the lot.' },
  { id: 'garden_wall',   game: 'garden',      name: 'THE ROOMS, ALIVE',         by: { puzzle: 'p_rainbow' }, text: 'The five rooms without a single pot or flower in them, moving, as wallpaper.' },
  { id: 'bekkedal_bag',  game: 'bekkedal',    name: 'A BIGGER SEKK',            by: { shop: 'clock' },       text: 'Ten more places in the sekk.' },
  { id: 'stack_lab',     game: 'hifi',        name: 'EXPERIMENTAL MODE',        by: { shop: 'notes' },       text: 'Every knob in THE STACK turns half as far again in each direction.' },
  { id: 'battle_pose',   game: 'standbattle', name: 'POSE',                     by: { puzzle: 's_dice' },    text: 'A button that puts every fighter\'s limbs somewhere random. It does nothing to a fight.' },
  { id: 'notes_fonts',   game: 'notes',       name: 'THREE MORE HANDS',         by: { puzzle: 'w_shout' },   text: 'Three more fonts in NOTES.' },
  { id: 'jager_coaster', game: 'bottle',      name: 'A COASTER',                by: { puzzle: 'p_disc' },    text: 'A coaster for the glass.' },
  { id: 'bin_dumpster',  game: 'trash',       name: 'THE DUMPSTER',             by: { puzzle: 'l_endless' }, text: 'The bin can be a recycle dumpster. Right-click it to change.' }
];
export const byId = id => BUFFS.find(b => b.id === id) || null;

/* the one test: solved, the answer never shown, no hint ever opened */
export const unaided = rec => !!rec && !!rec.solved && !rec.seen && !rec.helped;

/* what the lab has recorded, in the shape HOLYC.EXE keeps it: { puzzles: { id: { solved, seen, helped } }, shop: { clock: true, notes: true } } -> the ids that are earned */
export function earnedBy(progress) {
  const p = (progress && progress.puzzles) || {}, s = (progress && progress.shop) || {};
  return BUFFS.filter(b => (b.by.puzzle && unaided(p[b.by.puzzle])) || (b.by.shop && !!s[b.by.shop])).map(b => b.id);
}

/* a few words for a buff arriving, none of which say which, or where. One at a time, never the same twice running. */
export const LINES = [
  'YOU DID THAT YOURSELF. SOMETHING, SOMEWHERE, GOT A LITTLE BETTER.',
  'NO HINTS, NO ANSWER. THE MACHINE NOTICED. GO AND LOOK AROUND.',
  'A WARMTH IN THE WIRING. SOMETHING ELSE ON THIS MACHINE IS DIFFERENT NOW.',
  'UNAIDED. SOMETHING HAS CHANGED, AND IT WILL NOT SAY WHAT.',
  'THE MACHINE WAS WATCHING. YOU NEVER ASKED FOR HELP. IT HAS DONE YOU A SMALL FAVOUR.',
  'IT COUNTS WHEN NOBODY HELPS. SOMEWHERE, SOMETHING IS BETTER FOR IT.'
];

/* the book: which are held and when. `io` is { get(), set(string) } */
export function createBuffs(io, onGain) {
  let held = {};
  try { const v = JSON.parse(io.get()); if (v && typeof v === 'object') held = v; } catch (e) { /* none yet */ }
  const keep = () => io.set(JSON.stringify(held));
  const B = {
    has: id => !!held[id],
    list: () => Object.keys(held).filter(id => byId(id)),
    /* returns true if it is new */
    grant(id, quiet) {
      if (!byId(id) || held[id]) return false;
      held[id] = Date.now(); keep();
      if (onGain) onGain(byId(id), !!quiet);
      return true;
    },
    /* everything the progress has earned and the book does not yet hold: how many were new */
    sync(progress, quiet) { let n = 0; earnedBy(progress).forEach(id => { if (B.grant(id, true)) n++; }); if (n && onGain) onGain(null, !!quiet, n); return n; },
    forget() { held = {}; keep(); }
  };
  return B;
}
