const fs = require('fs');
let hw = fs.readFileSync('kernel/hardware.js', 'utf8');

hw = hw.replace(/function applyLensShape\(\) \{[\s\S]*?\}/, `function applyLensShape() {
  const t = document.getElementById('tube');
  if (!t) return;
  if (CRT.lens === 0) {
    t.style.borderRadius = '0';
    document.documentElement.style.setProperty('--inset', '0');
    return;
  }
  const f = CRT.lens === 1 ? '10%' : '18%';
  t.style.borderRadius = \`50% / \${f}\`;
  document.documentElement.style.setProperty('--inset', CRT.lens === 1 ? '2%' : '4%');
}`);
fs.writeFileSync('kernel/hardware.js', hw);
