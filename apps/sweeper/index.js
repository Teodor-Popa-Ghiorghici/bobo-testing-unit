import { createWindow, raise, sysDialog } from '../../kernel/wm.js';
import { Snd } from '../../kernel/snd.js';
import { Cos } from '../../kernel/cos.js';
import { fs as vfs } from '../../kernel/vfs.js';
import { lampDip } from '../../kernel/hardware.js';


const SWP_KEY = 'templeos.sweeper';
const SWEEP_LV = [
  { id: 'e', name: 'SHALLOWS',  c: 9,  r: 9,  m: 10, pay: 15,  par: 60 },
  { id: 'm', name: 'THE HIVE',  c: 16, r: 16, m: 40, pay: 60,  par: 240 },
  { id: 'h', name: 'THE DEEP',  c: 30, r: 16, m: 99, pay: 200, par: 600 }
];
const SWEEP_NUM = ['', '#7fb8ff', '#8fe8b0', '#ffffff', '#c3a6ff', '#ffc35c', '#ff9040', '#ff4d5e', '#b0202e'];
const TILE = 26, HEAD = 44;

const Sweeper = {
  st: null,
  boot() {
    let raw = localStorage.getItem(SWP_KEY);
    this.st = raw ? JSON.parse(raw) : { best: {}, won: 0, played: 0, streak: 0, bestStreak: 0, lv: 'e' };
    if (!this.st.best || typeof this.st.best !== 'object') this.st.best = {};
  },
  save() { localStorage.setItem(SWP_KEY, JSON.stringify(this.st)); }
};
Sweeper.boot();

window.Sweeper = Sweeper;

let sweepWin = null;
export default {
  open(lvId) {
  if (sweepWin && document.body.contains(sweepWin.win)) { raise(sweepWin.win); return; }
  let LV = SWEEP_LV.find(l => l.id === (lvId || Sweeper.st.lv)) || SWEEP_LV[0];

  let cv, g, statsEl, cells, mines, flags, revealed, over, won, started, t0, endT, firstDone;
  let face = 'neutral', held = false, shake = 0, hatch = -1, winGlow = -1, payShown = 0, payTarget = 0;
  let raf = null, dripT = null, hoverX = -1, hoverY = -1;

  const made = createWindow({
    kind: 'app', title: 'SWEEPER.EXE', w: 0, h: 0, appId: 'sweeper',
    build: body => {
      const pane = document.createElement('div');
      pane.className = 'gamepane sweeppane';
      cv = document.createElement('canvas');
      cv.className = 'gamecv sweepcv';
      pane.appendChild(cv);
      statsEl = document.createElement('div');
      statsEl.className = 'sweepstats';
      const bar = document.createElement('div');
      bar.className = 'appbar';
      SWEEP_LV.forEach(l => {
        const b = document.createElement('button');
        b.className = 'appbtn';
        b.textContent = l.name + '  ' + l.c + 'x' + l.r;
        b.addEventListener('mousedown', ev => {
          ev.stopPropagation();
          LV = l;
          Sweeper.st.lv = l.id;
          Sweeper.save();
          Snd.click();
          reset();
          resize();
        });
        bar.appendChild(b);
      });
      body.appendChild(pane);
      body.appendChild(statsEl);
      body.appendChild(bar);
    }
  });
  sweepWin = made;
  g = cv.getContext('2d');

  function resize() {
    cv.width = LV.c * TILE;
    cv.height = LV.r * TILE + HEAD;
    cv.style.width = cv.width + 'px';
    const win = made.win;
    win.style.width = (cv.width + 14) + 'px';
    made.title.textContent = 'SWEEPER.EXE  --  ' + LV.name;
    drawStats();
    /* the stats strip wraps to as many lines as the board is narrow, so the
       window is sized to what it actually measures rather than a guess */
    const sh = statsEl.offsetHeight || 24;
    win.style.height = (cv.height + 22 + 6 + sh + 32) + 'px';
  }

  function reset() {
    cells = new Array(LV.c * LV.r).fill(0);        /* neighbour counts */
    mines = new Array(LV.c * LV.r).fill(false);
    flags = new Array(LV.c * LV.r).fill(false);
    revealed = new Array(LV.c * LV.r).fill(0);     /* 0 hidden, else reveal time */
    over = false; won = false; started = false; firstDone = false;
    t0 = 0; endT = 0; face = 'neutral'; hatch = -1; winGlow = -1; payShown = 0; payTarget = 0; shake = 0;
  }

  const IX = (x, y) => y * LV.c + x;
  function nbrs(i, fn) {
    const x = i % LV.c, y = Math.floor(i / LV.c);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= LV.c || ny >= LV.r) continue;
        fn(IX(nx, ny), nx, ny);
      }
    }
  }

  function layMines(safe) {
    const banned = { };
    banned[safe] = 1;
    nbrs(safe, i => { banned[i] = 1; });
    let placed = 0, guard = 0;
    while (placed < LV.m && guard++ < 100000) {
      const i = Math.floor(Math.random() * cells.length);
      if (mines[i] || banned[i]) continue;
      mines[i] = true;
      placed++;
    }
    for (let i = 0; i < cells.length; i++) {
      let n = 0;
      nbrs(i, j => { if (mines[j]) n++; });
      cells[i] = n;
    }
  }

  /* the cascade: breadth-first from the click, each ring fifteen
     milliseconds behind the last, so the chamber opens outwards */
  function reveal(i) {
    if (revealed[i] || flags[i]) return;
    const now = performance.now();
    if (mines[i]) { lose(i); return; }
    const q = [i];
    const seen = {};
    seen[i] = 0;
    let head = 0;
    while (head < q.length) {
      const cur = q[head], d = seen[cur];
      head++;
      revealed[cur] = now + d * 15;
      if (cells[cur] !== 0) continue;
      nbrs(cur, j => {
        if (revealed[j] || flags[j] || seen[j] !== undefined) return;
        seen[j] = d + 1;
        q.push(j);
      });
    }
    Snd.dig();
    checkWin();
  }

  function chord(i) {
    if (!revealed[i] || !cells[i]) return;
    let f = 0;
    nbrs(i, j => { if (flags[j]) f++; });
    if (f !== cells[i]) { Snd.click(); return; }
    const targets = [];
    nbrs(i, j => { if (!flags[j] && !revealed[j]) targets.push(j); });
    for (const j of targets) {
      if (mines[j]) { lose(j); return; }
    }
    targets.forEach(j => reveal(j));
  }

  function lose(i) {
    over = true; won = false; face = 'cracked';
    endT = Date.now();
    hatch = performance.now();
    shake = 1;
    Sweeper.st.played++;
    Sweeper.st.streak = 0;
    Sweeper.save();
    revealed[i] = performance.now();
    let d = 0;
    for (let k = 0; k < cells.length; k++) {
      if (mines[k] && !flags[k]) { Snd.chitter(d * 0.04); d++; if (d > 24) d = 24; }
    }
    Snd.err();
    drawStats();
  }

  function checkWin() {
    let hidden = 0;
    for (let k = 0; k < cells.length; k++) if (!revealed[k] && !mines[k]) hidden++;
    if (hidden) return;
    over = true; won = true; face = 'serene';
    endT = Date.now();
    winGlow = performance.now();
    const secs = (endT - t0) / 1000;
    const bonus = Math.max(0, Math.round(LV.pay * (1 - secs / LV.par)));
    payTarget = LV.pay + bonus;
    payShown = 0;
    Sweeper.st.played++;
    Sweeper.st.won++;
    Sweeper.st.streak++;
    if (Sweeper.st.streak > (Sweeper.st.bestStreak || 0)) Sweeper.st.bestStreak = Sweeper.st.streak;
    const b = Sweeper.st.best[LV.id];
    if (!b || secs < b) Sweeper.st.best[LV.id] = Math.round(secs * 10) / 10;
    Sweeper.save();
    Snd.chime();
    /* the payout counts up on the board before it is credited */
    setTimeout(() => {
      window.Economy.earn(payTarget, 'SWEEPER: ' + LV.name);
      Snd.coin();
    }, 1400);
    drawStats();
  }

  function hit(ev) {
    const r = cv.getBoundingClientRect();
    const x = Math.floor((ev.clientX - r.left) * (cv.width / r.width) / TILE);
    const y = Math.floor(((ev.clientY - r.top) * (cv.height / r.height) - HEAD) / TILE);
    if (x < 0 || y < 0 || x >= LV.c || y >= LV.r) return -1;
    return IX(x, y);
  }

  cv.addEventListener('contextmenu', ev => ev.preventDefault());
  cv.addEventListener('mousemove', ev => {
    const r = cv.getBoundingClientRect();
    hoverX = Math.floor((ev.clientX - r.left) * (cv.width / r.width) / TILE);
    hoverY = Math.floor(((ev.clientY - r.top) * (cv.height / r.height) - HEAD) / TILE);
  });
  cv.addEventListener('mouseleave', () => { hoverX = hoverY = -1; held = false; });
  cv.addEventListener('mousedown', ev => {
    ev.stopPropagation();
    /* the mask at the top is the new game button */
    const r = cv.getBoundingClientRect();
    const my = (ev.clientY - r.top) * (cv.height / r.height);
    const mx = (ev.clientX - r.left) * (cv.width / r.width);
    if (my < HEAD) {
      if (mx > cv.width / 2 - 18 && mx < cv.width / 2 + 18) { Snd.click(); reset(); }
      return;
    }
    if (over) return;
    const i = hit(ev);
    if (i < 0) return;
    if (ev.button === 2) {
      if (revealed[i]) return;
      flags[i] = !flags[i];
      Snd.pin();
      return;
    }
    if (ev.button !== 0) return;
    held = true;
    face = 'tense';
    if (!firstDone) {
      firstDone = true; started = true; t0 = Date.now();
      layMines(i);
    }
    if (revealed[i]) chord(i);
    else reveal(i);
  });
  window.addEventListener('mouseup', () => { held = false; if (!over) face = 'neutral'; });

  /* ---- drawing ---------------------------------------------------------- */
  function tileArt(i, x, y) {
    /* a hollow chamber: darker floor, and one small detail per cell chosen
       from the index so it never flickers */
    g.fillStyle = '#0c0f1a';
    g.fillRect(x, y, TILE, TILE);
    g.fillStyle = '#0f1322';
    g.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
    const k = (i * 2654435761) >>> 0;
    if ((k & 15) === 0) {                      /* a hanging thread */
      g.fillStyle = '#1e2740';
      g.fillRect(x + 6 + (k >> 4 & 7), y + 1, 1, 8 + (k >> 8 & 5));
    } else if ((k & 15) === 3) {               /* a crack */
      g.fillStyle = '#171d30';
      g.fillRect(x + 4, y + TILE - 7, 8, 1);
      g.fillRect(x + 11, y + TILE - 9, 1, 3);
    } else if ((k & 31) === 7) {               /* a dim glow */
      g.fillStyle = 'rgba(90,200,220,0.10)';
      g.fillRect(x + 9, y + 9, 6, 6);
      g.fillStyle = 'rgba(140,230,255,0.16)';
      g.fillRect(x + 11, y + 11, 2, 2);
    }
  }

  function drawTileFace(x, y, lift) {
    g.fillStyle = lift ? '#2c3550' : '#222a40';
    g.fillRect(x, y, TILE - 1, TILE - 1);
    g.fillStyle = lift ? '#3d4b6e' : '#2e3852';
    g.fillRect(x, y, TILE - 1, 1);
    g.fillRect(x, y, 1, TILE - 1);
    g.fillStyle = '#11151f';
    g.fillRect(x, y + TILE - 2, TILE - 1, 1);
    g.fillRect(x + TILE - 2, y, 1, TILE - 1);
    /* silk threads in the stone */
    g.fillStyle = 'rgba(150,180,210,0.055)';
    g.fillRect(x + 3, y + 5, TILE - 8, 1);
    g.fillRect(x + 6, y + 13, TILE - 12, 1);
    g.fillRect(x + 4, y + 19, TILE - 10, 1);
    if (lift) {
      g.strokeStyle = 'rgba(200,220,240,0.35)';
      g.strokeRect(x + 0.5, y + 0.5, TILE - 2, TILE - 2);
    }
  }

  function drawLarva(x, y, hatched) {
    const cx = x + TILE / 2, cy = y + TILE / 2;
    g.fillStyle = hatched ? '#3a1420' : '#221826';
    g.fillRect(cx - 8, cy - 6, 16, 12);
    g.fillStyle = hatched ? '#7a2030' : '#2e2233';
    g.fillRect(cx - 7, cy - 5, 14, 4);
    g.fillRect(cx - 6, cy + 1, 12, 3);
    g.fillStyle = hatched ? '#c8354a' : '#3a2c42';
    for (let s = 0; s < 4; s++) g.fillRect(cx - 6 + s * 4, cy - 5, 2, 10);
    g.fillStyle = hatched ? '#ff5566' : '#5a3a4a';
    g.fillRect(cx + 3, cy - 3, 2, 2);
    g.fillRect(cx + 3, cy + 1, 2, 2);
    if (hatched) {
      g.fillStyle = 'rgba(255,60,80,0.18)';
      g.fillRect(x, y, TILE, TILE);
    }
  }

  function drawFlag(x, y) {
    const cx = x + TILE / 2;
    g.fillStyle = '#8794aa';
    g.fillRect(cx - 1, y + 5, 2, 15);
    g.fillStyle = '#e8e2d4';
    g.fillRect(cx - 7, y + 5, 8, 6);
    g.fillStyle = '#c2b8a4';
    g.fillRect(cx - 7, y + 8, 8, 3);
    g.fillStyle = '#5c6478';
    g.fillRect(cx - 4, y + 19, 8, 2);
  }

  function drawMask(cx, cy, mood) {
    /* a small bone mask: two eyes and a crack, or a curve of calm */
    g.fillStyle = '#e8e2d4';
    g.fillRect(cx - 13, cy - 14, 26, 24);
    g.fillRect(cx - 11, cy + 10, 22, 4);
    g.fillStyle = '#c9bfa8';
    g.fillRect(cx - 13, cy - 14, 26, 3);
    g.fillStyle = '#0d1117';
    if (mood === 'serene') {
      g.fillRect(cx - 9, cy - 4, 6, 2);
      g.fillRect(cx + 3, cy - 4, 6, 2);
    } else if (mood === 'tense') {
      g.fillRect(cx - 9, cy - 7, 6, 8);
      g.fillRect(cx + 3, cy - 7, 6, 8);
      g.fillStyle = '#e8e2d4';
      g.fillRect(cx - 9, cy - 7, 6, 3);
      g.fillRect(cx + 3, cy - 7, 6, 3);
    } else {
      g.fillRect(cx - 9, cy - 6, 6, 7);
      g.fillRect(cx + 3, cy - 6, 6, 7);
    }
    if (mood === 'cracked') {
      g.fillStyle = '#0d1117';
      g.fillRect(cx - 2, cy - 14, 2, 9);
      g.fillRect(cx, cy - 5, 2, 7);
      g.fillRect(cx + 2, cy + 2, 2, 8);
      g.fillStyle = '#8b1a1a';
      g.fillRect(cx - 2, cy - 14, 1, 24);
    }
    g.fillStyle = '#9a8f74';
    g.fillRect(cx - 4, cy + 4, 8, 2);
  }

  function paint() {
    if (!document.body.contains(made.win)) {
      raf = null;
      clearInterval(dripT);
      sweepWin = null;
      return;
    }
    raf = requestAnimationFrame(paint);
    const now = performance.now();
    g.save();
    if (shake > 0) {
      shake = Math.max(0, shake - 0.02);
      g.translate(Math.round((Math.random() - 0.5) * 8 * shake), Math.round((Math.random() - 0.5) * 8 * shake));
    }
    g.fillStyle = '#080b14';
    g.fillRect(-10, -10, cv.width + 20, cv.height + 20);

    /* header: mines left, the mask, the clock */
    let f = 0;
    for (let k = 0; k < flags.length; k++) if (flags[k]) f++;
    g.fillStyle = '#0d1117';
    g.fillRect(0, 0, cv.width, HEAD);
    g.fillStyle = '#161c2c';
    g.fillRect(0, HEAD - 2, cv.width, 2);
    g.font = '22px "VT323", monospace';
    g.fillStyle = '#ff4d5e';
    g.fillText(String(Math.max(0, LV.m - f)).padStart(3, '0'), 10, 29);
    const secs = !started ? 0 : Math.floor(((over ? endT : Date.now()) - t0) / 1000);
    g.fillStyle = '#7fb8ff';
    g.fillText(String(Math.min(999, secs)).padStart(3, '0'), cv.width - 46, 29);
    drawMask(cv.width / 2, HEAD / 2 - 1, held && !over ? 'tense' : face);

    for (let i = 0; i < cells.length; i++) {
      const x = (i % LV.c) * TILE, y = Math.floor(i / LV.c) * TILE + HEAD;
      const rt = revealed[i];
      const shown = rt && now >= rt;
      if (!shown) {
        const lift = (i % LV.c) === hoverX && Math.floor(i / LV.c) === hoverY && !over;
        drawTileFace(x, y, lift);
        if (flags[i]) drawFlag(x, y);
        /* on a loss every mine hatches, forty milliseconds apart */
        if (over && !won && mines[i] && !flags[i]) {
          const d = hatch + (i % 40) * 40;
          if (now > d) { tileArt(i, x, y); drawLarva(x, y, true); }
        }
        if (over && !won && flags[i] && !mines[i]) {
          g.strokeStyle = '#ff4d5e';
          g.beginPath();
          g.moveTo(x + 4, y + 4); g.lineTo(x + TILE - 6, y + TILE - 6);
          g.moveTo(x + TILE - 6, y + 4); g.lineTo(x + 4, y + TILE - 6);
          g.stroke();
        }
        continue;
      }
      /* the drop: two pixels inward over the first eighty milliseconds */
      const age = Math.min(1, (now - rt) / 80);
      const inset = Math.round((1 - age) * 2);
      g.globalAlpha = 0.35 + age * 0.65;
      tileArt(i, x + inset, y + inset);
      if (mines[i]) drawLarva(x, y, over && !won);
      else if (cells[i]) {
        g.fillStyle = SWEEP_NUM[cells[i]];
        g.font = 'bold 19px Georgia, "Times New Roman", serif';
        g.textAlign = 'center';
        g.fillText(String(cells[i]), x + TILE / 2, y + TILE - 7);
        g.textAlign = 'left';
      }
      g.globalAlpha = 1;
    }

    /* the win: the chamber warms up from the middle outwards */
    if (won && winGlow > 0) {
      const a = Math.min(1, (now - winGlow) / 1200);
      const R = a * Math.max(cv.width, cv.height);
      const grd = g.createRadialGradient(cv.width / 2, cv.height / 2, 0, cv.width / 2, cv.height / 2, Math.max(8, R));
      grd.addColorStop(0, 'rgba(255,214,140,' + (0.30 * (1 - a * 0.4)).toFixed(3) + ')');
      grd.addColorStop(1, 'rgba(255,214,140,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, cv.width, cv.height);
      if (payTarget) {
        payShown = Math.min(payTarget, payShown + Math.max(1, payTarget / 40));
        g.font = '30px "VT323", monospace';
        g.textAlign = 'center';
        g.fillStyle = '#0d1117';
        g.fillText('+' + Math.floor(payShown) + ' SUN', cv.width / 2 + 2, cv.height / 2 + 2);
        g.fillStyle = '#ffd68c';
        g.fillText('+' + Math.floor(payShown) + ' SUN', cv.width / 2, cv.height / 2);
        g.textAlign = 'left';
      }
    }
    g.restore();
  }

  function drawStats() {
    if (!statsEl) return;
    const b = Sweeper.st.best;
    const fmt = id => b[id] != null ? b[id] + 's' : '--';
    statsEl.innerHTML = '';
    const put = (k, v) => {
      const s = document.createElement('span');
      s.textContent = k + ' ';
      const bo = document.createElement('b');
      bo.textContent = v;
      s.appendChild(bo);
      statsEl.appendChild(s);
    };
    put('BEST', fmt('e') + ' / ' + fmt('m') + ' / ' + fmt('h'));
    put('WON', Sweeper.st.won + ' OF ' + Sweeper.st.played);
    put('STREAK', Sweeper.st.streak + ' (BEST ' + (Sweeper.st.bestStreak || 0) + ')');
    put('PAYS', LV.pay + ' + TIME');
  }

  reset();
  resize();
  raf = requestAnimationFrame(paint);
  /* water, somewhere else in the hive */
  dripT = setInterval(() => { if (Math.random() < 0.35) Snd.drip(); }, 4200);
  lampDip();
  }
};