const fs = require('fs');
let code = fs.readFileSync('kernel/hardware.js', 'utf8');

if (!code.includes('import { Style, Rage }')) {
  code = 'import { Style, Rage } from "./style.js";\n' + code;
}

code = code.replace(/if \(getEl\('power'\)\) getEl\('power'\)\.addEventListener\('click', \(\) => \{[\s\S]*?\}\);/,
`if (getEl('power')) getEl('power').addEventListener('click', () => {
    if (window.Snd && window.Snd.click) window.Snd.click();
    CRT.on = !CRT.on; 
    saveCRT();
    const screen = document.getElementById('screen');
    if (screen) {
      if (CRT.on) {
        screen.classList.remove('off');
        if (window.runBoot) window.runBoot();
      } else {
        screen.classList.add('off');
        Style.reset();
        Rage.stop();
        // Snd.thunk() would go here if we want a thunk sound
      }
    }
  });`);

fs.writeFileSync('kernel/hardware.js', code);
