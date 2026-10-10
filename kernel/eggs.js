/* window.Eggs: the machine's side of kernel/eggs_core.js. A game asks `window.Eggs.mult('magen')` (through apps/eggs_scope.js, so an app never imports this) and listens for `eggs-changed`;
   Economy.earn(n, why, { game }) asks `boost`; Dave's shop sells them (apps/shop/eggs.js) once everything else is bought. */
import { createEggs, KEY, DIALS, MAX, allBought } from './eggs_core.js';
import { Cos, COS_CATS } from './cos.js';
import { forSale } from './cos_data.js';

const io = {
  get: () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
  set: v => { try { localStorage.setItem(KEY, v); } catch (e) { /* kept for this sitting */ } }
};
const lists = () => { const o = {}; Object.keys(COS_CATS).forEach(c => { o[c] = COS_CATS[c].list; }); return o; };
const unlocked = () => { try { return allBought(lists(), (c, id) => Cos.has(c, id), forSale); } catch (e) { return false; } };
const tell = n => { try { window.dispatchEvent(new CustomEvent('eggs-changed', { detail: { n: n } })); } catch (e) { /* nobody is listening */ } };
const core = createEggs(io, { unlocked: unlocked, changed: tell });

export const Eggs = {
  count: core.count, full: core.full, next: core.next, open: core.open, mult: core.mult, boost: core.boost, unlocked: unlocked,
  max: MAX, dials: DIALS,
  /* spend the SUN: true if an egg was bought */
  buy: () => !!core.buy(p => window.Economy && window.Economy.spend(p, 'DAVE: GOLDEN SUN EGG ' + (core.count() + 1)))
};
window.Eggs = Eggs;
