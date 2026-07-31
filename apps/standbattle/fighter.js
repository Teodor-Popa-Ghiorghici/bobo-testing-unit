/* Fighter runtime state factories — shared shape for the player Stand and
   any enemy/boss, so combat.js can treat both generically. */

export function createPlayerFighter(stand, x, runBuffs) {
  const powerMult = runBuffs.reduce((m, b) => m * (b.powerMult || 1), 1);
  const speedMult = runBuffs.reduce((m, b) => m * (b.speedMult || 1), 1);
  const maxPersistence = 100 + runBuffs.reduce((s, b) => s + (b.maxPersistenceBonus || 0), 0);
  return {
    kind: 'player', stand, x, facing: 1,
    hp: 100, maxHp: 100,
    persistence: 30, maxPersistence,
    powerMult, speedMult,
    state: 'idle', stateTimer: 0, activeMove: null, hitTargetsThisSwing: null,
    invulnerable: false, parryWindow: false, parrySuccess: false,
    squash: 0, hurtFlash: 0, comboCount: 0, moving: false
  };
}

export function createEnemyFighter(def, x, hpMult, speedMult, tint) {
  return {
    kind: 'enemy', def, x, facing: -1,
    hp: Math.round(def.hp * (hpMult || 1)), maxHp: Math.round(def.hp * (hpMult || 1)),
    speedPx: def.speedPx * (speedMult || 1),
    tint: tint || null,
    state: 'alive', hurtFlash: 0, squash: 0, knockVx: 0, moving: false,
    ai: null, projectiles: [], phaseIndex: 0, deathTimer: 0
  };
}

export function applyDamage(fighter, amount) {
  fighter.hp = Math.max(0, fighter.hp - amount);
  fighter.hurtFlash = 1;
  return fighter.hp <= 0;
}

export function clampPersistence(fighter) {
  fighter.persistence = Math.max(0, Math.min(fighter.maxPersistence, fighter.persistence));
}
