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
 *   mineSalt        the same offset for a floor of the descent, which is the
 *                   one field in this file that IS seeded. A gruva floor is
 *                   generated per run rather than authored (see mine.js), so
 *                   its stream has to be a function of the run's seed as well
 *                   as of the floor number — and it still must not land on any
 *                   authored map's channels, so it is offset clear of the
 *                   whole space mapSalt can reach. Nothing about it is saved
 *                   either: the seed is (S.run.seed), and the field is
 *                   recomputed from it, so a floor reloads identical.
 *
 * `channels()` and the recipe tables are the declaration of every stream the
 * art — and the mine's generator — is allowed to draw from. The tables
 * themselves live in `noise_recipes.js`, split off for the 300-line rule the
 * way `palette_marks.js` is split off `palette.js`; what a stream *is* stayed
 * here, and *which streams exist* is declared there. `tileVariation` applies
 * them, and `tile_check.js` (`node apps/bekkedal/tile_check.js`) reads the
 * same tables to assert the field is uniform, aperiodic and reproducible. A
 * channel that is not declared there cannot be tested, so it must not be
 * drawn from.
 */

import { R_GROUND, R_ROCK, R_PATH, R_WATER, R_WAVE, R_EDGE, R_SOIL, R_SEAM,
         R_TREE, R_MINE, R_OBJ, objBase, JIT, GROUND_BASE, ROCK_BASE, PATH_BASE,
         WATER_BASE, EDGE_BASE, SOIL_BASE, SEAM_BASE, WAVE_BASE, TREE_BASE,
         MINE_CH_BASE } from './noise_recipes.js';
export { JIT } from './noise_recipes.js';

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

/* The descent's own salt. `mapSalt` can reach 1023 * CH_SPAN and no further,
   so starting above that is what keeps a generated floor off every authored
   map's streams — the point of the salt in the first place. Inside its own
   space a floor is spread by the avalanching hash of (seed, floor) at a
   stride wider than R_MINE declares, so floor 7 of one run and floor 7 of the
   next are independent fields rather than the same cave twice. */
const MINE_BASE = 1024 * CH_SPAN, MINE_SPAN = 64;
export function mineSalt(seed, floor) {
  return MINE_BASE + (hash(seed | 0, floor | 0, 7919) % 1048576) * MINE_SPAN;
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
export const waveVar = (mapId, i) => roll(R_WAVE, WAVE_BASE, mapId, i, 0);
export const treeVar = (mapId, i, layer) => roll(R_TREE, TREE_BASE, mapId, i, layer);
/* The one reader that is handed a salt rather than a map id, because the map
   it is about does not exist until the run generates it. `salt` is always a
   mineSalt(seed, floor) above. */
export function mineVar(salt, x, y) {
  const s = salt + MINE_CH_BASE, out = {};
  for (let i = 0; i < R_MINE.length; i++) out[R_MINE[i].name] = hv(x, y, s + R_MINE[i].ch, R_MINE[i].n);
  return out;
}
export const mineV = (salt, x, y, name) => {
  for (let i = 0; i < R_MINE.length; i++)
    if (R_MINE[i].name === name) return hv(x, y, salt + MINE_CH_BASE + R_MINE[i].ch, R_MINE[i].n);
  throw new Error('undeclared mine channel: ' + name);
};

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
  add('wave', R_WAVE, WAVE_BASE);
  add('tree', R_TREE, TREE_BASE);
  add('mine', R_MINE, MINE_CH_BASE);
  Object.keys(R_OBJ).forEach(c => add('obj[' + c + ']', R_OBJ[c], objBase(c)));
  return out;
}

