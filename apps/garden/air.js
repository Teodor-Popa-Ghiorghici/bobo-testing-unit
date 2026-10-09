/* GARDEN — the sound of the place. A bed of layers (wind, rain, crickets, a city, the cellar's drone, the shrine's pad...) that follows the room, the weather and the hour, one-off
   sounds scattered over it (birds, an owl, a drip with its echo, a temple bell...), and the sounds of what your hands do. The plan is ambience_plan.js (pure), the voices are
   ambience_synth.js and the beds are ambience_layers.js. All of it rides one gain that follows the taskbar mixer's GARDEN channel and the machine's SFX knob, and is silent with the set off. */
import { CRT, Vol } from '../../kernel/hardware.js';
import { Mixer } from '../../kernel/mixer.js';
import { createPlan } from './ambience_plan.js';
import { createVoices } from './ambience_synth.js';
import { createLayers } from './ambience_layers.js';

const LEVEL = 1.0;

export const GardenAir = {
  gain: null, voices: null, layers: null, plan: null, quiet: true, ticks: 0,
  start() {
    window.Snd.wake();
    const ctx = window.Snd.ctx;
    if (!ctx || this.gain) return;
    try {
      const gain = ctx.createGain(); gain.gain.value = 0;
      gain.connect(window.Snd.sfx || ctx.destination);
      this.gain = gain; this.voices = createVoices(ctx, gain); this.layers = createLayers(ctx, gain); this.plan = createPlan();
      gain.gain.setTargetAtTime(LEVEL * Mixer.get('garden'), ctx.currentTime, 1.2);
    } catch (e) { this.stop(); }
  },
  /* the mixer slider moved */
  setLevel() { if (this.gain && window.Snd.ctx) { try { this.gain.gain.setTargetAtTime(LEVEL * Mixer.get('garden'), window.Snd.ctx.currentTime, 0.3); } catch (e) {} } },
  /* once a frame: env = { room, rain, wind, night, light, season, flash, tsec } */
  tick(dt, env) {
    if (!this.gain || !this.plan) return;
    const on = CRT.on && Vol.sfx > 0;
    if (!on) { if (!this.quiet) { this.layers.set({}, 0.4); this.quiet = true; } this.plan.step(dt, env); return; }       /* the plan keeps time, so nothing piles up when the set comes back */
    const { layers, events } = this.plan.step(dt, env);
    if (this.quiet || (++this.ticks % 20) === 0) { this.layers.set(layers, 1.6); this.quiet = false; }
    events.forEach(e => this.voices.play(Object.assign(e, { room: env.room })));
  },
  /* what your hands did: water, soil, pull, sparkle (a harvest), ready */
  sfx(name, arg) { if (this.voices && CRT.on && Vol.sfx > 0) this.voices.sfx(name, arg); },
  stop() {
    const ctx = window.Snd && window.Snd.ctx, gain = this.gain, voices = this.voices, layers = this.layers;
    this.gain = null; this.voices = null; this.layers = null; this.plan = null; this.quiet = true;
    if (gain && ctx) { try { gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3); } catch (e) {} }
    setTimeout(() => { try { if (layers) layers.dispose(); if (voices) voices.dispose(); if (gain) gain.disconnect(); } catch (e) {} }, 1400);
  }
};
