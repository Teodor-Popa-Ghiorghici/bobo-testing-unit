/* Bekkedal — the recipe tables: every stream the terrain art and the mine's
 * generator are allowed to draw from, and where each one sits in the channel
 * space.
 *
 * Split off `noise.js` for the 300-line rule the same way `palette_marks.js`
 * is split off `palette.js`, and for the same reason: what a stream *is*
 * (the hash, the salt, the patch fields, `channels()`, the readers) stayed
 * there; the declaration of *which streams exist* is here. The dependency
 * runs one way — this file imports nothing back — so a caller asks `noise.js`
 * for a value and never touches these tables directly.
 *
 * `channels()` in `noise.js` walks exactly what is exported here, and
 * `tile_check.js` tests exactly what `channels()` returns. **A stream drawn
 * from but not declared in this file is a stream nothing checks.**
 *
 * The moduli are all small on purpose: the eleven authored maps are 11232
 * tiles, which resolves a sixteen-way split to about 11% of flat but a
 * sixty-four-way one to about 27% — over `tile_check.js`'s own 20% tolerance.
 * A decision that wants finer resolution than sixteen takes it as a priority
 * class and breaks the tie on something else (see `veinScore` in `mine.js`).
 */

/* ---- the recipes ---------------------------------------------------------
   name / channel / how many values. `x` and `y` fields are step indices, not
   pixels: the art turns one into a position with `spot()`, which spreads the
   nine steps across whatever room the mark's own size leaves it. That is why
   the same recipe serves a 40px native tile and a 20px source-space one.
   Every mark gets its own pair of channels, so it jitters on both axes and
   the two axes are independent of each other. */
const F = (name, ch, n) => ({ name: name, ch: ch, n: n });
export const JIT = 9;                            /* nine placements per axis */

export const R_GROUND = [];
for (let i = 0; i < 4; i++) {
  R_GROUND.push(F('x' + i, i * 3, JIT), F('y' + i, i * 3 + 1, JIT), F('c' + i, i * 3 + 2, 7));
}

export const R_ROCK = [
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

export const R_PATH = [
  F('ax', 0, JIT), F('ay', 1, JIT),              /* two scuffs of dark grit */
  F('bx', 2, JIT), F('by', 3, JIT),
  F('cx', 4, JIT), F('cy', 5, JIT),              /* two of pale grit        */
  F('dx', 6, JIT), F('dy', 7, JIT),
  F('kx', 8, JIT), F('ky', 9, JIT),              /* a crack in the hardpack */
  F('px', 10, JIT), F('py', 11, JIT),            /* the odd pebble          */
  F('peb', 12, 5)
];

export const R_WATER = [
  F('sw', 0, 5),                                 /* how high the swell sits */
  F('ax', 1, JIT), F('ay', 2, JIT),              /* two ripple bands        */
  F('bx', 3, JIT), F('by', 4, JIT),
  F('foam', 5, 5), F('glint', 6, 7),
  F('reflOn', 7, 3),                             /* whether this tile carries a broken reflection */
  F('reflX', 8, JIT), F('reflW', 9, 5),          /* where along the shore it sits, how wide     */
  F('feat', 10, 8),                              /* 0-4 nothing, 5 a rising fish, 6 weed, 7 a bird */
  F('fx', 11, JIT), F('fy', 12, JIT)             /* where that feature sits in the tile          */
];

/* The wave's own axis, not a grid square: one crest height per step along
   whichever direction the swell travels, so a lake's surface moves as one
   continuous swell rather than as forty tiles each rolling on their own. `dir`
   is only ever read at i=0 — it is a per-map constant, not a position — and it
   is a declared channel of this same recipe rather than a second one so there
   is exactly one place `tile_check.js` has to know about the wave. */
export const R_WAVE = [
  F('h', 0, 9),                                  /* the crest's own irregularity  */
  F('dir', 1, 2)                                 /* which axis the swell runs along */
];

export const R_EDGE = [
  F('ax', 0, JIT), F('ay', 1, JIT),              /* two ripple bands        */
  F('bx', 2, JIT), F('by', 3, JIT),
  F('fx', 4, JIT), F('gx', 5, JIT),              /* breaks in the foam seam */
  F('sx', 6, JIT), F('sy', 7, JIT)               /* a stone on the bank     */
];

export const R_SOIL = [                                 /* standing water in a furrow */
  F('ax', 0, JIT), F('ay', 1, JIT), F('bx', 2, JIT), F('by', 3, JIT)
];

/* The one stream that is not indexed by a grid square. A shore's foam used to
   break per tile, which drew a visible 40px rhythm along any straight stretch
   of it; the breaks come off the distance *along the seam* now, so a run of
   shore is one line of surf however many tiles it crosses. Indexed by that
   distance in `i`, with y pinned to 0 — still the same hash, still salted per
   map, and still declared here so `tile_check.js` tests it. */
export const R_SEAM = [
  F('foam', 0, 5),                               /* where the surf breaks   */
  F('crest', 1, 7)                               /* and where it catches    */
];

/* The other stream that is not indexed by a grid square. The treeline is a
   continuous strip rather than a row of stamped tiles (see forest.js), so its
   trees are indexed by distance *along* the band and by which depth layer
   they belong to — `x` is the step index along the band, `y` is the layer.
   Nothing on a 40px cadence, which is the entire point of it. */
export const R_TREE = [
  F('gap', 0, 8),                                /* how far to the next one */
  F('sp', 1, 12),                                /* which species           */
  F('h', 2, 7), F('w', 3, 5),                    /* how tall, how wide      */
  F('lean', 4, 5), F('d', 5, 7),                 /* which way, how far back */
  F('lit', 6, 4), F('br', 7, 6)                  /* catching light; brush   */
];

/* The descent. Every "is this square rock, does this drift wander, does this
   face of it carry ore" decision a generated gruva floor makes (see mine.js),
   in one recipe, so the layout comes out of the same declared, tested field
   the art does rather than out of a Math.random nobody can check.

   Read at a grid square for the per-tile decisions and — the way R_SEAM and
   R_WAVE already are — at (i, 0) for the per-chamber ones, where `i` is the
   chamber's index rather than a position. It is one recipe either way, so
   there is exactly one table `tile_check.js` has to know about.

   Every modulus here is small for the reason stated below the recipes: 11232
   tiles split sixteen ways resolves to about 11% of flat, and split
   sixty-four ways to about 27%, which is over the check's own tolerance. A
   decision that wants finer resolution than sixteen takes it as a priority
   class and breaks the tie on something else — see `veinScore` in mine.js. */
export const R_MINE = [
  F('cave', 0, 16),                              /* natural rock, or opened  */
  F('wob', 1, JIT), F('turn', 2, 4),             /* how a drift wanders      */
  F('rx', 3, JIT), F('ry', 4, JIT),              /* where a chamber sits     */
  F('rw', 5, 6), F('rh', 6, 5),                  /* and how big it is        */
  F('vein', 7, 16),                              /* which faces carry ore    */
  F('rich', 8, 12),                              /* and which of those are Q */
  F('gem', 9, 12),                               /* a crystal, deep enough   */
  F('blok', 10, 16),                             /* a fallen block           */
  F('prop', 11, 8)                               /* the old crew's gear      */
];

/* One block per glyph, so a fir and a birch on one square do not make the
   same decision twice. */
const OBJ_BASE = 128, OBJ_SPAN = 16;   /* 16 channels a glyph, 10 the most used */
export const objBase = c => OBJ_BASE + c.charCodeAt(0) * OBJ_SPAN;
export const R_OBJ = {
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
  /* `chim`: which roof column carries the stack; `lit`: when its fire goes on */
  'R': [F('ax', 0, JIT), F('ay', 1, JIT), F('bx', 2, JIT), F('by', 3, JIT),
        F('cx', 4, JIT), F('cy', 5, JIT), F('fx', 6, JIT), F('fy', 7, JIT),
        F('chim', 8, 7), F('lit', 9, 5)]
};

/* where each recipe starts in the channel space. MINE_CH_BASE sits in the gap
   between the tree band and the first glyph block at 128. */
export const GROUND_BASE = 0, ROCK_BASE = 16, PATH_BASE = 40, WATER_BASE = 56,
             EDGE_BASE = 72, SOIL_BASE = 80, SEAM_BASE = 84, WAVE_BASE = 88,
             TREE_BASE = 96, MINE_CH_BASE = 104;

