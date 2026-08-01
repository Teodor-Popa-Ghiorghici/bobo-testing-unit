/* Render adapter (tech §5 Phase 1 deliverable 4) -- the ONLY new logic in
   the render layer. It maps an entity's belt-plane depth (z) to a y-offset
   and a draw order, and hands render.js/arena.js the exact numbers they
   already stamp sprites and effects with. draw.js, layer.js, sprite_*.js,
   palette.js and the pose system are untouched; this file is additive.

   Sim/render contract:
   - Reads ONLY `entity.x` and `entity.z` (the Transform component,
     fighter.js). Never reads or writes hp/state/ai/anything simulation-
     owned, and never mutates an entity.
   - The sim never imports this file and never reads its output back --
     z is purely a rendering concern (invariant 4: "the sim knows nothing
     about pixels"), which is why the pixels-per-world-unit constant below
     lives here and not in constants.js/arena_bounds.js alongside the
     bounds the sim also uses.
   - zToYOffset(Z_REST) === 0, so an entity that never touches the depth
     axis draws at exactly the y position it always has. */

import { ARENA_Z_MIN, ARENA_Z_MAX, Z_REST } from './constants.js';

export { Z_REST };

/* World units of depth per pixel of y-offset. At the extremes of the
   260-unit-deep belt plane (ARENA_Z_MIN/MAX, §Arena bounds) this puts a
   fighter roughly +/-36px from the ground line -- enough to read clearly
   on the 480x270 internal canvas without pushing a sprite off-stage. */
export const Z_TO_Y_SCALE = 0.4;

/* Farther from camera (larger z) -> smaller y (higher on screen, drawn
   first/behind). Nearer camera (smaller z) -> larger y (lower on screen,
   drawn last/in front). This is the one place that arithmetic happens;
   every caller (render.js, arena.js) goes through this resolver rather
   than reimplementing the projection inline. */
export function zToYOffset(z) {
  const clamped = Math.max(ARENA_Z_MIN, Math.min(ARENA_Z_MAX, z));
  return Math.round((Z_REST - clamped) * Z_TO_Y_SCALE);
}

/* Stable depth sort: farthest first (drawn behind) to nearest last (drawn
   in front). Entities sharing a depth keep the pre-Phase-1 x-based
   ordering as a tiebreak -- larger x drawn first/behind -- so two fighters
   at the shared resting depth (the common case until something actually
   uses the z axis) draw in exactly the order they always did. Takes any
   array of {x, z} entities -- it never assumes there are exactly two. */
export function depthSort(entities) {
  return entities.slice().sort((a, b) => {
    const dy = zToYOffset(a.z) - zToYOffset(b.z);
    return dy !== 0 ? dy : b.x - a.x;
  });
}

/* Camera target: the midpoint of the extremes of every entity's x
   position. With exactly two entities this is the same "midpoint of the
   fight" the camera has always tracked; with N entities (crowds, Phase 2+)
   it keeps the whole group framed without the camera needing to know how
   many fighters exist. */
export function cameraTargetX(entities) {
  let min = Infinity, max = -Infinity;
  for (const e of entities) {
    if (e.x < min) min = e.x;
    if (e.x > max) max = e.x;
  }
  return (min + max) / 2;
}
