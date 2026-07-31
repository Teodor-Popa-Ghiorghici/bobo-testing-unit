/* Automated fairness assertion -- spec §5.1 / GDD §6.8: "no damage source
   may be unreactable... every attack pattern's telegraph duration >= 260ms
   after all Menace modifiers are applied." There are no Menace modifiers
   yet (that's Phase 5), so this checks the floor every pattern must clear
   before any modifier ever gets to shrink it. Written the same way
   headless_harness.js is -- importable for a future CI/test-registry
   suite (tech §2.9/§4), and runnable standalone:
     node apps/standbattle/fairness_check.js */

import { PATTERNS } from './ai.js';
import { SIM_HZ } from './constants.js';

const MIN_TELEGRAPH_MS = 260;

export function checkTelegraphFairness() {
  const frameMs = 1000 / SIM_HZ;
  const results = Object.values(PATTERNS).map(p => ({
    id: p.id, windupFrames: p.windupFrames, ms: p.windupFrames * frameMs, ok: p.windupFrames * frameMs >= MIN_TELEGRAPH_MS
  }));
  return { pass: results.every(r => r.ok), results };
}

if (typeof process !== 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
  const { pass, results } = checkTelegraphFairness();
  results.forEach(r => console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.id.padEnd(24)} ${r.ms.toFixed(0)}ms (>= ${MIN_TELEGRAPH_MS}ms)`));
  console.log(pass ? '\nAll telegraphs clear the fairness floor.' : '\nFAIRNESS VIOLATION.');
  if (!pass) process.exit(1);
}
