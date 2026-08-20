import { createWindow, raise } from '../../kernel/wm.js';
import { fs as vfs } from '../../kernel/vfs.js';
import { CRT, Vol, musGain, sfxGain } from '../../kernel/hardware.js';
import { BEK_T, BEK_T_SRC, BEK_ART_SCALE, BEK_SAVE, BEK_LOT_COST, UI, BEK_ITEMS, BEK_SEED_ORDER,
         BEK_CROPS, BEK_TOOLS, AXE_NAME, PICK_NAME, BEK_MAPS, BEK_SOLID, BEK_NPCS, BEK_GOATS,
         BEK_TALK, BEK_QUESTS, BEK_HOUSE, BEK_DECOR, BEK_FARM_PLOTS, BEK_BARN_PLOT,
         BEK_BARN_PLOT2, BEK_ANIMAL_KINDS,
         BEK_RECIPES,
         BEK_SEASONS, BEK_SEASON_TINT, BEK_FESTIVALS,
         BEK_W, BEK_H, BEK_HUD_H, BEK_VIEW_X, BEK_VIEW_Y, BEK_VIEW_W, BEK_VIEW_H,
         mapCols, mapRows, camMaxX, camMaxY,
         BEK_RAIN_N, BEK_RAIN_STRIDE_X, BEK_RAIN_STRIDE_Y, BEK_RAIN_LEN, BEK_RAIN_VX, BEK_RAIN_VY,
         BEK_DITHER_CELL, BEK_DITHER_PX } from './data.js';
import { hLowV, patchAmt, mapSalt, groundVar, rockVar, pathVar, waterVar, edgeVar,
         soilVar, objVar, seamVar, treeVar, LOW, PATCH, JIT } from './noise.js';
import { seasonIndexOf, festivalOf, cropInSeason, rollWeather } from './seasons.js';
import { createShore } from './shore.js';
import { createWater } from './water.js';
import { createRock, oreKind } from './rock.js';
import { createInterior } from './interior.js';
import { createForest } from './forest.js';
import { createFx, TOOL_SWING, swingLen, toolAt, drawHeld } from './fx.js';
import { createSongs } from './music.js';
import { createAmbience } from './ambience.js';
import { createActors } from './actors.js';
import { createMenus } from './menus.js';
import { createCrops } from './crops.js';
import { refreshBoard, isRefreshDay, activeRepeatable, questTitle } from './quests.js';
import { houseCost, houseTierCost, houseTierAvailable, barnSlots } from './progression.js';
import { PROP, furniture, LIVE as PROP_LIVE, LIGHTS as PROP_LIGHTS } from './decor.js';
import { PAL_CSS, ATMO, GRASS, DRY, CON, TIM, STO, SOI, WAT, SAN, SNO, WAR, ORE,
         MARKS, SHADOWS, FEATURES } from './palette.js';
import { lightAt, shelter, keyOf, cssFor, DAY_CSS, CAVE_LIGHT } from './light.js';
import { glow, GLOW_CELL, lampState, createLamp } from './lamp.js';
import { rustic, inside as insideMap, isCave, snowy, groundOf, solidOf, defaultGround } from './surface.js';
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
      /* ---- the active lookup table --------------------------------------
         `C` is one array index per fill — the old helper built 'rgb(r,g,b)'
         from three numbers every single time, which on a 7800-rect cache
         rebuild is 7800 string concatenations nobody needed. What it indexes
         *into* is the hour's LUT: the playfield sets `LUT_CSS` to the light
         state's table before it draws and puts it back to daylight after, so
         night costs no overdraw at all and the two HUD bands, the panels and
         every glyph of text keep full contrast after dark without anyone
         having to remember to ask for it. See light.js. */
      let LUT_CSS = DAY_CSS, LUT_TAG = 'day';
      const C = i => LUT_CSS[i];
      const useLut = (css, tag) => { LUT_CSS = css; LUT_TAG = tag; };
      /* The declared mark / shadow / feature tables, unpacked once. Every
         decorative colour decision in the art below comes out of one of
         these, which is what lets palette_check.js assert the contrast rule
         against the very tables the art draws from. */
      const TUFT = MARKS.TUFT.cols, TUFT_DRY = MARKS.TUFT_DRY.cols, BLADE = MARKS.BLADE.cols,
            PATH_GRIT = MARKS.PATH_GRIT.cols, CAVE_GRIT = MARKS.CAVE_GRIT.cols,
            ROCK_FACE = MARKS.ROCK_FACE.cols, FLOOR_GRAIN = MARKS.FLOOR_GRAIN.cols,
            TURF_ROOF = MARKS.TURF_ROOF.cols, WATER_DEEP = MARKS.WATER_DEEP.cols;
      const PATH_CRACK = SHADOWS.PATH_CRACK.cols[0], ROCK_CRACK = SHADOWS.ROCK_CRACK.cols[0],
            FLOOR_JOINT = SHADOWS.FLOOR_JOINT.cols[0], TREE_INK = SHADOWS.TREE_INK.cols;
      /* the player, who has no entry in BEK_NPCS because there is only one */
      const PLAYER_HAIR = TIM[1], PLAYER_SHIRT = WAT[4], PLAYER_PANTS = ATMO[2];
      const FLOWER = FEATURES.FLOWER.cols, PICKABLE = FEATURES.PICKABLE.cols,
            WATER_SUN = FEATURES.WATER_SUN.cols, FOAM = FEATURES.FOAM.cols,
            ORE_GLINT = FEATURES.ORE_GLINT.cols, HEARTH = FEATURES.HEARTH.cols;
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
      const fresh = () => {
        const f = {
        ver: 10, lang: BEK_LANG, fullscreen: 0,
        map: 'farm', px: 3, py: 8, dir: 0, step: 0, walk: 0,
        day: 1, min: 6 * 60, kr: 500, en: 120, enMax: 120,
        water: 20, waterMax: 20,
        tools: { spade: 1, kanne: 1, oks: 1, stang: 0, hakke: 0 },
        tool: 0, axeLv: 1, pickLv: 0, kanneLv: 0, seedIx: 0,
        /* the bag's soft cap — see gainCapped() — and the shop tier it was
           bought at, so the offer that sells tier 2 knows tier 1 is done */
        bagCap: 80, bagTier: 0,
        bag: { potetfro: 5 },
        /* the chest — the 'K' tile on the farm map, see act() and
           tileDetail below — same {itemId: qty} shape as bag, same soft
           rules (add()/has() style helpers), just no bagCap. Crafting
           output that will not fit the bag overflows here rather than
           being lost — see craftGain() in the crafting section. */
        chest: {},
        soil: {}, felled: {}, mined: {}, picked: {}, drops: [],
        /* owned animals: { id, kind, x, y, fed, pet, ready }. `id` is also
           the key S.fr reads their affection off — the same counter an NPC
           uses, never a second table. animalSeq hands out those ids. */
        animals: [], animalSeq: 0,
        fr: { astrid: 0, hakon: 0, ingrid: 0, olav: 0, marit: 0, sigrid: 0, gunnar: 0, lars: 0 },
        /* one XP counter and one derived level per gathering activity — see
           addXp(). Farming/mining/foraging/fishing only; felling and selling
           are not activities a level applies to. */
        xp: { farm: 0, mine: 0, forage: 0, fish: 0 },
        lvl: { farm: 0, mine: 0, forage: 0, fish: 0 },
        met: {}, seen: {}, flag: {}, q: {},
        chatIx: {}, disc: { farm: 1 }, weather: 'klar',
        /* the seasonal layer — always recomputed from `day` (seasons.js),
           never incremented on its own, so it cannot drift from it. See
           heal() below for the same recompute on an old save's load. */
        season: seasonIndexOf(1), festival: festivalOf(1) ? BEK_SEASONS[seasonIndexOf(1)].id : null,
        built: 0, ending: 0,
        /* the completed house is a permanent milestone, not part of the
           resettable run state — never touched by fresh() after game start */
        houseBuilt: false, houseBuiltDay: null,
        /* derived from houseBuilt — the one flag every Act II gate reads
           (tileAt()'s second pen, hakonTilbygg(), templateAvailable() in
           quests.js, the BEK_TALK chat lines gated on it) */
        act2Unlocked: false,
        /* Act II's one house upgrade tier — see hakonTilbygg() and
           BEK_DECOR.lakehouse_t2 (data.js) */
        houseTier: 0
        };
        /* the repeatable quest board (quests.js) — two or three live
           instances on top of BEK_QUESTS above, seeded here so day 1 already
           has a board rather than waiting for the first weekly refresh */
        f.rq = refreshBoard(f, f.day);
        return f;
      };
      /* nested objects a stale save might be missing */
      const heal = s => {
        const f = fresh();
        ['tools', 'fr', 'soil', 'felled', 'mined', 'picked', 'flag', 'q', 'met', 'seen', 'chatIx', 'disc', 'bag', 'chest', 'xp', 'lvl'].forEach(k => {
          if (typeof s[k] !== 'object' || s[k] === null) s[k] = f[k];
        });
        Object.keys(f.tools).forEach(k => { if (s.tools[k] == null) s.tools[k] = f.tools[k]; });
        Object.keys(f.fr).forEach(k => { if (s.fr[k] == null) s.fr[k] = 0; });
        Object.keys(f.xp).forEach(k => { if (s.xp[k] == null) s.xp[k] = 0; });
        Object.keys(f.lvl).forEach(k => { if (s.lvl[k] == null) s.lvl[k] = 0; });
        ['axeLv', 'pickLv', 'kanneLv', 'seedIx', 'enMax', 'waterMax', 'bagCap', 'bagTier', 'weather', 'ver', 'houseBuilt', 'houseBuiltDay', 'act2Unlocked', 'houseTier', 'fullscreen', 'animalSeq'].forEach(k => { if (s[k] == null) s[k] = f[k]; });
        if (!Array.isArray(s.drops)) s.drops = [];
        if (!Array.isArray(s.animals)) s.animals = [];
        /* a save from before the quest board existed gets one seeded on load
           rather than waiting up to BEK_QUEST_REFRESH_DAYS for the first
           scheduled refresh — same reasoning as fresh()'s own seed above */
        if (!Array.isArray(s.rq)) s.rq = refreshBoard(s, s.day || 1);
        if (typeof s.chatIx === 'number') s.chatIx = {};
        /* always recomputed from s.day rather than backfilled once — a
           stale save's season/festival are derived fresh on every load, the
           same as fresh()'s own day-1 seed above, so there is nothing
           stored that could ever disagree with the day count it comes from */
        s.season = seasonIndexOf(s.day); s.festival = festivalOf(s.day) ? BEK_SEASONS[s.season].id : null;
        return s;
      };

      let mode = '', dlg = null, shop = null, craft = null, fish = null, note = '', noteT = 0, travel = null, offer = null;
      /* the quest board's scroll offset — transient UI state, reset each time
         the board opens, never saved (see qScroll's use in menus.js) */
      let qScroll = 0;
      /* ---- the swing ------------------------------------------------------
         Transient by definition — it must not survive a reload and it must
         not appear in a save, so it lives here beside `fish` and `note` and
         never in `S`. `bufAct` is the buffered next input: pressing again
         during a swing queues the action rather than dropping it, so holding
         the key still chops at the rate the animation allows. */
      let swing = null, bufAct = false, shake = 0;
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
      /* both pen tiers, tileAt() checks each the same way — see
         BEK_BARN_PLOT2 (data.js) for why a second region rather than a
         bigger first one */
      const BARN_PLOTS = [BEK_BARN_PLOT, BEK_BARN_PLOT2];
      /* The current map's size, which is now a question rather than a
         constant. Everything that walks the whole grid hoists these into
         locals first: they are two property lookups, and an inner loop that
         asks 360 (or 1440) times is paying for nothing. Anything that reads a
         square on a map that may not be the one we are standing on — dropAt,
         the sprinkler's neighbours — asks about that map by name instead. */
      const COLS = () => mapCols(S.map), ROWS = () => mapRows(S.map);
      const tileAt = (mp, x, y) => {
        if (x < 0 || y < 0 || x >= mapCols(mp) || y >= mapRows(mp)) return BEK_MAPS[mp] && BEK_MAPS[mp].inside ? 'H' : 'T';
        const m = BEK_MAPS[mp];
        if (S.built && mp === 'lake' && BEK_HOUSE[y] && BEK_HOUSE[y][x] !== ' ') return BEK_HOUSE[y][x];
        if (S.felled[rkey(mp, x, y)] > S.day) return 'g';
        if (S.mined[rkey(mp, x, y)] > S.day) return 'g';
        if (S.picked[rkey(mp, x, y)] > S.day) return ',';
        /* the two purchasable field expansions — an unlocked-region flag
           read over the farm map's own rows, never a second map */
        if (mp === 'farm') {
          for (let i = 0; i < BEK_FARM_PLOTS.length; i++) {
            const p = BEK_FARM_PLOTS[i];
            if (S.flag[p.flag] && x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1) return 'f';
          }
          /* the pen, same mechanism — a third unlocked-region flag over the
             farm map's own grass, never a new map or its own tile state.
             Act II's second tier (BEK_BARN_PLOT2) is a fourth such region,
             checked the same way rather than as a special case. */
          for (let i = 0; i < BARN_PLOTS.length; i++) {
            const bp = BARN_PLOTS[i];
            if (S.flag[bp.flag] && x >= bp.x0 && x <= bp.x1 && y >= bp.y0 && y <= bp.y1) return 'k';
          }
        }
        /* the festival's map dressing — a handful of the town's own grass
           tiles standing in for the flower glyph the map already draws
           elsewhere on itself, same overlay mechanism as the plots above.
           S.festival is recomputed from S.day every morning (newDay()), so
           this never needs its own cache-busting: S.day is already part of
           the terrain cache key. */
        if (S.festival) {
          const fest = BEK_FESTIVALS[S.festival];
          if (fest && fest.map === mp && fest.dress.some(d => d[0] === x && d[1] === y)) return 'F';
        }
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
      /* ---- the bag's soft cap and the XP track --------------------------
         `add()` above stays the raw, uncapped mutation: quest rewards, NPC
         gifts and grant.item are guaranteed narrative and must never be
         blocked by a full bag. `gainCapped` is what every *gathered* item
         (a harvest, an ore, a catch, a shop purchase) goes through instead,
         so S.bagCap — raised by the two sekk tiers Astrid sells — is the one
         concrete thing the upgrade buys. */
      const bagTotal = () => Object.values(S.bag).reduce((a, b) => a + b, 0);
      function gainCapped(id, n) {
        if (bagTotal() >= S.bagCap) { say(TX('SEKKEN ER FULL.', 'BAG IS FULL.')); deny(); return false; }
        add(id, n || 1); return true;
      }
      /* One counter and one derived level per gathering activity, levels
         0..3 at XP_STEP apart. Each level's effect is applied at its own
         call site (spend(), the harvest/mine/forage/fish branches below)
         rather than here — this only owns the counting and the level-up. */
      const XP_STEP = 20, XP_MAX_LVL = 3;
      function addXp(kind, n) {
        S.xp[kind] = (S.xp[kind] || 0) + n;
        const lvl = Math.min(XP_MAX_LVL, Math.floor(S.xp[kind] / XP_STEP));
        if (lvl > (S.lvl[kind] || 0)) {
          S.lvl[kind] = lvl;
          say(TX('NIVÅ OPP: ', 'LEVEL UP: ') + kind.toUpperCase() + ' ' + lvl);
          sfx.done();
        }
      }
      /* A refusal you can see beats a refusal you have to read. Two frames of
         recoil fires alongside the sound that was already there, so every
         "no" in the game got one without any of them being changed. */
      const deny = () => { sfx.deny(); if (!swing) startSwing('deny'); };
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
      const gateOK = need => need === 'warm' ? has('ullgenser') : need === 'lamp' ? has('lykt') : need === 'boat' ? !!S.flag.boat : true;
      const curSeed = () => {
        const owned = BEK_SEED_ORDER.filter(id => (S.bag[id] || 0) > 0);
        if (!owned.length) return null;
        return owned[S.seedIx % owned.length];
      };

      /* ---- the speaker -------------------------------------------------- */
      const sfx = {
        step(tile) { Amb.step(S.map, tile); },
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

      /* ---- five songs, on rotation --------------------------------------
         The tunes and the crossfading scheduler live in music.js. They are
         the one thing in this file that was neither engine nor drawing, and
         a hundred and fifty lines of note tables was most of what stood
         between index.js and the file-size rule. `createSongs` takes the
         handful of things it needs from here and nothing else. */
      const Song = createSongs({
        snd: () => Snd,
        musGain: musGain,
        playing: () => alive && CRT.on && Vol.mus > 0,
        context: () => {
          if (isCave(S.map)) return 'mine';
          if (S.map === 'setra' || S.map === 'vidda') return 'high';
          if (night()) return 'night';
          if (S.map === 'town') return 'townday';
          return 'day';
        },
        season: () => BEK_SEASONS[S.season].id
      });

      /* ---- the bed under everything --------------------------------------
         Wind, water, birdsong, room tone, mine air and valley quiet, plus
         weather and the hour layered over them, hearth crackle and material
         footsteps — all of it lives in ambience.js, reached through the same
         "closure of accessors" shape as createSongs above. It answers to the
         SND knob, not MUS: this is sound design standing beside the
         footsteps and the hearth's own one-shot crackle, not the soundtrack. */
      const Amb = createAmbience({
        snd: () => Snd,
        gain: sfxGain,
        playing: () => alive && CRT.on && Vol.sfx > 0,
        context: () => {
          if (isCave(S.map)) return 'mine';
          if (S.map === 'setra' || S.map === 'vidda') return 'high';
          if (night()) return 'night';
          if (S.map === 'town') return 'townday';
          return 'day';
        },
        map: () => S.map,
        weather: () => S.weather,
        hour: () => dawn() ? 'dawn' : dusk() ? 'dusk' : night() ? 'night' : 'day',
        hearths: () => lightSources(1).filter(s => s.hearth).map(s => ({ px: s.px, py: s.py })),
        player: () => ({ px: (S.px + 0.5) * BEK_T, py: (S.py + 0.5) * BEK_T })
      });

      /* ---- the day ------------------------------------------------------ */
      const BEK_HOME = { farm:[4,8], town:[4,7], lake:[3,8], forest:[4,7], enga:[4,8], setra:[4,8], vidda:[4,11], gruva:[2,7], fjord:[4,7] };
      function markDisc(m){ if (BEK_MAPS[m] && !BEK_MAPS[m].inside) S.disc[m] = 1; }
      function dropAt(mp, item, tries, area) {
        for (let k = 0; k < (tries || 40); k++) {
          const x = (area ? area[0] : 1) + Math.floor(Math.random() * (area ? area[2] : mapCols(mp) - 2));
          const y = (area ? area[1] : 1) + Math.floor(Math.random() * (area ? area[3] : mapRows(mp) - 2));
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
        /* forage lvl2: the valley has more to find, every morning */
        if (S.lvl.forage >= 2) {
          dropAt('forest','sopp'); dropAt('setra','multe'); dropAt('vidda','tyttebar'); dropAt('enga','urt');
        }
      }
      function newDay(passedOut) {
        S.day++; S.min = 6 * 60;
        /* recomputed, never incremented — see the comment on fresh()'s own
           seed and on heal() above for why that is what keeps this from
           ever drifting off S.day */
        S.season = seasonIndexOf(S.day);
        S.festival = festivalOf(S.day) ? BEK_SEASONS[S.season].id : null;
        /* the repeatable quest board turns over as one batch on a fixed
           in-game weekday — see isRefreshDay()/refreshBoard() in quests.js */
        if (isRefreshDay(S.day)) S.rq = refreshBoard(S, S.day);
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
        /* the sprinkler: waters its own tile and the four it neighbours,
           same as the player would with a kanne — but every morning, and
           it never runs dry. Run after the ageing pass above so it is not
           immediately zeroed out by the "no seed, so not wet" branch, and
           its own watering only takes effect at the *next* day's ageing —
           exactly the lag a player's afternoon watering already has. */
        Object.keys(S.soil).forEach(k => {
          if (!S.soil[k].spr) return;
          const [sx, sy] = k.split(',').map(Number);
          [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => {
            const x = sx + d[0], y = sy + d[1];
            if (tileAt('farm', x, y) !== 'f') return;
            const nk = key(x, y);
            const nc = S.soil[nk] || (S.soil[nk] = { till: 0, wet: 0, seed: '', age: 0, ready: 0 });
            nc.wet = 1;
          });
        });
        /* the pen: fed yesterday raises affection and, past the first point
           of it, leaves produce waiting; unfed lets it drift back down and
           stops production — it never removes the animal. Same S.fr clamp
           as an NPC's friendship, keyed by the animal's own id. */
        S.animals.forEach(a => {
          if (a.fed) {
            S.fr[a.id] = Math.min(5, (S.fr[a.id] || 0) + 1);
            a.ready = S.fr[a.id] >= 1 ? 1 : 0;
          } else {
            S.fr[a.id] = Math.max(0, (S.fr[a.id] || 0) - 1);
            a.ready = 0;
          }
          a.fed = 0; a.pet = 0;
        });
        /* the odds move with the season (BEK_SEASON_WEATHER); the roll
           itself is still one call, still fully random */
        S.weather = rollWeather(S.day);
        spawnDrops();
        S.map = 'farm'; S.px = 4; S.py = 8; S.dir = 1;
        sfx.sleep();
        say(TX('DAG ' + S.day + '. ', 'DAY ' + S.day + '. ') +
            (passedOut ? TX('DU SOVNET DER DU STO.', 'YOU SLEPT WHERE YOU FELL.')
                       : S.weather === 'regn' ? TX('REGN I DAG.', 'RAIN TODAY.')
                       : S.weather === 'take' ? TX('TÅKE I DAG.', 'FOG TODAY.') : TX('GOD MORGEN.', 'GOOD MORNING.')));
      }

      /* ---- the verbs ---------------------------------------------------- */
      /* Start a swing of `kind` at the tile in front. Returns the swing so a
         caller can hang an effect on it; the effect fires on the strike frame
         rather than now, which is the whole point of the exercise. */
      function startSwing(kind, fx) {
        const f = facing();
        swing = { kind: kind, t: 0, fired: false, fx: fx || (TOOL_SWING[kind] || {}).fx,
                  tx: f.x, ty: f.y, len: swingLen(kind) };
        return swing;
      }
      const busy = () => !!swing;
      function facing() { const d = [[0,1],[0,-1],[-1,0],[1,0]][S.dir]; return { x: S.px + d[0], y: S.py + d[1] }; }
      function spend(n) {
        const cost = n + (S.en < 20 ? 1 : 0);               /* tired hands work harder */
        if (S.en < cost) { say(TX('FOR SLITEN. LEGG DEG.', 'TOO TIRED. GO TO BED.')); deny(); return false; }
        S.en -= cost; return true;
      }
      /* the tier-2 kanne's line: the two tiles either side of the one
         watered dead ahead, perpendicular to the way the player is facing
         (S.dir's own [x,y] delta), same as a real watering can pass */
      function waterLine(f) {
        const d = [[0, 1], [0, -1], [-1, 0], [1, 0]][S.dir];
        const perp = d[0] === 0 ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
        perp.forEach(p => {
          const x = f.x + p[0], y = f.y + p[1];
          if (tileAt(S.map, x, y) !== 'f') return;
          const k = key(x, y);
          const c = S.soil[k] || (S.soil[k] = { till: 0, wet: 0, seed: '', age: 0, ready: 0 });
          if (c.seed && !c.wet) c.wet = 1;
        });
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
        if (e) { if (e.need && !gateOK(e.need)) { say(T(e.why)); deny(); return true; } S.map = e.to; S.px = e.tx; S.py = e.ty; markDisc(e.to); say(T(BEK_MAPS[e.to].title)); return true; }
        return false;
      }
      function act() {
        if (swing) return;                       /* one thing at a time */
        /* the boat, from the end of the pier or the dock */
        const b = M().boat;
        if (b && S.px === b.x && S.py === b.y) {
          if (!S.flag.boat) { say(TX('BÅTEN ER IKKE KLAR.', 'THE BOAT IS NOT READY.')); deny(); return; }
          sfx.boat(); S.map = b.to; S.px = b.tx; S.py = b.ty; markDisc(b.to); say(T(BEK_MAPS[b.to].title)); return;
        }
        const f = facing();
        const t = tileAt(S.map, f.x, f.y);
        const who = npcsHere().filter(n => n.x === f.x && n.y === f.y)[0];
        if (who) return talkTo(who);
        if (S.map === 'farm') {
          const anim = S.animals.filter(a => a.x === f.x && a.y === f.y)[0];
          if (anim) return tendAnimal(anim);
        }
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
        if (t === 'D') { if (doorTravel(f)) return; say(TX('LÅST.', 'LOCKED.')); deny(); return; }
        if (t === 'K') { openCraft(); return; }

        const tool = BEK_TOOLS[S.tool];
        if (t === 'p' && S.picked[rkey(S.map, f.x, f.y)] <= S.day) {   /* pick a wildflower */
          if (S.lvl.forage < 1 && !spend(1)) return;   /* forage lvl1: picking costs no energy */
          const kinds = ['blomst_bla', 'blomst_gul', 'blomst_ro'];
          const got = kinds[Math.floor(Math.random() * kinds.length)];
          if (!gainCapped(got, 1)) return;
          S.picked[rkey(S.map, f.x, f.y)] = S.day + 1; terrLater(); sfx.pick(); addXp('forage', 1);
          startSwing('hand').drop = BEK_ITEMS[got].col;
          say('+1 ' + iname(got)); return;
        }
        if (tool.id === 'stang') {
          if (t !== 'W') { say(TX('KAST I VANNET.', 'CAST IT AT THE WATER.')); return; }
          if (!spend(tool.e)) return;
          /* The cast animates first and *hands off* to the minigame on the
             strike frame, rather than racing it: `fish` does not exist until
             the rod has actually gone out. */
          sfx.cast();
          /* fish lvl1: a fish finds the hook sooner */
          const waitCut = S.lvl.fish >= 1 ? 0.4 : 0;
          startSwing('stang').then = () => {
            fish = { phase: 'wait', t: Math.max(0.3, 0.8 - waitCut + Math.random() * 1.6), rare: Math.random() < 0.1 };
          };
          return;
        }
        if (tool.id === 'oks') {
          if (t === 'Y') { if (!spend(tool.e)) return; S.felled[rkey(S.map, f.x, f.y)] = S.day + 2; terrLater(); if (!gainCapped('tommer', 1)) return; sfx.chop(); startSwing('oks'); say('+1 ' + iname('tommer')); return; }
          if (t === 'G') {
            if (S.axeLv < 2) { say(TX('FOR STOR. Du trenger en STÅLØKS.', 'TOO BIG. You need a STEEL AXE.')); deny(); return; }
            if (!spend(tool.e)) return; S.felled[rkey(S.map, f.x, f.y)] = S.day + 3; terrLater(); if (!gainCapped('tommer', 2)) return; sfx.chop(); startSwing('oks'); say('+2 ' + iname('tommer')); return;
          }
          say(TX('INGENTING Å FELLE.', 'NOTHING TO FELL.')); return;
        }
        if (tool.id === 'hakke') {
          if (t !== 'O' && t !== 'Q') { say(TX('INGEN ÅRE HER.', 'NO VEIN HERE.')); return; }
          if (!S.tools.hakke) { say(TX('DU HAR INGEN HAKKE.', 'YOU HAVE NO PICK.')); deny(); return; }
          if (t === 'Q' && S.pickLv < 2) { say(TX('RIK ÅRE. Trenger STÅLHAKKE.', 'RICH VEIN. Needs a STEEL PICK.')); deny(); return; }
          /* mine lvl1: the pick bites for less energy */
          const pickCost = Math.max(1, tool.e - (S.lvl.mine >= 1 ? 1 : 0));
          if (!spend(pickCost)) return;
          /* mine lvl2: a mined vein regrows a day sooner */
          const regrow = Math.max(1, 3 - (S.lvl.mine >= 2 ? 1 : 0));
          S.mined[rkey(S.map, f.x, f.y)] = S.day + regrow; terrLater(); sfx.mine();
          startSwing('hakke');
          if (!gainCapped('stein', 1)) return;
          addXp('mine', 1);
          /* The metal is the one the tile is drawn as, not a fresh roll. Same
             weights as the roll it replaces (55/30/15 on a vein, 60/40 on a
             rich one) so nothing about the economy moves — but a vein you can
             read is a vein you can choose, and a square you come back to
             after it regrows is the same square. */
          const ore = oreKind(rockVar(S.map, f.x, f.y), t === 'Q');
          swing.drop = BEK_ITEMS[ore].col;
          /* mine lvl3: one swing in four turns up an extra piece of ore */
          const oreQty = S.lvl.mine >= 3 && Math.random() < 0.25 ? 2 : 1;
          gainCapped(ore, oreQty);
          say('+' + oreQty + ' ' + iname(ore) + '  +1 ' + iname('stein')); return;
        }
        /* the soil tools */
        if (t !== 'f') { say(TX('IKKE HER.', 'NOT HERE.')); return; }
        const k = key(f.x, f.y);
        const c = S.soil[k] || (S.soil[k] = { till: 0, wet: 0, seed: '', age: 0, ready: 0 });
        if (c.ready) {
          const spec = BEK_CROPS[c.seed];
          if (!spend(1)) return;
          /* farm lvl3: a chance at a second head off the same plant */
          const qty = S.lvl.farm >= 3 && Math.random() < 0.4 ? 2 : 1;
          if (!gainCapped(spec.out, qty)) return;
          sfx.pick(); addXp('farm', 1);
          startSwing('hand').drop = spec.col;
          say('+' + qty + ' ' + iname(spec.out));
          if (spec.regrow) {
            /* farm lvl2: a regrowing crop is ready a day sooner */
            const regrow = Math.max(1, spec.regrow - (S.lvl.farm >= 2 ? 1 : 0));
            c.ready = 0; c.age = spec.days - regrow;
          } else { c.seed = ''; c.age = 0; c.ready = 0; }
          return;
        }
        /* farm lvl1: the spade and the kanne both bite for less energy */
        const soilCost = Math.max(1, tool.e - (S.lvl.farm >= 1 ? 1 : 0));
        if (tool.id === 'spade') { if (c.till) { say(TX('ALLEREDE SPADD.', 'ALREADY TURNED.')); return; } if (!spend(soilCost)) return; c.till = 1; sfx.till(); startSwing('spade'); return; }
        if (tool.id === 'kanne') {
          if (!c.seed) {
            /* holding the can at a tilled, empty square plants the sprinkler
               instead of watering nothing — see BEK_ITEMS.sprinkler */
            if (has('sprinkler') && !c.spr) {
              if (!spend(1)) return;
              add('sprinkler', -1); c.spr = 1; sfx.pick(); startSwing('hand');
              say(TX('SATTE OPP SPREDER.', 'PLACED SPRINKLER.'));
              return;
            }
            say(TX('INGENTING PLANTET.', 'NOTHING PLANTED.')); return;
          }
          if (c.wet) { say(TX('ALLEREDE VANNET.', 'ALREADY WATERED.')); return; }
          if (S.water <= 0) { say(TX('KANNEN ER TOM.', 'THE CAN IS EMPTY.')); deny(); return; }
          if (!spend(soilCost)) return;
          S.water--; c.wet = 1; sfx.water(); startSwing('kanne');
          if (S.kanneLv >= 1) waterLine(f);      /* tier 2: a 1x3 line, not one tile */
          return;
        }
      }
      function plant() {
        const f = facing();
        if (tileAt(S.map, f.x, f.y) !== 'f') { say(TX('IKKE JORD.', 'NOT SOIL.')); return; }
        const c = S.soil[key(f.x, f.y)];
        if (!c || !c.till) { say(TX('SPA DET FØRST.', 'TURN IT FIRST — HOE.')); return; }
        if (c.seed) { say(TX('ALLEREDE PLANTET.', 'ALREADY PLANTED.')); return; }
        const seed = curSeed();
        if (!seed) { say(TX('INGEN FRØ I SEKKEN.', 'NO SEED IN THE BAG.')); deny(); return; }
        const cropId = BEK_ITEMS[seed].seed;
        if (!cropInSeason(BEK_CROPS[cropId], S.day)) {
          say(TX('IKKE SESONGEN FOR DEN. JORDA VIL IKKE HA DEN NÅ.', 'WRONG SEASON. THE GROUND WILL NOT TAKE IT NOW.'));
          deny(); return;
        }
        if (!spend(1)) return;
        add(seed, -1); c.seed = cropId; c.age = 0; c.ready = 0; sfx.pick();
        startSwing('hand', 'sprout');
        say(TX('SÅDDE ', 'PLANTED ') + iname(seed));
      }
      /* ---- the pen -------------------------------------------------------
         One button, same as everything else act() resolves, reading the
         animal's own state to decide what pressing it means right now:
         collect what is ready, else feed it for the day, else pet it once.
         Affection is S.fr[a.id] — the same 0..5 counter and the same
         Math.min(5, ...) clamp every NPC's friendship already uses, raised
         here and by newDay()'s daily tick, never a second table. */
      function tendAnimal(a) {
        const spec = BEK_ANIMAL_KINDS[a.kind];
        if (a.ready) {
          const ids = Object.keys(spec.produce);
          if (!gainCapped(ids[0], spec.produce[ids[0]])) return;
          if (ids[1]) gainCapped(ids[1], spec.produce[ids[1]]);
          a.ready = 0; sfx.pick();
          say('+' + ids.map(id => spec.produce[id] + ' ' + iname(id)).join('  '));
          return;
        }
        if (!a.fed) {
          if (!has('dyrefor')) { say(TX('INGEN FOR I SEKKEN.', 'NO FEED IN THE BAG.')); deny(); return; }
          add('dyrefor', -1); a.fed = 1;
          S.fr[a.id] = Math.min(5, (S.fr[a.id] || 0) + 1);
          sfx.pick(); say(TX('MATET ', 'FED ') + T(spec.name));
          return;
        }
        if (!a.pet) {
          a.pet = 1; S.fr[a.id] = Math.min(5, (S.fr[a.id] || 0) + 1);
          sfx.talk(); say(T(spec.name) + TX(' NYTER KLAPP.', ' ENJOYS THE PETTING.'));
          return;
        }
        say(TX('DEN ER FORNØYD.', 'IT IS CONTENT.'));
      }
      /* the pen's own purchase path — shopBuy() routes here for any BEK_ITEMS
         entry that carries `animal` rather than adding it to the bag */
      function buyAnimal(id) {
        const spec = BEK_ITEMS[id];
        if (!S.flag.barn) { say(TX('IKKE PÅ LAGER ENNÅ.', 'NOT IN STOCK YET.')); deny(); return; }
        const slots = barnSlots(S);
        if (S.animals.length >= slots.length) { say(TX('INNHEGNINGEN ER FULL.', 'THE PEN IS FULL.')); deny(); return; }
        const p = price(id);
        if (S.kr < p) { say(TX('IKKE RÅD.', 'CANNOT AFFORD.')); deny(); return; }
        const slot = slots[S.animals.length];
        const aid = 'animal' + (S.animalSeq = S.animalSeq + 1);
        S.animals.push({ id: aid, kind: spec.animal, x: slot.x, y: slot.y, fed: 0, pet: 0, ready: 0 });
        S.fr[aid] = 0;
        S.kr -= p; sfx.coin(); say(TX('KJØPTE ', 'BOUGHT ') + iname(id));
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
        /* the repeatable board's own turn-in — same NPC-must-fulfill-it
           contract as the fixed quest above, checked second so a fixed and a
           repeatable quest for the same NPC never race: talk again to settle
           the other one */
        const rq = activeRepeatable(S, npc.id);
        if (rq) {
          add(rq.item, -rq.qty);
          rq.state = 'done'; S.kr += rq.kr;
          if (window.Economy) window.Economy.earn(Math.max(20, Math.round(rq.kr * 0.15)), 'BEKKEDAL: ' + questTitle(rq).en);
          sfx.coin();
          dlg = { lines: [{ no: npc.n + ': Takk. That is exactly it.', en: npc.n + ': Thanks. That is exactly it.' }, '+' + rq.kr + ' KR'], i: 0, npc: npc };
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
          /* a chat line may itself carry a `buy` (bag/kanne/plot upgrades):
             dlgAdvance() checks dlg.buy before dlg.menu, so an upgrade offer
             opens instead of the shop that line would otherwise open. Chat
             is filtered on `if` every visit, unlike a `nodes` entry (one-shot
             via S.seen), which is what lets the offer keep resurfacing until
             it is actually bought. */
          dlg = { lines: pick.t.slice(), i: 0, npc: npc, menu: 1, buy: pick.buy || null };
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
        if (S.kr < o.kr) { dlg = { lines: o.no.slice(), i: 0, npc: null }; mode = 'talk'; offer = null; deny(); return; }
        S.kr -= o.kr;
        if (o.tool) S.tools[o.tool] = 1;
        if (o.axeLv) S.axeLv = Math.max(S.axeLv, o.axeLv);
        if (o.pickLv) S.pickLv = Math.max(S.pickLv, o.pickLv);
        if (o.kanneLv) S.kanneLv = Math.max(S.kanneLv, o.kanneLv);
        if (o.waterMaxAdd) S.waterMax += o.waterMaxAdd;
        if (o.bagCapAdd) S.bagCap += o.bagCapAdd;
        if (o.bagTier) S.bagTier = Math.max(S.bagTier, o.bagTier);
        /* a flag-granting offer (the farm plot expansions) changes what
           tileAt() reads for the farm map, so the terrain cache must rebuild */
        if (o.flag) { Object.assign(S.flag, o.flag); terrDirty(); }
        sfx.coin();
        dlg = { lines: o.ok.slice(), i: 0, npc: null }; mode = 'talk'; offer = null;
      }

      /* ---- the lot, the house ------------------------------------------- */
      function lotSign() {
        if (S.built) { mode = 'end'; S.ending = 0; return; }
        if (S.q.tommer !== 'done') { dlg = { lines: [{no:'SKILT: TOMT TIL SALGS.',en:'SIGN: LOT FOR SALE.'}, {no:'Håkon in town holds the papers.',en:'Håkon in town holds the papers.'}], i: 0 }; mode = 'talk'; return; }
        if (!S.flag.lot) {
          if (S.kr < BEK_LOT_COST) { dlg = { lines: [{no:'SKILT: TOMT — 1200 KR.',en:'SIGN: LOT — 1200 KR.'}, {no:'You do not have it. Not yet.',en:'You do not have it. Not yet.'}], i: 0 }; mode = 'talk'; return; }
          S.kr -= BEK_LOT_COST; S.flag.lot = 1; sfx.coin();
          dlg = { lines: ['You sign it against the post.', {no:'The lot is yours: trees on three sides, water on the fourth.',en:'The lot is yours: trees on three sides, water on the fourth.'}, 'Now it needs a house. Go and see Håkon.'], i: 0 };
          mode = 'talk'; return;
        }
        dlg = { lines: [{no:'Your lot. Empty, for now.',en:'Your lot. Empty, for now.'}], i: 0 }; mode = 'talk';
      }
      function hakonBuild() {
        if (S.built) { hakonTilbygg(); return; }
        const c = houseCost(S);
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
      /* Act II: the one purchasable house upgrade tier — split out of
         hakonBuild() rather than folded into it, since it is a second,
         later gate on the same funnel (talking to Håkon always ends up
         here once the house stands) rather than a second copy of the same
         checks. Not offered before S.act2Unlocked: the house is standing
         (S.built) the moment hakonBuild() finishes above, but the milestone
         — and the content that reads it — waits for the ending to be seen. */
      function hakonTilbygg() {
        if (!houseTierAvailable(S)) {
          dlg = { lines: [S.houseTier ? { no: 'HÅKON: Tilbygget står. Ikke mer å legge til.', en: 'HÅKON: The annex stands. Nothing more to add.' }
                                       : 'HÅKON: It is standing. Go and live in it.'], i: 0 };
          mode = 'talk'; return;
        }
        const c = houseTierCost();
        if (S.kr < c.kr || !has('tommer', c.tommer) || !has('stein', c.stein)) {
          dlg = { lines: [{ no: 'HÅKON: Et tilbygg? ' + c.kr + ' KR, ' + c.tommer + ' TØMMER, ' + c.stein + ' STEIN.', en: 'HÅKON: An annex? ' + c.kr + ' KR, ' + c.tommer + ' TIMBER, ' + c.stein + ' STONE.' },
                          'HÅKON: Come back when you have it.'], i: 0 }; mode = 'talk'; return;
        }
        S.kr -= c.kr; add('tommer', -c.tommer); add('stein', -c.stein); S.houseTier = 1;
        S.fr.hakon = Math.min(5, S.fr.hakon + 1); sfx.done(); terrDirty();
        dlg = { lines: [{ no: 'HÅKON: Et rom til, mot vannet. Det er ferdig.', en: 'HÅKON: One more room, facing the water. It is finished.' }], i: 0 };
        mode = 'talk';
      }

      /* ---- shop --------------------------------------------------------- */
      function shopBuy() {
        const id = shop.list[shop.sel];
        if (id === 'jordbarfro' && !S.flag.jordbar) { say(TX('IKKE PÅ LAGER ENNÅ.', 'NOT IN STOCK YET.')); deny(); return; }
        if (id === 'rabarbrafro' && !S.flag.rabarbra) { say(TX('IKKE PÅ LAGER ENNÅ.', 'NOT IN STOCK YET.')); deny(); return; }
        if (BEK_ITEMS[id].animal) return buyAnimal(id);
        const p = price(id);
        if (S.kr < p) { say(TX('IKKE RÅD.', 'CANNOT AFFORD.')); deny(); return; }
        if (!gainCapped(id, 1)) return;
        S.kr -= p; sfx.coin(); say(TX('KJØPTE ', 'BOUGHT ') + iname(id));
      }
      function shopSell() {
        const ids = Object.keys(S.bag).filter(id => S.bag[id] > 0 && BEK_ITEMS[id].sell);
        const id = ids[shop.sel % Math.max(1, ids.length)];
        if (!id) { deny(); return; }
        S.kr += BEK_ITEMS[id].sell; add(id, -1); sfx.coin(); say(TX('SOLGTE ', 'SOLD ') + iname(id));
      }

      /* ---- crafting, at the chest ('K' on the farm map) ------------------
         The recipe lists (BEK_RECIPES) are static content; the chest and the
         bag are one combined stock to craft from, chest spent first — the
         chest is where a farmer stockpiles the raw materials, so ingredients
         sitting there should count exactly like ingredients carried. Output
         goes to the bag through the same soft cap every gathered item uses,
         and overflows to the chest (uncapped, like a gift) rather than being
         lost — crafting itself never fails once the ingredients are spent. */
      const stockOf = id => (S.chest[id] || 0) + (S.bag[id] || 0);
      const hasStock = (id, n) => stockOf(id) >= (n || 1);
      function spendStock(id, n) {
        const fromChest = Math.min(S.chest[id] || 0, n);
        if (fromChest) { S.chest[id] -= fromChest; if (S.chest[id] <= 0) delete S.chest[id]; }
        const rest = n - fromChest;
        if (rest) add(id, -rest);
      }
      function craftGain(id, n) {
        if (bagTotal() + n <= S.bagCap) { add(id, n); return; }
        S.chest[id] = (S.chest[id] || 0) + n;
      }
      function recipeUnlocked(r) {
        if (r.fr && (S.fr[r.fr.npc] || 0) < r.fr.min) return false;
        if (r.lvl && (S.lvl[r.lvl.kind] || 0) < r.lvl.min) return false;
        return true;
      }
      /* how many of a recipe the current combined stock can pay for right
         now — menus.js shows this so the panel reads as useful, not just a
         locked/unlocked list */
      function craftCount(r) {
        return Object.keys(r.need).reduce((m, id) => Math.min(m, Math.floor(stockOf(id) / r.need[id])), Infinity);
      }
      function openCraft() { craft = { side: 0, sel: 0 }; mode = 'craft'; sfx.talk(); }
      function doCraft() {
        const list = BEK_RECIPES[craft.side ? 'cook' : 'craft'];
        const r = list[craft.sel];
        if (!r) return;
        if (!recipeUnlocked(r)) { say(TX('OPPSKRIFTEN ER IKKE LÅST OPP ENNÅ.', 'RECIPE NOT UNLOCKED YET.')); deny(); return; }
        if (!Object.keys(r.need).every(id => hasStock(id, r.need[id]))) { say(TX('MANGLER RÅVARER.', 'MISSING INGREDIENTS.')); deny(); return; }
        Object.keys(r.need).forEach(id => spendStock(id, r.need[id]));
        craftGain(r.out, r.qty || 1);
        sfx.pick(); say('+' + (r.qty || 1) + ' ' + iname(r.out));
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
        if (S.en < 10) { say(TX('FOR SLITEN TIL Å GÅ.', 'TOO TIRED TO WALK.')); deny(); return; }
        S.en -= 10; S.min += 40;
        S.map = m; S.px = BEK_HOME[m][0]; S.py = BEK_HOME[m][1]; S.dir = 0;
        markDisc(m); mode = ''; travel = null; sfx.step(tileAt(S.map, S.px, S.py)); say(T(BEK_MAPS[m].title));
      }

      /* ---- input -------------------------------------------------------- */
      /* the one place Escape's "back out of the current menu" action lives,
         so fullscreen's own Escape fallback (above) stays in lockstep with
         every mode's keydown handler instead of duplicating each one */
      function closeMenu() {
        if (mode === 'talk' && dlg && !dlg.opts) { dlgAdvance(); return; }
        if (mode === 'offer') { offer = null; mode = ''; return; }
        if (mode === 'shop') { shop = null; mode = ''; return; }
        if (mode === 'craft') { craft = null; mode = ''; return; }
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
        if (mode === 'craft') {
          const len = Math.max(1, BEK_RECIPES[craft.side ? 'cook' : 'craft'].length);
          if (k === 'ArrowLeft' || k === 'a') { craft.side = 0; craft.sel = 0; }
          if (k === 'ArrowRight' || k === 'd') { craft.side = 1; craft.sel = 0; }
          if (k === 'w' || k === 'ArrowUp') craft.sel = (craft.sel + len - 1) % len;
          if (k === 's' || k === 'ArrowDown') craft.sel = (craft.sel + 1) % len;
          if (k === ' ' || k === 'Enter') doCraft();
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
        if (mode === 'quest') {
          if (k === 'w' || k === 'ArrowUp') qScroll = Math.max(0, qScroll - 1);
          if (k === 's' || k === 'ArrowDown') qScroll++;          /* clamped when drawn */
          if (k === 'i' || k === 'q' || k === 'Escape' || k === ' ') closeMenu();
          return;
        }
        if (mode === 'bag') { if (k === 'i' || k === 'q' || k === 'Escape' || k === ' ') closeMenu(); return; }
        if (mode === 'sleep') { if (k === ' ' || k === 'Enter') { mode = ''; if (S.map === 'lakehouse' && !S.flag.homed) { S.flag.homed = 1; mode = 'end'; S.ending = 0; if (window.Economy) window.Economy.earn(500, 'BEKKEDAL: THE HOUSE BY THE WATER'); } else newDay(false); } if (k === 'Escape') closeMenu(); return; }

        /* walking */
        if (k === ' ') {
          if (fish) fishTap();
          else if (swing) bufAct = true;           /* queued, not dropped */
          else act();
          return;
        }
        if (k === 'f') { plant(); return; }
        if (k === 'c') { cycleSeed(); return; }
        if (k === 'i') { mode = 'bag'; return; }
        if (k === 'q') { mode = 'quest'; qScroll = 0; return; }
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
          /* fish lvl2: one more slip is forgiven before the line breaks */
          fish.maxMiss = (r ? 2 : 3) + (S.lvl.fish >= 2 ? 1 : 0);
          fish.spd = r ? 2.7 : 1.15;
          /* fish lvl3: the catch window itself is wider — the drawn zone in
             menus.js reads these same fish.z0/z1, so the widened window is
             what the player sees as well as what tickFish/fishTap test */
          const widen = S.lvl.fish >= 3 ? 0.04 : 0;
          fish.z0 = Math.max(0, (r ? 0.455 : 0.34) - widen);
          fish.z1 = Math.min(1, (r ? 0.545 : 0.66) + widen);
          fish.t = r ? 7 : 6;
          sfx.cast(); return;
        }
        if (fish.phase === 'reel') {
          const inZone = fish.pos > fish.z0 && fish.pos < fish.z1;
          if (inZone) {
            fish.hits++; sfx.bite();
            if (fish.hits >= fish.need) {
              const sp = fishSpecies(fish.miss === 0, fish.rare);
              if (gainCapped(sp, 1)) {
                addXp('fish', fish.rare ? 5 : 3);
                say('+1 ' + iname(sp));
                if (fish.rare) { sfx.done(); say(TX('SJELDEN FANGST! +1 ', 'RARE CATCH! +1 ') + iname(sp)); } else sfx.catch_();
              }
              fish = null;
            }
          }
          else { fish.miss++; deny(); if (fish.miss >= fish.maxMiss) { say(TX('DEN SLAPP UNNA.', 'IT GOT AWAY.')); fish = null; } }
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
          mode = ''; dlg = null; shop = null; craft = null; fish = null; travel = null; offer = null;
          say(T(UI.loaded) + ' DAG ' + S.day + '.'); sfx.coin();
        } catch (e) { say(TX('LAGRINGEN ER ØDELAGT.', 'SAVE IS UNREADABLE.')); }
        cv.focus();
      });
      bLang.addEventListener('click', () => { BEK_LANG = BEK_LANG === 'en' ? 'bi' : 'en'; if (S) S.lang = BEK_LANG; refreshBar(); cv.focus(); });

      /* ---- walking, clock, fishing -------------------------------------- */
      function move(dt) {
        /* An action reads as committed if you cannot walk out of it. Direction
           keys are still latched into `keys`, so a turn taken during a swing
           happens the moment it ends. */
        if (swing) return;
        let dx = 0, dy = 0;
        if (keys.w || keys.ArrowUp) { dy = -1; S.dir = 1; }
        else if (keys.s || keys.ArrowDown) { dy = 1; S.dir = 0; }
        else if (keys.a || keys.ArrowLeft) { dx = -1; S.dir = 2; }
        else if (keys.d || keys.ArrowRight) { dx = 1; S.dir = 3; }
        if (!dx && !dy) { S.walk = 0; S.step = 0; return; }
        S.walk += dt; if (S.walk < 0.14) return; S.walk = 0; S.step = (S.step + 1) % 4;
        const nx = S.px + dx, ny = S.py + dy;
        const ex = (M().exits || []).filter(x => x.x === nx && x.y === ny)[0];
        if (ex) { if (ex.need && !gateOK(ex.need)) { say(T(ex.why)); deny(); return; } S.map = ex.to; S.px = ex.tx; S.py = ex.ty; markDisc(ex.to); say(T(BEK_MAPS[S.map].title)); return; }
        if (nx < 0 || ny < 0 || nx >= COLS() || ny >= ROWS()) return;
        if (solid(S.map, nx, ny)) return;
        if (npcsHere().some(n => n.x === nx && n.y === ny)) return;
        if (S.map === 'farm' && S.animals.some(a => a.x === nx && a.y === ny)) return;
        S.px = nx; S.py = ny;
        if (S.step % 2 === 0) sfx.step(tileAt(S.map, S.px, S.py));
        for (let i = S.drops.length - 1; i >= 0; i--) {
          const d = S.drops[i];
          if (d.map !== S.map || d.x !== S.px || d.y !== S.py) continue;
          /* forage lvl3: a walked-over drop occasionally doubles up */
          const qty = S.lvl.forage >= 3 && Math.random() < 0.3 ? 2 : 1;
          if (!gainCapped(d.item, qty)) continue;
          S.drops.splice(i, 1); sfx.pick(); addXp('forage', 1); say('+' + qty + ' ' + iname(d.item));
        }
      }
      function tickClock(dt) {
        if (mode === 'end') return;
        S.min += dt * 4;
        if (S.min >= 26 * 60) { newDay(true); return; }
      }
      /* Three phases off the frame loop's own dt, never a timer. The strike
         frame is where the effect lands, the camera kicks and the deferred
         repaint fires — so the tree comes down as the axe reaches it. */
      function tickSwing(dt) {
        if (shake > 0) shake = Math.max(0, shake - dt * 26);
        if (!swing) return;
        const S1 = TOOL_SWING[swing.kind] || TOOL_SWING.hand;
        swing.t += dt;
        if (!swing.fired && swing.t >= S1.wind) {
          swing.fired = true;
          terrFlush();
          shake = S1.nudge;
          if (swing.fx) {
            const d = [[0, 1], [0, -1], [-1, 0], [1, 0]][S.dir];
            fx.burst(swing.fx, swing.tx * BEK_T + BEK_T / 2, swing.ty * BEK_T + BEK_T / 2 + 4, d[0], d[1]);
          }
          if (swing.drop) fx.pickup(swing.drop, swing.tx * BEK_T + BEK_T / 2, swing.ty * BEK_T + BEK_T / 2);
          if (swing.then) swing.then();
        }
        if (swing.t >= swing.len) {
          swing = null;
          terrFlush();
          /* the buffered press fires the instant the hands are free */
          if (bufAct) { bufAct = false; if (!mode && !fish) act(); }
        }
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
      function ditherPat(col, strength, day) {
        /* Keyed by the target context and by the LUT as well as the colour: a
           pattern is made by the context that will fill with it, and the
           terrain cache fills with the same stipples the screen does — and a
           pattern baked at one hour is the wrong colour at the next. Only two
           LUTs are ever live (daylight and the current hour), and the cache is
           swept when the hour's changes, so sixty-four indices do not turn
           this into an unbounded pile of canvases.

           `day` asks for the pattern in daylight colours whatever the hour.
           That is for light *sources*: a fire is as bright at midnight as at
           noon, which is the entire reason for lighting it. */
        const tag = day ? 'day' : LUT_TAG;
        const k = (g.tag || 'screen') + '|' + tag + '|' + col + '|' + strength;
        if (ditherCache[k]) return ditherCache[k];
        const c = document.createElement('canvas'); c.width = BEK_DITHER_PX; c.height = BEK_DITHER_PX;
        const q = c.getContext('2d'); q.fillStyle = day ? DAY_CSS[col] : LUT_CSS[col];
        for (let j = 0; j < BEK_DITHER_CELL; j++) for (let i = 0; i < BEK_DITHER_CELL; i++)
          if (DITHER[j][i] < strength) q.fillRect(i * BEK_ART_SCALE, j * BEK_ART_SCALE, BEK_ART_SCALE, BEK_ART_SCALE);
        ditherCache[k] = g.createPattern(c, 'repeat'); return ditherCache[k];
      }
      /* drop every pattern baked against an hour that has passed */
      function sweepDither(live) {
        for (const k of Object.keys(ditherCache)) {
          const tag = k.split('|')[1];
          if (tag !== 'day' && tag !== live) delete ditherCache[k];
        }
      }
      function dither(col, strength) { const n = Math.max(0, Math.min(16, Math.round(strength))); if (n <= 0) return; g.fillStyle = ditherPat(col, n); g.fillRect(0, 0, BEK_W, BEK_H); }

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
      function wash(px, py, w, h, col, s, day) {
        if (s <= 0) return;
        native(() => { g.fillStyle = ditherPat(col, s > 16 ? 16 : s, day); g.fillRect(px, py, w, h); });
      }

      /* ---- ground: the first cached pass ---------------------------------
         Fills, and the patches that tint them. Nothing here reaches past its
         own tile, because every tile's ground is laid before any detail is.

         Every colour below is a step of a ramp in palette.js, addressed by
         name. The rule the ramps are built around — a decorative mark stays
         inside its surface's contrast band, and only a *feature* may break it
         — is declared there in MARKS / SHADOWS / FEATURES and asserted by
         palette_check.js, so the tables the art reads and the tables the
         check reads are the same tables. */
      function grassGround(x, y) {
        const px = x * BEK_T, py = y * BEK_T;
        native(() => { g.fillStyle = C(GRASS[2]); g.fillRect(px, py, BEK_T, BEK_T); });
        wash(px, py, BEK_T, BEK_T, DRY[1], pAmt(x, y, PATCH.DRY));      /* a corner gone to straw */
        wash(px, py, BEK_T, BEK_T, GRASS[3], pAmt(x, y, PATCH.LUSH));   /* a wetter, greener run  */
      }

      /* the floor of a room: boards, never grass */
      /* the floor of the gruva: it is a hole in a mountain, so it is gravel.
         Grass down here was reading as a lawn a hundred feet underground.
         Dark floor, lit rock walls — the other way round and the corridors
         disappear into the stone they are cut through. */
      function caveGround(x, y) {
        const px = x * BEK_T, py = y * BEK_T;
        native(() => { g.fillStyle = C(STO[0]); g.fillRect(px, py, BEK_T, BEK_T); });
        wash(px, py, BEK_T, BEK_T, CON[1], pAmt(x, y, PATCH.MOSS));     /* moss where the air moves */
        wash(px, py, BEK_T, BEK_T, WAT[1], pAmt(x, y, PATCH.DAMP));     /* and where the water does */
      }

      /* a worn trail: no directional art (the same glyph does every bend and
         junction on the map), so the detail stays scattered grit rather than
         implying a direction the tile can't back up */
      function pathGround(x, y) {
        const px = x * BEK_T, py = y * BEK_T;
        native(() => { g.fillStyle = C(SOI[2]); g.fillRect(px, py, BEK_T, BEK_T); });
        wash(px, py, BEK_T, BEK_T, SOI[1], pAmt(x, y, PATCH.WORN));     /* trodden hard */
        wash(px, py, BEK_T, BEK_T, DRY[1], pAmt(x, y, PATCH.DUST));     /* dry and dusty */
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
             invisible and this one does not need feathering. A flower is a
             declared feature: it is allowed out of the band precisely
             because it is one pixel and rare. */
          if (meadow && v.c3 < 3) {
            g.fillStyle = C(FLOWER[v.c0 % FLOWER.length]);
            g.fillRect(px + spot(v.x2, BEK_T, 1), py + spot(v.y3, BEK_T, 1), 1, 1);
          }
        });
      }

      function caveDetail(x, y) {
        const px = x * BEK_T, py = y * BEK_T;
        const v = groundVar(S.map, x, y);
        const vein = pLow(x, y, LOW.VEIN, 4, 4) === 0;
        native(() => {
          g.fillStyle = C(CAVE_GRIT[0]);
          g.fillRect(px + spot(v.x0, BEK_T, 6), py + spot(v.y0, BEK_T, 4), 6, 4);
          g.fillRect(px + spot(v.x1, BEK_T, 8), py + spot(v.y1, BEK_T, 4), 8, 4);
          g.fillStyle = C(CAVE_GRIT[3]);
          g.fillRect(px + spot(v.x2, BEK_T, 4), py + spot(v.y2, BEK_T, 2), 4, 2);
          g.fillRect(px + spot(v.x3, BEK_T, 2), py + spot(v.y3, BEK_T, 2), 2, 2);
          /* rare extras only, so the gravel stays sparse rather than static */
          if (v.c0 === 3) { g.fillStyle = C(CAVE_GRIT[2]); g.fillRect(px + spot(v.x3, BEK_T, 4), py + spot(v.y0, BEK_T, 4), 4, 4); }
          if (v.c1 === 4) { g.fillStyle = C(CAVE_GRIT[1]); g.fillRect(px + spot(v.x0, BEK_T, 3), py + spot(v.y2, BEK_T, 3), 3, 3); }
          if (vein && v.c2 < 2) { g.fillStyle = C(ORE_GLINT[2]); g.fillRect(px + spot(v.x1, BEK_T, 1), py + spot(v.y3, BEK_T, 1), 1, 1); }
        });
      }

      function pathDetail(x, y) {
        const px = x * BEK_T, py = y * BEK_T;
        const v = pathVar(S.map, x, y);
        native(() => {
          g.fillStyle = C(PATH_GRIT[0]);
          g.fillRect(px + spot(v.ax, BEK_T, 4), py + spot(v.ay, BEK_T, 2), 4, 2);
          g.fillRect(px + spot(v.bx, BEK_T, 4), py + spot(v.by, BEK_T, 2), 4, 2);
          g.fillStyle = C(PATH_GRIT[1]);
          g.fillRect(px + spot(v.cx, BEK_T, 4), py + spot(v.cy, BEK_T, 2), 4, 2);
          g.fillRect(px + spot(v.dx, BEK_T, 2), py + spot(v.dy, BEK_T, 2), 2, 2);
          g.fillStyle = C(PATH_CRACK);
          g.fillRect(px + spot(v.kx, BEK_T, 2), py + spot(v.ky, BEK_T, 1), 2, 1);   /* a crack in the hardpack */
          if (v.peb === 1) { g.fillStyle = C(PATH_GRIT[2]); g.fillRect(px + spot(v.px, BEK_T, 2), py + spot(v.py, BEK_T, 2), 2, 2); }
        });
      }

      /* The world's edge. What used to be a hard 4px black frame with a grey
         lip is now a vignette that dithers away into the wood, plus a pair of
         timber posts wherever the ring is open — see forest.js. */
      function edgeMark(px, py, x, y) {
        native(() => forest.edge(x, y, tileAt(S.map, x, y) !== 'T'));
      }

      /* ---- the animated tiles, drawn live over the cache ------------------ */
      /* The shore's whole profile lives in shore.js and is sampled along
         whichever direction autotile.js says the land lies, so one drawing
         serves a north shore, a south shore, a cove, a headland and a spit.
         See shore.js for why that is one drawing and not four rotations. */
      const waterArt = {
        fill: (col, px, py, w, h) => { g.fillStyle = C(col); g.fillRect(px, py, w, h); },
        /* the stipple, for callers that are *already* inside a native() block
           — `wash` opens one of its own and two nested would halve the scale
           twice, so shore.js gets this shape instead */
        wash: (px, py, w, h, col, str) => {
          if (str <= 0) return;
          g.fillStyle = ditherPat(col, str > 16 ? 16 : str); g.fillRect(px, py, w, h);
        },
        seam: i => seamVar(S.map, i),
        spot: spot,
        tileAt: (x, y) => tileAt(S.map, x, y),
        cols: COLS, rows: ROWS
      };
      const shore = createShore(waterArt);
      const water = createWater(waterArt);
      /* The mountain and what is in it. Everything the ore does — the recess
         it is bitten out of, the seam, the body, the faces, the traces that
         thicken in the wall as you get closer to one — is in rock.js, and so
         is `oreKind`, which `act()` below reads so the drop is the metal the
         tile was drawn as. */
      /* The inside of a house: boards laid across the room from world
         position, the shadow a wall casts on the floor, the wear that follows
         the traffic, and the rug. Where the *things* in a room stand is
         content and lives in BEK_DECOR (data.js); decor.js knows how to draw
         each kind. See interior.js. */
      const interior = createInterior({
        fill: (col, px, py, w, h) => { g.fillStyle = C(col); g.fillRect(px, py, w, h); },
        wash: (px, py, w, h, col, str) => {
          if (str <= 0) return;
          g.fillStyle = ditherPat(col, str > 16 ? 16 : str); g.fillRect(px, py, w, h);
        },
        tileAt: (x, y) => tileAt(S.map, x, y),
        salt: () => mapSalt(S.map),
        cols: COLS, rows: ROWS
      });
      /* what decor.js draws with — the same shape the other art modules take */
      const propArt = { fill: (col, px, py, w, h) => { g.fillStyle = C(col); g.fillRect(px, py, w, h); } };
      /* Chips, dust, spray and the item arcing into the bag. Transient, so
         it lives here rather than in `S`, steps on the frame loop's own dt
         and is cleared when the window goes. */
      const fx = createFx({ fill: (col, px, py, w, h) => { g.fillStyle = C(col); g.fillRect(px, py, w, h); } },
                          Math.random);

      /* the props on this map, indexed by square. Rebuilt with the cache. */
      let propMap = new Map();
      function propsPrepare() {
        propMap = new Map();
        (BEK_DECOR[S.map] || []).forEach(d => propMap.set(d.x + ',' + d.y, d));
        /* Act II: the house's own upgrade tier layers a few more things into
           the same room rather than swapping BEK_DECOR[S.map] for a second
           table — see BEK_DECOR.lakehouse_t2 (data.js). */
        if (S.map === 'lakehouse' && S.houseTier) (BEK_DECOR.lakehouse_t2 || []).forEach(d => propMap.set(d.x + ',' + d.y, d));
      }
      function drawProp(d, x, y, t) {
        const fn = PROP[d.kind];
        if (fn) native(() => fn(propArt, x * BEK_T, y * BEK_T, hLowV(x, y, mapSalt(S.map) + 4090, 1, 3), t));
      }

      /* The ring of trees around every outdoor map, as one continuous strip
         rather than seventy stamps of the same fir on a 40px cadence. See
         forest.js; the species mix is content, in BEK_TREES. */
      const forest = createForest({
        fill: (col, px, py, w, h) => { g.fillStyle = C(col); g.fillRect(px, py, w, h); },
        wash: (px, py, w, h, col, str) => {
          if (str <= 0) return;
          g.fillStyle = ditherPat(col, str > 16 ? 16 : str); g.fillRect(px, py, w, h);
        },
        tree: (i, layer) => treeVar(S.map, i, layer),
        tileAt: (x, y) => tileAt(S.map, x, y),
        map: () => S.map,
        snowy: () => snow_(),
        cols: COLS, rows: ROWS
      });

      const rock = createRock({
        fill: (col, px, py, w, h) => { g.fillStyle = C(col); g.fillRect(px, py, w, h); },
        wash: (px, py, w, h, col, str) => {
          if (str <= 0) return;
          g.fillStyle = ditherPat(col, str > 16 ? 16 : str); g.fillRect(px, py, w, h);
        },
        rockVar: (x, y) => rockVar(S.map, x, y),
        patch: (x, y, name) => pAmt(x, y, PATCH[name]),
        spot: spot,
        tileAt: (x, y) => tileAt(S.map, x, y),
        cols: COLS, rows: ROWS
      });

      /* deep water: the depth ramp is in the cache, and what is left per frame
         is two short ripple bands and the odd catch of light */
      function waterTile(x, y, t) {
        const px = x * BEK_T, py = y * BEK_T, w = Math.floor(t * 2 + x + y) % 4;
        const v = waterVar(S.map, x, y);
        native(() => {
          /* a deep tile that happens to touch land carries the surf, because
             on nine maps out of eleven that boundary is where the water ends */
          shore.live(x, y, t, v, -1);
          g.fillStyle = C(WATER_DEEP[0]);
          g.fillRect(px + spot(v.ax, BEK_T, 16), py + 6 + spot(v.ay, 28, 2) + w * 2, 16, 2);
          g.fillStyle = C(WATER_DEEP[1]);
          g.fillRect(px + spot(v.bx, BEK_T, 14), py + 6 + spot(v.by, 28, 2) - w * 2, 14, 2);
          if (v.foam === 0) { g.fillStyle = C(WATER_SUN[0]); g.fillRect(px + spot(v.bx, BEK_T, 8), py + spot(v.ay, BEK_T, 2), 8, 2); }
          if (v.glint === 3) { g.fillStyle = C(WATER_SUN[1]); g.fillRect(px + spot(v.ax, BEK_T, 4), py + 6 + spot(v.by, 28, 2) + w * 2, 4, 2); }
        });
      }

      function hearthTile(x, y, t) {
        const px = x * BEK_T_SRC, py = y * BEK_T_SRC, fl = Math.floor(t * 6) % 3;
        g.fillStyle = C(STO[3]); g.fillRect(px + 2, py + 2, 16, 16);
        g.fillStyle = C(ATMO[0]); g.fillRect(px + 5, py + 5, 10, 11);
        g.fillStyle = C(HEARTH[0]); g.fillRect(px + 7, py + 9, 6, 7);
        g.fillStyle = C(HEARTH[1]); g.fillRect(px + 8, py + 8 - fl, 4, 6 + fl);
        g.fillStyle = C(HEARTH[2]); g.fillRect(px + 9, py + 7 - fl, 2, 3);
        g.fillStyle = C(HEARTH[3]); g.fillRect(px + 9, py + 6 - fl, 1, 1);
      }

      /* ---- the three passes ------------------------------------------------
         `tileGround` fills a tile's ground and stops. `tileDetail` then runs
         over the whole map afterwards, so a mark is free to hang over into
         the next tile without that tile's ground painting it out a moment
         later — which is exactly what a single interleaved pass could not
         allow. Both feed the terrain cache and run only when the map, the
         day or the felled/mined/picked state changes. `tileLive` is what is
         left over: the three glyphs whose art reads the clock. */
      /* which dressing a building wears, whether we are indoors, whether the
         map is snowed on — all one table now, in surface.js, because
         palette_check has to read the same answers the art draws from */
      const ins_ = () => insideMap(S.map);
      const snow_ = () => snowy(S.map);
      const rim_ = (x, y) => !ins_() && (x === 0 || y === 0 || x === COLS() - 1 || y === ROWS() - 1);
      /* a tile that lays its own ground has no grass or boards under it */
      const ownGround = (c, x, y) => 'W~P.MOQHRDLfk '.indexOf(c) >= 0 || (c === 'T' && rim_(x, y));

      function tileGround(c, x, y) {
        const px = x * BEK_T_SRC, py = y * BEK_T_SRC;
        /* the dead margin outside a room's walls: not floor, not field, nothing */
        if (c === ' ') { g.fillStyle = C(0); g.fillRect(px, py, BEK_T_SRC, BEK_T_SRC); return; }
        if (c === 'T' && rim_(x, y)) { g.fillStyle = C(ATMO[0]); g.fillRect(px, py, BEK_T_SRC, BEK_T_SRC); return; }   /* the wall of wood is solid dark behind */
        /* Deep water takes its colour from how far it is from any land, so a
           lake has a middle. A shore tile is the whole rotated profile, and
           both of them are static: only the ripples and the surf are not. */
        /* a deep tile that touches land carries the shallows instead of the
           depth ramp, so the two halves of the waterline meet */
        if (c === 'W') { native(() => (shore.maskOf(x, y) ? shore.nearShore(x, y) : water.deep(x, y))); return; }
        if (c === '~') { native(() => shore.ground(x, y)); return; }
        if (c === '.') { pathGround(x, y); return; }
        if (c === 'M' || c === 'O' || c === 'Q') { native(() => rock.ground(c, x, y, snow_())); return; }
        /* the plain fills come straight out of surface.js, so the colour the
           check reasons about at the darkest hour is the colour that is
           actually on screen */
        if (c === 'P' || c === 'f' || c === 'L' || c === 'k') { g.fillStyle = C(groundOf(S.map, c)); g.fillRect(px, py, BEK_T_SRC, BEK_T_SRC); return; }
        if (c === 'H' || c === 'R' || c === 'D') { g.fillStyle = C(solidOf(S.map, c === 'R' ? 'H' : c)); g.fillRect(px, py, BEK_T_SRC, BEK_T_SRC); return; }
        if (ins_()) native(() => interior.floor(x, y)); else if (isCave(S.map)) caveGround(x, y); else grassGround(x, y);
      }

      function tileDetail(c, x, y) {
        const px = x * BEK_T_SRC, py = y * BEK_T_SRC;
        const ins = ins_(), snow = snow_(), rim = rim_(x, y);
        if (c === ' ' || c === 'W') return;                  /* nothing static of its own */
        if (c === '~') { native(() => shore.detail(x, y, edgeVar(S.map, x, y))); if (rim_(x, y)) edgeMark(px, py, x, y); return; }
        if (!ownGround(c, x, y)) {
          if (ins) native(() => interior.volume(x, y)); else if (isCave(S.map)) caveDetail(x, y); else grassDetail(x, y);
        }
        /* the land half of a waterline, on whichever edges face water */
        if (!ins && c !== 'W' && c !== '~') native(() => shore.bank(x, y));
        const o = objVar(c, S.map, x, y);
        if (c === 'P') {
          g.fillStyle = C(TIM[2]); for (let i = 0; i < BEK_T_SRC; i += 5) g.fillRect(px, py + i, BEK_T_SRC, 1);
          g.fillStyle = C(TIM[1]); g.fillRect(px + 2, py, 1, BEK_T_SRC); g.fillRect(px + 12, py, 1, BEK_T_SRC);
          return;
        }
        if (c === '.') { pathDetail(x, y); if (rim) edgeMark(px, py, x, y); return; }
        if (c === 'M' || c === 'O' || c === 'Q') { native(() => rock.detail(c, x, y, snow)); if (rim) edgeMark(px, py, x, y); return; }
        if (c === ',') {
          g.fillStyle = C(GRASS[3]);
          g.fillRect(px + spot(o.ax, BEK_T_SRC, 1), py + spot(o.ay, BEK_T_SRC, 8), 1, 8);
          g.fillRect(px + spot(o.bx, BEK_T_SRC, 1), py + spot(o.by, BEK_T_SRC, 10), 1, 10);
          g.fillRect(px + spot(o.cx, BEK_T_SRC, 1), py + spot(o.cy, BEK_T_SRC, 7), 1, 7);
          g.fillRect(px + spot(o.dx, BEK_T_SRC, 1), py + spot(o.dy, BEK_T_SRC, 9), 1, 9);
          g.fillStyle = C(BLADE[o.c]); g.fillRect(px + spot(o.bx, BEK_T_SRC, 1), py + spot(o.by, BEK_T_SRC, 10), 1, 2);
        }
        if (c === 'F') {
          /* Three heads on three stems. The stem is what stops a flower bed
             reading as three coloured pixels dropped on the grass: a 2x2 of
             an out-of-band colour with nothing under it is a defect, and the
             same 2x2 sitting on a dark green stalk is a flower. */
          const bloom = (sx, sy, col) => {
            const bx = px + spot(sx, BEK_T_SRC, 2), by = py + spot(sy, BEK_T_SRC, 5);
            g.fillStyle = C(GRASS[1]); g.fillRect(bx, by + 2, 1, 3);
            g.fillStyle = C(col); g.fillRect(bx, by, 2, 2);
          };
          bloom(o.ax, o.ay, FLOWER[o.ac]); bloom(o.bx, o.by, FLOWER[o.bc]); bloom(o.cx, o.cy, FLOWER[o.cc]);
        }
        if (c === 'p') {
          const h = 5 + o.h;
          const bx = px + spot(o.x, BEK_T_SRC, 5), by = py + spot(o.y, BEK_T_SRC, h + 4);
          g.fillStyle = C(GRASS[2]); g.fillRect(bx + 2, by + 4, 1, h);
          g.fillStyle = C(PICKABLE[o.c]); g.fillRect(bx, by, 5, 4);
          g.fillStyle = C(SNO[1]); g.fillRect(bx + 2, by + 1, 1, 1);
        }
        /* A dark fir is the same green as the grass it stands on, so without a
           black silhouette behind it a tree in a field is invisible. Draw the
           shape once in ink, one pixel proud, then the tree inside it. */
        /* A `T` on the ring belongs to the treeline strip, which is drawn
           over the whole band after this pass. Only the handful of firs that
           stand inside a map are still stamped per tile. */
        if (c === 'T') { if (!rim) native(() => forest.loneTree(c, x, y, o, snow)); }
        if (c === 'G' || c === 'Y') native(() => forest.loneTree(c, x, y, o, snow));
        if (c === '^') {
          g.fillStyle = C(STO[2]); g.fillRect(px + 3, py + 6, 14, 11);
          g.fillStyle = C(STO[3]); g.fillRect(px + 4 + spot(o.sx, 12, 8), py + 7 + spot(o.sy, 8, 5), 8, 5);
          g.fillStyle = C(ROCK_CRACK); g.fillRect(px + 4, py + 15, 12, 1);
          if (o.cap === 1) { g.fillStyle = C(CON[2]); g.fillRect(px + 4 + spot(o.mx, 12, 3), py + 7 + spot(o.my, 8, 2), 3, 2); }
        }
        if (c === '=') { g.fillStyle = C(TIM[2]); g.fillRect(px, py + 8, BEK_T_SRC, 3); g.fillRect(px + 8, py + 4, 3, 14); g.fillStyle = C(TIM[4]); g.fillRect(px, py + 8, BEK_T_SRC, 1); }
        if (c === 'x') { g.fillStyle = C(TIM[2]); g.fillRect(px, py + 3, BEK_T_SRC, 14); g.fillStyle = C(TIM[1]); for (let i = 0; i < BEK_T_SRC; i += 4) g.fillRect(px + i, py + 3, 1, 14); }
        if (c === 'H') {
          /* not every course of logs has a window cut in it */
          const win = o.win < 2;
          if (ins) {
            native(() => interior.wall(x, y, o, win));
          } else if (rustic(S.map)) {
            g.fillStyle = C(TIM[3]); g.fillRect(px, py + 6, BEK_T_SRC, 1); g.fillRect(px, py + 13, BEK_T_SRC, 1); g.fillRect(px, py + 18, BEK_T_SRC, 2);   /* laft: stacked logs */
            g.fillStyle = C(TIM[0]); g.fillRect(px, py, 1, BEK_T_SRC); g.fillRect(px + BEK_T_SRC - 1, py, 1, BEK_T_SRC);
            if (win) { g.fillStyle = C(WAT[3]); g.fillRect(px + 5, py + 4, 9, 8);
              g.fillStyle = C(SNO[0]); g.fillRect(px + 5, py + 4, 9, 1); g.fillRect(px + 9, py + 4, 1, 8); }
            else { g.fillStyle = C(TIM[0]); g.fillRect(px + spot(o.kx, BEK_T_SRC, 2), py + spot(o.ky, BEK_T_SRC, 2), 2, 2); }   /* a knot in a log */
          } else {
            g.fillStyle = C(WAR[2]); g.fillRect(px, py + 4, BEK_T_SRC, 1); g.fillRect(px, py + 12, BEK_T_SRC, 1);             /* painted board */
            g.fillStyle = C(TIM[1]); g.fillRect(px, py + 18, BEK_T_SRC, 2);
            if (win) { g.fillStyle = C(WAT[3]); g.fillRect(px + 5, py + 5, 9, 8);
              g.fillStyle = C(SNO[1]); g.fillRect(px + 4, py + 4, 11, 1); g.fillRect(px + 9, py + 5, 1, 8); }
          }
        }
        if (c === 'R') {
          if (rustic(S.map)) {
            g.fillStyle = C(GRASS[1]); g.fillRect(px, py, BEK_T_SRC, 13);                     /* torvtak: turf */
            g.fillStyle = C(TURF_ROOF[0]);
            g.fillRect(px + spot(o.ax, BEK_T_SRC, 2), py + spot(o.ay, 12, 1), 2, 1);
            g.fillRect(px + spot(o.bx, BEK_T_SRC, 2), py + spot(o.by, 12, 1), 2, 1);
            g.fillStyle = C(TURF_ROOF[1]);
            g.fillRect(px + spot(o.cx, BEK_T_SRC, 2), py + spot(o.cy, 12, 1), 2, 1);
            g.fillStyle = C(TURF_ROOF[2]); g.fillRect(px + spot(o.fx, BEK_T_SRC, 1), py + spot(o.fy, 12, 1), 1, 1);
            g.fillStyle = C(TIM[1]); g.fillRect(px, py + 13, BEK_T_SRC, 2);
          } else {
            g.fillStyle = C(WAR[1]); g.fillRect(px, py + 4, BEK_T_SRC, 3); g.fillRect(px, py + 12, BEK_T_SRC, 3);
            g.fillStyle = C(TIM[1]); g.fillRect(px, py + 18, BEK_T_SRC, 2);
          }
        }
        if (c === 'D') { g.fillStyle = C(TIM[2]); g.fillRect(px + 4, py + 3, 12, 17); g.fillStyle = C(TIM[1]); g.fillRect(px + 4, py + 3, 12, 1); g.fillRect(px + 9, py + 3, 1, 17); g.fillStyle = C(WAR[4]); g.fillRect(px + 12, py + 11, 2, 2); }
        if (c === 'o') { g.fillStyle = C(STO[4]); g.fillRect(px + 3, py + 8, 14, 10); g.fillStyle = C(STO[2]); g.fillRect(px + 3, py + 16, 14, 2); g.fillStyle = C(WAT[2]); g.fillRect(px + 5, py + 10, 10, 5); g.fillStyle = C(WAT[4]); g.fillRect(px + 6, py + 11, 3, 1); g.fillStyle = C(TIM[2]); g.fillRect(px + 3, py + 2, 14, 3); g.fillRect(px + 4, py + 2, 2, 8); g.fillRect(px + 14, py + 2, 2, 8); }
        if (c === 'S') { g.fillStyle = C(TIM[2]); g.fillRect(px + 9, py + 8, 3, 11); g.fillStyle = C(SAN[1]); g.fillRect(px + 2, py + 2, 17, 8); g.fillStyle = C(TIM[0]); g.fillRect(px + 4, py + 4, 13, 1); g.fillRect(px + 4, py + 7, 9, 1); }
        if (c === 'K') { g.fillStyle = C(TIM[1]); g.fillRect(px + 2, py + 9, 16, 9); g.fillStyle = C(TIM[3]); g.fillRect(px + 2, py + 5, 16, 5); g.fillStyle = C(TIM[0]); g.fillRect(px + 2, py + 9, 16, 1); g.fillStyle = C(WAR[1]); g.fillRect(px + 9, py + 8, 2, 5); }
        if (c === 'L') { g.fillStyle = C(TIM[3]); g.fillRect(px, py, BEK_T_SRC, 1); g.fillRect(px, py, 1, BEK_T_SRC); }
        if (c === 'f') { g.fillStyle = C(SOI[1]); g.fillRect(px, py + 19, BEK_T_SRC, 1); g.fillRect(px + 19, py, 1, BEK_T_SRC); }
        if (c === 'k') { g.fillStyle = C(DRY[2]); g.fillRect(px, py + 19, BEK_T_SRC, 1); g.fillRect(px + 19, py, 1, BEK_T_SRC); }
        /* ---- indoors, and the benches ----------------------------------
           The rug and the five pieces of furniture live in interior.js and
           draw at native density; this is the last of the glyph ladder that
           still had them. */
        if (c === 'z') { native(() => interior.rug(x, y)); }
        else if ('nuJcb'.indexOf(c) >= 0) native(() => furniture(propArt, c, x, y));
        /* A prop stands on whatever tile the content table put it on, drawn
           after that tile's own art and before the actors — so the player
           passes in front of the boots by the door rather than under them.
           The animated kinds are not here; they are redrawn per frame. */
        const prp = propMap.get(x + ',' + y);
        if (prp && !PROP_LIVE[prp.kind] && LIVE.indexOf(c) < 0) drawProp(prp, x, y, 0);
        if (rim) edgeMark(px, py, x, y);
      }

      function tileLive(c, x, y, t) {
        if (c === 'W') { waterTile(x, y, t); if (rim_(x, y)) edgeMark(x * BEK_T_SRC, y * BEK_T_SRC, x, y); return; }
        if (c === '~') { native(() => shore.live(x, y, t, edgeVar(S.map, x, y))); if (rim_(x, y)) edgeMark(x * BEK_T_SRC, y * BEK_T_SRC, x, y); return; }
        if (c === 'O' || c === 'Q') { native(() => rock.live(c, x, y, t)); return; }
        if (c === 'v') hearthTile(x, y, t);                                  /* the hearth, alight */
        /* A prop standing on a tile that is itself redrawn every frame has to
           be redrawn with it, or the tile paints over it — which is how the
           kettle spent its first afternoon invisible behind the fire. */
        const lp = propMap.get(x + ',' + y);
        if (lp) drawProp(lp, x, y, t);
      }
      /* the glyphs whose art reads the clock: water, the hearth, and the
         catch of light travelling across a crystal face */
      const LIVE = 'W~vOQ';

      /* ---- the terrain cache ----------------------------------------------
         The two passes above used to be one function run for every tile on
         the map every single frame, which is what kept the per-tile detail
         budget down to a handful of rects. They now render into an offscreen
         canvas the size of the map and the frame blits that, so the cost of
         a tile's detail is paid when the map changes rather than sixty times
         a second — and the ground can afford to be interesting. The key is
         everything the static passes read: which map, how big it is, which
         day (felled/mined/picked all expire against S.day), whether the
         house is up, a counter bumped by every mutation to those three
         tables, and — see `regionOf` below — which part of the map this
         rebuild is responsible for.
         `terrLive` is the list the frame still has to draw itself. */
      const terrCv = document.createElement('canvas');
      /* Sized to the *current* map, not to one fixed world: `terrain()` sets
         it before every rebuild, so walking from a 24x15 map onto a bigger
         one grows the cache with it. The dimensions are part of the cache key
         as well, which costs a few characters and means a map whose rows
         changed under us can never be blitted out of a canvas cut for the old
         size. Setting .width/.height resets the context — harmless here,
         since the rebuild lays down its own transform and clears first — but
         it does drop `tag`, so that is reapplied with the size. */
      terrCv.width = BEK_W; terrCv.height = BEK_H;
      const terrG = terrCv.getContext('2d');
      if (terrG) terrG.tag = 'terrain';
      let terrKey = '', terrLive = [], terrHearths = [];
      let terrBump = 0;
      /* `act()` mutating state immediately is the safe design: nothing can
         double-resolve, the player cannot walk away mid-swing, and autoSave
         can never catch a half-applied action. Keep it. The only artefact was
         the terrain cache repainting the felled tree before the axe landed —
         so the *repaint* is what gets deferred, not the state change.

         `terrLater()` arms it; the strike frame fires it. Anything that calls
         `terrDirty()` directly in the meantime still takes effect at once and
         clears the arming, so a second source of change is never swallowed by
         a swing that happens to be in flight. */
      let terrPending = false;
      const terrDirty = () => { terrBump++; terrPending = false; };
      const terrLater = () => { terrPending = true; };
      const terrFlush = () => { if (terrPending) terrDirty(); };

      /* ---- the hour ------------------------------------------------------
         `st0` is the light outside; `st` is what this map actually sits in —
         a room is sheltered halfway back toward daylight, and the gruva is a
         hole in a mountain and has no hour at all. `dark` is how hard the
         fires burn, and it comes off the *unsheltered* state on purpose: a
         hearth is bright because the valley is dark, not because the room is.
         Everything here is a pure function of S.map and S.min, so the cache
         and the frame can both ask and get the same answer. */
      function lighting() {
        const cave = isCave(S.map), ins = ins_();
        const st0 = cave ? CAVE_LIGHT : lightAt(S.min);
        const st = ins ? shelter(st0, 0.5) : st0;
        return { st: st, tag: keyOf(st), dark: Math.max(0, Math.min(1, 1 - st0.k)),
                 key: (cave ? 'cave' : keyOf(st0)) + (ins ? '|in' : '') };
      }

      /* ---- local light ---------------------------------------------------
         The lighting curve is what makes night comfortable; this is what
         makes it inviting, and they are different things.

         The pool itself lives in `lamp.js` and is an ordered dither between
         the picture at this hour and the picture in daylight — read that file
         before changing anything here. A source no longer paints the ground
         warm; it resolves the ground toward the colours daylight would have
         given it. At full strength that is the daylight picture, so full
         strength is maximum legibility rather than none, and two sources over
         one pixel compose as a maximum instead of stacking toward opaque.

         Static sources are painted into the terrain cache, because the light
         key is already part of the cache key — so a lit window costs nothing
         per frame. Only what moves or flickers is redrawn live.

         What is left in this file is the warm veil that goes *over* a pool.
         The old two-pass structure took its colour temperature from painting
         the rim in a deeper entry than the core; with the core no longer
         painted at all, the temperature has to come from somewhere, and a
         fire's light does have to read as amber or it reads as a hole in a
         blue valley. The stipple is taken in *daylight* colours (`ditherPat`'s
         `day` flag): a fire is as bright at midnight as at noon, which is the
         whole reason for lighting one.

         Thin is the specification, and `VEIL` is the number that says so: at
         two sixteenths this is a cast over the picture and not a lid on it,
         and it is the one part of the light pass that is still paint. Two of
         16 is also exactly the strength `glow` drops, which is what gives the
         ring its outer edge — `jitter` carries a cell over the line or not,
         so the veil *dissolves* over the last third of its reach instead of
         stopping on a contour. Do not raise it looking for a brighter light.
         A stronger stipple with no pool under it is the spray of loose orange
         squares over the grass that the falloff in `lamp.js` is shaped to
         avoid, and it would put paint back over the picture at the one place
         this whole rework exists to clear. Raise the source's peak instead,
         which brightens by revealing rather than by covering. */
      const GLOW_HALO = 1.35;
      /* The veil fades out with the hour on its own account. It is paint, and
         paint does not know that the pool under it has converged on the hour's
         own palette and stopped showing — so without this a lit window keeps a
         ring of orange stipple around it at eight in the morning. `glow` drops
         anything under strength 2, so the fade is to nothing rather than to a
         sparse speckle, which is the failure mode to avoid here. */
      const VEIL = 2, VEIL_HOLE = 0.7, VEIL_DARK = 0.35;
      const veilPeak = dark => VEIL * Math.min(1, dark / VEIL_DARK);
      /* One native() for the whole veil, not one per cell. `wash` opens its
         own, and a pool is several hundred cells — that was several hundred
         save/scale/restore triples per source and most of the rebuild. */
      function veil(sources, dark) {
        const peak = veilPeak(dark);
        if (peak < 2) return 0;
        let n = 0;
        native(() => {
          for (let i = 0; i < sources.length; i++) {
            const sc = sources[i], hole = sc.r * VEIL_HOLE, h2 = hole * hole;
            glow((gx, gy, w, h, sN) => {
              /* Hollow, and this is the point of the whole shape. In the
                 middle of a pool the warmth is already in the palette the
                 pixels were resolved to, and a stipple there is paint over
                 the one place the picture most needs to be legible — the
                 mine floor under the lamp is exactly what the report was
                 about. Out at the fringe the coverage is low, so most pixels
                 there are still the hour's and the warmth has nowhere else
                 to come from. Same y-squash as `glow`'s, or the ring would
                 not sit inside the pool it belongs to. */
              const dx = gx + w / 2 - sc.px, dy = (gy + h / 2 - sc.py) * 1.15;
              if (dx * dx + dy * dy < h2) return;
              g.fillStyle = ditherPat(WAR[2], sN, true); g.fillRect(gx, gy, w, h); n++;
            }, sc.px, sc.py, sc.r * GLOW_HALO, peak);
          }
        });
        return n;
      }
      /* One field per canvas the pass runs on: the map-sized terrain cache,
         and the screen, which is the only place a light that walks can be
         applied after the things it ought to be lighting are on it. */
      /* `createLamp` sizes its strength field at construction, so the
         map-sized one is built per size rather than once — one live instance,
         rebuilt only when you walk onto a map of a different shape. The
         screen-sized one never changes, because the canvas never does. */
      let lampT = null, lampTW = 0, lampTH = 0;
      const lampFor = (w, h) => {
        if (!lampT || lampTW !== w || lampTH !== h) {
          lampT = createLamp(w, h, DITHER, BEK_DITHER_PX); lampTW = w; lampTH = h;
        }
        return lampT;
      };
      const lampV = createLamp(BEK_W, BEK_H, DITHER, BEK_DITHER_PX);
      const VIEW_RECT = { x: BEK_VIEW_X, y: BEK_VIEW_Y, w: BEK_VIEW_W, h: BEK_VIEW_H };
      const LANTERN_R = 2.4 * BEK_T, LANTERN_PEAK = 15;

      /* ---- the moon ------------------------------------------------------
         One cool key light, from above and a little to the left, put on as a
         two-pixel rim along the top of anything solid and a one-pixel lick
         down its left side. It costs a wash per solid tile in a pass that is
         cached, and it is what stops a night reading as one flat sheet of
         dark: without it every silhouette has the same value all the way
         round and the scene has no direction in it at all.

         Drawn through the hour's own table rather than in daylight, because
         moonlight is the ambient — it is not a lamp somebody lit. */
      function moonKey(dark, R) {
        /* and not indoors. There is no moon in a room, and a rim light along
           the top of every wall from inside reads as a dotted line ruled
           around the picture rather than as anything lighting anything. */
        if (dark < 0.25 || ins_()) return;
        const top = Math.round(5 * dark), side = Math.round(2.5 * dark);
        if (top < 2) return;
        native(() => moonRim(top, side, R));
      }
      function moonRim(top, side, R) {
        const put = (px, py, w, h, str) => {
          if (str <= 0) return;
          g.fillStyle = ditherPat(SNO[1], str > 16 ? 16 : str); g.fillRect(px, py, w, h);
        };
        for (let y = R.y0; y < R.y1; y++) for (let x = R.x0; x < R.x1; x++) {
          const c = tileAt(S.map, x, y);
          if (c === ' ' || c === 'W' || c === '~' || BEK_SOLID.indexOf(c) < 0) continue;
          /* Never on the border ring. A whole row of it lit at one strength
             is not moonlight, it is a dotted line ruled across the picture —
             and the border is a wall of the same glyph all the way along, so
             that is exactly what it would be. */
          if (rim_(x, y)) continue;
          /* and one step of jitter per tile off a channel that is already
             declared and tested, so a long run of wall does not come out as
             one drawn edge either. groundVar is free here: the tiles this
             touches are solid, so nothing else on them reads from it. */
          const j = groundVar(S.map, x, y).c1 & 1;
          const px = x * BEK_T, py = y * BEK_T;
          if (BEK_SOLID.indexOf(tileAt(S.map, x, y - 1)) < 0) put(px, py, BEK_T, 2 * BEK_ART_SCALE, top - j);
          if (BEK_SOLID.indexOf(tileAt(S.map, x - 1, y)) < 0) put(px, py, BEK_ART_SCALE, BEK_T, side - j);
        }
      }

      /* Which tiles are giving light, found once while the map is being
         rasterised rather than searched for every frame. A window only counts
         if it has somewhere to spill: a wall with another wall in front of it
         is lighting the inside of a wall. */
      /* A peak is no longer "how much orange to put down" but "how much of the
         daylight picture to resolve to", so the numbers all went up and the
         scaling got gentler: even at dusk a lit window is properly lit, it is
         just that at dusk the two palettes are close together and there is
         very little for the pool to reveal. That is the falloff doing the
         work the old `* dark` had to do by hand. */
      const litPeak = (P, dark) => Math.round(P * (0.62 + 0.38 * dark));
      /* Bounded to the rebuild's own region, widened by the furthest a pool
         reaches (LIGHT_REACH tiles) so a hearth just outside it still lights
         the floor just inside. */
      const LIGHT_REACH = 3;
      function lightSources(dark, R) {
        const out = [];
        if (dark <= 0.02) return out;
        const ins = ins_();
        const at = (x, y, dy, r, peak, hearth) =>
          out.push({ px: (x + 0.5) * BEK_T, py: (y + dy) * BEK_T, r: r, peak: peak, hearth: hearth });
        const cols = COLS(), rows = ROWS();
        const y0 = Math.max(0, R.y0 - LIGHT_REACH), y1 = Math.min(rows, R.y1 + LIGHT_REACH);
        const x0 = Math.max(0, R.x0 - LIGHT_REACH), x1 = Math.min(cols, R.x1 + LIGHT_REACH);
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
          const c = tileAt(S.map, x, y);
          if (c === 'v') { at(x, y, 0.1, 2.7 * BEK_T, litPeak(16, dark), 1); continue; }
          const dp = propMap.get(x + ',' + y);
          if (dp && PROP_LIGHTS[dp.kind]) {
            const L2 = PROP_LIGHTS[dp.kind];
            at(x, y, 0.5, L2.r * BEK_T, litPeak(L2.peak, dark));
          }
          if (c !== 'H') continue;
          if (objVar('H', S.map, x, y).win >= 2) continue;            /* no window in this course */
          /* A window that is drawn is a window that lights. If the wall
             carries on below it the pool falls on the wall face, which is
             what a lit window actually does to the boards under it. Only the
             dead margin outside a room gets nothing, because there is
             nothing out there to light. */
          if (tileAt(S.map, x, y + 1) === ' ') continue;
          at(x, y, 0.9, (ins ? 1.5 : 1.9) * BEK_T, litPeak(ins ? 11 : 13, dark));
        }
        return out;
      }

      /* rebuild cost, so the numbers in the docs are measured and not guessed */
      /* Split three ways, because "the rebuild got slower" is not a finding
         and "the detail pass got slower" is. */
      const perf = { rects: 0, lit: 0, pool: 0, veil: 0, ms: 0, ground: 0, detail: 0, forest: 0, light: 0, rebuilds: 0, key: '' };
      const now = () => (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
      /* ---- what one rebuild covers ---------------------------------------
         A map used to be one screen wide and a screen and a bit tall, so
         rasterising all of it was 6-15ms and the cache never had to know
         where the camera was. It is proportional to area, though, and a
         48x30 map is four times the area: measured 42-50ms warm here,
         against a 30ms budget — a dropped frame every time the light key
         turns over, which at dusk is about ten times in four seconds.

         So a rebuild covers the tiles the camera can see plus a margin,
         snapped outward to a whole number of REGION_SNAP tiles. The snap is
         what stops a step from being a rebuild: the region only turns over
         when the camera leaves it, which is every REGION_SNAP tiles at
         worst, rather than every tile. Outside the region the cache holds
         whatever the last rebuild that reached there left, and that is safe
         because the region always contains the viewport — stale pixels are
         never on screen.

         Every map that fits inside viewport-plus-margin resolves to its
         whole self, so all eleven shipped maps rebuild exactly what they
         always did, in the same order, and the region drops out of the key
         as a constant. That is what keeps this refactor a no-op.

         The camera the region is measured from is the clamped one *without*
         the strike-frame shake: three pixels of jolt must not be able to
         flip a tile boundary and cost a rebuild. */
      const REGION_MARGIN = 4, REGION_SNAP = 4;
      function regionOf(cols, rows) {
        const cx = track(S.px, BEK_VIEW_W, camMaxX(S.map));
        const cy = track(S.py, BEK_VIEW_H, camMaxY(S.map));
        const vx = Math.floor(cx / BEK_T), vy = Math.floor(cy / BEK_T);
        const vw = Math.ceil(BEK_VIEW_W / BEK_T) + 1, vh = Math.ceil(BEK_VIEW_H / BEK_T) + 1;
        const lo = v => Math.max(0, Math.floor((v - REGION_MARGIN) / REGION_SNAP) * REGION_SNAP);
        const hi = (v, n) => Math.min(n, Math.ceil((v + REGION_MARGIN) / REGION_SNAP) * REGION_SNAP);
        return { x0: lo(vx), y0: lo(vy), x1: hi(vx + vw, cols), y1: hi(vy + vh, rows) };
      }

      function terrain() {
        const L = lighting();
        const cols = COLS(), rows = ROWS(), mw = cols * BEK_T, mh = rows * BEK_T;
        const R = regionOf(cols, rows);
        /* Everything the two static passes read, plus how big the map is and
           which part of it this rebuild is responsible for. */
        const kMap = S.map + '|' + cols + 'x' + rows + '|' + S.day + '|' + (S.built ? 1 : 0) + '|' + terrBump + '|' + L.key;
        const k = kMap + '|' + R.x0 + ',' + R.y0 + ',' + R.x1 + ',' + R.y1;
        if (k === terrKey) return terrCv;
        terrKey = k; terrLive = []; terrHearths = [];
        const t0 = now();
        let rects = 0;
        const prev = g;
        if (terrCv.width !== mw || terrCv.height !== mh) {
          terrCv.width = mw; terrCv.height = mh;
          if (terrG) terrG.tag = 'terrain';
        }
        /* The skirt: one tile past the region on every side, clamped to the
           map. A detail is allowed to hang over into the next tile, so the
           tiles just outside the region have to be laid down too or the
           region's own border loses what should have reached into it. */
        const sx0 = Math.max(0, R.x0 - 1), sx1 = Math.min(cols, R.x1 + 1);
        const sy0 = Math.max(0, R.y0 - 1), sy1 = Math.min(rows, R.y1 + 1);
        g = terrG;
        try {
          g.setTransform(1, 0, 0, 1, 0, 0);
          g.fillStyle = C(0); g.fillRect(R.x0 * BEK_T, R.y0 * BEK_T, (R.x1 - R.x0) * BEK_T, (R.y1 - R.y0) * BEK_T);
          /* The distance fields, the boards and the wear are whole-map and
             know nothing about the region, so they are keyed without it —
             walking across a big map must not relay every floorboard. */
          shore.prepare(kMap); water.prepare(kMap); rock.prepare(kMap); interior.prepare(kMap);
          forest.prepare(kMap); propsPrepare();
          g.save(); g.scale(BEK_ART_SCALE, BEK_ART_SCALE);
          const tA = now();
          for (let y = sy0; y < sy1; y++) for (let x = sx0; x < sx1; x++) tileGround(tileAt(S.map, x, y), x, y);
          const tB = now();
          for (let y = sy0; y < sy1; y++) for (let x = sx0; x < sx1; x++) {
            const c = tileAt(S.map, x, y);
            tileDetail(c, x, y);
            /* the live list is the region's, not the skirt's: a tile outside
               the region is outside the viewport and has nothing to animate
               at */
            if (LIVE.indexOf(c) >= 0 && x >= R.x0 && x < R.x1 && y >= R.y0 && y < R.y1) terrLive.push(x, y);
          }
          const tC = now();
          perf.ground = tB - tA; perf.detail = tC - tB;
          const tD = now();
          if (!ins_()) native(() => forest.draw(snow_(), R));
          perf.forest = now() - tD;
          moonKey(L.dark, R);
          /* The pool resolves what is already on the canvas, so it has to run
             after everything static is on it — and the warm veil has to run
             after the pool, or the pool would resolve the warmth straight back
             out of the pixels it had just been painted onto.

             It is clipped to the region for a reason beyond cost: the
             transform it applies is affine on the pixels it finds, so running
             it twice over the same pixels would resolve them twice. Outside
             the region those pixels are a previous rebuild's, already
             resolved. */
          const srcs = lightSources(L.dark, R);
          if (srcs.length) {
            const tP = now();
            const clip = { x: R.x0 * BEK_T, y: R.y0 * BEK_T, w: (R.x1 - R.x0) * BEK_T, h: (R.y1 - R.y0) * BEK_T };
            perf.lit = lampFor(mw, mh).apply(terrG, srcs, L.st, lampState(L.st, L.dark), clip);
            const tQ = now();
            rects += veil(srcs, L.dark);
            perf.pool = tQ - tP; perf.veil = now() - tQ;
            for (let i = 0; i < srcs.length; i++)
              if (srcs[i].hearth) terrHearths.push(srcs[i].px, srcs[i].py);
          } else { perf.lit = 0; perf.pool = 0; perf.veil = 0; }
          /* Light does not spill into the void. The margin outside a room's
             walls is deliberate dead black and a warm pool creeping out over
             it reads as the room leaking, so it is painted back afterwards
             rather than the glow being clipped to a shape. */
          for (let y = R.y0; y < R.y1; y++) for (let x = R.x0; x < R.x1; x++) {
            if (tileAt(S.map, x, y) !== ' ') continue;
            g.fillStyle = C(0); g.fillRect(x * BEK_T_SRC, y * BEK_T_SRC, BEK_T_SRC, BEK_T_SRC);
          }
          g.restore();
        } finally { g = prev; }
        perf.light = now() - t0 - perf.ground - perf.detail - perf.forest;
        perf.rects = rects; perf.key = k; perf.rebuilds++;
        perf.ms = now() - t0;
        return terrCv;
      }
      /* The ploughed plot and what grows in it live in crops.js — the last
         of the live second pass, and the one tile that reads `S.soil` rather
         than the map. */
      const { drawSoil } = createCrops(() => g, C, {
        soil: k => S.soil[k], map: () => S.map, native: native, spot: spot
      });

      /* The people, the animals and the item icons live in actors.js. It is
         handed `() => g` rather than `g`, because `g` is repointed at the
         offscreen terrain canvas for the length of a cache rebuild. */
      const { drawIcon, person, bear, goat, chicken } = createActors(() => g, C);

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
         One axis, written once and applied to both. `track` centres the
         viewport on the player's tile and then clamps at *both* ends, which
         is what keeps the outermost map rows and columns welded to the frame
         instead of letting blank space creep in past the edge of the world.

         This was always the vertical behaviour; horizontally the travel used
         to be `max(0, 960 - 960)` and so was always zero, which read as "the
         camera does not scroll horizontally" when what was true is that no
         map had ever been wider than the screen. A map that is wider now
         scrolls, and clamps, by the same expression. */
      let camX = 0, camY = 0;
      const track = (tile, view, max) =>
        Math.max(0, Math.min(max, Math.round(tile * BEK_T + BEK_T / 2 - view / 2)));
      function camTrack() {
        camX = track(S.px, BEK_VIEW_W, camMaxX(S.map));
        camY = track(S.py, BEK_VIEW_H, camMaxY(S.map));
        /* The kick on the strike frame — the whole difference between an
           animation and a hit. Kept under three pixels and under two frames,
           because past that it is motion sickness. Applied after the clamp so
           it can nudge the top and bottom rows a pixel free of the frame for
           a moment, which is what a jolt looks like. */
        if (shake > 0.4) {
          const k = Math.round(shake);
          camX += (S.dir === 2 ? -k : S.dir === 3 ? k : 0);
          camY += (S.dir === 1 ? -k : S.dir === 0 ? k : 0);
        }
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
      let litTag = '';
      function draw(t) {
        const m = M(), inside = !!m.inside;
        camTrack();
        /* Everything from here to the HUD resolves its colours through the
           hour's table. Night is not painted on top of the picture any more;
           the picture is rasterised in night colours. */
        const L = lighting();
        if (L.tag !== litTag) { litTag = L.tag; sweepDither(L.tag); }
        useLut(cssFor(L.st), L.tag);

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
        const sCols = COLS(), sRows = ROWS();
        for (let y = 0; y < sRows; y++) for (let x = 0; x < sCols; x++)
          if (tileAt(S.map, x, y) === 'f') drawSoil(x, y);

        /* The moving half of the light. The pools themselves are in the cache;
           what cannot be is a fire whose reach breathes on the same cycle as
           its flame. It breathes as the warm veil now rather than as a second
           pool, and that is the whole of the old stacking bug: a cached pool
           and a live one used to land on the same pixels, clamp to 16
           independently and composite to something effectively opaque. A veil
           over a pool cannot do that, and neither can two pools. */
        propMap.forEach(d => { if (PROP_LIVE[d.kind]) drawProp(d, d.x, d.y, t); });

        if (L.dark > 0.02 && terrHearths.length) {
          const fl = 1 + 0.10 * Math.sin(t * 5.1) + 0.05 * Math.sin(t * 11.7);
          const hs = [];
          for (let i = 0; i < terrHearths.length; i += 2)
            hs.push({ px: terrHearths[i], py: terrHearths[i + 1], r: 1.7 * BEK_T * fl });
          veil(hs, L.dark);
        }

        S.drops.filter(d => d.map === S.map).forEach(d => drawIcon(d.item, d.x * BEK_T_SRC + 3, d.y * BEK_T_SRC + 3));
        BEK_GOATS.filter(gt => gt.map === S.map).forEach(gt => goat(gt.x * BEK_T_SRC + 1, gt.y * BEK_T_SRC + 1, t));
        /* owned animals are their own system — collidable, stateful, never
           merged with the decorative herd above */
        if (S.map === 'farm') S.animals.forEach(a => {
          if (a.kind === 'goat') goat(a.x * BEK_T_SRC + 1, a.y * BEK_T_SRC + 1, t);
          else chicken(a.x * BEK_T_SRC + 3, a.y * BEK_T_SRC + 3, t);
        });

        const actors = npcsHere().map(n => ({ n: n, y: n.y }));
        actors.push({ me: 1, y: S.py });
        actors.sort((a, b) => a.y - b.y);
        actors.forEach(a => {
          if (a.me) {
            /* what is in the hand: the selected tool at rest, or whatever is
               mid-swing. A tool you do not own is not in your hand. */
            const tid = BEK_TOOLS[S.tool].id;
            const sw = swing && TOOL_SWING[swing.kind];
            const kind = sw && swing.kind !== 'deny' && swing.kind !== 'hand' ? swing.kind : tid;
            const held = S.tools[kind] || (sw && swing.kind === kind)
              ? { kind: kind, u: sw ? Math.min(1, swing.t / swing.len) : 0, dir: S.dir } : null;
            /* two frames of recoil when the answer was no */
            const jx = swing && swing.kind === 'deny' ? ((swing.t * 46) | 0) % 2 ? 2 : -2 : 0;
            person(S.px * BEK_T_SRC + 4 + jx, S.py * BEK_T_SRC + 2, S.dir, S.step, PLAYER_HAIR, PLAYER_SHIRT, PLAYER_PANTS, held);
            return;
          }
          const n = a.n;
          if (n.bear) { const sway = Math.floor(t * 1.2) % 2; bear(n.x * BEK_T_SRC + 2 + sway, n.y * BEK_T_SRC + 1, sway * 2); }
          else person(n.x * BEK_T_SRC + 4, n.y * BEK_T_SRC + 2, 0, Math.floor(t) % 2 ? 0 : 2, n.hair, n.shirt, n.pants);
        });

        /* the chips, the dust and the spray, in front of everything in the
           playfield and under the chrome */
        native(() => fx.draw());

        if (S.map === 'lake' && S.flag.lot && !S.built) { g.fillStyle = C(SAN[2]); g.fillRect(3 * BEK_T_SRC, 3 * BEK_T_SRC, 5 * BEK_T_SRC, 1); g.fillRect(3 * BEK_T_SRC, 6 * BEK_T_SRC - 1, 5 * BEK_T_SRC, 1); }

        /* The one pool that cannot be cached, because it walks. It is the same
           pass as the cached ones, run on the screen once everything in the
           playfield is on it — so the lamp lights the floor, the ore glints,
           the drops and the player's own shirt, none of which a pool baked
           into the terrain could ever reach. It goes on the screen in screen
           pixels, which is what `camX`/`camY` are doing here; the veil after
           it is still world-space art under the ambient transform. The
           viewport is passed in by hand because `getImageData` knows nothing
           about the clip path, and a lantern must not reach the HUD.

           The peak is flat rather than scaled by darkness: the gruva ignores
           the clock (`CAVE_LIGHT`), so there is only ever one darkness for it
           to be scaled against, and a lamp you are carrying is the brightest
           thing down there by design. */
        if (isCave(S.map) && has('lykt')) {
          const src = [{ px: S.px * BEK_T + BEK_T / 2, py: S.py * BEK_T + BEK_T / 2,
                         r: LANTERN_R, peak: LANTERN_PEAK }];
          lampV.apply(g, src.map(sc => ({ px: sc.px + BEK_VIEW_X - camX, py: sc.py + BEK_VIEW_Y - camY,
                                          r: sc.r, peak: sc.peak })),
                      L.st, lampState(L.st, L.dark), VIEW_RECT);
          veil(src, L.dark);
        }
        g.restore();

        /* Weather sits over the playfield only, and it is the last thing that
           still composites: fog really is a sheet of something between you
           and the valley, which is exactly what an overlay is for. The hour
           is no longer here at all — it went into the palette. Both still
           draw through the hour's LUT, so fog at midnight is night fog and
           rain at dusk catches the last of the light.

           The season adds one more layer under those two, through the exact
           same dither() call fog already makes — no new renderer, just
           another colour and strength (BEK_SEASON_TINT) handed to a call
           that already exists, and it too draws through the hour's LUT. */
        g.save();
        viewClip();
        if (!inside) {
          const tint = BEK_SEASON_TINT[BEK_SEASONS[S.season].id];
          if (tint) dither(tint.col, tint.n);
          if (S.weather === 'regn') {
            g.fillStyle = C(WAT[4]);
            for (let i = 0; i < BEK_RAIN_N; i++) {
              const rx = (i * BEK_RAIN_STRIDE_X + Math.floor(t * BEK_RAIN_VX)) % BEK_VIEW_W;
              const ry = (i * BEK_RAIN_STRIDE_Y + Math.floor(t * BEK_RAIN_VY)) % BEK_VIEW_H;
              g.fillRect(BEK_VIEW_X + rx, BEK_VIEW_Y + ry, BEK_ART_SCALE, BEK_RAIN_LEN);
            }
          } else if (S.weather === 'take') dither(STO[4], 4);
        }
        g.restore();

        /* the chrome, from here down: two HUD bands, panels, menus, text */
        useLut(DAY_CSS, 'day');
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
        if (mode === 'craft') drawCraft();
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
      /* Every panel the game puts over the picture lives in menus.js — the
         fishing gauge, the dialogue box, the shop, the bag, the quest board,
         the travel list and the ending painting. All chrome, so all of it
         draws after the LUT goes back to daylight. */
      const { drawFish, drawTalk, drawOffer, drawShop, drawCraft, drawBag, drawQuests, drawTravel,
              drawEnd, toolName } = createMenus({
        S: () => S, fish: () => fish, dlg: () => dlg, shop: () => shop, craft: () => craft,
        travel: () => travel, offer: () => offer, qScroll: () => qScroll,
        T: T, TX: TX, iname: iname, price: price, houseCost: () => houseCost(S),
        recipeUnlocked: recipeUnlocked, craftCount: craftCount,
        panel: panel, icon: icon, text: text, textW: textW, wrapText: wrapText,
        dither: dither, bear: bear, artScale: BEK_ART_SCALE
      }, () => g, C);

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

      /* A hatch for the screenshot harness (scripts/bekkedal_shots.mjs) to
         read real numbers out of a running game instead of guessing them.
         Nothing in the game reads it, it is deleted when the window closes,
         and no gameplay path goes through it. */
      let drawMs = 0;
      const dbg = {
        perf: () => ({
          rebuilds: perf.rebuilds, lightRects: perf.rects, litPx: perf.lit,
          poolMs: Math.round(perf.pool * 100) / 100, veilMs: Math.round(perf.veil * 100) / 100,
          rebuildMs: Math.round(perf.ms * 100) / 100,
          groundMs: Math.round(perf.ground * 100) / 100,
          detailMs: Math.round(perf.detail * 100) / 100,
          forestMs: Math.round(perf.forest * 100) / 100,
          lightMs: Math.round(perf.light * 100) / 100,
          drawMs: Math.round(drawMs * 100) / 100,
          ditherPatterns: Object.keys(ditherCache).length,
          particles: fx.count(),
          map: S.map, min: Math.floor(S.min), key: perf.key
        }),
        /* Every rect one rebuild emits, which is the figure the budget in
           this app's CLAUDE.md is stated against. Counted on demand rather
           than always: a wrapper on `fillRect` is one extra call per rect,
           and paying that on every rebuild would inflate the very millisecond
           figure sitting beside it. Wraps, forces one rebuild, unwraps. */
        rects: () => {
          const real = terrG.fillRect;
          let n = 0;
          terrG.fillRect = function () { n++; return real.apply(this, arguments); };
          try { terrKey = ''; terrain(); } finally { terrG.fillRect = real; terrKey = ''; }
          return n;
        },
        /* Open a panel so the harness can photograph it. Menus are the one
           part of the picture a screenshot of the world never covers, and a
           panel that throws only throws when somebody opens it. */
        menu: name => {
          mode = name || '';
          if (name === 'shop') shop = { list: BEK_TALK.astrid.shop, sel: 0, side: 0, npc: BEK_NPCS[0] };
          if (name === 'craft') craft = { side: 0, sel: 0 };
          if (name === 'talk') dlg = { lines: [BEK_TALK.astrid.chat[0].t[0]], i: 0, npc: BEK_NPCS[0] };
          if (name === 'offer') offer = { label: { no: 'BÅT', en: 'BOAT' }, kr: 400 };
          if (name === 'travel') travel = { list: Object.keys(S.disc), sel: 0 };
          if (name === 'end') S.ending = 4.2;
          if (name === 'fish') fish = { phase: 'reel', t: 4, pos: 0.42, dir: 1, spd: 0.7,
                                        z0: 0.3, z1: 0.5, hits: 1, need: 3, miss: 0, maxMiss: 3, rare: 0 };
        },
        /* Hold a swing at one of its three phases for a frame so the harness
           can photograph it. Nothing in the game calls this; it drives the
           same `swing` the keyboard does, so what it photographs is what a
           player sees rather than a mock-up of it. */
        swing: (phase, till) => {
          if (till) {
            const f0 = facing();
            S.soil[key(f0.x, f0.y)] = { till: 1, wet: 0, seed: 'potet', age: 1, ready: 0 };
            terrDirty();
          }
          swing = null;
          if (!phase) return false;
          const tid = BEK_TOOLS[S.tool].id, sp = TOOL_SWING[tid];
          if (!sp) return false;
          startSwing(tid);
          tickSwing(phase === 1 ? sp.wind * 0.6
                  : phase === 2 ? sp.wind + sp.hit * 0.4
                  : sp.wind + sp.hit + sp.rec * 0.45);
          return true;
        }
      };
      window.__bekDebug = dbg;

      let acc = 0;
      function frame(ts) {
        if (!alive || !document.body.contains(cv)) { alive = false; Song.stop(); Amb.stop(); return; }
        raf = requestAnimationFrame(frame);
        const dt = Math.min(0.1, (ts - last) / 1000 || 0); last = ts;
        if (!mode) { move(dt); tickFish(dt); }
        tickSwing(dt); fx.step(dt);
        if (mode === 'end') S.ending += dt;
        tickClock(dt);
        if (noteT > 0) { noteT -= dt; if (noteT <= 0) note = ''; }
        autoT += dt; if (autoT > 6) { autoT = 0; autoSave(); }
        speechTick();
        Song.rotStep(dt); Song.sync();
        Amb.tick(dt);
        acc += dt;
        if (acc >= 1 / 30) {
          acc = 0;
          const t0 = performance.now();
          draw(ts / 1000);
          drawMs = drawMs * 0.9 + (performance.now() - t0) * 0.1;
        }
      }
      raf = requestAnimationFrame(frame);

      const watch = setInterval(() => {
        if (document.body.contains(cv)) return;
        clearInterval(watch); alive = false;
        if (raf) cancelAnimationFrame(raf);
        autoSave();
        Song.stop();
        Amb.stop();
        try { if (hymnWas) Music.sync(); } catch (e) {}
      }, 800);

      /* the fullscreen listener lives on `document`, not on the canvas, so it
         outlives the window's own DOM removal and must be torn down here */
      this._cleanup = () => {
        if (window.__bekDebug === dbg) { try { delete window.__bekDebug; } catch (e) { window.__bekDebug = null; } }
        fx.clear(); swing = null;
        ro.disconnect();
        document.removeEventListener('fullscreenchange', onFSChange);
        if (document.fullscreenElement === wrap) document.exitFullscreen().catch(() => {});
      };
  },
  unmount() {
    if (this._cleanup) { this._cleanup(); this._cleanup = null; }
  }
};
