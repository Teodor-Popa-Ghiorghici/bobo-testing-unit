/* Enemy/boss poses. Each attack pattern gets its own anticipation shape so
   the player reads WHICH attack is coming, not just THAT one is coming
   (§5.1): a sweep winds across the body, a slam rears overhead, a ranged
   shot draws back and points. Flinch is layered on top of whatever the
   enemy was doing, driven by the hurt flash the combat engine already
   sets -- so getting hit visibly interrupts the pose instead of only
   tinting it. */

import {
  animState, basePose, tick, ease,
  applyIdle, applyWalk, applyDeath
} from './anim.js';
import { DEATH_ANIM_FRAMES } from './constants.js';

function windupPose(pose, id, k) {
  pose.telegraph = k;
  pose.brow = 'angry'; pose.eyes = 'angry'; pose.mouth = 'grit';
  if (id === 'telegraphed_slam') {
    pose.chestRot = -0.30 * k;
    pose.headRot = -0.34 * k;
    pose.armFront = { sh: -2.5 * k - 0.1, el: 0.5 + 0.5 * k };
    pose.armRear = { sh: -2.3 * k + 0.12, el: 0.5 + 0.6 * k };
    pose.hipY = -1.8 * k;
    pose.legFront = { hip: 0.30 + 0.14 * k, knee: -0.20 };
    pose.legRear = { hip: -0.30 - 0.16 * k, knee: -0.26 };
    pose.squashY = 1 + 0.05 * k; pose.squashX = 1 - 0.03 * k;
    pose.coatFlow = -0.4 * k; pose.hairFlow = -0.5 * k;
    pose.handFront = 'grip'; pose.handRear = 'grip';
  } else if (id === 'projectile' || id === 'sheer_heart_attack') {
    pose.chestRot = -0.22 * k;
    pose.hipY = 1.6 * k;
    pose.armFront = { sh: -0.2 - 1.5 * k, el: 1.6 - 0.4 * k };
    pose.armRear = { sh: 0.3 + 0.5 * k, el: 1.4 * k };
    pose.legFront = { hip: 0.40, knee: -0.55 * k - 0.2 };
    pose.legRear = { hip: -0.45, knee: -0.5 * k - 0.2 };
    pose.headRot = 0.10 * k;
    pose.handFront = 'open'; pose.handRear = 'open';
    pose.glow = k;
  } else {
    /* sweep: coil across the body, weight onto the back foot */
    pose.chestRot = -0.42 * k;
    pose.hipRot = -0.24 * k;
    pose.headRot = -0.22 * k;
    pose.armFront = { sh: 0.9 * k - 0.1, el: 1.5 * k + 0.3 };
    pose.armRear = { sh: 0.2 + 0.9 * k, el: 0.4 + 0.7 * k };
    pose.hipX = -1.8 * k;
    pose.hipY = 1.2 * k;
    pose.legFront = { hip: 0.22 - 0.1 * k, knee: -0.4 * k - 0.16 };
    pose.legRear = { hip: -0.2 - 0.3 * k, knee: -0.45 * k - 0.12 };
    pose.coatFlow = -0.5 * k; pose.hairFlow = -0.35 * k;
  }
}

function activePose(pose, id, k) {
  pose.brow = 'angry'; pose.eyes = 'wide'; pose.mouth = 'shout';
  pose.smear = 1;
  if (id === 'telegraphed_slam') {
    pose.chestRot = -0.30 + 0.95 * k;
    pose.headRot = -0.34 + 0.72 * k;
    pose.armFront = { sh: -2.6 + 4.1 * k, el: 1.0 - 0.9 * k };
    pose.armRear = { sh: -2.2 + 3.7 * k, el: 1.1 - 0.9 * k };
    pose.hipY = -1.8 + 4.2 * k;
    pose.legFront = { hip: 0.44 - 0.2 * k, knee: -0.2 - 0.5 * k };
    pose.legRear = { hip: -0.46 + 0.1 * k, knee: -0.26 - 0.45 * k };
    pose.squashY = 1 - 0.09 * k; pose.squashX = 1 + 0.1 * k;
    pose.coatFlow = 0.9 * k; pose.hairFlow = 0.8 * k;
    pose.dust = k > 0.55 ? 1 : 0;
  } else if (id === 'projectile' || id === 'sheer_heart_attack') {
    const p = ease.outQuint(Math.min(1, k * 3));
    pose.chestRot = -0.22 + 0.4 * p;
    pose.armFront = { sh: -1.7 + 3.0 * p, el: 1.2 - 1.15 * p };
    pose.armRear = { sh: 0.8 - 0.4 * p, el: 1.4 - 0.6 * p };
    pose.hipX = 1.6 * p;
    pose.hipY = 1.6 - 1.6 * p;
    pose.handFront = 'open';
    pose.glow = 1 - k * 0.5;
  } else {
    const p = ease.outQuint(Math.min(1, k * 2.4));
    pose.chestRot = -0.42 + 1.0 * p;
    pose.hipRot = -0.24 + 0.5 * p;
    pose.headRot = -0.22 + 0.44 * p;
    pose.armFront = { sh: 0.8 - 2.6 * p, el: 1.8 - 1.7 * p };
    pose.armRear = { sh: 1.1 - 1.0 * p, el: 1.1 - 0.5 * p };
    pose.hipX = -1.8 + 4.4 * p;
    pose.legFront = { hip: 0.12 + 0.42 * p, knee: -0.56 + 0.3 * p };
    pose.legRear = { hip: -0.5 - 0.2 * p, knee: -0.57 + 0.2 * p };
    pose.squashX = 1 + 0.08 * p;
    pose.coatFlow = 1.0 * p; pose.hairFlow = 0.7 * p;
  }
}

function recoverPose(pose, k, breath) {
  const b = 1 - ease.outCubic(k);
  pose.chestRot = 0.5 * b + breath * 0.05;
  pose.headRot = 0.36 * b;
  pose.hipY = 1.6 * b + 0.5;
  pose.armFront = { sh: 0.9 * b - 0.10, el: 0.34 + 0.5 * b };
  pose.armRear = { sh: -0.5 * b + 0.12, el: 0.30 + 0.4 * b };
  pose.legFront = { hip: 0.32 * b + 0.17, knee: -0.36 * b - 0.16 };
  pose.legRear = { hip: -0.4 * b - 0.16, knee: -0.3 * b - 0.12 };
  pose.coatFlow = 0.5 * b; pose.hairFlow = 0.35 * b;
  pose.mouth = k < 0.6 ? 'open' : 'closed';
  pose.eyes = 'narrow';
}

/* a flinch that rides on top of the current pose, so a hit visibly
   interrupts a wind-up instead of being a colour flash on a static body */
function flinch(pose, amount, seed) {
  const a = amount * amount;
  const j = Math.sin(seed * 7.3) * a;
  pose.chestRot -= 0.5 * a;
  pose.headRot -= 0.55 * a + j * 0.2;
  pose.headX -= 1.5 * a;
  pose.hipX -= 1.8 * a;
  pose.hipY += 0.8 * a;
  pose.armFront.sh -= 0.7 * a; pose.armFront.el += 0.5 * a;
  pose.armRear.sh += 0.6 * a; pose.armRear.el += 0.4 * a;
  pose.legRear.knee -= 0.35 * a;
  pose.squashX += 0.07 * a; pose.squashY -= 0.05 * a;
  pose.coatFlow -= 0.7 * a; pose.hairFlow -= 0.5 * a;
  if (amount > 0.25) { pose.eyes = 'shut'; pose.brow = 'pain'; pose.mouth = 'shout'; }
}

export function enemyPose(enemy, tsec, dtMs) {
  const s = animState(enemy);
  const pose = basePose();
  const ai = enemy.ai;

  if (enemy.hp <= 0) {
    pose.action = 'dead';
    const t = 1 - Math.max(0, enemy.deathTimer || 0) / DEATH_ANIM_FRAMES;
    applyDeath(pose, Math.min(1, t));
    pose.flash = enemy.hurtFlash || 0;
    tick(enemy, s, dtMs, pose, 1);
    return pose;
  }

  const hurt = enemy.hurtFlash || 0;
  if (ai && ai.state === 'windup' && ai.pattern) {
    pose.action = 'windup';
    const k = ease.outCubic(1 - Math.max(0, ai.timer) / ai.pattern.windupFrames);
    windupPose(pose, ai.pattern.id, k);
    pose.pattern = ai.pattern.id;
  } else if (ai && ai.state === 'active' && ai.pattern) {
    pose.action = 'active';
    activePose(pose, ai.pattern.id, 1 - Math.max(0, ai.timer) / ai.pattern.activeFrames);
    pose.pattern = ai.pattern.id;
  } else if (ai && ai.state === 'recover' && ai.pattern) {
    pose.action = 'recover';
    recoverPose(pose, 1 - Math.max(0, ai.timer) / ai.pattern.recoverFrames, pose.breath);
  } else if (enemy.moving) {
    pose.action = 'walk';
    s.prevGait = (s.prevGait + dtMs / 1000 * 2.9) % 1;
    applyWalk(pose, s, s.prevGait, 1);
    pose.eyes = 'angry'; pose.brow = 'angry';
  } else {
    pose.action = 'idle';
    applyIdle(pose, s, enemy.hp / enemy.maxHp < 0.4 ? 1 : 0.35);
    pose.eyes = 'angry';
  }

  if (hurt > 0.02 && pose.action !== 'dead') {
    if (s.lastHurt === undefined || hurt > s.lastHurt) s.hitSeed = Math.random() * 10;
    flinch(pose, hurt, s.hitSeed);
    pose.action = pose.action + '-hit';
  }
  /* Stagger scales with how hard the hit actually shoved them, so a jab
     is a twitch and a heavy is a stumble -- the same information the
     knockback carries, made visible on the body. */
  const kb = Math.min(1, Math.abs(enemy.knockVx || 0) / 16);
  if (kb > 0.2) {
    pose.chestRot -= 0.34 * kb;
    pose.headRot -= 0.42 * kb;
    pose.hipY += 1.1 * kb;
    pose.legRear.hip -= 0.5 * kb;
    pose.legRear.knee -= 0.3 * kb;
    pose.legFront.hip += 0.22 * kb;
    pose.armFront.sh -= 0.75 * kb; pose.armFront.el += 0.5 * kb;
    pose.armRear.sh += 0.85 * kb; pose.armRear.el += 0.4 * kb;
    pose.handFront = 'open'; pose.handRear = 'open';
    pose.coatFlow -= 0.8 * kb;
    pose.hairFlow -= 0.7 * kb;
    pose.squashX += 0.05 * kb;
    pose.dust = kb > 0.55 ? 1 : 0;
  }
  s.lastHurt = hurt;
  pose.flash = hurt;
  if (enemy.knockVx) pose.chestRot -= Math.max(-0.3, Math.min(0.3, enemy.knockVx * 0.02 * (enemy.facing || 1)));
  tick(enemy, s, dtMs, pose, ai && ai.state !== 'approach' ? 0.9 : 0.4);
  return pose;
}
