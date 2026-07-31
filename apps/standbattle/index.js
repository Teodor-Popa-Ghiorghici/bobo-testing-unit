/* Stand Battle Arena — app entry. Ties data/combat/render/map together
   behind the TempleOS app contract (mount/unmount, ctx-only I/O). */

import { ACT1_MORIOH, ENEMIES, BOSS_KILLER_QUEEN, MODIFIERS, RUN_BUFFS, EVENTS, PAL } from './data.js';
import { createCombat } from './combat.js';
import { drawCombat } from './render.js';
import { drawMap, pickNode, drawEvent, pickChoice, drawRest, pickRestContinue } from './map.js';
import { drawTitle, drawComplete } from './scenes.js';
import { wireCombatAudio, sfxVictory, sfxDefeat, sfxActComplete } from './audio.js';
import { musicStart, musicSetIntensity, musicStop } from './music.js';

const W = 384, H = 216;
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  KeyJ: 'light', KeyK: 'medium', KeyL: 'heavy',
  Space: 'dodge', ShiftLeft: 'parry', ShiftRight: 'parry',
  KeyU: 'special', KeyI: 'rush'
};

export default {
  id: 'standbattle',
  title: 'STANDBATTLE.EXE',
  icon: 'assets/images/standbattle.png',
  width: 800,
  height: 540,
  resizable: true,

  async mount(root, ctx) {
    const _style = document.createElement('link');
    _style.rel = 'stylesheet';
    _style.href = 'apps/standbattle/style.css';
    root.appendChild(_style);

    const state = { scene: 'title', runState: null, combat: null, currentEvent: null };
    let shakeEnabled = await ctx.load('shakeEnabled');
    if (shakeEnabled == null) shakeEnabled = true;
    const cleared = !!(await ctx.load('cleared'));

    const pane = document.createElement('div');
    pane.className = 'gamepane sbpane';
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    cv.className = 'gamecv sbcanvas';
    cv.tabIndex = 0;
    pane.appendChild(cv);

    const bar = document.createElement('div');
    bar.className = 'appbar';
    const shakeBtn = document.createElement('button');
    shakeBtn.className = 'appbtn';
    const info = document.createElement('span');
    info.className = 'godword sbinfo';
    bar.appendChild(shakeBtn);
    bar.appendChild(info);

    root.appendChild(pane);
    root.appendChild(bar);

    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;

    function resize() {
      const availW = Math.max(W, pane.clientWidth || W * 2);
      const scale = Math.max(1, Math.floor(availW / W));
      cv.style.width = (W * scale) + 'px';
      cv.style.height = (H * scale) + 'px';
    }
    const ro = new ResizeObserver(resize);
    ro.observe(pane);
    resize();

    function updateShakeBtn() { shakeBtn.textContent = 'SHAKE: ' + (shakeEnabled ? 'ON' : 'OFF'); }
    updateShakeBtn();
    shakeBtn.addEventListener('mousedown', ev => {
      ev.stopPropagation();
      shakeEnabled = !shakeEnabled;
      if (state.combat) state.combat.juice.setShakeEnabled(shakeEnabled);
      ctx.save('shakeEnabled', shakeEnabled);
      updateShakeBtn();
      if (window.Snd) window.Snd.click();
    });

    function newRun() {
      state.runState = { hp: 100, maxHp: 100, nodeIndex: 0, buffs: [] };
      state.scene = 'map';
    }

    function startCombatForNode(node) {
      const opts = { shakeEnabled };
      let enemyDef;
      if (node.type === 'boss') { enemyDef = BOSS_KILLER_QUEEN; }
      else {
        enemyDef = ENEMIES[node.enemy];
        if (node.modifier) {
          const m = MODIFIERS[node.modifier];
          opts.speedMult = m.speedMult; opts.hpMult = m.hpMult; opts.tint = m.tint;
        }
      }
      const combat = createCombat(enemyDef, state.runState.buffs, opts);
      combat.player.hp = state.runState.hp;
      combat.player.maxHp = state.runState.maxHp;
      wireCombatAudio(combat);
      musicSetIntensity(1);
      state.combat = combat;
      state.scene = 'combat';
    }

    function resolveNodeEntry() {
      const node = ACT1_MORIOH.nodes[state.runState.nodeIndex];
      if (node.type === 'event') { state.currentEvent = EVENTS[node.event]; state.scene = 'event'; }
      else if (node.type === 'rest') { state.scene = 'rest'; }
      else startCombatForNode(node);
    }

    function advanceNode() {
      state.runState.nodeIndex++;
      state.scene = state.runState.nodeIndex >= ACT1_MORIOH.nodes.length ? 'complete' : 'map';
      musicSetIntensity(0);
      if (state.scene === 'complete') { ctx.save('cleared', true); sfxActComplete(); }
    }

    function applyEventChoice(idx) {
      const choice = state.currentEvent.choices[idx];
      if (choice.kind === 'heal') state.runState.hp = Math.min(state.runState.maxHp, state.runState.hp + choice.amount);
      else if (choice.kind === 'buff') state.runState.buffs.push(RUN_BUFFS[Math.floor(Math.random() * RUN_BUFFS.length)]);
      if (window.Snd) window.Snd.chirp();
      advanceNode();
    }

    function canvasXY(ev) {
      const r = cv.getBoundingClientRect();
      return { mx: (ev.clientX - r.left) * (W / r.width), my: (ev.clientY - r.top) * (H / r.height) };
    }

    function handleClick(ev) {
      const { mx, my } = canvasXY(ev);
      if (state.scene === 'title') { newRun(); if (window.Snd) window.Snd.open(); }
      else if (state.scene === 'map') {
        if (pickNode(mx, my, ACT1_MORIOH.nodes, W, H, state.runState) >= 0) {
          resolveNodeEntry();
          if (window.Snd) window.Snd.select();
        }
      } else if (state.scene === 'event') {
        const idx = pickChoice(mx, my, state.currentEvent, W, H);
        if (idx >= 0) applyEventChoice(idx);
      } else if (state.scene === 'rest') {
        if (pickRestContinue(mx, my, W, H)) {
          state.runState.hp = state.runState.maxHp;
          if (window.Snd) window.Snd.ok();
          advanceNode();
        }
      } else if (state.scene === 'combat' && state.combat.outcome !== 'fighting') {
        if (state.combat.outcome === 'win') {
          state.runState.hp = state.combat.player.hp;
          advanceNode();
        } else {
          state.scene = 'title';
        }
      } else if (state.scene === 'complete') {
        state.scene = 'title';
      }
    }

    function onKey(ev, down) {
      const action = KEYMAP[ev.code];
      if (!action) return;
      ev.preventDefault();
      ev.stopPropagation();
      if (state.scene === 'combat' && state.combat) state.combat.setKey(action, down);
    }
    cv.addEventListener('keydown', ev => onKey(ev, true));
    cv.addEventListener('keyup', ev => onKey(ev, false));
    cv.addEventListener('mousedown', ev => { ev.stopPropagation(); cv.focus(); handleClick(ev); });
    setTimeout(() => cv.focus(), 0);

    let raf = null, t0 = performance.now(), tsec = 0;
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(50, now - t0);
      t0 = now;
      tsec += dt / 1000;
      if (state.scene === 'combat') {
        const c = state.combat;
        c.update(dt);
        if (c.outcome === 'fighting') {
          const tense = c.player.hp / c.player.maxHp < 0.3 || (c.isBoss && c.enemy.phaseIndex > 0);
          musicSetIntensity(tense ? 2 : 1);
        } else if (!c._announced) {
          c._announced = true;
          musicSetIntensity(0);
          if (c.outcome === 'win') sfxVictory(); else sfxDefeat();
        }
        drawCombat(g, W, H, c, tsec);
      }
      else if (state.scene === 'map') drawMap(g, W, H, ACT1_MORIOH.nodes, state.runState, tsec);
      else if (state.scene === 'event') drawEvent(g, W, H, state.currentEvent);
      else if (state.scene === 'rest') drawRest(g, W, H, state.runState);
      else if (state.scene === 'title') drawTitle(g, W, H, tsec, cleared);
      else if (state.scene === 'complete') drawComplete(g, W, H, state.runState);
      info.textContent = state.scene === 'combat'
        ? 'A/D MOVE  J/K/L ATTACK  SPACE DODGE  SHIFT PARRY  U SPECIAL  I RUSH'
        : 'CLICK TO CONTINUE';
    }
    raf = requestAnimationFrame(frame);
    musicStart();
    musicSetIntensity(0);

    this._cleanup = () => { cancelAnimationFrame(raf); ro.disconnect(); musicStop(); };
  },

  unmount() { if (this._cleanup) this._cleanup(); }
};
