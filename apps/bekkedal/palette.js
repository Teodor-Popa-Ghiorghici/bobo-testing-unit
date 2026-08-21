/* Bekkedal — the sixty-four colours the valley is drawn from.
 *
 * This app used to draw out of `VGA16` (`kernel/god.js`), the stock CGA/VGA
 * sixteen. Sixteen is not a small palette; it is a palette with no mid-tones.
 * Look at what a blade of grass used to be picked from:
 *
 *     TUFT = [10, 2, 10, 14, 10, 2, 3]
 *
 * index 10 is (85,255,85), index 2 is (0,170,0), 14 is (255,255,85) and 3 is
 * (0,170,170). Their relative luminances are 0.86, 0.53, 0.93 and 0.55, and
 * two of them are not green. That is not variation inside a material; it is
 * four unrelated materials fighting each other at one-pixel scale over a
 * forty-point spread, and it is why a field of grass read as confetti. The
 * variation system in `noise.js` was never the problem. It was dealing from a
 * deck with nothing between (0,170,0) and (85,255,85) to vary *inside*.
 *
 * So: sixty-four, and structured as ramps rather than as a swatch grid.
 *
 *   0-15   bit-exact VGA16, in the original order. Every draw call that
 *          existed before this file kept working the day it landed, the HUD
 *          and the menu chrome stay TempleOS, and any regression stayed
 *          bisectable. Do not renumber them for tidiness.
 *   16-63  twelve ramps, three to six steps each, shadow -> base -> light.
 *
 * Two rules the ramps are built to, both asserted by `palette_check.js`:
 *
 *   Hue-shift, don't scale. A shadow step leans blue or violet and loses a
 *   little saturation; a highlight step leans yellow. Scaling one hue's value
 *   up and down is the flat look sixteen colours already gave us — it is the
 *   single decision that separates "sixty-four colours" from "looks better".
 *
 *   Adjacent steps stay close enough in value to dither across. Sixty-four
 *   indices plus the 4x4 ordered dither between any two of them is an
 *   enormous effective gamut, but only where a 50% stipple of two steps reads
 *   as a clean intermediate instead of as texture — which means adjacent
 *   steps must also be near each other in *hue*. RAMP_STEP_MAX is the
 *   ceiling on the value gap.
 *
 * Everything else in the app addresses colour through the ramp arrays below,
 * never a bare number: `C(GRASS[2])`, not `C(21)`.
 */

/* ---- 0-15: VGA16, unchanged ---------------------------------------------
   Copied rather than imported. The kernel palette belongs to the machine and
   is shared by every other app; this one is Bekkedal's, and moving it in-app
   removes this app's only cross-boundary import — which the root CLAUDE.md
   forbids in general and only ever tolerated for the palette. */
export const VGA16 = [
  [0, 0, 0], [0, 0, 170], [0, 170, 0], [0, 170, 170],
  [170, 0, 0], [170, 0, 170], [170, 85, 0], [170, 170, 170],
  [85, 85, 85], [85, 85, 255], [85, 255, 85], [85, 255, 255],
  [255, 85, 85], [255, 85, 255], [255, 255, 85], [255, 255, 255]
];

/* ---- 16-63: the material ramps -------------------------------------------
   One per family the game actually draws, and no more: a ramp that nothing
   fills with is budget spent on a swatch. Steps run darkest first. */
const RAMP_RGB = {
  /* the cool darks. Not a material — the air. Vignette, the far canopy at
     the back of the treeline, the shadow a wall casts, the ground at the
     bottom of the night curve. Everything that is dark because it is far
     away or unlit rather than because it is black. */
  ATMO:  [[10, 12, 22], [26, 32, 52], [48, 58, 86]],
  /* the valley floor, and most of the screen. Shadow leans blue, highlight
     leans yellow, and the four middle steps are close enough together that
     a tuft can differ from the ground it stands in without shouting. */
  GRASS: [[22, 54, 34], [38, 82, 44], [58, 112, 52], [86, 144, 62], [118, 170, 80]],
  DRY:   [[80, 76, 54], [130, 116, 66], [170, 154, 98]],       /* grass gone to straw */
  CON:   [[10, 30, 32], [22, 54, 46], [38, 84, 58], [66, 120, 68]],  /* fir and spruce */
  TIM:   [[42, 29, 30], [76, 52, 34], [112, 78, 48], [146, 107, 68], [188, 150, 104]],
  STO:   [[24, 24, 30], [44, 45, 54], [70, 72, 82], [100, 102, 112], [134, 135, 142], [174, 173, 170]],
  SOI:   [[48, 30, 32], [86, 56, 40], [124, 84, 58], [162, 118, 84]],
  WAT:   [[8, 20, 46], [16, 40, 76], [28, 66, 112], [46, 100, 150], [80, 142, 182], [132, 180, 200]],
  SAN:   [[142, 124, 102], [186, 168, 130], [222, 210, 180]],
  SNO:   [[186, 196, 214], [236, 238, 242]],
  /* the emission ramp: falu red, ember, flame, lamplight. Its steps are
     colour temperatures rather than shades of one material and nothing ever
     dithers between them, which is why it carries a step ceiling of its own.
     It is also the town's painted board, because that paint is iron oxide
     and reads as the same family. */
  WAR:   [[84, 28, 34], [132, 52, 34], [180, 88, 42], [218, 134, 60], [240, 178, 100]],
  /* two hues no other ramp carries, so a player can tell what they are about
     to mine before they swing: iron's rust ochre, copper's verdigris. Silver
     borrows the top of STO and SNO, which is exactly what silver looks like. */
  ORE:   [[158, 92, 38], [56, 148, 122]]
};

/* ---- laying them out ------------------------------------------------------
   Indices are assigned in declaration order from 16 up, and each ramp is
   exported as the array of indices it occupies. */
export const PAL = VGA16.slice();
const idx = {};
for (const name of Object.keys(RAMP_RGB)) {
  idx[name] = RAMP_RGB[name].map(rgb => (PAL.push(rgb.slice()), PAL.length - 1));
}

export const ATMO = idx.ATMO, GRASS = idx.GRASS, DRY = idx.DRY, CON = idx.CON,
             TIM = idx.TIM, STO = idx.STO, SOI = idx.SOI, WAT = idx.WAT,
             SAN = idx.SAN, SNO = idx.SNO, WAR = idx.WAR, ORE = idx.ORE;
/* what palette_check.js walks */
export const RAMPS = idx;

export const PAL_N = PAL.length;                            /* 64 */

/* `rgb(r,g,b)` for every entry, built once. The old `C(i)` concatenated three
   numbers into a string on every single fill; this is an array index. */
export const cssOf = pal => pal.map(p => 'rgb(' + p[0] + ',' + p[1] + ',' + p[2] + ')');
export const PAL_CSS = cssOf(PAL);

/* ---- luminance ------------------------------------------------------------
   Rec.709 on the gamma-encoded values, normalised to 0..1. Not a colour
   science claim — a consistent ordering that the checks and the contrast
   bands below are both stated in. */
export const lum = i => {
  const p = PAL[i];
  return (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255;
};

export const RAMP_STEP_MAX = 0.17;      /* the widest gap a dither can cross  */
export const RAMP_STEP_MAX_WAR = 0.20;  /* the emission ramp, see above       */
export const MARK_BAND = 0.12;          /* how far a mark may sit from its surface */
export const SHADOW_MAX = 0.30;         /* how far below its surface a shadow may go */

/* The band has one exemption, and it is the important one: a colour that is
   the surface's own immediate neighbour in its own ramp is always allowed,
   however wide that step happens to be. It is not a second material — it is
   the same material lit a little more or a little less, which is exactly
   what a fold in the ground, a ripple on water or a raised grain in a board
   *is*. Everything crossing from one ramp to another — a straw blade in a
   green field, a grey chip in a brown path — has to earn its place inside
   the band instead. */
const rampOf = i => {
  for (const name of Object.keys(idx)) { const k = idx[name].indexOf(i); if (k >= 0) return [name, k]; }
  return null;
};
export function sameRampNeighbour(surface, col) {
  const a = rampOf(surface), b = rampOf(col);
  return !!(a && b && a[0] === b[0] && Math.abs(a[1] - b[1]) === 1);
}

/* The exemption above, as a function: one step up or down a colour's own ramp,
   clamped at either end. Art that is *parameterised* by colour shades what it
   is handed with this rather than with a table per possible value —
   `portrait.js` is given eight characters' hair and shirts out of BEK_NPCS —
   and what it returns is by construction inside the band. */
export function rampStep(i, d) {
  const a = rampOf(i);
  if (!a) return i;
  const r = idx[a[0]];
  return r[Math.max(0, Math.min(r.length - 1, a[1] + d))];
}

/* The three tables that say what may be drawn on what — MARKS, SHADOWS and
   FEATURES, and the whole of the contrast rule they encode — are in
   `palette_marks.js` next door. They are two thirds of what this file used to
   be and it was over the 300-line ceiling with them; the ramps, the luminance
   ordering and the band constants those tables are *stated in* are what
   belongs here, and are what that file imports back. Import a table from
   `./palette_marks.js`; import a colour from here.

   The dependency runs one way on purpose. A re-export from here would put the
   two files in a cycle, and because import bindings hoist, `palette_marks.js`
   would evaluate before the ramp arrays above it exist. */
