/* Combat scene orchestrator -- delegates to background/sprite/hud modules
   and keeps the generic combat-only drawing (telegraphs, projectiles,
   particles, banners) here. */

import { PAL } from './data.js';
import { px } from './draw.js';
import { EXT } from './palette.js';
import { computePlayerPose, computeEnemyPose } from './anim.js';
import { drawBackground } from './background.js';
import { drawPlayer } from './sprite_player.js';
import { drawThug, drawAngelo } from './sprite_enemy.js';
import { drawKillerQueen } from './sprite_boss.js';
import { drawHUD } from './hud.js';

export const GROUND_Y = 150;

const ENEMY_SPRITES = { morioh_thug: drawThug, angelo: drawAngelo };

function drawEnemySprite(g, enemy, pose, tsec) {
  if (enemy.def.id === 'killer_queen') {
    drawKillerQueen(g, enemy.x, GROUND_Y, enemy.facing, pose, enemy.phaseIndex);
    return;
  }
  const fn = ENEMY_SPRITES[enemy.def.id] || drawThug;
  fn(g, enemy.x, GROUND_Y, enemy.facing, pose, tsec);
}

function drawTelegraph(g, x, ai, tsec) {
  if (ai.state !== 'windup' || !ai.pattern) return;
  const pulse = 0.5 + 0.5 * Math.sin(tsec * 18);
  g.globalAlpha = 0.3 + pulse * 0.35;
  px(g, x - ai.pattern.range, GROUND_Y - 46, ai.pattern.range * 2, 40, ai.pattern.telegraph);
  g.globalAlpha = 1;
  px(g, x - 2, GROUND_Y - 52, 4, 4, ai.pattern.telegraph);
}

function drawProjectiles(g, list, tsec) {
  list.forEach(pr => {
    const flicker = 0.7 + 0.3 * Math.sin(tsec * 30 + pr.x);
    g.globalAlpha = flicker;
    px(g, pr.x - 3, GROUND_Y - 32, 6, 6, pr.pattern.telegraph);
    px(g, pr.x - 1, GROUND_Y - 34, 2, 2, EXT.fx.sparkHot);
    g.globalAlpha = 1;
  });
}

function drawSpeedLines(g, x, facing, move, phase) {
  if (phase !== 'active') return;
  g.strokeStyle = EXT.fx.sparkHot;
  g.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const yy = GROUND_Y - 34 + i * 6;
    const len = 5 + i * 3;
    g.beginPath();
    g.moveTo(x + facing * (10 + move.range * 0.4), yy);
    g.lineTo(x + facing * (10 + move.range * 0.4 + len), yy);
    g.stroke();
  }
}

function drawParticles(g, particles) {
  particles.forEach(p => {
    const a = Math.max(0, 1 - p.life / p.maxLife);
    g.globalAlpha = a;
    px(g, p.x, p.y, p.size, p.size, p.color);
  });
  g.globalAlpha = 1;
}

export function drawCombat(g, W, H, combat, tsec) {
  const { player, enemy, juice } = combat;
  g.save();
  g.translate(juice.shakeX, juice.shakeY);
  px(g, 0, 0, W, H, PAL.black);
  drawBackground(g, W, GROUND_Y, tsec);

  if (enemy.hp > 0) drawTelegraph(g, enemy.x, enemy.ai, tsec);
  drawProjectiles(g, enemy.projectiles, tsec);

  const ppose = computePlayerPose(player, tsec, combat.outcome);
  drawPlayer(g, player.x, GROUND_Y, player.facing, ppose, tsec);
  if (player.state === 'attack') drawSpeedLines(g, player.x, player.facing, player.activeMove, player.movePhase);

  if (enemy.hp > 0 || (enemy.deathTimer || 0) > 0) {
    const epose = computeEnemyPose(enemy, tsec);
    drawEnemySprite(g, enemy, epose, tsec);
  }

  drawParticles(g, juice.particles);
  g.restore();

  drawHUD(g, W, combat);

  if (player.state === 'parry' && player.parryWindow) {
    g.strokeStyle = EXT.fx.guardCyan;
    g.strokeRect(player.x - 10, GROUND_Y - 50, 20, 50);
  }

  if (combat.bannerTimer > 0) {
    g.textAlign = 'center';
    g.fillStyle = PAL.yellow;
    g.font = '12px monospace';
    g.fillText(combat.banner, W / 2, 60);
    g.textAlign = 'left';
  }
  if (combat.log[0]) {
    g.textAlign = 'center';
    g.fillStyle = PAL.white;
    g.font = '10px monospace';
    g.fillText(combat.log[0], W / 2, 76);
    g.textAlign = 'left';
  }

  if (combat.outcome === 'win') {
    g.textAlign = 'center';
    g.fillStyle = PAL.lgreen;
    g.font = '16px monospace';
    g.fillText('VICTORY', W / 2, H / 2);
    g.textAlign = 'left';
  } else if (combat.outcome === 'lose') {
    g.textAlign = 'center';
    g.fillStyle = PAL.lred;
    g.font = '16px monospace';
    g.fillText('YOU HAVE BEEN STOPPED.', W / 2, H / 2);
    g.textAlign = 'left';
  }
}
