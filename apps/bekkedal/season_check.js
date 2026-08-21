/* Bekkedal seasonal layer check — `node apps/bekkedal/season_check.js`
 *
 * seasons.js derives S.season and S.festival from S.day fresh every
 * newDay() rather than stepping them on their own (see the comments on
 * fresh()/heal()/newDay() in index.js) specifically so the two can never
 * drift apart from the day count that defines them. Nothing here mounts the
 * app — it drives the same pure functions index.js calls, over four
 * simulated years, and checks the arithmetic holds at every day and at
 * every season boundary.
 *
 * Four families of assertion:
 *   the day walk      — 4 years of days, one at a time: season index and
 *                        day-of-season agree with an independently written
 *                        formula, and never disagree with the value the
 *                        previous day's own recompute would predict (i.e.
 *                        there is no drift to detect in the first place);
 *   season transitions — the season index changes exactly at each
 *                        BEK_SEASON_DAYS boundary and nowhere else, and the
 *                        cycle order/length repeats identically year to
 *                        year;
 *   crop gating        — cropInSeason() agrees with each crop's own
 *                        `seasons` list on every day of the 4-year walk,
 *                        and every season has at least one plantable crop;
 *   festivals           — festivalOf() fires on exactly one day per season
 *                        per year, on the day BEK_FESTIVALS declares, and
 *                        its `dress` tiles are real, distinct, walkable
 *                        squares on the map it names.
 */
import { BEK_SEASON_DAYS, BEK_SEASONS, BEK_SEASON_WEATHER, BEK_FESTIVALS,
         BEK_CROPS, BEK_MAPS, BEK_SOLID, mapCols, mapRows } from './data.js';
import { seasonIndexOf, seasonOf, dayOfSeason, festivalOf, isFestivalDay, cropInSeason, rollWeather } from './seasons.js';

let fails = 0, checks = 0;
const ok = (cond, label, detail) => {
  checks++;
  if (cond) return true;
  fails++; console.log('FAIL ' + label + (detail ? '   ' + detail : ''));
  return false;
};
const pass = (label, detail) => { checks++; console.log('OK   ' + label.padEnd(52) + (detail || '')); };

const YEARS = 4;
const YEAR_DAYS = BEK_SEASON_DAYS * BEK_SEASONS.length;
const LAST_DAY = YEARS * YEAR_DAYS;

/* ---- 1. the day walk ------------------------------------------------------ */
console.log('\n-- the day walk (' + YEARS + ' years, ' + LAST_DAY + ' days) --');
let idxMismatch = 0, dosMismatch = 0, driftFromPrev = 0;
let prevIdx = seasonIndexOf(1), prevDos = dayOfSeason(1);
for (let day = 1; day <= LAST_DAY; day++) {
  /* an independently written formula, not a call to the code under test */
  const wantIdx = Math.floor((day - 1) / BEK_SEASON_DAYS) % BEK_SEASONS.length;
  const wantDos = ((day - 1) % BEK_SEASON_DAYS) + 1;
  const gotIdx = seasonIndexOf(day), gotDos = dayOfSeason(day);
  if (gotIdx !== wantIdx) { idxMismatch++; if (idxMismatch <= 3) console.log('  day ' + day + ': season index ' + gotIdx + ' != ' + wantIdx); }
  if (gotDos !== wantDos) { dosMismatch++; if (dosMismatch <= 3) console.log('  day ' + day + ': day-of-season ' + gotDos + ' != ' + wantDos); }
  /* "never drift" as an operational check: recomputing from day never
     disagrees with what advancing one day from yesterday's own recompute
     would give, the way S.day++ followed by a fresh seasonIndexOf() call
     in newDay() actually behaves */
  if (day > 1) {
    const stepIdx = prevDos + 1 > BEK_SEASON_DAYS ? (prevIdx + 1) % BEK_SEASONS.length : prevIdx;
    if (stepIdx !== gotIdx) driftFromPrev++;
  }
  prevIdx = gotIdx; prevDos = gotDos;
}
ok(idxMismatch === 0, 'season index matches an independent formula on every day', idxMismatch + ' mismatches of ' + LAST_DAY);
ok(dosMismatch === 0, 'day-of-season matches an independent formula on every day', dosMismatch + ' mismatches of ' + LAST_DAY);
ok(driftFromPrev === 0, 'season index never drifts from the previous day’s own recompute', driftFromPrev + ' drifts of ' + (LAST_DAY - 1) + ' steps');
pass('day walk', LAST_DAY + ' days across ' + YEARS + ' years, ' + BEK_SEASONS.length + ' seasons of ' + BEK_SEASON_DAYS + ' days each');

/* ---- 2. season transitions ------------------------------------------------ */
console.log('\n-- season transitions --');
let transitions = [], wrongLen = 0;
for (let day = 2; day <= LAST_DAY; day++) {
  if (seasonIndexOf(day) !== seasonIndexOf(day - 1)) transitions.push(day);
}
ok(transitions.length === YEARS * BEK_SEASONS.length - 1, 'one transition at every season boundary and nowhere else',
   transitions.length + ' transitions, expected ' + (YEARS * BEK_SEASONS.length - 1));
for (let i = 1; i < transitions.length; i++) {
  if (transitions[i] - transitions[i - 1] !== BEK_SEASON_DAYS) wrongLen++;
}
ok(wrongLen === 0, 'every season runs exactly BEK_SEASON_DAYS long', wrongLen + ' irregular gaps');
/* the cycle order repeats identically year over year */
let orderMismatch = 0;
for (let y = 1; y < YEARS; y++) {
  for (let s = 0; s < BEK_SEASONS.length; s++) {
    const dayThisYear = y * YEAR_DAYS + s * BEK_SEASON_DAYS + 1;
    const dayYear0 = s * BEK_SEASON_DAYS + 1;
    if (seasonIndexOf(dayThisYear) !== seasonIndexOf(dayYear0)) orderMismatch++;
  }
}
ok(orderMismatch === 0, 'the season order repeats identically every year', orderMismatch + ' mismatches over ' + YEARS + ' years');
pass('season transitions', transitions.length + ' boundaries checked');

/* ---- 3. crop gating -------------------------------------------------------- */
console.log('\n-- crop gating --');
const crops = Object.entries(BEK_CROPS);
ok(crops.every(([, c]) => Array.isArray(c.seasons) && c.seasons.length > 0),
   'every crop declares at least one season', crops.length + ' crops');
ok(crops.every(([, c]) => c.seasons.every(id => BEK_SEASONS.some(s => s.id === id))),
   'every crop’s seasons are real BEK_SEASONS ids');
let gateMismatch = 0;
for (let day = 1; day <= LAST_DAY; day += 3) {           /* every third day over 4 years is still 427 samples */
  const sid = seasonOf(day).id;
  crops.forEach(([id, c]) => {
    const want = c.seasons.indexOf(sid) >= 0;
    const got = cropInSeason(c, day);
    if (want !== got) { gateMismatch++; if (gateMismatch <= 3) console.log('  day ' + day + ' (' + sid + '): ' + id + ' expected ' + want + ', got ' + got); }
  });
}
ok(gateMismatch === 0, 'cropInSeason() agrees with each crop’s own seasons list', gateMismatch + ' mismatches sampled');
/* P20: the farming-depth pass grew the roster from six crops to twelve
   specifically so every season clears a *real* floor rather than the bare
   minimum of one — a season with a single viable crop is a season with no
   choice in it. Twelve crops spread over four seasons only clears three
   comfortably if each crop counts once per season it lists, which is
   exactly what this counts. The greenhouse (BEK_GREENHOUSE_PLOT, data.js)
   is the deliberate, documented exception to this whole family: plant() in
   index.js skips cropInSeason() entirely inside its bounds, so every crop
   in the game is "in season" there regardless of BEK_CROPS' own seasons
   list — that is the point of it, not a gap this check should catch. */
const SEASON_CROP_MIN = 3;
let thinSeason = null, seasonCounts = {};
BEK_SEASONS.forEach(s => {
  const n = crops.filter(([, c]) => c.seasons.indexOf(s.id) >= 0).length;
  seasonCounts[s.id] = n;
  if (n < SEASON_CROP_MIN) thinSeason = s.id;
});
ok(!thinSeason, 'every season has at least ' + SEASON_CROP_MIN + ' plantable crops',
   thinSeason ? thinSeason + ' has only ' + seasonCounts[thinSeason] : JSON.stringify(seasonCounts));
pass('crop gating', Math.ceil(LAST_DAY / 3) * crops.length + ' crop-day checks');

/* ---- 4. festivals ----------------------------------------------------------- */
console.log('\n-- festivals --');
let festCount = {}, festWrongDay = 0, festWrongMap = 0, festFlagMismatch = 0;
BEK_SEASONS.forEach(s => { festCount[s.id] = 0; });
for (let day = 1; day <= LAST_DAY; day++) {
  const f = festivalOf(day);
  if (isFestivalDay(day) !== !!f) festFlagMismatch++;
  if (!f) continue;
  const sid = seasonOf(day).id;
  festCount[sid]++;
  const def = BEK_FESTIVALS[sid];
  if (dayOfSeason(day) !== def.day) festWrongDay++;
  if (f !== def) festWrongMap++;                          /* festivalOf must hand back this season's own def, not another's */
}
ok(BEK_SEASONS.every(s => festCount[s.id] === YEARS), 'each season’s festival fires exactly once a year',
   JSON.stringify(festCount));
ok(festWrongDay === 0, 'every festival falls on its declared day-of-season', festWrongDay + ' mismatches');
ok(festWrongMap === 0, 'festivalOf() always returns the current season’s own definition', festWrongMap + ' mismatches');
ok(festFlagMismatch === 0, 'isFestivalDay() agrees with festivalOf() being non-null on every day', festFlagMismatch + ' mismatches of ' + LAST_DAY);

/* the dressing itself: real, distinct, walkable tiles on a map that exists */
let dressBad = 0;
Object.entries(BEK_FESTIVALS).forEach(([sid, f]) => {
  const map = BEK_MAPS[f.map];
  if (!map) { dressBad++; console.log('  ' + sid + ': no such map ' + f.map); return; }
  const seen = new Set();
  f.dress.forEach(([x, y]) => {
    const key = x + ',' + y;
    if (seen.has(key)) { dressBad++; console.log('  ' + sid + ': duplicate dressing tile ' + key); }
    seen.add(key);
    if (x < 0 || y < 0 || x >= mapCols(f.map) || y >= mapRows(f.map)) { dressBad++; console.log('  ' + sid + ': dressing tile off the map ' + key); return; }
    const base = map.rows[y].charAt(x);
    if (BEK_SOLID.indexOf(base) >= 0 || base === 'D') { dressBad++; console.log('  ' + sid + ': dressing tile ' + key + ' sits on solid ' + JSON.stringify(base)); }
  });
});
ok(dressBad === 0, 'every festival’s dressing sits on real, distinct, walkable grass', dressBad + ' problems');
pass('festivals', YEARS * BEK_SEASONS.length + ' festival days checked across ' + YEARS + ' years');

/* ---- 5. weather odds sum sanely -------------------------------------------- */
console.log('\n-- weather odds --');
ok(BEK_SEASONS.every(s => {
  const w = BEK_SEASON_WEATHER[s.id];
  return w && w.regn >= 0 && w.take >= 0 && w.regn + w.take <= 1;
}), 'every season’s rain+fog odds leave room for clear weather');
let sawRegn = false, sawTake = false, sawKlar = false;
for (let i = 0; i < 4000; i++) {
  const day = 1 + (i % LAST_DAY);
  const w = rollWeather(day, () => i / 4000);
  if (w === 'regn') sawRegn = true; else if (w === 'take') sawTake = true; else sawKlar = true;
}
ok(sawRegn && sawTake && sawKlar, 'rollWeather() can still land on all three outcomes across the seasons',
   'regn=' + sawRegn + ' take=' + sawTake + ' klar=' + sawKlar);
pass('weather odds', BEK_SEASONS.length + ' seasons, 4000 sampled rolls');

console.log('\n' + (fails ? fails + ' of ' + checks + ' checks FAILED' : 'All ' + checks + ' season checks pass.'));
process.exit(fails ? 1 : 0);
