/* The icon every file view draws: the desktop, a folder window, the bin.

   An icon used to carry its picture as an inline <svg> of a dozen rects, so two hundred files on the desktop were
   two thousand five hundred elements the browser had to style, lay out and paint, and every redraw built them all
   again. Now a picture is a CSS class that holds the same SVG as a background image (decoded once, shared by every
   icon that wears it), and an icon is a clone of one small template: three elements, whatever it shows.
   spriteFor() still hands out the SVG itself, for the drag ghost. */
import { SPRITES } from './sprites.js';
import './sprites_extra.js';

const APP_SPRITES = {
  hifi: 'disc', notes: 'notes', bottle: 'bottle', elephant: 'elephant',
  magen: 'magen', cook: 'flask', garden: 'garden', sweeper: 'sweeper',
  solitaire: 'solitaire', crayon: 'crayon', shop: 'shop', drawings: 'drawings',
  account: 'account', standbattle: 'arena', garage: 'garage', holyc: 'holyc', trophies: 'trophy', trophybox: 'trophybox', bibel: 'bibel'
};

export function spriteFor(type, app, look) {
  if (type === 'folder')   return SPRITES.folder;
  if (type === 'image')    return SPRITES.image;
  if (type === 'video')    return SPRITES.video;
  if (type === 'terminal') return SPRITES.terminal;
  if (type === 'bin')      return look === 'dumpster' ? SPRITES.dumpster : SPRITES.bin;
  if (type === 'binfull')  return look === 'dumpster' ? SPRITES.dumpsterfull : SPRITES.binfull;
  if (type === 'song')     return SPRITES.song;
  if (type === 'app')      return SPRITES[APP_SPRITES[app]] || SPRITES.app;
  if (type === 'doc')      return SPRITES.doc;
  if (type === 'code')     return SPRITES.code;
  return SPRITES.text;
}

const kinds = new Map();                 /* key -> template element */
let sheet = null;

/* what picture an icon wears: the same SVG is one rule, however many files show it */
function template(type, app, look) {
  const svg = spriteFor(type, app, look);
  let t = kinds.get(svg);
  if (t) return t;
  if (!sheet) {
    const st = document.createElement('style');
    st.id = 'icon-sprites';
    document.head.appendChild(st);
    sheet = st.sheet;
  }
  const cls = 'spr-' + kinds.size;
  sheet.insertRule('.' + cls + '{background-image:url("data:image/svg+xml,' + encodeURIComponent(svg) + '")}', sheet.cssRules.length);
  t = document.createElement('div');
  t.className = 'icon';
  const pic = document.createElement('i');
  pic.className = 'ico ' + cls;
  const lbl = document.createElement('div');
  const span = document.createElement('span');
  span.className = 'lbl';
  lbl.appendChild(span);
  t.appendChild(pic);
  t.appendChild(lbl);
  kinds.set(svg, t);
  return t;
}

/* A name wraps on as many lines as it needs, so it always fits: a zero-width space gives the line a place to break at each word of a
   CamelCaseName and after a dot, dash or underscore (it is never read back: the icon carries its real name in data-name). */
export const breakable = name => String(name).replace(/([a-z0-9])([A-Z])/g, '$1\u200b$2').replace(/([._-])(?=[^._-])/g, '$1\u200b');

/* a finished icon for { name, type, app, look, label }: `label` is what is written under it when that is not its name (the bin that has become a dumpster) */
export function iconEl(item) {
  const el = template(item.type, item.app, item.look).cloneNode(true);
  el.dataset.name = item.name;
  el.lastChild.firstChild.textContent = breakable(item.label || item.name);
  return el;
}
