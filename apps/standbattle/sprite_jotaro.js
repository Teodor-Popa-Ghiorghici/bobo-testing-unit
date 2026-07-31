/* Jotaro Kujo — the player's Stand user. ~104px tall, roughly six heads,
   built as a long dark school coat over a heavy silhouette: peaked cap
   fused into the hair, high collar, chain across the chest, split coat
   skirt that swings on its own spring, boots.

   Everything is polygons in local space (feet at 0,0, facing +x) so the
   whole figure can lean, twist and swing without a single antialiased
   edge. Shading is three bands plus a rim, lit from the upper left. */

import { skeleton, drawLimb, hand, boot, torsoPoly, bodyPt, bodyPoly } from './body.js';
import { poly, place, disc, ellipse, line, px } from './draw.js';
import { head, neck, eyes, brows, mouth, sweat } from './face.js';
import { JOTARO as J, S, SH, BASE, LT, RIM } from './palette.js';

export const SPEC = {
  hipH: 48, spineL: 31, neckL: 14, neckW: 8,
  thigh: 25, shin: 22, upper: 21, fore: 19,
  shoulderW: 25, shoulderPad: 7, chestW: 30, waistW: 23, hipW: 17,
  shoulderDrop: 1.2, footLen: 15, footH: 6, headScale: 1.2,
  height: 108
};

const FACE = { ink: '#120A14', white: '#F4F0FF', iris: '#2E6B7C', brow: '#0B0710', tongue: '#933A50' };

/* ---- coat skirt ------------------------------------------------------- */

/* The long coat is three pieces: a wide back panel behind the legs, and
   two front panels that hang either side of them. Splitting it that way
   is what lets the legs move inside the coat instead of the coat reading
   as a painted-on skirt -- and the panels swing on the coat spring, so
   the cloth keeps moving after the body stops. */
function coatBack(g, sk, pose) {
  const sway = pose.coatFlow * 0.7;
  const hipY = sk.hip.y - 6, tipY = sk.hip.y + 30;
  const cx = sk.hip.x - 1;
  const pts = [
    [cx - 15, hipY], [cx + 15, hipY],
    [cx + 20 + sway * 12, tipY - 4], [cx + 15 + sway * 13, tipY + 4],
    [cx + 2 + sway * 13, tipY + 6], [cx - 13 + sway * 12, tipY + 2],
    [cx - 19 + sway * 11, tipY - 6]
  ];
  poly(g, pts, J.coat[SH]);
  poly(g, [pts[4], pts[5], pts[6], [cx - 16 + sway * 11, tipY - 1], [cx + 4 + sway * 12, tipY + 3]], J.coat[S]);
}

function coatFront(g, sk, pose, side) {
  const sway = pose.coatFlow;
  const flare = pose.action === 'dodge' || pose.action === 'rush' || pose.action === 'active' ? 5 : 0;
  const hipY = sk.hip.y - 8, len = 30;
  const x0 = sk.hip.x + side * 6;
  const tipX = x0 + sway * 14 + side * (3 + flare);
  const tipY = hipY + len;
  const outer = side * (11 + flare * 0.6);
  const pts = [
    [x0 - side * 3, hipY - 3], [x0 + outer * 0.8, hipY],
    [tipX + outer, tipY - 5], [tipX + outer * 0.82, tipY + 3],
    [tipX + side * 1, tipY + 4], [tipX - side * 4, tipY - 4]
  ];
  poly(g, pts, J.coat[BASE]);
  if (side > 0) {
    poly(g, [pts[0], [x0 + outer * 0.6, hipY + 1], [tipX + outer * 0.55, tipY - 3], [tipX - side * 3, tipY - 5]], J.coat[LT]);
    poly(g, [[tipX + outer * 0.8, tipY - 12], pts[2], pts[3], [tipX + outer * 0.6, tipY - 2]], J.coat[RIM]);
  } else {
    poly(g, [pts[0], pts[1], [tipX + outer, tipY - 6], [tipX - side * 2, tipY - 6]], J.coat[SH]);
  }
  /* inner lining shows where the panel turns away from the body */
  poly(g, [pts[4], pts[5], [tipX - side * 6, tipY - 6], [tipX - side * 2, tipY + 3]], J.coatIn[BASE]);
  poly(g, [pts[3], pts[4], [tipX - side * 2, tipY - 1], [tipX + outer * 0.7, tipY - 2]], J.coat[S]);
  for (let i = 0; i < 2; i++) {
    const u = 0.35 + i * 0.4;
    line(g, x0 + outer * u * 0.7, hipY + 4, tipX + outer * u, tipY - 6, 1, J.coat[S]);
  }
}

/* ---- torso ------------------------------------------------------------ */

function torso(g, sk, pose) {
  poly(g, torsoPoly(sk, SPEC, 0), J.coat[BASE]);
  /* back half in shadow, chest side catching the key light */
  poly(g, bodyPoly(sk, [[-19, 1.0], [-6, 1.0], [-4, 0.5], [-3, -0.02], [-11, -0.02]]), J.coat[SH]);
  poly(g, bodyPoly(sk, [[2, 0.98], [17, 0.98], [13.5, 0.5], [9.5, -0.02], [3, -0.02]]), J.coat[LT]);
  poly(g, bodyPoly(sk, [[14.5, 0.94], [19, 0.94], [14.5, 0.48], [10.5, 0.02], [8.5, 0.02], [11.5, 0.5]]), J.coat[RIM]);
  /* coat opening: a wedge of undershirt down the chest */
  poly(g, bodyPoly(sk, [[3.5, 0.95], [12, 0.92], [8, 0.4], [5.5, 0.12], [2.5, 0.14]]), J.coatIn[S]);
  poly(g, bodyPoly(sk, [[5, 0.92], [10, 0.9], [7, 0.42], [5, 0.2], [3.6, 0.22]]), J.green[BASE]);
  poly(g, bodyPoly(sk, [[5.4, 0.9], [7.6, 0.89], [5.6, 0.44], [4.6, 0.3]]), J.green[LT]);
  /* belt */
  poly(g, bodyPoly(sk, [[-11.5, 0.2], [11.5, 0.16], [11, -0.02], [-11, 0.02]]), J.boot[BASE]);
  poly(g, bodyPoly(sk, [[-11.5, 0.2], [11.5, 0.16], [11.3, 0.11], [-11.3, 0.15]]), J.boot[LT]);
  poly(g, bodyPoly(sk, [[1.5, 0.19], [6, 0.18], [5.8, 0.0], [1.3, 0.01]]), J.gold[BASE]);
  poly(g, bodyPoly(sk, [[2, 0.17], [4.6, 0.16], [4.4, 0.05], [1.9, 0.06]]), J.gold[LT]);
  /* fold creases pulling from the waist toward the far shoulder */
  for (let i = 0; i < 3; i++) {
    const v = 0.3 + i * 0.19;
    const a = bodyPt(sk, -9 + i * 1.5, v), b = bodyPt(sk, 1 + i * 2.5, v - 0.07);
    line(g, a[0], a[1], b[0], b[1], 1, J.coat[S]);
  }
  /* shoulder yoke + epaulettes */
  poly(g, bodyPoly(sk, [[-20, 1.04], [20, 1.0], [18.5, 0.8], [-18.5, 0.84]]), J.coat[SH]);
  poly(g, bodyPoly(sk, [[-19, 1.03], [3, 1.01], [2.6, 0.88], [-17.5, 0.92]]), J.coat[LT]);
  poly(g, bodyPoly(sk, [[13, 1.01], [20, 0.99], [19, 0.83], [12, 0.87]]), J.coat[RIM]);
  poly(g, bodyPoly(sk, [[-20, 1.05], [-13, 1.04], [-12.5, 0.86], [-19.5, 0.88]]), J.gold[SH]);
  poly(g, bodyPoly(sk, [[14, 1.02], [20, 1.0], [19.5, 0.9], [13.5, 0.92]]), J.gold[BASE]);
  /* gold chain looping across the chest */
  const a = bodyPt(sk, -13, 0.84), b = bodyPt(sk, 13, 0.78);
  for (let i = 0; i <= 11; i++) {
    const t = i / 11;
    const cx = a[0] + (b[0] - a[0]) * t;
    const cy = a[1] + (b[1] - a[1]) * t + Math.sin(t * Math.PI) * 6;
    px(g, cx - 1, cy - 1, 2, 2, i % 2 ? J.gold[BASE] : J.gold[LT]);
  }
}

function collar(g, sk, pose) {
  const lift = 1 + Math.max(0, pose.coatFlow) * 3;
  const p = [
    bodyPt(sk, -12, 1.0), bodyPt(sk, -9, 1.02 + lift * 0.02),
    bodyPt(sk, -6, 1.3), bodyPt(sk, 7, 1.28), bodyPt(sk, 12, 0.99), bodyPt(sk, 8, 0.96), bodyPt(sk, -8, 0.97)
  ];
  poly(g, p, J.coat[BASE]);
  poly(g, [p[1], p[2], p[3], bodyPt(sk, 5, 1.16), bodyPt(sk, -6, 1.18)], J.coat[SH]);
  poly(g, [bodyPt(sk, 6, 1.26), p[4], p[5], bodyPt(sk, 5.5, 1.12)], J.coat[LT]);
  poly(g, [bodyPt(sk, 8, 1.24), p[4], bodyPt(sk, 10.5, 1.04), bodyPt(sk, 7.6, 1.12)], J.coat[RIM]);
  poly(g, [bodyPt(sk, -6, 1.3), bodyPt(sk, 7, 1.28), bodyPt(sk, 6, 1.2), bodyPt(sk, -5, 1.22)], J.coatIn[S]);
}

/* ---- head ------------------------------------------------------------- */

function hair(g, cx, cy, ang, flow) {
  const P = pts => place(pts, cx, cy, ang, SPEC.headScale);
  /* nape mass and two loose locks that trail on the flow spring */
  poly(g, P([[-8.4, -6.6], [-4, -8.4], [-6.6, 0.6], [-9.6 - flow * 3, 4.4 + flow], [-8.8, -1.2]]), J.hair[BASE]);
  poly(g, P([[-8.6, -2.0], [-6.6, -1.0], [-8.2 - flow * 4, 5.6 + flow * 2], [-10.2 - flow * 5, 3.2 + flow * 2]]), J.hair[SH]);
  /* fringe: hard spikes over the brow, the read-at-a-glance shape */
  poly(g, P([[-6.6, -8.2], [2.2, -9.8], [7.4, -6.6], [8.0, -3.0], [5.6, -4.6], [2.4, -3.2],
    [0.4, -5.0], [-2.6, -3.0], [-4.4, -5.2], [-6.8, -4.0]]), J.hair[BASE]);
  poly(g, P([[-5.2, -7.6], [1.6, -9.0], [5.6, -6.6], [3.0, -6.2], [-1.0, -7.0], [-4.4, -6.0]]), J.hair[LT]);
  poly(g, P([[0.6, -8.8], [3.6, -8.4], [2.6, -7.2], [0.2, -7.6]]), J.hair[RIM]);
  poly(g, P([[-6.6, -4.6], [-2.6, -3.2], [0.2, -4.6], [1.0, -2.2], [-3.0, -1.4], [-6.4, -2.6]]), J.hair[S]);
}

function cap(g, cx, cy, ang) {
  const P = pts => place(pts, cx, cy, ang, SPEC.headScale);
  poly(g, P([[-8.8, -7.0], [-5.0, -11.4], [1.6, -12.6], [6.8, -10.4], [8.4, -6.8], [5.0, -8.2],
    [-1.0, -9.2], [-6.0, -8.4]]), J.coat[BASE]);
  poly(g, P([[-6.0, -9.6], [-1.4, -11.8], [4.0, -11.2], [6.4, -9.4], [1.4, -10.4], [-3.4, -10.0]]), J.coat[LT]);
  poly(g, P([[2.0, -12.5], [6.0, -11.0], [7.4, -8.6], [5.0, -9.6], [1.6, -11.2]]), J.coat[RIM]);
  /* bill, cast forward over the brow */
  poly(g, P([[5.6, -8.6], [12.6, -7.4], [13.4, -5.4], [6.2, -6.0]]), J.coat[S]);
  poly(g, P([[5.8, -8.4], [12.2, -7.3], [12.6, -6.6], [6.0, -7.4]]), J.coat[SH]);
  /* badge */
  poly(g, P([[-1.2, -10.6], [1.4, -10.9], [1.6, -9.2], [-1.0, -9.0]]), J.gold[BASE]);
  px(g, ...place([[-0.6, -10.2]], cx, cy, ang, SPEC.headScale)[0], 1, 1, J.gold[LT]);
}

function drawHead(g, sk, pose) {
  const cx = sk.head.x, cy = sk.head.y, ang = sk.headAng * 0.6;
  neck(g, sk, SPEC, J.skin);
  head(g, cx, cy, ang, J.skin, { scale: SPEC.headScale });
  /* fringe shadow across the upper face -- the cel-shading cue that sells
     a head with hair over it */
  poly(g, place([[-7.4, -6.0], [7.6, -5.0], [7.0, -1.6], [-6.8, -2.6]], cx, cy, ang, SPEC.headScale), J.skin[SH]);
  eyes(g, cx, cy, ang, SPEC.headScale, FACE, pose.eyes, pose.blink, pose.pupil);
  brows(g, cx, cy, ang, SPEC.headScale, FACE, pose.brow);
  mouth(g, cx, cy, ang, SPEC.headScale, FACE, pose.mouth, J.skin);
  hair(g, cx, cy, ang, pose.hairFlow);
  cap(g, cx, cy, ang);
  if (pose.action === 'hurt' || pose.action === 'dead') sweat(g, cx, cy, ang, SPEC.headScale, pose.t * 3 + 0.3);
}

/* ---- limbs ------------------------------------------------------------ */

function drawArm(g, j, pose, front) {
  const ramp = J.coat;
  drawLimb(g, j, front ? 14 : 12.5, front ? 11 : 10, 8.6, ramp, null, front ? '#04050B' : null);
  /* cuff */
  const dx = j.wrist.x - j.elbow.x, dy = j.wrist.y - j.elbow.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  poly(g, [
    [j.wrist.x - ux * 5 - uy * 4, j.wrist.y - uy * 5 + ux * 4],
    [j.wrist.x - ux * 5 + uy * 4, j.wrist.y - uy * 5 - ux * 4],
    [j.wrist.x - ux * 2 + uy * 4.2, j.wrist.y - uy * 2 - ux * 4.2],
    [j.wrist.x - ux * 2 - uy * 4.2, j.wrist.y - uy * 2 + ux * 4.2]
  ], J.gold[BASE]);
  hand(g, j.wrist.x + ux * 4, j.wrist.y + uy * 4, j.foreAng, 12, J.skin,
    front ? pose.handFront : pose.handRear);
}

function drawLeg(g, j, pose, front) {
  drawLimb(g, j, 16, 12, 9.5, J.pants, null, front ? '#04050B' : null);
  boot(g, j.ankle.x, j.ankle.y, j.shinAng, SPEC, J.boot, J.boot);
}

/* ---- assembly --------------------------------------------------------- */

export function drawJotaro(g, pose) {
  const sk = skeleton(SPEC, pose);
  coatBack(g, sk, pose);
  drawLeg(g, sk.legRear, pose);
  coatFront(g, sk, pose, -1);
  drawArm(g, sk.armRear, pose, false);
  torso(g, sk, pose);
  drawLeg(g, sk.legFront, pose, true);
  coatFront(g, sk, pose, 1);
  collar(g, sk, pose);
  drawHead(g, sk, pose);
  drawArm(g, sk.armFront, pose, true);
  return sk;
}
