/* Shared humanoid construction: forward kinematics from a pose's joint
   angles, plus the parts every character has in common (limbs, hands,
   feet, a generic tapered torso). Character files build on top of this
   with their own silhouette work -- hair, coat, face, gear.

   Local space: origin at the feet, +x forward (characters are always
   authored facing right and mirrored at stamp time), -y up. */

import { poly, place, limbShape, disc, ellipse, line, BASE, SH, LT, RIM, S } from './draw.js';

export function skeleton(spec, pose) {
  const hip = { x: pose.hipX, y: -spec.hipH + pose.hipY };
  const cr = pose.chestRot;
  const sh = {
    x: hip.x + Math.sin(cr) * spec.spineL,
    y: hip.y - Math.cos(cr) * spec.spineL + pose.chestY
  };
  const hr = cr + pose.headRot;
  const head = {
    x: sh.x + Math.sin(hr) * spec.neckL + pose.headX,
    y: sh.y - Math.cos(hr) * spec.neckL + pose.headY
  };

  function leg(a, dxHip) {
    const ha = pose.hipRot + a.hip;
    const hx = hip.x + dxHip * Math.cos(pose.hipRot), hy = hip.y + dxHip * Math.sin(pose.hipRot) * 0.4;
    const kx = hx + Math.sin(ha) * spec.thigh, ky = hy + Math.cos(ha) * spec.thigh;
    const sa = ha + a.knee;
    return {
      hip: { x: hx, y: hy }, knee: { x: kx, y: ky },
      ankle: { x: kx + Math.sin(sa) * spec.shin, y: ky + Math.cos(sa) * spec.shin },
      shinAng: sa
    };
  }
  function arm(a, dxSh) {
    const sa = cr + a.sh;
    const sx = sh.x + dxSh * Math.cos(cr), sy = sh.y + dxSh * Math.sin(cr) + spec.shoulderDrop;
    const ex = sx + Math.sin(sa) * spec.upper, ey = sy + Math.cos(sa) * spec.upper;
    const fa = sa + a.el;
    return {
      sh: { x: sx, y: sy }, elbow: { x: ex, y: ey },
      wrist: { x: ex + Math.sin(fa) * spec.fore, y: ey + Math.cos(fa) * spec.fore },
      foreAng: fa
    };
  }
  return {
    hip, sh, head, chestRot: cr, headAng: hr,
    legRear: leg(pose.legRear, -spec.hipW * 0.5),
    legFront: leg(pose.legFront, spec.hipW * 0.5),
    armRear: arm(pose.armRear, -spec.shoulderW * 0.5),
    armFront: arm(pose.armFront, spec.shoulderW * 0.5)
  };
}

/* Two-segment limb with a rounded joint, drawn back-to-front.

   `occlude` paints a slightly fatter copy underneath in a dark colour
   first. On a limb that crosses the character's own torso that halo
   becomes a contact shadow, which is the difference between an arm that
   sits IN FRONT of the chest and one that looks welded to it. */
export function drawLimb(g, j, w0, w1, w2, ramp, jointRamp, occlude) {
  const a = j.sh || j.hip;
  const mid = j.elbow || j.knee;
  const end = j.wrist || j.ankle;
  if (occlude) {
    limbShape(g, a.x, a.y, mid.x, mid.y, w0 + 3, w1 + 3, ramp, { flat: occlude });
    limbShape(g, mid.x, mid.y, end.x, end.y, w1 + 3, w2 + 3, ramp, { flat: occlude });
  }
  limbShape(g, a.x, a.y, mid.x, mid.y, w0, w1, ramp);
  limbShape(g, mid.x, mid.y, end.x, end.y, w1, w2, ramp);
  if (jointRamp) disc(g, mid.x, mid.y, w1 * 0.5, jointRamp[SH]);
}

/* ---- hands ----------------------------------------------------------- */

const FIST = [[-3.4, -3.6], [3.0, -3.9], [4.2, -1.2], [4.2, 2.6], [2.2, 4.4], [-2.6, 4.2], [-4.0, 1.4]];
const PALM = [[-3.2, -3.4], [2.6, -4.0], [4.4, -1.0], [4.0, 3.2], [-1.6, 4.4], [-3.8, 1.8]];

export function hand(g, x, y, ang, size, ramp, type) {
  const k = size / 8;
  const a = ang - Math.PI / 2;
  if (type === 'claw') {
    poly(g, place([[-3, -3], [3.5, -2.5], [4.5, 1], [-2.5, 3]], x, y, a, k), ramp[BASE]);
    poly(g, place([[-3, -3], [3.5, -2.5], [3.5, -0.6], [-3, -0.8]], x, y, a, k), ramp[LT]);
    for (let i = -1; i <= 1; i++) {
      poly(g, place([[3.6, i * 2.2 - 0.7], [8.6, i * 3.0 - 0.4], [3.6, i * 2.2 + 0.9]], x, y, a, k), ramp[BASE]);
      poly(g, place([[3.6, i * 2.2 - 0.7], [8.6, i * 3.0 - 0.4], [6.0, i * 2.6 - 0.2]], x, y, a, k), ramp[LT]);
    }
    return;
  }
  const shape = type === 'open' || type === 'guard' ? PALM : FIST;
  poly(g, place(shape, x, y, a, k), ramp[BASE]);
  /* light band across the knuckles, shadow under the little finger */
  poly(g, place([[-3.0, -3.4], [2.8, -3.7], [3.6, -1.4], [-3.4, -1.0]], x, y, a, k), ramp[LT]);
  poly(g, place([[-3.2, 2.2], [3.4, 2.0], [2.0, 4.3], [-2.4, 4.0]], x, y, a, k), ramp[SH]);
  if (type === 'fist' || type === 'grip') {
    for (let i = -1; i <= 1; i++) {
      poly(g, place([[3.4, i * 2.4 - 0.5], [4.6, i * 2.4 - 0.3], [4.6, i * 2.4 + 0.6], [3.4, i * 2.4 + 0.7]], x, y, a, k), ramp[S]);
    }
    poly(g, place([[-4.2, -0.4], [-1.6, -1.8], [-0.6, 0.6], [-3.4, 1.8]], x, y, a, k), ramp[BASE]);
  } else if (type === 'open') {
    /* a fan of fingers, splayed and tapering, rather than parallel bars */
    for (let i = 0; i < 4; i++) {
      const sp = (i - 1.5) * 0.30;
      const L = 6.4 - Math.abs(i - 1.2) * 0.9;
      const bx = 3.2, by = (i - 1.5) * 1.9;
      const tx = bx + Math.cos(sp) * L, ty = by + Math.sin(sp) * L;
      poly(g, place([[bx, by - 1.1], [tx, ty - 0.85], [tx + 0.7, ty], [tx, ty + 0.85], [bx, by + 1.1]], x, y, a, k), ramp[BASE]);
      poly(g, place([[bx, by - 1.0], [tx, ty - 0.8], [tx, ty - 0.15], [bx, by - 0.3]], x, y, a, k), ramp[LT]);
    }
    poly(g, place([[-3.4, 1.0], [1.0, 2.0], [-0.4, 4.2], [-3.6, 3.4]], x, y, a, k), ramp[BASE]);
  } else if (type === 'guard') {
    poly(g, place([[-3.4, -4.2], [2.4, -5.6], [3.4, -3.0], [-3.0, -2.0]], x, y, a, k), ramp[LT]);
  }
}

/* ---- feet ------------------------------------------------------------ */

/* A boot built from three shapes: the shaft wrapping the ankle, the foot
   body, and a darker sole slab so the character reads as standing ON the
   ground rather than floating at it. */
export function boot(g, x, y, ang, spec, ramp, soleRamp) {
  const len = spec.footLen, h = spec.footH;
  const a = Math.max(-0.5, Math.min(0.5, ang * 0.35));
  const shaft = [[-2.6, -h - 4.5], [2.8, -h - 5.0], [3.2, -h + 0.5], [-3.0, -h + 0.5]];
  poly(g, place(shaft, x, y, a), ramp[BASE]);
  poly(g, place([[-2.6, -h - 4.5], [0.2, -h - 4.8], [0.6, -h + 0.5], [-3.0, -h + 0.5]], x, y, a), ramp[LT]);
  const foot = [[-3.2, -h], [len * 0.55, -h - 0.4], [len, -h * 0.35], [len, 0], [-3.4, 0]];
  poly(g, place(foot, x, y, a), ramp[BASE]);
  poly(g, place([[-3.2, -h], [len * 0.5, -h - 0.3], [len * 0.7, -h * 0.55], [-3.3, -h * 0.45]], x, y, a), ramp[LT]);
  poly(g, place([[-3.4, -1.6], [len, -1.4], [len, 0], [-3.4, 0]], x, y, a), (soleRamp || ramp)[S]);
  poly(g, place([[len * 0.62, -h * 0.9], [len * 0.66, -h * 0.9], [len * 0.7, -1.6], [len * 0.6, -1.6]], x, y, a), ramp[S]);
}

/* ---- torso ----------------------------------------------------------- */

/* generic tapered torso polygon between hip and shoulder, in world-ish
   local space, so character files can fill/shade it however they like */
export function torsoPoly(sk, spec, inset) {
  const i = inset || 0;
  const cr = sk.chestRot;
  const nx = Math.cos(cr), ny = Math.sin(cr);
  const sw = spec.shoulderW * 0.5 + spec.shoulderPad - i;
  const cw = spec.chestW * 0.5 - i;
  const hw = spec.waistW * 0.5 - i;
  const midX = (sk.hip.x + sk.sh.x) * 0.5, midY = (sk.hip.y + sk.sh.y) * 0.5;
  return [
    [sk.sh.x - nx * sw, sk.sh.y - ny * sw],
    [sk.sh.x + nx * sw, sk.sh.y + ny * sw],
    [midX + nx * cw, midY + ny * cw],
    [sk.hip.x + nx * hw, sk.hip.y + ny * hw],
    [sk.hip.x - nx * hw, sk.hip.y - ny * hw],
    [midX - nx * cw, midY - ny * cw]
  ];
}

/* Torso-local coordinates: u runs across the body (+ = forward/chest
   side), v runs up the spine (0 = hip, 1 = shoulders). Authoring collars,
   chains, belts and coat folds in (u,v) means they stay glued to the
   torso through every lean and twist without per-detail trigonometry. */
export function bodyPt(sk, u, v) {
  const cr = sk.chestRot;
  const bx = sk.hip.x + (sk.sh.x - sk.hip.x) * v;
  const by = sk.hip.y + (sk.sh.y - sk.hip.y) * v;
  return [bx + Math.cos(cr) * u, by + Math.sin(cr) * u];
}

export function bodyPoly(sk, pairs) {
  const out = new Array(pairs.length);
  for (let i = 0; i < pairs.length; i++) out[i] = bodyPt(sk, pairs[i][0], pairs[i][1]);
  return out;
}

/* the strip of a polygon nearest the light, used as a cheap inner
   highlight on chests, thighs and props */
export function litEdge(pts, amount) {
  const out = [];
  for (const p of pts) out.push([p[0] - amount, p[1] - amount * 0.8]);
  return out;
}

export { poly, place, disc, ellipse, line };
