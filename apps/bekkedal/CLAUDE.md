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

The siblings carry what used to be tangled into the draw calls, plus the
scripts that check them:

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
- `palette.js` — the sixty-four colours, as twelve material ramps, plus the
  declared decorative tables (`MARKS` / `SHADOWS` / `FEATURES`) that say what
  may be drawn on what. No functions that draw, no state. See **Palette**
  below.
- `light.js` — the hour of the day as a transform of the palette, the
  anchors it is interpolated between, and the falloff a local light source
  is painted with. See **Light and the hour** below.
- `surface.js` — what a tile is made of: which glyph reads as which palette
  entry, on which map. The ground pass fills from it and `palette_check.js`
  walks every map through it, which is the point — one table, two readers.
- `autotile.js` — neighbour masks, a distance field, and the rounded-union
  signed distance that lets a transition be authored once and sampled in
  whichever direction the neighbours say. Knows nothing about water.
- `shore.js` — the shoreline: the profile, the surf, the bank. See
  **The shore** below.
- `water.js` — deep water and its depth ramp.
- `rock.js` — the mountain and the ore in it, including `oreKind`, which
  `act()` reads so the drop is the metal the tile was drawn as. See
  **The veins** below.
- `interior.js` — the inside of a house: boards, volume, wear, the rug and
  the wall seen from within. See **Inside a house** below.
- `decor.js` — the things in a room. The five pieces of glyph furniture, and
  a *kind* per prop; where each prop stands is content, in `BEK_DECOR`
  (`data.js`).
- `layout_check.js` — `node apps/bekkedal/layout_check.js`. See below.
- `tile_check.js` — `node apps/bekkedal/tile_check.js`. See below.
- `palette_check.js` — `node apps/bekkedal/palette_check.js`. See below.

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
- `node apps/bekkedal/palette_check.js` — the colour contract. Asserts that
  0–15 are still bit-exact `VGA16`, that no two of the sixty-four entries are
  the same colour, that every index above 15 belongs to a declared ramp (an
  entry no ramp claims is a swatch, and a swatch is budget nothing tests),
  that every ramp climbs in luminance with no step too wide to dither across,
  that every ramp shifts hue as well as value, and that every declared mark,
  shadow and feature obeys the contrast rule above. Run it after touching
  `palette.js` or any table the art picks colours out of.
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

### Sixty-four, in ramps

Colour comes from `palette.js` and nothing else. Never a literal
`rgb()`/hex string in a draw call, and never a bare index either: the art
says `C(GRASS[2])`, not `C(21)`.

The app used to draw out of `VGA16` (`kernel/god.js`). Sixteen is not a
small palette so much as a palette with no mid-tones, and the cost of that
showed up everywhere at once. A blade of grass was picked from
`TUFT = [10, 2, 10, 14, 10, 2, 3]` — luminances 0.86, 0.53, 0.93, 0.55, and
two of the four are not green. That is not variation *within* a material,
it is four unrelated materials fighting each other at one-pixel scale, and
it is why a field read as confetti. `noise.js` was never the problem; it
was dealing from a deck with nothing between `(0,170,0)` and `(85,255,85)`
to vary inside.

So: sixty-four indices.

- **0–15 are bit-exact VGA16, in the original order.** Every draw call that
  existed before the palette landed kept working the day it landed, the HUD
  and the menus stay TempleOS, and any regression stayed bisectable. Do not
  renumber them.
- **16–63 are twelve ramps**, three to six steps each, darkest first:
  `ATMO` (the air — vignette, far canopy, unlit ground), `GRASS`, `DRY`,
  `CON` (fir and spruce), `TIM` (timber), `STO` (stone, above ground and
  below), `SOI`, `WAT`, `SAN`, `SNO`, `WAR` (the emission ramp: falu red,
  ember, flame, lamplight — which is also the town's painted board, because
  that paint is iron oxide), and `ORE` (two hues no other ramp carries, so
  you can tell iron from copper before you swing).

Two rules the ramps are built to, both asserted:

- **Hue-shift, don't scale.** A shadow step leans blue or violet and drops a
  little saturation; a highlight step leans yellow. Scaling one hue's value
  up and down is exactly the flat look sixteen colours already gave us. This
  is most of the difference between "sixty-four colours" and "looks better".
- **Adjacent steps stay close enough to dither across.** Sixty-four indices
  plus the 4×4 ordered dither between any two of them is an enormous
  effective gamut — but only where a 50% stipple of two steps reads as a
  clean intermediate rather than as texture, which needs the two steps close
  in hue as well as in value. `RAMP_STEP_MAX` is the ceiling (`WAR` carries
  its own, wider one: its steps are colour temperatures and nothing dithers
  between them).

### The contrast rule

The tables the art draws its decoration from are declared in `palette.js`,
not scattered through `index.js`, because the check has to read the same
tables the art does. Three groups:

- `MARKS` — decoration on a surface: a blade of grass, a scuff of grit, a
  course in a plank. A mark stays within `MARK_BAND` (±0.12 relative
  luminance) of its surface's base. **One exemption**, and it is the
  important one: a colour that is the surface's own immediate neighbour in
  its own ramp is always allowed however wide that step is, because it is
  not a second material — it is the same material lit a little more or less.
  Everything crossing from one ramp to another has to earn its place inside
  the band.
- `SHADOWS` — an absence of light rather than a mark, so it may go darker
  than the band, but only darker and not past `SHADOW_MAX`.
- `FEATURES` — the exception the band exists to make meaningful: a flower
  head, an ore glint, a catch of sun on water. Features break the band on
  purpose, so they are declared apart, and the check fails a "feature" that
  turns out to sit quietly inside the band — that is a mark filed in the
  wrong table.

The result is a field that reads as one living green from three feet back
and resolves into detail up close. That is the whole exercise. If a change
makes the picture *busier*, it has made the original complaint worse.

### No alpha, still

Any blended or partial-coverage effect (weather, patches, soil wetting)
still goes through `dither()`/`ditherPat()`, which stipples between two
palette indices using the `DITHER` ordered matrix. There is no alpha
compositing anywhere in this app and there must not be — no `globalAlpha`,
no `rgba()`, no `ctx.filter`. A blend you cannot express as a stipple is a
blend you may not use. The stipple cell is drawn at `BEK_DITHER_PX`
(`BEK_DITHER_CELL * BEK_ART_SCALE`), not one device pixel: left at 1px it
would halve in apparent size and read as flat grey instead of dither. The
coarser pattern is also the faster one — the rasteriser repeats it fewer
times across the canvas.

`ditherPat` caches its patterns keyed by the target context as well as the
colour and strength, because a pattern must be created by the context that
will fill with it and the terrain canvas fills with the same stipples the
screen does. Sixty-four indices multiply that cache; keep an eye on it.

`wash()` is the patch-shaped case of the same thing — `ditherPat` clipped to
a rect — and it must be called *outside* a `native()` block, never inside
one, because it opens its own.

### Where the palette does not reach

`BEK_ITEMS[].col` and `drawIcon` are still VGA16 by choice. Item icons are
menu chrome that happens to also appear in the world as a dropped pickup,
and a pickup is supposed to pop. `panel`, `text` and `drawHud` are chrome
too. Everything in the playfield — ground, tiles, buildings, furniture,
crops, people, animals, weather and the ending painting — comes off the
ramps.

## The shore

`waterEdgeTile` used to be a hardcoded stack, top to bottom: deep water, a
`C(3)` band to y+16, a `C(9)` band to y+8, ripples, a foam line at exactly
`py + 28`, sand at `py + 30`, bank at `py + 34`. It had no idea where the
water was, so every `~` on every map drew that same north-facing beach. On
the lake, whose water is to the **south**, the sand was in the water.

The fix is not four rotations of the art. Four rotations is four times the
drawing to maintain, four chances to get one wrong, and it still says
nothing about the corners — which are most of a coastline. The profile is
authored **once** in `shoreBand`, as a one-dimensional function of signed
distance from the waterline, and `autotile.js`'s `profileT` samples it along
whichever direction the neighbour mask says the land lies.

`profileT` combines the named directions as a **rounded union**: inside any
named half-plane take the largest `t` (the exact signed distance, a mitre at
an inner corner — and an inner corner of a coastline is a cove, which does
have a corner), outside all of them take the negative *length* of the vector
of misses rather than the nearest single one. Where two adjacent sides are
named, that turns a right-angle contour into a quarter-circle arc, so the
bands wrap a headland instead of mitring two straight beaches together — a
mitre joint reads as a drawn line, an arc reads as a beach. The same formula
covers one named side (exact), two opposite (a channel), three (a spit) and
four (an island), so there is no sixteen-case table to get one entry of
wrong.

Three things follow that the old tile could not do:

- **The seam is continuous.** Foam breaks used to come from
  `edgeVar(map, x, y)` — per tile — so the surf restarted at every boundary
  and a straight shore showed a visible 40px rhythm. They come off
  `seamVar`, indexed by distance *along* the seam (a declared channel in
  `noise.js`, tested like every other), so a stretch of shore is one line of
  surf.
- **The tide breathes.** The foam band's position oscillates on a slow cycle
  keyed to the same seam coordinate. It costs a sine.
- **Ripples drift along the shore's own normal**, not always down the
  screen. They are hash-placed dashes, deliberately: they were briefly
  iso-contours of the profile, which drew concentric rings around a pond and
  made the lake read as a contour map.

### The shoreline the maps actually have

Only the lake and the fjord carry `~`, and between them there are ten tiles
of it. Most of this valley's coastline is a `g` sitting flat against a `W`.
Neither side of that boundary is a shore tile, so neither gets the full
profile — but each gets **its own half**, sampled the same way and meeting
at the tile edge: `bank()` on the land side (a short strip of wet sand and
dry sand up the beach), `nearShore()` on the water side (the shallows, with
the waterline one pixel in so the surf has something to break on).

The two halves wander *different* things, and that distinction matters.
Inside a `~` the waterline is in the middle of the tile and is free to move,
so it does — a beach that is the tile's outline offset by a constant is a
picture frame. On a plain boundary the waterline is pinned by geometry:
moving it would put sand in the water or water on the grass. So there the
wander moves how far the sand runs *up* the beach instead, which is free to
move and breaks up the coastline just as well without lying about where the
water is.

`LAND_REACH` and `BANK_REACH` must stay in step, or a `~` next to a `g`
steps its waterline sideways at the join.

### Cost

The neighbour mask does not change while you are standing on a map, so it is
computed once per cache rebuild and everything static — the bands, the sand,
the depth ramp — is rasterised into the cache. Only the surf and the ripples
are per frame, and the live scan is bounded to the strip a wave can reach
(`lim`), which on a plain boundary is five pixels of forty. The seam stream
is memoised per map: it is asked about the same hundred indices hundreds of
times a frame and `seamVar` allocates an object for each.

Measured: a lake rebuild is 10–23ms (the depth ramp is most of it), and the
live pass costs about +2ms a frame over open water. Deep water grades across
each tile as well as between tiles — an integer distance field steps a whole
ramp entry at a tile boundary, and a lake made of flat rectangles of blue is
what that looks like — but at two sub-cells a side, not four: four measured
34ms on the rebuild and the difference is invisible under the dither.

## The veins

The report was that the ore in the gruva is almost impossible to spot, and
the old `rockDetail` next to the old `rockGround` says why in one line: the
ore's largest bright mark was a 2×2 of `C(7)`, and `C(7)` was the *exact*
colour of the 9×6 and 7×6 lit faces the same function stamped on every
ordinary rock tile. The one mark meant to say "ore" was the same colour as
the noise it had to compete with, and smaller than it. Everything else
compounded that: an L\*46 brown on an L\*36 base is a ten-point step where
the plain faces already jumped thirty-four; there was no hue contrast
because the whole scene is grey; there was no silhouette difference because
an ore tile was a wall tile with different pixels on it; and the only
genuinely bright marks were the two smallest objects on the tile.

`rock.js` fixes it in the order the eye works in, and the order matters:

1. **Silhouette.** A vein breaks the rock face — a shadowed recess bitten
   into the stone (stepped, not rectangular), a cracked seam stepping right
   across the tile, crystal faces standing off the plane. The test is
   literal: `gruva_1bit` in the screenshot harness thresholds the mine at its
   own median luminance, and you can still find every vein.
2. **Value.** The matrix around a vein is `STO[1]`, *darker* than plain rock's
   `STO[2]`. You do not get contrast by adding bright pixels to a mid-grey
   field; you get it by putting bright pixels against dark ones.
3. **Mass.** One coherent body, not specks. Specks read as noise, which is
   what the rest of a rock tile already is.
4. **Hue.** Iron is rust ochre, copper is verdigris, silver is a cool white —
   three families declared in `palette.js` as `FEATURES.ORE_*` that no other
   ramp carries. `Q` is a different hue *and* a bigger body *and* more faces
   *and* satellite crystals, because walking to a vein you cannot mine yet is
   a small avoidable frustration the art can fix.
5. **Light.** Ore is specular. A single bright pair of pixels travels across
   the faces on a seven-second cycle, offset per tile so a wall of veins does
   not flash in unison, and it is the only part of a vein that is not in the
   terrain cache.

And one change that is a gameplay improvement rather than a picture: the
wall *around* a vein carries mineral traces that thicken as you get closer,
in that vein's own colour. One speck three tiles out, a run of them at one.
The rock tells you where to look.

### The die is rolled once per square, not once per swing

`act()` used to roll the metal on every mining: 55/30/15 iron/copper/silver
on `O`, 60/40 silver/copper on `Q`. `oreKind` applies **the same weights** to
a declared channel of the tile hash instead, so the vein you can see is the
vein you get and a square you come back to after it regrows is the same
square. No weight changed; what changed is *when* the die is rolled.

That has one consequence worth knowing before you change a map: on the gruva
as shipped, the four `Q` tiles all land on silver. Against the old
expectation (0.6 × 220 + 0.4 × 110 = 176 kr) a rich-vein swing is now worth
220 kr, about +25%; the twelve `O` tiles come out 9 iron / 1 copper /
2 silver, which averages 98 kr against an expected 104, about −6%. Neither is
a rules change and both are properties of *this* map — if the mix wants
tuning, move a tile rather than putting the randomness back, because the
randomness is what made the art a lie.

## Inside a house

A room used to be three tiled textures, and the report said so. `floorGround`
was a flat `C(6)` fill plus a noise wash. `floorDetail` was one horizontal
line at y+9, a vertical line every 10px, and — one tile in seven — a single
2×1 speck. That was the entire floor of every room in the game. The walls
were three courses and an outline; the furniture was eight glyphs drawn
byte-identically wherever they appeared.

### Boards, not tiles

`interior.js` lays floorboards **across the room** and reads them per tile,
which is the whole fix. Varying widths, varying lengths, staggered end
joints, a nail pair at every joist, and each board a slightly different step
of the timber ramp because it is a different plank. All of it comes off
**world position**, never tile position, so boards visibly cross tile
boundaries — nothing else here would have removed the tiled reading on its
own.

Two indexes make that affordable: `byCol` per board (which segment a tile
column starts in) and `rowOf` (which board a device row falls in). Without
them every floor tile walked all fifty boards and all their segments, which
was most of a 57ms rebuild.

`FLOOR_GRAIN` is weighted toward the base step on purpose. A board a step up
or down from its neighbour is a different plank; a floor where every board is
a different step is a deckchair.

### Volume, and wear that follows use

`volume()` casts a dithered shadow from the foot of every wall onto the
floor, and a tile touching two walls gets both — which is "the corners are
darker" without a second rule for corners. A room whose wall and floor are
both brown has no edges otherwise.

`traceWear()` replaces the old `WORN` patch, which was a low-frequency noise
field — so the floor was worn in places nobody walks. Wear is now computed
from the room's own layout: the line from the door to the hearth, to the bed
and to the table, about two tiles wide and fading out, with a per-tile step
of jitter so its edge is not a drawn contour.

### The things in a room

`decor.js` holds *kinds*; `BEK_DECOR` in `data.js` holds where each one
stands. That split is what lets the farm cabin and the house by the water be
two different people's houses — the cabin is somewhere work happens (kettle,
woodpile, boots, broom, herbs drying from the beam), the lake house is the
one you built to be quiet in (lamp, rod, creel, flowers on the sill, which is
what Marit asked for). Adding a room later costs no code.

Three rules for anything added there:

- **It must not change walkability.** `solid()` reads `BEK_SOLID` against the
  map glyph and knows nothing about decor. Props on floor squares are squares
  you can stand on, and the player draws in front of them.
- **Everything in a room is some shade of timber, the floor included**, so a
  prop drawn in timber on timber is invisible. Each carries an ink outline, a
  contact shadow, or a material that is not wood — pale cut log ends, a grey
  cat, black rubber boots. Value first, then colour; the ore taught the same
  lesson.
- **A prop on a tile that is itself redrawn every frame is drawn live too**,
  or the tile paints over it. That is how the kettle spent its first
  afternoon invisible behind the fire.

The candle and the lamp are in `LIGHTS`, so the room's light pass finds them
without a second table. The cat is in `LIVE` and breathes on a slow cycle —
the only animation in a room, which is the point of it.

### Cost

A lit interior rebuild measured 20–23ms, split roughly ground 5 / detail 5 /
light 12. The light pass is the expensive half because a pool is several
hundred stipple cells; batching a whole pool inside **one** `native()` rather
than letting `wash` open one per cell took it from 25ms to 12. Anything that
draws hundreds of small rects should do the same.

## Light and the hour

### Night is a palette, not an overlay

It used to be one line — `if (night()) dither(1, 9)` — a full-viewport
stipple of index 1, pure `(0,0,170)`, at strength 9 of 16. That failed three
ways at once and all three were the bug report: it did not darken the
picture but *replaced* 56% of it with one saturated blue; the stipple cell
is `BEK_DITHER_PX` (eight device pixels) so across 960×540 the ordered
matrix read as a static high-frequency crosshatch over everything, which is
genuinely fatiguing to sit in; and it snapped from strength 5 to strength 9
between two frames at 20:00 exactly.

What replaces it draws nothing. `light.js` gives every palette index a
variant for the hour and `C(i)` resolves through it, so the terrain cache
rasterises in night colours directly. Zero overdraw, no stipple, and the
image keeps its *structure* — a grass tile is still readable as grass at
midnight, it is just night-grass.

A light state is `{ k, sat, a }`, applied to every entry as: desaturate
toward the entry's own luminance by `1 - sat`, scale all three channels by
the scalar `k`, add the tint `a`. **`k` is a scalar and not a per-channel
multiplier, and that is load-bearing**: work the luminance through and

    lum(out) = k · lum(in) + (0.2126·aR + 0.7152·aG + 0.0722·aB)

— the saturation term cancels exactly and what remains is affine and
increasing, so no hour can reorder two entries by luminance. That is why a
night ground still reads as ground and not as the wall beside it, and it
holds for any anchor anyone adds later rather than because the current
numbers happen to work. A per-channel multiplier buys a slightly prettier
midnight and loses the guarantee. `palette_check.js` asserts the
consequence directly.

Eleven anchors around the clock are interpolated between, not switched at.
**Midday is exactly the identity** and the check asserts it: what the art
was authored in has to be what the art looks like at noon.

Two states are not on the clock. A room is `shelter`ed halfway back toward
daylight (four walls and a fire), and the gruva uses `CAVE_LIGHT` — a hole
in a mountain does not have an hour.

### Why the state is quantised

The terrain cache has to rebuild whenever the LUT changes, so the LUT must
not change every frame. `lightAt` quantises `k`, `sat` and `a`, and the LUT
is built from the *quantised* numbers — so two minutes with the same
`lightKey` have byte-identical LUTs, which is the whole contract between
`light.js` and the cache. Quantising the state rather than the clock is
what makes the flat stretches free: 10:00 to 16:00 is one key and never
rebuilds.

Both halves of that trade are asserted rather than asserted-in-a-commit-
message: the check measures the largest ten-minute channel step (a coarse
quantum makes the day turn over in visible jumps) and the number of keys a
day resolves to (each one is a rebuild). Measured on this machine a rebuild
is 5–12ms and there are ~300 a day, nearly all of them inside the ~90 real
seconds of dawn and dusk — about 2% of a frame budget, and never a visible
hitch. If you make the quanta coarser, say why.

### Local light

The curve is what makes night *comfortable*; local light is what makes it
*inviting*, and they are different things. Sources are the hearth `v`, every
window actually drawn on an `H` wall, and a lantern the player carries in
the gruva. Each is two ordered-dither passes — a wide outer pool of `WAR[1]`
and a tighter core of `WAR[3]` — so the pool changes colour *temperature*
outward and not only strength. Light gets redder as it dims; pull the outer
pass toward yellow instead and it reads as a spotlight. The stipple is taken
in **daylight** colours (`wash`'s last argument, `ditherPat`'s `day` flag),
because a fire is as bright at midnight as at noon.

Two details worth keeping:

- The falloff is flat-topped and steep at the rim (`1 - u³`), and anything
  below strength 2 is dropped. A smooth bell spends most of its *area* in
  the outer ring where the strength is 1–3 out of 16, and at an eight-pixel
  stipple cell that is not a soft edge — it is a spray of loose orange
  squares over the grass.
- **Static sources are painted into the terrain cache**, because the light
  key is already part of the cache key, so a lit window costs nothing per
  frame. Only what moves or flickers is redrawn live: the hearth's reach
  breathing on the same cycle as its flame, and the lantern.

Light does not spill into the void: the ` ` margin outside a room's walls is
repainted black after the light pass.

`moonKey` is the other half — one cool key light from above and a little to
the left, as a two-pixel rim along the top of anything solid and a
one-pixel lick down its left side, drawn through the *hour's* table because
moonlight is ambient and not a lamp somebody lit. It is what stops a night
reading as one flat sheet of dark. It skips the border ring and jitters one
step per tile off an already-declared channel, because a long run of the
same glyph lit at one strength is not moonlight, it is a dotted line ruled
across the picture.

### The chrome stays out of it

`useLut` swaps the active table: the playfield draws through the hour's,
and everything from `drawHud` down draws through `DAY_CSS`. The two HUD
bands, the panels, the menus and every glyph of text keep full contrast
after dark without any of them having to ask. `ditherPat`'s cache is keyed
by the LUT as well as by the context, colour and strength, and swept when
the hour's table changes, so patterns baked at one hour are never filled
with at the next.

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
