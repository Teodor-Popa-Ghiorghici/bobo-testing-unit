/* Morioh's rank and file: the delinquent (baseline) and Angelo (elite).
   One painter, two builds -- per §13 variety comes from data, not from a
   second sprite pipeline. Each build supplies its own proportions, ramps
   and a hair routine, which is enough for them to read as different
   people at a glance: the delinquent is stocky with a tall pompadour and
   a leather jacket, Angelo is gaunt, hunched and sallow in a long coat. */

import { skeleton, drawLimb, hand, boot, torsoPoly, bodyPt, bodyPoly } from './body.js';
import { poly, place, line, px } from './draw.js';
import { head, neck, eyes, brows, mouth, sweat } from './face.js';
import { THUG as T, ANGELO as A, S, SH, BASE, LT, RIM } from './palette.js';

function jacket(g, sk, spec, b) {
  poly(g, torsoPoly(sk, spec, 0), b.cloth[BASE]);
  poly(g, bodyPoly(sk, [[-17, 1.0], [-5, 1.0], [-3, 0.5], [-2.5, -0.02], [-10, -0.02]]), b.cloth[SH]);
  poly(g, bodyPoly(sk, [[2, 0.98], [15, 0.98], [12, 0.5], [8.5, -0.02], [2.5, -0.02]]), b.cloth[LT]);
  poly(g, bodyPoly(sk, [[12.5, 0.95], [16.5, 0.94], [12.5, 0.5], [9, 0.02], [7.5, 0.04], [10, 0.5]]), b.cloth[RIM]);
  /* open front: shirt wedge + lapels */
  poly(g, bodyPoly(sk, [[1.5, 0.96], [10, 0.94], [7, 0.3], [4.5, 0.05], [1, 0.06]]), b.shirt[BASE]);
  poly(g, bodyPoly(sk, [[3, 0.94], [7, 0.92], [5.5, 0.35], [3.5, 0.16]]), b.shirt[LT]);
  poly(g, bodyPoly(sk, [[-2, 1.02], [4, 1.0], [8.5, 0.62], [5, 0.58], [-1, 0.9]]), b.cloth[SH]);
  poly(g, bodyPoly(sk, [[-2, 1.02], [1.5, 1.01], [4.5, 0.66], [2, 0.66]]), b.cloth[LT]);
  /* waistband + a couple of fold creases */
  poly(g, bodyPoly(sk, [[-10, 0.14], [10, 0.1], [9.6, -0.02], [-9.6, 0.02]]), b.pants[S]);
  for (let i = 0; i < 2; i++) {
    const v = 0.34 + i * 0.22;
    const p0 = bodyPt(sk, -8 + i * 2, v), p1 = bodyPt(sk, 0 + i * 2, v - 0.06);
    line(g, p0[0], p0[1], p1[0], p1[1], 1, b.cloth[S]);
  }
  if (b.collar) {
    poly(g, bodyPoly(sk, [[-10, 1.0], [-6, 1.22], [6, 1.2], [10, 0.98], [6, 0.95], [-7, 0.96]]), b.cloth[SH]);
    poly(g, bodyPoly(sk, [[5, 1.2], [10, 0.98], [8, 0.96], [4.5, 1.12]]), b.cloth[LT]);
  }
}

function paint(g, pose, b) {
  const spec = b.spec;
  const sk = skeleton(spec, pose);

  /* rear leg + arm */
  drawLimb(g, sk.legRear, 13, 10, 8, b.pants);
  boot(g, sk.legRear.ankle.x, sk.legRear.ankle.y, sk.legRear.shinAng, spec, b.shoe, b.shoe);
  drawLimb(g, sk.armRear, 11, 9, 7.4, b.cloth);
  hand(g, sk.armRear.wrist.x, sk.armRear.wrist.y, sk.armRear.foreAng, 10, b.skin, pose.handRear);

  if (b.coatTail) b.coatTail(g, sk, pose);
  jacket(g, sk, spec, b);

  drawLimb(g, sk.legFront, 13.5, 10.5, 8, b.pants, null, '#05060A');
  boot(g, sk.legFront.ankle.x, sk.legFront.ankle.y, sk.legFront.shinAng, spec, b.shoe, b.shoe);

  /* head */
  const cx = sk.head.x, cy = sk.head.y, ang = sk.headAng * 0.6;
  neck(g, sk, spec, b.skin);
  head(g, cx, cy, ang, b.skin, { scale: spec.headScale });
  poly(g, place([[-7.4, -6.2], [7.6, -5.2], [7.0, -2.0], [-6.8, -3.0]], cx, cy, ang, spec.headScale), b.skin[SH]);
  eyes(g, cx, cy, ang, spec.headScale, b.face, pose.eyes, pose.blink, pose.pupil);
  brows(g, cx, cy, ang, spec.headScale, b.face, pose.brow);
  mouth(g, cx, cy, ang, spec.headScale, b.face, pose.mouth, b.skin);
  b.hair(g, cx, cy, ang, spec.headScale, pose);
  if (pose.action === 'hurt' || pose.flash > 0.3) sweat(g, cx, cy, ang, spec.headScale, (pose.t || 0) * 3);

  /* front arm last, over everything */
  drawLimb(g, sk.armFront, 12, 9.6, 7.8, b.cloth, null, '#05060A');
  hand(g, sk.armFront.wrist.x, sk.armFront.wrist.y, sk.armFront.foreAng, 10.5, b.skin, pose.handFront);
  return sk;
}

/* ---- the delinquent --------------------------------------------------- */

const THUG_BUILD = {
  spec: {
    hipH: 42, spineL: 27, neckL: 11, neckW: 7,
    thigh: 22, shin: 20, upper: 18, fore: 17,
    shoulderW: 21, shoulderPad: 6, chestW: 27, waistW: 22, hipW: 15,
    shoulderDrop: 1.4, footLen: 13, footH: 5, headScale: 1.08, height: 96
  },
  cloth: T.jacket, shirt: T.shirt, pants: T.jeans, shoe: ['#101014', '#1B1B22', '#2A2A34', '#43434F', '#6A6A78'],
  skin: T.skin, collar: true,
  face: { ink: '#150C08', white: '#FFF6E8', iris: '#6B4A20', brow: '#2A1A06', tongue: '#8A3A46' },
  hair(g, cx, cy, ang, k, pose) {
    const P = pts => place(pts, cx, cy, ang, k);
    const f = pose.hairFlow;
    /* tall swept pompadour: the whole read of this character */
    poly(g, P([[-7.6, -6.6], [-5, -12], [2, -15.5], [9, -13], [11.5, -8], [8.5, -8.6],
      [4, -11.5], [-1, -10.5], [-4.5, -7.5]]), T.hair[BASE]);
    poly(g, P([[-4.4, -10.6], [1.5, -13.8], [7.5, -12], [9.6, -8.8], [5.5, -10.4], [0, -11.6], [-3.5, -9.6]]), T.hair[LT]);
    poly(g, P([[0, -14.6], [5, -13.4], [7.5, -11.4], [3.5, -12.4]]), T.hair[RIM]);
    poly(g, P([[-7.8, -6.4], [-4.6, -7.2], [-6 - f * 3, 0.5], [-9 - f * 4, 3.4]]), T.hair[BASE]);
    poly(g, P([[-7.4, -5.6], [-5.6, -6.2], [-6.6 - f * 3, 0.2], [-8.4 - f * 4, 2.2]]), T.hair[SH]);
    poly(g, P([[-6.8, -5.4], [4, -4.2], [6.6, -3.2], [1, -2.6], [-6, -3.4]]), T.hair[S]);
  }
};

/* ---- Angelo ----------------------------------------------------------- */

const ANGELO_BUILD = {
  spec: {
    hipH: 45, spineL: 29, neckL: 12, neckW: 6,
    thigh: 24, shin: 21, upper: 20, fore: 19,
    shoulderW: 19, shoulderPad: 4, chestW: 23, waistW: 18, hipW: 13,
    shoulderDrop: 2.2, footLen: 13, footH: 5, headScale: 1.06, height: 100
  },
  cloth: A.coat, shirt: A.shirt, pants: ['#181A20', '#25282F', '#373B45', '#4D5460', '#6E7784'],
  shoe: ['#0B0C0E', '#141519', '#202228', '#333640', '#4E525E'],
  skin: A.skin, collar: false,
  face: { ink: '#0B0C08', white: '#E8F0DC', iris: '#B82424', brow: '#151208', tongue: '#6E2A3A' },
  coatTail(g, sk, pose) {
    const sway = pose.coatFlow;
    const hipY = sk.hip.y - 6, tipY = sk.hip.y + 34;
    const cx = sk.hip.x;
    poly(g, [[cx - 13, hipY], [cx + 13, hipY],
      [cx + 17 + sway * 13, tipY - 3], [cx + 9 + sway * 14, tipY + 5],
      [cx - 6 + sway * 13, tipY + 3], [cx - 16 + sway * 12, tipY - 5]], A.coat[SH]);
    poly(g, [[cx - 13, hipY], [cx - 4, hipY], [cx - 8 + sway * 12, tipY - 2], [cx - 16 + sway * 12, tipY - 5]], A.coat[S]);
  },
  hair(g, cx, cy, ang, k, pose) {
    const P = pts => place(pts, cx, cy, ang, k);
    const f = pose.hairFlow;
    /* lank, unwashed hanks that fall over the eyes */
    poly(g, P([[-8.4, -5.4], [-4, -9.6], [3, -10.8], [8.4, -7.4], [9, -3.4], [6, -6],
      [1, -7.4], [-3, -6], [-6, -3.6]]), A.hair[BASE]);
    poly(g, P([[-4.6, -8.6], [2, -9.8], [7, -7], [3, -7.6], [-2, -7.8]]), A.hair[LT]);
    for (let i = 0; i < 4; i++) {
      const x0 = -6 + i * 4;
      poly(g, P([[x0, -7], [x0 + 2.6, -7.4], [x0 + 2.2 + f, -1 + i * 0.5], [x0 - 0.4 + f, -0.6 + i * 0.5]]), A.hair[BASE]);
    }
    poly(g, P([[-8.6, -5], [-5.6, -6], [-7 - f * 4, 3], [-10 - f * 5, 5]]), A.hair[SH]);
  }
};

export function drawThug(g, pose) { return paint(g, pose, THUG_BUILD); }
export function drawAngelo(g, pose) { return paint(g, pose, ANGELO_BUILD); }
export const THUG_SPEC = THUG_BUILD.spec;
export const ANGELO_SPEC = ANGELO_BUILD.spec;
