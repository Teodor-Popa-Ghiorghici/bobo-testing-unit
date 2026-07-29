import { VGA16 } from './god.js';

/* ---- the 16-color crush --------------------------------------------------
   Photos survive down to sixteen colours far better with error diffusion
   than with a flat quantise, so a real photograph still reads as a picture
   instead of going to mud. */
function nearestVGA(r, g, b) {
  let best = VGA16[0], bd = Infinity;
  for (let i = 0; i < 16; i++) {
    const p = VGA16[i];
    const d = (r - p[0]) * (r - p[0]) + (g - p[1]) * (g - p[1]) + (b - p[2]) * (b - p[2]);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

/* Floyd-Steinberg dithering down to the sixteen-colour VGA palette */
export function ditherVGA(ctx, w, h) {
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;
  const spill = (x, y, f, er, eg, eb) => {
    if (x < 0 || x >= w || y >= h) return;
    const j = (y * w + x) * 4;
    d[j]     = Math.max(0, Math.min(255, d[j]     + er * f));
    d[j + 1] = Math.max(0, Math.min(255, d[j + 1] + eg * f));
    d[j + 2] = Math.max(0, Math.min(255, d[j + 2] + eb * f));
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const or = d[i], og = d[i + 1], ob = d[i + 2];
      const p = nearestVGA(or, og, ob);
      d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2];
      const er = or - p[0], eg = og - p[1], eb = ob - p[2];
      spill(x + 1, y,     7 / 16, er, eg, eb);
      spill(x - 1, y + 1, 3 / 16, er, eg, eb);
      spill(x,     y + 1, 5 / 16, er, eg, eb);
      spill(x + 1, y + 1, 1 / 16, er, eg, eb);
    }
  }
  ctx.putImageData(id, 0, 0);
}

/* the knobs every import obeys: crushed to sixteen colours, and no bigger
   than a real machine's screen, so an uploaded photo does not break the
   illusion by looking like a photograph */
export const UP = { vga: true, maxDim: 384 };

/* draw an already-decoded <img>/<video frame> onto a canvas, downscaled and
   (optionally) dithered to the VGA palette. Returns the canvas. */
export function crushImage(img, srcW, srcH) {
  const s = Math.min(1, UP.maxDim / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * s));
  const h = Math.max(1, Math.round(srcH * s));
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, w, h);
  if (UP.vga) {
    try { ditherVGA(ctx, w, h); } catch (e) { /* canvas unreadable (tainted); keep the plain resize */ }
  }
  return cv;
}
