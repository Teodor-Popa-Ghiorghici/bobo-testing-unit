/* Bekkedal palette check — `node apps/bekkedal/palette_check.js`
 *
 * A palette is a set of promises the art relies on and no screenshot can
 * verify. A ramp that is not monotonic in value puts a highlight below its
 * own base at one hour of the day and above it at another. A gap between two
 * steps too wide to dither across is a gap that shows as a hard edge wherever
 * a patch feathers. A decorative mark outside its surface's contrast band is
 * the confetti this palette was built to end. A mark declared as a feature
 * but sitting quietly inside the band is a mark that dodged the check by
 * being filed in the wrong table. And a night curve that flattens a walkable
 * tile into the wall beside it is a night you cannot navigate.
 *
 * Five sections:
 *   identity   — 0..15 are still bit-exact VGA16 and no two entries collide;
 *   ramps      — monotonic in luminance, no step wider than the ceiling, and
 *                actually hue-shifted rather than one hue scaled up and down;
 *   contrast   — every declared mark inside its surface's band, every
 *                declared shadow below its surface and not past the floor,
 *                every declared feature genuinely outside the band;
 *   light      — no hour reorders the palette by luminance, the curve is
 *                continuous rather than stepped, and the day resolves to a
 *                bounded number of distinct light keys (which is what the
 *                terrain cache pays for);
 *   floors     — at the darkest hour there is still enough separation to
 *                navigate by, on every map, between walkable and solid and
 *                between the player and the ground under them. A pretty
 *                night you cannot navigate is a bug however good it looks.
 */
import { PAL, PAL_N, VGA16, RAMPS, lum, sameRampNeighbour, RAMP_STEP_MAX,
         RAMP_STEP_MAX_WAR, MARK_BAND, SHADOW_MAX } from './palette.js';
import { MARKS, SHADOWS, FEATURES } from './palette_marks.js';
import { lightAt, lutAt, lutOf, LIGHT_ANCHORS, lightKey, CAVE_LIGHT, MINE_LIGHT,
         mineLight, DAY_LUT, lumOf, shelter } from './light.js';
import { lampState, relightCoef } from './lamp.js';
import { BEK_MAPS, mapCols, mapRows, BEK_SOLID } from './data.js';
import { groundOf, solidOf, inside as insideMap, isCave } from './surface.js';
import { mineFloor, mineBand, MINE_BANDS } from './mine.js';

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


/* ---- 4. the light curve -------------------------------------------------- */
console.log('\n-- light --');
{
  /* Night is a remap, not an overlay, and the whole reason that works is that
     a grass tile is still readable as grass at midnight. It is readable
     because the transform is a desaturation, a *scalar* exposure and an
     additive tint, which works out to lum(out) = k*lum(in) + const — affine
     and increasing, so it cannot swap two entries however dark it gets.
     Assert the consequence rather than the implementation, because the
     consequence is what the art relies on and someone will add an anchor. */
  /* Rounding to whole channel values costs about half a point of luminance
     per entry, and at a midnight exposure of a third that is enough to swap
     two entries the palette put a hair apart. So the claim is stated where it
     means something: any two entries the eye could tell apart in daylight
     stay in the same order at every hour, indoors, outdoors and underground.

     Local light is inside this claim and not beside it. A pool resolves what
     it lights toward `lampState` — another state of the same shape, blended
     toward daylight the way `shelter` blends a room and then given an
     additive warm tint — so it is a table like
     any other and it has to keep the ordering too, or a lit floor could come
     out reading as a lit wall. That is checked here rather than in lamp.js
     because it is a property of the transform, not of the pass. */
  const TIE = 0.02;
  let swaps = 0, worst = '';
  const states = [];
  const lamps = [];
  for (let min = 0; min < 24 * 60; min += 10) {
    const out = lightAt(min), ins = shelter(out, 0.5), dark = 1 - out.k;
    states.push(lutAt(min, false), lutAt(min, true));
    lamps.push(lutOf(lampState(out, dark)), lutOf(lampState(ins, dark)));
  }
  states.push(lutOf(CAVE_LIGHT));
  lamps.push(lutOf(lampState(CAVE_LIGHT, 1 - CAVE_LIGHT.k)));
  states.push(...lamps);
  for (let i = 0; i < PAL_N; i++) for (let j = i + 1; j < PAL_N; j++) {
    const d = lum(i) - lum(j);
    if (Math.abs(d) <= TIE) continue;
    for (const L of states) {
      const e = lumOf(L[i]) - lumOf(L[j]);
      if (d > 0 ? e <= 0 : e >= 0) { swaps++; worst = worst || (i + ' vs ' + j); }
    }
  }
  ok(swaps === 0, 'no hour reorders the palette by luminance',
     swaps ? swaps + ' swaps, first ' + worst
           : states.length + ' states (' + lamps.length + ' of them local light) x every pair more than '
             + TIE + ' apart in daylight');

  /* And that a pool applied to an already-rendered pixel lands on the same
     colour as rendering that entry through the pool's own table would have.
     `relightCoef` inverts the hour in closed form so a pool never has to draw
     the map a second time; the inversion is exact in the reals and the error
     here is only what the forward pass threw away — the rounding `lutOf`
     already did, plus the clamp where an hour's tint pushed a channel of an
     already-black entry below zero and it stuck at 0 with nothing left to
     invert. Both are bounded and neither is visible; the claim is that bound
     rather than equality. If this drifts, the closed form is wrong. */
  let derr = 0, derrAt = '';
  for (let min = 0; min < 24 * 60; min += 10) for (const indoors of [false, true]) {
    const from = indoors ? shelter(lightAt(min), 0.5) : lightAt(min);
    const to = lampState(from, 1 - lightAt(min).k);
    const A = lutOf(from), B = lutOf(to), co = relightCoef(from, to);
    for (let i = 0; i < PAL_N; i++) {
      const p = A[i], l = 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
      for (let ch = 0; ch < 3; ch++) {
        const got = Math.max(0, Math.min(255, Math.round(co.P * l + co.Q * p[ch] + co.D[ch])));
        const d = Math.abs(got - B[i][ch]);
        if (d > derr) { derr = d; derrAt = 'index ' + i + ' at ' + (min / 60 | 0) + ':00'; }
      }
    }
  }
  ok(derr <= 8, 'a pool lands on the daylight palette, not near it',
     'largest channel error ' + derr + (derrAt ? ' (' + derrAt + ')' : '') + ' of 255');

  /* and it is a curve, not two if-statements. The state is quantised so the
     terrain cache is not rebuilt every frame, so there *are* steps — the
     assertion is that no one of them is big enough to see the hour turn
     over. Ten minutes of game time is two and a half real seconds. */
  let jump = 0, jumpAt = '';
  for (let min = 0; min < 24 * 60; min += 10) {
    const a = lutAt(min, false), b = lutAt((min + 10) % (24 * 60), false);
    for (let i = 0; i < PAL_N; i++) for (let k = 0; k < 3; k++) {
      const d = Math.abs(a[i][k] - b[i][k]);
      if (d > jump) { jump = d; jumpAt = (min / 60 | 0) + ':' + String(min % 60).padStart(2, '0'); }
    }
  }
  ok(jump <= 14, 'the curve is continuous across the day',
     'largest ten-minute channel step ' + jump + ' at ' + jumpAt);

  /* the terrain cache rebuilds once per distinct key, so the count is the
     bill. Flat stretches of the curve cost nothing: 10:00 to 16:00 is one. */
  const keys = new Set();
  for (let min = 0; min < 24 * 60; min++) keys.add(lightKey(min, false));
  ok(keys.size <= 400, 'the day resolves to a bounded number of light keys',
     keys.size + ' rebuilds a day outdoors, from ' + LIGHT_ANCHORS.length + ' authored anchors');

  /* daylight must leave the art alone: what the art was authored in has to be
     what it looks like at noon, or the palette and the picture have quietly
     become two different things */
  const noon = lutAt(12 * 60, false);
  let drift = 0;
  for (let i = 0; i < PAL_N; i++) for (let k = 0; k < 3; k++) drift = Math.max(drift, Math.abs(noon[i][k] - PAL[i][k]));
  ok(drift === 0, 'midday is the palette, untouched', 'largest channel drift ' + drift);
  ok(DAY_LUT.length === PAL_N, 'the chrome has a full daylight table to draw from', DAY_LUT.length + ' entries');
}

/* ---- 5. the navigation floors -------------------------------------------- */
console.log('\n-- floors at the darkest hour --');
{
  /* Stated as a relative contrast rather than a bare luminance difference.
     Exposure at midnight is about a third, so every difference in the scene
     is a third of what it was — measuring the raw gap would say the night is
     unnavigable when what has actually happened is that the whole scene moved
     down together, which the eye adapts to. |a-b| / (a+b+k) is the standard
     way to say that, and it is what the eye is closer to doing. */
  const GROUND_FLOOR = 0.055;         /* walkable against the solid beside it */
  const ACTOR_FLOOR  = 0.140;         /* the player against the ground under  */
  /* Everything person() draws the player from — ink, hair, skin, shirt,
     pants. The question worth asking is not whether the shirt separates from
     the ground (a blue shirt on a plank pier never will) but whether *any*
     part of the sprite does, which is what the ink outline is for. */
  const PLAYER = [RAMPS.ATMO[0], RAMPS.TIM[1], RAMPS.SAN[2], RAMPS.WAT[4], RAMPS.ATMO[2]];
  const contrast = (a, b) => Math.abs(a - b) / (a + b + 0.05);

  let darkMin = 0, darkest = 2;
  for (let min = 0; min < 24 * 60; min += 5) {
    const e = lightAt(min).exposure;
    if (e < darkest) { darkest = e; darkMin = min; }
  }
  const thinG = [], thinA = [];
  let worstG = 9, worstA = 9;
  for (const mp of Object.keys(BEK_MAPS)) {
    const rows = BEK_MAPS[mp].rows;
    const L = isCave(mp) ? lutOf(CAVE_LIGHT) : lutAt(darkMin, insideMap(mp));
    const lu = i => lumOf(L[i]);
    const H = mapRows(mp), W = mapCols(mp);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = rows[y].charAt(x);
      if (c === ' ') continue;                    /* the dead margin is meant to be black */
      if (BEK_SOLID.indexOf(c) >= 0) {
        for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + d[0], ny = y + d[1];
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const n = rows[ny].charAt(nx);
          if (n === ' ' || BEK_SOLID.indexOf(n) >= 0) continue;
          const v = contrast(lu(solidOf(mp, c)), lu(groundOf(mp, n)));
          if (v < worstG) worstG = v;
          if (v < GROUND_FLOOR) thinG.push(mp + " '" + c + "'/'" + n + "' " + f3(v));
        }
      } else {
        const gl = lu(groundOf(mp, c));
        let v = 0;
        for (const q of PLAYER) v = Math.max(v, contrast(lu(q), gl));
        if (v < worstA) worstA = v;
        if (v < ACTOR_FLOOR) thinA.push(mp + " '" + c + "' " + f3(v));
      }
    }
  }
  const at = (darkMin / 60 | 0) + ':' + String(darkMin % 60).padStart(2, '0');
  const uniq = a => Array.from(new Set(a));
  ok(thinG.length === 0, 'solid reads apart from walkable in the dark',
     thinG.length ? uniq(thinG).slice(0, 5).join('; ') + (uniq(thinG).length > 5 ? ' …' : '')
                  : 'worst ' + f3(worstG) + ' vs floor ' + GROUND_FLOOR + ' at ' + at + ', all ' + Object.keys(BEK_MAPS).length + ' maps');
  ok(thinA.length === 0, 'the player reads against every walkable tile',
     thinA.length ? uniq(thinA).slice(0, 5).join('; ') + (uniq(thinA).length > 5 ? ' …' : '')
                  : 'worst ' + f3(worstA) + ' vs floor ' + ACTOR_FLOOR);

  /* ---- and the same question underneath the valley ----------------------
     The eleven maps above are authored, so their worst pair is a fact you
     could in principle find by looking. A floor of the descent is generated,
     and it is drawn at whichever of MINE_LIGHT's four bands its depth falls
     in — the deepest of which is a good deal darker than the adit the loop
     above already covered under CAVE_LIGHT. So the floors are walked too,
     one sample per band, at their own light: it is no use knowing the mine
     is legible at the mouth if floor 22 is a black sheet with an orange disc
     on it. Only the glyphs a floor can actually contain appear here, which is
     the same set surface.js already answers for. */
  const mineThin = [];
  let mineWorst = 9, mineWorstA = 9, floors = 0, tiles = 0;
  for (const band of MINE_BANDS) {
    for (const seed of [7, 4242, 918273]) {
      const d = mineFloor(seed, band.from + 2);
      const L = lutOf(mineLight(MINE_BANDS.indexOf(band)));
      const lu = i => lumOf(L[i]);
      floors++;
      for (let y = 0; y < d.rows.length; y++) for (let x = 0; x < d.rows[y].length; x++) {
        const c = d.rows[y].charAt(x);
        tiles++;
        if (BEK_SOLID.indexOf(c) >= 0) {
          for (const dd of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const n = d.rows[y + dd[1]] ? d.rows[y + dd[1]].charAt(x + dd[0]) : '';
            if (!n || BEK_SOLID.indexOf(n) >= 0) continue;
            const v = contrast(lu(solidOf('gruva', c)), lu(groundOf('gruva', n)));
            if (v < mineWorst) mineWorst = v;
            if (v < GROUND_FLOOR) mineThin.push(band.id + " '" + c + "'/'" + n + "' " + f3(v));
          }
        } else {
          const gl = lu(groundOf('gruva', c));
          let v = 0;
          for (const q of PLAYER) v = Math.max(v, contrast(lu(q), gl));
          if (v < mineWorstA) mineWorstA = v;
          if (v < ACTOR_FLOOR) mineThin.push(band.id + " player on '" + c + "' " + f3(v));
        }
      }
    }
  }
  ok(mineThin.length === 0, 'the darkest floor still separates rock from floor',
     mineThin.length ? uniq(mineThin).slice(0, 5).join('; ') + (uniq(mineThin).length > 5 ? ' …' : '')
       : 'worst ' + f3(mineWorst) + '/' + f3(mineWorstA) + ' over ' + floors + ' generated floors, ' +
         tiles + ' tiles, down to k=' + MINE_LIGHT[MINE_LIGHT.length - 1].k.toFixed(2));
}

console.log('\n' + (fails ? fails + ' of ' + checks + ' palette checks FAILED.' : 'All ' + checks + ' palette checks pass.') + '\n');
process.exit(fails ? 1 : 0);
