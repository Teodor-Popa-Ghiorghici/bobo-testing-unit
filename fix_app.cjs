const fs = require('fs');
const id = process.argv[2];
const title = process.argv[3];
const w = process.argv[4];
const h = process.argv[5];
const resizable = process.argv[6] === 'true';
const ext = 'apps/' + id + '_ext.js';

let code = fs.readFileSync(ext, 'utf8');

const regex = new RegExp('function open[A-zA-Z]+\\([\\s\\S]*?\\) \\{');
code = code.replace(regex, 
`import { createWindow, raise } from '../../kernel/wm.js';
import { Snd } from '../../kernel/snd.js';
import { Cos } from '../../kernel/cos.js';
import { fs as vfs } from '../../kernel/vfs.js';

export default {
  id: '${id}',
  title: '${title}',
  width: ${w},
  height: ${h},
  resizable: ${resizable},
  mount(root, _ctx) {`);

code = code.replace(/(const made = )?createWindow\(\{[\s\S]*?build: body => \{/, `const body = root;`);

const rev = code.split('').reverse().join('');
const r2 = rev.replace(/\}\s*;\}\s*\)\}\s*\{/, '}').replace(/\}\s*;\s*made\.close = [\s\S]*?;\s*\}\s*\)\}\s*\{/, '}');
// Wait, the end of made = createWindow is usually `  });\n}` or something.
// A simpler way:
// Just manually fix the end for each.
