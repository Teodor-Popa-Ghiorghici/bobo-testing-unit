import { initVFS } from './vfs.js';
import { openWindow } from './wm.js';
import { Cos } from './cos.js';
import { initDesktop } from './desktop.js';
import { Saver } from './saver.js';
import { Hold } from './hold.js';
import { wireKonami } from './desktop.js';
import { initHardware, CRT } from './hardware.js';
import "./snd.js";
import "./economy.js";
import "./vault.js";
import "./drunk.js";
import { Music } from './music.js';
import { SunUI } from './economy.js';
import { panic } from './panic.js';
window.Music = Music;

/* window.onerror is the closest a browser gets to a machine check */
window.addEventListener('error', e => {
  if (!e || !e.error) return;
  try { panic(e.error, 'ring 0'); } catch (x) {}
});
window.addEventListener('unhandledrejection', e => {
  try { panic(e.reason || new Error('rejected promise'), 'async fault'); } catch (x) {}
});

const PALETTE = ['#FFFF55','#55FF55','#55FFFF','#FF55FF','#FF5555','#FFFFFF','#5555FF'];

const BOOT_LINES = [
  ['TempleOS V5.03', 'w'],
  ['Public Domain. God\'s Third Temple.', 'y'],
  ['Loading Adam (task 0)...', 'g'],
  ['Spawning Seth...', 'g'],
  ['Mem: 640K OK', 'g'],
  ['HolyC JIT Ready', 'g'],
  ['DolDoc Ready', 'g'],
  ['Ring 0. No user mode. No network.', 'y'],
  ['Press Any Key', 'w']
];

function drawWordmark() {
  const wm = document.getElementById('wordmark');
  if(!wm) return;
  'TempleOS'.split('').forEach((ch, i) => {
    const s = document.createElement('span');
    s.textContent = ch;
    s.dataset.i = i;
    wm.appendChild(s);
  });
  let t = 0;
  setInterval(() => {
    t++;
    wm.querySelectorAll('span').forEach((s, i) => {
      s.style.color = PALETTE[(i + t) % PALETTE.length];
    });
  }, 220);
}

let bootDone = false;
let bootTimer = null;
let booting = false;
let vfsReady = false;

function runBootLines() {
  bootDone = false;
  booting = true;
  clearTimeout(bootTimer);

  const box = document.getElementById('bootlines');
  if (!box) { booting = false; return; }
  box.innerHTML = '';

  let i = 0;
  const step = () => {
    if (!CRT.on) { booting = false; return; } // Pause if turned off

    if (i >= BOOT_LINES.length) {
      const cur = document.createElement('span');
      cur.id = 'bootcursor';
      cur.className = 'blink';
      cur.textContent = '\u2588';
      box.lastChild.appendChild(cur);
      bootDone = true;
      booting = false;
      document.addEventListener('keydown', dismissSplash);
      document.addEventListener('click', dismissSplash);
      return;
    }
    const d = document.createElement('div');
    d.className = 'bootline ' + BOOT_LINES[i][1];
    d.textContent = BOOT_LINES[i][0];
    box.appendChild(d);
    i++;
    bootTimer = setTimeout(step, 150);
  };
  bootTimer = setTimeout(step, 400);
}

window.runBoot = async function() {
  if (bootDone || booting) return;
  if (!vfsReady) { await initVFS(); vfsReady = true; }
  runBootLines();
};

/* Power cycle: the shell stays alive in the background so windows and
   state survive, but the splash + boot lines replay every time the set
   is switched back on, same as the physical thing. */
window.powerOff = function() {
  if (!CRT.on) return;
  CRT.on = false;
  document.removeEventListener('keydown', dismissSplash);
  document.removeEventListener('click', dismissSplash);
  clearTimeout(bootTimer);
  booting = false;
  const lamp = document.getElementById('lamp');
  if (lamp) lamp.classList.remove('on');
  const screen = document.getElementById('screen');
  if (!screen) return;
  screen.classList.add('collapsing');
  setTimeout(() => {
    screen.classList.add('off');
    screen.classList.remove('collapsing');
  }, 270);
};

window.powerOn = function() {
  if (CRT.on) return;
  CRT.on = true;
  const screen = document.getElementById('screen');
  if (screen) screen.classList.remove('off', 'collapsing');
  const lamp = document.getElementById('lamp');
  if (lamp) lamp.classList.add('on');
  const shell = document.getElementById('shell');
  if (shell) shell.style.display = 'none';
  const sp = document.getElementById('splash');
  if (sp) sp.style.display = 'flex';
  window.runBoot();
  if (window.Snd && window.Snd.boot) window.Snd.boot();
  if (window.Music && window.Music.sync) window.Music.sync();
};

let desktopBuilt = false;

function dismissSplash() {
  if (!bootDone) return;
  const sp = document.getElementById('splash');
  if (!sp || sp.style.display === 'none') return;
  if (!CRT.on) return;
  
  sp.style.display = 'none';
  document.getElementById('shell').style.display = 'block';
  
  if (window.Snd && window.Snd.wake) window.Snd.wake();

  document.removeEventListener('keydown', dismissSplash);
  document.removeEventListener('click', dismissSplash);

  if (desktopBuilt) {
    if (window.Snd && window.Snd.ok) window.Snd.ok(); // coming back from a power cycle
    return;
  }
  desktopBuilt = true;
  if (window.Snd && window.Snd.ok) window.Snd.ok();
  initDesktop();
  try { SunUI.mount(); } catch(e) {}
  try { Hold.apply(); } catch(e) {}
  try { Saver.watch(); } catch(e) {}
  try { wireKonami(); } catch(e) {}
}

window._bootAt = Date.now();

document.addEventListener('DOMContentLoaded', () => {
  initHardware();
  Cos.boot();
  drawWordmark();
  if (CRT.on) {
    document.getElementById('screen').classList.remove('off');
    const lamp = document.getElementById('lamp');
    if (lamp) lamp.classList.add('on');
    window.runBoot();
  }
});
