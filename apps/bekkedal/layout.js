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
import { BEK_W, BEK_H, BEK_ART_SCALE, BEK_HUD_H, BEK_VIEW_Y, BEK_VIEW_H, UI, BEK_TALK,
         BEK_NPCS, BEK_LOFT } from './data.js';
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
/* the material panels' own frame — the board, the bag, the counter, the
   workbench, the sign (menus_chrome.js) — three borders wide and chosen to
   sit inside PAD_SM/PAD_LG, so none of those panels' interior text moved
   when they stopped being panel()'s flat black rectangle. panel() itself
   (the HUD, the tooltip, the fishing gauge, the dialogue box) keeps BORDER. */
export const PANEL_FRAME = BORDER * 3;
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
/* the reel progress bar — how far the fish is landed — sits under the
   tension track in the same box, same width, so "how much tension" and
   "how much left to land it" read as one instrument rather than two. */
export const FISH_GAP = BEK_ART_SCALE * 2;
export const FISH_PROG_H = FISH_TRACK_H;
export const FISH_W = FISH_TRACK_W + PAD_SM * 2;
export const FISH_H = PAD_SM * 2 + LINE_SM + FISH_TRACK_H + FISH_GAP + FISH_PROG_H + FISH_GAP;
export const FISH_X = Math.round((BEK_W - FISH_W) / 2);
export const FISH_Y = BEK_VIEW_Y + Math.round((BEK_VIEW_H - FISH_H) / 2);
export const FISH_TRACK_X = FISH_X + PAD_SM;
export const FISH_TRACK_Y = FISH_Y + PAD_SM + LINE_SM;
export const FISH_PROG_Y = FISH_TRACK_Y + FISH_TRACK_H + FISH_GAP;
export const FISH_NEEDLE_W = BEK_ART_SCALE * 2;
export const FISH_NEEDLE_OVER = BEK_ART_SCALE * 2;

/* ---- dialogue ------------------------------------------------------------
   Two columns. On the left a portrait with the speaker's name on a plate
   under it; on the right the line, and — when the line is a question — the
   answers as rows the selection actually moves between. The name used to be
   printed twice, once as a yellow header here and once inside the line
   itself, which is why nearly every string in BEK_TALK began 'ASTRID: '. The
   plate is now the only place a speaker is named and the prefixes are gone
   from the content tables.

   The box is derived from the text column outward and then the portrait is
   whatever height is left beside it, rather than the portrait being a size
   somebody picked: the body is DLG_BODY_LINES rows of large text plus the
   SPACE hint, and the portrait column is that same height less its plate. So
   raising DLG_BODY_LINES grows the portrait with the box and the two edges
   stay flush without anything being re-measured.

   DLG_BODY_LINES went from four to five with this pass. Nothing spoken needs
   more than three rows, but a question and its options are one block now (the
   options no longer scroll off the bottom silently) and the widest of those
   spends four — the fifth is the headroom layout_check.js measures. */
export const DLG_BODY_LINES = 5;
export const DLG_HINT_H = LINE_SM;                  /* the SPACE prompt row     */
export const DLG_GAP = BEK_ART_SCALE * 2;           /* seam between the parts   */
export const DLG_BODY_H = LINE_LG * DLG_BODY_LINES + DLG_HINT_H;
/* The plate is as wide as the longest speaker's name with two cells of quiet
   either side, rounded to whole character cells — content, not a guess — and
   the portrait above it is that same width, so the two read as one column. */
export const DLG_NAME_CELLS = Math.max(...BEK_NPCS.map(n => String(n.n).length)) + 4;
export const DLG_PLATE_H = LINE_SM + DLG_GAP;
export const DLG_PORT_W = CELL_SM * DLG_NAME_CELLS;
export const DLG_PORT_H = DLG_BODY_H - DLG_PLATE_H - DLG_GAP;
/* what portrait.js authors in: whole art pixels, each drawn as an exact
   BEK_ART_SCALE block, so the rig never lands on a fractional pixel */
export const PORT_SRC_W = DLG_PORT_W / BEK_ART_SCALE;
export const PORT_SRC_H = DLG_PORT_H / BEK_ART_SCALE;
export const DLG_W = BEK_W - CELL_SM * 4;
export const DLG_H = PAD_LG * 2 + DLG_BODY_H;
export const DLG_X = Math.round((BEK_W - DLG_W) / 2);
export const DLG_Y = HUD_BOT_Y - DLG_H - PAD_SM;
export const DLG_PORT_X = DLG_X + PAD_LG;
export const DLG_PORT_Y = DLG_Y + PAD_LG;
export const DLG_PLATE_Y = DLG_PORT_Y + DLG_PORT_H + DLG_GAP;
export const DLG_TX = DLG_PORT_X + DLG_PORT_W + PAD_LG;
export const DLG_TW = DLG_X + DLG_W - PAD_LG - DLG_TX;
/* Narration and the lot sign have no speaker and so no portrait: the text
   runs the whole box instead of leaving an empty column. Wrapping is checked
   against the narrow column, which is the worst case of the two. */
export const DLG_TX_FULL = DLG_X + PAD_LG;
export const DLG_TW_FULL = DLG_W - PAD_LG * 2;
/* a chosen option is a row, not a caret: the highlight spans the column */
export const DLG_ROW_PAD = BEK_ART_SCALE;

/* ---- small modal boxes --------------------------------------------------- */
export const SLEEP_W = inkW(both(UI.sleep).concat(both(UI.goodnight)), FONT_LG) + PAD_LG * 2;
export const SLEEP_H = PAD_LG * 2 + LINE_LG * 2;
export const SLEEP_X = Math.round((BEK_W - SLEEP_W) / 2);
export const SLEEP_Y = BEK_VIEW_Y + Math.round((BEK_VIEW_H - SLEEP_H) / 2);
export const SLEEP_TW = SLEEP_W - PAD_LG * 2;

export const OFFER_W = inkW(offerLabels.concat(['SPACE — KJØP    ESC — NEI', 'SPACE — BUY    ESC — NO', '999999 kr']), FONT_LG) + PAD_LG * 2;
/* the seller's name, on the same plate the dialogue box names them with —
   an offer arrives out of one of their lines and has to say whose */
export const OFFER_NAME_H = DLG_PLATE_H;
export const OFFER_H = PAD_LG * 2 + OFFER_NAME_H + DLG_GAP + LINE_LG * 3;
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
/* one pinned notice per row (menus_chrome.js's `note()`), sized to sit inside
   the board's own frame with room to spare either side of the text, and
   short of QUEST_ENTRY by QUEST_NOTE_GAP so the timber shows between two
   notices instead of them tiling edge to edge. */
export const QUEST_NOTE_X = QUEST_X + PANEL_FRAME + BORDER;
export const QUEST_NOTE_W = QUEST_W - (PANEL_FRAME + BORDER) * 2;
export const QUEST_NOTE_GAP = BORDER * 4;
export const QUEST_NOTE_H = QUEST_ENTRY - QUEST_NOTE_GAP;
export const QUEST_NOTE_INSET = BORDER * 2;             /* how far above the row's own text the note (and its pin) starts */

/* ---- the travel menu ----------------------------------------------------- */
export const TRAVEL_W = CELL_SM * 34;
export const TRAVEL_H = PAD_SM * 2 + LINE_SM * 2 + LINE_SM * 12;
export const TRAVEL_X = Math.round((BEK_W - TRAVEL_W) / 2);
export const TRAVEL_Y = Math.round((BEK_H - TRAVEL_H) / 2);
export const TRAVEL_TW = TRAVEL_W - PAD_SM * 2;

/* ---- the loft ------------------------------------------------------------
   Two columns, and the same derivation rule as everything above: the box is
   as tall as the widest wing is long. LOFT_ROWS is not a number somebody
   liked — it is the entry count of the largest wing in BEK_LOFT, so a wing
   that grows grows the panel with it and `spine_check.js` can assert the
   panel still fits on the canvas rather than hoping it does. */
export const LOFT_ROWS = Math.max(...BEK_LOFT.map(w => w.e.length));
export const LOFT_WINGS = BEK_LOFT.length;
/* an icon row with no padding, unlike the shop's: twelve of these plus two
   header lines and a footer is what has to clear *both* HUD bands, and the
   panel is centred in the viewport rather than on the canvas for the same
   reason — a box that covers the day and the energy bar is a box that hides
   the two things a player checks before deciding to walk home. */
export const LOFT_ROW = ICON_PX;
export const LOFT_W = BEK_W - CELL_SM * 4;
export const LOFT_H = PAD_SM * 2 + LINE_SM * 2 + LOFT_ROW * LOFT_ROWS + LINE_SM;
export const LOFT_X = Math.round((BEK_W - LOFT_W) / 2);
export const LOFT_Y = BEK_VIEW_Y + Math.round((BEK_VIEW_H - LOFT_H) / 2);
/* the wing column: a name, a count and a fill bar per wing, two text lines
   each, wide enough for the longest wing name in either language plus its
   own ' 12/12' count */
export const LOFT_COL_W = CELL_SM * 26;
export const LOFT_WING_ROW = LINE_SM * 2;
export const LOFT_BAR_W = LOFT_COL_W - CELL_SM * 3;
export const LOFT_BAR_H = GLYPH_SM / 2;
export const LOFT_COUNT_DX = LOFT_COL_W - CELL_SM * 8;
/* the entry column, beside it */
export const LOFT_ENTRY_DX = LOFT_COL_W + CELL_SM;
export const LOFT_NAME_DX = ICON_PX + BEK_ART_SCALE * 2;
export const LOFT_TW = LOFT_W - PAD_SM * 2 - LOFT_ENTRY_DX - LOFT_NAME_DX;

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
/* The loft's ending is an interior, so unlike the house's there is no empty
   sky for the lines to sit on — they go on the floor, under the shelves. The
   origin is derived backwards from the bottom of the canvas so the block, the
   day/count line and the SPACE prompt all clear each other however many lines
   the run earns, and LOFT_END_LINES is what menus_spine.js holds itself to. */
export const LOFT_END_LINES = 8;
export const LOFT_END_TEXT_Y = BEK_H - PAD_LG - GLYPH_SM - LINE_SM * (LOFT_END_LINES + 2);
