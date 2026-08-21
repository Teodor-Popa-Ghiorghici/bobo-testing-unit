/* Bekkedal — every panel the game puts over the picture.
 *
 * The fishing gauge, the shop, the chest, the bag, the quest board, the travel
 * list, the sleep card and the ending painting. Lifted out of `index.js` line
 * for line: a move, not a rewrite, and the diff that created it should read
 * as one. Sleep joined it later, moved out of index.js's own draw() so this
 * really is where every panel lives, per this header.
 *
 * The board, the bag, the shop/workshop counters and the travel sign draw
 * their own material now instead of `panel()`'s flat black rectangle —
 * `menus_chrome.js`'s `board`/`note`/`cloth`/`counter`/`workbench`/`sign`/
 * `card`. `panel()` itself is untouched: the HUD, the tooltip and the
 * fishing gauge stay the machine's own chrome, on purpose.
 *
 * The two panels a *conversation* puts up — the dialogue box and the buy
 * prompt that comes out of one of its lines — are the exception, and they are
 * in `menus_talk.js` next door. Same reason `decor_outdoor.js` sits beside
 * `decor.js`: this file was at the 300-line ceiling and the dialogue box grew
 * a portrait column.
 *
 * All of it is *chrome*. It draws after `useLut(DAY_CSS, 'day')` in `draw()`,
 * so these panels and every glyph of text in them keep full contrast after
 * dark without any of them having to ask — see **Light and the hour** in this
 * app's CLAUDE.md.
 *
 * Two conventions, both there so the bodies could move unchanged:
 *
 *   `GG()` rather than a captured context, because `g` is repointed at the
 *   offscreen terrain canvas for the length of a cache rebuild.
 *
 *   Each function opens by binding `S`, `fish`, `dlg`, `shop`, `travel` and
 *   `offer` out of `A`. Those are live: `S` is the save and the rest are the
 *   transient mode objects `index.js` keeps beside it, replaced wholesale
 *   when a menu opens or closes, so they have to be read per call rather than
 *   captured once.
 *
 * The reel zone is the subtle one and worth reading before touching
 * `drawFish`: `tickFish` compares `fish.pos` against `z0`/`z1` in 0..1 and
 * knows nothing about pixels, so the drawn zone and the drawn needle are both
 * `FISH_TRACK_W` multiplied by those same figures, and both edges are rounded
 * the same way the needle is. Round the zone's *width* separately and the
 * drawn zone drifts a pixel off the real one, and the player misses a catch
 * that looked like a hit. `layout_check.js` asserts they agree.
 */
import { BEK_ITEMS, BEK_CROPS, BEK_TOOLS, BEK_MAPS, BEK_RECIPES, AXE_NAME, PICK_NAME, UI,
         BEK_W, BEK_H } from './data.js';
import { boardRows } from './quests.js';
import { createDialogue } from './menus_talk.js';
import { createChrome } from './menus_chrome.js';
import { WAT, TIM, CON, WAR, SAN, SNO, ATMO } from './palette.js';
import { FONT_SM, FONT_LG } from './font.js';
import { CELL_SM, LINE_SM, LINE_LG, PAD_SM, PAD_LG, GLYPH_SM, ICON_PX,
         FISH_TRACK_W, FISH_TRACK_H, FISH_W, FISH_H, FISH_X, FISH_Y,
         FISH_TRACK_X, FISH_TRACK_Y, FISH_NEEDLE_W, FISH_NEEDLE_OVER,
         SHOP_ROWS, SHOP_ROW, SHOP_W, SHOP_H, SHOP_X, SHOP_Y, SHOP_COL_W, SHOP_NAME_DX, SHOP_PRICE_DX,
         BAG_COLS, BAG_ROWS, BAG_CAP, BAG_ROW, BAG_W, BAG_H, BAG_X, BAG_Y, BAG_CW, BAG_NAME_DX, BAG_QTY_DX,
         QUEST_VISIBLE_ROWS, QUEST_ENTRY, QUEST_W, QUEST_H, QUEST_X, QUEST_Y, QUEST_STATUS_DX,
         QUEST_NOTE_X, QUEST_NOTE_W, QUEST_NOTE_H, QUEST_NOTE_INSET,
         TRAVEL_W, TRAVEL_H, TRAVEL_X, TRAVEL_Y,
         SLEEP_W, SLEEP_H, SLEEP_X, SLEEP_Y,
         END_SRC_W, END_SRC_H, END_TREES, END_TREE_DX, END_HOUSE_W, END_HOUSE_X,
         END_TEXT_X, END_TEXT_Y } from './layout.js';

export function createMenus(A, GG, C) {
  const { T, TX, iname, price, houseCost, recipeUnlocked, craftCount, panel, icon, text, textW, dither, stipple, bear } = A;
  const BEK_ART_SCALE = A.artScale;
  /* The two panels a *conversation* puts on screen — the dialogue box with
     its portrait and the buy prompt that comes out of one of its lines —
     live in menus_talk.js. Same reason decor_outdoor.js sits beside
     decor.js: this file was at the 300-line ceiling and the dialogue box is
     now the largest panel in the game, not a second organising principle. */
  const { drawTalk, drawOffer } = createDialogue(A, GG, C);
  /* Every other panel's own material — a board, a bag, a counter, a
     workbench, a sign, a card — instead of `panel()`'s flat black rectangle.
     See menus_chrome.js. `panel()` itself is untouched: the HUD, the crop
     tooltip and the fishing gauge stay the machine's own chrome. */
  const { board, note, cloth, counter, workbench, sign, card } = createChrome(GG, C, stipple);

  function drawFish() {
      const S = A.S(), fish = A.fish(), dlg = A.dlg(), shop = A.shop(), travel = A.travel(), offer = A.offer();
    panel(FISH_X, FISH_Y, FISH_W, FISH_H, fish.rare ? 11 : 14);
    const tx = FISH_TRACK_X, ty = FISH_Y + PAD_SM;
    if (fish.phase === 'reel') {
      GG().fillStyle = C(8); GG().fillRect(tx, FISH_TRACK_Y, FISH_TRACK_W, FISH_TRACK_H);
      /* Both edges are rounded from the track width the same way the
         needle is, so the zone the player sees spans exactly the 0..1
         interval tickFish tests against — rounding the width separately
         would let the drawn zone drift a pixel off the real one. */
      const z0 = Math.round(FISH_TRACK_W * fish.z0);
      const zw = Math.max(FISH_NEEDLE_W, Math.round(FISH_TRACK_W * fish.z1) - z0);
      GG().fillStyle = C(fish.rare ? 11 : 10); GG().fillRect(tx + z0, FISH_TRACK_Y, zw, FISH_TRACK_H);
      GG().fillStyle = C(15);
      GG().fillRect(tx + Math.round(FISH_TRACK_W * fish.pos) - FISH_NEEDLE_W / 2,
                 FISH_TRACK_Y - FISH_NEEDLE_OVER, FISH_NEEDLE_W, FISH_TRACK_H + FISH_NEEDLE_OVER * 2);
      const left = Math.max(0, fish.need - fish.hits);
      text(TX('DRA! SPACE x' + left, 'REEL! SPACE x' + left), tx, ty, fish.rare ? 11 : 14, FONT_SM);
    } else if (fish.phase === 'bite') {
      text(fish.rare ? TX('SJELDEN! NÅ!', 'RARE! NOW!') : TX('NÅ! SPACE', 'NOW! SPACE'), tx, ty, fish.rare ? 11 : 14, FONT_SM);
    } else text(TX('VENTER...', 'WAITING...'), tx, ty, 7, FONT_SM);
  }

  function drawShop() {
      const S = A.S(), fish = A.fish(), dlg = A.dlg(), shop = A.shop(), travel = A.travel(), offer = A.offer();
    counter(SHOP_X, SHOP_Y, SHOP_W, SHOP_H);
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
      const locked = (id === 'jordbarfro' && !S.flag.jordbar) || (id === 'rabarbrafro' && !S.flag.rabarbra) ||
                     (BEK_ITEMS[id].animal && !S.flag.barn);
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
  /* The chest's own panel — same box, same two columns, same input as
     drawShop above, just LAGE/KOK (craft/cook) instead of BUY/SELL and
     BEK_RECIPES instead of an NPC's stock list. The price column becomes
     how many of the recipe the current chest+bag stock can pay for right
     now (craftCount, index.js), which is more useful here than a kr figure
     would be — a locked recipe shows neither, same as a locked shop row. */
  function drawCraft() {
      const S = A.S(), fish = A.fish(), dlg = A.dlg(), shop = A.shop(), travel = A.travel(), offer = A.offer(), craft = A.craft();
    workbench(SHOP_X, SHOP_Y, SHOP_W, SHOP_H);
    const bx = SHOP_X + PAD_SM, sx = bx + SHOP_COL_W;
    let y = SHOP_Y + PAD_SM;
    text(T(UI.craft), bx, y, 14, FONT_SM);
    y += LINE_SM;
    text(T(UI.make), bx, y, craft.side ? 7 : 15, FONT_SM);
    text(T(UI.cook), sx, y, craft.side ? 15 : 7, FONT_SM);
    const rowY = y + LINE_SM;
    [['craft', bx, 0], ['cook', sx, 1]].forEach(([kind, cx, side]) => {
      BEK_RECIPES[kind].forEach((r, i) => {
        if (i >= SHOP_ROWS) return;
        const unlocked = recipeUnlocked(r);
        const on = craft.side === side && craft.sel === i;
        const ry = rowY + i * SHOP_ROW, tyy = ry + Math.round((ICON_PX - GLYPH_SM) / 2);
        icon(r.out, cx, ry);
        text((on ? '>' : ' ') + iname(r.out), cx + SHOP_NAME_DX, tyy, !unlocked ? 8 : (on ? 15 : 7), FONT_SM);
        if (unlocked) text('x' + craftCount(r), cx + SHOP_PRICE_DX, tyy, on ? 14 : 8, FONT_SM);
      });
    });
    text(TX('PILER · SPACE · ESC', 'ARROWS · SPACE · ESC'), bx, SHOP_Y + SHOP_H - PAD_SM - GLYPH_SM, 8, FONT_SM);
  }
  /* The bag fills nearly the whole picture now: three columns of eight,
     twenty-four lines instead of twelve, so a good day's foraging fits
     on one page and you stop having to guess what fell off the bottom. */
  function drawBag() {
      const S = A.S(), fish = A.fish(), dlg = A.dlg(), shop = A.shop(), travel = A.travel(), offer = A.offer();
    cloth(BAG_X, BAG_Y, BAG_W, BAG_H);
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
      const S = A.S(), fish = A.fish(), dlg = A.dlg(), shop = A.shop(), travel = A.travel(), offer = A.offer();
    if (id === 'oks') return T({ no: AXE_NAME.no[Math.min(1, S.axeLv - 1)], en: AXE_NAME.en[Math.min(1, S.axeLv - 1)] });
    if (id === 'hakke') { const lv = Math.max(1, S.pickLv); return T({ no: PICK_NAME.no[Math.min(1, lv - 1)], en: PICK_NAME.en[Math.min(1, lv - 1)] }); }
    return T(BEK_TOOLS.filter(tt => tt.id === id)[0].name);
  }
  function drawQuests() {
      const S = A.S(), fish = A.fish(), dlg = A.dlg(), shop = A.shop(), travel = A.travel(), offer = A.offer();
    board(QUEST_X, QUEST_Y, QUEST_W, QUEST_H);
    const bx = QUEST_X + PAD_SM;
    text(T(UI.board), bx, QUEST_Y + PAD_SM, 14, FONT_SM);
    let y = QUEST_Y + PAD_SM + LINE_SM * 2;
    /* fixed quests keep first claim on the rows, then the live repeatable
       ones, then the house — see boardRows() (quests.js) */
    const rows = boardRows(S);
    if (S.flag.build || S.flag.lot) {
      const c = houseCost();          /* act2Unlocked: the row reads as a title, not a build status */
      rows.push({ t: TX('HUSET VED VANNET', 'THE HOUSE BY THE WATER'), tc: 14,
        st: S.act2Unlocked ? TX('DITT HJEM', 'HOME') : S.built ? TX('BYGGET', 'BUILT') : (S.flag.lot ? TX('TOMT KJØPT', 'LOT BOUGHT') : TX('TOMT 1200 KR', 'LOT 1200 KR')),
        stc: S.act2Unlocked || S.built ? 10 : 11,
        d: S.built ? null : c.kr + ' kr + ' + c.tommer + ' ' + iname('tommer') + ' + ' + c.stein + ' ' + iname('stein') });
    }
    if (!rows.length) text(TX('Ingen oppdrag ennå. Snakk med folk.', 'No quests yet. Go and talk to people.'), bx, y, 7, FONT_SM);
    const scroll = Math.max(0, Math.min(A.qScroll(), Math.max(0, rows.length - QUEST_VISIBLE_ROWS)));
    rows.slice(scroll, scroll + QUEST_VISIBLE_ROWS).forEach(r => {
      note(QUEST_NOTE_X, y - QUEST_NOTE_INSET, QUEST_NOTE_W, QUEST_NOTE_H);
      text(T(r.t), bx, y, r.tc || (r.done ? 8 : 15), FONT_SM);
      text(T(r.st), bx + QUEST_STATUS_DX, y, r.stc || (r.done ? 10 : 11), FONT_SM);
      if (r.d) text(T(r.d), bx + CELL_SM, y + LINE_SM, 7, FONT_SM);
      y += QUEST_ENTRY;
    });
    if (rows.length > QUEST_VISIBLE_ROWS)
      text(TX('W/S — RULL  ', 'W/S — SCROLL  ') + (scroll + QUEST_VISIBLE_ROWS) + '/' + rows.length,
           bx, QUEST_Y + QUEST_H - PAD_SM - GLYPH_SM, 9, FONT_SM);
    text('ESC', QUEST_X + QUEST_W - PAD_SM - textW('ESC', FONT_SM), QUEST_Y + QUEST_H - PAD_SM - GLYPH_SM, 8, FONT_SM);
  }
  function drawTravel() {
      const S = A.S(), fish = A.fish(), dlg = A.dlg(), shop = A.shop(), travel = A.travel(), offer = A.offer();
    sign(TRAVEL_X, TRAVEL_Y, TRAVEL_W, TRAVEL_H);
    const bx = TRAVEL_X + PAD_SM;
    text(T(UI.map), bx, TRAVEL_Y + PAD_SM, 14, FONT_SM);
    let y = TRAVEL_Y + PAD_SM + LINE_SM * 2;
    travel.list.forEach((mp, i) => {
      text((travel.sel === i ? '> ' : '  ') + T(BEK_MAPS[mp].title), bx, y + i * LINE_SM, travel.sel === i ? 15 : 7, FONT_SM);
    });
    text(TX('SPACE — GÅ (−10, +40min)', 'SPACE — WALK (−10, +40min)'), bx, TRAVEL_Y + TRAVEL_H - PAD_SM - GLYPH_SM, 8, FONT_SM);
  }
  /* Sleep used to be drawn inline in index.js's draw(), the one panel that
     wasn't. Moved here so every panel the game puts over the picture really
     does live in one place, per this file's own header. */
  function drawSleep() {
    card(SLEEP_X, SLEEP_Y, SLEEP_W, SLEEP_H);
    text(T(UI.sleep), SLEEP_X + PAD_LG, SLEEP_Y + PAD_LG, 15, FONT_LG);
    text(T(UI.goodnight), SLEEP_X + PAD_LG, SLEEP_Y + PAD_LG + LINE_LG, 7, FONT_LG);
  }

  /* ---- the ending ----------------------------------------------------
     A bespoke painting rather than a tile scene, so it keeps its own
     source-space coordinates and reaches the screen through the same
     whole-number transform the playfield uses. */
  function drawEnd(t) {
      const S = A.S(), fish = A.fish(), dlg = A.dlg(), shop = A.shop(), travel = A.travel(), offer = A.offer();
    GG().fillStyle = C(WAT[2]); GG().fillRect(0, 0, BEK_W, BEK_H);
    dither(ATMO[0], Math.max(0, 16 - S.ending * 6));

    GG().save();
    GG().scale(BEK_ART_SCALE, BEK_ART_SCALE);
    for (let i = 0; i < END_TREES; i++) {
      const tx = 20 + i * END_TREE_DX, ty = 150 + (i % 2) * 20;
      GG().fillStyle = C(TIM[1]); GG().fillRect(tx + 10, ty + 30, 6, 22);
      GG().fillStyle = C(CON[1]); GG().fillRect(tx, ty, 26, 34);
      GG().fillStyle = C(CON[2]); GG().fillRect(tx + 4, ty + 4, 18, 16);
    }
    const cx = END_HOUSE_X;                                   /* the house, centred */
    GG().fillStyle = C(WAR[0]); GG().fillRect(cx, 90, END_HOUSE_W, 30); GG().fillStyle = C(WAR[1]); GG().fillRect(cx, 96, END_HOUSE_W, 4);
    GG().fillStyle = C(TIM[3]); GG().fillRect(cx + 6, 120, 88, 60); GG().fillStyle = C(TIM[1]); GG().fillRect(cx + 40, 148, 20, 32);
    GG().fillStyle = C(WAR[4]); GG().fillRect(cx + 14, 130, 16, 14); GG().fillRect(cx + 70, 130, 16, 14); GG().fillStyle = C(SAN[2]); GG().fillRect(cx + 14, 130, 16, 3);
    GG().fillStyle = C(WAT[1]); GG().fillRect(0, 210, END_SRC_W, END_SRC_H - 210);
    GG().fillStyle = C(WAT[3]); for (let i = 0; i < 12; i++) GG().fillRect(20 + i * 40, 226 + (i % 3) * 14, 22, 1);
    if (S.ending > 1.2) bear(END_SRC_W - 80, 168, Math.floor(S.ending * 2) % 4);
    GG().restore();

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
    /* not "start over" — this screen no longer resets S, so SPACE says what it does */
    const cont = TX('SPACE — FORTSETT', 'SPACE — CONTINUE');
    if (S.ending > 1.6 + lines.length * 0.7 + 1.2) text(cont, Math.round((BEK_W - textW(cont, FONT_SM)) / 2), BEK_H - PAD_LG - GLYPH_SM, 8, FONT_SM);
  }

  return { drawFish: drawFish, drawTalk: drawTalk, drawOffer: drawOffer, drawShop: drawShop,
           drawCraft: drawCraft, drawBag: drawBag, drawQuests: drawQuests, drawTravel: drawTravel,
           drawSleep: drawSleep, drawEnd: drawEnd, toolName: toolName };
}
