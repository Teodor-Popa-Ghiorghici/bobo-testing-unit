/* Bekkedal — the middle of the lake.
 *
 * Deep water used to be `g.fillStyle = C(1)` — one flat blue over every tile
 * of it, so the fjord and the lake were both a single rectangle of colour
 * with a few ripples on top and no sense of depth at all.
 *
 * What it costs to fix is one breadth-first sweep. `distanceField` gives every
 * tile its distance from the nearest land, and the ramp is read off that, so
 * the water falls away from the shore and the middle of a lake is the darkest
 * part of it. Two things make that read as depth rather than as a staircase:
 * the field is smoothed over the neighbours before it is used, and each tile
 * is graded across itself and the fractional step dithered — an integer field
 * steps a whole ramp entry at a tile boundary, and a lake made of flat
 * rectangles of blue is exactly what that looks like.
 *
 * That was the ramp. It said nothing about the *surface* — no motion, no
 * reflection, nothing in it — where the shoreline a few tiles away carries a
 * breathing tide and continuous surf. This file brings the same standard
 * further out, in the same shape shore.js already set:
 *
 *   - a swell, off a declared noise channel indexed along the wave's own
 *     axis (`waveVar`) rather than per tile, the same reasoning that made
 *     the surf continuous instead of restarting at every tile boundary;
 *   - a reflection, for the tiles just past the shore where the depth ramp
 *     is still shallow enough for a solid shape to throw one — broken and
 *     displaced by a declared channel, and cached, because the neighbour
 *     mask it reads does not change while you are standing on the map;
 *   - a travelling glint, warm or cool through whichever hour's table `C`
 *     is already resolving through, and absent under fog;
 *   - something in it: rings where a fish rises, weed drifting under the
 *     surface, the odd bird landing.
 *
 * All of it is still no alpha — the reflection and the glint are ordered
 * dither like everything else in this game — and all of it that does not
 * move is in the terrain cache with the depth ramp. Only the swell, the
 * glint and the life in the water are drawn per frame.
 */
import { WAT, STO, ATMO } from './palette.js';
import { MARKS, FEATURES } from './palette_marks.js';
import { distanceField } from './autotile.js';
import { isShoreLand } from './surface.js';
import { waterVar, waveVar } from './noise.js';
import { BEK_T } from './data.js';

/* Indexed by distance from land in tiles. Entry 1 is where the shore
   profile's far edge leaves off, so the two meet without a step. */
const DEEP = [WAT[3], WAT[2], WAT[1], WAT[0], WAT[0]];
/* Two sub-cells a side, not four. The field is already smoothed across the
   map, so this only halves the step *within* a tile — and a lake is two
   hundred tiles, so every extra sub-cell is another four hundred rects on the
   rebuild. Four a side measured 34ms; two measures a third of that and the
   difference is not visible under the dither. */
const SUB = 2;

const RIPPLE = MARKS.WATER_DEEP.cols;                 /* the two static ripple bands */
const REFLECT = FEATURES.WATER_REFLECT.cols;
const GLINT = FEATURES.WATER_SUN.cols;
const RING = FEATURES.WATER_RING.cols;
const WEED = FEATURES.WATER_WEED.cols;
const BIRD = FEATURES.WATER_BIRD.cols;

/* How far past the shore a reflection can still reach — past this the depth
   ramp is already dark enough that a silhouette would vanish into it, which
   is exactly what "the shallows" means here. */
const REFLECT_RANGE = 2.4;
/* One crest value every three tiles along the wave's own axis, so the swell
   has a period longer than a single tile without needing a second channel
   for it — the same trick shore.js's tide plays on `seamVar`. */
const WAVE_SCALE = BEK_T * 3;
const WAVE_SPEED = 0.6, WAVE_STEP = 1 / WAVE_SCALE;

export function createWater(A) {
  /* A.fill(col, x, y, w, h)        — device pixels, inside a native() block
     A.wash(x, y, w, h, col, str)   — the ordered stipple, likewise
     A.tileAt(x, y)                 — the glyph at a grid square
     A.spot(i, span, size)          — step index to position
     A.map()                        — the current map id
     A.weather()                    — 'klar' / 'regn' / 'take' */
  let depth = null, ready = '', waveDir = 0;

  /* The map's own size, taken once per rebuild rather than imported as a
     constant: a map is as big as its own rows and no two need agree. Everything
     below indexes `depth` by `cols`, so the two can never disagree about the
     stride. */
  let cols = 0, rows = 0;
  function prepare(key) {
    if (key === ready) return;
    ready = key;
    cols = A.cols(); rows = A.rows();
    const raw = distanceField((x, y) => isShoreLand(A.tileAt(x, y)), cols, rows, 4);
    depth = new Float32Array(cols * rows);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      let sum = 0, cnt = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        sum += raw[ny * cols + nx]; cnt++;
      }
      depth[y * cols + x] = sum / cnt;
    }
    /* Which way the swell travels is a property of the map, not of the tile —
       one crest table serves the whole lake, exactly the way one shore
       profile serves every rotation of a coastline. Rolled from the wave's
       own recipe at i=0 so tile_check.js has one channel to test rather than
       a second table just for a per-map constant. */
    waveDir = waveVar(A.map(), 0).dir;
  }

  const dAt = (x, y) => depth[(y < 0 ? 0 : y >= rows ? rows - 1 : y) * cols +
                              (x < 0 ? 0 : x >= cols ? cols - 1 : x)];

  /* ---- the reflection, cached with the ramp --------------------------------
     Anything solid at the waterline throws a broken, displaced reflection
     down into the shallows — the tiles just past the shore where the ramp is
     still light enough (WAT[2] and lighter) for a dark shape to read against
     it. The neighbour mask does not change while you are standing on the
     map, so this is computed once per rebuild along with everything else the
     ramp needs. */
  function reflection(x, y, v) {
    if (v.reflOn !== 0) return;                          /* most tiles carry none at all */
    const c = dAt(x, y);
    if (c > REFLECT_RANGE) return;
    /* which cardinal neighbour is nearest to land — the direction the thing
       being reflected must be standing in */
    let best = c, dx = 0, dy = 0;
    const w = dAt(x - 1, y), e = dAt(x + 1, y), n = dAt(x, y - 1), s = dAt(x, y + 1);
    if (w < best) { best = w; dx = -1; dy = 0; }
    if (e < best) { best = e; dx = 1; dy = 0; }
    if (n < best) { best = n; dx = 0; dy = -1; }
    if (s < best) { best = s; dx = 0; dy = 1; }
    if (!dx && !dy) return;                               /* no clear direction: the open middle */
    const px = x * BEK_T, py = y * BEK_T;
    const along = A.spot(v.reflX, BEK_T, 10);
    const w2 = 2 + (v.reflW % 3);
    const str = Math.round((REFLECT_RANGE - best) / REFLECT_RANGE * 16);
    const col = REFLECT[v.reflW % 2];
    if (dx) A.wash(px + (dx > 0 ? BEK_T - w2 : 0), py + along, w2, 6, col, str);
    else A.wash(px + along, py + (dy > 0 ? BEK_T - w2 : 0), 6, w2, col, str);
  }

  function deep(x, y) {
    const c = dAt(x, y);
    const e = (dAt(x + 1, y) + c) / 2, w = (dAt(x - 1, y) + c) / 2;
    const nn = (dAt(x, y - 1) + c) / 2, ss = (dAt(x, y + 1) + c) / 2;
    const step = BEK_T / SUB;
    for (let j = 0; j < SUB; j++) {
      const fy = (j + 0.5) / SUB, row = fy < 0.5 ? nn + (c - nn) * (fy * 2) : c + (ss - c) * ((fy - 0.5) * 2);
      for (let i = 0; i < SUB; i++) {
        const fx = (i + 0.5) / SUB;
        const side = fx < 0.5 ? w + (c - w) * (fx * 2) : c + (e - c) * ((fx - 0.5) * 2);
        /* clamped to the last ramp entry rather than just under it: open water
           is one flat fill, not a full-strength stipple of a colour over the
           same colour */
        const d = Math.min(3, Math.max(0, (row + side) / 2));
        const lo = Math.floor(d);
        const px = x * BEK_T + i * step, py = y * BEK_T + j * step;
        A.fill(DEEP[lo], px, py, step, step);
        A.wash(px, py, step, step, DEEP[lo + 1], Math.round((d - lo) * 16));
      }
    }
    reflection(x, y, waterVar(A.map(), x, y));
  }

  /* ---- what moves ----------------------------------------------------------
     The swell, the glint and the life in the water. All of it per frame, and
     all of it bounded to the one tile it is drawn on — the swell reads as one
     continuous surface only because its phase is a function of world
     position rather than of the tile, exactly the way the surf's foam breaks
     off `seamVar` rather than off `edgeVar`. */
  function swell(x, y, t) {
    const px = x * BEK_T, py = y * BEK_T;
    const proj = waveDir ? y * BEK_T : x * BEK_T;
    const i = Math.floor(proj / WAVE_SCALE);
    const h = waveVar(A.map(), i).h - 4;                  /* -4..4, the crest's own irregularity */
    const phase = t * WAVE_SPEED + proj * WAVE_STEP;
    const off = Math.round(Math.sin(phase) * (2 + h * 0.3));
    if (waveDir) A.wash(px + BEK_T / 2 + off, py, 2, BEK_T, WAT[3], 8);
    else A.wash(px, py + BEK_T / 2 + off, BEK_T, 2, WAT[3], 8);
  }

  function glint(x, y, t, v) {
    if (A.weather() === 'take') return;                  /* fog swallows the catch of light */
    const px = x * BEK_T, py = y * BEK_T, w = Math.floor(t * 2 + x + y) % 4;
    A.fill(RIPPLE[0], px + A.spot(v.ax, BEK_T, 16), py + 6 + A.spot(v.ay, 28, 2) + w * 2, 16, 2);
    A.fill(RIPPLE[1], px + A.spot(v.bx, BEK_T, 14), py + 6 + A.spot(v.by, 28, 2) - w * 2, 14, 2);
    /* the hour's own table is what makes this warm at dusk and cool at
       midnight — GLINT resolves through whichever LUT is active exactly like
       every other fill in this pass, so nothing here has to know the hour */
    if (v.foam === 0) A.fill(GLINT[0], px + A.spot(v.bx, BEK_T, 8), py + A.spot(v.ay, BEK_T, 2), 8, 2);
    if (v.glint === 3) A.fill(GLINT[1], px + A.spot(v.ax, BEK_T, 4), py + 6 + A.spot(v.by, 28, 2) + w * 2, 4, 2);
  }

  /* something in it: a fish rising leaves a ring that grows and fades on its
     own short cycle, weed sways under the surface, a bird rides the swell.
     Deeper water reads as better fishing than the shallows do, so the ring's
     own cycle runs a little faster the farther out a tile sits. */
  function life(x, y, t, v) {
    if (v.feat < 5) return;                               /* most tiles carry nothing at all */
    const px = x * BEK_T + A.spot(v.fx, BEK_T, 6), py = y * BEK_T + A.spot(v.fy, BEK_T, 6);
    if (v.feat === 5) {
      const period = 5.3 - Math.min(2, dAt(x, y)) * 0.4;
      const cyc = (t + v.fx * 0.71 + v.fy * 1.3) % period;
      if (cyc > 1.1) return;                              /* most of the cycle: nothing to see */
      const r = 2 + cyc * 5, s = Math.max(0, 16 - cyc * 14);
      A.wash(px - r, py - 1, r * 2, 2, RING[1], s);
      A.wash(px - 1, py - r, 2, r * 2, RING[1], s);
      if (cyc < 0.3) A.fill(RING[0], px - 1, py - 1, 2, 2);   /* the rise itself, brief and bright */
      return;
    }
    if (v.feat === 6) {
      const sway = Math.round(Math.sin(t * 0.4 + v.fy) * 2);
      A.fill(WEED[1], px + sway, py, 6, 2);
      A.fill(WEED[0], px + sway + 1, py, 3, 1);
      return;
    }
    const bob = Math.round(Math.sin(t * 1.6 + v.fx));       /* a bird, riding the swell */
    A.fill(BIRD[1], px, py + bob, 3, 2);
    A.fill(BIRD[0], px + 1, py + bob, 1, 1);
  }

  function live(x, y, t) {
    const v = waterVar(A.map(), x, y);
    swell(x, y, t);
    glint(x, y, t, v);
    life(x, y, t, v);
  }

  return { prepare: prepare, deep: deep, live: live };
}
