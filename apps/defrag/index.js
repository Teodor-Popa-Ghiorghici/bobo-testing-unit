let _timer = null;

export default {
  id: 'defrag',
  title: 'Defrag ::',
  icon: '',
  width: 500,
  height: 340,
  resizable: true,

  mount(root, ctx) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = 'apps/defrag/style.css';
    root.appendChild(style);

    const pane = document.createElement('div');
    pane.className = 'defragpane';
    const grid = document.createElement('div');
    grid.className = 'defraggrid';
    const legend = document.createElement('div');
    legend.className = 'defraglegend';
    legend.innerHTML =
      '<span><i class="db used"></i> Used</span>' +
      '<span><i class="db free"></i> Unused</span>' +
      '<span><i class="db read"></i> Reading</span>' +
      '<span><i class="db writ"></i> Writing</span>' +
      '<span><i class="db bad"></i> Bad</span>';
    const status = document.createElement('div');
    status.className = 'defragstatus';
    pane.appendChild(grid);
    pane.appendChild(legend);
    pane.appendChild(status);
    root.appendChild(pane);
    
    const N = 40 * 14;
    const cells = [];
    for (let i = 0; i < N; i++) {
      const d = document.createElement('i');
      const r = Math.random();
      d.className = 'db ' + (r < 0.02 ? 'bad' : r < 0.52 ? 'used' : 'free');
      grid.appendChild(d);
      cells.push(d);
    }
    
    let head = 0, done = 0;
    const total = cells.filter(c => c.classList.contains('used')).length;
    
    const step = () => {
      if (!document.body.contains(grid)) { clearInterval(_timer); return; }
      for (let k = 0; k < 3; k++) {
        while (head < N && !cells[head].classList.contains('used')) {
          if (!cells[head].classList.contains('bad')) cells[head].className = 'db free';
          head++;
        }
        if (head >= N) {
          status.textContent = 'DEFRAGMENTATION COMPLETE. 100% \u2014 ' + total + ' CLUSTERS. THE DISK IS AT PEACE.';
          clearInterval(_timer);
          if (window.Snd) window.Snd.bell();
          return;
        }
        cells[head].className = 'db read';
        const dest = cells.findIndex((c, i) => i < head && c.classList.contains('free'));
        setTimeout(() => {
          if (dest >= 0) cells[dest].className = 'db writ';
          setTimeout(() => {
            if (dest >= 0) cells[dest].className = 'db used';
            if (cells[head]) cells[head].className = 'db free';
          }, 60);
        }, 40);
        head++;
        done++;
        if (done % 9 === 0) { if (window.Snd) window.Snd.type(); }
      }
      status.textContent = 'CLUSTER ' + head + ' OF ' + N + '   ' +
                           Math.round(head / N * 100) + '%   MOVING ' + done + ' CLUSTERS';
    };
    
    _timer = setInterval(step, 90);
  },

  unmount() {
    if (_timer) clearInterval(_timer);
    _timer = null;
  }
};
