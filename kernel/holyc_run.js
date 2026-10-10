/* HolyC, the evaluator: a tree walker over holyc_parse.js's tree. Pure (the machine's own builtins come in through `hooks.builtins`). This file makes the machine and runs
   a program on it; the expressions are holyc_eval.js, the statements and calls holyc_exec.js, the memory holyc_mem.js, the library holyc_lib.js.
   A variable lives in the block that declared it (a function's own variables are its own, a loop's counter is the loop's), an integer is an integer (`I64 x = 7 / 2` is 3,
   as it is in the real compiler; a float is made by a point or an F64) and wraps to its size, a run-time error says its line, and a program can be *watched*:
   `hooks.trace(line, vars)` is told before every statement. `hooks.session(api)` is handed, once the program has run, a way to call its functions again later: that is how
   the lab's buttons call back into what you wrote.
   hooks: strict (undeclared names and divide by zero are errors), maxSteps, builtins, trace, session, rand, dirNames, cd, godDoodle. */
import { HolyCError } from './holyc_lex.js';
import { hcFormat, PURE, MEMFN } from './holyc_lib.js';
import { createMemory } from './holyc_mem.js';
import { T, layout, isArr, isClass } from './holyc_types.js';
import { installEval } from './holyc_eval.js';
import { installExec } from './holyc_exec.js';
import { exceptText } from './holyc_lib_mem.js';

const HC_STEPS = 400000, MAX_DEPTH = 150;
/* what a persistent global scope (the terminal keeps one across lines, as the real shell does) keeps besides its values: types, slots, classes, functions and the memory */
const STATE_OF = new WeakMap();

export { hcFormat };
/* the names of the functions a persistent scope has had defined in it (the terminal's, across lines) */
export const hcFnNames = env => { const st = env && STATE_OF.get(env); return st ? Object.keys(st.fns) : []; };
export function hcRun(ast, out, env, hooks) {
  hooks = hooks || {};
  const globals = env || Object.create(null);
  if (!STATE_OF.has(globals)) STATE_OF.set(globals, { types: Object.create(null), slots: Object.create(null), classes: Object.create(null), fns: Object.create(null), fnList: [], m: null });
  const st = STATE_OF.get(globals);
  delete globals.__ranMain;                                         /* a Main of this program is for this program, on a scope that outlives it */
  const M = {
    ast: ast, hooks: hooks, strict: !!hooks.strict, maxSteps: hooks.maxSteps || HC_STEPS, MAX_DEPTH: MAX_DEPTH,
    globals: globals, gscope: { vars: globals, types: st.types, slots: st.slots, parent: null },
    fns: st.fns, fnList: st.fnList, classes: st.classes, statics: new Map(), addrTaken: new Set(), MEMFN: MEMFN,
    steps: 0, depth: 0, m: st.m
  };
  M.mem = () => { if (!M.m) { M.m = st.m = createMemory(); } return M.m; };
  M.err = (m, line) => new HolyCError(m, line || 0);
  M.signals = {
    BREAK: { sig: 'break' }, CONTINUE: { sig: 'continue' },
    Ret: function Ret(v) { this.v = v; },
    Goto: function Goto(name) { this.name = name; },
    Throw: function Throw(code) { this.code = code; }
  };

  /* ---- output ---------------------------------------------------------------------------------------------------------------- */
  let buffer = '';
  const emit = s => {
    buffer += s;
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) { out(buffer.slice(0, nl)); buffer = buffer.slice(nl + 1); }
  };
  const flush = () => { if (buffer) { out(buffer); buffer = ''; } };
  /* a value as the text it stands for: a string is itself, an address of one in memory is that C string */
  const text = v => (typeof v === 'string' ? v : typeof v === 'number' && M.m && M.m.valid(v) ? M.m.cstr(v) : v == null ? '' : String(v));
  M.format = (fmt, args) => hcFormat(text(fmt), args, text);
  M.io = { emit: emit, hooks: hooks, M: M, text: text, format: (fmt, args) => hcFormat(text(fmt), args, text) };

  /* ---- the task: Fs->except_ch and Fs->catch_except, which a try/catch and PutExcept share ----------------------------------------- */
  if (!M.classes.CTask) M.classes.CTask = layout('CTask', [{ name: 'except_ch', ty: T('I64') }, { name: 'catch_except', ty: T('I64') }, { name: 'task_name', ty: T('U8', 0, [32]) }], false, null, M.classes);
  M.fsAddr = () => { if (!st.fs) { st.fs = M.mem().alloc(M.classes.CTask.size); M.mem().putstr(st.fs + M.classes.CTask.fields.task_name.off, 'Adam'); } return st.fs; };
  M.fsFields = () => {
    const a = M.fsAddr(), mm = M.mem(), f = M.classes.CTask.fields;
    return {
      get except_ch() { return mm.load('I64', a + f.except_ch.off); }, set except_ch(v) { mm.store('I64', a + f.except_ch.off, Number(v) || 0); },
      get catch_except() { return mm.load('I64', a + f.catch_except.off); }, set catch_except(v) { mm.store('I64', a + f.catch_except.off, v ? 1 : 0); }
    };
  };

  M.BUILTIN = Object.assign({}, PURE, {
    Exit: () => { throw new M.signals.Ret(0); },
    Panic: a => { throw M.err('Panic: ' + (a[0] === undefined ? 'called by hand' : text(a[0]))); },
    DebuggerEnter: () => { throw M.err('DebuggerEnter'); }
  }, hooks.builtins || {});

  /* what a program can see from here: its own variables over the globals, with nothing that is not a plain value */
  M.visible = scope => {
    const o = {};
    const chain = []; for (let s = scope; s; s = s.parent) chain.unshift(s);
    chain.forEach(s => {
      Object.keys(s.vars).forEach(k => {
        if (k.indexOf('__') === 0) return;
        const slot = s.slots && s.slots[k];
        const v = slot ? (isArr(slot.ty) || isClass(slot.ty, M.classes) ? undefined : M.loadT(slot.ty, slot.addr)) : s.vars[k];
        if (typeof v === 'number' || typeof v === 'string') o[k] = v;
      });
    });
    return o;
  };

  installEval(M); installExec(M);

  /* the names that have their address taken are the ones that have to live in memory from the moment they are made */
  (function scan(n) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(scan); return; }
    if (n.k === 'addr' && n.e && n.e.k === 'var') M.addrTaken.add(n.e.name);
    Object.keys(n).forEach(k => { if (k !== 'line' && n[k] && typeof n[k] === 'object') scan(n[k]); });
  })(ast);
  /* classes are known before the program runs, as the parser knew them */
  ast.body.forEach(s => { if (s.k === 'class') M.defineClass(s); });

  const top = e => {
    if (e instanceof M.signals.Ret) return;
    if (e === M.signals.BREAK || e === M.signals.CONTINUE) { flush(); throw M.err((e === M.signals.BREAK ? 'break' : 'continue') + ' is used outside a loop'); }
    flush();
    if (e instanceof M.signals.Throw) throw M.err('unhandled exception: ' + exceptText(e.code) + ' (there is no catch for it)', e.line);
    if (e instanceof M.signals.Goto) throw M.err('goto ' + e.name + ': there is no label of that name here', e.line);
    throw e;
  };
  try { M.exec(ast, M.gscope); } catch (e) { top(e); }
  flush();
  /* if a Main was defined and never called, call it, the way the JIT would */
  if (M.fns.Main && !globals.__ranMain) {
    globals.__ranMain = 1;
    try { M.callFn('Main', [], 0); } catch (e) { top(e); }
    flush();
  }
  if (hooks.session) {
    hooks.session({
      globals: globals,
      has: name => !!M.fns[name] || name in M.BUILTIN,
      defined: name => !!M.fns[name],
      names: () => Object.keys(M.fns),
      /* a function that hands back text (a U8 * ) hands the host the text, not the address it is at */
      call: (name, args) => {
        M.steps = 0; M.depth = 0;
        try {
          const r = M.callFn(name, args || [], 0), f = M.fns[name];
          return f && f.retT && f.retT.p === 1 && (f.retT.b === 'U8' || f.retT.b === 'I8') && M.m && M.m.valid(r) ? M.m.cstr(r) : r;
        } catch (e) { flush(); if (e instanceof M.signals.Ret) return e.v; throw e; } finally { flush(); }
      }
    });
  }
  return globals;
}
