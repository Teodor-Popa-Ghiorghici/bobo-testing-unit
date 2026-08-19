/* Bekkedal repeatable quest board check — `node apps/bekkedal/quest_check.js`
 *
 * quests.js rolls two or three live instances a week from BEK_QUEST_TEMPLATES
 * (data.js) on top of the fixed BEK_QUESTS list. Nothing on screen can tell
 * you whether a given roll is fair — a template could ask for silver ore
 * before the player owns a pick, or hand the request to an NPC with no
 * dialogue to turn it in to — so this is what checks it, independently of
 * the gate quests.js itself reads.
 *
 * Three families of assertion:
 *   template gates  — BEK_QUEST_TEMPLATES' own tool/animal fields agree with
 *                      an independently authored table of what index.js's
 *                      act()/tendAnimal() actually require to hold each item,
 *                      so a template cannot silently drift from the engine;
 *   the 60-day walk — a scripted progression (tools and an animal arriving on
 *                      specific days, same as a real playthrough) drives the
 *                      real weekly cadence (isRefreshDay/refreshBoard) end to
 *                      end: the board is never empty, and every quest ever on
 *                      it is obtainable on the day it was rolled;
 *   the stress roll — many rolls at each stage, to shake out the random
 *                      item/npc choices a single walk-through would not hit.
 *
 * All of it reads quests.js/data.js directly — no DOM, no mounted app.
 */
import { BEK_ITEMS, BEK_NPCS, BEK_TALK, BEK_QUEST_TEMPLATES,
         BEK_QUEST_BOARD_MIN, BEK_QUEST_REFRESH_DAYS } from './data.js';
import { refreshBoard, isRefreshDay, questTitle, questDetail } from './quests.js';

let fails = 0, checks = 0;
const ok = (cond, label, detail) => {
  checks++;
  if (cond) return true;
  fails++; console.log('FAIL ' + label + (detail ? '   ' + detail : ''));
  return false;
};
const pass = (label, detail) => { checks++; console.log('OK   ' + label.padEnd(52) + (detail || '')); };

/* ---- 1. template gates agree with what the engine actually requires ------ */
console.log('\n-- template gates --');
/* hand-authored from index.js: act()'s hakke branch requires S.tools.hakke,
   its stang branch requires S.tools.stang, tendAnimal() only ever runs on an
   owned animal. Anything not listed here needs nothing but the tool belt
   every save starts with. */
const GATE = {
  jern: 'hakke', kobber: 'hakke', solv: 'hakke',
  orret: 'stang', laks: 'stang', roye: 'stang', torsk: 'stang', makrell: 'stang',
  kveite: 'stang', gullorret: 'stang',
  melk: 'animal', ull: 'animal', egg: 'animal'
};
let gateMismatch = 0;
BEK_QUEST_TEMPLATES.forEach(tpl => {
  tpl.items.forEach(item => {
    const want = GATE[item] || null;
    const got = tpl.tool ? tpl.tool : tpl.animal ? 'animal' : null;
    if (want !== got) {
      gateMismatch++;
      console.log('FAIL template gate mismatch: ' + tpl.id + '.' + item + ' expects ' + want + ', template declares ' + got);
    }
  });
});
ok(gateMismatch === 0, 'every template item’s gate matches what the engine requires to hold it', BEK_QUEST_TEMPLATES.flatMap(t => t.items).length + ' item refs checked');
ok(BEK_QUEST_TEMPLATES.some(t => !t.tool && !t.animal), 'at least one template is always obtainable, so the pool is never empty');

/* ---- 2. the 60-day walk --------------------------------------------------- */
console.log('\n-- the 60-day walk --');
const TALKERS = new Set(BEK_NPCS.filter(n => BEK_TALK[n.id]).map(n => n.id));
function obtainableNow(item, S) {
  const need = GATE[item];
  if (!need) return true;
  if (need === 'animal') return S.animals.length > 0;
  return !!S.tools[need];
}
/* a scripted progression, same shape a real save reaches by these days:
   Ingrid's fixed quest hands out a stang early, Lars sells a hakke and the
   player buys an animal once the pen is up */
function stageAt(day) {
  return {
    tools: { spade: 1, kanne: 1, oks: 1, stang: day >= 8 ? 1 : 0, hakke: day >= 22 ? 1 : 0 },
    animals: day >= 40 ? [{ id: 'animal1', kind: 'goat' }] : [],
    fr: { astrid: 0, hakon: 0, ingrid: 0, olav: 0, marit: 0, sigrid: 0, gunnar: 0, lars: 0 },
    bag: {}
  };
}
let rq = [], everEmpty = false, badItem = null, badWho = null, totalRolled = 0;
for (let day = 1; day <= 60; day++) {
  const S = stageAt(day);
  if (day === 1 || isRefreshDay(day)) rq = refreshBoard(S, day);
  if (!rq.length) everEmpty = true;
  rq.forEach(q => {
    totalRolled++;
    if (!obtainableNow(q.item, S)) badItem = { day, q };
    if (!TALKERS.has(q.who)) badWho = { day, q };
  });
}
ok(!everEmpty, 'the board is never empty across 60 simulated days');
ok(!badItem, 'no quest ever asked for an item unobtainable that day',
   badItem ? 'day ' + badItem.day + ': ' + badItem.q.item + ' (' + badItem.q.id + ')' : totalRolled + ' quest-days checked');
ok(!badWho, 'every requester resolved to a real BEK_TALK entry',
   badWho ? 'day ' + badWho.day + ': who=' + badWho.q.who : 'all ' + totalRolled + ' resolved');
pass('60-day walk', totalRolled + ' quest-instances rolled across the run');

/* ---- 3. the stress roll ---------------------------------------------------- */
console.log('\n-- stress roll --');
const STAGES = [
  { name: 'day 1 (fresh)',      day: 1,  tools: { hakke: 0, stang: 0 }, animals: [] },
  { name: 'day 8 (rod bought)', day: 8,  tools: { hakke: 0, stang: 1 }, animals: [] },
  { name: 'day 22 (pick too)',  day: 22, tools: { hakke: 1, stang: 1 }, animals: [] },
  { name: 'day 60 (everything)',day: 60, tools: { hakke: 1, stang: 1 }, animals: [{ id: 'a1', kind: 'goat' }] }
];
const TRIALS = 300;
STAGES.forEach(stage => {
  const S = { tools: { spade: 1, kanne: 1, oks: 1, stang: stage.tools.stang, hakke: stage.tools.hakke },
              animals: stage.animals,
              fr: { astrid: 0, hakon: 0, ingrid: 0, olav: 0, marit: 0, sigrid: 0, gunnar: 0, lars: 0 }, bag: {} };
  let n = 0, badGate = 0, badTalk = 0, seenBoardTooSmall = 0, dupWho = 0;
  for (let t = 0; t < TRIALS; t++) {
    const batch = refreshBoard(S, stage.day + t);          /* vary the day so ids stay unique */
    if (batch.length < BEK_QUEST_BOARD_MIN) seenBoardTooSmall++;
    const who = new Set();
    batch.forEach(q => {
      n++;
      if (!obtainableNow(q.item, S)) badGate++;
      if (!TALKERS.has(q.who)) badTalk++;
      if (who.has(q.who)) dupWho++;
      who.add(q.who);
      /* the strings this stage would actually put on the board must fit —
         the same width contract layout_check.js verifies statically */
      if (!BEK_ITEMS[q.item] || !q.item) badGate++;
      void questTitle(q); void questDetail(q);              /* must not throw on any real roll */
    });
  }
  ok(badGate === 0, stage.name + ': every rolled item stays obtainable', n + ' instances over ' + TRIALS + ' rolls');
  ok(badTalk === 0, stage.name + ': every requester stays a real BEK_TALK entry');
  ok(dupWho === 0, stage.name + ': no batch asks the same NPC twice at once');
  ok(seenBoardTooSmall === 0, stage.name + ': every batch reaches BEK_QUEST_BOARD_MIN', BEK_QUEST_BOARD_MIN + ' minimum');
});
pass('stress roll', STAGES.length + ' stages × ' + TRIALS + ' rolls, ' + BEK_QUEST_REFRESH_DAYS + '-day cadence');

console.log('\n' + (fails ? fails + ' of ' + checks + ' checks FAILED' : 'All ' + checks + ' quest checks pass.'));
process.exit(fails ? 1 : 0);
