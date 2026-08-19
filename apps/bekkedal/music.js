/* Bekkedal — five tunes, on rotation.
 *
 * Lifted out of `index.js` whole. It is the one thing in that file that was
 * neither engine nor drawing, and a hundred and fifty lines of note tables
 * was most of what stood between index.js and this app's own file-size rule.
 * Nothing about it changed on the way: the songs, the crossfade, the
 * context-driven pool and the gain ramps are the same code, reached through
 * four things it is handed rather than four things it closes over.
 *
 * `createSongs(A)` wants:
 *   A.snd()      the machine's Snd, lazily, because it wakes on first use
 *   A.musGain()  the MUS knob, already scaled by the hardware
 *   A.playing()  whether it is allowed to make a sound at all
 *   A.context()  'mine' | 'high' | 'night' | 'townday' | 'day' — which pool
 *                to draw the next track from
 *
 * Nobody has a voice actor here either; the speech blips stay in index.js
 * with the rest of the SFX, because they are per-line and not per-scene.
 */

const NOTE = { A2:110, B2:123.47, Cs3:138.59, D3:146.83, E3:164.81, Fs3:185, G3:196, A3:220, B3:246.94,
               Cs4:277.18, D4:293.66, E4:329.63, Fs4:369.99, G4:392, A4:440, B4:493.88, Cs5:554.37,
               D5:587.33, E5:659.26, Fs5:739.99, G5:783.99, A5:880 };
const SONGS = {
  dag: { bpm: 88, len: 32,
    lead: [['Fs4',0,4],['A4',4,2],['B4',6,2],['D5',8,4],['A4',12,4],['B4',16,2],['A4',18,2],['Fs4',20,4],['E4',24,2],['D4',26,2],['Fs4',28,4]],
    bass: [['D3',0,4],['D3',4,4],['A2',8,4],['A2',12,4],['B2',16,4],['B2',20,4],['G3',24,4],['A2',28,4]],
    pad:  [['D4',0,8],['Fs4',0,8],['A3',8,8],['Cs5',8,8],['B3',16,8],['Fs4',16,8],['G3',24,8],['D4',24,8]],
    arp:  [['D5',0,1],['A4',2,1],['Fs4',4,1],['A4',6,1],['E5',8,1],['Cs5',10,1],['A4',12,1],['Cs5',14,1],['B4',16,1],['Fs4',18,1],['D5',20,1],['Fs4',22,1],['A4',24,1],['D5',26,1],['Fs4',28,1],['A4',30,1]] },
  kveld: { bpm: 66, len: 32,
    lead: [['B3',0,6],['D4',6,2],['Fs4',8,6],['E4',14,2],['D4',16,4],['B3',20,4],['A3',24,6],['B3',30,2]],
    bass: [['B2',0,8],['G3',8,8],['E3',16,8],['Fs3',24,8]],
    pad:  [['D4',0,8],['Fs4',8,8],['B3',16,8],['A3',24,8]],
    arp:  [['B4',0,2],['Fs4',4,2],['D4',8,2],['B4',12,2],['A4',16,2],['E4',20,2],['Fs4',24,2],['B3',28,2]] },
  gruva: { bpm: 58, len: 32,
    lead: [['E3',0,8],['G3',8,4],['A3',12,4],['E3',16,8],['D3',24,4],['E3',28,4]],
    bass: [['E3',0,8],['E3',8,8],['Cs3',16,8],['A2',24,8]],
    pad:  [['E3',0,16],['B3',0,16],['A3',16,16],['E3',16,16]],
    arp:  [['E4',0,2],['B3',6,1],['G4',12,2],['E4',20,1],['A3',24,2],['E4',30,1]] },
  vidda: { bpm: 74, len: 32,
    lead: [['A4',0,4],['E5',4,4],['D5',8,2],['E5',10,2],['A4',12,4],['G4',16,4],['E5',20,4],['D5',24,4],['A4',28,4]],
    bass: [['A2',0,8],['E3',8,8],['G3',16,8],['A2',24,8]],
    pad:  [['A3',0,8],['E4',0,8],['D4',8,8],['A4',8,8],['G3',16,8],['D4',16,8],['A3',24,8],['E4',24,8]],
    arp:  [['A5',0,1],['E5',3,1],['A4',6,1],['E5',9,1],['D5',12,1],['A4',15,1],['E5',18,1],['G5',22,1],['E5',26,1],['A4',30,1]] },
  folkedans: { bpm: 108, len: 24,
    lead: [['D5',0,2],['A4',2,1],['D5',3,1],['Fs5',4,2],['E5',6,2],['D5',8,2],['A4',10,2],['B4',12,2],['Cs5',14,2],['D5',16,4],['A4',20,2],['Fs4',22,2]],
    bass: [['D3',0,2],['A2',2,1],['D3',4,2],['A2',6,1],['G3',8,2],['D3',10,1],['A2',12,2],['A2',14,1],['D3',16,2],['A2',18,1],['D3',20,2],['A2',22,1]],
    pad:  [['D4',0,6],['Fs4',0,6],['G3',6,6],['B3',6,6],['A3',12,6],['E4',12,6],['D4',18,6],['Fs4',18,6]],
    arp:  [['D5',0,1],['Fs5',1,1],['A4',2,1],['D5',3,1],['Fs5',4,1],['A5',5,1],['E5',6,1],['Cs5',7,1],['D5',8,1],['A4',9,1],['B4',10,1],['G4',11,1],['A4',12,1],['Cs5',13,1],['E5',14,1],['A4',15,1],['D5',16,1],['A4',17,1],['Fs5',18,1],['D5',19,1],['A4',20,1],['D5',21,1],['Fs4',22,1],['A4',23,1]] }
};

export function createSongs(A) {
  const Song = {
    on: false, cur: 'dag', bus: null, when: 0, timer: null, voices: [], g0: -1, rotIn: 90,
    swap: null, FADE: 1.1,          /* seconds a track takes to leave */
    ensure() { A.snd().wake(); if (!A.snd().ctx) return false; if (!this.bus) { this.bus = A.snd().ctx.createGain(); this.bus.gain.value = 0.0001; this.bus.connect(A.snd().ctx.destination); } return true; },
    voice(f, at, dur, type, vol) {
      const c = A.snd().ctx, o = c.createOscillator(), gn = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f, at);
      gn.gain.setValueAtTime(0.0001, at);
      gn.gain.exponentialRampToValueAtTime(vol, at + 0.04);
      gn.gain.setValueAtTime(vol, at + dur * 0.55);
      gn.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(gn); gn.connect(this.bus); o.start(at); o.stop(at + dur + 0.05);
      this.voices.push(o); o.onended = () => { const i = this.voices.indexOf(o); if (i >= 0) this.voices.splice(i, 1); };
    },
    bar(t0, sg) {
      const e = 30 / sg.bpm;
      sg.pad.forEach(n  => this.voice(NOTE[n[0]], t0 + n[1] * e, n[2] * e * 0.95, 'triangle', 0.04));
      sg.bass.forEach(n => this.voice(NOTE[n[0]], t0 + n[1] * e, n[2] * e * 0.9,  'square',   0.05));
      sg.lead.forEach(n => this.voice(NOTE[n[0]], t0 + n[1] * e, n[2] * e * 0.9,  'square',   0.055));
      if (sg.arp) sg.arp.forEach(n => this.voice(NOTE[n[0]], t0 + n[1] * e, n[2] * e * 0.7, 'triangle', 0.03));
      return sg.len * e;
    },
    pool() {
      switch (A.context()) {
        case 'mine': return ['gruva'];
        case 'high': return ['vidda', 'dag'];
        case 'night': return ['kveld', 'gruva'];
        case 'townday': return ['folkedans', 'dag'];
        default: return ['dag', 'folkedans'];
      }
    },
    pickNext(force) {
      const p = this.pool();
      let choices = p.filter(x => x !== this.cur);
      if (!choices.length) choices = p;
      const next = choices[Math.floor(Math.random() * choices.length)];
      if (next === this.cur && !force) return;
      if (!this.on) { this.cur = next; return; }
      this.crossfade(next);
    },
    /* Let the old track walk out before the new one walks in: ramp the
       bus down over FADE, stop the queued voices behind that ramp, then
       start the next one — start() comes up from silence, so the two
       halves meet in the middle instead of one being cut off. */
    crossfade(next) {
      if (!A.snd().ctx || !this.bus) { this.cur = next; return; }
      clearTimeout(this.timer); clearTimeout(this.swap);
      this.on = false;
      const now = A.snd().ctx.currentTime, gn = this.bus.gain, F = this.FADE;
      gn.cancelScheduledValues(now);
      gn.setValueAtTime(Math.max(0.0001, gn.value), now);
      gn.exponentialRampToValueAtTime(0.0001, now + F);
      this.voices.forEach(o => { try { o.stop(now + F + 0.02); } catch (e) {} });
      this.voices = [];
      this.swap = setTimeout(() => {
        this.swap = null;
        this.cur = next;
        if (A.playing()) this.start();
      }, F * 1000 + 40);
    },
    rotStep(dt) {
      if (!this.on || this.swap) return;
      this.rotIn -= dt;
      if (this.pool().indexOf(this.cur) < 0 && this.rotIn > 3) this.rotIn = 3;   /* context changed */
      if (this.rotIn <= 0) { this.pickNext(false); this.rotIn = 70 + Math.random() * 45; }   /* <= 115s, never 2 min */
    },
    level(ramp) {
      if (!this.bus || !A.snd().ctx) return;
      const want = A.musGain();
      if (ramp == null && Math.abs(want - this.g0) < 0.0005) return;
      this.g0 = want;
      const now = A.snd().ctx.currentTime, gn = this.bus.gain;
      gn.cancelScheduledValues(now);
      gn.setValueAtTime(Math.max(0.0001, gn.value), now);
      gn.exponentialRampToValueAtTime(Math.max(0.0002, want * 0.9), now + (ramp || 0.4));
    },
    sync() {
      if (!(A.playing())) { this.stop(); return; }
      if (this.swap) return;                       /* mid-crossfade: leave it alone */
      if (this.on) this.level(); else this.start();
    },
    /* the fade-in half of a crossfade: bus is at silence, walk it up */
    start() { if (this.on || !this.ensure()) return; this.on = true; this.g0 = -1; this.when = A.snd().ctx.currentTime + 0.15; this.level(this.FADE); this.tick(); },
    tick() {
      if (!this.on || !A.snd().ctx) return;
      const now = A.snd().ctx.currentTime;
      if (this.when < now) this.when = now + 0.05;
      const len = this.bar(this.when, SONGS[this.cur] || SONGS.dag);
      this.when += len;
      this.timer = setTimeout(() => this.tick(), Math.max(300, len * 1000 - 500));
    },
    hardStop() {
      clearTimeout(this.timer); clearTimeout(this.swap); this.swap = null; this.on = false;
      if (!A.snd().ctx) return;
      const now = A.snd().ctx.currentTime;
      this.voices.forEach(o => { try { o.stop(now + 0.05); } catch (e) {} });
      this.voices = [];
      if (this.bus) this.bus.gain.setValueAtTime(0.0001, now);
    },
    stop() {
      clearTimeout(this.swap); this.swap = null;
      if (!this.on) return;
      clearTimeout(this.timer); this.on = false;
      if (!this.bus || !A.snd().ctx) { this.voices = []; return; }
      const now = A.snd().ctx.currentTime, gn = this.bus.gain;
      gn.cancelScheduledValues(now);
      gn.setValueAtTime(Math.max(0.0001, gn.value), now);
      gn.exponentialRampToValueAtTime(0.0001, now + 0.7);
      this.voices.forEach(o => { try { o.stop(now + 0.72); } catch (e) {} });
      this.voices = [];
    }
  };
  return Song;
}
