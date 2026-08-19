/* Bekkedal — the repeatable quest board, layered on top of BEK_QUESTS.
 *
 * BEK_QUESTS (data.js) is the fixed, one-shot list gated through BEK_TALK per
 * .claude/rules/content.md. This module never touches it — it only rolls a
 * second, renewable set of instances from BEK_QUEST_TEMPLATES (data.js) into
 * S.rq, on the same `who`-must-resolve-through-BEK_TALK contract fixed quests
 * use.
 *
 * Pure functions of (S, day) throughout, same convention as noise.js/light.js:
 * index.js calls refreshBoard() at the weekly boundary and owns the result on
 * S.rq; talkTo() (index.js) calls activeRepeatable() to find what a given NPC
 * can turn in, the same way it already reads BEK_QUESTS for the fixed list;
 * menus.js calls boardRows()/questTitle()/questDetail() to draw it.
 */
import { BEK_ITEMS, BEK_NPCS, BEK_TALK, BEK_QUESTS, BEK_QUEST_TEMPLATES,
         BEK_QUEST_BOARD_MIN, BEK_QUEST_BOARD_MAX, BEK_QUEST_REFRESH_DAYS, UI } from './data.js';

/* every NPC a quest can actually be turned in to — the id-naming rule in
   .claude/rules/content.md, applied at the pool level rather than per roll */
const TALKERS = BEK_NPCS.filter(n => BEK_TALK[n.id]).map(n => n.id);

function templateAvailable(tpl, S) {
  if (tpl.tool && !S.tools[tpl.tool]) return false;
  if (tpl.animal && (!S.animals || !S.animals.length)) return false;
  return true;
}

/* a marked-up alternative to selling on the open market, never a discount —
   scales with how much was asked for and with the requester's own opinion
   of you, same 0..5 S.fr counter every NPC already carries */
function questReward(item, qty, fr) {
  return Math.round(BEK_ITEMS[item].sell * qty * (1.2 + 0.15 * fr));
}

/* Rolls a fresh BEK_QUEST_BOARD_MIN..MAX batch and returns it — index.js
   assigns the result to S.rq wholesale, it does not merge with the old one.
   Templates gated behind a tool/animal the player does not have yet simply
   are not in the pool; the four ungated templates (crops/forage/blomst/wood)
   are always in it, so the pool is never empty and neither is the board. */
export function refreshBoard(S, day, rand) {
  rand = rand || Math.random;
  const pool = BEK_QUEST_TEMPLATES.filter(tpl => templateAvailable(tpl, S));
  if (!pool.length) return [];
  const count = BEK_QUEST_BOARD_MIN + Math.floor(rand() * (BEK_QUEST_BOARD_MAX - BEK_QUEST_BOARD_MIN + 1));
  const out = [], used = new Set();
  let guard = 0;
  while (out.length < count && used.size < TALKERS.length && guard++ < 50) {
    const tpl = pool[Math.floor(rand() * pool.length)];
    const item = tpl.items[Math.floor(rand() * tpl.items.length)];
    const avail = TALKERS.filter(id => !used.has(id));
    const who = avail[Math.floor(rand() * avail.length)];
    used.add(who);
    const qty = tpl.qty[0] + Math.floor(rand() * (tpl.qty[1] - tpl.qty[0] + 1));
    const fr = (S.fr && S.fr[who]) || 0;
    out.push({ id: 'rq' + day + '_' + out.length, tpl: tpl.id, item, qty, who,
               kr: questReward(item, qty, fr), expireDay: day + BEK_QUEST_REFRESH_DAYS, state: 'active' });
  }
  return out;
}

/* true on the day a fresh board should be rolled — day 1 (fresh()'s own
   seed) and every BEK_QUEST_REFRESH_DAYS after it, a fixed in-game weekday */
export function isRefreshDay(day) {
  return day % BEK_QUEST_REFRESH_DAYS === 1;
}

export function questTitle(q) {
  const item = BEK_ITEMS[q.item], npc = BEK_NPCS.filter(n => n.id === q.who)[0];
  return { no: q.qty + 'x ' + item.name.no + ' — ' + npc.n, en: q.qty + 'x ' + item.name.en + ' — ' + npc.n };
}

export function questDetail(q) {
  const item = BEK_ITEMS[q.item], npc = BEK_NPCS.filter(n => n.id === q.who)[0];
  return {
    no: 'Bring ' + npc.n + ' ' + q.qty + ' ' + item.name.no + '. Utløper dag ' + q.expireDay + '.',
    en: 'Bring ' + npc.n + ' ' + q.qty + ' ' + item.name.en + '. Expires day ' + q.expireDay + '.'
  };
}

/* the board's own row order: fixed quests keep first claim on the slots,
   repeatable ones fill in after — menus.js appends the house row itself, the
   one entry here that is not a `who`-having quest at all */
export function boardRows(S) {
  const rows = BEK_QUESTS.filter(q => S.q[q.id]).map(q => {
    const done = S.q[q.id] === 'done';
    return { t: q.t, d: q.d, st: done ? UI.done : UI.active, done };
  });
  (S.rq || []).forEach(q => {
    const done = q.state === 'done';
    rows.push({ t: questTitle(q), d: questDetail(q), st: done ? UI.done : UI.active, done });
  });
  return rows;
}

/* the one active repeatable quest npcId can settle right now, if any — the
   same shape talkTo()'s fixed-quest turn-in already reads BEK_QUESTS for */
export function activeRepeatable(S, npcId) {
  return (S.rq || []).filter(q => q.who === npcId && q.state === 'active' &&
    (S.bag[q.item] || 0) >= q.qty)[0] || null;
}
