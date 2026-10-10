/* The menu bar across the top. File, Edit, Tools and Help drop a menu; Compile
   compiles the file you last had open; Debug opens the machine's diagnostics.
   File and Edit work on whatever list of files you last clicked in. */
import { BinLook } from './bin_look.js';
import { showMenu, hideMenus } from './menus.js';
import { openWindow, toast } from './wm.js';
import { Active, restoreSystemFiles, newFolderPrompt, newFilePrompt } from './fileops.js';
import { editMenu } from './filemenus.js';
import { pickUpload } from './importer.js';
import { hasWallpaper, clearWallpaper } from './wallpaper.js';
import { openCompile } from './compile.js';
import { UP } from './imaging.js';

const open = id => openWindow(id).catch(console.error);
const help = topic => import('./help.js').then(m => m.openHelp(topic)).catch(console.error);

export function wireMenubar(hooks) {
  const here = () => (Active.env && Active.env.dir) || '::';
  const items = {
    File() {
      const d = here(), tag = d === '::' ? '::/' : d;
      const out = [
        { label: 'NEW FOLDER...', run: () => newFolderPrompt(d) },
        { label: 'NEW TEXT FILE...', run: () => newFilePrompt(d) },
        { sep: true },
        { label: 'UPLOAD IMAGES / VIDEO -> ' + tag, run: () => pickUpload(d, 'media') },
        { label: 'UPLOAD TEXT FILES...  -> ' + tag, run: () => pickUpload(d, 'text') },
        { sep: true },
        { label: 'VGA 16-COLOR IMPORT: ' + (UP.vga ? 'ON' : 'OFF'), run: () => {
            UP.vga = !UP.vga;
            toast('VGA 16-COLOR IMPORT ' + (UP.vga ? 'ON' : 'OFF') + '. AFFECTS NEW UPLOADS.');
          } },
        { label: 'ARRANGE ICONS', run: () => hooks.arrange() }
      ];
      if (hasWallpaper()) out.push({ label: 'CLEAR BACKGROUND', run: () => clearWallpaper() });
      out.push({ sep: true });
      out.push({ label: BinLook.name() + '...', run: () => open('trash') });
      out.push({ label: 'EMPTY THE ' + BinLook.name(), run: () => hooks.emptyBin() });
      out.push({ label: 'RESTORE SYSTEM FILES', run: () => restoreSystemFiles() });
      return out;
    },
    Edit: () => editMenu(Active.env),
    Debug: () => [
      { label: 'TASK MANAGER', run: () => open('tasks') },
      { label: 'MEMORY DEFRAG', run: () => open('defrag') },
      { label: 'THIS MACHINE (NEOFETCH)', run: () => open('neofetch') },
      { label: 'DISPLAY SETTINGS', run: () => open('display') }
    ],
    Tools: () => [
      { label: 'TERMINAL', run: () => open('terminal') },
      { label: 'THE GARAGE (MAKE MUSIC)', run: () => open('garage') },
      { label: 'THESTACK (HI-FI)', run: () => open('hifi') },
      { label: 'NOTES', run: () => open('notes') },
      { sep: true },
      { label: BinLook.name(), run: () => open('trash') }
    ],
    Help: () => [
      { label: 'HELP CONTENTS', run: () => help('start') },
      { label: 'MOUSE & KEYBOARD', run: () => help('keys') },
      { label: 'FILES, FOLDERS & THE BIN', run: () => help('files') },
      { label: 'THE GARAGE: MAKING MUSIC', run: () => help('music') },
      { sep: true },
      { label: 'SOMETHING IS MISSING?', run: () => help('fix') },
      { label: 'RESTORE SYSTEM FILES', run: () => restoreSystemFiles() },
      { sep: true },
      { label: 'HOLYC REFERENCE', run: () => help('holyc') },
      { label: 'ABOUT THIS MACHINE', run: () => open('about') }
    ]
  };

  document.querySelectorAll('.menuitem').forEach(mi => {
    mi.addEventListener('mousedown', ev => {
      const m = mi.dataset.menu;
      if (window.Snd) window.Snd.click();
      if (m === 'Compile') { openCompile(); return; }
      if (!items[m]) return;
      ev.stopPropagation();
      const r = mi.getBoundingClientRect();
      showMenu(document.getElementById('filemenu'), r.left, r.bottom, items[m]());
    });
  });

  document.addEventListener('mousedown', ev => {
    if (!ev.target.closest || !ev.target.closest('.popmenu')) hideMenus();
  });
}
