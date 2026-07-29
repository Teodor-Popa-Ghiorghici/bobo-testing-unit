const fs = require('fs');
let code = fs.readFileSync('apps/bekkedal_ext.js', 'utf8');

// Replace function openBekkedal() {
code = code.replace(/function openBekkedal\(\) \{/, 
`import { createWindow, raise } from '../../kernel/wm.js';
import { fs as vfs } from '../../kernel/vfs.js';

export default {
  id: 'bekkedal',
  title: 'Bekkedal',
  width: 748,
  height: 540,
  resizable: true,
  mount(root, ctx) {`);

// Replace createWindow(...)
code = code.replace(/createWindow\(\{[\s\S]*?build: body => \{/, `const body = root;`);
// And the closing of createWindow at the end.
const rev = code.split('').reverse().join('');
const r2 = rev.replace(/\}\s*;\}\s*\)\}\s*\{/, '}');
code = r2.split('').reverse().join('');

fs.writeFileSync('apps/bekkedal/index.js', code);
