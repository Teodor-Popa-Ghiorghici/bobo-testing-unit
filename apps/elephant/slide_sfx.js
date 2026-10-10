/* Playing the plan of slide_sound.js on the machine's speaker (Snd.ctx, the SFX bus: the knob and the SFX setting still rule it). Five layers made of noise and oscillators, each with the
   curves the plan gives it, through a compressor so the worst moment cannot clip, and the thumps laid on top as one-shots. Nothing here is a recording: the machine ships no samples for it.
   `playSlide(Snd, plan)` returns { stop() } (a fade in a fortieth of a second and everything let go) or null if there is nothing to play on. */
import { dice } from './slide_plan.js';

function noise(ctx, secs, crackle, rand) {
  const n = Math.floor(ctx.sampleRate * secs), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  if (!crackle) { for (let i = 0; i < n; i++) d[i] = rand() * 2 - 1; return buf; }
  /* gravel: sparse sharp grains (a spike that dies in two or three milliseconds) over a thin hiss */
  let tail = 0;
  for (let i = 0; i < n; i++) {
    if (rand() < 0.0035) tail = (0.5 + rand() * 0.5) * (rand() < 0.5 ? -1 : 1);
    d[i] = tail + (rand() * 2 - 1) * 0.06; tail *= 0.9965;
  }
  return buf;
}
function follow(param, curve, t0, k, offset) {
  if (!curve.length) return;
  param.setValueAtTime(Math.max(0.0001, curve[0][k] + (offset || 0)), t0 + curve[0][0]);
  for (let i = 1; i < curve.length; i++) param.linearRampToValueAtTime(Math.max(0.0001, curve[i][k] + (offset || 0)), t0 + curve[i][0]);
}

export function playSlide(Snd, plan) {
  Snd.wake();
  const ctx = Snd.ctx;
  if (!ctx || !Snd.sfx) return null;
  const rand = dice(20260725), t0 = Snd.at({}), end = t0 + plan.total + 0.9, made = [];
  try {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 14; comp.ratio.value = 7; comp.attack.value = 0.004; comp.release.value = 0.14;
    const master = ctx.createGain(); master.gain.setValueAtTime(0.8, t0);
    comp.connect(master); master.connect(Snd.sfx);
    const layer = (src, filters, curve, valueIndex, freqCurve, freqIndex) => {
      let node = src;
      const g = ctx.createGain(); g.gain.value = 0.0001;
      filters.forEach(f => { node.connect(f); node = f; });
      node.connect(g); g.connect(comp);
      follow(g.gain, curve, t0, valueIndex);
      if (freqCurve) follow(filters.length ? filters[0].frequency : src.frequency, freqCurve, t0, freqIndex);
      src.start(t0); made.push(src);
    };
    const loop = (buf) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; return s; };
    const filt = (type, hz, q) => { const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = hz; f.Q.value = q || 0.7; return f; };
    const white = noise(ctx, 2, false, rand), grit = noise(ctx, 3, true, rand);

    /* the rumble: noise through two low-pass filters, whose cutoff opens a little as he speeds up */
    layer(loop(white), [filt('lowpass', 120, 0.8), filt('lowpass', 260, 0.5)], plan.rumble, 1, plan.rumble, 2);
    /* the surface: a band of noise whose centre climbs with the speed, flaring at each jerk */
    layer(loop(white), [filt('bandpass', 400, 1.0)], plan.bed, 1, plan.bed, 2);
    /* the gravel under it */
    layer(loop(grit), [filt('highpass', 1500, 0.7)], plan.grit, 1);
    /* the thrum a speaker can only just make, and the groan before it lets go (a saw through a low-pass: the sound of a load straining) */
    const th = ctx.createOscillator(); th.type = 'sine'; th.frequency.value = 44;
    layer(th, [], plan.thrum, 1, plan.thrum, 2);
    const gr = ctx.createOscillator(); gr.type = 'sawtooth'; gr.frequency.value = 52;
    layer(gr, [filt('lowpass', 240, 1.2)], plan.groan, 1, plan.groan, 2);

    /* the thumps: a sine falling from f0 to f1 and a burst of noise with it */
    plan.thumps.forEach(p => {
      const at = t0 + p.at, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(p.f0, at); o.frequency.exponentialRampToValueAtTime(p.f1, at + p.dur);
      g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(p.gain, at + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, at + p.dur);
      o.connect(g); g.connect(comp); o.start(at); o.stop(at + p.dur + 0.05); made.push(o);
      const s = ctx.createBufferSource(); s.buffer = white;
      const f = filt(p.nType, p.nHz, 0.8), ng = ctx.createGain(), dur = p.nMs / 1000;
      ng.gain.setValueAtTime(0.0001, at); ng.gain.linearRampToValueAtTime(p.nGain, at + 0.003); ng.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      s.connect(f); f.connect(ng); ng.connect(comp); s.start(at, rand()); s.stop(at + dur + 0.05); made.push(s);
    });
    made.forEach(s => { try { if (s.loop || s.frequency) s.stop(end); } catch (e) { /* already scheduled to stop */ } });
  } catch (e) { return null; }
  return {
    stop() {
      try {
        const now = ctx.currentTime;
        made.forEach(s => { try { s.stop(now + 0.05); } catch (e) { /* never started or already stopped */ } });
      } catch (e) { /* the context is gone */ }
    }
  };
}
