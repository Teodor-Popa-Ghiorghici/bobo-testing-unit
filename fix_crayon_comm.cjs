const fs = require('fs');

let crayon = fs.readFileSync('apps/crayon/index.js', 'utf8');
crayon = crayon.replace(/if \(drawerWin && document\.body\.contains\(drawerWin\.win\)\) drawerWin\.refresh\(\);/,
  "window.dispatchEvent(new Event('crayon-saved'));");
fs.writeFileSync('apps/crayon/index.js', crayon);

let drawings = fs.readFileSync('apps/drawings/index.js', 'utf8');
drawings = drawings.replace(/export default \{/, 
  "window.addEventListener('crayon-saved', () => {\n  if (drawerWin && drawerWin.refresh) drawerWin.refresh();\n});\nexport default {");
drawings = drawings.replace(/drawerWin = \{ win: root.parentElement.parentElement \};/,
  "drawerWin = { win: root.parentElement.parentElement, refresh: () => { drawList(); } };");
fs.writeFileSync('apps/drawings/index.js', drawings);

