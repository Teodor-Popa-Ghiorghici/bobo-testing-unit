/* THE PICTURES, GIVEN. When a game's trophies reach about three fifths (kernel/trophy_pictures.js), its picture is written into ::/Pictures on the desktop as a real file
   ({ type: 'image', src: the picture's file under assets/rewards }: the viewer opens it, a folder can set it as the background in any of the five fits) and the machine says so. It is made once
   (templeos.pictures.v1 remembers which): a picture that is thrown away is not made again behind your back, but RESTORE SYSTEM FILES hands it over again (kernel/handed.js).
   A machine that was already past the mark when this came is given its pictures quietly when the ledger loads. */
import { fs } from './vfs.js';
import './vfs_ops.js';
import { handedOver } from './handed.js';
import { PICTURES, FOLDER, standing } from './trophy_pictures.js';

const KEY = 'templeos.pictures.v1';
const dir = '::/' + FOLDER;
const given = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
const remember = id => { const g = given(); if (!g[id]) { g[id] = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(g)); } catch (e) { /* given for this sitting */ } } };
const announce = () => { try { ['::', dir].forEach(d => window.dispatchEvent(new CustomEvent('vfs-changed', { detail: { dir: d } }))); } catch (e) { /* no window */ } };
const say = t => { try { import('./wm.js').then(w => w.toast(t)); } catch (e) { /* no toast */ } };
const record = p => ({ type: 'image', content: '', src: p.file });

export async function give(p, quiet) {
  try {
    await fs.write(dir + '/.keep', { type: 'text', content: '' });
    await fs.write(dir + '/' + p.fileName, record(p));
    remember(p.id);
    announce();
    if (!quiet) say('A PICTURE: ' + p.name + '. IT IS IN THE ' + FOLDER.toUpperCase() + ' FOLDER ON THE DESKTOP.');
    window.dispatchEvent(new CustomEvent('pictures-changed', { detail: { id: p.id } }));
  } catch (e) { /* never into the machine */ }
}

let busy = false;
export async function sync(T, quiet) {
  if (busy) return; busy = true;
  try {
    const g = given();
    for (const p of PICTURES) if (!g[p.id] && standing(T, p.app).enough) await give(p, quiet);
  } catch (e) { /* never into the machine */ } finally { busy = false; }
}
export function start(T) {
  sync(T, true);
  window.addEventListener('trophies-changed', () => sync(T, false));
  /* what the ledger shows: every picture, where its place stands, and whether it is yours */
  T.pictureList = () => PICTURES.map(p => Object.assign({}, p, standing(T, p.app), { owned: !!given()[p.id], path: dir + '/' + p.fileName, area: (T.names && T.names[p.app]) || p.app.toUpperCase() }));
}
export const ownedPictures = () => PICTURES.filter(p => given()[p.id]);
/* a picture that was given and is gone is owed: RESTORE SYSTEM FILES makes it again */
handedOver(() => ownedPictures().map(p => Object.assign({ path: dir + '/' + p.fileName }, record(p))));
