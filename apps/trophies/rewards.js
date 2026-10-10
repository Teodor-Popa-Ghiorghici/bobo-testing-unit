/* THE REWARDS TAB: what the big trophies give besides SUN. Two shelves: the things Dave does not sell (a frame, a logo, a pointer, a colour scheme, something for the elephant,
   a bottle), each saying which trophy gives it and whether it is yours; and the folders a mastered game leaves on the desktop with its pictures in. Clicking an item opens the
   shelf it is on (or the folder), a locked one opens the trophy that earns it. `o`: { shop(cat), folder(path), focus(id) }. */
import { cup } from '../trophy_art.js';

const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const CAT = { frame: 'FRAME', logo: 'LOGO', cursor: 'POINTER', scheme: 'COLOUR SCHEME', elephant: 'ELEPHANT', drink: 'BOTTLE' };
const GLYPH = {
  frame: '<svg viewBox="0 0 16 12" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="12" fill="#AAAAAA"/><rect x="2" y="2" width="12" height="7" fill="#000"/><rect x="3" y="3" width="10" height="5" fill="#0000AA"/><rect x="11" y="10" width="2" height="1" fill="#55FF55"/></svg>',
  logo: '<svg viewBox="0 0 16 12" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="12" fill="#000"/><rect x="7" y="1" width="2" height="3" fill="#FFFF55"/><rect x="3" y="4" width="10" height="2" fill="#FFFF55"/><rect x="2" y="6" width="12" height="2" fill="#fff"/><rect x="3" y="8" width="2" height="3" fill="#AAA"/><rect x="7" y="8" width="2" height="3" fill="#AAA"/><rect x="11" y="8" width="2" height="3" fill="#AAA"/></svg>',
  cursor: '<svg viewBox="0 0 16 12" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="12" fill="#000"/><rect x="4" y="1" width="2" height="8" fill="#fff"/><rect x="6" y="3" width="2" height="2" fill="#fff"/><rect x="8" y="5" width="2" height="2" fill="#fff"/><rect x="6" y="7" width="2" height="3" fill="#fff"/></svg>',
  scheme: '<svg viewBox="0 0 16 12" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="12" fill="#000"/><rect x="1" y="1" width="3" height="10" fill="#FFD060"/><rect x="5" y="1" width="3" height="10" fill="#55FF55"/><rect x="9" y="1" width="3" height="10" fill="#79D8FF"/><rect x="13" y="1" width="2" height="10" fill="#C060FF"/></svg>',
  elephant: '<svg viewBox="0 0 16 12" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="12" fill="#000"/><rect x="2" y="3" width="9" height="5" fill="#AAA"/><rect x="9" y="1" width="4" height="5" fill="#AAA"/><rect x="12" y="5" width="2" height="5" fill="#AAA"/><rect x="3" y="8" width="2" height="3" fill="#555"/><rect x="8" y="8" width="2" height="3" fill="#555"/><rect x="10" y="2" width="1" height="1" fill="#000"/></svg>',
  drink: '<svg viewBox="0 0 16 12" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="12" fill="#000"/><rect x="7" y="0" width="2" height="3" fill="#AAAAAA"/><rect x="6" y="3" width="4" height="2" fill="#00AA00"/><rect x="5" y="5" width="6" height="6" fill="#00AA00"/><rect x="6" y="7" width="4" height="2" fill="#FFFF55"/></svg>'
};
const FOLDER = '<svg viewBox="0 0 16 12" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="2" width="6" height="2" fill="#AA5500"/><rect x="0" y="3" width="16" height="9" fill="#FFFF55"/><rect x="0" y="4" width="16" height="1" fill="#AA5500"/></svg>';

export function buildRewards(T, o) {
  const root = el('div', 'tr-rewards');
  function draw() {
    root.innerHTML = '';
    const items = T.rewardList(), got = items.filter(i => i.owned).length;
    root.appendChild(el('div', 'tr-rh', 'THINGS DAVE DOES NOT SELL   ' + got + ' / ' + items.length));
    root.appendChild(el('div', 'tr-rp', 'Milestone trophies pay SUN and then, once, something no price can buy. They wait on Dave\'s shelves, dim, until you earn them.'));
    const grid = el('div', 'tr-rgrid');
    items.forEach((it, i) => {
      const d = T.get(it.trophy), c = el('div', 'tr-rwd' + (it.owned ? ' owned' : ' locked')); c.style.setProperty('--i', Math.min(i, 30));
      const g = el('div', 'tr-rglyph'); g.innerHTML = GLYPH[it.cat] || GLYPH.frame; if (!it.owned) g.appendChild(el('i', 'tr-rlock'));
      const b = el('div', 'tr-rbody');
      b.append(el('div', 'tr-rn', it.name), el('div', 'tr-rc', CAT[it.cat] || it.cat), el('div', 'tr-rb', it.blurb), el('div', 'tr-rt', (it.owned ? 'EARNED BY ' : 'EARN IT: ') + (d ? T.plainName(d) : it.trophy)));
      const cupEl = el('div', 'tr-rcup'); cupEl.innerHTML = cup(d && d.mastery ? 'meta' : d ? d.tier : 'G', !it.owned);
      c.append(g, b, cupEl);
      c.addEventListener('mousedown', ev => { ev.stopPropagation(); if (it.owned) o.shop(it.cat); else o.focus(it.trophy); });
      grid.appendChild(c);
    });
    root.appendChild(grid);
    const props = T.propList(), open = props.filter(p => p.made).length;
    root.appendChild(el('div', 'tr-rh', 'FOLDERS ON THE DESKTOP   ' + open + ' / ' + props.length));
    root.appendChild(el('div', 'tr-rp', 'Master a game and a folder appears on the desktop with every picture it is made of, as real files, in case you want them somewhere else.'));
    const list = el('div', 'tr-rgrid');
    props.forEach((p, i) => {
      const c = el('div', 'tr-rwd' + (p.made ? ' owned' : p.earned ? ' owned' : ' locked')); c.style.setProperty('--i', i);
      const g = el('div', 'tr-rglyph'); g.innerHTML = FOLDER; if (!p.made && !p.earned) g.appendChild(el('i', 'tr-rlock'));
      const b = el('div', 'tr-rbody'), d = T.get(p.mastery);
      b.append(el('div', 'tr-rn', p.folder), el('div', 'tr-rc', p.name), el('div', 'tr-rt', p.made ? p.made + ' FILES, ON YOUR DESKTOP. OPEN IT.' : p.earned ? 'EARNED. IT IS BEING MADE.' : 'EARN IT: ' + (d ? T.plainName(d) : p.mastery)));
      const cupEl = el('div', 'tr-rcup'); cupEl.innerHTML = cup('meta', !p.earned);
      c.append(g, b, cupEl);
      c.addEventListener('mousedown', ev => { ev.stopPropagation(); if (p.made) o.folder('::/' + p.folder); else o.focus(p.mastery); });
      list.appendChild(c);
    });
    root.appendChild(list);
    /* the pictures: one for each of eleven places, handed over at about three fifths of that place's trophies (kernel/trophy_pictures.js) */
    const pics = T.pictureList ? T.pictureList() : [], have = pics.filter(p => p.owned).length;
    if (pics.length) {
      root.appendChild(el('div', 'tr-rh', 'PICTURES   ' + have + ' / ' + pics.length));
      root.appendChild(el('div', 'tr-rp', 'Earn about three fifths of the trophies of some places and the machine hands over a picture of its own: a real file in the PICTURES folder on the desktop. AfterEgypt, the toys and the small tools have none.'));
      const row = el('div', 'tr-rgrid tr-pics');
      pics.forEach((p, i) => {
        const c = el('div', 'tr-rwd tr-pic' + (p.owned ? ' owned' : ' locked')); c.style.setProperty('--i', i);
        const g = el('div', 'tr-rglyph tr-pthumb');
        if (p.owned) { const im = el('img'); im.src = p.file; im.alt = ''; g.appendChild(im); } else { g.appendChild(el('span', 'tr-pq', '?')); g.appendChild(el('i', 'tr-rlock')); }
        const b = el('div', 'tr-rbody');
        b.append(el('div', 'tr-rn', p.owned ? p.name : '? ? ?'), el('div', 'tr-rc', p.area), el('div', 'tr-rb', p.owned ? p.blurb : 'A picture of its own, once enough is done here.'),
          el('div', 'tr-rt', p.owned ? 'IN THE PICTURES FOLDER. CLICK TO LOOK.' : p.have + ' OF ' + p.total + ' TROPHIES. ' + Math.max(0, p.need - p.have) + ' MORE FOR IT (' + p.need + ').'));
        const bar = el('div', 'tr-pbar'); const f = el('i'); f.style.width = Math.min(100, Math.round(100 * p.have / Math.max(1, p.need))) + '%'; bar.appendChild(f); b.appendChild(bar);
        c.append(g, b, el('div', 'tr-rcup'));
        c.addEventListener('mousedown', ev => { ev.stopPropagation(); if (p.owned) o.picture(p.path); else o.area(p.app); });
        row.appendChild(c);
      });
      root.appendChild(row);
    }
  }
  return { el: root, draw: draw };
}
