/* Bekkedal — the things outdoors that nobody put there for a reason.
 *
 * Split out of `decor.js` purely for the 300-line rule (root `CLAUDE.md`):
 * these are still *kinds*, drawn the same `(A, px, py, v)` shape, governed by
 * the same three rules `decor.js`'s own header states in full — repeated
 * here only as a reminder, not restated as new doctrine:
 *
 *   - must not change walkability (BEK_SOLID knows nothing about decor);
 *   - everything outdoors risks being timber-on-grass or timber-on-timber,
 *     so each carries an ink outline, a contact shadow, or a material that
 *     is not what it stands on;
 *   - anything on a tile that is itself redrawn every frame must be drawn
 *     live too (nothing here is — see `decor.js`'s `LIVE`).
 *
 * Where each of these stands is content, in `BEK_DECOR.farm` / `.town` /
 * `.lake` (`data.js`) — this file only knows how to draw a kind, never
 * where one goes.
 */
import { TIM, STO, SAN, SNO, WAR, WAT, GRASS, CON, DRY, ATMO } from './palette.js';

export const PROP_OUTDOOR = {

  /* ---- outdoors: the farm ---------------------------------------------- */
  woodpile(A, px, py, v) {
    /* a bigger stack than the indoor firewood — three courses against a
       wall, split-log ends pale against the bark the way the indoor one is */
    const log = (lx, ly) => {
      A.fill(ATMO[0], px + lx, py + ly, 13, 12);
      A.fill(TIM[0], px + lx + 1, py + ly + 1, 11, 10);
      A.fill(TIM[4], px + lx + 2, py + ly + 2, 9, 8);
      A.fill(TIM[3], px + lx + 5, py + ly + 4, 3, 3);
    };
    log(1, 24); log(13, 24); log(25, 24);
    log(4, 12); log(16, 12); log(28 - v, 12);
    log(8 + v, 0); log(20, 0);
  },
  washline(A, px, py, v) {
    A.fill(ATMO[0], px + 2, py + 4, 3, 30);  A.fill(TIM[2], px + 3, py + 5, 1, 28);
    A.fill(ATMO[0], px + 35, py + 4, 3, 30); A.fill(TIM[2], px + 36, py + 5, 1, 28);
    A.fill(TIM[1], px + 4, py + 9, 32, 1);
    const cloth = (lx, w, col) => {
      A.fill(ATMO[0], px + lx, py + 9, w, 14);
      A.fill(col, px + lx + 1, py + 10, w - 2, 12);
    };
    cloth(6 + v, 9, SNO[1]); cloth(18, 8, WAT[2]); cloth(28 - v, 7, WAR[2]);
  },
  waterbutt(A, px, py, v) {
    A.fill(ATMO[0], px + 8, py + 32, 20, 3);
    A.fill(TIM[2], px + 8, py + 8, 20, 26);
    A.fill(TIM[0], px + 8, py + 8, 20, 2); A.fill(TIM[0], px + 8, py + 20, 20, 2); A.fill(TIM[0], px + 8, py + 32, 20, 2);
    A.fill(WAT[1], px + 10, py + 9, 16, 3);                     /* rainwater, near full */
    A.fill(WAT[3], px + 11, py + 9, 6, 1);
  },
  bootscraper(A, px, py, v) {
    A.fill(ATMO[0], px + 14, py + 26, 12, 4);
    A.fill(STO[3], px + 15, py + 20, 2, 8); A.fill(STO[3], px + 23, py + 20, 2, 8);
    A.fill(STO[4], px + 15, py + 18, 10, 3);                    /* the blade */
  },
  brokenfence(A, px, py, v) {
    A.fill(ATMO[0], px + 6, py + 10, 4, 24);
    A.fill(TIM[2], px + 7, py + 11, 2, 22);
    A.fill(ATMO[0], px + 14, py + 20 + v, 18, 4);                /* the snapped rail, fallen */
    A.fill(TIM[1], px + 15, py + 21 + v, 16, 2);
    A.fill(TIM[3], px + 29, py + 19 + v, 3, 3);                  /* the splintered end */
    A.fill(GRASS[3], px + 18, py + 30, 6, 3);                     /* grass grown up round it */
  },
  wheelbarrow(A, px, py, v) {
    A.fill(ATMO[0], px + 6, py + 14, 26, 16);
    A.fill(STO[2], px + 8, py + 16, 22, 12);                    /* the pan   */
    A.fill(STO[3], px + 8, py + 16, 22, 3);
    A.fill(TIM[1], px + 4, py + 26, 4, 10); A.fill(TIM[1], px + 30, py + 26, 4, 10);  /* the legs */
    A.fill(ATMO[0], px + 14, py + 8, 3, 10);                     /* the wheel, side-on */
    A.fill(STO[4], px + 14, py + 8, 3, 10);
  },
  weeds(A, px, py, v) {
    /* a scrubby clump at a field margin — DRY against grass, unlike the
       tended TUFT blades, so an unweeded corner reads as unweeded */
    for (let i = 0; i < 5; i++) {
      const lx = 4 + i * 6 + (i % 2) * v;
      A.fill(DRY[1], px + lx, py + 18 - (i % 3) * 3, 1, 12 + (i % 3) * 3);
    }
    A.fill(DRY[2], px + 10 + v, py + 14, 1, 1); A.fill(DRY[2], px + 22, py + 12, 1, 1);
  },
  stonewall(A, px, py, v) {
    /* one run segment, placed repeatedly — a dry-stone course, not mortar */
    A.fill(ATMO[0], px + 2, py + 14, 36, 20);
    const stone = (lx, ly, w, h) => { A.fill(STO[2], px + lx, py + ly, w, h); A.fill(STO[3], px + lx, py + ly, w, 2); };
    stone(3, 16, 10, 8); stone(14, 16, 11, 7); stone(26, 16, 10, 9);
    stone(4 + v, 25, 9, 7); stone(15, 24, 10, 8); stone(27 - v, 26, 9, 6);
    A.fill(CON[1], px + 6, py + 16, 3, 2);                       /* a fleck of moss */
  },

  /* ---- outdoors: the town ---------------------------------------------- */
  stall(A, px, py, v) {
    A.fill(ATMO[0], px + 2, py + 20, 36, 16);
    A.fill(TIM[2], px + 4, py + 22, 32, 12);                    /* the counter */
    A.fill(TIM[3], px + 4, py + 22, 32, 3);
    A.fill(TIM[1], px + 6, py + 4, 3, 20); A.fill(TIM[1], px + 31, py + 4, 3, 20);   /* two posts */
    A.fill(WAR[1], px + 2, py + 2, 36, 6);                      /* the canopy, falu red */
    A.fill(WAR[0], px + 2, py + 2, 36, 2);
    A.fill(SAN[1], px + 9 + v, py + 15, 6, 6); A.fill(GRASS[3], px + 20, py + 16, 6, 5);  /* the goods */
  },
  wellbucket(A, px, py, v) {
    A.fill(ATMO[0], px + 15, py + 4, 2, 14);                    /* the rope */
    A.fill(ATMO[0], px + 12, py + 18, 12, 10);
    A.fill(TIM[2], px + 13, py + 19, 10, 8);
    A.fill(TIM[0], px + 13, py + 19, 10, 2);
    A.fill(WAT[2], px + 15, py + 20, 6, 2);                      /* water in it */
  },
  hitchpost(A, px, py, v) {
    A.fill(ATMO[0], px + 17, py + 4, 4, 30);
    A.fill(TIM[2], px + 18, py + 5, 2, 28);
    A.fill(TIM[3], px + 18, py + 5, 2, 2);
    A.fill(STO[3], px + 14, py + 12, 10, 3);                    /* the iron ring */
    A.fill(ATMO[0], px + 16, py + 13, 6, 1);
  },
  lamppost(A, px, py, v) {
    A.fill(ATMO[0], px + 17, py + 10, 4, 26);
    A.fill(STO[2], px + 18, py + 11, 2, 24);                    /* the iron post */
    A.fill(STO[3], px + 17, py + 34, 4, 2);
    A.fill(ATMO[0], px + 12, py + 3, 14, 10);                   /* the lantern head */
    A.fill(STO[3], px + 13, py + 4, 12, 8);
    A.fill(WAR[3], px + 15, py + 5, 8, 6);                      /* lit glass */
    A.fill(WAR[4], px + 17, py + 6, 4, 4);
    A.fill(STO[4], px + 12, py + 2, 14, 2);                     /* the cap */
  },
  crate(A, px, py, v) {
    A.fill(ATMO[0], px + 3, py + 10, 30, 26);
    A.fill(TIM[3], px + 4, py + 11, 28, 24);
    A.fill(TIM[1], px + 4, py + 11, 28, 3);
    A.fill(TIM[1], px + 4, py + 21, 28, 3);
    A.fill(TIM[1], px + 16, py + 11, 3, 24);
    A.fill(TIM[4], px + 8 + v, py + 15, 4, 2);
  },

  /* ---- outdoors: the lake ------------------------------------------------ */
  boat_up(A, px, py, v) {
    /* upturned on the bank — the hull's belly is what shows, so it is the
       one boat prop that is all one curve rather than a hollow */
    A.fill(ATMO[0], px + 2, py + 16, 36, 16);
    A.fill(WAT[3], px + 4, py + 18, 32, 12);
    A.fill(WAT[4], px + 4, py + 18, 32, 3);
    A.fill(TIM[2], px + 3, py + 17, 34, 2);                     /* the keel, uppermost */
    A.fill(CON[1], px + 8 + v, py + 26, 5, 2);                  /* moss on the shaded side */
  },
  netframe(A, px, py, v) {
    A.fill(ATMO[0], px + 2, py + 2, 3, 34); A.fill(ATMO[0], px + 35, py + 2, 3, 34);
    A.fill(TIM[2], px + 3, py + 3, 1, 32); A.fill(TIM[2], px + 36, py + 3, 1, 32);
    A.fill(TIM[1], px + 3, py + 3, 34, 2);
    for (let i = 0; i < 5; i++) A.fill(DRY[1], px + 5 + i * 7, py + 5, 1, 26 - (i % 2) * 6);
    for (let j = 0; j < 4; j++) A.fill(DRY[1], px + 4, py + 8 + j * 6, 32 - (j % 2) * 3, 1);
  },
  cleantable(A, px, py, v) {
    A.fill(ATMO[0], px + 3, py + 18, 34, 4);
    A.fill(TIM[2], px + 4, py + 12, 32, 8);                     /* the plank top */
    A.fill(TIM[3], px + 4, py + 12, 32, 2);
    A.fill(TIM[1], px + 6, py + 20, 4, 10); A.fill(TIM[1], px + 30, py + 20, 4, 10);
    A.fill(SNO[0], px + 12 + v, py + 13, 8, 4);                 /* a fish, pale belly up */
    A.fill(WAT[4], px + 12 + v, py + 13, 8, 1);
  },
  reeds(A, px, py, v) {
    for (let i = 0; i < 6; i++) {
      const lx = 3 + i * 6 + (i % 2) * v, h = 16 + (i % 3) * 5;
      A.fill(CON[1], px + lx, py + 30 - h, 1, h);
      A.fill(GRASS[3], px + lx, py + 8 + (i % 2) * 3, 1, 4);    /* the reed head */
    }
  },
  rowboat(A, px, py, v) {
    /* right side up, at the dock — a hollow, unlike boat_up */
    A.fill(ATMO[0], px + 2, py + 8, 36, 22);
    A.fill(TIM[2], px + 4, py + 10, 32, 16);
    A.fill(WAT[1], px + 7, py + 12, 26, 10);                    /* what is inside it, in shadow */
    A.fill(TIM[3], px + 4, py + 10, 32, 2);
    A.fill(TIM[1], px + 16 + v, py + 6, 3, 8);                  /* a mooring post */
    A.fill(ATMO[0], px + 16 + v, py + 5, 3, 2);
  },
  mossclump(A, px, py, v) {
    /* "moss on the north side of things" as a placed clump rather than a
       north-face tint on every rock and wall — same flavour, no new pass */
    A.fill(CON[1], px + 8, py + 20 + v, 14, 8);
    A.fill(CON[2], px + 10, py + 21 + v, 8, 4);
    A.fill(CON[0], px + 6, py + 26 + v, 6, 4);
  }
};
