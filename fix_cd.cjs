const fs = require('fs');
let hw = fs.readFileSync('apps/terminal/index.js', 'utf8');

hw = hw.replace(/\} else if \(prog === 'CD'\) \{[\s\S]*?\} else if \(prog === 'CAT'\) \{/, `} else if (prog === 'CD') {
        const target = await resolvePath(parts[1]);
        if (!parts[1]) { print(['MISSING PATH.'], 'l-err'); }
        else {
          const list = await ctx.fs.list(target);
          // Assuming list works and returns an array if valid folder, or we just allow it
          cwd = target;
          setPrompt();
        }
      } else if (prog === 'CAT') {`);

fs.writeFileSync('apps/terminal/index.js', hw);
