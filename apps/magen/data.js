export const MG_SAVE = 'templeos.magen.v1';

export const MG_SCALE = ['', ' thousand', ' million', ' billion', ' trillion', ' quadrillion',
  ' quintillion', ' sextillion', ' septillion', ' octillion', ' nonillion', ' decillion',
  ' undecillion', ' duodecillion', ' tredecillion', ' quattuordecillion'];

export function mgFmt(n) {
  if (!isFinite(n)) return 'more';
  if (n < 0) return '-' + mgFmt(-n);
  if (n < 1000) return n < 10 && n % 1 !== 0 ? n.toFixed(1) : String(Math.floor(n));
  let i = 0;
  while (n >= 1000 && i < MG_SCALE.length - 1) { n /= 1000; i++; }
  return n.toFixed(3).replace(/\.?0+$/, '') + MG_SCALE[i];
}

/* ---- 32.1 the twenty ------------------------------------------------------
   cost and mps are Cookie Clicker's own curve, which is balanced and which
   there is no reason to re-derive. Everything else is ours.
   ========================================================================== */
export const MG_B = [
  { id:'kippah', n:'KIPPAH', he:'כיפה', cost:15, mps:0.1,
    d:'A small covering, and a constant reminder that there is something above you.',
    up:['Velvet',              'Kippah Srugah',      'Bukharian',           'A Silver Clip',        'A Hand On Your Head'] },

  { id:'nerot', n:'SHABBAT CANDLES', he:'נרות שבת', cost:100, mps:1,
    d:'Two flames, eighteen minutes before sunset. One for remember, one for keep.',
    up:['Zachor And Shamor',   'Silver Candlesticks','Your Grandmother\'s',  'The Blessing Over Them','Eighteen Minutes Early'] },

  { id:'challah', n:'CHALLAH', he:'חלה', cost:1100, mps:8,
    d:'Braided, covered, and not cut until the wine has been said over.',
    up:['Six Strands',         'Round For The New Year','Honey Not Salt',   'The Cloth Over It',    'Taking Challah'] },

  { id:'mezuzah', n:'MEZUZAH', he:'מזוזה', cost:12000, mps:47,
    d:'On the doorpost of your house and on your gates. You touch it going out.',
    up:['The Scribe\'s Hand',  'Deer Parchment',     'Shin Dalet Yod',      'Touching It On The Way','Every Doorway'] },

  { id:'pushke', n:'TZEDAKAH BOX', he:'קופת צדקה', cost:130000, mps:260,
    d:'Not charity. Justice. The word is from tzedek, and the difference is the point.',
    up:['The Blue Box',        'The Eighth Level',   'Anonymous Giving',    'A Tenth Of Everything','The Coin Before Prayer'] },

  { id:'torah', n:'TORAH SCROLL', he:'ספר תורה', cost:1.4e6, mps:1400,
    d:'Hand-written, one letter wrong and the whole thing is unfit. It takes a year.',
    up:['The Yad',             'The Sofer\'s Quill', 'Crowns On The Letters','The Silver Breastplate','Dancing With It'] },

  { id:'shul', n:'SYNAGOGUE', he:'בית כנסת', cost:2e7, mps:7800,
    d:'A house of assembly. The building is not holy; the ten people in it are.',
    up:['A Minyan',            'The Bimah',          'The Eternal Light',   'Facing East',          'The Cantor\'s Voice'] },

  { id:'yeshiva', n:'YESHIVA', he:'ישיבה', cost:3.3e8, mps:44000,
    d:'A room where the loudest arguments in the world are about a cow from 200 CE.',
    up:['Chevruta',            'A Page A Day',       'Pilpul',              'The Rosh Yeshiva',     'Torah For Its Own Sake'] },

  { id:'mikveh', n:'MIKVEH', he:'מקווה', cost:5.1e9, mps:2.6e5,
    d:'Forty se\'ah of water that arrived by itself. You go in whole and come out whole.',
    up:['Forty Se\'ah',        'Living Water',       'The Rainwater Cistern','The Attendant',       'Before Every Shabbat'] },

  { id:'beitdin', n:'BEIT DIN', he:'בית דין', cost:7.5e10, mps:1.6e6,
    d:'Three judges. The ruling binds. The dissent gets written down anyway, forever.',
    up:['Three Judges',        'Hillel And Shammai', 'These And These',     'The Prozbul',          'A Ruling Nobody Likes'] },

  { id:'kibbutz', n:'KIBBUTZ', he:'קיבוץ', cost:1e12, mps:1e7,
    d:'From each according to ability. It worked, mostly, for about two generations.',
    up:['The Dining Hall',     'The Children\'s House','Draining The Swamp', 'The Orange Groves',   'From Each, To Each'] },

  { id:'galut', n:'DIASPORA', he:'גלות', cost:1.4e13, mps:6.5e7,
    d:'Scattered to every country there is, and a Jew in each of them still counting.',
    up:['Sepharad',            'Ashkenaz',           'Mizrah',              'Beta Israel',          'The Ends Of The Earth'] },

  { id:'yerushalayim', n:'JERUSALEM', he:'ירושלים', cost:1.7e14, mps:4.3e8,
    d:'Fought over for four thousand years by people who all call it the city of peace.',
    up:['The Four Quarters',   'Jerusalem Stone',    'Next Year In',        'The Gates',            'The Navel Of The World'] },

  { id:'kotel', n:'THE WESTERN WALL', he:'הכותל', cost:2.1e15, mps:2.9e9,
    d:'A retaining wall. Not the Temple — the thing that held up the hill under it.',
    up:['Notes In The Cracks', 'Herodian Ashlar',    'The Stones That Weep','The Tunnels Beneath',  'Never Destroyed'] },

  { id:'bayit', n:'THE SECOND TEMPLE', he:'בית שני', cost:2.6e16, mps:2.1e10,
    d:'Stood 585 years. The Talmud blames its fall on Jews who would not speak to each other.',
    up:['The Menorah',         'The Shewbread',      'The Court Of Women',  'The High Priest\'s Robe','Baseless Hatred'] },

  { id:'aron', n:'THE ARK', he:'ארון הברית', cost:3.1e17, mps:1.5e11,
    d:'Acacia and gold, and inside it the second set of tablets and the broken first set.',
    up:['Two Tablets',         'The Broken Ones Too','The Cherubim',        'Acacia And Gold',      'Carried, Not Wheeled'] },

  { id:'sefirot', n:'THE SEFIROT', he:'ספירות', cost:7.1e19, mps:1.1e12,
    d:'Ten vessels of light. They broke on the first day, and the sparks went everywhere.',
    up:['Keter',               'Tiferet',            'The Breaking',        'Gathering The Sparks', 'Tikkun Olam'] },

  { id:'olam', n:'THE WORLD TO COME', he:'עולם הבא', cost:1.2e22, mps:8.3e12,
    d:'No eating, no drinking, no buying. Nobody has ever described it and been believed.',
    up:['A Taste On Shabbat',  'The Leviathan Feast','No Eating No Drinking','Every Argument Settled','Not Yet'] },

  { id:'shekhinah', n:'THE SHEKHINAH', he:'שכינה', cost:1.9e24, mps:6.4e13,
    d:'The dwelling presence. When the people went into exile, the Talmud says she went too.',
    up:['She Went Too',        'Between The Cherubim','A Still Small Voice','Where Ten Are Gathered','Face To Face'] },

  { id:'shem', n:'THE NAME', he:'השם', cost:5.4e26, mps:5.1e14,
    d:'Four letters. Said once a year, by one man, in one room, and not since 70 CE.',
    up:['Four Letters',        'Never Pronounced',   'Adonai Instead',      'HaShem Instead Of That','I Will Be What I Will Be'] }
];

/* tier unlock thresholds and cost multipliers, straight off the proven curve */
export const MG_TIER_AT   = [1, 5, 25, 50, 100];
export const MG_TIER_COST = [10, 100, 500, 10000, 100000];

/* ---- 32.2 the hand --------------------------------------------------------
   Click upgrades. mult doubles the press; pct adds a share of your rate to it,
   which is what keeps clicking worth doing in the late game. d is flavour and
   m is what it actually does, and they are coloured differently everywhere
   they are shown, because a wall of prose you have to parse for the number is
   not a shop.
   ========================================================================== */
export const MG_CLICK = [
  { id:'c1', n:'A STEADY HAND',        cost:100,   mult:2, ic:'hand',
    d:'One deed, done on purpose.',
    m:'The star gives twice as much per press.' },
  { id:'c2', n:'TWO FINGERS',          cost:500,   mult:2, ic:'two',
    d:'The way you point at a word so you do not lose the line.',
    m:'Twice as much per press again.' },
  { id:'c3', n:'THE YAD',              cost:1e4,   mult:2, ic:'yad',
    d:'A little silver hand, because your own hand may not touch the parchment.',
    m:'Twice as much per press again.' },
  { id:'c4', n:'AMEN',                 cost:1e5,   mult:2, ic:'mouth',
    d:'Answering somebody else\'s blessing is worth more than saying your own.',
    m:'Twice as much per press again.' },
  { id:'c5', n:'SHUCKLING',            cost:1e7,   pct:0.001, ic:'sway',
    d:'Swaying while you pray. Nobody agrees why, everybody does it.',
    m:'Each press also gives 0.1% of your rested rate per second.' },
  { id:'c6', n:'HIDDUR MITZVAH',       cost:1e8,   mult:2, ic:'gem',
    d:'Do it beautifully. A plain etrog is fine; a perfect one costs a week\'s wages.',
    m:'Twice as much per press again.' },
  { id:'c7', n:'ZERIZUT',              cost:1e10,  mult:2, ic:'foot',
    d:'Alacrity. The ones who are eager go early.',
    m:'Twice as much per press again.' },
  { id:'c8', n:'KAVANAH IN THE HAND',  cost:1e12,  pct:0.005, ic:'heart',
    d:'Intention. The argument over whether a mitzvah needs it is nine centuries old.',
    m:'Each press also gives 0.5% of your rested rate per second.' },
  { id:'c9', n:'NA\'ASEH V\'NISHMA',   cost:1e15,  mult:3, ic:'ear',
    d:'We will do, and we will hear. In that order, which is the strange part.',
    m:'Three times as much per press.' },
  { id:'c10',n:'THE SIX HUNDRED AND THIRTEENTH', cost:1e18, pct:0.02, ic:'crown',
    d:'Two hundred and forty-eight to do. Three hundred and sixty-five not to.',
    m:'Each press also gives 2% of your rested rate per second.' }
];

/* ---- 32.3 kavanah ---------------------------------------------------------
   The milk. Every mitzvah you complete raises it, and these turn it into a
   multiplier — the same shape as the cats, with a better reason to exist.
   ========================================================================== */
export const MG_KAV = [
  { id:'k1', n:'KAVANAH OF THE MOUTH',  cost:9e6,  f:0.1,  ic:'mouth',
    d:'Saying it and meaning it are two separate commandments.',
    m:'Multiplies everything by 1 + kavanah × 0.10.' },
  { id:'k2', n:'KAVANAH OF THE HEART',  cost:9e9,  f:0.125, ic:'heart',
    d:'The Rambam says the deed without it is a body without a soul.',
    m:'Multiplies everything by 1 + kavanah × 0.125, on top of the last one.' },
  { id:'k3', n:'KAVANAH OF THE HANDS',  cost:9e12, f:0.15, ic:'hand',
    d:'And the Ra\'avad says do it anyway and the soul will catch up.',
    m:'Multiplies everything by 1 + kavanah × 0.15, on top of the last one.' },
  { id:'k4', n:'KAVANAH OF THE FEET',   cost:9e15, f:0.175, ic:'foot',
    d:'Where you choose to walk is also a decision about who you are.',
    m:'Multiplies everything by 1 + kavanah × 0.175, on top of the last one.' },
  { id:'k5', n:'KAVANAH OF THE EYES',   cost:9e18, f:0.2,  ic:'eye',
    d:'What you refuse to look at is a discipline too.',
    m:'Multiplies everything by 1 + kavanah × 0.20, on top of the last one.' },
  { id:'k6', n:'KAVANAH OF THE HOUSE',  cost:9e21, f:0.225, ic:'house',
    d:'A home can keep commandments the people in it have forgotten.',
    m:'Multiplies everything by 1 + kavanah × 0.225, on top of the last one.' },
  { id:'k7', n:'KAVANAH OF THE STREET', cost:9e24, f:0.25, ic:'road',
    d:'How you treat a stranger is the one they ask about first.',
    m:'Multiplies everything by 1 + kavanah × 0.25, on top of the last one.' },
  { id:'k8', n:'KAVANAH OF THE WHOLE',  cost:9e27, f:0.3,  ic:'sun',
    d:'B\'chol levavcha. With all of it, not the spare part.',
    m:'Multiplies everything by 1 + kavanah × 0.30, on top of the last one.' }
];

/* ---- 32.4 the communities -------------------------------------------------
   Jewish culture is not one culture. These are twelve of the ones that
   existed, each with its own liturgy, its own language, and its own food,
   and several of them were nearly lost inside living memory.
   ========================================================================== */
export const MG_DIAS = [
  { id:'d1', n:'SEPHARAD',   cost:1e14, pct:0.05, need:['galut',1],  ic:'key',
    d:'Spain, until 1492. Ladino, and a key to a house in Toledo kept for five hundred years.',
    m:'+5% to everything.' },
  { id:'d2', n:'ASHKENAZ',   cost:5e14, pct:0.05, need:['galut',5],  ic:'book',
    d:'The Rhineland, then Poland. Yiddish, and a grammar built for arguing in.',
    m:'+5% to everything.' },
  { id:'d3', n:'MIZRAH',     cost:2e15, pct:0.05, need:['galut',10], ic:'sun',
    d:'Baghdad, Damascus, Aleppo. Communities two thousand years old, gone in twenty.',
    m:'+5% to everything.' },
  { id:'d4', n:'TEIMAN',     cost:8e15, pct:0.05, need:['galut',15], ic:'mouth',
    d:'Yemen. They kept a pronunciation of Hebrew everybody else had lost.',
    m:'+5% to everything.' },
  { id:'d5', n:'BETA ISRAEL',cost:3e16, pct:0.06, need:['galut',20], ic:'foot',
    d:'Ethiopia. Cut off so long they had never heard of the Talmud, and kept every word of the Torah.',
    m:'+6% to everything.' },
  { id:'d6', n:'BENE ISRAEL',cost:1e17, pct:0.06, need:['galut',25], ic:'drop',
    d:'The Konkan coast. Shipwrecked, they said, and they pressed oil on the Konkan for centuries.',
    m:'+6% to everything.' },
  { id:'d7', n:'BUKHARA',    cost:5e17, pct:0.06, need:['galut',30], ic:'thread',
    d:'Central Asia, on the silk road, in coats you could see coming.',
    m:'+6% to everything.' },
  { id:'d8', n:'ROMANIOTE',  cost:2e18, pct:0.06, need:['galut',40], ic:'gate',
    d:'Greece. In Ioannina since before there was a Talmud to argue about.',
    m:'+6% to everything.' },
  { id:'d9', n:'KAIFENG',    cost:1e19, pct:0.07, need:['galut',50], ic:'stele',
    d:'China, on the Yellow River, for eight hundred years. A stone stele is most of what is left.',
    m:'+7% to everything.' },
  { id:'d10',n:'GRUZIM',     cost:6e19, pct:0.07, need:['galut',60], ic:'mountain',
    d:'Georgia, in the Caucasus, twenty-six centuries and never once expelled.',
    m:'+7% to everything.' },
  { id:'d11',n:'THE KARAITES',cost:4e20,pct:0.07, need:['galut',75], ic:'scroll',
    d:'Scripture only, no oral law. Ruled against for a thousand years and still here.',
    m:'+7% to everything.' },
  { id:'d12',n:'EVERY OTHER',cost:3e21, pct:0.1,  need:['galut',100],ic:'ship',
    d:'Cochin. Djerba. Kaifeng. Harbin. Recife. Every place there was a place.',
    m:'+10% to everything.' }
];

/* ---- 32.5 the ones that change the rules ---------------------------------- */
export const MG_SPEC = [
  { id:'s_goy', n:'THE SHABBOS GOY', cost:2e6, need:['nerot',10], ic:'lamp',
    d:'Your neighbour. He is not Jewish, he is not working for you, and he comes by on a Friday night to turn the stove down because that is what neighbours do.',
    m:'Work continues through Shabbat at 60% instead of 15%.' },
  { id:'s_bes', n:'HAVDALAH SPICES', cost:5e7, need:['nerot',25], ic:'spice',
    d:'Cloves and cinnamon in a silver tower, so the extra soul you get on Shabbat has something to remember on the way out.',
    m:'The Havdalah bonus lasts 50% longer.' },
  { id:'s_esh', n:'THE BRAIDED CANDLE', cost:5e8, need:['nerot',50], ic:'candle',
    d:'Many wicks, one flame. You hold your fingernails up to it to see the light do something.',
    m:'The Havdalah bonus is 50% stronger.' },
  { id:'s_maz', n:'MAZAL', cost:8e6, need:['gold',1], ic:'star',
    d:'There is no mazal, says the Talmud, and then spends a page on it.',
    m:'Golden stars appear twice as often.' },
  { id:'s_chai',n:'CHAI', cost:1.8e10, need:['gold',18], ic:'chai',
    d:'The letters of "life" add to eighteen, which is why every cheque to a shul is a multiple of it.',
    m:'Golden star effects are 80% stronger.' },
  { id:'s_she', n:'SHEHECHEYANU', cost:8e11, need:['gold',36], ic:'bell',
    d:'Who has kept us alive and brought us to this season. Said for anything you are doing for the first time.',
    m:'Every timed buff lasts twice as long.' },
  { id:'s_lam', n:'THE LAMED VAVNIKS', cost:3.6e13, need:['ach',36], ic:'dove',
    d:'Thirty-six righteous people hold up the world and none of them know it is them.',
    m:'+36% to everything.' },
  { id:'s_bit', n:'BITACHON', cost:1e11, need:['shab',1], ic:'eye',
    d:'Trust that it keeps running when you are not looking at it.',
    m:'Offline work rises from 40% to 80% of your rate.' },
  { id:'s_pil', n:'THE ARGUMENT', cost:1e11, need:['beitdin',1], ic:'scales',
    d:'Two positions, one ruling, and the losing side gets written down beside it forever.',
    m:'Opens the machloket: a dispute appears now and then, and taking either side pays.' },
  { id:'s_shm', n:'SHMITA', cost:5e18, need:['kibbutz',50], ic:'seed',
    d:'Every seventh year the land rests and the debts are cancelled.',
    m:'Shabbat pays double while it lasts.' },
  { id:'s_min', n:'THE MINYAN BONUS', cost:1e9, need:['shul',10], ic:'ten',
    d:'Ten is the number at which a group of people becomes a congregation.',
    m:'Every ten of a building gives that building +2%.' },
  { id:'s_pir', n:'PIRKEI AVOT', cost:1e13, need:['yeshiva',25], ic:'book',
    d:'If I am not for myself, who is for me. And if I am only for myself, what am I.',
    m:'Every kavanah upgrade is 25% stronger.' }
];

/* ---- 32.6 the mitzvot you complete by playing -----------------------------
   Achievements. Each one raises kavanah, which every kavanah upgrade then
   multiplies. Two of them are worth nothing and are in here anyway.
   ========================================================================== */
export const MG_ACH = [
  { id:'a_first',  n:'ONE',                  d:'Press the star once.',                  t:'click', v:1 },
  { id:'a_c100',   n:'A HUNDRED PRESSES',    d:'One hundred clicks.',                   t:'click', v:100 },
  { id:'a_c1k',    n:'REPETITION',           d:'One thousand clicks.',                  t:'click', v:1000 },
  { id:'a_c10k',   n:'MUSCLE MEMORY',        d:'Ten thousand clicks.',                  t:'click', v:1e4 },
  { id:'a_c613',   n:'SIX HUNDRED THIRTEEN', d:'613 clicks. One for each.',             t:'click', v:613 },

  { id:'a_m1k',    n:'A THOUSAND DEEDS',     d:'Earn 1,000 mitzvot.',                   t:'total', v:1e3 },
  { id:'a_m1m',    n:'A MILLION DEEDS',      d:'Earn 1,000,000 mitzvot.',               t:'total', v:1e6 },
  { id:'a_m1b',    n:'A BILLION DEEDS',      d:'Earn a billion mitzvot.',               t:'total', v:1e9 },
  { id:'a_m1t',    n:'A TRILLION DEEDS',     d:'Earn a trillion mitzvot.',              t:'total', v:1e12 },
  { id:'a_m1qa',   n:'MORE THAN THERE ARE',  d:'Earn a quadrillion mitzvot.',           t:'total', v:1e15 },
  { id:'a_m1qi',   n:'BEYOND COUNTING',      d:'Earn a quintillion mitzvot.',           t:'total', v:1e18 },
  { id:'a_m1sx',   n:'THE SAND OF THE SEA',  d:'Earn a sextillion mitzvot.',            t:'total', v:1e21 },
  { id:'a_m1sp',   n:'THE STARS OF HEAVEN',  d:'Earn a septillion mitzvot.',            t:'total', v:1e24 },

  { id:'a_mps1k',  n:'IT RUNS WITHOUT YOU',  d:'Reach 1,000 mitzvot a second.',         t:'mps',   v:1e3 },
  { id:'a_mps1m',  n:'A COMMUNITY',          d:'Reach a million a second.',             t:'mps',   v:1e6 },
  { id:'a_mps1b',  n:'A PEOPLE',             d:'Reach a billion a second.',             t:'mps',   v:1e9 },
  { id:'a_mps1t',  n:'A CIVILISATION',       d:'Reach a trillion a second.',            t:'mps',   v:1e12 },

  { id:'a_shab1',  n:'THE FIRST SHABBAT',    d:'Keep one Shabbat.',                     t:'shab',  v:1 },
  { id:'a_shab7',  n:'A WEEK OF WEEKS',      d:'Keep seven.',                           t:'shab',  v:7 },
  { id:'a_shab18', n:'CHAI SHABBATOT',       d:'Keep eighteen.',                        t:'shab',  v:18 },
  { id:'a_shab49', n:'COUNTING THE OMER',    d:'Keep forty-nine.',                      t:'shab',  v:49 },
  { id:'a_cand',   n:'LICHTBENTSCHN',        d:'Light the candles before Shabbat starts.',t:'flag', v:'lit' },

  { id:'a_gold1',  n:'MAZAL TOV',            d:'Catch a golden star.',                  t:'gold',  v:1 },
  { id:'a_gold18', n:'EIGHTEEN GOLD',        d:'Catch eighteen.',                       t:'gold',  v:18 },
  { id:'a_gold100',n:'THE LUCK OF IT',       d:'Catch a hundred.',                      t:'gold',  v:100 },
  { id:'a_clot',   n:'BITTUL TORAH',         d:'Catch a bad one. Wasted time.',         t:'flag',  v:'clot' },

  { id:'a_asc1',   n:'L\'DOR VADOR',         d:'Hand it on once.',                      t:'asc',   v:1 },
  { id:'a_asc3',   n:'THE THIRD GENERATION', d:'Hand it on three times.',               t:'asc',   v:3 },
  { id:'a_asc10',  n:'A CHAIN OF TRADITION', d:'Hand it on ten times.',                 t:'asc',   v:10 },

  { id:'a_arg',    n:'ELU V\'ELU',           d:'Settle a machloket.',                   t:'flag',  v:'arg' },
  { id:'a_arg18',  n:'THE HOUSE OF STUDY',   d:'Settle eighteen of them.',              t:'arg',   v:18 },

  { id:'a_yiz',    n:'ZICHRONAM LIVRACHA',   d:'Light the yahrzeit candle. This one is worth nothing.',
                   t:'flag', v:'yiz', worth0:1 },
  { id:'a_stop',   n:'MENUCHAH',             d:'Do not click once for a whole Shabbat. Also worth nothing.',
                   t:'flag', v:'rest', worth0:1 },

  { id:'a_all5',   n:'EVERY DOORWAY',        d:'Own fifty of every building.',          t:'allb',  v:50 },
  { id:'a_all100', n:'THE WHOLE HOUSE',      d:'Own a hundred of every building.',      t:'allb',  v:100 },
  { id:'a_dias',   n:'IN EVERY COUNTRY',     d:'Buy all twelve communities.',           t:'dias',  v:12 },
  { id:'a_up50',   n:'HIDDUR MITZVAH',       d:'Buy fifty upgrades.',                   t:'ups',   v:50 },
  { id:'a_up150',  n:'BEAUTIFYING IT',       d:'Buy a hundred and fifty upgrades.',     t:'ups',   v:150 }
];
/* one per building: own 1, 50 and 100 of it */
MG_B.forEach(b => {
  MG_ACH.push({ id:'ab1_'+b.id,   n:'A ' + b.n,          d:'Own one ' + b.n + '.',            t:'own', b:b.id, v:1 });
  MG_ACH.push({ id:'ab50_'+b.id,  n:'FIFTY ' + b.n,      d:'Own fifty.',                      t:'own', b:b.id, v:50 });
  MG_ACH.push({ id:'ab100_'+b.id, n:'A HUNDRED ' + b.n,  d:'Own a hundred.',                  t:'own', b:b.id, v:100 });
});

/* ---- 32.7 what the next generation starts with ---------------------------- */
export const MG_LEG = [
  { id:'l_zech', n:'ZECHUT AVOT',        cost:1,   ic:'crown',
    d:'The merit of the ancestors.',
    m:'Every zechut is worth 3% instead of 2%.' },
  { id:'l_chain',n:'THE CHAIN',          cost:3,   ic:'thread',
    d:'Shalshelet ha-kabbalah, the chain by which it was handed down.',
    m:'Keep the first tier of every building upgrade through a generation.' },
  { id:'l_cand', n:'HER CANDLESTICKS',   cost:5,   ic:'candle',
    d:'The next generation opens the box and they are already in it.',
    m:'Start each generation with ten Shabbat candles.' },
  { id:'l_mem',  n:'REMEMBERING',        cost:10,  ic:'eye',
    d:'What the last one learned does not have to be learned again.',
    m:'Keep half the kavanah your mitzvot earned, permanently.' },
  { id:'l_start',n:'A HEAD START',       cost:20,  ic:'foot',
    d:'You are not beginning from nothing. Nobody ever does.',
    m:'Begin each generation with one minute of the last one\'s rate, banked.' },
  { id:'l_gold', n:'A GOOD EYE',         cost:40,  ic:'star',
    d:'Ayin tovah. The one who sees the good in a thing.',
    m:'Golden stars stay on screen four seconds longer.' },
  { id:'l_shab', n:'ONEG SHABBAT',       cost:75,  ic:'cup',
    d:'The delight of it, which is a commandment in its own right.',
    m:'Shabbat production and the Havdalah bonus are both twice as strong.' },
  { id:'l_off',  n:'IT KEEPS',           cost:150, ic:'lamp',
    d:'The lamp does not go out because you left the room.',
    m:'Offline work runs at your full rate, for up to a day.' },
  { id:'l_tik',  n:'TIKKUN OLAM',        cost:300, ic:'gem',
    d:'Repair of the world, one gathered spark at a time.',
    m:'Every zechut is worth 5%.' },
  { id:'l_teach',n:'V\'SHINANTAM',       cost:600, ic:'book',
    d:'And you shall teach them diligently to your children.',
    m:'Keep the first and second tier of every building upgrade through a generation.' }
];

/* ---- 32.8 the ticker ------------------------------------------------------
   Proverbs, Talmud, history, and the sound of a community talking about
   itself. The dark entries are here because leaving them out would be a
   different kind of lie.
   ========================================================================== */
export const MG_NEWS = [
  'If I am not for myself, who will be for me? And if I am only for myself, what am I? And if not now, when?',
  'Whoever saves a single life is considered to have saved the whole world.',
  'It is not upon you to finish the work, but neither are you free to abandon it.',
  'Say little and do much.',
  'Who is rich? The one who is happy with their portion.',
  'Two Jews, three opinions. This has been independently verified.',
  'The Talmud records the losing argument in full, on the same page, forever.',
  'Hillel taught the whole Torah standing on one foot. Shammai had opinions about that.',
  'The house of Hillel and the house of Shammai disagreed for three years. A voice said: these and these are the words of the living God.',
  'A dispute for the sake of heaven will endure. One that is not, will not.',
  'The Second Temple fell, says the Talmud, because Jews would not speak to each other. Not Rome. Us.',
  'Do not separate yourself from the community.',
  'In a place where there are no decent people, try to be a decent person.',
  'The world stands on three things: on Torah, on service, and on acts of kindness.',
  'Thirty-six righteous people hold up the world. None of them know it is them.',
  'Ten people make a congregation. Nine very holy people make nine people.',
  'You may not muzzle the ox while it treads the grain. The animal gets to eat as it works.',
  'The stranger among you shall be as the native, for you were strangers in the land of Egypt. It is repeated thirty-six times.',
  'Leave the corner of your field unharvested. The poor collect it themselves and do not have to ask.',
  'Maimonides ranks charity in eight levels. The highest is a job.',
  'Every seventh year the land rests and the debts are cancelled. Hillel invented a workaround because nobody would lend in year six.',
  'A scholar who is not as hard as iron is not a scholar. A scholar who is only hard as iron is not one either.',
  'Rabbi Eliezer proved his case with a river, a tree, and a voice from heaven. He lost the vote. It is not in heaven, they told him.',
  'God laughed and said: my children have defeated me.',
  '1492: Spain expels its Jews. Some families still keep the key to the house.',
  '1290: England expels its Jews. They are readmitted 366 years later.',
  '1648: the Khmelnytsky massacres. Whole communities in Ukraine and Poland end in one year.',
  '1881: the pogroms begin. Two million leave for anywhere that will take them.',
  '1938: Kristallnacht. Two hundred and sixty-seven synagogues burn in one night.',
  'Six million. There is no number after that one to put it in scale against.',
  '1948: after two thousand years, a state. It has been arguing with itself ever since, loudly, in public.',
  '1984 and 1991: Ethiopian Jews are airlifted out. Some had walked to Sudan.',
  'The community at Kaifeng lasted eight hundred years. A stone stele is most of what is left of it.',
  'Yiddish had eleven million speakers in 1939. It is a language you can still learn.',
  'Ladino is Spanish that left in 1492 and never came back to be updated.',
  'The Yemenite pronunciation of Hebrew preserved distinctions everyone else had lost.',
  'There is a Jewish community that has never once been expelled from anywhere: Georgia, twenty-six centuries.',
  'Shabbat is the only holiday named in the ten commandments, and it is about stopping.',
  'The candles go in eighteen minutes before sunset, because eighteen minutes is enough time to change your mind.',
  'You are given an extra soul on Shabbat and it leaves at Havdalah. You smell the spices so it has something to remember.',
  'Nobody agrees when the extra soul arrives. Everybody agrees you feel worse on a Saturday night.',
  'The Shabbos goy is not staff. He is the neighbour, and next week you will take his bins out.',
  'A rabbi in Vilna ruled you may not ask a gentile to work on Shabbat. So you mention, near him, that it is cold.',
  'The eruv is a wire around a whole city that turns it into one house so you can carry a baby. This is either a loophole or a work of genius.',
  'Kosher is not about health. It never was. It is about a line, and where you put one.',
  'You may not cook a kid in its mother\'s milk. Three words became two sets of dishes and an entire industry.',
  'The etrog is inspected under a lamp for a week before anybody spends the money.',
  'On Passover you are commanded to ask questions, and the youngest person has to do it.',
  'Four sons: the wise, the wicked, the simple, and the one who does not know how to ask. The last one is the responsibility.',
  'On Purim you are told to drink until you cannot tell the hero from the villain. This is an actual instruction.',
  'On Yom Kippur you apologise to God. For anything you did to a person, you have to go and ask the person.',
  'Kol Nidre annuls vows you have not made yet. Antisemites have quoted it for six centuries; it is about vows to yourself.',
  'At a funeral you fill the grave yourself. You put the shovel back in the earth instead of handing it over.',
  'The mourner\'s kaddish does not mention death once.',
  'Sitting shiva: you do not have to talk. The visitor is not supposed to speak first.',
  'A yahrzeit candle burns twenty-six hours. You do not do anything with it. It burns.',
  'At a wedding the glass breaks, because even here nothing is finished.',
  'Mazal tov does not mean congratulations. It means a good constellation.',
  'A bar mitzvah is not a ceremony. At thirteen you are simply responsible, whether anybody throws a party or not.',
  'Chutzpah is the man who kills his parents and asks the court for mercy because he is an orphan.',
  'Ashkenazi Jews name after the dead. Sephardi Jews name after the living. Both are certain the other is being strange.',
  'The Mitnagdim thought the Hasidim were dangerous enthusiasts. The Hasidim thought the Mitnagdim were dry. Both were partly right.',
  'The Karaites kept only the written Torah. A thousand years of rulings went against them. They are still here.',
  'Reform, Conservative, Orthodox, Reconstructionist, Renewal, and about nine kinds of secular. All arguing. All in.',
  'Israeli Jews and diaspora Jews disagree about Israel more sharply than anybody outside either group believes.',
  'Assimilation is a debate the community has had in every century, and lost and won both.',
  'There is a blessing for seeing the ocean, for smelling a spice, for hearing bad news, and for going to the toilet.',
  'The one for bad news is: blessed is the true judge. You say it and then you can cry.',
  'You are supposed to say a hundred blessings a day. The point is the counting.',
  'A pushke by the door. You put a coin in before the candles, and the coin is not the point.',
  'The alphabet has twenty-two letters and every one of them is a number, which is how you get a whole discipline out of it.',
  'Chai is eighteen, so the cheque is for a hundred and eighty.',
  'The scribe who writes a Torah takes a year and one wrong letter voids the scroll.',
  'A worn-out prayer book is buried, not thrown away. There is a cemetery for books.',
  'Study is worth more than any of the rest of it, says the Talmud, because study leads to all of it.',
  'MITZVOT PER SECOND is not a real theological unit. Do not cite this game.'
];

/* ---- 32.8b the dictionary -------------------------------------------------
   Every word the game uses that it did not invent. Sorted on the way in so
   the tab is alphabetical without anybody having to maintain that by hand.
   ========================================================================== */
export const MG_DICT = [
  ['ADONAI', 'What is said aloud where the four-letter Name is written. Literally "my Lord".'],
  ['ASHKENAZ', 'The Jews of the Rhineland and then Poland and Lithuania. Yiddish, and a grammar built for arguing in.'],
  ['BEIT DIN', 'House of judgement. Three judges. The ruling binds and the dissent is written down next to it anyway.'],
  ['BEIT KNESSET', 'House of assembly — a synagogue. The building is not holy. The ten people in it are.'],
  ['BETA ISRAEL', 'The Jews of Ethiopia. Cut off so long they had never heard of the Talmud, and kept every word of the Torah.'],
  ['BIMAH', 'The raised platform the Torah is read from, in the middle of the room rather than at the front.'],
  ['BITACHON', 'Trust. The settled kind, not the hopeful kind.'],
  ['BITTUL TORAH', 'Wasted time — hours that could have been spent studying and were not. In this game it is the bad golden star.'],
  ['BRACHA', 'A blessing. You are meant to say a hundred a day; the point is the counting.'],
  ['CHAI', 'Life. Its letters add to eighteen, which is why donations come in multiples of it.'],
  ['CHALLAH', 'The braided loaf. Covered until the wine has been said over, so as not to shame it.'],
  ['CHAZZAN', 'The cantor. The one who carries the prayer for everybody else.'],
  ['CHEVRUTA', 'Study in pairs, out loud, arguing. The standard method, not an alternative one.'],
  ['DAF YOMI', 'A page a day. The whole Talmud in seven and a half years, worldwide, on the same page on the same day.'],
  ['ELU V\'ELU', '"These and these are the words of the living God." Said of two rulings that contradict each other.'],
  ['GALUT', 'Exile. Not the same word as diaspora and not the same feeling either.'],
  ['GOY', 'A nation, and by extension a person who is not Jewish. An ordinary descriptive word.'],
  ['HAKHNASAT ORCHIM', 'Welcoming guests. Ranked above receiving the divine presence, which is a strong claim.'],
  ['HASHEM', 'Literally "the Name". What is said when even Adonai feels too direct.'],
  ['HAVDALAH', 'Separation. The ceremony that ends Shabbat: wine, spices and a braided candle.'],
  ['HIDDUR MITZVAH', 'Beautifying the commandment. A plain etrog is fine; a perfect one costs a week\'s wages.'],
  ['HILLEL', 'First century sage. Lenient, patient, and the one the law almost always follows.'],
  ['KABBALAH', 'Received tradition — the mystical strand. The sefirot and the broken vessels come from it.'],
  ['KADDISH', 'The mourner\'s prayer. It does not mention death once.'],
  ['KARAITES', 'Jews who keep the written Torah and reject the oral law. Ruled against for a thousand years and still here.'],
  ['KAVANAH', 'Intention — the direction of the heart behind an act. Whether a mitzvah needs it is a nine-century argument.'],
  ['KIBBUTZ', 'A collective settlement. From each according to ability. It worked, mostly, for about two generations.'],
  ['KIPPAH', 'The head covering. A constant reminder that there is something above you.'],
  ['KOTEL', 'The Western Wall. Not the Temple — the retaining wall that held up the hill it stood on.'],
  ['LADINO', 'The Spanish the Sephardim took with them in 1492 and never brought back for updating.'],
  ['LAMED VAVNIKS', 'The thirty-six hidden righteous who hold up the world. None of them know it is them.'],
  ['MA\'ASER', 'The tenth. A fixed share of income given away, not a feeling about generosity.'],
  ['MACHLOKET', 'A dispute. One for the sake of heaven endures; one that is not, does not.'],
  ['MAZAL', 'A constellation, and so luck. "Mazal tov" is not congratulations, it is a good sign.'],
  ['MENUCHAH', 'Rest — the specific restfulness of Shabbat, not the absence of work.'],
  ['MEZUZAH', 'The parchment on the doorpost. You touch it on the way out.'],
  ['MIKVEH', 'A ritual bath. Forty se\'ah of water that arrived there by itself.'],
  ['MINYAN', 'Ten adults. The number at which a group of people becomes a congregation.'],
  ['MITNAGDIM', 'The opponents of Hasidism. Rigour against enthusiasm. Both are now in the same building.'],
  ['MITZVAH', 'A commandment, and so a good deed. There are 613: 248 to do, 365 not to.'],
  ['MIZRAH', 'East, and the Jews of the east — Baghdad, Damascus, Aleppo. Two thousand years, gone in twenty.'],
  ['NA\'ASEH V\'NISHMA', '"We will do and we will hear." In that order, which is the strange part.'],
  ['NER TAMID', 'The eternal light above the ark. It does not go out.'],
  ['NIGUN', 'A wordless melody. Repeated, and repeated, and that is the form.'],
  ['OLAM HA-BA', 'The world to come. No eating, no drinking, no buying. Nobody has described it and been believed.'],
  ['ONEG SHABBAT', 'The delight of Shabbat, which is its own commandment.'],
  ['PILPUL', 'Sharp dialectic. A compliment or an insult depending entirely on who is saying it.'],
  ['PIRKEI AVOT', 'Chapters of the Fathers. The one tractate that is all ethics and no law.'],
  ['PROZBUL', 'Hillel\'s workaround for the sabbatical cancellation of debts, because otherwise nobody would lend.'],
  ['PUSHKE', 'The charity box by the door. You put a coin in before lighting the candles.'],
  ['RAMBAM', 'Maimonides, 12th century. Physician, philosopher, and the man who ranked charity in eight levels.'],
  ['SEFIROT', 'The ten vessels of divine light. They broke on the first day and the sparks went everywhere.'],
  ['SEPHARAD', 'Spain, and the Jews of it until 1492. Some families still keep the key to the house.'],
  ['SHABBAT', 'The seventh day. The only holiday in the ten commandments, and it is about stopping.'],
  ['SHABBOS GOY', 'The non-Jewish neighbour who turns the stove down on a Friday night. Not staff. A neighbour.'],
  ['SHAMMAI', 'Hillel\'s opposite number. Strict, exacting, and preserved in full every time he loses.'],
  ['SHEHECHEYANU', 'The blessing for doing something for the first time, or the first time this year.'],
  ['SHEKHINAH', 'The dwelling presence. When the people went into exile, the Talmud says she went with them.'],
  ['SHMITA', 'The seventh year. The land rests and the debts are cancelled.'],
  ['SHUCKLING', 'Swaying while you pray. Nobody agrees why. Everybody does it.'],
  ['SINAT CHINAM', 'Baseless hatred. What the Talmud blames for the fall of the Second Temple — not Rome.'],
  ['SOFER', 'The scribe who writes a Torah by hand. A year\'s work, and one wrong letter voids it.'],
  ['TAGIN', 'The little crowns on certain letters in a Torah scroll. Nobody is quite sure why they are there.'],
  ['TALMUD', 'The record of the argument. Both sides, on the same page, permanently.'],
  ['TEIMAN', 'Yemen. Its Jews kept a pronunciation of Hebrew that everybody else had lost.'],
  ['TIKKUN OLAM', 'Repair of the world. Originally about gathering the sparks; now about everything.'],
  ['TORAH', 'The five books, and by extension all of it. Written by hand, read aloud, argued over.'],
  ['TZEDAKAH', 'Not charity. Justice — the word is from tzedek, and the difference is the whole point.'],
  ['YAD', 'The little silver hand you follow the text with, because your own hand may not touch the parchment.'],
  ['YAHRZEIT', 'The anniversary of a death. A candle that burns twenty-six hours and does nothing else.'],
  ['YESHIVA', 'A house of study. The loudest arguments in the world, about a cow from the second century.'],
  ['YIZKOR', 'The memorial prayer. Said four times a year, for the dead who have nobody left to say it.'],
  ['ZECHUT AVOT', 'The merit of the ancestors, on which the descendants are held to draw.'],
  ['ZERIZUT', 'Alacrity. The ones who are eager go early.'],
  ['L\'DOR VADOR', 'From generation to generation. What is handed on when everything else is let go.']
].sort((a, b) => a[0].localeCompare(b[0]));

/* ---- 32.9 the machloket ---------------------------------------------------
   A real disagreement, both sides intact, and a buff either way — which is
   the whole doctrine of elu v'elu turned into a mechanic.
   ========================================================================== */
export const MG_ARG = [
  { q:'A lamp is lit for Chanukah. Do you start with eight and go down, or one and go up?',
    a:'SHAMMAI: EIGHT, DESCENDING', b:'HILLEL: ONE, ASCENDING',
    r:'The law follows Hillel. We go up. Shammai\'s reasoning is preserved anyway.' },
  { q:'Is it lawful to tell a bride at her wedding that she is beautiful, if she is not?',
    a:'SHAMMAI: SAY WHAT SHE IS', b:'HILLEL: SAY SHE IS LOVELY',
    r:'The law follows Hillel. Peace outranks precision, in this one room.' },
  { q:'Rabbi Eliezer summons a river and a voice from heaven to prove his ruling.',
    a:'ACCEPT THE MIRACLE', b:'IT IS NOT IN HEAVEN',
    r:'The majority won. The text says God laughed and said: my children have defeated me.' },
  { q:'Which is greater, study or action?',
    a:'ACTION', b:'STUDY',
    r:'Study, said Rabbi Akiva, because study leads to action. It is not a dodge; it is the ruling.' },
  { q:'A found object with no identifying mark. Do you announce it or keep it?',
    a:'ANNOUNCE IT ANYWAY', b:'THE OWNER HAS DESPAIRED',
    r:'Once the owner gives up hope it is yours. Two chapters are spent deciding when hope ends.' },
  { q:'May a gentile be asked to do work on Shabbat that you may not do?',
    a:'NEVER ASK', b:'YOU MAY MENTION THE COLD',
    r:'Not directly. The workaround is old, agreed on, and slightly embarrassing to everybody.' },
  { q:'It is Shabbat and a life is in danger.',
    a:'BREAK SHABBAT AT ONCE', b:'FIND A PERMITTED WAY',
    r:'You break it, immediately, and you do not look for a clever route. This one is not close.' },
  { q:'Was creating humanity a good idea?',
    a:'YES, OBVIOUSLY', b:'IT WOULD HAVE BEEN BETTER NOT TO',
    r:'The houses voted for two and a half years. The vote went to: better not to have been created. Now that we are here, examine your deeds.' },
  { q:'Does a mitzvah require intention, or is the deed enough?',
    a:'INTENTION IS REQUIRED', b:'THE DEED IS ENOUGH',
    r:'Unresolved, on purpose, for nine hundred years. Do it either way and argue afterwards.' },
  { q:'Should the oral law have been written down at all?',
    a:'IT HAD TO BE', b:'IT SHOULD HAVE STAYED SPOKEN',
    r:'It was written because the alternative was losing it. Something was lost anyway.' },
  { q:'A poor man and a rich man both need help and you have one coin.',
    a:'THE POOR MAN', b:'WHICHEVER ASKED FIRST',
    r:'The poor man. But the ruling spends longer on how to give it than on who to give it to.' },
  { q:'The Hasidim sing and dance in prayer. The Mitnagdim study in silence.',
    a:'JOY REACHES HIGHER', b:'RIGOUR REACHES FURTHER',
    r:'The ban was issued, the ban failed, and both are now standing in the same building complaining about the kiddush.' }
];

/* ---- 32.10 five tunes -----------------------------------------------------
   Four of these are in Ahava Rabbah — the phrygian dominant, the mode with
   the flattened second and the raised third that makes a scale sound Jewish
   to anybody who has ever been to a wedding. It is the mode of half the
   Ashkenazi liturgy and most of klezmer, and it is not a costume: it is what
   the music is actually in. MI SHEBERACH is the other one, the Ukrainian
   dorian, which is the mode of the prayer for the sick.

   The fifth is for Shabbat, and it is the only one that does not go anywhere.
   ========================================================================== */
export const MG_HZ = {
  D2:73.42, Eb2:77.78, E2:82.41, F2:87.31, Fs2:92.50, G2:98.00, Gs2:103.83, A2:110.00, Bb2:116.54, B2:123.47,
  C3:130.81, D3:146.83, Eb3:155.56, E3:164.81, F3:174.61, Fs3:185.00, G3:196.00, Gs3:207.65,
  A3:220.00, Bb3:233.08, B3:246.94,
  C4:261.63, D4:293.66, Eb4:311.13, E4:329.63, F4:349.23, Fs4:369.99, G4:392.00, Gs4:415.30,
  A4:440.00, Bb4:466.16, B4:493.88,
  C5:523.25, D5:587.33, Eb5:622.25, E5:659.26, F5:698.46, Fs5:739.99, G5:783.99, Gs5:830.61,
  A5:880.00, Bb5:932.33, B5:987.77, C6:1046.50, D6:1174.66
};

export const MG_SONGS = {
  /* the mode itself, stated plainly, at walking pace */
  freygish: { bpm: 96, len: 32,
    lead: [['D4',0,2],['Eb4',2,1],['Fs4',3,1],['G4',4,2],['A4',6,2],['Bb4',8,2],['A4',10,1],['G4',11,1],
           ['Fs4',12,2],['Eb4',14,2],['D4',16,3],['Fs4',19,1],['A4',20,2],['Bb4',22,2],
           ['C5',24,2],['Bb4',26,1],['A4',27,1],['G4',28,2],['Fs4',30,2]],
    bass: [['D3',0,4],['A2',4,4],['Bb2',8,4],['A2',12,4],['D3',16,4],['G2',20,4],['A2',24,4],['D3',28,4]],
    pad:  [['D4',0,8],['Fs4',0,8],['A3',8,8],['D4',8,8],['D4',16,8],['A4',16,8],['G3',24,8],['Bb3',24,8]],
    arp:  [['D5',0,1],['A4',2,1],['Fs4',4,1],['A4',6,1],['Bb4',8,1],['Fs4',10,1],['D4',12,1],['Fs4',14,1],
           ['D5',16,1],['A4',18,1],['Fs4',20,1],['A4',22,1],['C5',24,1],['A4',26,1],['Fs4',28,1],['D4',30,1]] },

  /* a wordless tune. The same four bars, on purpose, because that is the form */
  nigun: { bpm: 78, len: 32,
    lead: [['A3',0,4],['Bb3',4,2],['C4',6,2],['D4',8,4],['C4',12,2],['Bb3',14,2],
           ['A3',16,4],['G3',20,2],['Fs3',22,2],['G3',24,2],['A3',26,2],['D4',28,4]],
    bass: [['D3',0,8],['G2',8,8],['D3',16,8],['A2',24,8]],
    pad:  [['D4',0,8],['A3',0,8],['G3',8,8],['Bb3',8,8],['D4',16,8],['Fs4',16,8],['A3',24,8],['Eb4',24,8]],
    arp:  [['D5',0,2],['A4',4,2],['D5',8,2],['Bb4',12,2],['A4',16,2],['Fs4',20,2],['A4',24,2],['D5',28,2]] },

  /* the prayer for the sick: the other mode, with the raised fourth */
  misheberach: { bpm: 84, len: 32,
    lead: [['D4',0,3],['E4',3,1],['F4',4,2],['Gs4',6,2],['A4',8,4],['G4',12,2],['F4',14,2],
           ['E4',16,2],['F4',18,2],['Gs4',20,2],['A4',22,2],['C5',24,3],['B4',27,1],['A4',28,4]],
    bass: [['D3',0,8],['A2',8,4],['Gs2',12,4],['D3',16,8],['A2',24,8]],
    pad:  [['D4',0,8],['F4',0,8],['A3',8,8],['E4',8,8],['D4',16,8],['A4',16,8],['F3',24,8],['C4',24,8]],
    arp:  [['A4',0,2],['D5',4,2],['F5',8,2],['E5',12,2],['D5',16,2],['A4',20,2],['C5',24,2],['A4',28,2]] },

  /* the one everybody stands up for */
  hora: { bpm: 126, len: 24,
    lead: [['D5',0,2],['A4',2,1],['D5',3,1],['Eb5',4,2],['D5',6,1],['C5',7,1],['Bb4',8,2],['A4',10,2],
           ['D5',12,2],['Fs5',14,2],['G5',16,2],['Fs5',18,1],['Eb5',19,1],['D5',20,4]],
    bass: [['D3',0,2],['A2',2,1],['D3',4,2],['A2',6,1],['Bb2',8,2],['A2',10,1],['D3',12,2],['A2',14,1],
           ['G2',16,2],['A2',18,1],['D3',20,2],['A2',22,1]],
    pad:  [['D4',0,6],['A4',0,6],['Bb3',6,6],['D4',6,6],['D4',12,6],['Fs4',12,6],['G3',18,6],['D4',18,6]],
    arp:  [['D5',0,1],['Fs5',1,1],['A5',2,1],['Fs5',3,1],['D5',4,1],['Eb5',5,1],['D5',6,1],['C5',7,1],
           ['Bb4',8,1],['D5',9,1],['A4',10,1],['D5',11,1],['Fs5',12,1],['A5',13,1],['Fs5',14,1],['D5',15,1],
           ['G5',16,1],['Fs5',17,1],['Eb5',18,1],['D5',19,1],['A4',20,1],['D5',21,1],['Fs5',22,1],['A5',23,1]] },

  /* z'mirot. It does not develop, it does not climb, and it does not end */
  zmirot: { bpm: 56, len: 32,
    lead: [['A3',0,6],['Bb3',6,2],['A3',8,6],['G3',14,2],['Fs3',16,8],['G3',24,4],['A3',28,4]],
    bass: [['D3',0,16],['G2',16,8],['A2',24,8]],
    pad:  [['D4',0,16],['A3',0,16],['Bb3',16,8],['D4',16,8],['A3',24,8],['Fs4',24,8]],
    arp:  [['D5',0,4],['A4',8,4],['Fs4',16,4],['A4',24,4]] }
};

/* ---- 32.11 counting -------------------------------------------------------
   Short scale, three significant figures, the way an idle game has to read.
   ========================================================================== */
