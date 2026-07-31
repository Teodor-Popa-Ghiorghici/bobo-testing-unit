/* Poise, stagger and armor -- GDD §3.9, tech §2.3 (Poise component was a
   stub until now). Every enemy has a second, invisible bar; hits deal
   poise damage; poise regenerates after 1.2s without one. At 0 poise the
   enemy staggers -- but only if `enemyIsVulnerableToStagger()` (ai.js,
   exported since Phase 0/1 and never called until this phase) says its
   current state can be interrupted, and only if it isn't Armored through
   its own windup right now. */

import { enemyIsVulnerableToStagger, enterStagger } from './ai.js';

export const POISE_REGEN_FRAMES = 72; // 1.2s without a hit
export const STAGGER_FRAMES = 36; // GDD §3.9
export const STAGGER_DAMAGE_MULT = 1.5;
export const CLASH_STAGGER_FRAMES = 24; // GDD §3.7 -- a free punish window, not extra damage

export function initPoise(entity, def) {
  const max = (def && def.poise) || 30;
  entity.poise.current = max;
  entity.poise.max = max;
  entity.poiseRegenTimer = 0;
  entity.poiseBroken = false;
}

function isArmoredNow(ai) {
  return ai.state === 'windup' && ai.pattern && ai.pattern.armor;
}

/* Applies poise damage from a landed hit (resolvers.js's
   resolvePoiseDamage supplies the amount) and resets the no-hit clock. */
export function applyPoiseDamage(enemy, amount) {
  if (amount <= 0 || enemy.hp <= 0) return;
  enemy.poise.current = Math.max(0, enemy.poise.current - amount);
  enemy.poiseRegenTimer = POISE_REGEN_FRAMES;
  if (enemy.poise.current <= 0) enemy.poiseBroken = true;
}

/* One sim frame of poise bookkeeping: regen once the no-hit window has
   elapsed, and converting a pending poise-break into an actual Stagger
   the instant the enemy reaches an interruptible state. Call once per
   frame per enemy, before its AI is stepped. Returns true the one frame a
   Stagger is actually entered, so the caller (combat_enemy.js) can fire
   the onStaggerStart effect hook (tech §2.1) without this file needing to
   know the dispatcher exists -- poise.js stays render/hook-agnostic, the
   same separation combat_enemy.js already keeps for everything else. */
export function stepPoise(enemy) {
  if (enemy.hp <= 0) return false;
  if (enemy.poiseRegenTimer > 0) {
    enemy.poiseRegenTimer -= 1;
    if (enemy.poiseRegenTimer <= 0 && !enemy.poiseBroken) enemy.poise.current = enemy.poise.max;
  }
  if (enemy.poiseBroken && enemy.ai.state !== 'staggered') {
    if (isArmoredNow(enemy.ai)) return false; // firm, not unfair -- always paired with the mandatory telegraph
    if (!enemyIsVulnerableToStagger(enemy.ai)) return false;
    enterStagger(enemy.ai, STAGGER_FRAMES, STAGGER_DAMAGE_MULT);
    enemy.poiseBroken = false;
    enemy.poise.current = enemy.poise.max;
    enemy.poiseRegenTimer = 0;
    return true;
  }
  return false;
}
