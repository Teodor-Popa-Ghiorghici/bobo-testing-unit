import { createWindow, openWins } from '../../kernel/wm.js';
import { Snd } from '../../kernel/snd.js';
import { fs as vfs } from '../../kernel/vfs.js';

const TEMPLE_ASCII = [
  "        /\\        ",
  "       /  \\       ",
  "      /    \\      ",
  "     /______\\     ",
  "    ||||||||||    ",
  "    ||||||||||    ",
  "    ||||||||||    ",
  "   /__________\\   ",
  "  /____________\\  "
];

function commas(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

async function neofetchLines(vfs) {
  let used = 0;
  try {
    const list = await vfs.list('::');
    used = list.length * 640;
  } catch (e) {}
  const wins = openWins.length;
  const rows = [
    'root@temple',
    '-----------',
    'OS         TempleOS V5.03 x86_64',
    'Host       HOLYTRON DM-640',
    'Kernel     Adam (ring 0, one address space)',
    'Uptime     ' + Math.max(1, Math.round((Date.now() - (window._bootAt || Date.now())) / 1000)) + ' seconds',
    'Packages   0 (there is no package manager)',
    'Shell      HolyC',
    'Resolution 640x480 @ 16 colours',
    'DE         none',
    'WM         Seth',
    'Terminal   TERMINAL.HC',
    'CPU        Anything with a timestamp counter',
    'GPU        VGA, and that is plenty',
    'Memory     ' + commas(used) + ' / 640,000 bytes',
    'Tasks      ' + (wins + 2) + ' (Adam, Seth, and ' + wins + ' children)',
    'Network    none, by design',
    'Licence    public domain'
  ];
  const out = [];
  const n = Math.max(TEMPLE_ASCII.length, rows.length);
  for (let i = 0; i < n; i++) {
    out.push((TEMPLE_ASCII[i] || ' '.repeat(18)) + '  ' + (rows[i] || ''));
  }
  out.push('');
  out.push('  ' + '██'.repeat(8));
  return out;
}

export default {
  async open() {
    const lines = await neofetchLines(vfs);
    createWindow({
      kind: 'terminal', title: 'Neofetch', w: 560, h: 330,
      build: body => {
        const t = document.createElement('div');
        t.className = 'term';
        const o = document.createElement('div');
        o.className = 'termout';
        lines.forEach(r => {
          const d = document.createElement('div');
          d.className = 'l-ok';
          d.textContent = r;
          o.appendChild(d);
        });
        t.appendChild(o);
        body.appendChild(t);
      }
    });
    Snd.holy();
  }
};
