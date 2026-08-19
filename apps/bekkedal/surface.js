/* Bekkedal — what a tile is made of.
 *
 * One table, two readers. `index.js`'s ground pass fills from it, and
 * `palette_check.js` walks every glyph of every map through it to assert that
 * at the darkest hour of the night curve you can still tell the ground you
 * may stand on from the thing you may not. Those two have to agree or the
 * check is checking a fiction, which is why the mapping lives here instead of
 * being spelled out twice.
 *
 * `groundOf` and `solidOf` answer the same question — *what does the eye take
 * this tile to be* — for the two halves of the map. That is not always the
 * first `fillRect` a tile lays down: a shore tile starts as deep water and
 * ends as a strip of beach, and the beach is what you see and walk on. Where
 * the answer and the base fill do coincide, the ground pass uses this
 * function rather than repeating the branch.
 */
import { ATMO, GRASS, DRY, CON, TIM, STO, SOI, WAT, SAN, SNO, WAR } from './palette.js';
import { BEK_MAPS } from './data.js';

/* Two dressings for a building: log-and-turf out on the farms, at the water
   and indoors; painted board under clay tile in the town. One palette, two
   silhouettes, and you can tell where you are by looking. */
export const rustic = mapId => mapId === 'farm' || mapId === 'setra' || mapId === 'lake' ||
                               mapId === 'enga' || mapId === 'farmhouse' || mapId === 'lakehouse';
export const inside = mapId => !!(BEK_MAPS[mapId] && BEK_MAPS[mapId].inside);
export const isCave = mapId => mapId === 'gruva';
export const snowy  = mapId => mapId === 'setra' || mapId === 'vidda';

/* Water, and what counts as a shore's land. A cliff (`M`) and a pier (`P`)
   are neither: a cliff goes straight into the water with no beach under it,
   and a pier is over the water rather than beside it — naming either as land
   would put sand under both. The dead margin is nothing at all. */
export const isWater = c => c === 'W' || c === '~';
export const isShoreLand = c => c !== 'W' && c !== '~' && c !== 'M' && c !== 'P' && c !== ' ';

/* the ground a map lays under anything that does not bring its own */
export const defaultGround = mapId => inside(mapId) ? TIM[2] : isCave(mapId) ? STO[0] : GRASS[2];

/* ---- walkable ------------------------------------------------------------ */
export function groundOf(mapId, c) {
  switch (c) {
    case ' ': return 0;                       /* the dead margin, and meant to be black */
    case '.': return SOI[2];                  /* trodden earth                          */
    /* Planed decking, a step up the ramp from a log wall — and the fjord's
       pier runs the whole length of a cliff face of STO[2], which at the
       darkest hour is nearly the same value. */
    case 'P': return TIM[3];
    case 'f': return SOI[2];                  /* a plot, turned or not                  */
    case 'k': return DRY[1];                  /* the pen, strewn with straw             */
    case 'L': return GRASS[2];                /* the lot, still just grass              */
    case 'x': return TIM[2];                  /* a bridge                               */
    /* A shore tile begins as deep water and ends as sand and bank. What you
       stand on there is the bank, so that is what it reads as. */
    case '~': return SAN[1];
    case 'z': return WAR[2];                  /* a rag rug, walked on                   */
    default:  return defaultGround(mapId);
  }
}

/* ---- solid --------------------------------------------------------------- */
export function solidOf(mapId, c) {
  switch (c) {
    case 'T': case 'G': return CON[2];        /* fir and spruce, read as their canopy   */
    case 'Y': return GRASS[3];                /* birch, read as its lighter crown       */
    case 'W': return WAT[1];                  /* deep water                             */
    /* A log wall used to be TIM[2], which is a shade off the grass in front
       of it — in daylight the two are told apart by hue, and hue is the first
       thing the night curve takes away. Dark timber with lighter courses
       across it reads at every hour, and indoors it is what gives the room an
       edge where the wall meets the floor. */
    case 'H': return inside(mapId) ? TIM[0] : rustic(mapId) ? TIM[1] : WAR[1];
    case 'R': return rustic(mapId) ? GRASS[1] : WAR[1];
    case 'D': return TIM[2];
    case 'S': return SAN[1];                  /* the board of a sign                    */
    case '=': return TIM[2];
    case '^': return STO[2];
    case 'M': case 'O': case 'Q': return snowy(mapId) ? SNO[0] : STO[2];
    case 'v': return STO[3];                  /* the stone surround of a hearth         */
    case 'o': return STO[4];                  /* a well, pale stone against the grass   */
    case 'K': return TIM[3];                  /* the chest, read as its planed lid      */
    /* Furniture reads as its top surface, which is the lit face you see from
       above — a bench is its seat and not its legs. Planed boards are also a
       step or two up the ramp from the log walls they stand against, which is
       both true of the material and what keeps them apart after dark. */
    case 'J': case 'c': return TIM[3];
    case 'n': return TIM[4];
    case 'u': return TIM[1];
    case 'b': return WAT[4];                  /* a bed, read as its blanket             */
    case 'B': return TIM[2];
    default:  return defaultGround(mapId);
  }
}
