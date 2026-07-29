import { godDoodle, godRand, VGA16 } from './god.js';
import { CRT, phosLevel, splashGone } from './hardware.js';

export const Saver = {
  idle: 0, on: false, raf: null, cv: null, mode: 0, t: 0, stars: [],
  IDLE_MS: 90000,
  start() {
    if (this.on || !CRT.on || !splashGone()) return;
    this.on = true;
    this.mode = godRand(2);
    const cv = document.createElement('canvas');
    cv.id = 'saver';
    const scr = document.getElementById('tube');
    const r = scr.getBoundingClientRect();
    cv.width = Math.max(160, Math.round(r.width / 2));
    cv.height = Math.max(120, Math.round(r.height / 2));
    scr.appendChild(cv);
    this.cv = cv;
    this.t = 0;
    this.stars = [];
    for (let i = 0; i < 160; i++) {
      this.stars.push({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: Math.random() });
    }
    const g = cv.getContext('2d');
    if (g) { g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height); }
    const loop = () => {
      if (!this.on) return;
      this.raf = requestAnimationFrame(loop);
      this.frame();
    };
    this.raf = requestAnimationFrame(loop);
  },
  frame() {
    const cv = this.cv;
    if (!cv) return;
    const g = cv.getContext('2d');
    if (!g) return;
    const W = cv.width, H = cv.height;
    this.t++;
    if (this.mode === 0) {
      g.fillStyle = 'rgba(0,0,0,' + (0.12 + (1 - phosLevel()) * 0.5) + ')';
      g.fillRect(0, 0, W, H);
      this.stars.forEach(s => {
        s.z -= 0.006;
        if (s.z <= 0.02) { s.z = 1; s.x = (Math.random() - 0.5) * 2; s.y = (Math.random() - 0.5) * 2; }
        const x = W / 2 + (s.x / s.z) * W / 3;
        const y = H / 2 + (s.y / s.z) * H / 3;
        if (x < 0 || y < 0 || x > W || y > H) return;
        const b = 1 - s.z;
        const p = VGA16[b > 0.8 ? 15 : b > 0.55 ? 11 : b > 0.3 ? 9 : 8];
        g.fillStyle = 'rgb(' + p[0] + ',' + p[1] + ',' + p[2] + ')';
        const sz = b > 0.75 ? 2 : 1;
        g.fillRect(x | 0, y | 0, sz, sz);
      });
      if (this.t % 400 === 0) {
        g.fillStyle = 'rgb(255,255,85)';
        g.fillRect(W / 2 - 2, H / 2 - 12, 4, 26);
        g.fillRect(W / 2 - 10, H / 2 - 6, 20, 4);
      }
    } else {
      if (this.t % 90 === 1) godDoodle(cv);
      g.fillStyle = 'rgba(0,0,0,0.012)';
      g.fillRect(0, 0, W, H);
    }
  },
  stop() {
    if (!this.on) return;
    this.on = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.cv && this.cv.parentNode) this.cv.parentNode.removeChild(this.cv);
    this.cv = null;
  },
  poke() {
    this.idle = Date.now();
    if (this.on) { this.stop(); Snd.click(); }
  },
  watch() {
    this.idle = Date.now();
    ['pointerdown', 'pointermove', 'keydown', 'wheel'].forEach(t =>
      window.addEventListener(t, () => this.poke(), true));
    setInterval(() => {
      if (!this.on && CRT.on && splashGone() && Date.now() - this.idle > this.IDLE_MS) this.start();
    }, 4000);
  }
};

window.Saver = Saver;
