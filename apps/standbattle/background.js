/* Morioh street backdrop -- a textured, lightly-animated streetscape
   instead of a flat silhouette: dithered sky gradient, lit/unlit window
   grids per building, a shop sign, wires on a pole, a textured sidewalk. */

import { px, dither } from './draw.js';
import { EXT } from './palette.js';

function sky(g, W, groundY) {
  const bands = [EXT.bg.sky1, EXT.bg.sky2, EXT.bg.sky3, EXT.bg.sky4, EXT.bg.sky5];
  const bandH = groundY / bands.length;
  for (let i = 0; i < bands.length; i++) {
    const y = i * bandH;
    px(g, 0, y, W, bandH + 1, bands[i]);
    if (i > 0) dither(g, 0, y - 3, W, 6, bands[i - 1], bands[i], 8);
  }
}

function cloud(g, cx, cy, tsec) {
  const x = (cx + tsec * 4) % 460 - 40;
  [[0, 0, 22, 5], [5, -3, 14, 5], [-4, 2, 30, 4]].forEach(([dx, dy, w, h]) =>
    px(g, x + dx, cy + dy, w, h, EXT.bg.cloud));
  px(g, x, cy + 4, 26, 2, EXT.bg.cloudSh);
}

const WINDOW_SEEDS = [3, 19, 47, 61, 83, 97, 5, 29, 53, 71];

function building(g, x, w, h, groundY, palette, seed, tsec) {
  const top = groundY - h;
  for (let row = 0; row < h; row++) {
    const col = row < 3 ? palette.hi : row > h - 4 ? palette.sh : palette.base;
    px(g, x, top + row, w, 1, col);
  }
  px(g, x, top, w, 2, palette.hi);
  const cols = Math.max(2, Math.floor((w - 8) / 11));
  const rows = Math.max(2, Math.floor((h - 14) / 16));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = x + 6 + c * 11, wy = top + 10 + r * 16;
      const idx = (seed * 7 + r * 13 + c * 5) % WINDOW_SEEDS.length;
      const flick = Math.sin(tsec * 1.3 + seed + r * 2 + c) > 0.985;
      const lit = (WINDOW_SEEDS[idx] % 3 !== 0) !== flick;
      px(g, wx, wy, 6, 8, EXT.bg.winFrame);
      px(g, wx + 1, wy + 1, 4, 6, lit ? EXT.bg.winLit : EXT.bg.winDim);
      if (lit) px(g, wx + 1, wy + 5, 4, 2, EXT.bg.winLitSh);
    }
  }
}

function shopSign(g, x, y) {
  px(g, x - 1, y - 1, 34, 16, EXT.bg.sign);
  px(g, x, y, 32, 2, EXT.bg.signHi);
  for (let i = 0; i < 3; i++) px(g, x + 4 + i * 9, y + 5, 6, 6, EXT.bg.signText);
  px(g, x + 15, y + 16, 2, 6, EXT.bg.pole);
}

function poleAndWires(g, x, groundY, h) {
  px(g, x, groundY - h, 2, h, EXT.bg.pole);
  px(g, x - 6, groundY - h, 14, 2, EXT.bg.pole);
  for (let i = -1; i <= 1; i++) {
    const wy = groundY - h + 3 + i * 4;
    for (let dx = 0; dx < 90; dx += 3) {
      const sag = Math.sin((dx / 90) * Math.PI) * 5;
      px(g, x + dx, wy + sag, 2, 1, EXT.bg.wireDk);
    }
  }
}

function sidewalk(g, W, groundY) {
  const h = 66;
  px(g, 0, groundY, W, h, EXT.bg.sidewalk);
  px(g, 0, groundY, W, 3, EXT.bg.curb);
  for (let x = 0; x < W; x += 34) {
    px(g, x, groundY + 4, 1, h - 4, EXT.bg.sidewalkSh);
    px(g, x + 6, groundY + 10 + (x % 17), 3, 1, EXT.bg.sidewalkSh);
  }
  px(g, 0, groundY + 3, W, 2, EXT.bg.sidewalkHi);
  for (let sx = 8; sx < W; sx += 26) px(g, sx, groundY + 40, 14, 2, EXT.bg.curb);
}

export function drawBackground(g, W, groundY, tsec) {
  sky(g, W, groundY);
  cloud(g, 40, 30, tsec);
  cloud(g, 260, 46, tsec * 0.7);

  const pals = [
    { base: EXT.bg.bldgA, hi: EXT.bg.bldgAHi, sh: EXT.bg.bldgASh },
    { base: EXT.bg.bldgB, hi: EXT.bg.bldgBHi, sh: EXT.bg.bldgBSh },
    { base: EXT.bg.bldgC, hi: EXT.bg.bldgCHi, sh: EXT.bg.bldgCSh }
  ];
  let x = -12, seed = 11;
  let i = 0;
  while (x < W + 20) {
    seed = (seed * 37 + 13) % 97;
    const w = 44 + (seed % 34);
    const h = 64 + (seed % 60);
    building(g, x, w, h, groundY, pals[i % pals.length], seed, tsec);
    if (i === 2) shopSign(g, x + 4, groundY - h + 18);
    if (i === 4) poleAndWires(g, x + w - 6, groundY, 40);
    x += w + 5;
    i++;
  }

  sidewalk(g, W, groundY);
}
