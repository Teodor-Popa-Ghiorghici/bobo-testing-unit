/* window.Trophies: the one service every app and the kernel talk to (the same pattern as window.Economy and window.Cos). The engine is trophies_core.js (pure); this is the machine's
   side of it: the one saved key (templeos.trophies.v1, which kernel/durable.js mirrors into IndexedDB so a power cut cannot eat a trophy; a key that will not read is copied to
   .bak and the ledger says so), SUN paid through window.Economy as `TROPHY: <NAME>`, the card and the taskbar cup (trophies_toast.js), the calendar, and the first-time backfill
   that finds what a person already did in their saves (trophies_backfill.js). Nothing here runs per frame, and every call catches its own errors. */
import { createTrophies } from './trophies_core.js';
import { registerAll, NAMES } from './trophies_defs.js';
import { makeToast } from './trophies_toast.js';
import { wire } from './trophies_wire.js';
import { backfill } from './trophies_backfill.js';
import { onTrophy, sync as syncProps, folders as propFolders, FOLDER_OF } from './trophy_props.js';
import { rewardsByTrophy, rewardText } from './trophy_rewards.js';
import { spriteFor } from './icons_dom.js';
import { registry } from './registry.js';
import { openWindow } from './wm.js';
import { plain, words } from '../apps/trophy_kit.js';

const KEY = 'templeos.trophies.v1';
let damaged = false;
function read() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { return null; }
  if (!raw) return null;
  try { return JSON.parse(raw); }
  catch (e) { damaged = true; try { localStorage.setItem(KEY + '.bak', raw); } catch (x) { /* nothing to be done */ } return null; }
}
const write = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* storage full: it still counts this sitting */ } };

export const Trophies = createTrophies({
  read: read, write: write,
  pay: (n, why) => { if (window.Economy) window.Economy.earn(n, why); },
  announce: (evt, detail) => { try { window.dispatchEvent(new CustomEvent(evt, { detail: detail })); } catch (e) { /* no window */ } }
});
registerAll(Trophies);
Trophies.damaged = () => damaged;
Trophies.names = NAMES;
Trophies.appCount = () => Object.keys(registry).filter(k => k !== 'placeholder').length;
Trophies.nameOf = d => words(d.name, Trophies.st.lang);
Trophies.descOf = d => words(d.desc, Trophies.st.lang);
Trophies.hintOf = d => words(d.hint, Trophies.st.lang);
Trophies.plain = plain;
/* what the ledger shows besides the trophies themselves ------------------------------------------------------------------------------------------ */
/* the picture of an area: the desktop's own icon for its app */
Trophies.iconOf = area => { try { return spriteFor(area === 'system' ? 'terminal' : 'app', area === 'meta' ? 'trophies' : area); } catch (e) { return ''; } };
/* SUN the trophies have paid so far */
Trophies.sunEarned = () => [...Trophies.defs.values()].reduce((a, d) => a + (Trophies.earned(d.id) && !d.legacy ? d.pay || 0 : 0), 0);
Trophies.sunTotal = () => [...Trophies.defs.values()].reduce((a, d) => a + (!d.legacy && !Trophies.closed(d) ? d.pay || 0 : 0), 0);
Trophies.rewardText = rewardText;
/* the things Dave does not sell, and whether they are yours yet: [{ cat, id, name, blurb, trophy, owned }] */
Trophies.rewardList = () => {
  const out = [], by = rewardsByTrophy();
  Object.keys(by).forEach(tid => by[tid].forEach(r => { const it = window.Cos && window.Cos.find(r.cat, r.id); out.push({ cat: r.cat, id: r.id, name: r.name, blurb: it ? it.blurb : '', trophy: tid, owned: !!(window.Cos && window.Cos.has(r.cat, r.id)) }); }));
  return out;
};
/* the folders a mastery leaves on the desktop: [{ game, folder, name, mastery, earned, made }] */
Trophies.propList = () => { const m = propFolders(); return Object.keys(FOLDER_OF).map(g => ({ game: g, folder: FOLDER_OF[g][0], name: FOLDER_OF[g][1], mastery: 'mastery_' + g, earned: Trophies.earned('mastery_' + g), made: m[g] || 0 })); };
Trophies.openLedger = id => openWindow('trophies', id ? { focus: id } : {}).catch(console.error);

let started = false;
Trophies.boot = () => {
  if (started) return; started = true;
  try {
    const toast = makeToast(Trophies, { nameOf: Trophies.nameOf, descOf: Trophies.descOf, open: id => Trophies.openLedger(id) });
    Trophies.toast = toast;
    toast.mountCup();
    toast.live();
    import('./trophies_pins.js').then(m => m.mountPins(Trophies)).catch(() => {});
    import('./rewards.js').then(m => m.startRewards(Trophies)).catch(() => {});
    import('./trophy_box.js').then(m => m.startBox(Trophies)).catch(() => {});
    import('./trophy_gallery.js').then(m => m.start(Trophies)).catch(() => {});
    wire(Trophies);
    window.addEventListener('trophy-earned', ev => onTrophy(ev.detail));
    const d = new Date(), two = n => String(n).padStart(2, '0');
    Trophies.openDay(d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()), d.getMonth() + 1, d.getDate());
    setTimeout(() => {
      try {
        const n = backfill(Trophies);
        try { if (window.Cos) window.Cos.syncRewards(); } catch (e) { /* no shop yet */ }
        syncProps(Trophies);
        if (n > 0) { Trophies.emit('meta', 'remember', { n: n }); toast.show({ id: 'remembered', name: 'THE MACHINE REMEMBERED ' + n + ' THING' + (n === 1 ? '' : 'S') + ' YOU ALREADY DID.', desc: 'See them in TROPHIES.EXE.', tier: 'S', kind: 'meta', pay: 0 }); }
      } catch (e) { /* the saves are somebody else's business */ }
    }, 2500);
  } catch (e) { /* never into the machine */ }
};
window.Trophies = Trophies;
