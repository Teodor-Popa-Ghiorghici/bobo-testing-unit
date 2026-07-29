const fs = require('fs');
let code = fs.readFileSync('apps/terminal/index.js', 'utf8');
code = code.replace(/if \(prog === 'HELP'\) \{[\s\S]*?\} else if \(prog === 'DIR'/g, `if (prog === 'HELP') {
        print([
          'HELP:',
          'DIR / LS [path]  - List directory',
          'CD [path]        - Change directory',
          'MKDIR / MD       - Make directory',
          'TOUCH            - Create empty file',
          'CAT [path]       - Print file content',
          'ECHO [text]      - Print text',
          'PWD              - Print working directory',
          'DATE / TIME      - Print current date/time',
          'ED [path]        - Open in Editor',
          'DEL / RM [path]  - Delete file',
          'CLS / CLEAR      - Clear screen',
          ''
        ], 'l-ok');
      } else if (prog === 'PWD') {
        print([cwd], 'l-ok');
      } else if (prog === 'DATE' || prog === 'TIME') {
        print([new Date().toLocaleString()], 'l-ok');
      } else if (prog === 'ECHO') {
        print([parts.slice(1).join(' ')], 'l-ok');
      } else if (prog === 'MKDIR' || prog === 'MD') {
        const target = await resolvePath(parts[1]);
        if (!parts[1]) { print(['MISSING PATH.'], 'l-err'); }
        else {
          await ctx.fs.write(target, { type: 'folder' });
          print(['DIRECTORY CREATED.'], 'l-ok');
        }
      } else if (prog === 'TOUCH') {
        const target = await resolvePath(parts[1]);
        if (!parts[1]) { print(['MISSING PATH.'], 'l-err'); }
        else {
          await ctx.fs.write(target, { type: 'text', content: '' });
          print(['FILE CREATED.'], 'l-ok');
        }
      } else if (prog === 'CLS' || prog === 'CLEAR') {
        out.innerHTML = '';
      } else if (prog === 'DIR'`);

fs.writeFileSync('apps/terminal/index.js', code);
