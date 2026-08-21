/* Bekkedal — what may be drawn on what.
 *
 * The contrast rule, written down where the art reads it from rather than
 * left as an intention in a commit message: one table per kind of decoration,
 * each entry naming a surface and the colours allowed on it, and
 * `palette_check.js` walks exactly these tables. One table, two readers.
 *
 * Split out of `palette.js` for the 300-line rule, the same way
 * `decor_outdoor.js` is split out of `decor.js` — these three tables are two
 * thirds of what that file was, and the portraits added a seventh kind of
 * surface to them. Everything they are *stated in* — the ramps, the luminance
 * ordering, MARK_BAND and SHADOW_MAX — stays there, and this file imports it
 * back. The dependency runs one way: nothing in palette.js imports this.
 *
 * A *mark* is decoration on a surface — a blade of grass, a scuff of grit, a
 * course in a plank. It stays inside MARK_BAND of that surface's base, and
 * the result is a field that reads as one living green from three feet back
 * and resolves into detail up close. That is the whole exercise.
 *
 * A *shadow* is an absence of light rather than a mark, so it is allowed to
 * go darker than the band — but only darker, and not without limit.
 *
 * A *feature* is the exception the band exists to make meaningful: a flower
 * head, an ore glint, a catch of sun on water. Features break the band on
 * purpose, so they are declared apart and they must stay rare.
 */
import { ATMO, GRASS, DRY, CON, TIM, STO, SOI, WAT, SAN, SNO, WAR, ORE } from './palette.js';

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
  SOIL_CLOD:  { on: SOI[2],   cols: [SOI[1], SOI[3]] },
  /* the vidda's exposed bedrock breaking through the thin alpine turf — a
     grey mark on grass rather than a second material, which is why it stays
     inside the band on its own and needs no feature exemption */
  BEDROCK:    { on: GRASS[2], cols: [STO[2]] },
  /* A face, modelled like everything else here: a base and a step of its own
     ramp either side of it. Two skin bases rather than eight, because a table
     has to be declared to be checked; SAN has nothing under its darkest step,
     so the weathered one borrows lit timber. PORT_BACK is the air a bust is
     cut out of. Full doctrine: **The faces**, .claude/rules/bekkedal-art.md. */
  PORT_SKIN:     { on: SAN[1],  cols: [SAN[0], SAN[2]] },
  PORT_SKIN_TAN: { on: SAN[0],  cols: [TIM[3], SAN[1]] },
  PORT_BACK:     { on: ATMO[1], cols: [ATMO[0], ATMO[2]] }
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
  TREE_INK:   { on: CON[1],   cols: [CON[0], ATMO[0]] },
  /* moss in the shade of a boulder or under the forest canopy — darker than
     the green it sits against rather than a differently-lit step of it */
  MOSS_SHADE: { on: GRASS[2], cols: [CON[1]] },
  /* Under the jaw: the one part of a face that is genuinely unlit rather than
     turned away, and without it a bust is a mask sitting on a shirt. */
  PORT_JAW:     { on: SAN[1],  cols: [SAN[0]] },
  PORT_JAW_TAN: { on: SAN[0],  cols: [TIM[3]] }
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
  /* an old drift lying in the lee of a boulder, on the vidda and the setra —
     the one mark on grass this game has that is lighter than its surface */
  SNOWDRIFT:  { on: GRASS[2], cols: [SNO[0], SNO[1]] },
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
  CHIMNEY_CAP:{ on: STO[2],   cols: [STO[4], STO[5]] },
  /* The four things about a face that are *not* inside the band, and the
     reason a portrait reads as a person at this size: an eye is the mark the
     eye lands on, and so are a brow, a lash and the line of a mouth. Every
     one thin, exactly like a house's trim. One pair per skin base. */
  PORT_EYE:      { on: SAN[1], cols: [SNO[1], WAT[2], TIM[1]] },
  PORT_EYE_TAN:  { on: SAN[0], cols: [SNO[1], WAT[2], TIM[1]] },
  PORT_LINE:     { on: SAN[1], cols: [TIM[0], SOI[0]] },
  PORT_LINE_TAN: { on: SAN[0], cols: [TIM[0], SOI[0]] }
};
