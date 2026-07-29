import { createWindow, raise } from '../../kernel/wm.js';

const CMOS_ROWS = [
  ['System Time', () => new Date().toTimeString().slice(0, 8)],
  ['Drive ::', () => 'TEMPLE, 640K, CHS 40/2/8'],
  ['Video', () => 'VGA 640x480 16 colour'],
  ['Halt On', () => 'All Errors'],
  ['Ring', () => '0 (only)'],
  ['Memory Hole', () => 'Disabled'],
  ['Quick Boot', () => 'Disabled'],
  ['Network Boot', () => 'Not Installed'],
  ['Typematic Rate', () => '30/sec'],
  ['God', () => 'Present']
];

export default {
  id: 'cmos',
  title: 'CMOS SETUP UTILITY',
  width: 520,
  height: 320,
  resizable: true,
  mount(root, ctx) {
    const p = document.createElement('div');
    p.className = 'cmos';
    const h = document.createElement('div');
    h.className = 'cmoshead';
    h.textContent = 'HOLYTRON BIOS \u2014 STANDARD CMOS SETUP';
    p.appendChild(h);
    const t = document.createElement('div');
    t.className = 'cmosbody';
    CMOS_ROWS.forEach(r => {
      const row = document.createElement('div');
      row.className = 'cmosrow';
      row.innerHTML = '<span class="k">' + r[0] + '</span><span class="v">' + r[1]() + '</span>';
      t.appendChild(row);
    });
    p.appendChild(t);
    const f = document.createElement('div');
    f.className = 'cmosfoot';
    f.textContent = 'ESC: Quit    F10: Save & Exit    \u2191\u2193: Select Item';
    p.appendChild(f);
    root.appendChild(p);

    if (window.Snd && window.Snd.ok) window.Snd.ok();
  }
};
