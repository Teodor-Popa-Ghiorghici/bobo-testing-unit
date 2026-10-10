/* HolyC, the tokeniser. Pure: no window, no sound, so a check can run it in Node (node apps/holyc/holyc_check.js).
   A number token knows if it was written with a point or an exponent (`float`), because HolyC divides integers as integers and the evaluator has to know.
   A line that starts with # is one `pp` token (the preprocessor's, holyc_pp.js). 'ABC' is a number: its letters packed low byte first, as in the real compiler. */
export function HolyCError(msg, line) {
  this.message = msg;
  this.line = line;
  this.holyc = true;
}

const OPS3 = ['<<=', '>>=', '...'];
const OPS2 = ['==', '!=', '<=', '>=', '&&', '||', '^^', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<', '>>', '->'];
const ESC = { n: '\n', t: '\t', r: '\r', '0': '\0', '\\': '\\', '"': '"', "'": "'", '$': '$' };

/* one escape at src[j] === '\\': the text it stands for and how far it reaches */
function escape(src, j) {
  const n = src.charAt(j + 1);
  if (n === 'x' && /[0-9a-fA-F]/.test(src.charAt(j + 2))) {
    let h = src.charAt(j + 2); if (/[0-9a-fA-F]/.test(src.charAt(j + 3))) h += src.charAt(j + 3);
    return { s: String.fromCharCode(parseInt(h, 16)), len: 2 + h.length };
  }
  return { s: n in ESC ? ESC[n] : n, len: 2 };
}

export function hcLex(src) {
  const t = [];
  let i = 0, line = 1, bol = true;
  const isD = c => c >= '0' && c <= '9';
  const isA = c => /[A-Za-z_]/.test(c);
  while (i < src.length) {
    const c = src.charAt(i);
    if (c === '\n') { line++; i++; bol = true; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === '#' && bol) {
      let j = i + 1; while (j < src.length && src.charAt(j) !== '\n') j++;
      t.push({ k: 'pp', v: src.slice(i + 1, j).replace(/\/\/.*$/, '').trim(), line: line });
      i = j; continue;
    }
    bol = false;
    if (c === '/' && src.charAt(i + 1) === '/') { while (i < src.length && src.charAt(i) !== '\n') i++; continue; }
    if (c === '/' && src.charAt(i + 1) === '*') {
      i += 2;
      while (i < src.length && !(src.charAt(i) === '*' && src.charAt(i + 1) === '/')) { if (src.charAt(i) === '\n') line++; i++; }
      i += 2; continue;
    }
    if (c === '"') {
      let s = '', j = i + 1, closed = false;
      while (j < src.length) {
        const ch = src.charAt(j);
        if (ch === '"') { closed = true; break; }
        if (ch === '\\') { const e = escape(src, j); s += e.s; j += e.len; }
        else { if (ch === '\n') line++; s += ch; j++; }
      }
      if (!closed) throw new HolyCError('this string never ends: it needs a closing "', line);
      t.push({ k: 'str', v: s, line: line });
      i = j + 1; continue;
    }
    /* 'A' is the number of the letter, as in C; 'ABC' is up to eight of them, the first in the lowest byte */
    if (c === "'") {
      let v = 0, j = i + 1, n = 0, closed = false;
      while (j < src.length && src.charAt(j) !== '\n') {
        const ch = src.charAt(j);
        if (ch === "'") { closed = true; break; }
        let code;
        if (ch === '\\') { const e = escape(src, j); code = e.s.charCodeAt(0); j += e.len; } else { code = ch.charCodeAt(0); j++; }
        v += (code & 255) * Math.pow(256, n++);
      }
      if (!closed || !n) throw new HolyCError(n ? 'this character constant never ends: it needs a closing \'' : 'an empty character constant', line);
      if (n > 8) throw new HolyCError('a character constant holds at most eight letters', line);
      t.push({ k: 'num', v: v, line: line });
      i = j + 1; continue;
    }
    if (isD(c) || (c === '.' && isD(src.charAt(i + 1)))) {
      let j = i, float = false;
      const m = /^0[xX][0-9a-fA-F]+|^0[bB][01]+/.exec(src.slice(i));
      if (m) { j = i + m[0].length; t.push({ k: 'num', v: /^0[bB]/.test(m[0]) ? parseInt(m[0].slice(2), 2) : Number(m[0]), float: false, line: line }); i = j; continue; }
      while (j < src.length && isD(src.charAt(j))) j++;
      if (src.charAt(j) === '.' && src.charAt(j + 1) !== '.') { float = true; j++; while (j < src.length && isD(src.charAt(j))) j++; }
      if (/[eE]/.test(src.charAt(j)) && /[0-9+-]/.test(src.charAt(j + 1)) && (isD(src.charAt(j + 1)) || isD(src.charAt(j + 2)))) {
        float = true; j += 2; while (j < src.length && isD(src.charAt(j))) j++;
      }
      t.push({ k: 'num', v: Number(src.slice(i, j)), float: float, line: line });
      i = j; continue;
    }
    if (isA(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src.charAt(j))) j++;
      t.push({ k: 'id', v: src.slice(i, j), line: line });
      i = j; continue;
    }
    const three = src.substr(i, 3), two = src.substr(i, 2);
    if (OPS3.indexOf(three) >= 0) { t.push({ k: 'op', v: three, line: line }); i += 3; continue; }
    if (OPS2.indexOf(two) >= 0) { t.push({ k: 'op', v: two, line: line }); i += 2; continue; }
    t.push({ k: 'op', v: c, line: line });
    i++;
  }
  t.push({ k: 'eof', v: '', line: line });
  return t;
}
