#!/usr/bin/env node
/* The Jäger journey, held to its numbers (pure Node, no browser).
   Drinking as fast as the app allows must take a couple of minutes, not seconds, and must
   end in a blackout before the first bottle (seventeen measures) is gone; a leisurely
   pace of one measure every twenty seconds must still get there inside the bottle; a steady
   pace of one measure a minute must never black out; and it must not be possible to hurry
   the thing by clicking, which is the app's job (apps/bottle: nothing is queued, and a
   breather follows every measure) and is simulated here by the cycle. */
import { BAC, newBlood, swallow, step, over, felt, levelOf, stageOf, wake, proofOf, burnOf, hitName } from '../kernel/drunk_bac.js';
import { styleOf, styleIndex, schedule } from '../apps/bottle/styles.js';

let bad = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };

/* seconds from the first measure to the floor at one measure every `cycle` seconds, or Infinity */
function toFloor(cycle, cap = 7200) {
  const b = newBlood(); const dt = 0.1; let t = 0, next = 0, n = 0; const seen = new Set();
  while (t < cap) {
    if (t >= next) { swallow(b); n++; next += cycle; }
    step(b, dt); t += dt; seen.add(stageOf(b));
    if (over(b)) return { t, n, stages: seen.size };
  }
  return { t: Infinity, n, stages: seen.size, felt: felt(b) };
}
const BOTTLE = Math.floor(700 / 40);               /* measures in a bottle: JAG_FULL / JAG_SHOT in apps/bottle/physics.js */
const fast = toFloor(9.6);                    /* pour 3.5 s + drink 3.5 s + the breather 2.6 s, measured in the app */
ok(fast.t > 90 && fast.t < 160, 'one every 9.6 s (as fast as the app allows): ' + fast.t.toFixed(0) + ' s, ' + fast.n + ' measures');
ok(fast.n >= 10 && fast.n <= BOTTLE - 2, 'blackout comes with a few measures to spare in one bottle (' + fast.n + ' of ' + BOTTLE + ')');
ok(fast.stages >= 7, 'every stage is passed through on the way (' + fast.stages + ')');
const easy = toFloor(20);
ok(easy.n <= BOTTLE, 'even one every 20 s is out inside the bottle: ' + easy.n + ' of ' + BOTTLE + ' measures, ' + easy.t.toFixed(0) + ' s');
ok(toFloor(60).t === Infinity, 'one a minute never gets there (settles at ' + toFloor(60).felt.toFixed(1) + ')');
ok(toFloor(45).t > 600, 'one every 45 s is slow enough to take ten minutes or more: ' + toFloor(45).t.toFixed(0) + ' s');
/* ...and the same with the hands: the drunker, the slower each measure goes (apps/bottle/styles.js: fifteen hands, none ever quicker than the sober one), so the journey can only be
   longer than the cycle above, never shorter, and must still end inside one bottle */
{
  const cycleOf = lvl => { const st = styleOf(lvl);
    const pour = 3.5 + (schedule(st, 0.7, 0.5).T - 0.7) + (schedule(Object.assign({}, st, { thoughts: [], lead: 0, tail: 0 }), 0.6, 1).T - 0.6) + 0.3 * styleIndex(lvl) / 14;
    return pour + schedule(st, 3.5, 1).T + 2.6; };
  const bb = newBlood(); let t = 0, next = 0, n = 0, hands = new Set(), longest = 0;
  while (t < 3600 && !over(bb)) {
    if (t >= next) { const c = cycleOf(levelOf(bb)); hands.add(styleIndex(levelOf(bb))); longest = Math.max(longest, c); swallow(bb); n++; next = t + c; }
    step(bb, 0.1); t += 0.1;
  }
  ok(over(bb) && n >= 10 && n <= BOTTLE - 2, 'with the hands slowing as it goes, non-stop drinking is still out inside the bottle: ' + n + ' of ' + BOTTLE + ' measures, ' + t.toFixed(0) + ' s');
  ok(t >= fast.t - 1 && t < 220, 'and it takes longer than the sober cycle did, never less (' + t.toFixed(0) + ' s against ' + fast.t.toFixed(0) + '), under four minutes');
  ok(hands.size >= 10, 'on the way it goes through ' + hands.size + ' of the fifteen hands, the slowest cycle ' + longest.toFixed(1) + ' s');
}
/* THE PERCENTAGE IS FELT: a sip of 1 % and a sip of 99 % (the homemade potion's range) are not the same drink. How much (abv / 35 measures), how soon it arrives, and how hard it hits going down. */
{
  const sip = abv => { const b = newBlood(); swallow(b, abv / 35); return b; };
  /* seconds until half of a sip has left the stomach, and the most that is ever felt of it */
  const half = abv => { const b = sip(abv); let t = 0, pk = 0, w = null; for (; t < 300; t += 0.1) { step(b, 0.1); pk = Math.max(pk, felt(b)); if (w === null && b.gut <= abv / 35 / 2) w = t; } return { t: w === null ? Infinity : w, pk }; };
  const abvs = [1, 5, 14, 35, 50, 68, 99], H = abvs.map(half);
  ok(H.every((h, i) => i === 0 || h.pk > H[i - 1].pk), 'more per cent is more drunk: the peak of one sip climbs from ' + H[0].pk.toFixed(2) + ' (1 %) to ' + H[6].pk.toFixed(2) + ' (99 %)');
  ok(H.slice(1).every((h, i) => h.t <= H[i].t + 0.3), 'and it arrives sooner the stronger it is: to half out of the stomach in ' + H.map(h => h.t.toFixed(0)).join(', ') + ' s for ' + abvs.join(', ') + ' %');
  const j = half(35);
  ok(Math.abs(proofOf(1).tau - BAC.ABSORB) < 1e-9 && Math.abs(proofOf(1).feel - 0.5) < 1e-9, 'the Jägermeister is exactly what it was (30 s, half felt on the way)');
  ok(proofOf(99 / 35).tau < proofOf(1).tau * 0.65 && proofOf(1 / 35).tau > proofOf(1).tau * 1.4, 'ninety-nine per cent arrives in under two thirds of the time, one per cent in over one and a half');
  const f10 = abv => { const b = sip(abv); for (let i = 0; i < 100; i++) step(b, 0.1); return felt(b); };
  ok(f10(99) / f10(35) > 99 / 35 * 1.05, 'ten seconds after a sip, 99 % is felt more than its share (' + (f10(99) / f10(35)).toFixed(2) + ' times the Jägermeister against ' + (99 / 35).toFixed(2) + ' times the drink)');
  ok(H[0].pk < 0.06 && !over(sip(1)), 'a sip of 1 % is nothing: ' + H[0].pk.toFixed(3));
  const run = abv => { const b = newBlood(); let t = 0, n = 0; while (t < 1200) { if (t % 10 < 0.05) { swallow(b, abv / 35); n++; } step(b, 0.1); t += 0.1; if (over(b)) return { n, t }; } return { n, t: Infinity }; };
  const r99 = run(99), r68 = run(68), r35 = run(35), r14 = run(14);
  ok(r99.t < r68.t && r68.t < r35.t && r35.t < r14.t, 'a sip every ten seconds: ninety-nine per cent is out in ' + r99.n + ' (' + r99.t.toFixed(0) + ' s), 68 in ' + r68.n + ', 35 in ' + r35.n + ', 14 in ' + (r14.t === Infinity ? 'never within twenty minutes' : r14.n));
  ok(r99.n <= 5 && r99.n >= 3, 'raw spirit puts you down in a handful of sips (' + r99.n + ')');
  /* the throat */
  const B = abvs.map(burnOf);
  ok(burnOf(0) === 0 && B.every((x, i) => i === 0 || x >= B[i - 1]) && burnOf(99) === 1, 'it burns more the stronger it is, nothing for nothing and all of it at ninety-nine: ' + B.map(x => x.toFixed(2)).join(' '));
  ok(burnOf(35) > 0.3 && burnOf(35) < 0.5 && burnOf(14) < 0.2, 'the Jägermeister is a warm bite (' + burnOf(35).toFixed(2) + '), mead is gentle (' + burnOf(14).toFixed(2) + ')');
  ok(hitName(0) !== hitName(10) && hitName(40) !== hitName(70) && hitName(99) !== hitName(70) && [1, 12, 35, 60, 99].map(hitName).every((n, i, a) => a.indexOf(n) === i), 'every kind of strength has its own word on the line under the glass: ' + [1, 12, 35, 60, 99].map(hitName).join(', '));
}
const b = newBlood(); for (let i = 0; i < 8; i++) swallow(b); for (let i = 0; i < 6000; i++) step(b, 0.1);
ok(felt(b) < 0.5, 'eight measures and ten minutes of rest: all but gone (' + felt(b).toFixed(2) + ')');
const w = newBlood(); wake(w);
ok(levelOf(w) > 0.3 && levelOf(w) < 0.7 && !over(w), 'waking from a blackout is rough, not clean (level ' + levelOf(w).toFixed(2) + ')');
const one = newBlood(); swallow(one);
ok(levelOf(one) < 0.12, 'a single measure barely shows (' + levelOf(one).toFixed(2) + ')');
console.log(bad ? bad + ' FAILED' : 'all good');
process.exit(bad ? 1 : 0);
