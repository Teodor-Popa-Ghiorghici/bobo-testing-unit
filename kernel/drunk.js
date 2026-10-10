/* Drinking in the bottle app used to mean a blur of a pixel and a half on the
   tube, which on a busy desktop was not a thing anyone could see. It leans on
   the whole screen now, in stages, and eases off as the level burns down:

     a little   the picture sways; the colours go warm and swim
     some       the glass bends: slow waves run through everything (an SVG
                displacement map over the tube), the blur arrives
     a lot      double vision, the room tilting, the edges closing in
     too much   the eyelids come down every few seconds, and stay a moment

   Every swallow also lands as a kick that rides over the level and dies away
   in a second, so each measure is felt when it goes down. How hard depends on what it is:
   a weak one is hardly a kick at all, and a strong one BURNS (`burn`, 0 to 1: drunk_bac.js
   burnOf): the room flushes warm and red at the edges, brightens, the eyes water (a blur
   that comes and goes in two seconds), and the picture flinches. It is the swallow, not
   the level, that does it, so it shows from the first sip of the raw stuff.

   It is the whole interface that is drunk, not just the picture: the filter and
   the transform go on #room (the case, the well, the chin and the knobs as well
   as the tube), and the edges closing in and the eyelids are an overlay fixed to
   the viewport, so nothing on the screen stays sober. (#tube is left alone: the
   hold knobs, the saver and the power animation own it.)

   How drunk that is comes from kernel/drunk_bac.js: a measure takes half a
   minute to arrive and the body clears one every 45 seconds, so the way to the
   floor is a journey of minutes and nothing that is clicked can hurry it. At the
   limit the whole window goes (kernel/blackout.js). With LORE ACCURATE on (kernel/lore.js, earned) the first sip of anything with alcohol in it is the limit:
   `knockOut()` plays the faint (kernel/faint.js) over the room and then the blackout. */
import { newBlood, swallow, step, over, levelOf, stageOf, wake, proofOf, BAC } from './drunk_bac.js';
import { FAINT_SECS, AT, frame as faintFrame, starAt } from './faint.js';
import { status as loreStatus, load as loreLoad, save as loreSave } from './lore.js';
import { DRINKS } from './cos_data.js';
import { Snd } from './snd.js';
import { createStageWatch, scene as trophyScene, blackedOut as trophyBlackout } from '../apps/bottle/trophy_calls.js';
const watch = createStageWatch();                  /* the trophies' view of the journey: a glow held, a limit reached and drained away */
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute;pointer-events:none" aria-hidden="true">' +
  '<filter id="drunkfx" x="-6%" y="-6%" width="112%" height="112%" color-interpolation-filters="sRGB">' +
  '<feTurbulence id="dfT" type="fractalNoise" baseFrequency="0.005 0.016" numOctaves="1" seed="4" result="n"/>' +
  '<feOffset id="dfN" in="n" dx="0" dy="0" result="n2"/>' +
  '<feDisplacementMap id="dfD" in="SourceGraphic" in2="n2" scale="0" xChannelSelector="R" yChannelSelector="G" result="w"/>' +
  '<feOffset id="dfO" in="w" dx="0" dy="0" result="o"/>' +
  '<feComposite id="dfC" in="w" in2="o" operator="arithmetic" k1="0" k2="1" k3="0" k4="0"/>' +
  '</filter></svg>';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export const Drunk = {
  level: 0,
  kick: 0,
  burn: 0,
  raf: null,
  blood: newBlood(), out: false, faint: null,
  lore: loreLoad(typeof localStorage !== 'undefined' ? localStorage : { getItem: () => null }),
  svg: null, over: null, vig: null, lids: null, fx: {},
  /* one measure, drunk; `units` is what it is worth against the Jägermeister the machine was calibrated on (1), 0 for something with nothing in it */
  drink(units = 1) {
    if (units <= 0) { this.kick = Math.max(this.kick, 0.15); this._ensureLoop(); return; }
    swallow(this.blood, units); watch.measure();
    this.kick = clamp(0.25 + 0.75 * Math.min(1, units), 0, 1);              /* the Jägermeister is 1: a weak one hardly kicks */
    this.burn = Math.max(this.burn, proofOf(units).burn * 0.6);
    this._ensureLoop();
  },
  /* a swallow on the way down: the screen gives a small lurch, and a strong one (`burn` 0 to 1, from the bottle) a flush */
  gulp(burn = 0) { this.kick = Math.max(this.kick, 0.4 + 0.45 * burn); this.burn = Math.max(this.burn, burn); this._ensureLoop(); },
  stage() { return stageOf(this.blood); },
  blackedOut() { return this.out || !!this.faint; },
  /* ---- LORE ACCURATE: how far off it is, whether it is on, and the first sip that ends it ---- */
  loreStatus() { return loreStatus(this.lore.blackouts, DRINKS, id => !!(window.Cos && window.Cos.has('drink', id))); },
  loreOn() { return !!this.lore.on && this.loreStatus().unlocked; },
  setLore(on) {
    if (on && !this.loreStatus().unlocked) return false;
    this.lore.on = !!on; loreSave(localStorage, this.lore);
    try { window.dispatchEvent(new Event('lore-changed')); } catch (e) { /* nobody is listening */ }
    return this.lore.on;
  },
  knockOut() {
    if (this.out || this.faint) return false;
    this.faint = { t0: performance.now(), thud: false, ring: false };
    this.kick = 1;
    Snd.tone(240, 1500, { type: 'sawtooth', to: 38, vol: 0.05 });          /* the floor goes out from under it */
    this._ensureLoop();
    return true;
  },
  async blackout() {
    if (this.out) return;
    this.out = true;
    this.lore.blackouts++; loreSave(localStorage, this.lore);
    try { window.dispatchEvent(new Event('lore-changed')); } catch (e) { /* nobody is listening */ }
    try {
      const m = await import('./blackout.js');
      watch.out(); if (window.Trophies) window.Trophies.hold();         /* no card while the lights are out */
      m.runBlackout(() => {
        this.out = false; trophyBlackout(); if (window.Trophies) window.Trophies.release();
        wake(this.blood);
        this.level = levelOf(this.blood);
        this.kick = 1;
        this._ensureLoop();
      }, { onFlash: trophyScene });
    } catch (e) { this.out = false; throw e; }
  },
  _build() {
    if (this.svg) return;
    const h = document.createElement('div');
    h.innerHTML = SVG;
    this.svg = h.firstChild;
    document.body.appendChild(this.svg);
    ['dfT', 'dfN', 'dfD', 'dfO', 'dfC'].forEach(id => { this.fx[id] = this.svg.querySelector('#' + id); });
    if (!this.over) {
      /* one overlay for the whole viewport: the vignette, and the lids */
      const d = document.createElement('div');
      d.id = 'drunkover';
      d.setAttribute('aria-hidden', 'true');
      d.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2000;display:none';
      const star = '<svg viewBox="0 0 5 5" width="26" height="26" shape-rendering="crispEdges" style="position:absolute;display:none"><path fill="#FFFF55" d="M2 0h1v1H2zM1 1h3v1H1zM0 2h5v1H0zM1 3h3v1H1zM0 4h2v1H0zM3 4h2v1H3z"/></svg>';
      d.innerHTML = '<div style="position:absolute;inset:0"></div>' +
                    '<div style="position:absolute;left:0;right:0;top:0;height:0;background:#000"></div>' +
                    '<div style="position:absolute;left:0;right:0;bottom:0;height:0;background:#000"></div>' +
                    /* the faint (kernel/faint.js): the flash of the thud, five stars going round, and what it says */
                    '<div id="drunkfaint" style="position:absolute;inset:0;display:none"><div style="position:absolute;inset:0;background:#fff;opacity:0"></div>' + star + star + star + star + star +
                    '<div style="position:absolute;left:0;right:0;top:50%;margin-top:-10px;text-align:center;font:72px/1 VT323,monospace;color:#fff;text-shadow:3px 3px 0 #000;opacity:0">ONE SIP.' +
                    '<div style="font-size:30px;color:#FFFF55;margin-top:6px">LORE ACCURATE.</div></div></div>';
      document.body.appendChild(d);
      this.over = d;
      this.vig = d.children[0];
      this.lids = [d.children[1], d.children[2]];
      this.fa = d.children[3];
    }
  },
  _ensureLoop() {
    if (this.raf) return;
    this._build();
    let last = performance.now();
    const tick = now => {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      step(this.blood, dt);
      this.level = levelOf(this.blood);
      watch.step(dt, stageOf(this.blood), this.out);
      this.kick = Math.max(0, this.kick - dt * 1.6);
      this.burn = Math.max(0, this.burn - dt * 0.42);
      if (this.faint && now - this.faint.t0 >= FAINT_SECS * 1000) { this.faint = null; this.blood.blood = BAC.LIMIT + 0.01; }      /* the faint is over: the limit has been reached */
      if (over(this.blood) && !this.out && !this.faint) this.blackout();
      this._apply(now);
      if (this.level > 0.001 || this.burn > 0.01 || this.out || this.faint) this.raf = requestAnimationFrame(tick);
      else { this.raf = null; this._clear(); }
    };
    this.raf = requestAnimationFrame(tick);
  },
  _apply(now) {
    const room = document.getElementById('room');
    if (!room) return;
    const L = clamp(this.level + this.kick * 0.14, 0, 1), f = this.fx;
    /* the glass bending: waves running through, and a second picture beside the first */
    const warp = L > 0.08 ? (L - 0.05) * 46 : 0;
    const ghost = clamp((L - 0.35) * 0.85, 0, 0.46);
    if (f.dfD) {
      f.dfD.setAttribute('scale', warp.toFixed(1));
      f.dfN.setAttribute('dy', ((now / 28) % 400).toFixed(1));
      f.dfN.setAttribute('dx', (Math.sin(now / 1900) * 60).toFixed(1));
      f.dfO.setAttribute('dx', (Math.sin(now / 760) * L * 16).toFixed(1));
      f.dfO.setAttribute('dy', (Math.cos(now / 980) * L * 6).toFixed(1));
      f.dfC.setAttribute('k2', (1 - ghost).toFixed(3));
      f.dfC.setAttribute('k3', ghost.toFixed(3));
    }
    const Bn = this.burn, calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hue = Math.sin(now / 900) * L * 34 - Bn * 14;
    const sat = 1 + L * 0.9 + Math.sin(now / 650) * L * 0.2 + Bn * 0.55;
    const blur = L * L * 2.4 + this.kick * 1 + Bn * Bn * 1.8;                /* the eyes water */
    room.style.filter = (warp > 0 ? 'url(#drunkfx) ' : '') + 'blur(' + blur.toFixed(2) + 'px) saturate(' + sat.toFixed(2) +
      ') hue-rotate(' + hue.toFixed(1) + 'deg) contrast(' + (1 + L * 0.18).toFixed(2) + ')' + (Bn > 0.01 ? ' brightness(' + (1 + Bn * 0.14).toFixed(2) + ')' : '');
    /* the room tilting, the picture drifting, breathing in and out */
    const rot = Math.sin(now / 1300) * L * 2.4 + Math.sin(now / 470) * L * 0.5;
    const tx = Math.sin(now / 1700) * L * 16 + (calm ? 0 : Math.sin(now / 37) * Bn * 3), ty = Math.cos(now / 1100) * L * 9 + (calm ? 0 : Math.cos(now / 29) * Bn * 2);
    const z = 1 + Math.sin(now / 2300) * L * 0.03 + this.kick * 0.012;
    room.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) rotate(' + rot.toFixed(2) + 'deg) scale(' + z.toFixed(3) + ')';
    /* the edges close in, and (late) the lids */
    if (this.over) {
      this.over.style.display = L > 0.12 || Bn > 0.02 ? 'block' : 'none';
      this.vig.style.boxShadow = 'inset 0 0 ' + (60 + L * 150).toFixed(0) + 'px ' + (L * 46).toFixed(0) + 'px rgba(0,0,0,' + (L * 0.75).toFixed(2) + ')' +
        (Bn > 0.02 ? ', inset 0 0 170px 30px rgba(255,70,10,' + (Bn * 0.4).toFixed(2) + ')' : '');
      let lid = 0;
      if (L > 0.55) {
        const cyc = Math.pow(Math.max(0, Math.sin(now / (2100 - L * 700) + 1)), 7);
        lid = cyc * clamp((L - 0.5) * 1.1, 0, 0.55);
        if (L > 0.9 && Math.sin(now / 5300) > 0.985) lid = 0.62;
      }
      const h = lid > 0.004 ? (lid * 100).toFixed(1) + '%' : '0';
      this.lids[0].style.height = h; this.lids[1].style.height = h;
    }
    if (this.faint) this._faint(now, room);
    else if (this.fa) this.fa.style.display = 'none';
  },
  /* the faint, over whatever else is going on: the room tips over, the lids come down, a thud, stars, and a line of words */
  _faint(now, room) {
    const p = (now - this.faint.t0) / (FAINT_SECS * 1000), F = faintFrame(p);
    /* for somebody who has asked for less movement: no tipping over, no shake, no flash: the room just goes dark and the words come */
    const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const jx = F.shake && !calm ? (Math.random() - 0.5) * 36 * F.shake : 0, jy = F.shake && !calm ? (Math.random() - 0.5) * 30 * F.shake : 0;
    room.style.filter += ' blur(' + (calm ? 0 : F.blur).toFixed(1) + 'px) brightness(' + F.bright.toFixed(2) + ')';
    if (!calm) room.style.transform += ' translate(' + (F.tx + jx).toFixed(0) + 'px,' + (F.ty + jy).toFixed(0) + 'px) rotate(' + F.rot.toFixed(1) + 'deg) scale(' + F.zoom.toFixed(3) + ')';
    if (!this.faint.thud && p >= AT.thud) { this.faint.thud = true; Snd.thunk(); Snd.noise(220, { freq: 200, q: 0.7, vol: 0.14 }); }
    if (!this.faint.ring && p >= AT.ring) { this.faint.ring = true; Snd.tone(1760, 1500, { vol: 0.012 }); }       /* and a ringing in the ears */
    if (!this.over) return;
    this.over.style.display = 'block';
    const hh = F.lids.toFixed(1) + '%';
    this.lids[0].style.height = hh; this.lids[1].style.height = hh;
    const fa = this.fa, kids = fa.children;
    fa.style.display = 'block';
    kids[0].style.opacity = (calm ? 0 : F.flash).toFixed(2);
    for (let i = 0; i < 5; i++) {
      const pos = starAt(i, 5, now / 380), el = kids[1 + i];
      el.style.display = F.stars > 0 ? 'block' : 'none';
      el.style.left = (pos.x * 100).toFixed(1) + '%'; el.style.top = (pos.y * 100).toFixed(1) + '%'; el.style.opacity = F.stars.toFixed(2);
    }
    kids[6].style.opacity = F.text.toFixed(2);
  },
  _clear() {
    const room = document.getElementById('room');
    if (room) { room.style.filter = ''; room.style.transform = ''; }
    if (this.over) { this.over.style.display = 'none'; this.lids[0].style.height = '0'; this.lids[1].style.height = '0'; if (this.fa) this.fa.style.display = 'none'; }
  }
};
window.Drunk = Drunk;
