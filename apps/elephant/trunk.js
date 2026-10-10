/* THE TRUNK, AS A CURVE. It used to be eight slabs, each shifted sideways from the one above it: fine for hanging, but the moment it had to reach for anything the slabs
   came apart into a staircase. Here the trunk is a line with a heading that turns along its length (more at the tip than at the root, as a real one does), and it is
   solved from where its tip has to be: `solveTrunk` finds how much it must bend for a tip at that distance, and which way it must point to get there. Pure: no canvas,
   so Node can hold it (apps/elephant/eat_check.js). `drawTube` (trunk_draw.js) paints it. */
export const N = 28;                   /* segments */
export const LEN = 78;                 /* a trunk hanging straight down, root to tip, in pixels */
export const R_ROOT = 15, R_TIP = 7;   /* its half-width at both ends */
const K_MAX = 5.6;                     /* the most the heading may turn from root to tip, in radians: a loop and a bit */
const PROFILE = 1.45;                  /* how the turn is spread: 1 is even, more is a stiff root and a curling tip */
const f = u => Math.pow(u, PROFILE);

/* the straight-line distance (as a fraction of the length) between the two ends of a trunk that turns by K in all */
function chord(K) {
  let x = 0, y = 0;
  for (let i = 0; i < N; i++) { const a = K * f((i + 0.5) / N); x += Math.cos(a); y += Math.sin(a); }
  return { x: x / N, y: y / N };
}
const sizeOf = c => Math.sqrt(c.x * c.x + c.y * c.y);

/* root {x,y}, the length it is stretched or foreshortened to, where the tip must go {x,y}, and `side` (-1 to 1; +1 curls it clockwise on the glass, -1 the other way, and a fraction bends it by that much of what it needs). The curve comes back as N + 1
   points with a half-width for each; a tip that is out of reach is simply pointed at (the trunk goes straight). */
export function solveTrunk(root, len, tip, side) {
  side = Math.max(-1, Math.min(1, side == null ? 1 : side));   /* a fraction bends it less: a trunk changing which way it curls goes through straight */
  const dx = tip.x - root.x, dy = tip.y - root.y, d = Math.sqrt(dx * dx + dy * dy);
  const want = Math.min(1, d / len);
  let K = 0;
  if (want < 0.9995) {
    let lo = 0, hi = K_MAX;                           /* the chord only gets shorter as the bend grows: bisect for the one that is d long */
    if (sizeOf(chord(hi)) > want) K = hi;
    else { for (let i = 0; i < 26; i++) { const mid = (lo + hi) / 2; if (sizeOf(chord(mid)) > want) lo = mid; else hi = mid; } K = (lo + hi) / 2; }
  }
  K *= side;
  const c = chord(K), turn = Math.atan2(dy, dx) - Math.atan2(c.y, c.x);   /* rotate the curve so that its two ends lie along the line to the tip */
  const pts = [{ x: root.x, y: root.y }], rad = [R_ROOT];
  let x = root.x, y = root.y;
  for (let i = 0; i < N; i++) {
    const a = turn + K * f((i + 0.5) / N);
    x += Math.cos(a) * len / N; y += Math.sin(a) * len / N;
    pts.push({ x: x, y: y });
    rad.push(R_ROOT + (R_TIP - R_ROOT) * Math.pow((i + 1) / N, 0.85));
  }
  return { pts: pts, rad: rad, tip: pts[N], len: len };
}
