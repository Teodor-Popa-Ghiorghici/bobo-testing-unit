import { ATMO, GRASS, DRY, CON, TIM, STO, SOI, WAT, SAN, SNO, WAR } from './palette.js';

/* ---- geometry -------------------------------------------------------------
 * The map is 24x15 tiles and that never changes: every row string in
 * BEK_MAPS, every NPC and goat position, and every per-tile key in S.soil /
 * S.felled / S.mined / S.picked / S.drops is a grid coordinate, not a pixel.
 *
 * Tile art and sprites are still authored on the original 20px tile
 * (BEK_T_SRC). They reach the screen through a whole-number BEK_ART_SCALE
 * transform, so nothing in the art had to be redrawn to raise the resolution
 * and the diff stays readable. Phase 3 redraws them at native density and
 * BEK_ART_SCALE goes to 1.
 *
 * 24 tiles x 40px is exactly the 960px canvas width, so the camera never
 * scrolls horizontally. 15 tiles x 40px is 600px against a 480px viewport,
 * which leaves BEK_CAM_MAX_Y of vertical travel — the camera follows the
 * player down the valley and clamps at both ends.
 */
export const BEK_T_SRC = 20;                              /* art authoring tile */
export const BEK_ART_SCALE = 2;                           /* source px -> screen px */
export const BEK_T = BEK_T_SRC * BEK_ART_SCALE;           /* 40 — presented tile */
export const BEK_COLS = 24, BEK_ROWS = 15;                /* the map, untouched */

export const BEK_MAP_W = BEK_COLS * BEK_T;                /* 960 */
export const BEK_MAP_H = BEK_ROWS * BEK_T;                /* 600 */

export const BEK_W = BEK_MAP_W;                           /* 960 — exact fit */
export const BEK_H = BEK_W * 9 / 16;                      /* 540 — 16:9 */

/* The two HUD bands are reserved chrome: the playfield no longer draws
   underneath them, so nothing the player needs is ever hidden by the status
   strip the way it was when both overlaid the top and bottom map rows. */
export const BEK_HUD_H = 30;                              /* height of one band */
export const BEK_VIEW_X = 0;
export const BEK_VIEW_Y = BEK_HUD_H;
export const BEK_VIEW_W = BEK_W;                          /* 960 */
export const BEK_VIEW_H = BEK_H - BEK_HUD_H * 2;          /* 480 */
export const BEK_CAM_MAX_X = Math.max(0, BEK_MAP_W - BEK_VIEW_W);   /* 0 */
export const BEK_CAM_MAX_Y = Math.max(0, BEK_MAP_H - BEK_VIEW_H);   /* 120 */

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
  /* food you eat */
  kaffe:      { name: { no: 'KAFFE',      en: 'COFFEE'       }, buy: 40,  sell: 12, eat: 35,  icon: 'cup',  col: 6  },
  vaffel:     { name: { no: 'VAFFEL',     en: 'WAFFLE'       }, buy: 65,  sell: 20, eat: 65,  icon: 'food', col: 14 },
  lefse:      { name: { no: 'LEFSE',      en: 'LEFSE'        }, buy: 50,  sell: 16, eat: 50,  icon: 'food', col: 7  },
  fiskesuppe: { name: { no: 'FISKESUPPE', en: 'FISH SOUP'    }, buy: 90,  sell: 30, eat: 95,  icon: 'bowl', col: 11 },
  multekrem:  { name: { no: 'MULTEKREM',  en: 'CLOUDB. CREAM'}, buy: 120, sell: 40, eat: 110, icon: 'bowl', col: 14 },
  /* worn / carried gear (no sell) */
  lykt:       { name: { no: 'LYKT',       en: 'LANTERN'      }, icon: 'lamp', col: 14 },
  ullgenser:  { name: { no: 'ULLGENSER',  en: 'WOOL SWEATER' }, icon: 'shirt', col: 4 },
  bukett:     { name: { no: 'BUKETT',     en: 'BOUQUET'      }, icon: 'flower', col: 13 }
};

/* which items are seeds, in the order the planter cycles them */
export const BEK_SEED_ORDER = ['potetfro', 'nepefro', 'gulrotfro', 'kalfro', 'jordbarfro', 'rabarbrafro'];

/* `col` is what the ripe head is drawn in — a palette index, and deliberately
   one per crop you can tell apart across a field at a glance. */
export const BEK_CROPS = {
  potet:    { days: 3, out: 'potet',    col: SAN[1] },
  nepe:     { days: 2, out: 'nepe',     col: SNO[0] },
  gulrot:   { days: 4, out: 'gulrot',   col: WAR[3] },
  kal:      { days: 4, out: 'kal',      col: GRASS[4] },
  jordbar:  { days: 5, out: 'jordbar',  col: WAR[2], regrow: 2 },
  rabarbra: { days: 6, out: 'rabarbra', col: WAR[1], regrow: 3 }
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
  { id: 'hakke', name: { no: 'HAKKE',      en: 'PICK'     }, e: 5 }
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
export const BEK_MAPS = {
  "farm": {
    "title": {
      "no": "GÅRDEN",
      "en": "THE FARM"
    },
    "rows": [
      "TTTTTTTTTTTTTTTTTTTTTTTT",
      "TggggggggggggggggFgggggT",
      "TgRRRRRgggffffffffffgggT",
      "TgHHHHHgggffffffffffgggT",
      "TgHHDHHgggffffffffffgggT",
      "Tggg.gggggffffffffffgggT",
      "Tggo.gggggffffffffffgggT",
      "Tggg.gggggggggggggggggg.",
      "Tgggggggggggggggggggggg.",
      "TggggggggggggggggggggggT",
      "TgFgggggggggggggggFggggT",
      "Tggggggggggg,,gggggggggT",
      "Tggggggggggg,,gggggggggT",
      "TgFgggggggggggggggggggGT",
      "TTTTTTTTTTTTTTTTTTTTTTTT"
    ],
    "exits": [
      {
        "x": 23,
        "y": 7,
        "to": "town",
        "tx": 1,
        "ty": 7
      },
      {
        "x": 23,
        "y": 8,
        "to": "town",
        "tx": 1,
        "ty": 8
      }
    ],
    "door": {
      "x": 4,
      "y": 4,
      "to": "farmhouse",
      "tx": 11,
      "ty": 9
    }
  },
  "town": {
    "title": {
      "no": "BEKKEDAL",
      "en": "BEKKEDAL"
    },
    "rows": [
      "TTTTTTT..TTTTTTTTTTTTTTT",
      "TggggFg..gFggggggggggggT",
      "TgRRRRgggggggggggggggggT",
      "TgHDHHgggggggggggggggggT",
      "Tgg.ggggggggTFFFTggggFgT",
      "Tgg.goggggggJgggJggggggT",
      "Tgg.ggggggggTFFFTggggggT",
      "........................",
      "........................",
      "TgggggggggggggggRRRRgggT",
      "TgFgggggggggggggHHDHgggT",
      "Tgggggggggggggggg.gggggT",
      "TggggggggggggggggggFgggT",
      "Tgggggg..ggggggggggggggT",
      "TTTTTTT..TTTTTTTTTTTTTTT"
    ],
    "exits": [
      {
        "x": 7,
        "y": 0,
        "to": "forest",
        "tx": 7,
        "ty": 13
      },
      {
        "x": 8,
        "y": 0,
        "to": "forest",
        "tx": 8,
        "ty": 13
      },
      {
        "x": 0,
        "y": 7,
        "to": "farm",
        "tx": 22,
        "ty": 7
      },
      {
        "x": 0,
        "y": 8,
        "to": "farm",
        "tx": 22,
        "ty": 8
      },
      {
        "x": 23,
        "y": 7,
        "to": "lake",
        "tx": 1,
        "ty": 7
      },
      {
        "x": 23,
        "y": 8,
        "to": "lake",
        "tx": 1,
        "ty": 8
      },
      {
        "x": 7,
        "y": 14,
        "to": "enga",
        "tx": 7,
        "ty": 1
      },
      {
        "x": 8,
        "y": 14,
        "to": "enga",
        "tx": 8,
        "ty": 1
      }
    ]
  },
  "lake": {
    "title": {
      "no": "VANNET",
      "en": "THE WATER"
    },
    "rows": [
      "TTTTTTTTTTTTTTTTTTTTTTTT",
      "TggggggggWWWWWWWWWWWWWWW",
      "TggggggggWWWWWWWWWWWWWWW",
      "TggLLLLLgWWWWWWWWWWWWWWW",
      "TggLLLLLgWWWWWWWWWWWWWWW",
      "TggLLLLLgWWWWWWWWWWWWWWW",
      "TgggSggggWWWWWWWWWWWWWWW",
      ".ggggggggPPPWWWWWWWWWWWW",
      ".gggggggg~~WWWWWWWWWWWWW",
      "TggggggggWWWWWWWWWWWWWWW",
      "TgFggggggWWWWWWWWWWWWWWW",
      "TgggggFJgWWWWWWWWWWWWWWW",
      "TgGggggggWWWWWWWWWWWWWWW",
      "TggggggggWWWWWWWWWWWWWWW",
      "TTTTTTTTTTTTTTTTTTTTTTTT"
    ],
    "exits": [
      {
        "x": 0,
        "y": 7,
        "to": "town",
        "tx": 22,
        "ty": 7
      },
      {
        "x": 0,
        "y": 8,
        "to": "town",
        "tx": 22,
        "ty": 8
      }
    ],
    "boat": {
      "x": 11,
      "y": 7,
      "to": "fjord",
      "tx": 10,
      "ty": 6
    }
  },
  "forest": {
    "title": {
      "no": "SKOGEN",
      "en": "THE FOREST"
    },
    "rows": [
      "TTTTTTT..TTTTTTTTTTTTTTT",
      "TYggYgggggggggGgggYgYYgT",
      "TggggggggggggggggggggggT",
      "TgYggggYgggGgggYgggggggT",
      "TggggggggggFggggggggggGT",
      "TYgggggggggggggggggYgggT",
      "TggggYggggggggggYgggggGT",
      "TggggggggggggggggggggFgT",
      "TgGgggggggYggggggggggggT",
      "TggggggggggggggggggggggT",
      "TYggYggggggggGgYgggggYgT",
      "TggggggggggggggggggggggT",
      "TgggggYgggggggYgggggggGT",
      "TggggggggggggggggggggggT",
      "TTTTTTT..TTTTTTTTTTTTTTT"
    ],
    "exits": [
      {
        "x": 7,
        "y": 14,
        "to": "town",
        "tx": 7,
        "ty": 1
      },
      {
        "x": 8,
        "y": 14,
        "to": "town",
        "tx": 8,
        "ty": 1
      },
      {
        "x": 7,
        "y": 0,
        "to": "setra",
        "tx": 7,
        "ty": 13
      },
      {
        "x": 8,
        "y": 0,
        "to": "setra",
        "tx": 8,
        "ty": 13
      }
    ]
  },
  "enga": {
    "title": {
      "no": "ENGA",
      "en": "THE MEADOW"
    },
    "rows": [
      "TTTTTTT..TTTTTTTTTTTTTTT",
      "Tggg,gggggg,gpgg,ggggggT",
      "Tgg,ggggggpgggggggpggggT",
      "TggRRRRggg,ggggg,ggggggT",
      "TggHDHHgggggggpgggggpggT",
      "TggHHHHg,gggggggggg,gggT",
      "Tgpg.gggggpggggggggggpgT",
      "Tgggggggggggg,gggg,ggggT",
      "TggpggggggggpgggggggpggT",
      "Tg,ggggggpgg,ggggggggggT",
      "Tgggggg,ggggggpgggg,gggT",
      "TggggggpggggggggggpggggT",
      "Tgggggpggg,ggggggJFg,ggT",
      "TggggggggggpggggpggggggT",
      "TTTTTTTTTTTTTTTTTTTTTTTT"
    ],
    "exits": [
      {
        "x": 7,
        "y": 0,
        "to": "town",
        "tx": 7,
        "ty": 13
      },
      {
        "x": 8,
        "y": 0,
        "to": "town",
        "tx": 8,
        "ty": 13
      }
    ]
  },
  "setra": {
    "title": {
      "no": "SETRA",
      "en": "THE MOUNTAIN DAIRY"
    },
    "rows": [
      "MMMMMMM..MMMMMMMMMMMMMMM",
      "MggggggggggggggggggggggM",
      "Mgg^gggggggggggggggggggM",
      "MggRRRRggggggggggggg^ggM",
      "MggHHDHggggggggggggggggM",
      "MggHHHHggggg,,gggggggggM",
      "Mgggg.gggggggggggggggg..",
      "Mgggggggg,,ggggggggggg..",
      "MggggggggggggggggggggggM",
      "Mgggggggggggg,,ggpgggggM",
      "MggggggggggggggggggggggM",
      "Mgggggggggggggggggg^gggM",
      "Mggggg,,gggggggggggggggM",
      "MggggggggggggggggggggggM",
      "TTTTTTT..TTTTTTTTTTTTTTT"
    ],
    "exits": [
      {
        "x": 7,
        "y": 14,
        "to": "forest",
        "tx": 7,
        "ty": 1
      },
      {
        "x": 8,
        "y": 14,
        "to": "forest",
        "tx": 8,
        "ty": 1
      },
      {
        "x": 7,
        "y": 0,
        "to": "vidda",
        "tx": 7,
        "ty": 13,
        "need": "warm",
        "why": {
          "no": "The wind up top will cut through you. Get something woollen first.",
          "en": "The wind up top will cut through you. Get something woollen first."
        }
      },
      {
        "x": 8,
        "y": 0,
        "to": "vidda",
        "tx": 8,
        "ty": 13,
        "need": "warm",
        "why": {
          "no": "The wind up top will cut through you. Get something woollen first.",
          "en": "The wind up top will cut through you. Get something woollen first."
        }
      },
      {
        "x": 23,
        "y": 6,
        "to": "gruva",
        "tx": 1,
        "ty": 7,
        "need": "lamp",
        "why": {
          "no": "Pitch dark in there. Lars keeps the lanterns.",
          "en": "Pitch dark in there. Lars keeps the lanterns."
        }
      },
      {
        "x": 23,
        "y": 7,
        "to": "gruva",
        "tx": 1,
        "ty": 7,
        "need": "lamp",
        "why": {
          "no": "Pitch dark in there. Lars keeps the lanterns.",
          "en": "Pitch dark in there. Lars keeps the lanterns."
        }
      }
    ]
  },
  "vidda": {
    "title": {
      "no": "VIDDA",
      "en": "THE PLATEAU"
    },
    "rows": [
      "MMMMMMMMMMMMMMMMMMMMMMMM",
      "Mggggg^ggggggggg^ggggggM",
      "Mgggggggg,,ggggggggg^ggM",
      "Mg^ggggggggWWWWWWWgggggM",
      "Mggggg,,gg~WWWWWWWgggggM",
      "Mggggggggg~WWWWWWW~ggggM",
      "Mggggg^ggggWWWWWWWg^gggM",
      "MggggggggggWWWWWWWgggggM",
      "Mgg,,gggggg~gggggggggggM",
      "Mgggggg^gJgggggggg^ggggM",
      "Mggggggggggg,,gggggggggM",
      "Mggggg^ggggggggggggggggM",
      "Mgg^ggggg,,gggggg^gggggM",
      "Mgggggg..ggggggggggggggM",
      "MMMMMMMMMMMMMMMMMMMMMMMM"
    ],
    "exits": [
      {
        "x": 7,
        "y": 13,
        "to": "setra",
        "tx": 7,
        "ty": 1
      },
      {
        "x": 8,
        "y": 13,
        "to": "setra",
        "tx": 8,
        "ty": 1
      }
    ]
  },
  "gruva": {
    "title": {
      "no": "GRUVA",
      "en": "THE MINE"
    },
    "rows": [
      "MMMMMMMMMMMMMMMMMMMMMMMM",
      "MMMMMMMMMMMMMMMMMMMMMMMM",
      "MMOggggMMMOMMMMMMMMMMMMM",
      "MMMgMMMMMgggggMgggggOMMM",
      "MMMgMMgMMgMMMgMMgQOgMMMM",
      "MMMgMMgMOgMMMgMMgMMgMMMM",
      "MMggMMgMMgMOMgOMgMMgMMMM",
      ".gggggggggggggggggggggMM",
      "MMMgMMOMMgMMMgQMgMMggMMM",
      "MMMgQMMMMgMMMgMMgMMggQMM",
      "MMMgMOMMMgOMMgMMgOMMgMMM",
      "MMMggggMMgggggMMgggggOMM",
      "MMMMMMMMMMMMMMMMMMMMMMMM",
      "MMMMMMMMMMMMMMMMMMMMMMMM",
      "MMMMMMMMMMMMMMMMMMMMMMMM"
    ],
    "exits": [
      {
        "x": 0,
        "y": 7,
        "to": "setra",
        "tx": 22,
        "ty": 6
      }
    ]
  },
  "fjord": {
    "title": {
      "no": "FJORDEN",
      "en": "THE FJORD"
    },
    "rows": [
      "TTTTTTTTTTTMTTTTTTTTTTTT",
      "Tggggggggg~MWWWWWWWWWWWW",
      "TgRRRRgggg~MWWWWWWWWWWWW",
      "TgHHDHgggg~MWWWWWWWWWWWW",
      "Tgg.gggggg~MWWWWWWWWWWWW",
      "TggggggPPPPMWWWWWWWWWWWW",
      "TgggggggggPMWWWWWWWWWWWW",
      "TgggggggggPMWWWWWWWWWWWW",
      "TgggggggggPMWWWWWWWWWWWW",
      "TgFggggggg~MWWWWWWWWWWWW",
      "Tggggggggg~MWWWWWWWWWWWW",
      "TgGggggggg~MWWWWWWWWWWWW",
      "Tggggggggg~MWWWWWWWWWWWW",
      "Tggggggggg~MWWWWWWWWWWWW",
      "TTTTTTTTTTTMTTTTTTTTTTTT"
    ],
    "exits": [],
    "boat": {
      "x": 10,
      "y": 6,
      "to": "lake",
      "tx": 11,
      "ty": 7
    }
  },
  "farmhouse": {
    "title": {
      "no": "HYTTA",
      "en": "THE CABIN"
    },
    "inside": true,
    "rows": [
      "                        ",
      "                        ",
      "                        ",
      "      HHHHHHHHHHHH      ",
      "      HbiiiiiivvuH      ",
      "      HiiiiiiiiiiH      ",
      "      HiizzzziiicH      ",
      "      HiiznnziiiiH      ",
      "      HiizzzziiiiH      ",
      "      HiiiiiiiiiiH      ",
      "      HHHHHDHHHHHH      ",
      "                        ",
      "                        ",
      "                        ",
      "                        "
    ],
    "exits": [
      {
        "x": 11,
        "y": 10,
        "to": "farm",
        "tx": 4,
        "ty": 5
      }
    ]
  },
  "lakehouse": {
    "title": {
      "no": "HJEMME",
      "en": "HOME"
    },
    "inside": true,
    "rows": [
      "                        ",
      "                        ",
      "                        ",
      "     HHHHHHHHHHHHHH     ",
      "     HbiiiiiiiivvuH     ",
      "     HiiiiiiiiiiiiH     ",
      "     HiizzzziiiiicH     ",
      "     HiiznnziiiiiiH     ",
      "     HiizzzziiiiiiH     ",
      "     HiiiiiiiiiiiiH     ",
      "     HiiiiiiiiiiiiH     ",
      "     HHHHHHDHHHHHHH     ",
      "                        ",
      "                        ",
      "                        "
    ],
    "exits": [
      {
        "x": 11,
        "y": 11,
        "to": "lake",
        "tx": 5,
        "ty": 5
      }
    ]
  }
};

/* D is solid too, but it is knocked on. n table, u cupboard and J bench are
   furniture you walk up to, not through; z is a rug, so it is not here. The
   space is the dead margin beyond a room's walls — nothing should stand in it. */
export const BEK_SOLID = 'TYGWHRS=^MOQvcBobnuJ ';

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
export const BEK_NPCS = [
  { id: 'astrid', n: 'ASTRID', map: 'town',  x: 4,  y: 4,  hair: TIM[1], shirt: WAR[2], pants: ATMO[2], voice: 620 },
  { id: 'hakon',  n: 'HÅKON',  map: 'town',  x: 18, y: 11, hair: STO[3], shirt: CON[3], pants: STO[2],  voice: 360 },
  { id: 'ingrid', n: 'INGRID', map: 'lake',  x: 7,  y: 8,  hair: DRY[2], shirt: WAT[4], pants: ATMO[2], voice: 700 },
  { id: 'olav',   n: 'OLAV',   map: 'lake',  x: 5,  y: 9,  hair: STO[4], shirt: WAT[2], pants: STO[2],  voice: 330 },
  { id: 'marit',  n: 'MARIT',  map: 'enga',  x: 4,  y: 6,  hair: SNO[0], shirt: WAR[3], pants: STO[2],  voice: 660 },
  { id: 'sigrid', n: 'SIGRID', map: 'setra', x: 5,  y: 6,  hair: DRY[2], shirt: WAR[4], pants: STO[4],  voice: 560 },
  { id: 'gunnar', n: 'GUNNAR', map: 'vidda', x: 8,  y: 11, hair: TIM[1], shirt: CON[3], pants: STO[2],  voice: 290 },
  /* Lars stands in the alcove cut beside the adit, never on a corridor. Row 7
     of the gruva is the only way in and it is one tile tall, and the shafts
     off it are one tile wide — a man standing on either is a wall. */
  { id: 'lars',   n: 'LARS',   map: 'gruva', x: 2,  y: 6,  hair: STO[3], shirt: WAR[1], pants: STO[2],  voice: 420 },
  { id: 'bjorn',  n: '',       map: 'forest', x: 11, y: 7, bear: true, from: 6 }
];

/* decorative animals — drawn, never collided with */
export const BEK_GOATS = [
  { map: 'setra', x: 10, y: 8 }, { map: 'setra', x: 15, y: 6 }, { map: 'setra', x: 12, y: 10 },
  { map: 'vidda', x: 4, y: 10 }, { map: 'vidda', x: 20, y: 8 }
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
      { id: 'a1',
        lines: [{ no: 'ASTRID: Hei! You are the one who took the old plot.', en: 'ASTRID: Hi! You are the one who took the old plot.' },
                'ASTRID: Nobody has turned that soil in six years.'],
        ask: { q: { no: 'Why did you come to Bekkedal?', en: 'Why did you come to Bekkedal?' }, opts: [
          { t: { no: 'For the quiet.', en: 'For the quiet.' }, set: { why: 'quiet' }, fr: 1,
            reply: ['ASTRID: Then you came to the right valley.',
                    { no: 'ASTRID: Take these. Potatoes forgive a beginner.', en: 'ASTRID: Take these. Potatoes forgive a beginner.' }],
            give: { potetfro: 6 } },
          { t: { no: 'Land was cheap.', en: 'Land was cheap.' }, set: { why: 'land' }, fr: 0,
            reply: ['ASTRID: Honest, at least. Ha!',
                    'ASTRID: Cheap land, cheap seed. Here.'],
            give: { potetfro: 8 } }
        ] } },
      { id: 'a2', when: S => S.q.potet === 'active',
        lines: [{ no: 'ASTRID: Five poteter and the board is happy.', en: 'ASTRID: Five potatoes and the board is happy.' }] },
      { id: 'a3', when: S => S.fr.astrid >= 3 && S.flag.why === 'quiet',
        lines: ['ASTRID: You still have not complained about the rain.',
                { no: 'ASTRID: That is how I know you meant it. Kaffe, on me.', en: 'ASTRID: That is how I know you meant it. Coffee, on me.' }],
        give: { kaffe: 2 } },
      { id: 'a4', when: S => S.fr.astrid >= 3 && S.flag.why === 'land',
        lines: ['ASTRID: You drive a hard bargain, so I will match it.',
                'ASTRID: Ten percent off, permanently. Do not tell Håkon.'],
        set: { rabatt: 1 } },
      { id: 'a5', when: S => S.fr.astrid >= 4,
        lines: [{ no: 'ASTRID: Jordbær seed came in. Slow, but it pays.', en: 'ASTRID: Strawberry seed came in. Slow, but it pays.' }],
        set: { jordbar: 1 } },
      { id: 'a6', when: S => S.fr.astrid >= 5,
        lines: ['ASTRID: You have made this a real farm. I am glad you stayed.'] }
    ],
    chat: [
      { t: [{ no: 'ASTRID: God morgen. The kettle is on.', en: 'ASTRID: Good morning. The kettle is on.' }] },
      { t: ['ASTRID: Rain on Tuesday, my knee says so.'] },
      { t: ['ASTRID: The lantern is for the mine. Lars is down there.'] },
      { t: ['ASTRID: You came for the quiet. It is still here.'], if: S => S.flag.why === 'quiet' },
      { t: ['ASTRID: Land is cheap. Company is not.'], if: S => S.flag.why === 'land' },
      { t: ['ASTRID: Sigrid has wool up at the seter, if the vidda calls you.'], if: S => S.disc && S.disc.setra },
      { t: ['ASTRID: Håkon says you have been felling. Good.'], if: S => S.q.tommer === 'done' }
    ],
    shop: ['potetfro', 'nepefro', 'gulrotfro', 'kalfro', 'jordbarfro', 'rabarbrafro', 'kaffe', 'vaffel', 'lefse', 'lykt', 'tau', 'spiker']
  },

  hakon: {
    nodes: [
      { id: 'h1',
        lines: ['HÅKON: Snekkeriet. I build what people can pay for.',
                'HÅKON: You will want a house eventually. They all do.'],
        ask: { q: { no: 'How should it be built?', en: 'How should it be built?' }, opts: [
          { t: { no: 'From the forest. I will fell it myself.', en: 'From the forest. I will fell it myself.' }, set: { build: 'skog' }, fr: 1,
            reply: ['HÅKON: Good. Timber you carry is timber you respect.',
                    { no: 'HÅKON: Thirty tømmer, twenty stein, and 5000 kr.', en: 'HÅKON: Thirty timber, twenty stone, and 5000 kr.' }] },
          { t: { no: 'Order the planks. I will pay.', en: 'Order the planks. I will pay.' }, set: { build: 'kjop' }, fr: 0,
            reply: ['HÅKON: City answer. Fine. It costs what it costs.',
                    { no: 'HÅKON: Twelve tømmer, ten stein, and 6500 kr.', en: 'HÅKON: Twelve timber, ten stone, and 6500 kr.' }] }
        ] } },
      { id: 'h2', when: S => S.q.tommer === 'active',
        lines: [{ no: 'HÅKON: Ten tømmer. The øks is by the stump, as always.', en: 'HÅKON: Ten timber. The axe is by the stump, as always.' }] },
      { id: 'h3', when: S => S.q.tommer === 'done' && !S.flag.lot,
        lines: [{ no: 'HÅKON: The lot by the water is for sale. 1200 kr.', en: 'HÅKON: The lot by the water is for sale. 1200 kr.' },
                'HÅKON: Trees on three sides, water on the fourth.',
                'HÅKON: Sign is down there. I will know when you have.'] },
      { id: 'h4', when: S => S.q.tommer === 'done' && S.axeLv < 2,
        lines: [{ no: 'HÅKON: The big gran need a STÅLØKS. I sell one for 900 kr.', en: 'HÅKON: The big firs need a STEEL AXE. I sell one for 900 kr.' }],
        buy: { label: { no: 'STÅLØKS — 900 kr', en: 'STEEL AXE — 900 kr' }, kr: 900, axeLv: 2,
               ok: ['HÅKON: Mind the swing. It bites deeper.'],
               no: ['HÅKON: 900 kr. Come back when you have it.'] } },
      { id: 'h5', when: S => S.fr.hakon >= 4 && S.flag.build === 'skog',
        lines: ['HÅKON: Five hundred off the house. You did the felling, not me.'],
        set: { rabatt2: 1 } }
    ],
    chat: [
      { t: ['HÅKON: Mm.'] },
      { t: ['HÅKON: Wood moves in autumn. Build in summer.'] },
      { t: [{ no: 'HÅKON: Stein comes out of the gruva with the ore. Bring both.', en: 'HÅKON: Stone comes out of the mine with the ore. Bring both.' }] },
      { t: ['HÅKON: Timber you carry is timber you respect.'], if: S => S.flag.build === 'skog' },
      { t: ['HÅKON: The planks are ordered. They come when they come.'], if: S => S.flag.build === 'kjop' }
    ]
  },

  ingrid: {
    nodes: [
      { id: 'i1',
        lines: [{ no: 'INGRID: God kveld. Or morning. Out here it is the same.', en: 'INGRID: Good evening. Or morning. Out here it is the same.' }],
        ask: { q: { no: 'Why do you fish?', en: 'Why do you fish?' }, opts: [
          { t: { no: 'For the calm.', en: 'For the calm.' }, set: { fisk: 'ro' }, fr: 1,
            reply: ['INGRID: Then stand at the end of the pier, not the middle.',
                    { no: 'INGRID: The laks lie deep out there. Bring me three sopp', en: 'INGRID: The salmon lie deep out there. Bring me three mushrooms' },
                    { no: 'INGRID: and the old stang is yours.', en: 'INGRID: and the old rod is yours.' }] },
          { t: { no: 'For the food.', en: 'For the food.' }, set: { fisk: 'mat' }, fr: 0,
            reply: ['INGRID: Sensible. I will keep you fed while you learn.',
                    { no: 'INGRID: Three sopp from the forest, and you get the stang.', en: 'INGRID: Three mushrooms from the forest, and you get the rod.' }] }
        ] } },
      { id: 'i2', when: S => S.q.sopp === 'active',
        lines: [{ no: 'INGRID: Three sopp. The skogen is full of them at dawn.', en: 'INGRID: Three mushrooms. The forest is full of them at dawn.' }] },
      { id: 'i3', when: S => S.fr.ingrid >= 3 && S.flag.fisk === 'ro',
        lines: ['INGRID: You have learned to wait. That is all fishing is.'] },
      { id: 'i4', when: S => S.fr.ingrid >= 3 && S.flag.fisk === 'mat',
        lines: ['INGRID: Here. You still eat like a man who forgets to.'],
        give: { vaffel: 2 } },
      { id: 'i5', when: S => S.fr.ingrid >= 4,
        lines: [{ no: 'INGRID: Røye run in the cold tarn up on the vidda. Colder, sweeter.', en: 'INGRID: Char run in the cold tarn up on the plateau. Colder, sweeter.' }] }
    ],
    chat: [
      { t: ['INGRID: Still biting. Slowly.'] },
      { t: ['INGRID: The lot behind you has been empty a long time.'] },
      { t: ['INGRID: Deep water, deep fish. Patience.'], if: S => S.flag.fisk === 'ro' },
      { t: [{ no: 'INGRID: Eat something that is not a potet.', en: 'INGRID: Eat something that is not a potato.' }], if: S => S.flag.fisk === 'mat' },
      { t: ['INGRID: Olav could take you to the fjord, if his boat floated.'] }
    ]
  },

  olav: {
    nodes: [
      { id: 'o1',
        lines: ['OLAV: The boat leaks. Everything out here leaks, eventually.'],
        ask: { q: { no: 'The fjord, or the open sea?', en: 'The fjord, or the open sea?' }, opts: [
          { t: { no: 'The open sea. I want the big ones.', en: 'The open sea. I want the big ones.' }, set: { sea: 'hav' }, fr: 1,
            reply: [{ no: 'OLAV: A bold answer. Makrell run in shoals out past the mouth.', en: 'OLAV: A bold answer. Mackerel run in shoals out past the mouth.' },
                    { no: 'OLAV: Fix my boat and I will point you at them. Four tømmer, two tau.', en: 'OLAV: Fix my boat and I will point you at them. Four timber, two rope.' }] },
          { t: { no: 'The fjord. Calm water suits me.', en: 'The fjord. Calm water suits me.' }, set: { sea: 'fjord' }, fr: 0,
            reply: [{ no: 'OLAV: Sensible. Torsk sit still and wait, like you.', en: 'OLAV: Sensible. Cod sit still and wait, like you.' },
                    { no: 'OLAV: Patch the boat — four tømmer, two tau — and it is yours to borrow.', en: 'OLAV: Patch the boat — four timber, two rope — and it is yours to borrow.' }] }
        ] } },
      { id: 'o2', when: S => S.q.boat === 'active',
        lines: [{ no: 'OLAV: Four tømmer, two tau. Astrid sells the tau.', en: 'OLAV: Four timber, two rope. Astrid sells the rope.' }] },
      { id: 'o3', when: S => S.flag.boat && S.fr.olav >= 3 && S.flag.sea === 'hav',
        lines: [{ no: 'OLAV: Cast off the end of the dock. The makrell will find you.', en: 'OLAV: Cast off the end of the dock. The mackerel will find you.' }] },
      { id: 'o4', when: S => S.flag.boat && S.fr.olav >= 3 && S.flag.sea === 'fjord',
        lines: ['OLAV: Warm soup, for the crossings. You will thank me.'],
        give: { fiskesuppe: 1 } }
    ],
    chat: [
      { t: ['OLAV: Water finds every gap you leave it.'] },
      { t: ['OLAV: The pier is Ingrid\u2019s. The dock at the fjord is mine.'] },
      { t: [{ no: 'OLAV: Boat floats now. Take it whenever. Pier\u2019s end, press act.', en: 'OLAV: Boat floats now. Take it whenever. Pier\u2019s end, press act.' }], if: S => S.flag.boat }
    ]
  },

  marit: {
    nodes: [
      { id: 'm1',
        lines: ['MARIT: You found the old church. Most only find the meadow.',
                'MARIT: The stave has stood eight hundred winters. It leans, but it stands.'],
        ask: { q: { no: 'Why did you climb all the way up here?', en: 'Why did you climb all the way up here?' }, opts: [
          { t: { no: 'Someone I remember.', en: 'Someone I remember.' }, set: { marit: 'minne' }, fr: 1,
            reply: ['MARIT: Then pick them a bouquet. One blåklokke, one soleie, one revebjelle.',
                    'MARIT: Bring the three, and I will know the flowers found the right hands.'] },
          { t: { no: 'Just the quiet up here.', en: 'Just the quiet up here.' }, set: { marit: 'ro' }, fr: 0,
            reply: ['MARIT: The quiet keeps. Still — pick me three: blåklokke, soleie, revebjelle.',
                    'MARIT: An old woman likes colour on the sill.'] }
        ] } },
      { id: 'm2', when: S => S.q.blomst === 'active',
        lines: [{ no: 'MARIT: One of each. They open at first light, all over the enga.', en: 'MARIT: One of each. They open at first light, all over the meadow.' }] },
      { id: 'm3', when: S => S.fr.marit >= 3 && S.flag.marit === 'minne',
        lines: ['MARIT: You carry it well. Grief and gardening are the same craft.',
                'MARIT: Here — herbs for the pot. They grow where I planted her favourites.'],
        give: { urt: 3 } },
      { id: 'm4', when: S => S.fr.marit >= 3 && S.flag.marit === 'ro',
        lines: ['MARIT: You have found the quiet, then. It suits the valley on you.'] }
    ],
    chat: [
      { t: ['MARIT: The bells only ring at midsummer now. Nobody minds.'] },
      { t: [{ no: 'MARIT: Blåklokke, soleie, revebjelle. The meadow keeps them all.', en: 'MARIT: Harebell, buttercup, foxglove. The meadow keeps them all.' }] },
      { t: ['MARIT: Flowers picked at dawn last longest. An old trick.'] },
      { t: ['MARIT: Colour on the sill. That is all an old house needs.'], if: S => S.q.blomst === 'done' }
    ]
  },

  sigrid: {
    nodes: [
      { id: 's1',
        lines: ['SIGRID: Up here it is goats, brown cheese and weather. In that order.'],
        ask: { q: { no: 'Milk or wool — what do you keep them for?', en: 'Milk or wool — what do you keep them for?' }, opts: [
          { t: { no: 'Milk. The brunost is worth the climb.', en: 'Milk. The brown cheese is worth the climb.' }, set: { dairy: 'melk' }, fr: 1,
            reply: [{ no: 'SIGRID: A cheese answer. Bring me five multe and I will feed you well.', en: 'SIGRID: A cheese answer. Bring me five cloudberries and I will feed you well.' },
                    { no: 'SIGRID: The multe grow right here on the setra, gold in the grass.', en: 'SIGRID: The cloudberries grow right here on the dairy meadow, gold in the grass.' }] },
          { t: { no: 'Wool. The winters are long.', en: 'Wool. The winters are long.' }, set: { dairy: 'ull' }, fr: 0,
            reply: [{ no: 'SIGRID: A sensible answer. Five multe, and the vidda stops frightening you.', en: 'SIGRID: A sensible answer. Five cloudberries, and the plateau stops frightening you.' }] }
        ] } },
      { id: 's2', when: S => S.q.multe === 'active',
        lines: [{ no: 'SIGRID: Five multe. They ripen on the setra by morning.', en: 'SIGRID: Five cloudberries. They ripen on the dairy meadow by morning.' }] },
      { id: 's3', when: S => S.q.multe === 'done' && !S.flag.rabarbra,
        lines: [{ no: 'SIGRID: Astrid has rabarbra seed now, on my word. Slow, but rich.', en: 'SIGRID: Astrid has rhubarb seed now, on my word. Slow, but rich.' }],
        set: { rabarbra: 1 } },
      { id: 's4', when: S => S.fr.sigrid >= 3 && S.flag.dairy === 'melk',
        lines: ['SIGRID: Cloudberry cream. Eat it slow.'],
        give: { multekrem: 1 } },
      { id: 's5', when: S => S.fr.sigrid >= 3 && S.flag.dairy === 'ull',
        lines: [{ no: 'SIGRID: A genser, knitted this winter. Now the wind up top is only wind.', en: 'SIGRID: A sweater, knitted this winter. Now the wind up top is only wind.' }],
        give: { ullgenser: 1 } }
    ],
    chat: [
      { t: ['SIGRID: Mind the goats. They will eat your bootlaces.'] },
      { t: [{ no: 'SIGRID: Multe first, then the vidda. In that order, or you freeze.', en: 'SIGRID: Cloudberries first, then the plateau. In that order, or you freeze.' }] },
      { t: ['SIGRID: A wool genser is all that stands between you and the wind.'] },
      { t: ['SIGRID: You smell of the mine. Say hello to Lars for me.'], if: S => S.disc && S.disc.gruva }
    ],
    shop: ['brunost', 'ullgenser', 'multekrem', 'lefse']
  },

  gunnar: {
    nodes: [
      { id: 'g1',
        lines: ['GUNNAR: Few come up onto the vidda on purpose. Fewer twice.'],
        ask: { q: { no: 'Do you trap up here, or watch?', en: 'Do you trap up here, or watch?' }, opts: [
          { t: { no: 'Trap. A living is a living.', en: 'Trap. A living is a living.' }, set: { fell: 'jakt' }, fr: 1,
            reply: [{ no: 'GUNNAR: Honest. Tyttebær grow thick past the tarn. Sell them low, sell them often.', en: 'GUNNAR: Honest. Lingonberries grow thick past the tarn. Sell them low, sell them often.' }] },
          { t: { no: 'Watch. It is enough to be here.', en: 'Watch. It is enough to be here.' }, set: { fell: 'sjaa' }, fr: 0,
            reply: ['GUNNAR: Then you already understand the plateau. Reindeer at dusk, if you are still.'] }
        ] } },
      { id: 'g2', when: S => S.fr.gunnar >= 3 && S.flag.fell === 'jakt',
        lines: [{ no: 'GUNNAR: Take the wool. The tyttebær are worth more when your hands still work.', en: 'GUNNAR: Take the wool. The lingonberries are worth more when your hands still work.' }],
        give: { ull: 2 } },
      { id: 'g3', when: S => S.fr.gunnar >= 3 && S.flag.fell === 'sjaa',
        lines: ['GUNNAR: Stand at the tarn at dusk. You will see what I stay up here for.'] }
    ],
    chat: [
      { t: ['GUNNAR: Wind from the north. There is always wind from the north.'] },
      { t: [{ no: 'GUNNAR: Røye in the tarn. Tyttebær in the heather. The vidda provides.', en: 'GUNNAR: Char in the tarn. Lingonberries in the heather. The plateau provides.' }] },
      { t: ['GUNNAR: You wore the wool. Good. I have buried men who did not.'] }
    ]
  },

  lars: {
    nodes: [
      { id: 'l1',
        lines: ['LARS: Watch your head. The good copper is where the ceiling is lowest.'],
        ask: { q: { no: 'Silver, or stone?', en: 'Silver, or stone?' }, opts: [
          { t: { no: 'Silver. I came for the sølv.', en: 'Silver. I came for the silver.' }, set: { mine: 'solv' }, fr: 1,
            reply: [{ no: 'LARS: A greedy answer. I like it. Rich veins glitter — you will know them.', en: 'LARS: A greedy answer. I like it. Rich veins glitter — you will know them.' }] },
          { t: { no: 'Stone. A house needs walls.', en: 'Stone. A house needs walls.' }, set: { mine: 'stein' }, fr: 0,
            reply: [{ no: 'LARS: A builder. Good. Every swing gives stein along with the ore.', en: 'LARS: A builder. Good. Every swing gives stone along with the ore.' }] }
        ] } },
      { id: 'l2', when: S => !S.tools.hakke,
        lines: [{ no: 'LARS: You will need a HAKKE. I sell one for 400 kr.', en: 'LARS: You will need a PICK. I sell one for 400 kr.' }],
        buy: { label: { no: 'HAKKE — 400 kr', en: 'PICK — 400 kr' }, kr: 400, tool: 'hakke', pickLv: 1,
               ok: ['LARS: Swing at the veins, not the walls.'],
               no: ['LARS: 400 kr. The ore is not going anywhere.'] } },
      { id: 'l3', when: S => S.tools.hakke && !S.q.jern && S.pickLv < 2,
        lines: [{ no: 'LARS: Bring me six jern and I will forge you a STÅLHAKKE.', en: 'LARS: Bring me six iron and I will forge you a STEEL PICK.' },
                { no: 'LARS: The rich veins — the sølv — need steel to crack.', en: 'LARS: The rich veins — the silver — need steel to crack.' }],
        open: 'jern' },
      { id: 'l4', when: S => S.fr.lars >= 3 && S.flag.mine === 'stein' && S.pickLv < 2,
        lines: [{ no: 'LARS: For a builder, the steel is cheaper. Four jern, not six.', en: 'LARS: For a builder, the steel is cheaper. Four iron, not six.' }],
        set: { steelcut: 1 } }
    ],
    chat: [
      { t: ['LARS: Mm. Deeper is darker. Darker is richer.'] },
      { t: [{ no: 'LARS: Kobber sells well in town. Sølv sells better anywhere.', en: 'LARS: Copper sells well in town. Silver sells better anywhere.' }] },
      { t: [{ no: 'LARS: The rich veins glitter. You need steel for those.', en: 'LARS: The rich veins glitter. You need steel for those.' }], if: S => S.pickLv < 2 },
      { t: ['LARS: Steel in your hands now. The whole mountain is yours.'], if: S => S.pickLv >= 2 }
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

/* the finished house, drawn straight over the lake lot */
export const BEK_HOUSE = [
  '                        ',
  '                        ',
  '   RRRRR                ',
  '   HHHHH                ',
  '   HHDHH                ',
  '                        ',
  '                        ',
  '                        ',
  '                        ',
  '                        ',
  '                        ',
  '                        ',
  '                        ',
  '                        ',
  '                        '
];
