/* The machine's own trophies, part one: the desk and the files, the style meter, the terminal and HolyC, the chin, Dave and the SUN. Data only (the catalogue is
   docs/achievements/system.md); each is earned by a kernel call to `sys.emit(...)` (kernel/trophy_hook.js) from where the machine does the thing, so no app is touched.
   The system set has one job: to make the interface itself worth exploring, the way each game's set makes that game worth learning. */
import { t, secret, rule } from '../apps/trophy_kit.js';
import { sess } from './trophy_hook.js';
import { TOPICS } from './help_text.js';

export const BIRTHDAY = { m: 7, d: 23 };                       /* the one trophy that is for one person: the 23rd of July */
export const KNOBS = ['SCAN', 'DGAUSS', 'PHOS', 'BURN', 'MUS', 'SFX', 'VHLD', 'HHLD', 'LOBBY'];
export const EGGS = ['SUDO', 'PING', 'CURL', 'FORKBOMB', 'SL', 'COWSAY', 'FORTUNE', 'LINES', 'NEOFETCH'];
export const HELP_PAGES = TOPICS.length;
const on = rule.on;

export const SYSTEM_A = [
  /* ---- the desk and the files ---- */
  t('sys_upload', 'NEW ARRIVAL', 'B', 'P', 'Bring a picture of your own onto the desktop and watch it get crushed to sixteen colours.', on('import', p => p.kind === 'image')),
  t('sys_video', 'FIFTEEN FRAMES A SECOND', 'B', 'E', 'Import a video and play it.', on('import', p => p.kind === 'video')),
  t('sys_bgvideo', 'A MOVING WALLPAPER', 'S', 'C', 'Set a video as the desktop background.', on('bg', p => p.kind === 'video')),
  t('sys_fits', 'FIVE FITS', 'S', 'E', 'Set a background in all five fits: fill, fit, stretch, centre, tile.', rule.sets('fits', 5)),
  t('sys_folder', 'A PLACE FOR EVERYTHING', 'B', 'P', 'Make a folder and put a file into it, by dragging it in or by cutting and pasting.', on('move', p => p.own)),
  t('sys_deep', 'FOLDERS ALL THE WAY DOWN', 'B', 'C', 'Make a path five folders deep.', on('mkdir', p => p.depth >= 5)),
  t('sys_copy', 'TWO OF EVERYTHING', 'B', 'E', 'Copy a file into a folder, by holding Ctrl as you drop it or by copying and pasting.', on('copy', p => p.n > 0)),
  t('sys_esc', 'CHANGED MY MIND', 'B', 'E', 'Press Esc in the middle of a drag.', on('drag-cancel')),
  t('sys_undo', 'NOT SO FAST', 'B', 'E', 'Take a delete back with Ctrl+Z.', on('undo')),
  t('sys_bin', 'THE BIN REMEMBERS', 'B', 'E', 'Put something back from the RecycleBin.', on('trash-restore')),
  t('sys_restore', 'LET THERE BE FILES', 'B', 'E', 'Use RESTORE SYSTEM FILES to bring back a machine file you deleted.', on('restore-system', p => p.n > 0)),
  t('sys_bend', 'MAKE IT FIT', 'B', 'E', 'In one sitting, zoom a window, take one full screen and resize one.', on('window', () => ['zoom', 'full', 'resize'].every(k => sess.win.indexOf(k) >= 0)), { scope: 'session' }),

  /* ---- the style meter ---- */
  t('sys_rank_b', 'BLASPHEMOUS', 'B', 'P', 'Reach rank B on the style meter.', on('style', p => p.tier >= 2)),
  t('sys_rank_s', 'SACRILEGIOUS', 'S', 'P', 'Reach rank S.', on('style', p => p.tier >= 4)),
  t('sys_rank_sss', 'SSSTEFAN', 'S', 'P', 'Reach rank SSS.', on('style', p => p.tier >= 6)),
  t('sys_rank_top', 'HAPPY BIRTHDAY', 'G', 'P', 'Reach the top rank.', on('style', p => p.tier >= 7)),
  t('sys_pile20', 'PILE DRIVER', 'S', 'S', 'Delete twenty or more files in one go.', on('delete', p => p.n >= 20)),
  t('sys_pile100', 'AVALANCHE', 'G', 'S', 'Delete a hundred or more files in one go.', on('delete', p => p.n >= 100)),
  t('sys_single', 'ONE AT A TIME', 'S', 'S', 'Reach rank A deleting only single files.', on('style', p => p.tier >= 3 && p.singlesOnly), { scope: 'run' }),
  t('sys_piletop', 'PILES ALL THE WAY UP', 'G', 'S', 'Reach the top rank using nothing but piles of twenty or more.', on('style', p => p.tier >= 7 && p.pilesOnly), { scope: 'run' }),
  t('sys_hold', 'HOLD THE NOTE', 'S', 'S', 'Stay on the top rank for thirty seconds.', on('style', p => p.atTop >= 30)),
  t('sys_glitch', 'THE TAPE WOBBLES', 'G', 'S', 'Stay on the top rank until the sound starts to glitch.', on('style', p => p.atTop >= 60)),

  /* ---- the terminal, HolyC and the boot ---- */
  t('sys_holyc1', 'HELLO, TEMPLE', 'B', 'P', 'Run a HolyC program that is only a string.', on('holyc', p => p.ok && p.onlyString)),
  t('sys_holyc2', 'A FUNCTION OF YOUR OWN', 'S', 'C', 'Define a HolyC function and call it.', on('holyc', p => p.ok && p.usesFn)),
  t('sys_autoexec', 'BREAK IT, FIX IT', 'S', 'C', 'Break AutoExec.HC, reboot, read the error that names the line, and fix it.', on('autoexec', (p, a) => p.ok && a.has('flags', 'autoexec-broken'))),
  t('sys_compile', 'THE COMPILER IS THE SHELL', 'B', 'E', 'Use COMPILE on a file of your own.', on('cmd', p => p.name === 'COMPILE' && p.own)),
  t('sys_eggs3', "TERRY'S TERMINAL I", 'B', 'E', "Find three of the terminal's answers: SUDO, PING, CURL, a fork bomb, SL, COWSAY, FORTUNE, LINES, NEOFETCH.", rule.sets('eggs', 3)),
  t('sys_eggs7', "TERRY'S TERMINAL II", 'S', 'E', 'Find seven of them.', rule.sets('eggs', 7)),
  t('sys_lines', 'THE BUDGET', 'B', 'E', 'Run LINES and see how much of the 100,000-line budget is spent.', on('cmd', p => p.name === 'LINES')),
  secret('sys_panic', 'RING 0', 'B', 'J', 'Somewhere there is a debugger, and a word that gets you into it.', 'Drop into the debugger with PANIC.', on('panic')),
  t('sys_help', 'READ THE MANUAL', 'B', 'E', 'Open all ' + HELP_PAGES + ' pages of Help.', rule.sets('help', HELP_PAGES)),

  /* ---- the chin ---- */
  t('sys_knobs', 'TOUCH EVERYTHING', 'S', 'E', 'Turn or press every control on the chin: SCAN, DGAUSS, PHOS, BURN, MUS, SFX, VHLD, HHLD and LOBBY.', rule.sets('knobs', KNOBS.length)),
  t('sys_roll', 'THE PICTURE ROLLS', 'B', 'E', 'Knock VHLD or HHLD off 5 until the picture rolls, then lock it back.', on('roll')),
  t('sys_thunk', 'THUNK', 'B', 'E', 'Fire the degauss coil.', on('degauss')),
  t('sys_power', 'PULL THE PLUG', 'B', 'E', 'Switch the monitor off and on again.', on('power')),
  t('sys_saver', 'THE TUBE DREAMS', 'B', 'E', 'Leave the machine alone for ninety seconds and let it start drawing by itself.', on('saver')),

  /* ---- Dave, the shop and the SUN ---- */
  t('sys_buy1', 'FIRST PURCHASE', 'B', 'P', 'Buy something from Dave.', on('buy')),
  t('sys_spent1', 'SPENDER', 'B', 'P', 'Spend 1,000 SUN at Dave\'s.', rule.stat('spent', 1000)),
  t('sys_spent2', 'BIG SPENDER', 'S', 'P', 'Spend 10,000 SUN.', rule.stat('spent', 10000)),
  t('sys_spent3', "A KING'S RANSOM", 'G', 'P', 'Spend 100,000 SUN.', rule.stat('spent', 100000)),
  t('sys_earned1', 'A THOUSAND SUN', 'B', 'P', 'Earn 1,000 SUN, from anywhere.', rule.stat('earned', 1000)),
  t('sys_earned2', 'TEN THOUSAND SUN', 'S', 'P', 'Earn 10,000 SUN.', rule.stat('earned', 10000)),
  t('sys_earned3', "A TEMPLE'S WORTH", 'G', 'P', 'Earn 99,999 SUN across the whole machine.', rule.stat('earned', 99999)),
  t('sys_refit', 'A FULL REFIT', 'B', 'C', 'Wear a frame, a logo, a pointer and a scheme you bought, all at once.', rule.sets('refit', 1)),
  t('sys_shelf', 'A SHELF CLEARED', 'S', 'P', 'Buy everything on one of Dave\'s shelves.', rule.sets('shelves', 1)),
  t('sys_bare', 'EVERY SHELF BARE', 'G', 'P', 'Buy everything Dave has.', rule.sets('bare', 1)),
  t('sys_crazy', 'THE CRAZY ONE', 'B', 'E', 'Hear Dave say one of his crazy lines.', on('crazy')),
  t('sys_farewells', 'A WORD FOR EVERYONE', 'S', 'E', 'Hear five of Dave\'s seven farewells.', rule.sets('farewells', 5)),
  secret('sys_blink', 'WINDOW SHOPPING', 'B', 'J', 'Dave notices how long you stay.', 'Close Dave\'s shop in under four seconds having bought nothing.', on('farewell', p => p.tier === 'blink')),
  /* ---- the four on the credits screen (kernel/gifts.js: the first visit they give you four things, the fifth four more) ---- */
  secret('sys_credits', 'FIVE LOOKS AT FOUR FACES', 'B', 'J', 'They like to be looked at, and they notice who does.', 'Open CREDITS.EXE for the fifth time.', on('credits', p => p.n >= 5))
];
