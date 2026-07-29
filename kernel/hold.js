import { Vol } from './hardware.js';
export const Hold = {
  raf: null, phase: 0, last: 0,
  v() { return ((Vol.vhold == null ? 5 : Vol.vhold) - 5) / 5; },
  h() { return ((Vol.hhold == null ? 5 : Vol.hhold) - 5) / 5; },
  locked() { return Math.abs(this.v()) < 0.01 && Math.abs(this.h()) < 0.01; },
  apply() {
    const shell = document.getElementById('shell');
    const tear = document.getElementById('tear');
    if (!shell) return;
    if (this.locked()) {
      shell.style.transform = '';
      if (tear) tear.style.display = 'none';
      if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
      return;
    }
    if (!this.raf) {
      this.last = performance.now();
      const loop = now => {
        this.raf = requestAnimationFrame(loop);
        const dt = Math.min(64, now - this.last);
        this.last = now;
        this.tick(dt);
      };
      this.raf = requestAnimationFrame(loop);
    }
  },
  tick(dt) {
    const shell = document.getElementById('shell');
    const tear = document.getElementById('tear');
    if (!shell) return;
    const host = document.getElementById('tube');
    const H = (host && host.clientHeight) || shell.clientHeight || 400;
    const v = this.v(), h = this.h();
    this.phase += (dt / 1000) * v * H * 0.55;
    if (this.phase > H) this.phase -= H * 2;
    if (this.phase < -H) this.phase += H * 2;

    /* horizontal hold slipping is a steady offset plus a little shear */
    const hx = h * 46;
    const shear = h * 3.2 + Math.sin(performance.now() / 90) * Math.abs(h) * 1.1;
    shell.style.transform =
      'translate(' + hx.toFixed(1) + 'px,' + this.phase.toFixed(1) + 'px) skewX(' + shear.toFixed(2) + 'deg)';

    if (tear) {
      if (Math.abs(v) < 0.01) { tear.style.display = 'none'; return; }
      tear.style.display = 'block';
      const y = ((this.phase % H) + H) % H;
      tear.style.top = (y - 10) + 'px';
      tear.style.opacity = String(Math.min(1, Math.abs(v) * 1.6));
    }
  }
};
window.Hold = Hold;