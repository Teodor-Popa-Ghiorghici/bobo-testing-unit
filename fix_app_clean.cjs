const fs = require('fs');

function processFile(id, title, w, h, resizable) {
    let code = fs.readFileSync('apps/' + id + '_ext.js', 'utf8');

    // 1. Rename function openX(...) { to mount(root, _ctx) {
    code = code.replace(/function open[A-Za-z]+\([^)]*\)\s*\{/, 
`import { createWindow, raise, sysDialog } from '../../kernel/wm.js';
import { Snd } from '../../kernel/snd.js';
import { Cos } from '../../kernel/cos.js';
import { fs as vfs } from '../../kernel/vfs.js';

export default {
  id: '${id}',
  title: '${title}',
  width: ${w},
  height: ${h},
  resizable: ${resizable},
  mount(root, _ctx) {`
    );
    
    // 2. Change `createWindow({ ... build: body => {`
    // We replace it by extracting its content and replacing `body` with `root`?
    // Wait, let's just make it: `const body = root;`
    // And comment out the start and end of createWindow!
    // This way we don't accidentally remove other things.
    
    code = code.replace(/(const made = )?createWindow\(\{[\s\S]*?build:\s*(?:function\(body\)|\(?body\)?)\s*=>\s*\{/, 
    `// createWindow start\n    const body = root;\n`);

    // 3. To find the closing `});`, we look for `});` followed by some code.
    // We can just replace all `  });` with `  //});` and then fix the syntax errors manually?
    // No, `});` is used everywhere (event listeners, forEach).
    // Let's find the `  });\n  sweepWin = made;` and replace the `});` part.
    // In Sweeper: `    }\n  });\n  sweepWin = made;`
    // In Magen: `    }\n  });\n}`
    
    // Let's do it manually with sed! It's much easier.
    
    // Write out the file without the trailing `}` of the main function.
    let lastBracket = code.lastIndexOf('}');
    if (lastBracket !== -1) {
        code = code.substring(0, lastBracket) + '  }\n};';
    }
    
    fs.mkdirSync('apps/' + id, { recursive: true });
    fs.writeFileSync('apps/' + id + '/index.js', code);
}

processFile('sweeper', 'MINESWEEPER', 400, 500, true);
processFile('solitaire', 'SOLITAIRE', 600, 480, true);
processFile('crayon', 'CRAYON', 540, 540, true);
processFile('drawings', 'DRAWINGS', 640, 400, true);
processFile('elephant', 'ELEPHANT', 500, 480, true);
processFile('magen', 'MAGEN', 600, 480, true);
processFile('cook', 'COOK', 540, 460, true);
processFile('display', 'DISPLAY SETTINGS', 340, 260, false);
