/* HUD chrome: beveled bars, small portrait chips, combo counter. */

import { px } from './draw.js';
import { EXT } from './palette.js';
import { PAL } from './data.js';

function bevelBar(g, x, y, w, h, frac, fg, fgDark) {
  px(g, x - 2, y - 2, w + 4, h + 4, PAL.black);
  px(g, x - 1, y - 1, w + 2, h + 2, PAL.dgray);
  px(g, x, y, w, h, '#141418');
  const fw = Math.round(w * Math.max(0, Math.min(1, frac)));
  if (fw > 0) {
    px(g, x, y, fw, h, fg);
    px(g, x, y, fw, Math.max(1, Math.round(h * 0.4)), fgDark);
  }
  px(g, x - 1, y - 1, w + 2, 1, '#3A3A42');
}

function portrait(g, x, y, size, bg, fg) {
  px(g, x - 1, y - 1, size + 2, size + 2, PAL.black);
  px(g, x, y, size, size, bg);
  const c = size / 2;
  px(g, x + c - 2, y + c - 1, 1, 1, fg);
  px(g, x + c + 1, y + c - 1, 1, 1, fg);
  px(g, x + c - 2, y + c + 2, 5, 1, fg);
}

const ENEMY_PORTRAIT = {
  morioh_thug: EXT.thug.leather,
  angelo: EXT.angelo.coat,
  killer_queen: EXT.killerQueen.pink
};

export function drawHUD(g, W, combat) {
  const { player, enemy } = combat;
  portrait(g, 8, 8, 14, EXT.jotaro.gakuran, EXT.jotaro.skin);
  g.fillStyle = PAL.white;
  g.font = '7px monospace';
  g.fillText('JOTARO', 26, 14);
  bevelBar(g, 26, 17, 130, 8, player.hp / player.maxHp, '#3ED65C', '#1F8034');
  bevelBar(g, 26, 29, 130, 5, player.persistence / player.maxPersistence, EXT.fx.guardCyan, '#2E7A8C');

  if (enemy.hp > 0 || (enemy.deathTimer || 0) > 0) {
    const name = enemy.def.standName || enemy.def.name;
    g.textAlign = 'right';
    g.fillStyle = PAL.white;
    g.fillText(name, W - 26, 14);
    g.textAlign = 'left';
    const ec = enemy.tint || ENEMY_PORTRAIT[enemy.def.id] || PAL.lred;
    portrait(g, W - 22, 8, 14, ec, '#1A1A1A');
    bevelBar(g, W - 156, 17, 130, 8, enemy.hp / enemy.maxHp, '#E85050', '#902828');
  }

  if (player.comboCount > 1) {
    const pulse = 1 + Math.min(0.5, player.comboCount * 0.03) * (0.6 + 0.4 * Math.sin(Date.now() / 90));
    g.save();
    g.translate(W / 2, 40);
    g.scale(pulse, pulse);
    g.textAlign = 'center';
    g.fillStyle = player.comboCount >= 8 ? EXT.fx.sparkHot : PAL.yellow;
    g.font = 'bold 13px monospace';
    g.fillText(player.comboCount + ' HIT', 0, 0);
    g.restore();
    g.textAlign = 'left';
  }
}
