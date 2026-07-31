/* Regular Morioh enemies: the delinquent (baseline) and Angelo (elite).
   Same jointed rig as the player (rig.js) -- hip/knee/ankle,
   shoulder/elbow/wrist, neck, hands, shoes -- parameterized by a "build"
   so one function paints both. Local space is "facing right"; the caller
   applies a single g.scale(facing, 1). */

import { px, disc, discSlice, groundShadow } from './draw.js';
import { limb, fist, shoe, walkFeet } from './rig.js';
import { drawFace } from './face.js';
import { EXT } from './palette.js';

function legTargets(build, pose) {
  if (pose.gaitPhase >= 0) {
    const w = walkFeet(pose.gaitPhase, build.step, build.lift);
    return { rear: w.leg2, front: w.leg1, drop: 0 };
  }
  const crouch = pose.action === 'active' || pose.action === 'windup' ? 1.2 : 0;
  return { rear: { x: -4, y: 0 }, front: { x: 4, y: 0 }, drop: crouch };
}

function legs(g, build, pose, flat) {
  const t = legTargets(build, pose);
  [[-2, t.rear], [2, t.front]].forEach(([hx, foot]) => {
    const hy = build.hipY + t.drop;
    const res = limb(g, hx, hy, hx + foot.x, foot.y, build.thigh, build.shin, 1,
      3.6, 2.8, flat || build.clothSh, flat ? null : build.cloth, null);
    shoe(g, res.x, res.y, foot.x >= 0 ? 1 : -1, 6, 3, flat || '#0B0B0D', flat || '#3A3A3A');
  });
}

function armTargets(build, pose) {
  const rear = { x: -4 - pose.armSwing * 4, y: build.hipY - 5 };
  let front;
  if (pose.strikeArm !== 0 || pose.action === 'active' || pose.action === 'windup') {
    front = { x: 4 + pose.strikeArm * build.reach, y: build.shoulderY + 3 - pose.strikeArm };
  } else {
    front = { x: 5 + pose.armSwing * -3, y: build.hipY - 5 };
  }
  return { rear, front };
}

function arm(g, build, shoulderX, target, flat, isFront) {
  const res = limb(g, shoulderX, build.shoulderY, target.x, target.y, build.upperArm, build.forearm,
    isFront ? -1 : 1, 3.6, 3, flat || build.cloth, null, null);
  fist(g, res.x, res.y, 3.8, flat || build.skin, flat || build.skinSh);
}

function torso(g, build, pose, flat) {
  const lean = pose.torsoLean;
  const h = build.hipY - build.shoulderY;
  for (let row = 0; row < h; row++) {
    const t = 1 - row / h;
    const w = build.torsoW0 + (build.torsoW1 - build.torsoW0) * t;
    const sx = lean * 2.6 * t;
    const y = build.shoulderY + row;
    const col = flat || (row < 3 ? build.clothHi : row > h - 4 ? build.clothSh : build.cloth);
    px(g, sx - w / 2, y, w, 1, col);
  }
  if (!flat && build.shirt) px(g, lean * 2.6 - 2, build.shoulderY + h - 6, 4, 5, build.shirt);
  return lean * 2.6;
}

function neckAndHead(g, build, pose, shoulderShift, flat) {
  const nx = shoulderShift * 1.2;
  px(g, nx - 1.3, build.shoulderY - 3, 2.6, 3, flat || build.skinSh);
  const cy = build.shoulderY - build.headR - 3 + pose.headBob;
  const cx = nx;
  const r = build.headR;
  disc(g, cx, cy, r, flat || build.skin);
  if (!flat) {
    discSlice(g, cx - 0.8, cy, r - 1, build.skinHi || build.skin, -r, 0);
    build.drawHair(g, cx, cy, r);
    drawFace(g, cx, cy + 1, pose.faceEyes, pose.faceMouth, build.ink);
  }
}

function drawBody(g, build, facing, pose, flat) {
  legs(g, build, pose, flat);
  const t = armTargets(build, pose);
  arm(g, build, -4, t.rear, flat, false);
  const shoulderShift = torso(g, build, pose, flat);
  neckAndHead(g, build, pose, shoulderShift, flat);
  arm(g, build, 4, t.front, flat, true);
}

function paint(g, x, groundY, facing, pose, build, tsec) {
  g.save();
  g.translate(Math.round(x), Math.round(groundY));
  g.scale(facing * pose.squashX, pose.squashY);
  groundShadow(g, 0, 1, 8, 2.2, '#000000');
  drawBody(g, build, facing, pose, null);
  if (pose.flashWhite > 0.05) {
    g.save();
    g.globalAlpha = Math.min(0.85, pose.flashWhite);
    drawBody(g, build, facing, pose, '#FFFFFF');
    g.restore();
  }
  g.restore();
}

const THUG = {
  hipY: -18, shoulderY: -31, thigh: 8, shin: 7, upperArm: 6, forearm: 7,
  headR: 5, reach: 11, step: 5, lift: 3,
  torsoW0: 10, torsoW1: 12.5,
  skin: EXT.thug.skin, skinHi: EXT.jotaro.skinHi, skinSh: EXT.thug.skinSh,
  cloth: EXT.thug.leather, clothHi: EXT.thug.leatherHi, clothSh: EXT.thug.leatherSh,
  shirt: EXT.thug.shirt, ink: '#160E08',
  drawHair(g, cx, cy, r) {
    discSlice(g, cx, cy, r + 0.5, EXT.thug.hair, -r - 0.5, -r * 0.5);
    for (let i = -1; i <= 1; i += 2) px(g, cx + i * (r - 1), cy - r - 1, 1, 3, EXT.thug.hair);
  }
};

const ANGELO = {
  hipY: -20, shoulderY: -34, thigh: 9, shin: 8, upperArm: 7, forearm: 8,
  headR: 5, reach: 12, step: 5, lift: 3,
  torsoW0: 8.5, torsoW1: 11,
  skin: EXT.angelo.skin, skinHi: EXT.angelo.skinSick, skinSh: EXT.angelo.skinSh,
  cloth: EXT.angelo.coat, clothHi: EXT.angelo.coatHi, clothSh: '#332C20',
  shirt: null, ink: '#241C10',
  drawHair(g, cx, cy, r) {
    discSlice(g, cx, cy, r + 1, EXT.angelo.hair, -r - 1, -r * 0.35);
  }
};

export function drawThug(g, x, groundY, facing, pose, tsec) { paint(g, x, groundY, facing, pose, THUG, tsec); }
export function drawAngelo(g, x, groundY, facing, pose, tsec) { paint(g, x, groundY, facing, pose, ANGELO, tsec); }
