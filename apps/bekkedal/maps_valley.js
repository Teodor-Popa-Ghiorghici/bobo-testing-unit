/* Bekkedal — the four places on the valley floor, and the two rooms.
 *
 * These are rows, not a level format: every square is one glyph off the
 * legend in `data.js`, and the map is as big as its own rows say. They live
 * here rather than in `data.js` because eleven maps of forty-odd columns is
 * more content than one file should carry beside the items and the dialogue,
 * and because `maps.js` — which joins these to the wild half and hangs the
 * seams off both — is easier to read when it is only the seams.
 *
 * A map here is a place with a spine and a way out of it, not a screen with
 * grass round the edge. The farm is a yard, a home field and the beck the
 * valley is named for; the town is a square with the road running through
 * it; the water is a bay with a pier; the meadow is drifts of flowers either
 * side of a track between the two ways in. Nothing carries its own `exits`:
 * every outdoor edge run is declared once, as a pairing, in `maps.js`.
 *
 * Three things these places wanted and the glyph set cannot say. Written
 * down rather than invented here (P7/P8):
 *   - **Running water.** Bekkedal is the brook valley and there is no brook,
 *     because there is no glyph for one. Drawn with '~' it came out as a
 *     chain of sand-rimmed ponds where it bent and as a canal where it did
 *     not: `shore.js` authors its profile as a signed distance from a
 *     waterline with land on *one* side, and a channel has land on both. The
 *     old field boundary on the farm is a shelter belt of birch instead.
 *   - **A fence that reads after dark.** The town's two gardens were fenced
 *     with '=' until `palette_check.js` refused it: a fence reads as TIM[2]
 *     and grass as GRASS[2], 0.046 apart at the darkest hour against a 0.055
 *     floor. They are open flower beds and a bench instead. '=' is in the
 *     legend and on no map, and until its entry in `surface.js` moves it
 *     cannot go on one.
 *   - **A square that is not a road.** The town has no glyph for cobble or
 *     for a market stall, so its square is trodden earth ('.'), the same
 *     surface as the road running through it.
 */
export const VALLEY = {
  farm: {
    title: { no: 'GÅRDEN', en: 'THE FARM' },
    rows: [
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'TggggggggggggggggggggggggggggggggggggggggggT',
      'TgggggggFgggggggg,gggggggggggggggggYgggggggT',
      'Tggggggggggg,FggggggggggggggggYggggGggggTggT',
      'TgggggRRRRRgggggggggggggg,ggggggggYggggY,TgT',
      'TgggggHHHHHgg,ggggffffffffffg,gggggY,,,Y,,gT',
      'ggggggHHDHHgggggggffffffffffggggg,,YYY,,Y,gT',
      'gggggggg.gggKgggggffffffffffggggg,,G,T,,,T,T',
      '.........,ggggggggffffffffffggggggY,,,,T,,,T',
      'gggggggg.gggggggggffffffffffggg,gggY,,,,,YgT',
      'Tggggogg.gggggggg,gggggggggggggggggYG,,,,,gT',
      'Tggggggg.ggggggggggggggggg,ggggggggYggY,,,gT',
      'Tggggggg.gggggggggggggggggggggggggggggg,,ggg',
      'Tgggg,gg....................................',
      'Tgggggggggggggggg.gggggg,,,ggggggggggYgggggg',
      'Tggggggggggggg,gg.gggggggggggggggggYgggggGgg',
      'TggggYggggggggggg.,gggggggggggggggYYgggggggg',
      'Tgggggggggggggggg.gggggggggggggggggGgYg,,ggT',
      'Tgggggggggggggggg.ggggggFgggggg,,,,YgY,,Y,gT',
      'Tgggggggggggggggg.ggggggggggggg,,,,YY,,,,,gT',
      'Tgggggggggggggggg.,gg,ggggggg,,,,,,Y,,,,,,gT',
      'TggGggggggggggggg.ggggggggggg,,,,,,G,,,,,,gT',
      'TggFggggggggggggg.gggggggFggg,,,,,YY,,,,G,gT',
      'Tgggggggggggggggg.ggggggggggggg,,,,Y,g,,gggT',
      'Tgggggggggggggggg.ggggggggggggg,,,gGgggggggT',
      'TTTTTTTTTTTTTTTgg.ggTTTTTTTTTTTTTTTTTTTTTTTT'
    ],
    exits: [],
    door: { x: 8, y: 6, to: 'farmhouse', tx: 11, ty: 12 }
  },
  town: {
    title: 'BEKKEDAL',
    rows: [
      'TTTTTTTTTTTTTTTTTTTTg...gTTTTTTTTTTTTTTTTTTTTT',
      'TggTgggggggg,gTgTgggg...gggggg,TgggTgg,ggggggT',
      'TggggggTggggTgTgTgTgg...gggggggggggTgTTgTggggT',
      'TggggggggggggFJFTgggg...gg,TggTgggggFggggggggT',
      'TggggggggTggFgggFgggg...gggggggggggggggggTgGgT',
      'TgggYTggggggFggFFgggg...gggggggTgggg,gggggTggT',
      'TggTggggggTgggggggggg...ggggg,ggggggggggggg,gT',
      'Tgggggggggggggggggggg...gggggggRRRRRR,gggggggT',
      'TggggggRRRRRRgggggggg...ggggg,gHHHHHHggggggggT',
      'TggggggHHHHHHgggggggg...gggggggHHDHHHggggggggT',
      'TggggggHHDHHHgggggggg...gggFggggggggggFggggggT',
      'TggggggggggggFggggggg...gJggggggggggggRRRRgggT',
      'Tggggggggggggggggg...........gggggggggHHHHgggT',
      'gggggggggggggggggg.o.......J.gggggggggHHDHgggg',
      '..............................................',
      '..............................................',
      '..............................................',
      'gggggggggRRRRggggg.J.......J.ggggggggggggggggg',
      'TgggggFggHHHHggggg...........gggggggTFFFTggggT',
      'TggggggggHHDHgggggggg...ggggggggggggJgggJggggT',
      'Tg,ggg,ggggggggFFFggF...ggggggggg,,gTFFFTggggT',
      'TgggggggRRRRRgFgFgFgg...gggg,gRRRRRRgggggggggT',
      'TgggggggHHHHHgFgggJgg...gggg,,HHHHHHgggggggggT',
      'TgggggFgHHDHHgggggggg...ggggggHHDHHHgggggggggT',
      'TgggTgggggggTTggTggg,...TggggggggTgggggggggggT',
      'TggYggggggggTgggg,gTg...ggggggggggggggggggGggT',
      'Tgggggggggggggggggggg...ggTTgggggggTgggTgggggT',
      'TTTTTTTTTTTTTTTTTTTTg...gTTTTTTTTTTTTTTTTTTTTT'
    ],
    exits: [],
    /* THE LOFT. The square has had six locked doors on it since the town was
       drawn; this is the one with something behind it. `need` is carried the
       same way a seam's gate is (maps.js's WARM/LAMP) and answered by the
       same gateOK() — the building is shut, not invisible, and what opens it
       is Astrid's key, never a wall that stops existing. See BEK_LOFT
       (data.js) and spine.js. */
    door: { x: 40, y: 13, to: 'loftet', tx: 11, ty: 12, need: 'loft', why: {
      no: 'Låst. Astrid holder nøkkelen til bygdeloftet.',
      en: 'Locked. Astrid keeps the key to the valley loft.' } }
  },
  lake: {
    title: { no: 'VANNET', en: 'THE WATER' },
    rows: [
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'Tggggggg,ggg,,gggggggg~WWWWWWWWWWWWWWWWWWWWWWW',
      'Tgggggggg,g,,,,,ggggg~WWWWWWWWWWWWWWWWWWWWWWWW',
      'TggLLLLLgg,,,,,,gggg~WWWWWWWWWWWWWWWWWWWWWWWWW',
      'TggLLLLLgg,,,,,,,gg~WWWWWWWWWWWWWWWWWWWWWWWWWW',
      'TggLLLLLggg,,,,ggg~WWWWWWWWWWWWWWWWWWWWWWWWWWW',
      'TgggSgggggggggggg~WWWWWWWWWWWWWWWWWWWWWWWWWWWW',
      'Tgggggggggg,gggg~WWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
      'TggggggFg.....PPPPPPWWWWWWWWWWWWWWWWWWWWWWWWWW',
      'Tgggg^,gg.ggggg~WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
      'Tgggggggg.gggggg~WWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
      'Tgggg^g,g.ggggggg~WWWWWWWWWWWWWWWWWWWWWWWWWWWW',
      'TgGggggFg.ggggggggg~WWWWWWWWWWWWWWWWWWWWWWWWWW',
      'ggggggggg.ggggggggggg~WWWWWWWWWWWWWWWWWWWWWWWW',
      '..........ggggggggggggg~WWWWWWWWWWWWWWWWWWWWWW',
      'gggggg,gg.gggggggggggggg~WWWWWWWWWWWWWWWWWWWWW',
      'ggg,,,,,g.,Y,ggggggggggg~WWWWWWWWWWWWWWWWWWWWW',
      'gg,F,,,,,.ggggYgggggggg~WWWWWWWWWWWWWWWWWWWWWW',
      'TgY^,,,,,.gggggggggggg~WWWWWWWWWWWWWWWWWWWWWWW',
      'Tgg,,,,^,.ggggYgggggg~WWWWWWWWWWWWWWWWWWWWWWWW',
      'TYgY,F,,g.,,gggggggg~WWWWWWWWWWWWWWWWWWWWWWWWW',
      'Tgg^F,ggg.Fggggggggg~WWWWWWWWWWWWWWWWWWWWWWWWW',
      'Tg^g^ggYgGggggggggggg~WWWWWWWWWWWWWWWWWWWWWWWW',
      'T,gggggggYgggggggggggg~WWWWWWWWWWWWWWWWWWWWWWW',
      'Tgggggg^ggggggggggggggg~WWWWWWWWWWWWWWWWWWWWWW',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT'
    ],
    exits: [],
    boat: { x: 19, y: 8, to: 'fjord', tx: 17, ty: 12 }
  },
  enga: {
    title: { no: 'ENGA', en: 'THE MEADOW' },
    rows: [
      'TTTTTgg.ggTTTTTTTTTTTTTTgg.ggTTTTTTTTTTTTTTT',
      'Tgggggg.gggggggggggggggggg.ggggggggggggggggT',
      'Tgppggg.ggggpggggggggggggg.gggggggFggggggggT',
      'TgggggF.ggggggggFgggggggpg.ggFg,gggFgggggGgT',
      'TgGgggg.gggggggggggg,,gggg.gg,p,,,,,,ggggggT',
      'Tgggggg.pggRRRRRRgg,,,,,,,.gg,,,p,,,,,,ggggT',
      'Tgggggg.gpgHHHHHH,,,,,,,,p.,,,,,,,,,,,,ggggT',
      'Tgggggg.ggFHHDHHH,,,,,,,p,.,g,,,,,,,,,,ggggT',
      'Tgggggp.gggggggg,,,,,,,,,,.,gg,,,,,,,,gggggT',
      'Tgggggg.gggggggg,,,,,,,,p,.,,ggg,g,ggggggggT',
      'Tggppgg.ggFgggggg,p,p,,,,,.ggggggggggggggpgT',
      'Tggggpg.gggggpgpgg,g,,,,,,.ggggggggggggggFgT',
      'Tgggpgg.pgggggggggggJg,,Fg.ggggggggggggggggT',
      'TggggF,....................ggggggggggggggggT',
      'Tgpg,,,,,,,,,ggggggggggggggggggggg,gggpggggT',
      'Tggg,,,,,,,,,,gggggggggggggggg,,,,,,p,,gpggT',
      'Tg,,,,,,,,,,,,gggggggggggggggg,,,,,,,,,ggggT',
      'Tgg,,,,,,,,,,,ggggggggggggggg,,,,,,,,,,,gggT',
      'Tgg,,,,,,,p,,,,g,,ggggggpggg,,,,,,,,,,,,,ggT',
      'Tgg,,,,,,,,,,,,,,,,,,,ggggggg,p,,,,,,,,,gggT',
      'Tgggg,,,,,p,g,,,ppp,,,pgggggg,,,,,,,,,,pgFgT',
      'Tggggg,,,,gg,,,,,,,,,,,ggpgggFp,,,,,,,,ggggT',
      'TggYgggpgggg,,,,,,,,p,gggggpggggg,,,gggggggT',
      'Tgggggggggggg,,,,,,,,ggggpggpgggggggggggYggT',
      'Tgggggggggggggg,g,,ggggggggggggggggggggggggT',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT'
    ],
    exits: []
  },
  /* The two rooms are small on purpose and stay that way. They still float in
     a black margin — that is P7's problem, not this pass's. */
  /* Both rooms grew from a 12x8 / 14x9 island in a 24x15 map to a 22x13
     room in the same 24x15 map — the map was already one full screen
     (BEK_MIN_COLS x BEK_MIN_ROWS), it was only ever the room inside it that
     was small, so filling the void meant widening the walls, not drawing
     an exterior (see the interiors section of decor's brief). Both share
     one floor plan — bed top-left, hearth/cupboard top-right, a crate by
     the cupboard, table and rug centred — because the two houses were
     always differentiated by BEK_DECOR's content, not by their glyphs. */
  farmhouse: {
    title: { no: 'HYTTA', en: 'THE CABIN' },
    inside: true,
    rows: [
      '                        ',
      ' HHHHHHHHHHHHHHHHHHHHHH ',
      ' HbiiiiiiiiiiiiiiiivvuH ',
      ' HiiiiiiiiiiiiiiiiiciiH ',
      ' HiiiiiiiiiiiiiiiiiiiiH ',
      ' HiiiiiiizzzzzziiiiiiiH ',
      ' HiiiiiiizznnzziiiiiiiH ',
      ' HiiiiiiizzzzzziiiiiiiH ',
      ' HiiiiiiiiiiiiiiiiiiiiH ',
      ' HiiiiiiiiiiiiiiiiiiiiH ',
      ' HiiiiiiiiiiiiiiiiiiiiH ',
      ' HiiiiiiiiiiiiiiiiiiiiH ',
      ' HiiiiiiiiiiiiiiiiiiiiH ',
      ' HHHHHHHHHHDHHHHHHHHHHH ',
      '                        '
    ],
    exits: [{ x: 11, y: 13, to: 'farm', tx: 8, ty: 7 }]
  },
  lakehouse: {
    title: { no: 'HJEMME', en: 'HOME' },
    inside: true,
    rows: [
      '                        ',
      ' HHHHHHHHHHHHHHHHHHHHHH ',
      ' HbiiiiiiiiiiiiiiiivvuH ',
      ' HiiiiiiiiiiiiiiiiiciiH ',
      ' HiiiiiiiiiiiiiiiiiiiiH ',
      ' HiiiiiiizzzzzziiiiiiiH ',
      ' HiiiiiiizznnzziiiiiiiH ',
      ' HiiiiiiizzzzzziiiiiiiH ',
      ' HiiiiiiiiiiiiiiiiiiiiH ',
      ' HiiiiiiiiiiiiiiiiiiiiH ',
      ' HiiiiiiiiiiiiiiiiiiiiH ',
      ' HiiiiiiiiiiiiiiiiiiiiH ',
      ' HiiiiiiiiiiiiiiiiiiiiH ',
      ' HHHHHHHHHHDHHHHHHHHHHH ',
      '                        '
    ],
    exits: [{ x: 11, y: 13, to: 'lake', tx: 5, ty: 5 }]
  },
  /* ---- THE LOFT ---------------------------------------------------------
     The third room, and the only one that is not somebody's house: the old
     two-storey log storehouse on the town square, reached through the door
     at town (40,13) once Astrid hands over the key (BEK_LOFT, data.js).

     Same 24x15 frame and the same dead margin as the two houses — this is a
     room, and the rule that a map is at least one screen holds for rooms as
     much as for the valley floor. What is different is what is in it: seven
     `c` plinths, five along the back wall and two down the hall, one per
     wing of the loft, standing empty until that wing is full. They are the
     crate glyph the two houses already use, so `surface.js`, `interior.js`,
     `solid()` and the terrain cache needed nothing — from their side a
     plinth is a crate somebody left there, which for six years it was.

     The 'K' at (11,11) is the loft's own book: the same chest glyph the
     farm's workshop is, answered differently by act() because of the map it
     is on, so the donation panel needed no glyph of its own either.
     ---------------------------------------------------------------------- */
  loftet: {
    title: { no: 'LOFTET', en: 'THE LOFT' },
    inside: true,
    rows: [
      '                        ',
      ' HHHHHHHHHHHHHHHHHHHHHH ',
      ' HiiiiiiiiiiiiiiiiiiiiH ',
      ' HiciiiciiiciiiciiiciiH ',
      ' HiiiiiiiiiiiiiiiiiiiiH ',
      ' HiiiiiiizzzzzziiiiiiiH ',
      ' HiiiiiiizzzzzziiiiiiiH ',
      ' HiiiiiiizzzzzziiiiiiiH ',
      ' HiiiiiiiiiiiiiiiiiiiiH ',
      ' HiiiciiiiiiiiiiiciiiiH ',
      ' HiiiiiiiiiiiiiiiiiiiiH ',
      ' HiiiiiiiiiKiiiiiiiiiiH ',
      ' HiiiiiiiiiiiiiiiiiiiiH ',
      ' HHHHHHHHHHDHHHHHHHHHHH ',
      '                        '
    ],
    exits: [{ x: 11, y: 13, to: 'town', tx: 40, ty: 14 }]
  }
};
