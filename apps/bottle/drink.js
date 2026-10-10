/* Drinking a measure, seen from the chair.

   Nobody is drawn. The glass leaves the table, comes up toward the screen (it is
   being brought to the face of whoever is sitting at the monitor, and so it grows
   as it nears) and is then tipped toward them: its mouth turns to face the viewer
   and the liquor, which stays level with the room, climbs the inside of it and runs
   over the edge nearest to them. None of that is scripted either. The glass is
   an object (glass3d.js); this file only says where it is, and the tipping does the
   rest: what the near edge cannot hold goes over it, and every fifth of a glass that
   goes is a swallow, which the machine feels. */
import { REST, NEAR } from './glass3d.js';
import { clamp, lerp, ease, sway, lurch } from './physics.js';
import { STYLES, styleOf, schedule, progress, hand, circle, overshoot, tipError } from './styles.js';

export const DRINK_LEN = 3.5;
const T_UP = 0.85, T_TIP = 2.55;                 /* lifted by here; tipped back by here; down again at DRINK_LEN */
const TH_UP = 0.5, TH_MAX = 1.9;                 /* how far it is tipped on the way up, and at the most */

export const restPose = () => Object.assign({}, REST);

export function startDrink(S) {
  S.phase = 'drink'; S.t = 0; S.gulpAt = -9; S.gulps = 0; S.pending = 0; S.sipDrops = []; S.faintAt = null;
  /* the hand this measure is drunk with: one of fifteen, by how drunk it is (styles.js); the sober one is the way it always went */
  S.sty = S.forceStyle != null ? STYLES[S.forceStyle] : styleOf(sway());
  S.sched = schedule(S.sty, DRINK_LEN, 1);
}

export function drinkStep(S, dt, fx) {
  const G = S.gls, tr = S.t += dt, st = S.sty || STYLES[0], seed = S.drunk || 0;
  /* how far along the way it is: even when sober; at a second thought it stops half way and comes back; and the more of it is lurches, the more it goes slow and then all at once */
  const u = progress(S.sched, tr);
  const t = lurch(u, st.lurch) * DRINK_LEN;
  let lift, th;
  if (t < T_UP) { const e = ease(t / T_UP); lift = e; th = TH_UP * e; }
  else if (t < T_TIP) { lift = 1; th = lerp(TH_UP, TH_MAX, ease((t - T_UP) / (T_TIP - T_UP))); }
  else { const e = ease((t - T_TIP) / (DRINK_LEN - T_TIP)); lift = 1 - e; th = TH_MAX * (1 - e); }
  /* LORE ACCURATE (S.lore, set by the app for a drink with something in it): the first swallow is all it takes, and the glass goes out of the hand */
  if (S.faintAt != null) { const k = ease(clamp((tr - S.faintAt) / 0.45, 0, 1)); lift *= 1 - k; th = lerp(th, 2.2, k); }
  const near = Math.min(1, lift * 2);
  /* a hand is not steady, and each of the fifteen is unsteady in its own way: it shakes, ... */
  const shake = st.shake * near;
  /* ... wanders off the line to the mouth and goes round in circles, ... */
  const h = hand(st, tr, seed), c = circle(st, tr, seed), wander = h.x * near;
  /* ... overshoots the lift and has to come back, ... */
  const over = overshoot(st, u) * (t < T_TIP ? 1 : 0.4);
  /* ... and tips too early and too far, or not far enough, so a swallow is a gamble */
  const slip = tipError(st, tr, seed) * near + h.a * near;
  const bob = (t - S.gulpAt) < 0.4 ? Math.sin((t - S.gulpAt) / 0.4 * Math.PI) * 3 : 0;
  /* a strong one hits the throat, and the glass flinches: it snaps back, drops and trembles for half a second after each swallow (S.burn, 0 to 1, from the strength: drunk_bac.js burnOf) */
  const burn = S.burn || 0, since = t - S.gulpAt, flinch = burn > 0.2 && since >= 0 && since < 0.55 ? Math.sin(since / 0.55 * Math.PI) * burn : 0;
  const arc = Math.sin(Math.PI * Math.min(1, lift)) * (t < T_TIP ? 26 : 12);
  /* looking at it before it moves (it trembles where it stands), and the heavy landing after */
  const stare = tr < st.lead ? Math.sin(tr * 15) * 1.1 : 0, landed = tr > S.sched.T - st.tail ? Math.max(0, Math.sin((tr - (S.sched.T - st.tail)) / Math.max(0.1, st.tail) * Math.PI)) * 2 : 0;
  G.pose = {
    sx: lerp(REST.sx, NEAR.sx, lift) + Math.sin(tr * 9) * shake + wander + c.x * lift + stare + Math.sin(tr * 58) * 4 * flinch,
    sy: lerp(REST.sy, NEAR.sy, lift) - arc + bob + Math.cos(tr * 7) * shake - over * 40 + c.y * lift + landed + flinch * 9,
    z: lerp(REST.z, NEAR.z, lift) * (1 + over),
    th: clamp(th + slip - flinch * 0.4, 0, TH_MAX + 0.35)
  };
  /* a swallow for every fifth of the glass that goes over the edge */
  while (S.pending >= 0.17) {
    S.pending -= 0.17; S.gulps++; S.gulpAt = t;
    if (S.lore && S.faintAt == null) { S.faintAt = tr; if (fx.faint) fx.faint(); }
    fx.sfx.gulp(S.gulps);
    if (fx.sfx.sear) fx.sfx.sear(S.burn || 0, S.gulps);
    if (window.Drunk && window.Drunk.gulp) window.Drunk.gulp(S.burn || 0);
  }
  if (tr >= S.sched.T) { G.pose = restPose(); return true; }
  return false;
}
