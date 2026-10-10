/* The paper on a bottle: the paper itself (lit along the top and the left, in shade along the bottom and the right, as paper is that goes round a cylinder), an ink frame, the name on a band
   (or between two rules on a small label), the picture on a medallion, and the small print, all laid out for the label's own size (shapes.js gives each bottle its own). Every letter is
   stamped from a bitmap (pixtext.js), so a name is never wider than its paper: the largest type that holds it is chosen, a long one goes on two lines or three, and `labels_check.js` proves
   it for every drink there is. A drink may hand over `X.icon` (a picture in thirteen-by-eleven units, drinks.js and icons.js) or `X.paint` (the whole inside of the label, for a label that is a
   picture of its own); one without either wears the Jägermeister's stag. */
import { layout, drawLayout, heightOf, F3, SMALL_TIERS, TITLE_TIERS } from '../pixtext.js';
import { ICON_W, ICON_H } from './icons.js';

/* the Jägermeister's stag, which a label without a picture of its own wears: thirteen by eleven units at a whole number of pixels a unit */
const stag = (r, x, y, s, ink, light) => {
  const q = (a, b, w2, h2, c) => r(x + a * s, y + b * s, Math.max(1, w2 * s), Math.max(1, h2 * s), c || ink);
  q(4, 5, 5, 5); q(5, 10, 3, 1); q(3, 7, 1, 2); q(9, 7, 1, 2);
  q(3, 1, 1, 5); q(9, 1, 1, 5); q(1, 2, 2, 1); q(10, 2, 2, 1); q(1, 2, 1, 2); q(11, 2, 1, 2);
  q(2, 0, 2, 1); q(9, 0, 2, 1); q(0, 4, 1, 2); q(12, 4, 1, 2);
  q(6, 0, 1, 5); q(5, 2, 3, 1);                                          /* the cross between the antlers */
  if (s >= 3) { r(x + 6 * s + 1, y + 1, s - 2, 5 * s - 2, light); r(x + 5 * s + 1, y + 2 * s + 1, 3 * s - 2, s - 2, light); }
};

/* a medallion for the picture to stand on: an ellipse of pixels, row by row, with a whole edge round it */
function plate(r, cx, cy, rx, ry, edge, fill) {
  const disc = (rx2, ry2, c) => { for (let y = -ry2; y <= ry2; y++) { const w = Math.round(rx2 * Math.sqrt(Math.max(0, 1 - (y * y) / (ry2 * ry2)))); if (w > 0) r(cx - w, cy + y, 2 * w, 1, c); } };
  disc(rx + 1, ry + 1, edge); disc(rx, ry, fill);
}

/* the small print: one line if it holds, else each part between dots on its own line(s). `first` keeps only the part before the first dot (the strength comes first). */
function printLayout(text, maxW, first) {
  if (first) text = String(text).split('·')[0].trim();
  const one = layout(text, maxW, [SMALL_TIERS[0]]);
  if (!one.cut) return one;
  const lines = []; let cut = false;
  String(text).split('·').map(s => s.trim()).filter(Boolean).forEach(seg => { const L = layout(seg, maxW, SMALL_TIERS); if (L.cut) cut = true; L.lines.forEach(l => lines.push(l)); });
  return { font: F3, heavy: false, lines, w: maxW, h: blockH(lines), cut };
}
/* the height of lines of small print as drawLayout stacks them: a line is its letters (and two more if it has accents) and two between lines */
const blockH = lines => lines.reduce((a, l) => a + heightOf(F3, l), 0) + (lines.length - 1) * 2;
const printH = L => (L ? blockH(L.lines) : 0);

/* everything about where things go, as numbers (labels_check.js reads the same plan the drawing follows) */
export function plan(X, L) {
  const lw = L.w, lh = L.h, tw = lw - 12, small = lh < 60, band = lh >= 66;
  const T = layout(X.title, tw, TITLE_TIERS);
  const p = { lw, lh, tw, small, band, title: T, y: 5 };
  p.titleH = T.h; p.bandH = band ? T.h + 4 : 0;
  let y = 5 + (band ? p.bandH + 3 : T.h + 2);
  p.orn = !band && !small ? y : -1; if (p.orn >= 0) y += 5;
  /* the footer, as much as lets the picture be big: the print in full, then the strength alone, then the first line only, then none (a small label has none) */
  const sub1 = !small && X.sub1 ? printLayout(X.sub1, tw) : null, sub2 = !small && X.sub2 ? printLayout(X.sub2, tw) : null, sub2a = !small && X.sub2 ? printLayout(X.sub2, tw, true) : null;
  const options = small ? [[]] : [[sub1, sub2], [sub1, sub2a], [sub1], [sub2a], []].map(o => o.filter(Boolean));
  const footH = fs => fs.length ? fs.reduce((a, f) => a + printH(f), 0) + (fs.length - 1) * 2 + 3 : 0;
  const sizeOf = fs => { const room = lh - 6 - y - footH(fs); return { room, s: Math.max(0, Math.min(3, Math.floor(room / ICON_H), Math.floor((tw - 2) / ICON_W))) }; };
  let pick = options.find(fs => fs.length && sizeOf(fs).s >= 2) || options.find(fs => sizeOf(fs).s >= 1) || options[options.length - 1];
  const sz = sizeOf(pick);
  p.foot = pick; p.footH = footH(pick); p.footTop = lh - 6 - (p.footH - (pick.length ? 3 : 0));
  p.iconTop = y; p.room = sz.room; p.s = sz.s;
  return p;
}

/* g2: the sprite's context (the gift labels' painters get it), r: fills a rectangle, K: the colours, X: the words and picture, L: { top, w, h } from shapes.js */
export function drawLabel(g2, r, K, X, L) {
  const P = plan(X, L), lw = P.lw, lh = P.lh, lx = -lw / 2, ly = -L.top;
  r(lx, ly, lw, lh, K.label);
  r(lx, ly, lw, 2, K.labelHi); r(lx, ly + lh - 2, lw, 2, K.labelDk);                       /* lit along the top, in shade along the bottom */
  r(lx, ly + 2, 2, lh - 4, K.labelHi); r(lx + lw - 3, ly + 2, 3, lh - 4, K.labelDk);      /* and round the cylinder: bright on the left, dark on the right */
  const fx = lx + 3, fy = ly + 3, fw = lw - 6, fh = lh - 6;                                /* the ink frame, its four corners notched */
  r(fx + 1, fy, fw - 2, 1, K.ink); r(fx + 1, fy + fh - 1, fw - 2, 1, K.ink); r(fx, fy + 1, 1, fh - 2, K.ink); r(fx + fw - 1, fy + 1, 1, fh - 2, K.ink);
  if (X.paint) { X.paint(g2, r, K, { x: lx + 4, y: ly + 4, w: lw - 8, h: lh - 8 }); return; }
  const T = P.title;
  if (P.band) {
    r(fx + 1, ly + 4, fw - 2, P.bandH, K.ink); r(fx + 1, ly + 4 + P.bandH, fw - 2, 1, K.labelDk);
    drawLayout(r, T, 0, ly + 6, K.label, {});
  } else {
    drawLayout(r, T, 0, ly + P.y, K.ink, { shadow: K.labelHi });
    if (P.orn >= 0) { const oy = ly + P.orn; r(lx + 7, oy + 1, lw / 2 - 10, 1, K.ink); r(4, oy + 1, lw / 2 - 11, 1, K.ink); r(0, oy, 1, 1, K.ink); r(-1, oy + 1, 3, 1, K.ink); r(0, oy + 2, 1, 1, K.ink); }
  }
  /* the picture, on a medallion when there is room for one */
  if (P.s >= 1) {
    const s = P.s, iw = ICON_W * s, ih = ICON_H * s, cy = ly + P.iconTop + Math.round(P.room / 2), ix = -Math.floor(iw / 2), iy = cy - Math.floor(ih / 2);
    const ry = Math.min(Math.floor(ih / 2) + 3, Math.floor((P.room - 2) / 2));            /* the medallion is as big as the room lets it be, and never touches the print */
    if (s >= 2 && ry >= Math.floor(ih / 2) + 1) plate(r, 0, cy, Math.floor(iw / 2) + ry - Math.floor(ih / 2), ry, K.ink, K.labelHi);
    if (X.icon) X.icon(r, ix, iy, s, K); else stag(r, ix, iy, s, K.ink, K.labelHi);
  }
  /* the small print */
  let y = ly + P.footTop;
  P.foot.forEach(f => { y = drawLayout(r, { font: F3, heavy: false, lines: f.lines, h: printH(f) }, 0, y, K.ink, {}) + 2; });
}
