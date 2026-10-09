/* GARDEN — the picture of a pot, a plant and the sky over them. Whole pixels, no anti-aliasing; every function takes the canvas
   context it draws on and nothing else, so `scene.js` decides where things go. */
import { cookie, runsOf } from '../gifts_art.js';
const BAYER4 = [
  [0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]
];
const SkyCache = { step: -1, cv: null };

export function dimCol(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k), g2 = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
  return 'rgb(' + r + ',' + g2 + ',' + b + ')';
}


export function drawPot(g, x, y, pot, s, k) {
  const c = (k == null || k >= 0.999) ? pot.c : pot.c.map(h => dimCol(h, k));
  const W = Math.round(44 * s), H = Math.round(30 * s), lip = Math.max(2, Math.round(5 * s));
  g.fillStyle = c[0];
  g.fillRect(x, y, W, lip);
  g.fillStyle = c[1];
  g.fillRect(x, y, W, Math.max(1, Math.round(2 * s)));
  const steps = Math.max(3, Math.round(6 * s));
  const bodyH = H - lip;
  for (let i = 0; i < steps; i++) {
    g.fillRect(x + i, y + lip + Math.round((i / steps) * bodyH), W - i * 2, Math.round((1 / steps) * bodyH) + 1);
  }
}


export function drawSunToken(g, x, y, s) {
  const h = s / 2;
  g.fillStyle = '#AA5500';
  g.fillRect(x + 1, y + 1, s - 2, s - 2);
  g.fillStyle = '#FFFF55';
  g.fillRect(x + 2, y + 1, s - 4, s - 2);
  g.fillRect(x + 1, y + 2, s - 2, s - 4);
  g.fillStyle = '#FFFFFF';
  g.fillRect(x + 2, y + 2, 2, 2);
  g.fillStyle = '#FFFF55';
  g.fillRect(x + h - 1, y - 2, 2, 2);
}

export function drawPlant(g, cx, baseY, sp, stage, t, s, wig, dark) {
  if (stage < 0) return;
  const c = sp.hue;
  const sway = Math.sin(t * 0.9 + cx) * (1.2 + stage * 0.5) * s;
  const sq = wig ? Math.sin(wig * 18) * 0.22 * wig : 0;
  const S = s * (1 - sq), SY = s * (1 + sq);
  const shade = dark ? 0.55 : 1;
  const mix = col => dark ? dimCol(col, shade) : col;
  const R = (x, y, w, h, col) => { g.fillStyle = mix(col); g.fillRect(Math.round(cx + x * S + sway), Math.round(baseY - y * SY), Math.max(1, Math.round(w * S)), Math.max(1, Math.round(h * SY))); };

  if (stage === 0) {
    R(-2, 3, 4, 3, '#6b4a2a');
    R(-1, 4, 2, 1, '#8a6238');
    return;
  }
  const h = stage === 1 ? 8 : stage === 2 ? 16 : 26;
  /* stem */
  R(-1, h, 2, h, c[1]);
  R(-1, h, 1, h, c[0]);
  if (stage >= 1) {
    R(-7, h - 2, 6, 2, c[1]); R(-6, h - 1, 4, 2, c[0]);
    R(1, h - 5, 6, 2, c[1]);  R(1, h - 4, 4, 2, c[0]);
  }
  if (stage >= 2) {
    R(-9, h - 9, 8, 2, c[1]); R(-8, h - 8, 6, 2, c[0]);
    R(1, h - 13, 8, 2, c[1]); R(1, h - 12, 6, 2, c[0]);
  }
  if (stage === 3) {
    /* the head. Each species wears a different one. */
    if (sp.id === 'mosscap') {
      R(-7, h + 5, 14, 5, c[1]); R(-5, h + 7, 10, 3, c[2]); R(-3, h + 2, 6, 3, c[0]);
    } else if (sp.id === 'bellvine') {
      R(-4, h + 4, 8, 5, c[1]); R(-3, h + 7, 6, 3, c[2]); R(-1, h + 1, 2, 2, c[0]);
    } else if (sp.id === 'embercup') {
      R(-5, h + 6, 10, 6, c[1]); R(-3, h + 8, 6, 4, c[2]); R(-2, h + 10, 4, 2, '#ffd27a');
    } else if (sp.id === 'glassreed') {
      R(-2, h + 12, 4, 12, c[0]); R(-1, h + 12, 2, 12, c[2]); R(-4, h + 6, 8, 2, c[1]);
    } else if (sp.id === 'nightpea') {
      R(-6, h + 4, 12, 6, c[1]); R(-4, h + 6, 8, 4, c[2]);
      R(-3, h + 9, 2, 2, '#ffffff'); R(1, h + 9, 2, 2, '#ffffff');
    } else if (sp.id === 'ironbud') {
      R(-5, h + 5, 10, 7, c[1]); R(-3, h + 7, 6, 5, c[2]); R(-5, h + 5, 10, 1, c[0]);
    } else if (sp.id === 'halofern') {
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.45;
        R(Math.cos(a) * 8 - 1, h + 4 + Math.sin(a) * -8, 3, 3, i % 2 ? c[2] : c[1]);
      }
      R(-2, h + 3, 4, 3, c[0]);
    } else if (sp.id === 'starmoss') {
      R(-6, h + 4, 12, 5, c[1]); R(-4, h + 6, 8, 3, c[2]); R(-3, h + 9, 2, 2, '#ffffff'); R(2, h + 8, 1, 1, '#ffffff'); R(0, h + 11, 1, 1, '#ffffff');
    } else if (sp.id === 'suncrown') {
      R(-7, h + 4, 14, 3, c[1]);
      for (let i = -2; i <= 2; i++) R(i * 3 - 1, h + 7, 2, i % 2 ? 3 : 5, c[2]);
      R(-1, h + 3, 2, 2, c[0]);
    } else if (sp.id === 'cookiebloom') {
      /* Biscu's: cream petals round a cookie with a bite out of it, chips and all (the same cookie that is the Magen star when it is asked to be) */
      R(-11, h + 12, 5, 7, c[2]); R(6, h + 12, 5, 7, c[2]); R(-5, h + 22, 10, 5, c[2]); R(-9, h + 19, 4, 4, c[2]); R(5, h + 19, 4, 4, c[2]);
      const ink = { 0: '#2a1608', 6: c[1], 14: c[2] };
      runsOf(cookie(16)).forEach(([x, y, n, d]) => R(-8 + x, h + 16 - y, n, 1, ink[d] || c[1]));
    } else if (sp.id === 'thirdroot') {
      R(-8, h + 4, 16, 3, c[1]); R(-6, h + 7, 12, 3, c[0]); R(-4, h + 10, 8, 3, c[2]); R(-2, h + 13, 4, 3, c[0]); R(-1, h + 16, 2, 3, '#ffffff');
    } else {
      R(-6, h + 5, 12, 6, c[1]); R(-4, h + 7, 8, 4, c[2]); R(-2, h + 9, 4, 2, '#ffffff');
    }
  }
}

export function gardenSky(W, H, light, bodies = true) {
  const lvl = Math.round(light * 22), step = lvl + (bodies ? 0 : 100);
  if (SkyCache.step === step && SkyCache.cv) return SkyCache.cv;
  const cv = SkyCache.cv || document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const k = lvl / 22;
  /* three keys: night, dusk, noon — interpolated, then dithered into bands */
  const lerp = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const NIGHT = [[16, 18, 34], [26, 30, 54], [40, 44, 70]];
  const DUSK  = [[74, 52, 62], [128, 84, 74], [176, 122, 88]];
  const NOON  = [[86, 134, 186], [134, 176, 206], [198, 214, 202]];
  let top, mid, bot;
  if (k < 0.5) {
    const t = k / 0.5;
    top = lerp(NIGHT[0], DUSK[0], t); mid = lerp(NIGHT[1], DUSK[1], t); bot = lerp(NIGHT[2], DUSK[2], t);
  } else {
    const t = (k - 0.5) / 0.5;
    top = lerp(DUSK[0], NOON[0], t); mid = lerp(DUSK[1], NOON[1], t); bot = lerp(DUSK[2], NOON[2], t);
  }
  const rgb = a => 'rgb(' + a[0] + ',' + a[1] + ',' + a[2] + ')';
  const bands = 14;
  for (let b = 0; b < bands; b++) {
    const f = b / (bands - 1);
    const c = f < 0.5 ? lerp(top, mid, f / 0.5) : lerp(mid, bot, (f - 0.5) / 0.5);
    const y0 = Math.round(H * b / bands), y1 = Math.round(H * (b + 1) / bands);
    g.fillStyle = rgb(c);
    g.fillRect(0, y0, W, y1 - y0);
    /* dither the seam into the band above with the next colour up */
    if (b > 0) {
      const cPrev = f < 0.5 ? lerp(top, mid, Math.max(0, f - 1 / bands) / 0.5)
                            : lerp(mid, bot, Math.max(0, (f - 1 / bands - 0.5)) / 0.5);
      g.fillStyle = rgb(cPrev);
      for (let y = y0; y < Math.min(y0 + 8, y1); y++) {
        const thr = 15 - Math.floor((y - y0) / 8 * 16);
        for (let x = 0; x < W; x += 1) {
          if (BAYER4[y & 3][x & 3] > thr) g.fillRect(x, y, 1, 1);
        }
      }
    }
  }
  /* a disc drawn as a staircase of one-pixel rows, which is what a circle
     is on a machine with no anti-aliasing */
  const disc = (cx, cy, r, fill) => {
    g.fillStyle = fill;
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
      g.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
    }
  };
  /* stars, and one moon, fading in as the light goes (a room that draws its own sun and moon leaves the moon and the sun off) */
  if (!bodies && k < 0.42) {
    const a = 1 - k / 0.42;
    g.fillStyle = 'rgba(255,255,255,' + (a * 0.9).toFixed(2) + ')';
    for (let i = 0; i < 60; i++) { const x = (i * 977) % W, y = (i * 613) % Math.round(H * 0.6); g.fillRect(x, y, 1 + (i % 2), 1 + (i % 2)); }
  } else if (!bodies) { /* day: nothing more */ }
  else if (k < 0.42) {
    const a = 1 - k / 0.42;
    g.fillStyle = 'rgba(255,255,255,' + (a * 0.9).toFixed(2) + ')';
    for (let i = 0; i < 60; i++) {
      const x = (i * 977) % W, y = (i * 613) % Math.round(H * 0.6);
      g.fillRect(x, y, 1 + (i % 2), 1 + (i % 2));
    }
    disc(W - 80, 44, 16, 'rgba(236,240,220,' + (a * 0.95).toFixed(2) + ')');
    disc(W - 86, 38, 4, 'rgba(198,204,182,' + (a * 0.95).toFixed(2) + ')');
    disc(W - 73, 50, 3, 'rgba(198,204,182,' + (a * 0.95).toFixed(2) + ')');
    disc(W - 78, 55, 2, 'rgba(198,204,182,' + (a * 0.95).toFixed(2) + ')');
  } else if (k > 0.6) {
    const a = (k - 0.6) / 0.4;
    disc(80, 46, 20, 'rgba(255,238,150,' + (a * 0.5).toFixed(2) + ')');
    disc(80, 46, 15, 'rgba(255,246,196,' + (a * 0.92).toFixed(2) + ')');
    disc(80, 46, 10, 'rgba(255,253,236,' + (a * 0.95).toFixed(2) + ')');
  }
  SkyCache.step = step;
  SkyCache.cv = cv;
  return cv;
}
