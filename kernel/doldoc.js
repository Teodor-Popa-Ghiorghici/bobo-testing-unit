export function ddTokens(line) {
  const out = [];
  let i = 0, buf = '';
  while (i < line.length) {
    if (line.charAt(i) !== '$') { buf += line.charAt(i); i++; continue; }
    let j = i + 1, q = false;
    while (j < line.length) {
      const c = line.charAt(j);
      if (c === '"' && line.charAt(j - 1) !== '\\') q = !q;
      if (c === '$' && !q) break;
      j++;
    }
    if (j >= line.length) { buf += line.charAt(i); i++; continue; }
    if (buf) { out.push({ t: 'text', v: buf }); buf = ''; }
    out.push({ t: 'cmd', v: line.slice(i + 1, j) });
    i = j + 1;
  }
  if (buf) out.push({ t: 'text', v: buf });
  return out;
}

export function ddArgs(body) {
  const quoted = [];
  const attrs = {};
  const re = /([A-Za-z]+)\s*=\s*"((?:[^"\\]|\\.)*)"|"((?:[^"\\]|\\.)*)"|([^,]+)/g;
  let m;
  while ((m = re.exec(body))) {
    if (m[1]) attrs[m[1].toUpperCase()] = m[2].replace(/\\(.)/g, '$1');
    else if (m[3] !== undefined) quoted.push(m[3].replace(/\\(.)/g, '$1'));
    else if (m[4] && m[4].trim()) quoted.push(m[4].trim());
  }
  return { q: quoted, a: attrs };
}

const PALETTE = ['#000000','#0000AA','#00AA00','#00AAAA','#AA0000','#AA00AA','#AA5500','#AAAAAA',
                 '#555555','#5555FF','#55FF55','#55FFFF','#FF5555','#FF55FF','#FFFF55','#FFFFFF'];

export function ddColor(s) {
  const n = parseInt(s, 10);
  if (!isNaN(n) && n >= 0 && n < 16) return PALETTE[n];
  return null;
}

export function ddRenderLine(line, host, state, onLink, onMacro) {
  const row = document.createElement('div');
  row.className = 'ddline';
  let span = null;
  const fresh = () => {
    span = document.createElement('span');
    if (state.fg) span.style.color = state.fg;
    if (state.bg) span.style.background = state.bg;
    if (state.blink) span.classList.add('blink');
    if (state.under) span.style.textDecoration = 'underline';
    row.appendChild(span);
    return span;
  };
  fresh();
  ddTokens(line).forEach(tok => {
    if (tok.t === 'text') { span.appendChild(document.createTextNode(tok.v)); return; }
    const body = tok.v;
    const head = (body.split(/[,+]/)[0] || '').toUpperCase().trim();
    const rest = body.slice(head.length).replace(/^[,+]/, '');
    const args = ddArgs(rest);
    switch (head) {
      case 'FG': state.fg = ddColor(args.q[0]); fresh(); break;
      case 'BG': state.bg = ddColor(args.q[0]); fresh(); break;
      case 'BK': state.blink = args.q[0] !== '0'; fresh(); break;
      case 'UL': state.under = args.q[0] !== '0'; fresh(); break;
      case 'ID': row.style.paddingLeft = (parseInt(args.q[0], 10) || 0) * 14 + 'px'; break;
      case 'HL': {
        const hr = document.createElement('span');
        hr.className = 'ddhr';
        row.appendChild(hr);
        fresh();
        break;
      }
      case 'TX': {
        row.style.textAlign = /CX/i.test(body) ? 'center' : 'left';
        if (args.q[0]) span.appendChild(document.createTextNode(args.q[0]));
        break;
      }
      case 'LK': {
        const a = document.createElement('span');
        a.className = 'ddlink';
        a.textContent = args.q[0] || 'link';
        const target = String(args.a.A || args.q[1] || '').replace(/^FI:/, '');
        a.addEventListener('mousedown', ev => { ev.stopPropagation(); if(onLink) onLink(target); });
        row.appendChild(a);
        fresh();
        break;
      }
      case 'MA': {
        const b = document.createElement('span');
        b.className = 'ddmacro';
        b.textContent = args.q[0] || 'run';
        const cmd = args.a.LM || args.q[1] || '';
        b.addEventListener('mousedown', ev => { ev.stopPropagation(); if(onMacro) onMacro(cmd); });
        row.appendChild(b);
        fresh();
        break;
      }
      case 'CL': row.innerHTML = ''; fresh(); break;
      default: break;
    }
  });
  if (!row.textContent && !row.querySelector('.ddspwrap,.ddhr,.ddlink,.ddmacro')) {
    row.innerHTML = '&nbsp;';
  }
  host.appendChild(row);
  return row;
}

export function ddRender(text, host, onLink, onMacro) {
  host.innerHTML = '';
  const state = { fg: null, bg: null, blink: false, under: false };
  const lines = String(text || '').split('\n');
  let sink = host;
  let tree = null;
  lines.forEach(line => {
    const trm = line.trim();
    if (/^\$TR-\$?$/.test(trm)) { sink = host; tree = null; return; }
    const trMatch = trm.match(/^\$TR\s*,\s*"((?:[^"\\]|\\.)*)"\s*\$$/);
    if (trMatch) {
      tree = document.createElement('div');
      tree.className = 'ddtree open';
      const head = document.createElement('div');
      head.className = 'ddtreehead';
      head.innerHTML = '<span class="tw">-</span> ';
      head.appendChild(document.createTextNode(trMatch[1].replace(/\\(.)/g, '$1')));
      const kids = document.createElement('div');
      kids.className = 'ddtreekids';
      const mine = tree;
      head.addEventListener('mousedown', ev => {
        ev.stopPropagation();
        const open = mine.classList.toggle('open');
        const tw = head.querySelector('.tw');
        if (tw) tw.textContent = open ? '-' : '+';
        if (window.Snd) window.Snd.click();
      });
      tree.appendChild(head);
      tree.appendChild(kids);
      host.appendChild(tree);
      sink = kids;
      return;
    }
    ddRenderLine(line, sink, state, onLink, onMacro);
  });
}
