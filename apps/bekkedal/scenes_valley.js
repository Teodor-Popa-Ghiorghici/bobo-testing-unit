/* Bekkedal — the heart events of the four on the valley floor.
 *
 * Content only. The shape of a definition, and every gate it may carry, is
 * documented in scene.js, which is the only thing that reads this table.
 * Three per character, at friendship 4, 7 and 10, stated in that order:
 * sceneFor() takes the first unfired one whose gates pass, so a player who
 * crossed 7 without ever standing in the square at six in the morning still
 * gets the four-scene first.
 *
 * Every tile named here — `stand`, and each `cast` entry — is checked as a
 * real standable square by world_check.js, and checked against everybody
 * else's schedule by schedule_check.js, so no scene ever stands somebody in
 * a wall or on top of a person who is merely keeping their own hours.
 */
export const VALLEY_SCENES = [
  /* ---- Astrid: the order book ------------------------------------------ */
  { id: 'astrid4', npc: 'astrid', at: 4, map: 'town', from: 6 * 60, to: 9 * 60,
    anchor: [6, 15], r: 7, stand: [6, 16], face: 1,
    cast: [{ id: 'astrid', x: 6, y: 14, dir: 0 }, { id: 'hakon', x: 8, y: 14, dir: 2 }],
    gain: 1,
    beats: [
      { who: 'astrid', lines: ['You are up before the shop is. Good. Take an end.'] },
      { who: 'astrid', lines: [{ no: 'Elleve kasser fra vognen. Jeg bestilte fjorten.', en: 'Eleven crates off the cart. I ordered fourteen.' },
                               'Nobody has told the city we are smaller than we were.'] },
      { who: 'hakon', lines: ['Mm.'] },
      { who: 'astrid', mood: 'warm',
        lines: [{ no: 'Han sier det hver eneste morgen. I elleve år.', en: 'He says that every single morning. For eleven years.' },
                'One day he will say something else and I will drop a crate.'] },
      { who: 'astrid', mood: 'warm', lines: ['Go on. The kettle has been on since five.'] }
    ] },
  { id: 'astrid7', npc: 'astrid', at: 7, map: 'town', from: 19 * 60, to: 22 * 60,
    anchor: [6, 15], r: 7, stand: [5, 16], face: 1,
    cast: [{ id: 'astrid', x: 5, y: 14, dir: 0 }],
    gain: 1,
    beats: [
      { who: 'astrid', mood: 'troubled', lines: ['The shop is shut. The book is not.'] },
      { who: 'astrid', lines: [{ no: 'Førti på bestillingen. Tjueni i dalen. Du vet det nå.', en: 'Forty on the order. Twenty-nine in the valley. You know that now.' }] },
      { who: 'astrid', mood: 'troubled', lines: ['The page before this one says thirty-four. I keep the old pages.'] },
      { who: 'astrid', lines: ['Two names at the top of this book, and I answer to one.',
                               { no: 'Nei. Ikke i kveld.', en: 'No. Not tonight.' }] },
      { who: 'astrid', lines: ['Walk home. It is late and I have arithmetic.'] }
    ] },
  { id: 'astrid10', npc: 'astrid', at: 10, map: 'town', from: 12 * 60, to: 14 * 60,
    anchor: [7, 15], r: 7, stand: [8, 16], face: 1,
    cast: [{ id: 'astrid', x: 8, y: 14, dir: 0 }, { id: 'ingrid', x: 10, y: 14, dir: 2 }],
    gain: 1, set: { astridBok: 1 },
    beats: [
      { who: 'astrid', mood: 'warm', lines: [{ no: 'Vognen kom. Små kasser, hver eneste en.', en: 'The cart came. Small crates, every one of them.' }] },
      { who: 'ingrid', lines: [{ no: 'Salt. Og for en gangs skyld har du riktig mengde.', en: 'Salt. And for once you have the right amount.' }] },
      { who: 'astrid', lines: ['Nothing left to go soft on the shelf. Eleven years to learn that.'] },
      { who: 'astrid', mood: 'warm', lines: [{ no: 'Nederst står det kaffe. Tre poser. Den linjen er din.', en: 'At the bottom it says coffee. Three bags. That line is yours.' }] }
    ] },

  /* ---- Håkon: one thing that outlasts him ------------------------------ */
  { id: 'hakon4', npc: 'hakon', at: 4, map: 'town', from: 9 * 60, to: 12 * 60,
    anchor: [7, 15], r: 7, stand: [10, 16], face: 1,
    cast: [{ id: 'hakon', x: 10, y: 14, dir: 0 }, { id: 'astrid', x: 12, y: 14, dir: 2 }],
    gain: 1,
    beats: [
      { who: 'hakon', lines: ['Mm. Hold that end and do not talk.'] },
      { who: 'astrid', lines: ['He has been squaring that beam two hours. It was square after ten minutes.'] },
      { who: 'hakon', lines: [{ no: 'Den er rett nå. Før var den nær nok.', en: 'It is true now. Before, it was near enough.' }] },
      { who: 'hakon', mood: 'troubled', lines: ['Forty-one jobs in this valley. I could walk you to all of them before dark.'] },
      { who: 'hakon', lines: ['That is not a boast. Walk it and you will see why.'] }
    ] },
  { id: 'hakon7', npc: 'hakon', at: 7, map: 'town', from: 15 * 60, to: 18 * 60,
    anchor: [8, 15], r: 8, stand: [14, 16], face: 1,
    cast: [{ id: 'hakon', x: 14, y: 14, dir: 0 }],
    gain: 1,
    beats: [
      { who: 'hakon', lines: ['Stand here. Look west. Then north. Then at your feet.'] },
      { who: 'hakon', lines: [{ no: 'Et skjul, en innhegning, et utedo. Tre ting som er mine.', en: 'A shed, a pen, a privy. Three things that are mine.' }] },
      { who: 'hakon', mood: 'troubled', lines: ['Fifty years from now not one of the three is standing.'] },
      { who: 'hakon', lines: ['I am not asking for pity. I am telling you what a man counts.'] }
    ] },
  /* the payoff, and it is not in town: the stave church on the meadow, where
     Marit's own arc has been pointing since her first admission */
  { id: 'hakon10', npc: 'hakon', at: 10, map: 'enga', from: 12 * 60, to: 15 * 60,
    anchor: [12, 8], r: 8, stand: [11, 9], face: 1,
    cast: [{ id: 'hakon', x: 11, y: 8, dir: 0 }, { id: 'marit', x: 10, y: 8, dir: 3 }],
    gain: 1, set: { mone: 1 },
    beats: [
      { who: 'hakon', lines: ['Mind the scaffold. It is mine, and it is better than the church.'] },
      { who: 'marit', mood: 'warm', lines: [{ no: 'Han har vært her i fire dager og sagt elleve ord.', en: 'He has been up here four days and said eleven words.' }] },
      { who: 'hakon', lines: [{ no: 'Furu. Kjerneved. Felt i januar, tørket i seks år under mitt eget tak.', en: 'Pine. Heartwood. Felled in January, dried six years under my own roof.' }] },
      { who: 'hakon', lines: ['I was keeping it for something. I did not know what until she wrote.'] },
      { who: 'hakon', mood: 'warm', lines: ['It will hold four hundred winters. Now stop looking at me.'] }
    ] },

  /* ---- Ingrid: the tally ----------------------------------------------- */
  { id: 'ingrid4', npc: 'ingrid', at: 4, map: 'lake', from: 5 * 60, to: 8 * 60,
    anchor: [10, 10], r: 9, stand: [10, 9], face: 1,
    cast: [{ id: 'ingrid', x: 10, y: 8, dir: 0 }],
    gain: 1,
    beats: [
      { who: 'ingrid', lines: ['You are early. Stand there and do not cast.'] },
      { who: 'ingrid', lines: [{ no: 'Se. Den er over pundet. Den blir en strek.', en: 'Look. That one is over the pound. That one becomes a mark.' }] },
      { who: 'ingrid', lines: ['Under the pound goes back and gets nothing. Not even a number.'] },
      { who: 'ingrid', mood: 'troubled', lines: [{ no: 'Ikke spør hva boken er til. Spør igjen om et år.', en: 'Do not ask what the book is for. Ask again in a year.' }] }
    ] },
  { id: 'ingrid7', npc: 'ingrid', at: 7, map: 'lake', from: 18 * 60, to: 21 * 60,
    anchor: [10, 10], r: 9, stand: [12, 9], face: 1,
    cast: [{ id: 'ingrid', x: 12, y: 8, dir: 0 }, { id: 'olav', x: 14, y: 8, dir: 2 }],
    gain: 1,
    beats: [
      { who: 'ingrid', mood: 'troubled', lines: ['Two hundred and nine, and it is midsummer. It should be past three hundred.'] },
      { who: 'olav', lines: [{ no: 'Vannet gjør som det vil. Det har det alltid gjort.', en: 'The water does as it likes. It always has.' }] },
      { who: 'ingrid', lines: ['That is what a man says who counts nothing.'] },
      { who: 'olav', lines: ['Mm.'] },
      { who: 'ingrid', mood: 'troubled', lines: ['If it is not the mine and not the weather, then it is me standing here.'] }
    ] },
  { id: 'ingrid10', npc: 'ingrid', at: 10, map: 'lake', from: 12 * 60, to: 15 * 60,
    anchor: [10, 10], r: 9, stand: [11, 9], face: 1,
    cast: [{ id: 'ingrid', x: 11, y: 8, dir: 0 }],
    gain: 1, set: { tally: 1 },
    beats: [
      { who: 'ingrid', mood: 'warm', lines: ['Three hundred and forty by the frost. It came back on its own.'] },
      { who: 'ingrid', lines: [{ no: 'Tolv år for å lære at vann gjør sånn.', en: 'Twelve years to learn that water does that.' }] },
      { who: 'ingrid', lines: ['Take the book. Write in pencil. Ink runs and you will be sorry.'] },
      { who: 'ingrid', mood: 'warm', lines: ['The first page is dated. You will work the rest out yourself.'] }
    ] },

  /* ---- Olav: past the mouth -------------------------------------------- */
  { id: 'olav4', npc: 'olav', at: 4, map: 'lake', from: 8 * 60, to: 11 * 60,
    anchor: [10, 10], r: 9, stand: [12, 9], face: 1,
    cast: [{ id: 'olav', x: 12, y: 8, dir: 0 }, { id: 'ingrid', x: 14, y: 8, dir: 2 }],
    gain: 1,
    beats: [
      { who: 'olav', lines: ['Put your hand on that plank. Then that one. Then that one.'] },
      { who: 'olav', lines: [{ no: 'Tre lapper. Samme planke. Elleve år.', en: 'Three patches. The same plank. Eleven years.' }] },
      { who: 'ingrid', lines: ['A rebuild takes two men. He has known that for eleven years.'] },
      { who: 'olav', mood: 'troubled', lines: ['Nobody asked you.'] },
      { who: 'olav', lines: ['She is right. That is the trouble with her.'] }
    ] },
  { id: 'olav7', npc: 'olav', at: 7, map: 'fjord', from: 6 * 60, to: 12 * 60,
    anchor: [14, 12], r: 6, stand: [15, 12], face: 2,
    cast: [{ id: 'olav', x: 13, y: 12, dir: 3 }],
    gain: 1,
    beats: [
      { who: 'olav', mood: 'troubled', lines: ['That is the mouth. Twenty metres of it, and then it is not a fjord.'] },
      { who: 'olav', lines: [{ no: 'Jeg rodde hit i fjor vår. Blikkstille. God vind. Ingen grunn.', en: 'I rowed out here last spring. Flat calm. Fair wind. No reason.' }] },
      { who: 'olav', lines: ['Then I turned. Rowed back in. Told nobody.'] },
      { who: 'olav', mood: 'troubled', lines: ['Now I have told two people. You are the second one.'] }
    ] },
  { id: 'olav10', npc: 'olav', at: 10, map: 'fjord', from: 12 * 60, to: 18 * 60,
    anchor: [14, 12], r: 6, stand: [16, 12], face: 2,
    cast: [{ id: 'olav', x: 14, y: 12, dir: 3 }],
    gain: 1, set: { munning: 1 },
    beats: [
      { who: 'olav', lines: ['You row. I sit in the bow and say nothing. That was the arrangement.'] },
      { who: 'olav', lines: [{ no: 'Der. Vi er forbi. Det var hele greia.', en: 'There. We are past it. That was the whole of it.' }] },
      { who: 'olav', mood: 'warm', lines: ['Eleven years for twenty metres of open water.'] },
      { who: 'olav', lines: ['Do not say anything clever. Row.'] }
    ] }
];
