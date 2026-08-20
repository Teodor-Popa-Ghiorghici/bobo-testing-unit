/* Bekkedal — the roof, the chimney and the smoke.
 *
 * The other half of `building.js`, split off it only because the two together
 * pass the 300-line rule. Everything about *why* a building is authored as a
 * profile of one number is in that file's header; this one carries the half of
 * the profile that runs from the ridge down to the eave, and the two things
 * that stand on it.
 *
 * The roof used to be two flat bands of the wall's own colour with a timber
 * line under them — which is to say it was the same red rectangle as the wall,
 * with a line ruled across it, and from twenty feet a building was one block.
 * A roof needs three things the old one had none of: a ridge, so it has a top;
 * courses, so it has a pitch; and an eave that is a real edge seen on end, so
 * it can overhang the wall below.
 *
 * The town's roof is deliberately not falu red. Dark tile over painted board
 * is both what the buildings are and the only way the two planes separate at
 * every hour — the eave's shadow between them is structural, so it survives
 * the night curve and the 1-bit threshold alike, where a hue difference would
 * not.
 */
import { MARKS, SHADOWS, FEATURES } from './palette.js';
import { BEK_T } from './data.js';

/* A torvtak is a metre of sod on birch bark, held at the eave by one log, and
   its capping is timber; a town roof is tile with a stone ridge. Every entry
   is a step of a table declared in palette.js. */
const T_TURF = MARKS.TURF_ROOF.cols, T_TILE = MARKS.ROOF_TILE.cols;
/* `gap` is the shadow under one course and `fascia` is the eave board, and
   they are deliberately different colours. They were briefly the same, which
   put a near-black brown line across a green roof every six pixels — sod is a
   continuous thing and does not have courses at all, so its `gap` is barely a
   step and its rhythm is long. Tile does have courses, and gets a real one. */
export const TURF = { course: 9, lit: T_TURF[0], body: T_TURF[3], low: T_TURF[1],
                      gap: T_TURF[1], dry: T_TURF[2], eaveLit: T_TURF[4],
                      fascia: SHADOWS.EAVE_TURF.cols[0], deep: SHADOWS.EAVE_TURF.cols[1],
                      ridge: FEATURES.RIDGE_LOG.cols };
export const TILE = { course: 5, lit: T_TILE[0], body: T_TILE[1], low: T_TILE[2],
                      gap: T_TILE[2], eaveLit: T_TILE[0],
                      fascia: SHADOWS.EAVE_TILE.cols[0], deep: SHADOWS.EAVE_TILE.cols[1],
                      ridge: FEATURES.RIDGE_TILE.cols };

/* ---- the pitch, as a function of one number -------------------------------
   `u` is the device-pixel distance below the ridge, `rh` the roof's height.
   Author it here and nowhere else — the same contract `wallBand` keeps for the
   wall and `shoreBand` keeps for the beach. */
export function roofBand(u, rh, M) {
  if (u < 2) return M.ridge[1];                   /* the capping, catching    */
  if (u < 4) return M.ridge[0];
  const e = rh - u;
  /* The eave, in three bands rather than one. A single dark one was eight
     pixels of near-black meeting the wall's own shadow under it, and sixteen
     pixels of black between a roof and a wall reads as a gap between two
     things rather than as one overhanging the other. Lit top, shadowed face,
     dark underside: that is a board seen on end. */
  if (e <= 2) return M.deep;                      /* the roof's own underside */
  if (e <= 5) return M.fascia;                    /* the eave board's face    */
  if (e <= 8) return M.eaveLit;                   /* and its top, catching    */
  const p = (u - 4) % M.course;
  if (p < 1) return M.lit;
  if (p >= M.course - 1) return M.gap;
  /* the pitch turns away from the light as it comes down toward the eave */
  return u > rh * 0.7 ? M.low : M.body;
}

/* `bands` is `building.js`'s run-length row scan, handed over rather than
   duplicated or imported back the other way — one direction of dependency,
   and the roof draws its profile with exactly the machinery the wall does. */
export function createRoof(A, bands) {
  const CH_W = 13, CH_UP = 15;

  /* ---- the chimney ---------------------------------------------------------
     It stands above the ridge, so it is drawn up into the tile above — which
     the detail pass laid down before this one, so it survives. Stone, and ink
     outlined the way `forest.js` inks a fir: a grey stack on a green turf roof
     is two colours of one luminance and would otherwise be invisible. Value
     first, then colour, which is what the ore taught. */
  function chimney(px, py) {
    const cx = px + ((BEK_T - CH_W) >> 1), K = MARKS.CHIMNEY.cols;
    const INK = SHADOWS.CHIMNEY_INK.cols, CAP = FEATURES.CHIMNEY_CAP.cols;
    A.fill(INK[0], cx - 1, py - CH_UP - 1, CH_W + 2, CH_UP + 13);
    A.fill(K[1], cx, py - CH_UP, CH_W, CH_UP + 11);
    A.fill(K[0], cx, py - CH_UP, 4, CH_UP + 11);                  /* the lit face */
    for (let cy = py - CH_UP + 4; cy < py + 10; cy += 4) A.fill(INK[1], cx, cy, CH_W, 1);
    A.fill(CAP[0], cx - 2, py - CH_UP - 3, CH_W + 4, 3);          /* the capstone */
    A.fill(CAP[1], cx - 2, py - CH_UP - 3, CH_W + 4, 1);
    A.fill(INK[0], cx + 3, py - CH_UP - 2, CH_W - 6, 2);          /* the flue     */
    A.wash(cx + CH_W + 1, py - 1, 8, 11, INK[0], 7);              /* on the roof  */
  }

  /* ---- the roof tile -------------------------------------------------------
     `o` is the `R` glyph's own declared roll. Sod is not a manufactured
     surface, so a turf roof gets the four scattered tufts and dry patches
     those channels have always described — they are the one part of the old
     roof art worth keeping, and without them a torvtak is a green gradient. */
  function tile(px, py, u0, rh, M, gW, gE, hasChim, o, spot) {
    bands(px, py, u0, rh, M, roofBand);
    if (M.dry) {
      const T = BEK_T, top = Math.max(0, 4 - u0), bot = Math.min(T, rh - 8 - u0);
      const tuft = (col, sx, sy, w, h) => {
        const ly = top + spot(sy, Math.max(1, bot - top), h);
        if (ly + h <= bot) A.fill(col, px + spot(sx, T, w), py + ly, w, h);
      };
      tuft(M.lit, o.ax, o.ay, 3, 2); tuft(M.low, o.bx, o.by, 2, 2);
      tuft(M.dry, o.cx, o.cy, 3, 1); tuft(M.lit, o.fx, o.fy, 2, 1);
    }
    /* the verge: the barge board down the outside edge of a gable */
    if (gW) { A.fill(M.deep, px, py, 3, BEK_T); A.fill(M.ridge[0], px + 1, py, 1, BEK_T); }
    if (gE) { A.fill(M.deep, px + BEK_T - 3, py, 3, BEK_T); A.fill(M.ridge[0], px + BEK_T - 2, py, 1, BEK_T); }
    if (hasChim) chimney(px, py);
  }

  /* ---- smoke, the one thing in a building that is not in the cache ----------
     A household lights its fire when it gets cold and dark, and not all of them
     in the same minute — the threshold is jittered per chimney off its own
     declared channel, so the town comes on the way a town does rather than the
     way a switch does. Puffs rise, drift, spread and thin; the thinning is the
     ordered stipple, because that is the only blend this app has. */
  function smoke(x, y, t, o) {
    if (A.dark() < 0.06 + o.lit * 0.03) return;
    const px = x * BEK_T + (BEK_T >> 1), py = y * BEK_T - CH_UP - 5;
    for (let i = 0; i < 5; i++) {
      const ph = (t * 0.3 + i * 0.2 + o.chim * 0.05) % 1;
      const s = Math.round(10 * (1 - ph) * Math.min(1, ph * 6));
      if (s <= 0) continue;
      A.wash(Math.round(px - 3 + Math.sin(ph * 3.4 + i) * (1 + ph * 8)),
             Math.round(py - ph * 34), 5 + Math.round(ph * 8), 3 + Math.round(ph * 3),
             ph < 0.45 ? MARKS.SMOKE.cols[0] : MARKS.SMOKE.on, s);
    }
  }

  return { tile: tile, smoke: smoke };
}
