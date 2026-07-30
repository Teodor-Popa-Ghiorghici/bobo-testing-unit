/* the one thing drinking in the bottle app never did was mean anything
   outside its own window. Now it leans on the whole screen: the tube
   itself blurs and swims in colour, worse with every measure, and eases
   back off as the level burns down. */
export const Drunk = {
  level: 0,
  raf: null,
  add(n) {
    this.level = Math.min(1, this.level + n);
    this._ensureLoop();
  },
  _ensureLoop() {
    if (this.raf) return;
    let last = performance.now();
    const tick = now => {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      this.level = Math.max(0, this.level - dt * 0.010);
      this._apply(now);
      if (this.level > 0.001) this.raf = requestAnimationFrame(tick);
      else { this.raf = null; this._clear(); }
    };
    this.raf = requestAnimationFrame(tick);
  },
  _apply(now) {
    const screen = document.getElementById('screen');
    const tube = document.getElementById('tube');
    if (!tube || !screen) return;
    /* the power on/off animation owns #tube's filter/transform for its
       own brief transition -- never fight it for those few frames */
    if (screen.classList.contains('collapsing') || screen.classList.contains('off')) return;
    const L = this.level;
    const hue = Math.sin(now / 900) * L * 14;
    const sat = 1 + L * 0.7 + Math.sin(now / 650) * L * 0.15;
    tube.style.filter = 'blur(' + (L * 1.5).toFixed(2) + 'px) saturate(' + sat.toFixed(2) +
      ') hue-rotate(' + hue.toFixed(1) + 'deg)';
  },
  _clear() {
    const tube = document.getElementById('tube');
    if (tube) tube.style.filter = '';
  }
};
window.Drunk = Drunk;
