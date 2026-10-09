/* GARDEN — one frame of the garden: the sky, the hedge, the rack, twelve pots with what is growing in them, the weather of the
   room, and the tabs over the top. Reads the model; changes nothing in it (it does bounce a plant that was just touched). */
import { dimCol, drawPot, drawPlant, drawSunToken } from './art.js';
import { ROOM_DEFS } from './rooms.js';
import { POTS_PER_ROOM } from './synergy.js';
import { stageOf } from './stages.js';
import { W, H, layer, lighting, seasonOf } from './stage_kit.js';
import { createFx, rainAt, flashAt, windAt, drawRain, drawBursts, burst, shimmer, vignette, transition } from './fx.js';
import * as M from './model.js';

export { W, H };
export const potAt = i => { const col = i % 4, row = (i / 4) | 0; return { x: 40 + col * 184, y: 150 + row * 96, cx: 40 + col * 184 + 33, w: 66, h: 46 }; };
export const roomTabAt = i => { const tw = 74, gap = 4, total = ROOM_DEFS.length * (tw + gap) - gap; return { x: W - total - 10 + i * (tw + gap), y: 6, w: tw, h: 20 }; };

export function createAmbience() {
  return { pops: [], fx: createFx() };
}

/* the small squares above a pot that say what is helping it: gold for ROOTED, green for its home or its pot, aqua for a bed, pink for mates */
const PIPS = { 'ROOTED': '#ffd84a', 'HOME ROOM': '#7ad06a', 'KIN POT': '#7ad06a', 'ROOM SET': '#c8a0ff' };
const pipColour = tag => PIPS[tag] || (/OF ITS KIND/.test(tag) ? '#5ad6d6' : /MATE/.test(tag) ? '#ff8ac8' : '#ffffff');

function potsAndPlants(g, V, gk, night) {
  const { st, w, ri, now, tsec, dt } = V, room = st.rooms[ri], dry = [];
  const skin = V.skin(ri);
  for (let i = 0; i < POTS_PER_ROOM; i++) {
    const q = potAt(i), p = room.pots[i], isWet = !p || M.isWet(w, st, ri, p, now);
    if (p && !isWet) dry.push(i);
    drawPot(g, q.x, q.y, skin, 1.5, gk);
    if (V.hover === i) {
      g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(q.x - 3, q.y - 54, q.w + 6, q.h + 60);
      g.fillStyle = 'rgba(255,244,160,' + (0.55 + 0.25 * Math.sin(tsec * 6)).toFixed(2) + ')';
      const x0 = q.x - 3, y0 = q.y - 54, w0 = q.w + 6, h0 = q.h + 60;            /* four corner brackets, breathing */
      [[x0, y0, 1, 1], [x0 + w0, y0, -1, 1], [x0, y0 + h0, 1, -1], [x0 + w0, y0 + h0, -1, -1]].forEach(([cx0, cy0, dx, dy]) => { g.fillRect(cx0 - (dx < 0 ? 6 : 0), cy0 - (dy < 0 ? 1 : 0), 6, 1); g.fillRect(cx0 - (dx < 0 ? 1 : 0), cy0 - (dy < 0 ? 6 : 0), 1, 6); });
    }
    if (!p) continue;
    const sp = w.species(p.sp), stage = M.stage(w, p);
    if (p.wig > 0) p.wig = Math.max(0, p.wig - dt * 2.2);
    drawPlant(g, q.cx, q.y + 5, sp, stage, tsec, 1.9, p.wig, night);
    if (p.tok) shimmer(g, q.cx, q.y - (stage === 3 ? 62 : 30), tsec, i + ri * 12, p.tok);       /* it is holding SUN: it shines */
    const s = M.stats(w, st, ri, i);
    /* what is helping the plant (and that it is thirsty) sits in a little plate at the foot of its pot, not up in the air over the
       leaves: one pip a helper, centred on the pot, and a sand-coloured hollow one at the end when the plant is dry */
    const pips = s.tags.map(pipColour);
    if (!isWet) pips.push(null);
    if (pips.length) {
      const pw = pips.length * 6 + 1, px = q.x + ((q.w - pw) >> 1), py = q.y + q.h - 11;
      g.fillStyle = 'rgba(8,6,2,0.62)'; g.fillRect(px, py, pw, 7);
      pips.forEach((c, k) => {
        if (c) { g.fillStyle = c; g.fillRect(px + 1 + k * 6, py + 2, 4, 4); return; }
        g.fillStyle = '#e8d496'; g.fillRect(px + 1 + k * 6, py + 2, 4, 4);
        g.fillStyle = '#5a4a28'; g.fillRect(px + 2 + k * 6, py + 3, 2, 2);
      });
    }
    const n = p.tok || 0, shown = Math.min(n, 6);
    for (let k = 0; k < shown; k++) drawSunToken(g, q.x + 4 + k * 9, q.y + q.h + 4 + Math.round(Math.sin(tsec * 3 + k) * 1.5), 9);
    if (n > shown) { g.fillStyle = '#fff4a0'; g.font = '12px "VT323", monospace'; g.fillText('+' + (n - shown), q.x + 4 + shown * 9, q.y + q.h + 14); }
  }
  return dry;
}

/* the +N that floats up from a pot you picked, outlined so it reads on every room's picture */
function pops(g, V) {
  const list = V.amb.pops;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.t += V.dt;
    if (p.t > 1.1) { list.splice(i, 1); continue; }
    const txt = '+' + p.n + (p.x2 ? '  x' + p.x2.toFixed(2) : ''), a = (1 - p.t / 1.1).toFixed(2), y = p.y - p.t * 26;
    g.font = '16px "VT323", monospace'; g.lineWidth = 3; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(20,12,0,' + a + ')'; g.strokeText(txt, p.x, y);
    g.fillStyle = 'rgba(255,244,140,' + a + ')'; g.fillText(txt, p.x, y);
  }
}

function tabs(g, V) {
  g.textAlign = 'center';
  ROOM_DEFS.forEach((rd, i) => {
    const t = roomTabAt(i), room = V.st.rooms[i], active = i === V.st.active;
    g.fillStyle = active ? 'rgba(255,244,140,0.94)' : room.unlocked ? 'rgba(10,10,10,0.68)' : 'rgba(10,10,10,0.42)';
    g.fillRect(t.x, t.y, t.w, t.h);
    g.strokeStyle = active ? '#fff4a0' : room.unlocked ? '#cfcfcf' : '#888888';
    g.lineWidth = 1; g.strokeRect(t.x + 0.5, t.y + 0.5, t.w - 1, t.h - 1);
    g.fillStyle = active ? '#3a2c08' : room.unlocked ? '#e8e2d4' : '#e0e0e0';
    g.font = '10px monospace';
    g.fillText(room.unlocked ? rd.name : (rd.price + ' SUN'), t.x + t.w / 2, t.y + 14);
    if (room.unlocked && room.drip) { g.fillStyle = active ? '#2a5a98' : '#6aa8e8'; g.fillRect(t.x + t.w - 6, t.y + 3, 3, 3); }
    if (room.unlocked && V.st.up.gather && M.tokens(room) >= M.cap(V.st) * 0.5) { g.fillStyle = '#ffd84a'; g.fillRect(t.x + 3, t.y + 3, 3, 3); }
  });
  g.textAlign = 'left';
}

/* returns the list of dry pots, for the line under the garden */
export function paint(g, V) {
  const { st, light, night } = V, rd = ROOM_DEFS[st.active], S = stageOf(rd.id), fx = V.amb.fx;
  const gk = S.gk(light), L = lighting(gk), now = V.now;
  const rain = (V.rainOverride != null ? V.rainOverride : rainAt(now)) * S.rain, K = { V, g, L, gk, light, night, tsec: V.tsec, dt: V.dt, rain, wind: windAt(V.tsec, now) * S.wind, drip: st.rooms[st.active].drip, now, season: V.season || seasonOf() };
  V.wind = K.wind;
  /* the room itself, painted once for the light it is in */
  if (S.under) {                                                     /* what is seen through the room's windows: sky, clouds, the world outside */
    g.fillStyle = '#05060a'; g.fillRect(0, 0, W, H);
    S.under(g, K);
  }
  g.drawImage(layer(rd.id + ':' + (S.still ? 0 : Math.round(light * 22)) + ':' + (rain > 0.1 ? 'w' : 'd') + ':' + K.season, lg => S.back(lg, Object.assign({}, K, { rain: rain > 0.1 ? 1 : 0 }))), 0, 0);
  if (S.sky && V.flyover) { V.flyover.step(V.dt); V.flyover.draw(g); }        /* Thea's geese, now and then, over the sky and under everything else */
  else if (V.flyover) V.flyover.step(V.dt);
  S.live(g, K);
  const dry = potsAndPlants(g, V, gk, night);
  pops(g, V);
  S.front(g, K);
  if (S.rain) drawRain(fx, g, K, S.floor);
  if (night) {
    const a = S.dark ? S.dark(light) : (0.34 - light) / 0.34 * 0.45;
    g.fillStyle = 'rgba(6,8,24,' + Math.max(0, a).toFixed(2) + ')'; g.fillRect(0, 0, W, H);
  }
  S.lights(g, K);                                                    /* lamps, windows, the moon: light is added after the dark is laid */
  drawBursts(fx, g, V.dt);
  const fl = flashAt(now, rain);
  if (fl > 0.02) { g.fillStyle = 'rgba(220,230,255,' + (fl * 0.32).toFixed(2) + ')'; g.fillRect(0, 0, W, H); }
  vignette(g, 0.55 + (night ? 0.4 : 0) + rain * 0.2);
  V.env = { room: rd.id, rain, wind: K.wind, night: light < 0.34, light, season: K.season, flash: fl, tsec: V.tsec };
  transition(fx, g, st.active, V.dt, S.tint);
  tabs(g, V);
  return dry;
}

/* a puff of what you just did, over pot `i`: kind is water, dirt, leaf, coin or pull */
export function splash(amb, kind, i, scale) { const q = potAt(i); burst(amb.fx, kind, q.cx, kind === 'water' ? q.y + 6 : q.y - 10, scale); }
