import { createWindow } from '../../kernel/wm.js';
import { Snd } from '../../kernel/snd.js';
import { DISP, applyDisplay } from '../../kernel/hardware.js';

export default {
  open() {
  const rows = [
    ['SCANLINES', 'scan', 'Horizontal lines across the picture.'],
    ['REFRESH BAND', 'band', 'The bar that crawls down every twelve seconds.'],
    ['VIGNETTE', 'vig', 'The corners going dark, the way a tube does.']
  ];
  const made = createWindow({
    kind: 'terminal', title: 'DISPLAY.EXE', w: 420, h: 250, appId: 'display',
    build: body => {
      const p = document.createElement('div');
      p.className = 'sysdlg';
      const m = document.createElement('div');
      m.className = 'msg';
      m.textContent = 'THE GLASS. LENS, SCAN PITCH, PHOSPHOR AND BURN-IN ARE\nKNOBS ON THE CHIN OF THE MONITOR, NOT SOFTWARE.';
      p.appendChild(m);
      const btns = document.createElement('div');
      btns.className = 'btns';
      btns.style.flexWrap = 'wrap';
      rows.forEach(r => {
        const b = document.createElement('button');
        const label = () => { b.textContent = r[0] + ': ' + (DISP[r[1]] ? 'ON' : 'OFF'); };
        b.title = r[2];
        label();
        b.addEventListener('mousedown', ev => {
          ev.stopPropagation();
          DISP[r[1]] = !DISP[r[1]];
          label();
          Snd.click();
          applyDisplay();
        });
        btns.appendChild(b);
      });
      p.appendChild(btns);
      body.appendChild(p);
    }
  });
  void made;
  }
};
