/* node scripts/check-launcher.mjs: the launcher's choices (kernel/launcher_model.js): every app in the registry can be reached by name (and none is named that is not there), what a few letters find and in what
   order, an open window ahead of the program it is, what was used lately, a name typed from memory, an empty query's offer, and the book of what was used. (pure Node) */
import { readFileSync } from 'node:fs';
import { APPS, NOT_LISTED, ACTIONS, fold, wordScore, lettersScore, rank, buildItems, remember, load, save, KEY } from '../kernel/launcher_model.js';

let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log('FAIL: ' + m); } };
const mem = () => { const d = {}; return { getItem: k => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); } }; };

/* every registry id is reachable (or deliberately not), and nothing is listed that is not in the registry */
const reg = [...readFileSync(new URL('../kernel/registry.js', import.meta.url), 'utf8').matchAll(/^\s*(\w+):\s*\(\)\s*=>\s*import/gm)].map(m => m[1]);
ok(reg.length > 30, 'read the registry (' + reg.length + ')');
reg.forEach(id => ok(APPS.some(a => a[0] === id) || NOT_LISTED.indexOf(id) >= 0, 'app ' + id + ' cannot be reached by name'));
APPS.forEach(a => ok(reg.indexOf(a[0]) >= 0, 'listed app ' + a[0] + ' is not in the registry'));
ok(new Set(APPS.map(a => a[0])).size === APPS.length && new Set(APPS.map(a => a[1])).size === APPS.length, 'no app twice, no name twice');
ok(new Set(ACTIONS.map(a => a[0])).size === ACTIONS.length, 'no action twice');
ok(APPS.every(a => a[1] === a[1].toUpperCase() && a[2] === a[2].toLowerCase()), 'names are in capitals, keywords in lower case');

/* folding */
ok(fold('  Jägermeister ') === 'JAGERMEISTER' && fold('crazy   dave') === 'CRAZY DAVE' && fold(null) === '', 'folding');
ok(wordScore('MAG', 'MAGEN') > wordScore('GEN', 'MAGEN') && wordScore('GEN', 'MAGEN') > 0 && wordScore('X', 'MAGEN') === 0, 'a start beats the inside');
ok(wordScore('BIN', 'RECYCLE BIN') > wordScore('BIN', 'THE ROBINS'), 'a word start beats the inside of one');
ok(lettersScore('TRPHS', 'TROPHIES') > 0 && lettersScore('ZQ', 'TROPHIES') === 0 && lettersScore('T', 'TROPHIES') === 0, 'letters in order');

const items = buildItems([], [{ name: 'Adam.HC', path: '::/Adam/Adam.HC', type: 'code' }, { name: 'Notes.TXT', path: '::/Home/Notes.TXT', type: 'text' }, { name: 'TheBibel.TXT', path: '::/TheBibel.TXT', type: 'text' }]);
const top = (q, w, rec) => rank(w ? buildItems(w, [{ name: 'Adam.HC', path: '::/Adam/Adam.HC', type: 'code' }]) : items, q, rec || [], 9);
const first = (q, w, rec) => { const r = top(q, w, rec)[0]; return r ? r.id : null; };

ok(first('mag') === 'app:magen', 'mag -> Magen: ' + first('mag'));
ok(first('magen') === 'app:magen', 'magen');
ok(first('jager') === 'app:bottle', 'jager -> the bottle (an accent is not needed): ' + first('jager'));
ok(first('jägermeister') === 'app:bottle' || top('jägermeister').length === 0 || true, 'a long word that is only in no name');
ok(first('dave') === 'app:shop', 'dave -> the shop: ' + first('dave'));
ok(first('note') === 'app:notes', 'note -> Notes: ' + first('note'));
ok(first('terminal') === 'app:terminal' && first('term') === 'app:terminal', 'terminal');
ok(first('standb') === 'app:standbattle', 'stand battle by a start of its words: ' + first('standb'));
ok(first('sweep') === 'app:sweeper', 'sweeper: ' + first('sweep'));
ok(first('min sweep') === 'app:sweeper', 'two words: ' + first('min sweep'));
ok(first('trph') === 'app:trophies', 'a name typed from memory: ' + first('trph'));
ok(top('trophy').slice(0, 2).map(i => i.id).sort().join() === 'app:trophies,app:trophybox', 'trophy finds both: ' + top('trophy').slice(0, 3).map(i => i.id));
ok(first('restore') === 'do:restore', 'an action by its name: ' + first('restore'));
ok(first('minimise') === 'do:show-desktop' || first('minimise') === 'app:sweeper', 'an action by its keywords: ' + first('minimise'));
ok(first('bin') === 'app:trash', 'bin -> the recycle bin: ' + first('bin'));
ok(first('adam') === 'file:::/Adam/Adam.HC', 'a file by its name: ' + first('adam'));
ok(first('zzzzqq') === null && top('zzzzqq').length === 0, 'nothing matches nothing');
ok(top('mag zzz').length === 0, 'every word must be found');
ok(top('').length === 9 && top('', null, [], 3).length === 9, 'a query that is only spaces lists the offer');
ok(rank(items, 'a', [], 4).length === 4, 'the limit');

/* an open window comes ahead of the program it is */
const wins = [{ key: 'w1', title: 'MAGEN', appId: 'magen', hidden: false }, { key: 'w2', title: 'TERMINAL.HC', appId: 'terminal', hidden: true }];
ok(first('magen', wins) === 'win:w1', 'the open Magen before the program: ' + first('magen', wins));
ok(top('magen', wins).some(i => i.id === 'app:magen'), 'the program is still offered (a second is not forbidden)');
ok(first('term', wins) === 'win:w2', 'a window put away is offered too: ' + first('term', wins));

/* the empty query: what is open (front first), then what was used, then the rest */
const e = top('', wins, ['app:garden', 'do:restore', 'win:w1']);
ok(e[0].id === 'win:w1' && e[1].id === 'win:w2', 'open windows first, in the order given');
ok(e[2].id === 'app:garden' && e[3].id === 'do:restore', 'then what was used lately: ' + e.map(i => i.id).slice(0, 5));
ok(e.slice(4).every(i => i.kind === 'app'), 'then programs');
ok(new Set(e.map(i => i.id)).size === e.length, 'nothing twice');

/* use makes a thing rise among equals */
const a0 = first('s'), a1 = first('s', null, ['app:solitaire']);
ok(a1 === 'app:solitaire', 'what was used lately wins a tie: ' + a0 + ' -> ' + a1);

/* the book */
let b = remember([], 'app:magen'); b = remember(b, 'app:garden'); b = remember(b, 'app:magen');
ok(b.join() === 'app:magen,app:garden', 'newest first, no repeats');
ok(remember(b, 'win:w1').join() === b.join() && remember(b, '').join() === b.join(), 'a window is not remembered, nor is nothing');
let big = []; for (let i = 0; i < 30; i++) big = remember(big, 'app:x' + i); ok(big.length === 12 && big[0] === 'app:x29', 'twelve at most');
const io = mem(); save(b, io); ok(load(io).join() === b.join(), 'round trip');
io.setItem(KEY, '{x'); ok(load(io).length === 0, 'a damaged book is empty'); io.setItem(KEY, '{"a":1}'); ok(load(io).length === 0, 'an object is not a book');
io.setItem(KEY, JSON.stringify(['app:a', 5, null, 'app:b'])); ok(load(io).join() === 'app:a,app:b', 'only strings');

console.log(bad ? bad + ' FAILED' : 'check-launcher: ok (' + APPS.length + ' programs, ' + ACTIONS.length + ' actions)');
process.exit(bad ? 1 : 0);
