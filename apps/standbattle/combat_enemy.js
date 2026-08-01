/* Enemy-side stepping: AI movement, attack-pattern state machine, phase
   transitions, poise/stagger and projectiles. Split out of combat.js to
   keep both files under the repo's 300-line rule -- this follows the
   player/enemy seam combat.js already had. Every timer here is a whole
   sim frame at the fixed 60Hz step. */

import { stepEnemyAI, defaultApproachRange } from './ai.js';
import { overlaps, pointOverlaps } from './hitbox.js';
import { stepPoise, STAGGER_FRAMES, STAGGER_DAMAGE_MULT } from './poise.js';
import { resolveIncomingAttack } from './combat_defense.js';
import { ARENA_MIN, ARENA_MAX, SIM_HZ } from './constants.js';

const PHASE_INVULN_FRAMES = 30; // 500ms
const PHASE_BANNER_FRAMES = 108; // 1800ms
const HURT_FLASH_FRAMES = 9; // 150ms fade -- matches combat_player.js's player-side constant
const PROJECTILE_HIT_RADIUS = 10;

export function updateEnemyPhase(combat, enemyDef) {
  const enemy = combat.enemy;
  if (!combat.isBoss || enemy.state !== 'alive') return;
  const frac = enemy.hp / enemy.maxHp;
  const next = enemy.phaseIndex + 1;
  const phases = enemyDef.phases;
  if (next < phases.length && frac <= phases[enemy.phaseIndex].hpAbove) {
    enemy.phaseIndex = next;
    enemy.ai.patternIds = phases[next].attackPatterns;
    enemy.ai.approachRange = defaultApproachRange(phases[next].attackPatterns);
    enemy.invulnFrames = PHASE_INVULN_FRAMES;
    combat.banner = enemyDef.transitionLine || 'PHASE 2';
    combat.bannerTimer = PHASE_BANNER_FRAMES;
    combat.juice.triggerHitstop(160);
    combat.juice.triggerShake(0, -1, 8, 260);
    combat.dispatcher.fire('onPhaseTransition', {});
  }
}

/* Advances enemy movement, poise, its attack-pattern AI and its
   projectiles by exactly one sim frame. Melee patterns resolve their hit
   the instant the active window opens via hitbox.js's AABB overlaps()
   (tech §2.4/§2.5) instead of the old `Math.abs(dx) <= range` scalar
   check; resolveIncomingAttack (combat_player.js) then runs the
   defensive-triangle dispatch (Step/Guard/Clash) against it. */
export function stepEnemyMovementAndAI(combat, enemyDef, aiRng) {
  const { player, enemy, juice, dispatcher } = combat;
  if (enemy.hp <= 0) {
    if (enemy.deathTimer > 0) enemy.deathTimer = Math.max(0, enemy.deathTimer - 1);
    if (enemy.hurtFlash > 0) enemy.hurtFlash = Math.max(0, enemy.hurtFlash - 1 / HURT_FLASH_FRAMES);
    return;
  }
  if (enemy.hurtFlash > 0) enemy.hurtFlash = Math.max(0, enemy.hurtFlash - 1 / HURT_FLASH_FRAMES);
  if (enemy.knockVx) { enemy.x += enemy.knockVx; enemy.knockVx *= 0.82; if (Math.abs(enemy.knockVx) < 0.3) enemy.knockVx = 0; }
  enemy.x = Math.max(ARENA_MIN, Math.min(ARENA_MAX, enemy.x));
  enemy.facing = player.x >= enemy.x ? 1 : -1;
  /* GDD §3.9: regen-after-no-hit and pending poise-break -> Stagger.
     stepPoise() returns true only the frame it actually enters Stagger, so
     onStaggerStart (tech §2.1, mutable) fires exactly once per break. */
  if (stepPoise(enemy)) {
    dispatcher.runEffect('onStaggerStart', { entity: enemy, cause: 'poise', frames: STAGGER_FRAMES, mult: STAGGER_DAMAGE_MULT, cancelled: false });
  }
  if (enemy.invulnFrames > 0) { enemy.invulnFrames -= 1; return; }

  const dist = Math.abs(player.x - enemy.x);
  enemy.moving = false;
  if (enemy.ai.state === 'approach') {
    const dir = player.x > enemy.x ? 1 : -1;
    if (dist > enemy.ai.approachRange) { enemy.x += dir * enemy.speedPxPerFrame; enemy.moving = true; }
  }
  const wasWindup = enemy.ai.state === 'windup';
  const ev = stepEnemyAI(enemy.ai, Math.abs(player.x - enemy.x), aiRng);
  if (!wasWindup && enemy.ai.state === 'windup') dispatcher.fire('onTelegraphStart', { pattern: enemy.ai.pattern });
  if (ev && ev.type === 'spawnMelee') {
    if (overlaps(enemy, ev.pattern.hitbox, player)) resolveIncomingAttack(combat, ev.pattern, enemy.x);
  } else if (ev && ev.type === 'spawnProjectile') {
    enemy.projectiles.push({
      x: enemy.x, z: enemy.z, dir: player.x >= enemy.x ? 1 : -1, pattern: ev.pattern,
      life: ev.pattern.activeFrames, speedPerFrame: ev.pattern.projectileSpeed / SIM_HZ
    });
  }
  updateEnemyPhase(combat, enemyDef);

  for (let i = enemy.projectiles.length - 1; i >= 0; i--) {
    const pr = enemy.projectiles[i];
    pr.life -= 1;
    if (pr.homing === undefined) pr.homing = pr.pattern.homing;
    if (pr.homing) pr.dir = player.x >= pr.x ? 1 : -1;
    pr.x += pr.dir * pr.speedPerFrame;
    if (pointOverlaps(pr.x, pr.z, player, pr.pattern.tags, PROJECTILE_HIT_RADIUS)) {
      resolveIncomingAttack(combat, pr.pattern, pr.x);
      enemy.projectiles.splice(i, 1);
      continue;
    }
    if (pr.life <= 0 || pr.x < ARENA_MIN - 20 || pr.x > ARENA_MAX + 20) enemy.projectiles.splice(i, 1);
  }
}
