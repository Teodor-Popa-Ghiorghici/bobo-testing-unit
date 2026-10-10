/* THE LAUNCHER'S BRAINS (kernel/launcher.js is the box on the glass): what can be reached by typing a few letters, and in what order it is offered. Pure, so Node holds it (scripts/check-launcher.mjs).
   Four kinds of thing: a WINDOW that is open (switch to it), an APP (open it), a FILE on the desk or in a folder (open it), and an ACTION (show the desktop, restore the system files...).
   A query is words; every word has to be found (at the start of the name, at the start of a word in it, inside it, in the app's keywords, or as letters in order); the better the match
   the higher it goes, then what is open, then what was used lately. An empty query lists what is open, then what was used lately, then the rest. */
export const KEY = 'templeos.launcher.v1';

/* every app a person can open by name: [registry id, the name it is listed under, what else it is called, args to open it with] */
export const APPS = [
  ['terminal', 'TERMINAL', 'shell prompt command console holyc type'],
  ['folder', 'FILES', 'folder explorer browse disk home desktop directory', { path: '::' }],
  ['notes', 'NOTES', 'text write wiki pages notebook links'],
  ['garage', 'THE GARAGE', 'music studio daw songs midi compose band'],
  ['hifi', 'THE STACK', 'music player hifi stack playlist album disc songs library'],
  ['crayon', 'DRAW', 'paint drawing crayon art sheet colour brush'],
  ['drawings', 'MY DRAWINGS', 'pictures gallery art drawings'],
  ['goddoodle', 'GODDOODLE', 'god doodle drawing temple'],
  ['holyc', 'HOLYC.EXE', 'learn code programming puzzles lessons workshop language compile'],
  ['bibel', 'THE BIBEL', 'book reader scripture read'],
  ['trophies', 'TROPHIES', 'trophy achievements ledger awards cups medals'],
  ['trophybox', 'TROPHY BOX', 'cups seals shelf trophies physics'],
  ['shop', 'CRAZY DAVE\'S', 'shop store buy dave sell frames pots themes'],
  ['account', 'ACCOUNT', 'sun money balance ledger earnings'],
  ['display', 'DISPLAY', 'scanlines screen settings crt readability glass'],
  ['cmos', 'CMOS SETUP', 'bios settings setup utility'],
  ['tasks', 'TASK MANAGER', 'processes kill running tasks'],
  ['defrag', 'MEMORY DEFRAG', 'defragment memory disk game'],
  ['neofetch', 'NEOFETCH', 'system info machine specs'],
  ['about', 'ABOUT THIS MACHINE', 'info version holytron about'],
  ['credits', 'CREDITS', 'creator playtesters thanks team'],
  ['trash', 'RECYCLE BIN', 'bin dumpster delete deleted restore trash'],
  ['bekkedal', 'BEKKEDAL', 'farm valley norway farming game village'],
  ['magen', 'MAGEN', 'idle clicker star mitzvot game'],
  ['aftere', 'AFTEREGYPT', 'flying pillars egypt temple game flappy'],
  ['cook', 'THE COOK', 'cooking puzzle shed jesse game backyard'],
  ['elephant', 'THE ELEPHANT', 'pet elephant animal oasis'],
  ['garden', 'GARDEN', 'plants pots flowers grow game seeds sun'],
  ['solitaire', 'SOLITAIRE', 'cards game league klondike'],
  ['sweeper', 'DUNGEON SWEEPER', 'minesweeper mines game dungeon hollow'],
  ['standbattle', 'STAND BATTLE ARENA', 'fighter fighting game arena versus tekken'],
  ['bottle', 'THE BOTTLE', 'jager jagermeister drink alcohol drunk game pour']
];
/* in the registry but not for a person to open by name: they need a file or a path */
export const NOT_LISTED = ['placeholder', 'editor', 'viewer'];

/* things to do, by id (kernel/launcher.js knows how to do each) */
export const ACTIONS = [
  ['show-desktop', 'SHOW THE DESKTOP', 'minimise hide all windows put away'],
  ['welcome', 'SHOW THE WELCOME WINDOW', 'start tour first help what is here'],
  ['restore', 'RESTORE SYSTEM FILES', 'missing deleted fix put back'],
  ['readable', 'TOGGLE READABILITY', 'background wallpaper veil contrast read'],
  ['arrange', 'ARRANGE ICONS', 'tidy desktop sort icons zones'],
  ['forget-places', 'FORGET WHERE WINDOWS WERE LEFT', 'reset window positions sizes cascade'],
  ['help', 'HELP', 'contents manual docs how'],
  ['keys', 'KEYBOARD SHORTCUTS', 'keys mouse help hotkeys']
];

/* upper case without accents, spaces folded */
export const fold = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

/* how well one word is found in one text (both already folded): 0 is not at all */
export function wordScore(tok, text) {
  if (!tok || !text) return 0;
  if (text === tok) return 100;
  if (text.startsWith(tok)) return 85;
  if (text.indexOf(' ' + tok) >= 0) return 72;
  if (text.indexOf(tok) >= 0) return 45;
  return 0;
}
/* the letters of `tok` in order somewhere in `text`: a weak match for a name typed from memory (TRPHS for TROPHIES), better the tighter they sit */
export function lettersScore(tok, text) {
  if (tok.length < 2 || tok.length > text.length) return 0;
  let at = -1, first = -1, last = -1;
  for (let i = 0; i < tok.length; i++) { at = text.indexOf(tok[i], at + 1); if (at < 0) return 0; if (i === 0) first = at; last = at; }
  const span = last - first + 1;
  return Math.max(6, Math.round(30 - (span - tok.length) * 2 - first * 0.5));
}

export const KIND_BONUS = { window: 8, app: 6, action: 3, file: 0 };
const KIND_ORDER = { window: 0, app: 1, action: 2, file: 3 };

/* how well an item answers a query: 0 if any word is not found. `item` is { kind, name, words?, hint? } with folded copies cached on it. */
export function scoreItem(item, toks) {
  const name = item._n || (item._n = fold(item.name)), words = item._w || (item._w = fold(item.words || '')), hint = item._h || (item._h = fold(item.hint || ''));
  let total = 0;
  for (const tok of toks) {
    let s = Math.max(wordScore(tok, name), wordScore(tok, words) * 0.6, wordScore(tok, hint) * 0.35);
    if (!s) s = lettersScore(tok, name) * 0.8;
    if (!s) return 0;
    total += s;
  }
  return total / toks.length;
}

/* the offer: `items` (all of them), the query, `recent` (ids, newest first, from the book), `limit`. Returns a list of items, best first. */
export function rank(items, query, recent, limit) {
  const toks = fold(query).split(' ').filter(Boolean), rec = recent || [], lim = limit || 9;
  const recentBonus = it => { const i = rec.indexOf(it.id); return i < 0 ? 0 : Math.max(1, 10 - i); };
  if (!toks.length) {
    const wins = items.filter(i => i.kind === 'window');
    const used = rec.map(id => items.find(i => i.id === id)).filter(i => i && i.kind !== 'window' && i.kind !== 'file');
    const seen = new Set([...wins, ...used].map(i => i.id));
    const rest = items.filter(i => i.kind === 'app' && !seen.has(i.id)).sort((a, b) => fold(a.name).localeCompare(fold(b.name)));
    return [...wins, ...used, ...rest].slice(0, lim);
  }
  const scored = [];
  items.forEach((it, idx) => { const s = scoreItem(it, toks); if (s > 0) scored.push({ it, s: s + KIND_BONUS[it.kind] + recentBonus(it), idx }); });
  scored.sort((a, b) => b.s - a.s || KIND_ORDER[a.it.kind] - KIND_ORDER[b.it.kind] || a.idx - b.idx);
  return scored.slice(0, lim).map(x => x.it);
}

/* what the box lists: a window for each open one (front first), every app, every action, and the files found so far */
export function buildItems(wins, files) {
  const out = [];
  (wins || []).forEach(w => out.push({ id: 'win:' + w.key, kind: 'window', name: w.title, words: w.appId || '', hint: w.hidden ? 'PUT AWAY' : 'OPEN', ref: w.key, appId: w.appId }));
  APPS.forEach(a => out.push({ id: 'app:' + a[0], kind: 'app', name: a[1], words: a[2], hint: 'PROGRAM', app: a[0], args: a[3] || null }));
  ACTIONS.forEach(a => out.push({ id: 'do:' + a[0], kind: 'action', name: a[1], words: a[2], hint: 'DO', act: a[0] }));
  (files || []).forEach(f => out.push({ id: 'file:' + f.path, kind: 'file', name: f.name, words: '', hint: f.path, file: f }));
  return out;
}

/* the book of what was used: newest first, no repeats, at most twelve */
export function remember(book, id) {
  if (!id || id.indexOf('win:') === 0) return book || [];
  return [id].concat((book || []).filter(x => x !== id)).slice(0, 12);
}
export function load(io) { try { const v = JSON.parse((io || localStorage).getItem(KEY)); return Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, 12) : []; } catch (e) { return []; } }
export function save(book, io) { try { (io || localStorage).setItem(KEY, JSON.stringify(book)); return true; } catch (e) { return false; } }
