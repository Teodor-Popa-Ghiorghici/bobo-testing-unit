/* Bekkedal — a pool of light, as an ordered dither between the picture the
 * hour rendered and the picture daylight would have.
 *
 * The doctrine is in `light.js`: night is a palette and not an overlay. Local
 * light was still an overlay — a stipple of one warm entry laid over the
 * ground, at strengths high enough (10, 12, 16 of 16) that the ground was not
 * under it any more. So a lantern hid the mine floor, the ore and the mineral
 * traces `rock.js` put in the rock to tell you where to look, and a hearth,
 * which stacked a cached pool and a live flicker pool on the same pixels,
 * came out effectively opaque.
 *
 * Here a pool blends between two *pictures* rather than toward a colour. For
 * every pixel in reach, the ordered matrix decides between the colour the
 * hour gave it and the colour it would have had in daylight plus a warm tint
 * (`lampState`). At full strength you are looking at the daylight picture, so
 * full strength is *maximum* legibility rather than none — which is why the
 * flat-topped falloff could stay exactly as it was.
 *
 * Three things fall out of that shape rather than having to be arranged:
 *
 *   - **Stacking is impossible.** The target is a fixed palette, not an
 *     addend, and ordered-dither coverage sets are nested — the set lit at
 *     strength 9 contains the set lit at 5. Two pools over one pixel light it
 *     to the same colour, so overlapping sources compose as a maximum. That
 *     was the hearth bug and it is now unexpressible.
 *   - **It costs nothing in daylight.** As the hour approaches noon the two
 *     palettes converge, so the pool fades out on its own.
 *   - **No alpha.** Every pixel written is one of two whole colours. This is a
 *     more literal ordered dither than `ditherPat` — the matrix is read
 *     directly rather than baked into a stipple tile — and there is no
 *     `globalAlpha`, no `rgba()`, no `ctx.filter` and no compositing mode
 *     anywhere in it.
 *
 * What it is not is a substitute for warmth. The old two-pass structure got
 * its colour temperature from painting the rim in a deeper entry than the
 * core; that is gone, so `index.js` lays a thin warm veil (`VEIL`, two
 * sixteenths of `WAR[2]`, ordinary `ditherPat` stipple) over the top. Thin is
 * the specification: at that strength it is a cast over the picture and not a
 * lid on it, and it is hollow in the middle so the one place the picture most
 * needs to be legible has no paint on it at all.
 *
 * The falloff, the lamp's own light state and the pass are all here; the hour
 * itself, and the affine shape both of them rest on, are in `light.js`.
 */
import { quantState, L_R, L_G, L_B } from './light.js';

/* ---- the falloff ----------------------------------------------------------
   `glow` walks the source's box in CELL-sized squares and hands each one a
   strength. CELL is half a tile: per-tile would band visibly at this radius,
   and per-pixel would cost more than the rest of the frame put together. The
   remaining banding — one ordered-dither step per ring — is broken up by a
   per-cell offset taken from the position, the same trick `patchAmt` uses to
   keep a smooth field from drawing its own contour lines.

   The profile stays deliberately flat-topped and steep at the rim rather than
   a smooth bell. A bell spends most of its *area* in the outer ring, and the
   outer ring is where the strength is 1, 2 or 3 out of 16 — which at an
   eight-pixel stipple cell is not a soft edge, it is a spray of loose squares
   over the grass. And the flat top, which was the other half of the old
   complaint, stops being a fault the moment the top is the daylight picture
   rather than opaque paint: full strength now means *fully legible*, so
   holding it across the middle of the pool is the point rather than the
   damage. */
export const GLOW_CELL = 20;

/* How far toward daylight a pool takes the exposure of what it lights. Not
   all the way: a disc of exact noon dropped into a blue valley reads as a
   hole cut through to another hour, and the last tenth is what keeps a pool
   sitting *in* the night rather than on top of it. */
export const LAMP_MIX = 0.9;
/* Exposure and saturation are pulled back toward daylight by *different*
   amounts, and that separation is the difference between a pool of light and
   a hole cut through to the afternoon. Take `sat` all the way back with `k`
   and a lamp on grass restores full daylight green, which against a blue-grey
   valley and a warm rim reads as a chequer of complementary colours rather
   than as a lit patch of ground — the town's two street lamps are where it
   showed. A warm lamp is not the sun: it lifts the exposure most of the way
   and gives back only some of the colour, and the tint below supplies the
   hue it does not. It costs nothing to have them differ, because `sat` is
   the one term of the transform the luminance is provably blind to. */
export const LAMP_SAT = 0.45;
/* Daylight is the ceiling, and it is a hard one. A lamp brighter than noon
   was tried: at `k` above 1 the entries the palette already puts near 255
   clamp, stop climbing, and get overtaken by entries that have not clamped
   yet — 1908 reordered pairs at the first run of palette_check, which is the
   one thing this file is not allowed to do. Local light brightens by
   *revealing* the daylight picture, never by exceeding it. */
export const LAMP_K = 1;
/* The warm cast a lamp leaves, and it has a ceiling of its own for the same
   reason `LAMP_K` does: past about +50 on red the entries the palette already
   puts at 255 there clamp, stop climbing, and get passed by entries that have
   not. Measured, not guessed — 48 is clean and 52 costs one reordered pair
   (index 12 against 25). This sits under that with room for an anchor
   somebody adds later, and palette_check is what will say so if it runs out. */
export const LAMP_TINT = [46, 19, -13];

/* What a pool resolves what it lights *toward*. A light state like any other
   — the same `{ k, sat, a }`, blended toward daylight the way `shelter`
   blends a room toward it — so it goes through `lutOf` and inherits
   `light.js`'s ordering guarantee for free, and `palette_check.js` asserts
   that over the lamp's tables as well as the hour's. `dark` is how dark it is
   *outside* (the unsheltered exposure), because that is what decides how hard
   a fire has to burn, and it is the same figure the source peaks scale on. */
export function lampState(st, dark) {
  const u = LAMP_MIX, f = (v, one) => v + (one - v) * u;
  /* The tint is the one part of a pool that must go to nothing in daylight,
     and it is the part that does not fall off on its own. Exposure does:
     `LAMP_K` is daylight, so at eight in the morning there is almost nothing
     between the hour's table and the lamp's and the pool disappears whatever
     its peak. A fixed warm cast does not, and a window ringed in amber at
     08:00 is what that looks like. */
  const d = Math.min(1, Math.max(0, dark));
  return quantState(
    f(st.k, LAMP_K), st.sat + (1 - st.sat) * LAMP_SAT,
    [f(st.a[0], 0) + LAMP_TINT[0] * d,
     f(st.a[1], 0) + LAMP_TINT[1] * d,
     f(st.a[2], 0) + LAMP_TINT[2] * d],
    f(st.exposure, LAMP_K));
}

/* Coefficients for re-lighting an already-rendered pixel from state `f` to
   state `t`, as one affine map per channel:

       lit = P * lum(c) + Q * c + D

   Work it through. The hour renders `c = (l + (p-l)*sat)*k + a` where `l` is
   the entry's own luminance, and because `lum` is linear and the saturation
   term cancels under it, `lum(c) = k*l + lum(a)` — so `l` comes straight back
   out of the pixel. With `l` known, `q = (c-a)/k` gives `p - l = (q-l)/sat`,
   and the target state applied to that collapses to the line above. Six
   multiplies a pixel, and exact to within the forward clamp: about a third of
   a channel step at a midnight exposure, which is under the rounding the LUT
   already does.

   This is the same claim as "night is a palette" run backwards, and it holds
   for the same reason — the transform is affine with a scalar exposure. A
   per-channel multiplier would not invert like this either. */
export function relightCoef(f, t) {
  const R = f.sat > 0 ? t.sat / f.sat : 1, P = t.k * (1 - R) / f.k, Q = t.k * R / f.k;
  const la = L_R * f.a[0] + L_G * f.a[1] + L_B * f.a[2];
  return { P: P, Q: Q,
           D: [t.a[0] - P * la - Q * f.a[0],
               t.a[1] - P * la - Q * f.a[1],
               t.a[2] - P * la - Q * f.a[2]] };
}

const jitter = (x, y) => {
  let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + 1442695041) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177) | 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

/* px,py: the source's centre in device pixels. r: reach, also device pixels.
   peak: dither strength out of 16 at the centre. `put(x, y, w, h, strength)`
   is whatever the caller wants to stipple with. */
export function glow(put, px, py, r, peak) {
  if (peak <= 0 || r <= 0) return 0;
  const c = GLOW_CELL;
  const x0 = Math.floor((px - r) / c) * c, x1 = Math.ceil((px + r) / c) * c;
  const y0 = Math.floor((py - r) / c) * c, y1 = Math.ceil((py + r) / c) * c;
  let n = 0;
  for (let y = y0; y < y1; y += c) {
    for (let x = x0; x < x1; x += c) {
      const dx = x + c / 2 - px, dy = (y + c / 2 - py) * 1.15;   /* a shade wider than tall */
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= r) continue;
      const u = d / r;
      const s = Math.floor(peak * (1 - u * u * u) + jitter(x, y));
      if (s < 2) continue;
      put(x, y, c, c, s > 16 ? 16 : s);
      n++;
    }
  }
  return n;
}

/* One strength per GLOW_CELL square of the whole canvas — 48 x 30 bytes for a
   map, which is small enough that there is no reason to bound it to the
   sources and every reason not to: the composing-as-a-maximum above only
   works if all the sources land in one field before a pixel is touched. */
export function createLamp(W, H, matrix, ditherPx) {
  const CW = Math.ceil(W / GLOW_CELL), CH = Math.ceil(H / GLOW_CELL);
  const field = new Uint8Array(CW * CH);

  /* Walk every source into the field and return the pixel box that bounds
     what got lit, clamped to the canvas. Null when nothing did. */
  function gather(sources) {
    field.fill(0);
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let i = 0; i < sources.length; i++) {
      const sc = sources[i];
      glow((cx, cy, w, h, s) => {
        const gx = Math.floor(cx / GLOW_CELL), gy = Math.floor(cy / GLOW_CELL);
        if (gx < 0 || gy < 0 || gx >= CW || gy >= CH) return;
        const ix = gy * CW + gx;
        if (s <= field[ix]) return;
        field[ix] = s;
        if (cx < x0) x0 = cx;
        if (cy < y0) y0 = cy;
        if (cx + w > x1) x1 = cx + w;
        if (cy + h > y1) y1 = cy + h;
      }, sc.px, sc.py, sc.r, sc.peak);
    }
    x0 = Math.max(0, x0); y0 = Math.max(0, y0);
    x1 = Math.min(W, x1); y1 = Math.min(H, y1);
    return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
  }

  /* The pass itself. `from` is the state the pixels in `ctx` were rasterised
     through, `to` is what the pool resolves them toward; `clip` bounds it to
     a rect the caller owns (the viewport, so a lantern never reaches the HUD).

     Reading and writing the box whole, rather than per cell, is what makes
     this affordable: one getImageData, one putImageData, and a loop that
     touches a pixel once. Uint8ClampedArray does the clamping and the
     rounding on the way in, which is the same rounding `lutOf` does.

     Measure before optimising the loop — it is not where the time goes. A
     280x120 box and a 640x400 one cost about the same (6-7ms and 5-6ms), so
     what is being paid for is the readback forcing the canvas to flush the
     several thousand `fillRect`s the rebuild has just queued, not the 34,000
     pixels. Shrinking the box buys nothing; not touching the canvas at all is
     the only thing that would, which is why there is exactly one of these per
     rebuild and the sources are composed into one field first. */
  function apply(ctx, sources, from, to, clip) {
    let box = gather(sources);
    if (!box) return 0;
    if (clip) {
      const x0 = Math.max(box.x, clip.x), y0 = Math.max(box.y, clip.y);
      const x1 = Math.min(box.x + box.w, clip.x + clip.w), y1 = Math.min(box.y + box.h, clip.y + clip.h);
      if (x1 <= x0 || y1 <= y0) return 0;
      box = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }
    const co = relightCoef(from, to), P = co.P, Q = co.Q, D0 = co.D[0], D1 = co.D[1], D2 = co.D[2];
    const img = ctx.getImageData(box.x, box.y, box.w, box.h), d = img.data;
    let lit = 0;
    for (let j = 0; j < box.h; j++) {
      const wy = box.y + j;
      const row = matrix[((wy / ditherPx) | 0) & 3];
      const cell = ((wy / GLOW_CELL) | 0) * CW;
      let o = j * box.w * 4;
      for (let i = 0; i < box.w; i++, o += 4) {
        const wx = box.x + i;
        if (row[((wx / ditherPx) | 0) & 3] >= field[cell + ((wx / GLOW_CELL) | 0)]) continue;
        const r = d[o], gr = d[o + 1], b = d[o + 2];
        const t = P * (0.2126 * r + 0.7152 * gr + 0.0722 * b);
        d[o] = t + Q * r + D0;
        d[o + 1] = t + Q * gr + D1;
        d[o + 2] = t + Q * b + D2;
        lit++;
      }
    }
    ctx.putImageData(img, box.x, box.y);
    return lit;
  }

  return { apply: apply };
}
