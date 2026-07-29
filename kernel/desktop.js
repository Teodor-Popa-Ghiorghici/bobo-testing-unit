import { Style } from './style.js';
import { fs as vfs } from './vfs.js';
import { openWindow } from './wm.js';
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
          openWindow('tasks').catch(console.error);
        } else if (item.name === 'BEKKEDAL') {
          openWindow('bekkedal').catch(console.error);

        } else if (item.name === 'GARDEN') {
          openWindow('garden').catch(console.error);
        } else {
          // generic open
          const app = item.type === 'folder' ? 'folder' : ['code','doc','text'].includes(item.type) ? 'editor' : 'viewer'; openWindow(app, { path: `::/${item.name}`, type: item.type }).catch(console.error);
        }
      });
      
      iconsContainer.appendChild(el);
    });
    
  wireMenu();
    desk.addEventListener('click', () => {
      document.querySelectorAll('.icon.sel').forEach(n => n.classList.remove('sel'));
    });
    
  } catch(e) {
    console.error("Failed to load desktop icons", e);
  }
}

function wireMenu() {
  document.querySelectorAll('.menuitem').forEach(mi => {
    mi.addEventListener('mousedown', ev => {
      const m = mi.dataset.menu;
      if (window.Snd) window.Snd.select();
      if (m === 'Tools') {
        openWindow('terminal').catch(console.error);
      } else if (m === 'Help') {
        openWindow('editor', { path: '::/Compiler/HolyC.DD' }).catch(console.error);
      }
    });
  });
}

// Call wireMenu in initDesktop
