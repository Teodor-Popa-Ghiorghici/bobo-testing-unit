/* THE GARDEN'S ROOMS, ALIVE: the quiet gift from HOLYC.EXE (kernel/buffs_core.js 'garden_wall'). The five rooms painted exactly as the garden paints them (the same stages, the same
   light and weather and season, the sky going over, the sun and moon crossing it, the rain, the fireflies, the lamps), but with nothing growing in them: no pots, no plants, no rack to
   stand them on, no flowers in the grass. kernel/wallpaper_live.js puts one on the desktop and calls `paint` a few times a second; it is a picture that moves, not a window, so it
   has no buttons, no tabs and no sound. Nothing here changes the garden. */
import { stageOf } from './stages.js';
import { W, H, layer, lighting, seasonOf } from './stage_kit.js';
import { createFx, rainAt, flashAt, windAt, drawRain, vignette } from './fx.js';
import * as M from './model.js';
import { ROOM_DEFS } from './rooms.js';

export const ROOMS = ROOM_DEFS.map(d => ({ id: d.id, name: d.name }));
export const SIZE = { w: W, h: H };

/* `room` is a room id; paint(g, tsec, dt, now) draws one frame onto a W x H canvas */
export function createWall(room) {
  const S = stageOf(room), fx = createFx();
  return {
    w: W, h: H, room: room,
    paint(g, tsec, dt, now) {
      now = now == null ? Date.now() : now;
      const light = M.light(now), night = light < 0.34, gk = S.gk(light), L = lighting(gk);
      const rain = rainAt(now) * S.rain, K = { V: null, wall: true, g, L, gk, light, night, tsec, dt, rain, wind: windAt(tsec, now) * S.wind, drip: false, now, season: seasonOf() };
      if (S.under) { g.fillStyle = '#05060a'; g.fillRect(0, 0, W, H); S.under(g, K); }
      g.drawImage(layer('wall:' + room + ':' + (S.still ? 0 : Math.round(light * 22)) + ':' + (rain > 0.1 ? 'w' : 'd') + ':' + K.season, lg => S.back(lg, Object.assign({}, K, { rain: rain > 0.1 ? 1 : 0 }))), 0, 0);
      S.live(g, K);
      S.front(g, K);
      if (S.rain) drawRain(fx, g, K, S.floor);
      if (night) { const a = S.dark ? S.dark(light) : (0.34 - light) / 0.34 * 0.45; g.fillStyle = 'rgba(6,8,24,' + Math.max(0, a).toFixed(2) + ')'; g.fillRect(0, 0, W, H); }
      S.lights(g, K);
      const fl = flashAt(now, rain);
      if (fl > 0.02) { g.fillStyle = 'rgba(220,230,255,' + (fl * 0.32).toFixed(2) + ')'; g.fillRect(0, 0, W, H); }
      vignette(g, 0.25 + (night ? 0.3 : 0) + rain * 0.15);
    }
  };
}
