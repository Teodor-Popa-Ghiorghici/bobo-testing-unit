import { createWindow, raise, sysDialog } from '../../kernel/wm.js';
import { Snd } from '../../kernel/snd.js';
import { Cos } from '../../kernel/cos.js';
import { fs as vfs } from '../../kernel/vfs.js';
import { ELE_HELLO, ELE_QUOTES, ELE_PLACES, ELE_HZ, ELE_SONGS } from './quotes.js';
import { phosLevel, CRT, Vol, musGain } from '../../kernel/hardware.js';
import { VGA16 } from '../../kernel/god.js';

export default {
  open() {
  createWindow({
    kind: 'app', title: 'Elephant', w: 748, h: 546,
    build: body => {
      const wrap = document.createElement('div');
      wrap.className = 'gamepane';
      const cv = document.createElement('canvas');
      cv.width = 480; cv.height = 300;
      cv.className = 'gamecv elecv';
      cv.tabIndex = 0;
      wrap.appendChild(cv);

      const bar = document.createElement('div');
      bar.className = 'appbar';
      const bTalk  = document.createElement('button'); bTalk.className  = 'appbtn'; bTalk.textContent  = 'TALK';
      const bPlace = document.createElement('button'); bPlace.className = 'appbtn'; bPlace.textContent = 'PLACE';
      const info   = document.createElement('span');   info.className   = 'godword';
      bar.appendChild(bTalk); bar.appendChild(bPlace); bar.appendChild(info);
      body.appendChild(wrap); body.appendChild(bar);

      const g = cv.getContext('2d');
      if (!g) { info.textContent = 'NO CANVAS.'; return; }

      /* ---- 31.4 the sixteen, and the only three shapes anything is made of */
      const C = i => { const p = VGA16[i]; return 'rgb(' + p[0] + ',' + p[1] + ',' + p[2] + ')'; };
      const R = (x, y, w, h, c) => {
        if (w <= 0 || h <= 0) return;
        g.fillStyle = C(c);
        g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
      };
      /* A block with its corners knocked off. Two overlapping rectangles is
         as round as a machine with no anti-aliasing is allowed to get, and
         every curved thing on this canvas — him, the clouds, the bubble, the
         sun — is one of these. */
      const B = (x, y, w, h, c, k) => {
        k = Math.min(k, Math.floor(w / 2), Math.floor(h / 2));
        R(x + k, y, w - 2 * k, h, c);
        R(x, y + k, w, h - 2 * k, c);
      };
      /* An ellipse built out of horizontal runs, with a hard black edge and a
         lit upper left. Two overlapping rectangles will fake a rounded corner
         but they collapse into a plus sign the moment the radius approaches
         half the shape, which is exactly the case for every round part of an
         elephant — so those get built properly, one row at a time.

         The edge and the light are not decoration: at this size two greys
         meeting with neither of them stop being two shapes and turn into one
         smudge. lit and shade may both be left out for a flat piece. */
      function limb(cx, cy, rx, ry, c, lit, shade) {
        for (let y = -ry; y <= ry; y++) {
          const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
          if (w <= 0) continue;
          R(cx - w - 1, cy + y, w * 2 + 3, 1, 0);
          R(cx - w, cy + y, w * 2 + 1, 1, c);
          if (lit != null && y < -ry * 0.3) {
            R(cx - w + 1, cy + y, Math.max(2, Math.round(w * (0.35 + 0.5 * (-y / ry)))), 1, lit);
          }
          if (shade != null && y > ry * 0.34) {
            const o = Math.round(w * 0.5);
            R(cx - w + o, cy + y, w * 2 + 1 - o, 1, shade);
          }
        }
      }

      /* Every fade in this app is an ordered dither. An alpha wash would mix
         two palette colours into a third that is not in the sixteen, and then
         the whole rule is gone. */
      const DIT = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
      const patCache = {};
      function pat(c, s) {
        const k = c + ':' + s;
        if (patCache[k]) return patCache[k];
        const p = document.createElement('canvas'); p.width = 4; p.height = 4;
        const q = p.getContext('2d'); q.fillStyle = C(c);
        for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (DIT[j][i] < s) q.fillRect(i, j, 1, 1);
        patCache[k] = g.createPattern(p, 'repeat');
        return patCache[k];
      }
      /* An ellipse out of horizontal runs. Whole pixels, hard edge, no curve
         primitive anywhere near it — the same way the boot logo is built, and
         the only round thing on this canvas that isn't made of these is the
         speech bubble, which is a box. */
      function oval(cx, cy, rx, ry, c) {
        for (let y = -ry; y <= ry; y++) {
          const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
          if (w > 0) R(cx - w, cy + y, w * 2 + 1, 1, c);
        }
      }
      const disc = (cx, cy, r, c) => oval(cx, cy, r, r, c);

      /* the same dither, poured into an ellipse rather than a box, because a
         square halo around a round sun is a square halo around a round sun */
      function washOval(cx, cy, rx, ry, c, s) {
        const n = Math.max(0, Math.min(16, Math.round(s)));
        if (n <= 0) return;
        g.fillStyle = pat(c, n);
        for (let y = -ry; y <= ry; y++) {
          const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
          if (w > 0) g.fillRect(cx - w, cy + y, w * 2 + 1, 1);
        }
      }

      const wash = (x, y, w, h, c, s) => {
        const n = Math.max(0, Math.min(16, Math.round(s)));
        if (n <= 0 || w <= 0 || h <= 0) return;
        g.fillStyle = pat(c, n);
        g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
      };

      /* A gradient, the only way a machine with sixteen colours has ever been
         able to draw one: the same colour laid down again and again, a little
         denser each band, over however many steps the sky is tall. */
      function ramp(y0, y1, c, from, to, steps) {
        const h = (y1 - y0) / steps;
        for (let i = 0; i < steps; i++) {
          wash(0, y0 + i * h, 480, Math.ceil(h) + 1, c, from + (to - from) * (i / (steps - 1)));
        }
      }

      /* ---- 31.5 the air --------------------------------------------------
         The same twenty-two specks in every place, re-coloured: pollen over
         the field, spray off the water, snow off the peaks, light coming up
         off the temple steps. Twenty-two is enough to make air look like it
         is moving and few enough to cost nothing. */
      const motes = [];
      for (let i = 0; i < 22; i++) {
        motes.push({ x: Math.random() * 480, y: Math.random() * 300,
                     s: 5 + Math.random() * 11, w: Math.random() * 6.28, big: Math.random() < 0.3 });
      }
      function stepMotes(dt) {
        motes.forEach(m => {
          m.y -= m.s * dt;
          m.x += Math.sin(m.w) * 0.35;
          m.w += dt * 0.7;
          if (m.y < -4) { m.y = 304; m.x = Math.random() * 480; }
          if (m.x < -4) m.x = 484; else if (m.x > 484) m.x = -4;
        });
      }
      function drawMotes(c) {
        motes.forEach(m => R(m.x, m.y, m.big ? 2 : 1, m.big ? 2 : 1, c));
      }

      /* ---- 31.6 the five places ------------------------------------------
         All of them share a horizon around y=200 and floor at y=272, so he
         stands in the same spot however the world behind him changes. */

      /* THE SUNFLOWER FIELD. Three ranks of heads on three different clocks,
         so the field never lines up into a pattern you can see. */
      function sunRow(t, base, size, gap, phase, amp) {
        const off = (phase * 17) % gap;
        for (let x = -gap; x < 500 + gap; x += gap) {
          const i = Math.round(x / gap);
          const sw = Math.round(Math.sin(t * 0.55 + i * 0.9 + phase) * amp);
          const bx = x + off;
          const hy = base - size * 3;
          /* the stalk leans further the higher up it gets, so the head is
             carrying the lean rather than the whole plant sliding sideways */
          for (let s = 0; s <= 6; s++) {
            const k = s / 6;
            R(bx + Math.round(sw * k), base - (base - hy) * k - 4, 3, 9, 2);
          }
          const lf = base - (base - hy) * 0.42;
          R(bx + Math.round(sw * 0.42) - size, lf, size + 3, 3, 10);
          R(bx + Math.round(sw * 0.42) + 2, lf + size / 3, size + 3, 3, 10);
          /* eight petals around a brown middle, and the middle is the thing
             that makes it a sunflower rather than a yellow dot */
          const hx = bx + sw + 1, hh = hy;
          B(hx - size - 1, hh - size - 1, size * 2 + 2, size * 2 + 2, 6, Math.max(2, size >> 1));
          B(hx - size, hh - size, size * 2, size * 2, 14, Math.max(2, size >> 1));
          if (size > 6) {
            R(hx - 1, hh - size - 2, 3, 4, 14); R(hx - 1, hh + size - 2, 3, 4, 14);
            R(hx - size - 2, hh - 1, 4, 3, 14); R(hx + size - 2, hh - 1, 4, 3, 14);
          }
          B(hx - (size >> 1), hh - (size >> 1), size, size, 6, Math.max(1, size >> 2));
          if (size > 6) wash(hx - (size >> 1), hh - (size >> 1), size, size, 0, 5);
        }
      }
      function placeSun(t) {
        R(0, 0, 480, 300, 11);
        ramp(0, 130, 15, 7, 0, 7);
        /* the sun, with a corona that breathes on an eighteen second cycle */
        const halo = 3 + Math.round((Math.sin(t * 0.35) + 1) * 1.5);
        washOval(58, 34, 56, 56, 14, Math.max(1, halo - 3));
        washOval(58, 34, 38, 38, 14, halo);
        disc(58, 34, 25, 14);
        disc(58, 34, 15, 15);
        R(0, 196, 480, 104, 2);                     /* the field floor */
        wash(0, 196, 480, 34, 10, 6);
        wash(0, 262, 480, 38, 8, 3);
        sunRow(t, 212, 5,  30, 0.0, 2);
        sunRow(t, 250, 8,  48, 1.9, 3);
        sunRow(t, 332, 15, 82, 3.7, 5);
      }

      /* THE OASIS. The water is a stack of bright bars sliding past each
         other, which from a distance is exactly what water is. */
      /* A palm is a leaning trunk and six fronds that start out going up and
         end up going down, which is the whole silhouette. Each frond is a run
         of shrinking blocks along an arc, so it tapers to a point on its own. */
      function palm(x, base, t, phase, h) {
        const lean = Math.sin(t * 0.35 + phase) * 5;
        const segs = Math.round(h / 12);
        for (let s = 0; s < segs; s++) {
          const k = s / (segs - 1);
          const sx = Math.round(x + lean * k * k);
          R(sx - 5, base - s * 12 - 12, 10, 13, 6);
          R(sx - 5, base - s * 12 - 12, 3, 13, 14);
          R(sx - 5, base - s * 12 - 3, 10, 2, 8);
        }
        const tx = Math.round(x + lean), ty = base - segs * 12 - 6;
        for (let f = 0; f < 7; f++) {
          const a = -2.7 + f * 0.56;
          const bend = Math.sin(t * 0.45 + phase + f * 0.8) * 0.1;
          for (let s = 1; s < 15; s++) {
            const w = Math.max(2, 9 - s * 0.5);
            const px = tx + Math.round(Math.cos(a + bend) * s * 3.6);
            const py = ty + Math.round(Math.sin(a + bend) * s * 2.4 + s * s * 0.2);
            R(px - w / 2, py, w, 4, f % 2 ? 2 : 10);
          }
        }
        R(tx - 6, ty - 4, 13, 8, 6);
        R(tx - 4, ty - 2, 4, 4, 14);
      }
      function placeOasis(t) {
        R(0, 0, 480, 300, 11);
        ramp(60, 196, 14, 0, 8, 8);
        const halo = 3 + Math.round((Math.sin(t * 0.3) + 1) * 1.5);
        washOval(418, 94, 60, 60, 14, Math.max(1, halo - 3));
        washOval(418, 94, 40, 40, 14, halo);
        disc(418, 94, 28, 14);
        disc(418, 94, 17, 15);
        /* three dune ridges, palest at the back */
        R(0, 150, 480, 40, 14); wash(0, 150, 480, 40, 15, 7);
        B(-40, 138, 260, 60, 14, 26); B(230, 144, 280, 54, 14, 24);
        R(0, 178, 480, 30, 14); wash(0, 178, 480, 30, 6, 4);
        /* the pool, sitting well behind him so his feet are on dry sand */
        oval(240, 214, 156, 27, 3);
        oval(240, 212, 152, 23, 11);
        oval(240, 216, 150, 22, 3);
        /* A ripple is only allowed to be as wide as the water is at that
           height, or it hangs out over the sand. */
        const span = y => Math.round(150 * Math.sqrt(Math.max(0, 1 - Math.pow((y - 216) / 22, 2))));
        for (let i = 0; i < 9; i++) {
          const y = 200 + i * 4;
          const hw = span(y);
          if (hw < 12) continue;
          const w = Math.min(40 + i * 11, hw * 1.5);
          const x = 240 - hw + (Math.sin(t * 0.28 + i * 1.35) * 0.5 + 0.5) * (hw * 2 - w);
          R(x, y, w, 2, 11);
        }
        /* the sun's road across it, the one bright thing that moves fast */
        for (let i = 0; i < 7; i++) {
          const y = 202 + i * 5, hw = span(y);
          if (hw < 12) continue;
          const w = Math.min(16 + i * 3, hw);
          R(Math.min(240 + hw - w, 356 - i * 5) + Math.round(Math.sin(t * 1.1 + i) * 3), y, w, 2, 15);
        }
        palm(52, 240, t, 0, 96);
        palm(438, 236, t, 1.7, 108);
        palm(96, 224, t, 3.4, 74);
        R(0, 238, 480, 62, 14);
        wash(0, 238, 480, 62, 6, 5);
        wash(0, 280, 480, 20, 6, 10);
      }

      /* THE MOUNTAIN FIELD. Peaks are staircases, and the wind is a set of
         bright bands crossing the meadow at slightly different speeds. */
      /* A mountain, one row at a time: black edge, dark rock on the shaded
         face, lighter rock on the lit one, and a snow line that wanders
         instead of running dead level. */
      function peak(cx, base, w, h, seed) {
        for (let y = 0; y < h; y++) {
          const k = y / (h - 1);
          const ww = Math.round(w * k * 0.5) + 3;
          const yy = base - h + y;
          const snow = h * 0.3 + Math.sin(y * 0.7 + seed) * 3 + Math.sin(y * 0.21 + seed) * 5;
          R(cx - ww - 1, yy, ww * 2 + 3, 1, 0);
          if (y < snow) {
            R(cx - ww, yy, ww * 2 + 1, 1, 7);
            R(cx - ww, yy, ww + 1, 1, 15);
          } else {
            R(cx - ww, yy, ww * 2 + 1, 1, 8);
            R(cx - ww, yy, Math.round(ww * 0.9), 1, 7);
            /* streaks of old snow in the gullies below the line */
            if (y < snow + 14 && (y + seed | 0) % 3) R(cx - Math.round(ww * 0.5), yy, Math.round(ww * 0.7), 1, 15);
          }
        }
      }
      function placeFjell(t) {
        R(0, 0, 480, 300, 9);
        ramp(0, 200, 11, 4, 14, 8);
        ramp(96, 200, 15, 0, 8, 6);
        /* slow high cloud, two banks, no hurry at all */
        for (let i = 0; i < 5; i++) {
          const x = ((t * 3 + i * 118) % 620) - 90;
          puff(x, 40 + (i % 3) * 20, 74 + i * 9, 20 + (i % 2) * 7, 15);
        }
        peak(74,  204, 140, 96,  0.0);
        peak(408, 204, 152, 108, 2.3);
        peak(240, 202, 210, 138, 4.1);
        R(0, 196, 480, 22, 2);
        wash(0, 196, 480, 10, 8, 6);
        R(0, 212, 480, 88, 2);
        /* the wind, crossing the meadow. Dithered rather than solid, because
           at full strength it reads as stripes instead of grass moving. */
        for (let y = 216; y < 300; y += 7) {
          const k = (y - 216) / 84;
          const w = 60 + k * 150;
          const x = ((Math.sin(t * 0.42 + y * 0.075) * 0.5 + 0.5) * (480 + w)) - w;
          wash(x, y, w, 3, 10, 8);
          R(x + w * 0.3, y, w * 0.4, 1, 10);
        }
        /* two birds, going somewhere, in no rush about it */
        for (let i = 0; i < 3; i++) {
          const x = ((t * 13 + i * 190) % 560) - 40;
          const y = 66 + i * 19 + Math.round(Math.sin(t * 0.8 + i) * 4);
          const f = Math.floor(t * 3 + i) % 2;
          R(x, y + f, 4, 1, 0); R(x + 4, y, 3, 1, 0); R(x + 7, y + f, 4, 1, 0);
        }
      }

      /* UP IN THE CLOUDS. Three banks at three speeds is the whole trick;
         parallax does the rest and costs nothing. */
      /* One cloud is four ellipses piled up. Four is the fewest that stops
         reading as a bar and starts reading as weather. */
      function puff(cx, cy, w, h, c) {
        oval(cx, cy, w * 0.52, h * 0.5, c);
        oval(cx - w * 0.36, cy + h * 0.2, w * 0.3, h * 0.34, c);
        oval(cx + w * 0.34, cy + h * 0.22, w * 0.28, h * 0.3, c);
        oval(cx + w * 0.08, cy - h * 0.3, w * 0.3, h * 0.42, c);
      }
      function bank(shift, y, scale, c) {
        for (let i = 0; i < 6; i++) {
          const x = (((shift + i * 152) % 700) - 120);
          const w = (86 + (i % 4) * 38) * scale;
          const h = (30 + (i % 3) * 12) * scale;
          puff(x, y + (i % 3) * 9, w, h, c);
          wash(x - w * 0.5, y + (i % 3) * 9 + h * 0.24, w, h * 0.3, 7, 5);
        }
      }
      function placeSky(t) {
        R(0, 0, 480, 300, 9);
        ramp(20, 300, 11, 2, 15, 9);
        ramp(150, 300, 15, 0, 7, 7);
        /* light coming down through it, breathing */
        const ray = 2 + Math.round((Math.sin(t * 0.3) + 1));
        for (let i = 0; i < 4; i++) {
          const x = 28 + i * 122 + Math.round(Math.sin(t * 0.22 + i) * 12);
          /* one continuous lean rather than a staircase of blocks: four pixels
             of drop per one across, laid down four rows at a time */
          for (let yy = 0; yy < 300; yy += 4) wash(x + yy * 0.26, yy, 30 + yy * 0.06, 4, 14, ray);
        }
        bank(t * 5,  56,  0.55, 15);
        bank(t * 9,  126, 0.8,  15);
        bank(t * 15, 238, 1.05, 15);
        /* the one he is standing on */
        B(112, 258, 256, 40, 15, 19);
        B(150, 246, 180, 30, 15, 14);
        wash(112, 280, 256, 20, 7, 6);
      }

      /* THE THIRD TEMPLE. The same stepped temple the machine draws on its
         own boot splash, at twice the size and with the light behind the
         colonnade breathing. He is standing on the steps. */
      function templeAt(ox, oy, s, t) {
        const P = (x, y, w, h, c) => R(ox + x * s, oy + y * s, w * s, h * s, c);
        P(78, 0, 4, 9, 14); P(74, 2, 12, 3, 14);
        P(70, 8, 20, 5, 14); P(60, 13, 40, 5, 14); P(50, 18, 60, 5, 14);
        P(40, 23, 80, 5, 14); P(30, 28, 100, 5, 14);
        P(26, 33, 108, 6, 15); P(26, 39, 108, 2, 8);
        /* the light inside, which is the only thing in the picture that is
           not the same from one second to the next */
        P(56, 41, 48, 43, 3);
        const glow = 8 + Math.round((Math.sin(t * 0.45) + 1) * 4);
        wash(ox + 56 * s, oy + 41 * s, 48 * s, 43 * s, 11, glow);
        P(66, 47, 28, 37, 11);
        [30, 52, 74, 96, 118].forEach(x => {
          P(x, 41, 12, 43, 7); P(x, 41, 3, 43, 15); P(x + 9, 41, 3, 43, 8);
        });
        P(22, 84, 116, 6, 7); P(16, 90, 128, 6, 8);
        P(10, 96, 140, 6, 7); P(4, 102, 152, 6, 8);
      }
      function placeTemple(t) {
        R(0, 0, 480, 300, 1);
        /* six steps rather than two, so the night is a gradient and not a
           pair of hard bands across the sky */
        for (let i = 0; i < 6; i++) wash(0, 0, 480, 190 - i * 30, 0, 2 + i * 2);
        /* stars, each on its own slow blink */
        for (let i = 0; i < 34; i++) {
          const x = (i * 79) % 470 + 4, y = (i * 149) % 130 + 6;
          const b = Math.sin(t * 0.6 + i * 1.7);
          if (b > 0.2) R(x, y, 1, 1, b > 0.75 ? 15 : 7);
        }
        /* the plaza goes down first: the temple's own steps then land on it
           the way steps do, instead of being painted over by the floor */
        R(0, 248, 480, 52, 8);
        wash(0, 248, 480, 52, 7, 5);
        templeAt(32, 2, 2.6, t);
        wash(0, 272, 480, 28, 0, 5);
      }

      const PLACE_FN = { sol: placeSun, oase: placeOasis, fjell: placeFjell, sky: placeSky, tempel: placeTemple };

      /* ---- 31.7 what sits on top of each place ---------------------------
         A different lens over every one, all of them dithers, all of them
         quiet. The heat over the oasis is the only one that moves pixels
         rather than laying colour over them. */
      const shim = document.createElement('canvas');
      shim.width = 480; shim.height = 70;
      const shimG = shim.getContext('2d');
      function heat(t) {
        const y0 = 236;
        shimG.clearRect(0, 0, 480, 70);
        shimG.drawImage(cv, 0, y0, 480, 70, 0, 0, 480, 70);
        for (let r = 0; r < 70; r += 2) {
          const dx = Math.round(Math.sin(t * 1.6 + r * 0.22) * (1 + r / 30));
          g.drawImage(shim, 0, r, 480, 2, dx, y0 + r, 480, 2);
        }
      }
      /* Each place gets its own lens over the top. All of them are dithers,
         all of them are weak, and none of them lie across the middle of the
         picture where he is standing — a wash over him just makes him look
         ill. They live at the edges, where an effect belongs. */
      function overlay(id, t) {
        const b = 1 + Math.round((Math.sin(t * 0.4) + 1) * 0.5);
        if (id === 'sol') {
          wash(0, 0, 480, 76, 14, 2); wash(0, 272, 480, 28, 6, 2);
        }
        if (id === 'oase') {
          heat(t);
          wash(0, 0, 480, 60, 14, 1 + b); wash(0, 276, 480, 24, 6, 3);
        }
        if (id === 'fjell') {
          wash(0, 0, 480, 40, 9, 3); wash(0, 0, 46, 300, 9, 2); wash(434, 0, 46, 300, 9, 2);
        }
        if (id === 'sky') {
          wash(0, 0, 480, 54, 15, b); wash(0, 0, 40, 300, 15, 2); wash(440, 0, 40, 300, 15, 2);
        }
        if (id === 'tempel') {
          wash(0, 0, 480, 70, 14, b); wash(0, 0, 44, 300, 0, 3); wash(436, 0, 44, 300, 0, 3);
        }
      }

      /* ---- 31.8 him ------------------------------------------------------
         He breathes on a nine second cycle, fans his ears on an eleven second
         one and blinks on neither, so the three never fall into step and turn
         into a tic. When he is thinking he curls the end of his trunk up and
         looks past you; when he is talking the tip bobs on the syllables.
         ========================================================================== */
      function drawEle(t, phase) {
        const br   = Math.round(Math.sin(t * 0.7) * 1.6);
        /* the ears do not slide, they fan: what changes is how wide they are,
           which is what an ear actually does when it moves towards you */
        const ear  = Math.round(Math.sin(t * 0.57) * 4);
        const tail = Math.round(Math.sin(t * 1.1) * 3);
        const blink = (t % 5.7) > 5.5;
        const think = phase === 'think';
        const talk  = phase === 'speak';
        const sway  = Math.round(Math.sin(t * 0.62) * 5) +
                      (talk ? Math.round(Math.sin(t * 8.5) * 3) : 0);
        const look  = think ? -3 : 0;

        /* His shadow is black laid down as a dither, because there is no
           colour in the sixteen that is a darker version of grass, or sand,
           or cloud. Two passes: a soft edge and a denser middle. */
        wash(154, 258, 172, 20, 0, 3);
        wash(176, 262, 128, 14, 0, 7);

        /* the tail, and the two legs on the far side */
        for (let s = 0; s < 4; s++) {
          limb(300 + s * 5, 196 + s * 10 + Math.round(tail * s / 3), 5, 7, 8);
        }
        limb(318 + tail, 232, 5, 8, 8);
        limb(214, 250 + br, 13, 22, 8);
        limb(266, 250 + br, 13, 22, 8);
        limb(214, 268, 16, 7, 8);
        limb(266, 268, 16, 7, 8);

        /* the body */
        limb(240, 206 + br, 70, 44, 7, 15, 8);

        /* the two legs on this side, and their feet */
        [198, 282].forEach(x => {
          limb(x, 248 + br, 17, 24, 7, null, 8);
          limb(x, 267, 21, 8, 8);
          R(x - 15, 263, 7, 5, 15); R(x - 4, 262, 8, 6, 15); R(x + 8, 263, 7, 5, 15);
        });

        /* The ears are the biggest thing about him and they never stop. Drawn
           before the head so the head sits over the join, and kept mostly
           light: a dark inner ear filling the whole shape reads as a hole. */
        [[184, -1], [296, 1]].forEach(v => {
          const cx = v[0] - v[1] * ear, d = v[1];
          limb(cx, 152 + br, 36 + ear, 44, 7, 15);
          limb(cx + d * 4, 156 + br, 22 + ear, 30, 8);
        });

        /* the head, and the dome on top of it */
        limb(240, 154 + br, 54, 50, 7, 15, 8);
        limb(240, 122 + br, 40, 26, 7, 15);

        /* The trunk: eight slabs, tapering, each leaning a little further than
           the one above it, so the end of it moves and the root does not. */
        for (let i = 0; i < 8; i++) {
          const k = i / 7;
          const w = Math.round(30 - k * 16);
          const curl = think ? -Math.max(0, i - 3) * 9 : 0;
          const y = 184 + br + i * 11 + curl;
          const off = Math.round(sway * k * k) + (think ? Math.round(Math.max(0, i - 3) * 5) : 0);
          const x = Math.round(240 - w / 2 + off);
          R(x - 1, y, w + 2, 12, 0);
          R(x, y, w, 11, 7);
          R(x, y + 8, w, 3, 8);
          if (i < 4) R(x + 2, y + 1, 4, 6, 15);
        }
        /* the tusks: two short white curves outside the trunk. They are the
           one part of him that never moves at all. */
        [[226, -1], [254, 1]].forEach(v => {
          for (let s = 0; s < 3; s++) {
            const w = 9 - s * 2;
            const x = v[1] < 0 ? v[0] - s * 4 - w : v[0] + s * 4;
            const y = 202 + br + s * 5;
            R(x - 1, y - 1, w + 2, 7, 0);
            R(x, y, w, 5, 15);
          }
        });

        /* the brows, which are most of the expression */
        R(206, 130 + br + look, 24, 5, 8);
        R(250, 130 + br + look, 24, 5, 8);
        [218, 262].forEach(x => {
          limb(x, 148 + br, 13, 11, 15);
          if (blink) { limb(x, 148 + br, 13, 11, 7); R(x - 12, 149 + br, 24, 3, 8); }
          else {
            limb(x, 150 + br + look, 7, 7, 0);
            R(x - 4, 147 + br + look, 3, 3, 15);
          }
        });
      }

      /* ---- 31.9 the bubble -----------------------------------------------
         Built around the words rather than the words being poured into a box:
         measure, wrap, balance the lines against each other, then cut the
         shell to fit whatever came out. It opens in four whole-pixel steps
         and the tail always points back at him.
         ========================================================================== */
      function wrapTo(s, maxw) {
        const out = [];
        let cur = '';
        s.split(' ').forEach(w => {
          const n = cur ? cur + ' ' + w : w;
          if (cur && g.measureText(n).width > maxw) { out.push(cur); cur = w; }
          else cur = n;
        });
        if (cur) out.push(cur);
        return out;
      }
      /* Two lines with one word on the second one looks like a mistake. Keep
         narrowing the measure while the line count holds and the words even
         themselves out on their own. */
      function balance(s, maxw) {
        let best = wrapTo(s, maxw);
        for (let w = maxw - 10; w > 90; w -= 10) {
          const t2 = wrapTo(s, w);
          if (t2.length > best.length) break;
          best = t2;
        }
        return best;
      }

      /* The layout of a line only changes when the line does, so it is worked
         out once and kept. balance() walks the width down in steps calling
         wrapTo() at each one and wrapTo() measures every word, so this used to
         cost a few hundred measureText calls a frame for a fixed answer. */
      let bubbleCache = null;
      function bubbleLayout(s2) {
        if (bubbleCache && bubbleCache.s === s2) return bubbleCache;
        g.font = '12px monospace';
        const lines = balance(s2, 288);
        let tw = 0;
        lines.forEach(l => { tw = Math.max(tw, g.measureText(l).width); });
        bubbleCache = { s: s2, lines: lines, tw: tw };
        return bubbleCache;
      }
      function bubble(txt, shown, step) {
        g.font = '12px monospace';
        g.textBaseline = 'alphabetic';
        const lay = bubbleLayout(txt);
        const lines = lay.lines, tw = lay.tw;
        const lh = 17;
        const fw = Math.ceil(tw) + 30, fh = lines.length * lh + 20;
        const fx = Math.round(240 - fw / 2), fy = 104 - fh;

        /* the four steps it opens in */
        const k = [0.28, 0.6, 0.86, 1][Math.min(3, step)];
        const w = Math.round(fw * k), h = Math.round(fh * k);
        const x = Math.round(240 - w / 2), y = Math.round(104 - h);

        /* the phosphor knob reaches the canvas too: on P4 and P7 a lit thing
           carries a halo, and the bubble is the brightest thing on screen */
        const ph = phosLevel();
        if (ph > 0) wash(x - 5, y - 5, w + 10, h + 10, 15, Math.round(1 + ph * 3));

        /* the tail, drawn before the shell so the shell caps it off cleanly */
        if (step >= 3) {
          for (let i = 0; i < 16; i++) {
            const ww = Math.max(3, 26 - i * 1.6);
            R(240 - ww / 2 - 2, y + h - 4 + i, ww + 4, 1, 0);
          }
          for (let i = 0; i < 13; i++) {
            const ww = Math.max(2, 22 - i * 1.6);
            R(240 - ww / 2, y + h - 4 + i, ww, 1, 15);
          }
        }
        /* hard black offset shadow — the one shadow in this build that is not
           a piece of hardware, and it is a printer's shadow, not a blur */
        B(x + 5, y + 5, w, h, 0, 12);
        B(x, y, w, h, 0, 12);
        B(x + 3, y + 3, w - 6, h - 6, 15, 10);
        /* a printed rule inside the edge, four thin bars so it reads as a
           line rather than a second fill */
        R(x + 9, y + 7, w - 18, 1, 7);
        R(x + 9, y + h - 8, w - 18, 1, 7);
        R(x + 7, y + 9, 1, h - 18, 7);
        R(x + w - 8, y + 9, 1, h - 18, 7);

        if (step < 3) return;
        let n = shown;
        g.fillStyle = C(0);
        for (let i = 0; i < lines.length; i++) {
          if (n <= 0) break;
          g.fillText(lines[i].slice(0, n), fx + 15, fy + 25 + i * lh);
          n -= lines[i].length;
        }
        /* the cursor, while he is still saying it */
        if (shown < txt.length) {
          const li = Math.min(lines.length - 1, Math.max(0, (() => {
            let c = shown, i = 0;
            while (i < lines.length - 1 && c > lines[i].length) { c -= lines[i].length; i++; }
            return i;
          })()));
          let c = shown;
          for (let i = 0; i < li; i++) c -= lines[i].length;
          const cx2 = fx + 15 + g.measureText(lines[li].slice(0, c)).width;
          R(cx2 + 1, fy + 15 + li * lh, 7, 12, 0);
        }
      }

      /* the three dots, one at a time, while he decides what to tell you */
      function dots(think) {
        const n = Math.min(3, Math.floor(think / 0.55) + 1);
        for (let i = 0; i < n; i++) {
          const x = 214 + i * 22, bob = Math.round(Math.sin(think * 4 - i) * 2);
          limb(x, 74 + bob, 8, 8, 15);
        }
      }

      /* ---- 31.10 how he sounds -------------------------------------------
         Nobody has a voice actor. He is a very large animal, so everything he
         does is low and slow: a rumble to open his mouth, then one soft blip
         every few characters, well under where a beep lives.
         ========================================================================== */
      const sfx = {
        think() {
          [196, 233, 262].forEach((f, i) =>
            Snd.tone(f, 300, { type: 'triangle', delay: i * 0.5, vol: 0.02 }));
        },
        voice() {
          Snd.tone(56, 950, { type: 'triangle', to: 94, vol: 0.055 });
          Snd.tone(112, 760, { type: 'sine', to: 188, vol: 0.03, delay: 0.06 });
        },
        say(i) { Snd.tone(148 + (i % 6) * 15, 46, { type: 'triangle', vol: 0.015 }); },
        done() {
          Snd.tone(392, 260, { type: 'triangle', vol: 0.02 });
          Snd.tone(587, 340, { type: 'triangle', delay: 0.13, vol: 0.016 });
        },
        move() {
          Snd.noise(340, { freq: 380, q: 0.4, vol: 0.022 });
          Snd.tone(262, 420, { type: 'triangle', to: 392, vol: 0.018 });
        }
      };

      /* ---- 31.11 the five songs, on the five places ----------------------
         The place picks the track, so changing where he is standing also
         changes what you are hearing, and the two arrive together.
         ========================================================================== */
      let alive = true;
      const Song = {
        on: false, cur: 'first', bus: null, when: 0, timer: null, voices: [], g0: -1,
        swap: null, FADE: 1.4,
        ensure() {
          Snd.wake();
          if (!Snd.ctx) return false;
          if (!this.bus) {
            this.bus = Snd.ctx.createGain();
            this.bus.gain.value = 0.0001;
            this.bus.connect(Snd.ctx.destination);
          }
          return true;
        },
        voice(f, at, dur, type, vol) {
          const c = Snd.ctx, o = c.createOscillator(), gn = c.createGain();
          o.type = type;
          o.frequency.setValueAtTime(f, at);
          gn.gain.setValueAtTime(0.0001, at);
          gn.gain.exponentialRampToValueAtTime(vol, at + 0.06);
          gn.gain.setValueAtTime(vol, at + dur * 0.5);
          gn.gain.exponentialRampToValueAtTime(0.0001, at + dur);
          o.connect(gn); gn.connect(this.bus);
          o.start(at); o.stop(at + dur + 0.06);
          this.voices.push(o);
          o.onended = () => { const i = this.voices.indexOf(o); if (i >= 0) this.voices.splice(i, 1); };
        },
        bar(t0, sg) {
          const e = 30 / sg.bpm;
          sg.pad.forEach(n  => this.voice(ELE_HZ[n[0]], t0 + n[1] * e, n[2] * e * 0.98, 'triangle', 0.036));
          sg.bass.forEach(n => this.voice(ELE_HZ[n[0]], t0 + n[1] * e, n[2] * e * 0.9,  'triangle', 0.05));
          sg.lead.forEach(n => this.voice(ELE_HZ[n[0]], t0 + n[1] * e, n[2] * e * 0.9,  'square',   0.04));
          if (sg.arp) sg.arp.forEach(n => this.voice(ELE_HZ[n[0]], t0 + n[1] * e, n[2] * e * 0.8, 'triangle', 0.026));
          return sg.len * e;
        },
        /* let the old one walk out before the new one walks in */
        crossfade(next) {
          if (!Snd.ctx || !this.bus) { this.cur = next; return; }
          clearTimeout(this.timer); clearTimeout(this.swap);
          this.on = false;
          const now = Snd.ctx.currentTime, gn = this.bus.gain, F = this.FADE;
          gn.cancelScheduledValues(now);
          gn.setValueAtTime(Math.max(0.0001, gn.value), now);
          gn.exponentialRampToValueAtTime(0.0001, now + F);
          this.voices.forEach(o => { try { o.stop(now + F + 0.02); } catch (e) {} });
          this.voices = [];
          this.swap = setTimeout(() => {
            this.swap = null;
            this.cur = next;
            if (alive && CRT.on && Vol.mus > 0) this.start();
          }, F * 1000 + 40);
        },
        want(id) { if (id !== this.cur) { if (this.on) this.crossfade(id); else this.cur = id; } },
        level(ramp) {
          if (!this.bus || !Snd.ctx) return;
          const want = musGain();
          if (ramp == null && Math.abs(want - this.g0) < 0.0005) return;
          this.g0 = want;
          const now = Snd.ctx.currentTime, gn = this.bus.gain;
          gn.cancelScheduledValues(now);
          gn.setValueAtTime(Math.max(0.0001, gn.value), now);
          gn.exponentialRampToValueAtTime(Math.max(0.0002, want * 0.85), now + (ramp || 0.4));
        },
        sync() {
          if (!(alive && CRT.on && Vol.mus > 0)) { this.stop(); return; }
          if (this.swap) return;
          if (this.on) this.level(); else this.start();
        },
        start() {
          if (this.on || !this.ensure()) return;
          this.on = true; this.g0 = -1;
          this.when = Snd.ctx.currentTime + 0.15;
          this.level(this.FADE);
          this.tick();
        },
        tick() {
          if (!this.on || !Snd.ctx) return;
          const now = Snd.ctx.currentTime;
          if (this.when < now) this.when = now + 0.05;
          const len = this.bar(this.when, ELE_SONGS[this.cur] || ELE_SONGS.first);
          this.when += len;
          this.timer = setTimeout(() => this.tick(), Math.max(300, len * 1000 - 500));
        },
        stop() {
          clearTimeout(this.swap); this.swap = null;
          if (!this.on) return;
          clearTimeout(this.timer); this.on = false;
          if (!this.bus || !Snd.ctx) { this.voices = []; return; }
          const now = Snd.ctx.currentTime, gn = this.bus.gain;
          gn.cancelScheduledValues(now);
          gn.setValueAtTime(Math.max(0.0001, gn.value), now);
          gn.exponentialRampToValueAtTime(0.0001, now + 0.8);
          this.voices.forEach(o => { try { o.stop(now + 0.82); } catch (e) {} });
          this.voices = [];
        }
      };

      /* ---- 31.12 what he says and when -----------------------------------
         A shuffled bag rather than a die: you will hear all two hundred of
         them before you hear any one of them twice.
         ========================================================================== */
      let bag = [];
      function nextQuote() {
        if (!bag.length) {
          bag = ELE_QUOTES.map((q, i) => i);
          for (let i = bag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const s = bag[i]; bag[i] = bag[j]; bag[j] = s;
          }
        }
        return ELE_QUOTES[bag.pop()];
      }

      let place = 0, placeT = 0;
      let phase = 'think', pT = 0, wait = 1.4;      /* he notices you arrive */
      let msg = ELE_HELLO, shown = 0, spoke = 0, first = true, openStep = 0;

      function talk() {
        if (phase === 'think') return;
        phase = 'think'; pT = 0; wait = 1.9 + Math.random() * 1.1;
        shown = 0; spoke = 0; openStep = 0;
        bTalk.textContent = '...';
        sfx.think();
      }
      function goPlace(n) {
        place = ((n % ELE_PLACES.length) + ELE_PLACES.length) % ELE_PLACES.length;
        placeT = 0;
        Song.want(ELE_PLACES[place].song);
        info.textContent = ELE_PLACES[place].name + '  ·  CLICK HIM, OR PRESS TALK';
        sfx.move();
      }

      bTalk.addEventListener('mousedown', ev => { ev.stopPropagation(); talk(); });
      bPlace.addEventListener('mousedown', ev => { ev.stopPropagation(); goPlace(place + 1); });
      cv.addEventListener('mousedown', () => talk());
      cv.addEventListener('keydown', ev => {
        if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); talk(); }
        if (ev.key === 'Tab') { ev.preventDefault(); goPlace(place + 1); }
      });

      goPlace(0);
      sfx.think();

      /* ---- 31.13 the loop ------------------------------------------------
         Capped at thirty, because nothing here needs sixty and a calm picture
         should not be the reason a fan comes on.
         ========================================================================== */
      let raf = null, last = 0, acc = 0;
      function frame(ts) {
        if (!alive || !document.body.contains(cv)) { alive = false; Song.stop(); return; }
        raf = requestAnimationFrame(frame);
        if (!last) last = ts;
        let dt = (ts - last) / 1000;
        last = ts;
        if (dt > 0.25) dt = 0.25;
        acc += dt;
        if (acc < 1 / 30) return;
        const step = acc; acc = 0;

        if (!CRT.on) { Song.stop(); return; }
        Song.sync();

        const t = ts / 1000;
        const P = ELE_PLACES[place];

        /* the place moves on by itself if you don't move it */
        placeT += step;
        if (placeT > 84) goPlace(place + 1);

        pT += step;
        if (phase === 'think' && pT >= wait) {
          phase = 'speak'; pT = 0; shown = 0; spoke = 0; openStep = 0;
          msg = first ? ELE_HELLO : nextQuote();
          first = false;
          sfx.voice();
          bTalk.textContent = 'ANOTHER';
        }
        if (phase === 'speak') {
          openStep = Math.min(3, Math.floor(pT / 0.07));
          if (openStep >= 3) {
            const n = Math.min(msg.length, Math.floor((pT - 0.21) * 26));
            if (n > shown) {
              shown = n;
              if (shown - spoke >= 3) { sfx.say(shown); spoke = shown; }
              if (shown >= msg.length && spoke < msg.length) { spoke = msg.length; sfx.done(); }
            }
          }
        }

        stepMotes(step);
        (PLACE_FN[P.id] || placeSun)(t);
        drawEle(t, phase);
        drawMotes(P.mote);
        overlay(P.id, t);
        if (phase === 'think') dots(pT);
        if (phase === 'speak') bubble(msg, shown, openStep);
      }
      raf = requestAnimationFrame(frame);

      /* the window is gone the moment it is gone; nothing keeps playing */
      const watch = setInterval(() => {
        if (document.body.contains(cv)) return;
        clearInterval(watch);
        alive = false;
        Song.stop();
        if (raf) cancelAnimationFrame(raf);
      }, 900);
    }
  });
  }
};