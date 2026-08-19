/* Bekkedal — the mountain, and the ore in it.
 *
 * The report was that the veins in the gruva are almost impossible to spot,
 * and reading the old `rockDetail` next to `rockGround` shows why in one
 * line: the ore's largest bright mark was a 2x2 of `C(7)`, and `C(7)` is the
 * *exact* colour of the 9x6 and 7x6 lit faces the same function stamps on
 * every ordinary rock tile. The one mark that was supposed to say "ore" was
 * the same colour as the noise it had to compete with, and smaller than it.
 * Around that: an L*46 brown on an L*36 base is a ten-point step where the
 * plain faces already jump thirty-four, there was no hue contrast because
 * the whole scene is grey, there was no silhouette difference because an ore
 * tile was a wall tile with different pixels on it, and the only genuinely
 * bright marks were the two smallest objects on the tile.
 *
 * So it is fixed in that order, because that is the order the eye works in:
 *
 *   1. Silhouette. An ore tile breaks the rock face — a shadowed recess
 *      bitten into the stone, a cracked seam stepping across it, crystal
 *      faces standing off the plane. You can find the veins in a 1-bit
 *      threshold of a screenshot, which is the test.
 *   2. Value. The matrix around the vein goes *darker* than ordinary rock,
 *      not lighter. You do not get contrast by adding bright pixels to a
 *      mid-grey field; you get it by putting bright pixels against dark ones.
 *   3. Mass. One coherent body of eight to twelve source pixels. Scattered
 *      specks read as noise, which is what the rest of a rock tile already is.
 *   4. Hue. Iron is rust ochre, copper is verdigris, silver is a cool white —
 *      three families no other ramp carries, so what you are about to mine is
 *      legible before you swing at it. `Q` is a different hue *and* a bigger
 *      body *and* more faces, because walking to a vein you cannot mine yet
 *      is a small avoidable frustration the art can fix.
 *   5. Light. Ore is specular: a slow glint travels across the faces, and it
 *      is the brightest thing down there.
 *
 * And one thing that is a gameplay improvement rather than a picture: the
 * wall around a vein carries mineral traces that thicken as you get closer,
 * in that vein's own colour. The rock tells you where to look.
 */
import { STO, SNO, WAT, CON, ATMO, MARKS, SHADOWS, FEATURES } from './palette.js';
import { distanceField } from './autotile.js';
import { BEK_T, BEK_COLS, BEK_ROWS } from './data.js';

/* ---- what a vein is made of ----------------------------------------------
   Four steps each — the matrix shadow it sits in, the body, the lit face and
   the catch of light — declared in palette.js so palette_check reads the same
   colours the art draws. Three families that share nothing. */
const four = f => ({ dark: f.cols[0], body: f.cols[1], lit: f.cols[2], spec: f.cols[3] });
export const ORE_KIND = {
  jern:   four(FEATURES.ORE_IRON),
  kobber: four(FEATURES.ORE_COPPER),
  solv:   four(FEATURES.ORE_SILVER)
};

/* Which one a given square carries. A pure function of the tile, so the art
   and `act()`'s drop agree — the vein you can see is the vein you get, and a
   square you come back to after it has regrown is the same square. The
   weights are the ones `act()` used to roll at random (55/30/15 on `O`,
   60/40 on `Q`), so nothing about the economy moves; what changes is that
   the answer is now written on the wall. */
export function oreKind(v, rich) {
  if (rich) return v.ore < 12 ? 'solv' : 'kobber';
  return v.ore < 11 ? 'jern' : v.ore < 17 ? 'kobber' : 'solv';
}

export function createRock(A) {
  /* A.fill(col, x, y, w, h)     — device pixels, inside a native() block
     A.wash(x, y, w, h, col, s)  — the ordered stipple, likewise
     A.washOut(px, py, w, h, col, s) — the stipple from *outside* a native()
     A.rockVar(x, y)             — noise.js's declared rock stream
     A.patch(x, y, P, max)       — the low-frequency fields
     A.spot(i, span, size)       — step index to position
     A.tileAt(x, y)              — the glyph at a grid square */

  let near = null, ready = '';
  const isVein = c => c === 'O' || c === 'Q';

  function prepare(key) {
    if (key === ready) return;
    ready = key;
    /* how many tiles from the nearest vein, capped at the range a trace can
       carry — this is what lets the wall thicken toward the ore */
    near = distanceField((x, y) => isVein(A.tileAt(x, y)), BEK_COLS, BEK_ROWS, 4);
  }

  /* the colour of whatever vein is nearest, for the traces in the wall */
  function traceKind(x, y) {
    for (let r = 1; r <= 3; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= BEK_COLS || ny >= BEK_ROWS) continue;
        const c = A.tileAt(nx, ny);
        if (isVein(c)) return ORE_KIND[oreKind(A.rockVar(nx, ny), c === 'Q')];
      }
    }
    return null;
  }

  /* ---- the fill ------------------------------------------------------------
     A vein sits in a darker matrix than plain rock does. That one decision is
     most of the contrast: everything bright on the tile now has something
     dark to be bright against. */
  function ground(c, x, y, snow) {
    const px = x * BEK_T, py = y * BEK_T;
    A.fill(isVein(c) ? STO[1] : STO[2], px, py, BEK_T, BEK_T);
    A.wash(px, py, BEK_T, BEK_T, snow ? SNO[0] : CON[1], A.patch(x, y, 'MOSS'));
    A.wash(px, py, BEK_T, BEK_T, STO[3], A.patch(x, y, 'DAMP'));
  }

  /* ---- plain rock ---------------------------------------------------------- */
  const FACE = MARKS.ROCK_FACE.cols, CRACK = SHADOWS.ROCK_CRACK.cols[0];
  function plain(x, y, v, snow) {
    const px = x * BEK_T, py = y * BEK_T, T = BEK_T;
    A.fill(FACE[0], px + A.spot(v.fx, T, 18), py + A.spot(v.fy, T, 12), 18, 12);
    A.fill(FACE[0], px + A.spot(v.gx, T, 14), py + A.spot(v.gy, T, 12), 14, 12);
    A.fill(FACE[1], px + A.spot(v.fx, T, 18), py + A.spot(v.fy, T, 12), 18, 2);
    A.fill(CRACK, px + A.spot(v.ax, T, 16), py + A.spot(v.ay, T, 2), 16, 2);
    A.fill(CRACK, px + A.spot(v.bx, T, 10), py + A.spot(v.by, T, 2), 10, 2);
    if (snow) {
      A.fill(SNO[1], px + A.spot(v.mx, T, 8), py + A.spot(v.my, T, 2), 8, 2);
      A.fill(SNO[1], px + A.spot(v.jx, T, 6), py + A.spot(v.jy, T, 2), 6, 2);
    }
    if (v.kind === 4) A.fill(WAT[3], px + A.spot(v.hx, T, 2), py + A.spot(v.hy, T, 6), 2, 6);

    /* the traces, thickening toward whatever vein is closest. Three tiles out
       is one speck you would not notice; one tile out is a run of them in the
       vein's own colour, and by then you are looking the right way. */
    if (snow) return;
    const d = near[y * BEK_COLS + x];
    if (d > 3) return;
    const k = traceKind(x, y);
    if (!k) return;
    const n = 4 - d;                        /* 1 speck at three tiles, 3 at one */
    const sx = [v.ix, v.hx, v.lx], sy = [v.iy, v.hy, v.ly];
    for (let i = 0; i < n; i++) {
      A.fill(i === 0 ? k.body : k.dark, px + A.spot(sx[i], T, 2 + i), py + A.spot(sy[i], T, 2), 2 + i, 2);
    }
  }

  /* ---- a vein -------------------------------------------------------------- */
  function vein(c, x, y, v) {
    const px = x * BEK_T, py = y * BEK_T, T = BEK_T;
    const rich = c === 'Q', k = ORE_KIND[oreKind(v, rich)];
    /* Where the stone is broken open. Placed off the tile's own channels, so
       two veins on one screen are never the same hole. */
    const rx = px + A.spot(v.fx, T, 28), ry = py + A.spot(v.fy, T, 24);

    /* 1. the recess: rock bitten away, and the lip of it catching light. This
          is the silhouette — it is what survives a 1-bit threshold, so it is
          stepped rather than rectangular. Three courses of different widths
          and offsets, which at this scale is the difference between a hole in
          a rock face and a crate leaning against one. */
    const s1 = A.spot(v.gy, 6, 1), s2 = A.spot(v.by, 8, 1);
    A.fill(ATMO[0], rx + s1, ry, 28 - s1 - 2, 8);
    A.fill(ATMO[0], rx, ry + 7, 28, 11);
    A.fill(ATMO[0], rx + 2, ry + 17, 28 - s2, 7);
    A.fill(STO[3], rx + s1, ry - 2, 28 - s1 - 2, 2);
    A.fill(STO[0], rx + 2, ry + 22, 28 - s2, 2);

    /* 2. the seam, stepping across the whole tile through the recess, so the
          break does not stop at the hole's edge */
    const sy0 = py + A.spot(v.ay, T, 4);
    A.fill(STO[0], px, sy0, 16, 3);
    A.fill(STO[0], px + 14, sy0 + A.spot(v.by, 10, 3), 14, 3);
    A.fill(STO[0], px + 26, sy0 + A.spot(v.ax, 14, 3), T - 26, 3);

    /* 3. the body: one mass, not specks. Four overlapping rects that read as
          a single lump of ore wedged in the hole. */
    const bw = rich ? 22 : 16, bh = rich ? 18 : 13;
    const bx = rx + 3 + A.spot(v.gx, 28 - bw - 3, 2), by = ry + 3 + A.spot(v.gy, 24 - bh - 3, 2);
    A.fill(k.dark, bx - 1, by - 1, bw + 2, bh + 2);
    A.fill(k.body, bx, by, bw, bh);
    A.fill(k.body, bx + 4, by - 3, bw - 8, 4);
    A.fill(k.body, bx - 3, by + 4, 4, bh - 8);

    /* 4. the faces: flat planes catching the light at different angles, which
          is what makes a crystal read as a crystal and not as a blob */
    A.fill(k.lit, bx + 2, by + 2, Math.round(bw * 0.45), Math.round(bh * 0.4));
    A.fill(k.lit, bx + Math.round(bw * 0.55), by + Math.round(bh * 0.5), Math.round(bw * 0.35), Math.round(bh * 0.3));
    if (rich) A.fill(k.lit, bx + 1, by + Math.round(bh * 0.62), Math.round(bw * 0.3), Math.round(bh * 0.28));
    A.fill(k.spec, bx + 3, by + 3, 3, 2);
    if (rich) A.fill(k.spec, bx + Math.round(bw * 0.6), by + Math.round(bh * 0.55), 3, 2);

    /* 5. and for a rich vein, satellites — crystals that did not come away
          with the main mass, so `Q` reads as *more* and not merely different */
    if (rich) {
      A.fill(k.body, rx + A.spot(v.ix, 24, 4), ry + A.spot(v.iy, 20, 4), 4, 4);
      A.fill(k.lit, rx + A.spot(v.ix, 24, 4), ry + A.spot(v.iy, 20, 4), 2, 2);
      A.fill(k.body, rx + A.spot(v.jx, 24, 3), ry + A.spot(v.jy, 20, 3), 3, 3);
    }
  }

  function detail(c, x, y, snow) {
    const v = A.rockVar(x, y), px = x * BEK_T, py = y * BEK_T;
    if (!isVein(c)) { plain(x, y, v, snow); return; }
    vein(c, x, y, v);
    /* No vein sits on a snowed map today, but a vein that ever did must not
       quietly fall back to plain rock and become invisible again — which is
       the bug this whole file exists to fix. Snow goes *over* the ore. */
    if (snow) {
      A.fill(SNO[1], px + A.spot(v.mx, BEK_T, 10), py + A.spot(v.my, BEK_T, 2), 10, 2);
      A.fill(SNO[1], px + A.spot(v.jx, BEK_T, 6), py + A.spot(v.jy, BEK_T, 2), 6, 2);
    }
  }

  /* ---- the glint -----------------------------------------------------------
     The only part of a vein that is not in the terrain cache. A single bright
     pixel pair travelling slowly across the faces on a long cycle: the goal is
     a catch of light, not a blinking marker, so the amplitude stays low and
     the period stays long enough that it never reads as a pulse. */
  function live(c, x, y, t) {
    const v = A.rockVar(x, y), rich = c === 'Q', k = ORE_KIND[oreKind(v, rich)];
    const px = x * BEK_T, py = y * BEK_T, T = BEK_T;
    const rx = px + A.spot(v.fx, T, 28), ry = py + A.spot(v.fy, T, 24);
    const bw = rich ? 22 : 16, bh = rich ? 18 : 13;
    const bx = rx + 3 + A.spot(v.gx, 28 - bw - 3, 2), by = ry + 3 + A.spot(v.gy, 24 - bh - 3, 2);
    /* one slow sweep every seven seconds or so, offset per tile so a wall of
       veins does not flash in unison */
    const u = (t * 0.14 + (v.kind * 7 + v.ore) * 0.05) % 1;
    if (u > 0.34) return;                                  /* mostly, nothing */
    const f = u / 0.34;
    A.fill(k.spec, bx + Math.round(f * (bw - 4)), by + Math.round((1 - f) * (bh - 3)), 3, 2);
    if (rich) A.fill(SNO[1], bx + Math.round(f * (bw - 4)) + 1, by + Math.round((1 - f) * (bh - 3)), 1, 1);
  }

  return { prepare: prepare, ground: ground, detail: detail, live: live };
}
