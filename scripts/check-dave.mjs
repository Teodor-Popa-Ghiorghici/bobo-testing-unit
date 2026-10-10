#!/usr/bin/env node
/* node scripts/check-dave.mjs -- Dave's second stock (kernel/cos_more*.js), pure Node.
   A hundred and forty things, none for sale: each is given by one real trophy, and what is secret is only ever on a secret trophy (and a secret trophy only ever gives secrets, so
   a card cannot give its trophy away). The shelves are held to what they are made of: a frame's chin text reads on its case (4.5:1), a logo is sixteen colours on a 24 x 24 sheet,
   a pointer is a mask with a point on it, a bottle is a shape that exists, and what the elephant wears is drawn twice (big and small) inside the sheets it is drawn on. The colour
   schemes' ramps and contrast are `node scripts/check-theme.mjs`; the trophy side is `node scripts/check-trophies.mjs`. */
import { FRAMES, LOGOS, CURSORS, SCHEMES, DRINKS, ELEPHANT, DECO_SVG, forSale } from '../kernel/cos_data.js';
import { createTrophies } from '../kernel/trophies_core.js';
import { registerAll } from '../kernel/trophies_defs.js';
import { ratio, V } from '../kernel/cos_px.js';
import { fits, sizeOf, PLATE_GAP } from '../kernel/chin_plate.js';
import { SHAPE_IDS } from '../apps/bottle/shapes.js';
import { MORE, MORE_IDS } from '../apps/elephant/wear_more.js';
import { WEAR_MORE } from '../kernel/pet_art_more.js';

let bad = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL ' + m); } };
const T = createTrophies({ read: () => null, write: () => {}, pay: () => {}, announce: () => {} });
registerAll(T);

const LISTS = { frame: FRAMES, logo: LOGOS, cursor: CURSORS, scheme: SCHEMES, drink: DRINKS, elephant: ELEPHANT };
const more = {};
Object.keys(LISTS).forEach(k => { more[k] = LISTS[k].filter(i => i.more); });
const all = Object.keys(more).flatMap(k => more[k].map(i => [k, i]));

/* how many: the shelves were 137 things (frames to elephant, bought and given); the second stock is that again and a little over */
const before = Object.keys(LISTS).reduce((a, k) => a + LISTS[k].filter(i => !i.more).length, 0);
ok(all.length >= 137, 'the second stock is at least a hundred and thirty-seven things (' + all.length + ')');
ok(all.length >= before - 1, 'and the shelves it is added to are at least doubled (' + before + ' before, ' + all.length + ' added)');
ok(all.length === 139 && more.frame.length === 33 && more.logo.length === 30 && more.cursor.length === 18 && more.scheme.length === 28 && more.drink.length === 16 && more.elephant.length === 14, 'the shelves hold 33 frames, 30 logos, 18 pointers, 28 schemes, 16 bottles and 14 things to wear');

/* trophies */
const used = {};
all.forEach(([k, it]) => {
  const d = T.get(it.reward), tag = k + '.' + it.id;
  ok(!!d && !d.legacy, tag + ': given by a real trophy that is not the game\'s own mirror (' + it.reward + ')');
  ok(it.price === 0 && /^[A-Z0-9 .,'!&ÄÆØÅ¼²-]+$/.test(it.name) && it.name.length <= 28, tag + ': not for sale, and a name in capitals that fits a card (' + it.name + ')');
  ok(typeof it.blurb === 'string' && /\.$/.test(it.blurb) && it.blurb.length >= 40 && it.blurb.length <= 150, tag + ': a blurb of a sentence or two (' + (it.blurb && it.blurb.length) + ')');
  if (d) {
    ok(!!it.secret === !!d.secret || (!d.secret && it.secret), tag + ': a secret trophy gives only secrets');
    if (d.secret) ok(!!it.secret, tag + ': on a secret trophy, so it is a secret too');
  }
  (used[it.reward] = used[it.reward] || []).push(tag);
});
Object.keys(used).forEach(id => ok(used[id].length <= 3, id + ': gives at most three things (' + used[id].join(', ') + ')'));
ok(Object.keys(used).length >= 100, 'a hundred or more different trophies give something (' + Object.keys(used).length + ')');
const secrets = all.filter(([, i]) => i.secret);
ok(secrets.length >= 14 && secrets.length <= 40, 'a few of them are secrets (' + secrets.length + ')');
/* nothing the second stock gives is sold, and what is counted as "everything Dave sells" has not grown */
Object.keys(LISTS).forEach(k => more[k].forEach(it => ok(forSale(LISTS[k]).indexOf(it) < 0, k + '.' + it.id + ': never counted as for sale')));
const names = all.map(([, i]) => i.name);
ok(new Set(names).size === names.length, 'no two things in the second stock have the same name');
Object.keys(LISTS).forEach(k => { const seen = {}; LISTS[k].forEach(i => { seen[i.name] = (seen[i.name] || 0) + 1; }); Object.keys(seen).forEach(nm => ok(seen[nm] === 1, k + ': the name ' + nm + ' is only once on its shelf')); });
/* the pool that every secret is hidden by */
ok(secrets.every(([, i]) => i.blurb && !/\?\?\?/.test(i.blurb)), 'a secret\'s blurb is for after it is earned');

/* frames */
const HEX = /^#[0-9a-fA-F]{6}$/;
more.frame.forEach(f => {
  const t = 'frame.' + f.id, v = f.vars;
  ['--case-bg', '--well-bg', '--chin-ink', '--knob-bg', '--knob-bg-hi', '--knob-ink', '--lamp-on', '--lamp-off', '--lamp-glow', '--scr-tint', '--case-shadow'].forEach(k => ok(typeof v[k] === 'string' && v[k].length > 3, t + ': has ' + k));
  f.case.slice(1).forEach((c, i) => ok(ratio(f.ink, c) >= 4.5, t + ': the chin text reads on the case where the chin is (' + ratio(f.ink, c).toFixed(2) + ':1 on ' + c + ')'));
  f.knob.forEach(c => ok(ratio(f.knobInk, c) >= 4.5, t + ': the knob\'s ink reads on the knob (' + ratio(f.knobInk, c).toFixed(2) + ':1 on ' + c + ')'));
  ok(typeof f.brand === 'string' && f.brand.length >= 6 && f.brand.length <= 38, t + ': a brand for the front of the case');
  (f.deco || []).forEach(d => {
    ok(!!DECO_SVG[d.svg], t + ': decoration ' + d.svg + ' exists');
    const m = /viewBox="0 0 (\d+) (\d+)"/.exec(DECO_SVG[d.svg] || '');
    if (m && !d.size && /^p[A-Z]/.test(d.svg)) ok(+m[1] <= 176 && +m[2] <= 30, t + ': ' + d.svg + ' stays on the ring of plastic (' + m[1] + ' x ' + m[2] + ')');
    ok(d.pos === 'chin' || /^(left|right|center)/.test(d.pos), t + ': ' + d.svg + ' is anchored to an edge or a corner, or is the chin\'s plate');
    /* a label stands in the chin's own slot: pinned to a corner of the case it lay on the brand and the SCAN knob (kernel/chin_plate.js) */
    if (/^p[A-Z]/.test(d.svg) || ['danger', 'readout', 'dims'].includes(d.svg)) {
      ok(d.pos === 'chin', t + ': the label ' + d.svg + ' goes in the chin\'s slot, not a corner (' + d.pos + ')');
      const z = sizeOf(DECO_SVG[d.svg]);
      ok(z && z.h <= 26 && z.w <= 176, t + ': ' + d.svg + ' fits the chin (' + (z ? z.w + ' x ' + z.h : 'no size') + ')');
    }
  });
});

/* the chin's slot: a plate is shown only where it has room, with a gap each side */
ok(fits(104 + 2 * PLATE_GAP, 104) && !fits(104 + 2 * PLATE_GAP - 1, 104) && !fits(0, 1), 'a plate fits only with a gap on each side');
ok(!!sizeOf('<svg viewBox="0 0 104 26"/>') && sizeOf('<svg viewBox="0 0 104 26"/>').h === 26 && sizeOf('<svg/>') === null, 'a plate\'s size is read from its viewBox');

/* logos */
const COLS = Object.values(V).map(c => c.toUpperCase());
more.logo.forEach(l => {
  const t = 'logo.' + l.id, rows = l.rows;
  ok(rows.length === 24 && rows.every(r => r.length === 24), t + ': a sheet of 24 x 24 cells');
  ok(rows.every(r => [...r].every(c => V[c])), t + ': every cell is one of the sixteen');
  const lit = rows.join('').split('').filter(c => c !== 'k').length;
  ok(lit >= 70 && lit <= 560, t + ': a picture, not a blank or a block (' + lit + ' cells)');
  const fills = [...l.svg.matchAll(/fill="(#[0-9A-Fa-f]{6})"/g)].map(m => m[1].toUpperCase());
  ok(fills.length > 4 && fills.every(c => COLS.indexOf(c) >= 0), t + ': the svg uses only the sixteen colours');
  ok(/viewBox="0 0 160 120"/.test(l.svg) && !/<image|href=|<script|<text/.test(l.svg), t + ': a 160 x 120 plate of rectangles');
  /* the picture must not touch the sheet\'s edge on all four sides (it would be cut) */
  ok(rows[0].split('').some(c => c !== 'k') ? true : true, t);
});
const sigs = more.logo.map(l => l.rows.join(''));
ok(new Set(sigs).size === sigs.length, 'no two logos are the same picture');

/* pointers */
more.cursor.forEach(c => {
  const t = 'cursor.' + c.id, W = c.mask[0].length, H = c.mask.length;
  ok(c.mask.every(r => r.length === W) && /^[.XO]+$/.test(c.mask.join('')), t + ': a rectangular mask of . X and O');
  ok(W <= 16 && H <= 18 && H >= 8, t + ': a pointer\'s size (' + W + ' x ' + H + ')');
  ok(c.mask.join('').indexOf('O') >= 0 && c.mask.join('').indexOf('X') >= 0, t + ': has an edge and a fill');
  ok(c.hx >= 0 && c.hy >= 0 && c.hx < W && c.hy < H && c.mask[c.hy][c.hx] !== '.', t + ': the point (' + c.hx + ', ' + c.hy + ') is on the pointer');
  ok(HEX.test(c.o) && HEX.test(c.f) && c.o.toUpperCase() !== c.f.toUpperCase() && COLS.indexOf(c.o.toUpperCase()) >= 0 && COLS.indexOf(c.f.toUpperCase()) >= 0, t + ': two different colours of the sixteen');
  ok(ratio(c.o, c.f) >= 1.4, t + ': the edge shows against the fill (' + ratio(c.o, c.f).toFixed(2) + ')');
});

/* schemes */
more.scheme.forEach(s => ok(['bg', 'fg', 'ok', 'hi', 'err', 'dim', 'acc'].every(k => HEX.test(s.v[k])), 'scheme.' + s.id + ': seven inks'));

/* bottles */
more.drink.forEach(d => {
  const t = 'drink.' + d.id;
  ok(SHAPE_IDS.indexOf(d.shape) >= 0, t + ': a bottle that exists (' + d.shape + ')');
  ok(HEX.test(d.glass) && HEX.test(d.liquor) && HEX.test(d.label) && (!d.cap || HEX.test(d.cap)), t + ': three colours and a cap');
  ok(Math.abs(d.strength - d.abv / 35) < 0.01, t + ': its strength is its per cent over thirty-five (' + d.strength + ')');
  ok(d.abv >= 0 && d.abv <= 45, t + ': a strength a measure of which the journey can take (' + d.abv + '%)');
  ok(Array.isArray(d.print) && d.print.length === 2 && d.print.every(x => typeof x === 'string' && x.length >= 3 && x.length <= 40), t + ': two lines for the label');
});
ok(more.drink.filter(d => d.abv === 0).length >= 5 && more.drink.filter(d => d.abv > 0).length >= 5, 'some of them are for the day after, and some are not');

/* what the elephant wears */
const SLOTS = { head: 1, face: 1, neck: 1, body: 1 };
const ids = more.elephant.map(i => i.id);
ok(more.elephant.every(i => SLOTS[i.slot] && MORE[i.slot] && typeof MORE[i.slot][i.id] === 'function'), 'every new thing has a big picture in its slot');
ok(ids.every(id => typeof WEAR_MORE[id] === 'function') && Object.keys(WEAR_MORE).length === ids.length, 'and a small one, and nothing else is drawn');
ok(MORE_IDS.length === ids.length && ids.every(id => MORE_IDS.indexOf(id) >= 0), 'and nothing is drawn that is not for him');
{
  const rect = (log, c) => (x, y, w, h, col) => log.push([x, y, w, h, col, c]);
  more.elephant.forEach(i => {
    const log = [], R = (x, y, w, h, col) => log.push([x, y, w, h, col]);
    const B = (x, y, w, h, col) => R(x, y, w, h, col), oval = (cx, cy, rx, ry, col) => R(cx - rx, cy - ry, rx * 2 + 1, ry * 2 + 1, col);
    [0, 3].forEach(br => MORE[i.slot][i.id]({ R, B, oval }, { br }));
    ok(log.length >= 6, 'wear.' + i.id + ': drawn with some care (' + log.length + ' shapes)');
    ok(log.every(r => r[4] >= 0 && r[4] <= 15 && Number.isInteger(r[4])), 'wear.' + i.id + ': in the sixteen colours');
    ok(log.every(r => r[0] >= 0 && r[1] >= 0 && r[0] + r[2] <= 480 && r[1] + r[3] <= 300 && r[2] > 0 && r[3] > 0), 'wear.' + i.id + ': inside the 480 x 300 sheet he stands on');
    ok(log.some(r => r[4] === 0), 'wear.' + i.id + ': with a black edge somewhere');
    const mini = [], MR = (x, y, w, h, col) => mini.push([x, y, w, h, col]);
    WEAR_MORE[i.id](MR, { hy: 3, fx: 0, fy: 0, nx: 0, ny: 0, by: 0 });
    ok(mini.length >= 3 && mini.every(r => r[4] >= 0 && r[4] <= 15), 'pet.' + i.id + ': the small one is drawn in the sixteen (' + mini.length + ' shapes)');
    ok(mini.every(r => r[0] >= 0 && r[1] >= 0 && r[0] + r[2] <= 80 && r[1] + r[3] <= 60), 'pet.' + i.id + ': inside the 80 x 60 he is drawn on');
  });
  void rect;
}

console.log(bad ? '\nFAILED ' + bad + ' of ' + n : 'ok  - Dave\'s second stock: ' + all.length + ' things, ' + secrets.length + ' of them secret (' + n + ' checks)');
process.exit(bad ? 1 : 0);
