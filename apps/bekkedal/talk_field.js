/* Bekkedal — what the two above the valley floor say. One quarter of
 * BEK_TALK; see talk_town.js's header for the shape and the conventions.
 *
 * Marit wants the stave church to stand one more generation, and will not
 * say who the flowers are for. Sigrid wants to stay at the setra all year,
 * and will not talk about the winter she came down too late.
 */

const VAR = 0, SOMMER = 1, HOST = 2, VINTER = 3;
const idle = S => !S.yst.farm && !S.yst.mine && !S.yst.fish && !S.yst.forage;
/* THE LOFT: how much has been carried into the storehouse on the square —
   read defensively, like every gate in these files. See BEK_LOFT (data.js). */
const loft = S => (S.spine && S.spine.d) ? Object.keys(S.spine.d).length : 0;
const flowers = S => (S.bag.blomst_bla || 0) + (S.bag.blomst_gul || 0) + (S.bag.blomst_ro || 0);

export const FIELD_TALK = {
  marit: {
    nodes: [
      { id: 'm1', mood: 'warm',
        lines: ['You found the old church. Most only find the meadow.',
                'The stave has stood eight hundred winters. It leans, but it stands.'],
        ask: { q: { no: 'Hvorfor klatret du helt hit opp?', en: 'Why did you climb all the way up here?' }, opts: [
          { t: { no: 'Noen jeg husker.', en: 'Someone I remember.' }, set: { marit: 'minne' }, fr: 2,
            reply: ['Then pick them a bouquet. One blåklokke, one soleie, one revebjelle.',
                    'Bring the three, and I will know the flowers found the right hands.'] },
          { t: { no: 'Bare stillheten her oppe.', en: 'Just the quiet up here.' }, set: { marit: 'ro' }, fr: 0,
            reply: ['The quiet keeps. Still — pick me three: blåklokke, soleie, revebjelle.',
                    'An old woman likes colour on the sill.'] }
        ] } },
      { id: 'm2', when: S => S.q.blomst === 'active',
        lines: [{ no: 'One of each. They open at first light, all over the enga.', en: 'One of each. They open at first light, all over the meadow.' }] },
      /* ---- her arc: the ridge beam ----------------------------------- */
      { id: 'ma1', when: S => S.fr.marit >= 2,
        lines: ['You looked up at the roof and not at me. Most do the reverse.',
                { no: 'Vi snakker om blomster i dag. Blomster er nok.', en: 'We are talking about flowers today. Flowers will do.' }] },
      { id: 'ma2', when: S => S.fr.marit >= 4,
        lines: [{ no: 'Mønsåsen er myk i vestre ende. Jeg kjenner det på lukten.', en: 'The ridge beam is soft at the west end. I can smell it.' },
                'Wet rot. Slow. It has forty years, perhaps twenty.'] },
      { id: 'ma3', mood: 'troubled', when: S => S.fr.marit >= 6,
        lines: ['There is no parish. There has not been one since I was fifty.',
                { no: 'Jeg skrev til fylket. De skrev tilbake, høflig, og det var det.', en: 'I wrote to the county. They wrote back, politely, and that was that.' },
                'A building is not saved by letters.'] },
      { id: 'm3', mood: 'troubled', when: S => S.fr.marit >= 6 && S.flag.marit === 'minne',
        lines: ['You carry it well. Grief and gardening are the same craft.',
                { no: 'Her — urter til gryta. De vokser der jeg plantet hennes favoritter.', en: 'Here — herbs for the pot. They grow where I planted her favourites.', m: 'warm' }],
        give: { urt: 3 } },
      { id: 'm4', mood: 'warm', when: S => S.fr.marit >= 6 && S.flag.marit === 'ro',
        lines: ['You have found the quiet, then. It suits the valley on you.'] },
      { id: 'ma4', when: S => S.fr.marit >= 8,
        lines: ['I sent word down to Håkon. I did not ask him for anything.',
                { no: 'Jeg beskrev den. Hvor den er myk, og hvor lenge den har stått.', en: 'I described it. Where it is soft, and how long it has stood.' },
                'He is the sort who cannot leave a description alone.'] },
      { id: 'ma5', mood: 'warm', when: S => S.fr.marit >= 10,
        lines: [{ no: 'Han skiftet åsen på fire dager og tok ikke en krone.', en: 'He changed the beam in four days and took not one krone.' },
                'The bells rang at midsummer. Properly, both of them.',
                { no: 'Åtte hundre vintre til. Jeg ser ingen av dem, og det er greit.', en: 'Eight hundred more winters. I see none of them, and that is fine.' }],
        give: { bukett: 1 }, set: { klokker: 1 } }
    ],
    chat: [
      /* THE LOFT */
      { mood: 'warm', t: [{ no: 'Blomster i et loft. Noen kommer til å se dem om hundre år.', en: 'Flowers in a loft. Somebody will see them in a hundred years.' }],
        if: S => loft(S) >= 1 },
      { mood: 'troubled', t: ['The bells only ring at midsummer now. Nobody minds.'] },
      { t: [{ no: 'Blåklokke, soleie, revebjelle. The meadow keeps them all.', en: 'Harebell, buttercup, foxglove. The meadow keeps them all.' }] },
      { t: ['Flowers picked at dawn last longest. An old trick.'] },
      { mood: 'warm', t: ['Colour on the sill. That is all an old house needs.'], if: S => S.q.blomst === 'done' },
      /* ---- weather ---------------------------------------------------- */
      { t: [{ no: 'Regn. Da lukter tjæret tømmer som det gjorde da jeg var barn.', en: 'Rain. Then tarred timber smells the way it did when I was a child.' }],
        if: S => S.weather === 'regn' },
      { mood: 'troubled', t: [{ no: 'Tåke over enga. Da ser kirken ut som den flyter.', en: 'Fog on the meadow. The church looks as though it floats.' }],
        if: S => S.weather === 'take' },
      { mood: 'warm', t: ['Clear. Sit on the step a while. It is warm by ten.'],
        if: S => S.weather === 'klar' && S.min < 12 * 60 },
      /* ---- season ----------------------------------------------------- */
      { mood: 'warm', t: [{ no: 'Vår. Soleiene kommer først, og de er ikke særlig fine.', en: 'Spring. The buttercups come first, and they are not much to look at.' }],
        if: S => S.season === VAR },
      { t: ['Midsummer. The bells, and then a year of nothing again.'], if: S => S.season === SOMMER },
      { t: [{ no: 'Høst. Nå tar jeg frø, ikke blomster. Det er en annen jobb.', en: 'Autumn. Now I take seed, not flowers. That is a different job.' }],
        if: S => S.season === HOST },
      { mood: 'troubled', t: [{ no: 'Vinter. Da er det bare veggene og meg, og de er eldst.', en: 'Winter. Then it is only the walls and me, and they are older.' }],
        if: S => S.season === VINTER },
      /* ---- the hour --------------------------------------------------- */
      { t: ['Dawn. Pick now or do not bother picking.'], if: S => S.min < 8 * 60 },
      { mood: 'warm', t: [{ no: 'Kveld. Kom inn. Døren har ikke vært låst på tretti år.', en: 'Evening. Come in. That door has not been locked in thirty years.' }],
        if: S => S.min >= 19 * 60 },
      /* ---- what you are carrying -------------------------------------- */
      { mood: 'warm', t: [{ no: 'Blomster i sekken. Du plukket ved daggry også, ser jeg.', en: 'Flowers in the bag. You picked at dawn as well, I see.' }],
        if: S => flowers(S) > 0 },
      { t: [{ no: 'Tømmer. Bær det forbi vestveggen og se opp mens du går.', en: 'Timber. Carry it past the west wall and look up as you pass.' }],
        if: S => (S.bag.tommer || 0) > 0 },
      { t: ['You are carrying ore up a hill. There is nothing up here to sell it to.'],
        if: S => (S.bag.jern || 0) + (S.bag.kobber || 0) > 0 },
      /* ---- what you did yesterday ------------------------------------- */
      { t: ['You foraged yesterday. The meadow shows where. It always does.'], if: S => S.yst.forage > 0 },
      { mood: 'warm', t: ['A day with nothing in it is not a wasted day. At my age it is most of them.'], if: idle },
      /* ---- the rest of the valley ------------------------------------- */
      { t: [{ no: 'Håkon kommer opp med tommestokk og sier mm. Det er et helt svar.', en: 'Håkon comes up with a rule and says mm. That is a complete answer.' }],
        if: S => S.fr.hakon >= 4 },
      { t: ['Astrid keeps salt for me she knows I will not come down for.'] },
      { t: [{ no: 'Sigrid gikk forbi her hvert år med hele bølingen. Hun gjør det ennå.', en: 'Sigrid walked past here every year with the whole herd. She still does.' }],
        if: S => S.disc && S.disc.setra },
      /* ---- what she will not talk about -------------------------------- */
      { mood: 'troubled', t: ['Three flowers. She liked all three, and I will not say which most.'],
        if: S => S.fr.marit >= 6 },
      { t: [{ no: 'Navnet står på veggen inne. Du får lese det selv, en gang.', en: 'The name is on the wall inside. You may read it yourself, one day.' }],
        if: S => S.fr.marit >= 8 },
      { mood: 'warm', t: [{ no: 'Begge klokkene ringte. Den lille har vært sprukken siden krigen.', en: 'Both bells rang. The small one has been cracked since the war.' }],
        if: S => S.flag.klokker },
      { t: [{ no: 'Blomster på karmen og et tak over dem begge. Mer trenger ikke et hus.', en: 'Flowers on the sill and a roof over them both. That is all any house needs.' }],
        if: S => S.act2Unlocked },
      /* ---- the festival, and the rest of the valley -------------------- */
      { mood: 'warm', t: [{ no: 'Festdag. Jeg går ikke ned. De vet hvor jeg er.', en: 'Festival day. I do not go down. They know where I am.' }],
        if: S => !!S.festival },
      { t: ['They ring the bells for the fair and nobody up here hears them.'], if: S => !!S.festival },
      { t: [{ no: 'Urter tørker best i skygge. Aldri i sol, uansett hva du har hørt.', en: 'Herbs dry best in shade. Never in sun, whatever you have heard.' }],
        if: S => (S.bag.urt || 0) > 0 },
      { t: ['Berries and no basket. They will be jam before you are down the track.'],
        if: S => (S.bag.blabar || 0) + (S.bag.multe || 0) + (S.bag.tyttebar || 0) >= 3 },
      { mood: 'troubled', t: [{ no: 'Gunnar bar tre menn ned hit. Jeg steller gravene deres.', en: 'Gunnar carried three men down to here. I tend their graves.' }],
        if: S => S.fr.gunnar >= 6 },
      { t: ['Ingrid stood at that door for an hour once and did not knock.'], if: S => S.fr.ingrid >= 6 },
      { t: [{ no: 'Åtte hundre vintre. Tell dem selv, om du ikke tror meg.', en: 'Eight hundred winters. Count them yourself, if you do not believe me.' }] },
      { mood: 'warm', t: ['You come up here when there is nothing to fetch. That is the whole of it.'],
        if: S => S.fr.marit >= 8 },
      { t: [{ no: 'Ta med en blomst ned. Ikke til meg. Til noen som ikke venter det.', en: 'Take a flower down with you. Not for me. For somebody not expecting one.' }],
        if: S => S.q.blomst === 'done' }
    ]
  },

  sigrid: {
    nodes: [
      { id: 's1',
        lines: ['Up here it is goats, brown cheese and weather. In that order.'],
        ask: { q: { no: 'Melk eller ull — hva holder du dem for?', en: 'Milk or wool — what do you keep them for?' }, opts: [
          { t: { no: 'Melk. Brunosten er verdt klatringen.', en: 'Milk. The brown cheese is worth the climb.' }, set: { dairy: 'melk' }, fr: 2,
            reply: [{ no: 'A cheese answer. Bring me five multe and I will feed you well.', en: 'A cheese answer. Bring me five cloudberries and I will feed you well.' },
                    { no: 'The multe grow right here on the setra, gold in the grass.', en: 'The cloudberries grow right here on the dairy meadow, gold in the grass.' }] },
          { t: { no: 'Ull. Vintrene er lange.', en: 'Wool. The winters are long.' }, set: { dairy: 'ull' }, fr: 0,
            reply: [{ no: 'A sensible answer. Five multe, and the vidda stops frightening you.', en: 'A sensible answer. Five cloudberries, and the plateau stops frightening you.' }] }
        ] } },
      { id: 's2', when: S => S.q.multe === 'active',
        lines: [{ no: 'Five multe. They ripen on the setra by morning.', en: 'Five cloudberries. They ripen on the dairy meadow by morning.' }] },
      /* ---- her arc: the whole year up here --------------------------- */
      { id: 'sa1', when: S => S.fr.sigrid >= 2,
        lines: ['You asked how long the season is. Nobody asks that.',
                { no: 'Hundre og tolv dager. Jeg trengte ikke telle for å svare.', en: 'A hundred and twelve days. I did not need to count to answer.' }] },
      { id: 's3', when: S => S.q.multe === 'done' && !S.flag.rabarbra,
        lines: [{ no: 'Astrid has rabarbra seed now, on my word. Slow, but rich.', en: 'Astrid has rhubarb seed now, on my word. Slow, but rich.' }],
        set: { rabarbra: 1 } },
      { id: 'sa2', when: S => S.fr.sigrid >= 4,
        lines: ['I start counting the day I come down. Not the day I go up.',
                { no: 'Det sier alt om hvilken av dem som er hjemme.', en: 'That says everything about which of the two is home.', m: 'troubled' }] },
      { id: 's4', mood: 'warm', when: S => S.fr.sigrid >= 6 && S.flag.dairy === 'melk',
        lines: ['Cloudberry cream. Eat it slow.'],
        give: { multekrem: 1 } },
      { id: 's5', mood: 'warm', when: S => S.fr.sigrid >= 6 && S.flag.dairy === 'ull',
        lines: [{ no: 'A genser, knitted this winter. Now the wind up top is only wind.', en: 'A sweater, knitted this winter. Now the wind up top is only wind.' }],
        give: { ullgenser: 1 } },
      { id: 'sa3', mood: 'troubled', when: S => S.fr.sigrid >= 6,
        lines: [{ no: 'Mor hadde seksti geiter. Jeg har nitten. Ingen sier noe.', en: 'Mother kept sixty goats. I keep nineteen. Nobody says anything.' },
                'Nineteen is not enough to make anyone argue about where I winter.',
                'They have stopped expecting me to come down and stay down.'] },
      { id: 'sa4', when: S => S.fr.sigrid >= 8,
        lines: ['I am wintering up here. Once. To know whether I can.',
                { no: 'Ikke for å bevise noe. For å slutte å lure.', en: 'Not to prove anything. To stop wondering.' },
                'If you come up in January, bring nothing. I will have plenty.'],
        set: { setravinter: 1 } },
      { id: 'sa5', mood: 'warm', when: S => S.fr.sigrid >= 10,
        lines: ['I could have stayed. That is the whole answer.',
                { no: 'Så gikk jeg ned likevel. Det er forskjell på å måtte og å ville.', en: 'Then I came down anyway. There is a difference between having to and choosing to.' },
                'Take the cheese. It is a winter cheese and it knows it.'],
        give: { brunost: 2 }, set: { valgte: 1 } }
    ],
    chat: [
      /* THE LOFT */
      { t: [{ no: 'Mormora til Astrid tok min mors ost inn dit. Den står der ennå, tror jeg.', en: 'Astrid\u2019s grandmother took my mother\u2019s cheese in there. I think it is still standing.' }],
        if: S => loft(S) >= 24 },
      { mood: 'warm', t: ['Mind the goats. They will eat your bootlaces.'] },
      { mood: 'troubled', t: [{ no: 'Multe first, then the vidda. In that order, or you freeze.', en: 'Cloudberries first, then the plateau. In that order, or you freeze.' }] },
      { t: ['A wool genser is all that stands between you and the wind.'] },
      /* why the map is still a menu for this one place: the valley floor you
         walk field to field (see the seams in maps.js), but the setra is
         three hours of track and the walk is the point of it */
      { t: ['Three hours up that track. Nobody drops in by accident.'] },
      { t: ['You have walked it once. Now set a morning aside and go.'] },
      { t: [{ no: 'Åtte til åtte, meieriet er åpent. Om vinteren finner du meg i dalen i stedet.', en: 'Eight to eight, the dairy is open. Come winter you will find me down in the valley instead.' }] },
      { mood: 'troubled', t: ['You smell of the mine. Say hello to Lars for me.'], if: S => S.disc && S.disc.gruva },
      { t: [{ no: 'Håkon fences it, I stock it. Geit or høne, your pen.', en: 'Håkon fences it, I stock it. Goat or chicken, your pen.' }],
        if: S => S.flag.barn },
      /* ---- weather ---------------------------------------------------- */
      { mood: 'troubled', t: [{ no: 'Regn. Da melker de dårlig og ser på meg som om det er min feil.', en: 'Rain. Then they milk badly and look at me as if it were my doing.' }],
        if: S => S.weather === 'regn' },
      { t: [{ no: 'Tåke. Da teller jeg dem to ganger og tror på det andre tallet.', en: 'Fog. Then I count them twice and believe the second number.' }],
        if: S => S.weather === 'take' },
      /* ---- season ----------------------------------------------------- */
      { mood: 'warm', t: [{ no: 'Vår. Om tre uker går vi opp. Jeg pakker allerede i hodet.', en: 'Spring. In three weeks we go up. I am packing already, in my head.' }],
        if: S => S.season === VAR },
      { mood: 'warm', t: ['Summer. This is the part of the year the rest of it is for.'], if: S => S.season === SOMMER },
      { t: [{ no: 'Høst. Nå teller jeg ned, og hver dag er kortere enn den forrige.', en: 'Autumn. Now I count down, and each day is shorter than the last.' }],
        if: S => S.season === HOST },
      { mood: 'troubled', t: [{ no: 'Vinter. Jeg er i dalen. Spør ikke om det er hjemme.', en: 'Winter. I am down in the valley. Do not ask whether that is home.' }],
        if: S => S.season === VINTER },
      /* ---- the hour --------------------------------------------------- */
      { t: ['Milking. Talk if you like, but stand where I can see you.'], if: S => S.min < 8 * 60 },
      { t: [{ no: 'Sent. Geitene sover og jeg er ikke langt bak dem.', en: 'Late. The goats are asleep and I am not far behind them.' }],
        if: S => S.min >= 20 * 60 },
      /* ---- what you are carrying -------------------------------------- */
      { mood: 'warm', t: [{ no: 'Multe. Gull i gresset, som jeg sa.', en: 'Cloudberries. Gold in the grass, as I said.' }],
        if: S => (S.bag.multe || 0) > 0 },
      { t: [{ no: 'Ull i sekken. Den er Gunnars, eller den er min. Det er ingen tredje.', en: 'Wool in the bag. That is Gunnar’s or it is mine. There is no third.' }],
        if: S => (S.bag.ull || 0) > 0 },
      { mood: 'troubled', t: ['No wool on you and the wind is northerly. Go back down or go and see Gunnar.'],
        if: S => !(S.bag.ullgenser || 0) && S.season === VINTER },
      /* ---- what you did yesterday ------------------------------------- */
      { t: ['You farmed yesterday. Down there that counts as a whole day.'], if: S => S.yst.farm > 0 },
      { mood: 'troubled', t: ['A day off. Goats do not have those. Neither do I.'], if: idle },
      /* ---- the rest of the valley ------------------------------------- */
      { t: [{ no: 'Lars og jeg vokste opp i samme hus. Han gikk innover, jeg gikk oppover.', en: 'Lars and I grew up in the same house. He went inward, I went upward.' }],
        if: S => S.disc && S.disc.gruva },
      { t: ['Gunnar keeps the wool honest. He would not put it that way.'], if: S => S.disc && S.disc.vidda },
      { t: [{ no: 'Marit ser bølingen gå forbi hver vår. Jeg vinker.', en: 'Marit watches the herd go past every spring. I wave.' }],
        if: S => S.disc && S.disc.enga },
      /* ---- what she will not talk about -------------------------------- */
      { mood: 'troubled', t: ['I came down late one year. Do not ask which one.'], if: S => S.fr.sigrid >= 6 },
      { t: [{ no: 'Bølingen ble mindre den vinteren. Det er alt som skal sies.', en: 'The herd was smaller after that winter. That is all that needs saying.' }],
        if: S => S.fr.sigrid >= 8 },
      { mood: 'warm', t: [{ no: 'Jeg overvintret der oppe. En eneste gang. Nå vet jeg det.', en: 'I wintered up there. Once. Now I know.' }],
        if: S => S.flag.setravinter },
      { t: [{ no: 'De sier huset ved vannet er ferdig. På tide. En bonde trenger vegger som ikke er sine egne armer.', en: 'They tell me the house by the water is finished. About time. A farmer needs walls that are not their own two arms.' }],
        if: S => S.act2Unlocked },
      /* ---- the festival, and the rest of the valley -------------------- */
      { mood: 'warm', t: [{ no: 'Festdag. Jeg går ned med ost og kommer opp uten.', en: 'Festival day. I go down with cheese and come back up without.' }],
        if: S => !!S.festival },
      { t: ['Four times a year I see all seven of them at once. It is enough.'], if: S => !!S.festival },
      { t: [{ no: 'Brunost i sekken. Spis den før den blir hard, ikke etter.', en: 'Brown cheese in the bag. Eat it before it goes hard, not after.' }],
        if: S => (S.bag.brunost || 0) > 0 },
      { t: ['A goat in a pen is a goat looking for the gap. Check the fence.'],
        if: S => S.animals && S.animals.length > 0 },
      { mood: 'troubled', t: [{ no: 'Fem multe. De ligger i gresset og venter. Bøy deg.', en: 'Five cloudberries. They are lying in the grass waiting. Bend down.' }],
        if: S => S.q.multe === 'active' },
      { t: ['Astrid takes my cheese at a price that insults us both. We keep at it.'] },
      { t: [{ no: 'Olav ror ost ut til fjorden for meg. Han tar ikke betalt, og jeg spør ikke.', en: 'Olav rows cheese out to the fjord for me. He takes nothing, and I do not ask.' }],
        if: S => S.flag.boat },
      { mood: 'warm', t: ['You have made that climb more times than I bothered to count. That is rare.'],
        if: S => S.fr.sigrid >= 8 },
      { mood: 'warm', t: [{ no: 'Jeg går ned fordi jeg vil. Det er en helt annen vinter.', en: 'I come down because I choose to. That is an entirely different winter.' }],
        if: S => S.flag.valgte }
    ],
    shop: ['brunost', 'ullgenser', 'multekrem', 'lefse', 'dyrefor', 'geit', 'hone']
  }
};
