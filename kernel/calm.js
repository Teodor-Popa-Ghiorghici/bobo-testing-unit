/* REDUCE MOTION, the machine's own switch (DISPLAY.EXE). The system's setting (`prefers-reduced-motion`) has always been honoured by the things that look at it; this adds a switch of the machine's own that
   does the same for everything at once: `window.matchMedia('(prefers-reduced-motion: reduce)')` answers yes while it is on, whatever the system says (so the blackout, the drunk effect, the trophy card, the
   degauss pulse and the rest take their calmer ways), a `calm-changed` event tells every listener when it turns, and while it is on kernel/theme.css (`:root[data-calm]`) cuts every CSS animation and
   transition to a single frame. The system's own setting is never overridden the other way: if it asks for calm, the machine is calm, switch or no. Loaded first, before anything asks. */
let on = false;
const real = window.matchMedia ? window.matchMedia.bind(window) : null;
const REDUCE = /prefers-reduced-motion\s*:\s*reduce/i, NOPREF = /prefers-reduced-motion\s*:\s*no-preference/i;

export const isCalm = () => on;
export function setCalm(v) {
  v = !!v; if (v === on) return;
  on = v;
  try { document.documentElement.toggleAttribute('data-calm', on); } catch (e) { /* no document yet */ }
  try { window.dispatchEvent(new CustomEvent('calm-changed', { detail: { calm: on } })); } catch (e) { /* nobody is listening */ }
}

if (real) {
  window.matchMedia = function (q) {
    const m = real(q), asks = REDUCE.test(q), not = NOPREF.test(q);
    if (!asks && !not) return m;
    const answer = () => asks ? (on || m.matches) : (!on && m.matches);
    const subs = new Set(); let onch = null;
    const tell = () => { const ev = { matches: answer(), media: q, type: 'change' }; subs.forEach(f => { try { f.call(proxy, ev); } catch (e) { /* the listener's own business */ } }); if (typeof proxy.onchange === 'function') { try { proxy.onchange(ev); } catch (e) { /* ditto */ } } };
    /* Listen to the window only while somebody listens to this query: a query that is only read (`.matches`) must leave nothing behind. */
    let wired = false;
    const wire = () => { if (wired) return; wired = true; m.addEventListener && m.addEventListener('change', tell); window.addEventListener('calm-changed', tell); };
    const unwire = () => { if (!wired || subs.size || typeof proxy.onchange === 'function') return; wired = false; m.removeEventListener && m.removeEventListener('change', tell); window.removeEventListener('calm-changed', tell); };
    const add = f => { if (f) { subs.add(f); wire(); } }, del = f => { subs.delete(f); unwire(); };
    const proxy = {
      get matches() { return answer(); }, media: q,
      get onchange() { return onch; },
      set onchange(f) { onch = f; if (typeof f === 'function') wire(); else unwire(); },
      addEventListener: (t, f) => { if (t === 'change') add(f); }, removeEventListener: (t, f) => { del(f); },
      addListener: add, removeListener: del,
      dispatchEvent: () => true
    };
    return proxy;
  };
}
window.Calm = { isCalm, setCalm };
