import { fs } from './vfs.js';
import './vfs_ops.js';
import { registry } from './registry.js';
import { Snd } from './snd.js';
import { lampDip } from './hardware.js';
import { Cos } from './cos.js';
import { attachZoom } from './zoom.js';
import { attachFit } from './canvas_fit.js';
import { Studio } from './studio.js';
import { sys } from './trophy_hook.js';
import { TITLE_COLORS } from './win_skins.js';
import { remembers, place as placeOf, load as loadPlaces, write as writePlaces, remember as rememberPlace } from './win_place.js';
import { link as linkPalette, unlink as unlinkPalette, group as paletteGroup, follow as paletteFollow, closeAll as closePalettes } from './palette.js';

/* every window goes back to the cascade (the launcher's FORGET WHERE WINDOWS WERE LEFT) */
export function forgetPlaces() { writePlaces({}); }

let zTop = 100;
let cascadeN = 0;
export const openWins = [];
export const GAME_IDS = new Set(['bekkedal', 'standbattle', 'magen', 'aftere', 'cook', 'solitaire', 'sweeper', 'garden', 'bottle', 'defrag']);

/* the mixer (and anything else that cares what is running) listens for this
   instead of polling the window list */
export function announceWins() {
  try { window.dispatchEvent(new CustomEvent('wins-changed')); } catch (e) {}
}

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

/* Windows live in the band Z_BASE..Z_MAX, below the menu bar and taskbar (400), the pop-up menus (450) and the trophy card (470). raise() used to
   add one to the counter on every mousedown for ever, so after a few hundred clicks a window sat over the menus: a right-click menu opened *behind*
   the thing that was clicked. A window that is already in front is left alone, and when the band is full the windows are renumbered in their order. */
const Z_BASE = 100, Z_MAX = 380;
function compactZ() {
  const live = openWins.slice().sort((a, b) => (+a.win.style.zIndex || 0) - (+b.win.style.zIndex || 0));
  live.forEach((o, i) => { o.win.style.zIndex = Z_BASE + 1 + i; });
  zTop = Z_BASE + live.length;
}
export function raise(win) {
  /* a palette is raised with its owner (kernel/palette.js): the group goes up together, the owner first and the one touched last, and the owner is the active window */
  const set = paletteGroup(win), top = set[set.length - 1];
  if (!(+top.style.zIndex && +top.style.zIndex === zTop)) {
    if (zTop + set.length - 1 >= Z_MAX) compactZ();
    set.forEach(w => { zTop++; w.style.zIndex = zTop; });
  }
  openWins.forEach(o => o.btn.classList.toggle('active', o.win === set[0]));
}

export function createWindow(opts) {
  const desk = document.getElementById('desktop');
  let w = Math.min(opts.w || 640, desk.clientWidth  - 20);
  let h = Math.min(opts.h || 480, desk.clientHeight - 20);
  /* a palette (opts.owner: the element of the window it belongs to) is put where it is asked, never in the cascade */
  const palette = !!opts.owner;
  /* an app that opens once goes where it was last left, at the size it was last made (kernel/win_place.js) */
  const kept = !palette && !opts.at && remembers(opts.appId) ? placeOf(loadPlaces()[opts.appId], { w: desk.clientWidth, h: desk.clientHeight }, { w, h }, opts.resizable !== false) : null;
  if (kept) { w = kept.w; h = kept.h; }

  const win = document.createElement('div');
  win.className = 'win';
  win.style.width = w + 'px';
  win.style.height = h + 'px';

  const pos = opts.at || (kept ? { x: kept.x, y: kept.y } : nextCascade(w, h));
  win.style.left = pos.x + 'px';
  win.style.top  = pos.y + 'px';

  if (opts.kind === 'panic') win.classList.add('panic');
  /* a game's window (the mixer, the trophies and a few checks ask which are games) */
  if (opts.appId && GAME_IDS.has(opts.appId)) win.dataset.game = '1';

  /* a colour scheme dresses NOTES and nothing else: on a Notes window the bar is filtered by theme.css and the edge coloured by Cos.dressFrame from this VGA colour; every other window keeps it */
  const skin = TITLE_COLORS[opts.kind] || TITLE_COLORS.text;
  win.style.borderColor = skin.border;
  win.dataset.edge = skin.border;

  const bar = document.createElement('div');
  bar.className = 'titlebar';
  bar.style.background = skin.bar;

  const t = document.createElement('span');
  t.className = 't';
  t.textContent = opts.title;

  const mbtn = document.createElement('span');
  mbtn.className = 'm';
  mbtn.textContent = '[_]';

  const fbtn = document.createElement('span');
  fbtn.className = 'f';
  fbtn.textContent = '[\u25A1]';
  fbtn.title = 'FULLSCREEN. Fill the desktop. F11 or double-click the title bar also works.';

  const x = document.createElement('span');
  x.className = 'x';
  x.textContent = '[X]';

  bar.appendChild(t);
  if (palette) linkPalette(win, opts.owner);

  /* [T]: this window's own scheme. The choice is kept per app (templeos.wintheme.v1), so the next time that app opens it wears it again. */
  let winScheme = null;
  const THEME_KEY = 'templeos.wintheme.v1';
  const themes = () => { try { return JSON.parse(localStorage.getItem(THEME_KEY)) || {}; } catch (e) { return {}; } };
  const wear = id => {
    winScheme = id || null;
    Cos.applyWinScheme(win, winScheme);
    th && th.classList.toggle('on', !!winScheme);
    const app = (rec && rec.appId) || opts.appId;
    if (app) { const m = themes(); if (winScheme) m[app] = winScheme; else delete m[app]; try { localStorage.setItem(THEME_KEY, JSON.stringify(m)); } catch (e) { /* kept for this sitting */ } }
  };
  let th = null;
  if (opts.appId) win.dataset.app = opts.appId;
  if (opts.appId === 'notes' && !palette) {          /* a colour scheme dresses Notes and nothing else (kernel/theme_fx.js): [T] is Notes' own */
    th = document.createElement('span');
    th.className = 'th';
    th.textContent = '[T]';
    th.title = 'NOTES: wear one of your colour schemes in just this window (its frame and its page). It remembers. Notes is the only thing a scheme dresses.';
    th.addEventListener('mousedown', async ev => {
      ev.stopPropagation();
      if (ev.button !== 0) return;
      if (window.Snd) window.Snd.click();
      const { showMenu } = await import('./desktop.js');
      const schemes = Cos.owned('scheme');
      const items = [{ label: winScheme ? 'SYSTEM DEFAULT' : '> SYSTEM DEFAULT', run: () => wear(null) }, { sep: true }];
      schemes.forEach(id => {
        const sc = Cos.find('scheme', id);
        if (!sc) return;
        items.push({ label: (winScheme === id ? '> ' : '') + sc.name, run: () => wear(id) });
      });
      if (schemes.length < 2) items.push({ sep: true }, { label: 'ONLY ONE SCHEME. DAVE HAS MORE...', run: () => openWindow('shop', { tab: 'scheme' }).catch(() => {}) });
      const r = th.getBoundingClientRect();
      showMenu(document.getElementById('ctxmenu'), r.left, r.bottom, items);
    });
    bar.appendChild(th);
    { const mine = themes()[opts.appId]; if (mine && Cos.has('scheme', mine)) setTimeout(() => wear(mine), 0); }
  }

  bar.appendChild(mbtn);
  bar.appendChild(fbtn);
  bar.appendChild(x);

  const body = document.createElement('div');
  body.className = 'wbody';
  let rec = null;                 /* the window's entry in openWins, below */

  if (opts.build) opts.build(body);

  const grip = document.createElement('div');
  grip.className = 'grip';
  if (opts.resizable === false) grip.style.display = 'none';

  win.appendChild(bar);
  win.appendChild(body);
  win.appendChild(grip);
  desk.appendChild(win);

  /* a picture (put on by kernel/taskbar.js once the app is known), then the name: crowded, the name goes and the picture stays */
  const btn = document.createElement('div');
  btn.className = 'tbtn';
  const tico = document.createElement('i'); tico.className = 'tico';
  const tlbl = document.createElement('span'); tlbl.className = 'tl'; tlbl.textContent = opts.title;
  btn.title = opts.title;
  btn.append(tico, tlbl);
  if (!palette) document.getElementById('tasks').appendChild(btn);        /* a palette is not on the taskbar: its owner is */

  function minimize() {
    paletteFollow(win, true);
    win.classList.add('hidden');
    btn.classList.add('min');
    btn.classList.remove('active');
    Snd.min();
    announceWins();                                  /* the Stack's control on the desktop (stack_hud.js) shows while it is put away */
  }

  function unminimize() {
    paletteFollow(win, false);
    win.classList.remove('hidden');
    btn.classList.remove('min');
    raise(win);
    Snd.open();
    announceWins();
  }

  /* ---- fullscreen -------------------------------------------------------
     Every window can fill the desktop. A window whose app lays itself out
     off its own size (flagged data-fluid, or any plain DOM layout) is simply
     given the room. A canvas game that draws at a fixed size is instead kept
     at the size it was built for and scaled to fit, so a 960x540 field is
     never a postage stamp in the middle of a big black pane. */
  /* A window is "a canvas" when its picture IS the window: a pane that holds one (.gamepane, .godpane,
     .vidpane: the classes theme.css centres a picture in) or a canvas that is the body's own child. A window
     that merely has canvases in it (the shop's card thumbnails, Magen's star, a Crayon swatch) is a layout
     and is given the room, not scaled up like a picture, which is what used to push the shop off its own
     title bar. */
  const isCanvasWindow = b => [...b.children].some(c => c.tagName === 'CANVAS' ||
    c.classList.contains('gamepane') || c.classList.contains('godpane') || c.classList.contains('vidpane'));
  let full = false, saved = null, panX = 0.5, panY = 0.5;
  const fitScaled = () => {
    if (!full || !win.classList.contains('scaled')) return;
    const th = bar.offsetHeight;
    const aw = desk.clientWidth - 4, ah = desk.clientHeight - th - 4;
    /* the zoom is a multiplier on the fit; past the screen the picture follows the pointer */
    const k = Math.min(aw / saved.bw, ah / saved.bh) * (zoom ? zoom.get() : 1);
    const gx = aw - saved.bw * k, gy = ah - saved.bh * k;
    body.style.width = saved.bw + 'px';
    body.style.height = saved.bh + 'px';
    body.style.transform = 'translate(' + (gx >= 0 ? gx / 2 : gx * panX) + 'px,' +
      (gy >= 0 ? gy / 2 : gy * panY) + 'px) scale(' + k + ')';
  };
  const follow = ev => {
    if (!full || !win.classList.contains('scaled')) return;
    const r = body.parentNode.getBoundingClientRect(), th = bar.offsetHeight;
    panX = Math.max(0, Math.min(1, (ev.clientX - r.left) / Math.max(1, r.width)));
    panY = Math.max(0, Math.min(1, (ev.clientY - r.top - th) / Math.max(1, r.height - th)));
    if (zoom && zoom.get() > 1) fitScaled();
  };
  win.addEventListener('pointermove', follow, true);
  function setFull(on) {
    if (on === full) return;
    if (win.classList.contains('hidden')) return;
    if (on) {
      sys.sit('full');
      const fluid = body.dataset.fluid === '1';
      const fixedCanvas = !fluid && isCanvasWindow(body);
      /* the browser's zoom comes off first, so the size measured is the window's own */
      if (fixedCanvas && zoom) zoom.scaled(true);
      saved = { l: win.style.left, t: win.style.top, w: win.style.width, h: win.style.height,
                bw: body.clientWidth, bh: body.clientHeight };
      win.classList.add('full');
      if (fixedCanvas) win.classList.add('scaled');
      fbtn.textContent = '[\u25A3]';
      full = true;
      panX = panY = 0.5;
      fitScaled();
    } else {
      win.classList.remove('full', 'scaled');
      body.style.width = body.style.height = body.style.transform = '';
      win.style.left = saved.l; win.style.top = saved.t;
      win.style.width = saved.w; win.style.height = saved.h;
      fbtn.textContent = '[\u25A1]';
      full = false;
      if (zoom) zoom.scaled(false);
    }
    raise(win);
    Snd.open();
    /* anything that sizes itself off the window gets to hear about it */
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }
  const toggleFull = () => setFull(!full);
  const fit = attachFit(win, body, () => full);
  fbtn.addEventListener('mousedown', ev => { ev.stopPropagation(); toggleFull(); });
  bar.addEventListener('dblclick', ev => {
    if (palette) return;
    if (ev.target === x || ev.target === mbtn || ev.target === fbtn || ev.target.className === 'th' || ev.target.className === 'z') return;
    toggleFull();
  });
  window.addEventListener('resize', fitScaled);
  const zoom = opts.zoomable === false || palette ? null : attachZoom({
    win, body, bar, before: bar.querySelector('.th') || mbtn,
    key: () => (rec && rec.appId) || opts.appId || null,
    isActive: () => btn.classList.contains('active') && !win.classList.contains('hidden')
  });
  const onKey = ev => {
    if (palette || ev.key !== 'F11' || !btn.classList.contains('active') || win.classList.contains('hidden')) return;
    ev.preventDefault();
    toggleFull();
  };
  document.addEventListener('keydown', onKey);

  mbtn.addEventListener('mousedown', ev => { ev.stopPropagation(); minimize(); });
  btn.addEventListener('mousedown', ev => {
    if (ev.button !== 0) return;                       /* a right or middle press is the taskbar's menu and close (kernel/taskbar.js), not a click */
    if (win.classList.contains('hidden')) unminimize();
    else if (btn.classList.contains('active')) minimize();
    else { raise(win); Snd.select(); }
  });

  rec = { win: win, btn: btn, title: opts.title, kind: opts.kind || 'text', palette: palette,
          appId: opts.appId || null, id: nextTaskId(), born: Date.now(), close: null,
          setFull: setFull, toggleFull: toggleFull, rightClick: !!opts.rightClick,
          restore: () => { if (win.classList.contains('hidden')) unminimize(); else raise(win); },      /* what the taskbar button does to a window that is put away, for whoever else wants it back */
          minimize: () => { if (!win.classList.contains('hidden')) minimize(); }, unminimize: () => { if (win.classList.contains('hidden')) unminimize(); } };
  openWins.push(rec);
  announceWins();

  win.addEventListener('mousedown', () => raise(win));
  /* An app that does nothing with a right-click must not be clicked by one:
     the right button never reaches it (the window still comes forward).
     Apps that use it say so with `rightClick: true`. The contextmenu event
     itself is left alone, so an app can still make its own menu. */
  ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'auxclick'].forEach(type =>
    win.addEventListener(type, ev => {
      if (ev.button !== 2 || rec.rightClick) return;
      ev.stopPropagation();
      if (type === 'mousedown') raise(win);
    }, true));

  function closeWin(withOwner) {
    closePalettes(win);
    if (palette) unlinkPalette(win);
    win.remove();
    btn.remove();
    const i = openWins.indexOf(rec);
    if (i >= 0) openWins.splice(i, 1);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', fitScaled);
    if (zoom) zoom.dispose();
    fit.dispose();
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    Snd.close();
    announceWins();
    if (opts.onClose) opts.onClose({ withOwner: withOwner === true });
  }
  rec.close = closeWin;
  win._close = closeWin;

  x.addEventListener('mousedown', ev => { ev.stopPropagation(); closeWin(); });

  /* where it was left, for next time */
  function keepPlace() {
    const app = (rec && rec.appId) || opts.appId;
    if (palette || full || opts.at || !remembers(app)) return;
    writePlaces(rememberPlace(loadPlaces(), app, { x: win.offsetLeft, y: win.offsetTop, w: win.offsetWidth, h: win.offsetHeight }));
  }
  let dragging = false, offX = 0, offY = 0;
  bar.addEventListener('mousedown', ev => {
    if (ev.target === x || ev.target === mbtn || ev.target === fbtn || full) return;
    const r = desk.getBoundingClientRect();
    dragging = true;
    offX = ev.clientX - r.left - win.offsetLeft;
    offY = ev.clientY - r.top  - win.offsetTop;
    Snd.grab();
    ev.preventDefault();
  });

  let sizing = false, sx = 0, sy = 0, sw = 0, sh = 0;
  grip.addEventListener('mousedown', ev => {
    if (full) return;
    ev.stopPropagation();
    ev.preventDefault();
    sizing = true;
    sx = ev.clientX; sy = ev.clientY;
    sw = win.offsetWidth; sh = win.offsetHeight;
    raise(win);
    Snd.grab();
  });

  const onMove = ev => {
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
  };
  const onUp = () => {
    if (sizing) sys.sit('resize');
    if (dragging || sizing) { Snd.drop(); keepPlace(); }
    dragging = false;
    sizing = false;
  };
  /* these two used to be added for every window and never taken off again */
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);

  Cos.dressFrame(win);
  raise(win);
  Snd.open();

  return { win: win, body: body, title: t, btn: btn, close: closeWin };
}

/* Most apps are one thing and open once: a second click on the Elephant brings the first to the front (from the taskbar if it is put away), it
   does not make a second elephant. Only the apps that are about a file or a place can be open several times: a folder, a terminal, a text in the
   editor, a picture in the viewer, and an installed HolyC program's own player. An app that was asked something by the second click (the shop's shelf,
   the ledger's trophy, a song for the Garage) hears it as an 'app-reopen' event with the args. */
const MULTI = { placeholder: 1, folder: 1, terminal: 1, editor: 1, viewer: 1 };
const opening = new Set();
const isMulti = (appId, args) => !!MULTI[appId] || (appId === 'holyc' && !!(args && args.run));
function reopen(rec, appId, args) {
  if (rec.win.classList.contains('hidden')) rec.btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  else { raise(rec.win); Snd.select(); }
  try { window.dispatchEvent(new CustomEvent('app-reopen', { detail: { appId: appId, args: args || {}, rec: rec } })); } catch (e) { /* nobody is listening */ }
}

export async function openWindow(appId, args = {}) {
  if (!registry[appId]) throw new Error('App not found');
  if (!isMulti(appId, args)) {
    const there = openWins.find(r => r.appId === appId);
    if (there) { reopen(there, appId, args); return; }
    if (opening.has(appId)) return;                       /* a double click: the first is still being made */
    opening.add(appId);
    try { return await openNew(appId, args); } finally { opening.delete(appId); }
  }
  /* the same folder, text or picture twice is the same window */
  const same = args && args.path && appId !== 'terminal' ? openWins.find(r => r.appId === appId && r.title === args.path) : null;
  if (same) { reopen(same, appId, args); return; }
  return openNew(appId, args);
}

async function openNew(appId, args) {
  const mod = await registry[appId]();
  const app = mod.default;
  if (app.open) {
    /* these make their own window; tag whatever they open with the app's id
       so the mixer knows who is running */
    const before = openWins.slice();
    const res = await app.open(args);
    openWins.forEach(r => { if (before.indexOf(r) < 0 && !r.appId && !r.palette) { r.appId = appId; r.rightClick = r.rightClick || !!app.rightClick; if (r.win && r.win.dataset) r.win.dataset.app = appId; } });
    announceWins();
    return res;
  }
  
  const made = createWindow({
    kind: 'app',
    title: args.path || app.title,
    w: app.width || 640,
    h: app.height || 480,
    resizable: app.resizable,
    appId: appId,
    rightClick: !!app.rightClick
  });
  
  if (app.fluid) made.body.dataset.fluid = '1';
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
    studio: Studio,
    trophy: window.Trophies ? window.Trophies.scope(appId) : null,
    toast,
    ask: (title, def, cb) => askName(title, def, cb),
    setTitle: t => { made.title.textContent = t; const l = made.btn.querySelector('.tl'); if (l) l.textContent = t; made.btn.title = t; },
    close: () => made.close()
  };

  /* closing is one thing, however it is asked for (the X, ctx.close, the Tasks window, a middle click on the taskbar): unmount() once, then the window goes */
  const oldClose = made.close;
  let closed = false;
  made.close = w => {
    if (closed) return;
    closed = true;
    if (app.unmount) app.unmount();
    oldClose(w);
  };
  { const mine = openWins.find(r => r.win === made.win); if (mine) mine.close = made.close; }
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

let toastTimer = null;
export function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  Snd.blip();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.display = 'none'; }, 3200);
}

export function sysDialog(title, msg, opts) {
  opts = opts || {};
  const h = {};
  const made = createWindow({
    kind: opts.kind || 'terminal', title: title,
    w: opts.w || 400, h: opts.h || (msg.split('\\n').length * 21 + 74),
    build: body => {
      const p = document.createElement('div');
      p.className = 'sysdlg';
      const m = document.createElement('div');
      m.className = 'msg';
      m.textContent = msg;
      const row = document.createElement('div');
      row.className = 'btns';
      p.appendChild(m);
      p.appendChild(row);
      body.appendChild(p);
      const mk = (label, fn) => {
        const b = document.createElement('button');
        b.textContent = label;
        b.addEventListener('mousedown', ev => { ev.stopPropagation(); if (window.Snd) window.Snd.click(); h.close(); if (fn) fn(); });
        row.appendChild(b);
        return b;
      };
      if (opts.confirm) { mk(opts.okLabel || 'OK', opts.onOk); mk('CANCEL', opts.onCancel); }
      else mk(opts.okLabel || 'OK', opts.onOk);
    }
  });
  h.close = made.close;
  if (opts.bad !== false && opts.confirm && window.Snd) window.Snd.err();
  return h;
}

/* a name-entry dialog, in-glass, for anything that used to be a native
   window.prompt() (new folder, save-as, ...) */
export function askName(title, def, cb) {
  const h = {};
  const made = createWindow({
    kind: 'text', title: title, w: 330, h: 136,
    build: body => {
      const p = document.createElement('div');
      p.className = 'dlgpane';
      const lbl = document.createElement('div');
      lbl.textContent = 'NAME:';
      const inp = document.createElement('input');
      inp.value = def;
      inp.spellcheck = false;
      const row = document.createElement('div');
      row.className = 'btns';
      const ok = document.createElement('button');
      ok.textContent = 'OK';
      const no = document.createElement('button');
      no.textContent = 'CANCEL';
      row.appendChild(ok);
      row.appendChild(no);
      p.appendChild(lbl);
      p.appendChild(inp);
      p.appendChild(row);
      body.appendChild(p);

      const accept = () => { if (window.Snd) window.Snd.click(); h.close(); cb(inp.value); };
      ok.addEventListener('mousedown', ev => { ev.stopPropagation(); accept(); });
      no.addEventListener('mousedown', ev => { ev.stopPropagation(); if (window.Snd) window.Snd.close(); h.close(); });
      inp.addEventListener('keydown', ev => {
        ev.stopPropagation();
        if (ev.key === 'Enter')  { accept(); return; }
        if (ev.key === 'Escape') { if (window.Snd) window.Snd.close(); h.close(); return; }
        if (window.Snd && (ev.key.length === 1 || ev.key === 'Backspace')) window.Snd.type();
      });
      setTimeout(() => { inp.focus(); inp.select(); }, 0);
    }
  });
  h.close = made.close;
  return h;
}
// appending to wm.js

window.toast = toast;
