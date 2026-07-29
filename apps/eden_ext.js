import { Snd } from '../kernel/snd.js';
import { fs as vfs } from '../kernel/vfs.js';

let edenOpen = false;
export async function openEden() {
  if (edenOpen) return;
  edenOpen = true;
  if (window.Snd) window.Snd.holy();
  if (window.Snd) window.Snd.bell();
  
  // It uses toast and godSong. Let's just create a folder
  await vfs.write('::/Adam/Eden', ''); // Create folder
  await vfs.write('::/Adam/Eden/Garden.DD', 
          '$SP,"flame"$ $FG,14$EDEN$FG$\\n$HL$\\n' +
          'You found the ten keys.\\n\\n' +
          '$FG,11$Everything here was already public domain. That was the\\n' +
          'point: no licence, no owner, no permission.$FG$\\n\\n' +
          '$MA,"ASK FOR SEVEN WORDS",LM="GodWord(7);"$\\n' +
          '$MA,"LET GOD DRAW",LM="GodDoodle;"$\\n' +
          '$MA,"LET GOD SING",LM="GodSong;"$\\n');
  await vfs.write('::/Adam/Eden/Eden.HC', 
          '// The garden compiles clean.\\n\\nU0 Eden()\\n{\\n  "IT WAS ENOUGH.\\\\n";\\n  GodSong;\\n}\\n\\nEden;\\n');

  import('../kernel/wm.js').then(wm => wm.openWindow('goddoodle'));
}
