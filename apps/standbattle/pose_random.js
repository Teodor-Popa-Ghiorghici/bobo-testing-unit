/* POSE: the quiet gift from HOLYC.EXE (kernel/buffs_core.js 'battle_pose'). One button, and every fighter's limbs go somewhere random: arms, elbows, hips, knees, the lean of the
   chest and the tilt of the head, a hand that is a fist or open or gripped, a face. It is a coat of paint over the picture and nothing else: it is applied to the POSE the renderer
   draws (draw_fight.js), never to the fight, so it changes nothing in the sim, no hitbox, no frame, no damage (pose_check.js proves the fight is untouched), and it is let go
   the moment the fighter does anything (moves, crouches, guards, is hit, attacks). Pure; `rand` is any 0..1 dice (the cosmetic Math.random, not the fight's seeded one). */
const span = (rand, a, b) => a + (b - a) * rand();
const pick = (rand, list) => list[Math.floor(rand() * list.length) % list.length];

/* the ranges are the rig's own (anim.js: 0 is straight down, positive swings forward): an elbow only bends one way and a knee only the other */
export const LIMITS = {
  armSh: [-2.7, 2.7], armEl: [0, 2.5], legHip: [-0.9, 1.3], legKnee: [-2.0, 0], chest: [-0.5, 0.5], head: [-0.6, 0.6], hipRot: [-0.28, 0.28], hipY: [0, 12], hipX: [-6, 6], body: [-0.22, 0.22]
};
const HANDS = ['fist', 'open', 'grip'], EYES = ['normal', 'wide', 'narrow', 'shut', 'x'], BROWS = ['normal', 'angry', 'pain'], MOUTHS = ['closed', 'grit', 'open', 'shout', 'smirk'];

export function randomPose(rand) {
  const L = LIMITS;
  return {
    armFront: { sh: span(rand, ...L.armSh), el: span(rand, ...L.armEl) }, armRear: { sh: span(rand, ...L.armSh), el: span(rand, ...L.armEl) },
    legFront: { hip: span(rand, ...L.legHip), knee: span(rand, ...L.legKnee) }, legRear: { hip: span(rand, ...L.legHip), knee: span(rand, ...L.legKnee) },
    chestRot: span(rand, ...L.chest), headRot: span(rand, ...L.head), hipRot: span(rand, ...L.hipRot), hipX: span(rand, ...L.hipX), hipY: span(rand, ...L.hipY),
    bodyRot: rand() < 0.2 ? span(rand, ...L.body) : 0,
    handFront: pick(rand, HANDS), handRear: pick(rand, HANDS), eyes: pick(rand, EYES), brow: pick(rand, BROWS), mouth: pick(rand, MOUTHS)
  };
}

/* laid over a fighter's pose for this frame */
export function applyPosed(pose, p) {
  pose.armFront = Object.assign({}, p.armFront); pose.armRear = Object.assign({}, p.armRear);
  pose.legFront = Object.assign({}, p.legFront); pose.legRear = Object.assign({}, p.legRear);
  ['chestRot', 'headRot', 'hipRot', 'hipX', 'hipY', 'bodyRot', 'handFront', 'handRear', 'eyes', 'brow', 'mouth'].forEach(k => { pose[k] = p[k]; });
  pose.smear = 0; pose.telegraph = 0; pose.ghosts = null;
  return pose;
}

/* is the fighter doing nothing a pose could get in the way of? (the state is the one it was in when it was posed, and he is not walking, crouching or guarding) */
export const calm = (f, then) => f.state === then && !f.walk && !f.crouch && !f.guard;

/* a roll for every fighter: remembered on the view with the state each was in, so it can be let go when they act. Returns how many were posed. */
export function rollPoses(fight, view, rand) {
  view.posed = fight.fighters.map(f => ({ pose: randomPose(rand), state: f.state }));
  return view.posed.length;
}
/* applied to the poses the renderer has just made; a fighter who has done something since is let go */
export function layPoses(fight, view) {
  if (!view.posed) return;
  fight.fighters.forEach((f, k) => {
    const p = view.posed[k];
    if (!p) return;
    if (!calm(f, p.state)) { view.posed[k] = null; return; }
    applyPosed(view.poses[k], p.pose);
  });
  if (!view.posed.some(Boolean)) view.posed = null;
}

/* the button on the glass: bottom right of the 480 x 270 picture */
export const BTN = { w: 70, h: 16 };
export const btnRect = (W, H) => ({ x: W - BTN.w - 6, y: H - BTN.h - 6, w: BTN.w, h: BTN.h });
export const hitBtn = (W, H, mx, my) => { const r = btnRect(W, H); return mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h; };
