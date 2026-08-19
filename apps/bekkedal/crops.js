/* Bekkedal — the ploughed plot and what comes up out of it.
 *
 * The last of the live second pass. Every other tile is a function of the map
 * and the hash; this one reads `S.soil`, which is per-square save state that
 * changes when you dig, water, plant and harvest — so it cannot go in the
 * terrain cache and is redrawn every frame over the top of it.
 *
 * Lifted out of `index.js` unchanged. `tilledSoil` is already native (real
 * `BEK_T` pixels, opened with `A.native()`); the crop standing on it is not,
 * and still draws in source space under the shared art transform. The two sit
 * side by side in one function, which is exactly the state the art uplift
 * leaves things in while it works through them — see **The art scale** in
 * this app's CLAUDE.md.
 */
import { SOI, WAT, GRASS, SNO, STO } from './palette.js';
import { soilVar } from './noise.js';
import { BEK_T, BEK_T_SRC, BEK_CROPS } from './data.js';

export function createCrops(GG, C, A) {
  /* A.soil(key)  the square's soil record, or undefined
     A.map()      the current map id, for the variation salt
     A.native(fn) cancels the art transform for a native-resolution fill
     A.spot(...)  the shared step-index-to-position helper */
  /* Ploughed in even rows, so the furrows always run the same way the
     field was worked — horizontal bands that line up tile to tile rather
     than each tile picking its own direction. Wet soil goes darker as
     well as greyer and keeps a black, dither-proof shadow in every
     furrow (plus a glint of standing water) so it still reads apart from
     dry soil once the night stipple is over everything. */
  function tilledSoil(x, y, wet) {
    const px = x * BEK_T, py = y * BEK_T, v = soilVar(A.map(), x, y);
    A.native(() => {
      GG().fillStyle = C(wet ? SOI[1] : SOI[2]); GG().fillRect(px + 2, py + 2, 36, 36);
      GG().fillStyle = C(wet ? SOI[0] : SOI[1]);
      GG().fillRect(px + 4, py + 9, 32, 2); GG().fillRect(px + 4, py + 19, 32, 2); GG().fillRect(px + 4, py + 29, 32, 2);
      GG().fillStyle = C(SOI[3]);
      GG().fillRect(px + 4, py + 8, 32, 1); GG().fillRect(px + 4, py + 18, 32, 1); GG().fillRect(px + 4, py + 28, 32, 1);
      /* standing water, and it stands where the ground happens to dip,
         not on a line four pixels wide down the left of every plot */
      if (wet) {
        GG().fillStyle = C(WAT[3]);
        GG().fillRect(px + 4 + A.spot(v.ax, 32, 1), py + 4 + A.spot(v.ay, 32, 1), 1, 1);
        GG().fillRect(px + 4 + A.spot(v.bx, 32, 1), py + 4 + A.spot(v.by, 32, 1), 1, 1);
      }
    });
  }
  /* the sprinkler stands on the tile it waters, a stem and a cross-head,
     drawn native like the tilled soil beneath it — the crop it may share
     the square with still draws in source space below */
  function sprinklerPost(x, y) {
    const px = x * BEK_T, py = y * BEK_T;
    A.native(() => {
      GG().fillStyle = C(STO[3]); GG().fillRect(px + 17, py + 12, 6, 22);
      GG().fillStyle = C(STO[4]); GG().fillRect(px + 10, py + 8, 20, 4);
      GG().fillStyle = C(WAT[2]); GG().fillRect(px + 12, py + 4, 2, 4); GG().fillRect(px + 26, py + 4, 2, 4);
    });
  }
  function drawSoil(x, y) {
    const c = A.soil(x + ',' + y); if (!c) return;
    if (c.till) tilledSoil(x, y, c.wet);
    if (c.spr) sprinklerPost(x, y);
    if (!c.seed) return;
    const px = x * BEK_T_SRC, py = y * BEK_T_SRC;
    const spec = BEK_CROPS[c.seed]; const f = Math.min(1, c.age / spec.days); const h = 3 + Math.round(f * 11);
    GG().fillStyle = C(GRASS[3]); GG().fillRect(px + 9, py + 18 - h, 2, h);
    GG().fillStyle = C(GRASS[2]); GG().fillRect(px + 6, py + 16 - h, 3, 2); GG().fillRect(px + 11, py + 14 - h, 3, 2);
    if (c.ready) { GG().fillStyle = C(spec.col); GG().fillRect(px + 7, py + 14 - h, 6, 5); GG().fillStyle = C(SNO[1]); GG().fillRect(px + 8, py + 15 - h, 2, 1); }
  }

  return { drawSoil: drawSoil };
}
