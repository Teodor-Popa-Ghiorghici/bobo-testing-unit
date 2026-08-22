/* Bekkedal — what the two by the water say. One quarter of BEK_TALK; see
 * talk_town.js's header for the shape and the conventions.
 *
 * Ingrid wants the lake to still hold what it held, and will not talk about
 * why she came back. Olav wants to take the boat past the mouth once more,
 * and will not talk about the last time he tried.
 */

const VAR = 0, SOMMER = 1, HOST = 2, VINTER = 3;
const idle = S => !S.yst.farm && !S.yst.mine && !S.yst.fish && !S.yst.forage;
/* THE LOFT: how much has been carried into the storehouse on the square —
   read defensively, like every gate in these files. See BEK_LOFT (data.js). */
const loft = S => (S.spine && S.spine.d) ? Object.keys(S.spine.d).length : 0;

export const WATER_TALK = {
  ingrid: {
    nodes: [
      { id: 'i1',
        lines: [{ no: 'God kveld. Or morning. Out here it is the same.', en: 'Good evening. Or morning. Out here it is the same.' }],
        ask: { q: { no: 'Hvorfor fisker du?', en: 'Why do you fish?' }, opts: [
          { t: { no: 'For roen.', en: 'For the calm.' }, set: { fisk: 'ro' }, fr: 2,
            reply: ['Then stand at the end of the pier, not the middle.',
                    { no: 'The laks lie deep out there. Bring me three sopp', en: 'The salmon lie deep out there. Bring me three mushrooms' },
                    { no: 'and the old stang is yours.', en: 'and the old rod is yours.' }] },
          { t: { no: 'For maten.', en: 'For the food.' }, set: { fisk: 'mat' }, fr: 0,
            reply: ['Sensible. I will keep you fed while you learn.',
                    { no: 'Three sopp from the forest, and you get the stang.', en: 'Three mushrooms from the forest, and you get the rod.' }] }
        ] } },
      { id: 'i2', when: S => S.q.sopp === 'active',
        lines: [{ no: 'Three sopp. The skogen is full of them at dawn.', en: 'Three mushrooms. The forest is full of them at dawn.' }] },
      /* ---- her arc: the tally ---------------------------------------- */
      { id: 'ia1', when: S => S.fr.ingrid >= 2,
        lines: ['You watched me put that one back and said nothing. Good.',
                { no: 'Jeg teller. Det er alt. Ikke spør hva.', en: 'I count. That is all. Do not ask what.' }] },
      { id: 'ia2', when: S => S.fr.ingrid >= 4,
        lines: [{ no: 'Tolv år med streker i en bok. En strek per fisk over pundet.', en: 'Twelve years of marks in a book. One mark per fish over the pound.' },
                'Nobody asked me to. Nobody has read it.'] },
      { id: 'i3', mood: 'warm', when: S => S.fr.ingrid >= 6 && S.flag.fisk === 'ro',
        lines: ['You have learned to wait. That is all fishing is.'] },
      { id: 'i4', mood: 'warm', when: S => S.fr.ingrid >= 6 && S.flag.fisk === 'mat',
        lines: ['Here. You still eat like a man who forgets to.'],
        give: { vaffel: 2 } },
      { id: 'ia3', mood: 'troubled', when: S => S.fr.ingrid >= 6,
        lines: ['This year is short. Two hundred and nine marks by midsummer.',
                { no: 'Det burde vært over tre hundre. Det har vært det hvert år.', en: 'It should be over three hundred. It has been, every year.' },
                'I have stopped fishing the shallows. It has not helped.'] },
      /* the rod's own tier, same shape as Håkon's STÅLØKS node — offered once
         she trusts you with a line at all and stops the moment S.rodLv is 2 */
      { id: 'i4b', when: S => S.tools.stang && S.fr.ingrid >= 5 && S.rodLv < 2,
        lines: [{ no: 'That old stang bends too easy for anything with weight. I have a KARBONSTANG. 700 kr.',
                   en: 'That old rod bends too easy for anything with weight. I have a CARBON ROD. 700 kr.' }],
        buy: { label: { no: 'KARBONSTANG — 700 kr', en: 'CARBON ROD — 700 kr' }, kr: 700, rodLv: 2,
               ok: ['Stiffer in the hand. You will feel the difference on the next big one.'],
               no: ['700 kr. It will still be here.'] } },
      { id: 'i5', when: S => S.fr.ingrid >= 8,
        lines: [{ no: 'Røye run in the cold tarn up on the vidda. Colder, sweeter.', en: 'Char run in the cold tarn up on the plateau. Colder, sweeter.' }] },
      { id: 'ia4', when: S => S.fr.ingrid >= 8,
        lines: ['I walked up to the mine and asked Lars what runs out of it.',
                { no: 'Han viste meg. Rent vann. Det er ikke gruva.', en: 'He showed me. Clean water. It is not the mine.', m: 'troubled' },
                'So it is the lake, or it is me, and I know which I would rather.'] },
      { id: 'ia5', mood: 'warm', when: S => S.fr.ingrid >= 10,
        lines: ['Three hundred and forty by the frost. It came back.',
                { no: 'Vann gjør sånn. Tolv år for å lære en eneste ting.', en: 'Water does that. Twelve years to learn one thing.' },
                'Take the book. You will keep it better than I did.'],
        give: { orret: 2 }, set: { tally: 1 } }
    ],
    chat: [
      /* THE LOFT */
      { mood: 'warm', t: [{ no: 'Du bar en fisk inn på et museum. Bra. La dem se hva som bor her.', en: 'You carried a fish into a museum. Good. Let them see what lives here.' }],
        if: S => loft(S) >= 1 },
      { t: ['Still biting. Slowly.'] },
      { mood: 'troubled', t: ['The lot behind you has been empty a long time.'] },
      { t: ['Deep water, deep fish. Patience.'], if: S => S.flag.fisk === 'ro' },
      { mood: 'troubled', t: [{ no: 'Eat something that is not a potet.', en: 'Eat something that is not a potato.' }], if: S => S.flag.fisk === 'mat' },
      { t: ['Olav could take you to the fjord, if his boat floated.'], if: S => !S.flag.boat },
      /* ---- weather ---------------------------------------------------- */
      { mood: 'warm', t: [{ no: 'Regn. Da står fisken høyt og ser dårlig. Gå ut nå.', en: 'Rain. The fish sit high and see badly. Go out now.' }],
        if: S => S.weather === 'regn' },
      { t: [{ no: 'Tåke over vannet. Da hører man årer man ikke ser.', en: 'Fog on the water. You hear oars you cannot see.' }],
        if: S => S.weather === 'take' },
      { mood: 'troubled', t: ['Bright and still. Worst water there is. Come back at dusk.'],
        if: S => S.weather === 'klar' && S.min > 10 * 60 && S.min < 16 * 60 },
      /* ---- season ----------------------------------------------------- */
      { t: [{ no: 'Vår. Isen slapp for tre uker siden og de er sultne ennå.', en: 'Spring. The ice let go three weeks back and they are hungry still.' }],
        if: S => S.season === VAR },
      { t: ['Midsummer. It never gets dark enough for them to stop.'], if: S => S.season === SOMMER },
      { mood: 'troubled', t: [{ no: 'Høst. Nå går de dypt, og jeg står her likevel.', en: 'Autumn. Now they run deep, and I stand here anyway.' }],
        if: S => S.season === HOST },
      { t: [{ no: 'Vinter. Jeg hogger hull. Ikke spør om det er verdt det.', en: 'Winter. I cut a hole. Do not ask whether it is worth it.' }],
        if: S => S.season === VINTER },
      /* ---- the hour --------------------------------------------------- */
      { t: ['First light. The only hour that owes you anything.'], if: S => S.min < 7 * 60 },
      { mood: 'warm', t: [{ no: 'Skumring. Nå snur de. Stå stille i ti minutter.', en: 'Dusk. Now they turn. Stand still for ten minutes.' }],
        if: S => S.min >= 19 * 60 },
      /* ---- what you are carrying -------------------------------------- */
      { mood: 'warm', t: [{ no: 'En laks. Du sto på enden av brygga, altså.', en: 'A salmon. So you stood at the end of the pier.' }],
        if: S => (S.bag.laks || 0) > 0 },
      { t: [{ no: 'Sopp. De er til gryta, ikke til meg. Jeg har fått mine.', en: 'Mushrooms. Those are for the pot, not for me. I have had mine.' }],
        if: S => (S.bag.sopp || 0) > 0 && S.q.sopp !== 'active' },
      { mood: 'troubled', t: ['You are carrying nothing at all. That is a long walk for nothing.'],
        if: S => Object.keys(S.bag).filter(k => S.bag[k] > 0).length === 0 },
      /* ---- what you did yesterday ------------------------------------- */
      { mood: 'warm', t: ['You fished yesterday and you fished today. That is how it starts.'],
        if: S => S.yst.fish > 0 },
      { t: ['A day off. I have had twelve years without one. Do not copy me.'], if: idle },
      /* ---- quests open ------------------------------------------------ */
      { t: [{ no: 'Fire tømmer og to tau. Olav teller dem, tro meg.', en: 'Four timber and two rope. Olav counts them, believe me.' }],
        if: S => S.q.boat === 'active' },
      /* ---- the rest of the valley ------------------------------------- */
      { mood: 'warm', t: [{ no: 'Båten hans flyter. Den har flytt i årevis. Det er ikke båten.', en: 'His boat floats. It has floated for years. It is not the boat.' }],
        if: S => S.flag.boat },
      { t: ['Astrid asks after me twice a week and calls it stocktaking.'] },
      { t: [{ no: 'Lars kommer ned til vannet en gang i året og ser på det.', en: 'Lars comes down to the water once a year and looks at it.' }],
        if: S => S.disc && S.disc.gruva },
      { t: ['Sigrid sends cheese down with whoever is walking. It always arrives.'],
        if: S => S.disc && S.disc.setra },
      /* ---- what she will not talk about -------------------------------- */
      { mood: 'troubled', t: [{ no: 'Jeg dro herfra en gang. Det er alt du får.', en: 'I left here once. That is all you get.' }],
        if: S => S.fr.ingrid >= 6 },
      { t: ['Twelve years of marks. The first one is dated the week I came back.'],
        if: S => S.fr.ingrid >= 8 },
      { mood: 'warm', t: [{ no: 'Boken er din nå. Skriv med blyant. Vann tar blekk.', en: 'The book is yours now. Write in pencil. Water takes ink.' }],
        if: S => S.flag.tally },
      { t: [{ no: 'Du bygde nært nok til at jeg ser lykten din fra brygga.', en: 'You built close enough that I can see your lamp from the pier.' }],
        if: S => S.act2Unlocked },
      { mood: 'warm', t: ['Two lamps on this shore now. It was one for a long time.'],
        if: S => S.act2Unlocked && S.flag.tally },
      /* ---- the festival, and the rest of the valley -------------------- */
      { t: [{ no: 'Festdag. Jeg går ned en time, sier hei, og kommer hit igjen.', en: 'Festival day. I go down for an hour, say hello, and come back here.' }],
        if: S => !!S.festival },
      { t: ['A whole square full of people. I can manage that once a season.'], if: S => !!S.festival },
      { mood: 'warm', t: [{ no: 'Multe i sekken. De er Sigrids, ikke mine. Jeg har fisk.', en: 'Cloudberries in the bag. Those are Sigrid’s, not mine. I have fish.' }],
        if: S => (S.bag.multe || 0) > 0 },
      { t: [{ no: 'Poteter til Astrid. Gå nå, før hun stenger for kaffe.', en: 'Potatoes for Astrid. Go now, before she shuts for coffee.' }],
        if: S => S.q.potet === 'active' },
      { t: ['Håkon offered to rebuild my landing. I said the old one still floats.'],
        if: S => S.fr.hakon >= 2 },
      { mood: 'troubled', t: [{ no: 'Marit har ikke vært nede ved vannet på to år. Hun sier hun husker det.', en: 'Marit has not been down to the water in two years. She says she remembers it.' }],
        if: S => S.disc && S.disc.enga },
      { t: ['Stand still ten minutes and the lake forgets you are there. That is the trick.'],
        if: S => S.fr.ingrid >= 4 },
      { mood: 'warm', t: [{ no: 'Du står stille lenger enn du gjorde. Jeg legger merke til sånt.', en: 'You stand still longer than you used to. I notice that sort of thing.' }],
        if: S => S.fr.ingrid >= 8 },
      { t: ['That rod was old when it was given to me. Do not break it.'],
        if: S => S.q.sopp === 'done' }
    ]
  },

  olav: {
    nodes: [
      { id: 'o1', mood: 'troubled',
        lines: ['The boat leaks. Everything out here leaks, eventually.'],
        ask: { q: { no: 'Fjorden, eller havet?', en: 'The fjord, or the open sea?' }, opts: [
          { t: { no: 'Havet. Jeg vil ha de store.', en: 'The open sea. I want the big ones.' }, set: { sea: 'hav' }, fr: 2,
            reply: [{ no: 'A bold answer. Makrell run in shoals out past the mouth.', en: 'A bold answer. Mackerel run in shoals out past the mouth.' },
                    { no: 'Fix my boat and I will point you at them. Four tømmer, two tau.', en: 'Fix my boat and I will point you at them. Four timber, two rope.' }] },
          { t: { no: 'Fjorden. Rolig vann passer meg.', en: 'The fjord. Calm water suits me.' }, set: { sea: 'fjord' }, fr: 0,
            reply: [{ no: 'Sensible. Torsk sit still and wait, like you.', en: 'Sensible. Cod sit still and wait, like you.' },
                    { no: 'Patch the boat — four tømmer, two tau — and it is yours to borrow.', en: 'Patch the boat — four timber, two rope — and it is yours to borrow.' }] }
        ] } },
      { id: 'o2', when: S => S.q.boat === 'active',
        lines: [{ no: 'Four tømmer, two tau. Astrid sells the tau.', en: 'Four timber, two rope. Astrid sells the rope.' }] },
      /* ---- his arc: past the mouth ----------------------------------- */
      { id: 'oa1', when: S => S.fr.olav >= 2,
        lines: ['You keep looking at the horizon. It is only more of this.',
                { no: 'Munningen er der. Etter den er det ikke fjord lenger.', en: 'The mouth is out there. Past it, it is not a fjord any more.' }] },
      { id: 'o3', when: S => S.flag.boat && S.fr.olav >= 6 && S.flag.sea === 'hav',
        lines: [{ no: 'Cast off the end of the dock. The makrell will find you.', en: 'Cast off the end of the dock. The mackerel will find you.' }] },
      { id: 'o4', mood: 'warm', when: S => S.flag.boat && S.fr.olav >= 6 && S.flag.sea === 'fjord',
        lines: ['Warm soup, for the crossings. You will thank me.'],
        give: { fiskesuppe: 1 } },
      { id: 'oa2', when: S => S.fr.olav >= 4,
        lines: [{ no: 'Denne båten har vært lappet i elleve år. Aldri bygget om.', en: 'This boat has been patched eleven years. Never rebuilt.' },
                'A patch you can do alone. A rebuild you cannot.'] },
      { id: 'oa3', mood: 'troubled', when: S => S.fr.olav >= 6,
        lines: ['I took her out last spring. Got to the mouth.',
                { no: 'Så snudde jeg. Rolig sjø, god vind, ingen grunn.', en: 'Then I turned. Calm sea, fair wind, no reason.' },
                'I rowed back in and told nobody. Now I have told you.'] },
      { id: 'oa4', when: S => S.fr.olav >= 8,
        lines: [{ no: 'Bli med meg ut. Du ror. Jeg sitter i baugen.', en: 'Come out with me. You row. I sit in the bow.' },
                'A man will do at the oar what he will not do at the tiller.'] },
      { id: 'oa5', mood: 'warm', when: S => S.fr.olav >= 10,
        lines: ['We went past the mouth. You saw. There was nothing to it.',
                { no: 'Elleve år for tjue meter åpent vann.', en: 'Eleven years for twenty metres of open water.' },
                'Take the makrell. I have more than I can salt.'],
        give: { makrell: 3 }, set: { munning: 1 } }
    ],
    chat: [
      /* THE LOFT */
      { t: [{ no: 'Loftet fylles. Jeg går forbi og ser inn, og lar være å si noe.', en: 'The loft is filling. I walk past and look in, and say nothing about it.' }],
        if: S => loft(S) >= 24 },
      { mood: 'troubled', t: ['Water finds every gap you leave it.'] },
      { t: ['The pier is Ingrid’s. The dock at the fjord is mine.'] },
      { mood: 'warm', t: [{ no: 'Båten flyter nå. Ta den når du vil. Enden av brygga, trykk handling.', en: 'Boat floats now. Take it whenever. Pier’s end, press act.' }], if: S => S.flag.boat },
      /* ---- weather ---------------------------------------------------- */
      { mood: 'troubled', t: [{ no: 'Regn er ingenting. Vind er noe. I dag er det regn.', en: 'Rain is nothing. Wind is something. Today it is rain.' }],
        if: S => S.weather === 'regn' },
      { mood: 'troubled', t: [{ no: 'Tåke. Ingen går ut i tåke. Ikke engang jeg later som.', en: 'Fog. Nobody goes out in fog. Not even I pretend to.' }],
        if: S => S.weather === 'take' },
      { t: ['Clear and flat. No excuse in that at all.'], if: S => S.weather === 'klar' },
      /* ---- season ----------------------------------------------------- */
      { t: [{ no: 'Vår. Smeltevann gjør fjorden brakk helt ut til munningen.', en: 'Spring. Meltwater turns the fjord brackish right out to the mouth.' }],
        if: S => S.season === VAR },
      { mood: 'warm', t: ['Summer. The mackerel come in so thick you can hear them.'], if: S => S.season === SOMMER },
      { t: [{ no: 'Høst. Da er torsken feit og sjøen begynner å mene noe.', en: 'Autumn. The cod are fat and the sea begins to mean something.' }],
        if: S => S.season === HOST },
      { mood: 'troubled', t: ['Winter. She stays on the trestles. I stand and look at her.'],
        if: S => S.season === VINTER },
      /* ---- the hour --------------------------------------------------- */
      { t: [{ no: 'For tidlig. Tidevannet snur ikke før om to timer.', en: 'Too early. The tide does not turn for two hours.' }],
        if: S => S.min < 8 * 60 },
      { t: ['Late. Come back when the light is on the water, not under it.'], if: S => S.min >= 20 * 60 },
      /* ---- what you are carrying -------------------------------------- */
      { mood: 'warm', t: [{ no: 'Torsk. Du satt stille lenge nok. Det er hele kunsten.', en: 'Cod. You sat still long enough. That is the whole art.' }],
        if: S => (S.bag.torsk || 0) > 0 },
      { mood: 'warm', t: [{ no: 'Kveite. Den kom ikke inn i fjorden av seg selv, og ikke du heller.', en: 'Halibut. That did not come into the fjord by itself, and nor did you.' }],
        if: S => (S.bag.kveite || 0) > 0 },
      { t: [{ no: 'Tau i sekken. Det er alltid riktig svar.', en: 'Rope in the bag. That is always the right answer.' }],
        if: S => (S.bag.tau || 0) > 0 },
      /* ---- what you did yesterday ------------------------------------- */
      { t: ['You were on the water yesterday. I saw the wake and knew it was not mine.'],
        if: S => S.yst.fish > 0 },
      { mood: 'troubled', t: ['You did nothing yesterday. So did I. Do not make a habit of us.'], if: idle },
      /* ---- the rest of the valley ------------------------------------- */
      { t: [{ no: 'Ingrid teller fisk i en bok. Hun tror ingen vet det.', en: 'Ingrid counts fish in a book. She thinks nobody knows.' }] },
      { t: ['Håkon says patch it properly or build it again. He is right. That is the trouble.'] },
      { t: [{ no: 'Gunnar kom ned en eneste gang og så på sjøen i en time. Så gikk han opp igjen.', en: 'Gunnar came down once and looked at the sea for an hour. Then he walked back up.' }],
        if: S => S.disc && S.disc.vidda },
      /* ---- what he will not talk about --------------------------------- */
      { mood: 'troubled', t: ['There were two of us in this boat once. Do not.'], if: S => S.fr.olav >= 6 },
      { t: [{ no: 'Jeg lappet den samme planken tre ganger. Det holdt hver gang.', en: 'I patched the same plank three times. It held every time.' }],
        if: S => S.fr.olav >= 8 },
      { mood: 'warm', t: [{ no: 'Munningen er bare vann. Det tok elleve år å finne ut.', en: 'The mouth is only water. It took eleven years to find that out.' }],
        if: S => S.flag.munning },
      { t: [{ no: 'Et hus ved vannet finner sine egne lekkasjer også, med tiden. Sjekk taket.', en: 'A house by the water finds its own leaks eventually too. Mind the roof.' }],
        if: S => S.act2Unlocked },
      /* ---- the festival, and the rest of the valley -------------------- */
      { t: [{ no: 'Festdag. Jeg står bakerst og ser på. Det holder.', en: 'Festival day. I stand at the back and watch. That will do.' }],
        if: S => !!S.festival },
      { mood: 'warm', t: ['Astrid brings me coffee at the fair and will not take money for it.'],
        if: S => !!S.festival },
      { t: [{ no: 'Fiskesuppe varmer lenger enn en genser. Spør Sigrid.', en: 'Fish soup keeps you warm longer than a sweater. Ask Sigrid.' }],
        if: S => (S.bag.fiskesuppe || 0) > 0 },
      { mood: 'troubled', t: ['You have a rod and no boat. Half a fisherman, that.'],
        if: S => S.tools.stang && !S.flag.boat },
      { t: [{ no: 'Fire tømmer. Ikke tre. Jeg har prøvd med tre.', en: 'Four timber. Not three. I have tried it with three.' }],
        if: S => S.q.boat === 'active' },
      { t: ['Sigrid sends wool down for the crossings. I never asked her to.'],
        if: S => S.disc && S.disc.setra },
      { mood: 'troubled', t: [{ no: 'Lars går forbi hver høst og ser på båten. Han sier aldri noe.', en: 'Lars walks past every autumn and looks at the boat. He never says anything.' }],
        if: S => S.disc && S.disc.gruva },
      { t: ['Marit blessed this boat once. It has leaked ever since. She finds that funny.'],
        if: S => S.fr.marit >= 4 },
      { mood: 'warm', t: [{ no: 'Du har rodd nok til at armene dine vet det. Bra.', en: 'You have rowed enough that your arms know it. Good.' }],
        if: S => S.fr.olav >= 8 },
      { t: [{ no: 'Skorsteinen din ryker om morgenen. Jeg ser den fra dokka.', en: 'Your chimney smokes in the morning. I can see it from the dock.' }],
        if: S => S.act2Unlocked && S.houseTier > 0 },
      { mood: 'troubled', t: ['A boat is a hole in the water you keep filling with days.'] },
      { t: [{ no: 'Ta med tau uansett hvor du skal. Det er alltid tauet du mangler.', en: 'Carry rope whatever you are doing. It is always the rope you are short of.' }] }
    ]
  }
};
