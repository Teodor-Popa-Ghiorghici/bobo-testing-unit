/* What rolls up the screen during the last three seconds of the long boot
   (the one the machine does after eight hours away). Edit this file, nothing
   else: each entry is [style, text].  Styles:
     'h'  a heading, yellow        'y'  yellow          'c'  cyan
     'w'  white                    ''   the normal green
   Keep it to roughly a dozen lines: it is on screen for three seconds, and
   the last line is the one the crawl stops on. */
export const BIRTHDAY_TEXT = [
  ['h', '[ WHAT THIS MACHINE IS FOR ]'],
  ['',  'Aparatul ăsta este pentru domnul Ștefan,'],
  ['',  'care a împlinit, la un moment dat, un număr de ani.'],
  ['',  'Dar ce să facem? Vorba aia: poți să faci ceva bine,'],
  ['',  'repede și ieftin, dar poți alege doar două dintre ele.'],
  ['',  'La mulți ani, Fane, și mersi pentru CD-uri.'],
  ['',  'Sper că le compensează într-un mod spiritual.'],
  ['',  ''],
  ['h', '[ WHERE IT CAME FROM ]'],
  ['',  'Asta a venit de la Claude, în mare parte.'],
  ['',  'Nu-ți face griji, am încercat să nu fie slop;'],
  ['',  'doar că nu știu să programez.'],
  ['',  'Btw, am început proiectul ăsta chiar după ziua mea'],
  ['',  'și am... luat ceva.'],
  ['',  'Biggest thanks pentru toți playtesterii:'],
  ['',  'Biscu, Gheghe și Thea.'],
  ['',  'Sper să te distrezi cât mai mult. Dacă dai de buguri,'],
  ['',  'spune-mi și le rezolv. Sper să râzi, să te enervezi'],
  ['',  'și să treci prin tot felul de alte emoții cât timp joci.'],
  ['',  'Much love. Keep up the good work.'],
  ['',  ''],
  ['c', 'THIS IS A HAPPY BIRTHDAY GIFT FOR STEFAN.'],
  ['',  ''],
  ['y', 'HAPPY BIRTHDAY, STEFAN.']
];
