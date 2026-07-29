const fs = require('fs');
let code = fs.readFileSync('kernel/hardware.js', 'utf8');
code = code.replace("CRT.on = !CRT.on;", "CRT.on = !CRT.on; saveCRT();");
fs.writeFileSync('kernel/hardware.js', code);
