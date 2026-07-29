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
function drawPlant(g, cx, baseY, sp, stage, t, s, wig, dark) {
  if (stage < 0) return;
  const c = sp.hue;
  const sway = Math.sin(t * 0.9 + cx) * (1.2 + stage * 0.5) * s;
  const sq = wig ? Math.sin(wig * 18) * 0.22 * wig : 0;
  const S = s * (1 - sq), SY = s * (1 + sq);
  const shade = dark ? 0.55 : 1;
  const mix = col => dark ? dimCol(col, shade) : col;
  const R = (x, y, w, h, col) => { g.fillStyle = mix(col); g.fillRect(Math.round(cx + x * S + sway), Math.round(baseY - y * SY), Math.max(1, Math.round(w * S)), Math.max(1, Math.round(h * SY))); };

  if (stage === 0) {
    R(-2, 3, 4, 3, '#6b4a2a');
    R(-1, 4, 2, 1, '#8a6238');
    return;
  }
  const h = stage === 1 ? 8 : stage === 2 ? 16 : 26;
  /* stem */
  R(-1, h, 2, h, c[1]);
  R(-1, h, 1, h, c[0]);
  if (stage >= 1) {
    R(-7, h - 2, 6, 2, c[1]); R(-6, h - 1, 4, 2, c[0]);
    R(1, h - 5, 6, 2, c[1]);  R(1, h - 4, 4, 2, c[0]);
  }
  if (stage >= 2) {
    R(-9, h - 9, 8, 2, c[1]); R(-8, h - 8, 6, 2, c[0]);
    R(1, h - 13, 8, 2, c[1]); R(1, h - 12, 6, 2, c[0]);
  }
  if (stage === 3) {
    /* the head. Each species wears a different one. */
    if (sp.id === 'mosscap') {
      R(-7, h + 5, 14, 5, c[1]); R(-5, h + 7, 10, 3, c[2]); R(-3, h + 2, 6, 3, c[0]);
    } else if (sp.id === 'bellvine') {
      R(-4, h + 4, 8, 5, c[1]); R(-3, h + 7, 6, 3, c[2]); R(-1, h + 1, 2, 2, c[0]);
    } else if (sp.id === 'embercup') {
      R(-5, h + 6, 10, 6, c[1]); R(-3, h + 8, 6, 4, c[2]); R(-2, h + 10, 4, 2, '#ffd27a');
    } else if (sp.id === 'glassreed') {
      R(-2, h + 12, 4, 12, c[0]); R(-1, h + 12, 2, 12, c[2]); R(-4, h + 6, 8, 2, c[1]);
    } else if (sp.id === 'nightpea') {
      R(-6, h + 4, 12, 6, c[1]); R(-4, h + 6, 8, 4, c[2]);
      R(-3, h + 9, 2, 2, '#ffffff'); R(1, h + 9, 2, 2, '#ffffff');
    } else if (sp.id === 'ironbud') {
      R(-5, h + 5, 10, 7, c[1]); R(-3, h + 7, 6, 5, c[2]); R(-5, h + 5, 10, 1, c[0]);
    } else if (sp.id === 'halofern') {
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.45;
        R(Math.cos(a) * 8 - 1, h + 4 + Math.sin(a) * -8, 3, 3, i % 2 ? c[2] : c[1]);
      }
      R(-2, h + 3, 4, 3, c[0]);
    } else {
      R(-6, h + 5, 12, 6, c[1]); R(-4, h + 7, 8, 4, c[2]); R(-2, h + 9, 4, 2, '#ffffff');
    }
  }
}
