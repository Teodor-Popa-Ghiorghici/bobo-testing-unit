/* Shared attack-pattern module library — §9. A boss is a recombination of
   these plus exactly one bespoke signature move, not a bespoke state
   machine per enemy. This file only decides WHAT an enemy is doing and for
   how long; combat.js resolves collisions and damage against that state. */

export const PATTERNS = {
  sweep: {
    id: 'sweep', label: 'SWEEP', windupMs: 340, activeMs: 160, recoverMs: 300,
    range: 46, dmgMult: 1, knockback: 10, hitstopMs: 60, telegraph: '#FFFF55'
  },
  telegraphed_slam: {
    id: 'telegraphed_slam', label: 'SLAM', windupMs: 620, activeMs: 140, recoverMs: 460,
    range: 40, dmgMult: 1.9, knockback: 18, hitstopMs: 110, telegraph: '#FF5555'
  },
  projectile: {
    id: 'projectile', label: 'RANGED', windupMs: 320, activeMs: 900, recoverMs: 300,
    range: 240, dmgMult: 0.9, knockback: 6, hitstopMs: 50, telegraph: '#55FFFF',
    projectileSpeed: 260, ranged: true
  },
  sheer_heart_attack: {
    id: 'sheer_heart_attack', label: 'SHEER HEART ATTACK', windupMs: 700, activeMs: 1200, recoverMs: 520,
    range: 280, dmgMult: 1.7, knockback: 14, hitstopMs: 90, telegraph: '#FF55FF',
    projectileSpeed: 210, ranged: true, homing: true
  }
};

const MELEE_MAX_RANGE = 60;

/* Choose a pattern from the enemy's list, biased by distance: melee
   patterns need to be in range, ranged patterns are picked more often when
   the player is far away. */
export function pickPattern(patternIds, dist) {
  const near = patternIds.filter(id => PATTERNS[id].range <= MELEE_MAX_RANGE || dist <= PATTERNS[id].range);
  const pool = near.length ? near : patternIds;
  const weighted = [];
  pool.forEach(id => {
    const p = PATTERNS[id];
    const farBias = p.ranged && dist > MELEE_MAX_RANGE ? 3 : 1;
    for (let i = 0; i < farBias; i++) weighted.push(id);
  });
  return weighted[Math.floor(Math.random() * weighted.length)];
}

/* The enemy must stop closing distance within its shortest MELEE pattern's
   reach, never beyond it -- otherwise it can plant itself just outside
   every pattern's actual hitbox and attack forever without ever
   connecting (and the player can't reach it either). Ranged patterns
   don't gate this: they can fire from anywhere within their own range. */
export function defaultApproachRange(patternIds) {
  const meleeRanges = patternIds.map(id => PATTERNS[id]).filter(p => !p.ranged).map(p => p.range);
  return meleeRanges.length ? Math.min(...meleeRanges) : MELEE_MAX_RANGE;
}

export function createEnemyAI(patternIds, approachRange) {
  return {
    state: 'approach', timer: 0, pattern: null,
    approachRange: approachRange || defaultApproachRange(patternIds),
    patternIds
  };
}

/* Advances the AI state machine. Returns an event object for combat.js to
   act on ('spawnMelee' | 'spawnProjectile' | null), or null when nothing
   new happened this tick. */
export function stepEnemyAI(ai, dist, dtMs) {
  ai.timer -= dtMs;
  if (ai.state === 'approach') {
    if (dist <= ai.approachRange || Math.random() < 0.002) {
      ai.pattern = PATTERNS[pickPattern(ai.patternIds, dist)];
      ai.state = 'windup';
      ai.timer = ai.pattern.windupMs;
    }
    return null;
  }
  if (ai.state === 'windup') {
    if (ai.timer <= 0) {
      ai.state = 'active';
      ai.timer = ai.pattern.activeMs;
      return { type: ai.pattern.ranged ? 'spawnProjectile' : 'spawnMelee', pattern: ai.pattern };
    }
    return null;
  }
  if (ai.state === 'active') {
    if (ai.timer <= 0) {
      ai.state = 'recover';
      ai.timer = ai.pattern.recoverMs;
    }
    return null;
  }
  if (ai.state === 'recover') {
    if (ai.timer <= 0) { ai.state = 'approach'; ai.pattern = null; }
    return null;
  }
  return null;
}

export function enemyIsVulnerableToStagger(ai) {
  return ai.state === 'windup' || ai.state === 'approach';
}
