/* Pose engine.

   Sprites are never drawn from a frame table; every character is a
   forward-kinematic rig and this file decides where its joints are this
   millisecond. Angle convention (character always authored facing +x):
   0 rad points straight DOWN, positive swings FORWARD, so a limb's
   direction is (sin a, cos a) and a horizontal punch is +PI/2.

   Liveliness comes from three things layered on top of the raw combat
   state: anticipation/overshoot easing inside every action, spring-lagged
   secondary motion for hair and coat driven by the body's own velocity,
   and always-on idle life (breathing, blinking, weight shifts) so nothing
   ever sits perfectly still. */

const state = new WeakMap();

export function animState(f) {
  let s = state.get(f);
  if (!s) {
    s = {
      t: 0, prevX: f.x, vx: 0, vsm: 0,
      hair: { x: 0, v: 0 }, coat: { x: 0, v: 0 }, head: { x: 0, v: 0 },
      breathT: Math.random() * 6, blinkIn: 1 + Math.random() * 3, blink: 0,
      shiftT: Math.random() * 8, action: '', actionT: 0, prevAction: '',
      hitSeed: 0, hitCount: 0, land: 0, stepFlash: 0, prevGait: 0, stepped: 0
    };
    state.set(f, s);
  }
  return s;
}

function spring(s, target, k, damp, dt) {
  s.v += (target - s.x) * k * dt;
  s.v *= Math.exp(-damp * dt);
  s.x += s.v * dt;
  return s.x;
}

export const ease = {
  outCubic: t => 1 - Math.pow(1 - t, 3),
  outQuint: t => 1 - Math.pow(1 - t, 5),
  inQuad: t => t * t,
  inQuart: t => t * t * t * t,
  inOut: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  /* overshoots past 1 then settles -- follow-through */
  back: t => 1 + 2.2 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2),
  /* snappy pop used for impacts */
  pop: t => Math.sin(Math.min(1, t) * Math.PI)
};

export function basePose() {
  return {
    action: 'idle', t: 0,
    hipX: 0, hipY: 0, hipRot: 0,
    chestRot: 0, chestY: 0, shoulderRot: 0,
    headRot: 0, headX: 0, headY: 0,
    legRear: { hip: -0.16, knee: -0.12 }, legFront: { hip: 0.17, knee: -0.16 },
    armRear: { sh: 0.12, el: 0.30 }, armFront: { sh: -0.10, el: 0.34 },
    handRear: 'fist', handFront: 'fist',
    squashX: 1, squashY: 1,
    hairFlow: 0, coatFlow: 0, capeLift: 0,
    breath: 0, blink: 0, eyes: 'normal', brow: 'normal', mouth: 'closed', pupil: 0,
    flash: 0, ghosts: null, smear: 0, smearDir: 1,
    aura: 0, standOut: 0, standPunch: 0, standRot: 0, glow: 0, telegraph: 0,
    dust: 0, airborne: 0, gaitPhase: -1, bodyRot: 0
  };
}

/* Shared per-frame bookkeeping: velocity, cloth springs, breath, blink. */
function tick(f, s, dtMs, pose, energy) {
  const dt = Math.min(0.05, dtMs / 1000);
  s.t += dt;
  const vx = (f.x - s.prevX) / Math.max(0.0001, dt);
  s.prevX = f.x;
  s.vx = vx;
  s.vsm += (vx - s.vsm) * Math.min(1, dt * 12);

  const facing = f.facing || 1;
  const drag = Math.max(-1.1, Math.min(1.1, -s.vsm * facing / 190));
  spring(s.hair, drag * 0.8 + pose.hairFlow, 190, 13, dt);
  spring(s.coat, drag + pose.coatFlow * 1.1, 120, 9.5, dt);
  spring(s.head, pose.headRot, 260, 16, dt);
  pose.hairFlow = s.hair.x;
  pose.coatFlow = s.coat.x;

  s.breathT += dt * (0.8 + energy * 1.9);
  pose.breath = Math.sin(s.breathT * 1.5);

  s.blinkIn -= dt;
  if (s.blinkIn <= 0) { s.blink = 0.14; s.blinkIn = 2.2 + Math.random() * 3.6; }
  if (s.blink > 0) { s.blink = Math.max(0, s.blink - dt); pose.blink = Math.min(1, s.blink / 0.07); }

  if (pose.action !== s.action) { s.prevAction = s.action; s.action = pose.action; s.actionT = 0; }
  else s.actionT += dt;
  return dt;
}

/* --- shared action builders ------------------------------------------- */

/* A fighting stance, not a standing pose: weight settled between bent
   knees, rear fist cocked at the ribs, lead hand up. A character who
   idles with their arms hanging straight down reads as waiting for the
   fight to start rather than being in one. */
export function applyIdle(pose, s, energy) {
  const b = pose.breath;
  const sway = Math.sin(s.t * 0.62);
  const bounce = Math.sin(s.t * 1.9) * (0.4 + energy * 0.6);
  pose.hipY = 2.4 + b * 0.5 + bounce * 0.5;
  pose.chestY = -b * 0.9;
  pose.chestRot = -0.07 + b * 0.04 + sway * 0.03;
  pose.headY = -b * 0.5;
  pose.headRot = 0.06 - b * 0.03 + Math.sin(s.t * 0.43) * 0.05;
  pose.hipX = sway * 0.7;
  pose.hipRot = sway * 0.04;
  pose.armRear = { sh: 0.42 + b * 0.06 + sway * 0.04, el: 1.62 + b * 0.07 };
  pose.armFront = { sh: -0.46 - b * 0.05 - sway * 0.05, el: 1.30 + b * 0.08 };
  pose.legRear = { hip: -0.30 + sway * 0.02, knee: -0.34 - b * 0.03 - bounce * 0.02 };
  pose.legFront = { hip: 0.32 - sway * 0.02, knee: -0.40 + b * 0.03 + bounce * 0.02 };
  pose.hairFlow = Math.sin(s.t * 1.1) * 0.06 + b * 0.03;
  pose.coatFlow = Math.sin(s.t * 0.9 + 1) * 0.09;
  pose.pupil = Math.sin(s.t * 0.35) * 0.6;
  if (energy > 0.6) {
    /* winded: deeper crouch, heavier breathing, head drops on the exhale */
    pose.hipY += 1.4;
    pose.chestRot -= 0.06;
    pose.headY += Math.max(0, -b) * 0.8;
  }
}

/* A real gait: contact -> weight transfer -> passing -> lift, with the
   pelvis dropping on the loaded leg and the shoulders counter-rotating. */
export function applyWalk(pose, s, phase, speed) {
  pose.gaitPhase = phase;
  const p = phase * Math.PI * 2;
  const sn = Math.sin(p), cs = Math.cos(p);
  pose.legFront.hip = 0.52 * sn;
  pose.legRear.hip = 0.52 * -sn;
  pose.legFront.knee = -0.14 - 0.46 * Math.max(0, Math.sin(p - 1.0));
  pose.legRear.knee = -0.14 - 0.46 * Math.max(0, Math.sin(p + Math.PI - 1.0));
  pose.hipY = -0.4 - Math.abs(cs) * 1.1;
  pose.hipRot = sn * 0.07;
  pose.chestRot = -sn * 0.10;
  pose.chestY = -Math.abs(cs) * 0.8;
  pose.headY = -Math.abs(cs) * 0.7;
  pose.headRot = sn * 0.05;
  pose.armFront.sh = -0.55 * sn - 0.05;
  pose.armRear.sh = 0.55 * sn + 0.05;
  pose.armFront.el = 0.5 + 0.25 * Math.max(0, sn);
  pose.armRear.el = 0.5 + 0.25 * Math.max(0, -sn);
  pose.hairFlow = 0.10 + sn * 0.05;
  pose.coatFlow = 0.22 + sn * 0.12;
  pose.squashY = 1 + Math.abs(cs) * 0.012 * speed;
}

/* Anticipation -> explosive extension -> follow-through. `reach` scales
   how far the punching arm travels, `heavy` widens the anticipation. */
export function applyStrike(pose, phase, t, heavy, reach) {
  if (phase === 'windup') {
    const k = ease.outCubic(t);
    pose.chestRot = -0.34 * k * heavy;
    pose.hipRot = -0.16 * k;
    /* the cocked fist is pulled back AND up so it clears the shoulder --
       an anticipation the player can actually see in silhouette */
    pose.armFront.sh = -0.46 - 0.95 * k * heavy;
    pose.armFront.el = 1.30 + 0.75 * k;
    pose.armRear.sh = 0.42 + 0.45 * k;
    pose.armRear.el = 1.62 - 0.35 * k;
    pose.hipY = 1.4 * k * heavy;
    pose.legFront.knee = -0.16 - 0.45 * k;
    pose.legRear.knee = -0.12 - 0.30 * k;
    pose.headRot = -0.10 * k;
    pose.squashY = 1 - 0.035 * k;
    pose.squashX = 1 + 0.03 * k;
    pose.coatFlow = -0.35 * k;
    pose.hairFlow = -0.22 * k;
    pose.brow = 'angry'; pose.eyes = 'narrow'; pose.mouth = 'grit';
    pose.telegraph = k;
  } else if (phase === 'active') {
    const k = ease.outQuint(Math.min(1, t * 2.6));
    pose.chestRot = -0.34 * heavy + k * (0.34 * heavy + 0.42);
    pose.hipRot = 0.20 * k;
    pose.armFront.sh = -0.95 * heavy + k * (0.95 * heavy + 1.46 * reach);
    pose.armFront.el = Math.max(0.02, 1.84 - k * 1.8);
    pose.armRear.sh = 0.62 - k * 0.9;
    pose.armRear.el = 1.2 - k * 0.5;
    pose.hipX = k * 2.6 * reach;
    pose.hipY = -0.6 * k;
    pose.legFront.hip = 0.17 + 0.30 * k;
    pose.legRear.hip = -0.16 - 0.42 * k;
    pose.legRear.knee = -0.12 - 0.1 * k;
    pose.headRot = 0.16 * k;
    pose.squashX = 1 + 0.10 * k;
    pose.squashY = 1 - 0.06 * k;
    pose.coatFlow = 0.75 * k;
    pose.hairFlow = 0.5 * k;
    pose.smear = k * (heavy > 1 ? 1 : 0.6);
    pose.brow = 'angry'; pose.eyes = 'wide'; pose.mouth = 'shout';
    pose.dust = t < 0.35 ? 1 : 0;
  } else {
    const k = ease.outCubic(t);
    const b = 1 - ease.back(Math.min(1, t * 1.15));
    pose.chestRot = 0.42 * b;
    pose.armFront.sh = 1.62 * reach * b - 0.10 * k;
    pose.armFront.el = 0.02 + 0.32 * k;
    pose.armRear.sh = -0.28 * b + 0.12 * k;
    pose.armRear.el = 0.7 * b + 0.3 * k;
    pose.hipX = 2.6 * reach * b;
    pose.legFront.hip = 0.17 + 0.30 * b;
    pose.legRear.hip = -0.16 - 0.42 * b;
    pose.coatFlow = 0.75 * b;
    pose.hairFlow = 0.5 * b;
    pose.headRot = 0.16 * b;
    pose.eyes = 'narrow'; pose.mouth = 'grit';
  }
}

export function applyHurt(pose, t, seed, heavy) {
  const k = ease.outQuint(Math.min(1, t * 3));
  const jitter = Math.sin(t * 46 + seed) * (1 - t) * 0.09;
  pose.chestRot = -0.55 * heavy * (1 - t * 0.55) + jitter;
  pose.hipRot = -0.2 * (1 - t * 0.6);
  pose.headRot = -0.5 * heavy * (1 - t * 0.4) + jitter * 2;
  pose.headX = -1.6 * heavy * (1 - t * 0.5);
  pose.hipX = -2.4 * heavy * (1 - t * 0.6);
  pose.hipY = 1.2 * (1 - t);
  pose.armFront.sh = -0.10 - 1.15 * (1 - t * 0.5) - (seed % 2) * 0.2;
  pose.armFront.el = 0.34 + 0.9 * (1 - t);
  pose.armRear.sh = 0.12 + 1.0 * (1 - t * 0.5);
  pose.armRear.el = 0.3 + 0.7 * (1 - t);
  pose.legFront.hip = 0.17 - 0.36 * (1 - t);
  pose.legRear.hip = -0.16 - 0.55 * (1 - t * 0.7);
  pose.legRear.knee = -0.12 - 0.5 * (1 - t);
  pose.squashX = 1 + 0.09 * (1 - k);
  pose.squashY = 1 - 0.07 * (1 - k);
  pose.coatFlow = -0.8 * (1 - t);
  pose.hairFlow = -0.6 * (1 - t);
  pose.eyes = 'shut'; pose.brow = 'pain'; pose.mouth = 'shout';
  pose.handFront = 'open'; pose.handRear = 'open';
}

/* Death in three readable beats: stagger, buckle, fall. */
export function applyDeath(pose, t) {
  if (t < 0.28) {
    const k = t / 0.28;
    pose.chestRot = -0.5 * k; pose.headRot = -0.6 * k; pose.hipX = -2 * k;
    pose.armFront.sh = -1.3 * k; pose.armRear.sh = 1.2 * k;
    pose.legRear.hip = -0.16 - 0.5 * k;
  } else if (t < 0.55) {
    const k = (t - 0.28) / 0.27;
    pose.chestRot = -0.5 + 0.9 * k;
    pose.headRot = -0.6 + 0.9 * k;
    pose.hipY = 5 * k;
    pose.legFront.hip = 0.5 * k; pose.legFront.knee = -1.5 * k;
    pose.legRear.hip = -0.66 + 0.3 * k; pose.legRear.knee = -1.3 * k;
    pose.armFront.sh = -1.3 + 1.5 * k; pose.armRear.sh = 1.2 - 0.6 * k;
    pose.hipX = -2 - 1 * k;
  } else {
    /* the fall itself: the whole body pivots over the heels and lands
       flat, rather than folding into a crouch that never topples */
    const k = ease.inQuad(Math.min(1, (t - 0.55) / 0.45));
    pose.bodyRot = -1.42 * k;
    pose.chestRot = 0.4 - 0.5 * k;
    pose.headRot = 0.3 - 0.6 * k;
    pose.hipY = 5 - 3 * k;
    pose.hipX = -3 + 6 * k;
    pose.legFront.hip = 0.5 - 0.7 * k; pose.legFront.knee = -1.5 + 1.1 * k;
    pose.legRear.hip = -0.36 + 0.2 * k; pose.legRear.knee = -1.3 + 1.0 * k;
    pose.armFront.sh = 0.2 + 1.5 * k; pose.armRear.sh = 0.6 + 1.2 * k;
    pose.squashY = 1 - 0.06 * k; pose.squashX = 1 + 0.06 * k;
    pose.dust = k > 0.7 ? 1 : 0;
  }
  pose.eyes = 'x'; pose.mouth = 'open'; pose.brow = 'pain';
  pose.handFront = 'open'; pose.handRear = 'open';
  pose.coatFlow = 0.6; pose.hairFlow = 0.4;
}

export { tick };
