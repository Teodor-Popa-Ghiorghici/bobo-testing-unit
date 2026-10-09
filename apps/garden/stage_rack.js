/* GARDEN — the rack the pots stand on, dressed for the room it is in: timber in the yard, white-painted iron in the greenhouse, props and planks in the cellar,
   scaffold steel on the roof, red lacquer in the shrine. Same bones in every room (the pots do not move), different material. */
import { W, H, rect, oval } from './stage_kit.js';

export const ROWS = [196, 292, 388];                       /* the top of each shelf board */
export const POSTS = [14, 165, 349, 533, W - 26];           /* the left edge of each upright */
const SPEC = {
  yard:       { post: ['#4a3a24', '#6b5434', '#2e2416'], board: ['#4a3a24', '#7a6038', '#2e2416'], beam: ['#5a4630', '#7a6038'], brace: '#5a4630' },
  greenhouse: { post: ['#9fb0a6', '#e4efe6', '#5c6e64'], board: ['#8da096', '#dbe8de', '#53645a'], beam: ['#b8c8be', '#eef6f0'], brace: '#7a8c82' },
  cellar:     { post: ['#3a2a1a', '#5c4428', '#1c140c'], board: ['#33261a', '#5c4428', '#17100a'], beam: ['#2c2014', '#4a3822'], brace: '#3a2a1a' },
  rooftop:    { post: ['#565b64', '#939aa6', '#2c3036'], board: ['#5e636c', '#a4abb6', '#2c3036'], beam: ['#4a4f58', '#8a909c'], brace: '#6a707a' },
  shrine:     { post: ['#7c1818', '#c43838', '#3c0a0a'], board: ['#241620', '#5a3a4c', '#0e080c'], beam: ['#6a1414', '#d24a4a'], brace: '#8c2020' }
};

/* the still part, painted into the room's cached layer. `L` dims a colour to the light. Two uprights at the ends and a board a row, with a row of small brackets under it. */
export function drawRack(g, L, kind) {
  const s = SPEC[kind] || SPEC.yard;
  /* the shadow each pot throws on its board */
  ROWS.forEach(y => { for (let c = 0; c < 4; c++) oval(g, 40 + c * 184 + 33, y + 1, 40, 3, 'rgba(0,0,0,0.30)'); });
  /* the boards, with brackets under them */
  ROWS.forEach(y => {
    rect(g, 14, y, W - 28, 9, L(s.board[0])); rect(g, 14, y, W - 28, 3, L(s.board[1])); rect(g, 14, y + 9, W - 28, 3, L(s.board[2]));
    rect(g, 14, y + 12, W - 28, 5, 'rgba(0,0,0,0.20)');
    for (let x = 30; x < W - 30; x += 61 + ((x * 7) % 23)) rect(g, x, y, 1, 9, L(s.board[2]));          /* the joints between boards */
    for (let x = 30; x < W - 30; x += 15) { rect(g, x, y + 12, 2, 6, L(s.board[0])); rect(g, x, y + 12, 1, 6, L(s.board[1])); }
  });
  /* the uprights, with a bevel of light on the near edge and a shadow on the far, and a cap */
  [14, W - 26].forEach(x => {
    rect(g, x, 132, 12, H - 160, L(s.post[0])); rect(g, x, 132, 3, H - 160, L(s.post[1])); rect(g, x + 11, 132, 1, H - 160, L(s.post[2]));
    rect(g, x - 1, 130, 14, 4, L(s.post[1])); rect(g, x - 1, 134, 14, 1, L(s.post[2]));
  });
}

/* the drip line, moving: a pipe along every board and a bead running down from each pot's tap now and then */
export function drawDrip(g, K) {
  ROWS.forEach((y, row) => {
    rect(g, 26, y - 38, W - 52, 2, K.L('#3a6ea8')); rect(g, 26, y - 38, W - 52, 1, K.L('#6aa8e8'));
    for (let i = 0; i < 4; i++) {
      const bx = 40 + i * 184 + 33, ph = ((K.tsec * 0.9 + i * 0.37 + row * 0.21) % 1.6);
      rect(g, bx - 1, y - 40, 4, 4, K.L('#2a5a98'));
      if (ph < 1) { const dy = Math.min(34, ph * ph * 40); rect(g, bx, y - 36 + dy, 2, 3, '#a8d8ff'); if (ph > 0.9) rect(g, bx - 2, y - 2, 6, 1, 'rgba(168,216,255,0.6)'); }
    }
  });
}
