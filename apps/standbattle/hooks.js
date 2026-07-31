/* Effect-hook dispatcher — §0/§14.2. Content (Arrows, evolutions, future
   enemies) registers listeners here instead of combat.js growing a bespoke
   branch per content item. Only a handful of listeners are registered today
   (in combat.js), but the seam is real: adding a new on-hit effect never
   requires touching the combat loop. */

export const HOOK_NAMES = [
  'onRunStart', 'onFloorStart', 'onHit', 'onKill',
  'onDamageTaken', 'onNodeClear', 'onRunEnd',
  'onDodgeSuccess', 'onParrySuccess', 'onMoveDenied',
  'onTelegraphStart', 'onPhaseTransition'
];

export function createDispatcher() {
  const listeners = {};
  HOOK_NAMES.forEach(h => { listeners[h] = []; });
  return {
    on(hook, fn) {
      if (!listeners[hook]) listeners[hook] = [];
      listeners[hook].push(fn);
    },
    off(hook, fn) {
      const arr = listeners[hook];
      if (!arr) return;
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    },
    fire(hook, payload) {
      const arr = listeners[hook];
      if (!arr) return;
      for (let i = 0; i < arr.length; i++) arr[i](payload);
    }
  };
}
