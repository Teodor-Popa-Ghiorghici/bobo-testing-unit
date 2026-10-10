/* THE LITTLE PICTURES ON THE LABELS, for the drinks that have none of their own in drinks.js (every one used to wear the Jägermeister's stag). Each is thirteen by eleven units, drawn at a whole number of
   pixels a unit: `#` is the label's ink, `o` the drink's own colour (`K.accent`), `l` the paper showing through, `.` nothing. A function (r, x, y, s, k): r fills a rectangle, (x, y) the top left, s the unit,
   k the colours. Held by apps/bottle/labels_check.js (every grid is 13 x 11). */
export const ICON_W = 13, ICON_H = 11;
const bmp = rows => (r, x, y, s, k) => rows.forEach((line, j) => {
  for (let i = 0; i < line.length; i++) { const c = line[i]; if (c !== '.') r(x + i * s, y + j * s, s, s, c === '#' ? k.ink : c === 'o' ? (k.accent || k.ink) : k.label); }
});
const unit = (r, x, y, s) => (a, b, w, h, c) => r(x + a * s, y + b * s, Math.max(1, w * s), Math.max(1, h * s), c);
const disc = (u, cx, cy, rad, c) => { for (let yy = -rad; yy <= rad; yy++) { const w = Math.round(Math.sqrt(Math.max(0, rad * rad - yy * yy))); u(cx - w, cy + yy, 2 * w + 1, 1, c); } };

export const GRIDS = {
  flake: ['......#......', '.#....#....#.', '..#...#...#..', '...#..#..#...', '....#.#.#....', '######o######', '....#.#.#....', '...#..#..#...', '..#...#...#..', '.#....#....#.', '......#......'],
  holy: ['......#......', '.....###.....', '....#####....', '...#######...', '...###l###...', '..####l####..', '..##lllll##..', '..####l####..', '..####l####..', '...#######...', '....#####....'],
  knob: ['....#####....', '..###ooo###..', '.#ooooooooo#.', '.#oooo#oooo#.', '#ooooo#ooooo#', '#ooooo#ooooo#', '#ooooooooooo#', '.#ooooooooo#.', '.#ooooooooo#.', '..###ooo###..', '....#####....'],
  sun: ['......#......', '.#....#....#.', '..#...#...#..', '....#####....', '...#ooooo#...', '##.#ooooo#.##', '...#ooooo#...', '....#####....', '..#...#...#..', '.#....#....#.', '......#......'],
  ghost: ['....#####....', '...#ooooo#...', '..#oo#o#oo#..', '..#oo#o#oo#..', '..#ooooooo#..', '..#ooooooo#..', '..#ooooooo#..', '..#oo#o#oo#..', '..#o#.#.#o#..', '..##..#..##..', '.............'],
  hive: ['...#######...', '..#ooooooo#..', '.#ooooooooo#.', '#ooooooooooo#', '#ooooo#ooooo#', '#ooooo#ooooo#', '#oooo###oooo#', '.#ooo###ooo#.', '..#ooo#ooo#..', '...#######...', '.............'],
  flower: ['...##...##...', '..#oo#.#oo#..', '..#ooo#ooo#..', '...#ooooo#...', '.##ooo#ooo##.', '#oooo###oooo#', '.##ooo#ooo##.', '...#ooooo#...', '..#oo###oo#..', '..#o#...#o#..', '...#.....#...'],
  moon: ['....####.....', '..##oooo#....', '.#ooo##......', '.#oo#........', '#ooo#.....#..', '#ooo#....###.', '#ooo#.....#..', '.#oo#........', '.#ooo##......', '..##oooo#....', '....####.....'],
  sprout: ['..###...###..', '.#ooo#.#ooo#.', '.#oooo#oooo#.', '..#ooo#ooo#..', '...###.###...', '......#......', '......#......', '......#......', '..#########..', '..#ooooooo#..', '..#########..'],
  leaf: ['.........###.', '.......##oo#.', '.....##oooo#.', '....#oooooo#.', '...#oooooo#..', '..#ooooooo#..', '.#o#ooooo#...', '.#oo#ooo#....', '#.#ooo##.....', '#..###.......', '#............'],
  cloud: ['.............', '.....###.....', '...##ooo##...', '..#ooooooo##.', '.#oooooooooo#', '#ooooooooooo#', '#ooooooooooo#', '.############', '.............', '..#...#...#..', '.#...#...#...'],
  cup: ['.............', '..#########..', '..#ooooooo#..', '..#ooooooo#..', '...#ooooo#...', '...#ooooo#...', '....#ooo#....', '.....#o#.....', '.....#o#.....', '....#####....', '...#######...'],
  tree: ['......#......', '.....#o#.....', '....#ooo#....', '...#ooooo#...', '....#ooo#....', '...#ooooo#...', '..#ooooooo#..', '.#ooooooooo#.', '#ooooooooooo#', '.....###.....', '.....###.....']
};
const fromGrid = {}; Object.keys(GRIDS).forEach(k => { fromGrid[k] = bmp(GRIDS[k]); });

const berries = (r, x, y, s, k) => { const u = unit(r, x, y, s); u(6, 0, 1, 2, k.ink); u(7, 0, 3, 1, k.accent || k.ink); disc(u, 3, 7, 3, k.ink); disc(u, 9, 7, 3, k.ink); disc(u, 6, 4, 3, k.ink); disc(u, 3, 7, 2, k.accent || k.ink); disc(u, 9, 7, 2, k.accent || k.ink); disc(u, 6, 4, 2, k.accent || k.ink); u(2, 6, 1, 1, k.label); u(8, 6, 1, 1, k.label); u(5, 3, 1, 1, k.label); };
const peanut = (r, x, y, s, k) => { const u = unit(r, x, y, s); disc(u, 4, 5, 4, k.ink); disc(u, 8, 5, 4, k.ink); disc(u, 4, 5, 3, k.accent || k.ink); disc(u, 8, 5, 3, k.accent || k.ink); u(3, 4, 1, 1, k.ink); u(2, 6, 1, 1, k.ink); u(9, 4, 1, 1, k.ink); u(10, 6, 1, 1, k.ink); };
const balloon = (r, x, y, s, k) => { const u = unit(r, x, y, s); disc(u, 6, 4, 4, k.ink); disc(u, 6, 4, 3, k.accent || k.ink); u(4, 2, 1, 1, k.label); u(5, 1, 2, 1, k.label); u(6, 8, 1, 1, k.ink); u(5, 9, 1, 1, k.ink); u(6, 10, 1, 1, k.ink); u(1, 1, 1, 1, k.ink); u(11, 2, 1, 1, k.ink); u(1, 8, 1, 1, k.ink); u(11, 8, 1, 1, k.ink); };
const clock = (r, x, y, s, k) => { const u = unit(r, x, y, s); disc(u, 6, 5, 5, k.ink); disc(u, 6, 5, 4, k.label); u(6, 2, 1, 4, k.ink); u(6, 5, 3, 1, k.ink); u(6, 5, 1, 1, k.accent || k.ink); u(6, 1, 1, 1, k.ink); u(6, 9, 1, 1, k.ink); u(2, 5, 1, 1, k.ink); u(10, 5, 1, 1, k.ink); };

/* drink id -> picture. The Jägermeister (and any drink with no entry) keeps the stag. */
export const ICONS = {
  goldwasser: fromGrid.flake, holywater: fromGrid.holy, knobtonic: fromGrid.knob, sunwater: fromGrid.sun, soulwater: fromGrid.ghost, ichor: fromGrid.hive,
  karkade: fromGrid.flower, zibib: fromGrid.moon, rootnectar: fromGrid.sprout, herbbitter: fromGrid.leaf, bluesky: fromGrid.cloud, kiddush: fromGrid.cup,
  julebrus: fromGrid.tree, solbaer: berries, peanutlik: peanut, partywine: balloon, stoptime: clock
};
