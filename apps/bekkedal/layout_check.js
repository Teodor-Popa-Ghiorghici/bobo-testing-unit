/* Bekkedal layout check — `node apps/bekkedal/layout_check.js`
 *
 * The bitmap font exists so that this file can run. With `fillText` the widths
 * were whatever the browser decided, so no check could say whether a string
 * fit its box; with an integer advance the question is arithmetic, and the
 * answer can be asserted before the game boots.
 *
 * Three families of assertion:
 *   geometry — the canvas, viewport, camera clamp range and every panel agree
 *              with each other and stay on screen;
 *   fishing  — the drawn reel zone and the drawn needle are the same 0..1
 *              figures the hit test reads, so the zone lands where it looks;
 *   text     — every box holds the longest string the content tables can
 *              actually put in it, in Norwegian and in English.
 */
import * as D from './data.js';
import * as F from './font.js';
import * as L from './layout.js';
import * as Q from './quests.js';
import { mineTitle, MINE_MAX, MINE_STATION } from './mine.js';
import { canPlace, connectivityOK, PLACE_BLOCKS } from './placement.js';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
let fails = 0, checks = 0;
const ok = (cond, label, detail) => {
  checks++;
  if (cond) return true;
  fails++; console.log('FAIL ' + label + (detail ? '   ' + detail : ''));
  return false;
};
const pass = (label, detail) => { checks++; console.log('OK   ' + label.padEnd(46) + (detail || '')); };

const w = (s, size) => String(s).length * F.FONT_ADV * size;
const cols = (px, size) => Math.max(1, Math.floor(px / (F.FONT_ADV * size)));
function wrapLines(t, px, size) {
  const per = cols(px, size), out = [];
  let line = '';
  for (const word of String(t).split(' ')) {
    let wd = word;
    while (wd.length > per) { if (line) { out.push(line); line = ''; } out.push(wd.slice(0, per)); wd = wd.slice(per); }
    if (!line) line = wd;
    else if (line.length + 1 + wd.length <= per) line += ' ' + wd;
    else { out.push(line); line = wd; }
  }
  if (line) out.push(line);
  return out.length ? out : [''];
}

/* Both languages, because a box that fits the Norwegian can still burst on the
   English and the player can switch at any time. */
const both = s => {
  if (s == null) return [];
  if (typeof s === 'string') return [s];
  return [s.no, s.en].filter(x => x != null);
};
const widest = arr => arr.reduce((a, b) => (b != null && String(b).length > String(a).length ? b : a), '');

/* ---- 1. geometry --------------------------------------------------------- */
console.log('\n-- geometry --');
ok(D.BEK_W / D.BEK_H === 16 / 9, 'canvas is 16:9', D.BEK_W + 'x' + D.BEK_H);
ok(D.BEK_MIN_COLS * D.BEK_T === D.BEK_W, 'the smallest legal map spans the canvas horizontally',
   D.BEK_MIN_COLS + '*' + D.BEK_T + ' = ' + D.BEK_W);
ok(D.BEK_VIEW_H === D.BEK_H - D.BEK_HUD_H * 2, 'viewport is the canvas less both HUD bands');
ok(D.BEK_T === D.BEK_T_SRC * D.BEK_ART_SCALE, 'presented tile is a whole multiple of the source tile');
ok(Number.isInteger(D.BEK_ART_SCALE), 'art scale is a whole number', 'x' + D.BEK_ART_SCALE);
ok(D.BEK_MIN_ROWS * D.BEK_T > D.BEK_VIEW_H,
   'even the smallest map is taller than the viewport, so the camera always has work to do');
pass('canvas / viewport', D.BEK_W + 'x' + D.BEK_H + ' view ' + D.BEK_VIEW_W + 'x' + D.BEK_VIEW_H +
     ' floor ' + D.BEK_MIN_COLS + 'x' + D.BEK_MIN_ROWS);

/* ---- the maps' own dimensions ------------------------------------------
   Maps no longer have to be one size, so this is no longer a single equality
   against BEK_COLS/BEK_ROWS. What has to hold instead is that each map's
   rows are rectangular (a short row would read as 'T' past its end and put a
   wall through the middle of a field), that no map is smaller than the
   viewport plus the overhang the camera has always had, and that each map's
   own camera clamp range is exactly its overhang on both axes — which is
   what welds its outermost rows and columns to the frame. */
const maps = Object.entries(D.BEK_MAPS);
for (const [id, m] of maps) {
  const cols = D.mapCols(id), rows = D.mapRows(id);
  ok(m.rows.length === rows && m.rows.every(r => r.length === cols),
     'map rows are rectangular: ' + id, cols + 'x' + rows);
  ok(cols >= D.BEK_MIN_COLS && rows >= D.BEK_MIN_ROWS,
     'map is at least ' + D.BEK_MIN_COLS + 'x' + D.BEK_MIN_ROWS + ': ' + id, cols + 'x' + rows);
  ok(D.camMaxX(id) === Math.max(0, cols * D.BEK_T - D.BEK_VIEW_W) &&
     D.camMaxY(id) === Math.max(0, rows * D.BEK_T - D.BEK_VIEW_H),
     'camera clamp range matches its own dimensions: ' + id,
     'camX 0..' + D.camMaxX(id) + '  camY 0..' + D.camMaxY(id));
}
pass('every map sized and clamped from its own rows', maps.length + ' maps, largest ' +
     maps.reduce((a, [id]) => Math.max(a, D.mapCols(id) * D.mapRows(id)), 0) + ' tiles');

/* every panel must sit inside the canvas */
const boxes = [
  ['top HUD', 0, 0, D.BEK_W, D.BEK_HUD_H],
  ['bottom HUD', 0, L.HUD_BOT_Y, D.BEK_W, D.BEK_HUD_H],
  ['tooltip', L.TIP_X, L.TIP_Y, L.TIP_W, L.TIP_H],
  ['fishing', L.FISH_X, L.FISH_Y, L.FISH_W, L.FISH_H],
  ['dialogue', L.DLG_X, L.DLG_Y, L.DLG_W, L.DLG_H],
  ['sleep', L.SLEEP_X, L.SLEEP_Y, L.SLEEP_W, L.SLEEP_H],
  ['offer', L.OFFER_X, L.OFFER_Y, L.OFFER_W, L.OFFER_H],
  ['shop', L.SHOP_X, L.SHOP_Y, L.SHOP_W, L.SHOP_H],
  ['bag', L.BAG_X, L.BAG_Y, L.BAG_W, L.BAG_H],
  ['quests', L.QUEST_X, L.QUEST_Y, L.QUEST_W, L.QUEST_H],
  ['travel', L.TRAVEL_X, L.TRAVEL_Y, L.TRAVEL_W, L.TRAVEL_H],
  ['loft', L.LOFT_X, L.LOFT_Y, L.LOFT_W, L.LOFT_H]
];
for (const [name, x, y, bw, bh] of boxes)
  ok(x >= 0 && y >= 0 && x + bw <= D.BEK_W && y + bh <= D.BEK_H, 'panel on screen: ' + name,
     '(' + x + ',' + y + ' ' + bw + 'x' + bh + ')');
ok(L.DLG_Y + L.DLG_H <= L.HUD_BOT_Y, 'dialogue clears the bottom HUD band');
/* the loft's two columns, sized the same derived way the rest of these are:
   LOFT_ROWS is the largest wing's own entry count and LOFT_WINGS is how many
   wings there are (layout.js reads BEK_LOFT for both), so a wing that grows
   grows the panel and this is what says it still fits. Its *content* — that
   the plinths are real, that every display is a PROP kind — is
   apps/bekkedal/spine_check.js, beside the rest of the loft. */
{
  const contentH = L.LOFT_H - L.PAD_SM * 2 - L.LINE_SM * 3;
  ok(L.LOFT_ROW * L.LOFT_ROWS <= contentH, 'the loft\u2019s widest wing fits its entry column',
     L.LOFT_ROWS + ' rows of ' + L.LOFT_ROW + 'px in ' + contentH);
  ok(L.LOFT_WING_ROW * L.LOFT_WINGS <= contentH, 'and all its wings fit the wing column',
     L.LOFT_WINGS + ' rows of ' + L.LOFT_WING_ROW + 'px in ' + contentH);
  const labels = [], wings = [];
  D.BEK_LOFT.forEach(wg => {
    both(wg.t).forEach(t => wings.push('> ' + t));
    wg.e.forEach(e => labels.push(...(e.t ? both(e.t) : both(D.BEK_ITEMS[e.item].name))));
  });
  ok(widest(labels) !== null && w(widest(labels), F.FONT_SM) <= L.LOFT_TW,
     'the longest loft entry label fits its column', w(widest(labels), F.FONT_SM) + 'px of ' + L.LOFT_TW);
  ok(w(widest(wings), F.FONT_SM) <= L.LOFT_COUNT_DX,
     'the longest wing name clears its own count column', w(widest(wings), F.FONT_SM) + 'px of ' + L.LOFT_COUNT_DX);
}

/* ---- the dialogue box's two columns --------------------------------------
   The portrait is not a size somebody picked: it is what is left beside the
   text once the body's rows and the name plate under it are accounted for.
   These assertions are what make that a fact rather than a coincidence —
   change DLG_BODY_LINES and every one of them still has to hold. The two
   *content* guards that go with the box (that no spoken line repeats the
   name on the plate, and that every mood a line asks for is a face the rig
   has) are conventions rather than geometry, so they live in
   scripts/lint-content.mjs beside the rest of them. */
console.log('\n-- the dialogue box --');
ok(L.DLG_PORT_H + L.DLG_GAP + L.DLG_PLATE_H === L.DLG_BODY_H,
   'the portrait column and the text body are flush',
   'portrait ' + L.DLG_PORT_H + ' + gap ' + L.DLG_GAP + ' + plate ' + L.DLG_PLATE_H + ' = body ' + L.DLG_BODY_H);
ok(L.DLG_PORT_W % D.BEK_ART_SCALE === 0 && L.DLG_PORT_H % D.BEK_ART_SCALE === 0,
   'the portrait is a whole number of art pixels',
   L.PORT_SRC_W + 'x' + L.PORT_SRC_H + ' art px at x' + D.BEK_ART_SCALE);
ok(L.DLG_TX + L.DLG_TW === L.DLG_X + L.DLG_W - L.PAD_LG &&
   L.DLG_PORT_X + L.DLG_PORT_W + L.PAD_LG === L.DLG_TX,
   'portrait column, gutter and text column fill the box exactly',
   L.DLG_PORT_W + ' + ' + L.PAD_LG + ' + ' + L.DLG_TW + ' = ' + (L.DLG_W - L.PAD_LG * 2));
const speaker = widest(D.BEK_NPCS.map(n => n.n));
ok(w(speaker, F.FONT_SM) + L.CELL_SM * 2 <= L.DLG_PORT_W, 'the name plate holds the longest speaker',
   JSON.stringify(speaker) + ' = ' + w(speaker, F.FONT_SM) + 'px of ' + L.DLG_PORT_W);
ok(w(speaker, F.FONT_SM) + L.CELL_SM * 2 <= L.OFFER_W - L.PAD_LG * 2, 'and so does the offer box');

pass('portrait column and name plate', L.PORT_SRC_W + 'x' + L.PORT_SRC_H + ' art px, plate ' +
     L.DLG_NAME_CELLS + ' cells, text column ' + cols(L.DLG_TW, F.FONT_LG) + ' chars/row');

/* ---- 2. the fishing reel zone -------------------------------------------- */
console.log('\n-- fishing reel zone --');
/* the safe-tension bands fishTap actually sets (common, rare, legend), each
   also sampled at its widest — fish lvl3 (+0.04) and reinforced line
   (+0.03) stacked, the most a zone can ever widen by */
const BASE_BANDS = [[0.34, 0.66], [0.455, 0.545], [0.42, 0.58]];
const WIDEN = [0, 0.07];
const BANDS = BASE_BANDS.flatMap(([z0, z1]) => WIDEN.map(w => [Math.max(0, z0 - w), Math.min(1, z1 + w)]));
let drift = 0, worst = null;
for (const [z0, z1] of BANDS) {
  const zx = Math.round(L.FISH_TRACK_W * z0);
  const zw = Math.max(L.FISH_NEEDLE_W, Math.round(L.FISH_TRACK_W * z1) - zx);
  ok(zw === Math.round(L.FISH_TRACK_W * z1) - zx,
     'zone ' + z0 + '..' + z1 + ' is drawn true, not floored to the minimum width', zw + 'px');
  for (let i = 0; i <= 2000; i++) {
    const pos = i / 2000;
    const hit = pos > z0 && pos < z1;                      /* tickFish's test, verbatim */
    const centre = Math.round(L.FISH_TRACK_W * pos);       /* drawn needle centre, track-relative */
    const inside = centre >= zx && centre < zx + zw;       /* what the player sees */
    if (hit !== inside) {
      const edge = Math.min(Math.abs(pos - z0), Math.abs(pos - z1));
      drift++; if (!worst || edge > worst.edge) worst = { pos, edge, hit, inside };
    }
  }
}
/* Rounding puts at most a half pixel of disagreement right at the boundary;
   anything beyond that would mean the zone lies about where it is. */
const tol = 1 / L.FISH_TRACK_W;
ok(!worst || worst.edge <= tol, 'needle agrees with the hit test to within one boundary pixel',
   worst ? 'worst disagreement ' + (worst.edge * L.FISH_TRACK_W).toFixed(2) + 'px from the edge' : 'exact');
pass('reel zone lands where it appears',
     'track ' + L.FISH_TRACK_W + 'px, worst drift ' +
     (worst ? (worst.edge * L.FISH_TRACK_W).toFixed(2) : '0.00') + 'px at the zone edge, ' +
     drift + '/4002 samples');

/* ---- 3. text fits its boxes ---------------------------------------------- */
console.log('\n-- text --');
const items = Object.values(D.BEK_ITEMS);
const longestItem = widest(items.flatMap(i => both(i.name)));
/* The eleven authored maps, plus the deepest floor of the descent: a
   generated floor is never in BEK_MAPS at rest (it is registered at runtime,
   which is what keeps world_check.js and palette_check.js walking exactly the
   authored valley), so its title has to be asked for by name or the HUD band
   and the lift's list would both be measured against a map it can show and
   this check has never seen. */
const longestTitle = widest(Object.values(D.BEK_MAPS).flatMap(m => both(m.title))
  .concat(both(mineTitle(MINE_MAX))));
const longestTool = widest([].concat(
  D.BEK_TOOLS.flatMap(t => both(t.name)), D.AXE_NAME.no, D.AXE_NAME.en, D.PICK_NAME.no, D.PICK_NAME.en));
const longestUI = widest(Object.values(D.UI).flatMap(both));

/* every glyph the content can ask for must exist */
const src = ['index.js', 'data.js', 'maps.js', 'maps_valley.js', 'maps_wild.js',
             'talk_town.js', 'talk_water.js', 'talk_field.js', 'talk_stone.js',
             'scenes_valley.js', 'scenes_wild.js', 'scene.js']
  .map(f => readFileSync(join(HERE, f), 'utf8')).join('\n');
const used = new Set();
for (const m of src.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g))
  for (const ch of (m[1] ?? m[2]).replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))))
    if (ch >= ' ') used.add(ch);
const missing = [...used].filter(c => !(c in F.FONT_GLYPHS));
ok(missing.length === 0, 'every character in the sources has a glyph',
   used.size + ' distinct' + (missing.length ? ', missing ' + JSON.stringify(missing.join('')) : ''));

/* the top HUD band flows left to right and must stop short of the energy bar */
const hudFields = [longestTitle, 'DAG 999 23:59', '999999kr', '999', longestTool];
let hx = L.HUD_PAD;
hudFields.forEach((f, i) => { hx += w(f, F.FONT_SM) + L.HUD_GAP; if (i === 2) hx += L.DROP_W + D.BEK_ART_SCALE; });
ok(hx <= L.EN_BAR_X, 'top HUD flow clears the energy bar',
   'ends at ' + hx + ', bar at ' + L.EN_BAR_X + ' (' + (L.EN_BAR_X - hx) + 'px spare)');

/* the bottom band carries one line of note text */
const notes = [...src.matchAll(/say\(\s*TX\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'/g)]
  .flatMap(m => [m[1], m[2]]);
const longestNote = widest(notes.concat(Object.values(D.UI).flatMap(both)));
ok(w(longestNote, F.FONT_SM) <= D.BEK_W - L.HUD_PAD * 2, 'longest note fits the bottom HUD band',
   JSON.stringify(longestNote.slice(0, 44)) + ' = ' + w(longestNote, F.FONT_SM) + 'px of ' + (D.BEK_W - L.HUD_PAD * 2));

/* dialogue wraps, so the test is that it wraps into the rows the box has.
   Everything the box can be handed goes through here, and that is more than
   a `nodes[]` entry's own `lines`: a chat line's `t` is drawn in the same
   box by the same code (talkTo()'s else branch, index.js), and so are an
   offer's `ok` and its refusal `no`. Those three used to fall out of this
   walker — it recursed past a `t` array without collecting it — which left
   the widest content in the game unmeasured. They are named explicitly now,
   and `Array.isArray` is what keeps a {no, en} pair's own `no` (a string,
   not a list of them) out of the list. */
const SPOKEN = ['lines', 't', 'ok', 'no'];
const dlgLines = [];
const walk = o => {
  if (!o || typeof o !== 'object') return;
  if (Array.isArray(o)) return o.forEach(walk);
  SPOKEN.forEach(k => { if (Array.isArray(o[k])) o[k].forEach(l => dlgLines.push(...both(l))); });
  if (o.ask) { dlgLines.push(...both(o.ask.q)); o.ask.opts.forEach(x => { dlgLines.push(...both(x.t)); (x.reply || []).forEach(r => dlgLines.push(...both(r))); }); }
  Object.values(o).forEach(walk);
};
walk(D.BEK_TALK);
const talkLineCount = dlgLines.length;
/* A heart event's beats are drawn through the same box, out of a table the
   walker above never reaches — same `lines` shape, so the same walker does
   the job once it is pointed at BEK_SCENES. Counted together with the rest:
   the longest string the content tables can produce is as likely to be in a
   scene as in a chat line. */
walk(D.BEK_SCENES);
const worstWrap = dlgLines.reduce((a, l) => Math.max(a, wrapLines(l, L.DLG_TW, F.FONT_LG).length), 0);
ok(worstWrap <= L.DLG_BODY_LINES, 'every dialogue line wraps inside the box',
   'worst is ' + worstWrap + ' of ' + L.DLG_BODY_LINES + ' rows (' + cols(L.DLG_TW, F.FONT_LG) + ' chars/row)');
const worstLine = widest(dlgLines);
pass('dialogue and scene lines measured', dlgLines.length + ' strings (' + talkLineCount +
     ' spoken in conversation, ' + (dlgLines.length - talkLineCount) + ' in heart events), longest ' +
     worstLine.length + ' chars');

/* GIFTING: a gift reaction is drawn through the same dialogue box (dlg.lines)
   as a BEK_TALK node, but lives in BEK_NPCS[].gift.reactions instead — the
   walker above never reaches it, so it gets its own pass over the same box. */
const giftLines = [];
D.BEK_NPCS.forEach(n => {
  if (!n.gift) return;
  Object.values(n.gift.reactions).forEach(ls => ls.forEach(l => giftLines.push(...both(l))));
});
const worstGift = giftLines.reduce((a, l) => Math.max(a, wrapLines(l, L.DLG_TW, F.FONT_LG).length), 0);
ok(worstGift <= L.DLG_BODY_LINES, 'every gift reaction line wraps inside the box',
   'worst is ' + worstGift + ' of ' + L.DLG_BODY_LINES + ' rows (' + giftLines.length + ' lines checked)');
/* a question plus its options must also fit the same rows */
const askWorst = (() => {
  let m = 0;
  const seek = o => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return o.forEach(seek);
    if (o.ask) {
      for (const lang of ['no', 'en']) {
        let rows = wrapLines(o.ask.q[lang] ?? o.ask.q, L.DLG_TW, F.FONT_LG).length;
        o.ask.opts.forEach(x => { rows += wrapLines('> ' + (x.t[lang] ?? x.t), L.DLG_TW, F.FONT_LG).length; });
        m = Math.max(m, rows);
      }
    }
    Object.values(o).forEach(seek);
  };
  seek(D.BEK_TALK); return m;
})();
ok(askWorst <= L.DLG_BODY_LINES, 'every question and its options fit the box together', askWorst + ' of ' + L.DLG_BODY_LINES + ' rows');

/* the list menus have hard columns, so their contents must fit outright */
const shopNameW = L.SHOP_PRICE_DX - L.SHOP_NAME_DX;
ok(w('> ' + longestItem + ' x99', F.FONT_SM) <= shopNameW, 'shop name column holds the longest item',
   w('> ' + longestItem + ' x99', F.FONT_SM) + 'px of ' + shopNameW);
ok(w('9999 kr', F.FONT_SM) <= L.SHOP_COL_W - L.SHOP_PRICE_DX, 'shop price column holds a four-figure price');
const bagNameW = L.BAG_QTY_DX - L.BAG_NAME_DX;
ok(w(longestItem, F.FONT_SM) <= bagNameW, 'bag name column holds the longest item',
   JSON.stringify(longestItem) + ' = ' + w(longestItem, F.FONT_SM) + 'px of ' + bagNameW);
ok(w('x999', F.FONT_SM) <= L.BAG_CW - L.BAG_QTY_DX, 'bag quantity column fits its cell');

const longestQuestT = widest(D.BEK_QUESTS.flatMap(q => both(q.t)));
const longestQuestD = widest(D.BEK_QUESTS.flatMap(q => both(q.d)));
ok(w(longestQuestT, F.FONT_SM) <= L.QUEST_TW, 'quest title clears the status column',
   w(longestQuestT, F.FONT_SM) + 'px of ' + L.QUEST_TW);
ok(w(longestQuestD, F.FONT_SM) + L.CELL_SM <= L.QUEST_W - L.PAD_SM * 2, 'quest detail fits the board',
   JSON.stringify(longestQuestD.slice(0, 36)) + ' = ' + w(longestQuestD, F.FONT_SM) + 'px');

/* the repeatable board (quests.js) generates its own title/detail strings
   from whichever item/npc get rolled — the worst case is the longest item
   name any template can pick times the longest talkable NPC name */
const worstQtItem = D.BEK_QUEST_TEMPLATES.flatMap(t => t.items).reduce((a, b) =>
  w(D.BEK_ITEMS[b].name.en, F.FONT_SM) > w(D.BEK_ITEMS[a].name.en, F.FONT_SM) ? b : a);
const worstNpc = D.BEK_NPCS.filter(n => D.BEK_TALK[n.id]).reduce((a, b) => (b.n.length > a.n.length ? b : a));
const worstQty = Math.max(...D.BEK_QUEST_TEMPLATES.map(t => t.qty[1]));
const sampleRQ = { item: worstQtItem, qty: worstQty, who: worstNpc.id, expireDay: 999 };
const longestRqT = widest(both(Q.questTitle(sampleRQ)));
const longestRqD = widest(both(Q.questDetail(sampleRQ)));
ok(w(longestRqT, F.FONT_SM) <= L.QUEST_TW, 'repeatable quest title clears the status column',
   w(longestRqT, F.FONT_SM) + 'px of ' + L.QUEST_TW);
ok(w(longestRqD, F.FONT_SM) + L.CELL_SM <= L.QUEST_W - L.PAD_SM * 2, 'repeatable quest detail fits the board',
   JSON.stringify(longestRqD.slice(0, 36)) + ' = ' + w(longestRqD, F.FONT_SM) + 'px');

/* fixed (up to 7) + live repeatable (up to BEK_QUEST_BOARD_MAX) + the house
   is more rows than QUEST_VISIBLE_ROWS holds at once — drawQuests() scrolls
   rather than growing the panel, so the worst case must fit the scroll
   indicator beside ESC rather than the rows themselves */
const worstRows = D.BEK_QUESTS.length + D.BEK_QUEST_BOARD_MAX + 1;
ok(worstRows > L.QUEST_VISIBLE_ROWS, 'the board can exceed one screen and relies on scrolling for it',
   worstRows + ' worst-case rows over ' + L.QUEST_VISIBLE_ROWS + ' visible');
const scrollLabel = 'W/S — SCROLL  ' + worstRows + '/' + worstRows;
ok(w(scrollLabel, F.FONT_SM) + L.CELL_SM + w('ESC', F.FONT_SM) <= L.QUEST_W - L.PAD_SM * 2,
   'scroll indicator clears the ESC label', w(scrollLabel, F.FONT_SM) + 'px of ' + (L.QUEST_W - L.PAD_SM * 2 - L.CELL_SM - w('ESC', F.FONT_SM)));

ok(w('> ' + longestTitle, F.FONT_SM) <= L.TRAVEL_TW, 'travel list holds the longest map name');
ok(Object.keys(D.BEK_MAPS).length <= 12, 'travel list has a row per destination', Object.keys(D.BEK_MAPS).length + ' maps');
/* The same panel is the mine's hoist (`enterMine()` in index.js), and that is
   now the longer of the two lists by some way: the travel menu is two places
   up the mountain, and the hoist is floor 1 plus every station down to
   MINE_MAX. Its rows have to clear the cost line at the foot of the sign,
   which the two-row case never came close to. */
/* the floor at the top, every station down to the bottom, and — once the
   loft's mountain wing is full — the one deepest floor you have reached, if
   it is not already a station (mineStations(), index.js) */
const hoistRows = 1 + Math.floor(MINE_MAX / MINE_STATION) + 1;
const lastRow = L.PAD_SM + L.LINE_SM * 2 + (hoistRows - 1) * L.LINE_SM + L.GLYPH_SM;
const hintTop = L.TRAVEL_H - L.PAD_SM - L.GLYPH_SM;
ok(lastRow <= hintTop, 'the hoist list clears the cost line at the foot of the sign',
   hoistRows + ' rows end at ' + lastRow + ', the line sits at ' + hintTop + ' (' + (hintTop - lastRow) + 'px spare)');
ok(w('> ' + widest(both(mineTitle(MINE_MAX))), F.FONT_SM) <= L.TRAVEL_TW,
   'the hoist list holds the deepest floor name', JSON.stringify(mineTitle(MINE_MAX).en));

ok(w(longestItem, F.FONT_SM) <= L.TIP_W - L.PAD_SM * 2, 'crop tooltip holds the longest crop name');
ok(L.TIP_COL2 + w('WATERED', F.FONT_SM) <= L.TIP_W - L.PAD_SM * 2, 'tooltip second column fits');

const fishLabels = ['LEGENDARISK! NÅ!', 'LEGENDARY! NOW!', 'SJELDEN! NÅ!', 'RARE! NOW!', 'NÅ! SPACE', 'NOW! SPACE',
                     'DRA INN!', 'REEL IN!', 'SLIPP!', 'EASE OFF!', 'HOLD.', 'VENTER...', 'WAITING...'];
ok(fishLabels.every(l => w(l, F.FONT_SM) <= L.FISH_TRACK_W), 'every fishing label fits the box',
   'widest ' + w(widest(fishLabels), F.FONT_SM) + 'px of ' + L.FISH_TRACK_W);

ok(w(widest(both(D.UI.sleep).concat(both(D.UI.goodnight))), F.FONT_LG) <= L.SLEEP_W - L.PAD_LG * 2,
   'sleep box holds its two lines at the large size');
ok(w('SPACE — KJØP    ESC — NEI', F.FONT_LG) <= L.OFFER_W - L.PAD_LG * 2, 'offer box holds its prompt');
ok(w(longestUI, F.FONT_LG) <= L.SLEEP_W - L.PAD_LG * 2,
   'the longest UI string fits the box that shows it',
   JSON.stringify(longestUI) + ' = ' + w(longestUI, F.FONT_LG) + 'px of ' + (L.SLEEP_W - L.PAD_LG * 2));

/* ---- N. FURNISHING: a placement must never trap the player --------------
   `placement.js` is the validity function — pure, no canvas, exactly what
   this file exists to exercise directly rather than trusting the argument.
   Two families: synthetic corridors where the trap is known and constructed
   (so the test does not depend on any authored map ever happening to have
   one), and a sweep of the eleven real maps checking canPlace()'s answer
   agrees with an independent connectivity read on every candidate tile. */
console.log('\n-- FURNISHING: placement validity --');
ok(Object.keys(PLACE_BLOCKS).sort().join(',') === 'gjerde,grind', 'only the fence and the gate ever block a tile',
   JSON.stringify(PLACE_BLOCKS));

/* a one-tile corridor: the only way from the player's own square (x=1) to
   the door (x=3) runs through x=2 — fencing that square must be refused */
const corridor = { rows: ['TTTTT', 'TgggD', 'TTTTT'] };
ok(!canPlace(corridor, {}, 1, 1, 2, 1, 'gjerde'), 'a fence across the only corridor to a door is refused');
ok(canPlace(corridor, {}, 1, 1, 2, 1, 'stol'), 'a non-blocking kind is never refused for the same square — only gjerde/grind reason about traps');

/* the same shape, but the target is a seam exit rather than a door */
const corridorExit = { rows: ['TTTTT', 'TgggT', 'TTTTT'], exits: [{ x: 4, y: 1, to: 'town', tx: 1, ty: 1 }] };
ok(!canPlace(corridorExit, {}, 1, 1, 2, 1, 'grind'), 'a gate across the only corridor to a mapped exit is refused');

/* the same shape again, with a bed at the far end instead */
const corridorBed = { rows: ['TTTTT', 'Tgggb', 'TTTTT'] };
ok(!canPlace(corridorBed, {}, 1, 1, 2, 1, 'gjerde'), 'a fence across the only corridor to a bed is refused');

/* a loop with a second route round: blocking one leg is allowed because the
   other leg still reaches the door, which is the case a purely local check
   (look only at the candidate tile's own neighbours) could not tell apart
   from a real trap — the flood fill can. */
const loop = { rows: ['TTTTT', 'TgggD', 'TgTgT', 'TgggT', 'TTTTT'] };
ok(canPlace(loop, {}, 1, 1, 2, 1, 'gjerde'), 'blocking one leg of a loop is allowed while the other leg still reaches the door');
ok(canPlace(loop, {}, 1, 3, 2, 3, 'gjerde'), 'the same holds for the other leg');

/* wide open ground: nothing here is ever a trap, and the answer must never
   depend on which square of the open floor is asked about */
const field = { rows: ['TTTTTT', 'TggggT', 'TggggT', 'TggggT', 'TTTTTT'] };
let openOk = 0, openTotal = 0;
for (let y = 1; y <= 3; y++) for (let x = 1; x <= 4; x++) {
  if (x === 1 && y === 1) continue;                 /* the player's own square */
  openTotal++;
  if (canPlace(field, {}, 1, 1, x, y, 'gjerde')) openOk++;
}
ok(openOk === openTotal, 'a fence is never refused on open ground with no door/exit/bed at all',
   openOk + '/' + openTotal);

/* the real content: for every authored map, every candidate tile a fence
   could stand on is swept, and canPlace()'s answer is asserted to agree
   with connectivityOK() read independently at that same tile — the same
   function under two different entry points rather than one call trusting
   the other silently. A start tile is the first walkable, non-door square
   the map's own rows contain, which every map has (BEK_MIN_COLS/ROWS and
   the solid rim both guarantee at least one interior tile). */
let sweepMaps = 0, sweepTiles = 0;
Object.keys(D.BEK_MAPS).forEach(id => {
  const def = D.BEK_MAPS[id];
  const rows = def.rows, cols = rows[0].length, rowsN = rows.length;
  let sx = -1, sy = -1;
  for (let y = 0; y < rowsN && sx < 0; y++) for (let x = 0; x < cols; x++) {
    const c = rows[y].charAt(x);
    if (c !== 'D' && D.BEK_SOLID.indexOf(c) < 0) { sx = x; sy = y; break; }
  }
  if (sx < 0) return;                                /* no walkable tile at all — nothing to sweep */
  sweepMaps++;
  for (let y = 0; y < rowsN; y++) for (let x = 0; x < cols; x++) {
    if (x === sx && y === sy) continue;
    const c = rows[y].charAt(x);
    if (c === 'D' || D.BEK_SOLID.indexOf(c) >= 0) continue;
    sweepTiles++;
    const want = connectivityOK(def, {}, sx, sy, { x, y });
    const got = canPlace(def, {}, sx, sy, x, y, 'gjerde');
    if (want !== got) ok(false, 'canPlace agrees with connectivityOK', id + ' @ ' + x + ',' + y + ' want=' + want + ' got=' + got);
  }
});
ok(sweepMaps === Object.keys(D.BEK_MAPS).length, 'every authored map had a walkable tile to sweep from',
   sweepMaps + '/' + Object.keys(D.BEK_MAPS).length);
pass('swept every candidate fence tile on every authored map', sweepMaps + ' maps, ' + sweepTiles + ' tiles');

/* ---- BILINGUAL: no {no,en} pair may be byte-identical ------------------- */
console.log('\n-- bilingual toggle --');
/* A {no,en} pair that is byte-identical is either translation debt (an
 * English sentence nobody translated) or a redundant object where a plain
 * string would do (a proper noun/loanword genuinely spelled the same in
 * both). Either way it should not exist as a {no,en} pair — this sweeps
 * every .js file in the app for the pattern directly out of source text, so
 * a new one introduced later fails the check rather than going unnoticed. */
const __dir2 = dirname(fileURLToPath(import.meta.url));
const dataFiles = readdirSync(__dir2).filter(f => f.endsWith('.js') && !f.endsWith('_check.js'));
const identicalPairs = [];
dataFiles.forEach(f => {
  const src = readFileSync(join(__dir2, f), 'utf8');
  const re = /\{\s*no:\s*'((?:[^'\\]|\\.)*)',\s*en:\s*'((?:[^'\\]|\\.)*)'\s*\}/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[1] === m[2]) identicalPairs.push(f + ': ' + JSON.stringify(m[1]));
  }
});
ok(identicalPairs.length === 0, 'no {no,en} pair is byte-identical',
   identicalPairs.length ? identicalPairs.slice(0, 5).join(' | ') : dataFiles.length + ' files swept');

console.log('\n' + (fails ? fails + ' of ' + checks + ' checks FAILED' : 'All ' + checks + ' layout checks pass.'));
process.exit(fails ? 1 : 0);
