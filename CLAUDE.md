# TempleOS Module System

## The App Contract
Every app is a module with a default export shaped exactly like this:

```js
export default {
id: 'terminal', // matches the folder name
title: 'TERMINAL.EXE', // window title bar text
icon: 'assets/images/terminal.png',
width: 640,
height: 480,
resizable: true,

// Called when a window is opened. `root` is an empty <div> inside the window body.
mount(root, ctx) {},

// Called when the window closes. Must remove every timer, interval,
// requestAnimationFrame loop, and listener attached to window/document.
unmount() {}
};
```

## The ctx API
`ctx` is the only channel between an app and the rest of the system. An app must never import from kernel/, never touch document.body or window globals belonging to other apps, and never reach into another app's DOM.

```js
ctx.fs.read(path) // -> Promise<Blob|string|null>
ctx.fs.write(path, data) // -> Promise<void>
ctx.fs.list(dir) // -> Promise<string[]>
ctx.fs.remove(path) // -> Promise<void>
ctx.save(key, value) // -> Promise<void> app-scoped settings/progress
ctx.load(key) // -> Promise<any>
ctx.openWindow(appId) // launch another app
ctx.close() // close this app's own window
```

## CSS Variables from theme.css
Not all extracted yet, but typically `#FFFFFF`, `#AAAAAA`, `#555555`, `#FFFF55` etc. (Standard 16-color CGA/VGA palette).

The machine's base rule is that all colour comes from `VGA16` (`kernel/god.js`) and nothing is antialiased. Two apps are explicit, user-requested exceptions to the colour half of it — `standbattle` and `bekkedal` — and both are described in the Apps list below. Neither is an exception to the no-antialiasing half.

## How to add a new app
1. Create `apps/<id>/index.js` obeying the contract.
2. (Optional) Create `apps/<id>/style.css` if it needs specific styles.
3. Add `<id>` to `kernel/registry.js`.
4. Update this `CLAUDE.md` with the new app description.

## Apps
- `placeholder`: `apps/placeholder/index.js` - A trivial app to test the window manager.
- `bekkedal`: `apps/bekkedal/index.js` - Bekkedal, a Norwegian-valley farming game on a 960×540 canvas drawn entirely with `fillRect` (see `apps/bekkedal/CLAUDE.md`, which is the contract for it). Eleven maps (each as big as its own rows say, floor 24×15, scrolling and clamping on both axes), a day/night clock, tools, crops, fishing, eight NPCs, a house to build, and a second act once it is.
  **A building is an elevation, not a rectangle of roof:** the roof, wall,
  door, windows, gable corners and chimney of every house in the valley are
  authored once, in `apps/bekkedal/building.js` and `roof.js`, as a profile of
  a tile's vertical position inside its own building — so courses run across
  the seam between two wall rows and a window is taller than either of them.
  Chimney smoke is the one part of a building that is not in the terrain cache.
  **The mine is a descent, not a room:** under the gruva's adit is a shaft, and
  under that are numbered floors that are *generated* rather than authored —
  `apps/bekkedal/mine.js`, carved by `mine_carve.js`, seeded per run so a floor
  is stable while you stand on it and different next time. Four depth bands
  move everything at once: the layout from the company's own rectangular
  workings to natural cavity, the ore mix from iron toward silver, the rock
  from seven energy a swing to nine, and the dark down four steps of
  `MINE_LIGHT` (`light.js`). All of it out of parts the game already had — a
  floor is a `BEK_MAPS`-shaped map of the six glyphs the gruva already draws,
  a shaft is an `exits` entry on a dead-end stub exactly like a seam in
  `maps.js`, a ladder is the prop `decor_wild.js` already drew, and **`rock.js`
  is not touched**: the ore mix shifts because the generator picks which faces
  become veins, not because `oreKind` rerolls. Every floor has a ladder up and
  down; only a station (every fifth) has a hoist out, so how far past one you
  dare go is the decision a run turns on — with no fail state under it, just
  the 02:00 clock and the energy bar. Below floor 12 a rich vein can carry
  `krystall`, the one thing with no source on the surface: it sells, Lars and
  Marit love it, and it crafts the lamp that makes the deepest bands
  survivable. `node apps/bekkedal/mine_check.js` walks four hundred generated
  floors — connected, viable, no vein sealed in rock, no shaft you can cross
  in passing.
  **There is a reason to be here on day thirty:** the long spine is **LOFTET**,
  the old log storehouse shut on the town square since the mine company left,
  which Astrid gives you the key to once the house is finished and she trusts
  you with it. Seven wings and sixty-four things — every crop, every fish
  including the three legends, the ores and two depths of the descent, the
  forage and the flowers, the dairy and the preserves and the cooked dishes,
  friendship 10 with all eight, and one offering at each of the four seasons'
  festivals — declared once in `BEK_LOFT` (`data.js`), answered by pure
  functions in `apps/bekkedal/spine.js`, drawn in `menus_spine.js`, and
  **written by exactly one function**, `spineDonate()`. Everything a wing pays
  out that is not a number (a recipe, an extra forage round, a hoist that goes
  all the way down, a day off every keg, the doubled gift cap, the
  displays that appear in the room and on the square) is derived from the
  donation table at the point of use and stored nowhere. It takes a year
  because the calendar says so rather than because a number was tuned: four
  festival offerings is four distinct seasons, and
  `node apps/bekkedal/spine_check.js` proves that from the table before
  measuring two hundred simulated runs against it (fastest: day 90). Filling it
  restores the building in three visible stages and ends in a second ending
  screen that reads back *this* run's choices — the house ending is untouched
  and stays the Act I close.
  **The valley is walked, not chosen from a menu:** the nine outdoor maps are three to four times the size they were and join along whole runs of their own edges — walk west off the farm and you are in the wood. The seams are declared once each, as pairings, in `apps/bekkedal/maps.js`; the rows themselves are in `maps_valley.js` and `maps_wild.js`. The travel menu survives only for the setra and the vidda, which are up the mountain and have to be climbed on foot before they are ever offered (`BEK_HOME`, `index.js`). `node apps/bekkedal/world_check.js` is what holds all of that together.
  **They have arcs, and three scenes each:** all eight carry a five-beat arc —
  a reticence, a first admission, a difficulty, a turn, a resolution — as
  `nodes` gated on ascending friendship, one thing they want and one thing
  they will not talk about, and around a hundred and ninety chat lines gated
  on the weather, the season, the hour, the festival, what you are carrying,
  what you did yesterday (`S.yst`, measured off the XP counters at each
  rollover), which quests are open and `act2Unlocked`. At friendship 4, 7 and
  10 the arc stops being told and is played: a *heart event*, triggered by
  being in a place inside an hour window rather than by talking to anyone,
  run by `apps/bekkedal/scene.js` — pure and data-driven, the way
  `schedule.js` is — over scenes authored in `scenes_valley.js`/
  `scenes_wild.js`. A scene places its own cast over the schedule's answer,
  stands the player somewhere for the length of it, freezes the clock and
  hands all three back at the end. They talk about each other: Astrid knows
  Håkon is building, Ingrid knows Olav's boat is patched, and Håkon's arc and
  Marit's converge on the same rotten ridge beam. `BEK_TALK` is four files of
  two characters each (`talk_town.js`, `talk_water.js`, `talk_field.js`,
  `talk_stone.js`), joined by `data.js`.
  **The people have faces:** the conversation box is a portrait, a name plate
  and the line, with answers as rows the selection moves between
  (`apps/bekkedal/menus_talk.js`). The eight portraits are one head-and-
  shoulders rig with parameters per character out of `BEK_NPCS[].face` and
  three expressions each (`apps/bekkedal/portrait.js`), never eight drawings —
  and because the plate is the only place a speaker is named, no line in
  `BEK_TALK` carries an `ASTRID: ` prefix any more. `layout_check.js` holds the
  box's geometry and `scripts/lint-content.mjs` holds the prefix rule.
  **They keep hours, not one tile forever:** each of the eight who talk has
  two to four named posts — a map, a tile, the hours they hold it
  (`BEK_NPCS[].posts`, `apps/bekkedal/data.js`) — and is always standing at
  one or visibly walking between two, off the real walk cycle
  (`apps/bekkedal/actors.js`'s `person()`), never fixed in place. Weather
  moves an outdoor post indoors, a season can move Sigrid's whole day
  between the setra and the valley, a story flag can open a new one
  (Håkon's pen), and a festival day converges all eight on the town square —
  picked, in that priority order, by `apps/bekkedal/schedule.js`'s pure
  `positionFor()`, which `node apps/bekkedal/schedule_check.js` checks over
  a simulated year. A shopkeeper's shop hours are one of their posts, stated
  in their own dialogue.
  **Palette:** this app is the second explicit, user-requested exception to the machine's base 16-colour rule above — see `apps/bekkedal/CLAUDE.md` and `.claude/rules/bekkedal-art.md` for the full doctrine.
- `standbattle`: `apps/standbattle/index.js` - Stand Battle Arena, a JoJo's Bizarre Adventure roguelike combat prototype (see `docs/stand-battle-arena-spec.md`), ported in full from the jojo-roguelike repo's current, far more developed build (replacing this repo's earlier prototype port). Playable Jotaro Kujo/Star Platinum vs. Morioh enemies and boss Yoshikage Kira/Killer Queen, across a 6-node Act 1 (Morioh) map. Zero meta-progression by design; internal 480×270 canvas on a 720×260 belt plane (x, z) with a tracking camera, integer-only upscale.
  **Combat engine:** dodge (Step) is edge-triggered and gated by a 2-charge meter (`fighter.js`, GDD §3.7) with a HUD pip readout. All action inputs are queued in a 9-frame input buffer (`combat.js`) and fire the instant the player returns to idle. Arena world bounds are centralized in `arena_bounds.js`, shared by the sim (`combat.js`) and camera (`render.js`).
  **Simulation core:** the sim steps in whole frames at a fixed 60Hz (`sim_loop.js`'s `createFixedStepLoop`) on a real (x, z) belt plane. `fighter.js` is the entity/component store (`combat.entities = [player, enemy]`). `render_adapter.js` handles depth projection/sorting/camera targeting. Depth movement (`input.js`'s forward/back, W/S by default) is clamped via `arena_bounds.js`; hit detection remains x-only per Phase 1 scope. `headless_harness.js` (`node apps/standbattle/headless_harness.js`) runs the sim with no canvas for reproducible, seeded testing.
  **The combat resolver:** frame data and real AABB hitboxes replace fixed windup/active/recover timers and simple range checks. `moves.js` defines player moves as timelines (`frames`, `hitboxes[]`, `cancels[]`, `armor`); `resolvers.js` holds the five choke points (`resolveMoveFrames`, `resolvePatternFrames`, `resolveDamage`, `applyHit`, `rollCrit`, `resolvePoiseDamage`) — the only place stat arithmetic happens. `hitbox.js` does AABB overlap in (x, z); `poise.js` implements per-enemy poise/Stagger; `resources.js` implements Momentum/Persistence; `defense.js` implements Step/Guard/Clash as three structurally distinct defensive tools (GDD §2.3). `ai.js`'s `PATTERNS` carry `hitbox`/`glyph`/`armor`/`tags` for enemy attacks. `debug_overlay.js` (toggled by a `DEBUG` button) draws hitboxes/hurtboxes/frame state. `fairness_check.js` (`node apps/standbattle/fairness_check.js`) asserts telegraph timing fairness.
  **The pipeline:** `hooks.js` is a flat name→kind hook registry (EVENT/EFFECT/QUERY) with a mutable-context effect dispatcher (`bus.effect`/`dispatcher.runEffect`) and pure-reducer query chains (`bus.query`/`dispatcher.runQuery`) for derived numbers. `stats.js` is a separate layered stat pipeline (base→flat→multiplicative→clamp) wiring Range/Speed/Precision/devPotential into real formulas. `status.js` is the generic status system (`virus`/`frozen` proof entries). `effect_lib.js` is the string-addressable verb vocabulary (`EFFECT_LIB`/`QUERY_LIB`) content authors reference by name — zero buff-specific engine code. `content_registry.js` collects Fragment/Relic/donor data and validates it (`content_check.js`, `node apps/standbattle/content_check.js`) before installing anything onto the dispatcher.
  **Cross-cutting foundations:** `rng.js` is one seeded xorshift128 PRNG per run with named sub-streams (map/rewards/combat/ai) so draws never desync each other; render/particle randomness stays on plain `Math.random()` deliberately. `save.js` is the single choke point over `ctx.save`/`ctx.load` (`'run'` and `'meta'` blobs, each versioned/migratable). `constants.js` re-exports shared numeric constants (arena bounds, `SIM_HZ`/`FRAME_MS`, `GROUND_Y`, `DEATH_ANIM_FRAMES`) so sim and render never drift. `input.js` owns a rebindable keymap persisted via `save.js`'s `meta` blob and classifies every action edge- vs. held-triggered.
  **Graphics (480×270 internal, rebuilt from scratch):** every pixel comes from a software rasterizer (`draw.js`, axis-aligned 1px rows only, no antialiased fills/rotations) layered with `palette.js` (five-step colour ramps, hue-shifted shadows), `layer.js` (offscreen sprite compositor: silhouette ink outlines, cast shadows, hit flashes, dodge afterimages, squash/stretch), `body.js`/`face.js` (shared humanoid rig, anime-style heads), `anim.js` + `pose_player.js`/`pose_enemy.js` (pose engine with per-pattern enemy telegraphs), `sprite_jotaro.js`/`sprite_star.js`/`sprite_enemy.js`/`sprite_boss.js` (~100-120px characters), `background.js`/`bg_scenes.js`/`bg_props.js` (six-layer parallax across four Morioh locations), and `font.js`/`font_data.js` (5×7 bitmap font). This app is an explicit, user-requested exception to the machine's base 16-colour/no-antialiasing rule below; canvas smoothing stays off and everything still snaps to whole pixels. `fx.js` and `arena.js` drive impact/telegraph/particle effects off the hook dispatcher and combat state respectively; `render.js` handles camera/parallax/sprite stamping/HUD. Sound is a 3-layer SFX design with combo-pitch escalation (`audio.js`) plus an adaptive chiptune engine (`music.js`, its own Web Audio gain bus wired to the machine's MUS knob) with explore/combat/tension intensity layers.
  **Design documents — read before changing gameplay:** `docs/stand-battle-arena-spec.md` (technical contract), `docs/stand-battle-arena-gdd.md` (game design document), `docs/stand-battle-arena-tech.md` (engine audit/build order). There is no line budget on this app — content stays data-driven, never a new code path.

## Rules
- Apps never import from `kernel/`.
- Files stay under 300 lines (split into siblings in the app folder if needed).
