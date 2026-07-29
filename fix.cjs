const fs = require('fs');
let code = fs.readFileSync('kernel/desktop.js', 'utf8');
code = code.replace(
  "openWindow('viewer', { path: `C:/::/${item.name}`, type: item.type }).catch(console.error);",
  "const app = ['code','doc','text'].includes(item.type) ? 'editor' : 'viewer'; openWindow(app, { path: `C:/::/${item.name}`, type: item.type }).catch(console.error);"
);
fs.writeFileSync('kernel/desktop.js', code);
