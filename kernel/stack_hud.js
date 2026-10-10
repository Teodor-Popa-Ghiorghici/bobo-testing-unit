/* window.StackHud: the little control that stands in the bottom right corner of the glass while THE STACK is minimised. The music goes on when its window is put away; this is how you
   still reach volume, previous, play, next, repeat, shuffle and the place in the disc without bringing the window back. Three sizes (S: one line; M: the disc, the buttons and the bar; L: the
   cover as well), the size and the place are remembered, it can be dragged by its title, and the media keys work while it is there. It only ever talks to `window.StackRemote`
   (apps/hifi/remote.js), which the Stack puts up while it is open: with no Stack there is nothing here. The arithmetic is kernel/stack_hud_model.js (scripts/check-stackhud.mjs). */
import { openWins } from './wm.js';
import * as M from './stack_hud_model.js';

const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
let box = null, st = M.load(), dismissed = false, timer = 0, refs = null, lastKey = '', lastFace = '', onKey = null;

const remote = () => window.StackRemote || null;
const stackRec = () => openWins.find(r => r.appId === 'hifi') || null;
const shownNow = () => !dismissed && M.wanted(openWins.map(r => ({ appId: r.appId, minimised: r.win.classList.contains('hidden') }))) && !!remote();

function place() {
  const sh = document.getElementById('shell'); if (!sh || !box) return;
  const p = M.clampPos(st, st.size, { w: sh.clientWidth, h: sh.clientHeight });
  st.right = p.right; st.bottom = p.bottom;
  box.style.right = p.right + 'px'; box.style.bottom = p.bottom + 'px';
}

/* the buttons call the remote as it is when they are pressed */
function btn(txt, label, run, cls) {
  const b = el('button', 'sh-b' + (cls ? ' ' + cls : ''), txt); b.type = 'button'; b.title = label; b.setAttribute('aria-label', label);
  b.addEventListener('mousedown', ev => ev.stopPropagation());
  b.addEventListener('click', ev => { ev.stopPropagation(); const r = remote(); if (r) { run(r); update(true); } });
  return b;
}
function bar(onFrac) {
  const b = el('div', 'sh-bar'), f = el('i'); b.appendChild(f); b.setAttribute('role', 'slider'); b.setAttribute('aria-label', 'Position in the disc');
  const at = ev => { const r = b.getBoundingClientRect(); onFrac(M.fracAt(ev.clientX, r.left, r.width)); };
  b.addEventListener('pointerdown', ev => { ev.stopPropagation(); try { b.setPointerCapture(ev.pointerId); } catch (e) { /* no capture */ } at(ev); b.onpointermove = at; });
  b.addEventListener('pointerup', () => { b.onpointermove = null; });
  return { b, f };
}
function vol() {
  const v = el('input', 'sh-vol'); v.type = 'range'; v.min = 0; v.max = 100; v.step = 1; v.title = 'VOLUME'; v.setAttribute('aria-label', 'Volume');
  v.addEventListener('mousedown', ev => ev.stopPropagation());
  v.addEventListener('input', () => { const r = remote(); if (r) { r.setVol(v.value / 100); if (refs && refs.pct) refs.pct.textContent = v.value; } });
  return v;
}
const open = () => { const r = stackRec(); if (r) r.restore(); };
function sizes() {
  const g = el('span', 'sh-sizes');
  M.SIZES.forEach(s => { const b = el('button', 'sh-b sh-sz' + (st.size === s ? ' on' : ''), s.toUpperCase()); b.type = 'button'; b.title = M.sizeName(s) + ' SIZE'; b.setAttribute('aria-label', M.sizeName(s) + ' size'); b.addEventListener('mousedown', ev => ev.stopPropagation()); b.addEventListener('click', ev => { ev.stopPropagation(); setSize(s); }); g.appendChild(b); });
  return g;
}
const header = () => {
  const h = el('div', 'sh-head sh-grip'); h.appendChild(el('b', null, 'THE STACK')); h.appendChild(el('span', 'sp'));
  h.appendChild(sizes()); h.appendChild(btn('OPEN', 'BRING THE STACK BACK', open, 'sh-open')); h.appendChild(btn('✕', 'PUT THIS AWAY UNTIL THE STACK IS MINIMISED AGAIN', () => { dismissed = true; sync(); }, 'sh-x'));
  return h;
};

function build() {
  box.textContent = ''; box.className = 'sthud sh-' + st.size; refs = {}; lastKey = ''; lastFace = '';
  const prev = btn('|◄', 'PREVIOUS', r => r.prev()), play = btn('▶', 'PLAY / PAUSE (SPACE ON THE FACE)', r => r.toggle(), 'sh-play'), next = btn('►|', 'NEXT', r => r.next());
  const rpt = btn('RPT', 'REPEAT: OFF, ALL, ONE', r => r.repeat(), 'sh-t'), shf = btn('SHF', 'SHUFFLE', r => r.shuffle(), 'sh-t');
  Object.assign(refs, { play, rpt, shf, v: vol() });
  const seek = bar(fr => { const r = remote(); if (r) { r.seek(fr); update(true); } });
  refs.f = seek.f;
  if (st.size === 's') {
    const t = el('span', 'sh-line1 sh-grip'); refs.t = el('b'); refs.a = el('i'); t.append(refs.t, refs.a); t.title = 'DRAG TO MOVE';
    const sz = btn('⤢', 'A BIGGER CONTROL (SMALL, MEDIUM, LARGE)', () => setSize(M.nextSize(st.size)), 'sh-sz1');
    box.append(t, prev, play, next, refs.v, sz, btn('✕', 'PUT THIS AWAY UNTIL THE STACK IS MINIMISED AGAIN', () => { dismissed = true; sync(); }, 'sh-x'));
    const line = el('div', 'sh-line'); line.appendChild(refs.f); box.appendChild(line);
    return;
  }
  box.appendChild(header());
  const info = el('div', 'sh-info'); refs.t = el('b'); refs.a = el('i'); refs.al = el('i', 'sh-al'); info.append(refs.t, refs.a);
  refs.tm = el('span', 'sh-tm'); refs.du = el('span', 'sh-tm r');
  const row = el('div', 'sh-row'); row.append(prev, play, next, rpt, shf);
  const vrow = el('div', 'sh-vrow'); refs.pct = el('span', 'sh-pct'); vrow.append(el('span', null, 'VOL'), refs.v, refs.pct);
  const prog = el('div', 'sh-prog'); prog.append(refs.tm, seek.b, refs.du);
  if (st.size === 'm') { row.appendChild(vrow); box.append(info, row, prog); return; }
  /* L: the cover as well, and the words for the switches */
  const art = el('img', 'sh-art'); art.alt = ''; art.draggable = false; refs.art = art;
  const side = el('div', 'sh-side'); side.append(info, row, prog, vrow);
  const body = el('div', 'sh-body'); body.append(art, side); box.appendChild(body);
}

function update(force) {
  const r = remote(); if (!r || !refs || !box) return;
  const s = r.state();
  const face = [s.title, s.artist, s.album, s.playing, s.repeat, s.shuffle, s.key].join('|');
  if (force || face !== lastFace) {
    lastFace = face;
    refs.t.textContent = s.title; refs.a.textContent = st.size === 's' ? (s.artist ? '· ' + s.artist : '') : [s.artist, s.album].filter(Boolean).join('  ·  ');
    refs.play.textContent = s.playing ? '||' : '▶'; refs.play.classList.toggle('on', s.playing);
    box.classList.toggle('playing', s.playing);
    if (refs.rpt) { refs.rpt.textContent = st.size === 'l' ? M.RPT[s.repeat] : M.rptShort(s.repeat); refs.rpt.classList.toggle('on', s.repeat > 0); }
    if (refs.shf) { refs.shf.textContent = st.size === 'l' ? 'SHUFFLE ' + (s.shuffle ? 'ON' : 'OFF') : 'SHF'; refs.shf.classList.toggle('on', s.shuffle); }
    box.title = s.title + (s.artist ? '  ·  ' + s.artist : '');
    if (refs.art) { const u = r.thumb(url => { if (refs && refs.art) refs.art.src = url; }); if (u) refs.art.src = u; else refs.art.removeAttribute('src'); }
  }
  refs.f.style.width = (s.dur ? Math.min(100, s.pos / s.dur * 100) : 0) + '%';
  if (refs.tm) { refs.tm.textContent = M.mmss(s.pos); refs.du.textContent = M.mmss(s.dur); }
  if (document.activeElement !== refs.v) { const v = Math.round(s.vol * 100); if (+refs.v.value !== v) refs.v.value = v; }
  if (refs.pct) refs.pct.textContent = Math.round(s.vol * 100);
}

function setSize(s) {
  st.size = s; M.save(st); build(); place(); update(true);
}

/* dragging by the title */
function wireDrag() {
  box.addEventListener('pointerdown', ev => {
    const g = ev.target.closest && ev.target.closest('.sh-grip'); if (!g || ev.target.closest('button')) return;
    const sh = document.getElementById('shell'), k = sh.getBoundingClientRect().width / (sh.clientWidth || 1) || 1;
    const x0 = ev.clientX, y0 = ev.clientY, r0 = st.right, b0 = st.bottom;
    const move = e => { st.right = r0 - (e.clientX - x0) / k; st.bottom = b0 - (e.clientY - y0) / k; place(); };
    const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); M.save(st); };
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
    ev.preventDefault();
  });
}

function sync() {
  const want = shownNow();
  if (!want) { if (box && box.parentNode) { box.remove(); } stopTimers(); if (!stackRec() || !stackRec().win.classList.contains('hidden')) dismissed = false; return; }
  const sh = document.getElementById('shell'); if (!sh) return;
  if (!box) { box = el('div', 'sthud'); box.id = 'stackhud'; box.addEventListener('mousedown', ev => ev.stopPropagation()); wireDrag(); }
  if (!box.parentNode) { sh.appendChild(box); build(); place(); update(true); }
  if (!timer) timer = setInterval(() => { if (!shownNow()) { sync(); return; } update(false); }, 200);
  if (!onKey) {
    onKey = ev => { const a = M.KEYS[ev.key], r = remote(); if (!a || !r) return; ev.preventDefault(); r[a](); update(true); };
    document.addEventListener('keydown', onKey);
  }
}
function stopTimers() {
  if (timer) { clearInterval(timer); timer = 0; }
  if (onKey) { document.removeEventListener('keydown', onKey); onKey = null; }
  refs = null;
}

window.addEventListener('wins-changed', sync);
window.addEventListener('resize', () => { if (box && box.parentNode) place(); });
export const StackHud = { shown: () => !!(box && box.parentNode), size: () => st.size, setSize, sync };
window.StackHud = StackHud;
