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
 * All of it is static, so all of it is in the terrain cache.
 */
import { WAT } from './palette.js';
import { distanceField } from './autotile.js';
import { isShoreLand } from './surface.js';
import { BEK_T, BEK_COLS, BEK_ROWS } from './data.js';

/* Indexed by distance from land in tiles. Entry 1 is where the shore
   profile's far edge leaves off, so the two meet without a step. */
const DEEP = [WAT[3], WAT[2], WAT[1], WAT[0], WAT[0]];
/* Two sub-cells a side, not four. The field is already smoothed across the
   map, so this only halves the step *within* a tile — and a lake is two
   hundred tiles, so every extra sub-cell is another four hundred rects on the
   rebuild. Four a side measured 34ms; two measures a third of that and the
   difference is not visible under the dither. */
const SUB = 2;

export function createWater(A) {
  /* A.fill(col, x, y, w, h)        — device pixels, inside a native() block
     A.wash(x, y, w, h, col, s)     — the ordered stipple, likewise
     A.tileAt(x, y)                 — the glyph at a grid square */
  let depth = null, ready = '';

  function prepare(key) {
    if (key === ready) return;
    ready = key;
    const raw = distanceField((x, y) => isShoreLand(A.tileAt(x, y)), BEK_COLS, BEK_ROWS, 4);
    depth = new Float32Array(BEK_COLS * BEK_ROWS);
    for (let y = 0; y < BEK_ROWS; y++) for (let x = 0; x < BEK_COLS; x++) {
      let sum = 0, cnt = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= BEK_COLS || ny >= BEK_ROWS) continue;
        sum += raw[ny * BEK_COLS + nx]; cnt++;
      }
      depth[y * BEK_COLS + x] = sum / cnt;
    }
  }

  const dAt = (x, y) => depth[(y < 0 ? 0 : y >= BEK_ROWS ? BEK_ROWS - 1 : y) * BEK_COLS +
                              (x < 0 ? 0 : x >= BEK_COLS ? BEK_COLS - 1 : x)];

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
  }

  return { prepare: prepare, deep: deep };
}
