/* Bekkedal's text renderer.
 *
 * Glyphs are stamped from a prerendered atlas — one canvas per colour and
 * size, built on first use and kept — so drawing a line costs one drawImage
 * per character and no per-pixel work. The reason it is worth the machinery
 * is `textW`: it knows exactly how wide a string will be before it is drawn,
 * which is what lets layout_check.js prove a box holds its contents. The old
 * `fillText` at '10px monospace' could not answer that question outside a
 * browser.
 *
 * `y` is the TOP of the glyph cell, not a baseline. Every anchor in this app
 * is a box corner now, which is what makes the layout arithmetic checkable.
 *
 * Takes the destination context and the palette lookup rather than importing
 * them, because both belong to the app instance and an app must not reach for
 * another one's canvas.
 */
import { FONT_GLYPH_W, FONT_GLYPH_H, FONT_ADV, FONT_SM, FONT_GLYPHS, FONT_NOTDEF } from './font.js';

export function createText(g, C) {
  const keys = Object.keys(FONT_GLYPHS);
  const ix = {};
  keys.forEach((ch, i) => { ix[ch] = i; });
  const cells = keys.map(ch => FONT_GLYPHS[ch].split('|')).concat([FONT_NOTDEF.split('|')]);
  const notdef = cells.length - 1;
  const cache = {};

  function atlas(col, size) {
    const k = col + ':' + size;
    if (cache[k]) return cache[k];
    const c = document.createElement('canvas');
    c.width = cells.length * FONT_GLYPH_W * size;
    c.height = FONT_GLYPH_H * size;
    const q = c.getContext('2d');
    q.fillStyle = C(col);
    cells.forEach((rows, gi) => {
      const ox = gi * FONT_GLYPH_W * size;
      for (let ry = 0; ry < FONT_GLYPH_H; ry++) {
        const row = rows[ry];
        for (let rx = 0; rx < FONT_GLYPH_W; rx++)
          if (row[rx] === '#') q.fillRect(ox + rx * size, ry * size, size, size);
      }
    });
    cache[k] = c; return c;
  }

  const textW = (t, size) => String(t).length * FONT_ADV * (size == null ? FONT_SM : size);
  const textCols = (w, size) => Math.max(1, Math.floor(w / (FONT_ADV * (size == null ? FONT_SM : size))));

  function text(t, x, y, col, size) {
    const str = String(t), z = size == null ? FONT_SM : size;
    const a = atlas(col == null ? 15 : col, z);
    const gw = FONT_GLYPH_W * z, gh = FONT_GLYPH_H * z, adv = FONT_ADV * z;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === ' ') continue;
      const gi = ix[ch] == null ? notdef : ix[ch];
      g.drawImage(a, gi * gw, 0, gw, gh, x + i * adv, y, gw, gh);
    }
  }

  /* Break a string to fit `w` pixels. The old build had no wrapping at all —
     line breaks were authored into data.js and the longest dialogue line
     overran its box by about twenty characters. Wrapping here means the
     content tables never have to know how wide the box is. */
  function wrapText(t, w, size) {
    const per = textCols(w, size), out = [];
    let line = '';
    for (const word of String(t).split(' ')) {
      let wd = word;
      while (wd.length > per) {                       /* a word longer than the box */
        if (line) { out.push(line); line = ''; }
        out.push(wd.slice(0, per)); wd = wd.slice(per);
      }
      if (!line) line = wd;
      else if (line.length + 1 + wd.length <= per) line += ' ' + wd;
      else { out.push(line); line = wd; }
    }
    if (line) out.push(line);
    return out.length ? out : [''];
  }

  return { text, textW, textCols, wrapText };
}
