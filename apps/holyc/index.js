/* HOLYC.EXE: learn HolyC by typing it, then make small apps with it. Seven lessons (a coach that ticks goals off as the program meets them), fifty puzzles (judged
   by tests, three hints each), and a workshop that saves what you write and installs it on the desktop as an app. The compiler is the machine's own (window.HolyC),
   the lab is lab.js, and what each screen is made of is in the sibling files; this one only decides which is on show and pays what is earned. */
import { loadProgress } from './progress.js';
import { createLab } from './lab.js';
import { makeSounds } from './sounds.js';
import { makeLessonTutor } from './tutor_lesson.js';
import { makePuzzleTutor } from './tutor_puzzle.js';
import { makeWorkshop } from './workshop.js';
import { renderLessons, renderChapters, renderChapter } from './lists.js';
import { mountPlayer } from './player.js';
import { LESSONS, lessonById } from './lessons.js';
import { PUZZLES, puzzleById, CHAPTERS } from './puzzles.js';
import { el, button, banner } from './tutor_ui.js';
import { whenGone } from '../lifecycle.js';

export default {
  id: 'holyc',
  title: 'HOLYC.EXE',
  width: 1100,
  height: 740,
  resizable: true,
  fluid: true,

  async mount(root, ctx, args) {
    args = args || {};
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'apps/holyc/style.css'; root.appendChild(css);
    root.classList.add('hc');
    const HC = window.HolyC;
    if (!HC) { root.appendChild(el('div', 'hc-perr', 'THE COMPILER IS NOT LOADED. HOLYC.EXE CANNOT RUN.')); return; }
    const snd = makeSounds(ctx);
    if (args.run && args.from) { await mountPlayer(root, ctx, args, HC, snd); return; }
    const P = await loadProgress(ctx);
    snd.preload();

    /* ---- the frame ---------------------------------------------------------------------------------------------------------------- */
    const top = el('div', 'hc-top'), main = el('div', 'hc-main'), list = el('div', 'hc-list'), view = el('div', 'hc-labview'), left = el('div', 'hc-left'), labhost = el('div', 'hc-labhost');
    view.append(left, labhost); main.append(list, view); root.append(top, main);
    const tabs = {}, stats = el('span', 'hc-stats');
    top.appendChild(el('span', 'hc-brand', 'HOLYC'));
    [['lessons', 'LESSONS'], ['puzzles', 'PUZZLES'], ['shop', 'WORKSHOP']].forEach(t => { tabs[t[0]] = button(t[1], 'tab', () => show(t[0]), snd); top.appendChild(tabs[t[0]]); });
    top.append(el('span', 'hc-flex'), stats); root.tabIndex = 0;
    const refreshStats = () => {
      const n = P.count(), done = LESSONS.reduce((a, l) => a + P.lesson(l.id).done.length, 0), steps = LESSONS.reduce((a, l) => a + l.steps.length, 0);
      stats.textContent = 'LESSONS ' + done + '/' + steps + '   PUZZLES ' + n.puzzles + '/' + PUZZLES.length + '   SUN ' + (window.Economy ? window.Economy.balance() : 0);
    };
    const pay = (n, why) => { if (n > 0 && window.Economy) window.Economy.earn(n, why, { game: 'holyc' }); snd.coin(); refreshStats(); };
    const onEcon = () => refreshStats();
    if (window.Economy) window.Economy.onChange(onEcon);

    let lab = null, lessonT = null, puzzleT = null, shop = null;
    lab = createLab(labhost, {
      HC, snd, ctx,
      onRun: (R, opts) => { if (lessonT && lessonT.active) lessonT.evaluate(R); else if (puzzleT && puzzleT.active) puzzleT.check(); refreshStats(); },
      onStage: R => { if (lessonT && lessonT.active) lessonT.evaluate(R); },
      onEdit: src => { if (puzzleT && puzzleT.active) puzzleT.edited(src); }
    });

    /* ---- the three ways into the lab ---------------------------------------------------------------------------------------------------- */
    const closeAll = () => { lessonT.close(); puzzleT.close(); shop.close(); left.querySelectorAll('.hc-coach').forEach(c => { c.style.display = 'none'; }); };
    const mode = m => { list.style.display = m === 'list' ? '' : 'none'; view.style.display = m === 'lab' ? '' : 'none'; };
    const tabOn = v => Object.keys(tabs).forEach(k => tabs[k].classList.toggle('on', k === v));
    lessonT = makeLessonTutor(left, { lab, snd, progress: P, pay, onExit: () => show('lessons'), onFinish: L => finishLesson(L) });
    puzzleT = makePuzzleTutor(left, { lab, snd, progress: P, HC, pay, onExit: ch => show('puzzles', ch), onNext: p => nextPuzzle(p), solved: () => refreshStats() });
    shop = makeWorkshop(left, { lab, snd, ctx, progress: P, HC });
    const only = el => { [lessonT.el, puzzleT.el, shop.el].forEach(e => { e.style.display = e === el ? '' : 'none'; }); };

    function openLesson(id, step) { closeAll(); const L = lessonById(id); only(lessonT.el); mode('lab'); tabOn('lessons'); lessonT.open(L, Math.max(0, Math.min(step || 0, L.steps.length - 1))); }
    function openPuzzle(id) { closeAll(); const p = puzzleById(id); if (!p) return; only(puzzleT.el); mode('lab'); tabOn('puzzles'); puzzleT.open(p); }
    function openShop(src) { closeAll(); only(shop.el); mode('lab'); tabOn('shop'); P.setView('shop'); shop.open(src); }
    function finishLesson(L) {
      const i = LESSONS.indexOf(L), nxt = LESSONS[i + 1];
      if (nxt) { openLesson(nxt.id, P.firstOpenStep(nxt)); return; }
      ctx.toast('THE LESSONS ARE DONE. NOW THE PUZZLES.'); show('puzzles');
    }
    function nextPuzzle(p) {
      const i = PUZZLES.indexOf(p), nxt = PUZZLES.slice(i + 1).find(x => !P.solved(x.id)) || PUZZLES[i + 1];
      if (nxt) openPuzzle(nxt.id); else show('puzzles');
    }
    function show(v, arg) {
      closeAll(); mode('list'); tabOn(v); P.setView(v);
      if (v === 'lessons') renderLessons(list, { progress: P, snd, onOpen: openLesson });
      else if (v === 'puzzles') {
        if (arg) renderChapter(list, arg, { progress: P, snd, onOpen: openPuzzle, onBack: () => show('puzzles') });
        else renderChapters(list, { progress: P, snd, onChapter: id => show('puzzles', id) });
      } else openShop();
      refreshStats();
    }

    /* ---- go ---------------------------------------------------------------------------------------------------------------------------- */
    refreshStats();
    try { if (window.Buffs) window.Buffs.sync(P.buffView()); } catch (e) { /* a puzzle solved before there were buffs counts */ }
    if (args.edit !== undefined) { openShop(String(args.edit)); if (args.name) shop.setName(args.name); }
    else if (P.data.view === 'puzzles') show('puzzles'); else show('lessons');
    const again = ev => { const d = ev.detail; if (d && d.appId === 'holyc' && d.args && d.args.edit !== undefined) { openShop(String(d.args.edit)); if (d.args.name) shop.setName(d.args.name); } };
    window.addEventListener('app-reopen', again);
    whenGone(root, () => { window.removeEventListener('app-reopen', again); lab.destroy(); snd.stop(); P.save(); });
    void banner; void CHAPTERS;
  },
  unmount() {}
};
