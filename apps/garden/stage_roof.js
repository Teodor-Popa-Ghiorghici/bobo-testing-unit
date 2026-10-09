/* GARDEN — the ROOFTOP: a city to the horizon in three hazy layers (windows that come on as the light goes and a few that flicker), a water tower, a neon sign that
   stutters, strings of coloured bulbs across the top, a concrete parapet with an air-conditioner on it, a black cat on the shelf who watches, flicks an ear and blinks, clouds
   that go over fast and a plane with its lights blinking. The wind is the strongest of any room. The skyline is painted once for the light; the rest moves. */
import { gardenSky } from './art.js';
import { W, H, TAU, rect, disc, oval, line, rng, mix, sprite, glow, clamp, skyBodies } from './stage_kit.js';
import { drawRack, ROWS } from './stage_rack.js';

const BASE = 300;
const hash = n => { let x = (n | 0) * 374761393 + 668265263; x = (x ^ (x >>> 13)) * 1274126177; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
const BULBS = ['#ff5a5a', '#ffd84a', '#5adc78', '#5aa8ff', '#ff8ad0', '#ffffff'];

export const rooftop = {
  id: 'rooftop', sky: true, air: false, rain: 1, wind: 1.4, floor: 404, tint: 'rgba(150,120,230,0.5)',
  gk: light => 0.4 + light * 0.6,
  dark: light => (0.34 - light) / 0.34 * 0.42,

  under(g, K) {
    const { tsec, light, rain } = K, day = clamp((light - 0.3) / 0.4, 0, 1);
    g.drawImage(gardenSky(W, H, light, false), 0, 0);
    g.fillStyle = 'rgba(120,70,130,' + (0.2 * (1 - day)).toFixed(2) + ')'; g.fillRect(0, 0, W, 300);          /* the city's own glow, bruising the sky */
    skyBodies(g, K, 130, 52, 300);
    [[1, 100, 15, 48], [2, 140, 10, 84], [3, 80, 19, 22]].forEach(([seed, w, sp, y], i) => {
      const x = ((tsec * sp + i * 233) % (W + w + 40)) - w - 20;
      g.globalAlpha = (0.35 + 0.5 * day) * (1 - rain * 0.2);
      g.drawImage(sprite('rcloud:' + seed, w + 8, 20, sg => { const r = rng(seed + 9); for (let k = 0; k < w / 8; k++) oval(sg, 8 + k * 8, 10 - Math.floor(Math.sin(k / (w / 8) * Math.PI) * 3 * r()), 8, 4 + Math.floor(r() * 3), '#a898b8'); rect(sg, 0, 12, w + 8, 3, '#8a7a9c'); }), Math.round(x), y);
    });
    g.globalAlpha = 1;
    /* a plane crossing high up now and then, its lights blinking */
    const pc = (tsec / 53) % 1;
    if (pc < 0.3) { const x = -20 + pc / 0.3 * (W + 40), y = 40 + pc * 20; rect(g, x, y, 5, 1, 'rgb(190,190,200)'); if (Math.floor(tsec * 1.6) % 2) rect(g, x - 1, y - 1, 2, 2, '#ff3030'); rect(g, x + 4, y, 1, 1, '#30ff60'); if (Math.floor(tsec * 3) % 5 === 0) rect(g, x + 2, y - 1, 2, 3, '#ffffff'); }
    if (light < 0.3) { const sc = (tsec / 29) % 1; if (sc < 0.04) { const f = sc / 0.04; line(g, 520 - f * 90, 30 + f * 40, 540 - f * 90, 24 + f * 40, 'rgba(255,255,255,' + (1 - f).toFixed(2) + ')'); } }        /* a shooting star */
  },

  back(g, K) {
    const { L, light } = K, r = rng(19), dusk = clamp(1 - light * 1.8, 0, 1), lit = clamp(0.15 + dusk * 0.75, 0, 0.9);
    const haze = mix('#7a6a90', '#201a30', clamp(1 - light, 0, 1));
    /* three layers of towers, each nearer one darker, taller windows, more of them lit */
    [[0, 8, 34, 60, 90, 2, 0.45, '#5e5478', 5, 7], [1, 10, 38, 66, 130, 3, 0.2, '#403658', 8, 10], [2, 14, 50, 88, 140, 4, 0, '#2c2640', 10, 12]].forEach(([layer, , wmin, wmax, hmax, , hz, colour, px, py], li) => {
      for (let x = -10 + li * 12; x < W + 10;) {
        const w = wmin + Math.floor(r() * (wmax - wmin)), h = 50 + Math.floor(r() * hmax), top = BASE - h, c = mix(colour, haze, hz);
        rect(g, x, top, w, h + 4, L(c)); rect(g, x, top, 2, h, L(mix(c, '#ffffff', 0.12))); rect(g, x + w - 2, top, 2, h, 'rgba(0,0,0,0.25)');
        if (r() < 0.45) { rect(g, x + (w >> 1), top - 12, 1, 12, L(c)); rect(g, x + (w >> 1) - 3, top - 8, 7, 1, L(c)); }              /* an aerial */
        else if (r() < 0.3) rect(g, x + 4, top - 5, w - 8, 5, L(mix(c, '#000000', 0.15)));
        for (let wy = top + 6; wy < BASE - 4; wy += py) for (let wx = x + 4; wx < x + w - px + 2; wx += px) {
          const on = r() < lit * (0.45 + li * 0.35);
          if (on) rect(g, wx, wy, Math.max(2, px - 5), Math.max(3, py - 6), r() < 0.8 ? '#f6cf6a' : r() < 0.5 ? '#ffe9a8' : '#a8d8ff');
          else if (li > 0 && r() < 0.5) rect(g, wx, wy, Math.max(2, px - 5), Math.max(3, py - 6), L(mix(c, '#8aa0c0', 0.25)));
        }
        x += w + Math.floor(r() * 5);
      }
    });
    /* the water tower on a roof of its own, and the billboard's frame behind the plants */
    rect(g, 98, 120, 3, 40, L('#2a2230')); rect(g, 122, 120, 3, 40, L('#2a2230')); rect(g, 94, 96, 36, 26, L('#4a3a30')); rect(g, 94, 96, 36, 3, L('#6a5444')); for (let k = 0; k < 4; k++) rect(g, 94, 102 + k * 6, 36, 1, L('#2a1e18')); rect(g, 92, 90, 40, 6, L('#2a2230')); rect(g, 104, 84, 16, 6, L('#2a2230'));
    rect(g, 430, 150, 72, 46, L('#3a2c24')); rect(g, 433, 153, 66, 40, L('#5a4838')); rect(g, 465, 196, 4, 100, L('#2a2230'));
    /* the parapet: concrete in panels, a capping stone, stains, and the air-conditioner at the left */
    rect(g, 0, BASE, W, 94, L('#4e5664')); rect(g, 0, BASE - 5, W, 8, L('#7a8494')); rect(g, 0, BASE - 5, W, 2, L('#a4aebc')); rect(g, 0, BASE + 3, W, 3, 'rgba(0,0,0,0.35)');
    for (let x = 0; x < W; x += 140) { rect(g, x, BASE + 6, 2, 88, L('#3a4250')); rect(g, x + 2, BASE + 6, 1, 88, L('#6a7484')); }
    for (let i = 0; i < 40; i++) rect(g, Math.floor(r() * W), BASE + 10 + Math.floor(r() * 80), 2, 8 + Math.floor(r() * 18), 'rgba(20,24,32,0.14)');
    rect(g, 22, 330, 58, 58, L('#6a7280')); rect(g, 22, 330, 58, 3, L('#9aa4b2')); oval(g, 51, 359, 21, 21, L('#3a4250')); oval(g, 51, 359, 17, 17, L('#262c36')); for (let k = -12; k <= 12; k += 6) rect(g, 51 + k - 1, 342, 2, 34, L('#4a5260'));
    /* the deck below, and the vent in it */
    rect(g, 0, H - 42, W, 42, L('#2e3038')); rect(g, 0, H - 42, W, 3, L('#4a4e5a'));
    for (let x = 0; x < W; x += 70) rect(g, x, H - 40, 1, 40, L('#1c1e24'));
    rect(g, 590, H - 26, 56, 16, L('#1c1e24')); for (let k = 0; k < 7; k++) rect(g, 592 + k * 8, H - 24, 5, 12, L('#4a4e5a'));
    drawRack(g, L, 'rooftop');
    /* the wire for the coloured bulbs, three swags across */
    for (let sw = 0; sw < 3; sw++) { const x0 = sw * 233; for (let x = 0; x <= 233; x += 2) rect(g, x0 + x, 10 + Math.sin(x / 233 * Math.PI) * 22, 2, 1, L('#14121c')); }
  },

  live(g, K) {
    const { tsec, L, light } = K, dusk = clamp(1 - light * 1.8, 0, 1);
    /* windows that blink on or off now and then (a minute apiece), and steam from a roof */
    for (let i = 0; i < 16; i++) { const t = Math.floor(tsec / (20 + (i % 5) * 9)), on = hash(i * 31 + t) < 0.3 + dusk * 0.4, x = 60 + (i * 41) % 600, y = 130 + (i * 23) % 150; if (hash(i * 7 + t) < 0.5) rect(g, x, y, 3, 4, on ? '#ffe28a' : L('#2a2438')); }
    for (let k = 0; k < 6; k++) { const ph = (tsec * 0.2 + k * 0.17) % 1; g.fillStyle = 'rgba(210,205,225,' + (0.22 * (1 - ph)).toFixed(2) + ')'; g.fillRect(Math.round(250 + Math.sin(ph * 6 + k) * 6 + K.wind * ph * 24), Math.round(190 - ph * 56), 5 + Math.round(ph * 6), 4); }
    /* the neon sign: a pink strip and a cyan one that stutter, mostly steady */
    const st = hash(Math.floor(tsec * 9)) < 0.07;
    rect(g, 437, 160, 58, 6, st ? '#4a2a3a' : '#ff6ab4'); rect(g, 437, 174, 40, 5, st ? '#2a3a4a' : '#5ae0ff'); rect(g, 437, 184, 52, 3, '#ffd84a');
    /* the black cat on the middle shelf: sits, the tail swaying, an ear flicks, it blinks, and now and then it turns its head to look */
    const cx = 572, cy = ROWS[1] - 1, tail = Math.sin(tsec * 1.6) * 5, look = Math.floor(tsec / 7) % 3 === 2 ? 1 : 0, blink = (tsec % 5) > 4.8, ear = (tsec % 9) > 8.7;
    rect(g, cx, cy - 12, 12, 12, 'rgb(14,14,20)'); rect(g, cx + 1, cy - 14, 10, 4, 'rgb(14,14,20)');
    rect(g, cx - 1 + look, cy - 22, 10, 8, 'rgb(14,14,20)'); rect(g, cx + look, cy - 25, 2, 3 + (ear ? -1 : 0), 'rgb(14,14,20)'); rect(g, cx + 6 + look, cy - 25, 2, 3, 'rgb(14,14,20)');
    rect(g, cx + 1 + look, cy - 19, 2, blink ? 1 : 2, light < 0.4 ? '#c8ff60' : '#8ac840'); rect(g, cx + 5 + look, cy - 19, 2, blink ? 1 : 2, light < 0.4 ? '#c8ff60' : '#8ac840');
    for (let k = 0; k < 7; k++) rect(g, cx + 12 + k * 1.4, cy - 2 - Math.sin(k * 0.5) * 4 + tail * (k / 7), 2, 2, 'rgb(14,14,20)');
    rect(g, cx - 1, cy - 2, 14, 2, 'rgb(10,10,14)');
  },

  front(g, K) {
    const { tsec, wind } = K;
    /* the strings of coloured bulbs: they sway a little more than the wire */
    for (let sw = 0; sw < 3; sw++) for (let k = 1; k < 12; k++) {
      const t = k / 12, x = sw * 233 + t * 233, y = 10 + Math.sin(t * Math.PI) * 22 + 2 + Math.sin(tsec * 2.2 + k + sw) * wind * 0.8, c = BULBS[(k + sw * 2) % BULBS.length];
      rect(g, x - 1, y, 3, 1, '#14121c'); rect(g, x - 1, y + 1, 3, 4, c);
    }
    /* a sheet of newspaper tumbling along the deck in the wind */
    if (wind > 0.35) { const px = ((tsec * (50 + wind * 70)) % (W + 80)) - 40, py = H - 22 - Math.abs(Math.sin(tsec * 4)) * 14; rect(g, px, py, 6, 4, 'rgba(220,214,196,0.9)'); rect(g, px + 1, py + 1, 4, 1, 'rgba(120,114,100,0.8)'); }
  },

  lights(g, K) {
    const { tsec, light } = K, dark = clamp(1 - light * 1.6, 0, 1);
    for (let sw = 0; sw < 3; sw++) for (let k = 1; k < 12; k++) {
      const t = k / 12, x = sw * 233 + t * 233, y = 10 + Math.sin(t * Math.PI) * 22 + 4, c = BULBS[(k + sw * 2) % BULBS.length], n = parseInt(c.slice(1), 16), tw = 0.7 + 0.3 * Math.sin(tsec * 2.4 + k * 1.3 + sw);
      glow(g, x, y, 14, ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255), (0.12 + 0.55 * dark) * tw);
    }
    if (dark > 0.1) { glow(g, 466, 170, 60, '255,106,180', 0.3 * dark); glow(g, 466, 180, 40, '90,224,255', 0.15 * dark); }
    if (dark > 0.2) { glow(g, 575, ROWS[1] - 19, 5, '200,255,96', 0.5 * dark); glow(g, 580, ROWS[1] - 19, 5, '200,255,96', 0.5 * dark); }
  }
};
void TAU; void disc;
