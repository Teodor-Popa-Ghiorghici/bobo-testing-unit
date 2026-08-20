/* Bekkedal world check — `node apps/bekkedal/world_check.js`
 *
 * The valley stopped being eleven rooms reached from a menu and became
 * somewhere you walk, and walking is a property of the whole world rather
 * than of any one map. `layout_check.js` already asserts that each map is
 * rectangular and that its camera clamps to its own size; what it cannot see
 * is whether the maps join up.
 *
 * Four families of assertion, in the order the world breaks if you get them
 * wrong:
 *   seams   — every exit sits on a rim square you can stand on, lands on a
 *             square you can stand on, and has a partner that brings you
 *             back to where you left. A one-way seam is a hole in the world;
 *   walking — every walkable square of a map is reachable from every other
 *             one, and every outdoor map is reachable from the farm on foot
 *             (or, for the fjord, in the boat) without opening the menu;
 *   standing— nobody and nothing that is placed by coordinate — the eight
 *             who talk, the goats, the room props, the pens and the field
 *             expansions, the finished house, the travel menu's own landing
 *             squares — stands in a wall or on the water;
 *   menu    — the travel list is down to the two places up the mountain.
 */
import { BEK_MAPS, BEK_SOLID, BEK_NPCS, BEK_GOATS, BEK_DECOR, BEK_HOUSE,
         BEK_FARM_PLOTS, BEK_BARN_PLOT, BEK_BARN_PLOT2, BEK_BARN_SLOTS,
         BEK_BARN_SLOTS2, mapCols, mapRows } from './data.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
let fails = 0, checks = 0;
const ok = (cond, label, detail) => {
  checks++;
  if (cond) return true;
  fails++; console.log('FAIL ' + label + (detail ? '   ' + detail : ''));
  return false;
};
const pass = (label, detail) => { checks++; console.log('OK   ' + label.padEnd(52) + (detail || '')); };

const ids = Object.keys(BEK_MAPS);
const outdoor = ids.filter(id => !BEK_MAPS[id].inside);
const at = (mp, x, y) => {
  const m = BEK_MAPS[mp];
  return m && m.rows[y] !== undefined && x >= 0 && x < m.rows[y].length ? m.rows[y].charAt(x) : '';
};
/* the same question solid() asks in index.js, against the base rows: a door
   is knocked on rather than walked through, and the dead margin is nothing */
const walk = (mp, x, y) => { const c = at(mp, x, y); return !!c && c !== 'D' && BEK_SOLID.indexOf(c) < 0; };
const onRim = (mp, x, y) => x === 0 || y === 0 || x === mapCols(mp) - 1 || y === mapRows(mp) - 1;
/* the square just inside the rim square (x, y) — where a seam sets you down */
const inward = (mp, x, y) => x === 0 ? [1, y] : y === 0 ? [x, 1]
  : x === mapCols(mp) - 1 ? [mapCols(mp) - 2, y] : [x, mapRows(mp) - 2];

/* ---- 1. the seams -------------------------------------------------------- */
console.log('\n-- seams --');
let rimBad = 0, standBad = 0, landBad = 0, pairBad = 0, gateBad = 0, bounceBad = 0;
const exitsOf = id => BEK_MAPS[id].exits || [];
for (const id of ids) {
  for (const e of exitsOf(id)) {
    if (!BEK_MAPS[id].inside && !onRim(id, e.x, e.y)) { rimBad++; console.log('  ' + id + ' exit not on the rim at ' + e.x + ',' + e.y); }
    /* Outdoors an exit is walked onto; indoors it is the door itself, which
       is solid and knocked on (act()'s 'D' branch), so what has to be true
       there is that you can stand in front of it. */
    const reachable = BEK_MAPS[id].inside
      ? [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => walk(id, e.x + dx, e.y + dy))
      : walk(id, e.x, e.y);
    if (!reachable) { standBad++; console.log('  ' + id + ' exit at ' + e.x + ',' + e.y + ' is ' + JSON.stringify(at(id, e.x, e.y)) + ', which you can neither step onto nor stand in front of'); }
    if (!walk(e.to, e.tx, e.ty)) { landBad++; console.log('  ' + id + ' -> ' + e.to + ' lands on ' + JSON.stringify(at(e.to, e.tx, e.ty)) + ' at ' + e.tx + ',' + e.ty); }
    if (!BEK_MAPS[e.to].inside && exitsOf(e.to).some(r => r.x === e.tx && r.y === e.ty)) { bounceBad++; console.log('  ' + id + ' -> ' + e.to + ' lands on ' + e.to + "'s own exit tile"); }
    /* the partner: the way back, landing just inside the rim we left by */
    if (BEK_MAPS[id].inside || BEK_MAPS[e.to].inside) continue;
    const [ix, iy] = inward(id, e.x, e.y);
    const back = exitsOf(e.to).filter(r => r.to === id && r.tx === ix && r.ty === iy);
    if (!back.length) { pairBad++; console.log('  ' + id + ' -> ' + e.to + ' at ' + e.x + ',' + e.y + ' has no way back'); continue; }
    if (!back.some(r => { const [jx, jy] = inward(e.to, r.x, r.y); return jx === e.tx && jy === e.ty; })) {
      pairBad++; console.log('  ' + id + ' <-> ' + e.to + ' seam is crossed at ' + e.x + ',' + e.y);
    }
    /* the wind and the dark are reasons not to go up and in, never reasons
       you cannot come back down and out */
    if (e.need && back.every(r => r.need)) { gateBad++; console.log('  ' + e.to + ' -> ' + id + ' is gated on the way back'); }
  }
}
ok(rimBad === 0, 'every outdoor exit sits on the rim of its map', rimBad + ' off the rim');
ok(standBad === 0, 'every exit tile is a square you can step onto', standBad + ' unreachable');
ok(landBad === 0, 'every exit lands on a square you can stand on', landBad + ' bad landings');
ok(bounceBad === 0, 'no exit lands you straight back onto another exit', bounceBad + ' bounces');
ok(pairBad === 0, 'every seam is paired, tile for tile, in both directions', pairBad + ' unpaired');
ok(gateBad === 0, 'no seam is gated on the way back', gateBad + ' gated returns');
const runs = outdoor.reduce((a, id) => a + exitsOf(id).length, 0);
pass('the seams', runs + ' exit tiles over ' + outdoor.length + ' outdoor maps');

/* ---- 2. walking ---------------------------------------------------------- */
console.log('\n-- walking --');
/* one flood fill per map: every square you may stand on has to be reachable
   from every other, or there is a pocket of map nobody will ever see */
function flood(id) {
  const cols = mapCols(id), rows = mapRows(id), seen = new Set();
  let start = null;
  for (let y = 0; y < rows && !start; y++) for (let x = 0; x < cols; x++) if (walk(id, x, y)) { start = [x, y]; break; }
  if (!start) return { seen, total: 0 };
  const q = [start]; seen.add(start[0] + ',' + start[1]);
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
      if (seen.has(k) || !walk(id, nx, ny)) continue;
      seen.add(k); q.push([nx, ny]);
    }
  }
  let total = 0;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (walk(id, x, y)) total++;
  return { seen, total };
}
const REACH = {};
let islandBad = 0;
for (const id of ids) {
  const f = flood(id); REACH[id] = f.seen;
  if (f.seen.size !== f.total) { islandBad++; console.log('  ' + id + ': ' + (f.total - f.seen.size) + ' of ' + f.total + ' walkable squares are cut off'); }
}
ok(islandBad === 0, 'every map is one walkable piece', islandBad + ' maps with islands');

/* the valley as a graph: seams and the boat, never the travel menu */
const seen = new Set(['farm']), queue = ['farm'];
while (queue.length) {
  const id = queue.pop();
  const links = exitsOf(id).map(e => e.to);
  if (BEK_MAPS[id].door) links.push(BEK_MAPS[id].door.to);
  if (BEK_MAPS[id].boat) links.push(BEK_MAPS[id].boat.to);
  /* the house you build has no `door` on the map: it is the BEK_HOUSE
     overlay's own 'D', which doorTravel() answers as a special case */
  if (id === 'lake' && BEK_HOUSE.some(r => r.indexOf('D') >= 0)) links.push('lakehouse');
  for (const to of links) if (BEK_MAPS[to] && !seen.has(to)) { seen.add(to); queue.push(to); }
}
const stranded = ids.filter(id => !seen.has(id));
ok(stranded.length === 0, 'every place is reached from the farm without the menu',
   stranded.length ? stranded.join(', ') : ids.length + ' places, on foot and in the boat');
/* and the seam tiles themselves are reachable from inside the map they leave */
let sealedBad = 0;
for (const id of ids) for (const e of exitsOf(id)) {
  if (BEK_MAPS[id].inside) continue;                 /* a door, checked below */
  if (!REACH[id].has(e.x + ',' + e.y)) { sealedBad++; console.log('  ' + id + ': the exit at ' + e.x + ',' + e.y + ' cannot be walked to'); }
}
ok(sealedBad === 0, 'every exit can be walked to from inside its own map', sealedBad + ' sealed off');
/* and the reverse of the same rule: a square on the rim you can stand on and
   that is *not* an exit is an opening in the world with nothing behind it —
   walk into it and the move is simply refused, which reads as a broken seam */
let holeBad = 0;
for (const id of outdoor) {
  const cols = mapCols(id), rows = mapRows(id);
  const ex = new Set(exitsOf(id).map(e => e.x + ',' + e.y));
  const rimTiles = [];
  for (let x = 0; x < cols; x++) rimTiles.push([x, 0], [x, rows - 1]);
  for (let y = 0; y < rows; y++) rimTiles.push([0, y], [cols - 1, y]);
  for (const [x, y] of rimTiles)
    if (walk(id, x, y) && !ex.has(x + ',' + y)) { holeBad++; console.log('  ' + id + ': ' + JSON.stringify(at(id, x, y)) + ' on the rim at ' + x + ',' + y + ' leads nowhere'); }
}
ok(holeBad === 0, 'no opening in the world edge that is not a seam', holeBad + ' holes');

/* a door is solid, so what has to be reachable is the square you knock from */
let doorBad = 0;
for (const id of ids) {
  const d = BEK_MAPS[id].door;
  const doors = [];
  if (d) doors.push([d.x, d.y]);
  for (let y = 0; y < mapRows(id); y++) for (let x = 0; x < mapCols(id); x++) if (at(id, x, y) === 'D') doors.push([x, y]);
  for (const [x, y] of doors) {
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => REACH[id].has((x + dx) + ',' + (y + dy)));
    if (!near) { doorBad++; console.log('  ' + id + ': the door at ' + x + ',' + y + ' cannot be knocked on'); }
  }
}
ok(doorBad === 0, 'every door has a square in front of it you can stand on', doorBad + ' walled-in doors');
/* the boat is stood on, not faced */
let boatBad = 0;
for (const id of ids) {
  const b = BEK_MAPS[id].boat;
  if (!b) continue;
  if (!REACH[id].has(b.x + ',' + b.y)) { boatBad++; console.log('  ' + id + ': the boat at ' + b.x + ',' + b.y + ' is not reachable'); }
  if (!walk(b.to, b.tx, b.ty)) { boatBad++; console.log('  ' + id + ': the boat lands in a wall on ' + b.to); }
}
ok(boatBad === 0, 'both ends of the boat are squares you can stand on');
pass('walking the valley', ids.map(id => id + ' ' + REACH[id].size).join(', '));

/* ---- 3. what stands where ------------------------------------------------ */
console.log('\n-- standing --');
let npcBad = 0, plugBad = 0;
for (const n of BEK_NPCS) {
  if (!REACH[n.map] || !REACH[n.map].has(n.x + ',' + n.y)) {
    npcBad++; console.log('  ' + (n.id) + ' stands on ' + JSON.stringify(at(n.map, n.x, n.y)) + ' at ' + n.map + ' ' + n.x + ',' + n.y);
    continue;
  }
  /* people are solid to the player (index.js's move()), so one standing in a
     one-tile corridor is a wall across it */
  const free = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => walk(n.map, n.x + dx, n.y + dy)).length;
  if (free < 2) { plugBad++; console.log('  ' + n.id + ' plugs the way at ' + n.map + ' ' + n.x + ',' + n.y + ' (' + free + ' ways past)'); }
  if (exitsOf(n.map).some(e => e.x === n.x && e.y === n.y)) { plugBad++; console.log('  ' + n.id + ' stands on a seam tile'); }
}
ok(npcBad === 0, 'nobody stands in a wall', npcBad + ' misplaced');
ok(plugBad === 0, 'nobody blocks the only way past', plugBad + ' blocking');
let goatBad = 0;
for (const g of BEK_GOATS) if (!walk(g.map, g.x, g.y)) { goatBad++; console.log('  goat in the rock at ' + g.map + ' ' + g.x + ',' + g.y); }
ok(goatBad === 0, 'every goat stands on ground it could graze', BEK_GOATS.length + ' goats');

/* the overlay regions: plain grass under every square, or the flag that
   turns them into soil and straw would be laying it over water and trees */
let regionBad = 0, slotBad = 0;
const REGIONS = [...BEK_FARM_PLOTS, BEK_BARN_PLOT, BEK_BARN_PLOT2];
for (const r of REGIONS)
  for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++)
    if (at('farm', x, y) !== 'g') { regionBad++; console.log('  ' + r.flag + ' covers ' + JSON.stringify(at('farm', x, y)) + ' at ' + x + ',' + y); }
ok(regionBad === 0, 'every plot and pen lies on plain farm grass', regionBad + ' squares');
for (const [slots, r] of [[BEK_BARN_SLOTS, BEK_BARN_PLOT], [BEK_BARN_SLOTS2, BEK_BARN_PLOT2]])
  for (const sl of slots)
    if (sl.x < r.x0 || sl.x > r.x1 || sl.y < r.y0 || sl.y > r.y1) { slotBad++; console.log('  slot ' + sl.x + ',' + sl.y + ' is outside ' + r.flag); }
ok(slotBad === 0, 'every animal stands inside its own pen');

/* the finished house is an overlay on the water map's own rows */
ok(BEK_HOUSE.length === mapRows('lake') && BEK_HOUSE.every(r => r.length === mapCols('lake')),
   'the house overlay is the same shape as the map it lies on',
   BEK_HOUSE[0].length + 'x' + BEK_HOUSE.length + ' over ' + mapCols('lake') + 'x' + mapRows('lake'));
let houseBad = 0, houseDoor = null;
BEK_HOUSE.forEach((row, y) => [...row].forEach((c, x) => {
  if (c === ' ') return;
  if (c === 'D') houseDoor = [x, y];
  if ('Lg'.indexOf(at('lake', x, y)) < 0) { houseBad++; console.log('  the house covers ' + JSON.stringify(at('lake', x, y)) + ' at ' + x + ',' + y); }
}));
ok(houseBad === 0, 'the house is built on the lot and the grass round it', houseBad + ' squares');
ok(houseDoor && walk('lake', houseDoor[0], houseDoor[1] + 1),
   'the house door has the lot in front of it', houseDoor ? houseDoor.join(',') : 'no door');

/* Room props are drawn over the square they name — a kettle over the hearth,
   a picture against the wall — so what matters is not that the square is
   floor but that it is inside the room at all. A prop out in the dead margin
   is a prop floating in the black. */
let decorBad = 0;
for (const [mp, list] of Object.entries(BEK_DECOR)) {
  const room = mp.replace(/_t\d+$/, '');
  for (const d of list) {
    const c = at(room, d.x, d.y);
    if (!c || c === ' ') { decorBad++; console.log('  ' + mp + ' ' + d.kind + ' at ' + d.x + ',' + d.y + ' is outside the room'); }
  }
}
ok(decorBad === 0, 'every room prop is inside the room it belongs to',
   Object.values(BEK_DECOR).reduce((a, l) => a + l.length, 0) + ' props');

/* ---- 4. the menu --------------------------------------------------------- */
console.log('\n-- the travel menu --');
const src = readFileSync(join(HERE, 'index.js'), 'utf8');
const home = /const BEK_HOME = \{([^}]*)\}/.exec(src);
ok(!!home, 'index.js still declares BEK_HOME');
const homes = home ? [...home[1].matchAll(/(\w+)\s*:\s*\[\s*(\d+)\s*,\s*(\d+)\s*\]/g)].map(m => [m[1], +m[2], +m[3]]) : [];
ok(homes.length === 2 && homes.every(h => h[0] === 'setra' || h[0] === 'vidda'),
   'the travel menu is down to the two places up the mountain', homes.map(h => h[0]).join(', ') || 'none');
let homeBad = 0;
for (const [id, x, y] of homes) if (!REACH[id] || !REACH[id].has(x + ',' + y)) { homeBad++; console.log('  the menu sets you down in a wall on ' + id); }
ok(homeBad === 0, 'the menu sets you down somewhere you can stand',
   homes.map(h => h[0] + ' ' + h[1] + ',' + h[2]).join('  '));
/* and both are still somewhere you have to walk to first, or S.disc never
   marks them and the menu never offers them */
const climbable = homes.every(([id]) => outdoor.some(o => exitsOf(o).some(e => e.to === id)));
ok(climbable, 'both are walked to before they are ever offered');

console.log('\n' + (fails ? fails + ' of ' + checks + ' checks FAILED' : 'All ' + checks + ' world checks pass.'));
process.exit(fails ? 1 : 0);
