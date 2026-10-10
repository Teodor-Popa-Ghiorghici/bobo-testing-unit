import { SPECIES } from '../../kernel/cos_data.js';
import { ROOM_DEFS } from './rooms.js';
import { GardenAir } from './air.js';
import { describe, POTS_PER_ROOM } from './synergy.js';
import { paint, createAmbience, potAt, roomTabAt, splash, W, H } from './scene.js';
import { makeWorld, loadState } from './world.js';
import { createBench } from './bench.js';
import { createCalls } from './trophy_calls.js';
import { createReadyChime } from './ready.js';
import * as M from './model.js';
import { createFlyover } from './geese.js';  /* Thea's geese */
import { setLiveWallpaper, liveWallpaper } from '../../kernel/wallpaper.js';
import { ROOMS as WALL_ROOMS } from './wall.js';
import { buffs } from '../buffs_scope.js';

const PENTA = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];
const SWEEP_MS = 85;

export default {
  id: 'garden',
  title: 'GARDEN.EXE',
  width: 720,
  height: 566,
  resizable: true,
  async mount(root, ctx) {
    const w = makeWorld();
    const st = await loadState(ctx, w);
    const tro = createCalls(w, st, ROOM_DEFS.length);
    const earn = (n, src) => { window.Economy.earn(n, src); tro.earned(n); };
    const save = () => ctx.save('st', st);
    const snd = (name, ...a) => { try { window.Snd[name](...a); } catch (e) {} };
    { const gap0 = Date.now() - (st.lastTick || Date.now()); let got = 0; M.catchUp(w, st, Date.now(), (n, s) => { got += n; earn(n, s); }); tro.caughtUp(gap0, got); }
    save(); tro.scan();

    let mode = 'none', seedIx = 0, hover = -1, tabHover = -1, down = false, lastPot = -1, tipUntil = 0, tip = '';
    let raf = null, t0 = performance.now(), tsec = 0, alive = true, saveT = null;
    const chain = { n: 0, t: 0 }, timers = [], amb = createAmbience();
    const room = () => st.rooms[st.active];
    const roomDef = () => ROOM_DEFS[st.active];
    const potOfRoom = ri => w.pot(M.potId(w, st.rooms[ri]));
    /* the kinds of plant that were bought or found: a gift's seed (Biscu's COOKIEBLOOM) is not one of them, and does not come up in the tray until there are `needKinds` of them */
    const kindsOwned = () => window.Cos.owned('seed').filter(id => { const sp = SPECIES.find(s => s.id === id); return sp && !sp.gift; }).length;
    const ownedSeeds = () => { const own = window.Cos.owned('seed'), k = kindsOwned(), l = SPECIES.filter(s => own.indexOf(s.id) >= 0 && (!s.needKinds || k >= s.needKinds)); return l.length ? l : [SPECIES[0]]; };
    const seedNow = () => ownedSeeds()[seedIx % ownedSeeds().length];
    const say = (txt, ms = 4500) => { tip = txt; tipUntil = performance.now() + ms; };
    const likes = sp => {
      const rd = ROOM_DEFS.find(d => d.id === sp.home), pot = w.pot(sp.kin), mate = w.species(sp.mate);
      return sp.name + ' LIKES THE ' + (rd ? rd.name : '?') + ', THE ' + pot.name + ' AND A ' + (mate ? mate.name : '?') + ' BESIDE IT.';
    };
    /* ---- the window ---- */
    const pane = document.createElement('div'); pane.className = 'gamepane gardenpane';
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.className = 'gamecv gardencv'; cv.tabIndex = 0;
    pane.appendChild(cv);
    const bar = document.createElement('div'); bar.className = 'appbar wrap';
    const btn = (label, fn) => { const b = document.createElement('button'); b.className = 'appbtn'; b.textContent = label; b.addEventListener('mousedown', ev => { ev.stopPropagation(); fn(b); }); bar.appendChild(b); return b; };
    const canBtn = btn('WATER', () => setMode(mode === 'can' ? 'none' : 'can'));
    const tendBtn = btn('TEND', () => tend());
    const seedBtn = btn('', () => { seedIx = (seedIx + 1) % ownedSeeds().length; snd('click'); refreshBar(); say(likes(seedNow()), 8000); });
    const sowBtn = btn('SOW ROOM', () => sow());
    const potBtn = btn('', () => cyclePot());
    const pullBtn = btn('PULL UP', () => setMode(mode === 'pull' ? 'none' : 'pull'));
    const benchBtn = btn('BENCH', () => benchToggle());
    btn('DAVE', () => ctx.openWindow('shop'));
    /* HOLYC.EXE's quiet gift: the five rooms with nothing growing in them, moving, as the desktop's wallpaper (apps/garden/wall.js, kernel/wallpaper_live.js). The button is not there until it is earned. */
    const gift = buffs();
    const wallBtn = btn('', () => {
      const order = [null].concat(WALL_ROOMS.map(r => r.id)), cur = liveWallpaper(), nxt = order[(order.indexOf(cur) + 1) % order.length];
      setLiveWallpaper(nxt); refreshWall(); snd('click');
      say(nxt ? 'THE DESKTOP IS NOW THE ' + WALL_ROOMS.find(r => r.id === nxt).name + ', MOVING, WITH NOTHING GROWING IN IT. PRESS AGAIN FOR THE NEXT ROOM.' : 'THE DESKTOP IS ITS OWN BACKGROUND AGAIN.', 6000);
    });
    function refreshWall() {
      wallBtn.style.display = gift.has('garden_wall') ? '' : 'none';
      const cur = liveWallpaper(), r = WALL_ROOMS.find(x => x.id === cur);
      wallBtn.textContent = 'WALLPAPER: ' + (r ? r.name : 'OFF'); wallBtn.classList.toggle('on', !!cur);
      wallBtn.title = 'PUT A ROOM, MOVING, ON THE DESKTOP BEHIND THE ICONS';
    }
    refreshWall();
    const offGift = gift.on(() => refreshWall());
    const tipEl = document.createElement('div'); tipEl.className = 'gtip';
    const l1 = document.createElement('div'), l2 = document.createElement('div');
    l1.className = 'godword gbar'; l2.className = 'godword gl2'; l2.style.whiteSpace = 'normal'; l2.style.color = 'var(--sch-fg, #FFFFFF)';
    tipEl.appendChild(l1); tipEl.appendChild(l2);
    root.appendChild(pane); root.appendChild(bar); root.appendChild(tipEl);
    const bench = createBench({
      offers: () => M.offers(w, st, st.active), balance: () => window.Economy.balance(), roomName: () => roomDef().name,
      buy: id => { const ok = M.buy(w, st, st.active, id, (n, s) => window.Economy.spend(n, s)); if (ok) { snd('purchase'); save(); refreshBar(); } else snd('deny'); return ok; },
      onChange: open => benchBtn.classList.toggle('on', open)
    });
    pane.appendChild(bench.el);
    const g = cv.getContext('2d'); if (g) g.imageSmoothingEnabled = false;
    function setMode(m) {
      mode = m;
      canBtn.classList.toggle('on', m === 'can'); canBtn.textContent = m === 'can' ? 'CAN IN HAND' : 'WATER';
      pullBtn.classList.toggle('on', m === 'pull'); pullBtn.textContent = m === 'pull' ? 'PULLING' : 'PULL UP';
      cv.classList.toggle('canning', m === 'can');
      snd('click');
      say(m === 'can' ? 'DRAG ACROSS THE POTS TO WATER THEM. CLICK WATER AGAIN TO PUT THE CAN DOWN.' : m === 'pull' ? 'DRAG ACROSS PLANTS TO PULL THEM UP. WHAT THEY WERE HOLDING IS PAID OUT FIRST.' : '');
    }
    /* TEND and the BENCH are late-game (model.js UNLOCK): until then the buttons say how far along you are */
    const gate = () => M.gates(st, kindsOwned());
    const lockedSay = which => {
      const g = gate()[which];
      say(which === 'tend'
        ? 'TEND OPENS WHEN THE GARDEN HAS ' + g.need + ' ROOMS. YOU HAVE ' + g.have + '. EACH ROOM IS A TAB ABOVE THE RACK: CLICK ONE TO BUY IT. UNTIL THEN THE CAN AND YOUR OWN HAND DO THE WORK.'
        : 'THE BENCH OPENS WHEN YOU OWN ' + g.need + ' KINDS OF PLANT. YOU HAVE ' + g.have + '. DAVE SELLS THE SEEDS. IT IS WHERE DRIP LINES, BIGGER BASKETS AND THE GATHERER ARE BOUGHT.', 8000);
      snd('deny');
    };
    function benchToggle() { if (!bench.isOpen() && !gate().bench.open) { lockedSay('bench'); return; } bench.toggle(); }
    function refreshBar() {
      const gt = gate();
      tendBtn.textContent = gt.tend.open ? 'TEND' : 'TEND ' + gt.tend.have + '/' + gt.tend.need + ' ROOMS'; tendBtn.classList.toggle('locked', !gt.tend.open);
      benchBtn.textContent = gt.bench.open ? 'BENCH' : 'BENCH ' + gt.bench.have + '/' + gt.bench.need + ' PLANTS'; benchBtn.classList.toggle('locked', !gt.bench.open);
      seedBtn.textContent = 'SEED: ' + seedNow().name;
      potBtn.textContent = 'POT: ' + potOfRoom(st.active).name;
      sowBtn.textContent = 'SOW ROOM';
      bench.isOpen() && bench.refresh();
    }
    refreshBar();
    /* ---- what a click does ---- */
    const bump = () => {
      const now = performance.now();
      chain.n = now - chain.t > M.CHAIN.window ? 1 : chain.n + 1;
      chain.t = now;
      return M.chainMult(chain.n);
    };
    function pick(i, ri = st.active) {
      const p = st.rooms[ri].pots[i];
      if (!p || !p.tok) return 0;
      const mult = bump(), n = M.collect(w, st, ri, i, mult);
      if (n <= 0) return 0;
      earn(n, 'GARDEN: ' + (w.species(p.sp) || { name: '?' }).name);
      tro.picked({ n }, w.species(p.sp), ROOM_DEFS[ri].id, M.isNight(Date.now()));
      if (mult >= 1 + M.CHAIN.max - 1e-9) tro.chain();
      if (ri === st.active) {
        const q = potAt(i);
        amb.pops.push({ x: q.cx, y: q.y, t: 0, n, x2: mult > 1.005 ? mult : 0 });
        snd('pluck', PENTA[w.species(p.sp).note] * Math.pow(2, Math.min(2, (chain.n - 1) / 8)));
        splash(amb, 'coin', i, 0.6 + Math.min(1.2, chain.n * 0.1)); GardenAir.sfx('sparkle', Math.min(4, chain.n));
      }
      p.wig = 1;
      return n;
    }
    function plant(i) {
      const sp = seedNow(), r = room();
      r.pots[i] = { sp: sp.id, planted: Date.now(), watered: Date.now(), grown: 0, acc: 0, tok: 0, wig: 0 };
      st.planted = (st.planted || 0) + 1;
      snd('dig'); snd('pluck', PENTA[sp.note]); splash(amb, 'dirt', i); GardenAir.sfx('soil');
    }
    function act(i) {
      const r = room(), p = r.pots[i], now = Date.now();
      if (mode === 'pull') {
        if (!p) return;
        pick(i);
        r.pots[i] = null;
        snd('dig'); splash(amb, 'pull', i); GardenAir.sfx('pull');
      } else if (!p) {
        if (mode === 'none') plant(i);
      } else if (mode === 'can') {
        if (!M.isWet(w, st, st.active, p, now)) { p.watered = now; p.wig = 0.5; GardenAir.sfx('water'); splash(amb, 'water', i); }
      } else if (p.tok) {
        pick(i);
      } else {
        p.wig = 1;
        const f = PENTA[w.species(p.sp).note] * (M.stage(w, p) === 3 ? 1 : 2);
        snd('pluck', f); tro.poked(f, performance.now());
      }
      save();
    }
    /* TEND: water what is dry, then sweep every plant in every room, the one you are looking at as a run of notes */
    function tend() {
      if (timers.length) return;
      if (!gate().tend.open) { lockedSay('tend'); return; }
      tro.tended(M.roomsOpen(st));
      const now = Date.now();
      let drank = 0, paid = 0, rooms = 0;
      st.rooms.forEach((r, ri) => {
        if (!r.unlocked) return;
        drank += M.waterRoom(w, st, ri, now);
        if (ri === st.active) return;
        let n = 0;
        r.pots.forEach((p, i) => { if (p && p.tok) { const v = M.collect(w, st, ri, i, M.chainMult(++n)); if (v > 0) { earn(v, 'GARDEN: TEND'); paid += v; } } });
        if (n) rooms++;
        if (n && M.chainMult(n) >= 1 + M.CHAIN.max - 1e-9) tro.chain();
      });
      if (drank) { GardenAir.sfx('water'); room().pots.forEach((p, i) => { if (p) splash(amb, 'water', i, 0.5); }); }
      chain.n = 0; chain.t = 0;
      const order = [];
      room().pots.forEach((p, i) => { if (p && p.tok) order.push(i); });
      order.forEach((i, k) => timers.push(setTimeout(() => { if (alive) { paid += pick(i); } }, 120 + k * SWEEP_MS)));
      timers.push(setTimeout(() => { timers.length = 0; if (alive) { say('TENDED ' + st.rooms.filter(r => r.unlocked).length + ' ROOMS.  ' + drank + ' WATERED.  ' + paid + ' SUN PAID' + (chain.n > 1 ? '  (A CHAIN OF ' + chain.n + ')' : '') + '.', 6000); save(); } }, 200 + order.length * SWEEP_MS));
      if (!order.length && !rooms && !drank) say('NOTHING TO DO IN ANY ROOM. EVERYTHING IS WATERED AND THERE IS NOTHING TO PICK.', 3500);
    }
    function sow() {
      const r = room();
      let n = 0;
      r.pots.forEach((p, i) => { if (!p) { plant(i); n++; } });
      if (n) { say('SOWED ' + n + ' POTS WITH ' + seedNow().name + '.  ' + likes(seedNow()), 7000); save(); } else say('NO EMPTY POTS.', 2500);
    }
    function cyclePot() {
      const own = window.Cos.owned('pot'), cur = M.potId(w, room()), i = own.indexOf(cur);
      room().pot = own[(i + 1) % own.length];
      snd('click'); refreshBar(); save();
      const rd = roomDef(), pot = potOfRoom(st.active);
      say('THE ' + rd.name + ' STANDS IN THE ' + pot.name + '.  ' + (pot.id === rd.kinPot ? 'THAT IS THE POT THIS ROOM IS SET FOR: EVERY PLANT IN IT GAINS.' : 'THIS ROOM IS SET FOR THE ' + w.pot(rd.kinPot).name + '.'), 7000);
    }

    /* ---- pointer ---- */
    const where = ev => { const r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) * (W / r.width), y: (ev.clientY - r.top) * (H / r.height) }; };
    const potAtPoint = m => { for (let i = 0; i < POTS_PER_ROOM; i++) { const q = potAt(i); if (m.x >= q.x - 6 && m.x <= q.x + q.w + 6 && m.y >= q.y - 60 && m.y <= q.y + q.h + 6) return i; } return -1; };
    const tabAtPoint = m => ROOM_DEFS.findIndex((d, i) => { const t = roomTabAt(i); return m.x >= t.x && m.x <= t.x + t.w && m.y >= t.y && m.y <= t.y + t.h; });
    function clickTab(i) {
      const r = st.rooms[i];
      if (r.unlocked) { if (st.active !== i) { st.active = i; save(); snd('click'); refreshBar(); } }
      else if (window.Economy.spend(ROOM_DEFS[i].price, 'GARDEN: ' + ROOM_DEFS[i].name)) { r.unlocked = true; st.active = i; save(); snd('purchase'); refreshBar(); say(ROOM_DEFS[i].name + ' IS YOURS.  IT IS SET FOR THE ' + w.pot(ROOM_DEFS[i].kinPot).name + '.', 6000); }
      else snd('deny');
    }
    cv.addEventListener('mousedown', ev => {
      ev.stopPropagation(); cv.focus();
      const m = where(ev), t = tabAtPoint(m);
      if (t >= 0) { clickTab(t); return; }
      down = true; lastPot = -1;
      const i = potAtPoint(m);
      if (i >= 0) { lastPot = i; act(i); }
    });
    cv.addEventListener('mousemove', ev => {
      const m = where(ev);
      hover = potAtPoint(m); tabHover = tabAtPoint(m);
      if (down && hover >= 0 && hover !== lastPot) { lastPot = hover; act(hover); }
    });
    cv.addEventListener('mouseleave', () => { hover = -1; tabHover = -1; });
    const up = () => { down = false; lastPot = -1; }; document.addEventListener('mouseup', up);
    cv.addEventListener('keydown', ev => {
      const k = ev.key.toLowerCase();
      if (k === ' ' || k === 't') tend();
      else if (k === 'b') benchToggle();
      else if (k === 'w') setMode(mode === 'can' ? 'none' : 'can');
      else if (k === 'p') setMode(mode === 'pull' ? 'none' : 'pull');
      else if (k === 's') sow();
      else if (k === 'escape') bench.close();
      else if (k >= '1' && k <= String(ROOM_DEFS.length)) clickTab(+k - 1);
      else return;
      ev.preventDefault();
    });
    pane.addEventListener('mousedown', () => setTimeout(() => cv.focus(), 0));

    /* ---- the line under the garden: what is under the pointer, or how the room is ---- */
    function lines(dry, now, night) {
      const r = room(), rd = roomDef(), cap = M.cap(st), held = M.tokens(r);
      const clock = String(Math.floor(((now % M.DAY_MS) / M.DAY_MS) * 24)).padStart(2, '0');
      l1.textContent = rd.name + (r.drip ? ' (DRIP)' : '') + '  ' + (night ? 'NIGHT ' : 'DAY ') + clock + ':00  ' + held + '/' + cap + ' SUN  ' + (r.drip ? 'WATERED' : dry.length ? dry.length + ' DRY' : 'WATERED') +
        (st.up.gather ? '  GATHERER ' + Math.round(M.GATHER[st.up.gather].rate * 100) + '%' : '');
      if (performance.now() < tipUntil) { l2.textContent = tip; return; }
      if (tabHover >= 0) {
        const d = ROOM_DEFS[tabHover];
        l2.textContent = d.name + ': ' + d.blurb + '  SET FOR THE ' + w.pot(d.kinPot).name + '.' + (st.rooms[tabHover].unlocked ? '' : '  CLICK TO BUY FOR ' + d.price + ' SUN.');
      } else if (hover >= 0 && r.pots[hover]) {
        const p = r.pots[hover], sp = w.species(p.sp), s = M.stats(w, st, st.active, hover);
        const head = sp.name + '  x' + s.yield.toFixed(2) + ' SUN  x' + s.grow.toFixed(2) + ' GROWTH  --  ' + describe(s.tags) +
          (p.tok ? '  --  HOLDING ' + M.worth(w, st, st.active, hover) + ' SUN' : ''), full = head + '  --  ' + likes(sp);
        l2.textContent = full.length <= 200 ? full : head;   /* two lines is all the box has: the likes go when the rest is long */
      } else if (hover >= 0) {
        l2.textContent = 'AN EMPTY POT. CLICK OR DRAG TO PLANT ' + seedNow().name + '.  ' + likes(seedNow());
      } else {
        const gt = gate();
        l2.textContent = 'CLICK A PLANT TO PICK IT, DRAG TO SWEEP.  ' + (gt.tend.open ? 'SPACE: TEND EVERY ROOM.  ' : 'TEND: ' + gt.tend.have + '/' + gt.tend.need + ' ROOMS.  ') +
          (gt.bench.open ? 'B: THE BENCH.  ' : 'BENCH: ' + gt.bench.have + '/' + gt.bench.need + ' PLANTS.  ') + '1-' + ROOM_DEFS.length + ': ROOMS.';
      }
    }

    /* ---- the loop ---- */
    const V = { st, w, amb, skin: ri => potOfRoom(ri), mode: 'none', flyover: createFlyover() };
    let scanAt = 0;                                    /* the trophies look at the whole garden about once a second */
    const readyChime = createReadyChime(() => room().pots, () => st.active, () => GardenAir.sfx('ready'));
    const frame = () => {
      if (!alive || !document.body.contains(cv)) { raf = null; GardenAir.stop(); st.lastTick = Date.now(); save(); return; }
      raf = requestAnimationFrame(frame);
      const nowMs = performance.now(), dt = Math.min(0.1, (nowMs - t0) / 1000);
      t0 = nowMs; tsec += dt;
      const now = Date.now(), gap = now - (st.lastTick || now);
      if (gap > 4000) M.catchUp(w, st, now, earn);
      else { st.lastTick = now; if (gap > 0) M.step(w, st, now, gap, 1, earn); }
      if (nowMs - scanAt > 1000) { scanAt = nowMs; tro.scan(); }
      const light = M.light(now), night = light < 0.34 || roomDef().buff.night;
      Object.assign(V, { ri: st.active, now, tsec, dt, light, night, hover, mode });
      const dry = paint(g, V);
      lines(dry, now, night);
      if (V.env) GardenAir.tick(dt, V.env);
      readyChime(nowMs);
    };
    GardenAir.start(); raf = requestAnimationFrame(frame); saveT = setInterval(save, 20000);

    const mixerHandler = ev => {
      if (!document.body.contains(cv)) { window.removeEventListener('mixer-changed', mixerHandler); return; }
      if (ev.detail && ev.detail.channel === 'garden' && GardenAir.gain) GardenAir.setLevel();
    };
    window.addEventListener('mixer-changed', mixerHandler);
    const stock = () => {
      const win = root.closest('.win'), t = win && win.querySelector('.titlebar .t');
      if (t) { t.textContent = 'Garden [DELIVERY!]'; setTimeout(() => { t.textContent = 'Garden'; }, 3000); refreshBar(); }
    };
    window.addEventListener('garden-stock-refresh', stock);
    const bought = () => { if (alive) refreshBar(); }; window.addEventListener('cos-changed', bought);
    this._stop = () => {
      alive = false;
      cancelAnimationFrame(raf); clearInterval(saveT); timers.forEach(clearTimeout);
      document.removeEventListener('mouseup', up);
      window.removeEventListener('mixer-changed', mixerHandler);
      window.removeEventListener('garden-stock-refresh', stock);
      window.removeEventListener('cos-changed', bought);
      offGift();
      GardenAir.stop();
      st.lastTick = Date.now(); save();
    };
  },
  unmount() {
    if (this._stop) { this._stop(); this._stop = null; }
  }
};