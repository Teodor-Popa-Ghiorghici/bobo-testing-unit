const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');
// Taskbar clock should be on the right
html = html.replace('<div id="tasks"></div>\n    <div id="clock">00:00:00</div>', '<div id="tasks" style="flex:1;"></div>\n    <div id="clock" style="margin-left:auto; padding-right:10px;">00:00:00</div>');
fs.writeFileSync('index.html', html);

let css = fs.readFileSync('kernel/theme.css', 'utf8');

// Phosphor
if (!css.includes('--phos:')) {
  css = css.replace(':root {', ':root {\n  --phos: #FFFFFF;\n  --phos-dim: #AAAAAA;\n  --phos-px: 2px;');
  // replace some hardcoded colors with var(--phos)
  css = css.replace(/color: #FFFFFF/g, 'color: var(--phos)');
  css = css.replace(/color: #AAAAAA/g, 'color: var(--phos-dim)');
  // Or just rely on applyPhosphor to set these and the UI uses them where applicable?
  // Actually, we can just apply a global text-shadow and color override.
}

if (!css.includes('.burn')) {
  css += `
:root.burn #shell::after {
  content: "File   Edit   Compile   Debug   Tools   Help                                             TempleOS V5.03";
  position: absolute;
  top: 10%; left: 0; right: 0;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.05);
  background: rgba(255,255,255,0.02);
  padding: 4px;
  pointer-events: none;
  z-index: 9999;
}
@keyframes crt-off {
  0% { transform: scale(1, 1) translate3d(0, 0, 0); filter: brightness(1); }
  60% { transform: scale(1, 0.001) translate3d(0, 0, 0); filter: brightness(5); }
  100% { transform: scale(0, 0.001) translate3d(0, 0, 0); filter: brightness(0); }
}
@keyframes crt-on {
  0% { transform: scale(0, 0.001) translate3d(0, 0, 0); filter: brightness(0); }
  40% { transform: scale(1, 0.001) translate3d(0, 0, 0); filter: brightness(5); }
  100% { transform: scale(1, 1) translate3d(0, 0, 0); filter: brightness(1); }
}
#screen.off #tube { animation: crt-off 0.4s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
#screen:not(.off) #tube { animation: crt-on 0.4s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
#screen.off #glass { opacity: 0; transition: opacity 0.4s; }

@keyframes dg-flash {
  0% { transform: scale(0.1) rotate(0deg); opacity: 0; filter: contrast(1) brightness(1); }
  20% { transform: scale(1.2) rotate(45deg); opacity: 0.8; filter: contrast(2) brightness(1.5); }
  100% { transform: scale(3) rotate(90deg); opacity: 0; filter: contrast(1) brightness(1); }
}
#degauss.held {
  animation: dg-flash 1.5s cubic-bezier(0.1, 0.7, 1.0, 0.1) forwards;
  display: block;
}

#shell { transition: transform 0.1s; }
.vhold-roll { animation: vhold-roll var(--vhold-speed, 1s) linear infinite; }
@keyframes vhold-roll {
  0% { transform: translateY(0); }
  100% { transform: translateY(-50%); opacity:0; filter: blur(4px); }
}
.hhold-skew { animation: hhold-skew var(--hhold-speed, 0.1s) linear infinite alternate; }
@keyframes hhold-skew {
  0% { transform: skewX(-5deg) translateX(-10px); filter: blur(2px); }
  100% { transform: skewX(5deg) translateX(10px); filter: blur(2px); }
}
`;
}
fs.writeFileSync('kernel/theme.css', css);

let hw = fs.readFileSync('kernel/hardware.js', 'utf8');

hw = hw.replace(/CRT.on = true;/, 'CRT.on = true;\n  CRT.vhold = CRT.vhold ?? 5;\n  CRT.hhold = CRT.hhold ?? 5;\n  CRT.lens = CRT.lens ?? 1;\n  CRT.scan = CRT.scan ?? 2;');

hw = hw.replace(/el.addEventListener\('mousedown', ev => \{([\s\S]*?)\}\);/g, `el.addEventListener('mousedown', ev => {
    ev.preventDefault();
    turning = true;
    lastA = m2a(ev);
    document.body.style.cursor = 'ew-resize';
  });
  el.addEventListener('wheel', ev => {
    ev.preventDefault();
    if (ev.deltaY < 0) commit(pos + 1);
    else if (ev.deltaY > 0) commit(pos - 1);
  });`);

hw = hw.replace(/function applyPhosphor\(\) \{[\s\S]*?\}/, `function applyPhosphor() {
  const root = document.documentElement;
  if (CRT.phos === 0) {
    root.style.setProperty('--phos', '#55FF55');
    root.style.setProperty('--phos-dim', '#00AA00');
  } else if (CRT.phos === 1) {
    root.style.setProperty('--phos', '#FFFFFF');
    root.style.setProperty('--phos-dim', '#AAAAAA');
  } else {
    root.style.setProperty('--phos', '#55FFFF');
    root.style.setProperty('--phos-dim', '#00AAAA');
  }
}
function applyHold() {
  const shell = document.getElementById('shell');
  if (!shell) return;
  if (CRT.vhold !== 5) {
    shell.classList.add('vhold-roll');
    const diff = Math.abs(CRT.vhold - 5);
    shell.style.setProperty('--vhold-speed', (1.1 - diff * 0.2) + 's');
  } else {
    shell.classList.remove('vhold-roll');
  }
  
  if (CRT.hhold !== 5) {
    shell.classList.add('hhold-skew');
    const diff = Math.abs(CRT.hhold - 5);
    shell.style.setProperty('--hhold-speed', (0.3 - diff * 0.05) + 's');
  } else {
    shell.classList.remove('hhold-skew');
  }
}
`);

// Call applyHold in loadCRT or after wireChin
hw = hw.replace(/applyPhosphor\(\);\n  applyBurn\(\);/, 'applyPhosphor();\n  applyBurn();\n  applyHold();\n  applyLensShape();\n  labelKnobs();');
hw = hw.replace(/function labelKnobs\(\) \{[\s\S]*?\}/, `function labelKnobs() {
  const g = document.getElementById('k-lens'); if(g) g.textContent = 'LENS: ' + (CRT.lens===0 ? 'FLAT' : CRT.lens===1 ? 'SOFT' : 'FULL');
  const s = document.getElementById('k-scan'); if(s) s.textContent = 'SCAN: ' + (CRT.scan===5 ? 'OFF' : CRT.scan);
  const p = document.getElementById('k-phos'); if(p) p.textContent = 'PHOS: P' + (CRT.phos===0 ? '1' : CRT.phos===1 ? '4' : '7');
  const b = document.getElementById('k-burn'); if(b) b.textContent = 'BURN: ' + (CRT.burn ? 'ON' : 'OFF');
}`);

// make wirePot work for vhold and hhold
hw = hw.replace(/wirePot\('pot-vhold', 'lbl-vhold', 'VHLD', v => \{[^}]*\}\);/g, `wirePot('pot-vhold', 'lbl-vhold', 'VHLD', v => { CRT.vhold = v; saveCRT(); applyHold(); });`);
hw = hw.replace(/wirePot\('pot-hhold', 'lbl-hhold', 'HHLD', v => \{[^}]*\}\);/g, `wirePot('pot-hhold', 'lbl-hhold', 'HHLD', v => { CRT.hhold = v; saveCRT(); applyHold(); });`);

// init positions of wirePot to be CRT values
hw = hw.replace(/let pos = 5;/g, `
  let pos = 5;
  if (id === 'pot-vhold') pos = CRT.vhold ?? 5;
  else if (id === 'pot-hhold') pos = CRT.hhold ?? 5;
  else if (id === 'pot-mus') pos = CRT.mus ?? 0;
  else if (id === 'pot-sfx') pos = CRT.sfx ?? 0;
`);

fs.writeFileSync('kernel/hardware.js', hw);
