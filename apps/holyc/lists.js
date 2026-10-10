/* The screens before the lab: the seven lessons, the nine chapters of puzzles, and the puzzles of one chapter. They only read the progress and say which one was
   chosen; index.js does the opening. Everything is a row you can click, and every row says how far you are and what it pays. */
import { el, button, stars, para } from './tutor_ui.js';
import { LESSONS } from './lessons.js';
import { CHAPTERS } from './puzzles.js';
import { LESSON_SUN, puzzleSun, CHAPTER_SUN } from './pay.js';

export function renderLessons(host, o) {
  const P = o.progress, snd = o.snd; host.innerHTML = '';
  const wrap = el('div', 'hc-page');
  const n = P.count();
  if (!n.lessonSteps) {
    const w = el('div', 'hc-welcome');
    w.appendChild(el('div', 'hc-wh', 'HOLYC, THE LANGUAGE THIS MACHINE IS WRITTEN IN'));
    ['You will learn it by typing it. Seven short lessons, each a few steps: the coach says what to do, you do it in the editor, and the lab ticks it off the moment the program does it.',
      'Then the PUZZLES: fifty small problems, from printing a line to a calculator, a stopwatch and a painting program that you build out of buttons. Programs here can be clicked.',
      'Nothing is locked, and every step can be skipped. Press START and type.'].forEach(t => w.appendChild(para(t)));
    wrap.appendChild(w);
  }
  LESSONS.forEach((L, i) => {
    const st = P.lesson(L.id), done = st.done.length, all = L.steps.length, complete = done >= all;
    const card = el('div', 'hc-card' + (complete ? ' done' : ''));
    const left = el('div', 'hc-cl'); left.appendChild(el('div', 'hc-cn', String(i + 1)));
    const mid = el('div', 'hc-cm');
    mid.append(el('div', 'hc-ct', L.title), el('div', 'hc-cs', L.blurb));
    const pips = el('div', 'hc-pips'); L.steps.forEach(s => pips.appendChild(el('span', 'hc-pip' + (st.done.indexOf(s.id) >= 0 ? ' done' : st.skipped.indexOf(s.id) >= 0 ? ' skip' : '')))); mid.appendChild(pips);
    const right = el('div', 'hc-cr');
    right.appendChild(el('div', 'hc-cstat' + (complete ? ' ok' : ''), complete ? 'DONE' + (st.paid ? '  +' + LESSON_SUN + ' SUN' : '') : done ? done + ' OF ' + all : all + ' STEPS  +' + LESSON_SUN + ' SUN'));
    right.appendChild(button(complete ? 'AGAIN' : done ? 'CONTINUE' : 'START', complete ? 'sm' : 'go', () => o.onOpen(L.id, complete ? 0 : P.firstOpenStep(L)), snd));
    card.append(left, mid, right); wrap.appendChild(card);
    card.addEventListener('dblclick', () => o.onOpen(L.id, P.firstOpenStep(L)));
  });
  host.appendChild(wrap);
}

export function renderChapters(host, o) {
  const P = o.progress, snd = o.snd; host.innerHTML = '';
  const wrap = el('div', 'hc-page');
  const total = CHAPTERS.reduce((a, c) => a + c.list.length, 0), solved = CHAPTERS.reduce((a, c) => a + c.list.filter(p => P.solved(p.id)).length, 0);
  wrap.appendChild(para('PUZZLES: ' + solved + ' OF ' + total + ' SOLVED. Each is judged by tests, and there are three hints for each. Pick any chapter.', 'hc-p hc-pagehead'));
  const grid = el('div', 'hc-grid');
  CHAPTERS.forEach((c, i) => {
    const s = c.list.filter(p => P.solved(p.id)).length, done = s === c.list.length;
    const card = el('div', 'hc-chcard' + (done ? ' done' : ''));
    card.append(el('div', 'hc-cn', String(i + 1)), el('div', 'hc-ct', c.title), el('div', 'hc-cs', c.blurb));
    const bar = el('div', 'hc-pbar'); const f = el('div', 'hc-pfill'); f.style.width = Math.round(100 * s / c.list.length) + '%'; bar.appendChild(f); card.appendChild(bar);
    card.appendChild(el('div', 'hc-cstat' + (done ? ' ok' : ''), s + ' / ' + c.list.length + (done ? '  DONE' : '  +' + CHAPTER_SUN + ' SUN FOR ALL')));
    card.addEventListener('mousedown', ev => { if (ev.button !== 0) return; ev.stopPropagation(); snd.click(); o.onChapter(c.id); });
    grid.appendChild(card);
  });
  wrap.appendChild(grid); host.appendChild(wrap);
}

export function renderChapter(host, id, o) {
  const P = o.progress, snd = o.snd, c = CHAPTERS.find(x => x.id === id); host.innerHTML = '';
  const wrap = el('div', 'hc-page');
  const h = el('div', 'hc-ph'); h.append(button('◀ CHAPTERS', 'sm', () => o.onBack(), snd), el('span', 'hc-chtitle', c.title), el('span', 'hc-cs', c.blurb)); wrap.appendChild(h);
  c.list.forEach((p, i) => {
    const pr = P.puzzle(p.id), row = el('div', 'hc-prow' + (pr.solved ? ' done' : ''));
    row.append(el('span', 'hc-pmark', pr.solved ? (pr.seen || pr.helped ? '✓' : '★') : String(i + 1)), el('span', 'hc-pt', p.title), el('span', 'hc-pstars', stars(p.stars)),
      el('span', 'hc-psun', pr.solved ? '+' + (pr.paid || 0) : '+' + puzzleSun(p.stars, false)));
    row.addEventListener('mousedown', ev => { if (ev.button !== 0) return; ev.stopPropagation(); snd.click(); o.onOpen(p.id); });
    wrap.appendChild(row);
  });
  host.appendChild(wrap);
}
