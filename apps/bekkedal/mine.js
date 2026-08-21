/* Bekkedal — the descent, and what is down it.
 *
 * The gruva was one hand-authored room with sixteen ore tiles that came back
 * on the same coordinates every morning. `rock.js` had already done the hard
 * part — a vein you can find in a 1-bit threshold, three ore hues no other
 * ramp carries, mineral traces in the wall that thicken as you get closer —
 * and it was hung on a vending machine. This is the mine under it.
 *
 * A floor is GENERATED, and four constraints shape everything here:
 *
 *   It is a BEK_MAPS-shaped map of the existing glyph set. `M` rock, `g`
 *   floor, `.` drift, `O` and `Q` veins, `^` a fallen block, and nothing
 *   else. That is not a limitation the generator works around, it is what
 *   makes the whole thing free: `surface.js`, `rock.js`, `autotile.js`,
 *   `caveGround`, the light pass and the terrain cache all keep working
 *   because from their side nothing has happened. `rock.js` is not touched.
 *
 *   Nothing is random. Every decision is `noise.js`'s declared `R_MINE`
 *   channels read at `mineSalt(seed, floor)`, so a floor is stable while you
 *   are on it, different next run, reproducible in a check, and identical
 *   after a reload — the save carries the seed, never the rows.
 *
 *   A shaft is an exit, not a new mechanism. `move()` has always travelled
 *   when you step onto a tile carrying one; that is how every seam in
 *   `maps.js` works, and a ladder down is the same thing. Every shaft sits at
 *   the end of a dead-end stub (`mine_carve.js`), so you can only ever walk
 *   into one deliberately.
 *
 *   The ore mix moves with depth WITHOUT rock.js moving. `oreKind` already
 *   decides a square's metal from a declared channel of the tile hash — the
 *   generator does not reroll it, it chooses *which squares become veins*,
 *   preferring the ones whose metal already suits the band. The vein you can
 *   see is still the vein you get, and it is the same one when you come back.
 *
 * The way out is the other half of the design. Every floor has a ladder up
 * one floor and a ladder down one floor; only a STATION (every fifth floor)
 * has a hoist that takes you straight to the surface. So the fast way out of
 * floor 13 is back up to 10, and "how far past a station dare I go on the
 * energy I have left" is the decision every descent turns on. There is no
 * fail state in it: the 02:00 clock and `spend()` are the whole pressure.
 */
import { mineSalt, mineV } from './noise.js';
import { BEK_MINE_MOUTH } from './data.js';
import { grid, rows, at, put, reach, countOpen, chamber, drift, stub,
         repair, safeToClose, ROCK, FLOOR } from './mine_carve.js';
import { placeVeins, dressing } from './mine_ore.js';

/* ---- the bands -----------------------------------------------------------
   Four of them, and every way depth changes the mine is a column of this
   table rather than a branch somewhere. `ore` is the *preference* weight per
   metal, not a probability: the generator scores candidate faces by it and
   takes the best, so a band's mix is a shape it converges on rather than a
   die it rolls. `rich` is out of twelve (the `rich` channel's own modulus),
   `dig` is what a swing costs on top of the hakke's own 7, `wander` is how
   far a drift is allowed off the straight line the survey would have cut, and
   `fall` is how much of the roof has come down (out of sixteen — nothing at
   all on a level the company still swept, two squares in sixteen where the
   rock was never cut by anybody). `cut` is what a passage between two
   chambers is *made of*: `.` trodden earth where a crew drove it, and plain
   `g` gravel in the natural cavity at the bottom, where nobody did — so on a
   deep floor the only trodden square left is the alcove the ladder stands in,
   which is the only thing down there anybody made.

   Read it top to bottom and it is the story Lars tells: the company's own
   levels, the ones they worked out, the hard rock they were driving through,
   and then the natural cavity nobody cut at all. */
export const MINE_BANDS = [
  { id: 'drift',  cut: '.', from: 1,  layout: 'square', wander: 0, dig: 0, rich: 0, gem: 0, fall: 0,
    ore: { jern: 6, kobber: 3, solv: 1 }, props: ['timbering', 'railtrack', 'orecart', 'spoilheap'] },
  { id: 'worked', cut: '.', from: 5,  layout: 'rough',  wander: 1, dig: 0, rich: 2, gem: 0, fall: 1,
    ore: { jern: 4, kobber: 5, solv: 2 }, props: ['timbering', 'spoilheap', 'railtrack'] },
  { id: 'hard',   cut: '.', from: 10, layout: 'rough',  wander: 2, dig: 1, rich: 4, gem: 2, fall: 1,
    ore: { jern: 1, kobber: 5, solv: 5 }, props: ['timbering', 'spoilheap'] },
  { id: 'deep',   cut: 'g', from: 15, layout: 'blob',   wander: 3, dig: 2, rich: 5, gem: 4, fall: 2,
    ore: { jern: 0, kobber: 3, solv: 8 }, props: ['spoilheap'] }
];
/* Every fifth floor is a station: it is the one that carries a hoist out, and
   the one the lift at the mouth will bring you back down to. */
export const MINE_STATION = 5;
/* Below this the rich veins start carrying a crystal. Deliberately inside the
   third band and not the fourth: the thing you go deep FOR should be visible
   from a floor you can already reach, or nobody goes looking. */
export const MINE_GEM_FLOOR = 12;
export const MINE_MAX = 40;                 /* the bottom; the rock runs out  */

export const mineBand = floor => {
  let b = MINE_BANDS[0];
  for (const t of MINE_BANDS) if (floor >= t.from) b = t;
  return b;
};
/* What a swing costs on top of BEK_TOOLS' own hakke figure. The one number
   act() adds, so "the rock gets harder" is stated once. */
export const mineDig = floor => mineBand(floor).dig;
export const isStation = floor => floor % MINE_STATION === 0;

/* ---- the map id ----------------------------------------------------------
   Run and floor both, because two runs must not share a field: `mapSalt` is a
   function of the id string, so a floor whose id carried only its number
   would have the same ore field — and so the same metal on every square —
   every run of the game. The seed goes in base 36 to keep the id short, and
   the number comes first so `floorOf` is one parse. */
export const mineId = (seed, floor) => 'synk' + floor + '_' + ((seed >>> 0).toString(36));
/* What the HUD band and the lift's list call a floor. Its own function rather
   than a template inside mineFloor, because `layout_check.js` has to be able
   to ask for the widest one this can ever produce without carving a floor to
   get it — the HUD flows left to right off the map's title and has to clear
   the energy bar at floor 40 as well as at THE MOUNTAIN DAIRY. */
export const mineTitle = floor => ({ no: 'SYNKEN ' + floor, en: 'THE DESCENT ' + floor });
/* Asked on every frame by `mineSync`, and on every square of the map by
   `tileAt` — so it is a handful of character codes rather than a regular
   expression, and it allocates nothing. 'synk' followed by a digit, which no
   authored map id is or ever will be. */
export function isMineId(id) {
  if (typeof id !== 'string' || id.length < 7) return false;
  if (id.charCodeAt(0) !== 115 || id.charCodeAt(1) !== 121 ||
      id.charCodeAt(2) !== 110 || id.charCodeAt(3) !== 107) return false;
  const c = id.charCodeAt(4);
  return c >= 48 && c <= 57;
}
export const floorOf = id => isMineId(id) ? parseInt(id.slice(4), 10) : 0;

/* ---- the raw floor -------------------------------------------------------
   Everything about a floor except its exits, which need the floor above and
   below to know where they set you down. Memoised, because `mineFloor` asks
   for its own two neighbours and a player walking down twenty floors would
   otherwise carve each of them three times. */
const cache = new Map();
function raw(seed, floor) {
  const k = seed + ':' + floor;
  const hit = cache.get(k);
  if (hit) return hit;
  if (cache.size > 96) cache.clear();        /* a run is bounded; this is hygiene */
  const built = build(seed, floor);
  cache.set(k, built);
  return built;
}
export const mineClearCache = () => cache.clear();

function build(seed, floor) {
  const salt = mineSalt(seed, floor), band = mineBand(floor);
  const tier = MINE_BANDS.indexOf(band);
  /* A floor grows with depth, and jitters on top of that so two floors of one
     band are not the same rectangle. Never under BEK_MIN_COLS x BEK_MIN_ROWS:
     the camera clamps against a map's own size and a map smaller than one
     screen has nothing to clamp. */
  const w = 28 + tier * 4 + mineV(salt, 0, 0, 'rw');
  const h = 18 + tier * 2 + mineV(salt, 0, 1, 'rh');
  const G = grid(w, h, ROCK);

  /* the lattice. Chambers are cut one to a cell so two can never merge into
     an open hall, and walked in a serpentine so consecutive ones are
     neighbours and the drifts between them stay short. */
  const cx = Math.max(3, Math.floor((w - 2) / 8)), cy = Math.max(2, Math.floor((h - 2) / 6));
  const cw = Math.floor((w - 2) / cx), chh = Math.floor((h - 2) / cy);
  const cells = [];
  for (let j = 0; j < cy; j++) {
    for (let i = 0; i < cx; i++) {
      const ii = j % 2 ? cx - 1 - i : i;      /* serpentine */
      cells.push({ x: 1 + ii * cw, y: 1 + j * chh, w: cw, h: chh });
    }
  }
  const halls = [];
  cells.forEach((cell, i) => {
    const c = chamber(G, salt, i, cell, band.layout);
    halls.push(c);
    /* joined as it is cut, so the walkable set is one piece at every step —
       see mine_carve.js's header on why connectivity is built and not hoped */
    if (i > 0) drift(G, salt, halls[i - 1].x, halls[i - 1].y, c.x, c.y, band.wander, i, band.cut);
  });
  /* and one cross-cut, so a floor is a network rather than a single line you
     walk down and back up. Between two chambers a row apart, never adjacent. */
  if (halls.length > cx + 1) drift(G, salt, halls[0].x, halls[0].y, halls[cx + 1].x, halls[cx + 1].y, band.wander, 97, band.cut);
  /* and then the guarantee, rather than the argument — see mine_carve.js */
  const patched = repair(G, halls[0].x, halls[0].y, band.cut);

  /* ---- the shafts ------------------------------------------------------- */
  let seen = reach(G, halls[0].x, halls[0].y);
  const taken = [];
  /* A floor is meant to be crossed, not glanced at, so the two ladders go as
     far apart as it reaches: `stub()` returns the farthest reachable dead end
     from whatever square it is handed, so the way up is measured off the last
     chamber and the way down off the way up. You land at one ladder and the
     other is the length of the floor away. */
  const up = stub(G, seen, halls[halls.length - 1], taken);
  if (up) taken.push(up);
  const down = up && floor < MINE_MAX ? stub(G, seen, up, taken) : null;
  if (down) taken.push(down);
  const hoist = isStation(floor) ? stub(G, seen, halls[Math.floor(halls.length / 2)], taken) : null;
  if (hoist) taken.push(hoist);

  /* ---- what has come down ------------------------------------------------
     A fallen block or two, and this runs BEFORE the ore rather than after it.
     A block closes an open square, and closing the one open square beside a
     vein seals that vein inside the rock — which is exactly the failure
     `mine_check.js` names, found by it on 179 floors of 400 when these two
     passes were the other way round. Deciding what is open first and then
     deciding which faces of the rock carry ore is the fix; the alternative
     was a second list of squares the block pass had to know to avoid.

     Never on a stub or on the square a shaft sets you down on — landing
     inside a solid tile is not a thing a save should be able to do — and
     never where it would strand anything, which `safeToClose` answers by
     actually closing it and re-running the fill rather than by counting
     neighbours and hoping. */
  const keep = taken.concat(taken.map(t => t.from));
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    if (at(G, x, y) !== FLOOR) continue;
    if (mineV(salt, x, y, 'blok') >= band.fall) continue;
    if (keep.some(t => t && t.x === x && t.y === y)) continue;
    safeToClose(G, x, y, halls[0].x, halls[0].y);
  }

  /* ---- the ore ---------------------------------------------------------- */
  seen = reach(G, halls[0].x, halls[0].y);
  const veins = placeVeins(G, mineId(seed, floor), salt, band, seen, taken);

  return { w: w, h: h, rows: rows(G), floor: floor, band: band, tier: tier,
           up: up, down: down, hoist: hoist, veins: veins, patched: patched,
           decor: dressing(G, salt, band, up, down, hoist),
           area: countOpen(G) };
}


/* ---- the floor as the engine sees it -------------------------------------
   A BEK_MAPS entry, exits and all. `cave` is what `surface.js`'s isCave()
   reads, so the floor gets the mine's ground, the mine's bed and the mine's
   light without any of them being told about the descent.

   The exits are the only part that needs a neighbour, and they need exactly
   one square of it — where its own ladder stands — so this asks `raw` for the
   floor above and below rather than building them whole a second time. */
export function mineFloor(seed, floor) {
  const r = raw(seed, floor), exits = [];
  const land = (f, which) => {
    const n = raw(seed, f);
    const s = n[which];
    return s ? { to: mineId(seed, f), tx: s.from.x, ty: s.from.y } : null;
  };
  const out = { to: 'gruva', tx: BEK_MINE_MOUTH.x, ty: BEK_MINE_MOUTH.y - 1 };
  if (r.up) {
    const e = floor <= 1 ? out : land(floor - 1, 'down');
    if (e) exits.push(Object.assign({ x: r.up.x, y: r.up.y }, e));
  }
  if (r.down && floor < MINE_MAX) {
    const e = land(floor + 1, 'up');
    if (e) exits.push(Object.assign({ x: r.down.x, y: r.down.y }, e));
  }
  if (r.hoist) exits.push(Object.assign({ x: r.hoist.x, y: r.hoist.y }, out));
  return {
    title: mineTitle(floor),
    rows: r.rows, exits: exits, cave: 1, floor: floor, band: r.band.id,
    /* where the lift sets you down, and where a reloaded save is put if the
       square it was saved on is no longer one you can stand on */
    home: r.up ? [r.up.from.x, r.up.from.y] : [1, 1],
    veins: r.veins, decor: r.decor, area: r.area
  };
}

/* Does the rich vein on this square carry a crystal? Deterministic, like the
   metal above it and for the same reason: the square you come back to is the
   same square, and a check can walk every one of them. */
export function mineGem(seed, floor, x, y) {
  const band = mineBand(floor);
  if (!band.gem || floor < MINE_GEM_FLOOR) return false;
  return mineV(mineSalt(seed, floor), x, y, 'gem') < band.gem;
}

