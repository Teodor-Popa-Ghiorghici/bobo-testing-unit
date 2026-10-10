import { LEVELS, levelById, payout } from './levels.js';
import { createRun, stepRun, W, H } from './sim.js';
import { draw, makeStars } from './draw.js';
import { createAudio } from './audio.js';
import { scopedListeners } from '../lifecycle.js';
import { createCalls } from './trophy_calls.js';

const PHOS_GLOW = [0.75, 0.40, 0.20, 0.05];
const STEP_MS = 1000 / 60;

export default {
  id: 'aftere',
  title: 'AfterEgypt',
  width: 680,
  height: 500,
  resizable: true,
  async mount(root, ctx) {
    const snd = (name, ...a) => { try { if (window.Snd && window.Snd[name]) window.Snd[name](...a); } catch (e) {} };
    const phos = () => window.CRT ? PHOS_GLOW[window.CRT.phos || 0] : 0.75;

    const wrap = document.createElement('div');
    wrap.className = 'gamepane';
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    cv.className = 'gamecv';
    cv.dataset.fit = 'int';             /* the window manager grows the picture to fill the pane (kernel/canvas_fit.js) */
    cv.tabIndex = 0;
    wrap.appendChild(cv);
    const bar = document.createElement('div');
    bar.className = 'appbar';
    const lvBtn = document.createElement('button');
    lvBtn.className = 'appbtn';
    const info = document.createElement('span');
    info.className = 'godword';
    bar.appendChild(lvBtn);
    bar.appendChild(info);
    root.appendChild(wrap);
    root.appendChild(bar);

    const g = cv.getContext('2d');
    if (!g) { info.textContent = 'NO CANVAS.'; return; }

    /* what has been flown: { cleared: { id: true }, best: { id: percent }, level: id, runs } */
    const prog = Object.assign({ cleared: {}, best: {}, level: 'pilgrim', runs: 0, chain: 0 }, await ctx.load('prog') || {});
    const unlocked = i => i === 0 || !!prog.cleared[LEVELS[i - 1].id];
    if (!unlocked(LEVELS.indexOf(levelById(prog.level)))) prog.level = 'pilgrim';

    /* the sound: the title and the way's tune on the studio's 'aftere' channel, and the effects (audio.js). The mixer's slider for it moves the effects
       here; the tunes follow it on their own. */
    const audio = createAudio(ctx), tro = createCalls();
    scopedListeners(cv).on(window, 'mixer-changed', ev => { if (!ev.detail || ev.detail.channel === 'aftere') audio.relevel(); });

    const ui = { mode: 'ready', stars: makeStars(), phos: 0.75, pay: null, unlocked: '', best: 0, cleared: false };
    let run = null, alive = true, last = 0, acc = 0, aim = null, pointer = null, dir = 0;
    const keys = Object.create(null);

    const level = () => levelById(prog.level);
    const note = () => {
      const L = level(), nx = LEVELS[LEVELS.indexOf(L) + 1];
      lvBtn.textContent = 'WAY: ' + L.name;
      info.textContent = 'ARROWS OR MOUSE. REACH THE TEMPLE.' + (nx && !prog.cleared[L.id] ? '  CLEAR IT TO OPEN ' + nx.name + '.' : '');
    };
    const ready = () => {
      const L = level();
      run = createRun(L);
      ui.mode = 'ready'; ui.pay = null; ui.unlocked = '';
      ui.best = prog.best[L.id] || 0; ui.cleared = !!prog.cleared[L.id];
      note();
      audio.menu(); audio.warm(L.id);
    };
    const fly = () => {
      run = createRun(level());
      if (pointer != null) { run.y = pointer; run.aim = pointer; }
      ui.mode = 'run'; ui.pay = null; ui.unlocked = '';
      acc = 0;
      audio.takeoff(level());
      tro.takeoff();
    };
    ready();

    /* a run is over: pay it, remember it, and say what it opened */
    const finish = () => {
      const L = level(), i = LEVELS.indexOf(L), first = run.won && !prog.cleared[L.id];
      ui.mode = run.won ? 'won' : 'dead';
      ui.pay = payout(L, run, first);
      prog.runs++;
      prog.best[L.id] = Math.max(prog.best[L.id] || 0, run.won ? 100 : Math.min(99, Math.round(run.dist / L.goal * 100)));
      if (run.won) {
        prog.cleared[L.id] = true;
        if (first && LEVELS[i + 1]) ui.unlocked = LEVELS[i + 1].name;
      }
      /* the ways cleared in order, with no failed run between: a clear of the way after the last one counted adds one, a clear of the first starts again */
      prog.chain = run.won ? (i === 0 ? 1 : prog.chain === i ? prog.chain + 1 : 0) : 0;
      audio.finish({ won: run.won, first: first && ui.pay.first > 0, unlocked: !!ui.unlocked });
      if (ui.pay.total > 0 && window.Economy) window.Economy.earn(ui.pay.total, 'AFTEREGYPT: ' + (run.won ? L.name : L.name + ' (COINS)'), { game: 'aftere' });
      ctx.save('prog', prog);
      tro.end(L, run, prog.chain);
      note();
    };

    lvBtn.addEventListener('mousedown', ev => {
      ev.stopPropagation();
      let i = LEVELS.indexOf(level());
      do { i = (i + 1) % LEVELS.length; } while (!unlocked(i));
      prog.level = LEVELS[i].id;
      ctx.save('prog', prog);
      snd('click');
      ready();
      cv.focus();
    });

    const startOrAgain = () => { if (ui.mode === 'run') return; fly(); };
    cv.addEventListener('keydown', e => {
      keys[e.key] = true;
      if (e.key === ' ' || e.key.indexOf('Arrow') === 0) e.preventDefault();
      if ((e.key === ' ' || e.key === 'Enter') && ui.mode !== 'run') startOrAgain();
    });
    cv.addEventListener('keyup', e => { keys[e.key] = false; });
    cv.addEventListener('mousemove', e => {
      const r = cv.getBoundingClientRect();
      aim = pointer = Math.max(10, Math.min(190, (e.clientY - r.top) / r.height * H));
    });
    cv.addEventListener('mousedown', ev => { ev.stopPropagation(); cv.focus(); if (ui.mode !== 'run') startOrAgain(); });
    wrap.addEventListener('mousedown', () => setTimeout(() => cv.focus(), 0));
    setTimeout(() => cv.focus(), 30);

    const state = { raf: null };
    const frame = ts => {
      if (!alive || !document.body.contains(cv)) { alive = false; audio.stop(); return; }
      state.raf = requestAnimationFrame(frame);
      ui.phos = phos();
      const dt = Math.min(100, ts - (last || ts));
      last = ts;
      if (ui.mode === 'run') {
        acc += dt;
        dir = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
        while (acc >= STEP_MS && ui.mode === 'run') {
          acc -= STEP_MS;
          stepRun(run, { aim, dir });
          aim = null;                                            /* a pointer move is an event; the ship remembers where it was told to go */
          audio.events(run); tro.step(run);
          if (run.dead || run.won) finish();
        }
      } else if (ui.mode === 'ready' && pointer != null) { run.y = pointer; run.aim = pointer; }
      audio.frame(dt / 1000, run, ui.mode);
      draw(g, run, ui);
    };
    state.raf = requestAnimationFrame(frame);
    this._state = state;
    this._audio = audio;
    this._stop = () => { alive = false; tro.stop(); };
  },
  unmount() {
    if (this._stop) this._stop();
    if (this._audio) this._audio.stop();
    if (this._state && this._state.raf) cancelAnimationFrame(this._state.raf);
  }
};
