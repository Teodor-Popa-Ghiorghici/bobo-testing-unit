/* THE SOUND OF A CONCRETE BLOCK SLIDING OVER ROCK, worked out from the run in slide_plan.js (pure: numbers, no audio, so Node can hold it; slide_sfx.js plays it).
   What a drag of heavy stone is made of (heard in the recordings of it, and how the friction-sound models build it: a band of noise whose centre rises with the speed, and a stick-slip
   that is an irregular train of impulses): a low weight under everything (the rumble, and a thrum a little above the lowest note a speaker will give), a mid-band scrape that
   is the surface itself (noise, whose centre climbs as he speeds up), a gritty crackle on top (gravel and dust under the block), and a heavy thump when it lets go and when it stops.
   The scrape and the grit are not steady: at every jerk of the run they flare, and between jerks, while it sticks, they drop away, which is the grinding rhythm.
   A curve is [[seconds, value], ...]; the player ramps from point to point. Everything is meant to be LOUD (the other effects sit at 0.02 to 0.06; this is ten times that) and sits on the
   machine's SFX bus, so the knob still sets how loud. */
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const STEP = 0.04;                              /* the resolution of the smooth curves, seconds */

export function soundPlan(run) {
  const total = run.total, n = Math.ceil(total / STEP);
  const curve = f => { const c = []; for (let i = 0; i <= n; i++) { const t = Math.min(total, i * STEP); c.push([t, f(t)]); } return c; };
  const v = t => run.speed(t), q = t => run.tremble(t);
  /* a curve that flares at every jerk and sinks between: the points at the jerks are added to the smooth ones and the whole put in order */
  const pulsed = (base, flare, sink) => {
    const c = curve(t => base(t) * sink);
    run.slips.forEach(s => {
      const g = base(s.at + 0.01) * flare * (0.6 + 0.6 * s.hard);
      c.push([Math.max(0, s.at - 0.004), base(s.at) * sink], [s.at + 0.012, g], [s.at + s.dur + 0.05, base(s.at + s.dur) * sink * 0.8]);
    });
    return c.sort((a, b) => a[0] - b[0]).filter((p, i, a) => i === 0 || p[0] > a[i - 1][0]);
  };
  const plan = {
    total: total,
    rumble: curve(t => clamp(0.08 * q(t) + 0.4 * v(t), 0, 0.6)).map(([t, g]) => [t, g, 80 + 150 * v(t)]),
    thrum: pulsed(t => 0.2 * v(t) + 0.08 * q(t), 1.4, 0.8).map(([t, g]) => [t, g, 40 + 16 * v(t) + 8 * q(t)]),
    groan: curve(t => 0.22 * q(t)).map(([t, g]) => [t, g, 50 + 24 * q(t)]),
    bed: pulsed(t => 0.1 * (q(t) > 0 ? 1 : 0) + 0.7 * Math.pow(v(t), 0.8), 1.6, 0.4).map(([t, g]) => [t, g, 280 + 1500 * v(t) + 120 * q(t)]),
    grit: pulsed(t => 0.06 * (q(t) > 0 ? 1 : 0) + 0.8 * v(t), 1.7, 0.25),
    thumps: []
  };
  /* the let-go of each stroke, the jerks that are hard enough to be heard on their own, and the stop */
  run.slips.forEach(s => {
    if (s.first) plan.thumps.push({ at: s.at, gain: 0.95, f0: 84, f1: 38, dur: 0.34, nGain: 0.6, nHz: 1000, nMs: 120, nType: 'bandpass' });
    else if (s.hard > 0.85) plan.thumps.push({ at: s.at, gain: 0.2 + 0.25 * s.hard, f0: 70, f1: 44, dur: 0.16, nGain: 0.18, nHz: 700, nMs: 50, nType: 'bandpass' });
  });
  run.ends.forEach((e, i) => plan.thumps.push({ at: e.at, gain: i === 0 ? 0.85 : 1.0, f0: 68, f1: 30, dur: 0.55, nGain: i === 0 ? 0.55 : 0.7, nHz: 900, nMs: 190, nType: 'lowpass' }));
  plan.thumps.sort((a, b) => a.at - b.at);
  return plan;
}

/* the most the layers could add up to if every one were at its peak at the same instant (the player runs them through a compressor, so this is a ceiling on the worst moment) */
export function ceiling(plan) {
  const top = c => Math.max.apply(null, c.map(p => p[1]));
  return top(plan.rumble) + top(plan.thrum) + top(plan.groan) + top(plan.bed) + top(plan.grit) + Math.max.apply(null, plan.thumps.map(t => t.gain + t.nGain));
}
/* the loudness through the run, second by second, as the layers' sum at that moment (for the check, and for a picture of it) */
export function levelAt(plan, t) {
  const at = c => { let v = 0; for (let i = 0; i < c.length; i++) { if (c[i][0] > t) break; v = c[i][1]; } return v; };
  const th = plan.thumps.reduce((a, p) => a + (t >= p.at && t < p.at + p.dur ? p.gain * (1 - (t - p.at) / p.dur) : 0), 0);
  return at(plan.rumble) + at(plan.thrum) + at(plan.groan) + at(plan.bed) + at(plan.grit) + th;
}
