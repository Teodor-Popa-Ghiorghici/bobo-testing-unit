/* CRAZY DAVE — the picture on every card, and Dave himself. One canvas per card, 116 x 60, whole pixels. */
import { notesInks } from '../../kernel/theme_fx.js';
import { BACK_BASE, drawBackArt, drawTable } from '../solitaire/cosmetics.js';
import { drawPlant } from '../garden/art.js';
import { thumbMini } from '../../kernel/pet_art.js';
import { sampleStroke } from '../crayon/brushes.js';
import { POTS, LOGOS } from '../../kernel/cos_data.js';
import { drawText, F3, F5, widthOf } from '../pixtext.js';
import { miniBottle } from '../bottle/mini.js';
import { drawGoose, PAL16 } from '../goose_art.js';

function dimCol(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k), g2 = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
  return 'rgb(' + r + ',' + g2 + ',' + b + ')';
}

function cssFirstColor(str, fallback) {
  const m = String(str).match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/);
  return m ? m[0] : fallback;
}

/* `perch`, when a goose is on his head (Thea's present: one shop in twenty): { name, flip, by } is its frame, which way it faces and how far down it has come, and the canvas is taller by GOOSE_ROOM so he has room under it */
export const GOOSE_ROOM = 14;
export function drawDave(cv, t, perch) {
  if (!cv) return;
  const g = cv.getContext('2d');
  if (!g) return;
  const oy = perch ? GOOSE_ROOM : 0;
  g.clearRect(0, 0, 48, 48 + oy);
  const y = Math.round(Math.sin(t) * 2);
  const arm = Math.round(Math.sin(t * 1.7) * 4);
  const R = (x, yy, w, h, c) => { g.fillStyle = c; g.fillRect(x, yy + y + oy, w, h); };
  /* the pot */
  R(14, 2, 20, 4, '#7a3d20');
  R(15, 6, 18, 9, '#a35a34');
  R(15, 6, 18, 2, '#c4784c');
  /* head and face */
  R(17, 15, 14, 11, '#c99a68');
  R(17, 15, 14, 2, '#e0b483');
  R(20, 19, 3, 3, '#000000');
  R(26, 19, 3, 3, '#000000');
  R(21, 20, 1, 1, '#FFFFFF');
  R(27, 20, 1, 1, '#FFFFFF');
  R(20, 24, 9, 1, '#5c2f18');
  /* the grin opens and shuts */
  if (Math.sin(t * 2.3) > 0) R(21, 23, 7, 3, '#3a1c0e');
  /* body */
  R(15, 26, 18, 14, '#2f6f4f');
  R(15, 26, 18, 2, '#49a074');
  R(19, 29, 10, 6, '#e8d86a');
  /* arms: one waves, one holds a sign that says nothing */
  R(11, 28 + arm, 4, 10, '#c99a68');
  R(33, 28 - arm, 4, 10, '#c99a68');
  R(8, 24 + arm, 7, 6, '#FFFFFF');
  R(9, 25 + arm, 5, 1, '#AA0000');
  R(9, 27 + arm, 5, 1, '#AA0000');
  /* legs */
  R(17, 40, 5, 7, '#3a2a5a');
  R(26, 40, 5, 7, '#3a2a5a');
  R(16, 45, 7, 3, '#1a1a1a');
  R(25, 45, 7, 3, '#1a1a1a');
  if (perch) drawGoose((x, yy, w, h, c) => { g.fillStyle = PAL16[c]; g.fillRect(x, yy, w, h); }, 24, perch.by + y, perch.name, 1, perch.flip);
}

function drawPot(g, x, y, pot, s, k) {
  const c = (k == null || k >= 0.999) ? pot.c : pot.c.map(h => dimCol(h, k));
  const W = Math.round(44 * s), H = Math.round(30 * s), lip = Math.max(2, Math.round(5 * s));
  /* rim, then a body that tapers in whole-pixel steps */
  g.fillStyle = c[0];
  g.fillRect(x, y, W, lip);
  g.fillStyle = c[1];
  g.fillRect(x, y, W, Math.max(1, Math.round(2 * s)));
  const steps = Math.max(3, Math.round(6 * s));
  const bodyH = H - lip;
  for (let i = 0; i < steps; i++) {
    const inset = Math.round((i / steps) * (W * 0.16));
    const yy = y + lip + Math.round(bodyH * i / steps);
    const hh = Math.ceil(bodyH / steps);
    g.fillStyle = c[0];
    g.fillRect(x + inset, yy, W - inset * 2, hh);
    g.fillStyle = c[2];
    g.fillRect(x + W - inset - Math.round(4 * s), yy, Math.round(4 * s), hh);
    g.fillStyle = c[1];
    g.fillRect(x + inset, yy, Math.max(1, Math.round(2 * s)), hh);
  }
  /* soil */
  g.fillStyle = '#4a3320';
  g.fillRect(x + Math.round(3 * s), y + Math.round(2 * s), W - Math.round(6 * s), Math.round(4 * s));
  g.fillStyle = '#5c4028';
  g.fillRect(x + Math.round(5 * s), y + Math.round(2 * s), W - Math.round(14 * s), Math.round(2 * s));
}


const PAPER = '#e8e2d4';
const wearOf = it => it.slot && it.slot !== 'free' ? { [it.slot]: it.id } : {};

/* the shelves added after the first six: a backdrop is the picture, a brush is a stroke of it, a layer is a pile of sheets,
   a pack is its list, a drink is its bottle, and the elephant is the elephant */
function drawShelf(g, cv, cat, it) {
  if (cat === 'wall') {
    const img = new Image();
    img.onload = () => {
      try {
        const s = Math.max(116 / img.width, 60 / img.height), w = img.width * s, h = img.height * s;
        g.imageSmoothingEnabled = false;
        g.drawImage(img, Math.round((116 - w) / 2), Math.round((60 - h) / 2), Math.round(w), Math.round(h));
      } catch (e) {}
    };
    img.src = it.src;
    return true;
  }
  if (cat === 'crayon') {
    g.fillStyle = PAPER; g.fillRect(0, 0, 116, 60);
    if (it.kind === 'brush') { sampleStroke(g, it.id, 116, 60); return true; }
    const n = +it.id.slice(5) || 2;                          /* layer2 .. layer5: that many sheets, fanned */
    for (let i = n - 1; i >= 0; i--) {
      g.fillStyle = i === 0 ? PAPER : 'rgba(150,200,230,0.5)'; g.fillRect(10 + i * 8, 6 + i * 4, 78, 38);
      g.fillStyle = '#6b6357'; g.fillRect(10 + i * 8, 6 + i * 4, 78, 1); g.fillRect(10 + i * 8, 43 + i * 4, 78, 1);
      g.fillRect(10 + i * 8, 6 + i * 4, 1, 38); g.fillRect(87 + i * 8, 6 + i * 4, 1, 38);
    }
    g.fillStyle = '#b23a2a'; g.fillRect(18, 22, 26, 3); g.fillRect(30, 28, 3, 10);
    return true;
  }
  if (cat === 'garage') {
    /* the pack's list in two columns of pixel type (every name fits its column: they are never cut or run into each other), over a few keys of a piano */
    g.fillStyle = '#0a1018'; g.fillRect(0, 0, 116, 60);
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    drawText(R, it.inst.length + (it.inst.length === 1 ? ' INSTRUMENT' : ' INSTRUMENTS'), 58, 4, '#55FFFF', F5, {});
    it.inst.forEach((id, i) => {
      const name = id.toUpperCase(), col = i % 2, row = Math.floor(i / 2), x = 6 + col * 56;
      R(x, 17 + row * 8 + 1, 2, 3, '#FF55FF');
      drawText(R, name, x + 4 + Math.floor(widthOf(name, F3) / 2), 17 + row * 8, '#FFFFFF', F3, {});
    });
    for (let k = 0; k < 14; k++) R(6 + k * 7, 50, 6, 10, '#d8d8d0');
    [0, 1, 3, 4, 5, 7, 8, 10, 11, 12].forEach(k => R(6 + k * 7 + 5, 50, 4, 6, '#101018'));
    return true;
  }
  if (cat === 'drink') {
    /* the bottle as the game builds it (apps/bottle/mini.js), on the bar, with its strength beside it */
    g.fillStyle = '#2a1a0c'; g.fillRect(0, 0, 116, 60);
    g.fillStyle = '#3a2415'; g.fillRect(0, 52, 116, 8); g.fillStyle = '#5a3a24'; g.fillRect(0, 52, 116, 1);
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    miniBottle(R, it, 58, 55, 0.235);
    const txt = it.potion ? '?%' : it.abv + '%';
    drawText(R, txt, 100, 46, '#FFFF55', F5, {});
    return true;
  }
  if (cat === 'elephant') {
    thumbMini(g, 116, 60, wearOf(it), it.id === 'pet' ? 'walk' : 'stand', it.id === 'pet' ? 0.4 : 0);
    if (it.id === 'pet') {
      g.fillStyle = '#FFFF55'; g.fillRect(6, 6, 8, 8); g.fillStyle = '#FF5555'; g.fillRect(6, 24, 8, 8); g.fillStyle = '#55FFFF'; g.fillRect(104, 8, 8, 8);
    }
    return true;
  }
  return false;
}

/* a back, a table or a win from the Solitaire shelf, at card size */
function solThumb(g, it) {
  if (it.sub === 'back') {
    g.fillStyle = '#0a0c10'; g.fillRect(0, 0, 116, 60);
    g.save(); g.translate(38, 2); g.scale(0.5, 0.5);
    g.fillStyle = BACK_BASE[it.id]; g.fillRect(0, 0, 80, 112);
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.strokeRect(0, 0, 80, 112);
    g.beginPath(); g.rect(5, 5, 70, 102); g.clip();
    drawBackArt(g, it.id, 0, 0, 80, 112); g.restore();
  } else if (it.sub === 'table') {
    g.save(); g.scale(116 / 880, 60 / 600); drawTable(g, it.id, 880, 600, 20); g.restore();
    g.fillStyle = '#f2efe6'; g.fillRect(18, 12, 14, 20); g.fillRect(38, 12, 14, 20);
  } else {
    g.fillStyle = '#0f1218'; g.fillRect(0, 0, 116, 60);
    for (let i = 0; i < 9; i++) { const a = i * 0.7; g.fillStyle = i % 2 ? '#f2efe6' : '#c8283c'; g.fillRect(Math.round(58 + Math.cos(a) * (8 + i * 5)), Math.round(30 + Math.sin(a) * (4 + i * 2.6)), 8, 11); }
    g.fillStyle = '#ffd68c'; g.fillRect(56, 26, 4, 4);
  }
}
export function drawThumb(cv, cat, it) {
  const g = cv.getContext('2d');
  if (!g) return;
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#000000';
  g.fillRect(0, 0, 116, 60);
  if (it.secret && !(window.Cos && window.Cos.has(cat, it.id))) { g.fillStyle = '#111111'; g.fillRect(0, 0, 116, 60); g.fillStyle = '#555555'; g.font = '40px "VT323", monospace'; g.textAlign = 'center'; g.fillText('?', 58, 44); return; }
  if (cat === 'solitaire') { solThumb(g, it); return; }
  if (drawShelf(g, cv, cat, it)) return;
  if (cat === 'frame') {
    /* a little monitor, in the frame's own plastic */
    const grad = (it.vars && it.vars['--case-bg']) || '#cfc7b1';
    const face = cssFirstColor(grad, '#cfc7b1');
    const well = cssFirstColor((it.vars && it.vars['--well-bg']) || '#8c836d', '#8c836d');
    g.fillStyle = face; g.fillRect(14, 6, 88, 48);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(14, 6, 88, 2);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(14, 52, 88, 2);
    g.fillStyle = well; g.fillRect(19, 10, 78, 32);
    g.fillStyle = '#000814'; g.fillRect(22, 12, 72, 28);
    g.fillStyle = '#0000AA'; g.fillRect(24, 14, 68, 24);
    g.fillStyle = '#AAAAAA'; g.fillRect(24, 14, 68, 3);
    g.fillStyle = cssFirstColor((it.vars && it.vars['--lamp-on']) || '#6dff6d', '#6dff6d');
    g.fillRect(94, 47, 4, 4);
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(20, 46, 40, 3);
    if (it.id === 'moss') { g.fillStyle = '#4a6e2d'; g.fillRect(14, 6, 16, 10); g.fillRect(88, 44, 14, 10); }
    if (it.id === 'crack') { g.strokeStyle = '#3a2f22'; g.beginPath(); g.moveTo(100, 8); g.lineTo(84, 20); g.lineTo(88, 26); g.stroke(); }
    if (it.id === 'gold') { g.fillStyle = '#FFFFFF'; g.fillRect(56, 2, 4, 5); g.fillRect(53, 3, 10, 2); }
    return;
  }
  if (cat === 'logo') {
    const svg = (it.id === 'temple') ? LOGOS[0].svg : it.svg;
    if (!svg) return;
    const img = new Image();
    img.onload = () => {
      try {
        g.fillStyle = '#000000'; g.fillRect(0, 0, 116, 60);
        g.drawImage(img, 18, 0, 80, 60);
      } catch (e) {}
    };
    img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    return;
  }
  if (cat === 'cursor') {
    if (it.system || !it.mask) {
      drawText((x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }, 'SYSTEM', 58, 26, '#AAAAAA', F5, { heavy: true });
      return;
    }
    const S = 4, w = it.mask[0].length, h = it.mask.length;
    const ox = Math.round((116 - w * S) / 2), oy = Math.round((60 - h * S) / 2);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = it.mask[y].charAt(x);
        if (ch === '.' || ch === ' ') continue;
        g.fillStyle = (ch === 'X') ? it.o : it.f;
        g.fillRect(ox + x * S, oy + y * S, S, S);
      }
    }
    return;
  }
  if (cat === 'scheme') {
    /* a scheme dresses Notes all the way down (and the rest of the machine on its outside only: kernel/theme_fx.js), so the card is a small Notes page in its inks, each held to readable exactly as the real page is. The words are pixel type, each in its
       own place, so nothing is cut or lies over another. */
    const t = notesInks(it.v), R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }, left = (txt, x, y, c, f) => drawText(R, txt, x + Math.floor(widthOf(txt, f || F3) / 2), y, c, f || F3, {});
    R(0, 0, 116, 60, t.bg);
    R(0, 0, 116, 9, t.sel); left('NOTES', 3, 2, t.selInk);
    R(38, 9, 1, 51, t.line);
    [['INDEX', t.selInk, true], ['PLANS', t.dim], ['BEKKEDAL', t.fg]].forEach(([txt, c, on], i) => { if (on) R(0, 11 + i * 10, 38, 9, t.sel); left(txt, 3, 13 + i * 10, c); });
    left('THE INDEX', 43, 12, t.hi, F5);
    left('A PAGE, AND', 43, 24, t.fg);
    left('[A LINK]', 43, 32, t.acc);
    left('[NONE]', 43, 40, t.err);
    left('OK', 43, 48, t.ok); left('3', 62, 48, t.dim);
    return;
  }
  if (cat === 'pot') {
    g.fillStyle = '#1d1a12'; g.fillRect(0, 0, 116, 60);
    drawPot(g, 25, 13, it, 1.5);
    return;
  }
  if (cat === 'seed') {
    g.fillStyle = '#1d1a12'; g.fillRect(0, 0, 116, 60);
    drawPot(g, 40, 34, POTS[0], 0.8);
    drawPlant(g, 57, 36, it, 3, 0, 0.9, 0, false);
    return;
  }
}

