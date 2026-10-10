/* node apps/bottle/trophy_check.js — the Bottle's journey trophies, held to the arithmetic of kernel/drunk_bac.js: a glow is five minutes of WARM and TIPSY after three measures, and is
   reachable at a measure a minute; a limit is ABOUT TO GO and then the long drain to SOBER with the lights never going out, and is reachable (and is not told if the lights did go out);
   a bottle of the cordial is seventeen measures; nobody gets a trophy for being quick. */
import { newBlood, swallow, step, over, stageOf, wake } from '../../kernel/drunk_bac.js';
import { createStageWatch, GLOW_SECS } from './trophy_calls.js';
import { TROPHIES, BOTTLE_MEASURES, SCENES_TOTAL } from './trophies.js';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL - ' + m); } else console.log('PASS - ' + m); };

/* a drinker who has one measure every `gap` seconds, `n` times (0 for none), then waits `rest` seconds; `stopAt` stops drinking when the stage is reached */
function night({ gap, n, rest, stopAt, hold }) {
  const told = [], w = createStageWatch((name) => told.push(name)), b = newBlood();
  let t = 0, out = false, drank = 0, next = 0;
  const dt = 0.25;
  for (; t < gap * n + rest + 4000 && t < 20000; t += dt) {
    if (!out && drank < n && t >= next && (!stopAt || stageOf(b) !== stopAt) && (!hold || ['SOBER', 'WARM'].indexOf(stageOf(b)) >= 0)) { swallow(b, 1); w.measure(); drank++; next = t + gap; }
    step(b, dt);
    if (over(b) && !out) { out = true; w.out(); wake(b); out = false; }
    w.step(dt, stageOf(b), false);
    if (drank >= n && t > gap * n + rest) break;
  }
  return { told, b, drank, t };
}

/* a glow is held by reading the meter: a measure whenever it has drained to SOBER or WARM, never past TIPSY. A measure a minute does not do it (it is SOBER the whole time: the
   arithmetic's steady state), and neither does a measure every fifty seconds (it climbs to LOOSE). */
{ const r = night({ gap: 12, n: 40, rest: 60, hold: true }); ok(r.told.indexOf('glow') >= 0, 'a measure whenever it has worn off to WARM, for five minutes, is a mild glow (told: ' + r.told.join(',') + ')'); ok(r.told.indexOf('limit') < 0, '... and nobody got near the limit'); }
{ const r = night({ gap: 60, n: 20, rest: 60 }); ok(r.told.indexOf('glow') < 0, 'a measure a minute is only ever SOBER, which is not a glow'); }
/* quick drinking is not a glow: it goes straight past */
{ const r = night({ gap: 10, n: 9, rest: 30 }); ok(r.told.indexOf('glow') < 0, 'nine measures ten seconds apart is not a glow'); }
/* the limit: drink until ABOUT TO GO, then stop and wait for SOBER: told once, and never if the lights went out in between */
{ const r = night({ gap: 20, n: 40, rest: 4000, stopAt: 'ABOUT TO GO' }); ok(r.told.filter(x => x === 'limit').length === 1, 'drinking up to ABOUT TO GO and then stopping is KNOW YOUR LIMIT, told once (' + r.told.join(',') + ')'); }
{ const r = night({ gap: 8, n: 30, rest: 4000 }); ok(r.told.indexOf('limit') < 0, 'drinking on past it until the lights go out is not'); }
/* the cordial: the bottle is seventeen measures of 40 ml in 700 */
ok(BOTTLE_MEASURES === Math.floor(700 / 40), 'a bottle is ' + Math.floor(700 / 40) + ' measures, and the trophy asks for that many');
ok(GLOW_SECS === 300, 'a glow is five minutes');
ok(TROPHIES.length === 11 && TROPHIES.every(t => t.id.indexOf('bt_') === 0) && SCENES_TOTAL === 38, 'eleven Bottle trophies, thirty-eight dreams');
/* LORE ACCURATE: one trophy, for the first sip that knocks somebody out; it is told by the event `lore` and by nothing else */
{ const l = TROPHIES.find(t => t.id === 'bt_lore'); ok(l && l.on === 'lore' && /LORE ACCURATE/.test(l.desc || l.description || ''), 'the one sip with LORE ACCURATE on is its own trophy, told by the event `lore`'); }
console.log(fails ? fails + ' failed' : 'All checks pass.');
process.exit(fails ? 1 : 0);
