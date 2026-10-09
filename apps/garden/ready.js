/* GARDEN — a plant that has just filled with SUN says so, quietly: `ring()` is called when a pot of the room you are in goes from nothing to something, at most once every two
   seconds, and never for what was already full when you looked. */
export function createReadyChime(pots, active, ring, gap = 2000) {
  const was = {}; let at = -1e9;
  return nowMs => {
    pots().forEach((p, i) => {
      const key = active() + ':' + i, full = !!(p && p.tok > 0);
      if (full && was[key] === false && nowMs - at > gap) { at = nowMs; ring(); }
      was[key] = full;
    });
  };
}
