const fs = require('fs');
let code = fs.readFileSync('kernel/hardware.js', 'utf8');

code = code.replace(/wirePot\('pot-mus', 'lbl-mus', 'MUS', v => \{ CRT\.mus = v; saveCRT\(\); \}\);/,
`wirePot('pot-mus', 'lbl-mus', 'MUS', v => { CRT.mus = v; saveCRT(); Rage.sync(); });`);

fs.writeFileSync('kernel/hardware.js', code);
