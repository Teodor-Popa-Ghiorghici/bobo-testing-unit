/* node apps/elephant/slide_check.js: the elephant's slide (slide_plan.js, slide_sound.js, pure Node).
   THE UNLOCK  a hundred DIFFERENT quotes, counted once each, and kept
   THE MOTION  a concrete block, not a glider: jerks with stillness between, irregular, closer together at speed; out and back to where he began; slow
   THE SOUND   loud, layered, in step with the jerks: the scrape flares at each one, a thump when it lets go and a heavier one when it stops */
import { runOf, SLIDE_AT, OUT_SECS, REST_SECS, TOTAL, DIST, envelope, hear, heardSet, slideOpen } from './slide_plan.js';
import { soundPlan, ceiling, levelAt } from './slide_sound.js';
let bad = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };

console.log('-- the unlock --');
{
  const store = {}; globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  ok(SLIDE_AT === 100 && !slideOpen() && heardSet().length === 0, 'he cannot slide before he has said a hundred things');
  let opened = 0;
  for (let i = 0; i < 99; i++) { const r = hear(i); if (r.opened) opened++; hear(i); }
  ok(heardSet().length === 99 && !slideOpen() && opened === 0, 'ninety-nine different quotes, each said twice: ninety-nine, not open');
  const r = hear(150);
  ok(r.opened && r.n === 100 && slideOpen(), 'the hundredth different one opens it, and says so once');
  ok(!hear(151).opened && !hear(150).fresh && slideOpen(), 'after that it stays open and never announces itself again');
  ok(heardSet().every(n => Number.isInteger(n)), 'what is kept is a list of numbers');
}

console.log('\n-- the motion --');
for (const dir of [1, -1]) for (const seed of [1, 7, 4242]) {
  const run = runOf(seed, dir), tag = `seed ${seed}, ${dir > 0 ? 'right' : 'left'}: `;
  const a = run.slips.filter(s => s.stroke === 0), b = run.slips.filter(s => s.stroke === 1);
  ok(Math.abs(run.x(TOTAL + 1)) < 1e-6 && Math.abs(run.x(0)) < 1e-9, tag + 'he is where he began when it is over');
  ok(Math.abs(run.x(OUT_SECS + REST_SECS * 0.5) - dir * DIST) < 1e-6, tag + 'he goes the whole way out (' + DIST + ' px) and rests there');
  let mono = true, last = 0; for (let t = 0; t <= OUT_SECS; t += 0.01) { const x = dir * run.x(t); if (x < last - 1e-9) mono = false; last = x; }
  ok(mono, tag + 'out, he only ever goes out');
  ok(a.length >= 12 && a.length <= 60 && b.length >= 12 && b.length <= 60, tag + `${a.length} jerks out and ${b.length} back`);
  ok(Math.max(...run.slips.map(s => Math.abs(s.d))) < 22, tag + 'no jerk is more than a few pixels, the breakaway the biggest');
  const gaps = a.slice(1).map((s, i) => s.at - a[i].at), mean = gaps.reduce((x, y) => x + y, 0) / gaps.length;
  const sd = Math.sqrt(gaps.reduce((x, y) => x + (y - mean) * (y - mean), 0) / gaps.length);
  ok(sd / mean > 0.25 && gaps.every((g, i) => i === 0 || Math.abs(g - gaps[i - 1]) > 0.0002), tag + `the jerks are never evenly spaced (variation ${(sd / mean).toFixed(2)})`);
  const mid = gaps.filter((_, i) => a[i].at > OUT_SECS * 0.35 && a[i].at < OUT_SECS * 0.65), edge = gaps.filter((_, i) => a[i].at < OUT_SECS * 0.2 || a[i].at > OUT_SECS * 0.85);
  const m = x => x.reduce((p, q) => p + q, 0) / x.length;
  ok(mid.length && edge.length && m(mid) < m(edge), tag + 'they come quicker at speed and slower as it begins and ends');
  ok(a[0].first && a[0].at > OUT_SECS * 0.08 && b[0].first && b[0].at - (OUT_SECS + REST_SECS) > OUT_SECS * 0.08 && a[0].hard > 0.9, tag + 'it holds, loaded, and then gives with the biggest jerk of all');
  ok(DIST / OUT_SECS < 40, tag + `and it is slow: ${(DIST / OUT_SECS).toFixed(0)} px a second on average`);
  ok(run.speed(0) === 0 && run.speed(OUT_SECS + REST_SECS / 2) === 0 && run.speed(TOTAL) === 0 && run.speed(OUT_SECS * 0.5) > 0.9, tag + 'standing still at the ends and in the rest, quickest in the middle');
  ok(run.tremble(a[0].at * 0.9) > 0.5 && run.tremble(OUT_SECS * 0.5) === 0, tag + 'he quivers before it gives');
}
ok(envelope(0) === 0 && envelope(1) === 0 && envelope(0.55) > 0.9, 'the speed curve starts and ends at nothing');
ok(JSON.stringify(runOf(9, 1).slips) === JSON.stringify(runOf(9, 1).slips) && JSON.stringify(runOf(9, 1).slips) !== JSON.stringify(runOf(10, 1).slips), 'a seed gives the same run every time and another seed another run');
ok(Math.abs(TOTAL - (2 * 3.8 + 0.9)) < 1e-9, `${TOTAL.toFixed(1)} seconds in all`);

console.log('\n-- the sound --');
{
  const run = runOf(5, 1), plan = soundPlan(run);
  const curves = ['rumble', 'thrum', 'groan', 'bed', 'grit'];
  ok(curves.every(k => plan[k].length > 50 && plan[k].every(p => p.every(Number.isFinite) && p[1] >= 0)), 'five layers, all numbers, none below silence');
  ok(curves.every(k => plan[k].every((p, i) => i === 0 || p[0] > plan[k][i - 1][0])), 'each layer\'s points go forward in time');
  const peak = Math.max(...Array.from({ length: Math.ceil(TOTAL / 0.01) }, (_, i) => levelAt(plan, i * 0.01)));
  ok(peak >= 0.9, `it is loud: ${peak.toFixed(2)} at its loudest against 0.02 to 0.06 for every other effect`);
  ok(ceiling(plan) < 6, `and the worst case of every layer at once is ${ceiling(plan).toFixed(2)} (noise through a filter is far quieter than its gain, and the compressor holds the rest)`);
  ok(levelAt(plan, OUT_SECS + REST_SECS - 0.05) < 0.15, 'it is nearly silent in the rest between strokes');
  ok(levelAt(plan, run.slips[0].at - 0.02) > 0.05 && levelAt(plan, run.slips[0].at - 0.02) < levelAt(plan, run.slips[0].at + 0.08), 'a groan builds before it lets go, and it is louder after');
  const f = plan.bed.map(p => p[2]);
  ok(Math.min(...f) < 400 && Math.max(...f) > 1200, `the scrape's centre climbs with the speed (${Math.round(Math.min(...f))} to ${Math.round(Math.max(...f))} Hz)`);
  let flares = 0, tried = 0;
  run.slips.forEach(s => { if (s.stroke !== 0 || s.v < 0.3) return; tried++; const at = c => { let v = 0; for (const p of c) { if (p[0] > s.at + 0.012) break; v = p[1]; } return v; }; const before = (c => { let v = 0; for (const p of c) { if (p[0] >= s.at - 0.003) break; v = p[1]; } return v; })(plan.grit); if (at(plan.grit) > before * 1.5) flares++; });
  ok(tried > 5 && flares === tried, `the gravel flares at every jerk (${flares} of ${tried})`);
  const th = plan.thumps;
  ok(th.length >= 4 && th[0].gain > 0.9 && th[0].at === run.slips[0].at, 'a heavy thump when it lets go');
  const ends = th.filter(t => Math.abs(t.at - OUT_SECS) < 1e-9 || Math.abs(t.at - TOTAL) < 1e-9);
  ok(ends.length === 2 && ends.every(t => t.gain >= 0.85 && t.f1 < 35 && t.dur >= 0.5), 'and a heavier, lower one when he stops, out and back');
  ok(th.every((t, i) => i === 0 || t.at >= th[i - 1].at), 'the thumps are in order');
}
console.log(bad ? bad + ' FAILED' : 'all good');
process.exit(bad ? 1 : 0);
