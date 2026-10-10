/* THE BRIEF of a puzzle: what the program must do, the tests it is judged by (each ticks or crosses after a RUN, and the first one that fails says how), three
   hints that say more each time, and the answer for anybody who wants it (which pays a quarter, because it was copied). RUN is the check: the program is read
   against every test in fresh runs of its own, so a test that clicks a button three times does not spoil the stage you are looking at. A solved puzzle pays once. */
import { el, para, button, checkRow, banner, stars } from './tutor_ui.js';
import { runTests } from './tests.js';
import { puzzleSun, CHAPTER_SUN, SEEN_SHARE } from './pay.js';
import { PICS } from './puzzles_d.js';
import { CHAPTERS, chapterOf } from './puzzles.js';
import { VGA } from './stage_view.js';
import { solved as solvedCall } from './trophy_calls.js';

export function makePuzzleTutor(host, o) {
  const panel = el('div', 'hc-coach hc-brief'), snd = o.snd, lab = o.lab, P = o.progress, HC = o.HC;
  host.appendChild(panel);
  const T = { el: panel, p: null, results: null, hints: 0, active: false, confirm: false };

  function picture(f) {
    const cv = el('canvas', 'hc-pic'); cv.width = 16; cv.height = 16;
    const g = cv.getContext('2d'); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { g.fillStyle = VGA[f(x, y) & 15]; g.fillRect(x, y, 1, 1); }
    return cv;
  }
  function render() {
    const p = T.p, pr = P.puzzle(p.id), ch = chapterOf(p);
    panel.innerHTML = '';
    const h = el('div', 'hc-ch2');
    h.append(button('◀ PUZZLES', 'sm', () => o.onExit(ch.id), snd, 'back to the list'), el('span', 'hc-chtitle', ch.title));
    panel.appendChild(h);
    const body = el('div', 'hc-cbody');
    const t = el('div', 'hc-ptitle'); t.append(el('span', '', p.title), el('span', 'hc-pstars', stars(p.stars))); body.appendChild(t);
    const price = el('div', 'hc-price', pr.solved ? 'SOLVED' + (pr.seen ? ' (WITH THE ANSWER)' : pr.helped ? ' (WITH A HINT)' : ' (UNAIDED)') + (pr.paid ? '  +' + pr.paid + ' SUN' : '') : 'SOLVE IT: +' + puzzleSun(p.stars, false) + ' SUN'); price.classList.toggle('on', pr.solved); body.appendChild(price);
    p.brief.forEach(b => body.appendChild(para(b)));
    if (PICS[p.id]) { const w = el('div', 'hc-picw'); w.append(picture(PICS[p.id]), el('span', 'hc-piccap', 'THE PICTURE TO MAKE')); body.appendChild(w); }
    body.appendChild(el('div', 'hc-sub', 'IT IS SOLVED WHEN:'));
    T.list = el('div', 'hc-goals'); body.appendChild(T.list);
    T.detail = el('div', 'hc-detail'); body.appendChild(T.detail);
    T.hintEl = el('div', 'hc-hints'); body.appendChild(T.hintEl);
    panel.appendChild(body);
    const foot = el('div', 'hc-cfoot');
    T.bHint = button('HINT', 'sm', () => hint(), snd, 'a nudge, each one says more');
    T.bSol = button('SHOW SOLUTION', 'sm', () => solution(), snd, 'type the answer in (pays a quarter)');
    T.bNext = button('NEXT PUZZLE ▶', 'go next', () => o.onNext(p), snd);
    foot.append(T.bHint, T.bSol, el('span', 'hc-flex'), T.bNext);
    panel.appendChild(foot);
    renderList(); renderHints();
  }
  function renderList() {
    const p = T.p; T.list.innerHTML = '';
    p.tests.forEach((t, i) => { const r = T.results && T.results.results[i]; T.list.appendChild(checkRow(t.name, r ? r.ok : null)); });
    const solved = P.solved(p.id);
    T.bNext.style.visibility = solved ? '' : 'hidden'; T.bNext.classList.toggle('pulse', solved && T.justSolved);
    T.detail.innerHTML = '';
    if (T.results && !T.results.ok) {
      const bad = T.results.results.find(r => !r.ok);
      if (T.results.run.err) T.detail.appendChild(para('THE PROGRAM STOPPED: ' + T.results.run.err.message + (T.results.run.err.line ? ' (line ' + T.results.run.err.line + ')' : ''), 'hc-p hc-derr'));
      else if (bad) {
        T.detail.appendChild(para('NOT YET: ' + bad.name, 'hc-p hc-derr'));
        if (bad.msg) T.detail.appendChild(para(bad.msg, 'hc-p'));
        else if (typeof bad.got === 'string' || typeof bad.got === 'number') {
          const show = v => String(v).split('\n').join(' / ').slice(0, 160);
          T.detail.appendChild(para('YOURS:  ' + show(bad.got), 'hc-p hc-dg')); T.detail.appendChild(para('WANTED: ' + show(bad.want), 'hc-p hc-dw'));
        }
      }
    }
  }
  function renderHints() {
    const p = T.p; T.hintEl.innerHTML = '';
    for (let i = 0; i < T.hints; i++) { const d = el('div', 'hc-hint'); d.appendChild(el('b', 'hc-hn', 'HINT ' + (i + 1))); if (i === 2 && /\n/.test(p.hints[2])) d.appendChild(el('pre', 'hc-snip', p.hints[2])); else d.appendChild(para(p.hints[i], 'hc-p')); T.hintEl.appendChild(d); }
    T.bHint.style.display = T.hints >= 3 ? 'none' : ''; T.bHint.textContent = 'HINT ' + (T.hints + 1) + '/3';
    T.bSol.style.display = T.hints >= 3 || P.puzzle(p.id).tries >= 3 ? '' : 'none';
    if (T.confirm) {
      const c = el('div', 'hc-confirm'); c.appendChild(para('SHOWING THE ANSWER MEANS THIS PUZZLE PAYS A QUARTER (+' + puzzleSun(p.stars, true) + ' SUN INSTEAD OF +' + puzzleSun(p.stars, false) + '). SHOW IT?'));
      c.append(button('SHOW IT', 'go', () => { T.confirm = false; reveal(); }, snd), button('NO', 'sm', () => { T.confirm = false; renderHints(); }, snd)); T.hintEl.appendChild(c);
    }
  }
  const hint = () => { if (T.hints < 3) { T.hints++; const pr = P.puzzle(T.p.id); if (!pr.helped) { pr.helped = true; P.save(); } snd.step(); renderHints(); } };
  const solution = () => { if (P.solved(T.p.id)) { reveal(true); return; } T.confirm = true; renderHints(); };
  function reveal(free) {
    const pr = P.puzzle(T.p.id); if (!free) { pr.seen = true; pr.helped = true; P.save(); }
    lab.editor.typeIn(T.p.model, { replace: true, cps: 160, tick: () => snd.type(), done: () => { lab.editor.focus(); renderList(); } });
    render2();
  }
  const render2 = () => { const pr = P.puzzle(T.p.id); const e = panel.querySelector('.hc-price'); if (e) e.textContent = pr.solved ? 'SOLVED' + (pr.seen ? ' (WITH THE ANSWER)' : pr.helped ? ' (WITH A HINT)' : ' (UNAIDED)') + (pr.paid ? '  +' + pr.paid + ' SUN' : '') : 'SOLVE IT: +' + puzzleSun(T.p.stars, pr.seen) + ' SUN' + (pr.seen ? '  (ANSWER SEEN)' : ''); };

  T.open = p => {
    T.p = p; T.results = null; T.hints = 0; T.confirm = false; T.active = true; T.justSolved = false;
    P.data.last = { puzzle: p.id }; P.setView('puzzles');
    lab.setBoard(p.ch === 'pixels' || !!PICS[p.id]);
    const d = P.draft(p.id);
    lab.load(p.start); if (d && d !== p.start) { lab.setSource(d); }
    lab.editor.stopTyping(); render(); lab.focus();
  };
  T.close = () => { T.active = false; lab.editor.stopTyping(); panel.innerHTML = ''; };
  T.edited = src => { if (T.active) P.draft(T.p.id, src); };

  /* RUN is the check */
  T.check = () => {
    if (!T.active) return;
    const p = T.p, pr = P.puzzle(p.id), src = lab.get();
    pr.tries++;
    const res = runTests(HC, src, p.tests);
    const before = T.results ? T.results.passed : 0;
    T.results = res;
    res.results.forEach((r, i) => { if (r.ok && (!T.prevOk || !T.prevOk[i])) snd.pass(); });
    T.prevOk = res.results.map(r => r.ok);
    if (res.passed > before && !res.ok) snd.goal(Math.min(5, res.passed - 1));
    if (!res.ok) { if (!lab.R || !lab.R.err) snd.fail(); }
    if (res.ok && !pr.solved) {
      pr.solved = true; T.justSolved = true;
      const sun = puzzleSun(p.stars, pr.seen); pr.paid = sun; P.save();
      snd.done(); o.pay(sun, 'HOLYC: ' + p.title);
      banner(panel, 'SOLVED  +' + sun + ' SUN', 'big', 3600);
      const ch = chapterOf(p), all = ch.list.every(x => P.solved(x.id));
      if (all && !P.data.chapters[ch.id]) { P.data.chapters[ch.id] = true; P.save(); setTimeout(() => { o.pay(CHAPTER_SUN, 'HOLYC: ' + ch.title + ' COMPLETE'); banner(panel, ch.title + ' COMPLETE  +' + CHAPTER_SUN + ' SUN', 'big', 4200); snd.done(); }, 1500); }
      solvedCall(P, p, { tries: pr.tries, hints: T.hints, seen: pr.seen });
      try { if (window.Buffs) window.Buffs.sync(P.buffView()); } catch (e) { /* the buffs are somebody else's business */ }
      o.solved(p);
    }
    renderList(); renderHints(); render2();
  };
  void CHAPTERS; void SEEN_SHARE;
  return T;
}
