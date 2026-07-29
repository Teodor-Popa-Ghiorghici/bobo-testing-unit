import { ddRender } from '../../kernel/doldoc.js';

export default {
  id: 'editor',
  title: 'EDIT',
  icon: '',
  width: 560,
  height: 400,
  resizable: true,

  async mount(root, ctx, args) {
    const _style = document.createElement('link');
    _style.rel = 'stylesheet';
    _style.href = 'apps/editor/style.css';
    root.appendChild(_style);

    const path = args?.path || '';
    let val = '';
    
    if (path) {
      const file = await ctx.fs.read(path);
      if (file) val = file.content || '';
      window._lastTextPath = path;
    }
    
    const isDoc = path.toUpperCase().endsWith('.DD') || path.toUpperCase().endsWith('.HC') || args?.type === 'doc' || args?.type === 'code';
    let showSource = !isDoc;

    const pane = document.createElement('div');
    pane.className = 'ddpane';
    pane.style.display = showSource ? 'none' : 'block';
    
    const ta = document.createElement('textarea');
    ta.className = 'editor ddsrc';
    ta.spellcheck = false;
    ta.value = val;
    ta.style.display = showSource ? 'block' : 'none';
    
    const draw = () => ddRender(ta.value, pane,
      async (target) => { // onLink
        const targetPath = target.startsWith('::') ? target : `::/${target}`;
        ctx.openWindow('editor', { path: targetPath }).catch(console.error);
        if (window.Snd) window.Snd.open();
      },
      (cmd) => { // onMacro
        if (window.Snd) window.Snd.ok();
        ctx.openWindow('terminal', { cmd }).catch(console.error);
      }
    );

    if (isDoc) draw();
    
    ta.addEventListener('input', async () => {
      if (path) {
        const file = await ctx.fs.read(path) || { type: 'text', content: '' };
        file.content = ta.value;
        await ctx.fs.write(path, file);
      }
    });
    
    ta.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') { if(window.Snd) window.Snd.open(); }
      else if (ev.key.length === 1 || ev.key === 'Backspace') { if(window.Snd) window.Snd.type(); }
    });
    
    root.appendChild(pane);
    root.appendChild(ta);

    if (isDoc) {
      setTimeout(() => {
        const win = root.parentElement;
        const bar = win.querySelector('.titlebar');
        if (bar) {
          const btn = document.createElement('span');
          btn.className = 'm srcbtn';
          btn.textContent = '[SRC]';
          btn.addEventListener('mousedown', ev => {
            ev.stopPropagation();
            showSource = !showSource;
            if (window.Snd) window.Snd.click();
            if (showSource) {
              ta.style.display = 'block';
              pane.style.display = 'none';
              btn.textContent = '[DOC]';
            } else {
              ta.style.display = 'none';
              pane.style.display = 'block';
              btn.textContent = '[SRC]';
              draw();
            }
          });
          bar.insertBefore(btn, bar.querySelector('.m'));
        }
      }, 0);
    }
  },

  unmount() {}
};
