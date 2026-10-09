/* GARDEN — the tools every room's stage is drawn with: whole-pixel rectangles and staircase discs (no anti-aliasing), a seeded dice so a still picture is the same
   picture every time, colours that dim with the day, and cached sprites (a cloud, a halo of light) made once and stamped. Nothing here knows about a room. */
export const W = 700, H = 436;
export const TAU = Math.PI * 2;

export const rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;

/* a small seeded dice (mulberry32): the same seed rolls the same numbers */
export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const rgbOf = hex => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const hexOf = a => '#' + a.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
/* a colour dimmed (k < 1) to the time of day */
export const shade = (hex, k) => { const c = rgbOf(hex); return 'rgb(' + Math.round(c[0] * k) + ',' + Math.round(c[1] * k) + ',' + Math.round(c[2] * k) + ')'; };
export const mix = (a, b, t) => { const x = rgbOf(a), y = rgbOf(b); return hexOf([lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)]); };
/* a colour then dimmed, as a function: L('#4a6630') */
export const lighting = k => hex => shade(hex, k);

/* a disc as a staircase of one-pixel rows: what a circle is on a machine with no anti-aliasing */
export function disc(g, cx, cy, r, fill) {
  g.fillStyle = fill;
  for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy))); g.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2 + 1, 1); }
}
/* an ellipse the same way */
export function oval(g, cx, cy, rx, ry, fill) {
  g.fillStyle = fill;
  for (let dy = -ry; dy <= ry; dy++) { const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry)))); g.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2 + 1, 1); }
}
/* a line of single pixels (for a blade, a rope, a ray) */
export function line(g, x0, y0, x1, y1, c, th = 1) {
  g.fillStyle = c;
  const n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), th, th);
}

/* sprites: drawn once into a canvas of their own, then stamped */
const sprites = new Map();
export function sprite(key, w, h, draw) {
  let s = sprites.get(key);
  if (!s) { s = document.createElement('canvas'); s.width = w; s.height = h; const sg = s.getContext('2d'); sg.imageSmoothingEnabled = false; draw(sg); sprites.set(key, s); }
  return s;
}

/* a pool of light: concentric steps of one colour, stamped with the 'lighter' blend so it adds to what is under it. `a` is its strength at the middle. */
export function glow(g, x, y, r, rgb, a) {
  if (a <= 0.01) return;
  const key = 'glow:' + r + ':' + rgb;
  const s = sprite(key, r * 2 + 1, r * 2 + 1, sg => {
    const rings = Math.max(4, Math.min(9, r >> 2));
    for (let i = rings; i >= 1; i--) { const rr = Math.round(r * i / rings); disc(sg, r, r, rr, 'rgba(' + rgb + ',' + (0.9 / rings * (rings - i + 1) * 0.55).toFixed(3) + ')'); }
  });
  const prev = g.globalCompositeOperation, pa = g.globalAlpha;
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = clamp(a, 0, 1);
  g.drawImage(s, Math.round(x - r), Math.round(y - r));
  g.globalCompositeOperation = prev; g.globalAlpha = pa;
}
/* a slanted shaft of light from (x, y0) falling to the right as it goes down, `w` wide at the top, `len` long */
export function shaft(g, x, y0, w, len, lean, rgb, a) {
  if (a <= 0.005) return;
  const prev = g.globalCompositeOperation;
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < len; i += 2) {
    const f = i / len, al = a * (1 - f) * (0.55 + 0.45 * Math.sin(f * 9));
    g.fillStyle = 'rgba(' + rgb + ',' + al.toFixed(3) + ')';
    g.fillRect(Math.round(x + lean * f * len), Math.round(y0 + i), Math.round(w * (1 + f * 0.8)), 2);
  }
  g.globalCompositeOperation = prev;
}

/* one cached static layer per room: painted once for the time of day it is painted for (and the drip line), stamped every frame */
const layers = new Map();
export function layer(key, paint) {
  let c = layers.get(key);
  if (c) return c;
  if (layers.size > 9) layers.delete(layers.keys().next().value);
  c = document.createElement('canvas'); c.width = W; c.height = H;
  const lg = c.getContext('2d'); lg.imageSmoothingEnabled = false;
  paint(lg); layers.set(key, c);
  return c;
}
export function dropLayers() { layers.clear(); }

/* ---- the sun and the moon cross the sky as the garden's day goes round (model.js: light = 0.5 + 0.5 cos of the day's turn, so noon is the start of the day) ---- */
export const DAY = 20 * 60 * 1000;
export const dayTurn = now => (((now % DAY) + DAY) % DAY) / DAY;
/* where a body is: `up` is how high (1 at the top of its arc, 0 on the horizon, negative below), x runs across `span` pixels centred on the middle */
export function bodyAt(turn, moon, horizon, top, span) {
  const a = turn * TAU, up = moon ? -Math.cos(a) : Math.cos(a), sx = moon ? -Math.sin(a) : Math.sin(a);
  return { up, x: W / 2 + sx * span, y: horizon - Math.max(up, -0.3) * (horizon - top) };
}
export function skyBodies(g, K, horizon = 100, top = 40, span = 300) {
  const turn = dayTurn(K.now);
  const sun = bodyAt(turn, false, horizon, top, span), moon = bodyAt(turn, true, horizon, top, span);
  if (sun.up > -0.12) {
    const a = clamp(0.4 + sun.up * 1.6, 0, 1) * (1 - (K.rain || 0) * 0.5);
    disc(g, sun.x, sun.y, 20, 'rgba(255,238,150,' + (a * 0.28).toFixed(2) + ')');
    disc(g, sun.x, sun.y, 15, 'rgba(255,246,196,' + (a * 0.9).toFixed(2) + ')');
    disc(g, sun.x, sun.y, 10, 'rgba(255,253,236,' + (a * 0.95).toFixed(2) + ')');
  }
  if (moon.up > -0.12) {
    const a = clamp(0.4 + moon.up * 1.6, 0, 1) * (1 - (K.rain || 0) * 0.6);
    disc(g, moon.x, moon.y, 17, 'rgba(236,240,220,' + (a * 0.95).toFixed(2) + ')');
    disc(g, moon.x - 5, moon.y - 5, 4, 'rgba(198,204,182,' + (a * 0.95).toFixed(2) + ')'); disc(g, moon.x + 7, moon.y + 5, 3, 'rgba(198,204,182,' + (a * 0.95).toFixed(2) + ')'); disc(g, moon.x + 2, moon.y + 10, 2, 'rgba(198,204,182,' + (a * 0.95).toFixed(2) + ')');
  }
  return { sun, moon };
}

/* the season by the real calendar: the yard changes with the year (and a test can say which) */
export function seasonOf(date = new Date()) { const m = date.getMonth(); return m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'autumn' : 'winter'; }
