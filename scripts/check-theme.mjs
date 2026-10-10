#!/usr/bin/env node
/* node scripts/check-theme.mjs -- the schemes as a whole look (pure Node).
   A scheme is a gradient map over everything under it (kernel/theme_fx.js), so what has to be true is about the pixels that come out:
   - the ramp is a ramp: from the background to the top the brightness only moves one way;
   - what is text on VGA stays text: white, light grey, yellow, light green, light cyan, the machine's own inks, mapped through each scheme, still read against the
     scheme's mapped black at 4.5:1; the dimmer colours that carry information (light red, light magenta, light blue, brown, dark grey) at 3:1;
   - every scheme has its own filter, VGA has none, and the filter is made of well-formed table values;
   - a scheme dresses NOTES and nothing else: the machine's chrome (menu bar, taskbar, desktop, pop-ups, every other window) is never filtered, and NOTES' OWN PAGE IS HELD TO READABLE
     under every scheme: the text at 7:1 and every other ink at 4.5:1 against the page it is read on (kernel/theme_fx.js notesInks). */
import { SCHEMES } from '../kernel/cos_data.js';
import { rampOf, mapColour, contrast, relLum, filterOf, varsOf, deskOf, frameHex, notesInks, readable, NOTES_MIN, VAR_NAMES, GAMMA } from '../kernel/theme_fx.js';
import { TITLE_COLORS } from '../kernel/win_skins.js';
import { readFileSync } from 'node:fs';

let bad = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL ' + m); } };
const H = c => { const x = parseInt(c.slice(1), 16); return [(x >> 16) & 255, (x >> 8) & 255, x & 255]; };
const TEXT = { WHITE: '#FFFFFF', LGREY: '#AAAAAA', YELLOW: '#FFFF55', LGREEN: '#55FF55', LCYAN: '#55FFFF' };
const INFO = { LRED: '#FF5555', LMAGENTA: '#FF55FF', LBLUE: '#5555FF', BROWN: '#AA5500', DGREY: '#555555' };

for (const s of SCHEMES) {
  const r = rampOf(s.v), bgL = relLum(r[0]);
  if (s.id === 'vga') continue;            /* the default look has no filter: nothing is mapped */
  const up = s.id === 'paper' || relLum(r[0]) > relLum(r[3]);          /* a light scheme's ramp runs from light to dark */
  for (let i = 1; i < r.length; i++) ok(up ? relLum(r[i]) <= relLum(r[i - 1]) + 1e-6 : relLum(r[i]) >= relLum(r[i - 1]) - 1e-6, s.id + ': the ramp moves one way (stop ' + i + ')');
  const black = mapColour(s.v, [0, 0, 0]);
  ok(contrast(black, r[0]) < 1.4, s.id + ': black maps to the scheme\'s own background (' + contrast(black, r[0]).toFixed(2) + ')');
  for (const k in TEXT) { const c = contrast(mapColour(s.v, H(TEXT[k])), black); ok(c >= 4.5, s.id + ': ' + k + ' text is ' + c.toFixed(2) + ':1 on the scheme\'s black, under 4.5'); }
  for (const k in INFO) { const c = contrast(mapColour(s.v, H(INFO[k])), black); ok(c >= 3, s.id + ': ' + k + ' is ' + c.toFixed(2) + ':1 on the scheme\'s black, under 3'); }
  /* the desk is distinguishable from the glass around it, and from white text */
  ok(contrast(H(deskOf(s.v, s.id)), H(s.v.bg)) < 3, s.id + ': the desktop colour is a shade of the scheme, not another colour');
  const v = varsOf(s);
  ok(v['--th-filter'] === 'url(#th-' + s.id + ')', s.id + ': the filter variable (set on a Notes window only)');
  ok(Object.keys(v).every(k => VAR_NAMES.includes(k)) && !Object.keys(v).some(k => /^--sch-/.test(k)), s.id + ': what is set is the page\'s inks and the filter, never the machine\'s six (--sch-*)');
  /* Notes' page, held to readable: the text at 7:1 on the page and on a hovered row, every other ink at 4.5:1 on both; the selected row's text on the accent at 4.5:1 */
  const t = notesInks(s.v), pg = H(t.bg), hv = H(t.hover);
  [['fg', NOTES_MIN.fg], ['hi', NOTES_MIN.ink], ['acc', NOTES_MIN.ink], ['ok', NOTES_MIN.ink], ['err', NOTES_MIN.ink], ['dim', NOTES_MIN.ink]].forEach(([k, min]) => {
    ok(contrast(H(t[k]), pg) >= min - 0.01, s.id + ': Notes ' + k + ' is ' + contrast(H(t[k]), pg).toFixed(2) + ':1 on its page, under ' + min);
    ok(contrast(H(t[k]), hv) >= min - 0.01, s.id + ': Notes ' + k + ' is ' + contrast(H(t[k]), hv).toFixed(2) + ':1 on a hovered row, under ' + min);
  });
  ok(contrast(H(t.selInk), H(t.sel)) >= NOTES_MIN.ink - 0.01, s.id + ': the selected row reads (' + contrast(H(t.selInk), H(t.sel)).toFixed(2) + ':1)');
  ok(contrast(H(t.line), pg) >= 2.9, s.id + ': a rule shows on the page (' + contrast(H(t.line), pg).toFixed(2) + ')');
  /* the frame: every window kind's bar is filtered and its edge is a border given the colour the ramp gives it; the edge has to be a real colour and still show against the scheme's glass */
  for (const k in TITLE_COLORS) {
    const e = frameHex(s.v, TITLE_COLORS[k].border);
    ok(/^#[0-9A-F]{6}$/.test(e), s.id + ': the ' + k + ' window edge is a colour (' + e + ')');
    ok(contrast(H(e), black) >= 1.4 || k === 'panic', s.id + ': the ' + k + ' window edge shows against the scheme\'s black (' + contrast(H(e), black).toFixed(2) + ')');
  }
  if (s.id !== 'vga') { const f = filterOf(s.id, s.v); ok(/id="th-/.test(f) && !/NaN|undefined/.test(f) && (f.match(/tableValues="/g) || []).length === 3, s.id + ': filter markup'); }
}
ok(GAMMA > 0.5 && GAMMA < 1, 'the lift is a lift');
/* readable() never makes a good colour worse and always reaches the contrast asked for, whatever it is given, on a dark ground and on a light one */
for (const g of ['#000000', '#E8E2D4', '#120a00', '#808080']) for (const c of ['#FFFFFF', '#808080', '#E8E2D4', '#101010', '#FF00FF']) { const r = readable(c, g, 4.5); ok(contrast(H(r), H(g)) >= 4.5 - 0.01 || contrast(H(r), H(g)) >= contrast(H(c), H(g)), 'readable ' + c + ' on ' + g + ' is ' + r); }
ok(readable('#FFFFFF', '#000000', 7) === '#FFFFFF', 'a colour that already reads is left alone');
ok(Object.keys(varsOf(SCHEMES[0])).length === 0, 'the default scheme sets nothing: Notes is exactly as it always was');
ok(frameHex({ bg: '#000000', fg: '#FFFFFF', ok: '#55FF55', hi: '#FFFF55', err: '#FF5555', dim: '#AAAAAA', acc: '#55FFFF' }, '#AA00AA').length === 7, 'frameHex gives a colour');

/* What a scheme may reach: the machine's chrome and nothing inside an app. The filter is applied in the stylesheet, so hold the stylesheet to it. */
const css = readFileSync(new URL('../kernel/theme.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const rules = css.split('}').map(r => r.trim()).filter(r => /filter:\s*var\(--th-filter/.test(r));
ok(rules.length === 1, 'exactly one rule applies the scheme\'s filter (found ' + rules.length + ')');
const sel = rules.length ? rules[0].slice(0, rules[0].indexOf('{')).split(',').map(x => x.trim().replace(/\s+/g, ' ')) : [];
['.win > .titlebar', '.win > .grip'].forEach(x => ok(sel.includes(x), 'the scheme dresses ' + x + ' (and only a Notes window ever has the variable set)'));
['#menubar', '#taskbar', '.win', '.wbody', '#icons', '#pet', '#deskvid', '#livewall', '#desktop', '#room', '#tube'].forEach(x => ok(!sel.includes(x), 'the scheme never filters ' + x + ' (the machine and the apps keep their own colours)'));
/* the Notes rules read the page's inks, with the old colour as the fallback, so a machine on the default scheme sees exactly what it always saw */
const notes = css.split('}').filter(r => /^\s*\.(notesroot|ntop|nsel|nstat|nside|nfind|nrow|nrc|nempty|ntitle|nedit|nread|nlink|nback|nbl|nbnone|nchip|ngcv|nghint)\b/.test(r));
ok(notes.length >= 20 && notes.every(r => !/#[0-9A-Fa-f]{6}\s*[;}]/.test(r.replace(/var\([^)]*\)/g, ''))), 'every colour in the Notes rules is a variable with a fallback (' + notes.length + ' rules)');
ok(!/\.notesroot[^{]*\{[^}]*--sch-/.test(css), 'and they read the page\'s inks, not the machine\'s six');
ok(SCHEMES.some(s => s.id === 'vga'), 'the default scheme exists');
console.log(bad ? '\nFAILED ' + bad + ' of ' + n : 'ok  - ' + SCHEMES.length + ' schemes as whole looks (' + n + ' checks)');
process.exit(bad ? 1 : 0);
