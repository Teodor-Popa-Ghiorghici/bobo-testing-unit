/* GARDEN — the YARD: a lawn behind a white picket fence, a potting shed on the right with its window, big trees at the corners, a birdhouse hanging from one of them, the sky
   going over behind with the sun and moon crossing it, and the year going round (the real calendar: green leaves in summer, blossom in spring, orange ones falling in autumn,
   bare branches and snow in winter). Weather comes through it (rain, puddles that ring) and at night there are fireflies, the shed's window lit and crickets that you can hear.
   The sky and what moves in it are drawn first (under); the trees, fence, shed and lawn are painted once for the light and the season (back); the rest moves. */
import { gardenSky } from './art.js';
import { W, H, TAU, rect, disc, oval, line, rng, mix, sprite, glow, shaft, clamp, skyBodies, dayTurn } from './stage_kit.js';
import { drawRack, drawDrip } from './stage_rack.js';
import { SEASONS, canopy, bare, shed, birdhouse, fence, lawn, seasonFall } from './yard_art.js';

export const yard = {
  id: 'yard', sky: true, rain: 1, wind: 1, floor: 380, tint: 'rgba(120,200,110,0.5)',
  gk: light => 0.35 + light * 0.65,
  dark: light => (0.34 - light) / 0.34 * 0.45,

  under(g, K) {
    const { tsec, light, season, rain } = K, day = clamp((light - 0.3) / 0.4, 0, 1), P = SEASONS[season];
    g.drawImage(gardenSky(W, H, light, false), 0, 0);
    if (P.skyTint) { g.fillStyle = P.skyTint; g.fillRect(0, 0, W, 130); }
    skyBodies(g, K, 104, 42, 300);
    /* the far hills, a thin blue line over the fence */
    g.fillStyle = K.L(mix(P.hill, '#8a9ab8', 0.5)); for (let x = 0; x < W; x += 2) { const y = 100 + Math.round(Math.sin(x * 0.012) * 4 + Math.sin(x * 0.04) * 2); g.fillRect(x, y, 2, 14); }
    /* clouds: flat-bottomed puffs that go over at their own speeds */
    [[1, 84, 5, 28], [2, 120, 3.2, 52], [3, 68, 7, 12], [4, 96, 4, 68]].forEach(([seed, w, sp, y], i) => {
      const x = ((tsec * sp + i * 197) % (W + w + 40)) - w - 20;
      g.globalAlpha = (0.2 + 0.75 * day) * (1 - rain * 0.2);
      g.drawImage(sprite('ycloud:' + seed, w + 8, 26, sg => { const r = rng(seed); for (let k = 0; k < w / 6; k++) disc(sg, 8 + k * 6, 14 - Math.floor(Math.sin(k / (w / 6) * Math.PI) * 6 * r()), 5 + Math.floor(r() * 4), '#f4f2f8'); rect(sg, 0, 15, w + 8, 4, '#d6d2e0'); rect(sg, 0, 19, w + 8, 8, 'rgba(0,0,0,0)'); }), Math.round(x), y);
      if (rain > 0.1) { g.globalAlpha = 0.55 * rain; g.fillStyle = '#4a5568'; g.fillRect(Math.round(x) + 6, y + 14, w - 4, 6); }
    });
    g.globalAlpha = 1;
    /* a V of birds by day, now and then */
    const bt = (tsec * 0.014) % 1;
    if (day > 0.3 && bt < 0.3 && season !== 'winter') {
      const bx = -40 + bt / 0.3 * (W + 80);
      for (let i = 0; i < 5; i++) { const x = bx - Math.abs(i - 2) * 11, y = 34 + Math.abs(i - 2) * 6 + Math.sin(tsec * 2 + i) * 2, up = Math.sin(tsec * 9 + i) > 0; rect(g, x, y, 3, 1, 'rgb(40,44,56)'); rect(g, x - 2, y + (up ? -2 : 1), 2, 1, 'rgb(40,44,56)'); rect(g, x + 3, y + (up ? -2 : 1), 2, 1, 'rgb(40,44,56)'); }
    }
  },

  back(g, K) {
    const { L, season } = K, P = SEASONS[season];
    lawn(g, L, P, season);
    fence(g, L, P, season);
    shed(g, L, P, season, K);
    if (season === 'winter') { bare(g, L, 70, 0, 1.2); bare(g, L, 640, 0, 0.9); } else { canopy(g, L, P, 'left'); canopy(g, L, P, 'right'); }
    if (!K.wall) drawRack(g, L, 'yard');                       /* no rack in the wallpaper: there are no pots to stand on it */
    /* stepping stones across the foot of the lawn, with a ring of wet round the ones in a puddle */
    for (let i = 0; i < 6; i++) { const x = 110 + i * 100 + (i % 2) * 6, y = H - 22 + (i % 2) * 3; oval(g, x, y, 24, 5, L(season === 'winter' ? '#9aa4b8' : '#6f7a82')); oval(g, x, y - 1, 21, 4, L(season === 'winter' ? '#b8c2d4' : '#8a96a0')); }
  },

  live(g, K) {
    const { tsec, season, night, light } = K, P = SEASONS[season];
    birdhouse(g, K, tsec);                                       /* hangs from the tree, swings, a bird visits */
    /* sun through the leaves on the lawn by day */
    if (!night && !K.rain && season !== 'winter') {
      const a = clamp((light - 0.5) * 0.14, 0, 0.08);
      [90, 270, 480].forEach((x, i) => shaft(g, x + Math.sin(tsec * 0.1 + i) * 8, 110, 30, 280, 0.28, '255,240,170', a));
    }
    if (K.drip) drawDrip(g, K);
    void P;
  },

  front(g, K) {
    const { tsec, season, night, rain, wind } = K, r = rng(21), P = SEASONS[season];
    /* grass blades that lean with the wind, flowers that nod (not under snow) */
    if (season !== 'winter') {
      for (let x = 2; x < W; x += 6) {
        const sw = Math.round(Math.sin(tsec * (1.3 + wind) + x * 0.07) * (1.5 + wind * 2)), h = 6 + Math.floor(r() * 7);
        rect(g, x + sw, H - 40 - h + 8, 2, h, K.L(r() < 0.5 ? P.blade[0] : P.blade[1])); rect(g, x + sw * 2, H - 40 - h + 5, 2, 3, K.L(P.blade[2]));
      }
      for (let i = 0; i < (K.wall ? 0 : 14); i++) {                                       /* the nodding flowers are not in the wallpaper: it is the room, with nothing growing in it */
        const x = 12 + i * 49 + Math.floor(r() * 18), sw = Math.round(Math.sin(tsec * 1.1 + i) * 2), c = P.flowers[i % P.flowers.length];
        rect(g, x + (sw >> 1), H - 26, 1, 12, K.L('#3e5828')); rect(g, x - 1 + sw, H - 31, 4, 4, K.L(c)); rect(g, x + sw, H - 30, 2, 2, K.L('#ffe060'));
      }
    } else {
      for (let i = 0; i < 40; i++) { const x = (i * 71) % W, y = 170 + (i * 53) % 230, a = 0.5 + 0.5 * Math.sin(tsec * 3 + i * 1.7); if (a > 0.85) { rect(g, x, y, 1, 1, '#ffffff'); rect(g, x - 1, y, 3, 1, 'rgba(255,255,255,0.5)'); rect(g, x, y - 1, 1, 3, 'rgba(255,255,255,0.5)'); } }
    }
    seasonFall(g, K, season);                                    /* butterflies, petals, leaves or snow, by the season */
    if (night) {                                                 /* crickets' glow? no: moths round the shed's light */
      for (let i = 0; i < 4; i++) { const a = tsec * 2.2 + i * 1.6, x = 624 + Math.cos(a) * (10 + i * 3), y = 112 + Math.sin(a * 1.3) * (8 + i * 2); rect(g, x, y, 2, 1, 'rgba(255,240,200,0.9)'); rect(g, x, y - 1, 1, 1, 'rgba(255,240,200,0.6)'); }
    }
    void rain;
  },

  lights(g, K) {
    const { light, tsec, season } = K, dark = clamp(1 - light * 1.6, 0, 1);
    if (dark > 0.05) {
      glow(g, 595, 106, 46, '255,214,120', 0.7 * dark * (0.94 + 0.06 * Math.sin(tsec * 7)));            /* the shed's window */
      glow(g, 128, 96, 18, '255,200,100', 0.28 * dark);
      if (season !== 'winter') for (let i = 0; i < 14; i++) {                                            /* fireflies, low over the lawn */
        const ph = tsec * 0.35 + i * 0.77, x = (i * 53 + Math.sin(ph) * 40 + 30) % (W - 40) + 20, y = 200 + (i * 37) % 170 + Math.sin(ph * 1.7) * 14, a = clamp(Math.sin(ph * 2.6 + i) * 1.4, 0, 1) * dark;
        if (a > 0.05) { glow(g, x, y, 10, '190,255,110', a * 0.7); rect(g, x, y, 2, 2, 'rgba(230,255,170,' + a.toFixed(2) + ')'); }
      }
    }
    if (light > 0.5 && !K.rain) glow(g, 350, 60, 150, season === 'autumn' ? '255,200,120' : '255,244,200', 0.16 * (light - 0.5) * 2);
  }
};
