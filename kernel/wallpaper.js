/* The desktop background: a still picture (crushed to the sixteen colours on
   the way in, like everything else here) or a looping video drawn onto a
   canvas. Anything that can show a picture can offer "set as background" by
   calling setWallpaperFromPath(), which is how the desktop icons, the viewer
   and a folder all do it. */
import { fs as vfs } from './vfs.js';
import { toast } from './wm.js';
import { VaultURL } from './vault.js';
import { ditherVGA, UP } from './imaging.js';
import { sys } from './trophy_hook.js';
import { LiveWall } from './wallpaper_live.js';
import { applyReadable } from './readable.js';

const WALL_KEY = 'templeos.wallpaper.v1';
let wallpaper = null;             /* { src, mode, kind, vault? } */

export const WALL_MODES = [
  { id: 'fill',    label: 'FILL THE SCREEN',  bg: 'cover',     rep: 'no-repeat', fit: 'cover' },
  { id: 'fit',     label: 'FIT INSIDE',       bg: 'contain',   rep: 'no-repeat', fit: 'contain' },
  { id: 'stretch', label: 'STRETCH',          bg: '100% 100%', rep: 'no-repeat', fit: 'fill' },
  { id: 'center',  label: 'CENTRE, SMALL',    bg: 'auto',      rep: 'no-repeat', fit: 'none' },
  { id: 'tile',    label: 'TILE',             bg: 'auto',      rep: 'repeat',    fit: 'none' }
];
const modeOf = id => WALL_MODES.find(m => m.id === id) || WALL_MODES[0];

/* a live wallpaper (kernel/wallpaper_live.js): one of the Garden's rooms, moving, with nothing growing in it. HOLYC.EXE's quiet gift 'garden_wall' (kernel/buffs_core.js); `room` is a room id, or null to put it away. */
const liveOk = () => { try { return !!(window.Buffs && window.Buffs.has('garden_wall')); } catch (e) { return false; } };
export const liveWallpaper = () => (wallpaper && wallpaper.kind === 'live' && liveOk() ? wallpaper.room : null);
export function setLiveWallpaper(room) {
  if (!room) { if (wallpaper && wallpaper.kind === 'live') clearWallpaper(true); return false; }
  if (!liveOk()) return false;
  wallpaper = { kind: 'live', room: room, mode: 'fill' };
  applyWallpaper();
  try { localStorage.setItem(WALL_KEY, JSON.stringify(wallpaper)); } catch (e) { /* kept for this sitting */ }
  sys.emit('bg', { fit: 'fill', kind: 'live' });
  return true;
}

export const hasWallpaper = () => !!wallpaper || !!(() => { try { return localStorage.getItem(WALL_KEY); } catch (e) { return null; } })();

export async function setWallpaperFromPath(path, mode) {
  const file = await vfs.read(path);
  if (!file || (file.type !== 'image' && file.type !== 'video')) { toast('THAT IS NOT A PICTURE.'); return false; }
  const isVideo = file.type === 'video';
  const src = isVideo ? (file.vault ? await VaultURL.url(file.vault) : file.src) : file.src;
  if (!src) { toast('COULD NOT READ THAT FILE.'); return false; }
  /* the wallpaper is stored by name + vault key, not the resolved blob URL,
     which would not survive a reload */
  wallpaper = isVideo
    ? { vault: file.vault, src: file.src, mode: mode || 'fill', kind: 'video' }
    : { src, mode: mode || 'fill', kind: 'image' };
  applyWallpaper();
  try { localStorage.setItem(WALL_KEY, JSON.stringify(wallpaper)); } catch (e) {}
  toast('BACKGROUND SET.');
  sys.mark('fits', wallpaper.mode); sys.emit('bg', { fit: wallpaper.mode, kind: wallpaper.kind });
  return true;
}

/* a picture that is not a file (a sheet in the Crayon): hand over its pixels as a data URL */
export function setWallpaperFromSrc(src, mode) {
  wallpaper = { src, mode: mode || 'fill', kind: 'image' };
  applyWallpaper();
  try { localStorage.setItem(WALL_KEY, JSON.stringify(wallpaper)); } catch (e) { toast('THAT PICTURE IS TOO BIG TO KEEP AS THE BACKGROUND.'); return false; }
  toast('BACKGROUND SET.');
  sys.mark('fits', wallpaper.mode); sys.emit('bg', { fit: wallpaper.mode, kind: 'image' });
  return true;
}

/* the menu entries every "this is a picture" menu shares */
export function wallpaperMenu(path, isVideo) {
  return WALL_MODES.filter(m => !isVideo || m.fit).map(m => ({
    label: 'BACKGROUND: ' + m.label, run: () => setWallpaperFromPath(path, m.id)
  }));
}

export function clearWallpaper(quiet) {
  wallpaper = null;
  /* the key has to be gone before applyWallpaper runs, or its localStorage
     fallback (for rehydrating on load) just reads the old value straight
     back in and undoes the clear */
  try { localStorage.removeItem(WALL_KEY); } catch (e) {}
  applyWallpaper();
  if (!quiet) toast('BACKGROUND CLEARED.');
}

/* the desktop's video wallpaper is drawn onto a canvas, crushed to the same
   sixteen-colour palette every still image gets -- not a real <video>
   element sitting behind the icons, which would both look too HD next to
   everything else and hand the browser's own picture-in-picture/context
   menu to something that is supposed to be inert wallpaper */
/* the desktop's video wallpaper is drawn onto a canvas, crushed to the same
   sixteen-colour palette every still image gets -- not a real <video>
   element sitting behind the icons, which would both look too HD next to
   everything else and hand the browser's own picture-in-picture/context
   menu to something that is supposed to be inert wallpaper */
const DeskVid = {
  raf: null, video: null, cv: null, last: 0,
  start(src, mode) {
    this.stop();
    const desk = document.getElementById('desktop');
    if (!desk) return;
    const cv = document.createElement('canvas');
    cv.id = 'deskvid';
    cv.style.position = 'absolute';
    cv.style.left = '0'; cv.style.top = '0';
    cv.style.width = '100%'; cv.style.height = '100%';
    cv.style.objectFit = modeOf(mode).fit;
    cv.style.zIndex = '0';
    desk.insertBefore(cv, desk.firstChild);

    const v = document.createElement('video');
    v.src = src; v.loop = true; v.muted = true; v.playsInline = true;
    v.setAttribute('playsinline', '');
    this.cv = cv; this.video = v;

    let sized = false;
    const size = () => {
      const W = v.videoWidth || 320, H = v.videoHeight || 240;
      const s = Math.min(1, 220 / Math.max(W, H));
      cv.width = Math.max(2, Math.round(W * s));
      cv.height = Math.max(2, Math.round(H * s));
      sized = true;
    };
    v.addEventListener('loadedmetadata', () => { size(); v.play().catch(() => {}); });
    v.addEventListener('error', () => { toast('THAT VIDEO WILL NOT DECODE.'); this.stop(); });

    const loop = ts => {
      if (!this.cv || !document.body.contains(this.cv)) { this.stop(); return; }
      this.raf = requestAnimationFrame(loop);
      if (!sized && v.videoWidth) size();
      if (!sized || v.readyState < 2) return;
      if (ts - this.last < 100) return;    /* ten frames a second */
      this.last = ts;
      const o = cv.getContext('2d');
      if (!o) return;
      try {
        o.imageSmoothingEnabled = false;
        o.drawImage(v, 0, 0, cv.width, cv.height);
        if (UP.vga) ditherVGA(o, cv.width, cv.height);
      } catch (e) { /* a frame the crush choked on isn't worth stopping over */ }
    };
    this.raf = requestAnimationFrame(loop);
  },
  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    if (this.cv && this.cv.parentNode) this.cv.parentNode.removeChild(this.cv);
    if (this.video) { try { this.video.pause(); this.video.src = ''; } catch (e) {} }
    this.cv = this.video = null;
  }
};

function stopDeskVideo() { DeskVid.stop(); }
function startDeskVideo(src, mode) { DeskVid.start(src, mode); }

export async function applyWallpaper() {
  try { await applyWallpaperNow(); } finally { setTimeout(applyReadable, 60); }       /* the veil that keeps the windows readable over whatever it is (kernel/readable.js) */
}
async function applyWallpaperNow() {
  const desk = document.getElementById('desktop');
  if (!desk) return;
  try {
    const raw = localStorage.getItem(WALL_KEY);
    if (raw && !wallpaper) wallpaper = JSON.parse(raw);
  } catch (e) {}
  if (wallpaper && wallpaper.kind === 'live' && !liveOk()) wallpaper = null;      /* the gift is what holds it up */
  if (!wallpaper) {
    desk.style.backgroundImage = '';
    DeskVid.stop(); LiveWall.stop();
    return;
  }
  if (wallpaper.kind === 'live') {
    desk.style.backgroundImage = '';
    DeskVid.stop();
    if (LiveWall.room() !== wallpaper.room) LiveWall.start(wallpaper.room);
    return;
  }
  LiveWall.stop();
  const m = modeOf(wallpaper.mode);
  if (wallpaper.kind === 'video') {
    desk.style.backgroundImage = '';
    /* a vault key means the blob URL from last session is stale; mint a
       fresh one rather than trusting the one we saved */
    const src = wallpaper.vault ? await VaultURL.url(wallpaper.vault) : wallpaper.src;
    if (!src) { DeskVid.stop(); return; }
    DeskVid.start(src, wallpaper.mode);
    return;
  }
  DeskVid.stop();
  desk.style.backgroundImage = 'url("' + wallpaper.src + '")';
  desk.style.backgroundRepeat = m.rep;
  desk.style.backgroundSize = m.bg;
  desk.style.backgroundPosition = 'center';
}
