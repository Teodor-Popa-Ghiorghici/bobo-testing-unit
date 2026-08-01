/* Effect-hook dispatcher — tech §2.1, Phase 3. Replaces the Phase-0/1/2
   notification-only bus: that bus fired `onHit` *after* `applyDamage` with
   a payload of `{moveType, combo, finishing}` and no mutable value, so not
   one Fragment/Relic in the GDD could be expressed against it (GDD's own
   audit, tech §1.3). This file is the ONE registry content and combat code
   both read: a hook name has exactly one kind, declared here, nowhere else.

   Three hook kinds:
     EVENTS  — bus.on(name, fn) / dispatcher.fire(name, payload). Pure
               notification, payload is never mutated back into the sim.
               audio.js/fx.js/juice reactions live here (invariant 8: they
               watch combat state, never write it).
     EFFECTS — bus.effect(name, priority, fn, source) / dispatcher.runEffect
               (name, ctx). ctx is a plain mutable object; listeners run in
               priority order (PRIORITY bands below) and may set
               `ctx.cancelled = true` to short-circuit the rest. Every
               effect fn is called with `ctx.source` set to the id that
               registered it (Fragment/Relic attribution, tech §2.1).
               bus.on(name, fn) ALSO works on an effect-kind hook: it is
               invoked once, read-only, with the final ctx, right after all
               effects have resolved — this is how audio.js/fx.js observe
               onKill/onDamageTaken/onPerfectClash without needing to know
               those hooks became mutable in this phase.
     QUERIES — bus.query(name, priority, fn, source) / dispatcher.runQuery
               (name, value, ctx). Pure reducers over a value: each
               registered fn is `(value, ctx) => value`, chained in
               priority order. Used for derived numbers (getDamage,
               getMoveFrames, ...) rather than fighter-state mutation.

   A hook name used with the wrong API (bus.fire on an effect hook, bus.on
   on a query hook, anything not in the tables below) throws immediately —
   "content referencing an unknown hook fails at load time" (Phase 3
   mission, deliverable 1). content_registry.js's validator additionally
   checks hook names *before* calling into the dispatcher at all, so a
   whole content file's problems can be listed at once instead of stopping
   at the first bad hook (deliverable 5). */

/* Priority bands (deliverable 1: "add -> multiply -> clamp, so content
   authors never reason about ordering"). An effect/query registers at
   PRIORITY.<BAND> + a small offset to order itself within the band; bands
   themselves always run in this fixed order because effects/queries are
   kept sorted by priority ascending. */
export const PRIORITY = { ADD: 0, MULTIPLY: 1000, CLAMP: 2000 };

export const EVENT_HOOKS = [
  'onRunStart', 'onFloorStart', 'onHit', 'onNodeClear', 'onRunEnd',
  'onDodgeSuccess', 'onParrySuccess', 'onMoveDenied',
  'onTelegraphStart', 'onPhaseTransition'
];

/* Minimum combat surface required "live and provably mutable" by the
   Phase 3 mission. onKill/onDamageTaken/onPerfectClash existed as EVENTS
   before this phase (fired post-hoc, nothing could change from them) and
   are promoted to EFFECTS here — see the bus.on() note above for why
   audio.js/fx.js need no changes for that promotion. */
export const EFFECT_HOOKS = [
  'onMoveStart', 'onHitResolve', 'onHitLanded', 'onCritCheck', 'onKill',
  'onDamageIncoming', 'onDamageTaken', 'onStaggerStart', 'onStepStart',
  'onClashSuccess', 'onPerfectClash', 'onGuardBreak'
];

/* getMaxPersistence/getMoveSpeed extend the mission's minimum four
   (getDamage/getMoveFrames/getPoiseDamage/getPersistenceCost) — needed to
   port the three existing run buffs off their bespoke fighter.js fields
   (deliverable 6). Tech §2.1: "extend this list as content requires it,
   but register new hooks in one place." */
export const QUERY_HOOKS = [
  'getDamage', 'getMoveFrames', 'getPoiseDamage', 'getPersistenceCost',
  'getMaxPersistence', 'getMoveSpeed'
];

const HOOK_KIND = {};
EVENT_HOOKS.forEach(h => { HOOK_KIND[h] = 'event'; });
EFFECT_HOOKS.forEach(h => { HOOK_KIND[h] = 'effect'; });
QUERY_HOOKS.forEach(h => { HOOK_KIND[h] = 'query'; });

export function hookKindOf(name) { return HOOK_KIND[name] || null; }

export function createDispatcher() {
  const onListeners = {}; // name -> [fn]  -- valid for 'event' AND 'effect' kinds
  const effectListeners = {}; // name -> [{priority, fn, source}]
  const queryListeners = {}; // name -> [{priority, fn, source}]

  function assertKind(name, allowed, api) {
    const kind = HOOK_KIND[name];
    if (!kind) {
      throw new Error(`[hooks] Unknown hook "${name}" referenced via bus.${api}() — register it in hooks.js first.`);
    }
    if (!allowed.includes(kind)) {
      throw new Error(`[hooks] "${name}" is a registered ${kind.toUpperCase()} hook; bus.${api}() does not apply to it.`);
    }
  }

  function sortByPriority(arr) { arr.sort((a, b) => a.priority - b.priority); }

  return {
    hasHook(name) { return !!HOOK_KIND[name]; },
    hookKind(name) { return HOOK_KIND[name] || null; },
    isEffectHook(name) { return HOOK_KIND[name] === 'effect'; },
    isQueryHook(name) { return HOOK_KIND[name] === 'query'; },
    isEventHook(name) { return HOOK_KIND[name] === 'event'; },

    on(name, fn) {
      assertKind(name, ['event', 'effect'], 'on');
      (onListeners[name] || (onListeners[name] = [])).push(fn);
    },
    off(name, fn) {
      const arr = onListeners[name];
      if (!arr) return;
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    },
    /* Pure notification. Only valid for EVENT-kind hooks -- an effect hook
       must go through runEffect() so its ctx is actually mutable. */
    fire(name, payload) {
      assertKind(name, ['event'], 'fire');
      (onListeners[name] || []).forEach(fn => fn(payload));
    },

    effect(name, priority, fn, source) {
      assertKind(name, ['effect'], 'effect');
      const arr = effectListeners[name] || (effectListeners[name] = []);
      arr.push({ priority: priority == null ? PRIORITY.ADD : priority, fn, source: source || null });
      sortByPriority(arr);
    },
    /* Runs every registered effect for `name` in priority order against a
       single shared mutable `ctx`, stopping early if a listener sets
       ctx.cancelled. Then invokes any bus.on() read-only observers with
       the final ctx (audio/fx wiring, unchanged from Phase 2). Returns ctx. */
    runEffect(name, ctx) {
      assertKind(name, ['effect'], 'runEffect');
      const list = effectListeners[name] || [];
      for (let i = 0; i < list.length; i++) {
        ctx.source = list[i].source;
        list[i].fn(ctx);
        if (ctx.cancelled) break;
      }
      (onListeners[name] || []).forEach(fn => fn(ctx));
      return ctx;
    },

    query(name, priority, fn, source) {
      assertKind(name, ['query'], 'query');
      const arr = queryListeners[name] || (queryListeners[name] = []);
      arr.push({ priority: priority == null ? PRIORITY.ADD : priority, fn, source: source || null });
      sortByPriority(arr);
    },
    runQuery(name, value, ctx) {
      assertKind(name, ['query'], 'runQuery');
      const list = queryListeners[name] || [];
      return list.reduce((v, q) => q.fn(v, ctx || {}), value);
    }
  };
}
