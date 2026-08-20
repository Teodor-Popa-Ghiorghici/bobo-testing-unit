/* Bekkedal — the wall of trees around every map.
 *
 * The outer ring of all nine outdoor maps is `T`, and it used to be drawn as
 * seventy stamps of one 20x20 fir on a 40px cadence, with nine variants
 * between them (`lean` ∈ 0..2 × `lit` ∈ 0..2) arranged in a perfect grid, and
 * flat black in the gaps. It frames every scene in the game, and the left and
 * right columns of it are on screen at all times. The report called it
 * repeated trees with gaps, which is exactly what it was.
 *
 * The fix starts by refusing the tile. A treeline is not a row of squares; it
 * is a band. This draws it as one continuous strip along each side, and
 * **nothing in it lands on a 40px cadence** — trunks are spaced eleven to
 * twenty-nine pixels apart off the hash and overlap freely. The grid
 * disappears the moment nothing is aligned to it, and no amount of adding
 * variants to a stamped tile would have done that.
 *
 * On top of that, the three things that make a band of trees read as a
 * forest rather than as a fence:
 *
 *   - **Three depth layers, and value carries the depth.** A far canopy drawn
 *     close to the atmosphere colour, a mid layer of trunks, and a near layer
 *     of dark detailed boughs that overhang the playfield by a few pixels.
 *     Atmospheric perspective — distant things being lower in *contrast*, not
 *     merely smaller — is the whole trick.
 *   - **Species, weighted per map.** Fir, spruce, birch, a dead snag, a stump,
 *     a fallen trunk. Birch-heavy at the farm; dense dark spruce approaching
 *     the gruva; stunted and sparse on the vidda; snow-loaded at the setra.
 *     The weights are content and live in `BEK_TREES` (`data.js`).
 *   - **Something in the gaps.** The flat black between the trunks becomes
 *     forest floor and undergrowth: dark, but *something*. That was half the
 *     complaint.
 *
 * And where the ring opens, the trees thin, the undergrowth widens and the
 * ground of the map runs into the mouth of the gap — an exit should be *more*
 * legible than the wall around it, not a hole in a fence.
 */
import { CON, GRASS, DRY, TIM, SNO, STO, ATMO, SOI } from './palette.js';
import { BEK_T, BEK_TREES } from './data.js';

/* the three depth layers, outermost first: how far back, how big, and which
   four colours. Contrast falls away with distance and that is the depth cue —
   the far layer is barely separated from the air behind it. */
const LAYERS = [
  { d: 0.10, scale: 0.62, ink: ATMO[0], body: CON[0], lit: CON[1], trunk: ATMO[1], gap: [9, 14] },
  { d: 0.52, scale: 0.84, ink: ATMO[0], body: CON[1], lit: CON[2], trunk: TIM[0], gap: [11, 20] },
  { d: 1.00, scale: 1.00, ink: ATMO[0], body: CON[2], lit: CON[3], trunk: TIM[1], gap: [13, 29] }
];
/* Three steps of one ramp, and deliberately not the atmosphere ramp. The far
   layer went in first as ATMO[1]/ATMO[2] on the reasoning that distance pulls
   a thing toward the colour of the air — which is true when there is sky
   behind it. Behind this band there is forest, so a blue-grey distant tree
   read as rubble. Distance here means *less contrast against the dark*, and
   the dark is green. */

export function createForest(A) {
  /* A.fill(col, x, y, w, h)     — device pixels, inside a native() block
     A.wash(x, y, w, h, col, s)  — the ordered stipple, likewise
     A.tree(i, layer)            — noise.js's declared treeline stream
     A.tileAt(x, y)              — the glyph at a grid square
     A.map()                     — the current map id
     A.snowy()                   — whether it is a snowed map
     A.cols() / A.rows()         — how big this map is, in tiles */

  /* ---- one tree ------------------------------------------------------------
     `cx` is the trunk's centre, `by` the foot of it, `h` the height. Every
     species is the same call, because a treeline is mostly about how the
     shapes sit together and hardly at all about any one of them. */
  function fir(L, cx, by, h, w, lean, lit, snow) {
    const tw = Math.max(2, (w / 5) | 0);
    A.fill(L.trunk, cx - (tw >> 1), by - h * 0.28, tw, h * 0.30);
    /* four tiers, each narrower and offset by the lean */
    for (let i = 0; i < 4; i++) {
      const f = i / 3;
      const tierW = Math.round(w * (1 - f * 0.62));
      const tierY = Math.round(by - h * (0.22 + f * 0.70));
      const tierH = Math.max(3, Math.round(h * 0.24));
      const off = Math.round(lean * f * 2);
      A.fill(L.ink, cx - (tierW >> 1) - 1 + off, tierY - 1, tierW + 2, tierH + 2);
      A.fill(L.body, cx - (tierW >> 1) + off, tierY, tierW, tierH);
      /* One tree in four catches the light, and on one tier. Every tree
         catching it turned the band into a hedge of highlights. */
      if (lit === 0 && i === 1) A.fill(L.lit, cx - (tierW >> 1) + off + 1, tierY + 1, Math.max(2, tierW >> 2), 2);
      if (snow) A.fill(SNO[0], cx - (tierW >> 1) + off + 1, tierY, Math.max(2, tierW >> 1), 2);
    }
  }
  function spruce(L, cx, by, h, w, lean, lit, snow) {
    fir(L, cx, by, h * 1.22, w * 0.82, lean, lit, snow);
  }
  /* Birch is the one broadleaf here, so it is the one that must not read as a
     fir — lighter foliage off the grass ramp rather than the conifer one, and
     a crown built from four courses of different widths. A single rectangle
     of green on a white stick is a lollipop, which is what the first pass
     looked like. */
  function birch(L, cx, by, h, w, lean, lit, snow) {
    const pale = L.d > 0.6, tw = Math.max(2, Math.round(w / 6));
    const foliage = pale ? GRASS[3] : CON[1], shade = pale ? CON[2] : CON[0];
    const top = Math.round(by - h);
    A.fill(L.ink, cx - (tw >> 1) - 1, Math.round(by - h * 0.72), tw + 2, Math.round(h * 0.72) + 1);
    A.fill(pale ? SNO[0] : L.trunk, cx - (tw >> 1), Math.round(by - h * 0.72), tw, Math.round(h * 0.72));
    if (pale) for (let k = 1; k < 3; k++) A.fill(STO[2], cx - (tw >> 1), Math.round(by - h * k * 0.22), tw, 1);
    const ch = Math.max(9, Math.round(h * 0.62));
    const course = [0.55, 0.95, 1.15, 0.8];
    for (let i = 0; i < 4; i++) {
      const cw = Math.max(4, Math.round(w * course[i]));
      const cy = top + Math.round(ch * i / 4), chh = Math.max(2, Math.round(ch / 4) + 1);
      A.fill(L.ink, cx - (cw >> 1) - 1, cy - 1, cw + 2, chh + 2);
      A.fill(i === 3 ? shade : foliage, cx - (cw >> 1), cy, cw, chh);
    }
    if (lit === 0) A.fill(pale ? GRASS[4] : CON[2], cx - Math.round(w * 0.4), top + 2, Math.max(3, w >> 2), 3);
    if (snow) A.fill(SNO[0], cx - Math.round(w * 0.4), top, Math.max(4, w >> 1), 2);
  }
  function snag(L, cx, by, h, w, lean) {
    const tw = Math.max(2, (w / 5) | 0), top = Math.round(by - h * 0.9);
    A.fill(L.ink, cx - (tw >> 1) - 1, top, tw + 2, h * 0.9 + 1);
    A.fill(L.trunk, cx - (tw >> 1), top, tw, h * 0.9);
    A.fill(L.trunk, cx, Math.round(top + h * 0.16), Math.round(w * 0.4) * (lean < 2 ? 1 : -1), 2);
    A.fill(L.trunk, cx, Math.round(top + h * 0.42), Math.round(w * 0.3) * (lean < 3 ? -1 : 1), 2);
  }
  function stump(L, cx, by, h, w) {
    const sw = Math.max(5, Math.round(w * 0.5)), sh = Math.max(4, Math.round(h * 0.18));
    A.fill(L.ink, cx - (sw >> 1) - 1, by - sh - 1, sw + 2, sh + 2);
    A.fill(L.trunk, cx - (sw >> 1), by - sh, sw, sh);
    A.fill(TIM[3], cx - (sw >> 1) + 1, by - sh, sw - 2, 2);       /* the cut  */
  }
  function fallen(L, cx, by, h, w) {
    const lw = Math.max(12, Math.round(w * 1.6));
    A.fill(L.ink, cx - (lw >> 1) - 1, by - 8, lw + 2, 9);
    A.fill(L.trunk, cx - (lw >> 1), by - 7, lw, 6);
    A.fill(TIM[3], cx - (lw >> 1), by - 7, lw, 2);
    A.fill(GRASS[1], cx - (lw >> 1) + 3, by - 9, 4, 3);           /* moss     */
  }
  const SPECIES = { fir: fir, spruce: spruce, birch: birch, snag: snag, stump: stump, fallen: fallen };

  /* the weighted bag for this map, expanded once per rebuild — and the map's
     own size with it, because the band runs the length of whatever edge it is
     drawn along and no two maps need agree on how long that is */
  let bag = ['fir'], density = 1, ready = '';
  let cols = 0, rows = 0, MW = 0, MH = 0;
  function prepare(key) {
    if (key === ready) return;
    ready = key;
    cols = A.cols(); rows = A.rows(); MW = cols * BEK_T; MH = rows * BEK_T;
    const w = BEK_TREES[A.map()] || BEK_TREES.default;
    bag = [];
    Object.keys(w.mix).forEach(k => { for (let i = 0; i < w.mix[k]; i++) bag.push(k); });
    if (!bag.length) bag = ['fir'];
    density = w.density == null ? 1 : w.density;
  }

  /* ---- the band ------------------------------------------------------------
     `along` maps a distance down the band and a depth 0..1 to a world point;
     `openAt` says whether the ring is open there, which is where an exit is. */
  /* `u0`/`u1` bound the stretch of the band that is worth drawing — see
     `draw` below. The walk itself is never shortened: `i` keeps advancing
     over the whole length so every trunk draws from the same step of the
     same stream whatever stretch is being rebuilt, and only the drawing is
     skipped. A band that decided where its trees stood from where the
     rebuild started would grow a different wood every time you walked. */
  function band(len, along, openAt, snow, u0, u1) {
    for (let li = 0; li < LAYERS.length; li++) {
      const L = LAYERS[li];
      let u = -20, i = 0;
      while (u < len + 20) {
        const v = A.tree(i, li);
        i++;
        const step = L.gap[0] + Math.round(v.gap * (L.gap[1] - L.gap[0]) / 7);
        u += Math.max(6, Math.round(step / density));
        if (u < u0 || u > u1) continue;                /* outside the rebuild */
        if (openAt(u)) continue;                       /* the mouth of a gap */
        const d = L.d + (v.d - 3) * 0.035;
        const p = along(u, d);
        const h = Math.round((26 + v.h * 4) * L.scale * (density < 1 ? 0.8 : 1));
        const w = Math.round((13 + v.w * 3) * L.scale);
        const kind = bag[(v.sp * bag.length / 12) | 0] || 'fir';
        (SPECIES[kind] || fir)(L, Math.round(p[0]), Math.round(p[1]), h, w, v.lean, v.lit, snow && li > 0);
      }
    }
    /* undergrowth along the inner edge — the black between the trunks was
       half the complaint, and brush at the foot is what fills it */
    let u = -8, i = 900;
    while (u < len + 8) {
      const v = A.tree(i, 2); i++;
      u += 7 + v.br * 3;
      if (u < u0 || u > u1) continue;
      /* not across a gap: the mouth of a way out stays clear, and its own
         ground is what the eye should follow through it */
      if (openAt(u)) continue;
      const p = along(u, 0.94);
      const bw = 4 + v.w, bh = 3 + (v.h >> 1);
      A.fill(CON[0], Math.round(p[0]) - (bw >> 1), Math.round(p[1]) - bh, bw, bh);
      if (v.br === 0) A.fill(CON[2], Math.round(p[0]) - 1, Math.round(p[1]) - bh - 2, 2, 3);
    }
  }

  /* ---- the four sides ------------------------------------------------------
     Each is the same call with a different mapping. `d` runs 0 at the outside
     of the band to 1 a few pixels *inside* the playfield, so the near layer
     overhangs — which is what stops the band looking like a strip of wallpaper
     pasted along the edge. */
  /* `R` is the tile rect the rebuild covers, `{x0, y0, x1, y1}` — the whole
     map on every map that fits one screen, which is all of the ones that
     shipped. A band is a perimeter and the region is an area, so each side
     draws only where the two meet — and `SLOP` is how far past the region a
     trunk may still stand and reach into it. A tree is drawn upward from its
     foot and the tallest LAYERS can ask for is (26 + 7*4) * 1.00 = 54px, so
     two tiles clears it with room; a band that trimmed exactly to the region
     would drop the crown of whatever stood just past the edge of it. */
  const SLOP = BEK_T * 2;
  function draw(snow, R) {
    const O = 5;                       /* how far the near layer may overhang */
    const open = (x, y) => A.tileAt(x, y) !== 'T';
    /* The floor of the wood: dark, but not the void it was — and laid per
       tile, because a gap in the ring is a way out and the ground the map
       already drew there has to run into the mouth of it. */
    const floor = (x, y) => {
      if (open(x, y)) return;
      A.fill(ATMO[0], x * BEK_T, y * BEK_T, BEK_T, BEK_T);
    };
    const rg = R || { x0: 0, y0: 0, x1: cols, y1: rows };
    const ux = [rg.x0 * BEK_T - SLOP, rg.x1 * BEK_T + SLOP];
    const uy = [rg.y0 * BEK_T - SLOP, rg.y1 * BEK_T + SLOP];
    const onTop = rg.y0 <= 1, onBot = rg.y1 >= rows - 1;
    const onLeft = rg.x0 <= 1, onRight = rg.x1 >= cols - 1;

    for (let x = rg.x0; x < rg.x1; x++) { if (onTop) floor(x, 0); if (onBot) floor(x, rows - 1); }
    for (let y = rg.y0; y < rg.y1; y++) { if (onLeft) floor(0, y); if (onRight) floor(cols - 1, y); }

    if (onTop) band(MW, (u, d) => [u, 6 + d * (BEK_T - 6 + O)], u => open((u / BEK_T) | 0, 0), snow, ux[0], ux[1]);
    if (onLeft) band(MH, (u, d) => [BEK_T - 2 - d * (BEK_T - 6 + O), u + 14],
         u => open(0, (u / BEK_T) | 0), snow, uy[0], uy[1]);
    if (onRight) band(MH, (u, d) => [MW - BEK_T + 2 + d * (BEK_T - 6 + O), u + 14],
         u => open(cols - 1, (u / BEK_T) | 0), snow, uy[0], uy[1]);
    /* the bottom band recedes downward, so its near layer stands highest */
    if (onBot) band(MW, (u, d) => [u, MH - 2 - (1 - d) * (BEK_T - 10)],
         u => open((u / BEK_T) | 0, rows - 1), snow, ux[0], ux[1]);

    /* The corners used to place the same tree twice at right angles. They are
       where two bands of wood meet, so they are the deepest part of it and
       the least light gets in — three overlapping washes down each arm, which
       cost nothing and are the difference between a frame with corners and a
       wood that closes round you. */
    for (const reach of [96, 62, 34]) {
      for (const cx of [0, MW - BEK_T]) for (const cy of [0, MH - BEK_T]) {
        if (!(cx ? onRight : onLeft) || !(cy ? onBot : onTop)) continue;
        const ax = cx ? MW - reach : 0, ay = cy ? MH - reach : 0;
        A.wash(ax, cy, reach, BEK_T, ATMO[0], 3);
        A.wash(cx, ay, BEK_T, reach, ATMO[0], 3);
      }
    }
  }

  /* ---- the world's edge ----------------------------------------------------
     `edgeMark` used to stamp a hard 4px black frame with a 1px grey lip on the
     inward side of every rim tile. With a real band of trees behind it that is
     a drawn line around a picture that no longer needs one — so what is left
     is a vignette that dithers away into the wood, and a hard accent only
     where the ring is open, because an exit is the one place an edge earns
     its keep. */
  function edge(x, y, isOpen) {
    const px = x * BEK_T, py = y * BEK_T;
    const L = x === 0, R = x === cols - 1, U = y === 0, D = y === rows - 1;
    const fade = (fx, fy, w, h, n) => { for (let k = 0; k < n; k++) A.wash(fx(k), fy(k), w, h, ATMO[0], 14 - k * 3); };
    if (U) fade(() => px, k => py + k * 3, BEK_T, 3, 4);
    if (D) fade(() => px, k => py + BEK_T - 3 - k * 3, BEK_T, 3, 4);
    if (L) fade(k => px + k * 3, () => py, 3, BEK_T, 4);
    if (R) fade(k => px + BEK_T - 3 - k * 3, () => py, 3, BEK_T, 4);
    if (!isOpen) return;
    /* the mouth of a way out: two posts of pale timber, so a gap in the wood
       reads as somewhere to go rather than as somewhere the wood forgot */
    if (U || D) {
      const gy = U ? py : py + BEK_T - 10;
      A.fill(ATMO[0], px - 2, gy, 5, 10); A.fill(TIM[1], px - 1, gy, 3, 9);
      A.fill(ATMO[0], px + BEK_T - 3, gy, 5, 10); A.fill(TIM[1], px + BEK_T - 2, gy, 3, 9);
    } else {
      const gx = L ? px : px + BEK_T - 10;
      A.fill(ATMO[0], gx, py - 2, 10, 5); A.fill(TIM[1], gx, py - 1, 9, 3);
      A.fill(ATMO[0], gx, py + BEK_T - 3, 10, 5); A.fill(TIM[1], gx, py + BEK_T - 2, 9, 3);
    }
  }

  /* A tree standing inside a map rather than on the ring — scenery, and the
     birch and spruce you fell, drawn by the same species functions so a
     tree in a field is the same tree as one in the wall. `cx` used to be a
     constant `x*BEK_T+20`, the same 40px cadence the ring was fixed for;
     `T`/`G` each already declare an unused `sx`/`sy`, `Y` falls back to its
     own unused `lx`/`ly`, and `by` jitters too or every trunk shares one
     baseline. */
  function loneTree(c, x, y, o, snow) {
    const L = LAYERS[2];
    const cx = x * BEK_T + 12 + Math.round((o.sx == null ? o.lx : o.sx) * 16 / 8);
    const by = y * BEK_T + 36 + Math.round((o.sy == null ? o.ly : o.sy) * 6 / 8);
    /* a contact shadow, so it stands on the ground rather than floating on it */
    A.wash(cx - 12, by - 4, 24, 6, ATMO[0], 9);
    if (c === 'Y') { birch(L, cx, by, 36, 15, 1, o.turn === 3 ? 0 : 2, snow); return; }
    if (c === 'G') { spruce(L, cx, by, 34, 18, 1, o.lit, snow); return; }
    fir(L, cx + (o.lean - 1) * 3, by, 30 + o.bare * 2, 17, o.lean, o.lit, snow);
  }

  return { prepare: prepare, draw: draw, edge: edge, loneTree: loneTree };
}
