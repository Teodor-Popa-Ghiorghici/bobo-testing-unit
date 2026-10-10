/* What the workshop notices about a program that is installed, for the buffs HOLYC.EXE hides (kernel/buffs_core.js). Pure; node apps/holyc/buffs_check.js holds it.
   A program counts only if it was written, not borrowed: at least a few lines, and not a template with a few words changed (more than six lines in ten the same as one template's lines).
   What it must do is a thing a person would plausibly do on their own: a small app with a button and a clock in it, or a program that plays notes. It must also have run clean. */
import { stripped } from './engine.js';

const MIN_LINES = 6, BORROWED = 0.6;
const lines = s => String(s).split('\n').map(l => l.trim()).filter(l => l && l !== '{' && l !== '}');

/* is this (mostly) one of the templates? */
export function fromTemplate(src, templates) {
  const mine = lines(src);
  if (!mine.length) return true;
  return templates.some(t => { const theirs = new Set(lines(t.code)); return mine.filter(l => theirs.has(l)).length / mine.length > BORROWED; });
}

/* { clock, notes }: which of the two the installed program earns (both false if it was not written from a blank page or did not run clean) */
export function workshopFlags(src, templates, ranClean) {
  const none = { clock: false, notes: false };
  if (!ranClean || lines(src).length < MIN_LINES || fromTemplate(src, templates)) return none;
  const s = stripped(src);
  return { clock: /\bButton\s*\(/.test(s) && /\bEvery\s*\(/.test(s), notes: /\bNote\s*\(/.test(s) };
}
