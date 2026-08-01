/* Star Platinum — Jotaro's Stand. Deliberately the biggest, heaviest
   figure in the fight: ~124px, armour-plated, and drawn BEHIND its user
   so the two read as one attacking unit.

   Two things make it feel like a Stand rather than a second fighter:
   it materialises (alpha + a dithered dissolve band that sweeps up the
   body) instead of walking on, and during a barrage its arms are drawn
   several times at different extensions, which is how hand-drawn
   animation shows a punch rate the frame rate can't hold. */

import { skeleton, drawLimb, hand, torsoPoly, bodyPt, bodyPoly } from './body.js';
import { poly, place, disc, ellipse, line, px, limbShape, dither } from './draw.js';
import { STAR as SP, S, SH, BASE, LT, RIM } from './palette.js';

export const SPEC = {
  hipH: 50, spineL: 32, neckL: 12, neckW: 10,
  thigh: 26, shin: 24, upper: 23, fore: 21,
  shoulderW: 27, shoulderPad: 9, chestW: 34, waistW: 24, hipW: 18,
  shoulderDrop: 1, footLen: 16, footH: 6, headScale: 1.15,
  height: 116
};

/* the Stand mirrors its user, but bigger and further through every arc */
export function standPose(p) {
  const q = JSON.parse(JSON.stringify(p));
  q.chestRot = p.chestRot * 1.25;
  q.hipRot = p.hipRot * 1.2;
  q.headRot = p.headRot * 0.8;
  q.armFront = { sh: p.armFront.sh * 1.12, el: p.armFront.el * 0.85 };
  q.armRear = { sh: p.armRear.sh * 1.12, el: p.armRear.el * 0.85 };
  q.legFront = { hip: p.legFront.hip * 0.8, knee: p.legFront.knee * 0.8 };
  q.legRear = { hip: p.legRear.hip * 0.8, knee: p.legRear.knee * 0.8 };
  q.hipX = p.hipX * 1.3;
  return q;
}

function armour(g, sk, pose) {
  /* chest plate + abdominal segments */
  poly(g, bodyPoly(sk, [[-16, 0.92], [16, 0.9], [13, 0.52], [-13, 0.55]]), SP.body[LT]);
  poly(g, bodyPoly(sk, [[-13, 0.9], [-2, 0.89], [-2, 0.56], [-11.5, 0.57]]), SP.body[SH]);
  poly(g, bodyPoly(sk, [[3, 0.88], [13.5, 0.86], [11.5, 0.54], [3, 0.56]]), SP.body[RIM]);
  poly(g, bodyPoly(sk, [[-1.2, 0.94], [1.2, 0.94], [1.2, 0.16], [-1.2, 0.16]]), SP.body[S]);
  for (let i = 0; i < 3; i++) {
    const v = 0.46 - i * 0.13;
    poly(g, bodyPoly(sk, [[-9, v], [9, v - 0.01], [8, v - 0.09], [-8, v - 0.08]]), SP.body[LT]);
    poly(g, bodyPoly(sk, [[-8, v - 0.06], [8, v - 0.07], [8, v - 0.09], [-8, v - 0.08]]), SP.body[S]);
  }
  /* teal belt and hip guards */
  poly(g, bodyPoly(sk, [[-13, 0.16], [13, 0.14], [12, -0.03], [-12, -0.01]]), SP.teal[BASE]);
  poly(g, bodyPoly(sk, [[-13, 0.16], [13, 0.14], [12.8, 0.09], [-12.8, 0.11]]), SP.teal[LT]);
  poly(g, bodyPoly(sk, [[-3, 0.15], [3, 0.14], [2.6, 0.02], [-2.6, 0.03]]), SP.gold[BASE]);
  poly(g, bodyPoly(sk, [[-1.8, 0.13], [1.6, 0.12], [1.4, 0.05], [-1.6, 0.06]]), SP.gold[LT]);
  /* shoulder pauldrons */
  [-1, 1].forEach(side => {
    const c = bodyPt(sk, side * 17, 1.0);
    poly(g, [[c[0] - 9, c[1] - 5], [c[0] + 9, c[1] - 4], [c[0] + 8, c[1] + 7], [c[0] - 8, c[1] + 6]], SP.body[SH]);
    poly(g, [[c[0] - 8, c[1] - 4], [c[0] + 5, c[1] - 3.4], [c[0] + 4, c[1] + 1], [c[0] - 7, c[1] + 0.4]], SP.body[LT]);
    poly(g, [[c[0] - 4, c[1] + 3], [c[0] + 7, c[1] + 3.6], [c[0] + 6, c[1] + 6.4], [c[0] - 4, c[1] + 5.6]], SP.teal[BASE]);
  });
}

function standHead(g, sk, pose) {
  const cx = sk.head.x, cy = sk.head.y, ang = sk.headAng * 0.5, k = SPEC.headScale;
  const P = pts => place(pts, cx, cy, ang, k);
  poly(g, [[sk.sh.x - 5, sk.sh.y + 1], [sk.sh.x + 5, sk.sh.y + 1], [cx + 4, cy + 5], [cx - 4, cy + 5]], SP.body[SH]);
  /* skull: squarer and heavier-jawed than a human head */
  poly(g, P([[-8, -4], [-6, -9], [0, -11], [6, -9.5], [9, -5], [9, 1], [6, 7], [1, 9.5], [-4, 8], [-7.5, 2]]), SP.flesh[BASE]);
  poly(g, P([[-4, -9.4], [3, -10.4], [8, -6], [8.4, -1], [3, -4], [-3, -5.6]]), SP.flesh[LT]);
  poly(g, P([[-7.5, 1], [-3, 6], [2, 9], [-2, 8.6], [-6, 5]]), SP.flesh[SH]);
  /* headband + fin crest */
  poly(g, P([[-8.6, -4.6], [9.4, -6.2], [9.6, -2.6], [-8.4, -1.2]]), SP.body[BASE]);
  poly(g, P([[-8.6, -4.6], [9.4, -6.2], [9.4, -4.8], [-8.5, -3.3]]), SP.body[LT]);
  poly(g, P([[1, -6], [4.4, -6.6], [4.6, -3.4], [1.2, -2.8]]), SP.gold[BASE]);
  poly(g, P([[1.6, -5.6], [3.2, -5.9], [3.3, -4.2], [1.7, -3.9]]), SP.gold[LT]);
  poly(g, P([[-2, -10.5], [2, -12.5], [3.5, -9.5], [0, -9.8]]), SP.body[BASE]);
  /* trailing crest, swung by the hair spring */
  const f = pose.hairFlow;
  poly(g, P([[-6, -9], [-1, -10], [-7 - f * 5, -1 + f * 3], [-13 - f * 9, 5 + f * 6], [-9, -3]]), SP.body[BASE]);
  poly(g, P([[-6, -9], [-3, -9.6], [-7 - f * 5, -2 + f * 3], [-10 - f * 7, 1 + f * 4]]), SP.body[LT]);
  /* glowing eyes */
  [[-3.4, -0.4], [4.2, -1.2]].forEach(([ex, ey], i) => {
    poly(g, P([[ex - 2.4, ey - 1.4], [ex + 2.4, ey - 2.0], [ex + 2.6, ey + 0.8], [ex - 2.2, ey + 1.2]]), '#3A2A10');
    poly(g, P([[ex - 1.8, ey - 0.9], [ex + 2.0, ey - 1.5], [ex + 2.0, ey + 0.4], [ex - 1.6, ey + 0.8]]), SP.gold[LT]);
    poly(g, P([[ex - 1.0, ey - 0.7], [ex + 0.6, ey - 1.0], [ex + 0.6, ey + 0.2], [ex - 0.9, ey + 0.4]]), '#FFFFFF');
  });
  /* set mouth line */
  poly(g, P([[1.4, 4], [5.6, 3.4], [5.6, 4.4], [1.4, 5]]), SP.body[S]);
}

function standArm(g, j, pose, front, alpha) {
  if (alpha != null) g.globalAlpha = alpha;
  drawLimb(g, j, front ? 17 : 15, front ? 13 : 11.5, 10, SP.body, null, front ? '#0A0616' : null);
  /* forearm guard */
  const dx = j.wrist.x - j.elbow.x, dy = j.wrist.y - j.elbow.y;
  const len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
  limbShape(g, j.elbow.x + ux * 3, j.elbow.y + uy * 3, j.wrist.x - ux * 2, j.wrist.y - uy * 2, 13, 11, SP.teal);
  poly(g, [
    [j.wrist.x - ux * 4 - uy * 6, j.wrist.y - uy * 4 + ux * 6],
    [j.wrist.x - ux * 4 + uy * 6, j.wrist.y - uy * 4 - ux * 6],
    [j.wrist.x - ux * 1 + uy * 6.5, j.wrist.y - uy * 1 - ux * 6.5],
    [j.wrist.x - ux * 1 - uy * 6.5, j.wrist.y - uy * 1 + ux * 6.5]
  ], SP.gold[BASE]);
  hand(g, j.wrist.x + ux * 4.5, j.wrist.y + uy * 4.5, j.foreAng, 15, SP.flesh,
    front ? pose.handFront : pose.handRear);
  if (alpha != null) g.globalAlpha = 1;
}

function standLeg(g, j, front) {
  drawLimb(g, j, 19, 14, 11, SP.body, null, front ? '#0A0616' : null);
  limbShape(g, j.knee.x, j.knee.y, j.ankle.x, j.ankle.y, 15, 12, SP.teal);
  const a = Math.max(-0.4, Math.min(0.4, j.shinAng * 0.3));
  poly(g, place([[-5, -7], [10, -8], [13, -2], [13, 1], [-6, 1]], j.ankle.x, j.ankle.y, a), SP.body[BASE]);
  poly(g, place([[-5, -7], [8, -7.8], [9, -4], [-5.5, -3.4]], j.ankle.x, j.ankle.y, a), SP.body[LT]);
  poly(g, place([[-6, -1.6], [13, -1.8], [13, 1], [-6, 1]], j.ankle.x, j.ankle.y, a), SP.gold[SH]);
}

/* Barrage: a wall of fists at staggered extensions, each with a streak
   trailing back toward the Stand. Drawing whole articulated arms at this
   punch rate turns into spaghetti -- fists plus motion streaks is how
   hand-drawn animation reads a flurry, and it stays legible at 480x270.

   Drawn in its own local space (origin at the Stand's shoulder, +x toward
   the target) so the caller can stamp it IN FRONT of the user while the
   Stand's body stays behind him. */
const LANES = [-15, 3, -6, 13];

export function barrageFists(g, beat, span) {
  for (let i = 3; i >= 0; i--) {
    const ph = ((beat - i * 0.26) % 1 + 1) % 1;
    const ext = 0.20 + ph * 0.80;
    const fx = span * ext;
    const fy = LANES[i] + Math.sin(beat * 1.7 + i * 2) * 2;
    const lead = i === 0;
    /* a thin tapered streak, not a slab: 2px at the shoulder widening to
       the wrist, so four of them read as four punches, not one tube */
    g.globalAlpha = lead ? 0.9 : 0.5 - i * 0.1;
    poly(g, [[0, fy * 0.25 - 2], [fx - 8, fy - 5], [fx - 8, fy + 5], [0, fy * 0.25 + 2]], SP.body[SH]);
    poly(g, [[0, fy * 0.25 - 1], [fx - 10, fy - 4], [fx - 10, fy - 1.5], [0, fy * 0.25]], SP.glow);
    g.globalAlpha = lead ? 1 : 0.86 - i * 0.16;
    limbShape(g, fx - 15, fy, fx - 7, fy, 12, 13, SP.body);
    poly(g, [[fx - 9, fy - 8], [fx - 3, fy - 8], [fx - 3, fy + 8], [fx - 9, fy + 8]], SP.gold[BASE]);
    poly(g, [[fx - 9, fy - 8], [fx - 3, fy - 8], [fx - 3, fy - 5], [fx - 9, fy - 5]], SP.gold[LT]);
    hand(g, fx + 2, fy, Math.PI / 2, 17, SP.flesh, 'fist');
    g.globalAlpha = 1;
  }
  /* white speed lines threading between the fists */
  g.globalAlpha = 0.5;
  for (let i = 0; i < 5; i++) {
    const y = -18 + i * 9 + Math.sin(beat * 3 + i) * 2;
    const x0 = span * (0.15 + ((beat * 0.7 + i * 0.2) % 1) * 0.5);
    poly(g, [[x0, y], [x0 + 20, y - 0.6], [x0 + 20, y + 0.8], [x0, y + 1.4]], '#FFFFFF');
  }
  g.globalAlpha = 1;
}

export function drawStar(g, pose, manifest) {
  const sk = skeleton(SPEC, pose);
  standLeg(g, sk.legRear);
  standArm(g, sk.armRear, pose, false);
  poly(g, torsoPoly(sk, SPEC, 0), SP.body[BASE]);
  poly(g, bodyPoly(sk, [[-19, 1.0], [-6, 1.0], [-5, 0.0], [-13, 0.0]]), SP.body[SH]);
  armour(g, sk, pose);
  standLeg(g, sk.legFront, true);
  standHead(g, sk, pose);
  if (!(pose.standPunch > 1)) standArm(g, sk.armFront, pose, true);
  /* Materialisation: the Stand forms from the head down, with a dithered
     edge on the boundary. Both passes erase (destination-out) so nothing
     is ever painted outside the body silhouette. */
  if (manifest < 0.98) {
    const top = -SPEC.height - 14, h = SPEC.height + 40;
    const edge = top + h * manifest;
    g.save();
    g.globalCompositeOperation = 'destination-out';
    px(g, -90, edge + 9, 180, h, '#000000');
    dither(g, -90, edge - 3, 180, 12, null, '#000000', 9);
    g.restore();
  }
  return sk;
}
