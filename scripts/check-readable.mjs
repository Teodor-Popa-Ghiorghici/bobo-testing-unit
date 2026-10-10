#!/usr/bin/env node
/* READABILITY over a background (pure Node): kernel/readable.js. `look` is how much veil and blur a picture gets from how bright it is on average, how busy and how much of it is glare.
   - a plain dark picture gets next to nothing, and so does nothing at all;
   - a brighter one gets more, a busier one gets more, a glaring one gets more: it never goes down as the picture gets worse;
   - the most it can do is not jarring: a veil of 58 % at the worst, a blur of three pixels;
   - what is measured is right: a flat grey is flat, a checkerboard of black and white is as busy as a picture can be. */
import { look, statsOf, LIMITS } from '../kernel/readable.js';
let bad = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const px = (f, w = 48, h = 27) => { const d = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = f(x, y), i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; } return d; };

const flat = v => statsOf(px(() => v));
const checker = statsOf(px((x, y) => ((x + y) & 1) ? 255 : 0));
const noise = (() => { let s = 7; return statsOf(px(() => { s = (s * 1103515245 + 12345) >>> 0; return (s >>> 16) & 255; })); })();
ok(Math.abs(flat(128).mean - 0.5) < 0.01 && flat(128).sd < 1e-9 && flat(0).mean === 0 && flat(255).mean > 0.99, 'a flat picture has its brightness and no spread');
ok(checker.sd > 0.45 && Math.abs(checker.mean - 0.5) < 0.01, 'a checkerboard of black and white is as busy as a picture gets');
ok(noise.sd > 0.2 && noise.sd < 0.35, 'noise is busy, not as much');

const dark = look(flat(20)), mid = look(flat(110)), bright = look(flat(230)), busyDark = look(statsOf(px((x, y) => ((x + y) & 1) ? 90 : 10)));
ok(dark.veil <= 0.1 && dark.blur === 0, 'a plain dark picture gets next to nothing (' + dark.veil.toFixed(2) + ' veil)');
ok(mid.veil > dark.veil && bright.veil > mid.veil, 'brighter, more veil: ' + [dark, mid, bright].map(l => l.veil.toFixed(2)).join(' < '));
ok(look(checker).blur > look(flat(128)).blur && look(checker).veil > look(flat(128)).veil, 'busier, more of both');
ok(busyDark.blur > 0 && busyDark.veil > dark.veil, 'a dark picture that is very busy still gets a hand');
const worst = look(statsOf(px((x, y) => ((x + y) & 1) ? 255 : 200)));
ok(worst.veil <= LIMITS.veil + 1e-9 && worst.blur <= LIMITS.blur + 1e-9 && LIMITS.veil <= 0.6 && LIMITS.blur <= 3, 'the most it ever does is ' + worst.veil.toFixed(2) + ' of black and ' + worst.blur.toFixed(1) + ' px of blur: not jarring');
/* monotone over a sweep: nothing it is given makes it do less */
let mono = true; for (let v = 0; v < 250; v += 5) { const a = look({ mean: v / 255, sd: 0.1, hot: 0 }), b = look({ mean: (v + 5) / 255, sd: 0.1, hot: 0 }); if (b.veil < a.veil - 1e-9) mono = false; }
for (let s = 0; s < 0.5; s += 0.02) { const a = look({ mean: 0.5, sd: s, hot: 0.1 }), b = look({ mean: 0.5, sd: s + 0.02, hot: 0.1 }); if (b.blur < a.blur - 1e-9 || b.veil < a.veil - 1e-9) mono = false; }
ok(mono, 'sweeping the brightness and the spread, it never does less as the picture gets worse');
ok(statsOf(new Uint8ClampedArray(0)).mean === 0, 'an empty sample is nothing, not an error');
console.log(bad ? bad + ' FAILED' : 'all ' + n + ' ok');
process.exit(bad ? 1 : 0);
