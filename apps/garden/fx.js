/* GARDEN — what happens in the air of every room, whichever it is: the weather (rain comes and goes by the clock, so it is raining for everyone at once, and now and then
   there is lightning), the puffs and splashes of what you do (water, soil, a leaf, a harvest), the shimmer on a plant that is holding SUN, the vignette round the glass
   and the fade when you walk into another room. Whole pixels throughout. */
import { W, H, rect, rng, sprite, glow, clamp } from './stage_kit.js';

const hash = n => { let x = (n | 0) * 374761393 + 668265263; x = (x ^ (x >>> 13)) * 1274126177; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };

/* 0 = dry, 1 = pouring. Four-minute slots of the real clock; a quarter of them are wet, and the rain eases in and out over twenty seconds */
export const SLOT = 4 * 60e3;
export function rainAt(now) {
  const slot = Math.floor(now / SLOT), into = (now % SLOT) / 1000, wet = s => hash(s * 7 + 3) < 0.27;
  if (!wet(slot)) return 0;
  const inn = clamp(into / 20, 0, 1), out = clamp((SLOT / 1000 - into) / 20, 0, 1);
  return Math.min(inn, out) * (0.55 + 0.45 * hash(slot + 91));
}
/* a white flash now and then in a heavy rain (0..1) */
export function flashAt(now, rain) {
  if (rain < 0.5) return 0;
  const s = Math.floor(now / 7000), ph = (now % 7000) / 1000;
  if (hash(s * 13 + 1) > 0.22) return 0;
  return ph < 0.7 ? Math.max(0, 1 - ph * 1.6) * (0.55 + 0.45 * Math.sin(ph * 40)) : 0;
}
export const windAt = (tsec, now) => clamp(0.35 + 0.35 * Math.sin(tsec * 0.13) + 0.3 * Math.sin(tsec * 0.37 + 1.3) + rainAt(now) * 0.3, 0, 1);

export function createFx() {
  return { drops: [], ripples: [], bursts: [], last: -1, trans: 0, shake: 0, seeded: false, rngv: rng(77) };
}

/* ---- the rain: streaks, and rings where they land on the lawn or the deck ---- */
export function drawRain(fx, g, K, floorY) {
  if (K.rain < 0.02) { fx.ripples.length = 0; return; }
  const want = Math.round(190 * K.rain);
  while (fx.drops.length < want) fx.drops.push({ x: Math.random() * (W + 120) - 60, y: -Math.random() * H, v: 380 + Math.random() * 160 });
  if (fx.drops.length > want) fx.drops.length = want;
  const lean = 0.18 + K.wind * 0.25;
  g.fillStyle = K.night ? 'rgba(170,190,235,0.6)' : 'rgba(205,225,250,0.7)';
  for (const d of fx.drops) {
    d.y += d.v * K.dt; d.x += d.v * K.dt * lean;
    if (d.y > H - 6 - Math.random() * (H - floorY) * 0.9) {
      if (fx.ripples.length < 40 && Math.random() < 0.5) fx.ripples.push({ x: d.x, y: Math.max(floorY, d.y), t: 0 });
      d.y = -10 - Math.random() * 60; d.x = Math.random() * (W + 120) - 60;
    }
    g.fillRect(Math.round(d.x), Math.round(d.y), 1, 7); g.fillRect(Math.round(d.x - 1), Math.round(d.y + 6), 1, 3);
  }
  for (let i = fx.ripples.length - 1; i >= 0; i--) {
    const r = fx.ripples[i]; r.t += K.dt * 2.4;
    if (r.t > 1) { fx.ripples.splice(i, 1); continue; }
    const w = 2 + Math.round(r.t * 9);
    g.fillStyle = 'rgba(210,230,250,' + (0.6 * (1 - r.t)).toFixed(2) + ')';
    g.fillRect(Math.round(r.x - w), Math.round(r.y), w * 2, 1);
  }
}

/* ---- what your hands do ---- */
const KINDS = {
  water: { n: 14, c: ['#8fc8ff', '#c8e4ff', '#5a9ae0'], vy: [-70, -20], vx: 46, g: 260, life: 0.7, s: 2 },
  dirt:  { n: 12, c: ['#6b4a2a', '#8a6238', '#4a3418'], vy: [-90, -30], vx: 50, g: 320, life: 0.6, s: 2 },
  leaf:  { n: 9,  c: ['#6fcf5a', '#3fa040', '#a8e070'], vy: [-60, -10], vx: 40, g: 40,  life: 1.3, s: 3, flutter: 1 },
  coin:  { n: 18, c: ['#ffe45a', '#fff4a0', '#ffffff', '#ffb02a'], vy: [-120, -40], vx: 60, g: 190, life: 0.95, s: 2, glow: 1 },
  pull:  { n: 16, c: ['#6b4a2a', '#6fcf5a', '#8a6238', '#3fa040'], vy: [-110, -40], vx: 70, g: 300, life: 0.8, s: 2 }
};
export function burst(fx, kind, x, y, scale = 1) {
  const K = KINDS[kind]; if (!K || fx.bursts.length > 220) return;
  for (let i = 0, n = Math.round(K.n * scale); i < n; i++) {
    const a = Math.random() * 2 - 1;
    fx.bursts.push({ x: x + a * 8, y, vx: a * K.vx + (Math.random() - 0.5) * 20, vy: K.vy[0] + Math.random() * (K.vy[1] - K.vy[0]), g: K.g, t: 0, life: K.life * (0.7 + Math.random() * 0.6), c: K.c[i % K.c.length], s: K.s, f: K.flutter ? 1 : 0, gl: K.glow ? 1 : 0, p: Math.random() * 6 });
  }
}
export function drawBursts(fx, g, dt) {
  for (let i = fx.bursts.length - 1; i >= 0; i--) {
    const p = fx.bursts[i]; p.t += dt;
    if (p.t > p.life) { fx.bursts.splice(i, 1); continue; }
    p.vy += p.g * dt; p.x += p.vx * dt + (p.f ? Math.sin(p.t * 8 + p.p) * 30 * dt : 0); p.y += p.vy * dt * (p.f ? 0.4 : 1);
    if (p.f) p.vy = Math.min(p.vy, 30);
    const a = 1 - p.t / p.life;
    g.globalAlpha = clamp(a * 1.4, 0, 1);
    rect(g, p.x, p.y, p.s, p.s, p.c);
    if (p.gl) { g.globalAlpha = a * 0.5; rect(g, p.x - 1, p.y - 1, p.s + 2, p.s + 2, 'rgba(255,230,120,0.5)'); }
  }
  g.globalAlpha = 1;
}

/* ---- a plant holding SUN: a slow pulse of gold round its head and a spark or two that climb and go ---- */
export function shimmer(g, cx, topY, tsec, seed, n) {
  const a = 0.35 + 0.2 * Math.sin(tsec * 2.4 + seed);
  glow(g, cx, topY + 10, 24, '255,214,90', a * Math.min(1, 0.5 + n * 0.1));
  for (let k = 0; k < 3; k++) {
    const ph = (tsec * 0.8 + seed * 0.37 + k * 0.33) % 1, x = cx + Math.sin(seed * 3 + k * 2.1 + ph * 3) * (10 + k * 4), y = topY + 14 - ph * 34;
    g.globalAlpha = Math.sin(ph * Math.PI);
    rect(g, x, y, 2, 2, '#fff4b0'); rect(g, x - 1, y + 0.5, 4, 1, 'rgba(255,244,176,0.7)'); rect(g, x + 0.5, y - 1, 1, 4, 'rgba(255,244,176,0.7)');
  }
  g.globalAlpha = 1;
}

/* ---- the frame: edges that darken, stronger at night, and a fade when the room changes ---- */
function vignetteSprite() {
  return sprite('vignette', W, H, g => {
    for (let i = 0; i < 24; i++) {
      const a = 0.30 * Math.pow(1 - i / 24, 2.2);
      g.fillStyle = 'rgba(0,0,0,' + a.toFixed(3) + ')';
      g.fillRect(i * 2, i * 2, W - i * 4, 2); g.fillRect(i * 2, H - i * 2 - 2, W - i * 4, 2);
      g.fillRect(i * 2, i * 2, 2, H - i * 4); g.fillRect(W - i * 2 - 2, i * 2, 2, H - i * 4);
    }
  });
}
export function vignette(g, strength) {
  g.globalAlpha = clamp(strength, 0, 1);
  g.drawImage(vignetteSprite(), 0, 0);
  g.globalAlpha = 1;
}
/* the room just changed: start a fade; and draw one that is running (a dark curtain that lifts, a faint tint of the room's own colour) */
export function transition(fx, g, ri, dt, tint) {
  if (fx.last !== ri) { if (fx.last >= 0) fx.trans = 1; fx.last = ri; }
  if (fx.trans <= 0) return;
  fx.trans = Math.max(0, fx.trans - dt * 3.2);
  const a = fx.trans * fx.trans;
  g.fillStyle = 'rgba(0,0,0,' + (a * 0.9).toFixed(3) + ')'; g.fillRect(0, 0, W, H);
  g.fillStyle = tint.replace(/[\d.]+\)$/, (a * 0.35).toFixed(3) + ')'); g.fillRect(0, 0, W, H);
  const bars = Math.round(a * 14);                     /* the venetian-blind wipe: rows that fall away from the top */
  for (let y = 0; y < H; y += 14) rect(g, 0, y, W, bars, 'rgba(0,0,0,0.9)');
}
