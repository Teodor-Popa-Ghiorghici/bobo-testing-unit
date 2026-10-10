/* THE SLIDE. After he has told you a hundred different things (SLIDE_AT) he can do one more: slide, as a concrete block slides over rock. Not a glide: friction does not glide.
   It is static friction that holds, gives, catches and gives again, so the whole motion is a run of short jerks with stillness between, further apart when he is slow and closer
   together when he is moving, and never regularly spaced (the irregularity of the stick-slip is what makes the sound grate). He goes out to one side and comes back, so he is where he
   was when it is over and nothing else in the window (his pile of cheese, his bubble) has to know. Pure: no canvas, no sound. `run.x(t)` is where he is, `run.slips` is every jerk
   (when, how far, how hard), `run.speed(t)` how fast he is going (0 to 1); apps/elephant/slide_sound.js turns the same run into the sound, so the two cannot drift apart.
   node apps/elephant/slide_check.js holds it. */
export const SLIDE_AT = 100;                     /* different quotes heard before he can */
export const OUT_SECS = 3.8, REST_SECS = 0.9, BACK_SECS = 3.8;
export const DIST = 128;                         /* how far out he goes, in pixels of the window */
export const TOTAL = OUT_SECS + REST_SECS + BACK_SECS;

/* a small seeded dice, and the logistic map beside it for the irregularity: x -> 3.9 x (1 - x) never repeats and never settles */
export function dice(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s >>> 0) / 4294967296; }; }
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const easeOut = u => { u = clamp(u, 0, 1); return 1 - (1 - u) * (1 - u) * (1 - u); };
/* how fast a stroke is going, by how far through it: still while the friction builds, a long slow rise, a longer slow fall, a last near-stop */
const HOLD = 0.11;
export function envelope(u) {
  if (u <= HOLD || u >= 1) return 0;
  const k = (u - HOLD) / (1 - HOLD);
  return Math.pow(Math.sin(Math.PI * Math.pow(k, 0.85)), 0.8);
}

/* one stroke, `dir` +1 (to his right) or -1: the jerks */
function stroke(rand, dir, secs, dist) {
  let x = 0.2 + rand() * 0.6;
  const raw = [];
  let t = secs * HOLD;                                    /* nothing happens while the friction builds: he trembles, and then he gives */
  raw.push({ at: t, w: 2.6, dur: 0.16, v: 0.25, first: true });
  for (let guard = 0; guard < 400; guard++) {
    x = 3.9 * x * (1 - x);
    const v = envelope(t / secs);
    const gap = (0.13 + 0.5 * Math.pow(1 - v, 2)) * (0.55 + 0.9 * x);
    t += gap;
    if (t >= secs - 0.12) break;
    raw.push({ at: t, w: (0.45 + v) * (0.65 + 0.7 * rand()), dur: 0.07 + 0.08 * (1 - v), v: v, first: false });
  }
  const sum = raw.reduce((a, s) => a + s.w, 0);
  return raw.map(s => ({ at: s.at, d: dir * dist * s.w / sum, hard: clamp(s.w / 1.2, 0.2, 1), dur: s.dur, v: s.v, first: s.first }));
}

/* the whole run: out for OUT_SECS, a rest, back for BACK_SECS. `seed` makes it the same every time it is asked for the same one (a different one each time he slides) */
export function runOf(seed, dir) {
  const rand = dice(seed * 2654435761 + 12345);
  dir = dir < 0 ? -1 : 1;
  const out = stroke(rand, dir, OUT_SECS, DIST), back = stroke(rand, -dir, BACK_SECS, DIST);
  const t1 = OUT_SECS + REST_SECS;
  const slips = out.map(s => Object.assign({ stroke: 0 }, s)).concat(back.map(s => Object.assign({ stroke: 1 }, s, { at: s.at + t1 })));
  const ends = [{ at: OUT_SECS, stroke: 0 }, { at: TOTAL, stroke: 1 }];
  const xAt = t => { let p = 0; for (let i = 0; i < slips.length; i++) { const s = slips[i]; if (t <= s.at) break; p += s.d * easeOut((t - s.at) / s.dur); } return p; };
  /* how fast: the envelope of the stroke he is in, and a flare while a jerk is under way */
  const speed = t => {
    const inBack = t >= t1, u = inBack ? (t - t1) / BACK_SECS : t / OUT_SECS;
    if (t < 0 || t > TOTAL || (t > OUT_SECS && t < t1)) return 0;
    return envelope(u);
  };
  /* the trembling before it gives, and the shudder at each jerk: a pixel or two, for the picture to shake with */
  const jolt = t => {
    let j = 0;
    for (let i = 0; i < slips.length; i++) { const age = t - slips[i].at; if (age >= 0 && age < 0.09) j = Math.max(j, slips[i].hard * (1 - age / 0.09)); else if (age < 0) break; }
    return j;
  };
  const tremble = t => {
    /* before each stroke's breakaway the block is loaded, and quivers at the edge of giving */
    let q = 0;
    [[0, slips[0].at], [t1, slips.find(s => s.stroke === 1).at]].forEach(([a, b]) => { if (t > a && t < b) q = Math.max(q, ((t - a) / (b - a)) * 0.8); });
    return q;
  };
  return { seed: seed, dir: dir, total: TOTAL, slips: slips, ends: ends, rest: [OUT_SECS, t1], x: xAt, speed: speed, jolt: jolt, tremble: tremble };
}

/* the count of different quotes he has said, kept on the machine (the shuffled bag in index.js never says one twice before it has said them all, so this is just how many he has got through) */
const KEY = 'templeos.elephant.quotes.v1';
export function heardSet() { try { const v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v.filter(n => Number.isInteger(n)) : []; } catch (e) { return []; } }
export function hear(i) {
  const set = heardSet();
  if (set.indexOf(i) >= 0) return { n: set.length, fresh: false, opened: false };
  set.push(i);
  try { localStorage.setItem(KEY, JSON.stringify(set)); } catch (e) { /* counted for this sitting only */ }
  return { n: set.length, fresh: true, opened: set.length === SLIDE_AT };
}
export const slideOpen = () => heardSet().length >= SLIDE_AT;
