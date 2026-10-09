/* GARDEN — the CELLAR: blue-grey brick under three arched niches (barrels on the left, a wine rack and the hanging bulb in the middle, crates and jars on the right), cobwebs in
   the corners, and no sun at all. The light is a bulb that swings on its cord and flickers now and then, a cone of dusty yellow falling from it, and a grow-lamp over every plant that
   throws a pool of the colour of that plant. Water drips from a pipe into a puddle that rings, a spider comes down its thread, a rat runs along the foot of the wall, and at the
   bottom two mushrooms glow. Always dark: the clock does not reach down here. */
import { W, H, TAU, rect, disc, oval, line, rng, sprite, glow, clamp, shaft } from './stage_kit.js';
import { drawRack, ROWS } from './stage_rack.js';

const ARCH = [[70, 140], [280, 140], [490, 140]];            /* the niches: left x, width */
const BULB = { x: 352, y: 62 };
const archY = (nx, w, x) => { const t = (x - nx - w / 2) / (w / 2); return 56 - Math.sqrt(Math.max(0, 1 - t * t)) * 46; };       /* the top of an arch at x */

export const cellar = {
  id: 'cellar', still: true, sky: false, air: false, rain: 0, wind: 0, floor: 410, tint: 'rgba(90,60,150,0.5)',
  gk: () => 0.78,
  dark: () => 0.16,

  back(g, K) {
    const { L } = K, r = rng(13);
    /* the brick: stretcher courses of two shades, mortar between, a heavier course at the top */
    rect(g, 0, 0, W, H, L('#2c3244'));
    for (let row = 0, y = 0; y < H; row++, y += 14) for (let x = -(row & 1) * 15; x < W; x += 30) {
      rect(g, x, y, 29, 13, L(r() < 0.5 ? '#3a4258' : r() < 0.5 ? '#343c52' : '#424a62')); rect(g, x, y, 29, 1, L('#505874')); rect(g, x, y + 12, 29, 1, L('#222838'));
      if (r() < 0.12) rect(g, x + 3 + Math.floor(r() * 18), y + 3 + Math.floor(r() * 6), 4, 2, L('#262c3c'));
    }
    rect(g, 0, 150, W, 5, L('#505874')); rect(g, 0, 155, W, 3, 'rgba(0,0,0,0.4)');          /* the ledge the niches stand on */
    /* the niches: dark inside, an arch of cut stones round them */
    ARCH.forEach(([nx, w], k) => {
      for (let x = nx; x < nx + w; x++) { const top = archY(nx, w, x); rect(g, x, top, 1, 150 - top, L(k === 1 ? '#1c1810' : '#14161e')); }
      for (let x = nx - 7; x < nx + w + 7; x += 2) { const t = archY(nx - 7, w + 14, x); rect(g, x, t - 1, 2, 7, L('#58607c')); if ((x >> 1) % 4 === 0) rect(g, x, t - 1, 2, 7, L('#2a3042')); }
      rect(g, nx - 7, 56, 7, 96, L('#58607c')); rect(g, nx + w, 56, 7, 96, L('#58607c'));
    });
    /* left: barrels with their hoops */
    [[100, 128, 20], [150, 130, 22], [186, 132, 17]].forEach(([x, y, rad]) => { oval(g, x, y - 12, rad, rad - 2, L('#7a4a2a')); oval(g, x - 4, y - 15, rad - 8, rad - 10, L('#9a6238')); rect(g, x - rad, y - 15, rad * 2, 2, L('#3a2418')); rect(g, x - rad, y - 6, rad * 2, 2, L('#3a2418')); });
    /* middle: a wine rack, with a bottle in every hole, and a crate on the ledge */
    rect(g, 292, 70, 118, 70, L('#5a3a22')); rect(g, 292, 70, 118, 3, L('#8a5a34'));
    for (let c = 0; c < 9; c++) for (let q = 0; q < 4; q++) { const x = 296 + c * 13, y = 76 + q * 16; rect(g, x, y, 11, 13, L('#2a1a0e')); rect(g, x + 2, y + 2, 7, 9, L(['#3a7a4a', '#2a5a3a', '#7a2a3a', '#4a8a5a'][(c + q * 2) % 4])); rect(g, x + 3, y + 3, 2, 3, 'rgba(255,255,255,0.25)'); }
    /* right: two crates and a shelf of jars */
    rect(g, 506, 92, 44, 38, L('#6a4a2a')); rect(g, 506, 92, 44, 3, L('#8a6a3a')); rect(g, 506, 108, 44, 2, L('#3a2814')); rect(g, 512, 78, 30, 16, L('#7a5a34')); rect(g, 512, 78, 30, 2, L('#9a7a44'));
    rect(g, 556, 112, 66, 4, L('#5a3a22'));
    [[562, '#4a8a5a'], [578, '#7a9a4a'], [594, '#a86a3a'], [610, '#4a8a5a']].forEach(([x, c], i) => { rect(g, x, 94 + (i & 1) * 4, 11, 18 - (i & 1) * 4, L(c)); rect(g, x + 2, 90 + (i & 1) * 4, 7, 4, L('#c8c0a0')); rect(g, x + 2, 96 + (i & 1) * 4, 2, 8, 'rgba(255,255,255,0.22)'); });
    /* the pipe along the ceiling that drips, and the water-stained wall under it */
    rect(g, 420, 0, 280, 6, L('#4a4e5a')); rect(g, 420, 0, 280, 2, L('#6a6e7a')); rect(g, 466, 6, 8, 5, L('#4a4e5a'));
    for (let y = 12; y < 150; y += 3) rect(g, 468 + Math.round(Math.sin(y * 0.4)), y, 2, 2, 'rgba(60,90,130,0.25)');
    /* the cobwebs in the corners */
    for (let k = 0; k < 6; k++) { line(g, 0, 0, 60 + k * 6, k * 22, 'rgba(200,210,230,0.22)'); line(g, W, 0, W - 60 - k * 6, k * 22, 'rgba(200,210,230,0.22)'); }
    for (let k = 1; k < 5; k++) for (let a = 0; a < 5; a++) { const a0 = a * 0.32, a1 = (a + 1) * 0.32; line(g, k * 14 * Math.cos(a0), k * 14 * Math.sin(a0), k * 14 * Math.cos(a1), k * 14 * Math.sin(a1), 'rgba(200,210,230,0.22)'); line(g, W - k * 14 * Math.cos(a0), k * 14 * Math.sin(a0), W - k * 14 * Math.cos(a1), k * 14 * Math.sin(a1), 'rgba(200,210,230,0.22)'); }
    /* the edge of the machine: a purple wash down the left */
    for (let x = 0; x < 60; x += 2) rect(g, x, 0, 2, H, 'rgba(120,40,170,' + (0.2 * (1 - x / 60)).toFixed(3) + ')');
    /* the floor, with the puddle */
    rect(g, 0, H - 40, W, 40, L('#262c3a')); rect(g, 0, H - 40, W, 3, L('#3a4258'));
    for (let x = 0; x < W; x += 56) { rect(g, x, H - 40, 1, 40, L('#161a24')); }
    oval(g, 500, H - 20, 46, 6, 'rgba(60,110,170,0.55)'); oval(g, 500, H - 21, 40, 4, 'rgba(110,170,230,0.45)');
    drawRack(g, L, 'cellar');
    /* the grow-lamps under the middle and top boards: one over every pot below */
    [ROWS[0], ROWS[1]].forEach(y => { for (let c = 0; c < 4; c++) { const cx = 40 + c * 184 + 33; rect(g, cx - 20, y + 18, 40, 7, L('#1a1c24')); rect(g, cx - 18, y + 24, 36, 2, '#c8c0d8'); } });
    /* the bulb's cord and its holder */
    rect(g, BULB.x, 0, 1, BULB.y - 2, L('#14141c'));
  },

  live(g, K) {
    const { tsec, L } = K;
    /* the drip: a bead grows on the pipe, falls, and the puddle rings */
    const dc = (tsec * 0.45) % 1;
    if (dc < 0.82) rect(g, 468, 11 + dc * dc * 0, 3, 3 + dc * 5, 'rgba(150,190,240,0.9)');
    else { const f = (dc - 0.82) / 0.18, y = 14 + f * f * (H - 40 - 14 + 6); rect(g, 469, y, 2, 4, '#a8d0ff'); }
    for (let k = 0; k < 3; k++) { const ph = ((tsec * 0.45 - 0.99 + k * 0.33) % 1 + 1) % 1; if (ph < 0.45) { const w = 4 + ph * 70; rect(g, 500 - w, H - 21, w * 2, 1, 'rgba(190,225,255,' + (0.7 * (1 - ph / 0.45)).toFixed(2) + ')'); } }
    /* the spider on its thread, going down and up the left niche */
    const sp = (Math.sin(tsec * 0.22) * 0.5 + 0.5), sy = 20 + sp * 70;
    rect(g, 224, 6, 1, sy - 6, 'rgba(210,220,240,0.35)'); rect(g, 222, sy, 4, 3, 'rgb(18,18,24)'); rect(g, 220 + Math.round(Math.sin(tsec * 3)), sy - 1, 1, 1, 'rgb(18,18,24)'); rect(g, 226, sy + 3, 1, 2, 'rgb(18,18,24)'); rect(g, 221, sy + 3, 1, 2, 'rgb(18,18,24)');
    /* a rat that runs along the wall's foot now and then, nose first */
    const rc = (tsec / 41) % 1;
    if (rc < 0.2) {
      const f = rc / 0.2, x = W + 20 - f * (W + 60), y = H - 34 + Math.sin(f * 30) * 0.8;
      rect(g, x, y - 5, 12, 5, L('#4a4044')); rect(g, x - 3, y - 4, 4, 3, L('#5a4e52')); rect(g, x - 4, y - 3, 1, 1, '#ffb0b0'); rect(g, x + 12, y - 3, 8 + Math.round(Math.sin(f * 20) * 2), 1, L('#6a5a5e'));
      rect(g, x + 2 + (Math.floor(f * 40) % 2) * 3, y, 2, 2, L('#2a2024')); rect(g, x + 7 - (Math.floor(f * 40) % 2) * 3, y, 2, 2, L('#2a2024'));
    }
    if (K.drip) {}
  },

  front(g, K) {
    const { tsec } = K;
    /* a low fog crawling over the floor, and dust turning in the bulb's cone */
    for (let i = 0; i < 8; i++) { const x = ((i * 110 + tsec * 6) % (W + 160)) - 80, y = H - 52 - Math.abs(Math.sin(tsec * 0.2 + i)) * 12; g.fillStyle = 'rgba(120,140,190,0.07)'; g.fillRect(Math.round(x), Math.round(y), 150, 12); g.fillRect(Math.round(x + 30), Math.round(y - 6), 90, 7); }
    const sw = Math.sin(tsec * 0.9) * 3;
    for (let i = 0; i < 28; i++) { const ph = tsec * 0.25 + i * 0.7, f = (i * 0.173) % 1, y = 76 + f * 220, spread = 20 + f * 120, x = BULB.x + sw + Math.sin(ph) * spread * ((i % 5) / 4 - 0.4) * 1.6; g.fillStyle = 'rgba(255,238,180,' + (0.3 + 0.3 * Math.sin(tsec * 1.3 + i)).toFixed(2) + ')'; g.fillRect(Math.round(x), Math.round(y + Math.sin(ph * 1.4) * 5), 1, 1); }
  },

  lights(g, K) {
    const { tsec, V } = K, sw = Math.sin(tsec * 0.9) * 3;
    /* the bulb: swinging, flickering a little and now and then a lot */
    const slow = Math.sin(tsec * 40) * 0.03, bad = ((tsec % 17) > 15.2 && Math.sin(tsec * 55) > 0.2) ? 0.35 : 1, fl = (0.9 + 0.1 * Math.sin(tsec * 9) + slow) * bad;
    const bx = BULB.x + sw * 0.9, by = BULB.y + 8;
    rect(g, bx - 2, by - 8, 5, 6, '#2a2a34'); disc(g, bx, by + 2, 5, bad < 1 ? '#ffd890' : '#fff0b8'); rect(g, bx - 1, by, 2, 3, '#ffffff');
    glow(g, bx, by + 4, 110, '255,214,120', 0.75 * fl);
    for (let i = 0; i < 70; i += 2) { const f = i / 70, w = 6 + f * 150; g.fillStyle = 'rgba(255,224,140,' + (0.075 * (1 - f) * fl).toFixed(3) + ')'; g.fillRect(Math.round(bx - w / 2), Math.round(by + 8 + i * 3.1), Math.round(w), 6); }
    /* a pool of the plant's own colour under each lamp, over its pot */
    const room = V.st.rooms[V.st.active];
    [ROWS[0], ROWS[1]].forEach((y, row) => { for (let c = 0; c < 4; c++) {
      const p = room.pots[(row + 1) * 4 + c], cx = 40 + c * 184 + 33, sp = p && V.w.species(p.sp), hue = sp ? sp.hue[0] : '#c8c0d8', n = parseInt(hue.slice(1), 16), rgb = ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
      const a = p ? 0.5 : 0.12;
      for (let i = 0; i < 44; i += 2) { const f = i / 44, w = 34 + f * 46; g.fillStyle = 'rgba(' + rgb + ',' + (0.07 * (1 - f) * a * 2).toFixed(3) + ')'; g.fillRect(Math.round(cx - w / 2), y + 25 + i, Math.round(w), 2); }
      glow(g, cx, y + 60, 40, rgb, a * 0.8);
    } });
    /* the two mushrooms at the foot of the wall, and the glow on the floor round them */
    [[100, '120,230,230', '#78e6e6', '#38a8b0'], [610, '140,240,120', '#8cf078', '#48a84c']].forEach(([x, rgb, cap, dark], i) => {
      const pulse = 0.75 + 0.25 * Math.sin(tsec * 1.6 + i * 2);
      glow(g, x, H - 18, 62, rgb, 0.55 * pulse);
      oval(g, x, H - 21, 17, 5, cap); oval(g, x, H - 19, 15, 3, dark); rect(g, x - 3, H - 18, 6, 6, dark); oval(g, x - 22, H - 15, 7, 3, cap); oval(g, x + 21, H - 14, 6, 3, cap);
      for (let k = 0; k < 5; k++) { const ph = (tsec * 0.3 + k * 0.2 + i * 0.5) % 1; g.globalAlpha = Math.sin(ph * Math.PI) * 0.8; rect(g, x - 14 + k * 7 + Math.sin(ph * 5 + k) * 3, H - 24 - ph * 36, 2, 2, cap); }
      g.globalAlpha = 1;
    });
    void shaft; void TAU; void clamp; void sprite;
  }
};
