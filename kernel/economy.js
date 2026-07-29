export const Economy = (function () {
  const SUN_KEY = 'templeos.sun';
  const def = { bal: 0, ledger: [], earned: 0, spent: 0 };
  let st = {};
  try { 
    const raw = localStorage.getItem(SUN_KEY);
    if (raw) st = JSON.parse(raw);
  } catch (e) {}
  st = { ...def, ...st };
  if (!Array.isArray(st.ledger)) st.ledger = [];
  st.bal = Math.max(0, Math.floor(st.bal) || 0);

  const subs = [];
  function fire(delta, source) {
    subs.forEach(fn => { try { fn(st.bal, delta, source); } catch (e) {} });
  }
  function write() {
    localStorage.setItem(SUN_KEY, JSON.stringify(st));
  }
  function log(n, source) {
    st.ledger.push({ n: n, s: String(source || '?').toUpperCase(), t: Date.now() });
    if (st.ledger.length > 50) st.ledger.splice(0, st.ledger.length - 50);
  }

  return {
    balance() { return st.bal; },
    ledger()  { return st.ledger.slice().reverse(); },
    totals()  { return { earned: st.earned || 0, spent: st.spent || 0 }; },
    earn(amount, source) {
      amount = Math.floor(amount);
      if (!(amount > 0)) return 0;
      st.bal += amount;
      st.earned = (st.earned || 0) + amount;
      log(amount, source);
      write();
      fire(amount, source);
      return amount;
    },
    spend(amount, source) {
      amount = Math.floor(amount);
      if (!(amount > 0)) return 0;
      if (st.bal < amount) return 0;
      st.bal -= amount;
      st.spent = (st.spent || 0) + amount;
      log(-amount, source);
      write();
      fire(-amount, source);
      return amount;
    },
    onChange(fn) {
      subs.push(fn);
    }
  };
})();
window.Economy = Economy;
