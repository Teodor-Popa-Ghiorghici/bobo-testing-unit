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

/* ---- what may be drawn on what -------------------------------------------
   The contrast rule, written down where the art reads it from rather than
   left as an intention in a commit message.

   A *mark* is decoration on a surface — a blade of grass, a scuff of grit, a
   course in a plank. It stays inside MARK_BAND of that surface's base, and
   the result is a field that reads as one living green from three feet back
   and resolves into detail up close. That is the whole exercise.

   A *shadow* is an absence of light rather than a mark, so it is allowed to
   go darker than the band — but only darker, and not without limit.

   A *feature* is the exception the band exists to make meaningful: a flower
   head, an ore glint, a catch of sun on water. Features break the band on
   purpose, so they are declared apart and they must stay rare. */
export const MARKS = {
  /* Seven greens instead of four unrelated hues. Two dark blades, three at
     the base value, one straw and one deep fir — a field, not confetti. */
  TUFT:       { on: GRASS[2], cols: [GRASS[3], GRASS[1], GRASS[3], DRY[1], GRASS[2], CON[3], GRASS[1]] },
  /* the same seven where the coarse dry patch has taken the field to straw */
  TUFT_DRY:   { on: DRY[1],   cols: [DRY[1], SAN[0], DRY[1], GRASS[3], GRASS[2], DRY[1], TIM[3]] },
  /* the tall-grass glyph, which is blades rather than tufts */
  BLADE:      { on: GRASS[2], cols: [GRASS[3], GRASS[1], GRASS[3], DRY[1], GRASS[2], CON[3], GRASS[1]] },
  PATH_GRIT:  { on: SOI[2],   cols: [SOI[1], DRY[1], STO[2]] },
  CAVE_GRIT:  { on: STO[0],   cols: [STO[1], ATMO[1], TIM[0], STO[1]] },
  ROCK_FACE:  { on: STO[2],   cols: [STO[3], STO[1]] },
  /* Weighted toward the base on purpose. A board a step up or a step down
     from its neighbour is a different plank; a floor where every board is a
     different step is a deckchair. */
  FLOOR_GRAIN:{ on: TIM[2],   cols: [TIM[2], TIM[2], TIM[3], TIM[2], TIM[1], TIM[2]] },
  /* A torvtak, as the roof profile samples it: the sod's lit top, the pitch
     turning away lower down, a patch gone to straw, and the body it is all a
     variation of. Four entries where there were three, because the fourth is
     the base the other three vary around and `roof.js` needs to name it. */
  TURF_ROOF:  { on: GRASS[1], cols: [GRASS[2], GRASS[0], DRY[0], GRASS[1], TIM[2]] },
  /* The town's roof, which is deliberately not the town's wall. Dark tile
     over painted board is what these buildings are, and it is also the only
     thing that separates the two planes at every hour — a red roof on a red
     wall is one block with a line ruled across it. */
  ROOF_TILE:  { on: STO[2],   cols: [STO[3], STO[2], STO[1]] },
  /* The wall itself, both dressings. Everything here is its own surface's
     immediate neighbour, because a wall is one material lit differently up
     its height and not a surface with things drawn on it. */
  WALL_LOG:   { on: TIM[1],   cols: [TIM[2], TIM[1], TIM[0]] },
  WALL_BOARD: { on: WAR[1],   cols: [WAR[2], WAR[1], WAR[0]] },
  /* The stone a timber wall stands on, so it does not grow out of the grass.
     Stone against timber and stone against paint both sit inside the band —
     it is a foundation, not an ornament. */
  PLINTH_LOG:   { on: TIM[1], cols: [STO[1], STO[2]] },
  PLINTH_BOARD: { on: WAR[1], cols: [STO[1], STO[2]] },
  /* Glass seen from outside by day is dark, and on a dark log wall that is a
     mark rather than a feature — which is why the painted house's identical
     glass is declared in FEATURES instead. The same two colours; what changes
     is the wall behind them. */
  WINDOW_LOG: { on: TIM[1],   cols: [ATMO[1], WAT[2]] },
  DOOR_BOARD: { on: TIM[2],   cols: [TIM[1], TIM[3], TIM[2]] },
  CHIMNEY:    { on: STO[2],   cols: [STO[3], STO[2]] },
  SMOKE:      { on: ATMO[2],  cols: [ATMO[1]] },
  SNOW_MARK:  { on: SNO[0],   cols: [STO[5], SAN[2]] },
  WATER_DEEP: { on: WAT[1],   cols: [WAT[2], WAT[0]] },
  WATER_SHAL: { on: WAT[3],   cols: [WAT[2], WAT[4]] },
  SAND_GRIT:  { on: SAN[1],   cols: [SAN[0], SAN[2]] },
  SOIL_CLOD:  { on: SOI[2],   cols: [SOI[1], SOI[3]] }
};

export const SHADOWS = {
  PATH_CRACK: { on: SOI[2],   cols: [SOI[0]] },
  ROCK_CRACK: { on: STO[2],   cols: [STO[0]] },
  FLOOR_JOINT:{ on: TIM[2],   cols: [TIM[0]] },
  WALL_FOOT:  { on: TIM[2],   cols: [TIM[1], TIM[0]] },
  /* What an eave is, as far as the wall under it is concerned: a hard line of
     shadow where the roof overhangs, softening a few pixels down the boards.
     There was no eave shadow declared anywhere before, because there was no
     eave. Both dressings need their own, because the surface differs. */
  EAVE_LOG:   { on: TIM[1],   cols: [ATMO[0], TIM[0]] },
  EAVE_BOARD: { on: WAR[1],   cols: [ATMO[0], WAR[0]] },
  /* and the roof's own underside, seen edge-on where it stops */
  EAVE_TURF:  { on: GRASS[1], cols: [TIM[0], ATMO[0]] },
  EAVE_TILE:  { on: STO[2],   cols: [STO[0], ATMO[0]] },
  DOOR_JOINT: { on: TIM[2],   cols: [TIM[0], ATMO[0]] },
  /* the black a chimney is cut out of. Its surface is the stack's own body,
     not the roof behind it — the ink outlines the chimney, exactly as
     TREE_INK outlines the tree rather than the grass. */
  CHIMNEY_INK:{ on: STO[2],   cols: [ATMO[0], STO[0]] },
  ORE_MATRIX: { on: STO[2],   cols: [STO[0], ATMO[0]] },
  /* the black the fir silhouette is cut out of. Its surface is the tree's
     own base, not the grass behind it — the ink outlines the tree. */
  TREE_INK:   { on: CON[1],   cols: [CON[0], ATMO[0]] }
};

export const FEATURES = {
  /* a meadow in flower: white, gold, a red one, a blue one, cream */
  FLOWER:     { on: GRASS[2], cols: [SNO[1], WAR[4], WAR[2], WAT[4], SAN[2]] },
  /* the three you may actually pick, in the order blue / gold / red */
  PICKABLE:   { on: GRASS[2], cols: [WAT[4], WAR[4], WAR[2], SNO[1]] },
  WATER_SUN:  { on: WAT[1],   cols: [WAT[5], SNO[1]] },
  FOAM:       { on: WAT[3],   cols: [SNO[1], WAT[5]] },
  ORE_GLINT:  { on: STO[2],   cols: [ORE[0], ORE[1], SNO[1], SNO[0]] },
  /* The three metals, each as matrix-shadow / body / lit face / catch of
     light, on the darkened matrix a vein sits in. Declared here rather than
     in rock.js so the check reads the same four colours the art draws, and
     so it is obvious at a glance that no two of the three share a hue —
     which is the whole point of them: you can tell what you are about to
     mine before you swing at it. */
  ORE_IRON:   { on: STO[1],   cols: [WAR[0], ORE[0], WAR[3], SAN[2]] },
  ORE_COPPER: { on: STO[1],   cols: [CON[1], ORE[1], WAT[5], SNO[1]] },
  ORE_SILVER: { on: STO[1],   cols: [STO[2], STO[4], SNO[0], SNO[1]] },
  HEARTH:     { on: TIM[2],   cols: [WAR[1], WAR[2], WAR[3], WAR[4]] },
  /* ---- what makes a building findable ------------------------------------
     Every entry below is thin — a frame, a board, a ridge cap, a handle — and
     every one of them is the mark the eye actually lands on. That is the
     whole of the 1-bit test: threshold the town at its own median and what is
     left of a house is its trim, its openings and its silhouette. A facade
     built only out of marks inside the band would threshold to one grey
     rectangle, which is precisely what the old one did.

     The window surround and the corner board of a laftehus are bare wood; on
     a falu-red house they are white, which is the single most recognisable
     thing about the building and the reason the paint is worth having. */
  TRIM_LOG:   { on: TIM[1],   cols: [TIM[3], TIM[4]] },
  TRIM_BOARD: { on: WAR[1],   cols: [SAN[2], SNO[1]] },
  /* the same dark glass as WINDOW_LOG, against a wall bright enough that it
     stops being a mark and starts being an opening */
  WINDOW_BOARD:{ on: WAR[1],  cols: [ATMO[1], WAT[2]] },
  /* and the same opening once there is a fire behind it */
  WINDOW_LIT: { on: TIM[1],   cols: [WAR[3], WAR[4]] },
  DOOR_IRON:  { on: TIM[2],   cols: [STO[4], WAR[4]] },
  /* a roof needs a top edge, and three pixels of capping is what gives it
     one. Timber over sod, stone over tile. */
  RIDGE_LOG:  { on: GRASS[1], cols: [TIM[3], TIM[4]] },
  RIDGE_TILE: { on: STO[2],   cols: [STO[4], STO[5]] },
  CHIMNEY_CAP:{ on: STO[2],   cols: [STO[4], STO[5]] }
};
