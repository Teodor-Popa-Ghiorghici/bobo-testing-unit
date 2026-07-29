const fs = require('fs');
let code = fs.readFileSync('kernel/desktop.js', 'utf8');

code = code.replace(/const buffer = await f\.arrayBuffer\(\);\s*\/\/[^\n]*\s*let content;\s*if \(type === 'text'.*?content = 'data:' \+ f\.type \+ ';base64,' \+ b64;\s*\}/s, `
      let content;
      if (type === 'text' || type === 'code') content = await f.text();
      else {
        content = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target.result);
          reader.readAsDataURL(f);
        });
      }
`);

fs.writeFileSync('kernel/desktop.js', code);
