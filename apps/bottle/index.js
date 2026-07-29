import { createWindow, raise } from '../../kernel/wm.js';

export default {
  id: 'bottle',
  title: 'THE BOTTLE',
  width: 320,
  height: 440,
  resizable: false,
  mount(root, ctx) {
  const body = root;
      const wrap = document.createElement('div');
      wrap.className = 'gamepane jagpane';
      const cv = document.createElement('canvas');
      cv.width = 300; cv.height = 360;
      cv.className = 'gamecv jagcv';
      cv.tabIndex = 0;
      wrap.appendChild(cv);
      const bar = document.createElement('div');
      bar.className = 'appbar';
      const bBuy = document.createElement('button'); bBuy.className = 'appbtn'; bBuy.textContent = 'BUY A NEW BOTTLE';
      const info = document.createElement('span'); info.className = 'godword';
      bar.appendChild(bBuy); bar.appendChild(info);
      body.appendChild(wrap); body.appendChild(bar);

      const g = cv.getContext('2d');
      if (!g) { info.textContent = 'NO CANVAS.'; return; }
      g.imageSmoothingEnabled = false;

      const C = {
        /* Real bottle glass is nearly black and the liqueur inside it is
           nearly black too. Both are pushed up here until the level line is
           the first thing you see, the way it is on a bar sign. */
        glass: '#2e6b2b', glassHi: '#57a84e', glassLo: '#173a17', air: '#3f8038',
        liquid: '#7a4116', liquidHi: '#a8621f', liquidLo: '#4d270c',
        label: '#e8a01e', labelDk: '#b8741a', ink: '#14240f',
        wood: '#3a2415', woodHi: '#4d3020', cork: '#c8a86a',
        shot: '#c9d4dc', shotHi: '#ffffff', white: '#f2f4f7', dim: '#9aa3ad'
      };
      const S = { ml: JAG_FULL, drunk: 0, bottles: 1, glass: 0, phase: 'idle', t: 0, tilt: 0, note: '', noteT: 0 };
      try {
        const raw = JSON.parse(localStorage.getItem(JAG_KEY) || 'null');
        if (raw) { S.ml = raw.ml == null ? JAG_FULL : raw.ml; S.drunk = raw.drunk || 0;
                   S.bottles = raw.bottles || 1; S.glass = raw.glass || 0; }
      } catch (e) {}
      const save = () => { try { localStorage.setItem(JAG_KEY,
        JSON.stringify({ ml: S.ml, drunk: S.drunk, bottles: S.bottles, glass: S.glass })); } catch (e) {} };
      const say = t => { S.note = t; S.noteT = 3; };

      /* ---- the noises a bar makes ------------------------------------- */
      const sfx = {
        pour() {
          Snd.wake(); if (!Snd.ctx) return;
          const c = Snd.ctx, n = Math.floor(c.sampleRate * 1.5);
          const b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
          for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * 0.6;
          const s = c.createBufferSource(); s.buffer = b;
          const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3.2;
          /* the note a vessel makes rises as it fills */
          f.frequency.setValueAtTime(420, c.currentTime);
          f.frequency.linearRampToValueAtTime(1150, c.currentTime + 1.25);
          const gn = c.createGain();
          gn.gain.setValueAtTime(0.0001, c.currentTime);
          gn.gain.exponentialRampToValueAtTime(0.10, c.currentTime + 0.10);
          gn.gain.setValueAtTime(0.10, c.currentTime + 1.05);
          gn.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.35);
          s.connect(f); f.connect(gn); gn.connect(c.destination);
          s.start(); s.stop(c.currentTime + 1.5);
        },
        drink() {
          Snd.wake(); if (!Snd.ctx) return;
          const c = Snd.ctx;
          /* three swallows, each a little lower than the last */
          [0, 0.20, 0.40].forEach((at, i) => {
            const o = c.createOscillator(), gn = c.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(190 - i * 34, c.currentTime + at);
            o.frequency.exponentialRampToValueAtTime(78 - i * 12, c.currentTime + at + 0.13);
            gn.gain.setValueAtTime(0.0001, c.currentTime + at);
            gn.gain.exponentialRampToValueAtTime(0.16, c.currentTime + at + 0.02);
            gn.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + 0.15);
            o.connect(gn); gn.connect(c.destination);
            o.start(c.currentTime + at); o.stop(c.currentTime + at + 0.2);
          });
          Snd.noise(90, { freq: 700, q: 1.1, vol: 0.05, delay: 0.55 });
          Snd.tone(150, 90, { type: 'triangle', to: 70, vol: 0.07, delay: 0.72 });   /* glass down */
        },
        cork() { Snd.tone(300, 60, { type: 'sine', to: 900, vol: 0.10 }); Snd.noise(50, { freq: 2200, q: 2, vol: 0.05, delay: 0.05 }); },
        deny() { Snd.tone(150, 180, { type: 'sawtooth', vol: 0.05 }); }
      };

      /* ---- the picture ------------------------------------------------- */
      const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, w | 0, h | 0); };
      const T = (t, x, y, c, sz, al) => { g.fillStyle = c; g.font = (sz || 9) + 'px monospace';
        g.textAlign = al || 'left'; g.fillText(String(t), x | 0, y | 0); g.textAlign = 'left'; };

      /* the stag's head, in as few rectangles as will still read as a stag */
      function stag(x, y, s) {
        const q = (a, b, w2, h2) => R(x + a * s, y + b * s, Math.max(1, w2 * s), Math.max(1, h2 * s), C.ink);
        q(4, 5, 5, 5);                                     /* skull */
        q(5, 10, 3, 3);                                    /* muzzle */
        q(3, 7, 1, 2); q(9, 7, 1, 2);                      /* ears */
        q(3, 1, 1, 5); q(9, 1, 1, 5);                      /* antler uprights */
        q(1, 2, 2, 1); q(10, 2, 2, 1);                     /* lower tines */
        q(1, 2, 1, 2); q(11, 2, 1, 2);
        q(2, 0, 2, 1); q(9, 0, 2, 1);                      /* upper tines */
        q(0, 4, 1, 2); q(12, 4, 1, 2);
        /* the cross between the antlers, the way the label has it */
        R((x + 6 * s) | 0, (y - 4 * s) | 0, Math.max(1, 1.2 * s), 5 * s, C.ink);
        R((x + 4.4 * s) | 0, (y - 2.6 * s) | 0, 4.4 * s, Math.max(1, 1.2 * s), C.ink);
        R((x + 5.4 * s) | 0, (y - 5.2 * s) | 0, 2.4 * s, Math.max(1, 1.2 * s), '#fff6c8');
      }

      function draw(ts) {
        /* the bar */
        R(0, 0, 300, 360, C.wood);
        for (let y = 0; y < 360; y += 7) R(0, y, 300, 1, y % 14 ? C.woodHi : C.wood);
        R(0, 250, 300, 3, '#221407');
        R(0, 253, 300, 107, '#2c1b0f');

        const frac = Math.max(0, Math.min(1, S.ml / JAG_FULL));
        /* ---- the bottle ---- */
        const bx = 46, by = 40, bw = 84, bh = 210;
        const tilt = S.tilt;
        g.save();
        g.translate(bx + bw / 2, by + bh);                 /* pivot at the base */
        g.rotate(tilt);
        g.translate(-(bx + bw / 2), -(by + bh));
        R(bx + 32, by - 26, 20, 28, C.glass);              /* neck */
        R(bx + 32, by - 26, 4, 28, C.glassHi);
        R(bx + 30, by - 34, 24, 9, C.cork);                /* cap */
        R(bx + 30, by - 34, 24, 3, '#e2c98c');
        R(bx + 26, by - 2, 32, 10, C.glass);               /* shoulder */
        R(bx, by + 6, bw, bh - 6, C.air);                  /* body, seen empty */
        R(bx, by + 6, 7, bh - 6, C.glassHi);
        R(bx + bw - 7, by + 6, 7, bh - 6, C.glassLo);
        /* what is left in it, and the line where it stops */
        const lh = Math.round((bh - 12) * frac);
        if (lh > 0) {
          R(bx + 4, by + bh - 4 - lh, bw - 8, lh, C.liquid);
          R(bx + 4, by + bh - 4 - lh, bw - 8, 3, C.liquidHi);
          R(bx + 4, by + bh - 1 - lh, 4, lh - 3, C.liquidHi);
          R(bx + bw - 10, by + bh - 1 - lh, 6, lh - 3, C.liquidLo);
        }
        g.strokeStyle = C.glassLo; g.lineWidth = 2;
        g.strokeRect(bx + 1, by + 7, bw - 2, bh - 8);
        /* the label: orange, square, a stag with a cross between its antlers */
        const ly = by + 60, lhh = 96;
        R(bx + 4, ly, bw - 8, lhh, C.label);
        R(bx + 4, ly, bw - 8, 3, '#f6bf58');
        R(bx + 4, ly + lhh - 3, bw - 8, 3, C.labelDk);
        R(bx + 8, ly + 4, bw - 16, lhh - 8, C.label);
        g.strokeStyle = C.ink; g.lineWidth = 1;
        g.strokeRect(bx + 8.5, ly + 4.5, bw - 17, lhh - 9);
        stag(bx + bw / 2 - 20, ly + 30, 3.1);
        T('HIRSCHGEIST', bx + bw / 2, ly + 16, C.ink, 9, 'center');
        T('KRÄUTERLIKÖR', bx + bw / 2, ly + lhh - 16, C.ink, 7, 'center');
        T('56 KRÄUTER · 35%', bx + bw / 2, ly + lhh - 7, C.ink, 6, 'center');
        g.restore();

        /* ---- the stream ---- */
        if (S.phase === 'pour') {
          const k = Math.min(1, S.t / 1.2);
          const sx = bx + bw / 2 + 50, sy = by + bh - 44;
          for (let i = 0; i < 26; i++) {
            const p = i / 26;
            const px = sx + p * 44 + Math.sin(ts * 9 + i) * 1.2;
            const py = sy + p * p * 96 + 8;
            if (py > 284) break;
            R(px, py, 3, 5, i % 4 === 0 ? C.liquidHi : C.liquid);
          }
          if (Math.floor(ts * 20) % 2) R(sx + 42, 280, 4, 3, C.liquidHi);
        }

        /* ---- the glass ---- */
        const gx = 190, gy = 222, gw = 64, gh = 70;
        const fill = S.glass;                              /* 0..1 */
        R(gx - 8, gy + gh + 4, gw + 16, 5, '#1a1008');     /* its shadow */
        /* an empty glass has to look empty: the bar behind it is nearly the
           colour of the drink, so the inside is lifted well clear of both */
        R(gx + 2, gy, gw - 4, gh, '#5c4a38');
        R(gx + 4, gy + 2, gw - 8, gh - 6, '#6b5642');
        if (fill > 0.01) {
          const fh = Math.round((gh - 10) * fill);
          R(gx + 4, gy + gh - 5 - fh, gw - 8, fh, C.liquid);
          R(gx + 4, gy + gh - 5 - fh, gw - 8, 3, C.liquidHi);
          R(gx + 6, gy + gh - 2 - fh, 3, fh - 3, C.liquidHi);
        }
        R(gx, gy, 4, gh, C.shot); R(gx + gw - 4, gy, 4, gh, C.shot);
        R(gx, gy + gh - 5, gw, 5, C.shot);
        R(gx - 6, gy + gh, gw + 12, 5, C.shot);            /* the heavy base */
        R(gx + 5, gy + 3, 2, gh - 10, C.shotHi);
        R(gx, gy, gw, 2, C.shotHi);

        /* ---- the reckoning ---- */
        const shots = Math.floor(S.ml / JAG_SHOT + 1e-6);
        T('HIRSCHGEIST', 150, 20, C.label, 12, 'center');
        T(S.ml.toFixed(0) + ' ML LEFT  ·  ' + shots + ' MEASURE' + (shots === 1 ? '' : 'S'), 150, 34, C.white, 9, 'center');
        R(96, 300, 108, 8, '#1a1008');
        R(97, 301, Math.round(106 * frac), 6, frac > 0.25 ? C.label : '#c8542a');
        T('BOTTLE ' + S.bottles, 150, 322, C.dim, 8, 'center');
        T('DRUNK: ' + S.drunk + ' MEASURE' + (S.drunk === 1 ? '' : 'S') +
          '  (' + (S.drunk * JAG_SHOT / 1000).toFixed(2) + ' L)', 150, 336, C.white, 8, 'center');
        const hint = S.phase === 'pour' ? 'POURING...'
                   : S.glass > 0.9 ? 'CLICK THE GLASS'
                   : S.ml < JAG_SHOT ? 'THE BOTTLE IS EMPTY'
                   : 'CLICK THE BOTTLE';
        T(S.note || hint, 150, 350, S.note ? C.label : C.dim, 8, 'center');

        /* the glass catches the light of the room */
        g.globalAlpha = 0.06;
        const gr = g.createLinearGradient(0, 0, 300, 360);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 300, 360);
        g.globalAlpha = 1;
      }

      /* ---- what a click does -------------------------------------------- */
      function pour() {
        if (S.phase !== 'idle') return;
        if (S.glass > 0.01) { say('THE GLASS IS ALREADY FULL.'); sfx.deny(); return; }
        if (S.ml < JAG_SHOT) { say('EMPTY. BUY ANOTHER ONE.'); sfx.deny(); return; }
        S.phase = 'pour'; S.t = 0;
        sfx.pour();
      }
      function drink() {
        if (S.phase !== 'idle' || S.glass < 0.9) return;
        S.phase = 'drink'; S.t = 0;
        sfx.drink();
      }
      cv.addEventListener('mousedown', ev => {
        ev.stopPropagation(); cv.focus();
        const r = cv.getBoundingClientRect();
        const x = (ev.clientX - r.left) * (cv.width / r.width);
        const y = (ev.clientY - r.top) * (cv.height / r.height);
        if (x > 180 && x < 268 && y > 220 && y < 300) { S.glass > 0.9 ? drink() : pour(); return; }
        if (x > 20 && x < 150 && y > 10 && y < 260) { pour(); return; }
        S.glass > 0.9 ? drink() : pour();
      });
      cv.addEventListener('keydown', ev => {
        if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); S.glass > 0.9 ? drink() : pour(); }
      });
      bBuy.addEventListener('click', () => {
        S.ml = JAG_FULL; S.bottles++; save(); sfx.cork();
        say('A NEW BOTTLE. THE SAME AS THE LAST ONE.');
        cv.focus();
      });

      let alive = true, raf = null, last = 0;
      function frame(ts) {
        if (!alive || !document.body.contains(cv)) { alive = false; if (raf) cancelAnimationFrame(raf); return; }
        raf = requestAnimationFrame(frame);
        const t = ts / 1000, dt = Math.min(0.1, t - last || 0); last = t;
        if (S.noteT > 0) { S.noteT -= dt; if (S.noteT <= 0) S.note = ''; }

        if (S.phase === 'pour') {
          S.t += dt;
          S.tilt = Math.min(0.85, S.t * 3.2) * (S.t > 1.25 ? Math.max(0, (1.55 - S.t) / 0.3) : 1);
          const k = Math.max(0, Math.min(1, (S.t - 0.25) / 1.0));
          S.glass = k;
          if (S.t >= 1.6) {
            S.phase = 'idle'; S.tilt = 0; S.glass = 1;
            S.ml = Math.max(0, S.ml - JAG_SHOT);
            save();
            say('ONE MEASURE. FORTY MILLILITRES.');
          }
        } else if (S.phase === 'drink') {
          S.t += dt;
          S.glass = Math.max(0, 1 - S.t / 0.62);
          if (S.t >= 0.95) {
            S.phase = 'idle'; S.glass = 0; S.drunk++;
            save();
            say(JAG_LINES[Math.min(JAG_LINES.length - 1, Math.floor(S.drunk / 3))]);
          }
        } else S.tilt += (0 - S.tilt) * Math.min(1, dt * 8);
        draw(t);
      }
      raf = requestAnimationFrame(frame);
      const watch = setInterval(() => {
        if (document.body.contains(cv)) return;
        clearInterval(watch); alive = false; if (raf) cancelAnimationFrame(raf);
      }, 900);
      info.textContent = 'CLICK THE BOTTLE TO POUR · CLICK THE GLASS TO DRINK';
      setTimeout(() => cv.focus(), 40);
  }
};
