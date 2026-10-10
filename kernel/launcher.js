/* window.Launcher: GO TO, the box on the glass that Ctrl+Space opens. Type a few letters of a program, a window that is open, a file or a thing to do; Up and Down choose, Enter does it, Escape puts it away.
   It reaches the thirty-odd programs by name, switches to a window that is open (putting back one that is put away), opens a file from the desk or from any folder under it, and does what the menus do
   (show the desktop, restore the system files, the readability veil, arrange the icons, forget where the windows were left). What was used lately is offered first. Its brains are
   kernel/launcher_model.js (held by scripts/check-launcher.mjs); this file is the element and what each choice does. */
import { openWindow, openWins, forgetPlaces, toast } from './wm.js';
import { buildItems, rank, load, save, remember } from './launcher_model.js';
import { spriteFor } from './icons_dom.js';
import { spriteKind } from './taskbar_model.js';
import { fs } from './vfs.js';
import { openItem, restoreSystemFiles } from './fileops.js';
import { DISP, applyDisplay } from './hardware.js';

const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
let root = null, input = null, list = null, foot = null, items = [], shown = [], at = 0, files = [], filesFor = 0, back = null, book = load();

const machineOn = () => { const s = document.getElementById('screen'), sh = document.getElementById('shell'); return !!(s && sh && !s.classList.contains('off') && sh.offsetWidth > 0); };
const img = svg => 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
const sprite = it => {
  if (it.kind === 'window' || it.kind === 'app') { const [t, a] = spriteKind(it.kind === 'window' ? it.appId : it.app); return spriteFor(t, a); }
  if (it.kind === 'file') return spriteFor(it.file.type || 'text', it.file.app);
  return null;
};

/* the open windows, front first (a palette is not a window of its own) */
function winList() {
  return openWins.filter(r => !r.palette).slice().sort((a, b) => (+b.win.style.zIndex || 0) - (+a.win.style.zIndex || 0))
    .map(r => ({ key: r.id, title: (r.win.querySelector('.titlebar .t') || {}).textContent || r.title, appId: r.appId, hidden: r.win.classList.contains('hidden'), rec: r }));
}

/* the files under the desk, a few folders deep and a few hundred long: what the box can find by name. Found in the background; the list is redone as they arrive. */
async function walk(stamp) {
  const out = [], queue = [['::', 0]];
  while (queue.length && out.length < 400 && stamp === filesFor) {
    const [dir, depth] = queue.shift();
    let es = []; try { es = await fs.list(dir); } catch (e) { es = []; }
    for (const e of es) {
      const path = e.path || (dir === '::' ? '::/' : dir + '/') + e.name;
      if ((e.type === 'app' && !e.args) || e.type === 'terminal' || e.type === 'bin' || e.type === 'binfull') continue;          /* a shortcut to a program: the program is listed already */
      out.push({ name: e.name, path, type: e.type, app: e.app, args: e.args });
      if (e.type === 'folder' && depth < 3) queue.push([path, depth + 1]);
    }
    if (stamp === filesFor) { files = out.slice(); if (root) refresh(); }
  }
}

function refresh() {
  items = buildItems(winList(), files);
  shown = rank(items, input.value, book, 9);
  if (at >= shown.length) at = Math.max(0, shown.length - 1);
  list.textContent = '';
  if (!shown.length) { list.appendChild(el('div', 'lnch-none', 'NOTHING CALLED THAT. TRY A PART OF A NAME: MAG, NOTE, STACK, BIN, RESTORE.')); }
  shown.forEach((it, i) => {
    const r = el('div', 'lnch-row' + (i === at ? ' sel' : '') + (it.kind === 'window' && it.hint === 'PUT AWAY' ? ' away' : '')); r.id = 'lnch-r' + i; r.setAttribute('role', 'option'); r.setAttribute('aria-selected', i === at ? 'true' : 'false');
    const ic = el('i', 'lnch-ico' + (it.kind === 'action' ? ' do' : '')); const sp = sprite(it); if (sp) ic.style.backgroundImage = img(sp); else ic.textContent = '›';
    r.appendChild(ic); r.appendChild(el('span', 'lnch-nm', it.name));
    r.appendChild(el('span', 'lnch-kd k-' + it.kind, it.kind === 'file' ? it.hint : it.kind === 'window' ? (it.hint === 'PUT AWAY' ? 'WINDOW · PUT AWAY' : 'WINDOW') : it.hint));
    r.addEventListener('mousemove', () => { if (at !== i) { at = i; mark(); } });
    r.addEventListener('mousedown', ev => { ev.preventDefault(); ev.stopPropagation(); at = i; run(it); });
    list.appendChild(r);
  });
  input.setAttribute('aria-activedescendant', shown.length ? 'lnch-r' + at : '');
}
function mark() {
  [...list.children].forEach((r, i) => { r.classList.toggle('sel', i === at); r.setAttribute('aria-selected', i === at ? 'true' : 'false'); });
  const r = list.children[at]; if (r && r.scrollIntoView) r.scrollIntoView({ block: 'nearest' });
  input.setAttribute('aria-activedescendant', shown.length ? 'lnch-r' + at : '');
}

const ACT = {
  'show-desktop': () => window.Taskbar && window.Taskbar.showDesktop(),
  welcome: () => import('./welcome.js').then(m => m.Welcome.open()).catch(console.error),
  restore: () => restoreSystemFiles(),
  readable: () => { DISP.read = !DISP.read; applyDisplay(); toast('READABILITY ' + (DISP.read ? 'ON' : 'OFF') + '.'); },
  arrange: () => import('./desktop.js').then(m => m.arrangeIcons()).catch(console.error),
  'forget-places': () => { forgetPlaces(); toast('EVERY WINDOW WILL OPEN WHERE IT STARTS NEXT TIME.'); },
  help: () => import('./help.js').then(m => m.openHelp('start')).catch(console.error),
  keys: () => import('./help.js').then(m => m.openHelp('keys')).catch(console.error)
};

function run(it) {
  close();
  book = remember(book, it.id); save(book);
  if (window.Snd && window.Snd.select) window.Snd.select();
  if (it.kind === 'window') { const w = winList().find(x => x.key === it.ref); if (w) w.rec.restore(); }
  else if (it.kind === 'app') openWindow(it.app, it.args || {}).catch(console.error);
  else if (it.kind === 'file') openItem(it.file.path.replace(/\/[^/]*$/, '') || '::', it.file);
  else if (it.kind === 'action' && ACT[it.act]) ACT[it.act]();
}

function build() {
  root = el('div', 'lnch'); root.id = 'launcher';
  const box = el('div', 'lnch-box'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Go to');
  const row = el('div', 'lnch-in'); row.appendChild(el('span', 'lnch-pr', 'GO TO'));
  input = el('input', 'lnch-q'); input.type = 'text'; input.spellcheck = false; input.autocomplete = 'off'; input.placeholder = 'A PROGRAM, A WINDOW, A FILE, A THING TO DO'; input.setAttribute('role', 'combobox'); input.setAttribute('aria-expanded', 'true'); input.setAttribute('aria-controls', 'lnch-list');
  row.appendChild(input);
  list = el('div', 'lnch-list'); list.id = 'lnch-list'; list.setAttribute('role', 'listbox');
  foot = el('div', 'lnch-foot', '↑ ↓ CHOOSE   ENTER OPEN   ESC AWAY   CTRL+SPACE AGAIN CLOSES');
  box.append(row, list, foot); root.appendChild(box);
  root.addEventListener('mousedown', ev => { if (ev.target === root) close(); });
  input.addEventListener('input', () => { at = 0; refresh(); });
  input.addEventListener('keydown', ev => {
    ev.stopPropagation();
    if (ev.isComposing || ev.keyCode === 229) return;
    const k = ev.key;
    if (k === 'Escape') { ev.preventDefault(); close(); }
    else if (k === 'ArrowDown' || (k === 'Tab' && !ev.shiftKey)) { ev.preventDefault(); if (shown.length) { at = (at + 1) % shown.length; mark(); } }
    else if (k === 'ArrowUp' || (k === 'Tab' && ev.shiftKey)) { ev.preventDefault(); if (shown.length) { at = (at - 1 + shown.length) % shown.length; mark(); } }
    else if (k === 'Enter') { ev.preventDefault(); if (shown[at]) run(shown[at]); }
    else if (ev.ctrlKey && ev.code === 'Space') { ev.preventDefault(); close(); }
  });
  input.addEventListener('keyup', ev => ev.stopPropagation());
}

function open() {
  if (root && root.parentNode) { input.focus(); return; }
  const sh = document.getElementById('shell'); if (!sh) return;
  if (!root) build();
  back = document.activeElement;
  input.value = ''; at = 0;
  sh.appendChild(root);
  filesFor++; walk(filesFor);
  refresh();
  input.focus();
}
function close() {
  if (!root || !root.parentNode) return;
  filesFor++;                                                    /* a walk still going stops */
  root.remove();
  if (back && back.focus && document.body.contains(back)) { try { back.focus(); } catch (e) { /* gone */ } }
  back = null;
}
const toggle = () => (root && root.parentNode ? close() : open());

document.addEventListener('keydown', ev => {
  if (ev.code !== 'Space' || !ev.ctrlKey || ev.altKey || ev.metaKey || ev.shiftKey || ev.isComposing || ev.repeat) return;
  if (!machineOn()) return;
  ev.preventDefault(); ev.stopPropagation();
  toggle();
}, true);

export const Launcher = { open, close, toggle, isOpen: () => !!(root && root.parentNode) };
window.Launcher = Launcher;
