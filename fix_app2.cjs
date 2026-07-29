const fs = require('fs');
const id = process.argv[2];
const title = process.argv[3];
const w = process.argv[4];
const h = process.argv[5];
const resizable = process.argv[6] === 'true';

let code = fs.readFileSync('apps/' + id + '_ext.js', 'utf8');

const matchStr = "build: body => {";
const buildIndex = code.indexOf(matchStr);
if (buildIndex === -1) {
  console.log("No match for", id);
  process.exit(1);
}

let inner = code.substring(buildIndex + matchStr.length);

// Trim the ending `    }\n  });\n}`
// Find the last `}`
let lastBracket = inner.lastIndexOf('}');
if (lastBracket !== -1) {
    inner = inner.substring(0, lastBracket);
}
lastBracket = inner.lastIndexOf('}');
if (lastBracket !== -1) {
    inner = inner.substring(0, lastBracket);
}
lastBracket = inner.lastIndexOf('}');
if (lastBracket !== -1) {
    inner = inner.substring(0, lastBracket);
}

let full = `import { createWindow, raise, sysDialog } from '../../kernel/wm.js';
import { Snd } from '../../kernel/snd.js';
import { Cos } from '../../kernel/cos.js';
import { fs as vfs } from '../../kernel/vfs.js';

export default {
  id: '${id}',
  title: '${title}',
  width: ${w},
  height: ${h},
  resizable: ${resizable},
  mount(root, _ctx) {
    const body = root;
${inner}
  }
};
`;

fs.mkdirSync('apps/' + id, { recursive: true });
fs.writeFileSync('apps/' + id + '/index.js', full);
