/* Bekkedal's screen furniture.
 *
 * Everything here is derived: from the tile/art scale in data.js and the glyph
 * metrics in font.js, never from a measured pixel. That is the whole point —
 * the old build hand-tuned every column stop to a browser font advance it
 * could not predict, so no code could tell whether a string fit its box. These
 * are plain numbers computed from two sources of truth, which means
 * layout_check.js can prove the boxes hold their longest possible contents
 * before the game ever runs.
 *
 * Panels are sized in character cells and text lines rather than pixels, so
 * raising the resolution again moves the whole UI together instead of leaving
 * a menu behind at the old scale.
 */
import { BEK_W, BEK_H, BEK_ART_SCALE, BEK_HUD_H, BEK_VIEW_Y, BEK_VIEW_H, UI, BEK_TALK } from './data.js';
import { FONT_GLYPH_H, FONT_ADV, FONT_LINE, FONT_SM, FONT_LG } from './font.js';

/* A box that shows one fixed string should be measured from that string, not
   from a guessed cell count — that is the difference between "it looked right
   when I tried it" and "it cannot clip". Both languages count: the player can
   switch at any time and the English is often the longer of the two. */
const both = s => s == null ? [] : typeof s === 'string' ? [s] : [s.no, s.en].filter(x => x != null);
const inkW = (strs, size) => strs.reduce((m, str) => Math.max(m, String(str).length * FONT_ADV * size), 0);
const offerLabels = (() => {
  const out = [];
  const walk = o => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return o.forEach(walk);
    if (o.buy && o.buy.label) out.push(...both(o.buy.label));
    Object.values(o).forEach(walk);
  };
  walk(BEK_TALK); return out;
})();

/* ---- chrome units -------------------------------------------------------- */
export const BORDER  = BEK_ART_SCALE;               /* panel edge thickness     */
export const CELL_SM = FONT_ADV * FONT_SM;          /* one small character cell */
export const CELL_LG = FONT_ADV * FONT_LG;          /* one large character cell */
export const LINE_SM = FONT_LINE * FONT_SM;         /* one small text line      */
export const LINE_LG = FONT_LINE * FONT_LG;         /* one large text line      */
export const PAD_SM  = CELL_SM;
export const PAD_LG  = CELL_LG;
export const GLYPH_SM = FONT_GLYPH_H * FONT_SM;     /* ink height, small        */
export const GLYPH_LG = FONT_GLYPH_H * FONT_LG;     /* ink height, large        */
export const ICON_SRC = 16;                         /* drawIcon's design box    */
export const ICON_PX  = ICON_SRC * BEK_ART_SCALE;   /* as presented in menus    */

/* ---- the two HUD bands --------------------------------------------------- */
export const HUD_PAD = CELL_SM;
export const HUD_GAP = CELL_SM;
export const HUD_TXT_DY = Math.round((BEK_HUD_H - GLYPH_SM) / 2);
export const HUD_BOT_Y = BEK_H - BEK_HUD_H;
export const EN_BAR_W = CELL_SM * 8;
export const EN_BAR_H = GLYPH_SM / 2;
export const EN_BAR_X = BEK_W - HUD_PAD - EN_BAR_W;
export const EN_BAR_Y = Math.round((BEK_HUD_H - EN_BAR_H) / 2);
export const DROP_W = 3 * BEK_ART_SCALE, DROP_H = 6 * BEK_ART_SCALE;

/* ---- crop tooltip -------------------------------------------------------- */
export const TIP_W = CELL_SM * 26, TIP_H = PAD_SM * 2 + LINE_SM * 2;
export const TIP_X = Math.round((BEK_W - TIP_W) / 2), TIP_Y = BEK_VIEW_Y + PAD_SM;
export const TIP_COL2 = CELL_SM * 14;

/* ---- the fishing minigame ------------------------------------------------
   The hit test in tickFish compares fish.pos against z0/z1 in 0..1 and knows
   nothing about pixels. The needle centre and the zone edges below are both
   FISH_TRACK_W multiplied by those same figures, so the two agree by
   construction and the zone lands where the player sees it. */
export const FISH_TRACK_W = CELL_SM * 18, FISH_TRACK_H = GLYPH_SM / 2;
export const FISH_W = FISH_TRACK_W + PAD_SM * 2;
export const FISH_H = PAD_SM * 2 + LINE_SM + FISH_TRACK_H + LINE_SM;
export const FISH_X = Math.round((BEK_W - FISH_W) / 2);
export const FISH_Y = BEK_VIEW_Y + Math.round((BEK_VIEW_H - FISH_H) / 2);
export const FISH_TRACK_X = FISH_X + PAD_SM;
export const FISH_TRACK_Y = FISH_Y + PAD_SM + LINE_SM;
export const FISH_NEEDLE_W = BEK_ART_SCALE * 2;
export const FISH_NEEDLE_OVER = BEK_ART_SCALE * 2;

/* ---- dialogue ------------------------------------------------------------ */
export const DLG_BODY_LINES = 4;
export const DLG_W = BEK_W - CELL_SM * 4;
export const DLG_H = PAD_LG * 2 + LINE_SM + LINE_LG * DLG_BODY_LINES + LINE_SM;
export const DLG_X = Math.round((BEK_W - DLG_W) / 2);
export const DLG_Y = HUD_BOT_Y - DLG_H - PAD_SM;
export const DLG_TX = DLG_X + PAD_LG;
export const DLG_TW = DLG_W - PAD_LG * 2;

/* ---- small modal boxes --------------------------------------------------- */
export const SLEEP_W = inkW(both(UI.sleep).concat(both(UI.goodnight)), FONT_LG) + PAD_LG * 2;
export const SLEEP_H = PAD_LG * 2 + LINE_LG * 2;
export const SLEEP_X = Math.round((BEK_W - SLEEP_W) / 2);
export const SLEEP_Y = BEK_VIEW_Y + Math.round((BEK_VIEW_H - SLEEP_H) / 2);
export const SLEEP_TW = SLEEP_W - PAD_LG * 2;

export const OFFER_W = inkW(offerLabels.concat(['SPACE — KJØP    ESC — NEI', 'SPACE — BUY    ESC — NO', '999999 kr']), FONT_LG) + PAD_LG * 2;
export const OFFER_H = PAD_LG * 2 + LINE_LG * 3;
export const OFFER_X = Math.round((BEK_W - OFFER_W) / 2);
export const OFFER_Y = BEK_VIEW_Y + Math.round((BEK_VIEW_H - OFFER_H) / 2);
export const OFFER_TW = OFFER_W - PAD_LG * 2;

/* ---- the shop ------------------------------------------------------------ */
export const SHOP_ROWS = 11;
export const SHOP_ROW = ICON_PX + BEK_ART_SCALE * 2;
export const SHOP_W = BEK_W - CELL_SM * 4;
export const SHOP_H = PAD_SM * 2 + LINE_SM * 2 + SHOP_ROW * SHOP_ROWS + LINE_SM;
export const SHOP_X = Math.round((BEK_W - SHOP_W) / 2);
export const SHOP_Y = Math.round((BEK_H - SHOP_H) / 2);
export const SHOP_COL_W = Math.floor((SHOP_W - PAD_SM * 2) / 2);
export const SHOP_NAME_DX = ICON_PX + BEK_ART_SCALE * 2;
export const SHOP_PRICE_DX = SHOP_COL_W - CELL_SM * 9;

/* ---- the bag ------------------------------------------------------------- */
export const BAG_COLS = 3, BAG_ROWS = 8, BAG_CAP = BAG_COLS * BAG_ROWS;
export const BAG_ROW = ICON_PX + BEK_ART_SCALE * 2;
export const BAG_W = BEK_W - CELL_SM * 4;
export const BAG_H = PAD_SM * 2 + LINE_SM * 2 + BAG_ROW * BAG_ROWS + LINE_SM * 2;
export const BAG_X = Math.round((BEK_W - BAG_W) / 2);
export const BAG_Y = Math.round((BEK_H - BAG_H) / 2);
export const BAG_CW = Math.floor((BAG_W - PAD_SM * 2) / BAG_COLS);
export const BAG_NAME_DX = ICON_PX + BEK_ART_SCALE * 2;
export const BAG_QTY_DX = BAG_CW - CELL_SM * 7;

/* ---- the quest board -------------------------------------------------------
   The repeatable layer (BEK_QUEST_TEMPLATES, quests.js) means the board can
   log more quests than fit on screen at once — up to seven fixed, three live
   repeatable and the house, eleven rows against eight of headroom — so the
   panel stays fixed at QUEST_VISIBLE_ROWS and drawQuests() scrolls a window
   over the rest rather than growing to fit every possible row count. */
export const QUEST_VISIBLE_ROWS = 8;
export const QUEST_ENTRY = LINE_SM * 2 + PAD_SM;
export const QUEST_W = BEK_W - CELL_SM * 4;
export const QUEST_H = PAD_SM * 2 + LINE_SM * 2 + QUEST_ENTRY * QUEST_VISIBLE_ROWS + LINE_SM;
export const QUEST_X = Math.round((BEK_W - QUEST_W) / 2);
export const QUEST_Y = Math.round((BEK_H - QUEST_H) / 2);
export const QUEST_STATUS_DX = QUEST_W - PAD_SM * 2 - CELL_SM * 10;
export const QUEST_TW = QUEST_STATUS_DX - CELL_SM;      /* room before the status column */

/* ---- the travel menu ----------------------------------------------------- */
export const TRAVEL_W = CELL_SM * 34;
export const TRAVEL_H = PAD_SM * 2 + LINE_SM * 2 + LINE_SM * 12;
export const TRAVEL_X = Math.round((BEK_W - TRAVEL_W) / 2);
export const TRAVEL_Y = Math.round((BEK_H - TRAVEL_H) / 2);
export const TRAVEL_TW = TRAVEL_W - PAD_SM * 2;

/* ---- the ending ---------------------------------------------------------- */
export const END_SRC_W = BEK_W / BEK_ART_SCALE, END_SRC_H = BEK_H / BEK_ART_SCALE;
export const END_TREES = 6, END_TREE_DX = Math.floor(END_SRC_W / END_TREES);
/* The ending's house is a fixed 100px-wide painting in source space; it used
   to sit at a hardcoded x=150 that left it 40px off the centre of the old
   canvas. Centring it properly is the one thing about that screen this pass
   changed, so its width is a constant rather than a subtraction. */
export const END_HOUSE_W = 100;
export const END_HOUSE_X = Math.round((END_SRC_W - END_HOUSE_W) / 2);
export const END_TEXT_X = CELL_SM * 4;
export const END_TEXT_Y = PAD_LG + LINE_LG * 2;
