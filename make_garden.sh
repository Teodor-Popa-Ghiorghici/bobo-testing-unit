#!/bin/bash
mkdir -p apps/garden
cat << 'EOF2' > apps/garden/index.js
export default {
  id: 'garden',
  title: 'Garden',
  width: 760,
  height: 380,
  resizable: true,
  async mount(root, ctx) {
    const GARD_POTS = 12;
    const WATER_MS = 8 * 60 * 1000;
    const OFFLINE_RATE = 0.4;
    const TOKEN_CAP = 20;
    const DAY_MS = 20 * 60 * 1000;
    const PENTA = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];

    function speciesById(id) { 
      return (window.Cos && window.Cos.COS_CATS && window.Cos.COS_CATS.seed) 
        ? window.Cos.COS_CATS.seed.list.find(s => s.id === id) 
        : null; 
    }
    
    function potSkin() { 
      return (window.Cos && window.Cos.COS_CATS && window.Cos.COS_CATS.pot)
        ? window.Cos.find('pot', window.Cos.live('pot')) || window.Cos.COS_CATS.pot.list[0]
        : { c: ['#aa6644', '#884422'] }; // fallback
    }

    function gardenIsNight(now) { return gardenLight(now) < 0.34; }
    function gardenLight(now) {
      const t = ((now % DAY_MS) + DAY_MS) % DAY_MS / DAY_MS;
      return 0.5 + 0.5 * Math.cos(t * Math.PI * 2);
    }
    
    function dimCol(hex, k) {
      const n = parseInt(hex.slice(1), 16);
      const r = Math.round(((n >> 16) & 255) * k), g2 = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
      return 'rgb(' + r + ',' + g2 + ',' + b + ')';
    }

    function drawPot(g, x, y, pot, s, k) {
      const c = (k == null || k >= 0.999) ? pot.c : pot.c.map(h => dimCol(h, k));
      const W = Math.round(44 * s), H = Math.round(30 * s), lip = Math.max(2, Math.round(5 * s));
      g.fillStyle = c[0];
      g.fillRect(x, y, W, lip);
      g.fillStyle = c[1];
      g.fillRect(x, y, W, Math.max(1, Math.round(2 * s)));
      const steps = Math.max(3, Math.round(6 * s));
      const bodyH = H - lip;
      for (let i = 0; i < steps; i++) {
        g.fillRect(x + i, y + lip + Math.round((i / steps) * bodyH), W - i * 2, Math.round((1 / steps) * bodyH) + 1);
      }
    }
EOF2
cat garden_obj.js >> apps/garden/index.js
cat garden_air.js >> apps/garden/index.js
cat garden_check.txt >> apps/garden/index.js
echo "  }," >> apps/garden/index.js
echo "  unmount() {" >> apps/garden/index.js
echo "    if (this._raf) cancelAnimationFrame(this._raf);" >> apps/garden/index.js
echo "    if (this._GardenAir) this._GardenAir.stop();" >> apps/garden/index.js
echo "  }" >> apps/garden/index.js
echo "};" >> apps/garden/index.js
