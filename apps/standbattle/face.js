/* Shared eyes/mouth glyphs for human-faced characters (not Killer Queen,
   which is deliberately faceless per canon). Small enough to be legible at
   this sprite scale while still landing distinct expressions. */

import { px } from './draw.js';

export function drawFace(g, cx, cy, eyes, mouth, dark) {
  const ink = dark || '#1A1410';
  const ex = 2;
  if (eyes === 'x') {
    [-1, 1].forEach(s => {
      px(g, cx + s * ex, cy - 1, 1, 1, ink);
      px(g, cx + s * ex - 1, cy - 2, 1, 1, ink);
      px(g, cx + s * ex + 1, cy, 1, 1, ink);
      px(g, cx + s * ex - 1, cy, 1, 1, ink);
      px(g, cx + s * ex + 1, cy - 2, 1, 1, ink);
    });
  } else if (eyes === 'shut') {
    [-1, 1].forEach(s => px(g, cx + s * ex - 1, cy, 2, 1, ink));
  } else if (eyes === 'narrow') {
    [-1, 1].forEach(s => {
      px(g, cx + s * ex - 1, cy, 2, 1, ink);
      px(g, cx + s * ex - 1, cy - 2, 2, 1, ink);
    });
  } else if (eyes === 'wide') {
    [-1, 1].forEach(s => {
      px(g, cx + s * ex - 1, cy - 1, 2, 2, ink);
      px(g, cx + s * ex - 1, cy - 1, 1, 1, '#FFFFFF');
    });
  } else if (eyes === 'angry') {
    [-1, 1].forEach(s => {
      px(g, cx + s * ex - 1, cy - 1, 2, 1, ink);
      px(g, cx + s * ex - 1 - s, cy - 3, 2, 1, ink);
    });
  } else {
    [-1, 1].forEach(s => px(g, cx + s * ex, cy - 1, 1, 1, ink));
  }

  const my = cy + 3;
  if (mouth === 'open') px(g, cx - 1, my, 2, 2, ink);
  else if (mouth === 'grit') { px(g, cx - 2, my, 4, 1, ink); px(g, cx - 1, my, 1, 1, '#FFFFFF'); }
  else if (mouth === 'smirk') { px(g, cx - 2, my, 3, 1, ink); px(g, cx + 1, my - 1, 1, 1, ink); }
  else if (mouth === 'wince') { px(g, cx - 1, my - 1, 2, 1, ink); }
  else if (mouth === 'frown') { px(g, cx - 2, my, 1, 1, ink); px(g, cx - 1, my + 1, 2, 1, ink); px(g, cx + 1, my, 1, 1, ink); }
  else px(g, cx - 1, my, 3, 1, ink);
}
