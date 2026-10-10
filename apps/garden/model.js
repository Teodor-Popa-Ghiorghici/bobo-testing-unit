/* GARDEN — how a garden grows and what it pays, as plain data and plain functions. No canvas, no DOM, no clock of its own:
 * `index.js` draws it and hands it the time; `garden_check.js` runs hours of it in a second and measures how long the
 * third temple is away.
 *
 *   st = { rooms: [{ unlocked, pot, drip, pots: [12 x null | { sp, watered, grown, acc, tok, wig }] }],
 *          active, lastTick, planted, up: { basket, gather } }
 *   w  = { rooms: ROOM_DEFS, species(id), pot(id), defaultPot }      (what Dave sells, as the garden sees it)
 *
 * A pot's token rate is its plant's `drop` seconds divided by what the pot, the room and the neighbours do to growth
 * (synergy.js); a token is worth the plant's `yield` times what they do to SUN; a room holds a basketful of tokens
 * (CAPS), and a plant that is not watered neither grows nor pays. Late in the game three things take the work out of it,
 * and each is bought: a DRIP line (a room never dries), a bigger BASKET (a room holds more between visits) and the
 * GATHERER (a room that fills up empties itself, at a discount: your own hand, sweeping the rack, always pays the full
 * price and, if it is quick, a little more).
 */
import { bonusFor, POTS_PER_ROOM } from './synergy.js';
import { eggs } from '../eggs_scope.js';

/* the golden sun eggs (kernel/eggs.js): plants grow a little faster, and tokens come a little sooner. 1 with none, and in Node (the check), where there is no window. */
const eggK = () => eggs().mult('garden');

export const WATER_MS = 8 * 60 * 1000;
export const DAY_MS = 20 * 60 * 1000;
export const CAPS = [20, 40, 80, 150];
export const BASKET_PRICE = [0, 700, 2400, 6500];
export const GATHER = [{ price: 0, rate: 0 }, { price: 3000, rate: 0.65 }, { price: 9000, rate: 0.85 }];
export const DRIP_PRICE = { yard: 400, greenhouse: 600, cellar: 700, rooftop: 900, shrine: 1100 };
export const GATHER_AT = 0.9;                      /* the share of the basket a room fills before the gatherer comes */
export const CHAIN = { step: 0.04, max: 0.5, window: 1800 };       /* ms between two picks to keep a sweep going */
/* away, plants grow at OFFLINE_RATE for at most OFFLINE_MAX_MS, and the gatherer, who is not watched, brings in AWAY_GATHER of what it would while you were looking */
export const OFFLINE_RATE = 0.4, OFFLINE_MAX_MS = 60 * 60 * 1000, OFFLINE_CHUNK = 30000, AWAY_GATHER = 0.5;

export const light = now => 0.5 + 0.5 * Math.cos(((now % DAY_MS) + DAY_MS) % DAY_MS / DAY_MS * Math.PI * 2);
export const isNight = now => light(now) < 0.34;

export const blank = () => ({ unlocked: false, pot: null, drip: false, pots: Array(POTS_PER_ROOM).fill(null) });
export const fresh = defs => ({ rooms: defs.map((d, i) => ({ ...blank(), unlocked: i === 0 })), active: 0, lastTick: 0, planted: 0, up: { basket: 0, gather: 0 } });

/* TEND and the BENCH are late-game: they are what the work turns into once there is a garden worth the trouble.
   TEND (water and sweep every room in one press) opens when the garden has this many rooms; the BENCH (drip lines, baskets, the
   gatherer: everything that takes the work out of it) opens when you own this many different kinds of plant. Before that you
   water with the can, pick with your hand and walk from room to room, which is the game. Four rooms is 4,400 SUN of rooms and eight
   kinds of plant is 5,600 of seeds: well past the middle of the way to the third temple (garden_check.js holds it). */
export const UNLOCK = { tend: 4, bench: 8 };
export const roomsOpen = st => st.rooms.filter(r => r.unlocked).length;
export const gates = (st, kinds) => {
  const r = roomsOpen(st);
  return { tend: { have: r, need: UNLOCK.tend, open: r >= UNLOCK.tend }, bench: { have: kinds, need: UNLOCK.bench, open: kinds >= UNLOCK.bench } };
};

export const potId = (w, room) => room.pot || w.defaultPot;
export const cap = st => CAPS[Math.min(st.up.basket, CAPS.length - 1)];
export const tokens = room => room.pots.reduce((a, p) => a + (p ? p.tok || 0 : 0), 0);

/* how far along a plant is: -1 nothing there, 0 a seed in the ground, 1 and 2 growing, 3 grown (and paying) */
export function stage(w, p) {
  const sp = p && w.species(p.sp);
  if (!sp) return -1;
  const need = sp.grow * 1000;
  return p.grown >= need * 3 ? 3 : p.grown >= need * 2 ? 2 : p.grown >= need ? 1 : 0;
}

/* what the pot, the room and the neighbours do to pot i of room ri, all multiplied: { grow, yield, water, night, blessed, tags } */
export function stats(w, st, ri, i) {
  const room = st.rooms[ri], def = w.rooms[ri], pot = w.pot(potId(w, room)), b = def.buff;
  const sy = bonusFor({ pot: pot.id, pots: room.pots }, def, w.species, i);
  return { grow: pot.buff.grow * b.grow * sy.grow, yield: pot.buff.yield * b.yield * sy.yield,
           water: pot.buff.water * b.water, night: b.night, blessed: b.blessed, tags: sy.tags };
}
/* how long a watering lasts in a room, in ms: the pot's and the room's, and for ever on a drip line */
export const waterMs = (w, st, ri) => {
  const room = st.rooms[ri];
  return room.drip ? Infinity : WATER_MS * w.pot(potId(w, room)).buff.water * w.rooms[ri].buff.water;
};
export const isWet = (w, st, ri, p, now) => !!p && p.watered + waterMs(w, st, ri) > now;

/* the SUN a plant is holding right now, as it would be paid (a sweep multiplies it) */
export function worth(w, st, ri, i) {
  const p = st.rooms[ri].pots[i], sp = p && w.species(p.sp);
  return sp ? Math.round(sp.yield * (p.tok || 0) * stats(w, st, ri, i).yield) : 0;
}
/* pay out pot i of room ri: returns what it was worth and empties it */
export function collect(w, st, ri, i, mult = 1) {
  const p = st.rooms[ri].pots[i];
  if (!p || !p.tok) return 0;
  const n = Math.round(worth(w, st, ri, i) * mult);
  p.tok = 0;
  return n;
}
export const chainMult = n => 1 + Math.min(CHAIN.max, CHAIN.step * Math.max(0, n - 1));

/* `dt` ms of garden time ending at `now`; `rate` is 1 awake and OFFLINE_RATE away. `earn(n, source)` is told what the gatherer brings in. */
export function step(w, st, now, dt, rate, earn) {
  const clockNight = isNight(now), capN = cap(st);
  st.rooms.forEach((room, ri) => {
    if (!room.unlocked) return;
    const wm = waterMs(w, st, ri);
    let held = tokens(room);
    room.pots.forEach((p, i) => {
      const sp = p && w.species(p.sp);
      if (!sp) return;
      const wet = wm === Infinity ? dt : Math.max(0, Math.min(dt, (p.watered + wm) - (now - dt)));
      if (wet <= 0) return;
      const s = stats(w, st, ri, i), credit = wet * rate * s.grow * eggK(), need = sp.grow * 1000;
      if (p.grown < need * 3) p.grown = Math.min(need * 3, p.grown + credit);
      if (p.grown < need * 3) return;
      if (sp.night && !(s.night || clockNight)) return;
      p.acc += credit;
      const per = sp.drop * 1000;
      while (p.acc >= per && held < capN) {
        p.acc -= per;
        const dbl = !!(s.blessed && Math.random() < s.blessed), add = dbl ? 2 : 1;
        if (dbl) st.blessedN = (st.blessedN || 0) + 1;                 /* the trophies count the doubled tokens (BLESSED) */
        p.tok = (p.tok || 0) + add;
        held += add;
      }
      if (held >= capN) p.acc = Math.min(p.acc, per);
    });
    if (st.up.gather && held >= capN * GATHER_AT) {
      let sum = 0;
      room.pots.forEach((p, i) => { if (p) sum += collect(w, st, ri, i); });
      const n = Math.round(sum * GATHER[st.up.gather].rate * (rate < 1 ? AWAY_GATHER : 1));
      if (n > 0 && earn) earn(n, 'GARDEN: GATHERER');
    }
  });
}

/* away: the time since the last tick, in stretches of OFFLINE_CHUNK so the gatherer and the baskets do their work in order */
export function catchUp(w, st, now, earn) {
  const last = st.lastTick || now, gap = Math.max(0, now - last);
  st.lastTick = now;
  if (gap > 4000) {
    const eff = Math.min(gap, OFFLINE_MAX_MS);
    for (let t = now - eff + OFFLINE_CHUNK; ; t += OFFLINE_CHUNK) {
      const at = Math.min(t, now);
      step(w, st, at, Math.min(OFFLINE_CHUNK, eff), OFFLINE_RATE, earn);
      if (at >= now) break;
    }
  } else if (gap > 0) step(w, st, now, gap, 1, earn);
}

/* water every dry pot in a room */
export function waterRoom(w, st, ri, now) {
  let n = 0;
  st.rooms[ri].pots.forEach(p => { if (p && !isWet(w, st, ri, p, now)) { p.watered = now; n++; } });
  return n;
}

/* what the bench sells in a room, and what is for sale everywhere: [{ id, name, blurb, price, owned, locked? }] */
export function offers(w, st, ri) {
  const out = [], b = st.up.basket, g = st.up.gather, room = st.rooms[ri], def = w.rooms[ri];
  out.push({ id: 'drip', name: 'DRIP LINE: ' + def.name, price: DRIP_PRICE[def.id], owned: room.drip,
    blurb: 'This room never dries out. No can, no checking, no ' + 'dry pots.' });
  if (b < CAPS.length - 1) out.push({ id: 'basket', name: 'BASKET ' + (b + 2) + ': HOLDS ' + CAPS[b + 1], price: BASKET_PRICE[b + 1], owned: false,
    blurb: 'Every room holds ' + CAPS[b + 1] + ' SUN tokens between visits instead of ' + CAPS[b] + '.' });
  else out.push({ id: 'basket', name: 'BASKET ' + CAPS.length + ': HOLDS ' + CAPS[b], price: 0, owned: true, blurb: 'The biggest basket there is.' });
  if (g < GATHER.length - 1) out.push({ id: 'gather', name: g ? 'GATHERER 2: PAYS ' + Math.round(GATHER[2].rate * 100) + '%' : 'THE GATHERER: PAYS ' + Math.round(GATHER[1].rate * 100) + '%',
    price: GATHER[g + 1].price, owned: false,
    blurb: 'A room that is nearly full empties itself into your pocket, even while you are away, for ' + Math.round(GATHER[g + 1].rate * 100) + '% of what your own hand gets.' });
  else out.push({ id: 'gather', name: 'GATHERER 2: PAYS ' + Math.round(GATHER[2].rate * 100) + '%', price: 0, owned: true, blurb: 'It has never missed a token.' });
  return out;
}
export function buy(w, st, ri, id, spend) {
  const o = offers(w, st, ri).find(x => x.id === id);
  if (!o || o.owned || !spend(o.price, 'GARDEN: ' + o.name)) return false;
  if (id === 'drip') st.rooms[ri].drip = true;
  else if (id === 'basket') st.up.basket++;
  else if (id === 'gather') st.up.gather++;
  return true;
}
