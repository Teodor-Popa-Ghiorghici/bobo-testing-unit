/* Bekkedal — the scene runner.
 *
 * A heart event is not a conversation. A conversation is something the
 * player starts by walking up to somebody and pressing act; a scene is
 * something that happens *to* them because they walked into a place at an
 * hour when it was going to happen anyway. So this file is the other half
 * of schedule.js: schedule.js answers "where is everybody right now", and
 * this one answers "and is one of them about to say something the player
 * did not ask for".
 *
 * Pure, in the same sense schedule.js is pure: nothing here is seeded,
 * nothing here is saved, and nothing here writes to `S`. `sceneFor()` reads
 * state and answers a question; `beginScene()` builds a plain run object out
 * of a definition; `sceneRestore()` and `sceneEffects()` hand index.js back
 * the two things it must write, and index.js is what writes them. The scene
 * table itself (BEK_SCENES, scenes.js, re-exported from data.js) is content
 * and carries no behaviour at all.
 *
 * A definition:
 *
 *   { id, npc, at, map, from, to, anchor: [x, y], r, stand: [x, y], face,
 *     cast: [{ id, x, y, dir }], beats: [{ who, mood, lines }],
 *     if?, weather?, season?, festival?, gain?, set? }
 *
 *   at        the friendship the scene's own NPC must have reached (4/7/10)
 *   from/to   minutes of day, wrapping past midnight the same way a post's
 *             window in schedule.js does
 *   anchor/r  the player has to be within `r` tiles (Chebyshev — a box, not
 *             a circle) of `anchor` for the scene to be *in view*. Entering
 *             the map is what usually puts them there, but walking up to it
 *             works too, which is what keeps a scene anchored at one end of
 *             a map from being unreachable to a player who always comes in
 *             at the other.
 *   stand     where the runner stands the player for the length of it, so a
 *             scene composes a tableau rather than hoping nobody is on the
 *             tile an actor wants. Their own square and facing come back at
 *             the end — see sceneRestore().
 *   cast      who is placed, and where, for the length of it. index.js's
 *             npcsHere() layers these over schedule.js's answer, so an actor
 *             can stand somewhere they are never otherwise scheduled (Håkon
 *             up at the stave church) without touching their posts.
 *   beats     one dialogue box each: a speaker and the lines they say in a
 *             row. The same shape a BEK_TALK nodes[] entry has, so the same
 *             box, the same portrait, the same name plate draw it.
 *
 * A scene fires once. The mark is `S.seen['sc:' + id]`, the same table a
 * one-shot dialogue node is tracked in — nothing new in the save.
 */

const DAY_MIN = 24 * 60;
const clampMin = m => ((Math.floor(m) % DAY_MIN) + DAY_MIN) % DAY_MIN;

export const sceneKey = id => 'sc:' + id;

function hourMatch(def, minute) {
  const m = clampMin(minute);
  return def.from <= def.to ? (m >= def.from && m < def.to) : (m >= def.from || m < def.to);
}

/* Chebyshev, because the viewport is a rectangle and so is what counts as
   "close enough to be watching". */
function inView(def, px, py) {
  return Math.max(Math.abs(px - def.anchor[0]), Math.abs(py - def.anchor[1])) <= def.r;
}

/* Every gate but the one-shot mark, so scene_check.js can ask "would this
   ever fire" separately from "has it fired". */
export function sceneEligible(def, S) {
  if (def.map !== S.map) return false;
  if ((S.fr[def.npc] || 0) < def.at) return false;
  if (!hourMatch(def, S.min)) return false;
  if (!inView(def, S.px, S.py)) return false;
  if (def.weather && S.weather !== def.weather) return false;
  if (def.season != null && S.season !== def.season) return false;
  if (def.festival && !S.festival) return false;
  if (def.if && !def.if(S)) return false;
  return true;
}

/* The first unfired scene the state allows, in table order — which is why
   scenes.js keeps each character's three in ascending `at`. A player who
   crossed friendship 7 without ever having been in town at six in the
   morning still gets the four-scene first, and the seven-scene the next
   time the window comes round. */
export function sceneFor(defs, S) {
  for (const def of defs) {
    if (S.seen[sceneKey(def.id)]) continue;
    if (sceneEligible(def, S)) return def;
  }
  return null;
}

/* A run is plain data: the definition, which beat is showing, and the
   player's own square and facing as they were the moment before. */
export function beginScene(def, S) {
  return { def: def, i: 0, from: { px: S.px, py: S.py, dir: S.dir } };
}

export function sceneBeat(run) {
  return run && run.def.beats[run.i] || null;
}

/* true while there is another beat to show. */
export function sceneAdvance(run) {
  run.i++;
  return run.i < run.def.beats.length;
}

/* Where the actors stand for the length of it. index.js layers these over
   schedule.js's own answer by id — an actor named here is placed here and
   is not also standing at their post. */
export function sceneCast(run) {
  return run ? run.def.cast : [];
}

/* The two writes index.js owes a scene: where the player goes for it, and
   where they come back to after. */
export function scenePlace(run) {
  const d = run.def;
  return { px: d.stand[0], py: d.stand[1], dir: d.face || 0 };
}
export function sceneRestore(run) {
  return run.from;
}

/* What the scene leaves behind: the one-shot mark, the friendship it is
   worth, and any flags later dialogue reads. A patch, not a write — the
   caller applies it, the same way index.js applies a node's own `set`. */
export function sceneEffects(run) {
  const d = run.def;
  return { seen: sceneKey(d.id), npc: d.npc, fr: d.gain || 0, flag: d.set || null };
}
