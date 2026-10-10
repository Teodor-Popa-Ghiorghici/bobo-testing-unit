/* THE EGGS SHELF: what Dave sells once he has nothing else (kernel/eggs_core.js says what an egg is and costs). One big card instead of a grid: the egg, how many of the forty are
   yours as a clutch, the price of the next, and what every one of them has reached so far. Pure drawing and text; the shop calls `fillEggs` and answers what it says. */
import { MAX, PER_EGG, DIALS } from '../../kernel/eggs_core.js';

export const EGG_OPEN = [
  'YOU HAVE BOUGHT EVERYTHING. EVERYTHING. THERE IS ONE THING LEFT, AND I KEPT IT IN A BOX. IT IS AN EGG.',
  'GOLD. SUN. EGG. IT DOES NOT HATCH. IT GIVES: HALF A PER CENT TO EVERYTHING THAT CAN TAKE IT.',
  'EACH ONE COSTS MORE THAN THE LAST. THAT IS NOT GREED. THAT IS THE LAW OF EGGS.',
  'FORTY IS ALL I HAVE. I ONLY LAID FORTY. DO NOT ASK WHO LAID THEM.'
];
export const EGG_BOUGHT = [
  'IT IS WARM. IT IS ALREADY IN THE WIRING. SOMETHING IN EVERY GAME IS A LITTLE BETTER AND NONE OF THEM CAN SAY WHAT.',
  'IN YOU GO. HALF A PER CENT. DO NOT SPEND IT ALL IN ONE PLACE.',
  'THE NEXT ONE IS DEARER. I AM SORRY. I AM NOT SORRY. I AM A LITTLE SORRY.',
  'ANOTHER ONE. THE GAMES NOTICED. THE GARDEN NOTICED FIRST.'
];
export const EGG_LAST = 'THAT IS ALL FORTY. THE CLUTCH IS FULL. I HAVE NOTHING LEFT TO SELL YOU. I AM GOING TO CRY IN THE BACK.';
export const EGG_BROKE = (price, have) => 'THE EGG IS ' + price + ' SUN. YOU HAVE ' + have + '. THE EGG IS NOT FLEXIBLE.';
const pick = a => a[Math.floor(Math.random() * a.length)];

/* a golden egg in pixels: yellow, a white shine top left, brown shade at the bottom right, whole pixels only */
export function drawEgg(cv, glow) {
  const g = cv.getContext('2d'), S = 4, W = 20, H = 26;
  g.imageSmoothingEnabled = false; g.clearRect(0, 0, cv.width, cv.height);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const hw = 8.4 + 1.6 * (y / H), dx = (x + 0.5 - W / 2) / hw, dy = (y + 0.5 - H / 2) / (H / 2);
    const r = dx * dx + dy * dy;
    if (r > 1) continue;
    const shade = dx * 0.55 + dy * 0.55;                                        /* toward the bottom right */
    let c = '#FFFF55';
    if (r > 0.82) c = '#AA5500';                                                 /* the edge */
    else if (shade > 0.5 && ((x + y) & 1)) c = '#AA5500';                        /* the shade, in a dither */
    else if (shade > 0.28) c = '#FFFF55';
    if (dx < -0.25 && dy < -0.15 && dx > -0.7 && dy > -0.7 && r < 0.6) c = '#FFFFFF';   /* the shine */
    g.fillStyle = c; g.fillRect(x * S, y * S, S, S);
  }
  if (glow) { g.fillStyle = '#FFFF55'; [[1, 3], [18, 6], [3, 21], [17, 22]].forEach(p => g.fillRect(p[0] * S, p[1] * S, S, S)); }
}
/* the clutch: forty places, a gold one for each egg that is yours */
function drawClutch(cv, n) {
  const g = cv.getContext('2d'), cell = 12, cols = 20;
  g.imageSmoothingEnabled = false; g.clearRect(0, 0, cv.width, cv.height);
  for (let i = 0; i < MAX; i++) {
    const x = (i % cols) * cell, y = Math.floor(i / cols) * (cell + 4) + 2, own = i < n;
    g.fillStyle = own ? '#FFFF55' : '#222222'; g.fillRect(x + 2, y + 3, cell - 5, cell - 4); g.fillRect(x + 3, y + 1, cell - 7, 2);
    g.fillStyle = own ? '#AA5500' : '#555555'; g.fillRect(x + 2, y + cell - 2, cell - 5, 2);
    if (own) { g.fillStyle = '#FFFFFF'; g.fillRect(x + 4, y + 3, 2, 2); }
  }
}

/* `o`: { say(text), snd, onBuy() }. Fills `host` (the shop's grid) with the egg shelf. */
export function fillEggs(host, o) {
  const E = window.Eggs, el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  host.innerHTML = '';
  const n = E.count(), next = E.next(), have = window.Economy.balance(), full = E.full();
  const card = el('div', 'eggcard');
  const cv = el('canvas', 'eggpic'); cv.width = 80; cv.height = 104; drawEgg(cv, n > 0);
  const body = el('div', 'eggbody');
  body.append(el('div', 'eggname', 'THE GOLDEN SUN EGG'), el('div', 'eggcount', n + ' OF ' + MAX + ' ARE YOURS'));
  const clutch = el('canvas', 'eggclutch'); clutch.width = 240; clutch.height = 40; drawClutch(clutch, n); body.appendChild(clutch);
  const buy = el('div', 'eggbuy' + (full ? ' done' : have < next ? ' broke' : ''), full ? 'THE CLUTCH IS FULL' : 'BUY THE NEXT ONE: ' + next + ' SUN');
  buy.addEventListener('mousedown', ev => {
    ev.stopPropagation();
    if (full) { o.say(EGG_LAST); return; }
    if (have < next) { o.say(EGG_BROKE(next, have)); if (o.snd && o.snd.deny) o.snd.deny(); return; }
    if (E.buy()) { if (o.snd && o.snd.purchase) o.snd.purchase(); o.say(E.full() ? EGG_LAST : pick(EGG_BOUGHT)); o.onBuy(); }
  });
  body.appendChild(buy);
  card.append(cv, body);
  host.appendChild(card);
  const table = el('div', 'eggtable');
  table.appendChild(el('div', 'eggh', 'WHAT EVERY EGG REACHES   +' + PER_EGG + '% EACH, ' + (n * PER_EGG) + '% NOW, ' + (MAX * PER_EGG) + '% AT THE MOST'));
  DIALS.forEach(d => {
    const row = el('div', 'eggrow');
    row.append(el('b', '', d.name), el('i', '', '+' + (n * PER_EGG) + '%'), el('span', '', d.text));
    table.appendChild(row);
  });
  host.appendChild(table);
}
