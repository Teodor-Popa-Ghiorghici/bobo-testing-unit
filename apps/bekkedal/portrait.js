/* Bekkedal — the eight faces.
 *
 * The dialogue box used to be a black rectangle with one line of text in it,
 * and eight people you could talk to for an entire playthrough without ever
 * seeing one of them. This is the other half of that box: a head-and-
 * shoulders portrait per character, at whatever size `layout.js` works out
 * the panel can hold.
 *
 * It is built the way `actors.js` builds the walking sprites and for the same
 * reason — **one rig, parameters per character**, never eight hand-drawn
 * images. Eight images is eight things to keep in step every time the palette
 * moves, eight chances to get one wrong, and nothing to say what a ninth
 * character would look like. A rig says it once: a face is a skull, a jaw, a
 * brow, two eyes, a nose and a mouth, and Håkon differs from Ingrid by the
 * numbers in `BEK_NPCS[].face` rather than by being drawn again. It is also
 * what makes the *expressions* affordable — three faces per character is
 * twenty-four images and three parameters.
 *
 * Everything is authored in whole **art pixels** and stamped as an exact
 * `scale`-sized block, the same density the rest of the game draws at, so no
 * feature can land on a fractional pixel however the panel is resized. Colour
 * is ramps only: what a character is not handed out of `BEK_NPCS` — the lit
 * and the shaded step of their own hair, shirt and skin — is derived with
 * `rampStep`, which is the contrast rule's own same-ramp-neighbour exemption
 * turned into a function, so a shade this file invents is inside the band by
 * construction whatever colour it was handed. The marks that are *not* in the
 * band — the eyes, the brows, the lashes, the line of the mouth — are declared
 * in `palette.js` as `PORT_EYE`/`PORT_LINE`, and every one of them is thin,
 * exactly like the trim that makes a house findable in one bit.
 *
 * The light is the light the rest of the game uses: from above and a little to
 * the left, the same key `moonKey` rims a wall with. So the shade plane is
 * always the right of the face, and where a blend is wanted it is an ordered
 * dither — there is no alpha in this app and there is none here.
 */
import { ATMO, SAN, SNO, TIM, STO, SOI, WAT, WAR, rampStep, lum, MARK_BAND } from './palette.js';

/* what a character is if BEK_NPCS says nothing: the rig's own middle */
const FACE0 = { skin: 'fair', cut: 'short', beard: 0, brow: 1, iris: WAT[2], jaw: 0, age: 0, hat: 0 };
export const PORT_MOODS = ['neutral', 'warm', 'troubled'];  /* lint-content reads this */
const MOODS = { neutral: 0, warm: 1, troubled: 2 };
/* Two skin bases, not eight, because each one is a declared contrast table
   (MARKS.PORT_SKIN / PORT_SKIN_TAN) and a table nothing checks is a fiction.
   Shade, base, light — SAN runs out under its own darkest step, so the
   weathered face borrows lit timber for its shadow plane. */
const SKIN = { fair: [SAN[0], SAN[1], SAN[2]], tan: [TIM[3], SAN[0], SAN[1]] };
const INK = ATMO[0];
/* `rampStep` clamps at either end of its ramp, so a colour that is already
   the top step comes back unchanged — and Sigrid's kerchief, cut from the
   brightest entry of WAR, would be one flat block with no lit side at all.
   Ask for the neighbour on the other side rather than for nothing. */
const near = (i, d) => { const j = rampStep(i, d); return j === i ? rampStep(i, -d) : j; };

export function createPortrait(GG, C, stipple, scale) {
  /* `npc` is a BEK_NPCS record — hair, shirt and face parameters; `mood` is
     one of neutral/warm/troubled; x/y/w/h is the device-pixel box layout.js
     reserved for it. Everything below thinks in art pixels. */
  function portrait(npc, mood, x, y, w, h) {
    const W = Math.floor(w / scale), H = Math.floor(h / scale);
    const f = Object.assign({}, FACE0, npc.face || {});
    const m = MOODS[mood] || 0, warm = m === 1, sad = m === 2;
    const sk = SKIN[f.skin] || SKIN.fair;
    const hair = npc.hair, hairD = near(hair, -1), hairL = near(hair, 1);
    const shirt = npc.shirt, shirtD = near(shirt, -1), shirtL = near(shirt, 1);
    /* Brows and lashes are normally the hair's own shadow step. Marit's hair
       is the bottom of SNO and has nothing under it, so hers would come back
       near-white and vanish against a fair face — when that happens the brow
       falls back to the declared line colour instead. The test is the
       contrast rule's own band, read from palette.js rather than restated. */
    const browCol = Math.abs(lum(hairD) - lum(sk[1])) > MARK_BAND ? hairD : SOI[0];

    const rd = Math.round, cx = W >> 1;
    const R = (ax, ay, aw, ah, col) => {
      if (aw <= 0 || ah <= 0) return;
      GG().fillStyle = C(col);
      GG().fillRect(x + ax * scale, y + ay * scale, aw * scale, ah * scale);
    };
    const Mi = (ax, ay, aw, ah, col) => { R(ax, ay, aw, ah, col); R(W - ax - aw, ay, aw, ah, col); };
    const SP = (ax, ay, aw, ah, col, s) => stipple(x + ax * scale, y + ay * scale, aw * scale, ah * scale, col, s);

    /* ---- the proportions, all of them fractions of the box ---------------
       Nothing here is a measured pixel either: change DLG_BODY_LINES and the
       portrait grows and every feature moves with it. */
    const hw = rd(W * 0.48 / 2) * 2, hx = (W - hw) >> 1;   /* head, kept even so it mirrors */
    const hy = rd(H * 0.13), hh = rd(H * 0.46), chin = hy + hh;
    const browY = hy + rd(hh * 0.36), eyeY = hy + rd(hh * 0.46);
    const eyeH = Math.max(3, rd(hh * 0.12)), eyeW = Math.max(4, rd(hw * 0.23));
    const eyeIn = rd(hw * 0.15), eyeX = cx - eyeIn - eyeW;
    const noseY = eyeY + eyeH, noseB = hy + rd(hh * 0.78), mouY = hy + rd(hh * 0.87);
    const earY = eyeY - 1, earH = rd(hh * 0.26), earW = Math.max(2, rd(hw * 0.09));
    const neckW = rd(hw * 0.52), shY = rd(H * 0.71);
    const jawStart = rd(hh * 0.70), chinStart = rd(hh * 0.88);
    /* how far in the silhouette is at row v below the crown — a crown that
       rounds off, a jaw the character's own `jaw` widens or narrows, a chin */
    const inset = v => v < rd(hh * 0.03) ? rd(hw * 0.20)
                     : v < rd(hh * 0.08) ? rd(hw * 0.10)
                     : v >= hh - 1 ? rd(hw * 0.27)
                     : v >= chinStart ? rd(hw * 0.19)
                     : v >= jawStart ? Math.max(0, rd(hw * 0.09) - f.jaw)
                     : 0;

    GG().save();
    GG().beginPath(); GG().rect(x, y, w, h); GG().clip();

    /* ---- the air behind them -------------------------------------------
       One flat step of it, lifted behind the head and dropped away below. A
       bust on a black square is a cut-out. The vignette is where a stipple
       belongs: it is big enough that a four-pixel dither cell reads as a
       gradient and not as a chequer, which is also why the face itself is
       modelled in ramp steps instead. */
    R(0, 0, W, H, ATMO[1]);
    SP(rd(W * 0.10), rd(H * 0.04), W - rd(W * 0.20), rd(H * 0.46), ATMO[2], 5);
    SP(0, 0, W, rd(H * 0.08), ATMO[0], 6);
    SP(0, rd(H * 0.62), W, H - rd(H * 0.62), ATMO[0], 5);

    /* ---- hair that falls behind the head -------------------------------- */
    const sideH = f.cut === 'long' ? shY + rd(H * 0.12) - hy : f.cut === 'braids' ? shY + rd(H * 0.04) - hy : 0;
    if (sideH > 0) {
      const bw = f.cut === 'braids' ? Math.max(3, rd(hw * 0.18)) : Math.max(4, rd(hw * 0.26));
      Mi(hx - bw - 1, hy + rd(hh * 0.08) - 1, bw + 2, sideH + 2, INK);
      Mi(hx - bw, hy + rd(hh * 0.08), bw, sideH, hairD);
      R(hx - bw, hy + rd(hh * 0.08), Math.max(1, bw - 1), rd(sideH * 0.55), hair);
    }

    /* ---- the shoulders --------------------------------------------------
       A bust is cropped by its own frame, so the shirt runs out of the box;
       what has to be drawn is the slope from neck to shoulder and the collar,
       which is the whole of what says "a person in clothes". Ink first over
       the *whole* run and material after it, never a row of each interleaved:
       an outline drawn one row at a time paints out the row above it and
       everything below is a silhouette. The head is laid down the same way. */
    const shW = rd(W * 0.50), grow = rd(H * 0.11);
    const shSpan = v => rd(shW + (W + 4 - shW) * Math.min(1, v / grow));
    for (let v = -1; v <= H - shY; v++) { const sw = shSpan(Math.max(0, v)); R(cx - (sw >> 1) - 1, shY + v, sw + 2, 1, INK); }
    for (let v = 0; v < H - shY; v++) {
      const sw = shSpan(v), x0 = cx - (sw >> 1), lw = rd(sw * 0.20), dw = rd(sw * 0.26);
      R(x0, shY + v, sw, 1, shirt);
      R(x0, shY + v, lw, 1, shirtL);
      R(x0 + sw - dw, shY + v, dw, 1, shirtD);
      SP(x0 + lw, shY + v, rd(sw * 0.12), 1, shirtL, 8);
      SP(x0 + sw - dw - rd(sw * 0.10), shY + v, rd(sw * 0.10), 1, shirtD, 8);
    }

    /* ---- neck, and the collar the shirt opens into ----------------------- */
    const colY = shY, colH = Math.max(2, rd(H * 0.06));
    R(cx - (neckW >> 1) - 1, chin - 3, neckW + 2, colY - chin + colH + 4, INK);
    R(cx - (neckW >> 1), chin - 3, neckW, colY - chin + colH + 3, sk[1]);
    R(cx - (neckW >> 1), chin - 3, neckW, rd(hh * 0.14), sk[0]);            /* under the jaw */
    SP(cx - (neckW >> 1), chin - 3 + rd(hh * 0.14), neckW, rd(hh * 0.09), sk[0], 8);
    Mi(cx - rd(neckW * 1.10), colY, rd(neckW * 0.75), colH + 1, shirtD);    /* the collar */
    Mi(cx - rd(neckW * 1.10), colY, rd(neckW * 0.75), 1, shirtL);

    /* ---- the ears, for whoever's hair does not already cover them -------- */
    if (!sideH) {
      Mi(hx - earW - 1, earY - 1, earW + 2, earH + 2, INK);
      Mi(hx - earW, earY, earW + 1, earH, sk[1]);
      R(W - hx - 1, earY, earW + 1, earH, sk[0]);                           /* the turned one */
    }

    /* ---- the head -------------------------------------------------------- */
    for (let v = -1; v <= hh + 1; v++) {
      const i = inset(Math.max(0, Math.min(hh, v))), rx = hx + i;
      R(rx - 1, hy + v, hw - i * 2 + 2, 1, INK);
    }
    /* Three planes, not two and a stipple. A head is twenty-six art pixels
       across and the dither cell is four of them, so a stippled seam down a
       cheek reads as a dashed line rather than as a turn; what a ramp is
       *for* is exactly this — the same material lit, turned, and away. */
    for (let v = 0; v <= hh; v++) {
      const i = inset(v), rx = hx + i, rw = hw - i * 2;
      R(rx, hy + v, rw, 1, sk[1]);
      R(rx + rw - rd(rw * 0.24), hy + v, rd(rw * 0.24), 1, sk[0]);
      if (v > rd(hh * 0.16) && v < rd(hh * 0.82)) R(rx, hy + v, rd(rw * 0.15), 1, sk[2]);
    }

    /* ---- hair, in front -------------------------------------------------- */
    if (f.cut !== 'bald') {
      const capH = f.cut === 'crop' ? rd(hh * 0.24) : rd(hh * 0.32);
      const over = rd(hh * 0.10), fringe = f.cut === 'crop' ? 0 : rd(hh * 0.09);
      /* the cap rounds off the way the skull under it does, drawn row by row
         off its own inset — a rectangle of hair on a rounded head is a hat */
      const capIn = u => u < 1 ? rd(hw * 0.22) : u < 2 ? rd(hw * 0.13) : u < 4 ? rd(hw * 0.05) : 0;
      const capTop = hy - over, capBot = hy + capH - 1;
      for (let u = -1; u <= capBot - capTop + 1; u++) {
        const i = capIn(Math.max(0, u));
        R(hx - 2 + i, capTop + u, hw + 4 - i * 2, 1, INK);
      }
      for (let u = 0; u <= capBot - capTop; u++) {
        const i = capIn(u), rx = hx - 1 + i, rw = hw + 2 - i * 2;
        R(rx, capTop + u, rw, 1, hair);
        R(rx, capTop + u, rd(rw * 0.28), 1, hairL);
        R(rx + rw - rd(rw * 0.24), capTop + u, rd(rw * 0.24), 1, hairD);
      }
      /* temples down past the eye, and a fringe over the brow for the cuts
         that have one — at this size the silhouette is most of what tells
         one person from another, so it is the parameter that does most work */
      Mi(hx - 1, hy + rd(hh * 0.04), Math.max(2, rd(hw * 0.12)), rd(hh * 0.32), hairD);
      if (fringe) R(hx + rd(hw * 0.10), hy - over + capH - 2, rd(hw * 0.56), fringe + 1, hair);
      if (f.cut === 'bun') {
        const bw = rd(hw * 0.46), bh = rd(hh * 0.20);
        R(cx - (bw >> 1) - 1, hy - over - bh - 1, bw + 2, bh + 2, INK);
        R(cx - (bw >> 1), hy - over - bh, bw, bh, hair);
        R(cx - (bw >> 1) + 1, hy - over - bh + 1, rd(bw * 0.42), rd(bh * 0.55), hairL);
      }
      if (f.cut === 'braids') Mi(hx - Math.max(3, rd(hw * 0.18)), shY - rd(H * 0.05), Math.max(3, rd(hw * 0.18)), rd(H * 0.05), hairL);
    }

    /* ---- the brow, and what a mood does to it ---------------------------
       A brow carries more expression than a mouth does, which is why it is
       two rects rather than one: the inner half and the outer half move
       independently, and every difference between the three faces is a row
       of one of them. Warm lifts the whole brow; troubled pulls the inner
       ends down toward the nose and puts a crease between them. */
    const bw2 = rd(eyeW * 0.55), bh2 = f.brow + 1;
    const inY = browY + (sad ? 1 : 0) - (warm ? 1 : 0);
    const outY = browY - (warm ? 1 : 0);
    Mi(eyeX + eyeW - bw2, inY, bw2, bh2, browCol);
    Mi(eyeX - 1, outY, eyeW - bw2 + 1, bh2, browCol);
    if (sad) R(cx - 1, browY + 1, 2, Math.max(1, rd(hh * 0.07)), sk[0]);

    /* ---- the eyes -------------------------------------------------------- */
    const eh = warm ? eyeH - 1 : eyeH, ey = warm ? eyeY + 1 : eyeY;
    if (sad) Mi(eyeX, eyeY - 1, eyeW, 1, sk[0]);
    Mi(eyeX - 1, ey - 1, eyeW + 2, eh + 2, sk[0]);                 /* the socket */
    Mi(eyeX, ey, eyeW, eh, SNO[1]);
    Mi(eyeX, ey, eyeW, 1, TIM[0]);                                 /* the lash line */
    const irW = Math.max(2, rd(eyeW * 0.42)), irX = eyeX + rd(eyeW * 0.32), irY = ey + 1 + (sad ? 1 : 0);
    const irH = Math.max(1, eh - 2);
    Mi(irX, irY, irW, irH, f.iris);
    Mi(irX + (irW > 2 ? 1 : 0), irY, Math.max(1, irW - 1), irH, SOI[0]);
    Mi(irX, irY, 1, 1, SNO[1]);                                    /* one catch of light */

    /* ---- nose and mouth --------------------------------------------------- */
    R(cx - 1, noseY, 2, noseB - noseY, sk[0]);
    R(cx - 2, noseB - 1, 4, 1, sk[0]);
    Mi(cx - rd(hw * 0.14), noseB - 1, 2, 1, SOI[0]);
    const mw = rd(hw * 0.32), mx = cx - (mw >> 1);
    R(mx, mouY, mw, 1, TIM[0]);
    if (warm) {
      R(mx - 1, mouY - 1, 1, 1, TIM[0]); R(mx + mw, mouY - 1, 1, 1, TIM[0]);
      R(mx + 1, mouY + 1, mw - 2, 1, sk[0]);
      Mi(hx + rd(hw * 0.06), mouY - rd(hh * 0.12), rd(hw * 0.18), 2, sk[2]);   /* the cheek */
    } else if (sad) { R(mx - 1, mouY + 1, 1, 1, TIM[0]); R(mx + mw, mouY + 1, 1, 1, TIM[0]); }

    /* ---- beard ------------------------------------------------------------ */
    if (f.beard === 'stubble') SP(hx + 2, mouY - rd(hh * 0.10), hw - 4, chin - mouY + rd(hh * 0.10), hairD, 6);
    else if (f.beard === 'chin') {
      R(cx - rd(hw * 0.18), mouY + 2, rd(hw * 0.36), chin - mouY - 1, hairD);
      R(cx - rd(hw * 0.18), mouY + 2, rd(hw * 0.14), chin - mouY - 1, hair);
    } else if (f.beard === 'full') {
      /* A beard runs up the jaw to the ear and leaves the cheek; filling
         every row of the lower face from the eyes down buries the nose and
         turns a bearded man into a hood. Sideburns first, then the beard
         proper once the mouth is passed. */
      for (let v = rd(hh * 0.52); v <= hh; v++) {
        const i = inset(v), rx = hx + i, rw = hw - i * 2;
        const side = v < rd(hh * 0.80) ? rd(rw * 0.26) : 0;
        if (side) { R(rx, hy + v, side, 1, hairD); R(rx + rw - side, hy + v, side, 1, hairD); }
        else { R(rx, hy + v, rw, 1, hair); R(rx + rw - rd(rw * 0.28), hy + v, rd(rw * 0.28), 1, hairD); }
      }
      R(mx - 2, mouY - 2, mw + 4, 2, hairD);                        /* over the lip */
      R(mx, mouY, mw, 1, TIM[0]);
      SP(hx + 1, hy + rd(hh * 0.56), hw - 2, rd(hh * 0.07), hairD, 7);
    } else if (f.beard === 'tache') R(mx - 2, mouY - 2, mw + 4, 2, hairD);

    /* ---- what age does ---------------------------------------------------- */
    if (f.age > 0) Mi(eyeX - 2, ey + eh + 1, Math.max(2, rd(eyeW * 0.5)), 1, sk[0]);
    if (f.age > 1) Mi(cx - rd(hw * 0.24), noseB, rd(hw * 0.07), rd(hh * 0.11), sk[0]);

    /* ---- the hat, over everything they have ------------------------------- */
    if (f.hat === 'cap') {
      const cy = hy - rd(hh * 0.18), ch = rd(hh * 0.26);
      R(hx - 3, cy - 1, hw + 6, ch + 2, INK);
      const capC = near(npc.pants, 1);
      R(hx - 2, cy, hw + 4, ch, capC);
      R(hx - 2, cy, rd(hw * 0.38), rd(ch * 0.6), near(capC, 1));
      R(hx - rd(hw * 0.18), cy + ch, hw + rd(hw * 0.36), 2, npc.pants);
    } else if (f.hat === 'helm') {
      const cy = hy - rd(hh * 0.20), ch = rd(hh * 0.30);
      R(hx - 3, cy - 1, hw + 6, ch + 2, INK);
      R(hx - 2, cy, hw + 4, ch, TIM[1]);
      R(hx - 2, cy, rd(hw * 0.36), rd(ch * 0.7), TIM[2]);
      R(hx - 2, cy + ch - 2, hw + 4, 2, TIM[0]);
      R(cx - rd(hw * 0.14), cy - rd(ch * 0.26), rd(hw * 0.28), rd(ch * 0.34), STO[3]);
      R(cx - rd(hw * 0.09), cy - rd(ch * 0.20), rd(hw * 0.18), rd(ch * 0.22), WAR[4]);
    } else if (f.hat === 'kerchief') {
      const cy = hy - rd(hh * 0.14), ch = rd(hh * 0.27);
      R(hx - 3, cy - 1, hw + 6, ch + 2, INK);
      R(hx - 2, cy, hw + 4, ch, shirt);
      R(hx - 2, cy, rd(hw * 0.40), rd(ch * 0.6), shirtL);
      R(hx + hw + 2 - rd(hw * 0.24), cy, rd(hw * 0.24), ch, shirtD);
      Mi(hx - rd(hw * 0.14), cy + ch - 1, rd(hw * 0.22), rd(hh * 0.16), shirt);
    }

    GG().restore();
  }

  return { portrait: portrait };
}
