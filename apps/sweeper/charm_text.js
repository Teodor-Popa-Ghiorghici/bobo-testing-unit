/* What a charm says at a bench. The blurbs in data.js are the plain rule; the numbers in them were true in the first act and are not under it:
   the Underdeep's rooms take a share of the soul an opened tile gives (`soulK`), charge more for the spells (`spellK`) and take two or three masks
   for a larva (`hit`), and only some rooms are cold or dark. So a charm is described *for the bench you are sitting at*, from the same fields run.js
   reads, and says so when it would do nothing in this zone. Pure: `node apps/sweeper/charm_text_check.js`. */
import { GRUB_SOUL, modsOf } from './data.js';

const scaled = (base, k) => Math.round(base * (k || 1));
const zoneHas = (rg, m) => rg.nodes.some(n => modsOf(n).indexOf(m) >= 0);      /* a node's `mod` is already its region's unless it has its own */
export const zoneOf = rg => ({
  soulK: rg.soulK || 1, spellK: rg.spellK || 1,
  hit: Math.max.apply(null, rg.nodes.map(n => n.hit || 1)),
  cold: zoneHas(rg, 'cold'), dark: zoneHas(rg, 'lantern'), under: rg.act === 2
});

/* the blurb for charm `c` as it stands in region `rg`; `notes` are things worth knowing that belong under it */
export function charmText(c, rg) {
  const z = zoneOf(rg), notes = [];
  let text = c.text;
  switch (c.id) {
    case 'quick': text = 'Focus costs ' + scaled(22, z.spellK) + ' soul, not ' + scaled(33, z.spellK) + '.'; break;
    case 'deep':  text = 'Focus mends two masks, for ' + scaled(44, z.spellK) + ' soul.'; break;
    case 'grubsong': text = 'Being hurt gives ' + scaled(GRUB_SOUL, z.soulK) + ' soul.'; break;
    case 'catcher': text = 'Opened tiles give half again as much soul' + (z.soulK < 1 ? ', of the share this place lets through.' : '.'); break;
    case 'ward':
      text = 'A larva hurts for one mask less, and never for less than one.';
      notes.push(z.hit > 1 ? 'HERE A LARVA TAKES UP TO ' + z.hit + ' MASKS; THE WARD TAKES ONE OFF EACH.' : 'IT SAVES NOTHING WHERE A LARVA TAKES ONE MASK. IT IS FOR THE UNDERDEEP.');
      break;
    case 'ember':
      notes.push(z.cold ? 'THE COLD IS HERE.' : 'NO COLD IN THIS ZONE: IT WORKS IN THE COLD FORGE, AND THE HALL AND KING OF THE PALE COURT.');
      break;
    case 'lens':
      notes.push(z.dark ? 'THE DARK IS HERE.' : 'NOTHING IS DARK IN THIS ZONE: IT WORKS WHERE A LANTERN IS NEEDED.');
      break;
    case 'compass':
      text = 'Row and column tallies of mines still loose. Not sold: found, by a perfect clear of every room of the descent. The Underdeep does not count.';
      break;
    default: break;
  }
  if (z.under && c.id === 'catcher') notes.push('THE UNDERDEEP GIVES ' + Math.round(z.soulK * 100) + '% OF THE SOUL.');
  return { text, notes };
}
