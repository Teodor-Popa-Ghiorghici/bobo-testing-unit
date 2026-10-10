/* PIXEL TEXT, for anything small that has to be exactly as wide as it says: the words on a bottle's label and a shelf card's thumbnail (an app's own; apps/bottle/labels.js, apps/shop/thumbs.js). A label used to be written with `fillText` in a serif or a monospace face at fractional sizes: antialiased, a different width on every machine (the fit
   guessed it from a constant, so JÄGERMEISTER, GOLDWASSER and KNOB TONIC ran off their paper) and cut to the first word when the name was long. Here every letter is stamped from a bitmap
   with `R` (a rectangle filler), so it is crisp, as wide as this file says it is, and `layout` proves a name fits before it is drawn: the largest of the type sizes that holds it on one line, or
   on two split at a space (or at a hand-made break, `BREAKS`), and the smallest on three. Two faces: 5 x 7 (a title, optionally heavy: every stroke a pixel wider) and 3 x 5 (the small print).
   Pure but for `R`, so Node holds all of it (apps/bottle/labels_check.js). */
const rows = s => s.split(',');
const G5 = {
  A: '01110,10001,10001,11111,10001,10001,10001', B: '11110,10001,10001,11110,10001,10001,11110', C: '01110,10001,10000,10000,10000,10001,01110', D: '11100,10010,10001,10001,10001,10010,11100',
  E: '11111,10000,10000,11110,10000,10000,11111', F: '11111,10000,10000,11110,10000,10000,10000', G: '01110,10001,10000,10111,10001,10001,01111', H: '10001,10001,10001,11111,10001,10001,10001',
  I: '01110,00100,00100,00100,00100,00100,01110', J: '00111,00010,00010,00010,00010,10010,01100', K: '10001,10010,10100,11000,10100,10010,10001', L: '10000,10000,10000,10000,10000,10000,11111',
  M: '10001,11011,10101,10101,10001,10001,10001', N: '10001,11001,10101,10011,10001,10001,10001', O: '01110,10001,10001,10001,10001,10001,01110', P: '11110,10001,10001,11110,10000,10000,10000',
  Q: '01110,10001,10001,10001,10101,10010,01101', R: '11110,10001,10001,11110,10100,10010,10001', S: '01111,10000,10000,01110,00001,00001,11110', T: '11111,00100,00100,00100,00100,00100,00100',
  U: '10001,10001,10001,10001,10001,10001,01110', V: '10001,10001,10001,10001,10001,01010,00100', W: '10001,10001,10001,10101,10101,11011,10001', X: '10001,10001,01010,00100,01010,10001,10001',
  Y: '10001,10001,01010,00100,00100,00100,00100', Z: '11111,00001,00010,00100,01000,10000,11111',
  0: '01110,10001,10011,10101,11001,10001,01110', 1: '00100,01100,00100,00100,00100,00100,01110', 2: '01110,10001,00001,00010,00100,01000,11111', 3: '11110,00001,00001,01110,00001,00001,11110',
  4: '00010,00110,01010,10010,11111,00010,00010', 5: '11111,10000,11110,00001,00001,10001,01110', 6: '00110,01000,10000,11110,10001,10001,01110', 7: '11111,00001,00010,00100,01000,01000,01000',
  8: '01110,10001,10001,01110,10001,10001,01110', 9: '01110,10001,10001,01111,00001,00010,01100',
  '.': '00000,00000,00000,00000,00000,01100,01100', ',': '00000,00000,00000,00000,00110,00100,01000', '-': '00000,00000,00000,11111,00000,00000,00000', "'": '00100,00100,01000,00000,00000,00000,00000',
  '%': '11001,11010,00010,00100,01000,01011,10011', '/': '00001,00010,00010,00100,01000,01000,10000', '&': '01100,10010,10100,01000,10101,10010,01101', ':': '00000,01100,01100,00000,01100,01100,00000',
  '!': '00100,00100,00100,00100,00100,00000,00100', '?': '01110,10001,00001,00110,00100,00000,00100', '+': '00000,00100,00100,11111,00100,00100,00000', '*': '00000,10101,01110,11111,01110,10101,00000',
  '·': '00000,00000,00000,00100,00000,00000,00000', '(': '00010,00100,01000,01000,01000,00100,00010', ')': '01000,00100,00010,00010,00010,00100,01000', '[': '01110,01000,01000,01000,01000,01000,01110', ']': '01110,00010,00010,00010,00010,00010,01110', '=': '00000,00000,11111,00000,11111,00000,00000', '#': '01010,11111,01010,01010,11111,01010,00000', ' ': '00000,00000,00000,00000,00000,00000,00000',
  'Ø': '01110,10011,10101,10101,10101,11001,01110', 'Æ': '01111,10100,10100,11110,10100,10100,10111'
};
const G3 = {
  A: '010,101,111,101,101', B: '110,101,110,101,110', C: '011,100,100,100,011', D: '110,101,101,101,110', E: '111,100,110,100,111', F: '111,100,110,100,100', G: '011,100,101,101,011',
  H: '101,101,111,101,101', I: '111,010,010,010,111', J: '001,001,001,101,010', K: '101,101,110,101,101', L: '100,100,100,100,111', M: '101,111,111,101,101', N: '111,101,101,101,101',
  O: '010,101,101,101,010', P: '110,101,110,100,100', Q: '010,101,101,110,011', R: '110,101,110,101,101', S: '011,100,010,001,110', T: '111,010,010,010,010', U: '101,101,101,101,111',
  V: '101,101,101,101,010', W: '101,101,111,111,101', X: '101,101,010,101,101', Y: '101,101,010,010,010', Z: '111,001,010,100,111',
  0: '111,101,101,101,111', 1: '010,110,010,010,111', 2: '110,001,010,100,111', 3: '110,001,010,001,110', 4: '101,101,111,001,001', 5: '111,100,110,001,110', 6: '011,100,111,101,111',
  7: '111,001,010,010,010', 8: '111,101,111,101,111', 9: '111,101,111,001,110',
  '.': '000,000,000,000,010', ',': '000,000,000,010,100', '-': '000,000,111,000,000', "'": '010,010,000,000,000', '%': '101,001,010,100,101', '/': '001,001,010,100,100', '&': '010,101,010,101,011',
  ':': '000,010,000,010,000', '!': '010,010,010,000,010', '?': '110,001,010,000,010', '+': '000,010,111,010,000', '*': '000,101,010,101,000', '·': '000,000,010,000,000',
  '(': '001,010,010,010,001', ')': '100,010,010,010,100', '[': '011,010,010,010,011', ']': '110,010,010,010,110', '=': '000,111,000,111,000', '#': '101,111,101,111,101', ' ': '000,000,000,000,000', 'Ø': '011,101,111,101,110', 'Æ': '011,110,111,110,111'
};
export const F5 = { id: '5x7', w: 5, h: 7, adv: 6, g: G5 };
export const F3 = { id: '3x5', w: 3, h: 5, adv: 4, g: G3 };
const MARKS = { '̈': 2, '̆': 2, '̊': 1, '́': 1, '̀': 1, '̂': 1 };          /* two dots (a diaeresis, a breve), or one (a ring, an acute, a grave, a circumflex) */

/* the glyphs of a text: [{ ch, marks }], upper case, accents taken off and kept as marks, what the face does not have as '?' */
export function glyphs(text) {
  const out = [];
  for (const c of String(text == null ? '' : text).toUpperCase()) {
    if (c === 'Ø' || c === 'Æ') { out.push({ ch: c, marks: 0 }); continue; }
    const d = c.normalize('NFD'); let ch = d[0], marks = 0;
    for (let i = 1; i < d.length; i++) marks = Math.max(marks, MARKS[d[i]] || 0);
    if (c === ' ') ch = ' ';
    out.push({ ch: G5[ch] ? ch : '?', marks });
  }
  return out;
}
export const hasMarks = text => glyphs(text).some(g => g.marks);
/* how wide a text is: an advance for each letter and no gap after the last (`heavy` makes every stroke a pixel wider) */
export const widthOf = (text, font, heavy) => { const n = glyphs(text).length; return n ? n * (font.adv + (heavy ? 1 : 0)) - 1 - (heavy ? 0 : 0) : 0; };
export const heightOf = (font, text) => font.h + (text && hasMarks(text) ? 2 : 0);

/* stamp `text` with its middle at cx and its top at `top` (a mark sits two pixels over the letter, so a text with accents is two taller) */
export function drawText(R, text, cx, top, color, font, o) {
  o = o || {};
  const gl = glyphs(text), adv = font.adv + (o.heavy ? 1 : 0), w = gl.length * adv - 1, base = top + (hasMarks(text) ? 2 : 0);
  let x = Math.round(cx - w / 2);
  const put = (gx, gy, c) => { R(gx, gy, 1, 1, c); };
  gl.forEach(g => {
    const pat = rows(font.g[g.ch] || font.g['?']);
    pat.forEach((line, yy) => { for (let xx = 0; xx < line.length; xx++) if (line[xx] === '1') {
      if (o.shadow) put(x + xx + 1, base + yy + 1, o.shadow);
      put(x + xx, base + yy, color); if (o.heavy) put(x + xx + 1, base + yy, color);
    } });
    if (g.marks) { const mx = x + (font.w >> 1); if (g.marks === 1) put(mx, base - 2, color); else { put(mx - 1, base - 2, color); put(mx + 1, base - 2, color); } }
    x += adv;
  });
  return w;
}

/* a name that is too long for one word of a line may be broken where a hand put a bar, for a compound word (a hyphen is added) */
export const BREAKS = { 'JÄGERMEISTER': 'JÄGER|MEISTER', GOLDWASSER: 'GOLD|WASSER', BIRTHDAY: 'BIRTH|DAY', SPARKLING: 'SPARK|LING', ELDERFLOWER: 'ELDER|FLOWER', BLUEBERRY: 'BLUE|BERRY', BLACKCURRANT: 'BLACK|CURRANT', CHRISTMAS: 'CHRIST|MAS', RASPBERRY: 'RASP|BERRY' };

/* the ways a text can be cut into `n` lines: between words, and inside a long word only where BREAKS has a bar (the first half then ends in a hyphen). Each is an array of lines. */
function cuts(text, n) {
  const words = String(text).toUpperCase().split(/\s+/).filter(Boolean);
  if (n === 1) return [[words.join(' ')]];
  const units = [];                                    /* { t, mid } : a word, or half of one (mid: it goes on to the next unit without a space) */
  words.forEach(w => { const b = BREAKS[w]; if (b) { const [p, q] = b.split('|'); units.push({ t: p, mid: true }, { t: q, mid: false }); } else units.push({ t: w, mid: false }); });
  const line = (from, to) => { let s = ''; for (let i = from; i < to; i++) { s += units[i].t; if (i < to - 1 && !units[i].mid) s += ' '; } return units[to - 1].mid ? s + '-' : s; };
  const out = [], k = units.length;
  if (n === 2) for (let i = 1; i < k; i++) out.push([line(0, i), line(i, k)]);
  if (n === 3) for (let i = 1; i < k; i++) for (let j = i + 1; j < k; j++) out.push([line(0, i), line(i, j), line(j, k)]);
  return out;
}
/* the type sizes to try, largest first: { font, heavy, lines } */
export const TITLE_TIERS = [{ font: F5, heavy: true, n: 1 }, { font: F5, heavy: true, n: 2 }, { font: F5, heavy: false, n: 1 }, { font: F5, heavy: false, n: 2 }, { font: F3, heavy: false, n: 1 }, { font: F3, heavy: false, n: 2 }, { font: F3, heavy: false, n: 3 }];
export const SMALL_TIERS = [{ font: F3, heavy: false, n: 1 }, { font: F3, heavy: false, n: 2 }, { font: F3, heavy: false, n: 3 }];

/* the largest type that holds `text` inside `maxW` pixels: { font, heavy, lines, w, h } (h includes a line's two pixels of room for accents, and 2 between lines), or the smallest cut short with a stop */
export function layout(text, maxW, tiers) {
  tiers = tiers || TITLE_TIERS;
  for (const t of tiers) {
    let best = null;
    cuts(text, t.n).forEach(ls => {
      const w = Math.max(...ls.map(l => widthOf(l, t.font, t.heavy)));
      if (w <= maxW && (!best || w < best.w)) best = { lines: ls, w };
    });
    if (best) return finish(t, best.lines, best.w);
  }
  /* nothing fits: the smallest face on one line, cut short */
  const t = tiers[tiers.length - 1], f = t.font; let s = String(text).toUpperCase().replace(/\s+/g, ' ').trim();
  while (s.length > 1 && widthOf(s + '.', f, false) > maxW) s = s.slice(0, -1);
  return finish({ font: f, heavy: false }, [s.replace(/\s+$/, '') + '.'], widthOf(s + '.', f, false), true);
}
function finish(t, lines, w, cut) {
  const hs = lines.map(l => heightOf(t.font, l));
  return { font: t.font, heavy: !!t.heavy, lines, w, h: hs.reduce((a, b) => a + b, 0) + (lines.length - 1) * 2, cut: !!cut };
}
/* draws a layout, middle at cx and top at `top`; returns the bottom */
export function drawLayout(R, L, cx, top, color, o) {
  let y = top;
  L.lines.forEach(l => { drawText(R, l, cx, y, color, L.font, Object.assign({ heavy: L.heavy }, o)); y += heightOf(L.font, l) + 2; });
  return top + L.h;
}
