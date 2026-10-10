#!/usr/bin/env node
/* Is the packaged app complete and clean?
     node scripts/check-package.mjs [path/to/app.asar]
   Default asar: dist/linux-unpacked/resources/app.asar, else dist/win-unpacked/resources/app.asar.
   1. COMPLETE  every file the machine can load (crawled from index.html, scripts/lib/reach.mjs,
                plus every registry app) is inside the asar - nothing reachable was packaged away
   2. CLEAN     no repo scaffolding (fix_*.cjs, *_check.txt, "big html file", temp_*, server.js,
                scripts/, docs/, .claude, node_modules, markdown) and no dev-only checks
   3. SIZE      prints what ships. The packaged binary itself is exercised with
                HOLYTRON_EXE=<binary> node scripts/check-shell.mjs  (and check-persist). */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import asar from '@electron/asar';
import { reachable } from './lib/reach.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2] || ['dist/linux-unpacked', 'dist/win-unpacked', 'dist/mac-unpacked']
  .map(d => resolve(ROOT, d, 'resources/app.asar')).find(existsSync);
if (!file || !existsSync(file)) { console.log('FAIL - no app.asar found; run `npm run pack` first'); process.exit(1); }

const packed = new Set(asar.listPackage(file).map(p => p.replace(/\\/g, '/').replace(/^\//, '')));
const files = [...packed].filter(p => { try { asar.statFile(file, p); return !asar.statFile(file, p).files; } catch { return false; } });
let fails = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'} - ${m}`); if (!c) fails++; };

/* 1. complete */
const need = reachable(ROOT);
for (const id of Object.keys((await import('../kernel/registry.js')).registry)) need.add(`apps/${id}/index.js`);
const missing = [...need].filter(f => !packed.has(f));
ok(missing.length === 0, `all ${need.size} reachable files are packaged${missing.length ? ' - MISSING: ' + missing.join(', ') : ''}`);
for (const f of ['index.html', 'kernel/boot.js', 'kernel/durable.js', 'kernel/fonts.css', 'assets/seed.json', 'vendor/fonts/VT323-latin.woff2', 'electron/main.js', 'electron/preload.cjs', 'package.json'])
  ok(packed.has(f), `ships ${f}`);

/* 2. clean */
const FORBIDDEN = [
  [/(^|\/)fix[^/]*\.(c?js)$/, 'one-off fix scripts'], [/_check\.txt$/, 'check dumps'], [/big html file/, 'the 1 MB scratch HTML'],
  [/(^|\/)temp_/, 'temp files'], [/^server\.js$/, 'the old web server'], [/^(scripts|docs|\.claude|\.git|\.github)\//, 'dev folders'],
  [/^node_modules\//, 'node_modules'], [/\.(md)$/i, 'markdown'], [/(^|\/)(bulk_port|extract_fs|full_extract|manual_fix|patch|patch_menu|analyze)\.c?js$/, 'port scaffolding'],
  [/\.(bat|sh)$/, 'launcher scripts'], [/^package-lock\.json$/, 'lockfile'], [/^playwright/, 'test tooling'],
  [/^apps\/bekkedal\/[a-z0-9_]*_check[a-z_]*\.js$/, 'Bekkedal check scripts'], [/^apps\/garage\/[a-z0-9_]*_check[a-z_]*\.js$/, 'Garage check scripts'], [/^apps\/(aftere|garden|shop|hifi|sweeper|defrag|holyc)\/[a-z0-9_]*_check[a-z_]*\.js$/, 'AfterEgypt, Garden, Dave, Stack, Sweeper, Defrag and HolyC check scripts'], [/^apps\/hifi\/check_kit\.js$/, 'the Stack\'s fixture maker'], [/^apps\/magen\/[a-z0-9_]*_check[a-z_]*\.js$/, 'Magen check scripts'], [/^apps\/standbattle\/([a-z0-9_]*_check[a-z_]*|check_kit|headless_harness|budget_bot)\.js$/, 'Stand Battle checks, the harness and the budget bot'],
];
for (const [re, what] of FORBIDDEN) {
  const hit = files.filter(f => re.test(f));
  ok(hit.length === 0, `no ${what}${hit.length ? ': ' + hit.slice(0, 4).join(', ') : ''}`);
}
const need2 = new Set([...need, 'package.json']);
const extra = files.filter(f => !need2.has(f) && !f.startsWith('electron/'));
console.log(`INFO - shipped but not reached from index.html (kept on purpose, not proven dead): ${extra.length ? extra.join(', ') : 'none'}`);

/* 3. what it is */
const pkg = JSON.parse(asar.extractFile(file, 'package.json').toString());
let bytes = 0; for (const f of files) bytes += asar.statFile(file, f).size || 0;
console.log(`INFO - ${pkg.name} ${pkg.version}: ${files.length} files, ${(bytes / 1048576).toFixed(2)} MB inside app.asar`);
console.log(fails ? `${fails} FAILED` : 'PACKAGE OK');
process.exit(fails ? 1 : 0);
