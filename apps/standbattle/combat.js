/* Combat engine — orchestration only. Builds the player/enemy fighters,
   the hook dispatcher and the juice system, wires input, and steps the
   two per-entity systems (combat_player.js, combat_enemy.js) once per
   sim frame. All the actual frame-data/hitbox/defensive-triangle logic
   lives in those two files plus resolvers.js/hitbox.js/defense.js/
   poise.js/resources.js (tech §2.4/§2.5, GDD §3.6-3.9) — this file only
   ties them together, exactly like combat_enemy.js's player/enemy split
   already did in Phase 1.

   Phase 1 (tech §5): the sim steps in whole frames at a fixed 60Hz rate
   (sim_loop.js) instead of being driven directly by rAF's variable ms
   delta, and `combat.entities` holds every fighter generically (fighter.js's
   entity/component store). */

import { STANDS } from './data.js';
import { createEnemyAI } from './ai.js';
import { createPlayerFighter, createEnemyFighter, clampPersistence } from './fighter.js';
import { initPoise } from './poise.js';
import { createDispatcher } from './hooks.js';
import { createStatPipeline } from './stats.js';
import { createContentRegistry, loadContent } from './content_registry.js';
import { installRunBuffs } from './effect_lib.js';
import { stepStatuses } from './status.js';
import { createJuice } from './juice.js';
import { createFixedStepLoop } from './sim_loop.js';
import { updatePlayer, performAction, ACTION_KEYS } from './combat_player.js';
import { stepEnemyMovementAndAI } from './combat_enemy.js';
import { ARENA_MIN, ARENA_MAX, FRAME_MS } from './constants.js';

const INPUT_BUFFER_FRAMES = 9; // 150ms -- matches tech §3.6's "9-frame buffer" exactly

export function createCombat(enemyDef, runBuffs, opts, rng) {
  opts = opts || {};
  const stand = STANDS.star_platinum;

  /* Effect/query/content pipeline (tech §2.1/§2.2/§2.9, Phase 3) is built
     BEFORE any fighter, because the run buffs' getMaxPersistence query
     (deliverable 6) must already be registered when the player's max
     Persistence is resolved a few lines down. contentRegistry is empty
     today -- no Fragment/Relic content exists yet (Phase 4+) -- but
     loadContent() still runs so the validator is exercised on every real
     fight, not just in content_check.js's standalone regression test. */
  const dispatcher = createDispatcher();
  const stats = createStatPipeline();
  installRunBuffs(dispatcher, runBuffs); // ports the 3 flat multiplier buffs off bespoke fighter.js fields
  const contentRegistry = createContentRegistry();
  loadContent(contentRegistry, dispatcher);

  const player = createPlayerFighter(stand, ARENA_MIN + 122);
  player.maxPersistence = dispatcher.runQuery('getMaxPersistence', player.maxPersistence, { entity: player });
  clampPersistence(player);

  const enemy = createEnemyFighter(enemyDef, ARENA_MAX - 72, opts.hpMult, opts.speedMult, opts.tint);
  const isBoss = !!enemyDef.phases;
  const aiRng = rng.stream('ai');
  const combatRng = rng.stream('combat'); // reserved since Phase 0, now used for crit rolls (resolvers.js)
  enemy.ai = createEnemyAI(isBoss ? enemyDef.phases[0].attackPatterns : enemyDef.attackPatterns);
  enemy.brain = enemy.ai; // Brain component (tech §2.3): the AI profile/module list fighter.js reserved
  initPoise(enemy, enemyDef); // GDD §3.9 -- was an Infinity/Infinity stub until this phase

  const juice = createJuice(opts.shakeEnabled);
  const keys = {};
  function push(msg) { combat.log.unshift(msg); combat.log.length = Math.min(4, combat.log.length); }

  /* combat.entities is the arena's real entity store (tech §2.3): "the
     arena holds N entities, not player + enemy". combat.player/.enemy
     stay as named references into it so the render/pose/HUD/audio layers
     -- none of which this phase touches -- keep working unmodified. */
  const combat = {
    player, enemy, entities: [player, enemy], juice, dispatcher, stats, isBoss, keys, combatRng,
    outcome: 'fighting', banner: enemyDef.name || enemyDef.standName, bannerTimer: 84, // 1400ms
    log: [], pushLog: push, debug: false
  };

  /* Edge-triggered: an action fires once per physical key-down, never on
     hold (tech audit item #1 -- dodge used to re-fire every frame it was
     held; Step's charge system is the real fix, this just keeps the input
     itself from spamming). A press made while busy is buffered instead of
     dropped (tech audit item #2 / §2.5 deliverable 3), and fires the
     instant a cancel window opens or the player returns to idle. */
  combat.setKey = (code, down) => {
    const was = keys[code];
    keys[code] = down;
    if (down && !was && ACTION_KEYS.has(code)) {
      if (player.state === 'idle') performAction(combat, code);
      else player.bufferedAction = { kind: code, timer: INPUT_BUFFER_FRAMES };
    }
  };

  /* One whole sim frame. No canvas, no DOM, no rAF -- headless_harness.js
     drives this same function directly through combat.step(). */
  function stepFrame() {
    if (combat.outcome !== 'fighting') return;
    if (combat.bannerTimer > 0) combat.bannerTimer -= 1;
    if (juice.update(FRAME_MS)) return; // hit-stop freezes the sim; see the Phase 1 report
    updatePlayer(combat);
    stepEnemyMovementAndAI(combat, enemyDef, aiRng);
    combat.entities.forEach(stepStatuses); // GDD §3.10 / tech §2.6 -- statuses are data, the engine only ticks them
    if (player.hp <= 0 && combat.outcome === 'fighting') combat.outcome = 'lose';
  }

  const loop = createFixedStepLoop(stepFrame);
  /* Real usage (index.js's rAF loop): feed real elapsed ms, the fixed
     accumulator turns it into zero or more whole-frame steps. */
  combat.update = dtMs => { loop.advance(dtMs); };
  /* Headless/testing usage: advance exactly one frame, no wall clock. */
  combat.step = () => loop.stepOnce();

  return combat;
}
