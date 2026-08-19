/* Bekkedal palette check — `node apps/bekkedal/palette_check.js`
 *
 * A palette is a set of promises the art relies on and no screenshot can
 * verify. A ramp that is not monotonic in value puts a highlight below its
 * own base at one hour of the day and above it at another. A gap between two
 * steps too wide to dither across is a gap that shows as a hard edge wherever
 * a patch feathers. A decorative mark outside its surface's contrast band is
 * the confetti this palette was built to end. And a mark declared as a
 * feature but sitting quietly inside the band is a mark that dodged the
 * check by being filed in the wrong table.
 *
 * Three sections:
 *   identity   — 0..15 are still bit-exact VGA16 and no two entries collide;
 *   ramps      — monotonic in luminance, no step wider than the ceiling, and
 *                actually hue-shifted rather than one hue scaled up and down;
 *   contrast   — every declared mark inside its surface's band, every
 *                declared shadow below its surface and not past the floor,
 *                every declared feature genuinely outside the band.
 *
 * Two more sections join these once the lighting curve lands: that no hour
 * reorders the palette by luminance, and that the darkest hour still leaves
 * enough separation on every map to navigate by.
 */
import { PAL, PAL_N, VGA16, RAMPS, MARKS, SHADOWS, FEATURES, lum, sameRampNeighbour,
         RAMP_STEP_MAX, RAMP_STEP_MAX_WAR, MARK_BAND, SHADOW_MAX } from './palette.js';

let fails = 0, checks = 0;
const ok = (cond, label, detail) => {
  checks++;
  if (cond) { console.log('OK   ' + label.padEnd(52) + (detail || '')); return true; }
  fails++; console.log('FAIL ' + label.padEnd(52) + (detail || ''));
  return false;
};
const f3 = n => n.toFixed(3);


/* ---- 1. identity --------------------------------------------------------- */
console.log('\n-- identity --');
{
  let bad = [];
  for (let i = 0; i < 16; i++) {
    if (PAL[i][0] !== VGA16[i][0] || PAL[i][1] !== VGA16[i][1] || PAL[i][2] !== VGA16[i][2]) bad.push(i);
  }
  ok(bad.length === 0, 'indices 0-15 are still bit-exact VGA16', bad.length ? 'drifted: ' + bad.join(', ') : '16 entries');
  ok(PAL_N === 64, 'the palette is sixty-four entries', PAL_N + ' entries');

  const seen = new Map(), dups = [];
  PAL.forEach((p, i) => {
    const k = p.join(',');
    if (seen.has(k)) dups.push(seen.get(k) + '=' + i + ' (' + k + ')'); else seen.set(k, i);
  });
  ok(dups.length === 0, 'no two indices are the same colour', dups.length ? dups.join('; ') : PAL_N + ' distinct');

  /* every index above 15 belongs to exactly one declared ramp — an entry no
     ramp claims is a swatch, and a swatch is budget nothing tests */
  const claimed = new Set();
  Object.values(RAMPS).forEach(r => r.forEach(i => claimed.add(i)));
  const orphans = [];
  for (let i = 16; i < PAL_N; i++) if (!claimed.has(i)) orphans.push(i);
  ok(orphans.length === 0, 'every new index belongs to a declared ramp', orphans.length ? 'orphans: ' + orphans.join(', ') : claimed.size + ' claimed');
}

/* ---- 2. the ramps -------------------------------------------------------- */
console.log('\n-- ramps --');
{
  const nonmono = [], gaps = [], flat = [];
  for (const name of Object.keys(RAMPS)) {
    const r = RAMPS[name], ceil = name === 'WAR' ? RAMP_STEP_MAX_WAR : RAMP_STEP_MAX;
    for (let i = 0; i + 1 < r.length; i++) {
      const a = lum(r[i]), b = lum(r[i + 1]);
      if (b <= a) nonmono.push(name + '[' + i + '->' + (i + 1) + '] ' + f3(a) + ' -> ' + f3(b));
      else if (b - a > ceil) gaps.push(name + '[' + i + '->' + (i + 1) + '] ' + f3(b - a));
    }
    /* hue-shift, not a value scale: the shadow end and the highlight end must
       not sit on the same line through the origin in RGB. Compare the
       red-minus-blue lean, normalised — a pure value scale keeps it fixed. */
    const lo = PAL[r[0]], hi = PAL[r[r.length - 1]];
    const lean = p => (p[0] - p[2]) / Math.max(1, p[0] + p[1] + p[2]);
    if (Math.abs(lean(hi) - lean(lo)) < 0.02) flat.push(name + ' ' + f3(lean(lo)) + ' -> ' + f3(lean(hi)));
  }
  ok(nonmono.length === 0, 'every ramp climbs in luminance', nonmono.join('; ') || Object.keys(RAMPS).length + ' ramps');
  ok(gaps.length === 0, 'no step wider than a dither can cross', gaps.join('; ') || 'ceiling ' + RAMP_STEP_MAX + ' (' + RAMP_STEP_MAX_WAR + ' on WAR)');
  ok(flat.length === 0, 'every ramp shifts hue as well as value', flat.join('; ') || 'shadow leans cool, highlight leans warm');
}

/* ---- 3. the contrast bands ----------------------------------------------- */
console.log('\n-- contrast --');
{
  const out = [];
  for (const name of Object.keys(MARKS)) {
    const m = MARKS[name], base = lum(m.on);
    m.cols.forEach((c, i) => {
      const d = Math.abs(lum(c) - base);
      if (d > MARK_BAND && !sameRampNeighbour(m.on, c)) out.push(name + '[' + i + '] ' + f3(d) + ' from base ' + f3(base));
    });
  }
  ok(out.length === 0, 'every mark sits inside its surface band',
     out.join('; ') || Object.keys(MARKS).length + ' tables, band +/-' + MARK_BAND + ' or one step of the surface\'s own ramp');

  const badShadow = [];
  for (const name of Object.keys(SHADOWS)) {
    const s = SHADOWS[name], base = lum(s.on);
    s.cols.forEach((c, i) => {
      const d = base - lum(c);
      if (d <= 0) badShadow.push(name + '[' + i + '] is not darker than its surface');
      else if (d > SHADOW_MAX) badShadow.push(name + '[' + i + '] ' + f3(d) + ' below base');
    });
  }
  ok(badShadow.length === 0, 'every shadow is darker, and not past the floor',
     badShadow.join('; ') || Object.keys(SHADOWS).length + ' tables, floor ' + SHADOW_MAX);

  /* A feature that happens to sit inside the band is not a feature — it is a
     mark that dodged the check by being declared in the wrong table. */
  const tame = [];
  for (const name of Object.keys(FEATURES)) {
    const f = FEATURES[name], base = lum(f.on);
    if (f.cols.every(c => Math.abs(lum(c) - base) <= MARK_BAND || sameRampNeighbour(f.on, c))) tame.push(name);
  }
  ok(tame.length === 0, 'every feature actually breaks the band',
     tame.length ? 'inside the band: ' + tame.join(', ') : Object.keys(FEATURES).length + ' declared features');
}

console.log('\n' + (fails ? fails + ' of ' + checks + ' palette checks FAILED.' : 'All ' + checks + ' palette checks pass.') + '\n');
process.exit(fails ? 1 : 0);
