/* The fight scene on the canvas: camera, stage, fighters, effects (spec 3, 14). Every fighter goes the same way -- pose, offscreen buffer, stamp with outline, cast
   shadow, squash and flash -- so they all sit in the stage with the same light. Lanes are a y offset (render_adapter.js) and a draw order; height in the air is a lift of the
   whole stamp. Shake moves the world only; the HUD (hud_fight.js) is drawn by the caller outside it. */

import { buffer, stamp } from './layer.js';
import { contactShadow } from './draw.js';
import { fighterPose } from './pose_fighter.js';
import { SPRITES, hasStar, drawStar, standPose, barrageFists } from './sprites.js';
import { drawBackground, drawForeground } from './background.js';
import { createFx, wireFx } from './fx.js';
import { createJuice } from './juice.js';
import { FX } from './palette.js';
import { WORLD_W, GROUND_Y } from './constants.js';
import { zToYOffset, depthSort } from './render_adapter.js';
import { layPoses } from './pose_random.js';

const SCENE_LIGHT = {
  alley: { color: '#FFD79B', alpha: 0.34 }, street: { color: '#FFC98A', alpha: 0.42 },
  park: { color: '#9FC0FF', alpha: 0.34 }, store: { color: '#CFE0FF', alpha: 0.38 }
};

export function ensureView(fight, shake) {
  if (!fight.view) {
    const fx = createFx(), juice = createJuice(shake);
    fight.view = { fx, juice, camX: null, poses: [null, null] };
    wireFx(fight, fx, juice, zToYOffset, GROUND_Y);
  }
  return fight.view;
}

function camera(fight, view, W) {
  const [A, B] = fight.fighters;
  const mid = (A.x + B.x) / 2, target = Math.max(0, Math.min(WORLD_W - W, mid - W / 2));
  view.camX = view.camX == null ? target : view.camX + (target - view.camX) * 0.22;
  return Math.round(view.camX);
}

function stampFighter(g, key, paint, opts) {
  const b = buffer(key, 240, 200);
  b.g.save(); b.g.translate(120, 184); paint(b.g); b.g.restore();
  stamp(g, b, Object.assign({ ox: 120, oy: 184, outline: FX.ink, thickOutline: true }, opts));
}

function drawStand(g, f, pose, camX, tsec) {
  if (!hasStar(f) || !(pose.standOut > 0.02)) return;
  const b = buffer('star', 300, 240);
  b.g.save(); b.g.translate(150, 214); drawStar(b.g, standPose(pose), pose.standOut); b.g.restore();
  const rushing = pose.standPunch > 0.3;
  stamp(g, b, {
    x: f.x - camX - f.facing * (rushing ? 30 : 22), y: GROUND_Y + zToYOffset(f.z) - f.y - (rushing ? 22 : 10) + Math.sin(tsec * 3.4) * 2, ox: 150, oy: 214, flip: f.facing,
    outline: '#160A28', thickOutline: true, rim: { color: '#D5A8FF', alpha: 0.5, dx: -1, dy: -2 }, alpha: 0.55 + pose.standOut * 0.45,
    tint: { color: '#B98BFF', alpha: 0.18 * (1 - pose.standOut) }
  });
}

function drawBarrage(g, f, o, pose, camX) {
  if (!hasStar(f) || !(pose.standPunch > 1)) return;
  const span = Math.max(56, Math.min(132, Math.abs(o.x - f.x) + 26));
  const b = buffer('barrage', 200, 90);
  b.g.save(); b.g.translate(24, 45); barrageFists(b.g, pose.standPunch, span); b.g.restore();
  stamp(g, b, { x: f.x - camX, y: GROUND_Y + zToYOffset(f.z) - f.y - 74, ox: 24, oy: 45, flip: f.facing, outline: '#160A28', thickOutline: true });
}

function drawOne(g, f, pose, camX, tsec, rim) {
  const base = GROUND_Y + zToYOffset(f.z), fy = base - f.y;
  const lift = Math.min(0.7, f.y / 110);
  contactShadow(g, f.x - camX, base + 1, 15 * (1 - lift * 0.5), 4.5 * (1 - lift * 0.5), '#000000', 0.5 * (1 - lift * 0.7));
  const ghosts = [];
  if (pose.ghosts) for (let i = 1; i <= 3; i++) ghosts.push({ dx: -Math.sign(pose.ghosts) * f.facing * i * 8, dy: 0, alpha: 0.28 / i, color: FX.ghost[3] });
  if (pose.smear > 0.2) for (let i = 1; i <= 2; i++) ghosts.push({ dx: -f.facing * i * 5, dy: 0, alpha: 0.22 * pose.smear / i, color: '#FFFFFF' });
  stampFighter(g, 'fighter' + f.slot, bg => SPRITES[f.def.sprite](bg, pose, f, tsec), {
    x: f.x - camX, y: fy, flip: f.facing, rot: pose.bodyRot || 0, sx: pose.squashX, sy: pose.squashY,
    shadow: { color: '#000000', alpha: 0.3 * (1 - lift), skew: 0.9, squash: 0.26 },
    flash: { color: '#FFB8A8', alpha: Math.min(0.26, (pose.flash || 0) * 0.3) },
    tint: f.def.tint ? { color: f.def.tint, alpha: 0.3 } : null, rim, ghosts
  });
}

export function drawFight(g, W, H, fight, view, tsec, dtMs, opts) {
  const o = opts || {};
  const frozen = fight.hitstop > 0, scaled = frozen ? 0 : dtMs * fight.timeScale;
  const [A, B] = fight.fighters;
  const camX = camera(fight, view, W);
  if (!frozen) view.fx.update(dtMs * fight.timeScale);
  view.juice.update(dtMs, frozen);
  view.poses = [fighterPose(A, tsec, scaled), fighterPose(B, tsec, scaled)];
  layPoses(fight, view);                       /* POSE (pose_random.js): where the limbs were put on purpose, until the fighter does something; the picture only */
  const rim = SCENE_LIGHT[fight.stage.id] || SCENE_LIGHT.street;

  g.save();
  g.translate(view.juice.shakeX, view.juice.shakeY);
  drawBackground(g, W, H, fight.stage.id, camX, tsec, GROUND_Y);
  [A, B].forEach((f, k) => drawStand(g, f, view.poses[k], camX, tsec));
  depthSort(fight.fighters).forEach(f => drawOne(g, f, view.poses[f.slot], camX, tsec, rim));
  [A, B].forEach((f, k) => drawBarrage(g, f, fight.fighters[1 - k], view.poses[k], camX));
  view.juice.particles.forEach(p => { const a = Math.max(0, 1 - p.life / p.maxLife); g.save(); g.globalAlpha = a; g.fillStyle = p.color; g.fillRect(Math.round(p.x - camX), Math.round(p.y), p.size, p.size); g.restore(); });
  view.fx.draw(g, W, H, camX);
  drawForeground(g, W, H, fight.stage.id, camX, tsec, GROUND_Y);
  if (o.overlay) o.overlay(g, W, H, camX, fight, view);
  g.restore();
  /* the KO beat: the edges of the picture darken so the one who fell is lit */
  if (fight.phase === 'ko') {
    const k = Math.min(1, fight.koT / 10);
    g.save(); g.globalAlpha = 0.38 * k; g.fillStyle = '#000000';
    g.fillRect(0, 0, W, 18); g.fillRect(0, H - 18, W, 18); g.restore();
  }
  return camX;
}
