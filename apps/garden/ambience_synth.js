/* GARDEN — the voices of the rooms, made of oscillators and filtered noise (no samples): birds, an owl, frogs, bees, thunder, rain on glass, a dripping pipe with its echo, a rat, a cat,
   traffic, a siren, a temple bell, wind chimes, a koto, a flute and a blue spirit. `createVoices(ctx, out)` returns `play(event)`, `sfx(name, arg)` and `dispose()`; every source it makes is
   stopped and disconnected when it ends. Quiet by design: the loudest of them is thunder. ambience_plan.js says what and when. */
const TAU = Math.PI * 2;
const PENTA = [1175, 1319, 1568, 1760, 2093, 2349, 2637];            /* D major pentatonic over two octaves: nothing here clashes */
const KOTO = [293.66, 329.63, 392, 440, 523.25, 587.33, 659.25];

export function createVoices(ctx, out) {
  const bufs = {};
  const noise = (kind = 'white') => {
    if (bufs[kind]) return bufs[kind];
    const n = ctx.sampleRate * 2, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (kind === 'brown') { last = (last + w * 0.06); last = Math.max(-1, Math.min(1, last)); d[i] = last * 0.8; } else d[i] = w; }
    return (bufs[kind] = b);
  };
  /* a room of air: a decaying burst of noise as the impulse. `wet` takes whatever is sent to it. */
  const wet = ctx.createGain(); wet.gain.value = 1;
  const verb = ctx.createConvolver();
  { const n = Math.floor(ctx.sampleRate * 2.4), b = ctx.createBuffer(2, n, ctx.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); } verb.buffer = b; }
  const vOut = ctx.createGain(); vOut.gain.value = 0.55; wet.connect(verb); verb.connect(vOut); vOut.connect(out);
  /* an echo for the cellar's drip: 0.23 s, going dark as it repeats */
  const echoIn = ctx.createGain(), delay = ctx.createDelay(1), fb = ctx.createGain(), lp = ctx.createBiquadFilter();
  delay.delayTime.value = 0.23; fb.gain.value = 0.42; lp.type = 'lowpass'; lp.frequency.value = 1500;
  echoIn.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(out);

  const live = new Set();
  const done = (nodes, src, t) => { src.onended = () => { nodes.forEach(n => { try { n.disconnect(); } catch (e) {} }); live.delete(src); }; live.add(src); void t; };
  /* a bus for one sound: gain, pan, and sends */
  const bus = (pan, rev, echo) => {
    const g = ctx.createGain(), nodes = [g];
    let tail = g;
    if (ctx.createStereoPanner && pan) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); nodes.push(p); tail = p; }
    tail.connect(out);
    if (rev) { const s = ctx.createGain(); s.gain.value = rev; tail.connect(s); s.connect(wet); nodes.push(s); }
    if (echo) { const s = ctx.createGain(); s.gain.value = echo; tail.connect(s); s.connect(echoIn); nodes.push(s); }
    return { g, nodes };
  };
  /* a tone that glides from f0 to f1 with an attack and an exponential decay */
  const tone = (t, { f0, f1 = f0, dur = 0.2, peak = 0.03, attack = 0.005, type = 'sine', pan = 0, rev = 0, echo = 0, lpf = 0, vib = 0 }) => {
    const o = ctx.createOscillator(), b = bus(pan, rev, echo);
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    let src = o; const nodes = [o].concat(b.nodes);
    if (lpf) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lpf; o.connect(f); f.connect(b.g); nodes.push(f); } else o.connect(b.g);
    if (vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = vib; lg.gain.value = f0 * 0.02; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.1); nodes.push(l, lg); }
    b.g.gain.setValueAtTime(0.0001, t); b.g.gain.linearRampToValueAtTime(peak, t + attack); b.g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.05); done(nodes, src, t);
  };
  /* a burst of noise through a filter */
  const puff = (t, { f = 2000, q = 1, dur = 0.1, peak = 0.03, attack = 0.004, type = 'bandpass', kind = 'white', pan = 0, rev = 0, f1 = 0 }) => {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), b = bus(pan, rev, 0);
    s.buffer = noise(kind); fl.type = type; fl.frequency.setValueAtTime(f, t); if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur); fl.Q.value = q;
    s.connect(fl); fl.connect(b.g);
    b.g.gain.setValueAtTime(0.0001, t); b.g.gain.linearRampToValueAtTime(peak, t + attack); b.g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.start(t, Math.random() * 1.2); s.stop(t + dur + 0.05); done([s, fl].concat(b.nodes), s, t);
  };
  const bell = (t, f, { peak = 0.05, dur = 6, pan = 0, rev = 0.9 } = {}) => [[0.5, 0.5, 1], [1, 1, 0.9], [1.19, 0.5, 0.7], [1.5, 0.35, 0.55], [2, 0.5, 0.5], [2.74, 0.25, 0.35], [3.9, 0.15, 0.25]].forEach(([r, a, d]) => tone(t, { f0: f * r, dur: dur * d, peak: peak * a, attack: 0.004, pan, rev }));

  const V = {
    bird: (t, e) => {
      const base = 2400 + e.v * 1500, p = e.pan, g = e.near ? 0.045 : 0.028, kind = Math.floor(e.v * 4);
      if (kind === 0) for (let i = 0; i < 3; i++) tone(t + i * 0.11, { f0: base, f1: base * 1.35, dur: 0.07, peak: g, pan: p, rev: 0.2 });
      else if (kind === 1) for (let i = 0; i < 9; i++) tone(t + i * 0.045, { f0: base * (i & 1 ? 1.1 : 0.95), dur: 0.035, peak: g * 0.8, pan: p, rev: 0.2 });
      else if (kind === 2) { tone(t, { f0: base * 0.8, f1: base, dur: 0.18, peak: g, pan: p, rev: 0.3 }); tone(t + 0.26, { f0: base * 0.9, f1: base * 0.65, dur: 0.3, peak: g, pan: p, rev: 0.3 }); }
      else tone(t, { f0: base * 0.7, f1: base * 0.9, dur: 0.45, peak: g, pan: p, rev: 0.3, vib: 38 });
    },
    sparrow: (t, e) => { for (let i = 0; i < 3; i++) tone(t + i * 0.09, { f0: 3300 + e.v * 400, f1: 3000, dur: 0.04, peak: 0.02, pan: e.pan }); },
    owl: (t, e) => { tone(t, { f0: 430, f1: 400, dur: 0.55, peak: 0.05, attack: 0.08, pan: e.pan, rev: 0.8, lpf: 900 }); tone(t + 0.8, { f0: 380, f1: 340, dur: 0.9, peak: 0.05, attack: 0.08, pan: e.pan, rev: 0.8, lpf: 900 }); },
    frog: (t, e) => { for (let i = 0; i < 2 + Math.floor(e.v * 3); i++) { tone(t + i * 0.18, { f0: 170 + e.v * 40, f1: 130, dur: 0.12, peak: 0.03, type: 'square', pan: e.pan, lpf: 700 }); puff(t + i * 0.18, { f: 600, q: 3, dur: 0.1, peak: 0.01, pan: e.pan }); } },
    bee: (t, e) => { const o = ctx.createOscillator(), g = bus(-0.9, 0.1, 0), f = ctx.createBiquadFilter(), pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null; o.type = 'sawtooth'; o.frequency.setValueAtTime(180 + e.v * 40, t); f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 3; o.connect(f); f.connect(g.g); g.g.gain.setValueAtTime(0.0001, t); g.g.gain.linearRampToValueAtTime(0.02, t + 0.3); g.g.gain.linearRampToValueAtTime(0.0001, t + 1.2); o.start(t); o.stop(t + 1.3); done([o, f].concat(g.nodes), o, t); void pn; },
    leaf: (t, e) => { puff(t, { f: 3600, q: 0.7, dur: 0.9, peak: 0.03, attack: 0.3, type: 'highpass', pan: e.pan }); puff(t + 0.2, { f: 5200, q: 1.5, dur: 0.5, peak: 0.02, attack: 0.2, pan: e.pan }); },
    crow: (t, e) => { for (let i = 0; i < 2; i++) { tone(t + i * 0.3, { f0: 420, f1: 260, dur: 0.2, peak: 0.04, type: 'sawtooth', pan: e.pan, lpf: 1500, rev: 0.5 }); puff(t + i * 0.3, { f: 1000, q: 2, dur: 0.15, peak: 0.02, pan: e.pan }); } },
    plink: (t, e) => tone(t, { f0: 1500 + e.v * 1700, f1: 1200 + e.v * 900, dur: 0.05, peak: 0.011, pan: e.pan }),
    thunder: (t, e) => { puff(t, { f: 260, f1: 70, q: 0.6, type: 'lowpass', dur: 3.2 + e.v * 2.4, peak: 0.2, attack: 0.5 }); tone(t, { f0: 52, f1: 36, dur: 3, peak: 0.1, attack: 0.4, lpf: 120 }); puff(t + 0.9, { f: 180, q: 0.5, type: 'lowpass', dur: 2.2, peak: 0.1, attack: 0.3 }); },
    pipe: (t, e) => { tone(t, { f0: 540, dur: 0.5, peak: 0.03, pan: e.pan, rev: 0.5 }); tone(t, { f0: 812, dur: 0.35, peak: 0.02, pan: e.pan, rev: 0.5 }); puff(t, { f: 1800, q: 2, dur: 0.05, peak: 0.04, pan: e.pan }); },
    creakGlass: (t, e) => { for (let i = 0; i < 4; i++) tone(t + i * 0.07, { f0: 620 + i * 25 + e.v * 100, f1: 560, dur: 0.07, peak: 0.01, type: 'triangle', pan: e.pan }); },
    mist: (t, e) => puff(t, { f: 6000, q: 0.5, dur: 1.9, peak: 0.045, attack: 0.08, type: 'highpass', pan: e.pan, rev: 0.2 }),
    drip: (t, e) => e.deep ? tone(t, { f0: 800 + e.v * 100, f1: 260, dur: 0.14, peak: 0.07, pan: e.pan, rev: 0.7, echo: 0.9 }) : (tone(t, { f0: 1700 + e.v * 400, f1: 900, dur: 0.07, peak: 0.03, pan: e.pan, rev: 0.25 }), puff(t, { f: 3000, q: 3, dur: 0.02, peak: 0.01, pan: e.pan })),
    creak: (t, e) => { for (let i = 0; i < 9; i++) tone(t + i * 0.1, { f0: 120 + Math.sin(i * 1.3) * 30, f1: 100, dur: 0.1, peak: 0.02, type: 'sawtooth', pan: e.pan, lpf: 420, rev: 0.8 }); },
    scurry: (t, e) => { for (let i = 0; i < 12; i++) puff(t + i * (0.03 + e.v * 0.02), { f: 4200, q: 4, dur: 0.012, peak: 0.02, pan: -0.8 + i * 0.13 }); },
    gurgle: (t, e) => { for (let i = 0; i < 5; i++) tone(t + i * 0.09, { f0: 200 + i * 40 + e.v * 40, f1: 320, dur: 0.1, peak: 0.02, pan: e.pan, lpf: 600, rev: 0.6 }); },
    zap: (t) => { for (let i = 0; i < 4; i++) { tone(t + i * 0.09, { f0: 100, dur: 0.06, peak: 0.04, type: 'square', lpf: 500 }); puff(t + i * 0.09, { f: 2400, q: 1, dur: 0.05, peak: 0.03 }); } },
    car: (t, e) => { const dir = e.v < 0.5 ? 1 : -1; puff(t, { f: 260, f1: 760, q: 1, dur: 2.4, peak: 0.035, attack: 1.0, pan: -dir * 0.8, rev: 0.4 }); tone(t, { f0: 62 + e.v * 20, f1: 70, dur: 2.4, peak: 0.02, attack: 1.0, pan: -dir * 0.8, lpf: 160 }); },
    horn: (t, e) => { [349, 440].forEach(f => tone(t, { f0: f, dur: 0.35, peak: 0.02, type: 'triangle', attack: 0.02, pan: e.pan, lpf: 1200, rev: 0.7 })); if (e.v > 0.5) [349, 440].forEach(f => tone(t + 0.45, { f0: f, dur: 0.2, peak: 0.02, type: 'triangle', pan: e.pan, lpf: 1200, rev: 0.7 })); },
    siren: (t, e) => { for (let i = 0; i < 4; i++) tone(t + i * 1.0, { f0: i & 1 ? 880 : 640, f1: i & 1 ? 640 : 880, dur: 1.0, peak: 0.014, attack: 0.3, pan: e.pan, lpf: 1800, rev: 0.8 }); },
    meow: (t, e) => { const dur = 0.55; [[820, 0.03], [1800, 0.02]].forEach(([fq, g]) => { const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), b = bus(e.pan, 0.2, 0); o.type = 'sawtooth'; o.frequency.setValueAtTime(480, t); o.frequency.linearRampToValueAtTime(740, t + 0.15); o.frequency.linearRampToValueAtTime(560, t + dur); f.type = 'bandpass'; f.frequency.value = fq; f.Q.value = 4; o.connect(f); f.connect(b.g); b.g.gain.setValueAtTime(0.0001, t); b.g.gain.linearRampToValueAtTime(g, t + 0.06); b.g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.start(t); o.stop(t + dur + 0.05); done([o, f].concat(b.nodes), o, t); }); },
    flag: (t, e) => { for (let i = 0; i < 7; i++) puff(t + i * (0.05 + (i % 3) * 0.03), { f: 700, q: 0.8, dur: 0.04, peak: 0.025, type: 'lowpass', pan: e.pan }); },
    tinkle: (t, e) => { for (let i = 0; i < 3; i++) tone(t + i * 0.07, { f0: 4000 + (i * 733 + e.v * 900) % 1400, dur: 0.12, peak: 0.008, pan: e.pan, rev: 0.3 }); },
    pigeon: (t, e) => { [0, 0.28, 0.5].forEach((d, i) => tone(t + d, { f0: 300 - i * 18, f1: 250, dur: 0.22, peak: 0.02, pan: e.pan, lpf: 700, vib: 14 })); },
    plane: (t) => { puff(t, { f: 380, f1: 260, q: 2, dur: 14, peak: 0.02, attack: 6, pan: -0.5, rev: 0.4 }); tone(t, { f0: 90, f1: 70, dur: 14, peak: 0.012, attack: 6, lpf: 200 }); },
    bell: (t, e) => bell(t, 196 * (e.v < 0.5 ? 1 : 0.75), { peak: 0.05, dur: 7, pan: e.pan * 0.4, rev: 1 }),
    chime: (t, e) => { const n = 3 + Math.floor(e.v * 4); for (let i = 0; i < n; i++) { const f = PENTA[Math.floor(((e.v * 977 + i * 3.7) % 1) * PENTA.length)]; tone(t + i * (0.1 + (i % 3) * 0.1), { f0: f, dur: 1.6, peak: 0.016, attack: 0.002, pan: e.pan * 0.8, rev: 0.7 }); tone(t + i * (0.1 + (i % 3) * 0.1), { f0: f * 2.76, dur: 0.5, peak: 0.005, attack: 0.002, pan: e.pan * 0.8, rev: 0.7 }); } },
    pluck: (t, e) => { const a = Math.floor(e.v * KOTO.length), n = 2 + Math.floor(e.v * 3); for (let i = 0; i < n; i++) { const f = KOTO[(a + i * 2) % KOTO.length]; tone(t + i * 0.22, { f0: f * 1.2, f1: f, dur: 1.0, peak: 0.03, attack: 0.002, type: 'triangle', pan: e.pan * 0.5, rev: 0.6, lpf: 3200 }); } },
    flute: (t, e) => { const f = e.v < 0.5 ? 587.33 : 440; tone(t, { f0: f * 0.9, f1: f, dur: 2.6, peak: 0.024, attack: 0.35, pan: e.pan * 0.3, rev: 0.9, vib: 5, lpf: 2400 }); puff(t, { f, q: 14, dur: 2.4, peak: 0.01, attack: 0.3, pan: e.pan * 0.3, rev: 0.9 }); },
    spirit: (t, e) => { tone(t, { f0: 660, f1: 990 + e.v * 200, dur: 3.2, peak: 0.014, attack: 1.2, pan: e.pan, rev: 1, vib: 6 }); tone(t, { f0: 665, f1: 996 + e.v * 200, dur: 3.2, peak: 0.012, attack: 1.2, pan: -e.pan, rev: 1, vib: 4 }); },
    crackle: (t, e) => puff(t, { f: 2200 + e.v * 2000, q: 1, dur: 0.012 + e.v * 0.02, peak: 0.012 + e.v * 0.015, type: 'highpass', pan: e.pan * 0.4 }),
    enter: (t, e) => {
      if (e.room === 'yard') { tone(t, { f0: 3000, f1: 3800, dur: 0.07, peak: 0.03, pan: -0.3 }); tone(t + 0.12, { f0: 3400, f1: 4000, dur: 0.07, peak: 0.03, pan: -0.3 }); }
      else if (e.room === 'greenhouse') { tone(t, { f0: 2093, dur: 0.9, peak: 0.025, rev: 0.6 }); tone(t + 0.05, { f0: 3136, dur: 0.7, peak: 0.015, rev: 0.6 }); puff(t, { f: 6500, q: 0.5, dur: 0.6, peak: 0.02, type: 'highpass' }); }
      else if (e.room === 'cellar') { tone(t, { f0: 70, f1: 42, dur: 0.6, peak: 0.12, lpf: 200 }); tone(t + 0.4, { f0: 800, f1: 260, dur: 0.14, peak: 0.05, rev: 0.7, echo: 0.9 }); }
      else if (e.room === 'rooftop') puff(t, { f: 300, f1: 1700, q: 1.2, dur: 1.0, peak: 0.04, attack: 0.5, pan: 0 });
      else if (e.room === 'shrine') bell(t, 293.66, { peak: 0.035, dur: 4, rev: 1 });
    }
  };

  const sfx = {
    water: (t) => { puff(t, { f: 1800, q: 0.8, dur: 0.35, peak: 0.05, attack: 0.02 }); for (let i = 0; i < 5; i++) tone(t + 0.04 + i * 0.05, { f0: 1000 + i * 260, f1: 600, dur: 0.06, peak: 0.02 }); },
    soil: (t) => { puff(t, { f: 380, q: 0.8, dur: 0.12, peak: 0.07, type: 'lowpass' }); tone(t, { f0: 130, f1: 70, dur: 0.12, peak: 0.06, lpf: 300 }); },
    pull: (t) => { puff(t, { f: 500, f1: 1800, q: 1, dur: 0.22, peak: 0.05, attack: 0.04 }); puff(t + 0.12, { f: 300, q: 1, dur: 0.1, peak: 0.05, type: 'lowpass' }); },
    sparkle: (t, chain) => { const n = 3 + Math.min(4, chain); for (let i = 0; i < n; i++) tone(t + i * 0.05, { f0: PENTA[(i * 2 + chain) % PENTA.length] * 1.5, dur: 0.35, peak: 0.016, attack: 0.002, rev: 0.5, pan: (i % 2 ? 1 : -1) * 0.4 }); },
    ready: (t) => { tone(t, { f0: 2349, dur: 0.5, peak: 0.01, rev: 0.7 }); tone(t + 0.09, { f0: 3136, dur: 0.6, peak: 0.008, rev: 0.7 }); }
  };

  return {
    play(e) { try { const f = V[e.kind]; if (f) f(ctx.currentTime + (e.delay || 0.01), e); } catch (err) { /* a sound must never break the garden */ } },
    sfx(name, arg) { try { const f = sfx[name]; if (f) f(ctx.currentTime + 0.005, arg || 0); } catch (err) { /* ditto */ } },
    kinds: () => Object.keys(V),
    sfxKinds: () => Object.keys(sfx),
    dispose() { live.forEach(s => { try { s.stop(); } catch (e) {} }); live.clear(); [wet, verb, vOut, echoIn, delay, fb, lp].forEach(n => { try { n.disconnect(); } catch (e) {} }); }
  };
}
void TAU;
