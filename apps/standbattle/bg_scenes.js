/* Per-scene near-ground construction: the layer the fight actually
   happens against, plus the ground it stands on and the framing
   silhouettes drawn over the top of everything.

   Each arena gets a distinct read at a glance -- a walled alley, a lit
   shopping street, a park at night, a department store atrium -- while
   sharing one prop library so they still look like one town. */

import { poly, px, dither, ellipse, disc, line } from './draw.js';
import { facade, windows, awning, shopSign, pole, streetLamp, tree, vending, dumpster, acUnit, fireEscape, fence } from './bg_props.js';
import { TOWN, haze, S, SH, BASE, LT, RIM } from './palette.js';

export function buildNear(g, W, H, cfg, groundY) {
  const ramp = cfg.walls[1] || cfg.walls[0];
  const metal = TOWN.metal;
  const brick = haze(TOWN.wallB, 0.34, '#14121F');
  if (cfg.kind === 'alley') {
    /* the alley's back wall stops well below the top of the frame, so a
       slot of dusk sky and a roofline still read above it -- a wall that
       fills the whole picture has no depth to it at all */
    const top = 62;
    for (let y = top; y < groundY; y += 9) {
      for (let x = ((y - top) / 9) % 2 ? -8 : 0; x < W; x += 22) {
        const shade = (x * 7 + y * 3) % 5;
        px(g, x, y, 21, 8, shade < 2 ? brick[SH] : shade === 4 ? brick[LT] : brick[BASE]);
        px(g, x, y, 21, 1, brick[LT]);
        px(g, x + 20, y, 1, 8, brick[S]);
      }
    }
    /* grime creeping up from the ground and down from the roofline */
    dither(g, 0, top, W, 26, null, brick[S], 10);
    dither(g, 0, groundY - 40, W, 40, null, brick[S], 7);
    /* parapet + roof clutter against the sky */
    px(g, 0, top - 6, W, 8, brick[SH]);
    px(g, 0, top - 6, W, 2, brick[LT]);
    for (let i = 0; i < 4; i++) {
      const x = 60 + i * 190;
      px(g, x, top - 26, 34, 20, TOWN.metal[BASE]);
      px(g, x, top - 26, 34, 3, TOWN.metal[LT]);
      px(g, x + 4, top - 32, 4, 6, TOWN.metal[SH]);
      px(g, x + 24, top - 32, 4, 6, TOWN.metal[SH]);
      acUnit(g, x + 90, top - 20, metal);
    }
    for (let i = 0; i < 4; i++) fireEscape(g, 40 + i * 190, top + 30, 26, groundY - top - 70, metal);
    for (let i = 0; i < 5; i++) acUnit(g, 120 + i * 150, top + 20 + (i % 3) * 26, metal);
    /* vertical drainpipes tie the wall to the ground */
    for (let i = 0; i < 6; i++) {
      const x = 20 + i * 128;
      px(g, x, top, 5, groundY - top, TOWN.metal[SH]);
      px(g, x, top, 2, groundY - top, TOWN.metal[BASE]);
      for (let y = top + 20; y < groundY; y += 46) px(g, x - 2, y, 9, 3, TOWN.metal[BASE]);
    }
    /* cables slung across the alley */
    for (let i = 0; i < 3; i++) {
      const y0 = top + 12 + i * 9;
      for (let x = 0; x < W; x += 2) {
        px(g, x, y0 + Math.sin((x / W) * Math.PI * 3 + i) * 5 + 4, 2, 1, '#0B0C12');
      }
    }
    /* posters and a tag, so the brick isn't a repeating texture wall */
    for (let i = 0; i < 5; i++) {
      const x = 66 + i * 152, y = groundY - 74 - (i % 3) * 16;
      const w = 24 + (i % 2) * 8, h = 32;
      px(g, x, y, w, h, i % 2 ? '#8A8478' : '#7C7264');
      px(g, x, y, w, 2, '#A39C8C');
      px(g, x + 2, y + 4, w - 4, 3, i % 2 ? '#7A2450' : '#243F7A');
      for (let r = 0; r < 4; r++) px(g, x + 3, y + 11 + r * 5, w - 8, 2, '#48443A');
      px(g, x + (i % 2 ? 0 : w - 3), y + h - 9, 3, 9, brick[S]);
    }
    /* a sprayed tag: one continuous stroke with a darker shadow behind it,
       not a row of dashes */
    for (let i = 0; i < 3; i++) {
      const x = 150 + i * 210, y = groundY - 54;
      const col = i % 2 ? '#A32C58' : '#2C8A7C';
      const hi = i % 2 ? '#D8508A' : '#46C2AC';
      for (let pass = 0; pass < 2; pass++) {
        const c = pass ? hi : '#12100E';
        const oy = pass ? 0 : 2;
        for (let j = 0; j <= 44; j++) {
          const t = j / 44;
          const sx = x + j;
          const sy = y + oy + Math.sin(t * 7.5) * 9 + Math.sin(t * 2.1) * 4;
          px(g, sx, sy, 3, 3, pass ? (j % 7 < 4 ? c : col) : c);
        }
      }
    }
    for (let i = 0; i < 7; i++) {
      const x = 30 + i * 104;
      dither(g, x, top + 6, 14, 40 + (i % 3) * 20, null, brick[S], 8);
    }
    dumpster(g, 90, groundY, metal);
    dumpster(g, 520, groundY, TOWN.wallC);
    for (let i = 0; i < 3; i++) streetLamp(g, 200 + i * 220, groundY - 6, 58, metal, true);
  } else if (cfg.kind === 'park') {
    fence(g, 0, W, groundY - 4, 22, metal);
    for (let i = 0; i < 6; i++) tree(g, 60 + i * 130, groundY + 2, 92 + (i % 3) * 16, TOWN.wood, TOWN.leaf, i * 3);
    for (let i = 0; i < 4; i++) streetLamp(g, 120 + i * 180, groundY, 60, metal, true);
  } else if (cfg.kind === 'store') {
    /* department store atrium: a lit back wall of shopfronts, a mezzanine
       running above them, and structural columns marching into the depth */
    const top = groundY - 150;
    px(g, 0, top, W, 150, TOWN.wallA[SH]);
    dither(g, 0, top, W, 40, null, TOWN.wallA[S], 8);
    for (let i = 0; i < 8; i++) {
      const x = 10 + i * 96;
      px(g, x, groundY - 96, 60, 74, '#0A0F1C');
      px(g, x + 2, groundY - 94, 56, 70, TOWN.win[SH]);
      /* interior glow and shelving silhouettes behind the glass */
      px(g, x + 2, groundY - 94, 56, 26, TOWN.win[BASE]);
      px(g, x + 2, groundY - 68, 56, 3, '#C8A05A');
      for (let s = 0; s < 5; s++) px(g, x + 6 + s * 11, groundY - 62, 7, 12, '#2A3346');
      px(g, x + 2, groundY - 48, 56, 20, TOWN.win[BASE]);
      for (let s = 0; s < 4; s++) px(g, x + 9 + s * 13, groundY - 44, 5, 14, '#1E2638');
      /* mullions */
      for (let m = 0; m < 4; m++) px(g, x + 2 + m * 14, groundY - 94, 2, 70, '#0A0F1C');
      px(g, x, groundY - 24, 60, 24, TOWN.wallA[BASE]);
      px(g, x, groundY - 24, 60, 2, TOWN.wallA[LT]);
      shopSign(g, x + 8, groundY - 110, 44, 11, TOWN.neon, '#FFE2F0');
    }
    /* mezzanine balcony with balustrade */
    px(g, 0, groundY - 124, W, 8, TOWN.wallA[BASE]);
    px(g, 0, groundY - 124, W, 2, TOWN.wallA[LT]);
    px(g, 0, groundY - 116, W, 3, TOWN.wallA[S]);
    for (let x = 0; x < W; x += 8) px(g, x, groundY - 140, 2, 16, TOWN.metal[BASE]);
    px(g, 0, groundY - 142, W, 3, TOWN.metal[LT]);
    /* hanging banners */
    for (let i = 0; i < 5; i++) {
      const x = 44 + i * 180;
      px(g, x, top, 3, 26, TOWN.metal[SH]);
      px(g, x - 9, top + 24, 22, 46, TOWN.neon[BASE]);
      px(g, x - 9, top + 24, 22, 3, TOWN.neon[LT]);
      px(g, x - 6, top + 32, 16, 4, '#FFE2F0');
      px(g, x - 6, top + 42, 16, 4, '#FFE2F0');
      poly(g, [[x - 9, top + 70], [x + 13, top + 70], [x + 2, top + 78]], TOWN.neon[SH]);
    }
    /* columns */
    for (let i = 0; i < 5; i++) {
      const x = 82 + i * 180;
      px(g, x, top - 10, 20, 160, TOWN.wallA[BASE]);
      px(g, x, top - 10, 6, 160, TOWN.wallA[LT]);
      px(g, x + 16, top - 10, 4, 160, TOWN.wallA[S]);
      px(g, x - 3, top - 14, 26, 8, TOWN.wallA[SH]);
      px(g, x - 3, groundY - 10, 26, 10, TOWN.wallA[SH]);
      px(g, x - 3, groundY - 10, 26, 2, TOWN.wallA[LT]);
    }
  } else {
    let x = -10, seed = 5, i = 0;
    while (x < W + 20) {
      seed = (seed * 43 + 11) % 101;
      const w = 76 + seed % 40, h = 74 + seed % 30;
      facade(g, x, groundY - h, w, h, ramp, { ledges: 0 });
      windows(g, x + 6, groundY - h + 4, w - 12, h - 40, ramp, TOWN.win, seed, cfg.lit, 0);
      awning(g, x + 4, groundY - 34, w - 8, TOWN.neon, TOWN.wallC);
      px(g, x + 6, groundY - 24, w - 12, 24, '#10131F');
      px(g, x + 8, groundY - 22, w - 16, 20, TOWN.win[i % 2 ? SH : BASE]);
      if (i % 2) shopSign(g, x + 10, groundY - h - 12, w - 20, 13, TOWN.neon, '#FFEACC');
      x += w + 4; i++;
    }
    for (let i = 0; i < 4; i++) pole(g, 60 + i * 200, groundY, 118, TOWN.wood, 200);
    vending(g, 250, groundY, TOWN.metal, ['#FF6B8A', '#6BD1FF', '#FFD24A', '#8AFF9E']);
    for (let i = 0; i < 3; i++) streetLamp(g, 150 + i * 240, groundY, 76, TOWN.metal, true);
  }
}

export function buildGround(g, W, H, cfg, groundY) {
  const r = cfg.ground;
  px(g, 0, groundY, W, H - groundY, r[BASE]);
  px(g, 0, groundY, W, 3, r[LT]);
  px(g, 0, groundY + 3, W, 2, r[SH]);
  dither(g, 0, groundY + 5, W, 18, null, r[SH], 5);
  dither(g, 0, groundY + 22, W, H - groundY - 22, null, r[S], 6);
  if (cfg.kind === 'store') {
    /* polished floor: receding tile joints plus vertical smears of the
       shopfront lights, which is what makes a floor read as reflective */
    for (let x = -60; x < W + 60; x += 30) line(g, x, groundY + 4, x - 46, H, 1, r[LT]);
    for (let i = 0; i < 6; i++) px(g, 0, groundY + 10 + i * 11, W, 1, r[SH]);
    g.save();
    g.globalAlpha = 0.18;
    for (let i = 0; i < 8; i++) {
      const x = 12 + i * 96;
      px(g, x + 4, groundY + 2, 52, 26, '#FFE2A8');
      px(g, x + 10, groundY + 2, 40, 14, '#FFF2D0');
    }
    g.restore();
  } else if (cfg.kind === 'park') {
    for (let i = 0; i < 120; i++) {
      const x = (i * 137) % W, y = groundY + 6 + (i * 53) % (H - groundY - 8);
      px(g, x, y, 2, 1, i % 3 ? TOWN.leaf[S] : r[LT]);
    }
  } else {
    for (let x = 12; x < W; x += 46) px(g, x, groundY + 30, 24, 3, r[LT]);
    px(g, 0, groundY + 14, W, 2, r[S]);
    for (let i = 0; i < 3; i++) {
      const cx = 120 + i * 240;
      ellipse(g, cx, groundY + 26, 16, 5, r[S]);
      ellipse(g, cx, groundY + 26, 12, 3, r[LT]);
    }
  }
}

