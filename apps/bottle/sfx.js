/* The noises a bar makes. All of it goes through the machine's SFX bus, so
   the SFX knob turns it down like everything else. */
export function makeSfx(Snd) {
  const bus = c => Snd.sfx || c.destination;
  let pourNodes = null;
  const sfx = {
    /* the stream: filtered noise whose note rises as the glass fills */
    pourStart() {
      Snd.wake(); if (!Snd.ctx) return;
      const c = Snd.ctx, n = Math.floor(c.sampleRate * 2);
      const b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * 0.6;
      const s = c.createBufferSource(); s.buffer = b; s.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3.4; f.frequency.value = 420;
      const g = c.createGain(); g.gain.value = 0.0001;
      s.connect(f); f.connect(g); g.connect(bus(c));
      s.start();
      pourNodes = { s, f, g, c };
    },
    /* flow 0..1, fill 0..1 */
    pourSet(flow, fill) {
      if (!pourNodes) return;
      const { f, g, c } = pourNodes, t = c.currentTime;
      f.frequency.setTargetAtTime(420 + fill * 760, t, 0.05);
      g.gain.setTargetAtTime(Math.max(0.0001, 0.11 * flow), t, 0.04);
    },
    pourEnd() {
      if (!pourNodes) return;
      const { s, g, c } = pourNodes, t = c.currentTime;
      g.gain.setTargetAtTime(0.0001, t, 0.05);
      try { s.stop(t + 0.3); } catch (e) {}
      pourNodes = null;
    },
    /* air going into the bottle as the liquor comes out: a glug */
    glug(fill) {
      Snd.wake(); if (!Snd.ctx) return;
      const c = Snd.ctx, t = c.currentTime, o = c.createOscillator(), gn = c.createGain();
      const f0 = 130 + fill * 120 + Math.random() * 30;
      o.type = 'sine';
      o.frequency.setValueAtTime(f0 * 1.5, t);
      o.frequency.exponentialRampToValueAtTime(f0, t + 0.05);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.8, t + 0.14);
      gn.gain.setValueAtTime(0.0001, t);
      gn.gain.exponentialRampToValueAtTime(0.16, t + 0.015);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      o.connect(gn); gn.connect(bus(c));
      o.start(t); o.stop(t + 0.18);
    },
    drip() { Snd.tone(900 + Math.random() * 400, 40, { type: 'sine', to: 500, vol: 0.05 }); },
    /* the glass meeting a lip */
    sip() { Snd.tone(2600, 50, { type: 'sine', to: 2300, vol: 0.03 }); Snd.noise(40, { freq: 1200, q: 1.5, vol: 0.03 }); },
    /* one swallow, each a little lower than the last */
    gulp(n) {
      Snd.wake(); if (!Snd.ctx) return;
      const c = Snd.ctx, t = c.currentTime, o = c.createOscillator(), gn = c.createGain(), i = Math.max(0, (n || 1) - 1);
      o.type = 'sine';
      o.frequency.setValueAtTime(190 - i * 34, t);
      o.frequency.exponentialRampToValueAtTime(78 - i * 12, t + 0.13);
      gn.gain.setValueAtTime(0.0001, t);
      gn.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      o.connect(gn); gn.connect(bus(c));
      o.start(t); o.stop(t + 0.2);
    },
    /* a strong one going down: a hiss in the throat, harsher the stronger it is (b is 0 to 1; nothing below a third: mead and the Jägermeister's own sip are not a hiss) */
    sear(b, n) {
      if (b < 0.3) return;
      Snd.noise(150 + 170 * b, { freq: 2200 + 1800 * b, q: 0.9, vol: 0.02 + 0.05 * b });
      if (b > 0.6) Snd.tone(340 + (n || 1) * 20, 90, { type: 'sawtooth', to: 190, vol: 0.02 * b });
    },
    /* the breath out, and the glass going down: a quiet sigh for something mild, the usual one, a gasp and a cough for raw spirit */
    ahh(b) { b = b || 0; if (b < 0.12) { Snd.noise(170, { freq: 600, q: 0.8, vol: 0.022 }); return; } Snd.noise(260, { freq: 700, q: 0.8, vol: 0.04 + 0.03 * b }); },
    cough(b) {
      Snd.noise(300, { freq: 1600, q: 0.7, vol: 0.05 + 0.04 * b });
      for (let i = 0; i < 3; i++) { Snd.noise(70, { freq: 900 + i * 120, q: 1.1, vol: 0.07 * b, delay: 0.3 + i * 0.14 }); Snd.tone(210 - i * 25, 80, { type: 'sawtooth', to: 120, vol: 0.03 * b, delay: 0.3 + i * 0.14 }); }
    },
    down() { Snd.tone(150, 90, { type: 'triangle', to: 70, vol: 0.07 }); Snd.noise(40, { freq: 900, q: 1.5, vol: 0.03 }); },
    cork() { Snd.tone(300, 60, { type: 'sine', to: 900, vol: 0.10 }); Snd.noise(50, { freq: 2200, q: 2, vol: 0.05, delay: 0.05 }); },
    cap()  { Snd.tone(420, 40, { type: 'square', to: 300, vol: 0.05 }); Snd.noise(30, { freq: 3000, q: 2, vol: 0.04 }); },
    clink() { Snd.tone(2400, 90, { type: 'sine', to: 2100, vol: 0.05 }); Snd.tone(3300, 60, { type: 'sine', vol: 0.025 }); },
    deny() { Snd.tone(150, 180, { type: 'sawtooth', vol: 0.05 }); }
  };
  return sfx;
}
