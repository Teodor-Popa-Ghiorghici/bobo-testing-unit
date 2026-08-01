/* Fighter runtime state factories -- the entity/component store (tech
   §2.3). A "fighter" IS an entity: `combat.js` treats the player and any
   enemy/boss generically as entries in `combat.entities`, not as two
   specially-named variables. Components below are attached as plain
   fields on the entity rather than nested objects, because the existing
   render/pose layer (pose_player.js, pose_enemy.js, render.js, hud.js --
   none of which this phase is allowed to rewrite) already reads `.x`,
   `.facing`, `.hp` etc. directly off these objects. Flattening keeps that
   contract intact while still giving every entity the full component set:

     Transform  -> `.x`, `.z`           (belt-plane position, world units)
     Body       -> `.body`              (hurtbox stub; no collision system yet)
     Health     -> `.hp`, `.maxHp`
     Poise      -> `.poise`             (real since Phase 2, poise.js)
     Statuses   -> `.statuses`          (real since Phase 3, status.js -- ticked by combat.js each frame)
     StandLink  -> `.standLink`         (stub; GDD §3.1 User/Stand split is Phase 2+)
     Brain      -> `.brain`             (AI profile; aliases `.ai` on enemies, null on the player)
     Frames     -> `.frames`            (stub; the real frame-data timeline is tech §2.4, Phase 2)
     Aggro      -> `.aggro`             (stub weight; meaningful once crowds exist)

   `z` defaults to Z_REST for every entity so a fight where nobody touches
   the depth axis renders exactly as it did before z existed. */

import { SIM_HZ, Z_REST } from './constants.js';

/* Step/dodge charges (GDD §3.7): a hard cap on invulnerability uptime,
   replacing the old "hold to stay safe" exploit (tech audit item #1). */
export const DODGE_CHARGE_MAX = 2;

function attachComponentStubs(entity) {
  entity.body = { hurtboxW: 30, hurtboxH: 64 }; // unused until Phase 2 hitboxes
  entity.poise = { current: Infinity, max: Infinity }; // overwritten for enemies by poise.js's initPoise
  entity.statuses = []; // populated by status.js's applyStatus, ticked by stepStatuses
  entity.standLink = null; // unused until the User/Stand split exists
  entity.frames = null; // unused until the frame-data timeline exists
  entity.aggro = 1; // unused until crowds/target-selection exist
  return entity;
}

/* `runBuffs` was consumed here directly through Phase 2 (three bespoke
   fields: powerMult/speedMult/a maxPersistence bonus). Phase 3 ports all
   three onto the hooks.js query pipeline (effect_lib.js's installRunBuffs,
   wired in combat.js) so this factory no longer knows buffs exist at all
   -- deliverable 6's "delete their bespoke code". maxPersistence starts at
   the Stand's base 100 and is resolved through getMaxPersistence once,
   right after this call, by combat.js. */
export function createPlayerFighter(stand, x, z) {
  const entity = {
    id: 'player', kind: 'player', stand, x, z: z == null ? Z_REST : z, facing: 1,
    hp: 100, maxHp: 100,
    persistence: 30, maxPersistence: 100,
    momentum: 0, framesSinceHitLanded: 0, // GDD §3.8 -- the mechanical resource comboCount used to be
    state: 'idle', stateTimer: 0, activeMove: null, hitTargetsThisSwing: null,
    moveFrame: 0, hitboxSpent: null, chainCounts: {}, lastMoveId: null, armorConsumedThisMove: false, // tech §2.4
    invulnerable: false, hitIframeTimer: 0, parryWindow: false, parrySuccess: false, clashPhase: null, clashElapsed: 0,
    dodgeCharges: DODGE_CHARGE_MAX, dodgeRechargeFrames: 0,
    guarding: false, breakActive: false,
    bufferedAction: null,
    squash: 0, hurtFlash: 0, comboCount: 0, moving: false,
    brain: null // the User is player-controlled, not AI-driven
  };
  return attachComponentStubs(entity);
}

export function createEnemyFighter(def, x, hpMult, speedMult, tint, z) {
  const speedPx = def.speedPx * (speedMult || 1);
  const entity = {
    id: def.id, kind: 'enemy', def, x, z: z == null ? Z_REST : z, facing: -1,
    hp: Math.round(def.hp * (hpMult || 1)), maxHp: Math.round(def.hp * (hpMult || 1)),
    speedPx, speedPxPerFrame: speedPx / SIM_HZ, // Speed resolves to a per-frame delta exactly once here
    tint: tint || null,
    state: 'alive', hurtFlash: 0, squash: 0, knockVx: 0, moving: false,
    breakActive: false, // Perfect Clash's Break flag (defense.js/resolvers.js), consumed on next hit taken
    ai: null, projectiles: [], phaseIndex: 0, deathTimer: 0
  };
  attachComponentStubs(entity);
  entity.brain = null; // wired to entity.ai (createEnemyAI's result) once combat.js assigns it
  return entity;
}

export function applyDamage(fighter, amount) {
  fighter.hp = Math.max(0, fighter.hp - amount);
  fighter.hurtFlash = 1;
  return fighter.hp <= 0;
}

export function clampPersistence(fighter) {
  fighter.persistence = Math.max(0, Math.min(fighter.maxPersistence, fighter.persistence));
}
