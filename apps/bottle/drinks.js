/* THE BOTTLE — what each drink looks like. The facts (name, strength, three colours, price) are Dave's (kernel/cos_data.js DRINKS);
   everything else a bottle needs is worked out from those three colours, so a new bottle is one line over there:
     glass    the bottle, and from it its highlight, its shadow, its cap
     liquor   what comes out: the stream, the tumbler, the splash
     label    the paper, and the ink on it is whichever of dark or light reads on it
   The Jägermeister the game began with keeps its own hand-picked values (a stag, and green glass the liquor is nearly black behind). */
import { DRINKS } from '../../kernel/cos_data.js';
import { GIFT_LABELS } from './labels_gifts.js';
import { ICONS } from './icons.js';

export const drinkById = id => DRINKS.find(d => d.id === id) || DRINKS[0];

/* THE HOMEMADE POTION is a different strength every sip: between one and ninety-nine per cent. `pct` is what this sip is, and a measure of it counts as that many parts in the
   thirty-five the machine was calibrated on (Jägermeister is 1) */
export const potionPercent = (r = Math.random()) => 1 + Math.floor(Math.min(0.9999999, Math.max(0, r)) * 99);
export const strengthOf = (d, pct) => (d.potion ? (pct || potionPercent()) / 35 : d.strength);

const rgbOf = h => [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)];
const hexOf = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const x = rgbOf(a), y = rgbOf(b); return hexOf(x.map((v, i) => v + (y[i] - v) * t)); };
const lum = h => { const c = rgbOf(h); return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; };
const W = '#ffffff', K = '#000000';

/* what is printed on the label, apart from the name */
const PRINT = {
  cordial:  ['ELDERFLOWER CORDIAL', '0% vol · no spirits'],
  mead:     ['HONEY WINE', '14% vol · bees'],
  blaabaer: ['BLUEBERRY LIQUEUR', '20% vol'],
  aquavit:  ['NORSK AKEVITT', '40% vol · over the sea'],
  sambuca:  ['ANISE LIQUEUR', '38% vol'],
  fernet:   ['AMARO', '39% vol · 27 herbs'],
  rum:      ['DARK RUM', '40% vol · molasses'],
  absinthe: ['LA FÉE VERTE', '68% vol · wormwood']
};
/* the picture on the label, in thirteen-by-eleven units */
const ICON = {
  cordial:  (r, x, y, s, k) => { const q = (a, b, w, h, c) => r(x + a * s, y + b * s, Math.max(1, w * s), Math.max(1, h * s), c || k.ink); q(5, 0, 3, 3); q(1, 4, 3, 3); q(9, 4, 3, 3); q(5, 8, 3, 3); q(5, 4, 3, 3, '#e0b010'); },
  mead:     (r, x, y, s, k) => { const q = (a, b, w, h, c) => r(x + a * s, y + b * s, Math.max(1, w * s), Math.max(1, h * s), c); q(3, 4, 8, 5, '#d89a10'); q(5, 4, 1, 5, k.ink); q(8, 4, 1, 5, k.ink); q(11, 5, 2, 3, k.ink); q(4, 0, 3, 4, '#8fb0c8'); q(7, 0, 3, 4, '#8fb0c8'); },
  blaabaer: (r, x, y, s, k) => { const q = (a, b, w, h, c) => r(x + a * s, y + b * s, Math.max(1, w * s), Math.max(1, h * s), c || k.ink); q(1, 5, 4, 4); q(6, 6, 4, 4); q(4, 2, 4, 4); q(8, 1, 1, 3, '#2a8a2a'); },
  aquavit:  (r, x, y, s, k) => { const q = (a, b, w, h, c) => r(x + a * s, y + b * s, Math.max(1, w * s), Math.max(1, h * s), c || k.ink); q(0, 8, 13, 3); q(6, 0, 1, 8); q(7, 1, 5, 6); q(1, 5, 5, 3); },
  sambuca:  (r, x, y, s, k) => { const q = (a, b, w, h, c) => r(x + a * s, y + b * s, Math.max(1, w * s), Math.max(1, h * s), c || k.ink); q(1, 3, 5, 7); q(7, 2, 5, 7); q(3, 4, 1, 5, k.label); q(9, 3, 1, 5, k.label); },
  fernet:   (r, x, y, s, k) => { const q = (a, b, w, h, c) => r(x + a * s, y + b * s, Math.max(1, w * s), Math.max(1, h * s), c || k.ink); q(5, 0, 3, 11); q(0, 4, 13, 3); q(4, 3, 5, 5, k.label); },
  rum:      (r, x, y, s, k) => { const q = (a, b, w, h, c) => r(x + a * s, y + b * s, Math.max(1, w * s), Math.max(1, h * s), c || k.ink); q(3, 0, 7, 6); q(4, 6, 5, 3); q(4, 2, 2, 2, k.label); q(7, 2, 2, 2, k.label); q(1, 9, 11, 2); },
  absinthe: (r, x, y, s, k) => { const q = (a, b, w, h, c) => r(x + a * s, y + b * s, Math.max(1, w * s), Math.max(1, h * s), c || k.ink); q(6, 0, 1, 11); q(2, 2, 4, 2); q(7, 4, 4, 2); q(2, 6, 4, 2); q(8, 8, 3, 2); }
};

/* which bottle each drink comes in (shapes.js), and the colour of its cap if it is not the glass darkened. A drink in Dave's list can say `shape`, `capKind` and `cap` itself. */
const LOOK = {
  jager:      { shape: 'jag' },
  cordial:    { shape: 'tall', cap: '#f4f4ea' },
  mead:       { shape: 'squat' },
  blaabaer:   { shape: 'jag' },
  aquavit:    { shape: 'tall' },
  sambuca:    { shape: 'round', cap: '#202020' },
  fernet:     { shape: 'cm', cap: '#c9a227' },
  rum:        { shape: 'round', cap: '#2a1008' },
  absinthe:   { shape: 'tall', capKind: 'cork' },
  goldwasser: { shape: 'jag', cap: '#c8a020' }
};

const cache = {};
export function paletteOf(d) {
  if (cache[d.id]) return cache[d.id];
  const L = d.liquor, look = Object.assign({ shape: 'jag' }, LOOK[d.id], d.shape && { shape: d.shape }, d.capKind && { capKind: d.capKind }, d.cap && { cap: d.cap });
  let p;
  if (d.id === 'jager') {
    p = { shape: 'jag', colors: {}, text: { emboss: 'JÄGERMEISTER', title: 'JÄGERMEISTER', sub1: 'KRÄUTERLIKÖR', sub2: '35% vol · 56 herbs', icon: null },
      bottleLiquid: null, stream: ['#b26a24', '#d98a32', '#f0b868'], fizz: '#c58a44', drop: '#c8741c', foam: '#e9c98a', title: '#f08a14', room: null };
  } else {
    const g = d.glass, lb = d.label, ink = lum(lb) > 0.55 ? '#14100a' : '#f4ecd8';
    const cap = look.cap || mix(g, K, 0.35);
    const colors = { glass: g, glassHi: mix(g, W, 0.45), glassLo: mix(g, K, 0.5), glassMid: mix(g, W, 0.14), edge: mix(g, K, 0.75),
      label: lb, labelHi: mix(lb, W, 0.3), labelDk: mix(lb, K, 0.25), ink, accent: lum(lb) > 0.55 ? mix(L, K, 0.18) : mix(L, W, 0.25), band: mix(L, K, 0.2), cap, capHi: mix(cap, W, 0.3), capLo: mix(cap, K, 0.45) };
    const base = mix(mix(L, g, 0.4), K, 0.1);
    const room = c => rgbOf(c);
    const [sub1, sub2] = d.print || PRINT[d.id] || ['', d.abv + '% vol'];
    p = { shape: look.shape, capKind: look.capKind || null, colors, text: { emboss: d.name, title: d.name, sub1, sub2, icon: ICON[d.id] || ICONS[d.id] || null, paint: GIFT_LABELS[d.id] || null },
      bottleLiquid: { base, mid: mix(L, g, 0.3), hi: mix(L, W, 0.35), edge: mix(base, K, 0.5), foam: '#f4f4ea' },
      stream: [mix(L, K, 0.25), L, mix(L, W, 0.45)], fizz: mix(L, K, 0.12), drop: mix(L, K, 0.1), foam: mix(L, W, 0.6), title: lum(lb) > 0.3 ? lb : mix(lb, W, 0.4),
      room: { liq: room(L), liqDk: room(mix(L, K, 0.55)), top: room(mix(L, W, 0.3)), foam: room(mix(L, W, 0.7)) } };
  }
  return (cache[d.id] = p);
}
