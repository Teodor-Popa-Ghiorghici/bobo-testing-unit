/* What a file manager needs that a key-value store does not give you: move,
   copy, rename, a recycle bin, and a way back for the files the machine
   shipped with. Everything is built from the primitives in vfs.js and hung on
   the same `fs` object, so apps reach it as ctx.fs.move(...) and friends.

   Every operation that changes what a folder shows ends by announcing it with
   a `vfs-changed` event, so the desktop and every open folder window redraw
   themselves and no caller has to remember to. */
import { fs } from './vfs.js';
import { Style } from './style.js';
import { sys, sess } from './trophy_hook.js';
import { handedItems } from './handed.js';

export const TRASH = '::/.Trash';
const MOVED_KEY = 'templeos.vfs.moved.v1';

export const baseName = p => p.slice(p.lastIndexOf('/') + 1);
export const dirOf = p => { const i = p.lastIndexOf('/'); return i <= 2 ? '::' : p.slice(0, i); };
export const joinPath = (dir, name) => (dir === '::' || dir === '::/' ? '::/' : dir.replace(/\/$/, '') + '/') + name;

/* announced a moment later, once per folder: a paste of two hundred things, or a loop that renames a hundred,
   makes one redraw of the desktop and of each folder window instead of two hundred */
const due = new Set();
let dueTimer = null;
function changed(...dirs) {
  dirs.filter(Boolean).forEach(d => due.add(d));
  if (dueTimer || !due.size) return;
  dueTimer = setTimeout(() => {
    dueTimer = null;
    const now = Array.from(due); due.clear();
    now.forEach(dir => { try { window.dispatchEvent(new CustomEvent('vfs-changed', { detail: { dir } })); } catch (e) {} });
  }, 24);
}

/* ---- the files the machine shipped with ------------------------------------
   assets/seed.json is the list. When one of them is moved or renamed we write
   down where it went, so "restore system files" can tell a file the user
   put away from a file that is gone. */
let seedCache = null;
async function shippedItems() {
  if (seedCache) return seedCache;
  try {
    const res = await fetch('assets/seed.json');
    seedCache = res.ok ? await res.json() : [];
  } catch (e) { seedCache = []; }
  return seedCache;
}
/* what the machine shipped with, and what it has handed over since (the trophy box, a mastered game's folder, the pictures bought from Dave: kernel/handed.js) */
async function seedItems() { return (await shippedItems()).concat(await handedItems()); }
const loadMoved = () => { try { return JSON.parse(localStorage.getItem(MOVED_KEY)) || {}; } catch (e) { return {}; } };
/* pairs of [from, to]: written down in one go, and only when one of them is a file the machine shipped with */
export async function trackMany(pairs) {
  const seed = await seedItems();
  if (!seed.length) return;
  let moved = null;
  pairs.forEach(([src, dst]) => {
    const hit = seed.filter(it => it.path === src || it.path.indexOf(src + '/') === 0);
    if (!hit.length) return;
    moved = moved || loadMoved();
    hit.forEach(it => { moved[it.path] = dst + it.path.slice(src.length); });
  });
  if (moved) { try { localStorage.setItem(MOVED_KEY, JSON.stringify(moved)); } catch (e) {} }
}
const track = (src, dst) => trackMany([[src, dst]]);

/* ---- names ---------------------------------------------------------------- */
/* the first free "Name (n)" given the names already taken: one listing of the folder, not a question per candidate */
export function pickName(taken, name) {
  if (!taken.has(name)) return name;
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name, ext = dot > 0 ? name.slice(dot) : '';
  for (let n = 2; n < 100000; n++) {
    const cand = stem + ' (' + n + ')' + ext;
    if (!taken.has(cand)) return cand;
  }
  return stem + ' (' + Date.now() + ')' + ext;
}
async function uniqueName(dir, name) { return pickName(await fs.names(dir), name); }

function cleanName(name) {
  const n = String(name || '').replace(/[\\/]/g, '').trim();
  if (!n) throw new Error('A NAME CANNOT BE EMPTY.');
  if (n.charAt(0) === '.') throw new Error('A NAME CANNOT START WITH A DOT.');
  return n;
}

/* ---- move / copy / rename -------------------------------------------------- */
async function transfer(src, dstDir, copy) {
  const kind = await fs.stat(src);
  if (!kind) throw new Error('THAT IS NOT THERE ANY MORE.');
  if (kind === 'folder' && (dstDir === src || dstDir.indexOf(src + '/') === 0)) {
    throw new Error('A FOLDER CANNOT GO INSIDE ITSELF.');
  }
  if (!copy && dirOf(src) === dstDir) return src;
  const dst = joinPath(dstDir, await uniqueName(dstDir, baseName(src)));
  const ents = await fs.entries(src);
  await fs.putMany(ents.map(([k, v]) => [dst + k.slice(src.length), v]));
  if (!copy) { await fs.removeQuiet(src); await track(src, dst); }
  changed(dirOf(src), dstDir);
  return dst;
}
const move = (src, dstDir) => transfer(src, dstDir, false);
const copy = (src, dstDir) => transfer(src, dstDir, true);

async function rename(path, newName) {
  const name = cleanName(newName);
  if (name === baseName(path)) return path;
  const dst = joinPath(dirOf(path), name);
  if (await fs.stat(dst)) throw new Error(name + ' ALREADY EXISTS HERE.');
  const ents = await fs.entries(path);
  if (!ents.length) throw new Error('THAT IS NOT THERE ANY MORE.');
  await fs.putMany(ents.map(([k, v]) => [dst + k.slice(path.length), v]));
  await fs.removeQuiet(path);
  await track(path, dst);
  changed(dirOf(path));
  return dst;
}

async function mkdir(path) {
  if (await fs.stat(path)) throw new Error('ALREADY EXISTS.');
  await fs.write(path + '/.keep', { type: 'text', content: '' });
  changed(dirOf(path));
  sess.folders.push(path); sys.emit('mkdir', { path: path, depth: path.split('/').length - 1 });
}

/* ---- the recycle bin --------------------------------------------------------
   ::/.Trash/<id>/<name> holds the thing itself, ::/.Trash/<id>/.from holds
   where it came from. Dot names are hidden from every listing, so the bin
   is invisible until you open it. */
async function trash(path) {
  if (path === '::' || path.indexOf(TRASH) === 0) throw new Error('THAT CANNOT BE DELETED.');
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const ents = await fs.entries(path);
  await fs.write(TRASH + '/' + id + '/.from', { type: 'text', content: path });
  const dst = await transfer(path, TRASH + '/' + id, false);
  try { Style.hit({ name: baseName(path) }, Math.max(1, ents.filter(e => baseName(e[0]) !== '.keep').length)); } catch (e) {}
  changed(TRASH);
  return { id, path: dst };
}

async function trashList() {
  const ids = await fs.list(TRASH);
  const lists = await Promise.all(ids.map(d => fs.list(TRASH + '/' + d.name)));
  const froms = await fs.readMany(ids.map(d => TRASH + '/' + d.name + '/.from'));
  const out = [], empty = [];
  ids.forEach((d, i) => {
    const dir = TRASH + '/' + d.name, kids = lists[i];
    if (!kids.length) { empty.push(dir); return; }
    const it = kids[0];
    out.push({ id: d.name, name: it.name, type: it.type, app: it.app, from: froms[i] ? froms[i].content : '::/' + it.name,
               path: dir + '/' + it.name, at: parseInt(d.name, 36) || 0 });
  });
  if (empty.length) await fs.removeManyQuiet(empty);
  return out.sort((a, b) => b.at - a.at);
}

async function trashRestore(id) {
  const dir = TRASH + '/' + id;
  const kids = await fs.list(dir);
  if (!kids.length) throw new Error('THAT IS NOT IN THE BIN ANY MORE.');
  const from = await fs.read(dir + '/.from');
  const target = dirOf(from ? from.content : '::/' + kids[0].name);
  const dst = await transfer(dir + '/' + kids[0].name, target, false);
  await fs.removeQuiet(dir);
  changed(TRASH, target);
  return dst;
}

async function trashPurge(id) { await fs.removeQuiet(TRASH + '/' + id); changed(TRASH); }
async function trashEmpty() { await fs.removeQuiet(TRASH); changed(TRASH); }

/* ---- bring back what the machine shipped with -------------------------------
   Only what is missing. A file that is still there (edited or not) is left
   alone, a file the user moved or renamed counts as present, a file in the
   bin is taken out of the bin (their edits intact), and the rest is written
   fresh from the seed. The desktop is not reset, nothing else is touched. */
async function restoreSystem() {
  const seed = await seedItems();
  const moved = loadMoved();
  const back = [];
  for (const it of seed) {
    if (await fs.stat(it.path)) continue;
    const m = moved[it.path];
    if (m && await fs.stat(m)) {
      if (m.indexOf(TRASH + '/') === 0) {
        try { await trashRestore(m.split('/')[2]); back.push(it.path); } catch (e) {}
      }
      continue;
    }
    if (it.folder) { try { await it.make(); back.push(it.path); } catch (e) { /* the folder is made again next time */ } continue; }
    await fs.write(it.path, { type: it.type, content: it.content, src: it.src, app: it.app, args: it.args });
    back.push(it.path);
  }
  changed('::');
  return Array.from(new Set(back.map(p => p.split('/')[1])));
}

Object.assign(fs, { move, copy, rename, mkdir, uniqueName, trash, trashList, trashRestore, trashPurge,
                    trashEmpty, restoreSystem });
export { move, copy, rename, mkdir, uniqueName, trash, trashList, trashRestore, trashPurge, trashEmpty,
         restoreSystem, changed };

/* is this one of the files the machine shipped with? */
export async function isSystem(path) {
  const seed = await seedItems();
  return seed.some(it => it.path === path || it.path.indexOf(path + '/') === 0);
}
fs.isSystem = isSystem;
