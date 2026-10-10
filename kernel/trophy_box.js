/* The trophy box is handed over by the first big trophy: a gold one, or a game's mastery seal. It arrives as an icon on the desktop (an app record, `::/TrophyBox`), once ever --
   if you throw it away it is yours to put back from the bin, it does not come again. The big trophies are then cups inside it (apps/trophybox), and the ones you have left
   out on the desktop are brought back at boot (kernel/trophy_drop.js). */
import { fs } from './vfs.js';
import { toast } from './wm.js';
import { handedOver } from './handed.js';

const KEY = 'templeos.trophybox.v1';
const given = () => { try { return !!localStorage.getItem(KEY); } catch (e) { return true; } };

const RECORD = { type: 'app', app: 'trophybox', content: '', src: '' };
let ledger = null;
/* it is owed once it has been handed over, or while a big trophy is earned (a save carried over, or a flag that was lost): RESTORE SYSTEM FILES brings it back from either */
handedOver(() => (given() || (ledger && ledger.earnedList(big).length)) ? [{ path: '::/TrophyBox', ...RECORD }] : []);
const big = d => !d.legacy && (d.tier === 'G' || d.mastery);

async function hand(quiet) {
  try { localStorage.setItem(KEY, '1'); } catch (e) { /* no storage */ }
  await fs.write('::/TrophyBox', RECORD);
  try { window.dispatchEvent(new CustomEvent('vfs-changed', { detail: { dir: '::' } })); } catch (e) { /* no window */ }
  if (!quiet) toast('A TROPHY BOX HAS APPEARED ON YOUR DESKTOP. DRAG THE BIG ONES OUT.');
}

export async function startBox(T) {
  ledger = T;
  const have = () => T.earnedList(big).length > 0;
  if (!given() && have()) await hand(true);
  window.addEventListener('trophy-earned', ev => { const d = ev.detail && T.get(ev.detail.id); if (d && big(d) && !given()) hand(false); });
  const props = await import('./trophy_drop.js');
  props.TrophyProps.boot();
}
