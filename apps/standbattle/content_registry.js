/* Content registry + validator — tech §2.9, GDD §6.6/§6.7, Phase 3
   deliverable 5. "With 200+ content entries this is the only thing that
   keeps the pool honest" (tech doc). No real content exists yet (Phase 4+
   adds Fragments/Relics); this file is the load-bearing plumbing those
   phases plug into, exercised this phase by content_check.js's regression
   test and the two throwaway test Fragments (deleted before reporting,
   per the mission).

   Every content file registers raw data (registerFragment/registerRelic/
   registerDonor) instead of calling bus.effect() directly -- that lets
   validateContent() check ALL of it and collect every problem before any
   hook is touched, instead of throwing at the first bad entry the way
   hooks.js's own assertions do at the dispatcher level. loadContent() only
   installs into the dispatcher once validation is clean. */

import { checkTelegraphFairness } from './fairness_check.js';
import { STATUS_DEFS } from './status.js';
import { EFFECT_LIB } from './effect_lib.js';
import { PRIORITY } from './hooks.js';

/* Fragment slot vocabulary — GDD §6.1. */
export const SLOTS = ['light', 'medium', 'heavy', 'special_1', 'special_2', 'rush', 'step', 'clash', 'aura'];

/* Item tag vocabulary — GDD §6.6. Distinct from the move/hitbox tag set in
   moves.js/ai.js (`light`/`heavy`/`melee`/`ranged`/...), which describes
   what an attack *is*; this vocabulary describes what a Fragment/Relic
   *does*, and drives offer weighting/Duo eligibility once those exist. */
export const TAGS = ['time', 'virus', 'heal', 'mobility', 'crowd', 'single-target', 'economy', 'risk', 'projection'];

export function createContentRegistry() {
  return {
    fragments: [],
    relics: [],
    donors: new Set(),
    registerDonor(id) { this.donors.add(id); },
    registerFragment(def) { this.fragments.push(def); },
    registerRelic(def) { this.relics.push(def); }
  };
}

function validateEntry(kind, def, registry, dispatcher, errors) {
  if (!def || !def.id) { errors.push(`${kind}: entry is missing an "id"`); return; }
  (def.effects || []).forEach(eff => {
    if (!eff.hook || !dispatcher.hasHook(eff.hook)) {
      errors.push(`${kind} "${def.id}": unknown hook "${eff.hook}"`);
    } else if (!dispatcher.isEffectHook(eff.hook)) {
      errors.push(`${kind} "${def.id}": "${eff.hook}" is registered as an EFFECT target, but its hook kind is ${dispatcher.hookKind(eff.hook).toUpperCase()}`);
    }
    if (!eff.fn || !EFFECT_LIB[eff.fn]) errors.push(`${kind} "${def.id}": unknown effect function "${eff.fn}"`);
    const statusId = eff.data && eff.data.status;
    if (statusId && !STATUS_DEFS[statusId]) errors.push(`${kind} "${def.id}": unknown status "${statusId}"`);
  });
  (def.tags || []).forEach(t => {
    if (!TAGS.includes(t)) errors.push(`${kind} "${def.id}": unknown tag "${t}"`);
  });
  if (kind === 'fragment') {
    if (def.slot && !SLOTS.includes(def.slot)) errors.push(`fragment "${def.id}": unknown slot "${def.slot}"`);
    if (def.donor && !registry.donors.has(def.donor)) errors.push(`fragment "${def.id}": unknown donor "${def.donor}"`);
  }
  /* spec §6.3 / GDD §6.3: "every one of those has a downside stated at
     pickup... never a hidden clause". A Relic tagged 'risk' is, by this
     vocabulary's own definition, declaring a downside -- so it must carry
     a non-null tradeoff string. */
  if (kind === 'relic' && def.tags && def.tags.includes('risk') && !def.tradeoff) {
    errors.push(`relic "${def.id}": tagged 'risk' but has no "tradeoff" string`);
  }
}

/* Collects every validation problem across the whole registry instead of
   throwing at the first (deliverable 5: "list every problem at once").
   Also re-runs the pattern telegraph fairness floor (spec §5.1 / GDD §6.8)
   as part of the same load-time gate, since a content load is exactly the
   moment new patterns could have been introduced. */
export function validateContent(registry, dispatcher) {
  const errors = [];
  registry.fragments.forEach(f => validateEntry('fragment', f, registry, dispatcher, errors));
  registry.relics.forEach(r => validateEntry('relic', r, registry, dispatcher, errors));

  /* "...after all Menace modifiers are applied" (GDD §6.8) is deferred:
     Menace ranks (tech §5 Phase 5) don't exist yet, so there is no
     modifier to apply. This checks the same floor every pattern must
     clear before any modifier ever gets to shrink it -- a real but
     narrower check, flagged here rather than silently treated as the
     full requirement. */
  const telegraph = checkTelegraphFairness();
  telegraph.results.filter(r => !r.ok).forEach(r => {
    errors.push(`pattern "${r.id}": telegraph ${r.ms.toFixed(0)}ms is below the 260ms fairness floor`);
  });

  return { errors, pass: errors.length === 0 };
}

/* Validates, then (only if clean) installs every Fragment/Relic effect
   into the dispatcher via EFFECT_LIB, attributed to the content's own id
   (hooks.js's ctx.source). Throws a single Error listing every problem —
   "fail loudly at load, listing every problem at once rather than the
   first" — so a content file naming a bad hook never reaches the
   dispatcher's own (single-error) assertion. */
export function loadContent(registry, dispatcher) {
  const { errors } = validateContent(registry, dispatcher);
  if (errors.length) {
    throw new Error(
      `[content] Load-time validation failed — ${errors.length} problem(s):\n` +
      errors.map(e => ' - ' + e).join('\n')
    );
  }
  [...registry.fragments, ...registry.relics].forEach(def => {
    (def.effects || []).forEach(eff => {
      const fn = EFFECT_LIB[eff.fn];
      const priority = eff.priority == null ? PRIORITY.ADD : eff.priority;
      dispatcher.effect(eff.hook, priority, ctx => fn(ctx, eff.data || {}), def.id);
    });
  });
}
