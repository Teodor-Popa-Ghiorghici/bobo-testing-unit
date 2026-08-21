#!/usr/bin/env node
/* Static content lint for apps/bekkedal/data.js — no engine, no DOM, just
   the exported tables. See apps/bekkedal/CLAUDE.md and
   .claude/rules/content.md for the conventions this checks.

   Checks:
   1. every quest requirement (need / grant.item) references a real item id
   2. every shop entry references a real item id
   3. every dialogue node's friendship gate (`when: S => S.fr.x >= N`) has N
      inside the 0-10 range documented in .claude/rules/content.md
   4. every map a door/exit/boat travels to exists in BEK_MAPS
   5. every repeatable quest template (BEK_QUEST_TEMPLATES) references real,
      non-seed item ids and a sane quantity range
   6. no spoken line repeats the speaker's name — the dialogue panel prints it
      on the plate under their portrait, and it used to be printed a second
      time inside the line itself ("ASTRID" then "ASTRID: Good morning.")
   7. every mood a line asks for is a face portrait.js can actually draw, and
      both opt-in faces are reached by some line

   Run: node scripts/lint-content.mjs
*/

import { pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const data = await import(pathToFileURL(path.join(ROOT, 'apps/bekkedal/data.js')));
const { BEK_ITEMS, BEK_MAPS, BEK_TALK, BEK_NPCS, BEK_QUESTS, BEK_QUEST_TEMPLATES } = data;
const { PORT_MOODS } = await import(pathToFileURL(path.join(ROOT, 'apps/bekkedal/portrait.js')));

const failures = [];
function fail(check, id, where) { failures.push({ check, id, where }); }

/* ---- 1: quest requirements reference real item ids ------------------------ */
function checkQuestItems() {
  BEK_QUESTS.forEach(q => {
    Object.keys(q.need || {}).forEach(id => {
      if (!BEK_ITEMS[id]) fail('quest requirement', id, 'BEK_QUESTS[' + q.id + '].need');
    });
    if (q.grant && q.grant.item) {
      Object.keys(q.grant.item).forEach(id => {
        if (!BEK_ITEMS[id]) fail('quest requirement', id, 'BEK_QUESTS[' + q.id + '].grant.item');
      });
    }
  });
}

/* ---- 2: shop entries reference real item ids ------------------------------ */
function checkShopItems() {
  Object.keys(BEK_TALK).forEach(npcId => {
    const book = BEK_TALK[npcId];
    if (!book.shop) return;
    book.shop.forEach(id => {
      if (!BEK_ITEMS[id]) fail('shop entry', id, 'BEK_TALK.' + npcId + '.shop');
    });
  });
}

/* ---- 3: dialogue friendship gates are within 0-10 -------------------------- */
function checkFriendshipGates() {
  const GATE_RE = /S\.fr\.(\w+)\s*>=\s*(\d+)/g;
  Object.keys(BEK_TALK).forEach(npcId => {
    const book = BEK_TALK[npcId];
    (book.nodes || []).forEach(node => {
      if (typeof node.when !== 'function') return;
      const src = node.when.toString();
      let m;
      GATE_RE.lastIndex = 0;
      while ((m = GATE_RE.exec(src))) {
        const gateNpc = m[1], n = parseInt(m[2], 10);
        if (n < 0 || n > 10) {
          fail('friendship gate', gateNpc + '>=' + n, 'BEK_TALK.' + npcId + '.nodes[' + node.id + '].when');
        }
      }
    });
  });
}

/* ---- 4: every map a door/exit/boat travels to exists ---------------------- */
function checkFastTravelMaps() {
  Object.keys(BEK_MAPS).forEach(mapId => {
    const m = BEK_MAPS[mapId];
    (m.exits || []).forEach(e => {
      if (!BEK_MAPS[e.to]) fail('fast travel map', e.to, 'BEK_MAPS.' + mapId + '.exits');
    });
    if (m.door && !BEK_MAPS[m.door.to]) fail('fast travel map', m.door.to, 'BEK_MAPS.' + mapId + '.door');
    if (m.boat && !BEK_MAPS[m.boat.to]) fail('fast travel map', m.boat.to, 'BEK_MAPS.' + mapId + '.boat');
  });
}

/* ---- 5: quest template items are real, non-seed ids, in a sane range ----- */
function checkQuestTemplateItems() {
  BEK_QUEST_TEMPLATES.forEach(tpl => {
    tpl.items.forEach(id => {
      if (!BEK_ITEMS[id]) fail('quest template item', id, 'BEK_QUEST_TEMPLATES.' + tpl.id + '.items');
      else if (BEK_ITEMS[id].seed) fail('quest template item', id, 'BEK_QUEST_TEMPLATES.' + tpl.id + '.items (a seed, not a holdable good)');
    });
    const [lo, hi] = tpl.qty;
    if (!(lo >= 1 && hi >= lo)) fail('quest template item', tpl.qty.join('..'), 'BEK_QUEST_TEMPLATES.' + tpl.id + '.qty');
  });
}

/* ---- 6/7: the speaker's name, and the face they wear ---------------------
   Both walk BEK_TALK once. A spoken string may still mention somebody by
   name; it may not be *addressed* by one, because the plate already says who
   is talking. `neutral` is the resting face and is what an entry with no
   mood gets, so it is never written down — what has to be reached is the two
   faces that are opt-in. */
function checkSpeakersAndMoods() {
  const names = BEK_NPCS.map(n => n.n).filter(Boolean);
  const both = l => l == null ? [] : typeof l === 'string' ? [l] : [l.no, l.en].filter(Boolean);
  const moods = [];
  const walk = (o, where) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return o.forEach(x => walk(x, where));
    if (o.mood) moods.push(o.mood);
    if (o.m) moods.push(o.m);
    /* Only the arrays an NPC actually *speaks* out of. An option's own `t` is
       the player's answer and is a {no,en} rather than an array, so it falls
       out of this on its own — which is right: nobody's plate names them. */
    for (const key of ['lines', 't', 'ok', 'no', 'reply']) {
      if (!Array.isArray(o[key])) continue;
      o[key].forEach(l => both(l).forEach(str => {
        if (names.some(n => str.startsWith(n + ': ')))
          fail('speaker prefix', JSON.stringify(str.slice(0, 46)), where + '.' + key);
      }));
    }
    Object.entries(o).forEach(([k, v]) => walk(v, where + '.' + k));
  };
  Object.entries(BEK_TALK).forEach(([id, book]) => walk(book, 'BEK_TALK.' + id));
  [...new Set(moods)].forEach(m => {
    if (!PORT_MOODS.includes(m)) fail('dialogue mood', m, 'not one of ' + PORT_MOODS.join('/'));
  });
  PORT_MOODS.filter(m => m !== 'neutral').forEach(m => {
    if (!moods.includes(m)) fail('dialogue mood', m, 'no line ever selects this face');
  });
}

/* ---- 8: gift preferences reference real, holdable item ids --------------- */
function checkGiftItems() {
  BEK_NPCS.forEach(npc => {
    if (!npc.gift) return;
    ['loved', 'liked', 'disliked'].forEach(tier => {
      (npc.gift[tier] || []).forEach(id => {
        if (!BEK_ITEMS[id]) fail('gift preference', id, 'BEK_NPCS.' + npc.id + '.gift.' + tier);
        else if (BEK_ITEMS[id].animal) fail('gift preference', id, 'BEK_NPCS.' + npc.id + '.gift.' + tier + ' (an animal, never held in the bag)');
      });
    });
  });
}

checkQuestItems();
checkShopItems();
checkFriendshipGates();
checkFastTravelMaps();
checkQuestTemplateItems();
checkSpeakersAndMoods();
checkGiftItems();

const byCheck = failures.reduce((acc, f) => { (acc[f.check] = acc[f.check] || []).push(f); return acc; }, {});
const ALL_CHECKS = ['quest requirement', 'shop entry', 'friendship gate', 'fast travel map', 'quest template item',
                    'speaker prefix', 'dialogue mood', 'gift preference'];
ALL_CHECKS.forEach(check => {
  const fs = byCheck[check] || [];
  if (!fs.length) { console.log('PASS - ' + check); return; }
  fs.forEach(f => console.log('FAIL - ' + check + ': ' + f.id + ' (' + f.where + ')'));
});

process.exit(failures.length ? 1 : 0);
