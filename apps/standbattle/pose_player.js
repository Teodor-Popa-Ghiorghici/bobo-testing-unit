/* Turns the player's combat state into a pose. Every branch here is a
   distinct readable silhouette -- the player should be able to name what
   Jotaro is doing from a single frozen frame. */

import {
  animState, basePose, tick, ease,
  applyIdle, applyWalk, applyStrike, applyHurt, applyDeath
} from './anim.js';

const HEAVY = { light: 0.75, medium: 1, heavy: 1.45, special: 0.9, rush: 1.1 };
const REACH = { light: 0.92, medium: 1, heavy: 1.12, special: 0.95, rush: 1 };

function phaseT(player) {
  const m = player.activeMove;
  const total = player.movePhase === 'windup' ? m.windupFrames : player.movePhase === 'active' ? m.activeFrames : m.recoverFrames;
  return 1 - Math.max(0, player.stateTimer) / Math.max(1, total);
}

export function playerPose(player, tsec, dtMs, outcome) {
  const s = animState(player);
  const pose = basePose();
  const lowHp = player.hp / player.maxHp < 0.35;
  const energy = lowHp ? 1 : player.comboCount > 3 ? 0.7 : 0.25;

  if (outcome === 'win') {
    pose.action = 'victory';
    const k = Math.min(1, s.actionT * 1.6);
    const b = Math.sin(s.t * 2.2);
    pose.chestRot = -0.12 - b * 0.03;
    pose.headRot = -0.16 + b * 0.03;
    pose.armFront = { sh: -0.30 - 0.85 * k, el: 1.75 - 0.2 * k };
    pose.armRear = { sh: 0.34, el: 0.5 + b * 0.06 };
    pose.handFront = 'grip';
    pose.legFront.hip = 0.26; pose.legRear.hip = -0.28; pose.legRear.knee = -0.3;
    pose.coatFlow = 0.35 + b * 0.12;
    pose.hairFlow = 0.16 + b * 0.06;
    pose.eyes = 'narrow'; pose.brow = 'normal'; pose.mouth = 'smirk';
    pose.standOut = Math.max(0, 1 - s.actionT * 0.7);
    tick(player, s, dtMs, pose, 0.2);
    return pose;
  }
  if (outcome === 'lose' || player.state === 'dead') {
    pose.action = 'dead';
    applyDeath(pose, Math.min(1, s.actionT / 1.1));
    tick(player, s, dtMs, pose, 1);
    return pose;
  }
  if (player.state === 'hitstun') {
    pose.action = 'hurt';
    if (s.action !== 'hurt') s.hitSeed = Math.random() * 10;
    applyHurt(pose, Math.min(1, s.actionT / 0.26), s.hitSeed, 1);
    pose.flash = Math.max(player.hurtFlash || 0, 0.5 * (1 - s.actionT / 0.14));
    tick(player, s, dtMs, pose, 1);
    return pose;
  }
  if (player.state === 'dodge') {
    pose.action = 'dodge';
    const k = Math.min(1, s.actionT / 0.26);
    const dir = player.dodgeDir * (player.facing || 1);
    pose.hipY = 3.2 * ease.pop(k) + 1.2;
    pose.hipX = -dir * 2.4;
    pose.chestRot = -dir * 0.42;
    pose.headRot = -dir * 0.2;
    pose.legFront = { hip: 0.55 * dir + 0.1, knee: -1.15 };
    pose.legRear = { hip: -0.55 * dir - 0.1, knee: -1.0 };
    pose.armFront = { sh: -0.9, el: 1.5 };
    pose.armRear = { sh: 1.0, el: 1.1 };
    pose.squashX = 1.09; pose.squashY = 0.93;
    pose.coatFlow = -dir * 1.0;
    pose.hairFlow = -dir * 0.7;
    pose.eyes = 'shut'; pose.brow = 'angry'; pose.mouth = 'grit';
    pose.ghosts = dir;
    pose.dust = k < 0.4 ? 1 : 0;
    tick(player, s, dtMs, pose, 0.8);
    return pose;
  }
  if (player.state === 'parry') {
    pose.action = player.parrySuccess ? 'parrySuccess' : 'parry';
    const k = Math.min(1, s.actionT / 0.12);
    pose.chestRot = -0.12 - 0.1 * k;
    pose.hipY = 1.4;
    pose.legFront = { hip: 0.34, knee: -0.5 };
    pose.legRear = { hip: -0.36, knee: -0.42 };
    pose.armFront = { sh: -1.28 * k - 0.1, el: 1.62 };
    pose.armRear = { sh: 0.5, el: 1.5 };
    pose.handFront = 'guard'; pose.handRear = 'guard';
    pose.eyes = player.parrySuccess ? 'wide' : 'narrow';
    pose.brow = 'angry';
    pose.mouth = player.parrySuccess ? 'smirk' : 'grit';
    pose.glow = player.parryWindow ? 1 : 0.2;
    if (player.parrySuccess) {
      const p = ease.pop(Math.min(1, s.actionT / 0.18));
      pose.flash = 0.85 * (1 - Math.min(1, s.actionT / 0.2));
      pose.chestRot += 0.5 * p;
      pose.hipX = 2.4 * p;
      pose.standOut = 1;
      pose.aura = 1;
      pose.squashX = 1 + 0.06 * p;
    }
    tick(player, s, dtMs, pose, 0.6);
    return pose;
  }
  if (player.state === 'attack') {
    const m = player.activeMove;
    const t = phaseT(player);
    pose.action = m.type;
    pose.t = t;
    const heavy = HEAVY[m.type] || 1;
    applyStrike(pose, player.movePhase, t, heavy, REACH[m.type] || 1);

    if (m.type === 'rush' || m.type === 'special') {
      pose.standOut = Math.min(1, (player.movePhase === 'windup' ? t * 1.4 : 1));
      pose.aura = 1;
      if (player.movePhase === 'active') {
        const hitEvery = m.activeFrames / m.hitCount;
        const elapsed = m.activeFrames - Math.max(0, player.stateTimer);
        const beat = elapsed / hitEvery;
        const swing = beat % 1;
        const alt = Math.floor(beat) % 2 === 0 ? 1 : -1;
        pose.standPunch = beat;
        const p = ease.outQuint(Math.min(1, swing * 2.2));
        pose.armFront.sh = alt > 0 ? -0.6 + p * 2.3 : 1.2 - p * 0.9;
        pose.armFront.el = alt > 0 ? Math.max(0.05, 1.5 - p * 1.5) : 0.9;
        pose.armRear.sh = alt < 0 ? -0.4 + p * 2.1 : 1.0 - p * 0.7;
        pose.armRear.el = alt < 0 ? Math.max(0.05, 1.4 - p * 1.4) : 0.9;
        pose.chestRot = 0.28 + Math.sin(beat * Math.PI * 2) * 0.14;
        pose.hipRot = -Math.sin(beat * Math.PI * 2) * 0.1;
        pose.hipX = 1.6 + Math.sin(beat * Math.PI * 2) * 0.8;
        pose.headRot = 0.12 + Math.sin(beat * Math.PI * 2) * 0.05;
        pose.smear = 1;
        pose.mouth = 'shout'; pose.eyes = 'wide';
        pose.squashX = 1.04; pose.squashY = 0.98;
      }
    } else {
      pose.standOut = m.type === 'heavy' ? 0.85 : 0.5;
      pose.aura = m.type === 'heavy' ? 0.5 : 0.2;
      pose.standPunch = player.movePhase === 'active' ? ease.outQuint(Math.min(1, t * 2.6)) : 0;
    }
    pose.flash = player.hurtFlash || 0;
    tick(player, s, dtMs, pose, 0.9);
    return pose;
  }

  if (player.moving) {
    pose.action = 'walk';
    s.prevGait = (s.prevGait + dtMs / 1000 * 2.6) % 1;
    applyWalk(pose, s, s.prevGait, 1);
    pose.eyes = 'narrow'; pose.brow = 'angry';
  } else {
    pose.action = 'idle';
    applyIdle(pose, s, energy);
    pose.brow = lowHp ? 'pain' : 'normal';
    pose.mouth = lowHp ? 'grit' : 'closed';
  }
  pose.flash = player.hurtFlash || 0;
  if (player.comboCount > 4) pose.aura = Math.min(0.6, player.comboCount * 0.05);
  tick(player, s, dtMs, pose, energy);
  return pose;
}

export function playerGait(player) { return animState(player).prevGait; }
