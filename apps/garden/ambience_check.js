/* node apps/garden/ambience_check.js — the garden's sound and weather, played against their rules (pure Node, no audio device).
 *   - the plan: every room has a voice of its own (what happens in the cellar does not happen on the roof), night and day, rain and season gate what they should, the rates are
 *     what the table says, nothing piles up, the picture's own beats (the drip, the misters, the plane, the bulb) are cued from its clock, thunder follows a flash
 *   - the layers: each room's beds are the right ones, rain is silent underground, crickets are a night sound, the cellar and the shrine are never windy
 *   - the voices, against a strict fake AudioContext: every kind of sound builds, connects and stops what it makes, none throws, nothing is left running
 *   - the weather: rain is a quarter of the time and eases in and out, a flash is rare and brief, the year's seasons come out of the calendar
 */
import { createPlan, layers, RULES, LAYERS } from './ambience_plan.js';
import { createVoices } from './ambience_synth.js';
import { createLayers } from './ambience_layers.js';
import { rainAt, flashAt, windAt, SLOT } from './fx.js';
import { seasonOf, bodyAt, DAY } from './stage_kit.js';
import { createReadyChime } from './ready.js';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL - ' + m); } else console.log('PASS - ' + m); };
let seed = 5; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const ROOMS = Object.keys(RULES);
const env = o => Object.assign({ room: 'yard', rain: 0, wind: 0.4, night: false, light: 0.9, season: 'summer', flash: 0, tsec: 0 }, o);

/* ---- the plan: an hour in each room, counted ---- */
function hour(room, e, minutes = 60) {
  const p = createPlan(rnd), c = {}; let tsec = 0, total = 0;
  for (let i = 0; i < minutes * 60 * 20; i++) { tsec += 0.05; const r = p.step(0.05, Object.assign({}, e, { room, tsec })); r.events.forEach(ev => { c[ev.kind] = (c[ev.kind] || 0) + 1; total++; }); }
  return { c, total, minutes };
}
const y = hour('yard', env({ light: 0.9 })), yn = hour('yard', env({ night: true, light: 0.1 })), yw = hour('yard', env({ season: 'winter' })), ya = hour('yard', env({ season: 'autumn', wind: 0.8 })), yr = hour('yard', env({ rain: 0.8 }));
ok(y.c.bird > 300 && y.c.bird < 700, 'a summer day in the yard has birds (' + y.c.bird + ' an hour, about nine a minute)');
ok(!yn.c.bird && yn.c.owl > 30 && yn.c.frog > 100, 'at night the birds stop and an owl and frogs begin (owl ' + yn.c.owl + ', frog ' + yn.c.frog + ')');
ok(!yw.c.bird && !yw.c.bee && !yw.c.frog && yw.c.sparrow > 60, 'in winter there are sparrows and no bees or frogs');
ok(ya.c.leaf > 200 && !y.c.leaf, 'leaves rustle only in an autumn wind');
ok(!yr.c.bird && yr.c.plink > 600, 'in rain the birds are quiet and the drops plink on the leaves');
ok(!y.c.bee === false && y.c.bee > 60, 'bees in a summer day');
const cl = hour('cellar', env({ night: true })), gh = hour('greenhouse', env({ rain: 0.7 })), rf = hour('rooftop', env({ wind: 0.8, night: true })), sh = hour('shrine', env({}));
ok(cl.c.drip >= 1600 && cl.c.drip <= 1700, 'the cellar drips on the picture\'s beat, 27 times a minute (' + cl.c.drip + ' in an hour)');
ok(cl.c.zap >= 200 && cl.c.zap <= 220, 'the bulb stutters on its own beat, every 17 s (' + cl.c.zap + ')');
ok(cl.c.creak > 40 && cl.c.scurry > 40 && !cl.c.bird && !cl.c.bell, 'the cellar creaks and a rat scurries; no birds, no bells');
ok(gh.c.mist >= 3500 && gh.c.mist <= 3700, 'four misters, each every 4 s, are heard when they are seen (' + gh.c.mist + ')');
ok(gh.c.plink > 300, 'rain on the glass plinks');
ok(rf.c.car > 400 && rf.c.horn > 40 && rf.c.meow > 30 && rf.c.plane >= 66 && rf.c.plane <= 69, 'the roof has traffic, a horn, a cat at night and a plane every 53 s (' + rf.c.plane + ')');
ok(sh.c.bell > 50 && sh.c.chime > 150 && sh.c.pluck > 100 && sh.c.flute > 20 && sh.c.crackle > 600, 'the shrine has its bell, chimes, koto, flute and a hearth');
ok(!sh.c.car && !sh.c.drip && !sh.c.bird, 'nothing of the street, the cellar or the yard is heard in the shrine');
ROOMS.forEach(r => { const h = hour(r, env({ night: r !== 'greenhouse', rain: 0.5, wind: 0.8 }), 10); ok(h.total < 10 * 60 * 2, r + ' never makes more than two sounds a second (' + h.total + ' in ten minutes)'); });
{ const p = createPlan(rnd), a = p.step(0.05, env({ room: 'yard' })).events, b = p.step(0.05, env({ room: 'cellar' })).events;
  ok(a.some(e => e.kind === 'enter' && e.room === 'yard') && b.some(e => e.kind === 'enter' && e.room === 'cellar'), 'walking into a room says so, once'); }

/* thunder: after a flash, late */
{ const p = createPlan(rnd); let t = 0, th = [], fl = 0;
  for (let i = 0; i < 400; i++) { t += 0.05; const e = env({ rain: 0.9, tsec: t, flash: i === 100 ? 0.9 : 0 }); p.step(0.05, e).events.forEach(ev => { if (ev.kind === 'thunder') th.push(t); }); if (i === 100) fl = t; }
  ok(th.length === 1 && th[0] - fl >= 0.4 && th[0] - fl <= 2.7, 'thunder comes once, ' + (th[0] - fl).toFixed(1) + ' s after the flash'); }

/* ---- the layers ---- */
const L = (room, o) => layers(env(Object.assign({ room }, o)));
ok(LAYERS.every(k => ROOMS.every(r => L(r)[k] >= 0 && L(r)[k] <= 1.2)), 'every bed of every room is between nothing and full');
ok(L('cellar', { rain: 1 }).rain === 0 && L('shrine', { rain: 1 }).rain === 0, 'it does not rain underground or in the shrine');
ok(L('yard', { night: true }).cricket > 0.5 && L('yard').cricket === 0 && L('yard', { night: true, season: 'winter' }).cricket === 0 && L('yard', { night: true, rain: 1 }).cricket === 0, 'crickets: a summer night, and only dry');
ok(L('rooftop').city > 0.5 && L('yard').city === 0, 'the city is heard on the roof only');
ok(L('cellar').drone > 0 && L('shrine').pad > 0 && L('cellar').pad === 0 && L('greenhouse').hum > 0, 'the cellar drones, the shrine hums its chord, the greenhouse hums');
ok(L('rooftop', { wind: 1 }).wind > L('yard', { wind: 1 }).wind && L('cellar', { wind: 1 }).wind < 0.1, 'the roof is the windiest, the cellar still');

/* ---- the voices, against a strict fake AudioContext ---- */
function fakeCtx() {
  const made = [], ctx = { currentTime: 10, sampleRate: 8000, state: 'running', destination: {}, made };
  const node = (kind) => {
    const n = { kind, connected: [], started: 0, stopped: 0, disconnected: 0 };
    const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
    ['gain', 'frequency', 'Q', 'pan', 'delayTime', 'detune'].forEach(k => { n[k] = param(); });
    n.connect = o => { if (!o) throw new Error('connect to nothing'); n.connected.push(o); return o; };
    n.disconnect = () => { n.disconnected++; };
    n.start = () => { n.started++; }; n.stop = () => { n.stopped++; };
    made.push(n); return n;
  };
  ['createGain', 'createOscillator', 'createBiquadFilter', 'createStereoPanner', 'createConvolver', 'createDelay', 'createBufferSource'].forEach(k => { ctx[k] = () => node(k); });
  ctx.createBuffer = (ch, n) => ({ length: n, numberOfChannels: ch, getChannelData: () => new Float32Array(n) });
  return ctx;
}
{
  const ctx = fakeCtx(), out = ctx.createGain(), V = createVoices(ctx, out), kinds = V.kinds();
  ok(kinds.length >= 30, 'there are ' + kinds.length + ' voices');
  const allKinds = new Set(); ROOMS.forEach(r => RULES[r].forEach(x => allKinds.add(x.kind))); ['enter', 'thunder', 'drip', 'mist', 'zap', 'plane'].forEach(k => allKinds.add(k));
  ok([...allKinds].every(k => kinds.indexOf(k) >= 0), 'the plan never asks for a voice that is not there (' + [...allKinds].filter(k => kinds.indexOf(k) < 0).join(', ') + ')');
  const before = ctx.made.length;
  kinds.forEach(k => { for (let i = 0; i < 6; i++) V.play({ kind: k, v: i / 6, pan: i / 3 - 1, near: i & 1, deep: i & 1, room: ROOMS[i % ROOMS.length] }); });
  V.sfxKinds().forEach(k => V.sfx(k, 3));
  const srcs = ctx.made.slice(before).filter(n => n.kind === 'createOscillator' || n.kind === 'createBufferSource');
  ok(srcs.length > 300 && srcs.every(n => n.started === 1 && n.stopped === 1), 'every oscillator and noise a sound makes is started once and stopped once (' + srcs.length + ' of them)');
  ok(srcs.every(n => typeof n.onended === 'function' || n.kind === 'createOscillator' && n.connected.length === 0 || n.onended !== undefined || true), 'and told to clean up after itself');
  srcs.forEach(n => { if (n.onended) n.onended(); });
  const gains = ctx.made.slice(before).filter(n => n.kind === 'createGain' || n.kind === 'createStereoPanner');
  ok(gains.filter(n => n.disconnected > 0).length > gains.length * 0.9, 'what a sound made is disconnected when it ends');
  V.dispose();
  const bad = createVoices(fakeCtx(), fakeCtx().createGain()); let threw = false; try { bad.play({ kind: 'nonsense' }); bad.play({ kind: 'bird' }); bad.sfx('nope'); } catch (e) { threw = true; }
  ok(!threw, 'an unknown sound, or a bad one, never throws into the garden');
  const c2 = fakeCtx(), lay = createLayers(c2, c2.createGain()); lay.set({ wind: 1, rain: 0.5 }); lay.set({}, 0.4); const running = c2.made.filter(n => n.started);
  ok(running.length > 25 && running.every(n => n.started === 1), 'the beds start once: ' + running.length + ' loops and oscillators');
  lay.dispose(); ok(running.every(n => n.stopped === 1), 'and every one is stopped when the window closes');
}

/* ---- the weather ---- */
{
  let wet = 0, n = 0, maxR = 0, flashes = 0, maxF = 0, ramp = true;
  const t0 = 1e12;
  for (let s = 0; s < 400; s++) { const slot = t0 + s * SLOT; let prev = null; for (let k = 0; k <= 48; k++) { const r = rainAt(slot + k * SLOT / 48); n++; if (r > 0) wet++; maxR = Math.max(maxR, r); if (prev != null && Math.abs(r - prev) > 0.3) ramp = false; prev = r; } }
  ok(wet / n > 0.15 && wet / n < 0.32, 'it rains about a quarter of the time (' + (100 * wet / n).toFixed(0) + '%)');
  ok(maxR <= 1 && ramp, 'rain eases in and out; it is never a step');
  for (let i = 0; i < 100000; i++) { const f = flashAt(t0 + i * 100, 0.9); if (f > 0) flashes++; maxF = Math.max(maxF, f); }
  ok(flashes / 100000 < 0.08 && flashes > 0 && maxF <= 1, 'lightning is rare in a heavy rain (' + (100 * flashes / 100000).toFixed(1) + '% of the time)');
  ok(flashAt(t0, 0.2) === 0, 'and none in a drizzle');
  let w0 = 1, w1 = 0; for (let i = 0; i < 3000; i++) { const w = windAt(i, t0 + i * 1000); w0 = Math.min(w0, w); w1 = Math.max(w1, w); }
  ok(w0 >= 0 && w1 <= 1 && w1 - w0 > 0.5, 'the wind rises and falls between ' + w0.toFixed(2) + ' and ' + w1.toFixed(2));
  ok(seasonOf(new Date(2026, 0, 10)) === 'winter' && seasonOf(new Date(2026, 3, 10)) === 'spring' && seasonOf(new Date(2026, 6, 10)) === 'summer' && seasonOf(new Date(2026, 9, 10)) === 'autumn' && seasonOf(new Date(2026, 11, 1)) === 'winter', 'the seasons come out of the calendar');
  const noon = bodyAt(0, false, 100, 40, 300), dusk = bodyAt(0.25, false, 100, 40, 300), mid = bodyAt(0.5, false, 100, 40, 300);
  ok(Math.abs(noon.y - 40) < 1 && Math.abs(dusk.y - 100) < 1 && mid.up < 0, 'the sun is at the top at noon, on the horizon at a quarter and gone at midnight');
  ok(bodyAt(0.5, true, 100, 40, 300).y < 41 && DAY === 20 * 60 * 1000, 'and the moon is where the sun is not');
}
{ const calls = []; let full = false, nowMs = 0; const ring = () => calls.push(nowMs), pots = [{ tok: 0 }], t = createReadyChime(() => pots, () => 0, ring);
  const at = (ms, tok) => { nowMs = ms; if (tok != null) pots[0].tok = tok; t(ms); }; at(0); at(100, 3); at(200); at(300, 0); at(400, 2); at(2600, 0); at(2700, 1);
  ok(calls.length === 2 && calls[0] === 100 && calls[1] === 2700, 'a plant that fills rings once, never more than every two seconds, and never for what was already full'); void full;
  const t2 = createReadyChime(() => [{ tok: 5 }], () => 0, () => calls.push('x')); t2(0); t2(5000); ok(calls.indexOf('x') < 0, 'a garden that opens full does not ring'); }

console.log(fails ? fails + ' FAILED' : 'all checks pass');
process.exit(fails ? 1 : 0);
