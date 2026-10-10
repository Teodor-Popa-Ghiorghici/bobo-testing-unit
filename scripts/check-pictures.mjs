#!/usr/bin/env node
/* node scripts/check-pictures.mjs -- the eleven pictures a game gives at about three fifths of its trophies (pure Node).
   Every picture is a real file in sixteen colours (an indexed PNG, 640 wide), each belongs to one place that has trophies and to no other, none is listed twice, the rule is
   three fifths of what a place counts (a mirror and a closed trophy are not counted, a secret is), it is not met a trophy short, it is met on the trophy that makes it, and a
   place that has no picture (AfterEgypt, the toys, the tools) has none. */
import { readFileSync } from 'node:fs';
import { createTrophies } from '../kernel/trophies_core.js';
import { registerAll } from '../kernel/trophies_defs.js';
import { PICTURES, SHARE, needOf, standing, pictureFor } from '../kernel/trophy_pictures.js';

let bad = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL ' + m); } };
const T = createTrophies({ read: () => null, write: () => {}, pay: () => {}, announce: () => {} });
registerAll(T);

ok(PICTURES.length === 11, 'eleven pictures (' + PICTURES.length + ')');
ok(new Set(PICTURES.map(p => p.app)).size === PICTURES.length, 'a place has at most one picture');
ok(new Set(PICTURES.map(p => p.id)).size === PICTURES.length && PICTURES.map(p => p.id).join() === '00,01,02,03,04,05,06,07,08,09,10', 'the ids are 00 to 10, once each');
ok(new Set(PICTURES.map(p => p.name)).size === PICTURES.length && new Set(PICTURES.map(p => p.fileName)).size === PICTURES.length, 'names and file names are different');
ok(PICTURES.every(p => /^[A-Z0-9 ,.'-]+$/.test(p.name) && p.name.length <= 34 && /\.PNG$/.test(p.fileName)), 'names are in capitals and short; files are .PNG');
ok(PICTURES.every(p => p.blurb && p.blurb.length > 20 && p.blurb.length <= 140), 'every picture has a line to say');

const apps = new Set([...T.defs.values()].map(d => d.app));
PICTURES.forEach(p => {
  ok(apps.has(p.app) && p.app !== 'meta', p.id + ': its place (' + p.app + ') has trophies');
  const buf = readFileSync(new URL('../' + p.file, import.meta.url));
  ok(buf.slice(1, 4).toString() === 'PNG', p.file + ' is a PNG');
  const w = buf.readUInt32BE(16), colour = buf[25];
  ok(w === 640 && colour === 3, p.file + ' is 640 wide and indexed (width ' + w + ', colour type ' + colour + ')');
  /* the palette: sixteen colours, the machine's own */
  const plte = buf.indexOf('PLTE'); const len = buf.readUInt32BE(plte - 4);
  const pal = []; for (let i = 0; i < 16; i++) pal.push([buf[plte + 4 + i * 3], buf[plte + 5 + i * 3], buf[plte + 6 + i * 3]].join(','));
  ok(pal.join('|') === '0,0,0|0,0,170|0,170,0|0,170,170|170,0,0|170,0,170|170,85,0|170,170,170|85,85,85|85,85,255|85,255,85|85,255,255|255,85,85|255,85,255|255,255,85|255,255,255' && len >= 48, p.file + ' is made of the sixteen colours of VGA16');
});
['aftere', 'crayon', 'garage', 'hifi', 'notes', 'tools'].forEach(a => ok(pictureFor(a) === null, a + ' has no picture, on purpose'));

/* the rule, on every place that has a picture */
ok(SHARE === 0.6 && needOf(10) === 6 && needOf(11) === 7 && needOf(1) === 1, 'three fifths, rounded up');
PICTURES.forEach(p => {
  const own = [...T.defs.values()].filter(d => d.app === p.app && !d.legacy && !T.closed(d));
  const s0 = standing(T, p.app);
  ok(s0.total === own.length && s0.have === 0 && !s0.enough, p.app + ': nothing earned is not enough (' + s0.total + ' trophies)');
  const need = needOf(own.length);
  ok(need >= Math.floor(own.length * 0.5) && need <= Math.ceil(own.length * 0.7), p.app + ': ' + need + ' of ' + own.length + ' is about three fifths, not half and not most');
  const T2 = createTrophies({ read: () => null, write: () => {}, pay: () => {}, announce: () => {} }); registerAll(T2);
  own.slice(0, need - 1).forEach(d => T2.award(d.id, true));
  ok(!standing(T2, p.app).enough, p.app + ': one short of ' + need + ' is not enough');
  T2.award(own[need - 1].id, true);
  ok(standing(T2, p.app).enough && standing(T2, p.app).have === need, p.app + ': ' + need + ' is');
});
/* a mirror of the game's own achievements is not counted */
const mg = standing(T, 'magen'), mgAll = [...T.defs.values()].filter(d => d.app === 'magen').length;
ok(mgAll > mg.total, 'Magen\'s mirrors (' + (mgAll - mg.total) + ') are not counted');
console.log(bad ? bad + ' FAILED of ' + n : 'pictures: all ' + n + ' ok');
process.exit(bad ? 1 : 0);
