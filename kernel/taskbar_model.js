/* THE TASKBAR'S CHOICES, as plain data (kernel/taskbar.js is the element): which picture a window's button wears, what its right-click menu lists, and what SHOW THE DESKTOP does. Pure, so Node holds
   it (scripts/check-taskbar.mjs). */

/* a window's picture: apps that are a kind of file wear that file's, the rest their own (kernel/icons_dom.js spriteFor(type, app)) */
const KIND = { folder: ['folder'], drawings: ['folder'], editor: ['code'], viewer: ['image'], terminal: ['terminal'], trash: ['bin'] };
export const spriteKind = appId => KIND[appId] || ['app', appId || ''];

/* what a right click on a button offers, from how the window stands */
export function menuFor(st) {
  const out = [];
  if (st.hidden) out.push({ label: 'RESTORE', act: 'restore' });
  else if (st.active) out.push({ label: 'MINIMISE', act: 'minimize' });
  else out.push({ label: 'BRING TO FRONT', act: 'restore' }, { label: 'MINIMISE', act: 'minimize' });
  out.push({ label: 'FULLSCREEN', act: 'full' }, { sep: true }, { label: 'CLOSE', act: 'close' });
  return out;
}

/* SHOW THE DESKTOP. `wins` are { rec, hidden }; `stash` what the last press put away (records). If anything is showing, put all of it away and remember it;
   if nothing is showing and something was put away, bring back those that are still open (in the order they were). Returns what to do and the new stash. */
export function deskPlan(wins, stash) {
  const showing = wins.filter(w => !w.hidden).map(w => w.rec);
  if (showing.length) return { minimize: showing, restore: [], stash: showing };
  const open = new Set(wins.map(w => w.rec));
  return { minimize: [], restore: (stash || []).filter(r => open.has(r)), stash: [] };
}
