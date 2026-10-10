/* How an app asks about the golden sun eggs (kernel/eggs.js), without importing the kernel: `eggs().mult('magen')` is how much more of a thing it gives (1 with none, 1.2 with all forty),
   `eggs().on(fn)` calls fn when one is bought while the app is open (it returns what to call to stop listening). With no kernel behind it nothing is ever more, and the game plays as it always did. */
export function eggs() {
  return {
    mult: dial => { try { const m = window.Eggs && window.Eggs.mult(dial); return typeof m === 'number' && m >= 1 ? m : 1; } catch (e) { return 1; } },
    count: () => { try { return (window.Eggs && window.Eggs.count()) || 0; } catch (e) { return 0; } },
    on: fn => {
      const h = ev => { try { fn(ev.detail || {}); } catch (e) { /* the app's own business */ } };
      window.addEventListener('eggs-changed', h);
      return () => window.removeEventListener('eggs-changed', h);
    }
  };
}
