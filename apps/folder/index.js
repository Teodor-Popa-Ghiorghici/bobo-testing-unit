import { SPRITES } from '../../kernel/sprites.js';
import { wireDrop, showMenu, pickUpload, newFolderPrompt } from '../../kernel/desktop.js';

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
  width: 460,
  height: 300,
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

    async function render() {
      body.innerHTML = '';
      const list = await ctx.fs.list(path);
      if (!list.length) {
        const empty = document.createElement('div');
        empty.style.cssText = 'padding:16px;color:#AAA';
        empty.textContent = 'NO ENTRIES. RIGHT-CLICK TO ADD SOME.';
        body.appendChild(empty);
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
            const app = ['code', 'doc', 'text'].includes(item.type) ? 'editor' : 'viewer';
            ctx.openWindow(app, { path: p, type: item.type });
          }
        });

        el.addEventListener('contextmenu', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (!el.classList.contains('sel')) {
            body.querySelectorAll('.icon.sel').forEach(n => n.classList.remove('sel'));
            el.classList.add('sel');
          }
          if (window.Snd) window.Snd.click();
          const p = path + (path.endsWith('/') ? '' : '/') + item.name;
          showMenu(document.getElementById('ctxmenu'), ev.clientX, ev.clientY, [
            { label: 'DELETE', run: async () => {
                await ctx.fs.remove(p);
                if (window.Snd && window.Snd.del) window.Snd.del();
                render();
              } }
          ]);
        });

        if (item.type === 'folder') {
          wireDrop(el, () => path + (path.endsWith('/') ? '' : '/') + item.name);
        }

        body.appendChild(el);
      });
    }

    /* the empty-folder case used to bail out before any of this ran, which
       is exactly the state a freshly made folder is in -- so a brand new
       folder had no drop target, no context menu and no keyboard handling
       at all */
    wireDrop(body, () => path);

    body.addEventListener('contextmenu', (ev) => {
      if (ev.target.closest && ev.target.closest('.icon')) return;
      ev.preventDefault();
      ev.stopPropagation();
      if (window.Snd) window.Snd.click();
      showMenu(document.getElementById('ctxmenu'), ev.clientX, ev.clientY, [
        { label: 'NEW FOLDER...', run: () => newFolderPrompt(path) },
        { label: 'UPLOAD IMAGES / VIDEO...', run: () => pickUpload(path, 'media') },
        { label: 'UPLOAD TEXT FILES...', run: () => pickUpload(path, 'text') }
      ]);
    });

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
          if (window.Snd && window.Snd.del) window.Snd.del();
          render();
        }
      }
    });
    // autofocus body so keyboard events work immediately
    setTimeout(() => body.focus(), 100);

    /* another window (or this one) changed something under this folder --
       redraw so a drop, an upload or a new subfolder actually shows up.
       Every open folder is this same app module (a singleton), so mount/
       unmount give no way to tell one window's listener from another's --
       this one checks whether its own body is still on screen instead of
       relying on unmount() to clean it up. */
    const vfsHandler = ev => {
      if (!document.body.contains(body)) { window.removeEventListener('vfs-changed', vfsHandler); return; }
      const dir = ev.detail && ev.detail.dir;
      if (!dir || dir === path || path.indexOf(dir + '/') === 0 || dir.indexOf(path + '/') === 0) render();
    };
    window.addEventListener('vfs-changed', vfsHandler);

    await render();
  },

  unmount() {}
};
