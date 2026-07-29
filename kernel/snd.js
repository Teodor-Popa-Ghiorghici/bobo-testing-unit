
let actx = null;

function initAudio() {
  if (actx) return;
  actx = new (window.AudioContext || window.webkitAudioContext)();
  Snd.ctx = actx;
}

function beep(freq, type, dur, vol) {
  if (!actx) initAudio();
  if (!actx || actx.state !== 'running') return;
  if (!window.CRT || !window.CRT.on) return; // don't play if off
  
  const osc = actx.createOscillator();
  const gain = actx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, actx.currentTime);
  
  const v = (window.CRT && window.CRT.sfx !== undefined) ? (window.CRT.sfx / 10) : 0.5;
  
  gain.gain.setValueAtTime(vol * v, actx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + dur);
  
  osc.connect(gain);
  gain.connect(actx.destination);
  
  osc.start();
  osc.stop(actx.currentTime + dur);
}


function createNoiseBuffer(ctx, dur) {
  const len = ctx.sampleRate * dur;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

export const Snd = {
  ctx: null, // will be assigned in initAudio
  tone: function(freq, ms, opts = {}) {
    if (!actx || actx.state !== 'running' || !window.CRT || !window.CRT.on) return;
    const now = actx.currentTime;
    const dur = ms / 1000;
    const delay = opts.delay || 0;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    
    osc.type = opts.type || 'square';
    osc.frequency.setValueAtTime(freq, now + delay);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, now + delay + dur);
    
    const v = (window.CRT && window.CRT.sfx !== undefined) ? (window.CRT.sfx / 10) : 0.5;
    const vol = (opts.vol || 0.1) * v;
    
    gain.gain.setValueAtTime(vol, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);
    
    osc.connect(gain);
    gain.connect(actx.destination);
    
    osc.start(now + delay);
    osc.stop(now + delay + dur);
  },
  noise: function(ms, opts = {}) {
    if (!actx || actx.state !== 'running' || !window.CRT || !window.CRT.on) return;
    const now = actx.currentTime;
    const dur = ms / 1000;
    
    const src = actx.createBufferSource();
    src.buffer = createNoiseBuffer(actx, dur);
    
    const filt = actx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = opts.freq || 1000;
    filt.Q.value = opts.q || 1;
    
    const gain = actx.createGain();
    const v = (window.CRT && window.CRT.sfx !== undefined) ? (window.CRT.sfx / 10) : 0.5;
    gain.gain.setValueAtTime((opts.vol || 0.1) * v, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    
    src.connect(filt);
    filt.connect(gain);
    gain.connect(actx.destination);
    src.start(now);
  },
  del: function() { beep(200, 'square', 0.1, 0.4); },

  wake: () => { initAudio(); },
  click: () => beep(400, 'square', 0.05, 0.5),
  open: () => beep(800, 'square', 0.1, 0.3),
  select: () => beep(600, 'square', 0.05, 0.3),
  close: () => beep(300, 'square', 0.1, 0.3),
  type: () => beep(1200, 'square', 0.02, 0.1),
  bell: () => beep(1000, 'sine', 0.5, 0.6),
  err: () => beep(150, 'sawtooth', 0.3, 0.8),
  thunk: function() { this.tone(95, 240, { type: 'triangle', to: 28, vol: 0.08 }); },
  holy: function() { [523, 784, 1046, 1318].forEach((f, i) => this.tone(f, 420, { type: 'triangle', delay: i * 0.07, vol: 0.035 })); this.tone(2093, 240, { delay: 0.3, vol: 0.013 }); },
  ok: () => beep(600, 'square', 0.1, 0.3)
};
window.Snd = Snd;

document.addEventListener('click', () => { if (!actx) initAudio(); if(actx && actx.state !== 'running') actx.resume(); }, { once: false });
