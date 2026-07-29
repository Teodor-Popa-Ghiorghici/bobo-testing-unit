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
import { Music } from './music.js';
window.Music = Music;

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

window.runBoot = async function() {
  if (bootDone || booting) return;
  booting = true;
  
  const box = document.getElementById('bootlines');
  if(!box) return;
  box.innerHTML = '';
  
  await initVFS();

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
  if (window.Snd && window.Snd.ok) window.Snd.ok();
  
  document.removeEventListener('keydown', dismissSplash);
  document.removeEventListener('click', dismissSplash);
  
  if (desktopBuilt) return;
  desktopBuilt = true;
  initDesktop();
  try { Hold.apply(); } catch(e) {}
  try { Saver.watch(); } catch(e) {}
  try { wireKonami(); } catch(e) {}
}

document.addEventListener('DOMContentLoaded', () => {
  initHardware();
  Cos.boot();
  drawWordmark();
  if (CRT.on) {
    document.getElementById('screen').classList.remove('off');
    window.runBoot();
  }
});
