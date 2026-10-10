/* The strip under the shelf tabs: how this shelf is arranged (SORT) and what of it is shown (SHOW). Two rows of small buttons, one lit in each; a press calls
   onChange(view). The rules are apps/shop/sort.js (pure). */
import { SORTS, SHOWS, clean } from './sort.js';

export function createViewBar(view, onChange) {
  let v = clean(view);
  const el = document.createElement('div');
  el.className = 'shopview';
  const group = (title, list, key) => {
    const g = document.createElement('div');
    g.className = 'svgroup';
    const l = document.createElement('span');
    l.className = 'svl'; l.textContent = title;
    g.appendChild(l);
    list.forEach(o => {
      const b = document.createElement('span');
      b.className = 'svbtn'; b.dataset.key = key; b.dataset.id = o.id; b.textContent = o.label; b.title = o.tip;
      b.addEventListener('mousedown', ev => {
        ev.stopPropagation();
        if (v[key] === o.id) return;
        v = clean({ ...v, [key]: o.id });
        if (window.Snd) window.Snd.click();
        paint();
        onChange(v);
      });
      g.appendChild(b);
    });
    el.appendChild(g);
  };
  group('SORT', SORTS, 'sort');
  group('SHOW', SHOWS, 'show');
  function paint() { el.querySelectorAll('.svbtn').forEach(b => b.classList.toggle('on', v[b.dataset.key] === b.dataset.id)); }
  paint();
  return { el, get: () => v, set(next) { v = clean(next); paint(); } };
}
