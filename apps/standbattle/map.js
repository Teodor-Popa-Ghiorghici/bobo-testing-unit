/* Node map, event and rest screens — §3. A linear Morioh path for the
   prototype Act, drawn in the same painted language as the arena: a dusk
   sky over a town silhouette, a hand-inked route, and node medallions
   with per-type icons. */

import { px, poly, disc, ellipse, line, vband, dither, ring } from './draw.js';
import { text, paragraph, textWidth } from './font.js';
import { SKY, TOWN, FX, S, SH, BASE, LT, RIM } from './palette.js';

const MARGIN = 56;
const TYPE = {
  combat: { c: ['#5C1414', '#8E1E22', '#C8302E', '#F06A56', '#FFB098'], label: 'FIGHT' },
  elite: { c: ['#5C3A08', '#8E5C10', '#C89020', '#F0C24A', '#FFEBA8'], label: 'ELITE' },
  event: { c: ['#0B3A4A', '#125C74', '#1E92AE', '#4FCBE6', '#C4F4FF'], label: 'EVENT' },
  rest: { c: ['#0E4A22', '#17692F', '#2FA34A', '#5FD672', '#B6FFC0'], label: 'REST' },
  boss: { c: ['#4A1030', '#7A1D4E', '#B02F72', '#E15A9C', '#FFA0CB'], label: 'BOSS' },
  treasure: { c: ['#5C3A08', '#8E5C10', '#C89020', '#F0C24A', '#FFEBA8'], label: 'LOOT' }
};

export function layoutNodes(nodes, W, H) {
  const usable = W - MARGIN * 2;
  const stepX = nodes.length > 1 ? usable / (nodes.length - 1) : 0;
  return nodes.map((node, i) => ({
    node, index: i,
    x: Math.round(MARGIN + stepX * i),
    y: Math.round(H / 2 + Math.sin(i * 1.1) * 26)
  }));
}

function backdrop(g, W, H, tsec) {
  vband(g, 0, 0, W, H, SKY.dusk);
  disc(g, W * 0.76, H * 0.3, 20, '#FFD79B');
  disc(g, W * 0.76, H * 0.3, 14, '#FFF6DC');
  let x = -10, seed = 9;
  while (x < W + 20) {
    seed = (seed * 41 + 23) % 113;
    const w = 30 + seed % 34, h = 40 + seed % 60;
    const ramp = seed % 2 ? TOWN.wallA : TOWN.wallB;
    px(g, x, H - 46 - h, w, h + 46, ramp[S]);
    px(g, x, H - 46 - h, w, 2, ramp[SH]);
    for (let i = 4; i < w - 4; i += 8) {
      for (let j = 8; j < h - 6; j += 12) {
        if ((seed + i * 3 + j) % 4 < 2) px(g, x + i, H - 46 - h + j, 4, 5, '#3A2E48');
      }
    }
    x += w + 4;
  }
  px(g, 0, H - 46, W, 46, '#171526');
  dither(g, 0, H - 46, W, 12, null, '#241F38', 7);
  g.save(); g.globalAlpha = 0.5;
  for (let i = 0; i < 30; i++) {
    const t = tsec * 0.2 + i;
    px(g, (i * 131 + Math.sin(t) * 20) % W, (i * 47 + t * 6) % (H - 40), 1, 1, '#FFE0B0');
  }
  g.restore();
}

function medallion(g, p, state, tsec) {
  const t = TYPE[p.node.type] || TYPE.combat;
  const c = state === 'done' ? ['#1A1A22', '#26262F', '#3A3A46', '#55555F', '#70707C'] : t.c;
  const x = p.x, y = p.y;
  if (state === 'now') {
    const pulse = 0.5 + 0.5 * Math.sin(tsec * 5);
    g.save(); g.globalAlpha = 0.22 + pulse * 0.3;
    disc(g, x, y, 20 + pulse * 4, c[3]);
    g.restore();
    ring(g, x, y, 17 + pulse * 2, 1, c[4]);
  }
  disc(g, x, y, 13, '#05060C');
  disc(g, x, y, 11, c[BASE]);
  ellipse(g, x, y - 3, 9, 6, c[LT]);
  ellipse(g, x, y + 6, 8, 3, c[S]);
  disc(g, x - 4, y - 5, 2, c[RIM]);
  const ink = '#0A0A12';
  const ty = p.node.type;
  if (ty === 'combat') {
    poly(g, [[x - 7, y + 4], [x + 4, y - 6], [x + 6, y - 4], [x - 5, y + 6]], ink);
    poly(g, [[x + 2, y - 7], [x + 7, y - 6], [x + 6, y - 1]], ink);
  } else if (ty === 'elite') {
    poly(g, [[x, y - 8], [x + 3, y - 2], [x + 8, y - 1], [x + 4, y + 3], [x + 5, y + 8],
      [x, y + 5], [x - 5, y + 8], [x - 4, y + 3], [x - 8, y - 1], [x - 3, y - 2]], ink);
  } else if (ty === 'event') {
    poly(g, [[x - 4, y - 6], [x + 3, y - 7], [x + 5, y - 2], [x, y + 1], [x, y + 3], [x - 2, y + 3], [x - 2, y - 1], [x + 2, y - 3], [x - 1, y - 4]], ink);
    px(g, x - 2, y + 5, 3, 3, ink);
  } else if (ty === 'rest') {
    poly(g, [[x - 7, y - 1], [x + 5, y - 1], [x + 5, y + 5], [x - 7, y + 5]], ink);
    poly(g, [[x + 5, y], [x + 9, y + 1], [x + 5, y + 3]], ink);
    px(g, x - 4, y - 6, 2, 4, ink); px(g, x, y - 7, 2, 5, ink);
  } else if (ty === 'boss') {
    poly(g, [[x - 7, y + 6], [x - 6, y - 3], [x, y - 8], [x + 6, y - 3], [x + 7, y + 6], [x + 3, y + 3], [x - 3, y + 3]], ink);
    px(g, x - 4, y - 3, 3, 3, c[LT]); px(g, x + 2, y - 3, 3, 3, c[LT]);
  }
}

export function drawMap(g, W, H, nodes, runState, tsec) {
  const pos = layoutNodes(nodes, W, H);
  backdrop(g, W, H, tsec);

  for (let i = 1; i < pos.length; i++) {
    const a = pos[i - 1], b = pos[i];
    const done = i <= runState.nodeIndex;
    for (let s = 0; s <= 24; s++) {
      const t = s / 24;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * 6;
      if (s % 2 === 0) px(g, x - 1, y - 1, 3, 3, done ? '#6A7396' : '#2A2C3E');
      px(g, x, y, 2, 2, done ? '#C8D0F0' : '#4A4E68');
    }
  }
  pos.forEach(p => {
    const state = p.index < runState.nodeIndex ? 'done' : p.index === runState.nodeIndex ? 'now' : 'next';
    medallion(g, p, state, tsec);
    /* labels alternate above/below and are clamped inside the frame, with
       a plate behind them so they stay readable over a lit skyline */
    const above = p.index % 2 === 1;
    /* long names wrap onto a second line rather than running into the
       neighbouring node -- six nodes across 480px leaves ~74px each */
    const words = p.node.label.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (textWidth(test, 1) > 74 && cur) { lines.push(cur); cur = w; } else cur = test;
    }
    if (cur) lines.push(cur);
    const bw = Math.max(...lines.map(l => textWidth(l, 1)));
    const bh = lines.length * 9 + 2;
    const lx = Math.max(bw / 2 + 4, Math.min(W - bw / 2 - 4, p.x));
    const ly = above ? p.y - 20 - bh : p.y + 18;
    px(g, lx - bw / 2 - 3, ly - 2, bw + 6, bh, '#080910');
    px(g, lx - bw / 2 - 3, ly - 2, bw + 6, 1, '#2A3050');
    lines.forEach((l, li) => text(g, l, lx, ly + li * 9, {
      scale: 1, align: 'center',
      color: state === 'now' ? '#FFE86A' : state === 'done' ? '#6A7080' : '#A8B0C8'
    }));
  });

  px(g, 0, 0, W, 26, '#0A0B14');
  px(g, 0, 26, W, 1, '#6A7396');
  text(g, 'ACT I  MORIOH', 8, 4, { scale: 2, color: '#FFE6F0', outline: '#3A0A1E' });
  text(g, 'DIAMOND IS UNBREAKABLE', 8, 18, { scale: 1, color: '#B08AC8' });
  text(g, 'HP ' + Math.round(runState.hp) + '/' + runState.maxHp, W - 8, 6, { scale: 2, align: 'right', color: '#5FD672', outline: '#0E4A22' });
  if (runState.buffs.length) {
    runState.buffs.forEach((b, i) => {
      const tw = textWidth(b.label, 1);
      px(g, 6, H - 30 - i * 12, tw + 8, 11, '#080910');
      px(g, 6, H - 30 - i * 12, 2, 11, '#FFD24A');
      text(g, b.label, 11, H - 28 - i * 12, { scale: 1, color: '#FFD24A' });
    });
  }
  text(g, 'CLICK THE GLOWING NODE', W / 2, H - 12, {
    scale: 1, align: 'center', color: '#C8D0F0', shadow: '#05060C',
    alpha: 0.6 + 0.4 * Math.sin(tsec * 3)
  });
}

export function pickNode(mx, my, nodes, W, H, runState) {
  const pos = layoutNodes(nodes, W, H);
  for (const p of pos) {
    if (p.index !== runState.nodeIndex) continue;
    if (Math.abs(mx - p.x) <= 18 && Math.abs(my - p.y) <= 18) return p.index;
  }
  return -1;
}

/* ---- panels ------------------------------------------------------------ */

function frame(g, x, y, w, h, accent) {
  px(g, x - 3, y - 3, w + 6, h + 6, '#05060C');
  px(g, x - 2, y - 2, w + 4, h + 4, accent);
  px(g, x, y, w, h, '#101322');
  px(g, x, y, w, 1, '#2A3050');
  dither(g, x, y, w, h, null, '#161B30', 5);
}

function button(g, r, label, hot) {
  px(g, r.x - 2, r.y - 2, r.w + 4, r.h + 4, '#05060C');
  px(g, r.x - 1, r.y - 1, r.w + 2, r.h + 2, hot ? '#FFE86A' : '#6A7396');
  px(g, r.x, r.y, r.w, r.h, '#1A2038');
  px(g, r.x, r.y, r.w, 2, '#2C3556');
  px(g, r.x, r.y + r.h - 2, r.w, 2, '#0C1020');
  text(g, label, r.x + r.w / 2, r.y + r.h / 2 - 3, { scale: 1, align: 'center', color: hot ? '#FFE86A' : '#DCE2FF' });
}

export function drawEvent(g, W, H, ev, tsec) {
  backdrop(g, W, H, tsec || 0);
  g.save(); g.globalAlpha = 0.55; px(g, 0, 0, W, H, '#05060C'); g.restore();
  frame(g, 40, 44, W - 80, 116, '#1E92AE');
  text(g, ev.title, W / 2, 54, { scale: 2, align: 'center', color: '#4FCBE6', outline: '#0B3A4A' });
  paragraph(g, ev.text, W / 2, 82, W - 120, { scale: 1, align: 'center', color: '#DCE2FF' });
  ev.choices.forEach((c, i) => button(g, choiceRect(i, W, H), c.label, true));
}

export function choiceRect(i, W, H) {
  const w = 150, h = 26;
  return { x: Math.round(W / 2 - w - 8 + i * (w + 16)), y: H - 62, w, h };
}

export function pickChoice(mx, my, ev, W, H) {
  for (let i = 0; i < ev.choices.length; i++) {
    const r = choiceRect(i, W, H);
    if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) return i;
  }
  return -1;
}

export function drawRest(g, W, H, runState, tsec) {
  backdrop(g, W, H, tsec || 0);
  g.save(); g.globalAlpha = 0.5; px(g, 0, 0, W, H, '#05060C'); g.restore();
  frame(g, 60, 50, W - 120, 104, '#2FA34A');
  text(g, 'CAFE DEUX MAGOTS', W / 2, 62, { scale: 2, align: 'center', color: '#5FD672', outline: '#0E4A22' });
  text(g, 'YOU CATCH YOUR BREATH. THE STREET IS QUIET.', W / 2, 90, { scale: 1, align: 'center', color: '#DCE2FF' });
  text(g, 'HP FULLY RESTORED', W / 2, 106, { scale: 1, align: 'center', color: '#B6FFC0' });
  text(g, Math.round(runState.hp) + ' / ' + runState.maxHp, W / 2, 124, { scale: 2, align: 'center', color: '#5FD672' });
  button(g, restRect(W, H), 'CONTINUE', true);
}

export function restRect(W, H) { const r = choiceRect(0, W, H); return { x: W / 2 - 75, y: r.y, w: 150, h: r.h }; }

export function pickRestContinue(mx, my, W, H) {
  const r = restRect(W, H);
  return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
}
