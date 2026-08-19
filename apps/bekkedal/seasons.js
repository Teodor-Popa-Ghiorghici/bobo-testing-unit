/* Bekkedal — the seasonal layer.
 *
 * Pure functions of `day`, same convention as noise.js/light.js/quests.js:
 * nothing here is seeded, nothing here is saved, and nothing here mutates
 * anything. index.js calls seasonIndexOf()/festivalOf() every newDay() and
 * assigns the result straight onto S.season/S.festival — it never increments
 * either field on its own, so the two can never drift apart from S.day: a
 * stale save just gets them recomputed on load the same way a fresh one gets
 * them assigned on day 1 (see heal() in index.js).
 *
 * cropInSeason() is what plant() (index.js) reads to gate a seed; rollWeather()
 * is what newDay() (index.js) reads instead of the old flat 20/10/70 split.
 */
import { BEK_SEASON_DAYS, BEK_SEASONS, BEK_SEASON_WEATHER, BEK_FESTIVALS, BEK_CROPS } from './data.js';

/* day is 1-based throughout the app (fresh() starts S.day at 1); clamp so a
   stray 0 or negative never sends the modulo arithmetic negative. */
const clampDay = day => Math.max(1, day | 0 || 1);

export function seasonIndexOf(day) {
  return Math.floor((clampDay(day) - 1) / BEK_SEASON_DAYS) % BEK_SEASONS.length;
}
export const seasonOf = day => BEK_SEASONS[seasonIndexOf(day)];

/* 1-based position within the current season, so day 1 of a season reads as
   day 1 and BEK_FESTIVALS' own `day` field is stated the same way. */
export const dayOfSeason = day => ((clampDay(day) - 1) % BEK_SEASON_DAYS) + 1;

/* the season's own festival definition, only on the day it actually falls —
   null every other day. Returns the BEK_FESTIVALS entry itself (day, map,
   dress, title) rather than a copy, since nothing here ever mutates it. */
export function festivalOf(day) {
  const s = seasonOf(day);
  const f = BEK_FESTIVALS[s.id];
  return f && dayOfSeason(day) === f.day ? f : null;
}
export const isFestivalDay = day => !!festivalOf(day);

/* whichever season crop.seasons omits, it may be planted in year-round —
   but every entry in BEK_CROPS currently declares one, so in practice this
   is always a real check. */
export function cropInSeason(crop, day) {
  if (!crop || !crop.seasons) return true;
  return crop.seasons.indexOf(seasonOf(day).id) >= 0;
}

/* replaces the old flat 20% rain / 10% fog / 70% clear split with per-season
   odds (BEK_SEASON_WEATHER) — still one roll, still fully random, just off
   different odds depending on the time of year. */
export function rollWeather(day, rand) {
  rand = rand || Math.random;
  const w = BEK_SEASON_WEATHER[seasonOf(day).id];
  const r = rand();
  return r < w.regn ? 'regn' : r < w.regn + w.take ? 'take' : 'klar';
}
