/* Bekkedal — the things past the valley floor that nobody put there for a
 * reason.
 *
 * Split out of `decor.js` purely for the 300-line rule, same precedent
 * `decor_outdoor.js` already sets: still *kinds*, drawn the same
 * `(A, px, py, v)` shape, governed by the same three rules stated in full in
 * `decor.js`'s own header —
 *
 *   - must not change walkability (BEK_SOLID knows nothing about decor);
 *   - a material that is not what it stands on, an ink outline, or a contact
 *     shadow, so nothing here is timber-on-grass or stone-on-stone;
 *   - anything on a tile redrawn every frame is drawn live too (nothing
 *     here is — see `decor.js`'s `LIVE`).
 *
 * Where each of these stands is content, in `BEK_DECOR.forest` / `.vidda` /
 * `.setra` / `.enga` / `.fjord` / `.gruva` (`data.js`) — this file only knows
 * how to draw a kind, never where one goes.
 */
import { TIM, STO, SAN, SNO, WAR, CON, DRY, ATMO, ORE } from './palette.js';
import { BEK_T } from './data.js';

/* the three ores, cycling by v so a tipped cart is not always the same one —
   the same two hues rock.js's own veins use, plus stone for a silver load */
const ORE_COL = v => [ORE[0], ORE[1], STO[4]][v % 3];

export const PROP_WILD = {

  /* ---- the wood --------------------------------------------------------- */
  deadfall(A, px, py, v) {
    /* a trunk you walk round rather than over — forest.js already draws a
       'fallen' species in the treeline, so the log itself is the same art;
       this is that log lying loose in a clearing */
    A.fill(ATMO[0], px + 1, py + 20, 38, 11);
    A.fill(TIM[1], px + 2, py + 21, 36, 8);
    A.fill(TIM[3], px + 2, py + 21, 36, 2);
    A.fill(TIM[3], px + 2, py + 21, 3, 8); A.fill(TIM[4], px + 3, py + 23, 1, 4);   /* the cut end, pale rings */
    A.fill(CON[1], px + 10 + v, py + 27, 8, 3);                 /* moss on the shaded flank */
    A.fill(CON[1], px + 24, py + 28, 6, 2);
  },
  fungi(A, px, py, v) {
    /* bracket fungi on a stump or a fallen trunk — small, so it is the
       silhouette and the pale gill-edge that read, not the fill */
    A.fill(ATMO[0], px + 12, py + 22, 16, 8);
    A.fill(TIM[1], px + 12, py + 22, 16, 8);
    A.fill(SAN[1], px + 13 + v, py + 23, 6, 3);
    A.fill(WAR[1], px + 20, py + 24, 6, 3);
  },
  root(A, px, py, v) {
    /* a root breaking the surface — needle litter humped over a gnarl of
       wood, the ground itself standing proud rather than a stamped object */
    A.fill(ATMO[0], px + 4, py + 26, 30, 6);
    A.fill(TIM[2], px + 6, py + 24, 26, 5);
    A.fill(TIM[0], px + 6, py + 24, 26, 2);
    A.fill(DRY[1], px + 2 + v, py + 30, 8, 3);                  /* litter drifted against it */
  },

  /* ---- the vidda --------------------------------------------------------- */
  cairn(A, px, py, v) {
    /* a stack of three or four flat stones, the way a way-marker is built
       above the treeline where nothing else stands to be seen from */
    A.fill(ATMO[0], px + 10, py + 26, 20, 6);
    A.fill(STO[2], px + 11, py + 24, 18, 8);
    A.fill(STO[3], px + 11, py + 24, 18, 2);
    A.fill(STO[3], px + 13 + v, py + 18, 14, 7);
    A.fill(STO[4], px + 13 + v, py + 18, 14, 2);
    A.fill(STO[2], px + 16, py + 12, 8, 7);
    A.fill(STO[4], px + 16, py + 12, 8, 1);
  },

  /* ---- the setra ---------------------------------------------------------- */
  milkchurn(A, px, py, v) {
    /* a pair of dairy churns by the hut door */
    const churn = lx => {
      A.fill(ATMO[0], px + lx, py + 30, 10, 3);
      A.fill(STO[3], px + lx + 1, py + 14, 8, 17);
      A.fill(STO[4], px + lx + 1, py + 14, 8, 3);
      A.fill(STO[2], px + lx + 2, py + 10, 6, 5);                /* the neck */
      A.fill(STO[3], px + lx + 1, py + 9, 8, 2);                 /* the lid  */
    };
    churn(4); churn(17 + v);
  },

  /* ---- the enga ----------------------------------------------------------- */
  hayrack(A, px, py, v) {
    /* a hesjestang — wire strung between two posts, hay drying over it in
       a heavy fringe rather than stacked, which is what tells it apart from
       the woodpile at a glance */
    A.fill(ATMO[0], px + 3, py + 4, 3, 30); A.fill(TIM[2], px + 4, py + 5, 1, 28);
    A.fill(ATMO[0], px + 34, py + 4, 3, 30); A.fill(TIM[2], px + 35, py + 5, 1, 28);
    A.fill(TIM[1], px + 5, py + 9, 30, 1);
    A.fill(TIM[1], px + 5, py + 19, 30, 1);
    for (let i = 0; i < 6; i++) A.fill(DRY[i % 2 ? 0 : 1], px + 5 + i * 5 + (v % 3), py + 10, 4, 9 + (i % 2) * 8);
  },

  /* ---- the fjord ------------------------------------------------------------ */
  kelp(A, px, py, v) {
    A.fill(ATMO[0], px + 6, py + 10, 26, 22);
    A.fill(STO[2], px + 8, py + 22, 22, 8);                     /* the rock it lies on */
    for (let i = 0; i < 4; i++) A.fill(WAR[0], px + 10 + i * 5 + v, py + 12, 3, 12 - (i % 2) * 4);
  },
  driftwood(A, px, py, v) {
    A.fill(ATMO[0], px + 2, py + 22, 34, 8);
    A.fill(SAN[1], px + 3, py + 23, 32, 5);
    A.fill(SAN[0], px + 3, py + 23, 32, 2);
    A.fill(STO[1], px + 10 + v, py + 24, 4, 2);                 /* a knot */
  },
  gullrock(A, px, py, v) {
    /* a boulder streaked pale where the gulls stand */
    A.fill(ATMO[0], px + 5, py + 14, 26, 18);
    A.fill(STO[2], px + 6, py + 15, 24, 16);
    A.fill(STO[3], px + 6, py + 15, 24, 4);
    A.fill(SNO[1], px + 9 + v, py + 15, 5, 10);                 /* the whitened streak */
    A.fill(SNO[1], px + 20, py + 15, 4, 7);
  },
  slipway(A, px, py, v) {
    /* a stone ramp run down into the water */
    A.fill(STO[2], px, py + 2, BEK_T, 36);
    A.fill(STO[3], px, py + 2, BEK_T, 4);
    for (let i = 0; i < 4; i++) A.fill(STO[1], px + 2, py + 6 + i * 8 + (v % 2), 36, 2);
  },
  jettypost(A, px, py, v) {
    /* a single mooring post, stood beside the pier planks it does not
       replace — the plank art stays in index.js's tileDetail 'P' case */
    A.fill(ATMO[0], px + 16, py + 2, 6, 20);
    A.fill(TIM[2], px + 17, py + 3, 4, 18);
    A.fill(TIM[3], px + 17, py + 3, 4, 2);
    A.fill(TIM[0], px + 18 + v, py + 10, 2, 4);                 /* an iron band */
  },

  /* ---- the gruva ------------------------------------------------------------ */
  timbering(A, px, py, v) {
    /* a set of pit props holding a gallery roof — two uprights and a cap,
       pale sawn timber against the dug rock */
    A.fill(ATMO[0], px + 2, py, 6, BEK_T); A.fill(TIM[2], px + 3, py, 4, BEK_T);
    A.fill(ATMO[0], px + 32, py, 6, BEK_T); A.fill(TIM[2], px + 33, py, 4, BEK_T);
    A.fill(TIM[1], px + 2, py, 36, 5);
    A.fill(TIM[3], px + 2, py, 36, 2);
  },
  railtrack(A, px, py, v) {
    A.fill(TIM[1], px + 4, py + 6 + v, 32, 3); A.fill(TIM[1], px + 4, py + 30 - v, 32, 3);
    A.fill(STO[4], px + 6, py + 5 + v, 2, 30); A.fill(STO[4], px + 32, py + 5 + v, 2, 30);
  },
  orecart(A, px, py, v) {
    A.fill(ATMO[0], px + 4, py + 14, 32, 18);
    A.fill(STO[3], px + 6, py + 16, 28, 14);
    A.fill(STO[1], px + 8, py + 18, 24, 8);                     /* tipped, spilled ore inside */
    A.fill(ORE_COL(v), px + 10, py + 26, 20, 3);
    A.fill(ATMO[0], px + 8, py + 34, 6, 4); A.fill(ATMO[0], px + 26, py + 34, 6, 4);
    A.fill(STO[4], px + 9, py + 34, 4, 4); A.fill(STO[4], px + 27, py + 34, 4, 4);
  },
  spoilheap(A, px, py, v) {
    A.fill(ATMO[0], px + 2, py + 16, 36, 20);
    A.fill(STO[1], px + 4, py + 18, 32, 16);
    A.fill(STO[2], px + 6 + v, py + 18, 20, 6);
    A.fill(STO[3], px + 10, py + 16, 8, 4);
  },
  ladder(A, px, py, v) {
    A.fill(ATMO[0], px + 10, py, 3, BEK_T); A.fill(TIM[2], px + 11, py, 1, BEK_T);
    A.fill(ATMO[0], px + 25, py, 3, BEK_T); A.fill(TIM[2], px + 26, py, 1, BEK_T);
    for (let i = 0; i < 7; i++) A.fill(TIM[1], px + 10, py + 3 + i * 5 + (v % 2), 17, 2);
  }
};
