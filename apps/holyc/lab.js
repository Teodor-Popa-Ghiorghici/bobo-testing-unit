/* THE LAB: the editor, the run bar, what the program printed, the stage it built, and WATCH IT RUN. It is the same in a lesson, a puzzle and the workshop; what
   differs is the panel beside it (tutor.js) and what is done with a run (`o.onRun`). RUN reads the program strictly, runs it against a fresh stage with real dice
   and the machine's sound, and shows the result; while you type, the program is read again (never run) and the status says if it would not read yet.
   `L.R` is the last run, kept for the stage's sake: a button on the stage calls back into that run, and what a lesson's goals look at is that run. */
import { makeEditor } from './editor.js';
import { makeStageView } from './stage_view.js';
import { makeTrace } from './trace_view.js';
import { ran, traced } from './trophy_calls.js';
import { runProgram } from './engine.js';
import { nextCursor } from './caret.js';

const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };

export function createLab(host, o) {
  const HC = o.HC, snd = o.snd;
  const root = el('div', 'hc-lab');
  const bar = el('div', 'hc-bar2'), edHost = el('div', 'hc-edhost'), low = el('div', 'hc-low');
  const cons = el('div', 'hc-cons'), consHead = el('div', 'hc-ch', 'OUTPUT'), consBody = el('div', 'hc-cb');
  const stageHead = el('div', 'hc-ch', 'THE STAGE'), stageBox = el('div', 'hc-stbox');
  cons.append(consHead, consBody);
  const stageCol = el('div', 'hc-stcol'); stageCol.append(stageHead, stageBox);
  low.append(cons, stageCol);
  const status = el('div', 'hc-status');
  root.append(bar, edHost, status, low);
  host.appendChild(root);

  const L = { el: root, R: null, src0: '', lastRunAt: 0 };
  const ed = makeEditor(edHost);
  L.editor = ed;
  const sv = makeStageView(stageBox, { board: !!o.board, onPress: it => snd.press(), onChange: () => { if (o.onStage && L.R) o.onStage(L.R); }, onFail: r => note('BUTTON: ' + r.msg, 'l-err') });
  L.stageView = sv;

  /* ---- what was printed ---------------------------------------------------------------------------------------------------- */
  const consoleApi = {
    clear() { consBody.innerHTML = ''; },
    add(text, cls) { const d = el('div', cls || 'l-out', text === '' ? ' ' : text); consBody.appendChild(d); while (consBody.childElementCount > 300) consBody.firstChild.remove(); consBody.scrollTop = consBody.scrollHeight; return d; },
    setLines(lines) { consBody.innerHTML = ''; lines.forEach(l => consoleApi.add(l)); }
  };
  const note = (t, cls) => consoleApi.add(t, cls || 'l-dim');
  L.console = consoleApi;

  /* ---- the bar --------------------------------------------------------------------------------------------------------------- */
  const btn = (label, cls, fn, title) => { const b = el('button', 'hc-b ' + cls, label); if (title) b.title = title; b.addEventListener('mousedown', ev => { ev.stopPropagation(); if (ev.button === 0 && !b.disabled) fn(); }); b.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); fn(); } }); return b; };
  const bRun = btn('RUN', 'run', () => L.run(), 'run the program (CTRL+ENTER)'), bWatch = btn('WATCH IT RUN', 'watch', () => L.run({ watch: true }), 'run it, then step through it'),
    bReset = btn('RESET', 'rst', () => L.reset(), 'put the program back as it started'), bClear = btn('CLEAR', 'clr', () => { ed.set(''); ed.focus(); }, 'an empty program');
  const curLabel = () => 'CURSOR: ' + ed.cursor.toUpperCase();
  const bCur = btn(curLabel(), 'cur', () => { ed.setCursor(nextCursor(ed.cursor)); bCur.textContent = curLabel(); ed.focus(); }, 'the text cursor: a vertical bar, or a horizontal underscore on the letter');
  bar.append(bRun, bWatch, el('span', 'hc-flex'), bCur, bReset, bClear);
  L.bar = bar; L.buttons = { run: bRun, watch: bWatch, reset: bReset, clear: bClear, cursor: bCur };
  ed.onRun(() => L.run());

  const trace = makeTrace(root, { editor: ed, console: consoleApi, snd, onClose: () => { if (L.R) consoleApi.setLines(L.R.out); } });
  root.insertBefore(trace.el, status);
  L.trace = trace;

  /* ---- the status line, and the program read as you type -------------------------------------------------------------------------- */
  const say = (t, cls) => { status.textContent = t; status.className = 'hc-status ' + (cls || ''); };
  L.status = say;
  let readT = 0;
  function readOnly() {
    const src = ed.get();
    ed.setMark('warn', 0);
    if (!src.trim()) { say('AN EMPTY PROGRAM. TYPE SOMETHING, THEN RUN IT.', ''); return; }
    try { HC.parse(HC.lex(src), { strict: true }); say('READS FINE. PRESS RUN (CTRL+ENTER).', 'ok'); }
    catch (e) { ed.setMark('warn', e.line || 0); say('NOT YET: ' + (e.line ? 'LINE ' + e.line + ': ' : '') + (e.message || 'cannot read it'), 'warn'); }
  }
  ed.onInput(src => { clearTimeout(readT); readT = setTimeout(readOnly, 350); ed.setMark('err', 0); if (trace.on()) trace.hide(); if (o.onEdit) o.onEdit(src); });
  ed.onKey(() => { snd.key(); });

  /* ---- running ------------------------------------------------------------------------------------------------------------------ */
  L.run = opts => {
    opts = opts || {};
    ed.stopTyping(); trace.hide(); clearTimeout(readT);
    const src = ed.get();
    consoleApi.clear(); ed.clearMarks(); sv.clear();
    snd.run();
    const t0 = performance.now();
    let printed = 0;
    const R = runProgram(HC, src, { rand: Math.random, sound: snd, trace: !!opts.watch, onOut: line => { consoleApi.add(line); snd.out(printed++); } });
    L.R = R; L.lastRunAt = performance.now(); ran(R.err);
    if (R.err) {
      consoleApi.add((R.err.line ? 'LINE ' + R.err.line + ': ' : '') + R.err.message, 'l-err');
      if (R.err.line) ed.setMark('err', R.err.line);
      say('ERROR  ' + (R.err.line ? 'LINE ' + R.err.line + ': ' : '') + R.err.message, 'err'); snd.error();
    } else {
      const ms = Math.max(1, Math.round(performance.now() - t0));
      if (!R.out.length && !R.stage.items.length && !R.stage.painted && !R.stage.notes.length) consoleApi.add('(IT RAN, AND PRINTED NOTHING)', 'l-dim');
      say('RAN CLEAN IN ' + ms + ' MS. ' + R.out.length + ' LINE' + (R.out.length === 1 ? '' : 'S') + ' PRINTED.', 'ok');
    }
    sv.attach(R.stage);
    R.stage.warnings.forEach(w => consoleApi.add(w, 'l-warn'));
    if (opts.watch && !R.err) { trace.show(R); traced(); }
    else if (opts.watch && R.err) note('THERE IS NOTHING TO WATCH: IT DID NOT RUN. FIX THE ERROR FIRST.', 'l-warn');
    if (o.onRun) o.onRun(R, opts);
    return R;
  };
  L.reset = src => { if (src !== undefined) L.src0 = src; ed.set(L.src0, true); consoleApi.clear(); ed.clearMarks(); sv.clear(); trace.hide(); L.R = null; readOnly(); if (o.onReset) o.onReset(); };
  L.setSource = (src, keepRun) => { ed.set(src, true); ed.clearMarks(); trace.hide(); if (!keepRun) { consoleApi.clear(); sv.clear(); L.R = null; } readOnly(); };
  L.load = src => { L.src0 = src; L.reset(src); };
  L.get = () => ed.get();
  L.focus = () => ed.focus();
  L.setBoard = on => sv.setBoard(on);
  /* time passes on the stage: a program that said Every(...) is called as the seconds go by (only while its window is the one you can see) */
  let last = performance.now();
  const clock = setInterval(() => {
    const now = performance.now(), dt = now - last; last = now;
    if (L.R && !L.R.err && L.R.stage.timers.length && root.isConnected && dt < 2000) L.R.stage.advance(dt);
  }, 100);
  L.destroy = () => { ed.destroy(); trace.destroy(); sv.destroy(); clearTimeout(readT); clearInterval(clock); };
  readOnly();
  return L;
}
