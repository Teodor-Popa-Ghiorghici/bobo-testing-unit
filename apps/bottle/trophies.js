/* THE BOTTLE's trophies (docs/achievements/games-2.md). The app is a dry, rueful comedy about a bottle, so these reward the journey, restraint and the collection of drinks, never speed or
   quantity: there is deliberately no "pass out fast" and no "drink N bottles". Data only: trophy_calls.js is where the app (and kernel/drunk.js, which owns the journey) tell the ledger.
   Events: pour, drink { drink, units }, glow (five minutes at WARM or TIPSY after at least three measures), limit (ABOUT TO GO, then drained to SOBER with no blackout in between),
   blackout, lore (the first sip of a drink with alcohol in it knocked the drinker out, LORE ACCURATE on). Sets: tasted (the drinks drunk a measure of), scenes (the blackout scenes seen). Counter cordial (measures of the cordial). */
import { t, secret, rule } from '../trophy_kit.js';
import { DRINKS } from '../../kernel/cos_data.js';
const on = rule.on;

export const SCENES_TOTAL = 38;                        /* kernel/blackout.js: thirty-six photographs and two drawn screens (scripts/check-trophies.mjs holds the number) */
export const BOTTLE_MEASURES = 17;                     /* a 700 ml bottle at 40 ml a measure: seventeen pours, with a sip left */

export const TROPHIES = [
  t('bt_pour', 'THE FIRST POUR', 'B', 'P', 'Pour a measure.', on('pour')),
  t('bt_skal', 'SKAL', 'B', 'P', 'Drink your first measure.', on('drink')),
  t('bt_glow', 'A MILD GLOW', 'S', 'S', 'Keep the screen at WARM or TIPSY for five minutes, having drunk at least three measures.', on('glow'), { scope: 'life' }),
  t('bt_limit', 'KNOW YOUR LIMIT', 'S', 'S', 'Reach ABOUT TO GO, then stop and let it drain back to SOBER without passing out.', on('limit'), { scope: 'life' }),
  t('bt_designated', 'DESIGNATED DRIVER', 'S', 'C', 'Drink a whole bottle of the cordial: ' + BOTTLE_MEASURES + ' measures of it.', rule.stat('cordial', BOTTLE_MEASURES)),
  t('bt_flight3', 'A SMALL FLIGHT', 'B', 'E', 'Drink a measure of three different drinks.', rule.sets('tasted', 3)),
  t('bt_flight6', 'A FLIGHT', 'S', 'E', 'Drink a measure of six different drinks.', rule.sets('tasted', 6)),
  t('bt_flight9', 'THE WHOLE SHELF', 'G', 'E', 'Drink a measure of every drink Dave sells.', rule.sets('tasted', DRINKS.filter(d => !d.reward && !d.gift).length)),
  t('bt_lights', 'LIGHTS OUT', 'B', 'J', 'Pass out once.', on('blackout')),
  t('bt_lore', 'ONE SIP IS ENOUGH', 'S', 'J', 'Be knocked out by a single sip with LORE ACCURATE switched on.', on('lore')),
  secret('bt_dreams', 'THIRTY-EIGHT DREAMS', 'G', 'E', 'The machine has thirty-eight dreams. It does not repeat itself until it has had them all.', 'See all thirty-eight blackout scenes.', rule.sets('scenes', SCENES_TOTAL))
];

/* the bottle's own save: a measure drunk is a measure drunk */
export function backfill(read) {
  const s = read('templeos.bottle.v1'), ids = [];
  if (s && (s.drunk || 0) > 0) ids.push('bt_pour', 'bt_skal');
  return ids;
}
