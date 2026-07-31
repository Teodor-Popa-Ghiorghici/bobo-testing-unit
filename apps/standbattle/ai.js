/* Shared attack-pattern module library — §9. A boss is a recombination of
   these plus exactly one bespoke signature move, not a bespoke state
   machine per enemy. This file only decides WHAT an enemy is doing and for
   how long; combat.js resolves collisions and damage against that state.

   Timing is whole frames at the sim's fixed 60Hz step (tech §5 Phase 1) --
   the ms in each comment is the pre-Phase-1 authored value, kept only for
   traceability. projectileSpeed stays authored in px/sec (content-author
   -friendly units); combat.js resolves it to a per-frame delta exactly
   once, at the moment a projectile spawns. */
/* `glyph` (GDD §21, Phase 2 deliverable 7): a distinct outline shape per
   telegraph so colour-blind/male-colour-deficient players (~8% per the
   GDD) still read which attack is coming -- ring = sweep, chevron = slam,
   crosshair = ranged. Drawn by arena.js's telegraph(); purely a render
   hint, the sim never reads it.

   `hitbox` (melee patterns only, tech §2.4/§2.5): the AABB rectangle
   checked once, the instant the pattern's active window opens, via
   hitbox.js's overlaps() -- replacing the old `Math.abs(dx) <= range`
   scalar test. Ranged patterns keep `range` only as an AI pattern-
   selection distance heuristic (pickPattern below); their actual hit test
   is the projectile-vs-player distance loop in combat_enemy.js, which
   applies the same tag-based depth tolerance via hitbox.js.

   `armor` (bool, GDD §3.9): true means this pattern cannot be poise-
   interrupted during its windup -- always paired with the mandatory
   telegraph, so it is firm, never unfair (poise.js checks this before
   forcing a Stagger). `tags` include 'heavy' on patterns that should
   break a held Guard (defense.js). */
export const PATTERNS = {
  sweep: {
    id: 'sweep', label: 'SWEEP', windupFrames: 20, activeFrames: 10, recoverFrames: 18, // 340/160/300ms
    range: 84, dmgMult: 1, knockback: 18, hitstopMs: 60, telegraph: '#FFFF55', glyph: 'ring',
    armor: false, tags: ['melee', 'medium'],
    hitbox: { x: 42, z: 0, w: 84, tags: ['melee', 'medium'] }
  },
  telegraphed_slam: {
    id: 'telegraphed_slam', label: 'SLAM', windupFrames: 37, activeFrames: 8, recoverFrames: 28, // 620/140/460ms
    range: 74, dmgMult: 1.9, knockback: 32, hitstopMs: 110, telegraph: '#FF5555', glyph: 'chevron',
    armor: true, tags: ['melee', 'heavy'],
    hitbox: { x: 37, z: 0, w: 74, tags: ['melee', 'heavy'] }
  },
  projectile: {
    id: 'projectile', label: 'RANGED', windupFrames: 19, activeFrames: 54, recoverFrames: 18, // 320/900/300ms
    range: 400, dmgMult: 0.9, knockback: 11, hitstopMs: 50, telegraph: '#55FFFF', glyph: 'crosshair',
    armor: false, tags: ['ranged'],
    projectileSpeed: 440, ranged: true
  },
  sheer_heart_attack: {
    id: 'sheer_heart_attack', label: 'SHEER HEART ATTACK', windupFrames: 42, activeFrames: 72, recoverFrames: 31, // 700/1200/520ms
    range: 460, dmgMult: 1.7, knockback: 25, hitstopMs: 90, telegraph: '#FF55FF', glyph: 'crosshair',
    armor: true, tags: ['ranged', 'heavy'],
    projectileSpeed: 360, ranged: true, homing: true
  }
};

const MELEE_MAX_RANGE = 110;

/* Choose a pattern from the enemy's list, biased by distance: melee
   patterns need to be in range, ranged patterns are picked more often when
   the player is far away. `rng` is the run's 'ai' stream (rng.js) -- AI
   choices must be reproducible from the run seed, never Math.random(). */
export function pickPattern(patternIds, dist, rng) {
  const near = patternIds.filter(id => PATTERNS[id].range <= MELEE_MAX_RANGE || dist <= PATTERNS[id].range);
  const pool = near.length ? near : patternIds;
  const weighted = [];
  pool.forEach(id => {
    const p = PATTERNS[id];
    const farBias = p.ranged && dist > MELEE_MAX_RANGE ? 3 : 1;
    for (let i = 0; i < farBias; i++) weighted.push(id);
  });
  return weighted[Math.floor(rng.random() * weighted.length)];
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
    state: 'approach', timer: 0, pattern: null, staggerMult: 1,
    approachRange: approachRange || defaultApproachRange(patternIds),
    patternIds
  };
}

/* Forces the AI into a Stagger (GDD §3.9's poise-break, or a successful
   Clash's 24f free-punish window, GDD §3.7) -- whatever pattern it was
   mid-execution is abandoned. `mult` scales damage taken while staggered
   (x1.5 on a poise break; 1 -- no bonus -- on a Clash stagger, which is a
   punish window, not extra damage). */
export function enterStagger(ai, frames, mult) {
  ai.state = 'staggered';
  ai.timer = frames;
  ai.pattern = null;
  ai.staggerMult = mult == null ? 1 : mult;
}

/* Advances the AI state machine by exactly one sim frame. Returns an event
   object for combat.js to act on ('spawnMelee' | 'spawnProjectile' | null),
   or null when nothing new happened this frame. `rng` is the run's 'ai'
   stream (rng.js). */
export function stepEnemyAI(ai, dist, rng) {
  ai.timer -= 1;
  if (ai.state === 'staggered') {
    if (ai.timer <= 0) { ai.state = 'approach'; ai.staggerMult = 1; }
    return null;
  }
  if (ai.state === 'approach') {
    if (dist <= ai.approachRange || rng.random() < 0.002) {
      ai.pattern = PATTERNS[pickPattern(ai.patternIds, dist, rng)];
      ai.state = 'windup';
      ai.timer = ai.pattern.windupFrames;
    }
    return null;
  }
  if (ai.state === 'windup') {
    if (ai.timer <= 0) {
      ai.state = 'active';
      ai.timer = ai.pattern.activeFrames;
      return { type: ai.pattern.ranged ? 'spawnProjectile' : 'spawnMelee', pattern: ai.pattern };
    }
    return null;
  }
  if (ai.state === 'active') {
    if (ai.timer <= 0) {
      ai.state = 'recover';
      ai.timer = ai.pattern.recoverFrames;
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
