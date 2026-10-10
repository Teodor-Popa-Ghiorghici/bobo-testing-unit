/* window.Buffs: the machine's side of kernel/buffs_core.js. A game or tool asks `window.Buffs.has('<id>')` (through apps/buffs_scope.js, so an app never imports this) and
   listens for `buffs-changed` to update itself the moment one is earned. HOLYC.EXE calls `sync(progress)` after a puzzle is solved, a program installed, and when it opens
   (a puzzle solved before there were buffs counts). What is shown when one arrives is a single line that says nothing about what or where. */
import { createBuffs, KEY, BUFFS, LINES } from './buffs_core.js';
import { toast } from './wm.js';

const io = {
  get: () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
  set: v => { try { localStorage.setItem(KEY, v); } catch (e) { /* kept for this sitting */ } }
};
let lastLine = -1;
const tell = detail => { try { window.dispatchEvent(new CustomEvent('buffs-changed', { detail: detail || {} })); } catch (e) { /* nobody is listening */ } };
const core = createBuffs(io, (b, quiet, n) => {
  if (b) { tell({ id: b.id, game: b.game }); return; }            /* each grant tells its own game; the batch (b is null) is what is said aloud, once */
  if (quiet || !n) return;
  let i = Math.floor(Math.random() * LINES.length); if (i === lastLine) i = (i + 1) % LINES.length; lastLine = i;
  toast(LINES[i]);
  try { if (window.Snd && window.Snd.chime) window.Snd.chime(); } catch (e) { /* silent */ }
});

export const Buffs = {
  has: id => core.has(id),
  list: () => core.list(),
  /* `progress` is { puzzles, shop } as HOLYC.EXE keeps it; `quiet` says nothing aloud */
  sync: (progress, quiet) => core.sync(progress, quiet),
  all: () => BUFFS.map(b => b.id),
  /* for the terminal and for a game that wants the words of a buff it has */
  text: id => { const b = BUFFS.find(x => x.id === id); return b && core.has(id) ? b.text : null; }
};
window.Buffs = Buffs;
