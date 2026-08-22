/* Bekkedal — the loft's own two panels: the shelves, and the second ending.
 *
 * A sibling of `menus.js` for the 300-line rule, exactly the way
 * `menus_talk.js`, `menus_chrome.js` and `menus_fish.js` are — not a second
 * organising principle. Both panels here belong to one thing (BEK_LOFT,
 * data.js; `spine.js` for every question either of them asks), and the ending
 * is a bespoke painting like `drawEnd`'s, so the two want the same file.
 *
 * **`drawEnd` is untouched and stays where it is.** That screen is the close
 * of Act I — the house by the water, and the choices you made getting to it —
 * and this one does not replace it, follow from it or reuse a pixel of it.
 * It is a second ending to a second thing, and it reads back a second set of
 * choices: which wing you began with, which you left until last, how long the
 * whole year took, and what the valley gave up to fill the shelves.
 *
 * Same two conventions as `menus.js`: `GG()` rather than a captured context
 * (`g` is repointed at the terrain canvas for the length of a cache rebuild),
 * and `A`'s accessors read per call rather than captured, because the mode
 * objects beside `S` are replaced wholesale when a menu opens or closes.
 */
import { BEK_LOFT, BEK_LOFT_STAGES, BEK_SEASONS, BEK_W, BEK_H } from './data.js';
import { spineProgress, spineStage, nextStage, wingProgress, entryDone,
         entryReady, wingOrder, LOFT_TOTAL } from './spine.js';
import { TIM, STO, WAR, SAN, SNO, CON, ATMO, GRASS, WAT } from './palette.js';
import { FONT_SM, FONT_LG } from './font.js';
import { CELL_SM, LINE_SM, PAD_SM, PAD_LG, GLYPH_SM, ICON_PX, BORDER,
         LOFT_W, LOFT_H, LOFT_X, LOFT_Y, LOFT_ROW, LOFT_WING_ROW,
         LOFT_BAR_W, LOFT_BAR_H, LOFT_COUNT_DX, LOFT_ENTRY_DX, LOFT_NAME_DX,
         END_SRC_W, END_SRC_H, END_TEXT_X, LOFT_END_LINES, LOFT_END_TEXT_Y } from './layout.js';

export function createSpine(A, GG, C, chrome) {
  const { T, TX, iname, icon, text, textW, dither } = A;
  const BEK_ART_SCALE = A.artScale;

  /* ---- the shelves ---------------------------------------------------------
     Two columns. On the left the seven wings, each a name, a count and a fill
     bar — which is the answer to "how far along am I" at a glance. On the
     right, the selected wing's own entries, one row each, so the answer to
     "what am I still missing" is one keypress away and never a guess.

     There is no per-entry cursor and there deliberately is not one: SPACE
     gives the loft everything it wants out of the bag at once
     (`spineWants()`), so a good day's carrying is one keystroke rather than
     sixty-four. What the rows are for is reading, not picking. */
  function drawSpine() {
    const S = A.S(), loft = A.loft();
    /* the shelf lips are laid on this panel's own entry grid — see shelf()
       in menus_chrome.js for why a lip at an arbitrary height is a line
       struck through whatever text sits at it */
    chrome.shelf(LOFT_X, LOFT_Y, LOFT_W, LOFT_H, LOFT_Y + PAD_SM + LINE_SM * 2, LOFT_ROW);
    const bx = LOFT_X + PAD_SM;
    const p = spineProgress(S), st = spineStage(S), nx = nextStage(S);
    let y = LOFT_Y + PAD_SM;
    text(T({ no: 'LOFTET', en: 'THE LOFT' }), bx, y, 14, FONT_SM);
    const count = p.have + '/' + p.need;
    text(count, LOFT_X + LOFT_W - PAD_SM - textW(count, FONT_SM), y, p.have === p.need ? 10 : 15, FONT_SM);
    y += LINE_SM;
    /* the building's own state, in the same row the shop puts BUY/SELL in */
    const stageLine = st ? T(BEK_LOFT_STAGES[st - 1].t)
                         : TX('SKAL RESTAURERES', 'STILL TO BE RESTORED');
    text(stageLine, bx, y, st ? 10 : 8, FONT_SM);
    if (nx) {
      const nxt = T(nx.t) + ' — ' + nx.at;
      text(nxt, LOFT_X + LOFT_W - PAD_SM - textW(nxt, FONT_SM), y, 7, FONT_SM);
    }
    const rowY = y + LINE_SM;

    /* the wing column */
    BEK_LOFT.forEach((w, i) => {
      const wp = wingProgress(S, w), full = wp.have === wp.need;
      const on = loft.sel === i;
      const wy = rowY + i * LOFT_WING_ROW;
      text((on ? '>' : ' ') + T(w.t), bx, wy, full ? 10 : on ? 15 : 7, FONT_SM);
      const c = wp.have + '/' + wp.need;
      text(c, bx + LOFT_COUNT_DX, wy, full ? 10 : on ? 14 : 8, FONT_SM);
      /* the bar: a trough and however much of it is filled. Two steps of one
         ramp, so it needs no declared contrast pair of its own. */
      const by = wy + LINE_SM - BORDER;
      GG().fillStyle = C(STO[1]); GG().fillRect(bx + CELL_SM, by, LOFT_BAR_W, LOFT_BAR_H);
      const fw = Math.round(LOFT_BAR_W * wp.have / wp.need);
      if (fw > 0) { GG().fillStyle = C(full ? GRASS[3] : WAR[2]); GG().fillRect(bx + CELL_SM, by, fw, LOFT_BAR_H); }
    });

    /* the entry column */
    const wing = BEK_LOFT[loft.sel % BEK_LOFT.length];
    const ex = bx + LOFT_ENTRY_DX;
    const held = id => (S.bag[id] || 0);
    wing.e.forEach((e, i) => {
      const ry = rowY + i * LOFT_ROW, tyy = ry + Math.round((ICON_PX - GLYPH_SM) / 2);
      const done = entryDone(S, e), ready = entryReady(S, e, held);
      if (e.item) icon(e.item, ex, ry);
      const label = e.t ? T(e.t) : iname(e.item);
      text(label, ex + LOFT_NAME_DX, tyy, done ? 10 : ready ? 14 : 8, FONT_SM);
      /* the mark, hard against the right edge: given, ready to give, or not
         yet — three states and never a fourth */
      const mark = done ? TX('GITT', 'GIVEN') : ready ? TX('KLAR', 'READY') : '—';
      text(mark, LOFT_X + LOFT_W - PAD_SM - textW(mark, FONT_SM), tyy, done ? 10 : ready ? 14 : 8, FONT_SM);
    });

    text(TX('W/S — VING · SPACE — GI · ESC', 'W/S — WING · SPACE — GIVE · ESC'),
         bx, LOFT_Y + LOFT_H - PAD_SM - GLYPH_SM, 8, FONT_SM);
  }

  /* ---- the second ending ---------------------------------------------------
     The house ending is a house at the water's edge seen from outside, at
     dusk, because that is what a house you built is: something you look at.
     This one is inside, at lamplight, because a loft you filled is somewhere
     you stand — seven plinths down the hall with something on every one of
     them, the shutters open, and the valley's own year on the shelves.

     Same construction as `drawEnd`: a bespoke painting in its own source
     space, reaching the screen through the same whole-number transform the
     playfield uses, and the lines revealed one at a time off `S.ending`. */
  function drawLoftEnd(t) {
    const S = A.S();
    GG().fillStyle = C(TIM[0]); GG().fillRect(0, 0, BEK_W, BEK_H);

    GG().save();
    GG().scale(BEK_ART_SCALE, BEK_ART_SCALE);
    const ROOF = 28, FLOOR = 118;            /* the wall runs between the two */
    /* the roof, seen from under it: rafters running back into the dark */
    GG().fillStyle = C(ATMO[0]); GG().fillRect(0, 0, END_SRC_W, ROOF);
    for (let i = 0; i < 7; i++) {
      const rx = 10 + i * Math.floor((END_SRC_W - 20) / 7);
      GG().fillStyle = C(TIM[0]); GG().fillRect(rx, 0, 8, ROOF);
      GG().fillStyle = C(ATMO[1]); GG().fillRect(rx + 8, 0, 3, ROOF);
    }
    GG().fillStyle = C(TIM[1]); GG().fillRect(0, ROOF - 4, END_SRC_W, 6);
    /* the log wall, course by course — the same 12px rhythm building.js gives
       a wall from outside, because it is the same wall from the other side */
    GG().fillStyle = C(TIM[2]); GG().fillRect(0, ROOF, END_SRC_W, FLOOR - ROOF);
    for (let y = ROOF + 4; y < FLOOR; y += 12) {
      GG().fillStyle = C(TIM[3]); GG().fillRect(0, y, END_SRC_W, 2);
      GG().fillStyle = C(TIM[1]); GG().fillRect(0, y + 2, END_SRC_W, 1);
    }
    /* two windows with a late summer evening still in them, and the light
       they throw down the wall under each */
    [38, END_SRC_W - 82].forEach(wx => {
      GG().fillStyle = C(TIM[1]); GG().fillRect(wx - 4, 38, 48, 46);
      GG().fillStyle = C(WAR[4]); GG().fillRect(wx, 42, 40, 38);
      GG().fillStyle = C(SAN[2]); GG().fillRect(wx, 42, 40, 5);
      GG().fillStyle = C(TIM[1]); GG().fillRect(wx + 19, 42, 2, 38); GG().fillRect(wx, 59, 40, 2);
      GG().fillStyle = C(WAR[2]); GG().fillRect(wx - 6, 84, 52, 3);
    });
    /* the floor: boards laid across the room, a step either way per board so
       it reads as timber laid rather than as one wash */
    for (let i = 0, y = FLOOR; y < END_SRC_H; i++, y += 9) {
      GG().fillStyle = C(i % 3 === 1 ? TIM[2] : i % 3 === 2 ? TIM[0] : TIM[1]);
      GG().fillRect(0, y, END_SRC_W, 8);
      GG().fillStyle = C(TIM[0]); GG().fillRect(0, y + 8, END_SRC_W, 1);
    }
    GG().fillStyle = C(TIM[0]); GG().fillRect(0, FLOOR - 2, END_SRC_W, 3);
    /* seven plinths standing on that floor, one per wing, each carrying its
       display as one block of that wing's own colour — a painting of the
       room, not the room */
    const shelfCol = [GRASS[3], CON[2], WAT[3], STO[4], SAN[2], WAR[2], SNO[1]];
    for (let i = 0; i < 7; i++) {
      const px = 26 + i * Math.floor((END_SRC_W - 66) / 7);
      GG().fillStyle = C(ATMO[1]); GG().fillRect(px - 3, FLOOR, 38, 4);
      GG().fillStyle = C(TIM[2]); GG().fillRect(px, FLOOR - 34, 32, 34);
      GG().fillStyle = C(TIM[3]); GG().fillRect(px, FLOOR - 34, 32, 3);
      GG().fillStyle = C(TIM[0]); GG().fillRect(px + 29, FLOOR - 34, 3, 34);
      GG().fillStyle = C(shelfCol[i]); GG().fillRect(px + 8, FLOOR - 52, 16, 18);
      GG().fillStyle = C(TIM[3]); GG().fillRect(px + 8, FLOOR - 52, 16, 2);
    }
    GG().restore();
    /* the fade in, over the whole picture rather than under it — the room is
       the background here, the way the sky is in drawEnd */
    dither(ATMO[0], Math.max(0, 15 - Math.floor(S.ending * 5)));

    const title = T({ no: 'LOFTET', en: 'THE LOFT' }) + '.';
    text(title, Math.round((BEK_W - textW(title, FONT_LG)) / 2), PAD_LG, 14, FONT_LG);

    const lines = endLines(S).slice(0, LOFT_END_LINES);
    const ly = LOFT_END_TEXT_Y;
    for (let i = 0; i < lines.length; i++)
      if (S.ending > 1.6 + i * 0.7) text(lines[i], END_TEXT_X, ly + i * LINE_SM, i === 0 ? 15 : 11, FONT_SM);
    const stat = TX('DAG ', 'DAY ') + S.day + ' — ' + LOFT_TOTAL + '/' + LOFT_TOTAL;
    if (S.ending > 1.6 + lines.length * 0.7 + 0.5)
      text(stat, Math.round((BEK_W - textW(stat, FONT_SM)) / 2), ly + lines.length * LINE_SM + LINE_SM, 11, FONT_SM);
    const cont = TX('SPACE — FORTSETT', 'SPACE — CONTINUE');
    if (S.ending > 1.6 + lines.length * 0.7 + 1.2)
      text(cont, Math.round((BEK_W - textW(cont, FONT_SM)) / 2), BEK_H - PAD_LG - GLYPH_SM, 8, FONT_SM);
  }
  /* What this ending remembers, the way the house ending remembers why you
     came and how you built. Every line is derived from what is already in the
     save — the order the wings were finished in comes out of the day stamped
     on each gift (spine.js's wingOrder), so none of this cost a field. */
  function endLines(S) {
    const out = [];
    out.push(TX('Sekstifire ting. Hver eneste en båret inn.',
                'Sixty-four things. Every one of them carried in.'));
    const order = wingOrder(S);
    if (order.length === BEK_LOFT.length) {
      out.push(TX('Du begynte med ' + T(order[0].w.t).toLowerCase() + '.',
                  'You began with ' + T(order[0].w.t).toLowerCase() + '.'));
      out.push(TX('Du sparte ' + T(order[order.length - 1].w.t).toLowerCase() + ' til sist.',
                  'You left ' + T(order[order.length - 1].w.t).toLowerCase() + ' until last.'));
    }
    const first = (S.spine && S.spine.first) || 0;
    if (first) {
      const n = Math.max(1, S.day - first);
      out.push(TX(n + ' dager fra den første gaven til den siste.',
                  n + ' days from the first gift to the last.'));
    }
    if (S.flag.build === 'skog') out.push(TX('Huset hogg du selv. Dette bar du selv.',
                                             'The house you felled yourself. This you carried yourself.'));
    else if (S.flag.build === 'kjop') out.push(TX('Plankene kom med båt. Hyllene fylte du.',
                                                 'The planks came by boat. The shelves you filled.'));
    if ((S.deepest || 0) >= 20) out.push(TX('Tjue etasjer ned, og krystallen kom opp med deg.',
                                            'Twenty floors down, and the crystal came up with you.'));
    else if ((S.deepest || 0) >= 10) out.push(TX('Ti etasjer ned. Mørket beholdt ingenting.',
                                                 'Ten floors down. The dark kept nothing.'));
    const legends = Object.keys(S.legend || {}).length;
    if (legends >= 3) out.push(TX('Tre sagn, av tre vann. Ingen tror deg.',
                                  'Three legends, out of three waters. Nobody believes you.'));
    out.push(TX('Åtte mennesker, og ingen av dem fremmede lenger.',
                'Eight people, and not one of them a stranger now.'));
    if (S.flag.greenhouse) out.push(TX('Glass på gården. Noe grønt hele året.',
                                       'Glass on the farm. Something green all year.'));
    const season = BEK_SEASONS[S.season] && BEK_SEASONS[S.season].n;
    if (season) out.push(TX('Det ble ' + T(season).toLowerCase() + ' igjen mens du bar.',
                            'It came round to ' + T(season).toLowerCase() + ' again while you carried.'));
    return out;
  }

  return { drawSpine: drawSpine, drawLoftEnd: drawLoftEnd };
}
