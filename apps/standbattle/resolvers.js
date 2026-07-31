/* The resolver choke points -- tech §2.4/§2.5, GDD §3.6-3.9. Every derived
   number in the combat sim passes through exactly one of these functions
   (invariant 5); nothing else in the engine may do inline arithmetic on a
   stat. Phase 3 wraps each of them in the hooks.js effect/query pipeline
   precisely because they are the only place a number is computed -- this
   is what makes a Fragment/Relic ("your third Light deals +60%", "Perfect
   Clash refunds 25 Persistence") expressible as pure data with zero
   changes to this file ever again:

     resolveMoveFrames(entity, moveId, stats, bus) -- a player move's resolved
                                                       timeline (getMoveFrames query)
     resolvePatternFrames(enemy, id)     -- an enemy attack pattern's timeline
     resolveDamage(ctx)                  -- final damage for one hitbox hit
                                             (onHitResolve effect, getDamage query)
     applyHit(ctx)                       -- mutates health/statuses from a hit
     rollCrit(ctx)                       -- crit chance from Precision (onCritCheck effect)
     resolvePoiseDamage(ctx)             -- poise damage for one hitbox hit (getPoiseDamage query)
     resolvePersistenceCost(ctx)         -- a move's Persistence cost (getPersistenceCost query)

   resolveReach()/resolveMomentumMult() are private arithmetic these five
   call internally -- still only ever computed here, never inlined at a
   call site in combat_player.js/combat_enemy.js. */

import { MOVES } from './moves.js';
import { PATTERNS } from './ai.js';
import { applyDamage } from './fighter.js';
import { resolveSpeedScalar, resolveCritChance } from './stats.js';

/* World units of move reach per point of the Stand's Range stat (spec
   §2.1). Star Platinum's Range is 2, so the base (reachMult 1.0) move
   reaches 62 units -- the exact number sp_light used before this phase,
   so the prototype's feel doesn't shift on the conversion. Every other
   move's reach is that same per-Range unit scaled by its own reachMult,
   never an independently hardcoded number (tech §2.4 deliverable 1). */
const REACH_PER_RANGE = 31;

export function resolveReach(rangeStat, reachMult) {
  return Math.round(REACH_PER_RANGE * rangeStat * (reachMult == null ? 1 : reachMult));
}

/* Momentum -> damage multiplier, GDD §3.8: +40% at 100 Momentum. */
export function resolveMomentumMult(momentum) {
  return 1 + 0.004 * Math.max(0, Math.min(100, momentum || 0));
}

/* Resolves a player move's data-authored timeline into world units: fills
   each hitbox's x/w from the Stand's Range stat, scales every frame count
   by the Speed-derived timing scalar (stats.js -- 1.0 for Star Platinum,
   so this is a no-op today, see stats.js's comment), and derives the
   legacy windup/active/recover/hitCount fields the (untouched) pose/HUD
   layer still reads directly off `player.activeMove`. `bus`, if provided,
   runs the result through the getMoveFrames query (tech §2.1 minimum
   surface) as the very last step, so a Fragment can rewrite timing/reach
   generically without this function ever changing again. */
export function resolveMoveFrames(entity, moveId, stats, bus) {
  const def = MOVES[moveId];
  const scalar = stats ? resolveSpeedScalar(entity, stats) : 1;
  const scale = f => Math.max(1, Math.round(f * scalar));
  const reach = resolveReach(entity.stand.stats.range, def.reachMult);
  const hitboxes = def.hitboxes.map(hb => ({
    ...hb, w: hb.w == null ? reach : hb.w, x: hb.x == null ? reach / 2 : hb.x,
    from: scale(hb.from), to: scale(hb.to)
  }));
  const cancels = def.cancels.map(c => ({ ...c, from: scale(c.from) }));
  const armor = def.armor ? { from: scale(def.armor.from), to: scale(def.armor.to) } : null;
  const firstFrom = Math.min(...hitboxes.map(h => h.from));
  const lastTo = Math.max(...hitboxes.map(h => h.to));
  const frames = Math.max(scale(def.frames), lastTo);
  let resolved = {
    ...def, hitboxes, cancels, armor, reach, frames,
    windupFrames: firstFrom - 1,
    activeFrames: lastTo - firstFrom + 1,
    recoverFrames: frames - lastTo,
    hitCount: hitboxes.length
  };
  if (bus) resolved = bus.runQuery('getMoveFrames', resolved, { entity, moveId });
  return resolved;
}

/* Enemy attack patterns don't derive reach from a Range stat (enemies
   aren't Stands in this data model, tech §2.4 is explicit that only
   player moves must) -- but they still resolve through one function so a
   later Menace modifier (tech §2.9: "recovery frames shrink, telegraphs
   never do") has exactly one place to apply. Pass-through today. */
export function resolvePatternFrames(enemy, patternId) {
  return PATTERNS[patternId];
}

/* Precision -> crit chance (spec §2.1: "Precision — crit chance / status-
   effect accuracy"). `ctx.rng` must be the run's 'combat' stream (rng.js).
   `ctx.bus`, if provided, runs onCritCheck (mutable: a Fragment may adjust
   chance/mult before the roll, or even force `crit`/`cancelled`) ahead of
   the actual roll. Crits deal x1.5 by default. */
export function rollCrit(ctx) {
  let chance = ctx.stats ? resolveCritChance(ctx.attacker, ctx.stats)
    : Math.max(0, Math.min(0.35, (ctx.attacker.stand ? ctx.attacker.stand.stats.precision : 0) * 0.02));
  let mult = 1.5;
  if (ctx.bus) {
    const hookCtx = { attacker: ctx.attacker, chance, mult, crit: false, cancelled: false };
    ctx.bus.runEffect('onCritCheck', hookCtx);
    chance = hookCtx.chance; mult = hookCtx.mult;
    if (hookCtx.cancelled) return { crit: false, mult: 1 };
  }
  const crit = ctx.rng ? ctx.rng.chance(chance) : false;
  return { crit, mult: crit ? mult : 1 };
}

/* Final damage for one landed hitbox hit. `ctx`:
   { attacker, defender, hitbox|pattern, isPlayerAttacker, critMult,
     guardMult, move?, bus? }
   When `ctx.bus` is provided this is the single call site for both
   onHitResolve (mutable: a Fragment may multiply ctx.damage, queue
   ctx.statuses for the caller to apply on a landed hit, or cancel the hit
   outright) and the getDamage query (pure multiplier layer -- this is
   where the ported "+15% Power" run buff lives now, deliverable 6). */
export function resolveDamage(ctx) {
  let dmg;
  if (ctx.isPlayerAttacker) {
    dmg = ctx.hitbox.dmg * (ctx.attacker.stand.stats.power / 8);
    dmg *= resolveMomentumMult(ctx.attacker.momentum);
  } else {
    dmg = ctx.pattern.dmgMult * ctx.attacker.def.power * 2;
  }
  if (ctx.critMult) dmg *= ctx.critMult;
  if (ctx.defender.breakActive) dmg *= 1.8; // Perfect Clash's Break (GDD §3.7), consumed by applyHit
  if (ctx.defender.ai && ctx.defender.ai.state === 'staggered') dmg *= ctx.defender.ai.staggerMult || 1;
  if (ctx.guardMult != null) dmg *= ctx.guardMult; // Guard's -70% / chip conversion (defense.js)

  if (ctx.bus) {
    const tags = (ctx.hitbox && ctx.hitbox.tags) || (ctx.pattern && ctx.pattern.tags) || [];
    const chainCount = ctx.move && ctx.attacker.chainCounts ? (ctx.attacker.chainCounts[ctx.move.id] || 0) : 0;
    const hookCtx = {
      attacker: ctx.attacker, defender: ctx.defender, move: ctx.move || null,
      hitbox: ctx.hitbox || null, pattern: ctx.pattern || null, isPlayerAttacker: ctx.isPlayerAttacker,
      damage: dmg, tags, slot: ctx.move ? ctx.move.slot : null, chainCount,
      crit: !!(ctx.critMult && ctx.critMult > 1), statuses: [], cancelled: false
    };
    ctx.bus.runEffect('onHitResolve', hookCtx);
    dmg = hookCtx.cancelled ? 0 : hookCtx.damage;
    ctx.pendingStatuses = hookCtx.statuses; // read by the caller after a confirmed landed hit
    dmg = ctx.bus.runQuery('getDamage', dmg, hookCtx);
  }
  return dmg;
}

/* Poise damage for one landed hitbox hit (GDD §3.9). `ctx.bus`, if
   provided, runs the result through getPoiseDamage (tech §2.1 minimum
   surface) so a future "Precision also sharpens poise damage" rule has
   one call site. */
export function resolvePoiseDamage(ctx) {
  let amount = ctx.hitbox ? ctx.hitbox.poise || 0 : 0;
  if (ctx.bus) amount = ctx.bus.runQuery('getPoiseDamage', amount, ctx);
  return amount;
}

/* A move's Persistence cost (GDD §3.8). `ctx.bus`, if provided, runs it
   through getPersistenceCost so a Fragment/Relic can cheapen (or raise)
   Specials generically instead of combat_player.js reading
   `move.costs.persistence` directly (which would be exactly the "inline
   arithmetic on a stat" invariant 5 forbids). */
export function resolvePersistenceCost(ctx) {
  let cost = (ctx.move && ctx.move.costs.persistence) || 0;
  if (ctx.bus) cost = ctx.bus.runQuery('getPersistenceCost', cost, ctx);
  return cost;
}

/* Mutates `defender` from a resolved hit: applies HP damage and consumes
   one-shot defender flags (Break) so no caller has to remember to. Returns
   { dead }. Poise/stagger and knockback are applied by their own systems
   (poise.js / the caller) since they aren't "damage" in the GDD sense. */
export function applyHit(ctx, dmg) {
  const dead = applyDamage(ctx.defender, dmg);
  ctx.defender.breakActive = false;
  return { dead };
}
