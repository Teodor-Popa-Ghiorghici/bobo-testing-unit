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
import { readFileSync } from 'fs';
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
ok(D.BEK_COLS * D.BEK_T === D.BEK_W, 'map spans the canvas horizontally', D.BEK_COLS + '*' + D.BEK_T + ' = ' + D.BEK_W);
ok(D.BEK_VIEW_H === D.BEK_H - D.BEK_HUD_H * 2, 'viewport is the canvas less both HUD bands');
ok(D.BEK_CAM_MAX_X === 0, 'camera never scrolls horizontally');
ok(D.BEK_CAM_MAX_Y === D.BEK_MAP_H - D.BEK_VIEW_H, 'vertical camera travel matches the overhang', D.BEK_CAM_MAX_Y + 'px');
ok(D.BEK_T === D.BEK_T_SRC * D.BEK_ART_SCALE, 'presented tile is a whole multiple of the source tile');
ok(Number.isInteger(D.BEK_ART_SCALE), 'art scale is a whole number', 'x' + D.BEK_ART_SCALE);
ok(D.BEK_MAP_H > D.BEK_VIEW_H, 'the valley is taller than the viewport, so the camera has work to do');
pass('canvas / viewport / camera', D.BEK_W + 'x' + D.BEK_H + ' view ' + D.BEK_VIEW_W + 'x' + D.BEK_VIEW_H + ' camY 0..' + D.BEK_CAM_MAX_Y);

/* the map data this all rests on must not have moved */
const maps = Object.entries(D.BEK_MAPS);
ok(maps.every(([, m]) => m.rows.length === D.BEK_ROWS && m.rows.every(r => r.length === D.BEK_COLS)),
   'all maps are still ' + D.BEK_COLS + 'x' + D.BEK_ROWS + ' tiles', maps.length + ' maps');

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
  ['travel', L.TRAVEL_X, L.TRAVEL_Y, L.TRAVEL_W, L.TRAVEL_H]
];
for (const [name, x, y, bw, bh] of boxes)
  ok(x >= 0 && y >= 0 && x + bw <= D.BEK_W && y + bh <= D.BEK_H, 'panel on screen: ' + name,
     '(' + x + ',' + y + ' ' + bw + 'x' + bh + ')');
ok(L.DLG_Y + L.DLG_H <= L.HUD_BOT_Y, 'dialogue clears the bottom HUD band');

/* ---- 2. the fishing reel zone -------------------------------------------- */
console.log('\n-- fishing reel zone --');
/* the two difficulty bands tickFish actually uses */
const BANDS = [[0.455, 0.545], [0.34, 0.66]];
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
const longestTitle = widest(Object.values(D.BEK_MAPS).flatMap(m => both(m.title)));
const longestTool = widest([].concat(
  D.BEK_TOOLS.flatMap(t => both(t.name)), D.AXE_NAME.no, D.AXE_NAME.en, D.PICK_NAME.no, D.PICK_NAME.en));
const longestUI = widest(Object.values(D.UI).flatMap(both));

/* every glyph the content can ask for must exist */
const src = ['index.js', 'data.js'].map(f => readFileSync(join(HERE, f), 'utf8')).join('\n');
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

/* dialogue wraps, so the test is that it wraps into the rows the box has */
const dlgLines = [];
const walk = o => {
  if (!o || typeof o !== 'object') return;
  if (Array.isArray(o)) return o.forEach(walk);
  if (o.lines) o.lines.forEach(l => dlgLines.push(...both(l)));
  if (o.ask) { dlgLines.push(...both(o.ask.q)); o.ask.opts.forEach(x => { dlgLines.push(...both(x.t)); (x.reply || []).forEach(r => dlgLines.push(...both(r))); }); }
  Object.values(o).forEach(walk);
};
walk(D.BEK_TALK);
const worstWrap = dlgLines.reduce((a, l) => Math.max(a, wrapLines(l, L.DLG_TW, F.FONT_LG).length), 0);
ok(worstWrap <= L.DLG_BODY_LINES, 'every dialogue line wraps inside the box',
   'worst is ' + worstWrap + ' of ' + L.DLG_BODY_LINES + ' rows (' + cols(L.DLG_TW, F.FONT_LG) + ' chars/row)');
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
ok(D.BEK_QUESTS.length + 1 <= 8, 'the board has a row for every quest plus the house', D.BEK_QUESTS.length + ' quests');

ok(w('> ' + longestTitle, F.FONT_SM) <= L.TRAVEL_TW, 'travel list holds the longest map name');
ok(Object.keys(D.BEK_MAPS).length <= 12, 'travel list has a row per destination', Object.keys(D.BEK_MAPS).length + ' maps');

ok(w(longestItem, F.FONT_SM) <= L.TIP_W - L.PAD_SM * 2, 'crop tooltip holds the longest crop name');
ok(L.TIP_COL2 + w('WATERED', F.FONT_SM) <= L.TIP_W - L.PAD_SM * 2, 'tooltip second column fits');

const fishLabels = ['DRA! SPACE x9', 'REEL! SPACE x9', 'SJELDEN! NÅ!', 'RARE! NOW!', 'VENTER...', 'WAITING...'];
ok(fishLabels.every(l => w(l, F.FONT_SM) <= L.FISH_TRACK_W), 'every fishing label fits the box',
   'widest ' + w(widest(fishLabels), F.FONT_SM) + 'px of ' + L.FISH_TRACK_W);

ok(w(widest(both(D.UI.sleep).concat(both(D.UI.goodnight))), F.FONT_LG) <= L.SLEEP_W - L.PAD_LG * 2,
   'sleep box holds its two lines at the large size');
ok(w('SPACE — KJØP    ESC — NEI', F.FONT_LG) <= L.OFFER_W - L.PAD_LG * 2, 'offer box holds its prompt');
ok(w(longestUI, F.FONT_LG) <= L.SLEEP_W - L.PAD_LG * 2,
   'the longest UI string fits the box that shows it',
   JSON.stringify(longestUI) + ' = ' + w(longestUI, F.FONT_LG) + 'px of ' + (L.SLEEP_W - L.PAD_LG * 2));

console.log('\n' + (fails ? fails + ' of ' + checks + ' checks FAILED' : 'All ' + checks + ' layout checks pass.'));
process.exit(fails ? 1 : 0);
