import { Dnd } from '../../kernel/dnd.js';
import { showMenu } from '../../kernel/menus.js';
import { BinLook } from '../../kernel/bin_look.js';
import { toast } from '../../kernel/wm.js';

import { spriteFor } from '../../kernel/desktop.js';
import { scopedListeners } from '../lifecycle.js';

const ago = ms => {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return s + 's AGO';
  if (s < 3600) return Math.round(s / 60) + ' MIN AGO';
  if (s < 86400) return Math.round(s / 3600) + ' H AGO';
  return Math.round(s / 86400) + ' DAYS AGO';
};

export default {
  id: 'trash',
  title: 'RECYCLE BIN',
  width: 520,
  height: 340,
  resizable: true,
  rightClick: true,                          /* right-click it for the dumpster, once HOLYC.EXE has given it (kernel/bin_look.js) */

  async mount(root, ctx) {
    const _style = document.createElement('link');
    _style.rel = 'stylesheet';
    _style.href = 'apps/trash/style.css';
    root.appendChild(_style);
    root.style.display = 'flex';
    root.style.flexDirection = 'column';
    const L = scopedListeners(root);

    const bar = document.createElement('div');
    bar.className = 'appbar fbar';
    const mk = (label, title, fn) => {
      const b = document.createElement('button');
      b.className = 'appbtn';
      b.textContent = label;
      b.title = title;
      b.addEventListener('mousedown', ev => { ev.stopPropagation(); if (window.Snd) window.Snd.click(); fn(); });
      bar.appendChild(b);
      return b;
    };
    const bRestore = mk('PUT BACK', 'PUT THE SELECTED THINGS BACK WHERE THEY CAME FROM', () => restore(selected()));
    const bGone = mk('DELETE FOR GOOD', 'THROW THE SELECTED THINGS AWAY FOR EVER', () => purge(selected()));
    const bAll = mk('EMPTY THE BIN', 'THROW EVERYTHING AWAY FOR EVER', () => purge(rows));
    /* the name and the look follow the bin/dumpster choice (kernel/bin_look.js): the window's title, the button, the empty line, a green ribbed floor */
    function dress() {
      const d = BinLook.dumpster();
      root.classList.toggle('dumpster', d);
      bAll.textContent = 'EMPTY THE ' + BinLook.noun();
      try { ctx.setTitle(BinLook.name()); } catch (e) { /* no title to set */ }
    }
    const note = document.createElement('span');
    note.className = 'fcount';
    bar.appendChild(note);

    const list = document.createElement('div');
    list.className = 'win-trash';
    list.dataset.drop = '@trash';
    root.appendChild(bar);
    root.appendChild(list);

    let rows = [];
    const picked = new Set();
    const selected = () => rows.filter(r => picked.has(r.id));

    async function restore(rs) {
      const done = await ctx.fs.restoreMany(rs.map(r => r.id));
      if (done.bad.length) toast(done.bad[0]);
      if (rs.length && !done.bad.length) { try { if (ctx.trophy || window.Trophies) window.Trophies.emit('system', 'trash-restore', {}); } catch (e) { /* never into the bin */ } }
      if (rs.length) { toast('PUT BACK ' + rs.length + ' ITEM' + (rs.length === 1 ? '' : 'S') + '.'); if (window.Snd) window.Snd.ok(); }
    }
    async function purge(rs) {
      if (!rs.length) return;
      await ctx.fs.purgeMany(rs.map(r => r.id));
      toast(rs.length + ' ITEM' + (rs.length === 1 ? '' : 'S') + ' GONE FOR GOOD.');
      if (window.Snd) window.Snd.del();
    }

    async function render() {
      rows = await ctx.fs.trashList();
      [...picked].forEach(id => { if (!rows.some(r => r.id === id)) picked.delete(id); });
      note.textContent = rows.length + (rows.length === 1 ? ' ITEM' : ' ITEMS');
      const els = rows.map(r => {
        const el = document.createElement('div');
        el.className = 'trow' + (picked.has(r.id) ? ' sel' : '');
        const ic = document.createElement('span');
        ic.className = 'tic';
        ic.innerHTML = spriteFor(r.type, r.app);
        const nm = document.createElement('span');
        nm.className = 'tnm';
        nm.textContent = r.name;
        const fr = document.createElement('span');
        fr.className = 'tfr';
        fr.textContent = 'FROM ' + r.from.replace(/\/[^/]*$/, '') .replace(/^::$/, '::/') + '  ' + ago(r.at);
        el.append(ic, nm, fr);
        el.addEventListener('pointerdown', ev => {
          if (ev.button !== 0) return;
          ev.stopPropagation();
          if (ev.ctrlKey || ev.metaKey) { picked.has(r.id) ? picked.delete(r.id) : picked.add(r.id); }
          else if (!picked.has(r.id)) { picked.clear(); picked.add(r.id); }
          list.querySelectorAll('.trow').forEach((n, i) => n.classList.toggle('sel', picked.has(rows[i].id)));
          /* drag a thing out of the bin onto the desktop or a folder to put it there */
          const mine = selected();
          Dnd.begin(ev, {
            paths: mine.map(m => m.path), svg: spriteFor(r.type, r.app), label: r.name,
            accept: z => z.drop !== '@trash',
            onDrop: async (zone) => {
              if (!zone || zone.drop === '@trash') return;
              const out = await ctx.fs.moveMany(mine.map(m => m.path), zone.drop);
              if (out.bad.length) toast(out.bad[0]);
              await ctx.fs.purgeMany(mine.map(m => m.id));
              toast('MOVED ' + mine.length + ' ITEM' + (mine.length === 1 ? '' : 'S') + ' OUT OF THE BIN.');
            }
          });
        });
        el.addEventListener('dblclick', ev => { ev.stopPropagation(); restore([r]); });
        return el;
      });
      list.replaceChildren(...els);
      if (!rows.length) {
        const e = document.createElement('div');
        e.className = 'fempty';
        e.textContent = 'THE ' + BinLook.noun() + ' IS EMPTY. DELETED THINGS WAIT HERE UNTIL YOU THROW THEM AWAY.';
        list.appendChild(e);
      }
      bRestore.disabled = bGone.disabled = !picked.size;
      bAll.disabled = !rows.length;
    }

    list.addEventListener('pointerdown', ev => {
      if (ev.target === list) { picked.clear(); render(); }
    });
    list.addEventListener('contextmenu', ev => {
      ev.preventDefault();
      if (!BinLook.earned()) return;
      showMenu(document.getElementById('ctxmenu'), ev.clientX, ev.clientY, [{ label: BinLook.switchLabel(), run: () => { BinLook.toggle(); if (window.Snd) window.Snd.click(); } }]);
    });
    L.on(window, 'binlook-changed', () => { dress(); render(); });
    dress();
    L.on(window, 'vfs-changed', ev => {
      const dir = ev.detail && ev.detail.dir;
      if (!dir || dir.indexOf('::/.Trash') === 0) render();
    });
    await render();
  },
  unmount() {}
};
