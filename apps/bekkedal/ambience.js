/* Bekkedal — ambience: a bed per map, weather over it, hour over that,
 * positional hearth crackle, and material footsteps. The largest gap
 * between this game and the word "homey" was that none of it existed.
 *
 * Same shape as `music.js`: `createAmbience(A)` takes what it needs and
 * closes over nothing of the app's own, so it imports nothing from
 * `kernel/` and touches no DOM. `A.gain()`/`A.playing()` are the SND
 * knob, not MUS — this is sound design standing next to the footsteps
 * and the hearth's one-shot crackle, both of which already answer to
 * `Snd`'s own SND-gated bus, not the soundtrack's. `music.js`'s five
 * tunes keep answering to MUS alone; nothing here touches that knob.
 *
 *   A.snd()      the machine's Snd, lazily, because it wakes on first use
 *   A.gain()     the SND knob, already scaled (sfxGain())
 *   A.playing()  whether it is allowed to make a sound at all
 *   A.context()  'mine' | 'high' | 'night' | 'townday' | 'day' — the same
 *                pool music.js reads; used here only to keep the weather
 *                and hour layers out of the mine, which has neither
 *   A.map()      current map id — picks the bed
 *   A.weather()  'regn' | 'take' | 'klar' — the morning's roll
 *   A.hour()     'dawn' | 'dusk' | 'night' | 'day' — reads the exact same
 *                dawn()/dusk()/night() boundaries index.js already defines
 *   A.hearths()  the hearth-only subset of lightSources(), in world pixels
 *                — read, never a second table of fire positions
 *   A.player()   the player's own world-pixel position, for the falloff
 *
 * Nothing here ticks on a `setInterval` of its own devising: the bed and
 * rain buses live on gain ramps driven by `tick(dt)` off the frame loop,
 * and the one timed callback (the crossfade's own teardown) is the same
 * `setTimeout`-after-a-ramp shape `music.js`'s `swap` already uses.
 */

import { BEK_T, BEK_STEP_SOUNDS } from './data.js';
import { isCave, inside as isInside, snowy } from './surface.js';

const FADE = 2.6;                 /* seconds a bed takes to cross into the next */

/* ---- the beds -------------------------------------------------------------
   Filtered noise plus one or two slow, slightly detuned oscillators — never
   more, or a bed stops being a bed. `filt` shapes the noise; `osc` is
   `[freq, vol, detuneCents]` pairs. */
const BED = {
  wind:   { filt: 'lowpass',  freq: 1100, q: 0.6, nvol: 0.05,  osc: [[58, 0.016, 0], [91, 0.011, 7]] },
  water:  { filt: 'lowpass',  freq: 480,  q: 0.5, nvol: 0.042, osc: [[38, 0.017, 0]] },
  forest: { filt: 'highpass', freq: 2600, q: 0.5, nvol: 0.016, osc: [[220, 0.006, 4]] },
  room:   { filt: 'lowpass',  freq: 420,  q: 0.6, nvol: 0.026, osc: [[52, 0.011, 0]] },
  mine:   { filt: 'lowpass',  freq: 220,  q: 0.5, nvol: 0.034, osc: [[38, 0.019, 0], [39.6, 0.015, 0]] },
  valley: { filt: 'lowpass',  freq: 560,  q: 0.5, nvol: 0.02,  osc: [[64, 0.008, 0]] }
};
const MAP_BED = {
  farm: 'valley', town: 'valley', lake: 'water', fjord: 'water',
  forest: 'forest', enga: 'forest', setra: 'wind', vidda: 'wind',
  gruva: 'mine', farmhouse: 'room', lakehouse: 'room'
};

let NB = null, NBCTX = null;
/* one shared loop buffer for every noise-based node — flat white noise, no
   taper, or a tapered one-shot buffer would thump once a loop */
function noiseBuf(ctx) {
  if (NB && NBCTX === ctx) return NB;
  const n = Math.floor(ctx.sampleRate * 4);
  NB = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = NB.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  NBCTX = ctx;
  return NB;
}
const stopNode = n => { try { n.stop(); } catch (e) {} };
function rampTo(param, target, dur, now) {
  param.cancelScheduledValues(now);
  param.setValueAtTime(Math.max(0.0001, param.value), now);
  param.exponentialRampToValueAtTime(Math.max(0.0002, target), now + dur);
}

function buildBed(ctx, bus, kind) {
  const r = BED[kind] || BED.valley;
  const nodes = [];
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf(ctx); src.loop = true;
  const filt = ctx.createBiquadFilter();
  filt.type = r.filt; filt.frequency.value = r.freq; filt.Q.value = r.q;
  const ng = ctx.createGain(); ng.gain.value = r.nvol;
  src.connect(filt); filt.connect(ng); ng.connect(bus); src.start();
  nodes.push(src);
  r.osc.forEach(o => {
    const on = ctx.createOscillator();
    on.type = 'sine'; on.frequency.value = o[0]; if (o[2]) on.detune.value = o[2];
    const og = ctx.createGain(); og.gain.value = o[1];
    on.connect(og); og.connect(bus); on.start();
    nodes.push(on);
  });
  return nodes;
}

/* two alternating buses, so the outgoing bed and the incoming one overlap
   instead of leaving a gap between them the way a sequential mute-then-play
   would */
function createBed() {
  return {
    slots: null, cur: 0, kind: null, g0: -1, swapT: null,
    ensure(ctx) {
      if (this.slots) return;
      this.slots = [0, 1].map(() => {
        const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(ctx.destination);
        return { bus: g, nodes: [] };
      });
    },
    crossTo(ctx, kind, gain) {
      this.ensure(ctx);
      const from = this.slots[this.cur], to = this.slots[1 - this.cur];
      clearTimeout(this.swapT);
      const now = ctx.currentTime;
      rampTo(from.bus.gain, 0.0001, FADE, now);
      to.nodes.forEach(stopNode);
      to.nodes = buildBed(ctx, to.bus, kind);
      to.bus.gain.cancelScheduledValues(now); to.bus.gain.setValueAtTime(0.0001, now);
      rampTo(to.bus.gain, gain, FADE, now);
      const oldNodes = from.nodes;
      this.cur = 1 - this.cur; this.kind = kind; this.g0 = gain;
      this.swapT = setTimeout(() => { oldNodes.forEach(stopNode); this.swapT = null; }, FADE * 1000 + 80);
    },
    level(ctx, gain, ramp) {
      if (!this.slots) return;
      if (Math.abs(gain - this.g0) < 0.0006) return;
      this.g0 = gain;
      const bus = this.slots[this.cur].bus;
      rampTo(bus.gain, gain, ramp || 0.6, ctx.currentTime);
    },
    sync(ctx, kind, gain) {
      if (kind !== this.kind) this.crossTo(ctx, kind, gain);
      else this.level(ctx, gain);
    },
    stop() {
      clearTimeout(this.swapT); this.swapT = null;
      if (this.slots) this.slots.forEach(s => { s.nodes.forEach(stopNode); s.nodes = []; });
      this.slots = null; this.kind = null; this.g0 = -1;
    }
  };
}

/* one bus, gain-ramped on and off rather than torn down between showers —
   rain is a loudness, not a different sound */
function createRain() {
  return {
    bus: null, src: null, g0: -1,
    ensure(ctx) {
      if (this.bus) return;
      this.bus = ctx.createGain(); this.bus.gain.value = 0.0001; this.bus.connect(ctx.destination);
      this.src = ctx.createBufferSource(); this.src.buffer = noiseBuf(ctx); this.src.loop = true;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500; hp.Q.value = 0.4;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5500; lp.Q.value = 0.3;
      this.src.connect(hp); hp.connect(lp); lp.connect(this.bus); this.src.start();
    },
    level(ctx, gain) {
      this.ensure(ctx);
      if (Math.abs(gain - this.g0) < 0.0006) return;
      this.g0 = gain;
      rampTo(this.bus.gain, gain, 1.6, ctx.currentTime);
    },
    stop() {
      if (this.src) stopNode(this.src);
      this.bus = null; this.src = null; this.g0 = -1;
    }
  };
}

function material(mapId, c) {
  if (c === 'P') return 'pier';
  if (c === '~') return 'water';
  if (c === '.' || c === 'f') return 'path';
  if (isCave(mapId)) return 'stone';
  if (isInside(mapId)) return 'boards';
  if (snowy(mapId)) return 'snow';
  return 'grass';
}

function birdChirp(snd, mul) {
  const base = 1800 + Math.random() * 1400;
  snd.tone(base, 55, { type: 'sine', to: base * 1.3, vol: Math.min(0.022, 0.03 * mul) });
  snd.tone(base * 0.78, 40, { type: 'sine', to: base * 0.66, delay: 0.08, vol: Math.min(0.016, 0.022 * mul) });
}
function cricketChirr(snd, mul) {
  const base = 3700 + Math.random() * 500;
  for (let i = 0; i < 3; i++) snd.tone(base, 16, { type: 'square', delay: i * 0.09, vol: Math.min(0.013, 0.018 * mul) });
}
function crackle(snd, near) {
  snd.noise(14 + Math.random() * 22, { freq: 2200 + Math.random() * 2600, q: 3 + Math.random() * 3, vol: 0.01 + near * 0.05 });
  if (Math.random() < 0.35) snd.tone(90 + Math.random() * 60, 40, { type: 'triangle', to: 40, vol: 0.007 + near * 0.02 });
}

export function createAmbience(A) {
  const Bed = createBed(), Rain = createRain();
  const hourSt = { chorus: 0, birdT: 0, crickT: 0 };
  const hearthSt = { t: 1 };
  let on = false;

  function stopAll() {
    if (!on) return;
    on = false;
    Bed.stop(); Rain.stop();
    hourSt.chorus = 0; hourSt.birdT = 0; hourSt.crickT = 0; hearthSt.t = 1;
  }

  function hourLayer(dt, hr, baseGain, snd) {
    const target = hr === 'dawn' ? 1 : 0;
    const rate = (target > hourSt.chorus ? dt / 3 : dt / 45);
    hourSt.chorus = Math.max(0, Math.min(1, hourSt.chorus + (target >= hourSt.chorus ? rate : -rate)));
    if (hourSt.chorus > 0.03) {
      hourSt.birdT -= dt;
      if (hourSt.birdT <= 0) { birdChirp(snd, hourSt.chorus * baseGain * 40); hourSt.birdT = 0.6 + Math.random() * 1.6; }
    }
    if (hr === 'dusk' || hr === 'night') {
      hourSt.crickT -= dt;
      if (hourSt.crickT <= 0) {
        cricketChirr(snd, (hr === 'night' ? 0.55 : 0.85) * baseGain * 40);
        hourSt.crickT = 1.0 + Math.random() * 2.2;
      }
    } else hourSt.crickT = 0;
  }

  function hearthLayer(dt, snd) {
    const hs = A.hearths(); if (!hs || !hs.length) return;
    const p = A.player();
    let best = Infinity;
    for (let i = 0; i < hs.length; i++) {
      const dx = hs[i].px - p.px, dy = hs[i].py - p.py, d = Math.sqrt(dx * dx + dy * dy);
      if (d < best) best = d;
    }
    const MAXR = 3.4 * BEK_T;
    if (best >= MAXR) { hearthSt.t = Math.min(hearthSt.t, 0.4); return; }
    const near = 1 - best / MAXR;
    hearthSt.t -= dt;
    if (hearthSt.t <= 0) { crackle(snd, near); hearthSt.t = (0.5 + Math.random() * 0.9) / (0.3 + near); }
  }

  return {
    tick(dt) {
      if (!A.playing()) { stopAll(); return; }
      const snd = A.snd(); snd.wake();
      const ctx = snd.ctx; if (!ctx) return;
      on = true;
      const kind = MAP_BED[A.map()] || 'valley';
      const outdoor = A.context() !== 'mine' && kind !== 'room' && kind !== 'mine';
      const gain = A.gain();
      const wx = A.weather(), hr = A.hour();
      const wMul = wx === 'regn' ? 0.85 : wx === 'take' ? 1.12 : 1;
      const hMul = !outdoor ? 1 : hr === 'night' ? 0.62 : hr === 'dusk' ? 0.9 : 1;
      Bed.sync(ctx, kind, Math.max(0.0002, gain * wMul * hMul));
      Rain.level(ctx, (outdoor && wx === 'regn') ? gain * 0.9 : 0.0001);
      if (outdoor) hourLayer(dt, hr, gain, snd); else { hourSt.chorus = 0; hourSt.crickT = 0; }
      hearthLayer(dt, snd);
    },
    step(mapId, tile) {
      const snd = A.snd(); snd.wake(); if (!snd.ctx) return;
      const r = BEK_STEP_SOUNDS[material(mapId, tile)] || BEK_STEP_SOUNDS.grass;
      const j = 0.92 + Math.random() * 0.16;
      snd.noise(r.ms, { freq: r.freq * j, q: r.q, vol: r.vol });
      if (r.tone) snd.tone(r.tone.f * j, r.tone.ms, { type: r.tone.type, to: r.tone.to, vol: r.tone.vol });
    },
    stop: stopAll
  };
}
