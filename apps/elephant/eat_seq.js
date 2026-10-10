/* HOW THE BIG ELEPHANT EATS A WEDGE OF CHEESE, as a timeline of eight seconds. Pure (no canvas, no sound): `poseAt(t, n)` is where everything is at second t, `eventsBetween`
   says what is heard and done in a stretch of time. apps/elephant/index.js draws the pose; apps/elephant/eat_check.js holds the numbers.
   He notices the pile (a sniff, his eyes go to it, his ears lift), shuffles over, bows his head and reaches the trunk down to the wedge it will take, touches it, curls the tip
   round it and takes it (the pile gets smaller at that moment), swings the trunk up and out and brings the tip in to his mouth from the side, opens wide, takes it in, and lets the
   trunk rest to one side so the mouth shows while he chews (six chews: the jaw, a cheek, an ear, crumbs, his eyes shut happily), swallows, licks, and shuffles back.
   The pile stands in front of his feet (PILE), so the wedge to be taken is never further from his trunk than it can stretch. The little elephant on the desktop eats with
   apps/cheese_art.js's eatPose, which this does not touch. */
import { SPOTS } from '../cheese_art.js';

export const EAT_TOTAL = 8.0;
export const PILE = { x: 198, y: 236, s: 2 };       /* the top left of the pile on the glass, and how many pixels one of its pixels is */
export const BODY_X = 240;                          /* where he stands */
export const MOUTH = { x: 240, y: 211 };
export const REST_TIP = { x: 240, y: 266 };         /* the tip of a trunk hanging straight down */
const ASIDE = { x: 292, y: 224 };                   /* where the trunk rests while he chews: out of the way of his mouth */
export const T = { notice: 0.0, lean: 0.45, reach: 1.1, touch: 2.0, take: 2.35, lift: 2.6, mouth: 3.55, nom: 3.85, back: 4.1, chew: 4.35, swallow: 6.6, lick: 7.05, settle: 7.3 };
export const CHEWS = 6, CHEW_P = 0.36;              /* six chews, 0.36 s each */
const CH0 = T.chew;

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
const ramp = (t, a, b) => smooth((t - a) / (b - a));
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/* the wedge that will be taken (the last one laid down is the first eaten, as in the small pile) */
export function wedgeSpot(n) {
  const s = SPOTS[clamp(Math.floor(n) - 1, 0, SPOTS.length - 1)];
  return { x: PILE.x + PILE.s * (s[0] + 7), y: PILE.y + PILE.s * (s[1] + 2) };
}

/* Everything is worked out for a wedge on his right and mirrored if it is on his left, so the trunk always curls the same way round and never has to turn inside out in the middle:
   `u` is how far to the feeding side of him a point is. Trunk keyframes, [time, u, y, foreshortening]: 1 is a trunk the length it hangs, over 1 it is stretched to reach, under
   1 it is turned toward him and so looks short. */
function keys(wu, wy) {
  return [
    [0.00, 0, REST_TIP.y, 1.00],
    [0.45, wu * 0.45, 246, 1.00],                       /* a sniff, in the air, toward it */
    [T.reach, wu, wy - 34, 1.06],
    [1.55, wu, wy - 9, 1.12],
    [T.touch, wu, wy, 1.14],
    [T.take, wu + 1, wy - 2, 1.14],                     /* the tip closes round it and is still for a moment */
    [T.lift, wu, wy - 22, 1.10],
    [3.05, wu + 36, 226, 0.92],                         /* up and out to the side... */
    [T.mouth, MOUTH.x - BODY_X + 24, MOUTH.y + 5, 0.66], /* ...round to his mouth */
    [T.nom, MOUTH.x - BODY_X + 3, MOUTH.y, 0.58],
    [T.back, MOUTH.x - BODY_X + 20, MOUTH.y + 8, 0.64],
    [T.chew, ASIDE.x - BODY_X, ASIDE.y, 0.86],
    [T.swallow, ASIDE.x - BODY_X + 1, ASIDE.y - 1, 0.86],
    [T.lick, ASIDE.x - BODY_X - 5, ASIDE.y + 8, 0.88],
    [T.settle, (ASIDE.x - BODY_X) * 0.5, 252, 0.95],
    [EAT_TOTAL, 0, REST_TIP.y, 1.00]
  ];
}

export function poseAt(t, n) {
  t = clamp(t, 0, EAT_TOTAL);
  const W = wedgeSpot(n), m = W.x < BODY_X ? -1 : 1, wu = Math.abs(W.x - BODY_X), K = keys(wu, W.y);
  /* where the trunk's tip wants to be */
  let i = 0; while (i < K.length - 2 && t >= K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1], q = smooth((t - a[0]) / (b[0] - a[0]));
  let tu = lerp(a[1], b[1], q), ty = lerp(a[2], b[2], q), fore = lerp(a[3], b[3], q);
  /* the sniff, the touch and the swallow are not still */
  tu += Math.sin(t * 9) * 2.2 * (ramp(t, 0.1, 0.3) * (1 - ramp(t, 0.6, 0.9)));
  const wig = ramp(t, T.touch, T.touch + 0.1) * (1 - ramp(t, T.take, T.take + 0.1));
  tu += Math.sin(t * 34) * 1.8 * wig; ty += Math.cos(t * 29) * 1.4 * wig;
  const gk = clamp((t - T.swallow) / 0.4, 0, 1), gulp = gk >= 1 ? 0 : Math.sin(gk * Math.PI);
  ty -= gulp * 3;
  const tx = BODY_X + m * tu;

  /* him: a shuffle toward the wedge, a bow, a lift of the head when he notices */
  const dxT = m * clamp(wu * 0.5, 0, 14);
  const dx = dxT * (ramp(t, T.lean, T.reach + 0.2) - ramp(t, T.settle, EAT_TOTAL - 0.15));
  const stepsOn = Math.abs(dxT) > 3;
  const bobAt = (c) => Math.max(0, 1 - Math.abs(t - c) / 0.16);
  const bob = stepsOn ? -Math.round(2.4 * Math.max(bobAt(0.75), bobAt(1.15), bobAt(7.5), bobAt(7.85))) : 0;
  const dip = Math.round(-3 * smooth((t - 0.1) / 0.2) * (1 - smooth((t - 0.5) / 0.3)) + 6 * ramp(t, 1.0, 1.9) * (1 - ramp(t, T.lift, T.lift + 0.7)));

  /* his face */
  const looking = ramp(t, 0.15, 0.4) * (1 - ramp(t, T.lift + 0.2, T.lift + 0.6));
  const lookX = Math.round(2 * m * looking), lookY = Math.round(2 * ramp(t, 1.0, 1.4) * (1 - ramp(t, T.lift, T.lift + 0.4)));
  const c = (t - CH0) / CHEW_P, chewing = t >= CH0 && c < CHEWS;
  const beat = chewing ? 0.5 - 0.5 * Math.cos(c * Math.PI * 2) : 0;          /* 0 shut, 1 open: the jaw */
  const insert = ramp(t, T.mouth - 0.1, T.mouth + 0.15) * (1 - ramp(t, T.nom, T.nom + 0.1));
  const lk = clamp((t - T.lick) / 0.3, 0, 1), gulpOpen = lk >= 1 ? 0 : Math.sin(lk * Math.PI);   /* the lick */
  const mouth = clamp(Math.max(insert, beat * 0.55, gulpOpen * 0.7), 0, 1);
  const happy = t >= T.back + 0.15 && t < T.lick + 0.25 ? 1 : 0;              /* his eyes shut, pleased */
  const ears = chewing ? Math.round(Math.sin(c * Math.PI * 2) * 2) : 0;
  const cheek = chewing ? Math.round(beat < 0.5 ? 1 - beat * 2 : 0) : 0;

  /* the piece, in the tip of the trunk, from the moment it is taken until it is in his mouth */
  const held = t >= T.take && t < T.nom + 0.04;
  const w = Math.max(ramp(t, 0.12, 0.5), 0) * (1 - ramp(t, EAT_TOTAL - 0.8, EAT_TOTAL));

  return { t: t, dx: dx, bob: bob, dip: dip, tip: { x: tx, y: ty }, fore: fore, w: w, held: held, lookX: lookX, lookY: lookY, mouth: mouth, happy: happy, ears: ears, cheek: cheek,
           beat: beat, chewing: chewing, crumbs: crumbsAt(t, dx), mirror: m, bend: -m };
}

/* the crumbs that fall from his mouth: three a chew, thrown a little way and pulled down. Deterministic, so a frame is the same however it is reached. */
export function crumbsAt(t, dx) {
  const out = [];
  for (let b = 0; b < CHEWS + 1; b++) for (let k = 0; k < 3; k++) {
    const born = CH0 + (b + 0.55) * CHEW_P, age = t - born;
    if (age < 0 || age > 0.75) continue;
    const r = hash(b * 3 + k + 1), vx = (r - 0.5) * 46, vy = -16 + hash(b * 7 + k) * 10;
    out.push({ x: Math.round(MOUTH.x + (dx || 0) + (hash(b + k * 5) - 0.5) * 10 + vx * age), y: Math.round(MOUTH.y + 4 + vy * age + 230 * age * age), c: k === 1 ? 6 : 14 });
  }
  return out;
}

/* what is heard and done at certain seconds. `n` is how many wedges there are when it begins (a lean is only a shuffle if there is somewhere to go) */
export function events(n) {
  const shuffle = Math.abs(wedgeSpot(n).x - BODY_X) * 0.5 > 3;
  const out = [{ at: 0.12, ev: 'sniff' }, { at: 0.42, ev: 'sniff' }];
  if (shuffle) out.push({ at: 0.75, ev: 'step' }, { at: 1.15, ev: 'step' }, { at: 7.5, ev: 'step' }, { at: 7.85, ev: 'step' });
  out.push({ at: T.touch, ev: 'touch' }, { at: T.take, ev: 'take' }, { at: 2.8, ev: 'whoosh' }, { at: T.nom, ev: 'nom' });
  for (let b = 0; b < CHEWS; b++) out.push({ at: CH0 + (b + 0.5) * CHEW_P, ev: 'chew', n: b });
  out.push({ at: T.swallow + 0.12, ev: 'swallow' }, { at: T.lick + 0.1, ev: 'ahh' }, { at: EAT_TOTAL - 0.05, ev: 'done' });
  return out.sort((x, y) => x.at - y.at);
}
/* the events with prev < at <= now */
export const eventsBetween = (list, prev, now) => list.filter(e => e.at > prev && e.at <= now);
