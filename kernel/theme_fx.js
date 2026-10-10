/* THE SCHEME AS A WHOLE LOOK, not six custom properties.

   A colour scheme (kernel/cos_data.js SCHEMES: bg, fg, ok, hi, err, dim, acc) used to reach only the few stylesheet rules that read `var(--sch-*)`, so PAPER
   changed the terminal and left every game, every title bar and every canvas exactly as it was. Now a scheme is also a *gradient map*: an SVG filter that takes
   the brightness of every pixel under it and looks it up on the scheme's own ramp, black on the scheme's background, then its dim ink, its ink, its highlight
   at white. It is laid over the title bar of every window, the menu bar and the taskbar, so the chrome is one colour world, whether the scheme is worn by the whole
   machine or just by one window's [T].

   WHAT IT DRESSES, AND WHAT IT NEVER TOUCHES. A scheme dresses NOTES and nothing else: the Notes window's own frame (title bar and edge) and the whole of its page (the list,
   the editor, the reading view, the links, the graph). Every other window, the menu bar, the taskbar, the colour of the desktop, the icons, the pop-ups, the games, the
   terminal, the elephant and a wallpaper keep the machine's own colours, whatever scheme is worn: a scheme used to be laid over the machine's chrome, and on a pale one
   (PAPER) the icons' names and the taskbar disappeared. Notes is the one place where the colours of the text are a thing you choose, so it is the one place they are
   chosen, and it is held to readable whatever is chosen (`notesInks`: every ink is pushed until it has contrast against the page it is read on).
   kernel/theme.css, "THE SCHEME DRESSES NOTES", is where the filter is applied.

   - The first `DEEP` of the ramp is where the background sits; the ramp is bg, dim, fg, hi at equal steps, in sRGB (color-interpolation-filters), so a
     light-on-dark scheme and a dark-on-light one (PAPER) are the same filter with the ends swapped.
   - Brightness is lifted a little first (GAMMA), so a red or a blue that is dark on VGA is still a mid-tone on the ramp and keeps its contrast against the background.
   - A little of the real picture (MIX) is kept, so a green OK and a red error are still different things.
   - Pure (strings and numbers, no window): `node scripts/check-theme.mjs` holds every scheme's ramp to a contrast floor. `install()` is the only part that touches the page. */
export const GAMMA = 0.72;
export const MIX = 0.16;
export const mixOf = v => lumaOf(hex(v.bg)) > 0.5 ? 0.05 : MIX;     /* a light scheme keeps almost none of the original: its black would grey the paper */
export const STOPS = ['bg', 'dim', 'fg', 'top'];
const TOP = 0.35;                     /* the top of the ramp is the ink with a third of the highlight in it, so white is never a different colour from the text */

const hex = c => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
export const lumaOf = rgb => (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
export const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
export const relLum = rgb => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
export const contrast = (a, b) => { const x = relLum(a), y = relLum(b), hi = Math.max(x, y), lo = Math.min(x, y); return (hi + 0.05) / (lo + 0.05); };

/* the four colours of a scheme's ramp, as [r, g, b] in 0..255 */
export const rampOf = v => { const f = hex(v.fg), h = hex(v.hi), light = lumaOf(hex(v.bg)) > 0.5; return [hex(v.bg), hex(v.dim), f, light ? f : f.map((x, i) => x + (h[i] - x) * TOP)]; };

/* what a pixel of this colour becomes under the scheme (the same arithmetic the filter does, for the check and for the desktop's own colour) */
export function mapColour(v, rgb) {
  const r = rampOf(v), L = Math.pow(lumaOf(rgb), GAMMA) * (r.length - 1);
  const i = Math.min(r.length - 2, Math.floor(L)), f = L - i;
  const m = [0, 1, 2].map(c => r[i][c] + (r[i + 1][c] - r[i][c]) * f);
  const k = mixOf(v);
  return [0, 1, 2].map(c => m[c] * (1 - k) + rgb[c] * k);
}

/* what a VGA colour of the window's frame becomes under the scheme, as '#RRGGBB'. The title bar is filtered (it is an element); the edge of a window is a border, which no filter
   reaches without also reaching the app inside it, so it is given the colour the same ramp would give it. */
export const frameHex = (v, colour) => toHex(mapColour(v, hex(colour)));

/* the desktop's own colour: the background with a good deal of the accent in it (VGA's is the blue it always was) */
export function deskOf(v, id) {
  if (!id || id === 'vga') return '#0000AA';
  const b = hex(v.bg), a = hex(v.acc), light = lumaOf(b) > 0.5;
  const k = light ? 0.22 : 0.3;
  return toHex(b.map((x, i) => light ? x * (1 - k) + a[i] * k : x * (1 - k) + a[i] * k * 0.55));
}

/* one <filter> for a scheme, as markup */
export function filterOf(id, v) {
  const r = rampOf(v), tv = c => r.map(x => (x[c] / 255).toFixed(4)).join(' '), k = mixOf(v);
  return '<filter id="th-' + id + '" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' +
    '<feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0"/>' +
    '<feComponentTransfer><feFuncR type="gamma" amplitude="1" exponent="' + GAMMA + '" offset="0"/><feFuncG type="gamma" amplitude="1" exponent="' + GAMMA + '" offset="0"/><feFuncB type="gamma" amplitude="1" exponent="' + GAMMA + '" offset="0"/></feComponentTransfer>' +
    '<feComponentTransfer result="ramp"><feFuncR type="table" tableValues="' + tv(0) + '"/><feFuncG type="table" tableValues="' + tv(1) + '"/><feFuncB type="table" tableValues="' + tv(2) + '"/></feComponentTransfer>' +
    '<feComposite in="SourceGraphic" in2="ramp" operator="arithmetic" k1="0" k2="' + k + '" k3="' + (1 - k).toFixed(3) + '" k4="0"/>' +
    '</filter>';
}

/* every scheme's filter in one hidden <svg>, put in the page once; the scheme with the default look (VGA) has none: `none` is its filter */
export function install(schemes) {
  if (typeof document === 'undefined') return;
  let svg = document.getElementById('theme-filters');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'theme-filters'; svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
    document.body.appendChild(svg);
  }
  svg.innerHTML = '<defs>' + schemes.filter(s => s.id !== 'vga').map(s => filterOf(s.id, s.v)).join('') + '</defs>';
}

/* ---- THE INKS OF A NOTES PAGE, HELD TO READABLE ------------------------------------------------------------------------------------------
   A scheme is six inks and a ground (bg, fg, ok, hi, err, dim, acc). Notes reads them as: the page (bg), the text (fg), the headings and the title (hi), the links, the second
   heading and the selected row (acc), the third heading and the chips (ok), a dead link (err), and the counts and what is done (dim). Each is read on a ground, and each is pushed
   toward the far end of the scale (black on a light page, white on a dark one) until it has the contrast it needs: 7:1 for the text, 4.5:1 for every other ink, which is what
   the machine holds all its own text to (scripts/check-contrast.mjs). Pure: scripts/check-theme.mjs holds every scheme. */
export const NOTES_MIN = { fg: 7, ink: 4.5 };
const mixRgb = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
export function readable(color, ground, min) {
  let c = hex(color);
  const g = hex(ground), to = lumaOf(g) > 0.5 ? [0, 0, 0] : [255, 255, 255];
  for (let i = 0; i < 24 && contrast(c, g) < min; i++) c = mixRgb(c, to, 0.12);
  return toHex(c);
}
export function notesInks(v) {
  const bg = v.bg, light = lumaOf(hex(bg)) > 0.5, hover = toHex(mixRgb(hex(bg), light ? [0, 0, 0] : [255, 255, 255], 0.14));
  const on = (c, min, ground) => readable(c, ground || bg, min);
  /* a row that is selected is the accent with the page's own colour on it (or whichever of black and white reads on the accent) */
  const sel = v.acc, selInk = readable(bg, sel, NOTES_MIN.ink);
  const t = {
    bg: bg, fg: on(v.fg, NOTES_MIN.fg, hover), hi: on(v.hi, NOTES_MIN.ink, hover), acc: on(v.acc, NOTES_MIN.ink, hover), ok: on(v.ok, NOTES_MIN.ink, hover), err: on(v.err, NOTES_MIN.ink, hover),
    dim: on(v.dim, NOTES_MIN.ink, hover), hover: hover, sel: sel, selInk: selInk
  };
  t.line = on(v.dim, 3, bg);                 /* a rule or an edge needs less: it is not read */
  return t;
}

/* The custom properties a scheme sets, and only on a NOTES window: the filter its title bar wears and the page's inks (--n-*, read by the Notes rules in theme.css). The default
   scheme (VGA) sets nothing and so leaves Notes exactly as it always was. Nothing is ever set on the room: the machine's own colours are not a scheme's business. */
export function varsOf(s) {
  const o = {};
  if (s.id === 'vga') return o;
  const t = notesInks(s.v);
  Object.assign(o, { '--n-bg': t.bg, '--n-fg': t.fg, '--n-hi': t.hi, '--n-acc': t.acc, '--n-ok': t.ok, '--n-err': t.err, '--n-dim': t.dim, '--n-hover': t.hover, '--n-sel': t.sel, '--n-selink': t.selInk, '--n-line': t.line });
  o['--th-filter'] = 'url(#th-' + s.id + ')';
  return o;
}
export const VAR_NAMES = ['--n-bg', '--n-fg', '--n-hi', '--n-acc', '--n-ok', '--n-err', '--n-dim', '--n-hover', '--n-sel', '--n-selink', '--n-line', '--th-filter',
  '--sch-bg', '--sch-fg', '--sch-ok', '--sch-hi', '--sch-err', '--sch-dim', '--sch-acc', '--sch-desk'];     /* the --sch-* are what a build before this one set on the room: cleared if they are there */
