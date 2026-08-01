/* HUD: chunky beveled panels in the bitmap font, sized for the 480x270
   frame. Health bars carry a lagging "damage ghost" behind the fill so a
   big hit is legible as a chunk taken out, not just a shorter bar. */

import { px, poly, disc, line } from './draw.js';
import { text, textWidth } from './font.js';
import { FX, JOTARO, THUG, ANGELO, KQ, S, SH, BASE, LT, RIM } from './palette.js';
import { DODGE_CHARGE_MAX } from './fighter.js';

const ghosts = new WeakMap();

function panel(g, x, y, w, h) {
  px(g, x - 2, y - 2, w + 4, h + 4, '#05060C');
  px(g, x - 1, y - 1, w + 2, h + 2, '#4A5070');
  px(g, x - 1, y - 1, w + 2, 1, '#8A93B8');
  px(g, x, y, w, h, '#12141F');
}

function bar(g, x, y, w, h, frac, ghost, ramp, flip) {
  panel(g, x, y, w, h);
  const dir = flip ? -1 : 1;
  const at = f => (flip ? x + w - Math.round(w * f) : x);
  if (ghost > frac) {
    const gw = Math.round(w * ghost);
    px(g, at(ghost), y, gw, h, '#8E2230');
  }
  const fw = Math.round(w * Math.max(0, Math.min(1, frac)));
  if (fw > 0) {
    px(g, at(frac), y, fw, h, ramp[BASE]);
    px(g, at(frac), y, fw, Math.max(1, Math.round(h * 0.38)), ramp[LT]);
    px(g, at(frac), y + h - 1, fw, 1, ramp[S]);
    px(g, flip ? at(frac) : x + fw - 1, y, 1, h, ramp[RIM]);
  }
  /* tick marks every 25% so damage has a readable scale */
  for (let i = 1; i < 4; i++) px(g, x + Math.round(w * i / 4), y, 1, h, '#05060C');
}

/* small painted bust, drawn from the character's own ramps */
function portrait(g, x, y, size, who) {
  px(g, x - 2, y - 2, size + 4, size + 4, '#05060C');
  px(g, x - 1, y - 1, size + 2, size + 2, '#6A7396');
  px(g, x, y, size, size, '#161A2C');
  const cx = x + size / 2, cy = y + size / 2;
  if (who === 'jotaro') {
    poly(g, [[cx - 7, cy + 10], [cx - 9, cy + 2], [cx + 9, cy + 2], [cx + 7, cy + 10]], JOTARO.coat[BASE]);
    poly(g, [[cx - 5, cy + 4], [cx + 5, cy + 4], [cx + 4, cy - 5], [cx - 4, cy - 5]], JOTARO.skin[BASE]);
    poly(g, [[cx - 5, cy - 2], [cx + 5, cy - 2], [cx + 5, cy - 8], [cx - 5, cy - 8]], JOTARO.hair[BASE]);
    poly(g, [[cx - 7, cy - 6], [cx + 7, cy - 7], [cx + 6, cy - 11], [cx - 6, cy - 10]], JOTARO.coat[SH]);
    poly(g, [[cx + 4, cy - 7], [cx + 10, cy - 6], [cx + 10, cy - 4], [cx + 4, cy - 4]], JOTARO.coat[S]);
    px(g, cx - 3, cy - 1, 2, 2, '#12324A'); px(g, cx + 2, cy - 1, 2, 2, '#12324A');
  } else if (who === 'killer_queen') {
    poly(g, [[cx - 8, cy + 10], [cx - 7, cy - 2], [cx + 7, cy - 2], [cx + 8, cy + 10]], KQ.pink[BASE]);
    poly(g, [[cx - 6, cy + 1], [cx + 6, cy + 1], [cx + 5, cy - 9], [cx - 5, cy - 9]], KQ.pink[LT]);
    poly(g, [[cx - 6, cy - 3], [cx + 6, cy - 3], [cx + 5, cy - 10], [cx - 5, cy - 10]], KQ.black[BASE]);
    px(g, cx - 4, cy - 6, 3, 2, KQ.gold[BASE]); px(g, cx + 2, cy - 6, 3, 2, KQ.gold[BASE]);
    poly(g, [[cx - 1, cy - 10], [cx + 1, cy - 15], [cx + 3, cy - 10]], KQ.black[BASE]);
  } else {
    const P = who === 'angelo' ? ANGELO : THUG;
    const cloth = who === 'angelo' ? P.coat : P.jacket;
    poly(g, [[cx - 8, cy + 10], [cx - 8, cy + 1], [cx + 8, cy + 1], [cx + 8, cy + 10]], cloth[BASE]);
    poly(g, [[cx - 5, cy + 3], [cx + 5, cy + 3], [cx + 4, cy - 6], [cx - 4, cy - 6]], P.skin[BASE]);
    poly(g, who === 'angelo'
      ? [[cx - 6, cy - 3], [cx + 6, cy - 4], [cx + 5, cy - 10], [cx - 5, cy - 9]]
      : [[cx - 6, cy - 4], [cx - 3, cy - 12], [cx + 5, cy - 11], [cx + 6, cy - 4]], P.hair[BASE]);
    px(g, cx - 3, cy - 2, 2, 2, who === 'angelo' ? ANGELO.eye[BASE] : '#3A2A10');
    px(g, cx + 2, cy - 2, 2, 2, who === 'angelo' ? ANGELO.eye[BASE] : '#3A2A10');
  }
}

export function drawHUD(g, W, H, combat, tsec) {
  const { player, enemy } = combat;
  let gh = ghosts.get(combat);
  if (!gh) { gh = { p: 1, e: 1 }; ghosts.set(combat, gh); }
  const pf = player.hp / player.maxHp, ef = enemy.maxHp ? enemy.hp / enemy.maxHp : 0;
  gh.p += (pf - gh.p) * 0.06; gh.e += (ef - gh.e) * 0.06;

  portrait(g, 8, 8, 26, 'jotaro');
  text(g, 'JOTARO KUJO', 40, 9, { scale: 1, color: '#E8ECFF', shadow: '#05060C' });
  bar(g, 40, 18, 150, 9, pf, gh.p, ['#0E4A22', '#17692F', '#2FA34A', '#5FD672', '#B6FFC0']);
  text(g, Math.ceil(player.hp) + '/' + player.maxHp, 194, 19, { scale: 1, color: '#9FB0D8' });
  bar(g, 40, 30, 112, 6, player.persistence / player.maxPersistence, 0,
    ['#0B2E4A', '#12587E', '#1E93B8', '#4FD0E6', '#C4F6FF']);
  text(g, 'PERSISTENCE', 158, 30, { scale: 1, color: '#5FA8C8' });

  /* Momentum (GDD §3.8) -- the aggression resource: +40% damage at 100,
     gates Stand Rush. Replaces the old combo counter as the mechanical
     readout; comboCount itself lives on for the pose/fx/audio flavour
     layer only (see resources.js). */
  bar(g, 40, 40, 112, 6, player.momentum / 100, 0,
    ['#4A3B0B', '#7E6812', '#B89A1E', '#E6C94F', '#FFF6C4']);
  text(g, 'MOMENTUM', 158, 40, { scale: 1, color: '#C8A83A' });

  /* dodge charges (§3.7): 2 pips so "holding to stay safe" has a visible
     cost again -- direct feedback for tech audit item #1's fix */
  for (let i = 0; i < DODGE_CHARGE_MAX; i++) {
    const on = i < player.dodgeCharges;
    px(g, 40 + i * 10, 50, 7, 5, on ? '#5FE0FF' : '#1A3040');
    px(g, 40 + i * 10, 50, 7, 2, on ? '#C8F8FF' : '#243C48');
  }
  text(g, 'STEP', 64, 50, { scale: 1, color: '#5FA8C8' });

  if (enemy.hp > 0 || (enemy.deathTimer || 0) > 0) {
    const name = enemy.def.standName || enemy.def.name;
    portrait(g, W - 34, 8, 26, enemy.def.id);
    text(g, name, W - 40, 9, { scale: 1, align: 'right', color: '#FFD9E4', shadow: '#05060C' });
    bar(g, W - 190, 18, 150, 9, ef, gh.e, ['#4A0B12', '#7C141E', '#C2242E', '#E85A54', '#FFB0A0'], true);
    if (combat.isBoss) {
      const phases = enemy.def.phases.length;
      for (let i = 0; i < phases; i++) {
        const on = i <= enemy.phaseIndex;
        px(g, W - 40 - i * 9, 30, 7, 5, on ? '#FF6B9E' : '#3A2030');
        px(g, W - 40 - i * 9, 30, 7, 2, on ? '#FFC2D8' : '#4A2A3A');
      }
    }
  }

  if (player.comboCount > 1) {
    const pulse = 1 + Math.min(0.6, player.comboCount * 0.04) * (0.5 + 0.5 * Math.sin(tsec * 22));
    const hot = player.comboCount >= 8;
    g.save();
    g.translate(W / 2, 54);
    g.scale(pulse, pulse);
    text(g, String(player.comboCount), 0, -10, {
      scale: 3, align: 'center', color: hot ? '#FFF08A' : '#FFD24A',
      outline: '#3A1A06', shadow: '#7A2A0E', shadowDy: 2
    });
    text(g, 'HITS', 0, 12, { scale: 1, align: 'center', color: hot ? '#FFC94A' : '#C8A050', outline: '#3A1A06' });
    g.restore();
  }
}

/* banner + subtitles: the fight's announcements, kept out of the sprite
   layer so they never get shaken or tinted with the scene */
export function drawBanner(g, W, H, combat, tsec) {
  if (combat.bannerTimer > 0) {
    // bannerTimer is whole sim frames (tech §5 Phase 1); 18 frames == 300ms
    const k = Math.min(1, combat.bannerTimer / 18);
    const w = textWidth(combat.banner, 2) + 24;
    g.save();
    g.globalAlpha = k;
    px(g, W / 2 - w / 2, 72, w, 26, '#0A0C16');
    px(g, W / 2 - w / 2, 72, w, 1, '#FF6B9E');
    px(g, W / 2 - w / 2, 97, w, 1, '#FF6B9E');
    text(g, combat.banner, W / 2, 79, { scale: 2, align: 'center', color: '#FFE6F0', outline: '#3A0A1E' });
    g.restore();
  }
  if (combat.log[0] && combat.outcome === 'fighting') {
    text(g, combat.log[0], W / 2, 104, { scale: 1, align: 'center', color: '#B8C4E8', shadow: '#05060C' });
  }
  if (combat.outcome === 'win') {
    text(g, 'VICTORY', W / 2, 116, {
      scale: 4, align: 'center', color: '#FFE86A', outline: '#3A2A06', shadow: '#8A5A0E', shadowDy: 2,
      wave: { amp: 2, freq: 4, t: tsec }
    });
    text(g, 'CLICK TO CONTINUE', W / 2, 148, { scale: 1, align: 'center', color: '#C8D0F0' });
  } else if (combat.outcome === 'lose') {
    text(g, 'YOU HAVE BEEN STOPPED', W / 2, 118, {
      scale: 3, align: 'center', color: '#FF6B6B', outline: '#3A0A0A', shadow: '#7A1414', shadowDy: 2
    });
    text(g, 'CLICK TO RETURN', W / 2, 146, { scale: 1, align: 'center', color: '#C89090' });
  }
}
