import { createWindow, raise } from '../../kernel/wm.js';
import { godDoodle, godWords } from '../../kernel/god.js';

export default {
  id: 'goddoodle',
  title: 'GodDoodle',
  width: 380,
  height: 320,
  resizable: false,
  mount(root, ctx) {
    let cv = null;
    const pane = document.createElement('div');
    pane.className = 'imgpane godpane';
    cv = document.createElement('canvas');
    cv.width = 256; cv.height = 192;
    cv.className = 'godcv';
    pane.appendChild(cv);
    const bar = document.createElement('div');
    bar.className = 'appbar';
    const again = document.createElement('button');
    again.className = 'appbtn';
    again.textContent = 'ASK AGAIN';
    const word = document.createElement('span');
    word.className = 'godword';
    
    const roll = () => {
      godDoodle(cv);
      word.textContent = godWords(3).join(' ');
      if (window.Snd && window.Snd.holy) window.Snd.holy();
    };
    
    again.addEventListener('mousedown', ev => { ev.stopPropagation(); roll(); });
    bar.appendChild(again);
    bar.appendChild(word);
    root.appendChild(pane);
    root.appendChild(bar);
    
    roll();
  }
};
