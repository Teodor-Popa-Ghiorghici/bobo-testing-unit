#!/usr/bin/env node
/* Bekkedal — does a save written by the PRE-change build still load?
 *
 * Reading the migration code and concluding "yes" is not a test. This plays
 * the old build until its own autosave watchdog writes a genuine blob, then
 * hands that exact blob to the new build and asserts three things: it comes
 * up without throwing, every top-level field survives the round trip, and
 * the day carries over rather than resetting.
 *
 * It also asserts the reverse of the same rule — that nothing transient
 * (a swing, a particle list, the camera shake) has leaked *into* the save.
 *
 * Two servers, because there are two builds:
 *
 *   git worktree add /tmp/bekold main
 *   (cd /tmp/bekold && python3 -m http.server 3001) &
 *   python3 -m http.server 3000 &
 *   node scripts/bekkedal_savetest.mjs
 *
 * Override either with BEK_OLD_URL / BEK_NEW_URL.
 */
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
const CH = '/opt/pw-browsers/chromium';
const KEY = 'templeos.bekkedal.v2';
const OLD = process.env.BEK_OLD_URL || 'http://localhost:3001/';
const NEW = process.env.BEK_NEW_URL || 'http://localhost:3000/';
const br = await chromium.launch({ executablePath: existsSync(CH) ? CH : undefined });

async function boot(pg, url) {
  await pg.addInitScript(() => { window.AudioContext = window.webkitAudioContext = function () { throw new Error('no audio'); }; });
  await pg.goto(url, { waitUntil: 'domcontentloaded' });
  await pg.evaluate(() => { if (window.powerOn) window.powerOn(); });
  await pg.waitForSelector('#bootcursor', { timeout: 30000 });
  await pg.evaluate(() => document.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await pg.waitForSelector('#shell', { state: 'visible', timeout: 15000 });
  await pg.evaluate(() => import('/kernel/wm.js').then(m => m.openWindow('bekkedal')));
  await pg.waitForSelector('canvas.bekcv', { state: 'visible', timeout: 15000 });
}
const press = async (pg, k) => { await pg.locator('canvas.bekcv').press(k); await pg.waitForTimeout(90); };

/* ---- 1. the old build, played ------------------------------------------- */
const a = await br.newPage({ viewport: { width: 1400, height: 900 } });
let oldErr = 0; a.on('pageerror', e => { oldErr++; console.error('  OLD PAGE ERROR:', e.message); });
await a.evaluate(() => {}).catch(() => {});
await boot(a, OLD);
/* walk about, till a plot, sow it, open the bag, change tool — real state */
for (const k of ['d','d','s','s','a','w',' ','Tab',' ','f','i','i','q','q','Tab','Tab',' ']) await press(a, k);
await a.waitForTimeout(7000);                       /* let autoSave fire     */
const blob = await a.evaluate(k => localStorage.getItem(k), KEY);
if (!blob) { console.error('FAIL - the old build wrote no save'); process.exit(1); }
const old = JSON.parse(blob);
console.log('old build wrote a save: ver ' + old.ver + ', day ' + old.day + ', min ' + Math.floor(old.min) +
            ', map ' + old.map + ', ' + Object.keys(old).length + ' top-level fields');
await a.close();

/* ---- 2. the new build, loading it --------------------------------------- */
const b = await br.newPage({ viewport: { width: 1400, height: 900 } });
let newErr = 0; b.on('pageerror', e => { newErr++; console.error('  NEW PAGE ERROR:', e.message); });
await b.addInitScript(() => { window.AudioContext = window.webkitAudioContext = function () { throw new Error('no audio'); }; });
await b.goto(NEW, { waitUntil: 'domcontentloaded' });
await b.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, blob]);
await boot(b, NEW);
await b.waitForTimeout(600);
/* drive it a little: move, act, open every menu, let it autosave again */
for (const k of ['d','s',' ','i','i','q','q','m','Escape','Tab',' ']) await press(b, k);
await b.waitForTimeout(7000);
const after = JSON.parse(await b.evaluate(k => localStorage.getItem(k), KEY));

let bad = [];
for (const f of Object.keys(old)) if (!(f in after)) bad.push(f);
if (after.ver !== old.ver) bad.push('ver changed ' + old.ver + ' -> ' + after.ver);
for (const f of ['swing', 'fx', 'shake', 'bufAct']) if (f in after) bad.push('transient state leaked into the save: ' + f);
console.log((newErr ? 'FAIL' : 'PASS') + ' - the pre-change save loads without throwing (' + newErr + ' page errors)');
console.log((bad.length ? 'FAIL' : 'PASS') + ' - every field survives the round trip' + (bad.length ? ': ' + bad.join(', ') : ''));
console.log((after.day >= old.day ? 'PASS' : 'FAIL') + ' - the game carried on from where it was (day ' + old.day + ' -> ' + after.day + ')');
await br.close();
process.exit(newErr || bad.length ? 1 : 0);
