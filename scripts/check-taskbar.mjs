/* node scripts/check-taskbar.mjs: the taskbar's choices (kernel/taskbar_model.js): which picture a window's button wears, what a right click lists, and SHOW THE DESKTOP puts away what is showing and brings back
   exactly that, and nothing that was closed or opened since. (pure Node) */
import { spriteKind, menuFor, deskPlan } from '../kernel/taskbar_model.js';

let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log('FAIL: ' + m); } };

/* pictures */
ok(spriteKind('folder')[0] === 'folder' && spriteKind('editor')[0] === 'code' && spriteKind('viewer')[0] === 'image' && spriteKind('terminal')[0] === 'terminal' && spriteKind('trash')[0] === 'bin', 'file-like apps wear their file\'s picture');
ok(spriteKind('magen').join() === 'app,magen' && spriteKind('hifi').join() === 'app,hifi', 'a game wears its own');
ok(spriteKind(null).join() === 'app,' && spriteKind(undefined)[0] === 'app', 'a window with no app yet still has one');

/* the menu */
const labels = st => menuFor(st).map(i => i.sep ? '-' : i.label).join('|');
ok(labels({ hidden: true }) === 'RESTORE|FULLSCREEN|-|CLOSE', 'put away: ' + labels({ hidden: true }));
ok(labels({ hidden: false, active: true }) === 'MINIMISE|FULLSCREEN|-|CLOSE', 'in front: ' + labels({ hidden: false, active: true }));
ok(labels({ hidden: false, active: false }) === 'BRING TO FRONT|MINIMISE|FULLSCREEN|-|CLOSE', 'behind: ' + labels({ hidden: false, active: false }));
ok(menuFor({}).every(i => i.sep || i.act), 'every entry does something');

/* show the desktop */
const A = { n: 'A' }, B = { n: 'B' }, C = { n: 'C' }, D = { n: 'D' };
let p = deskPlan([{ rec: A, hidden: false }, { rec: B, hidden: true }, { rec: C, hidden: false }], []);
ok(p.minimize.length === 2 && p.minimize[0] === A && p.minimize[1] === C && !p.restore.length, 'puts away the two that are showing, not the one already away');
ok(p.stash.length === 2, 'remembers them');
let q = deskPlan([{ rec: A, hidden: true }, { rec: B, hidden: true }, { rec: C, hidden: true }], p.stash);
ok(q.restore.length === 2 && q.restore[0] === A && q.restore[1] === C && !q.minimize.length, 'the next press brings back those two and not B');
ok(q.stash.length === 0, 'and forgets them');
q = deskPlan([{ rec: A, hidden: true }, { rec: B, hidden: true }, { rec: D, hidden: true }], p.stash);
ok(q.restore.length === 1 && q.restore[0] === A, 'one that was closed meanwhile is not brought back (' + q.restore.length + ')');
q = deskPlan([{ rec: A, hidden: true }, { rec: B, hidden: true }], []);
ok(!q.restore.length && !q.minimize.length, 'nothing put away, nothing showing: nothing to do');
q = deskPlan([], null); ok(!q.restore.length && !q.minimize.length, 'no windows at all');
/* a window opened after the desktop was shown: the next press puts it away too, and the old stash is replaced */
q = deskPlan([{ rec: A, hidden: true }, { rec: D, hidden: false }], p.stash);
ok(q.minimize.length === 1 && q.minimize[0] === D && q.stash.length === 1 && q.stash[0] === D, 'a new window showing: the press puts it away');

console.log(bad ? bad + ' FAILED' : 'check-taskbar: ok');
process.exit(bad ? 1 : 0);
