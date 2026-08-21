# Bekkedal

## Running it locally

`npm start` (or `node server.js`) from the repo root, then open
`http://localhost:3000` and launch Bekkedal from the desktop. The app is loaded
through `kernel/registry.js`'s dynamic import, not opened as a standalone file —
there is no separate dev entry point for this app.

## File split

`data.js` holds only static content tables (items, crops, tools, NPCs,
decor placements, treeline mixes, dialogue, quests) plus the geometry constants — no functions that mutate game
state, no rendering, no DOM access. Two of those tables outgrew it and are
re-exported from siblings rather than written out here. The dialogue is one:
`BEK_TALK` is four files of two characters each, grouped by where the two
stand — `talk_town.js`, `talk_water.js`, `talk_field.js`, `talk_stone.js` —
and the twenty-four heart events split the same way into `scenes_valley.js`
and `scenes_wild.js`, joined as `BEK_SCENES`. The maps are the other, but
eleven maps of forty-odd columns is more than one file should carry beside
all of that, so they live in three siblings and `data.js` re-exports
`BEK_MAPS` from them: `maps_valley.js` (the farm, the town, the water, the
meadow and the two rooms), `maps_wild.js` (the wood, the setra, the vidda,
the mine, the fjord) and `maps.js`, which joins the two halves and hangs
every seam between them off one declaration. `index.js` holds all engine and game logic:
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

- `maps_valley.js` — the four places on the valley floor, and the two rooms. Rows only.
- `maps_wild.js` — the five places past it. Rows only.
- `maps.js` — the seam table, and the one loop that turns it into both sides' `exits`.
- `font.js` — bitmap glyph table and metrics. See `.claude/rules/bekkedal-art.md`.
- `text.js` — glyph atlas / text layout helpers. See `.claude/rules/bekkedal-art.md`.
- `layout.js` — panel rectangles, padding, column offsets. See `.claude/rules/bekkedal-art.md`.
- `noise.js` — terrain variation field. See `.claude/rules/bekkedal-art.md`.
- `palette.js` — the sixty-four colours, the luminance ordering they are stated in, and `rampStep`. See `.claude/rules/bekkedal-art.md`.
- `palette_marks.js` — the `MARKS`/`SHADOWS`/`FEATURES` contrast tables: what may be drawn on what. Split off `palette.js` for the 300-line rule; the dependency runs one way, so import a colour from `palette.js` and a table from here. See `.claude/rules/bekkedal-art.md`.
- `light.js` — hour-of-day palette transform, the lamp state a pool resolves toward, and the falloff. See `.claude/rules/bekkedal-art.md`.
- `lamp.js` — the local-light pass: an ordered dither between the picture at this hour and the picture in daylight. See `.claude/rules/bekkedal-art.md`.
- `surface.js` — glyph-to-palette-entry table per map. See `.claude/rules/bekkedal-art.md`.
- `building.js` — the elevation of a house, authored once as a profile of a
  tile's vertical position inside its own building: the wall and its courses,
  the plinth, the windows, the door and the gable corners. See **The facade**,
  `.claude/rules/bekkedal-art.md`.
- `roof.js` — the other half of that profile, ridge to eave, plus the chimney
  and the one live thing a building has: its smoke. See **The facade**.
- `autotile.js` — neighbour masks and rounded-union signed distance. See `.claude/rules/bekkedal-art.md`.
- `shore.js` — shoreline profile, surf, bank. See `.claude/rules/bekkedal-art.md`.
- `water.js` — deep water and its depth ramp. See `.claude/rules/bekkedal-art.md`.
- `rock.js` — the mountain and the ore (`oreKind`). See `.claude/rules/bekkedal-art.md`.
- `interior.js` — floorboards, volume, wear, house interior. See `.claude/rules/bekkedal-art.md`.
- `forest.js` — the treeline as a continuous strip. See `.claude/rules/bekkedal-art.md`.
- `fx.js` — the tool swing and its particles. See `.claude/rules/bekkedal-art.md`.
- `crops.js` — the ploughed plot; the one live (uncached) tile. See `.claude/rules/bekkedal-art.md`.
- `actors.js` — people, animals, item icons. See `.claude/rules/bekkedal-art.md`.
- `portrait.js` — the eight faces. One head-and-shoulders rig with parameters
  per character out of `BEK_NPCS[].face`, three expressions each. See **The
  faces**, `.claude/rules/bekkedal-art.md`.
- `menus.js` — every panel drawn over the picture. See `.claude/rules/bekkedal-art.md`.
- `menus_talk.js` — the two panels a *conversation* puts up: the dialogue box
  with its portrait column and name plate, and the buy prompt that comes out
  of one of its lines. A sibling of `menus.js` for the 300-line rule, the same
  way `decor_outdoor.js` is one of `decor.js`. See **The faces**.
- `menus_chrome.js` — the materials the rest of `menus.js`'s panels are drawn
  out of instead of `panel()`'s flat black rectangle: planed timber and
  pinned paper for the board, cloth and leather for the bag, a counter and
  its slate for the shop, bare planks for the workshop, a routed sign for
  travel, a quiet dark card for sleep. See `.claude/rules/bekkedal-art.md`.
- `music.js` — five tunes and the crossfading scheduler. See `.claude/rules/bekkedal-art.md`.
- `ambience.js` — a bed per map, weather and the hour layered over it, positional hearth crackle, and material footsteps. See `.claude/rules/bekkedal-art.md`.
- `decor.js` — room prop kinds; placement lives in `data.js`'s `BEK_DECOR`. See `.claude/rules/bekkedal-art.md`.
- `decor_outdoor.js` — the farm/town/lake prop kinds, split out of `decor.js` purely for the 300-line rule and merged back into one `PROP` table there. See `.claude/rules/bekkedal-art.md`.
- `decor_wild.js` — the forest/vidda/setra/enga/fjord/gruva prop kinds, a second sibling for the same 300-line reason, merged into the same `PROP` table. See **Density**, `.claude/rules/bekkedal-art.md`.
- `wear.js` — the paths worn between the places people actually walk (door to field, road, pier, well), derived from a map's own landmark glyphs the same way `interior.js`'s `traceWear()` derives indoor wear. See `.claude/rules/bekkedal-art.md`.
- `quests.js` — the repeatable quest board. See `.claude/rules/bekkedal-content.md`.
- `seasons.js` — the seasonal layer (season/day-of-season/festival/weather). See `.claude/rules/bekkedal-content.md`.
- `schedule.js` — where everybody is: two to four named posts per NPC, and
  which one the clock (plus weather, season, a festival day, a story flag)
  currently puts them at. See `.claude/rules/bekkedal-content.md`.
- `scene.js` — the heart-event runner: whether one fires here and now, which
  beat is showing, where its cast stands, and what the world gets back when
  it ends. Pure, the way `schedule.js` is. See **Arcs and heart events**,
  `.claude/rules/bekkedal-content.md`.
- `talk_town.js`, `talk_water.js`, `talk_field.js`, `talk_stone.js` —
  `BEK_TALK`, two characters per file. Content only.
- `scenes_valley.js`, `scenes_wild.js` — `BEK_SCENES`, the twenty-four heart
  events. Content only.
- `progression.js` — money-sink formulas (`houseCost`, `houseTierCost`, `houseTierAvailable`, `barnSlots`). See `.claude/rules/bekkedal-content.md`.
- `layout_check.js` — `node apps/bekkedal/layout_check.js`. Also the dialogue
  box's two columns. See `.claude/rules/bekkedal-art.md`.
- `tile_check.js` — `node apps/bekkedal/tile_check.js`. See `.claude/rules/bekkedal-art.md`.
- `palette_check.js` — `node apps/bekkedal/palette_check.js`. See `.claude/rules/bekkedal-art.md`.
- `quest_check.js` — `node apps/bekkedal/quest_check.js`. See `.claude/rules/bekkedal-content.md`.
- `season_check.js` — `node apps/bekkedal/season_check.js`. See `.claude/rules/bekkedal-content.md`.
- `act2_check.js` — `node apps/bekkedal/act2_check.js`. See `.claude/rules/bekkedal-content.md`.
- `world_check.js` — `node apps/bekkedal/world_check.js`. The valley as one walkable thing: seams, flood fills, and everything placed by coordinate.

## Hard invariants

- Colour only via `C(RAMP[i])` — "Never a literal `rgb()`/hex string in a
  draw call, and never a bare index either: the art says `C(GRASS[2])`, not
  `C(21)`." Art that is handed a colour rather than naming one shades it with
  `rampStep` (`palette.js`), which returns the surface's own ramp neighbour
  and is therefore inside the band by construction. (full doctrine:
  **Palette**, `.claude/rules/bekkedal-art.md`)
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
field written by `fresh()` in `index.js` — currently **13**, which added
`S.yst`/`S.xpDay` (what the player did yesterday, and the mark today is
measured from) for the chat lines gated on it. A heart event adds no field of
its own: it is one-shot through `S.seen['sc:' + id]`, and its run object is
transient and must never be serialised. `heal()` in `index.js` is the
migration function: it runs on every load and after `Object.assign(fresh(), ...)`
to backfill any field a stale save is missing. Any change to the shape of `S`
(new top-level field, new nested object, renamed key) must bump `ver` and add
a corresponding backfill line to `heal()` — a save from before the change must
still load without throwing.

## Checks

Run all ten before claiming anything is done:

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
- `node apps/bekkedal/schedule_check.js` — a simulated year of every NPC's
  schedule: every post is a real, standable tile; each NPC's default posts
  cover the full day with no gap and no overlap; across a year, every hour,
  every weather and both story-flag states, nobody resolves to a solid tile
  and no two NPCs ever share one; every shopkeeper stays on their own map
  through their stated hours; every festival day gathers all eight on the
  festival's own map at eight distinct tiles; and no heart event is ever
  played over somebody merely keeping their own hours. Full paragraph:
  `.claude/rules/bekkedal-content.md`.
- `node apps/bekkedal/act2_check.js` — every Act II surface, the balance
  pass, and a sweep of all ~190 chat gates across every weather, season, hour
  and festival state: none throws, and no NPC is ever left with nothing to
  say. Full paragraph: `.claude/rules/bekkedal-content.md`.
- `node apps/bekkedal/world_check.js` — the valley joins up: every seam is
  paired tile for tile and gated only on the way in, every map is one
  walkable piece, every place is reached from the farm without the travel
  menu, and nobody and nothing placed by coordinate — the eight who talk,
  the goats, the room props, the pens, the field expansions, the finished
  house, every heart event's cast and the square it stands the player on, the
  menu's own landing squares — stands in a wall or on the water.
  This is the check that a map edit is most likely to break.
- `node scripts/smoke.mjs` — headless 30-day run, save migration, a full
  simulated year run idle, and a heart event played end to end through the
  real frame loop from a save seeded at friendship 4. Full paragraph: `.claude/rules/bekkedal-engine.md`.
- `node scripts/lint-content.mjs` — the static content conventions: real item
  ids, sane friendship gates, real travel destinations, and — since the
  dialogue box grew a name plate — that no spoken line repeats the speaker's
  name and that every mood a line asks for is a face `portrait.js` has. Full
  paragraph: `.claude/rules/content.md`.

Also see `node scripts/bekkedal_shots.mjs <dir>` (the screenshot matrix),
`node scripts/bekkedal_pairs.mjs <before> <after> <out>` (before/after
composites), and `node scripts/bekkedal_savetest.mjs` (played-not-read save
compatibility) — full paragraphs in `.claude/rules/bekkedal-engine.md`.
