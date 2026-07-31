/* Shared cross-cutting constants — Phase 0 foundation (tech audit §1.2
   item 13). Arena bounds already had a single source of truth in
   arena_bounds.js; this file re-exports them alongside every other
   number that must stay identical between the sim and the renderer, so
   new code has exactly one place to import from. */

export {
  ARENA_MIN, ARENA_MAX, ARENA_MARGIN, WORLD_W,
  WORLD_D, ARENA_Z_MIN, ARENA_Z_MAX, ARENA_Z_MARGIN, Z_REST
} from './arena_bounds.js';

/* The sim's fixed simulation rate (tech §5 Phase 1: sim_loop.js steps
   combat.js at exactly this rate). Every timer combat.js/ai.js/fighter.js
   own is now a whole frame count at this rate, not milliseconds. */
export const SIM_HZ = 60;
export const FRAME_MS = 1000 / SIM_HZ;

/* Ground line shared by render.js (sprite stamping) and arena.js (world
   furniture/particles). Previously the literal `208` was redeclared
   independently in both files with nothing tying them together. */
export const GROUND_Y = 208;

/* Enemy death-animation length, in frames (900ms). Shared between the sim
   (combat.js sets `enemy.deathTimer` to this) and the pose layer
   (pose_enemy.js reads it back to compute death-animation progress) so
   the two can't drift the way GROUND_Y/ARENA bounds used to. */
export const DEATH_ANIM_FRAMES = 54;
