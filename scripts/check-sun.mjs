/* node scripts/check-sun.mjs -- the SUN budget (pure Node). docs/sun-economy.md says what it is and why; this holds every game to it.
   Each game gets a *model of an hour of playing it* (the assumptions are written next to the numbers, and they are the part to argue with),
   run through the game's real tables (the pay.js / levels.js / data.js it pays from, never a copy), and the answer has to sit in the band.
   A game that is changed so that it pays ten times what it did, or a tenth, fails here before anybody finds out by playing it.
   The garden is the machine's engine and is held by apps/garden/garden_check.js (99,999 SUN in 15 minutes to 2.8 hours depending on how
   equipped the player is and how often they visit); everything else is here. */
import { dealPay, winPay, cardsPay } from '../apps/solitaire/pay.js';
import { LEVELS, rate, payout, secs } from '../apps/aftere/levels.js';
import { totalPay, benchPay } from '../apps/cook/pay.js';
import { achSun } from '../apps/magen/pay.js';
import { MG_ACH } from '../apps/magen/data.js';
import { questSun, HOUSE_SUN, LOFT_SUN } from '../apps/bekkedal/pay.js';
import { BEK_QUESTS } from '../apps/bekkedal/data.js';
import { matchSun, clearSun, pay as sbPay, resetDecay as sbReset, BASE as SB } from '../apps/standbattle/pay.js';
import { LADDER_LENGTH as SB_FIGHTS } from '../apps/standbattle/ladder.js';
import { classicPay, roomPay, parOf, SUN_PER_GEO } from '../apps/sweeper/pay.js';
import { CLASSIC, NODES } from '../apps/sweeper/data.js';
import { LESSONS } from '../apps/holyc/lessons.js';
import { PUZZLES, CHAPTERS } from '../apps/holyc/puzzles.js';
import { LESSON_SUN, puzzleSun, CHAPTER_SUN, SEEN_SHARE } from '../apps/holyc/pay.js';
import * as COS from '../kernel/cos_data.js';
import { createTrophies } from '../kernel/trophies_core.js';
import { registerAll } from '../kernel/trophies_defs.js';

let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log('FAIL ' + m); } };
const rows = [];
const row = (app, model, perHour, lo, hi) => {
  rows.push([app, model, Math.round(perHour)]);
  ok(perHour >= lo && perHour <= hi, app + ': ' + Math.round(perHour) + ' SUN an hour (' + model + ') is outside ' + lo + ' to ' + hi);
};

/* ---- the bands: an hour of active play, in SUN. The floor is what makes a game worth the hour at all, the ceiling is what keeps the
   shop (about 96,000 SUN of things that are not the 99,999 frame) from being bought in an afternoon by whichever game is easiest. ---- */
const LO = 1500, HI = 12000;

/* SOLITAIRE: a deal is ten minutes, won one time in four in about 150 moves; a lost deal is thrown away with about fourteen cards home. */
{
  const win = dealPay(52, 150, true), lost = dealPay(14, 180, false), perDeal = 0.25 * win + 0.75 * lost;
  row('SOLITAIRE', 'a deal every 10 min, 1 in 4 won in 150 moves, 14 cards home otherwise', perDeal * 6, 2500, 6000);
  ok(winPay(150) > 5 * cardsPay(14), 'SOLITAIRE: a win is worth far more than a pile of cards that did not get there');
}

/* AFTEREGYPT: a player flies the dearest way they can clear about as often as they fail it, collecting half the coins. The rate is
   what a clear is worth a minute of flying; `rate` is held to climb by apps/aftere/aftere_check.js. */
{
  const success = { pilgrim: 1, scribe: 0.9, priest: 0.75, pharaoh: 0.5, temple: 0.15 };      /* of attempts, for someone who plays that way at all */
  LEVELS.forEach(L => {
    const perMin = rate(L) * success[L.id];
    row('AFTEREGYPT ' + L.name, 'flown back to back, cleared ' + Math.round(success[L.id] * 100) + '% of the time', perMin * 60, L.id === 'pilgrim' ? 1500 : 2000, 9000);
  });
  const first = LEVELS.reduce((n, L) => n + L.first, 0);
  ok(first > 1500 && first < 3500, 'AFTEREGYPT: the first-clear prizes of the ladder are ' + first + ' SUN, a few thousand, once');
  const perfect = payout(LEVELS[4], { won: true, coins: 40, hits: 0 }, true);
  ok(perfect.total > LEVELS[4].pay * 2, 'AFTEREGYPT: a first, flawless clear of the temple is worth well over a plain one (' + perfect.total + ')');
  ok(secs(LEVELS[0]) < 25, 'AFTEREGYPT: a PILGRIM flight is under 25 s, so it is not the thing to farm');
}

/* THE COOK: every medal of every bench, once, over about three and a half hours of puzzles. */
{
  const all = totalPay([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  row('THE COOK', 'all eleven benches, three medals each, once, in 3.5 hours', all / 3.5, 1500, 3500);
  ok(benchPay(1, 7) > 0 && benchPay(11, 7) > benchPay(1, 7) && benchPay(3, 0) === 0, 'THE COOK: later benches pay more, and a medal already earned pays nothing');
}

/* MAGEN: ninety-eight mitzvot over an idle game that is looked at for about six hours before most of them are in. */
{
  const all = MG_ACH.reduce((n, a) => n + achSun(a), 0);
  row('MAGEN', MG_ACH.length + ' mitzvot, all of them, in 6 hours of attention (' + all + ' SUN)', all / 6, 1500, 5000);
}

/* BEKKEDAL: the seven requests of the board, the house and the loft, over a run of eight real hours. (The board's repeatable requests are on top.) */
{
  const q = BEK_QUESTS.reduce((n, x) => n + questSun(x.kr), 0), all = q + HOUSE_SUN + LOFT_SUN;
  row('BEKKEDAL', BEK_QUESTS.length + ' requests (' + q + '), the house (' + HOUSE_SUN + ') and the loft (' + LOFT_SUN + '), in 8 hours', all / 8, 1500, 3500);
  ok(LOFT_SUN > HOUSE_SUN && HOUSE_SUN > questSun(1000), 'BEKKEDAL: the loft pays more than the house, the house more than any one request');
}

/* STAND BATTLE: the arcade ladder on NORMAL, six fights, a ladder in about twenty minutes (apps/standbattle/budget_bot.js measures it: 17 to 24 a ladder, a lost match in three), so three in an hour.
   A won match pays 100 + 30 a stage already cleared and a clear 1,000; the last half hour's payments each take 10 % off the next (pay.js decay, run here through the real function with the
   real clock of the model: a win about every three minutes, the clear at the end of a ladder), so the second and third ladder of an hour are worth much less than the first. A lost match pays nothing. */
{
  sbReset();
  let total = 0, t = 0;
  for (let ladder = 0; ladder < 3; ladder++) {
    for (let i = 0; i < SB_FIGHTS; i++) { t += 3 * 60 * 1000; total += sbPay(matchSun('arcade', 'normal', i, true, 0), 'win', t); }
    total += sbPay(clearSun('arcade', 'normal'), 'clear', t);
  }
  sbReset();
  const first = (() => { let s2 = 0, t2 = 0; for (let i = 0; i < SB_FIGHTS; i++) { t2 += 3 * 60 * 1000; s2 += sbPay(matchSun('arcade', 'normal', i, true, 0), 'win', t2); } return s2 + sbPay(clearSun('arcade', 'normal'), 'clear', t2); })();
  sbReset();
  row('STAND BATTLE', 'three NORMAL ladders in an hour, a win every 3 min, decay on (the first ladder alone is ' + first + ')', total, 2500, 9000);
  ok(clearSun('arcade', 'hard') === 2 * clearSun('arcade', 'normal') && clearSun('arcade', 'easy') * 2 === clearSun('arcade', 'normal'), 'STAND BATTLE: a tier is a multiplier on the pay, 0.5 / 1 / 2');
  ok(matchSun('arcade', 'normal', 0, false, 0) === 0 && matchSun('versus', 'normal', 0, true, 0) === 0, 'STAND BATTLE: a lost fight and two people fighting each other pay nothing');
  ok(matchSun('survival', 'normal', 0, true, 0) === SB.survival && matchSun('cpu', 'normal', 0, true, 0) === SB.cpu, 'STAND BATTLE: survival and versus CPU pay their table');
}

/* DUNGEON SWEEPER, the plain game: THE HIVE won in about four minutes, one game in two, back to back. The farm factor (pay.js) is in it. */
{
  const hv = CLASSIC.find(l => l.id === 'm'), sh = CLASSIC.find(l => l.id === 'e'), dp = CLASSIC.find(l => l.id === 'h');
  const hour = (lv, secsPerWin, winsPerHour) => { let st = [], sum = 0; for (let i = 0; i < winsPerHour; i++) { const t = i * 3600000 / winsPerHour; sum += classicPay(lv, secsPerWin, st, t).total; st.push(t); } return sum; };
  row('SWEEPER THE HIVE', 'wins 8 of 16 games in an hour, 4 min each', hour(hv, 240, 8), 2000, 6000);
  row('SWEEPER THE DEEP', '5 wins an hour, 10 min each', hour(dp, 600, 5), 2500, 8000);
  row('SWEEPER SHALLOWS', 'an expert: a win every 20 s for an hour (the farm factor is what holds it)', hour(sh, 15, 180), 1000, 5000);
}
/* the campaign: eighteen rooms, a first walk of about four hours, then repeats at 40 % */
{
  let first = 0, again = 0, uFirst = 0, uAgain = 0;
  Object.values(NODES).forEach(n => {
    const f = roomPay(n, parOf(n) * 0.8, { first: true }).total, a = roomPay(n, parOf(n) * 0.8, {}).total;
    if (n.act === 2) { uFirst += f; uAgain += a; } else { first += f; again += a; }
  });
  row('SWEEPER THE DESCENT', 'a first walk: eighteen rooms and six guardians in 4 hours', first / 4, 2000, 5000);
  row('SWEEPER THE DESCENT AGAIN', 'the same eighteen rooms again in 2.5 hours, at 40 %', again / 2.5, 800, 3000);
  /* the Underdeep needs a build and many tries: nine rooms and three guardians, about eight hours the first time (most of it spent losing masks), a long afternoon again */
  row('SWEEPER THE UNDERDEEP', 'a first walk: nine rooms and three guardians in 8 hours', uFirst / 8, 1500, 4500);
  row('SWEEPER THE UNDERDEEP AGAIN', 'the same nine rooms again in 4 hours, at 40 %', uAgain / 4, 500, 2500);
  ok(SUN_PER_GEO === 4, 'SWEEPER: four SUN a geo');
}

/* HOLYC.EXE: seven lessons and fifty-odd puzzles, once each, over about six and a half hours of reading and typing (a puzzle is a few minutes, a
   lesson ten). Reading the answer pays a quarter of a puzzle, and a player who does that for all of them is paid a fraction. */
{
  const all = PUZZLES.reduce((a, p) => a + puzzleSun(p.stars, false), 0) + LESSONS.length * LESSON_SUN + CHAPTERS.length * CHAPTER_SUN;
  const copied = PUZZLES.reduce((a, p) => a + puzzleSun(p.stars, true), 0) + LESSONS.length * LESSON_SUN;
  row('HOLYC.EXE', PUZZLES.length + ' puzzles, ' + LESSONS.length + ' lessons and ' + CHAPTERS.length + ' chapters, once each, in 6.5 hours (' + all + ' SUN)', all / 6.5, 1500, 3500);
  ok(copied < all * 0.5 && SEEN_SHARE === 0.25, 'HOLYC.EXE: looking up every answer pays less than half');
}

/* THE LEDGER: every trophy pays once, by tier (15 / 40 / 100 SUN), a game's mastery seal and its completionist trophies far more (kernel/trophy_rewards.js: the whole of an app is
   hours of play, so it is paid like hours of play), so the whole of it is a fixed sum that does not grow with playing. Mirrors (the Cook's and Magen's own) pay nothing a second time.
   It is most of a shop's worth, spread over the life of the machine: the big sums are the ones that take a whole game to earn, never a first evening. */
const LEDGER = (() => {
  const T = createTrophies({ read: () => null, write: () => {}, pay: () => {}, announce: () => {} });
  registerAll(T);
  const all = [...T.defs.values()].filter(d => !d.legacy);
  const small = all.filter(d => d.pay <= 100);
  return { n: all.length, sun: all.reduce((a, d) => a + d.pay, 0), top: Math.max(...all.map(d => d.pay)), small: small.reduce((a, d) => a + d.pay, 0), nSmall: small.length };
})();
ok(LEDGER.n > 350 && LEDGER.sun > 100000 && LEDGER.sun < 160000, 'the ledger is ' + LEDGER.n + ' trophies and ' + LEDGER.sun + ' SUN, between 100,000 and 160,000');
ok(LEDGER.top <= 25000, 'no trophy pays more than 25,000 (' + LEDGER.top + ')');
ok(LEDGER.small > 8000 && LEDGER.small < 22000, 'the ordinary trophies (100 SUN or under, ' + LEDGER.nSmall + ' of them) stay a small slice of the shelves: ' + LEDGER.small + ' SUN');

/* ---- the shop: what there is to buy, and how long it is to buy it ------------------------------------------------------------------ */
{
  let total = 0, frame = 0;
  ['FRAMES', 'LOGOS', 'CURSORS', 'SCHEMES', 'POTS', 'SPECIES', 'WALLS', 'CRAYON', 'GARAGE', 'DRINKS', 'ELEPHANT'].forEach(k => COS[k].forEach(it => { total += it.price || 0; if ((it.price || 0) >= 99999) frame = it.price; }));
  const rest = total - frame, steady = rows.filter(r => /^(SOLITAIRE|THE COOK|MAGEN|BEKKEDAL|STAND BATTLE|SWEEPER THE HIVE|HOLYC)/.test(r[0])).map(r => r[2]);
  const mean = steady.reduce((a, b) => a + b, 0) / steady.length;
  ok(frame === 99999, 'the third temple frame is the 99,999 joke');
  ok(rest > 60000 && rest < 140000, 'the rest of the shelves cost ' + rest + ' SUN');
  console.log('  the shop is ' + total + ' SUN; without the 99,999 frame ' + rest + '; at the mean of the games here (' + Math.round(mean) + ' an hour) the rest is ' + (rest / mean).toFixed(1) + ' hours of play outside the garden');
  /* the band was 8 to 40 hours; Dave's shelves have grown (frames, schemes, thirty-eight backdrops) to a little over 43, and that was the decision, so the top of it is 45 */
  ok(rest / mean > 8 && rest / mean < 45, 'the rest of the shop is between 8 and 45 hours of games other than the garden');
}

console.log('\n  the ledger: ' + LEDGER.n + ' trophies, ' + LEDGER.sun + ' SUN once, ever');
console.log('\n' + rows.map(r => '  ' + r[0].padEnd(28) + String(r[2]).padStart(7) + ' SUN/hr   ' + r[1]).join('\n'));
console.log(bad ? '\nFAILED ' + bad : '\nok  - the SUN budget holds (' + rows.length + ' models, band ' + LO + ' to ' + HI + ' unless a game says otherwise)');
process.exit(bad ? 1 : 0);
