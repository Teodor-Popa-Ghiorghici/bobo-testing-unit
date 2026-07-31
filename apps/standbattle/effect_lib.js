/* Generic effect/query verb library — Phase 3. Content (Fragments, Relics,
   run buffs) never writes JS logic; a content entry's `effects`/`queries`
   array names one of these functions by string plus a small data object,
   e.g. `{ hook: 'onHitResolve', fn: 'chainedDamageMult', data: { slot:
   'light', atChain: 3, mult: 1.6 } }`. content_registry.js resolves the
   `fn` string against EFFECT_LIB/QUERY_LIB at install time; an unknown
   name is a load-time validation error (deliverable 5), never a runtime
   crash from a missing function.

   This is deliberately a SMALL, reusable vocabulary (spec §0: "if you find
   yourself writing a bespoke function per content item, stop and build the
   generic mechanism instead") -- every entry here is parameterized so many
   different Fragments can share it rather than each getting its own verb. */

import { gainPersistence, gainMomentum } from './resources.js';
import { PRIORITY } from './hooks.js';

/* ---- EFFECTS (mutate a hook's ctx) -------------------------------------- */

export const EFFECT_LIB = {
  /* Grants a flat amount of a named resource to ctx.entity (falls back to
     ctx.attacker for hooks that don't name an `entity`, e.g. onHitResolve).
     data: { resource: 'persistence'|'momentum', amount } */
  grantResource(ctx, data) {
    const entity = ctx.entity || ctx.attacker;
    if (!entity) return;
    if (data.resource === 'persistence') gainPersistence(entity, data.amount);
    else if (data.resource === 'momentum') gainMomentum(entity, data.amount);
  },

  /* onHitResolve only. Multiplies ctx.damage when the hit came from a
     given move slot at a given self-chain count (or unconditionally if
     `slot`/`atChain` are omitted). This is the generic shape behind "your
     Nth <slot> in a string deals +X%" -- one function, any slot/chain/mult. */
  chainedDamageMult(ctx, data) {
    if (data.slot != null && ctx.slot !== data.slot) return;
    if (data.atChain != null && ctx.chainCount !== data.atChain) return;
    ctx.damage *= data.mult;
  },

  /* onHitLanded only. Queues a status application (ctx.statuses, per
     tech §2.1's example ctx shape) under the same slot/chain gate as
     chainedDamageMult -- the generic shape behind "your Nth <slot> applies
     N stacks of <status>". */
  chainedApplyStatus(ctx, data) {
    if (data.slot != null && ctx.slot !== data.slot) return;
    if (data.atChain != null && ctx.chainCount !== data.atChain) return;
    ctx.statuses.push({ id: data.status, stacks: data.stacks || 1 });
  },

  /* Unconditional status queue -- for hooks that don't carry a slot/chain
     (e.g. a Relic that applies a status onKill). */
  applyStatusUnconditional(ctx, data) {
    if (!ctx.statuses) return;
    ctx.statuses.push({ id: data.status, stacks: data.stacks || 1 });
  },

  /* Sets ctx.cancelled -- the generic "block this" verb any effect hook's
     contract already supports (hooks.js's runEffect stops the chain and,
     for onHitResolve, resolvers.js reads it as "this hit deals no
     damage"). data: {} (unconditional) or { slot, atChain } to gate it. */
  cancel(ctx, data) {
    if (data && data.slot != null && ctx.slot !== data.slot) return;
    ctx.cancelled = true;
  }
};

/* ---- QUERIES (pure value reducers) -------------------------------------- */

export const QUERY_LIB = {
  /* value * data.mult, only when the query's ctx says the player is the
     attacker (the shape every player-side "+X% Power" buff needs; a
     Relic affecting enemy damage instead would gate the other way). */
  multiplyIfPlayerAttacker(value, ctx, data) {
    if (ctx && ctx.isPlayerAttacker === false) return value;
    return value * data.mult;
  },
  addFlat(value, ctx, data) { return value + data.amount; },
  multiplyFlat(value, ctx, data) { return value * data.mult; }
};

/* Installs a run buff's declared `queries` (data.js's RUN_BUFFS shape,
   Phase 3 deliverable 6 -- these three buffs are the same content that
   used to be three bespoke fields on the player fighter). Not part of the
   Fragment/Relic content registry (run buffs are the prototype's
   placeholder reward, per data.js's own comment, not a GDD Arrow), so it
   gets its own tiny loader rather than content_registry.js's full
   fragment/relic validation surface. Still fails loudly on a bad hook or
   fn name -- there just isn't a large pool to batch the errors over. */
export function installRunBuffs(dispatcher, buffs) {
  buffs.forEach(buff => {
    (buff.queries || []).forEach(q => {
      const fn = QUERY_LIB[q.fn];
      if (!fn) throw new Error(`[content] run buff "${buff.id}": unknown query function "${q.fn}"`);
      if (!dispatcher.isQueryHook(q.hook)) {
        throw new Error(`[content] run buff "${buff.id}": "${q.hook}" is not a registered query hook`);
      }
      const priority = q.priority == null ? PRIORITY.MULTIPLY : q.priority;
      dispatcher.query(q.hook, priority, (value, ctx) => fn(value, ctx, q.data || {}), buff.id);
    });
  });
}
