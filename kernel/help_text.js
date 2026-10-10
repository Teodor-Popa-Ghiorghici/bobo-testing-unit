/* The built-in help. It is part of the machine, not a file on its disk, so it
   cannot be deleted, edited or lost: the Help menu works even after every
   file has been thrown away. Pages are DolDoc, the same format as the .DD
   files. A link to "@topic" jumps to that page; a macro starting with "@"
   does a thing (@restore, @open:<app>); anything else is HolyC. */
export const TOPICS = [
  ['start', 'START HERE'],
  ['keys', 'MOUSE & KEYS'],
  ['files', 'FILES & FOLDERS'],
  ['music', 'MAKING MUSIC'],
  ['fix', 'SOMETHING IS MISSING'],
  ['holyc', 'HOLYC'],
  ['trophies', 'TROPHIES']
];

export const PAGES = {
start: `$FG,14$$TX+CX,"HELP"$$FG$
$HL$
This is the machine's own help. It lives inside the machine, so
it is always here, whatever has been deleted.

$TR,"THE SHORT VERSION"$
$FG,11$Double-click$FG$ an icon to open it. $FG,11$Drag$FG$ icons anywhere. $FG,11$Drag$FG$ an
icon onto a folder to put it inside, onto the $FG,14$RecycleBin$FG$ to delete it.
$FG,11$Right-click$FG$ for a menu. $FG,11$Ctrl and +/-$FG$ zooms the window you are in.
$TR-$

$TR,"WHERE TO GO NEXT"$
$LK,"MOUSE & KEYS",A="FI:@keys"$       everything the mouse and keyboard do
$LK,"FILES & FOLDERS",A="FI:@files"$    folders, moving, copying, the bin
$LK,"MAKING MUSIC",A="FI:@music"$       the Garage, and how to learn it
$LK,"SOMETHING IS MISSING",A="FI:@fix"$ get the machine's own files back
$LK,"HOLYC",A="FI:@holyc"$              the language
$LK,"TROPHIES",A="FI:@trophies"$          what there is to find
$TR-$

$TR,"THINGS TO PRESS"$
$MA,"OPEN THE GARAGE",LM="@open:garage"$     make music, 20+ real instruments
$MA,"THE TOUR OF WHAT THIS HAS",LM="@welcome"$  every tool, with a button each
$MA,"OPEN THE TERMINAL",LM="@open:terminal"$  type commands
$MA,"RESTORE SYSTEM FILES",LM="@restore"$     bring back anything that was deleted
$TR-$
$FG,8$640K. 16 colours. One voice. No network.$FG$
`,

keys: `$FG,14$$TX+CX,"MOUSE & KEYS"$$FG$
$HL$
$TR,"THE MOUSE"$
$FG,11$Left click$FG$      select. Ctrl or Shift adds to the selection.
$FG,11$Double click$FG$    open. On a title bar: fill the desktop.
$FG,11$Drag$FG$            move icons and windows. Drag on the bare
                  desktop or in a folder to rubber-band a group.
$FG,11$Right click$FG$     the menu for what you are pointing at. A game
                  that does not use the right button ignores it.
$FG,11$Ctrl + wheel$FG$    zoom the window under the pointer.
$TR-$

$TR,"WINDOWS"$
$FG,11$[Z]$FG$ zoom this window, bigger or smaller, and remember it.
$FG,11$[T]$FG$ (NOTES only) a colour scheme for just this Notes window. A scheme dresses
                  Notes, its frame and its page, and nothing else: the rest of the machine
                  keeps its own colours. It is held to readable, whatever is chosen.
$FG,11$[_]$FG$ tuck it into the taskbar.  $FG,11$[□]$FG$ fill the desktop (or F11).
$FG,11$[X]$FG$ close.
$TR-$

$TR,"THE KEYBOARD, IN A LIST OF FILES"$
$FG,11$Delete$FG$      into the recycle bin      $FG,11$F2$FG$        rename
$FG,11$Enter$FG$       open                      $FG,11$Ctrl+A$FG$    select all
$FG,11$Ctrl+C / X / V$FG$  copy, cut, paste      $FG,11$Ctrl+D$FG$    duplicate
$FG,11$Ctrl+Z$FG$      undo the last delete      $FG,11$Backspace$FG$ up one folder
$TR-$

$TR,"ZOOM"$
$FG,11$Ctrl +$FG$  bigger     $FG,11$Ctrl -$FG$  smaller     $FG,11$Ctrl 0$FG$  back to normal
Works in whichever window is in front.
$TR-$
`,

files: `$FG,14$$TX+CX,"FILES & FOLDERS"$$FG$
$HL$
$TR,"FOLDERS ARE FOLDERS"$
Drag an icon onto a folder (on the desktop or in a window) and it goes
inside. Drag it out onto the desktop, or into another folder window, and
it comes out. Hold $FG,11$Ctrl$FG$ while you let go to copy instead of move.
Press $FG,11$Esc$FG$ in the middle of a drag to change your mind.
$TR-$

$TR,"THE RECYCLE BIN"$
Delete never destroys anything. It puts the thing in the $FG,14$RecycleBin$FG$.
Open the bin to put things back, or to throw them away for good.
$FG,11$Ctrl+Z$FG$ undoes the last delete at once.
$TR-$

$TR,"MAKING THINGS"$
Right-click the desktop or a folder: $FG,11$NEW FOLDER$FG$, $FG,11$NEW TEXT FILE$FG$, or
upload pictures, video and text from your own computer. You can also just
drag a file from your computer onto a folder.
$TR-$

$TR,"PICTURES"$
Right-click a picture: $FG,11$SET AS BACKGROUND$FG$. Open it, and the viewer
has the same button, with five ways to fit it on the screen.
$TR-$

$TR,"RENAME, COPY, PROPERTIES"$
$FG,11$F2$FG$ renames. $FG,11$Ctrl+C$FG$ then $FG,11$Ctrl+V$FG$ copies. $FG,11$Properties$FG$ in the right-click
menu says what a thing is, how big it is, and whether it came with the machine.
$TR-$
`,

music: `$FG,14$$TX+CX,"MAKING MUSIC"$$FG$
$HL$
The $FG,14$Garage$FG$ is a band in a box: more than twenty real instruments, a drum
kit, a mixer, and a song you can save.

$TR,"NEVER PLAYED ANYTHING?"$
Open the Garage and press $FG,11$LEARN$FG$. Eight tiny lessons, each one a toy.
By lesson eight you have made a song. Nothing in it can sound wrong.
$TR-$

$TR,"THE IDEA"$
The $FG,11$MAGIC NOTES$FG$ button keeps every note inside a key, so any note you
press fits with every other. It is the same trick a lot of real songs use.
$TR-$

$MA,"OPEN THE GARAGE",LM="@open:garage"$
`,

fix: `$FG,14$$TX+CX,"SOMETHING IS MISSING"$$FG$
$HL$
The machine came with apps, documents and folders. Any of them can be
deleted, but none of them are lost for good:

$FG,11$1.$FG$ Look in the $FG,14$RecycleBin$FG$. Deleted things wait there. $FG,11$Ctrl+Z$FG$ also
   puts the last one back.
$FG,11$2.$FG$ If it is not there, press the button below. It brings back every
   system file that is gone, and nothing else. Files you have edited,
   moved or renamed are left alone. The desktop is not reset.

$MA,"RESTORE SYSTEM FILES",LM="@restore"$
$MA,"OPEN THE RECYCLE BIN",LM="@open:trash"$

$FG,8$The same thing is in the File menu, the Help menu, the desktop's
right-click menu, and the terminal (type RESTORE).$FG$
`,

holyc: `$FG,14$$TX+CX,"HOLYC"$$FG$
$HL$
HolyC is C with the ceremony removed. A bare string is a
print. There is no $FG,12$main()$FG$. Every line is both script and
source, and the shell is the compiler.

$TR,"THE ONE THING TO TRY FIRST"$
A statement that is only a string prints it:

$FG,11$  "HELLO, TEMPLE.\\n";$FG$

Type that into the terminal. It compiles and runs.
$TR-$

$TR,"LEARNING IT"$
HOLYC.EXE (the icon on the desktop, or type HOLYC) teaches it:
seven lessons that tick off as you type, fifty puzzles judged by
tests, and a workshop. A program that uses Button, Label, Field,
Pixel or Note is an app: RUN IT on a .HC file opens it as one.
$TR-$

$TR,"TYPES"$
$FG,10$  U0$FG$   nothing
$FG,10$  I64$FG$  a signed 64 bit integer
$FG,10$  F64$FG$  a double
$FG,10$  U8$FG$   a byte, and a character
$TR-$

$TR,"CALLING WITHOUT PARENTHESES"$
A function name on its own line is a call. These two are the same:

$FG,11$  GodWord;
  GodWord();$FG$
$TR-$

$TR,"WHAT THIS MACHINE UNDERSTANDS"$
I64 / F64 / U0 declarations, assignment, arithmetic,
comparison, && and ||, if / else, while, for, {} blocks,
function definitions, and calls with or without parens.
Built in: Print, GodWord, GodDoodle, GodSong, Beep,
BellRing, Sleep, Rand, RandU16, StrLen, Cd, Dir, MemSet,
Panic, Exit.
$TR-$
`,

trophies: `$FG,14$$TX+CX,"TROPHIES"$$FG$
$HL$
Everything on this machine that is worth doing once has a trophy, and
they are all in $FG,14$TROPHIES.EXE$FG$ (the cup in the taskbar, or the
desktop menu, or type $FG,11$TROPHIES$FG$ in the terminal).

$TR,"TIERS"$
$FG,6$BRONZE$FG$ 15 SUN, $FG,7$SILVER$FG$ 40 SUN, $FG,14$GOLD$FG$ 100 SUN. A seal ($FG,15$MASTER OF$FG$ a game) is 150.
The SUN is paid once, and shows in ACCOUNT.EXE as TROPHY: and the name.
$TR-$

$TR,"SECRETS"$
A card that says $FG,13$???$FG$ is a secret. It gives you a rumour about where to look,
never the answer. When it is found it turns into its real name.
$TR-$

$TR,"CLOSED"$
Nothing is ever missed for good. If something can no longer be earned the
ledger says $FG,12$CLOSED$FG$, greys it out, and takes it out of the count.
$TR-$

$TR,"THE GAMES' OWN"$
Cook and Magen had achievements before there was a ledger. They are shown
under their game, pay nothing here and count nowhere, so nobody loses what they had.
$TR-$

$MA,"OPEN TROPHIES.EXE",LM="@open:trophies"$
`,
};
