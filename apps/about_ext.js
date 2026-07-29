function openAbout() {
  const f = Cos.find('frame', Cos.equipped('frame')) || FRAMES[0];
  const c = Cos.find('cursor', Cos.equipped('cursor')) || CURSORS[0];
  const s = Cos.find('scheme', Cos.equipped('scheme')) || SCHEMES[0];
  const l = Cos.find('logo', Cos.equipped('logo')) || LOGOS[0];
  const owned = Object.keys(COS_CATS).reduce((a, k) => a + Cos.owned(k).length, 0);
  const tot = Object.keys(COS_CATS).reduce((a, k) => a + COS_CATS[k].list.length, 0);
  sysDialog('ABOUT THIS MACHINE',
    'HOLYTRON DM-640\nTempleOS V5.03, public domain\n\n' +
    'CASE      ' + f.name + '\nPOINTER   ' + c.name + '\nPHOSPHOR  ' + s.name + '\nBOOT LOGO ' + l.name + '\n\n' +
    'SUN ON HAND   ' + Economy.balance() + '\nSUN EVER      ' + Economy.totals().earned + '\n' +
    'CATALOGUE     ' + owned + ' OF ' + tot + ' OWNED\n' +
    'PLANTED       ' + (Garden.st.planted || 0) + ' SEED(S)\n' +
    'BOARDS CLEARED ' + Sweeper.st.won + '\nDEALS WON     ' + Solitaire.st.won + '\nSHEETS DRAWN  ' + Crayon.st.items.length +
    '\n\nRING 0. NO USER MODE. NO NETWORK.', { w: 440, h: 470 });
}
