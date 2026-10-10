/* Many files at once, as one operation. A selection of two hundred icons dragged to a folder, pasted, duplicated,
   deleted or put back used to be two hundred separate round trips to the store, each one asking the folder for a free
   name, writing, removing, writing down where a shipped file went and announcing the change, so every one of them cost
   a little more than the last and the desktop redrew itself after each. Here a batch reads what it needs once, writes
   in one transaction, removes in one transaction, and says what changed once.
   Each function answers { made: [path...], bad: [message...] } and never throws for one bad item. */
import { fs } from './vfs.js';
import { Style } from './style.js';
import { TRASH, baseName, dirOf, joinPath, pickName, trackMany, changed, isSystem } from './vfs_ops.js';
import { sys } from './trophy_hook.js';

/* paths into a folder, copied or moved; the names are chosen against the folder's own listing and against each other */
async function transferMany(srcs, dstDir, copy, quiet) {
  const taken = await fs.names(dstDir);
  const puts = [], gone = [], pairs = [], made = [], bad = [], from = new Set();
  let moved = 0;
  for (const src of srcs) {
    if (from.has(src)) continue;
    from.add(src);
    if (src === dstDir || dstDir.indexOf(src + '/') === 0) { bad.push('A FOLDER CANNOT GO INSIDE ITSELF.'); continue; }
    if (!copy && dirOf(src) === dstDir) { made.push(src); continue; }
    const ents = await fs.entries(src);
    if (!ents.length) { bad.push('THAT IS NOT THERE ANY MORE.'); continue; }
    const name = pickName(taken, baseName(src));
    taken.add(name);
    const dst = joinPath(dstDir, name);
    ents.forEach(([k, v]) => puts.push([dst + k.slice(src.length), v]));
    if (!copy) { gone.push(src); pairs.push([src, dst]); }
    made.push(dst);
    moved++;
  }
  await fs.putMany(puts);
  await fs.removeManyQuiet(gone);
  if (pairs.length) await trackMany(pairs);
  changed(dstDir, ...gone.map(dirOf));
  /* the trophies hear every move and copy from here, since a drag, a paste and a drop all end in these two calls: `own` is a folder somebody made (not one of the machine's) */
  if (moved && !quiet) isSystem(dstDir).then(sysDir => sys.emit(copy ? 'copy' : 'move', { to: dstDir, n: moved, own: !sysDir && dstDir !== '::' && dstDir.indexOf(TRASH) !== 0 })).catch(() => {});
  return { made, bad };
}
const moveMany = (srcs, dstDir) => transferMany(srcs, dstDir, false);
const copyMany = (srcs, dstDir) => transferMany(srcs, dstDir, true);

/* a copy of each, next to the original */
async function duplicateMany(srcs) {
  const by = new Map();
  srcs.forEach(p => { const d = dirOf(p); by.set(d, (by.get(d) || []).concat(p)); });
  const made = [], bad = [];
  for (const [dir, list] of by) { const r = await transferMany(list, dir, true, true); made.push(...r.made); bad.push(...r.bad); }
  return { made, bad };
}

/* Into the bin takes two steps so that kernel/fileops.js can pace it (kernel/delete_reel.js): `gatherTrash` reads
   everything the pile is made of once, and `commitTrash` moves any part of it, in one transaction, and says what
   changed. `trashMany` is both at once, for anything that wants the whole pile gone in a moment. */
async function gatherTrash(paths) {
  const items = [], bad = [], used = new Set(), seen = new Set();
  let files = 0;
  for (const path of paths) {
    if (seen.has(path)) continue;
    seen.add(path);
    if (path === '::' || path.indexOf(TRASH) === 0) { bad.push('THAT CANNOT BE DELETED.'); continue; }
    const ents = await fs.entries(path);
    if (!ents.length) { bad.push('THAT IS NOT THERE ANY MORE.'); continue; }
    let id;
    do { id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5); } while (used.has(id));
    used.add(id);
    const n = ents.filter(e => baseName(e[0]) !== '.keep').length;
    files += n;
    items.push({ path, id, ents, files: n });
  }
  return { items, bad, files };
}

/* the meter is hit once, with the number of files that died, because a pile deleted at once is worth more than the
   same files one by one (kernel/style_model.js) and because two hundred separate hits each did their own sound,
   their own burst of sparks and their own redraw */
function hitPile(first, files) {
  try { Style.hit({ name: baseName(first) }, Math.max(1, files)); } catch (e) {}
}

/* `quiet`: the data moves but nothing is announced, and the folders it left are handed back: the reel in fileops.js
   then takes the files off the screen a beat at a time and announces once at the end, so two hundred files cost one
   transaction and one redraw, not forty-eight of each */
async function commitTrash(items, quiet) {
  const puts = [], gone = [], pairs = [];
  for (const { path, id, ents } of items) {
    const dst = TRASH + '/' + id + '/' + baseName(path);
    puts.push([TRASH + '/' + id + '/.from', { type: 'text', content: path }]);
    ents.forEach(([k, v]) => puts.push([dst + k.slice(path.length), v]));
    gone.push(path); pairs.push([path, dst]);
  }
  await fs.putMany(puts);
  await fs.removeManyQuiet(gone);
  if (pairs.length) await trackMany(pairs);
  const dirs = gone.map(dirOf);
  if (!quiet) changed(TRASH, ...dirs);
  return dirs;
}

async function trashMany(paths) {
  const g = await gatherTrash(paths);
  if (g.items.length) { await commitTrash(g.items); hitPile(g.items[0].path, g.files); }
  return { ids: g.items.map(i => i.id), bad: g.bad };
}

/* put a group back where each came from */
async function restoreMany(ids) {
  const recs = await fs.readMany(ids.map(id => TRASH + '/' + id + '/.from'));
  const by = new Map(), made = [], bad = [];
  for (let i = 0; i < ids.length; i++) {
    const dir = TRASH + '/' + ids[i];
    const kids = await fs.list(dir);
    if (!kids.length) { bad.push('THAT IS NOT IN THE BIN ANY MORE.'); continue; }
    const target = dirOf(recs[i] ? recs[i].content : '::/' + kids[0].name);
    if (!by.has(target)) by.set(target, []);
    by.get(target).push({ src: dir + '/' + kids[0].name, dir });
  }
  for (const [target, list] of by) {
    const r = await transferMany(list.map(x => x.src), target, false);
    made.push(...r.made); bad.push(...r.bad);
    await fs.removeManyQuiet(list.map(x => x.dir));
    changed(TRASH, target);
  }
  return { made, bad };
}

/* gone for good: the listed bin entries, in one go */
async function purgeMany(ids) {
  await fs.removeManyQuiet(ids.map(id => TRASH + '/' + id));
  changed(TRASH);
}

Object.assign(fs, { moveMany, copyMany, duplicateMany, trashMany, restoreMany, purgeMany });
export { moveMany, copyMany, duplicateMany, trashMany, restoreMany, purgeMany, gatherTrash, commitTrash, hitPile };
