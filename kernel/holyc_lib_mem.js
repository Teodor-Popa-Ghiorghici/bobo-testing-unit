/* The builtins that work on memory and on text in it (pure): the heap, copying, the C strings, bits, and the exception that `throw` raises. They are handed
   their arguments as they are (a pointer stays a number), unlike every other builtin, which is given a pointer to text as the text (`MEMFN` names them).
   `io.M.mem()` is the program's memory (made on first use); `io.text(v)` a string, or the C string at an address, as a JS string. */
import { HolyCError } from './holyc_lex.js';

const num = v => Number(v) || 0;
const sign = n => (n < 0 ? -1 : n > 0 ? 1 : 0);
const addr = (v, what) => { if (typeof v !== 'number') throw new HolyCError(what + ' needs a place in memory (a pointer), not ' + (typeof v === 'string' ? 'a string constant' : 'nothing'), 0); return v; };

/* a thrown value as text: 'ABC' is its letters, a plain number is itself */
export const exceptText = c => {
  let s = '', n = Math.trunc(num(c));
  if (n > 0) while (n > 0 && (n & 255) >= 32 && (n & 255) < 127) { s += String.fromCharCode(n & 255); n = Math.floor(n / 256); }
  return n === 0 && s ? s : String(Math.trunc(num(c)));
};

export const MEMLIB = {
  MAlloc: (a, io) => io.M.mem().malloc(num(a[0])),
  CAlloc: (a, io) => io.M.mem().malloc(num(a[0])),
  Free: (a, io) => { io.M.mem().release(num(a[0])); return 0; },
  MSize: (a, io) => io.M.mem().sizeOfBlock(num(a[0])),
  MemCpy: (a, io) => { io.M.mem().copy(addr(a[0], 'MemCpy'), addr(a[1], 'MemCpy'), num(a[2])); return a[0]; },
  MemSet: (a, io) => { io.M.mem().fill(addr(a[0], 'MemSet'), num(a[1]), num(a[2])); return a[0]; },
  MemCmp: (a, io) => io.M.mem().cmp(addr(a[0], 'MemCmp'), addr(a[1], 'MemCmp'), num(a[2])),

  StrLen: (a, io) => io.text(a[0]).length,
  StrCpy: (a, io) => { io.M.mem().putstr(addr(a[0], 'StrCpy'), io.text(a[1])); return a[0]; },
  StrNew: (a, io) => { const s = io.text(a[0]), m = io.M.mem(), p = m.malloc(s.length + 1); m.putstr(p, s); return p; },
  StrCmp: (a, io) => sign(io.text(a[0]) < io.text(a[1]) ? -1 : io.text(a[0]) > io.text(a[1]) ? 1 : 0),
  StrICmp: (a, io) => { const x = io.text(a[0]).toLowerCase(), y = io.text(a[1]).toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; },
  StrNCmp: (a, io) => { const n = num(a[2]), x = io.text(a[0]).slice(0, n), y = io.text(a[1]).slice(0, n); return x < y ? -1 : x > y ? 1 : 0; },
  StrPrint: (a, io) => { io.M.mem().putstr(addr(a[0], 'StrPrint'), io.format(a[1], a.slice(2))); return a[0]; },
  CatPrint: (a, io) => { const m = io.M.mem(), d = addr(a[0], 'CatPrint'); m.putstr(d, m.cstr(d) + io.format(a[1], a.slice(2))); return a[0]; },
  StrMatch: (a, io) => {
    const hay = a[1], at = io.text(hay).indexOf(io.text(a[0]));
    if (at < 0) return 0;
    return (typeof hay === 'number' ? hay : io.M.mem().intern(io.text(hay))) + at;
  },
  Str2I64: (a, io) => { const r = a[1] == null ? 10 : num(a[1]), v = parseInt(io.text(a[0]), r); return Number.isNaN(v) ? 0 : v; },
  Str2F64: (a, io) => { const v = parseFloat(io.text(a[0])); return Number.isNaN(v) ? 0 : v; },

  /* a bit in a field of memory: base points at the first byte, bit counts on from it */
  Bt:  (a, io) => bitOp(io, a, (b, m) => [(b & m) ? 1 : 0, b]),
  Bts: (a, io) => bitOp(io, a, (b, m) => [(b & m) ? 1 : 0, b | m]),
  Btr: (a, io) => bitOp(io, a, (b, m) => [(b & m) ? 1 : 0, b & ~m]),
  Btc: (a, io) => bitOp(io, a, (b, m) => [(b & m) ? 1 : 0, b ^ m]),
  Bsf: a => { let n = Math.trunc(num(a[0])); if (!n) return -1; let i = 0; while (!(n % 2)) { n /= 2; i++; } return i; },
  Bsr: a => { const n = Math.trunc(num(a[0])); return n <= 0 ? -1 : Math.floor(Math.log2(n)); },

  /* what a catch block says it caught; the exception stays until Fs->catch_except is set, which this does unless told not to */
  PutExcept: (a, io) => {
    const fs = io.M.fsFields();
    io.emit('Exception: ' + exceptText(fs.except_ch) + '\n');
    if (a[0] == null || num(a[0])) fs.catch_except = 1;
    return 0;
  }
};

function bitOp(io, a, f) {
  const m = io.M.mem(), bit = Math.trunc(num(a[1])), at = addr(a[0], 'a bit operation') + (bit >> 3), mask = 1 << (bit & 7);
  const r = f(m.load('U8', at), mask);
  if (r[1] !== m.load('U8', at)) m.store('U8', at, r[1]);
  return r[0];
}

/* these are given their pointers as pointers; everything else is given the text a pointer points to */
export const MEMFN = new Set(['Print', 'PutS', ...Object.keys(MEMLIB)]);
