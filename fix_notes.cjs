const fs = require('fs');
let code = fs.readFileSync('apps/notes_ext.js', 'utf8');

code = code.replace(/function openNotes\(\) \{/, 
`import { createWindow, raise } from '../../kernel/wm.js';

export default {
  id: 'notes',
  title: 'NOTES',
  width: 600,
  height: 480,
  resizable: true,
  mount(root, ctx) {`);

code = code.replace(/createWindow\(\{[\s\S]*?build: body => \{/, `const body = root;`);

const rev = code.split('').reverse().join('');
const r2 = rev.replace(/\}\s*;\}\s*\)\}\s*\{/, '}');
code = r2.split('').reverse().join('');

fs.writeFileSync('apps/notes/index.js', code);
