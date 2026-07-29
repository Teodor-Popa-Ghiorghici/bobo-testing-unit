const fs = require('fs');
let code = fs.readFileSync('apps/eden_ext.js', 'utf8');

code = `
import { Snd } from '../kernel/snd.js';
import { fs as vfs } from '../kernel/vfs.js';

` + code;

// findNode -> vfs.find
// addNode -> we need to just use vfs API.
// Actually just replace openEden to dynamically load godSong and godDoodle?

fs.writeFileSync('apps/eden_ext.js', code);
