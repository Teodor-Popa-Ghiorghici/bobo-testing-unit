const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace('<div id="screen">', '<div id="screen" class="off">');
fs.writeFileSync('index.html', html);

let code = fs.readFileSync('kernel/hardware.js', 'utf8');
code = code.replace(/if \(getEl\('power'\)\)[\s\S]*?\}\);/g, `if (getEl('power')) getEl('power').addEventListener('click', () => {
    if (window.Snd && window.Snd.click) window.Snd.click();
    CRT.on = !CRT.on;
    const screen = document.getElementById('screen');
    if (screen) {
      if (CRT.on) {
        screen.classList.remove('off');
        if (window.runBoot) window.runBoot();
      } else {
        screen.classList.add('off');
      }
    }
  });`);
fs.writeFileSync('kernel/hardware.js', code);
