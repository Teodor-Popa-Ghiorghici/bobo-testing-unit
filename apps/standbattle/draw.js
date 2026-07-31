/* Shared pixel-art primitives. By explicit request this content goes
   beyond the house 16-colour/no-antialiasing rule (see README) for a
   richer, SNES-quality look: bigger curated palettes, three-band shading,
   ordered dithering for texture and gradients, staircase circles for
   round silhouettes. Canvas smoothing stays off and every primitive still
   snaps to whole pixels -- it's a bigger palette, not a blurrier one. */

const BAYER4 = [
  [0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]
];

export function px(g, x, y, w, h, color) {
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

/* filled rect with a 1px outline -- the classic pixel-sprite silhouette */
export function outlined(g, x, y, w, h, fill, outline) {
  px(g, x - 1, y - 1, w + 2, h + 2, outline);
  px(g, x, y, w, h, fill);
}

/* a circle, drawn as a staircase of one-pixel rows -- the only way to get
   one with no antialiasing */
export function disc(g, cx, cy, r, color) {
  g.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    g.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2 + 1, 1);
  }
}

/* a partial disc, only the rows between dyMin and dyMax (both measured
   from centre, negative = up) -- a cap dome sitting on a head, a visor,
   a crescent of hair peeking from under a hat */
export function discSlice(g, cx, cy, r, color, dyMin, dyMax) {
  g.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) {
    if (dy < dyMin || dy > dyMax) continue;
    const w = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    g.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2 + 1, 1);
  }
}

/* ordered 4x4 dither between two colours, density in [0,16) -- texture and
   soft gradients without inventing an in-between colour */
export function dither(g, x, y, w, h, colorA, colorB, density) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  px(g, x, y, w, h, colorA);
  g.fillStyle = colorB;
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      if (BAYER4[(y + yy) & 3][(x + xx) & 3] < density) g.fillRect(x + xx, y + yy, 1, 1);
    }
  }
}

/* three-band shading: base fill plus a highlight strip near the top and a
   shadow strip near the bottom -- reads as "volume" without a light model */
export function shaded(g, x, y, w, h, base, hi, lo) {
  px(g, x, y, w, h, base);
  px(g, x, y, w, Math.max(1, Math.round(h * 0.28)), hi);
  px(g, x, y + h - Math.max(1, Math.round(h * 0.22)), w, Math.max(1, Math.round(h * 0.22)), lo);
}

/* a whole-pixel stepped line, for zippers, seams, speed lines, cracks */
export function stepLine(g, x0, y0, x1, y1, thickness, color) {
  const dx = x1 - x0, dy = y1 - y0;
  const steps = Math.max(1, Math.round(Math.max(Math.abs(dx), Math.abs(dy))));
  g.fillStyle = color;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    g.fillRect(Math.round(x0 + dx * t), Math.round(y0 + dy * t), thickness, thickness);
  }
}

/* a soft round drop shadow under a standing figure, drawn as a dithered
   ellipse-ish blob so it doesn't invent a translucent colour */
export function groundShadow(g, cx, y, rx, ry, color) {
  for (let dy = -ry; dy <= ry; dy++) {
    const t = 1 - (dy * dy) / (ry * ry);
    if (t <= 0) continue;
    const w = Math.round(rx * Math.sqrt(t));
    g.fillStyle = color;
    g.globalAlpha = dy === 0 ? 0.5 : 0.32;
    g.fillRect(Math.round(cx - w), Math.round(y + dy), w * 2, 1);
  }
  g.globalAlpha = 1;
}
