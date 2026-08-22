/* Bekkedal — what the two in the square say. One quarter of BEK_TALK;
 * data.js joins the four into one table. Conventions: `.claude/rules/
 * content.md`. A `nodes[]` entry fires once, in array order, so each arc
 * below is stated lowest friendship gate first; `chat[]` is the fallback
 * pool, filtered on `if` every visit.
 *
 * Astrid wants the shop to be worth keeping open, and will not talk about
 * the second name in the ledger. Håkon wants one building that outlasts
 * him, and will not talk about the barn he got wrong.
 */

/* season is an index on S, not an id — see fresh()'s own seasonIndexOf() */
const VAR = 0, SOMMER = 1, HOST = 2, VINTER = 3;
const fish = S => (S.bag.orret || 0) + (S.bag.laks || 0) + (S.bag.torsk || 0) +
                  (S.bag.makrell || 0) + (S.bag.roye || 0) + (S.bag.kveite || 0);
const idle = S => !S.yst.farm && !S.yst.mine && !S.yst.fish && !S.yst.forage;
/* THE LOFT: how much has been carried into the storehouse on the square. Read
   defensively, like every other gate in this file — the state a check hands a
   predicate is not always the state a running game holds. See BEK_LOFT
   (data.js) and spine.js; nothing in BEK_TALK ever writes to it. */
const loft = S => (S.spine && S.spine.d) ? Object.keys(S.spine.d).length : 0;

export const TOWN_TALK = {
  astrid: {
    nodes: [
      { id: 'a1', mood: 'warm',
        lines: [{ no: 'Hei! You are the one who took the old plot.', en: 'Hi! You are the one who took the old plot.' },
                { no: 'Nobody has turned that soil in six years.', en: 'Nobody has turned that soil in six years.', m: 'troubled' }],
        ask: { q: { no: 'Hvorfor kom du til Bekkedal?', en: 'Why did you come to Bekkedal?' }, opts: [
          { t: { no: 'For stillheten.', en: 'For the quiet.' }, set: { why: 'quiet' }, fr: 2,
            reply: ['Then you came to the right valley.',
                    { no: 'Ta disse. Poteter tilgir en nybegynner.', en: 'Take these. Potatoes forgive a beginner.' }],
            give: { potetfro: 6 } },
          { t: { no: 'Jorda var billig.', en: 'Land was cheap.' }, set: { why: 'land' }, fr: 0,
            reply: ['Honest, at least. Ha!',
                    'Cheap land, cheap seed. Here.'],
            give: { potetfro: 8 } }
        ] } },
      { id: 'a2', when: S => S.q.potet === 'active',
        lines: [{ no: 'Five poteter and the board is happy.', en: 'Five potatoes and the board is happy.' }] },
      /* ---- her arc: the order book ---------------------------------- */
      { id: 'aa1', when: S => S.fr.astrid >= 2,
        lines: ['You are reading the order book upside down. Stop.',
                { no: 'Det er tall. Tall er ikke samtale.', en: 'It is numbers. Numbers are not conversation.' }] },
      { id: 'aa2', when: S => S.fr.astrid >= 4,
        lines: [{ no: 'Jeg bestiller for førti. Det bor tjueni her.', en: 'I order for forty. Twenty-nine live here.' },
                'I have done it that way eleven years.',
                { no: 'Fulle kasser får en bygd til å se ut som en bygd.', en: 'Full crates make a village look like a village.', m: 'troubled' }] },
      { id: 'a3', mood: 'warm', when: S => S.fr.astrid >= 6 && S.flag.why === 'quiet',
        lines: ['You still have not complained about the rain.',
                { no: 'That is how I know you meant it. Kaffe, on me.', en: 'That is how I know you meant it. Coffee, on me.' }],
        give: { kaffe: 2 } },
      { id: 'a4', when: S => S.fr.astrid >= 6 && S.flag.why === 'land',
        lines: ['You drive a hard bargain, so I will match it.',
                'Ten percent off, permanently. Do not tell Håkon.'],
        set: { rabatt: 1 } },
      { id: 'aa3', mood: 'troubled', when: S => S.fr.astrid >= 6,
        lines: [{ no: 'Grossisten i byen har satt en nedre grense. Jeg når den ikke.', en: 'The wholesaler in the city has set a minimum. I do not meet it.' },
                { no: 'Så bestiller jeg for en bygd som ikke finnes. Eller så stenger jeg.', en: 'So I order for a village that is not here. Or I close.' }] },
      { id: 'a5', mood: 'warm', when: S => S.fr.astrid >= 8,
        lines: [{ no: 'Jordbær seed came in. Slow, but it pays.', en: 'Strawberry seed came in. Slow, but it pays.' }],
        set: { jordbar: 1 } },
      { id: 'aa4', when: S => S.fr.astrid >= 8,
        lines: ['I sat with the book last night and crossed names out.',
                { no: 'Tjueni navn. Ikke førti. Det er vondt å skrive.', en: 'Twenty-nine names. Not forty. It is a hard thing to write.', m: 'troubled' },
                'The order is smaller now. It is also true.'] },
      { id: 'a6', mood: 'warm', when: S => S.fr.astrid >= 10,
        lines: ['You have made this a real farm. I am glad you stayed.'] },
      { id: 'aa5', mood: 'warm', when: S => S.fr.astrid >= 10,
        lines: [{ no: 'Den nye bestillingen kom. Ingenting til overs, ingenting for lite.', en: 'The new order came. Nothing left over, nothing short.' },
                'And one line at the bottom that is only yours.'],
        give: { lefse: 3 }, set: { astridBok: 1 } },
      /* THE LOFT. Act II has to have closed — the house is the thing that
         should own the early game — and she has to trust you with it, because
         it was her grandmother's. The 6 is BEK_LOFT_FR (data.js), which
         spine.js's spineOpen() reads for the door's own lock; the two are
         stated apart because this file may not import data.js (data.js
         imports this one), and spine_check.js asserts they agree. */
      { id: 'aloft', mood: 'warm', when: S => S.act2Unlocked && S.fr.astrid >= 6,
        lines: [{ no: 'Du har bygget ferdig. Så da spør jeg om noe.', en: 'You have finished building. So now I ask you something.' },
                { no: 'Bygdeloftet ved veien er mormors. Det har stått låst i seks år.', en: 'The loft down the road was my grandmother\u2019s. It has stood locked six years.' },
                { no: 'Hun samlet dalen i det. Alt som vokste, alt som ble fisket, alt som ble hentet ut av fjellet.', en: 'She gathered the valley into it. Everything that grew, everything caught, everything the mountain gave up.' },
                { no: 'Nøkkelen ligger her. Fyll det opp igjen. Trykk L, så husker du hva som mangler.', en: 'Here is the key. Fill it up again. Press L and you will remember what is missing.' }] }
    ],
    chat: [
      { mood: 'warm', t: [{ no: 'God morgen. The kettle is on.', en: 'Good morning. The kettle is on.' }] },
      { mood: 'troubled', t: ['Rain on Tuesday, my knee says so.'] },
      { t: ['The lantern is for the mine. Lars is down there.'] },
      { t: ['The road runs west to your gate and east to the water.'] },
      { t: ['Everything down here is a walk. Only the setra is a journey.'] },
      { t: [{ no: 'Åtte til åtte er jeg ved disken. Regner det, finn meg ved døren i stedet.', en: 'Eight to eight I am at the counter. If it rains, find me by the door instead.' }] },
      { mood: 'warm', t: ['You came for the quiet. It is still here.'], if: S => S.flag.why === 'quiet' },
      { mood: 'troubled', t: ['Land is cheap. Company is not.'], if: S => S.flag.why === 'land' },
      { t: ['Sigrid has wool up at the seter, if the vidda calls you.'], if: S => S.disc && S.disc.setra },
      { mood: 'warm', t: ['Håkon says you have been felling. Good.'], if: S => S.q.tommer === 'done' },
      /* THE LOFT */
      { mood: 'warm', t: [{ no: 'Loftet har tak igjen. Mormor ville ikke trodd det.', en: 'The loft has a roof again. My grandmother would not have believed it.' }],
        if: S => loft(S) >= 8 },
      /* ---- weather ---------------------------------------------------- */
      { mood: 'troubled', t: [{ no: 'Regn. Kneet mitt tok ikke feil. Det gjør det aldri.', en: 'Rain. My knee was not wrong. It never is.' }],
        if: S => S.weather === 'regn' },
      { t: [{ no: 'Tåke. Da går ingen forbi, og da selger jeg ingenting.', en: 'Fog. Nobody walks past, so I sell nothing.' }],
        if: S => S.weather === 'take' },
      { t: ['Clear sky. Everyone is out, and nobody is buying. Typical.'],
        if: S => S.weather === 'klar' && S.season === SOMMER },
      /* ---- season ----------------------------------------------------- */
      { t: [{ no: 'Vår. Halve dalen kommer inn for frø og går ut med kaffe.', en: 'Spring. Half the valley comes in for seed and leaves with coffee.' }],
        if: S => S.season === VAR },
      { t: [{ no: 'Høst. Nå selger jeg salt, og nesten ikke annet.', en: 'Autumn. Now I sell salt, and almost nothing else.' }],
        if: S => S.season === HOST },
      { mood: 'troubled', t: ['Winter. The road ices over and the cart comes when it comes.'],
        if: S => S.season === VINTER },
      /* ---- the hour --------------------------------------------------- */
      { t: ['The shutters are barely up. Give me a moment.'], if: S => S.min < 8 * 60 },
      { t: [{ no: 'Stengt for lengst. Men døren står åpen for deg.', en: 'Shut long ago. But the door stays open for you.' }],
        if: S => S.min >= 20 * 60 },
      /* ---- what you are carrying -------------------------------------- */
      { t: [{ no: 'Du lukter fisk. Ingrid har lært deg noe.', en: 'You smell of fish. Ingrid has taught you something.' }],
        if: S => fish(S) > 0 },
      { mood: 'troubled', t: [{ no: 'Sølv i sekken. Ikke vis det til hvem som helst.', en: 'Silver in the bag. Do not show that to just anyone.' }],
        if: S => (S.bag.solv || 0) > 0 },
      { mood: 'warm', t: ['Flowers. Those are not for me, and we both know it.'],
        if: S => (S.bag.bukett || 0) > 0 || (S.bag.blomst_bla || 0) > 0 },
      /* ---- what you did yesterday ------------------------------------- */
      { t: [{ no: 'Du var i gruva i går. Lykten holdt, altså.', en: 'You were in the mine yesterday. The lantern held, then.' }],
        if: S => S.yst.mine > 0 },
      { t: ['You did nothing yesterday. I am not judging. I am noticing.'], if: idle },
      /* ---- quests open ------------------------------------------------ */
      { t: [{ no: 'Tau til Olav? Lars fører det. Jeg sluttet med det.', en: 'Rope for Olav? Lars carries it. I stopped stocking it.' }],
        if: S => S.q.boat === 'active' },
      { t: [{ no: 'Sopp til Ingrid vokser tettest der skogen er mørkest.', en: 'Mushrooms for Ingrid grow thickest where the wood is darkest.' }],
        if: S => S.q.sopp === 'active' },
      /* ---- the rest of the valley ------------------------------------- */
      { t: [{ no: 'Håkon reiser sperrene dine i dag. Han sa mm om det.', en: 'Håkon is raising your rafters today. He said mm about it.' }],
        if: S => S.flag.lot && !S.built },
      { mood: 'troubled', t: ['Marit has not been down for salt in a month. Somebody should go up.'],
        if: S => S.disc && S.disc.enga },
      { t: [{ no: 'Sigrid er nede i dalen nå. Hun hater det og sier det ikke.', en: 'Sigrid is down in the valley now. She hates it and does not say so.' }],
        if: S => S.season === VINTER && S.disc && S.disc.setra },
      { mood: 'troubled', t: ['Olav has had that boat patched for years. It is the going out he cannot patch.'],
        if: S => S.disc && S.disc.lake },
      /* ---- what she will not talk about -------------------------------- */
      { mood: 'troubled', t: [{ no: 'Det står to navn i kassaboken. Spør om det andre en annen dag.', en: 'There are two names in the ledger. Ask about the second another day.' }],
        if: S => S.fr.astrid >= 6 },
      { t: ['That is an old page. I keep it because tearing it out would show.'],
        if: S => S.fr.astrid >= 8 },
      { mood: 'warm', t: [{ no: 'Bestillingen stemmer nå. Det er en merkelig følelse.', en: 'The order is right now. It is a strange feeling.' }],
        if: S => S.flag.astridBok },
      /* the four festival beats — one per season, gated on S.festival the
         same way every other chat line here gates on S.flag/S.fr. See
         BEK_FESTIVALS (data.js) for the day and the map dressing that goes
         with each. */
      { mood: 'warm', t: [{ no: 'Vårblot i dag! Se — noen har satt blomster på torget.', en: 'Spring Festival today! Look — someone has put flowers up in the square.' }],
        if: S => S.festival === 'var' },
      { mood: 'warm', t: [{ no: 'Solsnu i dag. Torget er pyntet for den lyseste natten.', en: 'Midsummer Fair today. The square is dressed for the lightest night.' }],
        if: S => S.festival === 'sommer' },
      { mood: 'warm', t: [{ no: 'Haustgilde i dag — takk for avlingen, før frosten tar den.', en: 'Harvest Fair today — thanks for the crop, before the frost takes it.' }],
        if: S => S.festival === 'host' },
      { mood: 'warm', t: [{ no: 'Juleblot i dag. Kaldt ute, men torget er pyntet likevel.', en: 'Midwinter Feast today. Cold out, but the square is dressed all the same.' }],
        if: S => S.festival === 'vinter' },
      { t: [{ no: 'Alle åtte på ett torg. Det skjer fire ganger i året, og jeg teller.', en: 'All eight of us in one square. Four times a year, and I count them.' }],
        if: S => !!S.festival },
      /* the tau/spiker Astrid used to carry are Lars's stock too — freeing
         one shop row is what makes room for the sprinkler on this list
         without the shop panel growing past SHOP_ROWS */
      { t: [{ no: 'A bigger sekk carries more before your back complains.', en: 'A bigger bag carries more before your back complains.' }],
        if: S => !S.bagTier && S.fr.astrid >= 2,
        buy: { label: { no: 'STØRRE SEKK — 400 kr', en: 'BIGGER BAG — 400 kr' }, kr: 400, bagCapAdd: 40, bagTier: 1,
               ok: ['There. Room to breathe.'],
               no: ['400 kr. Ask me again later.'] } },
      { t: [{ no: 'There is a bigger sekk still, if the first was not enough.', en: 'There is a bigger bag still, if the first was not enough.' }],
        if: S => S.bagTier === 1 && S.fr.astrid >= 6,
        buy: { label: { no: 'STOR SEKK — 900 kr', en: 'BIG BAG — 900 kr' }, kr: 900, bagCapAdd: 60, bagTier: 2,
               ok: ['Now you can carry half the valley.'],
               no: ['900 kr. When you have it.'] } },
      { t: [{ no: 'A bigger kanne holds more, and waters three furrows at once.', en: 'A bigger can holds more, and waters three furrows at once.' }],
        if: S => !S.kanneLv && S.fr.astrid >= 4,
        buy: { label: { no: 'STOR VANNKANNE — 700 kr', en: 'BIG WATERING CAN — 700 kr' }, kr: 700, kanneLv: 1, waterMaxAdd: 15,
               ok: ['Mind your wrist. It is heavier full.'],
               no: ['700 kr. Come back when you have it.'] } },
      /* Act II: one late beat per character acknowledging the finished
         house, gated on S.act2Unlocked exactly like the festival lines
         above gate on S.festival — a chat entry, not a node, so it keeps
         resurfacing rather than firing once and being spent. */
      { mood: 'warm', t: [{ no: 'Huset ved vannet står nå. Bra. Dalen trengte en skorstein til.', en: 'The house by the water is standing now. Good. This valley needed one more chimney.' }],
        if: S => S.act2Unlocked },
      { t: [{ no: 'Tretti navn i boken igjen. Ditt er det nyeste.', en: 'Thirty names in the book again. Yours is the newest.' }],
        if: S => S.act2Unlocked && S.flag.astridBok }
    ],
    shop: ['potetfro', 'nepefro', 'gulrotfro', 'kalfro', 'jordbarfro', 'rabarbrafro',
           'laukfro', 'purrefro', 'kalrotfro', 'gresskarfro', 'spinatfro', 'gronnkalfro',
           'kaffe', 'vaffel', 'lefse', 'lykt', 'sprinkler', 'jar', 'keg']
  },

  hakon: {
    nodes: [
      { id: 'h1',
        lines: ['Snekkeriet. I build what people can pay for.',
                { no: 'You will want a house eventually. They all do.', en: 'You will want a house eventually. They all do.', m: 'warm' }],
        ask: { q: { no: 'Hvordan skal det bygges?', en: 'How should it be built?' }, opts: [
          { t: { no: 'Fra skogen. Jeg feller det selv.', en: 'From the forest. I will fell it myself.' }, set: { build: 'skog' }, fr: 2,
            reply: ['Good. Timber you carry is timber you respect.',
                    { no: 'Thirty tømmer, twenty stein, and 5000 kr.', en: 'Thirty timber, twenty stone, and 5000 kr.' }] },
          { t: { no: 'Bestill plankene. Jeg betaler.', en: 'Order the planks. I will pay.' }, set: { build: 'kjop' }, fr: 0,
            reply: ['City answer. Fine. It costs what it costs.',
                    { no: 'Twelve tømmer, ten stein, and 6500 kr.', en: 'Twelve timber, ten stone, and 6500 kr.' }] }
        ] } },
      { id: 'h2', when: S => S.q.tommer === 'active',
        lines: [{ no: 'Ten tømmer. The øks is by the stump, as always.', en: 'Ten timber. The axe is by the stump, as always.' }] },
      /* ---- his arc: one thing that outlasts him ---------------------- */
      { id: 'ha1', when: S => S.fr.hakon >= 2,
        lines: ['Mm.',
                { no: 'Du står der fortsatt. Greit.', en: 'You are still standing there. Fine.' },
                'Forty-one jobs in this valley. Thirty-eight of them were repairs.'] },
      { id: 'h3', when: S => S.q.tommer === 'done' && !S.flag.lot,
        lines: [{ no: 'Tomten ved vannet er til salgs. 1200 kr.', en: 'The lot by the water is for sale. 1200 kr.' },
                'Trees on three sides, water on the fourth.',
                'Sign is down there. I will know when you have.'] },
      { id: 'h4', when: S => S.q.tommer === 'done' && S.axeLv < 2,
        lines: [{ no: 'The big gran need a STÅLØKS. I sell one for 900 kr.', en: 'The big firs need a STEEL AXE. I sell one for 900 kr.' }],
        buy: { label: { no: 'STÅLØKS — 900 kr', en: 'STEEL AXE — 900 kr' }, kr: 900, axeLv: 2,
               ok: ['Mind the swing. It bites deeper.'],
               no: ['900 kr. Come back when you have it.'] } },
      { id: 'ha2', when: S => S.fr.hakon >= 4,
        lines: ['Three of them are mine. A shed, a pen, a privy.',
                { no: 'Ingen av dem står om femti år.', en: 'None of the three stand in fifty years.', m: 'troubled' },
                'A man should be able to point at one thing.'] },
      { id: 'ha3', mood: 'troubled', when: S => S.fr.hakon >= 6,
        lines: [{ no: 'Stavkirken oppe på enga. Mønsåsen er råtten i vestre ende.', en: 'The stave church up on the meadow. The ridge beam is rotten at the west end.' },
                'I went up and looked at it once. A long time ago.',
                { no: 'Menigheten hadde ingen penger. Så gikk jeg ned igjen.', en: 'The parish had no money. So I walked back down.' }] },
      { id: 'h5', mood: 'warm', when: S => S.fr.hakon >= 8 && S.flag.build === 'skog',
        lines: ['Five hundred off the house. You did the felling, not me.'],
        set: { rabatt2: 1 } },
      { id: 'ha4', when: S => S.fr.hakon >= 8,
        lines: ['Marit sent word down. She did not ask. She described it.',
                { no: 'Det er en verre måte å be på. Den virker.', en: 'That is a worse way to ask. It works.' },
                'I am going up with a rule and a saw.'] },
      { id: 'ha5', mood: 'warm', when: S => S.fr.hakon >= 10,
        lines: [{ no: 'Mønsåsen er skiftet. Furu, kjerneved, felt om vinteren.', en: 'The ridge beam is changed. Pine, heartwood, felled in winter.' },
                'It will hold four hundred winters. I will see none of them.',
                { no: 'Jeg tok ikke betalt. Ikke spør hvorfor.', en: 'I took no payment. Do not ask why.' }],
        set: { mone: 1 } }
    ],
    chat: [
      { t: ['Mm.'] },
      { t: ['Wood moves in autumn. Build in summer.'] },
      { t: [{ no: 'Stein comes out of the gruva with the ore. Bring both.', en: 'Stone comes out of the mine with the ore. Bring both.' }] },
      { mood: 'warm', t: ['Timber you carry is timber you respect.'], if: S => S.flag.build === 'skog' },
      { mood: 'troubled', t: ['The planks are ordered. They come when they come.'], if: S => S.flag.build === 'kjop' },
      /* THE LOFT */
      { t: [{ no: 'Jeg gikk inn i loftet og så på laftet. Den som hogg det, kunne det.', en: 'I went into the loft and looked at the joints. Whoever cut them knew how.' }],
        if: S => loft(S) >= 1 },
      /* ---- weather ---------------------------------------------------- */
      { mood: 'troubled', t: [{ no: 'Regn. Da høvler jeg innendørs og sier ingenting.', en: 'Rain. Then I plane indoors and say nothing.' }],
        if: S => S.weather === 'regn' },
      { t: [{ no: 'Tåke. Man kan ikke sikte langs en planke i tåke.', en: 'Fog. You cannot sight down a ridge plank in fog.' }],
        if: S => S.weather === 'take' },
      /* ---- season ----------------------------------------------------- */
      { t: [{ no: 'Vinterhogd furu. Ingen sevje, ingen vridning. Vent til det er kaldt.', en: 'Pine felled in winter. No sap, no twist. Wait for the cold.' }],
        if: S => S.season === VINTER },
      { t: ['Spring wood is wet wood. Fell it now and it warps by autumn.'], if: S => S.season === VAR },
      { t: [{ no: 'Sommer. Nå tørker det jeg felte i fjor. Det er hele jobben.', en: 'Summer. Now what I felled last year dries. That is the whole job.' }],
        if: S => S.season === SOMMER },
      /* ---- the hour --------------------------------------------------- */
      { t: ['Seven to eight, and the site is where I am. Not the shop.'], if: S => S.min < 9 * 60 },
      { mood: 'troubled', t: [{ no: 'Mørkt. En sag i mørket tar en finger. Kom i morgen.', en: 'Dark. A saw in the dark takes a finger. Come tomorrow.' }],
        if: S => S.min >= 20 * 60 },
      /* ---- what you are carrying -------------------------------------- */
      { mood: 'warm', t: [{ no: 'Du bærer tømmer. Da trenger vi ikke snakke.', en: 'You are carrying timber. Then we need not talk.' }],
        if: S => (S.bag.tommer || 0) > 0 },
      { t: [{ no: 'Stein i sekken og rett rygg. Du lærer.', en: 'Stone in the bag and a straight back. You are learning.' }],
        if: S => (S.bag.stein || 0) >= 3 },
      /* ---- what you did yesterday ------------------------------------- */
      { t: ['You felled yesterday. I could hear which tree it was.'], if: S => S.yst.forage > 0 && S.q.tommer !== 'active' },
      { mood: 'troubled', t: ['A day with nothing in it. I have had those. They add up.'], if: idle },
      /* ---- the rest of the valley ------------------------------------- */
      { t: [{ no: 'Astrid fører spiker. Nei. Det gjør Lars nå. Jeg glemmer det hver gang.', en: 'Astrid stocks nails. No. Lars does now. I forget every time.' }] },
      { mood: 'troubled', t: ['Olav wants that boat rebuilt, not patched. He will not say it.'],
        if: S => S.disc && S.disc.lake },
      { t: [{ no: 'Marit sier at kirken heller. Den har hellet i åtte hundre år.', en: 'Marit says the church leans. It has leaned eight hundred years.' }],
        if: S => S.disc && S.disc.enga },
      { t: ['Lars props his own drifts. Green timber. I have told him twice.'],
        if: S => S.disc && S.disc.gruva },
      /* ---- what he will not talk about --------------------------------- */
      { mood: 'troubled', t: [{ no: 'Det står et fjøs lenger opp i dalen med mitt navn på. Ikke spør.', en: 'There is a barn further up the valley with my name on it. Do not ask.' }],
        if: S => S.fr.hakon >= 6 },
      { t: ['I was twenty-three and I was sure. That is all you get.'], if: S => S.fr.hakon >= 8 },
      { mood: 'warm', t: [{ no: 'Åsen ligger. Åtte hundre vintre til, om ingen roter det til.', en: 'The beam is in. Eight hundred more winters, if nobody meddles.' }],
        if: S => S.flag.mone },
      { t: [{ no: 'Jorda sør for tomten din ville pløyd rent, om du ville bryte den.', en: 'The ground south of your plot would till clean, if you wanted it broken.' }],
        if: S => !S.flag.plot2 && S.q.tommer === 'done',
        buy: { label: { no: 'NYTT JORDE — 800 kr', en: 'NEW FIELD — 800 kr' }, kr: 800, flag: { plot2: 1 },
               ok: ['I will have it cleared by morning.'],
               no: ['800 kr. The ground will keep.'] } },
      { t: [{ no: 'Enda lenger ut, om det første jordet fyltes fort.', en: 'Further out still, if the first field filled up fast.' }],
        if: S => S.flag.plot2 && !S.flag.plot3,
        buy: { label: { no: 'STØRRE JORDE — 1500 kr', en: 'BIGGER FIELD — 1500 kr' }, kr: 1500, flag: { plot3: 1 },
               ok: ['That is most of the flat ground gone now.'],
               no: ['1500 kr. No rush.'] } },
      { t: [{ no: 'Et gjerde i hjørnet ville holde dyr unna det du nettopp ryddet.', en: 'A pen in the corner would keep animals off what you just cleared.' }],
        if: S => S.flag.plot3 && !S.flag.barn,
        buy: { label: { no: 'DYREINNHEGNING — 1100 kr', en: 'ANIMAL PEN — 1100 kr' }, kr: 1100, flag: { barn: 1 },
               ok: ['Fenced and strawed. Sigrid will sell you what goes in it.'],
               no: ['1100 kr. The fence will keep.'] } },
      /* Act II: the pen's second tier — kr-only, so the generic `buy` offer
         fits (unlike the house tier itself, which spends tømmer/stein too
         and stays in hakonBuild()). Gated on S.flag.barn so it only ever
         follows the first pen, and S.act2Unlocked so it cannot outrun the
         house. See BEK_BARN_PLOT2/BEK_BARN_SLOTS2 (data.js). */
      { t: [{ no: 'Nå som du har eget tak, kunne innhegningen godt vokse også.', en: 'Now that you have a roof of your own, the pen could stand to grow too.' }],
        if: S => S.act2Unlocked && S.flag.barn && !S.flag.barn2,
        buy: { label: { no: 'DYREINNHEGNING II — 1400 kr', en: 'ANIMAL PEN II — 1400 kr' }, kr: 1400, flag: { barn2: 1 },
               ok: ['Doubled it. Sigrid will be glad to hear it.'],
               no: ['1400 kr. It will keep.'] } },
      { mood: 'warm', t: [{ no: 'Huset står i vinkel. Jeg sjekket, da du ikke så på.', en: 'The house stands square. I checked, when you weren’t looking.' }],
        if: S => S.act2Unlocked },
      { t: [{ no: 'Førtitre jobber nå. To av dem blir stående. Det holder.', en: 'Forty-three jobs now. Two of them will stand. That is enough.' }],
        if: S => S.act2Unlocked && S.flag.mone }
    ],
    /* ---- FURNISHING: not `shop` — that field is read unconditionally at
       the end of every conversation (openMenu(), index.js) and would skip
       hakonBuild()'s whole lot/house/tier funnel. This one is opened by
       hakonTilbygg() itself, once there is nothing else left to build —
       a carpenter selling furniture once the house is up. */
    /* gjerde stays craft-only, same as it always was ("not sold anywhere" —
       BEK_ITEMS.gjerde) — everything else here is buyable and craftable both */
    furniture: ['stol', 'bord', 'matte', 'seng', 'hylle', 'kommode', 'lampe', 'lys', 'veggbilde',
                'grind', 'sti', 'blomsterkasse', 'benk', 'fugleskremsel', 'skilt']
  }
};
