/* Content registry regression check — tech §2.9, Phase 3 deliverable 5:
   "build the validator that will police all future content." Written the
   same way fairness_check.js is: importable for a future CI/test-registry
   suite, and runnable standalone:
     node apps/standbattle/content_check.js

   Exercises the two acceptance behaviours the mission calls out explicitly:
     1. A content file naming a hook that does not exist fails validation
        with a clear message, and every other problem in the same file is
        reported too (not just the first).
     2. A content file with no problems validates clean. */

import { createDispatcher } from './hooks.js';
import { createContentRegistry, validateContent } from './content_registry.js';

function buildBadRegistry() {
  const registry = createContentRegistry();
  registry.registerFragment({
    id: 'bad_unknown_hook', slot: 'light',
    effects: [{ hook: 'onNotARealHook', fn: 'grantResource', data: { resource: 'persistence', amount: 10 } }]
  });
  registry.registerFragment({
    id: 'bad_unknown_fn', slot: 'medium',
    effects: [{ hook: 'onKill', fn: 'notARealFunction', data: {} }]
  });
  registry.registerFragment({
    id: 'bad_unknown_slot_and_tag', slot: 'not_a_real_slot', tags: ['not_a_real_tag'],
    effects: [{ hook: 'onKill', fn: 'grantResource', data: { resource: 'persistence', amount: 5 } }]
  });
  registry.registerFragment({
    id: 'bad_event_not_effect',
    effects: [{ hook: 'onHit', fn: 'grantResource', data: {} }] // onHit is an EVENT hook, not an EFFECT hook
  });
  registry.registerRelic({
    id: 'bad_risk_without_tradeoff', tags: ['risk'], tradeoff: null,
    effects: [{ hook: 'onKill', fn: 'grantResource', data: { resource: 'momentum', amount: 5 } }]
  });
  return registry;
}

function buildCleanRegistry() {
  const registry = createContentRegistry();
  registry.registerFragment({
    id: 'clean_example', slot: 'light', tags: ['economy'],
    effects: [{ hook: 'onKill', fn: 'grantResource', data: { resource: 'persistence', amount: 5 } }]
  });
  return registry;
}

export function runContentChecks() {
  const dispatcher = createDispatcher();

  const bad = validateContent(buildBadRegistry(), dispatcher);
  const expectedProblems = 5; // one per bad fragment/relic above
  const badOk = !bad.pass && bad.errors.length >= expectedProblems;

  const clean = validateContent(buildCleanRegistry(), dispatcher);
  const cleanOk = clean.pass && clean.errors.length === 0;

  return { badOk, badErrors: bad.errors, cleanOk };
}

if (typeof process !== 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
  const { badOk, badErrors, cleanOk } = runContentChecks();
  console.log('Deliberately-broken content file — every problem listed at once:');
  badErrors.forEach(e => console.log('  - ' + e));
  console.log(badOk ? 'OK   bad content rejected with all problems listed' : 'FAIL bad content check');
  console.log(cleanOk ? 'OK   clean content validates with zero errors' : 'FAIL clean content check');
  const pass = badOk && cleanOk;
  console.log(pass ? '\nContent validator behaves as specified.' : '\nCONTENT VALIDATOR REGRESSION.');
  if (!pass) process.exit(1);
}
