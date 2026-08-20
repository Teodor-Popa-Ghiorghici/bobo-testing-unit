---
paths: ["apps/bekkedal/index.js", "apps/bekkedal/data.js", "apps/bekkedal/layout_check.js"]
---

# Bekkedal engine

See `apps/bekkedal/CLAUDE.md` for the save-versioning rule (kept there in
full). This file carries the rest of the engine-level doctrine: the art
scale transform, per-map dimensions and the camera, what one terrain rebuild
covers, autosave, and the checks that exercise the whole engine/save system
end to end.

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

## Maps are not one size

`BEK_COLS` and `BEK_ROWS` are gone. A map is as big as its own rows —
`mapCols(id)` is `rows[0].length`, `mapRows(id)` is `rows.length`, and
`mapW`/`mapH`/`camMaxX`/`camMaxY` (all `data.js`) derive from those. Nothing
declares a size beside the content it describes, so a map cannot claim one it
does not have and no existing map needed editing when the ceiling came off.

`BEK_MIN_COLS` x `BEK_MIN_ROWS` (24x15) is the floor, and it is not
arbitrary: 24 tiles is exactly the 960px canvas and 15 tiles is 600px against
the 480px viewport, so the smallest legal map is one screen wide with the
vertical overhang the camera has always had. `layout_check.js` holds every
map to it, and to two other things — that its rows are rectangular (a short
row reads as `'T'` past its end and puts a wall through the middle of a
field), and that its own camera clamp range is exactly its own overhang.

**Anything that walks the grid asks the map it is drawing.** `index.js` keeps
`COLS()`/`ROWS()` for the current map and hoists them into locals before a
loop; anything reading a square on a map that may not be the one you are
standing on (`dropAt`, the sprinkler's neighbours) asks about that map by
name. The art siblings that keep whole-map fields — `water.js`'s depth,
`shore.js`'s masks, `rock.js`'s vein distance, `interior.js`'s boards and
wear, `forest.js`'s band — take `A.cols()`/`A.rows()` in `prepare()` and
stride their arrays by what they read there, so a stale stride is not
expressible. What did *not* change is the coordinate system: every row
string, NPC and goat position and per-tile key in `S.soil`/`S.felled`/
`S.mined`/`S.picked`/`S.drops` is still a grid coordinate, and no save field
moved.

### The camera scrolls on both axes

`camTrack()` is one expression (`track`) applied twice. It centres the
viewport on the player's tile and clamps at **both** ends, which is what
welds the outermost rows and columns to the frame instead of letting blank
space creep in past the edge of the world. That was always the vertical
behaviour; horizontally the travel used to be `max(0, 960 - 960)` and so was
always zero — the camera was never unable to scroll, no map had ever been
wider than the screen. Do not write a second clamp for a second axis.

The strike-frame shake is still applied *after* the clamp, so it can nudge
the frame a pixel free for a moment.

### One rebuild covers a region, not a map

The terrain cache canvas is sized to the current map and its dimensions are
part of the cache key. The rebuild itself is proportional to area, and that
is what made the ceiling worth taking off carefully. Measured warm on this
container, at dusk, median of six real rebuilds (the light key turns over
about ten times in four seconds there, so no sample needs a forced key or a
`fillRect` wrapper on it):

| map                  | rebuild | rects  |
|----------------------|---------|--------|
| farm 24x15           | 13.4ms  |  8587  |
| lake 24x15           | 10.1ms  | 10553  |
| 48x30, whole map     | 42-50ms | 26011  |
| 48x30, region        | 16-20ms | 7664-12974 |

A 48x30 map is four times the area and rasterising all of it measured
**42-50ms against a 30ms budget** — a dropped frame every time the light key
turned over, and 26,011 rects against a 25,000 ceiling. So a rebuild covers
only the tiles the camera can see plus `REGION_MARGIN`, snapped outward to a
whole number of `REGION_SNAP` tiles (`index.js`, both 4). That measured
**16-20ms and 7,664-12,974 rects** on the same map — in line with the maps
that shipped.

Four things make that safe, and all four are load-bearing:

- **The region always contains the viewport**, so what lies outside it is a
  previous rebuild's pixels and is never on screen. Nothing has to be cleared
  beyond the region.
- **The snap is what stops a step being a rebuild.** The region turns over
  when the camera leaves it, which is every `REGION_SNAP` tiles at worst
  rather than every tile. That is the trade this makes: a big map pays a
  ~16-20ms rebuild about every four tiles walked instead of a 45ms one every
  time the light changes. Both halves of it are why the two constants are
  worth measuring again if you move either.
- **A skirt of one tile is rasterised past the region**, because a detail is
  allowed to hang over into the next tile and the region's own border would
  otherwise lose what should have reached into it. `forest.js` allows two
  tiles (`SLOP`), because a tree is drawn upward from its foot and the
  tallest `LAYERS` can ask for is 54px.
- **The light pass is clipped to the region.** Not for cost — the transform
  it applies is affine on the pixels it finds, so running it twice over the
  same pixels would resolve them twice.

`forest.js`'s `band()` still walks its whole length whatever stretch is being
rebuilt, and skips only the *drawing*. A band that decided where its trees
stood from where the rebuild started would grow a different wood every time
you walked. The same rule applies to anything else placed off a stream
indexed along a band.

The whole-map fields (`shore`/`water`/`rock`/`interior`/`forest`'s
`prepare()`) are keyed *without* the region, so walking across a big map does
not relay every floorboard.

**Every map that fits inside viewport-plus-margin resolves to its whole
self** — which is all eleven of the maps that shipped — so the region drops
out of the key as a constant and they rebuild exactly what they always did,
in the same order. That is what let this whole change be verified as a no-op.

### Verifying a change to any of this is a no-op

`scripts/bekkedal_shots.mjs` drives the real app on wall time: rAF
timestamps, the game clock (four in-game minutes a real second) and
`Math.random` all advance by however long the machine took. **48 of its 72
shots differ run to run with identical code**, so `cmp` between two runs of
it proves nothing on its own. Establish the run-to-run noise first, or pin
the clock: an `addInitScript` that queues rAF callbacks and hands them a
counter-driven timestamp, plus a seeded `Math.random`, makes all 72 byte
-identical across runs and turns the comparison into a real oracle. Under
that harness this change was verified 72/72 byte-identical against HEAD.

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
