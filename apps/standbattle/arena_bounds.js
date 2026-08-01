/* Shared arena/world bounds -- single source of truth for the belt-plane
   extent so the sim (combat.js) and the camera (render.js) can never drift
   out of sync (tech audit §1.2 item #13). ARENA_MIN/MAX describe where an
   entity is allowed to stand on the x (lane) axis; WORLD_W is the full
   scrollable width the camera clamps against.

   Phase 1 (tech §2.3 / GDD §3.5) adds the z (depth) axis: ARENA_Z_MIN/MAX
   bound movement into/out of the screen on the 720x260 belt plane, and
   Z_REST is the default resting depth both fighters spawn at, so a fight
   with nobody touching the depth axis renders identically to before it
   existed (zToYOffset(Z_REST) === 0 -- see render_adapter.js). */

export const WORLD_W = 720;
export const WORLD_D = 260;
export const ARENA_MARGIN = 58;
export const ARENA_MIN = ARENA_MARGIN;
export const ARENA_MAX = WORLD_W - ARENA_MARGIN;

export const ARENA_Z_MARGIN = 40;
export const ARENA_Z_MIN = ARENA_Z_MARGIN;
export const ARENA_Z_MAX = WORLD_D - ARENA_Z_MARGIN;
export const Z_REST = (ARENA_Z_MIN + ARENA_Z_MAX) / 2;
