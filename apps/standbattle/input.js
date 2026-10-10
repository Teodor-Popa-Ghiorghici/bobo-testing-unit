/* Devices (spec 4.3): the keyboard and the gamepad turned into the one integer per frame the sim reads (rules.js BIT), and into the few abstract events the menus use.
   Both are rebindable. With one human in the room player 1 takes both sides of the keyboard (and any pad).

   THE KEYS ARE FOR TWO HANDS. The left hand steers (W A S D) and the right hand fights, the four buttons laid out the way the arcade panel is and the way the limbs are:
   the hands on top, the feet below, left on the left: U (left punch) I (right punch) over J (left kick) K (right kick), under the index and middle fingers of the right
   hand's home row. It used to be F G over V B, right beside W A S D, so one hand had to steer and fight at once. Two people at one keyboard cannot each have two
   hands, so player 2 has the arrows and the number pad's 4 5 over 1 2, and SHARED_KEYMAP (a button on the controls screen) is the old one-hand-each split for a keyboard
   with no number pad.

   A key that goes down and up between two sim frames still counts for one frame (`sticky`), so a quick tap of up or down is a sidestep and not a lost input.
   Nothing here knows about a fight; scenes ask `bits(slot)` once per sim frame and read `nav` once per render frame. */

import { BIT } from './rules.js';

export const ACTIONS = ['left', 'right', 'up', 'down', 'LP', 'RP', 'LK', 'RK'];
const ACTION_BIT = { left: BIT.LEFT, right: BIT.RIGHT, up: BIT.UP, down: BIT.DOWN, LP: BIT.LP, RP: BIT.RP, LK: BIT.LK, RK: BIT.RK };

export const DEFAULT_KEYMAP = {
  p1: { KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down', KeyU: 'LP', KeyI: 'RP', KeyJ: 'LK', KeyK: 'RK' },
  p2: { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Numpad4: 'LP', Numpad5: 'RP', Numpad1: 'LK', Numpad2: 'RK' },
  pad: { 2: 'LP', 3: 'RP', 0: 'LK', 1: 'RK' }
};
/* two people, one keyboard, no number pad: each has one hand's worth of it. Player 1 steers and fights on the left, player 2 on the right. */
export const SHARED_KEYMAP = {
  p1: { KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down', KeyF: 'LP', KeyG: 'RP', KeyV: 'LK', KeyB: 'RK' },
  p2: { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', KeyK: 'LP', KeyL: 'RP', Comma: 'LK', Period: 'RK' },
  pad: DEFAULT_KEYMAP.pad
};
/* what the keys were before they were laid out for two hands: a save that holds exactly this was never changed by its owner (the controls screen writes the defaults down), so it gets the new ones */
const OLD_DEFAULT = { p1: SHARED_KEYMAP.p1, p2: SHARED_KEYMAP.p2 };
const same = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
export const PAD_DIR = { 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
const DEAD = 0.5;

export const keyLabel = c => (c || '').replace(/^Key/, '').replace(/^Arrow/, '').replace(/^Numpad/, 'NP').replace('Comma', ',').replace('Period', '.').replace('Semicolon', ';').replace('Slash', '/').replace('Space', 'SPC').toUpperCase();
/* the four buttons of one side of the keyboard as the player would say them, from the keys as they are bound now: "U I J K" */
export const buttonsOf = (map, slot) => ['LP', 'RP', 'LK', 'RK'].map(a => { const c = Object.keys(map[slot]).find(k => map[slot][k] === a); return c ? keyLabel(c) : '--'; }).join(' ');

function clone(o) { return JSON.parse(JSON.stringify(o)); }

export function createDevices(saved) {
  const map = clone(DEFAULT_KEYMAP);
  if (saved) ['p1', 'p2', 'pad'].forEach(k => { if (saved[k] && typeof saved[k] === 'object' && !(OLD_DEFAULT[k] && same(saved[k], OLD_DEFAULT[k]))) map[k] = Object.assign({}, saved[k]); });
  const held = [0, 0], sticky = [0, 0], padHeld = [0, 0], padPrev = [{}, {}], nav = [];
  let capture = null;
  const api = {
    map, nav,
    single: true,                       /* one human: player 1 answers to both sides of the keyboard */
    padCount: 0,
    pressCount: 0,                      /* every key or button that went down: the title's "press any key" */

    keyDown(code, repeat) {
      if (!repeat) api.pressCount++;
      if (capture) { const c = capture; capture = null; c(code); return true; }
      let used = false;
      ['p1', 'p2'].forEach((p, k) => {
        const a = map[p][code];
        if (!a) return;
        used = true;
        const slot = api.single ? 0 : k;
        if (!repeat) { held[slot] |= ACTION_BIT[a]; sticky[slot] |= ACTION_BIT[a]; }
        if (!repeat || a === 'up' || a === 'down' || a === 'left' || a === 'right') navFrom(a, p);
      });
      if (!used) {
        if (code === 'Enter' || code === 'Space') { nav.push({ k: 'confirm', who: 'p1' }); nav.push({ k: 'start', who: 'p1' }); used = true; }
        else if (code === 'Escape') { nav.push({ k: 'back', who: 'p1' }); nav.push({ k: 'pause', who: 'p1' }); used = true; }
        else if (code === 'Backspace') { nav.push({ k: 'back', who: 'p1' }); used = true; }
        else if (code === 'Tab') { nav.push({ k: 'tab', who: 'p1' }); used = true; }
        else if (code === 'KeyR') { nav.push({ k: 'reset', who: 'p1' }); }
        else if (code === 'KeyP') { nav.push({ k: 'pose', who: 'p1' }); }
      }
      return used;
    },
    keyUp(code) {
      ['p1', 'p2'].forEach((p, k) => {
        const a = map[p][code];
        if (a) held[api.single ? 0 : k] &= ~ACTION_BIT[a];
      });
    },
    /* once per render frame */
    poll() {
      const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? Array.prototype.slice.call(navigator.getGamepads()).filter(Boolean) : [];
      api.padCount = pads.length;
      padHeld[0] = padHeld[1] = 0;
      pads.slice(0, 2).forEach((pad, i) => {
        const slot = api.single ? 0 : (pads.length === 1 ? 0 : i), now = {};
        let bits = 0;
        for (const b in PAD_DIR) if (pad.buttons[b] && pad.buttons[b].pressed) { now[PAD_DIR[b]] = true; }
        const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
        if (ax < -DEAD) now.left = true; if (ax > DEAD) now.right = true; if (ay < -DEAD) now.up = true; if (ay > DEAD) now.down = true;
        for (const b in map.pad) if (pad.buttons[b] && pad.buttons[b].pressed) now[map.pad[b]] = true;
        if (pad.buttons[9] && pad.buttons[9].pressed) now.start = true;
        if (pad.buttons[8] && pad.buttons[8].pressed) now.select = true;
        ACTIONS.forEach(a => { if (now[a]) { bits |= ACTION_BIT[a]; if (!padPrev[i][a]) { sticky[slot] |= ACTION_BIT[a]; navFrom(a, 'p' + (slot + 1)); } } });
        if (ACTIONS.some(a => now[a] && !padPrev[i][a]) || (now.start && !padPrev[i].start)) api.pressCount++;
        if (now.start && !padPrev[i].start) { nav.push({ k: 'start', who: 'p' + (slot + 1) }); nav.push({ k: 'pause', who: 'p' + (slot + 1) }); nav.push({ k: 'confirm', who: 'p' + (slot + 1) }); }
        if (now.select && !padPrev[i].select) nav.push({ k: 'back', who: 'p' + (slot + 1) });
        padPrev[i] = now; padHeld[slot] |= bits;
        if (capture && Object.keys(now).some(a => !padPrev[i]._seen)) { /* pad capture is handled by captureButton */ }
      });
    },
    /* the integer for this slot's next sim frame */
    bits(slot) {
      const v = held[slot] | padHeld[slot] | sticky[slot];
      sticky[slot] = 0;
      return v;
    },
    padFaceButtonDown() {
      const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? Array.prototype.slice.call(navigator.getGamepads()).filter(Boolean) : [];
      for (const pad of pads) for (let b = 0; b < 8; b++) if (pad.buttons[b] && pad.buttons[b].pressed && !PAD_DIR[b]) return b;
      return -1;
    },
    popNav() { return nav.shift() || null; },
    clearNav() { nav.length = 0; },
    release() { held[0] = held[1] = sticky[0] = sticky[1] = 0; },
    /* rebinding: the next key pressed becomes `action` for `slot` ('p1' | 'p2'); the key leaves any other action it had */
    askKey(cb) { capture = cb; },
    cancelAsk() { capture = null; },
    bindKey(slot, action, code) {
      ['p1', 'p2'].forEach(p => { delete map[p][code]; });
      Object.keys(map[slot]).forEach(c => { if (map[slot][c] === action) delete map[slot][c]; });
      map[slot][code] = action;
    },
    bindPad(action, button) {
      Object.keys(map.pad).forEach(b => { if (map.pad[b] === action || Number(b) === button) delete map.pad[b]; });
      map.pad[button] = action;
    },
    reset() { const d = clone(DEFAULT_KEYMAP); map.p1 = d.p1; map.p2 = d.p2; map.pad = d.pad; },
    /* the one-hand-each keys for two people at a keyboard with no number pad (the pad's buttons are left as they are) */
    share() { const d = clone(SHARED_KEYMAP); map.p1 = d.p1; map.p2 = d.p2; },
    keyFor(slot, action) { const m = map[slot], c = Object.keys(m).find(k => m[k] === action); return c || null; },
    dump() { return clone(map); }
  };
  function navFrom(a, who) {
    if (a === 'up' || a === 'down' || a === 'left' || a === 'right') nav.push({ k: a, who });
    else if (a === 'LP') nav.push({ k: 'confirm', who });
    else if (a === 'RP' || a === 'RK') nav.push({ k: 'back', who });
    else if (a === 'LK') nav.push({ k: 'alt', who });
  }
  return api;
}
