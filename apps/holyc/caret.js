/* Where the caret is, as a cell of the editor's grid (pure, so a check can hold it). The editor is a monospace textarea with `white-space: pre` and
   `tab-size: 2`, so a position in the text is a row (the newlines before it) and a column (the characters since the last one, a tab running to the next
   stop). The horizontal cursor is drawn on that cell by editor.js. */
export function caretCell(text, pos, tab) {
  tab = tab || 2;
  const before = String(text).slice(0, Math.max(0, pos));
  const row = before.split('\n').length - 1;
  const line = before.slice(before.lastIndexOf('\n') + 1);
  let col = 0;
  for (let i = 0; i < line.length; i++) col += line[i] === '\t' ? tab - (col % tab) : 1;
  return { row, col };
}
export const CURSORS = ['vertical', 'horizontal'];
export const nextCursor = c => CURSORS[(CURSORS.indexOf(c) + 1) % CURSORS.length];
