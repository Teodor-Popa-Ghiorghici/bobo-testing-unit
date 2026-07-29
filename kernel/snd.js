import { CRT, Vol, sfxGain } from './hardware.js';

export const Snd = {
  ctx: null,
  sfx: null,
  mech: null,
  wake() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.ctx = new AC(); } catch (e) { return; }
    }
    if (!this.sfx) {
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = sfxGain();
      this.sfx.connect(this.ctx.destination);
      this.mech = this.ctx.createGain();
      this.mech.gain.value = 0.8;
      this.mech.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  /* a context that has not been resumed yet reports currentTime 0 forever;
     scheduling a hair late keeps the first click from being swallowed */
  at(opt) {
    const lead = (this.ctx.state === 'running') ? 0 : 0.06;
    return this.ctx.currentTime + lead + (opt.delay || 0);
  },
  tone(freq, ms, opt) {
    opt = opt || {};
    if (!opt.mech && (!CRT.on || Vol.sfx <= 0)) return;
    this.wake();
    if (!this.ctx) return;
    const t0 = this.at(opt);
    const dur = ms / 1000;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = opt.type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (opt.to) osc.frequency.exponentialRampToValueAtTime(opt.to, t0 + dur);
    const vol = (opt.vol == null) ? 0.045 : opt.vol;
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(vol, t0 + 0.005);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp);
    amp.connect(opt.mech ? this.mech : this.sfx);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  },
  /* filtered white noise: keycaps, drawer slams, the sound of a file dying */
  noise(ms, opt) {
    opt = opt || {};
    if (!opt.mech && (!CRT.on || Vol.sfx <= 0)) return;
    this.wake();
    if (!this.ctx) return;
    let buf;
    try {
      const n = Math.max(1, Math.floor(this.ctx.sampleRate * ms / 1000));
      buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    } catch (e) { return; }
    const t0 = this.at(opt);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = opt.freq || 1800;
    f.Q.value = opt.q || 1;
    const amp = this.ctx.createGain();
    amp.gain.value = (opt.vol == null) ? 0.05 : opt.vol;
    src.connect(f); f.connect(amp); amp.connect(opt.mech ? this.mech : this.sfx);
    src.start(t0);
  },

  /* --- the panel, in plastic -------------------------------------------- */
  /* a pot detent: the spring leaf dropping into the next notch. Every click
     is pitched slightly differently, because no two notches are the same. */
  detent(step, delay) {
    const j = ((step % 4) - 1.5) * 90;
    const d = delay || 0;
    this.noise(11, { mech: true, delay: d, freq: 2350 + j + Math.random() * 260, q: 2.4, vol: 0.52 });
    this.tone(176 + Math.random() * 26, 15, { mech: true, delay: d, type: 'triangle', vol: 0.10 });
  },
  /* the shaft hitting the end of its travel: no click, just a dull stop */
  endstop() {
    this.noise(55, { mech: true, freq: 420, q: 0.7, vol: 0.40 });
    this.tone(88, 70, { mech: true, type: 'triangle', to: 48, vol: 0.13 });
  },
  grip() { this.noise(28, { mech: true, freq: 620, q: 0.8, vol: 0.16 }); },
  /* a slim rocker: the snap of the spring, then the body of the plate */
  clackOn() {
    this.noise(7,  { mech: true, freq: 3300, q: 2.6, vol: 0.55 });
    this.noise(42, { mech: true, freq: 330,  q: 0.8, vol: 0.42, delay: 0.016 });
    this.tone(124, 70, { mech: true, type: 'triangle', to: 62, vol: 0.14, delay: 0.016 });
  },
  clackOff() {
    this.noise(6,  { mech: true, freq: 2300, q: 2.2, vol: 0.44 });
    this.noise(55, { mech: true, freq: 235,  q: 0.7, vol: 0.40, delay: 0.022 });
    this.tone(96, 85, { mech: true, type: 'triangle', to: 44, vol: 0.13, delay: 0.022 });
  },

  /* --- windows ---------------------------------------------------------- */
  open()  { this.tone(660, 30); this.tone(990, 40, { delay: 0.035 }); },
  close() { this.tone(520, 55, { to: 220 }); },
  min()   { this.tone(760, 90, { to: 240, vol: 0.035 }); },
  grab()  { this.tone(320, 26, { type: 'triangle', vol: 0.028 }); },
  drop()  { this.tone(190, 70, { type: 'triangle', to: 110, vol: 0.045 }); },

  /* --- controls --------------------------------------------------------- */
  click()  { this.noise(16, { freq: 2600, q: 1.2, vol: 0.05 }); this.tone(1500, 12, { vol: 0.012 }); },
  press()  { this.noise(28, { freq: 900, q: 1.4, vol: 0.075 }); this.tone(240, 32, { vol: 0.022 }); },
  select() { this.tone(1180, 16, { vol: 0.018 }); },
  menu()   { this.tone(700, 16, { vol: 0.02 }); this.tone(1050, 22, { delay: 0.022, vol: 0.02 }); },
  blip()   { this.tone(1560, 14, { vol: 0.02 }); },

  /* --- typing ----------------------------------------------------------- */
  key()   { this.tone(1800, 8, { vol: 0.015 }); },
  type()  { this.noise(9, { freq: 3000, q: 0.9, vol: 0.03 }); },
  enter() { this.tone(880, 24, { vol: 0.03 }); this.tone(1320, 34, { delay: 0.028, vol: 0.03 }); },

  /* --- verdicts --------------------------------------------------------- */
  ok()    { this.tone(1320, 35); },
  err()   { this.tone(150, 170, { type: 'sawtooth', vol: 0.04 }); },
  chirp() { this.tone(988, 40, { vol: 0.03 }); this.tone(1318, 55, { delay: 0.045, vol: 0.03 }); },
  page()  { this.noise(90, { freq: 1200, q: 0.5, vol: 0.028 }); },
  del()   { this.noise(160, { freq: 700, q: 0.6, vol: 0.055 });
            this.tone(420, 150, { type: 'sawtooth', to: 80, vol: 0.04 }); },
  save()  { [784, 1046, 1318].forEach((f, i) => this.tone(f, 50, { delay: i * 0.05, vol: 0.035 })); },
  holy()  { [523, 784, 1046, 1318].forEach((f, i) =>
              this.tone(f, 420, { type: 'triangle', delay: i * 0.07, vol: 0.035 }));
            this.tone(2093, 240, { delay: 0.3, vol: 0.013 }); },
  bell()  { [1046, 1318, 1568].forEach((f, i) => this.tone(f, 130, { delay: i * 0.085, vol: 0.04 })); },
  boot()  { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 85, { delay: i * 0.095, vol: 0.04 })); },
  thunk() { this.tone(95, 240, { type: 'triangle', to: 28, vol: 0.08 }); }
};

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

Object.assign(Snd, {
  /* three notes up, bright, over in a fifth of a second */
  coin() {
    [1046, 1318, 1568].forEach((f, i) =>
      this.tone(f, 70, { type: 'triangle', delay: i * 0.045, vol: 0.05 }));
  },
  /* five notes that actually resolve, for money leaving your hands */
  purchase() {
    [523, 659, 784, 1046, 784].forEach((f, i) =>
      this.tone(f, 130, { type: 'triangle', delay: i * 0.075, vol: 0.045 }));
    this.tone(1568, 260, { type: 'triangle', delay: 0.36, vol: 0.03 });
  },
  /* two tones down, and he is rude about it */
  deny() {
    this.tone(320, 120, { type: 'square', vol: 0.045 });
    this.tone(190, 200, { type: 'square', delay: 0.11, vol: 0.045 });
  },
  /* a plant, poked. Pentatonic, so any order is a tune. */
  pluck(hz) {
    this.tone(hz, 420, { type: 'triangle', vol: 0.055 });
    this.tone(hz * 2, 180, { type: 'sine', vol: 0.016, delay: 0.01 });
  },
  water() { this.noise(260, { freq: 900, q: 0.6, vol: 0.03 }); },
  /* a silk-wrapped pin going into stone */
  pin()   { this.noise(40, { freq: 2600, q: 3.2, vol: 0.05 }); this.tone(520, 60, { type: 'triangle', to: 880, vol: 0.02 }); },
  dig()   { this.noise(55, { freq: 480, q: 0.8, vol: 0.045 }); },
  /* something in the stone waking up */
  chitter(d) {
    this.noise(60, { freq: 2200 + Math.random() * 1800, q: 5, vol: 0.03, delay: d || 0 });
    this.tone(140 + Math.random() * 90, 90, { type: 'sawtooth', to: 60, vol: 0.02, delay: d || 0 });
  },
  drip(d) { this.tone(1400, 60, { type: 'sine', to: 700, vol: 0.02, delay: d || 0 }); },
  /* the chamber warming up */
  chime() {
    [784, 1046, 1318, 1568].forEach((f, i) =>
      this.tone(f, 700, { type: 'sine', delay: i * 0.11, vol: 0.035 }));
  },
  shuffle() { this.noise(300, { freq: 1500, q: 0.5, vol: 0.045 }); },
  flick()   { this.noise(22, { freq: 2400 + Math.random() * 900, q: 1.6, vol: 0.035 }); },
  snap()    { this.noise(16, { freq: 1600, q: 2.2, vol: 0.045 }); this.tone(600, 18, { vol: 0.015 }); },
  fanfare() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 200, { type: 'triangle', delay: i * 0.09, vol: 0.05 })); },
  /* crayon on paper, pitched by how fast the hand is moving */
  scratch(speed) {
    this.noise(30, { freq: 700 + Math.min(2400, speed * 800), q: 0.7, vol: 0.014 });
  }
});

window.Snd = Snd;

document.addEventListener('click', () => { Snd.wake(); }, { once: false });
