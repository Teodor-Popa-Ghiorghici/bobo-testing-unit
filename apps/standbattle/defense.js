/* The defensive triangle -- GDD §3.7, tech §2.5 deliverable 4. Step,
   Guard and Clash are structurally distinct state machines (spec §2.3
   requires this), not one dodge mechanic with a bonus bolted on:

   Step  -- i-frames + movement. 3f pre / 10f invulnerable / 6f recovery.
            Two charges on a 1.4s recharge each (fighter.js's
            DODGE_CHARGE_MAX) -- a hard cap on invulnerability uptime, the
            fix for tech audit item #1 (holding the key used to be ~77%
            uptime). Internal state name stays 'dodge' -- pose_player.js
            (off-limits) branches on that string.
   Guard -- hold. -70% damage, rest converted to chip; drains Persistence
            while absorbing; broken by any Heavy-tagged hit or by hitting
            0 Persistence, into a stagger.
   Clash -- tight active window (frames 2-8 of an 8-frame timer), 20f
            punishable whiff recovery. A Perfect Clash (frames 2-3) is the
            high-skill top of the triangle: refunds a Step charge and
            marks the attacker Break (next hit on it x1.8, resolvers.js).
            Internal state name stays 'parry' for the same pose reason. */

import { DODGE_CHARGE_MAX } from './fighter.js';
import { enterStagger } from './ai.js';
import { spendPersistence, gainPersistence, gainMomentum } from './resources.js';

export const STEP_PRE_FRAMES = 3;
export const STEP_INVULN_FRAMES = 10;
export const STEP_RECOVER_FRAMES = 6;
export const STEP_FRAMES = STEP_PRE_FRAMES + STEP_INVULN_FRAMES + STEP_RECOVER_FRAMES; // 19
export const STEP_RECHARGE_FRAMES = 84; // 1.4s

export const CLASH_ACTIVE_FROM = 2;
export const CLASH_ACTIVE_TO = 8;
export const CLASH_TOTAL_FRAMES = CLASH_ACTIVE_TO; // 1f startup + 7 active frames
export const CLASH_PERFECT_TO = 3;
export const CLASH_WHIFF_RECOVER_FRAMES = 20;
export const CLASH_SUCCESS_RECOVER_FRAMES = 4;
export const CLASH_STAGGER_FRAMES = 24;

const GUARD_DRAIN_PER_FRAME = 14 / 60;
export const GUARD_DAMAGE_MULT = 0.30; // rest converts to chip
export const GUARD_BREAK_STAGGER_FRAMES = 40;

function clampCharges(player) { player.dodgeCharges = Math.max(0, Math.min(DODGE_CHARGE_MAX, player.dodgeCharges)); }

export function startStep(player, enemy) {
  if (player.dodgeCharges <= 0) return false;
  player.dodgeCharges--;
  player.state = 'dodge';
  player.stateTimer = STEP_FRAMES;
  player.invulnerable = false; // the 3f pre-window is NOT invulnerable
  player.dodgeDir = enemy.x > player.x ? -1 : 1;
  return true;
}

export function tickStepCharges(player) {
  if (player.dodgeCharges < DODGE_CHARGE_MAX) {
    player.dodgeRechargeFrames++;
    if (player.dodgeRechargeFrames >= STEP_RECHARGE_FRAMES) {
      player.dodgeRechargeFrames -= STEP_RECHARGE_FRAMES;
      player.dodgeCharges++;
    }
  } else {
    player.dodgeRechargeFrames = 0;
  }
  clampCharges(player);
}

/* Returns the x offset to apply this frame (0 outside the invulnerable
   window) and updates `player.invulnerable`. Caller owns arena clamping. */
export function stepDodgeMovement(player, dashSpeed) {
  const elapsed = STEP_FRAMES - player.stateTimer; // frames processed so far, 1-indexed
  const inInvuln = elapsed > STEP_PRE_FRAMES && elapsed <= STEP_PRE_FRAMES + STEP_INVULN_FRAMES;
  player.invulnerable = inInvuln;
  return inInvuln ? player.dodgeDir * dashSpeed : 0;
}

export function startGuard(player) {
  player.state = 'guard';
  player.guarding = true;
}

/* Drains Persistence while held; returns true the instant 0 Persistence
   forces a guard break (GDD §3.7), independent of any incoming hit. */
export function stepGuardDrain(player) {
  spendPersistence(player, GUARD_DRAIN_PER_FRAME);
  return player.persistence <= 0;
}

export function endGuard(player) {
  player.guarding = false;
  player.state = 'idle';
}

export function guardBreakStagger(player) {
  player.guarding = false;
  player.state = 'staggered';
  player.stateTimer = GUARD_BREAK_STAGGER_FRAMES;
  player.invulnerable = false;
}

export function startClash(player) {
  player.state = 'parry';
  player.clashPhase = 'window';
  player.stateTimer = CLASH_TOTAL_FRAMES;
  player.parryWindow = false;
}

/* One frame of the active-window sub-phase; call only while
   `player.clashPhase === 'window'`. */
export function stepClashWindow(player) {
  const elapsed = CLASH_TOTAL_FRAMES - player.stateTimer;
  player.clashElapsed = elapsed;
  player.parryWindow = elapsed >= CLASH_ACTIVE_FROM;
}

export function isPerfectClash(player) {
  return player.clashElapsed != null && player.clashElapsed <= CLASH_PERFECT_TO;
}

/* Resolves a successful Clash: stops the attacker, pays out Momentum and
   Persistence, and -- on a Perfect Clash -- refunds a Step charge and
   marks the attacker Break. Damage/poise on the counter-hit itself still
   goes through resolvers.js like any other hit; this function only owns
   the resource/state side of the triangle. */
export function resolveClashSuccess(player, enemyAi, juice) {
  player.parrySuccess = true;
  player.parryWindow = false;
  player.clashPhase = 'recover';
  player.stateTimer = CLASH_SUCCESS_RECOVER_FRAMES;
  gainMomentum(player, 25);
  gainPersistence(player, 20);
  juice.triggerHitstop(90);
  enterStagger(enemyAi, CLASH_STAGGER_FRAMES, 1);
  const perfect = isPerfectClash(player);
  if (perfect) player.dodgeCharges = Math.min(DODGE_CHARGE_MAX, player.dodgeCharges + 1);
  return perfect;
}
