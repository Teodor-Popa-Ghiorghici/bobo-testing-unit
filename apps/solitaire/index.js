import { createWindow, raise, sysDialog } from '../../kernel/wm.js';
import { Snd } from '../../kernel/snd.js';
import { Cos } from '../../kernel/cos.js';
import { fs as vfs } from '../../kernel/vfs.js';
import { lampDip } from '../../kernel/hardware.js';


const SOL_KEY = 'templeos.solitaire';
const LANES = [
  { id: 0, name: 'MID',     red: true,  c: '#c8283c', c2: '#8b1020', ink: '#ffd8dc', champ: 'ZED' },
  { id: 1, name: 'BOT',     red: true,  c: '#e0622a', c2: '#96380e', ink: '#ffe2cc', champ: 'TALON' },
  { id: 2, name: 'TOP',     red: false, c: '#3f6a9e', c2: '#20364f', ink: '#d6e6f8', champ: 'LEE SIN' },
  { id: 3, name: 'SUPPORT', red: false, c: '#4a3060', c2: '#241635', ink: '#e0d4f0', champ: 'JAX' }
];
const RANK_TXT = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const CW = 80, CH = 112;
const SOL_BACKS = ['HEXTECH', 'SILK', 'RUNE'];
const Solitaire = {
  st: null,
  boot() {
    let raw = localStorage.getItem(SOL_KEY);
    this.st = raw ? JSON.parse(raw) : { won: 0, played: 0, bestMoves: 0, back: 0 };
    if (this.st.suitMode == null) this.st.suitMode = 4;
  },
  save() { localStorage.setItem(SOL_KEY, JSON.stringify(this.st)); }
};

/* the four lanes are really two teams (LANES[i].red), the way a classic
   deck is two colours -- so a 2-tone mode is just painting each team its
   team colour, and never touches the .red the stacking rules read. The
   distinct mode swaps in four hues spread around the wheel instead of the
   default palette's two warm/two cool pairing, for a board that reads at
   a glance instead of on close inspection. */
const SUIT_DISTINCT = [
  { c: '#E8383A', c2: '#9c1416', ink: '#ffd6d6' },
  { c: '#E8B23A', c2: '#8a6410', ink: '#fff3d6' },
  { c: '#3A78E8', c2: '#1c3f8a', ink: '#d6e6ff' },
  { c: '#3AA855', c2: '#1f5c30', ink: '#d8ffe0' }
];
const SUIT_MODES = [4, 2, 'distinct'];
const SUIT_MODE_LABEL = { 4: 'SUITS: 4-TONE', 2: 'SUITS: 2-TONE', distinct: 'SUITS: DISTINCT' };
function laneVis(i) {
  const L = LANES[i];
  const mode = Solitaire.st.suitMode;
  if (mode === 2) {
    return L.red ? { ...L, c: '#d43a4a', c2: '#8b1020', ink: '#ffd8dc' }
                 : { ...L, c: '#1c1c1c', c2: '#000000', ink: '#eaeaea' };
  }
  if (mode === 'distinct') return { ...L, ...SUIT_DISTINCT[i] };
  return L;
}
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
  let stock, waste, found, tab, moves, dealing, won, drag, bounce, redeals;
  let raf = null, mx = 0, my = 0, autoT = null, payShown = 0, payTarget = 0;

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
      const setBack = () => { bb.textContent = 'BACK: ' + SOL_BACKS[Solitaire.st.back % 3]; };
      bb.addEventListener('mousedown', ev => {
        ev.stopPropagation();
        Solitaire.st.back = (Solitaire.st.back + 1) % 3;
        Solitaire.save(); Snd.click(); setBack();
      });
      setBack();
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
      bar.appendChild(nb); bar.appendChild(bb); bar.appendChild(sb); bar.appendChild(info);
      body.appendChild(pane); body.appendChild(bar);
    }
  });
  solWin = made;
  g = cv.getContext('2d');
  if (g) g.imageSmoothingEnabled = false;

  /* ---- the deal --------------------------------------------------------- */
  function deal() {
    const cards = [];
    for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) cards.push({ r: r, s: s, up: false, a: 0, x: 0, y: 0 });
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = cards[i]; cards[i] = cards[j]; cards[j] = t;
    }
    stock = cards; waste = []; found = [[], [], [], []]; tab = [[], [], [], [], [], [], []];
    moves = 0; won = false; drag = null; bounce = null; redeals = 0; payShown = 0; payTarget = 0;
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
    payTarget = Math.max(40, 300 - moves * 2);
    Solitaire.st.won++;
    if (!Solitaire.st.bestMoves || moves < Solitaire.st.bestMoves) Solitaire.st.bestMoves = moves;
    Solitaire.save();
    Snd.fanfare();
    window.Economy.earn(payTarget, 'SOLITAIRE: ' + moves + ' MOVES');
    setTimeout(() => Snd.coin(), 400);
    /* the cascade everyone who has ever used an old computer expects */
    bounce = [];
    for (let f = 3; f >= 0; f--) {
      found[f].slice().reverse().forEach((c, i) => {
        bounce.push({ c: c, x: FOUND[f].x, y: FOUND[f].y, vx: 0, vy: 0, wait: (3 - f) * 52 + i * 4, live: false });
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
      Snd.click();
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

  window.addEventListener('mouseup', () => {
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
      moves++;
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
  });

  /* ---- the cards -------------------------------------------------------- */
  function roundRect(x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
  }

  function laneIcon(x, y, s, lane, col) {
    x = Math.round(x); y = Math.round(y);
    g.fillStyle = col;
    if (lane === 0) {                    /* MID: the lane, and a diamond on it */
      g.fillRect(x - 2 * s, y - 9 * s, 4 * s, 18 * s);
      g.beginPath();
      g.moveTo(x, y - 7 * s); g.lineTo(x + 6 * s, y); g.lineTo(x, y + 7 * s); g.lineTo(x - 6 * s, y);
      g.closePath(); g.fill();
    } else if (lane === 1) {             /* BOT: a descending arrow */
      g.fillRect(x - 2 * s, y - 10 * s, 4 * s, 12 * s);
      g.beginPath();
      g.moveTo(x - 8 * s, y); g.lineTo(x + 8 * s, y); g.lineTo(x, y + 10 * s);
      g.closePath(); g.fill();
    } else if (lane === 2) {             /* TOP: a tower */
      g.fillRect(x - 7 * s, y + 4 * s, 14 * s, 6 * s);
      g.fillRect(x - 5 * s, y - 6 * s, 10 * s, 10 * s);
      g.fillRect(x - 7 * s, y - 9 * s, 3 * s, 3 * s);
      g.fillRect(x - 1.5 * s, y - 10 * s, 3 * s, 4 * s);
      g.fillRect(x + 4 * s, y - 9 * s, 3 * s, 3 * s);
    } else {                             /* SUPPORT: a ward */
      g.beginPath();
      g.moveTo(x, y - 10 * s); g.lineTo(x + 8 * s, y - 2 * s); g.lineTo(x, y + 10 * s); g.lineTo(x - 8 * s, y - 2 * s);
      g.closePath(); g.fill();
      g.fillStyle = '#0a0c10';
      g.fillRect(x - 2 * s, y - 4 * s, 4 * s, 6 * s);
    }
  }

  /* Silhouette first: every champion has to read as itself in one colour at
     eighty pixels, so each is a distinct outline before it is any detail. */
  function champArt(x, y, w, h, lane, tier) {
    const L = laneVis(lane);
    const cx = x + w / 2;
    const base = y + h;
    const sc = tier === 0 ? 0.72 : tier === 1 ? 0.88 : 1;
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.fillStyle = L.c2;
    g.fillRect(x, y, w, h);
    /* a halo so the silhouette has something to sit on */
    g.fillStyle = 'rgba(255,255,255,0.07)';
    g.beginPath(); g.arc(cx, y + h * 0.42, w * 0.42 * sc, 0, 7); g.fill();
    const S = (dx, dy, dw, dh, c) => { g.fillStyle = c; g.fillRect(Math.round(cx + dx * sc), Math.round(base - dy * sc), Math.round(dw * sc), Math.round(dh * sc)); };

    if (lane === 0) {                                    /* ZED */
      S(-20, 30, 40, 30, '#14171c');                     /* shoulders */
      S(-16, 46, 32, 18, '#1c2129');                     /* hood */
      S(-13, 48, 26, 14, '#2a3038');                     /* mask */
      S(-13, 52, 8, 3, L.c); S(5, 52, 8, 3, L.c);        /* eye slits */
      S(-19, 56, 6, 12, '#2a3038'); S(13, 56, 6, 12, '#2a3038');   /* horns */
      S(-17, 66, 4, 6, L.c); S(13, 66, 4, 6, L.c);
      if (tier > 0) { S(-30, 34, 10, 10, '#2a3038'); S(20, 34, 10, 10, '#2a3038'); }
      if (tier > 1) { S(-34, 12, 68, 6, '#14171c'); S(-28, 4, 56, 8, '#1c2129'); }
    } else if (lane === 1) {                             /* TALON */
      S(-22, 28, 44, 28, '#1a1410');                     /* cloak */
      S(-15, 44, 30, 20, '#241a12');                     /* collar */
      S(-11, 48, 22, 14, '#c9a06a');                     /* face */
      S(-11, 54, 22, 4, '#1a1410');                      /* fringe */
      S(-9, 50, 5, 3, L.c); S(4, 50, 5, 3, L.c);
      if (tier > 0) { S(14, 20, 24, 5, '#b8bcc4'); S(30, 22, 10, 3, '#e8ecf2'); }   /* blade */
      if (tier > 1) { S(-40, 6, 34, 26, '#1a1410'); S(8, 6, 34, 26, '#1a1410'); }   /* the cape spread */
    } else if (lane === 2) {                             /* LEE SIN */
      S(-24, 30, 48, 28, '#3a2a1c');
      S(-14, 46, 28, 18, '#c98a52');                     /* head */
      S(-15, 52, 30, 6, '#e8e2d4');                      /* the blindfold */
      S(15, 52, 12, 4, '#e8e2d4'); S(19, 46, 8, 8, '#e8e2d4');
      S(-20, 34, 8, 14, '#c98a52'); S(12, 34, 8, 14, '#c98a52');
      if (tier > 0) { S(-26, 24, 52, 5, '#7a5a34'); }
      if (tier > 1) { S(-30, 2, 12, 26, L.c); S(18, 2, 12, 26, L.c); }
    } else {                                             /* JAX */
      S(-22, 30, 44, 26, '#241a30');
      S(-26, 54, 52, 6, '#3a2a4a');                      /* the brim */
      S(-13, 46, 26, 12, '#191122');                     /* the dark under it */
      S(-8, 50, 5, 4, '#ffe07a'); S(3, 50, 5, 4, '#ffe07a');
      S(16, 20, 6, 46, '#4a4a52');                       /* the lamppost */
      S(13, 62, 12, 8, '#ffe07a');
      if (tier > 0) { S(-30, 26, 10, 20, '#241a30'); }
      if (tier > 1) { S(-36, 4, 20, 26, '#3a2a4a'); S(-13, 34, 26, 6, '#ffe07a'); }
    }
    g.restore();
  }

  function drawCard(c, x, y, lifted) {
    g.save();
    if (lifted) {
      g.translate(x + CW / 2, y + CH / 2);
      g.rotate(0.035);
      g.translate(-(x + CW / 2), -(y + CH / 2));
      g.shadowColor = 'rgba(0,0,0,0.65)'; g.shadowBlur = 16; g.shadowOffsetY = 8;
    } else {
      g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 4; g.shadowOffsetY = 2;
    }
    if (!c.up) {
      const b = Solitaire.st.back % 3;
      roundRect(x, y, CW, CH, 5);
      g.fillStyle = b === 0 ? '#16283c' : b === 1 ? '#2a2030' : '#20261c';
      g.fill();
      g.shadowColor = 'transparent';
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = 1;
      g.stroke();
      g.save();
      roundRect(x + 5, y + 5, CW - 10, CH - 10, 3);
      g.clip();
      if (b === 0) {
        g.strokeStyle = '#39a0c8';
        for (let i = -CH; i < CW; i += 9) {
          g.beginPath(); g.moveTo(x + i, y); g.lineTo(x + i + CH, y + CH); g.stroke();
        }
        g.fillStyle = '#0d1a26';
        g.fillRect(x + 24, y + 40, 32, 32);
        g.fillStyle = '#7fe0ff';
        g.fillRect(x + 36, y + 44, 8, 24); g.fillRect(x + 28, y + 52, 24, 8);
      } else if (b === 1) {
        g.strokeStyle = 'rgba(230,220,240,0.35)';
        for (let i = 0; i < 7; i++) {
          g.beginPath();
          g.arc(x + CW / 2, y + CH / 2, 6 + i * 7, 0, 7);
          g.stroke();
        }
        g.fillStyle = '#e8e2d4';
        g.fillRect(x + CW / 2 - 2, y + CH / 2 - 2, 4, 4);
      } else {
        g.fillStyle = '#3a4a2c';
        for (let yy = 0; yy < CH; yy += 12) {
          for (let xx = 0; xx < CW; xx += 12) {
            g.fillRect(x + xx + ((yy / 12) % 2 ? 6 : 0), y + yy, 6, 6);
          }
        }
        g.fillStyle = '#c8d86a';
        g.fillRect(x + 30, y + 46, 20, 20);
        g.fillStyle = '#20261c';
        g.fillRect(x + 36, y + 50, 8, 12);
      }
      g.restore();
      g.restore();
      return;
    }

    const L = laneVis(c.s);
    roundRect(x, y, CW, CH, 5);
    g.fillStyle = '#f2efe6';
    g.fill();
    g.shadowColor = 'transparent';
    g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.lineWidth = 1;
    g.stroke();

    /* corner index, top left and bottom right */
    g.fillStyle = L.c;
    g.font = 'bold 17px Georgia, serif';
    g.textAlign = 'left';
    g.fillText(RANK_TXT[c.r], x + 5, y + 19);
    laneIcon(x + 11, y + 31, 0.52, c.s, L.c);
    g.save();
    g.translate(x + CW, y + CH);
    g.rotate(Math.PI);
    g.fillStyle = L.c;
    g.fillText(RANK_TXT[c.r], 5, 19);
    laneIcon(11, 31, 0.52, c.s, L.c);
    g.restore();

    if (c.r === 1) {
      laneIcon(x + CW / 2, y + CH / 2, 1.9, c.s, L.c);
    } else if (c.r >= 11) {
      champArt(x + 16, y + 24, CW - 32, CH - 48, c.s, c.r - 11);
      g.strokeStyle = L.c;
      g.lineWidth = 2;
      g.strokeRect(x + 16, y + 24, CW - 32, CH - 48);
      g.fillStyle = L.c;
      g.fillRect(x + 16, y + CH - 26, CW - 32, 10);
      g.fillStyle = L.ink;
      g.font = '11px Georgia, serif';
      g.textAlign = 'center';
      g.fillText(L.champ, x + CW / 2, y + CH - 18);
      g.textAlign = 'left';
    } else {
      /* pips, laid out the way a real deck lays them out */
      const cols = [[0], [0], [0, 0], [0, 0, 0], [-1, 1, -1, 1], [-1, 1, -1, 1, 0],
        [-1, 1, -1, 1, -1, 1], [-1, 1, -1, 1, -1, 1, 0], [-1, 1, -1, 1, -1, 1, -1, 1],
        [-1, 1, -1, 1, -1, 1, -1, 1, 0], [-1, 1, -1, 1, -1, 1, -1, 1, 0, 0]][c.r];
      const rowsFor = {
        2: [[0, -1], [0, 1]], 3: [[0, -1], [0, 0], [0, 1]],
        4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
        5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
        6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
        7: [[-1, -1], [1, -1], [0, -0.5], [-1, 0], [1, 0], [-1, 1], [1, 1]],
        8: [[-1, -1], [1, -1], [0, -0.5], [-1, 0], [1, 0], [0, 0.5], [-1, 1], [1, 1]],
        9: [[-1, -1], [1, -1], [-1, -0.33], [1, -0.33], [0, 0], [-1, 0.33], [1, 0.33], [-1, 1], [1, 1]],
        10: [[-1, -1], [1, -1], [0, -0.66], [-1, -0.33], [1, -0.33], [-1, 0.33], [1, 0.33], [0, 0.66], [-1, 1], [1, 1]]
      };
      const pts = rowsFor[c.r] || [[0, 0]];
      pts.forEach(p => laneIcon(x + CW / 2 + p[0] * 18, y + CH / 2 + p[1] * 30, 0.62, c.s, L.c));
      void cols;
    }
    g.restore();
  }

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
      return;
    }
    raf = requestAnimationFrame(paint);
    const now = performance.now();

    /* the table: slate, with a grid pressed into it */
    g.fillStyle = '#0f1218';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#131722';
    for (let y = 0; y < H; y += 8) g.fillRect(0, y, W, 1);
    g.fillStyle = 'rgba(60,90,140,0.05)';
    for (let x = 0; x < W; x += 64) g.fillRect(x, 0, 32, H);

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
    if (autoReady()) {
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
      bounce.forEach(b => {
        if (b.wait > 0) { b.wait -= 1; return; }
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
      if (!anyLive) bounce = null;
      g.fillStyle = '#ffd68c';
      g.font = '34px "VT323", monospace';
      g.textAlign = 'center';
      payShown = Math.min(payTarget, payShown + payTarget / 45);
      g.fillText('+' + Math.floor(payShown) + ' SUN IN ' + moves + ' MOVES', W / 2, 90);
      g.textAlign = 'left';
    }

    if (info) {
      info.textContent = 'MOVES ' + moves + '   REDEALS ' + redeals +
        '   PAYS ' + Math.max(40, 300 - moves * 2) +
        '   WON ' + Solitaire.st.won + '/' + Solitaire.st.played +
        (Solitaire.st.bestMoves ? '   BEST ' + Solitaire.st.bestMoves + ' MOVES' : '');
    }
    void now;
  }

  deal();
  raf = requestAnimationFrame(paint);
  lampDip();
  }
};