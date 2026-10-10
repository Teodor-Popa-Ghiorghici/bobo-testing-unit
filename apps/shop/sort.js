/* HOW A SHELF IS ARRANGED (pure: no DOM, no clock; `node apps/shop/sort_check.js`).
   A shelf is Dave's own order (kernel/cos_data.js sorts every list by what it costs). The shop can lay it out another way, and can show only what you do not own yet or only what
   you do. A view is { sort, show }; `arrange(list, view, ctx)` is the list as it is to be drawn, a new array, the old one untouched.
   ctx: { has(item) -> bool owned, price(item) -> number, balance -> SUN in hand, name(item) -> what the card says (a secret you have not earned says ???) }. */
export const SORTS = [
  { id: 'shelf',   label: 'SHELF',     tip: 'DAVE\'S OWN ORDER' },
  { id: 'cheap',   label: 'CHEAPEST',  tip: 'WHAT IT COSTS, LEAST FIRST' },
  { id: 'dear',    label: 'DEAREST',   tip: 'WHAT IT COSTS, MOST FIRST' },
  { id: 'name',    label: 'A-Z',       tip: 'BY NAME' },
  { id: 'afford',  label: 'I CAN PAY', tip: 'WHAT YOU CAN PAY FOR NOW FIRST' },
  { id: 'unowned', label: 'NOT MINE',  tip: 'WHAT YOU DO NOT OWN FIRST' }
];
export const SHOWS = [
  { id: 'all',   label: 'ALL',     tip: 'EVERYTHING ON THE SHELF' },
  { id: 'tobuy', label: 'TO GET',  tip: 'ONLY WHAT YOU DO NOT OWN YET' },
  { id: 'owned', label: 'MINE',    tip: 'ONLY WHAT YOU OWN' }
];
export const DEFAULT_VIEW = { sort: 'shelf', show: 'all' };

/* a view read back from a save, or anything else, is made into one that exists */
export function clean(v) {
  const o = v && typeof v === 'object' ? v : {};
  return { sort: SORTS.some(s => s.id === o.sort) ? o.sort : DEFAULT_VIEW.sort, show: SHOWS.some(s => s.id === o.show) ? o.show : DEFAULT_VIEW.show };
}

/* what a card is worth to the sort: a thing that is not for sale at any price (a reward you have not earned) is after everything that is, and a secret's name is after the names */
const pending = (it, c) => !c.has(it) && !!(it.reward || it.earn);
const cmpName = (a, b, c) => {
  const x = c.name(a), y = c.name(b), qx = x === '???', qy = y === '???';
  if (qx !== qy) return qx ? 1 : -1;
  return x < y ? -1 : x > y ? 1 : 0;
};

export function arrange(list, view, c) {
  const v = clean(view), rows = list.map((it, i) => ({ it, i }));
  let rs = rows.filter(r => v.show === 'all' || (v.show === 'owned') === !!c.has(r.it));
  const by = {
    shelf: () => 0,
    cheap: (a, b) => (pending(a.it, c) - pending(b.it, c)) || c.price(a.it) - c.price(b.it),
    dear: (a, b) => (pending(a.it, c) - pending(b.it, c)) || c.price(b.it) - c.price(a.it),
    name: (a, b) => cmpName(a.it, b.it, c),
    /* what you can buy right now, dearest first (the best thing you can afford), then what you cannot, cheapest first (the next one to save for) */
    afford: (a, b) => {
      const ra = c.has(a.it) || pending(a.it, c) ? 2 : c.price(a.it) <= c.balance ? 0 : 1, rb = c.has(b.it) || pending(b.it, c) ? 2 : c.price(b.it) <= c.balance ? 0 : 1;
      if (ra !== rb) return ra - rb;
      return ra === 0 ? c.price(b.it) - c.price(a.it) : c.price(a.it) - c.price(b.it);
    },
    unowned: (a, b) => (!!c.has(a.it) - !!c.has(b.it))
  }[v.sort];
  rs = rs.sort((a, b) => by(a, b) || a.i - b.i);          /* ties keep the shelf's own order, so a sort never shuffles what it cannot tell apart */
  return rs.map(r => r.it);
}
