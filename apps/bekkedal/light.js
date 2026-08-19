/* Bekkedal — the hour of the day, as a palette rather than as an overlay.
 *
 * Night used to be one line:
 *
 *     if (night()) dither(1, 9); else if (dusk()) dither(1, 5); ...
 *
 * a full-viewport stipple of index 1 — pure (0,0,170) — at strength 9 of 16.
 * Three things were wrong with it and all three were the report:
 *
 *   1. It did not darken the picture, it *replaced* 56% of it with one
 *      saturated blue. Every hue on screen lost half of itself and what
 *      survived had nothing to do with what it had been.
 *   2. The stipple cell is BEK_DITHER_PX — eight device pixels — so across a
 *      960x540 viewport the ordered matrix read as a static, regular,
 *      high-frequency crosshatch over the whole image. A grid at that spatial
 *      frequency held on screen for minutes is genuinely fatiguing. That was
 *      the discomfort, and no amount of choosing a nicer blue would have
 *      fixed it.
 *   3. It snapped. dusk() ended and night() began at 20:00 exactly, and the
 *      overlay went from strength 5 to strength 9 between two frames.
 *
 * What replaces it costs nothing to draw at all. With sixty-four indices the
 * option the old code did not have is to give every index a night *variant* —
 * the same colour taken down in value, compressed in contrast and pulled
 * toward a cool dark — and resolve `C(i)` through whichever variant the hour
 * calls for. The terrain cache then rasterises in night colours directly:
 * zero overdraw, zero stipple buzz, and the image keeps its structure. A
 * grass tile is still readable as grass at midnight. It is just night-grass.
 *
 * ---- the transform --------------------------------------------------------
 *
 * A light state is three numbers and a triple, applied to every entry:
 *
 *     desaturate toward the entry's own luminance by (1 - sat)
 *     scale all three channels by the scalar k
 *     add the tint a[]
 *
 * The order matters, and so does `k` being a scalar rather than a per-channel
 * multiplier. Work the luminance through it:
 *
 *     lum(out) = k * lum(in) + (0.2126*aR + 0.7152*aG + 0.0722*aB)
 *
 * — the saturation term cancels exactly, and what is left is affine and
 * increasing in the input. So the transform *cannot* reorder two entries by
 * luminance, at any hour, for any anchor anyone adds later. That is the
 * property the whole approach rests on (it is why a night grass tile still
 * reads as ground and not as a wall), and it is a consequence of the shape of
 * the formula rather than of the numbers in the table below. A per-channel
 * multiplier would have bought a slightly prettier midnight and lost it.
 *
 * `sat` still does real work: it desaturates without touching the ordering,
 * which is the Purkinje shift — colour draining out of a scene before its
 * light does.
 */
import { PAL, PAL_N, cssOf } from './palette.js';

const L_R = 0.2126, L_G = 0.7152, L_B = 0.0722;
export const lumOf = p => (L_R * p[0] + L_G * p[1] + L_B * p[2]) / 255;

/* ---- the anchors ---------------------------------------------------------
   Seven states around the clock, interpolated between rather than switched
   at. `k` is exposure, `sat` is how much colour survives, `a` is the cast the
   light of that hour throws — cool and blue at night, warm and orange at
   either end of the day.

   Midday is exactly the identity, and palette_check asserts it: what the art
   was authored in has to be what the art looks like at noon, or the palette
   and the picture have quietly become two different things. */
export const LIGHT_ANCHORS = [
  { at:  0 * 60, k: 0.34, sat: 0.42, a: [  4,  8, 26] },   /* deep night      */
  { at:  4 * 60, k: 0.34, sat: 0.42, a: [  4,  8, 26] },   /* still deep      */
  { at:  5 * 60, k: 0.42, sat: 0.52, a: [ 10, 10, 24] },   /* the sky lifting */
  { at:  6 * 60 + 30, k: 0.74, sat: 0.82, a: [ 22, 12,  6] },  /* dawn, low and warm */
  { at:  8 * 60, k: 0.94, sat: 0.96, a: [  6,  4,  0] },   /* morning         */
  { at: 10 * 60, k: 1.00, sat: 1.00, a: [  0,  0,  0] },   /* midday: identity*/
  { at: 16 * 60, k: 1.00, sat: 1.00, a: [  0,  0,  0] },   /* and it holds    */
  { at: 18 * 60, k: 0.94, sat: 1.00, a: [ 18,  6, -8] },   /* golden hour     */
  { at: 19 * 60 + 30, k: 0.64, sat: 0.74, a: [ 16,  8, 14] },  /* dusk        */
  { at: 21 * 60, k: 0.42, sat: 0.50, a: [  6,  8, 24] },   /* early night     */
  { at: 24 * 60, k: 0.34, sat: 0.42, a: [  4,  8, 26] }    /* wraps to 0:00   */
];
export const LIGHT_KEYS = LIGHT_ANCHORS.length;

/* ---- quantisation --------------------------------------------------------
   The terrain cache has to rebuild whenever the LUT changes, so the LUT is
   not allowed to change every frame. Quantising the *state* rather than the
   clock is what makes the flat stretches free: between 10:00 and 16:00 every
   minute lands on the same quantised state, so the cache never rebuilds at
   all, and the rebuilds cluster where the light is actually moving.

   The LUT is built from the quantised numbers, never the raw ones, so two
   minutes with the same key have byte-identical LUTs. That equivalence is
   the whole contract between this file and the cache.

   The step sizes are set by the *other* end of the trade: quantise coarsely
   and the day turns over in visible jumps. palette_check measures the largest
   ten-minute channel step and the number of keys a day resolves to, so both
   halves of that trade are on the record rather than in a commit message. */
const K_STEP = 1 / 128, S_STEP = 1 / 64, A_STEP = 1;
const q = (v, step) => Math.round(v / step) * step;

export function lightAt(min) {
  const m = ((min % 1440) + 1440) % 1440;
  let i = 0;
  while (i + 1 < LIGHT_ANCHORS.length && LIGHT_ANCHORS[i + 1].at <= m) i++;
  const A = LIGHT_ANCHORS[i], B = LIGHT_ANCHORS[Math.min(i + 1, LIGHT_ANCHORS.length - 1)];
  const span = Math.max(1, B.at - A.at), u = Math.min(1, Math.max(0, (m - A.at) / span));
  const mix = (p, r) => p + (r - p) * u;
  return {
    k: q(mix(A.k, B.k), K_STEP),
    sat: q(mix(A.sat, B.sat), S_STEP),
    a: [q(mix(A.a[0], B.a[0]), A_STEP), q(mix(A.a[1], B.a[1]), A_STEP), q(mix(A.a[2], B.a[2]), A_STEP)],
    /* not part of the transform — what the rest of the app asks when it wants
       to know how dark it is out there (whether a window is lit, how far a
       lantern throws, which check is the darkest hour) */
    exposure: mix(A.k, B.k)
  };
}

/* A room is not exempt from the evening, but it is sheltered from it: four
   walls and a fire keep it some way back toward daylight whatever the hour
   outside. Blending the state toward the identity is that, and because the
   blend is applied to k, sat and a alike it is still the same affine shape —
   so the ordering guarantee survives it. */
export function shelter(st, amount) {
  if (!amount) return st;
  const u = Math.min(1, Math.max(0, amount)), f = (v, one) => v + (one - v) * u;
  return {
    k: q(f(st.k, 1), K_STEP), sat: q(f(st.sat, 1), S_STEP),
    a: [q(f(st.a[0], 0), A_STEP), q(f(st.a[1], 0), A_STEP), q(f(st.a[2], 0), A_STEP)],
    exposure: f(st.exposure, 1)
  };
}

export const keyOf = st => st.k.toFixed(3) + ':' + st.sat.toFixed(3) + ':' + st.a.join(',');
/* What the terrain cache keys on. Deliberately the *unsheltered* state plus a
   flag rather than the sheltered one: the sheltered state decides the LUT,
   but how dark it is outside decides how hard the fires burn, and the blend
   that produces the sheltered state throws that away. */
export const lightKey = (min, indoors) => keyOf(lightAt(min)) + (indoors ? '|in' : '');

/* A hole in a mountain does not have an hour. The gruva ignores the clock
   entirely and sits at a fixed, mild dark: enough that a lamp is worth
   carrying and an ore glint is the brightest thing down there, not so much
   that you cannot see the corridor you are standing in. It also means the
   one map whose terrain cache would otherwise rebuild through every dawn
   and dusk never rebuilds at all. */
export const CAVE_LIGHT = { k: q(0.72, K_STEP), sat: q(0.78, S_STEP), a: [0, 2, 10], exposure: 0.40 };

const clamp255 = v => v < 0 ? 0 : v > 255 ? 255 : Math.round(v);

/* ---- the lookup table ----------------------------------------------------- */
export function lutOf(st) {
  const out = new Array(PAL_N);
  for (let i = 0; i < PAL_N; i++) {
    const p = PAL[i], l = L_R * p[0] + L_G * p[1] + L_B * p[2];
    out[i] = [
      clamp255((l + (p[0] - l) * st.sat) * st.k + st.a[0]),
      clamp255((l + (p[1] - l) * st.sat) * st.k + st.a[1]),
      clamp255((l + (p[2] - l) * st.sat) * st.k + st.a[2])
    ];
  }
  return out;
}
export const lutAt = (min, indoors) => lutOf(shelter(lightAt(min), indoors ? 0.5 : 0));

/* The chrome's LUT. The two HUD bands, the panels, the menus and every glyph
   of text are outside the playfield and keep full contrast after dark, so
   they draw from this one whatever the hour. */
export const DAY_LUT = PAL.map(p => p.slice());
export const DAY_CSS = cssOf(DAY_LUT);

/* built LUTs, kept by key. Two are ever live — the chrome's and the hour's —
   so this holds at most a handful and gets swept when it does not. */
const cache = new Map();
export function cssFor(st) {
  const k = keyOf(st);
  let hit = cache.get(k);
  if (!hit) {
    if (cache.size > 6) cache.clear();
    hit = cssOf(lutOf(st));
    cache.set(k, hit);
  }
  return hit;
}

/* ---- local light ----------------------------------------------------------
   A lighting curve gets you a night that is comfortable. Local light gets you
   one that is inviting, and that is a different thing. Each source pulls the
   ground near it back toward warm and bright, as an ordered dither of a warm
   palette entry — of course it is a dither; it is the only blend this game
   has. Warm rather than merely brighter is the whole point: a lit window in a
   blue valley has to read as amber or it reads as a hole.

   `glow` walks the source's box in CELL-sized squares and hands each one a
   strength. CELL is half a tile: per-tile would band visibly at this radius,
   and per-pixel would cost more than the rest of the frame put together. The
   remaining banding — one ordered-dither step per ring — is broken up by a
   per-cell offset taken from the position, the same trick `patchAmt` uses to
   keep a smooth field from drawing its own contour lines.

   The profile is deliberately flat-topped and steep at the rim rather than a
   smooth bell. A bell spends most of its *area* in the outer ring, and the
   outer ring is where the strength is 1, 2 or 3 out of 16 — which at an
   eight-pixel stipple cell is not a soft edge, it is a spray of loose orange
   squares over the grass. Cutting everything below 2 and holding the strength
   up until the last fifth of the radius is what turns that spray back into a
   pool of light with an edge. */
export const GLOW_CELL = 20;

const jitter = (x, y) => {
  let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + 1442695041) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177) | 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

/* px,py: the source's centre in device pixels. r: reach, also device pixels.
   peak: dither strength out of 16 at the centre. `put(x, y, w, h, strength)`
   is whatever the caller wants to stipple with. */
export function glow(put, px, py, r, peak) {
  if (peak <= 0 || r <= 0) return 0;
  const c = GLOW_CELL;
  const x0 = Math.floor((px - r) / c) * c, x1 = Math.ceil((px + r) / c) * c;
  const y0 = Math.floor((py - r) / c) * c, y1 = Math.ceil((py + r) / c) * c;
  let n = 0;
  for (let y = y0; y < y1; y += c) {
    for (let x = x0; x < x1; x += c) {
      const dx = x + c / 2 - px, dy = (y + c / 2 - py) * 1.15;   /* a shade wider than tall */
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= r) continue;
      const u = d / r;
      const s = Math.floor(peak * (1 - u * u * u) + jitter(x, y));
      if (s < 2) continue;
      put(x, y, c, c, s > 16 ? 16 : s);
      n++;
    }
  }
  return n;
}
