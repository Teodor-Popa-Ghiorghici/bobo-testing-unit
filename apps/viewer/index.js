import { VaultURL } from '../../kernel/vault.js';

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
    let isVideo = args?.type === 'video';

    if (path) {
      const file = await ctx.fs.read(path);
      if (file) {
        isVideo = file.type === 'video';
        src = isVideo && file.vault ? (await VaultURL.url(file.vault)) : (file.src || '');
      }
    }

    const pane = document.createElement('div');
    pane.className = 'imgpane';

    if (isVideo) {
      const video = document.createElement('video');
      video.src = src;
      video.controls = true;
      video.loop = true;
      video.playsInline = true;
      if (!src) {
        pane.textContent = 'THAT VIDEO IS NOT ON THE DISK ANY MORE.';
      } else {
        pane.appendChild(video);
      }
    } else {
      const img = document.createElement('img');
      img.src = src;
      img.alt = path;
      pane.appendChild(img);
    }
    root.appendChild(pane);
  },

  unmount() {}
};
