#!/usr/bin/env node
/* Bekkedal screenshot harness — `node scripts/bekkedal_shots.mjs [outdir]`
 *
 * Everything about this app's look is judged by eye, and you cannot judge by
 * eye what you have not rendered. This drives the real app in real Chromium
 * and writes the whole matrix — eleven maps, several hours, both interiors,
 * the mine with and without a lamp, every tool mid-swing — in one pass.
 *
 * The trick that makes it quick: the save is plain JSON under BEK_SAVE in
 * localStorage and its shape is exactly what `fresh()` returns, so a crafted
 * save written *before* the page boots teleports the player anywhere at any
 * hour. The clock runs 4 in-game minutes per real second, so waiting from the
 * 06:00 start to 22:00 would cost four real minutes per frame grabbed.
 *
 * Pixels come out of the canvas itself (toDataURL at the native 960x540),
 * not out of an element screenshot, so what lands on disk is exactly what the
 * game rasterised — no page zoom, no scaling, no CSS in the way.
 *
 * Requires the static server (`npm start`) on :3000 and the pre-installed
 * Chromium at PLAYWRIGHT_BROWSERS_PATH; never run `playwright install`.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.argv[2] || '/tmp/bekshots');
const URL_BASE = process.env.BEK_URL || 'http://localhost:3000/';
const SAVE_KEY = 'templeos.bekkedal.v2';
const ONLY = process.env.BEK_ONLY ? new RegExp(process.env.BEK_ONLY) : null;

/* fresh() with everything unlocked, so no shot is blocked behind a quest */
const BASE = {
  ver: 4, lang: 'en', fullscreen: 0,
  map: 'farm', px: 3, py: 8, dir: 0, step: 0, walk: 0,
  day: 3, min: 12 * 60, kr: 9000, en: 120, enMax: 120,
  water: 20, waterMax: 20,
  tools: { spade: 1, kanne: 1, oks: 1, stang: 1, hakke: 1 },
  tool: 0, axeLv: 2, pickLv: 2, seedIx: 0,
  bag: { potetfro: 5, lykt: 1, ullgenser: 1, tommer: 40, stein: 30 },
  soil: {}, felled: {}, mined: {}, picked: {}, drops: [],
  fr: {}, met: {}, seen: {}, flag: { boat: 1, lot: 1 }, q: {},
  chatIx: {}, disc: { farm: 1 }, weather: 'klar',
  built: 0, ending: 0, houseBuilt: false, houseBuiltDay: null, act2Unlocked: false
};

const HOURS = { morning: 8 * 60, dusk: 19 * 60, night: 23 * 60 };
const MAPS = ['farm', 'town', 'lake', 'forest', 'enga', 'setra', 'vidda', 'gruva', 'fjord'];
const INSIDE = ['farmhouse', 'lakehouse'];

/* Where to stand on each map so the shot shows the thing worth looking at. */
/* Every outdoor map is three to four times what it was and the camera now
   scrolls on both axes, so a shot is of wherever the player is stood rather
   than of the whole map. These are the spines: the yard and the home field,
   the square where the road crosses, the pier, the bend in the forest path,
   the meadow track, the seter, the tarn, the main drift, the quay. */
const WHERE = {
  farm: [14, 9], town: [23, 15], lake: [12, 9], forest: [14, 18], enga: [14, 13],
  setra: [14, 12], vidda: [28, 12], gruva: [20, 12], fjord: [9, 12],
  /* stood out of the way of the table, so the props on it are in the shot */
  farmhouse: [8, 9], lakehouse: [8, 10]
};

const shots = [];
const shot = (name, save, opts) => shots.push({ name, save: Object.assign({}, BASE, save), opts: opts || {} });

for (const mp of MAPS.concat(INSIDE)) {
  const at = WHERE[mp] || [12, 8];
  for (const h of Object.keys(HOURS)) shot(mp + '_' + h, { map: mp, px: at[0], py: at[1], min: HOURS[h] });
}
/* the mine at its darkest, with and without a lamp to carry */
shot('gruva_dark_lamp', { map: 'gruva', px: 20, py: 12, min: 2 * 60, bag: Object.assign({}, BASE.bag, { lykt: 1 }) });
shot('gruva_dark_nolamp', { map: 'gruva', px: 20, py: 12, min: 2 * 60, bag: { potetfro: 5 } });
/* the mine thresholded to 1-bit: can you still find a vein by shape alone? */
shot('gruva_1bit', { map: 'gruva', px: 20, py: 12, min: 12 * 60 }, { bits: 1 });
/* weather over the night, which is the composite that used to fight itself */
shot('farm_fog_night', { map: 'farm', px: 14, py: 9, min: 23 * 60, weather: 'take' });
shot('farm_rain_dusk', { map: 'farm', px: 14, py: 9, min: 19 * 60, weather: 'regn' });
/* the lake house, which only exists once it is built. The base rows carry no
   house at all, so without these three the only photograph of the one building
   the player puts up themselves is at 22:00. */
shot('lake_built_night', { map: 'lake', px: 6, py: 6, min: 22 * 60, built: 1, houseBuilt: true });
shot('lake_built_morning', { map: 'lake', px: 6, py: 6, min: 8 * 60, built: 1, houseBuilt: true });
shot('lake_built_dusk', { map: 'lake', px: 6, py: 6, min: 19 * 60, built: 1, houseBuilt: true });
/* A building, close up, at every hour. `town_*` above is stood at the
   crossroads for the street; these are stood in the square directly below the
   house at cols 30-35, because a facade is the thing being judged and it is
   forty pixels tall in a wide shot. */
for (const h of Object.keys(HOURS))
  shot('town_house_' + h, { map: 'town', px: 32, py: 25, min: HOURS[h] });
/* The same facade thresholded to 1-bit: with the colour gone, is it still a
   building, and can you find the door? The test the ore work established. */
shot('town_1bit', { map: 'town', px: 32, py: 25, min: 8 * 60 }, { bits: 1 });
/* The other two houses that are nowhere near their map's own vantage point:
   the seter hut and the quay house are both at the top of their maps and the
   `WHERE` spines are eight rows below them, so neither appeared in any shot in
   the matrix. One of each dressing, stood in front of the door. */
shot('setra_house_morning', { map: 'setra', px: 6, py: 8, min: 8 * 60 });
shot('fjord_house_morning', { map: 'fjord', px: 6, py: 7, min: 8 * 60 });
/* A coastline the shipped maps do not contain. The lake has a south shore
   and two tiles of it; the fjord has a channel behind a cliff. Neither shows
   a headland, a cove, a spit or an isolated tile, and those are most of what
   an autotiler has to get right — so build one and look at it rather than
   hoping. BEK_MAPS is a live module object, so the rows can be replaced in
   the page before the app is opened. */
const SHORE_LAB = [
  'TTTTTTTTTTTTTTTTTTTTTTTT',
  'TggggggggggggWWWWWWWWWWT',
  'Tgggggggggggg~WWWWWWWWWT',
  'Tggg~~~~~gggg~~gggg~WWWT',
  'Tggg~WWW~gggg~gggggg~WWT',
  'Tggg~WWW~gggg~~~~~~~~~WT',
  'Tggg~WWW~ggggg~WWWWWWWWT',
  'Tggg~~~~~gggggg~WWWWWWWT',
  'Tggggggggggggggg~WWWWWWT',
  'Tgggggggggggggggg~WWWWWT',
  'Tgggg~gggggggggggg~WWWWT',
  'Tgggggggggggggggggg~WWWT',
  'Tggggggggggggggggggg~WWT',
  'Tgggggggggggggggggggg~WT',
  'TTTTTTTTTTTTTTTTTTTTTTTT'
];
/* flag.lot off: the lake draws the surveyor's lines for a bought plot, and
   they run straight across the lab */
shot('shorelab_noon', { map: 'lake', px: 10, py: 8, min: 12 * 60, flag: { boat: 1 } }, { rows: SHORE_LAB });
shot('shorelab_dusk', { map: 'lake', px: 10, py: 8, min: 19 * 60, flag: { boat: 1 } }, { rows: SHORE_LAB });

/* the four treeline corners, camera clamped to each end of its travel */
shot('farm_corner_top', { map: 'farm', px: 1, py: 1, min: 12 * 60 });
shot('farm_corner_bot', { map: 'farm', px: 42, py: 24, min: 12 * 60 });
/* Every tool at rest and at each of its three phases, stood in front of
   something it can actually work — an axe swung at empty grass throws no
   chips, and a shot of that proves nothing. */
const SWING = [
  ['spade', 0, 'farm', 20, 4, 0],      /* facing the home field at (20, 5)  */
  ['kanne', 1, 'farm', 20, 4, 0],      /* the same plot, tilled and sown    */
  ['oks', 2, 'forest', 10, 5, 0],      /* above the birch at (10, 6)        */
  ['hakke', 4, 'gruva', 19, 19, 0],    /* above the rich vein at (19, 20)   */
  ['stang', 3, 'lake', 16, 8, 0]       /* on the pier, facing the water     */
];
for (const [id, ix, mp, x, y, dir] of SWING) {
  for (const ph of [0, 1, 2, 3]) {
    shot('swing_' + id + '_' + ph, { map: mp, px: x, py: y, dir: dir, tool: ix, min: 12 * 60 },
         { swing: ph, till: id === 'kanne' });
  }
}

/* Every panel, opened through the same code the keyboard opens it with. A
   menu is the one part of the picture a screenshot of the world never covers,
   and a panel that throws only throws when somebody opens it. */
for (const m of ['bag', 'quest', 'travel', 'shop', 'craft', 'talk', 'ask', 'talk2', 'offer', 'fish', 'sleep', 'end']) {
  shot('menu_' + m, { map: 'town', px: 23, py: 13, min: 12 * 60, disc: { farm: 1, town: 1, lake: 1, setra: 1, vidda: 1 },
                      q: { fisk: 'active' }, bag: { potet: 3, jern: 2, tommer: 9, blabar: 5 } },
       { menu: m });
}

mkdirSync(OUT, { recursive: true });

/* The pre-installed Chromium is not necessarily the build this playwright
   version pins, so point at it explicitly rather than letting the launcher
   go looking for one to download. */
const CHROME = process.env.BEK_CHROME || '/opt/pw-browsers/chromium';
const browser = await chromium.launch({ executablePath: existsSync(CHROME) ? CHROME : undefined });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
/* A thrown draw call leaves a half-painted canvas that looks plausible in a
   thumbnail, so an error is a failed run and not a log line. */
let pageErrors = 0;
page.on('pageerror', e => { pageErrors++; console.error('  PAGE ERROR:', e.message); });
/* One init script for the whole run — addInitScript accumulates, so the save
   goes in through localStorage between two loads instead of through here. */
await page.addInitScript(() => {
  /* silence the machine's own audio graph: nothing here needs a speaker and
     an autoplay-blocked AudioContext throws on some launches */
  window.AudioContext = window.webkitAudioContext = function () { throw new Error('no audio'); };
});
/* The machine boots with the set switched off, and the splash sits over the
   shell until something clicks it away — so power on, wait for the boot lines
   to run out, and dismiss it. Once. Every shot after this reuses the booted
   page and only closes and reopens the app window, which is the difference
   between three seconds a shot and one. */
await page.goto(URL_BASE, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => { if (window.powerOn) window.powerOn(); });
await page.waitForSelector('#bootcursor', { timeout: 30000 });
await page.evaluate(() => document.dispatchEvent(new MouseEvent('click', { bubbles: true })));
await page.waitForSelector('#shell', { state: 'visible', timeout: 15000 });

let n = 0;
for (const s of shots) {
  if (ONLY && !ONLY.test(s.name)) continue;
  /* Close first, *then* seed: the app's unmount watchdog autosaves on its own
     800ms tick, and a save written before that fires would be overwritten by
     whatever the previous shot left in S. */
  await page.evaluate(() => document.querySelectorAll('.win').forEach(w => w.remove()));
  await page.waitForTimeout(950);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [SAVE_KEY, JSON.stringify(s.save)]);
  await page.evaluate(async (rows) => {
    const d = await import('/apps/bekkedal/data.js');
    if (!window.__bekRows) window.__bekRows = d.BEK_MAPS[Object.keys(d.BEK_MAPS)[0]] && JSON.parse(JSON.stringify(
      Object.fromEntries(Object.keys(d.BEK_MAPS).map(k => [k, d.BEK_MAPS[k].rows]))));
    Object.keys(window.__bekRows).forEach(k => { d.BEK_MAPS[k].rows = window.__bekRows[k].slice(); });
    if (!rows) return;
    const bad = rows.filter(r => r.length !== 24);
    if (bad.length) throw new Error('lab rows must be 24 wide: ' + bad.join(' | '));
    if (rows.length !== 15) throw new Error('lab needs 15 rows, got ' + rows.length);
    d.BEK_MAPS.lake.rows = rows.slice();
  }, s.opts.rows || null);
  await page.evaluate(() => import('/kernel/wm.js').then(m => m.openWindow('bekkedal')));
  await page.waitForSelector('canvas.bekcv', { state: 'visible', timeout: 15000 });
  /* let the app settle: the terrain cache builds on the first draw and the
     30fps frame gate means a couple of rAFs is not a couple of draws */
  await page.waitForTimeout(400);

  const png = await page.evaluate(async (opts) => {
    const cv = document.querySelector('canvas.bekcv');
    if (opts.menu && window.__bekDebug) window.__bekDebug.menu(opts.menu);
    if (opts.swing != null && window.__bekDebug) window.__bekDebug.swing(opts.swing, opts.till);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    if (opts.bits === 1) {
      const o = document.createElement('canvas');
      o.width = cv.width; o.height = cv.height;
      const q = o.getContext('2d');
      q.drawImage(cv, 0, 0);
      const d = q.getImageData(0, 0, o.width, o.height);
      /* Threshold at the image's own median rather than at a number picked in
         advance. A fixed cut is a test of how bright the map happens to be
         (the mine sits at a fixed dim exposure of its own) instead of a test
         of whether the veins have a silhouette, which is the question. */
      const hist = new Uint32Array(256);
      for (let i = 0; i < d.data.length; i += 4) {
        hist[Math.round(0.2126 * d.data[i] + 0.7152 * d.data[i + 1] + 0.0722 * d.data[i + 2])]++;
      }
      let acc = 0, half = (d.data.length / 4) / 2, cut = 128;
      for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= half) { cut = v; break; } }
      for (let i = 0; i < d.data.length; i += 4) {
        const l = 0.2126 * d.data[i] + 0.7152 * d.data[i + 1] + 0.0722 * d.data[i + 2];
        const b = l > cut ? 255 : 0;
        d.data[i] = d.data[i + 1] = d.data[i + 2] = b;
      }
      q.putImageData(d, 0, 0);
      return o.toDataURL('image/png');
    }
    return cv.toDataURL('image/png');
  }, s.opts);

  writeFileSync(path.join(OUT, s.name + '.png'), Buffer.from(png.split(',')[1], 'base64'));
  n++;
  process.stdout.write('  ' + s.name + '\n');
}

/* one timing run: the numbers the brief asks to be measured rather than assumed */
const perf = await page.evaluate(() => (window.__bekDebug ? window.__bekDebug.perf() : null));
if (perf) console.log('\nperf: ' + JSON.stringify(perf, null, 2));

await browser.close();
console.log('\n' + n + ' shots -> ' + OUT);
if (pageErrors) { console.error(pageErrors + ' page error(s) — the shots are not trustworthy.'); process.exit(1); }
