import { fs as vfs } from './vfs.js';
import { openWindow, toast } from './wm.js';
import { showMenu, hideMenus } from './menus.js';
import { wireDrop, wirePickers, importFiles } from './importer.js';
import { applyWallpaper, clearWallpaper, hasWallpaper } from './wallpaper.js';
import { Dnd } from './dnd.js';
import { Active, wireActive, openItem, deletePaths, newFolderPrompt, restoreSystemFiles } from './fileops.js';
import { iconEl, spriteFor } from './icons_dom.js';
import { layout, slotOf, gridOf, cellOf, cellPos, nearestFree } from './desk_grid.js';
import { itemMenu, spaceMenu } from './filemenus.js';
import { wireMenubar } from './menubar.js';
import { joinPath, baseName, dirOf, TRASH } from './vfs_ops.js';
import { BinLook } from './bin_look.js';

export { showMenu, hideMenus } from './menus.js';
export { pickUpload, wireDrop } from './importer.js';
export { newFolderPrompt } from './fileops.js';
export { spriteFor };

const ICON_POS_KEY = 'templeos.icons.v1';

let iconPos = {};
let lastList = [];                /* the most recent desktop item list, name -> item lookups */
let arrivals = [];                /* where things dragged in from a window should land */
const iconEls = new Map();        /* name -> the element on the desk, kept from one drawing to the next */

function loadIconPos() {
  try { iconPos = JSON.parse(localStorage.getItem(ICON_POS_KEY)) || {}; }
  catch (e) { iconPos = {}; }
  /* DungeonSweeper was Sweeper: it keeps its place on the desk (kernel/vfs.js carries the icon itself) */
  /* once: a desk that is still the old single column down the left (nobody moved anything) is laid out in zones instead */
  try {
    if (!localStorage.getItem('templeos.deskzones.v1')) {
      localStorage.setItem('templeos.deskzones.v1', '1');
      const ps = Object.values(iconPos);
      if (ps.length && ps.every(p => p.x <= 8 + 3 * 84)) iconPos = {};
    }
  } catch (e) {}
  if (iconPos.Sweeper && !iconPos.DungeonSweeper) { iconPos.DungeonSweeper = iconPos.Sweeper; delete iconPos.Sweeper; }
}
function saveIconPos() {
  try { localStorage.setItem(ICON_POS_KEY, JSON.stringify(iconPos)); } catch (e) {}
}
const deskDims = () => {
  const desk = document.getElementById('desktop');
  return { w: (desk && desk.clientWidth) || 640, h: (desk && (desk.clientHeight || desk.offsetHeight)) || 600 };
};
const iconSlot = i => slotOf(i, deskDims().h);

/* find the nearest free cell to where an icon wants to land, spiralling
   outward until one is clear of every OTHER icon on the desk */
function freeCell(wantX, wantY, excludeNames) {
  const { w, h } = deskDims(), { cols, rows } = gridOf(w, h);
  const taken = new Set();
  Object.keys(iconPos).forEach(name => {
    if (excludeNames.has(name)) return;
    const c = cellOf(iconPos[name].x, iconPos[name].y);
    taken.add(c.c + ',' + c.r);
  });
  const want = cellOf(wantX, wantY);
  const c0 = Math.max(0, Math.min(cols - 1, want.c)), r0 = Math.max(0, Math.min(rows - 1, want.r));
  const hit = nearestFree(taken, c0, r0, cols, rows);
  return hit ? cellPos(hit.c, hit.r) : cellPos(c0, r0);
}

/* ---- what is selected, as the file commands want it ------------------------- */
const iconsBox = () => document.getElementById('icons');
const deskIcons = () => Array.prototype.slice.call(document.querySelectorAll('#icons .icon'));
const clearIconSel = () => document.querySelectorAll('#icons .icon.sel').forEach(n => n.classList.remove('sel'));
const selectedIcons = () => Array.prototype.slice.call(document.querySelectorAll('#icons .icon.sel'));
const itemOf = name => {
  const it = lastList.find(x => x.name === name);
  return it ? Object.assign({}, it, it.vfs ? { path: joinPath('::', name) } : {}) : null;
};
const deskEnv = {
  dir: '::',
  sel() { return selectedIcons().map(el => itemOf(el.dataset.name)).filter(Boolean); },
  items() { return this.sel().filter(i => i.path); },
  selectAll() { deskIcons().forEach(n => n.classList.add('sel')); },
  open(it) { openItem('::', it); }
};

export async function initDesktop() {
  const desk = document.getElementById('desktop');
  loadIconPos();
  desk.dataset.drop = '::';
  wireMenubar({ arrange: arrangeIcons, emptyBin });
  wirePickers();
  wireMarquee(desk);
  wireDrop(desk, () => '::');
  wireIcons(iconsBox());
  wireDeskContextMenu(desk);
  wireActive(deskEnv);
  window.addEventListener('vfs-changed', ev => {
    const dir = ev.detail && ev.detail.dir;
    if (dir === '::' || (dir && dir.indexOf(TRASH) === 0)) refreshIcons();
  });
  /* a delete reel (kernel/fileops.js) takes its icons off the desk a beat at a time: just those elements, nothing is
     listed or laid out again until the reel announces that it is done */
  window.addEventListener('vfs-reel', ev => {
    ((ev.detail && ev.detail.paths) || []).forEach(p => {
      if (dirOf(p) !== '::') return;
      const name = baseName(p), rec = iconEls.get(name);
      if (rec) { rec.el.remove(); iconEls.delete(name); }
    });
  });
  applyWallpaper();
  await refreshIcons();
}

/* right-click on bare desktop, not on an icon */
function wireDeskContextMenu(desk) {
  desk.addEventListener('contextmenu', ev => {
    /* a window owns its own right-clicks: if the app did nothing with this
       one, nothing happens, rather than the desktop's menu popping up on top
       of whatever was being clicked */
    if (ev.target.closest && ev.target.closest('.win')) { ev.preventDefault(); return; }
    if (ev.target.closest && ev.target.closest('.icon')) return;
    ev.preventDefault();
    clearIconSel();
    const items = spaceMenu(deskEnv);
    items.push({ sep: true });
    items.push({ label: 'ARRANGE ICONS', run: () => arrangeIcons() });
    if (hasWallpaper()) items.push({ label: 'CLEAR BACKGROUND', run: () => clearWallpaper() });
    items.push({ sep: true });
    items.push({ label: 'RESTORE SYSTEM FILES', run: () => restoreSystemFiles() });
    items.push({ label: 'DISPLAY SETTINGS...', run: () => openWindow('display') });
    items.push({ label: "CRAZY DAVE'S SHOP...", run: () => openWindow('shop') });
    items.push({ label: 'TROPHIES...', run: () => openWindow('trophies') });
    items.push({ label: 'ABOUT THIS MACHINE', run: () => openWindow('about') });
    showMenu(document.getElementById('ctxmenu'), ev.clientX, ev.clientY, items);
  });
}

/* put every icon back on the grid, left edge first, top to bottom */
/* what lives on the desk without being an icon (the cheese, kernel/cheese.js) needs to know which cells the icons have: the grid, and the cells taken, as "column,row" */
export function deskIconCells() {
  const { w, h } = deskDims(), g = gridOf(w, h), taken = new Set();
  iconEls.forEach(rec => { if (rec.x != null) { const c = cellOf(rec.x, rec.y); taken.add(c.c + ',' + c.r); } });
  return { cols: g.cols, rows: g.rows, taken };
}

/* ---- what the desktop's elephant may do to the icons (kernel/pet.js) ---------------------------------------------------
   He can see where each one is, and move one to the nearest free cell to where he pushed it. The move slides (the .petmoved
   class carries the transition) and is remembered like any other: put somewhere by hand, it stays there. */
export function petIcons() {
  return Array.from(iconEls.entries()).filter(([, rec]) => rec.x != null && !rec.el.classList.contains('dragging')).map(([name, rec]) => ({ name, x: rec.x, y: rec.y }));
}
export function petMoveIcon(name, wantX, wantY) {
  const rec = iconEls.get(name);
  if (!rec || rec.x == null) return null;
  const from = { x: rec.x, y: rec.y }, to = freeCell(wantX, wantY, new Set([name]));
  if (to.x === from.x && to.y === from.y) return null;
  iconPos[name] = to; rec.x = to.x; rec.y = to.y;
  rec.el.classList.add('petmoved');
  rec.el.style.left = to.x + 'px'; rec.el.style.top = to.y + 'px';
  setTimeout(() => rec.el.classList.remove('petmoved'), 700);
  saveIconPos();
  return { from, to };
}

export function arrangeIcons() {
  iconPos = {};
  const dims = deskDims(), els = deskIcons();
  const spots = layout(els.map(el => itemOf(el.dataset.name) || { name: el.dataset.name }), {}, [], dims);
  els.forEach(el => {
    const p = spots.get(el.dataset.name);
    el.style.left = p.x + 'px';
    el.style.top = p.y + 'px';
    iconPos[el.dataset.name] = p;
  });
  saveIconPos();
  if (window.Snd) window.Snd.save();
  toast('ICONS ARRANGED.');
}

/* things dragged onto the desktop from a window land where they were dropped */
export function expectArrivals(clientX, clientY, n) {
  const r = document.getElementById('desktop').getBoundingClientRect();
  arrivals = [];
  for (let i = 0; i < n; i++) arrivals.push({ x: clientX - r.left - 40 + i * 6, y: clientY - r.top - 30 + i * 6 });
  setTimeout(() => { arrivals = []; }, 4000);
}

/* the bin and the dumpster are the same icon in two looks: redrawn when it is changed, or earned */
window.addEventListener('binlook-changed', () => refreshIcons());

let refreshing = false, again = false;
export async function refreshIcons() {
  if (refreshing) { again = true; return; }
  refreshing = true;
  try { await buildIcons(); } finally {
    refreshing = false;
    if (again) { again = false; refreshIcons(); }
  }
}

/* The desk is drawn from what changed, not from nothing: an icon whose name and kind are the same keeps its
   element (and its selection), a new one is made, a gone one is dropped, and only what moved is restyled. With
   two hundred icons the whole of a redraw is now a listing, one pass of arithmetic and a handful of elements. */
async function buildIcons() {
  const box = iconsBox();
  if (!box) return;
  try {
    const [files, binFull] = await Promise.all([vfs.list('::'), vfs.hasAny(TRASH)]);
    const list = files.map(it => Object.assign(it, { vfs: true }));
    // the terminal and the bin are kernel primitives, not VFS nodes
    list.push({ name: 'TERMINAL', type: 'terminal' });
    list.push({ name: 'RecycleBin', type: binFull ? 'binfull' : 'bin', look: BinLook.dumpster() ? 'dumpster' : '', label: BinLook.dumpster() ? BinLook.label() : '' });
    lastList = list;

    // forget icons for anything that no longer exists, so their old cells don't stay "taken" forever
    const liveNames = new Set(list.map(it => it.name));
    Object.keys(iconPos).forEach(name => { if (!liveNames.has(name)) delete iconPos[name]; });

    const stored = {};
    list.forEach(it => { if (iconPos[it.name]) stored[it.name] = iconPos[it.name]; });
    const spots = layout(list, stored, arrivals, deskDims());
    arrivals = arrivals.slice(list.filter(it => !stored[it.name]).length);
    let moved = false;

    const order = list.map(item => {
      const sig = item.type + ':' + (item.app || '') + ':' + (item.look || '');
      let rec = iconEls.get(item.name);
      if (!rec || rec.sig !== sig) {
        rec = { el: iconEl(item), sig, x: null, y: null };
        if (item.type === 'folder') rec.el.dataset.drop = joinPath('::', item.name);
        if (item.type === 'bin' || item.type === 'binfull') rec.el.dataset.drop = '@trash';
        iconEls.set(item.name, rec);
      }
      const pos = spots.get(item.name);
      if (rec.x !== pos.x || rec.y !== pos.y) { rec.el.style.left = pos.x + 'px'; rec.el.style.top = pos.y + 'px'; rec.x = pos.x; rec.y = pos.y; }
      const old = iconPos[item.name];
      if (!old || old.x !== pos.x || old.y !== pos.y) moved = true;
      iconPos[item.name] = pos;
      return rec.el;
    });
    iconEls.forEach((rec, name) => { if (!liveNames.has(name)) iconEls.delete(name); });

    /* the box is touched as little as the change allows: icons that are gone come out one by one, new ones are
       appended (a paste adds to the end), and only an order that really changed is laid down again whole */
    const keep = new Set(order);
    Array.prototype.slice.call(box.children).forEach(n => { if (!keep.has(n)) n.remove(); });
    const cur = box.children;
    let k = 0;
    while (k < cur.length && k < order.length && cur[k] === order[k]) k++;
    if (k === cur.length) { if (k < order.length) box.append(...order.slice(k)); }
    else box.replaceChildren(...order);
    if (moved) saveIconPos();
  } catch (e) {
    console.error('Failed to load desktop icons', e);
  }
}

/* One set of listeners for every icon on the desk, on the box that holds them, instead of three or four on each
   of two hundred. They look at what was hit. */
function wireIcons(box) {
  const iconOf = ev => (ev.target && ev.target.closest) ? ev.target.closest('.icon') : null;
  box.addEventListener('dblclick', ev => {
    const el = iconOf(ev);
    if (!el) return;
    ev.stopPropagation();
    if (window.Snd) window.Snd.open();
    const it = itemOf(el.dataset.name);
    if (it) openItem('::', it);
  });
  box.addEventListener('contextmenu', ev => {
    const el = iconOf(ev);
    if (!el) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (!el.classList.contains('sel')) { clearIconSel(); el.classList.add('sel'); }
    Active.env = deskEnv;
    const it = itemOf(el.dataset.name);
    if (it) openIconContextMenu(ev, it);
  });
  box.addEventListener('pointerdown', ev => { const el = iconOf(ev); if (el) pressIcon(ev, el); });
  /* files dragged in from the user's own computer, onto a folder icon, go into that folder */
  const folderUnder = ev => { const el = iconOf(ev); return el && el.dataset.drop && el.dataset.drop.indexOf('::/') === 0 ? el : null; };
  const hasFiles = ev => ev.dataTransfer && Array.prototype.indexOf.call(ev.dataTransfer.types || [], 'Files') >= 0;
  box.addEventListener('dragover', ev => {
    const el = folderUnder(ev);
    if (!el || !hasFiles(ev)) return;
    ev.preventDefault(); ev.stopPropagation();
    ev.dataTransfer.dropEffect = 'copy';
    box.querySelectorAll('.icon.dropok').forEach(n => { if (n !== el) n.classList.remove('dropok'); });
    el.classList.add('dropok');
  });
  box.addEventListener('dragleave', ev => {
    const el = folderUnder(ev);
    if (el && !el.contains(ev.relatedTarget)) el.classList.remove('dropok');
  });
  box.addEventListener('drop', ev => {
    const el = folderUnder(ev);
    if (!el || !ev.dataTransfer || !ev.dataTransfer.files.length) return;
    ev.preventDefault(); ev.stopPropagation();
    if (window.Snd) window.Snd.drop();
    document.querySelectorAll('.dropok').forEach(n => n.classList.remove('dropok'));
    importFiles(ev.dataTransfer.files, null, el.dataset.drop);
  });
}

/* drag to move (alone or as part of a multi-selection), click to select,
   ctrl/shift-click to add to the selection. Let go over a folder and the
   things go into it; over the recycle bin and they are deleted. */
function pressIcon(ev, el) {
  if (ev.button !== 0) return;
  ev.stopPropagation();
  const add = ev.ctrlKey || ev.metaKey || ev.shiftKey;
  if (add) {
    el.classList.toggle('sel');
    if (window.Snd) window.Snd.select();
  } else if (!el.classList.contains('sel')) {
    clearIconSel();
    el.classList.add('sel');
    if (window.Snd) window.Snd.select();
  }
  Active.env = deskEnv;

  const desk = document.getElementById('desktop');
  const sx = ev.clientX, sy = ev.clientY;
  /* every measurement the drag needs is taken now, once: reading a size in the middle of moving two hundred
     icons makes the browser lay the whole desk out again for each one */
  const dw = desk.clientWidth, dh = desk.clientHeight;
  const group = selectedIcons().map(n => ({ n, x: n.offsetLeft, y: n.offsetTop, w: n.offsetWidth, h: n.offsetHeight }));
  const files = deskEnv.items();

  const snap = () => {
    const names = new Set(group.map(s => s.n.dataset.name));
    const { cols, rows } = gridOf(dw, dh), taken = new Set();
    Object.keys(iconPos).forEach(name => {
      if (names.has(name)) return;
      const c = cellOf(iconPos[name].x, iconPos[name].y);
      taken.add(c.c + ',' + c.r);
    });
    group.forEach(s => {
      s.n.classList.remove('dragging');
      const want = cellOf(s.n.offsetLeft, s.n.offsetTop);
      const c0 = Math.max(0, Math.min(cols - 1, want.c)), r0 = Math.max(0, Math.min(rows - 1, want.r));
      const hit = nearestFree(taken, c0, r0, cols, rows) || { c: c0, r: r0 };
      taken.add(hit.c + ',' + hit.r);          /* this one has landed; the rest must avoid it too */
      const p = cellPos(hit.c, hit.r);
      s.n.style.left = p.x + 'px';
      s.n.style.top = p.y + 'px';
      iconPos[s.n.dataset.name] = p;
      const rec = iconEls.get(s.n.dataset.name);
      if (rec) { rec.x = p.x; rec.y = p.y; }
    });
    saveIconPos();
    if (window.Snd) window.Snd.drop();
  };
  const home = () => group.forEach(s => {
    s.n.classList.remove('dragging');
    s.n.style.left = s.x + 'px'; s.n.style.top = s.y + 'px';
  });

  Dnd.begin(ev, {
    paths: files.map(f => f.path), live: true,
    accept: z => z.drop !== '::',
    onStart: () => group.forEach(s => s.n.classList.add('dragging')),
    onMove: e => {
      const dx = e.clientX - sx, dy = e.clientY - sy;
      group.forEach(s => {
        s.n.style.left = Math.max(0, Math.min(s.x + dx, dw - s.w)) + 'px';
        s.n.style.top = Math.max(0, Math.min(s.y + dy, dh - s.h)) + 'px';
      });
    },
    onDrop: async (zone, e, cancelled) => {
      if (cancelled) { home(); return; }
      if (!zone || zone.drop === '::' || !files.length) { snap(); return; }
      home();
      if (zone.drop === '@trash') { await deletePaths(files.map(f => f.path)); return; }
      const out = await (e.ctrlKey ? vfs.copyMany : vfs.moveMany)(files.map(f => f.path), zone.drop);
      const n = out.made.length;
      if (out.bad.length) { toast(out.bad[0]); if (window.Snd) window.Snd.err(); }
      if (n) { toast((e.ctrlKey ? 'COPIED ' : 'MOVED ') + n + ' ITEM' + (n === 1 ? '' : 'S') + ' TO ' + baseName(zone.drop) + '.'); if (window.Snd) window.Snd.drop(); }
    }
  });
}

/* rubber-band select on bare desktop */
function wireMarquee(desk) {
  const box = document.getElementById('marquee');
  desk.addEventListener('pointerdown', ev => {
    if (ev.button !== 0) return;
    if (ev.target.closest && (ev.target.closest('.icon') || ev.target.closest('.win'))) return;
    const add = ev.ctrlKey || ev.metaKey || ev.shiftKey;
    if (!add) clearIconSel();
    Active.env = deskEnv;

    const r = desk.getBoundingClientRect();
    const ox = ev.clientX - r.left, oy = ev.clientY - r.top;
    let live = false, rects = null;

    const move = e2 => {
      const cx = e2.clientX - r.left, cy = e2.clientY - r.top;
      if (!live && Math.abs(cx - ox) + Math.abs(cy - oy) < 4) return;
      live = true;
      if (box) {
        box.style.display = 'block';
        box.style.left = Math.min(ox, cx) + 'px';
        box.style.top = Math.min(oy, cy) + 'px';
        box.style.width = Math.abs(cx - ox) + 'px';
        box.style.height = Math.abs(cy - oy) + 'px';
      }
      /* the icons do not move while the band does: measure them once, then it is arithmetic */
      if (!rects) rects = deskIcons().map(n => ({ n, l: n.offsetLeft, t: n.offsetTop, w: n.offsetWidth, h: n.offsetHeight, on: n.classList.contains('sel') }));
      const mx0 = Math.min(ox, cx), mx1 = Math.max(ox, cx);
      const my0 = Math.min(oy, cy), my1 = Math.max(oy, cy);
      rects.forEach(q => {
        const hit = q.l < mx1 && q.l + q.w > mx0 && q.t < my1 && q.t + q.h > my0;
        if (hit !== q.on) { q.on = hit; q.n.classList.toggle('sel', hit); }
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (box) box.style.display = 'none';
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });
}

/* ---- right-click on an icon -------------------------------------------------- */
function openIconContextMenu(ev, item) {
  const menu = document.getElementById('ctxmenu');
  const sel = deskEnv.sel();
  if (item.type === 'terminal') {
    showMenu(menu, ev.clientX, ev.clientY, [{ label: 'OPEN', run: () => openItem('::', item) }]);
    return;
  }
  if (item.type === 'bin' || item.type === 'binfull') {
    showMenu(menu, ev.clientX, ev.clientY, [
      { label: 'OPEN', run: () => openItem('::', item) },
      { label: 'EMPTY THE ' + BinLook.name(), off: item.type === 'bin', run: () => emptyBin() }
    ].concat(BinLook.earned() ? [{ label: BinLook.switchLabel(), run: () => { BinLook.toggle(); if (window.Snd) window.Snd.click(); } }] : []));
    return;
  }
  const files = sel.filter(i => i.path);
  showMenu(menu, ev.clientX, ev.clientY, itemMenu({ dir: '::', items: files.length ? files : [itemOf(item.name)], selectAll: deskEnv.selectAll }));
}

async function emptyBin() {
  const n = (await vfs.trashList()).length;
  await vfs.trashEmpty();
  toast(n ? BinLook.name() + ' EMPTIED: ' + n + ' ITEM' + (n === 1 ? '' : 'S') + ' GONE FOR GOOD.' : 'THE ' + BinLook.name() + ' IS ALREADY EMPTY.');
  if (window.Snd && n) window.Snd.del();
}
export { emptyBin };

export { wireKonami } from './konami.js';
