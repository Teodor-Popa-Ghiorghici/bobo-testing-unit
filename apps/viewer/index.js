
export default {
  id: 'viewer',
  title: 'VIEWER',
  icon: '',
  width: 360,
  height: 300,
  resizable: true,

  async mount(root, ctx, args) {
    const _style = document.createElement('link');
    _style.rel = 'stylesheet';
    _style.href = 'apps/viewer/style.css';
    root.appendChild(_style);

    const path = args?.path || '';
    let src = '';
    
    if (path) {
      const file = await ctx.fs.read(path);
      if (file) src = file.src || '';
    }
    
    const pane = document.createElement('div');
    pane.className = 'imgpane';
    const img = document.createElement('img');
    img.src = src;
    img.alt = path;
    pane.appendChild(img);
    root.appendChild(pane);
  },

  unmount() {}
};
