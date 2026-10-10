/* HolyC, the evaluator's expressions (pure): installed on the machine `M` that holyc_run.js makes. A variable is a value in its scope, unless it is an array, a class or has its
   address taken, and then it lives in the program's memory (holyc_mem.js) in a `slot` { addr, ty }. Everything that can be written to (a name, `*p`, `a[i]`, `o.m`, `p->m`)
   is an lvalue: { reg, name } for a plain variable or { addr, ty } for a place in memory, read by `get` and written by `set`, so `=`, `+=`, `++` and `&` work the same on all of them.
   The type of an expression is found by `tyOf` from the declarations (a pointer's step, a class's members, whether `/` truncates). */
import { HolyCError } from './holyc_lex.js';
import { wrap, BASE } from './holyc_mem.js';
import { T, isArr, isPtr, isFloat, isInt, isClass, sizeOf, elemOf, decay, ptrTo, UNSIGNED } from './holyc_types.js';
import { CONSTANTS, FLOATY } from './holyc_lib.js';

const I64 = T('I64'), F64 = T('F64'), STR = T('U8', 1), FS_T = T('CTask', 1);
const FN_BASE = 0x10000000, FN_STEP = 16;
const CMP = { '<': (a, b) => a < b, '>': (a, b) => a > b, '<=': (a, b) => a <= b, '>=': (a, b) => a >= b };
/* what a builtin gives back when it is not an integer */
const RET = { MAlloc: T('U0', 1), CAlloc: T('U0', 1), StrNew: STR, StrCpy: STR, StrPrint: STR, CatPrint: STR, MemCpy: T('U0', 1), MemSet: T('U0', 1) };
const bigOp = (op, a, b, unsigned) => {
  const x = unsigned ? BigInt.asUintN(64, BigInt(a)) : BigInt(a), y = BigInt(Math.max(0, b));
  const r = op === '&' ? x & BigInt(b) : op === '|' ? x | BigInt(b) : op === '^' ? x ^ BigInt(b) : op === '<<' ? (y > 63n ? 0n : x << y) : (y > 63n ? (unsigned || x >= 0n ? 0n : -1n) : x >> y);
  return Number(unsigned ? BigInt.asUintN(64, r) : BigInt.asIntN(64, r));
};

export function installEval(M) {
  const { err } = M;
  const cls = () => M.classes;
  const mem = () => M.mem();

  /* ---- names ------------------------------------------------------------------------------------------------------------ */
  M.find = (scope, name) => { for (let s = scope; s; s = s.parent) if (name in s.vars) return s; return null; };
  const find = M.find;
  M.child = scope => ({ vars: Object.create(null), types: Object.create(null), slots: null, parent: scope });
  const isFnAddr = v => typeof v === 'number' && v >= FN_BASE && v < FN_BASE + 4096 * FN_STEP && (v - FN_BASE) % FN_STEP === 0 && (v - FN_BASE) / FN_STEP < M.fnList.length;
  M.fnAddr = name => { let i = M.fnList.indexOf(name); if (i < 0) { i = M.fnList.length; M.fnList.push(name); } return FN_BASE + i * FN_STEP; };

  /* the value of a whole thing that was written to memory: an array and a class are their address, anything else is read out */
  const loadT = (t, a) => (isFloat(t) ? mem().load('F64', a) : isPtr(t) ? mem().load('U64', a) : mem().load(t.b, a));
  const storeT = (t, a, v) => { if (isFloat(t)) mem().store('F64', a, Number(v)); else if (isPtr(t)) mem().store('U64', a, Number(v) || 0); else mem().store(t.b, a, v); };
  const wholeT = t => isArr(t) || isClass(t, cls());
  const readSlot = slot => (wholeT(slot.ty) ? slot.addr : loadT(slot.ty, slot.addr));
  M.readVar = (s, name) => { const slot = s.slots && s.slots[name]; return slot ? readSlot(slot) : s.vars[name]; };
  M.bind = (s, name, ty, addr) => { if (!s.slots) s.slots = Object.create(null); s.slots[name] = { addr: addr, ty: ty }; s.vars[name] = 0; s.types[name] = ty; };
  /* a name whose address is taken after the fact is moved into memory (statics for a global, the stack otherwise) */
  function box(s, name) {
    const ty = s.types[name] || I64, size = Math.max(1, sizeOf(ty, cls())), a = s === M.gscope ? mem().alloc(size) : mem().push(size);
    const cur = s.vars[name];
    M.bind(s, name, ty, a);
    storeT(ty, a, typeof cur === 'number' ? cur : 0);
    return s.slots[name];
  }

  /* what a value becomes when it is put into something of type `ty` */
  M.coerce = (ty, v) => {
    if (!ty || isArr(ty)) return v;
    if (ty.fnp || ty.p > 0) return typeof v === 'string' ? mem().intern(v) : typeof v === 'number' ? Math.trunc(v) : v;
    if (ty.b === 'F64') return v;
    if (typeof v !== 'number') return v;
    return ty.b === 'U0' || !(ty.b in { I8: 1, U8: 1, I16: 1, U16: 1, I32: 1, U32: 1, I64: 1, U64: 1, Bool: 1 }) ? v : wrap(ty.b, v);
  };
  const coerce = M.coerce;

  /* ---- types of expressions -------------------------------------------------------------------------------------------- */
  const pointee = (n, sc) => { const t = tyOf(n, sc); return t && (isArr(t) || isPtr(t)) ? elemOf(t) : null; };
  function tyOf(n, sc) {
    switch (n.k) {
      case 'num': return n.float ? F64 : I64;
      case 'str': return STR;
      case 'var': {
        const s = find(sc, n.name);
        if (s) return s.types[n.name];
        if (n.name === 'Fs') return FS_T;
        const f = M.fns[n.name];
        if (f) return f.retT;
        return FLOATY[n.name] ? F64 : RET[n.name];
      }
      case 'call': {
        const c = n.callee;
        if (c.k === 'var') {
          const s = find(sc, c.name);
          if (s) { const t = s.types[c.name]; return t && t.fnp ? t.fnp.ret : undefined; }
          const f = M.fns[c.name];
          return f ? f.retT : FLOATY[c.name] ? F64 : RET[c.name];
        }
        const t = tyOf(c, sc);
        return t && t.fnp ? t.fnp.ret : undefined;
      }
      case 'neg': case 'bnot': return tyOf(n.e, sc);
      case 'not': case 'cmp': return I64;
      case 'bin': {
        const op = n.op;
        if (op === '&&' || op === '||' || op === '^^' || op === '==' || op === '!=' || CMP[op]) return I64;
        const l = tyOf(n.l, sc), r = tyOf(n.r, sc);
        if (op === '+' || op === '-') {
          const pl = l && (isArr(l) || isPtr(l)), pr = r && (isArr(r) || isPtr(r));
          if (pl && pr) return op === '-' ? I64 : decay(l);
          if (pl) return decay(l);
          if (pr && op === '+') return decay(r);
        }
        if (op === '<<' || op === '>>') return l || I64;
        return isFloat(l) || isFloat(r) ? F64 : (l && isInt(l) && r && isInt(r) && UNSIGNED[l.b] && UNSIGNED[r.b] ? l : I64);
      }
      case 'assign': return tyOf(n.target, sc);
      case 'pre': case 'post': return tyOf(n.e, sc);
      case 'addr': {
        const t = tyOf(n.e, sc);
        if (!t) return n.e.k === 'var' && M.fns[n.e.name] ? T('I64', 1) : undefined;
        return ptrTo(isArr(t) ? T(t.b, t.p) : t);
      }
      case 'deref': case 'index': { const t = tyOf(n.e, sc); return t ? elemOf(t) : undefined; }
      case 'member': { const t = tyOf(n.e, sc), c = t && cls()[t.b]; return c && c.fields[n.name] ? c.fields[n.name].ty : undefined; }
      case 'cast': return n.type;
      case 'sizeof': case 'offset': return I64;
    }
    return undefined;
  }
  M.tyOf = tyOf;
  const floaty = (n, sc) => { const t = tyOf(n, sc); return isFloat(t) || (n.k === 'num' && !!n.float); };

  /* ---- lvalues --------------------------------------------------------------------------------------------------------- */
  function memLv(a, ty, line) {
    if (typeof a === 'string') a = mem().intern(a);
    if (typeof a !== 'number') throw err('that is not a pointer', line);
    return { addr: a, ty: ty || I64 };
  }
  function lval(n, sc) {
    switch (n.k) {
      case 'var': {
        let s = find(sc, n.name);
        if (!s) {
          if (M.strict) throw err('"' + n.name + '" is not declared: write its type first, like  I64 ' + n.name + ';', n.line);
          s = M.gscope; s.vars[n.name] = 0;
        }
        const slot = s.slots && s.slots[n.name];
        return slot ? { addr: slot.addr, ty: slot.ty } : { reg: s, name: n.name };
      }
      case 'deref': { const t = tyOf(n.e, sc); return memLv(ev(n.e, sc), (t && elemOf(t)) || I64, n.line); }
      case 'index': {
        const t = tyOf(n.e, sc), et = (t && elemOf(t)) || T('U8'), base = ev(n.e, sc), i = ev(n.i, sc);
        const b = typeof base === 'string' ? mem().intern(base) : base;
        if (typeof b !== 'number') throw err('that cannot be indexed with [ ]', n.line);
        return memLv(b + Math.trunc(i) * sizeOf(et, cls()), et, n.line);
      }
      case 'member': {
        const t = tyOf(n.e, sc), c = t && cls()[t.b];
        if (!c) throw err('this has no members: .' + n.name + ' needs a class or a pointer to one', n.line);
        const f = c.fields[n.name];
        if (!f) throw err('the class ' + c.name + ' has no member called ' + n.name, n.line);
        return memLv(ev(n.e, sc) + f.off, f.ty, n.line);
      }
    }
    throw err('cannot assign to that', n.line);
  }
  const lget = L => (L.reg ? L.reg.vars[L.name] : wholeT(L.ty) ? L.addr : loadT(L.ty, L.addr));
  function lset(L, v, line) {
    if (L.reg) return (L.reg.vars[L.name] = coerce(L.reg.types[L.name], v));
    if (isArr(L.ty)) throw err('an array cannot be assigned to: copy into it with MemCpy or StrCpy', line);
    if (isClass(L.ty, cls())) { if (typeof v !== 'number') throw err('a class takes another of its own kind', line); mem().copy(L.addr, v, sizeOf(L.ty, cls())); return L.addr; }
    const w = isFloat(L.ty) || isPtr(L.ty) ? (isPtr(L.ty) ? coerce(L.ty, v) : v) : coerce(L.ty, v);
    storeT(L.ty, L.addr, w);
    return w;
  }
  M.lval = lval; M.lget = lget; M.lset = lset;

  /* ---- the operators --------------------------------------------------------------------------------------------------- */
  function binop(n, op, a, b, sc) {
    switch (op) {
      case '+': case '-': {
        const pl = pointee(n.l, sc), pr = pointee(n.r, sc);
        if (pl && !pr && typeof b === 'number') return op === '+' ? a + b * sizeOf(pl, cls()) : a - b * sizeOf(pl, cls());
        if (!pl && pr && op === '+') return b + a * sizeOf(pr, cls());
        if (pl && pr && op === '-') return Math.trunc((a - b) / Math.max(1, sizeOf(pl, cls())));
        if (op === '+') return (typeof a === 'string' || typeof b === 'string') ? String(a) + String(b) : a + b;
        return a - b;
      }
      case '*': return a * b;
      case '/':
        if (b === 0) { if (M.strict) throw err('divided by zero', n.line); return 0; }
        return Number.isInteger(a) && Number.isInteger(b) && !floaty(n.l, sc) && !floaty(n.r, sc) ? Math.trunc(a / b) : a / b;
      case '%':
        if (b === 0) { if (M.strict) throw err('divided by zero', n.line); return 0; }
        return a % b;
      case '`': return Math.pow(a, b);
      case '&': case '|': case '^': case '<<': case '>>': {
        a = Math.trunc(Number(a)) || 0; b = Math.trunc(Number(b)) || 0;
        if ((op === '&' || op === '|' || op === '^') && Math.abs(a) < 2147483648 && Math.abs(b) < 2147483648) return op === '&' ? a & b : op === '|' ? a | b : a ^ b;
        const lt = tyOf(n.l, sc);
        return bigOp(op, a, b, !!(lt && !isArr(lt) && lt.p === 0 && UNSIGNED[lt.b] && lt.b === 'U64'));
      }
      case '<': return a < b ? 1 : 0;
      case '>': return a > b ? 1 : 0;
      case '<=': return a <= b ? 1 : 0;
      case '>=': return a >= b ? 1 : 0;
      case '==': return a === b ? 1 : 0;
      case '!=': return a !== b ? 1 : 0;
    }
    return 0;
  }

  /* ---- evaluating --------------------------------------------------------------------------------------------------------- */
  function args(n, sc) { return n.args.map(a => ev(a, sc)); }
  function ev(n, sc) {
    if (++M.steps > M.maxSteps) throw err('ran too long: the loop does not end', n.line);
    switch (n.k) {
      case 'num': case 'str': return n.v;
      case 'var': {
        const s = find(sc, n.name);
        if (s) return M.readVar(s, n.name);
        /* a function name on its own IS a call. This is the HolyC move. */
        if (n.name in M.fns || n.name in M.BUILTIN) return M.callFn(n.name, [], n.line);
        if (n.name in CONSTANTS) return CONSTANTS[n.name];
        if (n.name === 'Fs') return M.fsAddr();
        throw err('undefined symbol "' + n.name + '"', n.line);
      }
      case 'call': {
        const c = n.callee;
        if (c.k === 'var') {
          const s = find(sc, c.name);
          if (s) {
            const fv = M.readVar(s, c.name);
            if (isFnAddr(fv)) return M.callFn(M.fnList[(fv - FN_BASE) / FN_STEP], args(n, sc), n.line);
            throw err('"' + c.name + '" is a variable, not a function', n.line);
          }
          return M.callFn(c.name, args(n, sc), n.line);
        }
        const fv = ev(c, sc);
        if (!isFnAddr(fv)) throw err('that is not callable', n.line);
        return M.callFn(M.fnList[(fv - FN_BASE) / FN_STEP], args(n, sc), n.line);
      }
      case 'neg': return -Number(ev(n.e, sc));
      case 'not': return ev(n.e, sc) ? 0 : 1;
      case 'bnot': return Number(BigInt.asIntN(64, ~BigInt(Math.trunc(Number(ev(n.e, sc))) || 0)));
      case 'bin': {
        if (n.op === '&&') return (ev(n.l, sc) && ev(n.r, sc)) ? 1 : 0;
        if (n.op === '||') return (ev(n.l, sc) || ev(n.r, sc)) ? 1 : 0;
        if (n.op === '^^') return (!ev(n.l, sc) !== !ev(n.r, sc)) ? 1 : 0;
        const a = ev(n.l, sc), b = ev(n.r, sc);
        return binop(n, n.op, a, b, sc);
      }
      case 'cmp': {                                  /* 0 < x < 10: each operand once, and it stops at the first that fails */
        let prev = ev(n.operands[0], sc);
        for (let i = 0; i < n.ops.length; i++) {
          const next = ev(n.operands[i + 1], sc);
          if (!CMP[n.ops[i]](prev, next)) return 0;
          prev = next;
        }
        return 1;
      }
      case 'assign': {
        const L = lval(n.target, sc);
        if (n.value.k === 'initlist') throw err('a { } list can only start a declaration', n.line);
        if (n.op === '=') return lset(L, ev(n.value, sc), n.line);
        const cur = lget(L), v = ev(n.value, sc);
        const bn = n.__bin || (n.__bin = { k: 'bin', op: n.op.slice(0, -1), l: n.target, r: n.value, line: n.line });
        return lset(L, binop(bn, bn.op, cur, v, sc), n.line);
      }
      case 'pre': case 'post': {
        const L = lval(n.e, sc), old = lget(L) || 0, pt = pointee(n.e, sc);
        const step = pt ? sizeOf(pt, cls()) : 1;
        const nv = lset(L, old + (n.op === '++' ? step : -step), n.line);
        return n.k === 'pre' ? nv : old;
      }
      case 'addr': {
        const e = n.e;
        if (e.k === 'var') {
          const s = find(sc, e.name);
          if (!s) { if (e.name in M.fns) return M.fnAddr(e.name); throw err('undefined symbol "' + e.name + '"', n.line); }
          const slot = (s.slots && s.slots[e.name]) || box(s, e.name);
          return slot.addr;
        }
        const L = lval(e, sc);
        if (L.reg) throw err('cannot take the address of that', n.line);
        return L.addr;
      }
      case 'deref': case 'index': case 'member': return lget(lval(n, sc));
      case 'cast': {
        const v = ev(n.e, sc), t = n.type;
        if (t.b === 'F64' && !t.p) return Number(v) || 0;
        if (t.p || t.fnp) return typeof v === 'string' ? mem().intern(v) : Math.trunc(Number(v) || 0);
        return typeof v === 'number' ? coerce(t, v) : v;
      }
      case 'sizeof': return n.type ? sizeOf(M.resolve(n.type, sc), cls()) : sizeOf(tyOf(n.e, sc) || I64, cls());
      case 'offset': {
        let c = cls()[n.cls], off = 0;
        if (!c) throw err('the class ' + n.cls + ' is not known', n.line);
        n.path.forEach(m => { const f = c && c.fields[m]; if (!f) throw err('there is no member called ' + m + ' in that class', n.line); off += f.off; c = cls()[f.ty.b]; });
        return off;
      }
      case 'initlist': throw err('a { } list can only start a declaration', n.line);
    }
    throw err('cannot evaluate ' + n.k, n.line);
  }
  M.ev = ev;
  M.isFnAddr = isFnAddr;
  M.loadT = loadT; M.storeT = storeT; M.wholeT = wholeT;
}
