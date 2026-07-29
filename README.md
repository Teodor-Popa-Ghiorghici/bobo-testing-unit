# HOLYTRON DM-640

A beige CRT with TempleOS inside it. One HTML file. Sixteen colours.

```
templeos(7).html          22,020 lines, no build step, nothing to install
```

Open it in a browser. That is the whole install.

---

## Where this came from

TempleOS was written by Terry A. Davis, alone, over more than a decade, and
released into the public domain. He called it God's third temple. It ran in ring
0 with no network, no protection, no users but one. Every document was a program.
Every program could be edited where it sat. The whole thing — kernel, compiler,
editor, graphics, games, documentation — was held to 100,000 lines on purpose,
because he had decided that was what an operating system should cost. He died in
2018.

This is not that. It cannot boot, it cannot compile to machine code, and it does
not pretend otherwise. It is a replica built the way you'd build a model ship: to
understand the shape of the thing by making one, and to let someone who has only
ever read about it turn the knobs.

The choices that make TempleOS look the way it does were not decoration. 640×480
and sixteen colours because that is what every machine can do without a driver.
No anti-aliasing because a pixel is either lit or it isn't. One voice, one task
tree, one font. This build keeps that palette absolutely — the only thing allowed
off it is the plastic of the case, because plastic is not phosphor.

---

## Running it

```sh
git clone https://github.com/Teodor-Popa-Ghiorghici/terry
cd terry
open 'templeos(7).html'          # or just double-click it
```

There is no `package.json`, no bundler, no server. It is one file that runs from
`file://`. The only thing it reaches for over the network is the VT323 webfont
from Google Fonts; with no connection it falls back to Courier New and everything
still works.

Everything that persists — uploads, edits, icon positions, notes, the Bekkedal
save, the knob positions — lives in `localStorage` and IndexedDB under
`templeos.*` keys, so it is per-browser and never leaves the machine.

Chromium, Firefox and Safari are all fine. Web Audio needs one click or keypress
before it will make a sound; the boot splash is that click.

---

## What you're looking at

The monitor is the page. It isn't a picture of a computer sitting on a desk; the
case grows and shrinks with your browser window, and the beige is lit from the
upper left like injection-molded plastic under an office ceiling. The tube sits
in a recessed well behind glass with its own corner radius, wider than it is
tall, the way real glass is.

Underneath are the controls, and they all do something.

| Control | What it does |
|---|---|
| **LENS** | `FLAT` / `SOFT` / `FULL`. Bends the glass and the picture bends with it. The case, the well and the tube all deepen their corner radius to follow the same curve. `FULL` bends harder than the pointer can honestly track, and says so — it is there for screenshots. |
| **SCAN** | Scanline pitch in pixels, 0–4. `0` is off. |
| **DGAUSS** | Degausses. Hold it on a cold tube. |
| **PHOS** | Phosphor persistence: `P1` fast, `P4`, `P7` smearing. The same number widens the glow on lit characters *and* sets how little the canvas apps clear between frames, so the starfield, AfterEgypt and GodDoodle all drag their own tails. |
| **BURN** | Twenty years of the same menu bar ghosted into the coating. |
| **MUS** / **SFX** | Volume pots. Drag to turn, scroll, or use the arrow keys. |
| **VHLD** / **HHLD** | Vertical and horizontal hold. Both start locked at 5. Anything else and the picture rolls. |
| **LOBBY** | The hymn. Stays on while you use the desktop. |
| **POWER** | Really works. The tube collapses to a line and goes dark, and everything inside it stops. |

Knob positions are saved. The machine comes back the way you left it.

---

## Inside the tube

A boot POST counts the memory, nine boot lines scroll, and you land on a desktop.

**The desktop** has draggable icons that remember where you put them and refuse
to overlap — drop one on an occupied square and it spirals outwards to the
nearest free slot. Right-click for a context menu. Windows drag, resize, stack,
minimise to the taskbar, and are children of Seth.

**The editor** writes back into the file. Open `AutoExec.HC`, change it, close
it, open it again — your text is there, and `File > REVERT EDITED FILES` puts the
stock ones back.

**The terminal** is the compiler, because in HolyC those are the same program.
It walks the real file tree first and only falls through to canned answers for
things the tree doesn't claim.

```
DIR / LS        CD / CHDIR      TYPE / CAT      OPEN / RUN
DEL / RM        MD / MKDIR      TREE            PWD
COMPILE         MEM             BELL            CLS / CLEAR

NEOFETCH   UNAME   COWSAY   SL   FORTUNE   PING   SUDO
GODWORD [n]   GODDOODLE   GODSONG
TASKS   AFTEREGYPT   BEKKEDAL   MAGEN   COOK   STACK   NOTES   BOTTLE
ELEPHANT   DEFRAG   SAVER   CMOS   DEGAUSS   PANIC   LINES
```

Up-arrow walks back through history, and the history survives a reload. Every
command answers with exactly one sound, chosen from the loudest class of line it
printed — a verdict, not a stream of beeps.

`PING` and `CURL` are answered honestly: there is no network stack, and none was
ever written. `SUDO` points out you are already God. The fork bomb, in any
spelling, gets *THERE IS NO FORK. ONE ADDRESS SPACE. ONE RING. NOTHING TO
DOUBLE.*

`LINES` audits the file against Terry's 100,000-line budget and reports the
percentage spent.

`PANIC` drops you into the debugger with a register dump, because ring 0 has no
safety net — and so does any genuine uncaught exception anywhere in the build. A
crash here is not swallowed; it is displayed.

### HolyC

A real subset: tokeniser, recursive-descent parser, tree-walking evaluator. What
makes it HolyC rather than C is that a statement which is only a string prints
it, a format string takes its arguments as the rest of the statement, and a
function name on its own line is a call.

```c
"HELLO, TEMPLE.\n";              // this is a complete program

I64 i;
for (i = 0; i < 7; i++)
  "DAY %d\n", i;

GodWord;                          // same as GodWord()
```

`U0` `I64` `F64` `U8`, assignment, arithmetic, comparison, `&&` `||`, `if/else`,
`while`, `for`, blocks, function definitions, and calls with or without parens.
Built in: `Print`, `GodWord`, `GodDoodle`, `GodSong`, `Beep`, `BellRing`,
`Sleep`, `Rand`, `RandU16`, `StrLen`, `Cd`, `Dir`, `MemSet`, `Panic`, `Exit`.

`AutoExec.HC` really runs at boot, through this same interpreter. Break it and
the machine tells you which line.

### DolDoc

A document that is a program drawing itself. Commands sit between dollar signs
and take effect where they stand — colour as a command, a sprite sitting inside a
line of text, links and buttons as commands. This is the one thing about TempleOS
you genuinely cannot get anywhere else, which is why it got a real parser rather
than a nod.

```
$FG,14$$TX+CX,"HOLYC"$$FG$
$HL$
A bare string is a $FG,12$print$FG$. There is no main().
$SP,"cross"$ a sprite, in the middle of a line of prose.
$LK,"go to the kernel",A="::/Kernel/Kernel.DD"$
$MA,"RUN A LOOP",LM="I64 i; for(i=0;i<7;i++) \"DAY %d\\n\", i;"$
$TR,"A COLLAPSIBLE TREE"$
  ...contents...
$TR-$
```

Implemented: `FG` `BG` `BK` `UL` `ID` `HL` `TX` `SP` `LK` `MA` `CL` `TR`.
`$MA$` buttons run their `LM=` payload through the HolyC interpreter — the
document really is executable.

---

## The apps

Each one is a window, a child of Seth, and obeys the palette.

**AfterEgypt** — Terry's demo game. Fly the craft down the colonnade, don't hit a
pillar, reach the third temple.

**GodDoodle** / **GodWord** / **GodSong** — God's random. Terry seeded from
`RDTSC` and treated what came out as God speaking. A browser can't read the
timestamp counter, but the idea survives intact: take the machine's own jitter,
run it through a shift register, and let it choose. One picks words, one draws,
one plays.

**Tasks** — Adam is task zero and does not exit. Seth is his first child and
holds the shell. Every window you open is a child of Seth, and the list updates
live as you open them.

**Defrag** — moving clusters.

**Neofetch** — the specs, next to an ASCII temple. *Network: none, by design.*

**The Stack** — a hi-fi rack in a window: disc transport on top, integrated
amplifier with graphic EQ in the middle, spectrum analyser across the bottom.
None of it is decorative. The knobs are `BiquadFilterNode`s, the meters read an
`AnalyserNode`, the room is a `ConvolverNode` with an impulse synthesised at
start-up, and the five bundled records are rendered to `AudioBuffer`s by an
`OfflineAudioContext` — so a stock track and a file you drop in are the same kind
of object from the moment they hit the playlist. The whole faceplate is drawn
into one small canvas and blown up with nearest-neighbour, so the knobs have
jagged edges and the meters step: rack gear photographed badly, not a web page.

**Notes** — a vault of pages that point at each other. Type `[[Another Note]]`
and the link makes itself; if nothing is on the other end yet the link is still
drawn, in red, until you write it. A link to a note that does not exist is not an
error, it is a promise. `BACKLINKS` under each page shows who points at you.
`GRAPH` shows the whole thing from above — every note a box, every link a line,
draggable by hand or shakeable into place by a spring layout that runs while you
watch. Written to `localStorage` on a half-second debounce, so closing the
window, the tab or the machine loses nothing.

**Zen Garden** — twelve pots, eight species, a twenty-minute day. Plants grow
off wall-clock timestamps, so they keep growing while the window is shut and
while the machine is off; SUN tokens pile up on the shelf, capped at twenty, and
wait for you. Un-watered plants stop producing and never die. Nothing in this app
can be lost, which is the whole of its design. Each species is tuned to a
different note of a pentatonic scale, so poking them in any order is a tune.
After dark the fireflies come out and the nightpea starts paying.

**Hollow Sweeper** — Minesweeper, ruleset untouched: chording, flood fill, first
click always safe. Everything else is a dug-out hive in cross-section. Revealed
tiles drop two pixels inward on a fifteen-millisecond cascade following the
fill order; on a loss every larva hatches forty milliseconds apart and the
screen shakes. Three sizes, best times and streaks kept.

**League Solitaire** — Klondike, draw three, unlimited redeals. Four lanes
instead of four suits — Mid and Bot are the red pair, Top and Support the black —
and one champion per lane wearing three faces. Pays `max(40, 300 - moves × 2)`,
with the move counter on screen so you can watch the money go. The bouncing
cascade at the end is not optional.

**Crayon** — seven colours, no picker. The stroke is a noisy nib stamped along
the path with jitter, thinning and fading as the hand speeds up, so a slow line
is dense and a flick is a scratch. Drawings go in `MY DRAWINGS` as real files
with thumbnails, and come back editable. Export to PNG when you want to keep one.

**Crazy Dave's Shop** — the only place SUN goes. Frames, boot logos, pointers,
terminal schemes, pots and seeds. Hovering a frame, a pointer or a scheme puts it
on the whole machine while the mouse is there, free. He has thirty lines of
dialogue and not one of them is useful.

**Jaeger** — a bottle, its glass, and a running total you would rather not see.
700ml, a measure is 40ml, so there are seventeen and a half in there and the half
is the one that gets you. Click the bottle: it tips and pours exactly one. Click
again: the glass goes back empty. The level in the bottle is the honest one — it
only ever goes down, and the button in the corner is the only thing that puts it
back up.

**Elephant**, **Magen** and **The Cook** — see below.

**CMOS** — BIOS setup, read-only, because there is nothing to configure.

**The screensaver** — ninety seconds of nothing and the tube starts drawing on
its own: a starfield with proper phosphor drag, or God doodling until you come
back.

And the Konami code does what the Konami code does.

---

## The Cook

A ten-level puzzle game about a chemistry teacher who is very good at
something and very bad at stopping.

**The chemistry is invented.** Every reagent on the shelf is a direction and a
distance across a bench, and that is the whole of what any of them do — there
is no procedure in here and there was never going to be, because a procedure
is not a puzzle. Potion Craft, Bartender and The Witness are all abstract
deduction systems wearing a theme; this is the same trick, and the theme is a
man in the desert with a hat.

The bench is a 19×11 grid. Your flask sits on it, each reagent moves it a fixed
number of cells in a fixed direction, and the path it travels is what matters —
walls stop it, hazards ruin the batch. Ten levels introduce, one at a time:
glassware to route around, hazards, **mirrored plates** that reverse the whole
shelf until solvent clears them, **doubling plates**, a **burner** whose wax
seals melt only when hot and whose frost seals hold only when cold,
**unlabelled jars** whose vector you can only learn by spending a pour on it, a
**sweep** that crosses the bench once for every pour you make, and **three
stages** that must be completed in order. The last level has all of it at once
and two unlabelled jars, one of which changes when the burner does.

**Every board is proved solvable before it ships.** A breadth-first solver
walks the entire legal state space — position, remaining charges, mirror state,
temperature, stage, sweep phase — and the par printed on each level is that
solver's shortest solution, not a guess. It caught a real design flaw during
the build: a shelf of only even-length pours can never change which rows it can
reach, so four of the original targets were mathematically unreachable.

**Somebody watches you fail.** Every review of Bartender: The Right Mix comes
back to the same thing — failure produces a *reaction*, not a reset. So the kid
is there, with about forty lines, and he has opinions: on ruined batches, on
pouring at a wall, on the first time a mirror flips the shelf, on a solve that
took you eleven goes. A puzzle you fail in silence is homework.

**Hovering a bottle draws you the line before you commit** — the whole path,
plus a label on the cell you would land on (`RUIN`, `x2`, `FLIP X`, `STAGE 2`,
`SWEEP`). It costs nothing to look, which is the Potion Craft lesson: planning
is the game, and flailing shouldn't be. It never spoils an unread jar.

**Three medals a board**, not one tick: finished it, finished it in par, and
finished it in par with nothing spilled and nothing restarted. Ten stars opens
an **eleventh bench** that is not a bonus stage — it is a par-28 solve needing
the mirror, the burner and both unlabelled jars at once.

Nobody should be stuck in silence either — the Witness reviews that sting are
the ones about a game that explains nothing and calls that respect. After a
while the kid offers the cheapest nudge, then a better one, and never gets past
*count it*, because the counting is the entire point of being there.

Purity is scored against par, best-per-level is kept, and 99.1% is the ceiling
because it was never going to be 100. Ten story chapters and an ending, a
ledger of twenty-four achievements, a level select, undo, and a free reset.

Four tracks in D minor pentatonic, which is desert music: the point of it is
the space between the notes, and it gets less spacious as things go wrong.

---

## Magen

An incremental game about Jewish practice, built on Cookie Clicker's economy
because Cookie Clicker's economy is a solved problem. You press the Star of
David and you do a **mitzvah**. Then you buy things that do them without you.

Twenty buildings, from a **kippah** at fifteen mitzvot to **the Name** at 540
septillion, climbing through challah, mezuzah, the tzedakah box, a Torah scroll,
a shul, a yeshiva, a mikveh, a beit din, a kibbutz, the diaspora, Jerusalem, the
Kotel, the Second Temple, the Ark, the sefirot, the world to come and the
Shekhinah. Costs rise 15% a purchase; every building has five named upgrade
tiers that double it — *the yad*, *crowns on the letters*, *dancing with it*.

On top of that: ten upgrades for the hand, eight for **kavanah** (the milk
analogue — every achievement raises it and these turn it into a multiplier,
which is a fairly exact model of the doctrine), twelve **communities** because
Jewish culture is not one culture (Sepharad, Ashkenaz, Mizrah, Teiman, Beta
Israel, Bene Israel, Bukhara, Romaniote, Kaifeng, Gruzim, the Karaites, and
every other), and twelve that change the rules outright.

**Ninety-eight mitzvot to complete** (the achievements), a **golden star** with
five effects including one bad one, buy 1/10/100 and sell, a stats page, autosave
with offline progress, and a news ticker carrying proverbs, Talmud, and history.

Every upgrade has its own icon, colour-coded by family — red for the hand, purple
for kavanah, cyan for the communities, green for the rule-changers, and building
tiers show that building's own icon with pips for how many of its five you own.
**Flavour text is grey and mechanics are yellow**, everywhere, so you never have
to read a paragraph to find the number.

Holding the mouse down keeps pressing. Every press builds a **chain**, and the
chain raises your **crit chance** — a crit is worth seven presses and detonates.
That is the hook: the longer you keep going, the more likely the next one pays.
Buying throws the icon across the screen into the star; selling throws it back.
Everything lands with a shockwave, a spray of sparks, a whole-pixel screen shake
and a banner, and the counter rolls rather than snapping. A bar under the rate
always says what the next thing is and how long until you can afford it.

The sky is not fixed. It walks from **night to full morning across six eras** as
your lifetime total climbs — moon out, stars fading, dawn at the horizon, sun up —
and a city grows along the bottom, one silhouette per building, with lit windows,
chimney smoke and doves crossing.

**Shabbat** arrives every six minutes. Eighteen seconds before, you can light the
candles. Then everything stops — production drops to 15%, you bank **menuchah**,
and at Havdalah it all comes back multiplied by how much rest you banked. Rest is
never a penalty here, which is also the position of the tradition.

The **Shabbos goy** is an upgrade that holds production at 60% through it: the
neighbour who comes by on a Friday night and turns the stove down, because that
is what neighbours do. He is not a building. A clicker in which gentiles are a
unit of production you buy and stack is the oldest libel there is with a progress
bar on it, so the word is in the game the way the word is actually used.

**The machloket** opens at the beit din: a real disagreement with both sides
intact — Hillel and Shammai on the Chanukah lamp, Rabbi Eliezer and the voice
from heaven, whether creating humanity was a good idea at all. Pick a side and
you get a buff either way, because *elu v'elu* — these and these are the words of
the living God.

**L'dor vador** is the prestige layer. Hand everything to the next generation and
they start with your **zechut avot**, the merit of the ancestors, and a tree of
ten permanent upgrades bought with it.

Persecution is in the ticker and on the **yahrzeit candle** in the corner of the
stage, and neither pays anything. The candle produces nothing, has no upgrade,
and its achievement is explicitly worth zero. You light it because you light it.

The music is four tracks in **Ahava Rabbah** — the phrygian dominant, the mode of
half the Ashkenazi liturgy and most of klezmer — one in the Ukrainian dorian of
*Mi Sheberach*, and a fifth for Shabbat that does not go anywhere on purpose.

---

## The elephant

One friend, five places, and two hundred things he has been meaning to tell you.
There is nothing to win, nothing to manage and no score. You press the button, he
thinks about it for a second or two, and then he says the thing.

He always opens with *hey there friend*. After that it is a shuffled bag rather
than a die, so you will hear all two hundred before you hear any of them twice —
and they are all of a kind: *i believe in you pal*, *rest is not quitting,
friend*, *you are not a burden, kiddo, you're a person*, *grief is love with
nowhere to go, give it somewhere to go*, *hold on till morning, just till
morning*.

He stands in the sunflower field, at the oasis, in the mountain field, up in the
clouds, and on the steps of the third temple — the same stepped temple the
machine draws on its own boot splash, at two and a half times the size. The place
changes every eighty seconds, or whenever you press PLACE, and each one owns one
of five tracks that crossfades in with it. They are not lullabies: every one is
in a major key, every one climbs, and every one lands somewhere brighter than it
started.

Nothing on the canvas is ever completely still — the sunflowers sway on three
different clocks, the water slides, the wind crosses the meadow, the clouds
drift at three speeds, the stars blink, and he breathes, fans his ears and blinks
on three cycles that never fall into step and turn into a tic. When he is
thinking he curls the end of his trunk up and looks past you. When he is talking
the tip bobs on the syllables and the speech bubble types itself out, wrapped and
balanced to whatever length the line happens to be.

He is built the way everything else in here is built: flat runs of the sixteen
colours, a hard black edge on every solid piece of him, one light source in the
upper left, and every fade an ordered dither. The rumble he speaks with is a
triangle wave at 56Hz — elephants really do talk down there, mostly below where
you can hear it.

---

## Bekkedal

A calm farming game for the Demo folder. 480×300, sixteen colours, no rush.

Nine places across a valley — the farm, the town, the water, the forest, the
meadow, the mountain dairy, the plateau, the mine and the fjord — plus two
interiors. Turn soil, plant, water, forage, fish, fell, mine, sleep. There is a
lot with trees on three sides and water on the fourth that you are trying to buy
for 1200 kr, and a house to build on it, and that is the ending.

Eight people talk and one does not. Each of the eight asks you a question the
first time you meet them:

> *Why did you come to Bekkedal?* · *How should it be built?* · *Why do you
> fish?* · *The fjord, or the open sea?* · *Why did you climb all the way up
> here?* · *Milk or wool — what do you keep them for?* · *Do you trap up here, or
> watch?* · *Silver, or stone?*

The answer is written down permanently. It changes what they do for you days
later, and it is read back to you in the ending — *You came for the quiet. It is
still here.* / *Every beam you carried yourself.* / *The planks came by boat. The
house stands all the same.*

From day 6 there is a bear in the middle of the forest holding a broom. He says
**PERKELE**. Nothing in the game acknowledges him, including the ending, where he
is also present, sweeping, off to the right of the house.

Everything is bilingual — Norwegian-with-English, or English-only — toggled in
the app bar and remembered in the save. Evening arrives as an ordered 4×4 dither
of dark blue rather than an alpha wash, so the screen never once leaves the
palette.

Fishing has a rare table: one bite in ten is a halibut or a golden trout, and the
fight is a different animal — a sliver of a zone, a faster needle, one more pull.

---

## SUN

The six rooms are one machine because they share a currency.

`Economy` is a singleton with four methods — `balance`, `earn`, `spend`,
`onChange` — and everything in the build goes through it. The garden drops it
passively and keeps accruing at 40% while you are away. Sweeper pays 15/60/200
by difficulty plus a time bonus. Solitaire pays by move count. The Cook pays per
medal, once, the first time each one is earned — a bench already beaten is a
thing to come back to, not a tap to leave running. AfterEgypt pays 50 for
reaching the third temple, which is the one payout moment it already had.
Crayon pays nothing at all, on purpose: it is the one place on the machine that
is not keeping score, and neither does the Elephant, which has nothing to score.
Magen keeps its own books in mitzvot and is left alone: an incremental game with
a second currency bolted to the side of it is two games in one window.

The only sink is Dave. The counter in the taskbar rolls a digit at a time and the
sun sprite turns one revolution whenever it changes, and `ACCOUNT.EXE` — the
sun in the taskbar is the button — keeps the last fifty transactions with their
sources.

Everything bought is a look and nothing bought does anything. Frames replace the
plastic around the screen and tint the phosphor with it; logos replace the temple
on the boot splash; pointers are PNGs minted at boot from pixel arrays; schemes
recolour every terminal and dialog in the build. All four are CSS custom
properties on `#room` set by `Cos`, which is why the apps written before any of
it existed inherit all of it without one of them being edited.

Everything is written to `localStorage` under the same `templeos.*` namespace the
rest of the machine already used — one key per subsystem, debounced half a
second, defaults filled in for any key a save from before this update does not
carry. A key that will not parse is copied to `<key>.bak` and the machine says
`DISK ERROR` rather than starting over quietly. Typing `FORMAT` on the bare
desktop, with nothing focused, wipes all of it after asking once.

---

## The style meter

Deleting a file is not housekeeping. It is a performance, and the machine grades
it.

```
D    DESECRATING          C    CORRUPTING           B    BLASPHEMOUS
A    ANNIHILATING         S    SACRILEGIOUS         SS   SSCORCHED EARTH
SSS  SSSTEFAN BOERUSTORM  !!!  HAPPY BIRTHDAY
```

Points in, points always bleeding out; the letter follows the points. A delete
within 3.5 seconds of the last one extends the chain and is worth more, so a fast
rampage scores roughly double a slow one. Stop for 2.2 seconds and the drain
opens and the rank falls back down through the letters. Nothing is saved — every
reload starts you back at nothing, and the power switch kills the run.

The music layers *on top of* the lobby hymn: same key, double time, one more
instrument per rank, filter opening as you climb. The delete sound swaps every
two ranks, from a dry noise burst at D to a full chord at the top.

Tuning lives in `STYLE_CFG`, thresholds in `STYLE_RANKS[].at`. As tuned, an
unbroken chain reaches HAPPY BIRTHDAY at about 35 deletes; break the chain often
and you will never get there. `style-meter-snippets.md` is the design note for
it, kept as reference — the code in it matches what shipped.

---

## Your own files

Four ways in, no editing required:

- drag files onto the desktop → they land in `::/`
- drag files onto an open folder window → they land in that folder
- drag files onto a folder **icon** → they land inside it
- `File > UPLOAD`, or `Ctrl+V` to paste from the clipboard

Images are crushed to the sixteen colours with Bayer dithering on the way in
(`File > VGA 16-COLOR IMPORT` turns that off for new uploads). Video gets the
same treatment, live, at 15fps — decoded by the browser, scaled down, and pushed
through a 32,768-entry lookup table from 15-bit RGB straight to a palette index.
Building that table costs half a million comparisons once; after that every pixel
of every frame is one array read, which is the only reason real-time dithering of
video is affordable at all. Set a video as wallpaper and it plays behind the
icons at ten frames a second, because it is a background and the tube has other
things to do.

Uploads survive a reload. Right-click an uploaded file to delete it. Stock files
are locked — `DEL` will tell you so.

---

## How it's built

One file, in numbered sections. The comment banners are the map.

| Section | |
|---|---|
| CSS · THE HARDWARE | the case, the well, the glass, the chin |
| CSS · THE STYLE METER | inside `#tube`, so the lens zooms it too |
| 1 | pixel image helper |
| **2** | **the virtual file system — the one object to edit** |
| **3** | **the terminal response table** |
| 4–5 | sprites, boot sequence |
| 6–9 | window manager, icon grids, terminal, desktop |
| 10 | the tube — lens, glass, speaker, power |
| 11 | user file import · 11.3d the style meter |
| 12–14 | God's random, DolDoc, HolyC |
| 15–18 | panic, Adam and Seth, the 16-colour pipe, video |
| 19–23 | AfterEgypt, Defrag, screensaver, neofetch, Konami |
| 24–26 | the rest of the hardware, running the apps, AutoExec |
| 27 | Bekkedal, and video on the desktop |
| 28–30 | the Stack, the Bottle, the Vault of Notes |
| 31–32 | the disk, the SUN economy, the taskbar counter, `ACCOUNT.EXE` |
| 33 | the cosmetic system — frames, logos, pointers, schemes, the catalogue |
| 34–35 | the new noises, and Crazy Dave's shop |
| 36–39 | the Zen Garden, Hollow Sweeper, League Solitaire, Crayon |
| 40–41 | display settings, `FORMAT`, and bringing all of it online |
| 42 | the Elephant, and the two hundred |
| 43 | Magen — the clicker, its economy and its ticker |
| 44 | The Cook — the bench, the ten boards and the story |

**To add a file or a folder, add a node to `FS` in section 2 and nothing else.**
Every icon, folder window, editor and viewer in the build is generated from that
one tree.

```js
{ name: "X",     type: "folder", children: [ /* more nodes */ ] }
{ name: "X.TXT", type: "text",   content: "the editable body text" }
{ name: "X.DD",  type: "doc",    content: "$FG,14$a DolDoc$FG$" }
{ name: "X.HC",  type: "code",   content: "\"HELLO\\n\";" }
{ name: "X.BMP", type: "image",  src: "data:... or https://..." }
{ name: "X",     type: "app",    app: "bekkedal" }
```

Nesting is arbitrary — folders inside folders inside folders all work. Edits made
in a text window write back into this object. To add an app, write an
`openThing()` and add one line to `runApp()` in section 25. To change what the
terminal says when it doesn't recognise you, edit `TERM` in section 3.

### The rules the code follows

- **Sixteen colours, no exceptions inside the tube.** The VGA palette is the only
  thing allowed on the phosphor. The beige plastic of the case is off-palette on
  purpose and is the only thing that is.
- **No anti-aliasing.** `shape-rendering: crispEdges`, `image-rendering:
  pixelated`, `-webkit-font-smoothing: none`. Curves are drawn as staircases of
  rectangles.
- **No gradients, radii, shadows or transitions** in the interface. The scanline
  overlay and the plastic are the exceptions, and they are hardware.
- **Whole pixels.** Animations move in integers and snap with `steps()`.
- **Fades are dithers.** Evening in Bekkedal, the ending, the degauss — ordered
  4×4 dither, never an alpha wash, because an alpha wash invents colours.
- **No dependencies.** One file. The webfont is a nicety with a fallback.
- **The 100,000-line budget is real.** Type `LINES`.

---

## What it's supposed to become

The shell is finished. What's still being added are the rooms inside it.

Bekkedal is in and playable. What it still wants is the long tail — festivals on
fixed days, a second crop tier, and a reason to keep the mine open after the
silver.

Past that, the direction is more of the same: small complete things that live in
folders, each one obeying the palette and the line budget, each one a reason to
open a window and sit inside a machine that was never really practical and was
never trying to be.

---

## Licence and thanks

TempleOS was released into the public domain by Terry A. Davis. This replica
follows it there.

Terry wrote the original alone, and every good idea in this file is his.

---

*A limit is not a shortage. It is a decision about what is allowed to be
complicated.*
