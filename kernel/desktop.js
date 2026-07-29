import { Style } from './style.js';
import { fs as vfs } from './vfs.js';
import { openWindow, createWindow, toast, askName } from './wm.js';
import { SPRITES } from './sprites.js';
import { hcLex, hcParse, hcRun } from './holyc.js';
import { panic } from './panic.js';
import { Vault, VaultURL } from './vault.js';
import { crushImage, ditherVGA, UP } from './imaging.js';

const ICON_POS_KEY = 'templeos.icons.v1';
const WALL_KEY = 'templeos.wallpaper.v1';
const ICON_W = 84, ICON_H = 78;

let iconPos = {};
let wallpaper = null;             /* { src, mode } */
let lastList = [];                /* the most recent desktop item list, name -> type lookups */

function loadIconPos() {
  try { iconPos = JSON.parse(localStorage.getItem(ICON_POS_KEY)) || {}; }
  catch (e) { iconPos = {}; }
}
function saveIconPos() {
  try { localStorage.setItem(ICON_POS_KEY, JSON.stringify(iconPos)); } catch (e) {}
}

const APP_SPRITES = {
  hifi: 'disc', notes: 'notes', bottle: 'bottle', elephant: 'elephant',
  magen: 'magen', cook: 'flask', garden: 'garden', sweeper: 'sweeper',
  solitaire: 'solitaire', crayon: 'crayon', shop: 'shop', drawings: 'drawings',
  account: 'account'
};

function spriteFor(type, app) {
  if (type === 'folder')   return SPRITES.folder;
  if (type === 'image')    return SPRITES.image;
  if (type === 'video')    return SPRITES.video;
  if (type === 'terminal') return SPRITES.terminal;
  if (type === 'app')      return SPRITES[APP_SPRITES[app]] || SPRITES.app;
  if (type === 'doc')      return SPRITES.doc;
  if (type === 'code')     return SPRITES.code;
  return SPRITES.text;
}

function iconSlot(i) {
  const desk = document.getElementById('desktop');
  const h = (desk && (desk.clientHeight || desk.offsetHeight)) || 600;
  const rows = Math.max(1, Math.floor((h - 12) / ICON_H));
  return { x: 8 + Math.floor(i / rows) * ICON_W, y: 8 + (i % rows) * ICON_H };
}

/* the grid an icon actually lives on: whole cells from the same (8, 8)
   origin every layout function uses, so nothing can end up between them */
function cellOf(x, y) {
  return { c: Math.round((x - 8) / ICON_W), r: Math.round((y - 8) / ICON_H) };
}
function cellPos(c, r) {
  return { x: 8 + c * ICON_W, y: 8 + r * ICON_H };
}

/* find the nearest free cell to where an icon wants to land, spiralling
   outward until one is clear of every OTHER icon on the desk */
function freeCell(wantX, wantY, excludeNames) {
  const desk = document.getElementById('desktop');
  const dw = (desk && desk.clientWidth) || 640, dh = (desk && desk.clientHeight) || 480;
  const cols = Math.max(1, Math.floor((dw - 8) / ICON_W));
  const rows = Math.max(1, Math.floor((dh - 8) / ICON_H));
  const taken = new Set();
  Object.keys(iconPos).forEach(name => {
    if (excludeNames.has(name)) return;
    const p = iconPos[name];
    const cell = cellOf(p.x, p.y);
    taken.add(cell.c + ',' + cell.r);
  });
  const want = cellOf(wantX, wantY);
  const c0 = Math.max(0, Math.min(cols - 1, want.c));
  const r0 = Math.max(0, Math.min(rows - 1, want.r));
  for (let ring = 0; ring < cols + rows; ring++) {
    for (let dc = -ring; dc <= ring; dc++) {
      for (let dr = -ring; dr <= ring; dr++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== ring) continue;
        const c = c0 + dc, r = r0 + dr;
        if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
        if (taken.has(c + ',' + r)) continue;
        return cellPos(c, r);
      }
    }
  }
  return cellPos(c0, r0);
}

export async function initDesktop() {
  const desk = document.getElementById('desktop');
  loadIconPos();
  wireMenu();
  wireMarquee(desk);
  wireDrop(desk, () => '::');
  wireDeskContextMenu(desk);
  wireDeskKeys(desk);
  applyWallpaper();
  await refreshIcons();
}

/* right-click on bare desktop, not on an icon */
function wireDeskContextMenu(desk) {
  desk.addEventListener('contextmenu', ev => {
    if (ev.target.closest && ev.target.closest('.icon')) return;
    ev.preventDefault();
    const items = [
      { label: 'NEW FOLDER...', run: () => newFolderPrompt() },
      { label: 'UPLOAD IMAGES / VIDEO...', run: () => { uploadTarget = '::'; document.getElementById('pickimg').click(); } },
      { label: 'UPLOAD TEXT FILES...', run: () => { uploadTarget = '::'; document.getElementById('picktxt').click(); } },
      { sep: true },
      { label: 'ARRANGE ICONS', run: () => arrangeIcons() }
    ];
    if (wallpaper) items.push({ label: 'CLEAR BACKGROUND', run: () => clearWallpaper() });
    items.push({ sep: true });
    items.push({ label: 'DISPLAY SETTINGS...', run: () => openWindow('display') });
    items.push({ label: "CRAZY DAVE'S SHOP...", run: () => openWindow('shop') });
    items.push({ label: 'ABOUT THIS MACHINE', run: () => openWindow('about') });
    showMenu(document.getElementById('ctxmenu'), ev.clientX, ev.clientY, items);
  });
}

/* put every icon back on the grid, left edge first, top to bottom */
function arrangeIcons() {
  iconPos = {};
  deskIcons().forEach((el, i) => {
    const p = iconSlot(i);
    el.style.left = p.x + 'px';
    el.style.top = p.y + 'px';
    iconPos[el.dataset.name] = p;
  });
  saveIconPos();
  if (window.Snd) window.Snd.save();
  toast('ICONS ARRANGED.');
}

/* Delete/Backspace on the desktop removes the whole current selection */
function wireDeskKeys(desk) {
  document.addEventListener('keydown', ev => {
    if (ev.key !== 'Delete' && ev.key !== 'Backspace') return;
    if (ev.target && /input|textarea/i.test(ev.target.tagName)) return;
    const sel = selectedIcons();
    if (!sel.length) return;
    ev.preventDefault();
    deleteIcons(sel.map(el => el.dataset.name));
  });
}

/* a folder (or the bare desktop) accepts a file dropped straight from the
   user's own computer onto it */
export function wireDrop(el, getDir) {
  const hasFiles = ev =>
    ev.dataTransfer && Array.from(ev.dataTransfer.types || []).indexOf('Files') >= 0;

  el.addEventListener('dragover', ev => {
    if (!hasFiles(ev)) return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.dataTransfer.dropEffect = 'copy';
    el.classList.add('dropok');
  });
  el.addEventListener('dragleave', ev => {
    if (el.contains(ev.relatedTarget)) return;
    el.classList.remove('dropok');
  });
  el.addEventListener('drop', ev => {
    if (!ev.dataTransfer || !ev.dataTransfer.files.length) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (window.Snd) window.Snd.drop();
    el.classList.remove('dropok');
    document.querySelectorAll('.dropok').forEach(n => n.classList.remove('dropok'));
    importFiles(ev.dataTransfer.files, null, getDir());
  });
}

function deskIcons() {
  return Array.prototype.slice.call(document.querySelectorAll('#icons .icon'));
}
function clearIconSel() {
  deskIcons().forEach(n => n.classList.remove('sel'));
}
function selectedIcons() {
  return deskIcons().filter(n => n.classList.contains('sel'));
}

async function refreshIcons() {
  const iconsContainer = document.getElementById('icons');

  if (!iconsContainer) return;

  iconsContainer.innerHTML = '';

  try {
    const list = await vfs.list('::');

    // the terminal is a kernel primitive, not a VFS node
    list.push({ name: 'TERMINAL', type: 'terminal' });
    lastList = list;

    // forget icons for anything that no longer exists, so their old cells
    // don't stay "taken" forever
    const liveNames = new Set(list.map(it => it.name));
    Object.keys(iconPos).forEach(name => { if (!liveNames.has(name)) delete iconPos[name]; });

    list.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'icon';
      el.innerHTML = spriteFor(item.type, item.app);
      el.dataset.name = item.name;

      const lbl = document.createElement('div');
      const span = document.createElement('span');
      span.className = 'lbl';
      span.textContent = item.name;
      lbl.appendChild(span);
      el.appendChild(lbl);

      const want = iconPos[item.name] || iconSlot(i);
      const pos = freeCell(want.x, want.y, new Set([item.name]));
      el.style.left = pos.x + 'px';
      el.style.top = pos.y + 'px';
      iconPos[item.name] = pos;

      const openThis = () => {
        if (item.type === 'terminal') {
          openWindow('terminal').catch(console.error);
        } else if (item.type === 'folder') {
          openWindow('folder', { path: `::/${item.name}` }).catch(console.error);
        } else if (item.type === 'app') {
          if (item.app) openWindow(item.app).catch(console.error);
          else toast('NO SUCH APP: ' + item.name);
        } else {
          const app = ['code', 'doc', 'text'].includes(item.type) ? 'editor' : 'viewer';
          openWindow(app, { path: `::/${item.name}`, type: item.type }).catch(console.error);
        }
      };

      el.addEventListener('dblclick', (ev) => {
        ev.stopPropagation();
        if (window.Snd) window.Snd.open();
        openThis();
      });

      el.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (!el.classList.contains('sel')) {
          clearIconSel();
          el.classList.add('sel');
        }
        openIconContextMenu(ev, item);
      });

      wireDeskIcon(el, item, openThis);
      if (item.type === 'folder') wireDrop(el, () => `::/${item.name}`);

      iconsContainer.appendChild(el);
    });

    saveIconPos();

  } catch(e) {
    console.error("Failed to load desktop icons", e);
  }
}

/* drag to move (alone or as part of a multi-selection), click to select,
   ctrl/shift-click to add to the selection */
function wireDeskIcon(el, item, openThis) {
  el.addEventListener('pointerdown', ev => {
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

    const desk = document.getElementById('desktop');
    const sx = ev.clientX, sy = ev.clientY;
    const group = selectedIcons().map(n => ({ n, x: n.offsetLeft, y: n.offsetTop }));
    let moved = false;

    const move = e2 => {
      const dx = e2.clientX - sx, dy = e2.clientY - sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return;
      if (!moved) {
        moved = true;
        if (window.Snd) window.Snd.grab();
        group.forEach(s => s.n.classList.add('dragging'));
      }
      group.forEach(s => {
        s.n.style.left = Math.max(0, Math.min(s.x + dx, desk.clientWidth - s.n.offsetWidth)) + 'px';
        s.n.style.top = Math.max(0, Math.min(s.y + dy, desk.clientHeight - s.n.offsetHeight)) + 'px';
      });
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (!moved) return;
      const groupNames = new Set(group.map(s => s.n.dataset.name));
      group.forEach(s => {
        s.n.classList.remove('dragging');
        const p = freeCell(s.n.offsetLeft, s.n.offsetTop, groupNames);
        s.n.style.left = p.x + 'px';
        s.n.style.top = p.y + 'px';
        iconPos[s.n.dataset.name] = p;
        groupNames.delete(s.n.dataset.name);   /* this one has landed; the rest must avoid it too */
      });
      saveIconPos();
      if (window.Snd) window.Snd.drop();
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
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

    const r = desk.getBoundingClientRect();
    const ox = ev.clientX - r.left, oy = ev.clientY - r.top;
    let live = false;

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
      const mx0 = Math.min(ox, cx), mx1 = Math.max(ox, cx);
      const my0 = Math.min(oy, cy), my1 = Math.max(oy, cy);
      deskIcons().forEach(n => {
        const hit = n.offsetLeft < mx1 && n.offsetLeft + n.offsetWidth > mx0 &&
                    n.offsetTop < my1 && n.offsetTop + n.offsetHeight > my0;
        n.classList.toggle('sel', hit);
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

/* ---- right-click: open / upload / background / delete / compile -------- */
function openIconContextMenu(ev, item) {
  const items = [];
  if (item.type === 'folder') {
    items.push({ label: 'UPLOAD IMAGES HERE...', run: () => {
      uploadTarget = `::/${item.name}`;
      document.getElementById('pickimg').click();
    }});
  }
  if (item.type === 'image') {
    items.push({ label: 'SET AS BACKGROUND', run: () => setWallpaperFrom(item, 'fill') });
    items.push({ label: 'TILE AS BACKGROUND', run: () => setWallpaperFrom(item, 'tile') });
  }
  if (item.type === 'video') {
    items.push({ label: 'SET AS BACKGROUND', run: () => setWallpaperFrom(item, 'fill') });
  }
  if (['text', 'code', 'doc'].includes(item.type)) {
    items.push({ label: 'COMPILE', run: () => {
      window._lastTextPath = `::/${item.name}`;
      openCompile();
    }});
  }
  if (item.type === 'code') {
    items.push({ label: 'RUN IT', run: () => runFileHolyC(`::/${item.name}`) });
  }
  if (item.type !== 'terminal' && item.type !== 'app') {
    items.push({ sep: true });
    const sel = selectedIcons().map(el => el.dataset.name).filter(n => !isProtected(n));
    const bulk = sel.length > 1 && sel.includes(item.name);
    items.push({
      label: bulk ? 'DELETE ' + sel.length + ' ITEMS' : 'DELETE',
      run: () => deleteIcons(bulk ? sel : [item.name])
    });
  }
  if (!items.length) items.push({ label: 'NOTHING TO DO HERE', off: true });
  showMenu(document.getElementById('ctxmenu'), ev.clientX, ev.clientY, items);
}

/* apps and the terminal are shortcuts into the machine, not files on it --
   they never go in the trash, even when they're caught up in a bulk
   selection of things that ARE deletable */
function isProtected(name) {
  const item = lastList.find(it => it.name === name);
  return !!item && (item.type === 'app' || item.type === 'terminal');
}

async function deleteIcons(names) {
  const blocked = names.filter(isProtected);
  const goners = names.filter(n => !isProtected(n));
  for (const name of goners) {
    await vfs.remove(`::/${name}`);
    delete iconPos[name];
  }
  saveIconPos();
  if (goners.length) {
    toast(goners.length > 1 ? goners.length + ' ITEMS DELETED.' : goners[0] + ' DELETED.');
  }
  if (blocked.length) {
    toast((goners.length ? goners.length + ' ITEM(S) DELETED. ' : '') +
      blocked.length + ' APP(S) CANNOT BE DELETED.');
  }
  refreshIcons();
}

async function setWallpaperFrom(item, mode) {
  const file = await vfs.read(`::/${item.name}`);
  if (!file) { toast('COULD NOT READ THAT FILE.'); return; }
  const isVideo = file.type === 'video';
  const src = isVideo ? (file.vault ? await VaultURL.url(file.vault) : file.src) : file.src;
  if (!src) { toast('COULD NOT READ THAT FILE.'); return; }
  /* the wallpaper is stored by name + vault key, not the resolved blob URL,
     which would not survive a reload */
  wallpaper = isVideo
    ? { vault: file.vault, src: file.src, mode, kind: 'video' }
    : { src, mode, kind: 'image' };
  applyWallpaper();
  try { localStorage.setItem(WALL_KEY, JSON.stringify(wallpaper)); } catch (e) {}
  toast('BACKGROUND SET.');
}

function clearWallpaper() {
  wallpaper = null;
  /* the key has to be gone before applyWallpaper runs, or its localStorage
     fallback (for rehydrating on load) just reads the old value straight
     back in and undoes the clear */
  try { localStorage.removeItem(WALL_KEY); } catch (e) {}
  applyWallpaper();
  toast('BACKGROUND CLEARED.');
}

/* the desktop's video wallpaper is drawn onto a canvas, crushed to the same
   sixteen-colour palette every still image gets -- not a real <video>
   element sitting behind the icons, which would both look too HD next to
   everything else and hand the browser's own picture-in-picture/context
   menu to something that is supposed to be inert wallpaper */
const DeskVid = {
  raf: null, video: null, cv: null, last: 0,
  start(src, mode) {
    this.stop();
    const desk = document.getElementById('desktop');
    if (!desk) return;
    const cv = document.createElement('canvas');
    cv.id = 'deskvid';
    cv.style.position = 'absolute';
    cv.style.left = '0'; cv.style.top = '0';
    cv.style.width = '100%'; cv.style.height = '100%';
    cv.style.objectFit = mode === 'tile' ? 'none' : 'cover';
    cv.style.zIndex = '0';
    desk.insertBefore(cv, desk.firstChild);

    const v = document.createElement('video');
    v.src = src; v.loop = true; v.muted = true; v.playsInline = true;
    v.setAttribute('playsinline', '');
    this.cv = cv; this.video = v;

    let sized = false;
    const size = () => {
      const W = v.videoWidth || 320, H = v.videoHeight || 240;
      const s = Math.min(1, 220 / Math.max(W, H));
      cv.width = Math.max(2, Math.round(W * s));
      cv.height = Math.max(2, Math.round(H * s));
      sized = true;
    };
    v.addEventListener('loadedmetadata', () => { size(); v.play().catch(() => {}); });
    v.addEventListener('error', () => { toast('THAT VIDEO WILL NOT DECODE.'); this.stop(); });

    const loop = ts => {
      if (!this.cv || !document.body.contains(this.cv)) { this.stop(); return; }
      this.raf = requestAnimationFrame(loop);
      if (!sized && v.videoWidth) size();
      if (!sized || v.readyState < 2) return;
      if (ts - this.last < 100) return;    /* ten frames a second */
      this.last = ts;
      const o = cv.getContext('2d');
      if (!o) return;
      try {
        o.imageSmoothingEnabled = false;
        o.drawImage(v, 0, 0, cv.width, cv.height);
        if (UP.vga) ditherVGA(o, cv.width, cv.height);
      } catch (e) { /* a frame the crush choked on isn't worth stopping over */ }
    };
    this.raf = requestAnimationFrame(loop);
  },
  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    if (this.cv && this.cv.parentNode) this.cv.parentNode.removeChild(this.cv);
    if (this.video) { try { this.video.pause(); this.video.src = ''; } catch (e) {} }
    this.cv = this.video = null;
  }
};

function stopDeskVideo() { DeskVid.stop(); }
function startDeskVideo(src, mode) { DeskVid.start(src, mode); }

async function applyWallpaper() {
  const desk = document.getElementById('desktop');
  if (!desk) return;
  try {
    const raw = localStorage.getItem(WALL_KEY);
    if (raw && !wallpaper) wallpaper = JSON.parse(raw);
  } catch (e) {}
  if (!wallpaper) {
    desk.style.backgroundImage = '';
    stopDeskVideo();
    return;
  }
  if (wallpaper.kind === 'video') {
    desk.style.backgroundImage = '';
    /* a vault key means the blob URL from last session is stale; mint a
       fresh one rather than trusting the one we saved */
    const src = wallpaper.vault ? await VaultURL.url(wallpaper.vault) : wallpaper.src;
    if (!src) { stopDeskVideo(); return; }
    startDeskVideo(src, wallpaper.mode);
    return;
  }
  stopDeskVideo();
  desk.style.backgroundImage = 'url("' + wallpaper.src + '")';
  desk.style.backgroundRepeat = wallpaper.mode === 'tile' ? 'repeat' : 'no-repeat';
  desk.style.backgroundSize = wallpaper.mode === 'tile' ? 'auto' : 'cover';
}

/* menu labels are decorative; File, Compile, Tools and Help do something.
   Edit and Debug are left as decoration in the original too. */
export function showMenu(el, x, y, items) {
  if (!el) return;
  el.innerHTML = '';
  items.forEach(it => {
    if (it.sep) {
      const s = document.createElement('div');
      s.className = 'sep';
      el.appendChild(s);
      return;
    }
    const d = document.createElement('div');
    d.className = 'mi' + (it.off ? ' off' : '');
    d.textContent = it.label;
    if (!it.off) {
      d.addEventListener('mousedown', ev => {
        ev.stopPropagation();
        if (window.Snd) window.Snd.click();
        hideMenus();
        it.run();
      });
    } else {
      d.addEventListener('mousedown', ev => { ev.stopPropagation(); if (window.Snd) window.Snd.err(); });
    }
    el.appendChild(d);
  });
  if (window.Snd && window.Snd.menu) window.Snd.menu();
  el.style.display = 'block';
  el.style.left = '0px';
  el.style.top = '0px';
  el.style.left = Math.max(0, Math.min(x, window.innerWidth - el.offsetWidth - 4)) + 'px';
  el.style.top = Math.max(0, Math.min(y, window.innerHeight - el.offsetHeight - 4)) + 'px';
}

function hideMenus() {
  const fm = document.getElementById('filemenu');
  const cm = document.getElementById('ctxmenu');
  if (fm) fm.style.display = 'none';
  if (cm) cm.style.display = 'none';
}

let uploadTarget = '::';

function openFileMenu(anchor) {
  const r = anchor.getBoundingClientRect();
  const items = [
    { label: 'UPLOAD IMAGES / VIDEO -> ::/', run: () => { uploadTarget = '::'; document.getElementById('pickimg').click(); } },
    { label: 'UPLOAD TEXT FILES...  -> ::/', run: () => { uploadTarget = '::'; document.getElementById('picktxt').click(); } },
    { sep: true },
    { label: 'NEW FOLDER...', run: () => newFolderPrompt() },
    { sep: true },
    { label: 'VGA 16-COLOR IMPORT: ' + (UP.vga ? 'ON' : 'OFF'), run: () => {
        UP.vga = !UP.vga;
        toast('VGA 16-COLOR IMPORT ' + (UP.vga ? 'ON' : 'OFF') + '. AFFECTS NEW UPLOADS.');
      } },
    { label: 'ARRANGE ICONS', run: () => arrangeIcons() }
  ];
  if (wallpaper) items.push({ label: 'CLEAR BACKGROUND', run: () => clearWallpaper() });
  showMenu(document.getElementById('filemenu'), r.left, r.bottom, items);
}

function newFolderPrompt() {
  askName('NEW FOLDER', 'New Folder', name => {
    name = (name || '').trim();
    if (!name) return;
    vfs.write(`::/${name}/.keep`, { type: 'text', content: '' }).then(() => {
      toast('FOLDER CREATED: ' + name);
      refreshIcons();
    }).catch(() => toast('COULD NOT CREATE THE FOLDER.'));
  });
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
function readAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsText(file);
  });
}

/* crushed to the sixteen-colour palette and no bigger than 384px on the
   long edge, the same way every other import on this machine is: a
   full-quality photo would break the illusion the rest of the OS keeps */
function importImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const cv = crushImage(img, img.naturalWidth, img.naturalHeight);
        resolve(cv.toDataURL('image/png'));
      } catch (e) { reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('NOT AN IMAGE')); };
    img.src = url;
  });
}

/* video keeps its own bytes in the Vault (a blob, not a base64 string
   several times its own size) and the VFS record only carries the key */
async function importVideo(path, file) {
  const key = await Vault.put(file);
  await vfs.write(path, { type: 'video', vault: key, mime: file.type || 'video/mp4' });
}

async function importFiles(fileList, kind, dir) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  dir = dir || uploadTarget || '::';
  for (const f of files) {
    try {
      const isVideo = kind === 'media' ? f.type.startsWith('video') : /^video\//.test(f.type);
      const isImage = kind === 'media' ? !isVideo : /^image\//.test(f.type);
      if (isVideo) {
        await importVideo(`${dir}/${f.name}`, f);
      } else if (isImage) {
        const src = await importImage(f);
        await vfs.write(`${dir}/${f.name}`, { type: 'image', src });
      } else {
        const content = await readAsText(f);
        await vfs.write(`${dir}/${f.name}`, { type: 'text', content });
      }
    } catch (e) { console.error(e); }
  }
  toast(files.length + ' FILE(S) IMPORTED.');
  refreshIcons();
}

function commas(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

function compileNode(path, content, print) {
  const src = String(content || '');
  const lines = src.split('\n');
  const stmts = lines.filter(l => {
    const t = l.trim();
    return t.length && t.slice(0, 2) !== '//';
  }).length;
  const bytes = src.length;
  const base = 0x104000 + ((bytes * 7919) % 0x9000);
  const emitted = Math.max(16, Math.round(stmts * 11.3 + bytes * 0.4));
  const name = path.split('/').pop();

  print(['HOLYC JIT — ' + path, ''], 'l-dim');
  print(['  LEX     ' + lines.length + ' LINE(S), ' + commas(bytes) + ' BYTE(S)',
         '  PARSE   ' + stmts + ' STATEMENT(S)',
         '  EMIT    0x' + base.toString(16).toUpperCase().padStart(16, '0') +
           '   ' + commas(emitted) + ' BYTES'], 'l-ok');

  if (!/\.HC$/i.test(name)) {
    print(['  WARN    ' + name + ' IS NOT .HC. COMPILING IT ANYWAY.'], 'l-err');
  }
  if (!stmts) {
    print(['', '  ERROR   NOTHING TO COMPILE. THE FILE IS EMPTY.'], 'l-err');
    if (window.Snd) window.Snd.err();
    return;
  }
  print(['', 'COMPILES CLEAN. NO WARNINGS. NO LINKER.', 'NO INTERCESSOR.'], 'l-holy');
  if (window.Snd) window.Snd.bell();
}

async function openCompile() {
  const path = window._lastTextPath;
  if (!path) {
    toast('NOTHING TO COMPILE. OPEN A TEXT FILE FIRST.');
    if (window.Snd) window.Snd.err();
    return;
  }
  const file = await vfs.read(path);
  if (!file) {
    toast('NOTHING TO COMPILE. OPEN A TEXT FILE FIRST.');
    if (window.Snd) window.Snd.err();
    return;
  }
  createWindow({
    kind: 'terminal',
    title: 'COMPILE ' + path,
    w: 520, h: 260,
    build: body => {
      const term = document.createElement('div');
      term.className = 'term';
      const out = document.createElement('div');
      out.className = 'termout';
      term.appendChild(out);
      body.appendChild(term);
      const print = (rows, cls) => {
        rows.forEach(txt => {
          const d = document.createElement('div');
          d.className = cls;
          d.textContent = txt;
          out.appendChild(d);
        });
        out.scrollTop = out.scrollHeight;
      };
      compileNode(path, file.content, print);
    }
  });
}

async function runFileHolyC(path) {
  const file = await vfs.read(path);
  const rows = [];
  let bad = null;
  try {
    hcRun(hcParse(hcLex(file && file.content || '')), l => rows.push(l), null, {
      godDoodle: () => openWindow('goddoodle').catch(console.error),
      dirNames: () => []
    });
  } catch (e) { bad = e; }
  createWindow({
    kind: 'terminal', title: 'RUN ' + path, w: 480, h: 260,
    build: body => {
      const t = document.createElement('div');
      t.className = 'term';
      const o = document.createElement('div');
      o.className = 'termout';
      const put = (txt, cls) => {
        const d = document.createElement('div');
        d.className = cls; d.textContent = txt; o.appendChild(d);
      };
      put('HOLYC JIT — ' + path, 'l-dim');
      rows.forEach(r => put(r, 'l-holyc'));
      if (bad && bad.holyc) put('HolyC: ' + bad.message, 'l-err');
      else if (bad) { put('FAULT: ' + bad.message, 'l-err'); panic(bad, 'HolyC JIT'); }
      else { put('', 'l-dim'); put('RAN CLEAN. NO LINKER. NO INTERCESSOR.', 'l-holy'); }
      t.appendChild(o);
      body.appendChild(t);
    }
  });
  if (window.Snd) { if (bad) window.Snd.err(); else window.Snd.bell(); }
}

function wireMenu() {
  document.querySelectorAll('.menuitem').forEach(mi => {
    mi.addEventListener('mousedown', ev => {
      const m = mi.dataset.menu;
      if (window.Snd) window.Snd.click();
      if (m === 'File') {
        ev.stopPropagation();
        openFileMenu(mi);
      } else if (m === 'Compile') {
        openCompile();
      } else if (m === 'Tools') {
        openWindow('terminal').catch(console.error);
      } else if (m === 'Help') {
        openWindow('editor', { path: '::/Compiler/HolyC.DD' }).catch(console.error);
      }
    });
  });

  document.addEventListener('mousedown', ev => {
    if (!ev.target.closest || !ev.target.closest('.popmenu')) hideMenus();
  });

  const pickimg = document.getElementById('pickimg');
  const picktxt = document.getElementById('picktxt');
  if (pickimg) pickimg.addEventListener('change', ev => {
    importFiles(ev.target.files, 'media');
    ev.target.value = '';
  });
  if (picktxt) picktxt.addEventListener('change', ev => {
    importFiles(ev.target.files, 'text');
    ev.target.value = '';
  });
}

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
                'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiAt = 0;
let edenOpen = false;
export function wireKonami() {
  window.addEventListener('keydown', e => {
    const want = KONAMI[konamiAt];
    const got = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (got === want) {
      konamiAt++;
      if (konamiAt === KONAMI.length) {
        konamiAt = 0;
        if (!edenOpen) {
          import('../apps/eden_ext.js').then(m => m.openEden()).catch(console.error);
        }
      }
    } else {
      konamiAt = (got === KONAMI[0]) ? 1 : 0;
    }
  });
}
