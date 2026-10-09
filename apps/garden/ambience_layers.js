/* GARDEN — the beds under everything: wind, rain, crickets, a city, the cellar's drone, the shrine's pad, a hum, a hearth. Each is a small graph of looping noise or oscillators that
   is always running (stopped only with the window) and has a gain that is moved toward whatever ambience_plan.js says, slowly, so a room fades into the next. */
const BASE = { wind: 0.22, rain: 0.13, cricket: 1, city: 0.16, drone: 0.1, pad: 0.07, hum: 0.04, fire: 0.05 };

export function createLayers(ctx, out) {
  const nodes = [], gains = {};
  const own = n => { nodes.push(n); return n; };
  const loop = kind => {
    const n = ctx.sampleRate * 3, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (kind === 'brown') { last = Math.max(-1, Math.min(1, last + w * 0.06)); d[i] = last * 0.7; } else d[i] = w * 0.5; }
    const s = own(ctx.createBufferSource()); s.buffer = b; s.loop = true; s.start(); return s;
  };
  const bed = name => { const g = own(ctx.createGain()); g.gain.value = 0; g.connect(out); gains[name] = g; return g; };
  const lfo = (freq, depth, target) => { const o = own(ctx.createOscillator()), g = own(ctx.createGain()); o.frequency.value = freq; g.gain.value = depth; o.connect(g); g.connect(target); o.start(); return o; };
  const filt = (type, f, q = 0.7) => { const x = own(ctx.createBiquadFilter()); x.type = type; x.frequency.value = f; x.Q.value = q; return x; };

  /* the wind: brown noise through a low-pass that opens and closes slowly, and a slower swell on its level */
  { const g = bed('wind'), f = filt('lowpass', 420), s = loop('brown'); s.connect(f); f.connect(g); lfo(0.06, 190, f.frequency); lfo(0.11, 0.04, g.gain); }
  /* rain: white noise, the lows taken off, a band of patter and a sheen of hiss */
  { const g = bed('rain'), hp = filt('highpass', 900), bp = filt('peaking', 3600, 0.5); bp.gain.value = 5; const s = loop('white'); s.connect(hp); hp.connect(bp); bp.connect(g); lfo(0.3, 0.02, g.gain); }
  /* crickets: two high sines, each switched on and off at a rate no cricket would argue with, in groups */
  { const g = bed('cricket'); [4310, 4460].forEach((fq, i) => { const o = own(ctx.createOscillator()), amp = own(ctx.createGain()), mod = own(ctx.createOscillator()), md = own(ctx.createGain()), grp = own(ctx.createOscillator()), gd = own(ctx.createGain()); o.frequency.value = fq; amp.gain.value = 0.006; mod.frequency.value = 5.2 + i * 0.7; md.gain.value = 0.006; grp.frequency.value = 0.55 + i * 0.13; gd.gain.value = 0.006; o.connect(amp); mod.connect(md); md.connect(amp.gain); grp.connect(gd); gd.connect(amp.gain); amp.connect(g); o.start(); mod.start(); grp.start(); }); }
  /* a city a long way down: low rumble, a bed of traffic hiss that breathes */
  { const g = bed('city'), lp = filt('lowpass', 170), bp = filt('bandpass', 900, 0.5), hiss = own(ctx.createGain()); hiss.gain.value = 0.09; const s = loop('brown'), w = loop('white'); s.connect(lp); lp.connect(g); w.connect(bp); bp.connect(hiss); hiss.connect(g); lfo(0.09, 0.03, hiss.gain); }
  /* the cellar: two detuned saws very low through a slow filter, and a sub */
  { const g = bed('drone'), f = filt('lowpass', 140, 2); [55, 55.4, 82.4].forEach(fq => { const o = own(ctx.createOscillator()); o.type = 'sawtooth'; o.frequency.value = fq; const a = own(ctx.createGain()); a.gain.value = fq > 80 ? 0.35 : 0.6; o.connect(a); a.connect(f); o.start(); }); f.connect(g); lfo(0.05, 60, f.frequency); }
  /* the shrine: an open fifth and an octave in sines that beat very slowly, and a shimmer above */
  { const g = bed('pad'); [[73.42, 0.7], [110.0, 0.5], [146.83, 0.35], [220.3, 0.2], [293.66, 0.1], [294.4, 0.08]].forEach(([fq, v], i) => { const o = own(ctx.createOscillator()), a = own(ctx.createGain()); o.frequency.value = fq; a.gain.value = v; o.connect(a); a.connect(g); o.start(); lfo(0.04 + i * 0.013, v * 0.4, a.gain); }); }
  /* a hum: mains, and a little hiss */
  { const g = bed('hum'), f = filt('lowpass', 900); [100, 200, 300].forEach((fq, i) => { const o = own(ctx.createOscillator()), a = own(ctx.createGain()); o.type = 'triangle'; o.frequency.value = fq; a.gain.value = [0.6, 0.25, 0.1][i]; o.connect(a); a.connect(f); o.start(); }); f.connect(g); }
  /* a hearth: soft low noise */
  { const g = bed('fire'), f = filt('lowpass', 380); const s = loop('brown'); s.connect(f); f.connect(g); lfo(0.4, 0.02, g.gain); }

  return {
    /* move every bed toward its target (0..1), over about `tc` seconds; `hz` retunes the hum to the room's mains */
    set(target, tc = 1.6) {
      const t = ctx.currentTime;
      Object.keys(gains).forEach(k => { try { gains[k].gain.cancelScheduledValues(t); gains[k].gain.setTargetAtTime((target[k] || 0) * BASE[k], t, tc); } catch (e) { /* closing */ } });
    },
    dispose() { nodes.forEach(n => { try { if (n.stop) n.stop(); } catch (e) {} try { n.disconnect(); } catch (e) {} }); nodes.length = 0; }
  };
}
