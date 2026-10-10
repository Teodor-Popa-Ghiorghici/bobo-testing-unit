import { createWindow, raise } from '../../kernel/wm.js';
import { buffs } from '../buffs_scope.js';
import { fs as vfs } from '../../kernel/vfs.js';
import { CRT, Vol, sfxGain } from '../../kernel/hardware.js';
import { BEK_T, BEK_T_SRC, BEK_ART_SCALE, BEK_SAVE, BEK_LOT_COST, UI, BEK_ITEMS, BEK_SEED_ORDER,
         BEK_CROPS, BEK_TOOLS, OKS_GRAN_E, AXE_NAME, PICK_NAME, ROD_NAME, BEK_MAPS, BEK_SOLID, BEK_NPCS, BEK_GOATS,
         BEK_START_KR, BEK_EN_MAX, BEK_STEP_S, BEK_TURN_S, BEK_CLOCK_MIN_PER_S, BEK_DAY_START, BEK_DAY_END,
         BEK_XP_STEP, BEK_XP_LVL_STAMINA, BEK_GRADE_MULT, BEK_PRESV_DAYS, BEK_RARE_CHANCE,
         BEK_FORAGE_DROPS, BEK_FORAGE_BONUS, BEK_REGROW, BEK_FOOD_DAY_CAP, BEK_GIFT_FR,
         BEK_TALK, BEK_SCENES, BEK_QUESTS, BEK_HOUSE, BEK_DECOR, BEK_FARM_PLOTS, BEK_BARN_PLOT,
         BEK_BARN_PLOT2, BEK_GREENHOUSE_PLOT, BEK_ANIMAL_KINDS, BEK_GIFT_CAP, BEK_MINE_MOUTH,
         BEK_RECIPES, BEK_FISH_WATERS, BEK_SEASON_DAYS, BEK_LOFT,
         BEK_PLACE_CAT, BEK_PLACE_ROT,
         BEK_SEASONS, BEK_SEASON_TINT, BEK_FESTIVALS,
         BEK_W, BEK_H, BEK_HUD_H, BEK_VIEW_X, BEK_VIEW_Y, BEK_VIEW_W, BEK_VIEW_H,
         mapCols, mapRows, camMaxX, camMaxY,
         BEK_RAIN_N, BEK_RAIN_STRIDE_X, BEK_RAIN_STRIDE_Y, BEK_RAIN_LEN, BEK_RAIN_VX, BEK_RAIN_VY,
         BEK_DITHER_CELL, BEK_DITHER_PX } from './data.js';
import { hLowV, patchAmt, mapSalt, groundVar, rockVar, pathVar, waterVar, edgeVar,
         soilVar, objVar, seamVar, treeVar, LOW, PATCH, JIT } from './noise.js';
import { seasonIndexOf, festivalOf, cropInSeason, rollWeather } from './seasons.js';
import { positionFor, walkStep } from './schedule.js';
import { sceneFor, beginScene, sceneBeat, sceneAdvance, sceneCast,
         scenePlace, sceneRestore, sceneEffects } from './scene.js';
import { createShore } from './shore.js';
import { createWater } from './water.js';
import { createRock, oreKind } from './rock.js';
import { createInterior } from './interior.js';
import { zoneAt, zoned as zonedMap, paperOf, windowAt as roomWindowAt } from './rooms.js';
import { createBuilding } from './building.js';
import { createForest } from './forest.js';
import { createWear } from './wear.js';
import { greeting } from './greet.js';
import { createFx, TOOL_SWING, swingLen, toolAt, drawHeld } from './fx.js';
import { createSongs } from './music.js';
import { createAmbience } from './ambience.js';
import { createActors } from './actors.js';
import { createMenus } from './menus.js';
import { createCrops } from './crops.js';
import { refreshBoard, isRefreshDay, activeRepeatable, questTitle } from './quests.js';
import { mineFloor, mineGem, mineDig, mineBand, mineTitle, mineId, floorOf, isMineId,
         mineClearCache, MINE_BANDS, MINE_STATION, MINE_MAX } from './mine.js';
import { houseCost, houseTierCost, houseTierAvailable, barnSlots,
         greenhouseCost, greenhouseAvailable } from './progression.js';
/* THE LOFT — every question about the long spine, and not one answer written
   here. See spine.js's header: this file owns exactly one writer for it,
   spineDonate() below, and every gate that pays a wing out reads back through
   these. */
import { spineOpen, spineProgress, spineStage, spineComplete, spineWants,
         spineClaimable, spineProps, spineRecipeOK, spineForageBonus,
         spineHoistEveryFloor, spinePresvDaysOff, spineGiftCap } from './spine.js';
import { PROP, furniture, LIVE as PROP_LIVE, LIGHTS as PROP_LIGHTS, PLACE_BLOCKS } from './decor.js';
import { canPlace, connectivityOK } from './placement.js';
import { mask4 } from './autotile.js';
import { PAL_CSS, ATMO, GRASS, DRY, CON, TIM, STO, SOI, WAT, SAN, SNO, WAR, ORE } from './palette.js';
import { MARKS, SHADOWS, FEATURES } from './palette_marks.js';
import { lightAt, shelter, keyOf, cssFor, DAY_CSS, mineLight } from './light.js';
import { lampState, createLamp, bandStates } from './lamp.js';
import { hintFor, holdingLine } from './hint.js';
import { createCalls as createTrophyCalls } from './trophy_calls.js';
import { FURN, furnitureAct } from './furniture_act.js';
import { createGeese } from './geese.js';
import { lifeFor } from './life.js';
import { fogLevel, FOG_BLOCK } from './fog.js';
import { helloFor } from './hellos.js';
import { createTyper } from './typer.js';
import { BEK_WORLD } from './maps.js';
import { topicMenu, topicOf, topicDialogue } from './asks.js';
import { lateExtra, warningFor, nightOf, pilfer, napPhase, NAP_TOTAL, NAP, zCount, vignette } from './sleep.js';
import { newChop, chopTick, chopStrike, chopAbandoned } from './chop.js';
import { ACT_TOOL, CALLS, LOOKS } from './life_data.js';
import { noteGift, lookNow, wearsKnit } from './looks.js';
import { makeWalker, sendTo, stepWalker, distance, beside, comesIn, nearestOut, callFor, MEET_R, FAR, RUN } from './walkers.js';
import { inside as insideMap, isCave, snowy, groundOf, solidOf, defaultGround } from './surface.js';
import { FONT_SM, FONT_LG } from './font.js';
import { createText } from './text.js';
import { softCanvas } from './softcv.js';
import { createSteer, createStride, createSlide, walkKey, DX, DY } from './stride.js';
import { questSun, HOUSE_SUN, LOFT_SUN } from './pay.js';
import { BORDER, CELL_SM, LINE_SM, LINE_LG, PAD_SM, PAD_LG, GLYPH_SM, ICON_PX,
         HUD_PAD, HUD_GAP, HUD_TXT_DY, HUD_BOT_Y, EN_BAR_W, EN_BAR_H, EN_BAR_X, EN_BAR_Y,
         DROP_W, DROP_H, TIP_W, TIP_H, TIP_X, TIP_Y, TIP_COL2,
         FISH_TRACK_W, FISH_TRACK_H, FISH_W, FISH_H, FISH_X, FISH_Y,
         FISH_TRACK_X, FISH_TRACK_Y, FISH_NEEDLE_W, FISH_NEEDLE_OVER,
         DLG_BODY_LINES, DLG_W, DLG_H, DLG_X, DLG_Y, DLG_TX, DLG_TW,
         OFFER_W, OFFER_H, OFFER_X, OFFER_Y,
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
  fluid: true,
  mount(root, ctx) {
  const body = root;
      const wrap = document.createElement('div');
      wrap.className = 'gamepane';
      const cv = document.createElement('canvas');
      cv.width = BEK_W; cv.height = BEK_H;
      cv.className = 'gamecv bekcv';
      cv.dataset.fit = 'int';
      cv.tabIndex = 0;
      wrap.appendChild(cv);

      const bar = document.createElement('div');
      bar.className = 'appbar wrap hint';
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
            ROCK_FACE = MARKS.ROCK_FACE.cols, FLOOR_GRAIN = MARKS.FLOOR_GRAIN.cols;
      const PATH_CRACK = SHADOWS.PATH_CRACK.cols[0], ROCK_CRACK = SHADOWS.ROCK_CRACK.cols[0],
            FLOOR_JOINT = SHADOWS.FLOOR_JOINT.cols[0], TREE_INK = SHADOWS.TREE_INK.cols,
            MOSS_SHADE = SHADOWS.MOSS_SHADE.cols[0];
      /* the player, who has no entry in BEK_NPCS because there is only one */
      const PLAYER_HAIR = TIM[1], PLAYER_SHIRT = WAT[4], PLAYER_PANTS = ATMO[2];
      const FLOWER = FEATURES.FLOWER.cols, PICKABLE = FEATURES.PICKABLE.cols,
            ORE_GLINT = FEATURES.ORE_GLINT.cols, HEARTH = FEATURES.HEARTH.cols,
            SNOWDRIFT = FEATURES.SNOWDRIFT.cols;
      const BEDROCK = MARKS.BEDROCK.cols[0];
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
        /* whole pixels whenever the picture fits at least once; a window smaller than the
           picture (a narrow desktop, or the window zoomed in) shrinks it to fit instead,
           both sides together, so it is never squashed and never runs off the pane */
        const fit = Math.min((availW - (isFS ? 0 : 8)) / BEK_W, (availH - (isFS ? 0 : 8)) / BEK_H);
        const scale = fit >= 1 ? Math.floor(fit) : Math.max(0.25, fit);
        cv.style.maxWidth = 'none'; cv.style.maxHeight = 'none';
        cv.style.width = Math.floor(BEK_W * scale) + 'px';
        cv.style.height = Math.floor(BEK_H * scale) + 'px';
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
      /* GIFTING: the friendship ceiling, raised from 5 to 10 so a season of
         small kindnesses (gifts) has room to matter beside the bigger
         dialogue-choice/quest steps — see heal()'s ver-12 migration below
         for why an old save's own S.fr must be doubled, not just clamped
         wider, to land on the same relative progress. */
      const FR_MAX = 10;
      /* what fresh()'s enMax was before the rebalance, kept only so heal()
         can work out how much a stale save is owed. Never read by the game. */
      const EN_MAX_WAS = 120;
      let S = null;
      const tro = createTrophyCalls();            /* what the trophies are told (trophy_calls.js): a few events, and scan(S) once a second */
      const fresh = () => {
        const f = {
        ver: 22, lang: BEK_LANG, fullscreen: 0,
        map: 'farm', px: 8, py: 8, dir: 0, step: 0, walk: 0,
        day: 1, min: BEK_DAY_START, kr: BEK_START_KR, en: BEK_EN_MAX, enMax: BEK_EN_MAX,
        water: 20, waterMax: 20,
        tools: { spade: 1, kanne: 1, oks: 1, stang: 0, hakke: 0 },
        tool: 0, axeLv: 1, pickLv: 0, kanneLv: 0, seedIx: 0,
        /* the rod's own tier, same shape as axeLv/pickLv (BEK_TOOLS' header) —
           1 is the plain rod Ingrid gives out, 2 the carbon rod she sells on
           past friendship 5. See ROD_NAME (data.js) and the reel in tickFish. */
        rodLv: 1,
        /* ---- ver 15: legendary fish ----------------------------------------
           One catch per water per year. Keyed by BEK_ITEMS id, valued at the
           S.day it was landed — pickFishSpecies() (below) refuses to offer a
           legend again until BEK_SEASON_DAYS * 4 days have passed. */
        legend: {},
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
        /* what you did yesterday, and the mark today is measured from —
           both derived from the same four XP counters above rather than a
           fifth set of tallies, so nothing here can disagree with them.
           newDay() subtracts one from the other and re-stamps the mark; a
           chat line reads S.yst.mine the way it reads S.weather. */
        yst: { farm: 0, mine: 0, forage: 0, fish: 0 },
        xpDay: { farm: 0, mine: 0, forage: 0, fish: 0 },
        met: {}, seen: {}, flag: {}, q: {},
        /* GIFTING: gifts given this NPC this week, cleared the same
           BEK_QUEST_REFRESH_DAYS cadence the quest board itself turns over
           on (newDay()'s isRefreshDay() branch) — see BEK_GIFT_CAP. */
        giftWeek: {},
        /* GIFTING: a save from before the friendship rescale must double
           every S.fr counter exactly once (heal() below) — this marks that
           it already has, since heal() never rewinds S.ver on an existing
           save (see scripts/bekkedal_savetest.mjs's own ver-stays-put
           assertion) and so cannot gate the migration on S.ver itself. */
        frRescaled: true,
        /* ver 19: the same marker, for the same reason, over the stamina
           rescale in heal() below — see EN_MAX_WAS. */
        enRescaled: true,
        chatIx: {}, lastTalk: {}, look: {}, mem: {}, disc: { farm: 1 }, weather: 'klar',
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
        houseTier: 0,
        /* ---- ver 14: the descent (mine.js) --------------------------------
           `run` is the descent you are currently in, or null on the surface:
           the seed its floors are generated from, which floor you are on, and
           which squares of it you have already broken. It is the *only* thing
           a floor is saved as — the rows are recomputed from (seed, floor) on
           load, which is what `mine_check.js`'s determinism section exists to
           make safe. A run does not survive a night (newDay() drops it).

           `dug` is keyed exactly the way S.mined is (`rkey`), and is a
           separate table from it on purpose. S.mined expires against S.day
           because a vein in the authored gruva regrows; a floor of the
           descent is consumed for the run and the next run generates a
           different floor, so there is nothing for a day counter to mean down
           there. Keeping them apart also means every existing S.mined key
           still names an authored map, which is what healCoords() checks.

           `deepest` is the one part of a descent that outlives it: the lift at
           the mouth offers every station (mine.js's MINE_STATION) up to it, so
           this is the shortcut, and the only thing in the mine you keep. */
        run: null, deepest: 0,
        /* ---- ver 16: QUALITY and PRESERVES --------------------------------
           S.cropGrade is a crop item id's running quality average (0..2, an
           EWMA over recent harvests — see cropGradeScore()/gradeMult() in
           the verbs section), read by sellPrice(), a gift's reaction bonus
           and the repeatable board's own reward. S.presv is the keg/jar
           table, keyed like S.soil: `{kind, item, day}` per farm-map square,
           `item` empty while nothing is fermenting. Neither one exists on a
           save from before this pass, and both start honestly blank. */
        cropGrade: {}, presv: {},
        /* ---- ver 17: THE LOFT ---------------------------------------------
           The long spine, and the only field it has. `d` is entry id -> the
           day it was given; `m` is the id of every milestone that has already
           handed over a *number* (bag space, stamina), so it hands it over
           once; `first` and `done` are the day the first gift was carried in
           and the day the last one was. Everything else about the loft —
           whether it is open, which stage the building is at, which of the
           seven wings are finished, and all six of the payouts that are not
           numbers — is derived from this table by spine.js and stored
           nowhere. See BEK_LOFT (data.js). */
        spine: { d: {}, m: {}, first: 0, done: 0 },
        /* ---- ver 18: FURNISHING --------------------------------------------
           Every object a player has placed, never an authored one — those
           stay in BEK_DECOR and never touch this. Keyed by rkey(map, x, y)
           exactly like S.mined/S.felled, so a placement is per-tile and
           per-map with no second lookup table to keep in sync. `{ kind,
           item, rot }`: `kind` is the decor.js/decor_place.js drawing (and
           the LIGHTS/PLACE_BLOCKS key), `item` is the BEK_ITEMS id handed
           back to the bag when it is picked back up (not always the same
           string — lampe places the 'lamp' kind), `rot` is 0/1 for the
           handful of kinds BEK_PLACE_ROT says read a facing. See
           placement.js and index.js's `place` mode. */
        placed: {}
        };
        /* the repeatable quest board (quests.js) — two or three live
           instances on top of BEK_QUESTS above, seeded here so day 1 already
           has a board rather than waiting for the first weekly refresh */
        f.rq = refreshBoard(f, f.day);
        return f;
      };
      /* ---- the descent, as maps the engine can walk ----------------------
         A floor of the mine (mine.js) is a BEK_MAPS-shaped object like any
         other, and everything downstream — the ground pass, `solid()`, the
         camera clamp, the terrain cache, `surface.js`, `rock.js`, the light,
         the ambience bed — keeps working precisely because from its side
         nothing new has happened. What is new is only *when* the map exists:
         it is registered here, at runtime, and torn down when the run ends.

         That is also what keeps the checks honest. `world_check.js`,
         `tile_check.js`, `palette_check.js` and `layout_check.js` all walk
         `BEK_MAPS` as data.js exports it, so a generated floor is never in
         front of them and can never break one of them; `mine_check.js` is the
         check that walks the generated ones instead.

         Three floors are registered at a time, never one: a floor's ladders
         are ordinary `exits`, and `move()` reads `BEK_MAPS[ex.to].title` the
         instant you step onto one, so the floor above and the floor below
         have to exist before the step and not after it. */
      function mineRegister(seed, floor) {
        if (floor < 1 || floor > MINE_MAX) return null;
        const id = mineId(seed, floor);
        if (!BEK_MAPS[id]) {
          const def = mineFloor(seed, floor);
          BEK_MAPS[id] = def; BEK_DECOR[id] = def.decor;
        }
        return BEK_MAPS[id];
      }
      function mineNear(seed, floor) {
        mineRegister(seed, floor - 1); mineRegister(seed, floor + 1);
        return mineRegister(seed, floor);
      }
      /* Every floor of every run this session, gone. Cheap, and it has to
         happen: two runs are two different seeds and so two different sets of
         ids, and without this a long evening's play would leave the map table
         carrying every floor of every descent. */
      function mineForget() {
        Object.keys(BEK_MAPS).forEach(k => { if (isMineId(k)) { delete BEK_MAPS[k]; delete BEK_DECOR[k]; } });
        mineClearCache();
      }
      const mineDrop = () => { S.run = null; mineForget(); };
      const mineHere = () => (S.run && isMineId(S.map)) ? S.run.floor : 0;

      /* nested objects a stale save might be missing */
      const heal = s => {
        const f = fresh();
        ['tools', 'fr', 'soil', 'felled', 'mined', 'picked', 'flag', 'q', 'met', 'seen', 'chatIx', 'lastTalk', 'look', 'mem', 'disc', 'bag', 'chest', 'xp', 'lvl', 'giftWeek', 'yst', 'xpDay', 'cropGrade', 'presv', 'spine', 'placed'].forEach(k => {
          if (typeof s[k] !== 'object' || s[k] === null) s[k] = f[k];
        });
        /* ver 16: a save from before QUALITY has no plot's soil record
           tracking fertiliser or a watering streak yet — backfill both
           rather than leaving them undefined, which cropGradeScore() would
           otherwise read as NaN through `>=`. */
        Object.keys(s.soil).forEach(k => {
          const c = s.soil[k];
          if (c.fert == null) c.fert = 0;
          if (c.tend == null) c.tend = 0;
        });
        Object.keys(f.tools).forEach(k => { if (s.tools[k] == null) s.tools[k] = f.tools[k]; });
        Object.keys(f.fr).forEach(k => { if (s.fr[k] == null) s.fr[k] = 0; });
        /* friendship rescale, 0-5 -> 0-10: a save from before this must
           double every existing S.fr counter once, or it lands at half the
           relative progress it had (old-3-of-5 sitting at new-3-of-10)
           rather than the same unlocks it already had (new-6-of-10). Gated
           on its own flag rather than S.ver: heal() never rewinds S.ver
           forward on an existing save (see scripts/bekkedal_savetest.mjs's
           own ver-stays-put assertion), so a save that keeps loading at its
           original ver still only doubles once. */
        if (!s.frRescaled) {
          Object.keys(s.fr).forEach(k => { s.fr[k] = Math.min(FR_MAX, Math.round((s.fr[k] || 0) * 2)); });
          s.frRescaled = true;
        }
        Object.keys(f.xp).forEach(k => { if (s.xp[k] == null) s.xp[k] = 0; });
        Object.keys(f.lvl).forEach(k => { if (s.lvl[k] == null) s.lvl[k] = 0; });
        /* ver 13: a save from before the yesterday counters existed starts
           today with an honest blank — "you did nothing yesterday" is the
           truthful reading of a day this build never watched. */
        Object.keys(f.xp).forEach(k => { if (s.yst[k] == null) s.yst[k] = 0; if (s.xpDay[k] == null) s.xpDay[k] = s.xp[k] || 0; });
        ['axeLv', 'pickLv', 'rodLv', 'kanneLv', 'seedIx', 'enMax', 'waterMax', 'bagCap', 'bagTier', 'weather', 'ver', 'houseBuilt', 'houseBuiltDay', 'act2Unlocked', 'houseTier', 'fullscreen', 'animalSeq', 'deepest'].forEach(k => { if (s[k] == null) s[k] = f[k]; });
        /* ver 17: a save from before the loft has given nothing to it, which
           is the honest reading — the same one the yesterday counters and the
           descent's own S.deepest take. The two nested tables are backfilled
           beside the two day stamps rather than trusting `spine` above to have
           come back whole: a truncated blob can carry the object and not its
           contents. */
        if (typeof s.spine.d !== 'object' || s.spine.d === null) s.spine.d = {};
        if (typeof s.spine.m !== 'object' || s.spine.m === null) s.spine.m = {};
        if (!Number.isFinite(s.spine.first)) s.spine.first = 0;
        if (!Number.isFinite(s.spine.done)) s.spine.done = 0;
        /* ver 15: a save from before legendary fish existed has caught none */
        if (typeof s.legend !== 'object' || s.legend === null) s.legend = {};
        /* ver 19: the rebalance. The bar went from 120 to 200 and every sell
           price, tool cost and shop price moved with it, so a save that keeps
           its old 120 is not a save of the old game — it is a save of the new
           one played at three fifths of the stamina, which is unwinnable
           inside the day the rest of the numbers assume. Raised by the same
           delta rather than clamped to the new base, so a run that had
           already earned stamina keeps what it earned on top. Gated on its
           own marker for exactly the reason the friendship rescale above is:
           heal() never rewinds S.ver on an existing save, so a save that goes
           on loading at its original ver must still only be raised once. */
        if (!s.enRescaled) {
          s.enMax = Math.max(f.enMax, (s.enMax || 0) + (f.enMax - EN_MAX_WAS));
          s.en = Math.min(s.enMax, (s.en || 0) + (f.enMax - EN_MAX_WAS));
          s.enRescaled = true;
        }
        /* ver 18: a save from before FURNISHING existed has placed nothing —
           the honest blank, same reasoning as S.legend and S.deepest above.
           Every authored prop still renders (BEK_DECOR, untouched by this),
           only the player's own layer starts empty. A malformed entry (a
           kind this build does not know, or a map that no longer exists —
           the descent tears its own floors down between sessions) is
           dropped rather than repaired, the same rule healCoords() applies
           to S.soil/S.felled/S.mined/S.picked below. */
        Object.keys(s.placed).forEach(k => {
          const rec = s.placed[k];
          const mp = k.slice(0, k.indexOf(':'));
          if (!rec || typeof rec !== 'object' || !PROP[rec.kind] || !BEK_ITEMS[rec.item] || !BEK_MAPS[mp]) { delete s.placed[k]; return; }
          rec.rot = rec.rot ? 1 : 0;
        });
        /* ver 14: a save from before the descent existed has never been down
           one, so it starts at the mouth with no shortcut — the honest
           reading, the same one the yesterday counters take above. A run that
           is not a run (an older save's `run`, or a truncated one) is dropped
           rather than repaired: healCoords() below then puts the player back
           on the surface, which is always somewhere they can stand. */
        if (!s.run || typeof s.run !== 'object' || !Number.isFinite(s.run.seed) ||
            !Number.isFinite(s.run.floor) || s.run.floor < 1) s.run = null;
        else if (typeof s.run.dug !== 'object' || s.run.dug === null) s.run.dug = {};
        s.deepest = Math.max(0, Math.min(MINE_MAX, Math.floor(s.deepest) || 0));
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
        healCoords(s, f);
        return s;
      };
      /* ---- ver 11: every coordinate in a save is a coordinate into a map --
         The valley was rebuilt as somewhere you walk: the nine outdoor maps
         grew three to four times and gained seams at their edges, so S.px/py
         and every key in S.soil / S.felled / S.mined / S.picked names a
         square on a grid that has changed shape underneath it. A key left
         pointing at the wrong glyph is not a cosmetic problem — a soil key
         over a wall is a plot you can never reach and never clear.

         So this drops, rather than guesses. A square only keeps its state if
         it still names a tile of the kind that state belongs to: soil over
         ploughed ground (or over one of the two purchasable plots, which are
         plain grass until their flag is set), a felled stump over a tree, a
         mined vein over a vein, a picked flower over a flower. Nothing is
         relocated, because the map it was relocated *from* no longer exists
         and there is no honest answer to where it went.

         Reads the map rows directly rather than going through tileAt(): tileAt
         answers about the *live* S, and the save being healed is not it yet. */
      function healCoords(s, f) {
        const base = (mp, x, y) => {
          const m = BEK_MAPS[mp];
          return m && m.rows[y] ? m.rows[y].charAt(x) : '';
        };
        const walkable = (mp, x, y) => {
          const c = base(mp, x, y);
          return !!c && c !== 'D' && BEK_SOLID.indexOf(c) < 0;
        };
        /* ---- ver 14: a save taken halfway down the descent -------------
           A floor's rows are not in the save and never were — the run's seed
           and floor number are, and mine.js carves the same floor from them
           every time (which is the whole subject of `mine_check.js`'s
           determinism section). So a mid-run save resumes rather than being
           thrown away: the floor is carved again and registered before
           anything below asks whether the player is standing somewhere real.

           It resumes or it resets cleanly to the surface, and there is no
           third outcome. A run that does not agree with the map the player is
           on, a floor number out of range, a square that is no longer one you
           can stand on — all of them put you at the mouth of the mine in the
           gruva with the run dropped, which is a place that has been walkable
           since long before any of this and always will be.

           The dug table has to be consulted as well as the rows: a vein you
           broke is floor you can stand on, and it is 'O' in the rows the
           generator produced. Standing on one when you saved is ordinary. */
        let placed = false;
        if (isMineId(s.map)) {
          const r = s.run;
          const def = r && Number.isFinite(r.seed) && floorOf(s.map) === r.floor
            ? mineNear(r.seed, r.floor) : null;
          if (def && mineId(r.seed, r.floor) === s.map) {
            const dug = k => !!(r.dug && r.dug[k]);
            if (!walkable(s.map, s.px, s.py) && !dug(s.map + ':' + s.px + ',' + s.py)) {
              s.px = def.home[0]; s.py = def.home[1]; s.dir = 0;
            }
            placed = true;
          } else {
            s.run = null; mineForget();
            s.map = BEK_MINE_MOUTH.map; s.px = BEK_MINE_MOUTH.x; s.py = BEK_MINE_MOUTH.y - 1; s.dir = 0;
            placed = true;
          }
        } else if (s.run) {
          /* a run whose player is standing in the valley is a run that ended */
          s.run = null; mineForget();
        }
        /* a player standing off the edge of a map — or inside what is now a
           wall, or on a map id that no longer exists — wakes up at the farm */
        if (!placed && (!BEK_MAPS[s.map] || !Number.isFinite(s.px) || !Number.isFinite(s.py) ||
            !walkable(s.map, s.px, s.py))) {
          s.map = f.map; s.px = f.px; s.py = f.py; s.dir = f.dir;
        }
        /* the soil is the farm's, and its keys carry no map — a square is
           still soil if the rows say 'f' or if one of the field expansions
           covers it, whether or not that expansion has been bought yet */
        const inPlot = (x, y) => BEK_FARM_PLOTS.some(p => x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1);
        Object.keys(s.soil).forEach(k => {
          const [x, y] = k.split(',').map(Number);
          if (base('farm', x, y) !== 'f' && !inPlot(x, y)) delete s.soil[k];
        });
        /* a thing you placed whose square is not ground any more (the cabin became a small shack, and what stood in its old rooms is in the dark) goes back in the bag */
        Object.keys(s.placed).forEach(k => {
          const i = k.indexOf(':'), mp = k.slice(0, i), [x, y] = k.slice(i + 1).split(',').map(Number);
          if (!BEK_MAPS[mp] || isMineId(mp)) return;
          if (!walkable(mp, x, y)) { const rec = s.placed[k]; s.bag[rec.item] = (s.bag[rec.item] || 0) + 1; delete s.placed[k]; }
        });
        /* the three map-keyed tables, each against the glyphs it can sit on */
        const KINDS = { felled: 'YG', mined: 'OQ', picked: 'p' };
        Object.keys(KINDS).forEach(tbl => {
          Object.keys(s[tbl]).forEach(k => {
            const i = k.indexOf(':');
            const mp = k.slice(0, i), [x, y] = k.slice(i + 1).split(',').map(Number);
            /* a key naming a map that does not exist. `base` answers '' there,
               and String.indexOf('') is 0 — which is >= 0, so the test below
               would KEEP it. These three tables only ever name authored maps
               (the descent keeps its own dug squares in S.run, which dies with
               the run), so anything else in here is already wrong. */
            if (!BEK_MAPS[mp]) { delete s[tbl][k]; return; }
            if (KINDS[tbl].indexOf(base(mp, x, y)) < 0) delete s[tbl][k];
          });
        });
        /* a morning's forage lying in rock. spawnDrops() lays a fresh set
           every day anyway, so dropping these costs a stale save nothing. */
        s.drops = s.drops.filter(d => d && walkable(d.map, d.x, d.y));
        /* a placed keg/jar sits on the farm's own plain grass, key-shaped
           like S.soil but with no map prefix — same reasoning as the soil
           prune above, minus the field-expansion exemption a preserve was
           never offered to place inside */
        Object.keys(s.presv || {}).forEach(k => {
          const [x, y] = k.split(',').map(Number);
          if (base('farm', x, y) !== 'g') delete s.presv[k];
        });
        /* an owned animal stands in a pen slot, and the pen moved with the
           farm — re-seat each one at the slot its purchase order gives it */
        const slots = barnSlots(s);
        s.animals.forEach((a, i) => { if (slots[i]) { a.x = slots[i].x; a.y = slots[i].y; } });
      }

      let mode = '', dlg = null, shop = null, craft = null, fish = null, chop = null, nap = null, note = '', noteT = 0, travel = null, offer = null, loft = null;
      /* FURNISHING: `place` is `{ item, kind, x, y, rot }` while mode ===
         'place', else null — see startPlace()/confirmPlace() and the
         `mode === 'place'` keydown block below. */
      let place = null;
      /* the heart event currently playing, or null — a run object out of
         scene.js, transient by definition (it holds the square the player
         came from, and that must not survive a reload). The scene draws
         through the same `dlg` box every conversation uses; this is only
         what says which beat is showing and who is standing where. */
      let scene = null;
      /* People a heart event has sent home, still on their way (id -> walker), and the words hanging over somebody's head:
         transient, like the scene itself, and for the same reason. */
      const leaving = new Map();
      let bubbles = [], sceneCool = 0;
      /* the quest board's scroll offset — transient UI state, reset each time
         the board opens, never saved (see qScroll's use in menus.js) */
      let qScroll = 0;
      /* GIFTING: the item currently held out, and the bag's own cursor over
         it — both transient UI state, like qScroll above, never saved.
         giftSel survives the bag closing (so picking an item, closing the
         bag and walking up to someone still offers it), and is cleared once
         it is actually given — see talkTo()'s gift branch below. */
      let giftSel = null, bagCur = 0;
      /* ---- the swing ------------------------------------------------------
         Transient by definition — it must not survive a reload and it must
         not appear in a save, so it lives here beside `fish` and `note` and
         never in `S`. `bufAct` is the buffered next input: pressing again
         during a swing queues the action rather than dropping it, so holding
         the key still chops at the rate the animation allows. */
      let swing = null, bufAct = false, shake = 0, tiredSaid = {};
      /* The SAVE button still exists, but nothing should be lost by closing a
         window, so the valley writes itself down every few seconds and again
         on the way out. */
      let autoT = 0, scanT = 0;
      function autoSave() {
        if (!S) return;
        try { S.lang = BEK_LANG; localStorage.setItem(BEK_SAVE, JSON.stringify(S)); } catch (e) {}
      }
      let alive = true, raf = null, last = 0;
      const keys = Object.create(null);
      /* walking (stride.js): the direction keys held, the time banked towards the next tile, and the picture of the walk between two */
      const steer = createSteer(), stride = createStride(BEK_STEP_S, BEK_TURN_S), slide = createSlide(BEK_STEP_S, BEK_T_SRC);
      let me = { x: 0, y: 0, sliding: false };                     /* where the player is *shown*, in tiles: set once a frame by camTrack() */

      /* ---- helpers ------------------------------------------------------ */
      const M = () => BEK_MAPS[S.map];
      const rkey = (mp, x, y) => mp + ':' + x + ',' + y;
      const key = (x, y) => x + ',' + y;
      /* both pen tiers, tileAt() checks each the same way — see
         BEK_BARN_PLOT2 (data.js) for why a second region rather than a
         bigger first one */
      const BARN_PLOTS = [BEK_BARN_PLOT, BEK_BARN_PLOT2];
      /* the greenhouse's own rect — read by tileAt() (the overlay) and by
         plant() (the one thing standing inside it is exempt from) */
      const inGreenhouse = (x, y) => x >= BEK_GREENHOUSE_PLOT.x0 && x <= BEK_GREENHOUSE_PLOT.x1 &&
                                      y >= BEK_GREENHOUSE_PLOT.y0 && y <= BEK_GREENHOUSE_PLOT.y1;
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
        /* the descent's own broken veins. Same key shape as S.mined and a
           different table, because these do not expire against S.day: a floor
           is consumed for the run and the next run carves a different floor,
           so there is nothing a day counter could mean down there. Guarded on
           S.run first so the surface pays nothing for it — tileAt is asked
           about every square of the map on every cache rebuild. */
        if (S.run && S.run.dug[rkey(mp, x, y)]) return 'g';
        if (S.picked[rkey(mp, x, y)] > S.day) return ',';
        /* the two purchasable field expansions — an unlocked-region flag
           read over the farm map's own rows, never a second map */
        if (mp === 'farm') {
          for (let i = 0; i < BEK_FARM_PLOTS.length; i++) {
            const p = BEK_FARM_PLOTS[i];
            if (S.flag[p.flag] && x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1) return 'f';
          }
          /* the greenhouse — a fourth such region, same mechanism, same
             overlay-not-replace rule. See inGreenhouse() below for the one
             other place this rect is read (plant()'s season gate). */
          if (S.flag.greenhouse && inGreenhouse(x, y)) return 'f';
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
        if (BEK_SOLID.indexOf(c) >= 0) return true;
        /* FURNISHING: the one deliberate exception to "decor never changes
           walkability" — a placed gjerde/grind is a real barrier, the same
           way placement.js's connectivityOK() already treats it when
           deciding whether a placement is allowed in the first place. Every
           other placed kind (all the indoor furniture, every other outdoor
           kind) never reaches this: PLACE_BLOCKS names only these two. */
        const rec = S.placed[rkey(mp, x, y)];
        return !!(rec && PLACE_BLOCKS[rec.kind]);
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
      /* ten more places in the sekk: HOLYC.EXE's quiet gift (kernel/buffs_core.js 'bekkedal_bag'). Worked out each time, never added into the save, so it is a gift and not a number that could be counted twice. */
      const gift = buffs();
      const bagLimit = () => S.bagCap + (gift.has('bekkedal_bag') ? 10 : 0);
      function gainCapped(id, n) {
        if (bagTotal() >= bagLimit()) { say(TX('SEKKEN ER FULL.', 'BAG IS FULL.')); deny(); return false; }
        add(id, n || 1); return true;
      }
      /* One counter and one derived level per gathering activity, levels
         0..3 at XP_STEP apart. Each level's effect is applied at its own
         call site (spend(), the harvest/mine/forage/fish branches below)
         rather than here — this only owns the counting and the level-up. */
      /* XP_STEP is what decides where in the 6-10 hours the recipe gates and
         the arcs land. At 20 a first playthrough had all twelve levels inside
         Act I, which spent the whole progression before the house was up; at
         70 the four tracks finish across the first two seasons instead, one
         at a time, because a day's work in any one activity is thirty-odd
         XP rather than a hundred. See act2_check_balance.js's stage spread. */
      const XP_STEP = BEK_XP_STEP, XP_MAX_LVL = 3;
      /* and what a level is worth. Each one costs less energy at its own call
         site (spend(), the branches below) *and* adds to the bar — twelve
         levels is +60, which is the difference between a day that ends at
         noon and a day that runs to the evening. Handed over here rather than
         derived, the same one-shot way spineDonate() hands over its own
         grants: `lvl > S.lvl[kind]` fires exactly once per level. */
      const XP_LVL_STAMINA = BEK_XP_LVL_STAMINA;
      function addXp(kind, n) {
        S.xp[kind] = (S.xp[kind] || 0) + n;
        const lvl = Math.min(XP_MAX_LVL, Math.floor(S.xp[kind] / XP_STEP));
        if (lvl > (S.lvl[kind] || 0)) {
          const steps = lvl - (S.lvl[kind] || 0);
          S.lvl[kind] = lvl;
          S.enMax += XP_LVL_STAMINA * steps;
          S.en = Math.min(S.enMax, S.en + XP_LVL_STAMINA * steps);
          say(TX('NIVÅ OPP: ', 'LEVEL UP: ') + kind.toUpperCase() + ' ' + lvl +
              '  +' + (XP_LVL_STAMINA * steps) + TX(' UTHOLDENHET', ' STAMINA'));
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
      /* An NPC with `posts` (schedule.js) is placed by the clock rather than
         by their own static map/x/y — those stay their fallback (bjorn, who
         has no schedule, and every debug hook that just wants an NPC
         object). Object.assign layers the live map/x/y/walking/dir over a
         copy of the static entry, never mutating BEK_NPCS itself, and the
         S.map filter runs after, on the *computed* map — an NPC mid-walk
         between two posts on different maps would otherwise still show up
         here on the map they started from. */
      const npcCtx = () => ({ weather: S.weather, flag: S.flag, act2Unlocked: S.act2Unlocked });
      /* A heart event's cast is layered over the schedule's answer rather
         than beside it: somebody the scene places is *only* where the scene
         puts them, never also standing at the post the clock would give
         them. That is what lets a scene stand Håkon at the stave church, or
         Lars at his sister's dairy, without touching either man's posts. */
      /* Where everybody is, through `life.js` (a day's posts, the chores between them, asleep, off on an errand: an NPC who is
         not on any map is not in this list at all). Somebody a heart event is moving (`scene.walk`) or sending home
         (`leaving`) is where their walker is, at a real-time pace, which is why `x`/`y` are the tile they are on, for everything
         that asks which square somebody stands on, and `fx`/`fy` where they are drawn. */
      const dirToward = (n, tx, ty) => { const dx = tx - n.x, dy = ty - n.y; return Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0); };
      /* where everybody is, worked out once a game minute (life.js is a function of the whole minute, and several things ask
         every frame): the key is what the answer depends on */
      let lifeKey = '', lifeAt = new Map();
      const lifeOf = n => {
        const k = S.day + '|' + Math.floor(S.min) + '|' + S.weather + '|' + (S.flag.barn ? 1 : 0) + (S.act2Unlocked ? 1 : 0);
        if (k !== lifeKey) { lifeKey = k; lifeAt = new Map(); }
        let L = lifeAt.get(n.id);
        if (!L) { L = n.posts ? lifeFor(n, S.day, S.min, npcCtx()) : { map: n.map, x: n.x, y: n.y, walking: false, dir: 0, act: null }; lifeAt.set(n.id, L); }
        return L;
      };
      const npcsHere = () => {
        const walk = scene && scene.walk, out = [];
        BEK_NPCS.forEach(n => {
          if (n.from && S.day < n.from) return;
          const w = (walk && walk.get(n.id)) || leaving.get(n.id);
          if (w) {
            if (w.map === S.map) out.push(Object.assign({}, n, { map: w.map, x: Math.round(w.x), y: Math.round(w.y), fx: w.x, fy: w.y, walking: w.moving, dir: w.dir, act: null }));
            return;
          }
          const L = lifeOf(n);
          if (!L.map || L.map !== S.map) return;
          const m = Object.assign({}, n, L);
          /* whoever you are talking to turns to you and puts down what they were doing */
          if (dlg && dlg.npc && dlg.npc.id === n.id && !dlg.scene) { m.dir = dirToward(m, S.px, S.py); m.act = null; m.walking = false; }
          out.push(m);
        });
        return out;
      };
      /* Håkon's build and annex lines are spoken by him but reached through
         the lot sign and the menu funnel rather than through talkTo(), so
         they have no `npc` to hand. The dialogue panel names its speaker on
         a plate under their portrait now, which means a line that arrives
         without one loses its speaker outright — this is where they get it
         back, and it is why those lines no longer carry a 'HÅKON: ' of
         their own either. */
      const npcById = id => BEK_NPCS.filter(n => n.id === id)[0];
      const price = id => {
        let p = BEK_ITEMS[id].buy || 0;
        if (S.flag.rabatt) p = Math.round(p * 0.9);
        return p;
      };
      /* the crystal lamp is a lantern too — it is made *of* the mine, so it
         must never be the thing that keeps you out of it */
      const hasLamp = () => has('lykt') || has('krystallykt');
      /* THE LOFT adds the fourth `need` a way through can carry, and it is the
         only one that is not a thing in the bag: the storehouse on the square
         is shut until Act II has closed and Astrid trusts you with the key
         (spine.js's spineOpen, derived from S.act2Unlocked and S.fr.astrid and
         stored nowhere). Read here, set nowhere. */
      const gateOK = need => need === 'warm' ? has('ullgenser') : need === 'lamp' ? hasLamp() : need === 'boat' ? !!S.flag.boat : need === 'loft' ? spineOpen(S) : true;
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
        /* one letter of speech: a short square blip at the speaker's pitch, a little different for every letter so it babbles instead of buzzing */
        letter(base, c) { const j = (c.charCodeAt(0) * 7) % 9; Snd.tone(base * (0.82 + j * 0.05), 22, { type: 'square', vol: 0.016 }); },
        sel()    { Snd.tone(660, 22, { type: 'square', vol: 0.024 }); },
        choose() { Snd.tone(880, 30, { type: 'square', vol: 0.03 }); Snd.tone(1320, 40, { type: 'square', delay: 0.05, vol: 0.026 }); }
      };

      /* ---- who is talking, and how it sounds ---------------------------- */
      const voiceOf = npc => !npc ? 520 : npc.bear ? 110 : (npc.voice || 520);
      /* A line is said a letter at a time (typer.js), and each second letter is a blip at the speaker's pitch; the bear only growls, once. SPACE
         finishes a line that is still coming (dlgAdvance asks `typer.done()` first). One hook for every path that can put a line on
         screen: the frame notices the line, or the question, changed and starts saying it, so no caller has to remember. */
      const typer = createTyper();
      let spokeDlg = null, spokeIx = -1;
      function speechTick(dt) {
        if (mode !== 'talk' || !dlg) { spokeDlg = null; spokeIx = -1; return; }
        const ix = dlg.opts ? 'q' : dlg.i;
        if (spokeDlg !== dlg || spokeIx !== ix) {
          spokeDlg = dlg; spokeIx = ix;
          typer.reset(T(dlg.opts ? dlg.opts.q : dlg.lines && dlg.lines[dlg.i]) || '');
          if (dlg.npc && dlg.npc.bear) { sfx.bear(); typer.skip(); return; }
          if (!dlg.npc) { /* narration: a quiet tick as each line comes, no voice */ }
        }
        const voice = dlg.npc ? voiceOf(dlg.npc) : 0;
        typer.step(dt).forEach(c => { if (voice) sfx.letter(voice, c); });
      }

      /* ---- five songs, on rotation --------------------------------------
         The tunes and the crossfading scheduler live in music.js. They are
         the one thing in this file that was neither engine nor drawing, and
         a hundred and fifty lines of note tables was most of what stood
         between index.js and the file-size rule. `createSongs` takes the
         handful of things it needs from here and nothing else. */
      const Song = createSongs({
        studio: () => ctx.studio,
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
        hearths: hearthsOf,
        player: () => ({ px: (S.px + 0.5) * BEK_T, py: (S.py + 0.5) * BEK_T })
      });

      /* The hearths, for the ambience's positional crackle. It reads
         `lightSources` rather than a second table of fire positions — but it
         asks about the whole map and the ambience ticks every frame, so
         scanning every square sixty times a second to find tiles that cannot
         move inside a map would be a real cost for no information. A `v` is
         map data, so the answer is taken once per map. */
      let hearthMemo = { map: '', list: [] };
      function hearthsOf() {
        if (hearthMemo.map !== S.map)
          hearthMemo = { map: S.map,
                         list: lightSources(1).filter(s => s.hearth).map(s => ({ px: s.px, py: s.py })) };
        return hearthMemo.list;
      }

      /* ---- the day ------------------------------------------------------ */
      /* Where the travel menu sets you down — and, because openTravel() reads
         this table to build its list, which two places it will still take you
         to at all. The valley floor is walked now: the farm, the town, the
         water, the wood and the meadow all join along whole runs of their own
         edges (the seams in maps.js), and a menu row for any of them would be
         a way of not playing the game. The setra and the vidda are what the
         menu was always honest about — they are up the mountain, the track is
         hours of it, and the −10 energy and +40 minutes is that walk. You
         still have to climb it once on your own feet before the row appears,
         since the list is filtered by S.disc. Sigrid and Gunnar say as much
         (BEK_TALK). */
      const BEK_HOME = { setra: [10, 6], vidda: [20, 14] };
      /* THE MAP lists every place outdoors: the ones you have been to are open and take you there for a cost by how far it is, the rest are shut ("???") until you
         have walked into them once, and a place behind a gate (the vidda's cold, the mine's dark) is as shut to the map as it is to the road. Where it sets you down
         is the square a neighbouring map's seam lands you on (the setra and the vidda keep the two squares they always had). */
      const MAP_PLACES = Object.keys(BEK_MAPS).filter(m => !BEK_MAPS[m].inside && !isMineId(m) && BEK_WORLD.at[m]);
      function landing(m) {
        if (BEK_HOME[m]) return BEK_HOME[m];
        for (const id of Object.keys(BEK_MAPS)) { const e = (BEK_MAPS[id].exits || []).find(x => x.to === m); if (e) return [e.tx, e.ty]; }
        return null;
      }
      function gateInto(m) {
        for (const id of Object.keys(BEK_MAPS)) { const e = (BEK_MAPS[id].exits || []).find(x => x.to === m && x.need); if (e) return e; }
        return null;
      }
      /* tiles between the middles of two places, off where the seams put them (maps.js BEK_WORLD) */
      function mapDist(a, b) {
        const mid = id => { const at = BEK_WORLD.at[id], c = mapCols(id), r = mapRows(id); return [at[0] + c / 2, at[1] + r / 2]; };
        const p = mid(a), q = mid(b);
        return Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]);
      }
      function mapCost(a, b) {
        if (b === 'setra' || b === 'vidda') return { en: 10, min: 40 };         /* up the mountain: hours of climbing, as it always was */
        const d = mapDist(a, b);
        return { en: Math.min(10, Math.floor(d / 14)), min: Math.max(10, Math.round(d * 0.5)) };
      }
      function mapList() {
        const list = MAP_PLACES.filter(m => m !== S.map && landing(m)).sort((a, b) => mapDist(S.map, a) - mapDist(S.map, b));
        const names = list.map(m => {
          if (!S.disc[m]) return TX('??? — IKKE FUNNET ENNÅ', '??? — NOT FOUND YET');
          const c = mapCost(S.map, m);
          return T(BEK_MAPS[m].title) + '   ' + TX('−' + c.en + ' ENERGI ', '−' + c.en + ' EN ') + '+' + c.min + TX(' MIN', ' MIN');
        });
        return { list: list, names: names, sel: 0 };
      }
      /* S.disc is "places you have been", read by the travel menu and by about
         a dozen chat lines. A floor of the descent is not a place in that
         sense — its id carries a run seed, so every one of them would be a new
         key that never matches anything again, and the save would grow a row
         for every floor of every descent ever made. What the mine keeps
         instead is S.deepest, which is one number. */
      function markDisc(m){ if (BEK_MAPS[m] && !BEK_MAPS[m].inside && !isMineId(m)) S.disc[m] = 1; }

      /* ---- a descent, start to finish ------------------------------------
         Every way into and out of a floor is an ordinary `exits` entry, which
         is the point — `move()` has travelled that way since the seams landed
         and needed no new mechanism for a ladder. The cost of that is that
         `move()` does not tell anybody where it went, so the run's own state
         is reconciled against whichever map the player is standing on, once a
         frame, here. One place, and every route through it — a ladder, a
         hoist, the travel menu, a load, waking up on the farm — comes out
         right without any of them knowing the mine exists. */
      function mineSync() {
        if (S.run && isMineId(S.map)) {
          const f = floorOf(S.map);
          if (f === S.run.floor) return;
          S.run.floor = f;
          if (f > S.deepest) S.deepest = f;      /* the shortcut, earned */
          mineNear(S.run.seed, f);
          return;
        }
        /* out of the mine: by the hoist, by floor 1's ladder, by the menu, or
           because a load put the player somewhere else entirely */
        if (S.run || isMineId(S.map)) mineEnd();
      }
      function mineEnd() {
        if (isMineId(S.map)) {
          S.map = BEK_MINE_MOUTH.map; S.px = BEK_MINE_MOUTH.x; S.py = BEK_MINE_MOUTH.y - 1; S.dir = 0;
        }
        mineDrop(); terrDirty();
      }
      /* Which floors the hoist at the mouth will drop you at: the top of the
         mine, and every station you have reached. This is the whole of the
         shortcut — reach floor 10 once and you never walk floors 1 to 9 again
         — and it is why S.deepest is the one thing a run leaves behind. */
      function mineStations() {
        const out = [1];
        const deep = Math.min(S.deepest, MINE_MAX);
        for (let f = MINE_STATION; f <= deep; f += MINE_STATION) out.push(f);
        /* THE LOFT: the mountain wing pays out the rest of the ladder. Not
           every floor — the hoist's list is drawn on the travel sign and forty
           rows would not fit it — but the one floor that matters, the deepest
           you have actually got to, so the walk from the last station down to
           where you turned back stops being something you do twice. One extra
           row, and only when it is not already a station. */
        if (spineHoistEveryFloor(S) && deep > 1 && deep % MINE_STATION !== 0) out.push(deep);
        return out;
      }
      /* A new run: a new seed, so the floors are not the floors you saw last
         time. Math.random() is the one un-seeded thing in the whole mine, and
         it is un-seeded exactly once — everything below this line is a pure
         function of the number it returns. */
      function mineStart(floor) {
        mineForget();
        const seed = (Math.random() * 0xffffffff) >>> 0;
        S.run = { seed: seed, floor: floor, dug: {} };
        const def = mineNear(seed, floor);
        S.map = mineId(seed, floor); S.px = def.home[0]; S.py = def.home[1]; S.dir = 0;
        if (floor > S.deepest) S.deepest = floor;
        terrDirty(); sfx.step(tileAt(S.map, S.px, S.py)); say(T(def.title));
      }
      /* Walking into the alcove at the mouth (BEK_MINE_MOUTH). Straight down
         until you have found a station; the hoist's list after that. No gate
         of any kind: the mine wants a hakke to be worth anything, but a wall
         is not how this game says so — Lars is. */
      function enterMine() {
        const st = mineStations();
        if (st.length < 2) { mineStart(1); return; }
        travel = { list: st, sel: 0, lift: 1, names: st.map(mineTitle),
                   title: UI.hoist, hint: UI.hoistHint };
        mode = 'travel'; sfx.sel();
      }
      function dropAt(mp, item, tries, area) {
        for (let k = 0; k < (tries || 40); k++) {
          const x = (area ? area[0] : 1) + Math.floor(Math.random() * (area ? area[2] : mapCols(mp) - 2));
          const y = (area ? area[1] : 1) + Math.floor(Math.random() * (area ? area[3] : mapRows(mp) - 2));
          const t = tileAt(mp, x, y);
          if (!solid(mp, x, y) && t !== '.' && t !== 'P') { S.drops.push({ map: mp, x: x, y: y, item: item }); return; }
        }
      }
      /* The counts are a density, not a budget: the maps they are scattered
         over are three to four times the ground they used to be, so the old
         numbers would have left a morning's foraging as four mushrooms
         somewhere in eleven hundred squares. Roughly doubled, which keeps a
         walk through the wood about as rewarding per screen as it was and
         still leaves foraging the smallest of the four incomes. */
      function spawnDrops() {
        S.drops = [];
        const scatter = t => { for (let i = 0; i < t.n; i++) dropAt(t.map, t.item, t.tries, t.area); };
        BEK_FORAGE_DROPS.forEach(scatter);
        /* forage lvl2 — and the loft's wood wing, which pays out the same
           extra round rather than a second mechanism for it */
        if (S.lvl.forage >= 2 || spineForageBonus(S)) BEK_FORAGE_BONUS.forEach(scatter);
      }
      /* The rain waters the plots, all of them, the morning it falls: every tilled square in
         the open (a plot under glass is spared, a sprinkler's square is not a special case)
         is wet for the day, with or without anything growing in it, and the day's ageing
         counts it as watered. Called the moment the day's weather is rolled. */
      function rainOnPlots() {
        if (S.weather !== 'regn') return;
        Object.keys(S.soil).forEach(k => {
          const c = S.soil[k];
          if (!c.till) return;
          const [x, y] = k.split(',').map(Number);
          if (S.flag.greenhouse && inGreenhouse(x, y)) return;
          c.wet = 1;
        });
      }
      /* The night is over. `passedOut` is the clock reaching 02:00 on its own: you fell asleep where you stood, outdoors, and the
         day turns over round you (sleep.js: two fifths of the bar, a morning lost, a magpie). Otherwise you were in a bed. */
      function newDay(passedOut) {
        const night = nightOf(S.min, passedOut), had = S.kr;
        S.day++; S.min = night.wakeMin; chop = null; swing = null; tiredSaid = {};
        /* yesterday, closed out: the difference between the XP counters now
           and the mark stamped at the start of the day that just ended. The
           chat lines gated on `S.yst.*` (BEK_TALK) read this and nothing
           else, so "you were in the mine yesterday" is measured, never a
           flag somebody remembered to set. */
        Object.keys(S.xp).forEach(k => { S.yst[k] = (S.xp[k] || 0) - (S.xpDay[k] || 0); S.xpDay[k] = S.xp[k] || 0; });
        /* recomputed, never incremented — see the comment on fresh()'s own
           seed and on heal() above for why that is what keeps this from
           ever drifting off S.day */
        S.season = seasonIndexOf(S.day);
        S.festival = festivalOf(S.day) ? BEK_SEASONS[S.season].id : null;
        tro.newDay(S, night.kind);
        /* the repeatable quest board turns over as one batch on a fixed
           in-game weekday — see isRefreshDay()/refreshBoard() in quests.js.
           GIFTING's own weekly cap (BEK_GIFT_CAP) clears on the same day. */
        if (isRefreshDay(S.day)) { S.rq = refreshBoard(S, S.day); S.giftWeek = {}; }
        S.en = Math.max(1, Math.round(S.enMax * night.frac));
        S.water = S.waterMax; S.met = {};
        const rainy = S.weather === 'regn';
        Object.keys(S.soil).forEach(k => {
          const c = S.soil[k];
          if (!c.seed) { c.wet = 0; c.tend = 0; return; }
          /* the rain waters for you, plots under glass excepted (see rainOnPlots) */
          if (rainy) { const [rx, ry] = k.split(',').map(Number); if (!(S.flag.greenhouse && inGreenhouse(rx, ry))) c.wet = 1; }
          /* QUALITY: c.tend is a streak, not a total — it resets the moment
             a growing day passes unwatered, so `>= spec.days` at harvest
             means every single day was watered, never merely "most days".
             The streak survives a regrowing crop's own reset in the harvest
             branch above, which is the point: a jordbær kept watered every
             day it held the plot earns its grade continuously, not once. */
          if (c.wet) { c.age++; c.tend = (c.tend || 0) + 1; c.wet = 0; } else { c.tend = 0; }
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
            const nc = S.soil[nk] || (S.soil[nk] = { till: 0, wet: 0, seed: '', age: 0, ready: 0, fert: 0, tend: 0 });
            nc.wet = 1;
          });
        });
        /* the pen: fed yesterday raises affection and, past the first point
           of it, leaves produce waiting; unfed lets it drift back down and
           stops production — it never removes the animal. Same S.fr clamp
           as an NPC's friendship, keyed by the animal's own id. */
        S.animals.forEach(a => {
          if (a.fed) {
            S.fr[a.id] = Math.min(FR_MAX, (S.fr[a.id] || 0) + 1);
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
        rainOnPlots();
        spawnDrops();
        /* A run does not survive a night, and the mine gets no exemption from the 02:00 rule. What you keep is the bag you
           carried up and S.deepest; what you lose is the floor, which the next descent regenerates anyway. */
        if (S.run) mineDrop();
        if (passedOut) {
          /* where you fell. A floor of the descent is gone with the night, so you are at the mouth of it; anywhere else you
             wake on the very square you lay down on, and the magpie has had your pockets */
          if (S.run || isMineId(S.map)) mineEnd();
          const lost = pilfer(had); S.kr -= lost;
          sfx.sleep();
          say(TX('DAG ' + S.day + '. DU SOV PÅ BAKKEN. STIV OG KALD.', 'DAY ' + S.day + '. YOU SLEPT ON THE GROUND. STIFF AND COLD.') +
              (lost ? TX('  EN SKJÆRE TOK ' + lost + ' KR.', '  A MAGPIE TOOK ' + lost + ' KR.') : ''));
          return;
        }
        /* You wake where you lay down. Asleep in a bed indoors, that is the room, on the square beside the bed you faced (nap.at), looking
           at it: it used to carry you out of the door and onto the yard track, which is not what waking up in your own bed is. A nap that
           was not in a bed (a bench, the ground) is not here: those are handled above or leave you where you stood. */
        const inBed = nap && nap.bed && nap.at && nap.at.map === S.map && M().inside;
        if (inBed) { S.px = nap.at.x; S.py = nap.at.y; S.dir = [[0, 1], [0, -1], [-1, 0], [1, 0]].findIndex(d => nap.at.x + d[0] === nap.bed.x && nap.at.y + d[1] === nap.bed.y); if (S.dir < 0) S.dir = 0; }
        else { S.map = 'farm'; S.px = 8; S.py = 8; S.dir = 0; }
        sfx.sleep();
        say(TX('DAG ' + S.day + '. ', 'DAY ' + S.day + '. ') + (inBed ? TX('DU VÅKNER I SENGA. ', 'YOU WAKE IN YOUR BED. ') : '') +
            (night.kind === 'late' ? TX('EN KORT NATT.', 'A SHORT NIGHT.')
             : S.weather === 'regn' ? TX('REGN I DAG.', 'RAIN TODAY.')
             : S.weather === 'take' ? TX('TÅKE I DAG.', 'FOG TODAY.') : TX('GOD MORGEN.', 'GOOD MORNING.')));
      }

      /* ---- sleeping, as a scene --------------------------------------------------
         The picture closes to black through the ordered dither, holds on the sleeper and the Zs while the day turns over (newDay
         runs at the middle of it, behind the dark) and opens on the morning. Input is ignored for the few seconds it takes, and the
         clock does not run. Nothing here is saved: a save made mid-scene is a save made at the same hour as before it began. */
      function startNap(passed) {
        dlg = null; shop = null; craft = null; offer = null; fish = null; chop = null; swing = null; bufAct = false;
        const f = facing(), bed = !passed && tileAt(S.map, f.x, f.y) === 'b' ? { x: f.x, y: f.y } : null;
        nap = { t: 0, passed: !!passed, bed: bed, at: { map: S.map, x: S.px, y: S.py }, woke: false };
        mode = 'nap'; steer.clear(); stride.reset();
        sfx.sleep();
      }
      function napTick(dt) {
        if (!nap) { mode = ''; return; }
        nap.t += dt;
        /* the day turns over once the picture is shut */
        if (!nap.woke && nap.t >= NAP.out + 0.35) { nap.woke = true; newDay(nap.passed); }
        if (nap.t >= NAP_TOTAL) { nap = null; mode = ''; }
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
      /* ---- felling: a rhythm (chop.js) ------------------------------------ */
      function startChop(glyph, f) {
        chop = newChop(glyph, S.axeLv, f.x, f.y, Math.random);
        say(TX('SLÅ NÅR MERKET ER I DET LYSE. SPACE', 'STRIKE WHEN THE MARK IS IN THE PALE. SPACE'));
      }
      function chopCancel() { chop = null; }
      function chopFinish(c) {
        chop = null; tro.felled(c);
        const n = c.glyph === 'G' ? 2 : 1;
        S.felled[rkey(S.map, c.x, c.y)] = S.day + (c.glyph === 'G' ? BEK_REGROW.gran : BEK_REGROW.birch);
        terrLater();
        if (!gainCapped('tommer', n)) return;
        say('+' + n + ' ' + iname('tommer') + (c.glances === 0 ? TX('  RENT SNITT!', '  CLEAN CUT!') : ''));
      }
      function chopSwing() {
        if (!chop || swing) return;
        const r = chopStrike(chop, Math.random);
        if (r === 'wait') return;
        const f = { x: chop.x, y: chop.y };
        startSwing('oks').fx = r === 'glance' ? 'sparks' : 'chips';
        if (r === 'glance') { deny(); say(TX('GLIPPET AV.', 'GLANCED OFF.')); return; }
        sfx.chop(); shake = r === 'heart' ? 5 : 3;
        if (chop.done) chopFinish(chop);
        else say(r === 'heart' ? TX('DYPT!', 'DEEP!') : TX('TREFF.', 'BITE.'));
      }
      const busy = () => !!swing;
      function facing() { const d = [[0,1],[0,-1],[-1,0],[1,0]][S.dir]; return { x: S.px + d[0], y: S.py + d[1] }; }
      /* Stand on the first walkable square next to a tile of `glyph`, facing
         it — the harness's vein()/water() debug hooks below both share this,
         so the pick's own vein search and the rod's own water search stay
         one implementation. */
      function standNear(glyph) {
        const D = [[0, 1], [0, -1], [-1, 0], [1, 0]];
        for (let y = 0; y < mapRows(S.map); y++) for (let x = 0; x < mapCols(S.map); x++) {
          if (tileAt(S.map, x, y) !== glyph) continue;
          for (let d = 0; d < 4; d++) {
            const nx = x - D[d][0], ny = y - D[d][1];
            if (solid(S.map, nx, ny)) continue;
            S.px = nx; S.py = ny; S.dir = d;
            return { at: [nx, ny], tile: [x, y] };
          }
        }
        return null;
      }
      function spend(n) {
        const cost = n + (S.en < 20 ? 1 : 0) + lateExtra(S.min);   /* tired hands work harder, and so does a body that should be in bed (sleep.js) */
        if (S.en < cost) { say(TX('FOR SLITEN. LEGG DEG.', 'TOO TIRED. GO TO BED.')); deny(); return false; }
        S.en -= cost; return true;
      }
      /* ---- QUALITY --------------------------------------------------------
         Three grades (0 normal, 1 good, 2 best) off a score of up to three
         controllable factors — fertiliser, a watering streak that never
         missed a day the crop needed one, and farm level 2 — never off luck.
         `c.tend` is a streak newDay() resets to 0 the moment a growing day
         passes unwatered (see newDay() below), so `>= spec.days` means every
         growing day of *this* planting was watered, not merely "watered
         recently". Kept off S.soil itself rather than a second table, per
         the brief: extend the shape that already tracks a plot's growth. */
      function cropGradeScore(c, spec) {
        let score = 0;
        if (c.fert) score++;
        if (spec && c.tend >= spec.days) score++;
        if (S.lvl.farm >= 2) score++;
        return score >= 3 ? 2 : score >= 1 ? 1 : 0;
      }
      const GRADE_TAG = ['', ' (G)', ' (B)'];
      /* farm level 3's second head. At 0.4 it stacked on top of the QUALITY
         markup and the level-1 energy saving, and a fully-upgraded field paid
         three times a fresh one — which is the same "one loop dominates"
         failure the pick had, only at the far end of the game instead of the
         near one. See act2_check_rates.js, which measures the spread at three
         stages rather than only at the start. */
      const FARM_LV3_DOUBLE = 0.2;
      /* ---- PRESERVES --------------------------------------------------
         Every crop feeds the same jam/wine, deliberately — the point is
         converting time and surplus into value, not a second economy of
         crop-specific vintages. S.presv is keyed like S.soil: `{x,y}` on
         the farm map, `{kind, item, day}` where `item` is '' while empty
         and `day` is the day it was last filled. */
      const PRESV_DAYS = BEK_PRESV_DAYS;
      const PRESV_OUT = { jar: 'syltetoy', keg: 'fruktvin' };
      function presvAct(pr) {
        if (pr.item) {
          /* THE LOFT: the farmstead wing takes a day off every keg and jar,
             read here rather than stored on the keg — a preserve already
             fermenting speeds up too, which is what "the loft knows how" is
             supposed to feel like */
          const left = PRESV_DAYS[pr.kind] - spinePresvDaysOff(S) - (S.day - pr.day);
          if (left > 0) { say(TX('IKKE FERDIG. ' + left + ' DAG(ER) IGJEN.', 'NOT READY. ' + left + ' DAY(S) LEFT.')); return; }
          const out = PRESV_OUT[pr.kind];
          if (!gainCapped(out, 1)) return;
          sfx.coin(); say('+1 ' + iname(out)); pr.item = ''; pr.day = 0; return;
        }
        const cropId = Object.keys(BEK_CROPS).map(c => BEK_CROPS[c].out).find(id => (S.bag[id] || 0) > 0);
        if (!cropId) { say(TX('INGEN AVLING Å LEGGE I.', 'NO CROP TO PUT IN.')); return; }
        add(cropId, -1); pr.item = cropId; pr.day = S.day; sfx.pick();
        say(TX('LA I ', 'PUT IN ') + iname(cropId));
      }
      /* a crop's own running grade average (S.cropGrade, EWMA over recent
         harvests) turns into the sell multiplier here — the one place
         BEK_ITEMS[id].sell is marked up for quality, so shopSell() and the
         repeatable board's questReward() read the same number. */
      function gradeMult(id) {
        const g = S.cropGrade[id];
        if (g == null) return 1;
        return g >= 1.5 ? BEK_GRADE_MULT[2] : g >= 0.5 ? BEK_GRADE_MULT[1] : BEK_GRADE_MULT[0];
      }
      const sellPrice = id => Math.round((BEK_ITEMS[id].sell || 0) * gradeMult(id));
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
          const c = S.soil[k] || (S.soil[k] = { till: 0, wet: 0, seed: '', age: 0, ready: 0, fert: 0, tend: 0 });
          if ((c.seed || c.till) && !c.wet) c.wet = 1;
        });
      }
      /* what bites, by water, weather, season and hour — BEK_FISH_WATERS
         (data.js) is the table, this is the one place that reads it. Called
         once at the cast (act()'s stang branch), not at landing, so the
         species — and so its own fight pattern — is known from the strike
         onward rather than sprung on the player after the reel is already
         won. */
      function pickFishSpecies(spotGood, bait) {
        const water = BEK_FISH_WATERS[S.map] || BEK_FISH_WATERS.lake;
        const seasonId = BEK_SEASONS[S.season].id;
        const lw = water.legendWhen;
        /* a legend only ever bites inside its own season/weather/hour
           window, and only once a year — S.legend[id] is the day it was
           last landed, and a year is four BEK_SEASON_DAYS */
        if (lw && seasonId === lw.season && S.weather === lw.weather &&
            S.min >= lw.h0 && S.min < lw.h1 &&
            S.day - (S.legend[water.legend] == null ? -Infinity : S.legend[water.legend]) >= BEK_SEASON_DAYS * 4)
          return water.legend;
        const rareChance = BEK_RARE_CHANCE + (spotGood ? 0.05 : 0) +
          (bait && bait.weight && bait.weight[water.rare] ? 0.05 : 0);
        if (Math.random() < rareChance) return water.rare;
        const weights = water.pool.map(p => {
          let w = p.w;
          const wm = water.weather[S.weather]; if (wm && wm[p.id]) w *= wm[p.id];
          const sm = water.season[seasonId]; if (sm && sm[p.id]) w *= sm[p.id];
          if (bait && bait.weight && bait.weight[p.id]) w *= bait.weight[p.id];
          /* the two dialogue-choice leanings (Ingrid's "for the calm",
             Olav's open sea) — folded in here rather than a second table
             for two flag-gated conditions */
          if (S.map === 'lake' && S.flag.fisk === 'ro' && p.id === 'laks') w *= 1.3;
          if (S.map === 'fjord' && S.flag.sea === 'hav' && p.id === 'makrell') w *= 1.4;
          return w;
        });
        const total = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        for (let i = 0; i < water.pool.length; i++) { r -= weights[i]; if (r <= 0) return water.pool[i].id; }
        return water.pool[water.pool.length - 1].id;
      }
      /* bait and tackle are consumed on cast, first match in the bag — same
         "spend from what you're carrying" rule act()'s own `r` (eat) key
         already uses. Two independent slots: bait shapes the bite itself
         (BEK_ITEMS[id].bait.bite/.weight), tackle shapes the fight that
         follows (.widen/.grace) — nothing stops both being held at once. */
      function pickBait() {
        for (const id of ['agn_reke', 'agn_mark']) if ((S.bag[id] || 0) > 0) { add(id, -1); return BEK_ITEMS[id].bait; }
        return null;
      }
      function pickTackle() {
        /* best first, same "first match in the bag" rule pickBait() above
           already follows — the steel reel is what the loft's water wing pays
           out and it should not have to be the only one you carry */
        for (const id of ['snelle_stal', 'snelle'])
          if ((S.bag[id] || 0) > 0) { add(id, -1); return BEK_ITEMS[id].bait; }
        return null;
      }
      function doorTravel(f) {
        if (S.map === 'lake' && S.built && f.x === 5 && f.y === 4) { S.map = 'lakehouse'; S.px = 11; S.py = 12; S.dir = 1; say(T(BEK_MAPS.lakehouse.title)); return true; }
        const d = M().door;
        /* a door may carry the same `need`/`why` a seam does (maps.js) — the
           loft's is the first one that does, and it is answered by the same
           gateOK() rather than by a second kind of lock */
        if (d && d.x === f.x && d.y === f.y) {
          if (d.need && !gateOK(d.need)) { say(T(d.why)); deny(); return true; }
          S.map = d.to; S.px = d.tx; S.py = d.ty; markDisc(d.to); say(T(BEK_MAPS[d.to].title)); return true;
        }
        const e = (M().exits || []).filter(e2 => e2.x === f.x && e2.y === f.y)[0];
        if (e) { if (e.need && !gateOK(e.need)) { say(T(e.why)); deny(); return true; } S.map = e.to; S.px = e.tx; S.py = e.ty; markDisc(e.to); say(T(BEK_MAPS[e.to].title)); return true; }
        return false;
      }
      /* the wall item over the square in front of you, if you are facing north at a piece of furniture that stands against it */
      function furnAbove(f) {
        if (S.dir !== 1 || !zonedMap(S.map)) return null;
        const prop = propMap.get(f.x + ',' + (f.y - 1)), win = !!roomWindowAt(S.map, f.x, f.y - 1);
        return (prop && FURN[prop.kind]) || win ? { prop: prop, win: win && !(prop && FURN[prop.kind]) } : null;
      }
      function act() {
        if (swing || chop) return;               /* one thing at a time */
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
        /* the things in a house that answer when faced (furniture_act.js): a prop on the square in front, or a window in the wall */
        { const fp = propMap.get(f.x + ',' + f.y), fw = roomWindowAt(S.map, f.x, f.y), env = { S: S, say: objectBox, sfx: sfx, TX: TX, light: () => lighting().dark };
          const fAct = (p, w) => { const done = furnitureAct(p, env, w); if (done) tro.used(w ? 'window' : p && FURN[p.kind] && FURN[p.kind].act); return done; };
          if ((fp || fw) && fAct(fp, !!fw)) return;
          /* facing the piece under a window or a clock (the sink, a nightstand, a counter): what hangs on the wall above it answers */
          const hi = furnAbove(f);
          if (hi && fAct(hi.prop, env, hi.win)) return; }
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
        /* the same chest glyph, answered by the map it is on: the farm's is
           the workshop, the loft's is the loft's own book. One glyph, two
           panels, no new tile. */
        if (t === 'K') { if (S.map === 'loftet') openSpine(); else openCraft(); return; }
        /* QUALITY: ash off any hearth, once a day — S.met is already the
           daily table every NPC's own "met today" bonus clears through
           newDay(), so this needed no field of its own. Free, the way
           filling the can at the well is free: the cost is that it is only
           once. */
        if (t === 'v') {
          if (S.met.aske) { say(TX('ASKEN ER TOM I DAG.', 'NOTHING LEFT TO RAKE TODAY.')); return; }
          S.met.aske = 1;
          if (gainCapped('aske', 1)) { sfx.pick(); say('+1 ' + iname('aske')); }
          return;
        }
        /* ---- PRESERVES: the keg and the jar, placed on plain farm grass
           the same way the sprinkler is placed with the can. Once down they
           are never spent — collect what finished, else deposit a crop and
           start the clock, else say how much longer it needs. */
        if (S.map === 'farm' && t === 'g') {
          const pk = key(f.x, f.y);
          const pr = S.presv[pk];
          if (pr) { presvAct(pr); return; }
          const kind = ['jar', 'keg'].find(id => has(id));
          if (kind) {
            if (!spend(1)) return;
            add(kind, -1); S.presv[pk] = { kind: kind, item: '', day: 0 };
            sfx.pick(); startSwing('hand');
            say(TX('SATTE UT ', 'SET DOWN ') + iname(kind));
            return;
          }
        }

        /* FURNISHING: facing a placed object with nothing else claiming the
           tile (door/chest/hearth/preserve/NPC/animal above have all
           already returned) picks it up and drops straight into placement
           mode holding it — see the section's own header above act(). */
        const pk = rkey(S.map, f.x, f.y);
        if (S.placed[pk]) {
          const rec = S.placed[pk];
          delete S.placed[pk]; terrDirty();
          add(rec.item, 1); sfx.pick();
          say(TX('PLUKKET OPP.', 'PICKED UP.'));
          startPlace(rec.item, f.x, f.y);
          return;
        }
        const tool = BEK_TOOLS[S.tool];
        /* `|| 0`, and it matters: an unpicked square has no entry at all, and
           `undefined <= S.day` is false, so before this every wildflower in
           the valley was permanently unpickable — which took Marit's bouquet
           quest, the bukett recipe and three entries of the loft's wood wing
           down with it. Found by walking the meadow in
           scripts/bekkedal_playtest.mjs, not by reading this line. */
        if (t === 'p' && (S.picked[rkey(S.map, f.x, f.y)] || 0) <= S.day) {   /* pick a wildflower */
          if (S.lvl.forage < 1 && !spend(1)) return;   /* forage lvl1: picking costs no energy */
          const kinds = ['blomst_bla', 'blomst_gul', 'blomst_ro'];
          const got = kinds[Math.floor(Math.random() * kinds.length)];
          if (!gainCapped(got, 1)) return;
          S.picked[rkey(S.map, f.x, f.y)] = S.day + BEK_REGROW.flower; terrLater(); sfx.pick(); addXp('forage', 1);
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
          /* a rising ring under the hook (water.js's own life() feature 5)
             reads as a better spot, and now is one: shorter wait, better odds */
          const spotGood = waterVar(S.map, f.x, f.y).feat === 5;
          const bait = pickBait(), tackle = pickTackle();
          const sp = pickFishSpecies(spotGood, bait);
          /* fish lvl1 and a carbon rod (rodLv 2) both find the hook sooner,
             same as a good spot or bait does */
          const waitCut = (S.lvl.fish >= 1 ? 0.4 : 0) + (S.rodLv >= 2 ? 0.2 : 0) +
            (spotGood ? 0.3 : 0) + (bait ? bait.bite || 0 : 0);
          startSwing('stang').then = () => {
            fish = { phase: 'wait', t: Math.max(0.2, 0.8 - waitCut + Math.random() * 1.6), sp: sp, tackle: tackle };
          };
          return;
        }
        if (tool.id === 'oks') {
          /* the STÅLØKS is a better axe on a birch too, not only a licence
             for the big firs — one point less a swing, which is the same
             shape of tier reward the hakke's own mine-level saving is, and
             what keeps felling's upgraded rate level with the other four */
          const axeCut = S.axeLv >= 2 ? 1 : 0;
          /* The energy for the tree is paid once, here, as it always was; the tree itself now takes a few
             well-placed blows (chop.js), and comes down on the last of them (chopFinish). */
          if (t === 'Y') { if (!spend(Math.max(1, tool.e - axeCut))) return; startChop('Y', f); return; }
          if (t === 'G') {
            if (S.axeLv < 2) { say(TX('FOR STOR. Du trenger en STÅLØKS.', 'TOO BIG. You need a STEEL AXE.')); deny(); return; }
            /* a gran pays two tømmer, so it has to cost more than a birch or
               the STÅLØKS would double the felling rate outright rather than
               improve it — the same "the reward is the depth, not a free
               multiplier" rule the mine's own `dig` follows */
            if (!spend(Math.max(1, tool.e + OKS_GRAN_E - axeCut))) return; startChop('G', f); return;
          }
          say(TX('INGENTING Å FELLE.', 'NOTHING TO FELL.')); return;
        }
        if (tool.id === 'hakke') {
          if (t !== 'O' && t !== 'Q') { say(TX('INGEN ÅRE HER.', 'NO VEIN HERE.')); return; }
          if (!S.tools.hakke) { say(TX('DU HAR INGEN HAKKE.', 'YOU HAVE NO PICK.')); deny(); return; }
          if (t === 'Q' && S.pickLv < 2) { say(TX('RIK ÅRE. Trenger STÅLHAKKE.', 'RICH VEIN. Needs a STEEL PICK.')); deny(); return; }
          /* mine lvl1: the pick bites for less energy — and the rock gets
             harder the deeper it is (mine.js's bands, +0/+0/+1/+2 on top of
             the hakke's own 7). That is the whole of "depth is a cost": with
             a 120 bar a swing on floor 20 is nine, which is thirteen swings
             and the walk back to a hoist, and deciding when to turn round is
             the only decision a descent asks you to make. */
          const deep = mineHere();
          const pickCost = Math.max(1, tool.e + mineDig(deep) - (S.lvl.mine >= 1 ? 1 : 0));
          if (!spend(pickCost)) return;
          if (deep) {
            /* A floor of the descent does not regrow: it is consumed for the
               run, and the next run carves a different floor. So this goes in
               the run rather than in S.mined, where the day counter that
               makes a gruva vein come back has nothing to say. */
            S.run.dug[rkey(S.map, f.x, f.y)] = 1;
          } else {
            /* mine lvl2: a mined vein regrows a day sooner */
            const regrow = Math.max(1, BEK_REGROW.vein - (S.lvl.mine >= 2 ? 1 : 0));
            S.mined[rkey(S.map, f.x, f.y)] = S.day + regrow;
          }
          terrLater(); sfx.mine();
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
          /* And the one thing the surface has no source of at all. Deep, rich
             veins only, and decided by the square rather than by the swing —
             the same rule `oreKind` above it follows, and for the same reason:
             a square you come back to is the same square. */
          let got = '+' + oreQty + ' ' + iname(ore) + '  +1 ' + iname('stein');
          if (deep && t === 'Q' && mineGem(S.run.seed, deep, f.x, f.y) && gainCapped('krystall', 1)) {
            got = '+1 ' + iname('krystall') + '!  ' + got; tro.ore('krystall');
            swing.drop = BEK_ITEMS.krystall.col; sfx.coin();
          }
          say(got); return;
        }
        /* the soil tools */
        if (t !== 'f') { say(TX('IKKE HER.', 'NOT HERE.')); return; }
        const k = key(f.x, f.y);
        const c = S.soil[k] || (S.soil[k] = { till: 0, wet: 0, seed: '', age: 0, ready: 0, fert: 0, tend: 0 });
        if (c.ready) {
          const spec = BEK_CROPS[c.seed];
          if (!spend(1)) return;
          /* farm lvl3: a chance at a second head off the same plant */
          const qty = S.lvl.farm >= 3 && Math.random() < FARM_LV3_DOUBLE ? 2 : 1;
          if (!gainCapped(spec.out, qty)) return;
          /* QUALITY: fertiliser, a full watering streak and farm level 2
             each add a point; three grades off that score (0/1-2/3), see
             cropGradeScore() below. Folded into a running average per crop
             id (S.cropGrade) rather than a per-unit tag, so it feeds the
             sell price (sellPrice()), a gift's reaction bonus (talkTo()) and
             the repeatable board's reward (questReward()) without a second
             item id per crop per grade. */
          const grade = cropGradeScore(c, spec); tro.harvest(c.seed, grade);
          S.cropGrade[spec.out] = Math.min(2, Math.max(0, (S.cropGrade[spec.out] || 0) * 0.7 + grade * 0.3));
          sfx.pick(); addXp('farm', 1);
          startSwing('hand').drop = spec.col;
          say('+' + qty + ' ' + iname(spec.out) + GRADE_TAG[grade]);
          c.fert = 0; c.tend = 0;
          if (spec.regrow) {
            /* farm lvl2: a regrowing crop is ready a day sooner */
            const regrow = Math.max(1, spec.regrow - (S.lvl.farm >= 2 ? 1 : 0));
            c.ready = 0; c.age = spec.days - regrow;
          } else { c.seed = ''; c.age = 0; c.ready = 0; }
          return;
        }
        /* farm lvl1: the spade and the kanne both bite for less energy */
        const soilCost = Math.max(1, tool.e - (S.lvl.farm >= 1 ? 1 : 0));
        if (tool.id === 'spade') {
          /* QUALITY: a dose of gjødsel, held over a growing plot that has
             not had one yet, fertilises instead of tilling — the same
             "the tool held decides what the square means" convention the
             kanne's sprinkler placement already uses just below. */
          if (c.seed && !c.fert && has('gjodsel')) {
            if (!spend(1)) return;
            add('gjodsel', -1); c.fert = 1; sfx.till(); startSwing('spade');
            say(TX('GJØDSLET.', 'FERTILISED.')); return;
          }
          if (c.till) { say(TX('ALLEREDE SPADD.', 'ALREADY TURNED.')); return; } if (!spend(soilCost)) return; c.till = 1; sfx.till(); startSwing('spade'); return;
        }
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
            /* bare tilled soil takes water too: a plot is wet or dry whether or not
               anything is growing in it yet. Untilled ground is not a plot. */
            if (!c.till) { say(TX('SPA DET FØRST.', 'TURN IT FIRST — HOE.')); return; }
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
        /* the greenhouse ignores cropInSeason() entirely — see
           BEK_GREENHOUSE_PLOT (data.js) and inGreenhouse() above */
        const underGlass = S.map === 'farm' && inGreenhouse(f.x, f.y);
        if (!underGlass && !cropInSeason(BEK_CROPS[cropId], S.day)) {
          say(TX('IKKE SESONGEN FOR DEN. JORDA VIL IKKE HA DEN NÅ.', 'WRONG SEASON. THE GROUND WILL NOT TAKE IT NOW.'));
          deny(); return;
        }
        if (!spend(1)) return;
        add(seed, -1); c.seed = cropId; c.age = 0; c.ready = 0; c.fert = 0; c.tend = 0; sfx.pick();
        startSwing('hand', 'sprout');
        say(TX('SÅDDE ', 'PLANTED ') + iname(seed));
      }
      /* ---- the pen -------------------------------------------------------
         One button, same as everything else act() resolves, reading the
         animal's own state to decide what pressing it means right now:
         collect what is ready, else feed it for the day, else pet it once.
         Affection is S.fr[a.id] — the same 0..FR_MAX counter and the same
         Math.min(FR_MAX, ...) clamp every NPC's friendship already uses, raised
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
          S.fr[a.id] = Math.min(FR_MAX, (S.fr[a.id] || 0) + 1);
          sfx.pick(); say(TX('MATET ', 'FED ') + T(spec.name));
          return;
        }
        if (!a.pet) {
          a.pet = 1; S.fr[a.id] = Math.min(FR_MAX, (S.fr[a.id] || 0) + 1);
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

      /* ---- heart events --------------------------------------------------
         The three gates a scene has to pass are scene.js's; what lives here
         is how one *begins*, which used to be a jump cut. Starting a scene
         stood the player on a square of its own and the cast on theirs, so you
         were somewhere and then you were somewhere else, with people who had
         not been there. Now nobody is moved but the people who have
         something to say: whoever is a long way off calls out where they stand
         (the bubble over their head, and a blip in their own voice), then they
         come over, at a run, along the ground, to the square beside you; the
         ones who are not on this map at all come in by their own front door
         or by the way on to the map furthest from you. When they are beside
         you the box opens where *you* are standing, and when it is over they
         walk away again, home, or off the map by the nearest way out.

         The clock is held from the moment it starts (tickClock) and nothing is
         marked as seen until the last beat has been read, so a scene the
         player walks out of, or that cannot find its way to them, simply
         stands down and tries again a little later. Checked every frame the
         player is not in a menu, which is what makes walking up to a place the
         trigger rather than only the doorway of it. */
      function sceneWatch() {
        if (mode || dlg || fish || swing || S.ending || scene || sceneCool > 0) return;
        const def = sceneFor(BEK_SCENES, S);
        if (def) sceneStart(def);
      }
      /* where somebody is on this map at this minute if they are on it at all, else where they would come in from */
      function sceneStartTile(id) {
        const n = BEK_NPCS.filter(q => q.id === id)[0];
        const here = n && npcsHere().filter(q => q.id === id)[0];
        if (here) return { x: here.x, y: here.y };
        const home = n && n.posts ? n.posts.filter(q => q.id === 'home')[0] : null;
        return comesIn(S.map, home, { x: S.px, y: S.py });
      }
      function sceneStart(def) {
        const run = beginScene(def, S);
        run.walk = new Map(); run.t = 0; run.phase = 'walk'; run.retarget = 0;
        const ids = sceneCast(run).map(c => c.id);
        const lead = (def.beats[0] && def.beats[0].who) || def.npc;
        if (ids.indexOf(lead) < 0) ids.unshift(lead);
        const taken = new Set([S.px + ',' + S.py]);
        let ok = true;
        const first = {};
        ids.forEach(id => {
          const at = sceneStartTile(id);
          if (!at) { ok = false; return; }
          first[id] = at;
          run.walk.set(id, makeWalker(id, S.map, at.x, at.y));
        });
        if (!ok) { sceneCool = 20; return; }
        /* the lead stops beside you, the rest beside the lead */
        const spot = beside(S.map, S.px, S.py, first[lead], taken);
        if (!spot) { sceneCool = 20; return; }
        taken.add(spot.x + ',' + spot.y);
        run.spot = spot; run.lead = lead;
        if (!sendTo(run.walk.get(lead), spot.x, spot.y)) { sceneCool = 20; return; }
        ids.forEach(id => {
          if (id === lead) return;
          const s2 = beside(S.map, spot.x, spot.y, first[id], taken);
          if (!s2) { run.walk.delete(id); return; }
          taken.add(s2.x + ',' + s2.y);
          if (!sendTo(run.walk.get(id), s2.x, s2.y)) run.walk.delete(id);
        });
        scene = run;
        /* a long way off, they call before they come */
        if (distance(run.walk.get(lead), S.px, S.py) > FAR) {
          const n = npcById(lead), call = callFor(CALLS, def.id);
          bubbles.push({ id: lead, text: call, t: 0 });
          if (n) sfx.blip(voiceOf(n), 6, def.id.length % 5);
        }
      }
      /* once a frame while the cast is on its way */
      function sceneTick(dt) {
        const run = scene;
        if (!run || run.phase !== 'walk') return;
        run.t += dt;
        if (S.map !== run.def.map || run.t > 16) { sceneStandDown(); return; }
        run.walk.forEach(w => stepWalker(w, dt, RUN));
        /* you may keep walking: the one who is coming follows */
        run.retarget -= dt;
        const lead = run.walk.get(run.lead);
        if (run.retarget <= 0 && lead) {
          run.retarget = 0.5;
          if (Math.hypot(run.spot.x - S.px, run.spot.y - S.py) > 1.9) {
            const taken = new Set([S.px + ',' + S.py]);
            const sp = beside(S.map, S.px, S.py, { x: Math.round(lead.x), y: Math.round(lead.y) }, taken);
            if (sp) { run.spot = sp; sendTo(lead, sp.x, sp.y); }
          }
        }
        const ready = lead && distance(lead, S.px, S.py) <= MEET_R && lead.done;
        const company = [...run.walk.values()].every(w => w.done || distance(w, S.px, S.py) < 4.5);
        if (ready && company && !mode) {
          run.phase = 'talk';
          /* face one another: they to you, you to them */
          lead.dir = dirToward({ x: lead.x, y: lead.y }, S.px, S.py);
          S.dir = dirToward({ x: S.px, y: S.py }, lead.x, lead.y);
          bubbles = bubbles.filter(b => b.id !== run.lead);
          mode = 'talk'; sceneStep(); sfx.talk();
        }
      }
      /* it could not get to you in time, or you left: stand down and try again in a little while */
      function sceneStandDown() {
        if (!scene) return;
        sendHome(scene);
        scene = null; sceneCool = 30;
      }
      /* the cast walks away: to where the day has them if that is on this map, else off it by the nearest way out */
      function sendHome(run) {
        if (!run || !run.walk) return;
        const here = npcsHere();
        run.walk.forEach((w, id) => {
          const mine = BEK_NPCS.filter(q => q.id === id)[0];
          const L = mine && mine.posts ? lifeFor(mine, S.day, S.min, npcCtx()) : null;
          const dest = L && L.map === w.map ? { x: L.x, y: L.y } : nearestOut(w.map, { x: Math.round(w.x), y: Math.round(w.y) });
          if (dest && w.map === S.map && sendTo(w, dest.x, dest.y)) { w.leaving = !(L && L.map === w.map); leaving.set(id, w); }
        });
      }
      function sceneStep() {
        const b = sceneBeat(scene);
        dlg = { lines: b.lines.slice(), i: 0, npc: BEK_NPCS.filter(n => n.id === b.who)[0] || null,
                mood: b.mood, scene: 1 };
      }
      function sceneEnd() {
        const eff = sceneEffects(scene);
        S.seen[eff.seen] = 1;
        if (eff.flag) Object.assign(S.flag, eff.flag);
        if (eff.fr) S.fr[eff.npc] = Math.min(FR_MAX, (S.fr[eff.npc] || 0) + eff.fr);
        sendHome(scene);
        scene = null; dlg = null; mode = '';
      }
      /* the people who are walking home: step them, and let go of the ones who have arrived (or left the map) */
      function leavingTick(dt) {
        leaving.forEach((w, id) => { stepWalker(w, dt, 2.4); if (w.done) leaving.delete(id); });
      }
      /* words over a head: they last about two seconds and are drawn once the playfield is, in screen pixels */
      /* A word over the shoulder, the first time on a day you come within a few steps of somebody who is about (hellos.js). */
      const greeted = new Map();
      function greetWatch() {
        if (scene || nap) return;
        npcsHere().forEach(n => {
          if (n.bear || n.enter != null || greeted.get(n.id) === S.day || S.lastTalk[n.id] === S.day) return;
          if (Math.max(Math.abs(n.x - S.px), Math.abs(n.y - S.py)) > 3) return;
          greeted.set(n.id, S.day);
          bubbles.push({ id: n.id, text: helloFor(n.id, S.day, S.min, S.weather), t: 0 });
        });
      }
      function bubblesTick(dt) {
        if (!bubbles.length) return;
        bubbles.forEach(b => { b.t += dt; });
        bubbles = bubbles.filter(b => b.t < 2.4);
      }

      /* ---- talking ------------------------------------------------------ */
      const BEAR_LINES = [
        'PERKELE.',
        { no: '[Bjørnen feier plassen sin og nikker.]', en: '[The bear sweeps his clearing and nods.]' },
        { no: '[En lav lyd. Ikke helt et brøl. Nesten et hei.]', en: '[A low sound. Not quite a growl. Almost hello.]' },
        { no: '[Han rekker deg et bær. Du tar imot.]', en: '[He offers you a berry. You take it.]' },
        { no: '[Han går tilbake til feiingen. Kosten forklarer han aldri.]', en: '[He goes back to sweeping. The broom he never explains.]' }
      ];
      /* a thing in a room that answers is a small dialogue box with its name on it (furniture_act.js), not a line in the status bar */
      function objectBox(lines, label) {
        dlg = { lines: lines.slice(), i: 0, npc: null, label: label || null };
        mode = 'talk';
      }
      function talkTo(npc) {
        if (npc.bear) {
          sfx.bear(); tro.bear();
          const i = Math.floor(Math.random() * BEAR_LINES.length);
          dlg = { lines: [BEAR_LINES[i]], i: 0, npc: npc };
          mode = 'talk';
          if (i === 3) add('blabar', 1); else if (Math.random() < 0.2) add('tommer', 1);
          return;
        }
        const book = BEK_TALK[npc.id];
        if (!book) return;
        /* what they say first (greet.js): hello the first time today, hello again after that, and
           a remark if it has been days. Worked out before the day is stamped, and only spoken in
           front of an ordinary conversation: a quest turn-in or a gift has its own words. */
        const hello = greeting(npc.id, S);
        S.lastTalk[npc.id] = S.day;
        const q = BEK_QUESTS.filter(q2 => q2.who === npc.id && S.q[q2.id] === 'active')[0];
        if (q && Object.keys(q.need).every(id => has(id, q.need[id]))) {
          Object.keys(q.need).forEach(id => add(id, -q.need[id]));
          S.q[q.id] = 'done'; S.kr += q.kr;
          if (window.Economy) window.Economy.earn(questSun(q.kr), 'BEKKEDAL: ' + q.t.en);
          S.fr[npc.id] = Math.min(FR_MAX, S.fr[npc.id] + q.fr);
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
          dlg = { lines: [{ no: 'Takk. That is exactly it.', en: 'Thanks. That is exactly it.' }, rew], i: 0, npc: npc, mood: 'warm' };
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
          if (window.Economy) window.Economy.earn(questSun(rq.kr), 'BEKKEDAL: ' + questTitle(rq).en);
          sfx.coin();
          dlg = { lines: [{ no: 'Takk. That is exactly it.', en: 'Thanks. That is exactly it.' }, '+' + rq.kr + ' KR'], i: 0, npc: npc, mood: 'warm' };
          mode = 'talk'; return;
        }
        /* GIFTING: an item held out (giftSel) to this NPC — checked third,
           after both quest turn-ins above, so a gift and a turn-in never
           race for the same conversation (same reasoning the repeatable
           board's own turn-in already follows, running second after the
           fixed list: talk again to settle the other one). Only fires when
           an item is actually selected, so it never changes ordinary
           chatter when nothing is held out. */
        if (giftSel && npc.gift && has(giftSel, 1)) {
          const given = S.giftWeek[npc.id] || 0;
          /* THE LOFT: the people wing doubles what a week will take (spine.js's
             spineGiftCap, derived) — BEK_GIFT_CAP is still the floor and still
             the only number written down */
          if (given >= spineGiftCap(S)) {
            say(TX('DU HAR GITT NOK DENNE UKEN.', 'YOU HAVE GIVEN ENOUGH THIS WEEK.'));
            deny();
          } else {
            const g = npc.gift;
            const tier = g.loved.indexOf(giftSel) >= 0 ? 'loved'
                       : g.liked.indexOf(giftSel) >= 0 ? 'liked'
                       : g.disliked.indexOf(giftSel) >= 0 ? 'disliked' : 'neutral';
            /* QUALITY: a crop given at its best running grade lands a little
               harder — one more friendship point on a gift that already
               landed, never on a neutral or disliked one */
            const qBonus = (tier === 'loved' || tier === 'liked') && (S.cropGrade[giftSel] || 0) >= 1.5 ? 1 : 0;
            const delta = BEK_GIFT_FR[tier] + qBonus;
            add(giftSel, -1);
            S.giftWeek[npc.id] = given + 1;
            S.flag.gifted = 1; tro.gift(npc.id, tier);
            /* what they have been given is seen on them afterwards (looks.js), unless they did not want it */
            const worn = noteGift(S.look[npc.id], giftSel, tier);
            const shown = !!(worn && LOOKS[giftSel] && tier !== 'disliked');
            if (shown) S.look[npc.id] = worn;
            S.fr[npc.id] = Math.max(0, Math.min(FR_MAX, S.fr[npc.id] + delta));
            sfx.talk();
            const after = !shown ? [] : [LOOKS[giftSel].wear
              ? { no: '[Tar den på seg med en gang.]', en: '[Puts it on at once.]' }
              : { no: '[Holder den litt for seg selv.]', en: '[Keeps it close.]' }];
            dlg = { lines: g.reactions[tier].slice().concat(after), i: 0, npc: npc,
                     mood: tier === 'loved' ? 'warm' : tier === 'disliked' ? 'troubled' : undefined };
            mode = 'talk';
            giftSel = null;
          }
          return;
        }
        if (!S.met[npc.id]) { S.met[npc.id] = 1; S.fr[npc.id] = Math.min(FR_MAX, S.fr[npc.id] + 2); }
        const node = book.nodes.filter(n => !S.seen[npc.id + ':' + n.id] && (!n.when || n.when(S)))[0];
        if (node) {
          S.seen[npc.id + ':' + node.id] = 1;
          if (node.set) Object.assign(S.flag, node.set);
          if (node.give) Object.keys(node.give).forEach(id => add(id, node.give[id]));
          if (node.open && !S.q[node.open]) S.q[node.open] = 'active';
          dlg = { lines: hello.concat(node.lines), i: 0, npc: npc, mood: node.mood, ask: node.ask || null, buy: node.buy || null, node: node };
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
          dlg = { lines: hello.concat(pick.t), i: 0, npc: npc, mood: pick.mood, menu: 1, buy: pick.buy || null };
          /* and then it is your turn to say something (asks.js): a few things to bring up, and a way out; what you choose is remembered.
             An offer on the line (a bigger bag, a field) is made first and the list waits for the next visit. */
          if (!pick.buy) { const tm = topicMenu(book, npc.id, S, !!(book.shop || npc.id === 'hakon')); if (tm) { dlg.ask = tm; dlg.menu = 0; } }
        }
        sfx.talk(); mode = 'talk';
      }
      function dlgAdvance() {
        if (!dlg) { mode = ''; return; }
        if (!typer.done()) { typer.skip(); return; }           /* the line is still coming: SPACE brings the rest at once */
        if (dlg.opts) return;
        dlg.i++;                       /* speechTick() voices the new line */
        if (dlg.i < dlg.lines.length) return;
        /* a scene beat is checked ahead of every other ending a box can
           have: a beat carries no ask, no offer and no shop, and the next
           one may be a different speaker entirely */
        if (dlg.scene) { if (sceneAdvance(scene)) { sceneStep(); return; } sceneEnd(); return; }
        if (dlg.ask) { dlg.opts = dlg.ask; dlg.sel = 0; return; }
        if (dlg.next) { const nx = topicOf(BEK_TALK[dlg.npc.id], dlg.next); if (nx) { dlg = Object.assign({ i: 0, npc: dlg.npc, menu: 0 }, topicDialogue(BEK_TALK[dlg.npc.id], dlg.npc.id, nx)); return; } }
        /* The offer panel names its seller and the reply that follows draws
           their portrait, so the offer has to carry the speaker the line it
           came out of had. A copy rather than the content object itself:
           BEK_TALK is a static table and nothing may write to it. */
        if (dlg.buy) { offer = Object.assign({}, dlg.buy, { npc: dlg.npc }); mode = 'offer'; dlg = null; return; }
        if (dlg.menu && dlg.npc && !dlg.npc.bear) { openMenu(dlg.npc); return; }
        dlg = null; mode = '';
      }
      function dlgChoose() {
        const o = dlg.opts.opts[dlg.sel], npc = dlg.npc, book = npc && BEK_TALK[npc.id];
        sfx.choose();
        /* a way out of the list: to the counter, or just on */
        if (o.leave) { dlg = null; mode = ''; if (o.shop && npc) openMenu(npc); return; }
        /* something you bring up: they answer it (asks.js) */
        if (o.topic) {
          const t = topicOf(book, o.topic);
          if (!t) { dlg = null; mode = ''; return; }
          const d = topicDialogue(book, npc.id, t);
          if (!d.ask) S.mem[d.key] = 'said';                 /* a topic with no question in it is remembered as having been said */
          dlg = Object.assign({ i: 0, npc: npc, menu: 0 }, d);
          return;
        }
        if (o.set) Object.assign(S.flag, o.set);
        if (o.fr && npc) S.fr[npc.id] = Math.min(FR_MAX, S.fr[npc.id] + o.fr);
        if (o.give) Object.keys(o.give).forEach(id => add(id, o.give[id]));
        if (o.memKey) S.mem[o.memKey] = o.mem;               /* what you said is theirs to remember */
        else { const q = BEK_QUESTS.filter(q2 => q2.who === npc.id)[0]; if (q && !S.q[q.id]) S.q[q.id] = 'active'; }
        dlg = { lines: (o.reply || []).slice(), i: 0, npc: npc, mood: o.mood || dlg.mood, menu: 0, next: o.then || null };
        if (!dlg.lines.length) { dlg.i = -1; typer.skip(); dlgAdvance(); }
      }
      function openMenu(npc) {
        const book = BEK_TALK[npc.id];
        if (book && book.shop) { shop = { list: book.shop, sel: 0, side: 0, npc: npc }; mode = 'shop'; dlg = null; return; }
        if (npc.id === 'hakon') { hakonBuild(); return; }
        dlg = null; mode = '';
      }
      function doOffer() {
        const o = offer;
        if (S.kr < o.kr) { dlg = { lines: o.no.slice(), i: 0, npc: o.npc || null, mood: 'troubled' }; mode = 'talk'; offer = null; deny(); return; }
        S.kr -= o.kr;
        if (o.tool) S.tools[o.tool] = 1;
        if (o.axeLv) S.axeLv = Math.max(S.axeLv, o.axeLv);
        if (o.pickLv) S.pickLv = Math.max(S.pickLv, o.pickLv);
        if (o.rodLv) S.rodLv = Math.max(S.rodLv, o.rodLv);
        if (o.kanneLv) S.kanneLv = Math.max(S.kanneLv, o.kanneLv);
        if (o.waterMaxAdd) S.waterMax += o.waterMaxAdd;
        if (o.bagCapAdd) S.bagCap += o.bagCapAdd;
        if (o.bagTier) S.bagTier = Math.max(S.bagTier, o.bagTier);
        /* a flag-granting offer (the farm plot expansions) changes what
           tileAt() reads for the farm map, so the terrain cache must rebuild */
        if (o.flag) { Object.assign(S.flag, o.flag); terrDirty(); }
        sfx.coin();
        dlg = { lines: o.ok.slice(), i: 0, npc: o.npc || null, mood: 'warm' }; mode = 'talk'; offer = null;
      }

      /* ---- the lot, the house ------------------------------------------- */
      function lotSign() {
        if (S.built) { mode = 'end'; S.ending = 0; return; }
        if (S.q.tommer !== 'done') { dlg = { lines: [{no:'SKILT: TOMT TIL SALGS.',en:'SIGN: LOT FOR SALE.'}, {no:'Håkon i byen har papirene.',en:'Håkon in town holds the papers.'}], i: 0 }; mode = 'talk'; return; }
        if (!S.flag.lot) {
          if (S.kr < BEK_LOT_COST) { dlg = { lines: [{no:'SKILT: TOMT — ' + BEK_LOT_COST + ' KR.',en:'SIGN: LOT — ' + BEK_LOT_COST + ' KR.'}, {no:'Du har det ikke. Ikke ennå.',en:'You do not have it. Not yet.'}], i: 0 }; mode = 'talk'; return; }
          S.kr -= BEK_LOT_COST; S.flag.lot = 1; sfx.coin();
          dlg = { lines: [{ no: '[Du skriver under mot stolpen.]', en: '[You sign it against the post.]' }, {no:'Tomten er din: skog på tre sider, vann på den fjerde.',en:'The lot is yours: trees on three sides, water on the fourth.'}, 'Now it needs a house. Go and see Håkon.'], i: 0 };
          mode = 'talk'; return;
        }
        dlg = { lines: [{no:'Tomten din. Tom, foreløpig.',en:'Your lot. Empty, for now.'}], i: 0 }; mode = 'talk';
      }
      function hakonBuild() {
        if (S.built) { hakonTilbygg(); return; }
        const c = houseCost(S);
        const hak = npcById('hakon');
        if (!S.flag.lot) { dlg = { lines: ['Buy the lot first. Sign is by the water.'], i: 0, npc: hak, mood: 'troubled' }; mode = 'talk'; return; }
        if (S.kr < c.kr || !has('tommer', c.tommer) || !has('stein', c.stein)) {
          dlg = { lines: [{ no: c.kr + ' KR, ' + c.tommer + ' TØMMER, ' + c.stein + ' STEIN.', en: c.kr + ' KR, ' + c.tommer + ' TIMBER, ' + c.stein + ' STONE.' },
                          { no: 'Du har ' + S.kr + ' kr, ' + (S.bag.tommer||0) + ' tømmer, ' + (S.bag.stein||0) + ' stein.', en: 'You have ' + S.kr + ' kr, ' + (S.bag.tommer||0) + ' timber, ' + (S.bag.stein||0) + ' stone.' },
                          'Come back.'], i: 0, npc: hak, mood: 'troubled' }; mode = 'talk'; return;
        }
        S.kr -= c.kr; add('tommer', -c.tommer); add('stein', -c.stein); S.built = 1;
        S.fr.hakon = Math.min(FR_MAX, S.fr.hakon + 2); sfx.done();
        dlg = { lines: ['Right. Two weeks. Or one, if you carry.', '[Weeks of hammering go by. A chimney. Smoke.]', 'It is done. Go down to the water and see.'], i: 0, npc: hak, mood: 'warm' };
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
        const hak2 = npcById('hakon');
        if (!houseTierAvailable(S)) {
          /* the annex is either already standing, not yet earned, or
             already both — either way the greenhouse is the next thing
             Håkon has to offer once Act II is open, checked here rather
             than as a third branch of hakonBuild() itself */
          if (greenhouseAvailable(S)) { hakonGreenhouse(hak2); return; }
          /* FURNISHING: nothing left to build, so the carpenter's wares are
             furniture — same shop panel the other shopkeepers use, just
             opened from here rather than from BEK_TALK[npc].shop (which
             would hijack every conversation with him — see the `furniture`
             field's own comment, talk_town.js). Only offered once a house
             actually stands: there is nowhere to put a chair before then. */
          if (S.built) { shop = { list: BEK_TALK.hakon.furniture, sel: 0, side: 0, npc: hak2 }; mode = 'shop'; dlg = null; return; }
          dlg = { lines: [S.houseTier ? { no: 'Tilbygget står. Ikke mer å legge til.', en: 'The annex stands. Nothing more to add.' }
                                       : 'It is standing. Go and live in it.'], i: 0, npc: hak2, mood: 'warm' };
          mode = 'talk'; return;
        }
        const c = houseTierCost();
        if (S.kr < c.kr || !has('tommer', c.tommer) || !has('stein', c.stein)) {
          dlg = { lines: [{ no: 'Et tilbygg? ' + c.kr + ' KR, ' + c.tommer + ' TØMMER, ' + c.stein + ' STEIN.', en: 'An annex? ' + c.kr + ' KR, ' + c.tommer + ' TIMBER, ' + c.stein + ' STONE.' },
                          'Come back when you have it.'], i: 0, npc: hak2, mood: 'troubled' }; mode = 'talk'; return;
        }
        S.kr -= c.kr; add('tommer', -c.tommer); add('stein', -c.stein); S.houseTier = 1;
        S.fr.hakon = Math.min(FR_MAX, S.fr.hakon + 2); sfx.done(); terrDirty();
        dlg = { lines: [{ no: 'Et rom til, mot vannet. Det er ferdig.', en: 'One more room, facing the water. It is finished.' }], i: 0, npc: hak2, mood: 'warm' };
        mode = 'talk';
      }
      /* P20: the greenhouse — same shape as hakonTilbygg() above, priced and
         gated through progression.js's greenhouseCost()/greenhouseAvailable()
         rather than a hand-copied number. Independent of S.houseTier: it is
         its own late unlock, offered once Act II is open whether or not the
         annex has been bought. See BEK_GREENHOUSE_PLOT (data.js). */
      function hakonGreenhouse(hak2) {
        const c = greenhouseCost();
        if (S.kr < c.kr || !has('tommer', c.tommer) || !has('stein', c.stein)) {
          dlg = { lines: [{ no: 'Et drivhus? ' + c.kr + ' KR, ' + c.tommer + ' TØMMER, ' + c.stein + ' STEIN.', en: 'A greenhouse? ' + c.kr + ' KR, ' + c.tommer + ' TIMBER, ' + c.stein + ' STONE.' },
                          'Come back when you have it.'], i: 0, npc: hak2, mood: 'troubled' }; mode = 'talk'; return;
        }
        S.kr -= c.kr; add('tommer', -c.tommer); add('stein', -c.stein); S.flag.greenhouse = 1;
        S.fr.hakon = Math.min(FR_MAX, S.fr.hakon + 2); sfx.done(); terrDirty();
        dlg = { lines: [{ no: 'Glasset er satt. Det bryr seg ikke om årstiden.', en: 'The glass is set. It does not care what season it is.' }], i: 0, npc: hak2, mood: 'warm' };
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
        S.kr += sellPrice(id); add(id, -1); sfx.coin(); say(TX('SOLGTE ', 'SOLD ') + iname(id));
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
        if (bagTotal() + n <= bagLimit()) { add(id, n); return; }
        S.chest[id] = (S.chest[id] || 0) + n;
      }
      function recipeUnlocked(r) {
        if (r.fr && (S.fr[r.fr.npc] || 0) < r.fr.min) return false;
        if (r.lvl && (S.lvl[r.lvl.kind] || 0) < r.lvl.min) return false;
        /* THE LOFT: a recipe a finished wing pays out, gated exactly the way
           the two lines above gate on friendship and level — read-only, out of
           the recipe's own `spine` field (data.js), never set here */
        if (!spineRecipeOK(S, r)) return false;
        return true;
      }
      /* how many of a recipe the current combined stock can pay for right
         now — menus.js shows this so the panel reads as useful, not just a
         locked/unlocked list */
      function craftCount(r) {
        return Object.keys(r.need).reduce((m, id) => Math.min(m, Math.floor(stockOf(id) / r.need[id])), Infinity);
      }
      function openCraft() { craft = { side: 0, sel: 0 }; mode = 'craft'; sfx.talk(); }
      /* ---- THE LOFT ------------------------------------------------------
         The panel is a reader — every number on it comes back out of
         `spine.js`, which writes nothing — and `spineDonate()` below is the
         **one** function in this app that writes `S.spine`. Everything the
         spine pays out is either derived from what that function recorded
         (a recipe, the extra forage round, the hoist's stops, a day off a
         keg, the gift cap, the props in the room and on the square) or is a
         number claimed exactly once through `S.spine.m`. Nothing else,
         anywhere, sets a spine flag. See BEK_LOFT (data.js). */
      function openSpine() {
        if (!spineOpen(S)) { say(TX('LOFTET ER LÅST.', 'THE LOFT IS SHUT.')); deny(); return; }
        loft = { sel: 0 }; mode = 'loft'; sfx.talk();
      }
      function spineDonate() {
        const want = spineWants(S, id => (S.bag[id] || 0));
        if (!want.length) {
          say(TX('INGENTING Å GI I DAG.', 'NOTHING TO GIVE TODAY.'));
          deny(); return;
        }
        want.forEach(x => {
          if (x.e.item) add(x.e.item, -1);
          S.spine.d[x.e.id] = S.day;
          if (!S.spine.first) S.spine.first = S.day;
        });
        /* the milestones that hand over a number, once each. Everything else
           a milestone does is read back through spine.js and needs no record
           at all — see its header for why the split is where it is. */
        const got = spineClaimable(S);
        got.forEach(m => {
          if (m.grant.bagCap) S.bagCap += m.grant.bagCap;
          if (m.grant.enMax) { S.enMax += m.grant.enMax; S.en = Math.min(S.enMax, S.en + m.grant.enMax); }
          S.spine.m[m.id] = S.day;
        });
        sfx.done(); terrDirty();
        const p = spineProgress(S);
        say('+' + want.length + TX(' GITT — ', ' GIVEN — ') + p.have + '/' + p.need +
            (got.length ? '  ' + got.map(m => T(m.gt || m.t)).join(', ') : ''));
        /* and the second ending, on the gift that finishes the last wing. The
           house ending's own screen is untouched and still fires where it
           always did (the first night in the house by the water). */
        if (spineComplete(S) && !S.spine.done) {
          S.spine.done = S.day;
          loft = null; mode = 'loftend'; S.ending = 0;
          if (window.Economy) window.Economy.earn(LOFT_SUN, 'BEKKEDAL: THE LOFT');
        }
      }
      function doCraft() {
        const list = BEK_RECIPES[craft.side ? 'cook' : 'craft'];
        const r = list[craft.sel];
        if (!r) return;
        if (!recipeUnlocked(r)) { say(TX('OPPSKRIFTEN ER IKKE LÅST OPP ENNÅ.', 'RECIPE NOT UNLOCKED YET.')); deny(); return; }
        if (!Object.keys(r.need).every(id => hasStock(id, r.need[id]))) { say(TX('MANGLER RÅVARER.', 'MISSING INGREDIENTS.')); deny(); return; }
        Object.keys(r.need).forEach(id => spendStock(id, r.need[id]));
        craftGain(r.out, r.qty || 1); tro.crafted(r.id, !!craft.side);
        sfx.pick(); say('+' + (r.qty || 1) + ' ' + iname(r.out));
      }

      /* ---- FURNISHING: placement mode ------------------------------------
         Carrying a placeable item (BEK_ITEMS[id].place is the decor.js/
         decor_place.js kind it puts down) and pressing the bag's own SPACE
         opens this instead of the usual gift-hold toggle (see the `mode ===
         'bag'` keydown block below). Same input shape every other panel in
         this app already uses: WASD/arrows move the ghost by a tile, R
         rotates where BEK_PLACE_ROT says that means something, SPACE
         confirms, ESC cancels — never a new scheme.

         Picking a placed object back up is the same door in reverse: facing
         one and pressing act() (not inside any menu) lifts it back into the
         bag and drops straight into placement mode holding it, so "move
         it" is pick-up-then-place rather than a drag the player has to
         learn a second gesture for. See act()'s own `S.placed` branch. */
      function startPlace(itemId, x0, y0) {
        const kind = BEK_ITEMS[itemId] && BEK_ITEMS[itemId].place;
        if (!kind) return;
        /* Never in the descent (generated floors are torn down and
           regenerated between runs, so a coordinate there does not mean the
           same thing twice — see mine.js's own header) and never in the
           loft (spineProps already owns every tile of that room). Both are
           places nothing is ever placed by hand. */
        if (isMineId(S.map) || S.map === 'loftet') {
          say(TX('IKKE HER.', 'NOT HERE.')); deny(); return;
        }
        const wantIn = (BEK_PLACE_CAT[itemId] || 'in') === 'in';
        if (wantIn !== ins_()) {
          say(wantIn ? TX('DETTE HØRER HJEMME.', 'THIS BELONGS INDOORS.') : TX('DETTE HØRER UTE.', 'THIS BELONGS OUTDOORS.'));
          deny(); return;
        }
        const f = facing();
        place = { item: itemId, kind: kind, x: x0 != null ? x0 : f.x, y: y0 != null ? y0 : f.y, rot: 0 };
        mode = 'place'; dlg = null; shop = null; craft = null; sfx.sel();
      }
      function cancelPlace() { mode = ''; place = null; }
      function confirmPlace() {
        const mapDef = BEK_MAPS[S.map];
        const placedHere = placedHereObj(S.map);
        if (!canPlace(mapDef, placedHere, S.px, S.py, place.x, place.y, place.kind)) {
          tro.refused(mapDef, placedHere, S, place);
          say(TX('KAN IKKE STÅ DER.', "CAN'T STAND THERE."));
          deny(); return;
        }
        if (!has(place.item, 1)) { say(TX('HAR DEN IKKE LENGER.', 'NO LONGER HAVE IT.')); cancelPlace(); return; }
        add(place.item, -1);
        S.placed[rkey(S.map, place.x, place.y)] = { kind: place.kind, item: place.item, rot: place.rot || 0 };
        terrDirty(); sfx.done();
        say(TX('SATT NED.', 'PLACED.'));
        mode = ''; place = null;
      }

      /* ---- fast travel -------------------------------------------------- */
      function openTravel() {
        if (!BEK_WORLD.at[S.map]) { say(TX('GÅ UT FØRST.', 'GO OUTSIDE FIRST.')); return; }
        if (!Object.keys(S.disc).some(m => MAP_PLACES.indexOf(m) >= 0 && m !== S.map)) { say(TX('INGEN STEDER Å DRA ENNÅ. GÅ UT OG SE DEG OM.', 'NOWHERE TO GO YET. WALK OUT AND LOOK AROUND.')); return; }
        travel = mapList(); mode = 'travel';
      }
      function doTravel() {
        /* the hoist at the mouth. No energy: what the shortcut buys is that
           you do not walk floors 1 to 9 again, and the energy you save is
           energy you spend on the rock at the bottom, which is the point of
           it. Twenty minutes is what the ride costs, and the clock is the
           other half of the pressure the mine runs on. */
        if (travel.lift) {
          const f = travel.list[travel.sel];
          mode = ''; travel = null;
          if (!f) return;
          S.min += 20; mineStart(f);
          return;
        }
        const m = travel.list[travel.sel];
        if (!m) { mode = ''; travel = null; return; }
        if (!S.disc[m]) { say(TX('DU HAR IKKE VÆRT DER ENNÅ. GÅ DIT FØRST.', 'YOU HAVE NOT BEEN THERE YET. WALK THERE ONCE FIRST.')); deny(); return; }
        const gate = gateInto(m);
        if (gate && !gateOK(gate.need)) { say(T(gate.why)); deny(); return; }
        const cost = mapCost(S.map, m), home = landing(m);
        if (S.en < cost.en) { say(TX('FOR SLITEN TIL Å GÅ.', 'TOO TIRED TO WALK.')); deny(); return; }
        S.en -= cost.en; S.min += cost.min;
        S.map = m; S.px = home[0]; S.py = home[1]; S.dir = 0;
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
        if (mode === 'place') { cancelPlace(); return; }
        if (mode === 'travel') { travel = null; mode = ''; return; }
        if (mode === 'loft') { loft = null; mode = ''; return; }
        if (mode === 'bag' || mode === 'quest' || mode === 'sleep') { mode = ''; return; }
      }
      cv.addEventListener('keydown', e => {
        const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        if (k === 'F11') { e.preventDefault(); toggleFullscreen(); return; }
        keys[k] = true;
        { const wk = walkKey(e); if (wk && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) steer.press(wk.id, wk.dir); }
        if (k === ' ' || k === 'Tab' || String(k).indexOf('Arrow') === 0) e.preventDefault();

        /* the loft's ending closes back into the same save the house ending
           does — a second ending to a second thing, and play carries on past
           it exactly as it carries on past the first */
        if (mode === 'loftend') {
          if (k === ' ' || k === 'Enter') { mode = ''; Song.pickNext(true); }
          return;
        }
        if (mode === 'nap') return;                       /* asleep: nothing to press */
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
            if (k === ' ' || k === 'Enter') { if (!typer.done()) typer.skip(); else dlgChoose(); }
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
        if (mode === 'place') {
          if (k === 'w' || k === 'ArrowUp') place.y = Math.max(0, place.y - 1);
          if (k === 's' || k === 'ArrowDown') place.y = Math.min(ROWS() - 1, place.y + 1);
          if (k === 'a' || k === 'ArrowLeft') place.x = Math.max(0, place.x - 1);
          if (k === 'd' || k === 'ArrowRight') place.x = Math.min(COLS() - 1, place.x + 1);
          if (k === 'r' && BEK_PLACE_ROT[place.item]) { place.rot = place.rot ? 0 : 1; sfx.sel(); }
          if (k === ' ' || k === 'Enter') confirmPlace();
          if (k === 'Escape') cancelPlace();
          return;
        }
        if (mode === 'loft') {
          const n = BEK_LOFT.length;
          if (k === 'w' || k === 'ArrowUp') { loft.sel = (loft.sel + n - 1) % n; sfx.sel(); }
          if (k === 's' || k === 'ArrowDown') { loft.sel = (loft.sel + 1) % n; sfx.sel(); }
          if (k === ' ' || k === 'Enter') spineDonate();
          if (k === 'Escape' || k === 'l') closeMenu();
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
        if (mode === 'bag') {
          /* GIFTING: the bag doubles as the item picker — a cursor over the
             same grid drawBag() draws, moved the way the shop/craft panels
             already move theirs, with SPACE toggling the hovered item as
             the one held out (giftSel) rather than closing the panel, so
             the close keys move to Escape/i/q alone, same as those panels. */
          const ids = Object.keys(S.bag).filter(id => S.bag[id] > 0);
          if (ids.length) {
            if (k === 'w' || k === 'ArrowUp') bagCur = (bagCur - BAG_COLS + ids.length) % ids.length;
            if (k === 's' || k === 'ArrowDown') bagCur = (bagCur + BAG_COLS) % ids.length;
            if (k === 'a' || k === 'ArrowLeft') bagCur = (bagCur - 1 + ids.length) % ids.length;
            if (k === 'd' || k === 'ArrowRight') bagCur = (bagCur + 1) % ids.length;
            if (k === ' ' || k === 'Enter') {
              const id = ids[bagCur % ids.length];
              /* FURNISHING: a placeable item's own kind (a string) closes
                 the bag straight into placement mode rather than toggling
                 the gift hold — see startPlace()'s own header. */
              if (BEK_ITEMS[id].place && typeof BEK_ITEMS[id].place === 'string') {
                mode = ''; startPlace(id); return;
              }
              giftSel = giftSel === id ? null : id;
              sfx.sel();
              say(giftSel ? TX('HOLDER FRAM: ', 'HOLDING OUT: ') + iname(giftSel) : TX('LA VEKK GAVEN.', 'PUT THE GIFT AWAY.'));
            }
          }
          if (k === 'i' || k === 'q' || k === 'Escape') closeMenu();
          return;
        }
        if (mode === 'sleep') { if (k === ' ' || k === 'Enter') { mode = ''; if (S.map === 'lakehouse' && !S.flag.homed) { S.flag.homed = 1; mode = 'end'; S.ending = 0; if (window.Economy) window.Economy.earn(HOUSE_SUN, 'BEKKEDAL: THE HOUSE BY THE WATER'); } else startNap(false); } if (k === 'Escape') closeMenu(); return; }

        /* walking */
        if (k === ' ') {
          if (fish) fishTap();
          else if (chop) chopSwing();
          else if (swing) bufAct = true;           /* queued, not dropped */
          else act();
          return;
        }
        if (k === 'f') { plant(); return; }
        if (k === 'c') { cycleSeed(); return; }
        if (k === 'i') { mode = 'bag'; bagCur = 0; return; }
        if (k === 'q') { mode = 'quest'; qScroll = 0; return; }
        /* the loft, from anywhere — the shelves are a place you walk to, but
           what you are still missing has to be answerable while you are
           standing in the water with a rod in your hand */
        if (k === 'l') { openSpine(); return; }
        if (k === 'm') { openTravel(); return; }
        if (k === 'Tab' || k === 'e') { for (let i = 0; i < BEK_TOOLS.length; i++) { S.tool = (S.tool + 1) % BEK_TOOLS.length; if (S.tools[BEK_TOOLS[S.tool].id]) break; } sfx.talk(); return; }
        if (k >= '1' && k <= '5') { const ix = parseInt(k, 10) - 1; if (BEK_TOOLS[ix] && S.tools[BEK_TOOLS[ix].id]) S.tool = ix; return; }
        if (k === 'r') {
          /* a day has a stomach: bought food stops doing anything once BEK_FOOD_DAY_CAP points of it are down (S.met is the
             table that clears every morning); what you cooked yourself is never counted */
          const stuffed = (S.met.ate || 0) >= BEK_FOOD_DAY_CAP;
          const ate = Object.keys(S.bag).filter(id => BEK_ITEMS[id].eat && S.bag[id] > 0);
          const food = ate.filter(id => !(stuffed && BEK_ITEMS[id].buy))[0];
          if (!food) { say(ate.length ? TX('DU ER STAPPFULL. IKKE MER I DAG.', 'YOU ARE FULL. NO MORE TODAY.') : TX('INGENTING Å SPISE.', 'NOTHING TO EAT.')); return; }
          add(food, -1); S.en = Math.min(S.enMax, S.en + BEK_ITEMS[food].eat);
          if (BEK_ITEMS[food].buy) S.met.ate = (S.met.ate || 0) + BEK_ITEMS[food].eat;
          sfx.pick(); say(TX('SPISTE ', 'ATE ') + iname(food));
        }
      });
      cv.addEventListener('keyup', e => {
        const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys[k] = false;
        const wk = walkKey(e); if (wk) steer.release(wk.id);
      });
      /* A key that was down when the canvas lost the focus (a click on another window, alt-tab, a menu) never sends its keyup
         here, and the player walked on, by himself, until that key was pressed and let go again. */
      cv.addEventListener('blur', () => { steer.clear(); stride.reset(); for (const k in keys) keys[k] = false; });
      cv.addEventListener('mousedown', ev => { ev.stopPropagation(); cv.focus(); if (mode === 'talk') dlgAdvance(); });
      wrap.addEventListener('mousedown', () => setTimeout(() => cv.focus(), 0));
      setTimeout(() => cv.focus(), 30);

      /* fishTap only ever hooks the fish now — SPACE held during the fight
         itself is read continuously, straight off `keys[' ']`, in tickFish
         below. See "The reel" there for the mechanic. */
      function fishTap() {
        if (!fish || fish.phase !== 'bite') return;
        const item = BEK_ITEMS[fish.sp], rare = !!item.rare, legend = !!item.legend;
        fish.phase = 'reel';
        /* fish lvl2 and reinforced line both forgive tension sitting outside
           the safe zone a little longer before it costs the fish; fish lvl3
           and reinforced line both widen the zone itself — the drawn zone in
           menus.js reads these same fish.z0/z1, so the widened window is
           what the player sees as well as what tickFish tests. */
        const widen = (S.lvl.fish >= 3 ? 0.04 : 0) + (fish.tackle && fish.tackle.widen || 0);
        const band = legend ? [0.42, 0.58] : rare ? [0.455, 0.545] : [0.34, 0.66];
        fish.z0 = Math.max(0, band[0] - widen);
        fish.z1 = Math.min(1, band[1] + widen);
        fish.pos = (fish.z0 + fish.z1) / 2;
        fish.prog = 0; fish.overT = 0; fish.underT = 0; fish.ft = 0; fish.jerkT = 0.4;
        fish.landTime = legend ? 6.5 : rare ? 5 : 3.2;
        fish.grace = FISH_BREAK_GRACE + (S.lvl.fish >= 2 ? 0.4 : 0) + (fish.tackle && fish.tackle.grace || 0);
        fish.t = FISH_FIGHT_T;
        sfx.cast();
      }
      /* ---- the reel -------------------------------------------------------
         Not a needle bouncing for a tap in a zone any more: the fish pulls
         (BEK_ITEMS[id].pattern — a sinusoidal tug plus a chance of a sudden
         dart, both species content), holding SPACE reels against it and
         letting go gives slack, and fish.pos is the tension that results.
         Too much tension for too long (fish.overT past fish.grace) breaks
         the line; too little for too long (fish.underT) lets it swim off;
         staying inside [z0, z1] is what lands it (fish.prog reaching 1).
         z0/z1 keep the exact rounding contract layout_check.js asserts —
         only what pos *means* changed, not how the zone is drawn or hit. */
      /* Both rates comfortably clear every species' tug + amp (data.js's
         highest is havkonge at 0.46 + 0.12): holding always wins the tug of
         war and releasing always loses it, on every fish. What separates one
         species' fight from another is never "can you ever recover" — it is
         how often (jerk/kick) and how hard (amp/period) you have to. */
      const FISH_REEL_RATE = 0.85, FISH_EASE_RATE = 0.85, FISH_BREAK_GRACE = 0.7, FISH_FIGHT_T = 18;
      function landFish() {
        const sp = fish.sp, item = BEK_ITEMS[sp];
        if (gainCapped(sp, 1)) {
          tro.caught(sp, item);
          addXp('fish', item.legend ? 8 : item.rare ? 4 : 2);
          if (item.legend) { S.legend[sp] = S.day; sfx.done(); say(TX('LEGENDARISK FANGST! +1 ', 'LEGENDARY CATCH! +1 ') + iname(sp)); }
          else if (item.rare) { sfx.done(); say(TX('SJELDEN FANGST! +1 ', 'RARE CATCH! +1 ') + iname(sp)); }
          else { sfx.catch_(); say('+1 ' + iname(sp)); }
        }
        fish = null;
      }

      bSave.addEventListener('click', () => { try { S.lang = BEK_LANG; localStorage.setItem(BEK_SAVE, JSON.stringify(S)); say(T(UI.saved)); sfx.coin(); } catch (e) { say(TX('KUNNE IKKE LAGRE.', 'COULD NOT SAVE.')); } cv.focus(); });
      bLoad.addEventListener('click', () => {
        try {
          const raw = localStorage.getItem(BEK_SAVE);
          if (!raw) { say(TX('INGEN LAGRING.', 'NO SAVE.')); return; }
          S = heal(Object.assign(fresh(), JSON.parse(raw)));
          terrDirty();                                    /* a loaded save brings its own felled/mined/picked */
          BEK_LANG = S.lang || BEK_LANG; refreshBar();
          mode = ''; dlg = null; shop = null; craft = null; fish = null; travel = null; offer = null; loft = null; scene = null; leaving.clear(); bubbles = [];
          say(T(UI.loaded) + ' DAG ' + S.day + '.'); sfx.coin();
        } catch (e) { say(TX('LAGRINGEN ER ØDELAGT.', 'SAVE IS UNREADABLE.')); }
        cv.focus();
      });
      bLang.addEventListener('click', () => { BEK_LANG = BEK_LANG === 'en' ? 'bi' : 'en'; if (S) S.lang = BEK_LANG; refreshBar(); cv.focus(); });

      /* ---- walking, clock, fishing -------------------------------------- */
      function move(dt) {
        /* An action reads as committed if you cannot walk out of it. Direction
           keys are still latched into `steer`, so a turn taken during a swing
           happens the moment it ends. */
        if (swing) return;
        if (chop) { if (steer.want() >= 0 || chopAbandoned(chop)) chopCancel(); return; }
        const want = steer.want();
        const n = stride.tick(dt, want, S.dir, stepTo);
        /* a key pressed at rest turns you on the spot, at once; one pressed in mid-stride waits for the next tile, so the
           player never faces one way while the picture still walks him another (stepTo() turns him when the tile is taken) */
        if (want >= 0 && !n && !slide.active()) S.dir = want;
        if (want < 0 && !slide.active()) S.step = 0;
      }
      /* One tile, taken (or bumped into). The rules are the ones the walk always had; what is new is only that the time
         comes from stride.js (banked, never thrown away) and that a tile taken starts the picture sliding to it. */
      function stepTo(dir, lead) {
        S.dir = dir; S.step = (S.step + 1) % 4;
        const ox = S.px, oy = S.py, om = S.map, nx = ox + DX[dir], ny = oy + DY[dir];
        /* The mouth of the descent. It is not an `exits` entry like every
           other way through the world, and it is the only one that is not,
           because where it goes does not exist yet — the run has no seed
           until you step in. Everything past this square is exits again. */
        if (S.map === BEK_MINE_MOUTH.map && nx === BEK_MINE_MOUTH.x && ny === BEK_MINE_MOUTH.y) { slide.drop(); enterMine(); return; }
        const ex = (M().exits || []).filter(x => x.x === nx && x.y === ny)[0];
        if (ex) { if (ex.need && !gateOK(ex.need)) { say(T(ex.why)); deny(); return; } slide.drop(); S.map = ex.to; S.px = ex.tx; S.py = ex.ty; markDisc(ex.to); say(T(BEK_MAPS[S.map].title)); return; }
        if (nx < 0 || ny < 0 || nx >= COLS() || ny >= ROWS()) return;
        if (solid(S.map, nx, ny)) return;
        if (npcsHere().some(n => n.x === nx && n.y === ny)) return;
        if (S.map === 'farm' && S.animals.some(a => a.x === nx && a.y === ny)) return;
        S.px = nx; S.py = ny;
        slide.start(om, ox, oy, nx, ny, lead);
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
        /* a scene is a held breath: the hour it was triggered in is the hour
           it plays out in, however long the player takes over the lines */
        if (mode === 'end' || mode === 'loftend' || mode === 'nap' || scene) return;
        /* a conversation holds the day: whoever is speaking does not walk off in the middle of it, nor the shopkeeper whose counter you are at */
        if (mode === 'talk' || mode === 'shop' || mode === 'offer') return;
        S.min += dt * BEK_CLOCK_MIN_PER_S;
        if (S.min >= BEK_DAY_END) { startNap(true); return; }
        const w = warningFor(S.min, tiredSaid);
        if (w) { tiredSaid[w.key] = 1; say(TX(w.no, w.en)); }
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
        if (fish.phase === 'wait') {
          const item = BEK_ITEMS[fish.sp], rare = !!item.rare, legend = !!item.legend;
          fish.t -= dt;
          if (fish.t <= 0) {
            fish.phase = 'bite'; fish.t = legend ? 0.6 : rare ? 0.8 : 1.0;
            if (legend || rare) sfx.rare(); else sfx.bite();
          }
          return;
        }
        if (fish.phase === 'bite') { fish.t -= dt; if (fish.t <= 0) { fish = null; say(TX('INGET NAPP.', 'NO BITE.')); } return; }
        if (fish.phase !== 'reel') return;
        fish.t -= dt; if (fish.t <= 0) { say(TX('DEN SLAPP UNNA.', 'IT GOT AWAY.')); fish = null; return; }
        const p = BEK_ITEMS[fish.sp].pattern;
        fish.ft += dt;
        const osc = p.amp * Math.sin(2 * Math.PI * fish.ft / p.period);
        const holding = !!keys[' '];
        const reelBonus = S.rodLv >= 2 ? 0.12 : 0;
        const drive = p.tug + osc + (holding ? FISH_REEL_RATE + reelBonus : -(FISH_EASE_RATE + reelBonus));
        fish.pos = Math.max(0, Math.min(1.2, fish.pos + drive * dt));
        /* the dart: a per-second chance of a sudden, *instant* jump on top of
           the continuous pull above — scaling it by dt the way the pull is
           would make it too small to ever read as a dart */
        fish.jerkT -= dt;
        if (fish.jerkT <= 0) {
          fish.jerkT = 0.3 + Math.random() * 0.6;
          if (Math.random() < p.jerk) fish.pos = Math.max(0, Math.min(1.2, fish.pos + p.kick));
        }
        if (fish.pos >= 1.15) { deny(); say(TX('SNORA RØK.', 'THE LINE BROKE.')); fish = null; return; }
        if (fish.pos > fish.z1) {
          fish.overT += dt; fish.underT = 0;
          if (fish.overT > fish.grace) { deny(); say(TX('SNORA RØK.', 'THE LINE BROKE.')); fish = null; return; }
        } else if (fish.pos < fish.z0) {
          fish.underT += dt; fish.overT = 0;
          if (fish.underT > fish.grace) { deny(); say(TX('DEN SLAPP UNNA.', 'IT GOT AWAY.')); fish = null; return; }
        } else {
          fish.overT = 0; fish.underT = 0;
          fish.prog += dt / fish.landTime;
          if (fish.prog >= 1) landFish();
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
        /* a memory canvas, never a GPU one: a pattern whose tile is on the card is read back off it on every fill that
           lands in the terrain cache (see softcv.js) */
        const { cv: c, g: q } = softCanvas(BEK_DITHER_PX, BEK_DITHER_PX); q.fillStyle = day ? DAY_CSS[col] : LUT_CSS[col];
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
      /* The same ordered stipple over a rect of *chrome*, which is device
         space: `wash()` below opens a native() and so cancels the art
         transform, and a panel is not drawn inside one. The portraits in the
         dialogue box are the only caller. */
      function stipple(px, py, w, h, col, str) {
        if (str <= 0 || w <= 0 || h <= 0) return;
        g.fillStyle = ditherPat(col, str > 16 ? 16 : str); g.fillRect(px, py, w, h);
      }

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
      /* the mown strip through the meadow — see grassGround's 'enga' branch */
      const ENGA_MOW_X0 = 32, ENGA_MOW_X1 = 35;

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
      /* The season lies on the ground, in patches: litter and drifts where the low-frequency field
         says so, feathered out through the stipple like every other wash. It used to be one stipple
         laid over the whole picture, which put green flecks (spring), red (summer), orange (autumn)
         and white (winter) over the walls, the props and the player as well, as if the ground's
         texture ran through everything standing on it. Strength per patch is `n` of the tint table
         (BEK_SEASON_TINT) times three. */
      function seasonWash(px, py, x, y, k) {
        const tint = BEK_SEASON_TINT[BEK_SEASONS[S.season].id];
        if (!tint) return;
        const amt = Math.round(tint.base * (k || 1)) + (tint.patch ? pAmt(x, y, PATCH.DUST, tint.patch * (k || 1)) : 0);
        if (amt > 0) wash(px, py, BEK_T, BEK_T, tint.col, amt);
      }
      function grassGround(x, y) {
        const px = x * BEK_T, py = y * BEK_T;
        const mp = S.map;
        native(() => { g.fillStyle = C(GRASS[2]); g.fillRect(px, py, BEK_T, BEK_T); });
        wash(px, py, BEK_T, BEK_T, DRY[1], pAmt(x, y, PATCH.DRY));      /* a corner gone to straw */
        /* The vidda has no wetter, greener run to speak of — the LUSH patch
           reads as fed pasture, and an alpine plateau is not fed. */
        if (mp !== 'vidda') wash(px, py, BEK_T, BEK_T, GRASS[3], pAmt(x, y, PATCH.LUSH));
        /* the desire line from a door to its field, its road, its well —
           derived, not hand-placed; see wear.js. Same SOI[1] "trodden hard"
           colour pathGround washes onto the path glyph itself, so a worn
           strip of grass reads as the same material as the road it leads to */
        wash(px, py, BEK_T, BEK_T, SOI[1], wear.amt(x, y));
        /* Each wild map wants one more region-scale field no farm/lake tile
           needs — reusing PATCH's own declared channels at their own period
           with a different mark colour, exactly the way DUST/DRY already
           serve both pathGround and this function, rather than adding a
           channel nothing else in this file draws from. */
        if (mp === 'forest') {
          wash(px, py, BEK_T, BEK_T, DRY[1], pAmt(x, y, PATCH.DUST));      /* needle litter  */
          wash(px, py, BEK_T, BEK_T, MOSS_SHADE, pAmt(x, y, PATCH.MOSS));  /* moss, in shade */
        } else if (mp === 'vidda') {
          wash(px, py, BEK_T, BEK_T, BEDROCK, pAmt(x, y, PATCH.DAMP));     /* bedrock through */
          wash(px, py, BEK_T, BEK_T, CON[3], pAmt(x, y, PATCH.MOSS));      /* lichen          */
        } else if (mp === 'enga') {
          /* the one mown strip through the hay meadow — a straight cut, so
             it is the one ground mark in this whole file that is placed
             rather than derived from the map's own content */
          if (x >= ENGA_MOW_X0 && x < ENGA_MOW_X1) wash(px, py, BEK_T, BEK_T, GRASS[1], 6);
        }
        seasonWash(px, py, x, y);
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
        if (!ins_() && !isCave(S.map)) seasonWash(px, py, x, y, 0.6);   /* a road holds less of it than a field */
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
        const mp = S.map;
        /* the setra is grazed short; the vidda's heather is wind-flattened
           and thinner on the ground than either — fewer blades, not new art */
        const n = mp === 'vidda' ? 2 : 4;
        const bh = mp === 'setra' ? 2 : 4;
        native(() => {
          for (let i = 0; i < n; i++) {
            g.fillStyle = C(pal[v['c' + i]]);
            g.fillRect(px + spot(v['x' + i], BEK_T, 2), py + spot(v['y' + i], BEK_T, bh), 2, bh);
          }
          /* a flowering head, but only in the stretch of map that flowers —
             one pixel, so the cell edge of the low-frequency field is
             invisible and this one does not need feathering. A flower is a
             declared feature: it is allowed out of the band precisely
             because it is one pixel and rare. On the enga the *species* is
             read off the coarse MEADOW cell rather than the tile's own high-
             frequency channel, so one stand of gold and the next of blue read
             as two different corners of the meadow rather than a scatter of
             every colour everywhere — reusing LOW.VEIN at its own period,
             unused on any grass tile, rather than declaring a new channel. */
          if (meadow && v.c3 < 3) {
            /* A flower is a flower, not a speck: a small head on a stem with a leaf. A lone
               white pixel on grass read as dirt on the screen, so the white species is a red
               one here (white blooms live in the flower beds, which draw them properly). */
            const species = mp === 'enga' ? pLow(x, y, LOW.VEIN, 8, FLOWER.length) : v.c0 % FLOWER.length;
            const fx = px + spot(v.x2, BEK_T, 4), fy = py + spot(v.y3, BEK_T, 7);
            g.fillStyle = C(GRASS[1]); g.fillRect(fx + 1, fy + 3, 1, 4);
            g.fillStyle = C(GRASS[3]); g.fillRect(fx + 2, fy + 5, 2, 1);
            g.fillStyle = C(FLOWER[species === 0 ? 2 : species]); g.fillRect(fx, fy, 3, 2); g.fillRect(fx + 1, fy + 2, 1, 1);
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
        map: () => S.map,
        weather: () => S.weather,
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
        zone: (x, y) => zoneAt(S.map, x, y),
        win: (x, y) => roomWindowAt(S.map, x, y),
        paper: () => paperOf(S.map),
        map: () => S.map,
        cols: COLS, rows: ROWS
      });
      /* Every building in the valley, as one elevation sampled per tile. The
         same accessor shape as the others, plus the two things a facade needs
         that a floor does not: which map it is on, so it knows whether it is
         dressed in log and turf or in painted board under tile, and how dark
         it is out, for a lit window and for whether a hearth is going. */
      const building = createBuilding({
        fill: (col, px, py, w, h) => { g.fillStyle = C(col); g.fillRect(px, py, w, h); },
        wash: (px, py, w, h, col, str) => {
          if (str <= 0) return;
          g.fillStyle = ditherPat(col, str > 16 ? 16 : str); g.fillRect(px, py, w, h);
        },
        tileAt: (x, y) => tileAt(S.map, x, y),
        obj: (c, x, y) => objVar(c, S.map, x, y),
        spot: spot,
        map: () => S.map,
        dark: () => lighting().dark,
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
        /* THE LOFT, both sides of it, and the same overlay-not-replace call:
           inside, whichever restoration stages have been reached plus one
           display per finished wing (spine.js's spineProps, derived from the
           donations and stored nowhere); outside, the square's own corner once
           the roof is back on. */
        if (S.map === 'loftet') spineProps(S).forEach(d => propMap.set(d.x + ',' + d.y, d));
        if (S.map === 'town' && spineStage(S) >= 1) (BEK_DECOR.town_t1 || []).forEach(d => propMap.set(d.x + ',' + d.y, d));
        /* FURNISHING: the player's own placements, layered over the
           authored table exactly the way lakehouse_t2/town_t1/spineProps
           already are above — never a second draw path, never a second
           lightSources()/drawProp() branch. See placement.js and S.placed's
           own header (index.js's fresh()). */
        placedForMap(S.map).forEach((rec, k) => {
          const [x, y] = k.split(',').map(Number);
          propMap.set(k, { x: x, y: y, kind: rec.kind, rot: rec.rot, placed: true });
        });
      }
      /* S.placed keyed by rkey(map, x, y) = 'map:x,y' — filtered to one map
         and reindexed by 'x,y' for callers that already think in local tile
         keys, same shape propMap and canPlace()'s `placedHere` both want. */
      function placedForMap(mp) {
        const out = new Map();
        const pre = mp + ':';
        Object.keys(S.placed).forEach(k => {
          if (k.slice(0, pre.length) !== pre) return;
          out.set(k.slice(pre.length), S.placed[k]);
        });
        return out;
      }
      function placedHereObj(mp) {
        const out = {};
        placedForMap(mp).forEach((rec, k) => { const [x, y] = k.split(',').map(Number); out[k] = { x: x, y: y, kind: rec.kind }; });
        return out;
      }
      /* gjerde/sti are neighbour-aware, drawn with a cardinal autotile.js
         mask (mask4) against their own kind rather than the usual hash
         variation every other prop's fourth argument carries — see
         decor_place.js's own header. */
      const CONNECTS = { gjerde: 1, sti: 1 };
      /* every BEK_PLACE_ROT id happens to place a kind of the same name
         (stol -> 'stol', benk -> 'benk' — only the lamp/candle/picture
         remaps rotate nothing), so the item table doubles as the kind set */
      function drawProp(d, x, y, t) {
        const fn = PROP[d.kind];
        if (!fn) return;
        const v = CONNECTS[d.kind]
          ? mask4((nx, ny) => { const p = propMap.get(nx + ',' + ny); return !!p && p.kind === d.kind; }, x, y)
          : (d.placed && BEK_PLACE_ROT[d.kind]) ? (d.rot || 0)
          : hLowV(x, y, mapSalt(S.map) + 4090, 1, 3);
        native(() => fn(propArt, x * BEK_T, y * BEK_T, v, t, d));
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

      /* The paths worn between the places people actually walk — a door to
         its field, a door to the road, a door to a pier — derived from the
         map's own landmark glyphs rather than hand-placed. See wear.js. */
      const wear = createWear({
        tileAt: (x, y) => tileAt(S.map, x, y),
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
        const v = waterVar(S.map, x, y);
        native(() => {
          /* a deep tile that happens to touch land carries the surf, because
             on nine maps out of eleven that boundary is where the water ends */
          shore.live(x, y, t, v, -1);
          /* the swell, the glint and whatever is rising or drifting in the
             water — see water.js, which is the pattern shore.js's own live
             pass set: continuous motion off a declared channel, not a
             per-tile restart */
          water.live(x, y, t);
        });
      }

      /* just the fire, over the stone `hearthstone` (decor_home2.js) draws: two flames to a tile pair, one to each square, a little out of step */
      function hearthFlame(x, y, t) {
        const px = x * BEK_T_SRC, py = y * BEK_T_SRC, fl = Math.floor(t * 6 + x) % 3;
        g.fillStyle = C(HEARTH[0]); g.fillRect(px + 5, py + 12, 10, 4);
        g.fillStyle = C(HEARTH[1]); g.fillRect(px + 6, py + 9 - fl, 8, 6 + fl);
        g.fillStyle = C(HEARTH[2]); g.fillRect(px + 8, py + 7 - fl, 4, 5);
        g.fillStyle = C(HEARTH[3]); g.fillRect(px + 9, py + 5 - fl, 2, 2);
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
      /* A chest, a well or a sign that stands on trodden earth has trodden earth under it: on a grass
         tile it was a square of green in the middle of the yard, a ring round the thing. */
      const onPath = (c, x, y) => !ins_() && (c === 'K' || c === 'o' || c === 'S') &&
        (tileAt(S.map, x - 1, y) === '.' || tileAt(S.map, x + 1, y) === '.' || tileAt(S.map, x, y - 1) === '.' || tileAt(S.map, x, y + 1) === '.');
      const ownGround = (c, x, y) => 'W~P.MOQHRDLfk '.indexOf(c) >= 0 || (c === 'T' && rim_(x, y)) || onPath(c, x, y);

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
        if (c === '.' || onPath(c, x, y)) { pathGround(x, y); return; }
        if (c === 'M' || c === 'O' || c === 'Q') { native(() => rock.ground(c, x, y, snow_())); return; }
        /* the plain fills come straight out of surface.js, so the colour the
           check reasons about at the darkest hour is the colour that is
           actually on screen */
        if (c === 'P' || c === 'f' || c === 'L' || c === 'k') { g.fillStyle = C(groundOf(S.map, c)); g.fillRect(px, py, BEK_T_SRC, BEK_T_SRC); return; }
        /* A roof used to take the *wall's* colour here, so surface.js's own
           answer for 'R' was read by palette_check and by nothing else — a
           table that is checked but not drawn from is a fiction. It asks
           about the glyph it has now. */
        if (c === 'H' || c === 'R' || c === 'D') { g.fillStyle = C(solidOf(S.map, c)); g.fillRect(px, py, BEK_T_SRC, BEK_T_SRC); return; }
        if (ins_()) native(() => interior.floor(x, y)); else if (isCave(S.map)) caveGround(x, y); else grassGround(x, y);
      }

      /* A prop stands on whatever tile the content table put it on, drawn
         after that tile's own art and before the actors — so the player passes
         in front of the boots by the door rather than under them. The animated
         kinds are not here; they are redrawn per frame.

         This is a *function* and called from every branch of tileDetail that
         returns early because it used to be one line at the bottom, and ten
         authored props were on glyphs that never got there: the town's two
         street lamps and its well bucket, the lake's rowboat and washing line,
         the fjord's four jetty posts, and the ladder at the mouth of the mine
         — which this app's own CLAUDE.md describes as standing on the mouth
         and which had never once been drawn. Found by pixel-diffing the town
         with and without the loft's own overlay. Anything added to
         tileDetail's ladder that returns has to call this too. */
      function tileProp(c, x, y) {
        const prp = propMap.get(x + ',' + y);
        if (prp && !PROP_LIVE[prp.kind] && LIVE.indexOf(c) < 0) drawProp(prp, x, y, 0);
      }
      /* The marks on the ground itself: the blades, the pebbles, the grain of the boards, the bank.
         They are their own pass, and it runs over the whole region BEFORE any object does. They used
         to be laid tile by tile with the objects, so a prop, a stall, a woodpile or a wall that is
         wider than its own tile had the next tile's blades drawn across it (green flecks on the
         logs, in the well, over the crate). Nothing that stands on the ground may be drawn under
         the ground's own texture. */
      function tileMarks(c, x, y) {
        if (c === ' ' || c === 'W' || c === '~') return;
        if (onPath(c, x, y)) { pathDetail(x, y); native(() => shore.bank(x, y)); return; }
        if (!ownGround(c, x, y)) {
          if (ins_()) native(() => interior.volume(x, y)); else if (isCave(S.map)) caveDetail(x, y); else grassDetail(x, y);
        }
        /* the land half of a waterline, on whichever edges face water */
        if (!ins_()) native(() => shore.bank(x, y));
      }
      function tileDetail(c, x, y) {
        const px = x * BEK_T_SRC, py = y * BEK_T_SRC;
        const ins = ins_(), snow = snow_(), rim = rim_(x, y);
        if (c === ' ' || c === 'W') return;                  /* nothing static of its own */
        if (c === '~') { native(() => shore.detail(x, y, edgeVar(S.map, x, y))); tileProp(c, x, y); if (rim_(x, y)) edgeMark(px, py, x, y); return; }
        const o = objVar(c, S.map, x, y);
        if (c === 'P') {
          g.fillStyle = C(TIM[2]); for (let i = 0; i < BEK_T_SRC; i += 5) g.fillRect(px, py + i, BEK_T_SRC, 1);
          g.fillStyle = C(TIM[1]); g.fillRect(px + 2, py, 1, BEK_T_SRC); g.fillRect(px + 12, py, 1, BEK_T_SRC);
          tileProp(c, x, y);
          return;
        }
        if (c === '.') { pathDetail(x, y); tileProp(c, x, y); if (rim) edgeMark(px, py, x, y); return; }
        if (c === 'M' || c === 'O' || c === 'Q') { native(() => rock.detail(c, x, y, snow)); tileProp(c, x, y); if (rim) edgeMark(px, py, x, y); return; }
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
            const bx = px + 1 + spot(sx, BEK_T_SRC - 2, 4), by = py + spot(sy, BEK_T_SRC, 9);
            g.fillStyle = C(GRASS[1]); g.fillRect(bx + 1, by + 3, 1, 6);                 /* the stem  */
            g.fillStyle = C(GRASS[3]); g.fillRect(bx + 2, by + 6, 2, 1); g.fillRect(bx - 1, by + 7, 2, 1);   /* two leaves */
            g.fillStyle = C(col);                                                         /* four petals */
            g.fillRect(bx + 1, by, 1, 1); g.fillRect(bx, by + 1, 3, 1); g.fillRect(bx + 1, by + 2, 1, 1);
            g.fillStyle = C(col === WAR[4] ? WAR[2] : WAR[4]); g.fillRect(bx + 1, by + 1, 1, 1);  /* the eye */
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
          /* an old drift lying in the lee of the stone, on the two snowed
             maps only — not the same thing as `snowy()`'s own whole-map
             read, which is why a boulder needs its own drift and not just a
             tinted cap. The one mark on grass this game draws lighter than
             its surface, so it is a declared FEATURE (SNOWDRIFT) rather than
             a MARK. Reuses `cap`'s own spare values and `my`'s own jitter
             rather than adding a channel for one small feature. */
          if (snow && (o.cap === 2 || o.cap === 3)) {
            g.fillStyle = C(SNOWDRIFT[o.cap - 2]);
            g.fillRect(px + 1, py + 15 + spot(o.my, 4, 3), 6 + o.cap, 4);
          }
        }
        if (c === '=') { g.fillStyle = C(TIM[2]); g.fillRect(px, py + 8, BEK_T_SRC, 3); g.fillRect(px + 8, py + 4, 3, 14); g.fillStyle = C(TIM[4]); g.fillRect(px, py + 8, BEK_T_SRC, 1); }
        if (c === 'x') { g.fillStyle = C(TIM[2]); g.fillRect(px, py + 3, BEK_T_SRC, 14); g.fillStyle = C(TIM[1]); for (let i = 0; i < BEK_T_SRC; i += 4) g.fillRect(px + i, py + 3, 1, 14); }
        /* ---- a building ------------------------------------------------
           Three glyphs, one elevation. The whole of the roof, the wall, the
           door, the windows and the chimney is authored in building.js as a
           profile of a tile's vertical position inside its own building, the
           way shore.js authors the beach as a profile of distance from the
           waterline — so a course runs across the seam between two wall rows
           and a window is taller than either of them. Indoors is a different
           drawing of the same wall and stays in interior.js. */
        if (c === 'H' || c === 'R' || c === 'D') {
          if (!ins) native(() => building.tile(c, x, y));
          else if (zonedMap(S.map)) native(() => (c === 'D' ? interior.doorZ(x, y) : interior.wallZ(x, y)));
          else if (c === 'D') native(() => interior.door(x, y));
          else if (c === 'H') {
            /* a window looks out: only a wall with the dead margin behind it has one. A partition has
               floor on both sides and is a plain log wall. */
            const outer = tileAt(S.map, x - 1, y) === ' ' || tileAt(S.map, x + 1, y) === ' ' ||
                          tileAt(S.map, x, y - 1) === ' ' || tileAt(S.map, x, y + 1) === ' ';
            native(() => interior.wall(x, y, o, o.win < 2 && outer));
          }
        }
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
        else if ('nuJcb'.indexOf(c) >= 0 && !zonedMap(S.map)) native(() => furniture(propArt, c, x, y));   /* a made room draws its furniture as props (decor_home.js) */
        tileProp(c, x, y);
        if (rim) edgeMark(px, py, x, y);
      }

      function tileLive(c, x, y, t) {
        if (c === 'W') { waterTile(x, y, t); if (rim_(x, y)) edgeMark(x * BEK_T_SRC, y * BEK_T_SRC, x, y); return; }
        if (c === '~') { native(() => shore.live(x, y, t, edgeVar(S.map, x, y))); if (rim_(x, y)) edgeMark(x * BEK_T_SRC, y * BEK_T_SRC, x, y); return; }
        if (c === 'O' || c === 'Q') { native(() => rock.live(c, x, y, t)); return; }
        if (c === 'R') { native(() => building.smoke(x, y, t)); return; }
        if (c === 'v' && zonedMap(S.map)) {                                  /* a made room's hearth: its stone is a prop, its fire is live over it */
          const hp = propMap.get(x + ',' + y);
          if (hp) drawProp(hp, x, y, t);
          hearthFlame(x, y, t);
          return;
        }
        if (c === 'v') hearthTile(x, y, t);                                  /* the hearth, alight */
        /* A prop standing on a tile that is itself redrawn every frame has to
           be redrawn with it, or the tile paints over it — which is how the
           kettle spent its first afternoon invisible behind the fire. */
        const lp = propMap.get(x + ',' + y);
        if (lp) drawProp(lp, x, y, t);
      }
      /* the glyphs whose art reads the clock: water, the hearth, the catch of
         light travelling across a crystal face — and a roof, because the one
         thing about a building that is not static is the smoke coming off it.
         Every other roof tile early-returns on one array read. */
      const LIVE = 'W~vOQR';

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
      /* Two caches, not one: the picture on screen is never the one being painted. A rebuild is ten to fifty
         milliseconds of fillRects, and done in one go it was a frame that took three, every time the light turned
         over (at dawn and dusk about once a second) and every few tiles walked. It is now cut into pieces of a couple
         of milliseconds, a few a frame, painted into the *other* canvas while this one goes on being shown, and the
         two swap when the last piece is done. What is on screen is a few frames behind the hour for it, which is
         invisible; what is never behind is anything that changes what is *there* (a tree felled, a plot dug): that
         bumps `terrBump`, which is part of the geometry key, and a change of geometry is painted at once, whole, as it
         always was. Each canvas has its own band map for the local light (lamp.js), since the bands belong to the
         pixels they were worked into. */
      /* Sized to the *current* map, not to one fixed world: the rebuild sets it before it paints, so walking from a
         24x15 map onto a bigger one grows the cache with it. The dimensions are part of the cache key as well, which
         costs a few characters and means a map whose rows changed under us can never be blitted out of a canvas cut
         for the old size. Setting .width/.height resets the context — harmless here, since the rebuild lays down its
         own transform and clears first — but it does drop `tag`, so that is reapplied with the size.
         willReadFrequently: the lamp pass reads the cache back on every rebuild (and a live pool reads it every
         frame), and on a GPU-backed canvas that readback stalls the pipeline (the whole queue of fillRects has to be
         flushed first). A cache that is mostly written and sometimes read belongs in memory. */
      const makeBuf = tag => {
        const cv = document.createElement('canvas');
        cv.width = BEK_W; cv.height = BEK_H;
        const gg = cv.getContext('2d', { willReadFrequently: true });
        if (gg) gg.tag = tag;
        return { cv, g: gg, tag, lamp: null, lw: 0, lh: 0, key: '', kGeo: '', mw: 0, R: null, live: [], hearths: [] };
      };
      const bufs = [makeBuf('terrain'), makeBuf('terrain2')];
      let fi = 0, job = null;                                           /* which one is on screen; the rebuild in progress, if any */
      const front = () => bufs[fi];
      let soilPts = [], soilN = -1, soilRef = null;                    /* the plots' coordinates, rebuilt when a plot is added or lost */
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
      /* The hour moves the light a little every game minute, and every step of it is a full rebuild of
         the terrain cache (the hour is baked into the colours). At dawn and dusk that was three or four
         rebuilds a second, each one a dropped frame: the stutter of the evening. The outdoor light is
         latched for about a second of real time instead, which is a step of a percent or so between
         one picture and the next, below what the eye can tell from a smooth fade. A map change, a
         jump in the clock (sleep) or a cave always takes the live value at once. */
      const LIGHT_LATCH_MS = 1100;
      let lightLatch = null, lightLatchAt = 0, lightLatchMap = '', lightLatchMin = 0;
      function lighting() {
        const cave = isCave(S.map);
        if (!cave) {
          const t = now();
          if (lightLatch && lightLatchMap === S.map && t - lightLatchAt < LIGHT_LATCH_MS && Math.abs(S.min - lightLatchMin) < 12) return lightLatch;
          lightLatch = lightingNow(); lightLatchAt = t; lightLatchMap = S.map; lightLatchMin = S.min;
          return lightLatch;
        }
        return lightingNow();
      }
      function lightingNow() {
        const cave = isCave(S.map), ins = ins_();
        /* A hole in a mountain has no hour, but it does have a depth. The
           adit sits at band 0 (which is CAVE_LIGHT unchanged, so nothing
           about the gruva moved); a floor of the descent sits at its own
           band, and the deepest is a good deal darker. Four bands rather than
           a curve per floor, because this key is part of the terrain cache
           key: a per-floor darkness would rebuild the whole map on every
           ladder, where four rebuild it four times in a twenty-floor run. */
        const band = cave && isMineId(S.map) ? MINE_BANDS.indexOf(mineBand(floorOf(S.map))) : 0;
        const st0 = cave ? mineLight(band) : lightAt(S.min);
        const st = ins ? shelter(st0, 0.5) : st0;
        return { st: st, tag: keyOf(st), dark: Math.max(0, Math.min(1, 1 - st0.k)),
                 key: (cave ? 'cave' + band : keyOf(st0)) + (ins ? '|in' : '') };
      }

      /* ---- local light ---------------------------------------------------
         The lighting curve is what makes night comfortable; this is what
         makes it inviting, and they are different things.

         The pool itself lives in `lamp.js` and is a set of bands of the
         picture daylight would have — read that file before changing
         anything here. A source does not paint the ground warm; it resolves
         the ground toward the colours daylight would have given it, in four
         hard-edged steps. At full strength that is the daylight picture, so
         full strength is maximum legibility rather than none, and two
         sources over one pixel compose as a maximum instead of stacking.
         There is no dither in it and no paint over it: the warmth is in the
         states the bands go through.

         Static sources (a lit window, a lamp on a post) are worked into the
         terrain cache, because the light key is already part of the cache
         key — so a lit window costs nothing per frame. What moves or
         breathes (the lantern you carry, a hearth) is a live pool, worked out
         each frame from the cache and laid over it as a small patch. */
      /* One field per canvas the pass runs on: the map-sized terrain cache,
         which is also where the live pools are cut from. `createLamp` sizes
         its fields at construction, so it is built per size rather than once
         — one live instance, rebuilt only when you walk onto a map of a
         different shape. */
      const lampOf = (b, w, h) => {
        if (!b.lamp || b.lw !== w || b.lh !== h) { b.lamp = createLamp(w, h); b.lw = w; b.lh = h; }
        return b.lamp;
      };
      /* Two lanterns, and the second one is the far end of the loop the mine
         opens: the crystal is only found deep (mine.js's MINE_GEM_FLOOR), and
         what it makes is the thing you are short of when you are deep, which
         is reach. The peak barely moves — 15 of 16 was already nearly all the
         daylight picture there is to resolve to, and `lamp.js` is emphatic
         that you never brighten a light by painting harder — so what the
         crystal buys is radius: half again as far, which on a floor of the
         deepest band is the difference between seeing the drift you are in
         and seeing the wall you are facing. */
      const LANTERN = [null,
        { r: 2.4 * BEK_T, peak: 15 },
        { r: 3.6 * BEK_T, peak: 16 }];
      const lampTier = () => has('krystallykt') ? 2 : has('lykt') ? 1 : 0;

      /* ---- the pools that move -------------------------------------------
         A hearth that breathes and the lantern you carry. They are worked
         out each frame from the terrain cache (a canvas in memory, so reading
         it is a copy) and not from the screen, which the graphics card owns:
         reading *that* back every frame stalled the whole pipeline until
         everything queued had been drawn, and it was the cost of every cave.
         What comes out is a small patch, laid over the cache's picture
         before anything is drawn on it, and the bands it left, so a sprite
         standing in the light is drawn in the lit palette. */
      let poolCv = null, poolG = null;
      let litKey = '', litStates = null, litCss = [];
      function litLuts(L) {
        const k = L.tag + '|' + L.dark.toFixed(3);
        if (k !== litKey) {
          litKey = k; litStates = bandStates(L.st, lampState(L.st, L.dark));
          litCss = litStates.map(st => cssFor(st));
        }
        return litCss;
      }
      function livePools(L, t) {
        const srcs = [];
        const F = front();
        if (L.dark > 0.02 && F.hearths.length) {
          /* the fire breathes by a few per cent of its reach: the rings move by a band now and then, not all the time */
          const fl = 1 + 0.045 * Math.sin(t * 5.1) + 0.025 * Math.sin(t * 11.7);
          for (let i = 0; i < F.hearths.length; i += 3)
            srcs.push({ px: F.hearths[i], py: F.hearths[i + 1], r: 2.7 * BEK_T * fl, peak: F.hearths[i + 2] });
        }
        const tier = isCave(S.map) ? lampTier() : 0;
        if (tier) srcs.push({ px: Math.round(me.x * BEK_T) + BEK_T / 2, py: Math.round(me.y * BEK_T) + BEK_T / 2, r: LANTERN[tier].r, peak: LANTERN[tier].peak });
        const lamp = lampOf(F, COLS() * BEK_T, ROWS() * BEK_T);
        if (!srcs.length && !lampLive) return;
        lampLive = srcs.length > 0;
        const patch = lamp.live(F.g, srcs, L.st, lampState(L.st, L.dark),
                                { x: camX, y: camY, w: BEK_VIEW_W, h: BEK_VIEW_H });
        if (!patch) return;
        const w = patch.w, h = patch.h;
        if (!poolCv) { const sc = softCanvas(1, 1); poolCv = sc.cv; poolG = sc.g; }
        if (poolCv.width !== patch.img.width || poolCv.height < h) { poolCv.width = patch.img.width; poolCv.height = patch.img.height; }
        poolG.putImageData(patch.img, 0, 0, 0, 0, w, h);
        g.drawImage(poolCv, 0, 0, w, h, patch.x, patch.y, w, h);
      }
      let lampLive = false;
      /* ---- what SPACE would do (hint.js) ------------------------------------
         Worked out once a frame from the square in front of you and shown in the bottom band whenever nothing else is
         being said there. `act()` stays the one place that does anything: this only asks the same questions. */
      let hudHint = null;
      /* what SPACE does at a piece of furniture or a wall item (furniture_act.js's FURN), or at the one over the piece in front of you */
      function furnHint(f) {
        const at = (x, y) => roomWindowAt(S.map, x, y) ? FURN.window.hint : ((propMap.get(x + ',' + y) || {}).kind in FURN ? FURN[propMap.get(x + ',' + y).kind].hint : null);
        return at(f.x, f.y) || (S.dir === 1 && zonedMap(S.map) ? at(f.x, f.y - 1) : null);
      }
      function interactHint(npcs) {
        if (mode || swing || fish || dlg || S.ending || scene) return null;
        const f = facing(), t = tileAt(S.map, f.x, f.y);
        const who = npcs.filter(n => n.x === f.x && n.y === f.y)[0] || null;
        const d = M().door;
        const doorOK = !!(d && d.x === f.x && d.y === f.y && (!d.need || gateOK(d.need))) ||
                       !!((M().exits || []).filter(e => e.x === f.x && e.y === f.y && (!e.need || gateOK(e.need)))[0]) ||
                       (S.map === 'lake' && S.built && f.x === 5 && f.y === 4);
        const pk = rkey(S.map, f.x, f.y), cell = S.soil[key(f.x, f.y)];
        const giving = giftSel && has(giftSel, 1) ? giftSel : null;
        return hintFor({
          tile: t, map: S.map, tool: BEK_TOOLS[S.tool].id, who: who, giftSel: giving,
          giftName: giving ? { no: iname(giving), en: iname(giving) } : null,
          canGive: !S.flag.gifted && Object.keys(S.bag).some(id => S.bag[id] > 0 && !BEK_ITEMS[id].place),
          animal: S.map === 'farm' && S.animals.some(a => a.x === f.x && a.y === f.y),
          placed: !!S.placed[pk], ready: t === 'p' && (S.picked[pk] || 0) <= S.day,
          furn: furnHint(f),
          soil: cell ? { till: cell.till, seed: cell.seed, ready: cell.ready, wet: cell.wet } : null,
          hasSeed: !!curSeed(), door: doorOK
        });
      }

      /* run `fn` with the playfield's colours resolved through the palette of the light a point stands in: the
         player in his own lantern, a person at a lit window, a hearth's company. `x` and `y` are tile coordinates. */
      function inLight(L, x, y, fn) {
        const lp = front().lamp, b = lp ? lp.bandAt(Math.round((x + 0.5) * BEK_T), Math.round((y + 0.5) * BEK_T)) : 0;
        if (!b) { fn(); return; }
        const css = litLuts(L)[b], was = LUT_CSS, tag = LUT_TAG;
        useLut(css, tag + '~b' + b);
        fn();
        useLut(was, tag);
      }

      /* ---- the moon ------------------------------------------------------
         One cool key light, from above and a little to the left, put on as a
         solid rim along the top of anything solid: one art pixel, in a cool
         blue, unbroken. It costs a fill per solid tile in a pass that is
         cached, and it is what stops a night reading as one flat sheet of
         dark: without it every silhouette has the same value all the way
         round and the scene has no direction in it at all.

         It used to be a *stipple* of near-white (`ditherPat(SNO[1], ...)`, a
         third coverage along the top and an eighth down the left side), which
         is to say a line of isolated white dots along every roof ridge, wall
         top and rock edge at dusk and night: the picture's only highlights,
         scattered, and the thing most often reported as white dots on the
         textures. A rim is an edge, so it is drawn as one: continuous, and
         a blue the night table brings down to something that outlines a
         shape instead of sparkling on it. There is no left-hand lick: a
         second stippled edge was half of the dots.

         Drawn through the hour's own table rather than in daylight, because
         moonlight is the ambient — it is not a lamp somebody lit. */
      function moonKey(dark, R) {
        /* and not indoors. There is no moon in a room, and a rim light along
           the top of every wall from inside reads as a dotted line ruled
           around the picture rather than as anything lighting anything. */
        if (dark < 0.25 || ins_() || isCave(S.map) || isMineId(S.map)) return;     /* nor under a mountain: a cave has no sky */
        native(() => moonRim(R));
      }
      const MOON_RIMMED = 'HRMOQ';
      function moonRim(R) {
        g.fillStyle = C(WAT[4]);
        for (let y = R.y0; y < R.y1; y++) for (let x = R.x0; x < R.x1; x++) {
          const c = tileAt(S.map, x, y);
          /* only what fills its square to the top: a wall, a roof, a cliff, a vein. A tree, a well, a bench, a sign or a
             chest is solid too but is a *sprite* standing on the ground, and a rim at the top of its square floats in the
             air over the grass as a pale blue line wider than the thing under it. */
          if (MOON_RIMMED.indexOf(c) < 0) continue;
          /* Never on the border ring: a whole row of it is not moonlight, it is a line ruled across the picture. */
          if (rim_(x, y)) continue;
          if (BEK_SOLID.indexOf(tileAt(S.map, x, y - 1)) < 0) g.fillRect(x * BEK_T, y * BEK_T, BEK_T, BEK_ART_SCALE);
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
      /* `R` is the rebuild's own region. `A.hearths()` (ambience) asks this
         same question about the whole map and passes none, so it defaults to
         one — without it that call dereferences `R.y0` on undefined and
         throws every frame the moment an audio context exists. */
      function lightSources(dark, R) {
        const out = [];
        /* In full day there is no pool to see (the two pictures are within a few per cent of each other),
           and finding out costs a readback of the whole cache. Below this the light is real. */
        if (dark <= 0.08) return out;
        const ins = ins_();
        if (!R) R = { x0: 0, y0: 0, x1: COLS(), y1: ROWS() };
        const at = (x, y, dy, r, peak, hearth) =>
          out.push({ px: (x + 0.5) * BEK_T, py: (y + dy) * BEK_T, r: r, peak: peak, hearth: hearth });
        const cols = COLS(), rows = ROWS();
        const y0 = Math.max(0, R.y0 - LIGHT_REACH), y1 = Math.min(rows, R.y1 + LIGHT_REACH);
        const x0 = Math.max(0, R.x0 - LIGHT_REACH), x1 = Math.min(cols, R.x1 + LIGHT_REACH);
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
          const c = tileAt(S.map, x, y);
          if (c === 'v') { at(x, y, 0.1, 2.7 * BEK_T, litPeak(16, dark), 1); continue; }
          const dp = propMap.get(x + ',' + y);
          if (dp && (PROP_LIGHTS[dp.kind + ':' + dp.w] || PROP_LIGHTS[dp.kind])) {
            const L2 = PROP_LIGHTS[dp.kind + ':' + dp.w] || PROP_LIGHTS[dp.kind];
            at(x, y, 0.5, L2.r * BEK_T, litPeak(L2.peak, dark));
          }
          /* A window that is drawn is a window that lights, so outdoors this
             asks building.js for the openings it actually put on the facade
             rather than guessing at the glyph — one per column, at the height
             the frame really sits, instead of up to one per wall course at a
             fixed offset. Indoors the wall is interior.js's drawing and keeps
             its own per-tile window; only the dead margin outside a room gets
             nothing, because there is nothing out there to light. */
          if (!ins) {
            const w = building.windowAt(x, y);
            if (w && w.y === y) at(x, y, w.dy, 1.9 * BEK_T, litPeak(13, dark));
            continue;
          }
          if (c !== 'H') continue;
          if (zonedMap(S.map)) { if (roomWindowAt(S.map, x, y)) at(x, y, 0.9, 1.8 * BEK_T, litPeak(12, dark)); continue; }   /* a made room says where its windows are */
          if (objVar('H', S.map, x, y).win >= 2) continue;            /* no window in this course */
          if (tileAt(S.map, x, y + 1) === ' ') continue;
          at(x, y, 0.9, 1.5 * BEK_T, litPeak(11, dark));
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

      /* How much of a rebuild a frame will pay for, in milliseconds. A rebuild is nothing but fillRects, so this is only ever a
         question of how many frames it takes to land, and four or five of them at a few milliseconds each is not a thing the
         eye can find where one at forty is. */
      const REBUILD_BUDGET_MS = 4.5, ROWS_PER_STEP = 3;
      /* ...and how much more it may pay as the viewport closes on the edge of the picture on screen. A rebuild that has not landed by
         the time the camera walks off the region is painted whole, in one frame (see terrain()), so a slow frame rate used to turn a
         gentle walk into a stutter every few tiles: at seven tiles a second the margin is half a second. Two tiles or more to spare
         and it is the usual few milliseconds; one tile and it is twice that, none and it is three times, which is still a slice. */
      const rebuildBudget = (F, v) => REBUILD_BUDGET_MS + Math.max(0, 2 - Math.min(v.x0 - F.R.x0, v.y0 - F.R.y0, F.R.x1 - v.x1, F.R.y1 - v.y1)) * 5;

      /* the tiles the viewport can show, with one to spare for the strike-frame shake and the half tile at each edge */
      const viewTiles = () => ({ x0: Math.floor(camX / BEK_T) - 1, y0: Math.floor(camY / BEK_T) - 1,
                                  x1: Math.ceil((camX + BEK_VIEW_W) / BEK_T) + 1, y1: Math.ceil((camY + BEK_VIEW_H) / BEK_T) + 1 });
      const covers = (F, v) => !!F.R && v.x0 >= F.R.x0 && v.y0 >= F.R.y0 && v.x1 <= F.R.x1 && v.y1 <= F.R.y1;

      /* the pieces of one rebuild, as closures run a few at a time (runJob): each paints into the canvas that is not on
         screen, in the colours of the hour it was begun for, and is a pure continuation of the one before it */
      function startJob(k, kGeo, L, R, cols, rows, mw, mh) {
        const b = bufs[fi ^ 1];
        const j = { k, kGeo, R, b, mw, steps: [], i: 0, live: [], hearths: [], css: cssFor(L.st), tag: L.tag,
                    t: { ground: 0, detail: 0, forest: 0, pool: 0, lit: 0, all: 0 } };
        /* The skirt: one tile past the region on every side, clamped to the map. A detail is allowed to hang over into
           the next tile, so the tiles just outside the region have to be laid down too or the region's own border
           loses what should have reached into it. */
        const sx0 = Math.max(0, R.x0 - 1), sx1 = Math.min(cols, R.x1 + 1);
        const sy0 = Math.max(0, R.y0 - 1), sy1 = Math.min(rows, R.y1 + 1);
        const clip = { x: R.x0 * BEK_T, y: R.y0 * BEK_T, w: (R.x1 - R.x0) * BEK_T, h: (R.y1 - R.y0) * BEK_T };
        const lamp = lampOf(b, mw, mh);
        const timed = (key, fn) => () => { const t0 = now(); fn(); j.t[key] += now() - t0; };
        const rowsOf = fn => {
          for (let y = sy0; y < sy1; y += ROWS_PER_STEP) { const y1 = Math.min(sy1, y + ROWS_PER_STEP); j.steps.push(() => { for (let yy = y; yy < y1; yy++) for (let x = sx0; x < sx1; x++) fn(x, yy); }); }
        };
        j.steps.push(timed('ground', () => {
          if (b.cv.width !== mw || b.cv.height !== mh) { b.cv.width = mw; b.cv.height = mh; if (b.g) b.g.tag = b.tag; }
          g.setTransform(1, 0, 0, 1, 0, 0);
          g.fillStyle = C(0); g.fillRect(R.x0 * BEK_T, R.y0 * BEK_T, (R.x1 - R.x0) * BEK_T, (R.y1 - R.y0) * BEK_T);
          /* The distance fields, the boards and the wear are whole-map and know nothing about the region, so they are
             keyed without it — walking across a big map must not relay every floorboard. */
          shore.prepare(kGeo); water.prepare(kGeo); rock.prepare(kGeo); interior.prepare(kGeo);
          forest.prepare(kGeo); building.prepare(kGeo); wear.prepare(kGeo); propsPrepare();
          g.save(); g.scale(BEK_ART_SCALE, BEK_ART_SCALE);
          lamp.clear(clip);
        }));
        /* the order of a rebuild is the order of the doctrine: ground, marks, details and props, forest, moon, then the light */
        rowsOf((x, y) => { const t0 = now(); tileGround(tileAt(S.map, x, y), x, y); j.t.ground += now() - t0; });
        rowsOf((x, y) => { const t0 = now(); tileMarks(tileAt(S.map, x, y), x, y); j.t.ground += now() - t0; });
        rowsOf((x, y) => {
          const t0 = now(), c = tileAt(S.map, x, y);
          tileDetail(c, x, y);
          /* the live list is the region's, not the skirt's: a tile outside the region is outside the viewport and has
             nothing to animate at */
          if (LIVE.indexOf(c) >= 0 && x >= R.x0 && x < R.x1 && y >= R.y0 && y < R.y1) j.live.push(x, y);
          j.t.detail += now() - t0;
        });
        j.steps.push(timed('forest', () => {
          if (!ins_()) native(() => forest.draw(snow_(), R));
          moonKey(L.dark, R);
        }));
        /* The pool resolves what is already on the canvas, so it has to run after everything static is on it.

           It is clipped to the region for a reason beyond cost: the transform it applies is affine on the pixels it
           finds, so running it twice over the same pixels would resolve them twice. Outside the region those pixels are a
           previous rebuild's, already resolved. The band of every pixel it lit is kept (lamp.js), which is what lets a
           live pool light what it reaches without lighting it a second time. */
        j.steps.push(timed('pool', () => {
          const all = lightSources(L.dark, R);
          /* a hearth breathes, so it is not baked: it is a live pool, found again from this list each frame */
          const srcs = all.filter(sc => !sc.hearth);
          all.forEach(sc => { if (sc.hearth) j.hearths.push(sc.px, sc.py, sc.peak); });
          const to = lampState(L.st, L.dark);
          j.boxes = srcs.length ? lamp.plan(srcs, L.st, to, clip) : [];
        }));
        const bakeSteps = () => {
          /* one box a step (found by the step above, which has run by the time this one does) */
          for (let n = 0; n < 64; n++) j.steps.push(timed('pool', () => { const bx = j.boxes && j.boxes[n]; if (bx) j.t.lit += lamp.bakeBox(g, bx); }));
        };
        bakeSteps();
        j.steps.push(() => {
          /* Light does not spill into the void. The margin outside a room's walls is deliberate dead black and a warm
             pool creeping out over it reads as the room leaking, so it is painted back afterwards rather than the glow
             being clipped to a shape. */
          for (let y = R.y0; y < R.y1; y++) for (let x = R.x0; x < R.x1; x++) {
            if (tileAt(S.map, x, y) !== ' ') continue;
            g.fillStyle = C(0); g.fillRect(x * BEK_T_SRC, y * BEK_T_SRC, BEK_T_SRC, BEK_T_SRC);
            lamp.mask({ x: x * BEK_T, y: y * BEK_T, w: BEK_T, h: BEK_T });       /* and no live pool lights it either */
          }
          g.restore();
        });
        return j;
      }
      /* run pieces of the rebuild until the frame's share is spent (or, with Infinity, all of it); when it is done the two
         canvases swap */
      function runJob(budget) {
        if (!job) return;
        const t0 = now();
        while (job && job.i < job.steps.length) {
          const step = job.steps[job.i++];
          const prev = g, css = LUT_CSS, tag = LUT_TAG;
          g = job.b.g; useLut(job.css, job.tag);
          try { step(); } finally { g = prev; useLut(css, tag); }
          if (now() - t0 > budget && job.i < job.steps.length) break;
        }
        job.t.all += now() - t0;
        if (job.i < job.steps.length) return;
        const b = job.b;
        b.key = job.k; b.kGeo = job.kGeo; b.R = job.R; b.mw = job.mw; b.live = job.live; b.hearths = job.hearths;
        fi ^= 1;
        perf.ground = job.t.ground; perf.detail = job.t.detail; perf.forest = job.t.forest;
        perf.pool = job.t.pool; perf.lit = job.t.lit; perf.veil = 0; perf.light = job.t.pool;
        perf.rects = 0; perf.key = job.k; perf.rebuilds++; perf.ms = job.t.all;
        job = null;
      }

      /* The cache for this frame: what is on screen now, with the next one painted a few pieces a frame behind it. When the
         picture on screen can no longer be shown (the map changed under it, a tile was felled, the viewport has walked off
         the part of the map it covers) the new one is painted whole, right now, as it always was. */
      function terrain(force) {
        const L = lighting();
        const cols = COLS(), rows = ROWS(), mw = cols * BEK_T, mh = rows * BEK_T;
        const R = regionOf(cols, rows);
        /* what the map IS (its geometry), and then that plus the light. The distance fields, masks and floorboards are
           functions of the first only: they used to be keyed with the light as well, and so were laid again from scratch
           at every step of dawn and dusk for nothing. */
        const kGeo = S.map + '|' + cols + 'x' + rows + '|' + S.day + '|' + (S.built ? 1 : 0) + '|' + terrBump;
        const kMap = kGeo + '|' + L.key;
        const k = kMap + '|' + R.x0 + ',' + R.y0 + ',' + R.x1 + ',' + R.y1;
        const F = front();
        if (k === F.key && !force) { if (job) runJob(covers(F, viewTiles()) ? rebuildBudget(F, viewTiles()) : REBUILD_BUDGET_MS); return F.cv; }
        const ready = F.key && F.kGeo === kGeo && F.mw === mw && covers(F, viewTiles());
        /* a rebuild already running for something older is left to land if what is on screen can be shown meanwhile; the
           newer one starts when it has */
        if (!job || (job.k !== k && !(ready && job.kGeo === kGeo && !force))) job = startJob(k, kGeo, L, R, cols, rows, mw, mh);
        /* a picture that can be shown for now is left on screen while this one is painted; one that cannot is painted at once */
        runJob(ready && !force ? rebuildBudget(F, viewTiles()) : Infinity);
        return front().cv;
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
      const { drawIcon, person, lying, bear, goat, chicken } = createActors(() => g, C);
      const geese = createGeese(() => g, C);               /* Thea's geese on the deep water, once the credits have given you one (geese.js) */

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
        if (tl.id === 'stang') { const lv = Math.max(1, S.rodLv); return T({ no: ROD_NAME.no[Math.min(1, lv - 1)], en: ROD_NAME.en[Math.min(1, lv - 1)] }); }
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
        /* the camera follows where the player is *shown* (a walk is drawn as a slide from tile to tile, stride.js), not the
           square the step has already put him on: forty pixels a step, seven times a second, was the whole picture jerking */
        me = slide.at(S.map, S.px, S.py);
        camX = track(me.x, BEK_VIEW_W, camMaxX(S.map));
        camY = track(me.y, BEK_VIEW_H, camMaxY(S.map));
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
        /* the line that says what the thing you did has left you holding, else what SPACE will do here */
        const hold = giftSel && has(giftSel, 1) && !hudHint ? holdingLine({ no: iname(giftSel), en: iname(giftSel) }) : null;
        if (note) text(T(note), HUD_PAD, HUD_BOT_Y + HUD_TXT_DY, 11, FONT_SM);
        else if (hudHint) text(T(hudHint), HUD_PAD, HUD_BOT_Y + HUD_TXT_DY, 9, FONT_SM);
        else if (hold) text(T(hold), HUD_PAD, HUD_BOT_Y + HUD_TXT_DY, 14, FONT_SM);
      }

      /* Words over somebody's head: a call across the square. In screen pixels, after the playfield, kept inside the picture. */
      function drawBubbles(spots) {
        if (!bubbles.length) return;
        bubbles.forEach(b => {
          const sp = spots[b.id];
          if (!sp) return;
          const str = T(b.text), w = textW(str, FONT_SM) + PAD_SM * 2, h = LINE_SM + PAD_SM;
          const cx = BEK_VIEW_X + sp.x * BEK_ART_SCALE - camX, top = BEK_VIEW_Y + sp.y * BEK_ART_SCALE - camY;
          const x = Math.max(BEK_VIEW_X + 4, Math.min(BEK_VIEW_X + BEK_VIEW_W - w - 4, Math.round(cx - w / 2)));
          const y = Math.max(BEK_VIEW_Y + 4, Math.round(top - h - 8));
          panel(x, y, w, h, 15);
          g.fillStyle = C(15); g.fillRect(Math.round(cx) - 2, y + h, 4, 4);                 /* the tail */
          text(str, x + PAD_SM, y + Math.round((h - GLYPH_SM) / 2), 15, FONT_SM);
        });
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
        livePools(L, t);
        g.scale(BEK_ART_SCALE, BEK_ART_SCALE);
        const FL = front().live;
        for (let i = 0; i < FL.length; i += 2) {
          const lx = FL[i], ly = FL[i + 1];
          tileLive(tileAt(S.map, lx, ly), lx, ly, t);
        }
        /* The plots are the only squares with soil state, so the live pass walks those (a handful) and not
           every square of the map thirty times a second, asking tileAt about each. S.soil has no map in its
           keys and healCoords() keeps every entry on the farm. */
        if (S.map === 'farm') {
          let ph = soilPts;
          if (soilRef !== S.soil || soilN !== Object.keys(S.soil).length) {
            soilRef = S.soil; soilN = Object.keys(S.soil).length; ph = soilPts = [];
            Object.keys(S.soil).forEach(k => { const c = k.indexOf(','); soilPts.push([+k.slice(0, c), +k.slice(c + 1)]); });
          }
          for (let i = 0; i < ph.length; i++) if (tileAt('farm', ph[i][0], ph[i][1]) === 'f') drawSoil(ph[i][0], ph[i][1]);
        }

        /* The moving half of the light (a hearth that breathes, the lantern you carry) is cut out of the cache
           and laid down right after it, above: see `livePools`. What is left to do here is the props that
           animate themselves. */
        propMap.forEach(d => { if (PROP_LIVE[d.kind]) drawProp(d, d.x, d.y, t); });

        S.drops.filter(d => d.map === S.map).forEach(d => drawIcon(d.item, d.x * BEK_T_SRC + 3, d.y * BEK_T_SRC + 3));

        /* Every live sprite in the playfield — the player, the NPCs, the
           decorative herd and the player's own owned animals — is drawn in
           one pass ordered by tile y (screen depth: a higher y is further
           down the screen and nearer the camera), so someone standing on
           the tile behind a goat, or a goat behind an NPC, draws behind it
           rather than always on top. Before this they were four separate,
           unordered passes — goats and owned animals always drew first
           regardless of where anyone else on the same map stood. Furniture
           and other authored/placed decor is still part of the terrain
           cache (see propMap / propsPrepare), which this pass draws over —
           moving it into this per-frame sort is a separate, much larger
           change to how terrain is cached and out of scope here. */
        const actors = npcsHere().map(n => ({ n: n, y: n.y }));
        actors.push({ me: 1, y: me.y });
        hudHint = interactHint(actors.filter(a => a.n).map(a => a.n));
        BEK_GOATS.filter(gt => gt.map === S.map).forEach(gt => actors.push({ goat: gt, y: gt.y }));
        if (S.map === 'farm') S.animals.forEach(a => actors.push({ animal: a, y: a.y }));
        geese.here(S.map).forEach(b => actors.push({ goose: b, y: b.y }));
        actors.sort((a, b) => a.y - b.y);
        const spots = {};
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
            /* asleep: on its back in the bed under the quilt, or in the grass in what they stood up in (sleep.js) */
            if (nap && (!nap.woke || (nap.bed && nap.t < NAP.out + NAP.hold + NAP.in * 0.55))) {       /* a sleeper in a bed is still in it while the morning opens, then sits up beside it */
              const lx = nap.bed ? nap.bed.x : nap.at.x, ly = nap.bed ? nap.bed.y : nap.at.y;
              inLight(L, lx, ly, () => lying(lx * BEK_T_SRC, ly * BEK_T_SRC, PLAYER_HAIR, PLAYER_SHIRT, PLAYER_PANTS, nap.bed ? WAR[1] : -1, Math.floor(t * 1.4) % 2));
              spots.me = nap.sp = { x: lx * BEK_T_SRC + 6, y: ly * BEK_T_SRC + 2 };
              return;
            }
            inLight(L, me.x, me.y, () => person(Math.round(me.x * BEK_T_SRC) + 4 + jx, Math.round(me.y * BEK_T_SRC) + 2, S.dir, S.step, PLAYER_HAIR, PLAYER_SHIRT, PLAYER_PANTS, held, (S.bag.ullgenser || 0) > 0));
            return;
          }
          if (a.goose) { geese.draw(a.goose); return; }
          if (a.goat) { goat(a.goat.x * BEK_T_SRC + 1, a.goat.y * BEK_T_SRC + 1, t); return; }
          if (a.animal) {
            if (a.animal.kind === 'goat') goat(a.animal.x * BEK_T_SRC + 1, a.animal.y * BEK_T_SRC + 1, t);
            else chicken(a.animal.x * BEK_T_SRC + 3, a.animal.y * BEK_T_SRC + 3, t);
            return;
          }
          const n = a.n;
          if (n.bear) { const sway = Math.floor(t * 1.2) % 2; bear(n.x * BEK_T_SRC + 2 + sway, n.y * BEK_T_SRC + 1, sway * 2); }
          /* walking between two posts (schedule.js) gets the real walk
             cycle, off the game clock rather than off `t` — a schedule is a
             pure function of the day and the minute, so its own animation
             phase has to be too, or two frames of the same minute (a paused
             game, a replayed save) would show two different poses. Somebody
             a heart event is moving is walked in real time (the clock is held
             while one plays), so their legs go off `t`. Standing still keeps
             the slow idle bob every NPC always had. */
          else {
            const fx = n.fx != null ? n.fx : n.x, fy = n.fy != null ? n.fy : n.y;
            const act = n.act ? ACT_TOOL[n.act] : null;
            /* what they have been given (looks.js), and what the chore they are at has in the hand */
            const rec = S.look[n.id];
            let look = rec ? lookNow(n, rec, S.day, S.min, BEK_SEASONS[S.season].id, L.dark, n.act) : null;
            if (act && act.item && LOOKS[act.item] && !(look && look.hold)) look = { wear: look ? look.wear : [], hold: LOOKS[act.item].hold };
            const held = act && act.tool ? { kind: act.tool, u: 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * (act.swing || 0.5)), dir: n.dir } : null;
            const step = n.walking ? (n.fx != null ? Math.floor(t * 7) % 4 : walkStep(S.min)) : (Math.floor(t) % 2 ? 0 : 2);
            const px0 = Math.round(fx * BEK_T_SRC) + 4, py0 = Math.round(fy * BEK_T_SRC) + 2;
            spots[n.id] = { x: px0 + 6, y: py0 };
            /* going in at a door, or coming out of one (life.js `enter`, 0 at the step and 1 gone): they step up into the doorway, and the wall
               has the part of them that is through it. The clip is the bottom edge of the door's own square. */
            const into = n.enter != null ? n.enter : 0;
            inLight(L, fx, fy, () => {
              if (n.enter == null) return person(px0, py0, n.walking || n.act || n.fx != null ? n.dir : 0, step, n.hair, n.shirt, n.pants, held, wearsKnit(look), look, t);
              g.save(); g.beginPath(); g.rect(px0 - 8, Math.round(fy * BEK_T_SRC), BEK_T_SRC + 16, BEK_T_SRC * 2); g.clip();
              person(px0, py0 - Math.round(into * 24), 1, 0, n.hair, n.shirt, n.pants, null, wearsKnit(look), look, t);
              g.restore();
            });
          }
        });

        /* FURNISHING: the ghost. A stipple under the real prop art, never a
           colour overlay — no alpha anywhere in this app, so "valid" and
           "invalid" are two different dither strengths against two
           different marks (a light stipple, col 10, or a dark one, col 12)
           rather than a tint. Drawn after every sprite and before the fx,
           the same layer order a placed object will actually sit in once
           it is real. */
        if (mode === 'place' && place) {
          const okNow = canPlace(BEK_MAPS[S.map], placedHereObj(S.map), S.px, S.py, place.x, place.y, place.kind);
          native(() => {
            const gx = place.x * BEK_T, gy = place.y * BEK_T;
            g.fillStyle = ditherPat(okNow ? 10 : 12, 9);
            g.fillRect(gx, gy, BEK_T, BEK_T);
            const fn = PROP[place.kind];
            if (fn) fn(propArt, gx, gy, place.rot || 0, t);
          });
        }

        /* the chips, the dust and the spray, in front of everything in the
           playfield and under the chrome */
        native(() => fx.draw());

        if (S.map === 'lake' && S.flag.lot && !S.built) { g.fillStyle = C(SAN[2]); g.fillRect(3 * BEK_T_SRC, 3 * BEK_T_SRC, 5 * BEK_T_SRC, 1); g.fillRect(3 * BEK_T_SRC, 6 * BEK_T_SRC - 1, 5 * BEK_T_SRC, 1); }

        g.restore();
        drawBubbles(spots);

        /* Weather sits over the playfield only, and it is the last thing that
           still composites: fog really is a sheet of something between you
           and the valley, which is exactly what an overlay is for. The hour
           is no longer here at all — it went into the palette. Both still
           draw through the hour's LUT, so fog at midnight is night fog and
           rain at dusk catches the last of the light.

           The season is not here: it lies on the ground (seasonWash, in the ground pass), so
           nothing standing on the ground is ever speckled by it. */
        g.save();
        viewClip();
        /* no rain, and no fog, under rock: the gruva and every floor of the descent are caves, and weather is not a thing a cave has */
        if (!inside && !isCave(S.map) && !isMineId(S.map)) {
          if (S.weather === 'regn') {
            g.fillStyle = C(WAT[4]);
            for (let i = 0; i < BEK_RAIN_N; i++) {
              const rx = (i * BEK_RAIN_STRIDE_X + Math.floor(t * BEK_RAIN_VX)) % BEK_VIEW_W;
              const ry = (i * BEK_RAIN_STRIDE_Y + Math.floor(t * BEK_RAIN_VY)) % BEK_VIEW_H;
              g.fillRect(BEK_VIEW_X + rx, BEK_VIEW_Y + ry, BEK_ART_SCALE, BEK_RAIN_LEN);
            }
          } else if (S.weather === 'take') {
            /* banks of mist that drift (fog.js), not one stipple over everything */
            for (let by = 0; by * FOG_BLOCK < BEK_VIEW_H; by++) for (let bx = 0; bx * FOG_BLOCK < BEK_VIEW_W; bx++) {
              g.fillStyle = ditherPat(STO[4], fogLevel(bx, by, t));
              g.fillRect(BEK_VIEW_X + bx * FOG_BLOCK, BEK_VIEW_Y + by * FOG_BLOCK, FOG_BLOCK, FOG_BLOCK);
            }
          }
        }
        /* tired (sleep.js): the edges of the picture close in, in bands of the same ordered stipple, a little more every hour past midnight */
        { const vg = vignette(S.min);
          if (vg) vg.forEach((str, k) => {
            const w = 16 * (k + 1);                       /* each band reaches further in, and they stack at the rim */
            g.fillStyle = ditherPat(ATMO[0], str);
            g.fillRect(BEK_VIEW_X, BEK_VIEW_Y, BEK_VIEW_W, w); g.fillRect(BEK_VIEW_X, BEK_VIEW_Y + BEK_VIEW_H - w, BEK_VIEW_W, w);
            g.fillRect(BEK_VIEW_X, BEK_VIEW_Y + w, w, BEK_VIEW_H - 2 * w); g.fillRect(BEK_VIEW_X + BEK_VIEW_W - w, BEK_VIEW_Y + w, w, BEK_VIEW_H - 2 * w);
          }); }
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
          } else if (cc && cc.till && !cc.seed && tileAt(S.map, f.x, f.y) === 'f') {
            /* bare tilled soil: whether it is wet is still worth knowing before the seed goes in */
            panel(TIP_X, TIP_Y, TIP_W, TIP_H, 7);
            const tx = TIP_X + PAD_SM, ty0 = TIP_Y + PAD_SM;
            text(TX('SPADD JORD', 'TILLED SOIL'), tx, ty0, 15, FONT_SM);
            text(cc.wet ? TX('VANNET', 'WATERED') : TX('TØRR', 'DRY'), tx, ty0 + LINE_SM, cc.wet ? 9 : 12, FONT_SM);
          }
        }

        if (fish) drawFish();
        if (chop) drawChop();

        if (mode === 'talk' && dlg) drawTalk();
        if (mode === 'shop') drawShop();
        if (mode === 'craft') drawCraft();
        if (mode === 'offer') drawOffer();
        if (mode === 'bag') drawBag();
        if (mode === 'quest') drawQuests();
        if (mode === 'travel') drawTravel();
        if (mode === 'sleep') drawSleep();
        if (mode === 'loft') drawSpine();
        if (mode === 'end') drawEnd(t);
        if (mode === 'loftend') drawLoftEnd(t);
        if (nap) drawNap(t);
      }
      /* the picture shut by the ordered dither, and the Zs over whoever sleeps while it is */
      function drawNap(t) {
        const ph = napPhase(nap.t);
        if (ph.cover > 0) dither(ATMO[0], ph.cover);
        if (ph.phase === 'done' || ph.phase === 'in') return;
        const n = zCount(nap.t - 0.2), sp = nap.sp || { x: S.px * BEK_T_SRC + 8, y: S.py * BEK_T_SRC };
        const ox = BEK_VIEW_X + sp.x * BEK_ART_SCALE - camX, oy = BEK_VIEW_Y + sp.y * BEK_ART_SCALE - camY;
        for (let i = 0; i < n; i++) {
          const rise = Math.floor((nap.t * 14 + i * 9) % 36);
          text(i === n - 1 ? 'Z' : 'z', Math.round(ox + 6 + i * 16 + Math.sin(nap.t * 2 + i) * 4), Math.round(oy - 8 - i * 14 - rise / 3), [15, 11, 14][i], i === 0 ? FONT_SM : FONT_LG);
        }
      }

      /* The needle and the zone are both placed by multiplying the same track
         width by the same 0..1 figures the hit test in tickFish reads, so where
         the needle looks like it lands is where it actually lands. */
      /* Every panel the game puts over the picture lives in menus.js — the
         fishing gauge, the dialogue box, the shop, the bag, the quest board,
         the travel list and the ending painting. All chrome, so all of it
         draws after the LUT goes back to daylight. */
      const { drawFish, drawChop, drawTalk, drawOffer, drawShop, drawCraft, drawBag, drawQuests, drawTravel,
              drawSleep, drawEnd, drawSpine, drawLoftEnd, toolName } = createMenus({
        S: () => S, fish: () => fish, chop: () => chop, typed: () => ({ n: typer.shown(), done: typer.done() }), dlg: () => dlg, shop: () => shop, craft: () => craft,
        travel: () => travel, offer: () => offer, qScroll: () => qScroll, loft: () => loft,
        bagCur: () => bagCur, giftSel: () => giftSel, bagUse: () => [bagTotal(), bagLimit()],
        T: T, TX: TX, iname: iname, price: price, houseCost: () => houseCost(S),
        recipeUnlocked: recipeUnlocked, craftCount: craftCount,
        panel: panel, icon: icon, text: text, textW: textW, wrapText: wrapText,
        dither: dither, stipple: stipple, bear: bear, artScale: BEK_ART_SCALE
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
          const reals = bufs.map(b => b.g.fillRect);
          let n = 0;
          bufs.forEach((b, i) => { b.g.fillRect = function () { n++; return reals[i].apply(this, arguments); }; });
          try { terrain(true); } finally { bufs.forEach((b, i) => { b.g.fillRect = reals[i]; }); }
          return n;
        },
        /* Open a panel so the harness can photograph it. Menus are the one
           part of the picture a screenshot of the world never covers, and a
           panel that throws only throws when somebody opens it. */
        menu: name => {
          mode = name || '';
          if (name === 'shop') shop = { list: BEK_TALK.astrid.shop, sel: 0, side: 0, npc: BEK_NPCS[0] };
          if (name === 'craft') craft = { side: 0, sel: 0 };
          if (name === 'talk') dlg = { lines: [BEK_TALK.astrid.chat[0].t[0]], i: 0, npc: BEK_NPCS[0], mood: BEK_TALK.astrid.chat[0].mood };
          /* The dialogue box has three shapes and the plain one above is only
             the first: a question with its answers as selectable rows, and a
             body of more than one row on a face that is not the resting one.
             Neither is reachable from the shot matrix's own spine, so each
             gets a shot rather than the spine being moved. */
          if (name === 'ask') {
            const nd = BEK_TALK.hakon.nodes[0];
            dlg = { lines: nd.lines.slice(), i: nd.lines.length, npc: BEK_NPCS[1], mood: nd.mood,
                    ask: nd.ask, opts: nd.ask, sel: 1 };
            mode = 'talk';
          }
          if (name === 'talk2') {
            const nd = BEK_TALK.gunnar.nodes[0];
            dlg = { lines: nd.lines.concat(BEK_TALK.gunnar.chat[2].t), i: 0, npc: BEK_NPCS[6], mood: nd.mood };
            mode = 'talk';
          }
          if (name === 'offer') offer = { label: { no: 'BÅT', en: 'BOAT' }, kr: 400, npc: BEK_NPCS[3] };
          /* the same list openTravel() would build — BEK_HOME is what decides
             which places the menu still offers, not S.disc on its own */
          if (name === 'travel') travel = mapList();
          if (name === 'end') S.ending = 4.2;
          if (name === 'fish') fish = { phase: 'reel', t: 4, pos: 0.42, sp: 'orret', tackle: null,
                                        z0: 0.34, z1: 0.66, prog: 0.2, overT: 0, underT: 0, ft: 0, jerkT: 0.4,
                                        landTime: 3.2, grace: FISH_BREAK_GRACE };
        },
        /* Drive a real conversation from the harness: the same `talkTo` the
           act key calls and the same `dlgAdvance` SPACE calls, so what comes
           back is what a player would be shown rather than a mock-up of it.
           This is what verifies that no line repeats the name on the plate
           and that no line arrives with its speaker dropped — on the paths
           that build a line in code (an offer's reply, Håkon's build lines,
           a quest turn-in) as well as the ones that read it out of a table. */
        talk: (id, steps) => {
          const n = BEK_NPCS.filter(q => q.id === id)[0];
          if (!n) return null;
          if (steps == null) { mode = ''; dlg = null; offer = null; talkTo(n); }
          else for (let i = 0; i < steps; i++) { if (mode === 'talk' && dlg && !dlg.opts) { typer.skip(); dlgAdvance(); } }
          if (!dlg) return { mode: mode, who: '', line: '' };
          const l = dlg.lines[dlg.i];
          return { mode: mode, who: dlg.npc && !dlg.npc.bear ? dlg.npc.n : '',
                   bear: !!(dlg.npc && dlg.npc.bear), line: T(l) || '',
                   lineMood: (l && l.m) || '', entryMood: dlg.mood || '',
                   opts: dlg.opts ? dlg.opts.opts.map(o => T(o.t)) : null };
        },
        /* Drive a heart event from the harness, on the same path a player
           reaches it by: sceneWatch() is what decides whether one fires
           right now, sceneStep()/sceneEnd() are what play it out. Called
           with no argument it asks the question a frame asks and returns
           the scene that started, if any; called with a step count it
           advances the box the way SPACE does. What comes back is the beat
           the player would be reading, its speaker and the cast standing
           around them, so a check can walk a whole scene and see that every
           line has a face and every actor a square. */
        scene: steps => {
          /* with no argument: ask the question a frame asks, then let the cast cross the ground (a frame at a time would do
             the same thing, slower: this is the same sceneTick, on synthetic time) until the box opens or it stands down */
          if (steps == null) sceneWatch();
          for (let i = 0; i < 600 && scene && scene.phase === 'walk'; i++) sceneTick(0.05);
          if (steps) for (let i = 0; i < steps; i++) { if (mode === 'talk' && dlg && dlg.scene) dlgAdvance(); }
          if (!scene) return { id: '', line: '', who: '', beat: -1, cast: [] };
          const l = dlg && dlg.lines[dlg.i];
          return { id: scene.def.id, beat: scene.i, line: T(l) || '', phase: scene.phase,
                   who: dlg && dlg.npc ? dlg.npc.n : '', mood: (dlg && dlg.mood) || '',
                   px: S.px, py: S.py, min: Math.floor(S.min),
                   cast: sceneCast(scene).map(c => c.id + '@' + c.x + ',' + c.y),
                   walkers: scene.walk ? [...scene.walk.values()].map(w => w.id + '@' + Math.round(w.x) + ',' + Math.round(w.y)) : [] };
        },
        /* The descent, from the harness. Called with no argument it reports
           where the run is; called with 'mouth', 'down', 'up' or 'out' it
           stands the player on the one walkable square in front of that
           shaft, facing it — so the harness takes the last step onto it
           through the real `move()` and the real `exits`, rather than
           teleporting through the thing that is actually being tested. The
           walk across the floor is what is skipped; the descent is not. */
        mine: which => {
          if (which) {
            const f = floorOf(S.map);
            const on = which === 'mouth'
              ? (S.map === BEK_MINE_MOUTH.map ? BEK_MINE_MOUTH : null)
              : (BEK_MAPS[S.map] && BEK_MAPS[S.map].exits || []).filter(
                  which === 'down' ? e => floorOf(e.to) === f + 1
                : which === 'out' ? e => e.to === 'gruva'
                : e => e.to === 'gruva' || floorOf(e.to) === f - 1)[0];
            if (!on) return null;
            const D = [[0, 1], [0, -1], [-1, 0], [1, 0]];
            for (let d = 0; d < 4; d++) {
              const nx = on.x - D[d][0], ny = on.y - D[d][1];
              if (solid(S.map, nx, ny)) continue;
              S.px = nx; S.py = ny; S.dir = d;
              return { at: [nx, ny], shaft: [on.x, on.y], dir: d };
            }
            return null;
          }
          return { map: S.map, floor: mineHere(), deepest: S.deepest,
                   seed: S.run ? S.run.seed : 0, dug: S.run ? Object.keys(S.run.dug).length : 0,
                   px: S.px, py: S.py, tile: tileAt(S.map, S.px, S.py),
                   band: isMineId(S.map) ? mineBand(floorOf(S.map)).id : '',
                   shafts: (BEK_MAPS[S.map] && BEK_MAPS[S.map].exits || []).length,
                   registered: Object.keys(BEK_MAPS).filter(isMineId).length,
                   bag: Object.assign({}, S.bag), en: S.en, mode: mode };
        },
        /* Stand in front of a vein of `kind` on this floor and face it, so the
           harness can swing at it with the real act(). Same reasoning as
           `mine` above: the pick is what is being tested, not the pathing. */
        vein: kind => {
          const r = standNear(kind);
          if (r) for (let i = 0; i < BEK_TOOLS.length; i++) if (BEK_TOOLS[i].id === 'hakke') S.tool = i;
          return r;
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
        },
        /* Stand facing a 'W' tile and equip the rod, the same way vein()
           above stands you facing ore and equips the pick. */
        water: () => {
          const r = standNear('W');
          if (r) for (let i = 0; i < BEK_TOOLS.length; i++) if (BEK_TOOLS[i].id === 'stang') S.tool = i;
          return r;
        },
        /* Drive a whole cast, from the harness, on synthetic frames rather
           than real wall time: act() casts (water() above must have stood
           you facing water first), then wait/bite/reel are stepped with
           `holdFn(fish)` deciding whether SPACE is held for each tick, until
           the fish resolves (landed, broke the line or swam off) or a step
           ceiling is hit. Nothing in the game calls this; it drives the same
           act()/fishTap()/tickFish() the keyboard does. */
        fishRun: (holdFn, opts) => {
          opts = opts || {};
          const dt = opts.dt || 1 / 20, maxSteps = opts.maxSteps || 4000;
          act();
          if (!fish && !swing) return { steps: 0, result: 'no-cast' };
          for (let i = 0; i < maxSteps; i++) {
            if (swing) { tickSwing(dt); continue; }
            if (!fish) return { steps: i, result: 'resolved' };
            if (fish.phase === 'bite') fishTap();
            else if (fish.phase === 'reel') keys[' '] = !!holdFn(fish);
            tickFish(dt);
            if (!fish) return { steps: i, result: 'resolved' };
          }
          keys[' '] = false;
          return { steps: maxSteps, result: 'timeout' };
        },
        /* A plain snapshot of the fields a fishing test cares about. */
        state: () => JSON.parse(JSON.stringify({ bag: S.bag, legend: S.legend, xp: S.xp, kr: S.kr })),
        /* where the player is and what is open, and a way to mark a place as found (the harness for the sleep, the boxes and THE MAP) */
        snap: () => ({ map: S.map, px: S.px, py: S.py, dir: S.dir, day: S.day, mode: mode, label: dlg && dlg.label ? T(dlg.label) : null, disc: Object.keys(S.disc), travel: travel ? travel.names : null }),
        found: ids => { (ids || []).forEach(m => { S.disc[m] = 1; }); return Object.keys(S.disc); },
        /* FURNISHING, from the harness. Grants the item (so a functional
           test does not first have to play through a whole shop visit),
           stands the player at (x, y) on `mapId` (or leaves them where they
           are if omitted), then drives the real startPlace()/confirmPlace()
           the bag panel and the keyboard both call — the placement is
           validated by the same canPlace() a player's SPACE goes through,
           never a direct S.placed write. */
        furnish: (itemId, mapId, x, y, rot) => {
          /* stand just south of the target tile, not on it — canPlace()
             correctly refuses a placement on the player's own square, so
             the harness has to stand somewhere else, the same way a real
             player would before pressing SPACE */
          if (mapId) { S.map = mapId; S.px = x; S.py = y + 1; S.dir = 1; }
          add(itemId, 1);
          startPlace(itemId, x, y);
          if (place && rot) place.rot = 1;
          const opened = mode === 'place';
          if (opened) confirmPlace();
          return { opened: opened, map: S.map, placed: JSON.parse(JSON.stringify(S.placed)),
                   bag: Object.assign({}, S.bag), note: note };
        },
        /* Face (x, y) on the current map and pick it up — same door in
           reverse act() already opens for a player standing there. */
        pickup: (x, y) => {
          S.px = x; S.py = y + 1; S.dir = 1;             /* stand just south, facing north onto it */
          act();
          return { placed: JSON.parse(JSON.stringify(S.placed)), bag: Object.assign({}, S.bag), note: note };
        },
        /* What lightSources() reports right now — a placed lamp/candle has
           to show up here the exact way an authored one does, through the
           same PROP_LIGHTS table. Runs propsPrepare() first so propMap
           reflects whatever was placed since the last real rebuild. */
        lights: () => { propsPrepare(); return lightSources(1).map(s => ({ px: s.px, py: s.py, r: Math.round(s.r), peak: s.peak })); },
        placedAt: (mapId, x, y) => S.placed[rkey(mapId, x, y)] || null,
        teleport: (mapId, x, y) => { S.map = mapId; S.px = x; S.py = y; S.dir = 0; return { map: S.map, px: S.px, py: S.py }; },
        walkable: (mapId, x, y) => !solid(mapId, x, y)
      };
      window.__bekDebug = dbg;

      let acc = 0;
      function frame(ts) {
        if (!alive || !document.body.contains(cv)) { alive = false; Song.stop(); Amb.stop(); return; }
        raf = requestAnimationFrame(frame);
        const dt = Math.min(0.1, (ts - last) / 1000 || 0); last = ts;
        slide.tick(dt);
        if (!mode) { move(dt); tickFish(dt); if (chop) chopTick(chop, dt); sceneWatch(); greetWatch(); }
        if (sceneCool > 0) sceneCool -= dt;
        sceneTick(dt); leavingTick(dt); bubblesTick(dt);
        mineSync();
        tickSwing(dt); fx.step(dt);
        geese.step(dt, S.map, me.x, me.y);
        if (mode === 'end' || mode === 'loftend') S.ending += dt;
        if (mode === 'nap') napTick(dt);
        tickClock(dt);
        if (noteT > 0) { noteT -= dt; if (noteT <= 0) note = ''; }
        autoT += dt; if (autoT > 6) { autoT = 0; autoSave(); }
        scanT += dt; if (scanT > 1) { scanT = 0; tro.scan(S); }
        speechTick(dt);
        Song.rotStep(dt); Song.sync();
        Amb.tick(dt);
        /* Drawn on every frame the display offers. The old gate drew when 1/30 s had gathered and then
           threw the remainder away, so on a 60 Hz display two frames of 16.6 ms came to 33.2 and missed
           it by a hair: the game ran at an uneven 20-30 fps, which is what "laggy" looked like. A machine
           that really cannot afford a draw every frame (the smoothed cost says so) is held to 30 instead,
           and the remainder is kept this time. */
        acc += dt;
        const gate = drawMs > 13 ? 1 / 30 - 0.004 : 0;
        if (acc >= gate) {
          acc = gate ? Math.min(acc - gate, gate) : 0;
          const t0 = performance.now(), rb = perf.rebuilds;
          draw(ts / 1000);
          /* what a draw costs, not what a cache rebuild costs: a rebuild is a one-off, and counting it
             would hold a fast machine to 30 fps every time the light moved */
          if (perf.rebuilds === rb) drawMs = drawMs * 0.9 + (performance.now() - t0) * 0.1;
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
