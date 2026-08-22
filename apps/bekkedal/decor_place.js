/* Bekkedal — the things a player puts down.
 *
 * Every other decor kind in this app is authored: BEK_DECOR says where it
 * stands and it is never not there. These are the kinds a placement can
 * actually be — furniture and yard-dressing the player buys or crafts,
 * carries, and sets down themselves. Where one of these stands is never
 * content: it lives in `S.placed` (index.js), keyed by map and tile, and it
 * is drawn through the exact same `PROP`/`drawProp`/`propMap` machinery
 * `decor.js`'s header describes — merged into that one table below so no
 * caller has to know a prop came from a save instead of `BEK_DECOR`.
 *
 * Same three rules as `decor.js`/`decor_outdoor.js`, plus one more:
 *   - draws inside a `native()` block at real BEK_T pixels;
 *   - an ink outline, a contact shadow, or a material that is not what it
 *     stands on;
 *   - the *indoor* kinds must not change walkability, same as authored decor
 *     — a chair or a rug is still a floor tile. The *outdoor* kinds that are
 *     genuinely a barrier (`gjerde`, `grind`) are the one deliberate
 *     exception in the whole app: `placement.js`'s `PLACE_BLOCKS` names
 *     them, and every placement of one is refused if it would trap the
 *     player — see `placement.js` and `layout_check.js`'s connectivity
 *     assertion. Nothing else placed ever blocks a tile.
 *   - `gjerde` and `sti` are neighbour-aware: index.js's `drawProp` special-
 *     cases these two kinds and hands them a cardinal `autotile.js` mask
 *     instead of the usual hash variation, so a fence run reads as a run and
 *     not four unrelated posts.
 */
import { TIM, STO, SAN, SNO, WAR, WAT, GRASS, CON, DRY, ATMO } from './palette.js';
import { AT_N, AT_E, AT_S, AT_W } from './autotile.js';

export const PROP_PLACE = {

  /* ---- indoors: furniture ---------------------------------------------- */
  stol(A, px, py, v) {                                        /* a chair    */
    /* `v` doubles as BEK_PLACE_ROT's rot here (0/1), not a hash variation —
       see index.js's drawProp. rot 0 backs onto the top edge; rot 1 turns
       the same four fills side-on, backing onto the left edge instead. */
    A.fill(ATMO[0], px + 8, py + 8, 22, 22);
    if (v) {
      A.fill(TIM[3], px + 16, py + 9, 4, 20);                  /* the seat, turned */
      A.fill(TIM[4], px + 16, py + 9, 2, 20);
      A.fill(TIM[1], px + 9, py + 9, 6, 20);                   /* the back   */
      A.fill(TIM[2], px + 20, py + 10, 10, 4); A.fill(TIM[2], px + 20, py + 24, 10, 4);
      return;
    }
    A.fill(TIM[3], px + 9, py + 16, 20, 4);                    /* the seat   */
    A.fill(TIM[4], px + 9, py + 16, 20, 2);
    A.fill(TIM[1], px + 9, py + 9, 20, 6);                     /* the back   */
    A.fill(TIM[2], px + 10, py + 20, 4, 10); A.fill(TIM[2], px + 24, py + 20, 4, 10);
  },
  bord(A, px, py, v) {                                        /* a small table */
    A.fill(ATMO[0], px + 3, py + 8, 34, 20);
    A.fill(TIM[3], px + 4, py + 9, 32, 12);                    /* the top    */
    A.fill(TIM[4], px + 4, py + 9, 32, 3);
    A.fill(TIM[1], px + 6, py + 21, 4, 10); A.fill(TIM[1], px + 30, py + 21, 4, 10);
  },
  matte(A, px, py, v) {                                       /* a rug      */
    A.fill(WAR[1], px + 3, py + 5, 34, 30);
    A.fill(WAR[2], px + 5, py + 7, 30, 26);
    A.fill(WAR[3], px + 8, py + 10, 24 - v, 20);
    A.fill(SNO[0], px + 5, py + 7, 30, 1); A.fill(SNO[0], px + 5, py + 32, 30, 1);
  },
  seng(A, px, py, v) {                                        /* a small bed */
    A.fill(ATMO[0], px + 2, py + 2, 36, 36);
    A.fill(TIM[2], px + 3, py + 3, 34, 34);
    A.fill(TIM[3], px + 3, py + 3, 34, 4);
    A.fill(SNO[1], px + 6, py + 7, 28, 9);                     /* the pillow */
    A.fill(SNO[0], px + 6, py + 14, 28, 2);
    A.fill(WAT[4], px + 6, py + 18, 28, 16);                   /* the blanket */
    A.fill(WAT[2], px + 6, py + 18, 28, 2);
    A.fill(WAT[2], px + 6, py + 26 + v, 28, 2);
  },
  hylle(A, px, py, v) {                                       /* a shelf    */
    A.fill(TIM[1], px + 3, py + 2, 34, 3);                     /* the two boards */
    A.fill(TIM[1], px + 3, py + 20, 34, 3);
    A.fill(TIM[3], px + 3, py + 5, 3, 15); A.fill(TIM[3], px + 34, py + 5, 3, 15);
    A.fill(SAN[1], px + 8, py + 8, 6, 11); A.fill(SNO[0], px + 8, py + 8, 6, 2);   /* books */
    A.fill(CON[2], px + 16, py + 9, 5, 10); A.fill(SNO[0], px + 16, py + 9, 5, 2);
    A.fill(WAR[1], px + 23 + v, py + 7, 6, 12); A.fill(SNO[0], px + 23 + v, py + 7, 6, 2);
  },
  kommode(A, px, py, v) {                                     /* a dresser  */
    A.fill(ATMO[0], px + 2, py, 36, 38);
    A.fill(TIM[2], px + 4, py + 2, 32, 34);
    A.fill(TIM[1], px + 4, py + 12, 32, 2);                    /* two drawers */
    A.fill(TIM[1], px + 4, py + 24, 32, 2);
    A.fill(TIM[4], px + 18, py + 6, 4, 3); A.fill(TIM[4], px + 18, py + 18, 4, 3);  /* pulls */
    A.fill(TIM[4], px + 18, py + 30, 4, 3);
  },

  /* ---- outdoors: yard and garden --------------------------------------- */
  gjerde(A, px, py, mask) {                                   /* fence, autotiled */
    /* `mask` here is a cardinal AT_* bitmask against neighbouring fence
       tiles, not the usual hash variation — see index.js's drawProp. A post
       always stands; a rail is drawn toward every named neighbour so a run
       of fences reads as a run rather than four lonely posts. */
    A.fill(ATMO[0], px + 16, py + 6, 6, 32);
    A.fill(TIM[2], px + 17, py + 7, 4, 30);                    /* the post   */
    A.fill(TIM[3], px + 17, py + 7, 4, 3);
    if (mask & AT_W) { A.fill(ATMO[0], px, py + 12, 17, 5); A.fill(TIM[1], px, py + 13, 17, 3);
                        A.fill(ATMO[0], px, py + 24, 17, 5); A.fill(TIM[1], px, py + 25, 17, 3); }
    if (mask & AT_E) { A.fill(ATMO[0], px + 21, py + 12, 19, 5); A.fill(TIM[1], px + 21, py + 13, 19, 3);
                        A.fill(ATMO[0], px + 21, py + 24, 19, 5); A.fill(TIM[1], px + 21, py + 25, 19, 3); }
    if (!(mask & (AT_W | AT_E))) { A.fill(TIM[1], px + 12, py + 14, 16, 3); A.fill(TIM[1], px + 12, py + 26, 16, 3); }
  },
  grind(A, px, py, v) {                                       /* a gate     */
    A.fill(ATMO[0], px + 2, py + 4, 6, 34); A.fill(TIM[2], px + 3, py + 5, 4, 32);   /* hinge post */
    A.fill(ATMO[0], px + 32, py + 4, 6, 34); A.fill(TIM[2], px + 33, py + 5, 4, 32); /* latch post */
    A.fill(ATMO[0], px + 8, py + 10, 24, 22);
    A.fill(TIM[3], px + 9, py + 11, 22, 4);                    /* the rails  */
    A.fill(TIM[3], px + 9, py + 24, 22, 4);
    A.fill(TIM[1], px + 18, py + 11, 4, 20);                   /* the brace  */
  },
  sti(A, px, py, mask) {                                      /* a worn path */
    A.fill(SAN[1], px + 4, py + 4, 32, 32);
    A.fill(SAN[2], px + 6, py + 6, 28, 28);
    if (mask & AT_N) A.fill(SAN[1], px + 10, py, 20, 6);
    if (mask & AT_S) A.fill(SAN[1], px + 10, py + 34, 20, 6);
    if (mask & AT_W) A.fill(SAN[1], px, py + 10, 6, 20);
    if (mask & AT_E) A.fill(SAN[1], px + 34, py + 10, 6, 20);
  },
  blomsterkasse(A, px, py, v) {                                /* a planter  */
    A.fill(ATMO[0], px + 4, py + 18, 32, 18);
    A.fill(TIM[2], px + 5, py + 19, 30, 16);
    A.fill(TIM[3], px + 5, py + 19, 30, 3);
    A.fill(GRASS[1], px + 8, py + 8, 2, 12); A.fill(GRASS[1], px + 16, py + 5, 2, 15);
    A.fill(GRASS[1], px + 24, py + 9, 2, 11); A.fill(GRASS[1], px + 30 - v, py + 7, 2, 13);
    A.fill(WAR[4], px + 6, py + 6, 5, 4); A.fill(SNO[1], px + 14, py + 3, 5, 4);
    A.fill(WAR[2], px + 22, py + 7, 5, 4); A.fill(WAR[4], px + 28 - v, py + 5, 5, 4);
  },
  benk(A, px, py, v) {                                        /* a garden bench */
    /* `v` is BEK_PLACE_ROT's rot again: rot 0 backs onto the top edge and
       runs the bench east-west, rot 1 turns it to run north-south instead. */
    if (v) {
      A.fill(ATMO[0], px + 10, py + 2, 22, 36);
      A.fill(TIM[3], px + 16, py + 3, 6, 34);                  /* the seat, turned */
      A.fill(TIM[4], px + 16, py + 3, 2, 34);
      A.fill(TIM[1], px + 11, py + 3, 5, 34);                  /* the back   */
      A.fill(TIM[2], px + 22, py + 5, 10, 5); A.fill(TIM[2], px + 22, py + 30, 10, 5);
      return;
    }
    A.fill(ATMO[0], px + 2, py + 10, 36, 22);
    A.fill(TIM[3], px + 3, py + 16, 34, 6);                    /* the seat   */
    A.fill(TIM[4], px + 3, py + 16, 34, 2);
    A.fill(TIM[1], px + 3, py + 11, 34, 5);                    /* the back   */
    A.fill(TIM[2], px + 5, py + 22, 5, 10); A.fill(TIM[2], px + 30, py + 22, 5, 10);
  },
  fugleskremsel(A, px, py, v) {                                /* a scarecrow */
    A.fill(ATMO[0], px + 17, py + 4, 4, 30);                   /* the post   */
    A.fill(TIM[2], px + 18, py + 5, 2, 28);
    A.fill(ATMO[0], px + 6, py + 12, 28, 3);                   /* the crossbar */
    A.fill(TIM[2], px + 7, py + 12, 26, 2);
    A.fill(DRY[1], px + 12, py + 14, 16, 12);                  /* the sacking body */
    A.fill(SAN[1], px + 15, py + 4, 10, 10);                   /* the sack head */
    A.fill(TIM[0], px + 17, py + 8, 1, 1); A.fill(TIM[0], px + 21, py + 8, 1, 1);
    A.fill(CON[2], px + 13 + v, py + 26, 6, 8);                /* one trouser leg */
  },
  skilt(A, px, py, v) {                                        /* a signpost */
    A.fill(ATMO[0], px + 16, py + 10, 6, 28);
    A.fill(TIM[2], px + 17, py + 11, 4, 26);                   /* the post   */
    A.fill(ATMO[0], px + 4, py + 4, 30, 12);
    A.fill(SAN[1], px + 5, py + 5, 28, 10);                    /* the board  */
    A.fill(TIM[3], px + 8, py + 8, 22 - v, 2)                  /* a painted line */
  }
};
