/* Bekkedal — the materials the menus are furniture out of.
 *
 * Every panel `menus.js` draws used to be `panel()`: a black rectangle and a
 * one-pixel edge, the same box for a satchel, a shop counter and a notice
 * board. `panel()` itself is untouched and still draws the HUD, the crop
 * tooltip and the fishing gauge — those stay the machine's own chrome, and
 * the dialogue box keeps its own portrait-and-plate treatment in
 * `menus_talk.js`. What is here is the other six: the board is planed
 * timber with pinned paper, the bag is leather and cloth, the shop counter
 * carries a slate, the workbench is bare planks, the travel sign is routed
 * timber, and the sleep card is a quiet dark blue rather than a black box.
 *
 * Every fill is `C(RAMP[i])`, every blend is `stipple()` (the chrome-space
 * ordered dither `menus_talk.js`'s portraits already use), and every edge is
 * two adjacent steps of one ramp — the contrast rule's own same-ramp
 * exemption, so nothing here needs a declared table. `FRAME` is the one new
 * unit, three borders wide and chosen to sit inside `PAD_SM`/`PAD_LG`, so no
 * panel's interior text position moves and `layout_check.js` needed no new
 * constant to stay honest about what still fits.
 *
 * These are all called with the panel already positioned in `layout.js`'s
 * own device-pixel space — no transform to cancel, unlike `wash()`'s callers
 * on the playfield.
 */
import { TIM, STO, SOI, SAN, ATMO } from './palette.js';
import { BORDER, PANEL_FRAME } from './layout.js';

export function createChrome(GG, C, stipple) {
  const FRAME = PANEL_FRAME;

  /* the shared shape: a base fill, lit top/left, shadowed bottom/right —
     the same corner every building and portrait in this game is lit from */
  function frame(x, y, w, h, base, lo, hi) {
    GG().fillStyle = C(base); GG().fillRect(x, y, w, h);
    GG().fillStyle = C(hi); GG().fillRect(x, y, w, FRAME); GG().fillRect(x, y, FRAME, h);
    GG().fillStyle = C(lo); GG().fillRect(x, y + h - FRAME, w, FRAME); GG().fillRect(x + w - FRAME, y, FRAME, h);
  }
  const inner = (x, y, w, h) => [x + FRAME, y + FRAME, w - FRAME * 2, h - FRAME * 2];

  /* ---- the notice board ---------------------------------------------- */
  function board(x, y, w, h) {
    frame(x, y, w, h, TIM[2], TIM[0], TIM[3]);
    const [ix, iy, iw, ih] = inner(x, y, w, h);
    GG().fillStyle = C(TIM[0]); GG().fillRect(ix, iy, iw, ih);
    /* a handful of staggered grain lines, so the wood still reads between
       whichever notices happen to be pinned to it this session */
    for (let i = 0; i < 4; i++) {
      const gy = iy + Math.round(2 + i * (ih - 4) / 3);
      const gw = Math.round(iw * (0.5 + (i % 2) * 0.2));
      const gx = ix + ((i * 71) % Math.max(1, iw - gw));
      GG().fillStyle = C(TIM[1]); GG().fillRect(gx, gy, gw, BORDER);
    }
    const peg = BORDER * 2;
    [[x + FRAME / 2, y + FRAME / 2], [x + w - FRAME * 1.5, y + FRAME / 2],
     [x + FRAME / 2, y + h - FRAME * 1.5], [x + w - FRAME * 1.5, y + h - FRAME * 1.5]]
      .forEach(([px, py]) => { GG().fillStyle = C(TIM[0]); GG().fillRect(px, py, peg, peg); });
  }
  /* one pinned notice: flat parchment (a stipple this large at anything past
     a light dusting reads as a tablecloth, not paper — see cloth()/counter()'s
     own strength 3 for the same lesson), a curled top-right corner and an
     iron pin through the top edge. Called once per visible board row, behind
     the row's own text. */
  function note(x, y, w, h) {
    GG().fillStyle = C(SAN[0]); GG().fillRect(x, y, w, h);
    stipple(x, y, w, h, SAN[1], 2);
    GG().fillStyle = C(SAN[1]); GG().fillRect(x, y, w, BORDER); GG().fillRect(x, y, BORDER, h);
    GG().fillStyle = C(SAN[0]); GG().fillRect(x, y + h - BORDER, w, BORDER); GG().fillRect(x + w - BORDER, y, BORDER, h);
    const c = BORDER * 3;
    for (let i = 0; i < 3; i++) {
      GG().fillStyle = C(i % 2 ? SAN[2] : SAN[1]);
      GG().fillRect(x + w - c + i * BORDER, y + i * BORDER, c - i * BORDER, BORDER);
    }
    const px = x + Math.round(w / 2) - BORDER, py = y - BORDER;
    GG().fillStyle = C(STO[3]); GG().fillRect(px, py, BORDER * 2, BORDER * 2);
    GG().fillStyle = C(STO[5]); GG().fillRect(px, py, BORDER, BORDER);
  }

  /* ---- the bag: cloth and leather -------------------------------------- */
  function cloth(x, y, w, h) {
    frame(x, y, w, h, SOI[0], SOI[0], SOI[2]);
    const [ix, iy, iw, ih] = inner(x, y, w, h);
    GG().fillStyle = C(SOI[0]); GG().fillRect(ix, iy, iw, ih);
    stipple(ix, iy, iw, ih, SOI[1], 3);                 /* a coarse woven lining */
    GG().fillStyle = C(SAN[1]);                         /* the stitching */
    for (let i = 0; i * BORDER * 2 < iw; i++) {
      GG().fillRect(ix + i * BORDER * 2, iy, BORDER, BORDER);
      GG().fillRect(ix + i * BORDER * 2, iy + ih - BORDER, BORDER, BORDER);
    }
    const rv = BORDER * 2;
    [[x + FRAME / 2, y + FRAME / 2], [x + w - FRAME * 1.5, y + FRAME / 2],
     [x + FRAME / 2, y + h - FRAME * 1.5], [x + w - FRAME * 1.5, y + h - FRAME * 1.5]]
      .forEach(([px, py]) => {
        GG().fillStyle = C(STO[4]); GG().fillRect(px, py, rv, rv);
        GG().fillStyle = C(STO[5]); GG().fillRect(px, py, BORDER, BORDER);
      });
  }

  /* ---- the shop: a counter with a slate -------------------------------- */
  function counter(x, y, w, h) {
    frame(x, y, w, h, TIM[2], TIM[0], TIM[3]);
    const [ix, iy, iw, ih] = inner(x, y, w, h);
    GG().fillStyle = C(STO[0]); GG().fillRect(ix, iy, iw, ih);
    stipple(ix, iy, iw, ih, STO[1], 3);                 /* chalk dust on slate */
    GG().fillStyle = C(STO[2]);                         /* the lip it is set into */
    GG().fillRect(ix, iy, iw, BORDER); GG().fillRect(ix, iy, BORDER, ih);
  }

  /* ---- the workshop: a workbench ---------------------------------------- */
  function workbench(x, y, w, h) {
    frame(x, y, w, h, TIM[1], TIM[0], TIM[2]);
    const [ix, iy, iw, ih] = inner(x, y, w, h);
    GG().fillStyle = C(TIM[0]); GG().fillRect(ix, iy, iw, ih);
    for (let i = 0; i < 5; i++) {                       /* bare plank seams */
      const gy = iy + Math.round((i + 0.5) * ih / 5);
      GG().fillStyle = C(TIM[1]); GG().fillRect(ix, gy, iw, BORDER);
    }
  }

  /* ---- the travel sign --------------------------------------------------- */
  function sign(x, y, w, h) {
    frame(x, y, w, h, TIM[2], TIM[0], TIM[3]);
    const [ix, iy, iw, ih] = inner(x, y, w, h);
    GG().fillStyle = C(TIM[0]); GG().fillRect(ix, iy, iw, ih);
    GG().fillStyle = C(TIM[1]);                         /* routed lines top and bottom */
    GG().fillRect(ix + BORDER, iy + BORDER, iw - BORDER * 2, BORDER);
    GG().fillRect(ix + BORDER, iy + ih - BORDER * 2, iw - BORDER * 2, BORDER);
  }

  /* ---- sleep: a quiet card, not a black box ------------------------------ */
  function card(x, y, w, h) {
    GG().fillStyle = C(ATMO[0]); GG().fillRect(x, y, w, h);
    GG().fillStyle = C(ATMO[2]); GG().fillRect(x, y, w, BORDER); GG().fillRect(x, y, BORDER, h);
    GG().fillStyle = C(ATMO[1]); GG().fillRect(x, y + h - BORDER, w, BORDER); GG().fillRect(x + w - BORDER, y, BORDER, h);
    stipple(x, y, w, h, ATMO[2], 1);
  }

  /* ---- the loft: shelving in a log storehouse ---------------------------
     Deeper timber than the workbench and lit from the same corner, with the
     shelf lips reading as the horizontal that the two columns of the panel
     sit on. Cross-braces at the ends, so the box reads as a frame standing
     against a wall rather than as another plank surface: the loft is the one
     panel whose whole subject is things stood on shelves. */
  function shelf(x, y, w, h, rowY, rowH) {
    frame(x, y, w, h, TIM[2], TIM[1], TIM[3]);
    const [ix, iy, iw, ih] = inner(x, y, w, h);
    GG().fillStyle = C(TIM[0]); GG().fillRect(ix, iy, iw, ih);
    stipple(ix, iy, iw, ih, TIM[1], 2);                 /* the grain of old logs */
    /* The lips are laid on the caller's own row grid rather than on an even
       fifth of the box, and that is not decoration: a shelf edge ruled at an
       arbitrary height crosses whatever text happens to be at that height and
       reads as a line struck through it. Given the first row's top and a row
       height, every lip lands in the gap between two rows. */
    const step = (rowH || Math.round(ih / 5)) * 3;
    for (let sy = (rowY != null ? rowY : iy + step) - BORDER * 2; sy < iy + ih - BORDER * 2; sy += step) {
      if (sy <= iy) continue;
      GG().fillStyle = C(TIM[1]); GG().fillRect(ix, sy, iw, BORDER);
      GG().fillStyle = C(TIM[2]); GG().fillRect(ix, sy + BORDER, iw, BORDER);
    }
    const br = BORDER * 2;                              /* the end braces */
    GG().fillStyle = C(TIM[1]);
    GG().fillRect(ix, iy, br, ih); GG().fillRect(ix + iw - br, iy, br, ih);
    GG().fillStyle = C(TIM[2]);
    GG().fillRect(ix + br, iy, BORDER, ih); GG().fillRect(ix + iw - br - BORDER, iy, BORDER, ih);
  }

  return { board, note, cloth, counter, workbench, sign, card, shelf };
}
