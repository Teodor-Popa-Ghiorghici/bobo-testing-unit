/* Bekkedal — the people, the animals and the item icons.
 *
 * Everything drawn that is not ground: the player and the eight who talk,
 * Bjørn the bear, the goats, and the sixteen-pixel icon each item is known
 * by. Lifted out of `index.js` line for line — this file is a move, not a
 * rewrite, and the diff that created it should read as one.
 *
 * Still source-space (`BEK_T_SRC`): these are among the last functions the
 * art uplift has not converted (see **The art scale** in this app's
 * CLAUDE.md). They draw inside the shared `BEK_ART_SCALE` transform, so every
 * literal here means what it meant at 480x300.
 *
 * `GG()` rather than a captured context, because `g` is repointed at the
 * offscreen terrain canvas for the length of a cache rebuild and a captured
 * reference would draw into the wrong one. `C` is the palette accessor, which
 * resolves through the hour's lookup table — so a person at midnight is a
 * night person without this file knowing the clock exists.
 *
 * `person` takes a `held`: `{ kind, u, dir }`, where `u` runs 0..1 across a
 * swing (see `fx.js`). At rest that is 0, which the arc tables read as the
 * carry position — a tool is in the hand whether or not it is moving, which
 * is what makes a swing legible as a swing *of* something.
 */
import { TIM, STO, SAN, SNO, DRY, WAT, GRASS, CON, ATMO } from './palette.js';
import { BEK_ITEMS } from './data.js';
import { toolAt, drawHeld } from './fx.js';

export function createActors(GG, C) {
  function drawIcon(id, x, y) {
    const it = BEK_ITEMS[id], col = it.col == null ? 7 : it.col, ic = it.icon;
    const R = (a, b, w, h, k) => { GG().fillStyle = C(k); GG().fillRect(x + a, y + b, w, h); };
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
    else if (ic === 'sprinkler') { R(7, 4, 2, 9, col); R(3, 3, 10, 2, 7); R(4, 10, 8, 2, col); R(6, 2, 1, 2, 9); R(9, 2, 1, 2, 9); }
    else R(4, 4, 8, 8, col);
  }

  /* Everything the sprite is drawn from, so palette_check can ask whether
     any part of a person separates from the ground they are standing on
     — which is the question that matters, not whether one garment does. */
  const PERSON_INK = ATMO[0];
  function person(px, py, dir, step, hair, shirt, pants, held) {
    const bob = (step === 1 || step === 3) ? 1 : 0, y = py + bob;
    /* the far hand's tool goes behind the body, the near hand's in front */
    const back = held && (held.dir === 1);
    if (back) heldTool(px, y, held);
    /* The same trick the fir uses on a field of the same green: stamp the
       silhouette once in ink, one pixel proud, and draw the body inside
       it. Three rects, and a person reads on grass, on a plank pier, on
       snow and at midnight without any of those needing to be tuned
       around the colour of a shirt. */
    GG().fillStyle = C(PERSON_INK);
    GG().fillRect(px + 1, y - 1, 11, 10);         /* head                 */
    GG().fillRect(px - 1, y + 6, 15, 9);          /* torso and arms       */
    GG().fillRect(px + 2, y + 12, 9, 8);          /* legs                 */
    GG().fillStyle = C(pants); GG().fillRect(px + 3, y + 13, 3, 5); GG().fillRect(px + 7, y + 13, 3, 5);
    GG().fillStyle = C(TIM[0]);
    if (step === 1) GG().fillRect(px + 3, y + 17, 3, 2); else if (step === 3) GG().fillRect(px + 7, y + 17, 3, 2); else { GG().fillRect(px + 3, y + 17, 3, 2); GG().fillRect(px + 7, y + 17, 3, 2); }
    GG().fillStyle = C(shirt); GG().fillRect(px + 2, y + 7, 9, 7); GG().fillRect(px, y + 8, 2, 5); GG().fillRect(px + 11, y + 8, 2, 5);
    GG().fillStyle = C(SAN[2]); GG().fillRect(px, y + 12, 2, 2); GG().fillRect(px + 11, y + 12, 2, 2); GG().fillRect(px + 3, y + 2, 7, 6);
    GG().fillStyle = C(hair); GG().fillRect(px + 2, y, 9, 3);
    if (dir === 1) GG().fillRect(px + 2, y, 9, 7);
    else { GG().fillStyle = C(TIM[0]); if (dir === 0) { GG().fillRect(px + 4, y + 4, 1, 2); GG().fillRect(px + 8, y + 4, 1, 2); } if (dir === 2) GG().fillRect(px + 3, y + 4, 1, 2); if (dir === 3) GG().fillRect(px + 9, y + 4, 1, 2); }
    if (held && !back) heldTool(px, y, held);
  }
  /* `person` drew no tool at all, which is why a swing had nothing to be a
     swing *of*. The arc tables in fx.js put the head somewhere sensible at
     each end of the action; at rest (u = 0) that is the carry position. */
  const toolArt = { fill: (col, hx, hy, w, h) => { GG().fillStyle = C(col); GG().fillRect(w < 0 ? hx + w : hx, hy, Math.abs(w), h); } };
  function heldTool(px, y, held) {
    const a = toolAt(held.kind, held.u);
    const left = held.dir === 2;
    drawHeld(toolArt, Math.round(px + (left ? 2 - a[0] : 11 + a[0])), Math.round(y + 9 + a[1]),
             held.kind, left);
  }
  function bear(px, py, step) {
    const bob = (step === 1 || step === 3) ? 1 : 0, y = py + bob;
    GG().fillStyle = C(TIM[2]); GG().fillRect(px + 1, y + 5, 14, 14); GG().fillRect(px + 2, y, 12, 7); GG().fillRect(px, y - 1, 4, 4); GG().fillRect(px + 12, y - 1, 4, 4);
    GG().fillStyle = C(TIM[1]); GG().fillRect(px + 1, y + 16, 14, 3);
    GG().fillStyle = C(SAN[0]); GG().fillRect(px + 5, y + 4, 6, 4);
    GG().fillStyle = C(TIM[0]); GG().fillRect(px + 4, y + 2, 2, 2); GG().fillRect(px + 10, y + 2, 2, 2); GG().fillRect(px + 7, y + 5, 2, 2);
    GG().fillStyle = C(TIM[2]); for (let i = 0; i < 12; i++) GG().fillRect(px + 15 + Math.floor(i / 2), y + 4 + i, 2, 2);
    GG().fillStyle = C(DRY[2]); GG().fillRect(px + 19, y + 16, 7, 5); GG().fillStyle = C(TIM[2]); GG().fillRect(px + 19, y + 16, 7, 1);
  }
  function goat(px, py, t) {
    const bob = Math.floor(t * 1.5) % 2;
    GG().fillStyle = C(SNO[1]); GG().fillRect(px + 3, py + 6 + bob, 11, 7); GG().fillRect(px + 12, py + 3 + bob, 5, 5);
    GG().fillStyle = C(STO[4]); GG().fillRect(px + 3, py + 11 + bob, 11, 2);
    GG().fillStyle = C(STO[0]); GG().fillRect(px + 4, py + 13, 1, 4); GG().fillRect(px + 12, py + 13, 1, 4); GG().fillRect(px + 15, py + 5 + bob, 1, 1);
    GG().fillStyle = C(SAN[0]); GG().fillRect(px + 13, py + 1 + bob, 1, 3); GG().fillRect(px + 16, py + 1 + bob, 1, 3);
  }

  return { drawIcon: drawIcon, person: person, bear: bear, goat: goat };
}
