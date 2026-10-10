/* The ALBUM dialog: change how an album is shown (title, artist, year, genre, picture) and nothing about the discs in it (album_meta.js keeps it apart from them). `L` is the library
   (lib_ui.js), `a` the album as shown, `book` what is written so far; `done(book)` is told the new book. The picture is a vault entry of its own, made here and let go of here. */
import { el } from './lib_rows.js';
import { modal, pickImages } from './lib_ops.js';
import { labelFrom } from './art.js';
import { Vault } from '../../kernel/vault.js';
import { patch, save, coversOf, LIMITS } from './album_meta.js';
import { coverUrl, forgetCover } from './album_cover.js';

export function editAlbum(L, a, book, done) {
  const d = a.derived || { name: a.name, artist: a.artist, year: a.year };
  const field = (label, key, val, max, hint) => { const i = el('input'); i.type = 'text'; i.value = val || ''; i.maxLength = max; i.placeholder = hint || ''; const l = el('label'); l.appendChild(el('span', null, label)); l.appendChild(i); return { l, i }; };
  const f = { name: field('TITLE', 'name', a.name, LIMITS.name, d.name), artist: field('ARTIST', 'artist', a.artist, LIMITS.artist, d.artist), year: field('YEAR', 'year', a.year, 4, d.year ? String(d.year) : ''), genre: field('GENRE', 'genre', a.genre || '', LIMITS.genre, '') };
  let cover = a.coverKey || null, chosen = null, changed = false;
  const pic = el('img'); pic.style.cssText = 'width:64px;height:64px;object-fit:cover;image-rendering:pixelated;background:#000;border:1px solid #555';
  const first = L.S.list[a.idx[0]];
  const show = u => { if (u) pic.src = u; };
  if (cover) show(coverUrl(cover, show)); else if (first) show(L.api.thumb(first, show));
  const note = el('p', null, cover ? 'THIS ALBUM HAS A PICTURE OF ITS OWN.' : 'IT SHOWS THE FIRST DISC\'S PICTURE.');
  const pick = el('button', null, 'CHOOSE A PICTURE...'), dflt = el('button', null, 'USE THE DISCS\' OWN');
  pick.addEventListener('click', () => pickImages(L, fs => { const f0 = fs && fs[0]; if (!f0) return; chosen = f0; changed = true; pic.src = URL.createObjectURL(f0); note.textContent = 'A NEW PICTURE, WHEN YOU PRESS SAVE.'; }));
  dflt.addEventListener('click', () => { chosen = null; cover = null; changed = true; if (first) show(L.api.thumb(first, show)); note.textContent = 'IT WILL SHOW THE FIRST DISC\'S PICTURE.'; });
  const row = el('div'); row.style.cssText = 'display:flex;gap:10px;align-items:center;margin-top:6px'; const col = el('div'); col.append(pick, dflt, note); row.append(pic, col);
  const warn = el('p', null, a.idx.length + ' DISC' + (a.idx.length === 1 ? '' : 'S') + ' IN IT. ONLY HOW THE ALBUM IS SHOWN CHANGES: NO DISC, ITS TAGS OR ITS OWN PICTURE IS TOUCHED.');
  modal(L, 'EDIT ALBUM', [warn, f.name.l, f.artist.l, f.year.l, f.genre.l, row], [
    { label: 'CANCEL' },
    { label: 'PUT IT ALL BACK', off: !a.edited, run: m => { const old = a.coverKey; const next = patch(book, a.key, { name: '', artist: '', year: '', genre: '', cover: null }, d); save(next); release(old, next, L); done(next); } },
    { label: 'SAVE', primary: true, keep: true, run: m => { commit(m); return false; } }
  ]);
  /* the picture is read first (it can fail), then the album is written; the dialog closes only when it is done */
  async function commit(m) {
    let key = cover; const old = a.coverKey;
    if (chosen) { try { const P = await labelFrom(chosen); key = P.blob ? await Vault.put(P.blob) : null; } catch (e) { L.api.say('THAT IS NOT A PICTURE THIS MACHINE KNOWS.'); return; } }
    const next = patch(book, a.key, { name: f.name.i.value, artist: f.artist.i.value, year: f.year.i.value, genre: f.genre.i.value, cover: key }, d);
    save(next);
    if (changed && old && old !== key) release(old, next, L);
    m.close(); done(next); L.api.say('ALBUM SAVED. THE DISCS IN IT ARE AS THEY WERE.');
  }
}
/* a picture this dialog made is let go of when no album uses it any more (and it is never a disc's: those are kept under their own keys) */
function release(key, book, L) { if (!key || coversOf(book).indexOf(key) >= 0 || L.S.list.some(t => t.artV === key)) return; try { Vault.del(key); } catch (e) { /* already gone */ } forgetCover(key); }
