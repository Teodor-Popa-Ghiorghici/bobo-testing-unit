import { createWindow, raise, sysDialog } from '../../kernel/wm.js';
import { Snd } from '../../kernel/snd.js';
import { Cos, COS_CATS } from '../../kernel/cos.js';
import { FRAMES, CURSORS, SCHEMES, LOGOS } from '../../kernel/cos_data.js';
import { fs as vfs } from '../../kernel/vfs.js';

export default {
  open() {
  const f = Cos.find('frame', Cos.equipped('frame')) || FRAMES[0];
  const c = Cos.find('cursor', Cos.equipped('cursor')) || CURSORS[0];
  const s = Cos.find('scheme', Cos.equipped('scheme')) || SCHEMES[0];
  const l = Cos.find('logo', Cos.equipped('logo')) || LOGOS[0];
  const owned = Object.keys(COS_CATS).reduce((a, k) => a + Cos.owned(k).length, 0);
  const tot = Object.keys(COS_CATS).reduce((a, k) => a + COS_CATS[k].list.length, 0);
  sysDialog('ABOUT THIS MACHINE',
    'HOLYTRON DM-640\nTempleOS V5.03, public domain\n\n' +
    'CASE      ' + f.name + '\nPOINTER   ' + c.name + '\nPHOSPHOR  ' + s.name + '\nBOOT LOGO ' + l.name + '\n\n' +
    'SUN ON HAND   ' + window.Economy.balance() + '\nSUN EVER      ' + window.Economy.totals().earned + '\n' +
    'CATALOGUE     ' + owned + ' OF ' + tot + ' OWNED\n' +
    'PLANTED       ' + ((window.Garden && window.Garden.st.planted) || 0) + ' SEED(S)\n' +
    'BOARDS CLEARED ' + ((window.Sweeper && window.Sweeper.st.won) || 0) +
    '\nDEALS WON     ' + ((window.Solitaire && window.Solitaire.st.won) || 0) +
    '\nSHEETS DRAWN  ' + ((window.Crayon && window.Crayon.st.items.length) || 0) +
    '\n\nRING 0. NO USER MODE. NO NETWORK.', { w: 440, h: 470 });
  }
};