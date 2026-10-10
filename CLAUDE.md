# TempleOS Module System

## It is a desktop app (Electron)
The machine ships as a Windows installer and a Debian package; there is no web build and no server.
`index.html`, `kernel/` and `apps/` are the app and are loaded as-is — an app is still a plain ES module
and never touches Electron. `electron/` is only the shell that hosts them:
- `electron/resolve.js` / `protocol.js` — the app loads from `templeos://app/` and serves only `index.html`,
  `kernel/`, `apps/`, `assets/`, `vendor/`. A new top-level folder the app needs must be added to `SERVED`.
- `electron/main.js` — sandboxed window, no Node in the renderer, strict CSP, no outbound network, zoom
  locked at 100%, remembers window size, single instance. `electron/preload.cjs` exposes only `version` and `quit`.
- **Never change** the scheme/host (`resolve.js`), `app.setName`/the `userData` folder (`main.js`), or
  `appId`/`productName` (`electron-builder.yml`). Every save lives under them; changing one orphans all saves.
- The VT323 font is bundled in `vendor/fonts/` (`kernel/fonts.css`). Never add a remote URL: a request that
  leaves the machine fails `check:shell`.

### Commands
```
npm install
npm start               # run it from source
npm run pack            # unpacked app in dist/;  npm run dist  -> installer for this OS (win: .exe, linux: .deb)
```
Checks (Linux: prefix the GUI ones with `xvfb-run -a -s "-screen 0 1920x1080x24"`; add
`HOLYTRON_EXE=<path to the built binary>` to run the same checks against the packaged app):
```
npm run check:paths     # every import/asset path matches its file's exact case (Windows ignores case, Debian does not)
npm run check:shell     # origin, sandbox, CSP, no outbound traffic, VFS seed, relaunch
npm run check:persist   # a Bekkedal save survives quit + relaunch; power-cut loss window
npm run check:apps      # all apps open/close cleanly; fails only on leaks NOT in scripts/check-apps.known.json
npm run check:listeners # cleanup must not cost behaviour: an open window's listeners still work (crayon draws, folder redraws)
npm run check:perf      # frame rate and Bekkedal's day clock
npm run check:package   # after `npm run pack`: every file the app loads is packaged, no scaffolding is
node scripts/smoke.mjs  # ~10 min; node scripts/lint-content.mjs; node apps/*/*_check.js (pure Node)
node scripts/check-drunk.mjs   # the Jäger journey (pure Node): a blackout is inside one bottle, a little over two minutes away at the very quickest, with the hands slowing as it goes
node scripts/check-style.mjs   # the style meter against five kinds of player (pure Node)
node scripts/check-styletrack.mjs # the style meter's recording: how it opens under the delete sound, how it loops, its gains (pure Node)
node apps/shop/lines_check.js  # Dave's crazy hover lines: the pool, the 1-in-10 rate, no repeats (pure Node); node scripts/check-farewell.mjs his farewell tiers and babble (pure Node)
node scripts/check-petlines.mjs # the desktop elephant's words: 77 idle lines, 19 goodbyes, wakings, no repeats, all lowercase and in his voice (pure Node)
node apps/bekkedal/rooms_check.js # Bekkedal's two houses as made rooms: zones, furniture on its footprint, repeating patterns, what answers (pure Node)
node scripts/check-theme.mjs   # every colour scheme as a whole look: the gradient ramp is monotonic and legible (pure Node); npm run check:props (shell) makes every game's prop folder and reads the files back
node apps/sweeper/hard_check.js # the Underdeep is hard and a build answers it: a bot plays bare and built (pure Node); node apps/solitaire/music_check.js its score, layers and energy
node scripts/check-buffs.mjs    # the hidden buffs: rules, the book, every effect's reader (pure Node); node scripts/check-readable.mjs the readability veil's numbers (pure Node)
node scripts/check-stackhud.mjs # the Stack's control on the desktop and its remote (pure Node); node apps/hifi/album_meta_check.js what an album says about itself, apart from its discs (pure Node)
node scripts/check-taskbar.mjs  # the taskbar's pictures, menu and SHOW THE DESKTOP (pure Node); node scripts/check-winplace.mjs where a window was left (pure Node); node scripts/check-launcher.mjs GO TO (pure Node)
node apps/bottle/labels_check.js # every drink on its bottle: the words fit the paper, the pictures are whole (pure Node); node apps/elephant/{eat,slide}_check.js his eating and his slide (pure Node); node apps/standbattle/pose_check.js; node apps/terminal/complete_check.js
node scripts/check-delete.mjs  # the delete reel: a beat a file, 70 ms apart, a tune in C pentatonic that lands on the high C (pure Node)
node scripts/check-drop.mjs    # the trophies on the desktop: gravity, stacking, window edges, rest (pure Node)
node apps/solitaire/music_check.js # Solitaire's score (pure Node); node apps/solitaire/cosmetics_check.js its gifts, one per trophy (pure Node)
node scripts/check-desk.mjs    # where desktop icons go: the zones, the grid, the occupancy map, a full desk (pure Node); npm run check:bulk pastes and deletes two hundred files
node apps/aftere/aftere_check.js # AfterEgypt: a bot flies all five ways across, nothing is asked that the ship cannot fly, the pay climbs (pure Node)
node apps/garden/garden_check.js # the garden: synergy arithmetic, and how long 99,999 SUN takes three kinds of player, equipped and not (pure Node)
node apps/bekkedal/life_check.js # what Bekkedal's people do between their posts: chores, sleep, errands, gifts worn (pure Node)
node apps/aftere/music_check.js # AfterEgypt's score, layers and sky mapping; node apps/aftere/sfx_check.js its effects and the sound of a flight (pure Node)
node apps/magen/auto_check.js # Magen's auto-press ladder, its unlock at 1,000 presses by hand, and the rates tooltip (pure Node)
node apps/magen/music_check.js # Magen's score, its band's energy and the seams between tunes (pure Node); apps/bekkedal/music_check.js likewise
npm run check:music     # instruments, the studio, every game's score, and the style meter's recording
npm run check:sun       # the SUN budget: every game's real pay tables through a model of an hour of playing it, held to a band (docs/sun-economy.md)
npm run check:contrast  # every colour scheme, every stylesheet pair, and (in the shell) every app and its tabs and canvases measured for contrast; `--pure` skips the shell
npm run check:trophies # the ledger: the engine, all 419 trophies, what they pay, the terminal's view (pure Node); node apps/{aftere,standbattle,bottle}/trophy_check.js, node apps/notes/links_check.js
node apps/holyc/lang_check.js # the HolyC language beyond the lessons: operators and their HolyC precedence, arrays, pointers, MAlloc, classes and unions, switch, goto, try/catch, default and variadic arguments, function pointers, #define (pure Node); node apps/sweeper/charm_text_check.js a charm says what is true at the bench it is read at (pure Node)
node scripts/check-trophy-wires.mjs # every trophy has something that can reach it: its event is emitted, its counter added to, its set marked (pure Node, a static read; `npm run check:wires`); node scripts/check-pictures.mjs the eleven pictures a game gives at ~60% of its trophies (pure Node); node scripts/check-eggs.mjs the golden sun eggs (pure Node)
node apps/holyc/holyc_check.js # HOLYC.EXE: the language, the stage, all thirty-four lesson steps and fifty-six puzzles proved against their model answers (pure Node)
node apps/sweeper/run_check.js # Dungeon Sweeper: a bot does random things in every room and then finishes it; spells, flags, the compass, the pay (pure Node)
node apps/garage/edit_check.js # the Garage's note, segment and undo logic (pure Node)
node apps/standbattle/{framedata,combat,input,content,fairness,anim,ai,trophy}_check.js # Stand Battle: the sim holds every move's table, the rules, the input windows, the content, the authoring guide, the animation, the CPU and the trophies (pure Node); node apps/standbattle/headless_harness.js plays every mode seeded; node apps/standbattle/budget_bot.js adds up the hours; npm run check:standbattle plays the screens with real keys (shell)
node apps/standbattle/{rig,music}_check.js # Stand Battle's limbs (feet on the floor, knees and elbows the right way) and its seven tunes (pure Node)
node apps/credits/credits_check.js # CREDITS.EXE: any portrait size, the four hands, the tray, the pictures (pure Node); node scripts/check-gifts.mjs what the four give (pure Node)
node apps/crayon/panels_check.js # the Crayon's panels: where they stand on several desktops, what is remembered, the session (pure Node)
node apps/bottle/{shapes,styles}_check.js # the bottles' shapes, caps and labels, and the fifteen hands (pure Node); node scripts/check-lore.mjs LORE ACCURATE (pure Node)
node apps/magen/cookie_check.js # Biscu's cookie for the star (pure Node); node scripts/check-cheese.mjs Gheghe's cheese, the pile and the eating (pure Node)
node scripts/check-geese.mjs   # Thea's geese: the bird, the honk, the swim and the flight, the rare fly-past, Dave's head (pure Node); node apps/bekkedal/geese_check.js their water
node apps/cook/shed_check.js   # the Cook's shed: the backyard puzzle's rules, every board solved, Jesse's words and face, the whole controller played (pure Node)
```
Pixel comparison between two builds: `scripts/bekkedal_shots.mjs` twice per build, then `scripts/pngdiff.mjs`.
An app that opens its own window (`open()`) is never sent `unmount()`: add its window/document listeners with
`scopedListeners(el).on(window, type, fn)` from `apps/lifecycle.js`, which removes them when the window closes.
Stand Battle's checks, `check_kit.js`, `headless_harness.js` and `budget_bot.js` are dev-only and are not packaged (nothing in the app imports them).
CI (`.github/workflows/build.yml`) builds and tests both installers. Record of the move: `docs/electron-migration-plan.md`.

## The machine's own behaviour (kernel)
- **The taskbar clock** (`#clock`, `startClock()` in `kernel/boot.js`) shows the real local time, HH:MM:SS.
- **Boot.** `kernel/boot.js` decides, `kernel/bootseq.js` performs. A launch after **eight hours** away (a 5 min
  heartbeat in IndexedDB `templeos_meta`, not the launch time) gets the *long boot*: ten seconds, unskippable — seven of a
  PC in trouble (dying fan, bad block, drive timeout, a progress bar that goes backwards, a freeze, the song coming
  through a wall), then three of crawling text. **The text is `kernel/boot_text.js`: edit that file, nothing else.**
  Every other power-on is the quick boot. Both end on `PRESS [~] TO ENTER` and only `~` (`` ` ``/Backquote) enters:
  clicks and every other key are ignored. The `#bootcursor` element appears when it is ready (the checks wait for it).
  A long boot that is interrupted (power cut mid-way) is owed again.
- **The set is off when the app opens**, always, the first time and every time (`loadCRT` in `kernel/hardware.js` sets `CRT.on = false`): the glass is dark, `#powerhint` says to press the POWER button, and the button glows (`#power.callme`). The `PULL THE PLUG` trophy needs the set to have been switched *off* first; switching it on from cold is not it. A check that drives the app presses `#power` (or calls `window.powerOn()`) before it waits for `#bootcursor`.
- **The first desktop shows what the machine has** (`kernel/welcome.js`, `window.Welcome`): once ever (`templeos.welcome.v1`), a window of the tools (the terminal and what it answers, Help, files, the games, Dave's, the ledger, the Garage, the mixer), each with a button. `WELCOME` in the terminal, the Help START page and `Welcome.open()` show it again. It does not open for a machine driven by a test (`navigator.webdriver`).
- **Desktop icons sit in zones** (`kernel/desk_grid.js`: `zoneOf`, `zoneBox`): tools top left, your own files beside them, the games top right, the machine's papers bottom left, the bin in the bottom right corner. A zone fills left to right and then down; an icon that already has a place keeps it, and a desk that was still the old single column is laid out in zones once (`templeos.deskzones.v1`). `ARRANGE ICONS` uses the same zones. `scripts/check-desk.mjs` holds it.
- **Pinned trophies** (`kernel/trophies_pins.js`): any number (12) can be pinned in the ledger (`PIN` on a card, double-click, Enter; `T.pin`, `T.isPinned`, `T.pinsList`). A small square sits under the menu bar at the right of the glass, over every window and program (`.pinbox`, z-index 8000); hovering it lists the pinned trophies with their exact condition and live progress, and a click on one finds it in the ledger. No pins, no square.
- **A colour scheme is worn at two depths** (`kernel/theme_fx.js`; `kernel/win_skins.js`; `kernel/cos.js` `applyScheme`/`dressFrame`; `kernel/theme.css`, "THE SCHEME"). **Notes is dressed all the way down**: a gradient map (SVG filter `--th-filter`, laid on the scheme's ramp) over its title bar and grip, and the whole of its page (list, editor, reading view, links, graph) in the `--n-*` inks. Notes is the one place where the colour of text is a choice, so it is the one place a scheme is chosen (`[T]`, Notes windows only, remembered in `templeos.wintheme.v1`), and `notesInks` pushes every ink until it has contrast against the page it is read on. **Everything else is dressed on the outside only, and never in its art**: every window's frame (the bar's colour and its ink, the edge, `--bar-ink`), the **menu bar and taskbar** (`--th-bar*`), the **colour of the desktop** (`--sch-desk`) and the **ink of the icons' names** on a bare desk (`--th-lbl`; over a wallpaper the names keep their plate: `html.deskpic`), the **pop-ups, the toast and the in-glass boxes** (the `--sch-*` inks, which `.win` puts back to the machine's own so nothing inside a window is recoloured), and two simple overlays on every window (`.win::after`: a hairline just inside the edge and a soft glow just outside it, transparent under the default scheme). The games, the terminal, every canvas and picture, the icons' pictures, the elephant and a wallpaper keep the machine's own colours. **None of the chrome is a filter**: a filter laid over it made a pale scheme (PAPER) lose the icons' names and the taskbar. It is arithmetic on the ramp (`chromeOf`, `barOf`, `roomVars`: a VGA colour through `frameHex`, then pushed by `readable` until its ink reads at 4.5:1). Dave's scheme cards are a small Notes page in the scheme's inks. `node scripts/check-theme.mjs` holds every scheme as a whole look: Notes' inks, every chrome pair, every kind of title bar, the pop-ups, and that the stylesheet reads each variable with the machine's own colour as the fallback.
- **Rewards** (`kernel/rewards.js`): a shelf item with `earn: '<trophy id>'` is never for sale; it is given the moment its trophy is earned (and at boot for one earned before), `Cos.grant`, with a line from Dave. Solitaire's fourteen trophies each give one thing for the table (`apps/solitaire/cosmetics.js`: a card back, a table, an ending for a win; Dave's SOLITAIRE shelf; the BACK, TABLE and WIN buttons of the game cycle what you own), and each game's mastery seal opens a secret scheme or pointer (shown as `???` until it is yours). **Trophy pay is by effort**: 100 / 350 / 1,200 SUN and 2,500 for a seal, about 171,000 SUN over all of it (`TIER_PAY`, `MASTERY_PAY` in `kernel/trophies_core.js`).
- **The trophy box** (`kernel/trophy_box.js`, `kernel/trophy_drop.js`, `apps/trophybox`): the first gold trophy or mastery seal puts `::/TrophyBox` on the desktop, once. In it the big trophies are cups; drag one out and it is an object on the desktop with weight and a hitbox: gravity, a bounce (a seal is heavy, a cup light), stacking, standing on the top edge of a window (a one-way platform), the walls, being thrown. It sleeps when it is at rest. Double-click one, or drop it on the box, to put it back. `stepWorld` is pure and held by `node scripts/check-drop.mjs`.
- **Lobby music.** The boot always plays the hymn, whatever the LOBBY switch says; on the desktop the switch and MUS
  govern it. `kernel/music_variants.js` builds four moods of the *same notes* (HYMN, MELLOW, DYNAMIC, GLITCH) as
  plain specs; the lobby plays them live (`kernel/music.js`) and TheStack presses the same specs as discs. The listener
  picks the variant in the mixer panel (♫).
- **Mixer.** `kernel/mixer.js` lists only what is running: a channel is offered while a window with its `appId` is open
  (`openWins` carries `appId`; `wm.js` fires `wins-changed`). A new app with music: add a channel to `CHANNELS`, multiply
  its bus by `window.Mixer.get('<id>')`, and listen for `mixer-changed` (AfterEgypt's `aftere` channel: its tunes follow the slider through the studio channel, its effects are
  its own bus and are relevelled on `mixer-changed`).
- **Fullscreen.** Every window has `[□]` (also F11 or a double-click on the title bar). A window whose app lays itself
  out off its own size sets `fluid: true` (or `body.dataset.fluid = '1'`) and is simply given the room. A window whose
  picture *is* the window (a `.gamepane`/`.godpane`/`.vidpane`, or a canvas that is the body's own child: `isCanvasWindow`
  in `wm.js`) is kept at its built size and scaled to fit. Every other window, **including one that merely has canvases
  in it** (the shop's thumbnails, Magen's star, Crayon's swatches), is a layout and just fills the desktop; it used to be
  scaled like a picture and ended up over its own title bar. An app whose root *is* the window body (it sets
  `root.className`, which drops `.wbody`: the shop and Notes) fills it with `flex: 1 1 auto; min-height: 0`, never
  `height: 100%`: the browser's zoom is applied to that very box and a zoomed 100% is taller than the window.
- **Drunk.** `kernel/drunk.js` (the bottle app) acts on the **whole interface**: an inline filter/transform on `#room` (case,
  well, chin and knobs as well as the picture), and the edges closing in and the eyelids are an overlay fixed to the viewport
  (`#drunkover`, built by `drunk.js`). `#tube` is left to the hold knobs, the saver and the power animation. Never give `#room`
  a fill-forwards animation: an animated value beats an inline style, which is what silently killed this effect before.
- **The SFX knob sets the bus when it turns.** `Snd.sfx.gain` is set when the speaker wakes (`snd.js`) *and* by the SFX pot (`hardware.js`); it used to be set
  only at wake, so a machine that woke with SFX at its default 0 stayed silent however far the knob was turned, until it was relaunched.
- **The chin.** There is no LENS: the glass is flat (square tube corners, straight scanlines; `CRT.lens` is deleted from any old save).
  DGAUSS is a switch (`CRT.degauss`, default on, saved): while it is on, purity patches are painted into the glass canvas with the
  scanlines (`kernel/degauss.js`, once per resize and per switch, so nothing animated sits over the picture); switching it on and the
  terminal's `DEGAUSS` fire the coil (`#degauss.pulse`, a one-shot flash).

- **Durable storage.** `index.html` loads `kernel/durable.js`, which mirrors every `localStorage` write into IndexedDB
  (`templeos_ls`) and restores it before `kernel/boot.js` loads. Chromium's own localStorage flush can lag by more than
  ten seconds, so without it a power cut loses recent saves; `check:persist` measures exactly that.

- **Files are real.** `kernel/vfs.js` is the key-value store; `kernel/vfs_ops.js` hangs `move`, `copy`, `rename`, `mkdir`,
  `trash`, `trashList`, `trashRestore`, `trashPurge`, `trashEmpty`, `restoreSystem` and `isSystem` on the same `fs` object (apps get
  them as `ctx.fs.*`) and announces every change with a `vfs-changed` event, which the desktop and every folder window obey.
  **Delete never destroys:** it moves the thing to `::/.Trash/<id>/` (the RecycleBin icon / `apps/trash`). Names that start with
  a dot (`.keep`, `.Trash`) are hidden from `list()` unless asked for. `restoreSystem()` writes back only the entries of
  `assets/seed.json` that are missing (pulling a deleted one out of the bin, leaving moved/renamed/edited ones alone, never
  resetting the desktop): it is in the desktop menu, File, Help and the terminal (`RESTORE`). `SEED_VERSION` in `vfs.js` must be
  bumped whenever `seed.json` gains an entry, or existing installs never see it.
  **Two hundred files are an ordinary thing to ask of it** (the style meter asks for exactly that): `vfs.js` keeps one IndexedDB
  connection for the session and answers `names(dir)` with a key cursor; `vfs_batch.js` is `copyMany/moveMany/trashMany/restoreMany/
  purgeMany/duplicateMany` (one transaction, one `vfs-changed` per folder, one `Style.hit` with the size of the pile) and the shared commands
  in `fileops.js` use them; `changed()` in `vfs_ops.js` coalesces announcements for 24 ms. **The desktop's icons are a keyed
  reconcile**, not a rebuild (`kernel/desktop.js` `buildIcons`): an icon whose name and kind are unchanged keeps its element and its
  selection, positions come from one occupancy map (`kernel/desk_grid.js`, pure), icons are CSS sprite classes rather than an `<img>`
  each (`icons_dom.js`). `check-desk.mjs` and `check-bulk.mjs` hold the numbers; the old code took twenty seconds for each step.
- **Deleting is a reel, not a thump.** `deletePaths` (`fileops.js`) hits the style meter once for the whole pile
  (`hitPile`), moves the whole pile into the bin in **one transaction** (`gatherTrash` reads it once, `commitTrash(items, true)` writes it and
  announces nothing), and *then* plays the show: `kernel/delete_reel.js` (pure; `node scripts/check-delete.mjs`) plans it, **70 ms between beats, one
  file a beat until that would pass 3.4 s, then several**, and each beat is a note of a four-phrase tune in C pentatonic (C D E G A: inside
  C major and D minor, so it never fights the style meter's song) that always lands on the high C, with a chord on the last beat, and a
  `vfs-reel` event that makes the desktop and any folder window take just those icons off the screen (an element removed, nothing listed or laid out
  again). One `vfs-changed` at the end makes every view true. A lone file is a two-note "dun-dun" (`Snd.reelNote/reelEnd/reelOne` in `style_sfx.js`).
  It used to move the files a beat at a time (forty-eight transactions, forty-eight listings of the desk, forty-eight redraws), which is where the lag
  of a mass delete came from. Piles queue, Ctrl+Z waits for the one running, and the pile is one undo. The desktop's own redraw (`buildIcons`) now only
  appends what is new and removes what is gone, instead of laying all two hundred icons down again on every paste.
- **Dragging files** is `kernel/dnd.js` (pointer events, one mechanism for every source). A drop zone is any element with
  `data-drop`: a folder path, `::` (the desktop) or `@trash`. Desktop icons, folder windows and the bin all use it; Ctrl at the
  drop copies, Esc cancels. The shared commands (copy/cut/paste/duplicate/rename/delete/undo/properties/keys) are
  `kernel/fileops.js`, the menus `kernel/filemenus.js`; `Active` in `fileops.js` says which list of files owns Delete/F2/Ctrl+C:
  the desktop or one folder window (set `win._fileEnv`), and none for any other window. The menu bar is `kernel/menubar.js`.
- **Menus stay on the glass.** `kernel/menus.js`'s `placeMenu` puts a pop-up where the pointer is and keeps every item of it inside `#screen`, the picture, not the window: the menu is positioned inside the shell (which is not at the corner of the viewport) and below the glass is the chin of the monitor, so a menu clamped to the page's own height slid under the case. It is moved up and left just far enough to fit, and one taller than the screen scrolls. Every menu (icons, the elephant, the File menu, a folder) goes through it.
- **Right-click.** `kernel/ctxguard.js` suppresses the browser menu everywhere and gives text fields a cut/copy/paste menu; the
  desktop menu opens only on the bare desktop (never from inside a window); `wm.js` keeps the right mouse button away from any
  app that does not declare `rightClick: true` (Dungeon Sweeper does). The `contextmenu` event itself is never blocked, so an app can
  still draw its own menu.
- **Zoom.** Every window has `[Z]` (and Ctrl +/-/0, Ctrl+wheel): `kernel/zoom.js` applies CSS `zoom` to the window body, so the
  app lays itself out again, and remembers the level per app (`templeos.zoom.v1`). A window that is a fixed canvas scaled to fit
  the screen in fullscreen has no layout to redo, so there the zoom multiplies the fit scale instead (`zoom.scaled(true)`, applied by
  `wm.js`'s `fitScaled`) and the picture follows the pointer when it outgrows the screen. The page's own zoom stays locked (`electron/main.js`).
  **A pane that holds a picture centres it with auto margins, never with `justify/align-items: center`** (`kernel/theme.css`: `.gamepane`, `.godpane`,
  `.vidpane`, the Garage's `.drawwrap`): centring that overflows is clipped on its near side for good, so zoomed in the left and the top of the picture could
  never be scrolled to, and zoomed out a short pane left the picture in the top of the window. A new app with a pane that holds a canvas uses one of those classes.
- **HolyC is a set of pure files and a wrapper.** The language is `kernel/holyc_lex.js` (also `0x`/`0b` numbers, exponents, `'A'` and `'ABC'`, every escape, one `pp` token per `#` line), `holyc_pp.js` (`#define` with and without arguments, `#undef`, `#ifdef/#ifndef/#if/#else/#endif`, `#assert`; `#include` is let go),
  `holyc_parse.js` (statements) with `holyc_parse_expr.js` (HolyC's own precedence: `` ` `` `<<` `>>` bind tighter than `* / %`, then `&`, `^`, `|`, then `+ -`; `0 < x < 10`; casts written after, `x(U8)`; `sizeof`, `offset`) and `holyc_parse_decl.js` (declarators, arrays, `{ }` lists, `class`/`union`/inheritance, function pointers, prototypes, default arguments, `...`),
  `holyc_run.js` (makes the machine) with `holyc_eval.js` (expressions, typed lvalues, `tyOf`) and `holyc_exec.js` (statements, calls, `switch` with ranges and `start:`/`end:`, `goto`, `try/catch/throw` with `Fs->except_ch`), `holyc_types.js` (sizes, packed class layout), `holyc_mem.js` (one flat memory: statics, a stack of locals, a heap with `MAlloc`/`Free`; NULL and wild addresses are errors that say so)
  and `holyc_lib.js`/`holyc_lib_mem.js` (the builtins; the memory and string ones are handed their pointers as pointers, every other builtin the text a pointer points to). A string constant is text until it is put in something typed as a pointer or an array, and then it is an address. Integers wrap to their size (`U8 b = 300` is 44).
  A persistent scope (the terminal keeps one per window: variables, functions, classes and memory outlive a line, as in the real shell) is `hcRun(ast, out, env, hooks)` with the same `env`. `apps/holyc/lang_check.js` holds it; the editor's cursor can be VERTICAL or HORIZONTAL (`apps/holyc/caret.js`, a button on the lab bar, remembered). All of it is no `window` and no sound, so Node can run it;
  `kernel/holyc.js` adds the builtins that need the machine (Beep, Rand, GodWord...) and `window.HolyC`, which is how an app reaches the compiler without importing from `kernel/`.
  What the lab needed, and the terminal got for free: a variable lives in the block that declared it (a function's own, a loop's counter), an integer is an integer (`I64 x = 7 / 2` is 3;
  a point or an F64 makes a float, and a typed parameter keeps its type), run-time errors say their line, `continue` and `do while`, `%5d` and `%.2f`, character literals, and
  the sixteen colours by TempleOS's names. **The lab reads strictly** (`opts.strict`, `hooks.strict`: a missing `;` is an error on the line that lacks it, an undeclared name or a division by
  zero is an error); the terminal reads leniently, as it always did. `hooks.trace(line, vars, kind)` is told before every statement (WATCH IT RUN) and `hooks.session(api)` is handed, once
  the program has run, `call(name, args)`: that is how a button on the stage calls back into what you wrote. `hooks.builtins` adds functions (the stage's), `hooks.rand` replaces the dice.
- **Installed programs are app records.** `HOLYC.EXE`'s workshop INSTALL writes `::/<Name>` as `{ type: 'app', app: 'holyc', args: { run: true, name }, content: <the program> }`;
  `vfs.list` hands `args` through and `openItem` (`kernel/fileops.js`) opens an app record with `{ from: <its own path>, ...args }`, which the player reads. `RUN IT` on a `.HC` file that uses
  Button, Label, Field, Bar, Pixel, Fill, Note or Every opens the same player (`kernel/compile.js`) instead of a terminal run.
- **Help** is built in (`kernel/help.js`, pages in `help_text.js`, DolDoc): it is not a file on the VFS, so it cannot be deleted.
- **The Jäger is a journey, and it fits in one bottle.** `kernel/drunk_bac.js` is the arithmetic (pure; `scripts/check-drunk.mjs` holds it to its numbers): a
  measure sits in the stomach and reaches the blood with a time constant of 30 s, the body clears one per 60 s, and what the screen
  shows is the blood plus half of what is still on its way. The bottle app lets one measure down about every 10 s at the very
  quickest (a 3.5 s pour, a 3.5 s drink, a 2.6 s breather in which clicks do nothing; clicks are never queued and never speed anything up), so
  non-stop drinking is a little over two minutes (the hands slow as it goes, below) and thirteen of a bottle's seventeen measures to the floor, through seven named stages; a
  steady twenty seconds a measure is still out inside the bottle; one a
  minute never gets anywhere (it settles at a tenth of a measure: sober), and a glow is held only by drinking when it wears off. **The drink is first-person**: nobody is drawn drinking. The tumbler is an object
  (`apps/bottle/glass3d.js`, a raycast cylinder with real walls, a floor and liquor that stays level with the room): it is lifted
  toward the screen and tipped toward whoever is at the monitor, and what the near edge cannot hold goes over it.
- **Fifteen hands, a bottle of its own shape for every drink, and LORE ACCURATE.** A bottle is a stack of parts (`apps/bottle/shapes.js`: the Jägermeister's, a tall spirit bottle, a round-shouldered one, a squat one, a long-necked beer bottle, a PET water bottle, a flask, a squared rum bottle), and its outline, its inside, its label, the lip it pours over and its cap are all worked out from them, so the cap is as wide as the lip it covers and comes down over it (`caps.js`: screw, crown, cork, a plastic bottle's ribbed cap; a cap lying on the bar is the same cap in little); `labels.js` lays the paper out for the label's own size; every drink in `drinks.js` has a `LOOK` (shape, cap kind, cap colour); a pour is 3.5 s at the least from any bottle (the flow follows how much it holds). **How a measure is poured and drunk depends on how drunk the hand is, in fifteen steps** (`apps/bottle/styles.js`: steady, easy, cheerful, loose wrist, generous, showing off, wandering, second thoughts, overshooting, fumbling, lurching, slumped, spinning, drifting off, the last one): style 0 is exactly what the game was; each after it only adds (a wandering line, a hand going round, a stop half way and a step back, a slip that knocks the cap, a stare before it moves), and no hand is ever quicker than the sober one. `pour.js`/`drink.js` ask the style where the hand is; the line under the bottle names it; `shapes_check.js` and `styles_check.js` hold them. **LORE ACCURATE** (`kernel/lore.js`: five blackouts and every bottle there is to own, not counting what the four on the credits give, unlock a switch in THE BOTTLE; `kernel/faint.js` is the pure 3.4 s animation; `scripts/check-lore.mjs`): with it on, the first swallow of anything with alcohol in it ends the drink: the glass goes out of the hand, the room leans, tips over and sinks, the lids come down with a thud and a white flash, stars go round, ONE SIP. LORE ACCURATE., and then the usual blackout (calmer under `prefers-reduced-motion`). The cordial is safe. Until it is earned the button is dashed and says how far off it is; its trophy is ONE SIP IS ENOUGH.
- **The Jäger passes out.** At the limit (`BAC.LIMIT`) `kernel/blackout.js`
  takes the whole window (not just the tube: the overlay is `position:fixed` over the monitor, bezel and chin included) for ~16 s:
  nine altered scenes (`blackout_a/b.js`, bent by `blackout_fx.js`), unskippable, calmer and without the harshest effects under
  `prefers-reduced-motion`. **Thirty-six of them are photographs** — the seven first ones (a snowy bridge in a city, chickens on a park bench, an ULTRAKILL corridor,
  a bouldering wall, a heap of CDs, a baby turtle, a League of Legends match), twenty-one of the owner's own pictures (`posers`, `halo`, `aurora`, `temple`...
  each named for what it shows, the scene id is the backdrop's id in `cos_data.js`) — and eight more (`monitor`, `tictac`, `phone`, `crest`, `domnule`, `kitten`, `bear`, `labcoat`: a man and his new monitor, a box of mints, a phone call, the temple's crest, a bow tie, a kitten, a very tall bear, a lab coat) — pressed to the sixteen colours and Floyd-Steinberg dithered, 320 px wide,
  in `assets/blackout/*.png` (made by `python3 scripts/make-blackout-art.py name=photo.jpg …`, which shares `scripts/vga_dither.py`; needs Pillow + numpy, the machine never
  runs it). `kernel/blackout_photo.js` loads them and drifts the 320×180 view up and down inside each (whole rows, never resampled; the
  pan ranges live there; 999 is the bottom of the picture). A photograph is often torn by `track` (`blackout_fx.js`, a band slid sideways, pixels only moved). **Each
  picture is dealt, it is marked seen** (`kernel/backdrops.js`, `templeos.backdrops.v1`, `Backdrops.mark` in `blackout.js`). The other two are drawn: a Discord channel and a Debian/GNOME desktop with neofetch
  (`blackout_b.js`, text in the 3×5 font of `blackout_draw.js`; its still parts are cached once with `layer()`, shades the sixteen can't
  make are 2×2 weaves from `dith()`). A scene's photo is optional: one that fails to load is never dealt. The double exposure is a
  checkerboard of pixels, not an alpha blend, so every pixel stays one of the sixteen. To add a scene: draw it (or add a photo to `FILES`
  in `blackout_photo.js`), then list it in `SCENES` in `blackout.js`.
- **Real instruments.** `kernel/instruments.js` is a sampler over `assets/instruments/` (49 instruments + a drum kit — the first 30 free, nineteen more in Dave's packs, samples of the
  MIT-licensed FluidR3_GM soundfont, built by `node scripts/make-instruments.mjs`; held instruments carry seamless loop points).
  `kernel/studio.js` is the mixer and scheduler (per-track volume/pan/room/mute/solo, a master that follows the MUS knob and the
  taskbar mixer's THE GARAGE channel, a limiter): `Studio.play(song)`, `Studio.live()`, `Studio.render(song)` (offline, for WAV
  and for TheStack discs). Apps reach it as `ctx.studio`.

- **The studio's desk and decks.** Every player (`Studio.play`) has a desk of its own (`kernel/studio_mix.js`: per track a drive, a
  three-band EQ, a compressor, pan, a send to the room and one to an echo synced to the tempo, and a meter; the master has a
  limiter and a stereo meter) and plays on a *channel* (`'garage'`, `'bekkedal'`, `'style'`...): the MUS knob and the taskbar mixer's
  slider for that channel set how loud, so a game's music is never at the mercy of the Garage's fader. A game plays its score
  through `Studio.deck(channel)` (`kernel/deck.js`): `play(song, { fade, layers, levels, at })` crossfades from the old song, `layers({ combat:
  true })` switches the tracks tagged with that `layer` on and off while the song plays (that is how Stand Battle's score gets
  bigger when a fight starts, and how Bekkedal's tunes lose their lead after dark), and `levels({ h1: 0.4, h2: 0 }, { glide })` *rides* a
  layer's level instead (the strip glides to it, and a layer taken right out stops being played at all): that is how Magen's band leans in
  with a chain. `segue(song, { now })` is how one tune follows another: the old one is let play out its pass and the new one starts on the very
  next sample, or (`now`, or when too little of the pass is left) on the next bar line; `preload` fetches a song's instruments ahead.
  The player answers `remaining()` (seconds to the end of its pass), `toBar()` (to the next bar line) and `beat()`, so a game can make its
  changes where the music itself changes. The deck plays a *copy*, so a score's own data is never muted by what a game does to it. `Studio.play` also takes `loopFrom/loopTo`, `from`, `countIn`, `fadeIn`, and returns a
  player with `seek`, `setLoop`, `setMetronome`, `fade`, `levels()`. `Studio.render` renders **in stretches of ~20 s** (a long song
  as one offline graph crawls) and takes `from/to`, `only` (a stem), `sampleRate`, `tail`, `limit`; `kernel/wavfile.js` writes
  16/24-bit WAVs, `kernel/midi.js` writes and reads standard MIDI files.
- **The games are scored for real instruments.** `apps/bekkedal/score.js`, `apps/elephant/score.js`, `apps/standbattle/score.js` and
  `apps/magen/score.js` are studio songs (built with `apps/scorekit.js`'s helpers; Magen's is written from scratch in the text notation); the
  Stack's folders play the same songs. **Which tune and when is `apps/director.js`**, shared (`createDirector`): a tune is heard through
  `minLoops` times, the next is arranged in the last `PREP` (14) seconds of the pass and starts on the downbeat after it (`deck.segue`),
  the next tune is the next in the pool (an order, never a dice roll), a change of place takes a bar-aligned crossfade unless the pass is
  nearly over, and `want(id)` holds one tune (Magen's Shabbat). `apps/bekkedal/music.js` is its pools and what the dark does to a tune
  (`node apps/bekkedal/music_check.js`); `apps/magen/music.js` is its rotation plus a smooth `energy` (below). A change of tune used to be a
  timer and a dice roll in a different key; do not bring either back.
- **The style meter.** `kernel/style_model.js` is its rules (pure; `scripts/check-style.mjs` plays five kinds of player against
  them): every rank is further than the last, a single file is worth less the higher you are (a pile of twenty to eighty is not
  marked down, so it is piles that reach the top), the bleed never stops (it runs at 60 % while a chain is alive and in full after
  the rank's own grace, which shrinks), and the top keeps its give so it does not flicker. `kernel/style.js` is the screen
  (`kernel/smeter.css`: `data-t` is the rank, and every rank up the meter is bigger, via `--sm-k`, and moves more;
  `kernel/style_fx.js`: sparks, a frame of light, and confetti at the top; reduced-motion switches all of it off). At the top rank
  **a song plays**: a recording, `assets/style/at_ends.mp3` (2:29, D minor; third-party content the owner supplied: its licence is theirs),
  decoded once and played from memory, so it starts at once (`kernel/style_track.js` plays it, `kernel/style_track_plan.js` is when and
  how, pure, held by `scripts/check-styletrack.mjs`). **It comes in under the delete sound**: for `BLEND` (5 s) the song rises on a
  smoothstep beneath echoes of the top rank's sound (C6 G6 C7 G7, `style_sfx.js`: open fifths, which sit inside D minor) that thin out
  and darken as it arrives. Kept at the top it plays through, and its own fade-out crosses (`SEAM`) into `LOOP_FROM` (the quiet build
  before the first drop) and goes round again. It plays on its own `'style'` channel of the studio, ducks the lobby, hushes
  `kernel/rage.js` (the chiptune layer), and fades out 1.5 s after the meter leaves the top. The first time the meter reaches it,
  `templeos.symphony.v1` is set (the key kept so earned folders are kept) and the Stack gets a STYLE METER folder with the song, which
  `apps/hifi/library.js` plays through the same decoded buffer (the old rendered symphony, which sometimes took two minutes to start in
  the Stack, is gone). **After a minute at the top the sound glitches** (`kernel/glitch.js`: stutter, bitcrush, tape wobble, gates; on the studio's
  channels, the SFX bus and the chiptune layer; rare and short at first, frequent and long over the next minute and a half; a pile
  of twenty or more files deleted while it is going throws a burst on the spot).

- **THE GOLDEN SUN EGGS are what SUN is for once Dave has nothing left to sell** (`kernel/eggs_core.js` pure, `kernel/eggs.js` is `window.Eggs`, `apps/eggs_scope.js` how an app asks, `apps/shop/eggs.js` the shelf; `node scripts/check-eggs.mjs`). When everything *for sale* is owned (a trophy's or the credits' gifts are not asked for) one more tab, THE EGGS, appears: forty eggs, each dearer than the last (4,820 up to 100,000), each half a per cent more of something in every game that has something to give, a fifth at the most. `Economy.earn(n, why, { game })` adds the share to what a game that pays has paid (and the ledger says `(+20 EGGS)`): Dungeon Sweeper, Solitaire, AfterEgypt, the Cook, Stand Battle, Bekkedal, Magen, HOLYC.EXE; and four games have a dial of their own: Magen's mitzvot, the Garden's growth, Dungeon Sweeper's soul and Bekkedal's price at the counter. A game with none plays as it always did. A new game that pays passes `{ game: id }` and is listed in `PAYERS`.
- **Dave's shop is a set of shelves** (`kernel/cos_data.js` is the stock, `kernel/cos.js` the till). A category in `COS_CATS` has a `kind`:
  `look` (frames, logos, pointers, schemes: worn one at a time, previewed by hovering), `stock` (pots, seeds: what the garden grows with),
  `wall` (BACKDROPS: the blackout's pictures; **a backdrop is not on the shelf at all until a blackout has dealt it** (`Cos.shelf` hides it, `Cos.buy` refuses it,
  `backdrop-seen` re-lists it in an open shop); buying one sets the desktop and writes a real picture
  to `::/Backdrops/` (a folder on the desktop), and equipping sets the wallpaper through `kernel/wallpaper.js`) and `unlock` (CRAYON, GARAGE, DRINKS, ELEPHANT: something an
  app was given; `app` names which one, and the card opens it). `Cos.buy` ends in `Cos.tell`: every subscriber and a `cos-changed`
  window event hear it, so an open app (a crayon with a locked brush, a garage picker) updates at once. **A new thing for sale is one
  line in its list.** An app sends you to the right shelf with `ctx.openWindow('shop', { tab: 'crayon' })`. Lists are sorted by price on load.
  What the apps do with their shelves: **the Crayon** lists its eight extra brushes (`apps/crayon/brushes.js`, one function per brush
  laying one segment) and four layers (`layers.js`: clear sheets over the sheet, composited into the canvas the window shows) for everybody,
  dim and marked `$` until bought; **the Garage's** picker (`apps/garage/packs.js`) lists all forty-nine instruments and auditions any, but only a bought
  pack's can go on a track (a song that already uses one still plays); the nineteen new ones are built by `scripts/make-instruments.mjs <ids>`
  from FluidR3_GM like the first thirty; **THE BOTTLE** pours any drink you own (`apps/bottle/drinks.js` builds a whole bottle, label and
  liquor from three colours in `DRINKS`; `Drunk.drink(strength)` counts a measure against the limit in Jägermeisters, 0 for the cordial); **the Elephant** has a wardrobe
  (`apps/elephant/wear.js` draws on the big front-on elephant, `kernel/pet_art.js` on the small side-on one: same twelve things, two pictures).
- **When the shop window closes Dave leaves a box on the desktop** (`kernel/dave_box.js`; `Cos.boot()` starts its watch). It listens to `wins-changed`: a window with
  `appId` 'shop' going from none to one snapshots what you own, going from one to none shows the box, so it never shows for a shop never opened, with the set off, or twice for
  one visit. Its words are `kernel/dave_farewell.js` (pure): seven tiers (`blink` under 4 s with nothing bought, `never`, `nothing`, `little`, `fair`, `lot`, `everything`,
  chosen from what was bought this visit and what you own; lines may name the item or the total) with a voice per tier. It types its line at ~30 ms a letter over a babble
  (`kernel/dave_plan.js` is the pure plan: a blip per sounded letter, silence on spaces and stops, a climb on questions, a bark on shouts; `kernel/dave_voice.js` plays it on
  `Snd.sfx`, silent at SFX 0 or with the set off), stays 2.8 s, and goes; a click skips to the end and then closes it; reduced-motion switches off the bob and the mouth. The
  box is the machine's, not the app's, so `scripts/check-apps.mjs` dismisses it before it measures leaks. `node scripts/check-farewell.mjs` (pure Node) holds the tiers, the
  pools and the plan.
- **A frame's decoration is pixel art on the case, not a share of the monitor** (`kernel/cos_deco.js`; `DECO_SVG` in `cos_data.js` spreads `DECO_NEW`): sized in pixels at 1:1 **A frame's label (HIGH VOLTAGE, 1 CREDIT, SR 072 NORMAL, every `p...` plate) is `pos: 'chin'`, not a corner**: it is a flex item of the chin itself (`kernel/chin_plate.js`, `#chinplate`, in front of the panel of pots), so it can only stand in the free stretch between the knobs and the panel, and it is put away when that is too short for it (a narrow window), never laid over the brand or a knob (the bottom-left corner it used to be pinned to is exactly where they stand). `check-dave.mjs` fails a plate pinned to a corner.
  with crisp edges (leave `size` off a deco entry and it is shown at its own size), anchored to a corner or an edge, thin enough to stay on the ~10-30 px ring of plastic round the
  glass, never over the menu bar, the desktop, the taskbar or a control. `#framedeco` follows the case's rounded corners (`border-radius: var(--case-r)`). Never
  `preserveAspectRatio="none"` or a percentage size: the old LUNAR LANDER foil was 38% of the monitor each way, stretched, with its second piece not turned round, and covered the
  File menu, the icons, the clock and the knobs.
- **The elephant on the desktop** (`kernel/pet.js`, saved as `templeos.pet.v1`) exists once FREE RANGE is bought and he is let out
  of his window (GO OUTSIDE; CALL HIM IN, or his menu, brings him back). He lives in `#desktop` under every window and over every icon,
  walks, sleeps (sooner and longer after 23:00; he wakes if the pointer comes close), talks (some lines read the desk: the icon count, the
  sun, the hour), hops, can be picked up and dropped, and every few minutes walks to one of your icons and pushes it a cell or two
  (`petIcons()` / `petMoveIcon()` in `desktop.js`: the move slides and is remembered like any other; his menu's PUT THE LAST ICON BACK undoes it). One 80 x 60 canvas
  redrawn twelve times a second and a transform. He wears what the wardrobe says (`Pet.setWear`), and the big elephant's window shows only the place
  and a note while he is outside. **His words are `kernel/pet_lines.js`** (pure; `node scripts/check-petlines.mjs`): the same voice as the elephant in his window — lowercase, on
  your side, pal and friend and kiddo, drink some water, i believe in you — turned on the desk (77 idle lines, some that read the icons, the sun, the windows, the hour), and
  **before he lies down he says goodbye** (`goodbye()` in `pet.js`: twelve for the day, seven for the late hours, a yawn, 4.4 s, then he sleeps; LIE DOWN in his menu does the same),
  with a few ways of waking. His bubble grows upward from his head (it used to grow down over it). **Called in with no window open** (GO BACK INSIDE, or CALL HIM IN from nowhere),
  he opens the elephant's window himself, waits for it, and walks in.

- **Readability is checked, not hoped for** (`scripts/check-contrast.mjs`, probes in `scripts/lib/contrast.mjs`). Informative text is 4.5:1 or better against what is really behind it, a control that is
  switched off 3:1; `#555555` is a border and a fill on this machine, **never a text colour on black** (it is 2.8:1: use `#AAAAAA`, and `#333333` on the light grey of a menu or the mixer). **A disabled button is hollow and
  dashed** (`transparent`/black with the dim ink and a dashed edge, never grey-on-grey: `.appbtn:disabled`, `.g-btn:disabled`, `.hc-b:disabled`), a minimised window's button is dashed, an off menu item is
  the menu's own ink at 62 %. **Dave's colour schemes keep all six inks at 4.5:1** (`dim` is lifted in every dark scheme; `scripts/check-contrast.mjs` holds it). A desktop icon sits on a faint plate and its
  name has a hard black edge, so a dark picture and a name are both legible on a photograph. Text drawn on a canvas is measured too (the check wraps `fillText` and reads the pixels under the words
  before they are drawn), so a game's dim label goes in the machine's light grey, not its dark one. A bar of key hints that is longer than its window wraps (`.appbar.hint`) rather than losing its end.
  An app that draws its own pixel font (Bekkedal, Stand Battle) is checked by eye: give a line over a picture an outline (`text(..., { outline })`).
- **Trophies.** `TROPHIES.EXE` (desktop icon `::/Trophies`, help page TROPHIES, terminal `TROPHIES [GAME]`, `TROPHY <NAME>`, `TROPHIES OPEN`) is the machine's ledger: 419 trophies in
  eighteen areas (the machine, every game and tool, HOLYC.EXE, and a meta area of its own), 20 of them secret, about 139,600 SUN if every one is earned once (most of it in the completionist trophies below). **The engine is pure**
  (`kernel/trophies_core.js`, `createTrophies(env)`; Node runs all of it in `scripts/check-trophies.mjs`) and a trophy is a definition with exactly one of five ways to be earned:
  `on + when` (an event and a predicate over its payload), `stat` (a counter or a best: `add`, `max`), `sets` (how many different things were marked), `streak` (in a row, a failure
  resets) or `poll` (a question the game asks at a checkpoint), plus `derive` for the seals. Tier pays 15 / 40 / 100 SUN (`B`/`S`/`G`) and a game's **mastery seal** (every trophy
  of that game) 150, as `TROPHY: <NAME>`. **The Cook's twenty-four and Magen's ninety-eight own achievements are mirrors** (`legacy: true`, pay 0, counted nowhere): they keep paying
  through their own `achSun` and are only shown in the ledger. **Writing a trophy** is one line in `apps/<id>/trophies.js` (`t(id, NAME, tier, kind, 'the exact condition.', rule.on('win', p => p.hits === 0))`
  from `apps/trophy_kit.js`; `secret(...)` takes a rumour as well; Bekkedal's are `{no,en}`), listed in `APPS` in `kernel/trophies_defs.js`; **a description is the exact condition**
  and a "never" is scoped to a run, a room or a session (`scope`). `scripts/check-trophies.mjs` holds ids (prefixed with their game), names (capitals, 34 characters), descriptions (one
  sentence, no two the same), the secrets' rumours, the numbers other files promise (the thirty-eight blackout scenes, Bekkedal's crops and places) and the terminal's output.
  **An app reaches the ledger through `apps/trophy_scope.js`** (`const T = trophies('sweeper')`; `T.emit`, `add`, `max`, `mark`, `streak`, `check`, `hold`/`release`, `drain`, `row`),
  which does nothing, quietly, if `window.Trophies` is gone: a trophy must never get into a game and a game must run without the ledger (`ctx.trophy` is the same scope, or `null`, for an app that
  is handed `ctx`). The kernel's own side is `sys.emit(...)` from `kernel/trophy_hook.js`, and `kernel/trophies_wire.js` hears what needs no line added (purchases, windows, the SUN
  counter, the hour). Each game keeps its calls in `apps/<id>/trophy_calls.js` so `index.js` stays short. **Two ways to see a fact:** an *event* where it happens
  (a win, a catch, a delete), or a *state scan* where the game's save already holds it (Bekkedal and the Garden derive their facts from the save once a second and emit only the
  changes: `state` and `rack`); Stand Battle's are read-only observers on its hook bus (`trophies_bridge.js`). **A card never lands on top of a run:** `hold()`/`release()` wrap a
  run, a fight, a flight, a bench or a blackout, a trophy is recorded the instant it happens and only its card waits (`kernel/trophies_toast.js`: the tier's frame, the cup, the exact
  condition and the SUN, one at a time, a figure of C-pentatonic notes on the SFX bus, a lower one for a secret, the style meter's chord for a seal; toys' cards are *quiet*). **Silent
  backfill** (`kernel/trophies_backfill.js`, each game's `backfill(read)`): a machine that has already done a thing is credited without a card, from the old save's own keys. The
  store is `templeos.trophies.v1` (a damaged one is kept as `.bak`). **The owner's birthday is the 23rd of July** (`sys_birthday`, THE DAY, a secret gold): the machine has to be opened on it.
  **A trophy is only as good as its wire**: `node scripts/check-trophy-wires.mjs` fails when an event is emitted by nothing, a counter added to by nothing, a set marked by nothing. The machine's file trophies hear `move` and `copy` from `kernel/vfs_batch.js` (where every drag, drop, cut and paste ends: `A PLACE FOR EVERYTHING` is a file put into a folder somebody made, `TWO OF EVERYTHING` any copy); `Cos.grant` and a backdrop being dealt tell the shop with `reward: true`, because a gift is not a purchase (FIRST PURCHASE).
  **Eleven pictures are the other thing about ~60 % of a game's trophies pays** (`kernel/trophy_pictures.js` pure data, `trophy_gallery.js` hands them over): when a place has earned three fifths of what it counts (rounded up; mirrors and closed trophies are not counted) its picture (`assets/rewards/NN.png`, 640 px, sixteen colours, `scripts/make-reward-art.py`) is written into `::/Pictures` on the desktop as a real file and RESTORE SYSTEM FILES hands it over again; the ledger's REWARDS tab shows each, locked ones as `? ? ?` with how far off. One picture to a place, six places have none (AfterEgypt, the Crayon, the Garage, the Stack, Notes, the small tools). `node scripts/check-pictures.mjs`.
  Design record and every threshold: `docs/achievements/`. Checks: `npm run check:trophies`, plus `apps/{aftere,standbattle,bottle}/trophy_check.js` and `apps/notes/links_check.js`.

## How the machine behaves (the last pass)
- **Windows stack in a bounded range** (`raise()`/`compactZ()` in `kernel/wm.js`): z-index never grows without limit, so a menu, a toast or the trophy card can never fall behind a window that was
  raised enough times. **Most apps open once** (`MULTI` in `wm.js` lists the ones that may open twice: terminal, editor, viewer, folder, a HOLYC program): opening one that is already open raises it
  (`reopen()`, an `app-reopen` event; `openNew()` is the explicit way to get a second).
- **A game's picture fills its window** (`kernel/canvas_fit.js`): a canvas with `data-fit` (AfterEgypt, Goddoodle, Cook, Stand Battle, Bekkedal) is sized by the window manager to the largest size of its aspect ratio
  the room can hold (`data-fit="int"` keeps whole-pixel multiples in a window), again on resize, fullscreen and zoom. A new canvas game sets `data-fit` rather than a fixed pixel size.
- **Icon names wrap**: a desktop/folder icon has no plate behind it, its name wraps on as many lines as it needs and breaks at CamelCase and after `.`/`-`/`_` (`breakable()` in `kernel/icons_dom.js`).
- **The desktop elephant goes where you are** (`kernel/pet_visit.js`, pure, held by `scripts/check-petlines.mjs`; played by `kernel/pet.js`): most of the time he walks into the window you are using, wanders about
  inside it over the top of the picture (never in the way of a click), says something about *that* app, cheers when a trophy lands, naps in a corner late at night, follows you to the next app and drops out where he stood when it closes.
- **The elephant's clothes have layers** (`apps/elephant/wear.js`, `kernel/pet_art.js`): things at the neck (bow tie, scarf, medal) are drawn after the body and *before the trunk*, so the trunk is never covered;
  hats sit on the head line (`HAT_LIFT`); the cape hangs from `wear.body === 'cape'`.
- **Big trophies pay in things, and a mastered game leaves its props.** `kernel/trophy_rewards.js` (pure) lists what the completions are worth (hundreds to thousands of SUN; a mastery seal 500 and a hundred a trophy; the
  whole ledger the most) and which trophies also give an item for Dave's shelves that is **not for sale** (`kernel/cos_rewards.js`, `reward: '<trophy id>'`, dim on the shelf with what earns it, owned the moment it is earned:
  `Cos.grantFor/syncRewards`). A mastery also makes a desktop folder of every picture the game is made of as real PNGs (`kernel/trophy_props.js`, written once, `templeos.props.v1`; each game lists its props in
  `apps/<id>/props.js` with `apps/prop_kit.js`; the terminal's `PROPS <GAME>` makes it again). **Trophy cards overlay whatever is open** (`kernel/trophies_toast.js` over the windows, never held behind a run: `hold()` only delays
  the *sound* inside a flight/bench/blackout, the card is shown at once).
- **TROPHIES.EXE is a living ledger** (`apps/trophies/hero.js`: a ring that fills with the ledger, the cups, the SUN paid, the next one to go for; `cards.js`: tier plates with a cup, padlock, a bar of cells and the pay;
  `rewards.js`: the REWARDS tab, with the items and folders and how far each is).

## What the last pass added (buffs, the room, the taskbar, GO TO)
- **Restore system files knows what the machine hands over later** (`kernel/handed.js`, asked by `restoreSystem()` in `kernel/vfs_ops.js` next to `assets/seed.json`): a module that gives something away registers a source answering with what this machine is *owed* (only what was earned or bought): the Trophy Box (the first gold trophy; `TROPHYBOX` in the terminal, `::/TrophyBox` in the TOOLS zone of `kernel/desk_grid.js`), a mastered game's prop folder (`kernel/trophy_props.js`), the pictures bought from Dave. What is present, moved or renamed is left alone, what is in the bin is taken out of it, the rest is made again.
- **The elephant eats and slides** (`apps/elephant/`). Eating is a timeline of eight seconds (`eat_seq.js`, pure: `poseAt`, `eventsBetween`; the pile stands where the trunk can reach it), drawn with a real trunk (`trunk.js` the bones, `trunk_draw.js` an SDF tube, pixel-shaded) and heard through `eat_sfx.js`; `eat_check.js` holds reach, order and timing. **After a hundred different quotes he can SLIDE** (`SLIDE_AT`; the SLIDE button): slowly and loudly, like a concrete block over rock. It is stick-slip friction, not a glide: `slide_plan.js` (pure: `run.x(t)`, `run.slips`, `run.speed(t)`) is a run of irregular jerks with stillness between; `slide_sound.js` turns the *same run* into the sound (scrape noise, a grinding body, sub-bass, a thud at the end) and `slide_sfx.js` plays it on the SFX bus, `slide_fx.js` shakes the window and throws dust. `slide_check.js` renders the sound offline and measures it.
- **The strength of a drink is felt** (`kernel/drunk_bac.js`, pure, held by `scripts/check-drunk.mjs`): a measure is `strength` Jägermeisters (the potion is 1 to 99 %, a different one every sip); absorption is per-sip (a strong one reaches the blood sooner and harder: `burnOf`, `hitName`), and in THE BOTTLE a strong measure flinches the glass, snaps and trembles it after each swallow and sears (`apps/bottle/drink.js`, `sfx.js sear`). The journey's pace for plain Jäger is unchanged.
- **Magen's star is the room** (`apps/magen/style.css`, `index.js`): the star and its zone are scaled to the window instead of a fixed small box, with the rates tooltip (`rates.js`) following.
- **BUFFS: HOLYC.EXE gives small, hidden gifts to other games** (`kernel/buffs_core.js` pure book + rules, `kernel/buffs.js` `window.Buffs`, `apps/buffs_scope.js` for apps, `apps/holyc/buff_rules.js` what the workshop notices; `node scripts/check-buffs.mjs`). A buff is earned by a puzzle solved **with nothing shown** (no hint opened, the answer never seen: `unaided(rec)`; HolyC marks the puzzle UNAIDED) or by a **workshop** program written from a blank page that runs clean and is installed. **They are hidden**: HOLYC.EXE never says which gives what; arriving, one vague toast (`LINES`), and the game concerned is what tells you. The eight: `magen_money` (6 % more mitzvot, shown in Magen as a chip reading -6.000.000 %, tooltip explains), `garden_wall` (the Garden's five rooms without a pot or flower, moving, as wallpaper: `apps/garden/wall.js`, `kernel/wallpaper_live.js`, a canvas behind the icons at 20 fps, still with the set off), `bekkedal_bag` (ten more places in the sekk), `stack_lab` (EXPERIMENTAL MODE: every knob in THE STACK turns half as far again each way), `battle_pose` (POSE in Stand Battle puts every fighter's limbs somewhere random, no combat value: `apps/standbattle/pose_random.js`, `pose_btn.js`, `pose_check.js`), `notes_fonts` (three more fonts in Notes), `jager_coaster` (a cork coaster under the glass: `apps/bottle/art.js coaster`), `bin_dumpster` (the bin as a recycle dumpster: `kernel/bin_look.js`, right-click the icon or the window to change back and forth, name and texture; the same `::/.Trash`). Never add a buff without a line in `BUFFS` and a rule that `check-buffs.mjs` can prove.
- **READABILITY** (DISPLAY.EXE, `DISP.read`, default on, `kernel/readable.js`, pure `look(stats)`, `scripts/check-readable.mjs`): over a picture or a moving background a soft veil as dark as *that* picture needs (never more than 58 % or a three-pixel blur), a plate behind the icons' names, a hairline round every icon and window. It follows the picture slowly and is nothing at all over a plain dark desktop.
- **Notes is the only thing a scheme dresses** (see the scheme paragraph above); Dave's SCHEMES cards are a Notes page.
- **The Stack** (`apps/hifi/`). *Albums are edited without touching a disc*: the ALBUMS view groups discs by tag; what is written over an album (title, artist, year, genre, a picture) is kept apart under the album's own key (`album_meta.js`, `templeos.stack.albums.v1`, pure, `album_meta_check.js`), the dialog is `album_edit.js` (EDIT ALBUM on the page or in the right-click menu, PUT IT ALL BACK), the view is `lib_albums.js`, the picture cache `album_cover.js`. *While the Stack is minimised a control stands in the bottom right of the glass* (`kernel/stack_hud.js`, `stack_hud_model.js`, `stack_hud.css`; `scripts/check-stackhud.mjs`): volume, previous, play, next, repeat, shuffle and the place in the disc; **three sizes** S (one line), M, L (with the cover) from the `S M L` buttons or the `⤢` on S, remembered with its place (`templeos.stackhud.v1`), draggable by its title, OPEN brings the window back, ✕ puts it away until the next minimise, and the media keys work while it is there. It talks only to `window.StackRemote` (`apps/hifi/remote.js`), which the Stack puts up while it is open; a press is exactly the face's own `press(id)`.
- **THE BOTTLE's words are pixels and its room is a room.** `apps/pixtext.js` (shared, pure) stamps every letter of a label from a 5x7 or 3x5 bitmap with `R`, and `layout` proves a name fits (one line, or two, or three, split at a space or at a hand-made bar in `BREAKS`); nothing is `fillText` any more. `labels.js` lays a label out from numbers (`plan`): lit paper, an ink frame, the name on a band (small labels: between two rules), the picture on a medallion at a whole number of pixels a unit, the small print; `icons.js` gives every drink but the Jägermeister a picture of its own (13 x 11 grids; only `jager` wears the stag); `mini.js` is a bottle in little (the shelf in the room, Dave's DRINKS cards); `room.js` is the back wall, wainscot, shelf (the other bottles you own), picture, a clock on the machine's time, a lamp whose light falls in stepped bands, a bar top with wet rings and a bowl of peanuts, cached in a canvas and redrawn only when the shelf changes. `node apps/bottle/labels_check.js` runs every drink on its bottle: nothing cut short, nothing outside its paper.
- **Dave's shop cards line up** (`kernel/theme.css` `.shopcard`, `apps/shop/index.js`, `thumbs.js`): every card is the same height inside a row and the button stands on the bottom line; what earns a locked item has the card's whole width and two lines; the Garage packs, Dave's schemes, the system pointer and the drinks are drawn with pixel type (never `fillText` at 8 px); an empty shelf (BACKDROPS before a blackout has dealt one) says why.
- **The taskbar** (`kernel/wm.js` makes the button: a picture and a name; `kernel/taskbar.js`, `taskbar_model.js`, `scripts/check-taskbar.mjs`): every button wears its app's picture, buttons shrink evenly and below 66 px show the picture alone (`.tbtn` is a container, `.tl` its name; the full title is the tooltip); **right click** RESTORE / MINIMISE / BRING TO FRONT, FULLSCREEN, CLOSE; **middle click** closes; the strip at the far right is SHOW THE DESKTOP (puts every window away; again brings back exactly those). A right or middle press is never a left click (`wm.js`). Closing is one function however it is asked for (the X, `ctx.close`, the Tasks window, a middle click): `unmount()` once, then the window goes; `rec.close` is that function, and `rec.restore/minimize/unminimize` are what the taskbar button does.
- **Windows go back where they were** (`kernel/win_place.js`, pure, `scripts/check-winplace.mjs`; `wm.js createWindow`/`keepPlace`): an app that opens once (not a folder, text, picture or terminal) opens where it was last dragged and at the size it was last made (`templeos.winpos.v1`), brought back inside a smaller desk with the title bar in reach. FORGET WHERE WINDOWS WERE LEFT (in GO TO) clears it.
- **GO TO** (`Ctrl+Space`, or Tools; `kernel/launcher.js`, `launcher_model.js`, `launcher.css`; `scripts/check-launcher.mjs`): a box on the glass that reaches every program by name or keyword (`APPS`: the check fails if a registry app is not listed), switches to an open window (a window put away comes back), opens a file found under the desk (a bounded walk in the background), and does what a menu does (`ACTIONS`). Words must all be found; a start beats the inside, a name typed from memory (TRPHS) still finds TROPHIES; what is open comes ahead, then what was used lately (`templeos.launcher.v1`). **A new app needs a line in `APPS`.**
- **REDUCE MOTION** (DISPLAY.EXE, `DISP.calm`; `kernel/calm.js`, loaded first): `matchMedia('(prefers-reduced-motion: reduce)')` answers yes while it is on (so the blackout, the drunk effect, the trophy card and the rest take their calm ways), `calm-changed` tells the listeners, and `:root[data-calm]` cuts every CSS animation and transition to one frame. The system's own setting always applies as well.
- **The terminal completes** (`apps/terminal/complete.js`, `complete_check.js`): Tab completes a command (or the name of a program the prompt opens) and then names on the disk (a folder gets a slash; several matches as far as they agree, and listed); Ctrl+L clears; Ctrl+C gives up the line. The check fails if the terminal answers to a command `COMMANDS` does not know, or the other way round. Holding the pointer on the clock gives the date.

## What the four on the credits give you (the last pass)
- **CREDITS.EXE counts how often it is opened** (`kernel/gifts_core.js` is the book, pure; `kernel/gifts.js` is `window.Gifts` and grants a gift drink to Dave's `Cos`; `apps/gifts_scope.js` is how an app asks without importing the kernel: `gifts().has('goose')`, `onGiven(fn)`; `node scripts/check-gifts.mjs`). The first look: a gloved hand in the giver's sleeve comes out of each portrait in turn, holds a thing out and goes back while the thing goes down into a tray along the bottom (`apps/credits/hands.js` is the pure timeline, `sprites.js` the pictures, `tray.js` the tray); a click or Space gives everything at once, closing the window half way gives the rest, reduced motion has no hands. **Biscu** gives a cookie (Magen's star can be it; the Garden grows COOKIEBLOOM), **Gheghe** a bottle of Apa Plata Borsec (a drink for THE BOTTLE) and a cheese button, **Thea** a goose, **the creator** a blueprint (the Cook has a shed). The fifth look the same four give a drink each (LIQUID CHIPS, BISCU'S BEER, CAPTAIN MORGAN, THE HOMEMADE POTION, whose strength is different every sip, from 1 to 99 %): `kernel/cos_gifts.js` (`gift: '<giver>'`: not on Dave's shelf until given, never for sale), `apps/bottle/labels_gifts.js` (the Borsec label is drawn from memory of the real one); the fifth look is the secret trophy FIVE LOOKS AT FOUR FACES.
- **The credits' portraits can be of any size.** `apps/credits/layout.js` places each from the size of its own PNG (a whole multiple of its pixels, centred in its box); `scripts/make-credit-art.py` crops by a centre and a side with `--zoom/--shift/--size/--out` and defaults to looking further out (the owner's cat, Thea's bear). **The photographs are not in the repository**: the shipped PNGs are still the old tight 64×64 crops until the tool is run with them. `node apps/credits/credits_check.js`.
- **Biscu's cookie** is made, not drawn (`apps/gifts_art.js`, any size, shared by the tray, the star and the flower). `apps/magen/cookie.js`: A STAR / A COOKIE in Magen's bottom bar (there once it is given; `templeos.magen.cookie.v1`), drawn where the star is, at its size, with its glow unchanged. COOKIEBLOOM (`kernel/cos_gifts.js` `SPECIES_G`, the Garden's `art.js`): more than Suncrown and a little under Thirdroot, slow like them, and it joins the seed tray only at seven other kinds, so it is no way past the early game (`garden_check.js`).
- **Gheghe's cheese** (`kernel/cheese.js`, `window.Cheese`: a button in the taskbar tray once the bottle is given; each press puts three wedges, at most six, in the elephant's window and, if the desktop elephant is out, on the free cell nearest the bottom-right corner, never on an icon (put one on it and the pile moves); `apps/cheese_art.js` is the wedge, the pile and the eating, pure; `node scripts/check-cheese.mjs`). Both elephants eat from the piles from time to time: the big one's trunk goes down, takes a wedge, curls to his mouth and he chews (crumbs); the small one (`kernel/pet.js`, mode `eat`) walks to the pile on the desk, faces it, does the same, sometimes twice, and says something. A pile that has been eaten is gone.
- **Thea's geese** (`apps/goose_frames.js`, `goose_art.js`, `goose_life.js`, `goose_voice.js`; `node scripts/check-geese.mjs`): one bird, made once and behaving the same everywhere, that honks (or quacks) quietly every 6 to 22 seconds through the SFX bus. Three afloat on the elephant's oasis and four crossing his sky place (`apps/elephant/geese.js`); two or three on the deep water of Bekkedal's lake, fjord and vidda tarn, started near you, keeping out of your way, in the valley's own ramps (`apps/bekkedal/geese.js`, `geese_check.js`); a goose or a V of them every few minutes over the far sky of the Garden and of Stand Battle (`apps/garden/geese.js`, `apps/standbattle/geese.js`: nothing to do with the sim); and **one shop in twenty a goose drops onto Dave's head** (the picture of him is taller to hold it; he talks about it and answers when poked: `apps/shop/lines_goose.js`).
- **Dave's backdrops are all in one folder.** `::/Backdrops` is a folder on the desktop that every picture bought from Dave goes into (`Cos.shelve`; `Cos.gather` brings the ones an older install put in `::/Home/Backdrops` out to it, once); opened from there (double-click, or right-click: SET AS BACKGROUND / BACKGROUND STYLE) a picture can be the desktop in any of the five fits (fill, fit, stretch, centre, tile). The BACKDROPS shelf has a button, OPEN THE BACKDROPS FOLDER.
- **The Crayon's colour, tools, layers and sheet are panels that stand anywhere on the desktop**: see `crayon`.

### Writing music (for Claude, and anyone else)
Music is data, not oscillator code. A song is `{ v, title, bpm, key, scale, bars, beats, swing, tracks: [{ id, name, inst, vol, pan,
reverb, mute, solo, notes: [[startBeat, durBeats, midi, vel0..1]], hits: [[startBeat, 'kick', vel]] }] }`, kept as `.SONG` files
(`type: 'song'`) and opened by the Garage. Write it in the text notation of `kernel/songtext.js` (read its header comment):
`buildSong({ title, bpm, key, scale, bars, tracks: [{ name, inst: 'piano', notes: 'C4:q E4 G4:h | C4+E4+G4:w' }, { name, drums: { kick: 'x...x...', snare: '....x...' } }] })`,
with `bassLine`, `chordLine`, `progression` and `accompany` for a band that fits the key. `apps/garage/songs.js` is a worked example
of seven songs. Instrument ids: piano epiano harpsichord organ musicbox marimba xylophone vibes glock steeldrum kalimba nylon
steelgtr eguitar harp pizz bass upright violin cello strings flute clarinet trumpet sax ocarina choir bells timpani woodblock,
and `drums` (kick snare stick clap hat openhat lotom midtom hitom crash ride cowbell tamb shaker). To add a demo song, add it
to `demoSongs()`; it shows up in the Garage's OPEN list and as a disc in TheStack's THE GARAGE folder.

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
ctx.openWindow(appId, args) // launch another app
ctx.close() // close this app's own window
ctx.setTitle(text) // retitle this window and its taskbar button
ctx.toast(msg) // the bottom-of-screen message
ctx.ask(title, default, cb) // an in-glass name box
ctx.studio // the instruments and the mixer: see "Real instruments"
ctx.trophy // the trophy ledger's scope for this app, or null: see "Trophies" (apps normally use apps/trophy_scope.js)
```
An app module may also say `rightClick: true` (it uses the right mouse button) and `fluid: true` (it lays itself out off its own size).

## CSS Variables from theme.css
Not all extracted yet, but typically `#FFFFFF`, `#AAAAAA`, `#555555`, `#FFFF55` etc. (Standard 16-color CGA/VGA palette).

The machine's base rule is that all colour comes from `VGA16` (`kernel/god.js`) and nothing is antialiased. Two apps are explicit, user-requested exceptions to the colour half of it — `standbattle` and `bekkedal` — and both are described in the Apps list below. Neither is an exception to the no-antialiasing half.

## How to add a new app
1. Create `apps/<id>/index.js` obeying the contract.
2. (Optional) Create `apps/<id>/style.css` if it needs specific styles.
3. Add `<id>` to `kernel/registry.js`, and a line for it in `APPS` in `kernel/launcher_model.js` (a name and keywords: `node scripts/check-launcher.mjs` fails without it).
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
  from seven energy a swing to ten, and the dark down four steps of
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
  **The economy is measured, not felt:** Act I is 23-38 in-game days to the
  house (42,000 kr, 52,000 on the bought-planks path; a shop meal is about 5 kr a stamina point and a day's stomach holds `BEK_FOOD_DAY_CAP` of it), Act II at least three and a half more seasons to the loft's ending on day 110, and the
  whole run five and a half to ten real hours — a day being the full 06:00-to-02:00
  clock, five real minutes, now the valley has grown to the size where
  walking out to the work and back with a full sekk is most of what a day is.
  No livelihood pays more than 1.5x another per point of energy at any stage
  (the failure the old pick was: 21 against 17, so a rational first
  playthrough bought a hakke on day one and never farmed again), and about
  169,000 kr of purchases are spread across the arc so there is never a
  morning with money and nothing to want. All of it asserted by
  `act2_check.js`'s balance pass — four players, four whole runs, every number
  read from the real tables, never a hand-copied one — and the day length
  measured off the real frame loop by `scripts/bekkedal_playtest.mjs`. See
  **The economy**, `.claude/rules/bekkedal-content.md`.
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
  **The house you build is a house you furnish:** carrying a placeable item
  (a chair, a table, a rug, a bed, a shelf, a lamp, a wall hanging, a
  dresser indoors; a fence, a gate, a path, a planter, a bench, a scarecrow,
  a sign outdoors — every one buyable from Håkon once the house stands, and
  craftable at the chest) and pressing SPACE from the bag opens placement
  mode: a ghost snaps to the tile, R rotates it where that means something,
  SPACE confirms, ESC cancels — the same arrows-select/space-acts/escape-
  closes convention the shop and craft panels already use. Facing a placed
  object and pressing act picks it up and drops straight into placement
  mode holding it, so moving one is pick-up-then-place. Every kind is a
  `decor.js`/`decor_place.js` `PROP` drawn through the same terrain-cache
  pass, `propMap` and light-source machinery authored decor already uses —
  a placed lamp lights the room through `lightSources()` exactly the way an
  authored one does — but it lives in `S.placed` (`index.js`), keyed by map
  and tile, never in `BEK_DECOR`. `gjerde` (fence) and `grind` (gate) are
  the one deliberate exception to "decor never changes walkability": a
  placement of either is refused outright if it would disconnect any door,
  mapped exit or bed from the player's own square, proved by a flood fill
  in `apps/bekkedal/placement.js` rather than a local check around the
  candidate tile — the same function `node apps/bekkedal/layout_check.js`
  exercises directly, with synthetic corridors where the trap is
  constructed rather than merely hoped for, and a sweep of every real map.
  **The houses are made, inside and out.** Inside, `rooms.js` cuts the two houses (the shack you start in, and the house by the water you build, which is the one the game is working toward) into zones, each with a periodic floor (plank, parquet, tile, flagstone, limewashed board) and a paper (striped, tiled, panelled, white), and the furniture is drawn whole (`decor_home.js`, `decor_home2.js`) on solid glyphs in the map: a bed with a headboard and a patchwork quilt, a wardrobe, bookcases, a sofa facing the hearth, a kitchen run with a window over the sink (the shack has a cot, a stove, a table and one chair). Patterns *repeat* on purpose and `node apps/bekkedal/rooms_check.js` holds it. Some of it answers (`furniture_act.js`: books, a clock, a window, a plant, tea, and the small things of a poor house) **in a dialogue box with the thing's name on it** (`objectBox` in `index.js`, `dlg.label`), not a line in the status bar; there is no cat. Outside, `facades.js` gives every building its own wall, roof, chimney, door, shutters and window, so six houses on a street are six houses. See `.claude/rules/bekkedal-art.md`: **A made room**, **Not every house is the same house**.
  **Nights, trees, doors and talk (the last pass):** staying up costs (`sleep.js`: from 24:00 every point of work costs one more, from 01:00 two, the edges of the picture close in, and at 02:00 you fall asleep *where you stand*, wake at 08:00 with two fifths of the bar and a magpie has had a twelfth of your kr; a bed gives the bar back, 80 % after midnight), and sleeping is a short scene (the picture closes through the dither, Zs, the day turns over behind the dark). A tree is a rhythm, not a keypress (`chop.js`: a marker sweeps a bar, strike inside the pale stretch; the energy is still paid once, so the balance is unmoved), and trees take six and nine days to come back. **NPCs do not pop**: they walk to their door at bedtime and step into it (`life.js` `enter`, the clip in `index.js`), come out of it in the morning, and a post on another map (festival, Håkon's pen, Sigrid's winter shop) is a walk through the seams (`trips.js`); a change of post starts from wherever they were standing, they stroll a few tiles off their post between chores (`WANDER_ODDS`), say a word as you go by (`hellos.js`), and the clock stops while you are talking or at a counter. Dialogue is typed a letter at a time with a blip per second letter (`typer.js`; SPACE finishes the line), **what is in `[square brackets]` is an action and is drawn in its own colour**, and after an ordinary chat line you choose what to say (`asks.js`, `ask_<id>.js`: ninety-odd topics, three answers each; the choice is saved in `S.mem` and comes back in later lines, follow-up topics and other people's chat). Fog is drifting banks of mist (`fog.js`), there is no rain or fog or moonlight under rock, no moon rim on anything that is not a wall, roof or cliff, and the bear arrives on day 21. Checks: `chop_check.js sleep_check.js fog_check.js typer_check.js hellos_check.js asks_check.js` (pure Node), and `life_check.js` now also proves nobody appears or vanishes except at a door, a seam or the edge of a map.
  **Palette:** this app is the second explicit, user-requested exception to the machine's base 16-colour rule above — see `apps/bekkedal/CLAUDE.md` and `.claude/rules/bekkedal-art.md` for the full doctrine.
- `magen`: `apps/magen/index.js` - Magen, an idle game of mitzvot around a clicked star. **Its music is six tunes for the studio's real
  instruments** (`apps/magen/score.js`: FREYGISH, NIGUN, HORA in 3, MI SHEBERACH, FREYLEKHS, and Shabbat's ZMIROT; all on D so any can follow any
  on a downbeat, sixteen bars each) **and a band that leans in with the chain**. Every tune is a core (a lead, a nylon guitar, a cello, an
  upright bass, a squeezebox: a whole tune alone) and three layers — `h1` the fiddle, the off-beat and a shaker; `h2` the kit, a second voice
  in thirds and oom-pah; `h3` the choir, running fiddle, timpani and a crash every four bars. `apps/magen/music.js` turns the click chain into
  an `energy` from 0 to 3 (`CHAIN`: 8, 22 and 40 clicks bring each layer fully in) that rises over ~1 s and falls over ~4 s, and rides the
  layers with `deck.levels`; **a click never restarts, ducks or re-cues the tune**, which is what it did when it was oscillators and a
  `recue()` on every step of the heat. The rotation is `apps/director.js` (each tune about a minute and a half); Shabbat takes ZMIROT in on the next
  bar line and `want(null)` goes on from where it left off. It plays on the studio's `'magen'` channel, so MUS and the taskbar slider set
  how loud. `node apps/magen/music_check.js` (pure Node): bars, notes, the lead on its chords, the energy's steps, the seams.
  **Its window is a night, not a black box, and every row stands in front of a picture of its own**, as a Cookie Clicker building does.
  `apps/magen/style.css` is its own stylesheet (linked by the window; the clicker block that was in `kernel/theme.css` is gone): a deep-blue
  room with a star tile, planks for the ticker, tabs and bottom bar, blue-and-gold plaques for the count, rate, goal and tooltip; the stage's
  first eras and ground are blue rather than black. `apps/magen/backdrops.js` is the registry and the CSS, `scene_kit.js` + `scene_props.js` the
  drawing kit (a 160x24 tile that wraps at its edges, whole-pixel rects, ordered dither, VGA16 only) and `scenes_a..e.js` the 77 scenes: one per
  building, one per hand/kavanah/community/rule/legacy upgrade (tier rows reuse their building's), shared ones for the MITZVOT tab. A tile is
  drawn once, on first use (and pre-drawn after the window opens), becomes a CSS rule as a `data:` URL and is tiled at 2x with
  `image-rendering: pixelated`, so strips stay crisp in fullscreen and zoom and cost nothing per frame. A building's owned count is its own
  icon repeated along a canvas strip (`.mgzone`, repainted only when the pane is rebuilt or resized). Affordable rows are the bare picture, rows
  you cannot afford have a black dither over them, rows not yet unlocked (or a MITZVAH not yet earned) a blue dither veil. **A new building or
  upgrade: add its scene to the matching `scenes_*.js` under the same id as in `data.js`** (a missing id falls back to the starfield).
  **The auto-press is earned and bought, and its presses are not clicks.** Holding the left button on the star only repeats once `apps/magen/auto.js` says so: a thousand presses *by hand* (`S.clicks`, which the click achievements and that
  unlock are paid from, and which an auto press never touches; `S.auto` counts those separately) put its first level on sale in UPGRADES, and six levels (`AUTO_LEVELS`: a gap of 0.6 s down to 0.06 s between presses) are bought one at a time.
  Not bought, a held button is one press. **CHESHBON** (a RULE upgrade) adds a "per minute" line under the counter and turns that plaque into a ledger: hovering it shows `rates.js`'s tooltip (second, minute, hour, per press, auto-press, what makes the rate, what multiplies it).
  **The right-hand lists are spacious:** a row is 120 px (2.5 x the old 48), its picture 65 px (a 26 px icon, no smoothing), the backdrop tile five times over (`.sc`, `ROW_SCALE` in `backdrops.js`), the count a big white number on a black plate, the name and price on a solid black plate (price green when it can be paid, red when not).
  The pane scrolls, and is rebuilt only when what is in it changes (`refreshAll`'s `shape`), never because there is more money, so the scroll position and the hovered row survive.
- `aftere`: `apps/aftere/index.js` - AfterEgypt, five ways across the sky to the third temple (`levels.js`: PILGRIM is the game as it was, then
  SCRIBE, PRIEST, PHARAOH and THE THIRD TEMPLE, each opened by clearing the one before). The tiers add a ship that chases the pointer at a limited
  speed, gaps that wander and breathe, locusts, gusts with a second of warning, a sky that closes in, coins and ankhs (a second chance). Pay climbs from 50 SUN
  to 2,500 plus coins a clear, a first clear and a clear with no hit pay more, and dying in the pillars keeps half the coins. `sim.js` is one run as plain data at a fixed
  60 Hz (no canvas, no clock, no audio: what happened in a step is listed in `run.ev`, `coin ankh shield dead gap graze gust gust-on gust-off locust win`, with details in
  `run.info`), `draw.js` the picture, and `aftere_check.js` flies every tier with a bot and holds the pay ladder to a rising rate a minute.
  **It has a score and a set of effects.** All of D, so anything can fall in under anything: a title tune (NILE DAWN) and one tune per way (FIRST LIGHT hijaz 92, PAPYRUS
  nahawand 104, THE ZAR phrygian in 6/8 at 120, KING OF THE DUNES hijaz 124, THE THIRD TEMPLE double harmonic 148 in 3+3+2, thirty-two bars), plus three stingers (clear, unlock,
  death; death ends unresolved on an Eb over a D). Tunes are `tunes.js` (melody and chords as text), `band_early.js` / `band_late.js` (who plays) and `score_parts.js` (the shared
  layers). Each way is a core that is a tune on its own and layers the run switches while it plays through `ctx.studio.deck('aftere')`: `build` (as the temple nears), `edge` (a
  heartbeat when the ship is near the stone), `swarm` (locusts), `gust` (the wind, from its warning), `gate` (the last fifth). `danger.js` (pure) turns a run into those five
  numbers, `music.js` rides the layers with `deck.levels` (fast in, slow out; nothing ever restarts the tune), takes off from bar one, plays a stinger once and brings the title
  back, and stops when the sound goes off or the window closes. The effects (`sfx_synth.js`, `sfx.js`, all synthesised, pitched into hijaz, on the machine's SFX bus and scaled by
  the mixer's AFTEREGYPT slider: a coin ping that climbs with its chain, an ankh bell chord, the ring breaking, stone or locust crash, a pluck on the note of each doorway you pass,
  a close-call tick, the gust's swell and blow that sweeps the way it pushes, a locust buzz that crosses the stereo field, launch, win, first-clear coins, unlock, death, and a quiet
  air loop that follows the steering) are all driven from `run.ev` by `audio.js`, which is all `index.js` talks to. TheStack has an AFTEREGYPT folder (the title and the five ways).
  `node apps/aftere/music_check.js` (score, mode, layers, the sky, the controller against a fake deck) and `node apps/aftere/sfx_check.js` (the effects against a strict fake
  AudioContext, and a whole flight through `audio.js`) are pure Node.
- `garden`: `apps/garden/index.js` - GARDEN.EXE. Five rooms of twelve pots, each room standing in a pot of its own choice. **What grows where matters** **Its picture is sized by the window manager, not fixed at 700 px** (`data-fit="int"`, `kernel/canvas_fit.js`, so the app is `fluid`): 1:1 in the default window, and in fullscreen the largest the room holds with the bar and the line under it at their own size (it used to be a 700 px canvas the fullscreen scaled up with its whole body, bar and all, and in a window enlarged by hand it stayed a postage stamp).
  (`synergy.js`, pure): HOME room, KIN pot, ROOTED (both), a room's SET pot, a BED of its own kind, MATE species beside it; hover a plant to read exactly what is helping
  it. **The work is taken out late**: drag with the can, the hand or the pull tool to sweep a rack. **TEND and the BENCH are late-game and open on what you own** (`UNLOCK` in `model.js`, `gates()`;
  `garden_check.js` times when each opens): TEND with four rooms, the bench with eight kinds of plant, and until then the buttons are dashed and say how far along you are (`TEND 2/4 ROOMS`) and
  the line under the picture says what to do. TEND (SPACE) waters every room and sweeps every plant with a chain
  bonus, and the bench (`B`) sells a DRIP line per room, bigger BASKETS (20 to 150 tokens a room) and a GATHERER that empties a full room at 65-85% of a hand's price
  (half that while away, for at most an hour). `model.js` is the whole economy as plain data; `world.js` loads and migrates a save; `scene.js`, `art.js`, `air.js`, `bench.js` are the picture, the plants, the wind and the panel.
  `garden_check.js` runs hours of it as a player who checks in every few minutes: fully equipped, 99,999 SUN is about a quarter of an hour; from nothing, two and a half hours;
  a night away with everything bought brings in about half of it.
- **The garden's rooms are places, not tints** (`apps/garden/stages.js` picks a stage per room; `stage_yard.js` + `yard_art.js`, `stage_glass.js`, `stage_cellar.js`, `stage_roof.js`, `stage_shrine.js`; the rack the pots stand on is `stage_rack.js`, the tools are `stage_kit.js`). Each stage is `{ under, back, live, front, lights }`: `under` is what is seen through the room's windows (sky, sun and moon crossing it on the garden's own 20-minute day, clouds), `back` is the still room painted once into a cached layer per hour of light (`layer()`), `live` and `front` move behind and in front of the plants, and `lights` is added with the `'lighter'` blend *after* the night is laid (lamps, windows, the moon, fireflies, glow on a plant's own colour). **The YARD follows the real calendar** (`seasonOf`: green in summer, blossom in spring, orange leaves falling in autumn, bare branches and snow in winter; a picket fence, a shed whose window lights at dusk, a birdhouse that swings and has a visitor); the GREENHOUSE is glass and iron with misters, running condensation, hanging baskets and string lights; the CELLAR is brick under three arched niches, one bulb that swings and flickers, a grow-lamp over every plant throwing a pool of *that plant's* colour, a dripping pipe, a spider, a rat and two glowing mushrooms; the ROOFTOP is a city of three layers whose windows come on with the dark, with strings of coloured bulbs, a neon sign that stutters, a plane, and a black cat on the shelf; the SHRINE is red pillars, four swaying paper lanterns, a rope of paper tags, a glass wind-bell, a pagoda and mountains, blossom and embers. The images the owner supplied (`im*age.png`) are the base for all five. `fx.js` is what every room shares: rain by the clock (`rainAt`: a quarter of the time, eased in and out, so it rains for everyone at once), lightning, wind, the puffs of what your hands do (`splash`: water, soil, a pulled plant, a harvest of gold), the shimmer on a plant that is holding SUN, the vignette and the blind that falls when you change room. Everything is whole pixels; a frame costs about 2 ms.
- **The garden has a sound of its own** (`air.js`; the plan is `ambience_plan.js`, pure: which beds are how loud and which one-off sounds happen when, per room, hour, weather and season; the voices are `ambience_synth.js` (oscillators and filtered noise: birds, owl, frogs, bees, thunder, a cellar drip with its echo, a rat, a cat, traffic, a siren, a temple bell, wind chimes, a koto, a flute, a blue spirit) and the beds are `ambience_layers.js` (wind, rain, crickets, a city, the cellar's drone, the shrine's pad, a hum, a hearth)). **What is also a picture is cued from the picture's own clock** (the cellar's drip, the greenhouse's four misters, the plane over the roof, the bulb that stutters, the bird that lands on the birdhouse), so it is heard when it is seen. It rides one gain that follows the mixer's GARDEN slider and the SFX knob and is silent with the set off; `ready.js` is the soft bell when a plant fills with SUN. `node apps/garden/ambience_check.js` (pure Node, a strict fake AudioContext) holds the rates, the gating, the beds, that every source is started and stopped once, the weather and the calendar.
- Garden's line under the picture (`.gtip`) is **one box of one fixed height** (a header line and two of text, clamped): a box that grew with the text moved the whole picture up and down as the pointer crossed the plants. What helps a plant (one pip a helper) and that it is thirsty (a sand-coloured hollow pip) sit on a little plate at the foot of its pot, not in the air over its leaves.
- `shop`: `apps/shop/index.js` - CRAZY DAVE'S, eleven shelves (see **Dave's shop is a set of shelves**). `thumbs.js` draws every card, `lines.js` is what Dave says.
  **Sorting and ownership.** Under the tabs a strip of small buttons arranges the shelf (SORT: SHELF, CHEAPEST, DEAREST, A-Z, I CAN PAY, NOT MINE) and filters it (SHOW: ALL, TO GET, MINE); the rules are pure (`apps/shop/sort.js`, `node apps/shop/sort_check.js`: nothing lost or doubled, ties keep Dave's order, what cannot be bought comes last, a secret's `???` after the names), the strip is `viewbar.js`, and the choice is kept through `ctx.save('view')`. **What is yours is read at a glance, zoomed right out**: an owned card has a tinted ground, a heavy edge, a green pill where the price was and a tick badge drawn on the picture's own canvas (`badge.js`: cyan with a star for what is on the machine now, gold for what you earned), and the grid is `auto-fill` (three across at 640 px, more as the window is zoomed out).
  **A card has no `title` attribute**: the bubble in the window is the only place Dave describes a thing, and a native tooltip repeated it. **One hover in ten
  (`CRAZY_RATE`) Dave says one of ~100 crazy lines instead of the card's own blurb** (`makeHoverTalk(rng)`: `DAVE_CRAZY` for anywhere, `DAVE_CRAZY_CAT` per shelf,
  `DAVE_CRAZY_ITEM` functions that say the card's name and price; never the same line twice running; each at most `SPEECH_MAX` characters so the bubble stays three
  lines); `node apps/shop/lines_check.js` (pure Node) holds the pool, the rate and the repeats.
- `solitaire`: `apps/solitaire/index.js` - LEAGUE SOLITAIRE on one canvas. **It has a score** (`score.js`, `music.js`: LAMPLIGHT and FELT for the studio's real instruments on the `'solitaire'` channel of the mixer; the layers come in as cards go home, the other tune takes over on a new deal; `node apps/solitaire/music_check.js`) and **its trophies give it things** (`cosmetics.js`: four backs, five tables and five endings for a win, one for each of the fourteen trophies; see **Rewards**).
- `crayon`: DRAW.EXE; its extra brushes and layers are Dave's. **Colour, tools, layers and sheet are four small palette windows** (`apps/crayon/panels.js` is the manager, `panels_layout.js` where they stand, `panel_colour/tools/layers/sheet.js` one each; `session.js` is the state they share, `stroke.js` the brushes, `index.js` the sheet and its saving) that open beside the sheet, can be dragged over it or away from it, are put away and brought back from the bar in the sheet's window (which shows the colour, tool and size in hand even with every panel put away), and are remembered (`templeos.crayon.panels.v1`: where each stands and which are open); RESET PANELS lays them out again. **A palette window** is `createWindow({ owner, at, onClose })` (`kernel/palette.js`, `kernel/wm.js`): no taskbar button and no minimise/fullscreen/zoom/scheme controls, always in front of its owner, put away and closed with it, and never an app of its own (the pet and the app-id tagging skip it). `node apps/crayon/panels_check.js` (pure Node).
  `elephant`: the big elephant, his five places and songs, the wardrobe and the door to the desktop, his cheese and his geese (see **What the four on the credits give you**).
- `folder`: a folder window: BACK / UP / path, select (click, Ctrl, Shift, rubber band), drag and drop to move or Ctrl-copy,
  right-click menus, F2/Del/Ctrl+C/X/V/D/A/Z, Enter opens, Backspace goes up. `trash`: the RecycleBin (put back, delete for good,
  drag things out). `viewer`: pictures and video; BACKGROUND (five fits), SAVE A COPY, DELETE, arrow keys walk the folder.
- `garage`: `apps/garage/index.js` - THE GARAGE, a studio for a producer and an audiophile that a beginner can still use.
  **The roll** (`grid.js`, `grid_draw.js`; one canvas holds the ruler, the notes and the velocity lane): three tools (DRAW: click to
  put a note down, drag it longer; clicking a note *selects* it so nothing is deleted by accident; on the drum kit DRAW is a step
  sequencer. SELECT drags a box. ERASE sweeps; the right button erases in any tool), move and resize by dragging, Ctrl-drag copies,
  Shift adds to the selection, a velocity lane, a minimap, variable snap (bar to 1/32, triplets, off), zoom both ways, MAGIC NOTES
  (only the key's rows). **Segments**: dragging the ruler picks a stretch of *time* across every track (or just this one), which
  can be looped, copied, cut, pasted at the yellow cursor (over the song, or pushing the rest later), duplicated, repeated, cleared,
  removed with the gap closed, or given a gap; the song grows by itself a bar at a time. All of it is `edit.js` (pure; `node
  apps/garage/edit_check.js`), narrated in the status line by `actions.js`, and undoable (80 steps, redo). **Transport**: play from
  the cursor, loop (the stretch or the song), count-in, click, tempo (typed or tapped), beats per bar, swing, REC on the keys
  (`keys.js`, quantized to the snap). **The desk** (`mixer.js`, `meters.js`; TAB or the dock tab): per track fader, pan, three-band
  EQ, compressor, drive, room and echo, meters; the master has a limiter you can set, a mono check, peak/RMS/gain-reduction and a
  spectrum. **Files**: SAVE (quietly over the same file), SAVE AS, OPEN (yours, the demos, or IMPORT a .mid), a guard before anything
  that would lose changes, a draft kept by itself; EXPORT (`export.js`) is a WAV (16 or 24 bit, 44.1/48 kHz, peak-normalised or as
  mixed, the whole song or the picked stretch, with a report of the peak and loudness), a WAV per track (stems) or a MIDI file.
  `help.js` (F1) lists every key. **LEARN** (`lessons*.js`) is now THE BASICS: the same eight short interactive lessons (the kit,
  pitch, the pulse, five safe notes, major and minor, chords, loops, your first track) in a dark control-room theme and plain
  adult sentences, with a tick for each one you have got.
  **There are two teachers.** **LEARN** is THE BASICS (eight lessons); in its eighth lesson (*your first track*) a yellow line follows the music across the grid and lights the column it is on, and in every lesson the instrument
  and band choices carry a yellow border and a tick while they are the picked one (`X.radio()`, `.l-pad.sel`). **STUDIO COURSE** (`course*.js`) is a coach that sits on top of the *real* Garage and teaches it by watching what you do: it wraps the Garage's own functions while it is open (and puts
  them back), lights the control to press, and ticks its goals off as the song and the screen change. Nothing is locked (SKIP, BACK and CONTENTS are always there) and the place is kept. **Part one** takes every button and panel apart on a
  practice song (`course_tour_a/b/c.js`, eight chapters; `course_practice.js`: SUNDAY MORNING, flawed on purpose: the tune is an octave too low, and the strings and the bass sit in each other's way) and teaches how to *alter an existing song*
  (transpose, quantise, the EQ, the room, the segments, the export). **Part two is to write a whole song in a style you choose** (`course_write.js`, `course_genres*.js`: POP, ROCK, LO-FI, DANCE, WALTZ, LULLABY, EPIC): each genre has its own
  tempo, scale, drums, bass, chords, tune and mixing advice at every stage, with `{CHORDS}`/`{TONES}` filled from *your* song, and `course_rules.js` checks what you wrote against the genre (`course_util.js` reads the song and nothing else).
  `node apps/garage/course_check.js` proves it can be finished: every genre has a model song that passes every goal, and every tour step can be met.
- `sweeper`: `apps/sweeper/index.js` - **Dungeon Sweeper** (it was Sweeper: the icon is `::/DungeonSweeper`, the registry id and `appId` are still `sweeper`, and `RENAMED` in
  `kernel/vfs.js` carries an old install's icon across), a Hollow-Knight-flavoured minesweeper on one scalable canvas (`gfx.js`
  draws a 960x640 sheet onto whatever size the window is, so fullscreen is bigger, not blurrier). Two ways in: the plain
  game in three sizes, and a **campaign** — an ink-on-vellum *map* of six regions / 18 rooms (`map.js`, data in `data.js`)
  with benches, guardians, and a mechanical layer taken from the source: *masks* (a larva costs a mask, not the game),
  *soul* (earned by opening ground, spent on FOCUS to mend, SCRY to settle one tile, DIVE to settle an area), *geo*,
  *charms in notches* (`bench.js`: twelve charms, three starting notches, so a build is a choice), *regions that change
  the rules* (bramble, spores, web, dark) and a *shade* that keeps half your geo where you fell. The rules of a board are
  pure in `board.js` (`node apps/sweeper/board_check.js`); `run.js` is play, `run_draw.js` is the room.
  **F, Q and E are learnt, not given.** None is yours at the start: FOCUS comes with clearing the Crossway, SCRY with Green Depths *or* Fungal Fog,
  DIVE with the City of Rain (`SPELL_AT`, `spellOpen` in `data.js`; the pay panel announces it, the map's ABILITIES plate shows what is next, and
  a locked key says what to clear). The three keys along the bottom are buttons too. **A room cannot be got stuck in** (`node apps/sweeper/run_check.js` plays
  every room with a bot that does random things first: wrong flags, spells without the soul, webs, brambles): a webbed safe tile walled in by mines was
  the one board that could never be won (`unweb` in `board.js` cuts the web off any that no walk could reach); a spell that cannot be cast is never left aimed
  (it used to swallow every click, "not enough soul", until a right-click happened); a flag on safe ground, when it is all that is left, is said and marked in red;
  a lost plain game is restarted by a click as well as R.
  **The Wayward Compass is found, never sold, and takes all three notches.** It is given by `PERFECT` in all eighteen rooms (`pay.js` `isPerfect`: no larva hatched at all —
  a shell or lifeblood mask that took the blow still counts as hatched — and under 0.75 s a tile, 215 s on the Hollow One; a plain solver with no guesses wins 17 % of the
  Moss Warden and none of the Hollow One, so SCRY and DIVE are allowed and are the point). Rooms can be tried again as often as you like; `camp.perfect` keeps the best
  perfect time of each; the bench shows `PERFECT n/18`. An older save loses the compass it was handed (`migrate` in `index.js`).
  **It pays SUN, and says so on the panel** (`pay.js`, pure; `scripts/check-sun.mjs` holds the budget): a plain win is 80 / 400 / 1,200 SUN plus a time bonus, and pays less for
  every win of the same size in the last half hour (-10 % each, to 15 %: a few thousand an hour at the very fastest, nothing noticed at a normal pace); a room of the descent pays four
  SUN for each geo it is worth, 100 SUN for a first clear (400 for a guardian), a quarter more for no larva hatched, and 40 % of the room on a repeat.
- `cook`: the story is `apps/cook/story.js` (`CK_STORY`, thirteen chapters and an ending, in the order of the show: the diagnosis, Jesse and the first batch are read before the first bench, and a card is read in front
  of the bench it is about; `STORY_AT` says which) — the plot of Breaking Bad told plainly, names and all, four or five lines under 60 characters so none wraps. Jesse (`apps/cook/jesse.js`) is drawn as a person — skin tone, buzzed hair, stubble, the yellow suit and the
  respirator round his neck. **That portrait is a third user-requested exception to the 16-colour rule** (a face needs a
  skin tone); nothing else in the app leaves VGA16. **What he says is `data.js` (`CK_KID`) plus `lines.js`** (an intro for each bench the first time you sit at it, a line about *that* bench after a win, and what he
  thinks of your habits: reset, undo, a lot of ruins; he calls you Mr. White now and then); **a win's box is never dismissed by the clock: it waits for a click**, the BATCH COMPLETE panel does not start until he has
  finished, and only a small intro box goes by itself. **He talks in blips** (`voice.js`: one for each letter, a vowel is a pitch, a stop a click, S and F a hiss, M and N a hum, a rise on a question, a bark on a shout, silent
  at SFX 0). **The music is a score for the studio's real instruments** (`score.js`: DESERT, COOK, HEAT and FALL, all on D, sixteen bars each, a core and two layers: `h1` when the bench goes wrong, `h2` when the sweep is close, and a WIN and a RUIN
  stinger; `music.js` crossfades on a bar line when the place changes and rides the layers with `deck.levels`; it plays on the `'cook'` channel, so the mixer's THE COOK slider sets it). `node apps/cook/cook_check.js` holds the
  lengths, the order, the pools, the blips, the bars and the layers.
  **THE SHED** is the tab the owner's blueprint opens (the first gift on the credits: a SHED button in the Cook's bar, there once `gifts().has('blueprint')`). A shed (`shed_hub.js`: planks, the blueprint on the wall, a calendar that stopped, the car's keys, a radio with one station, a plant called Gary, a bench that shows one thing handed in for every board cleared) with Jesse in it **as he looks at the end of El Camino** (`jesse_ec.js`: clean-shaven, a short crop, a white knit sweater under a black jacket, tired round the eyes; a face, so one more of the portrait exceptions to the sixteen colours, like the yellow suit's) **and talking the way he did on the show** (`shed_lines.js`, `shed_lines_play.js`, read through `shed_say.js`: about two hundred lines, no contractions, none over 150 characters, close to half of them with *bitch* in, and nothing stronger). Click him and he talks, click the things on the wall and he has something to say about each, click the blueprint and it unrolls into the list of boards (**THE BACKYARD PROJECT**: ten, opened one after another; `templeos.cook.shed.v1` keeps how far you got and your best on each).
  **The puzzle is inspired by the Steam game *How to Make an Atomic Bomb in Your Garden*** (a satirical backyard simulator in which you raise money, hunt for parts from questionable sellers and avoid the neighbours and the tax authorities), made small, 2D and pixelated, and kept entirely comic and abstract: the parts are a spoon, a tin can, a battery, a funnel and a kettle, the thing in the shed is only ever called the Thing, and there is no procedure of any kind in it. One tile at a time, the shed at the bottom of each garden wants its parts carried to it: hedges and a pond; neighbours who look along a row or a column as far as they can see and turn by a pattern (a letter a turn, N E S W or - for not looking: it is in their eyes, and an arrow says where they look next); a tax man on his round; gnomes, which you push and which stop a look; a van that sells a part for coins to empty hands; coins on the grass; a lemonade stand that pays one if you wait on it. **The one rule: you may not end a turn on a red tile** (what a neighbour is looking along now, and the tiles next to the tax man); the corners of a tile say it will be red after this turn; a move that cannot be made costs no turn; a catch is taken back after a moment (or at the next key or click); undo and reset are free.
  `shed_model.js` is the whole game as pure data, solved by breadth-first search (`par` in `shed_levels.js` is the fewest turns there is, and the check fails if it is not); `shed_draw.js`, `shed_hub.js` and `shed_ui.js` draw it in the sixteen colours at two screen pixels to a pixel of `shed_art.js`; `shed.js` is the controller (where you are, what you pressed, what he says about it, what is kept). The boards were found by a search (par, how many ways there are, and that every hazard matters to the best way) and tidied by hand. `node apps/cook/shed_check.js` (pure Node) plays all of it: the rules on tiny boards, every board solved, its own best way played through the real controller to the last one, Jesse's words and his face.
- `bottle` (pour and drink move with the drunkenness: `physics.js`'s `sway/drift/lurch` make the hand wander, rock the bottle and glass, and lurch through its timing without changing a pour's or a drink's length, so the journey's pace in `check-drunk.mjs` still holds): a Jägermeister bottle (baked once and turned by pixel sampling, `raster.js`, with the liquid poured into the *turned*
  interior) and a tumbler that is an object, not a sprite (`glass3d.js`: a thick-walled cylinder with a floor, found pixel by pixel by
  following a ray out of an eye, with the liquor held level by a plane and the volume solved for it). The pour (`pour.js`) is a
  feedback loop on the head of liquid above the lip (a weir). **Nobody is drawn drinking** (`drink.js`): the glass is lifted toward the
  screen and tipped toward the viewer, so the person at the monitor is the one it is tipped to, and what the near edge cannot hold goes
  over it. Clicks are never queued and never speed anything up: a pour, a drink and a breather each ignore them. Drinking drives
  `kernel/drunk.js` (the journey: see **The Jäger is a journey**).
- `hifi` (TheStack) **keeps playing**: what happens at the end of a disc is `apps/hifi/keep.js` (pure; `node apps/hifi/keep_check.js`) and runs in `transport()` from the frame loop *and* from a 500 ms timer of its own, so a window that is hidden or covered does not stop the music. The next disc is decided once (`peekNext`: a queue or a shuffle is asked a single time) and read from `PRELOAD` (90 s) before the end; it is crossed into when it is ready, loaded when the last one runs out if it is not, and a disc that will not read is skipped. Decoded discs are let go oldest first (`evictions`, 300 MB) so an evening of songs does not fill the page; a sleeping audio context is woken. (It used to set a crossfade flag that nothing cleared, so the disc after the first automatic change never advanced, and to keep every disc ever played in memory.)
- `hifi` (TheStack): a disc library with **folders** — one for the lobby's four variants and one per app that scores itself
  with music (`apps/hifi/library.js` lifts each app's own score into a disc spec; a disc is pressed the first time it is played).
  Nothing is pressed when the window opens, and no loose discs ride on the shelf outside the folders. Its face is drawn at the
  pixels it is shown at (`fit()`: the 480x386 room is scaled to the canvas, rectangles snap to whole screen pixels) in VT323 with the
  dimmest inks lifted for text, not blown up one and two thirds times. The STYLE METER folder appears once the meter has read
  HAPPY BIRTHDAY, with the song. **1-9 are EQ presets**, read as the physical digit (`Digit1`/`Numpad1`, so a layout where the digits
  need Shift still works) and heard from the document whenever TheStack is the front window and nothing is being typed into (a click on the title bar
  or the taskbar moves focus off the canvas, and the digits used to go to the desktop). A preset puts a bypassed EQ in circuit, and it is the curve the next
  discs inherit unless a disc has an EQ of its own saved with it, so a track change does not put the flat curve back.
- `solitaire`: `apps/solitaire/index.js` (cards in `cards.js`, props in `props.js`). **It has a soundtrack** (`score.js`: three sixteen-bar tunes for the studio's real instruments, a slow swung card-table shuffle with an unresolved minor
  seventh, a wurlitzer on the off-beats, a walking bass and a clarinet over it; the mood of a poker-and-jokers game's main theme, written from scratch). `music.js` is the director's rotation plus an `energy` (0 to 2) that the cards
  that are home pull up and a new deal lets down, riding two layers with `deck.levels`; a win brings the whole table in. It plays on the studio's `'solitaire'` channel (the mixer lists it while the window is open).
- `sweeper`'s bench is its shop, and **a charm is described for the bench it is read at** (`apps/sweeper/charm_text.js`, pure, `charm_text_check.js`): the blurbs in `data.js` are the plain rule, but in the Underdeep a room gives a share of the soul (`soulK`), charges more for the spells (`spellK`) and takes two or three masks for a larva (`hit`), and only some rooms are cold or dark, so QUICK FOCUS, DEEP FOCUS, GRUBSONG and SOUL CATCHER quote the real numbers and IRON WARD, EMBER HEART and MOTH LENS say where they do nothing. A new charm that has a number in its blurb is a case in `charmText`.
- `sweeper` also has **ACT TWO, THE UNDERDEEP** (`data.js`, `act: 2`, nine rooms and three guardians under the Hollow One, kept out of the compass's eighteen): every larva costs two masks, the boards are dense, the rules are stacked and
  the cold drains soul; bare, almost nobody gets through, and the charms (iron ward, lifeblood heart, stalwart shell, ember heart, the Underdeep's own three) only fit together in the notches if you choose them well.
  `node apps/sweeper/hard_check.js` plays bare and built and holds that; `check-sun.mjs` carries its pay as its own rows.
- `sweeper` **has a score** (`score.js`, built from `tunes_a.js` and `tunes_b.js`: five dungeon-synth songs for the studio's real instruments, one per place: THE HOLLOW GATE on the title, THE CROSSWAY on the map and the benches, MOSS AND SPORE in the first act's rooms, THE HOLLOW ONE in a guardian's room, THE UNDERDEEP in act two). `music.js` picks the tune by place through `apps/director.js` on the studio's `'sweeper'` channel (the mixer's DUNGEON SWEEPER slider); TheStack has a DUNGEON SWEEPER folder with the five. `node apps/sweeper/music_check.js` (pure Node) holds the bars, the notes, the tunes and the places.
- `bibel`: `apps/bibel/index.js` - **THE BIBEL**, a book reader. Cover, a table of contents that ticks the chapters read, and pages (`pager.js`: the text is one flow in CSS columns as tall as the window, a spread is one
  or two columns, a page turn is a shift by whole columns; resize and A-/A+ re-lay it out and come back to the same chapter). Arrows/PgUp/PgDn/Space turn, Home/End, C contents, +/- size; the place, the size and what is read are
  kept through `ctx.save('bibel.v1')`; `fluid`. **The text is `apps/bibel/text_a..d.js`, ordered by `text.js`** (preface, Part One: eight chapters of the beginnings; Part Two: eleven chapters, the most absurd story of each
  religion told once and in full; Part Three: the one chapter every account agrees on; colophon), about five times the length of the old desktop file. **Its voice is the rule for any line added:** scripture written by
  people who believe every word, grave, exact and in order, with deadpan specifics; the absurdity is in the *content* and the Bibel never winks at itself. `::/TheBibel` is the app, `::/TheBibel.TXT` the same text flat
  (`plainText()`; an untouched old one is replaced on first open). **The pages are white with black text** (a double rule between the columns, the VGA reds and blues for the headings, the notes and the current chapter), so a long chapter can be read in daylight.
- `trophies`: `apps/trophies/index.js` - **TROPHIES.EXE**, the ledger (see **Trophies**). Eighteen areas down the left (the machine first, then each game, then the ledger's own meta area), the cards of the chosen area
  nearest to completion first, each with its tier frame, its exact condition, a live progress bar and what it pays; a secret is `???` and a rumour until it is found; filters (all, open, done), kinds
  (progression, skill, explore, creative, joke), a search, EN or EN+NO for Bekkedal's bilingual ones, and a pin whose progress is echoed in the title bar. A seal lights when every trophy of a game is
  earned. `model.js` (pure), `cards.js`, `style.css`; arrows move, Enter pins, Tab flips between games and cards, Esc closes. `fluid`.
- `trophybox`: `apps/trophybox/index.js` - **TROPHYBOX.EXE** (see **The trophy box**): the gold trophies and seals as cups on a shelf, pulled out onto the desktop with the pointer. `fluid`.
- `credits`: `apps/credits/index.js` - **CREDITS.EXE**, opened by `CREDITS` in the terminal. A fixed 640×560 canvas (`data-fit`, the picture drawn once, the hands over it): the creator in the middle in a
  sunburst halo (`draw.js`, rings and rays in VGA16, the portrait a disc so the halo is round his head), the three playtesters in a row beneath, each with a cross
  behind (its arm wider than the portrait, so the cross shows round it); where each stands comes from the size of its picture (`layout.js`). Portraits are `assets/credits/*.png`, made by `python3 scripts/make-credit-art.py name=photo …`
  (dithered, any size, the creator's transparent outside a circle). **Opening it is counted, and the four give you things: see *What the four on the credits give you*.** The names are the owner's (`TEITEOTEI`, `BISCU`, `GHEGHE`, `THEA`; the third playtester's
  photo is `MagicCheese.png`, read as GHEGHE from the thanks).
- `holyc`: `apps/holyc/index.js` - **HOLYC.EXE**, learn HolyC by typing it and then make small apps with it. Three tabs: **LESSONS** (seven, thirty-four steps: `lessons_a/b.js`), **PUZZLES**
  (nine chapters, fifty-six, three hints each: `puzzles_a..d.js`) and the **WORKSHOP** (templates, SAVE to `::/Home/HolyC/NAME.HC`, INSTALL on the desktop). The lab (`lab.js`) is the same in all of them: an
  editor (`editor.js` + `highlight.js`: a textarea over a coloured copy, line numbers, auto-indent, error lines, text typed in a letter at a time for TYPE IT FOR ME / SHOW ME), RUN (CTRL+ENTER),
  WATCH IT RUN (`trace_view.js`: step through the statements with the variables beside it), what was printed, and **the stage** (`stage.js` pure model, `stage_view.js`).
  **A program can be clicked**: `Label`, `Button(text, "Function")` (the function named in quotes is what a press calls), `Field`, `Bar`, `SetText/GetText/GetNum/SetBar/Color`, a 16x16 board
  (`Pixel`, `Fill`), `Note(60, 300)` (the studio's piano on its own `'holyc'` channel, so MUS and the mixer's HOLYC.EXE slider set how loud) and `Every(1000, "Tick")`.
  **A lesson step has goals** (`tests.js`), ticked off after every RUN or click on the stage, each tick a step higher in pitch; **a puzzle is judged by tests** run against fresh runs of the program
  (`T.out`, `T.cases` for a function's answers, `T.board` for the picture, `T.scenario` for a person at the stage: click these buttons by their words, type in these boxes by their hints,
  let this much time pass). **`node apps/holyc/holyc_check.js`** holds all of it: every model answer passes every test and every starting program fails at least one, every lesson step is met by its
  model answer (after the clicks a person would make) and is not already met by the code it opens on, every template runs. A new puzzle is `P(chapter, id, title, stars, brief, start, hints, model, tests)` in
  the matching `puzzles_*.js`. It pays SUN once (`pay.js`: a lesson 70, a puzzle 90 to 460 by stars, a quarter if the answer was shown, 250 for a whole chapter); the budget is in `check-sun.mjs`.
- `standbattle`: `apps/standbattle/index.js` - **Stand Battle Arena**, an arcade fighter: four buttons (LP RP LK RK), block by holding back, high / mid / low attacks that crouching and blocking answer, a throw (LP+RP; breakable), a **sidestep** (a lone tap of up or down) into a second depth lane that linear moves miss and tracking ones catch, juggles, bounces, wall splats, knockdowns with wake-up options, motion inputs (quarter-circle, charge, dash), best of three rounds on a 60 s timer, on a 480x270 canvas with integer-only upscale. It was a belt-scroll roguelike; **`docs/stand-battle-tekken-spec.md` is the design record (every number, every decision and why) and is the thing to read before changing a rule.** The old GDD/spec/tech documents in `docs/stand-battle-arena-*.md` describe the retired build.
  **One integer a frame.** The sim (`fight.js`, `fight_step.js`, `fight_cmd.js`, `fight_hit.js`, `fight_air.js`, `fight_throw.js`, `fight_proj.js`, `fight_combo.js`) is pure and steps at a fixed 60 Hz (`sim_loop.js`) on one integer per player per frame (the bits are in `rules.js`, the buffer and motion reader in `input_frames.js`, the inputs a move needs in `input_plan.js`). A keyboard, a pad, the CPU, the training dummy, a recording and the budget bot are all the same thing to it. Every window of the input (buffer 9, simultaneous 3, tap 6, motion 15, charge 36, break 14) is a number in `rules.js` and the spec says why. `rng.js` is seeded, so a seed plays the same game frame for frame (`headless_harness.js` proves it).
  **The frame data is the game.** A move is one row (`moves.js` has the column list; the movelists are `char_*.js`, built by `roster.js`): height, startup, active, recovery, advantage on hit and on block, damage, reach, an animation style and a few extras (tracking, launch, juggle, splat, projectile, counter, status). The defender's stun is *derived* from the advantage, so `framedata_check.js` can run every move of every fighter in the sim, once on hit, once on block and once late, and fail on any difference from the table; the animation (`pose_fighter.js` places the wind-up, strike and recovery of `anim_styles.js` on the move's own frames, `anim_check.js` holds it), the training screen and the move list (`cmd_text.js`) read the same rows. Nothing else is hand-tuned. A new move is one row; `fairness_check.js` holds the authoring guide (nothing under i10, lows i14 or later, throws i12 or later, only a jab is plus on block, launchers punishable, projectiles reactable).
  **The roster** is Jotaro / Star Platinum (brawler), Kira / Killer Queen (trickster: TOUCH marks a bomb, DETONATE blows it), the Morioh Delinquent (rushdown), Angelo (zoner: thrown rocks, a grab that starts drowning) and Polnareff / Silver Chariot (fencer; a new sprite), with Killer Queen as a boss-only fighter that is Kira's whole list plus SHEER HEART ATTACK (a slow homing bomb) and BITES THE DUST (a counter): more moves, never more health or damage. Everyone has 120 HP and walks within 10 % of the others. The five were tuned until a round robin of the same bot on both sides puts every fighter between 41 and 59 % (spec section 20); **change a number in a row and re-run `framedata_check.js`, `fairness_check.js` and the round robin.**
  **The CPU is a player** (`ai.js`, `ai_think.js`, `ai_neutral.js`, `ai_plan.js`, `ai_profiles.js`): every frame it hands the sim the integer a keyboard would, from the same rows, seeing only what a person sees and only as it was `reaction` frames ago (`ai_check.js` proves the delay to the frame). Difficulty is **seven numbers and the seeded dice** (`TIERS`: reaction, error, punish, tech, step, combo, aggro) and nothing else: no health, damage or speed multiplier exists. Within an arcade ladder the profile climbs from its tier to the next one; survival and time attack have their own ramps (`survivalProfile`, `timeAttackProfile`). `HUMAN` in the same file is the budget bot's person.
  **Modes** (`session.js` is the pure state of one play-through, `ladder.js`, `flow.js`, `pay.js`, `hiscore.js`, `training.js`, the screens `scene_*.js`): ARCADE (six fights: the four others in rising danger, your own fighter as a mirror, the boss at the store; three tiers with 7 / 5 / 3 continues and a score multiplier of 0.5 / 1 / 2; a second player can join on their keys at the select; a ten-second continue countdown; three-initial high-score table), VERSUS 2P (both pick, P1 picks the place), VERSUS CPU, SURVIVAL (one round each, life carries over), TIME ATTACK (five fights, record per fighter) and TRAINING (frame data of the move you do, the measured advantage of the last exchange, an input strip, boxes, dummy stand / crouch / block / random, record and play back). Everything saves through `save.js` (v2; the old `run` blob is dropped).
  **Time budget.** The target is about two hours for a player who sees every mode once on NORMAL and clears the ladder with each fighter (spec 17). `node apps/standbattle/budget_bot.js [players]` plays all of it with a human-pace profile and adds up the real fight time (KO slow motion included) and the `timing.js` table of everything that is not a fight; it fails outside 110 to 130 minutes. **Changing the CPU, a profile, the ladder, a round length or a damage number moves that figure: re-run it.**
  **Art, sound, trophies.** The rasterizer and rig of the old build are kept (`draw.js`, `layer.js`, `body.js`, `anim.js`, the sprites, the four Morioh stages, `fx.js`, `juice.js`), the score (seven thirty-two-bar tunes: the title, the select, one for each stage and the boss; `tunes_a.js`, `tunes_b.js`, `score_kit.js`, `score.js`, chosen per place through the shared director by `music.js`; `music_check.js`) and the synthesised effects (`audio.js`, with a throw crack, a sidestep whoosh, a splat thud, a counter sting, a round bell, a KO boom). The screens are drawn with the same pixel font (`ui_kit.js`). This app is an explicit, user-requested exception to the machine's 16-colour rule; canvas smoothing stays off. 47 trophies (`trophies.js`) read the fight's hook bus (`hooks.js`: events only; the sound, the effects and the ledger watch a fight and cannot change it) through `trophies_bridge.js`; `trophy_check.js` plays a witness for each. `props.js` is the folder a mastered game leaves, with a move list per fighter written from the rows.
  **Menus, keys and limbs (the last pass).** The menu is two columns with a difficulty row, and the options and the records are roomier. **The keys are WASD with U I J K for the first player and the arrows with the numpad for the second** (`input.js`; an old save's defaults migrate; every hint reads the live bindings). **Limbs are two-bone IK** (`ik.js`, `stance.js`, `strike_pose.js`, `pose_fighter.js`): planted feet, a guard fixed in the world, straight-line punches, the rear arm drawn over the body when it strikes; `rig_check.js` holds feet on the floor and knees and elbows the right way.
  **Checks** (pure Node unless noted): `node apps/standbattle/{framedata,combat,input,content,fairness,anim,ai,trophy,rig,music}_check.js`, `node apps/standbattle/headless_harness.js` (every mode, seeded), `node apps/standbattle/budget_bot.js`, and in the shell `node scripts/check-standbattle.mjs` (the screens, played with the real keys). None of these, `check_kit.js`, the harness or the bot is packaged.

## Rules
- Apps never import from `kernel/`.
- Files stay under 300 lines (split into siblings in the app folder if needed).

### Bekkedal, the last pass (houses, waking, the map, the land)
- **You start in a shack and work toward the house by the water.** The first house (`farmhouse`, `HYTTA` / THE SHACK) is one room eight squares by five in the 24x15 frame (black round it): a cot, a candle, a stove with wood beside it, two boards on trestles with one chair, a trunk, a coat on a nail, boots, a broom, one window (`rooms.js`, `BEK_DECOR.farmhouse`). Outside it is the smallest building in the valley (four squares wide, grey weathered log under sod, one pane, no chimney, nothing painted: `FACADES.farm`). A thing you had placed in the old rooms that is no longer ground is handed back to the bag by `healCoords`.
- **You wake where you lay down.** Asleep in a bed indoors you are still in it while the morning opens and then stand beside it (`newDay`: `nap.bed`); only a night out of doors or at the 02:00 wall carries you somewhere else.
- **THE MAP (`m`) lists every place outdoors**: the ones you have walked into are open and take you there for a cost by distance (energy and minutes off `BEK_WORLD`), the rest read `??? NOT FOUND YET`, and a place behind a gate (the vidda's cold, the mine's dark) is as shut to the map as to the road (`mapList`, `gateInto`, `landing` in `index.js`).
- **Trees and veins come back slowly** (`BEK_REGROW`: birch 14 days, fir 21, a vein 9). **Nobody speaks of a roof, a floor or a stove that is not there**: a line about being inside is only in the mouth of someone who is (Lars's "in here" lines are gated on the gruva), and the rest were rewritten to the places people actually stand.
