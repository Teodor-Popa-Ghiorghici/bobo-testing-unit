import { godWords, godStir, godSeed, godSong } from '../../kernel/god.js';
import * as tools from '../tools/trophy_calls.js';
import { Snd } from '../../kernel/snd.js';
import { Saver } from '../../kernel/saver.js';
import { degauss } from '../../kernel/hardware.js';
import { panic } from '../../kernel/panic.js';
import { hcLex, hcParse, hcRun, hcFnNames, looksLikeHolyC, isPanic } from '../../kernel/holyc.js';
import { compileNode } from '../../kernel/compile.js';
import { snapshot } from '../../kernel/holyc_env.js';
import { lineReport } from '../../kernel/lines.js';
import { sys } from '../../kernel/trophy_hook.js';
import { APP_ALIASES, APP_HELLO } from '../../kernel/commands.js';
import { complete } from './complete.js';

/* ---- the fallback answering machine --------------------------------------
   Real commands (DIR, CD, TYPE, DEL, MD, TREE, COMPILE...) are handled
   against the live file system first; anything the tree does not claim
   drops through to here: god/temple -> help/? -> hello/hi -> too short ->
   too long -> ??? */
const TERM = {
  divine: [
    ["GOD SAYS: THE TEMPLE IS NOT BUILT OF STONE.",
     "IT IS BUILT OF 640 KILOBYTES AND OBEDIENCE."],
    ["OFFERING ACCEPTED. RANDOM SEED BLESSED.",
     "ENTROPY 0x7F3A — THIS IS THE WORD FOR TODAY."],
    ["THE THIRD TEMPLE COMPILES CLEAN.",
     "NO WARNINGS. NO LINKER. NO INTERCESSOR."],
    ["SPEAK PLAINLY. GOD HATES ABSTRACTION LAYERS."]
  ],
  help: [
    ["THE TREE:",
     "  DIR [PATH] .... LIST A DIRECTORY",
     "  CD PATH ....... GO THERE. .. GOES UP",
     "  TYPE FILE ..... PRINT A TEXT FILE",
     "  OPEN FILE ..... OPEN IT IN A WINDOW",
     "  MD NAME ....... MAKE A DIRECTORY",
     "  DEL FILE ...... INTO THE RECYCLE BIN",
     "  MOVE A TO DIR . MOVE   COPY A TO DIR . COPY",
     "  REN FILE NAME . RENAME   BIN . WHAT IS IN THE BIN",
     "  UNDELETE [NAME]  PUT IT BACK",
     "  RESTORE ....... BRING BACK THE SYSTEM FILES",
     "  TREE .......... EVERYTHING BELOW HERE",
     "THE MACHINE:",
     "  COMPILE [FILE]  BUILD IT",
     "  MEM ........... REPORT FREE MEMORY",
     "  BELL .......... RING IT",
     "  CLS ........... CLEAR THE SCREEN",
     "GOD:",
     "  GODWORD [N] ... ASK FOR WORDS",
     "  GODDOODLE ..... ASK FOR A PICTURE",
     "  GODSONG ....... ASK FOR A TUNE",
     "  TROPHIES [GAME] THE LEDGER (TROPHIES OPEN OPENS IT)",
     "  TROPHYBOX ..... THE BIG CUPS (RESTORE PUTS ITS ICON BACK)",
     "APPS:",
     "  TASKS ......... ADAM, SETH AND THE REST",
     "  AFTEREGYPT .... THE GAME",
     "  BEKKEDAL ...... A SMALL LIFE IN NORWAY",
     "  STACK ......... THE HI-FI, THREE UNITS DEEP",
     "  NOTES ......... PAGES THAT POINT AT EACH OTHER",
     "  BOTTLE ........ ONE MEASURE AT A TIME",
     "  GARAGE ........ MAKE MUSIC WITH REAL INSTRUMENTS",
     "  ELEPHANT ...... HE HAS SOMETHING TO TELL YOU",
     "  MAGEN ......... PRESS THE STAR",
     "  COOK .......... TEN BATCHES, ONE BENCH",
     "  DEFRAG / SAVER  THE OTHER TWO",
     "  NEOFETCH ...... THE SPECS",
     "  CMOS .......... BIOS SETUP",
     "  DEGAUSS ....... THE COILS",
     "  PANIC ......... RING 0 HAS NO NET",
     "  WELCOME ....... THE TOUR OF WHAT THIS MACHINE HAS",
     "  CREDITS ....... WHO MADE IT, AND WHO TESTED IT",
     "HOLYC IS THE SHELL. A BARE STRING PRINTS:",
     "  \"HELLO\\n\";",
     "A FUNCTION NAME ON ITS OWN IS A CALL:",
     "  GodWord;",
     "UP ARROW WALKS BACK THROUGH HISTORY."]
  ],
  hello: [
    ["GREETINGS, PILGRIM. THE MACHINE IS AWAKE."],
    ["HELLO. YOU ARE THE ONLY USER. THERE IS NO LOGIN."],
    ["HELLO. STATE YOUR BUSINESS IN UNDER 40 CHARS."]
  ],
  tooShort: [["COMMAND TOO SHORT. TRY HELP."]],
  tooLong: [["BUFFER OVERFLOW. GOD SAYS BE BRIEF."]],
  unknown: [
    ["UNKNOWN COMMAND. THE COMPILER IS UNMOVED."],
    ["NOT FOUND. CHECK YOUR SPELLING, THEN YOUR HEART."],
    ["NO SUCH SYMBOL. TRY HELP."],
    ["SYNTAX ERROR. LINE 1. REPENT AND RETYPE."]
  ]
};

function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
function commas(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

function cowsay(text) {
  const t = (text || 'moo').slice(0, 60);
  const bar = '-'.repeat(t.length + 2);
  return [
    ' ' + bar,
    '< ' + t + ' >',
    ' ' + bar,
    '        \\   ^__^',
    '         \\  (oo)\\_______',
    '            (__)\\       )\\/\\',
    '                ||----w |',
    '                ||     ||'
  ];
}

const SL_FRAMES = [
  "      ====        ________                ___________ ",
  "  _D _|  |_______/        \\__I_I_____===__|_________| ",
  "   |(_)---  |   H\\________/ |   |        =|___ ___|   ",
  "   /     |  |   H  |  |     |   |         ||_| |_||   ",
  "  |      |  |   H  |__--------------------| [___] |   ",
  "  | ________|___H__/__|_____/[][]~\\_______|       |   ",
  "  |/ |   |-----------I_____I [][] []  D   |=======|__ ",
  "__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__ ",
  " |/-=|___|=    ||    ||    ||    |_____/~\\___/        ",
  "  \\_/      \\O=====O=====O=====O_/      \\_/            "
];

function runSL(print, host) {
  const wrap = document.createElement('div');
  wrap.className = 'slbox';
  host.appendChild(wrap);
  const W = 64;
  let x = W;
  const draw = () => {
    wrap.innerHTML = '';
    SL_FRAMES.forEach(row => {
      const d = document.createElement('div');
      d.className = 'l-ok';
      d.textContent = ' '.repeat(Math.max(0, x)) + row.slice(Math.max(0, -x));
      wrap.appendChild(d);
    });
  };
  draw();
  const t = setInterval(() => {
    x -= 2;
    if (x < -SL_FRAMES[0].length) {
      clearInterval(t);
      wrap.innerHTML = '';
      const d = document.createElement('div');
      d.className = 'l-dim';
      d.textContent = 'THE TRAIN HAS GONE. YOU MEANT LS.';
      wrap.appendChild(d);
      return;
    }
    draw();
    if (x % 8 === 0) Snd.type();
  }, 90);
}

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
    /* the shell IS the compiler, and what one line defines the next can use: variables, functions and classes live as long as this terminal */
    const hcGlobals = Object.create(null), hcClasses = new Set();

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

    /* every command answers with exactly one sound, picked from the
       loudest class it printed: a verdict, not a stream of beeps */
    let verdict = null;
    const RANK = { 'l-holy': 3, 'l-err': 2, 'l-ok': 1 };

    function print(lines, cls) {
      if (RANK[cls] && RANK[cls] > (RANK[verdict] || 0)) verdict = cls;
      lines.forEach(txt => {
        const d = document.createElement('div');
        d.className = cls || '';
        d.textContent = txt;
        out.appendChild(d);
      });
      out.scrollTop = out.scrollHeight;
    }
    function sayVerdict() {
      if (verdict === 'l-holy') Snd.holy();
      else if (verdict === 'l-err') Snd.err();
      else if (verdict === 'l-ok') Snd.ok();
    }

    print(['TEMPLEOS TERMINAL — HOLYC JIT ACTIVE',
           'THE TREE IS LIVE. TYPE HELP.',
           'IT IS ALSO THE COMPILER: TRY  "HELLO\\n";', ''], 'l-dim');

    let history = await ctx.load('history') || [];
    let hpos = history.length;

    input.addEventListener('input', () => {
      typed.textContent = input.value;
      Snd.type();
    });

    input.addEventListener('keydown', async ev => {
      /* Tab completes a command or a name on the disk; Ctrl+L clears the screen; Ctrl+C gives up on the line (apps/terminal/complete.js) */
      if (ev.key === 'Tab') {
        ev.preventDefault();
        const r = await complete(input.value, { commands: Object.keys(APP_ALIASES), list: p => ctx.fs.list(p), resolve: resolvePath });
        if (r.matches) Snd.key();
        input.value = r.line; typed.textContent = r.line;
        if (r.show.length) print([r.show.join('   ')], 'l-dim');
        return;
      }
      if (ev.ctrlKey && !ev.altKey && !ev.metaKey && (ev.key === 'l' || ev.key === 'L')) { ev.preventDefault(); out.innerHTML = ''; Snd.click(); return; }
      if (ev.ctrlKey && !ev.altKey && !ev.metaKey && !ev.shiftKey && (ev.key === 'c' || ev.key === 'C') && input.selectionStart === input.selectionEnd) {
        ev.preventDefault(); print(['::>' + input.value + '^C'], 'l-dim'); input.value = ''; typed.textContent = ''; hpos = history.length; return;
      }
      if (ev.key === 'Enter') {
        ev.preventDefault();
        const cmd = input.value;
        input.value = '';
        typed.textContent = '';
        Snd.enter();

        if (cmd.trim()) {
          history.push(cmd);
          if (history.length > 300) history.shift();
          ctx.save('history', history);
        }
        hpos = history.length;

        await runCommand(cmd);
      } else if (ev.key === 'ArrowUp') {
        Snd.key();
        ev.preventDefault();
        if (hpos > 0) {
          hpos--;
          input.value = history[hpos];
          typed.textContent = input.value;
        }
      } else if (ev.key === 'ArrowDown') {
        Snd.key();
        ev.preventDefault();
        if (hpos < history.length - 1) {
          hpos++;
          input.value = history[hpos];
        } else {
          hpos = history.length;
          input.value = '';
        }
        typed.textContent = input.value;
      }
    });

    function resolvePath(arg) {
      if (!arg) return cwd;
      let s = String(arg).replace(/\\/g, '/').trim();
      if (s === '::' || s.startsWith('::/')) return s;
      if (s === '..') {
        const parts = cwd.replace(/^::\/?/, '').split('/').filter(Boolean);
        parts.pop();
        return parts.length ? '::/' + parts.join('/') : '::';
      }
      if (s.charAt(0) === '/') return '::' + s;
      return cwd + (cwd.endsWith('/') ? '' : '/') + s;
    }

    async function nodeBytes(path) {
      const file = await ctx.fs.read(path);
      if (!file) return 0;
      if (file.type === 'text' || file.type === 'code' || file.type === 'doc') return (file.content || '').length;
      if (file.type === 'image' || file.type === 'video') return Math.round((file.src || '').length * 0.75);
      return 0;
    }

    async function doDir(arg) {
      const target = resolvePath(arg);
      const list = await ctx.fs.list(target);
      if (!list.length) {
        print([' DIRECTORY OF ' + target, '', ' NO ENTRIES.', ''], 'l-ok');
        return;
      }
      const lines = [' VOLUME IN :: IS TEMPLE', ' DIRECTORY OF ' + target, ''];
      let files = 0, dirs = 0, bytes = 0;
      for (const c of list) {
        if (c.type === 'folder') { dirs++; lines.push(' ' + c.name.padEnd(16) + '<DIR>'.padStart(9)); }
        else {
          files++;
          const b = await nodeBytes(target + (target.endsWith('/') ? '' : '/') + c.name);
          bytes += b;
          lines.push(' ' + c.name.padEnd(16) + commas(b).padStart(9));
        }
      }
      lines.push('');
      lines.push('     ' + String(files).padStart(4) + ' FILE(S) ' + commas(bytes).padStart(11) + ' BYTES');
      lines.push('     ' + String(dirs).padStart(4) + ' DIR(S)');
      print(lines, 'l-ok');
    }

    async function doCd(arg) {
      if (!arg) return print([cwd], 'l-ok');
      const target = resolvePath(arg);
      if (target === '::') { cwd = target; setPrompt(); return; }
      const list = await ctx.fs.list(target);
      if (!list.length) {
        const parent = target.slice(0, target.lastIndexOf('/'));
        const parentList = await ctx.fs.list(parent || '::');
        const name = target.slice(target.lastIndexOf('/') + 1);
        const hit = parentList.find(c => c.name.toUpperCase() === name.toUpperCase());
        if (!hit) return print(['PATH NOT FOUND: ' + arg], 'l-err');
        if (hit.type !== 'folder') return print([hit.name + ' IS NOT A DIRECTORY.'], 'l-err');
      }
      cwd = target;
      setPrompt();
    }

    async function doType(arg) {
      const target = resolvePath(arg);
      const file = await ctx.fs.read(target);
      if (!file) return print(['FILE NOT FOUND: ' + arg], 'l-err');
      if (file.type === 'image' || file.type === 'video') {
        ctx.openWindow('viewer', { path: target, type: file.type }).catch(console.error);
        return print(['BINARY. OPENED IN A VIEWER INSTEAD.'], 'l-dim');
      }
      const rows = String(file.content || '').split('\n');
      print(rows.slice(0, 200), 'l-dim');
      if (rows.length > 200) print(['-- TRUNCATED AT 200 LINES --'], 'l-err');
    }

    async function doDel(arg) {
      const target = resolvePath(arg);
      if (!arg) return print(['MISSING PATH.'], 'l-err');
      if (!(await ctx.fs.stat(target))) return print(['NOT FOUND: ' + arg], 'l-err');
      await ctx.fs.trash(target);
      if (cwd === target || cwd.startsWith(target + '/')) {
        cwd = target.slice(0, target.lastIndexOf('/')) || '::';
        setPrompt();
      }
      print(['DELETED ' + target.split('/').pop() + '. IT IS IN THE RECYCLE BIN (UNDELETE).'], 'l-ok');
    }

    async function doMd(arg) {
      if (!arg) return print(['MD NEEDS A NAME.'], 'l-err');
      const target = resolvePath(arg);
      try { await ctx.fs.mkdir(target); } catch (e) { return print([e.message], 'l-err'); }
      print(['CREATED ' + arg + ' IN ' + cwd + '.'], 'l-ok');
    }

    async function doTree(path, depth, lines) {
      lines = lines || [path];
      const kids = await ctx.fs.list(path);
      for (const c of kids) {
        lines.push('  '.repeat(depth + 1) + (c.type === 'folder' ? '+ ' : '  ') + c.name);
        if (c.type === 'folder') await doTree(path + '/' + c.name, depth + 1, lines);
      }
      return lines;
    }

    async function doCompile(arg) {
      const target = arg ? resolvePath(arg) : (window._lastTextPath || cwd + '/AutoExec.HC');
      const file = await ctx.fs.read(target);
      if (!file || (file.type !== 'text' && file.type !== 'code' && file.type !== 'doc')) {
        return print(['NOTHING TO COMPILE. OPEN A .HC OR NAME ONE.'], 'l-err');
      }
      compileNode(target, file.content, print);
      try { sys.emit('cmd', { name: 'COMPILE', own: !(await ctx.fs.isSystem(target)) }); } catch (e) { /* never */ }
    }

    /* the rest of the command set: neofetch, the oracle, the games */
    async function runExtra(cmd, arg, raw) {
      switch (cmd) {
        case 'NEOFETCH': case 'FETCH': {
          sys.mark('eggs', 'NEOFETCH');
          const mod = await import('../neofetch/index.js');
          mod.default.open();
          print(['CHECK THE NEW WINDOW.'], 'l-dim');
          return true;
        }
        case 'UNAME':
          print([/-A/i.test(arg)
            ? 'TempleOS temple 5.03 #1 Ring0 x86_64 HolyC/public-domain'
            : 'TempleOS'], 'l-ok');
          return true;
        case 'SUDO': case 'DOAS':
          sys.mark('eggs', 'SUDO');
          print(['YOU ARE ALREADY GOD. THERE IS NOTHING TO ESCALATE TO.'], 'l-holy');
          return true;
        case 'PING':
          sys.mark('eggs', 'PING');
          print(['THERE IS NO NETWORK.',
                 'THAT IS NOT A FAULT. NOTHING GETS IN AND NOTHING PHONES HOME.'], 'l-holy');
          return true;
        case 'IFCONFIG': case 'IP': case 'CURL': case 'WGET': case 'SSH':
          sys.mark('eggs', 'CURL');
          print(['NO NETWORK STACK. NONE WAS EVER WRITTEN.'], 'l-err');
          return true;
        case 'COWSAY':
          sys.mark('eggs', 'COWSAY');
          print(cowsay(arg || 'HolyC is the shell.'), 'l-ok');
          return true;
        case 'SL':
          sys.mark('eggs', 'SL');
          runSL(print, out);
          return true;
        case 'LINES': {
          sys.mark('eggs', 'LINES'); sys.emit('cmd', { name: 'LINES' });
          const rows = await lineReport();
          print(rows || ['THE COUNT IS NOT ON THE DISK. RUN  node scripts/make-lines.mjs'], 'l-ok');
          return true;
        }
        case 'GODWORD': case 'WORD': {
          const n = Math.max(1, Math.min(16, parseInt(arg, 10) || 7));
          godStir();
          print([godWords(n).join(' ').toUpperCase()], 'l-holy'); tools.word(arg ? n : 0);
          print(['SEED 0x' + godSeed.toString(16).toUpperCase().padStart(8, '0')], 'l-dim');
          return true;
        }
        case 'GODSONG': case 'SONG': {
          const n = godSong(); tools.song();
          print([n + ' NOTES, CHOSEN THE SAME WAY THE WORDS ARE.'], 'l-holy');
          return true;
        }
        case 'TROPHIES': case 'TROPHY': case 'ACHIEVEMENTS': {
          const T = window.Trophies;
          if (!T) { print(['THE LEDGER IS NOT LOADED.'], 'l-err'); return true; }
          const cli = await import('../../kernel/trophies_cli.js'), say = rows => rows.forEach(r => print([r[0]], r[1]));
          if (cmd === 'TROPHY') say(cli.ofOne(T, arg));
          else if (!arg) say(cli.summary(T, T.names));
          else if (arg === 'OPEN' || arg === 'LEDGER') ctx.openWindow('trophies');
          else { const id = cli.findArea(T, arg, T.names); if (id) say(cli.ofArea(T, id, T.names)); else say(cli.ofOne(T, arg)); }
          return true;
        }
        case 'TROPHYBOX': case 'BOX': ctx.openWindow('trophybox'); print(['OPENING THE TROPHY BOX. ITS ICON IS GONE? RESTORE.'], 'l-dim'); return true;
        case 'SAVER': case 'SCREENSAVER':
          Saver.idle = 0;
          Saver.start();
          print(['ANY KEY BRINGS IT BACK.'], 'l-dim');
          return true;
        case 'DEGAUSS': case 'DGAUSS':
          degauss();
          print(['DEGAUSSING.'], 'l-ok');
          return true;
        case 'PANIC': case 'CRASH':
          setTimeout(() => {
            try { (void 0).ascendToRing0(); }
            catch (e) { panic(e, 'deliberate'); }
          }, 10);
          print(['DROPPING TO THE DEBUGGER.'], 'l-err');
          return true;
        case 'FORTUNE':
          sys.mark('eggs', 'FORTUNE');
          print([godWords(4).join(' ').toUpperCase() + '.',
                 'MAKE OF IT WHAT YOU WILL.'], 'l-holy');
          return true;
        default:
          break;
      }

      if (APP_ALIASES[cmd]) {
        const id = APP_ALIASES[cmd];
        ctx.openWindow(id).catch(console.error);
        print([APP_HELLO[id] || ('OPENED ' + cmd + '.')], 'l-ok');
        return true;
      }

      /* the fork bomb, in every spelling anyone ever types it */
      if (/^:\s*\(\s*\)\s*\{.*\}\s*;?\s*:?$/.test(raw.replace(/\s+/g, ' ')) ||
          raw.replace(/\s+/g, '') === ':(){:|:&};:') {
        sys.mark('eggs', 'FORKBOMB');
        print(['THERE IS NO FORK.',
               'ONE ADDRESS SPACE. ONE RING. NOTHING TO DOUBLE.'], 'l-holy');
        return true;
      }
      return false;
    }

    async function runCommand(raw) {
      const s = raw.trim();
      verdict = null;
      print([cwd + '>' + raw], 'l-echo');
      if (!s) { out.scrollTop = out.scrollHeight; Snd.enter(); return; }

      const head = s.split(/\s+/)[0];
      const cmd = head.toUpperCase();
      const owned = (cmd === 'BELL' || cmd === 'COMPILE');
      const arg = s.slice(head.length).trim();
      const q = s.toLowerCase();

      switch (cmd) {
        case 'DIR': case 'LS':          await doDir(arg); break;
        case 'CD': case 'CHDIR':        await doCd(arg); break;
        case 'TYPE': case 'CAT':        Snd.page(); await doType(arg); break;
        case 'DEL': case 'RM':          await doDel(arg); break;
        case 'MD': case 'MKDIR':        await doMd(arg); break;
        case 'TOUCH': {
          if (!arg) { print(['MISSING PATH.'], 'l-err'); break; }
          const made = resolvePath(arg);
          await ctx.fs.write(made, { type: 'text', content: '' });
          window.dispatchEvent(new CustomEvent('vfs-changed', { detail: { dir: made.slice(0, made.lastIndexOf('/')) || '::' } }));
          print(['FILE CREATED.'], 'l-ok');
          break;
        }
        case 'OPEN': case 'RUN': {
          const target = resolvePath(arg);
          const file = await ctx.fs.read(target);
          if (!file) { print(['NOT FOUND: ' + arg], 'l-err'); break; }
          if (file.type === 'app' && file.app) ctx.openWindow(file.app).catch(console.error);
          else if (file.type === 'text' || file.type === 'code') ctx.openWindow('editor', { path: target, type: file.type }).catch(console.error);
          else if (file.type === 'doc') ctx.openWindow('editor', { path: target, type: file.type }).catch(console.error);
          else ctx.openWindow('viewer', { path: target, type: file.type }).catch(console.error);
          print(['OPENED ' + target.split('/').pop() + '.'], 'l-ok');
          verdict = null;
          break;
        }
        case 'MOVE': case 'MV': case 'COPY': case 'CP': case 'REN': case 'RENAME': {
          const parts = arg.split(/\s+/).filter(Boolean);
          if (parts.length !== 2) { print(['USAGE: ' + cmd + ' FROM ' + (/^R/.test(cmd) ? 'NEWNAME' : 'TOFOLDER')], 'l-err'); break; }
          try {
            const from = resolvePath(parts[0]);
            if (/^R/.test(cmd)) print(['RENAMED TO ' + (await ctx.fs.rename(from, parts[1])).split('/').pop() + '.'], 'l-ok');
            else {
              const to = resolvePath(parts[1]);
              const dst = /^(MO|MV)/.test(cmd) ? await ctx.fs.move(from, to) : await ctx.fs.copy(from, to);
              print([(/^(MO|MV)/.test(cmd) ? 'MOVED TO ' : 'COPIED TO ') + dst], 'l-ok');
            }
          } catch (e) { print([e.message], 'l-err'); }
          break;
        }
        case 'RESTORE': {
          const back = await ctx.fs.restoreSystem();
          print(back.length ? ['SYSTEM FILES BACK: ' + back.join(', ')] : ['EVERY SYSTEM FILE IS ALREADY HERE.'], 'l-ok');
          break;
        }
        case 'BIN': {
          const bin = await ctx.fs.trashList();
          print(bin.length ? bin.map(b => ' ' + b.name.padEnd(20) + 'FROM ' + b.from) : ['THE RECYCLE BIN IS EMPTY.'], 'l-ok');
          break;
        }
        case 'UNDELETE': {
          const bin = await ctx.fs.trashList();
          const hit = arg ? bin.find(b => b.name.toLowerCase() === arg.toLowerCase()) : bin[0];
          if (!hit) { print(['NOTHING TO UNDELETE.'], 'l-err'); break; }
          print(['PUT BACK: ' + await ctx.fs.trashRestore(hit.id)], 'l-ok');
          break;
        }
        case 'TREE':                    print(await doTree(cwd, 0), 'l-ok'); break;
        case 'COMPILE':                 await doCompile(arg); break;
        case 'MEM': {
          const used = (await ctx.fs.list('::')).length * 640;
          print([' CONVENTIONAL   640,000 BYTES',
                 ' IN USE       ' + commas(used).padStart(11) + ' BYTES',
                 ' FREE         ' + commas(Math.max(0, 640000 - used)).padStart(11) + ' BYTES',
                 ' IT IS ENOUGH.'], 'l-ok');
          break;
        }
        case 'BELL':                    Snd.bell(); print(['RUNG.'], 'l-holy'); break;
        case 'CLS': case 'CLEAR':       out.innerHTML = ''; Snd.click(); return;
        case 'PWD':                     print([cwd], 'l-ok'); break;
        case 'EXIT': case 'QUIT':       print(['THERE IS NOWHERE TO EXIT TO.'], 'l-holy'); break;
        case 'HELP':                    print(pick(TERM.help), 'l-ok'); break;
        case 'WELCOME':                 if (window.Welcome) window.Welcome.open(); print(['THE TOUR IS OPEN.'], 'l-ok'); break;
        case 'CREDITS':                 ctx.openWindow('credits'); print(['THE CREDITS ARE UP.'], 'l-holy'); break;
        case 'DATE': case 'TIME':       print([new Date().toLocaleString()], 'l-ok'); break;
        case 'ECHO':                    print([arg], 'l-ok'); break;

        default: {
          if (await runExtra(cmd, arg, s)) { verdict = null; break; }
          /* then HolyC, because the shell IS the compiler */
          if (looksLikeHolyC(s)) {
            verdict = null;
            const env = await snapshot(cwd);
            try {
              const ast = hcParse(hcLex(s), { classNames: hcClasses });
              hcRun(ast, line => print([line], 'l-holyc'), hcGlobals, {
                godDoodle: () => ctx.openWindow('goddoodle').catch(console.error),
                dirNames: env.dirNames, cd: p => env.cd(p, t => { cwd = t; setPrompt(); })
              });
              sys.holyc(ast, null, hcFnNames(hcGlobals));
            } catch (e) {
              if (isPanic(e)) { print(['DROPPING TO THE DEBUGGER.'], 'l-err'); panic(e, 'deliberate'); }
              else if (e && e.holyc) {
                print(['HolyC: ' + e.message + (e.line ? '  (line ' + e.line + ')' : '')], 'l-err');
                Snd.err();
              } else {
                panic(e, 'HolyC JIT');
              }
            }
            break;
          }
          /* and then the answering machine, which is the point of it */
          if (q.includes('god') || q.includes('temple')) print(pick(TERM.divine), 'l-holy');
          else if (q.includes('help') || q === '?')      print(pick(TERM.help), 'l-ok');
          else if (q.includes('hello') || q.includes('hi')) {
            print(pick(TERM.hello), 'l-ok');
            verdict = null;
            Snd.chirp();
          }
          else if (s.length < 4)  print(pick(TERM.tooShort), 'l-err');
          else if (s.length > 40) print(pick(TERM.tooLong), 'l-err');
          else print(pick(TERM.unknown), 'l-err');
        }
      }
      print([''], 'l-dim');
      if (!owned) sayVerdict();
    }

    setPrompt();
  },

  unmount() {}
};
