/* THE BIN, OR THE DUMPSTER. HOLYC.EXE's quiet gift 'bin_dumpster' (kernel/buffs_core.js) turns the RecycleBin into a recycle dumpster: a green skip with a lid and wheels, a new name
   (RECYCLE DUMPSTER) in the icon, its window, the menus and what the machine says about it. It starts as the dumpster the moment it is earned; right-click the icon (or the window) to
   change back to the bin and again to the dumpster, and the choice is kept. It is only the look of the same thing: everything that goes into it is in the same ::/.Trash. */
const KEY = 'templeos.bin.look.v1';
let choice = null;
try { const v = localStorage.getItem(KEY); if (v === 'bin' || v === 'dumpster') choice = v; } catch (e) { /* the default */ }
const earned = () => { try { return !!(window.Buffs && window.Buffs.has('bin_dumpster')); } catch (e) { return false; } };
const tell = () => { try { window.dispatchEvent(new CustomEvent('binlook-changed')); } catch (e) { /* nobody is listening */ } };

export const BinLook = {
  earned,
  /* is it a dumpster right now? */
  dumpster: () => earned() && choice !== 'bin',
  name() { return this.dumpster() ? 'RECYCLE DUMPSTER' : 'RECYCLE BIN'; },
  /* the icon's label on the desktop */
  label() { return this.dumpster() ? 'RecycleDumpster' : 'RecycleBin'; },
  /* the thing itself, for a sentence: THE BIN, THE DUMPSTER */
  noun() { return this.dumpster() ? 'DUMPSTER' : 'BIN'; },
  toggle() {
    if (!earned()) return false;
    choice = this.dumpster() ? 'bin' : 'dumpster';
    try { localStorage.setItem(KEY, choice); } catch (e) { /* for this sitting */ }
    tell();
    return true;
  },
  /* what the right-click menu offers */
  switchLabel() { return this.dumpster() ? 'BE A BIN AGAIN' : 'BE A DUMPSTER'; }
};
window.addEventListener('buffs-changed', ev => { if (ev.detail && ev.detail.id === 'bin_dumpster') tell(); });
window.BinLook = BinLook;
