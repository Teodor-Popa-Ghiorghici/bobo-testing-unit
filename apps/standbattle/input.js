/* Input — Phase 0 foundation. Owns the rebindable keymap (persisted
   through save.js) and classifies every mapped action as edge-triggered
   (fires once on key-down; combat/dodge/parry buttons) or held-triggered
   (state matters every frame it's down; movement), explicitly rather than
   by convention. Also keeps a ring buffer of (action, frame) for future
   debugging/replay use.

   This does NOT change combat feel: every raw down/up transition for a
   mapped action is still forwarded to the caller exactly as before, so
   combat.js's own edge-detection and buffering (tech audit items #1/#2)
   are untouched. The edge/held classification and ring buffer here are
   bookkeeping layered on top, not a new gate. Step charges and buffer
   tuning are explicitly out of scope -- both belong to Phase 2, once the
   frame-data resolver exists. */

export const DEFAULT_KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'forward', KeyW: 'forward', ArrowDown: 'back', KeyS: 'back',
  KeyJ: 'light', KeyK: 'medium', KeyL: 'heavy',
  Space: 'dodge', ShiftLeft: 'parry', ShiftRight: 'parry',
  KeyU: 'special', KeyI: 'rush', KeyG: 'guard'
};

/* forward/back (tech §5 Phase 1) move on the belt plane's z (depth) axis
   exactly like left/right move on x -- held-triggered locomotion, not an
   attack, so it goes through the same edge/held split as movement always
   has rather than needing a new kind of input. Guard (GDD §3.7, Phase 2)
   is held the same way -- it matters every frame it's down, not on press. */
export const HELD_ACTIONS = new Set(['left', 'right', 'forward', 'back', 'guard']);
export const EDGE_ACTIONS = new Set(['light', 'medium', 'heavy', 'special', 'rush', 'dodge', 'parry']);

const RING_SIZE = 64;

export function createInputSystem(savedKeymap) {
  const keymap = Object.assign({}, DEFAULT_KEYMAP, savedKeymap || {});
  const heldState = {};
  const ring = [];
  let frame = 0;

  return {
    keymap,

    /* Advances the frame counter the ring buffer timestamps against. Call
       once per render tick. This is a wall-clock frame count, not yet the
       fixed-60Hz sim frame constants.js reserves -- that link is Phase 2. */
    tick() { frame++; },
    getFrame() { return frame; },
    getRingBuffer() { return ring.slice(); },

    rebind(code, action) { keymap[code] = action; },

    kindOf(action) {
      if (EDGE_ACTIONS.has(action)) return 'edge';
      if (HELD_ACTIONS.has(action)) return 'held';
      return null;
    },

    /* Maps a physical key event to an action and records edge activations.
       Returns { action, kind, down } for every mapped key, or null for an
       unmapped one. Callers still receive every down/up transition -- this
       never drops or gates input, it only classifies and logs it. */
    resolveKey(code, down) {
      const action = keymap[code];
      if (!action) return null;
      const kind = this.kindOf(action);
      const was = heldState[action];
      heldState[action] = down;
      if (kind === 'edge' && down && !was) {
        ring.push({ action, frame });
        if (ring.length > RING_SIZE) ring.shift();
      }
      return { action, kind, down };
    }
  };
}
