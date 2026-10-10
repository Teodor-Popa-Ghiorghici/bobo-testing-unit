/* The elements the library is made of: a row, a tile, an album, a source in the sidebar. They only build and wire what they are given: what a click means is the caller's. */
import { coverUrl } from './album_cover.js';
export const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
export const mmss = s => { if (!isFinite(s) || s <= 0) return '--:--'; const m = Math.floor(s / 60), q = Math.floor(s % 60); return m + ':' + (q < 10 ? '0' : '') + q; };
export const clock = s => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? h + 'H ' + m + 'M' : m ? m + ' MIN' : s + ' SEC'; };

/* the little picture of a disc as an <img>: ready now, or as soon as it is made */
export function thumbImg(api, t, cls) {
  const im = el('img', cls); im.alt = ''; im.draggable = false;
  const u = api.thumb(t, url => { im.src = url; });
  if (u) im.src = u;
  return im;
}

const sub = t => [t.artist, t.album].filter(Boolean).join('  ·  ');
export function row(api, t, i, n, o) {
  const r = el('div', 'stl-row' + (o.sel ? ' sel' : '') + (o.now ? ' now' : '') + (t.missing ? ' missing' : ''));
  r.dataset.i = i; r.draggable = true;
  r.appendChild(el('span', 'n', String(n)));
  r.appendChild(thumbImg(api, t, 'th'));
  const tt = el('span', 'tt'); tt.appendChild(el('b', null, t.name)); tt.appendChild(el('i', null, sub(t))); tt.title = t.name + (sub(t) ? '\n' + sub(t) : '');
  r.appendChild(tt);
  r.appendChild(el('span', 'gn', t.genre || (t.builtin ? 'PRESSED' : '')));
  r.appendChild(el('span', 'yr', t.year ? String(t.year) : ''));
  const fv = el('span', 'fv' + (t.fav ? '' : ' off'), t.fav ? '♥' : '♡'); fv.dataset.fav = '1'; fv.title = 'FAVOURITE';
  r.appendChild(fv);
  r.appendChild(el('span', 'tm', mmss(t.dur)));
  return r;
}
export function head(cols, sortKey, desc) {
  const h = el('div', 'stl-head');
  cols.forEach(([label, key]) => { const s = el('span', key === sortKey ? 'cur' : '', label + (key === sortKey ? (desc ? ' ▼' : ' ▲') : '')); if (key) s.dataset.sort = key; h.appendChild(s); });
  return h;
}
export function tile(api, t, i, o) {
  const d = el('div', 'stl-tile' + (o.sel ? ' sel' : '') + (o.now ? ' now' : '')); d.dataset.i = i; d.draggable = true;
  const cv = el('div', 'cv'); cv.appendChild(thumbImg(api, t, '')); const pl = el('span', 'pl', '▶'); pl.dataset.play = '1'; cv.appendChild(pl);
  d.appendChild(cv); d.appendChild(el('b', null, t.name)); d.appendChild(el('i', null, sub(t))); d.title = t.name + '\n' + sub(t);
  return d;
}
/* an album's own picture as an <img> (its vault entry: album_meta.js), or null while it is being read */
export function coverImg(key) {
  const im = el('img'); im.alt = ''; im.draggable = false;
  const u = coverUrl(key, url => { im.src = url; });
  if (u) im.src = u;
  return im;
}
/* the picture at the head of an album's page: its own, or the first disc's */
export function albumPage(api, a, first) { return a.coverKey ? coverImg(a.coverKey) : thumbImg(api, first, ''); }
export function album(api, a, first, o) {
  const d = el('div', 'stl-alb' + (o.sel ? ' sel' : '') + (o.now ? ' now' : '') + (a.edited ? ' edited' : '')); d.dataset.k = a.key;
  const sl = el('div', 'sl'); sl.appendChild(el('div', 'cd')); const sv = el('div', 'sv'); sv.appendChild(a.coverKey ? coverImg(a.coverKey) : thumbImg(api, first, '')); sl.appendChild(sv); d.appendChild(sl);
  d.appendChild(el('b', null, a.name)); d.appendChild(el('i', null, [a.artist, a.idx.length + (a.idx.length === 1 ? ' DISC' : ' DISCS')].filter(Boolean).join('  ·  '))); d.title = a.name + '\n' + a.artist;
  return d;
}
export function source(id, label, count, o) {
  const s = el('div', 'stl-src' + (o.on ? ' on' : '')); s.dataset.src = id;
  const nm = el('span', 'nm'); if (o.dot) { const d = el('i', 'dot'); d.style.background = o.dot; nm.appendChild(d); } nm.appendChild(document.createTextNode(label)); s.appendChild(nm);
  if (count != null) s.appendChild(el('span', 'ct', String(count)));
  s.title = label;
  return s;
}
