import { createWindow, raise } from '../../kernel/wm.js';
import { Snd } from '../../kernel/snd.js';
import { lampDip } from '../../kernel/hardware.js';
import { scopedListeners, whenGone } from '../lifecycle.js';
import { makeGfx } from './gfx.js';
import { CLASSIC, REGIONS, CHARM, START, FINAL, FINAL2, ROOMS, SPELLS, spellOpen, maxMasks, baseCount, underOpen } from './data.js';
import { classicPay, roomPay, isPerfect, perfectPar } from './pay.js';
import { createRun } from './run.js';
import { drawRun, CLASSIC_REGION } from './run_draw.js';
import { createMap } from './map.js';
import { createBench, notchesUsed } from './bench.js';
import { createTitle } from './title.js';
import * as calls from './trophy_calls.js';
import { createSweeperMusic } from './music.js';

const SWP_KEY = 'templeos.sweeper';

/* The descent as it was had the Wayward Compass in the pocket from the first step. It is found now (perfect rooms), so an old save
   gives it back to the world; every room it had cleared stays cleared, and the spells it had learnt are learnt (they follow the map). */
function migrate(c) {
  if ((c.v || 1) < 2) {
    c.owned = (c.owned || []).filter(id => id !== 'compass'); c.equipped = (c.equipped || []).filter(id => id !== 'compass');
    c.v = 2;
  }
  if (!c.perfect || typeof c.perfect !== 'object') c.perfect = {};
}

const Sweeper = {
  st: null,
  boot() {
    let raw = null;
    try { raw = localStorage.getItem(SWP_KEY); } catch (e) {}
    this.st = raw ? JSON.parse(raw) : { best: {}, won: 0, played: 0, streak: 0, bestStreak: 0, lv: 'e' };
    if (!this.st.best || typeof this.st.best !== 'object') this.st.best = {};
    if (!this.st.recent || typeof this.st.recent !== 'object') this.st.recent = {};
    if (this.st.camp) migrate(this.st.camp);
  },
  save() { try { localStorage.setItem(SWP_KEY, JSON.stringify(this.st)); } catch (e) {} }
};
Sweeper.boot();
window.Sweeper = Sweeper;
const TITLE = 'DUNGEON SWEEPER.EXE';
/* the rooms of the Underdeep (act two): the music there is its own tune */
const ACT2 = new Set(REGIONS.filter(r => r.act === 2).flatMap(r => r.nodes.map(n => n.id)));

/* the campaign save: a fresh one is the START table, copied */
const newCamp = () => JSON.parse(JSON.stringify(START));
const refresh = c => { c.maxHp = maxMasks(c.shards); c.notchUsed = notchesUsed(c); };

let sweepWin = null;
export default {
  open(lvId) {
    if (sweepWin && document.body.contains(sweepWin.win)) { raise(sweepWin.win); return; }
    let cv, G, scene = null, kind = 'title', run = null, raf = null, dripT = null;

    const made = createWindow({
      kind: 'app', title: TITLE, w: 1000, h: 700, appId: 'sweeper', rightClick: true,
      build: body => {
        body.dataset.fluid = '1';
        body.style.overflow = 'hidden';
        cv = document.createElement('canvas');
        cv.tabIndex = 0;
        cv.style.cssText = 'display:block;width:100%;height:100%;outline:none;cursor:default;image-rendering:pixelated';
        body.appendChild(cv);
      }
    });
    sweepWin = made;
    G = makeGfx(cv);
    const winL = scopedListeners(made.win);
    const ro = new ResizeObserver(() => {
      const w = Math.max(160, made.body.clientWidth), h = Math.max(100, made.body.clientHeight);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; G.fit(); }
    });
    ro.observe(made.body);

    const camp = () => Sweeper.st.camp;
    const env = {
      snd: Snd,
      hasCamp: () => !!Sweeper.st.camp,
      best: id => Sweeper.st.best[id],
      forget: () => { Sweeper.st.camp = null; Sweeper.save(); },
      startCampaign: () => { if (!Sweeper.st.camp) { Sweeper.st.camp = newCamp(); Sweeper.save(); } toMap(); },
      startClassic: id => { Sweeper.st.lv = id; Sweeper.save(); toRun(CLASSIC.find(l => l.id === id), null); },
      maxHp: () => maxMasks(camp().shards), save: () => Sweeper.save()
    };

    /* a card for a trophy waits while a room is on, and is shown when you leave it */
    let holding = false;
    const hold = () => { calls.TR.drain(); if (!holding) { holding = true; calls.TR.hold(); } };
    const free = () => { if (holding) { holding = false; calls.TR.release(); } };
    whenGone(made.win, free);

    function set(k, s) { kind = k; scene = s; if (k !== 'run') free(); }
    function toTitle() { run = null; set('title', createTitle(env)); made.title.textContent = TITLE; }
    function toMap() {
      run = null;
      const c = camp(); refresh(c);
      set('map', createMap({ camp: c, snd: Snd, openRoom: n => toRun(null, n), openBench: toBench }));
      made.title.textContent = TITLE + '  --  ' + (underOpen(c) && c.last && REGIONS.some(r => r.act === 2 && r.nodes.some(n => n.id === c.last)) ? 'THE UNDERDEEP' : 'THE SUNKEN KINGDOM');
    }
    function toBench(rid) {
      const c = camp(); refresh(c);
      set('bench', createBench({ camp: c, snd: Snd, save: () => Sweeper.save(), maxHp: env.maxHp, rested: calls.rested, bought: calls.bought }, rid));
    }
    function toRun(classicLv, node) {
      const c = node ? camp() : null;
      run = createRun({ lv: classicLv || node, node: node, camp: c, snd: Snd, onWin, onLose: calls.lost, shadeGeo: S => S.lostGeo || 0 });
      hold();
      run.region = node ? REGIONS.find(r => r.id === node.region) : CLASSIC_REGION;
      run.fresh = { classicLv, node };
      set('run', run);
      made.title.textContent = TITLE + '  --  ' + (node ? node.name : classicLv.name);
    }

    /* ---- what winning pays ------------------------------------------------ */
    /* SUN is paid the moment the room is won (closing the window on the panel used to cost it); only the coin's sound waits */
    function earn(n, why) {
      if (n > 0 && window.Economy) window.Economy.earn(n, why, { game: 'sweeper' });
      setTimeout(() => Snd.coin(), 1300);
    }
    function onWin(S, secs) {
      const st = Sweeper.st;
      st.played++; st.won++; st.streak++;
      if (st.streak > (st.bestStreak || 0)) st.bestStreak = st.streak;
      if (S.classic) {
        const lv = S.lv, now = Date.now(), stamps = st.recent[lv.id] || [];
        const p = classicPay(lv, secs, stamps, now);
        st.recent[lv.id] = stamps.filter(t => now - t < 3600000).concat(now);
        const b = st.best[lv.id];
        if (!b || secs < b) st.best[lv.id] = Math.round(secs * 10) / 10;
        const sun = [['PAYOUT', '+' + p.base], ['TIME BONUS', '+' + p.bonus]];
        if (p.factor < 1) sun.push(['RECENT WINS', 'x' + p.factor.toFixed(2), '#8794aa']);
        S.pay = { secs, geo: [], sun, total: p.total };
        Sweeper.save();
        earn(p.total, 'DUNGEON SWEEPER: ' + lv.name);
        calls.won(S, secs, {});
        S.pay.trophies = calls.earned();
        return;
      }
      const c = camp(), n = S.node, geoL = [], sunL = [], news = [];
      const first = c.cleared[n.id] == null, perfect = isPerfect(n, S, secs);
      const learnt = {}; Object.keys(SPELLS).forEach(k => { learnt[k] = spellOpen(c, k); });
      const shadeFound = !!(c.shade && c.shade.node === n.id), newSpells = [];
      /* geo: what the bench is bought with, as it always was */
      const par = n.c * n.r * 1.2, base = n.geo;
      let bonus = Math.max(0, Math.round(base * 0.5 * (1 - secs / par)));
      geoL.push(['THE ROOM', '+' + base]);
      if (S.has('sprint')) bonus *= 2;
      geoL.push(['TIME', '+' + bonus]);
      let total = base + bonus;
      if (S.has('greed')) { const extra = Math.round(total * 0.3); total += extra; geoL.push(['FRAGILE GREED', '+' + extra]); }
      if (c.shade && c.shade.node === n.id) { total += c.shade.geo; geoL.push(['YOUR SHADE, FOUND', '+' + c.shade.geo, '#9bb0ff']); c.shade = null; }
      if (first && n.shard) { c.shards++; geoL.push(['A MASK SHARD', 'MASK ' + maxMasks(c.shards), '#f2efe4']); }
      c.geo += total;
      /* SUN: four for every geo the room is worth, and a share of that again on a room already cleared */
      const sp = roomPay(n, secs, { first, flawless: S.hits === 0, sprint: S.has('sprint'), greed: S.has('greed') });
      sunL.push([first ? 'THE ROOM' : 'THE ROOM AGAIN', '+' + sp.base]);
      sunL.push(['TIME', '+' + sp.bonus]);
      if (sp.greed) sunL.push(['FRAGILE GREED', '+' + sp.greed]);
      if (sp.flawless) sunL.push(['NO LARVA HATCHED', '+' + sp.flawless]);
      if (sp.first) sunL.push([n.boss ? 'GUARDIAN DOWN' : 'FIRST CLEAR', '+' + sp.first, '#9fe0ff']);
      const t = Math.round(secs * 10) / 10;
      if (first || t < c.cleared[n.id]) c.cleared[n.id] = t;
      if (perfect && (c.perfect[n.id] == null || t < c.perfect[n.id])) c.perfect[n.id] = t;
      Object.keys(SPELLS).forEach(k => { if (!learnt[k] && spellOpen(c, k)) { newSpells.push(k); news.push('YOU HAVE LEARNT ' + SPELLS[k].name + '  [' + SPELLS[k].key + ']'); } });
      let compass = false;
      if (c.owned.indexOf('compass') < 0 && baseCount(c.perfect) >= ROOMS) {
        c.owned.push('compass'); compass = true; news.push('THE WAYWARD COMPASS IS YOURS. IT WAITS AT THE BENCH.');
      }
      c.hp = S.hp; c.soul = S.soul; c.last = n.id;
      if (n.id === FINAL) { c.won = true; news.push('THE HOLLOW ONE IS STILL'); news.push('SOMETHING UNDER IT HAS STARTED TO MOVE: THE UNDERDEEP IS OPEN.'); }
      if (n.id === FINAL2) { c.won2 = true; news.push('THE PALE KING IS STILL. THERE IS NOTHING UNDER THE UNDERDEEP.'); }
      S.pay = { secs, geo: geoL, sun: sunL, total: sp.total, news, perfect, par: perfectPar(n) };
      Sweeper.save();
      earn(sp.total, 'DUNGEON SWEEPER: ' + n.name);
      calls.won(S, secs, { learntBefore: Object.keys(learnt).filter(k => learnt[k]).length, shadeFound, perfect, compass, newSpells, cleared: baseCount(c.cleared), under: Object.keys(c.cleared).filter(id => !!id && c.cleared[id] != null).length - baseCount(c.cleared) });
      S.pay.trophies = calls.earned();
    }
    function onDeath(S) {
      const c = camp(), lost = Math.floor(c.geo * 0.5);
      S.lostGeo = lost;
      c.shade = lost ? { node: S.node.id, geo: lost } : null;
      c.geo -= lost; c.hp = maxMasks(c.shards); c.soul = 0; c.last = null;
      Sweeper.st.streak = 0; Sweeper.st.played++;
      Sweeper.save();
      calls.lost(S);
    }
    function leaveRun() {
      if (!run) return;
      if (run.camp && !run.dead && !run.won) { run.camp.hp = run.hp; run.camp.soul = run.soul; Sweeper.save(); }
      if (run.camp) toMap(); else toTitle();
    }
    function restart() {
      if (!run) return;
      const f = run.fresh;
      if (run.camp && !run.over) { run.camp.hp = run.hp; run.camp.soul = run.soul; }
      toRun(f.classicLv, f.node);
    }

    /* ---- input ----------------------------------------------------------- */
    const toL = ev => {
      const r = cv.getBoundingClientRect();
      return [((ev.clientX - r.left) * (cv.width / r.width) - G.ox) / G.u, ((ev.clientY - r.top) * (cv.height / r.height) - G.oy) / G.u];
    };
    const proceed = () => {
      if (kind !== 'run' || !run.over) return false;
      const ready = performance.now() - run.overAt > 1300;
      if (run.dead && ready) { leaveRun(); return true; }
      if (run.won && ready) { if (run.camp) leaveRun(); else restart(); return true; }
      if (!run.won && !run.dead && run.classic && ready) { restart(); return true; }     /* a lost plain game: a click is a new one */
      return false;
    };
    cv.addEventListener('contextmenu', ev => ev.preventDefault());
    cv.addEventListener('mousemove', ev => { const [x, y] = toL(ev); scene.mouse('move', ev, x, y); });
    cv.addEventListener('mouseleave', () => { if (run) run.hover = -1; });
    cv.addEventListener('mousedown', ev => {
      ev.stopPropagation(); cv.focus();
      if (proceed()) return;
      const [x, y] = toL(ev);
      scene.mouse('down', ev, x, y);
    });
    winL.on(window, 'mouseup', ev => { if (kind === 'run') run.mouse('up', ev, 0, 0); });
    cv.addEventListener('keydown', ev => {
      ev.stopPropagation();
      const k = ev.key;
      if (k === 'F11') return;                                 /* the window manager's */
      if (k === 'Escape') {
        ev.preventDefault();
        if (kind === 'run') { if (run.target) run.target = null; else leaveRun(); }
        else if (kind === 'bench') toMap();
        else if (kind === 'map') toTitle();
        return;
      }
      if (kind === 'run') {
        if (k === 'Enter' || k === ' ') { ev.preventDefault(); if (proceed()) return; }
        if (k === 'r' || k === 'R') { restart(); return; }
      }
      if (scene.key && scene.key(ev)) ev.preventDefault();
    });

    /* the music (apps/sweeper/music.js): the place you are in picks the tune, on the studio's 'sweeper' channel */
    const Song = createSweeperMusic({ studio: () => window.Studio, playing: () => document.body.contains(made.win) && !!window.CRT && window.CRT.on && window.CRT.mus > 0 });
    const placeNow = () => {
      if (kind === 'title') return 'gate';
      if (kind !== 'run' || !run) return 'camp';
      if (run.node && ACT2.has(run.node.id)) return 'under';
      if (run.node && run.node.boss) return 'hollow';
      return 'moss';
    };

    /* ---- the loop ---------------------------------------------------------- */
    function frame() {
      if (!document.body.contains(made.win)) {
        cancelAnimationFrame(raf); clearInterval(dripT); ro.disconnect(); Song.stop(); sweepWin = null; return;
      }
      raf = requestAnimationFrame(frame);
      Song.setPlace(placeNow()); Song.sync(); Song.rotStep();
      if (made.win.classList.contains('hidden') || !cv.width) return;
      const now = performance.now();
      if (kind === 'run') {
        run.tick(now);
        if (run.dead && !run.deathHandled) { run.deathHandled = true; onDeath(run); }
        drawRun(G, run, run.region, now);
      } else {
        if (kind !== 'title') { const c = camp(); if (c) refresh(c); }
        scene.draw(G, now);
      }
    }
    window.__swpDebug = () => ({ kind, run, scene, camp: camp() });
    toTitle();
    if (lvId && CLASSIC.find(l => l.id === lvId)) env.startClassic(lvId);
    raf = requestAnimationFrame(frame);
    dripT = setInterval(() => { if (Math.random() < 0.35) Snd.drip(); }, 4200);
    cv.focus();
    lampDip();
  }
};
