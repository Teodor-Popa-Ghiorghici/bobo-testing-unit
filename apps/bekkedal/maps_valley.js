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
    door: { x: 8, y: 6, to: 'farmhouse', tx: 11, ty: 9 }
  },
  town: {
    title: { no: 'BEKKEDAL', en: 'BEKKEDAL' },
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
    exits: []
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
  farmhouse: {
    title: { no: 'HYTTA', en: 'THE CABIN' },
    inside: true,
    rows: [
      '                        ',
      '                        ',
      '                        ',
      '      HHHHHHHHHHHH      ',
      '      HbiiiiiivvuH      ',
      '      HiiiiiiiiiiH      ',
      '      HiizzzziiicH      ',
      '      HiiznnziiiiH      ',
      '      HiizzzziiiiH      ',
      '      HiiiiiiiiiiH      ',
      '      HHHHHDHHHHHH      ',
      '                        ',
      '                        ',
      '                        ',
      '                        '
    ],
    exits: [{ x: 11, y: 10, to: 'farm', tx: 8, ty: 7 }]
  },
  lakehouse: {
    title: { no: 'HJEMME', en: 'HOME' },
    inside: true,
    rows: [
      '                        ',
      '                        ',
      '                        ',
      '     HHHHHHHHHHHHHH     ',
      '     HbiiiiiiiivvuH     ',
      '     HiiiiiiiiiiiiH     ',
      '     HiizzzziiiiicH     ',
      '     HiiznnziiiiiiH     ',
      '     HiizzzziiiiiiH     ',
      '     HiiiiiiiiiiiiH     ',
      '     HiiiiiiiiiiiiH     ',
      '     HHHHHHDHHHHHHH     ',
      '                        ',
      '                        ',
      '                        '
    ],
    exits: [{ x: 11, y: 11, to: 'lake', tx: 5, ty: 5 }]
  }
};
