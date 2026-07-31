/* Shared jointed-limb rig. Every character is a stack of rectangles at
   heart, but this solves real elbow/knee positions with 2-bone IK so
   limbs actually bend instead of reading as a single rigid bar, and
   provides hands/feet with enough shape to read as anatomy. Everything
   is built in "facing right" local space -- callers do a single
   `g.scale(facing, 1)` around the whole body instead of hand-flipping
   every coordinate. */

import { px, disc } from './draw.js';

/* Classic 2-bone IK: given a start joint, a target end point, and two
   segment lengths, returns where the middle joint (elbow/knee) lands.
   `bend` is +1 or -1 and picks which side of the start->target line the
   joint bulges toward. */
export function solveIK(x0, y0, x1, y1, L1, L2, bend) {
  let dx = x1 - x0, dy = y1 - y0;
  let d = Math.hypot(dx, dy) || 0.0001;
  const maxD = L1 + L2 - 0.4, minD = Math.abs(L1 - L2) + 0.4;
  if (d > maxD) { const k = maxD / d; dx *= k; dy *= k; d = maxD; }
  if (d < minD) { const k = minD / d; dx *= k; dy *= k; d = minD; }
  const a = Math.atan2(dy, dx);
  const cosA1 = Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)));
  const offset = Math.acos(cosA1) * bend;
  const ang = a - offset;
  return { jx: x0 + Math.cos(ang) * L1, jy: y0 + Math.sin(ang) * L1, ex: x0 + dx, ey: y0 + dy };
}

/* a thick rotated bar from (x0,y0) to (x1,y1), with a lighter stripe down
   one edge so it reads as a cylindrical limb rather than a flat plank */
export function segment(g, x0, y0, x1, y1, w, base, hi) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 0.01;
  const ang = Math.atan2(dy, dx);
  g.save();
  g.translate(x0, y0);
  g.rotate(ang);
  g.fillStyle = base;
  g.fillRect(-0.5, -w / 2, len + 1, w);
  if (hi) {
    g.fillStyle = hi;
    g.fillRect(-0.5, -w / 2, len + 1, Math.max(1, Math.round(w * 0.32)));
  }
  g.restore();
}

/* draws upper+lower limb segments meeting at an IK-solved joint, and
   returns the end point so the caller can put a hand/foot there */
export function limb(g, x0, y0, x1, y1, L1, L2, bend, w1, w2, base, hi, jointColor) {
  const s = solveIK(x0, y0, x1, y1, L1, L2, bend);
  segment(g, x0, y0, s.jx, s.jy, w1, base, hi);
  segment(g, s.jx, s.jy, s.ex, s.ey, w2, base, hi);
  if (jointColor) disc(g, s.jx, s.jy, Math.max(1, Math.round(w2 / 2) - 1), jointColor);
  return { x: s.ex, y: s.ey, jx: s.jx, jy: s.jy };
}

/* a small fist: a rounded knuckle block with finger-line notches on the
   leading edge, plus a thumb nub -- reads as a hand at any angle since it
   doesn't rotate with the arm */
export function fist(g, x, y, size, skin, skinSh) {
  const r = size / 2;
  px(g, x - r, y - r, size, size, skin);
  px(g, x - r, y - r, size, 1, skinSh);
  px(g, x - r + 1, y - r + 1, 1, size - 2, skinSh);
  px(g, x - r + size * 0.5, y - r + 1, 1, size - 2, skinSh);
  px(g, x - r - 1, y, 2, Math.max(1, Math.round(size * 0.4)), skin);
}

/* clawed hand, for Killer Queen: three pointed fingers instead of a fist */
export function claw(g, x, y, dir, size, color) {
  px(g, x - size / 2, y - size / 2, size, size * 0.7, color);
  for (let i = 0; i < 3; i++) {
    px(g, x - size / 2 + i * (size / 3), y + size * 0.2, 2, 3, color);
  }
}

/* a real gait: while one leg swings through the air (lifted, arcing
   forward) the other drags along the ground bearing weight, then they
   swap -- rather than both feet just sliding back and forth in place. */
export function walkFeet(phase, stepLen, liftH) {
  function foot(c) {
    if (c < 0.5) {
      const s = c / 0.5;
      return { x: -stepLen + stepLen * 2 * s, y: -Math.sin(s * Math.PI) * liftH };
    }
    const s = (c - 0.5) / 0.5;
    return { x: stepLen - stepLen * 2 * s, y: 0 };
  }
  const p = ((phase % 1) + 1) % 1;
  return { leg1: foot(p), leg2: foot((p + 0.5) % 1) };
}

/* a shoe planted at (x,y): an ankle block plus a longer sole so it reads
   as a foot pointing along `dir` (1 = toe forward/right) rather than a
   plain square stub */
export function shoe(g, x, y, dir, len, h, color, sole) {
  const toeX = dir >= 0 ? x - 2 : x - len + 2;
  px(g, x - 2, y - h - 2, 4, 3, color);       // ankle
  px(g, toeX, y - h, len, h, color);          // foot body
  px(g, toeX, y - 1, len, 1, sole);           // sole
}
