import { varsOf, roomVars, barOf, VAR_NAMES, frameHex, install as installThemes } from './theme_fx.js';
import { FRAMES, LOGOS, CURSORS, SCHEMES, POTS, SPECIES, WALLS, CRAYON, GARAGE, DRINKS, ELEPHANT, SOLITAIRE, DECO_SVG, CUR_HANDMASK, forSale } from './cos_data.js';
import { Backdrops } from './backdrops.js';
import { setChinPlate } from './chin_plate.js';
import { handedOver } from './handed.js';

/* `kind`: what owning one of these means. 'look' goes on the machine and is worn one at a time (frame, logo, pointer, scheme);
   'stock' is what the garden grows with (pots, seeds); 'wall' is a picture, set as the background; 'unlock' is something an app
   was given and `app` is the registry id of the app that has it (the shop opens it from the card). */
export const COS_CATS = {
  frame:   { list: FRAMES,   label: 'FRAMES',    kind: 'look' },
  logo:    { list: LOGOS,    label: 'LOGOS',     kind: 'look' },
  cursor:  { list: CURSORS,  label: 'POINTERS',  kind: 'look' },
  scheme:  { list: SCHEMES,  label: 'SCHEMES',   kind: 'look' },
  pot:     { list: POTS,     label: 'POTS',      kind: 'stock', app: 'garden', appName: 'THE GARDEN' },
  seed:    { list: SPECIES,  label: 'SEEDS',     kind: 'stock', app: 'garden', appName: 'THE GARDEN' },
  wall:    { list: WALLS,    label: 'BACKDROPS', kind: 'wall' },
  crayon:  { list: CRAYON,   label: 'CRAYON',    kind: 'unlock', app: 'crayon',   appName: 'THE CRAYON' },
  garage:  { list: GARAGE,   label: 'GARAGE',    kind: 'unlock', app: 'garage',   appName: 'THE GARAGE' },
  drink:   { list: DRINKS,   label: 'DRINKS',    kind: 'unlock', app: 'bottle',   appName: 'THE BOTTLE' },
  elephant:{ list: ELEPHANT, label: 'ELEPHANT',  kind: 'unlock', app: 'elephant', appName: 'THE ELEPHANT' },
  solitaire:{ list: SOLITAIRE, label: 'SOLITAIRE', kind: 'unlock', app: 'solitaire', appName: 'SOLITAIRE' }
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

/* where the pictures bought from Dave are kept: a folder on the desktop (kernel/cos.js `shelve`) */
const BACKDROPS_DIR = '::/Backdrops', GATHER_KEY = 'templeos.backdrops.folder.v1';
const backdropFile = it => it.name.replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '') + '.PNG';

const Cos = {
  st: null,
  preview: null,        /* { cat, id } while the mouse is over a shop card */
  flickT: null,
  subs: [],

  boot() {
    const def = {
      owned: { frame: ['beige'], logo: ['temple'], cursor: ['stock'], scheme: ['vga'], pot: ['terra'], seed: ['sunshoot'],
               wall: [], crayon: [], garage: [], drink: ['jager'], elephant: [], solitaire: [] },
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
      if (cat in def.eq && (!this.find(cat, got.eq[cat]) || !this.has(cat, got.eq[cat], got))) got.eq[cat] = def.eq[cat];
    }
    this.st = got;
    installThemes(SCHEMES);
    LOGOS[0].svg = (document.getElementById('logo') || { innerHTML: '' }).innerHTML;
    this.applyAll();
    try { window.addEventListener('trophies-changed', () => this.syncRewards()); window.addEventListener('trophy-earned', ev => { if (ev.detail) this.grantFor(ev.detail.id); }); } catch (e) { /* no window */ }
    /* a blackout that deals a new backdrop puts it on the shelf for any shop that is open */
    /* a picture dealt by a blackout is news for an open shop, not a purchase: `true` says it was given, so FIRST PURCHASE is not earned by passing out */
    try { window.addEventListener('backdrop-seen', ev => this.tell('wall', ev.detail.id, true)); } catch (e) { /* no window */ }
    /* Dave leaves a box on the desktop when the shop window shuts (kernel/dave_box.js); it waits for the window list to say so */
    import('./dave_box.js').then(m => m.DaveBox.watch()).catch(() => {});
    this.gather();                                                                   /* pictures bought before there was a folder are brought out to it */
  },

  /* the items a shelf shows: a backdrop is not there until a blackout has dealt it (or it is already owned) */
  shelf(cat) {
    const c = COS_CATS[cat];
    if (!c) return [];
    /* a gift (kernel/gifts.js) is not on the shelf until it has been given */
    const list = c.list.filter(it => !it.gift || this.has(cat, it.id));
    if (c.kind !== 'wall') return list;
    return list.filter(it => this.has(cat, it.id) || Backdrops.seen(it.id));
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
    if (!it || this.has(cat, id) || it.reward || it.earn || it.gift) return false;       /* what a trophy gives, and what the four give, is not for sale */
    if (COS_CATS[cat].kind === 'wall' && !Backdrops.seen(id)) return false;   /* a backdrop is for sale once a blackout has shown it */
    if (!window.Economy.spend(it.price, 'DAVE: ' + it.name)) return false;
    this.st.owned[cat].push(id);
    this.save();
    if (COS_CATS[cat].kind === 'wall') this.shelve(it);
    this.tell(cat, id);
    return true;
  },
  /* a gift: something a trophy hands over (kernel/rewards.js). Returns true only when it is new. */
  grant(cat, id) {
    const it = this.find(cat, id);
    if (!it || this.has(cat, id)) return false;
    (this.st.owned[cat] || (this.st.owned[cat] = [])).push(id);
    this.save();
    this.tell(cat, id, true);                      /* given, not bought: FIRST PURCHASE and the SUN spent are for what was paid for */
    return true;
  },
  /* ---- what a trophy gives (kernel/cos_rewards.js): an item with `reward: '<trophy id>'` is owned the moment that trophy is earned ---- */
  rewardOf(trophyId) {
    const out = [];
    for (const cat in COS_CATS) COS_CATS[cat].list.forEach(it => { if (it.reward === trophyId) out.push({ cat, it }); });
    return out;
  },
  grantFor(trophyId, quiet) {
    let n = 0;
    this.rewardOf(trophyId).forEach(({ cat, it }) => {
      if (this.has(cat, it.id)) return;
      this.st.owned[cat].push(it.id); n++;
      if (!quiet) { this.tell(cat, it.id, true); if (it.secret) import('./wm.js').then(m => m.toast('DAVE LEFT YOU SOMETHING: ' + it.name + '  (' + COS_CATS[cat].label + ' SHELF)')).catch(() => {}); }
    });
    if (n) this.save();
    return n;
  },
  /* every reward whose trophy is already earned (a save from before the reward, a backfill): silently, at boot and whenever the ledger changes */
  syncRewards() {
    const T = window.Trophies;
    if (!T || !this.st) return 0;
    let n = 0;
    for (const cat in COS_CATS) COS_CATS[cat].list.forEach(it => { if (it.reward && T.earned(it.reward) && !this.has(cat, it.id)) { this.st.owned[cat].push(it.id); n++; this.tell(cat, it.id, true); } });
    if (n) this.save();
    return n;
  },
  /* an app that is open hears about a purchase the moment it is made */
  tell(cat, id, reward) {
    this.subs.forEach(f => { try { f(cat, id); } catch (e) {} });
    try { window.dispatchEvent(new CustomEvent('cos-changed', { detail: { cat, id, reward: !!reward } })); } catch (e) {}
  },
  /* a backdrop is also a picture you own: it goes into the BACKDROPS folder on the desktop (::/Backdrops) as a file, where every picture bought lives together. Opened from there
     (double-click, or right-click: BACKGROUND STYLE) it can be the desktop in any of the five fits: fill, fit, stretch, centre or tile */
  backdropsDir: BACKDROPS_DIR,
  async shelve(it) {
    try {
      const { fs } = await import('./vfs.js');
      await fs.write(BACKDROPS_DIR + '/' + backdropFile(it), { type: 'image', content: '', src: it.src });
      this.announce();
    } catch (e) {}
  },
  announce() {
    try { ['::', BACKDROPS_DIR].forEach(dir => window.dispatchEvent(new CustomEvent('vfs-changed', { detail: { dir } }))); } catch (e) { /* no window */ }
  },
  /* once, for a machine that bought backdrops before the folder: they were put in ::/Home/Backdrops. They are brought out to the desktop folder (moved, so there are not two), and any that
     are missing altogether are made again from the shop's own picture. */
  async gather() {
    try { if (localStorage.getItem(GATHER_KEY)) return; } catch (e) { return; }
    const owned = this.owned('wall').map(id => this.find('wall', id)).filter(Boolean);
    if (!owned.length) return;                                   /* the first purchase makes the folder by itself */
    try {
      const { fs } = await import('./vfs.js');
      await import('./vfs_ops.js');
      for (const it of owned) {
        const name = backdropFile(it), to = BACKDROPS_DIR + '/' + name, from = '::/Home/Backdrops/' + name;
        if (await fs.stat(to)) continue;
        if (await fs.stat(from)) await fs.move(from, BACKDROPS_DIR);
        else await fs.write(to, { type: 'image', content: '', src: it.src });
      }
      try { localStorage.setItem(GATHER_KEY, '1'); } catch (e) { /* tried again next time */ }
      this.announce();
    } catch (e) { /* the shop works without it */ }
  },
  equip(cat, id) {
    if (!this.has(cat, id)) return false;
    const kind = COS_CATS[cat].kind;
    if (cat === 'seed' || kind === 'unlock') return false;         /* seeds and the apps' gifts are used where they live, not worn; a pot is the garden's default */
    this.st.eq[cat] = id;
    this.save();
    if (kind === 'wall') {
      const it = this.find('wall', id);
      import('./wallpaper.js').then(m => m.setWallpaperFromSrc(it.src, 'fill')).catch(() => {});
    } else this.applyAll();
    this.subs.forEach(f => { try { f(cat, id); } catch (e) {} });
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
    let plate = null;
    (f.deco || []).forEach(d => {
      const svg = DECO_SVG[d.svg];
      if (!svg) return;
      if (d.pos === 'chin') { plate = svg; return; }          /* a label goes in the chin's own slot, never over the badge or the knobs (kernel/chin_plate.js) */
      imgs.push('url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '")');
      poss.push(d.pos);
      sizes.push(d.size || 'auto');          /* no size: the art's own, which is how the pixel pieces in cos_deco.js are shown, 1 to 1 */
    });
    deco.style.backgroundImage = imgs.join(',');
    deco.style.backgroundPosition = poss.join(',');
    deco.style.backgroundSize = sizes.join(',');
    setChinPlate(plate);

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

  /* A colour scheme is worn at two depths (kernel/theme_fx.js says which). The ROOM wears the chrome: the six inks the pop-ups read, the desktop's colour, the menu bar, the taskbar,
     the icons' names, and the hairline and glow round every window. Every window's own frame follows (dressFrame below). Nothing inside a window is ever recoloured but a Notes page,
     which wears the machine's scheme unless it was given one of its own by its [T]. */
  applyScheme() {
    const room = document.getElementById('room');
    if (!room) return;
    VAR_NAMES.forEach(k => room.style.removeProperty(k));              /* what the last scheme set (and anything an older build set) */
    const s = this.find('scheme', this.live('scheme')) || SCHEMES[0];
    const o = roomVars(s);
    for (const k in o) room.style.setProperty(k, o[k]);
    this.dressFrames();
  },

  isNotes: win => !!(win && win.dataset && win.dataset.app === 'notes'),

  /* the frame of a window: the edge is a border, so it is coloured here, from the VGA colour wm.js gave it (data-edge), and the bar from the one it gave that (data-bar). On a Notes window
     both take the scheme the window wears (its own [T], else the machine's) and the bar is also filtered by the stylesheet, which is how its page is dressed; on every other window they
     take the machine's scheme by arithmetic, the bar's ink pushed until it reads, and the body is left alone. A window in trouble (panic) stays red. */
  dressFrame(win) {
    const edge = win && win.dataset && win.dataset.edge;
    if (!edge || !this.st) return;
    if (!this.isNotes(win)) {
      const s = this.find('scheme', this.live('scheme')) || SCHEMES[0], bar = win.querySelector(':scope > .titlebar'), c = win.dataset.bar;
      const on = s.id !== 'vga' && !win.classList.contains('panic');
      win.style.borderColor = on ? frameHex(s.v, edge) : edge;
      if (bar && c) {
        const b = on ? barOf(s.v, c) : null;
        bar.style.background = b ? b.bar : c;
        if (b) win.style.setProperty('--bar-ink', b.ink); else win.style.removeProperty('--bar-ink');
      }
      this.wearNotes(win, null);
      return;
    }
    const s = this.find('scheme', win.dataset.scheme || this.live('scheme')) || SCHEMES[0];
    win.style.borderColor = s.id === 'vga' ? edge : frameHex(s.v, edge);
    this.wearNotes(win, s);
  },
  dressFrames() { document.querySelectorAll('.win[data-edge]').forEach(w => this.dressFrame(w)); },

  /* the scheme worn as the page's inks and the title bar's filter, on the window itself (a Notes window) */
  wearNotes(win, s) {
    VAR_NAMES.forEach(k => win.style.removeProperty(k));
    win.classList.toggle('themed', !!(s && s.id !== 'vga'));
    if (!s) return;
    const o = varsOf(s);
    for (const k in o) win.style.setProperty(k, o[k]);
  },

  /* a Notes window's own scheme (its [T]); null puts it back on the machine's. Any other window has none to wear. */
  applyWinScheme(win, schemeId) {
    if (!win || !this.isNotes(win)) return;
    if (!schemeId) { delete win.dataset.scheme; this.dressFrame(win); return; }
    if (!this.find('scheme', schemeId)) return;
    win.dataset.scheme = schemeId;
    this.dressFrame(win);
  },

  applyLogo() {
    const host = document.getElementById('logo');
    if (!host) return;
    const l = this.find('logo', this.live('logo')) || LOGOS[0];
    if (l.svg != null && host.innerHTML !== l.svg) host.innerHTML = l.svg;
  }
};

Cos.COS_CATS = COS_CATS;
/* every picture bought is owed to ::/Backdrops: RESTORE SYSTEM FILES writes back the ones that were deleted for good */
handedOver(() => Cos.st ? Cos.owned('wall').map(id => Cos.find('wall', id)).filter(Boolean).map(it => ({ path: BACKDROPS_DIR + '/' + backdropFile(it), type: 'image', content: '', src: it.src })) : []);

export { Cos };
window.Cos = Cos;
