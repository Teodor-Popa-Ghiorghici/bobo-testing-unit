/* Bekkedal tile-variation check — `node apps/bekkedal/tile_check.js`
 *
 * The terrain art asks noise.js a few questions per tile — which tuft, what
 * colour, where does the grit sit — and then draws the answers. Nothing on
 * screen can tell you whether those answers are any good: a field of grass
 * looks like a field of grass right up until you notice the same four blades
 * marching diagonally across it. That is what this script is for.
 *
 * The old field was two numbers, `(x*7+y*13)%5` and `(x*31+y*17)%7`, plus
 * `(x*5+y*3)%3` inside the fir. All three are linear in x and y, so all three
 * come back to where they started after a fixed step: at lag (6, 1) every
 * single one of them repeats, and the periodicity section below scores that
 * field at 1.0 — a perfect, total repeat — where the current one scores 0.
 *
 * Four families of assertion:
 *   determinism  — a second process, importing the module fresh, computes the
 *                  same field down to the last tuple. Terrain is never saved,
 *                  so a map that varied between reloads would simply be a
 *                  different map every time you walked into it;
 *   uniformity   — no channel favours one of its values over another, so the
 *                  rare extras stay rare and the palettes stay balanced;
 *   periodicity  — no lag within eight tiles in any direction repeats a
 *                  tile's decisions more often than chance, so nothing lays
 *                  down bands;
 *   separation   — two tiles of the same kind that make *every* decision
 *                  identically are far enough apart never to be on screen
 *                  together, or (as now) do not exist at all.
 *
 * There is a fifth, smaller section for the low-frequency fields: they are
 * supposed to agree with their neighbours — that is what makes them patches —
 * so they are held to the opposite standard from everything above.
 */
import * as N from './noise.js';
import { BEK_MAPS, mapCols, mapRows } from './data.js';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const HERE = fileURLToPath(import.meta.url);
const MAPS = Object.keys(BEK_MAPS);
const LAG = 8;                       /* how far out to look for a repeat      */
const TOL = 0.20;                    /* "within 20% of flat"                  */
const MIN_SEP = 3;                   /* tiles, between identical same-char pairs */
const MIN_PAIRS = 8;                 /* below this a lag has too few samples   */

/* ---- the field ----------------------------------------------------------- */
/* Every tile's decisions as one comparable string, or null where a tile has
   nothing to vary (the black margin outside a room, the planks of a pier). */
function fieldOf(mapId) {
  const rows = BEK_MAPS[mapId].rows, out = [];
  /* sized from the map itself, so every consumer below can walk `f` by its
     own length rather than against a grid size that no longer exists */
  const H = mapRows(mapId), W = mapCols(mapId);
  for (let y = 0; y < H; y++) {
    const line = [];
    for (let x = 0; x < W; x++) {
      const c = rows[y].charAt(x);
      const t = N.tileVariation(mapId, c, x, y);
      line.push(t ? { c: c, k: t.join(',') } : null);
    }
    out.push(line);
  }
  return out;
}

/* FNV-1a over every map's field, so two processes can be compared in one
   string rather than tuple by tuple. */
function digest() {
  let h = 0x811c9dc5;
  for (const mp of MAPS) {
    const f = fieldOf(mp);
    const s = mp + ':' + f.map(r => r.map(t => (t ? t.c + t.k : '-')).join('|')).join('/');
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/* the child process asks for nothing else */
if (process.argv.indexOf('--digest') >= 0) { process.stdout.write(digest()); process.exit(0); }

let fails = 0, checks = 0;
const ok = (cond, label, detail) => {
  checks++;
  if (cond) { console.log('OK   ' + label.padEnd(52) + (detail || '')); return true; }
  fails++; console.log('FAIL ' + label.padEnd(52) + (detail || ''));
  return false;
};

/* ---- 1. determinism ------------------------------------------------------ */
console.log('\n-- determinism --');
{
  const mine = digest();
  let theirs = '';
  try { theirs = execFileSync(process.execPath, [HERE, '--digest'], { encoding: 'utf8' }).trim(); }
  catch (e) { theirs = 'child failed: ' + (e && e.message); }
  ok(mine === theirs, 'the whole field survives a reload',
     MAPS.length + ' maps, fnv ' + mine + (mine === theirs ? '' : ' vs ' + theirs));

  /* and it is a function of position and channel alone — asking twice in one
     process must not drift either, which is what would happen if anything in
     here had quietly acquired state */
  let drift = 0;
  for (const mp of MAPS) {
    const a = fieldOf(mp), b = fieldOf(mp);
    for (let y = 0; y < a.length; y++) for (let x = 0; x < a[y].length; x++) {
      const p = a[y][x], q = b[y][x];
      if ((p === null) !== (q === null)) drift++;
      else if (p && p.k !== q.k) drift++;
    }
  }
  ok(drift === 0, 'the field is pure — same question, same answer', drift + ' tiles drifted');

  /* two maps must not be the same map: the salt is what stops the fourth
     tuft in row three being the same tuft in every valley */
  const salts = MAPS.map(N.mapSalt);
  ok(new Set(salts).size === salts.length, 'every map draws from its own channels',
     salts.length + ' maps, ' + new Set(salts).size + ' distinct salts');
}

/* ---- 2. uniformity ------------------------------------------------------- */
/* Pooled over every map's 24x15 grid rather than one map's. A single grid is
   360 samples: split nine ways that is 40 per value, where 20% is 1.6 standard
   deviations and a perfectly good hash fails about half the time. The salt
   makes each map an independent draw from the same channel, so pooling the
   eleven of them gives 3960 samples and 20% becomes a bound about the hash
   rather than a bound about the sample size. */
console.log('\n-- uniformity --');
{
  const specs = N.channels();
  const SAMPLES = MAPS.reduce((n, mp) => n + mapCols(mp) * mapRows(mp), 0);
  let worst = 0, worstName = '', over = [];
  for (const f of specs) {
    const count = new Array(f.n).fill(0);
    for (const mp of MAPS) {
      const s = N.mapSalt(mp);
      const H = mapRows(mp), W = mapCols(mp);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) count[N.hv(x, y, s + f.ch, f.n)]++;
    }
    const exp = SAMPLES / f.n;
    let dev = 0;
    for (const c of count) dev = Math.max(dev, Math.abs(c - exp) / exp);
    if (dev > worst) { worst = dev; worstName = f.name + ' (n=' + f.n + ')'; }
    if (dev > TOL) over.push(f.name + ' ' + (dev * 100).toFixed(1) + '%');
  }
  ok(over.length === 0, 'every channel is within 20% of flat',
     specs.length + ' channels over ' + SAMPLES + ' tiles, worst ' +
     (worst * 100).toFixed(1) + '% on ' + worstName + (over.length ? ' — over: ' + over.join(', ') : ''));
}

/* ---- 3. periodicity ------------------------------------------------------ */
/* For each lag, how often do two tiles of the same kind that distance apart
   agree on everything? "Chance" is that map and that glyph's own baseline:
   the rate over every same-char pair at any separation. If a lag beats twice
   its baseline, that lag is a period, and a period is a band on screen. */
console.log('\n-- periodicity --');
{
  let worst = 0, worstWhere = '', offenders = [];
  for (const mp of MAPS) {
    const f = fieldOf(mp);
    /* baseline, per glyph */
    const all = new Map();
    for (let y = 0; y < f.length; y++) for (let x = 0; x < f[y].length; x++) {
      const t = f[y][x]; if (!t) continue;
      if (!all.has(t.c)) all.set(t.c, []);
      all.get(t.c).push(t.k);
    }
    let basePairs = 0, baseSame = 0;
    for (const [, ks] of all) {
      const seen = new Map();
      for (const k of ks) seen.set(k, (seen.get(k) || 0) + 1);
      const n = ks.length;
      basePairs += n * (n - 1) / 2;
      for (const [, m] of seen) baseSame += m * (m - 1) / 2;
    }
    const chance = basePairs ? baseSame / basePairs : 0;

    for (let dy = -LAG; dy <= LAG; dy++) for (let dx = -LAG; dx <= LAG; dx++) {
      if (!dx && !dy) continue;
      let pairs = 0, same = 0;
      for (let y = 0; y < f.length; y++) for (let x = 0; x < f[y].length; x++) {
        const x2 = x + dx, y2 = y + dy;
        if (x2 < 0 || y2 < 0 || x2 >= f[y].length || y2 >= f.length) continue;
        const a = f[y][x], b = f[y2][x2];
        if (!a || !b || a.c !== b.c) continue;
        pairs++; if (a.k === b.k) same++;
      }
      if (pairs < MIN_PAIRS) continue;
      const frac = same / pairs;
      if (frac > worst) { worst = frac; worstWhere = mp + ' lag(' + dx + ',' + dy + ') ' + same + '/' + pairs; }
      if (frac > 2 * chance) offenders.push(mp + ' lag(' + dx + ',' + dy + ') ' + (frac * 100).toFixed(0) + '% vs chance ' + (chance * 100).toFixed(2) + '%');
    }
  }
  ok(offenders.length === 0, 'no lag within ' + LAG + ' tiles repeats a tile',
     (2 * LAG + 1) * (2 * LAG + 1) - 1 + ' lags x ' + MAPS.length + ' maps, worst ' +
     (worst * 100).toFixed(1) + '%' + (worstWhere ? ' at ' + worstWhere : '') +
     (offenders.length ? ' — ' + offenders.slice(0, 4).join('; ') : ''));
}

/* ---- 4. separation ------------------------------------------------------- */
/* Two tiles of the same glyph agreeing on every single decision is a repeat
   the eye can catch if they are close enough to see at once. Chebyshev
   distance, because that is what "both on screen" means on a grid. */
console.log('\n-- separation --');
{
  let globalMin = Infinity, globalWhere = '';
  const tooClose = [];
  for (const mp of MAPS) {
    const f = fieldOf(mp);
    const byTuple = new Map();
    for (let y = 0; y < f.length; y++) for (let x = 0; x < f[y].length; x++) {
      const t = f[y][x]; if (!t) continue;
      const key = t.c + '|' + t.k;
      if (!byTuple.has(key)) byTuple.set(key, []);
      byTuple.get(key).push([x, y]);
    }
    let best = Infinity, where = '';
    for (const [key, pts] of byTuple) {
      if (pts.length < 2) continue;
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const d = Math.max(Math.abs(pts[i][0] - pts[j][0]), Math.abs(pts[i][1] - pts[j][1]));
        if (d < best) { best = d; where = "'" + key.charAt(0) + "' at " + pts[i] + ' and ' + pts[j]; }
      }
    }
    console.log('     ' + mp.padEnd(12) + (best === Infinity ? 'no two tiles of a kind agree on everything' : 'closest identical pair ' + best + ' tiles apart — ' + where));
    if (best < globalMin) { globalMin = best; globalWhere = mp + ' ' + where; }
    if (best < MIN_SEP) tooClose.push(mp + ' ' + best + ' (' + where + ')');
  }
  ok(tooClose.length === 0, 'identical tiles stay ' + MIN_SEP + '+ tiles apart',
     globalMin === Infinity ? 'no identical pair on any map' : 'closest anywhere ' + globalMin + ' — ' + globalWhere);
}

/* ---- 5. the low-frequency fields ----------------------------------------- */
/* These are held to the opposite standard. A patch that changed every tile
   would not be a patch, so the thing to assert is that it *does* agree with
   its neighbours, and that it still manages to be somewhere and not
   everywhere. */
console.log('\n-- patches --');
{
  let shortest = Infinity, shortestName = '', flat = [];
  for (const name of Object.keys(N.PATCH)) {
    const { ch, period, max } = N.PATCH[name];
    let runs = 0, tiles = 0, seenLow = false, seenHigh = false;
    for (const mp of MAPS) {
      const H = mapRows(mp), W = mapCols(mp);
      for (let y = 0; y < H; y++) {
        let prev = -1;
        for (let x = 0; x < W; x++) {
          const v = N.patchAmt(mp, x, y, ch, period, max);
          if (v === 0) seenLow = true;
          if (v === max) seenHigh = true;
          if (v !== prev) { runs++; prev = v; }
          tiles++;
        }
      }
    }
    const meanRun = tiles / runs;
    if (meanRun < shortest) { shortest = meanRun; shortestName = name; }
    /* a field that is all one value everywhere is not a patch either */
    if (!seenLow || !seenHigh) flat.push(name + (seenLow ? ' never reaches full' : ' is never absent'));
  }
  ok(shortest >= 2, 'feathered patches hold across neighbouring tiles',
     'shortest mean run ' + shortest.toFixed(1) + ' tiles (' + shortestName + ')');
  ok(flat.length === 0, 'every patch is somewhere and not everywhere', flat.join('; '));

  /* the discrete ones must be flat inside a cell — that is the whole point of
     hashing the cell instead of the tile */
  let breaks = 0;
  for (const [name, ch, period] of [['MEADOW', N.LOW.MEADOW, 8], ['VEIN', N.LOW.VEIN, 4]]) {
    for (const mp of MAPS) {
      const s = N.mapSalt(mp), H = mapRows(mp), W = mapCols(mp);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const cellX = x - (x % period), cellY = y - (y % period);
        if (N.hLowV(x, y, s + ch, period, 4) !== N.hLowV(cellX, cellY, s + ch, period, 4)) breaks++;
      }
    }
  }
  ok(breaks === 0, 'discrete patches are constant inside their cell', breaks + ' tiles disagreed with their cell');
}

console.log('\n' + (fails ? fails + ' of ' + checks + ' tile checks FAILED.' : 'All ' + checks + ' tile checks pass.') + '\n');
process.exit(fails ? 1 : 0);
