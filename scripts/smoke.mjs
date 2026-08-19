#!/usr/bin/env node
/* Headless smoke test for apps/bekkedal. No rendering: the canvas 2D context
   is stubbed with no-op draw calls so the app's real mount()/frame() path
   runs under plain Node. See apps/bekkedal/CLAUDE.md for the save shape.

   Cases:
   1. fresh save, simulate 30 in-game days by driving the real frame() loop
      (captured off the stubbed requestAnimationFrame), assert no exceptions
   2. serialize -> deserialize -> serialize, assert byte-identical
   3. a hand-written previous-version save run through the real load/heal
      path, assert every current field survives and nothing is dropped
   4. the ending path is a permanent milestone, not a reset (S = fresh() is
      never called) — see apps/bekkedal/CLAUDE.md's house-completion note
   5. a fresh save, idle (no input at all) across and beyond a full simulated
      year — houseBuilt/act2Unlocked never flip true on their own, since
      nothing the player didn't do should ever unlock Act II
   6. a save seeded with houseBuilt/act2Unlocked/houseTier already true, run
      the same way — none of it drifts back off even a year and change
      later, and kr/day/bag are exactly what an idle run should leave them
      (day advances, nothing else does), which is the operational meaning of
      "never resets"

   Run: node scripts/smoke.mjs
*/

import { pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

/* ---- a just-enough browser, built once, module-scoped singletons kernel
   code expects (window.CRT etc.) survive across the mounts below ---------- */
function makeLocalStorage() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: k => { m.delete(k); },
    clear: () => m.clear()
  };
}

function makeCtx2D() {
  const noop = () => {};
  return {
    fillStyle: '', font: '', globalAlpha: 1, lineWidth: 1, strokeStyle: '',
    fillRect: noop, fillText: noop, strokeRect: noop, clearRect: noop,
    drawImage: noop,
    beginPath: noop, moveTo: noop, lineTo: noop, closePath: noop, stroke: noop,
    rect: noop, clip: noop,
    fill: noop, arc: noop, save: noop, restore: noop, translate: noop,
    rotate: noop, scale: noop, setTransform: noop,
    createPattern: () => ({}),
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    measureText: () => ({ width: 0 })
  };
}

let createdEls = [];
class FakeEl {
  constructor(tag) {
    this.tagName = String(tag || 'div').toLowerCase();
    this.children = [];
    this.style = {};
    this.classList = { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false };
    this._listeners = Object.create(null);
    this.width = 0; this.height = 0;
    this.tabIndex = 0;
    this.textContent = '';
    createdEls.push(this);
  }
  appendChild(c) { this.children.push(c); c.parentNode = this; return c; }
  removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; }
  addEventListener(ev, fn) { (this._listeners[ev] = this._listeners[ev] || []).push(fn); }
  removeEventListener() {}
  setAttribute() {}
  focus() {}
  contains() { return false; }
  getContext(type) { return type === '2d' ? makeCtx2D() : null; }
  click(payload) { (this._listeners.click || []).forEach(fn => fn(payload || {})); }
  keydown(payload) { (this._listeners.keydown || []).forEach(fn => fn(payload)); }
}

let rafCb = null;
function setupGlobalEnv() {
  globalThis.window = globalThis;
  globalThis.localStorage = makeLocalStorage();
  globalThis.document = {
    createElement: tag => new FakeEl(tag),
    getElementById: () => null,
    body: new FakeEl('body'),
    documentElement: new FakeEl('html'),
    addEventListener: () => {}
  };
  globalThis.document.body.contains = () => true;
  /* applyScale() watches the canvas wrapper for resizes. Nothing here ever
     resizes, so the observer only has to exist and hold a reference — but
     without it mount() throws before a single frame is drawn and every case
     below fails on the same ReferenceError instead of on its own subject. */
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  globalThis.requestAnimationFrame = fn => { rafCb = fn; return 1; };
  globalThis.cancelAnimationFrame = () => {};
  globalThis.performance = globalThis.performance || { now: () => Date.now() };
}
setupGlobalEnv();

const dataMod = await import(pathToFileURL(path.join(ROOT, 'apps/bekkedal/data.js')));
const { BEK_SAVE, BEK_SEASON_DAYS } = dataMod;
const appMod = await import(pathToFileURL(path.join(ROOT, 'apps/bekkedal/index.js')));
const app = appMod.default;

/* ---- test plumbing ------------------------------------------------------- */
let failed = false;
function report(name, ok, detail) {
  if (ok) { console.log('PASS - ' + name); }
  else { failed = true; console.log('FAIL - ' + name + (detail ? ': ' + detail : '')); }
}

function findByText(tag, text) {
  return createdEls.find(el => el.tagName === tag && el.textContent === text);
}

function freshCtx() {
  return {
    fs: { read: async () => null, write: async () => {}, list: async () => [], remove: async () => {} },
    save: async () => {}, load: async () => null,
    openWindow: () => {}, close: () => {}
  };
}

/* mounts a fresh instance of the app; returns handles used to drive it */
function mountApp() {
  createdEls = [];
  rafCb = null;
  const root = new FakeEl('div');
  app.mount(root, freshCtx());
  const bSave = findByText('button', 'SAVE');
  if (!bSave) throw new Error('SAVE button not found after mount');
  return { root, bSave, tick: () => rafCb };
}

function clearSave() { globalThis.localStorage.removeItem(BEK_SAVE); }

/* ---- case 1: fresh save, 30 in-game days, no exceptions ------------------ */
function caseSimulate30Days() {
  clearSave();
  let handle;
  try {
    handle = mountApp();
  } catch (e) {
    report('30-day simulation (no exceptions)', false, 'mount() threw: ' + (e && e.stack || e));
    return;
  }

  const TARGET_DAY = 31;                 /* fresh save starts on day 1 */
  const MAX_FRAMES = 150000;             /* frame dt is clamped to 0.1s in-engine */
  let ts = 0, day = 1;
  try {
    for (let i = 0; i < MAX_FRAMES; i++) {
      ts += 100;
      const cb = handle.tick();
      if (!cb) throw new Error('frame loop never registered a requestAnimationFrame callback');
      cb(ts);
      if (i % 2000 === 0) {
        handle.bSave.click();
        const raw = globalThis.localStorage.getItem(BEK_SAVE);
        if (raw) day = JSON.parse(raw).day;
        if (day >= TARGET_DAY) break;
      }
    }
  } catch (e) {
    report('30-day simulation (no exceptions)', false, 'threw at frame: ' + (e && e.stack || e));
    return;
  }

  handle.bSave.click();
  const raw = globalThis.localStorage.getItem(BEK_SAVE);
  const finalDay = raw ? JSON.parse(raw).day : day;
  if (finalDay < TARGET_DAY) {
    report('30-day simulation (no exceptions)', false, 'only reached day ' + finalDay + ' of ' + TARGET_DAY + ' within ' + MAX_FRAMES + ' frames');
    return;
  }
  report('30-day simulation (no exceptions)', true);
}

/* ---- case 2: serialize -> deserialize -> serialize, byte-identical ------- */
function caseRoundTrip() {
  clearSave();
  let handle;
  try {
    handle = mountApp();
  } catch (e) {
    report('save round-trip (byte-identical)', false, 'mount() threw: ' + (e && e.stack || e));
    return;
  }
  handle.bSave.click();
  const raw1 = globalThis.localStorage.getItem(BEK_SAVE);
  if (!raw1) { report('save round-trip (byte-identical)', false, 'no save was written'); return; }
  let raw2;
  try {
    raw2 = JSON.stringify(JSON.parse(raw1));
  } catch (e) {
    report('save round-trip (byte-identical)', false, 'save is not valid JSON: ' + e.message);
    return;
  }
  report('save round-trip (byte-identical)', raw1 === raw2,
    raw1 === raw2 ? undefined : 'serialize(deserialize(save)) !== save');
}

/* ---- case 3: a hand-written previous-version save survives migration ----- */
/* modelled on ver:1, before stang/hakke, axeLv/pickLv/seedIx, weather,
   drops and the disc/chatIx-as-object shapes existed (see heal() in
   apps/bekkedal/index.js and apps/bekkedal/CLAUDE.md "Save versioning") */
const LEGACY_SAVE = {
  ver: 1,
  lang: 'no',
  map: 'farm', px: 3, py: 8, dir: 0, step: 0, walk: 0,
  day: 5, min: 480, kr: 340, en: 90, enMax: 120,
  water: 15, waterMax: 20,
  tools: { spade: 1, kanne: 1, oks: 1 },          /* missing stang, hakke */
  tool: 0,                                        /* missing axeLv, pickLv, seedIx */
  bag: { potetfro: 2, gammelgjenstand: 1 },       /* a retired item id: must survive */
  soil: {}, felled: {}, mined: {}, picked: {},
  fr: { astrid: 2, hakon: 1 },                    /* missing most npcs */
  met: { astrid: 1 }, seen: {}, flag: { why: 'quiet' }, q: { potet: 'active' },
  chatIx: 3,                                      /* legacy shape: a number, not a map */
  disc: { farm: 1 },
  built: 0, ending: 0
  /* weather, drops: absent entirely */
};

function collectPaths(obj, prefix, out) {
  Object.keys(obj).forEach(k => {
    const p = prefix ? prefix + '.' + k : k;
    out.push(p);
    const v = obj[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) collectPaths(v, p, out);
  });
  return out;
}

function getPath(obj, p) {
  return p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function caseMigration() {
  /* the current shape, taken from a real fresh() via the same save path
     case 2 exercises, so this list never drifts from the engine's own idea
     of what a save looks like */
  clearSave();
  let freshHandle;
  try { freshHandle = mountApp(); } catch (e) {
    report('previous-version save migrates cleanly', false, 'fresh mount() threw: ' + (e && e.stack || e));
    return;
  }
  freshHandle.bSave.click();
  const freshRaw = globalThis.localStorage.getItem(BEK_SAVE);
  if (!freshRaw) { report('previous-version save migrates cleanly', false, 'fresh save was not written'); return; }
  const freshSave = JSON.parse(freshRaw);
  const currentFields = collectPaths(freshSave, '', []);

  clearSave();
  globalThis.localStorage.setItem(BEK_SAVE, JSON.stringify(LEGACY_SAVE));
  let healedHandle;
  try { healedHandle = mountApp(); } catch (e) {
    report('previous-version save migrates cleanly', false, 'migration mount() threw: ' + (e && e.stack || e));
    return;
  }
  healedHandle.bSave.click();
  const healedRaw = globalThis.localStorage.getItem(BEK_SAVE);
  if (!healedRaw) { report('previous-version save migrates cleanly', false, 'healed save was not written'); return; }
  const healedSave = JSON.parse(healedRaw);

  const missingCurrent = currentFields.filter(p => getPath(healedSave, p) === undefined);
  if (missingCurrent.length) {
    report('previous-version save migrates cleanly', false,
      'current field(s) missing after migration: ' + missingCurrent.join(', '));
    return;
  }

  const legacyFields = collectPaths(LEGACY_SAVE, '', []);
  const droppedLegacy = legacyFields.filter(p => getPath(healedSave, p) === undefined);
  if (droppedLegacy.length) {
    report('previous-version save migrates cleanly', false,
      'existing field(s) lost during migration: ' + droppedLegacy.join(', '));
    return;
  }

  report('previous-version save migrates cleanly', true);
}

/* ---- case 4: finishing the house is a permanent milestone, not a reset --- */
/* Drives the real ending path: stand on the lake lot's sign with S.built
   already set (the ending screen only reaches lotSign()'s S.built branch,
   see index.js around the SPACE handler for mode === 'end'), press SPACE to
   open the ending screen, then SPACE again to dismiss it. Asserts money,
   inventory and day are untouched (i.e. `S = fresh()` was not called) and
   that houseBuilt/houseBuiltDay/act2Unlocked landed on the same save. */
function findCanvas() {
  return createdEls.find(el => el.tagName === 'canvas');
}

function caseHouseCompletionMilestone() {
  clearSave();
  let seedHandle;
  try { seedHandle = mountApp(); } catch (e) {
    report('house completion is a permanent milestone', false, 'seed mount() threw: ' + (e && e.stack || e));
    return;
  }
  seedHandle.bSave.click();
  const seedRaw = globalThis.localStorage.getItem(BEK_SAVE);
  if (!seedRaw) { report('house completion is a permanent milestone', false, 'seed save was not written'); return; }
  const save = JSON.parse(seedRaw);

  const KNOWN_KR = 4321;
  const KNOWN_DAY = 17;
  const KNOWN_BAG = { sopp: 7, tommer: 3 };
  save.kr = KNOWN_KR;
  save.day = KNOWN_DAY;
  save.bag = KNOWN_BAG;
  save.built = 1;                       /* the house structure already stands */
  save.houseBuilt = false; save.houseBuiltDay = null; save.act2Unlocked = false;
  save.map = 'lake'; save.px = 4; save.py = 7; save.dir = 1;   /* facing the lot sign at (4,6) */

  clearSave();
  globalThis.localStorage.setItem(BEK_SAVE, JSON.stringify(save));

  let handle;
  try { handle = mountApp(); } catch (e) {
    report('house completion is a permanent milestone', false, 'mount() threw: ' + (e && e.stack || e));
    return;
  }
  const cv = findCanvas();
  if (!cv) { report('house completion is a permanent milestone', false, 'canvas not found'); return; }

  const space = { key: ' ', preventDefault: () => {} };
  try {
    cv.keydown(space);   /* act() on the sign -> lotSign() -> mode = 'end' */
    cv.keydown(space);   /* SPACE on the ending screen -> mark milestone, dismiss */
  } catch (e) {
    report('house completion is a permanent milestone', false, 'threw driving the ending path: ' + (e && e.stack || e));
    return;
  }

  handle.bSave.click();
  const afterRaw = globalThis.localStorage.getItem(BEK_SAVE);
  if (!afterRaw) { report('house completion is a permanent milestone', false, 'save was not written after dismissing ending'); return; }
  const after = JSON.parse(afterRaw);

  const problems = [];
  if (after.kr !== KNOWN_KR) problems.push('kr changed: ' + after.kr + ' !== ' + KNOWN_KR);
  if (after.day !== KNOWN_DAY) problems.push('day changed: ' + after.day + ' !== ' + KNOWN_DAY);
  if (JSON.stringify(after.bag) !== JSON.stringify(KNOWN_BAG)) problems.push('bag changed: ' + JSON.stringify(after.bag) + ' !== ' + JSON.stringify(KNOWN_BAG));
  if (after.houseBuilt !== true) problems.push('houseBuilt not set: ' + after.houseBuilt);
  if (after.houseBuiltDay !== KNOWN_DAY) problems.push('houseBuiltDay not recorded: ' + after.houseBuiltDay + ' !== ' + KNOWN_DAY);
  if (after.act2Unlocked !== true) problems.push('act2Unlocked not derived from houseBuilt: ' + after.act2Unlocked);

  report('house completion is a permanent milestone', problems.length === 0, problems.join('; '));
}

/* ---- shared driver for the two "full year" cases below -------------------- */
/* Driving the real frame loop (dt clamped to 0.1s/step inside frame() itself,
   same as caseSimulate30Days) costs a real rebuild-shaped draw() call on
   essentially every step — measured against this app's own CLAUDE.md cost
   figures, a full 365-day grind through it is minutes, not seconds, which is
   too slow for a check meant to run before every change. So "a full year" is
   verified in two cheaper pieces instead of one expensive one: a real,
   continuously-driven window (long enough to cross a season boundary and
   several weekly quest-board refreshes) proves the frame loop itself stays
   correct under sustained idle play, and a save-injected jump to the
   one-year mark (the same technique caseHouseCompletionMilestone already
   uses to reach a specific S without grinding to it) proves the day/season
   arithmetic — and Act II's own gates — don't come apart at that magnitude,
   without paying to grind every day in between. */
function runIdleDays(handle, numDays) {
  const MAX_FRAMES = 3200 * (numDays + 1);      /* ~3000 frames/day at dt=0.1s, generous headroom */
  let ts = 0, startDay = null, day = null, lastDay = null, dayWentBackwards = false;
  for (let i = 0; i < MAX_FRAMES; i++) {
    ts += 100;
    const cb = handle.tick();
    if (!cb) throw new Error('frame loop never registered a requestAnimationFrame callback');
    cb(ts);
    if (i % 1000 === 0) {
      handle.bSave.click();
      const raw = globalThis.localStorage.getItem(BEK_SAVE);
      if (raw) {
        day = JSON.parse(raw).day;
        if (startDay == null) startDay = day;
        if (lastDay != null && day < lastDay) dayWentBackwards = true;
        lastDay = day;
        if (day - startDay >= numDays) break;
      }
    }
  }
  handle.bSave.click();
  const raw = globalThis.localStorage.getItem(BEK_SAVE);
  const save = raw ? JSON.parse(raw) : null;
  return { save, finalDay: save ? save.day : day, dayWentBackwards };
}

/* jumps a mounted save's `day` field forward without simulating the days in
   between, then remounts — asserting mount() itself survives is what proves
   heal()'s season/festival recompute doesn't break at a large day count */
function jumpToDay(targetDay) {
  const raw = globalThis.localStorage.getItem(BEK_SAVE);
  const save = raw ? JSON.parse(raw) : null;
  if (!save) throw new Error('jumpToDay: no save to jump from');
  save.day = targetDay;
  clearSave();
  globalThis.localStorage.setItem(BEK_SAVE, JSON.stringify(save));
  return mountApp();
}

const YEAR = 4 * BEK_SEASON_DAYS;

/* ---- case 5: idle across and beyond a full year, Act II never self-unlocks */
function caseIdleYearFresh() {
  clearSave();
  let handle, near, far;
  try {
    handle = mountApp();
    near = runIdleDays(handle, 15);                          /* crosses one season boundary, several board refreshes */
    handle = jumpToDay(YEAR + 5);                             /* just past a full year */
    far = runIdleDays(handle, 5);
  } catch (e) {
    report('idle across a full year (fresh save, no exceptions)', false, 'threw: ' + (e && e.stack || e));
    return;
  }
  const problems = [];
  if (!near.save || !far.save) problems.push('a save was not written');
  if (near.dayWentBackwards || far.dayWentBackwards) problems.push('day counter went backwards mid-run');
  if (near.save && near.save.houseBuilt) problems.push('houseBuilt became true with no player input');
  if (near.save && near.save.act2Unlocked) problems.push('act2Unlocked became true with no player input');
  if (far.save && far.save.houseBuilt) problems.push('houseBuilt became true past the one-year mark with no player input');
  if (far.save && far.save.act2Unlocked) problems.push('act2Unlocked became true past the one-year mark with no player input');
  if (far.finalDay < YEAR) problems.push('never actually reached the one-year mark: day ' + far.finalDay);
  report('idle across a full year (fresh save, no exceptions, Act II stays locked)', problems.length === 0, problems.join('; '));
}

/* ---- case 6: idle across and beyond a full year, an Act II save never drifts */
function caseIdleYearAct2() {
  clearSave();
  let seedHandle;
  try { seedHandle = mountApp(); } catch (e) {
    report('idle across a full year (Act II save persists)', false, 'seed mount() threw: ' + (e && e.stack || e));
    return;
  }
  seedHandle.bSave.click();
  const seedRaw = globalThis.localStorage.getItem(BEK_SAVE);
  if (!seedRaw) { report('idle across a full year (Act II save persists)', false, 'seed save was not written'); return; }
  const save = JSON.parse(seedRaw);

  const KNOWN_KR = 8842, KNOWN_DAY = 25, KNOWN_BAG = { tommer: 4, stein: 2 };
  save.kr = KNOWN_KR; save.day = KNOWN_DAY; save.bag = KNOWN_BAG;
  save.built = 1; save.houseBuilt = true; save.houseBuiltDay = 17;
  save.act2Unlocked = true; save.houseTier = 1; save.flag = Object.assign(save.flag || {}, { barn: 1, barn2: 1, lot: 1, build: 'skog' });
  clearSave();
  globalThis.localStorage.setItem(BEK_SAVE, JSON.stringify(save));

  let handle, near, far;
  try {
    handle = mountApp();
    near = runIdleDays(handle, 15);
    handle = jumpToDay(KNOWN_DAY + YEAR + 5);                 /* a year and change past where Act II was reached */
    far = runIdleDays(handle, 5);
  } catch (e) {
    report('idle across a full year (Act II save persists)', false, 'threw: ' + (e && e.stack || e));
    return;
  }
  const problems = [];
  if (!near.save || !far.save) problems.push('a save was not written');
  if (near.dayWentBackwards || far.dayWentBackwards) problems.push('day counter went backwards mid-run');
  if (far.finalDay <= KNOWN_DAY + YEAR) problems.push('day never advanced past the one-year mark: ' + far.finalDay);
  [['near', near], ['far', far]].forEach(([label, run]) => {
    if (!run.save) return;
    if (run.save.kr !== KNOWN_KR) problems.push(label + ': kr drifted with no input: ' + run.save.kr + ' !== ' + KNOWN_KR);
    if (JSON.stringify(run.save.bag) !== JSON.stringify(KNOWN_BAG)) problems.push(label + ': bag drifted with no input: ' + JSON.stringify(run.save.bag));
    if (run.save.houseBuilt !== true) problems.push(label + ': houseBuilt did not survive: ' + run.save.houseBuilt);
    if (run.save.act2Unlocked !== true) problems.push(label + ': act2Unlocked did not survive: ' + run.save.act2Unlocked);
    if (run.save.houseTier !== 1) problems.push(label + ': houseTier did not survive: ' + run.save.houseTier);
  });
  report('idle across a full year (Act II save persists, never resets)', problems.length === 0, problems.join('; '));
}

caseSimulate30Days();
caseRoundTrip();
caseMigration();
caseHouseCompletionMilestone();
caseIdleYearFresh();
caseIdleYearAct2();

process.exit(failed ? 1 : 0);
