export const CK_SAVE = 'templeos.cook.v1';
export const CK_W = 19, CK_H = 11, CK_T = 20;    /* the bench, in cells and pixels */

/* ---- 33.1 the ten cooks, every one of them proved solvable ------------- */
export const CK_LV = [
{ id:1, par:4, par:4, n:'THE FIRST BATCH', sub:'Two reagents, one flask, and nothing in the way.',
  grid:[
  '###################',
  '#.................#',
  '#.................#',
  '#.................#',
  '#........T........#',
  '#.................#',
  '#.................#',
  '#.................#',
  '#..O..............#',
  '#.................#',
  '###################'],
  reg:[ {n:'ACETONE', d:[3,0], uses:4, c:11},
        {n:'LYE',     d:[0,-2], uses:4, c:14} ] },

{ id:2, par:4, par:4, n:'GLASSWARE', sub:'The bench is not empty any more. Go round it.',
  grid:[
  '###################',
  '#.................#',
  '#....#######......#',
  '#....#.....#......#',
  '#....#..T..#......#',
  '#....#.....#......#',
  '#....###.###......#',
  '#.................#',
  '#..O..............#',
  '#.................#',
  '###################'],
  reg:[ {n:'ACETONE', d:[3,0], uses:4, c:11},
        {n:'ETHER',   d:[2,0], uses:3, c:9},
        {n:'LYE',     d:[0,-2], uses:4, c:14} ] },

{ id:3, par:5, par:5, n:'THE RUIN', sub:'Touch the red and the batch is gone. Resetting costs you nothing.',
  grid:[
  '###################',
  '#.................#',
  '#..XXX..XXX..XXX..#',
  '#.................#',
  '#..XXX..XXX..XXX..#',
  '#...............T.#',
  '#..XXX..XXX..XXX..#',
  '#.................#',
  '#..XXX..XXX..XXX..#',
  '#..O..............#',
  '###################'],
  reg:[ {n:'ACETONE', d:[3,0],  uses:4, c:11},
        {n:'ETHER',   d:[2,0],  uses:4, c:9},
        {n:'AMINE',   d:[0,-3], uses:3, c:13},
        {n:'TOLUENE', d:[2,-2], uses:4, c:10} ] },

{ id:4, par:8, par:8, n:'THE MIRROR', sub:'Nothing on this shelf pours left. The mirrored plate is the only way back.',
  grid:[
  '###################',
  '#.................#',
  '#.................#',
  '#.......###.......#',
  '#..T....#.#...M...#',
  '#.......###.......#',
  '#.................#',
  '#.................#',
  '#.............O...#',
  '#.................#',
  '###################'],
  reg:[ {n:'ACETONE', d:[3,0],  uses:4, c:11},
        {n:'ETHER',   d:[2,0],  uses:4, c:9},
        {n:'LYE',     d:[0,-2], uses:3, c:14},
        {n:'AMINE',   d:[0,-3], uses:3, c:13},
        {n:'BENZENE', d:[0,3],  uses:3, c:5} ] },

{ id:5, par:5, par:5, n:'THE BLUE', sub:'A doubling plate. Twice as far, and twice as easy to overshoot.',
  grid:[
  '###################',
  '#.................#',
  '#..XXXXX...XXXXX..#',
  '#.................#',
  '#.................#',
  '#..O....D........T#',
  '#.................#',
  '#..XXXXX...XXXXX..#',
  '#.................#',
  '#.................#',
  '###################'],
  reg:[ {n:'ACETONE', d:[3,0],  uses:2, c:11},
        {n:'ETHER',   d:[2,0],  uses:4, c:9},
        {n:'AMINE',   d:[0,-3], uses:2, c:13},
        {n:'BENZENE', d:[0,3],  uses:2, c:5} ] },

{ id:6, par:7, par:7, n:'THE BURNER', sub:'Wax melts only when it is hot. Frost holds only when it is cold. The flask is behind both.',
  grid:[
  '###################',
  '#.................#',
  '#....#######......#',
  '#....#.....#......#',
  '#..O.*.....~.T....#',
  '#....#.....#......#',
  '#....#######......#',
  '#.................#',
  '#.................#',
  '#.................#',
  '###################'],
  temp0:1, heat:2, cool:2,
  reg:[ {n:'ETHER',   d:[2,0],  uses:6, c:9},
        {n:'ACETONE', d:[3,0],  uses:2, c:11},
        {n:'AMINE',   d:[0,-3], uses:2, c:13} ] },

{ id:7, par:3, par:3, n:'THE UNMARKED JAR', sub:'One bottle has no label. The only way to read it is to pour it.',
  grid:[
  '###################',
  '#..XXXX...XXXX....#',
  '#.................#',
  '#.....#######.....#',
  '#.....#.....#.....#',
  '#.....#..T..#.....#',
  '#.....#.....#.....#',
  '#.....#.#####.....#',
  '#..XXX.......XXX..#',
  '#..O..............#',
  '###################'],
  reg:[ {n:'ACETONE', d:[3,0],  uses:4, c:11},
        {n:'ETHER',   d:[2,0],  uses:4, c:9},
        {n:'BENZENE', d:[0,3],  uses:3, c:5},
        {n:'???',     d:[2,-2], uses:5, c:13, hidden:1} ] },

{ id:8, par:5, par:5, n:'THE SWEEP', sub:'Something crosses the bench once for every pour you make. Do not be standing in it.',
  grid:[
  '###################',
  '#.......M.........#',
  '#..XXX.......XXX..#',
  '#.................#',
  '#..XXX.......XXX..#',
  '#.............T...#',
  '#..XXX.......XXX..#',
  '#.................#',
  '#..O...S.....XXX..#',
  '#.................#',
  '###################'],
  sweep:[15, -1],
  reg:[ {n:'ETHER',   d:[2,0],  uses:5, c:9},
        {n:'AMINE',   d:[0,-3], uses:4, c:13},
        {n:'BENZENE', d:[0,3],  uses:3, c:5},
        {n:'???',     d:[3,-3], uses:4, c:12, hidden:1} ] },

{ id:9, par:13, par:13, n:'THREE STAGES', sub:'The flask will not take it until all three stages are done, in order.',
  grid:[
  '###################',
  '#.................#',
  '#..1....#....3....#',
  '#.......#.........#',
  '#.......#..XX.XX..#',
  '#.......#....2....#',
  '#.......#..XX.XX..#',
  '#.......#.........#',
  '#..O.........T....#',
  '#.................#',
  '###################'],
  cps:3,
  reg:[ {n:'ETHER',   d:[2,0],  uses:8, c:9},
        {n:'AMINE',   d:[0,-3], uses:6, c:13},
        {n:'BENZENE', d:[0,3],  uses:6, c:5},
        {n:'TOLUENE', d:[2,-2], uses:4, c:10} ] },

{ id:10, par:14, par:14, n:'ONE LAST TIME', sub:'Everything on the bench at once, and two bottles with no labels.',
  grid:[
  '###################',
  '#.................#',
  '#..1....*....3....#',
  '#.......#.........#',
  '#.......#..XX.XX..#',
  '#.......#....2....#',
  '#.......#..XX.XX..#',
  '#.......#.........#',
  '#..O....~....T....#',
  '#.................#',
  '###################'],
  cps:3, temp0:1, heat:2, cool:2, sweep:[17, -1],
  reg:[ {n:'ETHER',   d:[2,0],  uses:8, c:9},
        {n:'AMINE',   d:[0,-3], uses:7, c:13},
        {n:'???',     d:[2,-2], dt:[3,-3], uses:5, c:12, hidden:1},
        {n:'???',     d:[0,2],  dc:[0,3],  uses:6, c:4,  hidden:1} ] },

{ id:11, par:28, n:'THE ONE WHO KNOCKS', sub:'Nobody is left to cook it for. Do it anyway.', hidden:1,
  grid:[
  '###################',
  '#.................#',
  '#..1....#....3...M#',
  '#.......#.........#',
  '#.......#..XX.XX..#',
  '#.......#....2....#',
  '#.......#..XX.XX..#',
  '#.......#.........#',
  '#T.O....~....S....#',
  '#.................#',
  '###################'],
  cps:3, temp0:1, heat:2, cool:2, sweep:[15, -1],
  reg:[ {n:'ETHER',   d:[2,0],  uses:9, c:9},
        {n:'AMINE',   d:[0,-3], uses:7, c:13},
        {n:'???',     d:[2,-2], dt:[3,-3], uses:5, c:12, hidden:1},
        {n:'???',     d:[0,2],  dc:[0,3],  uses:8, c:4,  hidden:1} ] }

];

/* ---- 33.2 the story -------------------------------------------------------
   Ten chapters and an ending. Nobody in it has a name, because the archetypes
   are the point and because the show they come from does not need borrowing
   from that literally.
   ========================================================================== */
export const CK_STORY = [
  { sc:'class', t:'THE DIAGNOSIS',
    l:['He teaches chemistry to sixteen-year-olds who are not listening.',
       'On Tuesday a doctor uses the word inoperable and then keeps talking,',
       'and he does not hear any of the rest of it.',
       'He has been very good at one thing his whole life. Nobody paid him for it.'] },
  { sc:'rv', t:'THE FORMER STUDENT',
    l:['The kid failed his class twice and remembered him anyway.',
       'The kid has a van, a supplier, and no idea what he is doing.',
       '"You know chemistry," says the kid. "I know people."',
       'It is the worst offer he has ever accepted in under four seconds.'] },
  { sc:'desert', t:'THE FIRST BATCH',
    l:['Twenty miles out, where the road gives up.',
       'The kid wants to know why it has to be so exact.',
       'He does not answer, because the answer is that exact is the only part',
       'of his life he has ever been allowed to keep.'] },
  { sc:'meet', t:'THE DISTRIBUTOR',
    l:['A man in a warehouse holds the bag up to a window and says nothing',
       'for eleven seconds, which is the longest he has ever been listened to.',
       '"Who taught you this."',
       '"Nobody," he says, and means it as a boast, and it comes out as one.'] },
  { sc:'blue', t:'THE COLOUR',
    l:['It comes out blue. It should not come out blue.',
       'Nobody else can make it come out blue.',
       'By the end of the month the colour has a name on the street',
       'and the name is not his, and he minds that more than he expected.'] },
  { sc:'lab', t:'THE LAUNDRY',
    l:['Under a restaurant, behind a wall that opens.',
       'Stainless steel. Real glassware. A ventilation system that works.',
       'Everything he ever asked a school district for and was refused.',
       'He has never been happier and he does not say so out loud.'] },
  { sc:'badge', t:'THE BROTHER-IN-LAW',
    l:['At dinner the badge talks about the blue for twenty minutes.',
       '"Whoever this guy is, he is a genius. An absolute artist."',
       'He passes the potatoes.',
       'He is not frightened. He is something much worse, and it is pride.'] },
  { sc:'car', t:'THE KID FINDS OUT',
    l:['The kid has worked out what happened. Not all of it. Enough.',
       'He does not deny it. He explains it, carefully, the way he explains',
       'anything, and watches the explanation land on a person',
       'who used to look at him like he was a teacher.'] },
  { sc:'hole', t:'THE DESERT AGAIN',
    l:['Everything he built fits in the back of a car.',
       'Two men are dead over a barrel he will never spend.',
       'The road out here has not changed since the first batch.',
       'He is the only thing that has.'] },
  { sc:'empty', t:'ONE LAST TIME',
    l:['The lab is cold. Everything in it is somebody else\'s now.',
       'There is nothing to gain from doing this and he is going to do it',
       'perfectly anyway, because the doing of it perfectly is the only part',
       'that was ever really about him.'] }
];
export const CK_END = {
  t:'99.1%',
  l:['"You did it for the family," she says. It is not a question.',
     'He thinks about lying and finds he has run out.',
     '',
     '"I did it for me. I was good at it.',
     ' And I was really — I was alive."',
     '',
     'The glass is still warm. Somewhere a siren.',
     'The last batch is the cleanest thing he ever made.']
};

/* ---- 33.2b the kid --------------------------------------------------------
   The single thing every review of Bartender: The Right Mix comes back to is
   that failure produces a REACTION rather than a reset — "hilarious trial and
   error", "memorable moments". A puzzle you fail in silence is homework. A
   puzzle somebody watches you fail is a scene.

   So somebody watches. He is not much help and he never shuts up, and he is
   the reason a ruined batch is worth having.
   ========================================================================== */
export const CK_KID = {
  /* the batch is gone, and why */
  ruin_X: [
    'Yeah, that\'s — that\'s all over the floor now.',
    'Cool. Cool cool cool. That was the red one. The red one is bad.',
    'I feel like the red squares were pretty clear about it.',
    'You walked it straight through. On purpose? Was that on purpose?',
    'That\'s a whole batch. That\'s a whole — okay. Okay. Again.'
  ],
  ruin_sweep: [
    'They came through. You were standing in it. I told you it moves.',
    'It moves every time YOU move. That\'s the whole thing it does.',
    'Okay so we do NOT stand in the light. Noted. Writing that down.',
    'That is the second worst place you could have been standing.'
  ],
  wall: [
    'That\'s glass, man.',
    'It doesn\'t go there. I watched it not go there.',
    'Nothing happened. That was a nothing.',
    'You just poured that at a wall. Confidently.'
  ],
  /* mechanics, the first time they land */
  first_mirror: [
    'Whoa — okay, everything goes backwards now. Everything.',
    'It flipped. The whole shelf flipped. Is that supposed to happen?'
  ],
  first_double: [
    'That went twice as far. That plate does that. Once.',
    'Double. One time only, then it forgets.'
  ],
  first_solvent: [
    'Clean slate. Whatever was riding on that, it\'s gone.'
  ],
  first_hot: [
    'It\'s melting. The wax is actually melting.',
    'Hot. Okay. The wax opens and the frost locks. Obviously.'
  ],
  first_cold: [
    'Frost\'s open. But the wax just sealed itself back up, so.',
    'Cold. Which means we can go through there and not through there.'
  ],
  first_stage: [
    'One down. Flask won\'t take it till all three are done. In order.',
    'That\'s stage one. It\'s counting.'
  ],
  reveal: [
    'It\'s — huh. Okay. Now we know what that one does.',
    'Well now it\'s labelled. Cost us a pour to find out.',
    'That\'s what was in there. Was it worth it? Probably.'
  ],
  /* how it went */
  win_par: [
    'That\'s it. That is EXACTLY it. Not one drop wasted.',
    'You did that in the minimum. The actual minimum.',
    'Okay that was — yeah. Yeah, that was clean.'
  ],
  win_over: [
    'It worked. It was ugly, but it worked.',
    'We got there. Took the scenic route.',
    'Fine. Nobody asks how many tries. Nobody ever asks.'
  ],
  win_first: [
    'First go. FIRST GO. You just — okay.',
    'You didn\'t even test anything. You just looked at it and knew.'
  ],
  /* the anti-obtuse net: the reviews of The Witness that hurt are the ones
     about a game that explains nothing and calls that respect */
  stuck1: [
    'You want to just — try one and see? Nothing here bites twice.',
    'Reset\'s free. It has always been free. Use it.'
  ],
  stuck2: [
    'Hover a bottle. It draws you the line before you commit. It\'s free.',
    'Look at the dotted line before you pour. It tells you everything.'
  ],
  stuck3: [
    'Count it. Where you are, where the flask is, how far each bottle goes.',
    'It\'s arithmetic, man. It\'s just arithmetic with a hat on.',
    'What if the answer is you go the wrong way first?'
  ],
  idle: [
    'Take your time. Genuinely. Nothing is on a clock.',
    'You get that look when you\'ve already solved it and haven\'t noticed.',
    'I\'m not rushing you. I\'m just standing here. In a desert.'
  ]
};

/* ---- 33.3 the ledger ------------------------------------------------------ */
export const CK_ACH = [
  { id:'a1',  n:'FIRST COOK',      d:'Finish the first batch.' },
  { id:'a2',  n:'THE PARTNERSHIP', d:'Finish three levels.' },
  { id:'a3',  n:'THE BLUE',        d:'Finish five levels.' },
  { id:'a4',  n:'THE EMPIRE',      d:'Finish eight levels.' },
  { id:'a5',  n:'ONE LAST TIME',   d:'Finish all ten.' },
  { id:'a6',  n:'NINETY-NINE ONE', d:'Hit 99.1% on any level.' },
  { id:'a7',  n:'ARTISAN',         d:'Hit 99.1% on five levels.' },
  { id:'a8',  n:'THE ONE WHO KNOCKS', d:'Hit 99.1% on all ten.' },
  { id:'a9',  n:'NO NOTES',        d:'Solve a level first try, no resets.' },
  { id:'a10', n:'CLEAN BENCH',     d:'Solve five levels with no resets.' },
  { id:'a11', n:'RUINED',          d:'Ruin a batch. It happens.' },
  { id:'a12', n:'RUINED A LOT',    d:'Ruin twenty batches.' },
  { id:'a13', n:'READ THE JAR',    d:'Identify an unlabelled reagent.' },
  { id:'a14', n:'BOTH JARS',       d:'Identify both jars in the last level.' },
  { id:'a15', n:'THE BURNER',      d:'Melt a wax seal.' },
  { id:'a16', n:'COLD HANDS',      d:'Cross a frost seal.' },
  { id:'a17', n:'THROUGH THE GLASS', d:'Use a mirrored plate.' },
  { id:'a18', n:'NOT TODAY',       d:'Finish a level with the sweep two cells away.' },
  { id:'a19', n:'IN ORDER',        d:'Complete three stages in one run.' },
  { id:'a20', n:'THE MONEY',       d:'Bank a million.' },
  { id:'a21', n:'STILL HERE',      d:'Reset the same level ten times and finish it.' },
  { id:'a22', n:'I WAS ALIVE',     d:'Read the ending.' },
  { id:'a23', n:'TEN STARS',       d:'Finish all ten in par with nothing spilled.' },
  { id:'a24', n:'THE ONE WHO KNOCKS', d:'Finish the eleventh bench.' }
];

/* ---- 33.4 four tunes ------------------------------------------------------
   D minor pentatonic, mostly two notes at a time, a bass that does not move
   much and a lead that arrives late. It is desert music: the point of it is
   the space between the notes, and it gets less spacious as things go wrong.
   ========================================================================== */
export const CK_HZ = {
  D2:73.42, F2:87.31, G2:98.00, A2:110.00, Bb2:116.54, C3:130.81,
  D3:146.83, E3:164.81, F3:174.61, G3:196.00, A3:220.00, Bb3:233.08, C4:261.63,
  D4:293.66, E4:329.63, F4:349.23, G4:392.00, A4:440.00, Bb4:466.16, C5:523.25,
  D5:587.33, F5:698.46, G5:783.99, A5:880.00, C6:1046.50, D6:1174.66
};
export const CK_SONGS = {
  desert: { bpm: 62, len: 32,
    lead: [['D4',0,6],['F4',8,4],['G4',14,2],['A4',16,8],['F4',26,4]],
    bass: [['D2',0,8],['D2',8,8],['C3',16,8],['D2',24,8]],
    pad:  [['D3',0,16],['A3',0,16],['C4',16,8],['G3',16,8],['D3',24,8],['A3',24,8]],
    arp:  [['D5',0,2],['A4',10,2],['F4',20,2],['D5',28,2]] },
  cook: { bpm: 84, len: 32,
    lead: [['A4',0,3],['C5',3,1],['D5',4,4],['C5',8,2],['A4',10,2],['G4',12,4],
           ['F4',16,3],['G4',19,1],['A4',20,4],['D5',24,4],['A4',28,4]],
    bass: [['D2',0,4],['D2',4,2],['F2',6,2],['G2',8,4],['G2',12,4],
           ['Bb2',16,4],['A2',20,4],['D2',24,4],['D2',28,4]],
    pad:  [['D3',0,8],['F3',0,8],['G3',8,8],['Bb3',8,8],['Bb3',16,8],['D4',16,8],['A3',24,8],['D4',24,8]],
    arp:  [['D5',0,1],['A4',4,1],['F5',8,1],['D5',12,1],['G5',16,1],['D5',20,1],['A4',24,1],['D5',28,1]] },
  heat: { bpm: 112, len: 24,
    lead: [['D5',0,2],['F5',2,1],['D5',3,1],['C5',4,2],['A4',6,2],['D5',8,2],['G5',10,2],
           ['F5',12,4],['D5',16,2],['C5',18,2],['A4',20,4]],
    bass: [['D2',0,2],['D2',2,1],['D2',4,2],['C3',6,1],['Bb2',8,2],['Bb2',10,1],
           ['A2',12,2],['A2',14,1],['D2',16,2],['D2',18,1],['G2',20,2],['A2',22,1]],
    pad:  [['D4',0,6],['A4',0,6],['Bb3',6,6],['F4',6,6],['A3',12,6],['E4',12,6],['D4',18,6],['A4',18,6]],
    arp:  [['D6',0,1],['A5',1,1],['F5',2,1],['D5',3,1],['A5',4,1],['F5',5,1],['D5',6,1],['A4',7,1],
           ['Bb4',8,1],['D5',9,1],['F5',10,1],['Bb4',11,1],['A4',12,1],['C5',13,1],['E5',14,1],['A4',15,1],
           ['D5',16,1],['F5',17,1],['A5',18,1],['D6',19,1],['A5',20,1],['F5',21,1],['D5',22,1],['A4',23,1]] },
  fall: { bpm: 54, len: 32,
    lead: [['D5',0,8],['C5',8,4],['Bb4',12,4],['A4',16,8],['F4',24,4],['D4',28,4]],
    bass: [['D2',0,16],['Bb2',16,8],['A2',24,8]],
    pad:  [['D3',0,16],['F3',0,16],['Bb2',16,8],['D3',16,8],['A2',24,8],['E3',24,8]],
    arp:  [['D5',0,4],['F4',12,4],['D4',24,4]] }
};
