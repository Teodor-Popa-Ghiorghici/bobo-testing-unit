import { fs } from './vfs.js';
import { registry } from './registry.js';

let zTop = 100;
let cascadeN = 0;
export const openWins = [];
const TITLE_COLORS = {
  folder:   { bar: '#55FFFF', border: '#00AAAA' },
  text:     { bar: '#FFFF55', border: '#AA5500' },
  doc:      { bar: '#55FF55', border: '#00AA00' },
  image:    { bar: '#FF55FF', border: '#AA00AA' },
  video:    { bar: '#FF5555', border: '#AA0000' },
  app:      { bar: '#FF55FF', border: '#AA00AA' },
  panic:    { bar: '#FF5555', border: '#FF5555' },
  terminal: { bar: '#AAAAAA', border: '#FFFFFF' }
};

// Dummy Snd for Phase 2 kernel skeleton. It gets overwritten or we just keep it dummy until apps port.
const Snd = { min:()=>{}, open:()=>{}, select:()=>{}, close:()=>{}, grab:()=>{}, drop:()=>{} };
let taskSeq = 0;
function nextTaskId() { return ++taskSeq; }

function nextCascade(w, h) {
  const desk = document.getElementById('desktop');
  const maxX = Math.max(10, desk.clientWidth  - w - 10);
  const maxY = Math.max(10, desk.clientHeight - h - 10);
  const x = Math.min(120 + cascadeN * 25, maxX);
  const y = Math.min(30  + cascadeN * 25, maxY);
  cascadeN = (cascadeN + 1) % 9;
  return { x: x, y: y };
}

export function raise(win) {
  zTop++;
  win.style.zIndex = zTop;
  openWins.forEach(o => o.btn.classList.toggle('active', o.win === win));
}

export function createWindow(opts) {
  const desk = document.getElementById('desktop');
  const w = Math.min(opts.w || 640, desk.clientWidth  - 20);
  const h = Math.min(opts.h || 480, desk.clientHeight - 20);

  const win = document.createElement('div');
  win.className = 'win';
  win.style.width = w + 'px';
  win.style.height = h + 'px';

  const pos = nextCascade(w, h);
  win.style.left = pos.x + 'px';
  win.style.top  = pos.y + 'px';

  if (opts.kind === 'panic') win.classList.add('panic');

  const skin = TITLE_COLORS[opts.kind] || TITLE_COLORS.text;
  win.style.borderColor = skin.border;

  const bar = document.createElement('div');
  bar.className = 'titlebar';
  bar.style.background = skin.bar;

  const t = document.createElement('span');
  t.className = 't';
  t.textContent = opts.title;

  const mbtn = document.createElement('span');
  mbtn.className = 'm';
  mbtn.textContent = '[_]';

  const x = document.createElement('span');
  x.className = 'x';
  x.textContent = '[X]';

  bar.appendChild(t);
  bar.appendChild(mbtn);
  bar.appendChild(x);

  const body = document.createElement('div');
  body.className = 'wbody';

  if (opts.build) opts.build(body);

  const grip = document.createElement('div');
  grip.className = 'grip';
  if (opts.resizable === false) grip.style.display = 'none';

  win.appendChild(bar);
  win.appendChild(body);
  win.appendChild(grip);
  desk.appendChild(win);

  const btn = document.createElement('div');
  btn.className = 'tbtn';
  btn.textContent = opts.title;
  document.getElementById('tasks').appendChild(btn);

  function minimize() {
    win.classList.add('hidden');
    btn.classList.add('min');
    btn.classList.remove('active');
    Snd.min();
  }

  function unminimize() {
    win.classList.remove('hidden');
    btn.classList.remove('min');
    raise(win);
    Snd.open();
  }

  mbtn.addEventListener('mousedown', ev => { ev.stopPropagation(); minimize(); });
  btn.addEventListener('mousedown', () => {
    if (win.classList.contains('hidden')) unminimize();
    else if (btn.classList.contains('active')) minimize();
    else { raise(win); Snd.select(); }
  });

  const rec = { win: win, btn: btn, title: opts.title, kind: opts.kind || 'text',
                id: nextTaskId(), born: Date.now(), close: null };
  openWins.push(rec);

  win.addEventListener('mousedown', () => raise(win));

  function closeWin() {
    win.remove();
    btn.remove();
    const i = openWins.indexOf(rec);
    if (i >= 0) openWins.splice(i, 1);
    Snd.close();
  }
  rec.close = closeWin;

  x.addEventListener('mousedown', ev => { ev.stopPropagation(); closeWin(); });

  let dragging = false, offX = 0, offY = 0;
  bar.addEventListener('mousedown', ev => {
    if (ev.target === x || ev.target === mbtn) return;
    const r = desk.getBoundingClientRect();
    dragging = true;
    offX = ev.clientX - r.left - win.offsetLeft;
    offY = ev.clientY - r.top  - win.offsetTop;
    Snd.grab();
    ev.preventDefault();
  });

  let sizing = false, sx = 0, sy = 0, sw = 0, sh = 0;
  grip.addEventListener('mousedown', ev => {
    ev.stopPropagation();
    ev.preventDefault();
    sizing = true;
    sx = ev.clientX; sy = ev.clientY;
    sw = win.offsetWidth; sh = win.offsetHeight;
    raise(win);
    Snd.grab();
  });

  document.addEventListener('mousemove', ev => {
    if (dragging) {
      const r = desk.getBoundingClientRect();
      const maxX = desk.clientWidth  - 40;
      const maxY = desk.clientHeight - 24;
      const nx = Math.max(-(win.offsetWidth - 60), Math.min(ev.clientX - r.left - offX, maxX));
      const ny = Math.max(0, Math.min(ev.clientY - r.top - offY, maxY));
      win.style.left = nx + 'px';
      win.style.top  = ny + 'px';
    } else if (sizing) {
      const nw = Math.max(180, Math.min(sw + ev.clientX - sx, desk.clientWidth  - win.offsetLeft));
      const nh = Math.max(90,  Math.min(sh + ev.clientY - sy, desk.clientHeight - win.offsetTop));
      win.style.width  = nw + 'px';
      win.style.height = nh + 'px';
    }
  });

  document.addEventListener('mouseup', () => {
    if (dragging || sizing) Snd.drop();
    dragging = false;
    sizing = false;
  });

  raise(win);
  Snd.open();

  return { win: win, body: body, title: t, btn: btn, close: closeWin };
}

export async function openWindow(appId, args = {}) {
  if (!registry[appId]) throw new Error('App not found');
  const mod = await registry[appId]();
  const app = mod.default;
  
  const made = createWindow({
    kind: 'app', 
    title: args.path || app.title, 
    w: app.width || 640, 
    h: app.height || 480, 
    resizable: app.resizable
  });
  
  const ctx = {
    fs,
    save: async (key, val) => {
      localStorage.setItem(`app_${appId}_${key}`, JSON.stringify(val));
    },
    load: async (key) => {
      const v = localStorage.getItem(`app_${appId}_${key}`);
      return v ? JSON.parse(v) : null;
    },
    openWindow,
    close: () => {
      if (app.unmount) app.unmount();
      made.close();
    }
  };
  
  // Override close behavior to trigger unmount
  const oldClose = made.close;
  made.close = () => {
    if (app.unmount) app.unmount();
    oldClose();
  };
  // Hook the close button again to ensure unmount runs if user clicks X
  made.win.querySelector('.x').addEventListener('mousedown', ev => { 
    ev.stopPropagation(); 
    // We already added closeWin in createWindow, wait it will call the old one.
    // Let's actually patch rec.close, or just intercept x button.
    // simpler: 
  }, { capture: true }); 
  
  // Actually the best way is to monkeypatch the returned close function if we can, but x button uses the internal closeWin.
  // We can just find the 'x' button and replace its event listener.
  const xbtn = made.win.querySelector('.x');
  const xclone = xbtn.cloneNode(true);
  xbtn.replaceWith(xclone);
  xclone.addEventListener('mousedown', ev => { ev.stopPropagation(); made.close(); });
  
  app.mount(made.body, ctx, args);
}
