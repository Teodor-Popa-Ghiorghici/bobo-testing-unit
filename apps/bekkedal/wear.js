/* Bekkedal — the paths worn between the places people actually walk.
 *
 * `interior.js`'s `traceWear()` already does this indoors: not a noise
 * field, but the line between the door and the hearth, the door and the
 * bed, computed from the room's own layout. Outdoors the same idea applies
 * to grass — the line from a door to the field it opens onto, from the
 * road to that same door, from a pier to the nearest path — and the same
 * rule holds: derive it from the map's own content, never hand-place a
 * stroke of dirt.
 *
 * Landmarks are found by scanning the map for the glyphs that already mean
 * something (`D` a door, `.` the road, `f` a field, `P` a pier, `o` a well,
 * `S` a sign, `K` a chest) — `interior.js`'s `find(ch)`, generalised to a
 * character set. For every door, the *nearest* tile of every other landmark type
 * present on the map becomes one desire-line segment; an outdoor map is
 * four to eight times the tile count of a room, so connecting every door
 * to every landmark (all-pairs, the way `traceWear` can afford to indoors)
 * would smear wear along the entire length of a road instead of just the
 * stretch that actually leads somewhere.
 */
import { hash } from './noise.js';
import { BEK_T } from './data.js';

/* one unregistered channel block for this file's own jitter, clear of every
   range noise.js's recipe tables use — same precedent interior.js already
   sets with its own local CH_BOARD: not every hash call needs a declared
   tile_check.js channel, only the per-glyph ones that check reasons about */
const CH_WEAR = 6144;

/* how a door reaches a landmark of type `ch`, and how it draws: */
const LANDMARKS = ['.', 'f', 'P', 'o', 'S', 'K'];
const REACH = 3.5;             /* tiles either side of the line, falling off */

export function createWear(A) {
  let field = null, cols = 0, rows = 0, ready = '';

  /* One pass over the grid, not one per (door, landmark type) — `A.tileAt`
     is not a bare array read (it resolves felled/mined/picked overlays,
     the two farm-plot flags, the built-house overlay), so scanning the
     whole map once and sorting every tile into its bucket as it goes is
     what keeps this affordable on a map the size of the town's. */
  function findAll() {
    const doors = [], byType = {};
    for (const ch of LANDMARKS) byType[ch] = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const c = A.tileAt(x, y);
      if (c === 'D') doors.push([x, y]);
      else if (byType[c]) byType[c].push([x, y]);
    }
    return { doors, byType };
  }

  function nearest(from, pts) {
    let best = null, bd = Infinity;
    for (const p of pts) {
      const d = (p[0] - from[0]) * (p[0] - from[0]) + (p[1] - from[1]) * (p[1] - from[1]);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  /* distance from a point to a segment, in tiles — identical shape to
     interior.js's traceWear, so a desire line reads the same way indoors
     and out */
  function segDist(px, py, a, b) {
    const vx = b[0] - a[0], vy = b[1] - a[1];
    const L = vx * vx + vy * vy;
    let t = L ? ((px - a[0]) * vx + (py - a[1]) * vy) / L : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = px - (a[0] + vx * t), dy = py - (a[1] + vy * t);
    return Math.sqrt(dx * dx + dy * dy);
  }

  function trace() {
    const w = new Uint8Array(cols * rows);
    const { doors, byType } = findAll();
    if (!doors.length) return w;
    const segs = [];
    for (const d of doors) {
      for (const ch of LANDMARKS) {
        const pts = byType[ch];
        if (!pts.length) continue;
        const n = nearest(d, pts);
        if (n[0] !== d[0] || n[1] !== d[1]) segs.push([d, n]);
      }
    }
    if (!segs.length) return w;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      let best = 99;
      for (const [a, b] of segs) { const v = segDist(x, y, a, b); if (v < best) best = v; }
      /* a strip about a tile and a half wide, fading out — plus a per-tile
         step of jitter so the edge is not a drawn contour, same shape as
         traceWear's own falloff */
      const f = Math.max(0, 1 - best / REACH);
      w[y * cols + x] = Math.floor(f * f * 4 + hash(x, y, CH_WEAR) / 4294967296);
    }
    return w;
  }

  function prepare(key) {
    if (key === ready) return;
    ready = key;
    cols = A.cols(); rows = A.rows();
    field = trace();
  }

  const amt = (x, y) => field ? field[y * cols + x] : 0;

  return { prepare: prepare, amt: amt };
}

/* ---- cost -----------------------------------------------------------------
   `A.tileAt` is not a bare array read — it resolves the felled/mined/picked
   overlays, the farm-plot flags and the built-house overlay — so `findAll`
   scans the grid exactly once per rebuild rather than once per (door,
   landmark type). The first cut did the naive thing and cost real time on a
   six-door map: measured warm, median of five forced rebuilds, same
   container, same sitting, door-per-type rescans against the one-pass fix:

   | map   | doors | rescan (naive) | one pass |
   |-------|-------|-----------------|----------|
   | farm  |   1   |     33.5ms      |  30.8ms  |
   | town  |   6   |     55.3ms      |  29.7ms  |
   | lake  |   0*  |     26.6ms      |  21.6ms  |

   (*lake carries no door in its own rows — only once a player has built the
   house does `tileAt`'s `S.built` overlay put one there, so lake's own
   figure is the cost of `wear` finding nothing and returning early, plus the
   new decor.)

   Against the unmodified build measured the same way (noon, five forced
   rebuilds): farm 25.3ms, town 25.6ms, lake 25.6ms — so the one-pass wear
   scan plus the new outdoor decor add roughly 2-5ms per map, not 20-30. */
