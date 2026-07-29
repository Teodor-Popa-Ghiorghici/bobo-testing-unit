function drawThumb(cv, cat, it) {
  const g = cv.getContext('2d');
  if (!g) return;
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#000000';
  g.fillRect(0, 0, 116, 60);

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
      g.fillStyle = '#AAAAAA';
      g.font = '15px monospace';
      g.fillText('SYSTEM', 34, 34);
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
    const v = it.v;
    g.fillStyle = v.bg; g.fillRect(0, 0, 116, 60);
    g.fillStyle = v.dim; g.fillRect(0, 0, 116, 8);
    g.font = '11px monospace';
    const rows = [[v.ok, '::/> DIR'], [v.fg, 'AUTOEXEC.HC'], [v.hi, 'GOD.DD'], [v.err, 'DISK ERROR'], [v.acc, '::/> _']];
    rows.forEach((r, i) => { g.fillStyle = r[0]; g.fillText(r[1], 5, 20 + i * 9); });
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
