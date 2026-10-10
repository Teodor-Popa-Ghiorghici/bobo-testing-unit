/* What a sliding block of concrete leaves behind it, in the window: grit thrown off the trailing feet at every jerk, a haze of dust that thickens with the speed, and a dark scuffed
   groove in the ground under the path that fades once he has stopped. Whole pixels, the sixteen colours (7 and 8 the greys of the stone, 15 chips of white, 6 rust-brown, 0 the
   groove), the machine's own dither for the haze and the groove (`wash(x, y, w, h, colour, density 0..16)` is passed in). Nothing here keeps time of its own: step(dt) and draw(). */
const FLOOR = 272, GRAV = 150;
const COLS = [7, 7, 8, 8, 15, 6];

export function createSlideFx(R, wash) {
  let bits = [], haze = 0, hazeX = 0, groove = null;
  const rand = Math.random;
  return {
    /* a jerk: `x` where the trailing feet are, `dir` which way he is going, `hard` 0..1 */
    burst(x, dir, hard, calm) {
      const n = Math.round((calm ? 3 : 5) + hard * (calm ? 4 : 9));
      for (let i = 0; i < n; i++) bits.push({ x: x + (rand() - 0.5) * 14, y: FLOOR - 2 - rand() * 5, vx: -dir * (14 + rand() * 62), vy: -(14 + rand() * 54), life: 0.45 + rand() * 0.7, age: 0, c: COLS[Math.floor(rand() * COLS.length)], s: rand() < 0.15 ? 3 : rand() < 0.45 ? 2 : 1 });
    },
    /* the dust that hangs there while he moves: where, how fast (0..1) */
    air(x, speed) { haze = speed; hazeX = x; },
    /* the groove: from one end of the path to the other */
    mark(x0, x1) { groove = { x0: Math.min(x0, x1), x1: Math.max(x0, x1), age: 0, live: true }; },
    release() { if (groove) groove.live = false; },
    step(dt) {
      bits = bits.filter(b => { b.age += dt; b.vy += GRAV * dt; b.x += b.vx * dt; b.y += b.vy * dt; if (b.y > FLOOR + 3) { b.y = FLOOR + 3; b.vy = 0; b.vx *= 0.4; } return b.age < b.life; });
      if (groove && !groove.live) { groove.age += dt; if (groove.age > 2.6) groove = null; }
      haze *= Math.pow(0.02, dt);                                   /* it settles in about a second once he is still */
    },
    /* under him: the groove */
    drawGround() {
      if (!groove) return;
      const k = groove.live ? 1 : 1 - groove.age / 2.6, w = groove.x1 - groove.x0 + 150;
      wash(groove.x0 - 75, FLOOR - 1, w, 5, 0, Math.round(6 * k));
      wash(groove.x0 - 75, FLOOR + 1, w, 2, 8, Math.round(7 * k));
    },
    /* over him: the haze and the grit */
    drawAir() {
      if (haze > 0.04) { wash(hazeX - 52, FLOOR - 16, 104, 22, 7, Math.round(3 + haze * 8)); wash(hazeX - 30, FLOOR - 28, 60, 16, 7, Math.round(2 + haze * 5)); }
      bits.forEach(b => R(b.x, b.y, b.s, b.s, b.c));
    },
    count: () => bits.length
  };
}
