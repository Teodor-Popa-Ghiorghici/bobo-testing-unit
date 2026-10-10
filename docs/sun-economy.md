# The SUN economy

SUN is the machine's one currency (`window.Economy`: `earn`, `spend`, `balance`, `onChange`, `ledger`; the sun in the taskbar and
`ACCOUNT.EXE` show it). Dave's shop is the only sink. **`node scripts/check-sun.mjs` holds every number below**: it runs each game's
real pay tables through a model of an hour of playing it and fails if the answer leaves its band. Change a payout, run it, and read the table.

## What it is for

* Every game that can be *won* or *finished* pays, in proportion to the time it asks. An hour of any of them is worth **about 1,500 to
  9,000 SUN**, and the table below is where each one sits. The two that do not pay are on purpose: Crayon (the one place that is not keeping
  score) and the Elephant (nothing to score).
* **The garden is the engine** and is a different animal: it earns while you are away and is held by `apps/garden/garden_check.js`
  (the 99,999-SUN third temple takes a fully equipped player who checks in every five minutes fifteen minutes, and a player starting from
  nothing about two and three quarter hours). Everything else is the *other* way to get SUN: slower, steadier, and a reason to open the app.
* The shop is **208,289 SUN**: 99,999 of it is the third-temple frame (a joke priced as one), and **108,290** is everything else. At the mean of
  the games below (~2,500 an hour) the rest of the shelves are ~43 hours of play outside the garden (the check's band is 8 to 45). If a game paid ten times as much it
  would be the way to buy the shop in an afternoon, and the check says so.
* **SUN is paid when the thing happens**, never on a timer after it, so closing the window on a pay panel never loses it. (Sweeper used to
  pay a second and a half after the panel came up.) Every part of a payout is a line on the panel the player clicks through: nothing
  arrives unannounced.

## The ladder of hours (SUN an active hour, from `check-sun.mjs`)

| game | model | SUN / hr |
|---|---|---|
| Solitaire | a deal every 10 min, one in four won in 150 moves, 14 cards home otherwise: 8 SUN a card home, 1,400 a win, 8 a move under 200 | ~3,800 |
| AfterEgypt | PILGRIM 50 a minute (18 s of nothing in particular: nothing to farm) climbing to ~500 a minute at the temple, which is failed most of the time. Effective, at the success rate of someone who plays that way: 3,000 / 4,800 / 7,200 / 8,300 / 4,500 | 3,000 to 8,300 |
| The Cook | three medals on each of eleven benches, once each: 7,260 SUN over ~3.5 hours of puzzles (a bench already medalled pays nothing) | ~2,100 |
| Magen | ninety-eight mitzvot (about 14,700 SUN in all) over ~6 hours of attention: log-scaled to how hard each is | ~2,400 |
| Bekkedal | seven requests on the board (1,710), the house by the water (4,000), the loft (8,000) over an 8-hour run; the repeatable requests are on top | ~1,700 |
| Stand Battle | a won arcade match 100 + 30 for each stage already cleared (+25 a flawless round), a ladder cleared +1,000, versus CPU 80, survival 60 a win, time attack 600 (+300 under four minutes), all times the tier (0.5 / 1 / 2); nothing for a fight lost or for two people fighting each other. A NORMAL ladder is ~20 minutes (`budget_bot.js`); the last half hour's payments each take 10 % off the next, so three ladders an hour are ~2,800 | ~2,800 |
| Dungeon Sweeper, plain | SHALLOWS 80 / THE HIVE 400 / THE DEEP 1,200 + a time bonus; each win of a size in the last half hour pays 10 % less (floor 15 %) | 2,500 / 5,200 / 4,300 for an expert's SHALLOWS |
| Dungeon Sweeper, the descent | four SUN per geo a room is worth, +100 for a first clear (+400 for a guardian), +25 % for no larva hatched, 40 % of the room on a repeat. A first walk is ~11,000 SUN | ~2,900 first walk, ~1,300 again |

## How a game is kept honest

* **A game that can be repeated at the speed of the hand has a brake that nobody has to be told about.** Sweeper's plain game pays less for each
  win of the same size in the last half hour (`farmFactor`); Cook's medals pay once; AfterEgypt's first-clear prizes are paid once and PILGRIM
  is deliberately the smallest thing on the machine; a Sweeper room already cleared pays 40 %; Solitaire pays for cards that got home *and*
  for the win, so throwing a deal away does not pay for the next one.
* **A skill gets a bonus, not a rate.** Flawless (a quarter or a half more), time under par, a first clear: each is a line on a panel and a
  fraction of the base, so a player twice as good is paid ~1.5 times as much and never ten.
* **Pay modules are pure and carry their own reason.** `apps/<app>/pay.js` (or `levels.js` for AfterEgypt) holds the numbers and one
  paragraph on what the old numbers were and why they changed; the game only calls it.

## Changing a payout

1. Edit the app's `pay.js`.
2. `node scripts/check-sun.mjs` — read the table. A change that moves a row out of its band fails; moving a band is a decision for this file.
3. If the game has its own check (`aftere_check.js`, `cook_check.js`, `run_check.js` for Sweeper), run that too: they hold the *shape*
   (rates climb with difficulty, a hit loses the flawless prize), and `check-sun.mjs` holds the *level*.
4. Update the row above.

## Earned another way: trophies

`TROPHIES.EXE` pays SUN for achievements, scaled by how hard each one is (bronze 15, silver 40, gold 100; `kernel/trophy_rewards.js` lists the completions that are worth far more: a long list in a game
hundreds to thousands, finishing a whole thing several thousand, a game's mastery seal 500 and a hundred a trophy, the whole ledger the most; paid as `TROPHY: <NAME>`; see `docs/achievements/`). That money is on top
of the table and is bounded by the one-off nature of a trophy: **394 trophies, about 135,000 SUN if every one is earned, once, ever**. The 329 ordinary trophies are about 10,000 of it, a small slice of the shelves; the rest is
the hours-long completions, so the ledger is a long road through the whole machine rather than a way to buy the shop in an evening. The biggest also give items Dave does not sell (`kernel/cos_rewards.js`). `scripts/check-sun.mjs`
holds the total between 100,000 and 160,000, no trophy above 25,000 and the ordinary ones between 8,000 and 22,000; `scripts/check-trophies.mjs` holds every trophy to its tier or its listed worth.

* **Nothing in the table above is paid for through the trophies, and no trophy pays for what a game already pays for.** The Cook's twenty-four
  achievements and Magen's ninety-eight mitzvot are *mirrored* in the ledger (`legacy: true`, pay 0, counted nowhere): they keep paying through
  their own `achSun`, exactly as they did, and are shown in TROPHIES.EXE only.
* **Heart events and the loft's wings pay through the trophies** (`apps/bekkedal/trophies.js`), not through `apps/bekkedal/pay.js`.
* A trophy is silent when it is *backfilled* from an old save (`kernel/trophies_backfill.js`): a machine that has already done a thing is
  credited without a card, and its SUN is paid once.
