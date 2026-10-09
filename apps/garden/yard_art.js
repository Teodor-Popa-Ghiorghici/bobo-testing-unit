/* GARDEN — the yard's pieces and the four seasons they wear: the lawn, the picket fence, the shed, the big trees (leafy, in blossom, orange, or bare), the birdhouse and its visitor,
   and what falls through the year. Whole pixels; every still piece takes `L`, the colour-to-the-light function. */
import { W, H, rect, disc, oval, line, rng, clamp } from './stage_kit.js';

export const SEASONS = {
  summer: { leaf: ['#244a24', '#2f5a2c', '#3d6b34', '#58863f'], lawn: ['#4f8a3a', '#468032', '#5c9a42'], fence: '#ece8e0', hill: '#6f9488', blade: ['#628040', '#4a6a2e', '#7aa04a'], flowers: ['#f4a8c8', '#fff0a0', '#ffffff', '#c8a0ff', '#ff9a8a'], skyTint: null },
  spring: { leaf: ['#7a3a5a', '#c86a98', '#e898b8', '#f6c4d6'], lawn: ['#5a9a40', '#4e8c38', '#6aaa4a'], fence: '#f0ece6', hill: '#78a08c', blade: ['#6a9a48', '#528a38', '#88b858'], flowers: ['#ffffff', '#fff0a0', '#f4a8c8', '#c8d8ff', '#ffc8e0'], skyTint: null },
  autumn: { leaf: ['#7a2a1a', '#b8402a', '#d8782a', '#e8a838'], lawn: ['#6a7a34', '#5c6c2c', '#7a8a3c'], fence: '#e4dccc', hill: '#8a8a64', blade: ['#7a8a3c', '#5c6c2c', '#a09a44'], flowers: ['#d89a3a', '#c85a28', '#e8c050', '#a85a3a'], skyTint: 'rgba(214,120,60,0.10)' },
  winter: { leaf: ['#4a3040', '#5a4050', '#6a5060', '#7a6070'], lawn: ['#b4c2d8', '#c4d0e2', '#d6e0ee'], fence: '#e8ecf4', hill: '#8a9ab8', blade: ['#8a9ab0', '#a0aec4', '#c0cadc'], flowers: ['#ffffff'], skyTint: 'rgba(110,130,200,0.16)' }
};

export function lawn(g, L, P, season) {
  const r = rng(3);
  rect(g, 0, 150, W, H - 150, L(P.lawn[0]));
  for (let y = 150, k = 0; y < H; y += 24, k++) if (k & 1) rect(g, 0, y, W, 24, L(P.lawn[1]));
  for (let i = 0; i < 520; i++) { const x = Math.floor(r() * W), y = 156 + Math.floor(r() * (H - 160)); rect(g, x, y, 1 + (i & 1), 1, L(i % 3 ? P.lawn[2] : P.lawn[1])); }
  if (season === 'winter') { for (let i = 0; i < 90; i++) rect(g, Math.floor(r() * W), 160 + Math.floor(r() * 240), 2, 1, L('#8a9ab8')); for (let i = 0; i < 30; i++) rect(g, Math.floor(r() * W), 160 + Math.floor(r() * 240), 2, 3, L('#6a7a58')); }
  else for (let i = 0; i < 50; i++) { const x = Math.floor(r() * W), y = 170 + Math.floor(r() * 220), c = P.flowers[i % P.flowers.length]; rect(g, x, y, 2, 2, L(c)); }
  rect(g, 0, 150, W, 12, 'rgba(0,0,0,0.20)'); rect(g, 0, 162, W, 6, 'rgba(0,0,0,0.08)');          /* the fence's shadow */
  rect(g, 0, H - 42, W, 42, L(P.lawn[1])); rect(g, 0, H - 42, W, 3, L(P.lawn[2]));
}

export function fence(g, L, P, season) {
  const c = P.fence, snow = season === 'winter';
  for (let x = -2; x < W; x += 9) {
    rect(g, x, 106, 7, 50, L(c)); rect(g, x + 6, 106, 1, 50, L('#b8b4a8')); rect(g, x, 106, 1, 50, L('#ffffff'));
    rect(g, x + 1, 103, 5, 3, L(c)); rect(g, x + 2, 100, 3, 3, L(c)); rect(g, x + 3, 98, 1, 2, L(c));                       /* the point */
    if (snow) { rect(g, x, 103, 7, 2, '#ffffff'); rect(g, x + 2, 100, 3, 3, '#ffffff'); }
  }
  [116, 140].forEach(y => { rect(g, 0, y, W, 5, L('#d2ccc0')); rect(g, 0, y, W, 1, L('#ece8e0')); rect(g, 0, y + 5, W, 1, 'rgba(0,0,0,0.20)'); if (snow) rect(g, 0, y - 1, W, 2, 'rgba(255,255,255,0.85)'); });
  rect(g, 0, 156, W, 3, 'rgba(0,0,0,0.25)');
}

export function shed(g, L, P, season, K) {
  const day = K.light > 0.32, snow = season === 'winter';
  rect(g, 556, 66, 136, 90, L('#7a4a34'));
  for (let y = 70; y < 156; y += 6) { rect(g, 556, y, 136, 1, L('#5a3424')); rect(g, 556, y + 1, 136, 1, L('#8a5a40')); }
  rect(g, 556, 66, 3, 90, L('#9a6a50')); rect(g, 689, 66, 3, 90, L('#4a2a1c'));
  /* the roof, overhanging, with its shingles */
  rect(g, 546, 50, 156, 20, L('#4a2c20')); rect(g, 546, 50, 156, 3, L('#6a4030')); rect(g, 546, 68, 156, 3, 'rgba(0,0,0,0.35)');
  for (let x = 546; x < 702; x += 8) rect(g, x, 53, 1, 15, L('#352016'));
  if (snow) { rect(g, 544, 44, 160, 8, '#f4f8ff'); rect(g, 550, 40, 148, 5, '#ffffff'); rect(g, 544, 52, 160, 2, '#c8d4e8'); for (let x = 548; x < 700; x += 11) rect(g, x, 54, 3, 3 + (x % 3), '#e0e8f4'); }
  else if (season === 'autumn') for (let i = 0; i < 12; i++) rect(g, 552 + i * 13 + (i % 3) * 3, 50 + (i * 5) % 14, 4, 3, L(P.leaf[2 + (i & 1)]));
  /* the window: white frame, four panes, a box of flowers under it; warm when it is dark */
  rect(g, 572, 90, 38, 32, L('#ece8e0')); rect(g, 575, 93, 32, 26, day ? L('#9cc4e0') : '#ffd070');
  rect(g, 590, 93, 2, 26, L('#ece8e0')); rect(g, 575, 105, 32, 2, L('#ece8e0'));
  if (day) { rect(g, 577, 95, 5, 3, 'rgba(255,255,255,0.5)'); rect(g, 593, 95, 5, 3, 'rgba(255,255,255,0.35)'); }
  else { rect(g, 577, 95, 12, 9, '#ffe49a'); rect(g, 593, 108, 12, 9, '#ffe49a'); }
  rect(g, 570, 122, 42, 7, L('#5a3a28')); rect(g, 570, 122, 42, 2, L('#7a5238'));
  for (let i = 0; i < 7; i++) { rect(g, 572 + i * 6, 118, 2, 5, L('#3e6a2c')); rect(g, 571 + i * 6, 115, 4, 4, L(snow ? '#d8e0f0' : P.flowers[i % P.flowers.length])); }
  /* the door with its handle, and the step */
  rect(g, 628, 98, 36, 58, L('#ece8e0')); rect(g, 631, 101, 30, 55, L('#3a2418')); rect(g, 631, 101, 30, 2, L('#5a3a28'));
  for (let x = 636; x < 660; x += 8) rect(g, x, 103, 1, 53, L('#2a1810'));
  rect(g, 652, 130, 3, 5, L('#d8b858')); rect(g, 626, 156, 40, 4, L('#8a8478')); rect(g, 626, 156, 40, 1, L('#b4aea0'));
}

/* a tree is a heap of round puffs: a dark one under, a mid one over it, a light one up-left of that, with specks of light through it */
export function canopy(g, L, P, side) {
  const r = rng(side === 'left' ? 41 : 77), blobs = side === 'left'
    ? [[14, 14, 44], [70, 30, 38], [118, 8, 32], [160, 40, 30], [196, 18, 24], [34, 70, 30], [92, 74, 26], [140, 84, 16], [186, 66, 14], [4, 40, 24]]
    : [[560, 6, 30], [610, 0, 34], [660, 10, 30], [700, 24, 30], [586, 40, 16], [640, 46, 14], [684, 52, 14]];
  blobs.forEach(([x, y, rad]) => { disc(g, x + 3, y + 5, rad, L(P.leaf[0])); });
  blobs.forEach(([x, y, rad]) => { disc(g, x, y, rad, L(P.leaf[1])); });
  blobs.forEach(([x, y, rad]) => { disc(g, x - 3, y - 4, Math.round(rad * 0.7), L(P.leaf[2])); });
  blobs.forEach(([x, y, rad], i) => { disc(g, x - 8, y - 9, Math.round(rad * 0.34), L(P.leaf[3])); void i; });
  blobs.forEach(([x, y, rad]) => { for (let k = 0; k < rad * 0.9; k++) { const a = r() * 6.283, d = r() * rad * 0.95; rect(g, x + Math.cos(a) * d, y + Math.sin(a) * d, 2, 2, L(P.leaf[(k + 1) % 4])); } });
  if (side === 'left') { rect(g, 118, 56, 1, 28, L('#2a1a10')); }
}

/* a bare tree: branches forking out from the corner, a thin dark line each, snow along the tops */
export function bare(g, L, x0, y0, sc) {
  const r = rng(Math.floor(x0) + 5), col = L('#4a3040');
  const branch = (x, y, a, len, depth, w) => {
    if (depth <= 0 || len < 4) return;
    const x1 = x + Math.cos(a) * len, y1 = y + Math.sin(a) * len;
    line(g, x, y, x1, y1, col, w);
    if (x1 > 0 && x1 < W && y1 < 110) { g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(Math.round((x + x1) / 2), Math.round((y + y1) / 2) - 1, 3, 1); }
    branch(x1, y1, a + (0.2 + r() * 0.4), len * 0.74, depth - 1, Math.max(1, w - 1));
    branch(x1, y1, a - (0.2 + r() * 0.5), len * 0.7, depth - 1, Math.max(1, w - 1));
  };
  const leftSide = x0 < W / 2;
  branch(leftSide ? 0 : W, -4, leftSide ? 0.9 : 2.2, 56 * sc, 6, 4);
  branch(leftSide ? 0 : W, -4, leftSide ? 0.4 : 2.7, 48 * sc, 6, 3);
  branch(leftSide ? 20 : W - 20, -4, leftSide ? 1.3 : 1.8, 40 * sc, 5, 3);
}

/* the birdhouse swinging from a bough (it is where it was in the picture, on the left), and now and then a bird comes and sits on its perch */
export function birdhouse(g, K, t) {
  const { L, season } = K, sw = Math.sin(t * 0.7) * (1.5 + K.wind * 3), x = 128 + sw, y = 82;
  line(g, 128, 54, x + 8, y, L('#6a5238'));
  rect(g, x, y, 16, 15, L('#b8805a')); rect(g, x, y, 3, 15, L('#d09a70')); rect(g, x + 13, y, 3, 15, L('#8a5a3a'));
  for (let i = 0; i < 9; i++) rect(g, x - 2 + i, y - 2 - i, 1, 2, L('#a83a2a')), rect(g, x + 18 - i, y - 2 - i, 1, 2, L('#a83a2a'));
  rect(g, x - 3, y - 3, 22, 2, L('#7a2a1c')); rect(g, x + 4, y - 11, 8, 2, L('#c84a38'));
  disc(g, x + 8, y + 6, 3, 'rgb(24,16,10)'); rect(g, x + 6, y + 11, 5, 2, L('#d8b890'));
  const cyc = (t % 26) / 26;                                           /* 26 s: away, then it lands, hops, looks about, and goes */
  if (K.light > 0.4 && season !== 'winter' && cyc > 0.55 && cyc < 0.8) {
    const f = (cyc - 0.55) / 0.25, hop = f > 0.15 && f < 0.85 ? Math.abs(Math.sin(f * 40)) * 2 : 0, bx = x + 4 - (f < 0.15 ? (0.15 - f) * 220 : 0), by = y + 11 - hop - (f < 0.15 ? (0.15 - f) * 90 : f > 0.85 ? (f - 0.85) * 160 : 0);
    const bc = season === 'autumn' ? '#c85a28' : '#4a78c8';
    rect(g, bx, by - 4, 7, 4, L(bc)); rect(g, bx + 5, by - 6, 4, 4, L(bc)); rect(g, bx + 9, by - 5, 2, 1, L('#e8b838')); rect(g, bx - 3, by - 3, 4, 1, L('#2a3a60')); rect(g, bx + 1, by - 1, 4, 2, L('#e8e0d0')); rect(g, bx + 6, by - 5, 1, 1, '#101010');
  }
}

/* what falls or flies through the year: butterflies and bees, petals, leaves, snow. None of it is kept: every one is a sum of the clock. */
export function seasonFall(g, K, season) {
  const { tsec, night, wind, rain } = K;
  const drift = (i, speedY, speedX, w) => ({ x: ((i * 83.7 + tsec * (speedX + wind * 14) + Math.sin(tsec * 0.6 + i) * w) % (W + 40) + W + 40) % (W + 40) - 20, y: ((i * 47.3 + tsec * speedY) % (H + 20)) - 10 });
  if ((season === 'summer' || season === 'spring') && !night && !rain) {
    for (let i = 0; i < 5; i++) {
      const p = tsec * 0.5 + i * 1.9, x = (i * 160 + tsec * 14 + Math.sin(p) * 40) % (W + 40) - 20, y = 250 + Math.sin(p * 1.7 + i) * 60 + (i % 3) * 20, f = Math.sin(tsec * 16 + i * 3) > 0, c = ['#ffb040', '#8ab8ff', '#ff8aa8', '#f0f060', '#c090ff'][i];
      rect(g, x, y, 1, 3, 'rgb(30,24,20)'); rect(g, x - (f ? 3 : 1), y - 1, f ? 3 : 1, 3, c); rect(g, x + 1, y - 1, f ? 3 : 1, 3, c);
    }
    if (season === 'summer') for (let i = 0; i < 3; i++) { const bx = 120 + i * 190 + Math.sin(tsec * 1.3 + i * 2) * 40, by = 330 + Math.sin(tsec * 2.1 + i) * 14; rect(g, bx, by, 3, 2, '#f0c020'); rect(g, bx + 1, by, 1, 2, '#202020'); rect(g, bx, by - 2, 2, 1, 'rgba(255,255,255,0.7)'); }
  }
  if (season === 'spring') for (let i = 0; i < 26; i++) { const p = drift(i, 14 + (i % 7) * 3, 6 + (i % 5), 24); rect(g, p.x, p.y, 2, 2, ['#ffd0e0', '#ffffff', '#f4a8c8'][i % 3]); }
  if (season === 'autumn') for (let i = 0; i < 22; i++) {
    const p = drift(i, 20 + (i % 6) * 5, 10 + (i % 5) * 2, 30), flip = Math.abs(Math.cos(tsec * 2 + i)) * 3 + 1;
    rect(g, p.x, p.y, flip, 3, ['#d8782a', '#b8402a', '#e8a838', '#c85a28'][i % 4]); rect(g, p.x, p.y, flip, 1, 'rgba(255,255,255,0.18)');
  }
  if (season === 'winter') for (let i = 0; i < 80; i++) { const p = drift(i, 18 + (i % 9) * 4, 3 + (i % 4), 14); g.fillStyle = 'rgba(255,255,255,' + (night ? 0.9 : 0.8) + ')'; g.fillRect(Math.round(p.x), Math.round(p.y), 1 + (i % 4 === 0), 1 + (i % 4 === 0)); }
}
void oval; void clamp;
