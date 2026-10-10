/* THE DESKTOP, MOVING. A live wallpaper is a picture that is painted a few times a second instead of loaded: the Garden's five rooms with nothing growing in them
   (apps/garden/wall.js: HOLYC.EXE's quiet gift 'garden_wall', kernel/buffs_core.js). It is a canvas behind the icons, the same place and the same fit as the machine's video wallpaper
   (kernel/wallpaper.js), painted at the room's own size and scaled up with hard pixels. It keeps still while the set is off or the page is hidden, and draws twenty times a second, not
   sixty: a wallpaper is something to look at, not something to spend a fan on. */
import { CRT } from './hardware.js';

const FPS = 20;
let cv = null, raf = 0, last = 0, wall = null, token = 0;

export const LiveWall = {
  room: () => (wall ? wall.room : null),
  async start(room) {
    this.stop();
    const desk = document.getElementById('desktop');
    if (!desk) return false;
    const mine = ++token;
    let mod;
    try { mod = await import('../apps/garden/wall.js'); } catch (e) { return false; }
    if (mine !== token) return false;                                            /* another one was asked for while this one loaded */
    wall = mod.createWall(room);
    cv = document.createElement('canvas');
    cv.id = 'livewall'; cv.width = wall.w; cv.height = wall.h;
    cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;image-rendering:pixelated;z-index:0;pointer-events:none';
    desk.insertBefore(cv, desk.firstChild);
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    const t0 = performance.now(); last = 0;
    const loop = ts => {
      if (!cv || !document.body.contains(cv)) { raf = 0; return; }
      raf = requestAnimationFrame(loop);
      if (ts - last < 1000 / FPS - 2 || !CRT.on || document.hidden) return;
      const dt = last ? Math.min(0.2, (ts - last) / 1000) : 0.05;
      last = ts;
      try { wall.paint(g, (ts - t0) / 1000 + 1000, dt, Date.now()); } catch (e) { /* a frame that would not paint is not worth stopping for */ }
    };
    raf = requestAnimationFrame(loop);
    return true;
  },
  stop() {
    token++;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (cv && cv.parentNode) cv.parentNode.removeChild(cv);
    cv = null; wall = null;
  }
};
