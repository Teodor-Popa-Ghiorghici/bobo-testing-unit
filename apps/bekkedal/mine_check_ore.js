/* Bekkedal mine check — the two families about what is IN a floor.
 *
 * A sibling of `mine_check.js` for the 300-line rule, the way
 * `decor_wild.js` is one of `decor.js` — one check, still one command
 * (`node apps/bekkedal/mine_check.js`), split where `mine_ore.js` is split
 * off `mine.js`: that file decides what is in the rock, and these are the
 * assertions about it. The first four families — determinism, shape,
 * connectivity, the shafts — stay in `mine_check.js` beside the sample and
 * the runner, and the dependency runs one way.
 *
 * `C` is that apparatus, handed over rather than rebuilt: the same `ok`
 * counting into the same tally, the same four hundred floors, the same
 * map-reading helpers that ask exactly what `index.js` asks.
 */
import { mineGem, mineBand, mineId, mineDig, MINE_BANDS, MINE_GEM_FLOOR, MINE_MAX,
         floorOf } from './mine.js';
import { oreKind } from './rock.js';
import { rockVar } from './noise.js';

export function oreAndViability(C) {
  const { ok, every, show, at, walk, fill, DIRS, mineFloor, SEEDS, FLOORS, N } = C;

  /* ---- 5. the ore ---------------------------------------------------------- */
  console.log('\n-- the ore --');
  {
    let least = 1e9, most = 0, leastAt = '';
    const thin = every((d, seed, f) => {
      let n = 0;
      for (const row of d.rows) for (const c of row) if (c === 'O' || c === 'Q') n++;
      if (n < least) { least = n; leastAt = 'seed ' + seed + ' floor ' + f; }
      if (n > most) most = n;
      return n >= 10 ? null : 'only ' + n + ' veins';
    });
    ok(thin.length === 0, 'every floor is worth the walk down', thin.length ? show(thin) :
       least + '-' + most + ' veins a floor, thinnest ' + leastAt);

    /* "never places a vein inside a wall" — a vein with no reachable floor
       square beside it is a vein you can see through the rock and never swing
       at, which is worse than no vein at all. */
    const sealed = every(d => {
      const W = d.rows[0].length, H = d.rows.length;
      const seen = fill(d, d.home[0], d.home[1]);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const c = at(d, x, y);
        if (c !== 'O' && c !== 'Q') continue;
        let face = false;
        for (const [dx, dy] of DIRS) if (seen.has((y + dy) * W + (x + dx))) face = true;
        if (!face) return 'the vein at ' + x + ',' + y + ' is sealed in rock';
      }
      return null;
    });
    ok(sealed.length === 0, 'no vein is sealed inside the rock', sealed.length ? show(sealed) :
       'every vein on ' + N + ' floors has a face you can reach');

    const onShaft = every(d => {
      for (const e of d.exits) { const c = at(d, e.x, e.y); if (c === 'O' || c === 'Q') return 'a vein on the shaft at ' + e.x + ',' + e.y; }
      return null;
    });
    ok(onShaft.length === 0, 'no vein stands on a shaft', onShaft.length ? show(onShaft) : N + ' floors');

    /* two sharing an edge draw as one hole, and rock.js's traces have no wall
       left to thicken across — which is the whole point of them */
    const merged = every(d => {
      const W = d.rows[0].length, H = d.rows.length;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const c = at(d, x, y);
        if (c !== 'O' && c !== 'Q') continue;
        for (const [dx, dy] of [[1, 0], [0, 1]]) {
          const n = at(d, x + dx, y + dy);
          if (n === 'O' || n === 'Q') return 'veins touching at ' + x + ',' + y;
        }
      }
      return null;
    });
    ok(merged.length === 0, 'no two veins share an edge', merged.length ? show(merged) :
       'the traces always have wall to thicken across');

    /* The mix, band by band — the assertion that "depth changes what is down
       there" is a fact about the generator and not a sentence in a header. */
    const tally = MINE_BANDS.map(() => ({ jern: 0, kobber: 0, solv: 0, Q: 0, gem: 0, n: 0 }));
    for (const seed of SEEDS) for (const f of FLOORS) {
      const d = mineFloor(seed, f), t = tally[MINE_BANDS.indexOf(mineBand(f))];
      const id = mineId(seed, f);
      for (let y = 0; y < d.rows.length; y++) for (let x = 0; x < d.rows[y].length; x++) {
        const c = d.rows[y].charAt(x);
        if (c !== 'O' && c !== 'Q') continue;
        t.n++; t[oreKind(rockVar(id, x, y), c === 'Q')]++;
        if (c === 'Q') { t.Q++; if (mineGem(seed, f, x, y)) t.gem++; }
      }
    }
    const pc = (a, b) => b ? (100 * a / b).toFixed(0) + '%' : '—';
    const seen = tally.filter(t => t.n);
    let climbs = true, falls = true;
    for (let i = 1; i < seen.length; i++) {
      if (seen[i].solv / seen[i].n <= seen[i - 1].solv / seen[i - 1].n) climbs = false;
      if (seen[i].jern / seen[i].n >= seen[i - 1].jern / seen[i - 1].n) falls = false;
    }
    ok(climbs && falls, 'the mix shifts toward silver, band by band',
       MINE_BANDS.map((b, i) => b.id + ' ' + pc(tally[i].jern, tally[i].n) + '/' + pc(tally[i].kobber, tally[i].n) +
         '/' + pc(tally[i].solv, tally[i].n)).join('  ') + '  (iron/copper/silver)');

    ok(tally[0].Q === 0 && tally[MINE_BANDS.length - 1].Q > 0, 'rich veins belong to the deep bands',
       MINE_BANDS.map((b, i) => b.id + ' ' + pc(tally[i].Q, tally[i].n)).join('  '));

    /* and the one thing that is only down there */
    const early = [];
    for (const seed of SEEDS) for (const f of FLOORS) {
      if (f >= MINE_GEM_FLOOR) continue;
      const d = mineFloor(seed, f);
      for (let y = 0; y < d.rows.length; y++) for (let x = 0; x < d.rows[y].length; x++)
        if (d.rows[y].charAt(x) === 'Q' && mineGem(seed, f, x, y)) early.push('seed ' + seed + ' floor ' + f);
    }
    const deepest = tally[MINE_BANDS.length - 1];
    ok(early.length === 0 && deepest.gem > 0, 'the crystal is only ever found below floor ' + MINE_GEM_FLOOR,
       early.length ? show(early) : MINE_BANDS.map((b, i) => b.id + ' ' + pc(tally[i].gem, tally[i].Q)).join('  ') + ' of rich veins');
    /* and one band above the bottom on purpose: a thing you go deep FOR has to
       be visible from a floor you can already reach, or nobody goes looking */
    const firstGem = MINE_BANDS.findIndex((b, i) => tally[i].gem > 0);
    ok(firstGem >= 0 && firstGem < MINE_BANDS.length - 1, 'the crystal is found before the bottom band',
       'first seen in the ' + (MINE_BANDS[firstGem] || {}).id + ' band, at floor ' + MINE_GEM_FLOOR);

    /* deterministic per square, like the metal it sits in — the square you come
       back to after a reload has to be the same square */
    const flick = [];
    for (const seed of SEEDS.slice(0, 4)) for (const f of [12, 17, 22]) {
      const d = mineFloor(seed, f);
      for (let y = 0; y < d.rows.length; y++) for (let x = 0; x < d.rows[y].length; x++) {
        if (d.rows[y].charAt(x) !== 'Q') continue;
        if (mineGem(seed, f, x, y) !== mineGem(seed, f, x, y)) flick.push(seed + ':' + f + ':' + x + ',' + y);
      }
    }
    ok(flick.length === 0, 'a crystal belongs to the square, not the swing', 'asked twice, everywhere');
  }

  /* ---- 6. viability -------------------------------------------------------- */
  console.log('\n-- viability --');
  {
    const MIN_AREA = 80;
    const cramped = every(d => {
      let n = 0;
      for (let y = 0; y < d.rows.length; y++) for (let x = 0; x < d.rows[y].length; x++) if (walk(d, x, y)) n++;
      return n >= MIN_AREA ? null : 'only ' + n + ' walkable squares';
    });
    ok(cramped.length === 0, 'no floor is empty', cramped.length ? show(cramped) : 'every floor is at least ' + MIN_AREA + ' squares of walking');

    /* the whole thing as one question: can this floor be played? */
    const unplayable = every((d, seed, f) => {
      const W = d.rows[0].length;
      const seen = fill(d, d.home[0], d.home[1]);
      let mineable = 0;
      for (let y = 0; y < d.rows.length; y++) for (let x = 0; x < W; x++) {
        const c = d.rows[y].charAt(x);
        if (c !== 'O' && c !== 'Q') continue;
        for (const [dx, dy] of DIRS) if (seen.has((y + dy) * W + (x + dx))) { mineable++; break; }
      }
      if (!mineable) return 'nothing to swing at';
      if (!d.exits.some(e => e.to === 'gruva' || floorOf(e.to) === f - 1)) return 'no way out';
      if (f < MINE_MAX && !d.exits.some(e => floorOf(e.to) === f + 1)) return 'no way further down';
      return null;
    });
    ok(unplayable.length === 0, 'no floor is unwinnable', unplayable.length ? show(unplayable) :
       'walk in, reach ore, get out, go deeper — on all ' + N);

    /* the rock gets harder, and it does so in one direction */
    let mono = true;
    for (let f = 2; f <= MINE_MAX; f++) if (mineDig(f) < mineDig(f - 1)) mono = false;
    ok(mono && mineDig(1) === 0 && mineDig(MINE_MAX) > 0, 'a swing costs more the deeper it is',
       MINE_BANDS.map(b => b.id + ' +' + b.dig).join('  '));

    /* the same rule world_check.js applies to BEK_DECOR: nothing placed by
       coordinate stands in a wall */
    const inWall = every(d => {
      const seen = new Set(d.decor.map(p => p.x + ',' + p.y));
      if (seen.size !== d.decor.length) return 'two props on one square';
      for (const p of d.decor) if (!walk(d, p.x, p.y)) return p.kind + ' at ' + p.x + ',' + p.y + ' stands in ' + JSON.stringify(at(d, p.x, p.y));
      return null;
    });
    ok(inWall.length === 0, 'nothing the old crew left stands in a wall', inWall.length ? show(inWall) :
       SEEDS.reduce((n, s) => n + FLOORS.reduce((m, f) => m + mineFloor(s, f).decor.length, 0), 0) + ' props placed');

    /* a shaft with no prop on it is a hole the player has no way to see */
    const undressed = every(d => {
      for (const e of d.exits) {
        const p = d.decor.filter(q => q.x === e.x && q.y === e.y)[0];
        if (!p) return 'the shaft at ' + e.x + ',' + e.y + ' has nothing drawn on it';
        if (p.kind !== 'ladder' && p.kind !== 'heis') return 'the shaft at ' + e.x + ',' + e.y + ' is dressed as a ' + p.kind;
      }
      return null;
    });
    ok(undressed.length === 0, 'every shaft is drawn as one', undressed.length ? show(undressed) : 'ladders and hoists, ' + N + ' floors');
  }
}
