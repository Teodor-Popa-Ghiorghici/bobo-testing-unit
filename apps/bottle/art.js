/* The bottle and the table. Everything is flat rects (the stag is a few of
   them); the bottle, which turns, is baked into layers once and turned by
   sampling (raster.js), so nothing on this table has a soft edge. Its
   coordinates are local: the origin is the middle of the base, y up is
   negative. The glass has its own file (glass3d.js), and nobody is drawn
   here: the person drinking is the one at the monitor. */
import { geometry } from './shapes.js';
import { drawCap, drawCapOnBar } from './caps.js';
import { drawLabel } from './labels.js';

export const BW = 380, BH = 360;
export const C = {
  glass: '#1f5a28', glassHi: '#46a04e', glassLo: '#0f2f16', glassMid: '#2b7434', edge: '#0a1c0e',
  liquid: '#6e3a14', liquidHi: '#b26a24', liquidLo: '#44220a', foam: '#e9c98a',
  label: '#f08a14', labelHi: '#ffae3c', labelDk: '#b8620c', ink: '#14100a', glow: '#fff3b0',
  cap: '#195226', capHi: '#2f8a42', capLo: '#0f3318', band: '#e07a10', cork: '#c89a5a', corkHi: '#e0b878', corkLo: '#8a6232',
  wood: '#3a2415', woodHi: '#4d3020', shot: '#c9d4dc', shotHi: '#ffffff', white: '#f2f4f7', dim: '#9aa3ad'
};

/* the bottle: sprite 80 x 246, art origin at (40, 242), turns about its middle. `lip` and `lipUp` are the Jägermeister's; every bottle has its own (shapes.js geometry) */
export const BOT = { w: 80, h: 246, ox: 40, oy: 242, cx: 40, cy: 121, lip: [13, -224], lipUp: [-13, -224], rest: [70, 246] };
/* the tumbler is an object, not a sprite (glass3d.js); this is where its base sits on the table */
export const GLS = { rest: [328, 292] };

const mk = (_w, _h, fn) => g => { g.save(); fn(g); g.restore(); };
const Rf = g => (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
const JAG_TEXT = { emboss: 'JÄGERMEISTER', title: 'Jägermeister', sub1: 'KRÄUTERLIKÖR', sub2: '35% vol · 56 herbs', icon: null };

/* `D` is a drink's look (drinks.js); without one it is the Jägermeister the game began with */
export function makeArt(g, D) {
  const K = D ? Object.assign({}, C, D.colors) : C, X = D ? D.text : JAG_TEXT, G = geometry(D && D.shape || 'jag', D && D.capKind);
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
  const T = (t, x, y, c, sz, al, font) => { g.fillStyle = c; g.font = (sz || 9) + 'px ' + (font || 'monospace');
    g.textAlign = al || 'left'; g.fillText(String(t), Math.round(x), Math.round(y)); g.textAlign = 'left'; };

  /* ---- layers for raster.js, in art coordinates --------------------------- */
  const slab = (r, rows, col) => rows.forEach(w => r(-w.hw, -(w.y + 2), w.hw * 2, 2, col(w)));   /* a row is two pixels tall, a half-width either side of the middle */
  const bottleSpec = {
    w: BOT.w, h: BOT.h, cx: BOT.cx, cy: BOT.cy,
    base: mk(0, 0, g2 => {
      const r = Rf(g2); g2.translate(BOT.ox, BOT.oy);
      slab(r, G.rows, () => K.glass);
      G.rows.forEach(w => {                                             /* the light on the left of the glass and the shade on the right */
        if (w.kind !== 'body' || w.hw < 14) return;
        r(-w.hw + 2, -(w.y + 2), 3, 2, K.glassMid); r(w.hw - Math.min(9, w.hw / 3), -(w.y + 2), Math.min(9, w.hw / 3) - 1, 2, K.glassLo);
      });
      if (G.emboss) { g2.fillStyle = K.glassMid; g2.font = '6px monospace'; g2.textAlign = 'center'; g2.fillText(X.emboss, 0, -G.emboss); }
    }),
    inner: mk(0, 0, g2 => {
      const r = Rf(g2); g2.translate(BOT.ox, BOT.oy);
      /* the liquor fills the body, the shoulder and the neck, up to the mouth: the flange of the lip is glass on the outside only */
      G.inner.forEach(w => r(-w.hw, -(w.y + 2), w.hw * 2, 2, '#fff'));
    }),
    over: [true, false].map(capOn => mk(0, 0, g2 => {
      const r = Rf(g2); g2.translate(BOT.ox, BOT.oy);
      /* the light down the left of the glass, over whatever is behind it */
      g2.globalAlpha = 0.34;
      G.rows.forEach(w => { if (w.hw * 2 > 16) r(-w.hw + 3, -(w.y + 2), Math.min(7, w.hw / 2), 2, '#d8f4d8'); });
      g2.globalAlpha = 1;
      drawLabel(g2, r, K, X, G.label);
      if (G.band) { r(-G.neckHW, -(G.band.top + G.band.h), G.neckHW * 2, G.band.h, K.band); r(-G.neckHW, -(G.band.top + G.band.h), G.neckHW * 2, 1, K.labelHi); }
      if (capOn) drawCap(r, K, G);
    })),
    /* seen through green glass, the liquor is nearly black */
    liquid: (D && D.bottleLiquid) || { base: '#2a180a', mid: '#3c2410', hi: '#8a5a24', edge: '#180e06', foam: '#e9c98a' }
  };

/* ---- the room --------------------------------------------------------- */
  function table() {
    R(0, 0, BW, BH, C.wood);
    for (let y = 0; y < BH; y += 7) R(0, y, BW, 1, y % 14 ? C.woodHi : C.wood);
    R(0, 250, BW, 3, '#221407'); R(0, 253, BW, 107, '#2c1b0f');
    for (let y = 255; y < BH; y += 6) R(0, y, BW, 1, '#33200f');
  }
  /* the coaster (HOLYC.EXE's quiet gift, kernel/buffs_core.js 'jager_coaster'): a cork disc under the glass, seen from the front and a little above, with the drink's own colour printed in a ring
     round it and the thick edge in shade. Whole pixels; the glass stands on it and it stays when the glass is lifted away. */
  function coaster() {
    const cx = GLS.rest[0], cy = GLS.rest[1] + 1, rx = 47, ry = 9, th = 4;
    const disc = (dy, rr, c) => { for (let y = -ry * rr; y <= ry * rr; y++) { const w = Math.round(rx * rr * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * rr * ry * rr)))); if (w > 0) R(cx - w, cy + dy + y, w * 2, 1, c); } };
    disc(th + 1, 1.04, '#120a04');                                       /* the dark under its edge */
    disc(th, 1, K.corkLo);                                               /* the thick of the edge */
    for (let d = th - 1; d >= 0; d--) disc(d + 0.01, 1, d === 0 ? K.cork : K.corkLo);
    disc(0, 0.94, K.cork);
    disc(0, 0.78, K.corkHi);
    disc(0, 0.72, K.label);                                              /* the printed ring ... */
    disc(0, 0.64, K.cork);                                               /* ... and the cork inside it */
    for (let i = 0; i < 14; i++) { const a = i * 2.4, px = Math.round(Math.cos(a) * rx * 0.52 * (0.5 + (i % 3) * 0.25)), py = Math.round(Math.sin(a) * ry * 0.55); R(cx + px, cy + py, 2, 1, K.corkLo); }
  }
  const shadow = (x, y, w) => { g.globalAlpha = 0.35; R(x - w / 2, y, w, 4, '#000'); g.globalAlpha = 1; };
  function capOnBar() { drawCapOnBar(R, K, G, 104, 246); }

  return { R, T, table, shadow, coaster, capOnBar, bottleSpec, geo: G };
}
