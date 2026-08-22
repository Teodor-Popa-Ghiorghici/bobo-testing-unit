#!/usr/bin/env node
/* Bekkedal FURNISHING — functional smoke test, driven the same way
 * scripts/smoke.mjs drives everything else: through the real frame loop and
 * the __bekDebug hooks, never by writing S directly from here. Not one of
 * the checks named in CLAUDE.md's own list — a one-off exercised for this
 * change, kept in scripts/ alongside the other harness-driven checks in
 * case it is useful again. */
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
const CH = '/opt/pw-browsers/chromium';
const URL = process.env.BEK_URL || 'http://localhost:3000/';
const br = await chromium.launch({ executablePath: existsSync(CH) ? CH : undefined });
const pg = await br.newPage({ viewport: { width: 1000, height: 700 } });
const errors = [];
pg.on('pageerror', e => errors.push(String(e)));

await pg.addInitScript(() => { window.AudioContext = window.webkitAudioContext = function () { throw new Error('no audio'); }; });
await pg.goto(URL, { waitUntil: 'domcontentloaded' });
await pg.evaluate(() => { if (window.powerOn) window.powerOn(); });
await pg.waitForSelector('#bootcursor', { timeout: 30000 });
await pg.evaluate(() => document.dispatchEvent(new MouseEvent('click', { bubbles: true })));
await pg.waitForSelector('#shell', { state: 'visible', timeout: 15000 });
await pg.evaluate(() => import('/kernel/wm.js').then(m => m.openWindow('bekkedal')));
await pg.waitForSelector('canvas.bekcv', { state: 'visible', timeout: 15000 });
await pg.waitForFunction(() => !!window.__bekDebug, { timeout: 15000 });

let fails = 0;
const ok = (cond, label, detail) => { if (cond) { console.log('OK   ' + label + (detail ? '   ' + detail : '')); return; } fails++; console.log('FAIL ' + label + (detail ? '   ' + detail : '')); };
const dbg = (sel, arg) => pg.evaluate(sel, arg);

/* ---- furnish the farmhouse: chairs, a table, a rug, a bed, a shelf, a
   lamp, a wall hanging, a dresser — every indoor category the task lists,
   placed by hand through the real startPlace()/canPlace()/confirmPlace(). */
const spots = [
  ['stol', 3, 3], ['bord', 4, 3], ['matte', 5, 5], ['seng', 6, 3],
  ['hylle', 3, 5], ['lampe', 7, 3], ['veggbilde', 8, 3], ['kommode', 3, 7]
];
await dbg(() => window.__bekDebug.teleport('farmhouse', 12, 8));
const lightsBefore = await dbg(() => window.__bekDebug.lights());
let r = await dbg(([id, x, y]) => window.__bekDebug.furnish(id, 'farmhouse', x, y), spots[0]);
ok(!!r.placed['farmhouse:3,3'], 'chair placed in the farmhouse', JSON.stringify(r.placed['farmhouse:3,3']));
for (const [id, x, y] of spots.slice(1)) {
  r = await dbg(([id, x, y]) => window.__bekDebug.furnish(id, null, x, y), [id, x, y]);
  ok(!!r.placed['farmhouse:' + x + ',' + y], id + ' placed', JSON.stringify(r.placed['farmhouse:' + x + ',' + y]));
}
/* the lamp actually lights the room — the count strictly grows over the
   same room's own baseline, not just "some sources exist" */
const raw = await dbg(() => window.__bekDebug.lights());
console.log('lightSources() before: ' + lightsBefore.length + ', after furnishing: ' + raw.length);
ok(raw.length > lightsBefore.length, 'lightSources() grows once the lamp is placed',
   lightsBefore.length + ' -> ' + raw.length);

/* pick one back up and move it */
const before = await dbg(() => window.__bekDebug.placedAt('farmhouse', 3, 3));
ok(!!before, 'the chair is really there before pick-up', JSON.stringify(before));
const pu = await dbg(() => window.__bekDebug.pickup(3, 3));
ok(!pu.placed['farmhouse:3,3'], 'picking up removes the old tile', JSON.stringify(pu.note));
const moved = await dbg(() => window.__bekDebug.furnish('stol', null, 10, 3));
ok(moved.placed['farmhouse:10,3'], 'and it can be set down somewhere else', JSON.stringify(moved.placed['farmhouse:10,3']));

/* ---- outdoors: fence run + adjacency autotile, gate, path, bench, planter, scarecrow, sign */
const farmSpots = [['gjerde', 2, 2], ['gjerde', 3, 2], ['gjerde', 4, 2], ['grind', 5, 2],
                    ['sti', 2, 4], ['sti', 3, 4], ['blomsterkasse', 2, 6], ['benk', 3, 6],
                    ['fugleskremsel', 2, 8], ['skilt', 3, 8]];
r = await dbg(([id, x, y]) => window.__bekDebug.furnish(id, 'farm', x, y), farmSpots[0]);
ok(!!r.placed['farm:2,2'], 'fence run start placed outdoors on the farm', JSON.stringify(r.placed['farm:2,2']));
for (const [id, x, y] of farmSpots.slice(1)) {
  r = await dbg(([id, x, y]) => window.__bekDebug.furnish(id, null, x, y), [id, x, y]);
  ok(!!r.placed['farm:' + x + ',' + y], id + ' placed outdoors', JSON.stringify(r.placed['farm:' + x + ',' + y]));
}

/* a trapping placement is refused: teleport to a quiet patch of open farm
   ground, wall the player's own square in on three sides, then try the
   fourth — which would leave nothing reachable from that tile at all, so it
   must be the one placement this whole test refuses. */
await dbg(() => window.__bekDebug.teleport('farm', 20, 10));
const trap = await dbg(() => {
  const D = window.__bekDebug;
  const res = [];
  res.push(D.furnish('gjerde', null, 21, 10));   /* east  */
  res.push(D.furnish('gjerde', null, 19, 10));   /* west  */
  res.push(D.furnish('gjerde', null, 20, 9));    /* north */
  res.push(D.furnish('gjerde', null, 20, 11));   /* south — the trap */
  return res;
});
const placedFlags = [!!trap[0].placed['farm:21,10'], !!trap[1].placed['farm:19,10'], !!trap[2].placed['farm:20,9'], !!trap[3].placed['farm:20,11']];
console.log('trap sequence placed: ' + placedFlags.join(','));
ok(placedFlags.slice(0, 3).every(Boolean), 'three sides of a fence go down fine', placedFlags.slice(0, 3).join(','));
ok(!placedFlags[3], 'the fourth side, which would seal the player in, is refused', JSON.stringify(trap[3].note));

/* a placed fence is a real barrier during ordinary movement, not only a
   refusal at placement time — solid() has to agree with placement.js's own
   PLACE_BLOCKS or a fence would be paintable ground you can still walk
   through. Every other placed kind must stay walkable, same as authored
   decor (BEK_DECOR's own "never changes walkability" rule). */
const walkGjerde = await dbg(() => window.__bekDebug.walkable('farm', 2, 2));
ok(!walkGjerde, 'a placed fence tile is solid to move()', JSON.stringify(walkGjerde));
const walkFurniture = await dbg(() => window.__bekDebug.walkable('farmhouse', 4, 3));
ok(!!walkFurniture, 'a placed table stays walkable, same as authored decor', JSON.stringify(walkFurniture));

console.log('\n' + (fails ? fails + ' FAILED' : 'All FURNISHING functional checks pass.') + (errors.length ? '\nPAGE ERRORS: ' + errors.join(' | ') : ''));
await br.close();
process.exit(fails || errors.length ? 1 : 0);
