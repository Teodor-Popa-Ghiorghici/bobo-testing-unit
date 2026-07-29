const fs = require('fs');

function processFile(id, title, w, h, resizable) {
    let code = fs.readFileSync('apps/' + id + '_ext.js', 'utf8');

    // 1. Remove `function openX() {`
    code = code.replace(/function open[A-Za-z]+\([^)]*\)\s*\{/, '');
    
    // 2. Remove the trailing `}` of the function
    let lastBracket = code.lastIndexOf('}');
    if (lastBracket !== -1) {
        code = code.substring(0, lastBracket) + code.substring(lastBracket + 1);
    }
    
    // 3. Find `createWindow({ ... build: body => {`
    // We'll use a regex to match it.
    const re = /(const made = )?createWindow\(\{[\s\S]*?build:\s*(?:function\(body\)|\(?body\)?)\s*=>\s*\{/;
    const match = code.match(re);
    if (!match) {
        console.log("No createWindow match in", id);
        return;
    }
    
    // Replace it with `const body = root;`
    code = code.replace(re, `const body = root;`);
    
    // 4. Now we need to remove the closing `  });` of createWindow.
    // It's the first `});` that has no matching `{` ? No, wait.
    // Let's just do:
    code = code.replace(/\}\s*\}\s*\)\s*;/, '}'); // `    }  });`
    // Wait, sometimes it's `    }\n  });\n`
    
    // To be safe, we can just replace the FIRST `  });` that follows the body, but that's hard to find.
    // Actually, `apps/*_ext.js` were all just extracted, so they are clean.
    // Let's look for `    }\n  });`
    let replaced = code.replace(/(\n\s*)\}(\n\s*)\}\s*\)\s*;/g, '$1}$2');
    if (replaced === code) {
        // try another
        replaced = code.replace(/\s*\}\s*\)\s*;/g, '');
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
${replaced}
  }
};
`;

    fs.mkdirSync('apps/' + id, { recursive: true });
    fs.writeFileSync('apps/' + id + '/index.js', full);
}

processFile('sweeper', 'MINESWEEPER', 400, 500, true);
processFile('solitaire', 'SOLITAIRE', 600, 480, true);
processFile('crayon', 'CRAYON', 540, 540, true);
processFile('drawings', 'DRAWINGS', 640, 400, true);
processFile('elephant', 'ELEPHANT', 500, 480, true);
processFile('magen', 'MAGEN', 600, 480, true);
processFile('cook', 'COOK', 540, 460, true);
processFile('display', 'DISPLAY SETTINGS', 340, 260, false);
processFile('about', 'ABOUT', 440, 470, false);
