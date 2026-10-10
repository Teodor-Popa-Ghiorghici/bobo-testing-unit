/* node scripts/check-stackhud.mjs: the control that stands on the desktop while THE STACK is minimised (kernel/stack_hud.js): when it is wanted, its three sizes and where each can stand, what is
   remembered, a media key's meaning, a pointer's place on a bar, and the Stack's remote (apps/hifi/remote.js) against a fake player: the face's own buttons, and nothing of the discs is changed. (pure Node) */
import * as M from '../kernel/stack_hud_model.js';
import { describe, attachRemote, REPEAT_NAMES } from '../apps/hifi/remote.js';

let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log('FAIL: ' + m); } };
const mem = () => { const d = {}; return { getItem: k => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); } }; };

/* when */
ok(M.wanted([{ appId: 'hifi', minimised: true }]), 'a minimised Stack: shown');
ok(!M.wanted([{ appId: 'hifi', minimised: false }]), 'an open Stack: not shown');
ok(!M.wanted([{ appId: 'magen', minimised: true }]), 'another app put away: not shown');
ok(!M.wanted([]) && !M.wanted(null), 'no windows: not shown');
ok(M.wanted([{ appId: 'magen', minimised: false }, { appId: 'hifi', minimised: true }]), 'among others');

/* three sizes, each bigger than the last, in a cycle */
ok(M.SIZES.join() === 's,m,l', 'three sizes');
ok(M.BOX.s.w < M.BOX.m.w && M.BOX.m.w < M.BOX.l.w && M.BOX.s.h < M.BOX.m.h && M.BOX.m.h < M.BOX.l.h, 'each size is bigger');
ok(M.nextSize('s') === 'm' && M.nextSize('m') === 'l' && M.nextSize('l') === 's', 'the cycle');
ok(M.nextSize('??') === 'm', 'an unknown size goes to medium');

/* it is remembered; a damaged note is the default: medium, in the bottom right corner above the taskbar */
const io = mem();
ok(M.load(io).size === 'm' && M.load(io).right === M.MARGIN && M.load(io).bottom === M.TASKBAR + M.MARGIN, 'default: bottom right corner, above the taskbar');
M.save({ size: 'l', right: 40, bottom: 90 }, io);
const back = M.load(io); ok(back.size === 'l' && back.right === 40 && back.bottom === 90, 'round trip');
io.setItem(M.KEY, '{bad'); ok(M.load(io).size === 'm', 'a damaged note is the default');
io.setItem(M.KEY, JSON.stringify({ size: 'xl', right: 'a' })); ok(M.load(io).size === 'm' && M.load(io).right === M.MARGIN, 'nonsense is the default');
ok(M.load({ getItem: () => { throw new Error('no storage'); } }).size === 'm', 'no storage: the default');

/* where it can stand: all of it on the glass, above the taskbar, under the menu bar */
const shell = { w: 1000, h: 700 };
for (const s of M.SIZES) {
  const b = M.BOX[s];
  for (const p of [{ right: -50, bottom: -50 }, { right: 5000, bottom: 5000 }, { right: 8, bottom: 33 }, { right: 400.6, bottom: 300.2 }]) {
    const c = M.clampPos(p, s, shell);
    ok(c.right >= 0 && c.right + b.w <= shell.w, s + ': inside the glass sideways ' + JSON.stringify(c));
    ok(c.bottom >= M.TASKBAR && c.bottom + b.h <= shell.h - 24, s + ': above the taskbar, under the menu bar ' + JSON.stringify(c));
    ok(Number.isInteger(c.right) && Number.isInteger(c.bottom), s + ': whole pixels');
  }
}
const home = M.clampPos({ right: M.MARGIN, bottom: M.TASKBAR + M.MARGIN }, 'm', shell);
ok(home.right === M.MARGIN && home.bottom === M.TASKBAR + M.MARGIN, 'the default place is not moved');
const tiny = M.clampPos({ right: 8, bottom: 33 }, 'l', { w: 300, h: 200 });
ok(Number.isFinite(tiny.right) && Number.isFinite(tiny.bottom), 'a glass smaller than the control does not break it');

/* the bar, the clock, the keys */
ok(M.fracAt(150, 100, 200) === 0.25 && M.fracAt(0, 100, 200) === 0 && M.fracAt(999, 100, 200) === 1 && M.fracAt(5, 5, 0) === 0, 'a place on a bar');
ok(M.mmss(0) === '0:00' && M.mmss(61.9) === '1:01' && M.mmss(NaN) === '0:00' && M.mmss(3599) === '59:59', 'the clock');
ok(M.KEYS.MediaPlayPause === 'toggle' && M.KEYS.MediaTrackNext === 'next' && M.KEYS.MediaTrackPrevious === 'prev' && !M.KEYS.a, 'media keys');
ok(M.RPT.length === 3 && M.rptShort(2) === 'RP1' && M.rptShort(1) === 'RPT' && REPEAT_NAMES.length === 3, 'repeat names');

/* the remote against a fake player */
global.window = {}; global.CustomEvent = class {};
const list = [{ name: 'LAMPLIGHT', artist: 'SOLITAIRE', album: '', builtin: true, folder: 'SOLITAIRE', art: null }, { name: 'FELT', artist: 'SOLITAIRE', album: 'TABLE', art: 1, artV: 'v1' }];
const S = { list, ix: 0, playing: false, pos: 12, dur: 100, vol: 0.5, repeat: 0, shuffle: false, touched: false };
const log = []; let saved = 0, sought = null;
const press = id => { log.push(id); if (id === 'play') S.playing = !S.playing; if (id === 'repeat') S.repeat = (S.repeat + 1) % 3; if (id === 'shuffle') S.shuffle = !S.shuffle; };
const snapshot = JSON.stringify(list);
const off = attachRemote({ S, press, seek: t => { sought = t; }, io: { saveSettings: () => { saved++; } }, thumb: (t, cb) => 'url:' + t.name });
const R = window.StackRemote;
ok(!!R, 'the remote is put up');
let s = R.state();
ok(s.title === 'LAMPLIGHT' && s.artist === 'SOLITAIRE' && s.album === 'SOLITAIRE' && s.has && !s.playing && s.dur === 100 && s.vol === 0.5, 'state: ' + JSON.stringify(s));
R.toggle(); ok(R.state().playing && log.join() === 'play', 'play is the face\'s own play');
R.next(); R.prev(); ok(log.join() === 'play,next,prev', 'next and previous are the face\'s own');
R.repeat(); R.repeat(); R.repeat(); ok(R.state().repeat === 0 && log.filter(x => x === 'repeat').length === 3, 'repeat goes round: off, all, one, off');
R.shuffle(); ok(R.state().shuffle, 'shuffle');
R.setVol(2); ok(S.vol === 1 && saved === 1, 'volume clamped to 1 and kept'); R.setVol(-1); ok(S.vol === 0, 'volume clamped to 0');
R.seek(0.5); ok(sought === 50 && S.touched, 'a seek is a fraction of the disc'); R.seek(9); ok(sought === 100, 'a seek past the end is the end');
ok(R.thumb(() => {}) === 'url:LAMPLIGHT', 'the cover of the disc that is on');
S.ix = 1; ok(R.state().key.indexOf('v1') >= 0 && R.state().album === 'TABLE', 'the next disc: its own key and album');
S.ix = -1; ok(!R.state().has && R.state().title === 'NO DISC' && R.thumb(() => {}) === null, 'no disc: said so, no cover');
S.dur = 0; sought = null; R.seek(0.5); ok(sought === null, 'no seek with nothing to seek in');
ok(JSON.stringify(list) === snapshot, 'nothing here writes to a disc');
off(); ok(!window.StackRemote, 'taken away when the Stack closes');
const off1 = attachRemote({ S, press, seek() {}, io: { saveSettings() {} }, thumb: () => null }), off2 = attachRemote({ S, press, seek() {}, io: { saveSettings() {} }, thumb: () => null });
const second = window.StackRemote; off1(); ok(window.StackRemote === second, 'a stale detach does not take a newer remote away'); off2(); ok(!window.StackRemote, 'and the newer one takes its own away');
ok(describe({ list: [], ix: -1 }).title === 'NO DISC', 'an empty shelf');

console.log(bad ? bad + ' FAILED' : 'check-stackhud: ok');
process.exit(bad ? 1 : 0);
