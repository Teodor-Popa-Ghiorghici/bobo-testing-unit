---
paths: ["apps/bekkedal/index.js"]
---

# Bekkedal engine

See `apps/bekkedal/CLAUDE.md` for the save-versioning rule (kept there in
full). This file carries the rest of the engine-level doctrine: the art
scale transform, autosave, and the checks that exercise the whole
engine/save system end to end.

### The art scale

Most tile art and sprites are still authored on the original 20px tile
(`BEK_T_SRC`). The playfield draws inside one `BEK_ART_SCALE` transform, so
every literal in the tile passes, `drawIcon`, `person`, `bear` and `goat` still
means what it did at 480×300 and none of it had to be redrawn. That is why
those functions multiply by `BEK_T_SRC`, not `BEK_T`: inside the transform
they are working in source space. `BEK_T` is for camera and world arithmetic
outside it.

The art uplift is converting this one piece at a time. Terrain went first:
the grass, cave, path and water-edge tiles and `drawSoil`'s `tilledSoil` now
draw in real `BEK_T` pixels instead of scaled-up `BEK_T_SRC` art. They still
run inside the tile passes (see **The terrain cache**), which still draw
everything else (trees, buildings, furniture, crops, sprites) in source space
under the shared transform — so each converted function opens with
`native()`, which cancels that transform for just its own fill. Converted and
unconverted code can sit side by side in the same pass this way: whichever
coordinate space a given `if (c === ...)` branch uses, both land on the same
device pixels, because `BEK_T === BEK_T_SRC * BEK_ART_SCALE`. A function that
has been converted must not multiply by `BEK_T_SRC` again.

Eventually every function converts and `BEK_ART_SCALE` goes to 1, at which
point `native()` becomes a no-op and can be retired along with `BEK_T_SRC`.
Until then the scale must stay a whole number or the art stops landing on
exact pixels.

## Checks

- `node scripts/smoke.mjs` (a headless 30-day run, save migration, and —
  cases 5/6 — a full simulated year run idle: Act II never unlocks itself
  with no player input, and a save seeded with it already unlocked never
  drifts a single field back).
- `node scripts/bekkedal_shots.mjs <out-dir>` — the shot matrix. Boots the
  real machine in Chromium, seeds a save per shot, and captures seventy-two
  960x540 frames: every map at morning, dusk and night, the mine with and
  without a lamp, a 1-bit threshold of the mine (an ore vein you cannot find
  in one bit is not a silhouette), both interiors, the shore laboratory, all
  five tools at each of the three swing phases, and every menu panel. It
  exits non-zero on *any* page error, which is the assertion that matters:
  a draw call that throws leaves a plausible-looking half-painted canvas,
  and it will not fail a check that only compares pixels.
- `node scripts/bekkedal_pairs.mjs <before> <after> <out>` — composes two
  runs of that matrix into labelled before/after pairs, grouped by which of
  the seven reported problems each is evidence for, plus a phase strip for
  the swing. No PNG is committed: the art is code, and a checked-in
  screenshot goes stale the first time somebody touches a ramp. The matrix
  is reproducible instead.
- `node scripts/bekkedal_savetest.mjs` — save compatibility, played rather
  than read. Runs the pre-change build until its own autosave writes a
  genuine blob, hands that exact blob to this build, and asserts it comes up
  without throwing, that every top-level field survives, that the day
  carries over, and that nothing transient (a swing, a particle list, the
  camera shake) has leaked *into* the save. Reading the migration code and
  concluding "yes" is not a test.

## Autosave

`autoSave()` runs every ~6 accumulated seconds of frame time (`autoT` in the
main `frame()` loop) and once more when the window unmounts (the `watch`
interval that detects the canvas leaving the DOM). It must stay wrapped in its
existing `try/catch` — `localStorage.setItem` can throw (quota, private
browsing) and that must never crash the frame loop. Never call `autoSave()` (or
anything that serializes `S`) from inside a multi-step state mutation before
it's finished — `S` is serialized synchronously and whole, so a save mid-mutation
would persist a half-applied action (e.g. currency deducted but item not yet
granted).
