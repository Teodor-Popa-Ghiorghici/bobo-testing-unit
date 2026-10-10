/* Icons added after sprites.js filled up: the recycle bin (empty and full),
   a song file, and the Garage. Same rules as the rest: 16x16, flat rects. */
import { SPRITES } from './sprites.js';

const S = body => '<svg viewBox="0 0 16 16" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">' + body + '</svg>';
const R = (x, y, w, h, c) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + c + '"/>';

const can = R(3, 4, 10, 1, '#AAAAAA') + R(6, 3, 4, 1, '#AAAAAA') + R(4, 5, 8, 9, '#555555') + R(4, 5, 1, 9, '#AAAAAA') +
  R(6, 6, 1, 7, '#000000') + R(9, 6, 1, 7, '#000000') + R(11, 6, 1, 7, '#000000') + R(4, 14, 8, 1, '#000000');

/* the recycle dumpster (kernel/bin_look.js): a green skip, wider at the top, with a grey lid, ribs, a white recycling triangle on the front and two black wheels */
const skip = R(1, 4, 14, 1, '#AAAAAA') + R(1, 3, 14, 1, '#FFFFFF') + R(0, 3, 1, 2, '#000000') + R(15, 3, 1, 2, '#000000') + R(1, 5, 14, 8, '#005500') + R(2, 5, 12, 8, '#00AA00') +
  R(2, 5, 12, 1, '#55FF55') + R(5, 6, 1, 7, '#005500') + R(10, 6, 1, 7, '#005500') + R(2, 12, 12, 1, '#005500') + R(1, 13, 14, 1, '#000000') +
  R(7, 7, 2, 1, '#FFFFFF') + R(6, 8, 1, 1, '#FFFFFF') + R(9, 8, 1, 1, '#FFFFFF') + R(5, 9, 1, 1, '#FFFFFF') + R(10, 9, 1, 1, '#FFFFFF') + R(5, 10, 6, 1, '#FFFFFF') +
  R(3, 14, 3, 2, '#555555') + R(10, 14, 3, 2, '#555555') + R(4, 14, 1, 1, '#AAAAAA') + R(11, 14, 1, 1, '#AAAAAA');
Object.assign(SPRITES, {
  dumpster: S(skip),
  dumpsterfull: S(R(4, 0, 4, 3, '#FFFFFF') + R(8, 1, 3, 2, '#FFFF55') + R(10, 0, 2, 2, '#55FFFF') + R(12, 2, 2, 1, '#FF5555') + skip),
  /* the trophy box: a wooden crate with the handle of a gold cup showing over the top */
  trophybox: S(R(0, 0, 16, 16, '#000000') + R(5, 2, 6, 1, '#FFFF55') + R(4, 3, 8, 3, '#FFFF55') + R(10, 3, 2, 3, '#AA5500') + R(2, 6, 12, 8, '#AA5500') + R(2, 6, 12, 1, '#FF5555') +
    R(2, 9, 12, 1, '#552B00') + R(2, 12, 12, 1, '#552B00') + R(2, 6, 1, 8, '#552B00') + R(13, 6, 1, 8, '#552B00') + R(6, 7, 4, 2, '#FFFF55') + R(7, 7, 2, 1, '#000000')),
  bin: S(can),
  binfull: S(R(5, 1, 4, 3, '#FFFFFF') + R(9, 2, 3, 2, '#FFFF55') + R(7, 0, 2, 2, '#55FFFF') + can),
  song: S(R(2, 1, 11, 14, '#AAAAAA') + R(3, 2, 9, 12, '#FFFFFF') + R(6, 4, 4, 1, '#0000AA') + R(9, 4, 1, 6, '#0000AA') +
    R(6, 9, 3, 2, '#0000AA') + R(5, 10, 1, 1, '#0000AA') + R(4, 12, 7, 1, '#AA00AA')),
  garage: S(R(1, 6, 14, 9, '#000000') + R(1, 6, 14, 1, '#AAAAAA') + R(2, 7, 12, 7, '#FFFFFF') +
    R(3, 7, 1, 7, '#000000') + R(5, 7, 1, 7, '#000000') + R(7, 7, 1, 7, '#000000') + R(9, 7, 1, 7, '#000000') +
    R(11, 7, 1, 7, '#000000') + R(13, 7, 1, 7, '#000000') + R(2, 7, 1, 4, '#000000') + R(4, 7, 2, 4, '#000000') +
    R(8, 7, 2, 4, '#000000') + R(11, 7, 2, 4, '#000000') +
    R(10, 1, 1, 5, '#FFFF55') + R(7, 4, 3, 2, '#FFFF55') + R(11, 1, 3, 1, '#FFFF55') + R(13, 2, 1, 2, '#FFFF55'))
,
  /* the HolyC lab: a blue editor window with a yellow cursor and a green run triangle */
  holyc: S(R(1, 1, 14, 14, '#000000') + R(2, 2, 12, 12, '#0000AA') + R(2, 2, 12, 2, '#5555FF') + R(3, 5, 4, 1, '#FFFF55') + R(3, 7, 6, 1, '#55FFFF') +
    R(3, 9, 3, 1, '#FFFFFF') + R(3, 11, 5, 1, '#55FF55') + R(10, 8, 1, 5, '#55FF55') + R(11, 9, 1, 3, '#55FF55') + R(12, 10, 1, 1, '#55FF55'))
,
  /* the ledger: a gold cup on a black plate */
  trophy: S(R(0, 0, 16, 16, '#000000') + R(1, 3, 2, 1, '#FFFF55') + R(0, 4, 1, 3, '#FFFF55') + R(1, 7, 2, 1, '#FFFF55') + R(13, 3, 2, 1, '#FFFF55') + R(15, 4, 1, 3, '#FFFF55') + R(13, 7, 2, 1, '#FFFF55') +
    R(3, 1, 10, 7, '#FFFF55') + R(4, 8, 8, 1, '#FFFF55') + R(5, 9, 6, 1, '#FFFF55') + R(11, 2, 2, 6, '#AA5500') + R(4, 2, 1, 5, '#FFFFFF') + R(7, 10, 2, 3, '#FFFF55') + R(5, 13, 6, 2, '#AA5500') + R(5, 13, 6, 1, '#FFFF55')),
  /* the Bibel: an open book, brown cover, a gold ribbon, and a star over it for every faith at once */
  bibel: S(R(1, 5, 14, 10, '#000000') + R(2, 6, 6, 8, '#AAAAAA') + R(8, 6, 6, 8, '#FFFFFF') + R(3, 8, 4, 1, '#555555') + R(3, 10, 4, 1, '#555555') +
    R(9, 8, 4, 1, '#AAAAAA') + R(9, 10, 4, 1, '#AAAAAA') + R(7, 5, 2, 10, '#AA5500') + R(1, 14, 14, 1, '#AA5500') + R(7, 1, 2, 5, '#FFFF55') + R(6, 2, 4, 1, '#FFFF55') + R(5, 3, 6, 1, '#FFFF55'))
});
