/* Combat effects layer.

   Effects are spawned from the existing hook dispatcher rather than from
   inside the combat loop (§0), so a new impact flourish is a listener,
   not a branch in combat.js. Everything is drawn as hard pixels: impact
   flashes are polygon stars, speed lines are 1px wedges, shockwaves are
   scan-converted rings.

   Intensity is deliberately uneven (§10 juice budget): routine jabs get a
   small spark, while parries, staggers and kills get the ring, the
   letters and the screen flash. */

import { poly, px, ring, ellipse, disc, line, place } from './draw.js';
import { text } from './font.js';
import { FX, S, SH, BASE, LT, RIM } from './palette.js';

const BARKS = ['ORA', 'ORA ORA', 'ORA ORA ORA'];

const ease = t => 1 - Math.pow(1 - Math.min(1, t), 3);

export function createFx() {
  const list = [];
  const api = {
    list,
    /* `solo` effects are exclusive: spawning one drops any other of the
       same kind still on screen. Without it a fast combo stacks four
       screen flashes and three ray bursts on top of each other and the
       frame washes out -- the opposite of the juice budget in §10, where
       the big responses are supposed to stay rare enough to mean
       something. */
    spawn(type, o) {
      if (o && o.solo) {
        for (let i = list.length - 1; i >= 0; i--) if (list[i].solo === o.solo) list.splice(i, 1);
      }
      if (list.length > 70) list.shift();
      list.push(Object.assign({ type, t: 0, life: 0.4, x: 0, y: 0, dir: 1 }, o));
    },
    update(dt) {
      for (let i = list.length - 1; i >= 0; i--) {
        const e = list[i];
        e.t += dt / 1000;
        if (e.vy != null) { e.x += (e.vx || 0) * dt / 1000; e.y += e.vy * dt / 1000; e.vy += 260 * dt / 1000; }
        if (e.t >= e.life) list.splice(i, 1);
      }
    },
    draw(g, W, H) {
      for (const e of list) DRAW[e.type] && DRAW[e.type](g, e, e.t / e.life, W, H);
    },
    clear() { list.length = 0; }
  };
  return api;
}

/* ---- individual effects ------------------------------------------------ */

function star(g, x, y, r, points, color, rot) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const a = rot + (i / (points * 2)) * Math.PI * 2;
    const rr = i % 2 ? r * 0.36 : r;
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  poly(g, pts, color);
}

const DRAW = {
  /* the flash that sells a connecting hit: a hard white core, a coloured
     star behind it, and a few streaks along the strike vector */
  impact(g, e, k) {
    const r = e.size * (0.4 + k * 1.5);
    const fade = 1 - k;
    g.save();
    g.globalAlpha = Math.min(1, fade * 1.6);
    star(g, e.x, e.y, r * 1.25, 6, FX.spark[e.big ? 1 : 2], e.t * 5 + e.dir);
    star(g, e.x, e.y, r * 0.8, 5, FX.spark[3], -e.t * 4);
    if (k < 0.45) star(g, e.x, e.y, r * 0.5, 4, '#FFFFFF', e.t * 9);
    for (let i = 0; i < (e.big ? 7 : 4); i++) {
      const a = (i / (e.big ? 7 : 4)) * Math.PI * 2 + e.dir;
      const L = r * (1.4 + (i % 3) * 0.5);
      line(g, e.x + Math.cos(a) * r * 0.5, e.y + Math.sin(a) * r * 0.5,
        e.x + Math.cos(a) * L, e.y + Math.sin(a) * L, 1, FX.spark[4]);
    }
    g.restore();
  },

  shock(g, e, k) {
    g.save();
    g.globalAlpha = Math.max(0, 1 - k) * (e.alpha || 0.9);
    ring(g, e.x, e.y, 4 + k * e.size, Math.max(1, 4 * (1 - k)), e.color || '#FFFFFF', e.squash == null ? 1 : e.squash);
    g.restore();
  },

  /* manga speed lines converging on a point */
  lines(g, e, k) {
    g.save();
    g.globalAlpha = Math.max(0, 1 - k) * 0.85;
    const n = e.count || 9;
    for (let i = 0; i < n; i++) {
      const spread = (i / (n - 1) - 0.5) * (e.spread || 1.3);
      const a = Math.atan2(-1, e.dir) + spread;
      const near = 10 + k * 26, far = near + (e.len || 40) * (1 - k * 0.4);
      line(g, e.x - Math.cos(a) * near, e.y - Math.sin(a) * near,
        e.x - Math.cos(a) * far, e.y - Math.sin(a) * far, i % 3 === 0 ? 2 : 1, e.color || '#FFFFFF');
    }
    g.restore();
  },

  bark(g, e, k) {
    const rise = -14 * (1 - Math.pow(1 - k, 2));
    const sc = e.scale || 3;
    g.save();
    g.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
    text(g, e.text, e.x + Math.sin(k * 20) * (1 - k) * 2, e.y + rise, {
      scale: sc, align: 'center', color: e.color || FX.spark[3],
      outline: FX.ink, shadow: e.shadow || '#7A2A0E', shadowDy: 2,
      jitter: k < 0.3 ? 1 : 0
    });
    g.restore();
  },

  dust(g, e, k) {
    g.save();
    g.globalAlpha = Math.max(0, 0.75 - k * 0.75);
    const r = 3 + k * (e.size || 16);
    for (let i = 0; i < 5; i++) {
      const a = i * 1.7 + e.dir;
      ellipse(g, e.x + Math.cos(a) * r * 1.2 * e.dir, e.y - Math.abs(Math.sin(a)) * r * 0.5,
        r * 0.6, r * 0.4, FX.dust[2 + (i % 3)]);
    }
    g.restore();
  },

  /* rising ember/aura licks, used for combo heat and Stand manifestation */
  aura(g, e, k) {
    g.save();
    g.globalAlpha = Math.max(0, 1 - k) * (e.alpha || 0.8);
    const h = (e.size || 20) * k;
    poly(g, [[e.x - 3, e.y], [e.x, e.y - h], [e.x + 3, e.y]], e.color || FX.aura[3]);
    poly(g, [[e.x - 1.5, e.y], [e.x + 0.5, e.y - h * 0.6], [e.x + 1.5, e.y]], FX.spark[4]);
    g.restore();
  },

  spark(g, e, k) {
    g.save();
    g.globalAlpha = Math.max(0, 1 - k);
    px(g, e.x, e.y, e.size || 2, e.size || 2, e.color || FX.spark[3]);
    g.restore();
  },

  /* the crescent a fist carves through the air on a heavy swing --
     drawn as a thinning arc that sweeps forward and fades */
  arc(g, e, k) {
    const sweep = e.sweep || 1.5;
    const a0 = e.a0 == null ? -1.1 : e.a0;
    const a = a0 + sweep * ease(k);
    g.save();
    g.globalAlpha = Math.max(0, 1 - k) * 0.9;
    const steps = 9;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const aa = a - t * 0.85;
      const w = (1 - t) * 5 + 1;
      const r = e.r * (1 - t * 0.06);
      const cx = e.x + Math.cos(aa) * r * e.dir;
      const cy = e.y + Math.sin(aa) * r;
      poly(g, [[cx - w, cy - w], [cx + w, cy - w * 0.6], [cx + w * 0.7, cy + w], [cx - w, cy + w * 0.7]],
        i < 3 ? '#FFFFFF' : i < 6 ? e.color || FX.spark[3] : FX.spark[1]);
    }
    g.restore();
  },

  /* gathering charge on a wind-up: motes pulled inward plus a tightening
     ring, so a heavy attack is legible as "loading" before it fires */
  charge(g, e, k) {
    g.save();
    const pull = 1 - k;
    for (let i = 0; i < 8; i++) {
      const a = i * 0.9 + e.t * 3;
      const r = 6 + pull * 26 + Math.sin(e.t * 9 + i) * 3;
      g.globalAlpha = (1 - pull) * 0.9;
      px(g, e.x + Math.cos(a) * r * 1.3, e.y + Math.sin(a) * r, 2, 2, e.color || FX.aura[4]);
    }
    g.globalAlpha = 0.5 * (1 - k);
    ring(g, e.x, e.y, 8 + pull * 20, 1, e.color || FX.aura[4]);
    g.restore();
  },

  /* full-screen white/colour wash for parries and phase changes */
  flash(g, e, k, W, H) {
    g.save();
    g.globalAlpha = Math.max(0, 1 - k) * (e.alpha || 0.5);
    px(g, 0, 0, W, H, e.color || '#FFFFFF');
    g.restore();
  },

  /* radial "impact" background lines behind a big moment */
  burstBg(g, e, k, W, H) {
    g.save();
    g.globalAlpha = Math.max(0, 1 - k) * 0.20;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + e.t;
      const r0 = 30 + k * 120;
      poly(g, [
        [e.x + Math.cos(a) * r0, e.y + Math.sin(a) * r0],
        [e.x + Math.cos(a + 0.035) * (r0 + 200), e.y + Math.sin(a + 0.035) * (r0 + 200)],
        [e.x + Math.cos(a - 0.035) * (r0 + 200), e.y + Math.sin(a - 0.035) * (r0 + 200)]
      ], e.color || '#FFFFFF');
    }
    g.restore();
  }
};

/* ---- hook wiring -------------------------------------------------------- */

export function wireFx(combat, fx, groundY) {
  const d = combat.dispatcher;
  const P = combat.player, E = combat.enemy;
  const mid = () => ({ x: (P.x + E.x) / 2, y: groundY - 52 });

  d.on('onHit', ev => {
    const big = ev.moveType === 'heavy' || ev.finishing;
    const x = E.x - P.facing * 12, y = groundY - 54 - Math.random() * 12;
    fx.spawn('impact', { x, y, size: big ? 15 : 9, dir: P.facing > 0 ? 0 : Math.PI, life: big ? 0.3 : 0.2, big });
    fx.spawn('lines', { x, y, dir: P.facing, count: big ? 11 : 6, len: big ? 54 : 30, life: 0.22, color: '#FFFFFF' });
    if (big) fx.spawn('shock', { x, y, size: 46, life: 0.3, color: FX.spark[4], squash: 0.7 });
    for (let i = 0; i < (big ? 7 : 3); i++) {
      fx.spawn('spark', {
        x, y, vx: (Math.random() - 0.5) * 220 + P.facing * 120, vy: -Math.random() * 190,
        size: Math.random() < 0.4 ? 3 : 2, life: 0.3 + Math.random() * 0.3,
        color: FX.spark[Math.floor(Math.random() * 3) + 2]
      });
    }
    if (ev.combo === 3 || ev.combo === 6 || ev.combo >= 9) {
      const i = ev.combo >= 9 ? 2 : ev.combo === 6 ? 1 : 0;
      fx.spawn('bark', { text: BARKS[i], x: P.x + P.facing * 30, y: groundY - 96, scale: 2 + i, life: 0.55, solo: 'bark' });
    }
  });

  d.on('onParrySuccess', () => {
    const x = P.x + P.facing * 20, y = groundY - 56;
    fx.spawn('flash', { color: '#FFFFFF', alpha: 0.34, life: 0.14, solo: 'flash' });
    fx.spawn('burstBg', { x, y, life: 0.34, color: FX.guard[4], solo: 'burst' });
    fx.spawn('shock', { x, y, size: 66, life: 0.4, color: FX.guard[4] });
    fx.spawn('impact', { x, y, size: 16, dir: 0, life: 0.35, big: true });
    fx.spawn('bark', { text: 'PARRY', x, y: groundY - 100, scale: 3, life: 0.6, color: FX.guard[4], shadow: '#0B2E4A', solo: 'bark' });
  });

  d.on('onDodgeSuccess', () => {
    fx.spawn('dust', { x: P.x, y: groundY - 2, dir: -P.facing, size: 20, life: 0.4 });
    fx.spawn('bark', { text: 'MISS', x: P.x, y: groundY - 94, scale: 2, life: 0.5, color: FX.ghost[4], shadow: '#152A55', solo: 'bark' });
  });

  d.on('onDamageTaken', ev => {
    const x = P.x + P.facing * 8, y = groundY - 58;
    fx.spawn('impact', { x, y, size: ev.heavy ? 14 : 9, dir: P.facing > 0 ? Math.PI : 0, life: 0.26, big: ev.heavy });
    fx.spawn('lines', { x, y, dir: -P.facing, count: 8, len: 44, life: 0.24, color: FX.blood[4] });
    for (let i = 0; i < 6; i++) {
      fx.spawn('spark', {
        x, y, vx: (Math.random() - 0.5) * 200 - P.facing * 90, vy: -Math.random() * 170,
        size: 2, life: 0.4, color: FX.blood[2 + (i % 3)]
      });
    }
  });

  d.on('onKill', () => {
    const x = E.x, y = groundY - 54;
    fx.spawn('flash', { color: '#FFFFFF', alpha: 0.30, life: 0.18, solo: 'flash' });
    fx.spawn('burstBg', { x, y, life: 0.5, color: FX.spark[3], solo: 'burst' });
    fx.spawn('shock', { x, y, size: 90, life: 0.5, color: FX.spark[4] });
    fx.spawn('shock', { x, y: groundY, size: 70, life: 0.45, color: FX.dust[3], squash: 0.25 });
    for (let i = 0; i < 16; i++) {
      fx.spawn('spark', {
        x, y, vx: (Math.random() - 0.5) * 300, vy: -Math.random() * 260,
        size: Math.random() < 0.5 ? 3 : 2, life: 0.5 + Math.random() * 0.4,
        color: FX.spark[Math.floor(Math.random() * 4) + 1]
      });
    }
  });

  d.on('onPhaseTransition', () => {
    fx.spawn('flash', { color: '#FF4A7E', alpha: 0.38, life: 0.3, solo: 'flash' });
    fx.spawn('burstBg', { x: E.x, y: groundY - 60, life: 0.6, color: '#FF4A7E', solo: 'burst' });
    fx.spawn('shock', { x: E.x, y: groundY - 60, size: 120, life: 0.6, color: '#FFC2D8' });
    for (let i = 0; i < 20; i++) {
      fx.spawn('aura', { x: E.x + (Math.random() - 0.5) * 40, y: groundY - Math.random() * 20, size: 30 + Math.random() * 30, life: 0.8, color: '#FF6B9E' });
    }
  });

  d.on('onTelegraphStart', ev => {
    if (!ev.pattern) return;
    fx.spawn('shock', { x: E.x, y: groundY - 2, size: ev.pattern.range * 1.2, life: 0.45, color: ev.pattern.telegraph, squash: 0.22, alpha: 0.7 });
  });
}
