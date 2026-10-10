#!/usr/bin/env node
/* The buffs HOLYC.EXE hides (pure Node): kernel/buffs_core.js and apps/holyc/buff_rules.js.
   THE RULES    eight buffs, each earned by exactly one thing (a real puzzle, or a thing the workshop notices); no two by the same; every game that has one is a real app
   UNAIDED      solved, the answer never seen, no hint ever opened (a puzzle kept before hints were tracked counts unless its answer was seen)
   THE BOOK     granted once, kept, told to the machine, said aloud once for a batch and not at all when quiet; the words never name a game
   THE WORKSHOP a program written from a blank page that runs clean earns; a template, or a template with a few words changed, or a program too short, does not */
import { BUFFS, byId, unaided, earnedBy, createBuffs, LINES } from '../kernel/buffs_core.js';
import { workshopFlags, fromTemplate } from '../apps/holyc/buff_rules.js';
import { PUZZLES } from '../apps/holyc/puzzles.js';
import { TEMPLATES } from '../apps/holyc/templates.js';
import { registry } from '../kernel/registry.js';

let bad = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };

console.log('-- the rules --');
ok(BUFFS.length === 8 && new Set(BUFFS.map(b => b.id)).size === 8, 'eight buffs, each its own id');
const puzzleBuffs = BUFFS.filter(b => b.by.puzzle), shopBuffs = BUFFS.filter(b => b.by.shop);
ok(puzzleBuffs.length === 6 && shopBuffs.length === 2, 'six come from puzzles and two from the workshop');
ok(puzzleBuffs.every(b => PUZZLES.some(p => p.id === b.by.puzzle)), 'every puzzle that gives one is a real puzzle: ' + puzzleBuffs.map(b => b.by.puzzle).join(', '));
ok(new Set(puzzleBuffs.map(b => b.by.puzzle)).size === puzzleBuffs.length && new Set(shopBuffs.map(b => b.by.shop)).size === shopBuffs.length, 'no two buffs are given by the same thing');
ok(BUFFS.every(b => Object.keys(registry).includes(b.game) || b.game === 'trash'), 'every buff belongs to a real app: ' + BUFFS.map(b => b.game).join(', '));
ok(BUFFS.every(b => /^[A-Z][A-Z', ]+$/.test(b.name) && b.text.length > 10), 'each has a name and a sentence, for the game that has it to use');
ok(puzzleBuffs.map(b => PUZZLES.find(p => p.id === b.by.puzzle).stars).every(s => s >= 1), 'they sit on puzzles of every kind: ' + puzzleBuffs.map(b => PUZZLES.find(p => p.id === b.by.puzzle).stars + '*').join(' '));

console.log('\n-- unaided --');
ok(unaided({ solved: true, seen: false, helped: false }) && unaided({ solved: true, seen: false }), 'solved, nothing shown: unaided (and a puzzle kept before hints were tracked is too)');
ok(!unaided({ solved: true, seen: true }) && !unaided({ solved: true, seen: false, helped: true }) && !unaided({ solved: false }) && !unaided(null), 'the answer seen, a hint opened, not solved, or nothing: not');
ok(earnedBy({ puzzles: { n_change: { solved: true, seen: false, helped: false } } }).join() === 'magen_money', 'the right puzzle earns the right buff');
ok(earnedBy({ puzzles: { n_change: { solved: true, helped: true }, p_disc: { solved: true } } }).join() === 'jager_coaster', 'a hint opened on one does not stop the one that was unaided');
ok(earnedBy({ shop: { clock: true, notes: true } }).sort().join() === 'bekkedal_bag,stack_lab', 'the workshop earns its two');
ok(earnedBy({}).length === 0 && earnedBy(null).length === 0, 'nothing earned, nothing given');

console.log('\n-- the book --');
{
  let store = null, said = [];
  const book = createBuffs({ get: () => store, set: v => { store = v; } }, (b, quiet, k) => said.push([b && b.id, quiet, k]));
  ok(!book.has('magen_money') && book.list().length === 0, 'empty at first');
  ok(book.grant('magen_money') && !book.grant('magen_money') && book.has('magen_money'), 'granted once, never twice');
  ok(!book.grant('no_such_buff'), 'a buff that does not exist cannot be given');
  const again = createBuffs({ get: () => store, set: v => { store = v; } });
  ok(again.has('magen_money') && again.list().join() === 'magen_money', 'kept across a restart');
  said = [];
  const k = book.sync({ puzzles: { n_change: { solved: true }, w_shout: { solved: true }, s_dice: { solved: true, helped: true } } });
  ok(k === 1 && book.has('notes_fonts') && !book.has('battle_pose'), 'a sync gives what is new and only that');
  ok(said.some(x => x[0] === 'notes_fonts') && said.some(x => x[0] === null && x[2] === 1), 'each gain is told, and the batch is told once, with how many');
  said = []; book.sync({ puzzles: { l_endless: { solved: true } } }, true);
  ok(said.every(x => x[1] === true), 'a quiet sync is quiet');
  ok(LINES.length >= 5 && LINES.every(l => !BUFFS.some(b => l.toUpperCase().includes(b.game.toUpperCase()) || l.toUpperCase().includes(b.name))), 'the words said when one arrives name no game and no buff');
  book.forget(); ok(book.list().length === 0, 'and it can be forgotten');
}

console.log('\n-- the workshop --');
{
  const clock = 'I64 n = 0;\nU0 Tick() {\n  n++;\n  SetText("t", "" + n);\n}\nLabel("t", "0");\nButton("GO", "Tick");\nEvery(1000, "Tick");\nPrint("ready\\n");\n';
  const piano = 'U0 Play(I64 k) {\n  Note(60 + k, 200);\n}\nI64 i;\nfor (i = 0; i < 8; i++) {\n  Play(i);\n}\nPrint("done\\n");\nPrint("again\\n");\n';
  ok(workshopFlags(clock, TEMPLATES, true).clock && !workshopFlags(clock, TEMPLATES, true).notes, 'a button and a clock, written from scratch, run clean: the first');
  ok(workshopFlags(piano, TEMPLATES, true).notes && !workshopFlags(piano, TEMPLATES, true).clock, 'a program that plays notes: the second');
  ok(!workshopFlags(clock, TEMPLATES, false).clock && !workshopFlags(piano, TEMPLATES, false).notes, 'neither if it did not run clean');
  ok(!workshopFlags('Note(60, 200);\n', TEMPLATES, true).notes, 'a line is not a program');
  ok(TEMPLATES.every(t => fromTemplate(t.code, TEMPLATES)), 'every template is a template');
  ok(TEMPLATES.every(t => { const f = workshopFlags(t.code, TEMPLATES, true); return !f.clock && !f.notes; }), 'and none of them earns anything, whatever it uses');
  const t0 = TEMPLATES.find(t => /Note\(/.test(t.code) || /Every\(/.test(t.code)) || TEMPLATES[0];
  const tweaked = t0.code.replace(/"([^"]{2,12})"/, '"changed"');
  ok(fromTemplate(tweaked, TEMPLATES) && !workshopFlags(tweaked, TEMPLATES, true).clock && !workshopFlags(tweaked, TEMPLATES, true).notes, 'a template with a few words changed is still a template');
}
console.log(bad ? bad + ' FAILED' : 'all ' + n + ' ok');
process.exit(bad ? 1 : 0);
