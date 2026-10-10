/* The bench: rest, and what you wear. A build is what fits in the notches
   you own, so the argument is always the same one: one big charm or two
   small ones. */
import { CHARMS, CHARM, REGIONS, NOTCH_COST, ROOMS, baseCount } from './data.js';
import { backdrop, weather, mask, geo, notch, charmIcon } from './art.js';
import { charmText } from './charm_text.js';

export const notchesUsed = camp => camp.equipped.reduce((a, id) => a + CHARM[id].n, 0);

export function createBench(env, regionId) {
  const camp = env.camp, rg = REGIONS.find(r => r.id === regionId) || REGIONS[0];
  /* how far along a charm that is found, not bought, you are */
  const found = c => c.feat === 'perfect' ? baseCount(camp.perfect) : 0;
  const B = { sel: 0, hits: [], note: '' };
  /* sitting down is resting */
  camp.hp = env.maxHp(); camp.bench = rg.id; env.save();
  if (env.rested) env.rested(rg.id);
  B.note = 'YOU REST. YOUR MASKS ARE WHOLE.';

  const wear = i => {
    const c = CHARMS[i], on = camp.equipped.indexOf(c.id) >= 0;
    if (camp.owned.indexOf(c.id) < 0) {
      if (c.feat) { B.note = 'NOT SOLD: ' + found(c) + ' OF ' + ROOMS + ' ROOMS PERFECT.'; env.snd.err(); return; }
      if (camp.geo < c.cost) { B.note = 'NOT ENOUGH GEO.'; env.snd.err(); return; }
      camp.geo -= c.cost; camp.owned.push(c.id); env.snd.coin(); B.note = 'BOUGHT ' + c.name + '.'; env.save(); if (env.bought) env.bought(camp); return;
    }
    if (on) { camp.equipped = camp.equipped.filter(x => x !== c.id); env.snd.click(); B.note = c.name + ' REMOVED.'; }
    else if (notchesUsed(camp) + c.n > camp.notches) { B.note = 'NOT ENOUGH NOTCHES.'; env.snd.err(); return; }
    else { camp.equipped.push(c.id); env.snd.chime(); B.note = c.name + ' WORN.'; }
    env.save();
  };
  const buyNotch = () => {
    const cost = NOTCH_COST[camp.notches + 1];
    if (!cost) { B.note = 'NO NOTCH LEFT TO BUY.'; return; }
    if (camp.geo < cost) { B.note = 'A NOTCH COSTS ' + cost + ' GEO.'; env.snd.err(); return; }
    camp.geo -= cost; camp.notches++; env.snd.coin(); B.note = 'A NEW NOTCH IS CUT.'; env.save();
  };

  B.draw = (G, now) => {
    G.fill('#000'); backdrop(G, rg); weather(G, rg, now);
    B.hits = [];
    G.a(0.88); G.R(40, 30, 880, 580, '#05060c'); G.a(1);
    G.R(40, 30, 880, 3, rg.pal.ink); G.R(40, 607, 880, 3, rg.pal.ink);
    G.T('THE BENCH  /  ' + rg.name, 60, 72, '#e8e2d4', 40);
    geo(G, 760, 46, 4); G.T(String(camp.geo), 904, 70, '#f2e2b0', 32, 'right');
    for (let i = 0; i < env.maxHp(); i++) mask(G, 60 + i * 30, 88, 2.6, i < camp.hp ? 'full' : 'empty');
    for (let n = 0; n < camp.notches; n++) notch(G, 600 + n * 24, 90, 4, n < notchesUsed(camp));
    const ncost = NOTCH_COST[camp.notches + 1];
    G.R(600 + camp.notches * 24 + 10, 86, 150, 24, ncost ? '#2c3a52' : '#14181f');
    G.T(ncost ? 'BUY NOTCH ' + ncost : 'ALL CUT', 600 + camp.notches * 24 + 18, 106, ncost ? '#e8e2d4' : '#98a2b8', 20);
    B.hits.push({ id: 'notch', x: 600 + camp.notches * 24 + 10, y: 86, w: 150, h: 24 });

    CHARMS.forEach((c, i) => {
      const col = i % 2, row = Math.floor(i / 2), x = 60 + col * 300, y = 126 + row * 56;
      const own = camp.owned.indexOf(c.id) >= 0, on = camp.equipped.indexOf(c.id) >= 0;
      G.R(x, y, 290, 50, B.sel === i ? '#26324f' : '#0e1220');
      G.R(x, y, 290, 2, on ? '#ffd68c' : rg.pal.ink); 
      charmIcon(G, x + 8, y + 8, 4, c.id, own);
      G.T(c.name, x + 52, y + 22, on ? '#ffd68c' : own ? '#e8e2d4' : '#a3adc2', 22);
      for (let k = 0; k < c.n; k++) notch(G, x + 54 + k * 14, y + 28, 2.6, on);
      G.T(own ? (on ? 'WORN' : 'OWNED') : c.feat ? found(c) + ' / ' + ROOMS : c.cost + ' GEO', x + 282, y + 22, own ? '#9fe0ff' : c.feat ? '#ffd68c' : camp.geo >= c.cost ? '#f2e2b0' : '#c08a8a', 20, 'right');
      B.hits.push({ id: 'c' + i, x, y, w: 290, h: 50 });
    });
    const c = CHARMS[B.sel];
    G.R(660, 130, 240, 372, '#0e1220'); G.R(660, 130, 240, 2, rg.pal.ink);
    G.T(c.name, 676, 164, '#e8e2d4', 24);
    const ct = charmText(c, rg);
    wrap(G, ct.text, 676, 196, 26, 22, '#cfd8e0');
    G.T(c.n + ' NOTCH' + (c.n > 1 ? 'ES' : ''), 676, 330, '#9fe0ff', 22);
    const mine = camp.owned.indexOf(c.id) >= 0;
    G.T(mine ? 'CLICK TO WEAR / REMOVE' : c.feat ? 'NOT SOLD' : 'CLICK TO BUY: ' + c.cost + ' GEO', 676, 360, mine || !c.feat ? '#a3adc2' : '#ffd68c', 20);
    if (ct.notes.length) wrap(G, ct.notes.join(' '), 676, 392, 26, 22, '#ffd68c');
    if (c.feat === 'perfect' && !mine) {
      G.T('PERFECT ROOMS  ' + found(c) + ' OF ' + ROOMS, 676, 392, '#ffd68c', 22);
      wrap(G, 'PERFECT: NO LARVA HATCHED, AND UNDER THREE QUARTERS OF A SECOND A TILE. EVERY ROOM, THE GUARDIANS TOO.', 676, 420, 26, 22, '#cfd8e0');
    }
    G.T(B.note, 60, 590, '#ffd68c', 24);
    G.T('ESC: BACK TO THE MAP', 904, 590, '#98a2b8', 20, 'right');
  };
  B.mouse = (type, ev, lx, ly) => {
    const h = B.hits.find(q => lx >= q.x && lx <= q.x + q.w && ly >= q.y && ly <= q.y + q.h);
    if (!h) return;
    if (type === 'move' && h.id[0] === 'c' && h.id !== 'notch') B.sel = +h.id.slice(1);
    if (type === 'down') { if (h.id === 'notch') buyNotch(); else { B.sel = +h.id.slice(1); wear(B.sel); } }
  };
  B.key = ev => {
    const k = ev.key;
    if (k === 'ArrowDown') { B.sel = Math.min(CHARMS.length - 1, B.sel + 2); return true; }
    if (k === 'ArrowUp') { B.sel = Math.max(0, B.sel - 2); return true; }
    if (k === 'ArrowRight') { B.sel = Math.min(CHARMS.length - 1, B.sel + 1); return true; }
    if (k === 'ArrowLeft') { B.sel = Math.max(0, B.sel - 1); return true; }
    if (k === 'Enter' || k === ' ') { wear(B.sel); return true; }
    return false;
  };
  return B;
}

function wrap(G, text, x, y, chars, lh, c) {
  const words = text.split(' ');
  let line = '';
  words.forEach(w => {
    if ((line + ' ' + w).trim().length > chars) { G.T(line, x, y, c, 20); y += lh; line = w; } else line = (line + ' ' + w).trim();
  });
  if (line) G.T(line, x, y, c, 20);
}
