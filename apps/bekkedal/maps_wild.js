/* Bekkedal — the five places past the valley floor.
 *
 * Same shape as `maps_valley.js`: rows only, no exits, every edge run
 * declared as a pairing in `maps.js`. What is different is what they are for.
 *
 * The wood is clearings and the stands between them, and a path that bends
 * rather than one that runs straight; you come into it from the town and from
 * the farm, and the trail out of the top of it is the only way up the
 * mountain on foot. The setra is grass going over to scree, with the adit at
 * the far end of it. The vidda is not the farm's grass with boulders on: it
 * is bare ground and rock with the green only in the hollows, and a tarn
 * under the north face. The mine is levels and raises off one adit, and no
 * two of them are on the same cadence. The fjord is a coast you can only
 * reach in the boat.
 *
 * Notes for P7/P8, where a place wanted something the glyph set cannot say:
 *   - the wood wants deadfall — a fallen trunk you walk round rather than
 *     over. `forest.js` already draws a 'fallen' species in the treeline, so
 *     the art exists; there is no glyph to put it on a square with;
 *   - the vidda wants two glyphs it cannot have. One is bare scree: the
 *     plateau's ground is '.', which `surface.js` reads as trodden earth
 *     (SOI[2]), so at noon a high alpine plateau is the colour of a ploughed
 *     field. The other is a snow patch — `snowy()` makes the whole plateau
 *     read as snowed, which is not the same thing as old drifts lying in the
 *     lee of the boulders, and '^' is the nearest thing there is;
 *   - the mine wants a timbered gallery and a ladder between levels; the
 *     raises are drawn as plain floor because that is all there is.
 */
export const WILD = {
  forest: {
    title: { no: 'SKOGEN', en: 'THE FOREST' },
    rows: [
      'TTTTTTTTg.TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'Tggggg,gg.TgggTTTTTTTTYYYgggTTgggTTgTTgggggT',
      'Tggg,T,,T.gYTgTTgTTTTTTTgTgg,,,TgTgggggggTgT',
      'TT,Y,TT,,.TTYggggTYTGTTggggg,,,GTTTgggTgYTTT',
      'TTT,,T,,T.....TgTTTTTTTggggg,T,,,T,,ggggTTYT',
      'TTTTT,,TTT,,Y.gTTTTTggggggggg,,,,gggTYgTTTTT',
      'TTT,,,,TT,YTg.gTgTTTTTGggggggT,,gggggggggTTT',
      'Tg,,,TT,,gggg.gTgTTGTTTFgggg,,,gggggggggggTT',
      'Tgg,YTTTggggg.gggTTGTTTTGgTY,ggggggggggTgggT',
      'TgTTTTggg.....ggggYTggTgggT,TggFgggggggggggT',
      'TTTTTYggg.ggggggggg,,,TgGYggTggggggggggg,TgT',
      'TggggTggF.gggggggT,,,T,,ggggTgggggggggg,Y,TT',
      'TGgTggTgg.ggggggg,T,,T,,ggggggTggggggY,,,,gT',
      'TggTTgYgg.gggggg,T,,,ggT,ggTTGTTgggg,,,,,,gT',
      'TgggggTgF........TggggggggggTTTggFgT,,gFGTgT',
      'TgTgggggggggTgTg.gggggggggTgTTTY,g,,YggggggT',
      'TgTggggggggTgGTT.ggggggggTTTTTT,,T,T,ggggggT',
      'TTggggggggggggTg.YgFgggggTYTGTT,,,T,,ggggggT',
      'TggggggggggggggT.ggggggggTgTTT,T,TTTgggggggg',
      'TgYggggggggggggg............................',
      'TgggggggggTgYTgg.........YgTgTTT,TT,TTTgFTgg',
      'TggggTggg,,TggggggTTgTgg.ggTgTT,TTT,,TTTgTgg',
      'TTGgYTTTTTT,,gTTgggggggg.ggggggggY,T,,TTTTgT',
      'TTGTTTTTTTTT,TTGTGgTTggF.ggggggggg,T,TGTTggT',
      'TTTTTTTTTTTTT,GgggggGggg.ggggggggggYTT,ggggT',
      'TTTTTTTTYTTTTgggGYgggggG...gggggggggTGTgTggT',
      'TTTTTTTTTTYTTTTggggggggggT.ggggggggYTYTgTgTT',
      'TTTTTTTTTTTTgggggggggggggg.gggggggTTTTTgTgTT',
      'TTTTTTTTTTTTTTgggggggggggg.gggggTTTTTTTTTTTT',
      'TTTTTTTTTTTTTTTTTTTTTTTTgg.ggTTTTTTTTTTTTTTT'
    ],
    exits: []
  },
  setra: {
    title: { no: 'SETRA', en: 'THE MOUNTAIN DAIRY' },
    rows: [
      'MMMMMMMMg.MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
      'Mgggggggg.gggggggggggggggggggggggggggggggM',
      'Mggg^gggg.gggggg^ggMMMgggggggggggggggggggM',
      'Mgggggggg.gggggggggMMMgggggggggggggg^ggggM',
      'MgggRRRRR.ggggg^g^gg^^^gpgg^g^gg^ggggggggM',
      'MgggHHHHH.ggggg^gggg^ggggg^gg^^gg^^^ggg^gM',
      'MgggHHDHH......ggg^ggg^^^^gg,g^,,^g^g^gggM',
      'Mggggggg^g^ggg.ggggg^g^g^^^,^,,,,,gggggggM',
      'Mggggggggggggg.ggggggg^ggg^,^^,,,,^^g^^ggM',
      'Mggggggggggggg.gggggggg^g^,,,^^,,,,g^^g^gM',
      'Mgg^ggggggggg^.gg^gggggggg,,,,,,,^,gggg^gM',
      'Mgggg,,,ggggg^.gggggggggggg,,,,,,,,ggggggM',
      'Mggg,,,,,,gggg............................',
      'Mgg,,,,,,,gggg.ggggggg^gggg^ggggg^gggggggg',
      'Mg,,,,,,,^gggg.gggggggggggggggg^gMMMgggggM',
      'Mg,,,,,,,,gggg.ggggg^ggggggggggggMMMgggggM',
      'Mgg,,,,,^^ggg^.ggggggggg^ggggggggMMMgggggM',
      'Mgggg,,ggg^ggg.gg^,^ggggggggggg^ggggg^gggM',
      'Mgggggggg......,,,,,,,,,,,gggggggggpgggggM',
      'Mggggggg^.gggg^,^,,^,,,,,,gggggggggggggggM',
      'MggMMMggg.^g^^^,^^^,,,,,,,gggggggggggggggM',
      'MggMMM^^g.ggg^^,,,,,,,,,^g,gggggggggg^gggM',
      'Mgggggggg.^g^^^g^^,,,,,,,ggMMMgggg^ggggggM',
      'Mgggggggg.^g^^gg^^,g,,gggggMMMg^gggggggggM',
      'Mgggggggg.gggg^ggggggggggggggggggggggggggM',
      'TTTTTTTTg.TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT'
    ],
    exits: []
  },
  vidda: {
    title: { no: 'VIDDA', en: 'THE PLATEAU' },
    rows: [
      'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
      'M..........................................M',
      'M................MMM...~~~~~~~~....^.......M',
      'M..MMM...........MMM.~~~WWW~WW~~~~~........M',
      'M..MMM...............~WWWWWWWWWWWW~.....^..M',
      'M.....gg...^.........~~WWWWWWWWWWW~~,^g.^..M',
      'M...gggggg,g....^.^^..~WWWWWWWWWWWW~ggggg..M',
      'M.^gggggggg,.^........~~WWWWWWWWWWW~ggggg..M',
      'M.ggg^gggg^g...........~~WWWWWWWWW~~gggggg.M',
      'M.g,gggg^^ggg.g.g.....^.~~~~WW~W~~~gggggg..M',
      'M.^.ggggggg..g,gg^g.....^^.~~~~~~ggg^g^,^..M',
      'M.....gg.g.^gg,gg^,...........^..^...gg....M',
      'M..........g^g,ggggg......^..^.............M',
      'M......^.^..gggggggg.........MMM.^.........M',
      'M..........^.gggg^,..........MMM..^........M',
      'M....^.......gg.g.....g.gg......^.....MMM..M',
      'M.......^............gggggggg.........MMM^.M',
      'M.....gg........^..g.gggggg,ggg....^..MMM..M',
      'M..ggggggg.........g.ggggggggggg......^....M',
      'M.,ggggg^g^.......gg.g,gggg^ggg............M',
      'M.^gg,ggg............ggggggggg,.g,^g.......M',
      'M.ggggggg..MMM^....ggg^^g,ggg,^gggggg......M',
      'M..g^g,gg..MMM......ggggggggg.ggggggg..^...M',
      'M....g^^.....^........,gg.g...gggg^gg......M',
      'M...............................gggg.......M',
      'MMMMMMMM..MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM'
    ],
    exits: []
  },
  gruva: {
    title: { no: 'GRUVA', en: 'THE MINE' },
    rows: [
      'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
      'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
      'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
      'MMMMMMMMMMMMMMMMMMMgggggggggggggggggMMMMMM',
      'MMMMMMMMMMMMMMMMMMMgMMMMMMMMMMMgggggMMMMMM',
      'MMMMMMMMgggggggggggggggggggMMMMgggggMMMMMM',
      'MMMMMMMOgMMMMMMMMMMgMMMMMMgMMMMgMMMMMMMMMM',
      'MMMMMMMMgMMMMMMMMMMgMMMMMMgMMMMgMMMMMMMMMM',
      'MMMMMMMMgMMMMMggggggggggggggggggggggQMMMMM',
      'MMggMMMMgMMMMMgMMMMgMMMMMMMMMMMgMMMgMMMMMM',
      'MMgggggggOMMMMgMMMMgMMMMMMMMMMMgMMMgMMMMMM',
      'MMMgMMMMgMMMMMgMMMMgMMMMMMMMMMMgMMMgMMMMMM',
      'ggggggggggggggggggggggggggggggggMMMgMMMMMM',
      'gggggggggMMgMMMMMMMMOMgMMMMMMgMMMMMgMMMMMM',
      'MMMMMMgMMMMgMMMMMMMMMMgMMMMMMgMMMMMgMMMMMM',
      'MMMMMMgMMMMgMMMMMMMMMMgMMMMMMgMMMMMgMMMMMM',
      'MMMMMMgMMMMgMMMMMMMggggggggggggggggggMMMMM',
      'MMMMMMgMMMMgMMMMMMMgMMgMMMMMMMMMMMMMgMMMMM',
      'MMMMMMgMMMMgMMMMMMMgMMgMMMMMMMMMMMMMgMMMMM',
      'MMMMMQggggggggggggggggggggggggOMMMMMgMMMMM',
      'MMMMMMOMMMMgMMMMMMMQggggggMMMMMMMMMMgMMMMM',
      'MMMMMMMMMMMgOMMMMMMMggggggMMMMMgggggggMMMM',
      'MMMMMMMMMMMgggggggggggggggMMMMMMMMMMMMMMMM',
      'MMMMMMMMMMMQ.MMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
      'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
      'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM'
    ],
    exits: []
  },
  fjord: {
    title: { no: 'FJORDEN', en: 'THE FJORD' },
    rows: [
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'Tggggg,g,gggggg~WWWWMMWWWWWWWWWWWWWWWWWWWW',
      'Tggggg,gggggggg~WWWWMMWWWWWWWWWWWWWWWWWWWW',
      'TgggRRRRRggggg~WWWWWMMWWWWWWWWWWWWWWWWWWWW',
      'TgggHHHHHggggg~WWWWWMMWWWWWWWWWWWWWWWWWWWW',
      'TgggHHDHHgggg~WWWWWWMMWWWWWWWWWWWWWWWWWWWW',
      'Tggggg.gggg,g~WWWWWWMMWWWWWWWWWWWWWWWWWWWW',
      'Tgggg,.gggggg~WWWWWWWWWWWWWWWWWWWWWWWWWWWW',
      'Tggggg.ggggggg~WWWWWWWWWWWWWWWWWWWWWWWWWWW',
      'T,gYgg.ggggggg~WWWWWWWWWWWWWWWWWWWWWWWWWWW',
      'Tggggg.gggggggg~WWWWWWWWWWWWWWWWWWWWWWWWWW',
      'Tggggg.gggg,gggg~WWWWWWWWWWWWWWWWWWWWWWWWW',
      'Tggggg.......PPPPPWWWWWWWWWWWWWWWWWWWWWWWW',
      'Tggggg.gggggggg~WWWWWWWWWWWWWWWWWWWWWWWWWW',
      'Tggggg.ggggggg~WWWWWWWWWWWWWWWWWWWWWWWWWWW',
      'TggggF.gggFgg~WWWWWWWWWWWWWWWWWWWWWWWWWWWW',
      'Tggggg.gggggg~WWWWWWWWWWWWWWWWWWWWWWWWWWWW',
      'Tggggggggggggg~WWWWWWWWWWWWWWWWWWWWWWWWWWW',
      'TFGgggggggggggg~WWWWWWWWWWWWWWWWWWWWWWWWWW',
      'Tggg,ggggggggggg~WWWWWWWWWWWWWWWWWWWWWWWWW',
      'Tgggggg,gg,Fgggg~WWWWWWWWWWWWWWWWWWWWWWWWW',
      'TgggggggggYgggg~WWWWWWWWWWWWWWWWWWWWWWWWWW',
      'Tgggggggggggggg~WWWWWWWWWWWWWWWWWWWWWWWWWW',
      'Tggggggggggggggg~WWWWWWWWWWWWWWWWWWWWWWWWW',
      'TgggggggggFggggg~WWWWWWWWWWWWWWWWWWWWWWWWW',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT'
    ],
    exits: [],
    boat: { x: 17, y: 12, to: 'lake', tx: 19, ty: 8 }
  }
};
