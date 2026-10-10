/* THE ROOM THE BOTTLE STANDS IN. It was wood-grain stripes from the top of the picture to the bottom; now it is a back wall (striped paper over panelled wainscot, a chair rail, a skirting
   board), a shelf on it with the other bottles you own standing in a row, a framed picture, a wall clock that keeps the machine's own time, a pendant lamp whose light falls in stepped
   bands over the bar, and a polished bar top with wet rings, a bowl of peanuts, and the edge of the glass of the room darkened (a vignette in four steps). The still part is painted once
   into a canvas of its own and only redrawn when the set of bottles on the shelf changes; the clock's hands are the only thing drawn each frame. Whole pixels, no smoothing, and it stays dark
   under the lines of text at the top and the bottom (check:contrast reads the pixels under every word). `paint` is all the app calls. */
import { miniBottle } from './mini.js';

export const BW = 380, BH = 360, BAR_Y = 250;
const CLOCK = { x: 246, y: 126, r: 15 }, LAMP_X = 336;

/* the whole still picture, into `g` */
function still(g, shelf) {
  const R = (x, y, w, h, c, a) => { if (a != null) g.globalAlpha = a; g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); if (a != null) g.globalAlpha = 1; };
  const disc = (cx, cy, rx, ry, c, a) => { for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))); if (w > 0) R(cx - w, cy + y, 2 * w, 1, c, a); } };
  const ring = (cx, cy, rx, ry, c, a) => { disc(cx, cy, rx, ry, c, a); disc(cx, cy, rx - 1, Math.max(0, ry - 1), '#2c1b0f', 1); };

  /* the wall: striped paper, with a small diamond between the stripes */
  R(0, 0, BW, BAR_Y, '#241821');
  for (let x = 0; x < BW; x += 12) R(x, 0, 6, 172, '#2b1d29');
  for (let y = 10; y < 168; y += 24) for (let x = 3; x < BW; x += 24) { R(x + 6, y, 1, 1, '#3a2433'); R(x + 5, y + 1, 3, 1, '#3a2433'); R(x + 6, y + 2, 1, 1, '#3a2433'); }
  /* the chair rail, the panelled wainscot under it, the skirting board */
  R(0, 172, BW, 1, '#7a5234'); R(0, 173, BW, 4, '#5a3a24'); R(0, 177, BW, 1, '#1c110a');
  R(0, 178, BW, 66, '#3a2415');
  for (let x = 6; x < BW; x += 58) {
    R(x, 186, 50, 50, '#2a180d'); R(x + 1, 187, 48, 48, '#41291a'); R(x + 1, 187, 48, 1, '#5a3a24'); R(x + 1, 187, 1, 48, '#5a3a24'); R(x + 48, 188, 1, 47, '#2a180d'); R(x + 2, 234, 47, 1, '#2a180d');
    R(x + 6, 192, 38, 38, '#3a2415'); R(x + 6, 192, 38, 1, '#2a180d'); R(x + 6, 192, 1, 38, '#2a180d'); R(x + 43, 193, 1, 37, '#4d3020'); R(x + 7, 229, 37, 1, '#4d3020');
  }
  R(0, 244, BW, 6, '#4d3020'); R(0, 244, BW, 1, '#6a4630'); R(0, 249, BW, 1, '#14100a');

  /* the shelf, with its brackets and the shadow under it */
  R(116, 80, 3, 11, '#3a2415'); R(360, 80, 3, 11, '#3a2415'); R(116, 90, 7, 2, '#2a180d'); R(356, 90, 7, 2, '#2a180d');
  R(112, 76, 256, 4, '#5a3a24'); R(112, 76, 256, 1, '#7a5234'); R(112, 79, 256, 1, '#2a180d');
  R(114, 80, 252, 4, '#000000', 0.38);
  /* the other bottles you own, standing along it (as many as it holds) */
  let sx = 126; const k = 0.115;
  shelf.slice(0, 11).forEach(d => { const w = miniBottle((x, y, w2, h2, c) => R(x, y, w2, h2, c), d, sx + 6, 76, k); sx += Math.max(w, 8) + 11; });
  /* and a glass at the end of it, with a lemon wedge on its rim, if there is room */
  if (sx < 340) { R(344, 62, 11, 14, '#c9d4dc', 0.55); R(345, 63, 9, 12, '#0f1a1c', 0.4); R(344, 62, 11, 1, '#ffffff', 0.7); R(341, 62, 4, 2, '#e8d030'); R(341, 64, 3, 1, '#a89020'); }

  /* a framed picture: a moon over mountains */
  R(138, 98, 46, 34, '#6a4630'); R(138, 98, 46, 1, '#8a5c3a'); R(138, 131, 46, 1, '#2a180d'); R(140, 100, 42, 30, '#d8c898'); R(142, 102, 38, 26, '#16243e');
  disc(168, 110, 4, 4, '#f0e8b0'); disc(169, 110, 3, 3, '#16243e'); R(150, 108, 1, 1, '#f0e8b0'); R(158, 105, 1, 1, '#f0e8b0'); R(174, 119, 1, 1, '#f0e8b0');
  for (let i = 0; i < 12; i++) { R(142 + i, 128 - i, 1, i + 1, '#0c1426'); } for (let i = 0; i < 12; i++) { R(154 + i, 117 + i, 1, 11 - i, '#0c1426'); }
  for (let i = 0; i < 9; i++) { R(160 + i, 124 - i, 1, 4 + i, '#1f3556'); } R(142, 126, 38, 2, '#0c1426');
  R(138, 132, 46, 3, '#000000', 0.35);

  /* the wall clock: its face and ring; the hands are drawn each frame */
  disc(CLOCK.x, CLOCK.y + 1, CLOCK.r + 3, CLOCK.r + 3, '#000000', 0.35);
  disc(CLOCK.x, CLOCK.y, CLOCK.r + 2, CLOCK.r + 2, '#6a4630'); disc(CLOCK.x, CLOCK.y, CLOCK.r, CLOCK.r, '#e8dcb8');
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, x = CLOCK.x + Math.round(Math.sin(a) * (CLOCK.r - 2)), y = CLOCK.y - Math.round(Math.cos(a) * (CLOCK.r - 2)); R(x, y, i % 3 ? 1 : 2, i % 3 ? 1 : 2, '#14100a'); }

  /* the bar: its edge, its top, the grain in it */
  R(0, BAR_Y, BW, 1, '#8a5c3a'); R(0, BAR_Y + 1, BW, 2, '#5a3a22'); R(0, BAR_Y + 3, BW, 1, '#14100a');
  R(0, BAR_Y + 4, BW, BH - BAR_Y - 4, '#2c1b0f');
  for (let y = BAR_Y + 6; y < BH; y += 6) R(0, y, BW, 1, '#33200f');
  for (let i = 0; i < 9; i++) { const x = (i * 97 + 31) % (BW - 40), y = BAR_Y + 12 + (i * 53) % 90; R(x, y, 3 + (i % 3) * 3, 1, '#231409'); R(x + 1, y + 1, 2 + (i % 2), 1, '#38230f'); }

  /* the bowl of peanuts, near the front on the left, and the wet rings of old glasses */
  disc(46, 311, 24, 5, '#000000', 0.35);
  for (let i = 0; i < 12; i++) { const w = 22 - Math.round(i * 0.7); R(46 - w, 304 + i, w * 2, 1, i < 2 ? '#b07a40' : i > 8 ? '#5a3a1c' : '#8a5a30'); }
  R(24, 304, 44, 1, '#d8a860'); disc(46, 303, 22, 5, '#b07a40'); disc(46, 304, 19, 4, '#3a2210');
  [[34, 301], [42, 303], [51, 301], [58, 304], [38, 306], [47, 306], [29, 304], [54, 307], [44, 300], [62, 301]].forEach(([x, y], i) => { R(x, y, 4, 2, i % 3 ? '#d8a860' : '#c08840'); R(x + 1, y, 2, 1, '#f0cc88'); });
  ring(353, 342, 14, 3, '#c8a070', 0.2); ring(360, 330, 9, 2, '#c8a070', 0.16); ring(96, 345, 11, 2, '#c8a070', 0.14);

  /* the pendant lamp: its cord, its shade, its bulb, and the light that comes down from it in steps (a pool on the wall behind, a pool on the bar) */
  for (let band = 0; band < 3; band++) {
    const spread = 0.34 - band * 0.075;
    for (let y = 58; y < BH; y++) { const hw = 10 + (y - 58) * spread; R(LAMP_X - hw, y, hw * 2, 1, '#ffe9a0', 0.045); }
  }
  for (let band = 0; band < 3; band++) disc(LAMP_X, 300, 92 - band * 26, 24 - band * 6, '#ffe9a0', 0.05);
  R(LAMP_X - 1, 0, 2, 38, '#0c0806');
  for (let i = 0; i < 16; i++) { const w = 6 + Math.round(i * 0.95); R(LAMP_X - w, 38 + i, w * 2, 1, i < 2 ? '#3f9a5a' : '#2a6a3a'); }
  R(LAMP_X - 6, 38, 12, 1, '#5fc07a'); R(LAMP_X - 21, 53, 42, 1, '#143a20'); R(LAMP_X - 5, 54, 10, 3, '#fff3b0'); R(LAMP_X - 3, 57, 6, 1, '#fff3b0', 0.7);
  disc(LAMP_X, 57, 14, 7, '#ffe9a0', 0.09); disc(LAMP_X, 57, 8, 4, '#ffe9a0', 0.12);

  /* the edge of the glass of the room, darkened in four steps */
  for (let i = 0; i < 4; i++) { const a = 0.12, o = i * 3; R(o, o, BW - 2 * o, 3, '#000', a); R(o, BH - o - 3, BW - 2 * o, 3, '#000', a); R(o, o, 3, BH - 2 * o, '#000', a); R(BW - o - 3, o, 3, BH - 2 * o, '#000', a); }
}

/* the clock's hands from the machine's own time */
function hands(g, d) {
  const R = (x, y, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1); };
  const line = (len, a, c) => { for (let i = 1; i <= len; i++) R(CLOCK.x + Math.sin(a) * i, CLOCK.y - Math.cos(a) * i, c); };
  const m = d.getMinutes() + d.getSeconds() / 60, h = (d.getHours() % 12) + m / 60;
  line(CLOCK.r - 8, h * Math.PI / 6, '#14100a'); line(CLOCK.r - 4, m * Math.PI / 30, '#14100a'); R(CLOCK.x, CLOCK.y, '#a01828');
}

export function makeRoom() {
  let bg = null, key = null;
  return {
    /* `shelf` is the drinks to stand on the shelf; `k` says when it has changed */
    paint(g, k, shelf) {
      if (!bg) { bg = document.createElement('canvas'); bg.width = BW; bg.height = BH; }
      if (key !== k) { key = k; const c = bg.getContext('2d'); c.imageSmoothingEnabled = false; c.clearRect(0, 0, BW, BH); still(c, shelf || []); }
      g.drawImage(bg, 0, 0);
      hands(g, new Date());
    }
  };
}
