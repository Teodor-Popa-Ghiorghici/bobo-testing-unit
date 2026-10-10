/* One room: the rules of play, driven by clicks and keys. Drawing is in
   run_draw.js; the board's own rules are in board.js. This file decides what
   a click means, what a larva costs, and what a spell does. */
import { mk, lay, open, each, around, chordTargets, blocked, hiddenSafe, won as boardWon, flagsUsed, underFlags } from './board.js';
import { CHARM, SPELLS, SPELL_HINT, GRUB_SOUL, spellOpen, maxMasks, modsOf } from './data.js';
import { eggs } from '../eggs_scope.js';

export function createRun(env) {
  const node = env.node || null;                 /* null = a classic game */
  const lv = env.lv || node;
  const camp = env.camp || null;                 /* the campaign save, or null */
  const has = id => !!(camp && camp.equipped.indexOf(id) >= 0);
  const S = {
    env, node, lv, camp, has, classic: !camp,
    b: mk(lv.c, lv.r, lv.m), mods: node ? modsOf(node) : [], mod: node && modsOf(node)[0] || null,
    hpMax: camp ? maxMasks(camp.shards) : 0, hp: camp ? camp.hp : 0, blue: 0,
    soul: camp ? camp.soul : 0, shell: false, opened: 0, womb: 0,
    started: false, t0: 0, endT: 0, over: false, won: false, dead: false, overAt: 0,
    target: null, hover: -1, held: false, msg: [], parts: [], floats: [], shake: 0, flash: 0, fogAt: 0,
    pay: null, tile: 20, bx: 0, by: 0, face: 'neutral',
    /* what the trophies and the pay panel ask about a room: a larva that hatched at all (`hits`, even one the shell or a lifeblood mask took),
       masks really lost, spells cast, flags put down by hand, clicks on a web, clicks at all */
    hits: 0, maskLoss: 0, spells: 0, flagsPlaced: 0, webBlocks: 0, clicks: 0, hintAt: 0
  };
  if (has('lifeblood')) S.blue = 2;

  S.layout = () => {
    S.tile = Math.max(12, Math.floor(Math.min(930 / lv.c, 480 / lv.r)));
    S.bx = Math.round((960 - S.tile * lv.c) / 2);
    S.by = Math.round(84 + (500 - S.tile * lv.r) / 2);
  };
  S.layout();
  S.idxAt = (lx, ly) => {
    const x = Math.floor((lx - S.bx) / S.tile), y = Math.floor((ly - S.by) / S.tile);
    return x < 0 || y < 0 || x >= lv.c || y >= lv.r ? -1 : y * lv.c + x;
  };
  S.say = (t, c) => { S.msg.push({ t, c: c || '#e8e2d4', at: performance.now() }); if (S.msg.length > 3) S.msg.shift(); };
  const cell = i => ({ x: S.bx + (i % lv.c) * S.tile + S.tile / 2, y: S.by + Math.floor(i / lv.c) * S.tile + S.tile / 2 });
  const pop = (i, n, c) => {
    const p = cell(i);
    for (let k = 0; k < n; k++) S.parts.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 110, life: 0.5 + Math.random() * 0.4, c });
  };
  const float = (i, txt, c) => { const p = cell(i); S.floats.push({ txt, x: p.x, y: p.y - 6, t: 0, c }); };
  S.pop = pop;

  /* ---- soul, masks ----------------------------------------------------- */
  /* the Underdeep is stingy: a room's `soulK` is what share of the soul an opened tile gives, and its `spellK` what the spells cost (the sums are whole) */
  const soulK = node && node.soulK || 1, spellK = node && node.spellK || 1;
  /* the golden sun eggs (kernel/eggs.js) are a little more soul from every tile opened */
  const eggK = eggs().mult('sweeper');
  const gainSoul = n => { if (camp) S.soul = Math.min(99, S.soul + Math.round(n * soulK * eggK)); };
  const costOf = base => Math.round(base * spellK);
  S.cost = kind => costOf(SPELLS[kind].cost);
  const focusCost = () => costOf(has('deep') ? 44 : has('quick') ? 22 : 33);
  const diveRad = () => has('shaman') ? 2 : 1;
  /* F, Q and E are learnt by clearing the map, a region at a time (data.js SPELL_AT); a classic game has none */
  S.learnt = kind => !!camp && spellOpen(camp, kind);

  function hurt(i) {
    const b = S.b, now = performance.now();
    b.def[i] = true; b.rev[i] = now; b.flag[i] = false;
    pop(i, 14, '#c8354a');
    env.snd.chitter(0);
    if (S.classic) { lose(i); return; }
    /* what a larva costs: a room's own `hit` (the Underdeep's is two, a guardian's three), else one, a guardian's two; the iron ward takes one off, never the last */
    let dmg = S.node.hit || (S.node.boss ? 2 : 1);
    if (has('ward')) dmg = Math.max(1, dmg - 1);
    S.hits++;
    if (has('stalwart') && !S.shell) {
      S.shell = true; S.say('THE SHELL HOLDS.', '#9fe0ff'); float(i, 'SHELL', '#9fe0ff');
    } else {
      let d = dmg;
      if (S.blue) { const t = Math.min(S.blue, d); S.blue -= t; d -= t; }
      S.hp -= d; S.maskLoss += d; S.shake = 1; S.flash = 1; env.snd.err();
      float(i, '-' + dmg, '#ff6070'); S.say('A LARVA HATCHES. -' + dmg + ' MASK' + (dmg > 1 ? 'S' : ''), '#ff8090');
      if (has('grubsong')) { gainSoul(GRUB_SOUL); float(i, '+' + Math.round(GRUB_SOUL * soulK) + ' SOUL', '#cfe6ff'); }
    }
    if (has('thorns')) each(b, i, j => { if (b.mine[j] && !b.def[j] && !b.flag[j] && !b.rev[j]) { b.flag[j] = true; pop(j, 4, '#7fe09a'); } });
    if (S.hp <= 0) { die(); return; }
    checkWin();
  }

  function die() {
    S.over = true; S.dead = true; S.overAt = performance.now(); S.endT = Date.now();
    env.snd.err();
  }
  function lose(i) {
    const Sw = window.Sweeper;
    S.over = true; S.won = false; S.face = 'cracked'; S.endT = Date.now(); S.overAt = performance.now();
    S.shake = 1; env.snd.err();
    if (Sw) { Sw.st.played++; Sw.st.streak = 0; Sw.save(); }
    S.hatch = performance.now();
    if (env.onLose) env.onLose(S);
  }

  function checkWin() {
    if (S.over || !boardWon(S.b)) return;
    S.over = true; S.won = true; S.face = 'serene'; S.endT = Date.now(); S.overAt = performance.now();
    const secs = (S.endT - S.t0) / 1000;
    env.snd.chime();
    env.onWin(S, secs);
  }

  /* ---- opening ---------------------------------------------------------- */
  function openAt(i, silent) {
    const b = S.b, got = open(b, i, performance.now(), 14);
    if (!got.length) return 0;
    S.opened += got.length;
    gainSoul(Math.min(14, 2 + got.length * 0.7) * (has('catcher') ? 1.5 : 1));
    got.slice(0, 14).forEach(j => pop(j, 1, '#8794aa'));
    if (!silent) env.snd.dig();
    if (has('womb')) {
      S.womb += got.length;
      while (S.womb >= 15) {
        S.womb -= 15;
        const m = [];
        for (let k = 0; k < b.n; k++) if (b.mine[k] && !b.flag[k] && !b.def[k] && !b.rev[k]) m.push(k);
        if (m.length) { const k = m[Math.floor(Math.random() * m.length)]; b.flag[k] = true; float(k, 'HATCHLING', '#ffd68c'); pop(k, 6, '#ffd68c'); }
      }
    }
    return got.length;
  }

  function clickOpen(i) {
    const b = S.b;
    if (b.rev[i]) {                                /* a number: clear spores, or chord */
      if (b.fog[i]) { b.fog[i] = false; env.snd.click(); pop(i, 6, '#c58bff'); return; }
      const t = chordTargets(b, i);
      if (!t) { env.snd.click(); return; }
      const bad = t.filter(j => b.mine[j]);
      t.filter(j => !b.mine[j]).forEach(j => { if (blocked(b, j) !== 'web') openAt(j, true); });
      env.snd.dig();
      bad.forEach(j => { if (!S.over) hurt(j); });
      checkWin();
      return;
    }
    const why = blocked(b, i);
    if (why === 'flag') { env.snd.click(); if (underFlags(b)) wrongFlags(); else S.say('FLAGGED. RIGHT-CLICK TO LIFT THE FLAG.', '#8794aa'); return; }
    if (why === 'web') { S.webBlocks++; env.snd.click(); S.say('WEBBED: OPEN A NEIGHBOUR FIRST.', '#cfd8e0'); S.shake = 0.3; return; }
    if (b.thorn[i]) { b.thorn[i] = 0; env.snd.pin(); pop(i, 8, '#7fe09a'); S.say('THE BRAMBLE IS CUT.', '#9fd8a8'); return; }
    if (b.mine[i]) { hurt(i); return; }
    openAt(i);
    checkWin();
  }

  /* ---- spells ------------------------------------------------------------ */
  /* A spell is aimed with Q or E and cast with a click. It used to stay aimed when the cast failed (no soul, a tile with nothing to do),
     so every later click was another "not enough soul" and the room could not be played on until a right-click happened to cancel it:
     a spell that cannot be cast is now never aimed, and a cast that does not go off lets go of the aim. */
  function cast(kind, i) {
    const b = S.b, cost = S.cost(kind);
    if (S.soul < cost) { S.target = null; S.say('NOT ENOUGH SOUL: ' + cost + ' NEEDED.', '#ff9090'); return; }
    if (b.rev[i] || b.def[i]) { S.say('PICK A TILE THAT IS STILL HIDDEN.', '#cfe6ff'); return; }
    S.soul -= cost; S.target = null; S.spells++;
    env.snd.tone && env.snd.tone(kind === 'scry' ? 880 : 220, 220, { type: 'sine', to: kind === 'scry' ? 1760 : 80, vol: 0.05 });
    if (kind === 'scry') {
      if (b.mine[i]) { b.flag[i] = true; S.say('A LARVA, SEEN AND MARKED.', '#cfe6ff'); pop(i, 10, '#cfe6ff'); }
      else { b.flag[i] = false; b.thorn[i] = 0; b.web[i] = false; openAt(i); S.say('SAFE GROUND.', '#cfe6ff'); }
    } else {
      around(b, i, diveRad()).forEach(j => {
        if (b.rev[j] || b.def[j]) return;
        if (b.mine[j]) { b.flag[j] = true; pop(j, 5, '#cfe6ff'); }
        else { b.flag[j] = false; b.thorn[j] = 0; b.web[j] = false; openAt(j, true); }
      });
      S.shake = 0.7; S.say('THE DIVE LANDS.', '#cfe6ff');
    }
    checkWin();
  }
  function focus() {
    const c = focusCost();
    if (S.hp >= S.hpMax) { S.say('YOU ARE WHOLE.'); return; }
    if (S.soul < c) { S.say('NOT ENOUGH SOUL: ' + c + ' NEEDED.', '#ff9090'); return; }
    S.soul -= c; S.hp = Math.min(S.hpMax, S.hp + (has('deep') ? 2 : 1)); S.spells++;
    env.snd.chime(); S.say('A MASK MENDS.', '#f2efe4'); S.flash = -1;
  }
  /* aim (or put down) a spell; false when it cannot be aimed, with the reason said */
  function aim(kind) {
    if (!S.started) { S.say('OPEN A TILE FIRST.'); return false; }
    if (S.target === kind) { S.target = null; return true; }
    if (S.soul < S.cost(kind)) { S.target = null; S.say(SPELLS[kind].name + ' NEEDS ' + S.cost(kind) + ' SOUL.', '#ff9090'); return false; }
    S.target = kind; S.say(SPELLS[kind].name + ': CHOOSE A TILE. RIGHT-CLICK CANCELS.', '#cfe6ff');
    return true;
  }

  /* ---- a hint for the one mistake the board cannot show you: every safe tile that is left is under a flag ---- */
  function wrongFlags() {
    if (S.over || !S.started || !underFlags(S.b)) return;
    S.say('A FLAG IS ON SAFE GROUND: RIGHT-CLICK IT.', '#ffd68c');
    S.flagHint = performance.now();
  }

  /* ---- input --------------------------------------------------------------- */
  S.mouse = (type, ev, lx, ly) => {
    if (type === 'move') {
      S.hover = S.idxAt(lx, ly);
      const k = camp && ly >= 606 ? Math.floor((lx - 14) / 150) : -1;
      S.barHover = k >= 0 && k < 3 && lx - 14 - k * 150 < 142 ? k : -1;
      return;
    }
    if (type === 'up') { S.held = false; return; }
    if (S.over || type !== 'down') return;
    if (camp && ly >= 606 && ev.button === 0) {                      /* the three keys along the bottom are buttons too */
      const k = Math.floor((lx - 14) / 150);
      if (k >= 0 && k < 3 && lx - 14 - k * 150 < 142) S.key({ key: 'fqe'[k] });
      return;
    }
    const i = S.idxAt(lx, ly);
    if (i < 0) { if (S.target && ev.button === 2) S.target = null; return; }
    S.clicks++;
    if (S.target) {
      if (ev.button === 2) { S.target = null; return; }
      if (ev.button !== 0 || !S.started) return;
      cast(S.target, i); return;
    }
    if (ev.button === 2) {
      if (S.b.rev[i] || S.b.def[i]) return;
      S.b.flag[i] = !S.b.flag[i]; if (S.b.flag[i]) S.flagsPlaced++; env.snd.pin(); wrongFlags(); return;
    }
    if (ev.button !== 0) return;
    S.held = true;
    if (!S.started) {
      S.started = true; S.t0 = Date.now(); S.fogAt = performance.now() + 9000;
      lay(S.b, i, S.mods);
    }
    clickOpen(i);
  };
  S.key = ev => {
    const k = ev.key.toLowerCase();
    if (S.over) return false;
    if (!camp) return false;
    const kind = { f: 'focus', q: 'scry', e: 'dive' }[k];
    if (!kind) return false;
    if (!S.learnt(kind)) { S.target = null; S.say('LOCKED: ' + SPELL_HINT[kind], '#ffd68c'); return true; }
    if (kind === 'focus') { if (S.started) focus(); else S.say('OPEN A TILE FIRST.'); return true; }
    aim(kind);
    return true;
  };

  /* spores settle every so often on a number that is already open */
  S.hasMod = m => S.mods.indexOf(m) >= 0;
  S.tick = now => {
    if (S.over || !S.started) { S.lastT = now; return; }
    /* the cold: soul seeps away at 1.6 a second (0.8 with the ember heart), a whole bar in about a minute */
    const prev = S.lastT || now, dt = Math.min(0.25, Math.max(0, (now - prev) / 1000));
    S.lastT = now;
    if (camp && S.hasMod('cold') && S.soul > 0) S.soul = Math.max(0, S.soul - dt * (has('ember') ? 0.8 : 1.6));
    if (!S.hasMod('spore') || now < S.fogAt) return;
    S.fogAt = now + 8000 + Math.random() * 3000;
    const b = S.b, c = [];
    for (let i = 0; i < b.n; i++) if (b.rev[i] && now > b.rev[i] + 1500 && b.cells[i] && !b.fog[i] && !b.def[i]) c.push(i);
    if (c.length) { const i = c[Math.floor(Math.random() * c.length)]; b.fog[i] = true; pop(i, 5, '#c58bff'); }
  };
  S.left = () => Math.max(0, lv.m - flagsUsed(S.b) - S.b.def.filter(Boolean).length);
  S.hidden = () => hiddenSafe(S.b);
  S.focusCost = focusCost; S.diveRad = diveRad;
  return S;
}
