/* Bekkedal — how a floor of the descent gets its shape.
 *
 * The primitives `mine.js` carves with, split off it for the 300-line rule
 * the way `decor_wild.js` is split off `decor.js` — not a second organising
 * principle. What a floor *is* (its bands, its ore, its shafts, its title)
 * is in `mine.js`; how you cut a chamber or a drift into a solid block of
 * rock is here.
 *
 * Two rules hold everything in this file together:
 *
 *   Nothing is random. Every decision comes out of `noise.js`'s declared
 *   `R_MINE` channels, read through `mineV(salt, x, y, name)`, where `salt`
 *   is `mineSalt(runSeed, floor)`. That is what makes a floor stable while
 *   you are standing on it, different next run, and reproducible in a check
 *   that never opens a browser. A `Math.random()` in here would be a floor
 *   nothing could test.
 *
 *   Connectivity is built, not hoped for. The chambers are cut in order and
 *   chamber i is joined to chamber i-1 as it is cut, so the walkable set is
 *   one piece by construction at every step. `reach()` is still run
 *   afterwards — by `mine.js` to place its shafts on squares it knows are
 *   reachable, and by `mine_check.js` to assert the thing the construction
 *   is supposed to guarantee. A generator that only *usually* connects is a
 *   generator that strands a player on floor 12 in the dark.
 *
 * A grid here is a flat array of single characters, strided by `w`. The
 * glyphs are the ones the gruva already uses and nothing else — see
 * `mine.js`'s header for why that constraint is the whole design.
 */
import { mineV } from './noise.js';

export const ROCK = 'M', FLOOR = 'g', DRIFT = '.', BLOCK = '^';

/* ---- a grid -------------------------------------------------------------- */
export function grid(w, h, fill) {
  return { w: w, h: h, c: new Array(w * h).fill(fill || ROCK) };
}
export const at = (G, x, y) => (x < 0 || y < 0 || x >= G.w || y >= G.h) ? '' : G.c[y * G.w + x];
export const put = (G, x, y, ch) => {
  /* The rim is never cut. Everything else in this file can therefore stop
     worrying about the edge of the world: a drift that wanders into the
     border simply does not get written, and `move()` in index.js never has
     to answer a question about a square off the map. */
  if (x < 1 || y < 1 || x >= G.w - 1 || y >= G.h - 1) return false;
  G.c[y * G.w + x] = ch; return true;
};
export const rows = G => {
  const out = [];
  for (let y = 0; y < G.h; y++) out.push(G.c.slice(y * G.w, y * G.w + G.w).join(''));
  return out;
};

/* Walkable means the same thing here it means to `solid()` in index.js: the
   two open glyphs, and neither of the two solid ones. Stated once. */
export const OPEN = FLOOR + DRIFT;
export const open = (G, x, y) => OPEN.indexOf(at(G, x, y)) >= 0 && at(G, x, y) !== '';

/* ---- the flood fill ------------------------------------------------------
   One piece, from one square, four-connected — the same connectivity `move()`
   walks with. Returns a Uint8Array parallel to the grid, so a caller can ask
   "is this square reachable from the entrance" in one array read rather than
   re-walking. */
export function reach(G, sx, sy) {
  const seen = new Uint8Array(G.w * G.h);
  if (!open(G, sx, sy)) return seen;
  const q = [sx, sy];
  seen[sy * G.w + sx] = 1;
  for (let i = 0; i < q.length; i += 2) {
    const x = q[i], y = q[i + 1];
    for (let d = 0; d < 4; d++) {
      const nx = x + [1, -1, 0, 0][d], ny = y + [0, 0, 1, -1][d];
      if (nx < 0 || ny < 0 || nx >= G.w || ny >= G.h) continue;
      const k = ny * G.w + nx;
      if (seen[k] || !open(G, nx, ny)) continue;
      seen[k] = 1; q.push(nx, ny);
    }
  }
  return seen;
}
export const countOpen = G => {
  let n = 0;
  for (let i = 0; i < G.c.length; i++) if (OPEN.indexOf(G.c[i]) >= 0) n++;
  return n;
};

/* ---- chambers ------------------------------------------------------------
   A chamber is cut inside its own cell of a coarse lattice, so two chambers
   can never overlap and the floor never collapses into one open hall. What
   changes with depth is only how it is *shaped*:

     square   the company's own workings — a plain rectangle, because a crew
              driving a level cuts a rectangle
     rough    the same rectangle with its corners bitten off, which is what a
              worked-out level looks like after fifty years of fall
     blob     natural rock: the rectangle is seeded off the `cave` channel and
              smoothed twice, so it comes out as a cavity rather than a room

   `i` is the chamber's index, and the size/position channels are read at
   (i, 0) — the same "indexed by something that is not a grid square" the
   seam and treeline streams already use, and declared in the same table. */
export function chamber(G, salt, i, cell, kind) {
  const cw = cell.w, chh = cell.h;
  const mw = Math.min(cw - 2, 4 + mineV(salt, i, 0, 'rw'));
  const mh = Math.min(chh - 2, 3 + mineV(salt, i, 0, 'rh'));
  const ox = cell.x + 1 + Math.floor(mineV(salt, i, 0, 'rx') * (cw - mw - 1) / 9);
  const oy = cell.y + 1 + Math.floor(mineV(salt, i, 0, 'ry') * (chh - mh - 1) / 9);
  const cut = [];
  for (let y = oy; y < oy + mh; y++) for (let x = ox; x < ox + mw; x++) {
    if (kind === 'rough') {
      /* the corners, and only the corners — a bite out of the middle of a
         wall would leave a pillar the player has to walk round for no reason */
      const cx = (x === ox || x === ox + mw - 1), cy = (y === oy || y === oy + mh - 1);
      if (cx && cy && mineV(salt, x, y, 'cave') < 9) continue;
    }
    if (kind === 'blob') {
      /* seeded, then smoothed below — a raw threshold is gravel, not a cave */
      if (mineV(salt, x, y, 'cave') < 5) continue;
    }
    if (put(G, x, y, FLOOR)) cut.push(x, y);
  }
  if (kind === 'blob') smooth(G, ox, oy, mw, mh);
  /* Wherever the shaping left nothing at all, fall back to the middle of the
     cell as a single square. A chamber with no floor in it is a chamber the
     corridor pass would drive a drift to and find sealed. */
  if (!cut.length) {
    const x = ox + (mw >> 1), y = oy + (mh >> 1);
    if (put(G, x, y, FLOOR)) cut.push(x, y);
  }
  return { x: ox + (mw >> 1), y: oy + (mh >> 1), cut: cut, x0: ox, y0: oy, w: mw, h: mh };
}

/* Two passes of the standard majority rule, bounded to the chamber's own
   rectangle so it can never reach into a drift somebody has already cut.
   Two, not five: five rounds it to an oval and every natural floor comes out
   the same shape. */
function smooth(G, ox, oy, w, h) {
  for (let pass = 0; pass < 2; pass++) {
    const was = [];
    for (let y = oy - 1; y <= oy + h; y++) for (let x = ox - 1; x <= ox + w; x++) was.push(at(G, x, y));
    let i = 0;
    for (let y = oy - 1; y <= oy + h; y++) for (let x = ox - 1; x <= ox + w; x++) {
      const here = was[i++];
      if (here !== FLOOR && here !== ROCK) continue;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const c = at(G, x + dx, y + dy);
        if (c === FLOOR || c === DRIFT) n++;
      }
      if (n >= 5) put(G, x, y, FLOOR);
      else if (n <= 2) put(G, x, y, ROCK);
    }
  }
}

/* ---- drifts --------------------------------------------------------------
   The corridor from one chamber to the next, and the one place `wander`
   earns its keep. At wander 0 this is the L-corridor a survey crew cuts: all
   the way along one axis, then all the way along the other. Above 0 the leg
   is broken into steps that lean off the straight line by up to `wander`
   tiles before closing back on the target, which is what a drift chasing a
   seam through hard rock actually does.

   It always terminates: each step reduces |dx| + |dy| by one, and the
   wander only ever moves the *cross* axis, which the following legs correct.
   `k` is a step counter so the two legs of one drift read different values of
   the same channel rather than the same one twice.

   `ch` is what the passage is made of, and it is the band's decision rather
   than this function's: a level the company drove is `.`, trodden earth cut
   by people, and a passage through natural cavity is the same `g` gravel the
   cavity itself is, because nobody cut it. On a deep floor the only `.` left
   is the alcove a ladder stands in, which is exactly right — down there the
   ladder is the only thing anybody made. */
export function drift(G, salt, ax, ay, bx, by, wander, k, ch) {
  const cut = ch || DRIFT;
  let x = ax, y = ay, n = 0;
  const step = () => { if (at(G, x, y) === ROCK) put(G, x, y, cut); };
  step();
  while ((x !== bx || y !== by) && n < 4 * (G.w + G.h)) {
    n++;
    const dx = bx - x, dy = by - y;
    /* which axis to close on: the longer one, unless the wander says lean */
    const lean = wander > 0 && mineV(salt, x + k, y, 'turn') === 0;
    const goX = Math.abs(dx) > Math.abs(dy) ? !lean : lean;
    if (goX && dx !== 0) x += dx > 0 ? 1 : -1;
    else if (dy !== 0) y += dy > 0 ? 1 : -1;
    else if (dx !== 0) x += dx > 0 ? 1 : -1;
    if (x < 1) x = 1; if (y < 1) y = 1;
    if (x > G.w - 2) x = G.w - 2; if (y > G.h - 2) y = G.h - 2;
    step();
    /* a widening, so a drift is not one tile wide for its whole length —
       a floor of nothing but single-file corridors reads as a maze */
    if (wander > 0 && mineV(salt, x, y + k, 'wob') < wander && at(G, x, y + 1) === ROCK) put(G, x, y + 1, cut);
  }
  return { x: x, y: y };
}

/* ---- the repair pass -----------------------------------------------------
   The chambers are joined as they are cut, so the walkable set is one piece
   by construction — but `smooth()` runs inside a chamber's own rectangle
   *after* the drift into it exists, and its one-tile margin can reach a
   square another cell already opened. That is a narrow window and it would
   be tempting to argue it away. Arguing is not what this file does: it finds
   every open square the entrance cannot reach and drives a drift to it, and
   `mine_check.js` then asserts over hundreds of floors that nothing is left
   over. A floor that is only *usually* connected strands a player on floor 12
   in the dark with no way to the ladder. */
export function repair(G, sx, sy, ch) {
  for (let pass = 0; pass < 8; pass++) {
    const seen = reach(G, sx, sy);
    let lost = null;
    for (let y = 1; y < G.h - 1 && !lost; y++) for (let x = 1; x < G.w - 1; x++) {
      if (open(G, x, y) && !seen[y * G.w + x]) { lost = { x: x, y: y }; break; }
    }
    if (!lost) return pass;
    drift(G, 0, lost.x, lost.y, sx, sy, 0, 0, ch);
  }
  return -1;
}

/* Would cutting this square out of the walkable set strand anything? Asked
   before a fallen block is dropped on a floor square, because "it had three
   open neighbours" is not the same as "it was not the only way through". */
export function safeToClose(G, x, y, sx, sy) {
  const was = at(G, x, y);
  const before = countOpen(G);
  G.c[y * G.w + x] = BLOCK;
  const seen = reach(G, sx, sy);
  let n = 0;
  for (let i = 0; i < seen.length; i++) if (seen[i]) n++;
  const ok = n === before - 1;
  if (!ok) G.c[y * G.w + x] = was;
  return ok;
}

/* ---- the dead-end stub ---------------------------------------------------
   Every shaft in the descent sits at the end of one of these, and that is not
   decoration: a shaft you can cross in passing is a shaft you fall down by
   accident, and this game has no fail state to fall into. A stub is one
   square cut out of solid rock with exactly one walkable orthogonal
   neighbour, so the only way onto it is to walk deliberately into it and the
   only way off is back out.

   Returns null rather than guessing if there is nowhere to put one; the
   caller widens its search. `mine_check.js` asserts the dead-end property
   directly on every generated floor, so a stub that stopped being one would
   fail there rather than in somebody's save. */
export function stub(G, seen, from, taken) {
  /* walk the reachable floor outward from `from`, so a stub is always cut off
     a square the player can actually get to */
  const order = [];
  for (let y = 1; y < G.h - 1; y++) for (let x = 1; x < G.w - 1; x++) {
    if (!seen[y * G.w + x]) continue;
    order.push({ x: x, y: y, d: Math.abs(x - from.x) + Math.abs(y - from.y) });
  }
  order.sort((a, b) => b.d - a.d || a.y - b.y || a.x - b.x);
  for (const o of order) {
    for (let d = 0; d < 4; d++) {
      const nx = o.x + [1, -1, 0, 0][d], ny = o.y + [0, 0, 1, -1][d];
      if (at(G, nx, ny) !== ROCK) continue;
      if (taken.some(t => t.x === nx && t.y === ny)) continue;
      /* solid on the other three sides, or it is a doorway and not an alcove */
      let touch = 0;
      for (let e = 0; e < 4; e++) {
        if (open(G, nx + [1, -1, 0, 0][e], ny + [0, 0, 1, -1][e])) touch++;
      }
      if (touch !== 1) continue;
      put(G, nx, ny, DRIFT);
      return { x: nx, y: ny, from: { x: o.x, y: o.y } };
    }
  }
  return null;
}
