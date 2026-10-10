/* What the arena pays in SUN (docs/sun-economy.md, scripts/check-sun.mjs). "Zero meta-progression" is a rule about the fighters (nothing carries between fights: no stats, no unlocks that
   change a fight), and SUN is the machine's money, not the game's, so paying it changes nothing a fight is. Nothing is paid for a fight lost or for two people fighting each other.

     arcade       a won match pays 100 + 30 for every stage already cleared, so a ladder is 1,330; a clear pays 1,000 more; a flawless round pays 25
     versus CPU   a won match 80
     survival     60 for each win
     time attack  a clear pays 600, and 300 more under four minutes
   all of it times the tier (EASY 0.5, NORMAL 1, HARD 2), and every payment in the last half hour takes 10 % off the next, down to 40 %, so that the same ladder run again
   and again is worth less than a run of fighters one has not just beaten. */

import { TIER_MULT } from './session.js';

const RECENT = [];
const WINDOW_MS = 30 * 60 * 1000;

export function decay(now) {
  while (RECENT.length && now - RECENT[0] > WINDOW_MS) RECENT.shift();
  return Math.max(0.4, 1 - 0.1 * RECENT.length);
}
export function resetDecay() { RECENT.length = 0; }

export const BASE = { match: 100, step: 30, clear: 1000, flawless: 25, cpu: 80, survival: 60, taClear: 600, taFast: 300 };
export const TA_FAST_SECS = 240;

/* the SUN for one finished fight, before the decay; the caller says what it was */
export function matchSun(mode, tier, stageIndex, won, flawlessRounds) {
  if (!won) return 0;
  const m = TIER_MULT[tier] || 1;
  if (mode === 'arcade') return Math.round((BASE.match + BASE.step * stageIndex + BASE.flawless * (flawlessRounds || 0)) * m);
  if (mode === 'cpu') return Math.round(BASE.cpu * m);
  if (mode === 'survival') return Math.round(BASE.survival * m);
  return 0;
}
export function clearSun(mode, tier, secs) {
  const m = TIER_MULT[tier] || 1;
  if (mode === 'arcade') return Math.round(BASE.clear * m);
  if (mode === 'timeattack') return Math.round((BASE.taClear + (secs < TA_FAST_SECS ? BASE.taFast : 0)) * m);
  return 0;
}
/* pays through the machine's economy if there is one; returns what was paid */
export function pay(sun, reason, now) {
  if (sun <= 0) return 0;
  const n = Math.round(sun * decay(now == null ? Date.now() : now));
  RECENT.push(now == null ? Date.now() : now);
  if (typeof window !== 'undefined' && window.Economy && window.Economy.earn) window.Economy.earn(n, 'STAND BATTLE: ' + reason, { game: 'standbattle' });
  return n;
}
