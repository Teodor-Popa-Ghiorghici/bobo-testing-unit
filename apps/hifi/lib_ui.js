/* THE LIBRARY: the whole shelf, laid out to be looked at, without the amplifier and the EQ. Three ways to see it (LIST, GRID, ALBUMS), sources down the side (everything,
   favourites, what came last, what is played most, what is next, your folders, the games'), a search that takes Japanese and Korean through the input method, discs picked
   several at a time with the mouse and the keys, dragged into folders or into the order wanted, labels dropped on by the dozen, and a small player along the bottom so
   the music is never out of reach. It reads and writes the player's own records through `api` (see index.js) and never touches the audio. */
import { el, row, head, tile, source, mmss } from './lib_rows.js';
import { renderAlbums, albumList, editThis, bookOf } from './lib_albums.js';
import { matches, SORTS, pick, follow, emptyPick, sorted, reorder, shift, toEnd, sortUser } from './shelf.js';
import * as O from './lib_ops.js';
import { MODES, MODE_NAME } from './art.js';
import { filesFromDrop, kinds, hasFiles } from './lib_dnd.js';

const SORT_NAMES = [['shelf', 'SHELF ORDER'], ['name', 'TITLE'], ['artist', 'ARTIST'], ['album', 'ALBUM'], ['year', 'YEAR'], ['dur', 'LENGTH'], ['added', 'DATE ADDED'], ['plays', 'MOST PLAYED']];

export function createLibrary(host, api) {
  const { S, io } = api;
  const st = { src: S.list.some(t => !t.builtin) ? 'mine' : 'all', view: S.view || 'list', sort: 'shelf', desc: false, q: '', pk: emptyPick(), album: null, cur: null };
  const root = el('div', 'stl'); root.tabIndex = 0; root.style.display = 'none'; host.appendChild(root);
  const L = { root, S, io, api, st, refresh, focus: () => root.focus(), book: bookOf() };
  let pending = 0, dirty = true, drag = null, dead = false, sawUser = false;
  const top = el('div', 'stl-top'), body = el('div', 'stl-body'), side = el('div', 'stl-side'), main = el('div', 'stl-main'), selbar = el('div', 'stl-sel'), mini = el('div', 'stl-mini');
  body.append(side, main); root.append(top, body, selbar, mini, el('div', 'stl-drop', 'DROP MUSIC, FOLDERS OR PICTURES'));

  /* ---- what is shown ---- */
  const user = t => !t.builtin;
  function inSource() {
    const l = S.list, all = l.map((t, i) => i), s = st.src;
    if (s === 'all') return all;
    if (s === 'mine') return all.filter(i => user(l[i]));
    if (s === 'fav') return all.filter(i => l[i].fav);
    if (s === 'recent') return all.filter(i => user(l[i])).sort((a, b) => (l[b].added || 0) - (l[a].added || 0)).slice(0, 80);
    if (s === 'plays') return all.filter(i => l[i].plays > 0).sort((a, b) => l[b].plays - l[a].plays);
    if (s === 'queue') return S.queue.map(t => l.indexOf(t)).filter(i => i >= 0);
    if (s.indexOf('dir:') === 0) return all.filter(i => user(l[i]) && l[i].folder === s.slice(4));
    if (s.indexOf('game:') === 0) return all.filter(i => l[i].builtin && l[i].folder === s.slice(5));
    return all;
  }
  function visible() {
    let v = inSource().filter(i => matches(S.list[i], st.q));
    if (st.sort !== 'shelf' && st.src !== 'plays' && st.src !== 'recent' && st.src !== 'queue') { const c = SORTS[st.sort]; v = v.slice().sort((a, b) => (st.desc ? -1 : 1) * c(S.list[a], S.list[b])); }
    return v;
  }
  const tracksOf = idxs => idxs.map(i => S.list[i]);
  const picked = () => sorted(st.pk).filter(i => S.list[i]);
  const target = () => { const p = picked(); return p.length ? p : []; };

  /* ---- drawing ---- */
  function refresh() { if (dead) return; dirty = true; if (root.style.display === 'none' || pending) return; pending = requestAnimationFrame(() => { pending = 0; render(); }); }
  function buildTop() {
    top.textContent = '';
    const q = el('input', 'stl-q'); q.type = 'text'; q.placeholder = 'SEARCH'; q.value = st.q; q.spellcheck = false;
    q.addEventListener('input', () => { st.q = q.value; renderMain(); });
    q.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.isComposing || ev.keyCode === 229) return; if (ev.key === 'Escape') { q.value = ''; st.q = ''; renderMain(); root.focus(); } else if (ev.key === 'Enter') { const v = visible(); if (v.length) api.play(v[0], tracksOf(v)); root.focus(); } });
    L.q = q; top.appendChild(q);
    const seg = el('div', 'stl-seg');
    [['list', 'LIST'], ['grid', 'GRID'], ['albums', 'ALBUMS']].forEach(([id, label]) => { const b = el('button', st.view === id ? 'on' : '', label); b.addEventListener('click', () => { st.view = S.view = id; st.album = null; io.saveSettings(); buildTop(); renderMain(); }); seg.appendChild(b); });
    top.appendChild(seg);
    const sel = el('select'); SORT_NAMES.forEach(([k, n]) => sel.appendChild(new Option('SORT: ' + n, k))); sel.value = st.sort;
    sel.addEventListener('change', () => { st.sort = sel.value; buildTop(); renderMain(); });
    const dir = el('button', '', st.desc ? '▼' : '▲'); dir.title = 'REVERSE'; dir.addEventListener('click', () => { st.desc = !st.desc; buildTop(); renderMain(); });
    top.append(sel, dir);
    if (st.sort !== 'shelf') { const keep = el('button', '', 'KEEP THIS ORDER'); keep.title = 'MAKE THE SHELF ITSELF STAND IN THIS ORDER'; keep.addEventListener('click', () => { const r = sortUser(S.list, st.sort, st.desc); api.remap(r.map); st.pk = follow(st.pk, r.map); st.sort = 'shelf'; st.desc = false; io.saveLibrary(); buildTop(); renderMain(); api.say('THE SHELF IS IN THAT ORDER NOW.'); }); top.appendChild(keep); }
    top.appendChild(el('span', 'sp'));
    const imp = el('button', '', 'IMPORT'); imp.addEventListener('click', ev => O.popup(L, ev, [
      { label: 'MUSIC FILES...', run: () => api.pickFiles() },
      { label: 'A FOLDER OF MUSIC...', run: () => { const f = el('input'); f.type = 'file'; f.webkitdirectory = true; f.style.display = 'none'; f.addEventListener('change', () => { const fs = [].slice.call(f.files); f.remove(); io.importFiles(fs, { keepFolders: true }); }); root.appendChild(f); f.click(); } }]));
    const nf = el('button', '', 'NEW FOLDER'); nf.addEventListener('click', () => O.newFolder(L, target(), d => { st.src = 'dir:' + d.name; refresh(); }));
    const as = el('button', '', 'AUTOSORT'); as.title = 'SORT THE PICKED DISCS (OR EVERY UNFILED ONE) INTO GENRE FOLDERS'; as.addEventListener('click', () => O.autosort(L, target().length ? target() : S.list.map((t, i) => i).filter(i => user(S.list[i]) && !S.list[i].folder)));
    const lb = el('button', '', 'LABELS'); lb.title = 'PUT PICTURES ON DISCS: ONE PICTURE ON THE PICKED ONES, OR MANY MATCHED TO ALBUMS BY NAME'; lb.addEventListener('click', () => O.pickImages(L, fs => O.setLabels(L, fs, target())));
    top.append(imp, nf, as, lb);
  }
  function buildSide() {
    side.textContent = '';
    const n = fn => S.list.filter(fn).length;
    [['mine', 'YOUR DISCS', n(user)], ['all', 'EVERYTHING', S.list.length], ['fav', '♥ FAVOURITES', n(t => t.fav)], ['recent', 'RECENTLY ADDED', Math.min(80, n(user))], ['plays', 'MOST PLAYED', n(t => t.plays > 0)], ['queue', 'UP NEXT', S.queue.length]].forEach(([id, label, c]) => side.appendChild(source(id, label, c, { on: st.src === id })));
    const h = el('h4', null, 'YOUR FOLDERS'); side.appendChild(h);
    S.userDirs.forEach(d => side.appendChild(source('dir:' + d.name, d.name, n(t => user(t) && t.folder === d.name), { on: st.src === 'dir:' + d.name, dot: ({ green: '#5bff6e', cyan: '#4fe3ff', amber: '#ffb43c', white: '#e8ecf2', red: '#ff4a3c' })[d.tint] })));
    if (!S.userDirs.length) side.appendChild(el('div', 'stl-src', '(NONE YET)')).style.color = 'var(--brush)';
    side.appendChild(el('h4', null, 'THE GAMES'));
    api.builtinDirs().forEach(g => side.appendChild(source('game:' + g, g, n(t => t.builtin && t.folder === g), { on: st.src === 'game:' + g })));
  }
  function buildSel() {
    selbar.textContent = '';
    const p = picked(); selbar.style.display = p.length ? 'flex' : 'none'; if (!p.length) return;
    const b = (label, run, title) => { const x = el('button', '', label); if (title) x.title = title; x.addEventListener('click', ev => run(ev)); selbar.appendChild(x); return x; };
    selbar.appendChild(el('b', null, p.length + ' PICKED'));
    b('PLAY', () => api.play(p[0], tracksOf(p)));
    b('NEXT', () => { S.queue.unshift(...tracksOf(p).reverse()); api.say(p.length + ' PUT NEXT.'); refresh(); }, 'PLAY THESE AFTER THIS ONE');
    b('QUEUE', () => { S.queue.push(...tracksOf(p)); api.say(p.length + ' ADDED TO UP NEXT.'); refresh(); }, 'PLAY THESE AFTER WHAT IS ALREADY QUEUED');
    b('MOVE TO...', ev => O.moveMenu(L, ev, p), 'PUT THE PICKED DISCS IN A FOLDER');
    b('LABEL...', ev => O.popup(L, ev, [{ label: 'A PICTURE...', run: () => O.pickImages(L, fs => O.setLabels(L, fs, p)) }, '-'].concat(MODES.map(m => ({ label: 'LABEL: ' + MODE_NAME[m], run: () => O.labelMode(L, p, m) })), ['-', { label: 'TAKE THE PICTURE OFF', run: () => { io.clearLabel(p); api.afterLabel(); } }])));
    b('EDIT INFO', () => O.editInfo(L, p), 'F2');
    b(p.every(i => S.list[i].fav) ? '♥ UNFAVOUR' : '♥ FAVOUR', () => { const all = p.every(i => S.list[i].fav); p.forEach(i => { S.list[i].fav = !all; }); io.saveLibrary(); refresh(); });
    const free = st.sort === 'shelf';
    b('▲', () => nudge(p, -1), free ? 'ONE PLACE UP (ALT+UP)' : 'SET THE ORDER TO SHELF ORDER TO MOVE DISCS').disabled = !free;
    b('▼', () => nudge(p, 1), free ? 'ONE PLACE DOWN (ALT+DOWN)' : 'SET THE ORDER TO SHELF ORDER TO MOVE DISCS').disabled = !free;
    b('TOP', () => settle(toEnd(S.list, p, true)), 'TO THE TOP OF THE SHELF').disabled = !free;
    b('BOTTOM', () => settle(toEnd(S.list, p, false)), 'TO THE BOTTOM OF THE SHELF').disabled = !free;
    selbar.appendChild(el('span', 'sp'));
    b('REMOVE', () => removeAsk(p), 'DEL'); b('✕', () => { st.pk = emptyPick(); refresh(); }, 'ESC');
  }
  function settle(r) { api.remap(r.map); st.pk = follow(st.pk, r.map); io.saveLibrary(); refresh(); }
  function nudge(p, d) { if (st.sort !== 'shelf') return; settle(shift(S.list, p, d)); }
  function removeAsk(p) {
    const un = p.filter(i => user(S.list[i])); if (!un.length) { api.say('THE PRESSED DISCS DO NOT COME OFF THE SHELF.'); return; }
    O.modal(L, 'REMOVE', [un.length === 1 ? S.list[un[0]].name + ' LEAVES THE SHELF AND THE DISK.' : un.length + ' DISCS LEAVE THE SHELF AND THE DISK.'], [{ label: 'KEEP THEM' }, { label: 'REMOVE', primary: true, run: () => { const r = io.removeTracks(un); st.pk = emptyPick(); refresh(); return r; } }]);
  }

  let order = [], more = null;
  const CHUNK = 240;                                                /* a shelf of thousands is built as it is scrolled to, a screenful at a time */
  function chunked(host, v, make) {
    let n = 0;
    more = () => { const f = document.createDocumentFragment(), to = Math.min(v.length, n + CHUNK); for (; n < to; n++) f.appendChild(make(v[n], n)); host.appendChild(f); return n < v.length; };
    more();
  }
  main.addEventListener('scroll', () => { if (more && main.scrollTop + main.clientHeight > main.scrollHeight - 400 && !more()) more = null; });
  function renderMain() {
    main.textContent = ''; more = null; order = visible();
    const v = order, now = S.list[S.ix];
    if (!S.list.some(user) && (st.src === 'all' || st.src === 'mine')) {
      const e = el('div', 'stl-empty'); e.appendChild(el('b', null, 'THE SHELF IS EMPTY')); e.appendChild(document.createTextNode('DROP MUSIC FILES (OR A WHOLE FOLDER) ANYWHERE ON THIS WINDOW, OR PRESS IMPORT.'));
      e.appendChild(el('br')); e.appendChild(el('br')); e.appendChild(document.createTextNode('THE GAMES\' MUSIC IS ALREADY ON THE SHELF, DOWN THE SIDE.')); main.appendChild(e);
      if (!v.length) return;
    }
    if (!v.length) { const e = el('div', 'stl-empty'); e.appendChild(el('b', null, st.q ? 'NOTHING MATCHES' : st.src === 'queue' ? 'NOTHING IS WAITING' : 'NOTHING HERE')); e.appendChild(document.createTextNode(st.q ? '"' + st.q + '"' : '')); main.appendChild(e); return; }
    if (st.view === 'albums') { order = renderAlbums(L, main, v, now, { tracksOf, render: renderMain }); return; }
    if (st.view === 'grid') {
      const g = el('div', 'stl-tiles'); main.appendChild(g); chunked(g, v, i => tile(api, S.list[i], i, { sel: st.pk.set.has(i), now: S.list[i] === now })); return;
    }
    const h = head([['#', null], ['', null], ['TITLE', 'name'], ['GENRE', null], ['YEAR', 'year'], ['', null], ['TIME', 'dur']], st.sort, st.desc);
    main.appendChild(h);
    const wrap = el('div', 'stl-wrap'); main.appendChild(wrap);
    chunked(wrap, v, (i, k) => row(api, S.list[i], i, k + 1, { sel: st.pk.set.has(i), now: S.list[i] === now }));
  }
  function render() {
    if (dead || root.style.display === 'none') return;
    dirty = false;
    if (st.src === 'all' && !sawUser && S.list.some(user)) st.src = 'mine';
    sawUser = S.list.some(user);
    const scroll = main.scrollTop;
    if (!top.firstChild) buildTop();
    buildSide(); buildSel(); renderMain(); buildMini(true);
    main.scrollTop = scroll;
  }

  /* ---- the player along the bottom ---- */
  let mi = null;
  function buildMini(force) {
    if (!mi || force) {
      mini.textContent = '';
      const th = el('span'); th.style.cssText = 'display:block;width:34px;height:34px;flex:none'; const tt = el('div', 'tt'); tt.appendChild(el('b')); tt.appendChild(el('i'));
      const mk = (t, run, title) => { const b = el('button', '', t); b.title = title; b.addEventListener('click', run); return b; };
      const bar = el('div', 'bar'); bar.appendChild(el('i')); bar.addEventListener('mousedown', ev => { const r = bar.getBoundingClientRect(); api.seek((ev.clientX - r.left) / r.width * S.dur); });
      const tm = el('span', 'tmv'); const vol = el('input', 'vol'); vol.type = 'range'; vol.min = 0; vol.max = 100; vol.value = Math.round(S.vol * 100); vol.addEventListener('input', () => api.setVol(vol.value / 100));
      const sh = mk('SHF', () => { S.shuffle = !S.shuffle; io.saveSettings(); sh.classList.toggle('on', S.shuffle); }, 'SHUFFLE'); sh.classList.toggle('on', S.shuffle);
      const play = mk('▶', () => api.toggle(), 'SPACE');
      mini.append(th, tt, mk('|◄', () => api.skip(-1), 'PREVIOUS'), play, mk('►|', () => api.skip(1), 'NEXT'), sh, bar, tm, vol);
      mi = { th, tt: tt.firstChild, sub: tt.lastChild, bar: bar.firstChild, tm, play, last: '' };
    }
    const t = S.list[S.ix];
    const key = t ? t.name + '|' + t.artist + '|' + !!t.art + '|' + S.playing : '';
    if (key !== mi.last || force) {
      mi.last = key; mi.tt.textContent = t ? t.name : 'NO DISC'; mi.sub.textContent = t ? [t.artist, t.album].filter(Boolean).join('  ·  ') : '';
      mi.play.textContent = S.playing ? '||' : '▶';
      mi.th.textContent = ''; if (t) { const im = el('img', 'th'); im.style.cssText = 'width:34px;height:34px;object-fit:cover;image-rendering:pixelated'; const u = api.thumb(t, url => { im.src = url; }); if (u) im.src = u; mi.th.appendChild(im); }
    }
    mi.bar.style.width = (S.dur ? Math.min(100, S.pos / S.dur * 100) : 0) + '%'; mi.tm.textContent = mmss(S.pos) + ' / ' + mmss(S.dur);
  }
  let lastNow = null, lastQ = -1;
  function frame() { if (root.style.display === 'none') return; buildMini(false); if (S.list[S.ix] !== lastNow || S.queue.length !== lastQ) { lastNow = S.list[S.ix]; lastQ = S.queue.length; refresh(); } }

  /* ---- the mouse ---- */
  const idxOf = ev => { const n = ev.target.closest && ev.target.closest('[data-i]'); return n ? +n.dataset.i : -1; };
  const playOrder = () => tracksOf(order);
  main.addEventListener('click', ev => {
    const alb = ev.target.closest('.stl-alb'), hd = ev.target.closest('[data-sort]');
    if (hd) { const k = hd.dataset.sort; if (st.sort === k) st.desc = !st.desc; else { st.sort = k; st.desc = false; } buildTop(); renderMain(); return; }
    if (alb) { st.album = alb.dataset.k; renderMain(); main.scrollTop = 0; return; }
    const i = idxOf(ev); if (i < 0) { if (!ev.ctrlKey && !ev.shiftKey && st.pk.set.size) { st.pk = emptyPick(); buildSel(); markSel(); } return; }
    if (ev.target.dataset && ev.target.dataset.fav) { const t = S.list[i]; t.fav = !t.fav; io.saveLibrary(); refresh(); return; }
    if (ev.target.dataset && ev.target.dataset.play) { api.play(i, playOrder()); return; }
    st.pk = pick(st.pk, i, { ctrl: ev.ctrlKey || ev.metaKey, shift: ev.shiftKey }, order); buildSel(); markSel(); root.focus();
  });
  main.addEventListener('dblclick', ev => { const i = idxOf(ev); if (i >= 0 && !(ev.target.dataset && ev.target.dataset.fav)) api.play(i, playOrder()); });
  main.addEventListener('contextmenu', ev => {
    ev.preventDefault(); const alb = ev.target.closest('.stl-alb'), i = idxOf(ev); let one = null;
    if (alb) { one = albumList(L, order).find(x => x.key === alb.dataset.k) || null; if (one) st.pk = { set: new Set(one.idx), anchor: one.idx[0] }; buildSel(); markSel(); }
    else if (i >= 0 && !st.pk.set.has(i)) { st.pk = pick(st.pk, i, {}, order); buildSel(); markSel(); }
    const p = picked(); if (!p.length) return;
    O.popup(L, ev, [{ label: '▶ PLAY', run: () => api.play(p[0], tracksOf(p)) }, { label: 'PLAY NEXT', run: () => { S.queue.unshift(...tracksOf(p).reverse()); refresh(); } }, { label: 'ADD TO UP NEXT', run: () => { S.queue.push(...tracksOf(p)); refresh(); } }, '-',
      { label: 'FAVOURITE / NOT', run: () => { const all = p.every(j => S.list[j].fav); p.forEach(j => { S.list[j].fav = !all; }); io.saveLibrary(); refresh(); } },
      { label: 'MOVE TO FOLDER...', run: () => O.moveMenu(L, ev, p) }, { label: 'PICTURE...', run: () => O.pickImages(L, fs => O.setLabels(L, fs, p)) },
      { label: 'EDIT INFO...', run: () => O.editInfo(L, p) }].concat(one ? [{ label: 'EDIT ALBUM...', run: () => editThis(L, one) }] : [], ['-', { label: 'REMOVE FROM THE SHELF', run: () => removeAsk(p) }]));
  });
  /* the picked rows and tiles light without the whole list being built again */
  function markSel() { main.querySelectorAll('[data-i]').forEach(n => n.classList.toggle('sel', st.pk.set.has(+n.dataset.i))); }
  side.addEventListener('click', ev => { const s = ev.target.closest('.stl-src'); if (!s || !s.dataset.src) return; st.src = s.dataset.src; st.album = null; st.pk = emptyPick(); if (st.src.indexOf('game:') === 0) api.folder(st.src.slice(5)); render(); });
  side.addEventListener('contextmenu', ev => {
    const s = ev.target.closest('.stl-src'); ev.preventDefault();
    if (s && s.dataset.src && s.dataset.src.indexOf('dir:') === 0) { const nm = s.dataset.src.slice(4); O.popup(L, ev, [{ label: 'RENAME...', run: () => O.renameFolder(L, nm) }, { label: 'REMOVE FOLDER', run: () => O.deleteFolder(L, nm) }, '-', { label: 'NEW FOLDER...', run: () => O.newFolder(L) }]); }
    else O.popup(L, ev, [{ label: 'NEW FOLDER...', run: () => O.newFolder(L) }]);
  });

  /* ---- dragging discs: into a folder, or into an order ---- */
  main.addEventListener('dragstart', ev => {
    const i = idxOf(ev); if (i < 0) { ev.preventDefault(); return; }
    if (!st.pk.set.has(i)) { st.pk = pick(st.pk, i, {}, order); buildSel(); markSel(); }
    drag = picked(); ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', drag.length + ' DISCS');
    main.querySelectorAll('[data-i]').forEach(n => n.classList.toggle('drag', st.pk.set.has(+n.dataset.i)));
  });
  main.addEventListener('dragend', () => { drag = null; clearMarks(); main.querySelectorAll('.drag').forEach(n => n.classList.remove('drag')); });
  const clearMarks = () => { root.querySelectorAll('.before,.after,.over').forEach(n => n.classList.remove('before', 'after', 'over')); };
  main.addEventListener('dragover', ev => {
    if (!drag || st.view === 'albums' || st.sort !== 'shelf') return;
    const n = ev.target.closest('[data-i]'); if (!n) return; ev.preventDefault(); clearMarks();
    const r = n.getBoundingClientRect(), after = st.view === 'list' ? ev.clientY > r.top + r.height / 2 : ev.clientX > r.left + r.width / 2;
    n.classList.add(after ? 'after' : 'before');
  });
  main.addEventListener('drop', ev => {
    if (!drag || st.sort !== 'shelf') return;
    const n = ev.target.closest('[data-i]'); if (!n) return; ev.preventDefault(); ev.stopPropagation();
    const j = +n.dataset.i, r = n.getBoundingClientRect(), after = st.view === 'list' ? ev.clientY > r.top + r.height / 2 : ev.clientX > r.left + r.width / 2;
    const res = reorder(S.list, drag, after ? j + 1 : j);
    clearMarks(); drag = null; if (res.moved) { settle(res); api.say('ORDER CHANGED.'); }
  });
  side.addEventListener('dragover', ev => { const s = ev.target.closest('.stl-src'); if (!drag || !s) return; const id = s.dataset.src; if (id !== 'all' && id.indexOf('dir:') !== 0) return; ev.preventDefault(); clearMarks(); s.classList.add('over'); });
  side.addEventListener('drop', ev => {
    const s = ev.target.closest('.stl-src'); if (!drag || !s) return; ev.preventDefault(); ev.stopPropagation(); const id = s.dataset.src, d = drag; clearMarks(); drag = null;
    O.moveTo(L, d, id === 'all' ? null : S.userDirs.find(x => x.name === id.slice(4)) || null);
  });

  /* ---- files dropped from outside ---- */
  root.addEventListener('dragover', ev => { if (hasFiles(ev.dataTransfer)) { ev.preventDefault(); root.classList.add('over'); } });
  root.addEventListener('dragleave', ev => { if (ev.target === root || !root.contains(ev.relatedTarget)) root.classList.remove('over'); });
  root.addEventListener('drop', async ev => {
    root.classList.remove('over'); if (!hasFiles(ev.dataTransfer)) return;
    ev.preventDefault();
    const hit = idxOf(ev), files = await filesFromDrop(ev.dataTransfer), k = kinds(files);
    const into = st.src.indexOf('dir:') === 0 ? st.src.slice(4) : null;
    if (k.audio.length) { io.importFiles(files, { folder: into, keepFolders: files.some(f => f.webkitRelativePath) }); return; }
    if (k.pics.length) O.setLabels(L, k.pics, hit >= 0 ? (st.pk.set.has(hit) ? picked() : [hit]) : picked());
  });

  /* ---- the keyboard ---- */
  root.addEventListener('keydown', ev => {
    if (ev.target !== root && ev.target.tagName === 'INPUT') return;
    const k = ev.key, ctrl = ev.ctrlKey || ev.metaKey;
    if (k === 'Tab') { ev.preventDefault(); api.setTab('player'); return; }
    if (k === '/' || (ctrl && (k === 'f' || k === 'F'))) { ev.preventDefault(); L.q.focus(); L.q.select(); return; }
    if (ctrl && (k === 'a' || k === 'A')) { ev.preventDefault(); st.pk = { set: new Set(order), anchor: order[0] }; buildSel(); markSel(); return; }
    if (k === ' ') { ev.preventDefault(); api.toggle(); return; }
    if (k === 'Escape') { if (st.pk.set.size) { st.pk = emptyPick(); buildSel(); markSel(); } else if (st.album) { st.album = null; renderMain(); } return; }
    if (k === 'F2') { ev.preventDefault(); const p = picked(); if (p.length) O.editInfo(L, p); return; }
    if (k === 'Delete') { ev.preventDefault(); const p = picked(); if (p.length) removeAsk(p); return; }
    if (ev.altKey && (k === 'ArrowUp' || k === 'ArrowDown')) { ev.preventDefault(); const p = picked(); if (p.length) nudge(p, k === 'ArrowUp' ? -1 : 1); return; }
    if (k === 'Enter') { ev.preventDefault(); const p = picked(); if (p.length) api.play(p[0], playOrder()); return; }
    if (k === 'ArrowDown' || k === 'ArrowUp' || ((k === 'ArrowLeft' || k === 'ArrowRight') && st.view !== 'list')) {
      ev.preventDefault();
      const step = k === 'ArrowDown' || k === 'ArrowRight' ? 1 : -1, cur = st.pk.anchor != null ? order.indexOf(st.pk.anchor) : -1, to = Math.max(0, Math.min(order.length - 1, cur + step));
      if (!order.length) return;
      const i = order[cur < 0 ? 0 : to];
      st.pk = pick(st.pk, i, { shift: ev.shiftKey }, order); buildSel(); markSel();
      let n = main.querySelector('[data-i="' + i + '"]');
      while (!n && more) { if (!more()) more = null; n = main.querySelector('[data-i="' + i + '"]'); }
      if (n && n.scrollIntoView) n.scrollIntoView({ block: 'nearest' });
    }
  });
  root.addEventListener('mousedown', ev => { if (ev.target.tagName !== 'INPUT' && ev.target.tagName !== 'SELECT') setTimeout(() => root.focus(), 0); });

  function setTheme(P) {
    const s = root.style;
    s.setProperty('--a', P.amber); s.setProperty('--a2', P.cyan); s.setProperty('--lcd', P.lcd); s.setProperty('--lcdon', P.lcdOn); s.setProperty('--case', P.case_);
    host.style.setProperty('--a', P.amber);
  }
  function destroy() { dead = true; if (pending) cancelAnimationFrame(pending); }
  Object.assign(L, { frame, setTheme, destroy });
  return L;
}
