const fs = require('fs');

function injectCSSLoad(file, cssPath) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('rel="stylesheet"')) return;
  const mountMatch = content.match(/async mount\(root,\s*ctx(?:,\s*args)?\)\s*\{/);
  if (mountMatch) {
    const injection = `
    const _style = document.createElement('link');
    _style.rel = 'stylesheet';
    _style.href = '${cssPath}';
    root.appendChild(_style);
`;
    content = content.replace(mountMatch[0], mountMatch[0] + injection);
    fs.writeFileSync(file, content);
  }
}

injectCSSLoad('apps/editor/index.js', 'apps/editor/style.css');
injectCSSLoad('apps/terminal/index.js', 'apps/terminal/style.css');
injectCSSLoad('apps/viewer/index.js', 'apps/viewer/style.css');
