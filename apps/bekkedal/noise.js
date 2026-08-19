/* Bekkedal — where the terrain's variation comes from.
 *
 * Every "which tuft, which colour, where does the grit sit" decision in
 * `drawTile` used to be one of two numbers:
 *
 *     seed = (x * 7  + y * 13) % 5
 *     v    = (x * 31 + y * 17) % 7
 *
 * Both are linear in x and y, so both repeat on a lattice: step (6, 1) and
 * every one of them comes back to the value it had, which is why a field of
 * grass laid down diagonal bands of identical tiles. Worse, the whole tile
 * hung off those two numbers, so the four decisions a tile made were really
 * one and a half — the blade on the left could not move without the blade on
 * the right moving with it.
 *
 * What replaces them is one avalanching integer hash. `ch` is a channel
 * index, and a channel is an independent stream: a tile draws its mark
 * positions, its mark colours and its rarer extras from different channels,
 * so those decisions are uncorrelated with each other as well as with the
 * neighbouring tile's. It is a pure function of the map id, the grid square
 * and the channel — the same map looks identical on every reload, and
 * nothing here needs seeding, saving or migrating.
 *
 * The primitives:
 *
 *   hash / hv       the high-frequency field, one value per tile
 *   hLow / hLowV    the same hash read at the resolution of a `period`-tile
 *                   cell, so a value holds over a patch of map instead of a
 *                   single tile
 *   patchAmt        the low-frequency field again, but interpolated and
 *                   returned as an ordered-dither strength, so a patch's
 *                   edge feathers out through the same stipple the night
 *                   overlay uses rather than stopping on a tile boundary
 *   mapSalt         the per-map channel offset. Everything above takes a
 *                   raw channel, so a caller reaching for hash/hv/hLow
 *                   directly has to add this itself or all eleven maps
 *                   share one field.
 *
 * `channels()` and the recipe tables below are the declaration of every
 * stream the art is allowed to draw from. `tileVariation` applies them, and
 * `tile_check.js` (`node apps/bekkedal/tile_check.js`) reads the same tables
 * to assert the field is uniform, aperiodic and reproducible. A channel that
 * is not declared there cannot be tested, so it must not be drawn from.
 */

/* ---- the hash ------------------------------------------------------------
   xorshift-multiply: one bit of x, y or ch flips about half the output bits,
   which is the whole point — the old seeds changed by a fixed step when x
   did, so tiles a fixed distance apart agreed. Math.imul rather than `*`
   because the second multiply overflows 2^53 and would otherwise round. */
export function hash(x, y, ch) {
  let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(ch | 0, 1442695041)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177) | 0;
  return (n ^ (n >>> 16)) >>> 0;
}
export const hv = (x, y, ch, n) => hash(x, y, ch) % n;

/* The same hash asked about the cell a tile falls in rather than the tile.
   At period 8 that is a region three cells wide on a 24x15 map, so whatever
   it decides holds across a corner of the valley. */
export const hLow = (x, y, ch, period) => hash((x / period) | 0, (y / period) | 0, ch);
export const hLowV = (x, y, ch, period, n) => hLow(x, y, ch, period) % n;

/* ---- per-map channel salt ------------------------------------------------
   Without this the field is a function of grid position alone, so the fourth
   tuft in row 3 is the same tuft in all eleven maps. Each map id shifts the
   whole channel space by a multiple of CH_SPAN, which is wider than any
   channel below, so two maps can never land on each other's streams. */
const CH_SPAN = 4096;
export function mapSalt(mapId) {
  const s = String(mapId);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return ((h >>> 0) & 1023) * CH_SPAN;
}

/* ---- the low-frequency fields --------------------------------------------
   A patch is not a tile decision, it is a region: drier grass over here,
   mossier stone over there, ground that stays wet in the hollow. `patchAmt`
   returns how strongly a tile is inside one, as a 0..max ordered-dither
   strength, by smoothing the cell hashes across the cell boundary and then
   pushing everything below PATCH_LO to nothing and everything above PATCH_HI
   to full. What is left in between is the fringe — a couple of tiles wide at
   period 8 — and it reaches the screen as stipple, which is how this game
   has always blended one VGA16 index into another. */
const PATCH_LO = 0.42, PATCH_HI = 0.62;
const PATCH_JIT = 512;               /* the rounding channel, clear of LOW */
const unit = (x, y, ch) => hash(x, y, ch) / 4294967296;
const smooth = t => t * t * (3 - 2 * t);
export function patchAmt(mapId, x, y, ch, period, max) {
  const s = mapSalt(mapId) + ch;
  const fx = (x + 0.5) / period - 0.5, fy = (y + 0.5) / period - 0.5;
  const i = Math.floor(fx), j = Math.floor(fy);
  const ex = smooth(fx - i), ey = smooth(fy - j);
  const a = unit(i, j, s), b = unit(i + 1, j, s);
  const c = unit(i, j + 1, s), d = unit(i + 1, j + 1, s);
  const top = a + (b - a) * ex, bot = c + (d - c) * ex;
  const v = top + (bot - top) * ey;
  const f = (v - PATCH_LO) / (PATCH_HI - PATCH_LO) * max;
  /* Round with a per-tile offset rather than to nearest. Rounding to nearest
     puts the step from one dither strength to the next on an exact contour
     of a smooth field, which comes out as a straight line across the map —
     a hard edge one stipple step tall, which is the thing this was supposed
     to avoid. Offsetting by the tile's own hash breaks that line up while
     leaving the flat interior alone: at f exactly 0 or exactly max the
     offset can never carry it over. */
  const n = Math.floor(f + unit(x, y, s + PATCH_JIT));
  return n < 0 ? 0 : n > max ? max : n;
}

/* The low-frequency channels. The feathered ones (patchAmt) paint, so their
   edge has to be dithered; the discrete ones (hLowV) only decide how often a
   sparse one-pixel mark appears, where a hard cell edge is invisible. */
export const LOW = {
  DRY: 3072,        /* feathered, period 8 — grass going over to straw     */
  LUSH: 3073,       /* feathered, period 4 — a greener, wetter run         */
  MOSS: 3074,       /* feathered, period 8 — moss on stone                 */
  DAMP: 3075,       /* feathered, period 4 — seeping rock, wet gravel      */
  WORN: 3076,       /* feathered, period 8 — the trodden line of a path    */
  DUST: 3077,       /* feathered, period 4 — dry dust, worn boards         */
  MEADOW: 3078,     /* discrete,  period 8 — where flowering blades gather */
  VEIN: 3079        /* discrete,  period 4 — where the mineral glints are  */
};

/* How hard each feathered patch is allowed to push, as an ordered-dither
   strength out of 16, and over what period. Deliberately low: a patch is a
   change in the character of the ground, not a second kind of ground. The
   dry field first went in at 7 and whole corners of the valley stopped
   reading as grass — they read as the ploughed plot next to them, and the
   paths crossing them disappeared. Four is a tint. */
export const PATCH = {
  DRY: { ch: LOW.DRY, period: 8, max: 4 },
  LUSH: { ch: LOW.LUSH, period: 4, max: 3 },
  MOSS: { ch: LOW.MOSS, period: 8, max: 4 },
  DAMP: { ch: LOW.DAMP, period: 4, max: 3 },
  WORN: { ch: LOW.WORN, period: 8, max: 4 },
  DUST: { ch: LOW.DUST, period: 4, max: 3 }
};

/* ---- the recipes ---------------------------------------------------------
   name / channel / how many values. `x` and `y` fields are step indices, not
   pixels: the art turns one into a position with `spot()`, which spreads the
   nine steps across whatever room the mark's own size leaves it. That is why
   the same recipe serves a 40px native tile and a 20px source-space one.
   Every mark gets its own pair of channels, so it jitters on both axes and
   the two axes are independent of each other. */
const F = (name, ch, n) => ({ name: name, ch: ch, n: n });
export const JIT = 9;                            /* nine placements per axis */

const R_GROUND = [];
for (let i = 0; i < 4; i++) {
  R_GROUND.push(F('x' + i, i * 3, JIT), F('y' + i, i * 3 + 1, JIT), F('c' + i, i * 3 + 2, 7));
}

const R_ROCK = [
  F('fx', 0, JIT), F('fy', 1, JIT),              /* the lit face            */
  F('gx', 2, JIT), F('gy', 3, JIT),              /* the second face         */
  F('ax', 4, JIT), F('ay', 5, JIT),              /* two cracks              */
  F('bx', 6, JIT), F('by', 7, JIT),
  F('mx', 8, JIT), F('my', 9, JIT),              /* mineral, snow or seepage */
  F('kind', 10, 5),                              /* which extra it carries  */
  F('ix', 11, JIT), F('iy', 12, JIT),            /* four inclusions, for the */
  F('jx', 13, JIT), F('jy', 14, JIT),            /* ore and crystal faces    */
  F('hx', 15, JIT), F('hy', 16, JIT),
  F('lx', 17, JIT), F('ly', 18, JIT),
  /* Which metal this square carries. Twenty values rather than five because
     the weights it stands in for are 55/30/15, and rounding those to fifths
     would move the economy — see `oreKind` in rock.js. */
  F('ore', 19, 20)
];

const R_PATH = [
  F('ax', 0, JIT), F('ay', 1, JIT),              /* two scuffs of dark grit */
  F('bx', 2, JIT), F('by', 3, JIT),
  F('cx', 4, JIT), F('cy', 5, JIT),              /* two of pale grit        */
  F('dx', 6, JIT), F('dy', 7, JIT),
  F('kx', 8, JIT), F('ky', 9, JIT),              /* a crack in the hardpack */
  F('px', 10, JIT), F('py', 11, JIT),            /* the odd pebble          */
  F('peb', 12, 5)
];

const R_WATER = [
  F('sw', 0, 5),                                 /* how high the swell sits */
  F('ax', 1, JIT), F('ay', 2, JIT),              /* two ripple bands        */
  F('bx', 3, JIT), F('by', 4, JIT),
  F('foam', 5, 5), F('glint', 6, 7)
];

const R_EDGE = [
  F('ax', 0, JIT), F('ay', 1, JIT),              /* two ripple bands        */
  F('bx', 2, JIT), F('by', 3, JIT),
  F('fx', 4, JIT), F('gx', 5, JIT),              /* breaks in the foam seam */
  F('sx', 6, JIT), F('sy', 7, JIT)               /* a stone on the bank     */
];

const R_SOIL = [                                 /* standing water in a furrow */
  F('ax', 0, JIT), F('ay', 1, JIT), F('bx', 2, JIT), F('by', 3, JIT)
];

/* The one stream that is not indexed by a grid square. A shore's foam used to
   break per tile, which drew a visible 40px rhythm along any straight stretch
   of it; the breaks come off the distance *along the seam* now, so a run of
   shore is one line of surf however many tiles it crosses. Indexed by that
   distance in `i`, with y pinned to 0 — still the same hash, still salted per
   map, and still declared here so `tile_check.js` tests it. */
const R_SEAM = [
  F('foam', 0, 5),                               /* where the surf breaks   */
  F('crest', 1, 7)                               /* and where it catches    */
];

/* One block per glyph, so a fir and a birch on the same square would not be
   making the same decision twice. */
const OBJ_BASE = 128, OBJ_SPAN = 16;
const objBase = c => OBJ_BASE + c.charCodeAt(0) * OBJ_SPAN;
const R_OBJ = {
  ',': [F('ax', 0, JIT), F('ay', 1, JIT), F('bx', 2, JIT), F('by', 3, JIT),
        F('cx', 4, JIT), F('cy', 5, JIT), F('dx', 6, JIT), F('dy', 7, JIT), F('c', 8, 7)],
  'F': [F('ax', 0, JIT), F('ay', 1, JIT), F('ac', 2, 5), F('bx', 3, JIT), F('by', 4, JIT),
        F('bc', 5, 5), F('cx', 6, JIT), F('cy', 7, JIT), F('cc', 8, 5)],
  'p': [F('x', 0, JIT), F('y', 1, JIT), F('c', 2, 4), F('h', 3, 5)],
  'T': [F('lean', 0, 3), F('lit', 1, 3), F('sx', 2, JIT), F('sy', 3, JIT), F('bare', 4, 6),
        F('tx', 5, JIT), F('ty', 6, JIT), F('bx', 7, JIT), F('by', 8, JIT)],
  'G': [F('lit', 0, 3), F('sx', 1, JIT), F('sy', 2, JIT), F('lx', 3, JIT), F('ly', 4, JIT)],
  'Y': [F('turn', 0, 5), F('lx', 1, JIT), F('ly', 2, JIT), F('mx', 3, JIT), F('my', 4, JIT)],
  '^': [F('mx', 0, JIT), F('my', 1, JIT), F('cap', 2, 5), F('sx', 3, JIT), F('sy', 4, JIT)],
  'H': [F('win', 0, 5), F('kx', 1, JIT), F('ky', 2, JIT)],
  'R': [F('ax', 0, JIT), F('ay', 1, JIT), F('bx', 2, JIT), F('by', 3, JIT),
        F('cx', 4, JIT), F('cy', 5, JIT), F('fx', 6, JIT), F('fy', 7, JIT)]
};

const GROUND_BASE = 0, ROCK_BASE = 16, PATH_BASE = 40, WATER_BASE = 56,
      EDGE_BASE = 68, SOIL_BASE = 76, SEAM_BASE = 84;

/* ---- reading a recipe ---------------------------------------------------- */
function roll(recipe, base, mapId, x, y) {
  const s = mapSalt(mapId) + base, out = {};
  for (let i = 0; i < recipe.length; i++) out[recipe[i].name] = hv(x, y, s + recipe[i].ch, recipe[i].n);
  return out;
}
export const groundVar = (mapId, x, y) => roll(R_GROUND, GROUND_BASE, mapId, x, y);
export const rockVar = (mapId, x, y) => roll(R_ROCK, ROCK_BASE, mapId, x, y);
export const pathVar = (mapId, x, y) => roll(R_PATH, PATH_BASE, mapId, x, y);
export const waterVar = (mapId, x, y) => roll(R_WATER, WATER_BASE, mapId, x, y);
export const edgeVar = (mapId, x, y) => roll(R_EDGE, EDGE_BASE, mapId, x, y);
export const soilVar = (mapId, x, y) => roll(R_SOIL, SOIL_BASE, mapId, x, y);
export const objVar = (c, mapId, x, y) => (R_OBJ[c] ? roll(R_OBJ[c], objBase(c), mapId, x, y) : {});
export const seamVar = (mapId, i) => roll(R_SEAM, SEAM_BASE, mapId, i, 0);

/* ---- the tuple the checks compare ----------------------------------------
   Every high-frequency decision a tile of char `c` makes, flattened in
   recipe order. Deliberately only the high-frequency ones: a patch value is
   meant to agree with its neighbour's, so folding it in here would make the
   periodicity check easier to pass rather than harder. `null` means the tile
   has nothing to vary — a black margin or a plank pier. */
export function tileVariation(mapId, c, x, y) {
  if (c === ' ' || c === 'P') return null;
  const vals = o => { const k = Object.keys(o), r = []; for (let i = 0; i < k.length; i++) r.push(o[k[i]]); return r; };
  if (c === 'W') return vals(waterVar(mapId, x, y));
  if (c === '~') return vals(edgeVar(mapId, x, y));
  if (c === '.') return vals(pathVar(mapId, x, y));
  if (c === 'M' || c === 'O' || c === 'Q') return vals(rockVar(mapId, x, y));
  return vals(groundVar(mapId, x, y)).concat(vals(objVar(c, mapId, x, y)));
}

/* Every declared stream, absolute channel and all, for the uniformity check.
   The moduli are all small on purpose: a 24x15 grid across eleven maps is
   3960 samples, which resolves a nine-way split to well inside 20% of flat
   but could not say anything useful about a 34-way one. */
export function channels() {
  const out = [];
  const add = (label, recipe, base) => {
    for (let i = 0; i < recipe.length; i++) out.push({ name: label + '.' + recipe[i].name, ch: base + recipe[i].ch, n: recipe[i].n });
  };
  add('ground', R_GROUND, GROUND_BASE);
  add('rock', R_ROCK, ROCK_BASE);
  add('path', R_PATH, PATH_BASE);
  add('water', R_WATER, WATER_BASE);
  add('edge', R_EDGE, EDGE_BASE);
  add('soil', R_SOIL, SOIL_BASE);
  add('seam', R_SEAM, SEAM_BASE);
  Object.keys(R_OBJ).forEach(c => add('obj[' + c + ']', R_OBJ[c], objBase(c)));
  return out;
}
