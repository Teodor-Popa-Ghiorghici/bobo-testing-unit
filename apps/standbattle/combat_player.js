/* Player-side stepping: movement, Step's edge/buffer handling, and
   frame-data attack resolution (tech §2.4/§2.5). combat_defense.js holds
   the sibling *incoming*-attack half (Step/Guard/Clash dispatch against
   an enemy attack) -- split out from this file once Phase 3's hook wiring
   pushed it over the repo's 300-line file cap; mirrors the player/enemy
   seam combat_enemy.js already established in Phase 1. Every timer here
   is a whole sim frame at the fixed 60Hz step.

   Phase 3: every resolver call below that can take `bus`/`stats` now does
   (combat.dispatcher/combat.stats) -- this is where the tech §2.1 effect
   pipeline's onMoveStart/onHitResolve/onHitLanded/onCritCheck/onKill/
   onStepStart hooks actually fire from (onDamageIncoming/onDamageTaken/
   onStaggerStart/onClashSuccess/onPerfectClash/onGuardBreak live in
   combat_defense.js instead). */

import {
  resolveMoveFrames, resolveDamage, applyHit, rollCrit, resolvePoiseDamage, resolvePersistenceCost
} from './resolvers.js';
import { stepMoveHitboxes } from './hitbox.js';
import { spendPersistence, gainPersistence, gainMomentum, tickResources } from './resources.js';
import { applyPoiseDamage } from './poise.js';
import { applyStatus } from './status.js';
import { resolveStatusPotency } from './stats.js';
import * as defense from './defense.js';
import { ARENA_MIN, ARENA_MAX, ARENA_Z_MIN, ARENA_Z_MAX, SIM_HZ, DEATH_ANIM_FRAMES } from './constants.js';

export const ACTION_KEYS = new Set(['light', 'medium', 'heavy', 'special', 'rush', 'dodge', 'parry']);

const HURT_FLASH_FRAMES = 9; // 150ms fade
const PLAYER_SPEED_PER_FRAME = 172 / SIM_HZ;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export function performAction(combat, kind) {
  if (kind === 'dodge') startDodge(combat);
  else if (kind === 'parry') defense.startClash(combat.player);
  else tryAttack(combat, kind);
}

/* onStepStart (tech §2.1 minimum surface) fires only once a Step actually
   begins -- gating on defense.startStep's own charge check rather than
   firing unconditionally keeps "Start" meaning "a step has begun", and
   needs no signature change to defense.js. */
function startDodge(combat) {
  if (defense.startStep(combat.player, combat.enemy)) {
    combat.dispatcher.runEffect('onStepStart', { entity: combat.player, cancelled: false });
  } else {
    combat.dispatcher.fire('onMoveDenied', {});
  }
}

function tryAttack(combat, kind) {
  const player = combat.player;
  if (player.state !== 'idle') return;
  const stand = player.stand;
  const id = kind === 'special' ? stand.moves.special : kind === 'rush' ? stand.standRush : stand.moves[kind];
  if (!attemptMove(combat, id)) combat.dispatcher.fire('onMoveDenied', {});
}

/* Starts (or cancels into) a move. Used both for a fresh press and for a
   cancel-window transition -- the only two ways a move ever starts.
   onMoveStart (mutable) fires after costs are checked-affordable but
   before anything is spent or committed, so a Fragment that cancels a
   move never leaves Persistence/Momentum half-spent. */
function attemptMove(combat, moveId) {
  const player = combat.player;
  const move = resolveMoveFrames(player, moveId, combat.stats, combat.dispatcher);
  const persistenceCost = resolvePersistenceCost({ entity: player, move, bus: combat.dispatcher });
  if (persistenceCost && player.persistence < persistenceCost) return false;
  if (move.costs.momentum && player.momentum < move.costs.momentum) return false;

  const startCtx = { entity: player, move, cancelled: false };
  combat.dispatcher.runEffect('onMoveStart', startCtx);
  if (startCtx.cancelled) return false;

  player.state = 'attack';
  player.activeMove = move;
  player.movePhase = 'windup';
  player.moveFrame = 0;
  player.hitboxSpent = new Set();
  player.hitsLanded = 0;
  player.armorConsumedThisMove = false;
  if (persistenceCost) spendPersistence(player, persistenceCost);
  if (move.costs.momentum) { player.momentum -= move.costs.momentum; }
  player.chainCounts[move.id] = (player.lastMoveId === move.id ? (player.chainCounts[move.id] || 0) : 0) + 1;
  player.lastMoveId = move.id;
  return true;
}

/* Checks the current move's data-authored cancel list against whatever is
   buffered (tech §2.4: "cancel windows are data"). Emergent strings
   (Light->Light->Light->Medium->Heavy) fall out of this generic check,
   never an authored combo list. */
function tryCancel(combat) {
  const player = combat.player;
  if (!player.bufferedAction || player.state !== 'attack') return;
  const kind = player.bufferedAction.kind;
  const move = player.activeMove;
  const entry = move.cancels.find(c =>
    player.moveFrame >= c.from && c.into.includes(kind) && (c.requires !== 'hit' || player.hitsLanded > 0));
  if (!entry) return;
  const stand = player.stand;
  const targetId = kind === 'special' ? stand.moves.special : kind === 'rush' ? stand.standRush : stand.moves[kind];
  if (entry.maxSelfChain && targetId === move.id && (player.chainCounts[move.id] || 0) >= entry.maxSelfChain) return;
  if (!attemptMove(combat, targetId)) return;
  player.bufferedAction = null;
}

function resolveHitboxes(combat, move) {
  const player = combat.player, enemy = combat.enemy, bus = combat.dispatcher;
  if (enemy.hp <= 0) return;
  stepMoveHitboxes(player, move, player.moveFrame, player.hitboxSpent, enemy, hb => {
    player.hitsLanded++;
    const critInfo = rollCrit({ attacker: player, rng: combat.combatRng, stats: combat.stats, bus });
    const dmgCtx = { attacker: player, defender: enemy, hitbox: hb, move, isPlayerAttacker: true, critMult: critInfo.mult, bus };
    const dmg = resolveDamage(dmgCtx);
    const { dead } = applyHit({ defender: enemy }, dmg);
    applyPoiseDamage(enemy, resolvePoiseDamage({ hitbox: hb, bus }));
    enemy.knockVx = (enemy.x >= player.x ? 1 : -1) * move.knockback;
    gainPersistence(player, move.gains.persistence || 0);
    gainMomentum(player, move.gains.momentum || 0);
    player.comboCount++; // flavour counter for pose/fx/audio only -- Momentum is the real resource now
    combat.juice.triggerHitstop(move.hitstopMs);
    combat.juice.triggerShake(player.facing, 0, dead ? 6 : (move.type === 'heavy' || move.type === 'rush') ? 4 : 2, 140);
    combat.juice.spawnBurst(enemy.x, 154, '#FFFF55', dead ? 18 : 6, 90, player.facing, -0.4);
    if (critInfo.crit) combat.pushLog('CRIT!');

    /* onHitLanded (mutable, tech §2.1): fires after the hit is confirmed
       to have connected and dealt damage -- the hook a Fragment applying
       an on-hit status (e.g. "your 3rd Light applies 2 Virus") targets,
       distinct from onHitResolve's damage-number mutation above. */
    const landedCtx = {
      attacker: player, defender: enemy, move, slot: move.slot,
      chainCount: player.chainCounts[move.id] || 0, crit: critInfo.crit, dead, statuses: [], cancelled: false
    };
    bus.runEffect('onHitLanded', landedCtx);
    /* Precision -> status-effect accuracy (spec §2.1): the attacker's
       status-application potency scales whatever stack count a Fragment
       queued. Star Platinum's Precision (6) pins this to exactly 1.0 (see
       stats.js), so this is a no-op for the shipped prototype today. */
    const potency = resolveStatusPotency(player, combat.stats);
    landedCtx.statuses.forEach(s => applyStatus(enemy, s.id, Math.max(1, Math.round(s.stacks * potency))));

    /* onHit stays a pure post-hoc EVENT (unchanged since Phase 0) --
       audio.js/fx.js read this payload shape and neither needs nor gets
       a mutable ctx (invariant 8: render/audio never write sim state). */
    bus.fire('onHit', { moveType: move.type, combo: player.comboCount, finishing: dead, crit: critInfo.crit });
    if (dead) {
      enemy.deathTimer = DEATH_ANIM_FRAMES;
      gainMomentum(player, 15);
      bus.runEffect('onKill', { entity: player, target: enemy, combo: player.comboCount, cancelled: false });
      combat.outcome = 'win';
    }
  });
}

function updateAttack(combat) {
  const player = combat.player;
  const m = player.activeMove;
  player.moveFrame++;
  if (player.moveFrame <= m.windupFrames) player.movePhase = 'windup';
  else if (player.moveFrame <= m.windupFrames + m.activeFrames) player.movePhase = 'active';
  else player.movePhase = 'recover';
  /* per-phase countdown, kept only because pose_player.js (off-limits)
     reads player.stateTimer to compute animation progress -- a pure
     re-projection of moveFrame, not a second timing source. */
  if (player.movePhase === 'windup') player.stateTimer = m.windupFrames - player.moveFrame + 1;
  else if (player.movePhase === 'active') player.stateTimer = m.windupFrames + m.activeFrames - player.moveFrame + 1;
  else player.stateTimer = m.frames - player.moveFrame + 1;

  if (player.movePhase === 'active') resolveHitboxes(combat, m);
  tryCancel(combat);

  if (player.moveFrame >= m.frames) {
    player.state = 'idle'; player.activeMove = null;
    tryConsumeBuffer(combat);
  }
}

function tryConsumeBuffer(combat) {
  const player = combat.player;
  if (!player.bufferedAction) return;
  const kind = player.bufferedAction.kind;
  player.bufferedAction = null;
  if (player.state === 'idle') performAction(combat, kind);
}

export function updatePlayer(combat) {
  const player = combat.player, enemy = combat.enemy, keys = combat.keys;
  if (player.hurtFlash > 0) player.hurtFlash = Math.max(0, player.hurtFlash - 1 / HURT_FLASH_FRAMES);
  if (player.knockVx) { player.x += player.knockVx; player.knockVx *= 0.8; if (Math.abs(player.knockVx) < 0.3) player.knockVx = 0; }
  player.x = clamp(player.x, ARENA_MIN, ARENA_MAX);
  player.facing = enemy.x >= player.x ? 1 : -1;
  defense.tickStepCharges(player);
  tickResources(player);
  if (player.bufferedAction) {
    player.bufferedAction.timer -= 1;
    if (player.bufferedAction.timer <= 0) player.bufferedAction = null;
  }

  if (player.state === 'idle') {
    if (keys.guard) { defense.startGuard(player); return; }
    let mv = 0, mz = 0;
    if (keys.left) mv -= 1;
    if (keys.right) mv += 1;
    if (keys.forward) mz -= 1;
    if (keys.back) mz += 1;
    player.moving = mv !== 0 || mz !== 0;
    /* getMoveSpeed (query, deliverable 6): the ported "+12% move speed"
       run buff lives here now instead of a bespoke player.speedMult field. */
    const speedMult = combat.dispatcher.runQuery('getMoveSpeed', 1, { entity: player });
    const step = PLAYER_SPEED_PER_FRAME * speedMult;
    player.x = clamp(player.x + mv * step, ARENA_MIN, ARENA_MAX);
    player.z = clamp(player.z + mz * step, ARENA_Z_MIN, ARENA_Z_MAX);
    return;
  }

  player.stateTimer -= 1;
  if (player.state === 'attack') {
    updateAttack(combat);
  } else if (player.state === 'dodge') {
    const dx = defense.stepDodgeMovement(player, PLAYER_SPEED_PER_FRAME * 1.6);
    if (dx) player.x = clamp(player.x + dx, ARENA_MIN, ARENA_MAX);
    if (player.stateTimer <= 0) { player.state = 'idle'; player.invulnerable = false; tryConsumeBuffer(combat); }
  } else if (player.state === 'guard') {
    if (!keys.guard) { defense.endGuard(player); tryConsumeBuffer(combat); return; }
    if (defense.stepGuardDrain(player)) {
      defense.guardBreakStagger(player);
      combat.dispatcher.runEffect('onGuardBreak', { entity: player, cause: 'persistence', cancelled: false });
      combat.pushLog('GUARD BROKEN');
    }
  } else if (player.state === 'parry') {
    if (player.clashPhase === 'window') {
      defense.stepClashWindow(player);
      if (player.stateTimer <= 0) {
        player.clashPhase = 'recover'; player.parryWindow = false;
        player.stateTimer = defense.CLASH_WHIFF_RECOVER_FRAMES;
      }
    } else if (player.stateTimer <= 0) {
      player.state = 'idle'; player.parrySuccess = false;
      tryConsumeBuffer(combat);
    }
  } else if (player.state === 'hitstun' || player.state === 'staggered') {
    if (player.hitIframeTimer > 0) {
      player.hitIframeTimer--;
      if (player.hitIframeTimer <= 0) player.invulnerable = false;
    }
    if (player.stateTimer <= 0) { player.state = 'idle'; tryConsumeBuffer(combat); }
  }
}
