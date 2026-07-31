/* Node-map scene — §3. A linear Morioh path for the prototype Act (branching
   layouts are a post-prototype concern per docs/stand-battle-arena-spec.md
   §15). Combat / Elite / Event / Rest / Boss node types, each drawn with a
   distinct pixel icon and colour. */

import { PAL, NODE_ICON_COLOR } from './data.js';

const MARGIN = 40;

export function layoutNodes(nodes, W, H) {
  const usable = W - MARGIN * 2;
  const step = nodes.length > 1 ? usable / (nodes.length - 1) : 0;
  return nodes.map((node, i) => ({
    node, index: i,
    x: MARGIN + step * i,
    y: H / 2 + (i % 2 === 0 ? -18 : 18)
  }));
}

function nodeGlyph(g, x, y, type, color) {
  g.fillStyle = PAL.black;
  g.fillRect(x - 9, y - 9, 18, 18);
  g.fillStyle = color;
  g.fillRect(x - 7, y - 7, 14, 14);
  g.fillStyle = PAL.black;
  if (type === 'combat') { g.fillRect(x - 3, y - 1, 6, 2); g.fillRect(x - 1, y - 3, 2, 6); }
  else if (type === 'elite') { g.fillRect(x - 4, y + 2, 8, 2); g.fillRect(x - 1, y - 5, 2, 8); }
  else if (type === 'event') { g.fillRect(x - 1, y - 4, 2, 5); g.fillRect(x - 1, y + 3, 2, 2); }
  else if (type === 'rest') { g.fillRect(x - 5, y - 1, 10, 2); g.fillRect(x - 5, y - 4, 3, 3); }
  else if (type === 'boss') { g.fillRect(x - 5, y - 5, 10, 10); g.fillRect(x - 2, y - 2, 4, 4); g.fillStyle = color; g.fillRect(x - 1, y - 1, 2, 2); }
}

export function drawMap(g, W, H, nodes, runState, tsec) {
  const pos = layoutNodes(nodes, W, H);
  g.fillStyle = PAL.black;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = PAL.dgray;
  g.lineWidth = 2;
  g.beginPath();
  pos.forEach((p, i) => { if (i === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); });
  g.stroke();

  pos.forEach(p => {
    const cleared = p.index < runState.nodeIndex;
    const current = p.index === runState.nodeIndex;
    const color = NODE_ICON_COLOR[p.node.type] || PAL.gray;
    if (current) {
      const pulse = 0.5 + 0.5 * Math.sin(tsec * 5);
      g.globalAlpha = 0.4 + pulse * 0.5;
      g.fillStyle = PAL.white;
      g.fillRect(p.x - 13, p.y - 13, 26, 26);
      g.globalAlpha = 1;
    }
    nodeGlyph(g, p.x, p.y, p.node.type, cleared ? PAL.dgray : color);
    g.fillStyle = current ? PAL.yellow : (cleared ? PAL.dgray : PAL.gray);
    g.font = '8px monospace';
    g.textAlign = 'center';
    g.fillText(p.node.label, p.x, p.y + 24);
    g.textAlign = 'left';
  });

  g.fillStyle = PAL.white;
  g.font = '12px monospace';
  g.textAlign = 'center';
  g.fillText('MORIOH — DIAMOND IS UNBREAKABLE', W / 2, 22);
  g.font = '9px monospace';
  g.fillStyle = PAL.gray;
  g.fillText('CLICK THE GLOWING NODE', W / 2, H - 14);
  g.textAlign = 'left';
}

export function pickNode(mx, my, nodes, W, H, runState) {
  const pos = layoutNodes(nodes, W, H);
  for (const p of pos) {
    if (p.index !== runState.nodeIndex) continue;
    if (Math.abs(mx - p.x) <= 13 && Math.abs(my - p.y) <= 13) return p.index;
  }
  return -1;
}

export function drawEvent(g, W, H, ev) {
  g.fillStyle = PAL.black;
  g.fillRect(0, 0, W, H);
  g.fillStyle = PAL.lcyan;
  g.font = '12px monospace';
  g.textAlign = 'center';
  g.fillText(ev.title, W / 2, 40);
  g.fillStyle = PAL.white;
  g.font = '10px monospace';
  wrapText(g, ev.text, W / 2, 70, W - 60, 14);
  ev.choices.forEach((c, i) => {
    const r = choiceRect(i, W, H);
    g.strokeStyle = PAL.gray;
    g.strokeRect(r.x, r.y, r.w, r.h);
    g.fillStyle = PAL.yellow;
    g.fillText(c.label, r.x + r.w / 2, r.y + r.h / 2 + 4);
  });
  g.textAlign = 'left';
}

function wrapText(g, text, cx, y, maxW, lh) {
  const words = text.split(' ');
  let line = '', ly = y;
  g.textAlign = 'center';
  words.forEach(w => {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) { g.fillText(line, cx, ly); line = w; ly += lh; }
    else line = test;
  });
  if (line) g.fillText(line, cx, ly);
}

export function choiceRect(i, W, H) {
  const w = 150, h = 30;
  return { x: W / 2 - w - 6 + i * (w + 12), y: H - 70, w, h };
}

export function pickChoice(mx, my, ev, W, H) {
  for (let i = 0; i < ev.choices.length; i++) {
    const r = choiceRect(i, W, H);
    if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) return i;
  }
  return -1;
}

export function drawRest(g, W, H, runState) {
  g.fillStyle = PAL.black;
  g.fillRect(0, 0, W, H);
  g.fillStyle = PAL.lgreen;
  g.font = '12px monospace';
  g.textAlign = 'center';
  g.fillText('CAFE DEUX MAGOTS', W / 2, 60);
  g.fillStyle = PAL.white;
  g.font = '10px monospace';
  g.fillText('YOU CATCH YOUR BREATH.', W / 2, 90);
  g.fillText('HP ' + Math.round(runState.hp) + ' / ' + runState.maxHp, W / 2, 110);
  const r = choiceRect(0, W, H);
  g.strokeStyle = PAL.gray;
  g.strokeRect(r.x + 75, r.y, r.w, r.h);
  g.fillStyle = PAL.yellow;
  g.fillText('CONTINUE', r.x + 75 + r.w / 2, r.y + r.h / 2 + 4);
  g.textAlign = 'left';
}

export function pickRestContinue(mx, my, W, H) {
  const r = choiceRect(0, W, H);
  const rx = r.x + 75;
  return mx >= rx && mx <= rx + r.w && my >= r.y && my <= r.y + r.h;
}
