import { Style } from './style.js';
import { fs as vfs } from './vfs.js';
import { openWindow, createWindow, toast } from './wm.js';
import { SPRITES } from './sprites.js';

let desktopIcons = [];

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

export async function initDesktop() {
  const desk = document.getElementById('desktop');
  desk.addEventListener('click', () => {
    document.querySelectorAll('.icon.sel').forEach(n => n.classList.remove('sel'));
  });
  wireMenu();
  await refreshIcons();
}

async function refreshIcons() {
  const iconsContainer = document.getElementById('icons');

  if (!iconsContainer) return;

  iconsContainer.innerHTML = '';

  try {
    const list = await vfs.list('::');
    
    // Add built-in terminal icon
    list.push({ name: 'TERMINAL', type: 'terminal' });
    list.push({ name: 'GARDEN', type: 'app' });
    list.push({ name: 'SHOP', type: 'app' });
    list.push({ name: 'BOTTLE', type: 'app' });
    list.push({ name: 'NOTES', type: 'app' });
    list.push({ name: 'TASKS', type: 'app' });
    list.push({ name: 'BEKKEDAL', type: 'app' });
    
    list.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'icon';
      el.innerHTML = spriteFor(item.type);
      
      const lbl = document.createElement('div');
      const span = document.createElement('span');
      span.className = 'lbl';
      span.textContent = item.name;
      lbl.appendChild(span);
      el.appendChild(lbl);
      
      // Compute simple grid position if no icon slot system is ported
      // 80x80 slots, grid starts at (10, 10)
      const col = Math.floor(i / 5);
      const row = i % 5;
      el.style.left = (20 + col * 80) + 'px';
      el.style.top = (20 + row * 80) + 'px';
      
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (window.Snd) window.Snd.select();
        document.querySelectorAll('.icon.sel').forEach(n => n.classList.remove('sel'));
        el.classList.add('sel');
      });
      
      el.addEventListener('dblclick', (ev) => {
        ev.stopPropagation();
        if (window.Snd) window.Snd.open();
        if (item.type === 'terminal') {
          openWindow('terminal').catch(console.error);
        } else if (item.name === 'SHOP') {
          openWindow('shop').catch(console.error);
        } else if (item.name === 'BOTTLE') {
          openWindow('bottle').catch(console.error);
        } else if (item.name === 'NOTES') {
          openWindow('notes').catch(console.error);
        } else if (item.name === 'TASKS') {
          openWindow('tasks').catch(console.error);} else if (item.name === 'HIFI') {
          openWindow('hifi').catch(console.error);
        } else if (item.name === 'MINESWEEPER') {
          openWindow('sweeper').catch(console.error);
        } else if (item.name === 'SOLITAIRE') {
          openWindow('solitaire').catch(console.error);
        } else if (item.name === 'CRAYON') {
          openWindow('crayon').catch(console.error);
        } else if (item.name === 'DRAWINGS') {
          openWindow('drawings').catch(console.error);
        } else if (item.name === 'ELEPHANT') {
          openWindow('elephant').catch(console.error);
        } else if (item.name === 'MAGEN') {
          openWindow('magen').catch(console.error);
        } else if (item.name === 'COOK') {
          openWindow('cook').catch(console.error);
        } else if (item.name === 'DISPLAY SETTINGS') {
          openWindow('display').catch(console.error);
        } else if (item.name === 'ABOUT') {
          openWindow('about').catch(console.error);


        } else if (item.name === 'BEKKEDAL') {
          openWindow('bekkedal').catch(console.error);

        } else if (item.name === 'GARDEN') {
          openWindow('garden').catch(console.error);
        } else {
          // generic open
          const app = item.type === 'folder' ? 'folder' : ['code','doc','text'].includes(item.type) ? 'editor' : 'viewer';
          openWindow(app, { path: `::/${item.name}`, type: item.type }).catch(console.error);
        }
      });
      
      iconsContainer.appendChild(el);
    });

  } catch(e) {
    console.error("Failed to load desktop icons", e);
  }
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

function openFileMenu(anchor) {
  const r = anchor.getBoundingClientRect();
  showMenu(document.getElementById('filemenu'), r.left, r.bottom, [
    { label: 'UPLOAD IMAGES / VIDEO -> ::/', run: () => document.getElementById('pickimg').click() },
    { label: 'UPLOAD TEXT FILES...  -> ::/', run: () => document.getElementById('picktxt').click() },
    { sep: true },
    { label: 'NEW FOLDER...', run: () => newFolderPrompt() }
  ]);
}

function newFolderPrompt() {
  const name = window.prompt('NEW FOLDER NAME:', 'New Folder');
  if (!name) return;
  vfs.write(`::/${name}/`, { type: 'folder' }).then(() => {
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
  for (const f of files) {
    try {
      if (kind === 'media') {
        const src = await readAsDataURL(f);
        const type = f.type.startsWith('video') ? 'video' : 'image';
        await vfs.write(`::/${f.name}`, { type, src });
      } else {
        const content = await readAsText(f);
        await vfs.write(`::/${f.name}`, { type: 'text', content });
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

// Call wireMenu in initDesktop
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
