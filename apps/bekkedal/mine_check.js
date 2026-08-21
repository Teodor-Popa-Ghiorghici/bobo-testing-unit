/* Bekkedal mine check — `node apps/bekkedal/mine_check.js`
 *
 * The gruva used to be one hand-authored room, and a hand-authored room is
 * checked by looking at it. A floor of the descent (`mine.js`) is not: it is
 * carved from a seed nobody will ever see twice, and the failures that matter
 * most down there are invisible from a screenshot anyway — a ladder behind a
 * wall, a floor cut in two by a fallen block, a vein sealed inside rock you
 * can never walk to. `world_check.js` asserts that the eleven authored maps
 * join up; this asks the same of the ones nothing authored, four hundred of
 * them.
 *
 * Six families of assertion:
 *   determinism  — the same (seed, floor) gives byte-identical rows here and
 *                  in a second process. The save carries the seed and never
 *                  the rows, so a carve that drifted would put the player on a
 *                  square the save calls a corridor and the map calls stone;
 *   shape        — rectangular, never under one screen, a solid rim that stays
 *                  solid once every vein in it is mined out, and not one glyph
 *                  outside the six the gruva already draws — which is what
 *                  keeps surface.js, rock.js and the light pass working
 *                  without knowing the mine exists;
 *   connectivity — every walkable square reachable from the one you arrive on.
 *                  Not "the ladder is reachable" — everything, because a vein
 *                  you can see and cannot walk to is the same bug smaller;
 *   the shafts   — up and down on every floor, a hoist on the stations and
 *                  only there, each a genuine dead end (a shaft you cross in
 *                  passing is this game's only possible fail state), each
 *                  landing somewhere you can stand on the floor it names,
 *                  with the way back at the ladder you left by;
 *   the ore      — a viable count on every floor, never sealed in rock, never
 *                  on a shaft, never two sharing an edge, and the mix moving
 *                  toward silver band by band;
 *   viability    — room to walk, ore to swing at, a way out and a way further
 *                  down, on all four hundred.
 *
 * Reads mine.js/mine_carve.js/mine_ore.js/noise.js/rock.js directly — no DOM,
 * no mounted app, no canvas. Families 5 and 6 live in `mine_check_ore.js`
 * for the 300-line rule; this is still the one command that runs all six.
 */
import { mineFloor, mineId, floorOf, isMineId, isStation, MINE_STATION, MINE_MAX,
         mineClearCache } from './mine.js';
import { oreAndViability } from './mine_check_ore.js';
import { BEK_MIN_COLS, BEK_MIN_ROWS, BEK_SOLID, BEK_MINE_MOUTH, BEK_MAPS } from './data.js';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const HERE = fileURLToPath(import.meta.url);
/* `ok` prints on success as well as on failure — the one place this file
   departs from quest_check.js's quieter shape. Nothing in a generated floor is
   visible, so a reader has to be able to see that four hundred of them really
   were flood-filled, and what the mix came out at. */
let fails = 0, checks = 0;
const ok = (cond, label, detail) => {
  checks++;
  if (cond) { console.log('OK   ' + label.padEnd(52) + (detail || '')); return true; }
  fails++; console.log('FAIL ' + label.padEnd(52) + (detail || ''));
  return false;
};

/* ---- the sample ----------------------------------------------------------
   Sixteen seeds across floors 1-25 is four hundred floors: enough that a
   one-in-two-hundred carve — the kind a hand-played descent hits in its second
   week and can never reproduce — turns up here every run instead. The seeds
   are spread rather than 0..15, because a real one comes out of
   Math.random(). */
const SEEDS = [];
for (let i = 0; i < 16; i++) SEEDS.push((Math.imul(i + 1, 2654435761) ^ 0x5bf03635) >>> 0);
const FLOORS = [];
for (let f = 1; f <= 25; f++) FLOORS.push(f);
const GLYPHS = 'Mg.OQ^';                      /* and nothing else, ever */

const every = fn => {
  const bad = [];
  for (const seed of SEEDS) for (const f of FLOORS) {
    const r = fn(mineFloor(seed, f), seed, f);
    if (r) bad.push('seed ' + seed + ' floor ' + f + ': ' + r);
  }
  return bad;
};
const show = (bad, n) => bad.slice(0, n || 3).join('; ') + (bad.length > (n || 3) ? ' … (+' + (bad.length - (n || 3)) + ')' : '');
const N = SEEDS.length * FLOORS.length;
/* the same questions index.js asks, against a generated floor's own rows */
const at = (d, x, y) => (d.rows[y] !== undefined && x >= 0 && x < d.rows[y].length) ? d.rows[y].charAt(x) : '';
const walk = (d, x, y) => { const c = at(d, x, y); return !!c && BEK_SOLID.indexOf(c) < 0; };
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function fill(d, sx, sy) {
  const W = d.rows[0].length, H = d.rows.length, seen = new Set();
  if (!walk(d, sx, sy)) return seen;
  const q = [[sx, sy]]; seen.add(sy * W + sx);
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      if (seen.has(ny * W + nx) || !walk(d, nx, ny)) continue;
      seen.add(ny * W + nx); q.push([nx, ny]);
    }
  }
  return seen;
}
const digest = d => d.rows.join('|') + '#' + d.exits.map(e => e.x + ',' + e.y + '>' + e.to + '@' + e.tx + ',' + e.ty).join(';');

/* one number for the whole sample, so the child below has something to
   compare that is not four hundred maps of text on a pipe */
const wholeDigest = () => {
  let all = '';
  for (const seed of SEEDS) for (const f of FLOORS) all += digest(mineFloor(seed, f));
  let h = 0;
  for (let i = 0; i < all.length; i++) h = (Math.imul(h, 31) + all.charCodeAt(i)) | 0;
  return String(h >>> 0);
};
/* the child prints that and nothing else — before any of the output below */
if (process.argv[2] === '--child') { process.stdout.write(wholeDigest()); process.exit(0); }

console.log('\nBekkedal mine — ' + N + ' generated floors (' + SEEDS.length +
            ' seeds x floors 1-' + FLOORS[FLOORS.length - 1] + ')');

/* ---- 1. determinism ------------------------------------------------------
   A run saves its seed and its floor number and the rows are recomputed, so
   "the same seed gives the same floor" is not a nicety — it is the entire
   reason that is allowed to be the save format. */
console.log('\n-- determinism --');
{
  const first = new Map();
  for (const seed of SEEDS) for (const f of FLOORS) first.set(seed + ':' + f, digest(mineFloor(seed, f)));
  /* again, in this process, with the memo cleared underneath it */
  mineClearCache();
  const drift = [];
  for (const seed of SEEDS) for (const f of FLOORS) {
    const k = seed + ':' + f;
    if (digest(mineFloor(seed, f)) !== first.get(k)) drift.push(k);
  }
  ok(drift.length === 0, 'a floor is the same floor when it is rebuilt', drift.length ? show(drift) : N + ' floors, memo cleared between');

  const out = execFileSync(process.execPath, [HERE, '--child'], { encoding: 'utf8' }).trim();
  const here = wholeDigest();
  ok(out === here, 'a second process generates the same valley of rock',
     out === here ? 'digest ' + here + ' over ' + N + ' floors' : 'child ' + out + ' vs ' + here);
}

/* ---- 2. shape ------------------------------------------------------------ */
console.log('\n-- shape --');
{
  const ragged = every(d => {
    const W = d.rows[0].length;
    if (d.rows.some(r => r.length !== W)) return 'ragged rows';
    if (W < BEK_MIN_COLS || d.rows.length < BEK_MIN_ROWS) return 'only ' + W + 'x' + d.rows.length;
    return null;
  });
  ok(ragged.length === 0, 'rectangular, and never under one screen', ragged.length ? show(ragged) :
     'all ' + N + ', smallest ' + Math.min(...SEEDS.flatMap(s => FLOORS.map(f => mineFloor(s, f).rows[0].length))) + ' cols');

  const alien = every(d => {
    for (const row of d.rows) for (const c of row) if (GLYPHS.indexOf(c) < 0) return 'glyph ' + JSON.stringify(c);
    return null;
  });
  ok(alien.length === 0, 'only glyphs the gruva already draws', alien.length ? show(alien) : JSON.stringify(GLYPHS) + ' over ' + N + ' floors');

  /* The rim, and the rim AFTER every vein on it has been mined out — `act()`
     turns a mined vein into floor, so a vein in the border would open a
     walkable square on the edge of the world. */
  const leak = every(d => {
    const W = d.rows[0].length, H = d.rows.length;
    for (let x = 0; x < W; x++) if (at(d, x, 0) !== 'M' || at(d, x, H - 1) !== 'M') return 'top/bottom rim at x=' + x;
    for (let y = 0; y < H; y++) if (at(d, 0, y) !== 'M' || at(d, W - 1, y) !== 'M') return 'left/right rim at y=' + y;
    return null;
  });
  ok(leak.length === 0, 'the rim is solid rock, and stays solid when mined', leak.length ? show(leak) : N + ' floors walked');
}

/* ---- 3. connectivity ----------------------------------------------------- */
console.log('\n-- connectivity --');
{
  let worstArea = 1e9, worstAt = '';
  const split = every((d, seed, f) => {
    const W = d.rows[0].length, H = d.rows.length;
    const home = d.home;
    if (!walk(d, home[0], home[1])) return 'the square you arrive on is ' + JSON.stringify(at(d, home[0], home[1]));
    const seen = fill(d, home[0], home[1]);
    let total = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (walk(d, x, y)) total++;
    if (total < worstArea) { worstArea = total; worstAt = 'seed ' + seed + ' floor ' + f; }
    if (seen.size !== total) return (total - seen.size) + ' of ' + total + ' walkable squares cut off';
    return null;
  });
  ok(split.length === 0, 'every floor is one walkable piece', split.length ? show(split) :
     N + ' floors, smallest ' + worstArea + ' squares (' + worstAt + ')');

  /* Stated separately although it follows from the one above, because it is
     the failure that ends a run in the dark rather than looking untidy. */
  const stranded = every(d => {
    const W = d.rows[0].length;
    const seen = fill(d, d.home[0], d.home[1]);
    for (const e of d.exits) if (!seen.has(e.y * W + e.x)) return 'the ' + e.to + ' shaft at ' + e.x + ',' + e.y + ' cannot be walked to';
    return null;
  });
  ok(stranded.length === 0, 'every shaft is reachable from where you arrive', stranded.length ? show(stranded) : N + ' floors, ' +
     SEEDS.reduce((n, s) => n + FLOORS.reduce((m, f) => m + mineFloor(s, f).exits.length, 0), 0) + ' shafts');
}

/* ---- 4. the shafts ------------------------------------------------------- */
console.log('\n-- the shafts --');
{
  const wrong = every((d, seed, f) => {
    const want = 1 + (f < MINE_MAX ? 1 : 0) + (isStation(f) ? 1 : 0);
    if (d.exits.length !== want) return d.exits.length + ' shafts, wanted ' + want;
    const up = d.exits.filter(e => f <= 1 ? e.to === 'gruva' : floorOf(e.to) === f - 1);
    const down = d.exits.filter(e => floorOf(e.to) === f + 1);
    const hoist = d.exits.filter(e => e.to === 'gruva');
    if (up.length !== 1) return 'no single way up';
    if (down.length !== (f < MINE_MAX ? 1 : 0)) return 'the way down is wrong';
    if (hoist.length !== (isStation(f) ? 1 : 0) + (f <= 1 ? 1 : 0)) return 'a hoist where there should not be one';
    const seenAt = new Set(d.exits.map(e => e.x + ',' + e.y));
    if (seenAt.size !== d.exits.length) return 'two shafts on one square';
    return null;
  });
  ok(wrong.length === 0, 'up and down everywhere, a hoist only on stations',
     wrong.length ? show(wrong) : 'stations every ' + MINE_STATION + ', bottom at ' + MINE_MAX);

  /* The dead end, which is what keeps the descent from acquiring a fail
     state: a shaft you can cross in passing is a shaft you fall down by
     accident, so each has exactly one way on and it is the way off. */
  const crossable = every(d => {
    for (const e of d.exits) {
      let n = 0;
      for (const [dx, dy] of DIRS) if (walk(d, e.x + dx, e.y + dy)) n++;
      if (n !== 1) return 'the shaft at ' + e.x + ',' + e.y + ' has ' + n + ' ways onto it';
      if (!walk(d, e.x, e.y)) return 'the shaft at ' + e.x + ',' + e.y + ' is solid';
    }
    return null;
  });
  ok(crossable.length === 0, 'no shaft can be crossed in passing', crossable.length ? show(crossable) :
     'every shaft on ' + N + ' floors is a dead end');

  /* where it sets you down, on the floor it actually names — including the
     one that names an authored map */
  const landing = every((d, seed, f) => {
    for (const e of d.exits) {
      if (e.to === 'gruva') {
        const g = BEK_MAPS.gruva;
        const c = g.rows[e.ty] ? g.rows[e.ty].charAt(e.tx) : '';
        if (!c || BEK_SOLID.indexOf(c) >= 0) return 'the hoist comes out on gruva ' + JSON.stringify(c);
        continue;
      }
      const n = mineFloor(seed, floorOf(e.to));
      if (!walk(n, e.tx, e.ty)) return e.to + ' lands on ' + JSON.stringify(at(n, e.tx, e.ty)) + ' at ' + e.tx + ',' + e.ty;
      /* and not on that floor's own shaft, or you arrive already falling */
      if (n.exits.some(q => q.x === e.tx && q.y === e.ty)) return e.to + ' lands on its own shaft';
    }
    return null;
  });
  ok(landing.length === 0, 'every shaft sets you down somewhere you can stand', landing.length ? show(landing) :
     N + ' floors, both sides checked');

  /* the way back. Floor n's ladder down and floor n+1's ladder up have to be
     the two ends of one ladder, or the descent is one-way. */
  const oneway = every((d, seed, f) => {
    for (const e of d.exits) {
      if (e.to === 'gruva' || floorOf(e.to) !== f + 1) continue;
      const n = mineFloor(seed, floorOf(e.to));
      const back = n.exits.filter(q => floorOf(q.to) === f);
      if (!back.length) return 'floor ' + (f + 1) + ' has no way back up';
      /* it must set you down beside the ladder you left by */
      let touching = false;
      for (const [dx, dy] of DIRS) if (back[0].tx === e.x + dx && back[0].ty === e.y + dy) touching = true;
      if (!touching) return 'the way back from ' + (f + 1) + ' does not come out at the ladder';
      /* and you must arrive beside theirs */
      let mine2 = false;
      for (const [dx, dy] of DIRS) if (e.tx === back[0].x + dx && e.ty === back[0].y + dy) mine2 = true;
      if (!mine2) return 'going down does not arrive at floor ' + (f + 1) + "'s own ladder";
    }
    return null;
  });
  ok(oneway.length === 0, 'a ladder has two ends', oneway.length ? show(oneway) : 'every floor pair in the sample');

  ok(isMineId(mineId(7, 3)) && floorOf(mineId(7, 3)) === 3 && !isMineId('gruva') && floorOf('gruva') === 0,
     'a floor id says which floor it is', mineId(7, 3));
  const mouthOK = (() => {
    const g = BEK_MAPS.gruva, c = g.rows[BEK_MINE_MOUTH.y].charAt(BEK_MINE_MOUTH.x);
    if (BEK_SOLID.indexOf(c) >= 0) return 'the mouth is ' + JSON.stringify(c);
    let n = 0;
    for (const [dx, dy] of DIRS) {
      const q = g.rows[BEK_MINE_MOUTH.y + dy];
      const t = q ? q.charAt(BEK_MINE_MOUTH.x + dx) : '';
      if (t && BEK_SOLID.indexOf(t) < 0) n++;
    }
    return n === 1 ? null : 'the mouth has ' + n + ' ways onto it';
  })();
  ok(!mouthOK, 'the mouth in the gruva is an alcove, not a corridor', mouthOK ||
     'at ' + BEK_MINE_MOUTH.x + ',' + BEK_MINE_MOUTH.y + ', beside the rich vein at 11,23');
}
/* ---- 5 and 6: the ore, and viability ------------------------------------
   In `mine_check_ore.js`, beside `mine_ore.js` which is what they are about,
   and for the same 300-line reason. One check and one command either way. */
oreAndViability({ ok, every, show, at, walk, fill, DIRS, mineFloor, SEEDS, FLOORS, N });


console.log('\n' + (fails ? fails + ' of ' + checks + ' mine checks FAILED' : 'All ' + checks + ' mine checks pass.') + '\n');
process.exit(fails ? 1 : 0);

