import { ATMO, GRASS, DRY, CON, TIM, STO, SOI, WAT, SAN, SNO, WAR } from './palette.js';

/* ---- geometry -------------------------------------------------------------
 * A map is as big as its own rows: `mapRows(id)` tall, `mapCols(id)` wide.
 * There is no global BEK_COLS/BEK_ROWS any more, because there is no one
 * size — the valley used to be eleven screens of exactly 24x15 joined by a
 * travel menu, and that ceiling is why every map was one idea with grass
 * round it. Every consumer asks the map it is drawing.
 *
 * What has *not* changed is the coordinate system: every row string in
 * BEK_MAPS, every NPC and goat position, and every per-tile key in S.soil /
 * S.felled / S.mined / S.picked / S.drops is still a grid coordinate, not a
 * pixel.
 *
 * Tile art and sprites are still authored on the original 20px tile
 * (BEK_T_SRC). They reach the screen through a whole-number BEK_ART_SCALE
 * transform, so nothing in the art had to be redrawn to raise the resolution
 * and the diff stays readable. Phase 3 redraws them at native density and
 * BEK_ART_SCALE goes to 1.
 *
 * BEK_MIN_COLS x BEK_MIN_ROWS is the floor every map is held to
 * (layout_check.js). It is not an arbitrary minimum: 24 tiles x 40px is
 * exactly the 960px canvas, and 15 tiles is 600px against a 480px viewport,
 * so the smallest legal map is one screen wide with the vertical overhang
 * the camera has always had. A map narrower or shorter than that would leave
 * blank space past the edge of the world where the clamp has nothing to
 * clamp against. Anything larger scrolls, on both axes.
 */
export const BEK_T_SRC = 20;                              /* art authoring tile */
export const BEK_ART_SCALE = 2;                           /* source px -> screen px */
export const BEK_T = BEK_T_SRC * BEK_ART_SCALE;           /* 40 — presented tile */
export const BEK_MIN_COLS = 24, BEK_MIN_ROWS = 15;        /* the smallest legal map */

export const BEK_W = BEK_MIN_COLS * BEK_T;                /* 960 — one screen wide */
export const BEK_H = BEK_W * 9 / 16;                      /* 540 — 16:9 */

/* The two HUD bands are reserved chrome: the playfield no longer draws
   underneath them, so nothing the player needs is ever hidden by the status
   strip the way it was when both overlaid the top and bottom map rows. */
export const BEK_HUD_H = 30;                              /* height of one band */
export const BEK_VIEW_X = 0;
export const BEK_VIEW_Y = BEK_HUD_H;
export const BEK_VIEW_W = BEK_W;                          /* 960 */
export const BEK_VIEW_H = BEK_H - BEK_HUD_H * 2;          /* 480 */

/* ---- a map's own size -----------------------------------------------------
   Derived from the rows themselves rather than declared beside them, so a map
   cannot claim a size its content does not have and no existing map needed
   editing when the ceiling came off. These reference BEK_MAPS, which is
   declared further down this file — they are functions, so the reference is
   resolved when a caller asks rather than while this module initialises, and
   all the geometry stays in one block where it can be read together.

   Both camera clamps are the same expression. The vertical one was always
   right; the horizontal one was `max(0, 960 - 960)` and so was always zero,
   which is why the camera appeared not to scroll rather than being unable to.
   Nothing about the clamp changed — only what the maps feed it. */
const mapDef = id => BEK_MAPS[id];
export const mapCols = id => { const m = mapDef(id); return m ? m.rows[0].length : BEK_MIN_COLS; };
export const mapRows = id => { const m = mapDef(id); return m ? m.rows.length : BEK_MIN_ROWS; };
export const mapW = id => mapCols(id) * BEK_T;
export const mapH = id => mapRows(id) * BEK_T;
export const camMaxX = id => Math.max(0, mapW(id) - BEK_VIEW_W);
export const camMaxY = id => Math.max(0, mapH(id) - BEK_VIEW_H);

/* Weather. The drop count is a density carried over from the 480x300 build
   (46 drops over 144000px) rescaled to the viewport; the strides stay 53/91
   because both are still coprime with the new 960/480 wrap moduli, so the
   drops scatter instead of banding. */
export const BEK_RAIN_N = Math.round(46 * (BEK_VIEW_W * BEK_VIEW_H) / (480 * 300));
export const BEK_RAIN_STRIDE_X = 53, BEK_RAIN_STRIDE_Y = 91;
export const BEK_RAIN_LEN = 4 * BEK_ART_SCALE;
export const BEK_RAIN_VX = 120 * BEK_ART_SCALE, BEK_RAIN_VY = 220 * BEK_ART_SCALE;
export const BEK_DITHER_CELL = 4;                         /* ordered-dither matrix */
export const BEK_DITHER_PX = BEK_DITHER_CELL * BEK_ART_SCALE;  /* stipple stays as coarse as it looks today */
export const BEK_SAVE = 'templeos.bekkedal.v2';

/* the lot by the water — index.js's lotSign() reads this rather than a
 * literal 1200, so act2_check.js's balance simulation can read the exact
 * same number rather than a hand-copied one. */
export const BEK_LOT_COST = 1200;

/* ---- 27.0 the two tongues ------------------------------------------------
   Every player-facing string is either a plain string (same in both) or a
   { no, en } pair. BILINGUAL keeps the Norwegian flavour words the valley is
   named in; ENGLISH-ONLY renders the same lines with the flavour translated.
   The toggle lives in the app bar and is remembered in the save.
   ========================================================================== */
/* BEK_LANG and T() live in index.js: T's whole job is reading the current
   language, and a live-binding export can't be reassigned by its importer. */
/* a tiny dictionary for the recurring UI words */
export const UI = {
  day:    { no: 'DAG',        en: 'DAY'      },
  saved:  { no: 'LAGRET.',    en: 'SAVED.'   },
  loaded: { no: 'LASTET.',    en: 'LOADED.'  },
  empty:  { no: '(TOM)',      en: '(EMPTY)'  },
  bag:    { no: 'SEKKEN',     en: 'THE BAG'  },
  board:  { no: 'OPPSLAGSTAVLE', en: 'NOTICE BOARD' },
  map:    { no: 'KARTET',     en: 'THE MAP'  },
  shop:   { no: 'LANDHANDEL', en: 'THE STORE'},
  buy:    { no: 'KJØP',       en: 'BUY'      },
  sell:   { no: 'SELG',       en: 'SELL'     },
  craft:  { no: 'VERKSTED',   en: 'WORKSHOP' },
  make:   { no: 'LAGE',       en: 'MAKE'     },
  cook:   { no: 'KOK',        en: 'COOK'     },
  done:   { no: 'FERDIG',     en: 'DONE'     },
  active: { no: 'PÅGÅR',      en: 'ACTIVE'   },
  notyet: { no: 'IKKE ENNÅ',  en: 'NOT YET'  },
  tools:  { no: 'REDSKAP',    en: 'TOOLS'    },
  sleep:  { no: 'SOV TIL MORGENEN?', en: 'SLEEP UNTIL MORNING?' },
  goodnight: { no: 'SPACE — GOD NATT     ESC — IKKE ENNÅ', en: 'SPACE — GOOD NIGHT     ESC — NOT YET' }
};

/* ---- 27.1 things you can hold -------------------------------------------
   icon: which little sprite drawSprite() paints. col: its main colour index.
   ========================================================================== */
export const BEK_ITEMS = {
  /* seeds */
  potetfro:   { name: { no: 'POTETFRØ',   en: 'POTATO SEED'  }, buy: 20,  sell: 8,   seed: 'potet',   icon: 'seed', col: 6  },
  nepefro:    { name: { no: 'NEPEFRØ',    en: 'TURNIP SEED'  }, buy: 14,  sell: 5,   seed: 'nepe',    icon: 'seed', col: 13 },
  gulrotfro:  { name: { no: 'GULROTFRØ',  en: 'CARROT SEED'  }, buy: 45,  sell: 18,  seed: 'gulrot',  icon: 'seed', col: 12 },
  kalfro:     { name: { no: 'KÅLFRØ',     en: 'CABBAGE SEED' }, buy: 60,  sell: 24,  seed: 'kal',     icon: 'seed', col: 10 },
  jordbarfro: { name: { no: 'JORDBÆRFRØ', en: 'STRAWB. SEED' }, buy: 110, sell: 44,  seed: 'jordbar', icon: 'seed', col: 12 },
  rabarbrafro:{ name: { no: 'RABARBRAFRØ',en: 'RHUBARB SEED' }, buy: 160, sell: 64,  seed: 'rabarbra',icon: 'seed', col: 4  },
  /* crops */
  potet:      { name: { no: 'POTET',      en: 'POTATO'       }, sell: 45,  icon: 'root',  col: 14 },
  nepe:       { name: { no: 'NEPE',       en: 'TURNIP'       }, sell: 30,  icon: 'root',  col: 13 },
  gulrot:     { name: { no: 'GULROT',     en: 'CARROT'       }, sell: 85,  icon: 'root',  col: 6  },
  kal:        { name: { no: 'KÅL',        en: 'CABBAGE'      }, sell: 120, icon: 'leaf',  col: 10 },
  jordbar:    { name: { no: 'JORDBÆR',    en: 'STRAWBERRY'   }, sell: 190, icon: 'berry', col: 12 },
  rabarbra:   { name: { no: 'RABARBRA',   en: 'RHUBARB'      }, sell: 240, icon: 'stalk', col: 10 },
  /* forage */
  sopp:       { name: { no: 'SOPP',       en: 'MUSHROOM'     }, sell: 30,  icon: 'mush',  col: 12 },
  kantarell:  { name: { no: 'KANTARELL',  en: 'CHANTERELLE'  }, sell: 90,  icon: 'mush',  col: 14 },
  blabar:     { name: { no: 'BLÅBÆR',     en: 'BLUEBERRY'    }, sell: 35,  icon: 'berry', col: 9  },
  multe:      { name: { no: 'MULTE',      en: 'CLOUDBERRY'   }, sell: 120, icon: 'berry', col: 14 },
  tyttebar:   { name: { no: 'TYTTEBÆR',   en: 'LINGONBERRY'  }, sell: 55,  icon: 'berry', col: 12 },
  tang:       { name: { no: 'TANG',       en: 'KELP'         }, sell: 20,  icon: 'leaf',  col: 2  },
  urt:        { name: { no: 'URT',        en: 'HERB'         }, sell: 25,  icon: 'leaf',  col: 10 },
  /* flowers — the meadow */
  blomst_bla: { name: { no: 'BLÅKLOKKE',  en: 'HAREBELL'     }, sell: 12,  icon: 'flower',col: 9  },
  blomst_gul: { name: { no: 'SOLEIE',     en: 'BUTTERCUP'    }, sell: 12,  icon: 'flower',col: 14 },
  blomst_ro:  { name: { no: 'REVEBJELLE', en: 'FOXGLOVE'     }, sell: 14,  icon: 'flower',col: 13 },
  /* wood & stone & ore */
  tommer:     { name: { no: 'TØMMER',     en: 'TIMBER'       }, sell: 25,  icon: 'wood',  col: 6  },
  planke:     { name: { no: 'PLANKE',     en: 'PLANK'        }, sell: 40,  icon: 'wood',  col: 14 },
  stein:      { name: { no: 'STEIN',      en: 'STONE'        }, sell: 18,  icon: 'stone', col: 7  },
  jern:       { name: { no: 'JERN',       en: 'IRON ORE'     }, sell: 70,  icon: 'ore',   col: 7  },
  kobber:     { name: { no: 'KOBBER',     en: 'COPPER ORE'   }, sell: 110, icon: 'ore',   col: 6  },
  solv:       { name: { no: 'SØLV',       en: 'SILVER ORE'   }, sell: 220, icon: 'ore',   col: 15 },
  spiker:     { name: { no: 'SPIKER',     en: 'NAILS'        }, buy: 30, sell: 12, icon: 'nail', col: 8 },
  tau:        { name: { no: 'TAU',        en: 'ROPE'         }, buy: 45, sell: 16, icon: 'rope', col: 6 },
  /* placeable farm gear — `place: true` is read by act()'s kanne branch,
     never by the shop or the bag, which treat it like any other item */
  sprinkler:  { name: { no: 'SPREDER',    en: 'SPRINKLER'    }, buy: 250, sell: 60, icon: 'sprinkler', col: 7, place: true },
  /* not sold anywhere — only BEK_RECIPES.craft produces it, at the chest */
  gjerde:     { name: { no: 'GJERDE',     en: 'FENCE'        }, sell: 35, icon: 'wood', col: 6 },
  /* fish */
  orret:      { name: { no: 'ØRRET',      en: 'TROUT'        }, sell: 65,  icon: 'fish',  col: 13 },
  laks:       { name: { no: 'LAKS',       en: 'SALMON'       }, sell: 130, icon: 'fish',  col: 6  },
  roye:       { name: { no: 'RØYE',       en: 'CHAR'         }, sell: 100, icon: 'fish',  col: 12 },
  torsk:      { name: { no: 'TORSK',      en: 'COD'          }, sell: 90,  icon: 'fish',  col: 7  },
  makrell:    { name: { no: 'MAKRELL',    en: 'MACKEREL'     }, sell: 75,  icon: 'fish',  col: 11 },
  /* the rare ones. One bite in ten is one of these, and the fight is a
     different animal: a sliver of a zone, a faster needle, one more pull. */
  kveite:     { name: { no: 'KVEITE',     en: 'HALIBUT'      }, sell: 900, icon: 'fish',  col: 3,  rare: 1 },
  gullorret:  { name: { no: 'GULLØRRET',  en: 'GOLDEN TROUT' }, sell: 700, icon: 'fish',  col: 14, rare: 1 },
  /* dairy & animal */
  melk:       { name: { no: 'MELK',       en: 'MILK'         }, sell: 22,  icon: 'milk',  col: 15 },
  brunost:    { name: { no: 'BRUNOST',    en: 'BROWN CHEESE' }, buy: 55, sell: 20, eat: 55, icon: 'cheese', col: 6 },
  ull:        { name: { no: 'ULL',        en: 'WOOL'         }, sell: 30,  icon: 'wool',  col: 7  },
  egg:        { name: { no: 'EGG',        en: 'EGG'          }, sell: 18,  icon: 'egg',   col: 15 },
  /* animal feed, and the two animals themselves — `animal` is read by
     shopBuy() in index.js: an item that carries it never goes in the bag,
     it goes in the pen (see BEK_BARN_PLOT / BEK_ANIMAL_KINDS below) */
  dyrefor:    { name: { no: 'DYREFOR',    en: 'ANIMAL FEED'  }, buy: 15, icon: 'leaf', col: 6 },
  geit:       { name: { no: 'GEIT',       en: 'GOAT'         }, buy: 600, icon: 'wool', col: 15, animal: 'goat' },
  hone:       { name: { no: 'HØNE',       en: 'CHICKEN'      }, buy: 250, icon: 'hen',  col: 6,  animal: 'chicken' },
  /* food you eat */
  kaffe:      { name: { no: 'KAFFE',      en: 'COFFEE'       }, buy: 40,  sell: 12, eat: 35,  icon: 'cup',  col: 6  },
  vaffel:     { name: { no: 'VAFFEL',     en: 'WAFFLE'       }, buy: 65,  sell: 20, eat: 65,  icon: 'food', col: 14 },
  lefse:      { name: { no: 'LEFSE',      en: 'LEFSE'        }, buy: 50,  sell: 16, eat: 50,  icon: 'food', col: 7  },
  fiskesuppe: { name: { no: 'FISKESUPPE', en: 'FISH SOUP'    }, buy: 90,  sell: 30, eat: 95,  icon: 'bowl', col: 11 },
  multekrem:  { name: { no: 'MULTEKREM',  en: 'CLOUDB. CREAM'}, buy: 120, sell: 40, eat: 110, icon: 'bowl', col: 14 },
  /* cooked at the chest, never sold — BEK_RECIPES.cook, one raw crop plus
     one animal product each, and each restores more than the best shop
     food (multekrem's 110) by design */
  potetstuing:  { name: { no: 'POTETSTUING',  en: 'POTATO STEW'      }, sell: 40, eat: 130, icon: 'bowl', col: 14 },
  gulrotkake:   { name: { no: 'GULROTKAKE',   en: 'CARROT CAKE'      }, sell: 55, eat: 140, icon: 'bowl', col: 6  },
  rabarbragrot: { name: { no: 'RABARBRAGRØT', en: 'RHUBARB PORR.'    }, sell: 65, eat: 150, icon: 'bowl', col: 10 },
  /* worn / carried gear (no sell) */
  lykt:       { name: { no: 'LYKT',       en: 'LANTERN'      }, icon: 'lamp', col: 14 },
  ullgenser:  { name: { no: 'ULLGENSER',  en: 'WOOL SWEATER' }, icon: 'shirt', col: 4 },
  bukett:     { name: { no: 'BUKETT',     en: 'BOUQUET'      }, icon: 'flower', col: 13 }
};

/* which items are seeds, in the order the planter cycles them */
export const BEK_SEED_ORDER = ['potetfro', 'nepefro', 'gulrotfro', 'kalfro', 'jordbarfro', 'rabarbrafro'];

/* `col` is what the ripe head is drawn in — a palette index, and deliberately
   one per crop you can tell apart across a field at a glance. `seasons` is
   which of BEK_SEASONS (below) the seed may be planted in — checked by
   plant() in index.js via seasons.js's cropInSeason(), never enforced as a
   hard error: a crop asked for out of season is a spoken line, not a wall. */
export const BEK_CROPS = {
  potet:    { days: 3, out: 'potet',    col: SAN[1],   seasons: ['var', 'sommer'] },
  nepe:     { days: 2, out: 'nepe',     col: SNO[0],   seasons: ['var', 'host', 'vinter'] },
  gulrot:   { days: 4, out: 'gulrot',   col: WAR[3],   seasons: ['var', 'sommer'] },
  kal:      { days: 4, out: 'kal',      col: GRASS[4], seasons: ['sommer', 'host'] },
  jordbar:  { days: 5, out: 'jordbar',  col: WAR[2], regrow: 2, seasons: ['var', 'sommer'] },
  rabarbra: { days: 6, out: 'rabarbra', col: WAR[1], regrow: 3, seasons: ['var', 'sommer', 'host'] }
};

/* ---- 27.1a the four seasons -----------------------------------------------
   Not a random overlay — a returning cycle the day counter itself drives.
   Four BEK_SEASON_DAYS-long seasons, in fixed order, wrapping forever.
   index.js derives S.season and S.festival from S.day fresh every morning
   (seasons.js's pure seasonIndexOf()/festivalOf()) rather than stepping them
   on their own, so the two can never drift apart from the day count that
   defines them — there is nothing to increment, only to recompute.
   ========================================================================== */
export const BEK_SEASON_DAYS = 20;
export const BEK_SEASONS = [
  { id: 'var',    n: { no: 'VÅR',    en: 'SPRING' } },
  { id: 'sommer', n: { no: 'SOMMER', en: 'SUMMER' } },
  { id: 'host',   n: { no: 'HØST',   en: 'AUTUMN' } },
  { id: 'vinter', n: { no: 'VINTER', en: 'WINTER' } }
];

/* rain/fog odds by season, everything left over is 'klar' — the spring thaw
   and the autumn rains are the wettest, high summer the clearest, winter the
   foggiest. Weather itself is still rolled fresh every morning; only the
   odds move with the season. */
export const BEK_SEASON_WEATHER = {
  var:    { regn: 0.30, take: 0.15 },
  sommer: { regn: 0.12, take: 0.05 },
  host:   { regn: 0.35, take: 0.25 },
  vinter: { regn: 0.15, take: 0.35 }
};

/* the one seasonal tint, fed through the same dither()/ditherPat() call the
   weather overlay already draws fog with — no new renderer, just another
   colour and strength handed to a call that already exists. Strength stays
   low on purpose: a wash over the picture, not a filter over it. */
export const BEK_SEASON_TINT = {
  var:    { col: GRASS[3], n: 1 },
  sommer: { col: WAR[0],   n: 1 },
  host:   { col: WAR[2],   n: 2 },
  vinter: { col: SNO[0],   n: 3 }
};

/* one small recurring festival per season, on a fixed day-of-season so it
   returns every year without drifting off it. `dress` overlays three of
   the town map's own grass tiles — the verges of the square, kept clear of
   the road and the plaza on purpose — with the flower glyph the map already
   draws elsewhere on itself (see maps_valley.js) — tileAt() in index.js reads
   it exactly the way it already reads the two farm-plot overlays in
   BEK_FARM_PLOTS, so the change costs no new glyph and no new draw path,
   only a different day to show the existing one on. The dialogue beat lives
   in BEK_TALK.astrid.chat below, gated on S.festival the same way every
   other chat line there gates on S.flag/S.fr. */
export const BEK_FESTIVALS = {
  var:    { day: 10, map: 'town', dress: [[17, 11], [29, 11], [17, 19]],
            title: { no: 'VÅRBLOT',    en: 'SPRING FESTIVAL' } },
  sommer: { day: 10, map: 'town', dress: [[17, 11], [29, 11], [17, 19]],
            title: { no: 'SOLSNU',     en: 'MIDSUMMER FAIR' } },
  host:   { day: 10, map: 'town', dress: [[17, 11], [29, 11], [17, 19]],
            title: { no: 'HAUSTGILDE', en: 'HARVEST FAIR' } },
  vinter: { day: 10, map: 'town', dress: [[17, 11], [29, 11], [17, 19]],
            title: { no: 'JULEBLOT',   en: 'MIDWINTER FEAST' } }
};

/* ---- 27.1b tools ---------------------------------------------------------
   Five tools on one cycle. The axe and the pick also carry a *tier*, stored
   separately in S.axeLv / S.pickLv, so the same ØKS becomes a STÅLØKS after
   an upgrade without adding a sixth slot to the belt.
   ========================================================================== */
export const BEK_TOOLS = [
  { id: 'spade', name: { no: 'SPADE',      en: 'HOE'      }, e: 2 },
  { id: 'kanne', name: { no: 'VANNKANNE',  en: 'CAN'      }, e: 1 },
  { id: 'oks',   name: { no: 'ØKS',        en: 'AXE'      }, e: 5 },
  { id: 'stang', name: { no: 'FISKESTANG', en: 'ROD'      }, e: 4 },
  /* e:7, not 5 — a swing here dropped an ore worth ~104kr on average (see
     rock.js's "The die is rolled once per square" section) against a 5-energy
     cost, ~21 kr/energy against ~17 for the best early crop and single-digits
     for the rest. At the old cost a rational first playthrough bought a hakke
     on day 1 and never touched farming, animals or fishing again — see
     act2_check.js's balance simulation, which is what this number is tuned
     against. Ore/fish sell prices stay untouched: the ore mix's kr figures
     are cited as measured values below ("The veins"), and fishing's real
     throughput is gated by the reel minigame, not by this table. */
  { id: 'hakke', name: { no: 'HAKKE',      en: 'PICK'     }, e: 7 }
];
export const AXE_NAME  = { no: ['ØKS', 'STÅLØKS'],  en: ['AXE', 'STEEL AXE'] };
export const PICK_NAME = { no: ['HAKKE', 'STÅLHAKKE'], en: ['PICK', 'STEEL PICK'] };

/* ==========================================================================
   27.2 THE NINE PLACES  (+ two interiors)
   --------------------------------------------------------------------------
   g grass  . path  , tall grass  T dark fir (scenery)  Y birch (fell, axe1)
   G gran/big fir (fell, axe2)  W deep water  ~ shallow shore  P pier
   H wall  R roof  D door  = fence  x bridge  f soil  b bed  o well  S sign
   F flowers (deco)  p flower you may pick  L the lot  ^ stone  M mountain rock
   O ore vein  Q rich ore vein  e cave mouth  i floor  v hearth  c crate  B post
   ========================================================================== */
/* the eleven places themselves live in `maps.js`, which joins `maps_valley.js`
   to `maps_wild.js` and hangs every seam between them off one declaration —
   forty-odd columns of rows apiece is more content than this file should
   carry beside the items and the dialogue, and the file-size rule in the root
   CLAUDE.md says so. Re-exported here because BEK_MAPS is what every consumer
   already asks `data.js` for, and because the geometry helpers at the top of
   this file read it. */
import { BEK_MAPS } from './maps.js';
export { BEK_MAPS };

/* ==========================================================================
   27.1c THE FARM PLOTS
   --------------------------------------------------------------------------
   Two purchasable unlocks over the farm map's own grass, never a new map or
   a new map id. `tileAt` in index.js reads a plot's rect as 'f' once
   `S.flag[plot.flag]` is set, exactly the way it already reads S.built's
   BEK_HOUSE overlay on the lake map — the base rows never change. Both
   rects sit on plain grass south and south-east of the home field (rows 5-9,
   cols 18-27), clear of the yard track, of the road along row 13 and of the
   shelter belt down col 35, and the map lays both down as plain grass itself
   so that nothing but the flag ever changes what is standing there.
   ========================================================================== */
export const BEK_FARM_PLOTS = [
  { flag: 'plot2', x0: 18, y0: 11, x1: 25, y1: 12 },
  { flag: 'plot3', x0: 25, y0: 15, x1: 31, y1: 17 }
];

/* ==========================================================================
   27.1d THE PEN
   --------------------------------------------------------------------------
   A third purchasable region over the farm map's own grass, same mechanism
   as the two field expansions above — a flag `tileAt` reads to swap the base
   'g' for a ground glyph ('k', straw) once bought, never a new map. It sits
   on plain grass below the yard (rows 18-20, cols 5-9), clear of the well at
   (5,10), of the track down col 17 and of both field expansions.

   BEK_BARN_SLOTS are the fixed stand positions inside it an owned animal is
   placed at, in purchase order; BEK_BARN_SLOTS.length is the pen's capacity.
   Bought from Håkon (BEK_TALK.hakon); the animals themselves are Sigrid's
   stock (BEK_TALK.sigrid.shop) — see BEK_ANIMAL_KINDS and index.js's
   buyAnimal()/tendAnimal().
   ========================================================================== */
export const BEK_BARN_PLOT = { flag: 'barn', x0: 5, y0: 18, x1: 9, y1: 20 };
export const BEK_BARN_SLOTS = [
  { x: 6, y: 18 }, { x: 8, y: 18 }, { x: 6, y: 20 }, { x: 8, y: 20 }
];

/* Act II: the pen's second tier, gated on S.act2Unlocked — see
   BEK_TALK.hakon's own `barn2` offer and progression.js's barnSlots(). Same
   mechanism again, immediately east of the first pen (cols 11-15, stopping
   short of the track down col 17) so no map row changes. */
export const BEK_BARN_PLOT2 = { flag: 'barn2', x0: 11, y0: 18, x1: 15, y1: 20 };
export const BEK_BARN_SLOTS2 = [
  { x: 12, y: 18 }, { x: 14, y: 18 }, { x: 12, y: 20 }, { x: 14, y: 20 }
];

/* what an owned animal is, and what it pays out once fed and content. The
   affection that gates `produce` is not tracked here — it lives in S.fr,
   keyed by the animal's own instance id, exactly like an NPC's friendship. */
export const BEK_ANIMAL_KINDS = {
  goat:    { name: { no: 'GEIT', en: 'GOAT' },    produce: { melk: 1, ull: 1 } },
  chicken: { name: { no: 'HØNE', en: 'CHICKEN' }, produce: { egg: 1 } }
};

/* ==========================================================================
   27.1e THE CHEST
   --------------------------------------------------------------------------
   A fixed 'K' tile baked straight into the farm map's own rows (row 5, col
   6) — same mechanism as the well ('o') and the sign ('S'): a literal glyph,
   not a flag-gated overlay like the plots or the pen, since it is always
   there and needs no destination metadata the way the door does. Solid
   (BEK_SOLID), drawn in index.js's tileDetail switch, opened by act() into
   `mode = 'craft'` (index.js) — see BEK_RECIPES below for what it makes.
   Its own contents (`S.chest`) are a bag-shaped `{itemId: qty}` map,
   serialized in BEK_SAVE exactly like S.bag and healed the same way.
   ========================================================================== */

/* ==========================================================================
   27.2a WHAT GROWS ROUND THE EDGE
   --------------------------------------------------------------------------
   The mix of species in each map's treeline, and how thick it stands. Weights
   are relative and the bag is expanded once per cache rebuild (see
   `forest.js`); `density` under 1 spaces the trunks out and shortens them,
   which is what a treeline does as the ground gets higher and poorer.

   This is why the valley does not look the same in nine places. Birch round
   the farm and the meadow, dense dark spruce closing in on the mine, wind-bent
   and thinning on the vidda, snow-loaded at the setra.
   ========================================================================== */
export const BEK_TREES = {
  default:  { mix: { fir: 5, spruce: 2, birch: 2, snag: 1 }, density: 1 },
  farm:     { mix: { birch: 5, fir: 3, spruce: 1, stump: 1 }, density: 1 },
  town:     { mix: { birch: 4, fir: 4, spruce: 1, stump: 1 }, density: 0.95 },
  lake:     { mix: { fir: 4, birch: 3, spruce: 2, fallen: 1 }, density: 1 },
  forest:   { mix: { spruce: 6, fir: 4, snag: 2, fallen: 1, stump: 1 }, density: 1.25 },
  enga:     { mix: { birch: 6, fir: 2, stump: 2, fallen: 1 }, density: 0.9 },
  setra:    { mix: { fir: 5, spruce: 3, snag: 2, stump: 1 }, density: 0.95 },
  vidda:    { mix: { fir: 3, snag: 4, stump: 3, fallen: 1 }, density: 0.6 },
  gruva:    { mix: { spruce: 7, fir: 3, snag: 2 }, density: 1.3 },
  fjord:    { mix: { fir: 5, spruce: 2, snag: 2, fallen: 1 }, density: 1 }
};

/* ==========================================================================
   27.2b WHO LIVES HERE
   --------------------------------------------------------------------------
   Where the things in a room stand. `kind` names a drawing in `decor.js`;
   this table only says where. Keeping it here rather than adding eight more
   glyphs to `tileDetail` is the file split working as intended — adding a
   room later costs no code — and it is what lets the two houses be two
   different people's houses instead of one house drawn twice.

   Decor never changes walkability: `solid()` reads BEK_SOLID against the map
   glyph and knows nothing about this table. Anything on a floor square is a
   square you can stand on, and the player draws in front of it.

   The farm cabin is somewhere work happens — a kettle on the fire, wood
   stacked beside it, boots by the door, a broom in the corner, herbs drying
   from the beam. The house by the water is the one you built to be quiet in,
   so it has a lamp and a rod and a creel and flowers on the sill, which is
   what Marit asked for.
   ========================================================================== */
export const BEK_DECOR = {
  /* ---- outdoors ----------------------------------------------------------
     Same table, same rule (kind here, placement there) — a market stall and
     a woodpile are exactly as much content as a kettle, they just stand on
     grass instead of a floorboard. Coordinates checked against BEK_MAPS'
     own rows the same way the indoor lists below are: world_check.js's
     decorBad pass. */
  farm: [
    { x: 11, y: 5,  kind: 'woodpile' },
    { x: 4,  y: 5,  kind: 'waterbutt' },
    { x: 9,  y: 8,  kind: 'bootscraper' },
    { x: 13, y: 6,  kind: 'crate' },
    { x: 14, y: 8,  kind: 'wheelbarrow' },
    { x: 17, y: 5,  kind: 'stonewall' },
    { x: 17, y: 6,  kind: 'stonewall' },
    { x: 17, y: 7,  kind: 'stonewall' },
    { x: 20, y: 10, kind: 'weeds' },
    { x: 25, y: 10, kind: 'weeds' },
    { x: 33, y: 9,  kind: 'brokenfence' },
    { x: 7,  y: 9,  kind: 'washline' },
    { x: 25, y: 12, kind: 'weeds' },
    { x: 6,  y: 10, kind: 'wellbucket' },
    { x: 12, y: 9,  kind: 'weeds' },
    { x: 7,  y: 11, kind: 'flowers' }
  ],
  town: [
    { x: 17, y: 12, kind: 'stall' },
    { x: 31, y: 13, kind: 'stall' },
    { x: 31, y: 18, kind: 'stall' },
    { x: 22, y: 15, kind: 'lamppost' },
    { x: 26, y: 15, kind: 'lamppost' },
    { x: 20, y: 13, kind: 'wellbucket' },
    { x: 5,  y: 7,  kind: 'hitchpost' },
    { x: 30, y: 10, kind: 'hitchpost' },
    { x: 7,  y: 11, kind: 'crate' },
    { x: 11, y: 11, kind: 'crate' },
    { x: 8,  y: 12, kind: 'crate' },
    { x: 37, y: 12, kind: 'crate' },
    { x: 12, y: 6,  kind: 'crate' },
    { x: 2,  y: 20, kind: 'stall' },
    { x: 16, y: 20, kind: 'hitchpost' },
    { x: 24, y: 10, kind: 'washline' }
  ],
  lake: [
    { x: 13, y: 8,  kind: 'rowboat' },
    { x: 12, y: 9,  kind: 'netframe' },
    { x: 13, y: 10, kind: 'cleantable' },
    { x: 7,  y: 13, kind: 'boat_up' },
    { x: 21, y: 1,  kind: 'reeds' },
    { x: 18, y: 4,  kind: 'reeds' },
    { x: 15, y: 7,  kind: 'reeds' },
    { x: 16, y: 11, kind: 'reeds' },
    { x: 22, y: 14, kind: 'reeds' },
    { x: 22, y: 17, kind: 'reeds' },
    { x: 19, y: 20, kind: 'reeds' },
    { x: 21, y: 23, kind: 'reeds' },
    { x: 5,  y: 8,  kind: 'mossclump' },
    { x: 3,  y: 17, kind: 'mossclump' },
    { x: 2,  y: 21, kind: 'mossclump' },
    { x: 9,  y: 20, kind: 'washline' },
    { x: 16, y: 16, kind: 'netframe' }
  ],
  /* ---- the wild -----------------------------------------------------------
     Same rule again: kinds in decor_wild.js, placement here. `deadfall`,
     `fungi` and `root` are the forest floor evidence a tree-covered map has
     that a field does not; `cairn` is the vidda's one way-marker; the
     setra's dry-stone walls reuse the farm's own `stonewall` kind rather
     than declaring a second one — a wall is a wall wherever it stands. */
  forest: [
    { x: 3,  y: 18, kind: 'deadfall' },
    { x: 20, y: 26, kind: 'deadfall' },
    { x: 12, y: 21, kind: 'deadfall' },
    { x: 12, y: 18, kind: 'fungi' },
    { x: 24, y: 15, kind: 'fungi' },
    { x: 20, y: 18, kind: 'root' },
    { x: 6,  y: 15, kind: 'root' },
    { x: 30, y: 27, kind: 'root' }
  ],
  vidda: [
    { x: 6,  y: 6,  kind: 'cairn' },
    { x: 27, y: 18, kind: 'cairn' },
    { x: 8,  y: 20, kind: 'cairn' },
    { x: 24, y: 21, kind: 'cairn' }
  ],
  setra: [
    { x: 6,  y: 7,  kind: 'milkchurn' },
    { x: 9,  y: 9,  kind: 'stonewall' },
    { x: 27, y: 8,  kind: 'stonewall' },
    { x: 33, y: 9,  kind: 'stonewall' }
  ],
  enga: [
    { x: 10, y: 3,  kind: 'hayrack' },
    { x: 36, y: 3,  kind: 'hayrack' },
    { x: 30, y: 15, kind: 'hayrack' }
  ],
  fjord: [
    { x: 3,  y: 7,  kind: 'kelp' },
    { x: 10, y: 7,  kind: 'kelp' },
    { x: 4,  y: 10, kind: 'gullrock' },
    { x: 8,  y: 10, kind: 'gullrock' },
    { x: 3,  y: 15, kind: 'driftwood' },
    { x: 12, y: 15, kind: 'driftwood' },
    { x: 10, y: 11, kind: 'slipway' },
    { x: 13, y: 12, kind: 'jettypost' },
    { x: 14, y: 12, kind: 'jettypost' },
    { x: 16, y: 12, kind: 'jettypost' },
    { x: 17, y: 12, kind: 'jettypost' }
  ],
  gruva: [
    { x: 13, y: 5,  kind: 'timbering' },
    { x: 30, y: 8,  kind: 'timbering' },
    { x: 20, y: 5,  kind: 'railtrack' },
    { x: 25, y: 19, kind: 'railtrack' },
    { x: 25, y: 5,  kind: 'orecart' },
    { x: 20, y: 12, kind: 'spoilheap' },
    { x: 15, y: 19, kind: 'spoilheap' },
    { x: 20, y: 22, kind: 'ladder' }
  ],
  farmhouse: [
    { x: 18, y: 4,  kind: 'kettle' },
    { x: 20, y: 4,  kind: 'jars' },
    { x: 16, y: 4,  kind: 'crockery' },
    { x: 17, y: 3,  kind: 'candle' },
    { x: 15, y: 3,  kind: 'herbs' },
    { x: 17, y: 5,  kind: 'firewood' },
    { x: 16, y: 5,  kind: 'cat' },
    { x: 10, y: 11, kind: 'boots' },
    { x: 13, y: 11, kind: 'broom' },
    { x: 2,  y: 7,  kind: 'picture' },
    { x: 2,  y: 4,  kind: 'coat' },
    { x: 4,  y: 9,  kind: 'basket' },
    { x: 8,  y: 6,  kind: 'loaf' },
    { x: 19, y: 10, kind: 'flowers' }
  ],
  lakehouse: [
    { x: 18, y: 4,  kind: 'kettle' },
    { x: 20, y: 4,  kind: 'lamp' },
    { x: 16, y: 4,  kind: 'crockery' },
    { x: 17, y: 3,  kind: 'loaf' },
    { x: 17, y: 5,  kind: 'firewood' },
    { x: 16, y: 5,  kind: 'cat' },
    { x: 10, y: 11, kind: 'boots' },
    { x: 13, y: 11, kind: 'basket' },
    { x: 2,  y: 7,  kind: 'picture' },
    { x: 5,  y: 3,  kind: 'net' },
    { x: 19, y: 10, kind: 'rod' },
    { x: 8,  y: 6,  kind: 'flowers' }
  ],
  /* Act II: the house's own upgrade tier (S.houseTier, index.js's
     hakonTilbygg()) — layered over `lakehouse` above rather than replacing it,
     the same way the two farm-plot flags overlay the farm map's own grass
     rather than swapping in a second map. A room with three more things in
     it than the day you moved in is what "lived in longer" looks like.
     Coordinates checked against BEK_MAPS.lakehouse's own rows and the
     `lakehouse` list above for collisions. */
  lakehouse_t2: [
    { x: 15, y: 3,  kind: 'herbs' },
    { x: 2,  y: 4,  kind: 'jars' },
    { x: 4,  y: 9,  kind: 'coat' }
  ]
};

/* D is solid too, but it is knocked on. n table, u cupboard and J bench are
   furniture you walk up to, not through; z is a rug, so it is not here. The
   space is the dead margin beyond a room's walls — nothing should stand in it. */
export const BEK_SOLID = 'TYGWHRS=^MOQvcBobnuJK ';

/* ==========================================================================
   27.3 THE PEOPLE
   Eight who talk and one who does not. Static posts — a shopkeeper who
   wanders is a shopkeeper you cannot find. The bear sweeps his clearing.
   ========================================================================== */
/* voice: the base pitch their blips are built on, so you can tell who is
   speaking with your eyes shut. Low for the old and the large. */
/* hair / shirt / pants are palette indices. They come off the ramps rather
   than out of VGA16 now, so a person standing in a field is a person and not
   a colour swatch — and everyone keeps the silhouette and the read they had. */
/* `hair`/`shirt`/`pants` are what actors.js draws the walking sprite from and
   `voice` is the pitch their speech blips are played at. `face` is the
   portrait's own parameter set (portrait.js) — the same idea one step
   further in: a face is one rig with numbers per person, not eight drawings.
   `skin` picks one of the two declared skin bases (a fair one, and a
   weathered one for whoever works outdoors all day); `cut` is the hair
   silhouette, which at this size is most of what tells two people apart;
   `beard`, `brow`, `iris`, `jaw`, `age` and `hat` are the rest of it. Every
   colour named here is a ramp entry, and the lit and shadowed steps of each
   are derived from it rather than declared, so a character cannot be given a
   highlight that is not their own material.

   Whatever is left out falls back to the rig's own middle, so a ninth
   character costs a row here and nothing else.

   `map`/`x`/`y` stay the tile each of the eight always used to stand on —
   still real, still checked by world_check.js, and still what every save
   before this layer, and every debug hook that just wants "an NPC to talk
   to", can keep reading. It is one of that character's own `posts` now
   rather than their only tile: schedule.js's positionFor() is what actually
   places them, hour to hour, and `posts` is its own content, checked in
   full by schedule_check.js. See schedule.js's own header for the shape of
   a post and how the four things that can override an hour (weather,
   season, a festival, a story flag) are declared. */
export const BEK_NPCS = [
  { id: 'astrid', n: 'ASTRID', map: 'town',  x: 9,  y: 11, hair: TIM[1], shirt: WAR[2], pants: ATMO[2], voice: 620,
    face: { skin: 'fair', cut: 'bun',    beard: 0,         brow: 1, iris: TIM[1], jaw: 0,  age: 1, hat: 0 },
    /* the store's counter, out front, is her post from 08:00 to 20:00; a
       rainy day keeps her at her own door instead, and she is home the rest
       of the night. BEK_TALK.astrid's own chat states the hours. */
    posts: [
      { id: 'shop',      map: 'town', x: 13, y: 11, from: 480,  to: 1200 },
      { id: 'shop_rain', map: 'town', x: 9,  y: 11, from: 480,  to: 1200, weather: 'regn' },
      { id: 'home',      map: 'town', x: 9,  y: 11, from: 1200, to: 480  },
      { id: 'festival',  map: 'town', x: 8,  y: 14, from: 600,  to: 1320, festival: true }
    ] },
  { id: 'hakon',  n: 'HÅKON',  map: 'town',  x: 32, y: 24, hair: STO[3], shirt: CON[3], pants: STO[2],  voice: 360,
    face: { skin: 'tan',  cut: 'crop',   beard: 'full',    brow: 2, iris: TIM[1], jaw: 1,  age: 2, hat: 0 },
    /* his framing site by the house, 07:00 to 20:00, home the rest of the
       night — and once the pen stands (S.flag.barn), that is the work
       those same hours mean instead, on the farm rather than in the town. */
    posts: [
      { id: 'work',     map: 'town', x: 28, y: 24, from: 420,  to: 1200 },
      { id: 'pen',      map: 'farm', x: 7,  y: 17, from: 420,  to: 1200, flag: 'barn' },
      { id: 'home',     map: 'town', x: 32, y: 24, from: 1200, to: 420  },
      { id: 'festival', map: 'town', x: 12, y: 14, from: 600,  to: 1320, festival: true }
    ] },
  { id: 'ingrid', n: 'INGRID', map: 'lake',  x: 11, y: 11, hair: DRY[2], shirt: WAT[4], pants: ATMO[2], voice: 700,
    face: { skin: 'fair', cut: 'long',   beard: 0,         brow: 1, iris: WAT[2], jaw: -1, age: 0, hat: 0 },
    posts: [
      { id: 'shore',    map: 'lake', x: 9,  y: 11, from: 420,  to: 1200 },
      { id: 'home',     map: 'lake', x: 11, y: 11, from: 1200, to: 420  },
      { id: 'festival', map: 'town', x: 16, y: 14, from: 600,  to: 1320, festival: true }
    ] },
  { id: 'olav',   n: 'OLAV',   map: 'lake',  x: 12, y: 7,  hair: STO[4], shirt: WAT[2], pants: STO[2],  voice: 330,
    face: { skin: 'tan',  cut: 'short',  beard: 'chin',    brow: 2, iris: WAT[2], jaw: 1,  age: 2, hat: 'cap' },
    posts: [
      { id: 'dock',     map: 'lake', x: 13, y: 8,  from: 420,  to: 1200 },
      { id: 'home',     map: 'lake', x: 12, y: 7,  from: 1200, to: 420  },
      { id: 'festival', map: 'town', x: 20, y: 14, from: 600,  to: 1320, festival: true }
    ] },
  { id: 'marit',  n: 'MARIT',  map: 'enga',  x: 15, y: 9,  hair: SNO[0], shirt: WAR[3], pants: STO[2],  voice: 660,
    face: { skin: 'fair', cut: 'bun',    beard: 0,         brow: 1, iris: WAT[2], jaw: -1, age: 2, hat: 0 },
    /* out among the flowers 08:00 to 19:00; rain keeps her under her own
       roof instead, same shape as Astrid's shop_rain */
    posts: [
      { id: 'field',      map: 'enga', x: 19, y: 9, from: 480,  to: 1140 },
      { id: 'field_rain', map: 'enga', x: 15, y: 9, from: 480,  to: 1140, weather: 'regn' },
      { id: 'home',        map: 'enga', x: 15, y: 9, from: 1140, to: 480  },
      { id: 'festival',    map: 'town', x: 24, y: 14, from: 600, to: 1320, festival: true }
    ] },
  { id: 'sigrid', n: 'SIGRID', map: 'setra', x: 7,  y: 8,  hair: DRY[2], shirt: WAR[4], pants: STO[4],  voice: 560,
    face: { skin: 'fair', cut: 'braids', beard: 0,         brow: 1, iris: TIM[1], jaw: 0,  age: 1, hat: 'kerchief' },
    /* the dairy at the setra, summer through autumn and into spring — but
       "down in the valley" is what winter means for her, so `season`
       replaces both her day and her night post at once rather than only
       one of them, and the two winter posts between them still cover the
       full day the way her setra ones do. BEK_TALK.sigrid's chat states
       the setra hours. */
    posts: [
      { id: 'dairy',        map: 'setra', x: 9, y: 8, from: 480,  to: 1200 },
      { id: 'home',         map: 'setra', x: 7, y: 8, from: 1200, to: 480  },
      { id: 'winter_shop',  map: 'farm',  x: 5, y: 9, from: 480,  to: 1200, season: 'vinter' },
      { id: 'winter_home',  map: 'farm',  x: 3, y: 9, from: 1200, to: 480,  season: 'vinter' },
      { id: 'festival',     map: 'town',  x: 28, y: 14, from: 600, to: 1320, festival: true }
    ] },
  { id: 'gunnar', n: 'GUNNAR', map: 'vidda', x: 22, y: 18, hair: TIM[1], shirt: CON[3], pants: STO[2],  voice: 290,
    face: { skin: 'tan',  cut: 'long',   beard: 'full',    brow: 2, iris: TIM[1], jaw: 1,  age: 1, hat: 0 },
    posts: [
      { id: 'watch',    map: 'vidda', x: 20, y: 18, from: 420,  to: 1200 },
      { id: 'home',     map: 'vidda', x: 22, y: 18, from: 1200, to: 420  },
      { id: 'festival', map: 'town',  x: 32, y: 14, from: 600,  to: 1320, festival: true }
    ] },
  /* Lars stands in the alcove cut beside the adit, never on a corridor. The
     levels driven off the main drift are one tile wide, and a man standing on
     one is a wall; the alcove at (2-3, 9-10) is cut wide enough that he is
     not, and the raise down to the adit runs past him rather than through. */
  { id: 'lars',   n: 'LARS',   map: 'gruva', x: 2,  y: 9,  hair: STO[3], shirt: WAR[1], pants: STO[2],  voice: 420,
    face: { skin: 'tan',  cut: 'crop',   beard: 'stubble', brow: 2, iris: TIM[1], jaw: 0,  age: 1, hat: 'helm' },
    /* both his posts are the same alcove the comment above is about — the
       adit does not give him a second wide spot to stand in, so the shift
       is a couple of tiles rather than a walk down the drift. */
    posts: [
      { id: 'shop',     map: 'gruva', x: 2, y: 9,  from: 480,  to: 1200 },
      { id: 'home',     map: 'gruva', x: 3, y: 10, from: 1200, to: 480  },
      { id: 'festival', map: 'town',  x: 36, y: 14, from: 600, to: 1320, festival: true }
    ] },
  { id: 'bjorn',  n: '',       map: 'forest', x: 12, y: 10, bear: true, from: 6 }
];

/* decorative animals — drawn, never collided with */
export const BEK_GOATS = [
  { map: 'setra', x: 15, y: 10 }, { map: 'setra', x: 30, y: 20 }, { map: 'setra', x: 12, y: 13 },
  { map: 'vidda', x: 7, y: 7 }, { map: 'vidda', x: 37, y: 7 }
];

/* ==========================================================================
   27.4 WHAT THEY SAY
   A node runs once, in order, when its `when` passes. An `ask` writes a flag,
   and every later line may read it. Lines are { no, en } or plain strings.
   A node may carry `buy` (a counter offer) or `give` (a gift).
   ========================================================================== */
export const BEK_TALK = {
  astrid: {
    nodes: [
      { id: 'a1', mood: 'warm',
        lines: [{ no: 'Hei! You are the one who took the old plot.', en: 'Hi! You are the one who took the old plot.' },
                { no: 'Nobody has turned that soil in six years.', en: 'Nobody has turned that soil in six years.', m: 'troubled' }],
        ask: { q: { no: 'Why did you come to Bekkedal?', en: 'Why did you come to Bekkedal?' }, opts: [
          { t: { no: 'For the quiet.', en: 'For the quiet.' }, set: { why: 'quiet' }, fr: 1,
            reply: ['Then you came to the right valley.',
                    { no: 'Take these. Potatoes forgive a beginner.', en: 'Take these. Potatoes forgive a beginner.' }],
            give: { potetfro: 6 } },
          { t: { no: 'Land was cheap.', en: 'Land was cheap.' }, set: { why: 'land' }, fr: 0,
            reply: ['Honest, at least. Ha!',
                    'Cheap land, cheap seed. Here.'],
            give: { potetfro: 8 } }
        ] } },
      { id: 'a2', when: S => S.q.potet === 'active',
        lines: [{ no: 'Five poteter and the board is happy.', en: 'Five potatoes and the board is happy.' }] },
      { id: 'a3', mood: 'warm', when: S => S.fr.astrid >= 3 && S.flag.why === 'quiet',
        lines: ['You still have not complained about the rain.',
                { no: 'That is how I know you meant it. Kaffe, on me.', en: 'That is how I know you meant it. Coffee, on me.' }],
        give: { kaffe: 2 } },
      { id: 'a4', when: S => S.fr.astrid >= 3 && S.flag.why === 'land',
        lines: ['You drive a hard bargain, so I will match it.',
                'Ten percent off, permanently. Do not tell Håkon.'],
        set: { rabatt: 1 } },
      { id: 'a5', mood: 'warm', when: S => S.fr.astrid >= 4,
        lines: [{ no: 'Jordbær seed came in. Slow, but it pays.', en: 'Strawberry seed came in. Slow, but it pays.' }],
        set: { jordbar: 1 } },
      { id: 'a6', mood: 'warm', when: S => S.fr.astrid >= 5,
        lines: ['You have made this a real farm. I am glad you stayed.'] }
    ],
    chat: [
      { mood: 'warm', t: [{ no: 'God morgen. The kettle is on.', en: 'Good morning. The kettle is on.' }] },
      { mood: 'troubled', t: ['Rain on Tuesday, my knee says so.'] },
      { t: ['The lantern is for the mine. Lars is down there.'] },
      { t: ['The road runs west to your gate and east to the water.'] },
      { t: ['Everything down here is a walk. Only the setra is a journey.'] },
      { t: [{ no: 'Åtte til åtte er jeg ved disken. Regner det, finn meg ved døren i stedet.', en: 'Eight to eight I am at the counter. If it rains, find me by the door instead.' }] },
      { mood: 'warm', t: ['You came for the quiet. It is still here.'], if: S => S.flag.why === 'quiet' },
      { mood: 'troubled', t: ['Land is cheap. Company is not.'], if: S => S.flag.why === 'land' },
      { t: ['Sigrid has wool up at the seter, if the vidda calls you.'], if: S => S.disc && S.disc.setra },
      { mood: 'warm', t: ['Håkon says you have been felling. Good.'], if: S => S.q.tommer === 'done' },
      /* the tau/spiker Astrid used to carry are Lars's stock too — freeing
         one shop row is what makes room for the sprinkler on this list
         without the shop panel growing past SHOP_ROWS */
      { t: [{ no: 'A bigger sekk carries more before your back complains.', en: 'A bigger bag carries more before your back complains.' }],
        if: S => !S.bagTier && S.fr.astrid >= 1,
        buy: { label: { no: 'STØRRE SEKK — 400 kr', en: 'BIGGER BAG — 400 kr' }, kr: 400, bagCapAdd: 40, bagTier: 1,
               ok: ['There. Room to breathe.'],
               no: ['400 kr. Ask me again later.'] } },
      { t: [{ no: 'There is a bigger sekk still, if the first was not enough.', en: 'There is a bigger bag still, if the first was not enough.' }],
        if: S => S.bagTier === 1 && S.fr.astrid >= 3,
        buy: { label: { no: 'STOR SEKK — 900 kr', en: 'BIG BAG — 900 kr' }, kr: 900, bagCapAdd: 60, bagTier: 2,
               ok: ['Now you can carry half the valley.'],
               no: ['900 kr. When you have it.'] } },
      { t: [{ no: 'A bigger kanne holds more, and waters three furrows at once.', en: 'A bigger can holds more, and waters three furrows at once.' }],
        if: S => !S.kanneLv && S.fr.astrid >= 2,
        buy: { label: { no: 'STOR VANNKANNE — 700 kr', en: 'BIG WATERING CAN — 700 kr' }, kr: 700, kanneLv: 1, waterMaxAdd: 15,
               ok: ['Mind your wrist. It is heavier full.'],
               no: ['700 kr. Come back when you have it.'] } },
      /* the four festival beats — one per season, gated on S.festival the
         same way every other chat line here gates on S.flag/S.fr. See
         BEK_FESTIVALS above for the day and the map dressing that goes with
         each. */
      { mood: 'warm', t: [{ no: 'Vårblot i dag! Se — noen har satt blomster på torget.', en: 'Spring Festival today! Look — someone has put flowers up in the square.' }],
        if: S => S.festival === 'var' },
      { mood: 'warm', t: [{ no: 'Solsnu i dag. Torget er pyntet for den lyseste natten.', en: 'Midsummer Fair today. The square is dressed for the lightest night.' }],
        if: S => S.festival === 'sommer' },
      { mood: 'warm', t: [{ no: 'Haustgilde i dag — takk for avlingen, før frosten tar den.', en: 'Harvest Fair today — thanks for the crop, before the frost takes it.' }],
        if: S => S.festival === 'host' },
      { mood: 'warm', t: [{ no: 'Juleblot i dag. Kaldt ute, men torget er pyntet likevel.', en: 'Midwinter Feast today. Cold out, but the square is dressed all the same.' }],
        if: S => S.festival === 'vinter' },
      /* Act II: one late beat per character acknowledging the finished
         house, gated on S.act2Unlocked exactly like the festival lines
         above gate on S.festival — a chat entry, not a node, so it keeps
         resurfacing rather than firing once and being spent. */
      { mood: 'warm', t: [{ no: 'Huset ved vannet står nå. Bra. Dalen trengte en skorstein til.', en: 'The house by the water is standing now. Good. This valley needed one more chimney.' }],
        if: S => S.act2Unlocked }
    ],
    shop: ['potetfro', 'nepefro', 'gulrotfro', 'kalfro', 'jordbarfro', 'rabarbrafro', 'kaffe', 'vaffel', 'lefse', 'lykt', 'sprinkler']
  },

  hakon: {
    nodes: [
      { id: 'h1',
        lines: ['Snekkeriet. I build what people can pay for.',
                { no: 'You will want a house eventually. They all do.', en: 'You will want a house eventually. They all do.', m: 'warm' }],
        ask: { q: { no: 'How should it be built?', en: 'How should it be built?' }, opts: [
          { t: { no: 'From the forest. I will fell it myself.', en: 'From the forest. I will fell it myself.' }, set: { build: 'skog' }, fr: 1,
            reply: ['Good. Timber you carry is timber you respect.',
                    { no: 'Thirty tømmer, twenty stein, and 5000 kr.', en: 'Thirty timber, twenty stone, and 5000 kr.' }] },
          { t: { no: 'Order the planks. I will pay.', en: 'Order the planks. I will pay.' }, set: { build: 'kjop' }, fr: 0,
            reply: ['City answer. Fine. It costs what it costs.',
                    { no: 'Twelve tømmer, ten stein, and 6500 kr.', en: 'Twelve timber, ten stone, and 6500 kr.' }] }
        ] } },
      { id: 'h2', when: S => S.q.tommer === 'active',
        lines: [{ no: 'Ten tømmer. The øks is by the stump, as always.', en: 'Ten timber. The axe is by the stump, as always.' }] },
      { id: 'h3', when: S => S.q.tommer === 'done' && !S.flag.lot,
        lines: [{ no: 'The lot by the water is for sale. 1200 kr.', en: 'The lot by the water is for sale. 1200 kr.' },
                'Trees on three sides, water on the fourth.',
                'Sign is down there. I will know when you have.'] },
      { id: 'h4', when: S => S.q.tommer === 'done' && S.axeLv < 2,
        lines: [{ no: 'The big gran need a STÅLØKS. I sell one for 900 kr.', en: 'The big firs need a STEEL AXE. I sell one for 900 kr.' }],
        buy: { label: { no: 'STÅLØKS — 900 kr', en: 'STEEL AXE — 900 kr' }, kr: 900, axeLv: 2,
               ok: ['Mind the swing. It bites deeper.'],
               no: ['900 kr. Come back when you have it.'] } },
      { id: 'h5', mood: 'warm', when: S => S.fr.hakon >= 4 && S.flag.build === 'skog',
        lines: ['Five hundred off the house. You did the felling, not me.'],
        set: { rabatt2: 1 } }
    ],
    chat: [
      { t: ['Mm.'] },
      { t: ['Wood moves in autumn. Build in summer.'] },
      { t: [{ no: 'Stein comes out of the gruva with the ore. Bring both.', en: 'Stone comes out of the mine with the ore. Bring both.' }] },
      { mood: 'warm', t: ['Timber you carry is timber you respect.'], if: S => S.flag.build === 'skog' },
      { mood: 'troubled', t: ['The planks are ordered. They come when they come.'], if: S => S.flag.build === 'kjop' },
      { t: [{ no: 'The ground south of your plot would till clean, if you wanted it broken.', en: 'The ground south of your plot would till clean, if you wanted it broken.' }],
        if: S => !S.flag.plot2 && S.q.tommer === 'done',
        buy: { label: { no: 'NYTT JORDE — 800 kr', en: 'NEW FIELD — 800 kr' }, kr: 800, flag: { plot2: 1 },
               ok: ['I will have it cleared by morning.'],
               no: ['800 kr. The ground will keep.'] } },
      { t: [{ no: 'Further out still, if the first field filled up fast.', en: 'Further out still, if the first field filled up fast.' }],
        if: S => S.flag.plot2 && !S.flag.plot3,
        buy: { label: { no: 'STØRRE JORDE — 1500 kr', en: 'BIGGER FIELD — 1500 kr' }, kr: 1500, flag: { plot3: 1 },
               ok: ['That is most of the flat ground gone now.'],
               no: ['1500 kr. No rush.'] } },
      { t: [{ no: 'A pen in the corner would keep animals off what you just cleared.', en: 'A pen in the corner would keep animals off what you just cleared.' }],
        if: S => S.flag.plot3 && !S.flag.barn,
        buy: { label: { no: 'DYREINNHEGNING — 1100 kr', en: 'ANIMAL PEN — 1100 kr' }, kr: 1100, flag: { barn: 1 },
               ok: ['Fenced and strawed. Sigrid will sell you what goes in it.'],
               no: ['1100 kr. The fence will keep.'] } },
      /* Act II: the pen's second tier — kr-only, so the generic `buy` offer
         fits (unlike the house tier itself, which spends tømmer/stein too
         and stays in hakonBuild()). Gated on S.flag.barn so it only ever
         follows the first pen, and S.act2Unlocked so it cannot outrun the
         house. See BEK_BARN_PLOT2/BEK_BARN_SLOTS2 above. */
      { t: [{ no: 'Nå som du har eget tak, kunne innhegningen godt vokse også.', en: 'Now that you have a roof of your own, the pen could stand to grow too.' }],
        if: S => S.act2Unlocked && S.flag.barn && !S.flag.barn2,
        buy: { label: { no: 'DYREINNHEGNING II — 1400 kr', en: 'ANIMAL PEN II — 1400 kr' }, kr: 1400, flag: { barn2: 1 },
               ok: ['Doubled it. Sigrid will be glad to hear it.'],
               no: ['1400 kr. It will keep.'] } },
      { mood: 'warm', t: [{ no: 'Huset står i vinkel. Jeg sjekket, da du ikke så på.', en: 'The house stands square. I checked, when you weren’t looking.' }],
        if: S => S.act2Unlocked }
    ]
  },

  ingrid: {
    nodes: [
      { id: 'i1',
        lines: [{ no: 'God kveld. Or morning. Out here it is the same.', en: 'Good evening. Or morning. Out here it is the same.' }],
        ask: { q: { no: 'Why do you fish?', en: 'Why do you fish?' }, opts: [
          { t: { no: 'For the calm.', en: 'For the calm.' }, set: { fisk: 'ro' }, fr: 1,
            reply: ['Then stand at the end of the pier, not the middle.',
                    { no: 'The laks lie deep out there. Bring me three sopp', en: 'The salmon lie deep out there. Bring me three mushrooms' },
                    { no: 'and the old stang is yours.', en: 'and the old rod is yours.' }] },
          { t: { no: 'For the food.', en: 'For the food.' }, set: { fisk: 'mat' }, fr: 0,
            reply: ['Sensible. I will keep you fed while you learn.',
                    { no: 'Three sopp from the forest, and you get the stang.', en: 'Three mushrooms from the forest, and you get the rod.' }] }
        ] } },
      { id: 'i2', when: S => S.q.sopp === 'active',
        lines: [{ no: 'Three sopp. The skogen is full of them at dawn.', en: 'Three mushrooms. The forest is full of them at dawn.' }] },
      { id: 'i3', mood: 'warm', when: S => S.fr.ingrid >= 3 && S.flag.fisk === 'ro',
        lines: ['You have learned to wait. That is all fishing is.'] },
      { id: 'i4', mood: 'warm', when: S => S.fr.ingrid >= 3 && S.flag.fisk === 'mat',
        lines: ['Here. You still eat like a man who forgets to.'],
        give: { vaffel: 2 } },
      { id: 'i5', when: S => S.fr.ingrid >= 4,
        lines: [{ no: 'Røye run in the cold tarn up on the vidda. Colder, sweeter.', en: 'Char run in the cold tarn up on the plateau. Colder, sweeter.' }] }
    ],
    chat: [
      { t: ['Still biting. Slowly.'] },
      { mood: 'troubled', t: ['The lot behind you has been empty a long time.'] },
      { t: ['Deep water, deep fish. Patience.'], if: S => S.flag.fisk === 'ro' },
      { mood: 'troubled', t: [{ no: 'Eat something that is not a potet.', en: 'Eat something that is not a potato.' }], if: S => S.flag.fisk === 'mat' },
      { t: ['Olav could take you to the fjord, if his boat floated.'] },
      { t: [{ no: 'Du bygde nært nok til at jeg ser lykten din fra brygga.', en: 'You built close enough that I can see your lamp from the pier.' }],
        if: S => S.act2Unlocked }
    ]
  },

  olav: {
    nodes: [
      { id: 'o1', mood: 'troubled',
        lines: ['The boat leaks. Everything out here leaks, eventually.'],
        ask: { q: { no: 'The fjord, or the open sea?', en: 'The fjord, or the open sea?' }, opts: [
          { t: { no: 'The open sea. I want the big ones.', en: 'The open sea. I want the big ones.' }, set: { sea: 'hav' }, fr: 1,
            reply: [{ no: 'A bold answer. Makrell run in shoals out past the mouth.', en: 'A bold answer. Mackerel run in shoals out past the mouth.' },
                    { no: 'Fix my boat and I will point you at them. Four tømmer, two tau.', en: 'Fix my boat and I will point you at them. Four timber, two rope.' }] },
          { t: { no: 'The fjord. Calm water suits me.', en: 'The fjord. Calm water suits me.' }, set: { sea: 'fjord' }, fr: 0,
            reply: [{ no: 'Sensible. Torsk sit still and wait, like you.', en: 'Sensible. Cod sit still and wait, like you.' },
                    { no: 'Patch the boat — four tømmer, two tau — and it is yours to borrow.', en: 'Patch the boat — four timber, two rope — and it is yours to borrow.' }] }
        ] } },
      { id: 'o2', when: S => S.q.boat === 'active',
        lines: [{ no: 'Four tømmer, two tau. Astrid sells the tau.', en: 'Four timber, two rope. Astrid sells the rope.' }] },
      { id: 'o3', when: S => S.flag.boat && S.fr.olav >= 3 && S.flag.sea === 'hav',
        lines: [{ no: 'Cast off the end of the dock. The makrell will find you.', en: 'Cast off the end of the dock. The mackerel will find you.' }] },
      { id: 'o4', mood: 'warm', when: S => S.flag.boat && S.fr.olav >= 3 && S.flag.sea === 'fjord',
        lines: ['Warm soup, for the crossings. You will thank me.'],
        give: { fiskesuppe: 1 } }
    ],
    chat: [
      { mood: 'troubled', t: ['Water finds every gap you leave it.'] },
      { t: ['The pier is Ingrid\u2019s. The dock at the fjord is mine.'] },
      { mood: 'warm', t: [{ no: 'Boat floats now. Take it whenever. Pier\u2019s end, press act.', en: 'Boat floats now. Take it whenever. Pier\u2019s end, press act.' }], if: S => S.flag.boat },
      { t: [{ no: 'Et hus ved vannet finner sine egne lekkasjer ogs\u00e5, med tiden. Sjekk taket.', en: 'A house by the water finds its own leaks eventually too. Mind the roof.' }],
        if: S => S.act2Unlocked }
    ]
  },

  marit: {
    nodes: [
      { id: 'm1', mood: 'warm',
        lines: ['You found the old church. Most only find the meadow.',
                'The stave has stood eight hundred winters. It leans, but it stands.'],
        ask: { q: { no: 'Why did you climb all the way up here?', en: 'Why did you climb all the way up here?' }, opts: [
          { t: { no: 'Someone I remember.', en: 'Someone I remember.' }, set: { marit: 'minne' }, fr: 1,
            reply: ['Then pick them a bouquet. One blåklokke, one soleie, one revebjelle.',
                    'Bring the three, and I will know the flowers found the right hands.'] },
          { t: { no: 'Just the quiet up here.', en: 'Just the quiet up here.' }, set: { marit: 'ro' }, fr: 0,
            reply: ['The quiet keeps. Still — pick me three: blåklokke, soleie, revebjelle.',
                    'An old woman likes colour on the sill.'] }
        ] } },
      { id: 'm2', when: S => S.q.blomst === 'active',
        lines: [{ no: 'One of each. They open at first light, all over the enga.', en: 'One of each. They open at first light, all over the meadow.' }] },
      { id: 'm3', mood: 'troubled', when: S => S.fr.marit >= 3 && S.flag.marit === 'minne',
        lines: ['You carry it well. Grief and gardening are the same craft.',
                { no: 'Her — urter til gryta. De vokser der jeg plantet hennes favoritter.', en: 'Here — herbs for the pot. They grow where I planted her favourites.', m: 'warm' }],
        give: { urt: 3 } },
      { id: 'm4', mood: 'warm', when: S => S.fr.marit >= 3 && S.flag.marit === 'ro',
        lines: ['You have found the quiet, then. It suits the valley on you.'] }
    ],
    chat: [
      { mood: 'troubled', t: ['The bells only ring at midsummer now. Nobody minds.'] },
      { t: [{ no: 'Blåklokke, soleie, revebjelle. The meadow keeps them all.', en: 'Harebell, buttercup, foxglove. The meadow keeps them all.' }] },
      { t: ['Flowers picked at dawn last longest. An old trick.'] },
      { mood: 'warm', t: ['Colour on the sill. That is all an old house needs.'], if: S => S.q.blomst === 'done' },
      { t: [{ no: 'Blomster på karmen og et tak over dem begge. Mer trenger ikke et hus.', en: 'Flowers on the sill and a roof over them both. That is all any house needs.' }],
        if: S => S.act2Unlocked }
    ]
  },

  sigrid: {
    nodes: [
      { id: 's1',
        lines: ['Up here it is goats, brown cheese and weather. In that order.'],
        ask: { q: { no: 'Milk or wool — what do you keep them for?', en: 'Milk or wool — what do you keep them for?' }, opts: [
          { t: { no: 'Milk. The brunost is worth the climb.', en: 'Milk. The brown cheese is worth the climb.' }, set: { dairy: 'melk' }, fr: 1,
            reply: [{ no: 'A cheese answer. Bring me five multe and I will feed you well.', en: 'A cheese answer. Bring me five cloudberries and I will feed you well.' },
                    { no: 'The multe grow right here on the setra, gold in the grass.', en: 'The cloudberries grow right here on the dairy meadow, gold in the grass.' }] },
          { t: { no: 'Wool. The winters are long.', en: 'Wool. The winters are long.' }, set: { dairy: 'ull' }, fr: 0,
            reply: [{ no: 'A sensible answer. Five multe, and the vidda stops frightening you.', en: 'A sensible answer. Five cloudberries, and the plateau stops frightening you.' }] }
        ] } },
      { id: 's2', when: S => S.q.multe === 'active',
        lines: [{ no: 'Five multe. They ripen on the setra by morning.', en: 'Five cloudberries. They ripen on the dairy meadow by morning.' }] },
      { id: 's3', when: S => S.q.multe === 'done' && !S.flag.rabarbra,
        lines: [{ no: 'Astrid has rabarbra seed now, on my word. Slow, but rich.', en: 'Astrid has rhubarb seed now, on my word. Slow, but rich.' }],
        set: { rabarbra: 1 } },
      { id: 's4', mood: 'warm', when: S => S.fr.sigrid >= 3 && S.flag.dairy === 'melk',
        lines: ['Cloudberry cream. Eat it slow.'],
        give: { multekrem: 1 } },
      { id: 's5', mood: 'warm', when: S => S.fr.sigrid >= 3 && S.flag.dairy === 'ull',
        lines: [{ no: 'A genser, knitted this winter. Now the wind up top is only wind.', en: 'A sweater, knitted this winter. Now the wind up top is only wind.' }],
        give: { ullgenser: 1 } }
    ],
    chat: [
      { mood: 'warm', t: ['Mind the goats. They will eat your bootlaces.'] },
      { mood: 'troubled', t: [{ no: 'Multe first, then the vidda. In that order, or you freeze.', en: 'Cloudberries first, then the plateau. In that order, or you freeze.' }] },
      { t: ['A wool genser is all that stands between you and the wind.'] },
      /* why the map is still a menu for this one place: the valley floor you
         walk field to field (see the seams in maps.js), but the setra is
         three hours of track and the walk is the point of it */
      { t: ['Three hours up that track. Nobody drops in by accident.'] },
      { t: ['You have walked it once. Now set a morning aside and go.'] },
      { t: [{ no: 'Åtte til åtte, meieriet er åpent. Om vinteren finner du meg i dalen i stedet.', en: 'Eight to eight, the dairy is open. Come winter you will find me down in the valley instead.' }] },
      { mood: 'troubled', t: ['You smell of the mine. Say hello to Lars for me.'], if: S => S.disc && S.disc.gruva },
      { t: [{ no: 'Håkon fences it, I stock it. Geit or høne, your pen.', en: 'Håkon fences it, I stock it. Goat or chicken, your pen.' }],
        if: S => S.flag.barn },
      { t: [{ no: 'De sier huset ved vannet er ferdig. På tide. En bonde trenger vegger som ikke er sine egne armer.', en: 'They tell me the house by the water is finished. About time. A farmer needs walls that are not their own two arms.' }],
        if: S => S.act2Unlocked }
    ],
    shop: ['brunost', 'ullgenser', 'multekrem', 'lefse', 'dyrefor', 'geit', 'hone']
  },

  gunnar: {
    nodes: [
      { id: 'g1', mood: 'troubled',
        lines: ['Few come up onto the vidda on purpose. Fewer twice.'],
        ask: { q: { no: 'Do you trap up here, or watch?', en: 'Do you trap up here, or watch?' }, opts: [
          { t: { no: 'Trap. A living is a living.', en: 'Trap. A living is a living.' }, set: { fell: 'jakt' }, fr: 1,
            reply: [{ no: 'Honest. Tyttebær grow thick past the tarn. Sell them low, sell them often.', en: 'Honest. Lingonberries grow thick past the tarn. Sell them low, sell them often.' }] },
          { t: { no: 'Watch. It is enough to be here.', en: 'Watch. It is enough to be here.' }, set: { fell: 'sjaa' }, fr: 0,
            reply: ['Then you already understand the plateau. Reindeer at dusk, if you are still.'] }
        ] } },
      { id: 'g2', mood: 'warm', when: S => S.fr.gunnar >= 3 && S.flag.fell === 'jakt',
        lines: [{ no: 'Take the wool. The tyttebær are worth more when your hands still work.', en: 'Take the wool. The lingonberries are worth more when your hands still work.' }],
        give: { ull: 2 } },
      { id: 'g3', mood: 'warm', when: S => S.fr.gunnar >= 3 && S.flag.fell === 'sjaa',
        lines: ['Stand at the tarn at dusk. You will see what I stay up here for.'] }
    ],
    chat: [
      { mood: 'troubled', t: ['Wind from the north. There is always wind from the north.'] },
      { t: [{ no: 'Røye in the tarn. Tyttebær in the heather. The vidda provides.', en: 'Char in the tarn. Lingonberries in the heather. The plateau provides.' }] },
      { mood: 'troubled', t: ['You wore the wool. Good. I have buried men who did not.'] },
      /* the other half of the same argument Sigrid makes below the treeline */
      { t: ['Down the valley you walk field to field. Up here you set out.'] },
      { t: ['Half a day is the climb. That half is why it stays empty.'] },
      { t: [{ no: 'Hørte huset ditt er ferdig. Bra. Nå har du noe å komme tilbake til.', en: 'Heard your house is finished. Good. Now you have somewhere to come back to.' }],
        if: S => S.act2Unlocked }
    ]
  },

  lars: {
    nodes: [
      { id: 'l1', mood: 'troubled',
        lines: ['Watch your head. The good copper is where the ceiling is lowest.'],
        ask: { q: { no: 'Silver, or stone?', en: 'Silver, or stone?' }, opts: [
          { t: { no: 'Silver. I came for the sølv.', en: 'Silver. I came for the silver.' }, set: { mine: 'solv' }, fr: 1,
            reply: [{ no: 'A greedy answer. I like it. Rich veins glitter — you will know them.', en: 'A greedy answer. I like it. Rich veins glitter — you will know them.' }] },
          { t: { no: 'Stone. A house needs walls.', en: 'Stone. A house needs walls.' }, set: { mine: 'stein' }, fr: 0,
            reply: [{ no: 'A builder. Good. Every swing gives stein along with the ore.', en: 'A builder. Good. Every swing gives stone along with the ore.' }] }
        ] } },
      { id: 'l2', when: S => !S.tools.hakke,
        lines: [{ no: 'You will need a HAKKE. I sell one for 400 kr.', en: 'You will need a PICK. I sell one for 400 kr.' }],
        buy: { label: { no: 'HAKKE — 400 kr', en: 'PICK — 400 kr' }, kr: 400, tool: 'hakke', pickLv: 1,
               ok: ['Swing at the veins, not the walls.'],
               no: ['400 kr. The ore is not going anywhere.'] } },
      { id: 'l3', when: S => S.tools.hakke && !S.q.jern && S.pickLv < 2,
        lines: [{ no: 'Bring me six jern and I will forge you a STÅLHAKKE.', en: 'Bring me six iron and I will forge you a STEEL PICK.' },
                { no: 'The rich veins — the sølv — need steel to crack.', en: 'The rich veins — the silver — need steel to crack.' }],
        open: 'jern' },
      { id: 'l4', mood: 'warm', when: S => S.fr.lars >= 3 && S.flag.mine === 'stein' && S.pickLv < 2,
        lines: [{ no: 'For a builder, the steel is cheaper. Four jern, not six.', en: 'For a builder, the steel is cheaper. Four iron, not six.' }],
        set: { steelcut: 1 } }
    ],
    chat: [
      { t: ['Mm. Deeper is darker. Darker is richer.'] },
      { t: [{ no: 'Kobber sells well in town. Sølv sells better anywhere.', en: 'Copper sells well in town. Silver sells better anywhere.' }] },
      { t: [{ no: 'Åtte til åtte jeg er ved gruveåpningen. Etter det er jeg lenger inne, og sover.', en: 'Eight to eight I am at the adit. After that I am further in, asleep.' }] },
      { t: [{ no: 'The rich veins glitter. You need steel for those.', en: 'The rich veins glitter. You need steel for those.' }], if: S => S.pickLv < 2 },
      { mood: 'warm', t: ['Steel in your hands now. The whole mountain is yours.'], if: S => S.pickLv >= 2 },
      { t: [{ no: 'De sier huset ditt står. Halve steinen bar du ut herfra selv.', en: 'They tell me your house stands. Half the stone you carried out of here yourself.' }],
        if: S => S.act2Unlocked }
    ],
    shop: ['spiker', 'tau']
  }
};

/* ---- 27.5 the quests ----------------------------------------------------- */
export const BEK_QUESTS = [
  { id: 'potet',  who: 'astrid', need: { potet: 5 },  kr: 200, fr: 1,
    t: { no: 'FEM POTETER — Astrid', en: 'FIVE POTATOES — Astrid' },
    d: { no: 'Bring Astrid five poteter.', en: 'Bring Astrid five potatoes.' } },
  { id: 'sopp',   who: 'ingrid', need: { sopp: 3 },   kr: 0,   fr: 1, tool: 'stang',
    t: { no: 'TRE SOPP — Ingrid', en: 'THREE MUSHROOMS — Ingrid' },
    d: { no: 'Bring Ingrid three sopp. She keeps a spare stang.', en: 'Bring Ingrid three mushrooms. She keeps a spare rod.' } },
  { id: 'blomst', who: 'marit',  need: { blomst_bla: 1, blomst_gul: 1, blomst_ro: 1 }, kr: 150, fr: 1, grant: { item: { urt: 2 } },
    t: { no: 'EN BUKETT — Marit', en: 'A BOUQUET — Marit' },
    d: { no: 'Pick Marit one blåklokke, one soleie, one revebjelle.', en: 'Pick Marit one harebell, one buttercup, one foxglove.' } },
  { id: 'tommer', who: 'hakon',  need: { tommer: 10 }, kr: 500, fr: 1,
    t: { no: 'TI TØMMER — Håkon', en: 'TEN TIMBER — Håkon' },
    d: { no: 'Fell ten tømmer in the skogen for Håkon.', en: 'Fell ten timber in the forest for Håkon.' } },
  { id: 'multe',  who: 'sigrid', need: { multe: 5 },  kr: 300, fr: 1,
    t: { no: 'FEM MULTE — Sigrid', en: 'FIVE CLOUDBERRIES — Sigrid' },
    d: { no: 'Bring Sigrid five multe from the setra.', en: 'Bring Sigrid five cloudberries from the dairy meadow.' } },
  { id: 'boat',   who: 'olav',   need: { tommer: 4, tau: 2 }, kr: 0, fr: 1, grant: { flag: { boat: 1 } },
    t: { no: 'BÅTEN — Olav', en: 'THE BOAT — Olav' },
    d: { no: 'Patch Olav\u2019s boat: four tømmer, two tau.', en: 'Patch Olav\u2019s boat: four timber, two rope.' } },
  { id: 'jern',   who: 'lars',   need: { jern: 6 },   kr: 0,   fr: 1, grant: { pickLv: 2 },
    t: { no: 'SEKS JERN — Lars', en: 'SIX IRON — Lars' },
    d: { no: 'Bring Lars six jern for a stålhakke.', en: 'Bring Lars six iron for a steel pick.' } }
];

/* ---- 27.5a the quest board -------------------------------------------------
   A repeatable layer on top of the fixed list above, never a replacement for
   it — BEK_QUESTS keeps first claim on the board (see boardRows() in
   quests.js). BEK_QUEST_TEMPLATES is N shapes of quest: an item pool, a
   quantity range, and — for the two templates that need one — the stage
   gate that makes the pool obtainable at all. `tool`/`animal` read the same
   way BEK_RECIPES' `fr`/`lvl` do: declared here, checked read-only in
   quests.js, never set directly.

   quests.js rolls BEK_QUEST_BOARD_MIN..MAX instances into S.rq — item,
   quantity and requester (an NPC id, same `who` contract as above) all
   picked at random from whichever templates are obtainable right now — and
   replaces the whole batch together every BEK_QUEST_REFRESH_DAYS days, so
   the board turns over on a fixed in-game weekday rather than piecemeal.
   -------------------------------------------------------------------------- */
export const BEK_QUEST_BOARD_MIN = 2;
export const BEK_QUEST_BOARD_MAX = 3;
export const BEK_QUEST_REFRESH_DAYS = 7;

export const BEK_QUEST_TEMPLATES = [
  { id: 'crops',  items: ['potet', 'nepe', 'gulrot', 'kal', 'jordbar', 'rabarbra'], qty: [3, 8] },
  { id: 'forage', items: ['sopp', 'kantarell', 'blabar', 'multe', 'tyttebar', 'tang', 'urt'], qty: [3, 10] },
  { id: 'blomst', items: ['blomst_bla', 'blomst_gul', 'blomst_ro'], qty: [1, 3] },
  { id: 'wood',   items: ['tommer'], qty: [4, 12] },
  /* mining needs a hakke at all (index.js act()'s hakke branch) */
  { id: 'ore',    items: ['jern', 'kobber', 'solv'], qty: [2, 6], tool: 'hakke' },
  /* fishing needs a stang at all (index.js act()'s stang branch) */
  { id: 'fish',   items: ['orret', 'laks', 'roye', 'torsk', 'makrell'], qty: [2, 6], tool: 'stang' },
  /* dairy/wool/eggs come off an owned, tended animal (tendAnimal() in index.js) */
  { id: 'dairy',  items: ['melk', 'ull', 'egg'], qty: [2, 5], animal: 1 },
  /* Act II: two higher-tier templates, gated `act2` — read exactly like
     `tool`/`animal` above (quests.js's templateAvailable(), read-only, never
     set directly) but against S.act2Unlocked instead of an owned tool. Both
     draw from item pools worth several times a normal template's, so the
     reward formula (questReward(), unchanged) already scales them up without
     a second formula — a rich vein or a rare fish just carries a bigger
     number through the same markup every other quest uses. */
  { id: 'rich_ore',  items: ['kobber', 'solv'], qty: [3, 6], tool: 'hakke', act2: true },
  { id: 'rare_fish', items: ['kveite', 'gullorret'], qty: [1, 2], tool: 'stang', act2: true }
];

/* ==========================================================================
   27.5b RECIPES — player-side crafting and cooking, at the chest ('K' on
   the farm map, see 27.1e above)
   --------------------------------------------------------------------------
   Two pools, one per column of the crafting panel (index.js's `mode ===
   'craft'`, drawn by menus.js's drawCraft — the shop panel's own layout and
   input, not a new one). `need` and `out` are BEK_ITEMS ids the player can
   actually hold, same rule as a quest's `need`. `qty` is how many `out` one
   craft yields, default 1.

   `fr`/`lvl` gate a recipe exactly the way a BEK_TALK node gates on
   friendship: read-only here, raised only through the paths that already
   raise S.fr (dialogue choices, quests) and S.lvl (addXp in index.js). No
   recipe spends kr — crafting has no currency of its own.
   ========================================================================== */
export const BEK_RECIPES = {
  craft: [
    { id: 'sprinkler', out: 'sprinkler', qty: 1, need: { tommer: 4, jern: 1 },
      fr: { npc: 'astrid', min: 2 }, lvl: { kind: 'farm', min: 1 } },
    { id: 'gjerde',     out: 'gjerde',   qty: 1, need: { tommer: 3, spiker: 4 },
      fr: { npc: 'hakon',  min: 1 }, lvl: { kind: 'mine', min: 1 } },
    { id: 'dyrefor',    out: 'dyrefor',  qty: 3, need: { potet: 1, nepe: 1 },
      fr: { npc: 'sigrid', min: 1 }, lvl: { kind: 'farm', min: 1 } }
  ],
  /* one raw crop plus one animal product each, and every dish restores more
     than the best shop food does (multekrem's 110) — see BEK_ITEMS */
  cook: [
    { id: 'potetstuing',  out: 'potetstuing',  qty: 1, need: { potet: 2, melk: 1 },
      fr: { npc: 'sigrid', min: 2 }, lvl: { kind: 'farm', min: 1 } },
    { id: 'gulrotkake',   out: 'gulrotkake',   qty: 1, need: { gulrot: 1, egg: 1 },
      fr: { npc: 'sigrid', min: 3 }, lvl: { kind: 'farm', min: 2 } },
    { id: 'rabarbragrot', out: 'rabarbragrot', qty: 1, need: { rabarbra: 1, melk: 1 },
      fr: { npc: 'sigrid', min: 4 }, lvl: { kind: 'farm', min: 3 } }
  ]
};

/* The finished house, drawn straight over the lake lot — same rows-shaped
   overlay as before, only as wide and as tall as the water map now is.
   The lot, the sign at the foot of it and the door at (5,4) are exactly
   where they have always been: the bay grew east and south around them,
   so a save that had already bought the lot still looks out on it. */
export const BEK_HOUSE = [
  '                                              ',
  '                                              ',
  '   RRRRR                                      ',
  '   HHHHH                                      ',
  '   HHDHH                                      ',
  '                                              ',
  '                                              ',
  '                                              ',
  '                                              ',
  '                                              ',
  '                                              ',
  '                                              ',
  '                                              ',
  '                                              ',
  '                                              ',
  '                                              ',
  '                                              ',
  '                                              ',
  '                                              ',
  '                                              ',
  '                                              ',
  '                                              ',
  '                                              ',
  '                                              ',
  '                                              ',
  '                                              '
];

/* ---- footstep recipes -----------------------------------------------------
   What the ground is made of, as a noise-filter recipe: `ambience.js` picks
   the key (grass/path/boards/pier/stone/snow/water) from the tile glyph and
   the map it's on, this table only says what that key sounds like. `ms`/
   `freq`/`q`/`vol` feed straight into `Snd.noise()`; the optional `tone` is a
   second, quieter `Snd.tone()` layered on top — a hollow knock for wood, a
   soft plip for water — for the two materials a filtered noise burst alone
   doesn't sell. */
export const BEK_STEP_SOUNDS = {
  grass:  { ms: 16, freq: 700,  q: 1.0, vol: 0.011 },
  path:   { ms: 20, freq: 420,  q: 1.3, vol: 0.015 },
  boards: { ms: 12, freq: 1500, q: 2.4, vol: 0.012,
            tone: { f: 130, ms: 45, type: 'triangle', to: 85, vol: 0.02 } },
  pier:   { ms: 14, freq: 1250, q: 2.0, vol: 0.013,
            tone: { f: 160, ms: 55, type: 'triangle', to: 100, vol: 0.018 } },
  stone:  { ms: 24, freq: 360,  q: 0.9, vol: 0.017 },
  snow:   { ms: 30, freq: 2600, q: 0.5, vol: 0.013 },
  water:  { ms: 34, freq: 1900, q: 0.5, vol: 0.02,
            tone: { f: 500, ms: 60, type: 'sine', to: 260, vol: 0.014 } }
};
