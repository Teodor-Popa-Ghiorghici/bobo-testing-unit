/* Bitmap text renderer over font_data's 5x7 table.

   Supports scale, per-character jitter (for shouted onomatopoeia), an ink
   outline, a drop shadow and alignment. Everything lands on whole pixels
   at every scale, so UI text stays as crisp as the sprites. */

import { ROWS, GLYPH_W, GLYPH_H } from './font_data.js';

const SPACING = 1;

/* typographic characters the 5x7 table doesn't carry, folded onto the
   nearest glyph so prose never renders as a row of '?' */
const FOLD = {
  '\u2014': '-', '\u2013': '-', '\u2018': "'", '\u2019': "'",
  '\u201C': '"', '\u201D': '"', '\u2026': '...', '\u00A0': ' ',
  '\u00E9': 'E', '\u00E8': 'E', '\u00FC': 'U', '\u00F6': 'O'
};

function fold(str) {
  let out = '';
  for (const ch of String(str)) out += FOLD[ch] !== undefined ? FOLD[ch] : ch;
  return out;
}

export function textWidth(str, scale, spacing) {
  const sc = scale || 1;
  const sp = spacing == null ? SPACING : spacing;
  return str.length * (GLYPH_W + sp) * sc - sp * sc;
}

function glyph(g, rows, x, y, sc, color) {
  g.fillStyle = color;
  for (let r = 0; r < GLYPH_H; r++) {
    const row = rows[r];
    let run = 0;
    for (let c = 0; c <= GLYPH_W; c++) {
      if (c < GLYPH_W && row[c] === '1') { run++; continue; }
      if (run) {
        g.fillRect(x + (c - run) * sc, y + r * sc, run * sc, sc);
        run = 0;
      }
    }
  }
}

/* opts: scale, color, align ('left'|'center'|'right'), spacing,
         outline (colour), shadow (colour), shadowDy, jitter (px),
         wave {amp, freq, t}, alpha */
export function text(g, str, x, y, opts) {
  const o = opts || {};
  const sc = Math.max(1, Math.round(o.scale || 1));
  const sp = o.spacing == null ? SPACING : o.spacing;
  const s = fold(str).toUpperCase();
  const w = textWidth(s, sc, sp);
  let cx = Math.round(o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x);
  const cy = Math.round(y);
  if (o.alpha != null) { g.save(); g.globalAlpha = o.alpha; }
  for (let i = 0; i < s.length; i++) {
    const rows = ROWS[s[i]] || ROWS['?'];
    let gy = cy;
    if (o.wave) gy += Math.round(Math.sin(o.wave.t * o.wave.freq + i * 0.7) * o.wave.amp);
    if (o.jitter) gy += Math.round((Math.random() - 0.5) * o.jitter);
    const gx = cx + (o.jitter ? Math.round((Math.random() - 0.5) * o.jitter) : 0);
    if (o.shadow) glyph(g, rows, gx + sc, gy + (o.shadowDy == null ? sc : o.shadowDy * sc), sc, o.shadow);
    if (o.outline) {
      glyph(g, rows, gx - sc, gy, sc, o.outline);
      glyph(g, rows, gx + sc, gy, sc, o.outline);
      glyph(g, rows, gx, gy - sc, sc, o.outline);
      glyph(g, rows, gx, gy + sc, sc, o.outline);
      glyph(g, rows, gx - sc, gy - sc, sc, o.outline);
      glyph(g, rows, gx + sc, gy - sc, sc, o.outline);
      glyph(g, rows, gx - sc, gy + sc, sc, o.outline);
      glyph(g, rows, gx + sc, gy + sc, sc, o.outline);
    }
    glyph(g, rows, gx, gy, sc, o.color || '#FFFFFF');
    cx += (GLYPH_W + sp) * sc;
  }
  if (o.alpha != null) g.restore();
}

/* word-wrapped paragraph, returns the y past the last line */
export function paragraph(g, str, x, y, maxW, opts) {
  const o = opts || {};
  const sc = Math.max(1, Math.round(o.scale || 1));
  const lineH = (GLYPH_H + 3) * sc;
  const words = fold(str).split(' ');
  let line = '', yy = y;
  for (const wd of words) {
    const test = line ? line + ' ' + wd : wd;
    if (textWidth(test, sc, o.spacing) > maxW && line) {
      text(g, line, x, yy, o);
      yy += lineH;
      line = wd;
    } else line = test;
  }
  if (line) { text(g, line, x, yy, o); yy += lineH; }
  return yy;
}

export { GLYPH_W, GLYPH_H };
