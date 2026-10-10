/* node apps/terminal/complete_check.js: Tab in the terminal. Every command the terminal knows is completable (and nothing is listed it does not know), a first word completes to a command or the program the prompt opens,
   a later word to a name in the folder it points into, in the disk's own spelling, a folder with a slash, several matches as far as they agree and listed. (pure Node) */
import { readFileSync } from 'node:fs';
import { COMMANDS, complete, commonPrefix } from './complete.js';

let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log('FAIL: ' + m); } };

/* the commands the terminal's own switch statements answer to */
const src = readFileSync(new URL('./index.js', import.meta.url), 'utf8');
const known = new Set([...src.matchAll(/case '([A-Z]+)'/g)].map(m => m[1]));
['DIR', 'CD', 'HELP', 'CLS', 'TROPHIES', 'TREE', 'DEGAUSS', 'PANIC', 'NEOFETCH', 'WELCOME'].forEach(c => ok(COMMANDS.indexOf(c) >= 0, 'COMMANDS has ' + c));
const missing = [...known].filter(c => COMMANDS.indexOf(c) < 0);
ok(missing.length === 0, 'the terminal answers to commands Tab does not know: ' + missing.join(' '));
const extra = COMMANDS.filter(c => !known.has(c));
ok(extra.length === 0, 'Tab offers commands the terminal does not answer to: ' + extra.join(' '));
ok(new Set(COMMANDS).size === COMMANDS.length, 'no command twice');

/* a small disk */
const disk = { '::': [{ name: 'Adam', type: 'folder' }, { name: 'Doc', type: 'folder' }, { name: 'Demo', type: 'folder' }, { name: 'AutoExec.HC', type: 'code' }, { name: 'Welcome.DD', type: 'doc' }], '::/Demo': [{ name: 'Hello.HC', type: 'code' }, { name: 'help.TXT', type: 'text' }, { name: 'Hi', type: 'folder' }], '::/Adam': [{ name: 'Adam.HC', type: 'code' }, { name: 'Seth.HC', type: 'code' }] };
let cwd = '::';
const resolve = a => { if (!a) return cwd; const s = a.replace(/\/$/, ''); return s === '::' || s.startsWith('::/') ? s : cwd + '/' + s; };
const o = { commands: ['MAGEN', 'MAGE', 'GARDEN'], list: async p => disk[p === '::/' ? '::' : p] || [], resolve: a => { const r = resolve(a); return r === '::/' ? '::' : r.replace('::/::', '::'); } };
const T = async l => complete(l, o);

/* the first word */
let r = await T('tro'); ok(r.line === 'tro' || r.line === 'TROPHY' || r.line.startsWith('TROPH'), 'tro: ' + r.line);
r = await T('tree'); ok(r.line === 'TREE ' && r.matches === 1, 'a whole command gets its space: "' + r.line + '"');
r = await T('welc'); ok(r.line === 'WELCOME ', 'one match is filled in: "' + r.line + '"');
r = await T('trophy'); ok(r.matches === 2 && r.show.join() === 'TROPHY,TROPHYBOX' && r.line === 'trophy', 'two commands: ' + JSON.stringify(r));
r = await T('mag'); ok(r.show.join() === 'MAGE,MAGEN' && r.line === 'MAGE', 'a program the prompt opens is a command: ' + JSON.stringify(r));
r = await T('zzz'); ok(r.line === 'zzz' && r.matches === 0 && !r.show.length, 'nothing matches');
r = await T(''); ok(r.line === '' && r.matches === 0, 'an empty line is left alone');
r = await T('  ga'); ok(r.line === '  GARDEN ', 'leading spaces are kept: "' + r.line + '"');
r = await T('d'); ok(r.show.length > 3 && r.line === 'd', 'many that share only the letter: ' + r.show.length);
r = await T('dir'); ok(r.matches === 1 || r.show.indexOf('DIR') >= 0, 'dir');

/* a later word: names on the disk */
r = await T('cd ad'); ok(r.line === 'cd Adam/', 'a folder gets a slash: "' + r.line + '"');
r = await T('type auto'); ok(r.line === 'type AutoExec.HC ', 'a file gets a space, in the disk\'s own spelling: "' + r.line + '"');
r = await T('cd d'); ok(r.matches === 2 && r.show.join() === 'Demo/,Doc/' && r.line === 'cd d', 'two folders: ' + JSON.stringify(r));
r = await T('cd '); ok(r.matches === 5 && r.show.slice(0, 3).every(s => s.endsWith('/')) && !r.show[3].endsWith('/'), 'nothing typed: every name, folders first: ' + JSON.stringify(r.show));
r = await T('type ::/Demo/he'); ok(r.matches === 2 && r.line === 'type ::/Demo/Hel' && r.show.join() === 'Hello.HC,help.TXT', 'two with a common start: ' + JSON.stringify(r));
r = await T('type ::/Demo/hel'); ok(r.matches === 2 && r.line === 'type ::/Demo/hel', 'a path (already as far as they agree): ' + JSON.stringify(r));
r = await T('type ::/Demo/hello'); ok(r.line === 'type ::/Demo/Hello.HC ', 'a path to one: "' + r.line + '"');
r = await T('del ::/Ad'); ok(r.line === 'del ::/Adam/', 'from the root: "' + r.line + '"');
r = await T('cd nothing'); ok(r.line === 'cd nothing' && r.matches === 0, 'no such name');
r = await T('cd ::/Adam/s'); ok(r.line === 'cd ::/Adam/Seth.HC ', 'a name in a folder: "' + r.line + '"');
r = await complete('type x', { commands: [], list: async () => { throw new Error('no disk'); }, resolve: a => a }); ok(r.line === 'type x', 'a disk that will not answer leaves the line alone');
/* typed with a space inside later: only the last word is completed */
r = await T('copy Adam ::/De'); ok(r.line === 'copy Adam ::/Demo/', 'the last word only: "' + r.line + '"');

ok(commonPrefix(['Hello.HC', 'help.TXT']) === 'Hel' && commonPrefix([]) === '' && commonPrefix(['a']) === 'a', 'common prefix, case ignored, first spelling');

console.log(bad ? bad + ' FAILED' : 'complete_check: ok (' + COMMANDS.length + ' commands)');
process.exit(bad ? 1 : 0);
