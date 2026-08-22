/* Bekkedal — the eleven places, and the seams between them.
 *
 * The valley used to be eleven rooms you reached from a menu, because every
 * map was one screen and a screen is not a place. The maps themselves now
 * live in `maps_valley.js` and `maps_wild.js`; what lives here is the thing
 * that makes them one valley — the edge runs, declared once each, as a
 * pairing rather than as two lists of exits that have to be kept agreeing by
 * hand.
 *
 * A seam is not a new mechanism. It is the exits mechanism BEK_MAPS has
 * always had, applied to a whole run of an edge instead of one tile of it:
 * walk west off the farm on any of four rows and you are in the wood, on the
 * row that answers it. Because both sides are generated from the same
 * declaration, the two runs are always the same length and always land one
 * tile inside the rim they came through, so there is no row you can leave by
 * and no row you can fall through.
 *
 * The travel menu is not gone, but it is down to the two places it was ever
 * honest about: the setra and the vidda are up the mountain, and the walk is
 * the point (see BEK_HOME in index.js, and what Sigrid and Gunnar say about
 * the track in BEK_TALK). Everything on the valley floor you walk to.
 */
import { VALLEY } from './maps_valley.js';
import { WILD } from './maps_wild.js';

export const BEK_MAPS = Object.assign({}, VALLEY, WILD);

/* ---- the seams -----------------------------------------------------------
   [ map, side, from, length, partner, partner's from, gate? ]

   `side` is which edge of the first map the run lies on; the answering run is
   on the opposite edge of the partner, `length` tiles long, starting at the
   partner's own `from`. A `gate` is carried on the first map's side only —
   the wind and the dark are reasons not to go up and in, never reasons you
   cannot come back down and out.
   ========================================================================== */
const WARM = { need: 'warm', why: {
  no: 'Vinden der oppe skjærer gjennom deg. Skaff noe ullent først.',
  en: 'The wind up top will cut through you. Get something woollen first.' } };
const LAMP = { need: 'lamp', why: {
  no: 'Beksvart der inne. Lars har lyktene.',
  en: 'Pitch dark in there. Lars keeps the lanterns.' } };

const SEAMS = [
  ['farm',   'E', 12, 5, 'town',   13],        /* the road east, into the square   */
  ['farm',   'W',  6, 4, 'forest', 18],        /* the track west, into the wood    */
  ['farm',   'S', 15, 5, 'enga',    5],        /* down the field track to the hay  */
  ['town',   'E', 13, 5, 'lake',   13],        /* the road on down to the water    */
  ['town',   'N', 20, 5, 'forest', 24],        /* the road north out of the square */
  ['town',   'S', 20, 5, 'enga',   24],        /* and south, past the meadow       */
  ['forest', 'N',  8, 2, 'setra',   8],        /* the trail up — two tiles wide    */
  ['setra',  'N',  8, 2, 'vidda',   8, WARM],
  ['setra',  'E', 12, 2, 'gruva',  12, LAMP]
];

const OPP = { N: 'S', S: 'N', W: 'E', E: 'W' };
const size = m => [m.rows[0].length, m.rows.length];
/* the i-th tile of a run along `side`, and the square just inside it */
function rim(m, side, from, i) {
  const [cols, rows] = size(m);
  return side === 'N' ? [from + i, 0] : side === 'S' ? [from + i, rows - 1]
       : side === 'W' ? [0, from + i] : [cols - 1, from + i];
}
function inward(m, side, x, y) {
  const [cols, rows] = size(m);
  return side === 'N' ? [x, 1] : side === 'S' ? [x, rows - 2]
       : side === 'W' ? [1, y] : [cols - 2, y];
}

for (const [aId, side, aFrom, len, bId, bFrom, gate] of SEAMS) {
  const a = BEK_MAPS[aId], b = BEK_MAPS[bId], back = OPP[side];
  for (let i = 0; i < len; i++) {
    const [ax, ay] = rim(a, side, aFrom, i), [bx, by] = rim(b, back, bFrom, i);
    const [aix, aiy] = inward(a, side, ax, ay), [bix, biy] = inward(b, back, bx, by);
    a.exits.push(Object.assign({ x: ax, y: ay, to: bId, tx: bix, ty: biy }, gate || {}));
    b.exits.push({ x: bx, y: by, to: aId, tx: aix, ty: aiy });
  }
}
