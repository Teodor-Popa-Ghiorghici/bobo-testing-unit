/* Bekkedal schedule check — `node apps/bekkedal/schedule_check.js`
 *
 * schedule.js replaces eight statues with eight small named routes; this is
 * the check that the routes never strand anyone, never overlap, and never
 * go quiet exactly when a shopkeeper's own dialogue says they will not.
 * Same shape as season_check.js: nothing here mounts the app, it drives the
 * same pure functions index.js calls, over a simulated year, at every hour
 * two of the four things that can change a schedule can take.
 *
 * Five families of assertion:
 *   posts        — every post any NPC owns is a real map, in bounds, and a
 *                   tile you can stand on (schedule.js's own solid() rule:
 *                   a door is knocked on, not walked through);
 *   coverage     — each NPC's *default* posts (no weather/season/flag of
 *                   their own) span all 1440 minutes of a day exactly once,
 *                   which is what guarantees activePost() never has to fall
 *                   back to "whatever post happens to be last";
 *   the year walk — a full simulated year, sampled every 30 minutes, both
 *                   with and without the story flags this layer reads
 *                   (S.flag.barn, S.act2Unlocked) and across all three
 *                   weather states: every NPC resolves to a walkable tile
 *                   on a real map, and no two of the eight ever share one;
 *   shopkeepers  — Astrid, Sigrid and Lars stay on their own home map
 *                   through their stated hours regardless of weather or
 *                   (for Sigrid) season — reachable means never vanished,
 *                   not pinned to one tile;
 *   festivals    — on each season's festival day, every one of the eight
 *                   resolves to the festival's own map, at eight distinct
 *                   tiles — the operational meaning of "everyone converges".
 */
import { BEK_NPCS, BEK_MAPS, BEK_SOLID, BEK_SEASON_DAYS, BEK_SEASONS, BEK_FESTIVALS,
         mapCols, mapRows } from './data.js';
import { positionFor } from './schedule.js';
import { isFestivalDay, seasonOf } from './seasons.js';

let fails = 0, checks = 0;
const ok = (cond, label, detail) => {
  checks++;
  if (cond) return true;
  fails++; console.log('FAIL ' + label + (detail ? '   ' + detail : ''));
  return false;
};
const pass = (label, detail) => { checks++; console.log('OK   ' + label.padEnd(52) + (detail || '')); };

/* the eight who talk — bjorn (the bear) carries no `posts` and keeps his
   old single map/x/y, unaffected by any of this */
const NPCS = BEK_NPCS.filter(n => n.posts);

/* the same question solid() (index.js) and walkable() (schedule.js) ask,
   written out independently rather than imported, per the convention every
   other check here already follows */
const walk = (mp, x, y) => {
  if (!BEK_MAPS[mp] || y < 0 || y >= mapRows(mp) || x < 0 || x >= mapCols(mp)) return false;
  const c = BEK_MAPS[mp].rows[y].charAt(x);
  return c !== 'D' && BEK_SOLID.indexOf(c) < 0;
};
/* an independent formula for the same from/to window schedule.js's
   hourMatch() computes, so the coverage pass below is not just asking the
   code under test to grade its own homework */
const inWindow = (from, to, m) => from <= to ? (m >= from && m < to) : (m >= from || m < to);

/* ---- 1. every post is a real, standable tile ------------------------------ */
console.log('\n-- posts --');
let postBad = 0, postCount = 0;
NPCS.forEach(n => n.posts.forEach(p => {
  postCount++;
  if (!BEK_MAPS[p.map]) { postBad++; console.log('  ' + n.id + '.' + p.id + ': no such map ' + p.map); return; }
  if (!walk(p.map, p.x, p.y)) {
    postBad++;
    console.log('  ' + n.id + '.' + p.id + ' stands on ' + JSON.stringify(BEK_MAPS[p.map].rows[p.y].charAt(p.x)) + ' at ' + p.map + ' ' + p.x + ',' + p.y);
  }
}));
ok(postBad === 0, 'every post is on its own map and a tile you can stand on', postBad + ' bad of ' + postCount);
pass('posts', postCount + ' posts across ' + NPCS.length + ' NPCs');

/* ---- 2. the default posts alone cover the whole day, once each ----------- */
console.log('\n-- coverage --');
let gapNpcs = 0, overlapNpcs = 0;
NPCS.forEach(n => {
  const defaults = n.posts.filter(p => !p.festival && !p.season && !p.weather && !p.flag);
  const cov = new Array(1440).fill(0);
  defaults.forEach(p => { for (let m = 0; m < 1440; m++) if (inWindow(p.from, p.to, m)) cov[m]++; });
  const gaps = cov.filter(c => c === 0).length, overlaps = cov.filter(c => c > 1).length;
  if (gaps) { gapNpcs++; console.log('  ' + n.id + ': ' + gaps + ' minutes with no default post'); }
  if (overlaps) { overlapNpcs++; console.log('  ' + n.id + ': ' + overlaps + ' minutes claimed by two default posts'); }
});
ok(gapNpcs === 0, 'every NPC’s default posts leave no minute of the day uncovered', gapNpcs + ' NPCs with a gap');
ok(overlapNpcs === 0, 'every NPC’s default posts never double-claim a minute', overlapNpcs + ' NPCs with an overlap');
pass('coverage', NPCS.length + ' schedules, 1440 minutes each');

/* ---- 3. the year walk ----------------------------------------------------- */
console.log('\n-- the year walk --');
const YEAR_DAYS = BEK_SEASON_DAYS * BEK_SEASONS.length;
const WEATHERS = ['klar', 'regn', 'take'];
const FLAG_STATES = [{ flag: {}, act2Unlocked: false }, { flag: { barn: 1 }, act2Unlocked: true }];
let offMap = 0, offSolid = 0, overlapTiles = 0, sampleCount = 0;
for (let day = 1; day <= YEAR_DAYS; day++) {
  for (let h = 0; h < 24; h++) {
    for (let half = 0; half < 2; half++) {
      const minute = h * 60 + half * 30;
      for (const weather of WEATHERS) {
        for (const fs of FLAG_STATES) {
          const ctx = { weather: weather, flag: fs.flag, act2Unlocked: fs.act2Unlocked };
          const seen = Object.create(null);
          NPCS.forEach(n => {
            sampleCount++;
            const pos = positionFor(n, day, minute, ctx);
            if (!BEK_MAPS[pos.map]) { offMap++; return; }
            if (!walk(pos.map, pos.x, pos.y)) {
              offSolid++;
              if (offSolid <= 5) console.log('  day ' + day + ' ' + minute + 'min ' + weather + ': ' + n.id + ' on ' + JSON.stringify(BEK_MAPS[pos.map].rows[pos.y] && BEK_MAPS[pos.map].rows[pos.y].charAt(pos.x)) + ' at ' + pos.map + ' ' + pos.x + ',' + pos.y);
            }
            const k = pos.map + ':' + pos.x + ',' + pos.y;
            if (seen[k]) {
              overlapTiles++;
              if (overlapTiles <= 5) console.log('  day ' + day + ' ' + minute + 'min ' + weather + ': ' + n.id + ' and ' + seen[k] + ' both at ' + k);
            }
            seen[k] = n.id;
          });
        }
      }
    }
  }
}
ok(offMap === 0, 'every resolved position names a real map', offMap + ' of ' + sampleCount);
ok(offSolid === 0, 'every resolved position is a tile you can stand on', offSolid + ' of ' + sampleCount);
ok(overlapTiles === 0, 'no two NPCs ever share a tile', overlapTiles + ' collisions');
pass('the year walk', YEAR_DAYS + ' days × 48 samples/day × ' + WEATHERS.length + ' weathers × ' + FLAG_STATES.length + ' flag states × ' + NPCS.length + ' NPCs = ' + sampleCount + ' checks');

/* ---- 4. the shopkeepers are where the door says they are ----------------- */
console.log('\n-- shopkeepers --');
/* independently authored — not read off BEK_NPCS.posts, or a mistake there
   would grade itself correct here too. Sigrid's own hours hold on both maps
   she ever keeps them on: the setra through three seasons, the valley (the
   farm) through winter, per BEK_TALK.sigrid's own chat line. */
const SHOP_HOURS = {
  astrid: { from: 480, to: 1200, maps: ['town'] },
  sigrid: { from: 480, to: 1200, maps: ['setra', 'farm'] },
  lars:   { from: 480, to: 1200, maps: ['gruva'] }
};
let shopBad = 0, shopSamples = 0;
Object.keys(SHOP_HOURS).forEach(id => {
  const n = NPCS.filter(x => x.id === id)[0];
  const spec = SHOP_HOURS[id];
  for (let day = 1; day <= YEAR_DAYS; day += 3) {
    if (isFestivalDay(day)) continue;                /* the one day the shop closes for the square, by design */
    for (let m = spec.from; m < spec.to; m += 30) {
      for (const weather of WEATHERS) {
        shopSamples++;
        const pos = positionFor(n, day, m, { weather: weather, flag: {}, act2Unlocked: false });
        if (spec.maps.indexOf(pos.map) < 0) {
          shopBad++;
          if (shopBad <= 5) console.log('  ' + id + ' day ' + day + ' ' + m + 'min ' + weather + ': off the map at ' + pos.map);
        }
      }
    }
  }
});
ok(shopBad === 0, 'every shopkeeper stays on their own map through their stated hours', shopBad + ' of ' + shopSamples);
pass('shopkeepers', Object.keys(SHOP_HOURS).length + ' shopkeepers, ' + shopSamples + ' samples');

/* ---- 5. a festival converges everyone on the square ----------------------- */
console.log('\n-- festivals --');
let festBad = 0, festDup = 0, festDays = 0;
for (let day = 1; day <= YEAR_DAYS; day++) {
  if (!isFestivalDay(day)) continue;
  festDays++;
  const fest = BEK_FESTIVALS[seasonOf(day).id];
  const seen = new Set();
  NPCS.forEach(n => {
    const pos = positionFor(n, day, 720, { weather: 'klar', flag: {}, act2Unlocked: false });
    if (pos.map !== fest.map) { festBad++; console.log('  day ' + day + ': ' + n.id + ' is on ' + pos.map + ', not ' + fest.map); }
    const k = pos.x + ',' + pos.y;
    if (seen.has(k)) { festDup++; console.log('  day ' + day + ': two NPCs both at ' + k); }
    seen.add(k);
  });
}
ok(festBad === 0, 'every festival day puts every NPC on the festival’s own map', festBad + ' misplaced');
ok(festDup === 0, 'every festival day gives every NPC their own tile', festDup + ' collisions');
ok(festDays === BEK_SEASONS.length, 'one festival day found per season in the sampled year', festDays + ' of ' + BEK_SEASONS.length);
pass('festivals', festDays + ' festival days, ' + NPCS.length + ' NPCs each');

console.log('\n' + (fails ? fails + ' of ' + checks + ' checks FAILED' : 'All ' + checks + ' schedule checks pass.'));
process.exit(fails ? 1 : 0);
