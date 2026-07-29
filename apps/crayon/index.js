import { createWindow, raise, sysDialog, toast } from '../../kernel/wm.js';
import { Snd } from '../../kernel/snd.js';
import { Cos } from '../../kernel/cos.js';
import { fs as vfs } from '../../kernel/vfs.js';
import { lampDip } from '../../kernel/hardware.js';
import { Vault } from '../../kernel/vault.js';


const DRAW_KEY = 'templeos.draw';
const DRAW_CAP = 120;
const CRAYON_PAL = [
  { n: 'PAPER',  c: '#e8e2d4' },
  { n: 'BONE',   c: '#c9bfa8' },
  { n: 'ASH',    c: '#6b6357' },
  { n: 'CHAR',   c: '#1a1a1a' },
  { n: 'BLOOD',  c: '#8b1a1a' },
  { n: 'RUST',   c: '#b23a2a' },
  { n: 'BRUISE', c: '#4a2c3d' }
];
const PAPER = '#e8e2d4';
const DRAW_W = 672, DRAW_H = 448;

let paperCv = null;
function makePaper() {
  if (paperCv) return paperCv;
  paperCv = document.createElement('canvas');
  paperCv.width = DRAW_W; paperCv.height = DRAW_H;
  const g = paperCv.getContext('2d');
  g.fillStyle = PAPER;
  g.fillRect(0, 0, DRAW_W, DRAW_H);
  const img = g.getImageData(0, 0, DRAW_W, DRAW_H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() * 14 - 7) | 0;
    d[i] += n; d[i + 1] += n; d[i + 2] += n - 1;
  }
  g.putImageData(img, 0, 0);
  /* fibres: short pale and dark hairs lying in the sheet */
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * DRAW_W, y = Math.random() * DRAW_H;
    const a = Math.random() * Math.PI, l = 2 + Math.random() * 7;
    g.strokeStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.30)' : 'rgba(120,110,90,0.16)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  return paperCv;
}

const Crayon = {
  st: null,
  boot() {
    let raw = localStorage.getItem(DRAW_KEY);
    this.st = raw ? JSON.parse(raw) : { items: [], seq: 1 };
    if (!Array.isArray(this.st.items)) this.st.items = [];
  },
  save() { localStorage.setItem(DRAW_KEY, JSON.stringify(this.st)); }
};
Crayon.boot();

window.Crayon = Crayon;

let drawWin = null;
export default {
  open(loadItem) {
  if (drawWin && document.body.contains(drawWin.win)) {
    raise(drawWin.win);
    if (loadItem && drawWin.loadInto) drawWin.loadInto(loadItem);
    return;
  }
  let cv, g, root, sizeBtns = [], toolBtns = [], swatchEls = [];
  let color = 3, size = 1, tool = 'crayon';
  const SIZES = [4, 9, 17];
  let drawing = false, lastX = 0, lastY = 0, lastT = 0, lastW = SIZES[1];
  let undo = [], scratchT = 0;
  let current = null;         /* the saved record this canvas came from */

  const made = createWindow({
    kind: 'app', title: 'DRAW.EXE', w: 800, h: 600,
    build: body => {
      root = document.createElement('div');
      root.className = 'drawroot';

      const tools = document.createElement('div');
      tools.className = 'drawtools';

      const sw = document.createElement('div');
      sw.className = 'drawswatch';
      CRAYON_PAL.forEach((p, i) => {
        const el = document.createElement('i');
        el.style.background = p.c;
        el.title = p.n;
        el.className = (i === color) ? 'on' : '';
        el.addEventListener('mousedown', ev => {
          ev.stopPropagation();
          color = i;
          swatchEls.forEach((e, k) => e.classList.toggle('on', k === i));
          if (tool === 'eraser') setTool('crayon');
          Snd.click();
        });
        swatchEls.push(el);
        sw.appendChild(el);
      });
      tools.appendChild(sw);

      const hd = t => { const d = document.createElement('div'); d.className = 'hd'; d.textContent = t; tools.appendChild(d); };

      hd('TOOL');
      [['crayon', 'CRAYON'], ['eraser', 'ERASER'], ['fill', 'FILL']].forEach(t => {
        const b = document.createElement('button');
        b.className = 'tl' + (t[0] === tool ? ' on' : '');
        b.textContent = t[1];
        b.dataset.tool = t[0];
        b.addEventListener('mousedown', ev => { ev.stopPropagation(); setTool(t[0]); Snd.click(); });
        toolBtns.push(b);
        tools.appendChild(b);
      });

      hd('SIZE');
      ['SMALL', 'MEDIUM', 'LARGE'].forEach((n, i) => {
        const b = document.createElement('button');
        b.className = 'tl' + (i === size ? ' on' : '');
        b.textContent = n;
        b.addEventListener('mousedown', ev => {
          ev.stopPropagation();
          size = i;
          sizeBtns.forEach((e, k) => e.classList.toggle('on', k === i));
          Snd.click();
        });
        sizeBtns.push(b);
        tools.appendChild(b);
      });

      hd('SHEET');
      const mk = (label, fn) => {
        const b = document.createElement('button');
        b.className = 'tl';
        b.textContent = label;
        b.addEventListener('mousedown', ev => { ev.stopPropagation(); Snd.click(); fn(); });
        tools.appendChild(b);
        return b;
      };
      mk('UNDO', doUndo);
      mk('NEW', newSheet);
      mk('SAVE', save);
      mk('EXPORT PNG', exportPng);
      mk('DRAWINGS', () => openDrawings());

      const wrap = document.createElement('div');
      wrap.className = 'drawwrap';
      cv = document.createElement('canvas');
      cv.width = DRAW_W; cv.height = DRAW_H;
      cv.className = 'drawcv';
      wrap.appendChild(cv);

      root.appendChild(tools);
      root.appendChild(wrap);
      body.appendChild(root);
    }
  });
  drawWin = made;
  g = cv.getContext('2d', { willReadFrequently: true });
  if (!g) return;

  function setTool(t) {
    tool = t;
    toolBtns.forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  }

  function newSheet() {
    g.drawImage(makePaper(), 0, 0);
    undo = [];
    current = null;
    made.title.textContent = 'DRAW.EXE';
  }

  function push() {
    try { undo.push(g.getImageData(0, 0, DRAW_W, DRAW_H)); } catch (e) { return; }
    if (undo.length > 24) undo.shift();
  }
  function doUndo() {
    const s = undo.pop();
    if (!s) { toast('NOTHING LEFT TO TAKE BACK.'); return; }
    g.putImageData(s, 0, 0);
  }

  /* ---- the stroke -------------------------------------------------------
     A grain of wax, stamped. Every dot is offset by a random amount inside
     the nib, drawn at a random alpha, and skipped one time in six, which is
     what gives the edge its bite and the drag its texture.
     ====================================================================== */
  function stamp(x, y, w, col, alpha) {
    const n = Math.max(5, Math.round(w * 2.4));
    for (let i = 0; i < n; i++) {
      if (Math.random() < 0.11) continue;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * (w / 2);
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      g.globalAlpha = alpha * (0.5 + Math.random() * 0.5);
      g.fillStyle = col;
      const s = 1 + (Math.random() < 0.3 ? 1 : 0);
      g.fillRect(px | 0, py | 0, s, s);
    }
    g.globalAlpha = 1;
  }

  function seg(x0, y0, x1, y1, speed) {
    const base = SIZES[size];
    /* speed arrives in pixels per millisecond: a considered line is under
       one, a flick is three or more. Fast goes thin and faint, slow goes
       dense, and the whole range has to sit inside a normal hand. */
    const fast = Math.min(1, speed / 2.4);
    const w = Math.max(3, base * (1 - fast * 0.45));
    const alpha = tool === 'eraser' ? 1 : (0.96 - fast * 0.34);
    const col = tool === 'eraser' ? null : CRAYON_PAL[color].c;
    const dx = x1 - x0, dy = y1 - y0;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const stepN = Math.max(1, Math.ceil(dist / Math.max(1, w * 0.3)));
    for (let i = 0; i <= stepN; i++) {
      const t = i / stepN;
      const jx = (Math.random() - 0.5) * w * 0.22;
      const jy = (Math.random() - 0.5) * w * 0.22;
      const px = x0 + dx * t + jx, py = y0 + dy * t + jy;
      if (col) stamp(px, py, w, col, alpha);
      else {
        /* the eraser has the same texture and reveals paper, not white */
        const n = Math.max(4, Math.round(w * 1.8));
        for (let k = 0; k < n; k++) {
          if (Math.random() < 0.12) continue;
          const a = Math.random() * Math.PI * 2;
          const r = Math.sqrt(Math.random()) * (w / 2);
          const ex = (px + Math.cos(a) * r) | 0, ey = (py + Math.sin(a) * r) | 0;
          g.drawImage(makePaper(), ex, ey, 2, 2, ex, ey, 2, 2);
        }
      }
    }
    lastW = w;
  }

  /* a flood fill with a deliberately ragged edge: the frontier stops one
     pixel early about a third of the time, so the boundary is not a machine
     line but something that was coloured in */
  function fill(sx, sy) {
    const img = g.getImageData(0, 0, DRAW_W, DRAW_H);
    const d = img.data;
    const at = (x, y) => (y * DRAW_W + x) * 4;
    const s = at(sx, sy);
    const t = [d[s], d[s + 1], d[s + 2]];
    const hex = CRAYON_PAL[color].c;
    const nc = [parseInt(hex.substr(1, 2), 16), parseInt(hex.substr(3, 2), 16), parseInt(hex.substr(5, 2), 16)];
    if (Math.abs(t[0] - nc[0]) + Math.abs(t[1] - nc[1]) + Math.abs(t[2] - nc[2]) < 12) return;
    /* the tolerance itself is jittered, so the frontier stops unevenly and
       the boundary comes out hand-coloured rather than machine-cut. Jitter
       the FRONTIER, never the interior: a random skip inside the region
       leaves unfilled speckles, which is a bug and not a texture. */
    const near = i => Math.abs(d[i] - t[0]) + Math.abs(d[i + 1] - t[1]) + Math.abs(d[i + 2] - t[2])
      < 46 + (Math.random() * 22 - 11);
    const seen = new Uint8Array(DRAW_W * DRAW_H);
    const q = [sy * DRAW_W + sx];
    seen[q[0]] = 1;
    let head = 0;
    while (head < q.length) {
      const p = q[head++];
      const x = p % DRAW_W, y = (p / DRAW_W) | 0;
      const i = p * 4;
      const jit = (Math.random() * 13 - 6) | 0;
      d[i] = Math.max(0, Math.min(255, nc[0] + jit));
      d[i + 1] = Math.max(0, Math.min(255, nc[1] + jit));
      d[i + 2] = Math.max(0, Math.min(255, nc[2] + jit));
      const push = (nx, ny) => {
        if (nx < 0 || ny < 0 || nx >= DRAW_W || ny >= DRAW_H) return;
        const np = ny * DRAW_W + nx;
        if (seen[np]) return;
        if (!near(np * 4)) { seen[np] = 1; return; }
        seen[np] = 1;
        q.push(np);
      };
      push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
    }
    g.putImageData(img, 0, 0);
  }

  function pos(ev) {
    const r = cv.getBoundingClientRect();
    return {
      x: (ev.clientX - r.left) * (DRAW_W / r.width),
      y: (ev.clientY - r.top) * (DRAW_H / r.height)
    };
  }

  cv.addEventListener('mousedown', ev => {
    ev.stopPropagation();
    if (ev.button !== 0) return;
    const p = pos(ev);
    push();
    if (tool === 'fill') { fill(p.x | 0, p.y | 0); Snd.page(); return; }
    drawing = true;
    lastX = p.x; lastY = p.y; lastT = performance.now();
    seg(p.x, p.y, p.x + 0.01, p.y, 0);
  });
  window.addEventListener('mousemove', ev => {
    if (!drawing) return;
    const p = pos(ev);
    const now = performance.now();
    const dt = Math.max(8, now - lastT);
    const dist = Math.hypot(p.x - lastX, p.y - lastY);
    const speed = dist / dt;
    seg(lastX, lastY, p.x, p.y, speed);
    lastX = p.x; lastY = p.y; lastT = now;
    if (now - scratchT > 55) { scratchT = now; Snd.scratch(speed); }
  });
  window.addEventListener('mouseup', () => { drawing = false; });

  /* ---- saving ------------------------------------------------------------ */
  function thumb() {
    const t = document.createElement('canvas');
    t.width = 160; t.height = 107;
    const tg = t.getContext('2d');
    tg.drawImage(cv, 0, 0, 160, 107);
    return t.toDataURL('image/jpeg', 0.6);
  }

  async function store(name) {
    const full = cv.toDataURL('image/jpeg', 0.78);
    const rec = current || { id: 'd' + Date.now().toString(36), name: name, t: Date.now() };
    rec.name = name;
    rec.t = Date.now();
    rec.thumb = thumb();
    /* the picture itself goes in the vault the machine already had; only the
       key travels in the JSON that localStorage holds */
    const key = await Vault.putData(full, rec.vault || null);
    if (key) { rec.vault = key; delete rec.data; }
    else { rec.data = full; }
    if (!current) Crayon.st.items.push(rec);
    current = rec;
    Crayon.st.seq = (Crayon.st.seq || 1) + 1;
    Crayon.save();
    made.title.textContent = 'DRAW.EXE  --  ' + name;
    Snd.save();
    toast('SAVED TO MY DRAWINGS: ' + name);
    window.dispatchEvent(new Event('crayon-saved'));
  }

  function save() {
    if (!current && Crayon.st.items.length >= DRAW_CAP) {
      sysDialog('DISK FULL', 'MY DRAWINGS HOLDS ' + DRAW_CAP + ' SHEETS AND HOLDS ' +
        Crayon.st.items.length + '.\n\nTHROW ONE AWAY BEFORE YOU MAKE ANOTHER.');
      return;
    }
    if (!current && Crayon.st.items.length === DRAW_CAP - 1) {
      toast('THAT IS THE LAST SHEET IN THE DRAWER.');
    }
    const def = current ? current.name : 'UNTITLED-' + String(Crayon.st.seq || 1).padStart(2, '0');
    askName('SAVE DRAWING', def, n => {
      const name = (n || def).trim().toUpperCase().slice(0, 22) || def;
      store(name);
    });
  }

  function exportPng() {
    try {
      const a = document.createElement('a');
      a.download = ((current && current.name) || 'DRAWING') + '.png';
      a.href = cv.toDataURL('image/png');
      a.click();
      toast('WRITTEN TO YOUR DOWNLOADS.');
    } catch (e) { toast('THE BROWSER WOULD NOT LET GO OF IT.'); }
  }

  made.loadInto = async function (rec) {
    let src = rec.data;
    if (!src && rec.vault) src = await VaultURL.url(rec.vault);
    if (!src) { toast('THAT SHEET IS GONE.'); return; }
    const img = new Image();
    img.onload = () => {
      push();
      g.drawImage(makePaper(), 0, 0);
      g.drawImage(img, 0, 0, DRAW_W, DRAW_H);
      current = rec;
      made.title.textContent = 'DRAW.EXE  --  ' + rec.name;
    };
    img.src = src;
  };

  newSheet();
  if (loadItem) made.loadInto(loadItem);
  lampDip();
  }
};