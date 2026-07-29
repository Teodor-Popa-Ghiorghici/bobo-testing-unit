const fs = require('fs');
let code = fs.readFileSync('kernel/saver.js', 'utf8');
code = `import { godDoodle } from '../apps/god_funcs2.js';
import { godRand } from '../apps/god_funcs.js';
import { VGA16 } from './cos_data.js';
import { CRT, phosLevel, splashGone } from './hardware.js';

export ` + code + `
window.Saver = Saver;
`;
fs.writeFileSync('kernel/saver.js', code);
