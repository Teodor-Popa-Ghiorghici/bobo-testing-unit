export const HFP = {
  black:  '#0a0a0c', case_:  '#1c1d21', panel:  '#33353c', panelHi:'#4a4d56',
  brush:  '#6e727d', brushHi:'#9aa0ad', screw:  '#25262b', wood:   '#4a3220',
  woodHi: '#63432b', lcd:    '#0d2018', lcdOn:  '#5bff9e', lcdDim: '#1d5c3a',
  amber:  '#ffb43c', amberDim:'#6b4a18', red:   '#ff4a3c', green:  '#5bff6e',
  cyan:   '#4fe3ff', white:  '#e8ecf2'
};

export const HIFI_DISCS = [
  { id: 'dagen', name: 'DAGEN', artist: 'HOLYTRON SIGNAL', bpm: 88, reps: 10, tint: 'green',
    lead: [['Fs4',0,4],['A4',4,2],['B4',6,2],['D5',8,4],['A4',12,4],['B4',16,2],['A4',18,2],
           ['Fs4',20,4],['E4',24,2],['D4',26,2],['Fs4',28,4]],
    bass: [['D3',0,4],['D3',4,4],['A2',8,4],['A2',12,4],['B2',16,4],['B2',20,4],['G3',24,4],['A2',28,4]],
    pad:  [['D4',0,8],['Fs4',0,8],['A3',8,8],['Cs5',8,8],['B3',16,8],['Fs4',16,8],['G3',24,8],['D4',24,8]],
    arp:  [['D5',0,1],['A4',2,1],['Fs4',4,1],['A4',6,1],['E5',8,1],['Cs5',10,1],['A4',12,1],['Cs5',14,1],
           ['B4',16,1],['Fs4',18,1],['D5',20,1],['Fs4',22,1],['A4',24,1],['D5',26,1],['Fs4',28,1],['A4',30,1]],
    kick: [0,8,16,24], hat: [2,6,10,14,18,22,26,30], snare: [8,24], len: 32 },

  { id: 'kveld', name: 'KVELD', artist: 'HOLYTRON SIGNAL', bpm: 64, reps: 7, tint: 'cyan',
    lead: [['B3',0,6],['D4',6,2],['Fs4',8,6],['E4',14,2],['D4',16,4],['B3',20,4],['A3',24,6],['B3',30,2]],
    bass: [['B2',0,8],['G3',8,8],['E2',16,8],['Fs3',24,8]],
    pad:  [['D4',0,8],['Fs4',8,8],['B3',16,8],['A3',24,8]],
    arp:  [['B4',0,2],['Fs4',4,2],['D4',8,2],['B4',12,2],['A4',16,2],['E4',20,2],['Fs4',24,2],['B3',28,2]],
    kick: [0,16], hat: [4,12,20,28], snare: [], len: 32 },

  { id: 'gruva', name: 'GRUVA', artist: 'THE SHAFT TAPES', bpm: 58, reps: 6, tint: 'amber',
    lead: [['D4',0,4],['F4',4,4],['C4',8,4],['D4',12,4],['Bb3',16,6],['C4',22,2],['D4',24,8]],
    bass: [['D2',0,8],['D2',8,8],['Bb2',16,8],['C3',24,8]],
    pad:  [['D3',0,16],['A3',0,16],['F3',16,16],['C4',16,16]],
    arp:  null,
    kick: [0,10,16,26], hat: [], snare: [8,24], len: 32 },

  { id: 'folkedans', name: 'FOLKEDANS', artist: 'BEKKEDAL SPELEMANNSLAG', bpm: 116, reps: 12, tint: 'amber',
    lead: [['A4',0,2],['B4',2,1],['Cs5',3,1],['D5',4,2],['Cs5',6,1],['B4',7,1],['A4',8,2],['Fs4',10,2],
           ['E4',12,2],['Fs4',14,2],['A4',16,2],['Cs5',18,1],['D5',19,1],['E5',20,2],['D5',22,2],
           ['Cs5',24,2],['B4',26,2],['A4',28,4]],
    bass: [['A2',0,2],['E3',2,2],['A2',4,2],['E3',6,2],['D3',8,2],['A2',10,2],['D3',12,2],['E3',14,2],
           ['A2',16,2],['E3',18,2],['A2',20,2],['Cs4',22,2],['D3',24,2],['E3',26,2],['A2',28,4]],
    pad:  [['A3',0,8],['E4',8,8],['D4',16,8],['A3',24,8]],
    arp:  [['A5',0,1],['E5',4,1],['Cs5',8,1],['E5',12,1],['D5',16,1],['A4',20,1],['Cs5',24,1],['E5',28,1]],
    kick: [0,4,8,12,16,20,24,28], hat: [2,6,10,14,18,22,26,30], snare: [4,12,20,28], len: 32 },

  { id: 'hymne', name: 'HYMNE TIL EN MASKIN', artist: 'HOLYTRON SIGNAL', bpm: 52, reps: 5, tint: 'white',
    lead: [['D4',0,8],['F4',8,4],['G4',12,4],['A4',16,8],['G4',24,4],['F4',28,4]],
    bass: [['D2',0,16],['Bb2',16,8],['C3',24,8]],
    pad:  [['D3',0,16],['F3',0,16],['A3',0,16],['Bb2',16,16],['D3',16,16],['F3',16,16]],
    arp:  [['D5',0,4],['A4',8,4],['F5',16,4],['D5',24,4]],
    kick: [0], hat: [], snare: [], len: 32 }
];
export const HFN = {
  A1:55.00, B1:61.74, C2:65.41, D2:73.42, E2:82.41, F2:87.31, G2:98.00,
  A2:110.00, Bb2:116.54, B2:123.47, C3:130.81, D3:146.83, E3:164.81, F3:174.61,
  Fs3:185.00, G3:196.00, A3:220.00, Bb3:233.08, B3:246.94, C4:261.63, Cs4:277.18,
  D4:293.66, E4:329.63, F4:349.23, Fs4:369.99, G4:392.00, A4:440.00, Bb4:466.16,
  B4:493.88, C5:523.25, Cs5:554.37, D5:587.33, E5:659.26, F5:698.46, Fs5:739.99,
  G5:783.99, A5:880.00, Bb5:932.33, C6:1046.50, D6:1174.66, E6:1318.51
};
/* ---- 28.3 pressing a record ---------------------------------------------
   One OfflineAudioContext per disc. Same voices as the machine's own
   speaker — squares and triangles and filtered noise — just given room to
   breathe and a stereo spread, because this is the good hi-fi. */
export function hifiPress(spec, rate) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OAC) return Promise.resolve(null);
  const step = 15 / spec.bpm;                       /* one sixteenth */
  const barLen = spec.len * step;
  const total = barLen * spec.reps + 2.2;
  let oc;
  try { oc = new OAC(2, Math.ceil(rate * total), rate); } catch (e) { return Promise.resolve(null); }

  const out = oc.createGain(); out.gain.value = 0.82; out.connect(oc.destination);
  /* a gentle roll-off so the squares are not all edge */
  const soft = oc.createBiquadFilter(); soft.type = 'lowpass';
  soft.frequency.value = 5200; soft.Q.value = 0.5; soft.connect(out);

  const bus = (panv, level) => {
    const p = oc.createStereoPanner ? oc.createStereoPanner() : null;
    const g = oc.createGain(); g.gain.value = level;
    if (p) { p.pan.value = panv; g.connect(p); p.connect(soft); } else g.connect(soft);
    return g;
  };
  const leadB = bus(0.18, 0.34), bassB = bus(0, 0.46), padB = bus(-0.26, 0.22),
        arpB  = bus(0.34, 0.18), drumB = bus(0, 0.40);

  const note = (dest, f, at, dur, type, vol, glide) => {
    const o = oc.createOscillator(), g = oc.createGain();
    o.type = type; o.frequency.setValueAtTime(f, at);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.012);
    g.gain.setValueAtTime(vol, at + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(dest); o.start(at); o.stop(at + dur + 0.05);
  };
  const hit = (dest, at, ms, freq, q, vol) => {
    const n = Math.max(1, Math.floor(rate * ms / 1000));
    const buf = oc.createBuffer(1, n, rate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const s = oc.createBufferSource(); s.buffer = buf;
    const f = oc.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = oc.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(dest); s.start(at);
  };

  for (let r = 0; r < spec.reps; r++) {
    const t0 = r * barLen;
    const at = i => t0 + i * step;
    const fade = r === 0 ? 0.55 : (r >= spec.reps - 2 ? 0.6 : 1);   /* in at the top, out at the end */
    (spec.bass || []).forEach(n => note(bassB, HFN[n[0]], at(n[1]), n[2] * step * 0.92, 'square', 0.30 * fade));
    (spec.pad  || []).forEach(n => note(padB,  HFN[n[0]], at(n[1]), n[2] * step * 0.96, 'triangle', 0.22 * fade));
    (spec.lead || []).forEach(n => note(leadB, HFN[n[0]], at(n[1]), n[2] * step * 0.90, 'square', 0.26 * fade));
    if (spec.arp && r > 0) (spec.arp).forEach(n => note(arpB, HFN[n[0]], at(n[1]), n[2] * step * 0.7, 'triangle', 0.20 * fade));
    if (r > 0) {
      (spec.kick  || []).forEach(i => note(drumB, 132, at(i), 0.17, 'sine', 0.55 * fade, 44));
      (spec.snare || []).forEach(i => { hit(drumB, at(i), 140, 1850, 0.9, 0.32 * fade); note(drumB, 190, at(i), 0.09, 'triangle', 0.16 * fade, 92); });
      (spec.hat   || []).forEach(i => hit(drumB, at(i), 28, 8200, 1.7, 0.14 * fade));
    }
  }
  return oc.startRendering();
}

/* ---- 28.4 what a file says about itself ---------------------------------
   Minimal ID3v2: enough for a title, an artist and the cover art, and
   nothing else. Anything unparseable falls back to the filename. */
export function hifiTags(ab) {
  const out = { title: null, artist: null, art: null };
  try {
    const v = new DataView(ab), u = new Uint8Array(ab);
    if (u.length < 10 || u[0] !== 0x49 || u[1] !== 0x44 || u[2] !== 0x33) return out;
    const major = u[3];
    const syncsafe = o => (u[o] << 21) | (u[o + 1] << 14) | (u[o + 2] << 7) | u[o + 3];
    const size = syncsafe(6);
    let p = 10;
    const end = Math.min(u.length, 10 + size);
    const str = (off, len, enc) => {
      const b = u.subarray(off, off + len);
      if (enc === 1 || enc === 2) {
        try { return new TextDecoder(enc === 1 ? 'utf-16' : 'utf-16be').decode(b).replace(/\0+$/, ''); }
        catch (e) { return ''; }
      }
      try { return new TextDecoder(enc === 3 ? 'utf-8' : 'iso-8859-1').decode(b).replace(/\0+$/, ''); }
      catch (e) { return ''; }
    };
    while (p + 10 <= end) {
      const id = String.fromCharCode(u[p], u[p + 1], u[p + 2], u[p + 3]);
      if (!/^[A-Z0-9]{4}$/.test(id)) break;
      const fs = major >= 4 ? syncsafe(p + 4) : v.getUint32(p + 4);
      if (fs <= 0 || p + 10 + fs > end) break;
      const body = p + 10;
      if (id === 'TIT2' || id === 'TPE1') {
        const s = str(body + 1, fs - 1, u[body]);
        if (s) { if (id === 'TIT2') out.title = s; else out.artist = s; }
      } else if (id === 'APIC' && !out.art) {
        const enc = u[body];
        let q = body + 1;
        while (q < body + fs && u[q] !== 0) q++;          /* mime */
        const mime = str(body + 1, q - body - 1, 0) || 'image/jpeg';
        q++; q++;                                         /* skip picture type */
        if (enc === 1 || enc === 2) { while (q + 1 < body + fs && !(u[q] === 0 && u[q + 1] === 0)) q += 2; q += 2; }
        else { while (q < body + fs && u[q] !== 0) q++; q++; }
        if (q < body + fs) out.art = new Blob([u.subarray(q, body + fs)], { type: mime });
      }
      p = body + fs;
    }
  } catch (e) { /* a tag we cannot read is a tag we do not need */ }
  return out;
}

