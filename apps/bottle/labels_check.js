/* node apps/bottle/labels_check.js: the words on a bottle fit it. Every drink there is, on the bottle it comes in: its name, its small print and the moulded name in the glass are laid out by pixtext.js
   and must be inside the paper (or the glass) they are for, never cut short with a stop, and in letters the face really has; the picture has room and is whole; the gift labels' painters
   stay inside their box; every picture grid is thirteen by eleven; every glyph is a clean rectangle. (pure Node) */
import { DRINKS } from '../../kernel/cos_data.js';
import { paletteOf } from './drinks.js';
import { geometry } from './shapes.js';
import { plan, drawLabel } from './labels.js';
import { F3, F5, glyphs, layout, widthOf, heightOf, drawText, TITLE_TIERS, SMALL_TIERS } from '../pixtext.js';
import { ICON_W, ICON_H, GRIDS, ICONS } from './icons.js';
import { makeArt } from './art.js';

let bad = 0, notes = [];
const ok = (c, m) => { if (!c) { bad++; console.log('FAIL: ' + m); } };

/* the faces */
for (const F of [F5, F3]) {
  Object.keys(F.g).forEach(ch => { const rows = F.g[ch].split(','); ok(rows.length === F.h && rows.every(r => r.length === F.w && /^[01]+$/.test(r)), F.id + ' glyph ' + ch + ' is ' + F.w + ' x ' + F.h); });
  ok(Object.keys(F.g).length === Object.keys(F === F5 ? F3.g : F5.g).length, 'the two faces have the same letters');
}
ok(widthOf('ABC', F5) === 17 && widthOf('ABC', F3) === 11 && widthOf('ABC', F5, true) === 20 && widthOf('', F3) === 0, 'widths are what the faces say');
ok(heightOf(F5, 'MJØD') === 7 && heightOf(F5, 'BLÅBÆR') === 9 && heightOf(F3, 'LA FÉE') === 7, 'a mark takes two more pixels');

/* a recording rectangle: where the ink went */
const rec = () => { const rs = []; const r = (x, y, w, h, c) => rs.push({ x: Math.round(x), y: Math.round(y), w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)), c }); r.rs = rs; return r; };
const inside = (rs, b) => rs.every(q => q.x >= b.x && q.y >= b.y && q.x + q.w <= b.x + b.w && q.y + q.h <= b.y + b.h);

/* every drink on its own bottle */
const names = new Set();
DRINKS.forEach(d => {
  const P = paletteOf(d), G = geometry(P.shape, P.capKind), L = G.label, X = P.text, tag = d.id + ' on ' + G.name;
  names.add(d.name);
  const chars = [d.name, X.sub1, X.sub2, X.emboss].filter(Boolean).join('');
  [...chars.toUpperCase()].forEach(c => { if (c !== '?' && c !== ' ' && glyphs(c)[0].ch === '?') ok(false, tag + ': the face has no ' + c); });
  if (X.paint) {
    const r = rec(), box = { x: -L.w / 2 + 4, y: -L.top + 4, w: L.w - 8, h: L.h - 8 };
    X.paint({}, r, P.colors, box);
    ok(inside(r.rs, box), tag + ': the painted label stays inside its box (' + JSON.stringify(r.rs.filter(q => !inside([q], box))[0]) + ')');
    return;
  }
  const p = plan(X, L);
  ok(!p.title.cut, tag + ': the name is cut short: ' + p.title.lines.join('/'));
  ok(p.title.w <= p.tw, tag + ': the name is wider than the paper');
  p.foot.forEach(f => { ok(!f.cut, tag + ': a line of print is cut short: ' + f.lines.join('/')); ok(f.lines.every(l => widthOf(l, F3) <= p.tw), tag + ': print wider than the paper'); });
  if (!p.small) ok(p.s >= 1, tag + ': the picture has no room (' + p.room + ' px)');
  if (!p.small) ok(p.foot.length >= 1, tag + ': no small print at all');
  /* draw it for real, into a recording, and check the ink stays on the paper and clear of the frame's edge */
  const r = rec(), K = Object.assign({ accent: '#888888' }, P.colors);
  const full = Object.assign({ ink: '#000', label: '#fff', labelHi: '#eee', labelDk: '#888', glassMid: '#444' }, K);
  drawLabel({}, r, full, X, L);
  ok(inside(r.rs, { x: -L.w / 2, y: -L.top, w: L.w, h: L.h }), tag + ': ink outside the paper');
  const ink = r.rs.filter(q => q.c === full.ink && q.w * q.h <= 4 * 4);
  const touch = ink.find(q => !(q.x >= -L.w / 2 + 4 && q.x + q.w <= L.w / 2 - 4 && q.y >= -L.top + 4 && q.y + q.h <= -L.top + L.h - 4));
  ok(!touch, tag + ': small ink touches the frame ' + JSON.stringify(touch) + ' label x ' + (-L.w / 2) + '..' + L.w / 2 + ' y ' + (-L.top) + '..' + (-L.top + L.h));
  notes.push(tag.padEnd(26) + ' title ' + p.title.font.id + (p.title.heavy ? 'H' : ' ') + ' ' + p.title.lines.join('/') + '  s=' + p.s + ' foot=' + p.foot.length);
});

/* the moulded name: only drawn when it fits, and it fits the ones that have one */
let moulded = 0;
DRINKS.forEach(d => { const P = paletteOf(d), G = geometry(P.shape, P.capKind), X = P.text; if (!G.emboss || !X.emboss) return; const row = G.rows.find(w => w.y <= G.emboss && w.y + 2 > G.emboss); ok(!!row, d.id + ': the moulding sits on the body'); const E = layout(X.emboss, row.hw * 2 - 8, [SMALL_TIERS[0]]); if (!E.cut) moulded++; });
ok(moulded >= 6, 'the maker\'s name is moulded in the glass of most bottles (' + moulded + ')');

/* a long name is never run off the paper: any string, at any width a label has, comes back inside it */
for (const w of [26, 30, 34, 38, 44, 52]) for (const t of ['A', 'MJØD', 'JÄGERMEISTER', 'BIRTHDAY SPARKLING', 'THE HOMEMADE POTION', 'ELDERFLOWER CORDIAL', 'ZZZZZZZZZZZZZZZZZZZZZZZ']) {
  const L = layout(t, w, TITLE_TIERS); ok(L.w <= w, 'layout ' + t + ' at ' + w + ' is ' + L.w);
}
ok(layout('JÄGERMEISTER', 52).font === F5 && layout('JÄGERMEISTER', 52).heavy, 'the name is as large as the paper allows');
ok(layout('ZZZZZZZZZZZZZZZZZZZZZZZ', 30).cut, 'a name that cannot fit is cut short, not run off');

/* a text is stamped exactly where the layout says: width and height of the ink */
{ const r = rec(); const w = drawText(r, 'ABC', 0, 10, '#000', F5, {}); const xs = r.rs.map(q => q.x), ys = r.rs.map(q => q.y); ok(w === 17 && Math.min(...ys) === 10 && Math.max(...ys) === 16, 'drawText: where it puts the ink'); ok(Math.max(...xs) - Math.min(...xs) <= 17, 'drawText: no wider than it says'); }

/* the pictures */
Object.keys(GRIDS).forEach(k => ok(GRIDS[k].length === ICON_H && GRIDS[k].every(r => r.length === ICON_W && /^[#ol.]+$/.test(r)), 'icon ' + k + ' is ' + ICON_W + ' x ' + ICON_H));
Object.keys(ICONS).forEach(id => {
  const r = rec(); ICONS[id](r, 0, 0, 2, { ink: '#000', label: '#fff', accent: '#f00' });
  ok(r.rs.length > 5 && inside(r.rs, { x: 0, y: 0, w: ICON_W * 2, h: ICON_H * 2 }), 'icon ' + id + ' is whole and inside its box');
  ok(DRINKS.some(d => d.id === id), 'icon ' + id + ' is for a drink there is');
});
const stagless = DRINKS.filter(d => !paletteOf(d).text.icon && !paletteOf(d).text.paint && d.id !== 'jager').map(d => d.id);
ok(stagless.length === 0, 'only the Jägermeister wears the stag: ' + stagless.join(','));

/* the sprite itself: every bottle builds, and its label and glass draw without throwing */
{
  const cx = { fillStyle: '', font: '', textAlign: '', save() {}, restore() {}, translate() {}, fillRect() {}, fillText() {}, measureText: () => ({ width: 0 }) };
  DRINKS.forEach(d => { try { const A = makeArt(cx, paletteOf(d)); A.bottleSpec.base(cx); A.bottleSpec.over[0](cx); A.bottleSpec.over[1](cx); } catch (e) { ok(false, d.id + ' does not draw: ' + e.message); } });
}
if (process.argv.includes('-v')) console.log(notes.join('\n'));
console.log(bad ? bad + ' FAILED' : 'labels_check: ok (' + names.size + ' bottles)');
process.exit(bad ? 1 : 0);
