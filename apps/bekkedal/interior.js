/* Bekkedal — the inside of a house.
 *
 * What a room used to be: `floorGround` was a flat `C(6)` fill plus a noise
 * wash; `floorDetail` was one horizontal line at y+9, a vertical line every
 * 10px, and — one tile in seven — a single 2x1 speck. That was the entire
 * floor of every room in the game. The walls were three horizontal courses
 * and an outline, and the furniture was eight glyphs drawn byte-identically
 * every time they appeared. The report called it three tiled textures with no
 * effort at making the place liveable, and that is precisely what it was.
 *
 * Four things are wrong with a floor drawn per tile, and all four are fixed
 * by drawing boards instead:
 *
 *   - Real floorboards run *across* a room, not around each square metre of
 *     it. They have varying widths, varying lengths, staggered end joints,
 *     and a nail pair at every joist.
 *   - Each board is a slightly different step of the timber ramp, because it
 *     is a different piece of wood.
 *   - All of it comes off **world position**, never tile position, so the
 *     boards visibly cross tile boundaries. That one change is what removes
 *     the tiled reading; nothing else here would have been enough on its own.
 *   - And it costs about fifteen fillRects a tile in a pass that is cached,
 *     so it costs nothing per frame.
 *
 * Then the two things that make a room a room rather than a floor plan: a
 * dithered shadow cast from the foot of every wall, and wear that follows the
 * traffic. The old `WORN` patch was a low-frequency noise field, so the floor
 * was worn in places nobody walks. It is aimed along the lines between the
 * door and the hearth, the door and the bed, and around the table, computed
 * from the room's own layout — nobody consciously notices that and everybody
 * feels it.
 */
import { TIM, STO, SAN, WAR, WAT, ATMO, MARKS, SHADOWS } from './palette.js';
import { hash, hv } from './noise.js';
import { BEK_T } from './data.js';

const GRAIN = MARKS.FLOOR_GRAIN.cols, JOINT = SHADOWS.FLOOR_JOINT.cols[0];
const WALL_FOOT = SHADOWS.WALL_FOOT.cols;
/* one channel block for the room's own carpentry, clear of the tile recipes */
const CH_BOARD = 2048;

export function createInterior(A) {
  /* A.fill(col, x, y, w, h)     — device pixels, inside a native() block
     A.wash(x, y, w, h, col, s)  — the ordered stipple, likewise
     A.tileAt(x, y)              — the glyph at a grid square
     A.salt()                    — the current map's channel salt
     A.cols() / A.rows()         — how big this map is, in tiles */

  /* The room's own size, taken once per rebuild. The boards are laid across
     the whole floor and the wear is traced over the whole grid, so both have
     to know how far that is — and a room is now as big as its rows say. */
  let boards = null, wear = null, ready = '';
  let cols = 0, rows = 0, MW = 0, MH = 0;

  /* ---- the carpentry -------------------------------------------------------
     Laid once for the whole room and then read per tile, which is what lets a
     board cross a tile boundary. Widths vary, and so does every segment's
     shade, because a floor is a pile of different planks. */
  function layBoards(salt) {
    const out = [];
    let y = 0, i = 0;
    while (y < MH) {
      const h = 7 + hv(i, 0, salt + CH_BOARD, 4);          /* 7..10 px wide    */
      const segs = [];
      /* end joints, staggered board to board: a run of 3 to 7 tiles, with the
         first one cut short by a different amount on every board so the joints
         never line up into a column */
      let x = -hv(i, 1, salt + CH_BOARD + 1, 5) * 24;
      let j = 0;
      while (x < MW) {
        const w = (3 + hv(i, j + 2, salt + CH_BOARD + 2, 5)) * BEK_T;
        segs.push({ x0: x, x1: Math.min(MW, x + w),
                    col: GRAIN[hv(i, j + 3, salt + CH_BOARD + 3, GRAIN.length)] });
        x += w; j++;
      }
      /* which segment a tile column starts in, so a tile does not walk the
         whole board to find the two segments it overlaps */
      const byCol = new Int16Array(cols);
      for (let c = 0; c < cols; c++) {
        let k = 0;
        while (k + 1 < segs.length && segs[k + 1].x0 <= c * BEK_T) k++;
        byCol[c] = k;
      }
      out.push({ y0: y, h: Math.min(h, MH - y), segs: segs, byCol: byCol });
      y += h; i++;
    }
    /* and which board a device row falls in, for the same reason: fifty
       boards scanned per tile over sixty tiles was most of a 57ms rebuild */
    const rowOf = new Int16Array(MH);
    for (let b = 0; b < out.length; b++)
      for (let yy = out[b].y0; yy < out[b].y0 + out[b].h && yy < MH; yy++) rowOf[yy] = b;
    out.rowOf = rowOf;
    return out;
  }

  /* ---- where the feet go ---------------------------------------------------
     Wear is not noise. It is the line between the door and the fire, the line
     between the door and the bed, and the ring around the table — so that is
     what it is computed from. */
  function traceWear() {
    const w = new Uint8Array(cols * rows);
    const find = ch => {
      const out = [];
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++)
        if (A.tileAt(x, y) === ch) out.push([x, y]);
      return out;
    };
    const door = find('D'), hubs = find('v').concat(find('b')).concat(find('n'));
    if (!door.length || !hubs.length) return w;
    /* distance from a point to a segment, in tiles */
    const segDist = (px, py, a, b) => {
      const vx = b[0] - a[0], vy = b[1] - a[1];
      const L = vx * vx + vy * vy;
      let t = L ? ((px - a[0]) * vx + (py - a[1]) * vy) / L : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = px - (a[0] + vx * t), dy = py - (a[1] + vy * t);
      return Math.sqrt(dx * dx + dy * dy);
    };
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      let best = 99;
      for (const d of door) for (const h of hubs) {
        const v = segDist(x, y, d, h);
        if (v < best) best = v;
      }
      /* a path about two tiles wide, fading out — plus a per-tile step of
         jitter so the edge of it is not a drawn contour */
      const f = Math.max(0, 1 - best / 2.2);
      w[y * cols + x] = Math.floor(f * f * 7 + hash(x, y, CH_BOARD + 9) / 4294967296);
    }
    return w;
  }

  function prepare(key) {
    if (key === ready) return;
    ready = key;
    cols = A.cols(); rows = A.rows(); MW = cols * BEK_T; MH = rows * BEK_T;
    boards = layBoards(A.salt());
    wear = traceWear();
  }

  /* ---- the floor, as boards ------------------------------------------------ */
  function floor(x, y) {
    const px = x * BEK_T, py = y * BEK_T, salt = A.salt();
    const first = boards.rowOf[py], last = boards.rowOf[Math.min(MH - 1, py + BEK_T - 1)];
    for (let bi = first; bi <= last; bi++) {
      const b = boards[bi];
      const y0 = Math.max(b.y0, py), y1 = Math.min(b.y0 + b.h, py + BEK_T);
      for (let k = b.byCol[x]; k < b.segs.length; k++) {
        const sg = b.segs[k];
        if (sg.x0 >= px + BEK_T) break;
        if (sg.x1 <= px) continue;
        const x0 = Math.max(sg.x0, px), x1 = Math.min(sg.x1, px + BEK_T);
        A.fill(sg.col, x0, y0, x1 - x0, y1 - y0);
        /* the end joint, and only where the board actually ends */
        if (sg.x1 <= px + BEK_T && sg.x1 < MW) A.fill(JOINT, sg.x1 - 1, y0, 1, y1 - y0);
      }
      /* the gap between two boards */
      if (b.y0 >= py && b.y0 < py + BEK_T) A.fill(JOINT, px, b.y0, BEK_T, 1);
      /* nails, two to a board at every joist. Joists are regular — that is
         what a joist is — but each board's pair sits a pixel or two off its
         neighbour's, so the rhythm does not read as a printed grid. */
      const ny = b.y0 + 3;
      if (ny < py || ny >= py + BEK_T) continue;
      const step = 3 * BEK_T;
      for (let jx = Math.floor(px / step) * step; jx < px + BEK_T; jx += step) {
        const nx = jx + 12 + hv(b.y0, jx, salt + CH_BOARD + 4, 7);
        if (nx < px || nx >= px + BEK_T) continue;
        A.fill(STO[2], nx, ny, 1, 1);
        A.fill(STO[2], nx + 3, ny, 1, 1);
      }
    }
    A.wash(px, py, BEK_T, BEK_T, TIM[1], wear[y * cols + x]);
  }

  /* ---- volume --------------------------------------------------------------
     A room whose wall and floor are both brown has no edges. A shadow cast
     from the foot of every wall gives it one, and a corner that touches two
     walls gets both — which is the whole of "the corners are darker" without
     a second rule for corners. */
  function volume(x, y) {
    const px = x * BEK_T, py = y * BEK_T;
    const solidAt = (dx, dy) => {
      const c = A.tileAt(x + dx, y + dy);
      return c === 'H' || c === ' ' || c === 'u' || c === 'b' || c === 'c';
    };
    if (solidAt(0, -1)) {
      A.fill(WALL_FOOT[1], px, py, BEK_T, 2);
      A.wash(px, py + 2, BEK_T, 7, WALL_FOOT[1], 8);
      A.wash(px, py + 9, BEK_T, 5, WALL_FOOT[1], 4);
    }
    if (solidAt(-1, 0)) { A.fill(WALL_FOOT[0], px, py, 2, BEK_T); A.wash(px + 2, py, 6, BEK_T, WALL_FOOT[1], 6); }
    if (solidAt(1, 0)) A.wash(px + BEK_T - 6, py, 6, BEK_T, WALL_FOOT[1], 5);
    if (solidAt(0, 1)) A.wash(px, py + BEK_T - 4, BEK_T, 4, WALL_FOOT[1], 4);
  }

  /* ---- the rug -------------------------------------------------------------
     Four nested rectangles before, repeated identically on every square it
     covered. A rag rug is woven: bands of whatever cloth was to hand, run
     across a warp, with the weft packed unevenly — so it is bands from world
     position with a per-pick jitter, and a fringe wherever the rug ends. */
  /* A rag rug is made of whatever cloth was worn out that year, so it is
     mostly the same browns and creams as everything else in the room with
     one dull red in it. It went in once at full WAR[0]/WAR[2] and the room
     turned into a rug with a house around it. */
  const RUG = [TIM[2], SAN[1], TIM[3], WAT[2], SAN[0], WAR[1], TIM[2], SAN[1]];
  function rug(x, y) {
    const px = x * BEK_T, py = y * BEK_T, salt = A.salt();
    const isRug = (dx, dy) => A.tileAt(x + dx, y + dy) === 'z' || A.tileAt(x + dx, y + dy) === 'n';
    /* Bands first, one fill each rather than one fill a row — a rug covering
       ten tiles at a fill per pixel row was four thousand rects on its own. */
    const B = 4;
    for (let b0 = Math.floor(py / B) * B; b0 < py + BEK_T; b0 += B) {
      const band = b0 / B;
      const y0 = Math.max(b0, py), y1 = Math.min(b0 + B, py + BEK_T);
      A.fill(RUG[hv(band, 0, salt + CH_BOARD + 5, RUG.length)], px, y0, BEK_T, y1 - y0);
      /* the weft: every few picks along the warp one thread of the next band
         shows through, and where it shows is uneven */
      const alt = RUG[hv(band + 1, 0, salt + CH_BOARD + 5, RUG.length)];
      for (let wy = y0; wy < y1; wy += 3) {
        for (let lx = hv(band, wy, salt + CH_BOARD + 6, 7); lx < BEK_T; lx += 7 + hv(band, lx, salt + CH_BOARD + 7, 5)) {
          A.fill(alt, px + lx, wy, 1, 1);
        }
      }
    }
    /* fringe on whichever edges are the end of the rug */
    if (!isRug(0, -1)) for (let lx = 1; lx < BEK_T; lx += 3) A.fill(SAN[2], px + lx, py, 1, 2);
    if (!isRug(0, 1)) for (let lx = 1; lx < BEK_T; lx += 3) A.fill(SAN[2], px + lx, py + BEK_T - 2, 1, 2);
    if (!isRug(-1, 0)) A.fill(TIM[0], px, py, 1, BEK_T);
    if (!isRug(1, 0)) A.fill(TIM[0], px + BEK_T - 1, py, 1, BEK_T);
  }

  /* ---- the wall, from inside ----------------------------------------------- */
  function wall(x, y, o, win) {
    const px = x * BEK_T, py = y * BEK_T, T = BEK_T;
    A.fill(TIM[1], px + 2, py + 4, T - 4, 8);
    A.fill(TIM[1], px + 2, py + 16, T - 4, 8);
    A.fill(TIM[1], px + 2, py + 28, T - 4, 8);
    A.fill(TIM[2], px + 2, py + 4, T - 4, 2);
    A.fill(TIM[2], px + 2, py + 16, T - 4, 2);
    A.fill(TIM[2], px + 2, py + 28, T - 4, 2);
    A.fill(ATMO[0], px, py, T, 2); A.fill(ATMO[0], px, py + T - 2, T, 2);
    A.fill(ATMO[0], px, py, 2, T); A.fill(ATMO[0], px + T - 2, py, 2, T);
    if (!win) { A.fill(TIM[0], px + 6 + o.kx * 3, py + 6 + o.ky * 3, 4, 4); return; }
    A.fill(TIM[0], px + 8, py + 8, 24, 20);                 /* the reveal      */
    A.fill(SAN[2], px + 10, py + 10, 20, 16);               /* daylight        */
    A.fill(TIM[3], px + 10, py + 10, 20, 2);
    A.fill(TIM[3], px + 19, py + 10, 2, 16);
    A.fill(TIM[3], px + 10, py + 17, 20, 2);
  }

  /* ---- the door, from inside -----------------------------------------------
     The outside of a door is `building.js`'s business, and it is a different
     drawing entirely: out there a door is a frame, boards, iron and a step
     down onto the path. From in here it is the back of the same leaf in the
     same wall this file already draws, so it stays here rather than living as
     the one inline glyph left in index.js's ladder. */
  function door(x, y) {
    const px = x * BEK_T, py = y * BEK_T, T = BEK_T;
    /* the same 2px ink border every wall tile carries, so a doorway is an
       opening in this wall and not a hole cut through to nothing */
    A.fill(ATMO[0], px, py, T, T);
    A.fill(TIM[0], px + 2, py + 2, T - 4, T - 4);              /* the reveal    */
    A.fill(TIM[1], px + 4, py + 3, T - 8, T - 6);              /* the leaf      */
    for (let bx = 7; bx < T - 7; bx += 7) A.fill(TIM[0], px + bx, py + 4, 1, T - 8);
    A.fill(TIM[2], px + 4, py + 3, T - 8, 2);                  /* the top rail  */
    A.fill(TIM[2], px + 4, py + T - 6, T - 8, 2);              /* and the lower */
    A.fill(WAR[4], px + T - 13, py + 18, 3, 3);                /* the latch     */
  }

  return { prepare: prepare, floor: floor, volume: volume, rug: rug, wall: wall, door: door };
}
