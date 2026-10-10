/* node apps/standbattle/pose_check.js: POSE (pose_random.js, pure Node).
   THE POSES   every joint inside the rig's own limits, never the same twice, always a whole pose
   THE FIGHT   it changes nothing in the sim: a seeded fight is played with and without it and every frame of it is the same
   LETTING GO  a fighter who acts is let go; one who stands still keeps the pose */
import { randomPose, applyPosed, rollPoses, layPoses, calm, LIMITS, btnRect, hitBtn, BTN } from './pose_random.js';
import { basePose } from './anim.js';
import { createFight } from './fight.js';
import { createRng } from './rng.js';
import { defOf } from './roster.js';
import { STAGES } from './stages.js';
let bad = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const dice = seed => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
const within = (v, [a, b]) => v >= a && v <= b;

console.log('-- the poses --');
{
  const r = dice(11); let inLimits = true, whole = true; const seen = new Set();
  for (let i = 0; i < 500; i++) {
    const p = randomPose(r);
    inLimits = inLimits && [p.armFront, p.armRear].every(a => within(a.sh, LIMITS.armSh) && within(a.el, LIMITS.armEl)) && [p.legFront, p.legRear].every(l => within(l.hip, LIMITS.legHip) && within(l.knee, LIMITS.legKnee)) &&
      within(p.chestRot, LIMITS.chest) && within(p.headRot, LIMITS.head) && within(p.hipRot, LIMITS.hipRot) && within(p.hipY, LIMITS.hipY) && within(p.hipX, LIMITS.hipX) && within(p.bodyRot, LIMITS.body);
    whole = whole && ['fist', 'open', 'grip'].includes(p.handFront) && ['fist', 'open', 'grip'].includes(p.handRear) && typeof p.eyes === 'string' && typeof p.mouth === 'string' && typeof p.brow === 'string';
    seen.add(JSON.stringify(p));
  }
  ok(inLimits, 'five hundred poses, every joint inside the rig\'s own limits (an elbow bends one way, a knee the other)');
  ok(whole, 'every one is a whole pose: two arms, two legs, the chest, the head, the hands and a face');
  ok(seen.size === 500, 'and no two are alike');
  const base = basePose(), p = randomPose(dice(3)); applyPosed(base, p);
  ok(base.armFront.sh === p.armFront.sh && base.legRear.knee === p.legRear.knee && base.smear === 0 && base.ghosts === null, 'laid over a pose it replaces the limbs and puts the smear and the ghosts away');
}

console.log('\n-- the fight --');
{
  const mk = () => createFight({ defs: [defOf('jotaro'), defOf('kira')], stage: STAGES.street, rng: createRng('pose'), training: false });
  const play = (withPose) => {
    const f = mk(), view = { poses: [basePose(), basePose()] }, snaps = [];
    for (let i = 0; i < 600; i++) {
      if (withPose && i % 50 === 25) rollPoses(f, view, dice(i + 5));
      if (withPose) { view.poses = [basePose(), basePose()]; layPoses(f, view); }
      f.update(16.67, slot => (i % 90 < 8 && slot === 0 ? 16 : i % 120 > 100 && slot === 1 ? 32 : 0));
      snaps.push(JSON.stringify(f.fighters.map(x => [x.x, x.y, x.z, x.hp, x.state, x.stun, x.mf])));
    }
    return snaps;
  };
  const a = play(false), b = play(true);
  ok(a.length === 600 && a.every((s, i) => s === b[i]), 'six hundred frames of a seeded fight, played with POSE pressed every second: every frame the same as without it');
}

console.log('\n-- letting go --');
{
  const f = { state: 'idle', walk: 0, crouch: false, guard: false };
  ok(calm(f, 'idle') && !calm(Object.assign({}, f, { walk: 1 }), 'idle') && !calm(Object.assign({}, f, { crouch: true }), 'idle') && !calm(Object.assign({}, f, { guard: true }), 'idle') && !calm(Object.assign({}, f, { state: 'attack' }), 'idle'), 'still, he keeps it; walking, crouching, guarding or attacking lets it go');
  const fight = { fighters: [{ state: 'idle', walk: 0 }, { state: 'idle', walk: 0 }] }, view = { poses: [basePose(), basePose()] };
  rollPoses(fight, view, dice(2));
  layPoses(fight, view);
  ok(view.posed && view.poses[0].armFront.sh !== basePose().armFront.sh, 'both are posed');
  fight.fighters[1].state = 'hitstun';
  view.poses = [basePose(), basePose()]; layPoses(fight, view);
  ok(view.posed && view.posed[1] === null && view.poses[1].armFront.sh === basePose().armFront.sh && view.poses[0].armFront.sh !== basePose().armFront.sh, 'one is hit: he is let go, the other keeps it');
  fight.fighters[0].walk = 1; view.poses = [basePose(), basePose()]; layPoses(fight, view);
  ok(view.posed === null, 'and when both have acted there is nothing left');
}
{
  const r = btnRect(480, 270);
  ok(r.x + r.w < 480 && r.y + r.h < 270 && hitBtn(480, 270, r.x + 2, r.y + 2) && !hitBtn(480, 270, r.x - 2, r.y + 2) && BTN.w >= 60, 'the button is on the picture, bottom right, and the click finds it');
}
console.log(bad ? bad + ' FAILED' : 'all good');
process.exit(bad ? 1 : 0);
