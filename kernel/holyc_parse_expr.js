/* HolyC's parser, the expressions (pure). The precedence is HolyC's, not C's, from the tightest: ` >> <<, then * / %, then &, then ^, then |, then + -, then < > <= >=,
   then == !=, then &&, then ^^, then ||, then the assignments. (Yes: in HolyC `a & b + c` is `(a & b) + c`.) A chain of comparisons reads as it does on paper: `0 < x < 10`.
   A cast is written after what it casts, `x(U8)`, never `(U8)x`. There is no ?: in HolyC. */
import { HolyCError } from './holyc_lex.js';
import { T } from './holyc_types.js';

const ASSIGN = ['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>='];
const REL = ['<', '>', '<=', '>='];

export function installExpr(P) {
  const { at, eat, peek } = P;
  P.expression = () => assign();

  function assign() {
    const left = bin(xor, ['||']);
    if (at('op') && ASSIGN.indexOf(peek().v) >= 0) {
      const op = eat('op');
      return { k: 'assign', op: op.v, target: left, value: assign(), line: op.line };
    }
    return left;
  }
  function binary(next, ops) {
    return function () {
      let l = next();
      while (at('op') && ops.indexOf(peek().v) >= 0) {
        const t = eat('op');
        l = { k: 'bin', op: t.v, l: l, r: next(), line: t.line };
      }
      return l;
    };
  }
  const bin = (next, ops) => binary(next, ops)();
  const xor = () => bin(and, ['^^']);
  const and = () => bin(equality, ['&&']);
  const equality = () => bin(relational, ['==', '!=']);
  function relational() {
    const first = additive();
    if (!(at('op') && REL.indexOf(peek().v) >= 0)) return first;
    const operands = [first], ops = [];
    while (at('op') && REL.indexOf(peek().v) >= 0) { ops.push(eat('op')); operands.push(additive()); }
    if (ops.length === 1) return { k: 'bin', op: ops[0].v, l: first, r: operands[1], line: ops[0].line };
    return { k: 'cmp', ops: ops.map(o => o.v), operands: operands, line: ops[0].line };
  }
  const additive = () => bin(bitor, ['+', '-']);
  const bitor = () => bin(bitxor, ['|']);
  const bitxor = () => bin(bitand, ['^']);
  const bitand = () => bin(mul, ['&']);
  const mul = () => bin(shift, ['*', '/', '%']);
  const shift = () => bin(unary, ['<<', '>>', '`']);

  function unary() {
    const t = peek();
    if (t.k === 'op') {
      if (t.v === '-') { P.p++; return { k: 'neg', e: unary(), line: t.line }; }
      if (t.v === '!') { P.p++; return { k: 'not', e: unary(), line: t.line }; }
      if (t.v === '~') { P.p++; return { k: 'bnot', e: unary(), line: t.line }; }
      if (t.v === '&') { P.p++; return { k: 'addr', e: unary(), line: t.line }; }
      if (t.v === '*') { P.p++; return { k: 'deref', e: unary(), line: t.line }; }
      if (t.v === '++' || t.v === '--') { P.p++; return { k: 'pre', op: t.v, e: unary(), line: t.line }; }
    }
    if (t.k === 'id' && t.v === 'sizeof' && peek(1).k === 'op' && peek(1).v === '(') {
      P.p += 2;
      let n;
      if (P.isTypeName(peek())) { const ty = typeExpr(); n = { k: 'sizeof', type: ty, line: t.line }; }
      else n = { k: 'sizeof', e: P.expression(), line: t.line };
      eat('op', ')');
      return n;
    }
    if (t.k === 'id' && t.v === 'offset' && peek(1).k === 'op' && peek(1).v === '(') {
      P.p += 2;
      const cls = eat('id').v, path = [];
      while (at('op', '.')) { P.p++; path.push(eat('id').v); }
      eat('op', ')');
      return { k: 'offset', cls: cls, path: path, line: t.line };
    }
    return postfix();
  }

  /* a type written out: `U8`, `CPoint *`, `I64 **` */
  function typeExpr() {
    const b = eat('id').v;
    return T(b, P.stars());
  }
  /* is the ( here the start of a cast: `(`, a type, stars, `)` */
  function castAhead() {
    if (!P.isTypeName(peek(1))) return false;
    let k = 2;
    while (peek(k).k === 'op' && peek(k).v === '*') k++;
    return peek(k).k === 'op' && peek(k).v === ')';
  }

  function postfix() {
    let e = primary();
    for (;;) {
      if (at('op', '(')) {
        if (castAhead()) { const line = eat('op', '(').line; const ty = typeExpr(); eat('op', ')'); e = { k: 'cast', e: e, type: ty, line: line }; continue; }
        const line = eat('op', '(').line;
        const args = [];
        while (!at('op', ')') && !at('eof')) {
          args.push(P.expression());
          if (at('op', ',')) P.p++;
          else if (!at('op', ')')) throw new HolyCError('expected , or ) in the arguments, found "' + peek().v + '"', peek().line);
        }
        eat('op', ')');
        e = { k: 'call', callee: e, args: args, line: line };
      } else if (at('op', '[')) {
        const line = eat('op', '[').line, i = P.expression();
        eat('op', ']');
        e = { k: 'index', e: e, i: i, line: line };
      } else if (at('op', '.') || at('op', '->')) {
        const t = eat('op'), name = eat('id').v;
        e = { k: 'member', e: e, name: name, arrow: t.v === '->', line: t.line };
      } else if (at('op', '++') || at('op', '--')) {
        const t = eat('op');
        e = { k: 'post', op: t.v, e: e, line: t.line };
      } else break;
    }
    return e;
  }

  function primary() {
    if (at('num')) { const t = eat('num'); return { k: 'num', v: t.v, float: !!t.float }; }
    if (at('str')) return { k: 'str', v: eat('str').v };
    if (at('id')) { const t = eat('id'); return { k: 'var', name: t.v, line: t.line }; }
    if (at('op', '(')) { P.p++; const e = P.expression(); eat('op', ')'); return e; }
    const t = peek();
    throw new HolyCError(t.k === 'eof' ? 'the program ends in the middle of a statement' : 'unexpected "' + t.v + '"', t.line);
  }
}
