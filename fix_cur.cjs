const fs = require('fs');
let code = fs.readFileSync('kernel/cos_data.js', 'utf8');
const curArrowStr = `const CUR_ARROW = [
  'X...........',
  'XX..........',
  'XOX.........',
  'XOOX........',
  'XOOOX.......',
  'XOOOOX......',
  'XOOOOOX.....',
  'XOOOOOOX....',
  'XOOOOOOOX...',
  'XOOOOXXXX...',
  'XOOXXOX.....',
  'XOX..XOX....',
  'XX....XOX...',
  'X......XX...'
];
const CUR_HANDMASK = [
  '...XX.......',
  '..XOOX......',
  '..XOOX......',
  '..XOOX......',
  '..XOOXXX....',
  '..XOOOOXX...',
  '.XXOOOOOXX..',
  'XOOXOOOOOXX.',
  'XOOXOOOOOOX.',
  'XOOOOOOOOOX.',
  'XOOOOOOOOOX.',
  '.XOOOOOOOOX.',
  '..XOOOOOOX..',
  '...XOOOOXX..'
];
`;
code = code.replace(/export const CURSORS = \[/, curArrowStr + '\nexport const CURSORS = [');
fs.writeFileSync('kernel/cos_data.js', code);
