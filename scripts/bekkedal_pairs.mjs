#!/usr/bin/env node
/* Bekkedal — before/after pairs, composed from two runs of the shot matrix.
 *
 * This repo commits no binaries: the art is code, and a screenshot checked
 * in goes stale the first time somebody touches a ramp. So the *matrix* is
 * the thing that is kept, not the pictures — run the harness twice and
 * compose:
 *
 *   git worktree add /tmp/bekold main
 *   (cd /tmp/bekold && python3 -m http.server 3001) &
 *   python3 -m http.server 3000 &
 *   BEK_URL=http://localhost:3001/ node scripts/bekkedal_shots.mjs shots/before
 *   node scripts/bekkedal_shots.mjs shots/after
 *   node scripts/bekkedal_pairs.mjs shots/before shots/after shots/pairs
 *
 * Output is one labelled PNG per shot, grouped by which of the seven
 * reported problems it is evidence for, plus a phase strip for the swing —
 * four frames across, one row per tool, cropped to the player, because a
 * swing is the one thing a full-frame screenshot cannot show.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const [BEFORE, AFTER, OUT] = process.argv.slice(2);
if (!BEFORE || !AFTER || !OUT) {
  console.error('usage: node scripts/bekkedal_pairs.mjs <before-dir> <after-dir> <out-dir>');
  process.exit(2);
}
fs.mkdirSync(OUT, { recursive: true });
const CH = '/opt/pw-browsers/chromium';

/* which shot is evidence for which reported problem */
const GROUPS = {
  '1-palette':   ['farm_morning', 'enga_morning', 'vidda_morning', 'setra_morning'],
  '2-night':     ['farm_night', 'town_night', 'farmhouse_night', 'lake_built_night',
                  'farm_fog_night', 'gruva_dark_lamp', 'gruva_dark_nolamp'],
  '3-shore':     ['lake_morning', 'fjord_morning', 'shorelab_noon', 'shorelab_dusk', 'lake_dusk'],
  '4-ores':      ['gruva_morning', 'gruva_dusk', 'gruva_1bit'],
  '5-interiors': ['farmhouse_morning', 'lakehouse_morning', 'farmhouse_dusk', 'lakehouse_dusk'],
  '6-treeline':  ['forest_morning', 'forest_dusk', 'farm_corner_top', 'farm_corner_bot'],
  '7-tools':     ['swing_oks_0', 'swing_oks_1', 'swing_oks_2', 'swing_oks_3',
                  'swing_hakke_1', 'swing_spade_1', 'swing_kanne_2', 'swing_stang_1']
};

/* the game's own geometry, so a crop lands on the player rather than near him */
const T = 40, VIEW_H = 480, HUD = 30, CAM_MAX_Y = 120, W = 960, H = 540;
/* mirrors the SWING table in bekkedal_shots.mjs */
const SWING = [['oks', 10, 7], ['hakke', 14, 7], ['spade', 13, 4], ['kanne', 13, 4], ['stang', 9, 7]];
const PHASE = ['rest', 'windup', 'strike', 'recover'];
const CW = 200, CH_ = 180, Z = 2;

const b64 = p => fs.readFileSync(p).toString('base64');
const has = p => fs.existsSync(p);
const CSS = `*{margin:0;padding:0;box-sizing:border-box}
 body{background:#111;font:12px monospace;color:#ddd}
 img{display:block;width:${W}px;height:${H}px;image-rendering:pixelated}`;

const browser = await chromium.launch({ executablePath: has(CH) ? CH : undefined });

/* ---- one shot, before beside after --------------------------------------- */
const page = await browser.newPage({ viewport: { width: W * 2 + 24, height: H + 40 } });
let n = 0;
for (const [group, names] of Object.entries(GROUPS)) {
  for (const name of names) {
    const a = path.join(BEFORE, name + '.png'), b = path.join(AFTER, name + '.png');
    if (!has(a) || !has(b)) { console.log('  skip (missing) ' + name); continue; }
    await page.setContent(`<style>${CSS}
      .row{display:flex;gap:8px;padding:8px}figcaption{padding:4px 2px;color:#ff5}</style>
      <div class="row">
        <figure><figcaption>BEFORE &mdash; ${name}</figcaption><img src="data:image/png;base64,${b64(a)}"></figure>
        <figure><figcaption>AFTER &mdash; ${name}</figcaption><img src="data:image/png;base64,${b64(b)}"></figure>
      </div>`);
    await page.screenshot({ path: path.join(OUT, `${group}__${name}.png`) });
    n++;
  }
}

/* ---- the swing, four frames across, cropped to the player ----------------- */
const origin = (tx, ty) => {
  const camY = Math.max(0, Math.min(CAM_MAX_Y, ty * T + T / 2 - VIEW_H / 2));
  return [Math.round(tx * T + T / 2 - CW / 2), Math.round(ty * T + T / 2 - camY + HUD - CH_ / 2)];
};
const cellOf = (dir, tool, i, ox, oy) => {
  const f = path.join(dir, `swing_${tool}_${i}.png`);
  if (!has(f)) return '<div class="c"></div>';
  return `<div class="c"><div class="v" style="background-image:url(data:image/png;base64,${b64(f)});
    margin-left:${-ox * Z}px;margin-top:${-oy * Z}px"></div></div>`;
};
let rows = '';
for (const [tool, tx, ty] of SWING) {
  const [ox, oy] = origin(tx, ty);
  rows += `<div class="r"><div class="lab">${tool}</div>`;
  for (let i = 0; i < 4; i++) rows += cellOf(AFTER, tool, i, ox, oy);
  rows += `<div class="gap"></div><div class="lab dim">before</div>${cellOf(BEFORE, tool, 2, ox, oy)}</div>`;
}
await page.setViewportSize({ width: CW * Z * 5 + 270, height: CH_ * Z * 5 + 90 });
await page.setContent(`<style>${CSS}
 body{padding:10px}h1{font:14px monospace;color:#ff5;padding:0 0 8px 2px}
 .r{display:flex;align-items:center;margin-bottom:6px}
 .lab{width:70px;color:#5f5;text-transform:uppercase}
 .lab.dim{color:#888;width:56px;text-align:right;padding-right:6px}
 .gap{width:26px}
 .c{width:${CW * Z}px;height:${CH_ * Z}px;margin-right:6px;border:1px solid #333;overflow:hidden}
 .v{width:${W * Z}px;height:${H * Z}px;background-size:${W * Z}px ${H * Z}px;image-rendering:pixelated}
 .ph{width:${CW * Z}px;margin-right:6px;color:#ff5;text-align:center}</style>
 <h1>The swing &mdash; three phases per tool, tool visible in the hand, effect on the target tile</h1>
 <div class="r"><div class="lab"></div>${PHASE.map(p => `<div class="ph">${p}</div>`).join('')}</div>
 ${rows}`);
await page.screenshot({ path: path.join(OUT, '7-tools__PHASE_STRIP.png') });
await browser.close();
console.log((n + 1) + ' composites -> ' + OUT);
