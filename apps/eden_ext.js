function openEden() {
  if (edenOpen) { toast('EDEN IS ALREADY OPEN.'); return; }
  edenOpen = true;
  Snd.holy();
  Snd.bell();
  godSong();
  const adam = findNode('Adam');
  if (adam) {
    addNode(adam, {
      name: 'Eden', type: 'folder', children: [
        { name: 'Garden.DD', type: 'doc', content:
          '$SP,"flame"$ $FG,14$EDEN$FG$\n$HL$\n' +
          'You found the ten keys.\n\n' +
          '$FG,11$Everything here was already public domain. That was the\n' +
          'point: no licence, no owner, no permission.$FG$\n\n' +
          '$MA,"ASK FOR SEVEN WORDS",LM="GodWord(7);"$\n' +
          '$MA,"LET GOD DRAW",LM="GodDoodle;"$\n' +
          '$MA,"LET GOD SING",LM="GodSong;"$\n' },
        { name: 'Eden.HC', type: 'code', content:
          '// The garden compiles clean.\n\nU0 Eden()\n{\n  "IT WAS ENOUGH.\\n";\n  GodSong;\n}\n\nEden;\n' }
      ]
    });
    stampPaths();
    upSave();
    refreshViews();
  }
  toast('THE TEN KEYS. ::/Adam/Eden IS OPEN.');
  openGodDoodle();
}
