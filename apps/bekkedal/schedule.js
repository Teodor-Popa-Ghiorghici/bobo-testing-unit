/* Bekkedal — where everybody is.
 *
 * Pure functions of `(npc, day, minuteOfDay, ctx)`, same convention as
 * seasons.js/quests.js: nothing here is seeded, nothing here is saved, and
 * nothing here mutates `npc` or `ctx`. index.js's npcsHere() calls
 * positionFor() once per NPC per frame and reads the result straight off —
 * it never stores a schedule result back onto S.
 *
 * An NPC's `posts` (BEK_NPCS[].posts, data.js) is a small ordered list of
 * named places: `{ id, map, x, y, from, to, weather?, season?, flag? }`.
 * `from`/`to` are minutes-of-day (0..1440); `to < from` means the window
 * wraps past midnight, the same way index.js's own dawn()/dusk()/night()
 * windows do. A post with none of `weather`/`season`/`flag` is a *default*:
 * eligible whenever the hour matches. One with one of them is an *override*:
 * eligible only when that condition also holds, and always checked ahead of
 * the defaults — see `GROUPS` below. Overrides replace a default's window,
 * they never add to it, which is what keeps every NPC's defaults alone
 * already covering all 1440 minutes of a day: nothing here can open a gap
 * the check doesn't already catch (`schedule_check.js`'s coverage pass).
 *
 * A festival is the one override that can move an NPC to a different map
 * outright (the town square), and a story flag can too (Håkon's pen once
 * it's built) — both are instant, not walked: the switch always lands at
 * the very start of the override's own window, which for the flag case is
 * the same hour the NPC already turns over at, and for the festival case is
 * mid-morning, well before the player is likely watching every one of the
 * eight at once. Only a same-map turnover — the common case, home to a day
 * post and back — is ever animated as a walk. See positionFor() below.
 */
import { BEK_MAPS, BEK_SOLID, mapCols, mapRows } from './data.js';
import { seasonOf, isFestivalDay } from './seasons.js';

const DAY_MIN = 24 * 60;
const clampMin = m => ((Math.floor(m) % DAY_MIN) + DAY_MIN) % DAY_MIN;

/* whichever of the four conditions a post carries, or null for a default —
   also GROUPS' own iteration order, festival first */
function kindOf(post) {
  return post.festival ? 'festival' : post.season ? 'season' : post.weather ? 'weather' : post.flag ? 'flag' : null;
}
const GROUPS = ['festival', 'season', 'weather', 'flag', null];

function hourMatch(post, minute) {
  return post.from <= post.to ? (minute >= post.from && minute < post.to)
                               : (minute >= post.from || minute < post.to);
}
function flagOn(ctx, name) {
  if (!ctx) return false;
  if (name === 'act2Unlocked') return !!ctx.act2Unlocked;
  return !!(ctx.flag && ctx.flag[name]);
}
function conditionMet(post, day, ctx) {
  if (post.festival) return isFestivalDay(day);
  if (post.season) return seasonOf(day).id === post.season;
  if (post.weather) return (ctx && ctx.weather) === post.weather;
  if (post.flag) return flagOn(ctx, post.flag);
  return true;
}

/* the post active for `npc` at this instant — never null when `npc.posts`
   is authored to cover the full day, which schedule_check.js's coverage
   pass exists to catch if it ever is not */
export function activePost(npc, day, minute, ctx) {
  const min = clampMin(minute), posts = npc.posts;
  for (const g of GROUPS) {
    for (let i = 0; i < posts.length; i++) {
      const p = posts[i];
      if (kindOf(p) !== g) continue;
      if (hourMatch(p, min) && conditionMet(p, day, ctx)) return p;
    }
  }
  return posts[posts.length - 1];
}

/* ---- walking between two posts on the same map --------------------------
   A short BFS over the map's own solid tiles (the same question solid() in
   index.js asks: a door is knocked on, not walked through). Memoised by
   npc/post-pair, since a pair of posts never moves — there is no reason to
   re-walk the same corridor every frame it is asked about. */
const pathCache = new Map();
function walkable(mp, x, y) {
  if (x < 0 || y < 0 || x >= mapCols(mp) || y >= mapRows(mp)) return false;
  const c = BEK_MAPS[mp].rows[y].charAt(x);
  return c !== 'D' && BEK_SOLID.indexOf(c) < 0;
}
function bfsPath(mp, fx, fy, tx, ty) {
  if (fx === tx && fy === ty) return [[fx, fy]];
  const seen = new Set([fx + ',' + fy]);
  const prev = new Map();
  let front = [[fx, fy]];
  while (front.length) {
    const next = [];
    for (const [x, y] of front) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
        if (seen.has(k) || !walkable(mp, nx, ny)) continue;
        seen.add(k); prev.set(k, x + ',' + y);
        if (nx === tx && ny === ty) {
          const path = [[nx, ny]];
          let cur = k;
          while (cur !== fx + ',' + fy) { cur = prev.get(cur); const [px, py] = cur.split(',').map(Number); path.push([px, py]); }
          return path.reverse();
        }
        next.push([nx, ny]);
      }
    }
    front = next;
  }
  return null;                                     /* no path — caller falls back to a straight jump */
}
function pathBetween(mp, from, to) {
  const key = mp + ':' + from.id + '->' + to.id;
  let p = pathCache.get(key);
  if (p === undefined) { p = bfsPath(mp, from.x, from.y, to.x, to.y) || [[from.x, from.y], [to.x, to.y]]; pathCache.set(key, p); }
  return p;
}

const MIN_PER_TILE = 2;                              /* game-minutes to cross one tile, on foot     */
const MAX_WALK_MIN = 24;                             /* a longer corridor still arrives inside this */

/* the current post's own predecessor — the post that was active one minute
   before this one's window opened, under the *same* day/ctx (weather and
   season never change mid-day, so this is stable within one day and is
   never asked to reach across a day boundary) */
function prevPostOf(npc, day, cur, ctx) {
  return activePost(npc, day, clampMin(cur.from - 1), ctx);
}

/* `{ map, x, y, walking, dir }` — dir is 0 down / 1 up / 2 left / 3 right,
   the same convention index.js's own S.dir uses, so a walking NPC can be
   drawn with actors.js's real walk cycle instead of standing still. A post
   change onto a *different* map (a festival, or a story flag opening a new
   one) is never interpolated — see the module comment above. */
export function positionFor(npc, day, minute, ctx) {
  const min = clampMin(minute);
  const cur = activePost(npc, day, min, ctx);
  const prev = prevPostOf(npc, day, cur, ctx);
  if (prev === cur || prev.map !== cur.map) return { map: cur.map, x: cur.x, y: cur.y, walking: false, dir: 0 };
  const path = pathBetween(cur.map, prev, cur);
  const total = Math.min(MAX_WALK_MIN, (path.length - 1) * MIN_PER_TILE);
  const elapsed = clampMin(min - cur.from);
  if (path.length <= 1 || total <= 0 || elapsed >= total) return { map: cur.map, x: cur.x, y: cur.y, walking: false, dir: 0 };
  const idx = Math.min(path.length - 1, Math.floor((elapsed / total) * path.length));
  const [x, y] = path[idx];
  const [nx, ny] = path[Math.min(path.length - 1, idx + 1)];
  const dx = nx - x, dy = ny - y;
  const dir = dy < 0 ? 1 : dy > 0 ? 0 : dx < 0 ? 2 : dx > 0 ? 3 : 0;
  return { map: cur.map, x, y, walking: true, dir };
}

/* a continuous 0..3 walk-cycle phase off the minute clock alone, so a
   walking NPC's legs move without index.js having to hand this module a
   frame timer it otherwise has no use for */
export function walkStep(minute) {
  return Math.floor(clampMin(minute) * 3) % 4;
}
