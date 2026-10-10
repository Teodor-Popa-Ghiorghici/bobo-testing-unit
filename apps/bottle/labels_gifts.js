/* The labels of the five drinks the four on the credits screen give (kernel/cos_gifts.js): each paints the inside of its own label, in pixels, in the box labels.js hands it
   ({ x, y, w, h }, in the bottle's own coordinates). BORSEC is drawn from memory of the real bottle (a blue band with the name, mountains under it, APĂ PLATĂ) and is as near
   as a few dozen pixels allow. */
import { layout, drawLayout, TITLE_TIERS, SMALL_TIERS } from '../pixtext.js';

/* pixel type (pixtext.js): `top` is the top of the letters, `w` the room, `big` for the heavy title face. It never runs wider than `w`: the largest face that holds it is used. */
const text = (r, t, cx, top, color, w, big) => { const L = layout(t, w, big ? TITLE_TIERS.filter(x => x.n === 1) : SMALL_TIERS.slice(0, 1)); drawLayout(r, L, Math.round(cx), top, color, {}); return L; };
const tri = (r, cx, top, h, hw, col, snow) => { for (let i = 0; i < h; i++) { const w = Math.max(1, Math.round(hw * (i + 1) / h)); r(cx - w, top + i, w * 2, 1, snow && i < h / 3 ? snow : col); } };

/* APA PLATA BORSEC */
function borsec(g2, r, K, b) {
  const cx = b.x + b.w / 2;
  r(b.x, b.y, b.w, 14, '#1f5fc8');                                              /* the blue band with the name */
  r(b.x, b.y + 14, b.w, 1, '#0f3a8a');
  text(r, 'BORSEC', cx, b.y + 4, '#ffffff', b.w - 4, true);
  r(b.x, b.y + 15, b.w, 22, '#dcecf8');                                         /* the sky and the mountains of the Carpathians */
  tri(r, cx + 9, b.y + 20, 17, 12, '#3a78d0', '#ffffff');
  tri(r, cx - 8, b.y + 17, 20, 15, '#1f5fc8', '#ffffff');
  r(b.x, b.y + 37, b.w, 3, '#1f5fc8');
  text(r, 'APĂ PLATĂ', cx, b.y + 42, '#1f5fc8', b.w - 2);
  text(r, 'NATURAL', cx, b.y + 51, '#0f3a8a', b.w - 2);
}

/* LIQUID CHIPS */
function chips(g2, r, K, b) {
  const cx = b.x + b.w / 2;
  text(r, 'LIQUID', cx, b.y + 3, '#ffe040', b.w - 2, true);
  /* a crisp: a yellow oval with a wavy edge, drawn row by row */
  const cy = b.y + 27;
  for (let i = -8; i <= 8; i++) {
    const half = Math.round(Math.sqrt(Math.max(0, 1 - (i / 8.5) * (i / 8.5))) * 18) + (i % 2 ? 1 : 0);
    r(cx - half - 1, cy + i, half * 2 + 2, 1, '#14100a');
    r(cx - half, cy + i, half * 2, 1, i < -3 ? '#ffe040' : '#f0b820');
  }
  r(cx - 9, cy - 4, 2, 2, '#c88810'); r(cx + 3, cy, 2, 2, '#c88810'); r(cx - 4, cy + 3, 2, 2, '#c88810'); r(cx + 9, cy - 3, 2, 2, '#c88810');
  text(r, 'CHIPS', cx, b.y + 40, '#ffe040', b.w - 2, true);
}

/* BISCU'S BEER: a man in a suit and no trousers, in heart pants */
function biscuBeer(g2, r, K, b) {
  const cx = Math.round(b.x + b.w / 2);
  text(r, 'BISCU', cx, b.y + 3, '#a01828', b.w - 2, true);
  const y = b.y + 15, skin = '#e8b890', suit = '#1a2a5a';
  r(cx - 3, y, 6, 2, '#3a2410'); r(cx - 3, y + 2, 6, 5, skin); r(cx - 2, y + 4, 1, 1, '#14100a'); r(cx + 1, y + 4, 1, 1, '#14100a'); r(cx - 1, y + 6, 2, 1, '#a04030');   /* the head */
  r(cx - 6, y + 7, 12, 10, suit);                                              /* the jacket, */
  r(cx - 2, y + 7, 4, 7, '#ffffff'); r(cx - 1, y + 8, 2, 8, '#d8203a');         /* the shirt and the tie, */
  r(cx - 9, y + 8, 3, 9, suit); r(cx + 6, y + 8, 3, 9, suit); r(cx - 9, y + 17, 3, 2, skin); r(cx + 6, y + 17, 3, 2, skin);   /* the sleeves and the hands, */
  r(cx - 6, y + 17, 12, 5, '#d8203a');                                         /* the pants, red, */
  [[-3, 18], [1, 18]].forEach(([dx, dy]) => { r(cx + dx, y + dy, 1, 1, '#ffffff'); r(cx + dx + 2, y + dy, 1, 1, '#ffffff'); r(cx + dx, y + dy + 1, 3, 1, '#ffffff'); r(cx + dx + 1, y + dy + 2, 1, 1, '#ffffff'); });   /* with hearts */
  r(cx - 5, y + 22, 3, 10, skin); r(cx + 2, y + 22, 3, 10, skin);              /* and nothing else, */
  r(cx - 6, y + 32, 5, 2, '#14100a'); r(cx + 1, y + 32, 5, 2, '#14100a');       /* but shoes */
  text(r, 'LAGER 5%', cx, b.y + b.h - 6, '#5a3a10', b.w - 2);
}

/* CAPTAIN MORGAN: the captain, one foot on a barrel */
function morgan(g2, r, K, b) {
  const cx = Math.round(b.x + b.w / 2), gold = '#e0b030';
  r(b.x, b.y, b.w, b.h, '#a81c1c'); r(b.x, b.y, b.w, 1, gold); r(b.x, b.y + b.h - 1, b.w, 1, gold); r(b.x, b.y, 1, b.h, gold); r(b.x + b.w - 1, b.y, 1, b.h, gold);
  text(r, 'CAPTAIN', cx, b.y + 4, gold, b.w - 4, true);
  text(r, 'MORGAN', cx, b.y + 14, gold, b.w - 4, true);
  const y = b.y + 27, skin = '#e8b890', coat = '#5a0c0c';
  r(cx - 8, y, 16, 3, '#14100a'); r(cx - 5, y - 3, 10, 3, '#14100a'); r(cx - 1, y - 2, 2, 2, '#ffffff'); r(cx - 8, y + 3, 16, 1, gold);   /* the hat */
  r(cx - 4, y + 4, 8, 6, skin); r(cx - 4, y + 8, 8, 4, '#14100a'); r(cx - 2, y + 6, 1, 1, '#14100a'); r(cx + 1, y + 6, 1, 1, '#14100a');    /* the face and the beard */
  r(cx - 7, y + 12, 14, 12, coat); r(cx - 7, y + 12, 14, 1, gold); r(cx - 1, y + 13, 2, 10, gold);                                       /* the coat and its buttons */
  r(cx - 10, y + 13, 3, 9, coat); r(cx + 7, y + 13, 3, 6, coat); r(cx + 7, y + 19, 6, 2, coat);                                         /* an arm on a hip, an arm out */
  r(cx - 6, y + 24, 5, 9, '#14100a'); r(cx + 1, y + 24, 8, 3, '#14100a'); r(cx + 6, y + 24, 3, 5, '#14100a');                           /* the legs, one bent up */
  r(cx + 4, y + 29, 12, 9, '#6a3a10'); r(cx + 4, y + 31, 12, 1, gold); r(cx + 4, y + 35, 12, 1, gold);                                  /* the barrel under his boot */
  text(r, 'SPICED GOLD', cx, b.y + b.h - 7, gold, b.w - 4);
}

/* THE HOMEMADE POTION */
function potion(g2, r, K, b) {
  const cx = Math.round(b.x + b.w / 2);
  text(r, '?%', cx, b.y + 3, '#8a1010', b.w - 2, true);
  r(b.x + 4, b.y + 13, b.w - 8, 1, '#5a3a10');
  text(r, 'HOME', cx, b.y + 17, '#5a3a10', b.w - 2);
  text(r, 'MADE', cx, b.y + 24, '#5a3a10', b.w - 2);
}

export const GIFT_LABELS = { borsec, chips, biscubeer: biscuBeer, morgan, potion };
