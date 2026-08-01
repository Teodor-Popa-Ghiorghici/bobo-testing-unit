/* Offscreen sprite compositor.

   Every character is painted once per frame into a private offscreen
   buffer at 1:1 pixel scale, then stamped into the scene. Going through a
   buffer is what buys the expensive-looking parts of the art for free:

     - a real 1px ink outline traced around whatever was drawn, so the
       silhouette reads instantly against a busy background (this is the
       single biggest "anime cel" cue in pixel art),
     - a cast shadow that is the character's own shape, skewed onto the
       ground away from the key light, not a generic blob,
     - hit flashes, dodge afterimages and elemental tints as whole-sprite
       operations instead of a second painting pass per body part,
     - squash & stretch by scaling the finished stamp, so shading inside
       the sprite doesn't stretch with it.

   All buffers are pooled by name; nothing is allocated per frame. */

const pool = new Map();

export function buffer(key, w, h) {
  let b = pool.get(key);
  if (!b || b.cv.width !== w || b.cv.height !== h) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    b = { cv, g, w, h };
    pool.set(key, b);
  }
  b.g.clearRect(0, 0, w, h);
  return b;
}

export function dropBuffers() { pool.clear(); cache.clear(); }

/* Painted-once buffers: background layers are far too expensive to
   rebuild per frame, and they never change once built. */
const cache = new Map();

export function cached(key, w, h, build) {
  let b = cache.get(key);
  if (b && b.w === w && b.h === h) return b;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  b = { cv, g, w, h };
  build(g, w, h);
  cache.set(key, b);
  return b;
}

/* silhouette of `src`, painted flat in `color` into a sibling buffer */
function silhouette(src, color, key) {
  const b = buffer(key, src.w, src.h);
  b.g.drawImage(src.cv, 0, 0);
  b.g.globalCompositeOperation = 'source-in';
  b.g.fillStyle = color;
  b.g.fillRect(0, 0, b.w, b.h);
  b.g.globalCompositeOperation = 'source-over';
  return b;
}

const OUT8 = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
const OUT4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];

/* Stamp a character buffer into the scene.

   opts: x, y          where the sprite's origin lands in scene space
         ox, oy        that origin's position inside the buffer
         flip          -1 to mirror horizontally
         sx, sy        squash/stretch about the origin
         outline       ink colour for the traced outline (null = none)
         thickOutline  trace 8 neighbours instead of 4
         shadow        {color, alpha, skew, squash, y} ground projection
         flash         {color, alpha} full-sprite hit flash
         tint          {color, alpha} modifier colouring
         ghosts        [{dx, dy, alpha, color}] afterimage trail
         alpha         overall opacity */
export function stamp(g, buf, opts) {
  const o = opts || {};
  const flip = o.flip || 1;
  const sx = (o.sx == null ? 1 : o.sx) * flip;
  const sy = o.sy == null ? 1 : o.sy;
  const ox = o.ox == null ? buf.w / 2 : o.ox;
  const oy = o.oy == null ? buf.h : o.oy;
  const x = Math.round(o.x), y = Math.round(o.y);

  if (o.shadow) {
    const sh = silhouette(buf, o.shadow.color || '#000000', '_sil_shadow');
    g.save();
    g.globalAlpha = o.shadow.alpha == null ? 0.34 : o.shadow.alpha;
    g.translate(x, y + (o.shadow.y || 0));
    g.transform(1, 0, o.shadow.skew == null ? 0.85 : o.shadow.skew, o.shadow.squash == null ? 0.3 : o.shadow.squash, 0, 0);
    g.drawImage(sh.cv, -ox, -oy);
    g.restore();
  }

  const place = (cv, dx, dy, a) => {
    g.save();
    if (a != null) g.globalAlpha = a;
    g.translate(x + dx, y + dy);
    if (o.rot) g.rotate(o.rot);
    if (sx !== 1 || sy !== 1) g.scale(sx, sy);
    g.drawImage(cv, -ox, -oy);
    g.restore();
  };

  if (o.ghosts && o.ghosts.length) {
    for (const gh of o.ghosts) {
      const cv = gh.color ? silhouette(buf, gh.color, '_sil_ghost').cv : buf.cv;
      place(cv, gh.dx, gh.dy, gh.alpha);
    }
  }

  if (o.outline) {
    const ink = silhouette(buf, o.outline, '_sil_ink');
    const offs = o.thickOutline ? OUT8 : OUT4;
    for (const [dx, dy] of offs) place(ink.cv, dx, dy, o.alpha);
  }

  /* Scene rim light: the silhouette nudged toward the key light and drawn
     in the scene's own light colour, so the sprite is left with a lit
     edge along its top and light side. This is what stops a character
     from looking like a sticker pasted onto the background -- the
     backdrop's light now visibly falls on them. */
  if (o.rim) {
    const r = silhouette(buf, o.rim.color, '_sil_rim');
    place(r.cv, o.rim.dx == null ? -1 : o.rim.dx, o.rim.dy == null ? -2 : o.rim.dy,
      (o.rim.alpha == null ? 0.5 : o.rim.alpha) * (o.alpha == null ? 1 : o.alpha));
  }

  place(buf.cv, 0, 0, o.alpha);

  if (o.tint && o.tint.alpha > 0.01) {
    const t = silhouette(buf, o.tint.color, '_sil_tint');
    place(t.cv, 0, 0, o.tint.alpha);
  }
  if (o.flash && o.flash.alpha > 0.01) {
    const f = silhouette(buf, o.flash.color || '#FFFFFF', '_sil_flash');
    place(f.cv, 0, 0, Math.min(1, o.flash.alpha));
  }
}

/* Motion smear: the sprite streaked along a direction, drawn as a few
   fading silhouettes. Used on rush attacks and hard knockbacks, where a
   single crisp pose reads as a freeze-frame instead of a fast movement. */
export function smear(g, buf, opts, dx, dy, count, color, alpha) {
  const ghosts = [];
  for (let i = 1; i <= count; i++) {
    ghosts.push({ dx: -dx * i, dy: -dy * i, alpha: alpha * (1 - i / (count + 1)), color });
  }
  stamp(g, buf, Object.assign({}, opts, { ghosts, outline: null, shadow: null }));
}
