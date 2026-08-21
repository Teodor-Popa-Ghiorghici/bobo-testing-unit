/* Bekkedal — the heart events of the four past the treeline. The other half
 * of BEK_SCENES; see scenes_valley.js's header and scene.js for the shape.
 */
export const WILD_SCENES = [
  /* ---- Marit: the ridge beam ------------------------------------------- */
  { id: 'marit4', npc: 'marit', at: 4, map: 'enga', from: 6 * 60, to: 9 * 60,
    anchor: [12, 8], r: 8, stand: [13, 9], face: 1,
    cast: [{ id: 'marit', x: 13, y: 8, dir: 0 }],
    gain: 1,
    beats: [
      { who: 'marit', lines: ['Come round the west wall with me. Do not hurry.'] },
      { who: 'marit', lines: [{ no: 'Lukt. Kjenner du det? Søtt. Det er ikke bra.', en: 'Smell. Do you get it? Sweet. That is not a good thing.' }] },
      { who: 'marit', mood: 'troubled', lines: ['Wet rot in the ridge beam. Forty years. Possibly twenty.'] },
      { who: 'marit', lines: ['Now we walk back round and talk about flowers.'] }
    ] },
  { id: 'marit7', npc: 'marit', at: 7, map: 'enga', from: 15 * 60, to: 19 * 60,
    anchor: [12, 8], r: 8, stand: [12, 9], face: 1,
    cast: [{ id: 'marit', x: 12, y: 8, dir: 0 }],
    gain: 1,
    beats: [
      { who: 'marit', mood: 'troubled', lines: ['I wrote to the county. Twice.'] },
      { who: 'marit', lines: [{ no: 'De svarte høflig begge ganger. Det er verre enn ingenting.', en: 'They replied politely both times. That is worse than nothing.' }] },
      { who: 'marit', lines: ['There has been no parish here since I was fifty years old.'] },
      { who: 'marit', mood: 'troubled', lines: ['A building is not saved by letters. I knew that as I posted them.'] }
    ] },
  { id: 'marit10', npc: 'marit', at: 10, map: 'enga', from: 9 * 60, to: 12 * 60,
    anchor: [12, 8], r: 8, stand: [14, 9], face: 1,
    cast: [{ id: 'marit', x: 14, y: 8, dir: 0 }],
    gain: 1, set: { klokker: 1 },
    beats: [
      { who: 'marit', mood: 'warm', lines: ['Stand still. It is nearly the hour.'] },
      { who: 'marit', lines: [{ no: 'Begge to. Den lille har vært sprukken siden krigen og ringer likevel.', en: 'Both of them. The small one has been cracked since the war and rings anyway.' }] },
      { who: 'marit', mood: 'warm', lines: ['Eight hundred more winters. I see none of them.'] },
      { who: 'marit', lines: ['That is not a sad thing. Do not make it one.'] }
    ] },

  /* ---- Sigrid: the whole year up here ---------------------------------- */
  { id: 'sigrid4', npc: 'sigrid', at: 4, map: 'setra', from: 8 * 60, to: 12 * 60,
    anchor: [9, 9], r: 7, stand: [10, 9], face: 1,
    cast: [{ id: 'sigrid', x: 10, y: 8, dir: 0 }],
    gain: 1,
    beats: [
      { who: 'sigrid', lines: ['A hundred and twelve days. You asked. Nobody asks.'] },
      { who: 'sigrid', lines: [{ no: 'Jeg begynner å telle den dagen jeg går ned. Ikke den jeg går opp.', en: 'I start counting the day I come down. Not the day I go up.' }] },
      { who: 'sigrid', mood: 'troubled', lines: ['Work out for yourself which of the two is home.'] }
    ] },
  { id: 'sigrid7', npc: 'sigrid', at: 7, map: 'setra', from: 17 * 60, to: 20 * 60,
    anchor: [9, 9], r: 7, stand: [11, 9], face: 1,
    cast: [{ id: 'sigrid', x: 11, y: 8, dir: 0 }],
    gain: 1,
    beats: [
      { who: 'sigrid', mood: 'troubled', lines: ['Nineteen. Count them if you like. I have.'] },
      { who: 'sigrid', lines: [{ no: 'Mor hadde seksti. Med seksti kan man krangle om hvor man overvintrer.', en: 'Mother kept sixty. With sixty you can argue about where you winter.' }] },
      { who: 'sigrid', lines: ['With nineteen nobody argues. They simply stop expecting.'] },
      { who: 'sigrid', mood: 'troubled', lines: ['I would rather be argued with.'] }
    ] },
  /* her resolution is the one scene that is not where she works: winter, and
     winter is what puts her down on the valley floor (BEK_NPCS.sigrid's own
     season posts) */
  { id: 'sigrid10', npc: 'sigrid', at: 10, map: 'farm', from: 8 * 60, to: 12 * 60, season: 3,
    anchor: [5, 9], r: 6, stand: [4, 8], face: 0,
    cast: [{ id: 'sigrid', x: 4, y: 9, dir: 1 }],
    gain: 1, set: { valgte: 1 },
    beats: [
      { who: 'sigrid', mood: 'warm', lines: ['I wintered up there. Alone. Once.'] },
      { who: 'sigrid', lines: [{ no: 'Jeg klarte det. Det er hele svaret på spørsmålet.', en: 'I managed it. That is the entire answer to the question.' }] },
      { who: 'sigrid', lines: ['Then I came down anyway, this spring, on my own legs.'] },
      { who: 'sigrid', mood: 'warm', lines: ['There is a difference between having to and choosing to.'] }
    ] },

  /* ---- Gunnar: the crossings ------------------------------------------- */
  { id: 'gunnar4', npc: 'gunnar', at: 4, map: 'vidda', from: 7 * 60, to: 11 * 60,
    anchor: [21, 18], r: 7, stand: [21, 19], face: 1,
    cast: [{ id: 'gunnar', x: 21, y: 18, dir: 0 }],
    gain: 1,
    beats: [
      { who: 'gunnar', lines: ['Do not move. Look at the far side of the tarn. Count.'] },
      { who: 'gunnar', lines: [{ no: 'Fire flokker i år. Jeg har talt hver eneste en.', en: 'Four herds this year. I have counted every single one.' }] },
      { who: 'gunnar', mood: 'troubled', lines: ['When I came up here it was eleven. Same week. Same line across.'] }
    ] },
  { id: 'gunnar7', npc: 'gunnar', at: 7, map: 'vidda', from: 17 * 60, to: 21 * 60,
    anchor: [21, 18], r: 7, stand: [23, 19], face: 1,
    cast: [{ id: 'gunnar', x: 23, y: 18, dir: 0 }],
    gain: 1,
    beats: [
      { who: 'gunnar', mood: 'troubled', lines: ['Eighteen years of numbers, and they live in my head.'] },
      { who: 'gunnar', lines: [{ no: 'Ingen spør. Så blir de liggende her oppe sammen med meg.', en: 'Nobody asks. So they stay up here with me.' }] },
      { who: 'gunnar', lines: ['When I go, four becomes a thing nobody knew was four.'] },
      { who: 'gunnar', mood: 'troubled', lines: ['That is not self-pity. That is arithmetic.'] }
    ] },
  /* he comes down for this one, as far as the wood — and the bear is
     already standing in that clearing on his own account (BEK_NPCS.bjorn) */
  { id: 'gunnar10', npc: 'gunnar', at: 10, map: 'forest', from: 10 * 60, to: 16 * 60,
    anchor: [12, 11], r: 6, stand: [12, 12], face: 1,
    cast: [{ id: 'gunnar', x: 13, y: 11, dir: 2 }],
    gain: 1, set: { tall: 1 },
    beats: [
      { who: 'gunnar', lines: ['Do not point at him. He does not care for it.'] },
      { who: 'gunnar', lines: [{ no: 'Han feide her da jeg var tjue. Jeg forklarer det ikke.', en: 'He swept here when I was twenty. I do not explain it either.' }] },
      { who: 'gunnar', mood: 'warm', lines: ['A fifth herd crossed last week. In the dark. Wrong month entirely.'] },
      { who: 'gunnar', lines: ['I had written four. I had to cross it out.'] },
      { who: 'gunnar', mood: 'warm', lines: ['First number I have ever been glad to be wrong about.'] }
    ] },

  /* ---- Lars: the closed level ------------------------------------------ */
  { id: 'lars4', npc: 'lars', at: 4, map: 'gruva', from: 8 * 60, to: 12 * 60,
    anchor: [4, 10], r: 6, stand: [4, 10], face: 2,
    cast: [{ id: 'lars', x: 2, y: 10, dir: 3 }],
    gain: 1,
    beats: [
      { who: 'lars', lines: ['Hold the lantern lower. There. Read it.'] },
      { who: 'lars', lines: [{ no: 'Ni navn i kritt. De har stått der siden selskapet stengte.', en: 'Nine names in chalk. They have stood there since the company shut.' }] },
      { who: 'lars', lines: ['Eight of them walked out. I am the one who did not.'] },
      { who: 'lars', mood: 'troubled', lines: ['That is not loyalty. I want to know whether we were right.'] }
    ] },
  { id: 'lars7', npc: 'lars', at: 7, map: 'gruva', from: 15 * 60, to: 20 * 60,
    anchor: [4, 10], r: 6, stand: [5, 10], face: 2,
    cast: [{ id: 'lars', x: 3, y: 10, dir: 3 }],
    gain: 1,
    beats: [
      { who: 'lars', mood: 'troubled', lines: ['Past the third crosscut. Do not go past it.'] },
      { who: 'lars', lines: [{ no: 'Jeg stemper den igjen hver vår. Tjueen ganger nå.', en: 'I prop it shut every spring. Twenty-one times now.' }] },
      { who: 'lars', lines: ['Water behind it, or nothing behind it. Both answers cost the same.'] },
      { who: 'lars', mood: 'troubled', lines: ['So I do not get them. That is a decision, not cowardice.'] }
    ] },
  /* and his resolution is above ground, at his sister's dairy, which is the
     whole point of it */
  { id: 'lars10', npc: 'lars', at: 10, map: 'setra', from: 12 * 60, to: 16 * 60,
    anchor: [9, 9], r: 7, stand: [12, 9], face: 1,
    cast: [{ id: 'lars', x: 12, y: 8, dir: 0 }, { id: 'sigrid', x: 13, y: 8, dir: 2 }],
    gain: 1, set: { synk: 1 },
    beats: [
      { who: 'lars', lines: ['I came up. Do not make anything of it.'] },
      { who: 'sigrid', mood: 'warm', lines: [{ no: 'Han har vært her to ganger på tjue år. Jeg gjør noe ut av det.', en: 'He has been up here twice in twenty years. I am making something of it.' }] },
      { who: 'lars', lines: ['I opened the level. Two days. Dry as a boot.'] },
      { who: 'lars', lines: [{ no: 'Åtte meter, og så gråberg. Ni mann tok feil.', en: 'Eight metres, and then dead rock. Nine men were wrong.' }] },
      { who: 'lars', mood: 'warm', lines: ['Easier to carry than being right alone. Now she will not let me leave.'] }
    ] }
];
