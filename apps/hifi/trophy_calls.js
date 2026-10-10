/* Where TheStack tells the trophies what happened (the list is trophies.js). A disc heard out is one that was really listened to: the time it played for, not the position of the needle,
   has to be most of its length, so scrubbing to the end does not count. None of it can throw into the app. */
import { trophies } from '../trophy_scope.js';

const TR = trophies('hifi');
const guard = f => { try { return f(); } catch (e) { return undefined; } };

export function createCalls() {
  let key = null, secs = 0;
  return {
    /* once a frame: the disc that is on, and whether it is playing */
    tick(dt, playing, discKey) { if (discKey !== key) { key = discKey; secs = 0; } if (playing) secs += dt; },
    /* a folder of your own is not one of the games' folders, and a disc of yours is yours wherever you filed it */
    play(t) { guard(() => TR.emit('play', { folder: t.builtin ? t.folder || null : null, own: !t.builtin && !t.spec })); },
    /* the disc has run out (or is crossfading into the next one): told only if most of it was played, not scrubbed to */
    ended(dur) { guard(() => { if (dur > 0 && secs >= dur * 0.6) TR.emit('ended', {}); }); },
    /* the STYLE METER folder is earned, not one of the library's own, so it is not one of the folders to look in */
    folder: name => guard(() => { if (name !== 'STYLE METER') TR.mark('folders', name); }),
    preset: n => guard(() => TR.mark('presets', String(n)))
  };
}
