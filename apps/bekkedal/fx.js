/* Bekkedal — the half-second between deciding to swing and having swung.
 *
 * `act()` used to resolve everything on one frame: check the tile, spend the
 * energy, mutate the state, `terrDirty()`, play a sound, print "+1 TØMMER".
 * The tree you felled vanished on the same frame the axe was never seen to
 * swing. The report asked for "a slight animation when a tool is used", and
 * *slight* is the operative word — a farming game where every action costs
 * half a second of animation is tiring inside ten minutes.
 *
 * So: three phases, about 0.30s end to end, which at the 30fps draw rate is
 * roughly three drawn frames of windup, two of strike and four of follow
 * through. Each tool gets its own arc, the effect lands on the *target tile*
 * rather than on the player — that is where the payoff is — and the strike
 * frame carries a two-pixel camera nudge, which is the entire difference
 * between an animation and a hit.
 *
 * Nothing here is in `S`. A swing is transient by definition: it must not
 * survive a reload and it must not appear in a save. Everything ticks on the
 * frame loop's own `dt`, never on a timer, or `unmount()` leaks.
 */
import { TIM, STO, SAN, SNO, WAR, WAT, GRASS, SOI, ATMO, CON } from './palette.js';

/* windup / strike / recover, in seconds, and which arc and which effect.
   `dx`,`dy` are how far the held tool travels through the swing. */
export const TOOL_SWING = {
  spade: { wind: 0.10, hit: 0.05, rec: 0.15, arc: 'chop', fx: 'soil',   nudge: 1 },
  kanne: { wind: 0.09, hit: 0.07, rec: 0.16, arc: 'tilt', fx: 'water',  nudge: 0 },
  oks:   { wind: 0.12, hit: 0.05, rec: 0.16, arc: 'over', fx: 'chips',  nudge: 3 },
  hakke: { wind: 0.12, hit: 0.05, rec: 0.18, arc: 'over', fx: 'sparks', nudge: 3 },
  stang: { wind: 0.14, hit: 0.06, rec: 0.14, arc: 'cast', fx: 'splash', nudge: 0 },
  /* not a tool: bending down for a flower, and the recoil when the answer
     is no. `deny` has no strike at all — it is two frames of "that did not
     work" and it tells you faster than the text does. */
  hand:  { wind: 0.08, hit: 0.04, rec: 0.12, arc: 'stoop', fx: 'pluck', nudge: 0 },
  deny:  { wind: 0.06, hit: 0.02, rec: 0.14, arc: 'shake', fx: '',      nudge: 0 }
};
export const swingLen = k => { const s = TOOL_SWING[k]; return s ? s.wind + s.hit + s.rec : 0; };

/* ---- the tool in the hand -------------------------------------------------
   `person` drew no tool at all, which is why a swing had nothing to be a
   swing *of*. `u` runs 0..1 across the whole action; the arc tables put the
   head of the tool somewhere sensible at each end of it. Three positions and
   a linear walk between them is plenty at this size — the eye reads the
   silhouette, not the interpolation. */
/* Four points: carried, the top of the windup, the moment of impact, and
   where it comes to rest. Point 0 is also the pose when nothing is happening
   at all, which is why it is a carry and not a raised arm — the first pass
   had the axe held over the head permanently. `x` is an offset from the hand
   and stays inside about seven pixels, or the tool detaches from the body. */
const ARC = {
  over:  [[3, 4], [0, -12], [6, 4], [3, 6]],       /* overhead and down       */
  chop:  [[2, 5], [1, -6], [5, 7], [2, 6]],        /* shorter, into the soil  */
  tilt:  [[3, 2], [4, 0], [6, 3], [4, 2]],         /* a can tipping forward   */
  cast:  [[2, -1], [-3, -8], [7, -6], [4, -4]],    /* back, then out          */
  stoop: [[2, 3], [3, 6], [3, 8], [2, 5]],
  shake: [[2, 4], [2, 4], [2, 4], [2, 4]]
};
export function toolAt(kind, u) {
  const a = ARC[(TOOL_SWING[kind] || {}).arc] || ARC.chop;
  const f = u <= 0 ? 0 : u >= 1 ? 3 : u * 3;
  const i = Math.min(2, Math.floor(f)), t = f - i;
  return [a[i][0] + (a[i + 1][0] - a[i][0]) * t, a[i][1] + (a[i + 1][1] - a[i][1]) * t];
}

/* the head of each tool, drawn at the arc point. Source-space, because
   `person` still is. */
export function drawHeld(A, hx, hy, kind, flip) {
  const s = flip ? -1 : 1;
  A.fill(TIM[1], hx - 1, hy - 1, 3, 8);                        /* the haft   */
  if (kind === 'oks') { A.fill(STO[4], hx + s, hy - 3, 4 * s, 4); A.fill(STO[2], hx + s, hy, 4 * s, 1); }
  else if (kind === 'hakke') { A.fill(STO[3], hx - 3, hy - 2, 8, 2); A.fill(STO[4], hx + 3 * s, hy - 3, 2, 2); }
  else if (kind === 'spade') { A.fill(STO[4], hx - 1, hy + 5, 4, 4); }
  else if (kind === 'kanne') { A.fill(STO[3], hx - 1, hy, 5, 4); A.fill(STO[2], hx + 4 * s, hy + 1, 3, 1); }
  else if (kind === 'stang') { A.fill(TIM[3], hx, hy - 8, 1, 12); A.fill(SNO[0], hx + s, hy - 8, 6 * s, 1); }
}

/* ---- what flies off the tile ---------------------------------------------
   A tiny ballistic list. Everything is a 1-3px axis-aligned rect on integer
   coordinates, gravity is a constant, and a particle that runs out of life
   is spliced out. The list lives on the closure and dies with the window. */
const KIND = {
  chips:  { n: 7,  col: [TIM[4], TIM[3], TIM[1]], spd: 42, up: 46, life: 0.42, g: 150, sz: 2 },
  sparks: { n: 8,  col: [SNO[1], WAR[4], STO[4], STO[2]], spd: 54, up: 40, life: 0.34, g: 170, sz: 1 },
  soil:   { n: 6,  col: [SOI[1], SOI[2], SOI[3]], spd: 30, up: 34, life: 0.40, g: 190, sz: 2 },
  water:  { n: 7,  col: [WAT[4], WAT[5], SNO[1]], spd: 26, up: 26, life: 0.36, g: 210, sz: 1 },
  splash: { n: 9,  col: [WAT[5], SNO[1], WAT[4]], spd: 40, up: 34, life: 0.40, g: 200, sz: 2 },
  pluck:  { n: 4,  col: [GRASS[3], GRASS[4], SNO[1]], spd: 20, up: 30, life: 0.36, g: 130, sz: 1 },
  sprout: { n: 5,  col: [GRASS[3], GRASS[4], CON[3]], spd: 16, up: 38, life: 0.44, g: 120, sz: 2 },
  dust:   { n: 5,  col: [STO[3], STO[2], SAN[0]], spd: 22, up: 12, life: 0.5, g: 40, sz: 2 }
};

export function createFx(A, rand) {
  /* A.fill(col, x, y, w, h) — device pixels, inside a native() block */
  let ps = [];

  /* Loot rolls and transient effects may use Math.random — the ground may
     not. Nothing here reaches the terrain cache. */
  function burst(kind, px, py, dirX, dirY) {
    const K = KIND[kind];
    if (!K) return;
    for (let i = 0; i < K.n; i++) {
      const a = (rand() - 0.5) * 1.9;
      ps.push({
        x: px, y: py,
        vx: (dirX * 0.7 + a) * K.spd, vy: -K.up * (0.55 + rand() * 0.7) + dirY * 12,
        g: K.g, t: K.life * (0.7 + rand() * 0.6), t0: K.life,
        c: K.col[(rand() * K.col.length) | 0], s: K.sz
      });
    }
    /* a splash also throws a ring, which is the part that reads as water */
    if (kind === 'splash') ps.push({ ring: 1, x: px, y: py, t: 0.34, t0: 0.34, c: SNO[1] });
  }

  /* an item arcing up out of the tile and into the bag */
  function pickup(col, px, py) {
    ps.push({ x: px, y: py, vx: 0, vy: -70, g: 130, t: 0.5, t0: 0.5, c: col, s: 3, item: 1 });
  }

  function step(dt) {
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.t -= dt;
      if (p.t <= 0) { ps.splice(i, 1); continue; }
      if (p.ring) continue;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt;
    }
  }

  function draw() {
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (p.ring) {
        const r = Math.round((1 - p.t / p.t0) * 13) + 2;
        A.fill(p.c, Math.round(p.x) - r, Math.round(p.y) - (r >> 1), r * 2, 1);
        A.fill(p.c, Math.round(p.x) - r, Math.round(p.y) + (r >> 1), r * 2, 1);
        A.fill(p.c, Math.round(p.x) - r, Math.round(p.y) - (r >> 1), 1, r);
        A.fill(p.c, Math.round(p.x) + r - 1, Math.round(p.y) - (r >> 1), 1, r);
        continue;
      }
      /* the last third of a life shrinks rather than fading — there is no
         alpha in this app and a 1px rect is as faint as anything gets */
      const s = p.t / p.t0 < 0.34 ? Math.max(1, p.s - 1) : p.s;
      A.fill(p.c, Math.round(p.x), Math.round(p.y), s, s);
    }
  }

  return {
    burst: burst, pickup: pickup, step: step, draw: draw,
    clear: () => { ps = []; }, count: () => ps.length
  };
}
