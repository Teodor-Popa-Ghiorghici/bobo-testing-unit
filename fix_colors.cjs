const fs = require('fs');
let css = fs.readFileSync('kernel/theme.css', 'utf8');

// The original CSS doesn't use --phos everywhere, it has hardcoded #FFFFFF and #AAAAAA.
// But some places it uses --sch-fg, #FFFFFF. Let's make sure text and borders use --phos.
css = css.replace(/color: #FFFFFF/g, 'color: var(--phos, #FFFFFF)');
css = css.replace(/border: 1px solid #FFFFFF/g, 'border: 1px solid var(--phos, #FFFFFF)');
css = css.replace(/border-color: #FFFFFF/g, 'border-color: var(--phos, #FFFFFF)');
css = css.replace(/text-shadow:[^;]+;/g, 'text-shadow: 0 0 var(--phos-px, 2px) var(--phos, #FFFFFF);');

fs.writeFileSync('kernel/theme.css', css);
