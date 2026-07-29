import { Style } from './style.js';
import { fs as vfs } from './vfs.js';
import { openWindow, createWindow, toast } from './wm.js';
import { SPRITES } from './sprites.js';

const ICON_POS_KEY = 'templeos.icons.v1';
const WALL_KEY = 'templeos.wallpaper.v1';
const ICON_W = 84, ICON_H = 78;

let iconPos = {};
let wallpaper = null;             /* { src, mode } */

function loadIconPos() {
  try { iconPos = JSON.parse(localStorage.getItem(ICON_POS_KEY)) || {}; }
  catch (e) { iconPos = {}; }
}
function saveIconPos() {
  try { localStorage.setItem(ICON_POS_KEY, JSON.stringify(iconPos)); } catch (e) {}
}

function spriteFor(type) {
  if (type === 'folder')   return SPRITES.folder;
  if (type === 'image')    return SPRITES.image;
  if (type === 'video')    return SPRITES.video;
  if (type === 'terminal') return SPRITES.terminal;
  if (type === 'app')      return SPRITES.app;
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

export async function initDesktop() {
  const desk = document.getElementById('desktop');
  loadIconPos();
  desk.addEventListener('click', () => clearIconSel());
  wireMenu();
  wireMarquee(desk);
  applyWallpaper();
  await refreshIcons();
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

    list.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'icon';
      el.innerHTML = spriteFor(item.type);
      el.dataset.name = item.name;

      const lbl = document.createElement('div');
      const span = document.createElement('span');
      span.className = 'lbl';
      span.textContent = item.name;
      lbl.appendChild(span);
      el.appendChild(lbl);

      const pos = iconPos[item.name] || iconSlot(i);
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
        clearIconSel();
        el.classList.add('sel');
        openIconContextMenu(ev, item);
      });

      wireDeskIcon(el, item, openThis);

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
      group.forEach(s => {
        s.n.classList.remove('dragging');
        iconPos[s.n.dataset.name] = { x: s.n.offsetLeft, y: s.n.offsetTop };
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
  if (item.type !== 'terminal') {
    items.push({ sep: true });
    items.push({ label: 'DELETE', run: () => deleteIcon(item) });
  }
  if (!items.length) items.push({ label: 'NOTHING TO DO HERE', off: true });
  showMenu(document.getElementById('ctxmenu'), ev.clientX, ev.clientY, items);
}

async function deleteIcon(item) {
  await vfs.remove(`::/${item.name}`);
  delete iconPos[item.name];
  saveIconPos();
  toast(item.name + ' DELETED.');
  refreshIcons();
}

async function setWallpaperFrom(item, mode) {
  const file = await vfs.read(`::/${item.name}`);
  if (!file || !file.src) { toast('COULD NOT READ THAT FILE.'); return; }
  wallpaper = { src: file.src, mode };
  applyWallpaper();
  try { localStorage.setItem(WALL_KEY, JSON.stringify(wallpaper)); } catch (e) {}
  toast('BACKGROUND SET.');
}

function clearWallpaper() {
  wallpaper = null;
  applyWallpaper();
  try { localStorage.removeItem(WALL_KEY); } catch (e) {}
  toast('BACKGROUND CLEARED.');
}

function applyWallpaper() {
  const desk = document.getElementById('desktop');
  if (!desk) return;
  try {
    const raw = localStorage.getItem(WALL_KEY);
    if (raw && !wallpaper) wallpaper = JSON.parse(raw);
  } catch (e) {}
  if (!wallpaper) {
    desk.style.backgroundImage = '';
    return;
  }
  desk.style.backgroundImage = 'url("' + wallpaper.src + '")';
  desk.style.backgroundRepeat = wallpaper.mode === 'tile' ? 'repeat' : 'no-repeat';
  desk.style.backgroundSize = wallpaper.mode === 'tile' ? 'auto' : 'cover';
}

/* menu labels are decorative; File, Compile, Tools and Help do something.
   Edit and Debug are left as decoration in the original too. */
function showMenu(el, x, y, items) {
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
    { label: 'NEW FOLDER...', run: () => newFolderPrompt() }
  ];
  if (wallpaper) items.push({ label: 'CLEAR BACKGROUND', run: () => clearWallpaper() });
  showMenu(document.getElementById('filemenu'), r.left, r.bottom, items);
}

function newFolderPrompt() {
  const name = window.prompt('NEW FOLDER NAME:', 'New Folder');
  if (!name) return;
  vfs.write(`::/${name}/.keep`, { type: 'text', content: '' }).then(() => {
    toast('FOLDER CREATED: ' + name);
    refreshIcons();
  }).catch(() => toast('COULD NOT CREATE THE FOLDER.'));
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

async function importFiles(fileList, kind) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  const dir = uploadTarget || '::';
  for (const f of files) {
    try {
      if (kind === 'media') {
        const src = await readAsDataURL(f);
        const type = f.type.startsWith('video') ? 'video' : 'image';
        await vfs.write(`${dir}/${f.name}`, { type, src });
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
