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
- `bekkedal`: `apps/bekkedal/index.js` - Bekkedal, a Norwegian-valley farming game on a 960×540 canvas drawn entirely with `fillRect` (see `apps/bekkedal/CLAUDE.md`, which is the contract for it). Eleven 24×15 maps, a day/night clock, tools, crops, fishing, eight NPCs, a house to build, and a second act once it is.
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
