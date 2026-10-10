import { Snd } from './snd.js';
import { godStir, godNext, godRand, godWords, godSong } from './god.js';
import { word as toolWord, song as toolSong } from '../apps/tools/trophy_calls.js';
import { HolyCError, hcLex } from './holyc_lex.js';
import { hcParse } from './holyc_parse.js';
import { hcRun as run, hcFormat, hcFnNames } from './holyc_run.js';
import { COLORS } from './holyc_lib.js';

/* ==========================================================================
   HOLYC
   --------------------------------------------------------------------------
   A real subset, not a progress bar. Tokeniser (holyc_lex.js), recursive
   descent parser (holyc_parse.js), tree-walking evaluator (holyc_run.js),
   a small library (holyc_lib.js): all four pure, so a check can run them in
   Node. This file is the machine's side of it: the builtins that make a
   sound or ask the god for a word, and `window.HolyC`, which is how an app
   (HOLYC.EXE, the lab) reaches the compiler without importing from kernel/.
   ========================================================================== */
export { HolyCError, hcLex, hcParse, hcFormat, hcFnNames };

/* the builtins that need the machine; `hooks.rand` replaces the dice so a check can roll the same numbers every time */
const MACHINE = {
  Beep: () => { Snd.ok(); return 0; },
  /* BellRing(n) rings n times (at most twelve), a beat apart: it rang once whatever n was */
  BellRing: a => {
    const n = Math.max(1, Math.min(12, Math.trunc(a[0] || 1)));
    for (let i = 0; i < n; i++) setTimeout(() => { try { Snd.bell(); } catch (e) { /* no sound */ } }, i * 520);
    return n;
  },
  Rand: (a, io) => { if (io.hooks.rand) return io.hooks.rand(); godStir(); return godNext() / 4294967296; },
  RandU16: (a, io) => io.hooks.rand ? Math.floor(io.hooks.rand() * 65536) : godRand(65536),
  GodWord: (a, io) => { const w = godWords(Math.max(1, Math.trunc(a[0] || 1))); io.emit(w.join(' ').toUpperCase() + '\n'); toolWord(w.length); return w.length; },
  GodDoodle: (a, io) => { if (io.hooks.godDoodle) io.hooks.godDoodle(); return 0; },
  GodSong: () => { toolSong(); return godSong(); }
};

export function hcRun(ast, out, env, hooks) {
  hooks = hooks || {};
  return run(ast, out, env, Object.assign({}, hooks, { builtins: Object.assign({}, MACHINE, hooks.builtins || {}) }));
}

/* the whole pipeline, with ring 0 manners on failure left to the caller */
export function runHolyC(source, print, hooks) {
  const ast = hcParse(hcLex(source));
  hcRun(ast, line => print(line), null, hooks);
}

/* Panic and DebuggerEnter are not errors of the program's: they ARE the debugger. A caller that can show the debugger does, instead of printing a line of red. */
export const isPanic = e => !!e && !!e.holyc && /^(Panic:|DebuggerEnter)/.test(String(e.message));

/* is this line HolyC, or is it a word for the answering machine? */
export function looksLikeHolyC(s) {
  const t = String(s).trim();
  if (!t) return false;
  if (t.charAt(0) === '"') return true;
  if (/^(U0|I64|I32|I16|I8|U64|U32|U16|U8|F64|Bool)\b/.test(t)) return true;
  if (/^(if|while|for|return|switch)\s*[({\[]/.test(t)) return true;
  if (/^(class|union)\s+\w+\s*(:\s*\w+\s*)?\{/.test(t) || /^try\s*\{/.test(t) || /^goto\s+\w+\s*;/.test(t) || /^throw\s*[(;]/.test(t)) return true;
  if (/^#(define|ifdef|ifndef|if|undef|include)\b/.test(t)) return true;
  if (/;\s*$/.test(t)) return true;
  if (/^[A-Za-z_]\w*\s*\([^)]*\)\s*;?$/.test(t)) return true;
  return false;
}

/* an app reaches the compiler here (apps never import from kernel/) */
window.HolyC = { lex: hcLex, parse: hcParse, run: hcRun, format: hcFormat, runHolyC, looksLikeHolyC, HolyCError, colors: COLORS, sound: Snd };
