const fs = require('fs');
let hw = fs.readFileSync('kernel/hardware.js', 'utf8');

hw = hw.replace(/\\n/g, '\n');

fs.writeFileSync('kernel/hardware.js', hw);
