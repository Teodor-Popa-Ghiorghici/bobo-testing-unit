# Bekkedal

## Running it locally

`npm start` (or `node server.js`) from the repo root, then open
`http://localhost:3000` and launch Bekkedal from the desktop. The app is loaded
through `kernel/registry.js`'s dynamic import, not opened as a standalone file —
there is no separate dev entry point for this app.

## File split

`data.js` holds only static content tables (items, crops, tools, maps, NPCs,
dialogue, quests) plus the geometry constants — no functions that mutate game
state, no rendering, no DOM access. `index.js` holds all engine and game logic:
state, input, drawing, audio, save/load. When adding content, it goes in
`data.js`; when adding behavior, it goes in `index.js`. Don't let either drift
into the other.

Four siblings carry what used to be tangled into the draw calls:

- `font.js` — the 5x8 bitmap glyph table and its metrics. Uppercase sits on the
  row-6 baseline, lowercase x-height runs rows 2-6 on the same baseline, and the
  five descenders (`g j p q y`) use row 7. `FONT_SM` and `FONT_LG` are integer
  scale factors, not separate art, so every glyph pixel lands on a whole screen
  pixel. Covers all printable ASCII plus `Å Æ Ø å æ ø — ’ · −`; anything missing
  draws as a hollow box rather than vanishing.
- `text.js` — `createText(g, C)` returns `text`/`textW`/`textCols`/`wrapText`.
  Glyphs come from a prerendered atlas, one canvas per colour and size. `y` is
  the TOP of the glyph cell, not a baseline.
- `layout.js` — every panel rectangle, padding and column offset, derived from
  the geometry in `data.js` and the metrics in `font.js`. Nothing in here is a
  measured pixel.
- `noise.js` — every "which tuft, what colour, where does the grit sit"
  decision the terrain art makes. Pure functions of `(mapId, x, y)`; no state,
  nothing seeded, nothing saved. See **Terrain variation** below.
- `layout_check.js` — `node apps/bekkedal/layout_check.js`. See below.
- `tile_check.js` — `node apps/bekkedal/tile_check.js`. See below.

## Why the font is a bitmap

Text used to be `ctx.fillText` at `'10px monospace'`, so the advance width was
whatever the browser decided (~6.02px) and every column stop in the HUD and the
menus was hand-tuned to it. Nothing outside a browser could tell whether a
string fit its box — and one dialogue line did not: the longest overran the box
by about twenty characters, silently, because `text()` never wrapped.

With an integer advance the question is arithmetic. `layout_check.js` asserts
that every box holds the longest string the content tables can put in it, in
both languages, before the game runs. If you add a longer item name, a longer
quest title or a longer UI string, that script is what tells you. Size a box
from its content (see `SLEEP_W`, `OFFER_W`) rather than from a guessed cell
count whenever the content is fixed and knowable.

## Save versioning

The save key is `BEK_SAVE` (`data.js`). The in-save schema version is the `ver`
field written by `fresh()` in `index.js`. `heal()` in `index.js` is the
migration function: it runs on every load and after `Object.assign(fresh(), ...)`
to backfill any field a stale save is missing. Any change to the shape of `S`
(new top-level field, new nested object, renamed key) must bump `ver` and add
a corresponding backfill line to `heal()` — a save from before the change must
still load without throwing.

## Canvas, camera and tile coordinates

The canvas is 960×540 (16:9) and the map is 24×15 tiles at `BEK_T` 40, so the
world is 960×600. Horizontally that is an exact fit and the camera never
scrolls; vertically the valley overhangs the 480px viewport by
`BEK_CAM_MAX_Y` (120px), so the camera follows the player down and **clamps at
both ends**. Clamping is what keeps the top and bottom map rows welded to the
frame instead of letting blank space creep in past the edge of the world —
`layout_check.js` and the camera assertions exist to keep it that way.

The 540px height is two 30px HUD bands (`BEK_HUD_H`) with a 480px viewport
between them. The bands are reserved chrome outside the playfield: the status
strips no longer sit on top of the first and last rows of the map, and weather
and night overlays are clipped to the viewport so the HUD keeps full contrast
after dark.

All map data in `BEK_MAPS.*.rows`, all NPC/goat positions, and all per-tile
state keys (`S.soil`, `S.felled`, `S.mined`, `S.picked`, `S.drops`) are stored
in tile coordinates (grid x/y), never pixels. **The map grid is 24×15 and does
not change with the resolution.**

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

## Terrain variation

`noise.js` owns it. One avalanching integer hash, `hash(x, y, ch)`, replaces
what used to be two linear seeds (`(x*7+y*13)%5` and `(x*31+y*17)%7`, plus
`(x*5+y*3)%3` inside the fir). Linear seeds repeat on a lattice: step (6, 1)
and all three came back to the value they had, so the maps laid down diagonal
bands of identical tiles — a cave wall was a visible grid of one stamped
stone. Look at any wide shot of the gruva before and after if you want to see
what that cost.

Three things follow from the hash, and adding terrain detail means using
them rather than writing arithmetic on x and y:

- **Channels.** `ch` selects an independent stream, and every decision gets
  its own: a mark's x, its y and its colour are three channels, not one
  number shared three ways. A tile should be making four to six uncorrelated
  choices. Channels are declared in the recipe tables at the bottom of
  `noise.js` and nowhere else — `channels()` returns them and `tile_check.js`
  tests exactly what that returns, so a stream drawn from but not declared is
  a stream nothing checks.
- **A per-map salt.** `mapSalt(mapId)` shifts the whole channel space, so the
  same grid square is not the same tuft of grass in all eleven maps.
- **`spot(i, span, size)`** (in `index.js`) turns a step index into a
  position, spreading `JIT` steps across all the room the mark's own size
  leaves it. Marks jitter on both axes, over the whole tile. A decorative
  mark at a literal offset is the bug this replaced.

Above that sits a second, coarser frequency, so the map has regions and not
just texture — a drier corner of a field, a mossy run of cave wall, ground
that stays wet in a hollow:

- `hLow`/`hLowV` hash the cell a tile falls in rather than the tile, at
  period 4 or 8. Use these for how *often* a sparse one-pixel mark appears,
  where the cell edge is invisible.
- `patchAmt` interpolates the same cell hashes and returns an ordered-dither
  strength, so the patch **paints** and its edge feathers out through
  `ditherPat()` — the same stipple as the night overlay, which is the only
  way this game blends. `PATCH` in `noise.js` declares each field's channel,
  period and how hard it may push. Keep those numbers low: the dry field
  first went in at 7 and whole corners of the valley stopped reading as
  grass. Note also that `patchAmt` rounds with a per-tile offset rather than
  to nearest — rounding to nearest puts each step in strength on an exact
  contour of a smooth field, which comes out as a straight line drawn across
  the map.

## The terrain cache

`tileGround`, `tileDetail` and `tileLive` replace the old single `drawTile`.

`tileGround` fills a tile's ground and stops. `tileDetail` then runs over the
whole map *afterwards*, which is the point of the split: a detail may hang
over into the next tile without that tile's ground painting it out a moment
later. Both render into `terrCv`, an offscreen canvas the size of the whole
map (`BEK_MAP_W` x `BEK_MAP_H`, device pixels, so nothing that has already
converted to native resolution loses half of it), and `draw` blits that at
1:1 before it applies the art transform.

The cache key is everything the two static passes read: `S.map`, `S.day`
(felled/mined/picked all expire against it), `S.built`, and `terrBump`, a
counter. **Any new mutation of `S.felled`, `S.mined` or `S.picked` must call
`terrDirty()`**, or the ground will keep showing a tree you just felled until
something else happens to change the key.

`tileLive` is what is left: the glyphs whose art reads the clock — `W` and
`~` water and the `v` hearth — redrawn on top every frame from the
`terrLive` list the rebuild collects. `drawSoil` stays its own live second
pass. Anything new that animates goes in `tileLive` and gets its glyph added
to `LIVE`; anything static goes in the cached passes and costs nothing per
frame.

This is what makes per-tile detail affordable. Terrain rasterising went from
3102 `fillRect`s every frame (8.6 per tile, 360 tiles, sixty times a second)
to 28, with a ~7800-rect rebuild only when the key changes — so a tile can
spend 20-60 rects on looking like something.

## Checks

- `node apps/bekkedal/tile_check.js` — the terrain variation field. Asserts
  it is deterministic across a reload (a second process recomputes it and the
  digests must match — terrain is never saved, so a field that drifted would
  be a different valley every time you walked into it), that every declared
  channel is within 20% of flat, that no lag within eight tiles in any
  direction repeats a tile's decisions more often than chance, and that two
  tiles of a kind agreeing on *everything* stay at least three tiles apart.
  The periodicity section is the one that earns its keep: it scores the old
  linear seeds at 1.0 — a total repeat — at lag (6, 1). Uniformity is pooled
  across all eleven maps on purpose; one 24x15 grid is 360 samples, and split
  nine ways 20% is 1.6 standard deviations, which a perfectly good hash fails
  about half the time. Run it after touching `noise.js` or any tile art that
  draws from it.
- `node apps/bekkedal/layout_check.js` — geometry invariants (canvas, viewport,
  camera clamp range, every panel on screen, all 11 maps still 24×15), the
  fishing reel zone's agreement with its hit test, and text fitting for every
  box in both languages. Run it after touching `data.js` geometry, `font.js`,
  `layout.js`, or any content table with user-visible strings.
- The reel zone is the subtle one. `tickFish` compares `fish.pos` against
  `z0`/`z1` in 0..1 and knows nothing about pixels; the drawn zone and the drawn
  needle are both `FISH_TRACK_W` multiplied by those same figures, and both
  edges of the zone are rounded the same way the needle is. Round the zone's
  *width* separately and the drawn zone drifts a pixel off the real one, so the
  player misses a catch that looked like a hit.

## Palette

All color must come from `VGA16` (`kernel/god.js`) through the local `C(index)`
helper — never a literal `rgb()`/hex string in a draw call. Any blended or
partial-coverage effect (weather overlay, day/night tinting, soil-wet shading)
must go through `dither()`/`ditherPat()`, which stipples between two `VGA16`
indices using the `DITHER` ordered-dither matrix — there is no alpha
compositing anywhere in this app. The stipple cell is drawn at
`BEK_DITHER_PX` (`BEK_DITHER_CELL * BEK_ART_SCALE`), not one device pixel: left
at 1px it would halve in apparent size and the night overlay would read as flat
grey instead of dither. The coarser pattern is also the faster one — the
rasteriser repeats it fewer times across the canvas — so the full-screen
fog-plus-night composite costs about 0.59ms at 960×540, against 0.31ms for the
old 480×300 build at a third of the pixels. This applies to every function under "the
speaker" section's sibling drawing code: `tileGround`, `tileDetail`,
`tileLive`, `drawSoil`, `drawIcon`, `person`, `bear`, `goat`, `panel`, `text`,
and `draw` itself. `wash()` is the patch-shaped case of it — it is
`ditherPat` clipped to a rect, and it must be called outside a `native()`
block, never inside one, because it opens its own.

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
