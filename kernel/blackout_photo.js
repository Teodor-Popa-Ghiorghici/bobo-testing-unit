/* The pictures behind the hallucinations: real photographs, pressed down to the
   sixteen colours and dithered, 320 pixels wide (assets/blackout/*.png, made by
   scripts/make-blackout-art.py). Each is taller than the screen, so the screen drifts
   up and down it while it is on: the second column is the highest the view may sit,
   the third the lowest (999: the bottom of the picture). Pixels are never resampled, only
   moved by whole rows. The shop's backdrops are these same pictures (kernel/cos_data.js). */
import { W, H } from './blackout_draw.js';

const FILES = {
  city: ['assets/blackout/city.png', 10, 37],
  park: ['assets/blackout/park.png', 10, 50],
  boulder: ['assets/blackout/boulder.png', 40, 91],
  cd: ['assets/blackout/cd.png', 0, 1],
  turtle: ['assets/blackout/turtle.png', 0, 0],
  lol: ['assets/blackout/lol.png', 0, 0],
  ultrakill: ['assets/blackout/ultrakill.png', 0, 0],
  /* the newer pictures: the range is the whole picture (999 is clamped to its own height) */
  posers: ['assets/blackout/posers.png', 0, 999],
  penguin: ['assets/blackout/penguin.png', 0, 999],
  shard: ['assets/blackout/shard.png', 0, 999],
  stargazing: ['assets/blackout/stargazing.png', 0, 999],
  lake: ['assets/blackout/lake.png', 0, 999],
  mosaic: ['assets/blackout/mosaic.png', 0, 999],
  bedroom: ['assets/blackout/bedroom.png', 0, 999],
  stairs: ['assets/blackout/stairs.png', 0, 999],
  lawn: ['assets/blackout/lawn.png', 0, 999],
  hill: ['assets/blackout/hill.png', 0, 999],
  temple: ['assets/blackout/temple.png', 0, 999],
  poster: ['assets/blackout/poster.png', 0, 999],
  glitter: ['assets/blackout/glitter.png', 0, 999],
  chaos: ['assets/blackout/chaos.png', 0, 999],
  meow: ['assets/blackout/meow.png', 0, 999],
  grin: ['assets/blackout/grin.png', 0, 999],
  boot: ['assets/blackout/boot.png', 0, 999],
  halo: ['assets/blackout/halo.png', 0, 999],
  aurora: ['assets/blackout/aurora.png', 0, 999],
  axe: ['assets/blackout/axe.png', 0, 999],
  pond: ['assets/blackout/pond.png', 0, 999],
  monitor: ['assets/blackout/monitor.png', 0, 999],
  tictac: ['assets/blackout/tictac.png', 0, 999],
  phone: ['assets/blackout/phone.png', 0, 999],
  crest: ['assets/blackout/crest.png', 0, 999],
  domnule: ['assets/blackout/domnule.png', 0, 999],
  kitten: ['assets/blackout/kitten.png', 0, 999],
  bear: ['assets/blackout/bear.png', 0, 999],
  labcoat: ['assets/blackout/labcoat.png', 0, 999]
};
const BANK = {};

export const hasPhoto = id => !!BANK[id];

/* a scene that is only its photograph (the newer pictures): how blackout.js draws it */
export const picture = id => (g, t) => photo(g, id, t);

/* started the moment the lights begin to go; the first picture is a couple of seconds away */
export function loadPhotos() {
  return Promise.all(Object.keys(FILES).map(id => BANK[id] || new Promise(done => {
    const [src, lo, hi] = FILES[id], im = new Image();
    im.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = im.naturalWidth; cv.height = im.naturalHeight;
      const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(im, 0, 0);
      BANK[id] = { cv, lo: Math.min(lo, cv.height - H), hi: Math.min(hi, cv.height - H) };
      done();
    };
    im.onerror = () => done();
    im.src = src;
  })));
}

export function photo(g, id, t) {
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const p = BANK[id];
  if (!p) return;
  const y0 = Math.round(p.lo + (p.hi - p.lo) * (0.5 + 0.5 * Math.sin(t * 1.3)));
  g.drawImage(p.cv, 0, -y0);
}
