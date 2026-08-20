/* Bekkedal — the things in a room that nobody put there for a reason.
 *
 * A room with a bed, a table and a cupboard in it is a floor plan. A room
 * with a kettle on the fire, boots by the door, jars on the shelf and a cat
 * asleep where the warmth is, is somewhere a person lives. The difference is
 * about thirty fillRects.
 *
 * These are *kinds*, not glyphs. Where each one stands is content and lives
 * in `BEK_DECOR` (`data.js`), keyed by map, so adding a room later costs no
 * code and the farm cabin and the house by the water can be two different
 * people's houses — which is the actual goal. A player who walks into the
 * second house and immediately knows it is a different house is the outcome.
 *
 * Rules for anything added here:
 *   - It draws inside a `native()` block at real BEK_T pixels, `px`/`py` being
 *     the top-left of its tile.
 *   - It must not change walkability. `solid()` reads `BEK_SOLID` against the
 *     map glyph and knows nothing about decor, so a prop on a walkable tile
 *     stays walkable and the player will stand on it. Most of these sit on
 *     furniture or hang on a wall for that reason; the few that are on the
 *     floor (boots, firewood, the cat) draw from the terrain cache, which is
 *     blitted before the actors, so the player passes in front of them.
 *   - Everything in a room is some shade of timber, the floor included, so a
 *     prop drawn in timber on timber is invisible. Each one carries either an
 *     ink outline, a contact shadow, or a material that is not wood — a pale
 *     cut end, a grey cat, a black boot. Value first, then colour; the ore in
 *     the mine taught the same lesson.
 *   - `LIVE` names the kinds that animate. Those are drawn per frame instead
 *     and must be cheap. A prop standing on a tile that is itself redrawn
 *     every frame (the hearth) is drawn live too, or the tile paints over it.
 *   - `LIGHTS` names the kinds that give light, so the room's light pass can
 *     find them without a second table.
 */
import { TIM, STO, SAN, SNO, WAR, WAT, GRASS, CON, DRY, ATMO } from './palette.js';
import { BEK_T } from './data.js';

/* kinds that are redrawn every frame rather than baked into the cache */
export const LIVE = { cat: 1 };
/* Kinds that throw light, and how far — read by index.js's light pass.
   `peak` is out of 16 and means how much of the *daylight* picture the pool
   resolves to at its centre, not how much warm paint goes down; it was
   rescaled when local light stopped being an overlay. See lamp.js. */
export const LIGHTS = { candle: { r: 1.2, peak: 10 }, lamp: { r: 1.8, peak: 13 } };

/* Each takes (A, px, py, v) where `v` is a small integer of variation off the
   tile hash, so two of the same prop in one room are not the same prop. */
export const PROP = {

  /* ---- on the table -------------------------------------------------- */
  crockery(A, px, py, v) {
    A.fill(TIM[0], px + 9, py + 17, 15, 2);                    /* shadow      */
    A.fill(SNO[0], px + 8, py + 8, 14, 8);                     /* a bowl      */
    A.fill(SNO[1], px + 8, py + 8, 14, 2);
    A.fill(WAT[3], px + 10, py + 10, 10, 3);                   /* what is in it */
    A.fill(SNO[0], px + 24, py + 11, 7, 7);                    /* and a cup   */
    A.fill(SNO[1], px + 24, py + 11, 7, 2);
    A.fill(TIM[2], px + 31, py + 13, 2, 3);                    /* its handle  */
  },
  loaf(A, px, py, v) {
    A.fill(TIM[0], px + 9, py + 20, 20, 2);
    A.fill(SAN[1], px + 8, py + 10, 20, 10);
    A.fill(SAN[2], px + 8, py + 10, 20, 3);
    A.fill(TIM[2], px + 12 + v, py + 12, 2, 6);                /* the cut end */
    A.fill(TIM[2], px + 19 + v, py + 13, 2, 5);
  },
  candle(A, px, py, v) {
    A.fill(TIM[0], px + 16, py + 24, 10, 2);
    A.fill(STO[3], px + 16, py + 20, 8, 5);                    /* the dish    */
    A.fill(SNO[1], px + 18, py + 9, 4, 12);                    /* the candle  */
    A.fill(SNO[0], px + 21, py + 9, 1, 12);
    A.fill(WAR[2], px + 19, py + 5, 2, 4);                     /* the flame   */
    A.fill(WAR[4], px + 19, py + 4, 2, 2);
  },
  lamp(A, px, py, v) {
    A.fill(TIM[0], px + 11, py + 27, 16, 2);
    A.fill(STO[3], px + 12, py + 23, 14, 5);                   /* the base    */
    A.fill(WAR[3], px + 13, py + 12, 12, 11);                  /* the glass   */
    A.fill(WAR[4], px + 15, py + 15, 6, 6);                    /* the wick    */
    A.fill(STO[4], px + 13, py + 10, 12, 3);                   /* the chimney */
    A.fill(STO[2], px + 17, py + 6, 4, 5);
  },

  /* ---- at the fire ---------------------------------------------------- */
  kettle(A, px, py, v) {
    A.fill(ATMO[0], px + 10, py + 26, 18, 3);
    A.fill(STO[2], px + 10, py + 12, 18, 15);                  /* the body    */
    A.fill(STO[3], px + 12, py + 14, 6, 5);                    /* worn shine  */
    A.fill(STO[0], px + 10, py + 24, 18, 3);
    A.fill(STO[3], px + 8, py + 6, 2, 7);                      /* the handle  */
    A.fill(STO[3], px + 28, py + 6, 2, 7);
    A.fill(STO[3], px + 8, py + 5, 22, 2);
    A.fill(STO[2], px + 27, py + 15, 6, 3);                    /* the spout   */
  },
  firewood(A, px, py, v) {
    /* Split logs stacked end-on, three then two, because that is how a stack
       against a wall sits. Dark bark ring, pale cut end: the end grain of
       split wood really is several steps lighter than its bark, and it is
       what makes a woodpile read against a timber floor. */
    const log = (lx, ly) => {
      A.fill(ATMO[0], px + lx, py + ly, 11, 11);
      A.fill(TIM[0], px + lx + 1, py + ly + 1, 9, 9);
      A.fill(TIM[4], px + lx + 2, py + ly + 2, 7, 7);
      A.fill(TIM[3], px + lx + 4, py + ly + 4, 3, 3);
    };
    log(2, 18); log(13, 18); log(24, 18);
    log(7 + v, 7); log(19 - v, 7);
  },
  cat(A, px, py, v, t) {
    /* Asleep by the fire, breathing. Two frames, four seconds apart — the
       only animation in a room, which is the point of it. */
    /* Grey rather than brown: a brown cat on a brown floor is a smudge. */
    const b = Math.sin((t || 0) * 1.6 + v) > 0 ? 1 : 0;
    A.fill(ATMO[0], px + 5, py + 15 - b, 28, 14 + b);          /* the ink     */
    A.fill(STO[1], px + 7, py + 17 - b, 24, 10 + b);           /* curled body */
    A.fill(STO[3], px + 9, py + 19 - b, 11, 4);                /* a lit flank */
    A.fill(STO[2], px + 16, py + 21 - b, 8, 3);
    A.fill(ATMO[0], px + 23, py + 10, 12, 12);                 /* the head    */
    A.fill(STO[2], px + 25, py + 13, 8, 7);
    A.fill(ATMO[0], px + 25, py + 10, 3, 3);                   /* two ears    */
    A.fill(ATMO[0], px + 30, py + 10, 3, 3);
    A.fill(ATMO[0], px + 26, py + 16, 6, 1);                   /* shut eyes   */
    A.fill(STO[1], px + 3, py + 21, 6, 3);                     /* a tail      */
  },

  /* ---- on a shelf or a peg -------------------------------------------- */
  jars(A, px, py, v) {
    const jar = (lx, w, h, col) => {
      A.fill(STO[0], px + lx, py + 26 - h, w, h);
      A.fill(col, px + lx + 1, py + 27 - h, w - 2, h - 2);
      A.fill(SNO[0], px + lx + 1, py + 26 - h, w - 2, 2);      /* the lid     */
    };
    jar(4, 9, 15, WAR[1]); jar(15, 8, 12 + v, GRASS[1]); jar(25, 10, 16, DRY[1]);
  },
  herbs(A, px, py, v) {
    /* three bunches hung to dry from a beam, at three lengths */
    A.fill(TIM[0], px, py + 5, 40, 3);                         /* the beam    */
    const bunch = (lx, len, col) => {
      A.fill(DRY[0], px + lx, py + 8, 1, len);
      A.fill(col, px + lx - 3, py + 8 + len, 7, 7);
      A.fill(CON[1], px + lx - 2, py + 10 + len, 5, 4);
    };
    bunch(9, 6 + v, GRASS[1]); bunch(20, 11, CON[2]); bunch(30, 4 + v, DRY[1]);
  },
  coat(A, px, py, v) {
    A.fill(STO[3], px + 17, py + 7, 6, 2);                     /* the peg     */
    A.fill(WAT[2], px + 11, py + 9, 18, 18);                   /* the coat    */
    A.fill(WAT[3], px + 11, py + 9, 18, 3);
    A.fill(ATMO[0], px + 19, py + 12, 2, 15);
    A.fill(WAT[1], px + 11, py + 24, 18, 3);
  },
  picture(A, px, py, v) {
    A.fill(TIM[0], px + 7, py + 8, 26, 22);                    /* the frame   */
    A.fill(TIM[3], px + 8, py + 9, 24, 20);
    A.fill(WAT[4], px + 10, py + 11, 20, 10);                  /* a fjord     */
    A.fill(CON[2], px + 10, py + 17, 20, 6);
    A.fill(SNO[0], px + 12 + v, py + 13, 5, 3);
    A.fill(SAN[1], px + 10, py + 23, 20, 4);
  },
  net(A, px, py, v) {
    A.fill(TIM[0], px + 4, py + 7, 32, 2);
    for (let i = 0; i < 5; i++) A.fill(DRY[1], px + 6 + i * 7, py + 9, 1, 18 - (i % 2) * 5);
    for (let j = 0; j < 3; j++) A.fill(DRY[1], px + 5, py + 12 + j * 6, 30 - j * 4, 1);
    A.fill(TIM[2], px + 8, py + 27, 4, 3);                     /* the floats  */
    A.fill(TIM[2], px + 20, py + 25, 4, 3);
  },
  rod(A, px, py, v) {
    A.fill(TIM[3], px + 8, py + 4, 3, 32);                     /* the rod     */
    A.fill(TIM[1], px + 8, py + 28, 3, 8);                     /* the grip    */
    A.fill(STO[3], px + 11, py + 25, 5, 5);                    /* the reel    */
    A.fill(STO[4], px + 12, py + 26, 3, 3);
    A.fill(SNO[0], px + 11, py + 6, 12, 1);                    /* the line    */
    A.fill(SNO[0], px + 22, py + 6, 1, 9);
  },

  /* ---- on the floor ---------------------------------------------------- */
  boots(A, px, py, v) {
    /* Black rubber, which is what they would be, and what stops them being
       two brown smudges by a brown door. */
    const boot = lx => {
      A.fill(ATMO[0], px + lx + 2, py + 11, 10, 17);           /* the leg     */
      A.fill(STO[0], px + lx + 3, py + 12, 8, 15);
      A.fill(STO[2], px + lx + 3, py + 12, 8, 2);              /* the rolled top */
      A.fill(ATMO[0], px + lx, py + 23, 15, 6);                /* the foot    */
      A.fill(STO[0], px + lx + 1, py + 24, 13, 3);
    };
    boot(3); boot(19 + v);
  },
  broom(A, px, py, v) {
    A.fill(TIM[3], px + 20, py + 2, 3, 24);                    /* the handle  */
    A.fill(DRY[1], px + 15, py + 24, 13, 12);                  /* the head    */
    A.fill(DRY[2], px + 17, py + 25, 4, 10);
    A.fill(DRY[0], px + 15, py + 32, 13, 4);
    A.fill(TIM[1], px + 15, py + 24, 13, 2);                   /* the binding */
  },
  basket(A, px, py, v) {
    A.fill(ATMO[0], px + 6, py + 13, 26, 19);
    A.fill(TIM[3], px + 7, py + 14, 24, 17);
    A.fill(TIM[1], px + 7, py + 18, 24, 2);
    A.fill(TIM[1], px + 7, py + 24, 24, 2);
    A.fill(TIM[2], px + 11, py + 8, 16, 7);                    /* the handle  */
    A.fill(TIM[3], px + 13, py + 10, 12, 4);
  },
  flowers(A, px, py, v) {
    A.fill(TIM[2], px + 12, py + 24, 16, 8);                   /* the pot     */
    A.fill(TIM[1], px + 12, py + 24, 16, 2);
    A.fill(GRASS[1], px + 15, py + 14, 2, 11);                 /* three stems */
    A.fill(GRASS[1], px + 20, py + 12, 2, 13);
    A.fill(GRASS[1], px + 24, py + 16, 2, 9);
    A.fill(WAR[4], px + 13, py + 10, 6, 5);
    A.fill(SNO[1], px + 18, py + 8, 6, 5);
    A.fill(WAR[2], px + 22, py + 12, 6, 5);
  }
};

/* ---- the furniture -------------------------------------------------------
   Moved out of `tileDetail`'s glyph ladder and redrawn at native density on
   the way — the art uplift the app's CLAUDE.md describes, one function at a
   time. Each piece now carries an ink outline and a contact shadow for the
   same reason the props do: a brown table on a brown floor is a rectangle
   of slightly different brown, and the room has to read at a glance.
   Returns false for a glyph it does not know, so the caller can carry on. */
export function furniture(A, c, x, y) {
  const px = x * BEK_T, py = y * BEK_T, T = BEK_T;
  if (c === 'n') {                                            /* a table    */
    A.fill(ATMO[0], px, py + 5, T, 18);
    A.fill(TIM[4], px, py + 6, T, 14);                        /* the top    */
    A.fill(TIM[3], px, py + 6, T, 3);                         /* its edge   */
    A.fill(TIM[1], px, py + 20, T, 4);                        /* the apron  */
    A.fill(ATMO[0], px + 4, py + 24, 7, 15); A.fill(TIM[1], px + 5, py + 24, 5, 14);
    A.fill(ATMO[0], px + 29, py + 24, 7, 15); A.fill(TIM[1], px + 30, py + 24, 5, 14);
    return true;
  }
  if (c === 'u') {                                            /* a cupboard */
    A.fill(ATMO[0], px + 1, py, T - 2, T);
    A.fill(TIM[1], px + 3, py + 2, T - 6, T - 3);
    A.fill(TIM[3], px + 3, py + 12, T - 6, 2);                /* two shelves */
    A.fill(TIM[3], px + 3, py + 26, T - 6, 2);
    A.fill(ATMO[0], px + 19, py + 2, 2, T - 3);               /* the join    */
    A.fill(TIM[4], px + 13, py + 18, 3, 3); A.fill(TIM[4], px + 25, py + 18, 3, 3);
    return true;
  }
  if (c === 'J') {                                            /* a bench    */
    A.fill(ATMO[0], px + 2, py + 5, T - 4, 20);
    A.fill(TIM[3], px + 3, py + 16, T - 6, 8);                /* the seat   */
    A.fill(TIM[4], px + 3, py + 16, T - 6, 2);
    A.fill(TIM[2], px + 3, py + 6, T - 6, 6);                 /* the back   */
    A.fill(TIM[1], px + 5, py + 24, 6, 12); A.fill(TIM[1], px + 30, py + 24, 6, 12);
    A.fill(ATMO[0], px + 5, py + 34, 6, 2); A.fill(ATMO[0], px + 30, py + 34, 6, 2);
    return true;
  }
  if (c === 'c') {                                            /* a crate    */
    A.fill(ATMO[0], px + 3, py + 7, 34, 30);
    A.fill(TIM[3], px + 4, py + 8, 32, 28);
    A.fill(TIM[1], px + 4, py + 8, 32, 3);                    /* the battens */
    A.fill(TIM[1], px + 4, py + 20, 32, 3);
    A.fill(TIM[1], px + 18, py + 8, 3, 28);
    A.fill(TIM[4], px + 8, py + 13, 4, 2);
    return true;
  }
  if (c === 'b') {                                            /* a bed      */
    A.fill(ATMO[0], px + 1, py + 1, T - 2, T - 2);
    A.fill(TIM[2], px + 2, py + 2, T - 4, T - 4);             /* the frame  */
    A.fill(TIM[3], px + 2, py + 2, T - 4, 4);
    A.fill(SNO[1], px + 5, py + 6, T - 10, 10);               /* the pillow */
    A.fill(SNO[0], px + 5, py + 14, T - 10, 2);
    A.fill(WAT[4], px + 5, py + 18, T - 10, 16);              /* the blanket */
    A.fill(WAT[2], px + 5, py + 18, T - 10, 2);
    A.fill(WAT[2], px + 5, py + 26, T - 10, 2);
    return true;
  }
  return false;
}
