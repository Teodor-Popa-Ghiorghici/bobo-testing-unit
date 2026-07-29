import { createWindow } from './wm.js';
import { Snd } from './snd.js';

/* ==========================================================================
   RING 0 HAS NO SAFETY NET
   --------------------------------------------------------------------------
   One address space, no user mode, nothing above to catch a fault. A crash
   does not raise an exception for somebody else to handle; it drops you into
   the debugger, which is where you were going to end up anyway.
   ========================================================================== */
let panicOpen = false;

function fakeRegs(seed) {
  let h = 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const names = ['RAX', 'RBX', 'RCX', 'RDX', 'RSI', 'RDI', 'RBP', 'RSP',
                 'R8 ', 'R9 ', 'R10', 'R11', 'R12', 'R13', 'R14', 'R15'];
  return names.map((n, i) => {
    h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0;
    const hi = (h ^ (i * 0x9E3779B1)) >>> 0;
    return n + '  0x' + hi.toString(16).toUpperCase().padStart(8, '0') +
           (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
  });
}

export function panic(err, where) {
  if (panicOpen) return;
  panicOpen = true;
  Snd.err();
  Snd.thunk();
  const msg = (err && err.message) ? err.message : String(err);
  const stack = String((err && err.stack) || '').split('\n').slice(0, 8);

  createWindow({
    kind: 'panic',
    title: 'PANIC — RING 0',
    w: 560, h: 340,
    build: body => {
      const t = document.createElement('div');
      t.className = 'term panicterm';
      const o = document.createElement('div');
      o.className = 'termout';
      const put = (txt, cls) => {
        const d = document.createElement('div');
        d.className = cls || 'l-err';
        d.textContent = txt;
        o.appendChild(d);
      };
      put('*** RING 0 FAULT ***');
      put('');
      put('  ' + (where || 'unknown') + ': ' + msg, 'l-holy');
      put('');
      put('REGISTERS', 'l-dim');
      const regs = fakeRegs(msg + where);
      for (let i = 0; i < regs.length; i += 2) put('  ' + regs[i] + '   ' + (regs[i + 1] || ''), 'l-ok');
      put('');
      put('CALL CHAIN', 'l-dim');
      stack.forEach(s => put('  ' + s.trim().slice(0, 70), 'l-ok'));
      put('');
      put('TASK  Seth  (child of Adam)', 'l-dim');
      put('THERE IS NO HANDLER ABOVE THIS ONE.', 'l-holy');
      put('TYPE G TO CONTINUE, R FOR REGISTERS, T FOR A TRACE.', 'l-dim');

      const line = document.createElement('div');
      line.className = 'termline';
      line.innerHTML = '<span class="p">DBG&gt;</span><span class="typed"></span>' +
                       '<span class="cur blink">█</span>';
      const input = document.createElement('input');
      input.className = 'terminput';
      input.spellcheck = false;
      line.appendChild(input);
      const typed = line.querySelector('.typed');

      input.addEventListener('input', () => { typed.textContent = input.value; Snd.type(); });
      input.addEventListener('keydown', ev => {
        if (ev.key !== 'Enter') return;
        Snd.enter();
        const c = input.value.trim().toUpperCase();
        input.value = ''; typed.textContent = '';
        if (c === 'G') { put('CONTINUING. NOTHING WAS FIXED.', 'l-holy'); }
        else if (c === 'R') { fakeRegs(Math.random()).forEach(r => put('  ' + r, 'l-ok')); }
        else if (c === 'T') { stack.forEach(s => put('  ' + s.trim().slice(0, 70), 'l-ok')); }
        else if (c === 'ADAM') { put('ADAM IS STILL RUNNING. ADAM IS ALWAYS RUNNING.', 'l-holy'); }
        else put('? G, R, T', 'l-err');
        o.scrollTop = o.scrollHeight;
      });

      t.appendChild(o);
      t.appendChild(line);
      body.appendChild(t);
      t.addEventListener('mousedown', () => setTimeout(() => input.focus(), 0));
      setTimeout(() => input.focus(), 0);
    }
  });
  setTimeout(() => { panicOpen = false; }, 1200);
}
