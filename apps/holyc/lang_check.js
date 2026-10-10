/* node apps/holyc/lang_check.js -- the HolyC language beyond the lessons (pure Node): the operators and their precedence, arrays, pointers, memory, strings, classes and unions,
   switch, goto, try/catch, default and variadic arguments, function pointers, static, the preprocessor, the exact sizes of the types, and the errors that teach.
   Every program here is real HolyC (it would compile on TempleOS) unless it is a test of a message. */
import { hcLex } from '../../kernel/holyc_lex.js';
import { hcParse } from '../../kernel/holyc_parse.js';
import { hcRun } from '../../kernel/holyc_run.js';
import { runProgram } from './engine.js';

const HC = { lex: hcLex, parse: hcParse, run: hcRun };
let bad = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL ' + m); } };
const out = (src, o) => { const R = runProgram(HC, src, o); return R.err ? 'ERR ' + (R.err.line ? R.err.line + ': ' : '') + R.err.message : R.out.join('|'); };
const is = (src, want, why) => { const got = out(src); ok(got === want, why + '\n   program: ' + src.replace(/\n/g, ' ') + '\n   wanted:  ' + want + '\n   got:     ' + got); };
const fails = (src, re, why) => { const got = out(src); ok(/^ERR/.test(got) && re.test(got), why + ' (got: ' + got + ')'); };

/* ---- operators ---------------------------------------------------------------------------------------------------------------- */
is('"%d %d %d %d\\n", 6 & 3, 6 | 3, 6 ^ 3, ~0;', '2 7 5 -1', 'bitwise and, or, xor, not');
is('"%d %d\\n", 1 << 10, 1024 >> 3;', '1024 128', 'shifts');
is('"%d\\n", 1 << 40;', '1099511627776', 'a shift past 32 bits');
is('"%d\\n", 2 ` 10;', '1024', 'the ` operator is power');
is('"%d\\n", 6 & 3 + 1;', '3', 'HolyC: & binds tighter than +, so 6 & 3 + 1 is (6 & 3) + 1');
is('"%d\\n", 2 + 3 << 1;', '8', 'HolyC: << binds tighter than +, so 2 + 3 << 1 is 2 + (3 << 1)');
is('I64 x = 5; "%d %d %d\\n", 0 < x < 10, 0 < x < 3, 5 <= x <= 5;', '1 0 1', 'a chain of comparisons');
is('"%d %d %d\\n", 1 ^^ 0, 1 ^^ 1, 0 ^^ 0;', '1 0 0', 'logical xor');
is('I64 x = 12; x &= 10; "%d ", x; x |= 1; "%d ", x; x ^= 3; "%d ", x; x <<= 2; "%d ", x; x >>= 1; "%d\\n", x;', '8 9 10 40 20', 'the bit assignments');
is('"%d\\n", 0xFF + 0b101 + 010;', '270', 'hex, binary and plain numbers');
is('F64 f = 1.5e3; "%.1f\\n", f;', '1500.0', 'an exponent makes a float');
is('"%d %d\\n", \'A\', \'AB\';', '65 16961', 'a character and two packed');
is('"%d\\n", \'\\n\';', '10', 'a character escape');
is('"%d\\n", 0xFFFFFFFF & 0xFF00;', '65280', 'bit-and on numbers past 31 bits');

/* ---- sizes and wrapping ----------------------------------------------------------------------------------------------------- */
is('"%d %d %d %d %d\\n", sizeof(U8), sizeof(I16), sizeof(U32), sizeof(I64), sizeof(F64);', '1 2 4 8 8', 'the size of each type');
is('U8 b = 300; "%d\\n", b;', '44', 'a U8 wraps');
is('I8 b = 200; "%d\\n", b;', '-56', 'an I8 wraps negative');
is('U16 w = -1; "%d\\n", w;', '65535', 'a U16 wraps up');
is('I32 w = 2147483647; w++; "%d\\n", w;', '-2147483648', 'an I32 overflows');
is('I64 x = 5; "%d %d\\n", x(U8), 300(U8);', '5 44', 'a cast is written after the value');
is('I64 i = 7; F64 f = i(F64) / 2; "%.1f\\n", f;', '3.5', 'a cast to F64 makes the division a fraction');
is('"%d\\n", sizeof(U8 *);', '8', 'a pointer is eight bytes');

/* ---- arrays ---------------------------------------------------------------------------------------------------------------------- */
is('I64 a[3]; a[0] = 4; a[2] = 9; "%d %d %d\\n", a[0], a[1], a[2];', '4 0 9', 'an array is zero and holds what it is given');
is('I64 a[4] = {1, 2, 3, 4}; I64 s = 0; I64 i; for (i = 0; i < 4; i++) s += a[i]; "%d\\n", s;', '10', 'an array started from a list');
is('I64 a[] = {5, 6, 7}; "%d %d\\n", sizeof(a), sizeof(a) / sizeof(I64);', '24 3', 'an array with no size takes it from its list');
is('U8 s[16] = "hello"; "%s %d\\n", s, StrLen(s);', 'hello 5', 'a string in a char array');
is('U8 s[] = "hi"; "%d\\n", sizeof(s);', '3', 'the array has room for the end of the string');
is('I64 m[2][3] = {{1, 2, 3}, {4, 5, 6}}; "%d %d %d\\n", m[0][2], m[1][0], m[1][2];', '3 4 6', 'a table');
is('I64 m[2][3]; m[1][2] = 7; "%d %d\\n", m[1][2], sizeof(m);', '7 48', 'a table is rows of rows');
is('I64 n = 3; I64 a[n + 1]; a[3] = 2; "%d\\n", sizeof(a);', '32', 'a size can be worked out');
is('F64 f[2] = {1.5, 2.5}; "%.1f\\n", f[0] + f[1];', '4.0', 'an array of F64');
is('U8 b[4]; b[0] = 300; b[1] = 65; "%d %d\\n", b[0], b[1];', '44 65', 'an element wraps to its type');
fails('I64 a[2] = {1, 2, 3};', /too many values/, 'too many in a list');
fails('I64 a[2]; a = 5;', /array cannot be assigned/, 'an array is not assigned to');

/* ---- pointers -------------------------------------------------------------------------------------------------------------------- */
is('I64 x = 5; I64 *p = &x; *p = 9; "%d\\n", x;', '9', 'a pointer writes to what it points at');
is('I64 x = 5; I64 *p = &x; "%d\\n", *p + 1;', '6', 'and reads it');
is('I64 a[3] = {10, 20, 30}; I64 *p = a; "%d %d %d\\n", *p, *(p + 1), p[2];', '10 20 30', 'pointer arithmetic steps by the size of what it points at');
is('I64 a[3] = {10, 20, 30}; I64 *p = a; p++; p++; "%d\\n", *p;', '30', 'and ++ steps one');
is('I64 a[3] = {10, 20, 30}; I64 *p = &a[2]; I64 *q = &a[0]; "%d\\n", p - q;', '2', 'the difference of two pointers is in elements');
is('U8 b[4] = {1, 2, 3, 4}; U8 *p = b; "%d\\n", *(p + 3);', '4', 'bytes step by one');
is('U32 a[2] = {7, 8}; U32 *p = a; "%d\\n", *(p + 1);', '8', 'U32 steps by four');
is('U0 Bump(I64 *p) { *p += 1; } I64 n = 1; Bump(&n); Bump(&n); "%d\\n", n;', '3', 'a function changes what it is pointed at');
is('U0 Swap(I64 *a, I64 *b) { I64 t = *a; *a = *b; *b = t; } I64 x = 1, y = 2; Swap(&x, &y); "%d %d\\n", x, y;', '2 1', 'swap');
is('I64 x = 3; I64 *p = &x; I64 **pp = &p; **pp = 8; "%d\\n", x;', '8', 'a pointer to a pointer');
is('I64 *p = NULL; "%d\\n", p == NULL;', '1', 'NULL is nothing');
is('U8 *s = "abc"; "%c%c%c\\n", s[0], s[1], s[2];', 'abc', 'a string is bytes');
is('U8 *s = "abc"; s++; "%s\\n", s;', 'bc', 'a string pointer can step into it');
fails('I64 *p = NULL; "%d\\n", *p;', /NULL pointer/, 'reading NULL is said');
fails('I64 *p = NULL; *p = 1;', /NULL pointer/, 'writing NULL is said');
fails('I64 *p = 12345678; *p = 1;', /not memory this program owns|NULL pointer/, 'a wild address is said');

/* ---- the heap and strings -------------------------------------------------------------------------------------------------- */
is('I64 *p = MAlloc(sizeof(I64) * 4); p[3] = 7; "%d\\n", p[3]; Free(p);', '7', 'MAlloc and Free');
is('I64 *p = CAlloc(16); "%d\\n", p[1]; Free(p);', '0', 'CAlloc is zero');
fails('I64 *p = MAlloc(8); Free(p); Free(p);', /never allocated, or is already freed/, 'a block freed twice is said');
is('U8 *a = MAlloc(8); U8 *b = MAlloc(8); Free(a); U8 *c = MAlloc(8); "%d\\n", c == a;', '1', 'a freed block is used again');
is('U8 buf[32]; StrCpy(buf, "hello"); "%s %d\\n", buf, StrLen(buf);', 'hello 5', 'StrCpy and StrLen');
is('U8 buf[32]; StrPrint(buf, "%d-%d", 3, 4); "%s\\n", buf;', '3-4', 'StrPrint');
is('U8 buf[32]; StrPrint(buf, "ab"); CatPrint(buf, "%d", 12); "%s\\n", buf;', 'ab12', 'CatPrint');
is('"%d %d %d\\n", StrCmp("a", "b"), StrCmp("b", "a"), StrCmp("a", "a");', '-1 1 0', 'StrCmp');
is('U8 *s = StrNew("copy"); "%s\\n", s; Free(s);', 'copy', 'StrNew');
is('U8 a[4] = {1, 2, 3, 4}; U8 b[4]; MemCpy(b, a, 4); "%d\\n", b[2]; MemSet(b, 9, 4); "%d\\n", b[0];', '3|9', 'MemCpy and MemSet');
is('I64 f = 0; Bts(&f, 3); Bts(&f, 0); "%d %d %d\\n", f, Bt(&f, 3), Bt(&f, 2);', '9 1 0', 'bits in memory');
is('"%d %d\\n", Bsf(8), Bsr(8);', '3 3', 'Bsf and Bsr');
is('U8 *s = "a,b"; "%s\\n", StrMatch(",", s);', ',b', 'StrMatch');
is('"%d\\n", Str2I64("123") + 1;', '124', 'Str2I64');

/* ---- classes and unions ------------------------------------------------------------------------------------------------- */
is('class CPoint { I64 x, y; }; CPoint p; p.x = 3; p.y = 4; "%d %d %d\\n", p.x, p.y, sizeof(CPoint);', '3 4 16', 'a class, its members and its size');
is('class CPoint { I64 x, y; }; CPoint p = {7, 8}; "%d %d\\n", p.x, p.y;', '7 8', 'a class started from a list');
is('class CPoint { I64 x, y; }; CPoint *p = MAlloc(sizeof(CPoint)); p->x = 5; p->y = 6; "%d\\n", p->x + p->y; Free(p);', '11', 'a pointer to a class');
is('class CPoint { I64 x, y; }; U0 Move(CPoint *p, I64 dx) { p->x += dx; } CPoint a = {1, 2}; Move(&a, 10); "%d\\n", a.x;', '11', 'a class changed through its pointer');
is('class CPoint { I64 x, y; }; I64 Sum(CPoint p) { p.x = 100; return p.x + p.y; } CPoint a = {1, 2}; "%d %d\\n", Sum(a), a.x;', '102 1', 'a class passed by value is a copy');
is('class CA { U8 a; I64 b; U8 c; }; "%d %d %d\\n", sizeof(CA), offset(CA.b), offset(CA.c);', '10 1 9', 'members are packed, as in TempleOS');
is('class CBase { I64 id; }; class CKid : CBase { I64 age; }; CKid k; k.id = 1; k.age = 2; "%d %d %d\\n", k.id, k.age, sizeof(CKid);', '1 2 16', 'a class that is another with more');
is('union U { I64 i; F64 f; U8 b[8]; }; U u; u.i = 0x41; "%d %d\\n", u.b[0], sizeof(U);', '65 8', 'a union is its members in one place');
is('class CNode { I64 v; CNode *next; }; CNode a, b; a.v = 1; b.v = 2; a.next = &b; b.next = NULL; I64 s = 0; CNode *p = &a; while (p) { s += p->v; p = p->next; } "%d\\n", s;', '3', 'a linked list');
is('class CRow { I64 v[3]; }; CRow r; r.v[1] = 5; "%d %d\\n", r.v[1], sizeof(CRow);', '5 24', 'an array as a member');
is('class CIn { I64 a; }; class COut { CIn in; I64 b; }; COut o; o.in.a = 4; o.b = 5; "%d %d\\n", o.in.a, sizeof(COut);', '4 16', 'a class inside a class');
is('class CP { I64 x, y; }; CP t[3]; t[1].y = 9; "%d %d\\n", t[1].y, sizeof(t);', '9 48', 'an array of classes');
fails('class CP { I64 x; }; CP p; p.z = 1;', /no member called z/, 'a member that is not there');
fails('I64 x; x.y = 1;', /no members/, 'a number has no members');

/* ---- switch, goto, try/catch --------------------------------------------------------------------------------------------- */
is('I64 i; for (i = 0; i < 4; i++) switch (i) { case 0: "zero "; break; case 1: "one "; break; default: "many "; }', 'zero one many many ', 'switch and default');
is('switch (2) { case 1: "a"; case 2: "b"; case 3: "c"; break; case 4: "d"; }', 'bc', 'a case falls through until a break');
is('switch (7) { case 1...5: "low"; break; case 6...9: "mid"; break; default: "high"; }', 'mid', 'a case can be a range');
is('switch [3] { case 3: "three"; break; }', 'three', 'the bracket switch');
is('switch (9) { case 1: "x"; break; }  "done";', 'done', 'a switch with no match does nothing');
is('switch (1) { case 0: "z"; break; start: "[ "; case 1: "one"; break; case 2: "two"; break; end: " ]"; }', '[ one ]', 'a sub-switch: start code, the case, end code');
is('I64 i = 0; top: i++; if (i < 3) goto top; "%d\\n", i;', '3', 'goto goes back to a label');
is('I64 i = 0; goto skip; i = 99; skip: "%d\\n", i;', '0', 'goto skips forward');
is('I64 i, j; for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) if (i * j == 2) goto out; out: "%d %d\\n", i, j;', '1 2', 'goto out of two loops');
fails('goto nowhere;', /no label of that name/, 'a goto with no label');
is('try { "a "; throw(\'X\'); "b "; } catch { "caught "; Fs->catch_except = TRUE; } "end";', 'a caught end', 'try, throw and catch');
is('try { throw(\'ABC\'); } catch { PutExcept; } "ok";', 'Exception: ABC|ok', 'PutExcept names it and catches it');
is('U0 F() { throw(\'Z\'); } try { F; } catch { "got "; Fs->catch_except = TRUE; } "after";', 'got after', 'an exception unwinds out of a function');
is('try { try { throw(1); } catch { "in "; } } catch { "out "; Fs->catch_except = TRUE; }', 'in out ', 'a catch that does not catch lets it go on up');
is('try { "fine "; } catch { "never "; } "end";', 'fine end', 'no throw, no catch');
fails('throw(\'Q\');', /unhandled exception: Q/, 'an exception nobody catches is said');

/* ---- functions ------------------------------------------------------------------------------------------------------------------- */
is('I64 Add(I64 a, I64 b = 10) { return a + b; } "%d %d\\n", Add(1, 2), Add(1);', '3 11', 'a default argument');
is('U0 Hi(U8 *who = "world") { "hello %s\\n", who; } Hi; Hi("you");', 'hello world|hello you', 'a default string and a call with no brackets');
is('I64 Sum(...) { I64 i, s = 0; for (i = 0; i < argc; i++) s += argv[i]; return s; } "%d %d\\n", Sum(1, 2, 3), Sum();', '6 0', 'a function with ... has argc and argv');
is('I64 Add(I64 a, I64 b) { return a + b; } I64 Mul(I64 a, I64 b) { return a * b; } I64 (*op)(I64 a, I64 b) = &Add; "%d ", op(3, 4); op = &Mul; "%d\\n", op(3, 4);', '7 12', 'a pointer to a function');
is('I64 F();  I64 F() { return 4; }  "%d\\n", F;', '4', 'a prototype, then the function');
is('U0 Count() { static I64 n = 0; n++; "%d ", n; } Count; Count; Count;', '1 2 3 ', 'a static keeps its value');
is('I64 Fact(I64 n) { if (n < 2) return 1; return n * Fact(n - 1); } "%d\\n", Fact(10);', '3628800', 'recursion still works');
is('U8 *Name() { return "Terry"; } "%s %d\\n", Name, StrLen(Name);', 'Terry 5', 'a function that returns text');
is('F64 Half(I64 n) { return n / 2.0; } "%.2f\\n", Half(5) / 2;', '1.25', 'a function that returns an F64 divides as one');
is('public I64 Pub(I64 a) { return a; } "%d\\n", Pub(2);', '2', 'a modifier is let through');
fails('I64 f = 3; f(1);', /variable, not a function/, 'calling a number is said');

/* ---- the preprocessor ------------------------------------------------------------------------------------------------------ */
is('#define N 5\n"%d\\n", N * 2;', '10', '#define');
is('#define SQ(x) ((x) * (x))\n"%d\\n", SQ(3 + 1);', '16', 'a macro with arguments');
is('#define DEBUG\n#ifdef DEBUG\n"on";\n#else\n"off";\n#endif', 'on', '#ifdef');
is('#ifndef NOPE\n"yes";\n#endif', 'yes', '#ifndef');
is('#define A 2\n#if A > 1\n"big";\n#else\n"small";\n#endif', 'big', '#if reads a number');
is('#define A 1\n#undef A\n#ifdef A\n"still";\n#else\n"gone";\n#endif', 'gone', '#undef');
is('#define TWICE(a) a + a\n#define FOUR TWICE(2) + TWICE(2)\n"%d\\n", FOUR;', '8', 'a macro inside a macro');
fails('#ifdef X\n"never ends";', /never closed/, 'an #if with no #endif');

/* ---- how it stays kind ------------------------------------------------------------------------------------------------------ */
is('"%d\\n", 7 / 2;', '3', 'integers still divide as integers');
is('I64 x = 7; F64 y = x / 2.0; "%.2f\\n", y;', '3.50', 'and a point still makes it a fraction');
is('"%5d|%-5d|%05d|%+d|%x|%X|%b\\n", 42, 42, 42, 42, 255, 255, 5;', '   42|42   |00042|+42|ff|FF|101', 'the format');
is('"%s|%s\\n", "ab", "cd";', 'ab|cd', 'strings in the format');
is('I64 x = 1; { I64 x = 2; { I64 x = 3; } } "%d\\n", x;', '1', 'scopes nest');
ok(out('U0 F() { I64 a[100]; a[99] = 1; } I64 i; for (i = 0; i < 50000; i++) F; "done";', { maxSteps: 5e6 }) === 'done', 'the stack is let go when a function ends');
ok(out('I64 i; for (i = 0; i < 40000; i++) { I64 a[8]; a[0] = i; } "done";', { maxSteps: 5e6 }) === 'done', 'and when a block ends');
fails('U0 F() { F; } F;', /too deep/, 'a function that calls itself for ever stops, with memory in use too');

console.log(bad ? bad + ' FAILED of ' + n : 'holyc language: all ' + n + ' ok');
process.exit(bad ? 1 : 0);
