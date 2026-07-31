/* Killer Queen — the Act 1 boss. Built to be immediately unlike the human
   fighters: a sleek pink-and-black armoured Stand with a smooth,
   deliberately eyeless head, clawed hands and a heavy hip belt.

   Phase 2 is a visual state, not a stat change (§9): the seams along its
   armour light up, the crest opens and a red core burns through the
   chest, so the transition is impossible to miss even with the sound
   off. */

import { skeleton, drawLimb, hand, torsoPoly, bodyPt, bodyPoly } from './body.js';
import { poly, place, disc, ellipse, line, px, limbShape } from './draw.js';
import { KQ, S, SH, BASE, LT, RIM } from './palette.js';

export const SPEC = {
  hipH: 52, spineL: 33, neckL: 12, neckW: 8,
  thigh: 27, shin: 25, upper: 24, fore: 22,
  shoulderW: 26, shoulderPad: 8, chestW: 32, waistW: 22, hipW: 18,
  shoulderDrop: 1, footLen: 16, footH: 6, headScale: 1.2, height: 118
};

function seam(g, a, b, phase, t) {
  line(g, a[0], a[1], b[0], b[1], 1, phase > 0 ? KQ.glow : KQ.black[BASE]);
  if (phase > 0 && t) line(g, a[0], a[1] - 1, b[0], b[1] - 1, 1, '#FFB0C8');
}

function chest(g, sk, phase, tsec) {
  poly(g, torsoPoly(sk, SPEC, 0), KQ.pink[BASE]);
  poly(g, bodyPoly(sk, [[-16, 1.0], [-5, 1.0], [-4, 0.5], [-3, -0.02], [-11, -0.02]]), KQ.pink[SH]);
  poly(g, bodyPoly(sk, [[3, 0.98], [15, 0.98], [12, 0.5], [8, -0.02], [3, -0.02]]), KQ.pink[LT]);
  poly(g, bodyPoly(sk, [[12.5, 0.96], [16.5, 0.95], [12.5, 0.5], [8.5, 0.0], [7, 0.02], [10, 0.5]]), KQ.pink[RIM]);
  /* black chest plate with a lit core */
  poly(g, bodyPoly(sk, [[-9, 0.92], [9, 0.9], [7, 0.42], [-7, 0.44]]), KQ.black[BASE]);
  poly(g, bodyPoly(sk, [[-9, 0.92], [9, 0.9], [8.6, 0.84], [-8.6, 0.86]]), KQ.black[LT]);
  const core = bodyPt(sk, 0, 0.66);
  const pulse = phase > 0 ? 3 + Math.sin(tsec * 7) * 1.2 : 2.4;
  ellipse(g, core[0], core[1], pulse + 1, pulse, phase > 0 ? '#7A0E22' : KQ.black[S]);
  ellipse(g, core[0], core[1], pulse * 0.6, pulse * 0.55, phase > 0 ? KQ.glow : KQ.pink[SH]);
  if (phase > 0) px(g, core[0] - 1, core[1] - 1, 2, 2, '#FFE0E8');
  /* abdominal segmentation */
  for (let i = 0; i < 3; i++) {
    const v = 0.36 - i * 0.11;
    poly(g, bodyPoly(sk, [[-7, v], [7, v - 0.01], [6, v - 0.07], [-6, v - 0.06]]), KQ.pink[LT]);
    seam(g, bodyPt(sk, -7, v - 0.075), bodyPt(sk, 7, v - 0.085), phase, false);
  }
  /* hip belt with gold buckle */
  poly(g, bodyPoly(sk, [[-12, 0.16], [12, 0.13], [11, -0.04], [-11, -0.01]]), KQ.black[BASE]);
  poly(g, bodyPoly(sk, [[-12, 0.16], [12, 0.13], [11.8, 0.09], [-11.8, 0.12]]), KQ.black[LT]);
  poly(g, bodyPoly(sk, [[-4, 0.15], [4, 0.14], [3.4, 0.0], [-3.4, 0.01]]), KQ.gold[BASE]);
  poly(g, bodyPoly(sk, [[-2.6, 0.13], [2.4, 0.12], [2, 0.05], [-2.2, 0.06]]), KQ.gold[LT]);
  /* pauldrons */
  [-1, 1].forEach(side => {
    const c = bodyPt(sk, side * 15, 1.0);
    poly(g, [[c[0] - 8, c[1] - 5], [c[0] + 8, c[1] - 4], [c[0] + 7, c[1] + 6], [c[0] - 7, c[1] + 5]], KQ.pink[SH]);
    poly(g, [[c[0] - 7, c[1] - 4], [c[0] + 4, c[1] - 3.4], [c[0] + 3, c[1] + 0.6], [c[0] - 6, c[1] + 0.2]], KQ.pink[LT]);
    poly(g, [[c[0] - 4, c[1] + 2.4], [c[0] + 6, c[1] + 3], [c[0] + 5, c[1] + 5.6], [c[0] - 4, c[1] + 5]], KQ.black[BASE]);
    if (phase > 0) seam(g, [c[0] - 6, c[1] + 1.6], [c[0] + 6, c[1] + 2.2], phase, true);
  });
}

function kqHead(g, sk, pose, phase, tsec) {
  const cx = sk.head.x, cy = sk.head.y, ang = sk.headAng * 0.5, k = SPEC.headScale;
  const P = pts => place(pts, cx, cy, ang, k);
  poly(g, [[sk.sh.x - 4, sk.sh.y + 1], [sk.sh.x + 4, sk.sh.y + 1], [cx + 3, cy + 5], [cx - 3, cy + 5]], KQ.pink[SH]);
  /* smooth eyeless skull */
  poly(g, P([[-8, -3], [-5, -9], [1, -11], [7, -8.5], [9.5, -3.5], [9, 2], [5, 7], [0, 9], [-5, 6.5], [-8, 1]]), KQ.pink[BASE]);
  poly(g, P([[-3, -9.6], [3, -10.4], [8, -6.6], [9, -1.6], [3.5, -4.6], [-2, -6]]), KQ.pink[LT]);
  poly(g, P([[-8, 0.5], [-3.5, 5.5], [1, 8.6], [-3, 8], [-6.5, 4.5]]), KQ.pink[SH]);
  /* black mask across the brow, and the crest */
  poly(g, P([[-8.4, -3.4], [1, -11.2], [7.4, -8.6], [9.8, -3.6], [4, -5.4], [-3, -4.6]]), KQ.black[BASE]);
  poly(g, P([[-6, -6.4], [0.6, -10.2], [6, -8], [1, -7.6], [-4, -5.6]]), KQ.black[LT]);
  const open = phase > 0 ? 3.5 : 0;
  poly(g, P([[-2, -10.6], [1, -14 - open], [4, -12 - open * 0.6], [3.5, -9.6]]), KQ.black[BASE]);
  poly(g, P([[-1.4, -10.8], [0.6, -13.4 - open], [2, -12.6 - open * 0.6]]), KQ.gold[BASE]);
  poly(g, P([[-7.6, -4.6], [-5, -8.6], [-3.4, -4.2]]), KQ.black[BASE]);
  /* gold eye-ornaments where a face would be */
  [[-3.6, -1.4], [4.6, -2.4]].forEach(([ex, ey]) => {
    poly(g, P([[ex - 2, ey - 1.2], [ex + 2, ey - 1.8], [ex + 2.2, ey + 0.6], [ex - 1.8, ey + 1]]), KQ.gold[BASE]);
    poly(g, P([[ex - 1.4, ey - 0.8], [ex + 1.4, ey - 1.3], [ex + 1.4, ey - 0.2], [ex - 1.3, ey + 0.2]]),
      phase > 0 ? KQ.glow : KQ.gold[LT]);
  });
  /* mouth seam, opening on a shout */
  if (pose.mouth === 'shout' || pose.mouth === 'open') {
    poly(g, P([[0.4, 3], [5.4, 2.2], [5, 5.6], [0.6, 6.2]]), KQ.black[S]);
    for (let i = 0; i < 3; i++) poly(g, P([[1 + i * 1.6, 3], [1.9 + i * 1.6, 2.9], [1.9 + i * 1.6, 5.9], [1 + i * 1.6, 6]]), '#F2D8E2');
  } else {
    seam(g, ...[P([[0.4, 4]])[0], P([[5.4, 3.2]])[0]], phase, false);
  }
  if (phase > 0) {
    seam(g, P([[-6, -3]])[0], P([[-2, 2]])[0], phase, true);
    seam(g, P([[8, -3.6]])[0], P([[4.5, 1.6]])[0], phase, true);
  }
}

function kqArm(g, j, pose, front, phase) {
  drawLimb(g, j, front ? 15 : 13.5, front ? 11.5 : 10.5, 9, KQ.pink, null, front ? '#040407' : null);
  const dx = j.wrist.x - j.elbow.x, dy = j.wrist.y - j.elbow.y;
  const len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
  limbShape(g, j.elbow.x + ux * 2, j.elbow.y + uy * 2, j.wrist.x - ux * 3, j.wrist.y - uy * 3, 12, 10, KQ.black);
  poly(g, [
    [j.wrist.x - ux * 3 - uy * 5.5, j.wrist.y - uy * 3 + ux * 5.5],
    [j.wrist.x - ux * 3 + uy * 5.5, j.wrist.y - uy * 3 - ux * 5.5],
    [j.wrist.x + uy * 5.5, j.wrist.y - ux * 5.5],
    [j.wrist.x - uy * 5.5, j.wrist.y + ux * 5.5]
  ], KQ.gold[BASE]);
  hand(g, j.wrist.x + ux * 4, j.wrist.y + uy * 4, j.foreAng, 13, KQ.black, 'claw');
}

function kqLeg(g, j, phase, front) {
  drawLimb(g, j, 17, 13, 10, KQ.pink, null, front ? '#040407' : null);
  limbShape(g, j.knee.x, j.knee.y, j.ankle.x, j.ankle.y, 13, 11, KQ.black);
  poly(g, [[j.knee.x - 6, j.knee.y - 5], [j.knee.x + 6, j.knee.y - 4], [j.knee.x + 5, j.knee.y + 4], [j.knee.x - 5, j.knee.y + 3]], KQ.pink[LT]);
  const a = Math.max(-0.4, Math.min(0.4, j.shinAng * 0.3));
  poly(g, place([[-5, -6], [10, -7], [13, -2], [13, 1], [-6, 1]], j.ankle.x, j.ankle.y, a), KQ.black[BASE]);
  poly(g, place([[-5, -6], [8, -6.8], [9, -3.4], [-5.4, -2.8]], j.ankle.x, j.ankle.y, a), KQ.black[LT]);
  poly(g, place([[-6, -1.6], [13, -1.8], [13, 1], [-6, 1]], j.ankle.x, j.ankle.y, a), KQ.gold[SH]);
}

export function drawKillerQueen(g, pose, phaseIndex, tsec) {
  const sk = skeleton(SPEC, pose);
  const ph = phaseIndex || 0;
  kqLeg(g, sk.legRear, ph);
  kqArm(g, sk.armRear, pose, false, ph);
  chest(g, sk, ph, tsec || 0);
  kqLeg(g, sk.legFront, ph, true);
  kqHead(g, sk, pose, ph, tsec || 0);
  kqArm(g, sk.armFront, pose, true, ph);
  return sk;
}
