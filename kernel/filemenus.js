/* The right-click menus for files. One for "these things are selected", one
   for "the empty part of this folder", both the same on the desktop and in a
   folder window; the caller adds whatever is only true where it is. */
import { BinLook } from './bin_look.js';
import { Clip, openItem, openAsText, copyPaths, pasteInto, duplicate, deletePaths, renamePrompt,
         newFolderPrompt, newFilePrompt, showProps, undoDelete } from './fileops.js';
import { pickUpload } from './importer.js';
import { wallpaperMenu } from './wallpaper.js';
import { openCompile, runFileHolyC } from './compile.js';
import { openWindow } from './wm.js';

/* env: { dir, items: [{name,type,app,path}] (the selection), selectAll() } */
export function itemMenu(env) {
  const sel = env.items, one = sel.length === 1 ? sel[0] : null, paths = sel.map(i => i.path);
  const out = [];
  if (one) {
    out.push({ label: 'OPEN', key: 'Enter', run: () => openItem(env.dir, one) });
    if (one.type === 'folder') {
      out.push({ label: 'UPLOAD IMAGES HERE...', run: () => pickUpload(one.path, 'media') });
      out.push({ label: 'UPLOAD TEXT FILES HERE...', run: () => pickUpload(one.path, 'text') });
    }
    if (one.type === 'image' || one.type === 'video') {
      const modes = wallpaperMenu(one.path, one.type === 'video');
      out.push({ label: 'SET AS BACKGROUND', run: modes[0].run });
      out.push({ label: 'BACKGROUND STYLE', sub: modes });
    }
    if (one.type === 'song') out.push({ label: 'EDIT AS TEXT', run: () => openAsText(one) });
    if (['text', 'code', 'doc'].includes(one.type)) {
      out.push({ label: 'COMPILE', run: () => { window._lastTextPath = one.path; openCompile(); } });
    }
    if (one.type === 'code') out.push({ label: 'RUN IT', run: () => runFileHolyC(one.path) });
  } else {
    out.push({ label: 'OPEN ' + sel.length + ' ITEMS', key: 'Enter', run: () => sel.forEach(i => openItem(env.dir, i)) });
  }
  out.push({ sep: true });
  out.push({ label: 'CUT', key: 'Ctrl+X', run: () => copyPaths(paths, true) });
  out.push({ label: 'COPY', key: 'Ctrl+C', run: () => copyPaths(paths, false) });
  if (one && one.type === 'folder') {
    out.push({ label: 'PASTE INTO', key: 'Ctrl+V', off: !Clip.paths.length, run: () => pasteInto(one.path) });
  }
  out.push({ label: 'DUPLICATE', key: 'Ctrl+D', run: () => duplicate(paths) });
  out.push({ sep: true });
  if (one) out.push({ label: 'RENAME', key: 'F2', run: () => renamePrompt(one.path) });
  out.push({ label: sel.length > 1 ? 'DELETE ' + sel.length + ' ITEMS' : 'DELETE', key: 'Del', run: () => deletePaths(paths) });
  if (one) {
    out.push({ sep: true });
    out.push({ label: 'PROPERTIES', run: () => showProps(one.path) });
  }
  return out;
}

export function spaceMenu(env) {
  return [
    { label: 'NEW FOLDER...', run: () => newFolderPrompt(env.dir) },
    { label: 'NEW TEXT FILE...', run: () => newFilePrompt(env.dir) },
    { sep: true },
    { label: 'PASTE', key: 'Ctrl+V', off: !Clip.paths.length, run: () => pasteInto(env.dir) },
    { label: 'SELECT ALL', key: 'Ctrl+A', run: () => env.selectAll() },
    { sep: true },
    { label: 'UPLOAD IMAGES / VIDEO...', run: () => pickUpload(env.dir, 'media') },
    { label: 'UPLOAD TEXT FILES...', run: () => pickUpload(env.dir, 'text') }
  ];
}

/* the Edit menu: whichever of the desktop or a folder window you touched last */
export function editMenu(env) {
  const have = env && env.items().length;
  const paths = have ? env.items().map(i => i.path) : [];
  return [
    { label: 'UNDO DELETE', key: 'Ctrl+Z', run: () => undoDelete() },
    { sep: true },
    { label: 'CUT', key: 'Ctrl+X', off: !have, run: () => copyPaths(paths, true) },
    { label: 'COPY', key: 'Ctrl+C', off: !have, run: () => copyPaths(paths, false) },
    { label: 'PASTE', key: 'Ctrl+V', off: !env || !Clip.paths.length, run: () => pasteInto(env.dir) },
    { label: 'DUPLICATE', key: 'Ctrl+D', off: !have, run: () => duplicate(paths) },
    { sep: true },
    { label: 'SELECT ALL', key: 'Ctrl+A', off: !env, run: () => env.selectAll() },
    { label: 'RENAME', key: 'F2', off: paths.length !== 1, run: () => renamePrompt(paths[0]) },
    { label: 'DELETE', key: 'Del', off: !have, run: () => deletePaths(paths) },
    { label: 'PROPERTIES', off: paths.length !== 1, run: () => showProps(paths[0]) },
    { sep: true },
    { label: BinLook.name() + '...', run: () => openWindow('trash').catch(console.error) }
  ];
}
