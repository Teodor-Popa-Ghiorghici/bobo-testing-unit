/* DAVE'S SECOND SHELF OF COLOUR SCHEMES: twenty-eight, none for sale. A scheme is the six inks the machine's chrome is drawn with and the gradient that is laid over every title bar,
   the menu bar and the taskbar (kernel/theme_fx.js); `node scripts/check-theme.mjs` holds each one to its ramp and its contrast. Each is given by one trophy (`reward`); eight are
   `secret`: they are `???` on the shelf until the trophy is earned. */
const S = (id, name, reward, blurb, bg, fg, ok, hi, err, dim, acc, secret) => {
  const o = { id, name, price: 0, reward, blurb, v: { bg, fg, ok, hi, err, dim, acc }, more: true };
  if (secret) o.secret = true;
  return o;
};

export const SCHEMES_M = [
  S('stopcode', 'STOP CODE', 'sys_apps_all', 'Pale lilac on a navy that has seen too many 0x0000007B. You have opened every door; one of them was this one.', '#00002A', '#E8E8FF', '#80E0FF', '#FFFFFF', '#FF8888', '#8A8AE0', '#B8B8FF'),
  S('terry', 'TERRY', 'sys_eggs7', 'Soft white on a dark teal, as typed by somebody who built a temple and left the lights on in it.', '#021012', '#C8F0E8', '#66FFCC', '#FFFFFF', '#FF8F7A', '#5FA898', '#8CF8E0'),
  S('coldstart', 'COLD START', 'sys_longboot', 'Blue-white on a black with no warmth in it. Eight hours without power, and the first thing it gave you back was this.', '#06080C', '#E4ECF4', '#9CD0FF', '#FFFFFF', '#FF8F98', '#7E8CA0', '#C0D4EC'),
  S('lamplit', 'LAMPLIGHT', 'sys_days7', 'The yellow of one lamp in a room you come back to. A week of mornings, and it is still on when you arrive.', '#140C04', '#FFE3B0', '#FFB040', '#FFF4D8', '#FF7A4A', '#B58A52', '#FFCC70'),
  S('windowshop', 'WINDOW SHOPPING', 'sys_blink', 'Shop-window warm: the colour of a thing you looked at for four seconds and left. Dave remembers. Dave always does.', '#0A0804', '#FFF4D0', '#FFE060', '#FFFFFF', '#FF7070', '#B0A070', '#FFD070', true),
  S('creditroll', 'CREDITS ROLL', 'sys_credits', 'Grey on black, scrolling upward. You looked at four faces five times. They looked back, and were kind.', '#000000', '#E8E8E8', '#C8C8C8', '#FFFFFF', '#F0A0A0', '#929292', '#D8D8D8', true),
  S('remembered', 'THE MACHINE REMEMBERS', 'meta_remember', 'A lilac dusk. It had been holding on to what you did before the ledger, and kept it without saying.', '#0C0814', '#EAE0F4', '#C0A8E8', '#FFFFFF', '#F08AA0', '#9484B0', '#D0C0F0', true),
  S('paleore', 'PALE ORE', 'sw_rooms12', 'Bone ink on a soot ground, the shade of what is under the roots. Twelve rooms mapped, six more to go.', '#0C0B08', '#F4EDD8', '#D8D0A0', '#FFFFFF', '#E89478', '#B0A888', '#E0D8B0'),
  S('vesselsoul', 'FULL VESSEL', 'sw_vessel', 'Pale blue on deep blue, like a vessel with nothing left to fill. You were full, and did not waste it.', '#030A18', '#DCEBFF', '#9CC8FF', '#FFFFFF', '#FF8CA8', '#6C94C8', '#B8D8FF'),
  S('spore', 'SPORE', 'sw_mods', 'Lime on a bruised purple. Four ways to be lost, and the spore room is the one that smells.', '#0C0614', '#E0F0C8', '#A8E860', '#F8FFD8', '#FF6AB0', '#8E7CB8', '#C8A0F0'),
  S('lumafly', 'LUMAFLY', 'sw_thread', 'Yellow-green in a black cave. One mask left, and a small bright thing that will not leave your side.', '#060A00', '#F4FFB0', '#C8F020', '#FFFFE0', '#FF8040', '#98A838', '#E0FF60'),
  S('rudeness', 'RUDE AWAKENING', 'sw_rude', 'A sick pale yellow, like a larva that was not expecting you. It is not the colour of anything that happens next.', '#0E0E08', '#F0F0D0', '#D8E070', '#FFFFF0', '#E88050', '#A8A878', '#E8E8A0', true),
  S('dunesand', 'DUNE SAND', 'ae_graze20', 'Orange-gold on a brown that is nearly black. Twenty near-misses, and every one of them smelled of the desert.', '#180D04', '#FBE2B0', '#E8A850', '#FFF3D0', '#F27058', '#B08850', '#F0C070'),
  S('nightdew', 'NIGHT DEW', 'gd_night', 'Cool green on a blue-black, wet to the touch. The garden at the hour when it thinks nobody is looking.', '#04100E', '#D8F4EC', '#7CE8C0', '#FFFFFF', '#FF9090', '#5CA898', '#A4F0E0'),
  S('bloom', 'BLOOM', 'gd_blessed', 'Peach and rose on a plum ground. A plant was blessed, and wanted you to know.', '#14080C', '#FFE4E8', '#FF98B0', '#FFFFFF', '#FF5A6A', '#B87886', '#FFB8C8'),
  S('bluecrystal', 'BLUE CRYSTAL', 'ck_count', 'Icy cyan on dark glass. Counted to the gram, and it came to the exact figure it was supposed to be.', '#001018', '#D0F6FF', '#50E0FF', '#FFFFFF', '#FF9090', '#4C98B0', '#90F0FF'),
  S('hazmat', 'HAZMAT', 'ck_undo5', 'Hazard yellow on black. Measure twice, undo five times, and wear what it says on the suit.', '#0C0A00', '#FFEE70', '#FFD020', '#FFFFC0', '#FF7040', '#B09A28', '#FFE040'),
  S('lastminute', 'JUST IN TIME', 'mg_clutch', 'Candle amber on near-black. The press that came with half a second left and was, as always, enough.', '#0A0804', '#FFEDC0', '#FFC850', '#FFFFF0', '#FF8858', '#A8905C', '#FFE090'),
  S('platinumstar', 'STAR PLATINUM', 'sb_combo5', 'Teal and ice on a nearly black blue. Five hits in a row and not one of them said what it was doing.', '#020E10', '#CFF4F0', '#58E8D0', '#FFFFFF', '#FF8888', '#58A8A4', '#90F4E8'),
  S('fjordgrey', 'FJORD GREY', 'bk_chores', 'Slate and water. The chores are done by half past six and there is nothing left to do but look at it.', '#061018', '#DCE8F0', '#8CC8E8', '#FFFFFF', '#F08870', '#6C8CA4', '#A8D0E8'),
  S('lakeking', 'KING OF THE SEA', 'bk_king', 'Deep teal and a gold that is not for trading. Something that old has no use for a krone.', '#02121A', '#E8F0E0', '#48C8C0', '#FFF8D0', '#F08870', '#5C98A0', '#E8C860', true),
  S('lakehag', 'THE TROLL IN THE LAKE', 'bk_troll', 'Murky green on black, damp. Somebody pulled something up, and it looked at them.', '#040C08', '#C8E0C0', '#78C868', '#E8FFE0', '#D88060', '#6C9468', '#A0D090', true),
  S('nicetry', 'NICE TRY', 'bk_nice', 'Pinky peach on a brown that wants to be left alone. The door did not open, and it was a good try.', '#120A0A', '#FFE8E0', '#FFB8A0', '#FFFFFF', '#FF6058', '#B88878', '#FFD0C0', true),
  S('yearaurora', 'A YEAR IN THE VALLEY', 'bk_year', 'Green light over a snow field, and a violet at the edge of it. One whole year, and every season was for something.', '#04100C', '#D8FFF0', '#58FFA8', '#F4FFFA', '#FF80B8', '#58A890', '#B890FF'),
  S('jagerorange', 'JAGER ORANGE', 'bt_skal', 'Amber and herb green on dark. Skal. You said it to nobody, to the bottle, and to the room.', '#0A1006', '#FFE0B0', '#FF9A28', '#FFF2D8', '#E85838', '#98A058', '#7CC060'),
  S('dreamy', 'THIRTY-EIGHT DREAMS', 'bt_dreams', 'Lavender and peach, a bit smudged, as a thing remembered wrongly in the morning. You had a lot of them.', '#0C0618', '#F8E0FF', '#FFA878', '#FFF0D8', '#FF6890', '#A47CC0', '#FFC8A0', true),
  S('holycblue', 'HOLY C BLUE', 'hc_lesson1', 'Yellow and white on a blue that has been the blue since the beginning. Hello, world. Hello, temple.', '#00003C', '#FFFF98', '#98FF98', '#FFFFFF', '#FF9898', '#9898E8', '#98E8FF'),
  S('goldledger', 'GOLD LEDGER', 'meta_10', 'Cream-gold on black, in a column. Ten things written down, and the sum of them is more than ten.', '#0C0900', '#F8E8A8', '#E8C040', '#FFFFFF', '#F08050', '#B09C50', '#FFD860')
];
