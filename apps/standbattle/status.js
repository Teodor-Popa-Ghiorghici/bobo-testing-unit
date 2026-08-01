/* Generic status system — GDD §3.10, tech §2.6, Phase 3 deliverable 4.
   Statuses are data; the engine only ticks them. `entity.statuses` was a
   stub array reserved on every fighter since Phase 1 (fighter.js) and is
   populated for real starting this phase.

   Schema per status definition:
     { id, stackRule, maxStacks, durationFrames, tickRateFrames, tags,
       onTick(entity, instance), onExpire(entity, instance), onDeath(entity, instance) }

   Stack rules (tech §2.6):
     'stack'       — repeated applications add stacks and refresh duration
                      (Virus: more DoT, never lost early).
     'refresh'     — repeated applications just reset duration; stacks are
                      clamped to maxStacks, never summed (Frozen: you are
                      either frozen or not, re-freezing just extends it).
     'independent' — each application is its own instance, never merged
                      (reserved for a future status where overlapping
                      applications should tick separately; no proof entry
                      needs it yet, included so content isn't blocked on it).

   A status instance is `{ id, stacks, timer, tickTimer, hitsTaken }`. */

import { applyDamage } from './fighter.js';

export const STACK_RULES = { STACK: 'stack', REFRESH: 'refresh', INDEPENDENT: 'independent' };

const NO_EXPIRY = Infinity;

/* Virus and Frozen — the two proof entries the mission asks for (GDD §3.10
   table). Both are fully real: Virus ticks true damage-per-second, and
   Frozen's fields are real data other systems can read. Nothing in the
   shipped game applies either yet (no Fragment/enemy references them) --
   that is intentional per this phase's "do not add real content" scope,
   not a gap in the status engine itself. */
export const STATUS_DEFS = {
  virus: {
    id: 'virus', name: 'Virus', stackRule: STACK_RULES.STACK, maxStacks: 99,
    durationFrames: 300, // 5s: refreshed on every re-application, per 'stack' rule above
    tickRateFrames: 60, // 1s tick
    tags: ['virus', 'dot'],
    onTick(entity, instance) {
      applyDot(entity, 3 * instance.stacks); // GDD §3.10: "3 dmg/s per stack"
    },
    /* GDD §3.10: "on death, spreads half its stacks to nearest enemy" --
       there is no crowd (multi-enemy) system yet (tech §2.3/Phase 4), so
       there is no "nearest enemy" to spread to. Documented no-op, not a
       silently-dropped feature: flagged here and in the Phase 3 report. */
    onDeath() {}
  },
  frozen: {
    id: 'frozen', name: 'Frozen', stackRule: STACK_RULES.REFRESH, maxStacks: 1,
    durationFrames: NO_EXPIRY, // GDD §3.10: broken by hits, not a timer (see breaksOnHits)
    tickRateFrames: 0,
    tags: ['frozen', 'crowd-control'],
    breaksOnHits: 3, // GDD: "breaks on 3rd hit" -- read by whatever applies damage; not wired to combat this phase
    damageTakenMult: 1.25, // GDD: "damage taken +25%" -- same: data is real, no consumer yet
    frozenSolid: true // engine-recognized flag reserved for AI/movement lockout, unread this phase
  }
};

/* Routes through fighter.js's applyDamage -- the one HP-mutation choke
   point (invariant 5) -- rather than touching entity.hp inline. Known,
   flagged gap: unlike a landed hit (combat_player.js/combat_defense.js),
   nothing polls "did a DoT tick just kill the enemy" -- combat.js's
   stepFrame only checks player.hp for the lose condition every frame; the
   win condition is set at the moment of a killing *hit*, not polled
   generically. A Virus tick that ticks an enemy to 0 today would leave
   the fight stuck at hp 0, outcome 'fighting'. Unreachable in the shipped
   game (no content applies Virus this phase), so left as a documented gap
   for whichever Phase 4+ system first makes a DoT lethal, rather than
   adding a generic death-poll this phase wasn't asked to build. */
function applyDot(entity, amount) {
  if (amount <= 0) return;
  applyDamage(entity, amount);
}

/* Applies `stacks` of `statusId` to `entity`, honouring the definition's
   stack rule. Throws on an unknown id -- content_registry.js's validator
   is what should have caught this before any content reached here; a
   throw at apply-time is the last-resort guard. */
export function applyStatus(entity, statusId, stacks) {
  const def = STATUS_DEFS[statusId];
  if (!def) throw new Error(`[status] Unknown status "${statusId}"`);
  const amount = stacks == null ? 1 : stacks;

  if (def.stackRule === STACK_RULES.INDEPENDENT) {
    entity.statuses.push({ id: statusId, stacks: amount, timer: def.durationFrames, tickTimer: def.tickRateFrames, hitsTaken: 0 });
    return;
  }

  let inst = entity.statuses.find(s => s.id === statusId);
  if (!inst) {
    inst = { id: statusId, stacks: 0, timer: def.durationFrames, tickTimer: def.tickRateFrames, hitsTaken: 0 };
    entity.statuses.push(inst);
  }
  if (def.stackRule === STACK_RULES.STACK) {
    inst.stacks = Math.min(def.maxStacks || Infinity, inst.stacks + amount);
  } else { // refresh
    inst.stacks = Math.min(def.maxStacks || Infinity, Math.max(inst.stacks, amount));
  }
  inst.timer = def.durationFrames; // both stack/refresh rules refresh duration on (re)application
}

export function hasStatus(entity, statusId) {
  return !!(entity.statuses && entity.statuses.some(s => s.id === statusId));
}

export function statusHasTag(entity, tag) {
  return !!(entity.statuses && entity.statuses.some(s => {
    const def = STATUS_DEFS[s.id];
    return def && def.tags.includes(tag);
  }));
}

/* Registers a hit against any active hit-count-limited statuses (Frozen's
   breaksOnHits) and removes ones that reached their limit. Not called by
   any combat path yet (Frozen isn't applied by shipped content this
   phase) -- exposed so the first Fragment/enemy that applies Frozen has
   somewhere to call this from without inventing its own bookkeeping. */
export function registerStatusHit(entity) {
  if (!entity.statuses || !entity.statuses.length) return;
  for (let i = entity.statuses.length - 1; i >= 0; i--) {
    const inst = entity.statuses[i];
    const def = STATUS_DEFS[inst.id];
    if (!def || !def.breaksOnHits) continue;
    inst.hitsTaken += 1;
    if (inst.hitsTaken >= def.breaksOnHits) entity.statuses.splice(i, 1);
  }
}

/* One sim frame of status bookkeeping for one entity: ticks, then expiry.
   Call once per frame per entity (combat.js, after the player/enemy step). */
export function stepStatuses(entity) {
  if (!entity.statuses || !entity.statuses.length) return;
  for (let i = entity.statuses.length - 1; i >= 0; i--) {
    const inst = entity.statuses[i];
    const def = STATUS_DEFS[inst.id];
    if (!def) { entity.statuses.splice(i, 1); continue; } // defensive: never trust stale data across a hot-reload
    if (def.tickRateFrames > 0) {
      inst.tickTimer -= 1;
      if (inst.tickTimer <= 0) {
        inst.tickTimer = def.tickRateFrames;
        if (def.onTick) def.onTick(entity, inst);
      }
    }
    if (def.durationFrames !== NO_EXPIRY) {
      inst.timer -= 1;
      if (inst.timer <= 0) {
        if (def.onExpire) def.onExpire(entity, inst);
        entity.statuses.splice(i, 1);
      }
    }
  }
}

/* Fires every status's onDeath hook once, e.g. when an entity's hp hits 0.
   Not wired into combat.js yet -- no proof status needs it this phase
   (Virus's onDeath is a documented no-op above), reserved for Phase 4. */
export function runStatusDeathHooks(entity) {
  if (!entity.statuses) return;
  entity.statuses.forEach(inst => {
    const def = STATUS_DEFS[inst.id];
    if (def && def.onDeath) def.onDeath(entity, inst);
  });
}
