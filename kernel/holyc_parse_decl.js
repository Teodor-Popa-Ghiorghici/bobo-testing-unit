/* HolyC's parser, the declarations (pure): types, declarators, initialisers, functions, classes and unions. `P` is the parser's shared state (holyc_parse.js).
   A declarator is what comes after the base type: stars, a name (or a function pointer's `(*name)(args)`), array sizes, then `= value` or `= { ... }`. */
import { HolyCError } from './holyc_lex.js';
import { BUILTIN_TYPES, T } from './holyc_types.js';

const MODS = new Set(['public', 'static', 'extern', '_extern', 'import', '_import', 'export', '_export', 'reg', 'noreg', 'interrupt', 'haserrcode', 'argpop', 'lastclass', 'sys_enter']);
const BASE = new Set(BUILTIN_TYPES);

export function installDecl(P) {
  const { at, eat, peek } = P;
  P.baseTypes = BASE;
  /* does a type name stand here (after any modifiers)? Returns how many tokens the modifiers take, or -1 */
  P.typeAhead = () => {
    let k = 0;
    while (peek(k).k === 'id' && MODS.has(peek(k).v)) k++;
    const t = peek(k);
    if (t.k !== 'id') return -1;
    if (BASE.has(t.v) || P.classNames.has(t.v)) {
      /* a class name used as a plain name (a variable called like a class) is not a type here: it must be followed by something that declares */
      const n = peek(k + 1);
      if (P.classNames.has(t.v) && !(n.k === 'id' || (n.k === 'op' && (n.v === '*' || n.v === '(')))) return -1;
      return k;
    }
    return -1;
  };
  P.isTypeName = tok => tok.k === 'id' && (BASE.has(tok.v) || P.classNames.has(tok.v));
  P.mods = () => { const m = []; while (at('id') && MODS.has(peek().v)) m.push(eat('id').v); return m; };
  P.stars = () => { let n = 0; while (at('op', '*')) { P.p++; n++; } return n; };

  /* `[3][n]` after a name; `[]` is left open (null) for the initialiser to size */
  function dimsOf() {
    const dims = [];
    while (at('op', '[')) {
      P.p++;
      dims.push(at('op', ']') ? null : P.expression());
      eat('op', ']');
    }
    return dims;
  }

  /* the parameters of a function or of a pointer to one: `(I64 a, U8 *s = "x", ...)`; names are optional in a prototype */
  P.params = () => {
    eat('op', '(');
    const list = { names: [], types: [], defaults: [], variadic: false };
    while (!at('op', ')') && !at('eof')) {
      if (at('op', '...')) { P.p++; list.variadic = true; break; }
      P.mods();
      if (!P.isTypeName(peek())) throw new HolyCError('expected a type for this parameter, found "' + peek().v + '"', peek().line);
      const base = eat('id').v, d = P.declarator(base, true);
      const ty = d.type.dims ? T(d.type.b, d.type.p + 1) : d.type;          /* an array parameter is a pointer */
      list.names.push(d.name || ''); list.types.push(ty);
      list.defaults.push(at('op', '=') ? (P.p++, P.expression()) : null);
      if (at('op', ',')) P.p++; else break;
    }
    eat('op', ')');
    return list;
  };

  /* stars, then a name or `(*name)(...)`, then array sizes. `bare`: the name may be left out (a prototype's parameter) */
  P.declarator = (base, bare) => {
    const stars = P.stars(), line = peek().line;
    if (at('op', '(') && peek(1).k === 'op' && peek(1).v === '*') {
      P.p += 2; const pstars = P.stars(); const name = at('id') ? eat('id').v : ''; eat('op', ')');
      const ps = P.params();
      return { name: name, type: Object.assign(T(base, stars), { fnp: { params: ps.types, ret: T(base, stars), variadic: ps.variadic } }), line: line, fnptr: pstars };
    }
    const name = at('id') ? eat('id').v : '';
    if (!name && !bare) throw new HolyCError('expected a name, found "' + peek().v + '"', peek().line);
    const dims = dimsOf();
    return { name: name, type: T(base, stars, dims.length ? dims : null), line: line };
  };

  /* an initialiser: an expression, or { ... } (nested for a table or a class) */
  P.initialiser = () => {
    if (!at('op', '{')) return P.expression();
    const line = eat('op', '{').line, items = [];
    while (!at('op', '}') && !at('eof')) {
      items.push(P.initialiser());
      if (at('op', ',')) P.p++; else break;
    }
    eat('op', '}');
    return { k: 'initlist', items: items, line: line };
  };

  /* the declarators of one declaration, the first already begun: `I64 a = 1, *b, c[4];` */
  P.declarators = (base, first) => {
    const out = [];
    let d = first || P.declarator(base);
    for (;;) {
      let init = null;
      if (at('op', '=')) { P.p++; init = P.initialiser(); }
      out.push({ name: d.name, init: init, type: d.type, line: d.line });
      if (at('op', ',')) { P.p++; d = P.declarator(base); continue; }
      break;
    }
    return out;
  };

  /* class Name : Base { members };  union Name { members }; */
  P.classDecl = () => {
    const kw = eat('id'), union = kw.v === 'union', name = eat('id').v;
    let base = null;
    if (at('op', ':')) { P.p++; base = eat('id').v; if (!P.classNames.has(base)) throw new HolyCError('the class ' + base + ' is not known: define it first', kw.line); }
    P.classNames.add(name);
    if (at('op', ';')) { P.p++; return { k: 'empty' }; }                    /* a forward declaration */
    eat('op', '{');
    const members = [];
    while (!at('op', '}') && !at('eof')) {
      P.mods();
      if (!P.isTypeName(peek())) throw new HolyCError('a member needs a type, found "' + peek().v + '"', peek().line);
      const b = eat('id').v;
      let d = P.declarator(b);
      for (;;) {
        members.push({ name: d.name, type: d.type, line: d.line });
        if (at('op', ',')) { P.p++; d = P.declarator(b); continue; }
        break;
      }
      P.semi();
    }
    if (at('eof')) throw new HolyCError('this { is never closed: a } is missing', kw.line);
    eat('op', '}');
    if (at('op', ';')) P.p++;
    return { k: 'class', name: name, base: base, union: union, members: members, line: kw.line };
  };
}
