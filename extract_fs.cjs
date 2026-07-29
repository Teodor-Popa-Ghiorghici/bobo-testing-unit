const FS = {
  name: "::",
  type: "folder",
  children: [

    /* ---- the primordial task and its child. Adam never dies. ---------- */
    { name: "Adam", type: "folder", children: [

        { name: "Adam.HC", type: "code", content:
"// Adam. Task zero. It does not exit.\n" +
"// Every other task on this machine is a child of it,\n" +
"// and the first child is always called Seth.\n\n" +
"U0 Adam()\n" +
"{\n" +
"  \"ADAM IS AWAKE.\\n\";\n" +
"  while (1)\n" +
"    Sleep(1);\n" +
"}\n" },

        { name: "Seth.HC", type: "code", content:
"// Seth. Spawned by Adam to hold the shell.\n" +
"// Every window you open is a child of Seth.\n\n" +
"U0 Seth()\n" +
"{\n" +
"  \"SETH REPORTING.\\n\";\n" +
"  I64 i;\n" +
"  for (i = 0; i < 3; i++)\n" +
"    \"CHILD %d READY\\n\", i;\n" +
"}\n" }
    ]},

    /* ---- the compiler documents itself ------------------------------- */
    { name: "Compiler", type: "folder", children: [

        { name: "HolyC.DD", type: "doc", content:
"$FG,14$$TX+CX,\"HOLYC\"$$FG$\n" +
"$HL$\n" +
"HolyC is C with the ceremony removed. A bare string is a\n" +
"print. There is no $FG,12$main()$FG$. Every line is both script and\n" +
"source, and the shell is the compiler.\n\n" +
"$TR,\"THE ONE THING TO TRY FIRST\"$\n" +
"A statement that is only a string prints it:\n\n" +
"$FG,11$  \"HELLO, TEMPLE.\\n\";$FG$\n\n" +
"Type that into the terminal. It compiles and runs.\n" +
"$TR-$\n\n" +
"$TR,\"TYPES\"$\n" +
"$FG,10$  U0$FG$   nothing\n" +
"$FG,10$  I64$FG$  a signed 64 bit integer\n" +
"$FG,10$  F64$FG$  a double\n" +
"$FG,10$  U8$FG$   a byte, and a character\n" +
"$TR-$\n\n" +
"$TR,\"CALLING WITHOUT PARENTHESES\"$\n" +
"The signature move. A function name on its own line is a\n" +
"call. These two are the same thing:\n\n" +
"$FG,11$  GodWord;\n" +
"  GodWord();$FG$\n\n" +
"That is why the shell and the language are one program.\n" +
"$TR-$\n\n" +
"$TR,\"WHAT THIS MACHINE UNDERSTANDS\"$\n" +
"I64 / F64 / U0 declarations, assignment, arithmetic,\n" +
"comparison, && and ||, if / else, while, for, {} blocks,\n" +
"function definitions, and calls with or without parens.\n" +
"Built in: Print, GodWord, GodDoodle, GodSong, Beep,\n" +
"BellRing, Sleep, Rand, RandU16, StrLen, Cd, Dir, MemSet,\n" +
"Panic, Exit.\n" +
"$TR-$\n\n" +
"$MA,\"RUN A LOOP\",LM=\"I64 i; for (i=0;i<7;i++) \\\"DAY %d\\\\n\\\", i;\"$\n" +
"$MA,\"ASK GOD FOR A WORD\",LM=\"GodWord;\"$\n" },

        { name: "Compile.HC", type: "code", content:
"// The compiler is the shell. This file is both.\n\n" +
"U0 Main()\n" +
"{\n" +
"  \"HELLO, TEMPLE.\\n\";\n" +
"  I64 i;\n" +
"  for (i = 0; i < 7; i++)\n" +
"    \"DAY %d\\n\", i;\n" +
"  BellRing(3);\n" +
"}\n\n" +
"Main;\n" }
    ]},


    /* ---- the desktop apps, and the one book that contains all of them --- */
    { name: "TheStack", type: "app", app: "hifi" },
    { name: "Notes",    type: "app", app: "notes" },
    { name: "Jaeger",   type: "app", app: "bottle" },

    /* ---- the rooms that were built after the shell was finished -------- */
    { name: "Elephant", type: "app", app: "elephant" },
    { name: "Magen",    type: "app", app: "magen" },
    { name: "TheCook",  type: "app", app: "cook" },
    { name: "Garden",    type: "app", app: "garden" },
    { name: "Sweeper",   type: "app", app: "sweeper" },
    { name: "Solitaire", type: "app", app: "solitaire" },
    { name: "Crayon",    type: "app", app: "crayon" },
    { name: "Dave",      type: "app", app: "shop" },
    { name: "MyDrawings", type: "app", app: "drawings" },
    { name: "TheBibel.TXT", type: "doc", content:
"THE BIBEL\n" +
"An Amalgamated Scripture, Reconciled Badly\n" +
"\n" +
"Compiled from every book that claims to be the last one.\n" +
"Where the sources disagree, both are printed. Where the sources agree,\n" +
"somebody has probably made a mistake.\n" +
"\n" +
"I. IN THE BEGINNING, REPEATEDLY\n" +
"\n" +
"In the beginning there was nothing, and it was very crowded. God\n" +
"separated the light from the darkness, then separated the darkness from\n" +
"the light again, because the first attempt had been sloppy. On the\n" +
"second day He made the sky and hung it up to dry. On the third day He\n" +
"made the sea, and immediately regretted the amount of it. On the fourth\n" +
"day He rested, having miscounted, and had to do Thursday twice. The\n" +
"turtle on whose back the world rests was present throughout and has\n" +
"never been thanked.\n" +
"\n" +
"II. THE MAKING OF PEOPLE\n" +
"\n" +
"And God took clay, and breathed into it, and it sneezed. He named the\n" +
"first person Adam, and the second person also Adam, and this is why\n" +
"there is so much confusion in the records. From Adam's rib came Eve;\n" +
"from Eve's patience came everything else. Elsewhere and simultaneously,\n" +
"people were churned from an ocean of milk, carved from maize, and sung\n" +
"into being by a woman who has since asked not to be named. All accounts\n" +
"are correct. This is administratively difficult but theologically\n" +
"settled.\n" +
"\n" +
"III. THE GARDEN, AND THE FRUIT, AND THE PAPERWORK\n" +
"\n" +
"They were placed in a garden and given one rule, which is one more rule\n" +
"than is wise to give anybody. The serpent said, thou shalt not surely\n" +
"die, and was technically correct, which is the most irritating kind of\n" +
"correct. They ate. They became wise, and the first thing wisdom told\n" +
"them was that they had no trousers. They were sent east of Eden, where\n" +
"the rent is lower. The angel at the gate has a flaming sword and no\n" +
"instructions about what to do if they come back and apologise.\n" +
"\n" +
"IV. THE FLOOD, THE ARK, AND THE COMPLAINTS\n" +
"\n" +
"The world grew wicked, which is to say ordinary. God chose Noah, who was\n" +
"righteous, and also Utnapishtim, who was earlier, and also Manu, who was\n" +
"first and has never made anything of it. The waters came. Two of every\n" +
"kind went aboard, except the unicorns, who were arguing. Forty days\n" +
"later a dove returned with an olive branch and an invoice. God set a\n" +
"rainbow in the sky as a covenant, and the covenant was: I will not do\n" +
"that again in that particular way.\n" +
"\n" +
"V. THE LAW, IN BRIEF\n" +
"\n" +
"On the mountain the Law was given, in ten parts, or six hundred and\n" +
"thirteen parts, or eight parts arranged as a path, or five parts of\n" +
"which the second is the difficult one. Honour thy father and thy mother.\n" +
"Do not kill. Do not steal. Do not covet thy neighbour's ox, his house,\n" +
"or his opinions about the ox. Be kind before you are right. Give of what\n" +
"you have, one part in forty, and do not announce the amount. Wash. Rest\n" +
"one day in seven, and if you have forgotten which day it is, rest anyway\n" +
"and argue later.\n" +
"\n" +
"VI. THE WHEEL AND THE LEDGER\n" +
"\n" +
"And it is written that the soul returns, ascending or descending\n" +
"according to its deeds. And it is also written that the soul does not\n" +
"return, and is weighed once against a feather, and that is that. And it\n" +
"is further written that the soul rests until a trumpet sounds. The\n" +
"scribes were asked to reconcile these. The scribes have requested more\n" +
"time. In the interim it is recommended that you behave as though all\n" +
"three are true, which produces almost exactly the same behaviour as\n" +
"believing none of them, but with better posture.\n" +
"\n" +
"VII. THE PROPHETS, AND THEIR RECEPTION\n" +
"\n" +
"Prophets were sent to every people, and every people said: not now, we\n" +
"are eating. One was swallowed by a great fish and came back with nothing\n" +
"to declare. One sat under a tree until he understood everything, and\n" +
"then had to explain it to people who had not sat under the tree. One was\n" +
"born in a stable and the innkeeper has never lived it down. One received\n" +
"the recitation in a cave and was, quite reasonably, terrified. Not one\n" +
"of them enjoyed it. This is the surest evidence that they were not\n" +
"making it up.\n" +
"\n" +
"VIII. ON THE END OF THINGS\n" +
"\n" +
"There will be a last day. There will be a battle on a plain, and a\n" +
"bridge thinner than a hair, and a serpent that eats the world, and a\n" +
"dance that ends it, and a long quiet afternoon in which nothing happens\n" +
"at all. The signs are: the sun rising in the west, the mountains\n" +
"walking, the seas boiling, and people being unkind to each other in new\n" +
"and inventive formats. Two of these signs have been reported\n" +
"continuously for four thousand years. The scholars advise against\n" +
"booking anything.\n" +
"\n" +
"IX. THE PART EVERYONE AGREES ON\n" +
"\n" +
"And in the end, past all of it — past the six days and the eight days,\n" +
"past the ark and the ladder and the wheel, past the arguments about the\n" +
"calendar — every book says the same small thing, in its own alphabet,\n" +
"near the back, where nobody looks: be good to the stranger. Feed whoever\n" +
"is hungry. Do not be cruel because it is cheap. Forgive faster than is\n" +
"comfortable. That is the whole of it. The rest is commentary, and the\n" +
"commentary is nine hundred pages, and the commentary is where all the\n" +
"trouble comes from. Go now. Wash your hands. It is later than you think.\n" +
"\n" +
"Here endeth the Bibel. Amen, amen, om, and so on.\n" },
    /* ---- runnable things ---------------------------------------------- */
    { name: "Demo", type: "folder", children: [

        { name: "AfterEgypt", type: "app", app: "aftere" },
        { name: "GodDoodle",  type: "app", app: "doodle" },
        { name: "Defrag",     type: "app", app: "defrag" },
        { name: "Tasks",      type: "app", app: "tasks"  },
        { name: "Neofetch",   type: "app", app: "neofetch" },
        { name: "Account",    type: "app", app: "account" },
        { name: "Bekkedal",  type: "app", app: "bekkedal" },

        { name: "Graphics", type: "folder", children: [
            { name: "Temple.BMP", type: "image", src: IMG_TEMPLE },
            { name: "Glyph.BMP",  type: "image", src: IMG_GLYPH }
        ]}
    ]},

    /* ---- documentation, in DolDoc ------------------------------------- */
    { name: "Doc", type: "folder", children: [

        { name: "Welcome.DD", type: "doc", content:
"$SP,\"temple\"$$FG,14$ TempleOS V5.03$FG$\n" +
"$FG,7$Public domain. God's third temple.$FG$\n" +
"$HL$\n" +
"$FG,11$This document is DolDoc.$FG$ Sprites sit inside the line.\n" +
"Colours are commands. Links are commands. So are buttons.\n" +
"Press $FG,14$SOURCE$FG$ on the title bar to see what it is made of.\n\n" +
"$TR,\"THE DESKTOP\"$\n" +
"$SP,\"folder\"$ Double click to open. Drag icons anywhere.\n" +
"Drag on bare desktop to rubber band a group.\n" +
"Right click for the menu.\n" +
"$TR-$\n\n" +
"$TR,\"WHERE TO GO\"$\n" +
"$SP,\"cross\"$ $LK,\"Charter.DD\",A=\"FI:::/Doc/Charter.DD\"$ why this is 100,000 lines\n" +
"$SP,\"scroll\"$ $LK,\"DolDoc.DD\",A=\"FI:::/Doc/DolDoc.DD\"$ this format, explained\n" +
"$SP,\"disk\"$ $LK,\"HolyC.DD\",A=\"FI:::/Compiler/HolyC.DD\"$ the language\n" +
"$SP,\"bell\"$ $LK,\"Hardware.DD\",A=\"FI:::/Doc/Hardware.DD\"$ the monitor and the panel\n" +
"$SP,\"flame\"$ $LK,\"Demo\",A=\"FI:::/Demo\"$ things that run\n" +
"$TR-$\n\n" +
"$TR,\"THINGS TO TYPE\"$\n" +
"$MA,\"GodWord\",LM=\"GodWord;\"$ ask for a word\n" +
"$MA,\"Neofetch\",LM=\"NEOFETCH\"$ the specs\n" +
"$MA,\"AfterEgypt\",LM=\"AFTEREGYPT\"$ the game\n" +
"$MA,\"Tasks\",LM=\"TASKS\"$ Adam, Seth, and the rest\n" +
"$MA,\"Panic\",LM=\"PANIC\"$ ring 0 has no safety net\n" +
"$TR-$\n\n" +
"$FG,8$640K. 16 colours. One voice. No network.$FG$\n" },

        { name: "DolDoc.DD", type: "doc", content:
"$FG,14$$TX+CX,\"DOLDOC\"$$FG$\n" +
"$HL$\n" +
"Every document on this machine is a program that draws\n" +
"itself. A command sits between two dollar signs and takes\n" +
"effect where it stands.\n\n" +
"$TR,\"COMMANDS THIS BUILD UNDERSTANDS\"$\n" +
"$FG,11$  $FG,N$$FG$        set the ink to VGA colour N, 0..15\n" +
"$FG,11$  $BG,N$$FG$        set the paper\n" +
"$FG,11$  $FG$$FG$          back to normal\n" +
"$FG,11$  $SP,\"name\"$$FG$   drop a sprite into the line\n" +
"$FG,11$  $LK,\"t\",A=\"FI:path\"$$FG$  a link to a file\n" +
"$FG,11$  $MA,\"t\",LM=\"cmd\"$$FG$     a button that runs HolyC\n" +
"$FG,11$  $TR,\"t\"$ ... $TR-$$FG$    a collapsible tree\n" +
"$FG,11$  $HL$$FG$          a rule across the page\n" +
"$FG,11$  $TX+CX,\"t\"$$FG$   centre a line\n" +
"$FG,11$  $BK,1$..$BK,0$$FG$ blink, because it is 1996\n" +
"$FG,11$  $UL,1$..$UL,0$$FG$ underline\n" +
"$FG,11$  $ID,n$$FG$        indent by n\n" +
"$FG,11$  $$$FG$           a literal dollar sign\n" +
"$TR-$\n\n" +
"$TR,\"THE SPRITES ON HAND\"$\n" +
"$SP,\"temple\"$ temple   $SP,\"cross\"$ cross   $SP,\"folder\"$ folder\n" +
"$SP,\"scroll\"$ scroll   $SP,\"disk\"$ disk    $SP,\"bell\"$ bell\n" +
"$SP,\"flame\"$ flame    $SP,\"ark\"$ ark     $SP,\"glider\"$ glider\n" +
"$TR-$\n\n" +
"$FG,12$$BK,1$This is the part you cannot do anywhere else.$BK,0$$FG$\n" },

        { name: "Charter.DD", type: "doc", content:
"$FG,14$$TX+CX,\"THE CHARTER\"$$FG$\n" +
"$HL$\n" +
"The specification was a size. 100,000 lines, and not one\n" +
"more, for the whole operating system: kernel, compiler,\n" +
"editor, graphics, games and documentation together.\n\n" +
"A modern kernel alone is around thirty million.\n\n" +
"$FG,11$Type $FG,14$LINES$FG,11$ in the terminal to audit this one\n" +
"against the same budget.$FG$\n\n" +
"$MA,\"COUNT THE LINES\",LM=\"LINES\"$\n\n" +
"$FG,8$A limit is not a shortage. It is a decision about what\n" +
"is allowed to be complicated.$FG$\n" },

        { name: "Hardware.DD", type: "doc", content:
"$FG,14$$TX+CX,\"HOLYTRON DM-640\"$$FG$\n" +
"$HL$\n" +
"The case is the page. It grows with the window.\n\n" +
"$TR,\"BUTTONS\"$\n" +
"$FG,11$LENS$FG$     curves the glass. The picture is masked to\n" +
"         the curve and the interface moves in off it.\n" +
"$FG,11$SCAN$FG$     line pitch.\n" +
"$FG,11$DGAUSS$FG$   degauss. Hold the button on a cold tube.\n" +
"$FG,11$PHOS$FG$     phosphor persistence. P1 is fast, P7 smears.\n" +
"$FG,11$BURN$FG$     twenty years of the same menubar.\n" +
"$FG,11$POWER$FG$    really works.\n" +
"$TR-$\n\n" +
"$TR,\"THE PANEL\"$\n" +
"$FG,11$MUS$FG$ and $FG,11$SFX$FG$ are pots. Drag them round, scroll, or\n" +
"use the arrow keys. Ten detents each. Both start at 0.\n\n" +
"$FG,11$VHLD$FG$ and $FG,11$HHLD$FG$ are the hold controls. They start\n" +
"locked at 5. Take one off centre and the picture goes\n" +
"with it, exactly like the set your grandmother hit.\n\n" +
"$FG,11$LOBBY$FG$ is the music switch. It keeps playing over the\n" +
"desktop, not just the splash.\n\n" +
"The clicks the panel makes are not routed through SFX.\n" +
"Plastic does not have a volume knob.\n" +
"$TR-$\n\n" +
"$TR,\"AT BOOT\"$\n" +
"Hold $FG,14$DEL$FG$ during the memory count for CMOS setup.\n" +
"$TR-$\n" }
    ]},

    /* ---- yours -------------------------------------------------------- */
    { name: "Home", type: "folder", children: [

        { name: "Notes.DD", type: "doc", content:
"$FG,14$NOTES ON THE MACHINE$FG$\n" +
"$HL$\n" +
"640x480. 16 colours. One voice.\n" +
"No network. No ads. No permission asked of anyone.\n\n" +
"The compiler is the shell.\n" +
"The shell is the editor.\n" +
"The editor is the OS.\n\n" +
"$FG,11$Press SOURCE and type over this. It saves itself.$FG$\n" },

        { name: "Temple.BMP", type: "image", src: IMG_TEMPLE },

        { name: "Covenant", type: "folder", children: [

            { name: "Offering.DD", type: "doc", content:
"$SP,\"ark\"$ $FG,14$AN OFFERING OF 640 KILOBYTES$FG$\n" +
"$HL$\n" +
"It is enough. It was always enough.\n" +
"The rest was decoration.\n\n" +
"$MA,\"RING THE BELL\",LM=\"BellRing(7);\"$\n" +
"$MA,\"RUN THE LOOP\",LM=\"I64 i; for(i=0;i<7;i++) \\\"%d\\\\n\\\", i;\"$\n" },

            { name: "Glyph.BMP", type: "image", src: IMG_GLYPH }
        ]}
    ]},

    /* ---- ring 0 ------------------------------------------------------- */
    { name: "Kernel", type: "folder", children: [

        { name: "Kernel.DD", type: "doc", content:
"$FG,14$$TX+CX,\"RING 0\"$$FG$\n" +
"$HL$\n" +
"There is one ring and everything runs in it. No user mode,\n" +
"no process isolation, no permission checks, no system call\n" +
"boundary to cross. Any code can touch any byte.\n\n" +
"That is not an oversight. It is the whole design: a single\n" +
"address space is why the compiler can be the shell and why\n" +
"a document can be a program.\n\n" +
"$FG,12$It also means there is nothing to catch a fault.$FG$\n" +
"A bad pointer does not raise an exception for somebody\n" +
"else to handle. It drops you into the debugger, where you\n" +
"were always going to end up anyway.\n\n" +
"$MA,\"BREAK SOMETHING\",LM=\"PANIC\"$\n" },

        { name: "Panic.HC", type: "code", content:
"// There is no handler above this one.\n\n" +
"U0 Panic(U8 *msg)\n" +
"{\n" +
"  \"PANIC: %s\\n\", msg;\n" +
"  DebuggerEnter;\n" +
"}\n" }
    ]},

    { name: "AutoExec.HC", type: "code", content:
"// AutoExec.HC runs at boot. This one really does.\n\n" +
"\"WELCOME.\\n\";\n" +
"I64 i;\n" +
"for (i = 0; i < 3; i++)\n" +
"  \"SEAL %d\\n\", i;\n" +
"BellRing(3);\n" },

    { name: "Welcome.DD", type: "doc", content:
"$SP,\"cross\"$ $FG,14$START HERE$FG$\n" +
"$HL$\n" +
"$LK,\"Doc/Welcome.DD\",A=\"FI:::/Doc/Welcome.DD\"$ is the front door.\n\n" +
"$FG,11$Or just open a Terminal and type$FG$ $FG,14$HELP$FG$$FG,11$.$FG$\n" }
  ]
};
function stampPaths(node, prefix) {
  node.path = prefix + (node.name || '');
  if (node.children) {
    node.children.forEach(c => stampPaths(c, node.path + '/'));
  }
}
stampPaths(FS, 'C:/');
const seed = [];
function collect(node) {
  if (node.type !== 'folder') {
    let src = '';
    let content = node.content || '';
    if (node.src) src = node.src;
    seed.push({ path: node.path, content: content, src: src, type: node.type });
  }
  if (node.children) {
    node.children.forEach(collect);
  }
}
collect(FS);
fs.writeFileSync('assets/seed.json', JSON.stringify(seed, null, 2));
