/* Pose calculator, shared by every sprite. Turns raw combat state into a
   character-agnostic pose descriptor; each sprite file decides how to
   paint that pose onto its own body shape. Motion is computed continuously
   then quantized to a handful of steps so it still reads as stepped,
   hand-drawn frames rather than a smooth tween -- the retro-animation
   feel the spec asks for, without hand-authoring a keyframe table per
   action. */

const IDLE_FRAMES = 4;
const WALK_FRAMES = 6;

function quantize(t, steps) {
  if (steps <= 1) return 0;
  return Math.min(steps - 1, Math.floor(Math.max(0, Math.min(0.999, t)) * steps)) / (steps - 1);
}

function basePose() {
  return {
    action: 'idle', legSwing: 0, gaitPhase: -1, armSwing: 0, strikeArm: 0, torsoLean: 0,
    headBob: 0, squashX: 1, squashY: 1,
    faceEyes: 'normal', faceMouth: 'closed',
    flashWhite: 0, ghost: 0, glowStand: 0, telegraph: 0
  };
}

export function computePlayerPose(player, tsec, outcome) {
  const pose = basePose();
  pose.flashWhite = player.hurtFlash || 0;

  if (outcome === 'win') {
    pose.action = 'victory';
    pose.armSwing = 1;
    pose.faceEyes = 'normal'; pose.faceMouth = 'smirk';
    pose.headBob = Math.sin(tsec * 3) * 0.6;
    return pose;
  }
  if (outcome === 'lose' || player.state === 'dead') {
    pose.action = 'dead';
    pose.torsoLean = 0.9; pose.squashY = 0.45; pose.squashX = 1.25;
    pose.faceEyes = 'x'; pose.faceMouth = 'open';
    return pose;
  }
  if (player.state === 'hitstun') {
    pose.action = 'hurt';
    pose.torsoLean = -0.6;
    pose.headBob = -1;
    pose.faceEyes = 'shut'; pose.faceMouth = 'wince';
    pose.flashWhite = Math.max(pose.flashWhite, 0.6);
    return pose;
  }
  if (player.state === 'dodge') {
    pose.action = 'dodge';
    pose.torsoLean = -player.dodgeDir * 0.8;
    pose.squashX = 1.2; pose.squashY = 0.85;
    pose.ghost = 1;
    pose.faceEyes = 'shut';
    return pose;
  }
  if (player.state === 'parry') {
    pose.action = player.parrySuccess ? 'parrySuccess' : 'parry';
    pose.armSwing = 1;
    pose.faceEyes = player.parrySuccess ? 'wide' : 'narrow';
    pose.faceMouth = player.parrySuccess ? 'smirk' : 'grit';
    pose.flashWhite = player.parrySuccess ? 0.8 : 0;
    return pose;
  }
  if (player.state === 'attack') {
    const m = player.activeMove;
    pose.action = m.type === 'rush' ? 'rush' : m.type === 'special' ? 'special' : 'strike';
    pose.faceEyes = 'narrow'; pose.faceMouth = 'grit';
    pose.glowStand = (m.type === 'special' || m.type === 'rush') ? 1 : 0.4;
    if (player.movePhase === 'windup') {
      const t = 1 - Math.max(0, player.stateTimer) / m.windupMs;
      const q = quantize(t, 2);
      pose.strikeArm = -q * 0.6;
      pose.torsoLean = -0.4 * q;
    } else if (player.movePhase === 'active') {
      pose.strikeArm = 1;
      pose.torsoLean = 0.55;
      pose.faceMouth = 'open';
    } else {
      const t = 1 - Math.max(0, player.stateTimer) / m.recoverMs;
      const q = quantize(t, 3);
      pose.strikeArm = 1 - q;
      pose.torsoLean = 0.55 * (1 - q);
    }
    return pose;
  }

  if (player.moving) {
    pose.action = 'walk';
    const f = quantize((tsec * 3.2) % 1, WALK_FRAMES);
    pose.gaitPhase = f;
    const s = Math.sin(f * Math.PI * 2);
    pose.legSwing = s;
    pose.armSwing = -s * 0.6;
    pose.headBob = Math.abs(s) * -0.8;
  } else {
    const f = quantize((tsec * 0.9) % 1, IDLE_FRAMES);
    pose.headBob = Math.sin(f * Math.PI * 2) * 0.6;
  }
  return pose;
}

export function computeEnemyPose(enemy, tsec) {
  const pose = basePose();
  pose.flashWhite = enemy.hurtFlash || 0;

  if (enemy.hp <= 0) {
    pose.action = 'dead';
    const t = 1 - Math.max(0, enemy.deathTimer || 0) / 900;
    const q = quantize(t, 4);
    pose.torsoLean = q * 0.9;
    pose.squashY = 1 - q * 0.55;
    pose.squashX = 1 + q * 0.3;
    pose.faceEyes = 'x'; pose.faceMouth = 'open';
    return pose;
  }

  const ai = enemy.ai;
  if (ai.state === 'windup') {
    pose.action = 'windup';
    const t = ai.pattern ? 1 - Math.max(0, ai.timer) / ai.pattern.windupMs : 0;
    pose.telegraph = quantize(t, 5);
    pose.torsoLean = -0.5 * quantize(t, 3);
    pose.armSwing = -quantize(t, 3);
    pose.faceEyes = 'angry'; pose.faceMouth = 'grit';
  } else if (ai.state === 'active') {
    pose.action = 'active';
    pose.torsoLean = 0.6; pose.armSwing = 1; pose.strikeArm = 1;
    pose.faceEyes = 'angry'; pose.faceMouth = 'open';
  } else if (ai.state === 'recover') {
    pose.action = 'recover';
    const t = ai.pattern ? 1 - Math.max(0, ai.timer) / ai.pattern.recoverMs : 0;
    pose.torsoLean = 0.6 * (1 - quantize(t, 3));
    pose.faceMouth = 'closed';
  } else if (enemy.moving) {
    pose.action = 'walk';
    const f = quantize((tsec * 3) % 1, WALK_FRAMES);
    pose.gaitPhase = f;
    const s = Math.sin(f * Math.PI * 2);
    pose.legSwing = s;
    pose.armSwing = -s * 0.5;
  } else {
    const f = quantize((tsec * 0.9) % 1, IDLE_FRAMES);
    pose.headBob = Math.sin(f * Math.PI * 2) * 0.5;
  }
  return pose;
}
