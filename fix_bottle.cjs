const fs = require('fs');
let code = fs.readFileSync('apps/bottle_ext.js', 'utf8');

code = code.replace(/function openBottle\(\) \{/, 
`import { createWindow, raise } from '../../kernel/wm.js';

export default {
  id: 'bottle',
  title: 'THE BOTTLE',
  width: 320,
  height: 440,
  resizable: false,
  mount(root, ctx) {`);

code = code.replace(/createWindow\(\{[\s\S]*?build: body => \{/, `const body = root;`);

const rev = code.split('').reverse().join('');
const r2 = rev.replace(/\}\s*;\}\s*\)\}\s*\{/, '}');
code = r2.split('').reverse().join('');

fs.writeFileSync('apps/bottle/index.js', code);
