# TempleOS — STYLE METER snippets (integrated)

All four snippets are now live in `templeos(7).html`. What follows is kept as the
reference for the design and the tuning knobs; the code below matches what shipped.

## Behaviour, as built

- **Points, not deletes.** Every deleted file adds points. A chain (another delete
  within `COMBO_WINDOW`) adds a bonus on top, so a fast rampage is worth roughly
  double a slow one.
- **True drain.** `GRACE` seconds after the last delete the meter starts bleeding,
  and the rank falls back down through the letters. Stop deleting and you lose it.
- **Ranks:** D DESECRATING · C CORRUPTING · B BLASPHEMOUS · A ANNIHILATING ·
  S SACRILEGIOUS · SS SSCORCHED EARTH · SSS SSSTEFAN BOERUSTORM · **HAPPY BIRTHDAY**.
- **Music** layers *on top of* the lobby hymn: same key (D minor), double time, one
  more instrument per rank, filter opening as you climb. It rides the MUS pot and
  goes quiet with the power switch.
- **Delete SFX** swaps every two ranks: dry noise burst at D, shotgun at SS,
  a full chord at the top.
- Sits in the top right **inside `#tube`** at `z-index: 8000` — over the menubar,
  windows and toast, under `#glass`, `#degauss`, `#saver` and the bezel. Palette
  colours only, `image-rendering: pixelated`, VT323, whole-pixel jitter.

## Tuning (all in `STYLE_CFG`, Snippet 3)

| Knob | Value | What it does |
|---|---|---|
| `BASE` | 220 | points per file |
| `COMBO_STEP` / `COMBO_MAX` | 40 / 200 | chain bonus growth and ceiling |
| `COMBO_WINDOW` | 3.5 s | how long a chain stays alive |
| `GRACE` | 2.2 s | quiet time before the drain starts |
| `DRAIN` / `DRAIN_TIER` | 55 / 22 per s | bleed at D, extra per rank above it |
| `TOP_HOLD` | 8 s | the birthday rank is frozen this long the first time |

Thresholds live in `STYLE_RANKS[].at`. As tuned, an unbroken chain reaches HAPPY
BIRTHDAY at roughly 35 deletes; break the chain often and you'll never get there.

---

## SNIPPET 1 — HTML

Paste inside `#tube`, immediately after the `<div id="degauss" aria-hidden="true"></div>` line.

```html
<!-- ============================ STYLE METER ============================= -->
<!-- Built by Style.mount(); the bar cells are generated so this stays short. -->
<div id="smeter" aria-hidden="true">
  <div id="sm-grade"><span id="sm-key">D</span></div>
  <div id="sm-name">DESECRATING</div>
  <div id="sm-bar"></div>
  <div id="sm-log"></div>
</div>
```

---

## SNIPPET 2 — CSS

Paste at the end of the `<style>` block, after the `::-webkit-scrollbar-thumb` rule.

```css
/* ==========================================================================
   THE STYLE METER
   Sits in the picture, not on the glass: it is inside #tube, so the lens
   zooms it with everything else. 8000 clears the shell and the toast and
   still leaves the degauss flash (9998), the saver (9000) and the glass
   (9999) on top of it. Palette colours only; every shadow is a hard black
   offset, every animation moves in whole pixels and snaps with steps().
   ========================================================================== */
#smeter {
  position: absolute;
  top: 30px;                 /* clears the menubar. Set to 4px to overlap it. */
  right: 10px;
  z-index: 8000;
  display: none;
  pointer-events: none;
  user-select: none;
  text-align: right;
  width: clamp(150px, 26vmin, 330px);
  font-family: 'VT323', 'Courier New', monospace;
  line-height: 1;
  -webkit-font-smoothing: none;
  image-rendering: pixelated;
  --sm-col: #AAAAAA;
}
#smeter.live { display: block; }

#sm-grade {
  font-size: clamp(38px, 9.5vmin, 104px);
  letter-spacing: -0.04em;
  color: var(--sm-col);
  text-shadow: 3px 3px 0 #000000;
}
#sm-name {
  font-size: clamp(13px, 2.3vmin, 26px);
  letter-spacing: 1px;
  color: var(--sm-col);
  text-shadow: 2px 2px 0 #000000;
  margin-top: -2px;
  white-space: nowrap;
  overflow: hidden;
}

/* the drain bar: sixteen blocks, no interpolation, no rounded ends */
#sm-bar {
  display: flex;
  gap: 2px;
  justify-content: flex-end;
  margin-top: 5px;
}
#sm-bar b {
  flex: 1 1 0;
  height: clamp(6px, 1.3vmin, 13px);
  background: #000000;
  border: 1px solid #555555;
}
#sm-bar b.on {
  background: var(--sm-col);
  border-color: #FFFFFF;
}

/* the running tally under the bar, newest at the top */
#sm-log {
  margin-top: 4px;
  font-size: clamp(11px, 1.8vmin, 20px);
  letter-spacing: 1px;
  color: #AAAAAA;
  text-shadow: 1px 1px 0 #000000;
}
#sm-log div {
  animation: sm-fade 1500ms steps(3, end) forwards;
}
#sm-log div.big { color: var(--sm-col); }
@keyframes sm-fade {
  0%, 55% { opacity: 1; }
  100%    { opacity: 0; }
}

/* the hit: one frame of whole-pixel recoil */
#smeter.hit #sm-grade { animation: sm-shake 120ms steps(1, end); }
@keyframes sm-shake {
  0%   { transform: translate(-3px, 1px); }
  33%  { transform: translate(2px, -2px); }
  66%  { transform: translate(-1px, 0); }
  100% { transform: translate(0, 0); }
}

/* the promotion: a hard three-step pop, never a smooth scale */
#smeter.up #sm-grade { animation: sm-pop 260ms steps(1, end); }
#smeter.up #sm-name  { animation: sm-blink 260ms steps(1, end); }
@keyframes sm-pop {
  0%   { transform: scale(1.7); }
  40%  { transform: scale(1.25); }
  70%  { transform: scale(0.92); }
  100% { transform: scale(1); }
}
@keyframes sm-blink {
  0%, 60% { color: #FFFFFF; }
  100%    { color: var(--sm-col); }
}

/* the top rank shakes on its own until it starts to drain */
#smeter.top #sm-grade { animation: sm-rave 180ms steps(1, end) infinite; }
@keyframes sm-rave {
  0%   { transform: translate(-2px, 0)  scale(1.06); }
  50%  { transform: translate(2px, -2px) scale(1); }
  100% { transform: translate(0, 1px)   scale(1.04); }
}

@media (prefers-reduced-motion: reduce) {
  #smeter.hit #sm-grade,
  #smeter.up  #sm-grade,
  #smeter.up  #sm-name,
  #smeter.top #sm-grade { animation: none; }
}
```

---

## SNIPPET 3 — JavaScript

Paste in the `<script>` block, straight after the `Music` object closes (before
`/* ---- 11.4 the knobs on the chin --- */`). It reads `Snd`, `Vol`, `CRT`,
`musGain()` and `HYMN.bpm`, all of which exist by then.

```javascript
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

const Style = {
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

const Rage = {
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
```

---

## SNIPPET 4 — the five hooks

### 4.1 `deleteNode()` — the main scorer
`doDel()` in the terminal calls this too, so both delete paths are covered.

```javascript
  refreshViews();
  Snd.del();                                  // ← replace this line
  toast('DELETED ' + node.name);
```
becomes
```javascript
  refreshViews();
  Style.hit(node, node.type === 'folder' ? countFiles(node) : 1);
  toast('DELETED ' + node.name);
```

and add this helper next to `deleteNode`:

```javascript
/* a folder is worth what is inside it */
function countFiles(node) {
  if (!node || node.type !== 'folder') return 1;
  let n = 0;
  (node.children || []).forEach(c => { n += countFiles(c); });
  return Math.max(1, n);
}
```

### 4.2 `clearUploads()` — one action, many bodies

```javascript
async function clearUploads() {
  const n = uploadList.length;               // ← add
  uploadList.slice().forEach(u => {
    ...
  });
  ...
  refreshViews();
  if (n) Style.hit(null, n);                 // ← add, before the toast
  toast('ALL UPLOADS CLEARED. C:/ IS BACK TO STOCK.');
}
```

### 4.3 `powerOff()` — the run dies with the picture

```javascript
  Snd.thunk();
  Music.stop();
  Style.reset();                             // ← add
  CRT.on = false;
```

### 4.4 the MUS pot and the LOBBY switch — the layer rides with them

In `wirePanel()`'s `pot-mus` handler and in `setLobby()`, add a line beside the
existing `Music.sync();`:

```javascript
    Music.sync();
    Rage.sync();                             // ← add, both places
```

### 4.5 `powerOn()` — nothing to add
The meter is dormant after a reset and only reappears on the next delete. If you'd
rather it survive a power cycle, drop 4.3 and the `if (!CRT.on) this.reset()` line
inside `Style.frame()`.

---

## Testing without uploading thirty files

With the console open:

```javascript
Style.hit(null, 1)     // one delete, sound and all
Style.pts = 7300; Style.setTier(6); Style.run()   // jump to SSS
Style.pts = 9500; Style.setTier(7); Style.run()   // the birthday
Style.reset()
```

The music needs the MUS pot above 0 and one prior user gesture, same as the hymn.

## Two things I left for you

- `Style.onTop()` is an empty function on purpose — that's where the cake goes.
- The bulk clear is capped at `BULK_CAP` files so one right-click can't hand you
  SSS. Raise it if you'd rather it could.
