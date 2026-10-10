/* Where desktop icons go: whole cells of one grid, from the same (8, 8) origin every layout function uses, so
   nothing can end up between two cells. Pure (no DOM), so `node scripts/check-desk.mjs` can hold it to its
   numbers.

   The old placement asked, for every icon, "which cells are taken?" by walking all the icons, and walked outward
   from its cell ring by ring through every cell of each ring when the desk was full; with two hundred icons that
   was the whole of a redraw. Now one occupancy map is built once and each icon is one lookup, and an outward search
   visits only the border of each ring. A desk with more icons than cells piles the extras in the last cell, each a
   few pixels off the one under it, instead of hiding them all at the same point. */
export const ICON_W = 84, ICON_H = 78, ORIGIN = 8, PILE_STEP = 5, PILE_MAX = 7;

export const gridOf = (w, h) => ({
  cols: Math.max(1, Math.floor((w - ORIGIN) / ICON_W)),
  rows: Math.max(1, Math.floor((h - ORIGIN) / ICON_H))
});
/* the default slot of the i-th icon: down a column, then the next */
export const slotOf = (i, h) => {
  const rows = Math.max(1, Math.floor((h - 12) / ICON_H));
  return { x: ORIGIN + Math.floor(i / rows) * ICON_W, y: ORIGIN + (i % rows) * ICON_H };
};
export const cellOf = (x, y) => ({ c: Math.round((x - ORIGIN) / ICON_W), r: Math.round((y - ORIGIN) / ICON_H) });
export const cellPos = (c, r) => ({ x: ORIGIN + c * ICON_W, y: ORIGIN + r * ICON_H });
const key = (c, r) => c + ',' + r;

/* ---- zones: a new desk is not one column down the left, it is four neighbourhoods and a bin ----------------------------------
   TOOLS top left, FILES (what you make and import) next to them, GAMES top right, DOCS bottom left (the machine's own papers),
   the bin in the bottom right corner. Each zone is a block of cells that fills left to right, then down; a zone that is
   full spills into the nearest free cell like anything else. Icons that already have a place keep it. */
export const GAMES = new Set(['Magen', 'TheCook', 'Garden', 'StandBattleArena', 'DungeonSweeper', 'Sweeper', 'Solitaire', 'Jaeger', 'Bekkedal', 'Elephant', 'AfterEgypt']);
export const DOCS = new Set(['AutoExec.HC', 'Welcome.DD', 'Adam', 'Compiler']);
export const TOOLS = new Set(['TERMINAL', 'Trophies', 'Notes', 'HolyC', 'Garage', 'TheStack', 'Crayon', 'MyDrawings', 'Dave', 'TrophyBox']);
export function zoneOf(it) {
  if (it.type === 'bin' || it.type === 'binfull') return 'bin';
  if (GAMES.has(it.name)) return 'games';
  if (TOOLS.has(it.name) || it.type === 'terminal') return 'tools';
  if (DOCS.has(it.name)) return 'docs';
  return 'files';
}
/* the first cell of each zone and how wide it is, for a grid of cols x rows */
export function zoneBox(zone, cols, rows) {
  const w = Math.max(1, Math.min(cols, zone === 'games' ? 3 : zone === 'tools' ? 2 : zone === 'docs' ? 3 : 4));
  switch (zone) {
    case 'games': return { c0: Math.max(0, cols - w), r0: 0, w };
    case 'tools': return { c0: 0, r0: 0, w };
    case 'docs':  return { c0: 0, r0: Math.max(0, rows - 2), w };
    case 'bin':   return { c0: cols - 1, r0: rows - 1, w: 1 };
    default:      return { c0: Math.min(cols - 1, 3), r0: 0, w };
  }
}
/* the n-th cell of a zone, left to right then down */
export const zoneCell = (zone, n, cols, rows) => { const b = zoneBox(zone, cols, rows); return { c: b.c0 + (n % b.w), r: b.r0 + Math.floor(n / b.w) }; };

/* the nearest free cell to (c0, r0) inside the grid, ring by ring (the border of each ring only); null if there is none */
export function nearestFree(taken, c0, r0, cols, rows) {
  const free = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows && !taken.has(key(c, r));
  if (free(c0, r0)) return { c: c0, r: r0 };
  const reach = Math.max(c0, cols - 1 - c0) + Math.max(r0, rows - 1 - r0);
  for (let ring = 1; ring <= reach; ring++) {
    for (let d = -ring; d <= ring; d++) {
      if (free(c0 + d, r0 - ring)) return { c: c0 + d, r: r0 - ring };
      if (free(c0 + d, r0 + ring)) return { c: c0 + d, r: r0 + ring };
    }
    for (let d = -ring + 1; d <= ring - 1; d++) {
      if (free(c0 - ring, r0 + d)) return { c: c0 - ring, r: r0 + d };
      if (free(c0 + ring, r0 + d)) return { c: c0 + ring, r: r0 + d };
    }
  }
  return null;
}

/* Lay a list out. items: [{ name }] in desk order; stored: name -> { x, y } where each was last (or nothing);
   arrivals: spots for newcomers dropped from a window (consumed in order); dims: { w, h } of the desktop.
   Icons that already have a place keep it before any newcomer is placed, so a new file never bumps an old one.
   Returns Map name -> { x, y }. */
export function layout(items, stored, arrivals, dims) {
  const { cols, rows } = gridOf(dims.w, dims.h);
  const taken = new Set(), out = new Map(), want = new Map();
  const clampCell = p => { const c = cellOf(p.x, p.y); return { c: Math.max(0, Math.min(cols - 1, c.c)), r: Math.max(0, Math.min(rows - 1, c.r)) }; };
  const arr = arrivals ? arrivals.slice() : [];
  const needs = [], zn = {}, zslot = [];
  items.forEach((it, i) => { const z = zoneOf(it); zslot[i] = zoneCell(z, zn[z] = (zn[z] == null ? 0 : zn[z] + 1), cols, rows); });
  items.forEach((it, i) => {
    const st = stored[it.name];
    if (st) {
      const w = clampCell(st);
      if (!taken.has(key(w.c, w.r))) { taken.add(key(w.c, w.r)); out.set(it.name, cellPos(w.c, w.r)); return; }
      want.set(it.name, w);
    }
    needs.push([it, i]);
  });
  let piled = 0;
  needs.forEach(([it, i]) => {
    const w = want.get(it.name) || (arr.length ? clampCell(arr.shift()) : { c: Math.min(cols - 1, zslot[i].c), r: Math.min(rows - 1, zslot[i].r) });
    const cell = nearestFree(taken, w.c, w.r, cols, rows);
    if (cell) { taken.add(key(cell.c, cell.r)); out.set(it.name, cellPos(cell.c, cell.r)); return; }
    const p = cellPos(cols - 1, rows - 1), k = (piled++ % (PILE_MAX + 1)) * PILE_STEP;
    out.set(it.name, { x: p.x - k, y: p.y - k });
  });
  return out;
}
