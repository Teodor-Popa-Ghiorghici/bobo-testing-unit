import { Snd } from "./snd.js";
import { CRT, Vol, musGain } from "./hardware.js";
/* ==========================================================================
   11.3d THE STYLE METER
   Deleting a file is not housekeeping, it is a performance, and the machine
   grades it. Points in, points always bleeding out; the letter follows the
   points. Nothing here is saved — every reload starts you back at nothing.
   ========================================================================== */
const STYLE_CFG = {
  BASE: 220,          /* points for one file */
  COMBO_STEP: 40,     /* added per link in the chain */
  COMBO_MAX: 200,     /* ceiling on that bonus */
  COMBO_WINDOW: 3.5,  /* seconds before the chain is considered broken */
  GRACE: 2.2,         /* seconds of quiet before the drain opens */
  DRAIN: 55,          /* points a second at D */
  DRAIN_TIER: 22,     /* and again for every rank above it */
  TOP_HOLD: 8,        /* the birthday rank is frozen this long, once */
  BULK_CAP: 12        /* most files one bulk action may ever score */
};

/* at: the running total this rank starts at. col: palette, no exceptions. */
const STYLE_RANKS = [
  { key: 'D',   name: 'DESECRATING',          at: 0,    col: '#AAAAAA' },
  { key: 'C',   name: 'CORRUPTING',           at: 700,  col: '#55FF55' },
  { key: 'B',   name: 'BLASPHEMOUS',          at: 1500, col: '#55FFFF' },
  { key: 'A',   name: 'ANNIHILATING',         at: 2500, col: '#FFFF55' },
  { key: 'S',   name: 'SACRILEGIOUS',         at: 3800, col: '#AA5500' },
  { key: 'SS',  name: 'SSCORCHED EARTH',      at: 5400, col: '#FF5555' },
  { key: 'SSS', name: 'SSSTEFAN BOERUSTORM',  at: 7300, col: '#FF55FF' },
  { key: '!!!', name: 'HAPPY BIRTHDAY',       at: 9500, col: '#FFFFFF' }
];

/* what the machine calls the act, as it stops being an act of maintenance */
const STYLE_VERBS = [
  'DELETED', 'SHREDDED', 'PURGED', 'VAPORISED',
  'OBLITERATED', 'UNMADE', 'ERASED FROM THE RECORD', 'UNWRAPPED'
];

/* the birthday rank cycles the whole palette, one colour per two frames */
const STYLE_PARTY = ['#FFFF55', '#55FF55', '#55FFFF', '#FF55FF', '#FF5555', '#FFFFFF'];

export const Style = {
  pts: 0,
  tier: -1,        /* -1 is dormant: the meter is not on screen at all */
  combo: 0,
  last: 0,         /* performance.now() of the last hit, in seconds */
  hold: 0,         /* seconds of drain freeze left */
  crowned: false,  /* the top rank has been reached once this session */
  raf: null,
  prev: 0,
  el: null,

  mount() {
    if (this.el) return true;
    const root = document.getElementById('smeter');
    if (!root) return false;
    const bar = document.getElementById('sm-bar');
    bar.innerHTML = '';
    for (let i = 0; i < 16; i++) bar.appendChild(document.createElement('b'));
    this.el = {
      root: root,
      key: document.getElementById('sm-key'),
      name: document.getElementById('sm-name'),
      cells: Array.prototype.slice.call(bar.children),
      log: document.getElementById('sm-log')
    };
    return true;
  },

  now() { return performance.now() / 1000; },

  /* ---- scoring --------------------------------------------------------- */
  /* node may be null. n is how many files this action killed — pass the
     child count for a folder, or the list length for a bulk clear. */
  hit(node, n) {
    if (!CRT.on) return;
    if (!this.mount()) return;
    let count = Math.max(1, n || 1);
    const bulk = count > 1;
    if (bulk) count = Math.min(count, STYLE_CFG.BULK_CAP);

    const t = this.now();
    if (t - this.last > STYLE_CFG.COMBO_WINDOW) this.combo = 0;
    this.last = t;

    let gained = 0;
    for (let i = 0; i < count; i++) {
      const bonus = Math.min(STYLE_CFG.COMBO_MAX, this.combo * STYLE_CFG.COMBO_STEP);
      gained += STYLE_CFG.BASE + bonus;
      this.combo++;
    }
    this.pts += gained;

    const tier = this.rankFor(this.pts);
    this.setTier(tier);

    /* the verb, then the chain, then the pile if it was a pile */
    this.say(STYLE_VERBS[Math.max(0, tier)], true);
    if (bulk) this.say('MASS DELETION x' + count);
    else if (this.combo > 2) this.say('CHAIN x' + this.combo);

    this.el.root.classList.remove('hit');
    void this.el.root.offsetWidth;      /* restart the recoil */
    this.el.root.classList.add('hit');

    Snd.delT(Math.max(0, tier));
    Rage.sync();
    this.run();
  },

  rankFor(p) {
    if (p <= 0) return -1;      /* nothing on the board: the meter goes away */
    let t = -1;
    for (let i = 0; i < STYLE_RANKS.length; i++) if (p >= STYLE_RANKS[i].at) t = i;
    return t;
  },

  setTier(t) {
    if (t === this.tier) return;
    const up = t > this.tier;
    this.tier = t;
    if (t < 0) { this.hide(); return; }
    const r = STYLE_RANKS[t];
    this.el.root.classList.add('live');
    this.el.root.style.setProperty('--sm-col', r.col);
    this.el.key.textContent = r.key;
    this.el.name.textContent = r.name;
    this.el.root.classList.toggle('top', t === STYLE_RANKS.length - 1);
    if (up) {
      this.el.root.classList.remove('up');
      void this.el.root.offsetWidth;
      this.el.root.classList.add('up');
      this.say(r.name, true);
      Snd.rankUp(t);
    }
    if (t === STYLE_RANKS.length - 1 && !this.crowned) {
      this.crowned = true;
      this.hold = STYLE_CFG.TOP_HOLD;
      Snd.fanfare();
      this.onTop();
    }
    Rage.sync();
  },

  /* overwrite this later for cake, confetti, a window that opens itself */
  onTop() {},

  say(text, big) {
    const d = document.createElement('div');
    d.textContent = text;
    if (big) d.className = 'big';
    this.el.log.insertBefore(d, this.el.log.firstChild);
    while (this.el.log.children.length > 5) {
      this.el.log.removeChild(this.el.log.lastChild);
    }
    setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 1600);
  },

  /* ---- the bleed ------------------------------------------------------- */
  run() {
    if (this.raf) return;
    this.prev = this.now();
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      this.frame();
    };
    this.raf = requestAnimationFrame(loop);
  },

  frame() {
    const t = this.now();
    const dt = Math.min(0.25, t - this.prev);
    this.prev = t;
    if (!CRT.on) { this.reset(); return; }

    if (this.hold > 0) {
      this.hold -= dt;
    } else if (t - this.last > STYLE_CFG.GRACE) {
      const rate = STYLE_CFG.DRAIN + STYLE_CFG.DRAIN_TIER * Math.max(0, this.tier);
      this.pts = Math.max(0, this.pts - rate * dt);
      const tier = this.rankFor(this.pts);
      if (tier !== this.tier) this.setTier(tier);
      if (this.pts <= 0 && this.tier < 0) { this.stop(); return; }
    }
    this.render();
  },

  render() {
    if (this.tier < 0) return;
    const r = STYLE_RANKS[this.tier];
    const next = STYLE_RANKS[this.tier + 1];
    const span = next ? next.at - r.at : 1;
    const frac = next ? (this.pts - r.at) / span : 1;
    const lit = Math.max(0, Math.min(16, Math.round(frac * 16)));
    for (let i = 0; i < 16; i++) this.el.cells[i].classList.toggle('on', i < lit);
    if (!next) {
      const c = STYLE_PARTY[Math.floor(this.now() * 12) % STYLE_PARTY.length];
      this.el.root.style.setProperty('--sm-col', c);
    }
  },

  hide() {
    if (!this.el) return;
    this.el.root.classList.remove('live', 'top', 'up', 'hit');
    this.el.log.innerHTML = '';
  },

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.hide();
    Rage.sync();
  },

  /* power cycle, or anything else that should wipe the run */
  reset() {
    this.pts = 0;
    this.combo = 0;
    this.tier = -1;
    this.hold = 0;
    this.stop();
  }
};

/* ---- 11.3e the sound of a file dying, by rank ----------------------------
   Bolted onto Snd rather than written into it, so the speaker above stays
   the speaker it was. Every two ranks the delete gets a bigger gun.
   ========================================================================== */
Object.assign(Snd, {
  delT(tier) {
    if (tier < 2) {              /* D–C: the stock sound, a file giving up */
      this.del();
    } else if (tier < 4) {       /* B–A: it is being taken apart */
      this.noise(120, { freq: 1500, q: 1.4, vol: 0.07 });
      this.tone(620, 130, { type: 'sawtooth', to: 90, vol: 0.05 });
      this.tone(310, 90, { type: 'square', to: 60, vol: 0.035, delay: 0.03 });
    } else if (tier < 6) {       /* S–SS: a shotgun in a server room */
      this.noise(200, { freq: 420, q: 0.6, vol: 0.11 });
      this.noise(60, { freq: 3400, q: 2.0, vol: 0.06 });
      this.tone(180, 220, { type: 'sawtooth', to: 40, vol: 0.07 });
      this.tone(880, 70, { type: 'square', to: 220, vol: 0.03, delay: 0.02 });
    } else {                     /* SSS and above: it is a party favour */
      this.noise(240, { freq: 300, q: 0.5, vol: 0.12 });
      [1046, 1318, 1568, 2093].forEach((f, i) =>
        this.tone(f, 130, { type: 'square', delay: i * 0.028, vol: 0.045 }));
      this.tone(140, 260, { type: 'sawtooth', to: 35, vol: 0.07 });
    }
  },
  /* the promotion sting: a rising fifth, higher every rank */
  rankUp(tier) {
    const base = 330 * Math.pow(1.12, tier);
    [1, 1.5, 2].forEach((m, i) =>
      this.tone(base * m, 130, { type: 'square', delay: i * 0.05, vol: 0.05 }));
    this.noise(70, { freq: 2600, q: 1.6, vol: 0.05 });
  },
  /* reserved for the birthday, and used exactly once */
  fanfare() {
    [523, 659, 784, 1046, 1318, 1568, 2093].forEach((f, i) =>
      this.tone(f, 300, { type: 'square', delay: i * 0.075, vol: 0.055 }));
    [523, 784, 1046].forEach(f =>
      this.tone(f, 900, { type: 'triangle', delay: 0.55, vol: 0.04 }));
  }
});

/* ---- 11.3f the layer over the hymn ---------------------------------------
   D minor, same key as the boot hymn, at twice its tempo, on its own bus
   under the MUS pot. One instrument joins per rank and a lowpass opens as
   you climb, so the track does not change — it stops being held back.
   ========================================================================== */
const RZ = {
  D1: 36.71, A1: 55.00, D2: 73.42, F2: 87.31, A2: 110.00, Bb2: 116.54, C3: 130.81,
  D3: 146.83, F3: 174.61, G3: 196.00, A3: 220.00, Bb3: 233.08, C4: 261.63,
  D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, Bb4: 466.16,
  C5: 523.25, D5: 587.33, F5: 698.46, A5: 880.00
};

export const Rage = {
  on: false,
  bus: null,
  filt: null,
  when: 0,
  timer: null,
  voices: [],
  bpm: (typeof HYMN !== 'undefined' ? HYMN.bpm : 92) * 2,
  step() { return 15 / this.bpm; },              /* one sixteenth, in seconds */

  ensure() {
    Snd.wake();
    if (!Snd.ctx) return false;
    if (!this.bus) {
      this.filt = Snd.ctx.createBiquadFilter();
      this.filt.type = 'lowpass';
      this.filt.frequency.value = 800;
      this.filt.Q.value = 0.6;
      this.bus = Snd.ctx.createGain();
      this.bus.gain.value = 0.0001;
      this.filt.connect(this.bus);
      this.bus.connect(Snd.ctx.destination);
    }
    return true;
  },

  keep(o) {
    this.voices.push(o);
    o.onended = () => {
      const i = this.voices.indexOf(o);
      if (i >= 0) this.voices.splice(i, 1);
    };
  },

  note(f, at, dur, type, vol, to) {
    const c = Snd.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, at);
    if (to) o.frequency.exponentialRampToValueAtTime(to, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(this.filt);
    o.start(at); o.stop(at + dur + 0.04);
    this.keep(o);
  },

  drum(at, ms, freq, q, vol) {
    const c = Snd.ctx;
    const n = Math.max(1, Math.floor(c.sampleRate * ms / 1000));
    let buf;
    try { buf = c.createBuffer(1, n, c.sampleRate); } catch (e) { return; }
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource();
    s.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(this.filt);
    s.start(at);
  },

  kick(at)  { this.note(130, at, 0.16, 'sine', 0.30, 42); },
  snare(at) { this.drum(at, 130, 1900, 0.8, 0.16); this.note(190, at, 0.09, 'triangle', 0.09, 90); },
  hat(at, v){ this.drum(at, 26, 8000, 1.6, v); },

  /* one bar of sixteen sixteenths, drawn according to how high we are */
  bar(t0, tier) {
    const s = this.step();
    const at = i => t0 + i * s;

    for (let i = 0; i < 16; i += (tier >= 5 ? 1 : 2)) this.hat(at(i), tier >= 5 ? 0.05 : 0.07);
    if (tier >= 1) [0, 4, 7, 10, 12].forEach(i => this.kick(at(i)));
    if (tier >= 6) [4, 12].forEach(i => this.snare(at(i)));

    if (tier >= 2) {
      const riff = ['D2','D2','D2','F2','D2','D2','C3','D2','D2','D2','Bb2','D2','A2','A2','C3','D2'];
      riff.forEach((n, i) => this.note(RZ[n], at(i), s * 0.85, 'square', 0.11));
    }
    if (tier >= 3) {
      [2, 6, 9, 14].forEach(i => {
        ['D3','F3','A3'].forEach(n => this.note(RZ[n], at(i), s * 1.6, 'sawtooth', 0.045));
      });
    }
    if (tier >= 4) {
      const lead = [['D4',0,2],['F4',2,2],['A4',4,2],['G4',6,1],['F4',7,1],
                    ['E4',8,2],['D4',10,1],['F4',11,1],['A4',12,2],['D5',14,2]];
      lead.forEach(n => {
        this.note(RZ[n[0]], at(n[1]), s * n[2] * 0.9, 'square', 0.075);
        if (tier >= 5) this.note(RZ[n[0]] * 2, at(n[1]), s * n[2] * 0.9, 'square', 0.03);
      });
    }
    if (tier >= 6) {
      this.note(RZ.A4, t0, s * 16, 'sawtooth', 0.028, RZ.A5);
    }
    if (tier >= 7) {
      [['D5',0,3],['D5',3,1],['E4',4,4],['D5',8,4],['A5',12,4]].forEach(n =>
        this.note(RZ[n[0]], at(n[1]), s * n[2] * 0.9, 'square', 0.07));
    }
    return 16 * s;
  },

  level() {
    if (!this.bus || !Snd.ctx) return;
    const t = Math.max(0, Style.tier);
    const now = Snd.ctx.currentTime;
    const target = Math.max(0.0002, musGain() * (0.30 + 0.085 * t));
    const g = this.bus.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(0.0001, g.value), now);
    g.exponentialRampToValueAtTime(target, now + 0.25);
    const cut = 700 * Math.pow(1.48, t);          /* 700 Hz at D, wide open at the top */
    this.filt.frequency.cancelScheduledValues(now);
    this.filt.frequency.setValueAtTime(this.filt.frequency.value, now);
    this.filt.frequency.linearRampToValueAtTime(Math.min(15000, cut), now + 0.45);
  },

  /* the one place that decides whether the layer is playing */
  sync() {
    if (!(CRT.on && Vol.mus > 0 && Style.tier >= 0)) { this.stop(); return; }
    if (this.on) this.level(); else this.start();
  },

  start() {
    if (this.on || !this.ensure()) return;
    this.on = true;
    this.when = Snd.ctx.currentTime + 0.12;
    this.level();
    this.tick();
  },

  tick() {
    if (!this.on || !Snd.ctx) return;
    const now = Snd.ctx.currentTime;
    if (this.when < now) this.when = now + 0.05;
    const len = this.bar(this.when, Math.max(0, Style.tier));
    this.when += len;
    this.timer = setTimeout(() => this.tick(), Math.max(120, len * 1000 - 300));
  },

  stop() {
    if (!this.on) return;
    this.on = false;
    clearTimeout(this.timer);
    if (!this.bus || !Snd.ctx) { this.voices = []; return; }
    const now = Snd.ctx.currentTime;
    const g = this.bus.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(0.0001, g.value), now);
    g.exponentialRampToValueAtTime(0.0001, now + 0.45);
    this.voices.forEach(o => { try { o.stop(now + 0.47); } catch (e) {} });
    this.voices = [];
  }
};
