/* Fixed 60Hz accumulator loop (tech §5 Phase 1 deliverable 1). Owns no
   canvas, DOM, or requestAnimationFrame reference -- it only turns
   variable real-world elapsed time into a whole number of fixed-size sim
   frames, so the simulation it drives is runnable headless (see
   headless_harness.js) and reproducible: the same sequence of real-dt
   `advance()` calls always yields the same number of `stepFn` calls in
   the same order, because a frame only ever fires once its full duration
   has accumulated. */

import { FRAME_MS } from './constants.js';

/* Guards against a "spiral of death": if the caller falls far enough
   behind (a long tab-switch pause, a debugger break) that whole seconds of
   frames would need to be replayed in one `advance()` call, drop the
   backlog instead of freezing the page trying to catch up. */
const MAX_FRAMES_PER_ADVANCE = 8;

export function createFixedStepLoop(stepFn, frameMs) {
  const step = frameMs || FRAME_MS;
  let acc = 0;
  let frame = 0;
  return {
    get frame() { return frame; },

    /* Feeds real elapsed milliseconds in. Calls stepFn(frame) once per
       whole frame that has accumulated, carrying any leftover fraction
       over to the next call. Returns how many frames were stepped. */
    advance(realDtMs) {
      acc += Math.max(0, realDtMs);
      let steps = 0;
      while (acc >= step && steps < MAX_FRAMES_PER_ADVANCE) {
        acc -= step;
        frame++;
        stepFn(frame);
        steps++;
      }
      if (steps === MAX_FRAMES_PER_ADVANCE) acc = 0;
      return steps;
    },

    /* Headless/testing entry point: steps exactly one frame, ignoring the
       real-time accumulator entirely. This is what headless_harness.js
       drives -- proof the sim needs no wall clock at all. */
    stepOnce() {
      frame++;
      stepFn(frame);
    }
  };
}
