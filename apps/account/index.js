export default {
  id: 'account',
  title: 'ACCOUNT.EXE',
  icon: '',
  width: 420,
  height: 400,
  resizable: true,
  mount(root, ctx) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = 'apps/account/style.css';
    root.appendChild(style);

    const draw = (body) => {
      const p = document.createElement('div');
      p.className = 'ledgpane';
      const head = document.createElement('div');
      head.className = 'ledghead';
      const h1 = document.createElement('span'); h1.textContent = 'SOURCE';
      const h2 = document.createElement('span'); h2.textContent = 'SUN';
      head.appendChild(h1); head.appendChild(h2);
      p.appendChild(head);
      
      const rows = window.Economy.ledger();
      if (!rows.length) {
        const e = document.createElement('div');
        e.className = 'ledgrow';
        e.textContent = 'NO TRANSACTIONS. THE BOOKS ARE CLEAN, WHICH IS ALSO A WAY OF SAYING EMPTY.';
        p.appendChild(e);
      }
      rows.forEach(r => {
        const d = document.createElement('div');
        d.className = 'ledgrow ' + (r.n >= 0 ? 'in' : 'out');
        const t = document.createElement('span');
        t.className = 't';
        const dt = new Date(r.t);
        const pad = n => String(n).padStart(2, '0');
        t.textContent = pad(dt.getHours()) + ':' + pad(dt.getMinutes());
        const w = document.createElement('span');
        w.className = 'w';
        w.textContent = r.s;
        const n = document.createElement('span');
        n.className = 'n';
        n.textContent = (r.n >= 0 ? '+' : '') + r.n;
        d.appendChild(t); d.appendChild(w); d.appendChild(n);
        p.appendChild(d);
      });
      
      const tot = window.Economy.totals();
      const f = document.createElement('div');
      f.className = 'ledgtot';
      f.textContent = 'IN ' + tot.earned + '   OUT ' + tot.spent + '   ON HAND ' + window.Economy.balance();
      p.appendChild(f);
      body.appendChild(p);
    };

    const container = document.createElement('div');
    container.style.height = '100%';
    root.appendChild(container);

    draw(container);

    this._update = () => {
      if (!document.body.contains(root)) return;
      container.innerHTML = '';
      draw(container);
    };
    window.Economy.onChange(this._update);
  },
  unmount() {
    // Note: The original window.Economy does not provide an unsubscribe function for onChange.
    // This implies a small memory leak of update functions each time the window is opened.
    // Preserved the original logic per rules.
  }
};
