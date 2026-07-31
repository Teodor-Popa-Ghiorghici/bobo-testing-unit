/* Combat scene composition: camera, sprite stamping, effects, HUD.

   Every character goes through the same path -- pose -> offscreen buffer
   -> stamp with outline, cast shadow, squash and flash -- so they all sit
   in the scene with the same lighting and the same silhouette treatment.
   The camera tracks the midpoint of the fight and drives the parallax,
   and shake offsets are applied to the world only, never to the HUD. */

import { buffer, stamp } from './layer.js';
import { px, poly, ellipse, line, ring, disc, contactShadow } from './draw.js';
import { playerPose } from './pose_player.js';
import { enemyPose } from './pose_enemy.js';
import { drawJotaro, SPEC as J_SPEC } from './sprite_jotaro.js';
import { drawStar, standPose, barrageFists, SPEC as S_SPEC } from './sprite_star.js';
import { drawThug, drawAngelo } from './sprite_enemy.js';
import { drawKillerQueen } from './sprite_boss.js';
import { drawBackground, drawForeground } from './background.js';
import { drawHUD, drawBanner } from './hud.js';
import { createFx, wireFx } from './fx.js';
import { sceneEvents, telegraph, projectiles, particles, groundDust } from './arena.js';
import { drawDebugOverlay } from './debug_overlay.js';
import { text } from './font.js';
import { FX, JOTARO, S, SH, BASE, LT, RIM } from './palette.js';
import { WORLD_W, GROUND_Y } from './constants.js';
import { zToYOffset, depthSort, cameraTargetX } from './render_adapter.js';

export { WORLD_W, GROUND_Y };

const ENEMY_ART = { morioh_thug: drawThug, angelo: drawAngelo };
const SCENE_FOR = {
  n1: 'alley', n2: 'street', n3: 'street', n4: 'street', n5: 'park', n6: 'store'
};

/* each arena's key light, used for the rim on every sprite so characters
   are lit by the scene they are standing in */
const SCENE_LIGHT = {
  alley: { color: '#FFD79B', alpha: 0.34 },
  street: { color: '#FFC98A', alpha: 0.42 },
  park: { color: '#9FC0FF', alpha: 0.34 },
  store: { color: '#CFE0FF', alpha: 0.38 }
};

/* Camera tracking is the only place render.js reaches into the render
   adapter for something other than depth -- cameraTargetX reads the same
   Transform (x, z) component the adapter's z projection reads. */
function camera(combat, W) {
  const mid = cameraTargetX(combat.entities);
  return Math.max(0, Math.min(WORLD_W - W, mid - W / 2));
}

/* ---- characters -------------------------------------------------------- */

function stampFighter(g, key, w, h, ox, oy, paint, opts) {
  const b = buffer(key, w, h);
  b.g.save();
  b.g.translate(ox, oy);
  paint(b.g);
  b.g.restore();
  stamp(g, b, Object.assign({ ox, oy, outline: FX.ink, thickOutline: true }, opts));
  return b;
}

function shadowOpts(pose) {
  return { color: '#000000', alpha: 0.30, skew: 0.9, squash: 0.26 - (pose.airborne || 0) * 0.1 };
}

function drawStand(g, player, pose, camX, tsec) {
  if (pose.standOut <= 0.02) return;
  const sp = standPose(pose);
  const manifest = pose.standOut;
  const key = 'star';
  const b = buffer(key, 300, 240);
  b.g.save();
  b.g.translate(150, 214);
  drawStar(b.g, sp, manifest);
  b.g.restore();
  const bob = Math.sin(tsec * 3.4) * 2;
  const rushing = pose.action === 'rush' || pose.action === 'special';
  stamp(g, b, {
    x: player.x - camX - player.facing * (rushing ? 30 : 22),
    y: GROUND_Y + zToYOffset(player.z) - (rushing ? 22 : 10) + bob,
    ox: 150, oy: 214, flip: player.facing,
    outline: '#160A28', thickOutline: true,
    rim: { color: '#D5A8FF', alpha: 0.5, dx: -1, dy: -2 },
    alpha: 0.55 + manifest * 0.45,
    tint: { color: '#B98BFF', alpha: 0.18 * (1 - manifest) }
  });
}

/* The rush flurry is stamped separately, over the user, so the fists
   actually reach the target instead of being hidden behind his back. */
function drawBarrage(g, player, enemy, pose, camX) {
  if (!(pose.standPunch > 1)) return;
  const span = Math.max(56, Math.min(132, Math.abs(enemy.x - player.x) + 26));
  const b = buffer('barrage', 200, 90);
  b.g.save();
  b.g.translate(24, 45);
  barrageFists(b.g, pose.standPunch, span);
  b.g.restore();
  stamp(g, b, {
    x: player.x - camX, y: GROUND_Y + zToYOffset(player.z) - 74, ox: 24, oy: 45,
    flip: player.facing, outline: '#160A28', thickOutline: true
  });
}

function drawFighter(g, f, pose, camX, tsec, isPlayer, phaseIndex, rim) {
  const paint = isPlayer
    ? bg => drawJotaro(bg, pose)
    : f.def.id === 'killer_queen'
      ? bg => drawKillerQueen(bg, pose, phaseIndex, tsec)
      : bg => (ENEMY_ART[f.def.id] || drawThug)(bg, pose);
  const ghosts = [];
  if (pose.ghosts) {
    for (let i = 1; i <= 3; i++) {
      ghosts.push({ dx: -pose.ghosts * i * 9, dy: 0, alpha: 0.30 / i, color: FX.ghost[3] });
    }
  }
  if (pose.smear > 0.2) {
    for (let i = 1; i <= 2; i++) {
      ghosts.push({ dx: -(f.facing || 1) * i * 5, dy: 0, alpha: 0.22 * pose.smear / i, color: '#FFFFFF' });
    }
  }
  const fy = GROUND_Y + zToYOffset(f.z);
  contactShadow(g, f.x - camX, fy + 1, 15, 4.5, '#000000', 0.5);
  stampFighter(g, isPlayer ? 'player' : 'enemy', 240, 200, 120, 184, paint, {
    x: f.x - camX, y: fy, flip: f.facing, rot: (pose.bodyRot || 0),
    sx: pose.squashX, sy: pose.squashY,
    shadow: shadowOpts(pose),
    flash: { color: '#FFB8A8', alpha: Math.min(0.24, (pose.flash || 0) * 0.3) },
    tint: f.tint ? { color: f.tint, alpha: 0.28 } : null,
    rim,
    ghosts
  });
}

/* ---- entry point ------------------------------------------------------- */

export function drawCombat(g, W, H, combat, tsec, dtMs, nodeId) {
  if (!combat._fx) {
    combat._fx = createFx();
    wireFx(combat, combat._fx, GROUND_Y);
  }
  const fx = combat._fx;
  const frozen = combat.juice.hitstopMs > 0;
  const dt = frozen ? 0 : dtMs;
  if (!frozen) fx.update(dtMs);

  const { player, enemy, juice } = combat;
  const camX = camera(combat, W);
  const ppose = playerPose(player, tsec, dt, combat.outcome);
  const epose = (enemy.hp > 0 || (enemy.deathTimer || 0) > 0) ? enemyPose(enemy, tsec, dt) : null;

  const scene = SCENE_FOR[nodeId] || 'street';
  const rim = SCENE_LIGHT[scene];
  if (!frozen) sceneEvents(combat, fx, ppose, epose, camX, tsec);

  g.save();
  g.translate(juice.shakeX, juice.shakeY);
  drawBackground(g, W, H, scene, camX, tsec, GROUND_Y);

  if (enemy.hp > 0) telegraph(g, enemy, camX, tsec);
  groundDust(g, ppose, player.x - camX, GROUND_Y + zToYOffset(player.z), tsec, 0);
  if (epose) groundDust(g, epose, enemy.x - camX, GROUND_Y + zToYOffset(enemy.z), tsec, 1.2);

  drawStand(g, player, ppose, camX, tsec);
  /* Depth sort (render_adapter.js): farthest-z entity draws first (behind),
     nearest-z draws last (in front). Falls back to the old x-based
     left/right order when both fighters share a depth -- the common case
     until something actually leaves the resting z. */
  const drawP = () => drawFighter(g, player, ppose, camX, tsec, true, 0, rim);
  const drawE = () => epose && drawFighter(g, enemy, epose, camX, tsec, false, enemy.phaseIndex, rim);
  depthSort(combat.entities).forEach(f => (f.kind === 'player' ? drawP : drawE)());
  drawBarrage(g, player, enemy, ppose, camX);

  projectiles(g, enemy, camX, tsec);
  particles(g, juice, camX);
  fx.draw(g, W, H);
  drawForeground(g, W, H, scene, camX, tsec, GROUND_Y);
  if (combat.debug) drawDebugOverlay(g, W, H, combat, camX); // Phase 2 deliverable 8 -- additive only
  g.restore();

  drawHUD(g, W, H, combat, tsec);
  drawBanner(g, W, H, combat, tsec);
}
