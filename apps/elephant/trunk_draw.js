/* Painting the trunk of trunk.js: a tube, a pixel at a time, in the machine's colours (VGA16 indices: 0 the hard black edge, 7 the grey, 8 the shade, 15 the light).
   For every pixel near the line: how far it is from the nearest part of it (a signed distance, negative inside), and which way that part faces. A pixel just outside is
   the black edge; inside, the side that faces the light (up and left, as on the rest of him) gets a white patch near the root, the side that faces away gets the shade, and
   a dark ring goes round every ten pixels of its length, which is what the slabs' dark undersides used to say. `R(x, y, w, h, colour)` fills a rectangle. */
const LX = -0.62, LY = -0.78;                /* the light, from the upper left */
const RIB = 10, RIB_AT = 5, RIB_W = 1.7;      /* a ring every 10 px of trunk, starting 5 px from the root, 1.7 px thick */

export function drawTube(R, tube, o) {
  const pts = tube.pts, rad = tube.rad, n = pts.length - 1, len = tube.len;
  const clipTop = o && o.clipTop != null ? o.clipTop : -1e9;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i <= n; i++) {
    x0 = Math.min(x0, pts[i].x - rad[i] - 2); x1 = Math.max(x1, pts[i].x + rad[i] + 2);
    y0 = Math.min(y0, pts[i].y - rad[i] - 2); y1 = Math.max(y1, pts[i].y + rad[i] + 2);
  }
  x0 = Math.floor(x0); x1 = Math.ceil(x1); y0 = Math.max(Math.floor(y0), Math.ceil(clipTop)); y1 = Math.ceil(y1);
  /* per segment: its box, so a row only asks the segments it can touch */
  const box = [];
  for (let j = 0; j < n; j++) {
    const m = Math.max(rad[j], rad[j + 1]) + 2;
    box.push([Math.min(pts[j].y, pts[j + 1].y) - m, Math.max(pts[j].y, pts[j + 1].y) + m]);
  }
  for (let y = y0; y <= y1; y++) {
    const near = [];
    for (let j = 0; j < n; j++) if (y >= box[j][0] && y <= box[j][1]) near.push(j);
    if (!near.length) continue;
    let runX = 0, runC = -1;
    for (let x = x0; x <= x1 + 1; x++) {
      let col = -1;
      if (x <= x1) {
        let best = 1e9, bj = -1, bt = 0, bnx = 0, bny = 0, br = 1;
        for (let q = 0; q < near.length; q++) {
          const j = near[q], ax = pts[j].x, ay = pts[j].y, vx = pts[j + 1].x - ax, vy = pts[j + 1].y - ay;
          const l2 = vx * vx + vy * vy;
          let t = l2 > 0 ? ((x - ax) * vx + (y - ay) * vy) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
          const px = ax + vx * t, py = ay + vy * t, ex = x - px, ey = y - py;
          const r = rad[j] + (rad[j + 1] - rad[j]) * t, sd = Math.sqrt(ex * ex + ey * ey) - r;
          if (sd < best) { best = sd; bj = j; bt = t; bnx = ex; bny = ey; br = r; }
        }
        if (best <= 1.1) {
          if (best > 0) col = 0;
          else {
            const m = Math.sqrt(bnx * bnx + bny * bny) || 1, lum = (bnx * LX + bny * LY) / m, depth = -best, u = (bj + bt) / n;
            const s = (bj + bt) * len / n;
            col = 7;
            if (depth > 1.2 && ((s - RIB_AT) % RIB + RIB) % RIB < RIB_W) col = 8;
            else if (lum < -0.3 && depth < br * 0.5 + 1) col = 8;
            else if (lum > 0.45 && depth > 1.5 && depth < br * 0.62 && u < 0.62) col = 15;
          }
        }
      }
      if (col !== runC) {
        if (runC >= 0) R(runX, y, x - runX, 1, runC);
        runX = x; runC = col;
      }
    }
  }
}
