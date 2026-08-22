/* Bekkedal spine check — the family about how long the loft takes.
 *
 * A sibling of `spine_check.js` for the 300-line rule, the way
 * `mine_check_ore.js` is one of `mine_check.js` — one check, still one
 * command (`node apps/bekkedal/spine_check.js`), and the dependency runs one
 * way. The other four families are assertions about the tables; this one is
 * an assertion about the *calendar*, which is a different kind of argument
 * and wants its own room.
 *
 * `C` is the apparatus, handed over rather than rebuilt: the same `ok`
 * counting into the same tally, and the same source lists the obtainability
 * family already wrote down.
 */
import { BEK_LOFT, BEK_CROPS, BEK_FISH_WATERS, BEK_SEASONS, BEK_SEASON_DAYS } from './data.js';
import { seasonOf, festivalOf, cropInSeason, rollWeather } from './seasons.js';
import { LOFT_ENTRIES } from './spine.js';

export function howLong(C) {
  const { ok, pass, CROPPED, CRAFTED, FISHED } = C;

  /* ============================================================================
   5. HOW LONG IT TAKES
   ----------------------------------------------------------------------------
   The brief's claim is that the loft takes at least four in-game seasons of
   real play. Half of that is provable from the calendar alone and is proved
   here before anything is simulated: the ÅRET wing wants one offering per
   season's own festival day, a festival comes once a season, so four of them
   is four distinct seasons and at least 3 * BEK_SEASON_DAYS + 1 days between
   the first and the last — whatever the player's skill, money or greenhouse.
   The other half is the rest of the year's work, and that is measured.
   ========================================================================== */
  console.log('\n-- how long it takes --');
  const arWing = BEK_LOFT.filter(w => w.id === 'ar')[0];
  const arSeasons = new Set(arWing.e.map(e => e.season));
  ok(arSeasons.size === BEK_SEASONS.length && BEK_SEASONS.every(s => arSeasons.has(s.id)),
   'the year wing wants one offering in each of the four seasons', [...arSeasons].join(', '));
  let seasonGateBad = null;
  arWing.e.forEach(e => {
  if (!e.when || !e.item) seasonGateBad = seasonGateBad || e.id;
  if (e.when && !e.when({ festival: e.season })) seasonGateBad = seasonGateBad || (e.id + ' does not fire on its own festival');
  if (e.when && e.when({ festival: null })) seasonGateBad = seasonGateBad || (e.id + ' fires off a festival day');
  });
  ok(!seasonGateBad, 'and each one only on that season’s own festival day', seasonGateBad || '');
  const MIN_SPAN = (BEK_SEASONS.length - 1) * BEK_SEASON_DAYS + 1;
  ok(MIN_SPAN >= 3 * BEK_SEASON_DAYS,
   'so the year wing alone spans at least ' + MIN_SPAN + ' days, by the calendar and not by tuning',
   MIN_SPAN + ' days between the first festival and the fourth');

  /* the simulation. A deliberate LOWER bound, the way act2_check.js's balance
   pass is: no energy budget, no walking, no bag limit, no missed casts, and
   every seed and every recipe already unlocked the day the loft opens. A real
   playthrough takes at least this long and never less. */
  const OPEN_DAY = 8;            /* houseBuilt lands day 6-12 (act2_check.js's own balance pass) */
  const HORIZON = 400;
  const FISH_LEAD = 1, GATHER_LEAD = 1, DEEP10 = 3, DEEP20 = 6, KRYSTALL = 4, FR10 = 14;
  const PRESV = { syltetoy: 2, fruktvin: 4 };     /* PRESV_DAYS, index.js */
  function earliestCrop(id) {
  const cid = Object.keys(BEK_CROPS).filter(c => BEK_CROPS[c].out === id)[0];
  if (!cid) return null;
  for (let d = OPEN_DAY; d < HORIZON; d++) if (cropInSeason(cid, d)) return d + BEK_CROPS[cid].days;
  return null;
  }
  function runOnce(rand) {
  const weather = [];
  for (let d = 0; d <= HORIZON; d++) weather[d] = rollWeather(d, rand);
  const firstCrop = Math.min(...CROPPED.map(earliestCrop).filter(d => d != null));
  const when = e => {
    if (e.season) {                            /* an ÅRET offering: the day, and the thing */
      const need = e.item ? at2(e.item) : OPEN_DAY;
      for (let d = OPEN_DAY; d < HORIZON; d++)
        if (festivalOf(d) && seasonOf(d).id === e.season && d >= need) return d;
      return HORIZON;
    }
    if (e.when) {
      const src = e.when.toString();
      if (src.indexOf('S.fr.') >= 0) return OPEN_DAY + FR10;
      if (src.indexOf('>= 20') >= 0) return OPEN_DAY + DEEP20;
      return OPEN_DAY + DEEP10;
    }
    return at2(e.item);
  };
  function at2(id) {
    if (CROPPED.indexOf(id) >= 0) return earliestCrop(id);
    if (PRESV[id] != null) return firstCrop + PRESV[id];
    if (id === 'krystall') return OPEN_DAY + KRYSTALL;
    /* a legendary bites only inside its own season and weather, once a year */
    for (const mp of Object.keys(BEK_FISH_WATERS)) {
      const w = BEK_FISH_WATERS[mp];
      if (w.legend !== id) continue;
      for (let d = OPEN_DAY; d < HORIZON; d++)
        if (seasonOf(d).id === w.legendWhen.season && weather[d] === w.legendWhen.weather) return d;
      return HORIZON;
    }
    if (FISHED.indexOf(id) >= 0) return OPEN_DAY + FISH_LEAD;
    if (CRAFTED.indexOf(id) >= 0) return Math.max(firstCrop, OPEN_DAY + GATHER_LEAD);
    return OPEN_DAY + GATHER_LEAD;
  }
  let last = 0, lastOf = '';
  LOFT_ENTRIES.forEach(x => { const d = when(x.e); if (d > last) { last = d; lastOf = x.w.id + ':' + x.e.id; } });
  return { day: last, lastOf: lastOf };
  }
  const TRIALS = 200, runs = [];
  for (let i = 0; i < TRIALS; i++) runs.push(runOnce(Math.random));
  runs.sort((a, b) => a.day - b.day);
  const fastest = runs[0], median = runs[Math.floor(TRIALS / 2)], slowest = runs[TRIALS - 1];
  const TARGET = BEK_SEASONS.length * BEK_SEASON_DAYS;
  ok(fastest.day >= TARGET,
   'even the luckiest simulated run needs four in-game seasons (' + TARGET + ' days)',
   'fastest day ' + fastest.day + ', last thing in: ' + fastest.lastOf);
  ok(median.day >= TARGET, 'and the median run does too', 'median day ' + median.day + ' (' +
   (median.day / BEK_SEASON_DAYS).toFixed(1) + ' seasons), slowest ' + slowest.day);
  ok(slowest.day < HORIZON, 'and every run finishes', 'slowest day ' + slowest.day);
  const bind = {};
  runs.forEach(r => { bind[r.lastOf] = (bind[r.lastOf] || 0) + 1; });
  pass('how long it takes', TRIALS + ' runs from day ' + OPEN_DAY + ': fastest ' + fastest.day +
     ' (' + (fastest.day / BEK_SEASON_DAYS).toFixed(1) + ' seasons), median ' + median.day +
     ', slowest ' + slowest.day + ' — last in: ' +
     Object.keys(bind).sort((a, b) => bind[b] - bind[a]).map(k => k + ' x' + bind[k]).join(', '));
}
