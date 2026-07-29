const fs = require('fs');
let hw = fs.readFileSync('kernel/hardware.js', 'utf8');

hw = hw.replace(/CRT\.lens = \(CRT\.lens \+ 1\) % 3;\n    labelKnobs\(\);\n    paintGlass\(\);\n    saveCRT\(\);/, 
  'CRT.lens = (CRT.lens + 1) % 3;\\n    labelKnobs();\\n    paintGlass();\\n    applyLensShape();\\n    saveCRT();');

hw = hw.replace(/CRT\.phos = \(\(CRT\.phos \|\| 0\) \+ 1\) % 3;\n    labelKnobs\(\);\n    saveCRT\(\);/,
  'CRT.phos = ((CRT.phos || 0) + 1) % 3;\\n    labelKnobs();\\n    applyPhosphor();\\n    saveCRT();');

hw = hw.replace(/CRT\.burn = !CRT\.burn;\n    labelKnobs\(\);\n    saveCRT\(\);/,
  'CRT.burn = !CRT.burn;\\n    labelKnobs();\\n    applyBurn();\\n    saveCRT();');

fs.writeFileSync('kernel/hardware.js', hw);
