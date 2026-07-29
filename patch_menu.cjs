const fs = require('fs');
let code = fs.readFileSync('kernel/desktop.js', 'utf8');

if (!code.includes('import { fs as vfs }')) {
  code = code.replace(/import \{ fs \} from '\.\/vfs\.js';/, "import { fs as vfs } from './vfs.js';");
  code = code.replace(/fs\.list/g, "vfs.list");
}
if (!code.includes('import { Style }')) {
  code = "import { Style } from './style.js';\n" + code;
}

const newWireMenu = `
function wireMenu() {
  const fileMenu = document.getElementById('filemenu');
  
  document.querySelectorAll('.menuitem').forEach(mi => {
    mi.addEventListener('mousedown', ev => {
      ev.stopPropagation();
      const m = mi.dataset.menu;
      if (window.Snd && window.Snd.select) window.Snd.select();
      
      // Close other menus if open
      if (fileMenu) fileMenu.style.display = 'none';
      
      if (m === 'Tools') {
        openWindow('terminal').catch(console.error);
      } else if (m === 'Help') {
        openWindow('editor', { path: '::/Compiler/HolyC.DD' }).catch(console.error);
      } else if (m === 'File') {
        if (!fileMenu) return;
        fileMenu.innerHTML = \`
          <div class="mi" id="mi-txt">Import Text...</div>
          <div class="mi" id="mi-img">Import Images...</div>
          <hr>
          <div class="mi" id="mi-clear">Clear Uploads</div>
        \`;
        
        const r = mi.getBoundingClientRect();
        fileMenu.style.left = r.left + 'px';
        fileMenu.style.top = r.bottom + 'px';
        fileMenu.style.display = 'block';
        
        document.getElementById('mi-txt').onclick = () => document.getElementById('picktxt').click();
        document.getElementById('mi-img').onclick = () => document.getElementById('pickimg').click();
        document.getElementById('mi-clear').onclick = async () => {
          // Clear uploads (everything in ::/Uploads)
          const list = await vfs.list('::/Uploads');
          let n = list.length;
          if (n > 0) {
            for (const item of list) await vfs.remove('::/Uploads/' + item.name);
            Style.hit({ name: 'Uploads' }, n);
            const toast = document.getElementById('toast');
            if (toast) { toast.textContent = 'ALL UPLOADS CLEARED.'; toast.style.display = 'block'; setTimeout(()=>toast.style.display='none', 2000); }
          }
        };
      }
    });
  });
  
  // File pickers
  const handleUpload = async (files, type) => {
    if (!files.length) return;
    await vfs.write('::/Uploads', { type: 'folder' });
    for (const f of files) {
      const buffer = await f.arrayBuffer();
      // basic implementation: store as text or base64
      let content;
      if (type === 'text' || type === 'code') content = await f.text();
      else {
        const b64 = Buffer.from(buffer).toString('base64');
        content = 'data:' + f.type + ';base64,' + b64;
      }
      await vfs.write('::/Uploads/' + f.name, { type, content });
    }
    const toast = document.getElementById('toast');
    if (toast) { toast.textContent = files.length + ' FILE(S) UPLOADED.'; toast.style.display = 'block'; setTimeout(()=>toast.style.display='none', 2000); }
    // Refresh desktop?
    initDesktop();
  };
  
  const picktxt = document.getElementById('picktxt');
  if (picktxt) picktxt.onchange = (e) => handleUpload(e.target.files, 'text');
  
  const pickimg = document.getElementById('pickimg');
  if (pickimg) pickimg.onchange = (e) => handleUpload(e.target.files, 'image');

  document.addEventListener('mousedown', () => {
    if (fileMenu) fileMenu.style.display = 'none';
  });
}
`;

code = code.replace(/function wireMenu\(\) \{[\s\S]*\}\n\/\/ Call wireMenu in initDesktop/, newWireMenu);
fs.writeFileSync('kernel/desktop.js', code);
