# Bekkedal — Visual Overhaul Brief

You are working on `apps/bekkedal` in the HOLYTRON DM-640 / TempleOS repo: a 960×540
canvas Norwegian-valley farming game, drawn entirely with `fillRect`, no images, no
antialiasing, no alpha compositing. Seven visual problems have been reported. Your job
is not to patch seven symptoms — it is to leave this game looking like something a
person made on purpose, and to leave behind the machinery that keeps it that way.

Read this whole brief before you touch anything. The diagnoses below are from a real
read of the code; the line references are real. Verify them, don't trust them.

---

## 0. Orientation — do this first, before planning anything

**Read, in this order:**

1. `apps/bekkedal/CLAUDE.md` — the app's own contract. It is unusually good. It tells you
   what lives where, why the font is a bitmap, why the terrain cache exists, what the
   two check scripts assert, and what the palette rule is. Every claim in it is load-bearing.
2. `apps/bekkedal/noise.js` (266 lines, all of it) — the terrain variation system. Its
   header comment explains why the old linear seeds laid diagonal bands across the maps.
   You will be adding channels to it. Understand `hash`/`hv`, `hLow`/`hLowV`, `patchAmt`,
   `mapSalt`, the recipe tables, and `channels()` before you add a single one.
3. `apps/bekkedal/index.js` — specifically the drawing section, roughly lines 930–1740:
   `ditherPat`/`dither`, `native()`, `wash()`, the five `*Ground` functions, the five
   `*Detail` functions, `waterTile`/`waterEdgeTile`/`hearthTile`, `tileGround`/`tileDetail`/
   `tileLive`, `terrain()` (the cache), `drawSoil`, `drawIcon`, `person`, and `draw()`.
4. `apps/bekkedal/data.js` — geometry constants at the top (lines 17–49), then `BEK_MAPS`.
   Note that all eleven maps are 24×15 char grids and the legend is at line ~174.
5. `apps/bekkedal/tile_check.js` and `layout_check.js` — the two things that must still
   pass when you are done.
6. Root `CLAUDE.md` — the machine-wide rules, including the 16-colour palette rule and
   the note that `standbattle` is an explicit, user-granted exception to it. You are about
   to become the second exception; do it the same way, with the same honesty in the docs.

**Then run it and look at it.** Do not design from source reading alone.

```bash
npm install && npm start          # express on :3000, serves the repo statically
```

Drive it with Playwright (Chromium is pre-installed at `/opt/pw-browsers/chromium`;
never run `playwright install`). The app is loaded through `kernel/registry.js`'s dynamic
import and there is no standalone entry point, so open it from the page:

```js
await page.evaluate(() => import('/kernel/wm.js').then(m => m.openWindow('bekkedal')));
```

**The single most useful trick in this whole brief:** the save is plain JSON in
`localStorage` under the key `templeos.bekkedal.v2` (`BEK_SAVE` in `data.js`), and the
shape is exactly what `fresh()` returns in `index.js`. Write a crafted save *before* the
page boots and you can teleport to any map, any hour, any tool, any inventory, instantly.
The clock runs at 4 in-game minutes per real second (`tickClock`), so reaching 22:00 from
the 06:00 start by waiting costs four real minutes — per screenshot. Seed the save instead:

```js
await page.addInitScript(() => localStorage.setItem('templeos.bekkedal.v2', JSON.stringify({
  ver: 4, map: 'gruva', px: 8, py: 7, min: 22 * 60, day: 3, tool: 4,
  tools: { spade: 1, kanne: 1, oks: 1, stang: 1, hakke: 1 }, pickLv: 2, axeLv: 2,
  /* ...the rest of fresh() — heal() will backfill anything you omit... */
})));
```

Build yourself a screenshot harness on top of that as step one of the work, not as an
afterthought at the end. Everything below is judged by eye, and you cannot judge by eye
what you have not rendered.

---

## 1. The rails — break any of these and the work is wrong, however pretty

- **No alpha, ever.** There is no `globalAlpha`, no `rgba()`, no `ctx.filter` anywhere in
  this app and there must not be. Every blend is an ordered dither through `dither()` /
  `ditherPat()` / `wash()`. This is the house style and it is why the game looks like it
  does. A blend you cannot express as a stipple is a blend you may not use.
- **No antialiasing, no sub-pixel anything.** Axis-aligned `fillRect` only. Every
  coordinate an integer. No `arc`, no `lineTo`, no rotation transforms, no image smoothing.
- **The two coordinate spaces are real.** `BEK_T_SRC` is 20, `BEK_ART_SCALE` is 2,
  `BEK_T` is 40. Unconverted art draws in source space under the ambient transform;
  converted art opens with `native()` and works in real `BEK_T` pixels. A converted
  function must not multiply by `BEK_T_SRC` again. `wash()` opens its own `native()` and
  must be called from *outside* one. New art should be written native — you are extending
  the art uplift, not adding to the backlog.
- **Static art goes in the cached passes; animated art goes in the live pass.**
  `tileGround` and `tileDetail` render once into `terrCv` when the cache key changes
  (`S.map | S.day | S.built | terrBump`). Only `tileLive` (glyphs listed in `LIVE`) and
  `drawSoil` run every frame. Anything you add that reads the clock must be in the live
  path or must fold its input into the cache key. **Any new mutation of `S.felled`,
  `S.mined` or `S.picked` must call `terrDirty()`.**
- **Terrain must be deterministic and unseeded.** Terrain is never saved; it is recomputed
  from `(mapId, x, y, channel)` on every load. `Math.random()` in a cached pass means a
  different valley every time you walk into it, and `tile_check.js` will catch you. Loot
  rolls in `act()` and transient particle FX may use `Math.random()`; the ground may not.
- **Every channel you draw from must be declared** in the recipe tables at the bottom of
  `noise.js` and returned by `channels()`. An undeclared stream is a stream nothing tests.
- **`data.js` is content, `index.js` is behavior.** New tables — decor layouts, tree
  species weights, ore ramps, light sources — are content. Do not let either file drift
  into the other.
- **Files stay under 300 lines.** `index.js` is already 1969 and `data.js` is 1042; that
  is technical debt, not a licence. Your work must not grow `index.js`. Target a net
  *reduction* by moving art into new siblings in the app folder (`palette.js`, `light.js`,
  `autotile.js`, `shore.js`, `forest.js`, `interior.js`, `fx.js`, …). Apps import only from
  their own folder and — for the palette, historically — from `kernel/god.js`; part of
  this work removes even that.
- **`unmount()` must stay clean.** No `setTimeout`, no `setInterval`, no new
  `requestAnimationFrame` loop. Everything animates off the existing `frame()` loop's `dt`.
  Note `frame()` draws at 30fps (`acc >= 1/30`), not 60 — time your animations against that.
- **Transient state does not go in `S`.** `S` is serialized whole and synchronously by
  `autoSave()` every ~6s. A swing timer, a particle list, a camera nudge — those are
  module-local like `fish` and `note` already are. Only put something in `S` if it must
  survive a reload, and if you do, bump `ver` and add a backfill line to `heal()`.
- **The game must still be the same game.** Same maps, same collision (`BEK_SOLID`), same
  economy, same dialogue, same controls. You are changing how it looks, not what it is.
  If a visual change would alter walkability or a hitbox, it is the wrong change.

---

## 2. Work order

The palette is the foundation for four of the seven problems. Do it first, migrate the
existing art onto it, confirm the game looks *identical* at that point, and only then
start making things look better. In order:

**1 → palette · 2 → night · 3 → shore · 4 → ores · 5 → interiors · 6 → treeline · 7 → tools**

Commit at each boundary with a screenshot in the message body's description. A twelve-file
mega-commit is unreviewable and unbisectable.

---

## 3. The seven problems

### 3.1 The palette: 16 colours → 64

**What's there now.** `index.js:78`: `const C = i => { const p = VGA16[i]; ... }`, over
`VGA16` imported from `kernel/god.js` — the stock CGA/VGA 16: black, three flat primaries
at 170, their bright twins at 255, brown `(170,85,0)`, two greys, white.

**Why it fails, and why the reported "new texture variants are an eyesore" is really this.**
Look at `TUFT = [10, 2, 10, 14, 10, 2, 3]` (`index.js:1016`) — the seven colours a blade of
grass is drawn from. Index 10 is `(85,255,85)`, index 2 is `(0,170,0)`, index 14 is
`(255,255,85)`, index 3 is `(0,170,170)`. Their perceptual lightnesses are L\* 89, 61, 97
and 63, and two of them are not even green. The tufts are not variation *within* a
material; they are four unrelated materials fighting each other at one-pixel scale, across
a 36-point lightness spread. That is what "eyesore" means here. The terrain variation system in `noise.js` is
excellent; the problem is that it is dealing from a deck with no mid-tones. There is
nothing between `(0,170,0)` and `(85,255,85)` to vary *inside*.

**The bar.** A 64-entry palette, and every existing draw call migrated onto it with no
regression.

**How to blow past it.**

- **Structure the 64 as ramps, not as a swatch grid.** One ramp per material family the
  game actually draws: grass, dry grass, conifer, birch foliage, timber, painted board,
  turf roof, stone, cave rock, soil, wet soil, sand, water shallow, water deep, snow,
  skin, cloth, fire, and the night/atmosphere family. Four to five steps each, shadow →
  base → light. That is the whole budget, and it is enough — count them.
- **Hue-shift the ramps; do not just scale lightness.** A shadow step shifts toward blue/
  violet and drops saturation slightly; a highlight step shifts toward yellow/warm. Scaling
  one hue's value up and down is exactly the flat look you are trying to escape, and it is
  what 16 colours already gave you. This single decision is most of the difference between
  "64 colours" and "actually looks better".
- **Keep indices 0–15 bit-exact VGA16.** Every existing draw call keeps working during the
  migration, the HUD and menu chrome stay TempleOS, and any regression is bisectable. New
  colours live at 16–63. Do not renumber the first sixteen for tidiness.
- **The palette lives in `apps/bekkedal/palette.js`,** not in `kernel/god.js`. The kernel
  palette is the machine's, shared by every other app; this one is Bekkedal's. Moving it
  in-app also removes the app's only cross-boundary import, which the root `CLAUDE.md`
  forbids in general.
- **Remember dithering multiplies your gamut.** 64 indices plus a 4×4 ordered dither
  between any two of them is an enormous effective palette. Design adjacent ramp steps so
  that a 50% stipple between them reads as a clean intermediate rather than as a texture —
  that means adjacent steps should be close in *hue* even when they differ in value.
- **Then re-tune every variation table against a contrast band.** Write the rule down and
  enforce it: a decorative mark on a surface stays within a narrow luma band of that
  surface's base (start with ±0.12 relative luminance and tune by eye); only *features* —
  a flower head, an ore glint, a water sparkle — may break the band, and they must be rare.
  `TUFT`, `TUFT_DRY`, the path grit in `pathDetail`, the cave gravel in `caveDetail`, the
  rock faces in `rockDetail`, the flower colours in the `'F'` and `'p'` branches: all of
  them get re-picked from the ramps under that rule. The result should be a field that
  reads as one living green from three feet back, and resolves into detail up close. That
  is the whole point of the exercise.
- **Ship a `palette_check.js`** next to the other two: assert each ramp is monotonic in
  luminance, that adjacent steps differ by less than a ceiling (no gaps you cannot dither
  across), that no two indices are duplicates, that 0–15 still equal `VGA16` exactly, and
  that every declared decorative table obeys its surface's contrast band. Wire it into the
  same "run these before you claim you're done" list.

**Traps.** `ditherPat` caches patterns keyed by `(context, colour, strength)` — a 64-colour
palette multiplies that cache; make sure it stays bounded and that patterns are still
created by the context that fills with them (the terrain canvas and the screen each need
their own). `drawIcon`, `panel`, `text` and `drawHud` all take colour indices too — the
text atlas in `text.js` prerenders one canvas per colour per size, so a careless expansion
there costs real memory. Prerender only the indices the UI actually uses.

---

### 3.2 Night is an eyesore and physically uncomfortable

**What's there now.** `index.js:1681`: `if (night()) dither(1, 9); else if (dusk())
dither(1, 5); else if (dawn()) dither(6, 3);` — a full-viewport stipple of colour index 1,
pure `(0,0,170)` blue, at strength 9 of 16. Interiors get half that at line 1685.

**Why it fails.** Three separate reasons, all of them real:
1. **56% of the screen is replaced with one saturated blue.** Not darkened — *replaced*.
   Every hue on screen is half-destroyed and the surviving half is unrelated to it.
2. **The stipple is 8 device pixels per cell** (`BEK_DITHER_PX` = `BEK_DITHER_CELL` × `BEK_ART_SCALE`
   = 4 × 2), so across a 960×540 viewport the ordered matrix reads as a visible, static,
   high-frequency crosshatch over the entire image. A regular grid at that spatial
   frequency, held on screen for minutes, is genuinely fatiguing to look at. This is the
   discomfort.
3. **It snaps.** `dusk()` is 18:00–20:00, `night()` is 20:00–05:00. At 20:00 exactly the
   overlay jumps from strength 5 to strength 9 in one frame. Nothing in nature does that.

**The bar.** Night reads as night, is comfortable to sit in, and does not destroy the art.

**How to blow past it.**

- **Stop overlaying. Remap.** With a 64-colour palette you have the option the old code did
  not: give every index a *night variant* — same colour, taken down in value, compressed in
  contrast, pulled toward a cool dark, with its **relative luminance ordering preserved**.
  Then night costs nothing: `C(i)` resolves through the active lighting LUT and the terrain
  cache renders in night colours directly. Zero overdraw, zero stipple buzz, and — crucially
  — the image keeps its *structure*. A grass tile is still readable as grass at midnight;
  it is just a night-grass.
- **Make it a curve, not two if-statements.** Author 5–7 keyed LUTs — deep night, late
  dawn, morning, midday, golden hour, dusk, early night — and drive the active one from
  `S.min` continuously. Between two keys, dither *per index* between the two LUT entries at
  low strengths (1–4 of 16), which is invisible as stipple and gives you a smooth crossfade
  over in-game hours instead of a step. Bucket `S.min` into ~10-minute steps and fold that
  bucket into the terrain cache key so the cache rebuilds a handful of times per day rather
  than never or every frame. Measure the rebuild cost before and after; see §4.
- **Then add light, which is the part that makes night cozy instead of oppressive.** A
  lighting LUT gets you a night that is *comfortable*; local light gets you one that is
  *inviting*. Sources: the hearth `'v'`, lit windows on `'H'` walls, the town at night,
  a lantern the player carries in the gruva. Each source pulls nearby tiles back toward
  their day LUT entry with a radial falloff rendered as — of course — an ordered dither.
  Warm sources (hearth, window, lantern) should pull toward the *warm* end, not merely
  toward brighter, so a lit window in a blue valley reads as amber. This is the single
  highest-value thing in this entire brief and it pays off again in §3.4 (ore catching
  lamplight) and §3.5 (firelight in a room).
- **Keep the moonlight directional.** A single cool key light from one side, so the tops
  of things are a step lighter than their sides. It costs one extra ramp step per material
  and it is what stops night reading as flat.
- **Define a contrast floor and check it.** At the darkest hour, the luminance difference
  between a walkable tile and a solid one, and between the player sprite and any ground
  they can stand on, must stay above a stated threshold. Put it in `palette_check.js` and
  assert it across all eleven maps. A pretty night you cannot navigate is a bug.
- **The HUD stays out of it.** The two 30px `BEK_HUD_H` bands are chrome; the overlay is
  already clipped to the viewport and must remain so. With a LUT approach that means the
  HUD, menus, panels and text draw explicitly from the day LUT regardless of the hour.

**Traps.** `dither(1, 9)` is currently the *only* thing that darkens interiors, weather
`'take'` fog (`dither(7, 4)`) composites on top of it, and rain draws before it. Make sure
fog-over-night and rain-at-night still read correctly and that the composite cost does not
regress — the current full-screen composite is ~0.59ms at 960×540 and the LUT approach
should be *cheaper*, not more expensive. If it is more expensive, you have implemented it
as an overlay after all.

---

### 3.3 The water shore has no rotated variants

**What's there now.** `waterEdgeTile` (`index.js:1206`) draws a hardcoded horizontal
stack, top to bottom: deep water fill, `C(3)` band at y+0..16, `C(9)` band at y+0..8,
ripples, a white foam line at exactly `py + 28`, sand at `py + 30`, bank at `py + 34`.

**Why it fails.** The tile has no idea where the water is. It assumes water above, land
below, always. Every `'~'` tile on every map — north shore, south shore, a cove, an inlet,
a corner — draws the same north-facing profile. On a south shore the sand is in the water.

**The bar.** The shore profile orients itself correctly on all four sides.

**How to blow past it.**

- **Build a real autotiler, in `autotile.js`, and make it generic.** A function that takes
  a predicate over neighbours and returns a mask: 4-bit for cardinals, 8-bit when you want
  diagonals. It will pay for itself immediately — the treeline in §3.6 wants it, cave walls
  want it, fences (`'='`) want it, and roofs (`'R'`) want it.
- **Author the shore profile *once*, as a 1-D function of distance from the waterline,**
  then sample it along whichever direction the mask says the water lies. Four rotations of
  hand-authored art is four times the art to maintain and four chances to get one wrong;
  one profile plus a direction is neither. This is the difference between "solved the
  ticket" and "solved the problem".
- **Handle the corner cases explicitly, because they are most of a coastline.** Outer
  corners (water on two adjacent sides — a headland), inner corners (land on two adjacent
  sides — a cove), spits (water on three sides), and isolated tiles. The classic 16-case
  cardinal table plus 4 inner-corner cases covers it. Blend the profile radially at outer
  corners rather than mitring two straight profiles together; a mitre joint reads as a
  drawn line and a radial blend reads as a beach.
- **Make the seam continuous across tiles.** The foam breaks are currently placed from
  `edgeVar(S.map, x, y)` — per tile. That means the foam line restarts at every tile
  boundary, which is visible as a 40px rhythm along any straight shore. Derive foam break
  positions from the *world position along the seam* instead, so a stretch of shore reads
  as one continuous line of surf with breaks wherever they fall.
- **Run the ripple drift perpendicular to the shore normal,** not always vertically. The
  `w = Math.floor(t * 2 + x + y) % 4` term currently drifts on one axis; rotate it with
  the tile. While you are there: waves that arrive at the beach and recede — a foam line
  whose *width* oscillates on a slow cycle — cost almost nothing and are the single most
  convincing thing you can add to water.
- **Give the deep-water tile a shoreline-aware depth ramp.** `waterTile` fills flat
  `C(1)`. With a ramp, water can get darker with distance from land (compute distance from
  the same autotile mask over a couple of tiles) and the lake gains depth for free.

**Traps.** `waterEdgeTile` is in the *live* pass (`LIVE = 'W~v'`) and runs every frame per
water tile — the neighbour mask is static per map, so compute it once at cache-rebuild time
and store it, don't recompute it 60 times a second. `'P'` (pier) and the map rim interact
with the shore; check `BEK_MAPS.lake` and `.fjord` for the awkward cases. The `R_EDGE`
recipe has 8 declared fields — if the rotated version needs more, declare them in `noise.js`
and re-run `tile_check.js`. And note `waterEdgeTile` is already `native()`: keep it that way.

---

### 3.4 The ores in the mine are almost impossible to spot

**What's there now.** `rockDetail` (`index.js:1134`), the `c === 'O'` branch: a 3×3 of
`C(6)` brown, a 2×2 of `C(7)` light grey, and two single pixels of `C(14)` yellow — all in
*source space*, so the 3×3 is 6×6 on screen and those two "sparkles" are 2×2. It is drawn
over `rockGround`'s `C(8)` fill, on top of the 9×6 and 7×6 `C(7)` lit faces that the *same
function* stamps on every rock tile, ore or not.

**Why it fails.** Read those two paragraphs together and the bug is obvious: **the ore's
largest bright mark, `C(7)`, is the exact colour of the ordinary rock's face detail** — a
2×2 of it, next to a 9×6 of it. The one mark that is supposed to say "ore" is the same
colour as the noise it is competing with, and smaller. The rest compounds it: L\* 46 brown
on an L\* 36 base is a 10-point step where the ordinary faces already jump 34; there is no
hue contrast because the whole scene is grey; there is no silhouette difference, because an
ore tile is a wall tile with different pixels on it; and the only genuinely high-contrast
marks (`C(14)`, L\* 97) are the two smallest objects on the tile. The gruva is also the
darkest map in the game, so the cave shading eats what little separation survives.

**The bar.** You can spot a vein at a glance, from across the room, without hunting.

**How to blow past it.**

- **Fix the silhouette first — shape reads before colour.** An ore tile should not be a
  wall tile with different pixels on it. Give it a broken face: a cracked seam running
  across the rock, a cluster of crystal facets breaking the surface plane, a shadowed
  recess where the vein bites into the stone. Someone should be able to identify it in a
  1-bit black-and-white screenshot. Test exactly that: render the mine, threshold it to
  two values, and check you can still find the veins.
- **Darken the host rock around the vein, then make the ore bright.** You cannot get
  contrast by adding bright pixels to a mid-grey field; you get it by putting bright pixels
  against dark ones. A dark matrix halo around the ore body gives you the full range of
  the new palette to spend.
- **Make the ore body one coherent mass,** 8–12 source pixels of contiguous ore, not
  scattered specks. Specks read as noise — which is exactly what the rest of the rock
  tile already is.
- **Use the new ramps to make the ore types *identifiable*, not merely visible.** Iron
  rust-ochre, copper verdigris-green over warm brown, silver cool white-blue. A player
  should learn to read what they are about to mine before they swing. `'Q'` (rich vein,
  needs a steel pick) must read as unmistakably richer than `'O'` at a glance — more
  facets, a distinct hue family, a bigger body — because walking to a vein you cannot mine
  yet is a small, avoidable frustration the art can fix.
- **Let the ore catch the light.** Once §3.2's lighting exists, ore is specular: it should
  be the brightest thing in the frame down there, and it should respond to the player's
  lantern. A slow, low-amplitude glint travelling across facets — added to `tileLive` with
  `'O'` and `'Q'` joining `LIVE`, or better, drawn as a small live overlay so the static
  body stays cached — turns "findable" into "eye-catching". Keep the amplitude low; the
  goal is a catch of light, not a blinking marker.
- **Make veins cluster into seams the player can follow.** `LOW.VEIN` already exists as a
  discrete low-frequency field (`noise.js`) and `caveDetail` uses it for one-pixel mineral
  glints. Extend that: mineral traces in the surrounding wall should get denser as you
  approach a real `'O'`/`'Q'` tile, so the rock itself tells you where to look. This is a
  visual change that improves the *game*, not just the picture — it is the kind of thing
  this brief is asking for.

**Traps.** The `'M'`/`'O'`/`'Q'` branch is shared and unconverted (source space, multiplies
by `BEK_T_SRC`). If you convert it to `native()`, convert the whole branch and remove every
`BEK_T_SRC` multiply in it — half-converted is the one state that renders wrong. `snow_()`
maps (`setra`, `vidda`) take the same branch with a snow variant; do not fix the mine and
break the mountain. And a mined tile becomes `'g'` for three days via `tileAt` — verify the
regrown tile does not inherit any of your new decoration.

---

### 3.5 House interiors look like three tiled textures

**What's there now.** `floorGround` (`index.js:1031`) is a flat `C(6)` fill plus a `WORN`
wash. `floorDetail` (`index.js:1092`) is: one horizontal line at `py + 9`, a vertical line
every 10px, and — 1 tile in 7 — a single 2×1 speck. That is the entire floor of every room
in the game. Walls are the `'H'` interior branch: three horizontal courses and a black
outline. Furniture is eight glyphs (`z` rug, `n` table, `u` cupboard, `J` bench, `c` crate,
`b` bed, `o` well, `v` hearth), each drawn byte-identically every single time it appears.
`BEK_MAPS.farmhouse` is a 10×6 room; `lakehouse` is its sibling.

The report is precise and correct: it is three textures repeated, with no effort at making
the place liveable. Fix that.

**The bar.** A room you would want to be in.

**How to blow past it.**

- **Boards, not tiles.** Real floorboards run *across* the room — they have varying widths,
  varying lengths, staggered end-joints, a nail pair at each joist, and each board is a
  slightly different step of the timber ramp because it is a different piece of wood. Derive
  all of that from world position, not tile position, so the boards visibly cross tile
  boundaries. This one change removes the "tiled" reading entirely, and it costs about
  fifteen `fillRect`s per tile in a pass that is cached.
- **Give the room volume.** A 1–2 row dithered shadow cast from the base of every wall onto
  the floor. Skirting where wall meets floor. A slightly darker floor in the corners. Rooms
  currently have no edges because the wall and the floor are both brown; the app's own
  `CLAUDE.md` notes that problem for the wall colour and solves half of it.
- **Light the room from its openings.** A warm parallelogram of light spilling from each
  window onto the floor, and firelight from the hearth `'v'` — which already animates its
  flame (`hearthTile`) but lights nothing. Once §3.2's light sources exist, a hearth whose
  light radius flickers by a pixel or two on the same cycle as its flame is the single
  cheapest "cozy" you will ever buy.
- **Author decor as content, in `data.js`, per map — not as more glyphs in `tileDetail`.**
  A table of `{ map, x, y, kind }` props, and `index.js` learns how to draw each *kind*.
  This is the app's stated split, and it means adding a room later costs no code. Props
  worth having: crockery and a candle and a half-loaf on the table; jars and tins on
  shelves; herbs drying from a beam; a kettle on the hearth; firewood stacked beside it;
  boots by the door; a broom in a corner; a coat on a peg; a framed picture; a cat asleep
  by the fire with a two-frame breathing idle. The rag rug (`'z'`) should look woven —
  bands with a variable weft — rather than four nested rectangles.
- **Make the two houses different people's houses.** The farm cabin and the lake house
  should not share a decor list. Weight the props per map and per NPC. A player who walks
  into the second house and immediately knows it is a different house is the outcome here.
- **Aim the wear.** The `WORN` patch on the floor is currently a low-frequency noise field.
  Aim it along the actual traffic lines instead — door → hearth, door → bed, around the
  table — computed from the room's own layout. Wear that follows use is one of those
  details nobody consciously notices and everybody feels.

**Traps.** Decor must not change walkability: `solid()` reads `BEK_SOLID` against the map
glyph, so props drawn on a walkable tile stay walkable and props on furniture stay solid.
If you add a prop where the player can stand, they will stand on it — decide whether it
draws under or over the sprite, and note that the actor sort in `draw()` is by `y` only.
Interior maps have `inside: true`, which suppresses `rim_`/`edgeMark` and halves the night
tint — check both after your changes. And the ` ` (space) glyph outside the walls is
deliberate dead black margin; leave it alone.

---

### 3.6 The frame around the game is the same tree, over and over

**What's there now.** Every outdoor map's outer ring is `'T'` (see any `rows` array in
`data.js` — `TTTTTTTTTTTTTTTTTTTTTTTT` top and bottom, `T` down both sides). `tileGround`
fills those tiles solid black; `tileDetail`'s `'T'` branch draws one fir silhouette whose
only variation is `o.lean ∈ 0..2` and `o.lit ∈ 0..2`; `edgeMark` (`index.js:1174`) stamps
a hard 4px black frame with a 1px grey lip on the inward side. Gaps in the ring are the
exits. The map is exactly the canvas width, so the left and right columns of this ring are
on screen at all times.

**Why it fails.** Seventy stamps of the same 20×20 tree on a 40px cadence. Nine visual
variants total, arranged in a perfect grid, framing every scene in the game. And between
the trees: flat black. The report calls it "repeated trees with gaps" and that is exactly
what it is.

**The bar.** A treeline that reads as forest.

**How to blow past it.**

- **Stop drawing it as tiles.** The rim is a 1-tile band; render it as a *continuous strip*
  in its own module (`forest.js`), cached into its own offscreen canvas, with nothing
  landing on a 40px cadence. Trunk positions come from the hash at irregular spacing — 11
  to 29 pixels — with overlap. The grid disappears the moment nothing is aligned to it.
- **Three depth layers, and use value for depth.** A far canopy at low contrast, drawn
  close to the atmosphere colour; a mid layer of trunks; a near layer of dark, detailed
  boughs that may overhang the playfield edge by a few pixels. Atmospheric perspective —
  distant things being *lower in contrast*, not merely smaller — is the entire trick, and
  it is what will make this read as "soothing and realistic" rather than as a wall.
- **Mix species, and weight them per map.** Fir, spruce, birch, a dead standing snag, a
  leaning one, a stump, a fallen trunk. Birch-heavy near the farm; dense dark spruce
  approaching the gruva; stunted, wind-bent and sparse at the vidda; snow-loaded at setra
  (`snow_()` already knows which maps those are). Vary height, width, and vertical offset
  per tree, and let some trees be partly occluded by the ones in front.
- **Fill the gaps.** Undergrowth and brush at the base, a dark forest-floor value between
  the trunks, ferns catching a little light at the front edge. The black voids the report
  is seeing should become forest interior — dark, but *something*.
- **Frame the exits, don't just leave a hole.** Where the ring opens, thin the trees, widen
  the undergrowth, and let the path's lighter ground run into the mouth of the gap. Exits
  should become *more* legible, not less — this is the one place a hard edge earns its keep.
- **Reconsider `edgeMark`.** With a real forest band, a hard black frame with a grey lip is
  a drawn line around a picture that no longer needs one. A dark vignette dithering into
  the trees will read as a world limit just as clearly. Keep an explicit accent only at
  exits. Verify against `layout_check.js`'s camera assertions: the top and bottom rows must
  stay welded to the frame with no blank creeping in at the clamp.
- **Fix the corners.** The four corners currently place the same tree twice at right angles.
  A corner should be the densest, darkest part of the treeline.
- **If you add motion, keep it barely there.** A very slow sway on the near boughs only,
  amplitude one or two pixels, and preferably only when `S.weather` is `'regn'` or `'take'`.
  The user asked for soothing. A permanently animated border is the opposite of soothing —
  and it would move the whole band out of the cache, so measure before you commit to it.

**Traps.** The rim band is on screen at all times horizontally and scrolls vertically
(camera clamps 0–120). Overhang into the playfield must not obscure a walkable tile or a
sprite. `tileAt` returns `'T'` for out-of-bounds coordinates on outdoor maps — anything
sampling neighbours at the border will see that.

---

### 3.7 Tools have no animation

**What's there now.** `act()` (`index.js:513`) resolves everything instantly: check the
tile, spend energy, mutate state, `terrDirty()`, `sfx.chop()`, `say('+1 …')`. The player
sprite (`person`, `index.js:1539`) has a four-frame walk cycle and nothing else. The tree
you fell vanishes on the same frame the axe was never seen to swing.

**The bar.** A slight animation when a tool is used.

**How to blow past it.**

- **A three-phase swing, per tool.** Windup, strike, follow-through — roughly 0.10s /
  0.05s / 0.15s, which at the 30fps draw rate is about 3 / 2 / 4 drawn frames. Keep it
  short: the request is for *slight*, and a farming game where every action costs half a
  second of animation becomes tiring within ten minutes. Each tool gets its own arc: axe
  overhead and across; pick overhead and down into the rock; spade down and back; watering
  can tilts and pours; the rod casts. Hold movement input for the duration so the action
  reads as committed, and buffer the next input rather than dropping it.
- **Put the effect on the target tile, not just on the player.** This is where the payoff
  is. Wood chips flying from the birch, stone dust and two or three spark pixels off the
  ore, a clod of soil turning, a splash ring expanding at the water's edge, a sprout
  popping when you plant, an item icon arcing up when it lands in your bag. A tiny
  transient particle system in `fx.js`, drawn in the live path, off the existing frame
  loop's `dt` — no timers, list cleared on unmount.
- **One or two frames of impact.** A 2–3px camera nudge on the strike frame (fold it into
  `camTrack`), or a single-frame bright flash on the struck tile. This is the entire
  difference between an animation and a *hit*. Keep it under three pixels and under two
  frames or it becomes motion sickness.
- **Solve the "tree vanishes early" problem deliberately.** `act()` mutating state
  immediately is the *safe* design — no risk of double-resolution, of the player walking
  away mid-swing, or of `autoSave()` catching a half-applied mutation (which the app's
  `CLAUDE.md` explicitly forbids). Keep it. The visual artefact is only the terrain cache
  repainting before the axe lands, so defer the *repaint*: delay the `terrDirty()` bump to
  the strike frame while the state change happens now. State everything about that choice
  in a comment, and make sure a second `terrDirty()` from any other source in the meantime
  still takes effect immediately.
- **Animate the failures too.** `sfx.deny()` currently fires alone for "no vein here", "too
  big, you need a steel axe", "the can is empty". A two-frame horizontal shake of the
  player sprite, or a small recoil, tells the player *no* faster than the text does.
- **The tool should be visible in the hand.** The `person` sprite currently draws no tool
  at all. A held tool that follows the swing arc — and that changes when `cycleSeed`/tool
  selection changes — is a small addition to a dozen-line function and it is what makes the
  swing legible at all.

**Traps.** Transient swing state is module-local like `fish`, never in `S` — it must not
survive a reload and it must not touch the save shape. Everything ticks on the frame
loop's `dt`, never on a timer, or `unmount()` leaks. `frame()` calls `draw()` at 30fps but
`move()`/`tickClock()` at full rate; time the animation against `dt`, not against a frame
count. And the fishing rod already has an entire minigame (`fish`, `tickFish`, `drawFish`)
— the cast animation must hand off to it cleanly, not race it.

---

## 4. Verification — this is not optional and it is not the last step

**The checks, every time, before you claim anything is done:**

```bash
node apps/bekkedal/tile_check.js       # variation field: determinism, uniformity, aperiodicity
node apps/bekkedal/layout_check.js     # geometry, camera clamp, text fitting in both languages
node apps/bekkedal/palette_check.js    # yours: ramps, contrast bands, day+night contrast floors
```

`tile_check.js` re-runs the field in a second process and compares digests, so a stray
`Math.random()` in a cached pass fails it. It also asserts every *declared* channel is
uniform and aperiodic — which is why an undeclared channel is worse than a failing one:
it fails nothing.

**Look at the output. Every time.** Build the Playwright + seeded-save harness from §0 and
produce a real screenshot matrix:

- All eleven maps at three times of day (morning, dusk, deep night) — that is where §3.2
  lives or dies.
- Both interiors, lit and unlit, day and night.
- The gruva, at the darkest hour, with and without the pick equipped. Threshold one to
  1-bit and confirm the veins are still findable.
- A shore tile with water on each of the four sides, plus an outer corner, an inner corner
  and a spit. Construct these; do not hope the existing maps contain them.
- Each tool mid-swing, one frame per phase.
- Every map's treeline, including all four corners.

Keep before/after pairs. Put them in the PR. If you changed how something looks and cannot
show the before and the after side by side, you do not actually know what you changed.

**Measure the performance, do not assume it.** The app's own `CLAUDE.md` states the
baseline honestly: terrain rasterising went from 3102 `fillRect`s per frame to 28, with a
~7800-rect rebuild when the cache key changes, and the full-screen fog-plus-night composite
costs about 0.59ms at 960×540. Instrument with `performance.now()` and report actual
numbers. Budget: rebuild under ~25k rects and under ~30ms (it must not be perceptible when
the day rolls over or you walk through a door), and under +2ms per frame added to the live
path. Adding a time bucket to the cache key means more rebuilds per day — measure that
specifically, and if it hurts, cache per-bucket canvases rather than rebuilding.

---

## 5. Definition of done

- All three check scripts pass.
- The screenshot matrix exists, and every one of the seven reported problems is visibly,
  demonstrably fixed in it.
- `index.js` is no larger than it was; new art lives in new siblings, each under 300 lines.
- No `Math.random()` in any cached pass. No alpha. No antialiasing. No new timers. `unmount()`
  still tears down everything.
- `apps/bekkedal/CLAUDE.md` is updated in the voice it is already written in: what the
  palette is now and why, how the lighting LUT works and what it replaced, what the
  autotiler does, where decor content lives, what the new check asserts. That file is the
  reason this codebase is workable — leave it at least as good as you found it.
- Root `CLAUDE.md`: the palette rule says all colour comes from `VGA16`. Bekkedal is now a
  second explicit exception alongside `standbattle`. Say so, in the same place, with the
  same directness — do not quietly leave the rule contradicting the code.
- Save compatibility: an existing `templeos.bekkedal.v2` save from before your change loads
  without throwing. If you changed the shape of `S`, `ver` is bumped and `heal()` backfills.
  Test it with a real pre-change save, not by reading the code.
- Committed in the seven-stage order from §2, each stage separately, on the designated
  branch.

---

## 6. What "surpassing expectations" does not mean

Be clear about this, because the failure mode is real and it is expensive:

- It does not mean a new rendering engine, WebGL, sprite sheets, or an asset pipeline. Every
  pixel in this game is a `fillRect` and that constraint is the reason it has a look at all.
- It does not mean more colours *used*. 64 available is not 64 per tile. The best-looking
  work here will use a handful of adjacent ramp steps per material and get its richness from
  value structure and dithering, not from variety. If the after-screenshot is busier than
  the before-screenshot, you have made the "eyesore" complaint worse, not better.
- It does not mean new gameplay, new maps, new items, new NPCs, or rebalancing. Where a
  visual change improves play — a followable ore seam, a legible exit, an ore type you can
  identify before you swing — take it. Where it would change the game, stop.
- It does not mean animating everything. The report asked for a *slight* animation on tool
  use and a *soothing* treeline. Restraint is the requested aesthetic. Motion that never
  stops is fatigue, and fatigue is the thing you were called in to fix.
- It does not mean skipping the checks because the screenshots look fine. `tile_check.js`
  catches an entire class of bug — a lattice you cannot see in one screenshot but that
  becomes a visible band across the map — that eyeballing structurally cannot.

The bar you are aiming for: someone opens Bekkedal at dusk, walks from the farm down to
the lake and into a lit house, and does not think about the rendering at all — because
nothing in it is asking to be noticed. That is what "surpassing" looks like on a game that
draws with rectangles.
