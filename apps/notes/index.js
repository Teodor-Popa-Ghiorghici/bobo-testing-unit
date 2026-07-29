import { createWindow, raise } from '../../kernel/wm.js';

export default {
  id: 'notes',
  title: 'NOTES',
  width: 600,
  height: 480,
  resizable: true,
  mount(root, ctx) {
  const body = root;
      /* ---- the shell ---------------------------------------------------- */
      const _rootEl = document.createElement('div');
      root.className = 'notesroot';
      root.innerHTML =
        '<div class="ntop">' +
          '<button class="appbtn nb-new">NEW</button>' +
          '<button class="appbtn nb-del">DELETE</button>' +
          '<span class="nsep"></span>' +
          '<button class="appbtn nb-b" title="Bold"><b>B</b></button>' +
          '<button class="appbtn nb-i" title="Italic"><i>I</i></button>' +
          '<button class="appbtn nb-h" title="Heading">H1</button>' +
          '<button class="appbtn nb-l" title="List">&bull;</button>' +
          '<button class="appbtn nb-t" title="Task">[ ]</button>' +
          '<button class="appbtn nb-k" title="Link">[[ ]]</button>' +
          '<select class="nsel nfont" title="Typeface">' +
            '<option value="mono">MONO</option><option value="sans">SANS</option>' +
            '<option value="serif">SERIF</option></select>' +
          '<select class="nsel nsize" title="Size">' +
            '<option value="12">12</option><option value="14" selected>14</option>' +
            '<option value="16">16</option><option value="19">19</option>' +
            '<option value="23">23</option></select>' +
          '<span class="nsep"></span>' +
          '<button class="appbtn nb-graph">GRAPH</button>' +
          '<button class="appbtn nb-prev">PREVIEW</button>' +
          '<span class="nstat"></span>' +
        '</div>' +
        '<div class="nbody">' +
          '<div class="nside">' +
            '<input class="nfind" placeholder="SEARCH NOTES" spellcheck="false">' +
            '<div class="nlist"></div>' +
          '</div>' +
          '<div class="nmain">' +
            '<input class="ntitle" spellcheck="false">' +
            '<textarea class="nedit" spellcheck="false"></textarea>' +
            '<div class="nread"></div>' +
            '<div class="nback"></div>' +
          '</div>' +
          '<div class="ngraph"><canvas class="ngcv" width="600" height="440"></canvas>' +
            '<div class="nghint">DRAG A NODE · SCROLL TO ZOOM · CLICK TO OPEN</div></div>' +
        '</div>';
      body.appendChild(_rootEl);

      const $ = s => root.querySelector(s);
      const listEl = $('.nlist'), titleEl = $('.ntitle'), editEl = $('.nedit'),
            readEl = $('.nread'), backEl = $('.nback'), statEl = $('.nstat'),
            findEl = $('.nfind'), graphEl = $('.ngraph'), gcv = $('.ngcv'),
            mainEl = $('.nmain');

      /* ---- the notes ---------------------------------------------------- */
      let N = { notes: [], cur: 0, font: 'mono', size: 14, mode: 'edit' };
      try {
        const raw = JSON.parse(localStorage.getItem(NOTE_KEY) || 'null');
        if (raw && Array.isArray(raw.notes) && raw.notes.length) N = Object.assign(N, raw);
      } catch (e) {}
      if (!N.notes.length) {
        N.notes = NOTE_SEED.map((s, i) => ({ id: 'n' + i, title: s.t, body: s.b, at: Date.now() - i * 1000 }));
      }
      N.notes.forEach(n => { if (!n.id) n.id = 'n' + Math.random().toString(36).slice(2, 8); });

      let saveT = null;
      const save = () => {
        clearTimeout(saveT);
        saveT = setTimeout(() => {
          try { localStorage.setItem(NOTE_KEY, JSON.stringify(N)); statEl.textContent = 'SAVED'; }
          catch (e) { statEl.textContent = 'COULD NOT SAVE'; }
          setTimeout(() => { if (statEl.textContent === 'SAVED') statEl.textContent = ''; }, 1200);
        }, 500);
      };
      const cur = () => N.notes[N.cur] || N.notes[0];
      const byTitle = t => N.notes.findIndex(n => n.title.toLowerCase() === String(t).toLowerCase().trim());

      /* every [[name]] in a body, in order, without duplicates */
      const LINK_RE = /\[\[([^\[\]|]+)(?:\|([^\[\]]+))?\]\]/g;
      function linksOf(n) {
        const out = [];
        String(n.body || '').replace(LINK_RE, (_, t) => { const k = t.trim();
          if (k && out.indexOf(k) < 0) out.push(k); return _; });
        return out;
      }
      function backlinksOf(title) {
        const t = title.toLowerCase();
        return N.notes.filter(n => n.title.toLowerCase() !== t &&
          linksOf(n).some(l => l.toLowerCase() === t));
      }
      function makeNote(title, body) {
        const n = { id: 'n' + Math.random().toString(36).slice(2, 8),
                    title: title || 'Untitled', body: body || '', at: Date.now() };
        N.notes.push(n);
        return n;
      }
      function openTitle(t) {
        let i = byTitle(t);
        if (i < 0) { makeNote(t.trim(), t.trim().toUpperCase() + '\n\n'); i = N.notes.length - 1; }
        show(i);
      }

      /* ---- drawing the pages -------------------------------------------- */
      const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
      function renderList() {
        const q = findEl.value.trim().toLowerCase();
        const rows = N.notes.map((n, i) => ({ n: n, i: i }))
          .filter(r => !q || (r.n.title + ' ' + r.n.body).toLowerCase().indexOf(q) >= 0)
          .sort((a, b) => a.n.title.localeCompare(b.n.title));
        listEl.innerHTML = '';
        if (!rows.length) { listEl.innerHTML = '<div class="nempty">NOTHING MATCHES</div>'; return; }
        rows.forEach(r => {
          const d = document.createElement('div');
          d.className = 'nrow' + (r.i === N.cur ? ' on' : '');
          d.innerHTML = '<span class="nrt">' + esc(r.n.title) + '</span>' +
                        '<span class="nrc">' + linksOf(r.n).length + '</span>';
          d.addEventListener('click', () => show(r.i));
          listEl.appendChild(d);
        });
      }

      /* the read-only view: headings, lists, ticks, bold, italic and links */
      function renderRead() {
        const n = cur();
        let html = esc(n.body || '');
        html = html.replace(/\[\[([^\[\]|]+)(?:\|([^\[\]]+))?\]\]/g, (m, t, alias) => {
          const exists = byTitle(t) >= 0;
          return '<a class="nlink' + (exists ? '' : ' dead') + '" data-t="' + esc(t.trim()) + '">' +
                 esc((alias || t).trim()) + '</a>';
        });
        html = html
          .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
          .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>')
          .replace(/^(#{1,3})\s*(.+)$/gm, (m, hh, t) => '<span class="nh' + hh.length + '">' + t + '</span>')
          .replace(/^- \[x\] (.+)$/gim, '<span class="ntask done">&#10003; $1</span>')
          .replace(/^- \[ \] (.+)$/gm, '<span class="ntask">&#9744; $1</span>')
          .replace(/^- (.+)$/gm, '<span class="nli">&bull; $1</span>');
        readEl.innerHTML = html;
        readEl.querySelectorAll('.nlink').forEach(a =>
          a.addEventListener('click', () => openTitle(a.dataset.t)));
      }

      function renderBack() {
        const n = cur();
        const back = backlinksOf(n.title);
        const out = linksOf(n);
        const dead = out.filter(t => byTitle(t) < 0);
        let h = '<span class="nbl">BACKLINKS</span>';
        if (!back.length) h += '<span class="nbnone">none</span>';
        back.forEach(b => h += '<a class="nchip" data-t="' + esc(b.title) + '">' + esc(b.title) + '</a>');
        h += '<span class="nbl">LINKS OUT</span>';
        if (!out.length) h += '<span class="nbnone">none</span>';
        out.forEach(t => h += '<a class="nchip' + (byTitle(t) < 0 ? ' dead' : '') +
                              '" data-t="' + esc(t) + '">' + esc(t) + '</a>');
        if (dead.length) h += '<span class="nbnone">' + dead.length + ' not written yet</span>';
        backEl.innerHTML = h;
        backEl.querySelectorAll('.nchip').forEach(a =>
          a.addEventListener('click', () => openTitle(a.dataset.t)));
      }

      function show(i) {
        if (i < 0 || i >= N.notes.length) return;
        N.cur = i;
        const n = cur();
        titleEl.value = n.title;
        editEl.value = n.body;
        applyType();
        renderList(); renderRead(); renderBack();
        if (graphEl.classList.contains('on')) layoutSeed();
        save();
      }
      function applyType() {
        const fam = { mono: "'Courier New', monospace", sans: "system-ui, sans-serif", serif: "Georgia, serif" }[N.font];
        [editEl, readEl].forEach(e => { e.style.fontFamily = fam; e.style.fontSize = N.size + 'px'; });
        $('.nfont').value = N.font;
        $('.nsize').value = String(N.size);
      }
      function setMode(m) {
        N.mode = m;
        root.classList.toggle('reading', m === 'read');
        graphEl.classList.toggle('on', m === 'graph');
        root.classList.toggle('graphing', m === 'graph');
        $('.nb-prev').textContent = m === 'read' ? 'EDIT' : 'PREVIEW';
        if (m === 'read') renderRead();
        if (m === 'graph') { layoutSeed(); gtick(); }
        save();
      }

      /* ---- typing -------------------------------------------------------- */
      editEl.addEventListener('input', () => {
        const n = cur(); n.body = editEl.value; n.at = Date.now();
        renderList(); renderBack();
        if (N.mode === 'read') renderRead();
        if (graphEl.classList.contains('on')) layoutSeed();
        save();
      });
      titleEl.addEventListener('input', () => {
        const n = cur(); const was = n.title;
        n.title = titleEl.value || 'Untitled';
        /* rename the note and every link that pointed at the old name */
        if (was && was !== n.title) {
          const re = new RegExp('\\[\\[' + was.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\|[^\\]]*)?\\]\\]', 'gi');
          N.notes.forEach(o => { if (o !== n) o.body = o.body.replace(re, (m, al) => '[[' + n.title + (al || '') + ']]'); });
        }
        renderList(); renderBack(); save();
      });
      findEl.addEventListener('input', renderList);

      /* wrap or insert, the way a formatting bar is expected to behave */
      function wrap(a, b) {
        const s = editEl.selectionStart, e = editEl.selectionEnd, v = editEl.value;
        const sel = v.slice(s, e) || '';
        editEl.value = v.slice(0, s) + a + sel + (b == null ? a : b) + v.slice(e);
        editEl.selectionStart = s + a.length;
        editEl.selectionEnd = s + a.length + sel.length;
        editEl.focus();
        editEl.dispatchEvent(new Event('input'));
      }
      function linePrefix(pre) {
        const v = editEl.value, s = editEl.selectionStart;
        const ls = v.lastIndexOf('\n', s - 1) + 1;
        editEl.value = v.slice(0, ls) + pre + v.slice(ls);
        editEl.selectionStart = editEl.selectionEnd = s + pre.length;
        editEl.focus();
        editEl.dispatchEvent(new Event('input'));
      }
      $('.nb-b').addEventListener('click', () => wrap('**'));
      $('.nb-i').addEventListener('click', () => wrap('*'));
      $('.nb-h').addEventListener('click', () => linePrefix('# '));
      $('.nb-l').addEventListener('click', () => linePrefix('- '));
      $('.nb-t').addEventListener('click', () => linePrefix('- [ ] '));
      $('.nb-k').addEventListener('click', () => wrap('[[', ']]'));
      $('.nfont').addEventListener('change', e => { N.font = e.target.value; applyType(); save(); });
      $('.nsize').addEventListener('change', e => { N.size = +e.target.value; applyType(); save(); });
      $('.nb-new').addEventListener('click', () => {
        let t = 'New Note', k = 2;
        while (byTitle(t) >= 0) t = 'New Note ' + k++;
        makeNote(t, t.toUpperCase() + '\n\n');
        show(N.notes.length - 1);
        titleEl.select(); titleEl.focus();
      });
      $('.nb-del').addEventListener('click', () => {
        if (N.notes.length <= 1) { statEl.textContent = 'THE LAST NOTE STAYS.'; return; }
        const n = cur();
        N.notes.splice(N.cur, 1);
        N.cur = Math.max(0, N.cur - 1);
        statEl.textContent = 'DELETED ' + n.title.toUpperCase();
        show(N.cur);
      });
      $('.nb-prev').addEventListener('click', () => setMode(N.mode === 'read' ? 'edit' : 'read'));
      $('.nb-graph').addEventListener('click', () => setMode(N.mode === 'graph' ? 'edit' : 'graph'));

      editEl.addEventListener('keydown', ev => {
        if ((ev.ctrlKey || ev.metaKey) && !ev.altKey) {
          const k = ev.key.toLowerCase();
          if (k === 'b') { ev.preventDefault(); wrap('**'); }
          else if (k === 'i') { ev.preventDefault(); wrap('*'); }
          else if (k === 'k') { ev.preventDefault(); wrap('[[', ']]'); }
          else if (k === 'e') { ev.preventDefault(); setMode(N.mode === 'read' ? 'edit' : 'read'); }
          else if (k === 'g') { ev.preventDefault(); setMode(N.mode === 'graph' ? 'edit' : 'graph'); }
        }
        /* ctrl-click a [[link]] under the cursor opens it */
        if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
          const v = editEl.value, s = editEl.selectionStart;
          const before = v.lastIndexOf('[[', s), after = v.indexOf(']]', s);
          if (before >= 0 && after > before) { ev.preventDefault(); openTitle(v.slice(before + 2, after).split('|')[0]); }
        }
      });

      /* ---- the graph -----------------------------------------------------
         A spring layout: every link pulls its two ends together, every pair
         of nodes pushes apart, and the whole thing is nudged toward the
         middle. It runs while the tab is open and settles in a second or two.
         ==================================================================== */
      const G = { pos: {}, vel: {}, drag: null, zoom: 1, ox: 0, oy: 0, raf: null, hot: null };
      function layoutSeed() {
        const n = N.notes.length;
        N.notes.forEach((note, i) => {
          if (!G.pos[note.id]) {
            const a = (i / Math.max(1, n)) * Math.PI * 2;
            G.pos[note.id] = { x: Math.cos(a) * 120 + (Math.random() - 0.5) * 20,
                               y: Math.sin(a) * 120 + (Math.random() - 0.5) * 20 };
            G.vel[note.id] = { x: 0, y: 0 };
          }
        });
        Object.keys(G.pos).forEach(k => { if (!N.notes.some(n2 => n2.id === k)) { delete G.pos[k]; delete G.vel[k]; } });
      }
      function graphEdges() {
        const out = [];
        N.notes.forEach(a => linksOf(a).forEach(t => {
          const j = byTitle(t);
          if (j >= 0 && N.notes[j] !== a) out.push([a.id, N.notes[j].id]);
          else if (j < 0) out.push([a.id, 'ghost:' + t.toLowerCase()]);
        }));
        return out;
      }
      function ghosts(edges) {
        const set = {};
        edges.forEach(e => { if (e[1].indexOf('ghost:') === 0) set[e[1]] = e[1].slice(6); });
        Object.keys(set).forEach((k, i) => {
          if (!G.pos[k]) {
            G.pos[k] = { x: (Math.random() - 0.5) * 220, y: (Math.random() - 0.5) * 220 };
            G.vel[k] = { x: 0, y: 0 };
          }
        });
        return set;
      }
      function gstep(dt) {
        const edges = graphEdges();
        const gh = ghosts(edges);
        const ids = N.notes.map(n => n.id).concat(Object.keys(gh));
        const deg = {}; ids.forEach(i => deg[i] = 0);
        edges.forEach(e => { deg[e[0]] = (deg[e[0]] || 0) + 1; deg[e[1]] = (deg[e[1]] || 0) + 1; });
        /* everything pushes everything else away */
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            const a = G.pos[ids[i]], b = G.pos[ids[j]];
            if (!a || !b) continue;
            let dx = b.x - a.x, dy = b.y - a.y;
            let d2 = dx * dx + dy * dy;
            if (d2 < 1) { dx = (Math.random() - 0.5); dy = (Math.random() - 0.5); d2 = 1; }
            const f = 5200 / d2;
            const d = Math.sqrt(d2);
            const fx = (dx / d) * f, fy = (dy / d) * f;
            G.vel[ids[i]].x -= fx * dt; G.vel[ids[i]].y -= fy * dt;
            G.vel[ids[j]].x += fx * dt; G.vel[ids[j]].y += fy * dt;
          }
        }
        /* a link is a spring with a rest length */
        edges.forEach(e => {
          const a = G.pos[e[0]], b = G.pos[e[1]];
          if (!a || !b) return;
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.max(1, Math.hypot(dx, dy));
          const f = (d - 96) * 1.7;
          const fx = (dx / d) * f, fy = (dy / d) * f;
          G.vel[e[0]].x += fx * dt; G.vel[e[0]].y += fy * dt;
          G.vel[e[1]].x -= fx * dt; G.vel[e[1]].y -= fy * dt;
        });
        ids.forEach(i => {
          const p = G.pos[i], v = G.vel[i];
          if (!p || !v) return;
          v.x -= p.x * 0.55 * dt; v.y -= p.y * 0.55 * dt;     /* toward the middle */
          v.x *= 0.86; v.y *= 0.86;                            /* friction */
          if (G.drag === i) { v.x = v.y = 0; return; }
          p.x += v.x * dt; p.y += v.y * dt;
        });
      }
      function gdraw() {
        const q = gcv.getContext('2d');
        const W = gcv.width, H = gcv.height;
        q.setTransform(1, 0, 0, 1, 0, 0);
        q.fillStyle = '#07090c'; q.fillRect(0, 0, W, H);
        q.strokeStyle = '#12181f'; q.lineWidth = 1;
        for (let x = 0; x < W; x += 24) { q.beginPath(); q.moveTo(x, 0); q.lineTo(x, H); q.stroke(); }
        for (let y = 0; y < H; y += 24) { q.beginPath(); q.moveTo(0, y); q.lineTo(W, y); q.stroke(); }
        q.setTransform(G.zoom, 0, 0, G.zoom, W / 2 + G.ox, H / 2 + G.oy);

        const edges = graphEdges();
        const gh = ghosts(edges);
        const curId = cur() ? cur().id : null;
        edges.forEach(e => {
          const a = G.pos[e[0]], b = G.pos[e[1]];
          if (!a || !b) return;
          const dead = e[1].indexOf('ghost:') === 0;
          const hot = e[0] === curId || e[1] === curId;
          q.strokeStyle = dead ? (hot ? '#ff7b6a' : '#5a2b26') : (hot ? '#55FFFF' : '#28323d');
          q.lineWidth = hot ? 2 / G.zoom : 1 / G.zoom;
          q.beginPath(); q.moveTo(a.x, a.y); q.lineTo(b.x, b.y); q.stroke();
          /* an arrow head, so the direction of a link is visible */
          const ang = Math.atan2(b.y - a.y, b.x - a.x), r = 13;
          const hx = b.x - Math.cos(ang) * r, hy = b.y - Math.sin(ang) * r;
          q.beginPath();
          q.moveTo(hx, hy);
          q.lineTo(hx - Math.cos(ang - 0.4) * 7, hy - Math.sin(ang - 0.4) * 7);
          q.lineTo(hx - Math.cos(ang + 0.4) * 7, hy - Math.sin(ang + 0.4) * 7);
          q.closePath(); q.fillStyle = q.strokeStyle; q.fill();
        });

        const deg = {};
        edges.forEach(e => { deg[e[0]] = (deg[e[0]] || 0) + 1; deg[e[1]] = (deg[e[1]] || 0) + 1; });
        q.textAlign = 'center'; q.textBaseline = 'middle';
        N.notes.forEach(n => {
          const p = G.pos[n.id]; if (!p) return;
          const r = 7 + Math.min(9, (deg[n.id] || 0) * 1.6);
          const on = n.id === curId, hot = G.hot === n.id;
          q.beginPath(); q.arc(p.x, p.y, r + 2, 0, Math.PI * 2);
          q.fillStyle = '#000000'; q.fill();
          q.beginPath(); q.arc(p.x, p.y, r, 0, Math.PI * 2);
          q.fillStyle = on ? '#FFFF55' : hot ? '#55FFFF' : '#55FF55'; q.fill();
          q.font = (on ? 'bold ' : '') + (11 / G.zoom < 7 ? 7 : 11) + 'px monospace';
          q.fillStyle = on ? '#FFFFFF' : '#AAAAAA';
          q.fillText(n.title, p.x, p.y + r + 9);
        });
        Object.keys(gh).forEach(k => {
          const p = G.pos[k]; if (!p) return;
          q.beginPath(); q.arc(p.x, p.y, 6, 0, Math.PI * 2);
          q.setLineDash([3, 3]); q.strokeStyle = '#FF5555'; q.lineWidth = 1.5 / G.zoom; q.stroke();
          q.setLineDash([]);
          q.font = '10px monospace'; q.fillStyle = '#FF5555';
          q.fillText(gh[k], p.x, p.y + 16);
        });
        q.setTransform(1, 0, 0, 1, 0, 0);
        q.font = '10px monospace'; q.textAlign = 'left'; q.fillStyle = '#55FF55';
        q.fillText(N.notes.length + ' NOTES · ' + edges.length + ' LINKS · ' +
                   Object.keys(gh).length + ' UNWRITTEN', 8, 14);
      }
      let glast = 0;
      function gtick(ts) {
        if (!graphEl.classList.contains('on') || !document.body.contains(_rootEl)) { G.raf = null; return; }
        G.raf = requestAnimationFrame(gtick);
        /* gtick is also called by hand when the graph is reopened, with no
           timestamp, while glast still holds the last one — which used to
           make dt hugely negative and fire every node off the canvas. */
        const t = (ts || 0) / 1000;
        const dt = Math.max(0.004, Math.min(0.05, (t - glast) || 0.016));
        glast = t;
        gstep(dt); gdraw();
      }
      /* pointer: drag a node, drag the background, wheel to zoom, click to open */
      const gAt = ev => {
        const r = gcv.getBoundingClientRect();
        const x = (ev.clientX - r.left) * (gcv.width / r.width);
        const y = (ev.clientY - r.top) * (gcv.height / r.height);
        return { x: (x - gcv.width / 2 - G.ox) / G.zoom, y: (y - gcv.height / 2 - G.oy) / G.zoom, sx: x, sy: y };
      };
      const gPick = p => {
        let best = null, bd = 20 * 20;
        Object.keys(G.pos).forEach(k => {
          const q = G.pos[k], d = (q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y);
          if (d < bd) { bd = d; best = k; }
        });
        return best;
      };
      gcv.addEventListener('mousemove', ev => {
        const p = gAt(ev);
        if (G.drag) {
          if (G.drag === '#pan') { G.ox += ev.movementX; G.oy += ev.movementY; }
          else if (G.pos[G.drag]) { G.pos[G.drag].x = p.x; G.pos[G.drag].y = p.y; G.moved = true; }
          return;
        }
        G.hot = gPick(p);
        gcv.style.cursor = G.hot ? 'pointer' : 'grab';
      });
      gcv.addEventListener('mousedown', ev => {
        ev.preventDefault();
        const p = gAt(ev), k = gPick(p);
        G.drag = k || '#pan'; G.moved = false;
      });
      window.addEventListener('mouseup', ev => {
        if (!G.drag) return;
        if (G.drag !== '#pan' && !G.moved && G.drag.indexOf('ghost:') !== 0) {
          const i = N.notes.findIndex(n => n.id === G.drag);
          if (i >= 0) { show(i); }
        } else if (G.drag !== '#pan' && !G.moved) {
          openTitle(G.drag.slice(6));            /* a node that is not written yet */
          setMode('edit');
        }
        G.drag = null;
      });
      gcv.addEventListener('wheel', ev => {
        ev.preventDefault();
        const f = ev.deltaY < 0 ? 1.12 : 1 / 1.12;
        G.zoom = Math.max(0.3, Math.min(3, G.zoom * f));
      }, { passive: false });
      gcv.addEventListener('dblclick', () => { G.zoom = 1; G.ox = 0; G.oy = 0; });

      /* ---- go ------------------------------------------------------------ */
      applyType();
      show(Math.min(N.cur, N.notes.length - 1));
      setMode('edit');
      const watch = setInterval(() => {
        if (document.body.contains(_rootEl)) return;
        clearInterval(watch);
        if (G.raf) cancelAnimationFrame(G.raf);
        try { localStorage.setItem(NOTE_KEY, JSON.stringify(N)); } catch (e) {}
      }, 900);
  }
};
