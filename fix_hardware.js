const fs = require('fs');
let code = fs.readFileSync('crt.js', 'utf8');

// Replace Snd calls with optional window.Snd
code = code.replace(/Snd\.([a-z]+)\(\)/g, "if(window.Snd && window.Snd.$1) window.Snd.$1()");

// Make CRT and init exported
code = code.replace('const CRT = {', 'export const CRT = {');
code += '\nexport function initHardware() { loadCRT(); labelKnobs(); wireChin(); paintGlass(); window.addEventListener("resize", () => { clearTimeout(window._crtT); window._crtT = setTimeout(paintGlass, 100); }); }\n';
code = code.replace('function degauss(', 'export function degauss(');

fs.writeFileSync('kernel/hardware.js', code);
