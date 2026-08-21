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
   9. a descent, driven through the real move()/exits path: walk into the
      mouth in the gruva, two ladders down, a swing at a vein, a save taken
      mid-run reloaded onto the same square of the same regenerated floor, and
      the climb back out — with nothing left registered or leaked into S
     10. and what the 02:00 clock does to a run: the farm, an empty run, and
      the bag and the deepest floor both still yours
   7. a save whose coordinates were written against maps that have since
      changed shape — a player off the edge of the world, a soil key over a
      wall, a felled key on grass, a mined key in bare rock, a picked key on
      nothing — comes back with every stale key dropped, every valid one
      kept, and the player back on the farm

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
    /* The local-light pass reads the canvas back and writes it again (see
       `lamp.js`), so the stub has to return a real buffer of the size asked
       for rather than a no-op: the pass indexes into `.data` directly and a
       shorter array would loop off the end. Nothing here checks the pixels —
       what this harness asserts is that the frame path does not throw. */
    getImageData: (x, y, w, h) => ({ width: w, height: h,
                                     data: new Uint8ClampedArray(Math.max(0, w * h * 4)) }),
    putImageData: noop,
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
  /* The app latches direction keys on keydown and clears them on keyup, so a
     harness that only ever presses would walk the player into a wall and
     leave them there. Case 9 is the first case to hold a key down across
     frames and then let go of it. */
  keyup(payload) { (this._listeners.keyup || []).forEach(fn => fn(payload)); }
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
const { BEK_SAVE, BEK_SEASON_DAYS, BEK_MAPS } = dataMod;
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

/* ---- case 7: coordinates from a map that has changed shape -------------- */
/* The valley was rebuilt as somewhere you walk (`apps/bekkedal/maps.js`), so
   every map grew and every coordinate a save holds is a coordinate into a
   grid that moved underneath it. heal()'s healCoords() drops per-tile state
   that no longer names a tile of the right kind and puts an out-of-bounds
   player back at the farm spawn — this seeds exactly those four kinds of
   stale key and asserts each one is gone, since a soil key left pointing
   into a wall is a plot the player can never reach and never clear.

   The one *valid* key of each kind is seeded alongside, because a migration
   that drops everything would pass a test that only checks for dropping. */
function caseStaleCoordinates() {
  clearSave();
  const rows = BEK_MAPS.farm.rows;
  const findGlyph = (mp, ch) => {
    const r = BEK_MAPS[mp].rows;
    for (let y = 0; y < r.length; y++) { const x = r[y].indexOf(ch); if (x >= 0) return [x, y]; }
    return null;
  };
  const soilOK = findGlyph('farm', 'f');
  const treeOK = findGlyph('forest', 'Y');
  const veinOK = findGlyph('gruva', 'O');
  const pickOK = findGlyph('enga', 'p');
  const wall = (() => { for (let y = 0; y < rows.length; y++) { const x = rows[y].indexOf('T'); if (x >= 0) return [x, y]; } })();
  const save = {
    ver: 10, lang: 'no', map: 'farm', px: 900, py: 900, dir: 0, step: 0, walk: 0,
    day: 4, min: 480, kr: 100, en: 90, enMax: 120, water: 10, waterMax: 20,
    tools: { spade: 1, kanne: 1, oks: 1 }, tool: 0, bag: {},
    soil: { [soilOK[0] + ',' + soilOK[1]]: { till: 1, wet: 0, seed: '', age: 0, ready: 0 },
            [wall[0] + ',' + wall[1]]: { till: 1, wet: 1, seed: 'potet', age: 2, ready: 0 } },
    felled: { ['forest:' + treeOK[0] + ',' + treeOK[1]]: 99, 'forest:0,0': 99 },
    mined:  { ['gruva:' + veinOK[0] + ',' + veinOK[1]]: 99, 'gruva:1,1': 99 },
    picked: { ['enga:' + pickOK[0] + ',' + pickOK[1]]: 99, 'enga:0,0': 99 },
    drops: [{ map: 'forest', x: 0, y: 0, item: 'sopp' }],
    fr: {}, met: {}, seen: {}, flag: {}, q: {}, chatIx: {}, disc: { farm: 1 },
    weather: 'klar', built: 0, ending: 0
  };
  globalThis.localStorage.setItem(BEK_SAVE, JSON.stringify(save));
  let handle;
  try { handle = mountApp(); } catch (e) {
    report('coordinates into a map that changed shape are healed', false, 'mount() threw: ' + (e && e.stack || e));
    return;
  }
  handle.bSave.click();
  const after = JSON.parse(globalThis.localStorage.getItem(BEK_SAVE));
  const problems = [];
  const inBounds = after.px >= 0 && after.py >= 0 &&
    after.px < BEK_MAPS[after.map].rows[0].length && after.py < BEK_MAPS[after.map].rows.length;
  if (!inBounds) problems.push('the player is still off the map at ' + after.px + ',' + after.py);
  if (after.soil[wall[0] + ',' + wall[1]]) problems.push('a soil key still points into a wall');
  if (!after.soil[soilOK[0] + ',' + soilOK[1]]) problems.push('a valid soil key was dropped');
  if (after.felled['forest:0,0']) problems.push('a felled key still points at something that is not a tree');
  if (!after.felled['forest:' + treeOK[0] + ',' + treeOK[1]]) problems.push('a valid felled key was dropped');
  if (after.mined['gruva:1,1']) problems.push('a mined key still points at something that is not a vein');
  if (!after.mined['gruva:' + veinOK[0] + ',' + veinOK[1]]) problems.push('a valid mined key was dropped');
  if (after.picked['enga:0,0']) problems.push('a picked key still points at something that is not a flower');
  if (!after.picked['enga:' + pickOK[0] + ',' + pickOK[1]]) problems.push('a valid picked key was dropped');
  if (after.day !== save.day) problems.push('the day did not survive: ' + after.day);
  report('coordinates into a map that changed shape are healed', problems.length === 0, problems.join('; '));
}

/* ---- case 8: a heart event fires, plays out and hands the world back ----- */
/* The one thing no static check can see: whether walking into the right
   place at the right hour, with the friendship actually earned, puts a scene
   on the screen. Seeds a save at friendship 4 with Astrid, stands the player
   at the western end of the town road at seven in the morning, and runs the
   real frame loop — sceneWatch() is what decides, so nothing here reaches
   past the front door. Then presses SPACE the way a player does until the
   scene is spent, and asserts every beat had a speaker and a line, that the
   clock did not move while it played, that the player is back on the square
   they were standing on, and that the scene is marked one-shot. */
function caseHeartEvent() {
  const NAME = 'a heart event fires, plays out and restores the world';
  clearSave();
  let seedHandle;
  try { seedHandle = mountApp(); } catch (e) { report(NAME, false, 'seed mount() threw: ' + (e && e.stack || e)); return; }
  seedHandle.bSave.click();
  const seedRaw = globalThis.localStorage.getItem(BEK_SAVE);
  if (!seedRaw) { report(NAME, false, 'seed save was not written'); return; }
  const save = JSON.parse(seedRaw);

  const START = [1, 15];                         /* where the road out of the farm sets you down */
  save.fr.astrid = 4;                            /* astrid4 gates on exactly this */
  save.map = 'town'; save.px = START[0]; save.py = START[1]; save.dir = 3;
  save.day = 5; save.min = 7 * 60;               /* inside the scene's 06:00-09:00 window */
  save.met = { astrid: 1 };
  clearSave();
  globalThis.localStorage.setItem(BEK_SAVE, JSON.stringify(save));

  let handle;
  try { handle = mountApp(); } catch (e) { report(NAME, false, 'mount() threw: ' + (e && e.stack || e)); return; }
  const dbg = globalThis.window.__bekDebug;
  const cv = findCanvas();
  if (!dbg || !cv) { report(NAME, false, 'no debug hook or canvas after mount'); return; }

  const problems = [];
  const beats = [];
  try {
    /* one frame of the real loop — sceneWatch() runs inside it */
    handle.tick()(100);
    let st = dbg.scene(0);
    if (!st.id) { problems.push('no scene fired on entering the town at 07:00 with astrid at 4'); }
    else {
      if (st.id !== 'astrid4') problems.push('the wrong scene fired: ' + st.id);
      const startMin = st.min;
      const space = { key: ' ', preventDefault: () => {} };
      for (let i = 0; i < 60 && st.id; i++) {
        if (!st.line) problems.push('beat ' + st.beat + ' of ' + st.id + ' has no line');
        if (!st.who) problems.push('beat ' + st.beat + ' of ' + st.id + ' has no speaker on the plate');
        beats.push(st.who + ': ' + st.line);
        if (st.cast.length === 0) problems.push('the scene put nobody on stage');
        cv.keydown(space);
        st = dbg.scene(0);
        if (st.id && st.min !== startMin) problems.push('the clock moved during the scene: ' + startMin + ' -> ' + st.min);
      }
      if (st.id) problems.push('the scene never ended after 60 presses');
      if (beats.length < 2) problems.push('only ' + beats.length + ' beat(s) played');
    }
  } catch (e) { report(NAME, false, 'threw driving the scene: ' + (e && e.stack || e)); return; }

  handle.bSave.click();
  const after = JSON.parse(globalThis.localStorage.getItem(BEK_SAVE));
  if (after.px !== START[0] || after.py !== START[1])
    problems.push('the player was not put back where they were: ' + after.px + ',' + after.py);
  if (!after.seen['sc:astrid4']) problems.push('the scene was not marked one-shot');
  if (after.fr.astrid !== 5) problems.push('the scene did not pay its friendship: ' + after.fr.astrid);

  /* and it must not fire a second time on the same save */
  clearSave();
  globalThis.localStorage.setItem(BEK_SAVE, JSON.stringify(after));
  try {
    const again = mountApp();
    again.tick()(100);
    const st = globalThis.window.__bekDebug.scene(0);
    if (st.id === 'astrid4') problems.push('the scene fired a second time');
  } catch (e) { problems.push('re-mount threw: ' + (e && e.stack || e)); }

  report(NAME, problems.length === 0, problems.join('; '));
  if (problems.length === 0) beats.forEach(b => console.log('       ' + b));
}

/* ---- case 9: a descent, walked ------------------------------------------ */
/* `mine_check.js` walks four hundred generated floors and asserts everything
   that is true of a floor on its own. What it cannot see is whether the
   engine can actually get you onto one: registration, the mouth in the gruva,
   an `exits` entry whose destination did not exist when the map was authored,
   the run's own dug table, the crystal, the hoist out, and a save taken
   halfway down coming back up on the same square.

   So this walks it. Every transition below goes through the real `move()` and
   the real `exits`; the debug hook only ever stands the player in front of the
   thing about to be walked into, which is the same licence case 8 takes with
   a heart event. */
function caseDescent() {
  const NAME = 'a descent: walked in, mined, saved mid-run, climbed out';
  clearSave();
  let seedHandle;
  try { seedHandle = mountApp(); } catch (e) { report(NAME, false, 'seed mount() threw: ' + (e && e.stack || e)); return; }
  seedHandle.bSave.click();
  const save = JSON.parse(globalThis.localStorage.getItem(BEK_SAVE));
  /* at the mouth of the mine with a lantern, a pick and the steel to swing it */
  save.map = 'gruva'; save.px = 12; save.py = 22; save.dir = 0;
  save.tools.hakke = 1; save.pickLv = 2;
  save.bag = { lykt: 1 };
  save.en = save.enMax;
  clearSave();
  globalThis.localStorage.setItem(BEK_SAVE, JSON.stringify(save));

  const problems = [];
  let handle, dbg, cv;
  try { handle = mountApp(); } catch (e) { report(NAME, false, 'mount() threw: ' + (e && e.stack || e)); return; }
  dbg = globalThis.window.__bekDebug; cv = findCanvas();
  if (!dbg || !cv || !dbg.mine) { report(NAME, false, 'no debug hook or canvas after mount'); return; }

  let ts = 0;
  const frames = n => { for (let i = 0; i < n; i++) { ts += 100; const cb = handle.tick(); if (!cb) throw new Error('no rAF callback'); cb(ts); } };
  /* a real key press, held long enough for move()'s own 0.14s step gate */
  const step = k => { cv.keydown({ key: k, preventDefault: () => {} }); frames(3); cv.keyup({ key: k }); frames(1); };
  const press = k => { cv.keydown({ key: k, preventDefault: () => {} }); frames(2); cv.keyup({ key: k }); frames(2); };

  try {
    frames(2);
    /* 1. walk south into the alcove — the one square in the valley that is a
          way down rather than a way across */
    if (dbg.mine().floor !== 0) problems.push('a run was live before the player walked into one');
    step('s');
    let st = dbg.mine();
    if (st.floor !== 1) problems.push('walking into the mouth did not start a run: floor ' + st.floor + ' on ' + st.map);
    if (st.deepest !== 1) problems.push('floor 1 was not recorded as reached: deepest ' + st.deepest);
    if (st.shafts < 2) problems.push('floor 1 has ' + st.shafts + ' shafts');
    if (st.registered < 2) problems.push('only ' + st.registered + ' floors registered; the ladder down has nowhere to go');

    /* 2. down two ladders, each one a real step onto a real exit */
    for (let f = 2; f <= 3; f++) {
      if (!dbg.mine('down')) { problems.push('no way down off floor ' + (f - 1)); break; }
      const d = dbg.mine('down');
      step(['s', 'w', 'a', 'd'][d.dir]);
      st = dbg.mine();
      if (st.floor !== f) { problems.push('the ladder down from ' + (f - 1) + ' arrived on floor ' + st.floor); break; }
      if (st.deepest !== f) problems.push('floor ' + f + ' was not recorded: deepest ' + st.deepest);
      if (dbg.mine().tile === 'M') problems.push('arrived inside rock on floor ' + f);
    }

    /* 3. swing at a vein. The run's own dug table takes it, S.mined does not,
          and the square becomes floor you can walk on. */
    const before = dbg.mine();
    const v = dbg.vein('O');
    if (!v) problems.push('floor 3 has no ordinary vein to swing at');
    else {
      press(' '); frames(20);
      const after = dbg.mine();
      if (after.dug !== 1) problems.push('the swing did not go in the run: dug ' + after.dug);
      if (after.en >= before.en) problems.push('the swing cost no energy');
      const got = Object.keys(after.bag).filter(k => !before.bag[k]);
      if (!after.bag.stein) problems.push('no stone off the swing');
      if (!got.some(k => k === 'jern' || k === 'kobber' || k === 'solv')) problems.push('no ore off the swing: ' + got.join(','));
    }

    /* 4. save halfway down and load it back. The rows are not in the save —
          the seed and the floor are — so this is the assertion that a floor
          carves back identical and puts the player on the same square. */
    handle.bSave.click();
    const mid = JSON.parse(globalThis.localStorage.getItem(BEK_SAVE));
    const was = dbg.mine();
    if (!mid.run || mid.run.floor !== 3) problems.push('the run was not saved: ' + JSON.stringify(mid.run));
    if (mid.run && Object.keys(mid.run.dug).length !== was.dug) problems.push('the dug squares were not saved');
    clearSave();
    globalThis.localStorage.setItem(BEK_SAVE, JSON.stringify(mid));
    let back;
    try { back = mountApp(); } catch (e) { problems.push('reload mid-run threw: ' + (e && e.stack || e)); }
    if (back) {
      const now = globalThis.window.__bekDebug.mine();
      if (now.map !== was.map) problems.push('the floor came back as a different map: ' + now.map + ' vs ' + was.map);
      if (now.px !== was.px || now.py !== was.py) problems.push('the player moved across a reload: ' + now.px + ',' + now.py);
      if (now.dug !== was.dug) problems.push('the dug squares did not survive the reload');
      handle = back; dbg = globalThis.window.__bekDebug; cv = findCanvas();
    }

    /* 5. and out. Floor 3 is not a station, so the way out is the ladder up —
          which is exactly the shape of the run the hoist rule creates. */
    for (let i = 0; i < 4 && dbg.mine().floor > 0; i++) {
      const u = dbg.mine('up');
      if (!u) { problems.push('no way up off floor ' + dbg.mine().floor); break; }
      step(['s', 'w', 'a', 'd'][u.dir]);
    }
    st = dbg.mine();
    if (st.floor !== 0) problems.push('still underground after climbing out: floor ' + st.floor);
    if (st.map !== 'gruva') problems.push('climbing out came up on ' + st.map);
    if (st.registered !== 0) problems.push(st.registered + ' floors still registered after the run ended');
    handle.bSave.click();
    const out = JSON.parse(globalThis.localStorage.getItem(BEK_SAVE));
    if (out.run !== null) problems.push('the run outlived the descent: ' + JSON.stringify(out.run));
    if (out.deepest !== 3) problems.push('the shortcut was not kept: deepest ' + out.deepest);
    if (Object.keys(out.disc).some(k => k.indexOf('synk') === 0)) problems.push('a floor leaked into S.disc');
    if (Object.keys(out.mined).some(k => k.indexOf('synk') === 0)) problems.push('a floor leaked into S.mined');
    if (out.ver !== 14) problems.push('a fresh save is ver ' + out.ver);
  } catch (e) { report(NAME, false, 'threw driving the descent: ' + (e && e.stack || e)); return; }

  report(NAME, problems.length === 0, problems.join('; '));
}

/* ---- case 10: a run does not survive the night --------------------------- */
/* The 02:00 rule is the whole of the pressure the mine runs on, so what
   happens when the clock catches you on floor 12 is worth asserting rather
   than reading: you wake on the farm, the run is gone, the bag you carried is
   not, and the deepest floor you reached is still yours. */
function caseNightEndsARun() {
  const NAME = 'the night ends a run, and keeps what you earned';
  clearSave();
  let seedHandle;
  try { seedHandle = mountApp(); } catch (e) { report(NAME, false, 'seed mount() threw: ' + (e && e.stack || e)); return; }
  seedHandle.bSave.click();
  const save = JSON.parse(globalThis.localStorage.getItem(BEK_SAVE));
  save.map = 'gruva'; save.px = 12; save.py = 22; save.dir = 0;
  save.tools.hakke = 1; save.bag = { lykt: 1, solv: 3 };
  save.min = 25 * 60 + 45;                      /* quarter of an hour to 02:00 */
  clearSave();
  globalThis.localStorage.setItem(BEK_SAVE, JSON.stringify(save));

  const problems = [];
  try {
    const handle = mountApp();
    const dbg = globalThis.window.__bekDebug, cv = findCanvas();
    let ts = 0;
    const frames = n => { for (let i = 0; i < n; i++) { ts += 100; handle.tick()(ts); } };
    frames(2);
    cv.keydown({ key: 's', preventDefault: () => {} }); frames(3); cv.keyup({ key: 's' }); frames(1);
    if (dbg.mine().floor !== 1) problems.push('never got underground');
    const day = dbg.mine().map;
    /* run the clock past 02:00 — tickClock() is what ends the day */
    for (let i = 0; i < 4000 && dbg.mine().floor > 0; i++) frames(1);
    const st = dbg.mine();
    if (st.floor !== 0) problems.push('still on floor ' + st.floor + ' after the night');
    if (st.map !== 'farm') problems.push('woke up on ' + st.map + ' rather than the farm');
    if (st.registered !== 0) problems.push(st.registered + ' floors still registered the morning after');
    if (st.deepest < 1) problems.push('the deepest floor reached was forgotten');
    if ((st.bag.solv || 0) !== 3) problems.push('the bag did not come up with the player');
    void day;
  } catch (e) { report(NAME, false, 'threw: ' + (e && e.stack || e)); return; }
  report(NAME, problems.length === 0, problems.join('; '));
}

caseSimulate30Days();
caseRoundTrip();
caseMigration();
caseHouseCompletionMilestone();
caseStaleCoordinates();
caseIdleYearFresh();
caseIdleYearAct2();
caseHeartEvent();
caseDescent();
caseNightEndsARun();

process.exit(failed ? 1 : 0);
