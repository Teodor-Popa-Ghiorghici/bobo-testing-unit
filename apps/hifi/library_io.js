/* The library on disk, and the way things get into it. Nothing heavy is kept in the settings drawer: the audio and the pictures live in the vault under keys, and a record
   carries only what the lists need to draw before a note is played. Importing is a queue (two at a time: a decode is the heavy part), reads the tags of whatever the file is
   (apps/hifi/tags.js), puts the picture inside the file on the disc, and a folder of music brings its cover with it. */
import { Vault } from '../../kernel/vault.js';
import { readTags } from './tags.js';
import { labelFrom, labelFromDataURL, coverKey, dropThumb } from './art.js';
import { match, pickCover, isImage } from './labels.js';
import { cleanDir } from './shelf.js';

export const LIB_KEY = 'templeos.stack.lib.v1', DIRS_KEY = 'templeos.stack.dirs.v1';
const P64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const AUDIO = /\.(mp3|ogg|oga|wav|m4a|mp4|flac|aac|opus|webm|wma)$/i;
export const isAudio = f => /^audio\//.test(f.type || '') || AUDIO.test(f.name || '');
const TINTS = ['green', 'cyan', 'amber', 'white', 'red'];

export function peaksPack(p) {
  /* 240 buckets of min/max at one byte each: a shape, not a signal */
  const n = 240, out = new Uint8Array(n * 2), step = p.length / 2 / n;
  for (let i = 0; i < n; i++) {
    let lo = 0, hi = 0;
    for (let k = Math.floor(i * step); k < Math.floor((i + 1) * step) && k * 2 + 1 < p.length; k++) { if (p[k * 2] < lo) lo = p[k * 2]; if (p[k * 2 + 1] > hi) hi = p[k * 2 + 1]; }
    out[i * 2] = Math.round(Math.max(-1, lo) * 127) + 128; out[i * 2 + 1] = Math.round(Math.min(1, hi) * 127) + 128;
  }
  let s = '';
  for (let i = 0; i < out.length; i += 3) { const a = out[i], b = out[i + 1] || 0, c = out[i + 2] || 0; s += P64[a >> 2] + P64[((a & 3) << 4) | (b >> 4)] + P64[((b & 15) << 2) | (c >> 6)] + P64[c & 63]; }
  return s;
}
export function peaksUnpack(s) {
  if (!s) return null;
  const bytes = [];
  for (let i = 0; i < s.length; i += 4) { const a = P64.indexOf(s[i]), b = P64.indexOf(s[i + 1]), c = P64.indexOf(s[i + 2]), d = P64.indexOf(s[i + 3]); bytes.push((a << 2) | (b >> 4), ((b & 15) << 4) | (c >> 2), ((c & 3) << 6) | d); }
  const out = new Float32Array(480);
  for (let i = 0; i < 480 && i < bytes.length; i++) out[i] = (bytes[i] - 128) / 127;
  return out;
}

export function createLibraryIO(core) {
  const { S, say, ctx, EQ_BANDS } = core;
  const labels = new Map();                                       /* artV -> promise of its prepared label, so a cover shared by a whole album is read once */

  /* ---- what is kept ---- */
  function saveLibrary() {
    const recs = S.list.filter(t => !t.builtin && t.vault).map(t => ({
      name: t.name, artist: t.artist, album: t.album || '', genre: t.genre || '', year: t.year || null, no: t.no || null, file: t.file || '', size: t.size || 0,
      vault: t.vault, tint: t.tint, dur: t.dur, eq: t.eq, art: t.artV ? null : (t.artData || null), artV: t.artV || null, pal: t.pal || null, mode: t.artMode || null,
      pk: t.pk || null, dir: t.folder || null, added: t.added || 0, plays: t.plays || 0, fav: t.fav ? 1 : 0, scanned: t.scanned ? 1 : 0
    }));
    try { localStorage.setItem(LIB_KEY, JSON.stringify(recs)); return true; }
    catch (e) { say('THE SHELF IS FULL. NEWER DISCS MAY NOT COME BACK.'); return false; }
  }
  function saveDirs() { try { localStorage.setItem(DIRS_KEY, JSON.stringify(S.userDirs)); } catch (e) { /* no room */ } }
  function saveSettings() { try { localStorage.setItem('templeos.stack.ui.v1', JSON.stringify({ mode: S.labelMode, tab: S.tab, view: S.view, vol: Math.min(1, S.vol), exp: !!S.exp, shuffle: S.shuffle, repeat: S.repeat, last: S.list[S.ix] && !S.list[S.ix].builtin ? S.list[S.ix].vault : null })); } catch (e) { /* no room */ } }

  /* a label for a disc: from the vault by key (shared), or from an old record's little data: picture */
  function labelByKey(key) {
    if (!labels.has(key)) labels.set(key, Vault.get(key).then(b => (b ? labelFrom(b) : null)).catch(() => null));
    return labels.get(key);
  }
  function wear(t, L, key) {
    if (!L) return;
    t.label = L.label; t.art = L.thumb; t.pal = t.pal || L.pal; t.artV = key || t.artV || null; dropThumb(t);
  }

  async function loadLibrary() {
    let recs = [], dirs = [], ui = {};
    try { recs = JSON.parse(localStorage.getItem(LIB_KEY) || '[]'); } catch (e) { recs = []; }
    try { dirs = JSON.parse(localStorage.getItem(DIRS_KEY) || '[]'); } catch (e) { dirs = []; }
    try { ui = JSON.parse(localStorage.getItem('templeos.stack.ui.v1') || '{}'); } catch (e) { ui = {}; }
    S.userDirs = Array.isArray(dirs) ? dirs.filter(d => d && d.name) : [];
    if (ui.mode) S.labelMode = ui.mode;
    if (ui.view) S.view = ui.view;
    if (ui.tab) S.tab = ui.tab;
    if (typeof ui.vol === 'number') S.vol = Math.max(0, Math.min(1, ui.vol));
    S.resume = ui.last || null;
    if (ui.exp) S.exp = true;                       /* it only counts if the gift is held (apps/hifi/index.js expOn) */
    if (ui.shuffle) S.shuffle = true;
    if (ui.repeat) S.repeat = ui.repeat | 0;
    if (!recs.length) { core.changed(); return; }
    S.loading += recs.length;
    for (const r of recs) {
      S.loading--;
      if (!core.alive()) return;
      const t = { name: r.name, artist: r.artist, album: r.album || '', genre: r.genre || '', year: r.year || null, no: r.no || null, file: r.file || '', size: r.size || 0, vault: r.vault,
                  tint: r.tint || 'amber', dur: r.dur || 0, buf: null, builtin: false, pk: r.pk, peaks: peaksUnpack(r.pk), art: null, artData: r.art || null, artV: r.artV || null, pal: r.pal || null,
                  artMode: r.mode || null, folder: r.dir || null, added: r.added || 0, plays: r.plays || 0, fav: !!r.fav, scanned: !!r.scanned };
      if (t.folder) { const d = S.userDirs.find(x => x.name === t.folder); t.folderTint = d ? d.tint : 'white'; }
      t.art = core.makeArt(t.name, t.tint);                      /* until its own picture is read, the abstraction it always had */
      const saved = core.store()[core.keyOf(t)];
      t.eq = (r.eq || (saved && saved.eq) || EQ_BANDS.map(() => 0)).slice(0, EQ_BANDS.length);
      S.list.push(t);
    }
    core.changed();
    /* the pictures come after the list, a few at a time, so a shelf of two hundred is on screen at once */
    let n = 0;
    for (const t of S.list) {
      if (!core.alive()) return;
      if (t.builtin) continue;
      if (t.artV) wear(t, await labelByKey(t.artV), t.artV);
      else if (t.artData) { try { wear(t, await labelFromDataURL(t.artData)); } catch (e) { /* the old picture is gone */ } }
      if ((t.artV || t.artData) && ++n % 8 === 0) core.changed();
    }
    core.changed();
    say(recs.length + ' DISC' + (recs.length > 1 ? 'S' : '') + ' BACK ON THE SHELF.');
  }

  /* ---- a picture for some discs: a Blob in, the same label on every disc given ---- */
  async function setLabel(idxs, blob) {
    let L;
    try { L = await labelFrom(blob); } catch (e) { say('THAT IS NOT A PICTURE THIS MACHINE KNOWS.'); return 0; }
    const key = L.blob ? await Vault.put(L.blob) : null;
    if (key) labels.set(key, Promise.resolve(L));
    let n = 0;
    idxs.forEach(i => { const t = S.list[i]; if (!t || t.builtin) return; const old = t.artV; t.pal = null; wear(t, L, key); t.artData = null; n++; releaseArt(old); });
    saveLibrary(); core.changed();
    return n;
  }
  /* a disc takes the face off: back to the abstraction */
  function clearLabel(idxs) {
    idxs.forEach(i => { const t = S.list[i]; if (!t || t.builtin) return; const old = t.artV; t.label = null; t.pal = null; t.artV = null; t.artData = null; t.art = core.makeArt(t.name + (t.size || ''), t.tint); dropThumb(t); releaseArt(old); });
    saveLibrary(); core.changed();
  }
  /* a picture key goes from the vault when no disc wears it any more */
  function releaseArt(key) { if (key && !S.list.some(t => t.artV === key)) { Vault.del(key); labels.delete(key); } }

  /* ---- taking discs off the shelf ---- */
  function removeTracks(idxs) {
    const set = new Set(idxs.filter(i => S.list[i] && !S.list[i].builtin));
    if (!set.size) { say('THE PRESSED DISCS DO NOT COME OFF THE SHELF.'); return 0; }
    const playing = S.list[S.ix], gone = [...set].map(i => S.list[i]);
    S.list = S.list.filter((t, i) => !set.has(i));
    S.queue = (S.queue || []).filter(t => gone.indexOf(t) < 0);
    gone.forEach(t => { if (t.vault) Vault.del(t.vault); dropThumb(t); });
    gone.forEach(t => { if (t.artV) releaseArt(t.artV); });
    if (gone.indexOf(playing) >= 0) { core.stop(); S.ix = Math.min(S.ix, S.list.length - 1); if (S.ix >= 0) core.loadDisc(S.ix, false); else { S.dur = 0; S.pos = 0; } }
    else S.ix = S.list.indexOf(playing);
    saveLibrary(); core.changed();
    say('REMOVED ' + (gone.length === 1 ? gone[0].name : gone.length + ' DISCS'));
    return gone.length;
  }

  /* ---- the tags of discs that came before the tags were kept: read again from the vault ---- */
  async function rescanTags(idxs, progress) {
    let n = 0, k = 0;
    for (const i of idxs) {
      const t = S.list[i];
      if (progress) progress(++k, idxs.length);
      if (!t || t.builtin || t.scanned || !t.vault) continue;
      try {
        const b = await Vault.get(t.vault);
        if (b) {
          const g = await readTags(b);
          if (!t.album && g.album) t.album = g.album.toUpperCase().slice(0, 60);
          if (!t.genre && g.genre) t.genre = g.genre;
          if (!t.year && g.year) t.year = g.year;
          if (!t.no && g.track) t.no = g.track;
          if (!t.label && g.art && !t.artV) { await setLabelQuiet(t, g.art); }
          n++;
        }
      } catch (e) { /* a disc that cannot be read stays as it was */ }
      t.scanned = true;
    }
    saveLibrary(); core.changed();
    return n;
  }
  async function setLabelQuiet(t, blob) { try { const L = await labelFrom(blob), key = L.blob ? await Vault.put(L.blob) : null; wear(t, L, key); } catch (e) { /* no picture */ } }

  /* ---- coming in ---- */
  const tops = f => { const p = (f.webkitRelativePath || '').split('/'); return p.length > 1 ? p.slice(0, -1) : []; };
  async function importFiles(files, opts) {
    opts = opts || {};
    const all = [].slice.call(files || []);
    const audio = all.filter(isAudio), pics = all.filter(isImage);
    if (!audio.length && !pics.length) { say('NOTHING IN THERE THIS MACHINE CAN PLAY.'); core.trayIn(false); return { added: [], skipped: 0 }; }
    core.trayIn(true);
    say('READING ' + audio.length + ' FILE' + (audio.length === 1 ? '' : 'S') + '...');
    const have = new Set(S.list.filter(t => !t.builtin && t.file).map(t => t.file + '|' + t.size));
    const todo = audio.filter(f => { const k = f.name + '|' + f.size; if (have.has(k)) return false; have.add(k); return true; });
    const skipped = audio.length - todo.length;
    S.loading += todo.length;
    const added = [], covers = new Map();                          /* a cover shared by a whole album is made once */
    let folderName = opts.folder || null;
    const dirFor = f => { if (!opts.keepFolders) return folderName; const p = tops(f); return p.length ? cleanDir(p[0]) : folderName; };
    const one = async (f, k) => {
      try {
        const tags = await readTags(f);
        const buf = await new Promise((res, rej) => f.arrayBuffer().then(ab => ctx.decodeAudioData(ab, res, rej)).catch(rej));
        const base = f.name.replace(/\.[^.]+$/, '');
        const nm = (tags.title || base).toUpperCase().slice(0, 60), tint = TINTS[(S.list.length + added.length) % TINTS.length], peaks = core.analysePeaks(buf, 480);
        const t = { name: nm, artist: (tags.artist || 'IMPORTED').toUpperCase().slice(0, 40), album: (tags.album || '').toUpperCase().slice(0, 60), genre: tags.genre || '', year: tags.year || null, no: tags.track || null,
                    file: f.name, size: f.size, ord: k, buf, builtin: false, tint, peaks, pk: peaksPack(peaks), dur: buf.duration, added: Date.now() + added.length, plays: 0, fav: false, scanned: true, art: core.makeArt(nm + f.size, tint) };
        const d = dirFor(f);
        if (d) { t.folder = d; const known = S.userDirs.find(x => x.name === d); if (!known) S.userDirs.push({ name: d, tint: TINTS[S.userDirs.length % TINTS.length] }); t.folderTint = (S.userDirs.find(x => x.name === d) || {}).tint; }
        core.addTrack(t);
        added.push(t);
        t.vault = await Vault.put(f);
        if (!t.vault) say('NO DISK — ' + t.name + ' LASTS UNTIL RELOAD.');
        if (tags.art) {
          const ck = await coverKey(tags.art);
          if (!covers.has(ck)) covers.set(ck, labelFrom(tags.art).then(async L => ({ L, key: L.blob ? await Vault.put(L.blob) : null })).catch(() => null));
          const c = await covers.get(ck);
          if (c) { wear(t, c.L, c.key); if (c.key) labels.set(c.key, Promise.resolve(c.L)); }
        }
        S.loading--; core.changed();
        if (S.ix < 0) { S.ix = S.list.indexOf(t); core.loadDisc(S.ix, false); }
      } catch (e) { S.loading--; say('COULD NOT READ ' + f.name.toUpperCase()); }
    };
    let next = 0;
    const lane = async () => { while (next < todo.length && core.alive()) { const k = next++; await one(todo[k], k); } };
    await Promise.all([lane(), lane()]);
    /* two decodes at a time finish in any order: the batch goes on the shelf in the order its files were given */
    const cur = S.list[S.ix], slots = added.map(t => S.list.indexOf(t)).sort((a, b) => a - b), ordered = added.slice().sort((a, b) => a.ord - b.ord);
    slots.forEach((at, k) => { S.list[at] = ordered[k]; });
    added.forEach(t => { delete t.ord; });
    if (cur) S.ix = S.list.indexOf(cur);
    /* pictures that came with the music: a folder's cover goes on the discs from that folder; any others are matched to albums, discs and folders by their names */
    if (pics.length && added.length) {
      const by = new Map();
      pics.forEach(p => { const k = tops(p).join('/'); (by.get(k) || by.set(k, []).get(k)).push(p); });
      const left = [];
      for (const [dir, list] of by) {
        const mates = added.filter(t => !t.label && tops(todo.find(f => f.name === t.file && f.size === t.size) || {}).join('/') === dir);
        const c = dir && mates.length ? pickCover(list.map(p => p.name)) : -1;
        if (c >= 0) { const L = await labelFrom(list[c]).catch(() => null); if (L) { const key = L.blob ? await Vault.put(L.blob) : null; mates.forEach(t => wear(t, L, key)); list.splice(c, 1); } }
        list.forEach(p => left.push(p));
      }
      if (left.length) {
        const groups = [];
        added.forEach((t, i) => { if (t.album) groups.push({ id: 'a:' + t.album, kind: 'album', name: t.album }); groups.push({ id: 't:' + i, kind: 'track', name: t.name }); if (t.folder) groups.push({ id: 'f:' + t.folder, kind: 'folder', name: t.folder }); });
        for (const m of match(left, groups)) {
          if (!m.group) continue;
          const L = await labelFrom(left[m.image]).catch(() => null); if (!L) continue;
          const key = L.blob ? await Vault.put(L.blob) : null;
          added.forEach((t, i) => { if (m.group.id === 'a:' + t.album || m.group.id === 't:' + i || m.group.id === 'f:' + t.folder) wear(t, L, key); });
        }
      }
    }
    saveLibrary(); saveDirs(); core.changed(); core.trayIn(false);
    say(added.length ? 'LOADED ' + (added.length === 1 ? added[0].name : added.length + ' DISCS') + (skipped ? '  (' + skipped + ' ALREADY HERE)' : '') : (skipped ? 'ALL ' + skipped + ' WERE ALREADY HERE.' : 'NOTHING IN THERE THIS MACHINE CAN PLAY.'));
    return { added, skipped };
  }

  return { saveLibrary, saveDirs, saveSettings, loadLibrary, importFiles, removeTracks, setLabel, clearLabel, rescanTags, releaseArt };
}
