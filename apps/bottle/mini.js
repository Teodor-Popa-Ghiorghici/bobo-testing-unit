/* A bottle in little, drawn from the same parts as the one on the table (shapes.js rows, the label's size, the cap): on the shelf in the room behind the table (room.js) and on a card in Dave's shop (apps/shop/thumbs.js). */
import { paletteOf } from './drinks.js';
import { geometry } from './shapes.js';

/* the glass from its rows, the label, the cap and a line of light, at `k` of its size, standing on `base` with its middle at x; returns how wide it is */
export function miniBottle(R, d, x, base, k) {
  const P = paletteOf(d), G = geometry(P.shape, P.capKind), K = Object.assign({ glass: '#1f5a28', glassHi: '#46a04e', label: '#f08a14', cap: '#195226' }, P.colors);
  G.rows.forEach(w => R(x - w.hw * k, base - (w.y + 2) * k, Math.max(1, w.hw * 2 * k), Math.max(1, 2 * k), K.glass));
  const lw = Math.max(3, G.label.w * k), lt = base - (G.label.top + G.label.h) * k;
  R(x - lw / 2, lt, lw, Math.max(3, G.label.h * k), K.label);
  R(x - lw / 2, lt, lw, 1, K.ink || '#14100a');
  const bw = G.bodyHW * k; R(x - bw + 1, base - (G.bodyTop - 6) * k, 1, Math.max(2, (G.bodyTop - 14) * k), K.glassHi);
  const cw = Math.max(2, G.lipHW * 2 * k); R(x - cw / 2, base - G.top * k - 2, cw, 3, K.cap);
  return Math.max(4, Math.round(G.bodyHW * 2 * k));
}

