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
- `bekkedal`: `apps/bekkedal/index.js` - Bekkedal, a Norwegian-valley farming game on a 960×540 canvas drawn entirely with `fillRect` (see `apps/bekkedal/CLAUDE.md`, which is the contract for it). Eleven 24×15 maps, a day/night clock, tools, crops, fishing, eight NPCs and a house to build.
  **Palette:** this app is the second explicit, user-requested exception to the machine's base 16-colour rule above. Colour comes from `apps/bekkedal/palette.js`, a 64-entry palette whose indices 0–15 are bit-exact `VGA16` (so the HUD and menu chrome stay TempleOS) and whose indices 16–63 are twelve material ramps — grass, straw, conifer, timber, stone, soil, water, sand, snow, the warm/emission ramp and two ore hues — three to six hue-shifted steps each. Sixteen colours has no mid-tones, and without mid-tones a field of grass had to be varied out of four unrelated hues across a forty-point lightness spread, which is what made it read as confetti. The contrast rule the ramps exist to enforce is declared alongside them (`MARKS` / `SHADOWS` / `FEATURES`), so the tables the art draws from and the tables the check reads are the same tables. **This app is not an exception to the no-antialiasing rule or to the no-alpha rule**: every blend is still an ordered dither, every fill is still an axis-aligned `fillRect` on integer coordinates, and there is no `globalAlpha`, `rgba()` or `ctx.filter` anywhere in it.
  **Light:** `light.js` makes the hour of the day a transform of the palette rather than a stipple over the picture — desaturate, scale by a *scalar*, add a tint, which works out to `lum(out) = k·lum(in) + c` and therefore cannot reorder two entries by luminance at any hour. The terrain cache rasterises in night colours directly, so night costs no overdraw. Local light (hearth, lit windows, a lantern in the mine, a candle on a table) is two ordered-dither passes per source taken in *daylight* colours, because a fire is as bright at midnight as at noon.
  **The art siblings:** `noise.js` (the terrain variation field), `surface.js` (what each glyph reads as), `autotile.js` (neighbour masks and a rounded-union signed distance, so a transition is authored once and sampled in whichever direction the neighbours say), `shore.js`/`water.js` (the shoreline and the depth ramp), `rock.js` (the mountain and the ore), `forest.js` (the treeline as a continuous strip, nothing on a tile cadence), `interior.js`/`decor.js` (floorboards, volume, wear and the things in a room), `crops.js`, `actors.js`, `fx.js` (the tool swing and its particles), `menus.js`, `music.js`, `font.js`/`text.js`/`layout.js`. Content — map rows, decor placements, treeline species mixes, items, dialogue — stays in `data.js`.
  **Checks — run all four before claiming anything is done:** `node apps/bekkedal/tile_check.js` (the variation field is deterministic, uniform and aperiodic), `node apps/bekkedal/layout_check.js` (geometry, camera clamp, text fitting in both languages), `node apps/bekkedal/palette_check.js` (ramps, contrast bands, and that the darkest hour still separates walkable from solid on every map), `node scripts/smoke.mjs` (a headless 30-day run and save migration). `node scripts/bekkedal_shots.mjs <dir>` drives the real app in Chromium and writes the whole screenshot matrix — every map at three hours, both interiors, the mine thresholded to 1-bit, a synthetic coastline, every tool mid-swing and every menu — and exits non-zero on any page error, because a draw call that throws leaves a plausible-looking half-painted canvas. `node scripts/bekkedal_pairs.mjs <before> <after> <out>` composes two such runs into labelled before/after pairs; no screenshot is committed, since the art is code and a checked-in PNG goes stale the first time somebody touches a ramp. `node scripts/bekkedal_savetest.mjs` plays the pre-change build until it writes a real save, then asserts that save still loads here.
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
