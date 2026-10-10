/* WHERE A WINDOW WAS LEFT. Every window used to open at the next step of the cascade, the same size it was born with, so a game moved to the other side of the desk and made bigger was put back
   in the top left every time. Now an app that opens once (not a folder, a text, a picture or a terminal, which can be open several times) is put where it was last dragged to and made the size it was last
   made, if it can be resized. Kept per app (`templeos.winpos.v1`); a place that no longer fits the desk (a smaller window of the machine, a window that is now bigger than the desktop) is brought
   back inside it, always with the title bar in reach. Pure, so Node holds it (scripts/check-winplace.mjs). */
export const KEY = 'templeos.winpos.v1';
const MULTI = { placeholder: 1, folder: 1, terminal: 1, editor: 1, viewer: 1 };
export const MIN_W = 180, MIN_H = 90;

export const remembers = appId => !!appId && !MULTI[appId];

export function load(io) {
  try { const v = JSON.parse((io || localStorage).getItem(KEY)); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch (e) { return {}; }
}
export function write(map, io) { try { (io || localStorage).setItem(KEY, JSON.stringify(map)); return true; } catch (e) { return false; } }
export function remember(map, appId, p) {
  if (!remembers(appId) || !p || ![p.x, p.y, p.w, p.h].every(Number.isFinite)) return map;
  const out = Object.assign({}, map); out[appId] = { x: Math.round(p.x), y: Math.round(p.y), w: Math.round(p.w), h: Math.round(p.h) };
  return out;
}
export function forget(map, appId) { const out = Object.assign({}, map); if (appId) delete out[appId]; else return {}; return out; }

/* the saved place made to fit a desk of `desk.w` x `desk.h`: the size as saved (only if the window can be resized, and never bigger than the desk), the corner so that at least 60 pixels of the title bar are on
   the desk and the bar is not above its top. `base` is the size the window would have been given. Returns { x, y, w, h }, or null if nothing was saved. */
export function place(saved, desk, base, resizable) {
  if (!saved || ![saved.x, saved.y, saved.w, saved.h].every(Number.isFinite)) return null;
  const w = resizable ? Math.max(MIN_W, Math.min(saved.w, desk.w - 20)) : base.w, h = resizable ? Math.max(MIN_H, Math.min(saved.h, desk.h - 20)) : base.h;
  const x = Math.max(-(w - 60), Math.min(saved.x, desk.w - 60)), y = Math.max(0, Math.min(saved.y, desk.h - 24));
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}
