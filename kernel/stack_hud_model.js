/* THE STACK'S CONTROL ON THE DESKTOP, the parts that are only arithmetic (kernel/stack_hud.js is the element). While THE STACK is minimised its music goes on, and a small control stands in the
   bottom right corner of the glass with the things you reach for: volume, previous, play, next, repeat, shuffle and where you are in the disc. It has three sizes (S, M, L), is
   remembered, and can be dragged to another corner. Pure, so Node holds it (scripts/check-stackhud.mjs). */
export const KEY = 'templeos.stackhud.v1';
export const SIZES = ['s', 'm', 'l'];
/* the size of the box in glass pixels at 100 % */
export const BOX = { s: { w: 318, h: 30 }, m: { w: 340, h: 122 }, l: { w: 440, h: 156 } };
export const MARGIN = 8, TASKBAR = 25;
export const nextSize = s => SIZES.indexOf(s) < 0 ? 'm' : SIZES[(SIZES.indexOf(s) + 1) % SIZES.length];
export const sizeName = s => ({ s: 'SMALL', m: 'MEDIUM', l: 'LARGE' })[s] || 'MEDIUM';

export function load(io) {
  let v = null;
  try { v = JSON.parse((io || localStorage).getItem(KEY)); } catch (e) { /* none yet */ }
  v = v && typeof v === 'object' ? v : {};
  return { size: SIZES.indexOf(v.size) >= 0 ? v.size : 'm', right: Number.isFinite(v.right) ? v.right : MARGIN, bottom: Number.isFinite(v.bottom) ? v.bottom : TASKBAR + MARGIN };
}
export function save(v, io) { try { (io || localStorage).setItem(KEY, JSON.stringify({ size: v.size, right: v.right, bottom: v.bottom })); return true; } catch (e) { return false; } }

/* where it can stand: all of it on the glass, above the taskbar, never under the menu bar (`top` is how much is taken at the top) */
export function clampPos(pos, size, shell, top) {
  const b = BOX[size] || BOX.m, sh = shell || { w: 1000, h: 700 }, t = top == null ? 24 : top;
  return {
    right: Math.max(0, Math.min(sh.w - b.w, Math.round(pos.right))),
    bottom: Math.max(TASKBAR, Math.min(sh.h - b.h - t, Math.round(pos.bottom)))
  };
}

/* shown while a Stack window is open and put away; `wins` are { appId, minimised } */
export const wanted = wins => (wins || []).some(w => w.appId === 'hifi' && w.minimised);

export const mmss = s => { if (!isFinite(s) || s <= 0) return '0:00'; const m = Math.floor(s / 60), q = Math.floor(s % 60); return m + ':' + (q < 10 ? '0' : '') + q; };
export const RPT = ['REPEAT OFF', 'REPEAT ALL', 'REPEAT ONE'];
export const rptShort = n => ['RPT', 'RPT', 'RP1'][n | 0] || 'RPT';

/* a fraction of a bar from a pointer: x within a box [left, left + width] */
export const fracAt = (x, left, width) => width > 0 ? Math.max(0, Math.min(1, (x - left) / width)) : 0;
/* a media key's meaning, or null */
export const KEYS = { MediaPlayPause: 'toggle', MediaTrackNext: 'next', MediaTrackPrevious: 'prev', MediaStop: 'toggle' };
