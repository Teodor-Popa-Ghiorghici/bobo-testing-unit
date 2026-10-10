/* The kernel's side of the trophies, in four lines: `sys.emit('delete', { n })` from wherever the machine does a thing worth a trophy. It reaches window.Trophies if it is there
   and never throws if it is not (a trophy must never get into the machine's way). `sys.session` is what the system trophies need to remember for one sitting only
   (the folders made, the window things done), which the saved store never holds. */
export const sess = { folders: [], win: [], boots: 0 };
const T = () => { try { return window.Trophies || null; } catch (e) { return null; } };
export const sys = {
  session: sess,
  emit(name, p) { try { const t = T(); return t ? t.emit('system', name, p || {}) : []; } catch (e) { return []; } },
  mark(k, v) { try { const t = T(); if (t) t.mark('system', k, v); } catch (e) { /* never */ } },
  add(k, n) { try { const t = T(); if (t) t.add('system', k, n); } catch (e) { /* never */ } },
  /* one sitting: a thing done once is remembered here, and the trophy that wants three of them asks */
  sit(kind) { if (sess.win.indexOf(kind) < 0) { sess.win.push(kind); sys.emit('window', { kind: kind }); } }
};

/* what a HolyC program that ran was made of, for the trophies that ask: only strings (HELLO, TEMPLE), a function of your own that is also called (A FUNCTION OF YOUR OWN) */
export function holycFacts(ast, known) {
  const body = ast && ast.body || [];
  const fns = new Set(known || []); body.forEach(n => { if (n.k === 'fn' && n.body) fns.add(n.name); });
  let called = false;
  const walk = (n, inside) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(x => walk(x, inside)); return; }
    if (n.k === 'fn') { walk(n.body, n.name); return; }
    if ((n.k === 'var' && fns.has(n.name) && n.name !== inside) || (n.k === 'call' && n.callee && n.callee.k === 'var' && fns.has(n.callee.name) && n.callee.name !== inside)) called = true;
    Object.keys(n).forEach(k => { if (k !== 'line' && typeof n[k] === 'object') walk(n[k], inside); });
  };
  walk(body, null);
  return { onlyString: body.length > 0 && body.every(n => n.k === 'print'), usesFn: fns.size > 0 && called };
}
/* `known` is the names of functions the shell was already holding from earlier lines: define one on a line and call it on the next is a function of your own too */
sys.holyc = (ast, file, known) => { try { sys.emit('holyc', Object.assign({ ok: true, file: file || null }, holycFacts(ast, known))); } catch (e) { /* never */ } };
