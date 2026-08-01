/* Stat pipeline — tech §2.2, Phase 3 deliverable 3. Distinct from hooks.js's
   effect/query pipeline: this is specifically for *stat* modifiers (flat
   adds, multipliers, overrides, clamps) layered on top of a Stand's base
   §2.1 numbers, cached and only recomputed when a modifier is added or
   removed. hooks.js's bus.query() is used for per-hit derived numbers
   (getDamage, getMoveFrames, ...); this module is used for the four stats
   that were dead code before this phase (audit item #6): Range, Speed,
   Precision, Developmental Potential.

   base -> flat adds (summed) -> multiplicative (product) -> set/override
   (last registered wins) -> clamp. */

function resolveLayered(base, modifiers) {
  let v = base;
  let lastSet = null;
  modifiers.forEach(m => {
    if (m.kind === 'flat') v += m.value;
    else if (m.kind === 'mult') v *= m.value;
    else if (m.kind === 'set') lastSet = m.value;
  });
  return lastSet == null ? v : lastSet;
}

export function createStatPipeline() {
  const modifiers = new Map(); // statName -> [{kind, value, source}]
  const clamps = new Map(); // statName -> [lo, hi]
  let version = 0;
  const cache = new Map(); // "statName|base" -> { version, value }

  return {
    addModifier(statName, kind, value, source) {
      if (!modifiers.has(statName)) modifiers.set(statName, []);
      modifiers.get(statName).push({ kind, value, source: source || null });
      version++;
    },
    removeModifiersBySource(source) {
      let changed = false;
      modifiers.forEach((arr, key) => {
        const next = arr.filter(m => m.source !== source);
        if (next.length !== arr.length) { modifiers.set(key, next); changed = true; }
      });
      if (changed) version++;
    },
    registerClamp(statName, lo, hi) { clamps.set(statName, [lo, hi]); },
    /* Cached per (statName, base) pair, invalidated whenever a modifier is
       added/removed anywhere (deliverable 3: "recomputed only when
       modifiers change"). */
    resolve(statName, base) {
      const key = statName + '|' + base;
      const hit = cache.get(key);
      if (hit && hit.version === version) return hit.value;
      let value = resolveLayered(base, modifiers.get(statName) || []);
      const clamp = clamps.get(statName);
      if (clamp) value = Math.max(clamp[0], Math.min(clamp[1], value));
      cache.set(key, { version, value });
      return value;
    }
  };
}

/* ---- the four dead stats, wired for real (deliverable 3) --------------- */

/* Range -> tether length (GDD §3.2) and Stand/User feedback rate (GDD
   §3.3). Both computed now; neither is consumed by the sim yet -- the
   tether itself is explicitly out of scope for this phase ("Do not: ...
   build the tether") and is Phase 4's job. */
export function resolveTetherPx(entity, stats) {
  const range = entity.stand ? entity.stand.stats.range : 0;
  return stats.resolve('tetherPx', 26 * range);
}
export function resolveFeedbackPct(entity, stats) {
  const range = entity.stand ? entity.stand.stats.range : 0;
  const base = Math.max(0.10, Math.min(0.70, 0.70 - 0.065 * range));
  return stats.resolve('feedbackPct', base);
}

/* Speed -> a global frame-timing scalar applied to the player's own move
   data (resolvers.js's resolveMoveFrames). Star Platinum's Speed (7) is
   pinned to produce exactly 1.0 here, so wiring this in changes nothing
   about the shipped prototype's feel (acceptance: "no visible gameplay
   change") while being real math a faster/slower future Stand will
   actually feel. */
export function resolveSpeedScalar(entity, stats) {
  const speed = entity.stand ? entity.stand.stats.speed : 7;
  const base = Math.max(0.6, Math.min(1.6, 1 + (speed - 7) * 0.05));
  return stats.resolve('speedScalar', base);
}

/* Precision -> crit chance (spec §2.1) and status-application potency
   (spec §2.1: "status-effect accuracy"). Star Platinum's Precision (6) is
   the pin point for the potency formula (mult 1.0 at Precision 6), same
   no-visible-change reasoning as Speed above. Crit chance has no such pin
   -- it's the same clamp(precision*0.02, 0, 0.35) resolvers.js always used,
   just routed through the pipeline so a future Precision-boosting Arrow
   has one place to add a modifier. */
export function resolveCritChance(entity, stats) {
  const precision = entity.stand ? entity.stand.stats.precision : 0;
  const base = Math.max(0, Math.min(0.35, precision * 0.02));
  return stats.resolve('critChance', base);
}
export function resolveStatusPotency(entity, stats) {
  const precision = entity.stand ? entity.stand.stats.precision : 6;
  const base = Math.max(0.5, Math.min(2, 1 + (precision - 6) * 0.05));
  return stats.resolve('statusPotency', base);
}

/* Developmental Potential -> number of Fragment slots upgradeable in a run
   (spec §2.1 / tech §2.2). Computed and reserved the same way tetherPx is:
   nothing consumes it yet because the Fragment-upgrade system (GDD §6.1
   "each Fragment has 3 levels") doesn't exist until Phase 4+. */
export function resolveUpgradeSlotCount(entity, stats) {
  const dev = entity.stand ? entity.stand.stats.devPotential : 0;
  return Math.round(stats.resolve('upgradeSlots', dev));
}
