/* THE GOLDEN SUN EGGS: what to spend SUN on once Dave has nothing left to sell. Pure (no window, no storage of its own: `createEggs(io)` is handed one), so Node holds all of it
   (scripts/check-eggs.mjs). They are not on the shelves until everything that can be bought has been (`allBought`: the frames, logos, pointers, schemes, pots, seeds, backdrops, and
   what the apps' shelves unlock; what only a trophy or the credits give is not asked for). After that the Egg is one more thing Dave sells, for ever, each dearer than the last,
   up to MAX of them. Every egg is a small permanent gift to every game that has something to give: HALF A PER CENT each, a fifth at the very most, so a full clutch is a pleasant
   thing and not a different game. What each one reaches is DIALS; what a game does with the number is in that game (it asks `apps/eggs_scope.js`), and the pay of every game that
   pays goes through Economy.earn(n, why, { game }), which asks `boost`. Nothing here can make a game easier to lose or harder to win: a dial is more of something already there. */
export const KEY = 'templeos.eggs.v1';
export const MAX = 40;
export const PER_EGG = 0.5;                                        /* per cent of a dial, each egg */

/* what an egg reaches: `pay` is the SUN a game pays (every game that pays, but the garden, which has its own), and the rest are one game's own thing */
export const DIALS = [
  { id: 'pay',      name: 'EVERY GAME THAT PAYS',    text: 'more SUN from a win, a room, a deal, a bench, a request, a puzzle: the games below the garden, the cards, the sky, the kitchen, the arena, the valley and the lab' },
  { id: 'magen',    name: 'MAGEN',                   text: 'more mitzvot from everything: pressing, buildings, the lot' },
  { id: 'garden',   name: 'THE GARDEN',              text: 'plants grow faster, so tokens come sooner' },
  { id: 'sweeper',  name: 'DUNGEON SWEEPER',         text: 'opened tiles give more soul' },
  { id: 'bekkedal', name: 'BEKKEDAL',                text: 'a better price for what you sell at the counter' }
];
export const DIAL_IDS = DIALS.map(d => d.id);
/* the games whose SUN the `pay` dial raises (a game id is what Economy.earn is told) */
export const PAYERS = ['sweeper', 'solitaire', 'aftere', 'cook', 'standbattle', 'bekkedal', 'magen', 'holyc'];

/* what the n-th egg costs, n from 1: 4,800 for the first, a hundred thousand for the last of forty */
export const price = n => 4000 + 800 * n + 20 * n * n;
export const totalPrice = (from, to) => { let s = 0; for (let i = from; i <= to; i++) s += price(i); return s; };
/* how much of a dial n eggs give, as a multiplier: 1 with none, 1.2 with all forty */
export const mult = n => 1 + Math.min(MAX, Math.max(0, n | 0)) * PER_EGG / 100;
export const percent = n => Math.min(MAX, Math.max(0, n | 0)) * PER_EGG;

/* has everything for sale been bought? `lists` is the shelves ({ cat: [items] }), `has(cat, id)` whether it is owned, `forSale(list)` the part that can be bought.
   A backdrop is for sale only once a blackout has shown it (it is on the shelf only then), so `shelved(cat)` may be given to say which are on the shelf now. */
export function allBought(lists, has, forSale, shelved) {
  return Object.keys(lists).every(cat => forSale(lists[cat]).every(it => has(cat, it.id)));
}

export function createEggs(io, hooks) {
  hooks = hooks || {};
  let n = 0;
  try { const v = JSON.parse(io.get()); if (v && Number.isInteger(v.n)) n = Math.max(0, Math.min(MAX, v.n)); } catch (e) { /* none yet */ }
  const keep = () => io.set(JSON.stringify({ v: 1, n: n }));
  const E = {
    count: () => n,
    full: () => n >= MAX,
    next: () => (n >= MAX ? 0 : price(n + 1)),
    /* is the shelf open? (hooks.unlocked(): everything for sale is owned) A clutch that was started stays open. */
    open: () => n > 0 || !!(hooks.unlocked && hooks.unlocked()),
    mult: dial => (DIAL_IDS.indexOf(dial) >= 0 ? mult(n) : 1),
    /* a game's pay with the eggs in it: whole SUN, never less than it was */
    boost: (game, amount) => (PAYERS.indexOf(game) >= 0 && n > 0 ? Math.max(amount, Math.round(amount * mult(n))) : amount),
    /* buy the next one: `pay(price)` takes the SUN (and answers whether it did). Returns the new count, or 0 if it was not bought. */
    buy(pay) {
      if (n >= MAX || !E.open()) return 0;
      if (!pay(price(n + 1))) return 0;
      n++; keep();
      if (hooks.changed) hooks.changed(n);
      return n;
    },
    forget() { n = 0; keep(); }
  };
  return E;
}
