const fs = require('fs');
let hw = fs.readFileSync('kernel/hardware.js', 'utf8');

hw = hw.replace(/wirePot\('pot-mus', 'lbl-mus', 'MUS', v => \{ \}\);/, `wirePot('pot-mus', 'lbl-mus', 'MUS', v => { CRT.mus = v; saveCRT(); });`);
hw = hw.replace(/wirePot\('pot-sfx', 'lbl-sfx', 'SFX', v => \{ \}\);/, `wirePot('pot-sfx', 'lbl-sfx', 'SFX', v => { CRT.sfx = v; saveCRT(); });`);

fs.writeFileSync('kernel/hardware.js', hw);
