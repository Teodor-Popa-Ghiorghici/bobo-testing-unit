/* Persistence and Momentum -- GDD §3.8, replacing the old combo counter as
   the *mechanical* resource (damage scaling, Rush gating). `comboCount`
   stays on the player purely as flavour input for the pose/fx/audio layer
   (pose_player.js is off-limits this phase, and its aura/energy reads are
   cosmetic, not a resource) -- Momentum is the number that now actually
   does something. */

import { clampPersistence } from './fighter.js';

export const MOMENTUM_MAX = 100;
const MOMENTUM_DECAY_PER_SEC = 15;
const MOMENTUM_DECAY_DELAY_FRAMES = 90; // 1.5s without landing a hit
const PERSISTENCE_PASSIVE_PER_SEC = 2;
const FRAME_HZ = 60;

export function clampMomentum(player) {
  player.momentum = Math.max(0, Math.min(MOMENTUM_MAX, player.momentum));
}

export function gainMomentum(player, amount) {
  player.momentum += amount;
  player.framesSinceHitLanded = 0;
  clampMomentum(player);
}

export function gainPersistence(player, amount) {
  player.persistence += amount;
  clampPersistence(player);
}

export function spendPersistence(player, amount) {
  player.persistence -= amount;
  clampPersistence(player);
}

/* On being hit: halved, never zeroed outright by the hit itself (GDD §3.8:
   "not zeroed... punishes learners too hard"). */
export function onMomentumHitTaken(player) {
  player.momentum *= 0.5;
  clampMomentum(player);
}

/* One sim frame of passive resource ticking -- decay/regen is continuous,
   not a one-shot event, so it lives beside the gain/spend helpers rather
   than being inlined into combat_player.js's per-frame update. */
export function tickResources(player) {
  player.framesSinceHitLanded = (player.framesSinceHitLanded || 0) + 1;
  if (player.framesSinceHitLanded > MOMENTUM_DECAY_DELAY_FRAMES && player.momentum > 0) {
    player.momentum = Math.max(0, player.momentum - MOMENTUM_DECAY_PER_SEC / FRAME_HZ);
  }
  if (player.state === 'idle') {
    player.persistence += PERSISTENCE_PASSIVE_PER_SEC / FRAME_HZ;
    clampPersistence(player);
  }
}
