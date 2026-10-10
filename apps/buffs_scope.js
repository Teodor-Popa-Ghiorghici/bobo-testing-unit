/* How an app asks about the buffs HOLYC.EXE gave (kernel/buffs.js), without importing the kernel: `buffs().has('notes_fonts')`, `buffs().on(fn)` (fn is told when one is earned while the
   app is open; it returns what to call to stop listening). With no kernel behind it, nothing is ever had. */
export function buffs() {
  return {
    has: id => { try { return !!(window.Buffs && window.Buffs.has(id)); } catch (e) { return false; } },
    on: fn => {
      const h = ev => { try { fn(ev.detail || {}); } catch (e) { /* the app's own business */ } };
      window.addEventListener('buffs-changed', h);
      return () => window.removeEventListener('buffs-changed', h);
    }
  };
}
