/* HolyC's library: Print's format, the constants every program may name, and the builtins that need nothing from the machine (the ones that
   do — Beep, Rand, GodWord... — are added by holyc.js, and the lab's stage adds its own). Pure. A builtin is `(args, io) => value`,
   `io` being `{ emit, hooks, M, text }`: `text(v)` is a value as the string it stands for (a string, or an address of one in the program's memory). */
import { MEMLIB, MEMFN } from './holyc_lib_mem.js';

/* one conversion of Print: %[flags][width][.precision]kind, kind d u f e g x X b c s %, flags - 0 + space */
export function hcFormat(fmt, args, text) {
  let i = 0;
  const str = text || (v => String(v == null ? '' : v));
  return String(fmt).replace(/%([-0+ ]*)(\d*)(?:\.(\d+))?(?:l{1,2})?([dufegxXbcs%])/g, (m, flags, width, prec, k) => {
    if (k === '%') return '%';
    const v = args[i++], num = Number(v) || 0, left = flags.indexOf('-') >= 0, zero = flags.indexOf('0') >= 0 && !left;
    let s, signed = false;
    if (k === 'd' || k === 'u') { s = String(Math.trunc(num)); signed = true; }
    else if (k === 'f') { s = num.toFixed(prec === undefined ? 6 : +prec); signed = true; }
    else if (k === 'e') { s = num.toExponential(prec === undefined ? 6 : +prec); signed = true; }
    else if (k === 'g') { s = String(prec === undefined ? +num.toPrecision(6) : +num.toPrecision(+prec || 1)); signed = true; }
    else if (k === 'x' || k === 'X' || k === 'b') {
      s = BigInt.asUintN(64, BigInt(Math.trunc(num))).toString(k === 'b' ? 2 : 16);
      if (k === 'X') s = s.toUpperCase();
    }
    else if (k === 'c') s = String.fromCharCode(num || 32);
    else s = str(v);
    if (signed && flags.indexOf('+') >= 0 && num >= 0) s = '+' + s; else if (signed && flags.indexOf(' ') >= 0 && num >= 0) s = ' ' + s;
    if (width && s.length < +width) {
      if (left) s = s.padEnd(+width);
      else if (zero && k !== 's' && k !== 'c') { const sign = /^[-+ ]/.test(s) ? s[0] : ''; s = sign + s.slice(sign.length).padStart(+width - sign.length, '0'); }
      else s = s.padStart(+width);
    }
    return s;
  });
}

/* the sixteen colours of the machine, by the names TempleOS gives them (and the numbers it gives them) */
export const COLORS = ['BLACK', 'BLUE', 'GREEN', 'CYAN', 'RED', 'PURPLE', 'BROWN', 'LTGRAY', 'DKGRAY', 'LTBLUE', 'LTGREEN', 'LTCYAN', 'LTRED', 'LTPURPLE', 'YELLOW', 'WHITE'];
export const CONSTANTS = {
  TRUE: 1, FALSE: 0, NULL: 0, ON: 1, OFF: 0, PI: Math.PI, ERR: -1,
  I8_MAX: 127, I8_MIN: -128, U8_MAX: 255, I16_MAX: 32767, I16_MIN: -32768, U16_MAX: 65535, I32_MAX: 2147483647, I32_MIN: -2147483648, U32_MAX: 4294967295
};
COLORS.forEach((c, i) => { CONSTANTS[c] = i; });
/* the builtins that answer a fraction, so that `/` on them does not truncate */
export const FLOATY = { Sqrt: 1, Sin: 1, Cos: 1, Tan: 1, ATan: 1, ASin: 1, ACos: 1, Pow: 1, Rand: 1, Ln: 1, Log10: 1, Log2: 1, Exp: 1, Sqr: 1, ToF64: 1, Str2F64: 1, tS: 1 };

const num = v => Number(v) || 0;
export const PURE = Object.assign({
  Print: (a, io) => { io.emit(hcFormat(io.text(a[0]), a.slice(1), io.text)); return 0; },
  PutS:  (a, io) => { io.emit(io.text(a[0])); return 0; },
  Sleep: a => Math.trunc(num(a[0])),                                    /* time does not pass in here */
  Busy: () => 0,
  ToUpper: a => typeof a[0] === 'number' ? String.fromCharCode(a[0]).toUpperCase().charCodeAt(0) : String(a[0] == null ? '' : a[0]).toUpperCase(),
  ToLower: a => typeof a[0] === 'number' ? String.fromCharCode(a[0]).toLowerCase().charCodeAt(0) : String(a[0] == null ? '' : a[0]).toLowerCase(),
  Abs: a => Math.abs(num(a[0])),
  Min: a => Math.min(num(a[0]), num(a[1])),
  Max: a => Math.max(num(a[0]), num(a[1])),
  Sign: a => Math.sign(num(a[0])),
  Clamp: a => Math.min(Math.max(num(a[0]), num(a[1])), num(a[2])),
  Sqrt: a => Math.sqrt(num(a[0])),
  Sqr: a => num(a[0]) * num(a[0]),
  Pow: a => Math.pow(num(a[0]), num(a[1])),
  Exp: a => Math.exp(num(a[0])),
  Ln: a => Math.log(num(a[0])),
  Log10: a => Math.log10(num(a[0])),
  Log2: a => Math.log2(num(a[0])),
  Sin: a => Math.sin(num(a[0])),
  Cos: a => Math.cos(num(a[0])),
  Tan: a => Math.tan(num(a[0])),
  ATan: a => Math.atan(num(a[0])),
  ASin: a => Math.asin(num(a[0])),
  ACos: a => Math.acos(num(a[0])),
  Floor: a => Math.floor(num(a[0])),
  Ceil: a => Math.ceil(num(a[0])),
  Round: a => Math.round(num(a[0])),
  ToI64: a => Math.trunc(num(a[0])),
  ToF64: a => num(a[0]),
  ToBool: a => (num(a[0]) ? 1 : 0),
  GCD: a => { let x = Math.abs(Math.trunc(num(a[0]))), y = Math.abs(Math.trunc(num(a[1]))); while (y) { const t = x % y; x = y; y = t; } return x; },
  /* Cd and Dir are the shell's: a program run from the terminal changes the terminal's folder and lists the real one (kernel/holyc_env.js is what they ask);
     run anywhere else they have no folder to change, and say so */
  Cd: (a, io) => {
    const p = a[0] == null ? '::' : io.text(a[0]);
    if (!io.hooks.cd) { io.emit('Cd("' + p + '")  (NO SHELL HERE TO MOVE)\n'); return 0; }
    const ok = io.hooks.cd(p);
    if (!ok) io.emit('PATH NOT FOUND: ' + p + '\n');
    return ok ? 1 : 0;
  },
  Dir: (a, io) => {
    const names = io.hooks.dirNames ? io.hooks.dirNames(a[0] == null ? undefined : io.text(a[0])) : [];
    io.emit((names && names.length ? names.join('  ') : '(NOTHING HERE)') + '\n');
    return names ? names.length : 0;
  }
}, MEMLIB);
export { MEMFN };
