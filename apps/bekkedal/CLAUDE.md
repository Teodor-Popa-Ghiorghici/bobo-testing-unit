# Bekkedal

## Running it locally

`npm start` (or `node server.js`) from the repo root, then open
`http://localhost:3000` and launch Bekkedal from the desktop. The app is loaded
through `kernel/registry.js`'s dynamic import, not opened as a standalone file —
there is no separate dev entry point for this app.

## File split

`data.js` holds only static content tables (items, crops, tools, maps, NPCs,
dialogue, quests) — no functions that mutate game state, no rendering, no DOM
access. `index.js` holds all engine and game logic: state, input, drawing,
audio, save/load. When adding content, it goes in `data.js`; when adding
behavior, it goes in `index.js`. Don't let either drift into the other.

## Save versioning

The save key is `BEK_SAVE` (`data.js`). The in-save schema version is the `ver`
field written by `fresh()` in `index.js`. `heal()` in `index.js` is the
migration function: it runs on every load and after `Object.assign(fresh(), ...)`
to backfill any field a stale save is missing. Any change to the shape of `S`
(new top-level field, new nested object, renamed key) must bump `ver` and add
a corresponding backfill line to `heal()` — a save from before the change must
still load without throwing.

## Canvas and tile coordinates

`BEK_T`, `BEK_COLS`, `BEK_ROWS` (`data.js`) define the tile size and the map
grid; `BEK_T * BEK_COLS` and `BEK_T * BEK_ROWS` must equal the canvas's
`width`/`height` (currently 480×300) — the comment on `BEK_T` calling this out
is load-bearing, not decorative. All map data in `BEK_MAPS.*.rows`, all NPC/goat
positions, and all per-tile state keys (`S.soil`, `S.felled`, `S.mined`,
`S.picked`, `S.drops`) are stored in tile coordinates (grid x/y), never pixels.
Multiplying by `BEK_T` happens only at draw time. If the canvas is ever resized
or upscaled, map/NPC/save data must not be touched — only the rendering
multiplier changes.

## Palette

All color must come from `VGA16` (`kernel/god.js`) through the local `C(index)`
helper — never a literal `rgb()`/hex string in a draw call. Any blended or
partial-coverage effect (weather overlay, day/night tinting, soil-wet shading)
must go through `dither()`/`ditherPat()`, which stipples between two `VGA16`
indices using the `DITHER` ordered-dither matrix — there is no alpha
compositing anywhere in this app. This applies to every function under "the
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
