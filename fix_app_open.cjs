const fs = require('fs');

function processFile(id) {
    let code = fs.readFileSync('apps/' + id + '_ext.js', 'utf8');

    // Rename function openX(...) { to open(...) {
    code = code.replace(/function open[A-Za-z]+\(([^)]*)\)\s*\{/, 
`import { createWindow, raise, sysDialog } from '../../kernel/wm.js';
import { Snd } from '../../kernel/snd.js';
import { Cos } from '../../kernel/cos.js';
import { fs as vfs } from '../../kernel/vfs.js';

export default {
  open($1) {`
    );
    
    // Add missing imports
    code = code.replace(/Economy\./g, 'window.Economy.');
    code = code.replace(/Garden\./g, 'window.Garden.');
    code = code.replace(/Music\./g, 'window.Music.');
    
    // Ensure the last bracket matches the `open() {`
    let lastBracket = code.lastIndexOf('}');
    if (lastBracket !== -1) {
        code = code.substring(0, lastBracket) + '  }\n};';
    }
    
    fs.mkdirSync('apps/' + id, { recursive: true });
    fs.writeFileSync('apps/' + id + '/index.js', code);
}

processFile('sweeper');
processFile('solitaire');
processFile('crayon');
processFile('drawings');
processFile('elephant');
processFile('magen');
processFile('cook');
processFile('display');
processFile('about');
