/* GARDEN — what the rooms sound like, as a plan: given where you are, the weather and the hour, which continuous layers should be how loud, and which one-off sounds happen when.
   Pure: no audio, no window, no clock of its own (the caller says how much time passed), a seeded dice. ambience_synth.js turns the plan into sound; ambience_check.js plays an evening against it.
   The sounds that are also pictures (the cellar's drip, the greenhouse's misters, the plane over the roof) are cued from the same clock the picture is drawn from, so they land together. */

export const LAYERS = ['wind', 'rain', 'cricket', 'city', 'drone', 'pad', 'hum', 'fire'];

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const day = env => !env.night;

/* the one-off sounds, per room: how many a minute on average, and when they may happen. `kind` is what the synth makes; `v` picks a voice inside it. */
export const RULES = {
  yard: [
    { kind: 'bird', perMin: 9, when: e => day(e) && e.rain < 0.3 && e.season !== 'winter' },
    { kind: 'sparrow', perMin: 3, when: e => day(e) && e.rain < 0.3 && e.season === 'winter' },
    { kind: 'owl', perMin: 1.1, when: e => !day(e) && e.rain < 0.3 && e.season !== 'winter' },
    { kind: 'frog', perMin: 4, when: e => !day(e) && e.rain < 0.6 && (e.season === 'spring' || e.season === 'summer') },
    { kind: 'bee', perMin: 3, when: e => day(e) && e.rain < 0.2 && e.season === 'summer' },
    { kind: 'leaf', perMin: 7, when: e => e.wind > 0.4 && e.season === 'autumn' },
    { kind: 'crow', perMin: 0.8, when: e => day(e) && e.season === 'autumn' || e.season === 'winter' && day(e) },
    { kind: 'plink', perMin: 18, when: e => e.rain > 0.3 }
  ],
  greenhouse: [
    { kind: 'plink', perMin: 10, when: e => e.rain > 0.2 },
    { kind: 'pipe', perMin: 1.1, when: () => true },
    { kind: 'creakGlass', perMin: 2, when: e => e.wind > 0.5 },
    { kind: 'bird', perMin: 2.5, when: e => day(e) && e.rain < 0.3 }
  ],
  cellar: [
    { kind: 'creak', perMin: 1.6, when: () => true },
    { kind: 'scurry', perMin: 1.3, when: () => true },
    { kind: 'gurgle', perMin: 1.5, when: () => true }
  ],
  rooftop: [
    { kind: 'car', perMin: 11, when: () => true },
    { kind: 'horn', perMin: 1.6, when: () => true },
    { kind: 'siren', perMin: 0.6, when: () => true },
    { kind: 'meow', perMin: 0.9, when: e => !day(e) },
    { kind: 'flag', perMin: 9, when: e => e.wind > 0.5 },
    { kind: 'tinkle', perMin: 4, when: e => e.wind > 0.3 },
    { kind: 'pigeon', perMin: 3, when: e => day(e) && e.rain < 0.3 }
  ],
  shrine: [
    { kind: 'bell', perMin: 1.4, when: () => true },
    { kind: 'chime', perMin: 3.5, when: () => true },
    { kind: 'pluck', perMin: 3, when: () => true },
    { kind: 'flute', perMin: 0.8, when: () => true },
    { kind: 'spirit', perMin: 0.9, when: () => true },
    { kind: 'crackle', perMin: 14, when: () => true }
  ]
};

/* how loud each continuous layer is, 0 to 1, from the room and the weather */
export function layers(env) {
  const o = {}, r = env.room, night = env.night, w = env.wind;
  LAYERS.forEach(k => { o[k] = 0; });
  const outdoors = r === 'yard' || r === 'rooftop';
  o.wind = r === 'yard' ? 0.35 + w * 0.5 : r === 'rooftop' ? 0.55 + w * 0.6 : r === 'greenhouse' ? 0.1 + w * 0.2 : r === 'shrine' ? 0.12 + w * 0.2 : 0.03;
  o.rain = r === 'cellar' || r === 'shrine' ? 0 : clamp(env.rain, 0, 1) * (r === 'greenhouse' ? 1 : 0.8);
  o.cricket = (r === 'yard' && night && env.season !== 'winter' ? 0.9 : r === 'rooftop' && night ? 0.2 : r === 'shrine' ? 0.25 : 0) * (1 - clamp(env.rain * 1.4, 0, 1));
  o.city = r === 'rooftop' ? 0.55 + (night ? 0.1 : 0.2) : 0;
  o.drone = r === 'cellar' ? 0.8 : 0;
  o.pad = r === 'shrine' ? 0.7 : 0;
  o.hum = r === 'greenhouse' ? 0.6 : r === 'cellar' ? 0.35 : 0;
  o.fire = r === 'shrine' ? 0.5 : 0;
  void outdoors;
  return o;
}

/* a plan: step(dt, env) -> { layers, events }. Event times are exponential (a Poisson rain of sounds), restarted when the room changes. */
export function createPlan(rand = Math.random) {
  const next = {}, st = { room: null, k: {}, flash: 0, thunder: [] };
  const draw = perMin => -Math.log(1 - rand() * 0.999) * 60 / perMin;
  return {
    step(dt, env) {
      const events = [];
      if (st.room !== env.room) { st.room = env.room; Object.keys(next).forEach(k => delete next[k]); st.k = {}; events.push({ kind: 'enter', room: env.room, v: 0 }); }
      (RULES[env.room] || []).forEach((rule, i) => {
        const key = env.room + i;
        if (next[key] == null) next[key] = draw(rule.perMin);
        next[key] -= dt;
        if (next[key] <= 0) { next[key] = draw(rule.perMin); if (rule.when(env)) events.push({ kind: rule.kind, v: rand(), pan: rand() * 2 - 1, delay: rand() * 0.05 }); }
      });
      /* what is drawn and heard together, cued from the picture's own clock */
      const k = f => Math.floor(f);
      const edge = (name, val) => { const was = st.k[name]; st.k[name] = val; return was != null && val !== was; };
      if (env.room === 'cellar' && edge('drip', k(env.tsec * 0.45))) events.push({ kind: 'drip', v: rand(), pan: 0.3, deep: 1, delay: 0 });
      if (env.room === 'cellar' && edge('bulb', k((env.tsec + 1.8) / 17))) events.push({ kind: 'zap', v: rand(), pan: 0, delay: 0 });
      if (env.room === 'greenhouse') for (let i = 0; i < 4; i++) if (edge('mist' + i, k(env.tsec * 0.25 + i * 0.37))) events.push({ kind: 'mist', v: i / 4, pan: (i - 1.5) / 2, delay: 0 });
      if (env.room === 'greenhouse' && edge('gdrip', k(env.tsec * 0.35))) events.push({ kind: 'drip', v: rand(), pan: rand() * 2 - 1, deep: 0, delay: 0 });
      if (env.room === 'rooftop' && edge('plane', k(env.tsec / 53))) events.push({ kind: 'plane', v: rand(), pan: -0.4, delay: 0 });
      if (env.room === 'yard' && edge('swing', k(env.tsec / 26 + 0.45)) && env.light > 0.4 && env.rain < 0.3 && env.season !== 'winter') events.push({ kind: 'bird', v: rand(), pan: -0.6, delay: 0.1, near: 1 });
      /* thunder follows the flash by the time the sound takes: a second or two */
      const fl = env.flash || 0;
      if (fl > 0.4 && st.flash <= 0.4 && env.rain > 0.4) st.thunder.push({ t: 0.4 + rand() * 2.2, v: rand() });
      st.flash = fl;
      for (let i = st.thunder.length - 1; i >= 0; i--) { st.thunder[i].t -= dt; if (st.thunder[i].t <= 0) { events.push({ kind: 'thunder', v: st.thunder[i].v, pan: 0, delay: 0 }); st.thunder.splice(i, 1); } }
      return { layers: layers(env), events };
    }
  };
}
