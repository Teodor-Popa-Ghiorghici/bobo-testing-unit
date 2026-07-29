import { openWindow } from './wm.js';

export const Economy = (function () {
  const SUN_KEY = 'templeos.sun';
  const def = { bal: 0, ledger: [], earned: 0, spent: 0 };
  let st = {};
  try { 
    const raw = localStorage.getItem(SUN_KEY);
    if (raw) st = JSON.parse(raw);
  } catch (e) {}
  st = { ...def, ...st };
  if (!Array.isArray(st.ledger)) st.ledger = [];
  st.bal = Math.max(0, Math.floor(st.bal) || 0);

  const subs = [];
  function fire(delta, source) {
    subs.forEach(fn => { try { fn(st.bal, delta, source); } catch (e) {} });
  }
  function write() {
    localStorage.setItem(SUN_KEY, JSON.stringify(st));
  }
  function log(n, source) {
    st.ledger.push({ n: n, s: String(source || '?').toUpperCase(), t: Date.now() });
    if (st.ledger.length > 50) st.ledger.splice(0, st.ledger.length - 50);
  }

  return {
    balance() { return st.bal; },
    ledger()  { return st.ledger.slice().reverse(); },
    totals()  { return { earned: st.earned || 0, spent: st.spent || 0 }; },
    earn(amount, source) {
      amount = Math.floor(amount);
      if (!(amount > 0)) return 0;
      st.bal += amount;
      st.earned = (st.earned || 0) + amount;
      log(amount, source);
      write();
      fire(amount, source);
      return amount;
    },
    spend(amount, source) {
      amount = Math.floor(amount);
      if (!(amount > 0)) return 0;
      if (st.bal < amount) return 0;
      st.bal -= amount;
      st.spent = (st.spent || 0) + amount;
      log(-amount, source);
      write();
      fire(-amount, source);
      return amount;
    },
    onChange(fn) {
      subs.push(fn);
    }
  };
})();
window.Economy = Economy;

/* ---- the sun in the corner of the taskbar --------------------------------
   A sixteen-pixel sun with eight rays, drawn once per frame of its own spin
   and thrown away. It turns one whole revolution whenever the number under
   it changes, and the digits roll a column at a time rather than being
   replaced, because a number that just becomes another number is not an
   event and this is meant to feel like one.
   ========================================================================== */
export const SunUI = {
  cv: null, ctx: null, box: null, digits: null,
  spin: 0, spinning: 0, raf: null, shown: 0, target: 0, rollT: 0,

  mount() {
    const bar = document.getElementById('taskbar');
    const clock = document.getElementById('clock');
    if (!bar || document.getElementById('sunbox')) return;
    const box = document.createElement('div');
    box.id = 'sunbox';
    box.title = 'SUN. Earned in the garden, the hive and the deck. Spent at Dave\'s.';
    const cv = document.createElement('canvas');
    cv.width = 16; cv.height = 16;
    const dg = document.createElement('div');
    dg.id = 'sundigits';
    box.appendChild(cv);
    box.appendChild(dg);
    bar.insertBefore(box, clock);
    this.cv = cv; this.ctx = cv.getContext('2d'); this.box = box; this.digits = dg;
    box.addEventListener('mousedown', ev => {
      ev.stopPropagation();
      if (window.Snd) window.Snd.click();
      openWindow('account').catch(console.error);
    });
    this.draw();
    this.shown = Economy.balance();
    this.paint(this.shown, false);
    Economy.onChange((bal, delta) => {
      this.target = bal;
      if (delta !== 0) { this.spinning = 1; this.tick(); }
      this.roll(bal, delta !== 0);
    });
  },

  /* the sprite: a disc, eight rays, and one pixel of specular */
  draw() {
    const g = this.ctx;
    if (!g) return;
    g.clearRect(0, 0, 16, 16);
    const a = this.spin;
    for (let i = 0; i < 8; i++) {
      const th = a + i * Math.PI / 4;
      const x = Math.round(8 + Math.cos(th) * 6.2) - 1;
      const y = Math.round(8 + Math.sin(th) * 6.2) - 1;
      g.fillStyle = (i % 2) ? '#AA5500' : '#FFFF55';
      g.fillRect(x, y, 2, 2);
    }
    g.fillStyle = '#AA5500';
    g.fillRect(4, 5, 8, 6); g.fillRect(5, 4, 6, 8);
    g.fillStyle = '#FFFF55';
    g.fillRect(5, 5, 6, 6); g.fillRect(4, 6, 8, 4); g.fillRect(6, 4, 4, 8);
    g.fillStyle = '#FFFFFF';
    g.fillRect(6, 6, 2, 2);
  },

  tick() {
    if (this.raf) return;
    const step = () => {
      this.raf = null;
      if (!this.spinning) return;
      this.spin += 0.26;
      if (this.spin >= Math.PI * 2) { this.spin = 0; this.spinning = 0; }
      this.draw();
      if (this.spinning) this.raf = requestAnimationFrame(step);
      else this.draw();
    };
    this.raf = requestAnimationFrame(step);
  },

  /* count the displayed number up to the real one, one digit column at a
     time, so a payout of two hundred reads as an event and not a swap */
  roll(to, animate) {
    clearInterval(this.rollT);
    if (!animate) { this.paint(to, false); this.shown = to; return; }
    const from = this.shown;
    const span = Math.abs(to - from);
    const steps = Math.min(18, Math.max(1, span));
    let i = 0;
    this.rollT = setInterval(() => {
      i++;
      const v = Math.round(from + (to - from) * (i / steps));
      this.paint(v, true);
      if (i >= steps) { clearInterval(this.rollT); this.shown = to; this.paint(to, true); }
    }, 34);
  },

  paint(v, animate) {
    if (!this.digits) return;
    const s = String(Math.max(0, Math.floor(v)));
    const cells = this.digits.children;
    while (cells.length > s.length) this.digits.removeChild(this.digits.lastChild);
    while (cells.length < s.length) {
      const d = document.createElement('div');
      d.className = 'dg';
      d.appendChild(document.createElement('span'));
      this.digits.appendChild(d);
    }
    for (let i = 0; i < s.length; i++) {
      const cell = cells[i], sp = cell.firstChild;
      if (sp.textContent === s.charAt(i)) continue;
      sp.textContent = s.charAt(i);
      if (animate) { cell.classList.remove('roll'); void cell.offsetWidth; cell.classList.add('roll'); }
    }
  }
};
window.SunUI = SunUI;
