/* Arena furniture: everything drawn into the world that isn't a
   character -- attack telegraphs, projectiles, particles, footfall dust
   -- plus the render-only reactions that spawn swing arcs, charge motes
   and scuffs from combat state changes. Splitting these out of render.js
   keeps the composition file to camera work and sprite stamping. */

import { px, poly, ellipse, line, ring, disc } from './draw.js';
import { text } from './font.js';
import { FX } from './palette.js';
import { GROUND_Y } from './constants.js';
import { zToYOffset } from './render_adapter.js';

/* Transient, render-only reactions to state changes. Keeping them here
   (rather than in combat.js) means the fight simulation never has to
   know that swing arcs, charge motes or footfall dust exist. */
export function sceneEvents(combat, fx, ppose, epose, camX, tsec) {
  const rs = combat._rs || (combat._rs = { phase: '', move: '', gait: 0, estate: '', hurt: 0 });
  const p = combat.player, e = combat.enemy;
  const px0 = p.x - camX;
  // z-projected ground lines (render_adapter.js) so effects attached to a
  // fighter follow it off the resting depth instead of floating at a
  // fixed y once something actually moves on z.
  const pY = GROUND_Y + zToYOffset(p.z), eY = GROUND_Y + zToYOffset(e.z);

  if (p.state === 'attack' && p.activeMove) {
    const key = p.activeMove.id + p.movePhase;
    if (key !== rs.phase) {
      rs.phase = key;
      if (p.movePhase === 'active' && p.activeMove.type !== 'rush') {
        const heavy = p.activeMove.type === 'heavy';
        fx.spawn('arc', {
          x: px0 + p.facing * 6, y: pY - 62, r: p.activeMove.reach * 0.62,
          dir: p.facing, life: heavy ? 0.26 : 0.18, sweep: heavy ? 2.1 : 1.4, a0: -1.35,
          color: heavy ? FX.spark[2] : FX.spark[3]
        });
      }
    }
    if (p.movePhase === 'windup' && (p.activeMove.type === 'heavy' || p.activeMove.costs.persistence)) {
      if (Math.random() < 0.4) {
        fx.spawn('charge', {
          x: px0 + p.facing * 14, y: pY - 70, life: 0.3,
          color: p.activeMove.costs.persistence ? FX.aura[4] : FX.spark[3]
        });
      }
    }
  } else rs.phase = '';

  /* footfall dust, fired when the gait passes a contact point */
  if (p.state === 'idle' && p.moving) {
    const gait = ppose ? (ppose.gaitPhase || 0) : 0;
    const step = Math.floor(gait * 2);
    if (step !== rs.gait) {
      rs.gait = step;
      fx.spawn('dust', { x: px0 - p.facing * 6, y: pY - 1, dir: -p.facing, size: 9, life: 0.32 });
    }
  }

  /* Stand aura while it is manifested: wisps peeling off the body */
  if (ppose.standOut > 0.4 && Math.random() < 0.35) {
    fx.spawn('aura', {
      x: px0 - p.facing * (18 + Math.random() * 22), y: pY - Math.random() * 20,
      size: 14 + Math.random() * 20, life: 0.5, alpha: 0.5, color: FX.aura[3 + (Math.random() < 0.4 ? 1 : 0)]
    });
  }

  /* enemy wind-up charge, colour-matched to the incoming pattern */
  const est = e.ai ? e.ai.state + (e.ai.pattern ? e.ai.pattern.id : '') : '';
  if (e.ai && e.ai.state === 'windup' && e.ai.pattern && Math.random() < 0.3) {
    fx.spawn('charge', {
      x: e.x - camX, y: eY - 76, life: 0.32, color: e.ai.pattern.telegraph
    });
  }
  if (est !== rs.estate && e.ai && e.ai.state === 'active' && e.ai.pattern && !e.ai.pattern.ranged) {
    fx.spawn('arc', {
      x: e.x - camX + e.facing * 6, y: eY - 60, r: e.ai.pattern.range * 0.5,
      dir: e.facing, life: 0.24, sweep: 2, a0: -1.3, color: e.ai.pattern.telegraph
    });
  }
  rs.estate = est;

  /* a scuff of dust when a hit knocks someone across the ground */
  if ((e.hurtFlash || 0) > rs.hurt + 0.4) {
    fx.spawn('dust', { x: e.x - camX, y: eY - 1, dir: p.facing, size: 12, life: 0.36 });
  }
  rs.hurt = e.hurtFlash || 0;
}

/* ---- world extras ------------------------------------------------------ */

/* GDD §21 accessibility: colour alone fails ~8% of players, so every
   telegraph also carries a distinct outline glyph over the enemy's head --
   ring = sweep, chevron = slam, crosshair = ranged (Phase 2 deliverable 7).
   `glyph` is data on the pattern (ai.js); this is the only place that
   reads it, so a future pattern just picks one of these three shapes
   instead of this function growing a branch per pattern id. */
function drawGlyph(g, glyph, x, y, k, color) {
  const pulse = 0.55 + 0.45 * Math.sin(k * 14);
  g.save();
  g.globalAlpha = pulse;
  if (glyph === 'ring') {
    ring(g, x, y + 4, 8, 2, color, 0.9);
    ring(g, x, y + 4, 4, 1, '#FFFFFF', 0.9);
  } else if (glyph === 'crosshair') {
    line(g, x - 9, y + 4, x + 9, y + 4, 1, color);
    line(g, x, y - 5, x, y + 13, 1, color);
    ring(g, x, y + 4, 5, 1, '#FFFFFF', 0.9);
  } else {
    poly(g, [[x - 7, y], [x + 7, y], [x, y + 9]], color);
    poly(g, [[x - 4, y + 1], [x + 4, y + 1], [x, y + 6]], '#FFFFFF');
  }
  g.restore();
}

export function telegraph(g, enemy, camX, tsec) {
  const ai = enemy.ai;
  if (!ai || ai.state !== 'windup' || !ai.pattern) return;
  const k = 1 - Math.max(0, ai.timer) / ai.pattern.windupFrames;
  const x = enemy.x - camX;
  const gy = GROUND_Y + zToYOffset(enemy.z);
  const r = ai.pattern.range;
  const pulse = 0.35 + 0.45 * Math.abs(Math.sin(tsec * 16));
  g.save();
  g.globalAlpha = pulse * (0.35 + k * 0.5);
  ellipse(g, x, gy + 2, r * (0.4 + k * 0.6), r * 0.14 + 3, ai.pattern.telegraph);
  g.globalAlpha = pulse;
  ring(g, x, gy + 2, r * (0.4 + k * 0.6), 2, ai.pattern.telegraph, 0.26);
  g.restore();
  const y = gy - 130 - Math.sin(tsec * 12) * 2;
  drawGlyph(g, ai.pattern.glyph || 'chevron', x, y, tsec, ai.pattern.telegraph);
  if (k > 0.55) {
    text(g, ai.pattern.label, x, y - 12, {
      scale: 1, align: 'center', color: ai.pattern.telegraph, outline: '#1A0A0A'
    });
  }
}

export function projectiles(g, enemy, camX, tsec) {
  const gy = GROUND_Y + zToYOffset(enemy.z);
  enemy.projectiles.forEach(pr => {
    const x = pr.x - camX, y = gy - 60;
    const c = pr.pattern.telegraph;
    g.save();
    g.globalAlpha = 0.85 + 0.15 * Math.sin(tsec * 30 + pr.x);
    for (let i = 1; i <= 4; i++) {
      g.globalAlpha = 0.5 / i;
      disc(g, x - pr.dir * i * 7, y + Math.sin(tsec * 20 + i) * 2, 5 - i * 0.8, c);
    }
    g.globalAlpha = 1;
    disc(g, x, y, 7, c);
    disc(g, x, y, 4, '#FFFFFF');
    for (let i = 0; i < 4; i++) {
      const a = tsec * 9 + i * Math.PI / 2;
      line(g, x + Math.cos(a) * 6, y + Math.sin(a) * 6, x + Math.cos(a) * 12, y + Math.sin(a) * 12, 1, c);
    }
    g.restore();
  });
}

export function particles(g, juice, camX) {
  juice.particles.forEach(p => {
    const a = Math.max(0, 1 - p.life / p.maxLife);
    g.save();
    g.globalAlpha = a;
    px(g, p.x - camX, p.y, p.size, p.size, p.color);
    g.restore();
  });
}

export function groundDust(g, pose, x, y, tsec, seedOffset) {
  if (!pose.dust) return;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI + seedOffset;
    ellipse(g, x + Math.cos(a) * (8 + i * 5), y - 2 - Math.abs(Math.sin(a)) * 4,
      5 + i * 2, 2.5 + i, FX.dust[2 + (i % 3)]);
  }
}

