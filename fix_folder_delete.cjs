const fs = require('fs');
let code = fs.readFileSync('apps/folder/index.js', 'utf8');

const hook = `
    body.addEventListener('click', () => {
      body.querySelectorAll('.icon.sel').forEach(n => n.classList.remove('sel'));
    });
    
    // Add keyboard listener for delete
    body.tabIndex = 0; // make focusable
    body.style.outline = 'none';
    body.addEventListener('keydown', async (ev) => {
      if (ev.key === 'Delete' || ev.key === 'Backspace') {
        const sel = body.querySelector('.icon.sel');
        if (sel) {
          const itemName = sel.querySelector('.lbl').textContent;
          const p = path + (path.endsWith('/') ? '' : '/') + itemName;
          await ctx.fs.remove(p);
          sel.remove();
          if (window.Snd && window.Snd.del) window.Snd.del();
        }
      }
    });
    // autofocus body so keyboard events work immediately
    setTimeout(() => body.focus(), 100);
`;

code = code.replace(/body\.addEventListener\('click', \(\) => \{[\s\S]*?\}\);/, hook);
fs.writeFileSync('apps/folder/index.js', code);
