/* HolyC's memory (pure): one flat run of bytes with addresses, so a pointer is a number that means something. TempleOS has one address space and no protection;
   this one has the same shape and tells you what went wrong, the way a friendly debugger would: a NULL pointer, an address that is nowhere, a block freed twice.
   [BASE ..+1 MB) statics (globals, string literals), [+1 MB ..+2 MB) the stack of locals, [+2 MB ..+8 MB) the heap (MAlloc/Free). Addresses start at BASE, far above any
   number a program would use as a number, so a builtin that is handed one can tell it is a pointer to text. It is made only when a program first needs it. */
import { HolyCError } from './holyc_lex.js';
import { SIZES } from './holyc_types.js';

export const BASE = 0x20000000, STATIC_END = 1 << 20, STACK_END = 2 << 20, TOTAL = 8 << 20, STACK_BASE = STATIC_END;
const e53 = Math.pow(2, 53), e63 = Math.pow(2, 63), e64 = Math.pow(2, 64);

/* a number made to fit an integer type: it wraps, as the machine's registers do */
export function wrap(b, v) {
  v = Number(v);
  if (!Number.isFinite(v)) return 0;
  v = Math.trunc(v);
  switch (b) {
    case 'Bool': return v ? 1 : 0;
    case 'U8': return ((v % 256) + 256) % 256;
    case 'I8': { const u = ((v % 256) + 256) % 256; return u > 127 ? u - 256 : u; }
    case 'U16': return ((v % 65536) + 65536) % 65536;
    case 'I16': { const u = ((v % 65536) + 65536) % 65536; return u > 32767 ? u - 65536 : u; }
    case 'U32': return ((v % 4294967296) + 4294967296) % 4294967296;
    case 'I32': { const u = ((v % 4294967296) + 4294967296) % 4294967296; return u > 2147483647 ? u - 4294967296 : u; }
    case 'U64': return v < 0 ? (v + e64 >= 0 ? v + e64 : Number(BigInt.asUintN(64, BigInt(v)))) : v >= e64 ? Number(BigInt.asUintN(64, BigInt(v))) : v;
    default: return Math.abs(v) >= e63 ? Number(BigInt.asIntN(64, BigInt(v))) : v;       /* I64 */
  }
}

export function createMemory() {
  const bytes = new Uint8Array(TOTAL), dv = new DataView(bytes.buffer);
  const M = { bytes: bytes, statics: 0x1000, sp: STATIC_END, strings: new Map(), blocks: new Map(), free: [{ at: STACK_END, size: TOTAL - STACK_END }] };
  const bad = (a, what) => new HolyCError(a < BASE + 0x1000 ? (what + ' address ' + (a | 0) + ': that is a NULL pointer, or a number used as a pointer') : what + ' address 0x' + Math.trunc(a).toString(16) + ': that is not memory this program owns', 0);
  const at = (a, n, what) => {
    if (typeof a !== 'number' || !Number.isFinite(a)) throw bad(0, what);
    const o = Math.trunc(a) - BASE;
    if (o < 0x1000 || o + n > TOTAL) throw bad(a, what);
    return o;
  };
  M.valid = a => typeof a === 'number' && Number.isInteger(a) && a - BASE >= 0x1000 && a - BASE < TOTAL;

  M.load = (ty, a) => {
    const o = at(a, SIZES[ty] || 8, 'read');
    switch (ty) {
      case 'I8': return dv.getInt8(o);
      case 'U8': case 'Bool': case 'U0': return dv.getUint8(o);
      case 'I16': return dv.getInt16(o, true);
      case 'U16': return dv.getUint16(o, true);
      case 'I32': return dv.getInt32(o, true);
      case 'U32': return dv.getUint32(o, true);
      case 'F64': return dv.getFloat64(o, true);
      case 'U64': return Number(dv.getBigUint64(o, true));
      default: return Number(dv.getBigInt64(o, true));
    }
  };
  M.store = (ty, a, v) => {
    const o = at(a, SIZES[ty] || 8, 'write');
    if (ty === 'F64') { dv.setFloat64(o, Number(v), true); return; }
    const w = wrap(ty === 'U0' ? 'U8' : ty, v);
    switch (ty) {
      case 'I8': dv.setInt8(o, w); break;
      case 'U8': case 'Bool': case 'U0': dv.setUint8(o, w); break;
      case 'I16': dv.setInt16(o, w, true); break;
      case 'U16': dv.setUint16(o, w, true); break;
      case 'I32': dv.setInt32(o, w, true); break;
      case 'U32': dv.setUint32(o, w, true); break;
      case 'U64': dv.setBigUint64(o, BigInt(w), true); break;
      default: dv.setBigInt64(o, BigInt(w), true);
    }
  };
  M.copy = (dst, src, n) => { n = Math.max(0, Math.trunc(n)); if (!n) return; const d = at(dst, n, 'write'), s = at(src, n, 'read'); bytes.copyWithin(d, s, s + n); };
  M.fill = (dst, v, n) => { n = Math.max(0, Math.trunc(n)); if (!n) return; const d = at(dst, n, 'write'); bytes.fill(v & 255, d, d + n); };
  M.cmp = (a, b, n) => { const x = at(a, n, 'read'), y = at(b, n, 'read'); for (let i = 0; i < n; i++) if (bytes[x + i] !== bytes[y + i]) return bytes[x + i] < bytes[y + i] ? -1 : 1; return 0; };

  /* text: a string is its bytes (UTF-8 is not a thing here: one byte a letter) then a 0 */
  M.cstr = a => { let o = at(a, 1, 'read'), s = ''; while (o < TOTAL && bytes[o]) s += String.fromCharCode(bytes[o++]); return s; };
  M.putstr = (a, s, max) => {
    const n = Math.min(s.length, max == null ? s.length : Math.max(0, max - 1)), o = at(a, n + 1, 'write');
    for (let i = 0; i < n; i++) bytes[o + i] = s.charCodeAt(i) & 255;
    bytes[o + n] = 0;
  };

  /* statics: zeroed, never freed. A string literal is made once and shared. */
  M.alloc = n => {
    n = Math.max(1, Math.trunc(n)); const a = (M.statics + 7) & ~7;
    if (a + n > STATIC_END) throw new HolyCError('out of static memory: too many globals or strings', 0);
    M.statics = a + n; return BASE + a;
  };
  M.intern = s => { let a = M.strings.get(s); if (a === undefined) { a = M.alloc(s.length + 1); M.putstr(a, s); M.strings.set(s, a); } return a; };

  /* the stack of locals: zeroed on the way in, let go by moving `sp` back */
  M.push = n => {
    n = Math.max(1, Math.trunc(n)); const a = (M.sp + 7) & ~7;
    if (a + n > STACK_END) throw new HolyCError('the stack is full: too many locals, or a function that calls itself too deep', 0);
    bytes.fill(0, a, a + n); M.sp = a + n; return BASE + a;
  };

  /* the heap: first fit, and neighbours rejoin when freed */
  M.malloc = (n, zero) => {
    n = Math.max(8, (Math.trunc(n) + 7) & ~7);
    for (let i = 0; i < M.free.length; i++) {
      const f = M.free[i];
      if (f.size < n) continue;
      const a = f.at;
      if (f.size === n) M.free.splice(i, 1); else { f.at += n; f.size -= n; }
      M.blocks.set(a, n);
      if (zero !== false) bytes.fill(0, a, a + n);
      return BASE + a;
    }
    throw new HolyCError('out of memory: MAlloc(' + n + ') found no room', 0);
  };
  M.release = a => {
    if (!a) return;
    const o = Math.trunc(a) - BASE;
    if (!M.blocks.has(o)) throw new HolyCError('Free(0x' + Math.trunc(a).toString(16) + '): that block was never allocated, or is already freed', 0);
    const size = M.blocks.get(o); M.blocks.delete(o);
    M.free.push({ at: o, size: size });
    M.free.sort((x, y) => x.at - y.at);
    for (let i = 0; i + 1 < M.free.length;) { const f = M.free[i], g = M.free[i + 1]; if (f.at + f.size === g.at) { f.size += g.size; M.free.splice(i + 1, 1); } else i++; }
  };
  M.sizeOfBlock = a => M.blocks.get(Math.trunc(a) - BASE) || 0;
  return M;
}
