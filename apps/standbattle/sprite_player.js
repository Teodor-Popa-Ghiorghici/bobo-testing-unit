/* Jotaro Kujo, with Star Platinum looming in during attacks. A real
   jointed rig (rig.js) -- hips->knees->ankles, shoulders->elbows->wrists,
   a distinct neck, hands and shoes -- not a stack of solid blocks.
   Everything is built in "facing right" local space; the caller flips it
   with a single g.scale(facing, 1). */

import { px, disc, discSlice, groundShadow } from './draw.js';
import { limb, fist, shoe, walkFeet } from './rig.js';
import { drawFace } from './face.js';
import { EXT } from './palette.js';

const HIP_Y = -21, SHOULDER_Y = -36;
const THIGH = 9, SHIN = 8, UPPER_ARM = 7, FOREARM = 8;

function legTargets(pose) {
  if (pose.gaitPhase >= 0) {
    const w = walkFeet(pose.gaitPhase, 6, 4);
    return { rear: w.leg2, front: w.leg1, drop: 0 };
  }
  const crouch = pose.action === 'strike' || pose.action === 'rush' || pose.action === 'special' ? 1.4 : 0;
  return { rear: { x: -5, y: 0 }, front: { x: 5, y: 0 }, drop: crouch };
}

function legs(g, pose, flat) {
  const t = legTargets(pose);
  const J = EXT.jotaro;
  [[-2, t.rear], [2, t.front]].forEach(([hx, foot]) => {
    const hy = HIP_Y + t.drop;
    const res = limb(g, hx, hy, hx + foot.x, foot.y, THIGH, SHIN, 1,
      4, 3, flat || J.gakuranSh, flat ? null : J.gakuranHi, flat ? null : '#1E1B22');
    shoe(g, res.x, res.y, foot.x >= 0 ? 1 : -1, 8, 4, flat || '#0B0B0D', flat || J.hairHi);
  });
}

function armTargets(pose, facing) {
  const rear = { x: -4 - pose.armSwing * 5, y: -27 };
  let front;
  if (pose.strikeArm !== 0 || pose.action === 'strike' || pose.action === 'rush' || pose.action === 'special') {
    front = { x: 5 + pose.strikeArm * 17, y: -34 - pose.strikeArm };
  } else {
    front = { x: 6 + pose.armSwing * -4, y: -27 };
  }
  return { rear, front };
}

function arm(g, shoulderX, target, flat, isFront, pose) {
  const J = EXT.jotaro;
  const res = limb(g, shoulderX, SHOULDER_Y, target.x, target.y, UPPER_ARM, FOREARM, isFront ? -1 : 1,
    4, 3.4, flat || J.gakuran, flat ? null : J.gakuranHi, null);
  fist(g, res.x, res.y, 4.4, flat || (isFront && pose.strikeArm > 0.5 ? J.skinHi : J.skin), flat || J.skinSh);
}

function coatTail(g, pose, flat) {
  const sway = pose.torsoLean * -2;
  const base = flat || EXT.jotaro.gakuranSh;
  px(g, -8 + sway, HIP_Y - 2, 4, 9, base);
  px(g, -6 + sway * 0.6, HIP_Y + 1, 3, 7, base);
}

function torso(g, facing, pose, flat) {
  const lean = pose.torsoLean;
  const w0 = 11, w1 = 13, h = HIP_Y - SHOULDER_Y;
  for (let row = 0; row < h; row++) {
    const t = 1 - row / h; // 0 at shoulders, 1 at hips
    const w = w0 + (w1 - w0) * t;
    const sx = lean * 3 * t;
    const y = SHOULDER_Y + row;
    const col = flat || (row < 3 ? EXT.jotaro.gakuranHi : row > h - 4 ? EXT.jotaro.gakuranSh : EXT.jotaro.gakuran);
    px(g, sx - w / 2, y, w, 1, col);
  }
  if (!flat) {
    [4, 8, 12].forEach(dy => px(g, lean * 3 * (1 - dy / h) - 1, SHOULDER_Y + dy, 2, 2, EXT.jotaro.button));
  }
  return lean * 3;
}

function neckAndHead(g, pose, shoulderShift, flat) {
  const J = EXT.jotaro;
  const nx = shoulderShift * 1.3;
  px(g, nx - 1.5, SHOULDER_Y - 4, 3, 4, flat || J.skinSh);
  const cy = SHOULDER_Y - 9 + pose.headBob + shoulderShift * 0.4;
  const cx = nx;
  const r = 5.5;
  disc(g, cx, cy, r, flat || J.skin);
  if (!flat) {
    discSlice(g, cx - 1, cy, r - 1, J.skinHi, -r, 0);
  }
  // the cap: a dome over the top ~60% of the head, with a bill
  discSlice(g, cx, cy, r + 1, flat || J.cap, -r - 1, -r * 0.25);
  if (!flat) {
    px(g, cx + r - 1.5, cy - r * 0.85, 4, 2, J.capBrim);
    drawFace(g, cx, cy + 1.5, pose.faceEyes, pose.faceMouth, '#1A1410');
  }
}

function drawBody(g, facing, pose, flat) {
  legs(g, pose, flat);
  const t = armTargets(pose, facing);
  arm(g, -4, t.rear, flat, false, pose);
  coatTail(g, pose, flat);
  const shoulderShift = torso(g, facing, pose, flat);
  neckAndHead(g, pose, shoulderShift, flat);
  arm(g, 4, t.front, flat, true, pose);
}

function drawStandGhost(g, facing, pose, tsec) {
  const SP = EXT.starPlatinum;
  g.save();
  g.globalAlpha = 0.32 + pose.glowStand * 0.35 + Math.sin(tsec * 11) * 0.05;
  g.translate(2, -14);
  const top = -46, w0 = 16, w1 = 20, h = 24;
  for (let row = 0; row < h; row++) {
    const t = row / h;
    const w = w0 + (w1 - w0) * t;
    const col = t < 0.2 ? SP.hi : t > 0.8 ? SP.dark : SP.base;
    px(g, -w / 2, top + row, w, 1, col);
  }
  disc(g, 0, top - 8, 8, SP.base);
  disc(g, -1, top - 9, 6, SP.hi);
  disc(g, -7, top - 8, 2.6, SP.hi);
  disc(g, 7, top - 8, 2.6, SP.hi);
  px2(g, -2, top - 9, SP.eye);
  px2(g, 2, top - 9, SP.eye);
  const res = limb(g, 5, top + 8, 5 + 4 + pose.strikeArm * 24, top + 6 - pose.torsoLean * 3, 9, 10, -1, 6, 5, SP.base, SP.hi, null);
  fist(g, res.x, res.y, 7, SP.skin, SP.skinSh);
  g.restore();
}

function px2(g, x, y, c) { g.fillStyle = c; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2); }

export function drawPlayer(g, x, groundY, facing, pose, tsec) {
  g.save();
  g.translate(Math.round(x), Math.round(groundY));
  g.scale(facing * pose.squashX, pose.squashY);

  groundShadow(g, 0, 1, 9, 2.5, '#000000');

  if (pose.ghost) {
    for (let i = 1; i <= 2; i++) {
      g.save();
      g.globalAlpha = 0.14 / i;
      g.translate(-i * 5, 0);
      drawBody(g, facing, pose, EXT.fx.dodgeGhost);
      g.restore();
    }
  }

  if (pose.glowStand > 0) drawStandGhost(g, facing, pose, tsec);

  drawBody(g, facing, pose, null);

  if (pose.flashWhite > 0.05) {
    g.save();
    g.globalAlpha = Math.min(0.85, pose.flashWhite);
    drawBody(g, facing, pose, '#FFFFFF');
    g.restore();
  }

  g.restore();
}
