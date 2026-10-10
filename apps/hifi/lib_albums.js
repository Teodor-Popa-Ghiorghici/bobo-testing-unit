/* THE ALBUMS VIEW of the library: the cases on the shelf and the page of one album. An album is worked out from its discs' tags (shelf.js) and then dressed with what the listener has
   written over it (album_meta.js: a title, an artist, a year, a genre, a picture), so changing how an album is shown never writes to a disc. `L` is the library (lib_ui.js). */
import { el, row, albumPage, album as albumEl, clock } from './lib_rows.js';
import { albums as makeAlbums, fold } from './shelf.js';
import { load as loadBook, dress, arrange } from './album_meta.js';
import { editAlbum } from './album_edit.js';

export const bookOf = () => loadBook();

/* the albums of these discs, as they are shown */
export const albumList = (L, idxs) => arrange(makeAlbums(L.S.list, idxs).map(a => dress(a, L.book)), fold);

export function editThis(L, a) { editAlbum(L, a, L.book, b => { L.book = b; L.refresh(); }); }

/* draws into `main`; returns the order the discs are on the screen in (the keys and a pick walk it) */
export function renderAlbums(L, main, v, now, h) {
  const { S, st, api } = L, as = albumList(L, v);
  if (st.album) {
    const a = as.find(x => x.key === st.album);
    if (a) {
      const first = S.list[a.idx[0]], tot = a.idx.reduce((s, i) => s + (S.list[i].dur || 0), 0);
      const back = el('button', '', '◄ ALBUMS'); back.addEventListener('click', () => { st.album = null; h.render(); });
      const info = el('div'); info.appendChild(el('h2', null, a.name));
      info.appendChild(el('p', null, [a.artist, a.year, a.idx.length + ' DISC' + (a.idx.length > 1 ? 'S' : ''), clock(tot), a.genre || first.genre].filter(Boolean).join('  ·  ')));
      const acts = el('div', 'acts'); acts.appendChild(back);
      const play = el('button', 'on', '▶ PLAY'); play.addEventListener('click', () => api.play(a.idx[0], h.tracksOf(a.idx))); acts.appendChild(play);
      const shuf = el('button', '', 'SHUFFLE'); shuf.addEventListener('click', () => { const sh = a.idx.slice().sort(() => Math.random() - 0.5); api.play(sh[0], h.tracksOf(sh)); }); acts.appendChild(shuf);
      const ed = el('button', '', 'EDIT ALBUM'); ed.title = 'CHANGE HOW THE ALBUM IS SHOWN: TITLE, ARTIST, YEAR, GENRE, PICTURE. THE DISCS ARE NOT TOUCHED.'; ed.addEventListener('click', () => editThis(L, a)); acts.appendChild(ed);
      info.appendChild(acts);
      const pg = el('div', 'stl-page'); pg.appendChild(albumPage(api, a, first)); pg.appendChild(info); main.appendChild(pg);
      const wrap = el('div', 'stl-wrap'); a.idx.forEach((i, k) => wrap.appendChild(row(api, S.list[i], i, S.list[i].no || k + 1, { sel: st.pk.set.has(i), now: S.list[i] === now }))); main.appendChild(wrap);
      return a.idx;
    }
    st.album = null;
  }
  const g = el('div', 'stl-albums');
  as.forEach(a => g.appendChild(albumEl(api, a, S.list[a.idx[0]], { sel: a.idx.some(i => st.pk.set.has(i)), now: a.idx.some(i => S.list[i] === now) })));
  main.appendChild(g);
  return as.flatMap(a => a.idx);
}
