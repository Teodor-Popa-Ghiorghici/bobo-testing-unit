/* Bekkedal — the loft, as questions rather than as state.
 *
 * The long spine (BEK_LOFT / BEK_LOFT_STAGES, data.js) is seven wings of
 * sixty-four entries in the old storehouse on the town square. This module is
 * everything the rest of the game wants to *know* about it, and it is pure in
 * exactly the sense `seasons.js`, `quests.js`, `schedule.js` and `scene.js`
 * are: functions of `(S, …)` that read `S` and return a value. Nothing here
 * writes, nothing here is seeded, nothing here touches the DOM — which is why
 * `spine_check.js` can walk a whole simulated year of it without mounting the
 * app, and why the panel, the quest-board row, the six payout gates and the
 * ending can all ask the same question and be guaranteed the same answer.
 *
 * **There is exactly one writer in the app**, `spineDonate()` in `index.js`,
 * and it writes exactly one field, `S.spine`:
 *
 *     { d: { entryId: day }, m: { milestoneId: day }, first: day, done: day }
 *
 * `d` is what has been given. `m` is which of the milestones that hand over a
 * *number* (bag space, stamina) have already handed it over — the others need
 * no record at all, because a recipe, a hoist stop, a gift cap and a day off a
 * preserve are all read back through this file every time they are asked
 * about. That split is the whole design: as little stored as a milestone
 * genuinely requires, and everything else derived, so a payout cannot drift
 * from the donations that earned it.
 *
 * `spineOpen()` is derived too, and deliberately: the loft is not a flag
 * somebody sets when a conversation happens, it is a fact about how far Act II
 * and Astrid have got. A save that somehow lost the key would find it again.
 */
import { BEK_LOFT, BEK_LOFT_STAGES, BEK_LOFT_FR, BEK_GIFT_CAP } from './data.js';

/* every entry in the loft, flat, in wing order — the order the panel walks
   and the order `spine_check.js` asserts the milestones fire in */
export const LOFT_ENTRIES = BEK_LOFT.reduce((a, w) => a.concat(w.e.map(e => ({ w: w, e: e }))), []);
export const LOFT_TOTAL = LOFT_ENTRIES.length;

/* a `S` handed in by a check is not always a `S` a running game holds — same
   rule a chat gate follows (.claude/rules/content.md), for the same reason */
const D = S => (S && S.spine && S.spine.d) || {};
const M = S => (S && S.spine && S.spine.m) || {};

/* ---- the gate ------------------------------------------------------------
   Act II first, because the house has to have closed before anything else
   competes with it, and Astrid second, because it is her grandmother's loft
   and she is not handing the key to somebody she met last week. Both are
   read; neither is ever set here or anywhere. */
export function spineOpen(S) {
  return !!(S && S.act2Unlocked) && ((S.fr && S.fr.astrid) || 0) >= BEK_LOFT_FR;
}

/* ---- what is in it -------------------------------------------------------- */
export const entryDone = (S, e) => !!D(S)[e.id];
export const wingOf = id => BEK_LOFT.filter(w => w.id === id)[0] || null;

/* Whether this entry could be given *right now*. `held` is a function from an
   item id to how many of it the player is carrying, handed in rather than read
   off S.bag, so the same predicate answers for the bag, for a simulation's own
   stock table and for a check's synthetic one. */
export function entryReady(S, e, held) {
  if (entryDone(S, e)) return false;
  if (e.when && !e.when(S)) return false;
  if (e.item) return (held ? held(e.item) : 0) >= 1;
  return true;
}

export function wingProgress(S, w) {
  const wing = typeof w === 'string' ? wingOf(w) : w;
  if (!wing) return { have: 0, need: 0 };
  let have = 0;
  wing.e.forEach(e => { if (entryDone(S, e)) have++; });
  return { have: have, need: wing.e.length };
}
export function wingDone(S, id) {
  const p = wingProgress(S, id);
  return p.need > 0 && p.have === p.need;
}
export function spineProgress(S) {
  let have = 0;
  LOFT_ENTRIES.forEach(x => { if (entryDone(S, x.e)) have++; });
  return { have: have, need: LOFT_TOTAL };
}
export const spineComplete = S => spineProgress(S).have === LOFT_TOTAL;

/* How far the building itself has come back: 0 before the first stage, then
   one per BEK_LOFT_STAGES entry whose donation count has been reached. */
export function spineStage(S) {
  const n = spineProgress(S).have;
  let st = 0;
  BEK_LOFT_STAGES.forEach(s => { if (n >= s.at) st++; });
  return st;
}
/* the next thing that will happen, for the panel's own footer — null once the
   last stage is behind you */
export function nextStage(S) {
  const n = spineProgress(S).have;
  return BEK_LOFT_STAGES.filter(s => n < s.at)[0] || null;
}

/* ---- what the loft would take off you this minute ------------------------
   The panel's SPACE is "give it everything it still wants", so this is the
   list that action walks. Item entries come first in wing order, and the
   condition entries (a friendship, a floor of the mine, and the festival
   half of an ÅRET offering) fall out of the same predicate rather than
   needing a second pass. */
export function spineWants(S, held) {
  if (!spineOpen(S)) return [];
  const out = [], spent = {};
  LOFT_ENTRIES.forEach(x => {
    const e = x.e;
    const stock = id => (held ? held(id) : 0) - (spent[id] || 0);
    if (!entryReady(S, e, stock)) return;
    if (e.item) spent[e.item] = (spent[e.item] || 0) + 1;
    out.push(x);
  });
  return out;
}

/* ---- the milestones -------------------------------------------------------
   Three restoration stages, earned on a count of donations, and one payout per
   finished wing. Both shapes carry an `id`; only the ones that hand over a
   number carry a `grant`, and only those ever appear in `S.spine.m`. */
export function spineEarned(S) {
  const n = spineProgress(S).have, out = [];
  BEK_LOFT_STAGES.forEach(s => { if (n >= s.at) out.push({ id: s.id, t: s.t, gt: s.gt, grant: s.grant, stage: s }); });
  BEK_LOFT.forEach(w => { if (wingDone(S, w.id)) out.push(Object.assign({ wing: w }, w.pay)); });
  return out;
}
/* earned, hands over a number, and has not handed it over yet — the only
   thing `spineDonate()` has to act on beyond recording the gift itself */
export function spineClaimable(S) {
  return spineEarned(S).filter(m => m.grant && !M(S)[m.id]);
}

/* ---- the payouts that are not numbers -------------------------------------
   Every one of these is read where it is used and stored nowhere: a recipe's
   own `spine` field through recipeUnlocked(), the extra forage round in
   spawnDrops(), the hoist's floor list in mineStations(), a day off a keg in
   presvAct(), and the gift cap in talkTo(). If a donation were ever rolled
   back, all five would roll back with it, because none of them is a fact
   about anything but the donations. */
export const spineRecipeOK = (S, r) => !r.spine || wingDone(S, r.spine);
export const spineForageBonus = S => wingDone(S, 'skog');
export const spineHoistEveryFloor = S => wingDone(S, 'fjell');
export const spinePresvDaysOff = S => (wingDone(S, 'fjos') ? 1 : 0);
export const spineGiftCap = S => (wingDone(S, 'folk') ? BEK_GIFT_CAP * 2 : BEK_GIFT_CAP);

/* Which props the room is wearing today: the stages that have been reached,
   and one display per finished wing on its own plinth. Layered by
   propsPrepare() (index.js) over BEK_DECOR.loftet the same way
   BEK_DECOR.lakehouse_t2 layers over the house — over, never instead of. */
export function spineProps(S) {
  const out = [];
  const st = spineStage(S);
  for (let i = 0; i < st; i++) BEK_LOFT_STAGES[i].props.forEach(p => out.push(p));
  BEK_LOFT.forEach(w => { if (wingDone(S, w.id)) out.push(w.prop); });
  return out;
}

/* ---- what the ending reads back -------------------------------------------
   Nothing extra is stored for it. `S.spine.d` already records the day every
   single gift was given, so the day a wing was finished is the latest of its
   own entries, and the order the seven were finished in falls out of that —
   the ending can say what you began with and what you left until last without
   the save carrying a field that says so. */
export function wingFinishDay(S, w) {
  const wing = typeof w === 'string' ? wingOf(w) : w;
  if (!wing || !wingDone(S, wing.id)) return 0;
  return wing.e.reduce((m, e) => Math.max(m, D(S)[e.id] || 0), 0);
}
export function wingOrder(S) {
  return BEK_LOFT.filter(w => wingDone(S, w.id))
                 .map(w => ({ w: w, day: wingFinishDay(S, w) }))
                 .sort((a, b) => a.day - b.day);
}

/* ---- the row on the quest board ------------------------------------------
   The panel lives at the loft, because the loft is somewhere you walk to and
   through. This is the half that has to be legible from anywhere: press Q on
   any map and the board says how far along the year's work is, the same way
   it already says where the house has got to. */
export function spineRow(S) {
  if (!spineOpen(S)) return null;
  const p = spineProgress(S);
  const st = spineStage(S), next = nextStage(S);
  return {
    have: p.have, need: p.need, stage: st,
    /* the sub-line: what the building is waiting on, or that it is finished */
    d: spineComplete(S) ? { no: 'Ferdig. Hele dalen står i det.', en: 'Finished. The whole valley stands in it.' }
     : next ? { no: 'Neste: ' + next.t.no + ' ved ' + next.at + ' gaver.',
                en: 'Next: ' + next.t.en + ' at ' + next.at + ' gifts.' }
     : { no: 'Bygget er reist. Nå er det vingene igjen.',
         en: 'The building is back. The wings are what is left.' }
  };
}
