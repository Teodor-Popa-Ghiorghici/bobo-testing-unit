---
paths: ["apps/bekkedal/palette.js", "apps/bekkedal/light.js", "apps/bekkedal/noise.js", "apps/bekkedal/surface.js", "apps/bekkedal/autotile.js", "apps/bekkedal/shore.js", "apps/bekkedal/water.js", "apps/bekkedal/rock.js", "apps/bekkedal/forest.js", "apps/bekkedal/interior.js", "apps/bekkedal/decor.js", "apps/bekkedal/crops.js", "apps/bekkedal/actors.js", "apps/bekkedal/fx.js", "apps/bekkedal/font.js", "apps/bekkedal/text.js", "apps/bekkedal/layout.js", "apps/bekkedal/music.js", "apps/bekkedal/ambience.js"]
---

# Bekkedal art and rendering

See `apps/bekkedal/CLAUDE.md` for the file map, hard invariants, and pointers.
This file carries the full art/rendering doctrine for the siblings above.

## File split — per-file detail

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
  luminance ordering and the band constants the contrast rule is stated in,
  and `rampStep`. No functions that draw, no state. See **Palette** below.
- `palette_marks.js` — the declared decorative tables (`MARKS` / `SHADOWS` /
  `FEATURES`) that say what may be drawn on what, split off `palette.js` for
  the 300-line rule when the portraits added a seventh kind of surface to
  them. It imports the ramps; nothing in `palette.js` imports it back, because
  a re-export would put the two in a cycle and import bindings hoist. See
  **Palette** below.
- `light.js` — the hour of the day as a transform of the palette, the
  anchors it is interpolated between, the state a local light resolves what
  it lights *toward* (`lampState`), the closed-form inverse that lets it be
  applied to already-rendered pixels (`relightCoef`), and the falloff a
  source is painted with. See **Light and the hour** below.
- `lamp.js` — the local-light pass itself: one strength field composed from
  every source, and the per-pixel ordered dither between the picture at this
  hour and the picture in daylight. See **Local light is a palette too**.
- `surface.js` — what a tile is made of: which glyph reads as which palette
  entry, on which map. The ground pass fills from it and `palette_check.js`
  walks every map through it, which is the point — one table, two readers.
- `autotile.js` — neighbour masks, a distance field, and the rounded-union
  signed distance that lets a transition be authored once and sampled in
  whichever direction the neighbours say. Knows nothing about water.
- `shore.js` — the shoreline: the profile, the surf, the bank. See
  **The shore** below.
- `building.js` / `roof.js` — a house, as one elevation authored as a
  function of a tile's vertical position inside its own building. See
  **The facade** below.
- `water.js` — deep water and its depth ramp.
- `rock.js` — the mountain and the ore in it, including `oreKind`, which
  `act()` reads so the drop is the metal the tile was drawn as. See
  **The veins** below.
- `interior.js` — the inside of a house: boards, volume, wear, the rug and
  the wall seen from within. See **Inside a house** below.
- `forest.js` — the ring of trees round every outdoor map, as one continuous
  strip. Also the lone trees inside a map, so a tree in a field and a tree in
  the wall are the same tree. See **The treeline** below.
- `fx.js` — the swing: its three phases per tool, the arc the held tool
  travels, and the little ballistic particle list the chips, dust and spray
  come out of. See **The swing** below.
- `crops.js` — the ploughed plot and what grows in it. The one tile that
  reads `S.soil` rather than the map, which is why it is live and not cached.
- `actors.js` — the people, the animals, and the item icons.
- `portrait.js` — the eight faces: one head-and-shoulders rig, parameters per
  character, three expressions. See **The faces** below.
- `menus.js` — every panel the game puts over the picture. All chrome, so all
  of it draws after the LUT goes back to daylight.
- `menus_talk.js` — the two panels a *conversation* puts up, split off for the
  300-line rule. See **The faces** below.
- `music.js` — five tunes and the crossfading scheduler that rotates them.
- `ambience.js` — a bed per map, weather and the hour layered over it,
  positional hearth crackle, and material footsteps. See **Ambience** below.
- `decor.js` — the things in a room. The five pieces of glyph furniture, and
  a *kind* per prop; where each prop stands is content, in `BEK_DECOR`
  (`data.js`).

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


## Canvas, camera and tile coordinates

The canvas is 960×540 (16:9) at `BEK_T` 40. **The map is whatever size its own
rows are** — `mapCols(id)`/`mapRows(id)` (`data.js`), at least 24×15 and with
no ceiling. The camera scrolls and clamps on **both** axes off that map's own
`camMaxX`/`camMaxY`, and clamping is what keeps the outermost map rows and
columns welded to the frame instead of letting blank space creep in past the
edge of the world. `layout_check.js`'s camera assertions exist to keep it that
way. Full doctrine — the per-map dimensions, the one clamp written once, and
the region a rebuild covers — is in `.claude/rules/bekkedal-engine.md`
(**Maps are not one size**).

A 24×15 map is 960×600, which is an exact fit horizontally and a 120px
overhang vertically, so on those maps the camera still only travels down the
valley. That is a property of those maps and not of the camera.

The 540px height is two 30px HUD bands (`BEK_HUD_H`) with a 480px viewport
between them. The bands are reserved chrome outside the playfield: the status
strips no longer sit on top of the first and last rows of the map, and weather
and night overlays are clipped to the viewport so the HUD keeps full contrast
after dark.

All map data in `BEK_MAPS.*.rows`, all NPC/goat positions, and all per-tile
state keys (`S.soil`, `S.felled`, `S.mined`, `S.picked`, `S.drops`) are stored
in tile coordinates (grid x/y), never pixels. **The grid does not change with
the resolution** — it changes with the map, and only with the map.



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
later. Both render into `terrCv`, an offscreen canvas sized to the current map
(device pixels, so nothing that has already converted to native resolution
loses half of it), and `draw` blits that at 1:1 before it applies the art
transform.

The cache key is everything the two static passes read: `S.map`, that map's
dimensions, `S.day` (felled/mined/picked all expire against it), `S.built`,
`terrBump` (a counter) — and the tile region this rebuild is responsible for.
On every map that fits one screen the region is the whole map and drops out
as a constant; on a larger one it is the viewport plus a margin, and
`.claude/rules/bekkedal-engine.md` (**One rebuild covers a region, not a
map**) carries why, with the measured numbers.

**Any new mutation of `S.felled`, `S.mined` or `S.picked` must call
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
  every panel on screen, and per map: rectangular rows, no smaller than
  24×15, and a camera clamp range matching its own dimensions), the
  fishing reel zone's agreement with its hit test, and text fitting for every
  box in both languages, including the repeatable board's own worst-case
  generated title/detail strings. Also the dialogue box's own two columns —
  that the portrait column and the text body are flush, that the portrait is a
  whole number of art pixels, that the two columns and their gutter fill the
  box exactly, and that the name plate holds the longest speaker. Run it after
  touching `data.js` geometry, `font.js`, `layout.js`, or any content table
  with user-visible strings. The two guards that go *with* the box are
  conventions rather than geometry and live in `node scripts/lint-content.mjs`
  instead: **no spoken string in `BEK_TALK` begins with a speaker's name and a
  colon** (the plate already says who is talking), and every mood a line asks
  for is one `portrait.js` can actually draw.
- The reel zone is the subtle one. `tickFish` compares `fish.pos` against
  `z0`/`z1` in 0..1 and knows nothing about pixels; the drawn zone and the drawn
  needle are both `FISH_TRACK_W` multiplied by those same figures, and both
  edges of the zone are rounded the same way the needle is. Round the zone's
  *width* separately and the drawn zone drifts a pixel off the real one, so the
  player misses a catch that looked like a hit.

## Cost

Measured, not guessed, and measured *warm* — the first rebuild after a load
carries module init and JIT warm-up and reads two to three times the steady
figure, which is why a single cold sample is not evidence. Median of five
rebuilds per map, Chromium on the dev container:

| map              | rebuild | rects  | live/frame |
|------------------|---------|--------|------------|
| farm 12:00       |  9.8ms  |  8591  |   0.47ms   |
| farm 23:00       |  7.6ms  |  8716  |   1.65ms   |
| lake 12:00       |  8.1ms  | 10548  |   1.65ms   |
| lake 23:00       | 10.6ms  | 10554  |   2.98ms   |
| gruva 23:00      |  6.5ms  |  3698  |   0.56ms   |
| farmhouse 23:00  |  3.2ms  |  4067  |   1.20ms   |
| forest 12:00     |  7.3ms  |  9244  |   0.43ms   |
| fjord 12:00      | ~10ms   | 10507  |   1.76ms   |
| vidda 12:00      |  9.7ms  |  4951  |   0.93ms   |
| town 12:00       |  6.5ms  |  8097  |   0.48ms   |

Worst rebuild 10.6ms against a 30ms budget; worst 10,554 rects against
25,000; worst settled live pass 2.98ms of the 33.3ms a 30fps frame has.

Those are 24×15 maps, and the figures are proportional to area — a 48×30 map
rasterised whole measures 42–50ms and 26,011 rects, which is why a rebuild
covers a region rather than a map. See `.claude/rules/bekkedal-engine.md`.

The one figure that looks wrong is fjord at 20:00, which reads 4.64ms a
frame. That is not an expensive live pass — it is dusk. `drawMs` is an EMA
over the whole of `draw()`, and `draw()` calls `terrain()`, which is a cheap
early return only while the light key holds. At 20:00 the key turns over
about ten times in four seconds and the EMA averages those rebuilds in. Move
the same map to noon and it reads 1.76ms. Watch `rebuilds` beside `drawMs`
before concluding anything from it.

`__bekDebug.rects()` is what the rects column comes from: it wraps
`fillRect`, forces one rebuild, and unwraps. It is on demand rather than
always because a wrapper is an extra call per rect, and paying that on every
rebuild would inflate the millisecond figure sitting next to it. For the
same reason, never read `drawMs` in the same breath as calling it — a forced
rebuild lands in the average and roughly triples the number.

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

The tables the art draws its decoration from are declared in
`palette_marks.js`, not scattered through `index.js`, because the check has to
read the same tables the art does. (They were in `palette.js` until the
portraits added a seventh kind of surface and took that file over the
300-line ceiling; what they are *stated in* — the ramps, the luminance
ordering, `MARK_BAND`, `SHADOW_MAX` — stayed there.) Three groups:

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

`lamp.js` is the one blend that does not go through `ditherPat`, and it is
inside this rule rather than an exception to it. What it blends between is two
*pictures* — the picture at this hour and the same picture in daylight — which
is not something a two-colour stipple tile can express, so it reads the
`DITHER` matrix per pixel instead and writes one of the two whole colours. It
is a more literal ordered dither than `ditherPat`, not a looser one: no
partial coverage, no `globalAlpha`, no `rgba()`, no `ctx.filter`, and no
compositing mode. The one thing to keep in mind if you add another caller is
that its matrix phase comes from the coordinates it is *handed* and is not
transformed by anything, where `ditherPat`'s pattern goes through the current
CTM. So the two agree only when they are given the same space, and the
lantern is the case where they are not: the pool is applied in screen pixels
(that is what lets it reach the player and the drops) while its veil is drawn
in world pixels under the ambient transform. That costs nothing, because they
are separate layers in different colours and nothing has to line up — but do
not build something that assumes they do.

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

## The treeline

The outer ring of all nine outdoor maps is `T`, and it used to be seventy
stamps of one 20×20 fir on a 40px cadence with nine variants between them
(`lean` 0–2 × `lit` 0–2) arranged in a perfect grid, and flat black in the
gaps. It frames every scene in the game and its left and right columns are on
screen at all times.

The fix starts by refusing the tile. A treeline is a band, not a row of
squares, so `forest.js` draws it as one continuous strip per side and
**nothing in it lands on a 40px cadence** — trunks are spaced eleven to
twenty-nine pixels apart off `treeVar` (a declared channel indexed by
distance *along* the band, not by tile) and overlap freely. The grid
disappears the moment nothing is aligned to it, and no number of extra
variants on a stamped tile would have done that.

On top of that:

- **Three depth layers, and value carries the depth.** A far canopy at low
  contrast, a mid layer, and a near layer of dark boughs that overhang the
  playfield by a few pixels. All three are steps of the *conifer* ramp, and
  deliberately not the atmosphere ramp: distance pulls a thing toward the
  colour of the air when there is sky behind it, and behind this band there
  is forest, so the first pass's blue-grey far layer read as rubble.
  Atmospheric perspective here means less contrast against the dark, and the
  dark is green.
- **Species, weighted per map**, from `BEK_TREES` in `data.js` — birch-heavy
  at the farm and the meadow, dense dark spruce closing in on the mine and
  the forest, stunted and thinned on the poor ground, snow-loaded at the
  setra. `density` under 1 spaces the trunks and shortens them.
- **Something in the gaps.** Forest floor and undergrowth where there was flat
  black. That was half the complaint.
- **The corners are the deepest part of it.** Three overlapping washes down
  each arm, because a corner is where two bands of wood meet and the least
  light gets in. They used to place the same tree twice at right angles.

`edgeMark`'s hard 4px black frame with a grey lip is gone: with a real band
behind it that is a drawn line around a picture that no longer needs one.
What is left is a vignette dithering away into the wood, plus **timber posts
only where the ring is open** — an exit should be more legible than the wall
around it, so the trees and the undergrowth both stop at a gap and the map's
own ground runs into the mouth of it.

Birch is the one broadleaf, so it is the one that must not read as a fir:
lighter foliage off the *grass* ramp, and a crown of four courses of
different widths. A single rectangle of green on a white stick is a lollipop,
which is exactly what the first pass looked like.

**No motion.** The near boughs could sway, and the brief that asked for this
allowed it — but it would move the whole band out of the terrain cache for
one or two pixels of amplitude, and a permanently animated border is the
opposite of the soothing thing that was asked for. If you add it, measure the
rebuild first: the band alone is 12ms of a 24–29ms rebuild.

## Density

The report was that a wide shot of any of the six wild maps, HUD covered,
told you nothing but the treeline: forest read as a mown lawn with trees on
a grid, the vidda read as the farm's grass with boulders dropped on it, and
the setra, enga, fjord and gruva were some shade of the same undifferentiated
green or grey with a building or a rock wall standing in it. `959660d`
(**Populate the farm, town, lake and both interiors**) had already done the
equivalent job for the valley floor — `wear.js` for desire-line paths off a
map's own door/road/field glyphs, `decor_outdoor.js` for outdoor prop kinds,
placements in `BEK_DECOR` — without writing down the pattern as doctrine.
This is that doctrine, now that the wild half of the valley has been through
the same pass.

**Ground gets patch-level variation from channels that already exist.**
`noise.js`'s `PATCH`/`LOW` tables (DRY, LUSH, MOSS, DAMP, WORN, DUST, plus the
discrete MEADOW and VEIN) are declared, salted per map, and covered by
`tile_check.js` — reusing one at a *different call site*, with a different
mark colour, is free: `pathGround` and `grassGround` already shared DUST and
DRY this way before this pass, and the wild maps' own ground now does the
same. The forest's needle litter is DUST washed in DRY[1] rather than SOI —
the same field pathGround already uses for dry grit, painted where grass
detail runs instead of where path detail does. Its moss-in-shade is MOSS
washed in a new `SHADOWS.MOSS_SHADE` (CON[1] on GRASS[2], darker and so a
shadow rather than a mark). The vidda's exposed bedrock is DAMP washed in a
new `MARKS.BEDROCK` (STO[2] on GRASS[2], which lands inside the band on its
own — no feature exemption needed), its lichen is MOSS washed in CON[3],
already a declared TUFT colour and so needing no new table entry at all, and
its LUSH wash is switched off outright: an alpine plateau has no wetter,
greener run to speak of. None of that added a channel `tile_check.js` does
not already cover. The one exception is `FEATURES.SNOWDRIFT` (SNO[0]/SNO[1]
on GRASS[2], the one mark on grass this game draws *lighter* than its
surface) — a drift in the lee of a boulder is genuinely a different thing
from a patch of ground, not a recoloured existing field, so it earns a new
declared table the way ore's three hues did. It is placed per-boulder off
`^`'s own already-declared `cap`/`my` channels rather than as a region field,
because a drift belongs to a specific rock and not to a stretch of map.

**A cadence bug hides in a tile that looks fixed even when its ring
doesn't.** `forest.js`'s treeline ring already draws as one continuous band
off `treeVar`, nothing on a 40px grid — but the handful of `T`/`G`/`Y` trees
loose *inside* a map were still stamped dead-centre of their own tile,
`x*BEK_T+20`, every time. Two of the three recipes in `noise.js`'s `R_OBJ`
table already declared a spare pair of channels nothing drew from (`sx`/`sy`
on `T`, `lx`/`ly` doing double duty as the fallback on `G`/`Y`, since `Y`
never had its own `sx`/`sy`) — spending those on a jittered trunk position,
the same way `spot()` places a blade of grass, breaks the cadence without a
new channel or a new declaration. Check for this kind of thing wherever a
band and a stamped scatter of the same object coexist on one map: fixing the
band's own cadence does not fix the loose copies of the thing the band is
made of.

**Man-made and scenery evidence is decor, split by budget rather than by
theme.** `decor_wild.js` is a new sibling next to `decor_outdoor.js` for the
same reason `decor_outdoor.js` exists at all — `decor.js` was already at the
300-line ceiling and `decor_outdoor.js` had no room left for fifteen more
prop kinds — not a second organising principle. It holds deadfall/fungi/root
for the forest floor, a cairn for the vidda, milk churns for the setra
(which reuses the farm's own `stonewall` kind for its dry-stone walls rather
than declaring a second wall), a hay rack for the enga, kelp/driftwood/
gullrock/slipway/jetty posts for the fjord, and timbering/rail track/an ore
cart/spoil heaps/a ladder for the gruva — the only map in this pass whose
*ground* art (`rock.js`) was left untouched by design, because it was
already the best-looking map in the game and the report only ever asked for
more evidence of people having worked it. Every kind still answers the three
rules `decor.js`'s own header states: it must not touch `BEK_SOLID`, it must
carry a material, an ink outline or a contact shadow so it does not vanish
against what it stands on, and nothing here animates so none of it needs
`LIVE`. Placement is still content, in `BEK_DECOR`, checked the same way
`world_check.js` already checks the valley floor's: every coordinate lands
inside the room it claims to be in, never on the dead margin.

**Two marks were placed rather than derived, and that is a deliberate
exception, not a slide back to hand-authoring.** The setra's goat-track and
the dairy hut's own turf roof needed no new code at all — `wear.js` already
derives a desire line from whichever door and landmark glyphs a map
actually has, and `surface.js`'s `rustic()` already lists the setra among
the turf-and-laft maps, so both requirements from the brief were already
true the moment the hut's `D` and `.` existed on the map. The enga's mown
strip and its flower clustering are the two marks in this pass that are not
derived that way. The strip is a straight column range in `grassGround`
washed in `GRASS[1]` (an in-ramp neighbour of the base fill, so it needs no
declaration) — a literal cut, because a scythe does not run a desire-line
algorithm, it runs a straight line, and pretending otherwise would be
derivation for its own sake. The clustering reuses `LOW.VEIN` — declared,
salted, tested, but never otherwise drawn on grass — at its own period to
pick a flower's *species* from the coarse cell a tile falls in rather than
from the tile's own high-frequency channel, so one corner of the meadow
reads gold and the next reads blue instead of every colour scattered evenly
across the whole field. Both changes stayed inside the discipline that
matters — no new channel, no per-frame cost, nothing outside the terrain
cache — even though neither one is "derived from the map's own content" in
the sense `wear.js` is.

### Cost

Measured warm, median of five forced rebuilds via `__bekDebug.rects()`/
`perf()`, same methodology as every other table in this file — see **The
terrain cache → Cost** for the six wild maps' own before/after figures.

| map          | rebuild | rects | live/frame |
|--------------|---------|-------|------------|
| forest 12:00 | 15.9ms  | 12840 |   9.52ms   |
| vidda 12:00  | 13.3ms  |  9820 |   6.81ms   |
| setra 12:00  | 11.3ms  |  7184 |   5.68ms   |
| enga 12:00   | 12.2ms  | 10342 |   6.33ms   |
| fjord 12:00  | 13.0ms  | 13636 |   8.20ms   |
| gruva 12:00  | 13.7ms  |  7559 |   7.43ms   |

Worst rebuild 15.9ms against the 30ms budget, worst 13,636 rects against
25,000 — both well inside, and these are the six largest maps in the game
(42x26 to 44x30, the region path already carrying the cost of that). All six
routed through the same `grassGround`/`grassDetail`/`tileDetail` passes every
other outdoor map already pays for; nothing here runs outside the terrain
cache, so none of it costs anything per frame beyond the existing live
glyphs (`W`/`~`/`v`/`O`/`Q`/`R`).

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

A lit interior rebuild measured 20–23ms when the room art landed, split
roughly ground 5 / detail 5 / light 12, and batching a whole pool inside
**one** `native()` rather than letting `wash` open one per cell is what took
the light half from 25ms to 12. Keep that rule — anything drawing hundreds of
small rects should batch the same way.

**Do not quote the numbers.** They do not describe this container and have not
for some time: a farmhouse rebuild measures 3.0ms here, of which the light
pass was 0.9ms before the local-light rework and 5.4ms after. The current
figures are in **Local light is a palette too → Cost** above. Measure before
quoting, and measure warm.

## The facade

Every building was a flat rectangle of roof seen from directly above with a
window glyph on it. `tileDetail` drew `'R'` as two bands of the wall's own
colour, `'H'` as three horizontal lines at y+6, y+13 and y+18, and `'D'` as a
12x17 slab with a two-pixel handle — each at a fixed offset inside its own
tile, each byte-identical on every square it appeared on. Stack three rows of
that and there is no pitch, no eave, no facade, no foundation, no door you can
read as a door and no chimney. It was the single largest reason the town did
not read as a town.

The map data already says what a building is, and says the same thing in all
twelve of them, from the farm to the house you build by the water:

    RRRRR      one row of roof
    HHHHH      the upper wall course
    HHDHH      the lower one, with the door in it

So a building is a **vertical stack**, and the elevation is authored **once**,
as a function of one number, exactly the way `shoreBand` authors the beach as
a function of signed distance from the waterline. `wallBand(v, h, M)` takes
the device-pixel distance below the eave line; `roofBand(u, rh, M)` takes the
distance below the ridge. Each tile draws its own forty-pixel slice. Four
hand-drawn variants would have been four things to maintain, four chances to
get one wrong, and would still have said nothing about a gable end.

Three things follow from authoring it in *building* space rather than tile
space, and none of them was available before:

- **The courses run across the seam** between the two wall rows, which is what
  removes the tiled reading — the same thing `interior.js`'s floorboards coming
  off world position did indoors. The rhythm is deliberately the 12px one
  `interior.wall` uses, because it is the same wall seen from the other side.
- **A feature can be taller than a tile.** A window is 28px and sits across
  that seam, drawn in two pieces by two tiles that never have to agree about
  anything except where the eave is. The door does it upward: it is drawn by
  the `D` tile and rises into the `H` above, because the detail pass runs top
  to bottom and the later tile wins. That is the whole reason it reads as a
  door rather than as a hatch.
- **The eave shadow, the plinth and the ground line are stated once**, as
  distances, instead of as offsets in whichever tile they happen to land in.

The horizontal half comes from `autotile.js`'s `mask4` — whose own header
named roofs as an intended consumer years before anything used it for one.
`AT_W`/`AT_E` absent means a gable end: the log ends of a laftehus cross at the
corner, or a painted house gets its white corner board, and the wall face steps
back so the roof visibly overhangs it. **The overhang is expressed by
insetting the wall, never by outsetting the roof** — a roof drawing into its
neighbour would be repainted over by that neighbour a moment later, in one
direction but not the other.

### Two dressings, and no new red

`surface.js` already sorted the maps: turf and laft on `rustic()` (the farm,
the seter, the meadow and the house by the water), painted board on the town
and the fjord. The paint is `WAR[1]` because falu red **is** iron oxide and the
emission ramp's bottom step already was that paint.

The one colour that moved is the town's roof. It was `WAR[1]` — the same red as
the boards under it — so a building was one block with a line ruled across it.
It is `STO[2]` dark tile now. That is both what these buildings are and the
only thing that separates the two planes at every hour: the eave's shadow
between them is *structural*, so it survives the night curve and the 1-bit
threshold alike, where a hue difference would not.

`tileGround` used to fill an `'R'` with `solidOf(map, 'H')` — it asked about the
wall — so `surface.js`'s own answer for `'R'` was read by `palette_check.js`
and by nothing else. A table that is checked but never drawn from is a
fiction; the ground pass asks about the glyph it actually has now. **If the
roof's base fill moves, both have to move together.**

### What makes it findable

`gruva_1bit` proved the ore by threshold; `town_1bit` does the same for a
house. Threshold the town at its own median luminance and what is left of a
building is its trim, its openings and its silhouette — the white corner
boards and window frames, the door's frame, the chimney breaking the ridge
line, and the roof's course rhythm reading finer than the wall's. A facade
built only out of marks inside the band thresholds to one grey rectangle,
which is exactly what the old one did. That is why the trim, the lit glass,
the door's iron, the ridge capping and the chimney cap are all in `FEATURES`:
they are the marks the eye is meant to land on, and every one of them is thin.

### The chimney, and the one live thing

A stack sits on one roof tile per building. It is found without a flood fill:
a roof row is a horizontal run, so walk it to its ends and pick a column inside
it off a declared channel rolled at the run's own origin — every tile of the
run computes the same origin, so every tile agrees. It is drawn *up* into the
tile above, which the detail pass laid down first, and it is ink-outlined the
way `forest.js` inks a fir: a grey stack on a green turf roof is two colours of
one luminance and would otherwise be invisible.

Smoke is the only part of a building that is not in the terrain cache. `'R'`
is in `LIVE` and every roof tile that is not a chimney early-returns on one
array read. A household lights its fire when it is cold and dark, and the
threshold is jittered per chimney off its own declared channel, so a town comes
on the way a town does rather than the way a switch does.

### Windows are a column's decision, not a tile's

`objVar('H', x, eave).win` is rolled at the **eave row**, so both wall courses
agree and the opening can be taller than either. `lightSources` asks
`building.windowAt` for that same answer, so a window that is drawn is a window
that lights and there is no second table saying where they are. The rate went
from two-in-five per *tile* to three-in-five per *column*: two courses of the
old roll came out as five scattered openings on a six-tile house and **none at
all** on the fjord's, and every building in the valley now has at least one.

### Cost

Measured warm, before and after, on this container by the same probe — the
before half served out of a `git worktree` of the branch point on :3001.

| scene            | live/frame before | after  | rects before | after |
|------------------|-------------------|--------|--------------|-------|
| town 23:00       |  3.30ms           | 3.48ms |  7051        |  7611 |
| town 12:00       |  1.10ms           | 1.22ms |  6941        |  7533 |
| farm 23:00       |  3.31ms           | 4.15ms |  8725        |  8937 |
| lake built 22:00 |  2.48ms           | 2.38ms | 11645        | 11801 |
| gruva (no house) |  1.06ms           | 0.99ms |  7512        |  7512 |

Rects are up 2-9% and the worst is 11,801 against the 25,000 budget. The live
pass gained at most ~0.8ms of the 33.3ms a 30fps frame has, and the map with no
buildings on it is bit-identical, which is the check that the change is where
it says it is. Rebuild time measured across the dusk key-churn came out
35.9/38.7/42.3ms before against 40.6/37.4/39.9ms after — unchanged inside a
scatter whose own maxima range from 42 to 70ms.

**Do not read the 30ms budget off those dusk figures.** Both halves sit above
it, before the change as well as after, because that probe deliberately
measures back-to-back rebuilds while the light key is turning over ten times in
four seconds. It is a comparison, not an absolute; measure a settled hour if
you want an absolute.


## The faces

The dialogue box was a black rectangle with one line of text in it, no
portrait, and the speaker's name printed **twice** — once as a yellow header
the panel drew, and once inside the line itself, because two hundred and
eighteen of the strings in `BEK_TALK` opened with `'ASTRID: '`. Eight people
live in this valley and you could finish the game without seeing any of their
faces.

### One rig, not eight drawings

`portrait.js` is built the way `actors.js` builds the walking sprites, and for
the same reason. Eight hand-drawn busts is eight things to keep in step every
time a ramp moves, eight chances to get one wrong, and nothing at all to say
what a ninth character looks like. A rig says it once — a face is a skull, a
jaw, a brow, two eyes, a nose and a mouth — and Håkon differs from Ingrid by
the numbers in `BEK_NPCS[].face` rather than by being drawn again. It is also
the only thing that makes the *expressions* affordable: three faces each is
twenty-four drawings, or three parameters.

`face` sits beside the `hair`/`shirt`/`pants`/`voice` the sprite already used:
`skin` (one of two declared bases), `cut`, `beard`, `brow`, `iris`, `jaw`,
`age`, `hat`. Anything left out falls back to the rig's own middle, so a ninth
character costs one row of `data.js` and no code.

Four rules, and all four are the app's existing ones rather than new ones:

- **Whole art pixels.** The rig authors in `PORT_SRC_W`x`PORT_SRC_H` art
  pixels and stamps each as an exact `BEK_ART_SCALE` block. Feature positions
  are rounded fractions of those, so resizing the panel moves a feature by a
  whole art pixel and never lands anything on a fraction of one.
- **Ramps only, and mostly derived.** What a character is not handed out of
  `BEK_NPCS` — the lit and the shaded step of their own hair, shirt and skin —
  comes from `rampStep` (`palette.js`), which is the contrast rule's own
  same-ramp-neighbour exemption turned into a function. A shade the rig
  invents is therefore inside the band *by construction*, whatever colour it
  was handed. `near()` is the one wrinkle: `rampStep` clamps at either end, so
  a colour that is already the top step comes back unchanged and Sigrid's
  kerchief would be one flat block; `near` takes the neighbour on the other
  side instead.
- **The marks that break the band are declared, and thin.** The eyes, the
  brows, the lashes and the line of the mouth are `FEATURES.PORT_EYE` /
  `PORT_LINE` in `palette.js` (one pair per skin base); the skin's own planes
  and the backdrop's vignette are `MARKS.PORT_SKIN`/`PORT_SKIN_TAN`/
  `PORT_BACK`; the shadow under the jaw is `SHADOWS.PORT_JAW`. Same discipline
  as the trim that makes a house findable in one bit, and `palette_check.js`
  walks them with everything else.
- **A face is modelled in ramp steps, not in stipple.** This is the one place
  the usual answer is the wrong one. A head is twenty-eight art pixels across
  and the dither cell is four of them, so a stippled seam down a cheek reads
  as a dashed line rather than as a turn. Three planes — lit, base, turned
  away — is what a ramp is *for*. The ordered dither is kept for the things
  big enough to carry it: the backdrop vignette, the shoulder cloth, and
  stubble. The light is the same key everything else uses, from above and a
  little to the left, so the shade plane is always the right of the face.

One consequence worth writing down: **ink first over a whole shape, material
after it.** The head, the shoulders and the hair cap are all drawn as runs of
rows, and the first version interleaved an outline row with a material row —
so every row's ink painted out the row above it and the whole bust came out a
silhouette. Two passes, always.

### The box

`menus_talk.js` holds the dialogue box and the buy prompt that comes out of
one of its lines. It is a sibling of `menus.js` for the 300-line rule, the
same way `decor_outdoor.js` is one of `decor.js`, and not a second organising
principle — but the two panels do belong together, because both of them now
name their speaker on the same plate.

The geometry is derived from the text outward and the portrait is what is left
beside it (`layout.js`): the body is `DLG_BODY_LINES` rows of large text plus
the SPACE hint, and the portrait column is that same height less its name
plate. Raise `DLG_BODY_LINES` and the portrait grows with the box and the two
edges stay flush, with nothing re-measured — which is what the four assertions
in `layout_check.js` hold it to. The plate's width comes from the longest
name in `BEK_NPCS` plus two cells of quiet either side, rounded to whole
character cells. `DLG_BODY_LINES` went four → five with this pass: nothing
spoken needs more than three rows, but a question and its options are one
block now and the widest spends four.

An answer is a **row**, not a caret: the whole row inverts. Narration, the lot
sign and Bjørn have no speaker, so they get the full width rather than an
empty column to sit beside — and the wrapping the check proves is the narrow
case, so the wide one cannot burst.

### Which face, and who is speaking

A line's mood is its own if it has one (`m` on the object form of a line),
else the mood of the node or chat entry it came out of (`mood`), else
`neutral`. A bare string has nowhere to hang a mood, which is why the three
lines in `data.js` whose tone turns mid-entry are written out as objects.
`PORT_MOODS` is exported from `portrait.js` so the check reads the same list
the rig draws from.

The half of this that is easy to get wrong is the **speaker**, not the face.
Once the name lives only on the plate, a line that arrives with no `dlg.npc`
loses its speaker outright — and several lines are built in code rather than
read out of `BEK_TALK`: an offer's accept/refuse reply, Håkon's build and
annex lines (reached through the menu funnel, not `talkTo`), and the quest
turn-in. Every one of those now carries its `npc`, and an `offer` carries a
copy of the speaker it came from (a copy — `BEK_TALK` is a static table and
nothing may write to it). `__bekDebug.talk(id, steps)` drives the real
`talkTo`/`dlgAdvance` from the harness so that can be checked on a running
game rather than by reading the code.

## Ambience

Five chiptune loops and about twenty one-shot SFX and the valley still read
as silent the moment you stood still: no wind, no water, no birds, no rain
you could hear falling, no crackle standing next to the hearth, no room
tone indoors, no drip in the mine, and one filtered noise burst for every
surface a boot could land on. `ambience.js` is the fix, in the same shape
`music.js` already set: `createAmbience(A)` takes a handful of accessors
rather than closing over the app, so it imports nothing from `kernel/` and
touches no DOM.

**It answers to SND, not MUS.** The five tunes are the soundtrack and stay
on the MUS knob; a bed of wind and water is closer kin to the footsteps and
the hearth's own one-shot crackle, both of which already run through
`Snd`'s SND-gated bus. Turning MUS to zero should not also silence the rain.

**A bed per map, crossfaded, never a stack.** `BED` is six recipes — wind,
water, forest, room, mine, valley — each filtered noise plus one or two
slow, slightly detuned oscillators, and `MAP_BED` sorts all eleven maps
into one of them. Two alternating gain buses do the crossfade: the
outgoing bed ramps down while the incoming one, built fresh on the idle
bus, ramps up over the same `FADE` window, so the two overlap instead of
leaving the gap a mute-then-play would. The old bed's oscillators are only
stopped once the ramp is behind them — a `setTimeout` after the ramp, the
same shape `music.js`'s own `swap` already uses, which is why nothing here
needed a second scheduler invented for it.

**Weather and the hour are multipliers on that bed, not new beds.** Rain
is its own always-running noise bus, silent until it rains, ramped up only
when the weather roll says `regn` and the current bed is outdoors — a
loudness, not a different sound, so it never needs tearing down between
showers. Fog leans the current bed's target gain up a little
(`wind rising`); rain leans it down a little (the bed ducks under the
rain, not the other way round). The hour multiplies again on top: dusk and
night quiet the bed, and `hourLayer` schedules the dawn chorus and evening
crickets straight off `dt` — a chorus envelope that rises fast and releases
over real tens of seconds after `dawn()` goes false, which is what "fades
by mid-morning" comes out as once you remember `S.min` runs at four
game-minutes a real second. No new clock boundary was invented for any of
this: `dawn()`/`dusk()`/`night()` are exactly the three index.js already
declares, reused as the one hour signal `A.hour()` reports.

**The hearth is read, not re-declared.** `lightSources()` in index.js is
already the one table of what gives light in a room; a hearth is also the
one thing in that table that makes fire noise, so `A.hearths()` just
filters that same list for the `hearth` flag instead of a second table of
fire positions. It asks about the whole map and passes no region, so
`lightSources` defaults `R` to one — without that default it dereferenced
`R.y0` on `undefined` and threw once a frame (83 errors in 3.5s, measured)
the moment the machine's SND knob went above zero, which is the only
condition `tick`'s own `playing()` gate needs. **The screenshot harness
cannot see this class of bug**: it makes `AudioContext` throw, so
`ambience.js` returns before `hearthLayer` on every shot, and the container's
default `Vol.sfx` is 0 besides. If you touch a path only the ambience walks,
drive it with a real context and `Vol.sfx` turned up, and count page errors.

The list is also memoised per map. A `v` is map data and cannot move inside
one, and the ambience ticks every frame — scanning every square of a 46x28
map sixty times a second to re-derive four fixed positions is a cost for no
information. `hearthLayer` finds the nearest one, turns the distance to
the player into a 0–1 falloff, and schedules irregular crackle pops off
`dt` at a rate that quickens the closer you stand — pops, not a drone,
because a fire's presence is heard as irregularity, not as a hum.

**Footsteps read the ground.** `sfx.step()` used to be one filtered noise
burst regardless of what was underfoot; it now takes the tile the player
is standing on, `ambience.js`'s own `material()` sorts it into one of seven
keys (grass, path, boards, pier, stone, snow, water) off the glyph and,
where the glyph alone can't tell — a mine floor, a room floor, a snowbound
map — off `isCave()`/`inside()`/`snowy()` from `surface.js`. The *sound*
each key makes is content, not behaviour: `BEK_STEP_SOUNDS` (`data.js`) is
the recipe table, the same split `BEK_ITEMS`/`BEK_CROPS` already keep from
the code that reads them.

**Warmth, not detail.** Every gain in `BED` sits under 0.06 and every
oscillator under 0.02 — a bed you consciously notice is a bed that is
already too loud; the test that matters is that you notice when it stops.
`unmount()`'s obligations are the same ones `music.js` already carries:
every oscillator and buffer source `ambience.js` starts is either a
transient one-shot through `Snd` (footsteps, hearth pops, chorus, crickets
— self-cleaning, nothing to leak) or a node this file itself stops on
`Amb.stop()`, called from the same three places `Song.stop()` already is.

## The swing

`act()` used to resolve everything on one frame: check the tile, spend the
energy, mutate the state, `terrDirty()`, play a sound, print "+1 TØMMER". The
tree you felled vanished on the same frame the axe was never seen to swing.

`fx.js` gives every tool three phases — roughly 0.10s windup, 0.05s strike,
0.15s follow-through, which at the 30fps draw rate is about three drawn
frames, two and four. **Slight is the specification**: a farming game where
every action costs half a second of animation is tiring inside ten minutes.

Four things make it read as a hit rather than as a wiggle:

- **The effect lands on the target tile.** Chips off the birch, dust and
  sparks off the ore, a clod turning in the soil, a splash ring at the water,
  a sprout when you plant, the item arcing up when it lands in your bag. That
  is where the payoff is; the player is only the thing that started it.
- **A camera kick on the strike frame**, under three pixels and under two
  frames, applied after the clamp so it can nudge the frame free for a
  moment. Past three pixels it is motion sickness.
- **The tool is in the hand.** `person` drew none at all, which is why a
  swing had nothing to be a swing *of*. `ARC` in `fx.js` is four points —
  carried, the top of the windup, impact, rest — and point 0 doubles as the
  pose when nothing is happening, so a tool you own is always in your hand.
- **The failures animate too.** `deny()` fires two frames of recoil beside
  the sound that was already there, so every "no" in the game got one without
  any of them being changed.

### Where the state lives, and what is deferred

A swing is transient by definition: it lives beside `fish` and `note` as a
module-local, **never in `S`**. It must not survive a reload and it must not
appear in a save. Everything ticks on the frame loop's own `dt`, never on a
timer, or `unmount()` leaks.

`act()` still mutates state immediately, and that is deliberate — nothing can
double-resolve, the player cannot walk away mid-swing, and `autoSave()` can
never catch a half-applied action. The only artefact was the terrain cache
repainting the felled tree before the axe landed, **so the repaint is what
gets deferred, not the state change**: `terrLater()` arms it and the strike
frame fires it. A direct `terrDirty()` in the meantime still takes effect at
once and clears the arming, so a second source of change is never swallowed
by a swing that happens to be in flight.

Movement is held for the duration, and a second press is *buffered* rather
than dropped, so holding the key chops at the rate the animation allows. The
rod's cast hands off to the fishing minigame on the strike frame rather than
racing it: `fish` does not exist until the rod has actually gone out.

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

### Local light is a palette too

The curve is what makes night *comfortable*; local light is what makes it
*inviting*, and they are different things. Sources are the hearth `v`, every
window actually drawn on an `H` wall, the lamp and candle in `decor.js`'s
`LIGHTS`, and a lantern the player carries in the gruva.

Local light used to be a stipple of one warm entry laid **over** the picture:
a `WAR[1]` halo at 45% of peak, then a `WAR[3]` core at the full peak. It was
the overlay bug from the top of this section, committed a second time at a
smaller radius, and at the strengths it ran at the picture inside a pool was
simply gone. The lantern was `pool(..., 2.4*BEK_T, 10)` — ten sixteenths of
solid `#da863c` over every pixel within about 48 of the player, with four
more of `#843422` under it — so the mine floor, an ore vein's hue and the
mineral traces `rock.js` puts in the wall to tell you where to look were all
invisible exactly where you were standing. The hearth was worse because it
**stacked**: a cached pool at `round(12*dark)` and a live flicker pool at
`round(5*dark)` landed on the same pixels, each clamped to 16 on its own, and
composited to something effectively opaque.

The answer is the answer the hour already had. **A pool does not paint the
ground orange; it resolves the ground toward the palette daylight would have
drawn it in**, plus a warm tint for temperature. The blend is still an ordered
dither — it is a *more* literal one than `ditherPat`, since `lamp.js` reads
the `DITHER` matrix per pixel rather than baking it into a stipple tile — but
what it dithers between is two **pictures** and not a picture and a colour.
Every pixel written is one of two whole colours; there is no `globalAlpha`, no
`rgba()`, no `ctx.filter` and no compositing mode anywhere in it.

Three things fall out of that shape rather than having to be arranged:

- **Full strength is maximum legibility, not none.** Which is why the
  flat-topped, steep-rimmed falloff (`1 - u³`, nothing under strength 2) could
  stay exactly as it was. A smooth bell still spends most of its *area* in the
  outer ring at strength 1–3, which at an eight-pixel stipple cell is a spray
  of loose squares and not a soft edge; the flat top was only ever a fault
  because the top was opaque paint. Do not reintroduce the bell.
- **Stacking is unexpressible.** The target is a fixed palette, not an addend,
  and ordered-dither coverage sets are nested — the set lit at strength 9
  contains the set lit at 5 — so two pools over one pixel light it to the same
  colour and compose as a maximum. The hearth bug cannot be written any more.
- **It costs nothing in daylight.** As the hour approaches noon the hour's
  table and the lamp's converge, so a pool fades out on its own.

`lampState` (`light.js`) is the target, and it is a light state like any
other — the same `{ k, sat, a }`, blended toward daylight the way `shelter`
blends a room toward it, so it goes through `lutOf` and inherits the ordering
guarantee for free. `palette_check.js` asserts it over the lamp's tables as
well as the hour's, because a lit floor that reordered past a lit wall would
be the same bug in a smaller place. Four constants, and all four have reasons
that were measured rather than chosen:

- `LAMP_MIX` (0.9) — how far the *exposure* goes back toward daylight. Not all
  the way: a disc of exact noon dropped into a blue valley reads as a hole cut
  through to another hour.
- `LAMP_SAT` (0.45) — how far the *saturation* goes back, and it is
  deliberately much less. Take `sat` all the way with `k` and a lamp on grass
  restores full daylight green, which against a blue-grey valley and a warm
  rim reads as a chequer of complementary colours; the town's two street lamps
  are where it showed. A warm lamp is not the sun. This is free to differ
  because `sat` is the one term of the transform the luminance is provably
  blind to.
- `LAMP_K` (1) — **daylight is a hard ceiling.** A lamp brighter than noon was
  tried; above 1 the entries the palette already puts near 255 clamp, stop
  climbing, and get overtaken by entries that have not, which cost 1908
  reordered pairs on the first check run. Local light brightens by revealing
  the daylight picture, never by exceeding it.
- `LAMP_TINT` ([46, 19, -13]) — the warm cast, scaled by how dark it is
  outside so it goes to nothing by morning. It has the same kind of ceiling
  for the same reason: 48 is clean, 52 costs one reordered pair (index 12
  against 25), so this sits under it with room for an anchor somebody adds
  later.

The one thing still painted over the picture is a **thin warm veil** —
`VEIL` = 2 of 16, `WAR[2]`, in daylight colours (`ditherPat`'s `day` flag),
because a fire is as bright at midnight as at noon. The old two-pass structure
took its colour temperature from painting the rim a deeper entry than the
core, and with the core no longer painted at all the temperature needs
somewhere to come from. Two rules on it:

- It is **hollow** (`VEIL_HOLE`, 0.7 of the lit radius). In the middle of a
  pool the warmth is already in the palette the pixels resolved to, and a
  stipple there is paint over the one place the picture most needs to be
  readable — the mine floor under the lamp is precisely what the report was
  about. Out at the fringe most pixels are still the hour's and the warmth has
  nowhere else to come from.
- It **fades out with the hour** (`VEIL_DARK`). Paint does not know the pool
  under it has converged on the hour's palette and stopped showing; without
  the fade a window keeps a ring of orange stipple around it at 08:00. The
  fade is to nothing rather than to a sparse speckle, because `glow` drops
  anything under strength 2.

Never raise `VEIL` to make a light brighter. Raise the source's peak, which
brightens by revealing rather than by covering.

A peak now means "how much of the daylight picture to resolve to", so the
numbers all went up (hearth 16, window 13 outside / 11 in, lamp 13, candle 10)
and the scaling with darkness got gentler — `0.62 + 0.38*dark` rather than
`* dark`, because the convergence of the two palettes already does most of
that job.

**`CAVE_LIGHT.k` moved from 0.72 to 0.58** as part of this, and it is the one
number outside local light that did. A pool resolves toward daylight and stops
there, so the difference a lantern can make *is* the gap between the ambient
exposure and 1; at 0.72 that gap was small enough that the lamp read as a
stipple rather than as a light. The old overlay's opacity was also hiding how
bright the unlit rock already was. `gruva_1bit` still finds every vein.

**Static sources are painted into the terrain cache**, because the light key
is already part of the cache key, so a lit window costs nothing per frame.
Two things cannot be:

- The hearth's flicker, which breathes as the **veil** now rather than as a
  second pool — that second pool was the stacking bug, and a veil over a pool
  cannot reproduce it.
- The lantern, which walks. It is the same pass run on the *screen* once
  everything in the playfield is on it, so the lamp lights the floor, the ore
  glints, the drops and the player's own shirt — none of which a pool baked
  into the terrain could reach. It is clipped to the viewport by hand, because
  `getImageData` knows nothing about the clip path and a lantern must not
  reach the HUD.

Light does not spill into the void: the ` ` margin outside a room's walls is
repainted black after the light pass. And the **order within the pass is
load-bearing**: ground, detail, forest, moon, then the pool, then the veil. The
pool resolves what is already on the canvas, so it must run after everything
static; the veil must run after the pool, or the pool would resolve the warmth
straight back out of the pixels it had just been painted onto.

#### Cost

Median of five warm forced rebuilds, Chromium on the dev container, before and
after. The light pass is the whole of `terrain()` outside the three passes
above it, so it also carries the void repaint and the `prepare()` calls.

| scene            | light before | light after | rebuild before | rebuild after |
|------------------|--------------|-------------|----------------|---------------|
| farmhouse 23:00  |   0.9ms      |   5.4ms     |   3.0ms        |   7.6ms       |
| lakehouse 23:00  |   1.0ms      |   6.1ms     |   3.3ms        |   8.3ms       |
| farm 23:00       |   0.6ms      |   7.8ms     |   6.6ms        |  14.0ms       |
| lake built 22:00 |   0.6ms      |   7.5ms     |   7.6ms        |  15.2ms       |
| gruva 02:00      |   0.3ms      |   0.8ms     |   5.5ms        |   5.8ms       |
| farm 12:00       |   0.2ms      |   0.3ms     |   5.7ms        |   6.0ms       |

Worst rebuild 15.2ms against a 30ms budget, and rebuilds still cluster in the
~90 real seconds of dawn and dusk. Daylight is unchanged, because there are no
sources to run. The live pass gained ~1ms a frame in the gruva and nothing
anywhere else: 2.3ms of the 33.3ms a 30fps frame has.

**The pixel loop is not where that time goes, so do not optimise it.** A
280x120 box and a 640x400 one cost about the same (6.6ms and 5.1ms), and the
veil is 0.1ms of it. What is being paid for is the `getImageData` forcing the
canvas to flush the several thousand `fillRect`s the rebuild has just queued.
Shrinking the box buys nothing; not touching the canvas at all is the only
thing that would, which is why there is exactly one of these per rebuild and
every source is composed into one strength field first. `willReadFrequently`
on the terrain context was tried and made no measurable difference either way.
`__bekDebug.perf()` reports `poolMs` and `veilMs` beside `lightMs`, because
"the light pass got slower" is not a finding.

Note also that the old figures in **Inside a house → Cost** — a 20–23ms
interior rebuild split ground 5 / detail 5 / light 12 — do not describe this
container and did not before this change either. A farmhouse rebuild measured
3.0ms here, of which the light pass was 0.9ms. Measure before quoting.

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
