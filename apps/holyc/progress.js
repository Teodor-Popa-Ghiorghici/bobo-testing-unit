/* What a person has done in HOLYC.EXE, kept by the app (ctx.save/ctx.load: this window's own key, never the trophies'): which lesson steps are done, which
   puzzles are solved (and whether the answer was looked at first), what has been paid, the half-written program of each puzzle, the programs saved in the
   workshop. Everything here is plain data, so a save from an older build of the lab reads back whole. */
const FRESH = () => ({ v: 1, lessons: {}, puzzles: {}, chapters: {}, drafts: {}, view: 'lessons', last: null, shop: {} });

export async function loadProgress(ctx) {
  let p = null;
  try { p = await ctx.load('progress'); } catch (e) { /* nothing saved */ }
  p = Object.assign(FRESH(), p && typeof p === 'object' ? p : {});
  let t = 0;
  const save = () => { clearTimeout(t); t = setTimeout(() => { try { ctx.save('progress', p).catch(() => {}); } catch (e) { /* storage full */ } }, 250); };
  const P = {
    data: p, save: save,
    lesson(id) { return p.lessons[id] || (p.lessons[id] = { done: [], skipped: [], paid: false }); },
    stepDone(lid, sid) { const l = P.lesson(lid); if (l.done.indexOf(sid) < 0) l.done.push(sid); l.skipped = l.skipped.filter(s => s !== sid); save(); },
    stepSkipped(lid, sid) { const l = P.lesson(lid); if (l.done.indexOf(sid) < 0 && l.skipped.indexOf(sid) < 0) l.skipped.push(sid); save(); },
    lessonComplete(lesson) { return P.lesson(lesson.id).done.length >= lesson.steps.length; },
    firstOpenStep(lesson) { const l = P.lesson(lesson.id); const i = lesson.steps.findIndex(s => l.done.indexOf(s.id) < 0); return i < 0 ? 0 : i; },
    puzzle(id) { return p.puzzles[id] || (p.puzzles[id] = { solved: false, seen: false, helped: false, tries: 0, paid: 0 }); },
    /* what the buffs (kernel/buffs_core.js) are worked out from: puzzles solved with nothing shown, and what the workshop has noticed */
    buffView() { return { puzzles: p.puzzles, shop: p.shop || {} }; },
    solved(id) { return !!(p.puzzles[id] && p.puzzles[id].solved); },
    draft(id, src) { if (src === undefined) return p.drafts[id]; p.drafts[id] = src; save(); return src; },
    setView(v) { p.view = v; save(); },
    count() { return { lessonSteps: Object.keys(p.lessons).reduce((n, k) => n + p.lessons[k].done.length, 0), puzzles: Object.keys(p.puzzles).filter(k => p.puzzles[k].solved).length }; }
  };
  return P;
}
