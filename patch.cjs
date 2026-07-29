const fs = require('fs');
let content = fs.readFileSync('apps/defrag/index.js', 'utf-8');
content = content.replace("mount(root, ctx) {", "mount(root, ctx) {\n    const style = document.createElement('link');\n    style.rel = 'stylesheet';\n    style.href = 'apps/defrag/style.css';\n    root.appendChild(style);\n");
fs.writeFileSync('apps/defrag/index.js', content);
