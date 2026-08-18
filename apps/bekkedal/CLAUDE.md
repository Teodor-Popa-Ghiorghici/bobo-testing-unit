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
- `layout_check.js` — `node apps/bekkedal/layout_check.js`. See below.

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

Tile art and sprites are still authored on the original 20px tile
(`BEK_T_SRC`). The playfield draws inside one `BEK_ART_SCALE` transform, so
every literal in `drawTile`, `drawSoil`, `drawIcon`, `person`, `bear` and
`goat` still means what it did at 480×300 and none of it had to be redrawn.
That is why those functions multiply by `BEK_T_SRC`, not `BEK_T`: inside the
transform they are working in source space. `BEK_T` is for camera and world
arithmetic outside it.

Phase 3 redraws the art at native density; when it does, `BEK_ART_SCALE` goes
to 1 and `BEK_T_SRC` becomes `BEK_T`. Until then the scale must stay a whole
number or the art stops landing on exact pixels.

## Checks

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
speaker" section's sibling drawing code: `drawTile`, `drawSoil`, `drawIcon`,
`person`, `bear`, `goat`, `panel`, `text`, and `draw` itself.

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
