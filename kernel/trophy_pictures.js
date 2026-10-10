/* THE PICTURES A GAME GIVES. Eleven pictures of one table (assets/rewards/, pressed to the sixteen colours by scripts/make-reward-art.py), each belonging to one place in
   the ledger: a game, or a toy, or the machine. When about three fifths of that place's trophies are earned (SHARE: the first 60 %, rounded up) its picture is handed over, as a
   real file in ::/Pictures on the desktop (kernel/trophy_gallery.js). Six places have none: AfterEgypt, the Crayon, the Garage, the Stack, Notes and the small tools are
   simply not in this list, and that is on purpose. Pure data and two small functions (no window, no storage): `node scripts/check-pictures.mjs` holds it.
   Mirrors (the Cook's and Magen's own achievements) and closed trophies are not counted, as they are not in a mastery seal either; a secret is. */
export const SHARE = 0.6;
export const FOLDER = 'Pictures';

export const PICTURES = [
  { app: 'system',      id: '00', name: 'THE ORIGINAL',        blurb: 'The table as it was: two men, a Beck\'s box and everything else. Every other picture is this one, changed.' },
  { app: 'holyc',       id: '01', name: 'SWAPPED PLACES',      blurb: 'Two variables, no temporary, and nobody sitting where they started.' },
  { app: 'elephant',    id: '02', name: 'HEADS SWAPPED',       blurb: 'A wardrobe that did not check whose head was whose.' },
  { app: 'solitaire',   id: '03', name: 'THE CHESS MATCH',     blurb: 'The table said game. The game was not cards. Nobody has moved for some time.' },
  { app: 'bottle',      id: '04', name: 'THE GUESTS',          blurb: 'The bottles have taken the seats and the people the table. The bottles are holding up better.' },
  { app: 'cook',        id: '05', name: 'THERMAL',             blurb: 'Two at thirty-seven degrees, a vodka at minus two, and a coke exactly as cold as it ought to be.' },
  { app: 'bekkedal',    id: '06', name: 'BUCHAREST, 1923',     blurb: 'Sepia, a few scratches, and two gentlemen with strong views on the energy drink.' },
  { app: 'sweeper',     id: '07', name: 'THE LARVA IN THE CHAIR', blurb: 'A bottle in glasses and braces has taken the empty seat. It was there first.' },
  { app: 'garden',      id: '08', name: 'THE TINY FRIEND',     blurb: 'Small enough to sit on a box of Beck\'s. Nobody has noticed, which is how gardens work.' },
  { app: 'magen',       id: '09', name: 'ANGEL AND DEVIL',     blurb: 'A halo on one side, horns on the other, and a table of cans between them. Each is trying.' },
  { app: 'standbattle', id: '10', name: 'SPONSORED',           blurb: 'A table of identical cans, lined up like a roster. Somebody is paying for this.' }
].map(p => Object.assign({ file: 'assets/rewards/' + p.id + '.png', fileName: p.name.replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '') + '.PNG' }, p));

export const pictureFor = app => PICTURES.find(p => p.app === app) || null;
/* how many trophies is "about three fifths" of a place's total */
export const needOf = total => Math.ceil(total * SHARE);

/* where a place stands: the trophies it has (counted: not a mirror, not closed), how many are earned, how many are needed, and whether that is enough.
   `T` is the ledger (window.Trophies, or the engine in the check). */
export function standing(T, app) {
  const mine = [...T.defs.values()].filter(d => d.app === app && !d.legacy && !T.closed(d));
  const have = mine.filter(d => T.earned(d.id)).length, total = mine.length, need = needOf(total);
  return { have: have, total: total, need: need, enough: total > 0 && have >= need };
}
