/* Hard-edged software rasterizer.

   Canvas antialiases every path fill and every rotated fillRect, which is
   fatal for pixel art -- rotate a limb with ctx.rotate and its edges go
   fuzzy. So nothing in this app ever calls fill()/stroke(); every shape
   below is scan-converted here and emitted as axis-aligned 1px rows. That
   is what keeps a 480x270 frame looking like it was drawn pixel by pixel
   even while limbs swing at arbitrary angles. */

import { S, SH, BASE, LT, RIM, LIGHT } from './palette.js';

/* ---- core ------------------------------------------------------------ */

export function px(g, x, y, w, h, color) {
  if (w <= 0 || h <= 0) return;
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

/* even-odd scanline fill, sampled at pixel centres. Points are [x,y]
   pairs in any winding; concave shapes and self-crossing hair spikes all
   work. Sub-pixel spans that would round away are still given one pixel
   so thin details (a finger, a strand) never blink out. */
export function poly(g, pts, color) {
  const n = pts.length;
  if (n < 3) return;
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    const y = pts[i][1];
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const y0 = Math.floor(minY), y1 = Math.ceil(maxY);
  g.fillStyle = color;
  const xs = [];
  for (let y = y0; y <= y1; y++) {
    const yc = y + 0.5;
    xs.length = 0;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const ay = pts[j][1], by = pts[i][1];
      if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) {
        xs.push(pts[j][0] + ((yc - ay) / (by - ay)) * (pts[i][0] - pts[j][0]));
      }
    }
    if (xs.length < 2) continue;
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const xa = Math.round(xs[i]), xb = Math.round(xs[i + 1]);
      if (xb > xa) g.fillRect(xa, y, xb - xa, 1);
      else if (xs[i + 1] - xs[i] > 0.28) g.fillRect(xa, y, 1, 1);
    }
  }
}

/* rotate + scale + translate a point list; sprites are authored in a
   comfortable local space and placed with this rather than ctx.rotate */
export function place(pts, x, y, ang, sx, sy) {
  const c = Math.cos(ang || 0), s = Math.sin(ang || 0);
  const kx = sx == null ? 1 : sx, ky = sy == null ? kx : sy;
  const out = new Array(pts.length);
  for (let i = 0; i < pts.length; i++) {
    const px0 = pts[i][0] * kx, py0 = pts[i][1] * ky;
    out[i] = [x + px0 * c - py0 * s, y + px0 * s + py0 * c];
  }
  return out;
}

export function shift(pts, dx, dy) {
  const out = new Array(pts.length);
  for (let i = 0; i < pts.length; i++) out[i] = [pts[i][0] + dx, pts[i][1] + dy];
  return out;
}

/* ---- round shapes ---------------------------------------------------- */

export function ellipse(g, cx, cy, rx, ry, color) {
  g.fillStyle = color;
  const y0 = Math.round(cy - ry), y1 = Math.round(cy + ry);
  for (let y = y0; y <= y1; y++) {
    const t = (y + 0.5 - cy) / ry;
    if (t * t >= 1) continue;
    const w = rx * Math.sqrt(1 - t * t);
    const xa = Math.round(cx - w), xb = Math.round(cx + w);
    if (xb > xa) g.fillRect(xa, y, xb - xa, 1);
  }
}

export function disc(g, cx, cy, r, color) { ellipse(g, cx, cy, r, r, color); }

/* a ring / arc band, used for shockwaves and aura halos */
export function ring(g, cx, cy, r, thick, color, squashY) {
  const sy = squashY == null ? 1 : squashY;
  g.fillStyle = color;
  const y0 = Math.round(cy - r * sy - 1), y1 = Math.round(cy + r * sy + 1);
  for (let y = y0; y <= y1; y++) {
    const dy = (y + 0.5 - cy) / sy;
    const inner = r - thick;
    const o2 = r * r - dy * dy, i2 = inner * inner - dy * dy;
    if (o2 <= 0) continue;
    const ow = Math.sqrt(o2);
    if (i2 > 0) {
      const iw = Math.sqrt(i2);
      g.fillRect(Math.round(cx - ow), y, Math.max(1, Math.round(ow - iw)), 1);
      g.fillRect(Math.round(cx + iw), y, Math.max(1, Math.round(ow - iw)), 1);
    } else {
      g.fillRect(Math.round(cx - ow), y, Math.max(1, Math.round(ow * 2)), 1);
    }
  }
}

/* ---- limbs ----------------------------------------------------------- */

function capsulePts(x0, y0, x1, y1, w0, w1) {
  let dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 0.001;
  const nx = -dy / len, ny = dx / len;
  return [
    [x0 + nx * w0 * 0.5, y0 + ny * w0 * 0.5],
    [x1 + nx * w1 * 0.5, y1 + ny * w1 * 0.5],
    [x1 - nx * w1 * 0.5, y1 - ny * w1 * 0.5],
    [x0 - nx * w0 * 0.5, y0 - ny * w0 * 0.5]
  ];
}

/* A cel-shaded cylindrical limb: base fill, a light band running down the
   side facing LIGHT, a core-shadow band on the far side and a 1px rim on
   the very edge. Ends are capped with discs so joints stay round when a
   limb swings. `opts.rim` adds the back-edge kicker, `opts.flat` paints
   the whole thing one colour (used for silhouettes and hit flashes). */
export function limbShape(g, x0, y0, x1, y1, w0, w1, ramp, opts) {
  const o = opts || {};
  if (o.flat) {
    poly(g, capsulePts(x0, y0, x1, y1, w0, w1), o.flat);
    disc(g, x0, y0, w0 * 0.5, o.flat);
    disc(g, x1, y1, w1 * 0.5, o.flat);
    return;
  }
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 0.001;
  let nx = -dy / len, ny = dx / len;
  if (nx * LIGHT.x + ny * LIGHT.y < 0) { nx = -nx; ny = -ny; }  // n points at the light
  poly(g, capsulePts(x0, y0, x1, y1, w0, w1), ramp[BASE]);
  disc(g, x0, y0, w0 * 0.5, ramp[BASE]);
  disc(g, x1, y1, w1 * 0.5, ramp[BASE]);
  const sOff = 0.3, sW = 0.36;
  poly(g, capsulePts(x0 - nx * w0 * sOff, y0 - ny * w0 * sOff, x1 - nx * w1 * sOff, y1 - ny * w1 * sOff,
    w0 * sW, w1 * sW), ramp[SH]);
  const lOff = 0.28, lW = 0.34;
  poly(g, capsulePts(x0 + nx * w0 * lOff, y0 + ny * w0 * lOff, x1 + nx * w1 * lOff, y1 + ny * w1 * lOff,
    w0 * lW, w1 * lW), ramp[LT]);
  if (o.rim !== false) {
    poly(g, capsulePts(x0 + nx * w0 * 0.44, y0 + ny * w0 * 0.44, x1 + nx * w1 * 0.44, y1 + ny * w1 * 0.44,
      Math.max(1, w0 * 0.14), Math.max(1, w1 * 0.14)), ramp[RIM]);
  }
}

/* ---- shading helpers ------------------------------------------------- */

/* base shape + an inner shadow shape + an inner light shape, all given as
   explicit point lists. Authoring shading as real shapes (instead of
   offsetting the silhouette) is the only way to get shadows that hug an
   anatomy -- a jaw, a collar, the underside of a coat. */
export function celPoly(g, base, ramp, shadowPts, lightPts, flat) {
  poly(g, base, flat || ramp[BASE]);
  if (flat) return;
  if (shadowPts) poly(g, shadowPts, ramp[SH]);
  if (lightPts) poly(g, lightPts, ramp[LT]);
}

const BAYER = [
  [0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]
];

/* ordered dither between two colours; density 0..16 */
export function dither(g, x, y, w, h, a, b, density) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  if (a) px(g, x, y, w, h, a);
  g.fillStyle = b;
  for (let yy = 0; yy < h; yy++) {
    const row = BAYER[(y + yy) & 3];
    for (let xx = 0; xx < w; xx++) {
      if (row[(x + xx) & 3] < density) g.fillRect(x + xx, y + yy, 1, 1);
    }
  }
}

/* a vertical ramp of colour bands with dithered seams -- skies, walls,
   anything that needs to shade over distance without a gradient */
export function vband(g, x, y, w, h, colors, blend) {
  const n = colors.length;
  const bh = h / n;
  for (let i = 0; i < n; i++) {
    const by = y + i * bh;
    px(g, x, by, w, Math.ceil(bh) + 1, colors[i]);
  }
  if (blend === false) return;
  for (let i = 1; i < n; i++) {
    const by = Math.round(y + i * bh);
    const k = Math.max(2, Math.round(bh * 0.34));
    dither(g, x, by - k, w, k, null, colors[i], 7);
    dither(g, x, by, w, k, null, colors[i - 1], 6);
  }
}

/* a hard-pixel line of given thickness (Bresenham-ish, no AA) */
export function line(g, x0, y0, x1, y1, t, color) {
  const dx = x1 - x0, dy = y1 - y0;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  g.fillStyle = color;
  const tt = Math.max(1, Math.round(t));
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    g.fillRect(Math.round(x0 + dx * s - tt / 2), Math.round(y0 + dy * s - tt / 2), tt, tt);
  }
}

/* ground contact shadow: a dithered ellipse, darkest at the feet */
export function contactShadow(g, cx, cy, rx, ry, color, alpha) {
  g.save();
  g.globalAlpha = alpha == null ? 0.5 : alpha;
  ellipse(g, cx, cy, rx, ry, color);
  g.globalAlpha *= 0.55;
  ellipse(g, cx, cy, rx * 1.5, ry * 1.45, color);
  g.restore();
}

export { S, SH, BASE, LT, RIM, LIGHT };
