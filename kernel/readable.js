/* READABILITY: the windows and the icons stay easy to see over ANY background. A photograph or a moving wallpaper is busy and bright in places, and the machine's own windows (a frame in
   one of the sixteen colours) and the names under the icons were never drawn to be read over that. When the setting is on (DISPLAY.EXE, `DISP.read`, on unless it is turned off) and
   there is a background, three quiet things happen, none of them sudden:
     a veil between the wallpaper and everything on it, as dark and as soft as THIS picture needs (measured: how bright it is on average and how busy), never more than a little;
     a dark plate behind the name of every icon, and a hairline of black round the picture of it;
     a black hairline and a soft shadow round every window, so a frame is a frame whatever is behind it.
   `look(stats)` is pure (scripts/check-readable.mjs): a plain dark picture gets next to nothing, a bright or a busy one gets the most it is allowed, and the most is not jarring (a veil
   of 58 % at the very worst and a blur of three pixels). The picture is looked at again every couple of seconds while it moves, and the veil follows it slowly (an ease of about a second). */
export const LIMITS = { veil: 0.58, blur: 3 };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* mean and spread of the brightness (0..1) of a small sample of the picture, from its pixels as RGBA */
export function statsOf(rgba) {
  let n = 0, sum = 0, sq = 0, hot = 0;
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    const l = (0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]) / 255;
    sum += l; sq += l * l; n++; if (l > 0.75) hot++;
  }
  if (!n) return { mean: 0, sd: 0, hot: 0 };
  const mean = sum / n;
  return { mean: mean, sd: Math.sqrt(Math.max(0, sq / n - mean * mean)), hot: hot / n };
}

/* how much veil and blur this picture wants */
export function look(s) {
  const bright = clamp((s.mean - 0.26) / 0.55, 0, 1), busy = clamp((s.sd - 0.11) / 0.22, 0, 1), glare = clamp((s.hot - 0.1) / 0.5, 0, 1);
  const veil = clamp(0.06 + 0.34 * bright + 0.16 * busy + 0.1 * glare, 0, LIMITS.veil);
  const blur = clamp(busy * 2.2 + glare * 0.8, 0, LIMITS.blur);
  return { veil: s.mean < 0.18 && s.sd < 0.1 ? Math.min(veil, 0.1) : veil, blur: blur };
}

const SIZE = [48, 27];
let scrim = null, timer = 0, raf = 0, cur = { veil: 0, blur: 0 }, want = { veil: 0, blur: 0 }, probe = null, token = 0;
const on = () => { try { return !!(window.DISP && window.DISP.read); } catch (e) { return false; } };

function ensureScrim() {
  const desk = document.getElementById('desktop');
  if (!desk) return null;
  if (!scrim || !desk.contains(scrim)) {
    scrim = document.createElement('div'); scrim.id = 'readscrim'; scrim.setAttribute('aria-hidden', 'true');
    const icons = document.getElementById('icons');
    desk.insertBefore(scrim, icons || null);
  }
  return scrim;
}
function paint() {
  if (!scrim) return;
  scrim.style.background = 'rgba(0,0,0,' + cur.veil.toFixed(3) + ')';
  const b = cur.blur > 0.15 ? 'blur(' + cur.blur.toFixed(2) + 'px) ' : '';
  scrim.style.backdropFilter = scrim.style.webkitBackdropFilter = b + 'saturate(' + (1 - cur.veil * 0.35).toFixed(2) + ')';
}
function ease() {
  const k = 0.12;
  cur.veil += (want.veil - cur.veil) * k; cur.blur += (want.blur - cur.blur) * k;
  paint();
  if (Math.abs(want.veil - cur.veil) > 0.002 || Math.abs(want.blur - cur.blur) > 0.02) raf = requestAnimationFrame(ease);
  else { cur.veil = want.veil; cur.blur = want.blur; paint(); raf = 0; }
}
const aim = l => { want = l; if (!raf) raf = requestAnimationFrame(ease); };

function sample(src) {
  if (!probe) { probe = document.createElement('canvas'); probe.width = SIZE[0]; probe.height = SIZE[1]; }
  const g = probe.getContext('2d', { willReadFrequently: true });
  try { g.drawImage(src, 0, 0, SIZE[0], SIZE[1]); return statsOf(g.getImageData(0, 0, SIZE[0], SIZE[1]).data); } catch (e) { return null; }
}

/* called whenever the background or the setting changes */
export function applyReadable() {
  const mine = ++token;
  clearInterval(timer); timer = 0;
  const desk = document.getElementById('desktop');
  const live = document.getElementById('livewall') || document.getElementById('deskvid');
  let still = null;
  try { const w = JSON.parse(localStorage.getItem('templeos.wallpaper.v1') || 'null'); if (w && (w.kind === 'image' || !w.kind)) still = w.src; } catch (e) { /* none */ }
  const has = !!(live || still);
  document.documentElement.classList.toggle('readable', has && on());
  document.documentElement.classList.toggle('deskpic', has);          /* a picture is behind the icons: the names keep their plate, and a scheme's ink for a bare desk is not used (theme.css) */
  if (!desk) return;
  if (!has || !on()) { aim({ veil: 0, blur: 0 }); return; }
  ensureScrim();
  if (live) {
    const look2 = () => { if (mine !== token) return; const s = sample(live); if (s) aim(look(s)); };
    look2(); timer = setInterval(look2, 2200);
  } else {
    const im = new Image();
    im.onload = () => { if (mine !== token) return; const s = sample(im); aim(s ? look(s) : { veil: 0.3, blur: 1 }); };
    im.onerror = () => { if (mine === token) aim({ veil: 0.3, blur: 1 }); };
    im.src = still;
  }
}
if (typeof window !== 'undefined') window.addEventListener('wallpaper-changed', applyReadable);     /* (Node loads this file for the check, with no window) */
