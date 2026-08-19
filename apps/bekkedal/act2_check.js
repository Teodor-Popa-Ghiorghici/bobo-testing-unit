/* Bekkedal Act II check — `node apps/bekkedal/act2_check.js`
 *
 * act2Unlocked (index.js, set the moment houseBuilt is) gates four separate
 * surfaces: the house's own upgrade tier (hakonTilbygg(), index.js), the
 * pen's second tier (BEK_TALK.hakon's own offer), the quest board's two
 * higher-tier templates (BEK_QUEST_TEMPLATES' `act2` field, read by
 * quests.js's templateAvailable()), and one chat beat per NPC. Nothing on
 * screen proves any of the four actually stays locked before the milestone
 * and actually opens after it — that is what section 1 checks, reading the
 * same predicates/tables the game reads rather than a second copy of them.
 *
 * Section 2 is the balance pass: a day-by-day simulation of a player's
 * energy budget (BEK_TOOLS' own costs), reading real sell prices, crop
 * timings, and houseCost()/BEK_LOT_COST — the brief this app's CLAUDE.md
 * task asked for ("propose deltas so a first playthrough reaches houseBuilt
 * in ~8-10 in-game days with no single money loop dominating") turned into
 * an assertion instead of a one-off spreadsheet, so a future price or
 * energy-cost change gets caught here rather than only in playtesting.
 *
 * The simulation is a deliberate lower bound, not a prediction: it ignores
 * every farm/mine level-up bonus (index.js's addXp()/S.lvl), the steel axe,
 * fishing (skill-gated by the reel minigame, not modelled), and quest/board
 * income beyond the one mandatory tømmer quest. A real playthrough that uses
 * any of those reaches houseBuilt at least as fast as this does, not slower.
 */
import { BEK_ITEMS, BEK_CROPS, BEK_TOOLS, BEK_QUESTS, BEK_LOT_COST, BEK_TALK,
         BEK_QUEST_TEMPLATES, BEK_BARN_PLOT, BEK_BARN_PLOT2, BEK_BARN_SLOTS2, BEK_FARM_PLOTS,
         BEK_DECOR, BEK_MAPS } from './data.js';
import { houseCost, houseTierAvailable, barnSlots } from './progression.js';
import { refreshBoard } from './quests.js';
import { PROP } from './decor.js';

let fails = 0, checks = 0;
const ok = (cond, label, detail) => {
  checks++;
  if (cond) return true;
  fails++; console.log('FAIL ' + label + (detail ? '   ' + detail : ''));
  return false;
};
const pass = (label, detail) => { checks++; console.log('OK   ' + label.padEnd(52) + (detail || '')); };

/* ---- 1a. the house tier, read-only against houseTierAvailable() ---------- */
console.log('\n-- house tier gate --');
ok(!houseTierAvailable({ act2Unlocked: false, built: 1, houseTier: 0 }), 'locked before act2Unlocked, even with the house standing');
ok(!houseTierAvailable({ act2Unlocked: true, built: 0, houseTier: 0 }), 'locked if the house itself is not built yet');
ok(!houseTierAvailable({ act2Unlocked: true, built: 1, houseTier: 1 }), 'locked once already bought (no double sale)');
ok(houseTierAvailable({ act2Unlocked: true, built: 1, houseTier: 0 }), 'open once act2Unlocked and built, before it is bought');
pass('house tier gate');

/* ---- 1b. every chat beat that actually depends on act2Unlocked ----------- */
console.log('\n-- NPC chat gating --');
/* an otherwise end-game-ish state, so toggling only act2Unlocked isolates
   exactly the entries that gate on it rather than on some other flag they
   also happen to need */
function permissiveS(act2) {
  return {
    act2Unlocked: act2, houseBuilt: act2, built: 1, houseTier: 0,
    flag: { why: 'quiet', build: 'skog', lot: 1, barn: 1, barn2: 0, plot2: 1, plot3: 1,
            rabatt: 1, rabatt2: 1, jordbar: 1, rabarbra: 1, boat: 1,
            mine: 'stein', dairy: 'melk', fell: 'jakt', fisk: 'ro', sea: 'hav', marit: 'ro' },
    fr: { astrid: 5, hakon: 5, ingrid: 5, olav: 5, marit: 5, sigrid: 5, gunnar: 5, lars: 5 },
    q: { potet: 'done', sopp: 'done', blomst: 'done', tommer: 'done', multe: 'done', boat: 'done', jern: 'done' },
    disc: { farm: 1, town: 1, lake: 1, forest: 1, enga: 1, setra: 1, vidda: 1, gruva: 1, fjord: 1 },
    festival: null, bagTier: 2, kanneLv: 1, pickLv: 2, axeLv: 2,
    tools: { spade: 1, kanne: 1, oks: 1, stang: 1, hakke: 1 },
    animals: [{ id: 'a1', kind: 'goat' }]
  };
}
const sOff = permissiveS(false), sOn = permissiveS(true);
const STORY_NPCS = ['astrid', 'hakon', 'ingrid', 'olav', 'marit', 'sigrid', 'gunnar', 'lars'];
let anyGateThrew = null;
STORY_NPCS.forEach(id => {
  const chat = (BEK_TALK[id] && BEK_TALK[id].chat) || [];
  let unlockedByAct2 = 0;
  chat.forEach(c => {
    if (!c.if) return;
    let before, after;
    try { before = !!c.if(sOff); after = !!c.if(sOn); }
    catch (e) { anyGateThrew = anyGateThrew || { id, e }; return; }
    if (!before && after) unlockedByAct2++;
  });
  const wantMin = id === 'hakon' ? 2 : 1;     /* hakon: the barn2 offer, and the completion line */
  ok(unlockedByAct2 >= wantMin, id + ': at least ' + wantMin + ' chat entr' + (wantMin > 1 ? 'ies' : 'y') + ' newly open once act2Unlocked',
     unlockedByAct2 + ' found');
});
ok(!anyGateThrew, 'no chat gate throws evaluating a permissive state', anyGateThrew ? anyGateThrew.id + ': ' + anyGateThrew.e.message : '');
pass('NPC chat gating', STORY_NPCS.length + ' NPCs checked');

/* ---- 1c. the pen's second tier -------------------------------------------- */
console.log('\n-- pen tier 2 --');
ok(barnSlots({ flag: {} }).length === 4, 'tier 1 alone is 4 slots');
ok(barnSlots({ flag: { barn2: 1 } }).length === 8, 'tier 1 + tier 2 is 8 slots');
BEK_BARN_SLOTS2.forEach(sl => {
  ok(sl.x >= BEK_BARN_PLOT2.x0 && sl.x <= BEK_BARN_PLOT2.x1 && sl.y >= BEK_BARN_PLOT2.y0 && sl.y <= BEK_BARN_PLOT2.y1,
     'slot (' + sl.x + ',' + sl.y + ') sits inside BEK_BARN_PLOT2');
});
function overlaps(a, b) { return a.x0 <= b.x1 && a.x1 >= b.x0 && a.y0 <= b.y1 && a.y1 >= b.y0; }
const REGIONS = [BEK_BARN_PLOT, BEK_BARN_PLOT2, ...BEK_FARM_PLOTS];
let regionClash = null;
for (let i = 0; i < REGIONS.length && !regionClash; i++)
  for (let j = i + 1; j < REGIONS.length; j++)
    if (overlaps(REGIONS[i], REGIONS[j])) { regionClash = [REGIONS[i], REGIONS[j]]; break; }
ok(!regionClash, 'no two farm-map overlay regions (pens/plots) overlap', regionClash ? JSON.stringify(regionClash) : '');
pass('pen tier 2', BEK_BARN_SLOTS2.length + ' new slots');

/* ---- 1d. the house's own decor tier --------------------------------------- */
console.log('\n-- house tier decor --');
const baseDecor = BEK_DECOR.lakehouse || [], t2Decor = BEK_DECOR.lakehouse_t2 || [];
const baseKeys = new Set(baseDecor.map(d => d.x + ',' + d.y));
let decorClash = null, decorOOB = null, decorBadKind = null;
const room = BEK_MAPS.lakehouse.rows;
t2Decor.forEach(d => {
  if (baseKeys.has(d.x + ',' + d.y)) decorClash = decorClash || d;
  if (d.y < 0 || d.y >= room.length || d.x < 0 || d.x >= room[d.y].length || room[d.y][d.x] === ' ') decorOOB = decorOOB || d;
  if (!PROP[d.kind]) decorBadKind = decorBadKind || d;
});
ok(!decorClash, 'lakehouse_t2 never reuses a lakehouse coordinate', decorClash ? JSON.stringify(decorClash) : '');
ok(!decorOOB, 'every lakehouse_t2 prop sits on a real room tile', decorOOB ? JSON.stringify(decorOOB) : '');
ok(!decorBadKind, 'every lakehouse_t2 kind exists in decor.js', decorBadKind ? JSON.stringify(decorBadKind) : '');
pass('house tier decor', t2Decor.length + ' new props');

/* ---- 1e. the board's two higher-tier templates ---------------------------- */
console.log('\n-- act2 quest templates --');
const ACT2_TEMPLATES = BEK_QUEST_TEMPLATES.filter(t => t.act2).map(t => t.id);
ok(ACT2_TEMPLATES.length >= 1, 'at least one act2 template exists', ACT2_TEMPLATES.join(', '));
function rollMany(act2, trials) {
  const S = { tools: { spade: 1, kanne: 1, oks: 1, stang: 1, hakke: 1 }, animals: [{ id: 'a1', kind: 'goat' }],
              fr: { astrid: 3, hakon: 3, ingrid: 3, olav: 3, marit: 3, sigrid: 3, gunnar: 3, lars: 3 },
              act2Unlocked: act2 };
  const seen = new Set();
  for (let t = 0; t < trials; t++) refreshBoard(S, 1000 + t).forEach(q => seen.add(q.tpl));
  return seen;
}
const preSeen = rollMany(false, 400);
const preLeaked = ACT2_TEMPLATES.filter(id => preSeen.has(id));
ok(preLeaked.length === 0, 'no act2 template ever rolls before act2Unlocked', '400 rolls, saw: ' + [...preSeen].join(','));
const postSeen = rollMany(true, 400);
const postMissing = ACT2_TEMPLATES.filter(id => !postSeen.has(id));
ok(postMissing.length === 0, 'every act2 template rolls at least once once act2Unlocked', '400 rolls');
pass('act2 quest templates', '400+400 rolls');

/* ============================================================================
   2. THE BALANCE PASS
   ---------------------------------------------------------------------------
   Hand-authored inputs that are not exported constants (fresh()'s starting
   kr/enMax in index.js, and rock.js's own documented ore-mix weights — see
   apps/bekkedal/CLAUDE.md "The die is rolled once per square"). Kept in sync
   by citation rather than by import, the same way quest_check.js's own GATE
   table is: these describe what the engine does, not a formula it exposes.
   ========================================================================== */
const STARTING_KR = 500;                        /* fresh(), index.js */
const EN_MAX = 120;                              /* fresh(), index.js — never upgraded */
const HAKKE_COST = 400;                          /* BEK_TALK.lars.nodes[1].buy.kr, data.js */
/* normal-vein ore mix, 55/30/15 jern/kobber/solv (rock.js's oreKind(), cited
   in this app's own CLAUDE.md) */
const AVG_ORE = 0.55 * BEK_ITEMS.jern.sell + 0.30 * BEK_ITEMS.kobber.sell + 0.15 * BEK_ITEMS.solv.sell;
const toolE = id => BEK_TOOLS.filter(t => t.id === id)[0].e;
const OKS_E = toolE('oks'), HAKKE_E = toolE('hakke'), SPADE_E = toolE('spade'), KANNE_E = toolE('kanne');

/* one early, always-available crop as the farming loop's representative:
   kål (BEK_CROPS.kal), the best kr/energy of the four crops available with
   no friendship or seasonal gate to clear first */
const CROP = BEK_CROPS.kal, CROP_ITEM = BEK_ITEMS[CROP.out];
const TOMMER_QUEST = BEK_QUESTS.filter(q => q.id === 'tommer')[0];

/* policy: energy-share weights per activity, remainder idle. Mining and
   felling pay off the same day; farming pays off CROP.days later — plots
   already growing are watered before any new energy is spent, so the
   simulation cannot "skip" the wait by throwing more energy at it. */
function simulate(policy, maxDays) {
  let kr = STARTING_KR, tommer = 0, stein = 0, hasHakke = false, tommerDelivered = false, lotBought = false;
  let plots = [];
  for (let day = 1; day <= maxDays; day++) {
    let energy = EN_MAX;
    if (!hasHakke && kr >= HAKKE_COST) { kr -= HAKKE_COST; hasHakke = true; }

    /* water every growing plot first (a plot already in the ground is not
       optional upkeep the policy can choose to skip) */
    const Wc = Math.max(1, KANNE_E);
    plots.forEach(p => { if (energy >= Wc) { energy -= Wc; p.age++; } });
    /* harvest anything ready */
    const ready = plots.filter(p => p.age >= CROP.days);
    ready.forEach(p => { if (energy >= 1) { energy -= 1; kr += CROP_ITEM.sell; p.done = true; } });
    plots = plots.filter(p => !p.done);

    const mineE = Math.floor(energy * policy.mine);
    const fellE = Math.floor(energy * policy.fell);
    const farmE = Math.max(0, energy - mineE - fellE);

    if (hasHakke) {
      const swings = Math.floor(mineE / HAKKE_E);
      kr += swings * AVG_ORE; stein += swings;
    }
    tommer += Math.floor(fellE / OKS_E);

    const Tc = Math.max(1, SPADE_E);
    const newPlots = Math.floor(farmE / (Tc + 1));
    for (let i = 0; i < newPlots; i++) plots.push({ age: 0, done: false });

    /* the mandatory gate: the lot cannot be bought before this fixed quest
       is turned in, and turning it in spends the tømmer it asks for */
    if (!tommerDelivered && tommer >= TOMMER_QUEST.need.tommer) {
      tommer -= TOMMER_QUEST.need.tommer; kr += TOMMER_QUEST.kr; tommerDelivered = true;
    }
    if (tommerDelivered && !lotBought && kr >= BEK_LOT_COST) { kr -= BEK_LOT_COST; lotBought = true; }

    if (lotBought) {
      const c = houseCost({ flag: { build: 'skog' } });
      if (kr >= c.kr && tommer >= c.tommer && stein >= c.stein) return day;
    }
  }
  return null;
}

console.log('\n-- balance pass --');
const MIXED = { mine: 0.40, fell: 0.35 };                 /* farm gets the energy remainder */
const MINING_HEAVY = { mine: 0.70, fell: 0.30 };
const HORIZON = 60;
const mixedDay = simulate(MIXED, HORIZON);
const heavyDay = simulate(MINING_HEAVY, HORIZON);
ok(mixedDay != null, 'a mixed policy reaches houseBuilt within ' + HORIZON + ' simulated days', 'day ' + mixedDay);
ok(mixedDay != null && mixedDay >= 6 && mixedDay <= 12,
   'a mixed policy lands near the ~8-10 day target',
   'day ' + mixedDay + ' (target 6-12)');
ok(heavyDay != null && mixedDay != null && heavyDay >= mixedDay * 0.7,
   'a mining-heavy policy is not dramatically faster than a mixed one (no single loop dominating)',
   'mixed day ' + mixedDay + ', mining-heavy day ' + heavyDay);
pass('balance pass', 'mixed=' + mixedDay + ' mining-heavy=' + heavyDay + ' (avg ore ' + Math.round(AVG_ORE) + ' kr, hakke ' + HAKKE_E + ' energy/swing)');

console.log('\n' + (fails ? fails + ' of ' + checks + ' checks FAILED' : 'All ' + checks + ' act2 checks pass.'));
process.exit(fails ? 1 : 0);
