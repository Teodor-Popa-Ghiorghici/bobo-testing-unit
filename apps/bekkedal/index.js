import { createWindow, raise } from '../../kernel/wm.js';
import { fs as vfs } from '../../kernel/vfs.js';
import { VGA16 } from '../../kernel/god.js';
import { CRT, Vol, musGain } from '../../kernel/hardware.js';
import { BEK_T, BEK_T_SRC, BEK_ART_SCALE, BEK_COLS, BEK_ROWS, BEK_SAVE, UI, BEK_ITEMS, BEK_SEED_ORDER,
         BEK_CROPS, BEK_TOOLS, AXE_NAME, PICK_NAME, BEK_MAPS, BEK_SOLID, BEK_NPCS, BEK_GOATS,
         BEK_TALK, BEK_QUESTS, BEK_HOUSE,
         BEK_W, BEK_H, BEK_HUD_H, BEK_VIEW_X, BEK_VIEW_Y, BEK_VIEW_W, BEK_VIEW_H,
         BEK_CAM_MAX_X, BEK_CAM_MAX_Y,
         BEK_RAIN_N, BEK_RAIN_STRIDE_X, BEK_RAIN_STRIDE_Y, BEK_RAIN_LEN, BEK_RAIN_VX, BEK_RAIN_VY,
         BEK_DITHER_CELL, BEK_DITHER_PX, BEK_MAP_W, BEK_MAP_H } from './data.js';
import { hLowV, patchAmt, mapSalt, groundVar, rockVar, pathVar, waterVar, edgeVar,
         soilVar, objVar, LOW, PATCH, JIT } from './noise.js';
import { FONT_SM, FONT_LG } from './font.js';
import { createText } from './text.js';
import { BORDER, CELL_SM, LINE_SM, LINE_LG, PAD_SM, PAD_LG, GLYPH_SM, ICON_PX,
         HUD_PAD, HUD_GAP, HUD_TXT_DY, HUD_BOT_Y, EN_BAR_W, EN_BAR_H, EN_BAR_X, EN_BAR_Y,
         DROP_W, DROP_H, TIP_W, TIP_H, TIP_X, TIP_Y, TIP_COL2,
         FISH_TRACK_W, FISH_TRACK_H, FISH_W, FISH_H, FISH_X, FISH_Y,
         FISH_TRACK_X, FISH_TRACK_Y, FISH_NEEDLE_W, FISH_NEEDLE_OVER,
         DLG_BODY_LINES, DLG_W, DLG_H, DLG_X, DLG_Y, DLG_TX, DLG_TW,
         SLEEP_W, SLEEP_H, SLEEP_X, SLEEP_Y, OFFER_W, OFFER_H, OFFER_X, OFFER_Y,
         SHOP_ROWS, SHOP_ROW, SHOP_W, SHOP_H, SHOP_X, SHOP_Y, SHOP_COL_W, SHOP_NAME_DX, SHOP_PRICE_DX,
         BAG_COLS, BAG_ROWS, BAG_CAP, BAG_ROW, BAG_W, BAG_H, BAG_X, BAG_Y, BAG_CW, BAG_NAME_DX, BAG_QTY_DX,
         QUEST_ENTRY, QUEST_W, QUEST_H, QUEST_X, QUEST_Y, QUEST_STATUS_DX,
         TRAVEL_W, TRAVEL_H, TRAVEL_X, TRAVEL_Y,
         END_SRC_W, END_SRC_H, END_TREES, END_TREE_DX, END_HOUSE_W, END_HOUSE_X,
         END_TEXT_X, END_TEXT_Y } from './layout.js';

let BEK_LANG = 'bi';                       /* 'bi' bilingual · 'en' english  */
const T = s => {
  if (s == null) return '';
  if (typeof s === 'string') return s;
  const v = BEK_LANG === 'en' ? (s.en != null ? s.en : s.no) : (s.no != null ? s.no : s.en);
  return v == null ? '' : v;
};

export default {
  id: 'bekkedal',
  title: 'Bekkedal',
  width: 988,                              /* 960 canvas at 1:1, plus frame */
  height: 640,
  resizable: true,
  mount(root, ctx) {
  const body = root;
      const wrap = document.createElement('div');
      wrap.className = 'gamepane';
      const cv = document.createElement('canvas');
      cv.width = BEK_W; cv.height = BEK_H;
      cv.className = 'gamecv bekcv';
      cv.tabIndex = 0;
      wrap.appendChild(cv);

      const bar = document.createElement('div');
      bar.className = 'appbar';
      const bSave = document.createElement('button'); bSave.className = 'appbtn'; bSave.textContent = 'SAVE';
      const bLoad = document.createElement('button'); bLoad.className = 'appbtn'; bLoad.textContent = 'LOAD';
      const bLang = document.createElement('button'); bLang.className = 'appbtn';
      const bFull = document.createElement('button'); bFull.className = 'appbtn'; bFull.textContent = 'FULLSCREEN';
      const info = document.createElement('span'); info.className = 'godword';
      bar.appendChild(bSave); bar.appendChild(bLoad); bar.appendChild(bLang); bar.appendChild(bFull); bar.appendChild(info);
      body.appendChild(wrap); body.appendChild(bar);

      /* wrap/bar become an explicit flex column so wrap's box (the space the
         canvas has to scale into) is the window body's height minus the
         appbar, not however tall the canvas happens to make it — otherwise
         sizing the canvas from wrap's own size would be circular. */
      body.style.display = 'flex'; body.style.flexDirection = 'column';
      wrap.style.flex = '1 1 auto'; wrap.style.minHeight = '0';
      bar.style.flex = '0 0 auto';

      /* `let`, not `const`: the terrain cache below renders the very same
         tile functions into its own offscreen context by pointing `g` at it
         for the length of a rebuild, so none of them needs a context
         argument threaded through. */
      let g = cv.getContext('2d');
      if (!g) { info.textContent = 'NO CANVAS.'; return; }
      const C = i => { const p = VGA16[i]; return 'rgb(' + p[0] + ',' + p[1] + ',' + p[2] + ')'; };
      const TX = (no, en) => BEK_LANG === 'en' ? en : no;      /* resolve a dynamic pair now */
      const iname = id => T(BEK_ITEMS[id].name);
      const refreshBar = () => {
        bLang.textContent = BEK_LANG === 'en' ? 'ENGLISH' : 'NORSK+ENG';
        info.textContent = TX('WASD · SPACE HANDLING · F SÅ · C FRØ · TAB REDSKAP · R SPIS · I SEKK · Q OPPDRAG · M KART',
                              'WASD · SPACE ACT · F PLANT · C SEED · TAB TOOL · R EAT · I BAG · Q QUESTS · M MAP');
      };

      /* ---- fullscreen & the display scale --------------------------------
         The canvas is always drawn at its native BEK_W x BEK_H (960x540) —
         fullscreen and windowed resize only change how many whole screen
         pixels each canvas pixel is presented at. A ResizeObserver on wrap
         is the single trigger for recomputing that scale: entering/leaving
         fullscreen resizes wrap exactly like dragging the window's grip
         does, so both paths recompute the same way and Escape (which the
         browser handles natively) needs no special-casing here — it just
         shrinks wrap back to the windowed box, which the observer picks up
         and rescales to the same integer factor as before. */
      function applyScale() {
        const isFS = document.fullscreenElement === wrap;
        const availW = isFS ? window.innerWidth : wrap.clientWidth;
        const availH = isFS ? window.innerHeight : wrap.clientHeight;
        const scale = Math.max(1, Math.min(Math.floor(availW / BEK_W), Math.floor(availH / BEK_H)));
        cv.style.width = (BEK_W * scale) + 'px';
        cv.style.height = (BEK_H * scale) + 'px';
        wrap.style.backgroundColor = C(0);              /* solid VGA16 letterbox/pillarbox */
      }
      /* Escape exiting fullscreen is the browser's own doing, not ours — it
         can't be preventDefault()'d, and some browsers swallow that keydown
         entirely instead of also delivering it to the page, so the shop/bag/
         quest/etc. handlers below never see it and the menu is left open
         behind a windowed game. manualFSToggle tells fullscreenchange
         whether *we* drove this transition (F11 / the button, which should
         leave menus alone) or the browser did on its own (Escape or its
         fullscreen-exit UI), in which case backing out of an open menu too
         is the least surprising thing to do. */
      let manualFSToggle = false;
      function toggleFullscreen() {
        manualFSToggle = true;
        if (document.fullscreenElement === wrap) document.exitFullscreen().catch(() => {});
        else wrap.requestFullscreen().catch(() => {});
      }
      const onFSChange = () => {
        const on = document.fullscreenElement === wrap;
        bFull.classList.toggle('on', on);
        if (S) S.fullscreen = on ? 1 : 0;
        if (!on && !manualFSToggle) closeMenu();
        manualFSToggle = false;
        applyScale();
      };
      document.addEventListener('fullscreenchange', onFSChange);
      const ro = new ResizeObserver(() => applyScale());
      ro.observe(wrap);
      applyScale();
      bFull.addEventListener('click', () => { toggleFullscreen(); cv.focus(); });

      /* ---- state -------------------------------------------------------- */
      let S = null;
      const fresh = () => ({
        ver: 4, lang: BEK_LANG, fullscreen: 0,
        map: 'farm', px: 3, py: 8, dir: 0, step: 0, walk: 0,
        day: 1, min: 6 * 60, kr: 500, en: 120, enMax: 120,
        water: 20, waterMax: 20,
        tools: { spade: 1, kanne: 1, oks: 1, stang: 0, hakke: 0 },
        tool: 0, axeLv: 1, pickLv: 0, seedIx: 0,
        bag: { potetfro: 5 },
        soil: {}, felled: {}, mined: {}, picked: {}, drops: [],
        fr: { astrid: 0, hakon: 0, ingrid: 0, olav: 0, marit: 0, sigrid: 0, gunnar: 0, lars: 0 },
        met: {}, seen: {}, flag: {}, q: {},
        chatIx: {}, disc: { farm: 1 }, weather: 'klar',
        built: 0, ending: 0,
        /* the completed house is a permanent milestone, not part of the
           resettable run state — never touched by fresh() after game start */
        houseBuilt: false, houseBuiltDay: null,
        /* derived from houseBuilt; not referenced anywhere yet, it is the
           hook Phase 8 (act 2 content) will read */
        act2Unlocked: false
      });
      /* nested objects a stale save might be missing */
      const heal = s => {
        const f = fresh();
        ['tools', 'fr', 'soil', 'felled', 'mined', 'picked', 'flag', 'q', 'met', 'seen', 'chatIx', 'disc', 'bag'].forEach(k => {
          if (typeof s[k] !== 'object' || s[k] === null) s[k] = f[k];
        });
        Object.keys(f.tools).forEach(k => { if (s.tools[k] == null) s.tools[k] = f.tools[k]; });
        Object.keys(f.fr).forEach(k => { if (s.fr[k] == null) s.fr[k] = 0; });
        ['axeLv', 'pickLv', 'seedIx', 'enMax', 'waterMax', 'weather', 'ver', 'houseBuilt', 'houseBuiltDay', 'act2Unlocked', 'fullscreen'].forEach(k => { if (s[k] == null) s[k] = f[k]; });
        if (!Array.isArray(s.drops)) s.drops = [];
        if (typeof s.chatIx === 'number') s.chatIx = {};
        return s;
      };

      let mode = '', dlg = null, shop = null, fish = null, note = '', noteT = 0, travel = null, offer = null;
      /* The SAVE button still exists, but nothing should be lost by closing a
         window, so the valley writes itself down every few seconds and again
         on the way out. */
      let autoT = 0;
      function autoSave() {
        if (!S) return;
        try { S.lang = BEK_LANG; localStorage.setItem(BEK_SAVE, JSON.stringify(S)); } catch (e) {}
      }
      let alive = true, raf = null, last = 0;
      const keys = Object.create(null);

      /* ---- helpers ------------------------------------------------------ */
      const M = () => BEK_MAPS[S.map];
      const rkey = (mp, x, y) => mp + ':' + x + ',' + y;
      const key = (x, y) => x + ',' + y;
      const tileAt = (mp, x, y) => {
        if (x < 0 || y < 0 || x >= BEK_COLS || y >= BEK_ROWS) return BEK_MAPS[mp] && BEK_MAPS[mp].inside ? 'H' : 'T';
        const m = BEK_MAPS[mp];
        if (S.built && mp === 'lake' && BEK_HOUSE[y] && BEK_HOUSE[y][x] !== ' ') return BEK_HOUSE[y][x];
        if (S.felled[rkey(mp, x, y)] > S.day) return 'g';
        if (S.mined[rkey(mp, x, y)] > S.day) return 'g';
        if (S.picked[rkey(mp, x, y)] > S.day) return ',';
        return m.rows[y].charAt(x);
      };
      const solid = (mp, x, y) => {
        const c = tileAt(mp, x, y);
        if (c === 'D') return true;
        return BEK_SOLID.indexOf(c) >= 0;
      };
      const has = (id, n) => (S.bag[id] || 0) >= (n || 1);
      const add = (id, n) => { S.bag[id] = (S.bag[id] || 0) + (n || 1); if (S.bag[id] <= 0) delete S.bag[id]; };
      const say = t => { note = t; noteT = 2.8; };
      const clock = () => {
        /* S.min runs on a float accumulator, so floor before splitting it —
           otherwise the minutes render as 43.99999618530273 and the strip
           spills across the whole picture. */
        const tot = Math.floor(S.min), h = Math.floor(tot / 60) % 24, m = tot % 60;
        return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
      };
      const dawn  = () => S.min >= 5 * 60 && S.min < 6 * 60 + 30;
      const dusk  = () => S.min >= 18 * 60 && S.min < 20 * 60;
      const night = () => S.min >= 20 * 60 || S.min < 5 * 60;
      const npcsHere = () => BEK_NPCS.filter(n => n.map === S.map && (!n.from || S.day >= n.from));
      const price = id => {
        let p = BEK_ITEMS[id].buy || 0;
        if (S.flag.rabatt) p = Math.round(p * 0.9);
        return p;
      };
      const houseCost = () => {
        const skog = S.flag.build === 'skog';
        let kr = skog ? 5000 : 6500;
        if (S.flag.rabatt2) kr -= 500;
        return { kr: kr, tommer: skog ? 30 : 12, stein: skog ? 20 : 10 };
      };
      const gateOK = need => need === 'warm' ? has('ullgenser') : need === 'lamp' ? has('lykt') : need === 'boat' ? !!S.flag.boat : true;
      const curSeed = () => {
        const owned = BEK_SEED_ORDER.filter(id => (S.bag[id] || 0) > 0);
        if (!owned.length) return null;
        return owned[S.seedIx % owned.length];
      };

      /* ---- the speaker -------------------------------------------------- */
      const sfx = {
        step()  { Snd.noise(18, { freq: 500, q: 1.2, vol: 0.012 }); },
        till()  { Snd.noise(90, { freq: 380, q: 0.8, vol: 0.05 }); Snd.tone(150, 70, { type: 'triangle', to: 90, vol: 0.03 }); },
        water() { Snd.noise(220, { freq: 2600, q: 0.6, vol: 0.035 }); },
        chop()  { Snd.noise(70, { freq: 900, q: 1.6, vol: 0.07 }); Snd.tone(220, 120, { type: 'triangle', to: 70, vol: 0.05 }); },
        mine()  { Snd.noise(60, { freq: 500, q: 2.2, vol: 0.08 }); Snd.tone(160, 90, { type: 'square', to: 60, vol: 0.045 }); },
        pick()  { Snd.tone(880, 40, { vol: 0.03 }); Snd.tone(1320, 60, { delay: 0.04, vol: 0.03 }); },
        coin()  { [1046, 1568].forEach((f, i) => Snd.tone(f, 55, { delay: i * 0.05, vol: 0.035 })); },
        talk()  { Snd.tone(760, 16, { vol: 0.016 }); },
        deny()  { Snd.tone(180, 120, { type: 'sawtooth', vol: 0.03 }); },
        cast()  { Snd.noise(140, { freq: 1600, q: 0.7, vol: 0.03 }); },
        bite()  { Snd.tone(1320, 60, { vol: 0.04 }); },
        catch_(){ [784, 1046, 1318, 1568].forEach((f, i) => Snd.tone(f, 70, { delay: i * 0.05, vol: 0.035 })); },
        sleep() { [392, 330, 262].forEach((f, i) => Snd.tone(f, 300, { type: 'triangle', delay: i * 0.18, vol: 0.035 })); },
        bear()  { Snd.noise(260, { freq: 200, q: 0.5, vol: 0.09 }); Snd.tone(96, 300, { type: 'sawtooth', to: 62, vol: 0.05 }); },
        boat()  { Snd.tone(196, 220, { type: 'triangle', to: 147, vol: 0.05 }); Snd.noise(300, { freq: 700, q: 0.5, vol: 0.03 }); },
        done()  { [523, 659, 784, 1046, 1318].forEach((f, i) => Snd.tone(f, 220, { type: 'square', delay: i * 0.09, vol: 0.045 })); },
        /* the rare bite: brighter and higher than the ordinary one, so you
           know what you have hooked before you read the box */
        rare()  { [1568, 2093, 2637].forEach((f, i) => Snd.tone(f, 70, { type: 'square', delay: i * 0.05, vol: 0.045 })); Snd.noise(90, { freq: 3200, q: 1.5, vol: 0.04 }); },
        /* ---- speech ---------------------------------------------------- --
           Nobody has a voice actor, so everyone gets a run of little square
           blips instead: pitched to the speaker, jittered by the line, and
           as long as the line is. It reads as talking without saying a word. */
        blip(base, n, seed) {
          const cnt = Math.max(2, Math.min(8, n));
          for (let i = 0; i < cnt; i++) {
            const j = (seed + i * 37) % 5;
            Snd.tone(base * (0.86 + j * 0.075), 26, { type: 'square', delay: i * 0.045, vol: 0.02 });
          }
        },
        sel()    { Snd.tone(660, 22, { type: 'square', vol: 0.024 }); },
        choose() { Snd.tone(880, 30, { type: 'square', vol: 0.03 }); Snd.tone(1320, 40, { type: 'square', delay: 0.05, vol: 0.026 }); }
      };

      /* ---- who is talking, and how it sounds ---------------------------- */
      const voiceOf = npc => !npc ? 520 : npc.bear ? 110 : (npc.voice || 520);
      let spokeDlg = null, spokeIx = -1;
      function speakLine() {
        if (!dlg) return;
        if (dlg.npc && dlg.npc.bear) { sfx.bear(); return; }
        const s = T(dlg.lines && dlg.lines[dlg.i]) || '';
        sfx.blip(voiceOf(dlg.npc), Math.ceil(s.length / 7), (dlg.i * 13 + s.length) % 5);
      }
      /* one hook for every path that can put a line on screen: the frame
         notices the line changed and speaks it, so no caller has to remember */
      function speechTick() {
        if (mode !== 'talk' || !dlg) { spokeDlg = null; spokeIx = -1; return; }
        if (dlg.opts) {
          if (spokeDlg !== dlg || spokeIx !== 'q') { spokeDlg = dlg; spokeIx = 'q'; sfx.blip(voiceOf(dlg.npc), 5, 2); }
          return;
        }
        if (spokeDlg !== dlg || spokeIx !== dlg.i) { spokeDlg = dlg; spokeIx = dlg.i; speakLine(); }
      }

      /* ---- five songs, on rotation -------------------------------------- */
      const NOTE = { A2:110, B2:123.47, Cs3:138.59, D3:146.83, E3:164.81, Fs3:185, G3:196, A3:220, B3:246.94,
                     Cs4:277.18, D4:293.66, E4:329.63, Fs4:369.99, G4:392, A4:440, B4:493.88, Cs5:554.37,
                     D5:587.33, E5:659.26, Fs5:739.99, G5:783.99, A5:880 };
      const SONGS = {
        dag: { bpm: 88, len: 32,
          lead: [['Fs4',0,4],['A4',4,2],['B4',6,2],['D5',8,4],['A4',12,4],['B4',16,2],['A4',18,2],['Fs4',20,4],['E4',24,2],['D4',26,2],['Fs4',28,4]],
          bass: [['D3',0,4],['D3',4,4],['A2',8,4],['A2',12,4],['B2',16,4],['B2',20,4],['G3',24,4],['A2',28,4]],
          pad:  [['D4',0,8],['Fs4',0,8],['A3',8,8],['Cs5',8,8],['B3',16,8],['Fs4',16,8],['G3',24,8],['D4',24,8]],
          arp:  [['D5',0,1],['A4',2,1],['Fs4',4,1],['A4',6,1],['E5',8,1],['Cs5',10,1],['A4',12,1],['Cs5',14,1],['B4',16,1],['Fs4',18,1],['D5',20,1],['Fs4',22,1],['A4',24,1],['D5',26,1],['Fs4',28,1],['A4',30,1]] },
        kveld: { bpm: 66, len: 32,
          lead: [['B3',0,6],['D4',6,2],['Fs4',8,6],['E4',14,2],['D4',16,4],['B3',20,4],['A3',24,6],['B3',30,2]],
          bass: [['B2',0,8],['G3',8,8],['E3',16,8],['Fs3',24,8]],
          pad:  [['D4',0,8],['Fs4',8,8],['B3',16,8],['A3',24,8]],
          arp:  [['B4',0,2],['Fs4',4,2],['D4',8,2],['B4',12,2],['A4',16,2],['E4',20,2],['Fs4',24,2],['B3',28,2]] },
        gruva: { bpm: 58, len: 32,
          lead: [['E3',0,8],['G3',8,4],['A3',12,4],['E3',16,8],['D3',24,4],['E3',28,4]],
          bass: [['E3',0,8],['E3',8,8],['Cs3',16,8],['A2',24,8]],
          pad:  [['E3',0,16],['B3',0,16],['A3',16,16],['E3',16,16]],
          arp:  [['E4',0,2],['B3',6,1],['G4',12,2],['E4',20,1],['A3',24,2],['E4',30,1]] },
        vidda: { bpm: 74, len: 32,
          lead: [['A4',0,4],['E5',4,4],['D5',8,2],['E5',10,2],['A4',12,4],['G4',16,4],['E5',20,4],['D5',24,4],['A4',28,4]],
          bass: [['A2',0,8],['E3',8,8],['G3',16,8],['A2',24,8]],
          pad:  [['A3',0,8],['E4',0,8],['D4',8,8],['A4',8,8],['G3',16,8],['D4',16,8],['A3',24,8],['E4',24,8]],
          arp:  [['A5',0,1],['E5',3,1],['A4',6,1],['E5',9,1],['D5',12,1],['A4',15,1],['E5',18,1],['G5',22,1],['E5',26,1],['A4',30,1]] },
        folkedans: { bpm: 108, len: 24,
          lead: [['D5',0,2],['A4',2,1],['D5',3,1],['Fs5',4,2],['E5',6,2],['D5',8,2],['A4',10,2],['B4',12,2],['Cs5',14,2],['D5',16,4],['A4',20,2],['Fs4',22,2]],
          bass: [['D3',0,2],['A2',2,1],['D3',4,2],['A2',6,1],['G3',8,2],['D3',10,1],['A2',12,2],['A2',14,1],['D3',16,2],['A2',18,1],['D3',20,2],['A2',22,1]],
          pad:  [['D4',0,6],['Fs4',0,6],['G3',6,6],['B3',6,6],['A3',12,6],['E4',12,6],['D4',18,6],['Fs4',18,6]],
          arp:  [['D5',0,1],['Fs5',1,1],['A4',2,1],['D5',3,1],['Fs5',4,1],['A5',5,1],['E5',6,1],['Cs5',7,1],['D5',8,1],['A4',9,1],['B4',10,1],['G4',11,1],['A4',12,1],['Cs5',13,1],['E5',14,1],['A4',15,1],['D5',16,1],['A4',17,1],['Fs5',18,1],['D5',19,1],['A4',20,1],['D5',21,1],['Fs4',22,1],['A4',23,1]] }
      };
      const Song = {
        on: false, cur: 'dag', bus: null, when: 0, timer: null, voices: [], g0: -1, rotIn: 90,
        swap: null, FADE: 1.1,          /* seconds a track takes to leave */
        ensure() { Snd.wake(); if (!Snd.ctx) return false; if (!this.bus) { this.bus = Snd.ctx.createGain(); this.bus.gain.value = 0.0001; this.bus.connect(Snd.ctx.destination); } return true; },
        voice(f, at, dur, type, vol) {
          const c = Snd.ctx, o = c.createOscillator(), gn = c.createGain();
          o.type = type; o.frequency.setValueAtTime(f, at);
          gn.gain.setValueAtTime(0.0001, at);
          gn.gain.exponentialRampToValueAtTime(vol, at + 0.04);
          gn.gain.setValueAtTime(vol, at + dur * 0.55);
          gn.gain.exponentialRampToValueAtTime(0.0001, at + dur);
          o.connect(gn); gn.connect(this.bus); o.start(at); o.stop(at + dur + 0.05);
          this.voices.push(o); o.onended = () => { const i = this.voices.indexOf(o); if (i >= 0) this.voices.splice(i, 1); };
        },
        bar(t0, sg) {
          const e = 30 / sg.bpm;
          sg.pad.forEach(n  => this.voice(NOTE[n[0]], t0 + n[1] * e, n[2] * e * 0.95, 'triangle', 0.04));
          sg.bass.forEach(n => this.voice(NOTE[n[0]], t0 + n[1] * e, n[2] * e * 0.9,  'square',   0.05));
          sg.lead.forEach(n => this.voice(NOTE[n[0]], t0 + n[1] * e, n[2] * e * 0.9,  'square',   0.055));
          if (sg.arp) sg.arp.forEach(n => this.voice(NOTE[n[0]], t0 + n[1] * e, n[2] * e * 0.7, 'triangle', 0.03));
          return sg.len * e;
        },
        context() {
          if (S.map === 'gruva') return 'mine';
          if (S.map === 'setra' || S.map === 'vidda') return 'high';
          if (night()) return 'night';
          if (S.map === 'town' && !night()) return 'townday';
          return 'day';
        },
        pool() {
          switch (this.context()) {
            case 'mine': return ['gruva'];
            case 'high': return ['vidda', 'dag'];
            case 'night': return ['kveld', 'gruva'];
            case 'townday': return ['folkedans', 'dag'];
            default: return ['dag', 'folkedans'];
          }
        },
        pickNext(force) {
          const p = this.pool();
          let choices = p.filter(x => x !== this.cur);
          if (!choices.length) choices = p;
          const next = choices[Math.floor(Math.random() * choices.length)];
          if (next === this.cur && !force) return;
          if (!this.on) { this.cur = next; return; }
          this.crossfade(next);
        },
        /* Let the old track walk out before the new one walks in: ramp the
           bus down over FADE, stop the queued voices behind that ramp, then
           start the next one — start() comes up from silence, so the two
           halves meet in the middle instead of one being cut off. */
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
            this.swap = null;
            this.cur = next;
            if (alive && CRT.on && Vol.mus > 0) this.start();
          }, F * 1000 + 40);
        },
        rotStep(dt) {
          if (!this.on || this.swap) return;
          this.rotIn -= dt;
          if (this.pool().indexOf(this.cur) < 0 && this.rotIn > 3) this.rotIn = 3;   /* context changed */
          if (this.rotIn <= 0) { this.pickNext(false); this.rotIn = 70 + Math.random() * 45; }   /* <= 115s, never 2 min */
        },
        level(ramp) {
          if (!this.bus || !Snd.ctx) return;
          const want = musGain();
          if (ramp == null && Math.abs(want - this.g0) < 0.0005) return;
          this.g0 = want;
          const now = Snd.ctx.currentTime, gn = this.bus.gain;
          gn.cancelScheduledValues(now);
          gn.setValueAtTime(Math.max(0.0001, gn.value), now);
          gn.exponentialRampToValueAtTime(Math.max(0.0002, want * 0.9), now + (ramp || 0.4));
        },
        sync() {
          if (!(alive && CRT.on && Vol.mus > 0)) { this.stop(); return; }
          if (this.swap) return;                       /* mid-crossfade: leave it alone */
          if (this.on) this.level(); else this.start();
        },
        /* the fade-in half of a crossfade: bus is at silence, walk it up */
        start() { if (this.on || !this.ensure()) return; this.on = true; this.g0 = -1; this.when = Snd.ctx.currentTime + 0.15; this.level(this.FADE); this.tick(); },
        tick() {
          if (!this.on || !Snd.ctx) return;
          const now = Snd.ctx.currentTime;
          if (this.when < now) this.when = now + 0.05;
          const len = this.bar(this.when, SONGS[this.cur] || SONGS.dag);
          this.when += len;
          this.timer = setTimeout(() => this.tick(), Math.max(300, len * 1000 - 500));
        },
        hardStop() {
          clearTimeout(this.timer); clearTimeout(this.swap); this.swap = null; this.on = false;
          if (!Snd.ctx) return;
          const now = Snd.ctx.currentTime;
          this.voices.forEach(o => { try { o.stop(now + 0.05); } catch (e) {} });
          this.voices = [];
          if (this.bus) this.bus.gain.setValueAtTime(0.0001, now);
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

      /* ---- the day ------------------------------------------------------ */
      const BEK_HOME = { farm:[4,8], town:[4,7], lake:[3,8], forest:[4,7], enga:[4,8], setra:[4,8], vidda:[4,11], gruva:[2,7], fjord:[4,7] };
      function markDisc(m){ if (BEK_MAPS[m] && !BEK_MAPS[m].inside) S.disc[m] = 1; }
      function dropAt(mp, item, tries, area) {
        for (let k = 0; k < (tries || 40); k++) {
          const x = (area ? area[0] : 1) + Math.floor(Math.random() * (area ? area[2] : 22));
          const y = (area ? area[1] : 1) + Math.floor(Math.random() * (area ? area[3] : 13));
          const t = tileAt(mp, x, y);
          if (!solid(mp, x, y) && t !== '.' && t !== 'P') { S.drops.push({ map: mp, x: x, y: y, item: item }); return; }
        }
      }
      function spawnDrops() {
        S.drops = [];
        [['sopp',4],['blabar',3],['kantarell',1]].forEach(p => { for (let i=0;i<p[1];i++) dropAt('forest', p[0]); });
        for (let i=0;i<3;i++) dropAt('setra','multe');
        dropAt('setra','melk'); dropAt('setra','melk');
        for (let i=0;i<3;i++) dropAt('vidda','tyttebar');
        dropAt('vidda','blabar');
        for (let i=0;i<2;i++) dropAt('fjord','tang');
        for (let i=0;i<2;i++) dropAt('lake','blabar',40,[1,9,8,4]);
        dropAt('enga','urt');
      }
      function newDay(passedOut) {
        S.day++; S.min = 6 * 60;
        S.en = passedOut ? Math.round(S.enMax * 0.6) : S.enMax;
        S.water = S.waterMax; S.met = {};
        const rainy = S.weather === 'regn';
        Object.keys(S.soil).forEach(k => {
          const c = S.soil[k];
          if (!c.seed) { c.wet = 0; return; }
          if (rainy) c.wet = 1;                          /* the rain waters for you */
          if (c.wet) { c.age++; c.wet = 0; }
          const spec = BEK_CROPS[c.seed];
          if (spec && c.age >= spec.days) c.ready = 1;
        });
        const r = Math.random();
        S.weather = r < 0.20 ? 'regn' : r < 0.30 ? 'take' : 'klar';
        spawnDrops();
        S.map = 'farm'; S.px = 4; S.py = 8; S.dir = 1;
        sfx.sleep();
        say(TX('DAG ' + S.day + '. ', 'DAY ' + S.day + '. ') +
            (passedOut ? TX('DU SOVNET DER DU STO.', 'YOU SLEPT WHERE YOU FELL.')
                       : S.weather === 'regn' ? TX('REGN I DAG.', 'RAIN TODAY.')
                       : S.weather === 'take' ? TX('TÅKE I DAG.', 'FOG TODAY.') : TX('GOD MORGEN.', 'GOOD MORNING.')));
      }

      /* ---- the verbs ---------------------------------------------------- */
      function facing() { const d = [[0,1],[0,-1],[-1,0],[1,0]][S.dir]; return { x: S.px + d[0], y: S.py + d[1] }; }
      function spend(n) {
        const cost = n + (S.en < 20 ? 1 : 0);               /* tired hands work harder */
        if (S.en < cost) { say(TX('FOR SLITEN. LEGG DEG.', 'TOO TIRED. GO TO BED.')); sfx.deny(); return false; }
        S.en -= cost; return true;
      }
      /* what a rare bite turns into, by water */
      function rareSpecies() { return S.map === 'fjord' ? 'kveite' : 'gullorret'; }
      function fishSpecies(clean, rare) {
        if (rare) return rareSpecies();
        let pool = ['orret', 'laks'];
        if (S.map === 'fjord') pool = ['torsk', 'makrell'];
        else if (S.map === 'vidda') pool = ['roye', 'orret'];
        let goodChance = clean ? 0.6 : 0.28;
        if (S.map === 'lake' && S.flag.fisk === 'ro') goodChance += 0.1;
        if (S.map === 'fjord' && S.flag.sea === 'hav') goodChance += 0.12;
        return Math.random() < goodChance ? pool[1] : pool[0];
      }
      function doorTravel(f) {
        if (S.map === 'lake' && S.built && f.x === 5 && f.y === 4) { S.map = 'lakehouse'; S.px = 11; S.py = 10; S.dir = 1; say(T(BEK_MAPS.lakehouse.title)); return true; }
        const d = M().door;
        if (d && d.x === f.x && d.y === f.y) { S.map = d.to; S.px = d.tx; S.py = d.ty; markDisc(d.to); say(T(BEK_MAPS[d.to].title)); return true; }
        const e = (M().exits || []).filter(e2 => e2.x === f.x && e2.y === f.y)[0];
        if (e) { if (e.need && !gateOK(e.need)) { say(T(e.why)); sfx.deny(); return true; } S.map = e.to; S.px = e.tx; S.py = e.ty; markDisc(e.to); say(T(BEK_MAPS[e.to].title)); return true; }
        return false;
      }
      function act() {
        /* the boat, from the end of the pier or the dock */
        const b = M().boat;
        if (b && S.px === b.x && S.py === b.y) {
          if (!S.flag.boat) { say(TX('BÅTEN ER IKKE KLAR.', 'THE BOAT IS NOT READY.')); sfx.deny(); return; }
          sfx.boat(); S.map = b.to; S.px = b.tx; S.py = b.ty; markDisc(b.to); say(T(BEK_MAPS[b.to].title)); return;
        }
        const f = facing();
        const t = tileAt(S.map, f.x, f.y);
        const who = npcsHere().filter(n => n.x === f.x && n.y === f.y)[0];
        if (who) return talkTo(who);
        if (t === 'b') { mode = 'sleep'; return; }
        /* a bench is not a task. You sit, the afternoon moves on a little,
           and you get up less tired than you sat down. */
        if (t === 'J') {
          S.min += 25;
          S.en = Math.min(S.enMax, S.en + 8);
          sfx.sleep();
          say(SIT_LINES[Math.floor(Math.random() * SIT_LINES.length)]);
          return;
        }
        if (t === 'o' || t === 'W' || t === '~') {
          if (S.water < S.waterMax) { S.water = S.waterMax; sfx.water(); say(TX('VANNKANNE FULL.', 'CAN IS FULL.')); }
          if (t !== 'W') return;
        }
        if (t === 'S' && S.map === 'lake') return lotSign();
        if (t === 'S') { say(TX('OPPSLAGSTAVLE — TRYKK Q.', 'NOTICE BOARD — PRESS Q.')); return; }
        if (t === 'D') { if (doorTravel(f)) return; say(TX('LÅST.', 'LOCKED.')); sfx.deny(); return; }

        const tool = BEK_TOOLS[S.tool];
        if (t === 'p' && S.picked[rkey(S.map, f.x, f.y)] <= S.day) {   /* pick a wildflower */
          if (!spend(1)) return;
          const kinds = ['blomst_bla', 'blomst_gul', 'blomst_ro'];
          const got = kinds[Math.floor(Math.random() * kinds.length)];
          add(got, 1); S.picked[rkey(S.map, f.x, f.y)] = S.day + 1; terrDirty(); sfx.pick();
          say('+1 ' + iname(got)); return;
        }
        if (tool.id === 'stang') {
          if (t !== 'W') { say(TX('KAST I VANNET.', 'CAST IT AT THE WATER.')); return; }
          if (!spend(tool.e)) return;
          fish = { phase: 'wait', t: 0.8 + Math.random() * 1.6, rare: Math.random() < 0.1 }; sfx.cast(); return;
        }
        if (tool.id === 'oks') {
          if (t === 'Y') { if (!spend(tool.e)) return; S.felled[rkey(S.map, f.x, f.y)] = S.day + 2; terrDirty(); add('tommer', 1); sfx.chop(); say('+1 ' + iname('tommer')); return; }
          if (t === 'G') {
            if (S.axeLv < 2) { say(TX('FOR STOR. Du trenger en STÅLØKS.', 'TOO BIG. You need a STEEL AXE.')); sfx.deny(); return; }
            if (!spend(tool.e)) return; S.felled[rkey(S.map, f.x, f.y)] = S.day + 3; terrDirty(); add('tommer', 2); sfx.chop(); say('+2 ' + iname('tommer')); return;
          }
          say(TX('INGENTING Å FELLE.', 'NOTHING TO FELL.')); return;
        }
        if (tool.id === 'hakke') {
          if (t !== 'O' && t !== 'Q') { say(TX('INGEN ÅRE HER.', 'NO VEIN HERE.')); return; }
          if (!S.tools.hakke) { say(TX('DU HAR INGEN HAKKE.', 'YOU HAVE NO PICK.')); sfx.deny(); return; }
          if (t === 'Q' && S.pickLv < 2) { say(TX('RIK ÅRE. Trenger STÅLHAKKE.', 'RICH VEIN. Needs a STEEL PICK.')); sfx.deny(); return; }
          if (!spend(tool.e)) return;
          S.mined[rkey(S.map, f.x, f.y)] = S.day + 3; terrDirty(); sfx.mine();
          add('stein', 1);
          let ore;
          if (t === 'Q') ore = Math.random() < 0.6 ? 'solv' : 'kobber';
          else { const r = Math.random(); ore = r < 0.55 ? 'jern' : r < 0.85 ? 'kobber' : 'solv'; }
          add(ore, 1); say('+1 ' + iname(ore) + '  +1 ' + iname('stein')); return;
        }
        /* the soil tools */
        if (t !== 'f') { say(TX('IKKE HER.', 'NOT HERE.')); return; }
        const k = key(f.x, f.y);
        const c = S.soil[k] || (S.soil[k] = { till: 0, wet: 0, seed: '', age: 0, ready: 0 });
        if (c.ready) {
          const spec = BEK_CROPS[c.seed];
          if (!spend(1)) return; add(spec.out, 1); sfx.pick(); say('+1 ' + iname(spec.out));
          if (spec.regrow) { c.ready = 0; c.age = spec.days - spec.regrow; } else { c.seed = ''; c.age = 0; c.ready = 0; }
          return;
        }
        if (tool.id === 'spade') { if (c.till) { say(TX('ALLEREDE SPADD.', 'ALREADY TURNED.')); return; } if (!spend(tool.e)) return; c.till = 1; sfx.till(); return; }
        if (tool.id === 'kanne') {
          if (!c.seed) { say(TX('INGENTING PLANTET.', 'NOTHING PLANTED.')); return; }
          if (c.wet) { say(TX('ALLEREDE VANNET.', 'ALREADY WATERED.')); return; }
          if (S.water <= 0) { say(TX('KANNEN ER TOM.', 'THE CAN IS EMPTY.')); sfx.deny(); return; }
          if (!spend(tool.e)) return; S.water--; c.wet = 1; sfx.water(); return;
        }
      }
      function plant() {
        const f = facing();
        if (tileAt(S.map, f.x, f.y) !== 'f') { say(TX('IKKE JORD.', 'NOT SOIL.')); return; }
        const c = S.soil[key(f.x, f.y)];
        if (!c || !c.till) { say(TX('SPA DET FØRST.', 'TURN IT FIRST — HOE.')); return; }
        if (c.seed) { say(TX('ALLEREDE PLANTET.', 'ALREADY PLANTED.')); return; }
        const seed = curSeed();
        if (!seed) { say(TX('INGEN FRØ I SEKKEN.', 'NO SEED IN THE BAG.')); sfx.deny(); return; }
        if (!spend(1)) return;
        add(seed, -1); c.seed = BEK_ITEMS[seed].seed; c.age = 0; c.ready = 0; sfx.pick();
        say(TX('SÅDDE ', 'PLANTED ') + iname(seed));
      }
      function cycleSeed() {
        const owned = BEK_SEED_ORDER.filter(id => (S.bag[id] || 0) > 0);
        if (!owned.length) { say(TX('INGEN FRØ.', 'NO SEED.')); return; }
        S.seedIx = (S.seedIx + 1) % owned.length; sfx.talk();
        say(TX('FRØ: ', 'SEED: ') + iname(owned[S.seedIx]));
      }

      /* what sitting down is for */
      const SIT_LINES = [
        { no: 'DU SITTER LITT. Ingenting skjer, og det er meningen.', en: 'YOU SIT A WHILE. Nothing happens, which is the point.' },
        { no: 'DU SITTER LITT. Vinden i bjørka.', en: 'YOU SIT A WHILE. Wind in the birches.' },
        { no: 'DU SITTER LITT. Dagen går sin gang uten deg.', en: 'YOU SIT A WHILE. The day gets on without you.' },
        { no: 'DU SITTER LITT. Beina takker deg.', en: 'YOU SIT A WHILE. Your legs thank you.' }
      ];

      /* ---- talking ------------------------------------------------------ */
      const BEAR_LINES = [
        { no: 'PERKELE.', en: 'PERKELE.' },
        { no: 'The bear sweeps his clearing and nods.', en: 'The bear sweeps his clearing and nods.' },
        { no: 'A low sound. Not quite a growl. Almost hello.', en: 'A low sound. Not quite a growl. Almost hello.' },
        { no: 'He offers you a berry. You take it.', en: 'He offers you a berry. You take it.' },
        { no: 'He goes back to sweeping. The broom he never explains.', en: 'He goes back to sweeping. The broom he never explains.' }
      ];
      function talkTo(npc) {
        if (npc.bear) {
          sfx.bear();
          const i = Math.floor(Math.random() * BEAR_LINES.length);
          dlg = { lines: [BEAR_LINES[i]], i: 0, npc: npc };
          mode = 'talk';
          if (i === 3) add('blabar', 1); else if (Math.random() < 0.2) add('tommer', 1);
          return;
        }
        const book = BEK_TALK[npc.id];
        if (!book) return;
        const q = BEK_QUESTS.filter(q2 => q2.who === npc.id && S.q[q2.id] === 'active')[0];
        if (q && Object.keys(q.need).every(id => has(id, q.need[id]))) {
          Object.keys(q.need).forEach(id => add(id, -q.need[id]));
          S.q[q.id] = 'done'; S.kr += q.kr;
          if (window.Economy) window.Economy.earn(Math.max(20, Math.round(q.kr * 0.15)), 'BEKKEDAL: ' + q.t.en);
          S.fr[npc.id] = Math.min(5, S.fr[npc.id] + q.fr);
          if (q.tool) S.tools[q.tool] = 1;
          if (q.grant) {
            if (q.grant.flag) Object.assign(S.flag, q.grant.flag);
            if (q.grant.pickLv) S.pickLv = Math.max(S.pickLv, q.grant.pickLv);
            if (q.grant.axeLv) S.axeLv = Math.max(S.axeLv, q.grant.axeLv);
            if (q.grant.item) Object.keys(q.grant.item).forEach(id => add(id, q.grant.item[id]));
          }
          sfx.coin();
          const rew = q.kr ? '+' + q.kr + ' KR'
                     : q.tool ? '+' + T(BEK_TOOLS.filter(tt => tt.id === q.tool)[0].name)
                     : q.grant && q.grant.pickLv ? '+' + TX('STÅLHAKKE', 'STEEL PICK')
                     : q.grant && q.grant.flag && q.grant.flag.boat ? '+' + TX('BÅT', 'BOAT')
                     : TX('+GAVE', '+GIFT');
          dlg = { lines: [{ no: npc.n + ': Takk. That is exactly it.', en: npc.n + ': Thanks. That is exactly it.' }, rew], i: 0, npc: npc };
          mode = 'talk'; return;
        }
        if (!S.met[npc.id]) { S.met[npc.id] = 1; S.fr[npc.id] = Math.min(5, S.fr[npc.id] + 1); }
        const node = book.nodes.filter(n => !S.seen[npc.id + ':' + n.id] && (!n.when || n.when(S)))[0];
        if (node) {
          S.seen[npc.id + ':' + node.id] = 1;
          if (node.set) Object.assign(S.flag, node.set);
          if (node.give) Object.keys(node.give).forEach(id => add(id, node.give[id]));
          if (node.open && !S.q[node.open]) S.q[node.open] = 'active';
          dlg = { lines: node.lines.slice(), i: 0, npc: npc, ask: node.ask || null, buy: node.buy || null, node: node };
        } else {
          const pool = book.chat.filter(c => !c.if || c.if(S));
          const ix = (S.chatIx[npc.id] = (S.chatIx[npc.id] || 0) + 1);
          const pick = pool[(ix - 1) % pool.length];
          dlg = { lines: pick.t.slice(), i: 0, npc: npc, menu: 1 };
        }
        sfx.talk(); mode = 'talk';
      }
      function dlgAdvance() {
        if (!dlg) { mode = ''; return; }
        if (dlg.opts) return;
        dlg.i++;                       /* speechTick() voices the new line */
        if (dlg.i < dlg.lines.length) return;
        if (dlg.ask) { dlg.opts = dlg.ask; dlg.sel = 0; return; }
        if (dlg.buy) { offer = dlg.buy; mode = 'offer'; dlg = null; return; }
        if (dlg.menu && dlg.npc && !dlg.npc.bear) { openMenu(dlg.npc); return; }
        dlg = null; mode = '';
      }
      function dlgChoose() {
        const o = dlg.opts.opts[dlg.sel];
        if (o.set) Object.assign(S.flag, o.set);
        if (o.fr && dlg.npc) S.fr[dlg.npc.id] = Math.min(5, S.fr[dlg.npc.id] + o.fr);
        if (o.give) Object.keys(o.give).forEach(id => add(id, o.give[id]));
        const q = BEK_QUESTS.filter(q2 => q2.who === dlg.npc.id)[0];
        if (q && !S.q[q.id]) S.q[q.id] = 'active';
        dlg = { lines: o.reply.slice(), i: 0, npc: dlg.npc, menu: 0 };
        sfx.choose();
      }
      function openMenu(npc) {
        const book = BEK_TALK[npc.id];
        if (book && book.shop) { shop = { list: book.shop, sel: 0, side: 0, npc: npc }; mode = 'shop'; dlg = null; return; }
        if (npc.id === 'hakon') { hakonBuild(); return; }
        dlg = null; mode = '';
      }
      function doOffer() {
        const o = offer;
        if (S.kr < o.kr) { dlg = { lines: o.no.slice(), i: 0, npc: null }; mode = 'talk'; offer = null; sfx.deny(); return; }
        S.kr -= o.kr;
        if (o.tool) S.tools[o.tool] = 1;
        if (o.axeLv) S.axeLv = Math.max(S.axeLv, o.axeLv);
        if (o.pickLv) S.pickLv = Math.max(S.pickLv, o.pickLv);
        sfx.coin();
        dlg = { lines: o.ok.slice(), i: 0, npc: null }; mode = 'talk'; offer = null;
      }

      /* ---- the lot, the house ------------------------------------------- */
      function lotSign() {
        if (S.built) { mode = 'end'; S.ending = 0; return; }
        if (S.q.tommer !== 'done') { dlg = { lines: [{no:'SKILT: TOMT TIL SALGS.',en:'SIGN: LOT FOR SALE.'}, {no:'Håkon in town holds the papers.',en:'Håkon in town holds the papers.'}], i: 0 }; mode = 'talk'; return; }
        if (!S.flag.lot) {
          if (S.kr < 1200) { dlg = { lines: [{no:'SKILT: TOMT — 1200 KR.',en:'SIGN: LOT — 1200 KR.'}, {no:'You do not have it. Not yet.',en:'You do not have it. Not yet.'}], i: 0 }; mode = 'talk'; return; }
          S.kr -= 1200; S.flag.lot = 1; sfx.coin();
          dlg = { lines: ['You sign it against the post.', {no:'The lot is yours: trees on three sides, water on the fourth.',en:'The lot is yours: trees on three sides, water on the fourth.'}, 'Now it needs a house. Go and see Håkon.'], i: 0 };
          mode = 'talk'; return;
        }
        dlg = { lines: [{no:'Your lot. Empty, for now.',en:'Your lot. Empty, for now.'}], i: 0 }; mode = 'talk';
      }
      function hakonBuild() {
        const c = houseCost();
        if (S.built) { dlg = { lines: ['HÅKON: It is standing. Go and live in it.'], i: 0 }; mode = 'talk'; return; }
        if (!S.flag.lot) { dlg = { lines: ['HÅKON: Buy the lot first. Sign is by the water.'], i: 0 }; mode = 'talk'; return; }
        if (S.kr < c.kr || !has('tommer', c.tommer) || !has('stein', c.stein)) {
          dlg = { lines: [{ no: 'HÅKON: ' + c.kr + ' KR, ' + c.tommer + ' TØMMER, ' + c.stein + ' STEIN.', en: 'HÅKON: ' + c.kr + ' KR, ' + c.tommer + ' TIMBER, ' + c.stein + ' STONE.' },
                          { no: 'HÅKON: Du har ' + S.kr + ' kr, ' + (S.bag.tommer||0) + ' tømmer, ' + (S.bag.stein||0) + ' stein.', en: 'HÅKON: You have ' + S.kr + ' kr, ' + (S.bag.tommer||0) + ' timber, ' + (S.bag.stein||0) + ' stone.' },
                          'HÅKON: Come back.'], i: 0 }; mode = 'talk'; return;
        }
        S.kr -= c.kr; add('tommer', -c.tommer); add('stein', -c.stein); S.built = 1;
        S.fr.hakon = Math.min(5, S.fr.hakon + 1); sfx.done();
        dlg = { lines: ['HÅKON: Right. Two weeks. Or one, if you carry.', '...', 'HÅKON: It is done. Go down to the water and see.'], i: 0 };
        mode = 'talk';
      }

      /* ---- shop --------------------------------------------------------- */
      function shopBuy() {
        const id = shop.list[shop.sel];
        if (id === 'jordbarfro' && !S.flag.jordbar) { say(TX('IKKE PÅ LAGER ENNÅ.', 'NOT IN STOCK YET.')); sfx.deny(); return; }
        if (id === 'rabarbrafro' && !S.flag.rabarbra) { say(TX('IKKE PÅ LAGER ENNÅ.', 'NOT IN STOCK YET.')); sfx.deny(); return; }
        const p = price(id);
        if (S.kr < p) { say(TX('IKKE RÅD.', 'CANNOT AFFORD.')); sfx.deny(); return; }
        S.kr -= p; add(id, 1); sfx.coin(); say(TX('KJØPTE ', 'BOUGHT ') + iname(id));
      }
      function shopSell() {
        const ids = Object.keys(S.bag).filter(id => S.bag[id] > 0 && BEK_ITEMS[id].sell);
        const id = ids[shop.sel % Math.max(1, ids.length)];
        if (!id) { sfx.deny(); return; }
        S.kr += BEK_ITEMS[id].sell; add(id, -1); sfx.coin(); say(TX('SOLGTE ', 'SOLD ') + iname(id));
      }

      /* ---- fast travel -------------------------------------------------- */
      function openTravel() {
        const list = Object.keys(S.disc).filter(m => BEK_HOME[m] && m !== S.map);
        if (!list.length) { say(TX('INGEN STEDER Å DRA ENNÅ.', 'NOWHERE TO GO YET.')); return; }
        travel = { list: list, sel: 0 }; mode = 'travel';
      }
      function doTravel() {
        const m = travel.list[travel.sel];
        if (!m) { mode = ''; travel = null; return; }
        if (S.en < 10) { say(TX('FOR SLITEN TIL Å GÅ.', 'TOO TIRED TO WALK.')); sfx.deny(); return; }
        S.en -= 10; S.min += 40;
        S.map = m; S.px = BEK_HOME[m][0]; S.py = BEK_HOME[m][1]; S.dir = 0;
        markDisc(m); mode = ''; travel = null; sfx.step(); say(T(BEK_MAPS[m].title));
      }

      /* ---- input -------------------------------------------------------- */
      /* the one place Escape's "back out of the current menu" action lives,
         so fullscreen's own Escape fallback (above) stays in lockstep with
         every mode's keydown handler instead of duplicating each one */
      function closeMenu() {
        if (mode === 'talk' && dlg && !dlg.opts) { dlgAdvance(); return; }
        if (mode === 'offer') { offer = null; mode = ''; return; }
        if (mode === 'shop') { shop = null; mode = ''; return; }
        if (mode === 'travel') { travel = null; mode = ''; return; }
        if (mode === 'bag' || mode === 'quest' || mode === 'sleep') { mode = ''; return; }
      }
      cv.addEventListener('keydown', e => {
        const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        if (k === 'F11') { e.preventDefault(); toggleFullscreen(); return; }
        keys[k] = true;
        if (k === ' ' || k === 'Tab' || String(k).indexOf('Arrow') === 0) e.preventDefault();

        if (mode === 'end') {
          if (k === ' ' || k === 'Enter') {
            /* the finished house is a permanent milestone: mark it on the
               same save and return to play, never S = fresh() */
            S.houseBuilt = true; S.houseBuiltDay = S.day; S.act2Unlocked = S.houseBuilt;
            mode = ''; Song.pickNext(true);
          }
          return;
        }
        if (mode === 'talk') {
          if (dlg && dlg.opts) {
            if (k === 'w' || k === 'ArrowUp') { dlg.sel = (dlg.sel + dlg.opts.opts.length - 1) % dlg.opts.opts.length; sfx.sel(); }
            if (k === 's' || k === 'ArrowDown') { dlg.sel = (dlg.sel + 1) % dlg.opts.opts.length; sfx.sel(); }
            if (k === ' ' || k === 'Enter') dlgChoose();
            return;
          }
          if (k === ' ' || k === 'Enter' || k === 'Escape') dlgAdvance();
          return;
        }
        if (mode === 'offer') {
          if (k === ' ' || k === 'Enter') doOffer();
          if (k === 'Escape' || k === 'e') closeMenu();
          return;
        }
        if (mode === 'shop') {
          const ids = Object.keys(S.bag).filter(id => S.bag[id] > 0 && BEK_ITEMS[id].sell);
          const len = shop.side ? Math.max(1, ids.length) : shop.list.length;
          if (k === 'ArrowLeft' || k === 'a') { shop.side = 0; shop.sel = 0; }
          if (k === 'ArrowRight' || k === 'd') { shop.side = 1; shop.sel = 0; }
          if (k === 'w' || k === 'ArrowUp') shop.sel = (shop.sel + len - 1) % len;
          if (k === 's' || k === 'ArrowDown') shop.sel = (shop.sel + 1) % len;
          if (k === ' ' || k === 'Enter') { shop.side ? shopSell() : shopBuy(); }
          if (k === 'Escape' || k === 'e') closeMenu();
          return;
        }
        if (mode === 'travel') {
          if (k === 'w' || k === 'ArrowUp') travel.sel = (travel.sel + travel.list.length - 1) % travel.list.length;
          if (k === 's' || k === 'ArrowDown') travel.sel = (travel.sel + 1) % travel.list.length;
          if (k === ' ' || k === 'Enter') doTravel();
          if (k === 'Escape' || k === 'm') closeMenu();
          return;
        }
        if (mode === 'bag' || mode === 'quest') { if (k === 'i' || k === 'q' || k === 'Escape' || k === ' ') closeMenu(); return; }
        if (mode === 'sleep') { if (k === ' ' || k === 'Enter') { mode = ''; if (S.map === 'lakehouse' && !S.flag.homed) { S.flag.homed = 1; mode = 'end'; S.ending = 0; if (window.Economy) window.Economy.earn(500, 'BEKKEDAL: THE HOUSE BY THE WATER'); } else newDay(false); } if (k === 'Escape') closeMenu(); return; }

        /* walking */
        if (k === ' ') { if (fish) fishTap(); else act(); return; }
        if (k === 'f') { plant(); return; }
        if (k === 'c') { cycleSeed(); return; }
        if (k === 'i') { mode = 'bag'; return; }
        if (k === 'q') { mode = 'quest'; return; }
        if (k === 'm') { openTravel(); return; }
        if (k === 'Tab' || k === 'e') { for (let i = 0; i < BEK_TOOLS.length; i++) { S.tool = (S.tool + 1) % BEK_TOOLS.length; if (S.tools[BEK_TOOLS[S.tool].id]) break; } sfx.talk(); return; }
        if (k >= '1' && k <= '5') { const ix = parseInt(k, 10) - 1; if (BEK_TOOLS[ix] && S.tools[BEK_TOOLS[ix].id]) S.tool = ix; return; }
        if (k === 'r') { const food = Object.keys(S.bag).filter(id => BEK_ITEMS[id].eat && S.bag[id] > 0)[0]; if (!food) { say(TX('INGENTING Å SPISE.', 'NOTHING TO EAT.')); return; } add(food, -1); S.en = Math.min(S.enMax, S.en + BEK_ITEMS[food].eat); sfx.pick(); say(TX('SPISTE ', 'ATE ') + iname(food)); }
      });
      cv.addEventListener('keyup', e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys[k] = false; });
      cv.addEventListener('mousedown', ev => { ev.stopPropagation(); cv.focus(); if (mode === 'talk') dlgAdvance(); });
      wrap.addEventListener('mousedown', () => setTimeout(() => cv.focus(), 0));
      setTimeout(() => cv.focus(), 30);

      function fishTap() {
        if (!fish) return;
        if (fish.phase === 'bite') {
          const r = fish.rare;
          fish.phase = 'reel'; fish.pos = 0; fish.dir = 1; fish.hits = 0; fish.miss = 0;
          /* a rare fish is a much narrower window on a much faster needle,
             wants one more pull, and forgives one fewer slip */
          fish.need = r ? 3 : 2;
          fish.maxMiss = r ? 2 : 3;
          fish.spd = r ? 2.7 : 1.15;
          fish.z0 = r ? 0.455 : 0.34;
          fish.z1 = r ? 0.545 : 0.66;
          fish.t = r ? 7 : 6;
          sfx.cast(); return;
        }
        if (fish.phase === 'reel') {
          const inZone = fish.pos > fish.z0 && fish.pos < fish.z1;
          if (inZone) {
            fish.hits++; sfx.bite();
            if (fish.hits >= fish.need) {
              const sp = fishSpecies(fish.miss === 0, fish.rare);
              add(sp, 1); say('+1 ' + iname(sp));
              if (fish.rare) { sfx.done(); say(TX('SJELDEN FANGST! +1 ', 'RARE CATCH! +1 ') + iname(sp)); } else sfx.catch_();
              fish = null;
            }
          }
          else { fish.miss++; sfx.deny(); if (fish.miss >= fish.maxMiss) { say(TX('DEN SLAPP UNNA.', 'IT GOT AWAY.')); fish = null; } }
        }
      }

      bSave.addEventListener('click', () => { try { S.lang = BEK_LANG; localStorage.setItem(BEK_SAVE, JSON.stringify(S)); say(T(UI.saved)); sfx.coin(); } catch (e) { say(TX('KUNNE IKKE LAGRE.', 'COULD NOT SAVE.')); } cv.focus(); });
      bLoad.addEventListener('click', () => {
        try {
          const raw = localStorage.getItem(BEK_SAVE);
          if (!raw) { say(TX('INGEN LAGRING.', 'NO SAVE.')); return; }
          S = heal(Object.assign(fresh(), JSON.parse(raw)));
          terrDirty();                                    /* a loaded save brings its own felled/mined/picked */
          BEK_LANG = S.lang || BEK_LANG; refreshBar();
          mode = ''; dlg = null; shop = null; fish = null; travel = null; offer = null;
          say(T(UI.loaded) + ' DAG ' + S.day + '.'); sfx.coin();
        } catch (e) { say(TX('LAGRINGEN ER ØDELAGT.', 'SAVE IS UNREADABLE.')); }
        cv.focus();
      });
      bLang.addEventListener('click', () => { BEK_LANG = BEK_LANG === 'en' ? 'bi' : 'en'; if (S) S.lang = BEK_LANG; refreshBar(); cv.focus(); });

      /* ---- walking, clock, fishing -------------------------------------- */
      function move(dt) {
        let dx = 0, dy = 0;
        if (keys.w || keys.ArrowUp) { dy = -1; S.dir = 1; }
        else if (keys.s || keys.ArrowDown) { dy = 1; S.dir = 0; }
        else if (keys.a || keys.ArrowLeft) { dx = -1; S.dir = 2; }
        else if (keys.d || keys.ArrowRight) { dx = 1; S.dir = 3; }
        if (!dx && !dy) { S.walk = 0; S.step = 0; return; }
        S.walk += dt; if (S.walk < 0.14) return; S.walk = 0; S.step = (S.step + 1) % 4;
        const nx = S.px + dx, ny = S.py + dy;
        const ex = (M().exits || []).filter(x => x.x === nx && x.y === ny)[0];
        if (ex) { if (ex.need && !gateOK(ex.need)) { say(T(ex.why)); sfx.deny(); return; } S.map = ex.to; S.px = ex.tx; S.py = ex.ty; markDisc(ex.to); say(T(BEK_MAPS[S.map].title)); return; }
        if (nx < 0 || ny < 0 || nx >= BEK_COLS || ny >= BEK_ROWS) return;
        if (solid(S.map, nx, ny)) return;
        if (npcsHere().some(n => n.x === nx && n.y === ny)) return;
        S.px = nx; S.py = ny;
        if (S.step % 2 === 0) sfx.step();
        for (let i = S.drops.length - 1; i >= 0; i--) { const d = S.drops[i]; if (d.map === S.map && d.x === S.px && d.y === S.py) { add(d.item, 1); S.drops.splice(i, 1); sfx.pick(); say('+1 ' + iname(d.item)); } }
      }
      function tickClock(dt) {
        if (mode === 'end') return;
        S.min += dt * 4;
        if (S.min >= 26 * 60) { newDay(true); return; }
      }
      function tickFish(dt) {
        if (!fish) return;
        if (fish.phase === 'wait') { fish.t -= dt; if (fish.t <= 0) { fish.phase = 'bite'; fish.t = fish.rare ? 0.8 : 1.0; if (fish.rare) sfx.rare(); else sfx.bite(); } return; }
        if (fish.phase === 'bite') { fish.t -= dt; if (fish.t <= 0) { fish = null; say(TX('INGET NAPP.', 'NO BITE.')); } return; }
        if (fish.phase === 'reel') {
          fish.t -= dt; if (fish.t <= 0) { say(TX('DEN SLAPP UNNA.', 'IT GOT AWAY.')); fish = null; return; }
          fish.pos += fish.dir * dt * fish.spd;
          if (fish.pos > 1) { fish.pos = 1; fish.dir = -1; } else if (fish.pos < 0) { fish.pos = 0; fish.dir = 1; }
        }
      }

      /* ---- drawing ------------------------------------------------------ */
      const DITHER = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
      const ditherCache = {};
      /* The stipple is drawn at BEK_ART_SCALE so it stays as coarse on screen
         as it always looked. Left at one device pixel it would halve in
         apparent size and the night overlay would read as flat grey instead of
         dither — and a larger pattern tile is measurably cheaper to fill,
         because the rasteriser repeats it fewer times across the canvas. */
      function ditherPat(col, strength) {
        /* Keyed by the target context as well as the colour: a pattern is
           made by the context that will fill with it, and the terrain cache
           fills with the same stipples the screen does. */
        const k = (g.tag || 'screen') + ':' + col + ':' + strength;
        if (ditherCache[k]) return ditherCache[k];
        const c = document.createElement('canvas'); c.width = BEK_DITHER_PX; c.height = BEK_DITHER_PX;
        const q = c.getContext('2d'); q.fillStyle = C(col);
        for (let j = 0; j < BEK_DITHER_CELL; j++) for (let i = 0; i < BEK_DITHER_CELL; i++)
          if (DITHER[j][i] < strength) q.fillRect(i * BEK_ART_SCALE, j * BEK_ART_SCALE, BEK_ART_SCALE, BEK_ART_SCALE);
        ditherCache[k] = g.createPattern(c, 'repeat'); return ditherCache[k];
      }
      function dither(col, strength) { const n = Math.max(0, Math.min(16, Math.round(strength))); if (n <= 0) return; g.fillStyle = ditherPat(col, n); g.fillRect(0, 0, BEK_W, BEK_H); }

      /* Two dressings for a building: log-and-turf out on the farms, at the
         water and indoors; painted board under clay tile in the town. One
         palette, two silhouettes, and you can tell where you are by looking. */
      const rustic = () => S.map === 'farm' || S.map === 'setra' || S.map === 'lake' ||
                           S.map === 'enga' || S.map === 'farmhouse' || S.map === 'lakehouse';

      /* ---- native-resolution terrain (art uplift, batch 1) ---------------
         The grass, cave, path and water-edge tiles and drawSoil's tilled
         earth draw at real BEK_T density instead of the scaled-up BEK_T_SRC
         art the rest of the tile passes still use. They run inside the
         shared BEK_ART_SCALE transform the playfield draws under (see
         `draw`) and inside the terrain cache's copy of it, so each one opens
         with `native()`, which cancels that transform for just its own fill:
         one unit drawn inside it is one real screen pixel, and BEK_T is the
         tile span instead of BEK_T_SRC. Everything else is still unconverted
         and keeps multiplying by BEK_T_SRC under the ambient scale until its
         own batch — Phase 3 retires this once every function is native and
         BEK_ART_SCALE goes to 1. */
      function native(draw) {
        g.save();
        g.scale(1 / BEK_ART_SCALE, 1 / BEK_ART_SCALE);
        draw();
        g.restore();
      }

      /* ---- terrain variation ---------------------------------------------
         Everything decorative below is placed out of noise.js. `v.x0`,
         `o.lean` and the rest are step indices on independent hash channels,
         one channel per decision, so a tile's marks move independently of
         each other and of the neighbouring tile's. `patchAmt` is the
         low-frequency field: it comes back as a dither strength rather than
         a colour, so a patch's edge feathers out through the same ordered
         stipple the night overlay uses instead of stopping dead on a tile
         boundary. Nothing in here is a function of x and y directly any
         more — that is what used to lay the diagonal bands.

         `PATCH` declares each field's channel, period and how hard it is
         allowed to push; pass a max to `pAmt` only to paint the same field
         more faintly on a different surface. */
      const pAmt = (x, y, P, max) => patchAmt(S.map, x, y, P.ch, P.period, max == null ? P.max : max);
      /* the discrete low-frequency fields. hLowV takes a raw channel, so the
         map's salt goes on here — without it every valley gets its flowers
         and its mineral veins in exactly the same places. */
      const pLow = (x, y, ch, period, n) => hLowV(x, y, mapSalt(S.map) + ch, period, n);

      /* A mark's position from one channel: nine steps spread across all the
         room the mark's own size leaves it, edge to edge. x and y come off
         different channels, so a mark is free on both axes — the old code
         nudged x by up to four pixels and never touched y at all. */
      const spot = (i, span, size) => Math.round(i * (span - size) / (JIT - 1));

      /* A patch arriving on screen: the ordered stipple clipped to a rect,
         drawn native so it stays exactly as coarse as the night overlay's.
         Call it outside a native() block, never inside one — it opens its
         own, and two of them nested would halve the scale twice. */
      function wash(px, py, w, h, col, s) {
        if (s <= 0) return;
        native(() => { g.fillStyle = ditherPat(col, s > 16 ? 16 : s); g.fillRect(px, py, w, h); });
      }

      /* seven tuft colours instead of one, so a field of grass stops reading
         as a single flat green */
      /* Mostly greens with the odd dry or flowering blade — enough to break up
         a field, not so much that the grass turns to confetti. */
      const TUFT = [10, 2, 10, 14, 10, 2, 3];
      /* the same seven where the coarse patch has taken the field over to straw */
      const TUFT_DRY = [14, 3, 14, 6, 2, 3, 14];

      /* ---- ground: the first cached pass ---------------------------------
         Fills, and the patches that tint them. Nothing here reaches past its
         own tile, because every tile's ground is laid before any detail is. */
      function grassGround(x, y) {
        const px = x * BEK_T, py = y * BEK_T;
        native(() => { g.fillStyle = C(2); g.fillRect(px, py, BEK_T, BEK_T); });
        wash(px, py, BEK_T, BEK_T, 6, pAmt(x, y, PATCH.DRY));       /* a corner gone to straw */
        wash(px, py, BEK_T, BEK_T, 10, pAmt(x, y, PATCH.LUSH));     /* a wetter, greener run  */
      }

      /* the floor of a room: boards, never grass */
      function floorGround(x, y) {
        const px = x * BEK_T_SRC, py = y * BEK_T_SRC;
        g.fillStyle = C(6); g.fillRect(px, py, BEK_T_SRC, BEK_T_SRC);
        wash(x * BEK_T, y * BEK_T, BEK_T, BEK_T, 8, pAmt(x, y, PATCH.WORN, 3));   /* where feet go */
      }

      /* the floor of the gruva: it is a hole in a mountain, so it is gravel.
         Grass down here was reading as a lawn a hundred feet underground.
         Dark floor, lit rock walls — the other way round and the corridors
         disappear into the stone they are cut through. */
      function caveGround(x, y) {
        const px = x * BEK_T, py = y * BEK_T;
        native(() => { g.fillStyle = C(0); g.fillRect(px, py, BEK_T, BEK_T); });
        wash(px, py, BEK_T, BEK_T, 2, pAmt(x, y, PATCH.MOSS));      /* moss where the air moves */
        wash(px, py, BEK_T, BEK_T, 1, pAmt(x, y, PATCH.DAMP));      /* and where the water does */
      }

      /* a worn trail: no directional art (the same glyph does every bend and
         junction on the map), so the detail stays scattered grit rather than
         implying a direction the tile can't back up */
      function pathGround(x, y) {
        const px = x * BEK_T, py = y * BEK_T;
        native(() => { g.fillStyle = C(6); g.fillRect(px, py, BEK_T, BEK_T); });
        wash(px, py, BEK_T, BEK_T, 8, pAmt(x, y, PATCH.WORN));      /* trodden hard */
        wash(px, py, BEK_T, BEK_T, 14, pAmt(x, y, PATCH.DUST));     /* dry and dusty */
      }

      function rockGround(x, y, snow) {
        const px = x * BEK_T_SRC, py = y * BEK_T_SRC;
        g.fillStyle = C(8); g.fillRect(px, py, BEK_T_SRC, BEK_T_SRC);
        wash(x * BEK_T, y * BEK_T, BEK_T, BEK_T, snow ? 15 : 2, pAmt(x, y, PATCH.MOSS));
        wash(x * BEK_T, y * BEK_T, BEK_T, BEK_T, 7, pAmt(x, y, PATCH.DAMP));
      }

      /* ---- ground detail: the second cached pass -------------------------- */
      /* four blades, each placed and coloured off its own three channels, so
         no two tiles of grass anywhere on the map put a blade in the same
         place. Which of the two palettes they come from follows the coarse
         patch, and it flips on that patch's half-contour — where the straw
         wash is at half coverage, so the change of palette is under stipple
         rather than beside it. */
      function grassDetail(x, y) {
        const px = x * BEK_T, py = y * BEK_T;
        const v = groundVar(S.map, x, y);
        const pal = pAmt(x, y, PATCH.DRY) * 2 > PATCH.DRY.max ? TUFT_DRY : TUFT;
        const meadow = pLow(x, y, LOW.MEADOW, 8, 3) === 0;
        native(() => {
          for (let i = 0; i < 4; i++) {
            g.fillStyle = C(pal[v['c' + i]]);
            g.fillRect(px + spot(v['x' + i], BEK_T, 2), py + spot(v['y' + i], BEK_T, 4), 2, 4);
          }
          /* a flowering head, but only in the stretch of map that flowers —
             one pixel, so the cell edge of the low-frequency field is
             invisible and this one does not need feathering */
          if (meadow && v.c3 < 3) {
            g.fillStyle = C(v.c0 % 2 ? 14 : 15);
            g.fillRect(px + spot(v.x2, BEK_T, 1), py + spot(v.y3, BEK_T, 1), 1, 1);
          }
        });
      }

      function floorDetail(x, y) {
        const px = x * BEK_T_SRC, py = y * BEK_T_SRC;
        const v = groundVar(S.map, x, y);
        g.fillStyle = C(8); g.fillRect(px, py + 9, BEK_T_SRC, 1);
        for (let i = 0; i < BEK_T_SRC; i += 10) g.fillRect(px + i, py, 1, BEK_T_SRC);
        if (v.c2 === 2) { g.fillStyle = C(8); g.fillRect(px + spot(v.x0, BEK_T_SRC, 2), py + spot(v.y1, BEK_T_SRC, 1), 2, 1); }
      }

      function caveDetail(x, y) {
        const px = x * BEK_T, py = y * BEK_T;
        const v = groundVar(S.map, x, y);
        const vein = pLow(x, y, LOW.VEIN, 4, 4) === 0;
        native(() => {
          g.fillStyle = C(8);
          g.fillRect(px + spot(v.x0, BEK_T, 6), py + spot(v.y0, BEK_T, 4), 6, 4);
          g.fillRect(px + spot(v.x1, BEK_T, 8), py + spot(v.y1, BEK_T, 4), 8, 4);
          g.fillStyle = C(7);
          g.fillRect(px + spot(v.x2, BEK_T, 4), py + spot(v.y2, BEK_T, 2), 4, 2);
          g.fillRect(px + spot(v.x3, BEK_T, 2), py + spot(v.y3, BEK_T, 2), 2, 2);
          /* rare extras only, so the gravel stays sparse rather than static */
          if (v.c0 === 3) { g.fillStyle = C(6); g.fillRect(px + spot(v.x3, BEK_T, 4), py + spot(v.y0, BEK_T, 4), 4, 4); }
          if (v.c1 === 4) { g.fillStyle = C(6); g.fillRect(px + spot(v.x0, BEK_T, 3), py + spot(v.y2, BEK_T, 3), 3, 3); }
          if (vein && v.c2 < 2) { g.fillStyle = C(15); g.fillRect(px + spot(v.x1, BEK_T, 1), py + spot(v.y3, BEK_T, 1), 1, 1); }
        });
      }

      function pathDetail(x, y) {
        const px = x * BEK_T, py = y * BEK_T;
        const v = pathVar(S.map, x, y);
        native(() => {
          g.fillStyle = C(8);
          g.fillRect(px + spot(v.ax, BEK_T, 4), py + spot(v.ay, BEK_T, 2), 4, 2);
          g.fillRect(px + spot(v.bx, BEK_T, 4), py + spot(v.by, BEK_T, 2), 4, 2);
          g.fillStyle = C(7);
          g.fillRect(px + spot(v.cx, BEK_T, 4), py + spot(v.cy, BEK_T, 2), 4, 2);
          g.fillRect(px + spot(v.dx, BEK_T, 2), py + spot(v.dy, BEK_T, 2), 2, 2);
          g.fillStyle = C(0);
          g.fillRect(px + spot(v.kx, BEK_T, 2), py + spot(v.ky, BEK_T, 1), 2, 1);   /* a crack in the hardpack */
          if (v.peb === 1) { g.fillStyle = C(14); g.fillRect(px + spot(v.px, BEK_T, 2), py + spot(v.py, BEK_T, 2), 2, 2); }
        });
      }

      function rockDetail(c, x, y, snow) {
        const px = x * BEK_T_SRC, py = y * BEK_T_SRC, S1 = BEK_T_SRC;
        const v = rockVar(S.map, x, y);
        g.fillStyle = C(7);
        g.fillRect(px + spot(v.fx, S1, 9), py + spot(v.fy, S1, 6), 9, 6);
        g.fillRect(px + spot(v.gx, S1, 7), py + spot(v.gy, S1, 6), 7, 6);
        g.fillStyle = C(0);
        g.fillRect(px + spot(v.ax, S1, 8), py + spot(v.ay, S1, 1), 8, 1);
        g.fillRect(px + spot(v.bx, S1, 5), py + spot(v.by, S1, 1), 5, 1);
        if (snow) {
          g.fillStyle = C(15);
          g.fillRect(px + spot(v.mx, S1, 4), py + spot(v.my, S1, 1), 4, 1);
          g.fillRect(px + spot(v.jx, S1, 3), py + spot(v.jy, S1, 1), 3, 1);
        } else if (v.kind === 2) {                                                  /* mineral */
          g.fillStyle = C(5);
          g.fillRect(px + spot(v.mx, S1, 1), py + spot(v.my, S1, 1), 1, 1);
          g.fillRect(px + spot(v.jx, S1, 1), py + spot(v.jy, S1, 1), 1, 1);
        }
        if (v.kind === 4) { g.fillStyle = C(9); g.fillRect(px + spot(v.hx, S1, 1), py + spot(v.hy, S1, 3), 1, 3); }   /* seepage */
        if (c === 'O') {
          g.fillStyle = C(6); g.fillRect(px + spot(v.ix, S1, 3), py + spot(v.iy, S1, 3), 3, 3);
          g.fillStyle = C(7); g.fillRect(px + spot(v.jx, S1, 2), py + spot(v.jy, S1, 2), 2, 2);
          g.fillStyle = C(14);
          g.fillRect(px + spot(v.hx, S1, 1), py + spot(v.hy, S1, 1), 1, 1);
          g.fillRect(px + spot(v.lx, S1, 1), py + spot(v.ly, S1, 1), 1, 1);
        }
        if (c === 'Q') {
          g.fillStyle = C(15);
          g.fillRect(px + spot(v.ix, S1, 2), py + spot(v.iy, S1, 2), 2, 2);
          g.fillRect(px + spot(v.jx, S1, 2), py + spot(v.jy, S1, 2), 2, 2);
          g.fillStyle = C(11); g.fillRect(px + spot(v.hx, S1, 2), py + spot(v.hy, S1, 2), 2, 2);
          g.fillStyle = C(13); g.fillRect(px + spot(v.lx, S1, 1), py + spot(v.ly, S1, 1), 1, 1);
          g.fillStyle = C(5); g.fillRect(px + spot(v.fx, S1, 1), py + spot(v.gy, S1, 1), 1, 1);
        }
      }

      /* The outer ring of every map, drawn as a hard black frame with a grey
         lip on the inward side. The treeline alone never read as a limit —
         this does, and it stops at anything you can actually walk through, so
         the gaps in the border are the exits. */
      function edgeMark(px, py, x, y) {
        const L = x === 0, R = x === BEK_COLS - 1, U = y === 0, D = y === BEK_ROWS - 1;
        g.fillStyle = C(0);
        if (U) g.fillRect(px, py, BEK_T_SRC, 4);
        if (D) g.fillRect(px, py + BEK_T_SRC - 4, BEK_T_SRC, 4);
        if (L) g.fillRect(px, py, 4, BEK_T_SRC);
        if (R) g.fillRect(px + BEK_T_SRC - 4, py, 4, BEK_T_SRC);
        g.fillStyle = C(8);
        if (U) g.fillRect(px, py + 4, BEK_T_SRC, 1);
        if (D) g.fillRect(px, py + BEK_T_SRC - 5, BEK_T_SRC, 1);
        if (L) g.fillRect(px + 4, py, 1, BEK_T_SRC);
        if (R) g.fillRect(px + BEK_T_SRC - 5, py, 1, BEK_T_SRC);
      }

      /* ---- the animated tiles, drawn live over the cache ------------------ */
      function waterTile(x, y, t) {
        const px = x * BEK_T_SRC, py = y * BEK_T_SRC, w = Math.floor(t * 2 + x + y) % 4;
        const v = waterVar(S.map, x, y);
        g.fillStyle = C(1); g.fillRect(px, py, BEK_T_SRC, BEK_T_SRC);
        g.fillStyle = C(3); g.fillRect(px, py + 6 + v.sw, BEK_T_SRC, 2);              /* the swell */
        /* the ripple bands drift +/-3 with `w`, so their placement is held
           three pixels clear of both edges to keep them inside the tile */
        g.fillStyle = C(9);
        g.fillRect(px + spot(v.ax, BEK_T_SRC, 8), py + 3 + spot(v.ay, 14, 1) + w, 8, 1);
        g.fillRect(px + spot(v.bx, BEK_T_SRC, 7), py + 3 + spot(v.by, 14, 1) - w, 7, 1);
        if (v.foam === 0) { g.fillStyle = C(11); g.fillRect(px + spot(v.bx, BEK_T_SRC, 4), py + spot(v.ay, BEK_T_SRC, 1), 4, 1); }
        if (v.glint === 3) { g.fillStyle = C(15); g.fillRect(px + spot(v.ax, BEK_T_SRC, 2), py + 3 + spot(v.by, 14, 1) + w, 2, 1); }
      }

      /* the shallow shore: mostly water, a foam seam where it meets the bank,
         then the strip of sand and turf that the deep-water 'W' tile doesn't
         carry. Ripple bands still drift with `t` the way they always did. */
      function waterEdgeTile(x, y, t) {
        const px = x * BEK_T, py = y * BEK_T, w = Math.floor(t * 2 + x + y) % 4;
        const v = edgeVar(S.map, x, y);
        native(() => {
          g.fillStyle = C(1); g.fillRect(px, py, BEK_T, BEK_T);
          g.fillStyle = C(3); g.fillRect(px, py, BEK_T, 16);
          g.fillStyle = C(9); g.fillRect(px, py, BEK_T, 8);
          g.fillStyle = C(11);
          g.fillRect(px + spot(v.ax, BEK_T, 12), py + 4 + spot(v.ay, 18, 2) + w, 12, 2);
          g.fillRect(px + spot(v.bx, BEK_T, 10), py + 4 + spot(v.by, 18, 2) - w, 10, 2);
          g.fillRect(px + spot(v.fx, BEK_T, 8), py + 18 + spot(v.ay, 9, 1), 8, 1);
          g.fillRect(px + spot(v.gx, BEK_T, 10), py + 18 + spot(v.by, 9, 1), 10, 1);
          g.fillStyle = C(15); g.fillRect(px, py + 28, BEK_T, 1);                         /* foam, water meets sand */
          g.fillStyle = C(11);
          g.fillRect(px + spot(v.fx, BEK_T, 6), py + 29, 6, 1); g.fillRect(px + spot(v.gx, BEK_T, 8), py + 29, 8, 1);
          g.fillStyle = C(14); g.fillRect(px, py + 30, BEK_T, 4);                         /* sand */
          g.fillStyle = C(6); g.fillRect(px, py + 34, BEK_T, 6);                          /* bank */
          g.fillStyle = C(8);
          g.fillRect(px + spot(v.sx, BEK_T, 2), py + 34 + spot(v.sy, 6, 2), 2, 2);
          g.fillRect(px + spot(v.bx, BEK_T, 2), py + 34 + spot(v.ax, 6, 1), 2, 1);
        });
      }

      function hearthTile(x, y, t) {
        const px = x * BEK_T_SRC, py = y * BEK_T_SRC, fl = Math.floor(t * 6) % 3;
        g.fillStyle = C(8); g.fillRect(px + 2, py + 2, 16, 16);
        g.fillStyle = C(0); g.fillRect(px + 5, py + 5, 10, 11);
        g.fillStyle = C(4); g.fillRect(px + 7, py + 9, 6, 7);
        g.fillStyle = C(12); g.fillRect(px + 8, py + 8 - fl, 4, 6 + fl);
        g.fillStyle = C(14); g.fillRect(px + 9, py + 7 - fl, 2, 3);
        g.fillStyle = C(15); g.fillRect(px + 9, py + 6 - fl, 1, 1);
      }

      /* ---- the three passes ------------------------------------------------
         `tileGround` fills a tile's ground and stops. `tileDetail` then runs
         over the whole map afterwards, so a mark is free to hang over into
         the next tile without that tile's ground painting it out a moment
         later — which is exactly what a single interleaved pass could not
         allow. Both feed the terrain cache and run only when the map, the
         day or the felled/mined/picked state changes. `tileLive` is what is
         left over: the three glyphs whose art reads the clock. */
      const ins_ = () => !!(BEK_MAPS[S.map] && BEK_MAPS[S.map].inside);
      const snow_ = () => S.map === 'setra' || S.map === 'vidda';
      const rim_ = (x, y) => !ins_() && (x === 0 || y === 0 || x === BEK_COLS - 1 || y === BEK_ROWS - 1);
      /* a tile that lays its own ground has no grass or boards under it */
      const ownGround = (c, x, y) => 'W~P.MOQHRDLf '.indexOf(c) >= 0 || (c === 'T' && rim_(x, y));

      function tileGround(c, x, y) {
        const px = x * BEK_T_SRC, py = y * BEK_T_SRC;
        /* the dead margin outside a room's walls: not floor, not field, nothing */
        if (c === ' ') { g.fillStyle = C(0); g.fillRect(px, py, BEK_T_SRC, BEK_T_SRC); return; }
        if (c === 'T' && rim_(x, y)) { g.fillStyle = C(0); g.fillRect(px, py, BEK_T_SRC, BEK_T_SRC); return; }   /* the wall of wood is solid black behind */
        if (c === 'W' || c === '~') { g.fillStyle = C(1); g.fillRect(px, py, BEK_T_SRC, BEK_T_SRC); return; }
        if (c === '.') { pathGround(x, y); return; }
        if (c === 'M' || c === 'O' || c === 'Q') { rockGround(x, y, snow_()); return; }
        if (c === 'P' || c === 'f') { g.fillStyle = C(6); g.fillRect(px, py, BEK_T_SRC, BEK_T_SRC); return; }
        if (c === 'L') { g.fillStyle = C(2); g.fillRect(px, py, BEK_T_SRC, BEK_T_SRC); return; }
        if (c === 'H') { g.fillStyle = C(ins_() ? 8 : rustic() ? 6 : 4); g.fillRect(px, py, BEK_T_SRC, BEK_T_SRC); return; }
        if (c === 'R' || c === 'D') { g.fillStyle = C(rustic() ? 6 : 4); g.fillRect(px, py, BEK_T_SRC, BEK_T_SRC); return; }
        if (ins_()) floorGround(x, y); else if (S.map === 'gruva') caveGround(x, y); else grassGround(x, y);
      }

      function tileDetail(c, x, y) {
        const px = x * BEK_T_SRC, py = y * BEK_T_SRC;
        const ins = ins_(), snow = snow_(), rim = rim_(x, y);
        if (c === ' ' || c === 'W' || c === '~') return;      /* nothing static of their own */
        if (!ownGround(c, x, y)) {
          if (ins) floorDetail(x, y); else if (S.map === 'gruva') caveDetail(x, y); else grassDetail(x, y);
        }
        const o = objVar(c, S.map, x, y);
        if (c === 'P') {
          g.fillStyle = C(8); for (let i = 0; i < BEK_T_SRC; i += 5) g.fillRect(px, py + i, BEK_T_SRC, 1);
          g.fillStyle = C(6); g.fillRect(px + 2, py, 1, BEK_T_SRC); g.fillRect(px + 12, py, 1, BEK_T_SRC);
          return;
        }
        if (c === '.') { pathDetail(x, y); if (rim) edgeMark(px, py, x, y); return; }
        if (c === 'M' || c === 'O' || c === 'Q') { rockDetail(c, x, y, snow); if (rim) edgeMark(px, py, x, y); return; }
        if (c === ',') {
          g.fillStyle = C(10);
          g.fillRect(px + spot(o.ax, BEK_T_SRC, 1), py + spot(o.ay, BEK_T_SRC, 8), 1, 8);
          g.fillRect(px + spot(o.bx, BEK_T_SRC, 1), py + spot(o.by, BEK_T_SRC, 10), 1, 10);
          g.fillRect(px + spot(o.cx, BEK_T_SRC, 1), py + spot(o.cy, BEK_T_SRC, 7), 1, 7);
          g.fillRect(px + spot(o.dx, BEK_T_SRC, 1), py + spot(o.dy, BEK_T_SRC, 9), 1, 9);
          g.fillStyle = C(TUFT[o.c]); g.fillRect(px + spot(o.bx, BEK_T_SRC, 1), py + spot(o.by, BEK_T_SRC, 10), 1, 2);
        }
        if (c === 'F') {
          const fc = [15, 14, 13, 5, 11];
          g.fillStyle = C(fc[o.ac]); g.fillRect(px + spot(o.ax, BEK_T_SRC, 2), py + spot(o.ay, BEK_T_SRC, 2), 2, 2);
          g.fillStyle = C(fc[o.bc]); g.fillRect(px + spot(o.bx, BEK_T_SRC, 2), py + spot(o.by, BEK_T_SRC, 2), 2, 2);
          g.fillStyle = C(fc[o.cc]); g.fillRect(px + spot(o.cx, BEK_T_SRC, 2), py + spot(o.cy, BEK_T_SRC, 2), 2, 2);
        }
        if (c === 'p') {
          const cols = [9, 14, 13, 5], h = 5 + o.h;
          const bx = px + spot(o.x, BEK_T_SRC, 5), by = py + spot(o.y, BEK_T_SRC, h + 4);
          g.fillStyle = C(2); g.fillRect(bx + 2, by + 4, 1, h);
          g.fillStyle = C(cols[o.c]); g.fillRect(bx, by, 5, 4);
          g.fillStyle = C(15); g.fillRect(bx + 2, by + 1, 1, 1);
        }
        /* A dark fir is the same green as the grass it stands on, so without a
           black silhouette behind it a tree in a field is invisible. Draw the
           shape once in black, one pixel proud, then the tree inside it. */
        if (c === 'T') {
          const ln = o.lean, lit = o.lit === 0 ? 10 : 2;
          g.fillStyle = C(0);
          g.fillRect(px + 2, py + 11, 16, 5); g.fillRect(px + 3, py + 7, 14, 6); g.fillRect(px + 5, py + 3 - ln, 10, 7);
          g.fillStyle = C(6); g.fillRect(px + 9, py + 14, 2, 5);
          g.fillStyle = C(2); g.fillRect(px + 3, py + 12, 14, 3); g.fillRect(px + 4, py + 8, 12, 4); g.fillRect(px + 6, py + 4 - ln, 8, 5);
          g.fillStyle = C(0); g.fillRect(px + 3, py + 14, 14, 1);
          g.fillStyle = C(lit); g.fillRect(px + 6, py + 9, 3, 1); g.fillRect(px + 8, py + 5 - ln, 2, 1);
          if (o.bare === 5) { g.fillStyle = C(3); g.fillRect(px + 4 + spot(o.bx, 12, 2), py + 8 + spot(o.by, 6, 1), 2, 1); }
          if (snow) {
            g.fillStyle = C(15);
            g.fillRect(px + 6 + spot(o.sx, 8, 3), py + 4 - ln + spot(o.sy, 4, 1), 3, 1);
            g.fillRect(px + 4 + spot(o.tx, 10, 3), py + 8 + spot(o.ty, 4, 1), 3, 1);
          }
        }
        if (c === 'G') {
          g.fillStyle = C(0);
          g.fillRect(px + 1, py + 12, 18, 5); g.fillRect(px + 2, py + 7, 16, 6); g.fillRect(px + 4, py + 2, 12, 7); g.fillRect(px + 6, py, 8, 4);
          g.fillStyle = C(6); g.fillRect(px + 9, py + 15, 3, 4);
          g.fillStyle = C(2); g.fillRect(px + 2, py + 13, 16, 4); g.fillRect(px + 3, py + 8, 14, 5); g.fillRect(px + 5, py + 3, 10, 6); g.fillRect(px + 7, py, 6, 4);
          g.fillStyle = C(0); g.fillRect(px + 2, py + 15, 16, 1);
          g.fillStyle = C(o.lit === 0 ? 10 : 2);
          g.fillRect(px + 4 + spot(o.lx, 10, 4), py + 9 + spot(o.ly, 4, 1), 4, 1);
          g.fillRect(px + 6 + spot(o.sx, 8, 3), py + 3 + spot(o.sy, 4, 1), 3, 1);
          g.fillStyle = C(3); g.fillRect(px + 6 + spot(o.lx, 10, 2), py + 8 + spot(o.ly, 5, 1), 2, 1);
          if (snow) { g.fillStyle = C(15); g.fillRect(px + 6 + spot(o.sx, 8, 4), py, 4, 1); }
        }
        if (c === 'Y') {
          g.fillStyle = C(15); g.fillRect(px + 8, py + 10, 3, 9);
          g.fillStyle = C(8); g.fillRect(px + 8, py + 12, 3, 1); g.fillRect(px + 8, py + 15, 3, 1);
          g.fillStyle = C(10); g.fillRect(px + 3, py + 3, 13, 8);
          g.fillStyle = C(2);
          g.fillRect(px + 4 + spot(o.lx, 11, 3), py + 4 + spot(o.ly, 6, 3), 3, 3);
          g.fillRect(px + 4 + spot(o.mx, 11, 3), py + 4 + spot(o.my, 6, 2), 3, 2);
          g.fillStyle = C(14); g.fillRect(px + 4 + spot(o.mx, 11, 2), py + 4 + spot(o.ly, 6, 2), 2, 2);
          if (o.turn === 3) { g.fillStyle = C(14); g.fillRect(px + 4 + spot(o.lx, 11, 2), py + 4 + spot(o.my, 6, 2), 2, 2); }   /* one turning early */
        }
        if (c === '^') {
          g.fillStyle = C(8); g.fillRect(px + 3, py + 6, 14, 11);
          g.fillStyle = C(7); g.fillRect(px + 4 + spot(o.sx, 12, 8), py + 7 + spot(o.sy, 8, 5), 8, 5);
          g.fillStyle = C(0); g.fillRect(px + 4, py + 15, 12, 1);
          if (o.cap === 1) { g.fillStyle = C(10); g.fillRect(px + 4 + spot(o.mx, 12, 3), py + 7 + spot(o.my, 8, 2), 3, 2); }
        }
        if (c === '=') { g.fillStyle = C(6); g.fillRect(px, py + 8, BEK_T_SRC, 3); g.fillRect(px + 8, py + 4, 3, 14); g.fillStyle = C(14); g.fillRect(px, py + 8, BEK_T_SRC, 1); }
        if (c === 'x') { g.fillStyle = C(6); g.fillRect(px, py + 3, BEK_T_SRC, 14); g.fillStyle = C(8); for (let i = 0; i < BEK_T_SRC; i += 4) g.fillRect(px + i, py + 3, 1, 14); }
        if (c === 'H') {
          /* not every course of logs has a window cut in it */
          const win = o.win < 2;
          if (ins) {
            /* Seen from inside, a wall must not be the same brown as the
               floor or the room has no edges. Dark timber, lighter courses. */
            g.fillStyle = C(6); g.fillRect(px + 1, py + 2, 18, 4); g.fillRect(px + 1, py + 8, 18, 4); g.fillRect(px + 1, py + 14, 18, 4);
            g.fillStyle = C(0); g.fillRect(px, py, BEK_T_SRC, 1); g.fillRect(px, py + BEK_T_SRC - 1, BEK_T_SRC, 1); g.fillRect(px, py, 1, BEK_T_SRC); g.fillRect(px + BEK_T_SRC - 1, py, 1, BEK_T_SRC);
            if (win) { g.fillStyle = C(11); g.fillRect(px + 5, py + 5, 9, 8);
              g.fillStyle = C(15); g.fillRect(px + 5, py + 5, 9, 1); g.fillRect(px + 9, py + 5, 1, 8); }
          } else if (rustic()) {
            g.fillStyle = C(8); g.fillRect(px, py + 6, BEK_T_SRC, 1); g.fillRect(px, py + 13, BEK_T_SRC, 1); g.fillRect(px, py + 18, BEK_T_SRC, 2);   /* laft: stacked logs */
            g.fillStyle = C(0); g.fillRect(px, py, 1, BEK_T_SRC); g.fillRect(px + BEK_T_SRC - 1, py, 1, BEK_T_SRC);
            if (win) { g.fillStyle = C(11); g.fillRect(px + 5, py + 4, 9, 8);
              g.fillStyle = C(15); g.fillRect(px + 5, py + 4, 9, 1); g.fillRect(px + 9, py + 4, 1, 8); }
            else { g.fillStyle = C(0); g.fillRect(px + spot(o.kx, BEK_T_SRC, 2), py + spot(o.ky, BEK_T_SRC, 2), 2, 2); }   /* a knot in a log */
          } else {
            g.fillStyle = C(12); g.fillRect(px, py + 4, BEK_T_SRC, 1); g.fillRect(px, py + 12, BEK_T_SRC, 1);             /* painted board */
            g.fillStyle = C(8); g.fillRect(px, py + 18, BEK_T_SRC, 2);
            if (win) { g.fillStyle = C(11); g.fillRect(px + 5, py + 5, 9, 8);
              g.fillStyle = C(15); g.fillRect(px + 4, py + 4, 11, 1); g.fillRect(px + 9, py + 5, 1, 8); }
          }
        }
        if (c === 'R') {
          if (rustic()) {
            g.fillStyle = C(2); g.fillRect(px, py, BEK_T_SRC, 13);                                  /* torvtak: turf */
            g.fillStyle = C(10);
            g.fillRect(px + spot(o.ax, BEK_T_SRC, 2), py + spot(o.ay, 12, 1), 2, 1);
            g.fillRect(px + spot(o.bx, BEK_T_SRC, 2), py + spot(o.by, 12, 1), 2, 1);
            g.fillRect(px + spot(o.cx, BEK_T_SRC, 2), py + spot(o.cy, 12, 1), 2, 1);
            g.fillStyle = C(14); g.fillRect(px + spot(o.fx, BEK_T_SRC, 1), py + spot(o.fy, 12, 1), 1, 1);
            g.fillStyle = C(8); g.fillRect(px, py + 13, BEK_T_SRC, 2);
          } else {
            g.fillStyle = C(12); g.fillRect(px, py + 4, BEK_T_SRC, 3); g.fillRect(px, py + 12, BEK_T_SRC, 3);
            g.fillStyle = C(8); g.fillRect(px, py + 18, BEK_T_SRC, 2);
          }
        }
        if (c === 'D') { g.fillStyle = C(6); g.fillRect(px + 4, py + 3, 12, 17); g.fillStyle = C(8); g.fillRect(px + 4, py + 3, 12, 1); g.fillRect(px + 9, py + 3, 1, 17); g.fillStyle = C(14); g.fillRect(px + 12, py + 11, 2, 2); }
        if (c === 'b') {
          g.fillStyle = C(6); g.fillRect(px + 1, py + 1, 18, 18);
          g.fillStyle = C(8); g.fillRect(px + 1, py + 1, 18, 2); g.fillRect(px + 1, py + 17, 18, 2);
          g.fillStyle = C(15); g.fillRect(px + 3, py + 3, 14, 5);                                   /* pillow */
          g.fillStyle = C(9); g.fillRect(px + 3, py + 9, 14, 8);                                    /* blanket */
          g.fillStyle = C(11); g.fillRect(px + 3, py + 9, 14, 1); g.fillRect(px + 3, py + 13, 14, 1);
        }
        if (c === 'o') { g.fillStyle = C(8); g.fillRect(px + 3, py + 8, 14, 10); g.fillStyle = C(9); g.fillRect(px + 5, py + 10, 10, 5); g.fillStyle = C(11); g.fillRect(px + 6, py + 11, 3, 1); g.fillStyle = C(6); g.fillRect(px + 3, py + 2, 14, 3); g.fillRect(px + 4, py + 2, 2, 8); g.fillRect(px + 14, py + 2, 2, 8); }
        if (c === 'S') { g.fillStyle = C(6); g.fillRect(px + 9, py + 8, 3, 11); g.fillStyle = C(14); g.fillRect(px + 2, py + 2, 17, 8); g.fillStyle = C(0); g.fillRect(px + 4, py + 4, 13, 1); g.fillRect(px + 4, py + 7, 9, 1); }
        if (c === 'L') { g.fillStyle = C(6); g.fillRect(px, py, BEK_T_SRC, 1); g.fillRect(px, py, 1, BEK_T_SRC); }
        if (c === 'f') { g.fillStyle = C(8); g.fillRect(px, py + 19, BEK_T_SRC, 1); g.fillRect(px + 19, py, 1, BEK_T_SRC); }
        /* ---- indoors, and the benches ---------------------------------- */
        if (c === 'z') {                                                     /* a rag rug, walked on */
          g.fillStyle = C(4); g.fillRect(px + 1, py + 1, 18, 18);
          g.fillStyle = C(12); g.fillRect(px + 3, py + 3, 14, 14);
          g.fillStyle = C(6); g.fillRect(px + 3, py + 7, 14, 2); g.fillRect(px + 3, py + 12, 14, 2);
          g.fillStyle = C(14); g.fillRect(px + 8, py + 3, 2, 14);
        }
        if (c === 'n') {                                                     /* a table */
          g.fillStyle = C(14); g.fillRect(px, py + 3, BEK_T_SRC, 7);
          g.fillStyle = C(8); g.fillRect(px, py + 3, BEK_T_SRC, 1);
          g.fillStyle = C(6); g.fillRect(px, py + 10, BEK_T_SRC, 2); g.fillRect(px + 2, py + 12, 3, 7); g.fillRect(px + 15, py + 12, 3, 7);
        }
        if (c === 'u') {                                                     /* a cupboard */
          g.fillStyle = C(6); g.fillRect(px + 1, py, 18, BEK_T_SRC);
          g.fillStyle = C(8); g.fillRect(px + 1, py + 6, 18, 1); g.fillRect(px + 1, py + 13, 18, 1); g.fillRect(px + 9, py, 1, BEK_T_SRC);
          g.fillStyle = C(14); g.fillRect(px + 6, py + 9, 2, 2); g.fillRect(px + 12, py + 9, 2, 2);
          g.fillStyle = C(11); g.fillRect(px + 3, py + 2, 4, 3);
          g.fillStyle = C(15); g.fillRect(px + 12, py + 2, 3, 3);
        }
        if (c === 'J') {                                                     /* a bench, to sit on */
          g.fillStyle = C(6); g.fillRect(px + 1, py + 8, 18, 4); g.fillRect(px + 1, py + 3, 18, 3);
          g.fillStyle = C(14); g.fillRect(px + 1, py + 8, 18, 1);
          g.fillStyle = C(8); g.fillRect(px + 2, py + 12, 3, 6); g.fillRect(px + 15, py + 12, 3, 6); g.fillRect(px + 2, py + 3, 2, 6); g.fillRect(px + 16, py + 3, 2, 6);
        }
        if (c === 'c') {                                                     /* a crate */
          g.fillStyle = C(6); g.fillRect(px + 2, py + 4, 16, 14);
          g.fillStyle = C(8); g.fillRect(px + 2, py + 4, 16, 1); g.fillRect(px + 2, py + 10, 16, 1); g.fillRect(px + 9, py + 4, 1, 14);
          g.fillStyle = C(14); g.fillRect(px + 4, py + 6, 2, 1);
        }
        if (rim) edgeMark(px, py, x, y);
      }

      function tileLive(c, x, y, t) {
        if (c === 'W') { waterTile(x, y, t); if (rim_(x, y)) edgeMark(x * BEK_T_SRC, y * BEK_T_SRC, x, y); return; }
        if (c === '~') { waterEdgeTile(x, y, t); if (rim_(x, y)) edgeMark(x * BEK_T_SRC, y * BEK_T_SRC, x, y); return; }
        if (c === 'v') hearthTile(x, y, t);                                  /* the hearth, alight */
      }
      const LIVE = 'W~v';

      /* ---- the terrain cache ----------------------------------------------
         The two passes above used to be one function run for all 360 tiles
         every single frame, which is what kept the per-tile detail budget
         down to a handful of rects. They now render once into an offscreen
         canvas the size of the whole map and the frame blits that, so the
         cost of a tile's detail is paid when the map changes rather than
         sixty times a second — and the ground can afford to be interesting.
         The key is everything the static passes read: which map, which day
         (felled/mined/picked all expire against S.day), whether the house is
         up, and a counter bumped by every mutation to those three tables.
         `terrLive` is the list the frame still has to draw itself. */
      const terrCv = document.createElement('canvas');
      terrCv.width = BEK_MAP_W; terrCv.height = BEK_MAP_H;
      const terrG = terrCv.getContext('2d');
      if (terrG) terrG.tag = 'terrain';
      let terrKey = '', terrLive = [];
      let terrBump = 0;
      const terrDirty = () => { terrBump++; };
      function terrain() {
        const k = S.map + '|' + S.day + '|' + (S.built ? 1 : 0) + '|' + terrBump;
        if (k === terrKey) return terrCv;
        terrKey = k; terrLive = [];
        const prev = g;
        g = terrG;
        try {
          g.setTransform(1, 0, 0, 1, 0, 0);
          g.fillStyle = C(0); g.fillRect(0, 0, BEK_MAP_W, BEK_MAP_H);
          g.save(); g.scale(BEK_ART_SCALE, BEK_ART_SCALE);
          for (let y = 0; y < BEK_ROWS; y++) for (let x = 0; x < BEK_COLS; x++) tileGround(tileAt(S.map, x, y), x, y);
          for (let y = 0; y < BEK_ROWS; y++) for (let x = 0; x < BEK_COLS; x++) {
            const c = tileAt(S.map, x, y);
            tileDetail(c, x, y);
            if (LIVE.indexOf(c) >= 0) terrLive.push(x, y);
          }
          g.restore();
        } finally { g = prev; }
        return terrCv;
      }
      /* Ploughed in even rows, so the furrows always run the same way the
         field was worked — horizontal bands that line up tile to tile rather
         than each tile picking its own direction. Wet soil goes darker as
         well as greyer and keeps a black, dither-proof shadow in every
         furrow (plus a glint of standing water) so it still reads apart from
         dry soil once the night stipple is over everything. */
      function tilledSoil(x, y, wet) {
        const px = x * BEK_T, py = y * BEK_T, v = soilVar(S.map, x, y);
        native(() => {
          g.fillStyle = C(wet ? 8 : 6); g.fillRect(px + 2, py + 2, 36, 36);
          g.fillStyle = C(wet ? 0 : 8);
          g.fillRect(px + 4, py + 9, 32, 2); g.fillRect(px + 4, py + 19, 32, 2); g.fillRect(px + 4, py + 29, 32, 2);
          g.fillStyle = C(7);
          g.fillRect(px + 4, py + 8, 32, 1); g.fillRect(px + 4, py + 18, 32, 1); g.fillRect(px + 4, py + 28, 32, 1);
          /* standing water, and it stands where the ground happens to dip,
             not on a line four pixels wide down the left of every plot */
          if (wet) {
            g.fillStyle = C(9);
            g.fillRect(px + 4 + spot(v.ax, 32, 1), py + 4 + spot(v.ay, 32, 1), 1, 1);
            g.fillRect(px + 4 + spot(v.bx, 32, 1), py + 4 + spot(v.by, 32, 1), 1, 1);
          }
        });
      }
      function drawSoil(x, y) {
        const c = S.soil[key(x, y)]; if (!c) return;
        if (c.till) tilledSoil(x, y, c.wet);
        if (!c.seed) return;
        const px = x * BEK_T_SRC, py = y * BEK_T_SRC;
        const spec = BEK_CROPS[c.seed]; const f = Math.min(1, c.age / spec.days); const h = 3 + Math.round(f * 11);
        g.fillStyle = C(10); g.fillRect(px + 9, py + 18 - h, 2, h);
        g.fillStyle = C(2); g.fillRect(px + 6, py + 16 - h, 3, 2); g.fillRect(px + 11, py + 14 - h, 3, 2);
        if (c.ready) { g.fillStyle = C(spec.col); g.fillRect(px + 7, py + 14 - h, 6, 5); g.fillStyle = C(15); g.fillRect(px + 8, py + 15 - h, 2, 1); }
      }

      function drawIcon(id, x, y) {
        const it = BEK_ITEMS[id], col = it.col == null ? 7 : it.col, ic = it.icon;
        const R = (a, b, w, h, k) => { g.fillStyle = C(k); g.fillRect(x + a, y + b, w, h); };
        if (ic === 'seed') { R(4, 3, 6, 8, 6); R(5, 5, 4, 1, col); R(5, 8, 4, 1, col); }
        else if (ic === 'root') { R(4, 4, 6, 6, col); R(6, 2, 2, 3, 2); R(5, 10, 1, 2, col); R(8, 10, 1, 2, col); }
        else if (ic === 'leaf') { R(6, 3, 2, 9, 2); R(3, 5, 4, 3, col); R(7, 7, 4, 3, col); }
        else if (ic === 'berry') { R(4, 5, 3, 3, col); R(8, 6, 3, 3, col); R(6, 9, 3, 3, col); R(5, 6, 1, 1, 15); }
        else if (ic === 'mush') { R(6, 8, 3, 4, 15); R(3, 4, 9, 5, col); R(5, 5, 2, 1, 15); }
        else if (ic === 'fish') { R(3, 6, 8, 4, col); R(11, 5, 3, 6, col); R(4, 7, 1, 1, 0); R(10, 5, 1, 1, 15); }
        else if (ic === 'ore') { R(3, 5, 9, 8, 8); R(5, 7, 5, 4, col); R(6, 8, 1, 1, 15); }
        else if (ic === 'wood') { R(3, 6, 10, 4, 6); R(3, 6, 10, 1, col); R(11, 6, 2, 4, 8); }
        else if (ic === 'stone') { R(4, 6, 8, 6, 7); R(4, 6, 8, 1, 8); R(5, 8, 3, 2, 8); }
        else if (ic === 'nail') { R(6, 3, 2, 9, 7); R(5, 3, 4, 2, 15); }
        else if (ic === 'rope') { R(4, 5, 8, 3, 6); R(4, 8, 8, 3, col); R(6, 5, 1, 6, 8); }
        else if (ic === 'flower') { R(7, 8, 1, 5, 2); R(5, 5, 6, 4, col); R(7, 6, 2, 2, 15); }
        else if (ic === 'milk') { R(4, 3, 7, 9, 15); R(4, 3, 7, 2, 7); R(6, 6, 3, 3, 9); }
        else if (ic === 'cheese') { R(3, 5, 10, 6, col); R(3, 5, 10, 1, 14); R(6, 7, 1, 1, 6); R(9, 8, 1, 1, 6); }
        else if (ic === 'wool') { R(4, 5, 8, 6, 15); R(5, 6, 2, 2, 7); R(8, 7, 2, 2, 7); }
        else if (ic === 'cup') { R(4, 4, 7, 7, 15); R(5, 5, 5, 3, col); R(11, 5, 2, 3, 7); }
        else if (ic === 'food') { R(3, 6, 10, 4, col); R(3, 5, 10, 2, 14); R(5, 7, 1, 1, 6); }
        else if (ic === 'bowl') { R(3, 7, 10, 4, 7); R(4, 5, 8, 3, col); R(6, 5, 1, 1, 15); }
        else if (ic === 'stalk') { R(6, 3, 2, 9, col); R(4, 3, 5, 2, 10); R(8, 5, 3, 2, 10); }
        else if (ic === 'lamp') { R(5, 3, 5, 3, 7); R(4, 6, 7, 6, col); R(6, 8, 3, 3, 15); }
        else if (ic === 'shirt') { R(3, 5, 10, 7, col); R(2, 5, 3, 3, col); R(11, 5, 3, 3, col); R(5, 5, 5, 2, 15); }
        else R(4, 4, 8, 8, col);
      }

      function person(px, py, dir, step, hair, shirt, pants) {
        const bob = (step === 1 || step === 3) ? 1 : 0, y = py + bob;
        g.fillStyle = C(pants); g.fillRect(px + 3, y + 13, 3, 5); g.fillRect(px + 7, y + 13, 3, 5);
        g.fillStyle = C(0);
        if (step === 1) g.fillRect(px + 3, y + 17, 3, 2); else if (step === 3) g.fillRect(px + 7, y + 17, 3, 2); else { g.fillRect(px + 3, y + 17, 3, 2); g.fillRect(px + 7, y + 17, 3, 2); }
        g.fillStyle = C(shirt); g.fillRect(px + 2, y + 7, 9, 7); g.fillRect(px, y + 8, 2, 5); g.fillRect(px + 11, y + 8, 2, 5);
        g.fillStyle = C(14); g.fillRect(px, y + 12, 2, 2); g.fillRect(px + 11, y + 12, 2, 2); g.fillRect(px + 3, y + 2, 7, 6);
        g.fillStyle = C(hair); g.fillRect(px + 2, y, 9, 3);
        if (dir === 1) g.fillRect(px + 2, y, 9, 7);
        else { g.fillStyle = C(0); if (dir === 0) { g.fillRect(px + 4, y + 4, 1, 2); g.fillRect(px + 8, y + 4, 1, 2); } if (dir === 2) g.fillRect(px + 3, y + 4, 1, 2); if (dir === 3) g.fillRect(px + 9, y + 4, 1, 2); }
      }
      function bear(px, py, step) {
        const bob = (step === 1 || step === 3) ? 1 : 0, y = py + bob;
        g.fillStyle = C(6); g.fillRect(px + 1, y + 5, 14, 14); g.fillRect(px + 2, y, 12, 7); g.fillRect(px, y - 1, 4, 4); g.fillRect(px + 12, y - 1, 4, 4);
        g.fillStyle = C(8); g.fillRect(px + 1, y + 16, 14, 3);
        g.fillStyle = C(14); g.fillRect(px + 5, y + 4, 6, 4);
        g.fillStyle = C(0); g.fillRect(px + 4, y + 2, 2, 2); g.fillRect(px + 10, y + 2, 2, 2); g.fillRect(px + 7, y + 5, 2, 2);
        g.fillStyle = C(6); for (let i = 0; i < 12; i++) g.fillRect(px + 15 + Math.floor(i / 2), y + 4 + i, 2, 2);
        g.fillStyle = C(14); g.fillRect(px + 19, y + 16, 7, 5); g.fillStyle = C(6); g.fillRect(px + 19, y + 16, 7, 1);
      }
      function goat(px, py, t) {
        const bob = Math.floor(t * 1.5) % 2;
        g.fillStyle = C(15); g.fillRect(px + 3, py + 6 + bob, 11, 7); g.fillRect(px + 12, py + 3 + bob, 5, 5);
        g.fillStyle = C(7); g.fillRect(px + 3, py + 11 + bob, 11, 2);
        g.fillStyle = C(0); g.fillRect(px + 4, py + 13, 1, 4); g.fillRect(px + 12, py + 13, 1, 4); g.fillRect(px + 15, py + 5 + bob, 1, 1);
        g.fillStyle = C(8); g.fillRect(px + 13, py + 1 + bob, 1, 3); g.fillRect(px + 16, py + 1 + bob, 1, 3);
      }
      const { text, textW, wrapText } = createText(g, C);

      function panel(x, y, w, h, edge) {
        g.fillStyle = C(0); g.fillRect(x, y, w, h);
        g.fillStyle = C(edge == null ? 15 : edge);
        g.fillRect(x, y, w, BORDER); g.fillRect(x, y + h - BORDER, w, BORDER);
        g.fillRect(x, y, BORDER, h); g.fillRect(x + w - BORDER, y, BORDER, h);
      }
      /* drawIcon paints in its own 16px design box; menus need it at screen
         scale, so it goes through the same whole-number transform the world
         art uses rather than growing a second set of coordinates. */
      function icon(id, x, y) {
        g.save(); g.translate(x, y); g.scale(BEK_ART_SCALE, BEK_ART_SCALE);
        drawIcon(id, 0, 0); g.restore();
      }
      function toolDisplay() {
        const tl = BEK_TOOLS[S.tool];
        if (tl.id === 'oks') return T({ no: AXE_NAME.no[Math.min(1, S.axeLv - 1)], en: AXE_NAME.en[Math.min(1, S.axeLv - 1)] });
        if (tl.id === 'hakke') { const lv = Math.max(1, S.pickLv); return T({ no: PICK_NAME.no[Math.min(1, lv - 1)], en: PICK_NAME.en[Math.min(1, lv - 1)] }); }
        return T(tl.name);
      }

      /* ---- the camera ----------------------------------------------------
         24 tiles is exactly the canvas width, so X has nowhere to travel and
         clamps to zero. The valley is 600px tall against a 480px viewport, so
         Y follows the player and clamps at both ends — which is what keeps the
         top and bottom map rows welded to the frame instead of letting blank
         space creep in past the edge of the world. */
      let camX = 0, camY = 0;
      function camTrack() {
        camX = Math.max(0, Math.min(BEK_CAM_MAX_X, Math.round(S.px * BEK_T + BEK_T / 2 - BEK_VIEW_W / 2)));
        camY = Math.max(0, Math.min(BEK_CAM_MAX_Y, Math.round(S.py * BEK_T + BEK_T / 2 - BEK_VIEW_H / 2)));
      }
      const viewClip = () => { g.beginPath(); g.rect(BEK_VIEW_X, BEK_VIEW_Y, BEK_VIEW_W, BEK_VIEW_H); g.clip(); };

      /* ---- the HUD bands -------------------------------------------------
         Both strips are reserved chrome outside the viewport now, so the status
         line no longer sits on top of the top and bottom rows of the map. The
         fields flow left to right from their own measured widths and the energy
         bar is pinned to the right edge, so a long map title or tool name
         pushes its neighbours along instead of colliding with a fixed column. */
      function drawHud(m) {
        panel(0, 0, BEK_W, BEK_HUD_H, 8);
        const ty = HUD_TXT_DY;
        let hx = HUD_PAD;
        const put = (str, col) => { text(str, hx, ty, col, FONT_SM); hx += textW(str, FONT_SM) + HUD_GAP; };
        put(T(m.title), 14);
        put(TX('DAG', 'DAY') + ' ' + S.day + ' ' + clock(), 11);
        put(S.kr + 'kr', 14);
        g.fillStyle = C(9);
        g.fillRect(hx, ty + BEK_ART_SCALE, DROP_W, DROP_H);
        g.fillRect(hx + BEK_ART_SCALE, ty, BEK_ART_SCALE, BEK_ART_SCALE);
        hx += DROP_W + BEK_ART_SCALE;
        put(String(S.water), 9);
        put(toolDisplay(), S.tools[BEK_TOOLS[S.tool].id] ? 15 : 8);

        g.fillStyle = C(8); g.fillRect(EN_BAR_X, EN_BAR_Y, EN_BAR_W, EN_BAR_H);
        g.fillStyle = C(S.en > 40 ? 10 : 12);
        g.fillRect(EN_BAR_X, EN_BAR_Y, Math.round(EN_BAR_W * S.en / S.enMax), EN_BAR_H);

        panel(0, HUD_BOT_Y, BEK_W, BEK_HUD_H, 8);
        if (note) text(T(note), HUD_PAD, HUD_BOT_Y + HUD_TXT_DY, 11, FONT_SM);
      }

      /* ---- the frame ---------------------------------------------------- */
      function draw(t) {
        const m = M(), inside = !!m.inside;
        camTrack();

        /* The playfield draws in source-art coordinates under one whole-number
           transform, so the tile passes, drawSoil, person, bear and goat kept every
           literal they had and still land on exact pixels at the new size. */
        g.save();
        viewClip();
        g.translate(BEK_VIEW_X - camX, BEK_VIEW_Y - camY);
        /* The whole static ground arrives as one blit at 1:1 — it is already
           in device pixels, so it goes down before the art transform, not
           under it. Everything after this line is still source-space art. */
        g.drawImage(terrain(), 0, 0);
        g.scale(BEK_ART_SCALE, BEK_ART_SCALE);
        for (let i = 0; i < terrLive.length; i += 2) {
          const lx = terrLive[i], ly = terrLive[i + 1];
          tileLive(tileAt(S.map, lx, ly), lx, ly, t);
        }
        for (let y = 0; y < BEK_ROWS; y++) for (let x = 0; x < BEK_COLS; x++) if (tileAt(S.map, x, y) === 'f') drawSoil(x, y);

        S.drops.filter(d => d.map === S.map).forEach(d => drawIcon(d.item, d.x * BEK_T_SRC + 3, d.y * BEK_T_SRC + 3));
        BEK_GOATS.filter(gt => gt.map === S.map).forEach(gt => goat(gt.x * BEK_T_SRC + 1, gt.y * BEK_T_SRC + 1, t));

        const actors = npcsHere().map(n => ({ n: n, y: n.y }));
        actors.push({ me: 1, y: S.py });
        actors.sort((a, b) => a.y - b.y);
        actors.forEach(a => {
          if (a.me) { person(S.px * BEK_T_SRC + 4, S.py * BEK_T_SRC + 2, S.dir, S.step, 6, 11, 1); return; }
          const n = a.n;
          if (n.bear) { const sway = Math.floor(t * 1.2) % 2; bear(n.x * BEK_T_SRC + 2 + sway, n.y * BEK_T_SRC + 1, sway * 2); }
          else person(n.x * BEK_T_SRC + 4, n.y * BEK_T_SRC + 2, 0, Math.floor(t) % 2 ? 0 : 2, n.hair, n.shirt, n.pants);
        });

        if (S.map === 'lake' && S.flag.lot && !S.built) { g.fillStyle = C(14); g.fillRect(3 * BEK_T_SRC, 3 * BEK_T_SRC, 5 * BEK_T_SRC, 1); g.fillRect(3 * BEK_T_SRC, 6 * BEK_T_SRC - 1, 5 * BEK_T_SRC, 1); }
        g.restore();

        /* Weather and the hour of the day sit over the playfield only; the HUD
           bands are chrome and stay at full contrast through the night. */
        g.save();
        viewClip();
        if (!inside) {
          if (S.weather === 'regn') {
            g.fillStyle = C(9);
            for (let i = 0; i < BEK_RAIN_N; i++) {
              const rx = (i * BEK_RAIN_STRIDE_X + Math.floor(t * BEK_RAIN_VX)) % BEK_VIEW_W;
              const ry = (i * BEK_RAIN_STRIDE_Y + Math.floor(t * BEK_RAIN_VY)) % BEK_VIEW_H;
              g.fillRect(BEK_VIEW_X + rx, BEK_VIEW_Y + ry, BEK_ART_SCALE, BEK_RAIN_LEN);
            }
          } else if (S.weather === 'take') dither(7, 4);
          if (night()) dither(1, 9); else if (dusk()) dither(1, 5); else if (dawn()) dither(6, 3);
        } else {
          /* A room is not exempt from the evening. It is lit by its hearth, so
             it goes about half as dark as the valley outside — but it goes. */
          if (night()) dither(1, 5); else if (dusk()) dither(1, 3); else if (dawn()) dither(6, 2);
        }
        g.restore();

        drawHud(m);

        /* crop tooltip when you face growing soil */
        if (!mode && !fish) {
          const f = facing(), cc = S.soil[key(f.x, f.y)];
          if (cc && cc.seed && tileAt(S.map, f.x, f.y) === 'f') {
            const spec = BEK_CROPS[cc.seed];
            panel(TIP_X, TIP_Y, TIP_W, TIP_H, 7);
            const tx = TIP_X + PAD_SM, ty0 = TIP_Y + PAD_SM;
            text(iname(spec.out), tx, ty0, 15, FONT_SM);
            text(cc.ready ? TX('KLAR Å HØSTE', 'READY') : TX('DAG', 'DAY') + ' ' + Math.min(cc.age, spec.days) + '/' + spec.days,
                 tx, ty0 + LINE_SM, cc.ready ? 10 : 11, FONT_SM);
            if (!cc.ready) text(cc.wet ? TX('VANNET', 'WATERED') : TX('TØRR', 'DRY'), tx + TIP_COL2, ty0 + LINE_SM, cc.wet ? 9 : 12, FONT_SM);
          }
        }

        if (fish) drawFish();

        if (mode === 'talk' && dlg) drawTalk();
        if (mode === 'shop') drawShop();
        if (mode === 'offer') drawOffer();
        if (mode === 'bag') drawBag();
        if (mode === 'quest') drawQuests();
        if (mode === 'travel') drawTravel();
        if (mode === 'sleep') {
          panel(SLEEP_X, SLEEP_Y, SLEEP_W, SLEEP_H, 15);
          text(T(UI.sleep), SLEEP_X + PAD_LG, SLEEP_Y + PAD_LG, 15, FONT_LG);
          text(T(UI.goodnight), SLEEP_X + PAD_LG, SLEEP_Y + PAD_LG + LINE_LG, 7, FONT_LG);
        }
        if (mode === 'end') drawEnd(t);
      }

      /* The needle and the zone are both placed by multiplying the same track
         width by the same 0..1 figures the hit test in tickFish reads, so where
         the needle looks like it lands is where it actually lands. */
      function drawFish() {
        panel(FISH_X, FISH_Y, FISH_W, FISH_H, fish.rare ? 11 : 14);
        const tx = FISH_TRACK_X, ty = FISH_Y + PAD_SM;
        if (fish.phase === 'reel') {
          g.fillStyle = C(8); g.fillRect(tx, FISH_TRACK_Y, FISH_TRACK_W, FISH_TRACK_H);
          /* Both edges are rounded from the track width the same way the
             needle is, so the zone the player sees spans exactly the 0..1
             interval tickFish tests against — rounding the width separately
             would let the drawn zone drift a pixel off the real one. */
          const z0 = Math.round(FISH_TRACK_W * fish.z0);
          const zw = Math.max(FISH_NEEDLE_W, Math.round(FISH_TRACK_W * fish.z1) - z0);
          g.fillStyle = C(fish.rare ? 11 : 10); g.fillRect(tx + z0, FISH_TRACK_Y, zw, FISH_TRACK_H);
          g.fillStyle = C(15);
          g.fillRect(tx + Math.round(FISH_TRACK_W * fish.pos) - FISH_NEEDLE_W / 2,
                     FISH_TRACK_Y - FISH_NEEDLE_OVER, FISH_NEEDLE_W, FISH_TRACK_H + FISH_NEEDLE_OVER * 2);
          const left = Math.max(0, fish.need - fish.hits);
          text(TX('DRA! SPACE x' + left, 'REEL! SPACE x' + left), tx, ty, fish.rare ? 11 : 14, FONT_SM);
        } else if (fish.phase === 'bite') {
          text(fish.rare ? TX('SJELDEN! NÅ!', 'RARE! NOW!') : TX('NÅ! SPACE', 'NOW! SPACE'), tx, ty, fish.rare ? 11 : 14, FONT_SM);
        } else text(TX('VENTER...', 'WAITING...'), tx, ty, 7, FONT_SM);
      }

      function drawTalk() {
        panel(DLG_X, DLG_Y, DLG_W, DLG_H, 15);
        const who = dlg.npc ? (dlg.npc.bear ? '' : dlg.npc.n) : '';
        const top = DLG_Y + PAD_LG;
        if (who) text(who, DLG_TX, top, 14, FONT_SM);
        let y = top + LINE_SM;
        if (dlg.opts) {
          wrapText(T(dlg.opts.q), DLG_TW, FONT_LG).forEach(l => { text(l, DLG_TX, y, 11, FONT_LG); y += LINE_LG; });
          dlg.opts.opts.forEach((o, i) => {
            const on = dlg.sel === i;
            wrapText((on ? '> ' : '  ') + T(o.t), DLG_TW, FONT_LG).forEach(l => {
              text(l, DLG_TX, y, on ? 15 : 7, FONT_LG); y += LINE_LG;
            });
          });
          return;
        }
        /* The current line wraps to as many rows as it needs; the next line
           follows only while there is room left in the box. */
        const cur = wrapText(T(dlg.lines[dlg.i]) || '', DLG_TW, FONT_LG);
        const nxt = dlg.lines[dlg.i + 1] ? wrapText(T(dlg.lines[dlg.i + 1]), DLG_TW, FONT_LG) : [];
        let used = 0;
        for (const l of cur) { if (used >= DLG_BODY_LINES) break; text(l, DLG_TX, y, 15, FONT_LG); y += LINE_LG; used++; }
        for (const l of nxt) { if (used >= DLG_BODY_LINES) break; text(l, DLG_TX, y, 8, FONT_LG); y += LINE_LG; used++; }
        text('SPACE', DLG_X + DLG_W - PAD_LG - textW('SPACE', FONT_SM), DLG_Y + DLG_H - PAD_LG - GLYPH_SM, 8, FONT_SM);
      }
      function drawOffer() {
        panel(OFFER_X, OFFER_Y, OFFER_W, OFFER_H, 14);
        const tx = OFFER_X + PAD_LG;
        let y = OFFER_Y + PAD_LG;
        text(T(offer.label), tx, y, 15, FONT_LG); y += LINE_LG;
        text(S.kr + ' kr', tx, y, S.kr >= offer.kr ? 14 : 12, FONT_LG); y += LINE_LG;
        text(TX('SPACE — KJØP    ESC — NEI', 'SPACE — BUY    ESC — NO'), tx, y, 7, FONT_LG);
      }
      function drawShop() {
        panel(SHOP_X, SHOP_Y, SHOP_W, SHOP_H, 14);
        const bx = SHOP_X + PAD_SM, sx = bx + SHOP_COL_W;
        let y = SHOP_Y + PAD_SM;
        text(T(UI.shop), bx, y, 14, FONT_SM);
        text(S.kr + ' KR', SHOP_X + SHOP_W - PAD_SM - textW(S.kr + ' KR', FONT_SM), y, 14, FONT_SM);
        y += LINE_SM;
        text(T(UI.buy), bx, y, shop.side ? 7 : 15, FONT_SM);
        text(T(UI.sell), sx, y, shop.side ? 15 : 7, FONT_SM);
        const rowY = y + LINE_SM;
        shop.list.forEach((id, i) => {
          if (i >= SHOP_ROWS) return;
          const locked = (id === 'jordbarfro' && !S.flag.jordbar) || (id === 'rabarbrafro' && !S.flag.rabarbra);
          const on = !shop.side && shop.sel === i;
          const ry = rowY + i * SHOP_ROW, tyy = ry + Math.round((ICON_PX - GLYPH_SM) / 2);
          icon(id, bx, ry);
          text((on ? '>' : ' ') + iname(id), bx + SHOP_NAME_DX, tyy, locked ? 8 : (on ? 15 : 7), FONT_SM);
          if (!locked) text(price(id) + ' kr', bx + SHOP_PRICE_DX, tyy, on ? 14 : 8, FONT_SM);
        });
        const ids = Object.keys(S.bag).filter(id => S.bag[id] > 0 && BEK_ITEMS[id].sell);
        if (!ids.length) text(T(UI.empty), sx, rowY, 8, FONT_SM);
        ids.slice(0, SHOP_ROWS).forEach((id, i) => {
          const on = shop.side && (shop.sel % Math.max(1, ids.length)) === i;
          const ry = rowY + i * SHOP_ROW, tyy = ry + Math.round((ICON_PX - GLYPH_SM) / 2);
          icon(id, sx, ry);
          text((on ? '>' : ' ') + iname(id) + ' x' + S.bag[id], sx + SHOP_NAME_DX, tyy, on ? 15 : 7, FONT_SM);
          text(BEK_ITEMS[id].sell + ' kr', sx + SHOP_PRICE_DX, tyy, on ? 14 : 8, FONT_SM);
        });
        text(TX('PILER · SPACE · ESC', 'ARROWS · SPACE · ESC'), bx, SHOP_Y + SHOP_H - PAD_SM - GLYPH_SM, 8, FONT_SM);
      }
      /* The bag fills nearly the whole picture now: three columns of eight,
         twenty-four lines instead of twelve, so a good day's foraging fits
         on one page and you stop having to guess what fell off the bottom. */
      function drawBag() {
        panel(BAG_X, BAG_Y, BAG_W, BAG_H, 11);
        const bx = BAG_X + PAD_SM;
        let y = BAG_Y + PAD_SM;
        text(T(UI.bag), bx, y, 14, FONT_SM);
        y += LINE_SM;
        const ids = Object.keys(S.bag).filter(id => S.bag[id] > 0);
        if (!ids.length) text(T(UI.empty), bx, y, 8, FONT_SM);
        ids.slice(0, BAG_CAP).forEach((id, i) => {
          const col = i % BAG_COLS, row = Math.floor(i / BAG_COLS);
          const cx = bx + col * BAG_CW, cy = y + row * BAG_ROW;
          const tyy = cy + Math.round((ICON_PX - GLYPH_SM) / 2);
          icon(id, cx, cy);
          text(iname(id), cx + BAG_NAME_DX, tyy, 15, FONT_SM);
          text('x' + S.bag[id], cx + BAG_QTY_DX, tyy, 11, FONT_SM);
        });
        let fy = y + BAG_ROW * BAG_ROWS;
        if (ids.length > BAG_CAP) text('+' + (ids.length - BAG_CAP) + TX(' TIL', ' MORE'), bx, fy, 8, FONT_SM);
        fy += LINE_SM;
        let planted = 0, ready = 0;
        Object.keys(S.soil).forEach(k => { const c = S.soil[k]; if (c.seed) { planted++; if (c.ready) ready++; } });
        text(TX('JORD: ', 'SOIL: ') + planted + TX(' plantet, ', ' planted, ') + ready + TX(' klare', ' ready'), bx, fy, 7, FONT_SM);
        fy += LINE_SM;
        text(T(UI.tools) + ': ' + BEK_TOOLS.filter(tt => S.tools[tt.id]).map(tt => tt.id === 'oks' ? toolName('oks') : tt.id === 'hakke' ? toolName('hakke') : T(tt.name)).join('  '), bx, fy, 7, FONT_SM);
      }
      function toolName(id) {
        if (id === 'oks') return T({ no: AXE_NAME.no[Math.min(1, S.axeLv - 1)], en: AXE_NAME.en[Math.min(1, S.axeLv - 1)] });
        if (id === 'hakke') { const lv = Math.max(1, S.pickLv); return T({ no: PICK_NAME.no[Math.min(1, lv - 1)], en: PICK_NAME.en[Math.min(1, lv - 1)] }); }
        return T(BEK_TOOLS.filter(tt => tt.id === id)[0].name);
      }
      function drawQuests() {
        panel(QUEST_X, QUEST_Y, QUEST_W, QUEST_H, 14);
        const bx = QUEST_X + PAD_SM;
        text(T(UI.board), bx, QUEST_Y + PAD_SM, 14, FONT_SM);
        let y = QUEST_Y + PAD_SM + LINE_SM * 2;
        const shown = BEK_QUESTS.filter(q => S.q[q.id]);            /* hidden until obtained */
        if (!shown.length) text(TX('Ingen oppdrag ennå. Snakk med folk.', 'No quests yet. Go and talk to people.'), bx, y, 7, FONT_SM);
        shown.forEach(q => {
          const st = S.q[q.id];
          text(T(q.t), bx, y, st === 'done' ? 8 : 15, FONT_SM);
          text(st === 'done' ? T(UI.done) : T(UI.active), bx + QUEST_STATUS_DX, y, st === 'done' ? 10 : 11, FONT_SM);
          text(T(q.d), bx + CELL_SM, y + LINE_SM, 7, FONT_SM);
          y += QUEST_ENTRY;
        });
        if (S.flag.build || S.flag.lot) {
          const c = houseCost();
          text(TX('HUSET VED VANNET', 'THE HOUSE BY THE WATER'), bx, y, 14, FONT_SM);
          text(S.built ? TX('BYGGET', 'BUILT') : (S.flag.lot ? TX('TOMT KJØPT', 'LOT BOUGHT') : TX('TOMT 1200 KR', 'LOT 1200 KR')), bx + QUEST_STATUS_DX, y, S.built ? 10 : 11, FONT_SM);
          if (!S.built) text(c.kr + ' kr + ' + c.tommer + ' ' + iname('tommer') + ' + ' + c.stein + ' ' + iname('stein'), bx + CELL_SM, y + LINE_SM, 7, FONT_SM);
        }
        text('ESC', QUEST_X + QUEST_W - PAD_SM - textW('ESC', FONT_SM), QUEST_Y + QUEST_H - PAD_SM - GLYPH_SM, 8, FONT_SM);
      }
      function drawTravel() {
        panel(TRAVEL_X, TRAVEL_Y, TRAVEL_W, TRAVEL_H, 14);
        const bx = TRAVEL_X + PAD_SM;
        text(T(UI.map), bx, TRAVEL_Y + PAD_SM, 14, FONT_SM);
        let y = TRAVEL_Y + PAD_SM + LINE_SM * 2;
        travel.list.forEach((mp, i) => {
          text((travel.sel === i ? '> ' : '  ') + T(BEK_MAPS[mp].title), bx, y + i * LINE_SM, travel.sel === i ? 15 : 7, FONT_SM);
        });
        text(TX('SPACE — GÅ (−10, +40min)', 'SPACE — WALK (−10, +40min)'), bx, TRAVEL_Y + TRAVEL_H - PAD_SM - GLYPH_SM, 8, FONT_SM);
      }

      /* ---- the ending ----------------------------------------------------
         A bespoke painting rather than a tile scene, so it keeps its own
         source-space coordinates and reaches the screen through the same
         whole-number transform the playfield uses. */
      function drawEnd(t) {
        g.fillStyle = C(1); g.fillRect(0, 0, BEK_W, BEK_H);
        dither(0, Math.max(0, 16 - S.ending * 6));

        g.save();
        g.scale(BEK_ART_SCALE, BEK_ART_SCALE);
        for (let i = 0; i < END_TREES; i++) {
          const tx = 20 + i * END_TREE_DX, ty = 150 + (i % 2) * 20;
          g.fillStyle = C(6); g.fillRect(tx + 10, ty + 30, 6, 22);
          g.fillStyle = C(2); g.fillRect(tx, ty, 26, 34);
          g.fillStyle = C(10); g.fillRect(tx + 4, ty + 4, 18, 16);
        }
        const cx = END_HOUSE_X;                                   /* the house, centred */
        g.fillStyle = C(4); g.fillRect(cx, 90, END_HOUSE_W, 30); g.fillStyle = C(12); g.fillRect(cx, 96, END_HOUSE_W, 4);
        g.fillStyle = C(7); g.fillRect(cx + 6, 120, 88, 60); g.fillStyle = C(6); g.fillRect(cx + 40, 148, 20, 32);
        g.fillStyle = C(11); g.fillRect(cx + 14, 130, 16, 14); g.fillRect(cx + 70, 130, 16, 14); g.fillStyle = C(14); g.fillRect(cx + 14, 130, 16, 3);
        g.fillStyle = C(1); g.fillRect(0, 210, END_SRC_W, END_SRC_H - 210);
        g.fillStyle = C(9); for (let i = 0; i < 12; i++) g.fillRect(20 + i * 40, 226 + (i % 3) * 14, 22, 1);
        if (S.ending > 1.2) bear(END_SRC_W - 80, 168, Math.floor(S.ending * 2) % 4);
        g.restore();

        const title = T(BEK_MAPS.lakehouse.title) + '.';
        text(title, Math.round((BEK_W - textW(title, FONT_LG)) / 2), PAD_LG, 14, FONT_LG);
        /* the ending remembers what you told them */
        const lines = [];
        lines.push(TX('Trær på tre sider. Vann på den fjerde.', 'Trees on three sides. Water on the fourth.'));
        if (S.flag.why === 'quiet') lines.push(TX('Du kom for stillheten. Den er her ennå.', 'You came for the quiet. It is still here.'));
        else if (S.flag.why === 'land') lines.push(TX('Billig jord. Men ikke lenger tom.', 'Cheap land. But not empty any more.'));
        if (S.flag.build === 'skog') lines.push(TX('Hver bjelke bar du selv.', 'Every beam you carried yourself.'));
        else if (S.flag.build === 'kjop') lines.push(TX('Plankene kom med båt. Huset står likevel.', 'The planks came by boat. The house stands all the same.'));
        if (S.flag.dairy) lines.push(TX('Sigrid vinker fra setra.', 'Sigrid waves from the mountain dairy.'));
        if (S.pickLv >= 2) lines.push(TX('Fjellet ga fra seg sølvet sitt.', 'The mountain gave up its silver.'));
        if (S.flag.boat) lines.push(TX('Olavs båt gynger ved kaia.', 'Olav’s boat rocks at the dock.'));
        if (S.q.blomst === 'done') lines.push(TX('Blomster på karmen, som Marit ville.', 'Flowers on the sill, as Marit wanted.'));
        const ly = END_TEXT_Y;
        for (let i = 0; i < lines.length; i++) if (S.ending > 1.6 + i * 0.7) text(lines[i], END_TEXT_X, ly + i * LINE_SM, i === 0 ? 15 : 11, FONT_SM);
        const stat = 'DAG ' + S.day + ' — ' + S.kr + ' KR';
        if (S.ending > 1.6 + lines.length * 0.7 + 0.5) text(stat, Math.round((BEK_W - textW(stat, FONT_SM)) / 2), ly + lines.length * LINE_SM + LINE_SM, 11, FONT_SM);
        const again = TX('SPACE — BEGYNN PÅ NYTT', 'SPACE — START OVER');
        if (S.ending > 1.6 + lines.length * 0.7 + 1.2) text(again, Math.round((BEK_W - textW(again, FONT_SM)) / 2), BEK_H - PAD_LG - GLYPH_SM, 8, FONT_SM);
      }

      /* ---- the loop ----------------------------------------------------- */
      S = fresh(); spawnDrops(); refreshBar();
      /* carry on from where the valley was left */
      try {
        const raw = localStorage.getItem(BEK_SAVE);
        if (raw) { S = heal(Object.assign(fresh(), JSON.parse(raw))); BEK_LANG = S.lang || BEK_LANG; refreshBar(); }
      } catch (e) {}
      Song.cur = 'dag';
      let hymnWas = false;
      try { hymnWas = Music.on; if (Music.on) Music.stop(); } catch (e) {}
      Song.sync();

      let acc = 0;
      function frame(ts) {
        if (!alive || !document.body.contains(cv)) { alive = false; Song.stop(); return; }
        raf = requestAnimationFrame(frame);
        const dt = Math.min(0.1, (ts - last) / 1000 || 0); last = ts;
        if (!mode) { move(dt); tickFish(dt); }
        if (mode === 'end') S.ending += dt;
        tickClock(dt);
        if (noteT > 0) { noteT -= dt; if (noteT <= 0) note = ''; }
        autoT += dt; if (autoT > 6) { autoT = 0; autoSave(); }
        speechTick();
        Song.rotStep(dt); Song.sync();
        acc += dt; if (acc >= 1 / 30) { acc = 0; draw(ts / 1000); }
      }
      raf = requestAnimationFrame(frame);

      const watch = setInterval(() => {
        if (document.body.contains(cv)) return;
        clearInterval(watch); alive = false;
        if (raf) cancelAnimationFrame(raf);
        autoSave();
        Song.stop();
        try { if (hymnWas) Music.sync(); } catch (e) {}
      }, 800);

      /* the fullscreen listener lives on `document`, not on the canvas, so it
         outlives the window's own DOM removal and must be torn down here */
      this._cleanup = () => {
        ro.disconnect();
        document.removeEventListener('fullscreenchange', onFSChange);
        if (document.fullscreenElement === wrap) document.exitFullscreen().catch(() => {});
      };
  },
  unmount() {
    if (this._cleanup) { this._cleanup(); this._cleanup = null; }
  }
};
