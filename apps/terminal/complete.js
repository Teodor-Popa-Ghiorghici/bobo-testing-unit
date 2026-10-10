/* TAB IN THE TERMINAL. On the first word it completes a command (or the name of a program the prompt opens), on any later word a name in the folder it points into: one match is filled in whole (a folder gets a slash,
   anything else a space), several are filled in as far as they agree and listed. Names are compared without regard to case and filled in as the disk spells them. Pure, so Node holds it (complete_check.js);
   `o` brings the machine: { commands, list(path) -> [{ name, type }], resolve(path) -> path }. */
export const COMMANDS = ['DIR', 'LS', 'CD', 'CHDIR', 'TYPE', 'CAT', 'DEL', 'RM', 'MD', 'MKDIR', 'TOUCH', 'OPEN', 'RUN', 'MOVE', 'MV', 'COPY', 'CP', 'REN', 'RENAME', 'RESTORE', 'BIN', 'UNDELETE', 'TREE', 'COMPILE',
  'MEM', 'BELL', 'CLS', 'CLEAR', 'PWD', 'EXIT', 'QUIT', 'HELP', 'WELCOME', 'CREDITS', 'DATE', 'TIME', 'ECHO', 'NEOFETCH', 'FETCH', 'UNAME', 'SUDO', 'DOAS', 'PING', 'IFCONFIG', 'IP', 'CURL', 'WGET', 'SSH', 'COWSAY', 'SL',
  'LINES', 'GODWORD', 'WORD', 'GODSONG', 'SONG', 'TROPHIES', 'TROPHY', 'ACHIEVEMENTS', 'TROPHYBOX', 'BOX', 'SAVER', 'SCREENSAVER', 'DEGAUSS', 'DGAUSS', 'PANIC', 'CRASH', 'FORTUNE'];

const lower = s => String(s).toLowerCase();
/* how far a set of names agree from the start, case ignored, in the spelling of the first */
export function commonPrefix(names) {
  if (!names.length) return '';
  let n = names[0].length;
  for (const s of names) { let i = 0; while (i < n && i < s.length && lower(s[i]) === lower(names[0][i])) i++; n = i; }
  return names[0].slice(0, n);
}

/* what a Tab does to `line`: { line: the new line, show: names to list (several matches), tail: how many matches there were } */
export async function complete(line, o) {
  const m = /^(\s*)(\S*)$/.exec(line);
  if (m) {                                                        /* the first word: a command */
    const head = m[1], part = m[2];
    if (!part) return { line, show: [], matches: 0 };
    const all = [...new Set([...COMMANDS, ...(o.commands || [])])], hits = all.filter(c => lower(c).startsWith(lower(part))).sort();
    if (!hits.length) return { line, show: [], matches: 0 };
    if (hits.length === 1) return { line: head + hits[0] + ' ', show: [], matches: 1 };
    const p = commonPrefix(hits);
    return { line: head + (p.length > part.length ? p : part), show: hits, matches: hits.length };
  }
  const sp = /^(.*\s)(\S*)$/.exec(line);                          /* a later word: a name on the disk */
  if (!sp) return { line, show: [], matches: 0 };
  const before = sp[1], token = sp[2], cut = token.lastIndexOf('/'), dirPart = cut >= 0 ? token.slice(0, cut + 1) : '', base = cut >= 0 ? token.slice(cut + 1) : token;
  let entries = [];
  try { entries = await o.list(o.resolve(dirPart)); } catch (e) { entries = []; }
  const hits = (entries || []).filter(e => e && e.name && lower(e.name).startsWith(lower(base))).sort((a, b) => (a.type === 'folder' ? 0 : 1) - (b.type === 'folder' ? 0 : 1) || a.name.localeCompare(b.name));
  if (!hits.length) return { line, show: [], matches: 0 };
  const label = e => e.name + (e.type === 'folder' ? '/' : '');
  if (hits.length === 1) { const h = hits[0]; return { line: before + dirPart + h.name + (h.type === 'folder' ? '/' : ' '), show: [], matches: 1 }; }
  const p = commonPrefix(hits.map(e => e.name));
  return { line: before + dirPart + (p.length > base.length ? p : base), show: hits.map(label), matches: hits.length };
}
