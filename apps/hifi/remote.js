/* THE STACK'S REMOTE: what the little control that stands on the desktop while the Stack is minimised (kernel/stack_hud.js) can ask of it, and what it can read. The Stack puts it on
   `window.StackRemote` while it is open and takes it away when it closes; with no Stack there is nothing to ask. A press here is exactly the press of the same button on the face (`press` is
   the face's own: previous goes back to the start of a disc after three seconds, repeat goes round off / all / one), so the two can never disagree. */
export const REPEAT_NAMES = ['OFF', 'ALL', 'ONE'];

/* the plain facts of the moment (pure: node scripts/check-stackhud.mjs reads it) */
export function describe(S) {
  const t = S.list[S.ix] || null;
  return {
    has: !!t, title: t ? t.name : 'NO DISC', artist: t ? (t.artist || '') : '', album: t ? (t.album || (t.builtin ? t.folder : '') || '') : '',
    playing: !!S.playing, pos: S.pos || 0, dur: S.dur || 0, vol: S.vol, repeat: S.repeat | 0, shuffle: !!S.shuffle,
    key: t ? t.name + '|' + t.artist + '|' + !!t.art + '|' + (t.artV || t.vault || '') : ''
  };
}

export function attachRemote(h) {
  const { S, press, seek, io, thumb } = h;
  const R = {
    state: () => describe(S),
    toggle: () => press('play'), prev: () => press('prev'), next: () => press('next'),
    repeat: () => press('repeat'), shuffle: () => press('shuffle'),
    seek: frac => { if (S.dur) { S.touched = true; seek(Math.max(0, Math.min(1, frac)) * S.dur); } },
    setVol: v => { S.vol = Math.max(0, Math.min(1, v)); io.saveSettings(); },
    thumb: cb => { const t = S.list[S.ix]; return t ? thumb(t, cb) : null; }
  };
  window.StackRemote = R;
  return () => { if (window.StackRemote === R) delete window.StackRemote; };
}
