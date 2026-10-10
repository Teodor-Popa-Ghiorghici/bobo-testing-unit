/* How drunk the machine's owner is, as arithmetic and nothing else.

   A measure is not felt at once, and it is not forgotten at once either. It sits
   in the stomach and arrives in the blood with a time constant of half a minute;
   the body then clears the blood at a steady rate, one measure a minute, however
   much there is. What the screen shows is what is felt: the blood, and half of
   what is still on its way. At LIMIT the lights go.

   So the journey has a shape that no amount of clicking can bend, and it fits in
   one bottle (seventeen measures). The app lets a measure go down about every ten
   seconds at the very quickest (a pour, a drink and a breather), and at that pace
   it is a little under two minutes and thirteen measures to the floor, through
   every stage on the way; anybody who keeps at it, one every twenty seconds or so,
   is out before the bottle is; one measure a minute never gets anywhere (it settles at a tenth of a measure: sober);
   and stopping lets it drain, slowly. (scripts/check-drunk.mjs holds all of that
   to the numbers.)

   HOW STRONG IT IS IS FELT, NOT ONLY ADDED UP. A measure is worth abv / 35 Jägermeisters (`units`: the machine was calibrated on a 35 % bottle), and a stronger one is
   also quicker: it reaches the blood sooner (`proofOf`: the stomach's time constant falls from a minute for something thin to a dozen seconds for ninety-nine per cent) and
   more of it is felt while it is still on its way. And it is felt going DOWN, before any of that: `burnOf` is how hard a swallow of it hits the throat, 0 for water
   and for a cordial, a little for mead, the Jägermeister at about four tenths, and all of it for something that is mostly spirit. The Jägermeister itself is exactly what it always was. */
export const BAC = { LIMIT: 9, ABSORB: 30, CLEAR: 60, GUT_FEEL: 0.5, WAKE: 4 };

/* the stages the app can name, by how much of the limit is felt */
export const STAGES = [
  [0.0, 'SOBER'], [0.08, 'WARM'], [0.2, 'TIPSY'], [0.36, 'LOOSE'],
  [0.54, 'SLOSHED'], [0.74, 'HAMMERED'], [0.9, 'ABOUT TO GO']
];

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export const newBlood = () => ({ gut: 0, blood: 0, lots: [] });
/* what a measure of this strength does: how quickly it arrives, how much of it counts while it is on its way, and how hard it hits the throat. `units` is abv / 35. */
export function proofOf(units) {
  const c = clamp(units, 0, 3), abv = c * 35;
  return {
    tau: BAC.ABSORB / clamp(0.6 + 0.4 * c, 0.6, 2.0),          /* 49 s for something thin, 30 s for the Jägermeister, 17 s for ninety-nine per cent */
    feel: clamp(0.35 + 0.15 * c, 0.35, 0.8),                   /* the share of what is in the stomach that is already felt: 0.5 for the Jägermeister */
    burn: clamp(Math.pow(clamp((abv - 6) / 72, 0, 1), 0.9), 0, 1)
  };
}
/* how hard a swallow of this strength (a percentage, 0 to 99) hits on the way down, 0 to 1 */
export const burnOf = abv => proofOf(abv / 35).burn;
/* what to call it, for the line under the glass */
const HITS = [[0, 'NOTHING IN IT'], [3, 'WATER'], [9, 'MILD'], [16, 'SMOOTH'], [28, 'WARM'], [42, 'BITES'], [56, 'BURNS'], [72, 'RAW FIRE'], [90, 'LIKE SWALLOWING A MATCH']];
export const hitName = abv => { let n = HITS[0][1]; HITS.forEach(h => { if (abv >= h[0]) n = h[1]; }); return n; };

/* one measure; `units` is how many Jägermeisters it is worth (a gentler bottle counts for less, a stronger for more, water for none) */
export const swallow = (b, units = 1) => {
  if (units <= 0) return;
  const p = proofOf(units);
  (b.lots || (b.lots = [])).push({ a: units, tau: p.tau, feel: p.feel });
  b.gut += units;
};
export function step(b, dt) {
  let gut = 0, arrived = 0;
  const lots = b.lots || (b.lots = []);
  for (let i = lots.length - 1; i >= 0; i--) {
    const l = lots[i], a = l.a * (1 - Math.exp(-dt / l.tau));
    l.a -= a; arrived += a;
    if (l.a < 1e-4) { arrived += l.a; lots.splice(i, 1); } else gut += l.a;
  }
  b.gut = gut;
  b.blood = Math.max(0, b.blood + arrived - dt / BAC.CLEAR);
}
export const felt = b => b.blood + (b.lots || []).reduce((s, l) => s + l.a * l.feel, 0);
export const over = b => felt(b) >= BAC.LIMIT;
/* 0..1, how hard the screen is hit: the early drinks barely show, the late ones do */
export const levelOf = b => clamp(Math.pow(felt(b) / BAC.LIMIT, 0.85), 0, 1);
export function stageOf(b) {
  const f = felt(b) / BAC.LIMIT;
  let name = STAGES[0][1];
  STAGES.forEach(s => { if (f >= s[0]) name = s[1]; });
  return name;
}
/* what is left in the blood when somebody comes round */
export const wake = b => { b.gut = 0; b.lots = []; b.blood = BAC.WAKE; };
