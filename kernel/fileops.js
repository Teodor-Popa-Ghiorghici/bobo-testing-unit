/* The things you do to files, the same everywhere: on the desktop, in a folder
   window, from the Edit menu, from the keyboard. Nothing here knows which of
   those it was called from -- callers hand over paths, and get a toast back. */
import { fs } from './vfs.js';
import { gatherTrash, commitTrash, hitPile } from './vfs_batch.js';
import { Snd } from './snd.js';
import { Style } from './style.js';
import { planReel, chunkItems, melody } from './delete_reel.js';
import { openWindow, createWindow, toast, askName } from './wm.js';
import { baseName, dirOf, joinPath, changed, TRASH } from './vfs_ops.js';
import { sys } from './trophy_hook.js';
import { BinLook } from './bin_look.js';

export const Clip = { mode: null, paths: [] };
const undo = [];                                   /* what was put in the bin, newest last: one entry (a list of ids) per delete */

export const TYPE_NAMES = { folder: 'FOLDER', app: 'PROGRAM', terminal: 'PROGRAM', bin: 'RECYCLE BIN', image: 'PICTURE',
  video: 'VIDEO', text: 'TEXT FILE', doc: 'DOCUMENT', code: 'HOLYC SOURCE', song: 'SONG', file: 'FILE' };

/* the kind a new file gets from its name */
export function typeForName(name) {
  if (/\.HC$/i.test(name)) return 'code';
  if (/\.DD$/i.test(name)) return 'doc';
  if (/\.SONG$/i.test(name)) return 'song';
  return 'text';
}

const say = (msg, bad) => { toast(msg); if (bad && window.Snd) window.Snd.err(); };
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 'S');

/* ---- opening ---------------------------------------------------------------- */
export function openItem(dir, item) {
  const p = item.path || joinPath(dir, item.name);
  let job;
  if (item.type === 'folder') job = openWindow('folder', { path: p });
  else if (item.type === 'terminal') job = openWindow('terminal');
  else if (item.type === 'bin' || item.type === 'binfull') job = openWindow('trash');
  else if (item.type === 'app') job = item.app ? openWindow(item.app, item.args ? Object.assign({ from: p }, item.args) : undefined) : (toast('NO SUCH APP: ' + item.name), null);
  else if (item.type === 'song') job = openWindow('garage', { path: p });
  else if (['code', 'doc', 'text'].includes(item.type)) job = openWindow('editor', { path: p, type: item.type });
  else job = openWindow('viewer', { path: p, type: item.type });
  if (job && job.catch) job.catch(console.error);
}
export const openAsText = item => openWindow('editor', { path: item.path, type: 'text' }).catch(console.error);

/* ---- copy / cut / paste ------------------------------------------------------ */
export function copyPaths(paths, cut) {
  if (!paths.length) return;
  Clip.mode = cut ? 'cut' : 'copy';
  Clip.paths = paths.slice();
  say((cut ? 'CUT ' : 'COPIED ') + plural(paths.length, 'ITEM') + '. PASTE IT WHERE YOU WANT IT.');
}

export async function pasteInto(dir) {
  if (!Clip.paths.length) { say('NOTHING TO PASTE.', true); return []; }
  const cut = Clip.mode === 'cut';
  const r = await (cut ? fs.moveMany : fs.copyMany)(Clip.paths, dir);
  if (cut) { Clip.mode = null; Clip.paths = []; }
  say(r.bad.length ? r.bad[0] : (cut ? 'MOVED ' : 'PASTED ') + plural(r.made.length, 'ITEM') + '.', !!r.bad.length);
  return r.made;
}

export async function duplicate(paths) {
  const r = await fs.duplicateMany(paths);
  if (r.bad.length) say(r.bad[0], true);
  if (r.made.length) say('DUPLICATED ' + plural(r.made.length, 'ITEM') + '.');
  return r.made;
}

/* ---- delete and undo ---------------------------------------------------------- */
/* A selection goes into the bin on a reel (kernel/delete_reel.js): the meter is hit once for the whole pile, then the
   files go a beat at a time, each beat a short cooldown after the one before and each a note of a fast tune, so
   deleting a lot of files is a melody and not a thump. A single file is a "dun-dun". Piles queue behind each other,
   and Ctrl+Z waits for the one that is running. The pile is one undo.
   The reel is a show and not forty-eight jobs: the whole pile goes into the bin in ONE transaction first (what used
   to be a transaction, a listing of the desk and a redraw of it on every beat was where the lag came from), and then
   each beat only takes its icons off the screen (a `vfs-reel` event: the desktop and any folder window showing them
   remove just those elements). One `vfs-changed` at the end makes every view true again. */
const sleep = ms => new Promise(r => setTimeout(r, ms));
let reeling = Promise.resolve();

async function reel(g) {
  const plan = planReel(g.items.length), tier = Math.max(0, Style.tier);
  hitPile(g.items[0].path, g.files);
  if (g.items.length === 1) { Snd.reelOne(tier); await commitTrash(g.items); return; }
  const tune = melody(plan.steps), beats = chunkItems(g.items, plan.chunk);
  const dirs = await commitTrash(g.items, true);
  const t0 = performance.now();
  try {
    for (let i = 0; i < beats.length; i++) {
      Snd.reelNote(tune[i].hz, tier, tune[i].accent);
      if (i === beats.length - 1) Snd.reelEnd();
      window.dispatchEvent(new CustomEvent('vfs-reel', { detail: { paths: beats[i].map(it => it.path) } }));
      const wait = t0 + (i + 1) * plan.gap - performance.now();
      if (i < beats.length - 1 && wait > 0) await sleep(wait);
    }
  } finally { changed(TRASH, ...dirs); }
}

export function deletePaths(paths) {
  const job = reeling.then(async () => {
    const g = await gatherTrash(paths);
    if (g.bad.length) say(g.bad[0], true);
    const n = g.items.length;
    if (!n) return 0;
    await reel(g);
    sys.emit('delete', { n: Math.max(n, g.files || 0) });
    undo.push(g.items.map(i => i.id));
    say(n > 1 ? n + ' ITEMS IN THE ' + BinLook.name() + '.' : baseName(g.items[0].path) + ' IS IN THE ' + BinLook.name() + '.');
    return n;
  });
  reeling = job.catch(() => {});
  return job;
}
export async function undoDelete() {
  await reeling;
  while (undo.length) {
    const ids = undo.pop();
    const r = await fs.restoreMany(ids);
    if (r.made.length) { say(r.made.length > 1 ? 'PUT BACK: ' + plural(r.made.length, 'ITEM') : 'PUT BACK: ' + baseName(r.made[0])); sys.emit('undo'); return r.made[0]; }
    /* already gone: try the one before */
  }
  say('NOTHING TO UNDO.', true);
  return null;
}

/* ---- naming ------------------------------------------------------------------- */
export function renamePrompt(path, done) {
  askName('RENAME', baseName(path), async name => {
    try {
      const to = await fs.rename(path, name);
      say('RENAMED TO ' + baseName(to) + '.');
      if (done) done(to);
    } catch (e) { say(e.message, true); }
  });
}

export function newFolderPrompt(dir, done) {
  dir = dir || '::';
  askName('NEW FOLDER', 'New Folder', async name => {
    name = (name || '').trim();
    if (!name) return;
    try {
      const final = await fs.uniqueName(dir, name);
      await fs.mkdir(joinPath(dir, final));
      say('FOLDER CREATED: ' + final);
      if (done) done(joinPath(dir, final));
    } catch (e) { say('COULD NOT CREATE THE FOLDER.', true); }
  });
}

export function newFilePrompt(dir, done) {
  dir = dir || '::';
  askName('NEW TEXT FILE', 'Untitled.TXT', async name => {
    name = (name || '').trim();
    if (!name) return;
    try {
      const final = await fs.uniqueName(dir, name);
      const p = joinPath(dir, final);
      await fs.write(p, { type: typeForName(final), content: '' });
      changed(dir);
      if (done) done(p);
      openWindow('editor', { path: p, type: typeForName(final) }).catch(console.error);
    } catch (e) { say('COULD NOT CREATE THE FILE.', true); }
  });
}

/* ---- properties --------------------------------------------------------------- */
async function measure(path) {
  const ents = await fs.entries(path);
  let bytes = 0, files = 0;
  ents.forEach(([k, v]) => {
    if (baseName(k) === '.keep') return;
    files++;
    if (v && v.content) bytes += v.content.length;
    else if (v && v.src) bytes += Math.round(v.src.length * 0.75);
  });
  return { bytes, files };
}
const KB = n => n < 1024 ? n + ' BYTES' : (n / 1024).toFixed(1) + ' KB';

export async function showProps(path) {
  const kind = await fs.stat(path);
  if (!kind) { say('THAT IS NOT THERE ANY MORE.', true); return; }
  const rec = kind === 'file' ? await fs.read(path) : null;
  const type = kind === 'folder' ? 'folder' : (rec && rec.type) || 'file';
  const m = await measure(path);
  const sys = fs.isSystem ? await fs.isSystem(path) : false;
  const rows = [['NAME', baseName(path)], ['KIND', TYPE_NAMES[type] || 'FILE'], ['WHERE', dirOf(path)],
    ['SIZE', type === 'app' ? '-' : kind === 'folder' ? plural(m.files, 'FILE') + ', ' + KB(m.bytes) : KB(m.bytes)],
    ['SYSTEM FILE', sys ? 'YES. RESTORE SYSTEM FILES BRINGS IT BACK.' : 'NO']];
  if (rec && rec.app) rows.splice(2, 0, ['RUNS', rec.app.toUpperCase()]);
  createWindow({
    kind: 'text', title: 'PROPERTIES', w: 440, h: 60 + rows.length * 22, zoomable: false,
    build: body => {
      const box = document.createElement('div');
      box.className = 'dlgpane';
      rows.forEach(([a, b]) => {
        const d = document.createElement('div');
        d.style.cssText = 'display:flex;gap:10px;padding:2px 0';
        const l = document.createElement('span'); l.style.cssText = 'width:96px;color:#FFFF55'; l.textContent = a;
        const v = document.createElement('span'); v.style.cssText = 'color:#FFFFFF;flex:1'; v.textContent = b;
        d.appendChild(l); d.appendChild(v); box.appendChild(d);
      });
      body.appendChild(box);
    }
  });
}

/* ---- the keyboard, for anything that shows files ------------------------------
   env: { dir, sel() -> [{name,type,app,path}], selectAll(), up?(), open(item) } */
export function fileKey(ev, env) {
  if (ev.target && /input|textarea/i.test(ev.target.tagName)) return false;
  const mod = ev.ctrlKey || ev.metaKey, k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
  const sel = env.sel(), paths = sel.map(i => i.path).filter(Boolean);
  let handled = true;
  if (k === 'Delete' && paths.length) deletePaths(paths);
  else if (k === 'F2' && sel.length === 1) renamePrompt(paths[0]);
  else if (k === 'Enter' && sel.length) sel.forEach(i => env.open(i));
  else if (k === 'Backspace' && env.up) env.up();
  else if (mod && k === 'a') env.selectAll();
  else if (mod && k === 'c' && paths.length) copyPaths(paths, false);
  else if (mod && k === 'x' && paths.length) copyPaths(paths, true);
  else if (mod && k === 'v') pasteInto(env.dir);
  else if (mod && k === 'd' && paths.length) duplicate(paths);
  else if (mod && k === 'z') undoDelete();
  else handled = false;
  if (handled) ev.preventDefault();
  return handled;
}

/* ---- bring back the machine's own files ---------------------------------------- */
export async function restoreSystemFiles() {
  let names = [];
  try { names = await fs.restoreSystem(); } catch (e) { say('COULD NOT RESTORE: ' + e.message, true); return []; }
  if (names.length) { sys.emit('restore-system', { n: names.length }); say('SYSTEM FILES BACK: ' + names.join(', ').slice(0, 110)); if (window.Snd) window.Snd.chime && window.Snd.chime(); }
  else say('EVERY SYSTEM FILE IS ALREADY HERE.');
  return names;
}

/* ---- whose keys are they? -------------------------------------------------------
   Delete, F2, Ctrl+C... belong to whichever list of files you last clicked in:
   the desktop or one folder window. Clicking in any other window means none
   of them do, so Delete in a game can never reach the desktop behind it. */
export const Active = { env: null, desk: null };
export function wireActive(deskEnv) {
  Active.desk = Active.env = deskEnv;
  document.addEventListener('mousedown', ev => {
    const t = ev.target;
    if (!t || !t.closest) return;
    const w = t.closest('.win');
    if (w) Active.env = w._fileEnv || null;
    else if (t.closest('#desktop')) Active.env = Active.desk;
  }, true);
  document.addEventListener('keydown', ev => {
    /* a folder window that has been closed no longer owns the keys */
    if (Active.env && Active.env.alive && !Active.env.alive()) Active.env = Active.desk;
    if (Active.env) fileKey(ev, Active.env);
  });
}
