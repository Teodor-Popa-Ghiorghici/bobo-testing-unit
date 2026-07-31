/* Killer Queen. Same jointed rig as the other fighters (rig.js), but
   deliberately faceless per canon -- smooth head, no eyes, a seam of a
   mouth that only shows teeth mid-attack -- and clawed hands instead of
   fists. Phase 2 adds a red glint along the seams as the fight turns
   serious. Local space is "facing right"; the caller applies a single
   g.scale(facing, 1). */

import { px, disc, discSlice, stepLine, groundShadow } from './draw.js';
import { limb, claw, shoe, walkFeet } from './rig.js';
import { EXT } from './palette.js';

const HIP_Y = -20, SHOULDER_Y = -35, THIGH = 9, SHIN = 8, UPPER_ARM = 7, FOREARM = 8;

function legTargets(pose) {
  if (pose.gaitPhase >= 0) {
    const w = walkFeet(pose.gaitPhase, 6, 4);
    return { rear: w.leg2, front: w.leg1, drop: 0 };
  }
  const crouch = pose.action === 'active' || pose.action === 'windup' ? 1.3 : 0;
  return { rear: { x: -4, y: 0 }, front: { x: 4, y: 0 }, drop: crouch };
}

function legs(g, pose, flat) {
  const t = legTargets(pose);
  const KQ = EXT.killerQueen;
  [[-2, t.rear], [2, t.front]].forEach(([hx, foot]) => {
    const hy = HIP_Y + t.drop;
    const res = limb(g, hx, hy, hx + foot.x, foot.y, THIGH, SHIN, 1,
      4, 3.2, flat || KQ.pink, flat ? null : KQ.pinkHi, flat ? null : KQ.black);
    shoe(g, res.x, res.y, foot.x >= 0 ? 1 : -1, 6, 3, flat || KQ.black, flat || KQ.gold);
  });
}

function armTargets(pose) {
  const rear = { x: -4 - pose.armSwing * 4, y: HIP_Y - 6 };
  let front;
  if (pose.strikeArm !== 0 || pose.action === 'active' || pose.action === 'windup') {
    front = { x: 4 + pose.strikeArm * 16, y: SHOULDER_Y + 4 - pose.strikeArm };
  } else {
    front = { x: 5 + pose.armSwing * -3, y: HIP_Y - 6 };
  }
  return { rear, front };
}

function arm(g, shoulderX, target, flat, isFront) {
  const KQ = EXT.killerQueen;
  const res = limb(g, shoulderX, SHOULDER_Y, target.x, target.y, UPPER_ARM, FOREARM,
    isFront ? -1 : 1, 4, 3.4, flat || KQ.pink, flat ? null : KQ.pinkHi, null);
  claw(g, res.x, res.y, target.x >= shoulderX ? 1 : -1, 5, flat || KQ.black);
}

function torso(g, pose, flat) {
  const lean = pose.torsoLean;
  const KQ = EXT.killerQueen;
  const h = HIP_Y - SHOULDER_Y, w0 = 12, w1 = 15;
  for (let row = 0; row < h; row++) {
    const t = 1 - row / h;
    const w = w0 + (w1 - w0) * t;
    const sx = lean * 2.8 * t;
    const y = SHOULDER_Y + row;
    const col = flat || (row < 4 ? KQ.pinkHi : row > h - 5 ? KQ.pinkDark : KQ.pink);
    px(g, sx - w / 2, y, w, 1, col);
  }
  if (!flat) {
    px(g, lean * 2.8 - 1, SHOULDER_Y + 3, 2, h - 6, KQ.black);
    px(g, lean * 2.8 - 5, SHOULDER_Y, 10, 2, KQ.gold);
  }
  return lean * 2.8;
}

function head(g, pose, phaseIndex, shoulderShift, flat) {
  const KQ = EXT.killerQueen;
  const cx = shoulderShift * 1.2, cy = SHOULDER_Y - 9 + pose.headBob;
  px(g, cx - 1.3, SHOULDER_Y - 4, 2.6, 4, flat || KQ.pinkDark);
  disc(g, cx, cy, 6, flat || KQ.pink);
  if (flat) return;
  discSlice(g, cx - 1, cy, 5, KQ.pinkHi, -6, 0);
  disc(g, cx - 7, cy + 1, 2.6, KQ.pinkDark);
  disc(g, cx + 6, cy + 2, 2.2, KQ.pinkDark);
  const seamColor = phaseIndex > 0 ? '#FF3355' : KQ.black;
  if (pose.faceMouth === 'open') {
    px(g, cx - 3, cy + 2, 6, 2, KQ.black);
    [-2, 0, 2].forEach(i => px(g, cx + i, cy + 1, 1, 1, '#FFFFFF'));
  } else {
    px(g, cx - 3, cy + 2, 6, 1, seamColor);
  }
  if (phaseIndex > 0) {
    stepLine(g, cx - 5, cy - 4, cx - 2, cy - 1, 1, '#FF3355');
    stepLine(g, cx + 5, cy - 4, cx + 2, cy - 1, 1, '#FF3355');
  }
}

function drawBody(g, pose, phaseIndex, flat) {
  legs(g, pose, flat);
  const t = armTargets(pose);
  arm(g, -4, t.rear, flat, false);
  const shoulderShift = torso(g, pose, flat);
  head(g, pose, phaseIndex, shoulderShift, flat);
  arm(g, 4, t.front, flat, true);
}

export function drawKillerQueen(g, x, groundY, facing, pose, phaseIndex) {
  g.save();
  g.translate(Math.round(x), Math.round(groundY));
  g.scale(facing * pose.squashX, pose.squashY);
  groundShadow(g, 0, 1, 9, 2.5, '#000000');
  drawBody(g, pose, phaseIndex, null);
  if (pose.flashWhite > 0.05) {
    g.save();
    g.globalAlpha = Math.min(0.85, pose.flashWhite);
    drawBody(g, pose, phaseIndex, '#FFFFFF');
    g.restore();
  }
  g.restore();
}
