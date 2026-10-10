/* GARDEN — the GREENHOUSE: a long glass house of white iron, the sky and the lawn outside it, condensation running down the panes, hanging baskets that sway,
   misters that hiss a fine fog now and then, shafts of sun through the roof (and rain drumming on it), and a tile floor with clay pots stacked in the corner.
   At night two big lamps come on. The glass is a hole in the picture: what is outside is drawn first (under), the iron and the frost over it (back). */
import { gardenSky } from './art.js';
import { W, H, TAU, rect, disc, oval, line, rng, mix, sprite, glow, shaft, clamp, layer, skyBodies } from './stage_kit.js';
import { drawRack, drawDrip } from './stage_rack.js';

const IRON = '#e8f0ea';
const MULL = [0, 70, 140, 210, 280, 350, 420, 490, 560, 630, 699];

export const greenhouse = {
  id: 'greenhouse', sky: false, air: false, rain: 1, wind: 0.3, floor: 400, tint: 'rgba(255,190,90,0.5)',
  gk: light => 0.5 + light * 0.5,
  dark: light => (0.34 - light) / 0.34 * 0.34,

  /* outside: the sky through the roof, a line of trees and a hedge beyond the glass, clouds going by */
  under(g, K) {
    const { light, tsec, L } = K, day = clamp((light - 0.3) / 0.4, 0, 1);
    g.drawImage(gardenSky(W, H, light, false), 0, 0);
    skyBodies(g, K, 120, 36, 300);
    for (let i = 0; i < 4; i++) {
      const w = 90 + i * 30, x = ((tsec * (5 + i * 2) + i * 190) % (W + w + 60)) - w - 30, y = 12 + i * 34;
      g.globalAlpha = 0.2 + 0.7 * day;
      g.drawImage(sprite('gh-cloud:' + i, w + 8, 26, sg => { const rr = rng(40 + i); for (let k = 0; k < w / 6; k++) disc(sg, 8 + k * 6, 16 - Math.floor(Math.sin(k / (w / 6) * Math.PI) * 6 * rr()), 5 + Math.floor(rr() * 4), '#ffffff'); }), Math.round(x), y);
    }
    g.globalAlpha = 1;
  },

  back(g, K) {
    const { L, light } = K;
    /* the glass: a green cast, and a bright edge on every pane */
    rect(g, 0, 0, W, 394, 'rgba(60,120,90,0.14)');
    const r = rng(7);
    for (let i = 0; i < 9; i++) { const x = MULL[i] + 8 + Math.floor(r() * 40), y = 10 + Math.floor(r() * 300); line(g, x, y, x + 18, y - 18, 'rgba(255,255,255,0.18)', 2); }
    /* the roof: ribs from the ridge, purlins across, a ridge beam */
    for (let i = 0; i < MULL.length; i++) {
      const x = MULL[i];
      line(g, 350, 0, x, 60 + Math.abs(350 - x) * 0.06, L(IRON), 2);
    }
    rect(g, 0, 56, W, 4, L(IRON)); rect(g, 0, 60, W, 2, 'rgba(0,0,0,0.30)');
    rect(g, 0, 0, W, 6, L(IRON)); rect(g, 0, 6, W, 2, 'rgba(0,0,0,0.3)');
    /* glazing bars down the walls and across */
    MULL.forEach(x => { rect(g, x - 1, 60, 4, 334, L(IRON)); rect(g, x + 2, 60, 1, 334, 'rgba(0,0,0,0.25)'); });
    [128, 270].forEach(y => { rect(g, 0, y, W, 3, L(IRON)); rect(g, 0, y + 3, W, 1, 'rgba(0,0,0,0.25)'); });
    /* the frost: condensation thick low on the glass, thin up it, with drops on it */
    for (let y = 232; y < 322; y += 2) { const a = 0.04 + (y - 232) / 90 * 0.30; for (let x = 0; x < W; x += 3) if (r() < a * 0.7) rect(g, x + (y & 1), y, 3, 2, 'rgba(225,245,235,' + (a * 0.55).toFixed(2) + ')'); }
    for (let i = 0; i < 140; i++) { const x = Math.floor(r() * W), y = 70 + Math.floor(r() * 250); rect(g, x, y, 2, 2, 'rgba(230,248,255,0.30)'); rect(g, x, y, 1, 1, 'rgba(255,255,255,0.55)'); }
    /* the brick knee wall under the glass, and the plank floor in front of it */
    rect(g, 0, 322, W, 72, L('#6a3a2c'));
    for (let row = 0; row < 9; row++) for (let x = -(row & 1) * 11; x < W; x += 22) { rect(g, x, 322 + row * 8, 21, 7, L(r() < 0.5 ? '#8a4e3a' : r() < 0.5 ? '#7a4232' : '#9a5a42')); rect(g, x, 322 + row * 8, 21, 1, L('#b0705a')); }
    rect(g, 0, 318, W, 6, L('#aab4b8')); rect(g, 0, 318, W, 2, L('#d8e0e4')); rect(g, 0, 324, W, 3, 'rgba(0,0,0,0.3)');
    rect(g, 0, H - 42, W, 42, L('#5a3e2a')); rect(g, 0, H - 42, W, 3, L('#8a6a48'));
    for (let row = 0; row < 4; row++) { rect(g, 0, H - 38 + row * 10, W, 1, L('#2e1e12')); for (let x = (row * 97) % 140; x < W; x += 140) rect(g, x, H - 38 + row * 10, 1, 10, L('#2e1e12')); }
    /* the string lights: three swags of wire along the roof, a bulb every so often */
    for (let sw = 0; sw < 3; sw++) {
      const x0 = sw * 233, sag = 26;
      for (let x = 0; x <= 233; x += 2) { const t = x / 233, y = 16 + Math.sin(t * Math.PI) * sag; rect(g, x0 + x, y, 2, 1, L('#2a2e30')); }
      for (let k = 1; k < 10; k++) { const t = k / 10, y = 16 + Math.sin(t * Math.PI) * sag; rect(g, x0 + t * 233 - 1, y + 1, 3, 4, L('#c8c0a0')); }
    }
    if (!K.wall) drawRack(g, L, 'greenhouse');                       /* no rack in the wallpaper: there are no pots to stand on it */
    /* stacked clay pots, a hose coiled on its hook, a rain barrel with a tap */
    for (let k = 0; k < 3; k++) for (let j = 0; j <= 2 - k; j++) { rect(g, 18 + j * 15 + k * 7, H - 52 - k * 9, 14, 9, L('#b8643a')); rect(g, 16 + j * 15 + k * 7, H - 54 - k * 9, 18, 3, L('#d07a48')); }
    for (let k = 0; k < 5; k++) { oval(g, 668, H - 52 + k * 2, 11 - (k & 1), 5, L(k & 1 ? '#2a6a3a' : '#38884a')); }
    rect(g, 590, H - 70, 22, 30, L('#6a4a2a')); rect(g, 590, H - 70, 22, 3, L('#8a6a3a')); rect(g, 590, H - 58, 22, 2, L('#3a2a18')); rect(g, 590, H - 48, 22, 2, L('#3a2a18')); rect(g, 612, H - 52, 6, 3, L('#8a8a8a'));
    rect(g, 592, H - 72, 18, 2, mix('#3a78b8', '#102030', clamp(1 - light, 0, 0.7)));
    /* the thermometer on the post */
    rect(g, 344, 220, 4, 36, L('#e8e8e0')); rect(g, 345, 244, 2, 10, '#d83a2a'); rect(g, 342, 254, 8, 5, '#d83a2a');
  },

  live(g, K) {
    const { tsec, L, light, rain } = K, day = clamp((light - 0.3) / 0.4, 0, 1), r = rng(3);
    /* sun through the glass: three long shafts and dust turning in them */
    const sa = (1 - rain * 0.8) * day * 0.1;
    [90, 290, 480].forEach((x, i) => shaft(g, x + Math.sin(tsec * 0.05 + i) * 6, 66, 40, 340, 0.3, '255,236,170', sa));
    if (sa > 0.01) for (let i = 0; i < 26; i++) { const x = (i * 97 + tsec * 5) % W, y = 80 + (i * 53 + Math.sin(tsec * 0.4 + i) * 12) % 300; g.fillStyle = 'rgba(255,248,210,' + (0.25 + 0.3 * Math.sin(tsec + i)).toFixed(2) + ')'; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
    /* drops running down the glass */
    for (let i = 0; i < 14; i++) {
      const x = (i * 53 + 20) % W, ph = (tsec * (0.04 + (i % 5) * 0.012) + i * 0.17) % 1, y = 70 + ph * 300;
      rect(g, x, y, 1, 14 * ph, 'rgba(235,250,255,0.16)'); rect(g, x - 1, y + 14 * ph, 3, 3, 'rgba(240,252,255,0.55)'); rect(g, x, y + 14 * ph, 1, 1, '#ffffff');
    }
    if (rain > 0.05) for (let i = 0; i < Math.round(60 * rain); i++) { const x = (i * 71 + tsec * 60) % W, y = (i * 131 + tsec * 520) % 280; rect(g, x, y, 1, 5, 'rgba(210,230,250,0.45)'); }
    /* hanging baskets that sway, ivy trailing from them */
    [150, 340, 520].forEach((x, i) => {
      const sw = Math.sin(tsec * 0.8 + i * 1.7) * 3 * (0.4 + K.wind), by = 138;
      line(g, x - 9, 136, x - 9 + sw, by, L('#c8c0a8')); line(g, x + 9, 136, x + 9 + sw, by, L('#c8c0a8'));
      rect(g, x - 12 + sw, by, 24, 7, L('#8a5a30')); rect(g, x - 12 + sw, by, 24, 2, L('#b07a44'));
      for (let k = -10; k <= 10; k += 4) { disc(g, x + k + sw, by - 1, 3, L('#4a9a4a')); }
      for (let k = 0; k < 4; k++) { const vx = x - 10 + k * 7 + sw; for (let y = 0; y < 18 + k * 5; y += 2) { const dx = Math.sin(tsec * 1.1 + y * 0.2 + k) * 1.5; rect(g, vx + dx, by + 7 + y, 2, 2, L(y % 6 ? '#3a8a40' : '#58b058')); } rect(g, x - 4 + k * 3 + sw, by - 6, 2, 2, L(['#ff8aa8', '#ffe060', '#ffffff', '#ffa060'][k])); }
    });
    if (K.drip) drawDrip(g, K);
    void r;
  },

  front(g, K) {
    const { tsec, light } = K;
    /* the misters: every few seconds a nozzle breathes a fog that falls and spreads */
    [110, 300, 480, 640].forEach((x, i) => {
      const cyc = (tsec * 0.25 + i * 0.37) % 1; if (cyc > 0.45) return;
      const k = cyc / 0.45;
      for (let n = 0; n < 16; n++) {
        const a = Math.sin(n * 12.9 + i) * 0.5, fx = x + a * (10 + k * 46) + Math.sin(tsec * 2 + n) * 2, fy = 140 + k * 70 + n * 3 + Math.cos(n * 7.3) * 8;
        g.fillStyle = 'rgba(235,248,255,' + (0.20 * (1 - k)).toFixed(3) + ')'; g.fillRect(Math.round(fx - 3), Math.round(fy), 7, 4); g.fillRect(Math.round(fx - 1), Math.round(fy - 2), 3, 8);
      }
    });
    /* steam low on the floor */
    for (let i = 0; i < 9; i++) {
      const x = (i * 91 + Math.sin(tsec * 0.2 + i) * 18 + tsec * 4) % (W + 60) - 30, y = H - 56 - Math.abs(Math.sin(tsec * 0.3 + i * 2)) * 24;
      g.fillStyle = 'rgba(255,244,226,0.05)'; g.fillRect(Math.round(x - 40), Math.round(y), 90, 10); g.fillRect(Math.round(x - 24), Math.round(y - 5), 56, 6);
    }
    g.fillStyle = 'rgba(255,214,150,' + (0.05 + 0.04 * light).toFixed(3) + ')'; g.fillRect(0, 60, W, H - 100);          /* the warm, wet air */
  },

  lights(g, K) {
    const { light, tsec } = K, dark = clamp(1 - light * 1.7, 0, 1);
    [[262, 108], [446, 108]].forEach(([x, y], i) => {
      rect(g, x - 1, 60, 2, y - 62, '#c8c0a8'); rect(g, x - 6, y - 2, 12, 5, '#d8d0b8'); disc(g, x, y + 6, 5, dark > 0.1 ? '#fff4c0' : '#d8d0b8');
      if (dark > 0.05) glow(g, x, y + 8, 90, '255,214,130', 0.5 * dark * (0.94 + 0.06 * Math.sin(tsec * 5 + i)));
    });
    for (let sw = 0; sw < 3; sw++) for (let k = 1; k < 10; k++) {                       /* the string lights */
      const t = k / 10, x = sw * 233 + t * 233, y = 21 + Math.sin(t * Math.PI) * 26, tw = 0.75 + 0.25 * Math.sin(tsec * 2.1 + k * 1.9 + sw * 4);
      glow(g, x, y, 12, '255,226,150', (0.15 + 0.6 * dark) * tw); if (dark > 0.2) rect(g, x - 1, y, 3, 3, 'rgba(255,244,200,' + (0.9 * tw).toFixed(2) + ')');
    }
    if (light > 0.5) glow(g, 100, 20, 120, '255,244,200', 0.28 * (light - 0.5) * 2 * (1 - K.rain * 0.7));
  }
};
