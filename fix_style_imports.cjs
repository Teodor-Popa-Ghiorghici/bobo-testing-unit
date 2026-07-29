const fs = require('fs');
let hw = fs.readFileSync('kernel/style.js', 'utf8');

hw = 'import { Snd } from "./snd.js";\nimport { CRT } from "./hardware.js";\n' + hw;

hw = hw.replace(/const Style = \{/, 'export const Style = {');
hw = hw.replace(/const Rage = \{/, 'export const Rage = {');

// The file appends properties to Snd, which is fine since Snd is an imported object.
// We also need to fix `Snd.delT` etc which might expect `this.noise` and `this.tone`, which are in Snd.

fs.writeFileSync('kernel/style.js', hw);
