/* HolyC, the parser: recursive descent over holyc_lex.js's tokens (after holyc_pp.js has done the #lines). Pure. The expressions are holyc_parse_expr.js, the types,
   declarators and classes holyc_parse_decl.js; this file is the statements.
   What makes it HolyC rather than C: a statement that is only a string prints it, a format string takes its arguments as the rest of the statement, and a function name
   on its own is a call. `opts.strict` is the lab's way of reading it (HOLYC.EXE): a missing ; is an error, as it is in the real compiler, and said on the line that lacks it;
   the terminal reads it leniently, as it always did. `opts.classNames` is the set of class names already known (a Set; the parser adds the ones it finds), `opts.defines` the
   names the preprocessor starts with. Every statement carries its `line`, so a run-time error and the lab's "watch it run" can say where. */
import { HolyCError } from './holyc_lex.js';
import { preprocess } from './holyc_pp.js';
import { installDecl } from './holyc_parse_decl.js';
import { installExpr } from './holyc_parse_expr.js';

export const TYPES = { U0: 1, I64: 1, I32: 1, I16: 1, I8: 1, U64: 1, U32: 1, U16: 1, U8: 1, F64: 1, Bool: 1 };
export const INT_TYPES = { I64: 1, I32: 1, I16: 1, I8: 1, U64: 1, U32: 1, U16: 1, U8: 1, Bool: 1 };
const KEYWORDS = new Set(['if', 'else', 'while', 'do', 'for', 'return', 'break', 'continue', 'switch', 'case', 'default', 'goto', 'try', 'catch', 'throw', 'class', 'union', 'lock', 'sizeof', 'offset']);

export function hcParse(rawTokens, opts) {
  const tokens = preprocess(rawTokens, opts && opts.defines);
  const P = { tokens: tokens, p: 0, strict: !!(opts && opts.strict), classNames: (opts && opts.classNames) || new Set() };
  const peek = n => tokens[P.p + (n || 0)];
  const at = (k, v) => peek().k === k && (v === undefined || peek().v === v);
  const eat = (k, v) => {
    if (!at(k, v)) {
      const t = peek(), want = v || k;
      throw new HolyCError('expected ' + want + ', found ' + (t.k === 'eof' ? 'the end of the program' : '"' + t.v + '"'), t.line);
    }
    return tokens[P.p++];
  };
  /* the ; that ends a statement. Lenient reading lets it go; strict says which line is missing it. */
  P.peek = peek; P.at = at; P.eat = eat;
  P.semi = () => {
    if (at('op', ';')) { P.p++; return; }
    if (P.strict) { const prev = tokens[P.p - 1] || peek(); throw new HolyCError('missing ; after ' + (prev.k === 'str' ? JSON.stringify(prev.v) : '"' + prev.v + '"'), prev.line); }
  };
  installExpr(P); installDecl(P);

  function program() {
    const body = [];
    while (!at('eof')) body.push(stamped(statement));
    return { k: 'block', body: body, line: 1 };
  }
  function stamped(fn) { const ln = peek().line, s = fn(); if (s && !s.line) s.line = ln; return s; }

  function block() {
    const line = eat('op', '{').line;
    const body = [];
    while (!at('op', '}') && !at('eof')) body.push(stamped(statement));
    if (at('eof')) throw new HolyCError('this { is never closed: a } is missing', line);
    eat('op', '}');
    return { k: 'block', body: body, line: line };
  }

  /* a declaration or a function: `I64 x = 1;`  `U8 *Name(I64 a = 2) { }`  `U0 Proto();` */
  function declaration() {
    const mods = P.mods(), base = eat('id').v, line = peek().line;
    const first = P.declarator(base);
    if (at('op', '(') && first.name && !first.fnptr && !(first.type.dims)) {
      const ps = P.params();
      const fn = { k: 'fn', name: first.name, params: ps.names, ptypes: ps.types.map(t => (t.p ? '' : t.b)), ptypeD: ps.types, defaults: ps.defaults, variadic: ps.variadic,
                   ret: first.type.p ? first.type.b : base, retT: first.type, mods: mods, line: first.line || line };
      if (at('op', ';')) { P.p++; fn.body = null; fn.proto = true; return fn; }
      if (!at('op', '{')) throw new HolyCError('the function ' + first.name + ' needs its body: a { after the ( )', peek().line);
      fn.body = block();
      return fn;
    }
    const decls = P.declarators(base, first);
    P.semi();
    return { k: 'decl', ty: base, ptr: first.type.p > 0, decls: decls, mods: mods };
  }

  function switchStmt() {
    const line = eat('id', 'switch').line, bracket = at('op', '[');
    eat('op', bracket ? '[' : '(');
    const e = P.expression();
    eat('op', bracket ? ']' : ')');
    eat('op', '{');
    const items = [];
    while (!at('op', '}') && !at('eof')) {
      const t = peek();
      if (at('id', 'case')) {
        P.p++; const lo = P.expression(); let hi = lo;
        if (at('op', '...')) { P.p++; hi = P.expression(); }
        eat('op', ':'); items.push({ t: 'case', lo: lo, hi: hi, line: t.line });
      } else if (at('id', 'default') && peek(1).v === ':') { P.p += 2; items.push({ t: 'default', line: t.line }); }
      else if (at('id', 'start') && peek(1).v === ':') { P.p += 2; items.push({ t: 'start', line: t.line }); }
      else if (at('id', 'end') && peek(1).v === ':') { P.p += 2; items.push({ t: 'end', line: t.line }); }
      else items.push({ t: 'stmt', s: stamped(statement) });
    }
    if (at('eof')) throw new HolyCError('this switch { is never closed: a } is missing', line);
    eat('op', '}');
    return { k: 'switch', e: e, bracket: bracket, items: items, line: line };
  }

  function statement() {
    if (at('op', '{')) return block();
    if (at('op', ';')) { P.p++; return { k: 'empty' }; }
    if (at('id', 'class') || at('id', 'union') || ((at('id', 'public')) && (peek(1).v === 'class' || peek(1).v === 'union'))) { if (at('id', 'public')) P.p++; return P.classDecl(); }
    if (P.typeAhead() >= 0) return declaration();

    if (at('id', 'if')) {
      P.p++; eat('op', '('); const c = P.expression(); eat('op', ')');
      const th = stamped(statement);
      let el = null;
      if (at('id', 'else')) { P.p++; el = stamped(statement); }
      return { k: 'if', cond: c, then: th, else: el };
    }
    if (at('id', 'while')) {
      P.p++; eat('op', '('); const c = P.expression(); eat('op', ')');
      return { k: 'while', cond: c, body: stamped(statement) };
    }
    if (at('id', 'do')) {
      P.p++; const body = stamped(statement);
      eat('id', 'while'); eat('op', '('); const c = P.expression(); eat('op', ')'); P.semi();
      return { k: 'do', cond: c, body: body };
    }
    if (at('id', 'for')) {
      P.p++; eat('op', '(');
      let init = null;
      if (!at('op', ';')) {
        if (P.typeAhead() >= 0) { const mods = P.mods(), base = eat('id').v; init = { k: 'decl', ty: base, ptr: false, decls: P.declarators(base), mods: mods }; }
        else init = { k: 'expr', e: P.expression() };
      }
      eat('op', ';');
      const cond = at('op', ';') ? null : P.expression();
      eat('op', ';');
      const step = at('op', ')') ? null : P.expression();
      eat('op', ')');
      return { k: 'for', init: init, cond: cond, step: step, body: stamped(statement) };
    }
    if (at('id', 'switch')) return switchStmt();
    if (at('id', 'return')) {
      P.p++;
      const v = at('op', ';') ? null : P.expression();
      P.semi();
      return { k: 'ret', value: v };
    }
    if (at('id', 'break')) { P.p++; P.semi(); return { k: 'break' }; }
    if (at('id', 'continue')) { P.p++; P.semi(); return { k: 'continue' }; }
    if (at('id', 'goto')) { P.p++; const name = eat('id').v; P.semi(); return { k: 'goto', name: name }; }
    if (at('id', 'try')) {
      P.p++; const body = stamped(statement);
      if (!at('id', 'catch')) throw new HolyCError('a try needs a catch after it', peek().line);
      P.p++;
      return { k: 'try', body: body, handler: stamped(statement) };
    }
    if (at('id', 'throw')) {
      P.p++;
      const v = at('op', ';') ? null : P.expression();
      P.semi();
      return { k: 'throw', value: v };
    }
    if (at('id', 'lock')) { P.p++; return stamped(statement); }
    if (at('id', 'no_warn')) { while (!at('op', ';') && !at('eof')) P.p++; P.semi(); return { k: 'empty' }; }
    if (at('id') && peek(1).k === 'op' && peek(1).v === ':' && !KEYWORDS.has(peek().v)) { const name = eat('id').v; P.p++; return { k: 'label', name: name }; }

    /* the HolyC part: a statement that starts with a string is a print, and everything after the comma is an argument to it */
    if (at('str')) {
      const parts = [{ k: 'str', v: eat('str').v }];
      while (at('op', ',')) { P.p++; parts.push(P.expression()); }
      P.semi();
      return { k: 'print', parts: parts };
    }

    const e = P.expression();
    P.semi();
    return { k: 'expr', e: e };
  }

  return program();
}
