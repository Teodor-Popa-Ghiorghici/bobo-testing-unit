const fs = require('fs');

const html = fs.readFileSync('big html file', 'utf8');

const apps = [
  { name: 'Elephant', id: 'elephant', title: 'ELEPHANT', w: 500, h: 480 },
  { name: 'Magen', id: 'magen', title: 'MAGEN', w: 600, h: 480 },
  { name: 'Cook', id: 'cook', title: 'COOK', w: 540, h: 460 },
  { name: 'Sweeper', id: 'sweeper', title: 'MINESWEEPER', w: 400, h: 500 },
  { name: 'Solitaire', id: 'solitaire', title: 'SOLITAIRE', w: 600, h: 480 },
  { name: 'Crayon', id: 'crayon', title: 'CRAYON', w: 540, h: 540 },
  { name: 'Drawings', id: 'drawings', title: 'DRAWINGS', w: 640, h: 400 },
  { name: 'DisplaySettings', id: 'display', title: 'DISPLAY SETTINGS', w: 340, h: 260 },
  { name: 'About', id: 'about', title: 'ABOUT', w: 320, h: 400 }
];

let regAdd = '';
let deskAdd = '';

for (const app of apps) {
  const re = new RegExp('function open' + app.name + '\\([a-zA-Z0-9, ]*\\) \\{([\\s\\S]*?createWindow\\(\\{[\\s\\S]*?build: [^>]+> \\{)([\\s\\S]*?)(\\}\\s*\\}\\s*\\)\\s*\\;?\\s*\\}?\\s*)\\nfunction open', 'm');
  
  const m = html.match(re);
  if (!m) {
    console.log('Skipping ' + app.name);
    continue;
  }
  
  let inner = m[2];
  let full = `import { createWindow, raise } from '../../kernel/wm.js';
import { Snd } from '../../kernel/snd.js';
import { Cos } from '../../kernel/cos.js';
import { fs as vfs } from '../../kernel/vfs.js';

export default {
  id: '${app.id}',
  title: '${app.title}',
  width: ${app.w},
  height: ${app.h},
  resizable: true,
  mount(root, _ctx) {
    const body = root;
${inner}
  }
};
`;

  fs.mkdirSync('apps/' + app.id, { recursive: true });
  fs.writeFileSync('apps/' + app.id + '/index.js', full);
  
  regAdd += `  ${app.id}: () => import('../apps/${app.id}/index.js'),\n`;
  deskAdd += `        } else if (item.name === '${app.title}') {\n          openWindow('${app.id}').catch(console.error);\n`;
}

console.log(regAdd);
console.log(deskAdd);
