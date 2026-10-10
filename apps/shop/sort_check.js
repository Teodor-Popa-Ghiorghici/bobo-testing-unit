/* node apps/shop/sort_check.js -- how Dave's shelves are arranged (pure Node): every real shelf, every sort, every filter. */
import { FRAMES, LOGOS, CURSORS, SCHEMES, POTS, SPECIES, WALLS, CRAYON, GARAGE, DRINKS, ELEPHANT, SOLITAIRE } from '../../kernel/cos_data.js';
import { SORTS, SHOWS, DEFAULT_VIEW, clean, arrange } from './sort.js';

let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL  ' + m); } };
const SHELVES = { frame: FRAMES, logo: LOGOS, cursor: CURSORS, scheme: SCHEMES, pot: POTS, seed: SPECIES, wall: WALLS, crayon: CRAYON, garage: GARAGE, drink: DRINKS, elephant: ELEPHANT, solitaire: SOLITAIRE };

/* a till where every third thing is owned, and 1,000 SUN in hand */
const till = list => {
  const own = new Set(list.filter((_, i) => i % 3 === 0).map(i => i.id));
  return { has: it => own.has(it.id), price: it => it.price || 0, balance: 1000, name: it => (it.secret && !own.has(it.id)) ? '???' : it.name };
};

ok(clean(null).sort === DEFAULT_VIEW.sort && clean({ sort: 'nonsense', show: 7 }).show === 'all' && clean({ sort: 'name', show: 'owned' }).sort === 'name', 'a view read from anywhere is made into one that exists');

Object.keys(SHELVES).forEach(k => {
  const list = SHELVES[k], c = till(list), before = list.map(i => i.id).join();
  SORTS.forEach(s => {
    const out = arrange(list, { sort: s.id, show: 'all' }, c);
    ok(out.length === list.length && new Set(out.map(i => i.id)).size === list.length, k + '/' + s.id + ': the same things, none lost, none twice');
    ok(list.map(i => i.id).join() === before, k + '/' + s.id + ': the shelf itself is not reordered');
  });
  ok(arrange(list, { sort: 'shelf', show: 'all' }, c).map(i => i.id).join() === before, k + ': SHELF is Dave\'s own order');
  const buy = arrange(list, { sort: 'shelf', show: 'tobuy' }, c), mine = arrange(list, { sort: 'shelf', show: 'owned' }, c);
  ok(buy.every(i => !c.has(i)) && mine.every(i => c.has(i)) && buy.length + mine.length === list.length, k + ': TO GET and MINE split the shelf in two');
  const cheap = arrange(list.filter(i => !i.reward && !i.earn), { sort: 'cheap', show: 'all' }, c), p = cheap.map(i => i.price || 0);
  ok(p.every((v, i) => !i || p[i - 1] <= v), k + ': CHEAPEST never goes down');
  const dear = arrange(list.filter(i => !i.reward && !i.earn), { sort: 'dear', show: 'all' }, c).map(i => i.price || 0);
  ok(dear.every((v, i) => !i || dear[i - 1] >= v), k + ': DEAREST never goes up');
  const nm = arrange(list, { sort: 'name', show: 'all' }, c).map(i => c.name(i)).filter(x => x !== '???');
  ok(nm.every((v, i) => !i || nm[i - 1] <= v), k + ': A-Z is alphabetical');
  const un = arrange(list, { sort: 'unowned', show: 'all' }, c), firstOwned = un.findIndex(i => c.has(i));
  ok(firstOwned < 0 || un.slice(firstOwned).every(i => c.has(i)), k + ': NOT MINE puts everything owned after everything that is not');
  const af = arrange(list, { sort: 'afford', show: 'all' }, c), lastPay = af.map((i, x) => !c.has(i) && !(i.reward || i.earn) && (i.price || 0) <= 1000 ? x : -1).reduce((a, b) => Math.max(a, b), -1);
  const firstNo = af.findIndex(i => !c.has(i) && !(i.reward || i.earn) && (i.price || 0) > 1000);
  ok(firstNo < 0 || lastPay < firstNo, k + ': I CAN PAY puts what you can pay for before what you cannot');
});

/* a tie keeps the shelf's order; what is not for sale goes last; a secret goes after the names */
const toy = [{ id: 'a', name: 'B', price: 5 }, { id: 'b', name: 'A', price: 5 }, { id: 'c', name: 'X', price: 1, reward: 't' }, { id: 'd', name: 'C', price: 0, secret: true, reward: 't' }, { id: 'e', name: 'D', price: 9 }];
const tc = { has: () => false, price: i => i.price, balance: 6, name: i => i.secret ? '???' : i.name };
ok(arrange(toy, { sort: 'cheap', show: 'all' }, tc).map(i => i.id).join('') === 'abedc', 'a tie keeps the shelf\'s order, and what cannot be bought comes last');
ok(arrange(toy, { sort: 'name', show: 'all' }, tc).slice(-1)[0].id === 'd', 'a secret\'s ??? goes after every name');
ok(arrange(toy, { sort: 'afford', show: 'all' }, tc).map(i => i.id).join('') === 'abedc', 'I CAN PAY: what you can pay (dearest first), then the next to save for');

console.log((fails ? 'FAIL' : 'ok') + '  - Dave\'s shelves can be arranged: ' + Object.keys(SHELVES).length + ' shelves, ' + SORTS.length + ' sorts, ' + SHOWS.length + ' filters (' + n + ' checks)');
process.exit(fails ? 1 : 0);
