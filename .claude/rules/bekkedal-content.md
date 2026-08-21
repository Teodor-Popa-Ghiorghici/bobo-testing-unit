---
paths: ["apps/bekkedal/data.js"]
---

# Bekkedal content authoring

See also `.claude/rules/content.md` for id naming, quest-item, and
dialogue-gating conventions. This file carries the Bekkedal-specific content
systems not covered there: the repeatable quest board, the seasonal layer,
crafting, and Act II.

## File split — per-file detail

- `quests.js` — the repeatable quest board: rolls `BEK_QUEST_TEMPLATES`
  (`data.js`) into `S.rq`, describes an instance for the board, and merges it
  with the fixed `BEK_QUESTS` list into the rows `menus.js` draws. See
  **Quests and the repeatable board** below.
- `seasons.js` — the seasonal layer: derives the current season, day-of-season,
  festival (if any) and a crop's plantability from `S.day` alone, and rolls the
  morning weather off that season's own odds. See **The seasonal layer** below.
- `progression.js` — the money-sink formulas (`houseCost`, `houseTierCost`,
  `houseTierAvailable`, `barnSlots`), pulled out of `index.js`'s closures so
  `act2_check.js` reads the exact numbers the game does. See **Act II**
  below.
- `schedule.js` — where every NPC is, derived from their own `posts`
  (`BEK_NPCS[].posts`, `data.js`) plus the day, the minute, the weather and
  the story flags. See **NPC schedules** below.
- `scene.js` — the heart-event runner: whether one should fire right now,
  which beat is showing, where its cast stands and what the world gets back
  when it ends. Pure, in the same sense `schedule.js` is; the scenes it runs
  are content (`scenes_valley.js`/`scenes_wild.js`, re-exported from
  `data.js` as `BEK_SCENES`). See **Arcs and heart events** below.
- `talk_town.js` / `talk_water.js` / `talk_field.js` / `talk_stone.js` —
  `BEK_TALK`, in four halves the way the maps are in three; `data.js` joins
  them. Two characters each, grouped by where they stand. Rows only, no
  behaviour.
- `scenes_valley.js` / `scenes_wild.js` — the twenty-four heart events, the
  same split by the same rule.

## Checks

- `node apps/bekkedal/quest_check.js` — the repeatable quest board. Asserts
  `BEK_QUEST_TEMPLATES`' own `tool`/`animal` gates agree with an independently
  authored table of what `index.js`'s `act()`/`tendAnimal()` actually require
  to hold each item (so a template cannot silently drift from the engine),
  drives a scripted 60-day progression through the real weekly cadence
  (`isRefreshDay`/`refreshBoard`) asserting the board is never empty and no
  quest it ever held asked for something unobtainable on the day it was
  rolled, then stress-rolls a few hundred batches at four stages to shake out
  item/npc choices one walkthrough would not hit, asserting every requester
  resolves to a real `BEK_TALK` entry and no batch asks the same NPC twice.
  Run it after touching `BEK_QUEST_TEMPLATES`, `quests.js`, or what any
  gathering action in `index.js` requires to succeed.
- `node apps/bekkedal/season_check.js` — the seasonal layer, simulated across
  4 in-game years. Asserts season index and day-of-season agree with an
  independently written formula on every one of the 320 simulated days and
  never disagree with what advancing one day from the previous day's own
  recompute would give (the operational meaning of "never drifts"), that
  season transitions land exactly on `BEK_SEASON_DAYS` boundaries and nowhere
  else and that the four-season order repeats identically year to year, that
  `cropInSeason()` agrees with every `BEK_CROPS` entry's own `seasons` list
  and that every season has at least one plantable crop, and that each
  season's festival fires exactly once a year on the day `BEK_FESTIVALS`
  declares with real, distinct, walkable dressing tiles on the map it names.
  Run it after touching `seasons.js`, `BEK_SEASONS`/`BEK_SEASON_DAYS`/
  `BEK_SEASON_WEATHER`/`BEK_SEASON_TINT`/`BEK_FESTIVALS`, or `BEK_CROPS`'
  `seasons` lists.
- `node apps/bekkedal/act2_check.js` — Act II, and every chat gate in the
  game. Beyond the Act II surfaces it sweeps all ~190 `chat[].if` predicates
  across four base states (fresh and finished, before and after Act II) x
  three weathers x four seasons x seven hours x festival-or-not, asserting
  none throws and that no NPC is ever left with an empty chat pool. Run it
  after adding or gating any chat line. Also asserts `houseTierAvailable()`
  stays false before `S.act2Unlocked` (even with the house standing) and
  becomes true once it is; that every story NPC's `chat[]` gains at least one
  entry (two for Håkon: the pen offer and the completion line) that is
  ineligible before `S.act2Unlocked` and eligible after, evaluated against a
  synthetic end-game-ish state so only that one flag is doing the work; that
  the pen's two tiers total the right slot count and that no two farm-map
  overlay regions (`BEK_BARN_PLOT`/`BEK_BARN_PLOT2`/`BEK_FARM_PLOTS`)
  overlap; that `BEK_DECOR.lakehouse_t2` never reuses a `lakehouse`
  coordinate, sits on a real room tile, and every `kind` exists in
  `decor.js`; that the board's `act2`-flagged templates never roll across
  400 trials before `S.act2Unlocked` and both roll at least once across 400
  after. Then the balance pass itself: a day-by-day energy-budget simulation
  reading real sell prices, `BEK_TOOLS`' own energy costs, `houseCost()` and
  `BEK_LOT_COST` (never a hand-copied number for anything exported), which
  deliberately ignores every level-up bonus, the steel axe and fishing —  a
  documented lower bound, not a prediction — and asserts a mixed
  mining/felling/farming policy reaches `houseBuilt` near the ~8-10 day
  target while an all-in-on-mining policy is not dramatically faster, which
  is the operational meaning of "no single money loop dominating". Run it
  after touching `BEK_TOOLS`, `BEK_ITEMS`' sell prices, `houseCost()`/
  `houseTierCost()`, `BEK_LOT_COST`, `BEK_QUEST_TEMPLATES`' `act2` entries,
  `BEK_BARN_PLOT2`/`BEK_BARN_SLOTS2`, `BEK_DECOR.lakehouse_t2`, or any
  `BEK_TALK` chat line gated on `S.act2Unlocked`.
- `node apps/bekkedal/schedule_check.js` — every NPC's schedule. Asserts
  every post any NPC owns is a real map and a tile you can stand on; that
  each NPC's own *default* posts (the ones with no `weather`/`season`/
  `flag` of their own) together cover all 1440 minutes of a day exactly
  once, which is what guarantees `activePost()` never has to fall back to
  "whichever post happens to be last"; then, across a simulated year
  sampled every 30 minutes, both with and without `S.flag.barn`/
  `S.act2Unlocked` and across all three weather states, that every NPC
  resolves to a walkable tile on a real map and that no two of the eight
  ever share one; that Astrid, Sigrid and Lars stay on their own home map
  through the hours their own dialogue states (Sigrid's meaning either the
  setra or the farm, per **NPC schedules**' winter override below); and
  that every season's festival day gathers all eight onto the festival's
  own map at eight distinct tiles; and finally that no heart event is ever
  played over somebody merely keeping their hours — sampled every 15 minutes
  inside each scene's own window, over the same year and the same weather and
  flag combinations, nobody the scene did *not* cast may be standing on the
  square it stands the player on or on any square it gives an actor. Run it
  after touching `BEK_NPCS[].posts`, `schedule.js`, or any scene's `stand`
  or `cast`.

## Quests and the repeatable board

`BEK_QUESTS` (`data.js`) is the fixed, one-shot list gated through `BEK_TALK`
per `.claude/rules/content.md`; `quests.js` never touches it, it only rolls a
second, renewable set of instances from `BEK_QUEST_TEMPLATES` (`data.js`) on
top. Same conventions as the "art siblings": pure functions of `(S, day)`
that know nothing about the DOM, so `quest_check.js` can exercise them
without mounting the app.

`BEK_QUEST_TEMPLATES` is N shapes of quest — an item pool and a quantity
range, plus, for the two templates that need one, a `tool`/`animal` gate read
exactly the way `BEK_RECIPES`' `fr`/`lvl` are: declared in `data.js`, checked
read-only in `quests.js`, never set directly. The four ungated templates
(crops/forage/blomst/wood) are always obtainable, which is what guarantees
the pool — and so the board — is never empty.

`refreshBoard(S, day)` rolls `BEK_QUEST_BOARD_MIN..MAX` instances into the
result: item, quantity and requester (an NPC id, same `who` contract
`BEK_QUESTS` uses — resolved against the same `BEK_TALK` pool, so a rolled
quest is unreachable exactly when a hand-authored one with a typo'd `who`
would be) all picked at random from whichever templates are obtainable right
now, with no NPC asked twice in the same batch. Reward scales with both the
quantity asked and the requester's own `S.fr` — a markup over the item's
`BEK_ITEMS[].sell`, never a discount. `index.js` calls this once in `fresh()`
(so day 1 already has a board) and again in `newDay()` whenever
`isRefreshDay(S.day)` — every `BEK_QUEST_REFRESH_DAYS` days, a fixed in-game
weekday — replacing the whole batch together rather than topping it up
piecemeal, which is what makes "refreshes on a fixed weekday" a real
property instead of an average. `heal()` seeds a board immediately for any
save from before `S.rq` existed, rather than leaving it empty until the next
scheduled refresh.

Turn-in reads `activeRepeatable(S, npc.id)` and runs right after the fixed
list's own turn-in in `talkTo()` (`index.js`), checked second so the two
never race for the same conversation — talk again to settle the other one. A
completed instance is marked `state: 'done'` and stays on the board (same as
a fixed quest) until the next scheduled refresh replaces the batch; nothing
ever splices `S.rq` mid-week, which is what keeps "the board never goes
empty because everything on it got claimed" true without special-casing it.

`boardRows(S)` (`quests.js`) merges the fixed list and `S.rq` into the rows
`menus.js` draws, fixed first — the fixed list's priority claim on the
board's slots. The panel itself does not grow to fit every possible row
count: up to seven fixed, three live repeatable and the house is eleven rows
against `QUEST_VISIBLE_ROWS` (`layout.js`, currently 8) of headroom, so
`drawQuests()` scrolls a window over the merged list (W/S, reset to the top
each time the board opens) rather than resizing the box — see
`layout_check.js`'s scroll-indicator-clears-ESC assertion for the geometry
that guarantees the two labels never collide.

## The seasonal layer

`seasons.js` replaces the old flat, memoryless day-to-day weather roll with a
returning cycle the day counter itself drives — four `BEK_SEASON_DAYS`-long
seasons (`BEK_SEASONS`, `data.js`), in fixed order, wrapping forever. Every
function in it is pure in `day`, same convention as `noise.js`/`light.js`/
`quests.js`: `seasonIndexOf`/`dayOfSeason`/`seasonOf` derive where in the
cycle a given day falls, `festivalOf`/`isFestivalDay` derive whether it is
that season's one festival day, `cropInSeason` derives whether a crop may be
planted that day, and `rollWeather` rolls the morning's weather off that
season's own odds (`BEK_SEASON_WEATHER`, `data.js`) rather than the old fixed
20/10/70 split.

**`S.season` and `S.festival` are recomputed, never incremented.** `newDay()`
(`index.js`) reassigns both from `S.day` on every call, `heal()` reassigns
both from `s.day` unconditionally on every load rather than backfilling them
only when missing, and `fresh()` seeds both from day 1 the same way. There is
nothing stored that increments on its own schedule, so there is nothing that
can disagree with the day count that defines it — a save from before this
layer existed gets both fields correct on the very next load, the same way a
fresh run gets them correct on day 1. `season_check.js` exercises this
directly over four simulated years rather than trusting the argument.

`BEK_CROPS` entries (`data.js`) each carry a `seasons` list of the
`BEK_SEASONS` ids they may be planted in. `plant()` (`index.js`) checks it via
`cropInSeason()` after every other gate (soil turned, no seed already
growing, a seed on hand) and turns a mismatch into a spoken line — "WRONG
SEASON. THE GROUND WILL NOT TAKE IT NOW." — exactly like every other refusal
`plant()`/`act()` already make, never a silent block or a thrown error. A
crop already growing is unaffected by a season boundary passing under it;
the gate only ever fires at the moment of planting.

The one seasonal tint (`BEK_SEASON_TINT`, `data.js`: one palette colour and
one dither strength per season) and the map dressing half of each season's
one small recurring festival (`BEK_FESTIVALS`, `data.js`) both reuse existing
machinery rather than adding a renderer of their own, per the brief that
asked for this layer:

- The tint is drawn through the exact `dither()` call the weather overlay
  already makes for fog, immediately before it in the same `!inside` block —
  another colour and strength handed to a call that already exists, drawn
  through the hour's own LUT exactly like the fog and rain already are.
- A festival's `dress` is a handful of `[x, y]` coordinates on the map it
  names (`BEK_FESTIVALS[id].map`, currently `town` for all four), overlaid by
  `tileAt()` (`index.js`) exactly the way the farm's two purchasable plots
  (`BEK_FARM_PLOTS`) already overlay the farm map's own grass — reusing the
  flower glyph (`F`) the town map already draws elsewhere on itself, so
  nothing new has to be drawn, only a different day to draw it on. Because
  `S.festival` is itself derived from `S.day`, and `S.day` is already part of
  the terrain cache's key, the dressing needs no cache-busting of its own —
  the cache already rebuilds on the day it should change.
- The dialogue beat is a `BEK_TALK.astrid.chat` entry per season, gated
  `if: S => S.festival === '<id>'`, the same convention every other
  flag/friendship-gated chat line in that file already uses.

`season_check.js` is the check for all of it — see **Checks** above.

## NPC schedules

The eight who talk used to stand on one fixed tile forever, which the app's
own doctrine defended on the grounds that a shopkeeper who wanders is a
shopkeeper you cannot find — a real concern, but eight statues was the
clearest signal in the whole game that nothing was alive. `schedule.js`
keeps the concern and drops the statues: every NPC has a small, named set of
**posts** (`BEK_NPCS[].posts`, `data.js`, two to four each) — a map, a tile,
and the hours they hold it — and is always either standing at one of them or
visibly walking between two, never anywhere else. A shopkeeper's stated shop
hours are one of their posts, stated in their own dialogue (Astrid's,
Sigrid's and Lars's `chat` entries), so "where do I find them" always has an
answer a player can act on rather than a memorised map coordinate.

Same convention as `seasons.js`/`quests.js`: `schedule.js` is pure functions
of `(npc, day, minute, ctx)` — nothing seeded, nothing saved, nothing that
mutates `npc` or `ctx`, so `schedule_check.js` can exercise a full simulated
year of it without mounting the app. `index.js`'s `npcsHere()` is the only
caller in the running game: it calls `positionFor()` once per NPC per frame
and reads the result straight off, the same way it already reads
`seasonIndexOf()`/`festivalOf()` fresh every `newDay()` rather than storing
anything that could drift.

**A post is content, and it is graded like any other.** Each one is
`{ id, map, x, y, from, to, weather?, season?, flag? }`; `from`/`to` are
minutes-of-day (`from > to` wraps past midnight, the same convention
`index.js`'s own `dawn()`/`dusk()`/`night()` windows already use). A post
with none of `weather`/`season`/`flag` is a **default** — eligible whenever
the hour matches, and every NPC's defaults alone must cover all 1440
minutes with no gap and no overlap, which is what `schedule_check.js`'s
coverage pass asserts directly rather than trusting the arithmetic. A post
naming one of the three is an **override**, eligible only when that
condition also holds, and checked ahead of the defaults in a fixed order —
`activePost()`'s own `GROUPS`: festival first, then season, then weather,
then a story flag, then whichever default the hour names. An override's own
window is always a subset of the default window it stands in for; it
replaces that window, it never opens a new one, which is the whole reason a
default-only coverage check is sufficient to guarantee the schedule always
resolves.

**What varies a schedule, and why the order is what it is.** Weather moves
an outdoor character in under their own roof — Astrid's `shop_rain` and
Marit's `field_rain`, both the same tile as their own `home` post, both
gated `weather: 'regn'`. Season can replace a whole day's routine rather
than one window of it: Sigrid's `winter_shop`/`winter_home` are two posts,
gated `season: 'vinter'`, that between them already cover the full day the
same way her ordinary `dairy`/`home` posts do — "down in the valley in
winter" is a place, not an hour, so both of her posts move together. A
story flag can hand an NPC a post the story has not earned yet: Håkon's
`pen` post (`flag: 'barn'`) only exists on the farm, standing in for his
`work` post the moment `S.flag.barn` is set, and never before. Season sits
ahead of weather in `GROUPS` on purpose — Sigrid carries no weather post of
her own, but if she ever did, a rainy day in winter must not momentarily
pull her back to the setra just because weather is checked first; season
having already claimed the whole day for winter is what stops that.
Festival sits ahead of everything: on the day `BEK_FESTIVALS` names, every
NPC's `festival` post — eight distinct tiles down the town square's own
plaza row — wins regardless of what weather, season or flag would otherwise
have chosen, which is the operational meaning of "a festival is everyone
converging".

**Walking is real between two posts on the same map, and a snap between two
that are not.** `positionFor()` looks at the post one minute before the
current one's window opened (`prevPostOf()`, under the same day and `ctx` —
weather and season never change mid-day, so this is stable) and, if that
predecessor sits on the *same* map, walks a short BFS path between the two
tiles (`BEK_SOLID`-aware, a door knocked on rather than walked through,
memoised per post-pair since two posts never move) at a fixed pace, driving
`actors.js`'s real `person()` walk cycle off `walkStep()` — a phase derived
from the minute clock alone, never a frame timer, so the same instant always
draws the same pose. A change of *map* — a festival, or a story flag opening
one on a different map entirely — is never interpolated: it lands the
instant its window opens, before the player is likely to be watching every
one of the eight at once, the same way the player's own bed teleports them
back to the farm at `newDay()` without a walk.

**Nobody stands on anybody, and nobody stands in a wall.** Every post is
checked exactly the way a tile the player can stand on is (`BEK_SOLID`, and
`'D'` a door rather than a floor); `schedule_check.js`'s year walk samples
every hour of a simulated year, every weather, both the flagged and
unflagged story state, and asserts no two of the eight ever resolve to the
same tile at the same instant — the two-characters-share-a-tile bug this
layer replaced is the operational failure that check exists to catch again
if it ever comes back.

## Arcs and heart events

Every one of the eight has **an arc in five beats** — a reticence, a first
admission, a difficulty, a turn, a resolution — carried by five `nodes[]`
entries gated on ascending friendship (2, 4, 6, 8, 10). Nodes are one-shot
and checked in array order, so the arc's beats are *interleaved by gate* with
that character's quest and shop nodes rather than appended after them: the
array reads lowest gate first from top to bottom, and a beat that sat below a
lower-gated node would simply never surface. Each character also has one
thing they want and one thing they will not talk about; the second is a
`chat[]` entry, not a node, because a refusal that fires once and is spent is
not a refusal.

A **heart event** is the same arc played rather than told, at friendship 4, 7
and 10. It is not a conversation: a conversation is something the player
starts by walking up to somebody, a scene is something that happens because
they walked into a place at an hour when it was going to happen anyway. The
gates are in `scene.js`'s header, and the two that are easy to get wrong are
`anchor`/`r` (a box the player has to be inside — entering the map usually
puts them there, but walking up to it counts too, which is what stops a scene
anchored at one end of a map being unreachable to a player who always comes
in at the other) and `stand` (the square the runner puts the player on for
the length of it, so the scene composes a tableau instead of hoping nobody is
standing where an actor wants to be). The player's own square, facing and the
clock all come back at the end; the one-shot mark is `S.seen['sc:' + id]`,
the same table a dialogue node uses, so no scene costs the save a field.

`scene.js` writes nothing. `sceneFor()` answers a question, `beginScene()`
builds a plain run object, and `sceneRestore()`/`sceneEffects()` hand
`index.js` the two writes it owes — the same division `schedule.js` keeps.
A scene's cast is layered *over* `positionFor()`'s answer rather than beside
it, so somebody a scene places is only where the scene puts them: that is
what lets a scene stand Håkon at the stave church, or Lars at his sister's
dairy, without touching either man's `posts`.

Cross-reference is the point of eight people rather than eight vending
machines. Astrid knows Håkon is building; Ingrid knows Olav's boat is
patched and always has been; Håkon's arc and Marit's converge on the same
rotten ridge beam and resolve in the same scene. A line about somebody else
gates on what the player has actually seen of them (`S.disc`, `S.fr`,
`S.q`) rather than being said to anyone at any time.

## Chat gating

A `chat[]` entry's `if` predicate is the cheapest content lever in the app
and there are around a hundred and ninety of them. It may read anything on
`S` that a chat line would not itself have to mutate: `S.weather`
(`klar`/`regn`/`take`), `S.season` (an **index**, 0-3, not an id — see
`seasonIndexOf()`), `S.festival` (a season id on a festival day, else null),
`S.min` for the hour, `S.bag` for what the player is carrying, `S.q` for
which quests are open, `S.flag`/`S.fr`/`S.disc`, `S.act2Unlocked`, and
`S.yst` for what they did yesterday.

`S.yst` is the one that needed engine support: `newDay()` subtracts the four
XP counters from the mark it stamped at the start of the day that just ended
and re-stamps it (`S.xpDay`). So "you were in the mine yesterday" is
*measured* off the same counters the levels come from, never a flag somebody
remembered to set, and it cannot disagree with them. Both fields are backfilled
by `heal()`; a save from before them starts today with an honest blank.

Two things a gate must never do. It must not throw on a partial `S` — every
bag and counter read goes through `(S.bag.x || 0)`, because the state a check
hands it is not always the state a running game holds. And the pool must
never empty: `talkTo()` picks `pool[(ix - 1) % pool.length]`, so an NPC whose
every entry is gated off has no line to say. `act2_check.js` sweeps every
gate across four base states x three weathers x four seasons x seven hours x
festival-or-not and asserts both.

## Crafting and the chest

Player-side crafting sits beside Sigrid's food shop (`BEK_TALK.sigrid.shop`)
rather than folded into it — that dialogue node is untouched. The chest is a
`'K'` tile baked into the farm map's own rows (row 5, col 6), the same
mechanism as the well (`'o'`) and the sign (`'S'`): a literal glyph, solid in
`BEK_SOLID`, read apart from grass by `solidOf` in `surface.js`, drawn in
`index.js`'s `tileDetail` switch. Facing it and pressing act opens
`mode = 'craft'`, a panel that reuses `SHOP_X/Y/W/H/ROWS/ROW/COL_W/NAME_DX/
PRICE_DX` (`layout.js`) and the shop's own arrows-select/space-act/escape-
close input verbatim — `drawCraft()` in `menus.js` sits right next to
`drawShop()` and reads the same way, LAGE/KOK (craft/cook) standing in for
BUY/SELL.

`BEK_RECIPES` (`data.js`) is two lists, one per column: `craft` (sprinkler,
gjerde, dyrefor) and `cook` (one raw crop plus one animal product each,
restoring more energy than the best shop food — see `BEK_ITEMS`). A recipe's
`need`/`out` are `BEK_ITEMS` ids, same rule as a quest's `need`. `fr`/`lvl`
gate it exactly the way a `BEK_TALK` node gates on friendship — read-only,
raised only through the paths that already raise `S.fr` and `S.lvl` — so no
recipe spends kr; crafting has no currency of its own.

The chest's contents (`S.chest`) are a `{itemId: qty}` map, serialized in
`BEK_SAVE` and healed exactly like `S.bag` (bumped `ver` to 7). Crafting
spends from chest and bag as one combined stock, chest first, and output
goes to the bag through the usual soft cap, overflowing to the chest
(uncapped) rather than being lost — so the chest is both where a farmer
stockpiles ingredients ahead of a session and where a full bag's surplus
ends up.

## Act II

`S.act2Unlocked` was added by the house-completion-milestone fix (bumped
`ver` to 3, back when the ending screen's SPACE handler still called
`S = fresh()`) as a hook nothing read yet. This is that hook wired up, plus
the balance pass to go with it — reaching `houseBuilt` used to be
unconstrained by anything but patience, and `act2_check.js`'s own balance
simulation is what found the actual problem: `hakke` mining at its old
5-energy cost paid roughly 21 kr/energy against ~17 for the best early crop
and single digits for everything else, so a rational first playthrough
bought a pick on day one and never touched farming, animals or fishing
again. `hakke`'s energy cost moved to 7 (`BEK_TOOLS`, `data.js`) — not the
ore sell prices, which this file already cites as measured values in **The
veins** above, and not fishing, whose real throughput is gated by the reel
minigame rather than by this table.

Four surfaces, all read-only against `S.act2Unlocked` — nothing here ever
sets it, only `S.houseBuilt` does (`index.js`'s `mode === 'end'` SPACE
handler):

- **The house's own upgrade tier.** `hakonTilbygg()` (`index.js`) is split
  out of `hakonBuild()` rather than folded into it, since talking to Håkon
  always funnels into one or the other (`openMenu()`'s `hakon` branch) and
  it is a second, later gate on that same funnel: `S.built` reaching
  `hakonBuild()` at all, `houseTierAvailable()` (`progression.js`) —
  `S.act2Unlocked && S.built && !S.houseTier` — deciding what happens once
  it does. Buying it (`houseTierCost()`: kr/tømmer/stein, the same shape
  `houseCost()` already is, priced under it) sets `S.houseTier` and layers
  `BEK_DECOR.lakehouse_t2` over `BEK_DECOR.lakehouse` in `propsPrepare()`
  (`index.js`) — three more props in the same room, never a second map or a
  second `BEK_MAPS` entry, the same overlay-not-replace convention the farm
  plots and the pen already use.
- **The pen's second tier.** `BEK_BARN_PLOT2`/`BEK_BARN_SLOTS2` (`data.js`)
  sit immediately east of the first pen (farm map cols 9-14, clear of
  `BEK_FARM_PLOTS`' plot3 which starts at col 15) — a fourth unlocked-region
  flag `tileAt()` reads exactly like the first three, not a special case.
  `progression.js`'s `barnSlots(S)` is the one place tier 1 and tier 2
  concatenate, so `buyAnimal()`'s capacity check and the slot a new animal
  is placed at can never disagree about how many there are. Bought from
  Håkon like the first tier, kr-only, so it is a normal `buy`-carrying chat
  entry rather than code of its own.
- **The board's higher tier.** Two more `BEK_QUEST_TEMPLATES` entries
  (`rich_ore`, `rare_fish`), each carrying `act2: true` — read by
  `quests.js`'s `templateAvailable()` exactly the way it already reads
  `tool`/`animal`, never set there. No second reward formula: a rich vein or
  a rare fish is just a bigger number through `questReward()`'s existing
  markup.
- **One NPC beat each.** A `chat[]` entry per story NPC (two for Håkon),
  gated `if: S => S.act2Unlocked` the same way `BEK_TALK.astrid`'s four
  festival lines gate on `S.festival` — a chat entry rather than a `nodes`
  entry, since a beat that keeps resurfacing once the house is finished
  reads better here than one that fires once and is spent.

The ending screen itself (`drawEnd()`, `menus.js`) stopped being a screen
that ends play when the house-completion-milestone fix landed, but its own
SPACE prompt kept saying `START OVER` — true of the old behaviour, a lie
about the current one. It now reads `CONTINUE`, and the quest board's own
house row (`drawQuests()`, `menus.js`) stops reporting a construction status
once `S.act2Unlocked` (`BYGGET`/BUILT is a word for something under
construction) and reads as a title instead (`DITT HJEM`/HOME) — a status,
not a screen, matching what actually happens when you press SPACE on it.
