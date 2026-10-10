/* The sounds of eating (apps/elephant/eat_seq.js says when). All of them low and soft, through the machine's SFX bus: a sniff, a footfall, the trunk touching and taking the wedge, the
   air as it swings up, the piece going in, a crunch for each of the six chews, the swallow, and a pleased rumble. `Snd` is the machine's speaker. */
export function eatSound(Snd, ev, i) {
  switch (ev) {
    case 'sniff':   Snd.noise(150, { freq: 1100, q: 0.9, vol: 0.03 }); Snd.tone(170, 120, { type: 'triangle', to: 260, vol: 0.012 }); break;
    case 'step':    Snd.tone(58, 120, { type: 'triangle', to: 44, vol: 0.05 }); break;
    case 'touch':   Snd.noise(70, { freq: 700, q: 1.2, vol: 0.035 }); break;
    case 'take':    Snd.tone(300, 90, { type: 'sine', to: 520, vol: 0.03 }); Snd.noise(40, { freq: 2000, q: 2, vol: 0.02 }); break;
    case 'whoosh':  Snd.noise(420, { freq: 600, q: 0.5, vol: 0.025 }); break;
    case 'nom':     Snd.tone(196, 110, { type: 'triangle', vol: 0.035 }); Snd.noise(50, { freq: 900, q: 1, vol: 0.03 }); break;
    case 'chew':    Snd.noise(70, { freq: 520 + (i % 2) * 180, q: 1.4, vol: 0.05 }); Snd.tone(118 + (i % 3) * 12, 60, { type: 'triangle', vol: 0.02 }); break;
    case 'swallow': Snd.tone(140, 220, { type: 'sine', to: 70, vol: 0.05 }); break;
    case 'ahh':     Snd.tone(220, 380, { type: 'triangle', to: 180, vol: 0.025 }); Snd.tone(110, 500, { type: 'sine', vol: 0.03, delay: 0.05 }); break;
    default: break;
  }
}
