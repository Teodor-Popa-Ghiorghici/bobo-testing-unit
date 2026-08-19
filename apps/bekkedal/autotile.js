/* Bekkedal — which way is out.
 *
 * A tile that draws a transition has to know where the thing it is
 * transitioning to actually is. The shore did not: `waterEdgeTile` drew a
 * hardcoded horizontal stack — deep water, a foam line at y+28, sand, bank —
 * so every `~` on every map drew a north-facing beach whether the water was
 * north of it or not. On the lake, where the water is *south*, the sand was
 * in the water.
 *
 * Nothing here knows anything about water. It takes a predicate over
 * neighbours and answers three questions the art can build a transition out
 * of, and the treeline, the cave walls, the fences and the roofs all want the
 * same three answers.
 */

export const AT_N = 1, AT_E = 2, AT_S = 4, AT_W = 8;
export const AT_NE = 16, AT_SE = 32, AT_SW = 64, AT_NW = 128;

/* dx, dy, bit — in the order the bits are numbered */
export const CARD = [[0, -1, AT_N], [1, 0, AT_E], [0, 1, AT_S], [-1, 0, AT_W]];
const DIAG = [[1, -1, AT_NE], [1, 1, AT_SE], [-1, 1, AT_SW], [-1, -1, AT_NW]];

/* `pred(x, y)` is asked about neighbours only, and it is asked out of bounds
   as well — the caller decides what lies past the edge of the map, because on
   this game's outdoor maps that is a wall of trees and indoors it is a wall. */
export function mask4(pred, x, y) {
  let m = 0;
  for (let i = 0; i < 4; i++) if (pred(x + CARD[i][0], y + CARD[i][1])) m |= CARD[i][2];
  return m;
}
export function mask8(pred, x, y) {
  let m = mask4(pred, x, y);
  for (let i = 0; i < 4; i++) if (pred(x + DIAG[i][0], y + DIAG[i][1])) m |= DIAG[i][2];
  return m;
}

/* How far every cell is from the nearest cell the predicate is true of, in
   cells, breadth-first and capped. The water uses it to get deeper the
   further it is from any land, which is a depth ramp for the cost of one
   sweep at cache-rebuild time. */
export function distanceField(pred, cols, rows, cap) {
  const d = new Int16Array(cols * rows).fill(cap);
  const q = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (pred(x, y)) { d[y * cols + x] = 0; q.push(x, y); }
  }
  for (let h = 0; h < q.length; h += 2) {
    const x = q[h], y = q[h + 1], nd = d[y * cols + x] + 1;
    if (nd >= cap) continue;
    for (let i = 0; i < 4; i++) {
      const nx = x + CARD[i][0], ny = y + CARD[i][1];
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (d[ny * cols + nx] <= nd) continue;
      d[ny * cols + nx] = nd; q.push(nx, ny);
    }
  }
  return d;
}

/* ---- the profile, once, sampled in whichever direction the mask says ------
 *
 * `edgeDist` is how far into the tile the transition reaches from an edge the
 * mask names. For a pixel at (lx, ly) in a `span`-wide tile, `t` comes back
 * as a signed distance from the transition line: positive on the *named*
 * side, negative away from it. Author a profile once as a function of `t` and
 * sample it along this, and four rotations of hand-drawn art become one
 * drawing plus a direction — which is the difference between solving the
 * ticket and solving the problem, because the same four rotations would then
 * need a fifth for every corner.
 *
 * The combining rule is a rounded union, and that is what handles the corners
 * the brief's straight profile could not:
 *
 *   - inside any named half-plane, take the largest `t` — the exact signed
 *     distance to the union, which is a mitre at an inner corner, and an
 *     inner corner of a coastline is a cove and does have a corner;
 *   - outside all of them, take the negative length of the vector of misses
 *     rather than the nearest single one. Where two adjacent sides are named
 *     that turns the right-angle contour into a quarter-circle arc, so the
 *     bands wrap a headland instead of mitring two straight beaches together.
 *     A mitre joint reads as a drawn line; an arc reads as a beach.
 *
 * The same formula covers one named side (exact), two opposite (a channel),
 * three (a spit) and four (an island), so there is no table of sixteen cases
 * to get one entry of wrong.
 */
export function profileT(mask, lx, ly, span, edgeDist) {
  let best = -Infinity, miss = 0, inside = false;
  if (mask & AT_N) { const t = edgeDist - ly;              if (t >= 0) { inside = true; if (t > best) best = t; } else miss += t * t; }
  if (mask & AT_S) { const t = edgeDist - (span - 1 - ly); if (t >= 0) { inside = true; if (t > best) best = t; } else miss += t * t; }
  if (mask & AT_W) { const t = edgeDist - lx;              if (t >= 0) { inside = true; if (t > best) best = t; } else miss += t * t; }
  if (mask & AT_E) { const t = edgeDist - (span - 1 - lx); if (t >= 0) { inside = true; if (t > best) best = t; } else miss += t * t; }
  if (inside) return best;
  if (!mask) return -span;                 /* nothing named: all the far side */
  return -Math.sqrt(miss);
}

/* Which way the named sides lie, as a unit-ish vector. Ripples drift along
   it and the foam's breaks run across it, so a shore's motion is
   perpendicular to that shore however it is turned. */
export function maskNormal(mask) {
  let nx = 0, ny = 0;
  if (mask & AT_N) ny -= 1;
  if (mask & AT_S) ny += 1;
  if (mask & AT_W) nx -= 1;
  if (mask & AT_E) nx += 1;
  const l = Math.sqrt(nx * nx + ny * ny) || 1;
  return [nx / l, ny / l];
}
