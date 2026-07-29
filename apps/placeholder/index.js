export default {
  id: 'placeholder',
  title: 'OK',
  icon: '',
  width: 320,
  height: 200,
  resizable: true,
  mount(root, ctx) {
    root.innerHTML = '<div style="padding: 20px; color: white;">OK - App mounted successfully.</div>';
    
    const btn = document.createElement('button');
    btn.textContent = 'Close';
    btn.onclick = () => ctx.close();
    root.appendChild(btn);
  },
  unmount() {
    console.log("Placeholder unmounted");
  }
};
