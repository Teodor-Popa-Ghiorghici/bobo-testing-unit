/* Combat engine — §2.1/§2.3/§5. Orchestrates the player Stand and one
   enemy/boss along a single lane. Telegraphs every enemy heavy attack,
   keeps dodge (i-frames) and parry (tight counter window) as distinct
   mechanics, and routes hit/kill/damage events through the hook
   dispatcher so future content (Arrows, evolutions) never needs to touch
   this file. */

import { MOVES, STANDS } from './data.js';
import { PATTERNS, createEnemyAI, stepEnemyAI, defaultApproachRange } from './ai.js';
import { createPlayerFighter, createEnemyFighter, applyDamage, clampPersistence } from './fighter.js';
import { createDispatcher } from './hooks.js';
import { createJuice } from './juice.js';

const ARENA_MIN = 24, ARENA_MAX = 360;
const DODGE_MS = 260, DODGE_IFRAME_MS = 200, PARRY_MS = 200;
const PLAYER_SPEED = 95;
const DEATH_ANIM_MS = 900;

export function createCombat(enemyDef, runBuffs, opts) {
  opts = opts || {};
  const stand = STANDS.star_platinum;
  const player = createPlayerFighter(stand, 70, runBuffs);
  const enemy = createEnemyFighter(enemyDef, 314, opts.hpMult, opts.speedMult, opts.tint);
  const isBoss = !!enemyDef.phases;
  enemy.ai = createEnemyAI(isBoss ? enemyDef.phases[0].attackPatterns : enemyDef.attackPatterns);

  const dispatcher = createDispatcher();
  const juice = createJuice(opts.shakeEnabled);
  const keys = {};
  const combat = {
    player, enemy, juice, dispatcher, isBoss,
    outcome: 'fighting', banner: enemyDef.name || enemyDef.standName, bannerTimer: 1400,
    log: []
  };

  function push(msg) { combat.log.unshift(msg); combat.log.length = Math.min(4, combat.log.length); }

  combat.setKey = (code, down) => { keys[code] = down; };

  function startPlayerMove(move) {
    player.state = 'attack';
    player.activeMove = move;
    player.movePhase = 'windup';
    player.stateTimer = move.windupMs;
    player.hitsLanded = 0;
    if (move.persistenceCost) { player.persistence -= move.persistenceCost; clampPersistence(player); }
  }

  function tryAttack(kind) {
    if (player.state !== 'idle') return;
    const id = kind === 'special' ? stand.moves.special : kind === 'rush' ? stand.standRush : stand.moves[kind];
    const move = MOVES[id];
    if (move.persistenceCost && player.persistence < move.persistenceCost) { dispatcher.fire('onMoveDenied', {}); return; }
    startPlayerMove(move);
  }

  function startDodge() {
    if (player.state !== 'idle') return;
    player.state = 'dodge';
    player.stateTimer = DODGE_MS;
    player.invulnerable = true;
    player.dodgeDir = enemy.x > player.x ? -1 : 1;
  }
  function startParry() {
    if (player.state !== 'idle') return;
    player.state = 'parry';
    player.stateTimer = PARRY_MS;
    player.parryWindow = true;
  }

  function resolvePlayerHitWindow() {
    const m = player.activeMove;
    const hitEvery = m.activeMs / m.hitCount;
    const elapsed = m.activeMs - player.stateTimer;
    const shouldHave = Math.min(m.hitCount, Math.floor(elapsed / hitEvery) + 1);
    while (player.hitsLanded < shouldHave) {
      player.hitsLanded++;
      const dist = Math.abs(enemy.x - player.x);
      if (dist <= m.range && enemy.hp > 0) {
        const dmg = m.damage * player.powerMult * (stand.stats.power / 8);
        const dead = applyDamage(enemy, dmg);
        enemy.knockVx = (enemy.x >= player.x ? 1 : -1) * m.knockback;
        player.persistence += m.persistenceGain;
        clampPersistence(player);
        player.comboCount++;
        juice.triggerHitstop(m.hitstopMs);
        juice.triggerShake(player.facing, 0, dead ? 6 : m.type === 'heavy' || m.type === 'rush' ? 4 : 2, 140);
        juice.spawnBurst(enemy.x, 100, '#FFFF55', dead ? 18 : 6, 90, player.facing, -0.4);
        dispatcher.fire('onHit', { moveType: m.type, combo: player.comboCount, finishing: dead });
        if (dead) {
          enemy.deathTimer = DEATH_ANIM_MS;
          dispatcher.fire('onKill', { combo: player.comboCount });
          combat.outcome = 'win';
        }
      }
    }
  }

  function resolveIncomingHit(pattern, atX) {
    const dist = Math.abs(atX - player.x);
    if (dist > pattern.range) return;
    if (player.invulnerable) {
      push('DODGED');
      juice.spawnBurst(player.x, 100, '#55FFFF', 5, 60);
      dispatcher.fire('onDodgeSuccess', {});
      return;
    }
    if (player.parryWindow) {
      push('PARRIED!');
      player.parrySuccess = true;
      player.parryWindow = false;
      player.stateTimer = 60; // tight parry rewards a fast return to idle
      juice.triggerHitstop(120);
      juice.triggerShake(-player.facing, 0, 6, 160);
      juice.spawnBurst(player.x, 100, '#FFFFFF', 14, 110);
      dispatcher.fire('onParrySuccess', {});
      const dmg = 12 * player.powerMult;
      const dead = applyDamage(enemy, dmg);
      enemy.knockVx = (enemy.x >= player.x ? 1 : -1) * 14;
      if (dead) {
        enemy.deathTimer = DEATH_ANIM_MS;
        dispatcher.fire('onKill', { combo: player.comboCount });
        combat.outcome = 'win';
      }
      return;
    }
    const dmg = pattern.dmgMult * enemyDef.power * 2 * (opts.hpMult ? 1 : 1);
    const dead = applyDamage(player, dmg);
    player.knockVx = (player.x >= atX ? 1 : -1) * pattern.knockback;
    player.comboCount = 0;
    juice.triggerHitstop(pattern.hitstopMs);
    juice.triggerShake(atX >= player.x ? -1 : 1, 0.3, pattern.dmgMult > 1.5 ? 7 : 4, 180);
    juice.spawnBurst(player.x, 100, '#FF5555', 10, 100);
    dispatcher.fire('onDamageTaken', { dmg, heavy: pattern.dmgMult > 1.5 });
    player.state = dead ? 'dead' : 'hitstun';
    player.stateTimer = 260;
    player.invulnerable = false;
    player.parryWindow = false;
    if (dead) { combat.outcome = 'lose'; }
  }

  function updatePlayer(dt) {
    if (player.hurtFlash > 0) player.hurtFlash = Math.max(0, player.hurtFlash - dt / 150);
    if (player.knockVx) { player.x += player.knockVx; player.knockVx *= 0.8; if (Math.abs(player.knockVx) < 0.3) player.knockVx = 0; }
    player.x = Math.max(ARENA_MIN, Math.min(ARENA_MAX, player.x));
    player.facing = enemy.x >= player.x ? 1 : -1;

    if (player.state === 'idle') {
      let mv = 0;
      if (keys.left) mv -= 1;
      if (keys.right) mv += 1;
      player.moving = mv !== 0;
      player.x = Math.max(ARENA_MIN, Math.min(ARENA_MAX, player.x + mv * PLAYER_SPEED * player.speedMult * dt / 1000));
      if (keys.light) tryAttack('light');
      else if (keys.medium) tryAttack('medium');
      else if (keys.heavy) tryAttack('heavy');
      else if (keys.special) tryAttack('special');
      else if (keys.rush) tryAttack('rush');
      else if (keys.dodge) startDodge();
      else if (keys.parry) startParry();
      return;
    }
    player.stateTimer -= dt;
    if (player.state === 'attack') {
      const m = player.activeMove;
      if (player.movePhase === 'windup' && player.stateTimer <= 0) {
        player.movePhase = 'active'; player.stateTimer = m.activeMs;
      } else if (player.movePhase === 'active') {
        resolvePlayerHitWindow();
        if (player.stateTimer <= 0) { player.movePhase = 'recover'; player.stateTimer = m.recoverMs; }
      } else if (player.movePhase === 'recover' && player.stateTimer <= 0) {
        player.state = 'idle'; player.activeMove = null;
      }
    } else if (player.state === 'dodge') {
      if (DODGE_MS - player.stateTimer < DODGE_IFRAME_MS) {
        player.x = Math.max(ARENA_MIN, Math.min(ARENA_MAX, player.x + player.dodgeDir * PLAYER_SPEED * 1.6 * dt / 1000));
      }
      if (DODGE_MS - player.stateTimer >= DODGE_IFRAME_MS) player.invulnerable = false;
      if (player.stateTimer <= 0) { player.state = 'idle'; player.invulnerable = false; }
    } else if (player.state === 'parry') {
      if (player.parryWindow && player.stateTimer <= 0) {
        // window closed with no incoming hit -- a whiffed parry earns a
        // short punishable recovery, unlike a dodge's clean "safe" exit
        player.parryWindow = false;
        player.stateTimer = 150;
      } else if (!player.parryWindow && player.stateTimer <= 0) {
        player.state = 'idle'; player.parrySuccess = false;
      }
    } else if (player.state === 'hitstun') {
      if (player.stateTimer <= 0) player.state = 'idle';
    }
  }

  function updateEnemyPhase() {
    if (!isBoss || enemy.state !== 'alive') return;
    const frac = enemy.hp / enemy.maxHp;
    const next = enemy.phaseIndex + 1;
    const phases = enemyDef.phases;
    if (next < phases.length && frac <= phases[enemy.phaseIndex].hpAbove) {
      enemy.phaseIndex = next;
      enemy.ai.patternIds = phases[next].attackPatterns;
      enemy.ai.approachRange = defaultApproachRange(phases[next].attackPatterns);
      enemy.invulnUntil = 500;
      combat.banner = enemyDef.transitionLine || 'PHASE 2';
      combat.bannerTimer = 1800;
      juice.triggerHitstop(160);
      juice.triggerShake(0, -1, 8, 260);
      dispatcher.fire('onPhaseTransition', {});
    }
  }

  function updateEnemy(dt) {
    if (enemy.hp <= 0) {
      if (enemy.deathTimer > 0) enemy.deathTimer = Math.max(0, enemy.deathTimer - dt);
      if (enemy.hurtFlash > 0) enemy.hurtFlash = Math.max(0, enemy.hurtFlash - dt / 150);
      return;
    }
    if (enemy.hurtFlash > 0) enemy.hurtFlash = Math.max(0, enemy.hurtFlash - dt / 150);
    if (enemy.knockVx) { enemy.x += enemy.knockVx; enemy.knockVx *= 0.82; if (Math.abs(enemy.knockVx) < 0.3) enemy.knockVx = 0; }
    enemy.x = Math.max(ARENA_MIN, Math.min(ARENA_MAX, enemy.x));
    enemy.facing = player.x >= enemy.x ? 1 : -1;
    if (enemy.invulnUntil > 0) { enemy.invulnUntil -= dt; return; }

    const dist = Math.abs(player.x - enemy.x);
    enemy.moving = false;
    if (enemy.ai.state === 'approach') {
      const dir = player.x > enemy.x ? 1 : -1;
      if (dist > enemy.ai.approachRange) { enemy.x += dir * enemy.speedPx * dt / 1000; enemy.moving = true; }
    }
    const wasWindup = enemy.ai.state === 'windup';
    const ev = stepEnemyAI(enemy.ai, Math.abs(player.x - enemy.x), dt);
    if (!wasWindup && enemy.ai.state === 'windup') dispatcher.fire('onTelegraphStart', { pattern: enemy.ai.pattern });
    if (ev && ev.type === 'spawnMelee') {
      resolveIncomingHit(ev.pattern, enemy.x);
    } else if (ev && ev.type === 'spawnProjectile') {
      enemy.projectiles.push({ x: enemy.x, dir: player.x >= enemy.x ? 1 : -1, pattern: ev.pattern, life: ev.pattern.activeMs });
    }
    updateEnemyPhase();

    for (let i = enemy.projectiles.length - 1; i >= 0; i--) {
      const pr = enemy.projectiles[i];
      pr.life -= dt;
      if (pr.homing === undefined) pr.homing = pr.pattern.homing;
      if (pr.homing) pr.dir = player.x >= pr.x ? 1 : -1;
      pr.x += pr.dir * pr.pattern.projectileSpeed * dt / 1000;
      if (Math.abs(pr.x - player.x) < 10) { resolveIncomingHit(pr.pattern, pr.x); enemy.projectiles.splice(i, 1); continue; }
      if (pr.life <= 0 || pr.x < ARENA_MIN - 20 || pr.x > ARENA_MAX + 20) enemy.projectiles.splice(i, 1);
    }
  }

  combat.update = dt => {
    if (combat.outcome !== 'fighting') return;
    if (combat.bannerTimer > 0) combat.bannerTimer -= dt;
    if (juice.update(dt)) return;
    updatePlayer(dt);
    updateEnemy(dt);
    if (player.hp <= 0 && combat.outcome === 'fighting') combat.outcome = 'lose';
  };

  return combat;
}

export { PATTERNS };
