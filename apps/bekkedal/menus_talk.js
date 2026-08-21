/* Bekkedal — the dialogue box, and the buy prompt that comes out of it.
 *
 * Split out of `menus.js` for the same reason `decor_outdoor.js` sits beside
 * `decor.js`: that file was at the 300-line ceiling and these two panels grew.
 * They belong together — an offer is always reached through a line somebody
 * speaks, and both of them now name their speaker the same way.
 *
 * The box used to be a black rectangle with one line of text in it, no
 * portrait, and the speaker's name printed twice: once as a yellow header
 * here, and once inside the line itself, because nearly every string in
 * `BEK_TALK` began 'ASTRID: '. There are eight people in this valley and you
 * could finish the game without seeing one of their faces.
 *
 * What replaces it is two columns. On the left `portrait.js` draws a
 * head-and-shoulders bust wearing one of three expressions, with the
 * speaker's name on a plate under it; on the right the line, and, when the
 * line is a question, the answers as rows the selection actually moves
 * between rather than as a caret in front of a line of text. The plate is
 * the one place a speaker is named now, which is what let the prefixes come
 * off two hundred and eighteen strings in `data.js`.
 *
 * Everything the old box did that was worth keeping is untouched: the blip
 * per character voice (`speechTick`, index.js) still reads `dlg.lines[dlg.i]`
 * and knows nothing about any of this, and the node/ask/chat structure, every
 * `when` and `if` predicate and every give/buy/set payload are the same
 * objects they were.
 *
 * Same two conventions as `menus.js`: `GG()` rather than a captured context,
 * and `A`'s accessors read per call because the mode objects beside `S` are
 * replaced wholesale when a menu opens or closes.
 */
import { FONT_SM, FONT_LG } from './font.js';
import { createPortrait } from './portrait.js';
import { BORDER, PAD_LG, LINE_LG, GLYPH_SM, GLYPH_LG,
         DLG_BODY_LINES, DLG_W, DLG_H, DLG_X, DLG_Y, DLG_TX, DLG_TW,
         DLG_TX_FULL, DLG_TW_FULL, DLG_PORT_X, DLG_PORT_Y, DLG_PORT_W, DLG_PORT_H,
         DLG_PLATE_Y, DLG_PLATE_H, DLG_GAP, DLG_ROW_PAD,
         OFFER_W, OFFER_H, OFFER_X, OFFER_Y, OFFER_NAME_H } from './layout.js';

export function createDialogue(A, GG, C) {
  const { T, TX, panel, text, textW, wrapText } = A;
  const { portrait } = createPortrait(GG, C, A.stipple, A.artScale);

  /* A name on a plate: the panel's own edge colour around the box, the
     panel's own black inside it, and the name centred. It is the *only*
     place a speaker is named now — which is the whole reason the 'ASTRID: '
     prefix could come off two hundred and eighteen strings in data.js. */
  function plate(px, py, w, h, name) {
    GG().fillStyle = C(8); GG().fillRect(px, py, w, h);
    GG().fillStyle = C(0); GG().fillRect(px + BORDER, py + BORDER, w - BORDER * 2, h - BORDER * 2);
    text(name, px + Math.round((w - textW(name, FONT_SM)) / 2),
         py + Math.round((h - GLYPH_SM) / 2), 14, FONT_SM);
  }

  /* Which face the speaker is wearing for this line: the line's own if it
     carries one, else the mood of the node or chat entry it came out of,
     else their resting face. A line only *has* a mood when it is the object
     form — a bare string has nowhere to hang one — which is why the three
     lines in data.js whose tone turns mid-entry are written out as objects. */
  function moodOf(dlg) {
    const l = dlg.lines && dlg.lines[dlg.i];
    return (l && l.m) || dlg.mood || 'neutral';
  }
  /* An answer is a row the selection moves between, not a caret in front of
     a line of text: the whole row inverts, which is the one thing in this
     app's chrome vocabulary that unambiguously says "this is the one". */
  function optRow(str, tx, tw, y, on) {
    const rows = wrapText(str, tw, FONT_LG);
    for (const l of rows) {
      if (on) {
        GG().fillStyle = C(15);
        GG().fillRect(tx - DLG_ROW_PAD * 2, y - DLG_ROW_PAD, tw + DLG_ROW_PAD * 4, GLYPH_LG + DLG_ROW_PAD * 2);
      }
      text(l, tx, y, on ? 0 : 7, FONT_LG);
      y += LINE_LG;
    }
    return y;
  }
  function drawTalk() {
    const dlg = A.dlg();          /* read per call: index.js replaces it wholesale */
    panel(DLG_X, DLG_Y, DLG_W, DLG_H, 15);
    /* Bjørn has no name and never had one; narration and the lot sign have
       no speaker at all. Those keep the whole width rather than being given
       an empty column to sit beside — and the wrapping the check proves is
       the *narrow* case, so the wide one cannot burst. */
    const npc = dlg.npc && !dlg.npc.bear ? dlg.npc : null;
    const tx = npc ? DLG_TX : DLG_TX_FULL, tw = npc ? DLG_TW : DLG_TW_FULL;
    if (npc) {
      portrait(npc, moodOf(dlg), DLG_PORT_X, DLG_PORT_Y, DLG_PORT_W, DLG_PORT_H);
      plate(DLG_PORT_X, DLG_PLATE_Y, DLG_PORT_W, DLG_PLATE_H, npc.n);
    }
    let y = DLG_Y + PAD_LG;
    const hint = (str) => text(str, DLG_X + DLG_W - PAD_LG - textW(str, FONT_SM),
                               DLG_Y + DLG_H - PAD_LG - GLYPH_SM, 8, FONT_SM);
    if (dlg.opts) {
      wrapText(T(dlg.opts.q), tw, FONT_LG).forEach(l => { text(l, tx, y, 11, FONT_LG); y += LINE_LG; });
      dlg.opts.opts.forEach((o, i) => { y = optRow(T(o.t), tx, tw, y, dlg.sel === i); });
      hint('W/S · SPACE');
      return;
    }
    /* The current line wraps to as many rows as it needs; the next line
       follows only while there is room left in the box. */
    const cur = wrapText(T(dlg.lines[dlg.i]) || '', tw, FONT_LG);
    const nxt = dlg.lines[dlg.i + 1] ? wrapText(T(dlg.lines[dlg.i + 1]), tw, FONT_LG) : [];
    let used = 0;
    for (const l of cur) { if (used >= DLG_BODY_LINES) break; text(l, tx, y, 15, FONT_LG); y += LINE_LG; used++; }
    for (const l of nxt) { if (used >= DLG_BODY_LINES) break; text(l, tx, y, 8, FONT_LG); y += LINE_LG; used++; }
    hint('SPACE');
  }
  function drawOffer() {
    const S = A.S(), offer = A.offer();
    panel(OFFER_X, OFFER_Y, OFFER_W, OFFER_H, 14);
    const tx = OFFER_X + PAD_LG;
    let y = OFFER_Y + PAD_LG;
    /* Who is selling, on the same plate the dialogue box names them with —
       the offer arrives out of one of their lines and used to say so only by
       the 'ASTRID: ' the line in front of it carried. */
    if (offer.npc) { plate(tx, y, OFFER_W - PAD_LG * 2, OFFER_NAME_H, offer.npc.n); y += OFFER_NAME_H + DLG_GAP; }
    text(T(offer.label), tx, y, 15, FONT_LG); y += LINE_LG;
    text(S.kr + ' kr', tx, y, S.kr >= offer.kr ? 14 : 12, FONT_LG); y += LINE_LG;
    text(TX('SPACE — KJØP    ESC — NEI', 'SPACE — BUY    ESC — NO'), tx, y, 7, FONT_LG);
  }

  return { drawTalk: drawTalk, drawOffer: drawOffer };
}
