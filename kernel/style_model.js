/* The rules of the style meter, with no screen and no speaker in them.

   Every file that dies is points, a chain of them is worth more, and the points always bleed
   away once you stop. What makes it a climb rather than a counter is that every rank up is
   harder than the one before: it is further to the next rank, each file is worth a little less
   at the top than at the bottom (a single one; a pile keeps its price), the quiet you are allowed before the bleed goes to full gets shorter,
   the bleed itself (which never quite stops, even mid-chain) gets steeper, and the window a chain has
   to be kept alive in closes. A pile
   deleted at once (a folder, a whole selection) is worth more than its files one by one, but
   not in proportion, so twenty to eighty files in one go is what carries the top ranks, and
   it is only ever one of them: keeping HAPPY BIRTHDAY on screen is a matter of the next pile
   arriving before the last has drained.
   (scripts/check-style.mjs plays a few kinds of player against these numbers.) */
export const CFG = { BASE: 220, COMBO_STEP: 40, COMBO_MAX: 200, BULK_FULL: 12, BULK_EXP: 0.8, TOP_HOLD: 8, CEIL_OVER: 9000, DROP_BELOW: 700, GRACE_BLEED: 0.6 };

/* at: the points a rank starts at; grace: quiet seconds before the bleed; drain: points a second once it
   has started; gain: what a file is worth against the full price; chain: seconds a chain stays alive */
export const RANKS = [
  { key: 'D',   name: 'DESECRATING',         at: 0,     col: '#AAAAAA', grace: 2.4,  drain: 90,   gain: 1.00, chain: 3.5 },
  { key: 'C',   name: 'CORRUPTING',          at: 800,   col: '#55FF55', grace: 2.2,  drain: 150,  gain: 1.00, chain: 3.4 },
  { key: 'B',   name: 'BLASPHEMOUS',         at: 1900,  col: '#55FFFF', grace: 2.0,  drain: 230,  gain: 0.92, chain: 3.2 },
  { key: 'A',   name: 'ANNIHILATING',        at: 3500,  col: '#FFFF55', grace: 1.7,  drain: 340,  gain: 0.84, chain: 3.0 },
  { key: 'S',   name: 'SACRILEGIOUS',        at: 5800,  col: '#AA5500', grace: 1.4,  drain: 500,  gain: 0.76, chain: 2.7 },
  { key: 'SS',  name: 'SSCORCHED EARTH',     at: 8800,  col: '#FF5555', grace: 1.1,  drain: 720,  gain: 0.68, chain: 2.4 },
  { key: 'SSS', name: 'SSSTEFAN', at: 12600, col: '#FF55FF', grace: 0.85, drain: 1000, gain: 0.55, chain: 2.1 },
  { key: '!!!', name: 'HAPPY BIRTHDAY',      at: 17500, col: '#FFFFFF', grace: 0.6,  drain: 1600, gain: 0.40, chain: 1.8 }
];
export const TOP = RANKS.length - 1;

export const newRun = () => ({ pts: 0, tier: -1, combo: 0, last: -1e9, hold: 0, atTop: 0, crowned: false });

/* the files a pile counts as: the first dozen in full, the rest at a diminishing rate */
export const effective = n => n <= CFG.BULK_FULL ? n : CFG.BULK_FULL + Math.pow(n - CFG.BULK_FULL, CFG.BULK_EXP);

export function rankFor(p, tier) {
  if (p <= 0) return -1;
  let t = -1;
  for (let i = 0; i < RANKS.length; i++) if (p >= RANKS[i].at) t = i;
  /* a little give at the very top, so the rank does not flicker on the line */
  if (tier === TOP && t === TOP - 1 && p >= RANKS[TOP].at - CFG.DROP_BELOW) return TOP;
  return t;
}

/* n files died at time t (seconds). Returns the points that went in and the rank it left the meter at. */
export function hit(s, n, t) {
  const cur = Math.max(0, s.tier), r = RANKS[cur];
  if (t - s.last > r.chain) s.combo = 0;
  s.last = t;
  const files = effective(Math.max(1, n || 1));
  let gained = 0, left = files;
  while (left > 0) {
    const w = Math.min(1, left);
    gained += (CFG.BASE + Math.min(CFG.COMBO_MAX, s.combo * CFG.COMBO_STEP)) * w;
    s.combo += w; left -= w;
  }
  /* a single file is worth less the higher you are; a big pile is not marked down, which is why it is the pile that gets you to the top */
  gained *= r.gain + (1 - r.gain) * Math.max(0, Math.min(1, ((n || 1) - 1) / 30));
  s.pts = Math.min(RANKS[TOP].at + CFG.CEIL_OVER, s.pts + gained);
  const was = s.tier;
  s.tier = rankFor(s.pts, was);
  if (s.tier === TOP && !s.crowned) { s.crowned = true; s.hold = CFG.TOP_HOLD; }
  return { gained, was, tier: s.tier };
}

/* dt seconds on; t is now. The bleed opens after the rank's own grace, and is frozen during a hold. */
export function frame(s, dt, t) {
  if (s.tier < 0) return;
  if (s.hold > 0) s.hold -= dt;
  else {
    /* it never stops bleeding: while a chain is alive it bleeds at a fraction, and once the rank's own grace has gone, in full */
    const r = RANKS[s.tier], f = t - s.last > r.grace ? 1 : CFG.GRACE_BLEED;
    s.pts = Math.max(0, s.pts - r.drain * f * dt);
    s.tier = rankFor(s.pts, s.tier);
  }
  s.atTop = s.tier === TOP ? s.atTop + dt : 0;
}
/* how the meter should look: 0 at the bottom rank to 1 at the top */
export const intensity = tier => tier < 0 ? 0 : tier / TOP;
