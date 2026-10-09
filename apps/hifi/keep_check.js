/* node apps/hifi/keep_check.js: what The Stack does at the end of a disc, and what it holds in memory over a long evening (pure Node) */
import { plan, evictions, XFADE, PRELOAD, BUDGET } from './keep.js';

let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log('FAIL ' + m); } };
const P = o => plan(Object.assign({ playing: true, pos: 10, dur: 200, repeat: 0, count: 5, crossed: false, nextReady: true }, o));

/* the table */
ok(P({}) === 'none', 'mid-disc does nothing');
ok(P({ playing: false, pos: 199.99 }) === 'none', 'paused does nothing');
ok(P({ pos: 200 - XFADE + 0.1 }) === 'xfade', 'crossfade when the next is ready');
ok(P({ pos: 200 - XFADE + 0.1, nextReady: false }) === 'none', 'not ready: wait, do not give up');
ok(P({ pos: 199.99, nextReady: false }) === 'next', 'run out with the next not ready: load it (this used to do nothing)');
ok(P({ pos: 199.99, crossed: true }) === 'next', 'run out after a crossfade flag: still go on');
ok(P({ pos: 199.99, repeat: 2 }) === 'again', 'repeat one');
ok(P({ pos: 199.99, count: 1 }) === 'stop', 'one disc on the shelf stops');
ok(P({ pos: 199.99, count: 1, repeat: 1 }) === 'again', 'one disc, repeat');
ok(P({ pos: 199, repeat: 2 }) === 'none', 'repeat one does not crossfade');

/* an evening: 400 discs of 2 to 6 minutes, the next one read late or failing now and then */
let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const SR = 48000, tracks = [];
for (let i = 0; i < 400; i++) { const d = 120 + Math.floor(rnd() * 240); tracks.push({ i, dur: d, used: 0, buf: null, fail: rnd() < 0.03 }); }
const mk = t => { t.buf = { length: t.dur * SR, numberOfChannels: 2 }; };
let ix = 0, up = 1, played = 0, stalls = 0, peak = 0, clock = 0;
mk(tracks[0]); tracks[0].used = 0;
for (let step = 0; step < 399; step++) {
  const cur = tracks[ix];
  cur.used = clock;
  /* the preload: the next is read PRELOAD seconds before the end (or late: sometimes it takes longer than that) */
  const next = tracks[up % tracks.length];
  const late = rnd() < 0.15;
  if (!next.fail) { if (!late) mk(next); }
  /* walk the disc with the controller */
  let pos = 0, acted = 'none';
  while (pos <= cur.dur + 1) {
    acted = P({ pos, dur: cur.dur, nextReady: !!next.buf && !next.fail });
    if (acted !== 'none') break;
    pos += 0.25;
  }
  if (acted === 'none') { stalls++; break; }
  if (acted === 'next') { if (!next.buf && !next.fail) mk(next); }          /* loadDisc reads it and plays */
  if (next.fail) { /* a disc that will not read is skipped, the one after takes over */ up++; step--; clock += cur.dur; continue; }
  clock += cur.dur; played++;
  ix = up % tracks.length; up = ix + 1;
  evictions(tracks, [tracks[ix], tracks[up % tracks.length]]).forEach(t => { t.buf = null; });
  const held = tracks.reduce((a, t) => a + (t.buf ? t.buf.length * t.buf.numberOfChannels * 4 : 0), 0);
  peak = Math.max(peak, held);
}
ok(stalls === 0, 'a long evening never stalls (' + stalls + ')');
ok(played > 300, 'played through the shelf (' + played + ')');
ok(peak < BUDGET + 3 * 130e6, 'memory stays within the budget plus the two discs in hand (peak ' + Math.round(peak / 1e6) + ' MB)');

/* eviction never lets go of what is in hand, and goes oldest first */
const a = { used: 1, buf: { length: 1e7, numberOfChannels: 2 } }, b = { used: 2, buf: { length: 1e7, numberOfChannels: 2 } }, c = { used: 3, buf: { length: 1e7, numberOfChannels: 2 } };
const e = evictions([a, b, c], [a], 170e6);
ok(e.length === 1 && e[0] === b, 'oldest not in hand goes first');
ok(evictions([a, b, c], [a, b, c], 1).length === 0, 'what is in hand stays');
ok(PRELOAD >= 30, 'reads well ahead');

console.log(bad ? bad + ' FAILED' : 'keep_check: ok (' + played + ' discs, peak ' + Math.round(peak / 1e6) + ' MB)');
process.exit(bad ? 1 : 0);
