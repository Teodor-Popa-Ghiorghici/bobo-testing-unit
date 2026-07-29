import { FRAMES, LOGOS, CURSORS, SCHEMES, POTS, SPECIES, DECO_SVG, CUR_HANDMASK } from './cos_data.js';

export const COS_CATS = {
  frame:   { list: FRAMES,   label: 'FRAMES' },
  logo:    { list: LOGOS,    label: 'LOGOS' },
  cursor:  { list: CURSORS,  label: 'POINTERS' },
  scheme:  { list: SCHEMES,  label: 'SCHEMES' },
  pot:     { list: POTS,     label: 'POTS' },
  seed:    { list: SPECIES,  label: 'SEEDS' }
};


const curCache = Object.create(null);
function curURL(mask, style, hx, hy) {
  const key = style.id + ':' + (mask === CUR_HANDMASK ? 'h' : 'a');
  if (curCache[key]) return curCache[key];
  const w = mask[0].length, h = mask.length, S = 2;
  const cv = document.createElement('canvas');
  cv.width = w * S; cv.height = h * S;
  const g = cv.getContext('2d');
  if (!g) return 'default';
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = mask[y].charAt(x);
      if (ch === '.' || ch === ' ') continue;
      g.fillStyle = (ch === 'X') ? style.o : style.f;
      g.fillRect(x * S, y * S, S, S);
    }
  }
  let url;
  try { url = 'url("' + cv.toDataURL('image/png') + '") ' + (hx * S) + ' ' + (hy * S); }
  catch (e) { return 'default'; }
  curCache[key] = url;
  return url;
}

const Cos = {
  st: null,
  preview: null,        /* { cat, id } while the mouse is over a shop card */
  flickT: null,
  subs: [],

  boot() {
    const def = {
      owned: { frame: ['beige'], logo: ['temple'], cursor: ['stock'], scheme: ['vga'], pot: ['terra'], seed: ['sunshoot'] },
      eq:    { frame: 'beige', logo: 'temple', cursor: 'stock', scheme: 'vga', pot: 'terra' }
    };
    const got = { ...def, ...(JSON.parse(localStorage.getItem('templeos.cosm')) || {}) };
    /* a save from before the shop existed carries neither key; fill both,
       and make sure the free items are always owned however old it is */
    got.owned = { ...def.owned, ...(got.owned || {}) };
    got.eq    = { ...def.eq, ...(got.eq || {}) };
    for (const cat in def.owned) {
      if (!Array.isArray(got.owned[cat])) got.owned[cat] = def.owned[cat].slice();
      def.owned[cat].forEach(id => { if (got.owned[cat].indexOf(id) < 0) got.owned[cat].push(id); });
      if (!this.find(cat, got.eq[cat]) || !this.has(cat, got.eq[cat], got)) got.eq[cat] = def.eq[cat];
    }
    this.st = got;
    LOGOS[0].svg = (document.getElementById('logo') || { innerHTML: '' }).innerHTML;
    this.applyAll();
  },

  find(cat, id) {
    const c = COS_CATS[cat];
    if (!c) return null;
    for (const it of c.list) if (it.id === id) return it;
    return null;
  },
  has(cat, id, st) {
    st = st || this.st;
    const l = st.owned[cat] || [];
    return l.indexOf(id) >= 0;
  },
  owned(cat) { return (this.st.owned[cat] || []).slice(); },
  equipped(cat) { return this.st.eq[cat]; },

  buy(cat, id) {
    const it = this.find(cat, id);
    if (!it || this.has(cat, id)) return false;
    if (!window.Economy.spend(it.price, 'DAVE: ' + it.name)) return false;
    this.st.owned[cat].push(id);
    this.save();
    return true;
  },
  equip(cat, id) {
    if (!this.has(cat, id)) return false;
    if (cat === 'seed') return false;                /* seeds are stock, not a look */
    this.st.eq[cat] = id;
    this.save();
    this.applyAll();
    this.subs.forEach(f => { try { f(); } catch (e) {} });
    return true;
  },
  onChange(f) { this.subs.push(f); },
  save() { localStorage.setItem('templeos.cosm', JSON.stringify(this.st)); },

  /* what is live right now: the preview if the mouse is over a card, the
     equipped item otherwise. Nothing is written while previewing. */
  live(cat) {
    if (this.preview && this.preview.cat === cat) return this.preview.id;
    return this.st.eq[cat];
  },
  hover(cat, id) {
    this.preview = (cat && id) ? { cat: cat, id: id } : null;
    this.applyAll();
  },

  applyAll() {
    this.applyFrame();
    this.applyCursor();
    this.applyScheme();
    this.applyLogo();
  },

  applyFrame() {
    const room = document.getElementById('room');
    const f = this.find('frame', this.live('frame')) || FRAMES[0];
    if (!room) return;
    /* clear anything the last frame set, then write this one */
    FRAMES.forEach(fr => Object.keys(fr.vars || {}).forEach(k => room.style.removeProperty(k)));
    for (const k in (f.vars || {})) room.style.setProperty(k, f.vars[k]);

    let deco = document.getElementById('framedeco');
    if (!deco) {
      const mon = document.getElementById('monitor');
      if (!mon) return;
      deco = document.createElement('div');
      deco.id = 'framedeco';
      deco.setAttribute('aria-hidden', 'true');
      mon.appendChild(deco);
    }
    const imgs = [], poss = [], sizes = [];
    (f.deco || []).forEach(d => {
      const svg = DECO_SVG[d.svg];
      if (!svg) return;
      imgs.push('url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '")');
      poss.push(d.pos);
      sizes.push(d.size);
    });
    deco.style.backgroundImage = imgs.join(',');
    deco.style.backgroundPosition = poss.join(',');
    deco.style.backgroundSize = sizes.join(',');

    const badge = document.querySelector('#badge span');
    if (badge) badge.textContent = f.brand || 'HOLYTRON  DM-640';

    /* the tint layer lives inside the glass so the phosphor is what changes */
    const scr = document.getElementById('screen');
    if (scr && !document.getElementById('frametint')) {
      const t = document.createElement('div');
      t.id = 'frametint';
      t.setAttribute('aria-hidden', 'true');
      scr.appendChild(t);
      const fl = document.createElement('div');
      fl.id = 'frameflash';
      fl.setAttribute('aria-hidden', 'true');
      scr.appendChild(fl);
    }

    clearInterval(this.flickT);
    this.flickT = null;
    if (f.flick) {
      const fl = document.getElementById('frameflash');
      this.flickT = setInterval(() => {
        if (!fl || Math.random() > 0.11) return;
        fl.classList.add('hit');
        setTimeout(() => fl.classList.remove('hit'), 16);
      }, 900);
    }
  },

  applyCursor() {
    const room = document.getElementById('room');
    if (!room) return;
    const c = this.find('cursor', this.live('cursor')) || CURSORS[0];
    if (c.system || !c.mask) {
      ['--cur-arrow', '--cur-hand', '--cur-move', '--cur-text', '--cur-cross'].forEach(k => room.style.removeProperty(k));
      return;
    }
    const arrow = curURL(c.mask, c, c.hx || 0, c.hy || 0);
    const hand  = curURL(CUR_HANDMASK, c, 5, 0);
    room.style.setProperty('--cur-arrow', arrow + ', default');
    room.style.setProperty('--cur-hand',  hand  + ', pointer');
    room.style.setProperty('--cur-move',  arrow + ', move');
  },

  applyScheme() {
    const room = document.getElementById('room');
    if (!room) return;
    const s = this.find('scheme', this.live('scheme')) || SCHEMES[0];
    const v = s.v;
    room.style.setProperty('--sch-bg', v.bg);
    room.style.setProperty('--sch-fg', v.fg);
    room.style.setProperty('--sch-ok', v.ok);
    room.style.setProperty('--sch-hi', v.hi);
    room.style.setProperty('--sch-err', v.err);
    room.style.setProperty('--sch-dim', v.dim);
    room.style.setProperty('--sch-acc', v.acc);
  },

  applyLogo() {
    const host = document.getElementById('logo');
    if (!host) return;
    const l = this.find('logo', this.live('logo')) || LOGOS[0];
    if (l.svg != null && host.innerHTML !== l.svg) host.innerHTML = l.svg;
  }
};

export { Cos };
window.Cos = Cos;
