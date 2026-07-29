import { createWindow, raise } from '../../kernel/wm.js';
import { Cos, COS_CATS } from '../../kernel/cos.js';
import { LOGOS, POTS, SCHEMES } from '../../kernel/cos_data.js';

const DAVE_LINES = [
  'CRAAAZY DAVE! THAT\'S ME! THAT\'S WHAT THEY PUT ON THE FORM!',
  'I ATE A FRAME ONCE. TASTED LIKE A MONITOR. DIDN\'T LEARN A THING.',
  'YOU LOOK LIKE A MAN WHO NEEDS A SECOND POT AND A FIRST PLAN.',
  'THE POT ON MY HEAD IS NOT FOR SALE. THE POT ON MY HEAD IS LOAD-BEARING.',
  'I DON\'T DO REFUNDS. I DON\'T DO RECEIPTS. I DO GESTURES.',
  'THIS ONE\'S GOT PIXELS IN IT. THEY ALL HAVE. THAT\'S NOT A SELLING POINT.',
  'MY BROTHER SOLD A CURSOR TO A MAN WITH NO HANDS. GREAT SALESMAN. TERRIBLE MAN.',
  'BUY THE GOLD ONE. GO ON. I\'LL WAIT. I\'VE GOT NOTHING ELSE ON.',
  'A MAN CAME IN YESTERDAY AND ASKED FOR HELP. IN A SHOP! IMAGINE!',
  'I GREW THIS SHOP FROM A SEED. THAT\'S A LIE. I FOUND IT.',
  'SUNSHINE! CURRENCY! SAME WORD ROUND HERE. VERY CONFUSING AT BREAKFAST.',
  'IF YOU HOVER OVER A FRAME IT GOES ON THE MACHINE. FREE. I HATE THAT FEATURE.',
  'THE CRACKED ONE WAS LIKE THAT WHEN IT GOT HERE. I HAVE WITNESSES. THEY\'RE LYING.',
  'I ONCE SLEPT INSIDE A MONITOR. WARM. LOUD. WOULD NOT AGAIN.',
  'DO YOU EVER THINK ABOUT SOIL? I DO. CONSTANTLY. IT\'S A PROBLEM.',
  'EVERYTHING IN HERE IS AUTHENTIC. NOTHING IN HERE IS REAL. BOTH TRUE.',
  'THAT\'S NOT MOSS ON THE OVERGROWN ONE. IT IS MOSS. I WAS TESTING YOU.',
  'PRICES WENT UP. PRICES WENT DOWN. NET EFFECT: PRICES.',
  'I HAVE NEVER USED A COMPUTER. I SELL THE OUTSIDES. THAT\'S THE GOOD BIT.',
  'YOU\'VE GOT THE LOOK OF A MAN WHO ALPHABETISES HIS SEEDS.',
  'SOMEBODY BOUGHT THE BROOM. THE BEAR CAME IN ABOUT IT. WE TALKED.',
  'IF YOU DON\'T LIKE MY LINES THERE ARE TWENTY MORE. THAT\'S THE WHOLE BUSINESS MODEL.',
  'I ACCEPT SUN, SUNSHINE, AND VERY WARM COMPLIMENTS. MOSTLY SUN.',
  'THIS SHOP HAS NO DOOR. HOW DID YOU GET IN. HOW DID I.',
  'NIGHTPEA PAYS AFTER DARK. I PAY ATTENTION NEVER. WE ALL HAVE A SCHEDULE.',
  'A POINTER IS A HAND YOU DON\'T HAVE TO WASH.',
  'THEY SAY BUY LOW SELL HIGH. I BUY NOTHING AND SHOUT.',
  'ONE DAY I\'LL SELL YOU SOMETHING USEFUL AND WE\'LL BOTH BE DISAPPOINTED.',
  'WATCH THE LAMP ON THE CHIN WHEN YOU OPEN A WINDOW. THAT\'S POWER, THAT IS.',
  'I\'M NOT CRAZY. I\'M DAVE. THE OTHER WORD IS MARKETING.'
];

const DAVE_BROKE = [
  'NO. NOT WITH THAT. NOT WITH ANY OF THAT.',
  'COME BACK WHEN THE POTS HAVE DONE SOMETHING FOR YOU.',
  'I\'VE SEEN EMPTIER POCKETS. I\'VE SEEN THEM ON YOU. LAST WEEK.',
  'THAT\'S NOT ENOUGH SUN. THAT\'S BARELY WEATHER.',
  'GO DIG SOMETHING UP. NOT HERE. ELSEWHERE.',
  'PUT IT BACK. GENTLY. IT KNOWS.',
  'NO SUN, NO SHOP. THAT\'S THE SIGN. THERE ISN\'T A SIGN. IT\'S IMPLIED.',
  'I ADMIRE THE CONFIDENCE. I DO NOT ACCEPT IT AS PAYMENT.'
];

function dimCol(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k), g2 = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
  return 'rgb(' + r + ',' + g2 + ',' + b + ')';
}

function cssFirstColor(str, fallback) {
  const m = String(str).match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/);
  return m ? m[0] : fallback;
}

function drawDave(cv, t) {
  if (!cv) return;
  const g = cv.getContext('2d');
  if (!g) return;
  g.clearRect(0, 0, 48, 48);
  const y = Math.round(Math.sin(t) * 2);
  const arm = Math.round(Math.sin(t * 1.7) * 4);
  const R = (x, yy, w, h, c) => { g.fillStyle = c; g.fillRect(x, yy + y, w, h); };
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

export default {
  id: 'shop',
  title: 'CRAZY DAVE\'S  --  EVERYTHING MUST GO SOMEWHERE',
  width: 640,
  height: 480,
  resizable: false,
  mount(root, ctx) {
    let cat = 'frame';
    let bubbleEl = null, gridEl = null, footEl = null, daveCv = null;
    let bob = 0, raf = null, talkT = 0;

    const top = document.createElement('div');
    top.className = 'shoptop';
    const dv = document.createElement('div');
    dv.className = 'shopdave';
    daveCv = document.createElement('canvas');
    daveCv.width = 48; daveCv.height = 48;
    dv.appendChild(daveCv);
    bubbleEl = document.createElement('div');
    bubbleEl.className = 'shopbubble';
    top.appendChild(dv);
    top.appendChild(bubbleEl);

    const tabs = document.createElement('div');
    tabs.className = 'shoptabs';
    Object.keys(COS_CATS).forEach(k => {
      const t = document.createElement('div');
      t.className = 'shoptab' + (k === cat ? ' on' : '');
      t.textContent = COS_CATS[k].label;
      t.addEventListener('mousedown', ev => {
        ev.stopPropagation();
        cat = k;
        if (window.Snd) window.Snd.click();
        tabs.querySelectorAll('.shoptab').forEach((n, i) =>
          n.classList.toggle('on', Object.keys(COS_CATS)[i] === k));
        fill();
      });
      tabs.appendChild(t);
    });

    gridEl = document.createElement('div');
    gridEl.className = 'shopgrid';
    footEl = document.createElement('div');
    footEl.className = 'shopfoot';

    root.className = 'shoproot';
    root.appendChild(top);
    root.appendChild(tabs);
    root.appendChild(gridEl);
    root.appendChild(footEl);

    const say = txt => { if (bubbleEl) bubbleEl.textContent = txt; };
    say(DAVE_LINES[Math.floor(Math.random() * DAVE_LINES.length)]);

    function foot() {
      if (!footEl) return;
      footEl.innerHTML = '';
      const l = document.createElement('span');
      l.textContent = 'YOU HAVE ' + window.Economy.balance() + ' SUN';
      const r = document.createElement('span');
      r.className = 'r';
      const n = Object.keys(COS_CATS).reduce((a, k) => a + window.Cos.owned(k).length, 0);
      const tot = Object.keys(COS_CATS).reduce((a, k) => a + COS_CATS[k].list.length, 0);
      r.textContent = n + ' / ' + tot + ' OWNED';
      footEl.appendChild(l);
      footEl.appendChild(r);
    }

    function fill() {
      if (!gridEl) return;
      window.Cos.hover(null, null);
      gridEl.innerHTML = '';
      const list = COS_CATS[cat].list;
      list.forEach(it => {
        const owned = window.Cos.has(cat, it.id);
        const eq = window.Cos.equipped(cat) === it.id;
        const card = document.createElement('div');
        card.className = 'shopcard' + (eq ? ' eq' : owned ? ' owned' : '') +
          (!owned && window.Economy.balance() < it.price ? ' broke' : '');
        
        const cv = document.createElement('canvas');
        cv.width = 116; cv.height = 60;
        drawThumb(cv, cat, it);
        
        const nm = document.createElement('div');
        nm.className = 'nm';
        nm.textContent = it.name;
        
        const pr = document.createElement('div');
        pr.className = 'pr';
        pr.textContent = owned ? 'OWNED' : (it.price === 0 ? 'FREE' : it.price + ' SUN');
        
        const bt = document.createElement('div');
        bt.className = 'bt';
        bt.textContent = eq ? (cat === 'seed' ? 'IN STOCK' : 'EQUIPPED')
          : owned ? (cat === 'seed' || cat === 'pot' ? 'IN THE GARDEN' : 'EQUIP')
            : 'BUY';
            
        card.appendChild(cv); card.appendChild(nm); card.appendChild(pr); card.appendChild(bt);
        card.title = it.blurb || '';
        
        card.addEventListener('mouseenter', () => {
          say(it.blurb || it.name);
          if (cat === 'frame' || cat === 'cursor' || cat === 'scheme') window.Cos.hover(cat, it.id);
        });
        
        card.addEventListener('mouseleave', () => { window.Cos.hover(null, null); });
        
        card.addEventListener('mousedown', ev => {
          ev.stopPropagation();
          if (!owned) {
            if (window.Economy.balance() < it.price) {
              say(DAVE_BROKE[Math.floor(Math.random() * DAVE_BROKE.length)]);
              if (window.Snd && window.Snd.deny) window.Snd.deny();
              return;
            }
            if (window.Cos.buy(cat, it.id)) {
              if (window.Snd && window.Snd.purchase) window.Snd.purchase();
              say(daveThanks(cat, it));
              if (cat === 'frame' || cat === 'cursor' || cat === 'scheme' || cat === 'logo') window.Cos.equip(cat, it.id);
              if (cat === 'seed' || cat === 'pot') {
                window.dispatchEvent(new Event('garden-stock-refresh'));
              }
              fill(); foot();
            }
            return;
          }
          if (cat === 'seed') { say('YOU\'VE GOT THOSE. PLANT THEM. THAT\'S THE NEXT BIT.'); if (window.Snd) window.Snd.click(); return; }
          window.Cos.equip(cat, it.id);
          if (window.Snd) window.Snd.click();
          say('THERE. LOOK AT YOU.');
          fill();
        });
        gridEl.appendChild(card);
      });
      foot();
    }

    function daveThanks(c, it) {
      if (it.joke) return 'YOU ACTUALLY BOUGHT IT. I HAVE TO CLOSE THE SHOP. I HAVE TO GO AND LIE DOWN.';
      if (c === 'seed') return 'SEEDS! IN A POT! I\'VE HEARD OF IT!';
      if (c === 'frame') return 'IT\'S ON THE MACHINE ALREADY. DON\'T ASK HOW. ASK LATER.';
      return 'SOLD. NO REFUNDS. NO RECEIPTS. GESTURES ONLY.';
    }

    fill();

    const loop = () => {
      raf = requestAnimationFrame(loop);
      bob += 0.06;
      drawDave(daveCv, bob);
      talkT++;
      if (talkT > 900) { talkT = 0; say(DAVE_LINES[Math.floor(Math.random() * DAVE_LINES.length)]); }
    };
    raf = requestAnimationFrame(loop);
    
    this._onEcon = () => fill();
    window.Economy.onChange(this._onEcon);
    
    this._raf = raf;
  },
  unmount() {
    if (this._raf) cancelAnimationFrame(this._raf);
    // There isn't an Economy.offChange, but we could make one. We'll skip for now.
    window.Cos.hover(null, null);
  }
};
