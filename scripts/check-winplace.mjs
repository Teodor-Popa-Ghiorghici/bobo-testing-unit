/* node scripts/check-winplace.mjs: where a window was left (kernel/win_place.js). Only an app that opens once is remembered; a place is kept whole, made to fit a desk that is smaller now, never lets the title
   bar leave the desk, and a window that cannot be resized keeps its own size. (pure Node) */
import { KEY, remembers, load, write, remember, forget, place, MIN_W, MIN_H } from '../kernel/win_place.js';

let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log('FAIL: ' + m); } };
const mem = () => { const d = {}; return { getItem: k => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); } }; };

ok(remembers('magen') && remembers('hifi') && remembers('bottle'), 'an app that opens once is remembered');
ok(!remembers('folder') && !remembers('terminal') && !remembers('editor') && !remembers('viewer') && !remembers('placeholder'), 'one that can be open several times is not');
ok(!remembers(null) && !remembers(''), 'a window with no app is not');

let m = remember({}, 'magen', { x: 300.4, y: 120, w: 900, h: 640 });
ok(m.magen.x === 300 && m.magen.w === 900, 'kept in whole pixels');
ok(Object.keys(remember(m, 'folder', { x: 1, y: 1, w: 200, h: 200 })).join() === 'magen', 'a folder is not kept');
ok(Object.keys(remember(m, 'hifi', { x: NaN, y: 1, w: 200, h: 200 })).join() === 'magen', 'nonsense is not kept');
ok(m.magen && remember(m, 'hifi', { x: 5, y: 6, w: 300, h: 200 }).magen === m.magen, 'one app does not touch another');
const io = mem(); write(m, io); ok(load(io).magen.h === 640, 'round trip');
io.setItem(KEY, '{nope'); ok(Object.keys(load(io)).length === 0, 'a damaged note is an empty one');
io.setItem(KEY, '[1]'); ok(Object.keys(load(io)).length === 0, 'an array is not a note');
ok(Object.keys(forget(m, 'magen')).length === 0 && Object.keys(forget(m)).length === 0, 'forgotten');

const desk = { w: 1000, h: 640 }, base = { w: 640, h: 480 };
ok(place(null, desk, base, true) === null && place({}, desk, base, true) === null, 'nothing saved: the cascade');
let p = place({ x: 300, y: 100, w: 700, h: 500 }, desk, base, true);
ok(p.x === 300 && p.y === 100 && p.w === 700 && p.h === 500, 'a place that fits is as saved');
p = place({ x: 300, y: 100, w: 700, h: 500 }, desk, base, false);
ok(p.w === 640 && p.h === 480 && p.x === 300, 'a window that cannot be resized keeps its own size');
p = place({ x: 900, y: 100, w: 700, h: 500 }, { w: 800, h: 600 }, base, true);
ok(p.w === 700 && p.x <= 800 - 60, 'a smaller desk: the bar is still in reach (x ' + p.x + ')');
p = place({ x: 100, y: 100, w: 1900, h: 1200 }, desk, base, true);
ok(p.w === 980 && p.h === 620, 'never bigger than the desk: ' + p.w + ' x ' + p.h);
p = place({ x: 100, y: 100, w: 5, h: 5 }, desk, base, true);
ok(p.w === MIN_W && p.h === MIN_H, 'never smaller than a window can be');
p = place({ x: -900, y: -50, w: 400, h: 300 }, desk, base, true);
ok(p.x === -(400 - 60) && p.y === 0, 'off to the left: 60 px of it stay in reach, and not above the desk (' + p.x + ',' + p.y + ')');
p = place({ x: 400, y: 9000, w: 400, h: 300 }, desk, base, true);
ok(p.y === 640 - 24, 'way down: the title bar is still on the desk (' + p.y + ')');
for (let i = 0; i < 200; i++) {
  const s = { x: Math.round((Math.random() - 0.5) * 4000), y: Math.round((Math.random() - 0.5) * 4000), w: Math.round(Math.random() * 3000), h: Math.round(Math.random() * 3000) };
  const d = { w: 400 + Math.round(Math.random() * 1600), h: 300 + Math.round(Math.random() * 900) }, q = place(s, d, base, i % 2 === 0);
  ok(q.x + q.w >= 60 && q.x <= d.w - 60 && q.y >= 0 && q.y <= d.h - 24, 'always in reach: ' + JSON.stringify([s, d, q]));
}
console.log(bad ? bad + ' FAILED' : 'check-winplace: ok');
process.exit(bad ? 1 : 0);
