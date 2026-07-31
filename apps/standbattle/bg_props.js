/* Background prop library. Each function paints one piece of scenery in
   the same three-tone-plus-rim language the characters use, so the town
   and the fighters look like they were drawn by the same hand. Props take
   a ramp so the same building can be pushed into atmospheric haze just by
   passing a paler set of colours. */

import { poly, px, line, dither, ellipse, disc, vband } from './draw.js';
import { S, SH, BASE, LT, RIM } from './palette.js';

export function facade(g, x, y, w, h, ramp, opts) {
  const o = opts || {};
  px(g, x, y, w, h, ramp[BASE]);
  px(g, x, y, w, 3, ramp[LT]);
  px(g, x, y + 3, Math.max(2, w * 0.18), h - 3, ramp[LT]);
  px(g, x + w - Math.max(2, w * 0.12), y + 3, Math.max(2, w * 0.12), h - 3, ramp[SH]);
  px(g, x, y + h - 2, w, 2, ramp[S]);
  if (o.cornice !== false) {
    px(g, x - 2, y - 3, w + 4, 4, ramp[SH]);
    px(g, x - 2, y - 3, w + 4, 1, ramp[RIM]);
  }
  if (o.ledges) {
    for (let ly = y + 16; ly < y + h - 8; ly += o.ledges) {
      px(g, x, ly, w, 2, ramp[SH]);
      px(g, x, ly, w, 1, ramp[LT]);
    }
  }
}

/* window grid with individually lit panes; `seed` keeps a building's
   lighting stable between frames, `lit` scales how many are on */
export function windows(g, x, y, w, h, ramp, win, seed, lit, tsec) {
  const gapX = 13, gapY = 17;
  const cols = Math.max(1, Math.floor((w - 8) / gapX));
  const rows = Math.max(1, Math.floor((h - 14) / gapY));
  const ox = x + (w - (cols - 1) * gapX - 7) / 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = Math.round(ox + c * gapX), wy = Math.round(y + 10 + r * gapY);
      const n = (seed * 37 + r * 17 + c * 7) % 23;
      const on = (n / 23) < lit;
      const flick = on && Math.sin(tsec * 0.7 + n) > 0.995;
      px(g, wx - 1, wy - 1, 9, 12, ramp[S]);
      px(g, wx, wy, 7, 10, on && !flick ? win[BASE] : win[SH]);
      if (on && !flick) {
        px(g, wx, wy, 7, 4, win[LT]);
        px(g, wx + 1, wy + 6, 5, 3, win[BASE]);
      } else {
        px(g, wx + 1, wy + 1, 5, 4, win[S]);
      }
      px(g, wx + 3, wy, 1, 10, ramp[S]);
      px(g, wx, wy + 4, 7, 1, ramp[S]);
    }
  }
}

export function awning(g, x, y, w, ramp, stripe) {
  for (let i = 0; i < w; i += 6) {
    px(g, x + i, y, Math.min(6, w - i), 9, (i / 6) % 2 ? ramp[BASE] : stripe[BASE]);
  }
  px(g, x, y, w, 2, ramp[LT]);
  px(g, x - 1, y + 9, w + 2, 2, ramp[S]);
  for (let i = 0; i < w; i += 6) {
    poly(g, [[x + i, y + 11], [x + i + 3, y + 11], [x + i + 1.5, y + 14]], (i / 6) % 2 ? ramp[SH] : stripe[SH]);
  }
}

export function shopSign(g, x, y, w, h, ramp, glow) {
  px(g, x - 1, y - 1, w + 2, h + 2, '#0A0A10');
  px(g, x, y, w, h, ramp[BASE]);
  px(g, x, y, w, 2, ramp[LT]);
  px(g, x, y + h - 2, w, 2, ramp[S]);
  for (let i = 0; i < Math.floor((w - 6) / 7); i++) {
    px(g, x + 4 + i * 7, y + 4, 4, h - 8, glow);
  }
}

export function pole(g, x, groundY, h, ramp, wires) {
  px(g, x, groundY - h, 4, h, ramp[BASE]);
  px(g, x, groundY - h, 1, h, ramp[LT]);
  px(g, x + 3, groundY - h, 1, h, ramp[S]);
  for (let i = 0; i < 2; i++) {
    const ay = groundY - h + 6 + i * 9;
    px(g, x - 7, ay, 18, 2, ramp[SH]);
    px(g, x - 7, ay, 18, 1, ramp[LT]);
  }
  if (wires) {
    for (let i = 0; i < 3; i++) {
      const wy = groundY - h + 7 + i * 4;
      for (let dx = 0; dx < wires; dx += 2) {
        const sag = Math.sin((dx / wires) * Math.PI) * 7;
        px(g, x + 4 + dx, wy + sag, 2, 1, '#0D0E16');
      }
    }
  }
}

export function streetLamp(g, x, groundY, h, ramp, on) {
  px(g, x - 1, groundY - 3, 6, 4, ramp[S]);
  px(g, x, groundY - h, 3, h, ramp[BASE]);
  px(g, x, groundY - h, 1, h, ramp[LT]);
  poly(g, [[x - 5, groundY - h], [x + 8, groundY - h], [x + 6, groundY - h + 5], [x - 3, groundY - h + 5]], ramp[SH]);
  if (on) {
    px(g, x - 3, groundY - h + 4, 9, 3, '#FFE9A8');
    g.save(); g.globalAlpha = 0.16;
    poly(g, [[x - 4, groundY - h + 6], [x + 7, groundY - h + 6], [x + 16, groundY], [x - 13, groundY]], '#FFD98A');
    g.restore();
  }
}

export function tree(g, x, groundY, h, trunk, leaf, seed) {
  px(g, x - 3, groundY - h * 0.45, 7, h * 0.45, trunk[BASE]);
  px(g, x - 3, groundY - h * 0.45, 2, h * 0.45, trunk[LT]);
  px(g, x + 3, groundY - h * 0.45, 1, h * 0.45, trunk[S]);
  const cy = groundY - h * 0.72;
  const blobs = [[0, -h * 0.2, 20], [-14, -h * 0.08, 15], [13, -h * 0.05, 16], [-6, h * 0.06, 15], [7, h * 0.09, 14]];
  blobs.forEach(([dx, dy, r], i) => {
    const rr = r * (0.85 + ((seed + i * 7) % 5) * 0.06);
    ellipse(g, x + dx, cy + dy, rr, rr * 0.82, leaf[BASE]);
  });
  blobs.forEach(([dx, dy, r], i) => {
    if (i % 2) return;
    ellipse(g, x + dx - r * 0.25, cy + dy - r * 0.3, r * 0.55, r * 0.45, leaf[LT]);
  });
  ellipse(g, x + 6, cy + h * 0.14, 14, 9, leaf[SH]);
  ellipse(g, x - 9, cy - h * 0.16, 6, 5, leaf[RIM]);
}

export function vending(g, x, groundY, ramp, glow) {
  const w = 22, h = 38;
  px(g, x, groundY - h, w, h, ramp[BASE]);
  px(g, x, groundY - h, 2, h, ramp[LT]);
  px(g, x + w - 2, groundY - h, 2, h, ramp[S]);
  px(g, x + 2, groundY - h + 3, w - 6, 20, '#0C0E18');
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      px(g, x + 4 + c * 5, groundY - h + 5 + r * 6, 3, 4, glow[(r + c) % glow.length]);
    }
  }
  px(g, x + 3, groundY - h + 26, w - 8, 5, ramp[SH]);
  px(g, x + 4, groundY - h + 27, 3, 3, '#FFE9A8');
  px(g, x, groundY - 3, w, 3, ramp[S]);
}

export function dumpster(g, x, groundY, ramp) {
  const w = 40, h = 22;
  px(g, x, groundY - h, w, h, ramp[BASE]);
  px(g, x, groundY - h, w, 3, ramp[LT]);
  px(g, x, groundY - h + 3, 3, h - 3, ramp[LT]);
  px(g, x + w - 4, groundY - h + 3, 4, h - 3, ramp[S]);
  px(g, x - 2, groundY - h - 3, w + 4, 4, ramp[SH]);
  px(g, x - 2, groundY - h - 3, w + 4, 1, ramp[RIM]);
  for (let i = 0; i < 3; i++) px(g, x + 6 + i * 12, groundY - h + 6, 2, h - 9, ramp[S]);
  px(g, x + 2, groundY - 3, 4, 3, '#0A0A0E');
  px(g, x + w - 8, groundY - 3, 4, 3, '#0A0A0E');
}

export function acUnit(g, x, y, ramp) {
  px(g, x, y, 16, 12, ramp[BASE]);
  px(g, x, y, 16, 2, ramp[LT]);
  px(g, x, y + 10, 16, 2, ramp[S]);
  disc(g, x + 8, y + 6, 4, ramp[S]);
  disc(g, x + 8, y + 6, 2, ramp[SH]);
  px(g, x + 1, y + 12, 3, 3, ramp[S]);
  px(g, x + 12, y + 12, 3, 3, ramp[S]);
}

export function fireEscape(g, x, y, w, h, ramp) {
  for (let ly = y; ly < y + h; ly += 22) {
    px(g, x, ly, w, 2, ramp[BASE]);
    px(g, x, ly, w, 1, ramp[LT]);
    for (let i = 0; i < w; i += 5) px(g, x + i, ly - 9, 1, 9, ramp[SH]);
    px(g, x, ly - 10, w, 1, ramp[SH]);
    for (let i = 0; i < 10; i++) px(g, x + w - 14 + i, ly + 2 + i * 1.8, 8, 1, ramp[SH]);
  }
  px(g, x - 2, y, 2, h, ramp[SH]);
}

export function fence(g, x0, x1, groundY, h, ramp) {
  px(g, x0, groundY - h, x1 - x0, 2, ramp[BASE]);
  px(g, x0, groundY - h + 8, x1 - x0, 2, ramp[SH]);
  for (let x = x0; x < x1; x += 7) {
    px(g, x, groundY - h - 2, 2, h + 2, ramp[BASE]);
    px(g, x, groundY - h - 2, 1, h + 2, ramp[LT]);
  }
}

export function hills(g, W, y, amp, ramp, seed) {
  for (let x = 0; x < W; x++) {
    const n = Math.sin((x + seed * 40) * 0.013) * amp
      + Math.sin((x + seed * 17) * 0.031) * amp * 0.4
      + Math.sin((x + seed * 91) * 0.007) * amp * 0.8;
    const top = Math.round(y - n);
    px(g, x, top, 1, 200, ramp[BASE]);
    px(g, x, top, 1, 2, ramp[LT]);
  }
}

export function cloudPuff(g, x, y, w, h, ramp) {
  ellipse(g, x, y, w * 0.5, h * 0.5, ramp[BASE]);
  ellipse(g, x - w * 0.28, y + h * 0.14, w * 0.3, h * 0.36, ramp[BASE]);
  ellipse(g, x + w * 0.3, y + h * 0.1, w * 0.32, h * 0.38, ramp[BASE]);
  ellipse(g, x - w * 0.1, y - h * 0.22, w * 0.3, h * 0.34, ramp[LT]);
  ellipse(g, x + w * 0.12, y + h * 0.3, w * 0.34, h * 0.22, ramp[SH]);
}
