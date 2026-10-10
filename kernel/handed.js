/* WHAT THE MACHINE HANDS OVER LATER. assets/seed.json is what it ships with; some of the desktop is given afterwards -- the trophy box (the first gold
   trophy), a game's folder of props (its mastery seal), the pictures bought from Dave. None of it is in the seed, so "restore system files" used to know
   nothing about it, and a trophy box that was thrown away and emptied out of the bin was gone for good.
   A module that gives something away registers a source here: a function that answers, right now, with what this machine is OWED -- only what it has
   earned or bought. vfs_ops.js asks for it next to the seed, so the same rules hold for both: what is still there is left alone, what was moved or
   renamed counts as present, what is in the bin is taken out of it, and the rest is made again.
   An item is { path, type, content, src, app, args } (one record), or { path, folder: true, make } for a folder whose files are made by `make()`. */
const sources = [];
export function handedOver(fn) { if (sources.indexOf(fn) < 0) sources.push(fn); }

export async function handedItems() {
  const out = [], seen = new Set();
  for (const src of sources) {
    let list = [];
    try { list = (await src()) || []; } catch (e) { /* a source that fails owes nothing */ }
    list.forEach(it => { if (it && it.path && !seen.has(it.path)) { seen.add(it.path); out.push(it); } });
  }
  return out;
}
