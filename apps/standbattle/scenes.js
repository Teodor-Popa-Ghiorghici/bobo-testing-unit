/* Title and run-complete screens. */
import { PAL } from './data.js';

export function drawTitle(g, W, H, tsec, cleared) {
  g.fillStyle = PAL.black;
  g.fillRect(0, 0, W, H);
  const pulse = 0.6 + 0.4 * Math.sin(tsec * 2);
  g.textAlign = 'center';
  g.fillStyle = PAL.magenta;
  g.font = '10px monospace';
  g.fillText('A JOJO ROGUELIKE PROTOTYPE', W / 2, H / 2 - 40);
  g.fillStyle = PAL.lmagenta;
  g.font = '22px monospace';
  g.fillText('STAND BATTLE ARENA', W / 2, H / 2 - 12);
  g.fillStyle = PAL.yellow;
  g.font = '10px monospace';
  g.globalAlpha = pulse;
  g.fillText('CLICK TO BEGIN — MORIOH', W / 2, H / 2 + 20);
  g.globalAlpha = 1;
  g.fillStyle = PAL.gray;
  g.font = '9px monospace';
  g.fillText('JOTARO KUJO — STAR PLATINUM', W / 2, H / 2 + 42);
  if (cleared) {
    g.fillStyle = PAL.lgreen;
    g.fillText('MORIOH: CLEARED', W / 2, H / 2 + 60);
  }
  g.textAlign = 'left';
}

export function drawComplete(g, W, H, runState) {
  g.fillStyle = PAL.black;
  g.fillRect(0, 0, W, H);
  g.textAlign = 'center';
  g.fillStyle = PAL.lgreen;
  g.font = '16px monospace';
  g.fillText('MORIOH IS QUIET AGAIN.', W / 2, H / 2 - 10);
  g.fillStyle = PAL.white;
  g.font = '10px monospace';
  g.fillText('KILLER QUEEN HAS BEEN STOPPED.', W / 2, H / 2 + 12);
  g.fillStyle = PAL.gray;
  g.font = '9px monospace';
  g.fillText('CLICK TO RETURN TO THE TITLE', W / 2, H / 2 + 36);
  g.textAlign = 'left';
}
