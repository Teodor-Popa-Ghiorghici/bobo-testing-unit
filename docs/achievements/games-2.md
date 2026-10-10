# Catalogue 2 of 4: Stand Battle, Bekkedal, The Bottle

Legend as in `games-1.md`: **K** P progression / S skill / E explore / C creative / J joke; **T** B S G; `*` secret; **Proof** `sim` /
`bot` / `tune` / `-`.

---

## Stand Battle Arena

**What it is now.** An arcade fighter (see `docs/stand-battle-tekken-spec.md`): four buttons, heights, a throw and a throw break, a sidestep into a second lane, counter hits, juggles, bounces, wall splats, knockdowns with wake-up
rolls, five fighters and a boss, rounds with a draw that counts for both, a ring-out stage, and six modes (arcade ladder, versus, versus CPU, survival, time attack, training). The earlier 24 trophies belonged to the belt-scroll
roguelike (Perfect Clash, Step charges, Momentum, run buffs); none of those mechanics exist, so they were reworked into the new ones, and 23 were added. **Existing achievements: none beyond these.**

**How it hooks in without touching the engine.** `hooks.js` is a bus of events only: a listener is handed the payload and has nothing to write to, which is how `audio.js`, `fx.js` and the ledger watch a fight without being able to
change it. `apps/standbattle/trophies_bridge.js` subscribes to `onHit`, `onBlock`, `onThrow`, `onThrowBreak`, `onSidestepDodge`, `onLaunch`, `onBounce`, `onWallSplat`, `onKnockdown`, `onWake`, `onCombo`, `onSpecial`,
`onDetonate`, `onRoundEnd`, `onKO` and `onMatchEnd`, keeps the per-match counters, and emits one `fight-end` at the end of a match. The flow (`flow.js`) emits the mode events (`ladder-clear`, `timeattack-clear`,
`survival-end`, `hiscore`, `versus`), and the screens emit `training-open`, `record-play`, `movelist-open`, `rebind` and `debug-on`. `trophy_check.js` plays a witness through the sim for every trophy that a fight can earn and
checks that a near miss does not.

**Events.** Fight: `fight-end{ won, enemy, mode, tier, mirror, secs, damageTaken, lostRound, maxCombo, breaks, dodges, pad, shake }`; round: `round-end{ won, lost, draw, ring, how, full, secs }`, `final-round`; in-fight:
`throw`, `throw-break`, `dodge`, `counter`, `combo{ hits, juggles }`, `launch{ kind }`, `bounce`, `wall-splat`, `roll`, `special`, `detonate{ who }`, `status{ id }`. Mode: `ladder-clear{ char, tier, continues, secs, score }`,
`timeattack-clear{ char, secs }`, `survival-end{ wins }`, `hiscore{ rank }`, `versus`. Marks: `won_with` (a fighter won with), `cleared` (a ladder cleared with).

| ID | Name | How | K | T | Proof | Trigger |
|---|---|---|---|---|---|---|
| sb_first | FIRST MATCH WON | Win a match in any mode. | P | B | sim | fight-end |
| sb_round | ROUND ONE | Win a round. | P | B | sim | round-end |
| sb_arcade | ARCADE: CLEARED | Clear the arcade ladder with any fighter. | P | S | sim | ladder-clear |
| sb_boss | KILLER QUEEN, STOPPED | Defeat the boss at the end of the arcade ladder. | P | S | sim | fight-end |
| sb_all5 | FIVE LADDERS | Clear the arcade ladder with each of the five fighters. | P | G | sim | sets: cleared |
| sb_each | ONE OF EACH | Win a match with each of the five fighters. | E | S | sim | sets: won_with |
| sb_hard | HARD, AND STILL STANDING | Clear the arcade ladder on HARD. | S | G | sim | ladder-clear |
| sb_nocont | NO CONTINUES | Clear the arcade ladder without using a continue. | S | S | sim | ladder-clear |
| sb_flawless | FLAWLESS ROUND | Win a round without taking any damage. | S | S | sim | round-end |
| sb_perfect | PERFECT MATCH | Win a match without losing a round or taking any damage. | S | G | sim | fight-end |
| sb_throw | GOT YOU | Land a throw. | E | B | sim | throw |
| sb_break | NOT TODAY | Break a throw. | S | B | sim | throw-break |
| sb_break5 | THE TECH MASTER | Break five throws in one match. | S | S | sim | fight-end |
| sb_dodge | SIDESTEP | Make an attack miss by sidestepping. | S | B | sim | dodge |
| sb_dodge10 | THE LANE IS A WEAPON | Make ten attacks miss by sidestepping in one match. | S | S | sim | fight-end |
| sb_counter | COUNTER HIT | Land a counter hit. | S | B | sim | counter |
| sb_combo5 | FIVE AND COUNTING | Land a combo of five hits. | S | B | sim | combo |
| sb_combo6 | SIX-HIT COMBO | Land a combo of six hits. | S | S | sim | combo |
| sb_launch | UP IN THE AIR | Launch a fighter into the air. | E | B | sim | launch |
| sb_juggle | JUGGLER | Land a combo with at least three juggle hits after a launch. | S | S | sim | combo |
| sb_bounce | BOUNCE HOUSE | Bounce a fighter off the floor. | E | S | sim | bounce |
| sb_splat | WALL SPLAT | Pin a fighter to the wall. | E | B | sim | wall-splat |
| sb_ring | RING OUT | Win a round by ring-out. | E | S | sim | round-end |
| sb_ringed | OVER THE EDGE | Lose a round by ring-out. | J | B | sim | round-end |
| sb_draw | A DRAW IS A WIN FOR BOTH | End a round in a draw. | J | B | sim | round-end |
| sb_final | THE FINAL ROUND | Fight a final round after two drawn rounds. | E | S | sim | final-round |
| sb_time | THE CLOCK RUNS OUT | Win a round on time. | E | B | sim | round-end |
| sb_bomb | IT WAS A BOMB ALL ALONG | Blow up a bomb with Kira's DETONATE. | E | S | sim | detonate |
| sb_drown | AQUA NECKLACE | Land Angelo's AQUA NECKLACE grab. | E | B | sim | status |
| sb_special | SPECIAL DELIVERY | Land a special move that needs a motion input. | E | B | sim | special |
| sb_roll | ROLL WITH IT | Get up from a knockdown with a roll. | S | B | sim | roll |
| sb_surv5 | FIVE AT A TIME | Win five fights in a row in Survival. | P | S | sim | survival-end |
| sb_surv12 | IRON MAN | Win twelve fights in a row in Survival. | P | G | sim | survival-end |
| sb_ta | AGAINST THE CLOCK | Clear Time Attack. | P | S | sim | timeattack-clear |
| sb_tafast | FIVE IN FOUR | Clear Time Attack in under four minutes. | S | G | sim | timeattack-clear |
| sb_train | IN THE LAB | Open training mode. | E | B | sim | training-open |
| sb_tape | TAPE IT, LOOP IT | Record the dummy in training and play it back. | C | B | sim | record-play |
| sb_list | READ THE MOVE LIST | Open the move list. | E | B | sim | movelist-open |
| sb_versus | TWO PEOPLE, ONE KEYBOARD | Start a two-player versus match. | E | B | sim | versus |
| sb_hiscore | YOUR INITIALS | Enter your initials in the high-score table. | P | B | sim | hiscore |
| sb_mirror | THE OTHER YOU | Beat your own fighter in the ladder's mirror match. | E | B | sim | fight-end |
| sb_rebind | MY KEYS | Change a key binding. | C | B | sim | rebind |
| sb_pad | PAD, NOT PAPER | Win a match with a gamepad plugged in. | C | B | sim | fight-end |
| sb_shake | A STEADY CAMERA | Turn SHAKE off and win a match. | C | B | sim | fight-end |
| sb_debug | HITBOX VISION | Switch on the BOXES overlay. | J | B | sim | debug-on |
| sb_za* | ZA WARUDO | Win a round in under fifteen seconds. | S | G | sim | round-end |
| sb_yare* | YARE YARE DAZE | Lose a match. | J | B | sim | fight-end |

## Bekkedal

**Mechanics found.** A valley of nine outdoor maps and three rooms with a 06:00-to-02:00 day, 20-day seasons, a year of 80 days. Tools (hoe, can,
axe, rod, pick), 12 crops, forage, fish in three waters with a weather/season/hour table, **three legends** each with its own window (the
lake's troll: midsummer, clear sky, 20:00-21:00; the fjord's king: winter, rain, 18:00-19:00; the plateau's needle: winter thaw, 23:00-01:00),
a rhythm for felling, a descent of generated mine floors (stations every fifth, krystall below 12), animals, preserves, 9 dishes and recipes
gated on friendship, **eight people with posts, schedules, five-beat arcs and 24 heart events** at friendship 4/7/10, gifts (loved/liked, two per
person per week), a 6,000 kr lot and a house to build (Act I ends there; fastest honest play 23-38 days per `act2_check.js`), furnishing with a
flood-fill that refuses a placement that would wall in a door, seven fixed errands plus a rotating board, a bear who says PERKELE, a night that
charges you (from 24:00) and a magpie at 02:00, the **loft** (seven wings, 64 things, four seasonal offerings, a second ending; fastest simulated
completion day 90). It has its own contract (`apps/bekkedal/CLAUDE.md`) and its own rule files, and it is **bilingual**: names below are English / Norwegian.
**Existing achievements: none** (the loft's wing payouts and the two endings are the only "completions").

**Events (from `index.js` functions that already exist).** `harvest{ crop, grade }`; `catch{ fish, rare, legend }` from `landFish`; `fell{ glyph, clean, heart }`
from `chopFinish`/`chopStrike`; `mine{ floor, ore }` from `mineSync`/`mineStart`; `gift{ npc, tier }` and `talk{ npc }` from `talkTo` (bear: `npc.bear`);
`scene-end{ id }` from `sceneEnd`; `build{ what }` from `hakonBuild` / `hakonTilbygg` / `hakonGreenhouse`; `lot` from `lotSign`; `place{ item, ok }` /
`place-refused` from `confirmPlace`; `craft{ id }`, `cook{ id }`; `donate{ wings, total }` from `spineDonate`; `day{ day, season, bedBefore24, chores, passedOut, magpie }`
from `newDay`/`startNap`; `visit{ map }` from `markDisc`; `use{ furniture }` from `furniture_act.js`. State-derived (poll on `day`): `friendship10`, `crops`, `fish` (sets
are kept in the trophy store, not in `S`).

| ID | Name (EN / NO) | How | K | T | Proof | Trigger |
|---|---|---|---|---|---|---|
| bk_furrow | FIRST FURROW / FØRSTE FURE | Harvest your first crop. | P | B | - | harvest |
| bk_crops8 | EIGHT ROWS / ÅTTE RADER | Harvest eight different crops. | P | S | - | set crops |
| bk_crops12 | TWELVE ROWS / TOLV RADER | Harvest all twelve crops. | P | G | - | set crops |
| bk_grade | FIRST CLASS / FØRSTE KLASSE | Harvest a crop of the top grade. | S | B | tune | harvest{grade:2} |
| bk_lot | THE LOT IS YOURS / TOMTEN ER DIN | Buy the lot by the water. | P | B | - | lot |
| bk_house | A HOUSE BY THE WATER / ET HUS VED VANNET | Finish building the house. | P | S | sim | build{house} |
| bk_house30 | SWIFT HAMMER / RASK HAMMER | Finish the house by day 30. | S | S | sim | build{house}, day |
| bk_house24 | FASTER STILL / ENDA RASKERE | Finish the house by day 24. | S | G | sim | same |
| bk_greenhouse | GLASS AND SUN / GLASS OG SOL | Build the greenhouse. | P | B | - | build |
| bk_barn | A ROOF FOR THE ANIMALS / TAK FOR DYRA | Build the barn. | P | B | - | build |
| bk_chores | MORNING CHORES / MORGENSTELL | Tend your animals on seven days running. | S | S | - | streak chores |
| bk_fish5 | ANGLER / SPORTSFISKER | Land five different species. | P | B | - | set fish |
| bk_fish10 | TEN SPECIES / TI ARTER | Land all ten, legends and all. | P | G | - | set fish |
| bk_rare | A GOLDEN MORNING / EN GYLDEN MORGEN | Land a rare fish: a golden trout or a halibut. | E | B | - | catch{rare} |
| bk_troll | THE TROLL IN THE LAKE* / TROLLET I VANNET | (hint) *Something very old keeps its own hours in the lake, in high summer, on a clear evening.* | E | S | sim | catch{legend:'trollorret'} |
| bk_king | THE KING OF THE SEA* / HAVETS KONGE | (hint) *The fjord has a king. He keeps to the dark half of the year, in the rain, as the lamps come on.* | E | S | sim | catch{legend:'havkonge'} |
| bk_needle | THE WHITE NEEDLE* / DEN HVITE NÅLEN | (hint) *On the plateau, when the ice lets go in midwinter, something silver is awake after bedtime.* | E | S | sim | catch{legend:'sneulke'} |
| bk_legends | THREE LEGENDS / TRE LEGENDER | Land all three legends. | E | G | - | set legends |
| bk_clean | CLEAN CUT / RENT SNITT | Fell a tree without one glancing blow. | S | B | - | fell{clean} |
| bk_heart | RIGHT IN THE HEART / RETT I HJERTET | Fell a great fir with two deep blows and no glance. | S | S | tune | fell{glyph:'G', heart>=2, clean} |
| bk_timber | TIMBER MAN / TØMMERMANN | Fell five trees in a row without a glance. | S | S | - | streak clean |
| bk_mine5 | THE FIRST STATION / FØRSTE STASJON | Reach floor 5 of the mine. | P | B | - | mine{floor} |
| bk_mine10 | THE TENTH FLOOR / TIENDE ETASJE | Reach floor 10. | P | S | - | mine |
| bk_mine15 | PAST THE LAMP / FORBI LYKTA | Reach floor 15. | P | G | tune | mine |
| bk_krystall | A STONE THAT SHINES / EN STEIN SOM LYSER | Mine krystall. | P | S | - | mine{ore:'krystall'} |
| bk_lamp | LIGHT FOR THE DEEP / LYS TIL DYBDEN | Craft the crystal lamp. | P | S | - | craft |
| bk_fr1 | A FRIEND / EN VENN | Reach friendship 10 with one person. | P | B | - | poll fr |
| bk_fr4 | FOUR FRIENDS / FIRE VENNER | Reach friendship 10 with four people. | P | S | - | poll |
| bk_fr8 | EIGHT FRIENDS / ÅTTE VENNER | Reach friendship 10 with all eight. | P | G | - | poll |
| bk_scene | A SCENE OF YOUR OWN / DIN EGEN SCENE | See your first heart event. | P | B | - | scene-end |
| bk_arc | A WHOLE STORY / EN HEL HISTORIE | See all three heart events of one person. | P | S | - | set scenes |
| bk_scenes | EVERYONE'S STORY / ALLES HISTORIE | See all 24 heart events. | P | G | - | set scenes |
| bk_gift | JUST WHAT I WANTED / AKKURAT DET JEG TRENGTE | Give a loved gift. | E | B | - | gift{tier:'loved'} |
| bk_gifts8 | A PRESENT FOR EVERYONE / EN GAVE TIL ALLE | Give each of the eight a loved gift. | S | S | - | set gifted |
| bk_errands | ALL SEVEN ERRANDS / ALLE SJU ÆRENDER | Finish the seven fixed requests. | P | S | - | poll q |
| bk_bear | PERKELE* / PERKELE | (hint) *Someone in the wood is always sweeping. Say hello.* | E | B | - | talk{bear} |
| bk_place10 | HOME MAKER I / HJEMMEBYGGER I | Place ten pieces in your home or yard. | P | B | - | stat placed |
| bk_place30 | HOME MAKER II / HJEMMEBYGGER II | Place thirty. | P | S | - | stat placed |
| bk_nice | NICE TRY* / BRA FORSØK | (hint) *You can fence anything. Almost.* Try to place a fence or gate that would wall in a door. | E | B | - | place-refused |
| bk_answers | THE HOUSE ANSWERS / HUSET SVARER | Use six pieces in the house: books, clock, window, plant, cat and tea. | E | S | - | set use |
| bk_table | A LAID TABLE / DUKET BORD | Cook every dish you have a recipe for. | P | S | - | set cook |
| bk_winter | THE FIRST SNOW / FØRSTE SNØ | Reach winter. | P | B | - | day |
| bk_year | A YEAR IN THE VALLEY / ET ÅR I DALEN | Reach day 81: one full round of the seasons. | P | S | - | day |
| bk_fairs | ALL FOUR FAIRS / ALLE FIRE MARKEDER | Be on the town square on each of the four festival days. | E | S | - | set fairs |
| bk_early | EARLY TO BED / TIDLIG I SENGA | Go to bed before midnight seven days running. | S | S | - | streak bed |
| bk_magpie | A THIEF IN FEATHERS* / EN TYV MED FJÆR | (hint) *Stay up. See what the night costs.* Fall asleep where you stand at 02:00. | J | B | - | day{magpie} |
| bk_valley | THE WHOLE VALLEY / HELE DALEN | Visit all nine places. | E | S | - | set visit |
| bk_key | THE KEY / NØKKELEN | Be given the key to LOFTET. | P | S | - | spineOpen |
| bk_wing1 | ONE WING / EN FLØY | Complete one wing of the loft. | P | B | - | donate |
| bk_wing4 | FOUR WINGS / FIRE FLØYER | Complete four wings. | P | S | - | donate |
| bk_loft | LOFTET, COMPLETE / LOFTET, FULLFØRT | Complete all seven wings: sixty-four things. | P | G | sim | donate{done} |
| bk_loft100 | A FAST YEAR / ET RASKT ÅR | Complete the loft by day 100. | S | G | sim | donate{done}, day |

Notes.

- **Legends are the exploration backbone.** Each is a three-part puzzle (season, weather, hour) read off `BEK_FISH_WATERS`, wrapped in the reeling mini-game;
  the hint names the *kind* of condition and never the number. Nothing is missable: every season, every weather and every hour comes round again.
- **Scoped, not permanent.** There is no "never sell", "never sleep", "never skip a day". The streak trophies (chores, bed, clean cuts) reset and can be retried at once.
  No trophy depends on which of a person's first-meeting answers you gave; those are permanent and part of the ending.
- **The speed pair (`bk_house30`, `bk_house24`, `bk_loft100`) is the only "go faster" content**, kept to three rows, and the numbers are read off
  `act2_check.js`'s balance pass (the honest range is 23-38 days) and `spine_check.js` (fastest 90), not invented.
- **Copy rule.** Names and descriptions are `{ no, en }` like a dialogue line, shown per the language toggle (NO + EN, or EN only). The Norwegian above is a
  first draft for review by someone who reads it natively; the existing in-game Norwegian should be the reference for register.
- **A discrepancy to settle before `bk_bear` ships.** `CLAUDE.md` says the bear arrives on day 21; the README says day 6. The trophy only needs "talked to the
  bear", so it works either way, but its hint should not promise a date.
- **Not trophies, on purpose:** gold earned, items sold, steps walked, tiles ploughed. Bekkedal has no kill counter; the equivalent trap would be "harvest 1,000 crops".

---

## The Bottle (Jaeger)

**Mechanics found.** A first-person pour and drink (`drink.js`, `pour.js`, `glass3d.js`): one measure is 40 ml, a 700 ml bottle holds seventeen and a half, and
the arithmetic in `drunk_bac.js` is fixed (30 s to reach the blood, one measure cleared a minute, blackout at nine felt). Seven named stages
(SOBER, WARM, TIPSY, LOOSE, SLOSHED, HAMMERED, ABOUT TO GO); nine bottles from Dave (the cordial is 0%); a nine-scene blackout deck (seven photographs and two drawn
screens) dealt from a shuffled deck; clicks are never queued, so speed cannot be gamed. `Drunk.drink(units)`, `Drunk.stage()`, `Drunk.blackedOut()`.
**Existing achievements: none.**

**Taste check, for the owner.** This is a birthday gift, and the app is a dry, slightly rueful comedy about a bottle, so the trophies below reward the
*journey*, restraint and the collection of drinks and not speed or quantity. There is deliberately no "pass out fast" or "drink N bottles".
`bt_lights` and `bt_dreams` are the only ones about the blackout, and `bt_limit` and `bt_designated` are there to give the other side of it equal weight.
Delete either pair if it does not suit the person.

**Events.** `pour{ drink }`, `drink{ drink, units }`, `stage{ name }` (poll `Drunk.stage()` once a second while the loop runs), `blackout{ scene }`
from `runBlackout` (it already knows which scene it dealt), `bottle-empty{ drink }`. Counters: set `tasted`, set `scenes`, timer `glowSecs`.

| ID | Name | How | K | T | Proof | Trigger |
|---|---|---|---|---|---|---|
| bt_pour | THE FIRST POUR | Pour a measure. | P | B | - | pour |
| bt_skal | SKAL | Drink your first measure. | P | B | - | drink |
| bt_glow | A MILD GLOW | Keep the screen at WARM or TIPSY for five minutes, drinking at least three measures. | S | S | tune | stage poll |
| bt_limit | KNOW YOUR LIMIT | Reach ABOUT TO GO, then stop and let it drain back to SOBER without passing out. | S | S | tune | stage poll |
| bt_designated | DESIGNATED DRIVER | Empty a whole bottle of the cordial: seventeen and a half measures. | C | S | - | bottle-empty{cordial} |
| bt_flight3 | A SMALL FLIGHT | Drink a measure of three different drinks. | E | B | - | set tasted |
| bt_flight6 | A FLIGHT | Drink a measure of six different drinks. | E | S | - | set tasted |
| bt_flight9 | THE WHOLE SHELF | Drink a measure of all nine drinks. | E | G | - | set tasted |
| bt_lights | LIGHTS OUT | Pass out once. | J | B | - | blackout |
| bt_lore | ONE SIP IS ENOUGH | Be knocked out by a single sip with LORE ACCURATE switched on. | J | S | - | lore |
| bt_dreams | THIRTY-EIGHT DREAMS* | (hint) *The machine has thirty-eight dreams. It does not repeat itself until it has had them all.* See all thirty-eight blackout scenes. | E | G | - | set scenes |

`bt_lore` is the joke that the unlock earns: LORE ACCURATE (five blackouts and every bottle there is to own, not counting the ones the credits give) switches on a mode in which the first
swallow of anything with alcohol in it knocks you out, and this is the one trophy for it (`kernel/lore.js`, the event `lore`).

Notes. The blackout deck is dealt without repeats, so `bt_dreams` takes exactly nine passes; the second blackout comes much sooner than the first
because waking leaves four measures in the blood (`BAC.WAKE`). `bt_limit` is the one with a point: it is the only trophy that rewards reading the
meter and stopping, which is what the arithmetic is built to teach.
