const fs = require('fs');
let code = fs.readFileSync('kernel/hold.js', 'utf8');
code = `import { Vol } from './hardware.js';\nexport ` + code + `window.Hold = Hold;`;
fs.writeFileSync('kernel/hold.js', code);
