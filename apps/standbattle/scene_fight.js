/* The fight scene, for every mode (spec 10): builds the fight from a config, feeds it frames from the devices or the CPU, draws it, and hands the finished match back.

   enter({ defs: [a, b], stage, humans: [bool, bool], ais: [profile|null, ...], rng, wins, timerFrames, hp, carry, training, onEnd(match, fight), label })  */

import { createFight } from './fight.js';
import { wireAudio, sfxVictory, sfxDefeat, sfxMove, sfxPick } from './audio.js';
import { drawFight, ensureView } from './draw_fight.js';
import { drawFightHUD } from './hud_fight.js';
import { createRng } from './rng.js';
import { text } from './font.js';
import { px } from './draw.js';
import { buttonsOf } from './input.js';
import { rollPoses, hitBtn } from './pose_random.js';
import { drawPoseBtn } from './pose_btn.js';
import { buffs } from '../buffs_scope.js';

export function fightScene(app) {
  let fight = null, view = null, cfg = null, ais = [null, null], paused = false, psel = 0, endDelay = 0, ended = false, poseFlash = 0;
  const gift = buffs();
  /* POSE: HOLYC.EXE's quiet gift. Everybody's limbs somewhere random, for the picture only (pose_random.js) */
  const pose = () => { if (!gift.has('battle_pose') || paused || !fight) return; rollPoses(fight, view, Math.random); poseFlash = 220; sfxPick(); };
  /* leaving a fight from the pause menu abandons the run it belongs to: nothing is recorded or paid for a match that was not finished */
  const quit = () => { const f = cfg.onQuit; cfg.onQuit = null; cfg.onEnd = null; if (f) f(); app.go('menu'); };
  const bitsOf = slot => (cfg.humans[slot] ? app.dev.bits(slot) : ais[slot] ? ais[slot].bits() : 0);
  return {
    enter(c) {
      cfg = c;
      fight = createFight({ defs: c.defs, stage: c.stage, rng: c.rng || createRng('fight'), training: c.training, wins: c.wins, timerFrames: c.timerFrames, hp: c.hp, carry: c.carry });
      wireAudio(fight);
      view = ensureView(fight, app.meta.shakeEnabled);
      ais = (c.ais || []).map((p, k) => (c.humans[k] ? null : (c.makeAI ? c.makeAI(fight, k, p) : null)));
      app.dev.single = !(c.humans[0] && c.humans[1]);
      app.dev.release();
      app.music(1, c.defs.some(x => x && x.boss) ? 'boss' : (c.stage && c.stage.id) || 'alley');
      if (c.onStart) c.onStart(fight);
      app.fight = fight;
    },
    leave() { app.fight = null; },
    shake(on) { if (view) view.juice.setShakeEnabled(on); },
    update(dt) {
      let nav;
      while ((nav = app.dev.popNav())) {
        if (paused) {
          if (nav.k === 'up' || nav.k === 'down') { psel = 1 - psel; sfxMove(); }
          else if (nav.k === 'pause' || (nav.k === 'confirm' && psel === 0)) { paused = false; app.dev.release(); }
          else if (nav.k === 'confirm') { sfxPick(); quit(); return; }
        } else if (nav.k === 'pause' && fight.phase !== 'over') { paused = true; psel = 0; app.dev.release(); }
        else if (nav.k === 'pose') pose();
      }
      if (poseFlash > 0) poseFlash -= dt;
      if (paused) return;
      fight.update(dt, bitsOf);
      if (cfg.tick) cfg.tick(fight, dt);
      const hp = fight.fighters.map(f => f.hp / f.maxHp);
      app.music(fight.phase === 'over' ? 0 : (fight.final || fight.def_boss || Math.min(hp[0], hp[1]) < 0.3) ? 2 : 1);
      if (fight.phase === 'over' && !ended) { ended = true; endDelay = 0; }
      if (ended) { endDelay += dt; if (endDelay > 400 && cfg.onEnd) { const f = cfg.onEnd; cfg.onEnd = null; f(fight.match, fight); } }
    },
    draw(g, W, H, tsec, dt) {
      drawFight(g, W, H, fight, view, tsec, dt, { overlay: cfg.overlay });
      drawFightHUD(g, W, H, fight, tsec, cfg.hud);
      if (cfg.drawHud) cfg.drawHud(g, W, H, fight, tsec);
      if (gift.has('battle_pose') && !paused) drawPoseBtn(g, W, H, poseFlash);
      if (paused) {
        g.save(); g.globalAlpha = 0.6; px(g, 0, 0, W, H, '#000000'); g.restore();
        text(g, 'PAUSED', W / 2, H / 2 - 40, { scale: 4, align: 'center', color: '#FFFFFF', outline: '#1E0A2A' });
        ['CONTINUE', 'QUIT TO MENU'].forEach((label, i) => text(g, (psel === i ? '> ' : '  ') + label, W / 2, H / 2 + 6 + i * 20, { scale: 2, align: 'center', color: psel === i ? '#FFE86A' : '#C8D0F0', outline: '#05060C' }));
        text(g, 'UP / DOWN: CHOOSE   ENTER: OK   ESC: CONTINUE', W / 2, H / 2 + 56, { scale: 1, align: 'center', color: '#9FB0D8' });
      }
    },
    click(mx, my) { if (gift.has('battle_pose') && hitBtn(480, 270, mx, my)) pose(); },
    hint() { return cfg && cfg.hint ? cfg.hint : 'WASD/ARROWS: MOVE (TAP UP/DOWN: SIDESTEP)  ' + buttonsOf(app.dev.map, 'p1') + ' / ' + buttonsOf(app.dev.map, 'p2') + ': LP RP LK RK  LP+RP: THROW  ESC: PAUSE'; }
  };
}
