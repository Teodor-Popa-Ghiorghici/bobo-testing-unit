const fs = require('fs');
let hw = fs.readFileSync('kernel/snd.js', 'utf8');

hw = hw.replace(/export const Snd = \{/, `
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
`);

hw = hw.replace(/actx = new \(window.AudioContext \|\| window.webkitAudioContext\)\(\);/, 'actx = new (window.AudioContext || window.webkitAudioContext)();\n  Snd.ctx = actx;');

fs.writeFileSync('kernel/snd.js', hw);
