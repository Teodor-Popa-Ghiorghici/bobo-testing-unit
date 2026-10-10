import { createWindow, raise, sysDialog, toast } from '../../kernel/wm.js';
import { Snd } from '../../kernel/snd.js';
import { Cos } from '../../kernel/cos.js';
import { fs as vfs } from '../../kernel/vfs.js';
import { lampDip, CRT, Vol } from '../../kernel/hardware.js';
import { cardsPay, winPay, dealPay } from './pay.js';
import { whenGone } from '../lifecycle.js';
import { createSolitaireMusic } from './music.js';
import { makeCards, LANES, RANK_TXT, CW, CH, SUIT_MODES, SUIT_MODE_LABEL } from './cards.js';
import * as tro from './trophy_calls.js';
import { BASE_BACKS, ITEMS, bySub, drawBackArt, drawTable, drawSlate, BACK_BASE, winFx } from './cosmetics.js';


const SOL_KEY = 'templeos.solitaire';
const SOL_BACKS = ['HEXTECH', 'SILK', 'RUNE'];
/* what the trophies have given: the backs, tables and endings you own (Dave's SOLITAIRE shelf), and which you wear */
const ownedOf = sub => bySub(sub).filter(i => window.Cos && window.Cos.has('solitaire', i.id));
const backIds = () => BASE_BACKS.map(b => b.id).concat(ownedOf('back').map(i => i.id));
const backId = () => { const l = backIds(), id = Solitaire.st.backId; return l.indexOf(id) >= 0 ? id : BASE_BACKS[Solitaire.st.back % 3].id; };
const nameOfBack = id => (BASE_BACKS.find(b => b.id === id) || ITEMS.find(i => i.id === id) || { name: id }).name;
const wornOf = (sub, key) => { const id = Solitaire.st[key]; return id && ownedOf(sub).some(i => i.id === id) ? id : null; };
const Solitaire = {
  st: null,
  boot() {
    let raw = localStorage.getItem(SOL_KEY);
    this.st = raw ? JSON.parse(raw) : { won: 0, played: 0, bestMoves: 0, back: 0 };
    if (this.st.suitMode == null) this.st.suitMode = 4;
  },
  save() { localStorage.setItem(SOL_KEY, JSON.stringify(this.st)); }
};

Solitaire.boot();

window.Solitaire = Solitaire;

let solWin = null;
export default {
  open() {
  if (solWin && document.body.contains(solWin.win)) { raise(solWin.win); return; }

  const W = 880, H = 600;
  const STOCK = { x: 14, y: 14 }, WASTE = { x: 106, y: 14 };
  const FOUND = [0, 1, 2, 3].map(i => ({ x: 434 + i * 108, y: 14 }));
  const TAB = [0, 1, 2, 3, 4, 5, 6].map(i => ({ x: 14 + i * 108, y: 150 }));
  const FAN_UP = 26, FAN_DN = 12;

  let cv, g, info;
  let stock, waste, found, tab, moves, dealing, won, drag, bounce, redeals, tally = tro.newTally();
  let raf = null, mx = 0, my = 0, autoT = null, payShown = 0, payTarget = 0, settled = true;

  const made = createWindow({
    kind: 'app', title: 'SOLITAIRE.EXE', w: 900, h: 620, appId: 'solitaire',
    build: body => {
      const pane = document.createElement('div');
      pane.className = 'gamepane solpane';
      cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      cv.className = 'gamecv solcv';
      pane.appendChild(cv);
      const bar = document.createElement('div');
      bar.className = 'appbar';
      const nb = document.createElement('button');
      nb.className = 'appbtn';
      nb.textContent = 'NEW DEAL';
      nb.addEventListener('mousedown', ev => { ev.stopPropagation(); Snd.click(); deal(); });
      const bb = document.createElement('button');
      bb.className = 'appbtn';
      const setBack = () => { bb.textContent = 'BACK: ' + nameOfBack(backId()); };
      bb.addEventListener('mousedown', ev => {
        ev.stopPropagation();
        const l = backIds(), id = l[(l.indexOf(backId()) + 1) % l.length];
        Solitaire.st.backId = id;
        const bi = BASE_BACKS.findIndex(b => b.id === id); if (bi >= 0) Solitaire.st.back = bi;
        Solitaire.save(); Snd.click(); setBack();
      });
      setBack();
      /* the table and the ending of a win: only once a trophy has given you one (otherwise the button says where they come from) */
      const cycle = (btn, sub, key, label) => {
        const set = () => { const w = wornOf(sub, key), it = ITEMS.find(i => i.id === w); btn.textContent = label + ': ' + (it ? it.name : 'STANDARD'); };
        btn.className = 'appbtn';
        btn.addEventListener('mousedown', ev => {
          ev.stopPropagation(); Snd.click();
          const l = [null].concat(ownedOf(sub).map(i => i.id));
          if (l.length === 1) { toast('EARN ' + label + 'S WITH SOLITAIRE TROPHIES. DAVE KEEPS THEM ON THE SOLITAIRE SHELF.'); return; }
          Solitaire.st[key] = l[(l.indexOf(wornOf(sub, key)) + 1) % l.length]; Solitaire.save(); set();
        });
        set();
        return btn;
      };
      const tb = cycle(document.createElement('button'), 'table', 'tableId', 'TABLE');
      const wb = cycle(document.createElement('button'), 'win', 'winId', 'WIN');
      const sb = document.createElement('button');
      sb.className = 'appbtn';
      const setSuit = () => { sb.textContent = SUIT_MODE_LABEL[Solitaire.st.suitMode]; };
      sb.addEventListener('mousedown', ev => {
        ev.stopPropagation();
        const i = SUIT_MODES.indexOf(Solitaire.st.suitMode);
        Solitaire.st.suitMode = SUIT_MODES[(i + 1) % SUIT_MODES.length];
        Solitaire.save(); Snd.click(); setSuit();
      });
      setSuit();
      info = document.createElement('span');
      info.className = 'godword';
      bar.appendChild(nb); bar.appendChild(bb); bar.appendChild(tb); bar.appendChild(wb); bar.appendChild(sb); bar.appendChild(info);
      body.appendChild(pane); body.appendChild(bar);
    }
  });
  solWin = made;
  g = cv.getContext('2d');
  if (g) g.imageSmoothingEnabled = false;
  const { drawCard, roundRect } = makeCards(g, { back: () => Solitaire.st.back, backId, suitMode: () => Solitaire.st.suitMode });

  /* ---- the deal --------------------------------------------------------- */
  /* the cards that are home are paid as the deal ends, whichever way it ends: a win (checkWon), a new deal, or the window closing */
  const home = () => found ? found.reduce((a, f) => a + f.length, 0) : 0;
  function settle() {
    if (settled || won) { settled = true; return; }
    settled = true;
    tro.abandoned(tally, moves);
    const n = home();
    if (n > 0 && window.Economy) { window.Economy.earn(dealPay(n, moves, false), 'SOLITAIRE: ' + n + ' CARDS HOME', { game: 'solitaire' }); setTimeout(() => Snd.coin(), 150); }
  }
  function deal() {
    settle();
    const cards = [];
    for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) cards.push({ r: r, s: s, up: false, a: 0, x: 0, y: 0 });
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = cards[i]; cards[i] = cards[j]; cards[j] = t;
    }
    stock = cards; waste = []; found = [[], [], [], []]; tab = [[], [], [], [], [], [], []];
    moves = 0; won = false; drag = null; bounce = null; redeals = 0; payShown = 0; payTarget = 0; settled = false; tally = tro.newTally();
    clearInterval(autoT);
    const now = performance.now();
    let k = 0;
    for (let col = 0; col < 7; col++) {
      for (let row = col; row < 7; row++) {
        const c = stock.pop();
        c.up = (row === col);
        c.a = now + k * 25 + 120;
        tab[row].push(c);
        k++;
      }
    }
    dealing = now + k * 25 + 300;
    Snd.shuffle();
    for (let i = 0; i < k; i++) setTimeout(() => Snd.flick(), i * 25 + 120);
    Solitaire.st.played++;
    Solitaire.save();
  }

  /* ---- geometry --------------------------------------------------------- */
  function slotOf(pile, ix) {
    if (pile === 'stock') return { x: STOCK.x, y: STOCK.y };
    if (pile === 'waste') return { x: WASTE.x + Math.min(ix, 2) * 22, y: WASTE.y };
    if (pile === 'found') return { x: FOUND[ix].x, y: FOUND[ix].y };
    return { x: TAB[ix].x, y: TAB[ix].y };
  }
  function tabY(col, row) {
    let y = TAB[col].y;
    for (let i = 0; i < row; i++) y += tab[col][i].up ? FAN_UP : FAN_DN;
    return y;
  }
  function cardPos(c, home) {
    const now = performance.now();
    if (c.a && now < c.a) {
      const t = Math.max(0, Math.min(1, 1 - (c.a - now) / 260));
      return { x: STOCK.x + (home.x - STOCK.x) * t, y: STOCK.y + (home.y - STOCK.y) * t, flying: true };
    }
    return { x: home.x, y: home.y, flying: false };
  }

  /* ---- rules ------------------------------------------------------------ */
  function canFound(c, f) {
    const p = found[f];
    if (!p.length) return c.r === 1 && f === c.s;
    const t = p[p.length - 1];
    return t.s === c.s && c.r === t.r + 1;
  }
  function canTab(c, col) {
    const p = tab[col];
    if (!p.length) return c.r === 13;
    const t = p[p.length - 1];
    if (!t.up) return false;
    return LANES[t.s].red !== LANES[c.s].red && c.r === t.r - 1;
  }
  function autoReady() {
    if (won || dealing > performance.now()) return false;
    if (stock.length || waste.length) return false;
    for (let i = 0; i < 7; i++) for (const c of tab[i]) if (!c.up) return false;
    return found.reduce((a, f) => a + f.length, 0) < 52;
  }
  function checkWon() {
    if (found.reduce((a, f) => a + f.length, 0) < 52) return;
    won = true;
    payTarget = dealPay(52, moves, true); settled = true;
    Solitaire.st.won++;
    if (!Solitaire.st.bestMoves || moves < Solitaire.st.bestMoves) Solitaire.st.bestMoves = moves;
    Solitaire.save();
    tro.won(tally, moves, redeals, BASE_BACKS.some(b => b.id === backId()) ? Solitaire.st.back % 3 : -1);
    Snd.fanfare();
    window.Economy.earn(payTarget, 'SOLITAIRE: WON IN ' + moves + ' MOVES', { game: 'solitaire' });
    setTimeout(() => Snd.coin(), 400);
    /* the cascade everyone who has ever used an old computer expects */
    bounce = [];
    for (let f = 3; f >= 0; f--) {
      found[f].slice().reverse().forEach((c, i) => {
        bounce.push({ c: c, x: FOUND[f].x, y: FOUND[f].y, vx: 0, vy: 0, age: 0, wait: (3 - f) * 52 + i * 4, live: false });
      });
    }
  }

  /* ---- input ------------------------------------------------------------ */
  function pick(px, py) {
    /* tableau, topmost column first, from the bottom card up */
    for (let col = 6; col >= 0; col--) {
      const p = tab[col];
      for (let row = p.length - 1; row >= 0; row--) {
        const c = p[row];
        if (!c.up) break;
        const y = tabY(col, row);
        const h = (row === p.length - 1) ? CH : (p[row + 1].up ? FAN_UP : FAN_DN);
        if (px >= TAB[col].x && px <= TAB[col].x + CW && py >= y && py <= y + h) {
          return { pile: 'tab', ix: col, row: row };
        }
      }
    }
    for (let f = 0; f < 4; f++) {
      if (px >= FOUND[f].x && px <= FOUND[f].x + CW && py >= FOUND[f].y && py <= FOUND[f].y + CH && found[f].length)
        return { pile: 'found', ix: f, row: found[f].length - 1 };
    }
    if (waste.length) {
      const n = Math.min(waste.length, 3);
      const wx = WASTE.x + (n - 1) * 22;
      if (px >= wx && px <= wx + CW && py >= WASTE.y && py <= WASTE.y + CH)
        return { pile: 'waste', ix: 0, row: waste.length - 1 };
    }
    if (px >= STOCK.x && px <= STOCK.x + CW && py >= STOCK.y && py <= STOCK.y + CH)
      return { pile: 'stock', ix: 0, row: -1 };
    return null;
  }

  function drawThree() {
    if (!stock.length) {
      if (!waste.length) return;
      while (waste.length) { const c = waste.pop(); c.up = false; stock.push(c); }
      redeals++;
      moves++;
      Snd.shuffle();
      return;
    }
    for (let i = 0; i < 3 && stock.length; i++) {
      const c = stock.pop();
      c.up = true;
      c.a = 0;
      waste.push(c);
      Snd.flick();
    }
    moves++;
  }

  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('mousemove', ev => {
    const r = cv.getBoundingClientRect();
    mx = (ev.clientX - r.left) * (W / r.width);
    my = (ev.clientY - r.top) * (H / r.height);
  });

  cv.addEventListener('mousedown', ev => {
    ev.stopPropagation();
    const r = cv.getBoundingClientRect();
    const px = (ev.clientX - r.left) * (W / r.width);
    const py = (ev.clientY - r.top) * (H / r.height);
    if (dealing > performance.now()) {                  /* skip the deal */
      dealing = 0;
      const flat = [].concat.apply([], tab);
      flat.forEach(c => { c.a = 0; });
      return;
    }
    if (won) return;

    /* the auto-complete button, when the board is trivially solvable */
    if (autoReady() && px > W - 190 && px < W - 14 && py > H - 40 && py < H - 8) {
      Snd.click(); tally.auto = true;
      autoT = setInterval(() => {
        let did = false;
        for (let col = 0; col < 7 && !did; col++) {
          const p = tab[col];
          if (!p.length) continue;
          const c = p[p.length - 1];
          for (let f = 0; f < 4; f++) {
            if (canFound(c, f)) { p.pop(); found[f].push(c); moves++; Snd.snap(); did = true; break; }
          }
        }
        if (!did) { clearInterval(autoT); checkWon(); }
      }, 55);
      return;
    }

    const h = pick(px, py);
    if (!h) return;
    if (h.pile === 'stock') { drawThree(); Snd.click(); return; }

    if (ev.detail === 2) {                              /* double click sends home */
      const src = h.pile === 'waste' ? waste : h.pile === 'found' ? found[h.ix] : tab[h.ix];
      if (h.row !== src.length - 1) return;
      const c = src[src.length - 1];
      for (let f = 0; f < 4; f++) {
        if (canFound(c, f)) {
          src.pop(); found[f].push(c); moves++; Snd.snap();
          flipUnder(h);
          checkWon();
          return;
        }
      }
      return;
    }

    const src = h.pile === 'waste' ? waste : h.pile === 'found' ? found[h.ix] : tab[h.ix];
    const taken = src.slice(h.row);
    if (!taken.length || !taken[0].up) return;
    if (h.pile !== 'tab' && h.row !== src.length - 1) return;
    const home = h.pile === 'tab' ? { x: TAB[h.ix].x, y: tabY(h.ix, h.row) } : slotOf(h.pile, h.pile === 'waste' ? Math.min(waste.length - 1, 2) : h.ix);
    drag = { cards: taken, from: h, ox: px - home.x, oy: py - home.y, x: px, y: py, sx: px, sy: py };
    src.length = h.row;
    Snd.grab();
  });

  function flipUnder(h) {
    if (h.pile !== 'tab') return;
    const p = tab[h.ix];
    if (p.length && !p[p.length - 1].up) { p[p.length - 1].up = true; Snd.flick(); }
  }

  const onUp = () => {
    if (!drag) return;
    const c = drag.cards[0];
    const x = drag.x - drag.ox, y = drag.y - drag.oy;
    let placed = false;
    /* foundations take one card at a time */
    if (drag.cards.length === 1) {
      for (let f = 0; f < 4; f++) {
        if (Math.abs(x - FOUND[f].x) < 60 && Math.abs(y - FOUND[f].y) < 70 && canFound(c, f)) {
          found[f].push(c); placed = true; break;
        }
      }
    }
    if (!placed) {
      for (let col = 0; col < 7; col++) {
        const ty = tab[col].length ? tabY(col, tab[col].length - 1) : TAB[col].y;
        if (Math.abs(x - TAB[col].x) < 60 && y > ty - 80 && y < ty + 120 && canTab(c, col)) {
          drag.cards.forEach(k => tab[col].push(k));
          placed = true;
          break;
        }
      }
    }
    if (placed) {
      moves++; tro.moved(drag.cards.length);
      Snd.snap();
      flipUnder(drag.from);
      checkWon();
    } else {
      /* invalid returns to where it came from. A card that was only clicked,
         not carried, goes back silently — the second half of a double click
         must not sound like a mistake. */
      const back = drag.from.pile === 'waste' ? waste : drag.from.pile === 'found' ? found[drag.from.ix] : tab[drag.from.ix];
      drag.cards.forEach(k => back.push(k));
      if (Math.abs(drag.x - drag.sx) + Math.abs(drag.y - drag.sy) > 6) Snd.err();
    }
    drag = null;
  };
  window.addEventListener('mouseup', onUp);

  /* ---- the cards -------------------------------------------------------- */

  function emptySlot(x, y, label) {
    g.strokeStyle = 'rgba(200,214,232,0.20)';
    g.lineWidth = 1;
    roundRect(x, y, CW, CH, 5);
    g.stroke();
    if (label != null) {
      g.fillStyle = 'rgba(200,214,232,0.16)';
      g.font = '13px Georgia, serif';
      g.textAlign = 'center';
      g.fillText(label, x + CW / 2, y + CH / 2 + 4);
      g.textAlign = 'left';
    }
  }

  function paint() {
    if (!document.body.contains(made.win)) {
      raf = null; clearInterval(autoT); solWin = null;
      window.removeEventListener('mouseup', onUp);
      return;
    }
    raf = requestAnimationFrame(paint);
    const now = performance.now();
    music(now);

    /* the table: slate, with a grid pressed into it */
    { const tw = wornOf('table', 'tableId'); if (!tw || !drawTable(g, tw, W, H, now / 16)) drawSlate(g, W, H); }

    emptySlot(STOCK.x, STOCK.y, stock.length ? null : (waste.length ? 'REDEAL' : ''));
    emptySlot(WASTE.x, WASTE.y, null);
    FOUND.forEach((f, i) => emptySlot(f.x, f.y, LANES[i].name));
    TAB.forEach(t => emptySlot(t.x, t.y, null));

    /* stock, as a thickness of cards */
    if (stock.length) {
      const n = Math.min(4, Math.ceil(stock.length / 8));
      for (let i = n; i >= 0; i--) drawCard({ up: false }, STOCK.x + i, STOCK.y - i, false);
    }
    /* waste, three fanned */
    const wn = Math.min(waste.length, 3);
    for (let i = 0; i < wn; i++) {
      const c = waste[waste.length - wn + i];
      drawCard(c, WASTE.x + i * 22, WASTE.y, false);
    }
    for (let f = 0; f < 4; f++) {
      const p = found[f];
      if (!p.length) continue;
      if (bounce) continue;
      drawCard(p[p.length - 1], FOUND[f].x, FOUND[f].y, false);
    }
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row < tab[col].length; row++) {
        const c = tab[col][row];
        const home = { x: TAB[col].x, y: tabY(col, row) };
        const p = cardPos(c, home);
        drawCard(c, Math.round(p.x), Math.round(p.y), false);
      }
    }

    if (drag) {
      drag.x = mx; drag.y = my;
      drag.cards.forEach((c, i) => drawCard(c, Math.round(drag.x - drag.ox), Math.round(drag.y - drag.oy + i * FAN_UP), i === 0));
    }

    /* the auto-complete offer */
    const offer = autoReady();
    tro.watch(tally, found, offer);
    if (offer) {
      g.fillStyle = '#1b2740';
      g.fillRect(W - 190, H - 40, 176, 32);
      g.strokeStyle = '#7fe0ff';
      g.lineWidth = 2;
      g.strokeRect(W - 190, H - 40, 176, 32);
      g.fillStyle = '#d8f0ff';
      g.font = '20px "VT323", monospace';
      g.textAlign = 'center';
      g.fillText('SEND THEM ALL HOME', W - 102, H - 18);
      g.textAlign = 'left';
    }

    /* the win: fifty-two cards down the glass */
    if (bounce) {
      let anyLive = false;
      const fxId = wornOf('win', 'winId'), fx = fxId ? winFx(fxId) : null;
      bounce.forEach((b, bi) => {
        if (b.wait > 0) { b.wait -= 1; return; }
        if (fx) {
          if (!b.live) { b.live = true; b.slot = (bi % 13) * 2; fx.launch(b, bi, bounce.length, W, H); }
          b.age++;
          if (!fx.step(b, W, H)) return;
          anyLive = true;
          if (fx.deco) fx.deco(g, b);
          drawCard(b.c, Math.round(b.x), Math.round(b.y), false);
          return;
        }
        if (!b.live) {
          b.live = true;
          /* one direction per card, hard enough to clear the table */
          b.vx = (Math.random() < 0.5 ? -1 : 1) * (2.2 + Math.random() * 3.4);
          b.vy = -(2 + Math.random() * 3);
        }
        b.vy += 0.42;
        b.x += b.vx; b.y += b.vy;
        if (b.y > H - CH) { b.y = H - CH; b.vy = -b.vy * 0.72; if (Math.abs(b.vy) < 1.4) b.vy = -(4 + Math.random() * 3); }
        if (b.x > W || b.x < -CW) return;
        anyLive = true;
        drawCard(b.c, Math.round(b.x), Math.round(b.y), false);
      });
      if (fx && fx.overlay) fx.overlay(g, W, H, bounce.reduce((a, b) => Math.max(a, b.age), 0));
      if (!anyLive) { bounce = null; tro.cascadeEnded(); }
      g.fillStyle = '#ffd68c';
      g.font = '34px "VT323", monospace';
      g.textAlign = 'center';
      payShown = Math.min(payTarget, payShown + payTarget / 45);
      g.fillText('+' + Math.floor(payShown) + ' SUN IN ' + moves + ' MOVES', W / 2, 90);
      g.textAlign = 'left';
    }

    if (info) {
      info.textContent = 'MOVES ' + moves + '   REDEALS ' + redeals +
        '   HOME ' + home() + ' (' + cardsPay(home()) + ' SUN)   A WIN PAYS ' + (winPay(moves) + cardsPay(52)) +
        '   WON ' + Solitaire.st.won + '/' + Solitaire.st.played +
        (Solitaire.st.bestMoves ? '   BEST ' + Solitaire.st.bestMoves + ' MOVES' : '');
    }
    void now;
  }

  /* the music (apps/solitaire/music.js): a slow swung tune on the studio's 'solitaire' channel, the band leaning in as the cards go home */
  const Song = createSolitaireMusic({ studio: () => window.Studio, playing: () => document.body.contains(made.win) && !!window.CRT && window.CRT.on && window.CRT.mus > 0 });
  let lastT = 0;
  const music = now => {
    const dt = Math.min(0.1, lastT ? (now - lastT) / 1000 : 0.016); lastT = now;
    Song.sync(); Song.home(home()); if (won) Song.won();
    Song.step(dt);
  };
  whenGone(cv, () => Song.stop());

  deal();
  whenGone(cv, settle);
  raf = requestAnimationFrame(paint);
  lampDip();
  }
};