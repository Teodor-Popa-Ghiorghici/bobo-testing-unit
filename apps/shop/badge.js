/* The mark in the corner of a card's picture that says it is yours: a green tab with a tick for what you own, a cyan one with a star for what is on the machine now, a gold one with
   a tick for what you earned. It is drawn on the picture's own canvas, a pixel to a pixel, so it is the same size as the picture at every zoom: a card is read at a glance zoomed right
   out, where the colour of its border and its small print are not. */
const TICK = ['.......XX', '......XXX', 'X....XXX.', 'XX..XXX..', 'XXXXXX...', '.XXXX....', '..XX.....'];
const STAR = ['....X....', '....X....', '...XXX...', 'XXXXXXXXX', '.XXXXXXX.', '..XXXXX..', '.XXX.XXX.', '.XX...XX.'];
const KINDS = { owned: { bg: '#00AA00', hi: '#55FF55', ink: '#FFFFFF', art: TICK }, eq: { bg: '#00AAAA', hi: '#55FFFF', ink: '#FFFFFF', art: STAR }, earned: { bg: '#AA5500', hi: '#FFFF55', ink: '#FFFFFF', art: TICK } };

/* the canvas is 116 x 60: the badge is 21 x 18 against its top right corner, in a black edge */
export function drawBadge(cv, kind) {
  const k = KINDS[kind], g = cv.getContext('2d');
  if (!k || !g) return;
  const w = 21, h = 18, x = cv.width - w - 1, y = 1;
  g.fillStyle = '#000000'; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = k.hi; g.fillRect(x, y, w, h);
  g.fillStyle = k.bg; g.fillRect(x + 1, y + 1, w - 2, h - 2);
  const a = k.art, ox = x + Math.floor((w - a[0].length) / 2), oy = y + Math.floor((h - a.length) / 2);
  g.fillStyle = '#000000';
  a.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === 'X') g.fillRect(ox + i + 1, oy + j + 1, 1, 1); });       /* a one-pixel shadow, so it reads on any picture */
  g.fillStyle = k.ink;
  a.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === 'X') g.fillRect(ox + i, oy + j, 1, 1); });
}
