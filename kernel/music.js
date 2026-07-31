import { Snd } from './snd.js';
import { HZ, HYMN } from './music_data.js';
import { CRT, Vol, musGain } from './hardware.js';
import { Mixer } from './mixer.js';

export const Music = {
  on: false,
  bus: null,
  timer: null,
  when: 0,
  voices: [],       /* every oscillator still in the queue, so stop() means stop */
  eighth() { return 30 / HYMN.bpm; },
  ensure() {
    Snd.wake();
    if (!Snd.ctx) return false;
    if (!this.bus) {
      this.bus = Snd.ctx.createGain();
      this.bus.gain.value = 0.0001;
      this.bus.connect(Snd.ctx.destination);
    }
    return true;
  },
  voice(name, at, eighths, type, vol, detune) {
    const f = HZ[name];
    if (!f) return;
    const c = Snd.ctx;
    const dur = eighths * this.eighth() * 0.92;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, at);
    if (detune) o.detune.setValueAtTime(detune, at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.03);
    g.gain.setValueAtTime(vol, at + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g);
    g.connect(this.bus);
    o.start(at);
    o.stop(at + dur + 0.05);
    /* A loop is scheduled up to ten seconds ahead. Fading the bus hides
       those notes but does not cancel them, and the next start() raised
       the fader right back over the top of them — which is where the
       doubled music came from on a power cycle. Hold onto them. */
    this.voices.push(o);
    o.onended = () => {
      const i = this.voices.indexOf(o);
      if (i >= 0) this.voices.splice(i, 1);
    };
  },
  loop(t0) {
    const e = this.eighth();
    HYMN.pad.forEach(n  => this.voice(n[0], t0 + n[1] * e, n[2], 'triangle', 0.05));
    HYMN.bass.forEach(n => this.voice(n[0], t0 + n[1] * e, n[2], 'square', 0.07));
    HYMN.lead.forEach(n => {
      this.voice(n[0], t0 + n[1] * e, n[2], 'square', 0.08);
      /* a second oscillator a few cents sharp, the way a real chip drifted */
      this.voice(n[0], t0 + n[1] * e, n[2], 'square', 0.026, 8);
    });
    return 32 * e;
  },
  start() {
    if (this.on || !CRT.on || !Vol.lobby || Vol.mus <= 0) return;
    if (!this.ensure()) return;
    this.on = true;
    const g = this.bus.gain, now = Snd.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(0.0001, now);
    g.exponentialRampToValueAtTime(Math.max(0.0002, musGain() * Mixer.get('lobby')), now + 1.1);
    this.when = now + 0.15;
    this.tick();
  },
  /* the MUS pot, riding the loop while it plays */
  level() {
    if (!this.bus || !Snd.ctx) return;
    const g = this.bus.gain, now = Snd.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(0.0001, g.value), now);
    g.exponentialRampToValueAtTime(Math.max(0.0002, musGain() * Mixer.get('lobby')), now + 0.14);
  },
  /* the single place that decides whether the lobby is playing */
  sync() {
    if (!(CRT.on && Vol.lobby && Vol.mus > 0)) { this.stop(); return; }
    if (this.on) this.level(); else this.start();
  },
  tick() {
    if (!this.on || !Snd.ctx) return;
    const now = Snd.ctx.currentTime;
    if (this.when < now) this.when = now + 0.05;   /* the tab was asleep */
    const len = this.loop(this.when);
    this.when += len;
    this.timer = setTimeout(() => this.tick(), Math.max(250, len * 1000 - 400));
  },
  stop() {
    this.on = false;
    clearTimeout(this.timer);
    if (!this.bus || !Snd.ctx) { this.voices = []; return; }
    const g = this.bus.gain, now = Snd.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(0.0001, g.value), now);
    g.exponentialRampToValueAtTime(0.0001, now + 0.6);
    /* silence the queue behind the fade, not just the fader in front of it */
    this.voices.forEach(o => { try { o.stop(now + 0.62); } catch (e) {} });
    this.voices = [];
  }
};

window.addEventListener('mixer-changed', ev => {
  if (ev.detail && ev.detail.channel === 'lobby') Music.level();
});
