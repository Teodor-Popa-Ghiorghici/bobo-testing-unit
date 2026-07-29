
import { SPRITES } from '../../kernel/sprites.js';
import { wireDrop } from '../../kernel/desktop.js';

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

export default {
  id: 'folder',
  title: 'FOLDER',
  width: 380,
  height: 240,
  resizable: true,

  async mount(root, ctx, args) {
    const _style = document.createElement('link');
    _style.rel = 'stylesheet';
    _style.href = 'apps/folder/style.css';
    root.appendChild(_style);

    const path = args?.path || '::';
    ctx.title = path;
    
    const body = document.createElement('div');
    body.className = 'win-folder';
    root.appendChild(body);
    
    const list = await ctx.fs.list(path);
    if (!list.length) {
      body.innerHTML = '<div style="padding:16px;color:#AAA">NO ENTRIES.</div>';
      return;
    }
    
    list.forEach(item => {
      const el = document.createElement('div');
      el.className = 'icon';
      el.innerHTML = spriteFor(item.type, item.app);
      
      const lbl = document.createElement('div');
      const span = document.createElement('span');
      span.className = 'lbl';
      span.textContent = item.name;
      lbl.appendChild(span);
      el.appendChild(lbl);
      
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (window.Snd) window.Snd.select();
        body.querySelectorAll('.icon.sel').forEach(n => n.classList.remove('sel'));
        el.classList.add('sel');
      });
      
      el.addEventListener('dblclick', (ev) => {
        ev.stopPropagation();
        if (window.Snd) window.Snd.open();
        const p = path + (path.endsWith('/') ? '' : '/') + item.name;
        if (item.type === 'folder') {
          ctx.openWindow('folder', { path: p });
        } else if (item.type === 'terminal') {
          ctx.openWindow('terminal');
        } else if (item.type === 'app') {
          if (item.app) ctx.openWindow(item.app);
        } else {
          const app = ['code','doc','text'].includes(item.type) ? 'editor' : 'viewer';
          ctx.openWindow(app, { path: p, type: item.type });
        }
      });
      
      if (item.type === 'folder') {
        wireDrop(el, () => path + (path.endsWith('/') ? '' : '/') + item.name);
      }

      body.appendChild(el);
    });

    wireDrop(body, () => path);

    body.addEventListener('click', () => {
      body.querySelectorAll('.icon.sel').forEach(n => n.classList.remove('sel'));
    });
    
    // Add keyboard listener for delete
    body.tabIndex = 0; // make focusable
    body.style.outline = 'none';
    body.addEventListener('keydown', async (ev) => {
      if (ev.key === 'Delete' || ev.key === 'Backspace') {
        const sel = body.querySelector('.icon.sel');
        if (sel) {
          const itemName = sel.querySelector('.lbl').textContent;
          const p = path + (path.endsWith('/') ? '' : '/') + itemName;
          await ctx.fs.remove(p);
          sel.remove();
          if (window.Snd && window.Snd.del) window.Snd.del();
        }
      }
    });
    // autofocus body so keyboard events work immediately
    setTimeout(() => body.focus(), 100);

  },

  unmount() {}
};
