/* Adaptive chiptune engine. Built directly on window.Snd.ctx with its own
   gain bus (kept separate from window.Snd's SFX bus so it answers to the
   machine's MUS knob, not SFX) -- the same reach-into-Snd.ctx technique
   apps/garden/index.js already uses for its ambience loop. A lookahead
   scheduler drives three layers -- bass, lead, percussion -- and
   `setIntensity` turns layers on/off live: 0 explore, 1 combat, 2 tension. */

const BPM = 148;
const STEP_DUR = 60 / BPM / 4;
const LOOKAHEAD = 0.12;
const ROOT = 82.41; // E2

const BASS = [0, null, 0, null, 7, null, 5, null, 0, null, 0, null, 10, null, 7, null];
const LEAD = [
  12, null, 15, 12, null, 19, 17, null, 15, null, 12, null, 10, null, null, null,
  12, null, 15, 12, null, 19, 22, null, 19, 17, 15, null, 12, null, null, null
];

let ctxRef = null, bus = null, timerId = null;
let nextNoteTime = 0, step = 0, intensity = 0, running = false;

function noteOsc(ctx, out, freq, t, dur, type, vol) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(amp); amp.connect(out);
  osc.start(t); osc.stop(t + dur + 0.02);
}

function kick(ctx, out, t) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(42, t + 0.09);
  amp.gain.setValueAtTime(0.5, t);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  osc.connect(amp); amp.connect(out);
  osc.start(t); osc.stop(t + 0.14);
}

function hat(ctx, out, t, vol, freq) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * 0.03));
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'highpass'; f.frequency.value = freq || 6000;
  const amp = ctx.createGain();
  amp.gain.value = vol;
  src.connect(f); f.connect(amp); amp.connect(out);
  src.start(t);
}

function scheduleStep(t, idx) {
  const s16 = idx % 16;
  const bassDeg = BASS[s16];
  if (bassDeg != null && (intensity >= 1 || s16 % 8 === 0)) {
    noteOsc(ctxRef, bus, ROOT * Math.pow(2, bassDeg / 12), t, STEP_DUR * 1.8, 'triangle', 0.1);
  }
  if (intensity >= 1) {
    const leadDeg = LEAD[idx % LEAD.length];
    if (leadDeg != null) {
      noteOsc(ctxRef, bus, ROOT * Math.pow(2, leadDeg / 12), t, STEP_DUR * 1.35, 'square', 0.055);
    }
  }
  if (s16 === 0 || s16 === 8) kick(ctxRef, bus, t);
  if (intensity >= 1 && s16 % 2 === 1) hat(ctxRef, bus, t, 0.03, 7000);
  if (intensity >= 2 && (s16 === 4 || s16 === 12)) hat(ctxRef, bus, t, 0.06, 2200);
}

function updateBusGain() {
  if (!bus || !ctxRef || !window.CRT) return;
  const musVal = window.CRT.mus == null ? 5 : window.CRT.mus;
  const g = window.CRT.on ? Math.pow(musVal / 10, 1.6) * 0.85 * 0.5 : 0;
  bus.gain.setTargetAtTime(g, ctxRef.currentTime, 0.15);
}

function tick() {
  if (!running || !ctxRef) return;
  updateBusGain();
  while (nextNoteTime < ctxRef.currentTime + LOOKAHEAD) {
    scheduleStep(nextNoteTime, step);
    nextNoteTime += STEP_DUR;
    step++;
  }
}

export function musicStart() {
  if (running) return;
  if (!window.Snd) return;
  window.Snd.wake();
  if (!window.Snd.ctx) return;
  ctxRef = window.Snd.ctx;
  bus = ctxRef.createGain();
  bus.gain.value = 0;
  bus.connect(ctxRef.destination);
  nextNoteTime = ctxRef.currentTime + 0.05;
  step = 0;
  running = true;
  timerId = setInterval(tick, 40);
}

export function musicSetIntensity(level) { intensity = level; }

export function musicStop() {
  running = false;
  if (timerId) clearInterval(timerId);
  timerId = null;
  if (bus) { try { bus.disconnect(); } catch (e) {} }
  bus = null;
  ctxRef = null;
}
