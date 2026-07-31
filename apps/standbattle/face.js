/* Heads and faces.

   At ~18px tall a head only reads as a face if the features are built the
   way animation cels build them: a hard shadow under the fringe and along
   the jaw, whites in the eyes, an iris with a pupil and a single specular
   pixel, and brows that carry most of the expression. Everything is
   authored for a 3/4 head on a profile body -- the classic fighting-game
   compromise that keeps both eyes visible while the shoulders stay
   side-on. */

import { poly, place, disc, ellipse, px } from './draw.js';
import { S, SH, BASE, LT, RIM } from './palette.js';

const SKULL = [
  [-7.6, -3.4], [-6.4, -7.0], [-3.0, -9.4], [1.6, -9.6], [5.4, -8.0],
  [7.4, -4.6], [7.8, -0.6], [7.0, 3.4], [4.6, 7.0], [1.4, 8.6],
  [-1.8, 7.8], [-4.4, 4.6], [-6.8, 1.6]
];
const JAW_SHADOW = [
  [-6.6, 2.0], [-3.6, 5.2], [1.0, 8.4], [4.2, 7.2], [2.0, 9.2], [-2.4, 8.0], [-6.0, 4.4]
];
const CHEEK_LIGHT = [
  [-2.4, -8.6], [2.8, -8.8], [6.2, -6.0], [7.0, -2.0], [4.0, -3.4], [-0.6, -5.0]
];

/* neck + head. `ang` tilts the whole head; hair is drawn by the caller
   afterwards so each character keeps its own silhouette. */
export function head(g, cx, cy, ang, skin, opts) {
  const o = opts || {};
  const sc = o.scale || 1;
  const p = pts => place(pts, cx, cy, ang, sc);
  poly(g, p(SKULL), skin[BASE]);
  poly(g, p(CHEEK_LIGHT), skin[LT]);
  poly(g, p(JAW_SHADOW), skin[SH]);
  /* ear on the far side of the jaw */
  poly(g, p([[-7.4, -1.6], [-5.0, -2.2], [-4.4, 1.8], [-6.6, 2.6]]), skin[BASE]);
  poly(g, p([[-6.4, -1.0], [-5.4, -1.4], [-5.2, 1.2], [-6.2, 1.6]]), skin[SH]);
  if (o.rim !== false) {
    poly(g, p([[-3.0, -9.4], [1.6, -9.6], [5.4, -8.0], [4.6, -7.0], [1.4, -8.2], [-2.6, -8.0]]), skin[RIM]);
  }
}

export function neck(g, sk, spec, skin) {
  const nx = sk.head.x, ny = sk.head.y;
  const w = spec.neckW || 5;
  poly(g, [
    [nx - w * 0.55, ny + 3], [nx + w * 0.55, ny + 3],
    [sk.sh.x + w * 0.6, sk.sh.y + 1], [sk.sh.x - w * 0.6, sk.sh.y + 1]
  ], skin[SH]);
  poly(g, [
    [nx - w * 0.5, ny + 3], [nx - w * 0.1, ny + 3],
    [sk.sh.x - w * 0.1, sk.sh.y], [sk.sh.x - w * 0.55, sk.sh.y]
  ], skin[S]);
}

const EYE_NEAR = 4.2, EYE_FAR = -1.6, EYE_Y = -1.4;

function eyeShape(g, x, y, w, h, ang, cx, cy, sc, f, blink, look) {
  const P = pts => place(pts, cx, cy, ang, sc);
  if (blink > 0.55 || h <= 0.6) {
    poly(g, P([[x - w, y], [x + w, y - 0.3], [x + w, y + 0.9], [x - w, y + 1.0]]), f.ink);
    return;
  }
  const hh = h * (1 - blink * 0.8);
  poly(g, P([[x - w, y - hh], [x + w, y - hh * 0.85], [x + w * 1.05, y + hh], [x - w, y + hh]]), f.white);
  const ix = x + look * w * 0.35;
  poly(g, P([[ix - w * 0.55, y - hh * 0.9], [ix + w * 0.6, y - hh * 0.9], [ix + w * 0.6, y + hh], [ix - w * 0.55, y + hh]]), f.iris);
  poly(g, P([[ix - w * 0.22, y - hh * 0.5], [ix + w * 0.26, y - hh * 0.5], [ix + w * 0.26, y + hh * 0.75], [ix - w * 0.22, y + hh * 0.75]]), f.ink);
  px(g, P([[ix - w * 0.5, y - hh * 0.55]])[0][0], P([[ix - w * 0.5, y - hh * 0.55]])[0][1], 1, 1, f.white);
  /* upper lid: the heaviest line on the face */
  poly(g, P([[x - w - 0.4, y - hh - 1.3], [x + w + 0.4, y - hh * 0.95 - 1.4], [x + w + 0.4, y - hh * 0.95], [x - w - 0.4, y - hh + 0.1]]), f.ink);
}

export function eyes(g, cx, cy, ang, sc, f, expr, blink, look) {
  const P = pts => place(pts, cx, cy, ang, sc);
  const lk = look || 0;
  if (expr === 'x') {
    [EYE_NEAR, EYE_FAR].forEach(x => {
      poly(g, P([[x - 2, -3.4], [x + 2.2, 0.6], [x + 1.2, 1.4], [x - 2.8, -2.6]]), f.ink);
      poly(g, P([[x + 2.2, -3.4], [x - 2, 0.6], [x - 2.8, -0.4], [x + 1.2, -4.2]]), f.ink);
    });
    return;
  }
  if (expr === 'shut') {
    [EYE_NEAR, EYE_FAR].forEach(x => {
      poly(g, P([[x - 2.2, -1.2], [x + 2.2, -1.8], [x + 2.2, -0.4], [x - 2.2, 0.2]]), f.ink);
    });
    return;
  }
  const h = expr === 'wide' ? 2.6 : expr === 'narrow' || expr === 'angry' ? 1.35 : 2.0;
  eyeShape(g, EYE_NEAR, EYE_Y, 2.1, h, ang, cx, cy, sc, f, blink, lk);
  eyeShape(g, EYE_FAR, EYE_Y - 0.2, 1.7, h * 0.92, ang, cx, cy, sc, f, blink, lk);
  if (expr === 'angry' || expr === 'narrow') {
    poly(g, P([[EYE_NEAR - 2.4, -3.0], [EYE_NEAR + 2.4, -2.0], [EYE_NEAR + 2.4, -1.0], [EYE_NEAR - 2.4, -1.8]]), f.ink);
    poly(g, P([[EYE_FAR - 2.0, -2.2], [EYE_FAR + 2.0, -2.9], [EYE_FAR + 2.0, -1.8], [EYE_FAR - 2.0, -1.2]]), f.ink);
  }
}

export function brows(g, cx, cy, ang, sc, f, expr) {
  const P = pts => place(pts, cx, cy, ang, sc);
  let near, far;
  if (expr === 'angry') {
    near = [[EYE_NEAR - 2.6, -5.2], [EYE_NEAR + 2.6, -3.6], [EYE_NEAR + 2.6, -2.3], [EYE_NEAR - 2.6, -4.0]];
    far = [[EYE_FAR - 2.2, -4.4], [EYE_FAR + 2.2, -5.4], [EYE_FAR + 2.2, -4.2], [EYE_FAR - 2.2, -3.3]];
  } else if (expr === 'pain') {
    near = [[EYE_NEAR - 2.6, -3.4], [EYE_NEAR + 2.4, -5.0], [EYE_NEAR + 2.4, -3.8], [EYE_NEAR - 2.6, -2.4]];
    far = [[EYE_FAR - 2.2, -3.0], [EYE_FAR + 2.2, -4.4], [EYE_FAR + 2.2, -3.2], [EYE_FAR - 2.2, -2.0]];
  } else {
    near = [[EYE_NEAR - 2.6, -4.4], [EYE_NEAR + 2.6, -4.4], [EYE_NEAR + 2.6, -3.4], [EYE_NEAR - 2.6, -3.4]];
    far = [[EYE_FAR - 2.2, -4.2], [EYE_FAR + 2.2, -4.6], [EYE_FAR + 2.2, -3.6], [EYE_FAR - 2.2, -3.2]];
  }
  poly(g, P(near), f.brow || f.ink);
  poly(g, P(far), f.brow || f.ink);
}

export function mouth(g, cx, cy, ang, sc, f, expr, skin) {
  const P = pts => place(pts, cx, cy, ang, sc);
  const y = 3.4, x = 3.2;
  if (expr === 'shout' || expr === 'open') {
    const h = expr === 'shout' ? 3.4 : 2.2;
    poly(g, P([[x - 2.0, y - 0.6], [x + 2.4, y - 1.0], [x + 2.0, y + h], [x - 1.6, y + h * 0.8]]), f.ink);
    poly(g, P([[x - 1.4, y + h * 0.45], [x + 1.8, y + h * 0.25], [x + 1.6, y + h * 0.85], [x - 1.2, y + h * 0.7]]), f.tongue || '#8A3A4A');
    poly(g, P([[x - 1.8, y - 0.4], [x + 2.2, y - 0.8], [x + 2.1, y + 0.2], [x - 1.7, y + 0.4]]), f.white);
  } else if (expr === 'grit') {
    poly(g, P([[x - 2.2, y], [x + 2.6, y - 0.6], [x + 2.4, y + 1.8], [x - 2.0, y + 2.0]]), f.ink);
    poly(g, P([[x - 1.8, y + 0.2], [x + 2.2, y - 0.3], [x + 2.1, y + 1.0], [x - 1.7, y + 1.2]]), f.white);
    for (let i = -1; i <= 1; i++) {
      poly(g, P([[x + i * 1.3, y + 0.1], [x + i * 1.3 + 0.4, y + 0.05], [x + i * 1.3 + 0.4, y + 1.1], [x + i * 1.3, y + 1.15]]), f.ink);
    }
  } else if (expr === 'smirk') {
    poly(g, P([[x - 2.0, y + 0.8], [x + 1.4, y + 0.2], [x + 2.4, y - 0.8], [x + 2.0, y + 1.0], [x - 1.8, y + 1.6]]), f.ink);
  } else {
    poly(g, P([[x - 1.8, y + 0.4], [x + 2.2, y], [x + 2.2, y + 0.9], [x - 1.8, y + 1.3]]), f.ink);
  }
  /* nose shadow, always -- it is what stops a face reading as flat */
  poly(g, P([[x + 2.8, y - 4.6], [x + 4.6, y - 2.6], [x + 2.6, y - 2.0]]), skin[SH]);
  poly(g, P([[x + 3.0, y - 4.4], [x + 4.4, y - 2.8], [x + 3.6, y - 2.6]]), skin[S]);
}

/* sweat bead / stress mark, used when a character is hurt or straining */
export function sweat(g, cx, cy, ang, sc, phase) {
  const P = pts => place(pts, cx, cy, ang, sc);
  const y = -6 + (phase % 1) * 5;
  const p = P([[-5.5, y]])[0];
  poly(g, [[p[0], p[1]], [p[0] + 2, p[1] + 1], [p[0] + 1, p[1] + 3.4], [p[0] - 1, p[1] + 1.6]], '#CFEAFF');
  px(g, p[0], p[1] + 1, 1, 1, '#FFFFFF');
}

export { S, SH, BASE, LT, RIM, disc, ellipse };
