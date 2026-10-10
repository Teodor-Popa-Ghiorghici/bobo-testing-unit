/* THE PLATE IN THE CHIN. A frame's little label (HIGH VOLTAGE, 1 CREDIT, SR 072 NORMAL: kernel/cos_data.js `pos: 'chin'`) used to be pinned to the bottom left corner of the
   case, which is where the brand and the SCAN knob stand, so it lay on top of both. It is now a flex item of the chin itself (#chinplate, in front of the panel of pots), so it
   can only ever stand in the free stretch between the knobs and the panel, and it is put away when that stretch is too short for it (a narrow window), rather than covering a
   control. `fits` is pure (scripts/check-dave.mjs); `setChinPlate` is the only part that touches the page. */
export const PLATE_GAP = 10;

/* does a plate `w` pixels wide fit in `free` pixels, with a gap on each side? */
export const fits = (free, w, gap = PLATE_GAP) => free >= w + 2 * gap;

/* the size an SVG says it is, from its viewBox: the plate is shown at exactly that, one SVG unit to a screen pixel */
export function sizeOf(svg) {
  const m = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(svg || '');
  return m ? { w: +m[1], h: +m[2] } : null;
}

let ro = null, cur = null;

function place() {
  const el = document.getElementById('chinplate'), chin = document.getElementById('chin'), panel = document.getElementById('panel');
  if (!el || !chin || !panel || !cur) return;
  el.hidden = true;                                    /* measure with it out of the way (the panel then stands at the right end), so the free stretch is what is really free */
  let right = chin.getBoundingClientRect().left;
  chin.querySelectorAll('.knob').forEach(k => { if (k !== document.getElementById('power') && k.offsetParent !== null) right = Math.max(right, k.getBoundingClientRect().right); });
  const bd = document.getElementById('badge');
  if (bd) right = Math.max(right, bd.getBoundingClientRect().right);
  const free = panel.getBoundingClientRect().left - right;
  const ok = fits(free, cur.w);
  el.hidden = !ok;
}

/* svg: the plate's markup, or null for a frame that has none */
export function setChinPlate(svg) {
  const chin = document.getElementById('chin'), panel = document.getElementById('panel');
  if (!chin || !panel) return;
  let el = document.getElementById('chinplate');
  if (!svg) { cur = null; if (el) el.remove(); if (ro) { ro.disconnect(); ro = null; } return; }
  cur = sizeOf(svg);
  if (!cur) return;
  if (!el) {
    el = document.createElement('div');
    el.id = 'chinplate';
    el.setAttribute('aria-hidden', 'true');
    chin.insertBefore(el, panel);
  }
  el.style.backgroundImage = 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '")';
  el.style.width = cur.w + 'px';
  el.style.height = cur.h + 'px';
  if (!ro && typeof ResizeObserver === 'function') { ro = new ResizeObserver(() => place()); ro.observe(chin); }
  place();
  requestAnimationFrame(place);                        /* the knobs' fonts and the badge settle a frame later */
}
