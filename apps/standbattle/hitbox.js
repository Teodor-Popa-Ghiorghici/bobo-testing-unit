/* AABB hit resolution in (x, z) -- tech §2.4/§2.5 deliverable 2. Replaces
   the old `Math.abs(dx) <= range` scalar check. One shared depth-tolerance
   table so melee stays forgiving and ranged/wall-type stays exact (GDD
   §3.5): "Depth tolerance on melee is generous (±22 units)... ranged and
   wall-type attacks respect it exactly." Every hit test in the sim --
   player hitboxes against the enemy, enemy melee patterns against the
   player, projectiles against the player -- goes through `overlaps()` so
   the tolerance rule can't drift between the two directions. */

const MELEE_DEPTH_TOLERANCE = 22;
const EXACT_DEPTH_TOLERANCE = 10; // ranged / wall-type tags

export function depthToleranceFor(tags) {
  if (tags && (tags.includes('ranged') || tags.includes('wall'))) return EXACT_DEPTH_TOLERANCE;
  return MELEE_DEPTH_TOLERANCE;
}

function hurtboxHalfWidth(entity) {
  return (entity.body && entity.body.hurtboxW || 30) / 2;
}

/* `box` is a hitbox descriptor relative to `attacker`: { x, z, w, tags }.
   `x`/`z` are offsets from the attacker's own (x, z) -- `x` is projected
   through the attacker's facing so a hitbox always reads as "in front of"
   whichever way the attacker is turned, matching a real hitbox rectangle
   rather than the old symmetric distance check. */
export function overlaps(attacker, box, defender) {
  const facing = attacker.facing || 1;
  const centerX = attacker.x + facing * (box.x == null ? box.w / 2 : box.x);
  const centerZ = attacker.z + (box.z || 0);
  const halfW = box.w / 2 + hurtboxHalfWidth(defender);
  if (Math.abs(defender.x - centerX) > halfW) return false;
  return Math.abs(defender.z - centerZ) <= depthToleranceFor(box.tags);
}

/* Point-vs-hurtbox test for projectiles (which carry their own world x/z
   rather than an offset relative to an attacker's facing). Used by
   combat_enemy.js so ranged/homing patterns respect depth exactly, the
   same rule melee hitboxes follow via overlaps() above. */
export function pointOverlaps(x, z, defender, tags, radius) {
  if (Math.abs(defender.x - x) > radius + hurtboxHalfWidth(defender)) return false;
  return Math.abs(defender.z - z) <= depthToleranceFor(tags);
}

/* Whole-frame active-window test for a player move's hitbox list (tech
   §2.4: hitboxes carry absolute `from`/`to` frame numbers within the
   move's timeline; multi-hit moves list several windows rather than
   dividing activeFrames by hitCount). `spent` is a per-activation Set of
   hitbox indices already used, so a window connects at most once even
   though it may be checked across several frames while it waits for the
   target to be in range. */
export function stepMoveHitboxes(attacker, move, frame, spent, defender, onHit) {
  move.hitboxes.forEach((hb, i) => {
    if (spent.has(i)) return;
    if (frame < hb.from || frame > hb.to) return;
    if (defender.hp <= 0) return;
    if (overlaps(attacker, hb, defender)) {
      spent.add(i);
      onHit(hb, i);
    }
  });
}
