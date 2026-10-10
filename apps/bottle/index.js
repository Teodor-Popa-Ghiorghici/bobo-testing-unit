import { Snd } from '../../kernel/snd.js';
import { makeSfx } from './sfx.js';
import { makeArt, BW, BH, C, GLS, BOT } from './art.js';
import { makeContainer } from './raster.js';
import { makeRoom } from './room.js';
import { clamp, makeSlosh, stepSlosh, JAG_FULL, JAG_SHOT, POURED_FILL, BOT_FULL, sway } from './physics.js';
import { startPour, pourStep } from './pour.js';
import { startDrink, drinkStep, restPose } from './drink.js';
import { makeGlass3D, setLiquor } from './glass3d.js';
import { drinkById, paletteOf, potionPercent, strengthOf } from './drinks.js';
import { DRINKS } from '../../kernel/cos_data.js';
import { scopedListeners, whenGone } from '../lifecycle.js';
import { poured, drank, loreKnock } from './trophy_calls.js';
import { STYLES, styleOf } from './styles.js';
import { burnOf, hitName } from '../../kernel/drunk_bac.js';
import { buffs } from '../buffs_scope.js';

const JAG_KEY = 'templeos.bottle.v1';
/* what the machine says as you go down, by how far you are */
const JAG_LINES = {
  'SOBER': ['GOOD.', 'STILL GOOD.'],
  'WARM': ['THAT IS THE ONE THAT WORKS.', 'A LITTLE WARMER NOW.'],
  'TIPSY': ['YOU ARE HAVING A LOVELY TIME.', 'THE ROOM IS SLIGHTLY WIDER NOW.'],
  'LOOSE': ['YOU HAVE OPINIONS ABOUT THE MENUBAR.', 'YOU SMILE AT THE CURSOR. IT SMILES BACK.'],
  'SLOSHED': ['YOU TELL THE MACHINE YOU LOVE IT.', 'THE MACHINE SAYS NOTHING BACK.'],
  'HAMMERED': ['PERHAPS SOME WATER.', 'THE FLOOR IS A SUGGESTION.'],
  'ABOUT TO GO': ['DRINK SOME WATER. THIS IS NOT A SUGGESTION.', 'THIS IS THE LAST ONE. IT IS NEVER THE LAST ONE.']
};
const BREATHER = 2.6;                       /* seconds after a measure before the next click means anything */
const REST_C = [BOT.rest[0], BOT.rest[1] - BOT.cy];
const GCX = GLS.rest[0], FLOOR = GLS.rest[1] - 6;

export default {
  id: 'bottle',
  title: 'THE BOTTLE',
  width: 430,
  height: 480,
  resizable: true,
  mount(root, ctx) {
    const body = root;
    const wrap = document.createElement('div');
    wrap.className = 'gamepane jagpane';
    const cv = document.createElement('canvas');
    cv.width = BW; cv.height = BH;
    cv.className = 'gamecv jagcv';
    cv.tabIndex = 0;
    wrap.appendChild(cv);
    const bar = document.createElement('div');
    bar.className = 'appbar';
    const bDrink = document.createElement('button'); bDrink.className = 'appbtn';
    const bBuy = document.createElement('button'); bBuy.className = 'appbtn'; bBuy.textContent = 'BUY A NEW BOTTLE';
    const bLore = document.createElement('button'); bLore.className = 'appbtn';
    const info = document.createElement('span'); info.className = 'godword';
    bar.appendChild(bDrink); bar.appendChild(bBuy); bar.appendChild(bLore); bar.appendChild(info);
    body.appendChild(wrap); body.appendChild(bar);

    const g = cv.getContext('2d');
    if (!g) { info.textContent = 'NO CANVAS.'; return; }
    g.imageSmoothingEnabled = false;
    /* what is in the bottle, and so what it looks like: the drink picked (Dave's DRINKS), its bottle built from three colours */
    let drink = drinkById('jager'), PAL = paletteOf(drink);
    let A = makeArt(g, PAL), R = A.R, T = A.T;
    const sfx = makeSfx(Snd);
    const gift = buffs();
    let botC = makeContainer(A.bottleSpec);
    const glass = makeGlass3D();
    const room = makeRoom();
    let roomKey = '', shelfDrinks = [];                                    /* the other bottles you own, standing on the shelf behind the table (room.js) */
    const owned = () => DRINKS.filter(d => window.Cos.has('drink', d.id));

    const S = {
      ml: JAG_FULL, drunk: 0, bottles: 1, shelf: {}, phase: 'idle', t: 0, note: '', noteT: 0, rest: 0,
      bot: { c: REST_C.slice(), a: 0, vol: BOT_FULL, capOn: true, surf: null, n0: botC.n0, geo: A.geo, slosh: makeSlosh() },
      gls: { pose: restPose(), vol: 0 },
      sipDrops: [], stream: 0, q: 0, lip: null, glassSurf: FLOOR, glassVol: 0, glugPh: 0, glugIn: 0, dripIn: 0,
      bubbles: [], fizz: [], rings: [], drops: [], flight: [], ringIn: 0, foam: 0, poured: 0, swallowed: 0, pending: 0
    };
    let wasFull = 0;
    const L = scopedListeners(root);
    try {
      const raw = JSON.parse(localStorage.getItem(JAG_KEY) || 'null');
      if (raw) {
        S.ml = raw.ml == null ? JAG_FULL : raw.ml; S.drunk = raw.drunk || 0; S.bottles = raw.bottles || 1; wasFull = raw.glass || 0; S.shelf = raw.shelf || {};
        if (raw.drink && window.Cos.has('drink', raw.drink)) { drink = drinkById(raw.drink); PAL = paletteOf(drink); A = makeArt(g, PAL); R = A.R; T = A.T; botC = makeContainer(A.bottleSpec); S.bot.n0 = botC.n0; S.bot.geo = A.geo; }
      }
    } catch (e) {}
    setLiquor(PAL.room);
    S.bot.vol = (S.ml / JAG_FULL) * BOT_FULL;
    S.gls.vol = wasFull ? POURED_FILL : 0;
    const save = () => { try { localStorage.setItem(JAG_KEY,
      JSON.stringify({ ml: S.ml, drunk: S.drunk, bottles: S.bottles, glass: S.gls.vol > 0.55 ? 1 : 0, drink: drink.id, shelf: S.shelf })); } catch (e) {} };
    const say = t => { S.note = t; S.noteT = 3; };
    const full = () => S.gls.vol > 0.55;
    const fx = { sfx, get glassSurf() { return S.glassSurf; }, faint: () => { if (window.Drunk && window.Drunk.knockOut && window.Drunk.knockOut()) loreKnock(); } };
    let pouringSnd = false;

    /* ---- the picture ---------------------------------------------------- */
    function drawStream(ts) {
      const L = S.lip;
      if (!L || S.stream < 0.03) return;
      const tEnd = Math.max(0.05, (Math.sqrt(L.vy * L.vy + 2 * 520 * Math.max(6, S.glassSurf - L.y)) - L.vy) / 520);
      let px = L.x, py = L.y;
      for (let t = 0.011; t < tEnd + 0.011; t += 0.011) {
        const tt = Math.min(t, tEnd);
        const x = L.x + L.vx * tt + Math.sin(ts * 31 + tt * 40) * 0.4, y = L.y + L.vy * tt + 260 * tt * tt;
        const spd = Math.hypot(L.vx, L.vy + 520 * tt);
        /* continuity: the faster it falls the thinner it gets, but it never quite vanishes */
        const w = Math.max(2, Math.round(S.q / Math.max(30, spd) * 1.5));
        const dx = x - px, dy = y - py;
        const c = (x0, y0, ww, hh, col) => R(x0, y0, ww, hh, col);
        if (Math.abs(dy) >= Math.abs(dx)) {
          c(Math.min(px, x) - w / 2, Math.min(py, y), w, Math.abs(dy) + 1, PAL.stream[0]);
          c(Math.min(px, x) - w / 2 + 1, Math.min(py, y), Math.max(1, w - 2), Math.abs(dy) + 1, PAL.stream[1]);
          c(Math.min(px, x) - w / 2, Math.min(py, y), 1, Math.abs(dy) + 1, PAL.stream[2]);
        } else {
          c(Math.min(px, x), Math.min(py, y) - w / 2, Math.abs(dx) + 1, w, PAL.stream[0]);
          c(Math.min(px, x), Math.min(py, y) - w / 2 + 1, Math.abs(dx) + 1, Math.max(1, w - 2), PAL.stream[1]);
          c(Math.min(px, x), Math.min(py, y) - w / 2, Math.abs(dx) + 1, 1, PAL.stream[2]);
        }
        px = x; py = y;
      }
      const w0 = Math.max(2, Math.round(S.q / 60 * 1.5));
      S.landX = px;
      R(S.landX - w0 / 2 - 2, S.glassSurf - 1, w0 + 4, 2, PAL.stream[2]);
    }

    function draw(ts) {
      const B = S.bot, G = S.gls;
      room.paint(g, roomKey, shelfDrinks);
      if (gift.has('jager_coaster')) A.coaster();                       /* HOLYC.EXE's quiet gift: a coaster under the glass */
      A.shadow(GLS.rest[0], 293, 84);
      if (S.phase === 'idle' || (S.phase === 'pour' && S.sub === 'return' && B.c[1] > REST_C[1] - 6)) A.shadow(70, 246, 86);
      if (!B.capOn) A.capOnBar();
      const bpose = { x: B.c[0], y: B.c[1], a: B.a };
      const rb = botC.render(g, bpose, { frac: B.vol, slope: Math.tan(B.slosh.a), layer: B.capOn ? 0 : 1, wave: S.phase === 'pour' ? 0.9 : 0, phase: ts * 9 });
      B.surf = { c: rb.c, slope: rb.slope, c0: rb.c0 };
      /* air going in as the liquor comes out */
      S.bubbles.forEach(b => { if (botC.inside(bpose, b.x, b.y)) { g.globalAlpha = 0.75; R(b.x, b.y, b.r, b.r, '#d8f0d0'); } });
      g.globalAlpha = 1;
      /* the reckoning: drawn first, so a glass brought up close covers it */
      const frac = clamp(S.ml / JAG_FULL, 0, 1);
      const shots = Math.floor(S.ml / JAG_SHOT + 1e-6);
      T(drink.name, 190, 20, PAL.title, 13, 'center');
      T(S.ml.toFixed(0) + ' ML LEFT  ·  ' + shots + ' MEASURE' + (shots === 1 ? '' : 'S'), 190, 34, C.white, 9, 'center');
      const drinking = S.phase === 'drink';
      if (!drinking) {
        R(136, 300, 108, 8, '#1a1008');
        R(137, 301, Math.round(106 * frac), 6, frac > 0.25 ? C.label : '#c8542a');
        T('BOTTLE ' + S.bottles + (window.Drunk ? '  ·  ' + window.Drunk.stage() : '') + '  ·  HAND: ' + (S.forceStyle != null ? STYLES[S.forceStyle] : styleOf(sway())).name, 190, 322, C.dim, 8, 'center');
        T('DRUNK: ' + S.drunk + ' MEASURE' + (S.drunk === 1 ? '' : 'S') +
          '  (' + (S.drunk * JAG_SHOT / 1000).toFixed(2) + ' L)', 190, 336, C.white, 8, 'center');
      }
      const hint = S.phase === 'pour' ? 'POURING...'
                 : S.phase === 'drink' ? 'DOWN IT GOES...'
                 : S.rest > 0 ? 'CATCH YOUR BREATH...'
                 : full() ? 'CLICK TO DRINK'
                 : S.ml < JAG_SHOT ? 'THE BOTTLE IS EMPTY'
                 : 'CLICK TO POUR';
      T(S.note || hint, 190, drinking ? 50 : 350, S.note ? PAL.title : C.dim, 8, 'center');
      /* the glass: lifted to the screen and tipped toward whoever is at it, when it is being drunk */
      const rg = glass.render(g, G.pose, { vol: G.vol, foam: S.foam > 0.1 ? Math.min(2.5, S.foam) : 0 });
      if (S.phase === 'drink') {
        if (rg.spilled > 0) {
          G.vol = rg.vol; S.pending += rg.spilled;
          /* what goes over the edge heads for the viewer, and is gone off the bottom of the picture */
          for (let k = 0; k < 2; k++) S.sipDrops.push({ x: rg.rimLow[0] + (Math.random() - 0.5) * 30, y: rg.rimLow[1], vx: (Math.random() - 0.5) * 20,
            vy: 20 + Math.random() * 40, r: 4 + Math.random() * 3 * rg.scale, g: 0.4 + Math.random() * 0.6 });
        }
      } else S.glassSurf = Math.min(FLOOR, rg.surfY);
      S.glassVol = G.vol;
      S.sipDrops.forEach(d => { R(d.x, d.y, d.r, d.r, PAL.drop); R(d.x, d.y, d.r, Math.max(1, d.r / 4), PAL.stream[2]); });
      drawStream(ts);
      /* what is thrown up when the stream lands, and the drops that leave the lip */
      S.rings.forEach(r => { g.globalAlpha = 1 - r.t / r.life; R(r.x - r.r, S.glassSurf - 1, r.r * 2, 1, PAL.foam); });
      g.globalAlpha = 1;
      S.fizz.forEach(f => R(f.x, f.y, f.r, f.r, f.y < S.glassSurf + 3 ? PAL.foam : PAL.fizz));
      S.drops.forEach(p => R(p.x, p.y, p.r || 2, p.r || 2, p.c === 'liq' ? PAL.drop : p.c));
      g.globalAlpha = 0.06;
      const gr = g.createLinearGradient(0, 0, BW, BH);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, BW, BH);
      g.globalAlpha = 1;
    }

    /* ---- what a click does ----------------------------------------------- */
    function next() {
      if (full()) {
        S.lore = !!(window.Drunk && window.Drunk.loreOn && window.Drunk.loreOn() && drink.abv > 0);
        S.pct = drink.potion ? potionPercent() : null;                       /* the homemade potion: this sip is whatever it is */
        S.sipUnits = strengthOf(drink, S.pct);
        S.burn = burnOf(S.sipUnits * 35);                                      /* how hard this one hits the throat: the glass flinches, the screen flushes */
        startDrink(S); sfx.sip(); return true;
      }
      if (S.ml < JAG_SHOT) { say('EMPTY. BUY ANOTHER ONE.'); sfx.deny(); return false; }
      startPour(S); sfx.cap(); return true;
    }
    /* ---- which bottle is on the table ---------------------------------------- */
    const quip = d => d.potion ? d.name + '.  ?% VOL.  SOMEWHERE BETWEEN ONE AND NINETY-NINE, AND A DIFFERENT ONE EVERY SIP.' : d.name + '.  ' + d.abv + '% VOL.  ' + (d.strength === 0 ? 'NOTHING IN IT AT ALL.' : d.strength >= 1.5 ? 'EACH ONE COUNTS AS ' + d.strength.toFixed(1) + ' JÄGER. GO CAREFULLY.' : d.strength < 0.7 ? 'GENTLE: IT TAKES A LOT OF THEM.' : 'ABOUT AS STRONG AS WHAT YOU WERE DRINKING.');
    function setDrink(d) {
      S.shelf[drink.id] = S.ml;                                  /* the one on the table goes back on the shelf, as full as it is */
      drink = d; PAL = paletteOf(d);
      A = makeArt(g, PAL); R = A.R; T = A.T;
      botC = makeContainer(A.bottleSpec); S.bot.n0 = botC.n0; S.bot.geo = A.geo;
      setLiquor(PAL.room);
      S.ml = S.shelf[d.id] != null ? S.shelf[d.id] : JAG_FULL;
      S.bot.vol = (S.ml / JAG_FULL) * BOT_FULL; S.bot.a = 0; S.bot.c = REST_C.slice(); S.bot.capOn = true;
      S.gls.vol = 0; S.foam = 0;
      refreshBar(); save(); sfx.cork();
      say(quip(d));
    }
    function refreshRoom() { shelfDrinks = owned().filter(d => d.id !== drink.id); roomKey = drink.id + '|' + shelfDrinks.map(d => d.id).join(','); }
    function refreshBar() { refreshRoom(); bDrink.textContent = 'DRINK: ' + drink.name; bDrink.title = owned().length > 1 ? 'CHANGE WHAT YOU ARE POURING' : 'DAVE SELLS OTHER BOTTLES'; }
    bDrink.addEventListener('click', () => {
      if (S.phase !== 'idle') return;
      if (full()) { say('FINISH THE GLASS FIRST.'); sfx.deny(); cv.focus(); return; }
      const own = owned();
      if (own.length < 2) { say('ONLY ' + drink.name + ' ON THE SHELF. DAVE SELLS OTHERS.'); ctx.openWindow('shop', { tab: 'drink' }).catch(() => {}); return; }
      setDrink(own[(own.findIndex(d => d.id === drink.id) + 1) % own.length]);
      cv.focus();
    });
    /* LORE ACCURATE: earned by passing out five times and owning every bottle there is to find, then a switch. Until then it is a dashed button that says how far off it is. */
    function refreshLore() {
      const D = window.Drunk, st = D && D.loreStatus ? D.loreStatus() : null;
      if (!st) { bLore.style.display = 'none'; return; }
      bLore.style.display = '';
      bLore.disabled = !st.unlocked;
      bLore.textContent = !st.unlocked ? 'LORE ACCURATE: LOCKED' : 'LORE ACCURATE: ' + (D.loreOn() ? 'ON' : 'OFF');
      bLore.title = !st.unlocked ? 'PASS OUT FIVE TIMES (' + st.blackouts + ' OF ' + st.needBlackouts + ') AND OWN EVERY BOTTLE (' + st.bottles + ' OF ' + st.of + ').'
        : 'THE FIRST SIP OF ANYTHING WITH ALCOHOL IN IT KNOCKS YOU OUT. THE CORDIAL IS STILL SAFE.';
    }
    bLore.addEventListener('click', () => {
      if (S.phase !== 'idle' || !window.Drunk) return;
      const on = window.Drunk.setLore(!window.Drunk.loreOn());
      say(on ? 'LORE ACCURATE. ONE SIP AND YOU ARE DOWN.' : 'LORE ACCURATE IS OFF. YOU CAN HOLD IT AGAIN.'); sfx.cork(); refreshLore(); cv.focus();
    });
    L.on(window, 'cos-changed', () => { refreshBar(); refreshLore(); });
    L.on(window, 'lore-changed', refreshLore);
    refreshBar(); refreshLore();

    /* a click is for now. While a measure is being poured or drunk, or while whoever
       it is gets their breath back, it does nothing at all: nothing is kept for later,
       and nothing can be hurried by it. */
    function request() {
      if (window.Drunk && window.Drunk.blackedOut && window.Drunk.blackedOut()) return;
      if (S.phase === 'idle' && S.rest <= 0) next();
    }
    cv.addEventListener('mousedown', ev => { ev.stopPropagation(); cv.focus(); if (ev.button === 0) request(); });
    cv.addEventListener('keydown', ev => {
      if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); if (!ev.repeat) request(); }
    });
    bBuy.addEventListener('click', () => {
      if (S.phase !== 'idle') return;
      S.ml = JAG_FULL; S.bottles++; S.bot.vol = BOT_FULL; save(); sfx.cork();
      say('A NEW BOTTLE. THE SAME AS THE LAST ONE.');
      cv.focus();
    });

    function donePour() {
      S.phase = 'idle'; S.stream = 0; S.q = 0; S.lip = null;
      S.ml = Math.max(0, S.ml0 - JAG_SHOT);
      S.bot.vol = (S.ml / JAG_FULL) * BOT_FULL; S.bot.a = 0; S.bot.c = REST_C.slice(); S.bot.capOn = true;
      S.gls.vol = Math.min(0.95, (S.gls0 || 0) + POURED_FILL);
      S.foam = 2.4;
      sfx.clink(); save();
      say('ONE MEASURE. FORTY MILLILITRES.'); poured();
    }
    function doneDrink() {
      S.phase = 'idle'; S.drunk++; S.rest = BREATHER;
      S.gls.vol = Math.min(S.gls.vol, 0.03);
      const units = S.sipUnits != null ? S.sipUnits : drink.strength, burn = S.burn || 0;
      sfx.down(); if (burn > 0.7) sfx.cough(burn); else sfx.ahh(burn); save();
      if (window.Drunk && !S.lore) window.Drunk.drink(units);                           /* with LORE ACCURATE on, the first swallow was the whole journey */
      drank(drink.id, units);
      const lines = JAG_LINES[window.Drunk ? window.Drunk.stage() : 'SOBER'] || JAG_LINES.SOBER;
      /* a potion says what that sip was, and so does anything strong enough to have burned */
      say(S.lore ? 'LORE ACCURATE. ONE SIP.' : S.pct ? 'THAT SIP WAS ' + S.pct + '%: ' + hitName(S.pct) + '. ' + lines[S.drunk % lines.length]
        : burn >= 0.55 ? hitName(units * 35) + '. ' + lines[S.drunk % lines.length] : lines[S.drunk % lines.length]);
    }

    /* ---- the simulation --------------------------------------------------- */
    function step(rdt) {
      const dt = rdt;
      if (S.rest > 0) S.rest -= rdt;
      if (S.noteT > 0) { S.noteT -= rdt; if (S.noteT <= 0) S.note = ''; }
      let done = false;
      if (S.phase === 'pour') done = pourStep(S, dt, fx);
      else if (S.phase === 'drink') done = drinkStep(S, dt, fx);
      else { S.stream = 0; }
      /* what has landed in the glass */
      for (let i = S.flight.length - 1; i >= 0; i--) {
        if (S.flight[i].at <= S.t) { S.gls.vol = Math.min(0.95, S.gls.vol + S.flight[i].dv); S.flight.splice(i, 1); }
      }
      stepSlosh(S.bot.slosh, S.bot.c[0], S.bot.c[1], S.bot.a, dt, 0.4);
      /* the stream's sound, and its splash */
      if (S.stream > 0.04 && !pouringSnd) { pouringSnd = true; sfx.pourStart(); }
      if (pouringSnd) sfx.pourSet(S.stream, S.gls.vol);
      if (pouringSnd && S.stream < 0.02) { pouringSnd = false; sfx.pourEnd(); }
      const lx = S.landX == null ? GCX : S.landX;
      if (S.stream > 0.1 && S.phase === 'pour') {
        S.ringIn -= dt;
        if (S.ringIn <= 0) { S.ringIn = 0.13; S.rings.push({ x: lx, r: 2, t: 0, life: 0.7 }); }
        for (let k = 0; k < 2; k++) S.drops.push({ x: lx + (Math.random() - 0.5) * 6, y: S.glassSurf, vx: (Math.random() - 0.5) * 70, vy: -30 - Math.random() * 70, life: 0.45, c: Math.random() < 0.5 ? PAL.stream[2] : PAL.foam });
        if (Math.random() < 0.7) S.fizz.push({ x: lx + (Math.random() - 0.5) * 14, y: S.glassSurf + 4 + Math.random() * 10, r: 1 + (Math.random() < 0.3 ? 1 : 0), vy: -24 - Math.random() * 20 });
        S.foam = Math.min(2.6, S.foam + dt * 3);
      } else S.foam = Math.max(0, S.foam - dt * 0.35);
      /* bits */
      S.sipDrops = S.sipDrops.filter(d => { d.y += d.vy * dt; d.x += d.vx * dt; d.vy += 520 * dt; d.r += dt * 6; return d.y < BH; });
      S.bubbles = S.bubbles.filter(b => { b.y += b.vy * dt; return b.y > 0 && b.y > (S.bot.surf ? S.bot.surf.c + S.bot.surf.slope * b.x : 0); });
      S.fizz = S.fizz.filter(f => { f.y += f.vy * dt; return f.y > S.glassSurf + 1 && S.gls.vol > 0.05; });
      S.rings.forEach(r => { r.t += dt; r.r += dt * 26; });
      S.rings = S.rings.filter(r => r.t < r.life);
      S.drops = S.drops.filter(d => {
        d.life -= dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 420 * dt;
        return d.life > 0 && d.y < (d.drip ? S.glassSurf : S.glassSurf + 2);
      });
      if (done) {
        if (S.phase === 'pour') donePour(); else doneDrink();
      }
    }

    /* coming round: somebody has been tidying */
    L.on(window, 'blackout-end', () => {
      S.rest = BREATHER;
      if (S.phase === 'idle') S.gls.vol = 0;
      say('YOU WAKE UP. THE TABLE IS TIDY. NOBODY WILL SAY WHO.');
    });

    let alive = true, raf = null, last = 0;
    function frame(ts) {
      if (!alive || !document.body.contains(cv)) {
        alive = false; if (raf) cancelAnimationFrame(raf); sfx.pourEnd(); return;
      }
      raf = requestAnimationFrame(frame);
      if (window.__jagTest && window.__jagTest.pause) return;
      /* a slow frame is taken as several short steps, so a pour lasts as long as
         it should on a machine that draws four frames a second, and the physics
         never sees a step it was not tuned for */
      const t = ts / 1000, total = Math.min(0.25, t - last || 0); last = t;
      const n = Math.max(1, Math.ceil(total / 0.04));
      for (let i = 0; i < n; i++) step(total / n);
      draw(t);
    }
    raf = requestAnimationFrame(frame);
    whenGone(cv, () => { alive = false; if (raf) cancelAnimationFrame(raf); sfx.pourEnd(); });
    info.textContent = 'CLICK TO POUR, CLICK AGAIN TO DRINK. THERE IS NO HURRYING IT.';
    setTimeout(() => cv.focus(), 40);
    if (window.__jagTest) window.__jagTest = { S, step, draw, request, g, cv, sfx, pause: false };
  }
};
