/* HolyC's preprocessor, over tokens (pure). The lexer leaves every line that starts with # as one `pp` token; this takes them out and does what they say:
   #define NAME value           a name that is replaced by tokens (and #define NAME(a, b) body, a macro with arguments)
   #undef NAME
   #ifdef / #ifndef / #if / #else / #endif       what is not wanted is dropped (#if reads a number, or a name that is defined, or defined(NAME), !, &&, ||)
   #include, #exe, #help_index and the rest      nothing to fetch here, so they are read and let go
   A macro is replaced where its name is used, again inside what it was replaced with (but never inside itself). */
import { hcLex, HolyCError } from './holyc_lex.js';

const strip = t => t.slice(0, -1);                                   /* a lexed text without its eof */

export function preprocess(tokens, predefined) {
  const defs = new Map(Object.entries(predefined || {}).map(([k, v]) => [k, { body: strip(hcLex(String(v))), params: null }]));
  const out = [];
  const stack = [];                                                  /* one entry per open #if: { on, taken, parent } */
  const live = () => stack.every(s => s.on);

  /* the value of a #if line */
  function truth(text, line) {
    const src = text.replace(/defined\s*\(\s*([A-Za-z_]\w*)\s*\)|defined\s+([A-Za-z_]\w*)/g, (m, a, b) => (defs.has(a || b) ? '1' : '0'));
    const toks = strip(hcLex(src)).map(t => (t.k === 'id' ? (defs.has(t.v) && defs.get(t.v).body.length === 1 && defs.get(t.v).body[0].k === 'num' ? { k: 'num', v: defs.get(t.v).body[0].v } : { k: 'num', v: 0 }) : t));
    let p = 0;
    const peek = () => toks[p], eatOp = v => (toks[p] && toks[p].k === 'op' && toks[p].v === v ? (p++, true) : false);
    const prim = () => {
      if (eatOp('!')) return prim() ? 0 : 1;
      if (eatOp('(')) { const v = or(); eatOp(')'); return v; }
      const t = toks[p++];
      if (!t || t.k !== 'num') throw new HolyCError('#if wants a number, found "' + (t ? t.v : 'nothing') + '"', line);
      return t.v;
    };
    const cmp = () => { let a = prim(); while (peek() && peek().k === 'op' && ['==', '!=', '<', '>', '<=', '>='].indexOf(peek().v) >= 0) { const o = toks[p++].v, b = prim(); a = (o === '==' ? a === b : o === '!=' ? a !== b : o === '<' ? a < b : o === '>' ? a > b : o === '<=' ? a <= b : a >= b) ? 1 : 0; } return a; };
    const and = () => { let a = cmp(); while (eatOp('&&')) { const b = cmp(); a = a && b ? 1 : 0; } return a; };
    const or = () => { let a = and(); while (eatOp('||')) { const b = and(); a = a || b ? 1 : 0; } return a; };
    return or() ? true : false;
  }

  function directive(t) {
    const m = /^([A-Za-z_]\w*)\s*([\s\S]*)$/.exec(t.v);
    if (!m) return;
    const word = m[1], rest = m[2].trim();
    if (word === 'ifdef' || word === 'ifndef' || word === 'if') {
      const parentOn = live();
      const cond = !parentOn ? false : word === 'if' ? truth(rest, t.line) : (defs.has(rest.split(/\s/)[0]) === (word === 'ifdef'));
      stack.push({ on: cond, taken: cond, line: t.line });
      return;
    }
    if (word === 'else' || word === 'elif') {
      const s = stack[stack.length - 1];
      if (!s) throw new HolyCError('#' + word + ' with no #if before it', t.line);
      const parentOn = stack.slice(0, -1).every(q => q.on);
      if (word === 'else') s.on = parentOn && !s.taken; else s.on = parentOn && !s.taken && truth(rest, t.line);
      s.taken = s.taken || s.on;
      return;
    }
    if (word === 'endif') { if (!stack.length) throw new HolyCError('#endif with no #if before it', t.line); stack.pop(); return; }
    if (!live()) return;
    if (word === 'define') {
      const d = /^([A-Za-z_]\w*)(\(([^)]*)\))?\s*([\s\S]*)$/.exec(rest);
      if (!d) throw new HolyCError('#define needs a name', t.line);
      const params = d[2] ? d[3].split(',').map(s => s.trim()).filter(Boolean) : null;
      const body = strip(hcLex(d[4])).map(x => Object.assign({}, x, { line: t.line }));
      defs.set(d[1], { body: body, params: params });
    } else if (word === 'undef') defs.delete(rest.split(/\s/)[0]);
    else if (word === 'assert' && !truth(rest, t.line)) throw new HolyCError('#assert failed: ' + rest, t.line);
  }

  /* replace the macros in `toks` (each token carries the line it is used on) */
  function expand(toks, line, hide) {
    const res = [];
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i], d = t.k === 'id' ? defs.get(t.v) : null;
      if (!d || hide.has(t.v)) { res.push(Object.assign({}, t, { line: line })); continue; }
      let body = d.body, used = 0;
      if (d.params) {
        if (!(toks[i + 1] && toks[i + 1].k === 'op' && toks[i + 1].v === '(')) { res.push(Object.assign({}, t, { line: line })); continue; }
        const args = [[]]; let depth = 0, j = i + 2;
        for (; j < toks.length; j++) {
          const x = toks[j];
          if (x.k === 'op' && x.v === '(') depth++;
          if (x.k === 'op' && x.v === ')') { if (!depth) break; depth--; }
          if (x.k === 'op' && x.v === ',' && !depth) { args.push([]); continue; }
          args[args.length - 1].push(x);
        }
        if (j >= toks.length) throw new HolyCError('the macro ' + t.v + ' is missing its )', line);
        used = j - i;
        const bind = new Map(d.params.map((p, k) => [p, expand(args[k] || [], line, hide)]));
        body = [];
        d.body.forEach(b => { if (b.k === 'id' && bind.has(b.v)) bind.get(b.v).forEach(x => body.push(x)); else body.push(b); });
      }
      const inner = new Set(hide); inner.add(t.v);
      expand(body, line, inner).forEach(x => res.push(x));
      i += used;
    }
    return res;
  }

  /* group the live tokens of each line's worth together so a macro with arguments can reach across them */
  const keep = [];
  tokens.forEach(t => {
    if (t.k === 'pp') { directive(t); return; }
    if (live()) keep.push(t);
  });
  if (stack.length) throw new HolyCError('this #if is never closed: an #endif is missing', stack[stack.length - 1].line);
  if (!defs.size) return keep;
  /* expand line by line so the replaced tokens say the line they are used on */
  let i = 0;
  while (i < keep.length) {
    const eof = keep[i].k === 'eof';
    let j = i;
    /* a macro call may span lines: take tokens until the parentheses balance after a function-like name */
    out.push.apply(out, expandOne(keep, i, (n) => { j = n; }));
    i = Math.max(j, i + 1);
    if (eof) break;
  }
  return out;

  function expandOne(arr, at, done) {
    const t = arr[at], d = t.k === 'id' ? defs.get(t.v) : null;
    if (!d) { done(at + 1); return [t]; }
    if (!d.params) { done(at + 1); return expand([t], t.line, new Set()); }
    if (!(arr[at + 1] && arr[at + 1].k === 'op' && arr[at + 1].v === '(')) { done(at + 1); return [t]; }
    let depth = 0, j = at + 1;
    for (; j < arr.length; j++) { const x = arr[j]; if (x.k === 'op' && x.v === '(') depth++; if (x.k === 'op' && x.v === ')' && !--depth) break; }
    done(j + 1);
    return expand(arr.slice(at, j + 1), t.line, new Set());
  }
}
