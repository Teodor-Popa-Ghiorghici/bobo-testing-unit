# Catalogue 4 of 4: the machine itself, and the trophies about the trophies

Legend as in `games-1.md`. Everything here is owned by the kernel (`kernel/trophies_system.js`, data only) and emitted from the kernel's own
functions, so no app is touched. The system set has one job: **make the interface itself worth exploring**, the way each game's set makes
that game worth learning.

**Mechanics found (kernel).** A desktop of draggable, keyed icons; folders that are real; a RecycleBin where "delete never destroys" and `Ctrl+Z` takes
it back; `RESTORE SYSTEM FILES`; file import (images crushed to sixteen colours, video at 15 fps); backgrounds in five fits; the **style meter**
(eight ranks D to HAPPY BIRTHDAY, a pile of files worth more than the same files one by one, a song at the top, glitching after a minute); a delete
reel; a terminal that is also a HolyC compiler and runs `AutoExec.HC` at boot; hardware knobs on the chin (SCAN, DGAUSS, PHOS, BURN, MUS, SFX, VHLD, HHLD,
LOBBY, POWER); a boot that is a quick one every time except after eight hours away, when it is the ten-second **long boot**, and that only `~` can end; a
screensaver after 90 s; the Konami code; Dave's shop and his farewell box (seven tiers); the SUN economy (`Economy.totals()`); a built-in Help.

---

## A. The desk and the files

**Events.** From `kernel/importer.js`: `import{ kind }`. From `kernel/wallpaper.js`: `bg{ fit, kind }`. From `fileops.js` / `vfs_ops.js` (they already announce
`vfs-changed` and `vfs-reel`): `mkdir{ depth }`, `copy{ ctrl }`, `drag-cancel`, `delete{ n }`, `undo`, `trash-restore`, `restore-system`.

| ID | Name | How | K | T | Proof | Trigger |
|---|---|---|---|---|---|---|
| sys_upload | NEW ARRIVAL | Bring a picture of your own onto the desktop and watch it get crushed to sixteen colours. | P | B | - | import{image} |
| sys_video | FIFTEEN FRAMES A SECOND | Import a video and play it. | E | B | - | import{video} |
| sys_bgvideo | A MOVING WALLPAPER | Set a video as the desktop background. | C | S | - | bg{video} |
| sys_fits | FIVE FITS | Set a background in all five fits: fill, fit, stretch, centre, tile. | E | S | - | set fits |
| sys_folder | A PLACE FOR EVERYTHING | Make a folder and drag a file into it. | P | B | - | mkdir + move |
| sys_deep | FOLDERS ALL THE WAY DOWN | Make a path five folders deep. | C | B | - | mkdir{depth>=5} |
| sys_copy | TWO OF EVERYTHING | Copy a file by holding Ctrl as you drop it. | E | B | - | copy{ctrl} |
| sys_esc | CHANGED MY MIND | Press Esc in the middle of a drag. | E | B | - | drag-cancel |
| sys_undo | NOT SO FAST | Take a delete back with Ctrl+Z. | E | B | - | undo |
| sys_bin | THE BIN REMEMBERS | Put something back from the RecycleBin. | E | B | - | trash-restore |
| sys_restore | LET THERE BE FILES | Use RESTORE SYSTEM FILES to bring back a machine file you deleted. | E | B | - | restore-system{n>0} |
| sys_bend | MAKE IT FIT | In one sitting, zoom a window, take one full screen and resize one. | E | B | - | window events |

## B. The style meter

**Events.** The meter is in `kernel/style.js` (`hit(node, n)` per delete, `setTier(t)`, `onTop()` is an empty hook waiting for this) over the pure model in
`style_model.js` (`s.tier`, `s.atTop` seconds at the top, `s.crowned`). Emit `style{ tier, n, top, atTop }` from `hit` and from the frame, and keep
`singlesOnly` / `pilesOnly` flags per streak in the trophy scope, reset when the meter falls to nothing. `scripts/check-style.mjs` already plays five kinds
of player against the model, so the `sim` rows are proved by extending it.

| ID | Name | How | K | T | Proof | Trigger |
|---|---|---|---|---|---|---|
| sys_rank_b | BLASPHEMOUS | Reach rank B on the style meter. | P | B | - | style{tier>=2} |
| sys_rank_s | SACRILEGIOUS | Reach rank S. | P | S | - | style{tier>=4} |
| sys_rank_sss | SSSTEFAN | Reach rank SSS. | P | S | - | style{tier>=6} |
| sys_rank_top | HAPPY BIRTHDAY | Reach the top rank. | P | G | - | style{tier:7} |
| sys_pile20 | PILE DRIVER | Delete twenty or more files in one go. | S | S | - | delete{n>=20} |
| sys_pile100 | AVALANCHE | Delete a hundred or more files in one go. | S | G | sim | delete{n>=100} |
| sys_single | ONE AT A TIME | Reach rank A deleting only single files. | S | S | tune | style, singlesOnly |
| sys_piletop | PILES ALL THE WAY UP | Reach the top rank using nothing but piles of twenty or more. | S | G | sim | style, pilesOnly |
| sys_hold | HOLD THE NOTE | Stay on the top rank for thirty seconds. | S | S | sim | style{atTop>=30} |
| sys_glitch | THE TAPE WOBBLES | Stay on the top rank until the sound starts to glitch. | S | G | sim | style{atTop>=60} |

Why this block is mostly skill: the whole design of the meter is that **piles, not single files, carry you up, and the bleed never stops**
(`style-meter-snippets.md`). A trophy should reward finding that out, not pressing Delete a lot.

## C. The terminal, HolyC and the boot

**Events.** `cmd{ name }` from the terminal's dispatcher (the `case` table); `holyc{ ok, usesFn, usesLoop }` from the interpreter's run;
`autoexec{ ok, line }` from the boot-time `AutoExec.HC` runner; `panic` from `kernel/panic.js`; `help-page{ id }` from `kernel/help.js`.

| ID | Name | How | K | T | Proof | Trigger |
|---|---|---|---|---|---|---|
| sys_holyc1 | HELLO, TEMPLE | Run a HolyC program that is only a string. | P | B | - | holyc{ok} |
| sys_holyc2 | A FUNCTION OF YOUR OWN | Define a HolyC function and call it. | C | S | - | holyc{usesFn} |
| sys_autoexec | BREAK IT, FIX IT | Break AutoExec.HC, reboot, read the error that names the line, and fix it. | C | S | - | autoexec{!ok} then {ok} |
| sys_compile | THE COMPILER IS THE SHELL | Use COMPILE on a file of your own. | E | B | - | cmd{COMPILE} |
| sys_eggs3 | TERRY'S TERMINAL I | Find three of the terminal's answers: SUDO, PING, CURL, a fork bomb, SL, COWSAY, FORTUNE, LINES, NEOFETCH. | E | B | - | set eggs |
| sys_eggs7 | TERRY'S TERMINAL II | Find seven of them. | E | S | - | set eggs |
| sys_lines | THE BUDGET | Run LINES and see how much of the 100,000-line budget is spent. | E | B | - | cmd{LINES} |
| sys_panic | RING 0* | Drop into the debugger with PANIC. | J | B | - | panic |
| sys_help | READ THE MANUAL | Open all six pages of Help. | E | B | - | set help |

## D. The chin: the hardware

**Events.** One `knob{ id, value }` from the setters in `kernel/hardware.js` (`wirePot`, the scan / phos / degauss / burn switches), `power{ on }`, `degauss`, and `saver`
from `Saver.start()`. The "picture rolls" test is `Math.abs(CRT.vhold - 5) + Math.abs(CRT.hhold - 5) > 0`.

| ID | Name | How | K | T | Proof | Trigger |
|---|---|---|---|---|---|---|
| sys_knobs | TOUCH EVERYTHING | Turn or press every control on the chin: SCAN, DGAUSS, PHOS, BURN, MUS, SFX, VHLD, HHLD and LOBBY. | E | S | - | set knobs |
| sys_roll | THE PICTURE ROLLS | Knock VHLD or HHLD off 5 until the picture rolls, then lock it back. | E | B | - | knob |
| sys_thunk | THUNK | Fire the degauss coil. | E | B | - | degauss |
| sys_power | PULL THE PLUG | Switch the monitor off and on again. | E | B | - | power |
| sys_saver | THE TUBE DREAMS | Leave the machine alone for ninety seconds and let it start drawing by itself. | E | B | - | saver |

## E. Dave, the shop and the SUN

**Events.** `Cos.buy` already ends in `Cos.tell`, which fires `cos-changed`; the trophy listens for it with `{ cat, id, price }`. Dave's box
(`dave_box.js`) emits `farewell{ tier }`; his hover talk (`makeHoverTalk`) emits `crazy{ id }` when it picks one of the crazy lines; `Economy.onChange`
gives `earned` and `spent` totals (`Economy.totals()`).

| ID | Name | How | K | T | Proof | Trigger |
|---|---|---|---|---|---|---|
| sys_buy1 | FIRST PURCHASE | Buy something from Dave. | P | B | - | cos-changed |
| sys_spent1 | SPENDER | Spend 1,000 SUN at Dave's. | P | B | - | totals.spent |
| sys_spent2 | BIG SPENDER | Spend 10,000 SUN. | P | S | - | totals.spent |
| sys_spent3 | A KING'S RANSOM | Spend 100,000 SUN. | P | G | - | totals.spent |
| sys_earned1 | A THOUSAND SUN | Earn 1,000 SUN, from anywhere. | P | B | - | totals.earned |
| sys_earned2 | TEN THOUSAND SUN | Earn 10,000 SUN. | P | S | - | totals.earned |
| sys_earned3 | A TEMPLE'S WORTH | Earn 99,999 SUN across the whole machine. | P | G | - | totals.earned |
| sys_refit | A FULL REFIT | Wear a frame, a logo, a pointer and a scheme you bought, all at once. | C | B | - | poll Cos.eq |
| sys_shelf | A SHELF CLEARED | Buy everything on one of Dave's shelves. | P | S | - | poll |
| sys_bare | EVERY SHELF BARE | Buy everything Dave has. | P | G | - | poll (his farewell tier `everything`) |
| sys_crazy | THE CRAZY ONE | Hear Dave say one of his crazy lines. | E | B | - | crazy |
| sys_farewells | A WORD FOR EVERYONE | Hear five of Dave's seven farewells. | E | S | - | set farewells (5 of 7) |
| sys_blink | WINDOW SHOPPING* | Close Dave's shop in under four seconds having bought nothing. | J | B | - | farewell{blink} |

`sys_farewells` is five of seven, not seven, because his `never` tier ("nothing bought, ever") can only be heard before the first purchase. That is the
reference example for rule 3 in `framework.md` section 7.

## F. Time, boot and the calendar

**Events.** `boot{ kind: 'quick'|'long', clicks, keys }` from `bootseq.js`; `open{ day }` once per launch (feeds the `days` array); `win-open{ appId }` from
`announceWins()` (feeds the `apps` set); `clock{ hour }` from the existing clock tick.

| ID | Name | How | K | T | Proof | Trigger |
|---|---|---|---|---|---|---|
| sys_wrongkey | WRONG KEY* | Press ten keys other than ~ at the boot prompt. | J | B | - | boot{wrongKeys>=10} |
| sys_longboot | THE LONG WAY IN | Sit through the long boot: the fan, the bad block, the song through the wall. | E | B | - | boot{kind:'long'} |
| sys_3am | THREE IN THE MORNING | Be at the desktop at 03:00. | J | B | - | clock{hour:3} |
| sys_days3 | COMING BACK | Open the machine on three days in a row. | P | B | - | streak days |
| sys_days7 | A WEEK IN THE TEMPLE | Open it on seven days in a row. | P | S | - | streak days |
| sys_days30 | A MONTH OF MORNINGS | Open it on thirty days in a row. | P | G | - | streak days (one grace day a week) |
| sys_apps10 | OPEN HOUSE | Open ten different apps. | E | B | - | set apps |
| sys_apps_all | EVERY DOOR | Open every app that has a window. | E | S | - | set apps |
| sys_games5 | A BIT OF EVERYTHING | Start five different games. | E | B | - | set games |
| sys_games9 | THE NINE ROOMS | Start all nine games: Sweeper, Solitaire, AfterEgypt, Garden, Cook, Magen, Stand Battle, Bekkedal and the Bottle. | E | S | - | set games |
| sys_birthday | THE DAY* | (hint) *There is one day the machine has been waiting for.* Open the machine on the owner's birthday. | E | G | - | open{day == BIRTHDAY} |

The birthday is one constant, `BIRTHDAY = { m, d }`, in `kernel/trophies_system.js`, left empty until the owner says what it is. It is the one trophy whose
whole point is that it is for one person.

## G. Hidden in the machine

| ID | Name | How | K | T | Proof | Trigger |
|---|---|---|---|---|---|---|
| sys_konami | THE TEN KEYS* | (hint) *The old code. Ten of them.* Enter the Konami code. | E | B | - | konami |
| sys_eden | IT WAS ENOUGH | Run Eden.HC from the garden the ten keys opened. | C | S | - | holyc{file:'Eden.HC'} |
| sys_credits | FIVE LOOKS AT FOUR FACES* | (hint) *They like to be looked at, and they notice who does.* Open CREDITS.EXE for the fifth time. | J | B | - | credits{n>=5} |

---

## H. The trophies about the trophies

The brief asks for meta-goals and "a few joke or novelty badges, sparingly". There is **one** joke here and it is the obvious one.
Legacy mirrors (Cook's 24, Magen's 98) are shown in the ledger but **do not count** toward any of these counts or toward mastery.

| ID | Name | How | K | T | Proof | Trigger |
|---|---|---|---|---|---|---|
| meta_view | VIEWING ACHIEVEMENTS! | Open TROPHIES.EXE. | J | B | - | window open |
| meta_remember | THE MACHINE REMEMBERS* | Be told about trophies you had earned before they existed. | J | B | - | backfill{n>0} |
| meta_10 | FIRST TEN | Earn 10 trophies. | M | B | - | count |
| meta_25 | TWENTY-FIVE | Earn 25 trophies. | M | B | - | count |
| meta_50 | HALF A HUNDRED | Earn 50 trophies. | M | S | - | count |
| meta_100 | A HUNDRED | Earn 100 trophies. | M | S | - | count |
| meta_200 | TWO HUNDRED | Earn 200 trophies. | M | G | - | count |
| meta_tiers | BRONZE, SILVER, GOLD | Earn one trophy of each tier. | M | B | - | count |
| meta_kinds | ONE OF EVERYTHING | Earn one trophy of each kind: progression, skill, explore, creative and joke. | M | B | - | count |
| meta_each | A LITTLE OF EVERYTHING | Earn a trophy in every game and every toy. | M | S | - | count |
| meta_gold10 | GOLD STANDARD | Earn ten gold trophies. | M | S | - | count |
| meta_secret3 | KEEPING SECRETS | Find three secret trophies. | M | S | - | count |
| meta_secret10 | THE SECRET LIFE | Find ten secret trophies. | M | G | - | count |
| meta_grand | THE GRAND TOUR | Earn a progression trophy in every one of the nine games. | M | G | - | count |
| meta_all | THE LEDGER IS FULL | Earn every trophy that can still be earned. | M | G | - | count (closed ones leave the denominator) |

**Mastery (derived, nine of them).** `MASTER OF SWEEPER`, `... SOLITAIRE`, `... AFTEREGYPT`, `... THE GARDEN`, `... THE COOK`, `... MAGEN`, `... STAND BATTLE`, `... BEKKEDAL`,
`... THE BOTTLE`: silver, 150 SUN, earned the moment every non-secret, non-legacy trophy of that game is. They are not rows above because they need no
trigger; `trophies_defs.js` generates them from each app's list, which is also why a game's list can grow without anyone remembering to update its seal.
