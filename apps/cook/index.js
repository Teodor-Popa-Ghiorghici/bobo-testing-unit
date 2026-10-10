import { createWindow, raise, sysDialog } from '../../kernel/wm.js';
import { Snd } from '../../kernel/snd.js';
import { Cos } from '../../kernel/cos.js';
import { fs as vfs } from '../../kernel/vfs.js';
import { CRT, Vol } from '../../kernel/hardware.js';
import { Studio } from '../../kernel/studio.js';
import { CK_SAVE, CK_W, CK_H, CK_T, CK_LV, CK_ACH } from './data.js';
import { CK_STORY, CK_END, STORY_AT, owed } from './story.js';
import { kidPool } from './lines.js';
import { blip, play as playBlip } from './voice.js';
import { createCookMusic } from './music.js';
import { benchPay } from './pay.js';
import { VGA16 } from '../../kernel/god.js';
import { scopedListeners, whenGone } from '../lifecycle.js';
import { createCalls } from './trophy_calls.js';
import { drawJesse, moodFor } from './jesse.js';
import { createShed } from './shed.js';                 /* the owner's blueprint opens a shed (shed.js) */
import { gifts, onGiven } from '../gifts_scope.js';

/* ---- the rules -----------------------------------------------------------
   The same functions the solver ran, so what the game allows and what was
   proved solvable cannot drift apart. */
function ckCell(L, x, y) {
  if (x < 0 || y < 0 || x >= CK_W || y >= CK_H) return '#';
  return L.grid[y][x];
}
function ckBlocked(c, temp) {
  if (c === '#') return true;
  if (c === '*') return temp < 2;      /* wax melts only when hot */
  if (c === '~') return temp > 0;      /* frost holds only when cold */
  return false;
}
function ckGate(c, sx, sy) {
  if (c === '<') return sx === -1;
  if (c === '>') return sx === 1;
  if (c === '^') return sy === -1;
  if (c === 'v') return sy === 1;
  return true;
}
function ckVec(r, temp) {
  if (r.dt && temp === 2) return r.dt;
  if (r.dc && temp === 0) return r.dc;
  return r.d;
}

export default {
  open() {
  /* every scene still draws in the original 420x320 coordinate space --
     this just backs the canvas with a bigger bitmap and scales the whole
     draw pass into it once per frame, so the dialogue/menu/ledger text
     comes out sharper and the window has room to actually show it at that
     size instead of stretching a small bitmap to fill a bigger box. */
  const RES = 1.3;
  createWindow({
    kind: 'app', title: 'The Cook', w: 820, h: 660, appId: 'cook',
    build: body => {
      const wrap = document.createElement('div');
      wrap.className = 'gamepane ckpane';
      const cv = document.createElement('canvas');
      const winL = scopedListeners(cv);
      cv.width = Math.round(420 * RES); cv.height = Math.round(320 * RES);
      cv.className = 'gamecv ckcv';
      cv.dataset.fit = 'fit';
      cv.tabIndex = 0;
      wrap.appendChild(cv);

      const bar = document.createElement('div');
      bar.className = 'appbar ckbar';
      const mk = (cls, txt) => { const b = document.createElement('button');
        b.className = 'appbtn ' + cls; b.textContent = txt; bar.appendChild(b); return b; };
      const bUndo = mk('ckundo', 'UNDO'), bReset = mk('ckreset', 'RESET');
      const bHeat = mk('ckheat', 'HEAT +'), bCool = mk('ckcool', 'COOL -');
      const bMenu = mk('ckmenu', 'LEVELS'), bBook = mk('ckbook', 'LEDGER');
      const bShed = mk('ckshed', 'SHED');                  /* only once the blueprint is yours */
      const info = document.createElement('span'); info.className = 'godword ckinfo';
      bar.appendChild(info);
      body.appendChild(wrap); body.appendChild(bar);

      const g = cv.getContext('2d');
      if (!g) { info.textContent = 'NO CANVAS.'; return; }
      let alive = true;

      /* ---- wall décor -----------------------------------------------------
         Three empty frames hang in every story scene. Drop an image named
         Frame1, Frame2 or Frame3 into ::/TheCook (Folder.exe handles new
         folders and uploads fine now) and it shows up taped to the wall,
         semi-transparent, next time this reloads them. */
      const WALL_DIR = '::/TheCook';
      const WALL_NAMES = ['Frame1', 'Frame2', 'Frame3'];
      const wallImg = [null, null, null];
      async function ensureWallFolder() {
        const keep = await vfs.read(WALL_DIR + '/.keep').catch(() => null);
        if (!keep) await vfs.write(WALL_DIR + '/.keep', { type: 'text', content: '' }).catch(() => {});
      }
      async function loadWallFrames() {
        for (let i = 0; i < WALL_NAMES.length; i++) {
          const rec = await vfs.read(WALL_DIR + '/' + WALL_NAMES[i]).catch(() => null);
          if (rec && rec.type === 'image' && rec.src) {
            const img = new Image();
            img.src = rec.src;
            wallImg[i] = img;
          } else {
            wallImg[i] = null;
          }
        }
      }
      ensureWallFolder().then(loadWallFrames);
      const wallHandler = ev => {
        if (!alive) return;
        const dir = ev.detail && ev.detail.dir;
        if (!dir || dir === '::' || dir === WALL_DIR) loadWallFrames();
      };
      winL.on(window, 'vfs-changed', wallHandler);

      /* ---- 33.6 paint --------------------------------------------------- */
      const C = i => { const p = VGA16[i] || VGA16[7]; return 'rgb(' + p[0] + ',' + p[1] + ',' + p[2] + ')'; };
      const R = (x, y, w, h, c) => {
        if (w <= 0 || h <= 0 || VGA16[c] == null) return;
        g.fillStyle = C(c);
        g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
      };
      const DIT = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
      const patC = {};
      function pat(c, s) {
        const k = c + ':' + s;
        if (patC[k]) return patC[k];
        const p = document.createElement('canvas'); p.width = 4; p.height = 4;
        const q = p.getContext('2d'); q.fillStyle = C(c);
        for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (DIT[j][i] < s) q.fillRect(i, j, 1, 1);
        patC[k] = g.createPattern(p, 'repeat');
        return patC[k];
      }
      const wash = (x, y, w, h, c, s) => {
        const n = Math.max(0, Math.min(16, Math.round(s)));
        if (n <= 0 || w <= 0 || h <= 0) return;
        g.fillStyle = pat(c, n);
        g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
      };
      function oval(cx, cy, rx, ry, c) {
        for (let y = -ry; y <= ry; y++) {
          const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
          if (w > 0) R(cx - w, cy + y, w * 2 + 1, 1, c);
        }
      }
      function washOval(cx, cy, rx, ry, c, s) {
        const n = Math.max(0, Math.min(16, Math.round(s)));
        if (n <= 0) return;
        g.fillStyle = pat(c, n);
        for (let y = -ry; y <= ry; y++) {
          const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
          if (w > 0) g.fillRect(cx - w, cy + y, w * 2 + 1, 1);
        }
      }
      const txt = (s, x, y, c, font, align) => {
        g.font = font || '11px monospace';
        g.textAlign = align || 'left';
        g.textBaseline = 'top';
        g.fillStyle = C(0);
        for (let d = 0; d < 4; d++) g.fillText(s, x + [1, -1, 0, 0][d], y + [0, 0, 1, -1][d]);
        g.fillStyle = C(c);
        g.fillText(s, x, y);
        g.textAlign = 'left';
      };

      const BX = 20, BY = 40;                    /* where the bench starts */
      const px = x => BX + x * CK_T, py = y => BY + y * CK_T;

      /* ---- 33.7 state ---------------------------------------------------- */
      const freshSave = () => ({ v:1, lv:1, best:{}, medal:{}, ach:{}, money:0,
                                 ruins:0, seen:{}, said:{}, bestRun:0, story:{} });
      let SV = freshSave();
      let L = null, st = null, hist = [], resets = 0, known = {};
      let undos = 0, nudged = 0;                 /* undos taken on this bench, and the bench the kid's third nudge came on (for the trophies) */
      const tro = createCalls();
      let mode = 'story';                        /* story · play · won · menu · book */
      let storyIx = 0, storyT = 0, storyQ = [], storyThen = 1, coinDue = 0;
      let anim = null, deadT = 0, winT = 0, hover = -1;
      let kid = null, kidLast = {}, idleT = 0, lvRuins = 0, run = null;
      const parts = [], floats = [], rings = [];
      let shake = 0, flash = 0, flashCol = 12, tempFlash = 0;

      function save() { try { localStorage.setItem(CK_SAVE, JSON.stringify(SV)); } catch (e) {} }
      function load() {
        try {
          const o = JSON.parse(localStorage.getItem(CK_SAVE) || 'null');
          if (o && o.v === 1) {
            SV = Object.assign(freshSave(), o);
            /* a save from before the story was reordered has no list of the cards it has read: it has read the ones that led up to the bench it is on */
            if (!o.story) { for (let n = 1; n <= SV.lv; n++) (STORY_AT[n] || []).forEach(i => { SV.story[i] = 1; }); }
          }
        } catch (e) {}
      }
      function ach(id) {
        if (SV.ach[id]) return;
        SV.ach[id] = 1; save(); tro.mirrored(id);
        const a = CK_ACH.filter(x => x.id === id)[0];
        if (a) { banner('LEDGER: ' + a.n, a.d, 14); sfx.ach(); }
      }
      function banner(t, s2, col) { floats.push({ ban: 1, t: 0, txt: t, sub: s2, col: col }); }
      function ring(x, y, r1, col, life) { rings.push({ x, y, t: 0, life: life || 0.5, r1, c: col }); }
      function spray(x, y, n, col, spd) {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * 6.28, v = spd * (0.4 + Math.random());
          parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.4,
                       t: 0, life: 0.7 + Math.random() * 0.6, c: col });
        }
      }
      const kick = (n, f, c) => { shake = Math.max(shake, n); if (f) { flash = f; flashCol = c; } };

      /* He says one thing at a time and never the same thing twice running.
         `once` keys are remembered in the save, so a first-time reaction is
         genuinely a first time. A win (`big`) is held: he types it out, it waits for a click, and
         `more` are the things he goes on to say, one click each; nothing he says on a win goes by itself. */
      function say(tag, once, big, more) {
        const pool = kidPool(tag);
        if (!pool.length) return;
        if (once) { if (SV.said[tag]) return; SV.said[tag] = 1; save(); }
        let i = Math.floor(Math.random() * pool.length);
        if (pool.length > 1 && i === kidLast[tag]) i = (i + 1) % pool.length;
        kidLast[tag] = i;
        kid = { s: pool[i], t: 0, life: 3.4 + pool[i].length * 0.022, tag: tag, mood: moodFor(tag), sounded: 0 };
        if (big) { kid.big = true; kid.hold = true; kid.life = 1e9; kid.queue = (more || []).slice(); kid.page = 1; kid.pages = 1 + kid.queue.length; }
        idleT = 0; tro.said(tag);
      }
      /* the sound of him talking: a blip for each letter as it is typed (voice.js) */
      function voiceKid() {
        if (!kid) return;
        const rate = kid.big ? 36 : 44, shown = Math.min(kid.s.length, Math.floor(kid.t * rate));
        while (kid.sounded < shown) { const b = blip(kid.s, kid.sounded); kid.sounded++; if (b) playBlip(Snd, b); }
      }
      /* a click on the box he is holding: finish the line, then the next one, then let it go (and the batch panel begins) */
      function kidNext() {
        if (!kid || !kid.hold) return false;
        const total = kid.s.length;
        if (Math.floor(kid.t * 36) < total) { kid.t = total / 36 + 0.02; kid.sounded = total; return true; }
        if (kid.queue.length) {
          const nxt = kid.queue.shift();
          kid.s = nxt; kid.lines = null; kid.t = 0; kid.sounded = 0; kid.page++; kid.mood = moodFor('win_L' + (L ? L.id : 1)); sfx.page();
          return true;
        }
        kid = null; winT = 0; sfx.page();
        if (coinDue) { coinDue = 0; setTimeout(() => Snd.coin(), 450); }
        return true;
      }

      function startLevel(n) {
        L = CK_LV[n - 1];
        st = { x:0, y:0, uses:L.reg.map(r => r.uses), fx:0, fy:0, mul:1,
               temp: L.temp0 == null ? 1 : L.temp0, cp:0,
               heat:L.heat || 0, cool:L.cool || 0,
               sweep: L.sweep ? L.sweep[0] : 0, dir: L.sweep ? L.sweep[1] : 1,
               steps:0, trail:[] };
        for (let y = 0; y < CK_H; y++) for (let x = 0; x < CK_W; x++)
          if (L.grid[y][x] === 'O') { st.x = x; st.y = y; }
        st.trail.push([st.x, st.y]);
        hist = []; anim = null; deadT = 0; winT = 0; hover = -1; idleT = 0;
        known = {};
        L.reg.forEach((r, i) => { if (!r.hidden) known[i] = 1; });
        mode = 'play'; tro.begin();
        Song.forBench(n);
        refresh();
        say('intro_' + n, 1);
      }
      const clone = s2 => JSON.parse(JSON.stringify(s2));
      /* Ten stars opens an eleventh board. It is not a bonus stage — it is a
         different solve, twice the length, that needs the mirror, the burner
         and both jars at once. Mastery should lead somewhere. */
      const perfect = () => CK_LV.slice(0, 10)
        .filter(lv => ((SV.medal[lv.id] || 0) & 4)).length;
      const knocksOpen = () => perfect() >= 10;

      /* ---- 33.8 a pour ---------------------------------------------------- */
      function pour(ri) {
        if (mode !== 'play' || anim || deadT > 0) return;
        /* the number keys go up to nine and most shelves are shorter */
        const r = L.reg[ri];
        if (!r) { sfx.empty(); return; }
        if (st.uses[ri] <= 0) { sfx.empty(); return; }
        let [dx, dy] = ckVec(r, st.temp);
        if (st.fx) dx = -dx;
        if (st.fy) dy = -dy;
        if (st.mul === 2) { dx *= 2; dy *= 2; }
        if (st.mul === 0.5) { dx = Math.trunc(dx / 2); dy = Math.trunc(dy / 2); }
        const n = Math.max(Math.abs(dx), Math.abs(dy));
        if (n === 0) { sfx.empty(); return; }
        const sx = Math.sign(dx), sy = Math.sign(dy);
        /* walk it, and find out where it stops or what it hits */
        const path = []; let x = st.x, y = st.y, hit = null;
        for (let k = 0; k < n; k++) {
          x += sx; y += sy;
          const c = ckCell(L, x, y);
          if (ckBlocked(c, st.temp) || !ckGate(c, sx, sy)) { hit = 'wall'; break; }
          path.push([x, y]);
          if (c === 'X') { hit = 'ruin'; break; }
        }
        hist.push(clone(st));
        if (!known[ri]) { known[ri] = 1; ach('a13'); sfx.reveal(); say('reveal');
          if (L.id === 10 && Object.keys(known).length >= L.reg.length) ach('a14'); }
        st.uses[ri]--; st.steps++;
        anim = { path, k: 0, t: 0, hit, ri: ri, sx, sy };
        sfx.pour(r.c);
      }

      /* the pour has arrived: everything that happens on landing */
      function land() {
        const p = anim.path, ri = anim.ri;
        if (anim.hit === 'wall' && !p.length) { st.steps--; hist.pop(); anim = null; sfx.thud(); kick(2); tro.wall(); return; }
        if (p.length) { st.x = p[p.length - 1][0]; st.y = p[p.length - 1][1]; st.trail.push([st.x, st.y]); }
        const c = ckCell(L, st.x, st.y);
        if (anim.hit === 'ruin' || c === 'X') { ruin(); anim = null; return; }
        if (anim.hit === 'wall') { sfx.thud(); say('wall'); tro.wall(); }
        st.mul = 1;
        if (c === 'M') { st.fx = st.fx ? 0 : 1; sfx.plate(); ach('a17'); say('first_mirror', 1); ring(px(st.x) + 10, py(st.y) + 10, 26, 11, 0.5); }
        if (c === 'W') { st.fy = st.fy ? 0 : 1; sfx.plate(); ring(px(st.x) + 10, py(st.y) + 10, 26, 11, 0.5); }
        if (c === 'D') { st.mul = 2; sfx.plate(); say('first_double', 1); ring(px(st.x) + 10, py(st.y) + 10, 26, 14, 0.5); }
        if (c === 'V') { st.mul = 0.5; sfx.plate(); }
        if (c === 'S') { st.fx = 0; st.fy = 0; st.mul = 1; sfx.plate(); say('first_solvent', 1); ring(px(st.x) + 10, py(st.y) + 10, 26, 15, 0.5); }
        if (c === '*') ach('a15');
        if (c === '~') ach('a16');
        if ((c === '1' || c === '2' || c === '3') && +c === st.cp + 1) {
          st.cp++; sfx.stage(st.cp);
          ring(px(st.x) + 10, py(st.y) + 10, 40, 10, 0.7);
          spray(px(st.x) + 10, py(st.y) + 10, 10, 10, 80);
          say('first_stage', st.cp > 1);
          if (st.cp === 3) ach('a19');
        }
        anim = null;
        if (!advanceSweep()) return;
        if (c === 'T' && st.cp >= (L.cps || 0)) win();
      }
      /* the sweep takes a step for every action, and catches you where you stand */
      function advanceSweep() {
        if (!L.sweep) return true;
        let s2 = st.sweep + st.dir, d = st.dir;
        if (s2 >= CK_W - 1) { s2 = CK_W - 2; d = -1; }
        if (s2 <= 0) { s2 = 1; d = 1; }
        st.sweep = s2; st.dir = d;
        if (st.x === s2) { ruin('caught'); return false; }
        return true;
      }
      function ruin(why) {
        deadT = 1.6; SV.ruins++; lvRuins++; tro.ruined(why);
        ach('a11'); if (SV.ruins >= 20) ach('a12');
        sfx.ruin(); Song.sting('ruin');
        spray(px(st.x) + 10, py(st.y) + 10, 26, 12, 150);
        ring(px(st.x) + 10, py(st.y) + 10, 60, 12, 0.7);
        kick(7, 0.5, 12);
        /* the banner says what happened, in a sentence, at the place it
           happened — a puzzle that fails silently is homework */
        banner(why === 'caught' ? 'CAUGHT IN THE SWEEP' : 'BATCH RUINED',
               why === 'caught'
                 ? 'it crosses one column for every pour you make'
                 : 'the pour crossed a ruined cell at ' + st.x + ',' + st.y,
               12);
        say(lvRuins >= 3 && lvRuins % 3 === 0 ? 'ruin_many' : why === 'caught' ? 'ruin_sweep' : 'ruin_X');
        save();
      }
      function win() {
        mode = 'won'; winT = 0;
        const over = Math.max(0, st.steps - L.par);
        const pur = Math.max(20, 99.1 - over * 2.5 - Math.min(8, resets) * 0.8);
        const prev = SV.best[L.id] || 0;
        if (pur > prev) SV.best[L.id] = pur;
        /* three medals per board rather than one tick, so there is a reason
           to come back to a level you have already beaten */
        const prevM = SV.medal[L.id] || 0;
        let m = prevM;
        m |= 1;
        if (st.steps <= L.par) m |= 2;
        if (st.steps <= L.par && resets === 0 && lvRuins === 0) m |= 4;
        SV.medal[L.id] = m;
        /* SUN, but only for medals that are new: a bench already beaten is a
           thing to come back to, not a tap to leave running */
        const fresh = m & ~prevM;
        const sun = benchPay(L.id, fresh);
        /* he says how it went, and then one more thing about THIS bench: each of them waits for a click, and the batch-complete
           panel does not start until he has finished, so nothing is ever read for you */
        const about = kidPool('win_L' + L.id);
        say(resets === 0 && lvRuins === 0 ? 'win_first' : st.steps <= L.par ? 'win_par' : 'win_over', 0, true, about.length ? [about[Math.floor(Math.random() * about.length)]] : []);
        winT = kid ? -1e9 : 0;
        if (sun) { window.Economy.earn(sun, 'THE COOK: BENCH ' + L.id, { game: 'cook' }); if (kid) coinDue = 1; else setTimeout(() => Snd.coin(), 700); }
        SV.money += Math.round(pur * 1000 * L.id);
        tro.won(L, st.steps, resets, undos, lvRuins, nudged === L.id);
        if (L.id >= SV.lv) SV.lv = Math.min(10, L.id + 1);
        if (L.id === 1) ach('a1');
        if (L.id >= 3) ach('a2');
        if (L.id >= 5) ach('a3');
        if (L.id >= 8) ach('a4');
        if (L.id === 10) ach('a5');
        if (pur >= 99.1) ach('a6');
        if (Object.keys(SV.best).filter(k => SV.best[k] >= 99.1).length >= 5) ach('a7');
        if (Object.keys(SV.best).filter(k => SV.best[k] >= 99.1).length >= 10) ach('a8');
        if (resets === 0) { ach('a9'); SV.seen.clean = (SV.seen.clean || 0) + 1;
                            if (SV.seen.clean >= 5) ach('a10'); }
        if (resets >= 10) ach('a21');
        if (SV.money >= 1e6) ach('a20');
        if (L.sweep && Math.abs(st.sweep - st.x) <= 2) ach('a18');
        if (knocksOpen()) { ach('a23'); if (!SV.said.knocks) {
          SV.said.knocks = 1;
          banner('THE ONE WHO KNOCKS', 'ten stars. there is an eleventh bench', 14); } }
        if (L.id === 11) ach('a24');
        save();
        sfx.win(); Song.sting('win');
        refresh();
        for (let k = 0; k < 4; k++) ring(px(st.x) + 10, py(st.y) + 10, 40 + k * 34, k % 2 ? 11 : 15, 0.8 + k * 0.2);
        spray(px(st.x) + 10, py(st.y) + 10, 40, 11, 170);
        kick(6, 0.45, 11);
      }
      function reset() {
        if (mode !== 'play') return;
        resets++; sfx.reset();
        const keep = known;
        startLevel(L.id);
        known = keep;
        if (Math.random() < 0.4) say('reset_a');
      }
      function undo() {
        if (mode !== 'play' || !hist.length || anim) return;
        const h = hist.pop();
        const keep = st.trail.slice(0, Math.max(1, st.trail.length - 1));
        st = h; st.trail = keep; undos++;
        deadT = 0; sfx.undo();
        if (Math.random() < 0.25) say('undo_a');
      }
      function op(which) {
        if (mode !== 'play' || anim || deadT > 0) return;
        if (which === 'heat' && (st.heat <= 0 || st.temp >= 2)) { sfx.empty(); return; }
        if (which === 'cool' && (st.cool <= 0 || st.temp <= 0)) { sfx.empty(); return; }
        hist.push(clone(st));
        if (which === 'heat') { st.temp++; st.heat--; } else { st.temp--; st.cool--; }
        st.steps++;
        tempFlash = 1;
        sfx.temp(which === 'heat'); tro.op(which);
        say(which === 'heat' ? 'first_hot' : 'first_cold', 1);
        advanceSweep();
        refresh();
      }

      /* ---- 33.9 the bench ------------------------------------------------- */
      function drawCellArt(c, x, y, t) {
        const X = px(x), Y = py(y);
        if (c === '#') {
          R(X, Y, CK_T, CK_T, 8); R(X, Y, CK_T, 2, 7); R(X, Y, 2, CK_T, 7);
          R(X + CK_T - 2, Y, 2, CK_T, 0); R(X, Y + CK_T - 2, CK_T, 2, 0);
          return;
        }
        /* the bench itself: a dark steel top with a faint grid */
        R(X, Y, CK_T, CK_T, 0);
        wash(X, Y, CK_T, CK_T, 8, 2);
        R(X, Y, CK_T, 1, 8); R(X, Y, 1, CK_T, 8);
        if (c === 'X') {
          wash(X + 1, Y + 1, CK_T - 2, CK_T - 2, 4, 12);
          const f = Math.floor(t * 6 + x * 3 + y) % 3;
          R(X + 4 + f, Y + 12, 3, 6, 12); R(X + 9, Y + 9 + f, 3, 9, 12); R(X + 14 - f, Y + 13, 3, 5, 12);
          R(X + 8, Y + 5, 4, 5, 14);
          return;
        }
        if (c === 'T') {
          washOval(X + 10, Y + 10, 12, 12, 11, 4 + Math.round((Math.sin(t * 3) + 1) * 2));
          R(X + 7, Y + 3, 6, 4, 7); R(X + 5, Y + 6, 10, 12, 7);
          R(X + 6, Y + 10, 8, 7, 11); R(X + 6, Y + 10, 8, 2, 15);
          R(X + 5, Y + 6, 2, 12, 15);
          return;
        }
        if (c === '1' || c === '2' || c === '3') {
          const done = st && st.cp >= +c;
          const col = done ? 10 : 14;
          R(X + 3, Y + 3, 14, 14, 0); R(X + 3, Y + 3, 14, 1, col); R(X + 3, Y + 16, 14, 1, col);
          R(X + 3, Y + 3, 1, 14, col); R(X + 16, Y + 3, 1, 14, col);
          txt(c, X + 10, Y + 5, col, 'bold 11px monospace', 'center');
          if (done) R(X + 6, Y + 9, 3, 3, 10), R(X + 9, Y + 12, 6, 3, 10);
          return;
        }
        if (c === 'M' || c === 'W') {
          R(X + 2, Y + 2, 16, 16, 8); R(X + 3, Y + 3, 14, 14, 11);
          R(X + 3, Y + 3, 14, 3, 15);
          const a = Math.floor(t * 4) % 4;
          R(X + 4 + a * 3, Y + 6, 2, 9, 15);
          txt(c === 'M' ? '↔' : '↕', X + 10, Y + 12, 0, '9px monospace', 'center');
          return;
        }
        if (c === 'D' || c === 'V') {
          R(X + 2, Y + 2, 16, 16, 6); R(X + 3, Y + 3, 14, 14, 14);
          R(X + 3, Y + 3, 14, 2, 15);
          txt(c === 'D' ? 'x2' : '/2', X + 10, Y + 6, 0, 'bold 10px monospace', 'center');
          return;
        }
        if (c === 'S') {
          R(X + 2, Y + 2, 16, 16, 7); R(X + 3, Y + 3, 14, 14, 15);
          const w = Math.round(Math.sin(t * 2) * 2);
          R(X + 5, Y + 9 + w, 10, 2, 11); R(X + 5, Y + 13 - w, 10, 2, 11);
          return;
        }
        if (c === '*') {
          const open = st && st.temp >= 2;
          if (open) { wash(X, Y, CK_T, CK_T, 6, 4); R(X + 8, Y + 14, 4, 4, 6); return; }
          R(X + 1, Y + 1, 18, 18, 6); R(X + 1, Y + 1, 18, 3, 14);
          R(X + 4, Y + 6, 12, 3, 14); R(X + 4, Y + 12, 12, 3, 14);
          return;
        }
        if (c === '~') {
          const open = st && st.temp <= 0;
          if (open) { wash(X, Y, CK_T, CK_T, 11, 3); return; }
          R(X + 1, Y + 1, 18, 18, 11); R(X + 1, Y + 1, 18, 3, 15);
          R(X + 9, Y + 4, 2, 12, 15); R(X + 4, Y + 9, 12, 2, 15);
          R(X + 5, Y + 5, 3, 3, 15); R(X + 12, Y + 12, 3, 3, 15);
          return;
        }
        if (c === '<' || c === '>' || c === '^' || c === 'v') {
          wash(X + 1, Y + 1, 18, 18, 2, 6);
          const m = { '<': '◄', '>': '►', '^': '▲', 'v': '▼' }[c];
          txt(m, X + 10, Y + 5, 10, '12px monospace', 'center');
          return;
        }
      }

      function drawBoard(t) {
        R(BX - 4, BY - 4, CK_W * CK_T + 8, CK_H * CK_T + 8, 8);
        R(BX - 2, BY - 2, CK_W * CK_T + 4, CK_H * CK_T + 4, 0);
        for (let y = 0; y < CK_H; y++) for (let x = 0; x < CK_W; x++)
          drawCellArt(L.grid[y][x], x, y, t);

        /* where the last pour would take you, drawn faintly, so the bench can
           be read before it is committed to */
        if (mode === 'play' && !anim && hover >= 0 && L.reg[hover] && st.uses[hover] > 0) {
          let [dx, dy] = ckVec(L.reg[hover], st.temp);
          if (!known[hover]) dx = dy = 0;
          if (st.fx) dx = -dx;
          if (st.fy) dy = -dy;
          if (st.mul === 2) { dx *= 2; dy *= 2; }
          if (st.mul === 0.5) { dx = Math.trunc(dx / 2); dy = Math.trunc(dy / 2); }
          const n = Math.max(Math.abs(dx), Math.abs(dy));
          let cx2 = st.x, cy2 = st.y, endC = null, ex = st.x, ey = st.y;
          for (let k = 0; k < n; k++) {
            cx2 += Math.sign(dx); cy2 += Math.sign(dy);
            const c = ckCell(L, cx2, cy2);
            if (ckBlocked(c, st.temp) || !ckGate(c, Math.sign(dx), Math.sign(dy))) {
              R(px(cx2) + 6, py(cy2) + 6, 8, 8, 12); endC = '#'; break;
            }
            wash(px(cx2) + 2, py(cy2) + 2, 16, 16, c === 'X' ? 12 : 15, 6);
            ex = cx2; ey = cy2; endC = c;
            if (c === 'X') break;
          }
          /* This is the "what would happen if I did this" the Potion Craft
             reviews are all about: it costs nothing to look, so planning is
             the game and flailing is not. It never spoils an unread jar. */
          if (endC != null && (ex !== st.x || ey !== st.y)) {
            R(px(ex) + 1, py(ey) + 1, 18, 18, endC === 'X' ? 12 : 15);
            R(px(ex) + 3, py(ey) + 3, 14, 14, 0);
            const lab = endC === 'X' ? 'RUIN' : endC === 'T' ? (st.cp >= (L.cps || 0) ? 'DONE' : 'LOCKED')
                      : endC === 'M' ? 'FLIP X' : endC === 'W' ? 'FLIP Y'
                      : endC === 'D' ? 'x2' : endC === 'V' ? '/2' : endC === 'S' ? 'CLEAR'
                      : (endC === '1' || endC === '2' || endC === '3')
                        ? (+endC === st.cp + 1 ? 'STAGE ' + endC : 'NOT YET') : null;
            if (lab) {
              const w = lab.length * 6 + 8;
              const lx = Math.max(2, Math.min(418 - w, px(ex) + 10 - w / 2));
              R(lx, py(ey) - 13, w, 12, 0);
              R(lx, py(ey) - 13, w, 1, endC === 'X' ? 12 : 11);
              txt(lab, lx + w / 2, py(ey) - 12, endC === 'X' ? 12 : 11, '9px monospace', 'center');
            }
          }
          if (L.sweep) {
            /* and where the sweep will be by the time you land there */
            let ns = st.sweep + st.dir;
            if (ns >= CK_W - 1) ns = CK_W - 2; if (ns <= 0) ns = 1;
            R(px(ns), BY, 2, CK_H * CK_T, 12); R(px(ns) + CK_T - 2, BY, 2, CK_H * CK_T, 12);
            if (ns === ex) txt('SWEEP', px(ex) + 10, py(ey) + 22, 12, '9px monospace', 'center');
          }
        }

        /* the sweep */
        if (L.sweep) {
          const sx2 = px(st.sweep);
          wash(sx2, BY, CK_T, CK_H * CK_T, 12, 5 + Math.round((Math.sin(t * 9) + 1) * 2));
          R(sx2, BY, 2, CK_H * CK_T, 12); R(sx2 + CK_T - 2, BY, 2, CK_H * CK_T, 12);
          const nx = st.sweep + st.dir;
          if (nx > 0 && nx < CK_W - 1) wash(px(nx), BY, CK_T, CK_H * CK_T, 4, 3);
        }

        /* the trail of everything already poured */
        for (let i = 1; i < st.trail.length; i++) {
          const a = st.trail[i - 1], b = st.trail[i];
          const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
          const sx2 = Math.sign(b[0] - a[0]), sy2 = Math.sign(b[1] - a[1]);
          for (let k = 1; k <= n; k++) {
            const cx2 = a[0] + sx2 * k, cy2 = a[1] + sy2 * k;
            R(px(cx2) + 8, py(cy2) + 8, 4, 4, 9);
          }
        }

        /* and the flask itself, mid-flight or standing still */
        let mx = px(st.x) + 10, my = py(st.y) + 10;
        if (anim && anim.path.length) {
          const k = Math.min(anim.path.length - 1, Math.floor(anim.k));
          const f = anim.k - Math.floor(anim.k);
          const cur = anim.path[k];
          const prev = k === 0 ? [st.x, st.y] : anim.path[k - 1];
          mx = px(prev[0] + (cur[0] - prev[0]) * f) + 10;
          my = py(prev[1] + (cur[1] - prev[1]) * f) + 10;
        }
        if (deadT <= 0) {
          washOval(mx, my, 13, 13, 11, 5 + Math.round((Math.sin(t * 5) + 1) * 2));
          oval(mx, my, 7, 7, 0);
          oval(mx, my, 6, 6, 9);
          oval(mx, my - 1, 4, 4, 11);
          R(mx - 2, my - 4, 2, 3, 15);
        } else {
          for (let i = 0; i < 8; i++) {
            const a = i / 8 * 6.28, d = (1.6 - deadT) * 30;
            R(mx + Math.cos(a) * d, my + Math.sin(a) * d, 3, 3, 12);
          }
        }
      }

      /* One wrapper for this app, shared by the kid's strip and the story
         card. Both of them used to re-wrap the same sentence every frame
         while it typed itself out; now each wraps once and keeps it. */
      let storyCache = -1, storyLines = [];
      function wrapTo(s2, w) {
        const out = []; let cur = '';
        s2.split(' ').forEach(word => {
          const n = cur ? cur + ' ' + word : word;
          if (cur && g.measureText(n).width > w) { out.push(cur); cur = word; } else cur = n;
        });
        if (cur) out.push(cur);
        return out;
      }

      /* he sits under the bench and talks over the top of it */
      function drawKid() {
        if (!kid) return;
        const typing = Math.floor(kid.t * (kid.big ? 36 : 44)) < kid.s.length;
        const talk = typing && Math.floor(kid.t * 9) % 2 === 0;
        if (kid.big) { drawKidBig(talk); return; }
        const k = kid.t / kid.life;
        const slide = k < 0.1 ? Math.round(-60 + (k / 0.1) * 60) : k > 0.94 ? Math.round(((k - 0.94) / 0.06) * 60) : 0;
        const H = 58, Y = 202 + slide;
        R(6, Y, 408, H, 0);
        R(6, Y, 408, 1, 10); R(6, Y + H - 1, 408, 1, 10);
        R(6, Y, 1, H, 10); R(413, Y, 1, H, 10);
        wash(6, Y, 408, H, 8, 2);
        drawJesse(g, 12, Y + 5, 2.6, kid.mood, talk);
        g.font = '11px monospace';
        if (!kid.lines) kid.lines = wrapTo(kid.s, 340);
        const lines = kid.lines.slice(0, 3);
        const shown = Math.floor(kid.t * 44);
        let n = 0;
        txt('JESSE', 62, Y + 3, 14, '9px monospace');
        lines.forEach((l, i) => {
          const cut = Math.max(0, Math.min(l.length, shown - n));
          n += l.length;
          if (cut > 0) txt(l.slice(0, cut), 62, Y + 15 + i * 13, 15, '11px monospace');
        });
      }
      /* the win: the board dims, he gets the middle of the screen and a box that fits what he says, and nothing else happens until
         he is done AND you have clicked: it types itself out, finishes on a click, goes on to the next thing on the next, and the
         batch-complete panel starts on the last */
      function drawKidBig(talk) {
        const open = Math.min(1, kid.t / 0.25), dy = Math.round((1 - open) * 30);
        wash(0, 0, 420, 320, 0, 6);
        const X = 36, Y = 62 + dy, W = 348, H = 150;
        R(X, Y, W, H, 0);
        R(X, Y, W, 2, 14); R(X, Y + H - 2, W, 2, 14); R(X, Y, 2, H, 14); R(X + W - 2, Y, 2, H, 14);
        wash(X + 2, Y + 2, W - 4, H - 4, 8, 2);
        /* his own little window */
        R(X + 10, Y + 10, 96, 118, 1);
        R(X + 10, Y + 10, 96, 1, 14); R(X + 10, Y + 127, 96, 1, 14);
        drawJesse(g, X + 14, Y + 14, 5.4, kid.mood, talk);
        txt('JESSE', X + 118, Y + 10, 14, 'bold 12px monospace');
        if (kid.pages > 1) txt(kid.page + ' / ' + kid.pages, X + W - 10, Y + 10, 7, '10px monospace', 'right');
        g.font = '12px monospace';
        if (!kid.lines) kid.lines = wrapTo(kid.s, W - 140);
        const shown = Math.floor(kid.t * 36);
        let n = 0;
        kid.lines.slice(0, 7).forEach((l, i) => {
          const cut = Math.max(0, Math.min(l.length, shown - n));
          n += l.length;
          if (cut > 0) txt(l.slice(0, cut), X + 118, Y + 30 + i * 16, 15, '12px monospace');
        });
        /* when it has all been said, it waits */
        if (shown >= kid.s.length) txt(Math.floor(kid.t * 2.2) % 2 ? '\u25BC CLICK' : '\u25BC', X + W - 10, Y + H - 16, 11, '10px monospace', 'right');
      }

      /* ---- 33.10 the shelf ------------------------------------------------ */
      function bottleAt(mx, my) {
        if (my < 262 || my > 318) return -1;
        const i = Math.floor((mx - 14) / 78);
        return (i >= 0 && i < L.reg.length && mx > 14 + i * 78 && mx < 14 + i * 78 + 72) ? i : -1;
      }
      function drawShelf(t) {
        R(0, 258, 420, 62, 0);
        wash(0, 258, 420, 62, 8, 3);
        R(0, 258, 420, 1, 8);
        L.reg.forEach((r, i) => {
          const X = 14 + i * 78, Y = 264, on = st.uses[i] > 0, hv = hover === i;
          R(X, Y, 72, 50, hv && on ? 8 : 0);
          R(X, Y, 72, 1, on ? r.c : 8); R(X, Y + 49, 72, 1, on ? r.c : 8);
          R(X, Y, 1, 50, on ? r.c : 8); R(X + 71, Y, 1, 50, on ? r.c : 8);
          /* the bottle */
          const bx = X + 8, by = Y + 8;
          R(bx + 5, by, 4, 4, 7);
          R(bx + 3, by + 4, 8, 3, 8);
          R(bx + 1, by + 7, 12, 24, on ? r.c : 8);
          R(bx + 1, by + 7, 3, 24, on ? 15 : 8);
          R(bx + 3, by + 14, 8, 12, on ? 15 : 8);
          if (!known[i]) txt('?', bx + 7, by + 14, 0, 'bold 13px monospace', 'center');
          R(bx + 1, by + 30, 12, 2, 0);
          /* the name and what it does */
          txt(r.n, X + 26, Y + 6, on ? 15 : 8, '10px monospace');
          if (known[i]) {
            const v = ckVec(r, st.temp);
            const ar = (v[0] > 0 ? '→' : v[0] < 0 ? '←' : '') +
                       (v[1] > 0 ? '↓' : v[1] < 0 ? '↑' : '');
            txt(ar + ' ' + Math.max(Math.abs(v[0]), Math.abs(v[1])), X + 26, Y + 19, on ? 14 : 8, 'bold 12px monospace');
          } else {
            txt('unlabelled', X + 26, Y + 19, 13, '9px monospace');
          }
          for (let k = 0; k < Math.min(8, r.uses); k++) {
            R(X + 26 + k * 5, Y + 36, 4, 8, k < st.uses[i] ? r.c : 8);
          }
          txt(String(i + 1), X + 64, Y + 38, 7, '9px monospace');
        });
      }

      /* ---- 33.11 the top strip -------------------------------------------- */
      function drawTop() {
        R(0, 0, 420, 36, 0);
        wash(0, 0, 420, 36, 8, 3);
        R(0, 35, 420, 1, 8);
        txt(String(L.id).padStart(2, '0') + '  ' + L.n, 8, 4, 14, 'bold 13px monospace');
        /* clipped, because a long subtitle used to run straight through the
           pour counter and neither one was readable */
        g.save(); g.beginPath(); g.rect(0, 18, 250, 16); g.clip();
        txt(L.sub, 8, 21, 7, '9px monospace');
        g.restore();
        const over = st.steps - L.par;
        txt('POURS', 262, 4, 7, '9px monospace');
        txt(st.steps + ' / ' + L.par, 262, 15, over > 0 ? 12 : over === 0 ? 14 : 10, 'bold 13px monospace');
        /* the burner, when there is one */
        if (L.heat || L.cool) {
          const nm = ['COLD', 'WARM', 'HOT'][st.temp], cl = [11, 7, 12][st.temp];
          txt('BURNER', 330, 4, 7, '9px monospace');
          txt(nm, 330, 15, cl, 'bold 13px monospace');
          for (let i = 0; i < 3; i++) R(384 + i * 9, 16, 7, 10, i <= st.temp ? cl : 8);
          if (tempFlash > 0) wash(0, 0, 420, 320, st.temp >= 2 ? 12 : 11, Math.round(tempFlash * 4));
        }
        if (st.fx || st.fy) txt('MIRRORED ' + (st.fx ? 'X' : '') + (st.fy ? 'Y' : ''), 190, 22, 11, '9px monospace');
        if (st.mul !== 1) txt(st.mul === 2 ? 'NEXT POUR x2' : 'NEXT POUR /2', 190, 4, 14, '9px monospace');
      }

      /* ---- 33.12 the cards ------------------------------------------------- */
      function scene(id, t) {
        const S2 = (x, y, w, h, c) => R(x, y, w, h, c);
        R(0, 0, 420, 320, 0);
        if (id === 'class') {
          wash(0, 0, 420, 320, 1, 3);
          S2(60, 60, 300, 140, 2); S2(64, 64, 292, 132, 0);
          for (let i = 0; i < 5; i++) S2(80, 80 + i * 22, 60 + (i * 37) % 200, 3, 15);
          S2(180, 210, 60, 70, 8); oval(210, 200, 16, 18, 7);
        } else if (id === 'rv') {
          wash(0, 0, 420, 160, 9, 4); wash(0, 160, 420, 160, 6, 6);
          S2(90, 120, 190, 80, 15); S2(90, 120, 190, 10, 7); S2(260, 140, 40, 60, 7);
          S2(110, 140, 40, 30, 11); S2(170, 140, 40, 30, 11);
          oval(130, 205, 16, 16, 0); oval(250, 205, 16, 16, 0);
          oval(130, 205, 7, 7, 8); oval(250, 205, 7, 7, 8);
        } else if (id === 'desert') {
          wash(0, 0, 420, 200, 1, 6);
          for (let i = 0; i < 50; i++) { const x = (i * 79) % 414, y = (i * 131) % 170;
            if (Math.sin(t + i) > 0) S2(x, y, 1, 1, 15); }
          oval(330, 60, 22, 22, 15); oval(322, 54, 19, 19, 0);
          S2(0, 200, 420, 120, 6); wash(0, 200, 420, 120, 8, 4);
          S2(140, 150, 120, 52, 15); S2(140, 150, 120, 6, 7);
          oval(60, 210, 60, 22, 8); oval(360, 214, 70, 24, 8);
        } else if (id === 'meet') {
          wash(0, 0, 420, 320, 8, 4);
          S2(40, 40, 120, 200, 0); S2(44, 44, 112, 192, 11);
          for (let i = 0; i < 6; i++) S2(44, 44 + i * 34, 112, 4, 8);
          oval(280, 120, 30, 40, 7); oval(280, 78, 22, 22, 7);
          S2(258, 100, 44, 6, 0);
        } else if (id === 'blue') {
          wash(0, 0, 420, 320, 1, 5);
          washOval(210, 160, 130, 110, 11, 4);
          for (let i = 0; i < 26; i++) {
            const a = i * 1.1, d = 20 + (i % 5) * 16;
            const x = 210 + Math.cos(a) * d, y = 160 + Math.sin(a) * d * 0.7;
            S2(x, y, 12, 14, 11); S2(x, y, 12, 3, 15); S2(x, y + 11, 12, 3, 9);
          }
        } else if (id === 'lab') {
          wash(0, 0, 420, 320, 8, 3);
          for (let i = 0; i < 4; i++) { S2(30 + i * 96, 60, 70, 160, 7); S2(34 + i * 96, 64, 62, 152, 8); }
          for (let i = 0; i < 4; i++) { S2(50 + i * 96, 90, 30, 60, 11); S2(50 + i * 96, 90, 30, 6, 15); }
          S2(0, 240, 420, 80, 7); wash(0, 240, 420, 80, 8, 6);
        } else if (id === 'badge') {
          wash(0, 0, 420, 320, 0, 4);
          oval(210, 150, 70, 84, 14); oval(210, 150, 60, 74, 6);
          S2(180, 120, 60, 8, 14); S2(180, 140, 60, 8, 14); S2(180, 160, 60, 8, 14);
          oval(210, 96, 26, 26, 14); oval(210, 96, 18, 18, 6);
          const f = Math.floor(t * 3) % 2;
          S2(40, 40, 60, 24, f ? 12 : 0); S2(320, 40, 60, 24, f ? 0 : 9);
        } else if (id === 'car') {
          wash(0, 0, 420, 200, 1, 8); wash(0, 200, 420, 120, 0, 8);
          S2(70, 130, 280, 70, 8); S2(100, 100, 200, 34, 8);
          S2(112, 106, 80, 26, 0); S2(210, 106, 80, 26, 0);
          oval(120, 200, 22, 22, 0); oval(300, 200, 22, 22, 0);
          S2(60, 150, 16, 14, 14); S2(344, 150, 16, 14, 12);
        } else if (id === 'hole') {
          wash(0, 0, 420, 150, 1, 5); wash(0, 150, 420, 170, 6, 6);
          S2(0, 190, 420, 20, 8);
          for (let i = 0; i < 8; i++) S2(20 + i * 52, 150, 34, 42, 7), S2(24 + i * 52, 154, 26, 34, 8);
          S2(150, 250, 120, 50, 0); wash(150, 250, 120, 50, 8, 5);
        } else if (id === 'empty') {
          wash(0, 0, 420, 320, 8, 2);
          for (let i = 0; i < 3; i++) { S2(50 + i * 120, 80, 80, 150, 8); S2(54 + i * 120, 84, 72, 142, 0); }
          washOval(210, 160, 90, 80, 11, 2);
          S2(0, 250, 420, 70, 0); wash(0, 250, 420, 70, 8, 4);
        } else if (id === 'glass') {
          wash(0, 0, 420, 320, 1, 4);
          S2(30, 90, 360, 6, 7); S2(30, 170, 360, 6, 7); S2(30, 250, 360, 6, 7);
          for (let i = 0; i < 7; i++) { const x = 46 + i * 50; S2(x, 52, 18, 38, 11); S2(x - 6, 76, 30, 14, 11); S2(x, 52, 18, 4, 15); }
          for (let i = 0; i < 6; i++) { const x = 60 + i * 58; oval(x, 150, 14, 18, 11); S2(x - 3, 118, 6, 14, 11); }
          S2(300, 200, 70, 50, 6); S2(304, 204, 62, 8, 14);
        } else if (id === 'blast') {
          wash(0, 0, 420, 320, 0, 5);
          for (let i = 0; i < 5; i++) washOval(210, 150, 40 + i * 28, 30 + i * 22, i % 2 ? 14 : 12, 6 - i);
          oval(210, 150, 28, 22, 15);
          S2(150, 250, 120, 40, 8); S2(170, 262, 80, 6, 7);
        } else if (id === 'book') {
          wash(0, 0, 420, 320, 8, 3);
          S2(110, 80, 200, 150, 6); S2(116, 86, 188, 138, 14); S2(206, 86, 8, 138, 6);
          for (let i = 0; i < 6; i++) { S2(126, 104 + i * 18, 70, 3, 8); S2(224, 104 + i * 18, 70, 3, 8); }
          S2(100, 232, 220, 10, 8); S2(0, 250, 420, 70, 0); wash(0, 250, 420, 70, 8, 4);
        } else if (id === 'end') {
          wash(0, 0, 420, 320, 1, 4);
          washOval(210, 190, 150, 90, 11, 3);
          S2(120, 200, 180, 26, 8); S2(120, 200, 180, 4, 7);
          oval(150, 194, 18, 12, 7);
          for (let i = 0; i < 18; i++) {
            const x = 90 + (i * 41) % 250, y = 150 + (i * 29) % 60;
            S2(x, y, 7, 9, 11); S2(x, y, 7, 2, 15);
          }
        }
        drawWallFrames();
      }

      function drawWallFrames() {
        const FW = 108, FH = 34, gap = 10, y = 8;
        for (let i = 0; i < 3; i++) {
          const x = 14 + i * (FW + gap);
          const img = wallImg[i];
          if (img && img.complete && img.naturalWidth) {
            R(x, y, FW, FH, 0);
            g.save();
            g.beginPath(); g.rect(x, y, FW, FH); g.clip();
            g.globalAlpha = 0.4;
            const s = Math.max(FW / img.naturalWidth, FH / img.naturalHeight);
            const iw = img.naturalWidth * s, ih = img.naturalHeight * s;
            g.drawImage(img, x + (FW - iw) / 2, y + (FH - ih) / 2, iw, ih);
            g.globalAlpha = 1;
            g.restore();
          } else {
            R(x, y, FW, FH, 0);
            R(x + FW / 2 - 4, y + FH / 2 - 1, 8, 2, 8);
          }
          R(x - 2, y - 2, FW + 4, 2, 15); R(x - 2, y + FH, FW + 4, 2, 8);
          R(x - 2, y - 2, 2, FH + 4, 15); R(x + FW, y - 2, 2, FH + 4, 8);
        }
      }

      function drawStory(t) {
        const ch = storyIx < CK_STORY.length ? CK_STORY[storyIx] : null;
        scene(ch ? ch.sc : 'end', t);
        wash(0, 0, 420, 320, 0, 7);
        const title = ch ? ch.t : CK_END.t;
        /* wrap to the card rather than trusting the line lengths: a chapter
           written one character too wide used to run out through the border */
        g.font = '10px monospace';
        if (storyCache !== storyIx) {
          storyLines = [];
          (ch ? ch.l : CK_END.l).forEach(l => {
            if (!l) { storyLines.push(''); return; }
            wrapTo(l, 366).forEach(w => storyLines.push(w));
          });
          storyCache = storyIx;
        }
        const lines = storyLines;
        const bh = lines.length * 14 + 52;
        const by = Math.round(160 - bh / 2);
        R(10, by, 400, bh, 0);
        R(10, by, 400, 2, 11); R(10, by + bh - 2, 400, 2, 11);
        R(10, by, 2, bh, 11); R(408, by, 2, bh, 11);
        txt(ch ? 'CHAPTER ' + (storyIx + 1) : 'THE LAST BATCH', 210, by + 8, 7, '9px monospace', 'center');
        txt(title, 210, by + 19, 14, 'bold 14px monospace', 'center');
        /* the lines type themselves out, and clicking once finishes them */
        const show = Math.floor(storyT * 34);
        let n = 0;
        lines.forEach((l, i) => {
          const cut = Math.max(0, Math.min(l.length, show - n));
          n += l.length;
          if (cut > 0) txt(l.slice(0, cut), 22, by + 41 + i * 14, 15, '10px monospace');
        });
        if (storyT > 2.2) txt('SPACE', 210, by + bh - 14, Math.floor(t * 2) % 2 ? 11 : 7, '9px monospace', 'center');
      }

      function drawMenu(t) {
        R(0, 0, 420, 320, 0); wash(0, 0, 420, 320, 8, 3);
        txt('THE COOK', 210, 14, 14, 'bold 17px monospace', 'center');
        txt('banked  $' + SV.money.toLocaleString(), 210, 34, 10, '11px monospace', 'center');
        CK_LV.forEach((lv, i) => {
          const last = lv.hidden;
          const open = last ? knocksOpen() : i + 1 <= SV.lv;
          if (last && !open && perfect() < 6) return;      /* not even hinted at yet */
          const X = last ? 20 : 20 + (i % 2) * 194;
          const Y = last ? 54 + 5 * 38 : 54 + Math.floor(i / 2) * 38;
          const w = last ? 380 : 186;
          const edge = last ? (open ? 14 : 6) : (open ? 11 : 8);
          R(X, Y, w, 34, 0);
          /* the eleventh gets a gold surround, but the words still sit on
             black or the gold eats them */
          if (last) { wash(X, Y, w, 34, open ? 14 : 8, 4); R(X + 3, Y + 3, w - 6, 28, 0); }
          R(X, Y, w, 1, edge); R(X, Y + 33, w, 1, edge);
          R(X, Y, 1, 34, edge); R(X + w - 1, Y, 1, 34, edge);
          txt(last ? '11' : String(i + 1).padStart(2, '0'), X + 8, Y + 5, open ? 14 : 8, 'bold 14px monospace');
          txt(open ? lv.n : last ? 'TEN STARS' : 'LOCKED', X + 32, Y + 4,
              open ? 15 : 8, '11px monospace');
          const b = SV.best[lv.id];
          txt(b ? b.toFixed(1) + '%' : open ? 'par ' + lv.par
                : last ? perfect() + ' of 10 so far' : '',
              X + 32, Y + 19, b >= 99 ? 11 : b ? 10 : 8, '10px monospace');
          /* three medals: finished it, finished it in par, and finished it in
             par with nothing spilled and nothing restarted */
          const m = SV.medal[lv.id] || 0;
          [['C', 1, 10], ['P', 2, 14], ['*', 4, 15]].forEach((md, k) => {
            const mx2 = X + w - 46 + k * 14, my2 = Y + 10;
            const got = (m & md[1]);
            R(mx2, my2, 12, 14, got ? md[2] : 0);
            R(mx2, my2, 12, 1, got ? 15 : 8); R(mx2, my2 + 13, 12, 1, got ? 8 : 8);
            R(mx2, my2, 1, 14, got ? 15 : 8); R(mx2 + 11, my2, 1, 14, got ? 8 : 8);
            txt(md[0], mx2 + 6, my2 + 3, got ? 0 : 8, 'bold 9px monospace', 'center');
          });
        });
        txt('C finished    P in par    * in par with nothing spilled', 210, 286, 10, '9px monospace', 'center');
        txt('click a level   ·   1-9 pour   ·   U undo   ·   R reset   ·   ESC menu',
            210, 302, 8, '9px monospace', 'center');
      }

      function drawBook(t) {
        R(0, 0, 420, 320, 0); wash(0, 0, 420, 320, 8, 3);
        txt('THE LEDGER', 210, 8, 14, 'bold 15px monospace', 'center');
        const done = CK_ACH.filter(a => SV.ach[a.id]).length;
        txt(done + ' / ' + CK_ACH.length + '   ·   $' + SV.money.toLocaleString() +
            '   ·   ' + SV.ruins + ' ruined', 210, 26, 10, '10px monospace', 'center');
        CK_ACH.forEach((a, i) => {
          const on = !!SV.ach[a.id];
          const X = 12 + (i % 2) * 200, Y = 44 + Math.floor(i / 2) * 25;
          R(X, Y, 194, 22, 0);
          R(X, Y, 2, 22, on ? 14 : 8);
          txt(on ? a.n : '???', X + 8, Y + 2, on ? 14 : 8, '10px monospace');
          txt(on ? a.d : '', X + 8, Y + 12, 7, '9px monospace');
        });
      }

      /* ---- 33.13 sound ----------------------------------------------------- */
      const sfx = {
        pour(c) {
          const f = 180 + (c % 8) * 40;
          Snd.noise(260, { freq: 900 + c * 60, q: 1.1, vol: 0.05 });
          Snd.tone(f, 200, { type: 'triangle', to: f * 1.5, vol: 0.03 });
        },
        tick() { Snd.tone(1200, 14, { type: 'square', vol: 0.012 }); },
        thud() { Snd.noise(80, { freq: 260, q: 0.7, vol: 0.06 }); Snd.tone(90, 130, { type: 'triangle', to: 52, vol: 0.05 }); },
        plate() { [740, 988, 1319].forEach((f, i) => Snd.tone(f, 120, { type: 'triangle', delay: i * 0.04, vol: 0.03 })); },
        stage(n) { const b = [523, 659, 784][n - 1] || 523;
                   [b, b * 1.25, b * 1.5].forEach((f, i) => Snd.tone(f, 220, { type: 'triangle', delay: i * 0.06, vol: 0.04 })); },
        reveal() { [392, 523, 622, 784].forEach((f, i) => Snd.tone(f, 260, { type: 'square', delay: i * 0.07, vol: 0.03 })); },
        ruin() {
          Snd.noise(600, { freq: 400, q: 0.4, vol: 0.11 });
          Snd.tone(147, 700, { type: 'sawtooth', to: 44, vol: 0.06 });
          [330, 262, 220].forEach((f, i) => Snd.tone(f, 400, { type: 'square', delay: i * 0.1, vol: 0.03 }));
        },
        win() {
          [294, 370, 440, 587, 740, 880].forEach((f, i) =>
            Snd.tone(f, 900, { type: 'triangle', delay: i * 0.1, vol: 0.045 }));
          Snd.noise(400, { freq: 2600, q: 0.9, vol: 0.04, delay: 0.2 });
        },
        ach() { [523, 784, 1046].forEach((f, i) => Snd.tone(f, 300, { type: 'triangle', delay: i * 0.08, vol: 0.035 })); },
        temp(up) {
          if (up) { Snd.noise(500, { freq: 700, q: 0.5, vol: 0.06 }); Snd.tone(120, 500, { type: 'sawtooth', to: 300, vol: 0.035 }); }
          else    { Snd.noise(420, { freq: 2400, q: 0.8, vol: 0.045 }); Snd.tone(500, 480, { type: 'sine', to: 160, vol: 0.03 }); }
        },
        reset() { Snd.noise(220, { freq: 1300, q: 0.6, vol: 0.05 }); Snd.tone(392, 200, { type: 'triangle', to: 196, vol: 0.03 }); },
        undo()  { Snd.tone(523, 90, { type: 'triangle', to: 392, vol: 0.03 }); },
        empty() { Snd.tone(120, 90, { type: 'square', vol: 0.02 }); },
        siren() { Snd.tone(660, 400, { type: 'sawtooth', to: 440, vol: 0.02 }); },
        page()  { Snd.noise(120, { freq: 1500, q: 0.5, vol: 0.03 }); },
      };

      /* ---- 33.14 the score ------------------------------------------------- */
      /* real instruments on the studio (score.js), played by music.js on the game's own channel: the tune follows the bench, the two
         layers come in as it goes wrong, and a won or a ruined batch gets a stinger over the top */
      const Song = createCookMusic({ studio: () => Studio, playing: () => alive && CRT.on && Vol.mus > 0 });

      /* ---- the shed: the tab the owner's blueprint opens (apps/cook/shed.js). It is given the page's own painters and the voice, and leaves by way of the menu. */
      const shed = createShed({ R, wash, txt, g: () => g, Snd, blip, playBlip, wrapTo, calm: typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches, leave: () => { mode = 'menu'; sfx.page(); refresh(); } });
      const offGift = onGiven(() => refresh());                     /* the SHED button appears the moment the blueprint is given */

      /* ---- 33.15 input ----------------------------------------------------- */
      function refresh() {
        const inShed = mode === 'shed', on = mode === 'play' || (inShed && shed.playing());
        bUndo.disabled = !(mode === 'play' || (inShed && shed.canUndo())); bReset.disabled = !on;
        bShed.style.display = gifts().has('blueprint') ? '' : 'none';
        bHeat.style.display = (L && L.heat && !inShed) ? '' : 'none';
        bCool.style.display = (L && L.cool && !inShed) ? '' : 'none';
        if (L && mode === 'play') {
          bHeat.textContent = 'HEAT + (' + st.heat + ')';
          bCool.textContent = 'COOL - (' + st.cool + ')';
          info.textContent = L.n + '  ·  pours ' + st.steps + '/' + L.par +
            (L.cps ? '  ·  stages ' + st.cp + '/' + L.cps : '') +
            '  ·  best ' + (SV.best[L.id] ? SV.best[L.id].toFixed(1) + '%' : '—');
        } else if (inShed) info.textContent = shed.info();
        else if (mode === 'menu') info.textContent = 'pick a level';
        else if (mode === 'book') info.textContent = 'the ledger';
        else info.textContent = 'space to go on';
      }
      cv.addEventListener('mousemove', ev => {
        const sx = 420 / cv.clientWidth, sy = 320 / cv.clientHeight;
        if (mode === 'shed') { shed.mouse('move', ev.offsetX * sx, ev.offsetY * sy); return; }
        hover = mode === 'play' ? bottleAt(ev.offsetX * sx, ev.offsetY * sy) : -1;
      });
      cv.addEventListener('mouseleave', () => { hover = -1; });
      cv.addEventListener('mousedown', ev => {
        const sx = 420 / cv.clientWidth, sy = 320 / cv.clientHeight;
        const mx = ev.offsetX * sx, my = ev.offsetY * sy;
        if (mode === 'shed') { shed.mouse('down', mx, my); refresh(); return; }
        if (mode === 'story') { skipStory(); return; }
        if (mode === 'won') { if (kid && kid.hold) { kidNext(); return; } nextAfterWin(); return; }
        if (mode === 'book') { mode = 'menu'; sfx.page(); refresh(); return; }
        if (mode === 'menu') {
          for (let i = 0; i < 10; i++) {
            const X = 20 + (i % 2) * 194, Y = 54 + Math.floor(i / 2) * 38;
            if (mx > X && mx < X + 186 && my > Y && my < Y + 34 && i + 1 <= SV.lv) {
              resets = 0; lvRuins = 0; undos = 0; nudged = 0; startLevel(i + 1); sfx.page(); return;
            }
          }
          if (CK_LV[10] && knocksOpen() && mx > 20 && mx < 400 &&
              my > 54 + 5 * 38 && my < 54 + 5 * 38 + 34) {
            resets = 0; lvRuins = 0; undos = 0; nudged = 0; startLevel(11); sfx.page();
          }
          return;
        }
        const b = bottleAt(mx, my);
        if (b >= 0) pour(b);
      });
      /* the cards a bench owes you are read before it, one click each; then the bench begins */
      function beginBench(n) {
        const q = owed(n, SV.story);
        if (!q.length) { resets = 0; lvRuins = 0; undos = 0; nudged = 0; startLevel(n); return; }
        storyQ = q.slice(1); storyIx = q[0]; storyThen = n; storyT = 0; mode = 'story';
        SV.story[storyIx] = 1; save();
      }
      function skipStory() {
        if (storyT < 2.2) { storyT = 2.3; return; }
        sfx.page();
        if (storyIx >= CK_STORY.length) { mode = 'menu'; refresh(); return; }
        if (storyQ.length) { storyIx = storyQ.shift(); SV.story[storyIx] = 1; save(); storyT = 0; return; }
        resets = 0; lvRuins = 0; undos = 0; nudged = 0; startLevel(storyThen);
      }
      function nextAfterWin() {
        if (L.id >= 10) { storyIx = CK_STORY.length; storyQ = []; storyT = 0; mode = 'story'; ach('a22'); Song.want('fall'); }
        else beginBench(L.id + 1);
        refresh();
      }
      cv.addEventListener('keydown', ev => {
        const k = ev.key;
        if (mode === 'shed') { if (shed.key(k, ev)) ev.preventDefault(); refresh(); return; }
        if (k === ' ' || k === 'Enter') { ev.preventDefault();
          if (mode === 'story') skipStory(); else if (mode === 'won') { if (kid && kid.hold) kidNext(); else nextAfterWin(); } return; }
        if (mode !== 'play') { if (k === 'Escape') { mode = 'menu'; refresh(); } return; }
        if (k >= '1' && k <= '9') { ev.preventDefault(); pour(+k - 1); }
        if (k === 'u' || k === 'U') undo();
        if (k === 'r' || k === 'R') reset();
        if (k === 'h' || k === 'H') op('heat');
        if (k === 'c' || k === 'C') op('cool');
        if (k === 'Escape') { mode = 'menu'; sfx.page(); refresh(); }
      });
      bUndo.addEventListener('mousedown', ev => { ev.stopPropagation(); if (mode === 'shed') { shed.undo(); refresh(); } else undo(); });
      bReset.addEventListener('mousedown', ev => { ev.stopPropagation(); if (mode === 'shed') { shed.reset(); refresh(); } else reset(); });
      bShed.addEventListener('mousedown', ev => { ev.stopPropagation(); mode = 'shed'; shed.enter(); sfx.page(); refresh(); cv.focus(); });
      bHeat.addEventListener('mousedown', ev => { ev.stopPropagation(); op('heat'); });
      bCool.addEventListener('mousedown', ev => { ev.stopPropagation(); op('cool'); });
      bMenu.addEventListener('mousedown', ev => { ev.stopPropagation(); mode = 'menu'; sfx.page(); refresh(); });
      bBook.addEventListener('mousedown', ev => { ev.stopPropagation(); mode = 'book'; sfx.page(); refresh(); });

      /* ---- 33.16 the loop --------------------------------------------------- */
      let raf = null, last = 0, acc = 0, shedTick = -1;
      function frame(ts) {
        if (!alive || !document.body.contains(cv)) {
          alive = false; Song.stop(); save();
          window.removeEventListener('vfs-changed', wallHandler);
          return;
        }
        raf = requestAnimationFrame(frame);
        if (!last) last = ts;
        let dt = (ts - last) / 1000; last = ts;
        if (dt > 0.3) dt = 0.3;
        acc += dt;
        if (acc < 1 / 30) return;
        const step = acc; acc = 0;
        if (!CRT.on) { Song.stop(); return; }
        Song.sync();
        const t = ts / 1000;

        if (shake > 0) shake = Math.max(0, shake - step * 20);
        if (flash > 0) flash = Math.max(0, flash - step * 2.2);
        if (tempFlash > 0) tempFlash = Math.max(0, tempFlash - step * 1.4);
        if (storyT < 99) storyT += step;
        /* Nobody should be stuck in silence. He starts with the cheapest
           nudge and only ever gets as far as "count it" — never the answer,
           because the answer is the entire point of being here. */
        if (mode === 'play' && !anim && deadT <= 0) {
          idleT += step;
          if (idleT > 26) {
            idleT = 0;
            const n = lvRuins + resets;
            if (n >= 4) nudged = L.id;
            say(n >= 4 ? 'stuck3' : n >= 2 ? 'stuck2' : st.steps === 0 ? 'stuck1' : 'idle');
          }
        }
        if (kid) { kid.t += step; voiceKid(); if (!kid.hold && kid.t > kid.life) kid = null; }
        if (winT > 0 || (mode === 'won' && !kid)) winT += step;
        if (deadT > 0) { deadT -= step; if (deadT <= 0) { const keep = known; startLevel(L.id); known = keep; resets++; } }

        /* the pour, travelling */
        if (anim) {
          anim.t += step;
          const want = anim.t / 0.07;
          if (Math.floor(want) > Math.floor(anim.k)) sfx.tick();
          anim.k = want;
          const stepsN = anim.path.length || 1;
          if (anim.k >= stepsN) land();
        }
        /* the music leans forward when the sweep is close or the pours run out */
        if (mode === 'play' && L) {
          const tight = L.sweep && Math.abs(st.sweep - st.x) <= 3;
          const late = st.steps > L.par;
          Song.setHeat(tight ? 2 : late ? 1 : 0);
        } else Song.setHeat(0);

        g.save();
        g.scale(RES, RES);
        if (shake > 0.05) g.translate(Math.round((Math.random() - 0.5) * shake * 2),
                                      Math.round((Math.random() - 0.5) * shake * 2));
        if (mode === 'story') drawStory(t);
        else if (mode === 'shed') { shed.draw(t, step); if (Math.floor(t * 8) !== shedTick) { shedTick = Math.floor(t * 8); refresh(); } }
        else if (mode === 'menu') drawMenu(t);
        else if (mode === 'book') drawBook(t);
        else {
          drawBoard(t); drawTop(); drawShelf(t); if (!(mode === 'won' && winT > 0)) drawKid();
          if (mode === 'won' && winT > 0) {
            wash(0, 0, 420, 320, 0, 9);
            const over = Math.max(0, st.steps - L.par);
            const pur = Math.max(20, 99.1 - over * 2.5 - Math.min(8, resets) * 0.8);
            R(50, 90, 320, 140, 0);
            R(50, 90, 320, 2, 11); R(50, 228, 320, 2, 11); R(50, 90, 2, 140, 11); R(368, 90, 2, 140, 11);
            txt('BATCH COMPLETE', 210, 104, 15, 'bold 15px monospace', 'center');
            const shown = Math.min(pur, winT * 60);
            txt(shown.toFixed(1) + '%', 210, 128, pur >= 99 ? 11 : 14, 'bold 30px monospace', 'center');
            txt('purity', 210, 162, 7, '10px monospace', 'center');
            txt(st.steps + ' pours, par ' + L.par + (resets ? ', ' + resets + ' resets' : ''),
                210, 180, 7, '10px monospace', 'center');
            txt('$' + Math.round(pur * 1000 * L.id).toLocaleString(), 210, 196, 10, '12px monospace', 'center');
            if (winT > 1.4) txt('SPACE', 210, 212, Math.floor(t * 2) % 2 ? 11 : 7, '10px monospace', 'center');
          }
        }

        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          p.t += step; p.x += p.vx * step; p.y += p.vy * step; p.vy += 220 * step;
          if (p.t > p.life) { parts.splice(i, 1); continue; }
          R(p.x, p.y, 3, 3, p.t > p.life * 0.7 ? 8 : p.c);
        }
        for (let i = rings.length - 1; i >= 0; i--) {
          const r = rings[i]; r.t += step;
          if (r.t > r.life) { rings.splice(i, 1); continue; }
          const rad = Math.round(r.r1 * (r.t / r.life));
          for (let a = 0; a < 36; a++) {
            const an = a / 36 * 6.28318;
            R(r.x + Math.cos(an) * rad, r.y + Math.sin(an) * rad, 2, 2, r.c);
          }
        }
        for (let i = floats.length - 1; i >= 0; i--) {
          const f = floats[i]; f.t += step;
          if (f.t > 2.4) { floats.splice(i, 1); continue; }
          const k = f.t / 2.4;
          const x = k < 0.12 ? -420 + (k / 0.12) * 420 : k > 0.88 ? ((k - 0.88) / 0.12) * 420 : 0;
          R(x, 244, 420, 2, f.col); R(x, 288, 420, 2, f.col);
          R(x, 246, 420, 42, 0); wash(x, 246, 420, 42, f.col, 3);
          R(x + 40, 250, 340, 34, 0);
          txt(f.txt, x + 210, 252, f.col, 'bold 15px monospace', 'center');
          if (f.sub) txt(f.sub, x + 210, 270, 15, '10px monospace', 'center');
        }
        if (flash > 0.01) wash(0, 0, 420, 320, flashCol, Math.round(flash * 12));
        g.restore();
      }

      load();
      if (SV.lv > 1 || SV.seen.c1) { mode = 'menu'; L = CK_LV[0]; }
      else { SV.seen.c1 = 1; beginBench(1); Song.want('desert'); }
      window.__ckDebug = { win: () => win(), start: n => startLevel(n), get shed() { return shed.state(); }, get mode() { return mode; }, get winT() { return winT; }, get kid() { return kid; } };
      refresh();
      setTimeout(() => cv.focus(), 60);
      raf = requestAnimationFrame(frame);

      /* the window closing is seen the moment it happens, not on the next poll */
      whenGone(cv, () => { alive = false; Song.stop(); save(); tro.stop(); offGift(); if (raf) cancelAnimationFrame(raf); });
    }
  });
  }
};