/* THE FOLDER A MASTERED GAME LEAVES ON THE DESKTOP. When a game's mastery seal is earned (`mastery_<game>`), a folder appears on the desktop with every picture the game
   is made of in it, as real files (PNG, enlarged where they are tiny; the programs of HOLYC.EXE as .HC): the props, in case they are wanted somewhere else. Each game says what
   its props are in `apps/<id>/props.js` (apps/prop_kit.js is how); this is the one place that turns that list into files.
   It is made once (templeos.props.v1 remembers which): a folder that is deleted goes to the bin like anything else, and is not made again behind your back. `makeProps(game)` is also
   what `PROPS <GAME>` in the terminal asks for, to make it again by hand. A mastery earned before this existed is found when the ledger loads (`sync`). */
import { fs } from './vfs.js';
import './vfs_ops.js';
import { render } from '../apps/prop_kit.js';
import { handedOver } from './handed.js';

const KEY = 'templeos.props.v1';
export const GAMES = {
  sweeper: () => import('../apps/sweeper/props.js'), solitaire: () => import('../apps/solitaire/props.js'), aftere: () => import('../apps/aftere/props.js'),
  garden: () => import('../apps/garden/props.js'), cook: () => import('../apps/cook/props.js'), magen: () => import('../apps/magen/props.js'),
  standbattle: () => import('../apps/standbattle/props.js'), bekkedal: () => import('../apps/bekkedal/props.js'), bottle: () => import('../apps/bottle/props.js'),
  holyc: () => import('../apps/holyc/props.js')
};
/* what each game's folder is called and what it holds, without loading the game's art (the ledger lists them locked): kept equal to each props.js by `node scripts/check-props.mjs` */
export const FOLDER_OF = {
  sweeper: ['SweeperProps', 'DUNGEON SWEEPER'], solitaire: ['SolitaireProps', 'SOLITAIRE'], aftere: ['AftereProps', 'AFTEREGYPT'], garden: ['GardenProps', 'THE GARDEN'],
  cook: ['CookProps', 'THE COOK'], magen: ['MagenProps', 'MAGEN'], standbattle: ['StandBattleProps', 'STAND BATTLE ARENA'], bekkedal: ['BekkedalProps', 'BEKKEDAL'],
  bottle: ['BottleProps', 'THE BOTTLE'], holyc: ['HolyCPrograms', 'HOLYC.EXE']
};
const made = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
const remember = (game, n) => { const m = made(); m[game] = n; try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) { /* made for this sitting */ } };
const say = t => { try { import('./wm.js').then(w => w.toast(t)); } catch (e) { /* no toast */ } };
const changed = dir => { try { window.dispatchEvent(new CustomEvent('vfs-changed', { detail: { dir: dir } })); } catch (e) { /* no window */ } };

/* the type a file is stored as, from its name */
const typeOf = name => /\.HC$/i.test(name) ? 'code' : /\.(DD)$/i.test(name) ? 'doc' : 'text';

export async function makeProps(game, o) {
  const load = GAMES[game];
  if (!load) return 0;
  const mod = await load(), root = '::/' + mod.FOLDER;
  const files = await render(await mod.props());
  const pairs = [[root + '/.keep', { type: 'text', content: '' }]];
  files.forEach(f => {
    if (f.canvas) { let src = ''; try { src = f.canvas.toDataURL('image/png'); } catch (e) { return; } pairs.push([root + '/' + f.name, { type: 'image', content: '', src: src }]); }
    else pairs.push([root + '/' + f.name, { type: typeOf(f.name), content: f.text }]);
  });
  await fs.putMany(pairs);
  remember(game, files.length);
  changed('::'); changed(root);
  if (!(o && o.quiet)) say('A FOLDER HAS APPEARED ON THE DESKTOP: ' + mod.FOLDER + '. ' + files.length + ' FILES OF ' + mod.NAME + '.');
  return files.length;
}

/* a mastery is earned: its folder */
export function onTrophy(detail) {
  try {
    if (!detail || !detail.mastery) return;
    const game = String(detail.id).replace(/^mastery_/, '');
    if (GAMES[game] && !made()[game]) makeProps(game).catch(() => { /* never into the machine */ });
  } catch (e) { /* never into the machine */ }
}
/* every mastery already earned whose folder was never made (a seal from before this, or a save carried over): quietly, one at a time */
export async function sync(T) {
  try {
    const m = made();
    for (const game of Object.keys(GAMES)) if (!m[game] && T.earned('mastery_' + game)) await makeProps(game, { quiet: true });
  } catch (e) { /* never into the machine */ }
}
export const folders = () => made();
/* a folder that was made and is gone (thrown away, the bin emptied) is owed: RESTORE SYSTEM FILES makes it again */
handedOver(() => Object.keys(made()).filter(g => FOLDER_OF[g]).map(g => ({ path: '::/' + FOLDER_OF[g][0], folder: true, make: () => makeProps(g, { quiet: true }) })));
