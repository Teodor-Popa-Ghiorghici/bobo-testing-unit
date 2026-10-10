/* THE STACK's trophies (docs/achievements/toys.md). A hi-fi has no score, so these are about listening to it: a disc played, a side heard out, every folder looked in, every EQ curve tried, every
   mood of the lobby tune heard, a track of your own played. Events: play { folder, own }, ended. Sets: folders, presets (the digits 1-9), variants (the lobby tune's four moods). */
import { t, rule } from '../trophy_kit.js';
const on = rule.on;

export const FOLDERS = 10;            /* LOBBY MUSIC, MAGEN, THE COOK, ELEPHANT, BEKKEDAL, STAND BATTLE, AFTEREGYPT, SOLITAIRE, DUNGEON SWEEPER, THE GARAGE (the STYLE METER folder is earned, so it is not asked for) */
export const VARIANTS = 4;            /* HYMN, MELLOW, DYNAMIC, GLITCH */

export const TROPHIES = [
  t('hf_spin', 'SPIN IT', 'B', 'P', 'Play a disc.', on('play')),
  t('hf_side', 'A WHOLE SIDE', 'B', 'P', 'Listen to one disc to the end.', on('ended')),
  t('hf_crates', 'DIG THE CRATES', 'S', 'E', 'Open every one of the ' + FOLDERS + ' folders in the library.', rule.sets('folders', FOLDERS)),
  t('hf_eq', 'NINE CURVES', 'S', 'E', 'Try all nine EQ presets (the digits 1 to 9).', rule.sets('presets', 9)),
  t('hf_moods', 'FOUR MOODS', 'S', 'E', 'Hear the lobby tune as HYMN, MELLOW, DYNAMIC and GLITCH.', rule.sets('variants', VARIANTS)),
  t('hf_own', 'YOUR RECORD', 'B', 'C', 'Drop in a track of your own and play it.', on('play', p => p.own)),
  t('hf_top', 'FROM THE TOP', 'S', 'E', 'Play the STYLE METER disc.', on('play', p => p.folder === 'STYLE METER'))
];

export function backfill() { return []; }
