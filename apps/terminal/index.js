
import { godWords, godStir, godSeed } from '../../kernel/god.js';
export default {
  id: 'terminal',
  title: 'TERMINAL.HC',
  icon: '',
  width: 560,
  height: 340,
  resizable: true,

  async mount(root, ctx) {
    const _style = document.createElement('link');
    _style.rel = 'stylesheet';
    _style.href = 'apps/terminal/style.css';
    root.appendChild(_style);

    const term = document.createElement('div');
    term.className = 'term';
    const out = document.createElement('div');
    out.className = 'termout';
    
    let cwd = '::';
    
    const line = document.createElement('div');
    line.className = 'termline';
    line.innerHTML = '<span class="p">::&gt;</span><span class="typed"></span><span class="cur blink">\u2588</span>';
    
    const input = document.createElement('input');
    input.className = 'terminput';
    input.spellcheck = false;
    input.autocomplete = 'off';
    line.appendChild(input);
    
    term.appendChild(out);
    term.appendChild(line);
    root.appendChild(term);
    
    term.addEventListener('click', () => input.focus());
    input.focus();
    
    const typed = line.querySelector('.typed');
    const prompt = line.querySelector('.p');
    
    const setPrompt = () => { prompt.textContent = cwd + '>'; };
    
    function print(lines, cls) {
      lines.forEach(txt => {
        const d = document.createElement('div');
        d.className = cls || '';
        d.textContent = txt;
        out.appendChild(d);
      });
      out.scrollTop = out.scrollHeight;
    }
    
    print(['TEMPLEOS TERMINAL — HOLYC JIT ACTIVE', 'THE TREE IS LIVE. TYPE HELP.', ''], 'l-dim');
    
    let history = await ctx.load('history') || [];
    let hpos = history.length;
    
    input.addEventListener('input', () => {
      typed.textContent = input.value;
      if (window.Snd) window.Snd.type();
    });
    
    input.addEventListener('keydown', async ev => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        const cmd = input.value.trim();
        input.value = '';
        typed.textContent = '';
        
        print([cwd + '> ' + cmd], 'l-dim');
        if (!cmd) return;
        
        history.push(cmd);
        if (history.length > 300) history.shift();
        ctx.save('history', history);
        hpos = history.length;
        
        await runCommand(cmd);
      } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        if (hpos > 0) {
          hpos--;
          input.value = history[hpos];
          typed.textContent = input.value;
        }
      } else if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        if (hpos < history.length - 1) {
          hpos++;
          input.value = history[hpos];
          typed.textContent = input.value;
        } else {
          hpos = history.length;
          input.value = '';
          typed.textContent = '';
        }
      }
    });
    
    async function resolvePath(arg) {
      if (!arg) return cwd;
      if (arg.startsWith('::/')) return arg;
      return cwd + (cwd.endsWith('/') ? '' : '/') + arg;
    }
    
    async function runCommand(cmd) {
      const parts = cmd.split(' ');
      const prog = parts[0].toUpperCase();
      
      
      if (prog === 'HELP') {
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
          
          'GODWORD [n]      - Print God words',
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
      } else if (prog === 'DIR' || prog === 'LS') {
        const target = await resolvePath(parts[1]);
        const list = await ctx.fs.list(target);
        if (list.length === 0) {
          print(['NO ENTRIES.'], 'l-err');
        } else {
          print([' DIRECTORY OF ' + target, '']);
          list.forEach(c => {
            const size = c.type === 'folder' ? '<DIR>' : 'FILE';
            print([' ' + c.name.padEnd(16) + size.padStart(9)]);
          });
          print(['']);
        }
      } else if (prog === 'CD') {
        const target = await resolvePath(parts[1]);
        if (!parts[1]) { print(['MISSING PATH.'], 'l-err'); }
        else {
          const list = await ctx.fs.list(target);
          // Assuming list works and returns an array if valid folder, or we just allow it
          cwd = target;
          setPrompt();
        }
      } else if (prog === 'CAT') {
        const target = await resolvePath(parts[1]);
        const val = await ctx.fs.read(target);
        if (val) {
          print([val.content || '<binary>'], 'l-ok');
        } else {
          print(['NOT FOUND.'], 'l-err');
        }
      } else if (prog === 'CLS') {
        out.innerHTML = '';
      
      
      } else if (prog === 'GODWORD' || prog === 'WORD') {
        const n = Math.max(1, Math.min(16, parseInt(parts[1], 10) || 7));
        godStir();
        print([godWords(n).join(' ').toUpperCase()], 'l-holy');
        print(['SEED 0x' + godSeed.toString(16).toUpperCase().padStart(8, '0')], 'l-dim');
        if (window.Snd && window.Snd.holy) window.Snd.holy();
      } else if (prog === 'ED') {

        const target = await resolvePath(parts[1]);
        if (!target || target === cwd) { print(['MISSING PATH.'], 'l-err'); }
        else { ctx.openWindow('editor', { path: target }).catch(console.error); }
      } else if (prog === 'DEL' || prog === 'RM') {
        const target = await resolvePath(parts[1]);
        if (!target || target === cwd) { print(['MISSING PATH.'], 'l-err'); }
        else {
          await ctx.fs.remove(target);
          print(['DELETED.'], 'l-ok');
        }
      } else {
print(['BAD COMMAND.', ''], 'l-err');
      }
    }
  },

  unmount() {}
};
