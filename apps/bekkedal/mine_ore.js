/* Bekkedal — what is in a floor of the descent, and what the old crew left
 * on it.
 *
 * The second sibling of `mine.js`, for the 300-line rule the way
 * `mine_carve.js` is the first and the way `decor_wild.js` is one of
 * `decor.js` — not a second organising principle. `mine_carve.js` cuts the
 * rock, `mine.js` decides what kind of floor this is, and this decides what is
 * *in* it: which faces of the rock carry ore, and which squares carry the
 * evidence that people once worked here.
 *
 * Both functions are handed the band they belong to and read everything else
 * out of `noise.js`'s declared `R_MINE` channels, so neither of them is a
 * decision this file makes on its own — see `mine.js`'s own header.
 *
 * The dependency runs one way and must keep doing so: `mine.js` imports this,
 * and this imports nothing back — which is why `placeVeins` is *handed* the
 * floor's map id rather than asking `mine.js` for `mineId(seed, floor)`. The
 * same rule `palette_marks.js` is split off `palette.js` under, for the same
 * reason: a cycle between two modules works right up until it does not.
 */
import { mineV, rockVar } from './noise.js';
import { oreKind } from './rock.js';
import { at, put, open, countOpen, ROCK, FLOOR, DRIFT } from './mine_carve.js';

/* ---- which faces of the rock carry ore -----------------------------------
   A candidate is a square of rock with at least one REACHABLE open square
   beside it — that is what "never places a vein inside a wall" means in
   practice, and it is checked rather than assumed (`mine_check.js`). The rim
   is excluded: a mined-out vein becomes floor, and a walkable rim square
   would be a hole in the edge of the world.

   The band's weights are a QUOTA, not a score. Scoring each candidate by its
   weight and taking the best sorts the mix flat: a floor wants twenty veins
   and has two hundred faces to choose from, so the heaviest metal fills all
   twenty and the other two never appear — `mine_check.js` measured exactly
   that, 100% iron on the top band and 100% silver on the bottom. So the count
   is split by weight first, and each metal then takes the best-scoring faces
   it has, where "best" is the square's own declared `vein` channel. The
   weight decides how much of each; the channel decides which. A metal short
   of its quota spills to the others in weight order, so a floor is never
   under its count because the rock happened not to carry much copper. */
export function placeVeins(G, id, salt, band, seen, taken) {
  const pool = { jern: [], kobber: [], solv: [] };
  for (let y = 1; y < G.h - 1; y++) for (let x = 1; x < G.w - 1; x++) {
    if (at(G, x, y) !== ROCK) continue;
    if (taken.some(t => t.x === x && t.y === y)) continue;
    let touch = 0;
    for (let d = 0; d < 4; d++) {
      const nx = x + [1, -1, 0, 0][d], ny = y + [0, 0, 1, -1][d];
      if (open(G, nx, ny) && seen[ny * G.w + nx]) touch++;
    }
    if (!touch) continue;
    const rich = band.rich > 0 && mineV(salt, x, y, 'rich') < band.rich;
    const metal = oreKind(rockVar(id, x, y), rich);
    if (!band.ore[metal]) continue;           /* this band has no use for it */
    pool[metal].push({ x: x, y: y, rich: rich, metal: metal, s: mineV(salt, x, y, 'vein') });
  }
  const order = Object.keys(pool).filter(m => band.ore[m]).sort((a, b) => band.ore[b] - band.ore[a]);
  for (const m of order) pool[m].sort((a, b) => b.s - a.s || a.y - b.y || a.x - b.x);

  /* enough to be worth the walk down, few enough that a floor is rock with
     ore in it rather than ore with rock in it */
  const want = Math.max(10, Math.min(34, 10 + Math.floor(countOpen(G) / 24)));
  const sum = order.reduce((n, m) => n + band.ore[m], 0);
  const out = [];
  const take = (m, n) => {
    for (const c of pool[m]) {
      if (n <= 0) break;
      /* never two veins orthogonally adjacent: two recesses sharing an edge
         read as one hole, and rock.js's traces have nothing to thicken across */
      if (out.some(o => Math.abs(o.x - c.x) + Math.abs(o.y - c.y) < 2)) continue;
      put(G, c.x, c.y, c.rich ? 'Q' : 'O');
      out.push(c); n--;
    }
  };
  order.forEach((m, i) => take(m, i === order.length - 1
    ? want - out.length                        /* the last one takes the remainder */
    : Math.round(want * band.ore[m] / sum)));
  /* and a second sweep in weight order for whatever a short metal left over */
  for (const m of order) if (out.length < want) take(m, want - out.length);
  return out;
}

/* ---- what the old crew left behind ---------------------------------------
   Placement only; every kind is already drawn by `decor_wild.js`, which is
   where the gruva's timbering, rail, ore cart, spoil heaps and ladder came
   from in the first place. Props never change walkability (`solid()` reads
   BEK_SOLID against the glyph and knows nothing about decor), so all of this
   sits on open squares and the player walks over it. The deeper bands carry
   less of it, which is the whole point of them: nobody worked down there. */
export function dressing(G, salt, band, up, down, hoist) {
  const out = [];
  if (up) out.push({ x: up.x, y: up.y, kind: 'ladder' });
  if (down) out.push({ x: down.x, y: down.y, kind: 'ladder' });
  if (hoist) out.push({ x: hoist.x, y: hoist.y, kind: 'heis' });
  const on = new Set(out.map(o => o.x + ',' + o.y));
  for (let y = 1; y < G.h - 1; y++) for (let x = 1; x < G.w - 1; x++) {
    if (at(G, x, y) !== DRIFT && at(G, x, y) !== FLOOR) continue;
    if (on.has(x + ',' + y)) continue;
    const p = mineV(salt, x, y, 'prop');
    if (p >= band.props.length) continue;
    if (mineV(salt, y, x, 'blok') > 1) continue;      /* thin it out */
    out.push({ x: x, y: y, kind: band.props[p] });
    on.add(x + ',' + y);
  }
  return out;
}
