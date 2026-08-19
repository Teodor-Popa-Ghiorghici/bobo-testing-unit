/* Bekkedal — where the water meets the land.
 *
 * `waterEdgeTile` used to be a hardcoded stack, top to bottom: deep water, a
 * `C(3)` band down to y+16, a `C(9)` band down to y+8, ripples, a white foam
 * line at exactly py+28, sand at py+30, bank at py+34. It had no idea where
 * the water was. Every `~` on every map — north shore, south shore, cove,
 * inlet, corner — drew that same north-facing profile, and on the lake, whose
 * water is to the *south*, the sand was in the water.
 *
 * The fix is not four rotations of the art. Four rotations is four times the
 * drawing to maintain, four chances to get one wrong, and it still has
 * nothing to say about the corners — which are most of a coastline. The
 * profile is authored **once**, as a one-dimensional function of distance
 * from the waterline, and `autotile.js` samples it along whichever direction
 * the neighbours say the land lies. One drawing, any orientation, and the
 * corners fall out of the sampling rather than out of a case table.
 *
 * Two more things the old tile could not do, both nearly free once the
 * profile is a function:
 *
 *   - The seam is continuous. Foam breaks used to be placed from
 *     `edgeVar(map, x, y)` — per tile — so the foam line restarted at every
 *     tile boundary and a straight shore showed a visible 40px rhythm. They
 *     come off the world position *along the seam* now, so a stretch of shore
 *     is one line of surf with breaks wherever they happen to fall.
 *   - The tide breathes. The foam band's position oscillates on a slow cycle,
 *     which costs a sine and is the single most convincing thing you can add
 *     to water.
 *
 * Most of this is static and lives in the terrain cache: the neighbour mask
 * does not change while you are standing on a map, so it is computed once at
 * rebuild and the bands are rasterised once. Only the foam and the ripples
 * are redrawn per frame, and only where they actually land.
 */
import { WAT, SAN, SOI, STO, GRASS, SNO } from './palette.js';
import { profileT, maskNormal, mask4 } from './autotile.js';
import { isWater, isShoreLand } from './surface.js';
import { BEK_T, BEK_COLS, BEK_ROWS } from './data.js';

/* How far into a shore tile the land reaches. The rest is water, which puts
   the waterline a third of the way in. It matches BANK_REACH below, which is
   how much beach a plain land tile beside plain water gets — the two have to
   agree or a `~` next to a `g` steps its waterline four pixels sideways. */
const LAND_REACH = 8;
/* the cell the profile is rasterised on: two device pixels, which is the art
   scale, so nothing lands on a half pixel and a straight band still collapses
   to one fillRect per row */
const CELL = 2;

/* ---- the profile, as a function of one number ----------------------------
   `t` is the signed distance from the waterline in device pixels: positive
   toward the land, negative into the water. Author it here and nowhere else. */
export function shoreBand(t) {
  if (t >= 8)  return SOI[2];          /* the bank, turning into the map      */
  if (t >= 5)  return SAN[2];          /* dry sand, up where the tide misses  */
  if (t >= 1)  return SAN[1];
  if (t >= -2) return SAN[0];          /* wet sand, dark and packed           */
  if (t >= -6) return WAT[4];          /* the last few inches of water        */
  if (t >= -14) return WAT[3];
  /* and it stops there. A shore tile is shallow by definition, so its far
     edge must not be *darker* than the deep tile beyond it — which is what
     running the profile all the way down to WAT[1] did, and it drew a navy
     band around the inside of every pond with lighter water past it. */
  return WAT[2];
}
/* where the surf sits, and how wide it runs */
const FOAM_T = -1.5, FOAM_W = 2.2;
/* How far the waterline is allowed to wander off the exact offset curve. A
   beach that is the tile's own outline pushed inward by a constant is a
   picture frame; two pixels of wander taken from the position *along* the
   shore turn it back into a coastline, and because it comes off the declared
   seam stream it is the same two pixels on every reload and the static and
   the live halves agree about where the water is. */
const WANDER = 2.4;

export function createShore(A) {
  /* A.fill(col, x, y, w, h) — device pixels, inside a native() block
     A.seam(i)               — noise.js's declared seam stream, indexed by
                               distance along the shore rather than by tile
     A.wash(x, y, w, h, col, s) — the ordered stipple, already inside native()
     A.spot(i, span, size)   — the shared step-index-to-position helper
     A.tileAt(x, y)          — the glyph at a grid square on the current map */

  let masks = null, wet = null, ready = '';
  /* The seam stream is asked about the same handful of indices hundreds of
     times a frame — once per rasterised cell — and `seamVar` allocates an
     object and hashes twice for each. There are about a hundred distinct
     indices across a map, so memoise them and the live pass stops being
     dominated by garbage. Cleared with the rest of the per-map state. */
  let seamMemo = new Map();
  function crestAt(i) {
    let v = seamMemo.get(i);
    if (v === undefined) { v = A.seam(i).crest; seamMemo.set(i, v); }
    return v;
  }
  function foamAt(i) {
    let v = seamMemo.get(~i);
    if (v === undefined) { v = A.seam(i).foam; seamMemo.set(~i, v); }
    return v;
  }

  /* Once per cache rebuild. Everything after this is a lookup. */
  function prepare(key) {
    if (key === ready) return;
    ready = key;
    seamMemo = new Map();
    masks = new Uint8Array(BEK_COLS * BEK_ROWS);
    wet = new Uint8Array(BEK_COLS * BEK_ROWS);
    const land = (x, y) => isShoreLand(A.tileAt(x, y));
    const water = (x, y) => isWater(A.tileAt(x, y));
    for (let y = 0; y < BEK_ROWS; y++) for (let x = 0; x < BEK_COLS; x++) {
      masks[y * BEK_COLS + x] = mask4(land, x, y);      /* which way the land is  */
      wet[y * BEK_COLS + x] = mask4(water, x, y);       /* and which way the water */
    }
  }
  const maskOf = (x, y) => masks[y * BEK_COLS + x];
  const wetOf = (x, y) => wet[y * BEK_COLS + x];

  /* Everything below asks this rather than `profileT` directly, so the sand,
     the surf and the ripples are all measuring from the same waterline. */
  const wanderAt = (n, seam0, lx, ly) =>
    (crestAt(Math.floor((seam0 + lx * -n[1] + ly * n[0]) / 9)) - 3) * (WANDER / 3);
  function shoreAt(m, n, seam0, lx, ly, reach) {
    return profileT(m, lx, ly, BEK_T, reach == null ? LAND_REACH : reach) +
           wanderAt(n, seam0, lx, ly);
  }
  const seamOrigin = (x, y, n) => (x * BEK_T) * -n[1] + (y * BEK_T) * n[0];

  /* ---- the shore tile, cached ---------------------------------------------
     Rasterised on CELL-sized cells and run-length collapsed along x, so a
     straight north or south shore still costs one fillRect per row and only
     a corner pays for the curve it is drawing. */
  /* One scan, run-length collapsed along x, so a straight shore still costs a
     fillRect per row and only a corner pays for the curve it is drawing.
     `bandOf(t)` returns a palette index or -1 for "leave what is underneath". */
  function scan(x, y, m, reach, bandOf) {
    const px = x * BEK_T, py = y * BEK_T;
    const n = maskNormal(m), seam0 = seamOrigin(x, y, n);
    for (let ly = 0; ly < BEK_T; ly += CELL) {
      let runCol = -2, runX = 0;
      for (let lx = 0; lx <= BEK_T; lx += CELL) {
        const col = lx < BEK_T
          ? bandOf(profileT(m, lx, ly, BEK_T, reach), wanderAt(n, seam0, lx, ly)) : -3;
        if (col === runCol) continue;
        if (runCol >= 0) A.fill(runCol, px + runX, py + ly, lx - runX, CELL);
        runCol = col; runX = lx;
      }
    }
  }

  /* Inside a `~` the waterline is somewhere in the middle of the tile, so it
     is free to wander and does. On a plain `g`-against-`W` boundary it is not:
     the water starts where the next tile starts, and moving it would put sand
     in the water or water on the grass. So the two halves wander different
     things — the shore tile moves its waterline, and the bank moves how far
     the sand runs *up* the beach, which is free to move and gives the same
     broken-up coastline without lying about where the water is. */
  function ground(x, y) { scan(x, y, maskOf(x, y), LAND_REACH, (t, w) => shoreBand(t + w)); }

  /* ---- the shoreline the maps actually have --------------------------------
     Only the lake and the fjord carry `~` at all, and between them there are
     ten tiles of it: most of this valley's coastline is a `g` sitting flat
     against a `W`, which before this drew as a hard vertical cut with no
     waterline anywhere in it. Neither side of that boundary is a shore tile,
     so neither can be given the full profile — but both can be given their
     own half of it, sampled the same way and meeting at the tile edge.

     The land side gets a short strip of wet bank and sand along whichever
     edges face water; the water side gets the shallows grading out. The
     waterline lands exactly on the boundary, which is where it belongs. */
  const BANK_REACH = 7;
  const bankBand = (t, w) => (t <= 0 ? -1 : shoreBand(Math.max(-1, BANK_REACH + w - t)));
  const shallowBand = t => shoreBand(t);

  function bank(x, y) {
    const wm = wetOf(x, y);
    if (wm) scan(x, y, wm, BANK_REACH, bankBand);
  }
  /* A water tile that touches land: the shallows, in place of the flat depth
     fill. Reach -1 puts the waterline one pixel inside the water tile, so the
     surf has something to break on and the first row of the water is wet sand
     — which is what the edge of a lake looks like, and it makes the two
     halves of the boundary meet instead of butting. */
  const NEAR_REACH = -1;
  function nearShore(x, y) { scan(x, y, maskOf(x, y), NEAR_REACH, shallowBand); }

  /* the stones and the scuffed grass a bank actually has, placed off the tile
     hash the way every other decorative mark in this game is */
  function detail(x, y, v) {
    const px = x * BEK_T, py = y * BEK_T, m = maskOf(x, y);
    const n = maskNormal(m), seam0 = seamOrigin(x, y, n);
    const put = (col, sx, sy, w, h) => {
      if (shoreAt(m, n, seam0, sx, sy) < 3) return;             /* only up the beach */
      A.fill(col, px + sx, py + sy, w, h);
    };
    put(STO[2], A.spot(v.sx, BEK_T, 2), A.spot(v.sy, BEK_T, 2), 2, 2);
    put(SOI[1], A.spot(v.bx, BEK_T, 2), A.spot(v.ax, BEK_T, 1), 2, 1);
    put(GRASS[1], A.spot(v.gx, BEK_T, 1), A.spot(v.by, BEK_T, 2), 1, 2);
  }

  /* ---- what moves ---------------------------------------------------------
     Ripples drift along the shore's own normal rather than always down the
     screen, and the surf's position breathes on a slow cycle keyed to the
     world position along the seam — so a long shore is one line of moving
     water and not forty separate tiles of it. */
  function live(x, y, t, v, reach) {
    const px = x * BEK_T, py = y * BEK_T, m = maskOf(x, y);
    if (!m) return;                                     /* open water: nothing to break on */
    const R = reach == null ? LAND_REACH : reach;
    const n = maskNormal(m), seam0 = seamOrigin(x, y, n);
    /* the tide, in and out. Keyed to the position along the seam rather than
       to the tile, so a long shore breathes as one shore. */
    const tide = FOAM_T + Math.sin(t * 0.55 + seam0 * 0.012) * 1.9;
    /* How far in from a named edge the surf can possibly reach at this tide.
       Everything past it is open water with nothing to break on, and on a
       plain `W`-against-`g` boundary that is 35 of the 40 pixels — so testing
       for it first turns four hundred profile evaluations a tile into fifty. */
    const lim = R - (tide - FOAM_W) + WANDER;
    const edgeDist = (lx, ly) => {
      let d = 1e9;
      if ((m & 1) && ly < d) d = ly;
      if ((m & 4) && BEK_T - 1 - ly < d) d = BEK_T - 1 - ly;
      if ((m & 8) && lx < d) d = lx;
      if ((m & 2) && BEK_T - 1 - lx < d) d = BEK_T - 1 - lx;
      return d;
    };

    for (let ly = 0; ly < BEK_T; ly += CELL) {
      let run = -1, runX = 0;
      for (let lx = 0; lx <= BEK_T; lx += CELL) {
        let want = 0;
        if (lx < BEK_T && edgeDist(lx, ly) <= lim) {
          const tt = shoreAt(m, n, seam0, lx, ly, R);
          if (tt <= tide + FOAM_W && tt >= tide - FOAM_W) {
            /* a break in the surf, decided by where along the seam this is
               and not by which tile it fell in */
            const seam = seam0 + lx * -n[1] + ly * n[0];
            if (foamAt(Math.floor(seam / 7))) want = tt < tide ? 2 : 1;
          }
        }
        if (want === run) continue;
        if (run > 0) A.fill(run === 1 ? SNO[1] : WAT[5], px + runX, py + ly, lx - runX, CELL);
        run = want; runX = lx;
      }
    }

    /* Two short ripple bands, placed off the tile's own hash and drifting in
       along the shore's normal. They used to be iso-contours of the profile,
       which drew concentric rings around a pond and made the lake read as a
       contour map — a dash that happens to be near the shore reads as water,
       a line that follows the shore exactly reads as a drawing of it. */
    const dr = Math.sin(t * 0.9) * 3;
    const band = (sx, sy, w, sign) => {
      const ox = px + sx + n[0] * dr * sign, oy = py + sy + n[1] * dr * sign;
      if (shoreAt(m, n, seam0, ox - px, oy - py, R) > -5) return;
      A.fill(WAT[4], Math.round(ox), Math.round(oy), w, CELL);
    };
    band(A.spot(v.ax, BEK_T, 12), A.spot(v.ay, BEK_T, 2), 12, 1);
    band(A.spot(v.bx, BEK_T, 8), A.spot(v.by, BEK_T, 2), 8, -1);
  }

  return { prepare: prepare, ground: ground, detail: detail, live: live,
           bank: bank, nearShore: nearShore, maskOf: maskOf, wetOf: wetOf };
}
