/* SFX design -- three-layer hit sounds (thump + crack + bark) with pitch
   jitter, escalating combo pitch and milestone sparkles (the "number goes
   up and sounds better" trick Vampire Survivors leans on), a real parry
   clang, and a distinct danger tick when an enemy telegraphs. Everything
   here calls the machine's own Snd (window.Snd), so it inherits the SFX
   volume knob and the power switch for free. */

function S() { return window.Snd; }

function jitter() { return 1 + (Math.random() * 0.16 - 0.08); }

function hitImpact(freqBase, vol) {
  const snd = S();
  if (!snd) return;
  const j = jitter();
  snd.tone(70 * j, 70, { type: 'triangle', to: 34, vol: vol * 0.9 });
  snd.noise(28, { freq: 1900 * j, q: 1.6, vol: vol * 0.55 });
  snd.tone(freqBase * j, 45, { type: 'square', vol: vol * 0.5 });
}

function onHit(payload) {
  const snd = S();
  if (!snd) return;
  const combo = payload.combo || 1;
  const pitch = 260 * Math.pow(1.035, Math.min(combo, 24));
  const vol = payload.moveType === 'heavy' || payload.moveType === 'rush' ? 0.075 : payload.moveType === 'special' ? 0.06 : 0.05;
  hitImpact(pitch, vol);
  if (combo > 0 && combo % 5 === 0) {
    [0, 1, 2].forEach(i => snd.tone(1100 + combo * 6 + i * 180, 55, { type: 'sine', vol: 0.03, delay: i * 0.03 }));
  }
}

function onKill(payload) {
  const snd = S();
  if (!snd) return;
  snd.noise(150, { freq: 480, q: 0.55, vol: 0.09 });
  snd.tone(90, 240, { type: 'sawtooth', to: 30, vol: 0.06 });
  snd.tone(1046, 130, { type: 'triangle', vol: 0.04, delay: 0.08 });
  snd.tone(1568, 160, { type: 'triangle', vol: 0.035, delay: 0.14 });
}

function onDamageTaken(payload) {
  const snd = S();
  if (!snd) return;
  const vol = payload.heavy ? 0.085 : 0.06;
  const j = jitter();
  snd.noise(60, { freq: 400 * j, q: 0.7, vol });
  snd.tone(150 * j, 150, { type: 'sawtooth', to: 60, vol: vol * 0.8 });
  snd.tone(320 * j, 55, { type: 'square', to: 180, vol: vol * 0.45, delay: 0.03 });
}

function onDodgeSuccess() {
  const snd = S();
  if (!snd) return;
  [1500, 1050, 700].forEach((f, i) => snd.noise(35, { freq: f, q: 0.6, vol: 0.028, delay: i * 0.022 }));
}

function onParrySuccess() {
  const snd = S();
  if (!snd) return;
  snd.noise(20, { freq: 3400, q: 3.2, vol: 0.07 });
  snd.tone(1400, 90, { type: 'triangle', vol: 0.05 });
  snd.tone(2100, 130, { type: 'sine', vol: 0.03, delay: 0.04 });
}

function onTelegraphStart(payload) {
  const snd = S();
  if (!snd || !payload.pattern) return;
  const urgent = payload.pattern.id === 'telegraphed_slam' || payload.pattern.id === 'sheer_heart_attack';
  snd.tone(urgent ? 1900 : 1300, 35, { type: 'square', vol: 0.035 });
  if (urgent) snd.tone(1900, 35, { type: 'square', vol: 0.03, delay: 0.09 });
}

function onPhaseTransition() {
  const snd = S();
  if (!snd) return;
  snd.noise(260, { freq: 300, q: 0.5, vol: 0.09 });
  [220, 180, 140].forEach((f, i) => snd.tone(f, 220, { type: 'sawtooth', to: f * 0.6, vol: 0.05, delay: i * 0.09 }));
  [523, 659, 784].forEach((f, i) => snd.tone(f, 260, { type: 'square', vol: 0.04, delay: 0.4 + i * 0.06 }));
}

function onMoveDenied() { if (S()) S().deny(); }

export function wireCombatAudio(combat) {
  const d = combat.dispatcher;
  d.on('onHit', onHit);
  d.on('onKill', onKill);
  d.on('onDamageTaken', onDamageTaken);
  d.on('onDodgeSuccess', onDodgeSuccess);
  d.on('onParrySuccess', onParrySuccess);
  d.on('onTelegraphStart', onTelegraphStart);
  d.on('onPhaseTransition', onPhaseTransition);
  d.on('onMoveDenied', onMoveDenied);
}

export function sfxVictory() {
  const snd = S(); if (!snd) return;
  [523, 659, 784, 1046].forEach((f, i) => snd.tone(f, 180, { type: 'triangle', vol: 0.05, delay: i * 0.07 }));
}

export function sfxDefeat() {
  const snd = S(); if (!snd) return;
  snd.tone(220, 520, { type: 'sawtooth', to: 55, vol: 0.05 });
}

export function sfxActComplete() {
  const snd = S(); if (!snd) return;
  [523, 659, 784, 1046, 1318].forEach((f, i) => snd.tone(f, 260, { type: 'triangle', vol: 0.05, delay: i * 0.09 }));
}
