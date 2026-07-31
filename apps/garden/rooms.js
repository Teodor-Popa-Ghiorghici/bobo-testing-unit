/* five rooms, each its own rack of pots. The buff is on top of whatever the
   equipped pot already grants -- a room is a bigger lever than a pot, and
   costs like one. 'night' forces night-only plants (and the visuals) on
   regardless of the clock; 'blessed' is a chance for a collected drop to
   come in double, the shrine's whole reason to exist. */
export const ROOM_DEFS = [
  { id: 'yard', name: 'YARD', price: 0, tint: null,
    buff: { grow: 1, yield: 1, water: 1, night: false, blessed: 0 },
    blurb: 'Where every garden starts.' },
  { id: 'greenhouse', name: 'GREENHOUSE', price: 800, tint: 'rgba(255,170,50,0.16)',
    buff: { grow: 1.35, yield: 1, water: 0.7, night: false, blessed: 0 },
    blurb: 'Trapped heat. Grows fast, dries out just as fast.' },
  { id: 'cellar', name: 'CELLAR', price: 1400, tint: 'rgba(18,18,46,0.55)',
    buff: { grow: 0.85, yield: 1, water: 1.3, night: true, blessed: 0 },
    blurb: 'No sun ever reaches down here. Night-lovers never stop.' },
  { id: 'rooftop', name: 'ROOFTOP', price: 2200, tint: 'rgba(150,220,255,0.14)',
    buff: { grow: 1, yield: 1.4, water: 0.55, night: false, blessed: 0 },
    blurb: 'All the light there is, and a wind that will not quit.' },
  { id: 'shrine', name: 'SHRINE', price: 3200, tint: 'rgba(198,120,255,0.20)',
    buff: { grow: 1.1, yield: 1.1, water: 1, night: false, blessed: 0.12 },
    blurb: 'Something in the air blesses a harvest, now and then.' }
];

/* one small particle pool per room id, lazily seeded and reused for the
   life of the window -- each room's "niche" is a distinct little weather
   system, not just a colour wash */
const pools = {};
function pool(id, n, make) {
  let p = pools[id];
  if (!p) { p = []; for (let i = 0; i < n; i++) p.push(make()); pools[id] = p; }
  return p;
}

export function drawRoomEffects(g, W, H, roomId, tsec, dt) {
  if (roomId === 'greenhouse') {
    const drops = pool('greenhouse', 26, () => ({ x: Math.random() * W, y: Math.random() * H, v: 10 + Math.random() * 14, s: Math.random() * 10 }));
    drops.forEach(d => {
      d.y -= d.v * dt * 0.5;
      d.x += Math.sin(tsec * 0.6 + d.s) * 6 * dt;
      if (d.y < 20) d.y = H - 10;
      const a = 0.10 + 0.10 * Math.abs(Math.sin(tsec * 0.5 + d.s));
      g.fillStyle = 'rgba(255,236,200,' + a.toFixed(2) + ')';
      g.beginPath();
      g.arc(d.x, d.y, 1.6, 0, Math.PI * 2);
      g.fill();
    });
  } else if (roomId === 'cellar') {
    const motes = pool('cellar', 34, () => ({ x: Math.random() * W, y: Math.random() * H, r: 6 + Math.random() * 40, p: Math.random() * Math.PI * 2, sp: 0.15 + Math.random() * 0.25 }));
    motes.forEach(m => {
      m.p += dt * m.sp;
      const x = m.x + Math.cos(m.p) * m.r * 0.15, y = m.y + Math.sin(m.p * 0.7) * m.r * 0.15;
      g.fillStyle = 'rgba(120,150,220,0.10)';
      g.fillRect(Math.round(x), Math.round(y), 1, 1);
    });
  } else if (roomId === 'rooftop') {
    const gusts = pool('rooftop', 5, () => ({ x: -30 - Math.random() * 200, y: 20 + Math.random() * (H - 80), v: 30 + Math.random() * 40, w: 40 + Math.random() * 60 }));
    gusts.forEach(gu => {
      gu.x += gu.v * dt;
      if (gu.x > W + gu.w) { gu.x = -gu.w - Math.random() * 120; gu.y = 20 + Math.random() * (H - 80); }
      g.strokeStyle = 'rgba(255,255,255,0.14)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(gu.x, gu.y);
      g.lineTo(gu.x + gu.w, gu.y - 4);
      g.stroke();
    });
  } else if (roomId === 'shrine') {
    const sparks = pool('shrine', 22, () => ({ x: Math.random() * W, y: H - Math.random() * 60, v: 8 + Math.random() * 10, s: Math.random() * 10, life: Math.random() }));
    sparks.forEach(s => {
      s.y -= s.v * dt;
      s.life += dt * 0.25;
      if (s.y < 40 || s.life > 1) { s.y = H - 20 - Math.random() * 40; s.x = Math.random() * W; s.life = 0; }
      const a = 0.5 * Math.sin(Math.min(1, s.life) * Math.PI);
      g.fillStyle = 'rgba(224,170,255,' + Math.max(0, a).toFixed(2) + ')';
      g.fillRect(Math.round(s.x + Math.sin(tsec + s.s) * 4), Math.round(s.y), 2, 2);
    });
  }
}
