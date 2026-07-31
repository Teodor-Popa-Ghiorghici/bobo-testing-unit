/* Debug overlay — tech §2.4/§2.5 deliverable 8: "you cannot author frame
   data blind." Draws hitboxes, hurtboxes, the current frame within the
   active move/pattern, poise bars and i-frame state directly from combat
   state. Purely additive to render.js (one toggled call, no changes to
   the stamping/pose pipeline) and read-only -- it never mutates anything
   it draws, same rule as arena.js/juice.js. Toggled by `combat.debug`,
   flipped by a button in index.js's appbar next to the shake toggle. */

import { px, line, ring } from './draw.js';
import { text } from './font.js';
import { zToYOffset } from './render_adapter.js';
import { GROUND_Y } from './constants.js';

function rectOutline(g, cx, cy, w, h, color) {
  g.save();
  g.globalAlpha = 0.85;
  line(g, cx - w / 2, cy - h, cx + w / 2, cy - h, 1, color);
  line(g, cx - w / 2, cy, cx + w / 2, cy, 1, color);
  line(g, cx - w / 2, cy - h, cx - w / 2, cy, 1, color);
  line(g, cx + w / 2, cy - h, cx + w / 2, cy, 1, color);
  g.restore();
}

function drawHurtbox(g, entity, camX, color) {
  const cx = entity.x - camX;
  const cy = GROUND_Y + zToYOffset(entity.z);
  const w = (entity.body && entity.body.hurtboxW) || 30;
  const h = (entity.body && entity.body.hurtboxH) || 64;
  rectOutline(g, cx, cy, w, h, color);
}

/* Active player-move hitbox windows: red while still live, grey once
   `spent` (already connected or expired) this activation. */
function drawPlayerHitboxes(g, player, camX) {
  if (player.state !== 'attack' || !player.activeMove) return;
  const cx = player.x - camX;
  const cy = GROUND_Y + zToYOffset(player.z) - 40;
  player.activeMove.hitboxes.forEach((hb, i) => {
    const inWindow = player.moveFrame >= hb.from && player.moveFrame <= hb.to;
    if (!inWindow && !(player.hitboxSpent && player.hitboxSpent.has(i))) return;
    const hx = cx + player.facing * (hb.x == null ? hb.w / 2 : hb.x);
    const color = player.hitboxSpent && player.hitboxSpent.has(i) ? '#555555' : '#FF4040';
    rectOutline(g, hx, cy + 40, hb.w, 30, color);
  });
}

function drawEnemyHitbox(g, enemy, camX) {
  const ai = enemy.ai;
  if (!ai || ai.state !== 'active' || !ai.pattern || !ai.pattern.hitbox) return;
  const hb = ai.pattern.hitbox;
  const cx = enemy.x - camX;
  const cy = GROUND_Y + zToYOffset(enemy.z) - 40;
  const hx = cx + enemy.facing * (hb.x == null ? hb.w / 2 : hb.x);
  rectOutline(g, hx, cy + 40, hb.w, 30, '#FF9900');
}

function statLine(g, x, y, str, color) {
  text(g, str, x, y, { scale: 1, color: color || '#8FFF8F', shadow: '#000000' });
}

export function drawDebugOverlay(g, W, H, combat, camX) {
  const { player, enemy } = combat;
  drawHurtbox(g, player, camX, player.invulnerable ? '#55FFFF' : '#40C0FF');
  if (enemy.hp > 0) drawHurtbox(g, enemy, camX, enemy.ai && enemy.ai.state === 'staggered' ? '#FF5555' : '#FFAA40');
  drawPlayerHitboxes(g, player, camX);
  if (enemy.hp > 0) drawEnemyHitbox(g, enemy, camX);

  let y = 60;
  statLine(g, 4, y, 'P:' + player.state + (player.activeMove ? '/' + player.activeMove.id + '@' + player.moveFrame + '/' + player.activeMove.frames : ''), '#8FFF8F'); y += 8;
  statLine(g, 4, y, 'iframes:' + (player.invulnerable ? 'ON' : 'off') + ' steps:' + player.dodgeCharges + ' guard:' + (player.guarding ? 'ON' : 'off'), '#8FFF8F'); y += 8;
  if (enemy.hp > 0) {
    statLine(g, 4, y, 'E:' + enemy.ai.state + (enemy.ai.pattern ? '/' + enemy.ai.pattern.id : '') + ' t:' + Math.max(0, enemy.ai.timer), '#FFC080'); y += 8;
    statLine(g, 4, y, 'poise:' + Math.ceil(enemy.poise.current) + '/' + enemy.poise.max, '#FFC080'); y += 8;
  }
}
