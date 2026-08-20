# Bekkedal

## Running it locally

`npm start` (or `node server.js`) from the repo root, then open
`http://localhost:3000` and launch Bekkedal from the desktop. The app is loaded
through `kernel/registry.js`'s dynamic import, not opened as a standalone file —
there is no separate dev entry point for this app.

## File split

`data.js` holds only static content tables (items, crops, tools, maps, NPCs,
decor placements, treeline mixes, dialogue, quests) plus the geometry constants — no functions that mutate game
state, no rendering, no DOM access. `index.js` holds all engine and game logic:
state, input, drawing, audio, save/load. When adding content, it goes in
`data.js`; when adding behavior, it goes in `index.js`. Don't let either drift
into the other.

The detailed doctrine for every sibling file lives in one of three rule
files, loaded automatically when you touch the paths they declare:
`.claude/rules/bekkedal-art.md` (rendering/art), `.claude/rules/bekkedal-content.md`
(quests/seasons/crafting/Act II content), `.claude/rules/bekkedal-engine.md`
(index.js-level engine concerns). Full geometry ("Canvas, camera and tile
coordinates") lives in `bekkedal-art.md`.

## File map

- `font.js` — bitmap glyph table and metrics. See `.claude/rules/bekkedal-art.md`.
- `text.js` — glyph atlas / text layout helpers. See `.claude/rules/bekkedal-art.md`.
- `layout.js` — panel rectangles, padding, column offsets. See `.claude/rules/bekkedal-art.md`.
- `noise.js` — terrain variation field. See `.claude/rules/bekkedal-art.md`.
- `palette.js` — the sixty-four colours and the `MARKS`/`SHADOWS`/`FEATURES` contrast tables. See `.claude/rules/bekkedal-art.md`.
- `light.js` — hour-of-day palette transform, the lamp state a pool resolves toward, and the falloff. See `.claude/rules/bekkedal-art.md`.
- `lamp.js` — the local-light pass: an ordered dither between the picture at this hour and the picture in daylight. See `.claude/rules/bekkedal-art.md`.
- `surface.js` — glyph-to-palette-entry table per map. See `.claude/rules/bekkedal-art.md`.
- `autotile.js` — neighbour masks and rounded-union signed distance. See `.claude/rules/bekkedal-art.md`.
- `shore.js` — shoreline profile, surf, bank. See `.claude/rules/bekkedal-art.md`.
- `water.js` — deep water and its depth ramp. See `.claude/rules/bekkedal-art.md`.
- `rock.js` — the mountain and the ore (`oreKind`). See `.claude/rules/bekkedal-art.md`.
- `interior.js` — floorboards, volume, wear, house interior. See `.claude/rules/bekkedal-art.md`.
- `forest.js` — the treeline as a continuous strip. See `.claude/rules/bekkedal-art.md`.
- `fx.js` — the tool swing and its particles. See `.claude/rules/bekkedal-art.md`.
- `crops.js` — the ploughed plot; the one live (uncached) tile. See `.claude/rules/bekkedal-art.md`.
- `actors.js` — people, animals, item icons. See `.claude/rules/bekkedal-art.md`.
- `menus.js` — every panel drawn over the picture. See `.claude/rules/bekkedal-art.md`.
- `music.js` — five tunes and the crossfading scheduler. See `.claude/rules/bekkedal-art.md`.
- `ambience.js` — a bed per map, weather and the hour layered over it, positional hearth crackle, and material footsteps. See `.claude/rules/bekkedal-art.md`.
- `decor.js` — room prop kinds; placement lives in `data.js`'s `BEK_DECOR`. See `.claude/rules/bekkedal-art.md`.
- `quests.js` — the repeatable quest board. See `.claude/rules/bekkedal-content.md`.
- `seasons.js` — the seasonal layer (season/day-of-season/festival/weather). See `.claude/rules/bekkedal-content.md`.
- `progression.js` — money-sink formulas (`houseCost`, `houseTierCost`, `houseTierAvailable`, `barnSlots`). See `.claude/rules/bekkedal-content.md`.
- `layout_check.js` — `node apps/bekkedal/layout_check.js`. See `.claude/rules/bekkedal-art.md`.
- `tile_check.js` — `node apps/bekkedal/tile_check.js`. See `.claude/rules/bekkedal-art.md`.
- `palette_check.js` — `node apps/bekkedal/palette_check.js`. See `.claude/rules/bekkedal-art.md`.
- `quest_check.js` — `node apps/bekkedal/quest_check.js`. See `.claude/rules/bekkedal-content.md`.
- `season_check.js` — `node apps/bekkedal/season_check.js`. See `.claude/rules/bekkedal-content.md`.
- `act2_check.js` — `node apps/bekkedal/act2_check.js`. See `.claude/rules/bekkedal-content.md`.

## Hard invariants

- Colour only via `C(RAMP[i])` — "Never a literal `rgb()`/hex string in a
  draw call, and never a bare index either: the art says `C(GRASS[2])`, not
  `C(21)`." (full doctrine: **Palette**, `.claude/rules/bekkedal-art.md`)
- No alpha, ever: "There is no alpha compositing anywhere in this app and
  there must not be — no `globalAlpha`, no `rgba()`, no `ctx.filter`. A
  blend you cannot express as a stipple is a blend you may not use." (full
  doctrine: **No alpha, still**, `.claude/rules/bekkedal-art.md`)
- Every blend is an ordered dither via `dither()`/`ditherPat()`; every fill
  is an axis-aligned `fillRect` on integer coordinates. `lamp.js` is the one
  place that reads the `DITHER` matrix directly instead of through a stipple
  pattern — it dithers between two *pictures* rather than between a picture
  and a colour, so it cannot go through `ditherPat`. It is still whole pixels
  of one of two colours, with no alpha anywhere.
- `data.js` is content, `index.js` is behaviour (see File split above).
- Files stay under 300 lines (repo-wide rule, see root `CLAUDE.md`).

## Save versioning

The save key is `BEK_SAVE` (`data.js`). The in-save schema version is the `ver`
field written by `fresh()` in `index.js`. `heal()` in `index.js` is the
migration function: it runs on every load and after `Object.assign(fresh(), ...)`
to backfill any field a stale save is missing. Any change to the shape of `S`
(new top-level field, new nested object, renamed key) must bump `ver` and add
a corresponding backfill line to `heal()` — a save from before the change must
still load without throwing.

## Checks

Run all seven before claiming anything is done:

- `node apps/bekkedal/tile_check.js` — terrain variation field is
  deterministic, uniform and aperiodic. Full paragraph: `.claude/rules/bekkedal-art.md`.
- `node apps/bekkedal/layout_check.js` — geometry, camera clamp, text
  fitting in both languages. Full paragraph: `.claude/rules/bekkedal-art.md`.
- `node apps/bekkedal/palette_check.js` — ramps, contrast bands, and that
  the darkest hour still separates walkable from solid. Full paragraph:
  `.claude/rules/bekkedal-art.md`.
- `node apps/bekkedal/quest_check.js` — the repeatable board's templates
  agree with what the engine actually requires. Full paragraph:
  `.claude/rules/bekkedal-content.md`.
- `node apps/bekkedal/season_check.js` — 4 simulated years of the seasonal
  layer. Full paragraph: `.claude/rules/bekkedal-content.md`.
- `node apps/bekkedal/act2_check.js` — every Act II surface plus the balance
  pass. Full paragraph: `.claude/rules/bekkedal-content.md`.
- `node scripts/smoke.mjs` — headless 30-day run, save migration, and a
  full simulated year run idle. Full paragraph: `.claude/rules/bekkedal-engine.md`.

Also see `node scripts/bekkedal_shots.mjs <dir>` (the screenshot matrix),
`node scripts/bekkedal_pairs.mjs <before> <after> <out>` (before/after
composites), and `node scripts/bekkedal_savetest.mjs` (played-not-read save
compatibility) — full paragraphs in `.claude/rules/bekkedal-engine.md`.
