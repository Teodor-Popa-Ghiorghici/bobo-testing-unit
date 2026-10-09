/* What The Stack decides when a disc is coming to its end, and what it keeps in memory. Pure: no audio, no window, so Node can play a long evening against it
   (keep_check.js). Two things used to stop the music after a while: the next disc was not always ready when the crossfade was due and the end of the disc then
   did nothing, and every disc ever played stayed decoded (a four-minute song is 85 MB) until the page ran out of memory and a decode failed. */

export const XFADE = 1.6;          /* seconds of overlap into the next disc */
export const PRELOAD = 90;         /* start reading the next disc this many seconds before the end of this one */
export const BUDGET = 300e6;       /* bytes of decoded audio kept besides the disc on and the one coming */

/* what to do now. 'xfade': cross into the next disc (it is ready); 'next': this one has run out, load the next; 'again': play this one over; 'stop': the shelf has run out */
export function plan({ playing, pos, dur, repeat, count, crossed, nextReady }) {
  if (!playing || !(dur > 0)) return 'none';
  const end = pos >= dur - 0.03;
  if (repeat === 2) return end ? 'again' : 'none';
  if (count <= 1) return end ? (repeat === 1 ? 'again' : 'stop') : 'none';
  if (end) return 'next';
  if (!crossed && nextReady && pos > dur - XFADE) return 'xfade';
  return 'none';
}

const bytes = t => t.buf ? t.buf.length * t.buf.numberOfChannels * 4 : 0;

/* which decoded discs to let go of: the oldest-used first, never one in `keep`, until what is held fits the budget */
export function evictions(tracks, keep, budget = BUDGET) {
  const held = tracks.filter(t => t.buf);
  let total = 0;
  held.forEach(t => { total += bytes(t); });
  const out = [];
  held.filter(t => keep.indexOf(t) < 0).sort((a, b) => (a.used || 0) - (b.used || 0)).forEach(t => {
    if (total > budget) { total -= bytes(t); out.push(t); }
  });
  return out;
}
