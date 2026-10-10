#!/usr/bin/env node
/* node scripts/check-eggs.mjs -- the golden sun eggs (pure Node): what they cost, what they give, that they are minor, that the shelf opens only when everything for sale is owned,
   that every game they are said to reach actually asks for them, and that a game with none plays as it always did. */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createEggs, MAX, PER_EGG, DIALS, DIAL_IDS, PAYERS, price, totalPrice, mult, percent, allBought } from '../kernel/eggs_core.js';
import { FRAMES, LOGOS, CURSORS, SCHEMES, POTS, SPECIES, WALLS, CRAYON, GARAGE, DRINKS, ELEPHANT, forSale } from '../kernel/cos_data.js';

let bad = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL ' + m); } };
const mem = () => { let v = null; return { get: () => v, set: s => { v = s; } }; };

/* what an egg is */
ok(MAX === 40 && PER_EGG === 0.5, 'forty eggs, half a per cent each');
ok(mult(0) === 1 && mult(1) === 1.005 && mult(MAX) === 1.2 && mult(MAX + 10) === 1.2 && mult(-3) === 1, 'a clutch is worth up to a fifth and never less than nothing');
ok(percent(MAX) <= 20, 'minor: a full clutch is at most +20%');
ok(price(1) === 4820 && price(MAX) === 4000 + 800 * 40 + 20 * 1600, 'the first costs 4,820, the fortieth ' + price(MAX));
let up = true; for (let i = 2; i <= MAX; i++) if (price(i) <= price(i - 1)) up = false;
ok(up, 'each is dearer than the last');
const all = totalPrice(1, MAX);
ok(all > 800000 && all < 2000000, 'a whole clutch is ' + all + ' SUN: a long road, not an afternoon');
ok(new Set(DIAL_IDS).size === DIAL_IDS.length && DIAL_IDS.includes('pay'), 'the dials are different');
ok(DIALS.every(d => d.name === d.name.toUpperCase() && d.text.length > 10), 'every dial says who it is for and what it does');

/* the engine */
{
  const io = mem(); let changed = 0, open = false;
  const E = createEggs(io, { unlocked: () => open, changed: () => changed++ });
  ok(E.count() === 0 && !E.open() && E.mult('magen') === 1 && E.boost('solitaire', 1000) === 1000, 'none: nothing is different');
  ok(E.buy(() => true) === 0 && changed === 0, 'a closed shelf sells nothing');
  open = true; ok(E.open(), 'the shelf is open when everything is bought');
  ok(E.buy(() => false) === 0 && E.count() === 0, 'an egg that is not paid for is not given');
  let paid = null;
  ok(E.buy(p => { paid = p; return true; }) === 1 && paid === price(1) && E.count() === 1 && changed === 1, 'the first is bought at its price');
  ok(E.mult('magen') === 1.005 && E.mult('nope') === 1, 'it is half a per cent of a real dial and nothing of a made-up one');
  ok(E.boost('solitaire', 1000) === 1005 && E.boost('garden', 1000) === 1000 && E.boost('trophy', 1000) === 1000, 'it raises what a game pays, but not the garden\'s (its own dial) and not a trophy\'s');
  ok(E.boost('holyc', 10) === 10 && E.boost('holyc', 400) === 402, 'whole SUN, and never less than it was');
  open = false; ok(E.open(), 'a clutch that was started stays open');
  for (let i = 1; i < MAX; i++) E.buy(() => true);
  ok(E.count() === MAX && E.full() && E.next() === 0 && E.buy(() => true) === 0, 'forty, and no more');
  const E2 = createEggs({ get: io.get, set: io.set }, {});
  ok(E2.count() === MAX, 'they are remembered');
  const E3 = createEggs({ get: () => '{"v":1,"n":9999}', set: () => {} }, {}); ok(E3.count() === MAX, 'a damaged save cannot hold more than there are');
  const E4 = createEggs({ get: () => 'not json', set: () => {} }, {}); ok(E4.count() === 0, 'a save that will not read is none');
}

/* the shelf opens when everything for sale is owned, and not before */
{
  const lists = { frame: FRAMES, logo: LOGOS, cursor: CURSORS, scheme: SCHEMES, pot: POTS, seed: SPECIES, wall: WALLS, crayon: CRAYON, garage: GARAGE, drink: DRINKS, elephant: ELEPHANT };
  const owned = new Set();
  const has = (c, id) => owned.has(c + ':' + id);
  ok(!allBought(lists, has, forSale), 'with nothing owned the shelf is shut');
  let last = null;
  Object.keys(lists).forEach(c => forSale(lists[c]).forEach(it => { owned.add(c + ':' + it.id); last = c + ':' + it.id; }));
  ok(allBought(lists, has, forSale), 'with everything for sale owned it is open');
  owned.delete(last); ok(!allBought(lists, has, forSale), 'one short and it is shut');
  /* what only a trophy or the credits give is not asked for */
  const asked = Object.keys(lists).reduce((a, c) => a + forSale(lists[c]).length, 0), all2 = Object.keys(lists).reduce((a, c) => a + lists[c].length, 0);
  ok(asked < all2 && asked > 100, 'what is asked for (' + asked + ') leaves out what is only earned (' + (all2 - asked) + ')');
}

/* every game it is said to reach asks for it */
{
  const root = new URL('..', import.meta.url).pathname, files = [];
  (function walk(d) { for (const f of readdirSync(d)) { if (['node_modules', '.git', 'dist', 'build', 'vendor', 'assets', 'docs'].includes(f)) continue; const p = join(d, f), s = statSync(p); if (s.isDirectory()) walk(p); else if (/\.js$/.test(f) && !/_ext\.js$|_check\.js$/.test(f)) files.push([p.slice(root.length), readFileSync(p, 'utf8')]); } })(root + 'apps');
  const src = files.map(f => f[1]).join('\n');
  PAYERS.forEach(g => ok(new RegExp("game: '" + g + "'").test(src), 'the ' + g + ' pay passes its game to Economy.earn'));
  ['magen', 'garden', 'sweeper', 'bekkedal'].forEach(d => ok(new RegExp("mult\\('" + d + "'\\)").test(src), 'a ' + d + ' dial is read where it is used'));
  const econ = readFileSync(new URL('../kernel/economy.js', import.meta.url), 'utf8');
  ok(/Eggs\.boost\(o\.game/.test(econ), 'the till asks the eggs');
}
console.log(bad ? bad + ' FAILED of ' + n : 'eggs: all ' + n + ' ok');
process.exit(bad ? 1 : 0);
