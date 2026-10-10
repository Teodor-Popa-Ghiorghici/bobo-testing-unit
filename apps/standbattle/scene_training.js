/* Training (spec 11.7): a flat wall stage, no clock, HP that refills. On screen: the frame data of the move you are doing, the advantage the last exchange really left, the combo
   so far, and the inputs you pressed. TAB or ESC opens the menu: dummy, record, play, reset, boxes, side. R resets. Everything shown is read from the fight and the move rows. */
import { panel, drawMenu, menuRects, hitRect, text, px } from './ui_kit.js';
import { poly, line } from './draw.js';
import { createFight } from './fight.js';
import { createRng } from './rng.js';
import { defOf } from './roster.js';
import { STAGES } from './stages.js';
import { drawFight, ensureView } from './draw_fight.js';
import { drawFightHUD } from './hud_fight.js';
import { wireAudio, sfxMove, sfxPick } from './audio.js';
import { createTrainer, resetFight, DUMMIES, MAX_REC } from './training.js';
import { zToYOffset } from './render_adapter.js';
import { GROUND_Y } from './constants.js';
import { RULES, LANE_Z } from './rules.js';
import { cmdText, advText } from './cmd_text.js';
import { emit } from './trophies_bridge.js';
import { rollPoses, hitBtn } from './pose_random.js';
import { drawPoseBtn } from './pose_btn.js';
import { buffs } from '../buffs_scope.js';

const DIR = { 1: [-1, 1], 2: [0, 1], 3: [1, 1], 4: [-1, 0], 6: [1, 0], 7: [-1, -1], 8: [0, -1], 9: [1, -1] };
const BTN = [['LP', 16, '#FF9A9A'], ['RP', 32, '#FFE86A'], ['LK', 64, '#7AE0FF'], ['RK', 128, '#7AF08A']];

export function trainingScene(app) {
  let fight, view, tr, menu = false, sel = 0, boxes = false, side = 'right', hb = 0, recorded = false, played = false, poseFlash = 0;
  const gift = buffs();
  const pose = () => { if (!gift.has('battle_pose') || menu) return; rollPoses(fight, view, Math.random); poseFlash = 220; sfxPick(); };
  const items = () => [
    { label: 'DUMMY: ' + DUMMIES[tr.dummy] }, { label: tr.mode === 'record' ? 'STOP RECORDING' : 'RECORD (' + (tr.rec.length / 60).toFixed(1) + ' S)' }, { label: tr.mode === 'play' ? 'STOP PLAYBACK' : 'PLAY' },
    { label: 'RESET POSITION' }, { label: 'BOXES: ' + (boxes ? 'ON' : 'OFF') }, { label: 'DUMMY SIDE: ' + side.toUpperCase() }, { label: 'EXIT' }
  ];
  function reset() { resetFight(fight, side); }
  function act(i) {
    sfxPick();
    if (i === 0) tr.cycleDummy();
    else if (i === 1) { if (tr.mode === 'record') tr.stopRecord(); else { reset(); tr.startRecord(); menu = false; } }
    else if (i === 2) { if (tr.mode === 'play') tr.stop(); else { reset(); tr.play(); played = recorded; if (tr.rec.length) emit('record-play', {}); menu = false; } }
    else if (i === 3) reset();
    else if (i === 4) boxes = !boxes;
    else if (i === 5) { side = side === 'right' ? 'left' : 'right'; reset(); }
    else app.go('menu');
  }
  return {
    enter(a) {
      const rng = createRng('training' + Date.now());
      fight = createFight({ defs: [defOf(a.p1), defOf(a.p2)], stage: STAGES.street, rng, training: true });
      wireAudio(fight); view = ensureView(fight, app.meta.shakeEnabled); tr = createTrainer(fight, rng);
      side = app.meta.training.side || 'right'; tr.dummy = Math.max(0, DUMMIES.indexOf(String(app.meta.training.dummy || 'STAND').toUpperCase())); boxes = !!app.meta.training.boxes;
      menu = false; sel = 0; reset(); app.dev.single = true; app.music(1, 'street'); emit('training-open', {});
      const orig = fight.step;
      fight.step = (x, y) => { orig(x, y); tr.tick(); if (tr.again) { tr.again = false; reset(); } };
      fight.bus.on('onHit', e => { if (e.slot === 0) tr.contact(e.kind === 'throw' ? 'THROW' : 'HIT'); });
      fight.bus.on('onBlock', e => { if (e.slot === 0) tr.contact('BLOCK'); });
      fight.bus.on('onSwing', e => { if (e.slot === 0) tr.meas = null; });
    },
    leave() { app.meta.training = { dummy: DUMMIES[tr.dummy], side, boxes }; app.saveMeta(); },
    shake(on) { view.juice.setShakeEnabled(on); },
    update(dt) {
      let n;
      while ((n = app.dev.popNav())) {
        if (n.k === 'pause' || n.k === 'tab') { if (tr.mode === 'record') tr.stopRecord(); menu = !menu; sel = 0; app.dev.release(); }
        else if (n.k === 'reset') reset();
        else if (n.k === 'pose') pose();
        else if (menu) {
          const L = items();
          if (n.k === 'up') { sel = (sel + L.length - 1) % L.length; sfxMove(); } else if (n.k === 'down') { sel = (sel + 1) % L.length; sfxMove(); }
          else if (n.k === 'confirm' || n.k === 'start' || n.k === 'left' || n.k === 'right') act(sel);
          else if (n.k === 'back') menu = false;
        } else if (n.k === 'back') { /* escape also opens the menu through 'pause' */ }
      }
      if (poseFlash > 0) poseFlash -= dt;
      if (menu) return;
      fight.update(dt, s => { if (s === 0) { hb = app.dev.bits(0); return tr.mode === 'record' ? 0 : hb; } return tr.bits(hb); });
      if (tr.mode === 'record' && tr.rec.length >= MAX_REC) { tr.stopRecord(); recorded = true; }
    },
    click(mx, my) { if (menu) menuRects(items(), 240, 80, 20, 220).forEach(r => { if (hitRect(r, mx, my)) { sel = r.i; act(r.i); } }); else if (gift.has('battle_pose') && hitBtn(480, 270, mx, my)) pose(); },
    hover(mx, my) { if (menu) menuRects(items(), 240, 80, 20, 220).forEach(r => { if (hitRect(r, mx, my)) sel = r.i; }); },
    draw(g, W, H, tsec, dt) {
      const frozen = menu ? 0 : dt;
      drawFight(g, W, H, fight, view, tsec, frozen, { overlay: (app.debug || boxes) ? (gg, w, h, camX) => drawBoxes(gg, camX, fight) : null });
      drawFightHUD(g, W, H, fight, tsec, {});
      panels(g, W, H, fight, tr);
      inputLog(g, H, fight.fighters[0]);
      if (tr.mode !== 'live') text(g, tr.mode === 'record' ? 'RECORDING THE DUMMY WITH YOUR CONTROLS  ' + (tr.rec.length / 60).toFixed(1) + ' S' : 'PLAYBACK', W / 2, 232, { scale: 1, align: 'center', color: tr.mode === 'record' ? '#FF6B6B' : '#7AF08A', outline: '#05060C' });
      if (gift.has('battle_pose') && !menu) drawPoseBtn(g, W, H, poseFlash);
      text(g, 'TAB: MENU    R: RESET' + (gift.has('battle_pose') ? '    P: POSE' : ''), W / 2, H - 12, { scale: 1, align: 'center', color: '#9FB0D8', outline: '#05060C' });
      if (menu) { g.save(); g.globalAlpha = 0.65; px(g, 0, 0, W, H, '#000000'); g.restore(); text(g, 'TRAINING', W / 2, 46, { scale: 3, align: 'center', color: '#FFE86A', outline: '#3A0A1E' }); drawMenu(g, items(), sel, W / 2, 80, 20, tsec, { w: 220 }); }
    },
    hint() { return 'TAB / ESC: TRAINING MENU   R: RESET   TAP UP / DOWN: SIDESTEP   LP+RP: THROW'; }
  };
}

function panels(g, W, H, fight, tr) {
  const me = fight.fighters[0], m = me.move || me.lastMove;
  panel(g, 4, 44, 156, 48);
  if (m) {
    text(g, m.name.slice(0, 22), 8, 48, { scale: 1, color: '#FFFFFF' }); text(g, cmdText(m).slice(0, 24), 8, 58, { scale: 1, color: '#9FB0D8' });
    text(g, m.height.toUpperCase() + '  I' + m.startup + '  ACT ' + m.active + '  REC ' + m.recovery, 8, 68, { scale: 1, color: '#FFE86A' });
    text(g, 'HIT ' + (m.launching ? m.reaction.toUpperCase() : advText(m.adv.hit)) + '   BLOCK ' + (m.h === 't' ? '--' : advText(m.adv.block)) + '   DMG ' + m.dmg, 8, 78, { scale: 1, color: '#C8D0F0' });
  } else text(g, 'PRESS A MOVE', 8, 62, { scale: 1, color: '#9FB0D8' });
  panel(g, W - 160, 44, 156, 48);
  text(g, 'DUMMY  ' + DUMMIES[tr.dummy], W - 156, 48, { scale: 1, color: '#55FFFF' });
  const v = tr.view;
  if (v.adv != null) text(g, advText(v.adv) + ' ON ' + v.kind, W - 156, 58, { scale: 2, color: v.adv > 0 ? '#7AF08A' : v.adv < 0 ? '#FF7A7A' : '#FFFFFF', outline: '#05060C' });
  else text(g, v.kind ? v.kind + '...' : 'ADVANTAGE: HIT SOMETHING', W - 156, 62, { scale: 1, color: '#9FB0D8' });
  const c = me.comboOut;
  if (c.hits > 0 && c.shown > 0) text(g, c.hits + ' HITS  ' + c.dmg + ' DMG  NEXT X' + Math.round(100 * (fight.fighters[1].comboIn.active ? Math.max(RULES.SCALING_MIN, RULES.SCALING[Math.min(c.hits, 9)]) : 1)) + '%', W - 156, 80, { scale: 1, color: '#FFD24A' });
}

function inputLog(g, H, f) {
  const hist = f.inp.hist, runs = [];
  for (let k = hist.length - 1; k >= 0 && runs.length < 9; k--) {
    const e = hist[k], last = runs[runs.length - 1];
    if (last && last.d === e.d && last.down === e.down) last.n++; else runs.push({ d: e.d, down: e.down, n: 1 });
  }
  g.save(); g.globalAlpha = 0.5; px(g, 2, H - 100, 62, 88, '#000000'); g.restore();
  runs.forEach((r, i) => {
    const y = H - 96 + i * 9, v = DIR[r.d];
    if (v) {
      const cx = 10, cy = y + 3, tx = cx + v[0] * 4, ty = cy + v[1] * 4, px0 = -v[1] * 2.5, py0 = v[0] * 2.5, bx = cx - v[0] * 2, by = cy - v[1] * 2;
      poly(g, [[tx, ty], [bx + px0, by + py0], [bx - px0, by - py0]], '#FFFFFF');
    } else px(g, 9, y + 2, 3, 3, '#6A7396');
    BTN.forEach((b, j) => { if (r.down & b[1]) text(g, b[0], 20 + j * 10, y, { scale: 1, color: b[2] }); });
    text(g, String(r.n), 60, y, { scale: 1, align: 'right', color: '#6A7396' });
  });
}

/* hurt boxes cyan, live hit boxes red along the height the move hits (high above, mid at the chest, low at the shin), projectiles as circles */
function drawBoxes(g, camX, fight) {
  const rect = (x0, y0, x1, y1, col) => { g.save(); g.globalAlpha = 0.9; line(g, x0, y0, x1, y0, 1, col); line(g, x0, y1, x1, y1, 1, col); line(g, x0, y0, x0, y1, 1, col); line(g, x1, y0, x1, y1, 1, col); g.restore(); };
  fight.fighters.forEach(f => {
    const base = GROUND_Y + zToYOffset(f.z) - f.y, h = f.crouch ? 58 : 92;
    rect(f.x - RULES.HURT_HALF, base - h, f.x + RULES.HURT_HALF, base, f.state === 'attack' ? '#FFAA40' : '#40C0FF');
    if (f.state === 'attack' && f.move && !f.move.proj) {
      const m = f.move, live = m.hits.some(hh => f.mf >= hh.f && f.mf <= hh.f + hh.n - 1), band = m.h === 'h' ? [86, 62] : m.h === 'm' ? [64, 38] : m.h === 'l' ? [26, 4] : [60, 20];
      rect(f.x, base - band[0], f.x + f.facing * (m.reach + RULES.HURT_HALF), base - band[1], live ? '#FF4040' : '#884040');
    }
    if (f.state === 'idle' || f.state === 'sidestep') { text(g, 'L' + f.lane, f.x - 4, base + 2, { scale: 1, color: '#9FB0D8' }); }
  });
  fight.projectiles.forEach(p => { const o = fight.fighters[p.owner], y = GROUND_Y + zToYOffset(LANE_Z[p.aim]) - (p.move.h === 'l' ? 12 : 52); rect(p.x - p.move.proj.r, y - p.move.proj.r, p.x + p.move.proj.r, y + p.move.proj.r, '#FF4040'); });
}
