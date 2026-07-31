/* Seeded RNG — Phase 0 foundation. One xorshift128 generator per run,
   seeded from a string/number seed, with derived named sub-streams
   (rng.stream('map'), 'rewards', 'combat', 'ai') so drawing from one
   stream can never shift the sequence another stream would have produced.

   Simulation, AI and reward code must draw from a stream here, never from
   Math.random() -- that is what makes a run reproducible from its seed.
   Render/particle code must NOT use this file; it gets its own separate
   unseeded generator (createUnseededRng) so a dropped frame can never
   desync the sim. */

function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Expands a single 32-bit seed into a non-zero 4-word xorshift128 state. */
function makeState(seedNum) {
  const next = mulberry32(seedNum);
  const state = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) state[i] = (next() * 4294967296) >>> 0;
  if (!(state[0] | state[1] | state[2] | state[3])) state[0] = 0x9E3779B9;
  return state;
}

function xorshift128Next(state) {
  const x = state[0];
  const t = x ^ (x << 11);
  state[0] = state[1]; state[1] = state[2]; state[2] = state[3];
  const w = state[3];
  state[3] = (w ^ (w >>> 19)) ^ (t ^ (t >>> 8));
  return state[3] >>> 0;
}

/* A single named stream: independent xorshift128 state, so it never
   perturbs any other stream's sequence. */
function createStream(seedNum) {
  const state = makeState(seedNum);
  return {
    nextUint32() { return xorshift128Next(state); },
    random() { return xorshift128Next(state) / 4294967296; },
    range(min, max) { return min + this.random() * (max - min); },
    int(min, max) { return Math.floor(this.range(min, max + 1)); },
    chance(p) { return this.random() < p; },
    pick(arr) { return arr[Math.floor(this.random() * arr.length)]; }
  };
}

/* Root RNG for one run. `seed` may be a string (hashed) or a number.
   Sub-streams are created lazily and cached by name, derived
   deterministically from the root seed + stream name so the same seed
   always reproduces the same streams in the same order. */
export function createRng(seed) {
  const rootSeed = typeof seed === 'number' ? seed >>> 0 : hashString(String(seed));
  const streams = new Map();
  return {
    seed: rootSeed,
    stream(name) {
      let s = streams.get(name);
      if (!s) {
        const subSeed = (hashString(rootSeed + ':' + name) ^ Math.imul(hashString(name), 0x9E3779B1)) >>> 0;
        s = createStream(subSeed);
        streams.set(name, s);
      }
      return s;
    }
  };
}

/* Render/particle-only generator. Never seeded from a run, never shared
   with a sim stream -- a dropped frame's worth of draws here can never
   change what the simulation does. */
export function createUnseededRng() {
  const entropy = (Date.now() ^ Math.floor(Math.random() * 0xFFFFFFFF)) >>> 0;
  return createStream(entropy);
}
