export default {
  id: 'aftere',
  title: 'AfterEgypt',
  width: 460,
  height: 360,
  resizable: true,
  mount(root, ctx) {
    const VGA16 = [
      [0,0,0],      [0,0,170],    [0,170,0],    [0,170,170],
      [170,0,0],    [170,0,170],  [170,85,0],   [170,170,170],
      [85,85,85],   [85,85,255],  [85,255,85],  [85,255,255],
      [255,85,85],  [255,85,255], [255,255,85], [255,255,255]
    ];
    const PHOS_GLOW = [0.75, 0.40, 0.20, 0.05];
    const phosLevel = () => window.CRT ? PHOS_GLOW[window.CRT.phos || 0] : 0.75;

    const wrap = document.createElement('div');
    wrap.className = 'gamepane';
    const cv = document.createElement('canvas');
    cv.width = 320; cv.height = 200;
    cv.className = 'gamecv';
    cv.tabIndex = 0;
    wrap.appendChild(cv);
    const bar = document.createElement('div');
    bar.className = 'appbar';
    const info = document.createElement('span');
    info.className = 'godword';
    info.textContent = 'ARROWS OR MOUSE. REACH THE TEMPLE.';
    bar.appendChild(info);
    root.appendChild(wrap);
    root.appendChild(bar);
    
    const g = cv.getContext('2d');
    if (!g) { info.textContent = 'NO CANVAS.'; return; }
    
    const C = i => { const p = VGA16[i]; return 'rgb(' + p[0] + ',' + p[1] + ',' + p[2] + ')'; };
    const S = { y: 100, vy: 0, dist: 0, goal: 2600, dead: false, won: false, t: 0 };
    let pillars = [];
    const keys = Object.create(null);
    let alive = true;
    
    const reset = () => {
      S.y = 100; S.vy = 0; S.dist = 0; S.dead = false; S.won = false; S.t = 0;
      pillars = [];
      for (let i = 0; i < 7; i++) pillars.push({ x: 340 + i * 90, gap: 60 + Math.random() * 70, h: 44 + Math.random() * 24 });
    };
    reset();
    
    cv.addEventListener('keydown', e => {
      keys[e.key] = true;
      if (e.key === ' ' || e.key.indexOf('Arrow') === 0) e.preventDefault();
      if ((S.dead || S.won) && (e.key === ' ' || e.key === 'Enter')) { reset(); if (window.Snd) window.Snd.ok(); }
    });
    cv.addEventListener('keyup', e => { keys[e.key] = false; });
    cv.addEventListener('mousemove', e => {
      const r = cv.getBoundingClientRect();
      S.y = Math.max(10, Math.min(190, (e.clientY - r.top) / r.height * 200));
      S.vy = 0;
    });
    cv.addEventListener('mousedown', ev => { ev.stopPropagation(); cv.focus(); if (S.dead || S.won) reset(); });
    wrap.addEventListener('mousedown', () => setTimeout(() => cv.focus(), 0));
    setTimeout(() => cv.focus(), 30);
    
    const stars = [];
    for (let i = 0; i < 40; i++) stars.push({ x: Math.random() * 320, y: Math.random() * 200, s: 0.4 + Math.random() * 1.6 });
    
    const state = { raf: null };
    
    const frame = () => {
      if (!alive || !document.body.contains(cv)) { alive = false; return; }
      state.raf = requestAnimationFrame(frame);
      S.t++;
      if (!S.dead && !S.won) {
        if (keys.ArrowUp || keys.w) S.vy -= 0.55;
        if (keys.ArrowDown || keys.s) S.vy += 0.55;
        S.vy *= 0.90;
        S.vy += 0.10;                                  
        S.y += S.vy;
        if (S.y < 8) { S.y = 8; S.vy = 0; }
        if (S.y > 192) { S.y = 192; S.vy = 0; }
        S.dist += 2.4;
        if (S.dist >= S.goal) {
          S.won = true;
          if (window.Snd) window.Snd.holy();
          if (window.Economy) window.Economy.earn(50, 'AFTEREGYPT: THE THIRD TEMPLE');
        }
        pillars.forEach(p => {
          p.x -= 2.4;
          if (p.x < -30) { p.x += 7 * 90; p.gap = 55 + Math.random() * 75; p.h = 40 + Math.random() * 30; }
          if (!S.won && p.x < 46 && p.x > 14) {
            const top = 100 - p.gap / 2, bot = 100 + p.gap / 2;
            if (S.y < top || S.y > bot) { 
              S.dead = true; 
              if (window.Snd) { window.Snd.err(); window.Snd.thunk(); }
            }
          }
        });
      }
      
      g.fillStyle = 'rgba(0,0,0,' + (0.30 + (1 - phosLevel()) * 0.6) + ')';
      g.fillRect(0, 0, 320, 200);
      stars.forEach(s => {
        if (!S.dead && !S.won) s.x -= s.s;
        if (s.x < 0) { s.x = 320; s.y = Math.random() * 200; }
        g.fillStyle = s.s > 1.2 ? C(15) : C(8);
        g.fillRect(s.x | 0, s.y | 0, 1, 1);
      });
      
      g.fillStyle = C(6);
      g.fillRect(0, 186, 320, 14);
      g.fillStyle = C(14);
      for (let x = 0; x < 320; x += 8) g.fillRect(x, 186 + ((x + (S.dist | 0)) % 3), 3, 1);
      
      pillars.forEach(p => {
        const top = 100 - p.gap / 2, bot = 100 + p.gap / 2;
        g.fillStyle = C(7);
        g.fillRect(p.x, 0, 16, top);
        g.fillRect(p.x, bot, 16, 200 - bot);
        g.fillStyle = C(15);
        g.fillRect(p.x, 0, 3, top);
        g.fillRect(p.x, bot, 3, 200 - bot);
        g.fillStyle = C(8);
        g.fillRect(p.x + 13, 0, 3, top);
        g.fillRect(p.x + 13, bot, 3, 200 - bot);
        g.fillStyle = C(14);
        g.fillRect(p.x - 2, top - 5, 20, 5);
        g.fillRect(p.x - 2, bot, 20, 5);
      });
      
      const tx = 330 + (S.goal - S.dist) * 0.42;
      if (tx < 330) {
        g.fillStyle = C(14);
        for (let s = 0; s < 5; s++) g.fillRect(tx - s * 6, 150 - s * 8, 12 + s * 12, 8);
        g.fillRect(tx + 10, 100, 4, 12);
        g.fillRect(tx + 6, 103, 12, 4);
        g.fillStyle = C(3);
        g.fillRect(tx - 6, 158, 48, 28);
        g.fillStyle = C(7);
        for (let c = 0; c < 5; c++) g.fillRect(tx - 4 + c * 10, 158, 5, 28);
      }
      
      if (!S.dead) {
        g.fillStyle = C(11);
        g.fillRect(22, S.y - 2, 14, 4);
        g.fillStyle = C(15);
        g.fillRect(34, S.y - 1, 4, 2);
        g.fillStyle = C(12);
        g.fillRect(16, S.y - 1, 6, 2);
        if (S.t % 3) { g.fillStyle = C(14); g.fillRect(12, S.y, 4, 1); }
      } else {
        g.fillStyle = C(4 + (S.t >> 2) % 2 * 8);
        g.fillRect(20, S.y - 4, 16, 8);
      }
      
      g.fillStyle = C(15);
      g.font = '10px monospace';
      const pct = Math.min(100, Math.round(S.dist / S.goal * 100));
      g.fillText('TO THE TEMPLE ' + pct + '%', 6, 12);
      if (S.dead) { g.fillStyle = C(12); g.fillText('YOU DID NOT ARRIVE. SPACE TO TRY AGAIN.', 30, 100); }
      if (S.won) { g.fillStyle = C(14); g.fillText('YOU REACHED THE THIRD TEMPLE.', 60, 100); }
    };
    
    state.raf = requestAnimationFrame(frame);
    this._state = state;
  },
  unmount() {
    if (this._state && this._state.raf) cancelAnimationFrame(this._state.raf);
  }
};
