import { createWindow, raise, sysDialog, toast } from '../../kernel/wm.js';
import { Snd } from '../../kernel/snd.js';
import { Cos } from '../../kernel/cos.js';
import { fs as vfs } from '../../kernel/vfs.js';
import { lampDip } from '../../kernel/hardware.js';
import { Vault } from '../../kernel/vault.js';

let drawerWin = null;
window.addEventListener('crayon-saved', () => {
  if (drawerWin && drawerWin.refresh) drawerWin.refresh();
});
export default {
  open() {
  if (drawerWin && document.body.contains(drawerWin.win)) { raise(drawerWin.win); drawerWin.refresh(); return; }
  let pane = null;
  const made = createWindow({
    kind: 'folder', title: 'MY DRAWINGS', w: 520, h: 420,
    build: body => {
      pane = document.createElement('div');
      pane.className = 'thumbwrap';
      body.appendChild(pane);
    }
  });
  drawerWin = made;

  made.refresh = function () {
    if (!pane) return;
    pane.innerHTML = '';
    if (!Crayon.st.items.length) {
      const e = document.createElement('div');
      e.className = 'emptynote';
      e.textContent = 'THE DRAWER IS EMPTY. OPEN DRAW.EXE AND PUT SOMETHING IN IT.';
      pane.appendChild(e);
      return;
    }
    Crayon.st.items.slice().reverse().forEach(rec => {
      const el = document.createElement('div');
      el.className = 'thumb';
      const im = document.createElement('img');
      im.src = rec.thumb || '';
      im.alt = rec.name;
      const lb = document.createElement('span');
      lb.className = 'lbl';
      lb.textContent = rec.name;
      el.appendChild(im);
      el.appendChild(lb);
      el.addEventListener('mousedown', ev => {
        ev.stopPropagation();
        pane.querySelectorAll('.thumb').forEach(n => n.classList.remove('sel'));
        el.classList.add('sel');
        Snd.select();
      });
      el.addEventListener('dblclick', () => { openCrayon(rec); });
      el.addEventListener('contextmenu', ev => {
        ev.preventDefault();
        ev.stopPropagation();
        showMenu(document.getElementById('ctxmenu'), ev.clientX, ev.clientY, [
          { label: 'OPEN', run: () => openCrayon(rec) },
          { label: 'EXPORT PNG', run: async () => {
              let src = rec.data;
              if (!src && rec.vault) src = await VaultURL.url(rec.vault);
              if (!src) { toast('THAT SHEET IS GONE.'); return; }
              const a = document.createElement('a');
              a.download = rec.name + '.png';
              a.href = src;
              a.click();
            } },
          { sep: true },
          { label: 'THROW AWAY', run: () => {
              sysDialog('THROW IT AWAY?', 'DELETE ' + rec.name + ' FOR GOOD?\n\nTHERE IS NO WASTEBASKET ON THIS MACHINE.', {
                confirm: true, okLabel: 'DELETE',
                onOk: () => {
                  const i = Crayon.st.items.indexOf(rec);
                  if (i >= 0) Crayon.st.items.splice(i, 1);
                  if (rec.vault) Vault.del(rec.vault);
                  Crayon.save();
                  Snd.del();
                  made.refresh();
                }
              });
            } }
        ]);
      });
      pane.appendChild(el);
    });
  };
  made.refresh();
  lampDip();
  }
};