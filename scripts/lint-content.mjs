#!/usr/bin/env node
/* Static content lint for apps/bekkedal/data.js — no engine, no DOM, just
   the exported tables. See apps/bekkedal/CLAUDE.md and
   .claude/rules/content.md for the conventions this checks.

   Checks:
   1. every quest requirement (need / grant.item) references a real item id
   2. every shop entry references a real item id
   3. every dialogue node's friendship gate (`when: S => S.fr.x >= N`) has N
      inside the 0-5 range documented in .claude/rules/content.md
   4. every map a door/exit/boat travels to exists in BEK_MAPS

   Run: node scripts/lint-content.mjs
*/

import { pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const data = await import(pathToFileURL(path.join(ROOT, 'apps/bekkedal/data.js')));
const { BEK_ITEMS, BEK_MAPS, BEK_TALK, BEK_QUESTS } = data;

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

/* ---- 3: dialogue friendship gates are within 0-5 -------------------------- */
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
        if (n < 0 || n > 5) {
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

checkQuestItems();
checkShopItems();
checkFriendshipGates();
checkFastTravelMaps();

const byCheck = failures.reduce((acc, f) => { (acc[f.check] = acc[f.check] || []).push(f); return acc; }, {});
const ALL_CHECKS = ['quest requirement', 'shop entry', 'friendship gate', 'fast travel map'];
ALL_CHECKS.forEach(check => {
  const fs = byCheck[check] || [];
  if (!fs.length) { console.log('PASS - ' + check); return; }
  fs.forEach(f => console.log('FAIL - ' + check + ': ' + f.id + ' (' + f.where + ')'));
});

process.exit(failures.length ? 1 : 0);
