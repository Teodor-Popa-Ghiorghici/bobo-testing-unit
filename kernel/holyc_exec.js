/* HolyC, the evaluator's statements and calls (pure): installed on the machine `M` (holyc_run.js) after holyc_eval.js. Control flow that is not a plain return is a thrown
   signal: BREAK, CONTINUE, a Goto that the block holding its label catches, a Throw that a try/catch catches. A block's locals live on the program's stack and are let go when it ends. */
import { STACK_BASE as STATIC_BASE_SP } from './holyc_mem.js';
import { T, isArr, isClass, sizeOf, elemOf, layout } from './holyc_types.js';

const I64 = T('I64');
export function installExec(M) {
  const { err, find } = M;
  const cls = () => M.classes;
  const mem = () => M.mem();
  const { BREAK, CONTINUE, Ret, Goto, Throw } = M.signals;

  /* ---- types with their sizes worked out ----------------------------------------------------------------------------------- */
  M.resolve = (t, sc, init) => {
    if (!t || !t.dims) return t;
    const dims = t.dims.map((d, i) => {
      if (d == null) {
        if (i !== 0) throw err('only the first size of an array can be left out: [ ]');
        if (init && init.k === 'initlist') return init.items.length;
        if (init && init.k === 'str') return init.v.length + 1;
        throw err('an array with no size needs a { } list or a string to say how big it is');
      }
      if (typeof d === 'number') return d;
      const v = M.ev(d, sc);
      if (typeof v !== 'number' || v < 0 || !Number.isFinite(v)) throw err('an array size must be a number, not ' + v, d.line);
      return Math.trunc(v);
    });
    return Object.assign({}, t, { dims: dims });
  };
  M.defineClass = n => {
    if (cls()[n.name] && cls()[n.name].node === n) return;
    if (cls()[n.name] && !cls()[n.name].forward) throw err('the class ' + n.name + ' is already defined', n.line);
    try {
      const members = n.members.map(m => ({ name: m.name, ty: M.resolve(m.type, M.gscope) }));
      const c = layout(n.name, members, n.union, n.base, cls());
      c.node = n;
      cls()[n.name] = c;
    } catch (e) { throw e.holyc ? e : err(e.message, n.line); }
  };

  /* ---- declarations --------------------------------------------------------------------------------------------------------- */
  /* write an initialiser into memory: a { } list into an array or a class, a string into a char array, an expression into anything else */
  function initMem(addr, ty, init, sc) {
    if (init.k === 'initlist') {
      if (isArr(ty)) {
        const et = elemOf(ty), step = sizeOf(et, cls());
        if (init.items.length > ty.dims[0]) throw err('too many values: this array holds ' + ty.dims[0], init.line);
        init.items.forEach((it, i) => initMem(addr + i * step, et, it, sc));
      } else if (isClass(ty, cls())) {
        const c = cls()[ty.b], names = c.order;
        if (init.items.length > names.length) throw err('too many values: the class ' + c.name + ' has ' + names.length + ' members', init.line);
        init.items.forEach((it, i) => initMem(addr + c.fields[names[i]].off, c.fields[names[i]].ty, it, sc));
      } else {
        if (init.items.length !== 1) throw err('a single value takes a single value, not a { } list', init.line);
        initMem(addr, ty, init.items[0], sc);
      }
      return;
    }
    const v = M.ev(init, sc);
    if (isArr(ty)) {
      const text = typeof v === 'string' ? v : typeof v === 'number' && mem().valid(v) ? mem().cstr(v) : null;
      if (text == null || ty.dims.length !== 1 || (ty.b !== 'U8' && ty.b !== 'I8') || ty.p) throw err('an array can only be started from a { } list, or a string if it is made of U8', init.line);
      if (text.length + 1 > ty.dims[0]) throw err('this string is ' + (text.length + 1) + ' bytes with its end and the array holds ' + ty.dims[0], init.line);
      mem().putstr(addr, text);
    } else if (isClass(ty, cls())) {
      if (typeof v !== 'number') throw err('a class is started from a { } list or from another of its own kind', init.line);
      mem().copy(addr, v, sizeOf(ty, cls()));
    } else M.storeT(ty, addr, M.coerce(ty, v));
  }

  function declare(n, d, sc) {
    if (M.strict && d.name in sc.vars) throw err('"' + d.name + '" is already declared here', n.line);
    const ty = M.resolve(d.type, sc, d.init);
    const isStatic = n.mods && n.mods.indexOf('static') >= 0 && sc !== M.gscope;
    if (isStatic) {                                       /* a static is made once and keeps what it holds from call to call */
      let st = M.statics.get(d);
      if (!st) { st = { addr: mem().alloc(Math.max(1, sizeOf(ty, cls()))), ty: ty }; M.statics.set(d, st); if (d.init) initMem(st.addr, ty, d.init, sc); }
      M.bind(sc, d.name, ty, st.addr);
      return;
    }
    const needsMem = isArr(ty) || isClass(ty, cls()) || M.addrTaken.has(d.name);
    if (needsMem) {
      const size = Math.max(1, sizeOf(ty, cls())), addr = sc === M.gscope ? mem().alloc(size) : mem().push(size);
      M.bind(sc, d.name, ty, addr);
      if (d.init) initMem(addr, ty, d.init, sc);
      return;
    }
    sc.types[d.name] = ty;
    if (d.init && d.init.k === 'initlist') throw err('a single value takes a single value, not a { } list', d.init.line);
    sc.vars[d.name] = d.init ? M.coerce(ty, M.ev(d.init, sc)) : 0;
  }

  /* ---- calls ------------------------------------------------------------------------------------------------------------------ */
  const ptrOrBuiltinArg = a => (typeof a === 'number' && M.m && M.m.valid(a) ? M.m.cstr(a) : a);
  M.callFn = (name, args, line) => {
    const f = M.fns[name];
    if (name === 'Main') M.globals.__ranMain = 1;                      /* a Main the program called itself is not called again by the JIT afterwards */
    if (f) {
      if (M.depth >= M.MAX_DEPTH) throw err(name + ' keeps calling itself and never stops (too deep)', line);
      M.depth++;
      const mark = M.m ? M.m.sp : null, sc = M.child(M.gscope);
      try {
        f.params.forEach((pn, i) => {
          const ty = f.ptypeD[i];
          let v = i < args.length ? args[i] : f.defaults[i] ? M.ev(f.defaults[i], sc) : 0;
          sc.types[pn] = ty;
          if (isClass(ty, cls())) {                                  /* a class is passed by value: the function gets a copy */
            const size = sizeOf(ty, cls()), a = mem().push(size);
            if (typeof v !== 'number') throw err(name + ' wants a ' + ty.b + ' for ' + pn, line);
            mem().copy(a, v, size); M.bind(sc, pn, ty, a);
          } else if (M.addrTaken.has(pn)) {
            const a = mem().push(Math.max(1, sizeOf(ty, cls())));
            M.bind(sc, pn, ty, a); M.storeT(ty, a, M.coerce(ty, v));
          } else sc.vars[pn] = M.coerce(ty, v);
        });
        if (f.variadic) {                                            /* ... : argc is how many came after the named ones, argv[ ] holds them */
          const rest = args.slice(f.params.length), a = mem().push(Math.max(8, rest.length * 8));
          rest.forEach((v, i) => mem().store('I64', a + i * 8, typeof v === 'string' ? mem().intern(v) : Number(v) || 0));
          sc.types.argc = I64; sc.vars.argc = rest.length;
          M.bind(sc, 'argv', T('I64', 0, [Math.max(1, rest.length)]), a);
        }
        let r = 0;
        try { M.execBody(f.body.body, sc); }
        catch (e) {
          if (e instanceof Ret) r = e.v;
          else if (e instanceof Goto) throw err('goto ' + e.name + ': there is no label of that name in this function', e.line || line);
          else throw e;
        }
        if (isClass(f.retT, cls())) throw err(name + ' cannot hand back a class by value: return a pointer to one', line);
        return typeof r === 'number' || typeof r === 'string' ? M.coerce(f.retT.b === 'U0' && !f.retT.p ? undefined : f.retT, r) : r;
      } finally {
        M.depth--;
        if (M.m) M.m.sp = mark != null ? mark : STATIC_BASE_SP;
      }
    }
    if (name in M.BUILTIN) return M.BUILTIN[name](M.MEMFN.has(name) ? args : args.map(ptrOrBuiltinArg), M.io);
    throw err('undefined function "' + name + '"', line);
  };

  /* ---- statements ------------------------------------------------------------------------------------------------------------ */
  const labelCache = new WeakMap();
  function labelsOf(body) {
    let l = labelCache.get(body);
    if (l === undefined) {
      l = null;
      body.forEach((s, i) => { if (s.k === 'label') { l = l || new Map(); l.set(s.name, i); } });
      labelCache.set(body, l);
    }
    return l;
  }
  M.execBody = (body, sc) => {
    const labs = labelsOf(body);
    if (!labs) { for (let i = 0; i < body.length; i++) run(body[i], sc); return; }
    let i = 0;
    for (;;) {
      try { for (; i < body.length; i++) run(body[i], sc); return; }
      catch (e) { if (e instanceof Goto && labs.has(e.name)) { i = labs.get(e.name); continue; } throw e; }
    }
  };
  function run(s, sc) {
    if (++M.steps > M.maxSteps) throw err('ran too long: the loop does not end', s.line);
    if (M.hooks.trace && s.line && s.k !== 'block' && s.k !== 'fn' && s.k !== 'empty' && s.k !== 'class' && s.k !== 'label') M.hooks.trace(s.line, () => M.visible(sc), s.k);
    try { exec(s, sc); }
    catch (e) { if (e && e.holyc && !e.line) e.line = s.line; if ((e instanceof Goto || e instanceof Throw) && !e.line) e.line = s.line; throw e; }
  }
  M.run = run;
  function loopBody(body, sc) {                    /* true: the loop goes on, false: break */
    try { run(body, sc); } catch (e) { if (e === BREAK) return false; if (e !== CONTINUE) throw e; }
    return true;
  }
  const scoped = (sc, fn) => {                     /* a scope of its own whose locals are let go on the way out */
    const mark = M.m ? M.m.sp : null;
    try { return fn(M.child(sc)); } finally { if (M.m) M.m.sp = mark != null ? mark : STATIC_BASE_SP; }
  };

  function switchStmt(n, sc) {
    const v = M.ev(n.e, sc), items = n.items;
    let at = -1, dflt = -1;
    for (let i = 0; i < items.length && at < 0; i++) {
      const it = items[i];
      if (it.t === 'default') dflt = i;
      else if (it.t === 'case') { const lo = M.ev(it.lo, sc), hi = it.hi === it.lo ? lo : M.ev(it.hi, sc); if (v >= lo && v <= hi) at = i; }
    }
    if (at < 0) at = dflt;
    if (at < 0) return;
    /* a case inside start: ... end: is a group: the start code runs before it, the end code after it (a break leaves the case for the end code) */
    let gs = -1, ge = -1;
    for (let i = at; i >= 0; i--) { if (items[i].t === 'end') break; if (items[i].t === 'start') { gs = i; break; } }
    if (gs >= 0) for (let i = gs + 1; i < items.length; i++) if (items[i].t === 'end') { ge = i; break; }
    const exec1 = (from, to, stopAtCase) => {         /* returns true if a break was hit */
      for (let i = from; i < to; i++) {
        const it = items[i];
        if (it.t === 'stmt') { try { run(it.s, sc); } catch (e) { if (e === BREAK) return true; throw e; } }
        else if (stopAtCase && (it.t === 'case' || it.t === 'default') && i > from) return false;
      }
      return false;
    };
    if (gs >= 0 && ge > at) {
      let firstCase = gs + 1; while (firstCase < ge && items[firstCase].t !== 'case' && items[firstCase].t !== 'default') firstCase++;
      exec1(gs + 1, firstCase, false);                                  /* the start code */
      exec1(at + 1, ge, false);                                         /* the case, falling through the group until a break */
      exec1(ge + 1, items.length, true);                                /* the end code, up to the next label */
      return;
    }
    exec1(at + 1, items.length, false);
  }

  function exec(n, sc) {
    switch (n.k) {
      case 'block': if (n === M.ast) M.execBody(n.body, sc); else scoped(sc, c => M.execBody(n.body, c)); return;
      case 'empty': case 'label': return;
      case 'class': M.defineClass(n); return;
      case 'fn': if (n.body) M.fns[n.name] = n; return;                  /* a prototype says nothing the definition will not */
      case 'decl': n.decls.forEach(d => declare(n, d, sc)); return;
      case 'print': {
        const fmt = n.parts[0].v, args = n.parts.slice(1).map(a => M.ev(a, sc));
        M.io.emit(M.format(fmt, args));
        return;
      }
      case 'expr': M.ev(n.e, sc); return;
      case 'if':
        if (M.ev(n.cond, sc)) run(n.then, sc);
        else if (n.else) run(n.else, sc);
        return;
      case 'while':
        while (M.ev(n.cond, sc)) { if (!loopBody(n.body, sc)) break; }
        return;
      case 'do':
        do { if (!loopBody(n.body, sc)) break; } while (M.ev(n.cond, sc));
        return;
      case 'for':
        scoped(sc, c => {
          if (n.init) exec(n.init, c);
          while (n.cond ? M.ev(n.cond, c) : true) {
            if (!loopBody(n.body, c)) break;
            if (n.step) M.ev(n.step, c);
          }
        });
        return;
      case 'switch': switchStmt(n, sc); return;
      case 'ret': throw new Ret(n.value ? M.ev(n.value, sc) : 0);
      case 'break': throw BREAK;
      case 'continue': throw CONTINUE;
      case 'goto': throw new Goto(n.name);
      case 'throw': throw new Throw(n.value ? M.ev(n.value, sc) : M.fsFields().except_ch);
      case 'try':
        try { run(n.body, sc); }
        catch (e) {
          if (!(e instanceof Throw)) throw e;
          const fs = M.fsFields(); fs.except_ch = e.code; fs.catch_except = 0;
          run(n.handler, sc);
          if (!fs.catch_except) throw e;                                  /* a catch that does not say it caught it lets it go on up */
        }
        return;
    }
    throw err('cannot run ' + n.k, n.line);
  }
  M.exec = exec;
}
