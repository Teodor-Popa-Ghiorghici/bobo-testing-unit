/* Bekkedal — the loft, checked. `node apps/bekkedal/spine_check.js`
 *
 * The long spine (BEK_LOFT, data.js; spine.js) is the one piece of content
 * here whose failure mode is invisible from playing it: a wing asking for
 * something no source in the valley produces, or a milestone whose count sits
 * past the last donation, does not look wrong on screen — it looks like a
 * shelf you have not got to yet, and you find out sixty days in. Same reason
 * `mine_check.js` exists for the generated floors, same shape as
 * `act2_check.js`: read the tables the game reads, never a second hand-copied
 * set, and turn the brief's own claims into assertions.
 *
 * Five families — 1. SHAPE (ids, plinths, props, the panel's geometry),
 * 2. OBTAINABILITY (every requirement has a source, against an independently
 * authored table the way quest_check.js's GATE table is), 3. MILESTONES (each
 * fires once, at the count its table declares), 4. GATED AND COMPLETABLE
 * (nothing open before Act II and Astrid, everything closes, each payout
 * flips with its own wing), 5. HOW LONG IT TAKES, in `spine_check_time.js`.
 *
 * Family 2 has already earned the file twice, on bugs that predate the loft
 * and that nothing else here could see: `BEK_FISH_WATERS.lake.legendWhen`
 * asked for 04:00-05:00 on a clock that runs 06:00 to 02:00, so the troll
 * trout could not be caught at all; and `planke` had a price and two recipes
 * wanting it and no source anywhere.
 */
import { BEK_LOFT, BEK_LOFT_STAGES, BEK_LOFT_FR, BEK_ITEMS, BEK_CROPS, BEK_MAPS,
         BEK_DECOR, BEK_RECIPES, BEK_TALK, BEK_FISH_WATERS } from './data.js';
import { spineOpen, spineProgress, spineStage, spineComplete, spineWants, spineEarned,
         spineClaimable, spineProps, spineRecipeOK, spineForageBonus, spineHoistEveryFloor,
         spinePresvDaysOff, spineGiftCap, spineRow, wingDone, LOFT_ENTRIES, LOFT_TOTAL } from './spine.js';
import { PROP } from './decor.js';
import { howLong } from './spine_check_time.js';

let fails = 0, checks = 0;
const ok = (cond, label, detail) => {
  checks++;
  if (cond) return true;
  fails++; console.log('FAIL ' + label + (detail ? '   ' + detail : '')); return false;
};
const pass = (label, detail) => { checks++; console.log('OK   ' + label.padEnd(52) + (detail || '')); };
/* a blank save with the loft open, so a predicate gets a whole S */
function S0(over) {
  return Object.assign({
    day: 1, min: 6 * 60, season: 0, festival: null, weather: 'klar', act2Unlocked: true,
    fr: { astrid: 10, hakon: 0, ingrid: 0, olav: 0, marit: 0, sigrid: 0, gunnar: 0, lars: 0 },
    bag: {}, deepest: 0, legend: {}, flag: {}, q: {},
    spine: { d: {}, m: {}, first: 0, done: 0 }, bagCap: 80, enMax: 120, en: 120
  }, over || {});
}

/* ============================================================================
   1. SHAPE
   ========================================================================== */
console.log('\n-- shape --');
const room = BEK_MAPS.loftet;
ok(!!room && room.inside, 'the loft is a room in BEK_MAPS', room ? room.rows[0].length + 'x' + room.rows.length : 'missing');
const at = (x, y) => (room.rows[y] !== undefined && x >= 0 && x < room.rows[y].length) ? room.rows[y].charAt(x) : '';
const seenId = new Set(), seenWing = new Set();
let dupId = null, dupWing = null, badItem = null, badEntry = null;
BEK_LOFT.forEach(w => {
  if (seenWing.has(w.id)) dupWing = dupWing || w.id;
  seenWing.add(w.id);
  w.e.forEach(e => {
    if (seenId.has(e.id)) dupId = dupId || e.id;
    seenId.add(e.id);
    if (!e.item && !e.when) badEntry = badEntry || e.id;
    if (e.item && (!BEK_ITEMS[e.item] || BEK_ITEMS[e.item].seed || BEK_ITEMS[e.item].animal))
      badItem = badItem || e.id + ' -> ' + e.item;
    if (!e.item && !e.t) badEntry = badEntry || e.id + ' (a condition with no label to draw)';
  });
});
ok(!dupWing, 'no two wings share an id', dupWing || BEK_LOFT.length + ' wings');
ok(!dupId, 'no two entries share an id', dupId || LOFT_TOTAL + ' entries');
ok(!badEntry, 'every entry is an item or a condition, and nameable', badEntry || '');
ok(!badItem, 'every item asked for is a real, holdable item', badItem || '');
ok(LOFT_ENTRIES.length === LOFT_TOTAL && LOFT_TOTAL === BEK_LOFT.reduce((a, w) => a + w.e.length, 0),
   'the flat entry list is the wings', LOFT_TOTAL + ' over ' + BEK_LOFT.length + ' wings');

/* the plinths: one `c` per wing, none shared */
const claimed = new Map();
let plinthBad = null, propKindBad = null;
BEK_LOFT.forEach(w => {
  const p = w.prop;
  if (!p || at(p.x, p.y) !== 'c') plinthBad = plinthBad || w.id + ' at ' + (p ? p.x + ',' + p.y : '?') + ' is ' + JSON.stringify(p ? at(p.x, p.y) : '');
  if (!PROP[p.kind]) propKindBad = propKindBad || w.id + ' -> ' + p.kind;
  const k = p.x + ',' + p.y;
  if (claimed.has(k)) plinthBad = plinthBad || (w.id + ' shares a plinth with ' + claimed.get(k));
  claimed.set(k, w.id);
});
ok(!plinthBad, 'every wing has its own plinth, and it is a `c` in the room', plinthBad || BEK_LOFT.length + ' plinths');
ok(!propKindBad, 'every display is a PROP kind decor.js already draws', propKindBad || '');
let stageBad = null, stageProp = null;
const baseKeys = new Set((BEK_DECOR.loftet || []).map(d => d.x + ',' + d.y));
BEK_LOFT_STAGES.forEach((st, i) => {
  if (i && st.at <= BEK_LOFT_STAGES[i - 1].at) stageBad = stageBad || st.id + ' does not come after ' + BEK_LOFT_STAGES[i - 1].id;
  if (st.at < 1 || st.at >= LOFT_TOTAL) stageBad = stageBad || st.id + ' sits at ' + st.at + ' of ' + LOFT_TOTAL;
  st.props.forEach(p => {
    const c = at(p.x, p.y);
    if (!c || ' cKD'.indexOf(c) >= 0) stageProp = stageProp || st.id + ' prop on ' + JSON.stringify(c) + ' at ' + p.x + ',' + p.y;
    if (baseKeys.has(p.x + ',' + p.y)) stageProp = stageProp || st.id + ' prop reuses a base loftet coordinate';
    if (!PROP[p.kind]) stageProp = stageProp || st.id + ' -> ' + p.kind; });
});
ok(!stageBad, 'the restoration stages climb, and all land before the end', stageBad ||
   BEK_LOFT_STAGES.map(s => s.at).join(', ') + ' of ' + LOFT_TOTAL);
ok(!stageProp, 'no stage prop stands on a plinth, the chest, the door or the margin', stageProp || '');
/* the town's own overlay, checked the way act2_check.js checks lakehouse_t2 */
let townBad = null;
(BEK_DECOR.town_t1 || []).forEach(d => {
  const c = BEK_MAPS.town.rows[d.y] && BEK_MAPS.town.rows[d.y].charAt(d.x);
  if (!c || c === ' ') townBad = townBad || JSON.stringify(d);
  if (!PROP[d.kind]) townBad = townBad || d.kind;
  if ((BEK_DECOR.town || []).some(b => b.x === d.x && b.y === d.y)) townBad = townBad || 'reuses a town coordinate';
});
ok(!townBad, 'the restored loft seen from the square sits on real town tiles', townBad || (BEK_DECOR.town_t1 || []).length + ' props');

/* the panel's own geometry is layout_check.js's, beside every other box in
   the game — this file is what is *in* the loft, that file is what fits. */
pass('shape', LOFT_TOTAL + ' entries, ' + BEK_LOFT.length + ' wings, ' + BEK_LOFT_STAGES.length + ' stages');

/* ============================================================================
   2. OBTAINABILITY
   ----------------------------------------------------------------------------
   Written apart from the engine on purpose — this is the check's own account
   of where a thing in this valley comes from, and it is only worth anything
   because it is *not* the expression the game evaluates. What can be crossed
   against a declared table is; what cannot (spawnDrops()'s scatter, an
   animal's yield, the hearth's ash) is cited to index.js the way
   act2_check.js cites fresh()'s own starting kr.
   ========================================================================== */
console.log('\n-- obtainability --');
const FORAGED = ['sopp', 'kantarell', 'blabar', 'multe', 'tyttebar', 'tang', 'urt'];  /* spawnDrops(), index.js */
const PICKED = ['blomst_bla', 'blomst_gul', 'blomst_ro'];                            /* act()'s 'p' branch    */
const SWUNG = ['tommer', 'stein', 'jern', 'kobber', 'solv'];                         /* act()'s oks/hakke     */
const DESCENT = ['krystall'];                                                        /* mine.js, below MINE_GEM_FLOOR */
const ANIMAL = ['melk', 'ull', 'egg'];                                               /* tendAnimal(), index.js */
const PRESERVED = ['syltetoy', 'fruktvin'];                                          /* PRESV_OUT, index.js   */
const RAKED = ['aske'];                                                              /* act()'s 'v' branch    */
const CROPPED = Object.keys(BEK_CROPS).map(c => BEK_CROPS[c].out);
const CRAFTED = BEK_RECIPES.craft.concat(BEK_RECIPES.cook).map(r => r.out);
const SHOPPED = Object.keys(BEK_TALK).reduce((a, id) => a.concat(BEK_TALK[id].shop || []), []);
const FISHED = Object.keys(BEK_FISH_WATERS).reduce((a, mp) => {
  const w = BEK_FISH_WATERS[mp];
  return a.concat(w.pool.map(p => p.id), [w.rare], w.legend ? [w.legend] : []);
}, []);
/* the clock the game keeps: the day opens at 06:00 and passes out at 26:00
   (tickClock, index.js), so a window outside that is one nobody can stand in */
const DAY_START = 6 * 60, DAY_END = 26 * 60;
let legendHour = null;
Object.keys(BEK_FISH_WATERS).forEach(mp => {
  const lw = BEK_FISH_WATERS[mp].legendWhen;
  if (lw && (lw.h0 < DAY_START || lw.h0 >= DAY_END || lw.h1 <= lw.h0))
    legendHour = legendHour || (mp + ': ' + lw.h0 + '..' + lw.h1 + ' is outside ' + DAY_START + '..' + DAY_END);
});
ok(!legendHour, 'every legendary window names an hour the clock reaches', legendHour ||
   Object.keys(BEK_FISH_WATERS).map(mp => mp + ' ' + (BEK_FISH_WATERS[mp].legendWhen.h0 / 60) + ':00').join(', '));

const SOURCE = {};
const claim = (list, why) => list.forEach(id => { if (!SOURCE[id]) SOURCE[id] = why; });
claim(CROPPED, 'grown'); claim(FORAGED, 'foraged'); claim(PICKED, 'picked');
claim(SWUNG, 'swung for'); claim(DESCENT, 'the descent'); claim(ANIMAL, 'an animal');
claim(FISHED, 'fished'); claim(CRAFTED, 'made'); claim(SHOPPED, 'bought');
claim(PRESERVED, 'preserved'); claim(RAKED, 'raked');
/* all of them, not just the first: three dead items should read as three
   lines here and not as one fixed three times */
const noSource = [];
BEK_LOFT.forEach(w => w.e.forEach(e => {
  if (e.item && !SOURCE[e.item]) noSource.push(w.id + ':' + e.id + ' -> ' + e.item);
}));
ok(!noSource.length, 'every item the loft asks for has a source in the valley',
   noSource.join(', ') || Object.keys(SOURCE).length + ' obtainable ids');
/* and the reverse, since SOURCE is the app's own account of what can be got:
   no recipe may need an ingredient nothing produces — the shape of the
   `planke` bug this pass found. */
const deadNeed = [];
BEK_RECIPES.craft.concat(BEK_RECIPES.cook).forEach(r =>
  Object.keys(r.need).forEach(id => { if (!SOURCE[id]) deadNeed.push(r.id + ' needs ' + id); }));
ok(!deadNeed.length, 'no recipe needs an ingredient the valley cannot produce', deadNeed.join(', ') ||
   BEK_RECIPES.craft.length + BEK_RECIPES.cook.length + ' recipes');
/* a `when` reading something nothing ever writes is a wing that never
   finishes, so the list of counters is short and stated */
const COUNTERS = ['S.deepest', 'S.fr.', 'S.festival'];
let badWhen = null;
BEK_LOFT.forEach(w => w.e.forEach(e => {
  if (!e.when) return;
  const src = e.when.toString();
  if (!COUNTERS.some(c => src.indexOf(c) >= 0)) badWhen = badWhen || (w.id + ':' + e.id);
}));
ok(!badWhen, 'every condition reads a counter the engine actually raises', badWhen ||
   LOFT_ENTRIES.filter(x => x.e.when).length + ' conditions');
/* the two recipes a wing pays out are gated on a wing that exists */
let recipeBad = null;
BEK_RECIPES.craft.concat(BEK_RECIPES.cook).forEach(r => {
  if (r.spine && !BEK_LOFT.some(w => w.id === r.spine)) recipeBad = recipeBad || r.id; });
ok(!recipeBad, 'every spine-gated recipe names a wing that exists', recipeBad ||
   BEK_RECIPES.craft.concat(BEK_RECIPES.cook).filter(r => r.spine).map(r => r.id).join(', '));
pass('obtainability', LOFT_ENTRIES.filter(x => x.e.item).length + ' items, ' +
     LOFT_ENTRIES.filter(x => x.e.when).length + ' conditions');

/* ============================================================================
   3. MILESTONES, walked
   ========================================================================== */
console.log('\n-- milestones --');
const fired = {}, order = [];
let claimedTwice = null;
let bagGained = 0, enGained = 0;
const S = S0();
LOFT_ENTRIES.forEach((x, i) => {
  S.spine.d[x.e.id] = 1;
  spineClaimable(S).forEach(m => {
    if (S.spine.m[m.id]) claimedTwice = claimedTwice || m.id;
    if (m.grant.bagCap) bagGained += m.grant.bagCap;
    if (m.grant.enMax) enGained += m.grant.enMax;
    S.spine.m[m.id] = 1;
  });
  spineEarned(S).forEach(m => {
    if (fired[m.id]) return;
    fired[m.id] = i + 1; order.push(m.id + '@' + (i + 1));
  });
});
BEK_LOFT_STAGES.forEach(st => ok(fired[st.id] === st.at,
  'stage ' + st.id + ' fires at exactly ' + st.at + ' donations', 'fired at ' + fired[st.id]));
BEK_LOFT.forEach(w => ok(fired[w.pay.id] > 0 && fired[w.pay.id] <= LOFT_TOTAL,
  'wing ' + w.id + ' pays out at the gift that finishes it', 'fired at ' + fired[w.pay.id]));
ok(!claimedTwice, 'no grant is ever handed over twice', claimedTwice || '');
const wantBag = BEK_LOFT_STAGES.reduce((a, s) => a + (s.grant.bagCap || 0), 0);
const wantEn = BEK_LOFT_STAGES.reduce((a, s) => a + (s.grant.enMax || 0), 0) +
               BEK_LOFT.reduce((a, w) => a + ((w.pay.grant && w.pay.grant.enMax) || 0), 0);
ok(bagGained === wantBag && enGained === wantEn, 'the numbers handed over are the numbers declared',
   '+' + bagGained + ' bag, +' + enGained + ' stamina');
ok(spineClaimable(S).length === 0, 'nothing is left unclaimed at the end');
ok(Object.keys(fired).length === BEK_LOFT_STAGES.length + BEK_LOFT.length,
   'every milestone is reachable', Object.keys(fired).length + ' fired');
pass('milestones', order.join('  '));

/* ============================================================================
   4. GATED, AND COMPLETABLE
   ========================================================================== */
console.log('\n-- the gate, and the end --');
ok(!spineOpen(S0({ act2Unlocked: false })), 'shut before Act II, however well Astrid knows you');
ok(!spineOpen(S0({ fr: { astrid: BEK_LOFT_FR - 1 } })), 'shut before Astrid trusts you with it');
ok(spineOpen(S0()), 'open once both');
/* the key is one number stated in two places that may not import each other
   (data.js imports talk_town.js), so the two are checked to agree */
const keyNode = (BEK_TALK.astrid.nodes || []).filter(n => n.id === 'aloft')[0];
ok(!!keyNode, 'Astrid has the node that hands over the key');
const keySrc = keyNode ? keyNode.when.toString() : '';
ok(keySrc.indexOf('act2Unlocked') >= 0 && new RegExp('S\\.fr\\.astrid\\s*>=\\s*' + BEK_LOFT_FR).test(keySrc),
   'her node gates on the same Act II and the same BEK_LOFT_FR the door does', keySrc.replace(/\s+/g, ' '));
const townDoor = BEK_MAPS.town.door;
ok(townDoor && townDoor.to === 'loftet' && townDoor.need === 'loft',
   'the square’s loft door is locked by the same gate', townDoor ? JSON.stringify(townDoor.need) : 'no door');
ok(BEK_MAPS.loftet.exits.some(e => e.to === 'town'), 'and you can get out of it again');

const blank = S0({ act2Unlocked: false, fr: { astrid: 0 } });
ok(spineRow(blank) === null && spineStage(blank) === 0 && spineProps(blank).length === 0 &&
   spineWants(blank, () => 99).length === 0,
   'nothing about the loft reads true on a save that has not opened it');
ok(!spineComplete(blank) && spineProgress(blank).have === 0, 'and nothing is donated on it');
ok(spineComplete(S) && spineProgress(S).have === LOFT_TOTAL, 'donating everything completes it',
   LOFT_TOTAL + '/' + LOFT_TOTAL);
ok(spineStage(S) === BEK_LOFT_STAGES.length, 'and the building is fully restored');
ok(spineProps(S).length === BEK_LOFT.length + BEK_LOFT_STAGES.reduce((a, s2) => a + s2.props.length, 0),
   'and every display and restoration prop is standing', spineProps(S).length + ' props');
/* each derived payout flips with its own wing and with nothing else */
const PAYOUTS = [
  ['aker', s => BEK_RECIPES.cook.some(r => r.spine === 'aker' && spineRecipeOK(s, r)), 'the pumpkin recipe'],
  ['skog', spineForageBonus, 'the extra forage round'],
  ['vann', s => BEK_RECIPES.craft.some(r => r.spine === 'vann' && spineRecipeOK(s, r)), 'the steel tackle recipe'],
  ['fjell', spineHoistEveryFloor, 'the hoist going all the way down'],
  ['fjos', s => spinePresvDaysOff(s) > 0, 'a day off every preserve'],
  ['folk', s => spineGiftCap(s) > spineGiftCap(blank), 'the doubled gift cap']
];
PAYOUTS.forEach(([id, fn, what]) => {
  const before = S0(), after = S0();
  BEK_LOFT.filter(w => w.id === id)[0].e.forEach(e => { after.spine.d[e.id] = 1; });
  ok(!fn(before) && fn(after) && wingDone(after, id), what + ' arrives with ' + id + ' and not before');
});
pass('the gate, and the end', PAYOUTS.length + ' derived payouts');

/* ---- 5. HOW LONG IT TAKES, in `spine_check_time.js` — the 300-line rule, and
   a different kind of argument from the four above: those read the tables,
   that one reads the calendar. Still one check and one command. */
howLong({ ok: ok, pass: pass, CROPPED: CROPPED, CRAFTED: CRAFTED, FISHED: FISHED });

console.log('\n' + (fails ? fails + ' of ' + checks + ' checks FAILED' : 'All ' + checks + ' spine checks pass.'));
process.exit(fails ? 1 : 0);
