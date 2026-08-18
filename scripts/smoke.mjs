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
    beginPath: noop, moveTo: noop, lineTo: noop, closePath: noop, stroke: noop,
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
  globalThis.requestAnimationFrame = fn => { rafCb = fn; return 1; };
  globalThis.cancelAnimationFrame = () => {};
  globalThis.performance = globalThis.performance || { now: () => Date.now() };
}
setupGlobalEnv();

const dataMod = await import(pathToFileURL(path.join(ROOT, 'apps/bekkedal/data.js')));
const { BEK_SAVE } = dataMod;
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

caseSimulate30Days();
caseRoundTrip();
caseMigration();

process.exit(failed ? 1 : 0);
