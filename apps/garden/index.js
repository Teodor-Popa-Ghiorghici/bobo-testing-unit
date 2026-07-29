import { lampDip, CRT, Vol } from '../../kernel/hardware.js';
import { SPECIES } from '../../kernel/cos_data.js';

const BAYER4 = [
  [0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]
];
const SkyCache = { step: -1, cv: null };

export default {
  id: 'garden',
  title: 'GARDEN.EXE',
  width: 720,
  height: 520,
  resizable: true,
  async mount(root, ctx) {
    const GARD_POTS = 12;
    const WATER_MS = 8 * 60 * 1000;
    const OFFLINE_RATE = 0.4;
    const TOKEN_CAP = 20;
    const DAY_MS = 20 * 60 * 1000;
    const PENTA = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];

    function speciesById(id) { 
      return (window.Cos && window.Cos.COS_CATS && window.Cos.COS_CATS.seed) 
        ? window.Cos.COS_CATS.seed.list.find(s => s.id === id) 
        : null; 
    }
    
    function potSkin() { 
      return (window.Cos && window.Cos.COS_CATS && window.Cos.COS_CATS.pot)
        ? window.Cos.find('pot', window.Cos.live('pot')) || window.Cos.COS_CATS.pot.list[0]
        : { c: ['#aa6644', '#884422'] };
    }

    function gardenIsNight(now) { return gardenLight(now) < 0.34; }
    function gardenLight(now) {
      const t = ((now % DAY_MS) + DAY_MS) % DAY_MS / DAY_MS;
      return 0.5 + 0.5 * Math.cos(t * Math.PI * 2);
    }
    
    function dimCol(hex, k) {
      const n = parseInt(hex.slice(1), 16);
      const r = Math.round(((n >> 16) & 255) * k), g2 = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
      return 'rgb(' + r + ',' + g2 + ',' + b + ')';
    }

    function drawPot(g, x, y, pot, s, k) {
      const c = (k == null || k >= 0.999) ? pot.c : pot.c.map(h => dimCol(h, k));
      const W = Math.round(44 * s), H = Math.round(30 * s), lip = Math.max(2, Math.round(5 * s));
      g.fillStyle = c[0];
      g.fillRect(x, y, W, lip);
      g.fillStyle = c[1];
      g.fillRect(x, y, W, Math.max(1, Math.round(2 * s)));
      const steps = Math.max(3, Math.round(6 * s));
      const bodyH = H - lip;
      for (let i = 0; i < steps; i++) {
        g.fillRect(x + i, y + lip + Math.round((i / steps) * bodyH), W - i * 2, Math.round((1 / steps) * bodyH) + 1);
      }
    }
    
    function drawSunToken(g, x, y, s) {
      const h = s / 2;
      g.fillStyle = '#AA5500';
      g.fillRect(x + 1, y + 1, s - 2, s - 2);
      g.fillStyle = '#FFFF55';
      g.fillRect(x + 2, y + 1, s - 4, s - 2);
      g.fillRect(x + 1, y + 2, s - 2, s - 4);
      g.fillStyle = '#FFFFFF';
      g.fillRect(x + 2, y + 2, 2, 2);
      g.fillStyle = '#FFFF55';
      g.fillRect(x + h - 1, y - 2, 2, 2);
    }
function drawPlant(g, cx, baseY, sp, stage, t, s, wig, dark) {
  if (stage < 0) return;
  const c = sp.hue;
  const sway = Math.sin(t * 0.9 + cx) * (1.2 + stage * 0.5) * s;
  const sq = wig ? Math.sin(wig * 18) * 0.22 * wig : 0;
  const S = s * (1 - sq), SY = s * (1 + sq);
  const shade = dark ? 0.55 : 1;
  const mix = col => dark ? dimCol(col, shade) : col;
  const R = (x, y, w, h, col) => { g.fillStyle = mix(col); g.fillRect(Math.round(cx + x * S + sway), Math.round(baseY - y * SY), Math.max(1, Math.round(w * S)), Math.max(1, Math.round(h * SY))); };

  if (stage === 0) {
    R(-2, 3, 4, 3, '#6b4a2a');
    R(-1, 4, 2, 1, '#8a6238');
    return;
  }
  const h = stage === 1 ? 8 : stage === 2 ? 16 : 26;
  /* stem */
  R(-1, h, 2, h, c[1]);
  R(-1, h, 1, h, c[0]);
  if (stage >= 1) {
    R(-7, h - 2, 6, 2, c[1]); R(-6, h - 1, 4, 2, c[0]);
    R(1, h - 5, 6, 2, c[1]);  R(1, h - 4, 4, 2, c[0]);
  }
  if (stage >= 2) {
    R(-9, h - 9, 8, 2, c[1]); R(-8, h - 8, 6, 2, c[0]);
    R(1, h - 13, 8, 2, c[1]); R(1, h - 12, 6, 2, c[0]);
  }
  if (stage === 3) {
    /* the head. Each species wears a different one. */
    if (sp.id === 'mosscap') {
      R(-7, h + 5, 14, 5, c[1]); R(-5, h + 7, 10, 3, c[2]); R(-3, h + 2, 6, 3, c[0]);
    } else if (sp.id === 'bellvine') {
      R(-4, h + 4, 8, 5, c[1]); R(-3, h + 7, 6, 3, c[2]); R(-1, h + 1, 2, 2, c[0]);
    } else if (sp.id === 'embercup') {
      R(-5, h + 6, 10, 6, c[1]); R(-3, h + 8, 6, 4, c[2]); R(-2, h + 10, 4, 2, '#ffd27a');
    } else if (sp.id === 'glassreed') {
      R(-2, h + 12, 4, 12, c[0]); R(-1, h + 12, 2, 12, c[2]); R(-4, h + 6, 8, 2, c[1]);
    } else if (sp.id === 'nightpea') {
      R(-6, h + 4, 12, 6, c[1]); R(-4, h + 6, 8, 4, c[2]);
      R(-3, h + 9, 2, 2, '#ffffff'); R(1, h + 9, 2, 2, '#ffffff');
    } else if (sp.id === 'ironbud') {
      R(-5, h + 5, 10, 7, c[1]); R(-3, h + 7, 6, 5, c[2]); R(-5, h + 5, 10, 1, c[0]);
    } else if (sp.id === 'halofern') {
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.45;
        R(Math.cos(a) * 8 - 1, h + 4 + Math.sin(a) * -8, 3, 3, i % 2 ? c[2] : c[1]);
      }
      R(-2, h + 3, 4, 3, c[0]);
    } else {
      R(-6, h + 5, 12, 6, c[1]); R(-4, h + 7, 8, 4, c[2]); R(-2, h + 9, 4, 2, '#ffffff');
    }
  }
}
function gardenSky(W, H, light) {
  const step = Math.round(light * 22);
  if (SkyCache.step === step && SkyCache.cv) return SkyCache.cv;
  const cv = SkyCache.cv || document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const k = step / 22;
  /* three keys: night, dusk, noon — interpolated, then dithered into bands */
  const lerp = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const NIGHT = [[16, 18, 34], [26, 30, 54], [40, 44, 70]];
  const DUSK  = [[74, 52, 62], [128, 84, 74], [176, 122, 88]];
  const NOON  = [[86, 134, 186], [134, 176, 206], [198, 214, 202]];
  let top, mid, bot;
  if (k < 0.5) {
    const t = k / 0.5;
    top = lerp(NIGHT[0], DUSK[0], t); mid = lerp(NIGHT[1], DUSK[1], t); bot = lerp(NIGHT[2], DUSK[2], t);
  } else {
    const t = (k - 0.5) / 0.5;
    top = lerp(DUSK[0], NOON[0], t); mid = lerp(DUSK[1], NOON[1], t); bot = lerp(DUSK[2], NOON[2], t);
  }
  const rgb = a => 'rgb(' + a[0] + ',' + a[1] + ',' + a[2] + ')';
  const bands = 14;
  for (let b = 0; b < bands; b++) {
    const f = b / (bands - 1);
    const c = f < 0.5 ? lerp(top, mid, f / 0.5) : lerp(mid, bot, (f - 0.5) / 0.5);
    const y0 = Math.round(H * b / bands), y1 = Math.round(H * (b + 1) / bands);
    g.fillStyle = rgb(c);
    g.fillRect(0, y0, W, y1 - y0);
    /* dither the seam into the band above with the next colour up */
    if (b > 0) {
      const cPrev = f < 0.5 ? lerp(top, mid, Math.max(0, f - 1 / bands) / 0.5)
                            : lerp(mid, bot, Math.max(0, (f - 1 / bands - 0.5)) / 0.5);
      g.fillStyle = rgb(cPrev);
      for (let y = y0; y < Math.min(y0 + 8, y1); y++) {
        const thr = 15 - Math.floor((y - y0) / 8 * 16);
        for (let x = 0; x < W; x += 1) {
          if (BAYER4[y & 3][x & 3] > thr) g.fillRect(x, y, 1, 1);
        }
      }
    }
  }
  /* a disc drawn as a staircase of one-pixel rows, which is what a circle
     is on a machine with no anti-aliasing */
  const disc = (cx, cy, r, fill) => {
    g.fillStyle = fill;
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
      g.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
    }
  };
  /* stars, and one moon, fading in as the light goes */
  if (k < 0.42) {
    const a = 1 - k / 0.42;
    g.fillStyle = 'rgba(255,255,255,' + (a * 0.9).toFixed(2) + ')';
    for (let i = 0; i < 60; i++) {
      const x = (i * 977) % W, y = (i * 613) % Math.round(H * 0.6);
      g.fillRect(x, y, 1 + (i % 2), 1 + (i % 2));
    }
    disc(W - 80, 44, 16, 'rgba(236,240,220,' + (a * 0.95).toFixed(2) + ')');
    disc(W - 86, 38, 4, 'rgba(198,204,182,' + (a * 0.95).toFixed(2) + ')');
    disc(W - 73, 50, 3, 'rgba(198,204,182,' + (a * 0.95).toFixed(2) + ')');
    disc(W - 78, 55, 2, 'rgba(198,204,182,' + (a * 0.95).toFixed(2) + ')');
  } else if (k > 0.6) {
    const a = (k - 0.6) / 0.4;
    disc(80, 46, 20, 'rgba(255,238,150,' + (a * 0.5).toFixed(2) + ')');
    disc(80, 46, 15, 'rgba(255,246,196,' + (a * 0.92).toFixed(2) + ')');
    disc(80, 46, 10, 'rgba(255,253,236,' + (a * 0.95).toFixed(2) + ')');
  }
  SkyCache.step = step;
  SkyCache.cv = cv;
  return cv;
}

    
    const defSt = { pots: [], lastTick: Date.now(), planted: 0 };
    let st = await ctx.load('st') || {};
    st = { ...defSt, ...st };
    if (!Array.isArray(st.pots)) st.pots = [];
    while (st.pots.length < GARD_POTS) st.pots.push(null);
    st.pots.length = GARD_POTS;
    st.pots = st.pots.map(p => {
      if (!p || !p.sp || !speciesById(p.sp)) return null;
      return { sp: p.sp, planted: Date.now(), watered: 0, grown: 0, acc: 0, tok: 0, ...p };
    });

    const Garden = {
      st,
      save() { ctx.save('st', this.st); },
      step(now, dt, rate) {
        const night = gardenIsNight(now);
        let tokens = this.tokens();
        this.st.pots.forEach(p => {
          if (!p) return;
          const sp = speciesById(p.sp);
          if (!sp) return;
          const wet = Math.max(0, Math.min(dt, (p.watered + WATER_MS) - (now - dt)));
          if (wet <= 0) return;
          const credit = wet * rate;
          const need = sp.grow * 1000;
          if (p.grown < need * 3) p.grown = Math.min(need * 3, p.grown + credit);
          if (p.grown < need * 3) return;
          if (sp.night && !night) return;
          p.acc += credit;
          const per = sp.drop * 1000;
          while (p.acc >= per && tokens < TOKEN_CAP) {
            p.acc -= per;
            p.tok = (p.tok || 0) + 1;
            tokens++;
          }
          if (tokens >= TOKEN_CAP) p.acc = Math.min(p.acc, per);
        });
      },
      catchUp() {
        const now = Date.now();
        const last = this.st.lastTick || now;
        const gap = Math.max(0, now - last);
        this.st.lastTick = now;
        if (gap > 4000) this.step(now, gap, OFFLINE_RATE);
        else if (gap > 0) this.step(now, gap, 1);
        this.save();
      },
      tick() {
        const now = Date.now();
        const dt = now - (this.st.lastTick || now);
        this.st.lastTick = now;
        if (dt > 0) this.step(now, dt, dt > 4000 ? OFFLINE_RATE : 1);
      },
      tokens() { return this.st.pots.reduce((a, p) => a + (p ? p.tok || 0 : 0), 0); },
      stage(p) {
        if (!p) return -1;
        const sp = speciesById(p.sp);
        if (!sp) return -1;
        const need = sp.grow * 1000;
        if (p.grown >= need * 3) return 3;
        if (p.grown >= need * 2) return 2;
        if (p.grown >= need) return 1;
        return 0;
      },
      isWet(p, now) { return p && (p.watered + WATER_MS) > now; }
    };
    Garden.catchUp();
const GardenAir = {
  src: null, gain: null, lfo: null, birdT: null,
  start() {
    window.Snd.wake();
    if (!window.Snd.ctx || this.src) return;
    const ctx = window.Snd.ctx;
    let buf;
    try {
      const n = ctx.sampleRate * 3;
      buf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < n; i++) {
        /* brown-ish noise: white, integrated, so it is wind and not hiss */
        last = (last + (Math.random() * 2 - 1) * 0.06);
        if (last > 1) last = 1; if (last < -1) last = -1;
        d[i] = last * 0.6;
      }
    } catch (e) { return; }
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.value = 0.0;
    src.connect(f); f.connect(g); g.connect(window.Snd.sfx || ctx.destination);
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.frequency.value = 0.06; lg.gain.value = 180;
    lfo.connect(lg); lg.connect(f.frequency);
    try { src.start(); lfo.start(); } catch (e) {}
    g.gain.setTargetAtTime(0.22, ctx.currentTime, 2.2);
    this.src = src; this.gain = g; this.lfo = lfo;
    this.birdT = setInterval(() => {
      if (!CRT.on || Vol.sfx <= 0) return;
      if (Math.random() > 0.32) return;
      const base = 1500 + Math.random() * 900;
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        window.Snd.tone(base * (1 + i * 0.12), 55, { type: 'sine', vol: 0.012, delay: i * 0.09, to: base * (1 + i * 0.12) * 1.3 });
      }
    }, 5200);
  },
  stop() {
    clearInterval(this.birdT);
    this.birdT = null;
    if (this.gain && window.Snd.ctx) {
      try { this.gain.gain.setTargetAtTime(0, window.Snd.ctx.currentTime, 0.4); } catch (e) {}
    }
    const src = this.src, lfo = this.lfo;
    setTimeout(() => {
      try { if (src) src.stop(); } catch (e) {}
      try { if (lfo) lfo.stop(); } catch (e) {}
    }, 1400);
    this.src = null; this.gain = null; this.lfo = null;
  }
};
this._GardenAir = GardenAir;
const W = 700, H = 436;
  let cv = null, g = null, info = null, seedBtn = null, canBtn = null;
  let canning = false, seedIx = 0;
  let raf = null, t0 = performance.now(), tsec = 0;
  const motes = [];
  const flies = [];
  const leaves = [];
  const pops = [];       /* collected-token bounces */

  for (let i = 0; i < 26; i++) motes.push({ x: Math.random() * W, y: Math.random() * H, v: 0.1 + Math.random() * 0.25, s: Math.random() * 6 });
  for (let i = 0; i < 14; i++) flies.push({ x: Math.random() * W, y: 120 + Math.random() * 280, p: Math.random() * 6.3, r: 8 + Math.random() * 20 });

  (function build(body) {
      const pane = document.createElement('div');
      pane.className = 'gamepane gardenpane';
      cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      cv.className = 'gamecv gardencv';
      pane.appendChild(cv);
      const bar = document.createElement('div');
      bar.className = 'appbar';
      canBtn = document.createElement('button');
      canBtn.className = 'appbtn';
      canBtn.textContent = 'WATER';
      seedBtn = document.createElement('button');
      seedBtn.className = 'appbtn';
      const shopBtn = document.createElement('button');
      shopBtn.className = 'appbtn';
      shopBtn.textContent = 'DAVE';
      info = document.createElement('span');
      info.className = 'godword gbar';
      bar.appendChild(canBtn); bar.appendChild(seedBtn); bar.appendChild(shopBtn); bar.appendChild(info);
      root.appendChild(pane); root.appendChild(bar);

      canBtn.addEventListener('mousedown', ev => {
        ev.stopPropagation();
        canning = !canning;
        canBtn.classList.toggle('on', canning);
        canBtn.textContent = canning ? 'CAN IN HAND' : 'WATER';
        cv.classList.toggle('canning', canning);
        window.Snd.click();
      });
      seedBtn.addEventListener('mousedown', ev => {
        ev.stopPropagation();
        const own = ownedSeeds();
        seedIx = (seedIx + 1) % own.length;
        window.Snd.click();
        refreshSeed();
      });
      shopBtn.addEventListener('mousedown', ev => { ev.stopPropagation(); ctx.openWindow('shop'); });
  })(root);

  g = cv.getContext('2d');
  if (g) g.imageSmoothingEnabled = false;

  function ownedSeeds() {
    const own = window.Cos.owned('seed');
    const list = SPECIES.filter(s => own.indexOf(s.id) >= 0);
    return list.length ? list : [SPECIES[0]];
  }
  function refreshSeed() {
    const s = ownedSeeds()[seedIx % ownedSeeds().length];
    if (seedBtn) seedBtn.textContent = 'SEED: ' + s.name;
  }
  refreshSeed();

  /* pot geometry: four across, three down, on a shelf of soil */
  function potAt(i) {
    const col = i % 4, row = Math.floor(i / 4);
    return { x: 40 + col * 184, y: 150 + row * 96, cx: 40 + col * 184 + 33, w: 66, h: 46 };
  }

  cv.addEventListener('mousedown', ev => {
    ev.stopPropagation();
    const r = cv.getBoundingClientRect();
    const mx = (ev.clientX - r.left) * (W / r.width);
    const my = (ev.clientY - r.top) * (H / r.height);
    const now = Date.now();

    /* a token in front of a pot is the first thing a click can mean */
    for (let i = 0; i < GARD_POTS; i++) {
      const p = Garden.st.pots[i];
      if (!p || !p.tok) continue;
      const q = potAt(i);
      for (let k = 0; k < p.tok; k++) {
        const tx = q.x + 4 + k * 9, ty = q.y + q.h + 4;
        if (mx >= tx - 3 && mx <= tx + 12 && my >= ty - 3 && my <= ty + 12) {
          const sp = speciesById(p.sp);
          const n = sp ? sp.yield * p.tok : p.tok;
          p.tok = 0;
          window.Economy.earn(n, 'GARDEN: ' + (sp ? sp.name : '?'));
          window.Snd.coin();
          pops.push({ x: tx, y: ty, t: 0, n: n });
          Garden.save();
          return;
        }
      }
    }

    for (let i = 0; i < GARD_POTS; i++) {
      const q = potAt(i);
      if (mx < q.x - 6 || mx > q.x + q.w + 6 || my < q.y - 60 || my > q.y + q.h + 6) continue;
      const p = Garden.st.pots[i];
      if (!p) {
        const sp = ownedSeeds()[seedIx % ownedSeeds().length];
        Garden.st.pots[i] = { sp: sp.id, planted: now, watered: now, grown: 0, acc: 0, tok: 0, wig: 0 };
        Garden.st.planted = (Garden.st.planted || 0) + 1;
        window.Snd.dig();
        window.Snd.pluck(PENTA[sp.note]);
        Garden.save();
        return;
      }
      if (canning) {
        p.watered = now;
        window.Snd.water();
        p.wig = 0.5;
        Garden.save();
        return;
      }
      /* poking a plant is the whole point of the app */
      const sp = speciesById(p.sp);
      p.wig = 1;
      if (sp) window.Snd.pluck(PENTA[sp.note] * (Garden.stage(p) === 3 ? 1 : 2));
      return;
    }
  });

  const paint = () => {
    if (!document.body.contains(cv)) {
      raf = null;
      
      GardenAir.stop();
      Garden.st.lastTick = Date.now();
      Garden.save();
      return;
    }
    raf = requestAnimationFrame(paint);
    const nowMs = performance.now();
    const dt = Math.min(0.1, (nowMs - t0) / 1000);
    t0 = nowMs;
    tsec += dt;
    Garden.tick();

    const now = Date.now();
    const light = gardenLight(now);
    const night = light < 0.34;

    g.drawImage(gardenSky(W, H, light), 0, 0);

    /* the ground. A hedge at the back, grass at the front, and a wooden
       rack of three shelves between the two posts. Everything is darkened
       by the same factor as the light, so dusk falls on all of it at once. */
    const gk = 0.35 + light * 0.65;
    const D = c => dimCol(c, gk);
    /* the hedge: a row of overlapping bumps, drawn in whole pixels */
    g.fillStyle = D('#3c5a2c');
    for (let x = -10; x < W + 20; x += 26) {
      const h = 26 + ((x * 37) % 18);
      g.fillRect(x, 118 - h, 30, h + 22);
    }
    g.fillStyle = D('#4e7038');
    for (let x = 4; x < W + 20; x += 26) {
      const h = 18 + ((x * 53) % 14);
      g.fillRect(x, 120 - h, 18, 6);
    }
    g.fillStyle = D('#2c4420');
    g.fillRect(0, 134, W, 8);
    /* grass at the foot of the rack */
    g.fillStyle = D('#4a6630');
    g.fillRect(0, H - 42, W, 42);
    g.fillStyle = D('#5c7a3c');
    g.fillRect(0, H - 42, W, 4);
    for (let x = 0; x < W; x += 7) {
      g.fillStyle = D((x % 14) ? '#3e5828' : '#628040');
      g.fillRect(x, H - 40 + ((x * 29) % 9), 2, 5);
    }
    /* the posts, then the shelves between them */
    g.fillStyle = D('#4a3a24');
    g.fillRect(14, 132, 12, H - 160);
    g.fillRect(W - 26, 132, 12, H - 160);
    g.fillStyle = D('#6b5434');
    g.fillRect(14, 132, 3, H - 160);
    g.fillRect(W - 26, 132, 3, H - 160);
    for (let row = 0; row < 3; row++) {
      const y = 150 + row * 96 + 46;
      g.fillStyle = D('#4a3a24');
      g.fillRect(14, y, W - 28, 9);
      g.fillStyle = D('#7a6038');
      g.fillRect(14, y, W - 28, 3);
      g.fillStyle = D('#2e2416');
      g.fillRect(14, y + 9, W - 28, 3);
    }

    const skin = potSkin();
    const wet = [];
    for (let i = 0; i < GARD_POTS; i++) {
      const q = potAt(i);
      const p = Garden.st.pots[i];
      const isWet = Garden.isWet(p, now);
      if (p && !isWet) wet.push(i);
      /* pot */
      drawPot(g, q.x, q.y, skin, 1.5, gk);
      if (!p) continue;
      const sp = speciesById(p.sp);
      const stage = Garden.stage(p);
      if (p.wig > 0) p.wig = Math.max(0, p.wig - dt * 2.2);
      drawPlant(g, q.cx, q.y + 5, sp, stage, tsec, 1.9, p.wig, night);
      /* a dry pot gets a small dotted marker, never a warning */
      if (!isWet) {
        g.fillStyle = 'rgba(220,200,140,0.85)';
        g.fillRect(q.x + q.w - 10, q.y - 8, 3, 3);
        g.fillRect(q.x + q.w - 6, q.y - 12, 3, 3);
        g.fillRect(q.x + q.w - 14, q.y - 12, 3, 3);
      }
      /* the tokens waiting on the shelf */
      for (let k = 0; k < (p.tok || 0); k++) {
        const tx = q.x + 4 + k * 9, ty = q.y + q.h + 4 + Math.round(Math.sin(tsec * 3 + k) * 1.5);
        drawSunToken(g, tx, ty, 9);
      }
    }

    /* dust in the light, or fireflies after dark */
    if (night) {
      flies.forEach(f => {
        f.p += dt * 1.4;
        const x = f.x + Math.cos(f.p) * f.r, y = f.y + Math.sin(f.p * 1.3) * f.r * 0.5;
        const a = 0.35 + 0.65 * Math.abs(Math.sin(f.p * 0.7));
        g.fillStyle = 'rgba(180,255,120,' + a.toFixed(2) + ')';
        g.fillRect(Math.round(x), Math.round(y), 2, 2);
        g.fillStyle = 'rgba(180,255,120,' + (a * 0.25).toFixed(2) + ')';
        g.fillRect(Math.round(x) - 2, Math.round(y) - 2, 6, 6);
      });
    } else {
      motes.forEach(m => {
        m.x += m.v * 0.6; m.y += Math.sin(tsec * 0.7 + m.s) * 0.18;
        if (m.x > W) { m.x = -4; m.y = Math.random() * H; }
        g.fillStyle = 'rgba(255,248,214,0.5)';
        g.fillRect(Math.round(m.x), Math.round(m.y), 2, 2);
      });
    }

    /* one leaf at a time, tumbling across */
    if (leaves.length < 2 && Math.random() < 0.004) {
      leaves.push({ x: -12, y: 60 + Math.random() * 240, r: 0, v: 24 + Math.random() * 30 });
    }
    for (let i = leaves.length - 1; i >= 0; i--) {
      const L = leaves[i];
      L.x += L.v * dt; L.y += Math.sin(L.x * 0.02) * 12 * dt; L.r += dt * 2.4;
      if (L.x > W + 20) { leaves.splice(i, 1); continue; }
      const w = Math.abs(Math.cos(L.r)) * 7 + 2;
      g.fillStyle = dimCol('#b8783a', gk);
      g.fillRect(Math.round(L.x), Math.round(L.y), Math.round(w), 4);
      g.fillStyle = dimCol('#d89a52', gk);
      g.fillRect(Math.round(L.x), Math.round(L.y), Math.round(w), 1);
    }

    /* the number that floats off a collected token */
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i];
      p.t += dt;
      if (p.t > 1.1) { pops.splice(i, 1); continue; }
      g.fillStyle = 'rgba(255,244,140,' + (1 - p.t / 1.1).toFixed(2) + ')';
      g.font = '16px "VT323", monospace';
      g.fillText('+' + p.n, p.x, p.y - p.t * 26);
    }

    /* a night vignette, so the fireflies have something to be bright against */
    if (night) {
      const a = (0.34 - light) / 0.34 * 0.45;
      g.fillStyle = 'rgba(6,8,24,' + a.toFixed(2) + ')';
      g.fillRect(0, 0, W, H);
    }

    if (info) {
      const tk = Garden.tokens();
      const dry = wet.length;
      const clock = Math.floor(((now % DAY_MS) / DAY_MS) * 24);
      info.textContent = canning
        ? 'CLICK A POT TO WATER IT'
        : (night ? 'NIGHT ' : 'DAY ') + String(clock).padStart(2, '0') + ':00  ' +
          tk + '/' + TOKEN_CAP + ' SUN  ' + (dry ? dry + ' DRY' : 'WATERED');
    }
  };

  GardenAir.start();
  raf = requestAnimationFrame(paint);
  /* lampDip(); */

    
    this._stockHandler = () => {
      const win = root.closest('.win');
      const btn = win && win.querySelector('.titlebar .t');
      if (!btn) return;
      btn.textContent = 'Garden [DELIVERY!]';
      setTimeout(() => { btn.textContent = 'Garden'; }, 3000);
    };
    window.addEventListener('garden-stock-refresh', this._stockHandler);

    this._raf = raf;
  },
  unmount() {
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._GardenAir) this._GardenAir.stop();
    window.removeEventListener('garden-stock-refresh', this._stockHandler);
  }
};
