#!/usr/bin/env node
/* node scripts/check-trophy-wires.mjs -- every trophy has a way to happen (pure Node, a static read of the source).
   A trophy earned by an event (`on`) needs something that emits that event for its game; one earned by a counter (`stat`), a set (`sets`), a streak or a poll needs
   something that adds to, marks, streaks or checks that very key. A trophy nothing can ever reach is a trophy that "does not work", and this is the check that finds it.
   Dynamic names (a template string, a variable) cannot be read here: a few spots are listed in KNOWN with where they are emitted, and the check fails if a name is in neither. */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createTrophies } from '../kernel/trophies_core.js';
import { registerAll } from '../kernel/trophies_defs.js';

const root = new URL('..', import.meta.url).pathname;
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'vendor', 'assets', 'docs', 'electron']);
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    if (SKIP.has(f)) continue;
    const p = join(d, f), s = statSync(p);
    if (s.isDirectory()) walk(p); else if (/\.(js|mjs)$/.test(f) && !/_check\.js$|\/scripts\//.test(p) && !/apps\/[^/]+\/trophies\.js$|trophies_system|trophies_defs|trophy_kit|trophy_rewards/.test(p)) files.push([p.slice(root.length), readFileSync(p, 'utf8')]);
  }
})(root);

/* spots where the name is built in code, not written out: [app, kind, key] -> where */
const KNOWN = JSON.parse(readFileSync(new URL('./check-trophy-wires.known.json', import.meta.url), 'utf8'));

const T = createTrophies({ read: () => null, write: () => {}, pay: () => {}, announce: () => {} });
registerAll(T);
const q = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/* a call of one of these verbs with the key written out among its first few characters: `T.emit('move', ...)`, `Trophies.mark('system', 'apps', id)`, `sys.emit(copy ? 'copy' : 'move', ...)`,
   `trophy('out')` (the elephant's own wrapper) */
const has = (app, verb, key) => {
  const re = new RegExp('(?:' + verb + '|trophy|event)\\(\\s*[^;\\n]{0,80}?(?:\'|"|`)' + q(key) + '(?:\'|"|`)');
  return files.some(([p, s]) => re.test(s));
};
/* an app file may emit through a different object (T.emit, trophies('x').emit, sys.emit, sys.mark, calls) — the verb is what matters, and the key is unique enough per game */
const bad = [];
let n = 0;
T.defs.forEach(d => {
  if (d.legacy || d.retired || d.mastery || d.manual || d.id === 'meta_all') return;
  const app = d.app, id = d.id;
  const need = [];
  const ons = Array.isArray(d.on) ? d.on : d.on ? [d.on] : [];
  ons.forEach(e => need.push(['emit', e, 'emit']));
  if (d.stat) need.push(['stat', d.stat.key, 'add|max|setStat|seed']);
  if (d.sets) need.push(['sets', d.sets.key, 'mark|seedSet']);
  if (d.streak) need.push(['streak', d.streak.key, 'streak']);
  if (d.poll) need.push(['poll', d.poll.name, 'check']);
  need.forEach(([kind, key, verb]) => {
    n++;
    if (has(app, verb, key)) return;
    if (KNOWN[app + ':' + kind + ':' + key]) return;
    bad.push(id + '  (' + app + ': ' + kind + ' "' + key + '")');
  });
  if (!need.length && !d.derive && !d.manual) bad.push(id + '  (' + app + '): no way to be earned at all');
});
bad.forEach(b => console.log('NOT WIRED: ' + b));
console.log(bad.length ? bad.length + ' of ' + n + ' triggers have nothing that can reach them' : 'trophy wires: all ' + n + ' triggers have something that reaches them');
process.exit(bad.length ? 1 : 0);
