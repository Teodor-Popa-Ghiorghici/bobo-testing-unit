const fs = require('fs');

const code = `
let actx = null;

function initAudio() {
  if (actx) return;
  actx = new (window.AudioContext || window.webkitAudioContext)();
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

export const Snd = {
  wake: () => { initAudio(); },
  click: () => beep(400, 'square', 0.05, 0.5),
  open: () => beep(800, 'square', 0.1, 0.3),
  select: () => beep(600, 'square', 0.05, 0.3),
  close: () => beep(300, 'square', 0.1, 0.3),
  type: () => beep(1200, 'square', 0.02, 0.1),
  bell: () => beep(1000, 'sine', 0.5, 0.6),
  err: () => beep(150, 'sawtooth', 0.3, 0.8),
  ok: () => beep(600, 'square', 0.1, 0.3)
};
window.Snd = Snd;

document.addEventListener('click', () => { if (!actx) initAudio(); if(actx && actx.state !== 'running') actx.resume(); }, { once: false });
`;

fs.writeFileSync('kernel/snd.js', code);
