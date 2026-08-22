/* Bekkedal — whether a placement is allowed.
 *
 * Pure functions of a map definition, the placements already on it, and a
 * candidate square — same convention as `schedule.js`/`scene.js`/`spine.js`:
 * nothing here touches `S`, the DOM, or `Math.random`, so `layout_check.js`
 * can exercise it with no canvas and no mounted app. `index.js`'s `place`
 * mode is the one caller that turns an "ok" answer into a write, exactly the
 * way `spineDonate()` is the one writer `spine.js` answers questions for.
 *
 * `PLACE_BLOCKS` (`decor.js`) names the placeable kinds that are a genuine
 * barrier — a fence, a gate — and those are the only ones this module ever
 * treats as solid. Every other placed kind (all the indoor furniture, every
 * other outdoor kind) never blocks a tile, the same "decor never changes
 * walkability" rule `data.js`'s `BEK_DECOR` header states, extended to a
 * player's own placements by exception rather than by default.
 *
 * The hard requirement this exists to satisfy: a placement must never trap
 * the player. `connectivityOK` floods outward from a known-good tile (the
 * player's own square) over every tile that would still be walkable *after*
 * the candidate went down, and refuses unless every door, every mapped exit
 * and every bed on the map is still in that flood. That is stronger than
 * "the player can still get out" — it is "nothing reachable stops being
 * reachable", which is what a flood fill from a fixed point can actually
 * prove and a local check around the candidate tile alone cannot.
 */
import { BEK_SOLID } from './data.js';
import { PLACE_BLOCKS } from './decor.js';

export { PLACE_BLOCKS };

const NBRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/* Every door ('D') and bed ('b') tile on the map, plus every tile named as
   one end of a seam (`mapDef.exits`, `maps.js`) — the three things a
   placement must never cut the player off from. */
function targetsOf(mapDef) {
  const rows = mapDef.rows, cols = rows[0].length, rowsN = rows.length;
  const out = [];
  for (let y = 0; y < rowsN; y++) for (let x = 0; x < cols; x++) {
    const c = rows[y].charAt(x);
    if (c === 'D' || c === 'b') out.push(x + ',' + y);
  }
  /* mapDef.exits (maps.js) is an array of { x, y, to, tx, ty } — the seam
     tiles on *this* side, not a lookup keyed by coordinate */
  if (Array.isArray(mapDef.exits)) mapDef.exits.forEach(e => out.push(e.x + ',' + e.y));
  return out;
}

/* `placedHere` is `{ key: { x, y, kind } }`, already filtered to one map —
   see `placedForMap()` in index.js. `candidate` is an extra `{x,y}` to treat
   as blocked on top of whatever is already down (or null, to just answer
   about the state as it stands). */
export function connectivityOK(mapDef, placedHere, startX, startY, candidate) {
  const rows = mapDef.rows, cols = rows[0].length, rowsN = rows.length;
  const solidBase = (x, y) => {
    if (x < 0 || y < 0 || x >= cols || y >= rowsN) return true;
    const c = rows[y].charAt(x);
    if (c === 'D') return false;                 /* a door is a target, not a wall */
    return BEK_SOLID.indexOf(c) >= 0;
  };
  const blocked = new Set();
  Object.keys(placedHere || {}).forEach(k => {
    const rec = placedHere[k];
    if (PLACE_BLOCKS[rec.kind]) blocked.add(rec.x + ',' + rec.y);
  });
  if (candidate) blocked.add(candidate.x + ',' + candidate.y);
  const passable = (x, y) => !solidBase(x, y) && !blocked.has(x + ',' + y);
  const targets = targetsOf(mapDef);
  if (!passable(startX, startY)) return targets.length === 0;
  const seen = new Set([startX + ',' + startY]);
  const q = [[startX, startY]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of NBRS) {
      const nx = x + dx, ny = y + dy, kk = nx + ',' + ny;
      if (seen.has(kk) || !passable(nx, ny)) continue;
      seen.add(kk); q.push([nx, ny]);
    }
  }
  return targets.every(t => seen.has(t));
}

/* The full gate a placement has to clear: on the map, not a door, not solid
   ground, not the player's own square, not already holding a placed prop —
   and, only for a blocking kind, not a placement `connectivityOK` refuses. */
export function canPlace(mapDef, placedHere, startX, startY, x, y, kind) {
  const rows = mapDef.rows, cols = rows[0].length, rowsN = rows.length;
  if (x < 0 || y < 0 || x >= cols || y >= rowsN) return false;
  const c = rows[y].charAt(x);
  if (c === 'D') return false;
  if (BEK_SOLID.indexOf(c) >= 0) return false;
  if (x === startX && y === startY) return false;
  for (const k in (placedHere || {})) {
    const r = placedHere[k];
    if (r.x === x && r.y === y) return false;
  }
  if (PLACE_BLOCKS[kind] && !connectivityOK(mapDef, placedHere, startX, startY, { x, y })) return false;
  return true;
}
