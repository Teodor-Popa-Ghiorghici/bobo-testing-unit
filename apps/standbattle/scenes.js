/* Title and run-complete screens, painted rather than typeset: a dusk
   skyline, a hard-edged logo lockup in the bitmap font, and the same
   drifting motes the arena uses so the whole app feels like one place. */

import { px, poly, disc, ellipse, line, vband, dither, ring } from './draw.js';
import { text, textWidth } from './font.js';
import { buffer, stamp } from './layer.js';
import { basePose, applyIdle } from './anim.js';
import { drawJotaro } from './sprite_jotaro.js';
import { SKY, TOWN, JOTARO, FX, S, SH, BASE, LT, RIM } from './palette.js';

function skyline(g, W, H, tsec) {
  vband(g, 0, 0, W, H, SKY.dusk);
  const sx = W * 0.68, sy = H * 0.44;
  disc(g, sx, sy, 26, '#FFC98A');
  disc(g, sx, sy, 19, '#FFF0CC');
  g.save(); g.globalAlpha = 0.14;
  for (let i = -3; i <= 3; i++) poly(g, [[sx, sy], [sx + i * 44 - 60, H], [sx + i * 44 + 20, H]], '#FFD79B');
  g.restore();
  for (let i = 0; i < 4; i++) {
    const x = ((i * 137 + tsec * (3 + i)) % (W + 120)) - 60;
    ellipse(g, x, 30 + i * 13, 26 - i * 3, 5, TOWN.cloud[i % 2 ? BASE : SH]);
    ellipse(g, x - 8, 28 + i * 13, 14, 4, TOWN.cloud[LT]);
  }
  let x = -14, seed = 5;
  while (x < W + 20) {
    seed = (seed * 43 + 19) % 109;
    const w = 34 + seed % 40, h = 46 + seed % 70;
    px(g, x, H - 40 - h, w, h + 40, '#241F38');
    px(g, x, H - 40 - h, w, 2, '#3A3152');
    for (let i = 5; i < w - 5; i += 9) {
      for (let j = 9; j < h - 8; j += 13) {
        if ((seed + i + j * 3) % 5 < 2) px(g, x + i, H - 40 - h + j, 4, 6, '#FFD98A');
      }
    }
    x += w + 5;
  }
  px(g, 0, H - 40, W, 40, '#12101E');
  dither(g, 0, H - 40, W, 14, null, '#1D1A2E', 6);
}

export function drawTitle(g, W, H, tsec, cleared) {
  skyline(g, W, H, tsec);

  /* the man himself, standing in the foreground of his own title card */
  const pose = basePose();
  applyIdle(pose, { t: tsec }, 0.3);
  pose.breath = Math.sin(tsec * 1.4);
  const b = buffer('titlejotaro', 240, 200);
  b.g.save(); b.g.translate(120, 184);
  drawJotaro(b.g, pose);
  b.g.restore();
  stamp(g, b, {
    x: W - 96, y: H - 6, ox: 120, oy: 184, flip: -1,
    outline: FX.ink, thickOutline: true,
    shadow: { color: '#000000', alpha: 0.35, skew: -0.9, squash: 0.22 }
  });

  const cx = Math.round(W * 0.34);
  text(g, 'A JOJO ROGUELIKE', cx, 48, { scale: 1, align: 'center', color: '#E0A0D8', shadow: '#3A0A2E' });
  text(g, 'STAND', cx, 60, { scale: 4, align: 'center', color: '#FFE86A', outline: '#3A0A1E', shadow: '#B02F72', shadowDy: 2 });
  text(g, 'BATTLE', cx, 94, { scale: 4, align: 'center', color: '#FFE86A', outline: '#3A0A1E', shadow: '#B02F72', shadowDy: 2 });
  text(g, 'ARENA', cx, 128, { scale: 4, align: 'center', color: '#FFA0CB', outline: '#3A0A1E', shadow: '#7A1D4E', shadowDy: 2 });
  px(g, cx - 74, 166, 148, 1, '#6A7396');
  text(g, 'JOTARO KUJO / STAR PLATINUM', cx, 174, { scale: 1, align: 'center', color: '#B8C4E8' });
  text(g, 'CLICK TO BEGIN', cx, H - 46, {
    scale: 2, align: 'center', color: '#FFFFFF', outline: '#1E2A5A',
    alpha: 0.55 + 0.45 * Math.sin(tsec * 3)
  });
  if (cleared) {
    text(g, 'MORIOH CLEARED', cx, H - 24, { scale: 1, align: 'center', color: '#5FD672' });
  }
}

export function drawComplete(g, W, H, runState, tsec) {
  skyline(g, W, H, tsec || 0);
  g.save(); g.globalAlpha = 0.45; px(g, 0, 0, W, H, '#0A0614'); g.restore();
  const t = tsec || 0;
  for (let i = 0; i < 3; i++) {
    ring(g, W / 2, H / 2 - 10, ((t * 26 + i * 40) % 120), 1, '#B02F72', 0.4);
  }
  text(g, 'MORIOH IS QUIET AGAIN', W / 2, H / 2 - 40, {
    scale: 3, align: 'center', color: '#FFE86A', outline: '#3A2A06', shadow: '#8A5A0E', shadowDy: 2,
    wave: { amp: 1, freq: 3, t }
  });
  text(g, 'KILLER QUEEN HAS BEEN STOPPED.', W / 2, H / 2 - 6, { scale: 1, align: 'center', color: '#FFC2D8' });
  text(g, 'HP REMAINING  ' + Math.round(runState.hp) + ' / ' + runState.maxHp, W / 2, H / 2 + 14, {
    scale: 2, align: 'center', color: '#5FD672', outline: '#0E4A22'
  });
  text(g, 'CLICK TO RETURN TO THE TITLE', W / 2, H - 40, {
    scale: 1, align: 'center', color: '#C8D0F0', alpha: 0.5 + 0.5 * Math.sin(t * 3)
  });
}
