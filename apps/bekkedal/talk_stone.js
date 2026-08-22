/* Bekkedal — what the two on the far side of the treeline say. One quarter
 * of BEK_TALK; see talk_town.js's header for the shape and the conventions.
 *
 * Gunnar wants the reindeer to keep crossing, and will not say the names of
 * the men he has carried down. Lars wants the vein the old crew was driving
 * for, and will not talk about the level he props shut every spring.
 */

const VAR = 0, SOMMER = 1, HOST = 2, VINTER = 3;
const idle = S => !S.yst.farm && !S.yst.mine && !S.yst.fish && !S.yst.forage;
/* THE LOFT: how much has been carried into the storehouse on the square —
   read defensively, like every gate in these files. See BEK_LOFT (data.js). */
const loft = S => (S.spine && S.spine.d) ? Object.keys(S.spine.d).length : 0;
const ore = S => (S.bag.jern || 0) + (S.bag.kobber || 0) + (S.bag.solv || 0);

export const STONE_TALK = {
  gunnar: {
    nodes: [
      { id: 'g1', mood: 'troubled',
        lines: ['Few come up onto the vidda on purpose. Fewer twice.'],
        ask: { q: { no: 'Do you trap up here, or watch?', en: 'Do you trap up here, or watch?' }, opts: [
          { t: { no: 'Trap. A living is a living.', en: 'Trap. A living is a living.' }, set: { fell: 'jakt' }, fr: 2,
            reply: [{ no: 'Honest. Tyttebær grow thick past the tarn. Sell them low, sell them often.', en: 'Honest. Lingonberries grow thick past the tarn. Sell them low, sell them often.' }] },
          { t: { no: 'Watch. It is enough to be here.', en: 'Watch. It is enough to be here.' }, set: { fell: 'sjaa' }, fr: 0,
            reply: ['Then you already understand the plateau. Reindeer at dusk, if you are still.'] }
        ] } },
      /* ---- his arc: the crossings ------------------------------------ */
      { id: 'ga1', when: S => S.fr.gunnar >= 2,
        lines: ['Twice, then. I said fewer, not none.',
                { no: 'Jeg fører ikke bok over folk. Bare over dyr.', en: 'I keep no record of people. Only of animals.' }] },
      { id: 'ga2', when: S => S.fr.gunnar >= 4,
        lines: ['Four herds crossed the tarn this year. I counted every one.',
                { no: 'Da jeg kom hit var det elleve. Samme uke, samme drag.', en: 'When I came up here it was eleven. Same week, same line.', m: 'troubled' }] },
      { id: 'ga3', mood: 'troubled', when: S => S.fr.gunnar >= 6,
        lines: ['I do not know why. That is the honest answer and it is no use.',
                { no: 'Ingen spør. Så teller jeg, og tallene blir liggende her oppe.', en: 'Nobody asks. So I count, and the numbers stay up here with me.' }] },
      { id: 'g2', mood: 'warm', when: S => S.fr.gunnar >= 6 && S.flag.fell === 'jakt',
        lines: [{ no: 'Take the wool. The tyttebær are worth more when your hands still work.', en: 'Take the wool. The lingonberries are worth more when your hands still work.' }],
        give: { ull: 2 } },
      { id: 'g3', mood: 'warm', when: S => S.fr.gunnar >= 6 && S.flag.fell === 'sjaa',
        lines: ['Stand at the tarn at dusk. You will see what I stay up here for.'] },
      { id: 'ga4', when: S => S.fr.gunnar >= 8,
        lines: ['I walked down and gave Astrid the numbers. All eighteen years.',
                { no: 'Hun skrev dem av i kassaboken uten å spørre hvorfor.', en: 'She copied them into the ledger without asking why.' },
                'Now they are somewhere that is not only my head.'],
        set: { tall: 1 } },
      { id: 'ga5', mood: 'warm', when: S => S.fr.gunnar >= 10,
        lines: ['A fifth herd came through in the dark. Late. Wrong week.',
                { no: 'Fem. Jeg hadde skrevet fire og måtte stryke det ut.', en: 'Five. I had written four and had to cross it out.' },
                'It is the first number I have been glad to be wrong about.'],
        give: { tyttebar: 4 } }
    ],
    chat: [
      /* THE LOFT */
      { t: [{ no: 'Så det er der det havner. Greit nok. Bedre enn i en sekk.', en: 'So that is where it ends up. Fair enough. Better than in a sack.' }],
        if: S => loft(S) >= 1 },
      { mood: 'troubled', t: ['Wind from the north. There is always wind from the north.'] },
      { t: [{ no: 'Røye in the tarn. Tyttebær in the heather. The vidda provides.', en: 'Char in the tarn. Lingonberries in the heather. The plateau provides.' }] },
      { mood: 'troubled', t: ['You wore the wool. Good. I have buried men who did not.'] },
      /* the other half of the same argument Sigrid makes below the treeline */
      { t: ['Down the valley you walk field to field. Up here you set out.'] },
      { t: ['Half a day is the climb. That half is why it stays empty.'] },
      /* ---- weather ---------------------------------------------------- */
      { mood: 'troubled', t: [{ no: 'Regn her oppe er ikke regn. Det er vann som kommer sidelengs.', en: 'Rain up here is not rain. It is water arriving sideways.' }],
        if: S => S.weather === 'regn' },
      { mood: 'troubled', t: [{ no: 'Tåke. Gå tilbake den veien du kom, mens du husker den.', en: 'Fog. Go back the way you came, while you still remember it.' }],
        if: S => S.weather === 'take' },
      { t: ['Clear. You can see the sea from the cairn. Most never look.'],
        if: S => S.weather === 'klar' },
      /* ---- season ----------------------------------------------------- */
      { t: [{ no: 'Vår. Da krysser de nordover, og snøen holder sporene i to dager.', en: 'Spring. They cross north, and the snow keeps the tracks two days.' }],
        if: S => S.season === VAR },
      { t: ['Summer. Everything up here is busy and none of it is loud.'], if: S => S.season === SOMMER },
      { t: [{ no: 'Høst. Nå er tyttebærene modne og alt annet gjør seg klart til å slutte.', en: 'Autumn. The lingonberries ripen and everything else prepares to stop.' }],
        if: S => S.season === HOST },
      { mood: 'troubled', t: ['Winter. If you are up here without wool you are already in trouble.'],
        if: S => S.season === VINTER },
      /* ---- the hour --------------------------------------------------- */
      { t: [{ no: 'Grålysning. Den beste timen, og den er kort.', en: 'Grey light. The best hour, and it is short.' }],
        if: S => S.min < 7 * 60 },
      { mood: 'warm', t: ['Dusk. Stop walking. Stand there. Look at the tarn.'], if: S => S.min >= 19 * 60 },
      /* ---- what you are carrying -------------------------------------- */
      { mood: 'warm', t: [{ no: 'Tyttebær. Du gikk forbi tjernet, altså. Bra.', en: 'Lingonberries. So you went past the tarn. Good.' }],
        if: S => (S.bag.tyttebar || 0) > 0 },
      { t: [{ no: 'Malm på vidda. Du har gått gjennom fjellet for å komme hit.', en: 'Ore on the plateau. You came through the mountain to get here.' }],
        if: S => ore(S) > 0 },
      { mood: 'troubled', t: ['No wool. I will say it once more and then I will stop.'],
        if: S => !(S.bag.ullgenser || 0) && !(S.bag.ull || 0) },
      /* ---- what you did yesterday ------------------------------------- */
      { t: ['You foraged yesterday and came up here today. That is a week of walking.'],
        if: S => S.yst.forage > 0 },
      { t: ['Nothing yesterday. Up here that is a plan, not a failure.'], if: idle },
      /* ---- the rest of the valley ------------------------------------- */
      { t: [{ no: 'Det går en bjørn i skogen som feier. Jeg forklarer det ikke heller.', en: 'There is a bear in the wood who sweeps. I do not explain it either.' }],
        if: S => S.disc && S.disc.forest },
      { t: ['Sigrid brings the herd past in June. I hear them before I see them.'],
        if: S => S.disc && S.disc.setra },
      { t: [{ no: 'Lars er under meg akkurat nå. Vi har aldri møttes på fjellet.', en: 'Lars is underneath me right now. We have never met on the mountain.' }],
        if: S => S.disc && S.disc.gruva },
      /* ---- what he will not talk about --------------------------------- */
      { mood: 'troubled', t: ['Three of them. I carried them down myself. No, I will not say the names.'],
        if: S => S.fr.gunnar >= 6 },
      { t: [{ no: 'De ligger i kirkegården på enga. Marit steller gravene.', en: 'They lie in the churchyard on the meadow. Marit tends the graves.' }],
        if: S => S.fr.gunnar >= 8 },
      { mood: 'warm', t: [{ no: 'Tallene står i en bok nede i bygda nå. Det hjelper mer enn jeg trodde.', en: 'The numbers are in a book down in the valley now. That helps more than I expected.' }],
        if: S => S.flag.tall },
      { t: [{ no: 'Hørte huset ditt er ferdig. Bra. Nå har du noe å komme tilbake til.', en: 'Heard your house is finished. Good. Now you have somewhere to come back to.' }],
        if: S => S.act2Unlocked },
      /* ---- the festival, and the rest of the valley -------------------- */
      { t: [{ no: 'Festdag. Jeg går ned. Jeg står i utkanten. Jeg går opp igjen.', en: 'Festival day. I go down. I stand at the edge. I come back up.' }],
        if: S => !!S.festival },
      { mood: 'warm', t: ['Once a season somebody hands me food and does not ask why I am there.'],
        if: S => !!S.festival },
      { t: [{ no: 'Blåbær. De vokser lavere enn tyttebær og smaker mindre. Ta begge deler.', en: 'Blueberries. They grow lower than lingonberries and taste of less. Take both.' }],
        if: S => (S.bag.blabar || 0) > 0 },
      { mood: 'warm', t: ['You are wearing the sweater. Sigrid knitted it. I told her the size.'],
        if: S => (S.bag.ullgenser || 0) > 0 },
      { t: [{ no: 'Røye i tjernet, om du har stang. Ellers er det bare kaldt vann.', en: 'Char in the tarn, if you have a rod. Otherwise it is only cold water.' }],
        if: S => !S.tools.stang },
      { t: ['Astrid writes things down. That turns out to matter.'], if: S => S.fr.astrid >= 4 },
      { mood: 'troubled', t: [{ no: 'Olav har sett på havet hver dag i femti år og aldri vært på det.', en: 'Olav has looked at the sea every day for fifty years and never been on it.' }],
        if: S => S.disc && S.disc.fjord },
      { t: ['Marit keeps the graves. I keep the crossings. Somebody has to keep something.'],
        if: S => S.fr.marit >= 4 },
      { mood: 'warm', t: [{ no: 'Du kom hit tre ganger. Da slutter jeg å telle og begynner å vente.', en: 'You came up here three times. Then I stop counting and start expecting you.' }],
        if: S => S.fr.gunnar >= 8 },
      { t: [{ no: 'Vidda skylder deg ingenting. Den gir likevel, om du kan vente.', en: 'The plateau owes you nothing. It gives anyway, if you can wait.' }] },
      { mood: 'troubled', t: ['Eighteen years. Three graves. Four herds. Those are all the numbers I have.'],
        if: S => S.fr.gunnar >= 6 },
      { t: [{ no: 'Ingrid teller fisk, jeg teller rein. Vi har aldri snakket sammen.', en: 'Ingrid counts fish, I count reindeer. We have never once spoken.' }],
        if: S => S.fr.ingrid >= 4 }
    ]
  },

  lars: {
    nodes: [
      { id: 'l1', mood: 'troubled',
        lines: ['Watch your head. The good copper is where the ceiling is lowest.'],
        ask: { q: { no: 'Silver, or stone?', en: 'Silver, or stone?' }, opts: [
          { t: { no: 'Silver. I came for the sølv.', en: 'Silver. I came for the silver.' }, set: { mine: 'solv' }, fr: 2,
            reply: [{ no: 'A greedy answer. I like it. Rich veins glitter — you will know them.', en: 'A greedy answer. I like it. Rich veins glitter — you will know them.' }] },
          { t: { no: 'Stone. A house needs walls.', en: 'Stone. A house needs walls.' }, set: { mine: 'stein' }, fr: 0,
            reply: [{ no: 'A builder. Good. Every swing gives stein along with the ore.', en: 'A builder. Good. Every swing gives stone along with the ore.' }] }
        ] } },
      { id: 'l2', when: S => !S.tools.hakke,
        lines: [{ no: 'You will need a HAKKE. I sell one for 400 kr.', en: 'You will need a PICK. I sell one for 400 kr.' }],
        buy: { label: { no: 'HAKKE — 400 kr', en: 'PICK — 400 kr' }, kr: 400, tool: 'hakke', pickLv: 1,
               ok: ['Swing at the veins, not the walls.'],
               no: ['400 kr. The ore is not going anywhere.'] } },
      { id: 'l3', when: S => S.tools.hakke && !S.q.jern && S.pickLv < 2,
        lines: [{ no: 'Bring me six jern and I will forge you a STÅLHAKKE.', en: 'Bring me six iron and I will forge you a STEEL PICK.' },
                { no: 'The rich veins — the sølv — need steel to crack.', en: 'The rich veins — the silver — need steel to crack.' }],
        open: 'jern' },
      /* ---- his arc: the closed level --------------------------------- */
      { id: 'la1', when: S => S.fr.lars >= 2,
        lines: ['Mm.',
                { no: 'Du spurte om jeg jobber alene. Jeg jobber alene.', en: 'You asked whether I work alone. I work alone.' },
                'That is an answer, not a complaint.'] },
      { id: 'la2', when: S => S.fr.lars >= 4,
        lines: ['I am not prospecting. Prospecting is for men who do not know.',
                { no: 'Det var ni av oss her. Vi drev mot noe. Så sluttet selskapet.', en: 'There were nine of us here. We were driving for something. Then the company stopped.' }] },
      { id: 'l4', mood: 'warm', when: S => S.fr.lars >= 6 && S.flag.mine === 'stein' && S.pickLv < 2,
        lines: [{ no: 'For a builder, the steel is cheaper. Four jern, not six.', en: 'For a builder, the steel is cheaper. Four iron, not six.' }],
        set: { steelcut: 1 } },
      { id: 'la3', mood: 'troubled', when: S => S.fr.lars >= 6,
        lines: [{ no: 'Det er en synk lenger inne som jeg stemper igjen hver vår.', en: 'There is a level further in that I prop shut every spring.' },
                'Water behind it, or nothing behind it. Both answers cost the same to get.'] },
      { id: 'la4', when: S => S.fr.lars >= 8,
        lines: ['I opened it. Took two days and I told nobody I was doing it.',
                { no: 'Ikke vann. Tørt som en støvel. Åtte meter, og så gråberg.', en: 'No water. Dry as a boot. Eight metres, and then dead rock.', m: 'troubled' }] },
      { id: 'la5', mood: 'warm', when: S => S.fr.lars >= 10,
        lines: ['Stemped it shut again. For good this time, and I slept after.',
                { no: 'Ni mann tok feil. Det er lettere å bære enn å ha rett alene.', en: 'Nine men were wrong. That is easier to carry than being right alone.' },
                'Take the silver. It came out of the drift beside it, which is the joke.'],
        give: { solv: 1 }, set: { synk: 1 } }
    ],
    chat: [
      /* THE LOFT */
      { mood: 'warm', t: [{ no: 'Sølv og kobber og bergkrystall på en hylle, i rekkefølge. Selskapet klarte aldri det.', en: 'Silver and copper and rock crystal on a shelf, in order. The company never managed that.' }],
        if: S => loft(S) >= 44 },
      { t: ['Mm. Deeper is darker. Darker is richer.'] },
      { t: [{ no: 'Kobber sells well in town. Sølv sells better anywhere.', en: 'Copper sells well in town. Silver sells better anywhere.' }] },
      { t: [{ no: 'Åtte til åtte jeg er ved gruveåpningen. Etter det er jeg lenger inne, og sover.', en: 'Eight to eight I am at the adit. After that I am further in, asleep.' }] },
      { t: [{ no: 'The rich veins glitter. You need steel for those.', en: 'The rich veins glitter. You need steel for those.' }], if: S => S.pickLv < 2 },
      { mood: 'warm', t: ['Steel in your hands now. The whole mountain is yours.'], if: S => S.pickLv >= 2 },
      /* ---- weather ---------------------------------------------------- */
      { t: [{ no: 'Regner det ute? Det regner alltid her inne. Det heter drypp.', en: 'Raining out there? It always rains in here. We call it drip.' }],
        if: S => S.weather === 'regn' },
      { t: ['Fog outside. In here it makes no difference at all. That is the point of in here.'],
        if: S => S.weather === 'take' },
      /* ---- season ----------------------------------------------------- */
      { t: [{ no: 'Vår. Da renner smeltevannet inn og jeg stemper i to uker.', en: 'Spring. The meltwater comes in and I spend two weeks propping.' }],
        if: S => S.season === VAR },
      { t: ['Summer up there. Eleven degrees down here. It is eleven degrees in February too.'],
        if: S => S.season === SOMMER },
      { mood: 'troubled', t: [{ no: 'Vinter. Da kommer ingen ned hit, og det går fortere enn du tror.', en: 'Winter. Nobody comes down here then, and it passes faster than you would think.' }],
        if: S => S.season === VINTER },
      /* ---- the hour --------------------------------------------------- */
      { t: ['Eight o’clock somewhere. Down here that is a rumour.'], if: S => S.min < 8 * 60 },
      { mood: 'troubled', t: [{ no: 'Sent. Gå opp mens lykten din ennå har olje.', en: 'Late. Go up while your lantern still has oil.' }],
        if: S => S.min >= 20 * 60 },
      /* ---- what you are carrying -------------------------------------- */
      { mood: 'warm', t: [{ no: 'Sølv i sekken. Da har du funnet den blanke åren. Ikke si hvor.', en: 'Silver in the bag. So you found the bright vein. Do not say where.' }],
        if: S => (S.bag.solv || 0) > 0 },
      { t: [{ no: 'Stein. Håkon betaler for det. Jeg gjør ikke det.', en: 'Stone. Håkon pays for that. I do not.' }],
        if: S => (S.bag.stein || 0) >= 5 },
      { mood: 'troubled', t: ['You came down here with a full bag and no room for ore. Think.'],
        if: S => Object.keys(S.bag).filter(k => S.bag[k] > 0).length >= 10 },
      /* ---- what you did yesterday ------------------------------------- */
      { t: ['Two days in a row down here. That is how it starts, and it does not stop.'],
        if: S => S.yst.mine > 0 },
      { t: [{ no: 'Ingenting i går. Fjellet merket det ikke. Det merker aldri noe.', en: 'Nothing yesterday. The mountain did not notice. It never does.' }], if: idle },
      /* ---- quests open ------------------------------------------------ */
      { t: [{ no: 'Seks jern. Eller fire, om du bygger. Jeg husker hva du svarte.', en: 'Six iron. Or four, if you build. I remember what you answered.' }],
        if: S => S.q.jern === 'active' },
      /* ---- the rest of the valley ------------------------------------- */
      { t: [{ no: 'Sigrid er søsteren min. Hun gikk oppover. Noen måtte gå innover.', en: 'Sigrid is my sister. She went upward. Somebody had to go inward.' }] },
      { t: ['Ingrid came down and asked what runs out of my mountain. I showed her. Clean.'],
        if: S => S.fr.ingrid >= 8 },
      { t: [{ no: 'Astrid selger lyktene mine og tar ingenting for det. Vi krangler om det.', en: 'Astrid sells my lanterns and takes nothing for it. We argue about that.' }] },
      /* ---- what he will not talk about --------------------------------- */
      { mood: 'troubled', t: ['Do not go past the third crosscut. I am not explaining that today.'],
        if: S => S.fr.lars >= 6 },
      { t: [{ no: 'Ni navn på lønningslisten. Åtte dro. Regn selv.', en: 'Nine names on the pay list. Eight left. Do the arithmetic.' }],
        if: S => S.fr.lars >= 8 },
      { mood: 'warm', t: [{ no: 'Synken er stengt for godt. Jeg går forbi den uten å se på den nå.', en: 'The level is shut for good. I walk past it without looking now.' }],
        if: S => S.flag.synk },
      { t: [{ no: 'De sier huset ditt står. Halve steinen bar du ut herfra selv.', en: 'They tell me your house stands. Half the stone you carried out of here yourself.' }],
        if: S => S.act2Unlocked },
      /* ---- the festival, and the rest of the valley -------------------- */
      { t: [{ no: 'Festdag. Jeg vasker fjeset og går opp. En dag i kvartalet.', en: 'Festival day. I wash my face and go up. One day a quarter.' }],
        if: S => !!S.festival },
      { mood: 'warm', t: ['Sigrid stands next to me at the fair and neither of us says much.'],
        if: S => !!S.festival },
      { t: [{ no: 'Lykt i sekken? Bra. Uten den er dette bare en tunnel du dør i.', en: 'Lantern in the bag? Good. Without one this is only a tunnel you die in.' }],
        if: S => (S.bag.lykt || 0) > 0 },
      { mood: 'troubled', t: [{ no: 'Olje i lykten? Sjekk nå, ikke om en time.', en: 'Oil in that lantern? Check now, not in an hour.' }],
        if: S => S.min >= 16 * 60 },
      { t: [{ no: 'Spiker og tau. Jeg fører begge deler fordi ingen andre gidder.', en: 'Nails and rope. I stock both because nobody else can be bothered.' }] },
      { t: ['Olav needs two rope and will buy one and come back. He always does.'],
        if: S => S.q.boat === 'active' },
      { t: [{ no: 'Håkon sier tømmeret mitt er grønt. Håkon har rett. Jeg gjør det likevel.', en: 'Håkon says my timber is green. Håkon is right. I do it anyway.' }],
        if: S => S.fr.hakon >= 4 },
      { t: ['Gunnar is directly above me and we have not spoken in nine years.'],
        if: S => S.disc && S.disc.vidda },
      { mood: 'warm', t: [{ no: 'Du kommer ned hit uten grunn nå. Det gjør ingen andre.', en: 'You come down here for no reason now. Nobody else does.' }],
        if: S => S.fr.lars >= 8 }
    ],
    shop: ['spiker', 'tau']
  }
};
