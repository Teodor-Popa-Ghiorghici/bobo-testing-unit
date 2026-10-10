/* THE TASKBAR, beyond the window manager's buttons (kernel/wm.js makes a button for every window: a picture and a name). With a dozen windows open the names were cut to two letters and
   nothing told one from another; now every button wears its app's own picture, shrinks evenly as more come, and when it is too narrow for a name shows the picture alone (theme.css:
   `.tbtn` is a container and `.tl` its name). The rest is what a taskbar is expected to do and this one did not:
     - a right click on a button: RESTORE or MINIMISE, FULLSCREEN, CLOSE;
     - a middle click on a button closes the window (through the same close the X uses, so the app is unmounted);
     - SHOW THE DESKTOP, a strip at the right-hand end: puts every window away, and a second press brings back exactly the ones it put away.
   Pure choices (which sprite, what a menu lists, what show-desktop does) are in kernel/taskbar_model.js, held by scripts/check-taskbar.mjs. */
import { openWins } from './wm.js';
import { spriteFor } from './icons_dom.js';
import { showMenu } from './menus.js';
import { spriteKind, menuFor, deskPlan } from './taskbar_model.js';

const tasks = () => document.getElementById('tasks');
const recOf = el => { const b = el && el.closest && el.closest('.tbtn'); return b ? openWins.find(r => r.btn === b) || null : null; };
const real = () => openWins.filter(r => !r.palette);

/* every button gets the picture of its app, once the app is known (a window is tagged after it is made) */
function decorate() {
  real().forEach(r => {
    const ico = r.btn.querySelector('.tico'); if (!ico) return;
    const key = r.appId || '?';
    if (ico.dataset.k === key) return;
    ico.dataset.k = key;
    const [type, app] = spriteKind(r.appId);
    ico.style.backgroundImage = 'url("data:image/svg+xml,' + encodeURIComponent(spriteFor(type, app)) + '")';
    ico.classList.add('has');
  });
}

function menu(ev, rec) {
  const hidden = rec.win.classList.contains('hidden'), active = rec.btn.classList.contains('active');
  const items = menuFor({ hidden, active }).map(it => it.sep ? it : {
    label: it.label,
    run: () => ({ restore: () => rec.restore(), minimize: () => rec.minimize(), full: () => { rec.unminimize(); rec.restore(); if (rec.toggleFull) rec.toggleFull(); }, close: () => rec.close && rec.close() })[it.act]()
  });
  showMenu(document.getElementById('ctxmenu'), ev.clientX, ev.clientY, items);
}

let stash = [];
function showDesktop() {
  const plan = deskPlan(real().map(r => ({ rec: r, hidden: r.win.classList.contains('hidden') })), stash);
  stash = plan.stash;
  plan.minimize.forEach(r => r.minimize());
  plan.restore.forEach(r => r.unminimize());
}

function mount() {
  const bar = document.getElementById('taskbar'), t = tasks();
  if (!bar || !t || document.getElementById('showdesk')) return;
  const sd = document.createElement('div'); sd.id = 'showdesk'; sd.title = 'SHOW THE DESKTOP (PUT EVERY WINDOW AWAY; AGAIN, BRING THEM BACK)'; sd.setAttribute('role', 'button'); sd.setAttribute('aria-label', 'Show the desktop');
  sd.addEventListener('mousedown', ev => { ev.stopPropagation(); if (window.Snd && window.Snd.click) window.Snd.click(); showDesktop(); });
  bar.appendChild(sd);
  t.addEventListener('contextmenu', ev => { const r = recOf(ev.target); if (!r) return; ev.preventDefault(); ev.stopPropagation(); menu(ev, r); });
  t.addEventListener('mousedown', ev => { if (ev.button === 1 && recOf(ev.target)) ev.preventDefault(); });          /* no auto-scroll cursor on a middle click */
  t.addEventListener('auxclick', ev => { if (ev.button !== 1) return; const r = recOf(ev.target); if (r && r.close) { ev.preventDefault(); r.close(); } });
}

window.addEventListener('wins-changed', decorate);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
export const Taskbar = { decorate, showDesktop };
window.Taskbar = Taskbar;
