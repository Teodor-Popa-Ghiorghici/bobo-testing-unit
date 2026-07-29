import { Snd } from './snd.js';
import { godStir, godNext, godRand, godWords, godSong } from './god.js';

/* ==========================================================================
   HOLYC
   --------------------------------------------------------------------------
   A real subset, not a progress bar. Tokeniser, recursive descent parser,
   tree-walking evaluator. What makes it HolyC rather than C: a statement
   that is only a string prints it, a format string takes its arguments as
   the rest of the statement, and a function name on its own is a call.
   ========================================================================== */
export function hcLex(src) {
  const t = [];
  let i = 0, line = 1;
  const isD = c => c >= '0' && c <= '9';
  const isA = c => /[A-Za-z_]/.test(c);
  while (i < src.length) {
    const c = src.charAt(i);
    if (c === '\n') { line++; i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && src.charAt(i + 1) === '/') { while (i < src.length && src.charAt(i) !== '\n') i++; continue; }
    if (c === '/' && src.charAt(i + 1) === '*') {
      i += 2;
      while (i < src.length && !(src.charAt(i) === '*' && src.charAt(i + 1) === '/')) { if (src.charAt(i) === '\n') line++; i++; }
      i += 2; continue;
    }
    if (c === '"') {
      let s = '', j = i + 1;
      while (j < src.length && src.charAt(j) !== '"') {
        if (src.charAt(j) === '\\') {
          const n = src.charAt(j + 1);
          s += n === 'n' ? '\n' : n === 't' ? '\t' : n === '\\' ? '\\' : n === '"' ? '"' : n;
          j += 2;
        } else { s += src.charAt(j); j++; }
      }
      t.push({ k: 'str', v: s, line: line });
      i = j + 1; continue;
    }
    if (isD(c)) {
      let j = i;
      while (j < src.length && /[0-9.xXa-fA-F]/.test(src.charAt(j))) j++;
      t.push({ k: 'num', v: Number(src.slice(i, j)), line: line });
      i = j; continue;
    }
    if (isA(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src.charAt(j))) j++;
      t.push({ k: 'id', v: src.slice(i, j), line: line });
      i = j; continue;
    }
    const three = src.substr(i, 2);
    if (['==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/='].indexOf(three) >= 0) {
      t.push({ k: 'op', v: three, line: line }); i += 2; continue;
    }
    t.push({ k: 'op', v: c, line: line });
    i++;
  }
  t.push({ k: 'eof', v: '', line: line });
  return t;
}

export function HolyCError(msg, line) {
  this.message = msg;
  this.line = line;
  this.holyc = true;
}

export function hcParse(tokens) {
  let p = 0;
  const peek = (n) => tokens[p + (n || 0)];
  const at = (k, v) => peek().k === k && (v === undefined || peek().v === v);
  const eat = (k, v) => {
    if (!at(k, v)) throw new HolyCError('expected ' + (v || k) + ', found "' + peek().v + '"', peek().line);
    return tokens[p++];
  };
  const TYPES = { U0: 1, I64: 1, I32: 1, I16: 1, I8: 1, U64: 1, U32: 1, U16: 1, U8: 1, F64: 1, Bool: 1 };

  function program() {
    const body = [];
    while (!at('eof')) body.push(statement());
    return { k: 'block', body: body };
  }

  function block() {
    eat('op', '{');
    const body = [];
    while (!at('op', '}') && !at('eof')) body.push(statement());
    eat('op', '}');
    return { k: 'block', body: body };
  }

  function statement() {
    if (at('op', '{')) return block();
    if (at('op', ';')) { p++; return { k: 'empty' }; }

    if (at('id') && TYPES[peek().v]) {
      const ty = eat('id').v;
      /* a function definition? */
      if (at('id') && peek(1).k === 'op' && peek(1).v === '(') {
        const name = eat('id').v;
        eat('op', '(');
        const params = [];
        while (!at('op', ')')) {
          if (at('id') && TYPES[peek().v]) p++;
          if (at('op', '*')) p++;
          if (at('id')) params.push(eat('id').v);
          if (at('op', ',')) p++;
          else break;
        }
        eat('op', ')');
        const b = block();
        return { k: 'fn', name: name, params: params, body: b };
      }
      /* otherwise one or more declarations */
      const decls = [];
      while (at('id')) {
        const name = eat('id').v;
        let init = null;
        if (at('op', '=')) { p++; init = expression(); }
        decls.push({ name: name, init: init });
        if (at('op', ',')) { p++; continue; }
        break;
      }
      if (at('op', ';')) p++;
      return { k: 'decl', ty: ty, decls: decls };
    }

    if (at('id', 'if')) {
      p++; eat('op', '('); const c = expression(); eat('op', ')');
      const th = statement();
      let el = null;
      if (at('id', 'else')) { p++; el = statement(); }
      return { k: 'if', cond: c, then: th, else: el };
    }
    if (at('id', 'while')) {
      p++; eat('op', '('); const c = expression(); eat('op', ')');
      return { k: 'while', cond: c, body: statement() };
    }
    if (at('id', 'for')) {
      p++; eat('op', '(');
      const init = at('op', ';') ? null : statement0();
      eat('op', ';');
      const cond = at('op', ';') ? null : expression();
      eat('op', ';');
      const step = at('op', ')') ? null : expression();
      eat('op', ')');
      return { k: 'for', init: init, cond: cond, step: step, body: statement() };
    }
    if (at('id', 'return')) {
      p++;
      const v = at('op', ';') ? null : expression();
      if (at('op', ';')) p++;
      return { k: 'ret', value: v };
    }
    if (at('id', 'break')) { p++; if (at('op', ';')) p++; return { k: 'break' }; }

    /* the HolyC part: a statement that starts with a string is a print, and
       everything after the comma is an argument to it */
    if (at('str')) {
      const parts = [{ k: 'str', v: eat('str').v }];
      while (at('op', ',')) { p++; parts.push(expression()); }
      if (at('op', ';')) p++;
      return { k: 'print', parts: parts };
    }

    const e = expression();
    if (at('op', ';')) p++;
    return { k: 'expr', e: e };
  }

  /* a for-initialiser: a declaration or a bare expression, no semicolon eaten */
  function statement0() {
    if (at('id') && TYPES[peek().v]) {
      const ty = eat('id').v;
      const decls = [];
      while (at('id')) {
        const name = eat('id').v;
        let init = null;
        if (at('op', '=')) { p++; init = expression(); }
        decls.push({ name: name, init: init });
        if (at('op', ',')) { p++; continue; }
        break;
      }
      return { k: 'decl', ty: ty, decls: decls };
    }
    return { k: 'expr', e: expression() };
  }

  function expression() { return assign(); }

  function assign() {
    const left = logicOr();
    if (at('op', '=') || at('op', '+=') || at('op', '-=') || at('op', '*=') || at('op', '/=')) {
      const op = eat('op').v;
      const right = assign();
      return { k: 'assign', op: op, target: left, value: right };
    }
    return left;
  }
  function bin(next, ops) {
    return function () {
      let l = next();
      while (at('op') && ops.indexOf(peek().v) >= 0) {
        const op = eat('op').v;
        l = { k: 'bin', op: op, l: l, r: next() };
      }
      return l;
    };
  }
  const cmpEq = bin(() => cmpRel(), ['==', '!=']);
  const logicAnd = bin(() => cmpEq(), ['&&']);
  const logicOr = bin(() => logicAnd(), ['||']);
  function cmpRel() { return bin(() => addsub(), ['<', '>', '<=', '>='])(); }
  function addsub() { return bin(() => muldiv(), ['+', '-'])(); }
  function muldiv() { return bin(() => unary(), ['*', '/', '%'])(); }

  function unary() {
    if (at('op', '-')) { p++; return { k: 'neg', e: unary() }; }
    if (at('op', '!')) { p++; return { k: 'not', e: unary() }; }
    if (at('op', '++') || at('op', '--')) {
      const op = eat('op').v;
      return { k: 'pre', op: op, e: unary() };
    }
    return postfix();
  }

  function postfix() {
    let e = primary();
    for (;;) {
      if (at('op', '(')) {
        p++;
        const args = [];
        while (!at('op', ')') && !at('eof')) {
          args.push(expression());
          if (at('op', ',')) p++;
        }
        eat('op', ')');
        e = { k: 'call', callee: e, args: args };
      } else if (at('op', '++') || at('op', '--')) {
        e = { k: 'post', op: eat('op').v, e: e };
      } else break;
    }
    return e;
  }

  function primary() {
    if (at('num')) return { k: 'num', v: eat('num').v };
    if (at('str')) return { k: 'str', v: eat('str').v };
    if (at('id')) return { k: 'var', name: eat('id').v };
    if (at('op', '(')) { p++; const e = expression(); eat('op', ')'); return e; }
    if (at('op', '*') || at('op', '&')) { p++; return primary(); }   /* pointers, waved through */
    throw new HolyCError('unexpected "' + peek().v + '"', peek().line);
  }

  return program();
}

/* ---- the evaluator ------------------------------------------------------ */
export function hcFormat(fmt, args) {
  let i = 0;
  return String(fmt).replace(/%[-0-9.]*([dsfxXc%])/g, (m, k) => {
    if (k === '%') return '%';
    const v = args[i++];
    if (k === 'd') return String(Math.trunc(Number(v) || 0));
    if (k === 'f') return Number(v || 0).toFixed(6);
    if (k === 'x') return (Math.trunc(Number(v) || 0) >>> 0).toString(16);
    if (k === 'X') return (Math.trunc(Number(v) || 0) >>> 0).toString(16).toUpperCase();
    if (k === 'c') return String.fromCharCode(Number(v) || 32);
    return String(v == null ? '' : v);
  });
}

const HC_STEPS = 400000;

export function hcRun(ast, out, env, hooks) {
  hooks = hooks || {};
  const globals = env || Object.create(null);
  const fns = Object.create(null);
  let steps = 0;
  let buffer = '';

  const emit = s => {
    buffer += s;
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      out(buffer.slice(0, nl));
      buffer = buffer.slice(nl + 1);
    }
  };

  function Ret(v) { this.v = v; }
  const BREAK = { sig: 'break' };

  const BUILTIN = {
    Print: a => { emit(hcFormat(a[0], a.slice(1))); return 0; },
    PutS:  a => { emit(String(a[0])); return 0; },
    Beep:  () => { Snd.ok(); return 0; },
    BellRing: a => { Snd.bell(); return Math.trunc(a[0] || 1); },
    Sleep: a => { return Math.trunc(a[0] || 0); },     /* time does not pass here */
    Rand:  () => { godStir(); return godNext() / 4294967296; },
    RandU16: () => godRand(65536),
    GodWord: a => { const w = godWords(Math.max(1, Math.trunc(a[0] || 1))); emit(w.join(' ').toUpperCase() + '\n'); return w.length; },
    GodDoodle: () => { if (hooks.godDoodle) hooks.godDoodle(); return 0; },
    GodSong: () => godSong(),
    StrLen: a => String(a[0] == null ? '' : a[0]).length,
    ToUpper: a => String(a[0] == null ? '' : a[0]).toUpperCase(),
    MemSet: a => { emit('MemSet(' + (a[0] == null ? 'SCREEN' : a[0]) + ', ' + (a[1] | 0) + ', ' + (a[2] | 0) + ')\n'); return 0; },
    Cd: a => { emit('Cd("' + a[0] + '")\n'); return 0; },
    Dir: () => { emit((hooks.dirNames ? hooks.dirNames() : []).join('  ') + '\n'); return 0; },
    Exit: () => { throw new Ret(0); },
    Panic: a => { throw new HolyCError('Panic: ' + (a[0] || 'called by hand'), 0); },
    DebuggerEnter: () => { throw new HolyCError('DebuggerEnter', 0); }
  };

  function lookup(name) {
    if (name in globals) return globals[name];
    if (name in fns) return fns[name];
    if (name in BUILTIN) return BUILTIN[name];
    throw new HolyCError('undefined symbol "' + name + '"', 0);
  }

  function callFn(name, args) {
    if (name in BUILTIN) return BUILTIN[name](args);
    const f = fns[name];
    if (!f) throw new HolyCError('undefined function "' + name + '"', 0);
    const saved = {};
    f.params.forEach((pn, i) => { saved[pn] = globals[pn]; globals[pn] = args[i]; });
    let r = 0;
    try { exec(f.body); }
    catch (e) { if (e instanceof Ret) r = e.v; else throw e; }
    f.params.forEach(pn => { globals[pn] = saved[pn]; });
    return r;
  }

  function evalNode(n) {
    if (++steps > HC_STEPS) throw new HolyCError('ran too long; the loop does not end', 0);
    switch (n.k) {
      case 'num': case 'str': return n.v;
      case 'var': {
        const v = lookup(n.name);
        /* a function name on its own IS a call. This is the HolyC move. */
        if (typeof v === 'function' || (v && v.params)) return callFn(n.name, []);
        return v;
      }
      case 'call': {
        const args = n.args.map(evalNode);
        if (n.callee.k === 'var') return callFn(n.callee.name, args);
        throw new HolyCError('that is not callable', 0);
      }
      case 'neg': return -Number(evalNode(n.e));
      case 'not': return evalNode(n.e) ? 0 : 1;
      case 'bin': {
        if (n.op === '&&') return (evalNode(n.l) && evalNode(n.r)) ? 1 : 0;
        if (n.op === '||') return (evalNode(n.l) || evalNode(n.r)) ? 1 : 0;
        const a = evalNode(n.l), b = evalNode(n.r);
        switch (n.op) {
          case '+': return (typeof a === 'string' || typeof b === 'string') ? String(a) + String(b) : a + b;
          case '-': return a - b;
          case '*': return a * b;
          case '/': return b === 0 ? 0 : a / b;
          case '%': return b === 0 ? 0 : a % b;
          case '<': return a < b ? 1 : 0;
          case '>': return a > b ? 1 : 0;
          case '<=': return a <= b ? 1 : 0;
          case '>=': return a >= b ? 1 : 0;
          case '==': return a === b ? 1 : 0;
          case '!=': return a !== b ? 1 : 0;
        }
        return 0;
      }
      case 'assign': {
        if (n.target.k !== 'var') throw new HolyCError('cannot assign to that', 0);
        const cur = (n.target.name in globals) ? globals[n.target.name] : 0;
        const v = evalNode(n.value);
        const out2 = n.op === '=' ? v
                   : n.op === '+=' ? cur + v
                   : n.op === '-=' ? cur - v
                   : n.op === '*=' ? cur * v
                   : cur / (v || 1);
        globals[n.target.name] = out2;
        return out2;
      }
      case 'pre': {
        const name = n.e.name;
        globals[name] = (globals[name] || 0) + (n.op === '++' ? 1 : -1);
        return globals[name];
      }
      case 'post': {
        const name = n.e.name;
        const old = globals[name] || 0;
        globals[name] = old + (n.op === '++' ? 1 : -1);
        return old;
      }
    }
    throw new HolyCError('cannot evaluate ' + n.k, 0);
  }

  function exec(n) {
    if (++steps > HC_STEPS) throw new HolyCError('ran too long; the loop does not end', 0);
    switch (n.k) {
      case 'block': for (const s of n.body) exec(s); return;
      case 'empty': return;
      case 'fn': fns[n.name] = n; return;
      case 'decl':
        n.decls.forEach(d => { globals[d.name] = d.init ? evalNode(d.init) : 0; });
        return;
      case 'print': {
        const fmt = n.parts[0].v;
        const args = n.parts.slice(1).map(evalNode);
        emit(hcFormat(fmt, args));
        return;
      }
      case 'expr': evalNode(n.e); return;
      case 'if':
        if (evalNode(n.cond)) exec(n.then);
        else if (n.else) exec(n.else);
        return;
      case 'while':
        while (evalNode(n.cond)) {
          try { exec(n.body); } catch (e) { if (e === BREAK) break; throw e; }
        }
        return;
      case 'for': {
        if (n.init) exec(n.init);
        while (n.cond ? evalNode(n.cond) : true) {
          try { exec(n.body); } catch (e) { if (e === BREAK) break; throw e; }
          if (n.step) evalNode(n.step);
        }
        return;
      }
      case 'ret': throw new Ret(n.value ? evalNode(n.value) : 0);
      case 'break': throw BREAK;
    }
    throw new HolyCError('cannot run ' + n.k, 0);
  }

  try { exec(ast); }
  catch (e) { if (!(e instanceof Ret)) { if (buffer) { out(buffer); buffer = ''; } throw e; } }
  if (buffer) out(buffer);
  /* if a Main was defined and never called, call it, the way the JIT would */
  if (fns.Main && !globals.__ranMain) {
    globals.__ranMain = 1;
    try { callFn('Main', []); } catch (e) { if (!(e instanceof Ret)) throw e; }
  }
  return globals;
}

/* the whole pipeline, with ring 0 manners on failure left to the caller */
export function runHolyC(source, print, hooks) {
  const ast = hcParse(hcLex(source));
  hcRun(ast, line => print(line), null, hooks);
}

/* is this line HolyC, or is it a word for the answering machine? */
export function looksLikeHolyC(s) {
  const t = String(s).trim();
  if (!t) return false;
  if (t.charAt(0) === '"') return true;
  if (/^(U0|I64|I32|I16|I8|U64|U32|U16|U8|F64|Bool)\b/.test(t)) return true;
  if (/^(if|while|for|return)\s*[({]/.test(t)) return true;
  if (/;\s*$/.test(t)) return true;
  if (/^[A-Za-z_]\w*\s*\([^)]*\)\s*;?$/.test(t)) return true;
  return false;
}
