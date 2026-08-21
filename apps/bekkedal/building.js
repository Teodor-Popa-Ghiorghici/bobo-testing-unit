/* Bekkedal — a house, seen from three-quarters on.
 *
 * What a building used to be: `tileDetail` drew `'R'` as two flat bands of one
 * colour, `'H'` as three horizontal lines at y+6, y+13 and y+18, and `'D'` as a
 * 12x17 slab with a two-pixel handle — each at a fixed offset inside its own
 * tile, each byte-identical on every square it appeared on, in every map, at
 * every hour. Stack three rows of that and you get a rectangle of roof seen
 * from directly above with a window glyph on it: no pitch, no eaves, no front
 * wall, no foundation, no door you can read as a door, no chimney. It is the
 * single largest reason the town does not read as a town.
 *
 * The map data already says what a building is, and says the same thing in all
 * twelve of them, from the farm to the house you build by the water:
 *
 *     RRRRR      one row of roof
 *     HHHHH      the upper wall course
 *     HHDHH      the lower one, with the door in it
 *
 * So a building is a vertical stack, and the elevation is authored **once**, as
 * a function of one number — exactly the way `shore.js` authors the beach once
 * as a function of signed distance from the waterline. `wallBand(v)` takes the
 * device-pixel distance below the eave line, `roofBand(u)` the distance below
 * the ridge, and each tile draws its own forty-pixel slice of that one drawing.
 * Four hand-drawn variants would have been four things to maintain, four
 * chances to get one wrong, and would still have said nothing about a gable.
 *
 * Three things fall out of authoring it in *building* space rather than tile
 * space, and none of them was available before:
 *
 *   - The courses run continuously across the seam between the two wall rows.
 *     That is what removes the tiled reading, the same way `interior.js`'s
 *     floorboards coming off world position removed it indoors. The rhythm is
 *     the same 12px one `interior.wall` uses, because it is the same wall seen
 *     from the other side.
 *   - A window can be 28px tall and sit across that seam, drawn in two pieces
 *     by two tiles that never have to agree about anything but where the eave
 *     is. The door does it upward: it is drawn by the `D` tile and rises into
 *     the `H` above, which is what makes it a door rather than a hatch.
 *   - The eave's shadow, the plinth and the ground line are stated once, as
 *     distances, instead of as offsets in whichever tile they happen to land.
 *
 * The horizontal half comes from `autotile.js`'s neighbour mask, which is what
 * tells a tile it is a gable end — the log ends cross at the corner, the wall
 * face steps back so the roof visibly overhangs it — rather than a middle
 * course. Vertical from the field, horizontal from the mask, and no table of
 * sixteen cases anywhere to get one entry of wrong.
 *
 * Walkability is not this file's business and it does not touch it: `solid()`
 * reads `BEK_SOLID` against the glyph, no glyph moved, and every square answers
 * exactly as it did before.
 */
import { MARKS, SHADOWS, FEATURES } from './palette_marks.js';
import { mask4, AT_E, AT_W } from './autotile.js';
import { createRoof, TURF, TILE } from './roof.js';
import { rustic } from './surface.js';
import { BEK_T } from './data.js';

/* ---- the two dressings ----------------------------------------------------
   One silhouette, two materials, so you can tell where you are by looking: log
   walls under turf out on the farms and at the water, painted board under dark
   tile in the town. The paint is `WAR` because falu red is iron oxide and the
   emission ramp's bottom step already *is* that paint — there is no second red
   anywhere in this file. Every entry below is a step of a table declared in
   palette.js, so the check reads the colours the art draws.

   `course` is the rhythm in device pixels: 12 for a log, which is
   `interior.wall`'s own, and 7 for a weatherboard, which is a thinner thing. */
const W_LOG = MARKS.WALL_LOG.cols, W_BRD = MARKS.WALL_BOARD.cols;
const LOG = { course: 12, lit: W_LOG[0], body: W_LOG[1], gap: W_LOG[2],
              deep: SHADOWS.EAVE_LOG.cols[0], shade: SHADOWS.EAVE_LOG.cols[1],
              plinth: MARKS.PLINTH_LOG.cols[0], plinthTop: MARKS.PLINTH_LOG.cols[1],
              trim: FEATURES.TRIM_LOG.cols, glass: MARKS.WINDOW_LOG.cols, log: 1 };
const BOARD = { course: 7, lit: W_BRD[0], body: W_BRD[1], gap: W_BRD[2],
                deep: SHADOWS.EAVE_BOARD.cols[0], shade: SHADOWS.EAVE_BOARD.cols[1],
                plinth: MARKS.PLINTH_BOARD.cols[0], plinthTop: MARKS.PLINTH_BOARD.cols[1],
                trim: FEATURES.TRIM_BOARD.cols, glass: FEATURES.WINDOW_BOARD.cols, log: 0 };
/* how hard under the overhang, how far the shade reaches down the wall, how
   tall the plinth is, and how far the wall steps back at a gable */
const EAVE_DEEP = 2, EAVE_SHADE = 7, PLINTH = 9, RETURN_W = 4;
/* the window and the door, in building space: distance below the eave line */
const WIN_T = 22, WIN_H = 28, WIN_W = 22, DOOR_H = 46, DOOR_W = 22;

/* ---- the elevation, as a function of one number ---------------------------
   `v` is the device-pixel distance below the eave line, `h` the whole wall,
   eave to ground. Author it here and nowhere else. */
export function wallBand(v, h, M) {
  if (v < EAVE_DEEP) return M.deep;               /* hard under the overhang  */
  if (v < EAVE_SHADE) return M.shade;             /* the wall still in shade  */
  const foot = h - v;
  if (foot <= 2) return M.deep;                   /* where it meets the earth */
  if (foot <= PLINTH - 3) return M.plinth;        /* the stone the sill sits on */
  if (foot <= PLINTH) return M.plinthTop;
  const p = (v - EAVE_SHADE) % M.course;
  if (p < 2) return M.lit;                        /* the top of a log, caught */
  if (p >= M.course - 2) return M.gap;            /* and the joint under it   */
  return M.body;
}

export function createBuilding(A) {
  /* A.fill(col, x, y, w, h)     — device pixels, inside a native() block
     A.wash(x, y, w, h, col, s)  — the ordered stipple, likewise
     A.tileAt(x, y)              — the glyph at a grid square
     A.obj(c, x, y)              — noise.js's declared per-glyph streams
     A.map()                     — which map, so the dressing can be chosen
     A.dark()                    — how dark it is out: lit windows, and smoke
     A.cols() / A.rows()         — how big this map is, in tiles */

  const isB = (x, y) => { const c = A.tileAt(x, y); return c === 'H' || c === 'R' || c === 'D'; };

  /* ---- the field -----------------------------------------------------------
     Where a tile sits inside its own building, taken once per rebuild and read
     per tile after that. `eave` is the row the roof stops at, `sole` the row
     the wall stands on, both found by walking this tile's own column — so a
     taller building, or a second row of roof, needs no new rule. `chim` is the
     one column of a roof run that carries a stack. */
  let ridge = null, eave = null, sole = null, msk = null, chim = null, ready = '';
  let cols = 0, rows = 0;
  function prepare(key) {
    if (key === ready) return;
    ready = key;
    cols = A.cols(); rows = A.rows();
    const n = cols * rows;
    ridge = new Int16Array(n); eave = new Int16Array(n);
    sole = new Int16Array(n); msk = new Uint8Array(n); chim = new Uint8Array(n);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (!isB(x, y)) continue;
      let t = y; while (t > 0 && isB(x, t - 1)) t--;
      let e = t; while (e < rows && A.tileAt(x, e) === 'R') e++;
      let b = y; while (b + 1 < rows && isB(x, b + 1)) b++;
      const i = y * cols + x;
      ridge[i] = t; eave[i] = e; sole[i] = b + 1; msk[i] = mask4(isB, x, y);
      /* One stack per building, and found without a flood fill: a roof row is
         a horizontal run, so walk it to its ends and pick a column inside it
         off a declared channel rolled at the run's own origin. Every tile of
         the run computes the same origin, so every tile agrees. */
      if (A.tileAt(x, y) !== 'R' || A.tileAt(x, y - 1) === 'R') continue;
      let a = x; while (A.tileAt(a - 1, y) === 'R') a--;
      let z = x; while (A.tileAt(z + 1, y) === 'R') z++;
      const run = z - a + 1;
      if ((run < 3 ? a : a + 1 + (A.obj('R', a, y).chim % (run - 2))) === x) chim[i] = 1;
    }
  }

  const dress = () => (rustic(A.map()) ? LOG : BOARD);

  /* ---- one profile, one fillRect per band ----------------------------------
     Every band is the full width of the tile, so a wall tile costs about eight
     rects and not forty. The corners, the window and the door go over the top
     of it. */
  function bands(px, py, v0, span, M, fn) {
    let run = -1, runY = 0;
    for (let ly = 0; ly <= BEK_T; ly++) {
      const col = ly < BEK_T ? fn(v0 + ly, span, M) : -1;
      if (col === run) continue;
      if (run >= 0) A.fill(run, px, py + runY, BEK_T, ly - runY);
      run = col; runY = ly;
    }
  }

  /* ---- the corner ----------------------------------------------------------
     A laftehus is notched at the corners and the log ends stand proud of the
     wall; a painted house has a board over the joint, and on falu red that
     board is white, which is the most recognisable thing about the building.
     Both come off the mask, and both stay inside their own tile: the roof
     overhangs because the *wall* steps back here, never because the roof
     reaches into a neighbour that would be repainted over it a moment later. */
  function corner(px, py, v0, hh, M, side) {
    const x0 = side < 0 ? 0 : BEK_T - RETURN_W;
    const a = Math.max(0, EAVE_DEEP - v0), b = Math.min(BEK_T, hh - PLINTH - v0);
    if (b <= a) return;
    A.fill(M.deep, px + x0, py + a, RETURN_W, b - a);
    if (!M.log) {
      A.fill(M.trim[0], px + (side < 0 ? 1 : BEK_T - RETURN_W), py + a, RETURN_W - 1, b - a);
      A.fill(M.trim[1], px + (side < 0 ? 1 : BEK_T - 2), py + a, 1, b - a);
      return;
    }
    for (let ly = a; ly < b; ly++) {
      const v = v0 + ly;
      if (v < EAVE_SHADE || (v - EAVE_SHADE) % M.course !== 2) continue;
      const w = RETURN_W - (Math.floor((v - EAVE_SHADE) / M.course) & 1);
      const lx = side < 0 ? 0 : BEK_T - w;
      A.fill(M.trim[0], px + lx, py + ly, w, Math.min(M.course - 4, b - ly));
      A.fill(M.trim[1], px + lx, py + ly, w, 1);
    }
  }

  /* ---- a window, authored in building space --------------------------------
     Which columns carry one is rolled at the *eave* row rather than per tile,
     so both wall courses agree and the opening can be taller than either of
     them. `lightSources` asks `windowAt` for that same answer, so a window
     that is drawn is a window that lights and there is no second table saying
     where they are. */
  function windowAt(x, y) {
    if (!msk || !isB(x, y) || A.tileAt(x, y) === 'R') return null;
    const i = y * cols + x, e = eave[i];
    /* Three columns in five. It was two in five per *tile* before, which over
       two courses came out as five scattered openings on a six-tile house and
       none at all on the fjord's — a wall is now one column's worth of
       decision instead of two, so the rate has to rise to keep a house
       looking lived in, and every building the valley has ends up with at
       least one window. */
    if (A.obj('H', x, e).win >= 3) return null;
    for (let k = e; k < sole[i]; k++) if (A.tileAt(x, k) === 'D') return null;
    /* the middle of the opening, as a fraction of a tile below the eave row */
    return { y: e, dy: (WIN_T + WIN_H / 2) / BEK_T };
  }

  function windowOn(px, py, v0, M, lit) {
    const x0 = (BEK_T - WIN_W) >> 1, L = FEATURES.WINDOW_LIT.cols;
    const put = (col, wy, wh, wx, ww) => {
      const a = Math.max(0, wy - v0), b = Math.min(BEK_T, wy + wh - v0);
      if (b > a) A.fill(col, px + wx, py + a, ww, b - a);
    };
    put(M.deep, WIN_T - 1, WIN_H + 2, x0 - 1, WIN_W + 2);         /* the reveal  */
    put(M.trim[0], WIN_T, WIN_H, x0, WIN_W);                      /* the frame   */
    put(lit ? L[1] : M.glass[0], WIN_T + 3, WIN_H - 8, x0 + 3, WIN_W - 6);
    put(lit ? L[0] : M.glass[1], WIN_T + 3, 3, x0 + 3, WIN_W - 6);  /* sky in it */
    put(M.trim[1], WIN_T + 12, 2, x0 + 3, WIN_W - 6);             /* glazing bar */
    put(M.trim[1], WIN_T + 3, WIN_H - 8, x0 + 10, 2);
    put(M.trim[1], WIN_T + WIN_H - 5, 4, x0 - 2, WIN_W + 4);      /* the sill    */
    put(M.deep, WIN_T + WIN_H - 1, 2, x0 - 1, WIN_W + 2);         /* under it    */
  }

  /* ---- the door ------------------------------------------------------------
     Drawn by the `D` tile and rising into the `H` above it. The detail pass
     runs top to bottom, so that tile is already laid down and the door wins —
     which is the whole reason it can be taller than a tile, and so the whole
     reason it reads as a door. It stands on the sill beam at the top of the
     plinth, which the profile above has already put at a known height. */
  function door(px, py, M) {
    const x0 = (BEK_T - DOOR_W) >> 1, bot = BEK_T - PLINTH, top = bot - DOOR_H;
    const B = MARKS.DOOR_BOARD.cols, J = SHADOWS.DOOR_JOINT.cols, I = FEATURES.DOOR_IRON.cols;
    A.fill(J[1], px + x0 - 4, py + top - 1, DOOR_W + 8, bot - top + 2);
    A.fill(M.trim[0], px + x0 - 3, py + top, DOOR_W + 6, bot - top);      /* the frame */
    A.fill(J[0], px + x0 - 1, py + top + 2, DOOR_W + 2, bot - top - 2);
    for (let bx = 0; bx < DOOR_W; bx += 5) {
      A.fill(B[(bx / 5) & 1], px + x0 + bx, py + top + 3, 4, bot - top - 3);
      A.fill(J[0], px + x0 + bx + 4, py + top + 3, 1, bot - top - 3);
    }
    A.fill(B[2], px + x0, py + top + 3, DOOR_W, 1);                       /* the head  */
    A.fill(I[0], px + x0 + 1, py + top + 7, DOOR_W - 2, 2);               /* two hinges */
    A.fill(I[0], px + x0 + 1, py + bot - 9, DOOR_W - 2, 2);
    A.fill(I[1], px + x0 + DOOR_W - 6, py + bot - 20, 3, 3);              /* the handle */
    /* the threshold, and the worn step down off it */
    A.fill(M.plinthTop, px + x0 - 4, py + bot, DOOR_W + 8, 3);
    A.fill(M.plinth, px + x0 - 6, py + bot + 3, DOOR_W + 12, 3);
    A.fill(M.deep, px + x0 - 6, py + bot + 6, DOOR_W + 12, 1);
  }

  /* The other half of the profile, from the ridge to the eave, plus the two
     things that stand on it. It is handed `bands` rather than importing it
     back the other way, so the dependency runs one direction only. */
  const Roof = createRoof(A, bands);

  /* ---- what index.js calls ------------------------------------------------- */
  function tile(c, x, y) {
    if (!msk || !isB(x, y)) return;
    const i = y * cols + x, px = x * BEK_T, py = y * BEK_T, m = msk[i];
    const eaveY = eave[i] * BEK_T, gW = !(m & AT_W), gE = !(m & AT_E);
    if (c === 'R') {
      const rY = ridge[i] * BEK_T;
      Roof.tile(px, py, py - rY, eaveY - rY, rustic(A.map()) ? TURF : TILE,
                gW, gE, chim[i], A.obj('R', x, y), A.spot);
      return;
    }
    const M = dress(), hh = sole[i] * BEK_T - eaveY, v0 = py - eaveY;
    bands(px, py, v0, hh, M, wallBand);
    if (gW) corner(px, py, v0, hh, M, -1);
    if (gE) corner(px, py, v0, hh, M, 1);
    if (c === 'D') { door(px, py, M); return; }
    if (windowAt(x, y)) windowOn(px, py, v0, M, A.dark() > 0.12);
  }

  /* Only a roof tile that carries a stack has anything live about it; every
     other one is entirely in the cache and this is one array read. */
  function smoke(x, y, t) {
    if (msk && chim[y * cols + x]) Roof.smoke(x, y, t, A.obj('R', x, y));
  }

  return { prepare: prepare, tile: tile, smoke: smoke, windowAt: windowAt };
}
