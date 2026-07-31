/* Juice: hit-stop, directional screen shake, capped particles. §10.
   All offsets are snapped to whole pixels — no shimmering at pixel-art
   scale (§11). Shake respects an accessibility toggle (§10, required). */

const PARTICLE_CAP = 140;

export function createJuice(shakeEnabled) {
  return {
    shakeEnabled: shakeEnabled !== false,
    hitstopMs: 0,
    shakeDirX: 0, shakeDirY: 0, shakeMag: 0, shakeTime: 0, shakeElapsed: 0,
    shakeX: 0, shakeY: 0,
    particles: [],

    setShakeEnabled(on) { this.shakeEnabled = on; },

    triggerHitstop(ms) { this.hitstopMs = Math.max(this.hitstopMs, ms); },

    /* dirX/dirY: unit-ish vector along the hit, e.g. (1,0) for a rightward
       punch, (0,1) for a downward slam — never randomized. */
    triggerShake(dirX, dirY, mag, durationMs) {
      if (!this.shakeEnabled) return;
      const len = Math.hypot(dirX, dirY) || 1;
      this.shakeDirX = dirX / len;
      this.shakeDirY = dirY / len;
      this.shakeMag = mag;
      this.shakeTime = durationMs / 1000;
      this.shakeElapsed = 0;
    },

    spawnBurst(x, y, color, count, speed, dirX, dirY) {
      const dx = dirX == null ? 0 : dirX;
      const dy = dirY == null ? -1 : dirY;
      const base = Math.atan2(dy, dx);
      for (let i = 0; i < count && this.particles.length < PARTICLE_CAP; i++) {
        const ang = base + (Math.random() - 0.5) * 1.6;
        const spd = speed * (0.5 + Math.random() * 0.8);
        this.particles.push({
          x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
          life: 0, maxLife: 0.2 + Math.random() * 0.22,
          color, size: Math.random() < 0.5 ? 2 : 1
        });
      }
    },

    /* returns true while the sim should stay frozen on a hit-stop frame */
    update(dtMs) {
      if (this.hitstopMs > 0) {
        this.hitstopMs = Math.max(0, this.hitstopMs - dtMs);
        return true;
      }
      const dt = dtMs / 1000;
      if (this.shakeTime > 0) {
        this.shakeElapsed += dt;
        const t = Math.min(1, this.shakeElapsed / this.shakeTime);
        const k = this.shakeMag * (1 - t) * (1 - t);
        this.shakeX = Math.round(this.shakeDirX * k);
        this.shakeY = Math.round(this.shakeDirY * k);
        if (t >= 1) { this.shakeTime = 0; this.shakeX = 0; this.shakeY = 0; }
      }
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life += dt;
        if (p.life >= p.maxLife) { this.particles.splice(i, 1); continue; }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 340 * dt;
      }
      return false;
    }
  };
}
