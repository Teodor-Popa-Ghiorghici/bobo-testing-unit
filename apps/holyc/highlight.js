/* The editor's colours: HolyC cut into pieces that put back together as exactly the same text. Pure (the check reads every program in the app through
   it). The classes are painted by style.css from the sixteen: types and builtins in cyan, keywords in yellow, strings green, numbers magenta,
   comments grey. A string that is never closed runs to the end of its line, so one missing quote does not turn the rest of the program green. */
const KEYWORDS = new Set(['if', 'else', 'while', 'for', 'do', 'return', 'break', 'continue', 'switch', 'case', 'default', 'goto', 'try', 'catch', 'throw', 'class', 'union', 'lock',
  'sizeof', 'offset', 'static', 'public', 'extern', 'reg', 'noreg', 'no_warn']);
const TYPES = new Set(['U0', 'I64', 'I32', 'I16', 'I8', 'U64', 'U32', 'U16', 'U8', 'F64', 'Bool']);
export const BUILTINS = new Set(['Print', 'PutS', 'Sleep', 'StrLen', 'ToUpper', 'ToLower', 'Abs', 'Min', 'Max', 'Sqrt', 'Pow', 'Sin', 'Cos', 'Floor', 'Ceil', 'Round',
  'Beep', 'Rand', 'RandU16', 'Label', 'Button', 'Field', 'Bar', 'SetText', 'GetText', 'GetNum', 'SetBar', 'Color', 'Pixel', 'Fill', 'Clear', 'Note', 'Rest', 'Every', 'Stop',
  'MAlloc', 'CAlloc', 'Free', 'MSize', 'MemCpy', 'MemSet', 'MemCmp', 'StrCpy', 'StrNew', 'StrCmp', 'StrICmp', 'StrNCmp', 'StrPrint', 'CatPrint', 'StrMatch', 'Str2I64', 'Str2F64',
  'Bt', 'Bts', 'Btr', 'Btc', 'Bsf', 'Bsr', 'PutExcept', 'Tan', 'ATan', 'ASin', 'ACos', 'Ln', 'Log10', 'Log2', 'Exp', 'Sqr', 'Sign', 'Clamp', 'GCD', 'ToI64', 'ToF64', 'ToBool', 'Exit', 'Panic']);
const CONSTS = new Set(['TRUE', 'FALSE', 'NULL', 'ON', 'OFF', 'PI', 'BLACK', 'BLUE', 'GREEN', 'CYAN', 'RED', 'PURPLE', 'BROWN', 'LTGRAY', 'DKGRAY', 'LTBLUE', 'LTGREEN', 'LTCYAN', 'LTRED', 'LTPURPLE', 'YELLOW', 'WHITE']);

export function highlight(src) {
  const out = [];
  let i = 0;
  /* a name after class or union is a type of the program's own */
  const mine = new Set(); src.replace(/\b(?:class|union)\s+([A-Za-z_]\w*)/g, (m, n) => { mine.add(n); return m; });
  const push = (t, s) => { if (s) out.push({ t: t, s: s }); };
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { let j = i; while (j < src.length && src[j] !== '\n') j++; push('com', src.slice(i, j)); i = j; continue; }
    if (c === '/' && src[i + 1] === '*') { let j = src.indexOf('*/', i + 2); j = j < 0 ? src.length : j + 2; push('com', src.slice(i, j)); i = j; continue; }
    if (c === '"') {
      let j = i + 1;
      while (j < src.length && src[j] !== '"' && src[j] !== '\n') { if (src[j] === '\\') j++; j++; }
      if (src[j] === '"') j++;
      const text = src.slice(i, j);
      /* the slots and the escapes inside a string stand out */
      let at = 0, m; const re = /%[-0+ ]*[0-9]*(?:\.[0-9]+)?[dufegxXbcs%]|\\./g;
      while ((m = re.exec(text))) { push('str', text.slice(at, m.index)); push('esc', m[0]); at = m.index + m[0].length; }
      push('str', text.slice(at));
      i = j; continue;
    }
    if (c === '#' && (i === 0 || src[i - 1] === '\n')) { let j = i; while (j < src.length && src[j] !== '\n') j++; push('kw', src.slice(i, j)); i = j; continue; }
    if (c === "'") {                                                   /* 'A' and 'ABC': a number, written as letters */
      let j = i + 1;
      while (j < src.length && src[j] !== "'" && src[j] !== '\n') { if (src[j] === '\\') j++; j++; }
      if (src[j] === "'") j++;
      push('num', src.slice(i, j)); i = j; continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      const hex = /^0[xX][0-9a-fA-F]+|^0[bB][01]+/.exec(src.slice(i));
      let j = i;
      if (hex) j = i + hex[0].length;
      else { while (j < src.length && /[0-9]/.test(src[j])) j++; if (src[j] === '.' && src[j + 1] !== '.') { j++; while (j < src.length && /[0-9]/.test(src[j])) j++; } if (/[eE]/.test(src[j] || '') && /[0-9+-]/.test(src[j + 1] || '')) { j += 2; while (j < src.length && /[0-9]/.test(src[j])) j++; } }
      push('num', src.slice(i, j)); i = j; continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i; while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      const w = src.slice(i, j);
      push(KEYWORDS.has(w) ? 'kw' : TYPES.has(w) || mine.has(w) ? 'ty' : BUILTINS.has(w) ? 'bi' : CONSTS.has(w) ? 'co' : /^\s*\(/.test(src.slice(j, j + 4)) ? 'fn' : 'id', w);
      i = j; continue;
    }
    if (/\s/.test(c)) { let j = i; while (j < src.length && /\s/.test(src[j])) j++; push('ws', src.slice(i, j)); i = j; continue; }
    push('op', c); i++;
  }
  return out;
}
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const toHtml = src => highlight(src).map(p => p.t === 'ws' || p.t === 'id' ? esc(p.s) : '<i class="h-' + p.t + '">' + esc(p.s) + '</i>').join('');
