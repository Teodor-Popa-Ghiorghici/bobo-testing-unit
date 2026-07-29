import { createWindow, raise, sysDialog, toast } from '../../kernel/wm.js';
import { Snd } from '../../kernel/snd.js';
import { Cos } from '../../kernel/cos.js';
import { fs as vfs } from '../../kernel/vfs.js';
import { MG_SAVE, MG_SCALE, mgFmt, MG_B, MG_TIER_AT, MG_TIER_COST, MG_CLICK, MG_KAV, MG_DIAS,
         MG_SPEC, MG_ACH, MG_LEG, MG_NEWS, MG_DICT, MG_ARG, MG_HZ, MG_SONGS } from './data.js';
import { CRT, Vol, musGain } from '../../kernel/hardware.js';
import { VGA16 } from '../../kernel/god.js';

export default {
  open() {
  createWindow({
    kind: 'app', title: 'Magen', w: 900, h: 590,
    build: body => {
      const root = document.createElement('div');
      root.className = 'mgroot';
      root.dataset.mood = '';
      root.innerHTML =
        '<div class="mgnews"><span class="mgticker"></span></div>' +
        '<div class="mgbody">' +
          '<div class="mgleft">' +
            '<div class="mgcount"><b class="mgn">0</b><span class="mgu">mitzvot</span></div>' +
            '<div class="mgrate">per second: <b>0</b></div>' +
            '<div class="mggoal"><span>&nbsp;</span><b></b><i></i></div>' +
            '<div class="mgstagewrap"><canvas class="mgcv" width="300" height="300"></canvas></div>' +
            '<div class="mgbuffs"></div>' +
            '<div class="mgact"></div>' +
          '</div>' +
          '<div class="mgright">' +
            '<div class="mgtabs">' +
              '<button class="mgtab on" data-t="store">STORE</button>' +
              '<button class="mgtab" data-t="ups">UPGRADES<i></i></button>' +
              '<button class="mgtab" data-t="ach">MITZVOT</button>' +
              '<button class="mgtab" data-t="stats">STATS</button>' +
              '<button class="mgtab" data-t="dict">WORDS</button>' +
              '<button class="mgtab" data-t="leg">L\'DOR VADOR</button>' +
            '</div>' +
            '<div class="mgpane"></div>' +
          '</div>' +
        '</div>' +
        '<div class="mgbar">' +
          '<button class="appbtn mgbuy on" data-n="1">BUY 1</button>' +
          '<button class="appbtn mgbuy" data-n="10">10</button>' +
          '<button class="appbtn mgbuy" data-n="100">100</button>' +
          '<button class="appbtn mgbuy" data-n="-1">SELL</button>' +
          '<span class="nsep"></span>' +
          '<button class="appbtn mgsave">SAVE</button>' +
          '<button class="appbtn mgopt">&hellip;</button>' +
          '<button class="appbtn mgwipe">WIPE EVERYTHING</button>' +
          '<span class="mghint"></span>' +
        '</div>' +
        '<div class="mgtip"></div>';
      body.appendChild(root);

      const $  = q => root.querySelector(q);
      const cv = $('.mgcv'), g = cv.getContext('2d');
      if (!g) { $('.mghint').textContent = 'NO CANVAS.'; return; }
      const pane = $('.mgpane'), tip = $('.mgtip');

      /* ---- 32.13 the sixteen, again ----------------------------------- */
      const C = i => { const p = VGA16[i] || VGA16[7]; return 'rgb(' + p[0] + ',' + p[1] + ',' + p[2] + ')'; };
      const R = (x, y, w, h, c) => {
        if (w <= 0 || h <= 0 || VGA16[c] == null) return;
        g.fillStyle = C(c);
        g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
      };
      const DIT = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
      const patC = {};
      function pat(c, s) {
        const k = c + ':' + s;
        if (patC[k]) return patC[k];
        const p = document.createElement('canvas'); p.width = 4; p.height = 4;
        const q = p.getContext('2d'); q.fillStyle = C(c);
        for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (DIT[j][i] < s) q.fillRect(i, j, 1, 1);
        patC[k] = g.createPattern(p, 'repeat');
        return patC[k];
      }
      const wash = (x, y, w, h, c, s) => {
        const n = Math.max(0, Math.min(16, Math.round(s)));
        if (n <= 0 || w <= 0 || h <= 0) return;
        g.fillStyle = pat(c, n);
        g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
      };
      function oval(cx, cy, rx, ry, c) {
        for (let y = -ry; y <= ry; y++) {
          const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
          if (w > 0) R(cx - w, cy + y, w * 2 + 1, 1, c);
        }
      }
      function washOval(cx, cy, rx, ry, c, s) {
        const n = Math.max(0, Math.min(16, Math.round(s)));
        if (n <= 0) return;
        g.fillStyle = pat(c, n);
        for (let y = -ry; y <= ry; y++) {
          const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
          if (w > 0) g.fillRect(cx - w, cy + y, w * 2 + 1, 1);
        }
      }
      /* An equilateral triangle, filled by scanlines. There is no other way to
         draw one on a machine that will not draw a diagonal for you. */
      function tri(cx, cy, Rr, up, c) {
        const hh = Rr * 1.5, hb = Rr * 0.8660254;
        for (let i = 0; i <= hh; i++) {
          const w = Math.round((i / hh) * hb);
          const y = up ? cy - Rr + i : cy + Rr - i;
          R(cx - w, y, w * 2 + 1, 1, c);
        }
      }
      /* A hexagram is two of those crossed — but both triangles are centred on
         the same x, so their spans on any one row are both symmetric and the
         union is simply the wider of the two. That makes the whole star one
         run per row, which is what lets it be lit and shaded like a solid
         object instead of being painted over with a rectangle afterwards. */
      function starRow(Rr, y) {
        const hh = Rr * 1.5, hb = Rr * 0.8660254;
        const a = (y + Rr) / hh, b = (Rr - y) / hh;
        const k = Math.max(a > 1 ? 0 : a, b > 1 ? 0 : b);
        return Math.round(Math.max(0, k) * hb);
      }
      /* The lighting is two dithered sheens and two hard edges rather than
         two half-fills: a half-fill turns a gold star into a white star on
         top of a brown one, and what is wanted is one gold star with a light
         on it. */
      function star(cx, cy, Rr, c, edge, lit, shade) {
        for (let y = -Rr; y <= Rr; y++) {
          const w = starRow(Rr, y);
          if (w < 0) continue;
          if (edge != null) R(cx - w - 2, cy + y, w * 2 + 5, 1, edge);
          R(cx - w, cy + y, w * 2 + 1, 1, c);
          if (shade != null && y > Rr * 0.05) {
            g.fillStyle = pat(shade, 5);
            g.fillRect(cx + Math.round(w * 0.15), cy + y, Math.round(w * 0.85) + 1, 1);
            R(cx + w - 2, cy + y, 3, 1, shade);
          }
          if (lit != null && y < -Rr * 0.05) {
            g.fillStyle = pat(lit, 5);
            g.fillRect(cx - w, cy + y, Math.round(w * 0.85), 1);
            R(cx - w, cy + y, Math.min(4, w * 2 + 1), 1, lit);
          }
        }
      }

      /* ---- 32.14 state ------------------------------------------------- */
      const idx = {}; MG_B.forEach((b, i) => idx[b.id] = i);
      const fresh = () => ({
        v: 1, mitz: 0, total: 0, run: 0, clicks: 0, hand: 0,
        own: MG_B.map(() => 0), tier: MG_B.map(() => 0),
        up: {},                         /* every bought upgrade id */
        ach: {},                        /* every completed mitzvah id */
        flag: {},
        gold: 0, shab: 0, args: 0, asc: 0,
        zech: 0, spent: 0, leg: {},
        shabIn: 360, shabT: 0, menu: 0, litFor: 0,
        buffs: [], t: Date.now(), born: Date.now()
      });
      let S = fresh();
      let mode = 'store', buyN = 1, alive = true, frameStamp = 0;

      const legOn = id => !!S.leg[id];
      const upOn  = id => !!S.up[id];

      /* ---- 32.15 the sums ---------------------------------------------- */
      /* the tier doubling for one building, plus the minyan bonus */
      function bMult(i) {
        let m = Math.pow(2, S.tier[i]);
        if (upOn('s_min')) m *= 1 + Math.floor(S.own[i] / 10) * 0.02;
        return m;
      }
      function achCount() { let n = 0; for (const k in S.ach) if (S.ach[k]) n++; return n; }
      function upCount()  { let n = 0; for (const k in S.up)  if (S.up[k])  n++; return n; }
      /* Kavanah is the milk: it rises with every mitzvah completed, and on its
         own it does nothing at all. The upgrades are what turn it into a
         number, which is a fairly exact model of the doctrine. */
      function kavanah() {
        const base = achCount() / MG_ACH.length;
        return legOn('l_mem') ? base + 0.5 * (S.baseKav || 0) : base;
      }
      function kavMult() {
        const k = kavanah();
        const boost = upOn('s_pir') ? 1.25 : 1;
        let m = 1;
        MG_KAV.forEach(u => { if (upOn(u.id)) m *= 1 + k * u.f * boost; });
        return m;
      }
      function zechPer() { return legOn('l_tik') ? 0.05 : legOn('l_zech') ? 0.03 : 0.02; }
      function globalMult() {
        let m = kavMult() * (1 + S.zech * zechPer());
        let d = 0; MG_DIAS.forEach(u => { if (upOn(u.id)) d += u.pct; });
        m *= 1 + d;
        if (upOn('s_lam')) m *= 1.36;
        S.buffs.forEach(b => { if (b.m) m *= b.m; });
        return m;
      }
      /* Shabbat: everything rests. The neighbour keeps it at 60% and without
         him it drops to 15%, and either way the rest is banked as menuchah
         and paid back at havdalah. */
      function shabMult() {
        if (!S.shabT) return 1;
        let r = upOn('s_goy') ? 0.6 : 0.15;
        if (upOn('s_shm')) r *= 2;
        if (legOn('l_shab')) r *= 1.35;
        return Math.min(1, r);
      }
      /* rawMps is pure given the state, and the state only changes between
         frames — but it was being recomputed in the loop, four more times
         inside checkAch, again for the goal bar and again per tooltip. One
         stamp per frame lets them all share an answer. */
      let ecoStamp = -1, ecoRaw = 0;
      function ecoDirty() { ecoStamp = -1; }
      function rawMps() {
        if (ecoStamp === frameStamp) return ecoRaw;
        let t = 0;
        for (let i = 0; i < MG_B.length; i++) t += S.own[i] * MG_B[i].mps * bMult(i);
        ecoRaw = t * globalMult();
        ecoStamp = frameStamp;
        return ecoRaw;
      }
      function mps() { return rawMps() * shabMult(); }
      function clickPower() {
        let m = 1, p = 0;
        MG_CLICK.forEach(u => { if (upOn(u.id)) { if (u.mult) m *= u.mult; if (u.pct) p += u.pct; } });
        let v = (m + rawMps() * p) * globalMult();
        S.buffs.forEach(b => { if (b.c) v *= b.c; });
        return v;
      }
      function cost(i, n, from) {
        const have = from == null ? S.own[i] : from;
        let t = 0;
        for (let k = 0; k < n; k++) t += MG_B[i].cost * Math.pow(1.15, have + k);
        return t;
      }
      function sellBack(i, n) {
        let t = 0;
        for (let k = 0; k < n; k++) t += MG_B[i].cost * Math.pow(1.15, S.own[i] - 1 - k) * 0.25;
        return t;
      }
      function tierCost(i) { return MG_B[i].cost * MG_TIER_COST[S.tier[i]]; }
      function tierOpen(i) { return S.tier[i] < 5 && S.own[i] >= MG_TIER_AT[S.tier[i]]; }

      /* ---- 32.16 what is for sale right now ----------------------------- */
      function specOpen(u) {
        if (!u.need) return true;
        const k = u.need[0], v = u.need[1];
        if (k === 'gold') return S.gold >= v;
        if (k === 'ach')  return achCount() >= v;
        if (k === 'shab') return S.shab >= v;
        return S.own[idx[k]] >= v;
      }
      function upgradeList() {
        const out = [];
        MG_B.forEach((b, i) => {
          if (tierOpen(i)) out.push({ k: 'tier', i: i, id: 'tier_' + b.id + '_' + S.tier[i],
            n: b.up[S.tier[i]].toUpperCase(), c: tierCost(i), b: b.id, tier: S.tier[i] + 1,
            d: b.d, m: b.n + ' produce twice as much. This is tier ' + (S.tier[i] + 1) + ' of 5.',
            tag: 'TIER ' + (S.tier[i] + 1) });
        });
        const add = (u, tag) => out.push({ k: 'up', id: u.id, n: u.n, c: u.cost,
                                           d: u.d, m: u.m, tag: tag });
        MG_CLICK.forEach(u => { if (!upOn(u.id) && S.total >= u.cost / 12) add(u, 'HAND'); });
        MG_KAV.forEach(u => { if (!upOn(u.id) && achCount() >= 5 && S.total >= u.cost / 20) add(u, 'KAVANAH'); });
        MG_DIAS.forEach(u => { if (!upOn(u.id) && specOpen(u)) add(u, 'COMMUNITY'); });
        MG_SPEC.forEach(u => { if (!upOn(u.id) && specOpen(u)) add(u, 'RULE'); });
        return out.sort((a, b) => a.c - b.c);
      }

      /* ---- 32.17 buying ------------------------------------------------- */
      /* rowY: where in the window the row you clicked is, so the icon can fly
         from the thing you pressed rather than from nowhere */
      function rowY(el) {
        if (!el) return 150;
        const a = el.getBoundingClientRect(), b = cv.getBoundingClientRect();
        return Math.max(10, Math.min(290, (a.top + a.height / 2 - b.top) * (cv.height / cv.clientHeight)));
      }
      function buy(i, el) {
        const y = rowY(el);
        if (buyN < 0) {
          const n = Math.min(S.own[i], 10);
          if (!n) { sfx.no(); return; }
          const back = sellBack(i, n);
          S.mitz += back; S.own[i] -= n; ecoDirty();
          sfx.sell();
          flyer(y, 'b', MG_B[i].id, 0, true);
          spray(CX, CY, 10, 8, 90);
          float(CX, CY - 40, '-' + n + ' ' + MG_B[i].n, 12);
          float(CX, CY + 20, '+' + mgFmt(back), 10);
          kick(2, 0.12, 12);
          if (el) { el.classList.remove('sold'); void el.offsetWidth; el.classList.add('sold'); }
          refreshAll(); return;
        }
        let n = 0, spent = 0;
        for (let k = 0; k < buyN; k++) {
          const c = MG_B[i].cost * Math.pow(1.15, S.own[i] + k);
          if (spent + c > S.mitz) break;
          spent += c; n++;
        }
        if (!n) { sfx.no(); kick(1); if (el) { el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); } return; }
        S.mitz -= spent; S.own[i] += n; ecoDirty();
        sfx.buy(i, n);
        popT[i] = 0.7;
        flyer(y, 'b', MG_B[i].id);
        spray(CX, CY, 8 + Math.min(14, n), 14, 110);
        ring(CX, CY, 90, 11, 0.45);
        float(CX, CY - 44, '+' + n + ' ' + MG_B[i].n, 11);
        kick(3, 0.16, 11);
        if (el) { el.classList.remove('bought'); void el.offsetWidth; el.classList.add('bought'); }
        /* a round number of anything deserves saying out loud */
        const o = S.own[i];
        if (o === 10 || o === 25 || o === 50 || o === 100 || o === 200) {
          banner(o + ' ' + MG_B[i].n, MG_B[i].he, 14, null);
          sfx.milestone();
          ring(CX, CY, 150, 14, 0.8);
          kick(4, 0.3, 14);
        }
        refreshAll();
      }
      function buyUp(u, el) {
        if (S.mitz < u.c) {
          sfx.no(); kick(1);
          if (el) { el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); }
          return;
        }
        const y = rowY(el);
        S.mitz -= u.c;
        if (u.k === 'tier') { S.tier[u.i]++; popT[u.i] = 0.7; } else { S.up[u.id] = 1; }
        ecoDirty();
        sfx.up(); sfx.whoosh();
        flyer(y, u.k === 'tier' ? 't' : 'u', u.k === 'tier' ? u.b : u.id, u.tier);
        const col = u.k === 'tier' ? 14 : u.tag === 'HAND' ? 12 : u.tag === 'KAVANAH' ? 13
                  : u.tag === 'COMMUNITY' ? 11 : 10;
        banner(u.n, u.m, col, null);
        ring(CX, CY, 130, col, 0.7); ring(CX, CY, 96, 15, 0.5);
        spray(CX, CY, 20, col, 130, 1);
        kick(4, 0.3, col);
        glint = 0.4;
        refreshAll();
      }

      /* ---- 32.18 the mitzvot you complete by playing -------------------- */
      function checkAch() {
        MG_ACH.forEach(a => {
          if (S.ach[a.id]) return;
          let hit = false;
          switch (a.t) {
            case 'click': hit = S.clicks >= a.v; break;
            case 'total': hit = S.total >= a.v; break;
            case 'mps':   hit = mps() >= a.v; break;
            case 'own':   hit = S.own[idx[a.b]] >= a.v; break;
            case 'allb':  hit = S.own.every(o => o >= a.v); break;
            case 'shab':  hit = S.shab >= a.v; break;
            case 'gold':  hit = S.gold >= a.v; break;
            case 'asc':   hit = S.asc >= a.v; break;
            case 'arg':   hit = S.args >= a.v; break;
            case 'ups':   hit = upCount() >= a.v; break;
            case 'dias':  hit = MG_DIAS.every(u => upOn(u.id)); break;
            case 'flag':  hit = !!S.flag[a.v]; break;
          }
          if (hit) {
            S.ach[a.id] = 1;
            /* the two that are worth nothing announce themselves quietly */
            if (a.worth0) {
              toast('MITZVAH: ' + a.n); sfx.quiet();
              banner(a.n, 'this one is worth nothing', 11, null);
            } else {
              toast('MITZVAH: ' + a.n); sfx.ach();
              banner(a.n, a.d, 14, null);
              ring(CX, CY, 140, 14, 0.8);
              spray(CX, CY, 16, 14, 110, 1);
              kick(3, 0.25, 14);
            }
          }
        });
      }

      /* ---- 32.19 the golden star ---------------------------------------- */
      /* Mitzvah goreret mitzvah: one deed drags another behind it. */
      const GOLD = [
        { id:'simcha', n:'SIMCHA',            w:36, d:'Joy. Everything is seven times over for 77 seconds.' },
        { id:'mazal',  n:'MAZAL',             w:26, d:'A lump of luck, all at once.' },
        { id:'orchim', n:'HAKHNASAT ORCHIM',  w:14, d:'Welcoming guests. Your hand counts 777 times for 26 seconds.' },
        { id:'tzed',   n:'TZEDAKAH',          w:16, d:'Somebody gave, anonymously, which is the higher level.' },
        { id:'bittul', n:'BITTUL TORAH',      w:8,  d:'Wasted time. Half rate for 66 seconds. It happens.' }
      ];
      let gs = null;                       /* the star on screen, if any */
      let gsIn = 90 + Math.random() * 90;
      function goldRate() { return upOn('s_maz') ? 0.5 : 1; }
      function spawnGold() {
        const life = 13 + (legOn('l_gold') ? 4 : 0);
        gs = { x: 30 + Math.random() * 240, y: 40 + Math.random() * 200, t: 0, life: life, r: 15 };
        sfx.shimmer();
      }
      function takeGold() {
        S.gold++; gs = null;
        let pick = GOLD[0], roll = Math.random() * GOLD.reduce((a, b) => a + b.w, 0), acc = 0;
        for (const o of GOLD) { acc += o.w; if (roll <= acc) { pick = o; break; } }
        const pw = (upOn('s_chai') ? 1.8 : 1);
        const dur = (upOn('s_she') ? 2 : 1);
        if (pick.id === 'simcha')  addBuff('SIMCHA', 77 * dur, { m: 1 + 6 * pw }, 14);
        if (pick.id === 'orchim')  addBuff('HAKHNASAT ORCHIM', 26 * dur, { c: 777 * pw }, 11);
        if (pick.id === 'bittul')  { addBuff('BITTUL TORAH', 66, { m: 0.5 }, 12); S.flag.clot = 1; }
        if (pick.id === 'mazal') {
          const v = (Math.min(rawMps() * 900, S.total * 0.15) + 13) * pw;
          S.mitz += v; S.total += v; S.run += v;
          float(cv.width / 2, 120, '+' + mgFmt(v), 14);
        }
        if (pick.id === 'tzed') {
          const v = (Math.min(rawMps() * 1800, S.total * 0.1) + 26) * pw;
          S.mitz += v; S.total += v; S.run += v;
          float(cv.width / 2, 120, '+' + mgFmt(v), 10);
        }
        toast(pick.n + ' — ' + pick.d);
        sfx.gold();
        banner(pick.n, pick.d, pick.id === 'bittul' ? 12 : 14, null);
        ring(CX, CY, 170, pick.id === 'bittul' ? 12 : 14, 0.9);
        ring(CX, CY, 120, 15, 0.6);
        spray(CX, CY, 30, pick.id === 'bittul' ? 12 : 14, 170, 1);
        kick(6, 0.45, pick.id === 'bittul' ? 12 : 15);
        refreshAll();
      }
      function addBuff(n, secs, eff, col) {
        S.buffs = S.buffs.filter(b => b.n !== n);
        S.buffs.push({ n: n, t: secs, max: secs, m: eff.m, c: eff.c, col: col });
      }

      /* ---- 32.20 shabbat ------------------------------------------------ */
      /* Six minutes of week, seventy-five seconds of rest, and then the week
         starts again a little better than it would have. Rest is never a
         penalty here, which is also the position of the tradition. */
      const WEEK = 360, SHAB = 75, WARN = 18;
      function startShabbat() {
        S.shabT = SHAB; S.menu = 0; S.shab++;
        S.flag.rest = S.flag.rest || 0;
        restClean = true;
        toast('SHABBAT SHALOM. THE WORK STOPS.');
        sfx.shabbat();
        banner('SHABBAT SHALOM', 'the work stops', 14, null);
        ring(CX, CY, 200, 14, 1.4);
        Song.want('zmirot');
      }
      function endShabbat() {
        S.shabT = 0; S.shabIn = WEEK;
        let power = 3 + S.menu * 0.02;
        let secs  = 60;
        if (upOn('s_esh')) power *= 1.5;
        if (upOn('s_bes')) secs  *= 1.5;
        if (legOn('l_shab')) { power *= 2; }
        if (S.litFor > 0) { power *= 1.5; S.litFor = 0; }
        addBuff('HAVDALAH', secs, { m: power }, 13);
        if (restClean) S.flag.rest = 1;
        toast('HAVDALAH. A GOOD WEEK.');
        sfx.havdalah();
        banner('HAVDALAH', 'shavua tov — a good week', 13, null);
        ring(CX, CY, 210, 13, 1.2); ring(CX, CY, 150, 15, 0.9);
        spray(CX, CY, 26, 13, 140, 1);
        kick(5, 0.4, 13);
        Song.want(null);
      }
      let restClean = false;
      function lightCandles() {
        if (S.litFor > 0 || S.shabT > 0 || S.shabIn > WARN) return;
        S.litFor = 1; sfx.candle();
        S.flag.lit = 1;
        toast('THE CANDLES ARE LIT. NOW YOU CANNOT PUT THEM OUT.');
        refreshAll();
      }

      /* ---- 32.21 the machloket ------------------------------------------ */
      let arg = null;
      function openArg() {
        if (!upOn('s_pil') || arg) return;
        arg = { q: MG_ARG[Math.floor(Math.random() * MG_ARG.length)], picked: null, t: 0 };
        refreshAll();
      }
      function settleArg(side) {
        if (!arg || arg.picked) return;
        arg.picked = side; arg.t = 0;
        S.args++; S.flag.arg = 1;
        /* elu v'elu: both are the words of the living God, and both pay */
        if (side === 0) addBuff('THE STRICT VIEW', 45, { m: 2.5 }, 11);
        else            addBuff('THE LENIENT VIEW', 90, { m: 1.7 }, 10);
        sfx.rule();
        refreshAll();
      }

      /* ---- 32.22 l'dor vador -------------------------------------------- */
      function zechutFor() {
        const base = Math.floor(Math.pow(Math.max(0, S.total) / 1e12, 1 / 3));
        return Math.max(0, base - S.zech - S.spent);
      }
      function ascend() {
        const gain = zechutFor();
        if (gain < 1) { toast('NOT YET. THERE IS NOTHING TO HAND ON.'); sfx.no(); return; }
        const keepKav = kavanah();
        const keptTier = legOn('l_teach') ? 2 : legOn('l_chain') ? 1 : 0;
        const tiers = S.tier.map(t => Math.min(t, keptTier));
        const ach = S.ach, leg = S.leg, zech = S.zech + gain, spent = S.spent;
        const asc = S.asc + 1, gold = S.gold, shab = S.shab, args = S.args;
        const clicks = S.clicks, total = S.total, born = S.born;
        S = fresh();
        S.ach = ach; S.leg = leg; S.zech = zech; S.spent = spent;
        S.asc = asc; S.gold = gold; S.shab = shab; S.args = args;
        S.clicks = clicks; S.total = total; S.born = born;
        S.tier = tiers;
        S.baseKav = keepKav;
        if (legOn('l_cand')) S.own[idx.nerot] = 10;
        if (legOn('l_start')) { const v = rawMps() * 60; S.mitz += v; }
        toast('L\'DOR VADOR. +' + gain + ' ZECHUT.');
        sfx.ascend();
        banner('L\'DOR VADOR', '+' + gain + ' zechut, from generation to generation', 15, null);
        for (let k = 0; k < 5; k++) ring(CX, CY, 90 + k * 46, k % 2 ? 15 : 14, 1.1 + k * 0.25);
        spray(CX, CY, 44, 15, 190, 1);
        kick(8, 0.6, 15);
        mode = 'leg'; refreshAll(); save();
      }
      function buyLeg(u) {
        const bank = S.zech;
        if (S.leg[u.id] || bank < u.cost) { sfx.no(); return; }
        S.zech -= u.cost; S.spent += u.cost; S.leg[u.id] = 1;
        sfx.ascend(); refreshAll();
      }

      /* ---- 32.23 sound --------------------------------------------------- */
      /* The press is a small wooden knock with a pitch that walks up while you
         keep going and falls back the moment you stop, so a long run of
         clicking turns into a phrase instead of a metronome. */
      let combo = 0, comboT = 0;
      const sfx = {
        press() {
          const step = Math.min(11, combo);
          const f = 392 * Math.pow(2, step / 12);
          Snd.tone(f, 42, { type: 'triangle', vol: 0.03 });
          Snd.noise(16, { freq: 2200, q: 1.6, vol: 0.035 });
        },
        /* a purchase is three sounds stacked: coins leaving your hand, the
           thing landing, and a note pitched to how far up the ladder it is */
        buy(i, n) {
          const f = 262 * Math.pow(2, Math.min(24, i) / 12);
          Snd.tone(f, 70, { type: 'triangle', vol: 0.035 });
          Snd.tone(f * 1.5, 90, { type: 'triangle', delay: 0.06, vol: 0.028 });
          this.coins(Math.min(6, n || 1));
          Snd.tone(72, 150, { type: 'triangle', to: 44, delay: 0.05, vol: 0.05 });
        },
        coins(n) {
          for (let k = 0; k < n; k++) {
            Snd.noise(22, { freq: 2600 + Math.random() * 1400, q: 3, vol: 0.03, delay: k * 0.035 });
            Snd.tone(1600 + Math.random() * 700, 26, { type: 'triangle', delay: k * 0.035, vol: 0.012 });
          }
        },
        sell()  {
          Snd.tone(330, 120, { type: 'triangle', to: 124, vol: 0.035 });
          Snd.noise(160, { freq: 700, q: 0.7, vol: 0.03, delay: 0.04 });
          this.coins(3);
        },
        up()    { [523, 659, 784, 1046].forEach((f, i) => Snd.tone(f, 130, { type: 'triangle', delay: i * 0.05, vol: 0.034 }));
                  Snd.noise(220, { freq: 1500, q: 0.6, vol: 0.03 }); },
        /* the crit: the mode's own four notes, an octave up, plus a hit */
        crit()  {
          [587, 622, 740, 880, 1175].forEach((f, i) =>
            Snd.tone(f, 260, { type: 'triangle', delay: i * 0.035, vol: 0.045 }));
          Snd.noise(120, { freq: 3000, q: 1.2, vol: 0.07 });
          Snd.tone(88, 220, { type: 'triangle', to: 52, vol: 0.06 });
        },
        chain(n) {
          const b = n >= 50 ? 880 : n >= 25 ? 740 : 622;
          [b, b * 1.25, b * 1.5].forEach((f, i) => Snd.tone(f, 200, { type: 'triangle', delay: i * 0.05, vol: 0.035 }));
        },
        milestone() {
          [523, 784, 1046, 1568].forEach((f, i) => Snd.tone(f, 700, { type: 'triangle', delay: i * 0.11, vol: 0.035 }));
        },
        whoosh() { Snd.noise(300, { freq: 900, q: 0.4, vol: 0.035 }); },
        ach()   { [587, 698, 880, 1175].forEach((f, i) => Snd.tone(f, 150, { type: 'triangle', delay: i * 0.07, vol: 0.03 })); },
        quiet() { Snd.tone(220, 500, { type: 'sine', vol: 0.02 }); },
        no()    { Snd.tone(140, 90, { type: 'square', vol: 0.02 }); },
        shimmer(){ [1319, 1568, 2093].forEach((f, i) => Snd.tone(f, 200, { type: 'sine', delay: i * 0.08, vol: 0.016 })); },
        /* the mode, in four notes, so a catch sounds like the music it is in */
        gold()  { [587, 622, 740, 880].forEach((f, i) => Snd.tone(f, 190, { type: 'triangle', delay: i * 0.06, vol: 0.036 })); },
        candle(){ Snd.tone(880, 300, { type: 'sine', vol: 0.028 }); Snd.tone(1319, 420, { type: 'sine', delay: 0.14, vol: 0.02 }); },
        shabbat(){
          [440, 523, 659].forEach((f, i) => Snd.tone(f, 900, { type: 'triangle', delay: i * 0.22, vol: 0.03 }));
          Snd.tone(110, 1600, { type: 'sine', to: 147, vol: 0.03 });
        },
        havdalah(){ [294, 370, 440, 587, 740].forEach((f, i) => Snd.tone(f, 340, { type: 'triangle', delay: i * 0.09, vol: 0.034 })); },
        rule()  { Snd.noise(90, { freq: 260, q: 0.6, vol: 0.07 }); Snd.tone(147, 200, { type: 'triangle', to: 98, vol: 0.04 }); },
        ascend(){ [147, 220, 294, 370, 440, 587].forEach((f, i) => Snd.tone(f, 1400, { type: 'triangle', delay: i * 0.13, vol: 0.028 })); }
      };

      /* ---- 32.24 the five tunes ------------------------------------------ */
      const Song = {
        on:false, cur:'freygish', forced:null, bus:null, when:0, timer:null, voices:[], g0:-1,
        swap:null, rotIn:100, FADE:1.2,
        ensure() {
          Snd.wake(); if (!Snd.ctx) return false;
          if (!this.bus) { this.bus = Snd.ctx.createGain(); this.bus.gain.value = 0.0001; this.bus.connect(Snd.ctx.destination); }
          return true;
        },
        voice(f, at, dur, type, vol) {
          const c = Snd.ctx, o = c.createOscillator(), gn = c.createGain();
          o.type = type; o.frequency.setValueAtTime(f, at);
          gn.gain.setValueAtTime(0.0001, at);
          gn.gain.exponentialRampToValueAtTime(vol, at + 0.04);
          gn.gain.setValueAtTime(vol, at + dur * 0.55);
          gn.gain.exponentialRampToValueAtTime(0.0001, at + dur);
          o.connect(gn); gn.connect(this.bus); o.start(at); o.stop(at + dur + 0.05);
          this.voices.push(o);
          o.onended = () => { const i = this.voices.indexOf(o); if (i >= 0) this.voices.splice(i, 1); };
        },
        /* heat is 0 when nothing is happening and 3 in the middle of a long
           chain. It does not change the tune, it adds to it: an octave over
           the lead, then a driven bass, then the arp at double time. Same
           key, same bars, more of them — which is how a piece of music gets
           more urgent without becoming a different piece of music. */
        heat: 0,
        bar(t0, sg) {
          const e = 30 / sg.bpm;
          const H = this.heat;
          sg.pad.forEach(n  => this.voice(MG_HZ[n[0]], t0 + n[1] * e, n[2] * e * 0.96, 'triangle', 0.032));
          sg.bass.forEach(n => {
            this.voice(MG_HZ[n[0]], t0 + n[1] * e, n[2] * e * 0.9, 'triangle', 0.05);
            if (H >= 2) this.voice(MG_HZ[n[0]], t0 + n[1] * e, n[2] * e * 0.5, 'square', 0.026);
          });
          sg.lead.forEach(n => {
            this.voice(MG_HZ[n[0]], t0 + n[1] * e, n[2] * e * 0.9, 'square', 0.042 + H * 0.004);
            if (H >= 1) this.voice(MG_HZ[n[0]] * 2, t0 + n[1] * e, n[2] * e * 0.6, 'square', 0.016 + H * 0.004);
          });
          if (sg.arp) sg.arp.forEach(n => {
            this.voice(MG_HZ[n[0]], t0 + n[1] * e, n[2] * e * 0.75, 'triangle', 0.024 + H * 0.006);
            if (H >= 3) {
              this.voice(MG_HZ[n[0]], t0 + (n[1] + 0.5) * e, n[2] * e * 0.35, 'triangle', 0.02);
              this.voice(MG_HZ[n[0]] * 2, t0 + (n[1] + 0.25) * e, n[2] * e * 0.3, 'square', 0.012);
            }
          });
          /* a floor tom on the beat once it is really going */
          if (H >= 2) for (let k = 0; k < sg.len; k += 8) {
            this.voice(58, t0 + k * e, e * 0.5, 'triangle', 0.05);
          }
          return sg.len * e;
        },
        pool() { return ['freygish', 'nigun', 'misheberach', 'hora']; },
        want(id) {
          this.forced = id;
          const next = id || this.pool()[0];
          if (next !== this.cur) { if (this.on) this.crossfade(next); else this.cur = next; }
        },
        crossfade(next) {
          if (!Snd.ctx || !this.bus) { this.cur = next; return; }
          clearTimeout(this.timer); clearTimeout(this.swap);
          this.on = false;
          const now = Snd.ctx.currentTime, gn = this.bus.gain, F = this.FADE;
          gn.cancelScheduledValues(now);
          gn.setValueAtTime(Math.max(0.0001, gn.value), now);
          gn.exponentialRampToValueAtTime(0.0001, now + F);
          this.voices.forEach(o => { try { o.stop(now + F + 0.02); } catch (e) {} });
          this.voices = [];
          this.swap = setTimeout(() => {
            this.swap = null; this.cur = next;
            if (alive && CRT.on && Vol.mus > 0) this.start();
          }, F * 1000 + 40);
        },
        rot(dt) {
          if (!this.on || this.swap || this.forced) return;
          this.rotIn -= dt;
          if (this.rotIn <= 0) {
            const p = this.pool().filter(x => x !== this.cur);
            this.crossfade(p[Math.floor(Math.random() * p.length)]);
            this.rotIn = 90 + Math.random() * 60;
          }
        },
        level(ramp) {
          if (!this.bus || !Snd.ctx) return;
          const want = musGain();
          if (ramp == null && Math.abs(want - this.g0) < 0.0005) return;
          this.g0 = want;
          const now = Snd.ctx.currentTime, gn = this.bus.gain;
          gn.cancelScheduledValues(now);
          gn.setValueAtTime(Math.max(0.0001, gn.value), now);
          gn.exponentialRampToValueAtTime(Math.max(0.0002, want * 0.8), now + (ramp || 0.4));
        },
        sync() {
          if (!(alive && CRT.on && Vol.mus > 0)) { this.stop(); return; }
          if (this.swap) return;
          if (this.on) this.level(); else this.start();
        },
        start() {
          if (this.on || !this.ensure()) return;
          this.on = true; this.g0 = -1;
          this.when = Snd.ctx.currentTime + 0.15; this.level(this.FADE); this.tick();
        },
        tick() {
          if (!this.on || !Snd.ctx) return;
          const now = Snd.ctx.currentTime;
          if (this.when < now) this.when = now + 0.05;
          const len = this.bar(this.when, MG_SONGS[this.cur] || MG_SONGS.freygish);
          this.when += len;
          this.timer = setTimeout(() => this.tick(), Math.max(300, len * 1000 - 500));
        },
        /* the heat changed mid-bar: cut the queue short and lay down the next
           one now, so the extra layer arrives while you can still feel why */
        recue() {
          if (!this.on || !Snd.ctx || this.swap) return;
          const now = Snd.ctx.currentTime;
          if (this.when - now < 1.2) return;
          clearTimeout(this.timer);
          this.voices.forEach(o => { try { o.stop(now + 0.9); } catch (e) {} });
          this.when = now + 0.9;
          this.tick();
        },
        stop() {
          clearTimeout(this.swap); this.swap = null;
          if (!this.on) return;
          clearTimeout(this.timer); this.on = false;
          if (!this.bus || !Snd.ctx) { this.voices = []; return; }
          const now = Snd.ctx.currentTime, gn = this.bus.gain;
          gn.cancelScheduledValues(now);
          gn.setValueAtTime(Math.max(0.0001, gn.value), now);
          gn.exponentialRampToValueAtTime(0.0001, now + 0.7);
          this.voices.forEach(o => { try { o.stop(now + 0.72); } catch (e) {} });
          this.voices = [];
        }
      };

      /* ---- 32.25 save ---------------------------------------------------- */
      function save() {
        try { S.t = Date.now(); localStorage.setItem(MG_SAVE, JSON.stringify(S)); } catch (e) {}
      }
      function load() {
        let raw = null;
        try { raw = localStorage.getItem(MG_SAVE); } catch (e) {}
        if (!raw) return;
        let o = null;
        try { o = JSON.parse(raw); } catch (e) { return; }
        if (!o || o.v !== 1) return;
        const f = fresh();
        Object.keys(f).forEach(k => { if (o[k] == null) o[k] = f[k]; });
        if (!Array.isArray(o.own) || o.own.length !== MG_B.length) o.own = f.own;
        if (!Array.isArray(o.tier) || o.tier.length !== MG_B.length) o.tier = f.tier;
        if (!Array.isArray(o.buffs)) o.buffs = [];
        S = o;
        /* offline. It kept running while you were not looking, at a rate that
           depends on how much you trusted it to. */
        const gap = Math.max(0, (Date.now() - (S.t || Date.now())) / 1000);
        const capH = legOn('l_off') ? 24 : 3;
        const rate = legOn('l_off') ? 1 : upOn('s_bit') ? 0.8 : 0.4;
        const secs = Math.min(gap, capH * 3600);
        if (secs > 60) {
          const v = rawMps() * secs * rate;
          S.mitz += v; S.total += v; S.run += v;
          setTimeout(() => toast('WHILE YOU WERE AWAY: ' + mgFmt(v) + ' MITZVOT.'), 700);
        }
      }
      function wipe() {
        if (!confirmWipe) { confirmWipe = 1; $('.mgwipe').textContent = 'SURE?'; return; }
        try { localStorage.removeItem(MG_SAVE); } catch (e) {}
        S = fresh(); confirmWipe = 0; $('.mgwipe').textContent = 'WIPE EVERYTHING';
        root.classList.remove('opts');
        toast('EVERYTHING GONE. NOT EVEN THE MERIT.');
        refreshAll();
      }
      let confirmWipe = 0;

      /* ---- 32.26 the panes ------------------------------------------------ */
      function row(cls, html) { return '<div class="' + cls + '">' + html + '</div>'; }
      function icon(id) { return '<canvas class="mgic" width="26" height="26" data-ic="' + id + '"></canvas>'; }
      function upIcon(u) {
        return u.k === 'tier'
          ? '<canvas class="mgic" width="26" height="26" data-tic="' + u.b + '" data-tn="' + u.tier + '"></canvas>'
          : '<canvas class="mgic" width="26" height="26" data-uic="' + u.id + '"></canvas>';
      }
      function legIcon(id) { return '<canvas class="mgic" width="26" height="26" data-uic="' + id + '"></canvas>'; }

      function paneStore() {
        let h = '';
        MG_B.forEach((b, i) => {
          /* a building you have never been able to afford stays a rumour */
          const seen = S.own[i] > 0 || S.total >= MG_B[i].cost * 0.35;
          if (!seen) { h += row('mgrow locked', '<span class="mgq">???</span>'); return; }
          const c = buyN < 0 ? sellBack(i, Math.min(S.own[i], 10)) : cost(i, buyN);
          const can = buyN < 0 ? S.own[i] > 0 : S.mitz >= c;
          h += '<div class="mgrow' + (can ? ' ready' : ' poor') + '" data-b="' + i + '">' +
                 icon(b.id) +
                 '<span class="mgnm"><b>' + b.n + '</b><i>' + (buyN < 0 ? '+' : '') + mgFmt(c) + '</i></span>' +
                 '<span class="mgown">' + S.own[i] + '</span></div>';
        });
        return h;
      }
      /* everything already bought, so the tab is a record as well as a shop */
      function ownedList() {
        const out = [];
        MG_B.forEach((b, i) => {
          for (let t = 0; t < S.tier[i]; t++) {
            out.push({ k: 'tier', b: b.id, tier: t + 1, n: b.up[t].toUpperCase(),
                       tag: b.n, d: b.d, m: b.n + ' produce twice as much.' });
          }
        });
        const grab = (arr, tag) => arr.forEach(u => { if (upOn(u.id))
          out.push({ k: 'up', id: u.id, n: u.n, tag: tag, d: u.d, m: u.m }); });
        grab(MG_CLICK, 'HAND'); grab(MG_KAV, 'KAVANAH');
        grab(MG_DIAS, 'COMMUNITY'); grab(MG_SPEC, 'RULE');
        return out;
      }
      let upsShowOwned = false;
      function paneUps() {
        const list = upgradeList(), own = ownedList();
        let h = '<div class="mghead mgtoggle">' +
                '<b class="mgt' + (upsShowOwned ? '' : ' on') + '" data-o="0">FOR SALE ' + list.length + '</b>' +
                '<b class="mgt' + (upsShowOwned ? ' on' : '') + '" data-o="1">HELD ' + own.length + '</b></div>';
        if (upsShowOwned) {
          if (!own.length) return h + '<div class="mgempty">You have not bought one yet.</div>';
          own.forEach((u, n) => {
            h += '<div class="mgrow up owned f-' + (u.k === 'tier' ? 'tier' : u.tag.toLowerCase()) +
                 '" data-o="' + n + '">' + upIcon(u) +
                 '<span class="mgnm"><b>' + u.n + '</b><i>' + u.m + '</i></span>' +
                 '<span class="mgtag">' + u.tag + '</span></div>';
          });
          return h;
        }
        if (!list.length) return h + '<div class="mgempty">Nothing to buy. Own more of something.</div>';
        list.forEach((u, n) => {
          const can = S.mitz >= u.c;
          h += '<div class="mgrow up f-' + (u.k === 'tier' ? 'tier' : u.tag.toLowerCase()) +
               (can ? ' ready' : ' poor') + '" data-u="' + n + '">' + upIcon(u) +
               '<span class="mgnm"><b>' + u.n + '</b><i>' + mgFmt(u.c) + '</i></span>' +
               '<span class="mgtag">' + u.tag + '</span></div>';
        });
        return h;
      }
      function paneDict() {
        let h = '<div class="mghead">Every word this game uses that it did not invent. ' +
                MG_DICT.length + ' of them.</div>';
        MG_DICT.forEach(d => {
          h += '<div class="mgdict"><b>' + d[0] + '</b><i>' + d[1] + '</i></div>';
        });
        return h;
      }
      function paneAch() {
        const done = achCount();
        let h = '<div class="mghead">' + done + ' / ' + MG_ACH.length +
                ' &nbsp; KAVANAH ' + (kavanah() * 100).toFixed(1) + '% &nbsp; ' +
                '(&times;' + kavMult().toFixed(3) + ' with what you have bought)</div>';
        MG_ACH.forEach(a => {
          const on = !!S.ach[a.id];
          h += '<div class="mgach' + (on ? ' on' : '') + (a.worth0 ? ' zero' : '') + '">' +
               '<b>' + (on ? a.n : '???') + '</b><i>' + a.d + '</i></div>';
        });
        return h;
      }
      function paneStats() {
        const secs = (Date.now() - S.born) / 1000;
        const rows = [
          ['MITZVOT IN HAND',      mgFmt(S.mitz)],
          ['THIS GENERATION',      mgFmt(S.run)],
          ['ALL GENERATIONS',      mgFmt(S.total)],
          ['PER SECOND',           mgFmt(mps())],
          ['PER SECOND, RESTED',   mgFmt(rawMps())],
          ['PER PRESS',            mgFmt(clickPower())],
          ['PRESSES',              String(S.clicks)],
          ['BY HAND',              mgFmt(S.hand)],
          ['BUILDINGS',            String(S.own.reduce((a, b) => a + b, 0))],
          ['UPGRADES',             String(upCount())],
          ['MITZVOT COMPLETED',    achCount() + ' / ' + MG_ACH.length],
          ['KAVANAH',              (kavanah() * 100).toFixed(2) + '%'],
          ['GLOBAL MULTIPLIER',    '×' + globalMult().toFixed(3)],
          ['SHABBATOT KEPT',       String(S.shab)],
          ['GOLDEN STARS',         String(S.gold)],
          ['ARGUMENTS SETTLED',    String(S.args)],
          ['GENERATIONS',          String(S.asc)],
          ['ZECHUT IN HAND',       String(S.zech)],
          ['ZECHUT SPENT',         String(S.spent)],
          ['EACH ZECHUT IS WORTH', (zechPer() * 100) + '%'],
          ['PLAYING FOR',          Math.floor(secs / 3600) + 'h ' + Math.floor(secs / 60) % 60 + 'm']
        ];
        return '<div class="mgstat">' + rows.map(r =>
          '<div><span>' + r[0] + '</span><b>' + r[1] + '</b></div>').join('') + '</div>';
      }
      function paneLeg() {
        const gain = zechutFor();
        let h = '<div class="mghead">Hand everything to the next generation. You keep the merit, the ' +
                'mitzvot you completed, and whatever you bought down here. Everything else starts again.</div>' +
                '<div class="mgasc"><button class="appbtn mgascend">L\'DOR VADOR &nbsp; +' + gain + ' ZECHUT</button>' +
                '<span>' + S.zech + ' in hand &middot; ' + S.spent + ' spent &middot; each is worth ' +
                (zechPer() * 100) + '%</span></div>';
        MG_LEG.forEach(u => {
          const on = !!S.leg[u.id], can = S.zech >= u.cost;
          h += '<div class="mgrow leg' + (on ? ' owned' : can ? ' ready' : ' poor') + '" data-l="' + u.id + '">' +
               legIcon(u.id) +
               '<span class="mgnm"><b>' + u.n + '</b><i>' + u.m + '</i></span>' +
               '<span class="mgtag">' + (on ? 'HELD' : u.cost + ' Z') + '</span></div>';
        });
        return h;
      }

      const PANES = { store: paneStore, ups: paneUps, ach: paneAch, stats: paneStats,
                      dict: paneDict, leg: paneLeg };

      /* the little icons in the store, drawn once per rebuild */
      function drawIcons() {
        pane.querySelectorAll('canvas.mgic').forEach(c => {
          const q = c.getContext('2d');
          if (!q) return;
          const P = i => { const p = VGA16[i] || VGA16[7]; return 'rgb(' + p[0] + ',' + p[1] + ',' + p[2] + ')'; };
          const r = (x, y, w, h, col) => {
            if (VGA16[col] == null) return;
            q.fillStyle = P(col);
            q.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
          };
          q.clearRect(0, 0, 26, 26);
          if (c.dataset.ic) mgIcon(r, c.dataset.ic);
          else if (c.dataset.uic) mgUpIcon(r, c.dataset.uic);
          else if (c.dataset.tic) mgTierIcon(r, c.dataset.tic, +c.dataset.tn);
        });
      }

      let lastMode = null, lastSig = '';
      function refreshAll(force) {
        const sig = mode + '|' + S.own.join(',') + '|' + S.tier.join(',') + '|' +
                    upCount() + '|' + achCount() + '|' + buyN + '|' + S.zech + '|' + upsShowOwned + '|' +
                    Object.keys(S.leg).length + '|' + S.total.toExponential(2);
        if (!force && sig === lastSig && mode === lastMode) { repriceRows(); return; }
        lastSig = sig; lastMode = mode;
        pane.innerHTML = (PANES[mode] || paneStore)();
        pane.scrollTop = mode === lastMode ? pane.scrollTop : 0;
        drawIcons();
        root.querySelectorAll('.mgtab').forEach(b => b.classList.toggle('on', b.dataset.t === mode));
        const n = upgradeList().filter(u => S.mitz >= u.c).length;
        const badge = root.querySelector('.mgtab[data-t="ups"] i');
        badge.textContent = n ? ' ' + n : '';
      }
      /* the cheap path: the rows exist, only the money changed */
      function repriceRows() {
        if (mode === 'store') {
          pane.querySelectorAll('.mgrow[data-b]').forEach(el => {
            const i = +el.dataset.b;
            const c = buyN < 0 ? sellBack(i, Math.min(S.own[i], 10)) : cost(i, buyN);
            const can = buyN < 0 ? S.own[i] > 0 : S.mitz >= c;
            el.classList.toggle('poor', !can);
            const it = el.querySelector('i'); if (it) it.textContent = (buyN < 0 ? '+' : '') + mgFmt(c);
          });
        } else if (mode === 'ups') {
          const list = upgradeList();
          pane.querySelectorAll('.mgrow[data-u]').forEach(el => {
            const u = list[+el.dataset.u]; if (!u) return;
            el.classList.toggle('poor', S.mitz < u.c);
          });
        } else if (mode === 'leg') {
          pane.querySelectorAll('.mgrow[data-l]').forEach(el => {
            const u = MG_LEG.filter(x => x.id === el.dataset.l)[0]; if (!u) return;
            el.classList.toggle('poor', !S.leg[u.id] && S.zech < u.cost);
          });
        }
      }

      /* ---- 32.27 the tooltip ---------------------------------------------- */
      function showTip(html, ev) {
        tip.innerHTML = html;
        tip.style.display = 'block';
        const r = root.getBoundingClientRect();
        /* to the left of the store, over the stage, so it never covers the row
           you are reading the price of */
        let x = root.querySelector('.mgright').offsetLeft - tip.offsetWidth - 8;
        if (x < 4) x = Math.min(ev.clientX - r.left + 18, r.width - tip.offsetWidth - 6);
        let y = ev.clientY - r.top - 10;
        y = Math.max(4, Math.min(y, r.height - tip.offsetHeight - 6));
        tip.style.left = x + 'px'; tip.style.top = y + 'px';
      }
      const hideTip = () => { tip.style.display = 'none'; };

      pane.addEventListener('mousemove', ev => {
        const el = ev.target.closest ? ev.target.closest('.mgrow, .mgach') : null;
        if (!el) { hideTip(); return; }
        if (el.dataset.b != null) {
          const i = +el.dataset.b, b = MG_B[i];
          const each = b.mps * bMult(i) * globalMult();
          const mine = each * S.own[i];
          const all  = mps();
          const next = cost(i, 1);
          showTip('<b>' + b.n + '</b> <u>' + b.he + '</u>' +
                  '<p>' + b.d + '</p>' +
                  '<p class="mgmech">Each one produces ' + mgFmt(b.mps) + ' a second before multipliers, and ' +
                  'you have bought ' + S.tier[i] + ' of its 5 upgrades.</p>' +
                  '<p class="mgt2">each one makes <b>' + mgFmt(each) + '</b> a second<br>' +
                  'your ' + S.own[i] + ' make <b>' + mgFmt(mine) + '</b> a second' +
                  (all > 0 ? ' &mdash; ' + (mine / all * 100).toFixed(1) + '% of everything' : '') + '<br>' +
                  'the next one costs <b>' + mgFmt(next) + '</b></p>', ev);
        } else if (el.dataset.u != null) {
          const u = upgradeList()[+el.dataset.u];
          if (u) showTip('<b>' + u.n + '</b> <u>' + u.tag + '</u>' +
                         '<p>' + u.d + '</p>' +
                         '<p class="mgmech">' + u.m + '</p>' +
                         '<p class="mgt2">' + mgFmt(u.c) + ' mitzvot' +
                         (S.mitz < u.c ? ' &mdash; you have ' + mgFmt(S.mitz) : ' &mdash; you can afford it') +
                         '</p>', ev);
        } else if (el.dataset.o != null) {
          const u = ownedList()[+el.dataset.o];
          if (u) showTip('<b>' + u.n + '</b> <u>HELD</u><p>' + u.d + '</p>' +
                         '<p class="mgmech">' + u.m + '</p>', ev);
        } else if (el.dataset.l != null) {
          const u = MG_LEG.filter(x => x.id === el.dataset.l)[0];
          if (u) showTip('<b>' + u.n + '</b> <u>LEGACY</u>' +
                         '<p>' + u.d + '</p>' +
                         '<p class="mgmech">' + u.m + '</p>' +
                         '<p class="mgt2">' + u.cost + ' zechut' +
                         (S.leg[u.id] ? ' &mdash; held' : ' &mdash; you have ' + S.zech) + '</p>', ev);
        } else if (el.classList.contains('mgach')) {
          hideTip();
        } else hideTip();
      });
      pane.addEventListener('mouseleave', hideTip);

      pane.addEventListener('mousedown', ev => {
        const el = ev.target.closest ? ev.target.closest('.mgrow') : null;
        if (!el) return;
        if (el.dataset.o != null && el.classList.contains('owned')) { hideTip(); return; }
        if (el.dataset.b != null) buy(+el.dataset.b, el);
        else if (el.dataset.u != null) { const u = upgradeList()[+el.dataset.u]; if (u) buyUp(u, el); }
        else if (el.dataset.l != null) { const u = MG_LEG.filter(x => x.id === el.dataset.l)[0]; if (u) buyLeg(u); }
        else if (ev.target.classList.contains('mgascend')) ascend();
        hideTip();
      });
      pane.addEventListener('click', ev => {
        if (ev.target.classList && ev.target.classList.contains('mgascend')) ascend();
      });
      pane.addEventListener('mousedown', ev => {
        const t = ev.target.closest ? ev.target.closest('.mgt[data-o]') : null;
        if (!t) return;
        upsShowOwned = t.dataset.o === '1';
        Snd.click(); refreshAll(true);
      });

      root.querySelectorAll('.mgtab').forEach(b => b.addEventListener('mousedown', () => {
        mode = b.dataset.t; Snd.click(); Snd.tone(880, 40, { type: 'triangle', vol: 0.02 }); refreshAll(true);
      }));
      root.querySelectorAll('.mgbuy').forEach(b => b.addEventListener('mousedown', () => {
        buyN = +b.dataset.n; Snd.click();
        root.querySelectorAll('.mgbuy').forEach(o => o.classList.toggle('on', o === b));
        refreshAll(true);
      }));
      $('.mgsave').addEventListener('mousedown', () => { save(); Snd.save(); toast('SAVED.'); });
      /* the wipe button lives behind the dots, because a one-click button that
         destroys eight hours of work does not belong next to SAVE */
      $('.mgopt').addEventListener('mousedown', () => {
        root.classList.toggle('opts'); Snd.click();
        if (!root.classList.contains('opts')) { confirmWipe = 0; $('.mgwipe').textContent = 'WIPE EVERYTHING'; }
      });
      $('.mgwipe').addEventListener('mousedown', wipe);

      /* ---- 32.28 the stage, and the juice ---------------------------------
         Nothing in this block changes a single number. All of it is here so
         that pressing the star feels like pressing something: sparks, rings,
         flying icons, banners, a whole-pixel screen shake and a counter that
         rolls instead of jumping. An idle game is a feedback loop with an
         economy attached, and the feedback is the half people actually feel.
         ========================================================================== */
      const parts = [], floats = [], rings = [], flyers = [], banners = [];
      let shake = 0, flash = 0, flashCol = 15, pulse = 0;
      const CX = 150, CY = 148;
      let squash = 0, spin = 0, glint = 0, idleRing = 3;
      let shownMitz = 0, popT = MG_B.map(() => 0);

      function float(x, y, txt, col, big) {
        floats.push({ x: x, y: y, t: 0, txt: txt, col: col, big: big ? 1 : 0,
                      vx: (Math.random() - 0.5) * 14 });
      }
      function ring(x, y, r1, col, life) {
        rings.push({ x: x, y: y, t: 0, life: life || 0.5, r1: r1, c: col });
      }
      function spray(x, y, n, col, spd, kind) {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * 6.28, v = spd * (0.4 + Math.random() * 0.9);
          parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.5,
                       t: 0, life: 0.8 + Math.random() * 0.7, c: col, k: kind || 0,
                       sz: kind === 1 ? 3 : 2 });
        }
      }
      /* an icon that flies from the store row it was bought in to the star,
         so a purchase is something that visibly arrives somewhere */
      function flyer(fromY, kind, id, tier, back) {
        flyers.push({ t: 0, life: 0.55, y0: fromY, back: !!back,
                      kind: kind, id: id, tier: tier || 0 });
      }
      function banner(txt, sub, col, icon) {
        banners.push({ t: 0, life: 1.8, txt: txt, sub: sub || '', col: col, icon: icon });
      }
      function kick(n, f, col) { shake = Math.max(shake, n); if (f) { flash = f; flashCol = col; } }

      /* ---- 32.28b the press -----------------------------------------------
         Crit chance climbs with the chain, which is the whole hook: the longer
         you keep going the more likely the next one is worth seven of them.
         ========================================================================== */
      function critChance() { return Math.min(0.2, 0.02 + combo * 0.006); }
      function press(ev) {
        let v = clickPower();
        const crit = Math.random() < critChance();
        if (crit) v *= 7;
        S.mitz += v; S.total += v; S.run += v; S.hand += v; S.clicks++;
        squash = 1; spin = 1;
        combo = Math.min(60, combo + 1); comboT = 0;
        if (combo > (S.bestCombo || 0)) S.bestCombo = combo;
        restClean = false;
        const bx = ev ? ev.offsetX * (cv.width / cv.clientWidth) : CX;
        const by = ev ? ev.offsetY * (cv.height / cv.clientHeight) : CY;

        if (crit) {
          sfx.crit();
          float(bx, by - 14, '+' + mgFmt(v), 15, 1);
          /* one label at a time. Stacked, it is unreadable and looks broken. */
          if (!floats.some(f => f.crit)) {
            const l = { x: CX, y: 96, t: 0, txt: 'GORERET MITZVAH!', col: 14, big: 0, vx: 0, crit: 1 };
            floats.push(l);
          }
          spray(bx, by, 22, 14, 150, 1);
          ring(CX, CY, 120, 15, 0.55); ring(CX, CY, 86, 14, 0.4);
          kick(5, 0.35, 14);
        } else {
          sfx.press();
          float(bx, by - 8, '+' + mgFmt(v), 14);
          spray(bx, by, 7, 14, 80);
          ring(bx, by, 26 + combo, 14, 0.32);
          kick(1);
        }
        /* the chain calls its own milestones, which is what makes you chase it */
        if (combo === 10 || combo === 25 || combo === 50) {
          sfx.chain(combo);
          banner('CHAIN x' + combo, combo === 50 ? 'do not stop' : 'keep going', 11, null);
          ring(CX, CY, 140, 11, 0.7);
          kick(3, 0.2, 11);
        }
        checkAch();
        refreshAll();
      }

      cv.addEventListener('mousedown', ev => {
        const sx = cv.width / cv.clientWidth, sy = cv.height / cv.clientHeight;
        const mx = ev.offsetX * sx, my = ev.offsetY * sy;
        if (gs) {
          const d = Math.hypot(mx - gs.x, my - gs.y);
          if (d < gs.r + 12) { takeGold(); return; }
        }
        /* the yahrzeit candle, bottom right. It gives nothing. */
        if (mx > 258 && my > 258) {
          S.flag.yiz = 1; yizT = 14; sfx.quiet();
          toast('ZICHRONAM LIVRACHA. MAY THEIR MEMORY BE A BLESSING.');
          checkAch(); refreshAll(); return;
        }
        if (S.shabIn <= WARN && !S.shabT && !S.litFor && my > 214 && mx > 24 && mx < 120) { lightCandles(); return; }
        if (arg && !arg.picked && my > 60 && my < 210) {
          if (mx < CX) settleArg(0); else settleArg(1);
          return;
        }
        if (Math.hypot(mx - CX, my - CY) < 76) press(ev);
      });
      /* holding the button down keeps pressing, at a rate a hand could manage */
      let held = false, holdT = 0;
      cv.addEventListener('mousedown', () => { held = true; holdT = 0.24; });
      window.addEventListener('mouseup', () => { held = false; });
      cv.addEventListener('mouseleave', () => { held = false; });
      let yizT = 0;

      /* ---- 32.29 the picture ----------------------------------------------
         The sky is not fixed. It walks from night to full morning across six
         eras as the lifetime total climbs, so a player who comes back after a
         week is looking at a different time of day — the longest-running piece
         of feedback in the game and the only one that costs nothing to run.
         ========================================================================== */
      /* One base colour and two thin washes each — the sky has to carry the
         era without ever becoming the loudest thing on screen, because the
         loudest thing on screen is always the star. vig is how much black
         goes behind him, which is what keeps gold readable on a bright day. */
      const ERA = [
        { sky: 0,  top: [1, 4],  hz: [1, 8],   stars: 1.0,  glow: 9,  moon: 1, vig: 0 },
        { sky: 0,  top: [1, 8],  hz: [9, 4],   stars: 0.8,  glow: 9,  moon: 1, vig: 0 },
        { sky: 1,  top: [0, 6],  hz: [9, 5],   stars: 0.5,  glow: 9,  moon: 1, vig: 0 },
        { sky: 1,  top: [9, 5],  hz: [6, 6],   stars: 0.22, glow: 11, moon: 0, vig: 2 },
        { sky: 9,  top: [11, 5], hz: [14, 5],  stars: 0.0,  glow: 11, moon: 0, vig: 4 },
        { sky: 11, top: [9, 4],  hz: [14, 5],  stars: 0.0,  glow: 9,  moon: 0, vig: 6 }
      ];
      function eraNow() {
        const l = Math.log10(Math.max(1, S.total));
        return Math.max(0, Math.min(5, Math.floor(l / 5)));
      }

      function drawSky(t, E) {
        R(0, 0, 300, 300, E.sky);
        wash(0, 0, 300, 120, E.top[0], E.top[1]);
        wash(0, 0, 300, 60,  E.top[0], E.top[1]);
        wash(0, 178, 300, 76, E.hz[0], E.hz[1]);
        if (E.stars > 0) {
          for (let i = 0; i < 44; i++) {
            const x = (i * 61) % 296 + 2, y = (i * 113) % 160 + 4;
            const b = Math.sin(t * 0.5 + i * 1.7);
            if (b > 1 - E.stars) R(x, y, 1, 1, b > 0.72 ? 15 : 7);
          }
        }
        /* the moon early, the sun late, and one of them is always up */
        if (E.moon) { oval(250, 44, 16, 16, 15); oval(243, 40, 14, 14, E.sky); }
        else { washOval(252, 50, 30, 30, 14, 4); oval(252, 50, 15, 15, 14); oval(252, 50, 8, 8, 15); }
        for (let i = 0; i < 3; i++) {
          const x = ((t * 3.5 + i * 122) % 400) - 60;
          const c = E.moon ? 8 : 15;
          oval(x, 58 + i * 20, 24, 6, c); oval(x - 15, 61 + i * 20, 15, 5, c); oval(x + 17, 61 + i * 20, 13, 5, c);
        }
        /* the hills the city stands on */
        oval(60, 268, 130, 42, 8); oval(230, 272, 120, 38, 8);
        wash(0, 238, 300, 26, 0, 3);
        /* and the dark behind him, so gold never has to fight a bright sky.
           Three rings rather than one disc, or it reads as a plate he is
           standing in front of instead of the light falling off. */
        if (E.vig) {
          washOval(CX, CY, 124, 124, 0, Math.max(1, E.vig - 4));
          washOval(CX, CY, 104, 104, 0, Math.max(1, E.vig - 2));
          washOval(CX, CY, 86, 86, 0, E.vig);
        }
      }

      /* one silhouette per building owned, low to high, with lit windows and
         a bounce on whichever one you just bought */
      function drawCity(t) {
        let x = -4;
        for (let i = 0; i < MG_B.length && x < 306; i++) {
          if (!S.own[i]) continue;
          const pop = popT[i] > 0 ? Math.round(Math.sin(popT[i] * 18) * popT[i] * 9) : 0;
          const h = 10 + i * 4.6 + Math.min(22, S.own[i]) + pop;
          const w = 15 + (i % 3) * 7;
          R(x, 250 - h, w, h + 6, 0);
          R(x, 250 - h, w, 1, popT[i] > 0 ? 14 : 8);
          R(x, 250 - h, 1, h, 8);
          for (let wy = 250 - h + 4; wy < 246; wy += 7) {
            for (let wx = x + 3; wx < x + w - 3; wx += 6) {
              if ((wx * 7 + wy * 3 + i) % 5 < 2) {
                R(wx, wy, 2, 3, Math.sin(t * 0.6 + wx * 0.7 + wy) > -0.2 ? 14 : 6);
              }
            }
          }
          /* smoke, from the taller ones */
          if (i > 6 && (i % 3) === 0) {
            for (let k = 0; k < 4; k++) {
              const ph = (t * 0.5 + k * 0.25 + i) % 1;
              R(x + w - 6 + Math.round(Math.sin(ph * 6 + i) * 3), 250 - h - 4 - ph * 26, 2, 2, 8);
            }
          }
          x += w + 3;
        }
        R(0, 250, 300, 50, 0);
        R(0, 250, 300, 1, 8);
        wash(0, 254, 300, 46, 8, 3);
      }

      function drawStage(t, dt) {
        const E = ERA[eraNow()];
        g.save();
        if (shake > 0.05) {
          g.translate(Math.round((Math.random() - 0.5) * shake * 2), Math.round((Math.random() - 0.5) * shake * 2));
        }
        drawSky(t, E);
        drawCity(t);

        /* doves, because something should be alive up there */
        for (let i = 0; i < 2; i++) {
          const x = ((t * 16 + i * 210) % 380) - 40;
          const y = 96 + i * 26 + Math.round(Math.sin(t * 0.9 + i) * 6);
          const f = Math.floor(t * 5 + i) % 2;
          R(x, y + f, 4, 1, 15); R(x + 4, y, 3, 1, 15); R(x + 7, y + f, 4, 1, 15);
        }

        /* him. Gold on blue, which is the only colour scheme it has ever had */
        const beat = 1 + Math.sin(t * 1.1) * 0.02;
        const sc = squash > 0 ? 0.88 + (1 - squash) * 0.1 : beat;
        const Rr = Math.round(62 * sc);
        washOval(CX, CY, Rr + 34, Rr + 34, E.glow, 1 + Math.round((Math.sin(t * 0.8) + 1) * 0.8 + pulse * 4));
        washOval(CX, CY, Rr + 16, Rr + 16, E.glow, 3 + Math.round(pulse * 5));
        washOval(CX, CY, Rr + 7, Rr + 7, 11, 2);
        star(CX, CY, Rr, 14, 0, 15, 6);
        /* one glint, travelling slowly round the rim the way polish does */
        const ga = t * 0.6;
        const gx = CX + Math.round(Math.cos(ga) * Rr * 0.52), gy = CY + Math.round(Math.sin(ga) * Rr * 0.52);
        R(gx - 2, gy - 1, 5, 3, 15); R(gx - 1, gy - 3, 3, 7, 15);
        if (glint > 0) { R(CX - 22, CY - 30, 44, 2, 15); R(CX - 2, CY - 46, 4, 34, 15); }

        /* the chain, in the middle of the star, once it is worth watching */
        if (combo >= 5) {
          g.font = 'bold ' + (13 + Math.min(14, combo)) + 'px monospace';
          g.textAlign = 'center'; g.textBaseline = 'middle';
          const col = combo >= 50 ? 15 : combo >= 25 ? 13 : combo >= 10 ? 12 : 11;
          g.fillStyle = C(0); g.fillText('x' + combo, CX + 2, CY + 46 + 2);
          g.fillStyle = C(col); g.fillText('x' + combo, CX, CY + 46);
          /* the fuse: how long the chain has left */
          const w = Math.round(56 * (1 - comboT / 0.9));
          R(CX - 28, CY + 60, 56, 3, 0); R(CX - 28, CY + 60, w, 3, col);
          g.textAlign = 'left'; g.textBaseline = 'alphabetic';
        }

        /* Shabbat. Two flames, and the whole picture warms and stops. */
        if (S.shabT > 0) { wash(0, 0, 300, 300, 6, 5); wash(0, 0, 300, 300, 0, 3); }
        if (S.shabT > 0 || S.litFor > 0) {
          [92, 208].forEach((fx, k) => {
            R(fx - 4, 236, 9, 26, 7); R(fx - 4, 236, 3, 26, 15);
            R(fx - 8, 260, 17, 5, 7); R(fx - 8, 260, 17, 1, 15);
            const f = Math.round(Math.sin(t * 9 + k * 2) * 1.5);
            R(fx - 1, 228, 3, 9, 14);
            R(fx - 2 + f, 222, 5, 8, 14);
            R(fx - 1 + f, 218, 3, 5, 15);
            washOval(fx, 226, 16, 20, 14, 3);
          });
        }

        /* the golden star */
        if (gs) {
          gs.t += dt;
          if (gs.t > gs.life) { gs = null; }
          else {
            const fade = gs.t > gs.life - 3 && Math.floor(gs.t * 6) % 2 === 0;
            if (!fade) {
              const bob = Math.round(Math.sin(t * 2) * 3);
              const p2 = 4 + Math.round((Math.sin(t * 5) + 1) * 2);
              washOval(gs.x, gs.y + bob, 30, 30, 14, p2);
              star(gs.x, gs.y + bob, gs.r, 14, 0, 15, 6);
              if (Math.floor(t * 3) % 2 === 0) spray(gs.x, gs.y + bob, 1, 14, 20);
            }
          }
        }

        /* icons in flight, on a real arc, from the row to the star and back */
        for (let i = flyers.length - 1; i >= 0; i--) {
          const f = flyers[i];
          f.t += dt;
          if (f.t > f.life) { flyers.splice(i, 1); continue; }
          let k = f.t / f.life;
          if (f.back) k = 1 - k;
          const x = 302 + (CX - 302) * k;
          const y = f.y0 + (CY - f.y0) * k - Math.sin(k * 3.14159) * 60;
          const sz = 26 * (0.5 + (1 - k) * 0.9);
          drawFlyIcon(f, Math.round(x - sz / 2), Math.round(y - sz / 2), Math.round(sz));
        }

        /* sparks, coins and dust */
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt;
          if (p.t > (p.life || 1.1)) { parts.splice(i, 1); continue; }
          const late = p.t > (p.life || 1.1) * 0.7;
          if (p.k === 1) { R(p.x, p.y, p.sz + 1, p.sz + 1, late ? 6 : 15); R(p.x, p.y, p.sz, p.sz, late ? 14 : p.c); }
          else R(p.x, p.y, p.sz || 2, p.sz || 2, late ? 6 : p.c);
        }

        /* shockwaves. Whole-pixel circles, no stroke, no easing curve */
        for (let i = rings.length - 1; i >= 0; i--) {
          const rr = rings[i];
          rr.t += dt;
          if (rr.t > rr.life) { rings.splice(i, 1); continue; }
          const k = rr.t / rr.life, rad = Math.round(rr.r1 * k);
          const th = rr.t > rr.life * 0.6 ? 1 : 2;
          for (let a = 0; a < 40; a++) {
            const an = a / 40 * 6.28318;
            R(rr.x + Math.cos(an) * rad, rr.y + Math.sin(an) * rad, th, th, rr.c);
          }
        }

        /* the numbers on the way up */
        for (let i = floats.length - 1; i >= 0; i--) {
          const f = floats[i];
          f.t += dt; f.y -= (f.big ? 20 : 34) * dt; f.x += f.vx * dt;
          if (f.t > 1.4) { floats.splice(i, 1); continue; }
          const gr = f.big ? Math.min(1, f.t * 8) : 1;
          g.font = (f.big ? 'bold ' : '') + Math.round((f.big ? 20 : 12) * gr) + 'px monospace';
          g.textAlign = 'center';
          /* a black ring all the way round, because a one-pixel shadow does
             not survive a sky and a city and forty sparks behind it */
          g.fillStyle = C(0);
          for (let d = 0; d < 8; d++) {
            g.fillText(f.txt, f.x + [1, 1, 0, -1, -1, -1, 0, 1][d], f.y + [0, 1, 1, 1, 0, -1, -1, -1][d]);
          }
          g.fillStyle = C(f.t > 1.05 ? 6 : f.col); g.fillText(f.txt, f.x, f.y);
          g.textAlign = 'left';
        }

        /* the machloket, over the top of everything */
        if (arg) {
          wash(0, 0, 300, 300, 0, 11);
          R(8, 58, 284, 156, 0); R(10, 60, 280, 152, 7); R(12, 62, 276, 148, 0);
          R(10, 60, 280, 2, 15); R(10, 60, 2, 152, 15);
          g.font = '11px monospace'; g.textBaseline = 'top';
          wrapText(arg.q.q, 250).forEach((l, i) => { g.fillStyle = C(15); g.fillText(l, 20, 70 + i * 14); });
          if (!arg.picked) {
            g.fillStyle = C(11); g.fillText('◄ ' + arg.q.a, 20, 150);
            g.fillStyle = C(10); g.fillText('► ' + arg.q.b, 20, 172);
            g.fillStyle = C(8);  g.fillText('pick a side. both are the words of the living God.', 20, 194);
          } else {
            wrapText(arg.q.r, 250).forEach((l, i) => { g.fillStyle = C(14); g.fillText(l, 20, 150 + i * 14); });
          }
          g.textBaseline = 'alphabetic';
        }

        /* The yahrzeit candle. It sits on its own shelf, it is not part of
           the economy, and clicking it will never give you anything. */
        R(258, 288, 38, 3, 8); R(258, 288, 38, 1, 7);
        R(272, 268, 8, 20, 7); R(272, 268, 2, 20, 15); R(278, 268, 2, 20, 8);
        R(269, 285, 14, 4, 8); R(269, 285, 14, 1, 7);
        if (yizT > 0) {
          const f = Math.round(Math.sin(t * 8) * 1.2);
          R(274, 260, 4, 9, 14); R(273 + f, 254, 5, 7, 14); R(274 + f, 251, 3, 4, 15);
          washOval(276, 258, 16, 20, 14, 3);
        } else {
          R(275, 264, 2, 5, 8);
        }
        g.font = '10px monospace'; g.textBaseline = 'top';
        g.fillStyle = C(8); g.fillText('yahrzeit', 252, 292);
        g.textBaseline = 'alphabetic';

        /* the banner, sweeping in from the left and out to the right */
        if (banners.length) {
          const b = banners[0];
          b.t += dt;
          if (b.t > b.life) banners.shift();
          else {
            const k = b.t / b.life;
            const x = k < 0.16 ? Math.round(-300 + (k / 0.16) * 300)
                    : k > 0.84 ? Math.round(((k - 0.84) / 0.16) * 300) : 0;
            const y = 20;
            R(x, y, 300, 3, b.col);
            R(x, y + 3, 300, 40, 0);
            wash(x, y + 3, 300, 40, b.col, 4);
            R(x, y + 43, 300, 3, b.col);
            /* chevrons sliding along the ends only: across the middle they
               eat the words, which is the one thing a banner may not do */
            for (let i = 0; i < 6; i++) {
              const cxx = x + ((t * 90 + i * 60) % 360) - 30;
              if (cxx > x + 44 && cxx < x + 226) continue;
              wash(cxx, y + 3, 14, 40, b.col, 5);
            }
            R(x + 40, y + 6, 220, 34, 0);
            g.textAlign = 'center';
            g.font = 'bold 17px monospace';
            g.fillStyle = C(0); g.fillText(b.txt, x + 151, y + 24);
            g.fillStyle = C(b.col); g.fillText(b.txt, x + 150, y + 23);
            if (b.sub) {
              g.font = '11px monospace';
              g.fillStyle = C(15); g.fillText(b.sub, x + 150, y + 38);
            }
            g.textAlign = 'left';
          }
        }

        /* and the flash, last, over everything */
        if (flash > 0.01) wash(0, 0, 300, 300, flashCol, Math.round(flash * 14));
        g.restore();
      }

      /* the little picture a flyer carries */
      function drawFlyIcon(f, x, y, sz) {
        const k = sz / 26;
        const rr = (a, b, w, h, c) => R(x + a * k, y + b * k, Math.max(1, w * k), Math.max(1, h * k), c);
        if (f.kind === 'b') mgIcon(rr, f.id);
        else if (f.kind === 't') mgTierIcon(rr, f.id, f.tier);
        else mgUpIcon(rr, f.id);
      }

      function wrapText(s, w) {
        const out = []; let cur = '';
        s.split(' ').forEach(word => {
          const n = cur ? cur + ' ' + word : word;
          if (cur && g.measureText(n).width > w) { out.push(cur); cur = word; } else cur = n;
        });
        if (cur) out.push(cur);
        return out;
      }

      /* ---- 32.30 the ticker ----------------------------------------------- */
      const tick = $('.mgticker');
      let newsIx = Math.floor(Math.random() * MG_NEWS.length), newsPos = 0, newsT = 0;
      const PADN = 64;
      function stepNews(dt) {
        newsT += dt;
        if (newsT < 0.085) return;
        newsT = 0;
        const s = ' '.repeat(PADN) + MG_NEWS[newsIx] + ' '.repeat(PADN);
        newsPos++;
        if (newsPos > s.length - PADN) {
          newsPos = 0;
          newsIx = (newsIx + 1 + Math.floor(Math.random() * 3)) % MG_NEWS.length;
        }
        tick.textContent = s.slice(newsPos, newsPos + PADN);
      }

      /* ---- 32.31 the loop -------------------------------------------------- */
      const nEl = $('.mgn'), rEl = $('.mgrate'), bEl = $('.mgbuffs'), aEl = $('.mgact'),
            hEl = $('.mghint'), gEl = $('.mggoal');
      let raf = null, last = 0, acc = 0, saveT = 0, uiT = 0, achT = 0;

      function frame(ts) {
        if (!alive || !document.body.contains(cv)) { alive = false; Song.stop(); save(); return; }
        raf = requestAnimationFrame(frame);
        if (!last) last = ts;
        let dt = (ts - last) / 1000; last = ts;
        if (dt > 0.4) dt = 0.4;
        acc += dt;
        if (acc < 1 / 30) return;
        const step = acc; acc = 0;
        frameStamp++;                 /* drops the economy memo */
        if (!CRT.on) { Song.stop(); return; }
        Song.sync(); Song.rot(step);

        const t = ts / 1000;

        /* production */
        const rate = mps();
        if (rate > 0) { const v = rate * step; S.mitz += v; S.total += v; S.run += v; }
        if (S.shabT > 0) S.menu += step;

        /* buffs */
        for (let i = S.buffs.length - 1; i >= 0; i--) {
          S.buffs[i].t -= step;
          if (S.buffs[i].t <= 0) S.buffs.splice(i, 1);
        }
        /* the week */
        if (S.shabT > 0) { S.shabT -= step; if (S.shabT <= 0) endShabbat(); }
        else {
          S.shabIn -= step;
          if (S.shabIn <= 0) startShabbat();
        }
        /* golden stars */
        gsIn -= step * goldRate();
        if (gsIn <= 0 && !gs && S.total > 500) { spawnGold(); gsIn = 110 + Math.random() * 130; }
        /* the argument comes round on its own once it is open */
        if (upOn('s_pil') && !arg && Math.random() < step / 240) openArg();
        if (arg && arg.picked) { arg.t += step; if (arg.t > 7) { arg = null; refreshAll(true); } }

        /* everything that is only there to be looked at, decaying */
        if (squash > 0) squash -= step * 9;
        if (spin > 0)   spin  -= step * 3;
        if (shake > 0)  shake  = Math.max(0, shake - step * 22);
        if (flash > 0)  flash  = Math.max(0, flash - step * 2.4);
        if (glint > 0)  glint -= step;
        pulse = Math.max(0, pulse - step * 3);
        for (let i = 0; i < popT.length; i++) if (popT[i] > 0) popT[i] -= step;
        /* the star breathes a ring out on its own every few seconds, so an
           idle window is never a still picture */
        idleRing -= step;
        if (idleRing <= 0) { ring(CX, CY, 108, 11, 1.1); idleRing = 4.5 + Math.random() * 2.5; }
        /* held button: keeps pressing at a rate a hand could actually manage */
        if (held) { holdT -= step; if (holdT <= 0) { holdT = 0.085; press(null); } }
        comboT += step; if (comboT > 0.9) { combo = 0; comboT = 0; }
        /* the chain drives how loud the band plays */
        const wantHeat = combo >= 40 ? 3 : combo >= 22 ? 2 : combo >= 8 ? 1 : 0;
        if (wantHeat !== Song.heat) {
          Song.heat = wantHeat;
          if (wantHeat > 0) Song.recue();
        }
        if (yizT > 0) yizT -= step;
        if (S.litFor > 0 && S.shabT <= 0 && S.shabIn > WARN) S.litFor = 0;

        /* ninety-eight achievements, thirty times a second, over inputs that
           move slowly. Five times a second is plenty. */
        achT += step;
        if (achT > 0.2) { achT = 0; checkAch(); }
        stepNews(step);

        /* the numbers, ten times a second, which is as fast as anybody reads */
        /* the counter rolls rather than snapping, so a golden star or a big
           sale is a number climbing instead of a number replaced */
        if (shownMitz > S.mitz * 1.5 || shownMitz < S.mitz * 0.5) shownMitz = S.mitz;
        else shownMitz += (S.mitz - shownMitz) * Math.min(1, step * 9);
        /* a power of a thousand crossed is worth announcing, once */
        const mag = Math.floor(Math.log10(Math.max(1, S.total)) / 3);
        if (S.mag == null) S.mag = mag;
        else if (mag > S.mag) {
          S.mag = mag;
          banner(mgFmt(Math.pow(1000, mag)).toUpperCase() + ' MITZVOT', 'in this lifetime and the ones before it', 15, null);
          sfx.milestone(); pulse = 1;
          ring(CX, CY, 190, 15, 1.1);
          kick(4, 0.3, 15);
        }

        uiT += step;
        if (uiT > 0.1) {
          uiT = 0;
          nEl.textContent = mgFmt(Math.floor(shownMitz));
          nEl.classList.toggle('big', S.mitz > 1e9);
          rEl.innerHTML = 'per second: <b>' + mgFmt(rate) + '</b>' +
            (S.shabT > 0 ? ' <i>(resting)</i>' : '') +
            (combo >= 5 ? ' <u>crit ' + Math.round(critChance() * 100) + '%</u>' : '');
          /* buffs get a draining bar, because a number counting down is a
             fact and a bar emptying is a feeling */
          bEl.innerHTML = S.buffs.map(b => {
            const k = Math.max(0, Math.min(1, b.t / b.max));
            return '<span class="mgbuff" style="color:' + C(b.col) + '">' + b.n + ' ' + Math.ceil(b.t) + 's' +
                   '<i style="width:' + Math.round(k * 100) + '%;background:' + C(b.col) + '"></i></span>';
          }).join('');
          let act = '';
          if (S.shabT > 0) {
            act = '<span class="mgshab">SHABBAT &mdash; ' + Math.ceil(S.shabT) + 's. ' +
              (upOn('s_goy') ? 'Your neighbour is keeping it going.' : 'Almost everything has stopped.') + '</span>';
          } else if (S.shabIn <= WARN) {
            act = S.litFor > 0
              ? '<span class="mgshab">THE CANDLES ARE LIT. ' + Math.ceil(S.shabIn) + 's.</span>'
              : '<span class="mgshab lit">LIGHT THE CANDLES &mdash; ' + Math.ceil(S.shabIn) + 's left</span>';
          } else {
            act = '<span class="mgsoon">shabbat in ' + Math.ceil(S.shabIn) + 's</span>';
          }
          aEl.innerHTML = act;
          /* The window takes its colour from whatever is going on inside it.
             Seventy per cent of an interface being black is fine when it is a
             terminal and wrong when it is a room you are living in. */
          const lead = S.buffs.length ? S.buffs.reduce((a, b) => (b.m || 1) > (a.m || 1) ? b : a) : null;
          const mood = S.shabT > 0 ? 'shab'
                     : !lead ? (combo >= 10 ? 'chain' : '')
                     : lead.n === 'BITTUL TORAH' ? 'bad'
                     : lead.n === 'HAVDALAH' ? 'havd'
                     : lead.n === 'SIMCHA' ? 'simcha'
                     : lead.n.indexOf('ORCHIM') >= 0 ? 'guest' : 'buff';
          if (root.dataset.mood !== mood) { root.dataset.mood = mood; }
          hEl.textContent = MG_B.reduce((a, b, i) => a + S.own[i], 0) + ' buildings · ' +
            upCount() + ' upgrades · ' + achCount() + '/' + MG_ACH.length + ' mitzvot · ' +
            S.zech + ' zechut';
          /* the next thing you cannot yet afford, and how close it is. This is
             the single most useful bar an idle game can put on screen. */
          let best = null;
          MG_B.forEach((b, i) => {
            const c = cost(i, 1);
            if (c > S.mitz && (!best || c < best.c)) best = { n: b.n, c: c };
          });
          upgradeList().forEach(u => {
            if (u.c > S.mitz && (!best || u.c < best.c)) best = { n: u.n, c: u.c };
          });
          if (best) {
            const k = Math.max(0, Math.min(1, S.mitz / best.c));
            const eta = rate > 0 ? (best.c - S.mitz) / rate : Infinity;
            gEl.innerHTML = '<span>' + best.n + '</span><b>' +
              (eta < 1 ? 'now' : eta < 90 ? Math.ceil(eta) + 's' :
               eta < 5400 ? Math.ceil(eta / 60) + 'm' :
               isFinite(eta) ? Math.ceil(eta / 3600) + 'h' : '—') + '</b>' +
              '<i style="width:' + (k * 100).toFixed(1) + '%"></i>';
          } else {
            gEl.innerHTML = '<span>everything is affordable</span><b>go</b><i style="width:100%"></i>';
          }
          refreshAll();
        }

        saveT += step;
        if (saveT > 20) { saveT = 0; save(); }

        drawStage(t, step);
      }

      aEl.addEventListener('mousedown', ev => {
        if (ev.target.classList.contains('lit')) lightCandles();
      });

      load();
      refreshAll(true);
      raf = requestAnimationFrame(frame);

      const watch = setInterval(() => {
        if (document.body.contains(cv)) return;
        clearInterval(watch);
        alive = false; Song.stop(); save();
        if (raf) cancelAnimationFrame(raf);
      }, 900);
    }
  });
  }
};