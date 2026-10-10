/* GARDEN — the SHRINE: a hall of red lacquered pillars and a beam hung with four paper lanterns that sway and breathe, a sacred rope with paper tags that flutter, a glass wind-bell
   that turns in the draught, a pagoda and mountains far off in a purple dusk (it is always dusk in here, whatever the clock says outside: the sky is the garden's, but bruised),
   panelled wainscot trimmed in gold, tiles, two stone lanterns and a candle on the floor. Embers rise, blossom falls, a blue spirit-light drifts through now and then, and
   smoke curls from the lanterns. At night every flame is brighter and the pagoda's windows come on. */
import { gardenSky } from './art.js';
import { W, H, TAU, rect, disc, oval, line, rng, mix, sprite, glow, clamp, skyBodies } from './stage_kit.js';
import { drawRack, ROWS } from './stage_rack.js';

const LANTERNS = [132, 272, 432, 572];
const PAGODA = { x: 520, y: 195 };

export const shrine = {
  id: 'shrine', sky: false, air: false, rain: 0, wind: 0.5, floor: 410, tint: 'rgba(190,100,240,0.5)',
  gk: light => 0.55 + light * 0.3,
  dark: light => (0.34 - light) / 0.34 * 0.36,

  under(g, K) {
    const { light, tsec } = K, r = rng(23);
    g.drawImage(gardenSky(W, H, light, false), 0, 0);
    g.fillStyle = 'rgba(96,40,130,0.42)'; g.fillRect(0, 0, W, 330);                       /* the shrine's dusk, whatever hour it is */
    g.fillStyle = 'rgba(255,120,120,' + (0.12 * clamp(light * 1.4, 0, 1)).toFixed(2) + ')'; g.fillRect(0, 150, W, 150);
    skyBodies(g, K, 150, 70, 300);
    /* mountains: three ranges, the far ones paler, mist between */
    [[210, '#6a4a8a', 0.6, 0.011, 30], [235, '#4a3470', 0.4, 0.017, 26], [262, '#34244e', 0.2, 0.023, 22]].forEach(([base, c, hz, f, a], i) => {
      g.fillStyle = mix(c, '#c8a0e0', hz * 0.25); for (let x = 0; x < W; x += 2) { const y = base - Math.abs(Math.sin(x * f + i * 2)) * a - Math.sin(x * f * 3.1 + i) * 5; g.fillRect(x, Math.round(y), 2, 300 - Math.round(y)); }
      g.fillStyle = 'rgba(200,160,230,' + (0.12 - i * 0.02).toFixed(2) + ')'; g.fillRect(0, base + 4, W, 14);
    });
    void r; void tsec;
  },

  back(g, K) {
    const { L } = K, r = rng(29);
    /* the pagoda: five tiers of roof, each smaller, on a stepped base */
    const px = PAGODA.x, py = PAGODA.y;
    for (let t = 0; t < 5; t++) {
      const w = 44 - t * 6, y = py - t * 20 - 14;
      rect(g, px - w / 2, y, w, 12, L('#20142e')); rect(g, px - w / 2 - 8, y - 5, w + 16, 5, L('#2c1c40')); rect(g, px - w / 2 - 10, y - 7, w + 20, 2, L('#3c2858'));
      rect(g, px - w / 2 - 12, y - 8, 4, 2, L('#3c2858')); rect(g, px + w / 2 + 8, y - 8, 4, 2, L('#3c2858'));
    }
    rect(g, px - 1, py - 120, 3, 16, L('#20142e')); rect(g, px - 3, py - 108, 7, 2, L('#3c2858')); rect(g, px - 20, py, 40, 6, L('#20142e'));
    /* the beam across the top, with gold brackets; a maroon band over it */
    rect(g, 0, 0, W, 22, L('#3a0e18')); rect(g, 0, 22, W, 24, L('#7a1420')); rect(g, 0, 22, W, 3, L('#b83a3a')); rect(g, 0, 43, W, 4, 'rgba(0,0,0,0.4)');
    for (let x = 30; x < W; x += 70) { rect(g, x, 28, 14, 12, L('#c89a3a')); rect(g, x + 2, 30, 10, 8, L('#7a1420')); rect(g, x + 5, 32, 4, 4, L('#e8c460')); }
    for (let x = 0; x < W; x += 6) rect(g, x, 8 + (x % 12 ? 0 : 1), 3, 2, L('#5a1020'));
    /* the sacred rope, sagging, with its paper tags (they flutter in live) */
    for (let x = 0; x <= W; x += 2) rect(g, x, 54 + Math.sin(x / W * Math.PI * 4) * 4 + 2, 2, 3, L('#c8a860'));
    /* the lower wall: dark panelling, each panel framed in gold, a rail along its top */
    rect(g, 0, 256, W, 140, L('#241420')); rect(g, 0, 256, W, 4, L('#c89a3a')); rect(g, 0, 260, W, 2, 'rgba(0,0,0,0.5)');
    for (let x = 26; x < W - 30; x += 128) { rect(g, x, 270, 112, 112, L('#341e2e')); rect(g, x, 270, 112, 2, L('#c89a3a')); rect(g, x, 380, 112, 2, L('#c89a3a')); rect(g, x, 270, 2, 112, L('#c89a3a')); rect(g, x + 110, 270, 2, 112, L('#c89a3a')); rect(g, x + 8, 278, 96, 96, 'rgba(0,0,0,0.18)'); }
    /* the tiled floor, a grid of dark stones */
    rect(g, 0, H - 42, W, 42, L('#241830')); rect(g, 0, H - 42, W, 3, L('#4a3460'));
    for (let x = 0; x < W; x += 44) rect(g, x, H - 40, 1, 40, L('#140c1c')); for (let y = H - 30; y < H; y += 14) rect(g, 0, y, W, 1, L('#140c1c'));
    if (!K.wall) drawRack(g, L, 'shrine');                       /* no rack in the wallpaper: there are no pots to stand on it */
    /* gold along the front of every board, and the red pillars' gold bands */
    if (!K.wall) ROWS.forEach(y => { rect(g, 14, y, W - 28, 1, L('#c89a3a')); });
    [14, W - 26].forEach(x => { for (let y = 160; y < 400; y += 60) { rect(g, x, y, 12, 3, L('#c89a3a')); } });
    /* two stone lanterns and a red candle-holder on the floor */
    [70, 630].forEach(x => { rect(g, x - 12, H - 22, 24, 10, L('#7a7488')); rect(g, x - 6, H - 40, 12, 18, L('#6a6478')); rect(g, x - 16, H - 46, 32, 8, L('#8a8498')); rect(g, x - 11, H - 52, 22, 6, L('#7a7488')); rect(g, x - 5, H - 56, 10, 4, L('#9a94a8')); rect(g, x - 4, H - 38, 8, 12, 'rgb(30,14,10)'); });
    rect(g, 344, H - 20, 12, 8, L('#a82a2a')); rect(g, 346, H - 28, 8, 8, L('#c83a3a')); rect(g, 349, H - 34, 2, 6, L('#e8dcc0'));
    void r;
  },

  live(g, K) {
    const { tsec, L, wind } = K;
    /* the paper tags on the rope: zigzags that swing */
    for (let x = 12; x < W; x += 24) { const y = 54 + Math.sin(x / W * Math.PI * 4) * 4 + 5, sw = Math.sin(tsec * 2.2 + x * 0.05) * (1 + wind * 2); for (let k = 0; k < 4; k++) rect(g, x + sw * (k / 4) + (k & 1) * 2, y + k * 4, 4, 4, L(k & 1 ? '#e8e0e8' : '#c8c0d0')); }
    /* the lanterns: a pendulum each, the red paper, black caps, a gold tassel; their glow is in lights */
    LANTERNS.forEach((x, i) => {
      const sw = Math.sin(tsec * 0.9 + i * 1.3) * (2 + wind * 3), top = 46, lx = x + sw;
      line(g, x, top, lx, top + 12, L('#2a1a10'));
      rect(g, lx - 9, top + 12, 18, 4, 'rgb(20,14,12)'); rect(g, lx - 12, top + 16, 24, 22, L('#d02a2a')); rect(g, lx - 12, top + 16, 5, 22, L('#f05a4a')); rect(g, lx + 8, top + 16, 4, 22, L('#8a1818'));
      for (let k = 0; k < 4; k++) rect(g, lx - 12, top + 20 + k * 5, 24, 1, L('#7a1414'));
      rect(g, lx - 9, top + 38, 18, 3, 'rgb(20,14,12)'); rect(g, lx - 1, top + 41, 2, 10, L('#d8aa48')); rect(g, lx - 3, top + 51, 6, 3, L('#d8aa48'));
    });
    /* the wind-bell: a glass dome on a cord with a paper strip that catches the draught */
    const sw = Math.sin(tsec * 1.7) * (2 + wind * 4);
    line(g, 350, 47, 350 + sw * 0.5, 66, L('#c8a860')); oval(g, 350 + sw * 0.5, 72, 8, 6, 'rgba(180,220,255,0.75)'); rect(g, 342 + sw * 0.5, 72, 16, 6, 'rgba(180,220,255,0.75)'); rect(g, 349 + sw * 0.5, 78, 2, 6, '#e8e0f0'); rect(g, 346 + sw, 84, 8, 12, '#f0e8f8'); rect(g, 346 + sw, 84, 8, 1, '#c8c0d8');
    /* smoke curling from the lanterns on the floor */
    [70, 630].forEach((x, i) => { for (let k = 0; k < 14; k++) { const ph = (tsec * 0.18 + k / 14 + i * 0.4) % 1, sx = x + Math.sin(ph * 7 + k) * (4 + ph * 14) + wind * ph * 12; g.fillStyle = 'rgba(210,200,230,' + (0.28 * (1 - ph)).toFixed(3) + ')'; g.fillRect(Math.round(sx), Math.round(H - 58 - ph * 60), 3 + Math.round(ph * 5), 3 + Math.round(ph * 3)); } });
  },

  front(g, K) {
    const { tsec, wind } = K;
    /* blossom blown across the hall, a mist low over the floor, embers going up */
    for (let i = 0; i < 24; i++) { const x = (((i * 83 + tsec * (12 + wind * 22)) % (W + 40)) + W + 40) % (W + 40) - 20, y = ((i * 47 + tsec * (18 + (i % 5) * 4)) % (H + 20)) - 10; rect(g, x + Math.sin(tsec + i) * 6, y, 2, 2, ['#ffd0e0', '#f4a8c8', '#ffffff'][i % 3]); rect(g, x + Math.sin(tsec + i) * 6 + 1, y + 1, 2, 1, 'rgba(255,208,224,0.6)'); }
    for (let i = 0; i < 7; i++) { const x = ((i * 130 + tsec * 5) % (W + 200)) - 100, y = H - 56 - Math.abs(Math.sin(tsec * 0.15 + i)) * 10; g.fillStyle = 'rgba(190,150,230,0.10)'; g.fillRect(Math.round(x), Math.round(y), 170, 12); g.fillRect(Math.round(x + 30), Math.round(y - 6), 100, 8); }
  },

  lights(g, K) {
    const { tsec, light } = K, dark = clamp(1 - light * 1.4, 0, 1);
    LANTERNS.forEach((x, i) => {
      const sw = Math.sin(tsec * 0.9 + i * 1.3) * (2 + K.wind * 3), fl = 0.88 + 0.12 * Math.sin(tsec * 6 + i * 2) * Math.sin(tsec * 2.3 + i);
      glow(g, x + sw, 46 + 28, 70, '255,90,70', (0.28 + 0.4 * dark) * fl); glow(g, x + sw, 46 + 28, 22, '255,200,120', (0.35 + 0.4 * dark) * fl);
    });
    glow(g, PAGODA.x, PAGODA.y - 60, 70, '255,150,80', 0.12 + 0.35 * dark);
    for (let t = 0; t < 5; t++) { const y = PAGODA.y - t * 20 - 10; rect(g, PAGODA.x - 3, y, 6, 6, 'rgba(255,170,80,' + (0.45 + 0.45 * dark).toFixed(2) + ')'); }
    [70, 630].forEach((x, i) => { const fl = 0.85 + 0.15 * Math.sin(tsec * 7 + i * 4); glow(g, x, H - 30, 54, '255,180,90', (0.5 + 0.35 * dark) * fl); rect(g, x - 3, H - 36, 6, 8, 'rgba(255,214,130,' + fl.toFixed(2) + ')'); });
    const cf = 0.85 + 0.15 * Math.sin(tsec * 9); glow(g, 350, H - 30, 40, '255,150,80', (0.4 + 0.3 * dark) * cf); rect(g, 349, H - 36, 3, 3, 'rgba(255,230,160,0.95)');
    /* embers rising from the candle and the lanterns, and a blue spirit-light that passes now and then */
    for (let i = 0; i < 16; i++) { const ph = (tsec * 0.12 + i * 0.131) % 1, x = (i % 3 === 0 ? 70 : i % 3 === 1 ? 630 : 350) + Math.sin(ph * 9 + i) * 14, y = H - 40 - ph * 200; g.globalAlpha = Math.sin(ph * Math.PI) * 0.9; rect(g, x, y, 2, 2, '#ffb060'); glow(g, x, y, 6, '255,150,60', 0.4 * Math.sin(ph * Math.PI)); }
    g.globalAlpha = 1;
    const sc = (tsec / 37) % 1;
    if (sc < 0.3) { const f = sc / 0.3, x = -20 + f * (W + 40), y = 190 + Math.sin(f * 9) * 24; glow(g, x, y, 20, '120,170,255', 0.55 * Math.sin(f * Math.PI)); disc(g, x, y, 3, 'rgba(210,230,255,' + (0.9 * Math.sin(f * Math.PI)).toFixed(2) + ')'); for (let k = 1; k < 8; k++) rect(g, x - k * 5, y + Math.sin((f - k * 0.01) * 9) * 24 - 190 + 190 + k, 2, 2, 'rgba(160,200,255,' + (0.5 * (1 - k / 8) * Math.sin(f * Math.PI)).toFixed(2) + ')'); }
    void TAU; void sprite;
  }
};
