import { DECO_NEW } from './cos_deco.js';
import { FRAMES_R, LOGOS_R, CURSORS_R, SCHEMES_R, ELEPHANT_R, DRINKS_R } from './cos_rewards.js';
import { DRINKS_G, SPECIES_G } from './cos_gifts.js';
import { FRAMES_M, DECO_M, LOGOS_M, cursorsM, SCHEMES_M, DRINKS_M, ELEPHANT_M } from './cos_more.js';

export const FRAMES = [
  {
    id: 'beige', name: 'BEIGE OFFICE', price: 0,
    blurb: 'Yellowed. Ventilated. Smells faintly of 1994.',
    brand: 'HOLYTRON  DM-640',
    vars: {},
    deco: [{ svg: 'vents', pos: 'right 3% top 1.5%', size: '84px 12px' }]
  },
  {
    id: 'wood', name: 'WOODGRAIN', price: 900,
    blurb: 'Fake walnut over real particle board. A 1978 living room.',
    brand: 'HEARTHTRON  W-2',
    vars: {
      '--case-bg': 'repeating-linear-gradient(97deg, #7a4a22 0 3px, #6b3f1c 3px 5px, #8a5628 5px 9px, #5e3717 9px 11px)',
      '--well-bg': 'linear-gradient(160deg, #4c2c12 0%, #633a1a 45%, #3c2210 100%)',
      '--chin-ink': '#f0d9a8',
      '--knob-bg': 'linear-gradient(180deg, #d8c49a 0%, #b39a6a 100%)',
      '--knob-bg-hi': 'linear-gradient(180deg, #eddbb4 0%, #c6ad7d 100%)',
      '--knob-ink': '#4a3315',
      '--lamp-on': '#ffb347', '--lamp-off': '#3a2a12', '--lamp-glow': 'rgba(255,179,71,0.8)',
      '--scr-tint': 'rgba(60,30,0,0.05)',
      '--case-shadow': 'inset 0 2px 0 rgba(255,220,170,0.35), inset 0 -3px 0 rgba(0,0,0,0.45), inset 3px 0 0 rgba(255,220,170,0.12), inset -3px 0 0 rgba(0,0,0,0.3)'
    },
    deco: [{ svg: 'grain', pos: 'left 2% bottom 4%', size: '120px 20px' }]
  },
  {
    id: 'steel', name: 'INDUSTRIAL', price: 1400,
    blurb: 'Black steel, exposed screws, a red label nobody has read.',
    brand: 'WERK  M-11',
    vars: {
      '--case-bg': 'linear-gradient(158deg, #3a3d42 0%, #24272b 40%, #16181b 100%)',
      '--well-bg': 'linear-gradient(160deg, #101215 0%, #1e2126 50%, #0b0c0e 100%)',
      '--chin-ink': '#c8ccd2',
      '--knob-bg': 'linear-gradient(180deg, #4a4e55 0%, #2b2e33 100%)',
      '--knob-bg-hi': 'linear-gradient(180deg, #5d626a 0%, #3a3e44 100%)',
      '--knob-ink': '#e0e4ea',
      '--lamp-on': '#ff4d3d', '--lamp-off': '#3d1512', '--lamp-glow': 'rgba(255,77,61,0.8)',
      '--scr-tint': 'transparent',
      '--case-shadow': 'inset 0 2px 0 rgba(255,255,255,0.14), inset 0 -3px 0 rgba(0,0,0,0.6), inset 3px 0 0 rgba(255,255,255,0.05), inset -3px 0 0 rgba(0,0,0,0.5)'
    },
    deco: [
      { svg: 'screw', pos: 'left 2px top 2px' },
      { svg: 'screw', pos: 'right 2px top 2px' },
      { svg: 'screw', pos: 'left 2px bottom 2px' },
      { svg: 'screw', pos: 'right 2px bottom 2px' },
      { svg: 'danger', pos: 'chin' }
    ]
  },
  {
    id: 'medical', name: 'MEDICAL', price: 1800,
    blurb: 'Sterile. Strain-relieved. The readout says the patient is fine.',
    brand: 'VITALTRON  CM-9',
    vars: {
      '--case-bg': 'linear-gradient(158deg, #f2f4f1 0%, #dfe4e0 30%, #c3cac6 70%, #aab2ae 100%)',
      '--well-bg': 'linear-gradient(160deg, #b6bebb 0%, #ced5d1 40%, #9aa3a0 100%)',
      '--chin-ink': '#4a5a55',
      '--knob-bg': 'linear-gradient(180deg, #eef2ef 0%, #c9d1cd 100%)',
      '--knob-bg-hi': 'linear-gradient(180deg, #ffffff 0%, #dae0dd 100%)',
      '--knob-ink': '#3d4c48',
      '--lamp-on': '#5cffc0', '--lamp-off': '#183a30', '--lamp-glow': 'rgba(92,255,192,0.75)',
      '--scr-tint': 'rgba(80,140,255,0.07)',
      '--case-shadow': 'inset 0 2px 0 rgba(255,255,255,0.9), inset 0 -3px 0 rgba(0,0,0,0.18), inset 3px 0 0 rgba(255,255,255,0.5), inset -3px 0 0 rgba(0,0,0,0.12)'
    },
    deco: [
      { svg: 'readout', pos: 'chin' },
      { svg: 'strain', pos: 'right 1% bottom 0%', size: '40px 46px' }
    ]
  },
  {
    id: 'moss', name: 'OVERGROWN', price: 2400,
    blurb: 'Left by a window. Something got in. Nothing has been done about it.',
    brand: 'HOLYTRON  DM-640',
    vars: {
      '--case-bg': 'linear-gradient(158deg, #cfc9b2 0%, #b3b394 26%, #8f9776 62%, #6f7a5a 100%)',
      '--well-bg': 'linear-gradient(160deg, #6d7554 0%, #8b8f6d 40%, #59613f 100%)',
      '--chin-ink': '#3f4a2f',
      '--knob-bg': 'linear-gradient(180deg, #c3c4a0 0%, #97a07a 100%)',
      '--knob-bg-hi': 'linear-gradient(180deg, #d6d7b3 0%, #a9b28c 100%)',
      '--knob-ink': '#39421f',
      '--lamp-on': '#9dff5c', '--lamp-off': '#1f3311', '--lamp-glow': 'rgba(157,255,92,0.75)',
      '--scr-tint': 'rgba(60,255,120,0.055)',
      '--case-shadow': 'inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -3px 0 rgba(0,0,0,0.35), inset 3px 0 0 rgba(180,255,150,0.12), inset -3px 0 0 rgba(0,0,0,0.25)'
    },
    deco: [
      { svg: 'mossTL', pos: 'left 0 top 0' },
      { svg: 'mossBR', pos: 'right 0 bottom 0' },
      { svg: 'vineR', pos: 'right 0 top 40px' }
    ]
  },
  {
    id: 'crack', name: 'CRACKED', price: 3000,
    blurb: 'It was like that when it got here. The tape is holding.',
    brand: 'HOLYTR N  DM-6 40',
    flick: true,
    vars: {
      '--case-bg': 'linear-gradient(158deg, #cfc7b1 0%, #b4ab94 26%, #948b76 62%, #77705c 100%)',
      '--well-bg': 'linear-gradient(160deg, #7c735d 0%, #968d77 40%, #6b6250 100%)',
      '--chin-ink': '#5a5346',
      '--lamp-on': '#ffcf4d', '--lamp-off': '#3b3011', '--lamp-glow': 'rgba(255,207,77,0.7)',
      '--scr-tint': 'rgba(255,255,255,0.02)'
    },
    deco: [
      { svg: 'crack', pos: 'left 0 top 0', size: '100% 100%' },
      { svg: 'tape', pos: 'left 0 top 0' }
    ]
  },
  {
    id: 'candy', name: 'BUBBLEGUM', price: 1500,
    blurb: 'Pink plastic. A sticker of a heart that will not come off. Somebody loved this machine.',
    brand: 'POPTRON  K-3',
    vars: {
      '--case-bg': 'linear-gradient(158deg, #ffd6ea 0%, #ffb3d6 30%, #f58ec0 70%, #d86aa4 100%)',
      '--well-bg': 'linear-gradient(160deg, #c8f0e0 0%, #9fdcc4 45%, #7ac4a8 100%)',
      '--chin-ink': '#7a1f52',
      '--knob-bg': 'linear-gradient(180deg, #fff0f8 0%, #f4a8cc 100%)',
      '--knob-bg-hi': 'linear-gradient(180deg, #ffffff 0%, #ffc8e0 100%)',
      '--knob-ink': '#7a1f52',
      '--lamp-on': '#7affb0', '--lamp-off': '#3a1a2c', '--lamp-glow': 'rgba(122,255,176,0.8)',
      '--scr-tint': 'rgba(255,120,200,0.04)',
      '--case-shadow': 'inset 0 2px 0 rgba(255,255,255,0.8), inset 0 -3px 0 rgba(120,30,80,0.3), inset 3px 0 0 rgba(255,255,255,0.4), inset -3px 0 0 rgba(120,30,80,0.2)'
    },
    deco: [{ svg: 'heart', pos: 'left 0 top 0' }, { svg: 'heart', pos: 'right 0 bottom 0' }]
  },
  {
    id: 'arcade', name: 'ARCADE CABINET', price: 2600,
    blurb: 'Lacquered in the dark, lit from under. It wants a coin. It will take a sun.',
    brand: 'COINTRON  JR-85',
    vars: {
      '--case-bg': 'linear-gradient(158deg, #3a2a7a 0%, #231650 40%, #120a30 100%)',
      '--well-bg': 'linear-gradient(160deg, #0a0620 0%, #1a1040 50%, #060314 100%)',
      '--chin-ink': '#ff7ad9',
      '--knob-bg': 'linear-gradient(180deg, #ff4fb0 0%, #a8156a 100%)',
      '--knob-bg-hi': 'linear-gradient(180deg, #ff80c8 0%, #c8207e 100%)',
      '--knob-ink': '#fff0fa',
      '--lamp-on': '#ffff55', '--lamp-off': '#3a3a10', '--lamp-glow': 'rgba(255,255,85,0.85)',
      '--scr-tint': 'rgba(150,80,255,0.06)',
      '--case-shadow': 'inset 0 2px 0 rgba(255,122,217,0.55), inset 0 -4px 0 rgba(0,0,0,0.6), inset 3px 0 0 rgba(122,200,255,0.25), inset -3px 0 0 rgba(0,0,0,0.5)'
    },
    deco: [{ svg: 'marquee', pos: 'center top 0.4%', size: '170px 20px' }]
  },
  {
    id: 'blueprint', name: 'BLUEPRINT', price: 3000,
    blurb: 'The monitor as it was meant to be, before anybody built it. Measurements in the margin.',
    brand: 'HOLYTRON  DM-640  REV C',
    vars: {
      '--case-bg': 'repeating-linear-gradient(0deg, rgba(255,255,255,0.16) 0 1px, transparent 1px 14px), repeating-linear-gradient(90deg, rgba(255,255,255,0.16) 0 1px, transparent 1px 14px), linear-gradient(158deg, #2a5cb8 0%, #1d4a9a 50%, #163a7c 100%)',
      '--well-bg': 'linear-gradient(160deg, #0f2a5c 0%, #1a3f80 45%, #0b2048 100%)',
      '--chin-ink': '#e8f2ff',
      '--knob-bg': 'linear-gradient(180deg, #3a70cc 0%, #1d4a9a 100%)',
      '--knob-bg-hi': 'linear-gradient(180deg, #5088e0 0%, #2a5cb8 100%)',
      '--knob-ink': '#ffffff',
      '--lamp-on': '#ffffff', '--lamp-off': '#14305c', '--lamp-glow': 'rgba(255,255,255,0.8)',
      '--scr-tint': 'rgba(60,120,255,0.05)',
      '--case-shadow': 'inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -3px 0 rgba(0,0,0,0.4), inset 3px 0 0 rgba(255,255,255,0.15), inset -3px 0 0 rgba(0,0,0,0.3)'
    },
    deco: [{ svg: 'dims', pos: 'chin' }]
  },
  {
    id: 'lunar', name: 'LUNAR LANDER', price: 3800,
    blurb: 'Gold foil over aluminium, taped on by a man in a hurry. It has been somewhere.',
    brand: 'APOLLOTRON  LM-5',
    vars: {
      '--case-bg': 'linear-gradient(158deg, #eceae2 0%, #cfcdc4 30%, #aaa89f 65%, #8e8c84 100%)',
      '--well-bg': 'linear-gradient(160deg, #7a7870 0%, #a09e94 45%, #686660 100%)',
      '--chin-ink': '#3a3830',
      '--knob-bg': 'linear-gradient(180deg, #f0ddb0 0%, #c8a860 100%)',
      '--knob-bg-hi': 'linear-gradient(180deg, #fff0c8 0%, #dcbc70 100%)',
      '--knob-ink': '#3a2c10',
      '--lamp-on': '#ff6a3d', '--lamp-off': '#3a1a10', '--lamp-glow': 'rgba(255,106,61,0.8)',
      '--scr-tint': 'rgba(255,255,255,0.03)',
      '--case-shadow': 'inset 0 2px 0 rgba(255,255,255,0.85), inset 0 -3px 0 rgba(0,0,0,0.3), inset 3px 0 0 rgba(255,255,255,0.4), inset -3px 0 0 rgba(0,0,0,0.25)'
    },
    deco: [{ svg: 'foilTL', pos: 'left 0 top 0' }, { svg: 'foilBR', pos: 'right 0 bottom 0' }]
  },
  {
    id: 'gold', name: 'THE THIRD TEMPLE', price: 99999, joke: true,
    blurb: 'Solid gold. Weighs as much as a car. Ships in a crate marked FRAGILE and NOT A JOKE.',
    brand: 'HOLYTRON  †  AD  MMXXIV',
    vars: {
      '--case-bg': 'linear-gradient(158deg, #fff3b0 0%, #e8c247 22%, #b8860b 55%, #8a5f06 78%, #ffe680 100%)',
      '--well-bg': 'linear-gradient(160deg, #8a6a10 0%, #d4af37 45%, #6b5008 100%)',
      '--chin-ink': '#3a2a00',
      '--knob-bg': 'linear-gradient(180deg, #ffe680 0%, #c9a227 100%)',
      '--knob-bg-hi': 'linear-gradient(180deg, #fff6c2 0%, #dcb63a 100%)',
      '--knob-ink': '#3a2a00',
      '--lamp-on': '#ffffff', '--lamp-off': '#4a3a00', '--lamp-glow': 'rgba(255,255,200,0.95)',
      '--scr-tint': 'rgba(255,220,90,0.06)',
      '--case-shadow': 'inset 0 3px 0 rgba(255,255,255,0.85), inset 0 -4px 0 rgba(90,60,0,0.5), inset 4px 0 0 rgba(255,255,220,0.5), inset -4px 0 0 rgba(120,80,0,0.4)'
    },
    deco: [{ svg: 'crown', pos: 'center top 0.5%', size: '150px 30px' }]
  }
];
export const LOGOS = [
  { id: 'temple', name: 'THE THIRD TEMPLE', price: 0, blurb: 'The one it came with.', svg: null },
  {
    id: 'sun', name: 'THE SUN', price: 260,
    blurb: 'Currency, made large. Tasteless. Effective.',
    svg: '<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">' +
      '<rect width="160" height="120" fill="#000000"/>' +
      Array.from({ length: 16 }, (_, i) => {
        const th = i * Math.PI / 8;
        const x = Math.round(80 + Math.cos(th) * 46) - 3, y = Math.round(60 + Math.sin(th) * 46) - 3;
        return '<rect x="' + x + '" y="' + y + '" width="7" height="7" fill="' + (i % 2 ? '#AA5500' : '#FFFF55') + '"/>';
      }).join('') +
      /* a disc as a staircase of rows, the way a circle has to be drawn on a
         machine that will not anti-alias anything */
      (function () {
        const rows = (cx, cy, r, fill) => {
          let out = '';
          for (let dy = -r; dy <= r; dy += 2) {
            const w = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
            out += '<rect x="' + (cx - w) + '" y="' + (cy + dy) + '" width="' + (w * 2) + '" height="2" fill="' + fill + '"/>';
          }
          return out;
        };
        return rows(80, 60, 32, '#AA5500') + rows(80, 60, 27, '#FFFF55') +
          '<rect x="68" y="48" width="8" height="6" fill="#FFFFFF"/>';
      })() + '</svg>'
  },
  {
    id: 'sprout', name: 'THE FIRST SPROUT', price: 320,
    blurb: 'Two leaves and a promise.',
    svg: '<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">' +
      '<rect width="160" height="120" fill="#000000"/>' +
      '<rect x="76" y="34" width="8" height="58" fill="#55FF55"/>' +
      '<rect x="44" y="46" width="32" height="8" fill="#00AA00"/><rect x="52" y="38" width="24" height="8" fill="#55FF55"/>' +
      '<rect x="84" y="58" width="30" height="8" fill="#00AA00"/><rect x="84" y="50" width="22" height="8" fill="#55FF55"/>' +
      '<rect x="54" y="92" width="52" height="8" fill="#AA5500"/><rect x="58" y="100" width="44" height="8" fill="#AA5500"/>' +
      '<rect x="58" y="92" width="44" height="4" fill="#FF5555"/></svg>'
  },
  {
    id: 'hive', name: 'THE HOLLOW', price: 420,
    blurb: 'A cross-section of somewhere you should not dig.',
    svg: '<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">' +
      '<rect width="160" height="120" fill="#000000"/>' +
      [[80, 30], [58, 44], [102, 44], [36, 58], [80, 58], [124, 58], [58, 72], [102, 72], [80, 86]].map(p =>
        '<rect x="' + (p[0] - 16) + '" y="' + (p[1] - 8) + '" width="32" height="16" fill="#00AAAA"/>' +
        '<rect x="' + (p[0] - 12) + '" y="' + (p[1] - 11) + '" width="24" height="22" fill="#00AAAA"/>' +
        '<rect x="' + (p[0] - 12) + '" y="' + (p[1] - 5) + '" width="24" height="10" fill="#000000"/>' +
        '<rect x="' + (p[0] - 8) + '" y="' + (p[1] - 8) + '" width="16" height="16" fill="#000000"/>').join('') +
      '<rect x="72" y="52" width="16" height="12" fill="#55FFFF"/></svg>'
  },
  {
    id: 'card', name: 'THE ACE OF MID', price: 380,
    blurb: 'One lane. One card. No jungler.',
    svg: '<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">' +
      '<rect width="160" height="120" fill="#000000"/>' +
      '<rect x="52" y="14" width="56" height="92" fill="#FFFFFF"/><rect x="55" y="17" width="50" height="86" fill="#000000"/>' +
      '<rect x="74" y="34" width="12" height="52" fill="#FF5555"/><rect x="62" y="46" width="36" height="12" fill="#FF5555"/>' +
      '<rect x="66" y="76" width="28" height="8" fill="#AA0000"/>' +
      '<rect x="58" y="20" width="4" height="4" fill="#FF5555"/><rect x="98" y="96" width="4" height="4" fill="#FF5555"/></svg>'
  },
  {
    id: 'skull', name: 'MEMENTO MORI', price: 500,
    blurb: 'For the mornings when the machine is honest with you.',
    svg: '<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">' +
      '<rect width="160" height="120" fill="#000000"/>' +
      '<rect x="52" y="20" width="56" height="52" fill="#FFFFFF"/><rect x="44" y="30" width="72" height="34" fill="#FFFFFF"/>' +
      '<rect x="60" y="72" width="40" height="16" fill="#FFFFFF"/>' +
      '<rect x="58" y="38" width="16" height="16" fill="#000000"/><rect x="86" y="38" width="16" height="16" fill="#000000"/>' +
      '<rect x="74" y="56" width="12" height="10" fill="#000000"/>' +
      '<rect x="62" y="76" width="4" height="12" fill="#000000"/><rect x="78" y="76" width="4" height="12" fill="#000000"/>' +
      '<rect x="94" y="76" width="4" height="12" fill="#000000"/>' +
      '<rect x="58" y="42" width="6" height="6" fill="#FF5555"/><rect x="96" y="42" width="6" height="6" fill="#FF5555"/></svg>'
  }
,
  {
    id: 'ankh', name: 'THE ANKH', price: 340,
    blurb: 'A loop and a cross. What you carry out of the third temple.',
    svg: '<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">' +
      '<rect width="160" height="120" fill="#000000"/>' +
      '<rect x="56" y="12" width="48" height="12" fill="#55FFFF"/><rect x="56" y="52" width="48" height="12" fill="#55FFFF"/>' +
      '<rect x="56" y="12" width="12" height="52" fill="#55FFFF"/><rect x="92" y="12" width="12" height="52" fill="#55FFFF"/>' +
      '<rect x="68" y="56" width="36" height="8" fill="#00AAAA"/><rect x="96" y="20" width="8" height="40" fill="#00AAAA"/>' +
      '<rect x="74" y="64" width="12" height="46" fill="#55FFFF"/><rect x="80" y="64" width="6" height="46" fill="#00AAAA"/>' +
      '<rect x="44" y="66" width="72" height="12" fill="#55FFFF"/><rect x="44" y="74" width="72" height="4" fill="#00AAAA"/>' +
      '<rect x="64" y="20" width="4" height="4" fill="#FFFFFF"/><rect x="60" y="28" width="4" height="4" fill="#FFFFFF"/></svg>'
  },
  {
    id: 'elephant', name: 'THE ELEPHANT', price: 440,
    blurb: 'He looks at you the way he looks at everyone. As if you might be a peanut.',
    svg: '<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">' +
      '<rect width="160" height="120" fill="#000000"/>' +
      (function () {
        const rows = (cx, cy, rx, ry, fill) => {
          let out = '';
          for (let dy = -ry; dy <= ry; dy += 2) {
            const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - dy * dy / (ry * ry))));
            out += '<rect x="' + (cx - w) + '" y="' + (cy + dy) + '" width="' + (w * 2) + '" height="2" fill="' + fill + '"/>';
          }
          return out;
        };
        return rows(40, 54, 26, 38, '#555555') + rows(120, 54, 26, 38, '#555555') + rows(40, 54, 18, 28, '#AAAAAA') + rows(120, 54, 18, 28, '#AAAAAA') +
          rows(80, 56, 36, 38, '#AAAAAA') + rows(80, 40, 28, 22, '#FFFFFF');
      })() +
      '<rect x="64" y="44" width="10" height="10" fill="#000000"/><rect x="86" y="44" width="10" height="10" fill="#000000"/>' +
      '<rect x="66" y="46" width="3" height="3" fill="#FFFFFF"/><rect x="88" y="46" width="3" height="3" fill="#FFFFFF"/>' +
      '<rect x="72" y="62" width="16" height="14" fill="#AAAAAA"/><rect x="74" y="76" width="12" height="14" fill="#AAAAAA"/><rect x="76" y="90" width="10" height="12" fill="#AAAAAA"/>' +
      '<rect x="72" y="62" width="4" height="40" fill="#555555"/>' +
      '<rect x="60" y="76" width="8" height="12" fill="#FFFFFF"/><rect x="92" y="76" width="8" height="12" fill="#FFFFFF"/></svg>'
  },
  {
    id: 'pothead', name: 'THE POT', price: 360,
    blurb: 'It is load-bearing. It has always been load-bearing.',
    svg: '<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">' +
      '<rect width="160" height="120" fill="#000000"/>' +
      '<rect x="76" y="6" width="8" height="22" fill="#55FF55"/><rect x="52" y="14" width="26" height="8" fill="#00AA00"/><rect x="82" y="8" width="26" height="8" fill="#00AA00"/>' +
      '<rect x="46" y="28" width="68" height="10" fill="#FF5555"/><rect x="52" y="38" width="56" height="26" fill="#AA5500"/>' +
      '<rect x="52" y="38" width="8" height="26" fill="#FF5555"/><rect x="100" y="38" width="8" height="26" fill="#AA0000"/>' +
      '<rect x="58" y="64" width="44" height="40" fill="#FFFF55"/><rect x="58" y="64" width="44" height="6" fill="#FFFFFF"/>' +
      '<rect x="66" y="74" width="10" height="10" fill="#000000"/><rect x="86" y="74" width="10" height="10" fill="#000000"/>' +
      '<rect x="68" y="76" width="3" height="3" fill="#FFFFFF"/><rect x="88" y="76" width="3" height="3" fill="#FFFFFF"/>' +
      '<rect x="66" y="92" width="30" height="5" fill="#000000"/><rect x="70" y="94" width="22" height="6" fill="#AA0000"/></svg>'
  },
  {
    id: 'comet', name: 'THE COMET', price: 480,
    blurb: 'It comes round every seventy-six years. You were not ready last time either.',
    svg: '<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">' +
      '<rect width="160" height="120" fill="#000000"/>' +
      Array.from({ length: 12 }, (_, i) => '<rect x="' + (18 + i * 8) + '" y="' + (96 - i * 7) + '" width="' + (28 - i) + '" height="' + (8 + (i >> 1)) + '" fill="' + (i < 4 ? '#0000AA' : i < 8 ? '#00AAAA' : '#55FFFF') + '"/>').join('') +
      '<rect x="102" y="20" width="30" height="30" fill="#FFFF55"/><rect x="98" y="26" width="38" height="18" fill="#FFFF55"/><rect x="106" y="16" width="22" height="38" fill="#FFFF55"/>' +
      '<rect x="108" y="22" width="12" height="12" fill="#FFFFFF"/>' +
      '<rect x="20" y="16" width="3" height="3" fill="#FFFFFF"/><rect x="140" y="84" width="3" height="3" fill="#FFFFFF"/><rect x="36" y="64" width="3" height="3" fill="#AAAAAA"/><rect x="120" y="100" width="3" height="3" fill="#AAAAAA"/></svg>'
  }
];
export const CUR_ARROW = [
  'X...........',
  'XX..........',
  'XOX.........',
  'XOOX........',
  'XOOOX.......',
  'XOOOOX......',
  'XOOOOOX.....',
  'XOOOOOOX....',
  'XOOOOOOOX...',
  'XOOOOXXXX...',
  'XOOXXOX.....',
  'XOX..XOX....',
  'XX....XOX...',
  'X......XX...'
];

export const CUR_HANDMASK = [
  '...XX.......',
  '..XOOX......',
  '..XOOX......',
  '..XOOX......',
  '..XOOXXX....',
  '..XOOXOOXX..',
  '..XOOXOOXOX.',
  'XX.XOOOOOOOX',
  'XOX.XOOOOOOX',
  'XOOX.OOOOOOX',
  '.XOOOOOOOOOX',
  '..XOOOOOOOOX',
  '...XOOOOOOX.',
  '....XXXXXX..'
];
export const CUR_PINCER = [
  'XX........XX',
  'XOX......XOX',
  'XOOX....XOOX',
  '.XOOX..XOOX.',
  '.XOOOXXOOOX.',
  '..XOOOOOOX..',
  '..XOOOOOOX..',
  '...XOOOOX...',
  '...XOOOOX...',
  '....XOOX....',
  '....XOOX....',
  '.....XX.....'
];
export const CUR_BROOM = [
  'X...........',
  'XX..........',
  'XOX.........',
  '.XOX........',
  '..XOX.......',
  '...XOX......',
  '....XOX.....',
  '.....XOX....',
  '....XXOOXX..',
  '...XOOOOOOX.',
  '..XOXOXOXOX.',
  '..XOXOXOXOX.',
  '..XX.X.X.XX.',
  '............'
];
export const CUR_ANKH = [
  '...XXXXXX...',
  '..XOOOOOOX..',
  '.XOOXXXXOOX.',
  '.XOX....XOX.',
  '.XOX....XOX.',
  '.XOOX..XOOX.',
  '..XOOXXOOX..',
  '.XXXOOOOXXX.',
  'XOOOOOOOOOOX',
  'XXXXOOOOXXXX',
  '...XOOOOX...',
  '...XOOOOX...',
  '...XOOOOX...',
  '...XXXXXX...'
];
export const CUR_STAR = [
  '.....XX.....',
  '.....XX.....',
  '....XOOX....',
  '....XOOX....',
  'XXXXXOOXXXXX',
  'XOOOOOOOOOOX',
  '.XXOOOOOOXX.',
  '...XOOOOX...',
  '...XOOOOX...',
  '..XOOXXOOX..',
  '..XOX..XOX..',
  '.XOX....XOX.',
  '.XX......XX.',
  '............'
];
export const CURSORS = [

  { id: 'stock',  name: 'STOCK ARROW', price: 0,   blurb: 'Whatever your machine already had.', system: true },
  { id: 'bone',   name: 'BONE',        price: 90,  blurb: 'White. Sharp. Unkind.',            mask: CUR_ARROW, o: '#000000', f: '#FFFFFF' },
  { id: 'gold',   name: 'GOLD LEAF',   price: 140, blurb: 'The pointer of a man who has money and no taste.', mask: CUR_ARROW, o: '#AA5500', f: '#FFFF55' },
  { id: 'silk',   name: 'SILK THREAD', price: 140, blurb: 'Cold blue. Points at things politely.', mask: CUR_ARROW, o: '#0000AA', f: '#55FFFF' },
  { id: 'ember',  name: 'EMBER',       price: 190, blurb: 'Slightly too warm to hold.',         mask: CUR_ARROW, o: '#AA0000', f: '#FF5555' },
  { id: 'pincer', name: 'MANDIBLE',    price: 260, blurb: 'It closes when you click. It does not, but it looks like it does.', mask: CUR_PINCER, o: '#000000', f: '#FF5555', hx: 6, hy: 0 },
  { id: 'broom',  name: 'THE BROOM',   price: 340, blurb: 'PERKELE.',                            mask: CUR_BROOM, o: '#000000', f: '#FFFF55' },
  { id: 'jade',   name: 'JADE',        price: 150, blurb: 'Green and a little smug.',         mask: CUR_ARROW, o: '#000000', f: '#55FF55' },
  { id: 'plasma', name: 'PLASMA',      price: 190, blurb: 'It was a sign. Now it is a pointer.', mask: CUR_ARROW, o: '#AA00AA', f: '#FF55FF' },
  { id: 'ankh',   name: 'THE ANKH',    price: 380, blurb: 'Points at nothing. Means everything.', mask: CUR_ANKH, o: '#0000AA', f: '#55FFFF', hx: 5, hy: 1 },
  { id: 'laurel', name: 'LAUREL',      price: 0, earn: 'mastery_magen', secret: true, blurb: 'A white pointer with a gold edge. Every mitzvah in the star.', mask: CUR_ARROW, o: '#AA5500', f: '#FFFFFF' },
  { id: 'cupcur', name: 'THE CUP',     price: 0, earn: 'mastery_solitaire', secret: true, blurb: 'A pointer in gold, for winning every way Solitaire can be won.', mask: CUR_STAR, o: '#AA5500', f: '#FFFF55', hx: 5, hy: 0 },
  { id: 'hive',   name: 'HIVE',        price: 0, earn: 'mastery_sweeper', secret: true, blurb: 'A claw with a yellow glow. Every room, perfect or not.', mask: CUR_PINCER, o: '#000000', f: '#FFFF55' },
  { id: 'star',   name: 'FALLING STAR',price: 460, blurb: 'Make a wish. Click it. It is not that kind.', mask: CUR_STAR, o: '#AA5500', f: '#FFFF55', hx: 5, hy: 0 }
];
export const SCHEMES = [
  { id: 'vga',    name: 'VGA 16',       price: 0,   blurb: 'The palette the machine was built on.',
    v: { bg: '#000000', fg: '#FFFFFF', ok: '#55FF55', hi: '#FFFF55', err: '#FF5555', dim: '#AAAAAA', acc: '#55FFFF' } },
  { id: 'amber',  name: 'AMBER',        price: 110, blurb: 'One phosphor. Twelve hours. No headache.',
    v: { bg: '#120a00', fg: '#FFD060', ok: '#FFA000', hi: '#FFE9A0', err: '#FF6A2A', dim: '#AB7B26', acc: '#FFC040' } },
  { id: 'green',  name: 'P1 GREEN',     price: 110, blurb: 'The colour of every terminal your father used.',
    v: { bg: '#000a00', fg: '#B8FFB8', ok: '#33FF33', hi: '#DFFFCF', err: '#FF8080', dim: '#3D953D', acc: '#66FF99' } },
  { id: 'ice',    name: 'ICE',          price: 170, blurb: 'For rooms that are already cold.',
    v: { bg: '#02080f', fg: '#DDEEFF', ok: '#79D8FF', hi: '#FFFFFF', err: '#FF7B9C', dim: '#5E87A2', acc: '#B0E8FF' } },
  { id: 'oxblood',name: 'OXBLOOD',      price: 210, blurb: 'Read the errors first. There will be errors.',
    v: { bg: '#120404', fg: '#F0C8C8', ok: '#E06060', hi: '#FFD9A0', err: '#FF3030', dim: '#B07373', acc: '#FF9090' } },
  { id: 'paper',  name: 'PAPER',        price: 240, blurb: 'Black on white, like a document. Deeply wrong on a tube.',
    v: { bg: '#E8E2D4', fg: '#1A1A1A', ok: '#1A4A1A', hi: '#8B1A1A', err: '#B23A2A', dim: '#60594E', acc: '#4A2C3D' } },
  { id: 'uv',     name: 'ULTRAVIOLET',  price: 300, blurb: 'Everything here is slightly radioactive.',
    v: { bg: '#0a0016', fg: '#E8D0FF', ok: '#C060FF', hi: '#FFFF80', err: '#FF60C0', dim: '#9873BD', acc: '#A0A0FF' } },
  { id: 'cga',    name: 'TV GIRL',     price: 130, blurb: 'Hot pink and cyan on black. Played on a loop, in a bedroom, with the lights off.',
    v: { bg: '#000000', fg: '#55FFFF', ok: '#FF55FF', hi: '#FFFFFF', err: '#FF5555', dim: '#C455C4', acc: '#55FFFF' } },
  { id: 'sepia',  name: 'SEPIA',       price: 190, blurb: 'An old photograph of a terminal.',
    v: { bg: '#1c1208', fg: '#E8D3A8', ok: '#C8A060', hi: '#FFF0C8', err: '#D8602A', dim: '#A2865B', acc: '#D8B070' } },
  { id: 'mint',   name: 'MINT',        price: 220, blurb: 'Cool, and a little medicinal.',
    v: { bg: '#06150f', fg: '#D8FFEA', ok: '#55FFB0', hi: '#FFFFFF', err: '#FF8070', dim: '#4D9577', acc: '#80FFD0' } },
  { id: 'dusk',   name: 'DUSK',        price: 260, blurb: 'The hour after the sun goes and before the lights come on.',
    v: { bg: '#140a24', fg: '#F0D8FF', ok: '#FF9A5A', hi: '#FFE08A', err: '#FF5A8A', dim: '#A079B9', acc: '#FFB0A0' } },
  /* under the counter: Dave gives these for a game's mastery seal (`earn`), they are never for sale and show as ??? until they are yours */
  { id: 'ember',  name: 'BENCH EMBER',  price: 0, earn: 'mastery_cook', secret: true, blurb: 'Warm orange on a char-black bench. From the Cook, for finishing the Cook.',
    v: { bg: '#140800', fg: '#FFD9A8', ok: '#FF8A2A', hi: '#FFF0A0', err: '#FF4A2A', dim: '#B0743A', acc: '#FFB060' } },
  { id: 'harvest', name: 'HARVEST',     price: 0, earn: 'mastery_garden', secret: true, blurb: 'Soil, straw and a little light. Every plant, every pot.',
    v: { bg: '#0f0a04', fg: '#EAD9A0', ok: '#9ACD50', hi: '#FFE070', err: '#E0663A', dim: '#A08C50', acc: '#D8C060' } },
  { id: 'nile',   name: 'NILE AT DAWN', price: 0, earn: 'mastery_aftere', secret: true, blurb: 'Blue water and gold sand, from the five ways across.',
    v: { bg: '#031422', fg: '#F6E7B0', ok: '#5CC8E8', hi: '#FFF4C8', err: '#FF7A5A', dim: '#5E9AB0', acc: '#8FE0F0' } },
  { id: 'valley', name: 'VALLEY MORNING', price: 0, earn: 'mastery_bekkedal', secret: true, blurb: 'Fjord blue and barn red. Everything in Bekkedal, done.',
    v: { bg: '#07121a', fg: '#E6EEF2', ok: '#7CC070', hi: '#FFFFF0', err: '#E8604A', dim: '#7A94A6', acc: '#9CC8E0' } },
  { id: 'signal', name: 'SIGNAL RED',   price: 0, earn: 'mastery_standbattle', secret: true, blurb: 'A stand\'s worth of red on black. Every fight won.',
    v: { bg: '#100303', fg: '#FFE0E0', ok: '#FF6A6A', hi: '#FFFFFF', err: '#FF2A2A', dim: '#C07878', acc: '#FF9A9A' } }
];
/* buff is a set of multipliers the equipped pot lends to every plant in the
   garden: grow speeds up how fast a plant reaches its next stage, yield
   scales the SUN paid per token, water stretches how long a watering lasts
   before the soil dries out. terra is the free, unbuffed starter; every pot
   after it costs a great deal more and is a straightforward upgrade over
   the one before, never a sidegrade. */
export const POTS = [
  { id: 'terra', name: 'TERRACOTTA POT', price: 0,
    blurb: 'Fired clay. Slightly chipped. No buff -- what a garden starts with.',
    c: ['#a35a34', '#c4784c', '#7a3d20'], buff: { grow: 1, yield: 1, water: 1 } },
  { id: 'glaze', name: 'GLAZED BLUE POT',price: 450,
    blurb: 'Kiln-fired glaze holds the day’s heat. +15% growth speed.',
    c: ['#2f5f86', '#4a86b8', '#1e3f5c'], buff: { grow: 1.15, yield: 1, water: 1 } },
  { id: 'iron',  name: 'IRON POT',       price: 900,
    blurb: 'Heavy. Cold. Will outlive the plant. +15% growth, +20% SUN per token.',
    c: ['#4a4a52', '#6b6b76', '#2c2c33'], buff: { grow: 1.15, yield: 1.2, water: 1 } },
  { id: 'bone',  name: 'BONE POT',       price: 1500,
    blurb: 'Not bone. Looks like bone. +25% growth, +30% SUN, holds water 25% longer.',
    c: ['#cfc4a8', '#e8e0c8', '#9a8f74'], buff: { grow: 1.25, yield: 1.3, water: 1.25 } },
  { id: 'stump', name: 'HOLLOW STUMP',   price: 2400,
    blurb: 'A pot in the sense that it holds soil. +40% growth, +50% SUN, holds water 50% longer.',
    c: ['#5c3d22', '#7a5230', '#3a2614'], buff: { grow: 1.4, yield: 1.5, water: 1.5 } },
  { id: 'gild',  name: 'GILDED URN',     price: 4200,
    blurb: 'Gold leaf over something that was once a bucket. +50% growth, +65% SUN, holds water 70% longer.',
    c: ['#b8860b', '#e8c247', '#7a5a06'], buff: { grow: 1.5, yield: 1.65, water: 1.7 } },
  { id: 'halo',  name: 'HALO BOWL',      price: 8000,
    blurb: 'A bowl with a ring of light around the rim that nobody will explain. +60% growth, +90% SUN, holds water twice as long.',
    c: ['#8fd4e8', '#d8f6ff', '#4a8aa0'], buff: { grow: 1.6, yield: 1.9, water: 2 } }
];
export const SPECIES = [
  { id: 'sunshoot', name: 'SUNSHOOT',  price: 0,   yield: 2,  grow: 40,  drop: 55, note: 0, hue: ['#c8d84a', '#8fae2c', '#e8f07a'], home: 'yard', kin: 'terra', mate: 'bellvine',
    blurb: 'Grows anywhere. Pays a little. Never complains.' },
  { id: 'mosscap',  name: 'MOSSCAP',   price: 120, yield: 3,  grow: 55,  drop: 62, note: 1, hue: ['#6f9a4a', '#4a6e2d', '#9dc46a'], home: 'cellar', kin: 'stump', mate: 'nightpea',
    blurb: 'A mushroom with opinions about damp.' },
  { id: 'bellvine', name: 'BELLVINE',  price: 240, yield: 5,  grow: 80,  drop: 70, note: 2, hue: ['#7ab8a0', '#3f7a66', '#a8e0cc'], home: 'greenhouse', kin: 'glaze', mate: 'sunshoot',
    blurb: 'Rings when poked. Rings when not poked, quieter.' },
  { id: 'embercup', name: 'EMBERCUP',  price: 420, yield: 7,  grow: 110, drop: 78, note: 3, hue: ['#d1683a', '#9a3f1e', '#f2a06a'], home: 'greenhouse', kin: 'iron', mate: 'ironbud',
    blurb: 'Warm to the touch. Do not water with anything flammable.' },
  { id: 'glassreed',name: 'GLASSREED', price: 640, yield: 10, grow: 150, drop: 86, note: 4, hue: ['#9ac6d8', '#5a8ea6', '#d4eef8'], home: 'rooftop', kin: 'glaze', mate: 'halofern',
    blurb: 'Hollow. Sings in a draught. Snaps if you look at it.' },
  { id: 'nightpea', name: 'NIGHTPEA',  price: 900, yield: 18, grow: 170, drop: 92, note: 5, hue: ['#7a6ab8', '#4a3d80', '#b0a0e8'], home: 'cellar', kin: 'bone', mate: 'mosscap', night: true,
    blurb: 'Pays nothing in daylight. Pays properly after dark.' },
  { id: 'ironbud',  name: 'IRONBUD',   price: 1300,yield: 20, grow: 240, drop: 110, note: 6, hue: ['#8a8f96', '#5c6067', '#c4c9d0'], home: 'rooftop', kin: 'iron', mate: 'embercup',
    blurb: 'Takes an age. Worth the age.' },
  { id: 'halofern', name: 'HALOFERN',  price: 2000,yield: 34, grow: 320, drop: 130, note: 7, hue: ['#e8d86a', '#b0a03a', '#fff4b0'], home: 'shrine', kin: 'bone', mate: 'glassreed',
    blurb: 'Glows faintly. The garden gets quieter around it.' },
  { id: 'starmoss', name: 'STARMOSS',  price: 3600, yield: 45,  grow: 380, drop: 150, note: 3, hue: ['#6a8ad8', '#3a4f9a', '#a8c0ff'], night: true, home: 'cellar', kin: 'gild', mate: 'suncrown',
    blurb: 'Collects light all day and spends it in the dark. Loves a cellar and gold.' },
  { id: 'suncrown', name: 'SUNCROWN',  price: 6500, yield: 58,  grow: 460, drop: 170, note: 6, hue: ['#f0b23a', '#b87810', '#ffe08a'], home: 'rooftop', kin: 'gild', mate: 'starmoss',
    blurb: 'Faces the sky and does not look away. Wants the roof, wants gold, wants a star beside it.' },
  { id: 'thirdroot', name: 'THIRDROOT', price: 11000, yield: 84,  grow: 600, drop: 210, note: 7, hue: ['#f4e9a8', '#c9a227', '#ffffff'], home: 'shrine', kin: 'halo', mate: 'halofern',
    blurb: 'What the third temple was built on. Slow past all reason. It is not a joke.' }
];

export const DECO_SVG = {
  vents: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 84 12" shape-rendering="crispEdges">' +
    Array.from({ length: 12 }, (_, i) =>
      '<rect x="' + (i * 7) + '" y="2" width="4" height="8" fill="rgba(0,0,0,0.22)"/>' +
      '<rect x="' + (i * 7) + '" y="1" width="4" height="1" fill="rgba(255,255,255,0.3)"/>').join('') +
    '</svg>',
  grain: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 20">' +
    '<path d="M0 10 Q30 3 60 10 T120 9" stroke="rgba(0,0,0,0.28)" stroke-width="2" fill="none"/>' +
    '<path d="M0 15 Q40 9 70 16 T120 14" stroke="rgba(255,220,170,0.18)" stroke-width="1" fill="none"/>' +
    '</svg>',
  danger: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 104 26" shape-rendering="crispEdges">' +
    '<rect width="104" height="26" fill="#b0201a"/><rect x="2" y="2" width="100" height="22" fill="none" stroke="#ffffff" stroke-width="1.5"/>' +
    '<text x="52" y="12" font-family="monospace" font-size="8" fill="#ffffff" text-anchor="middle">HIGH VOLTAGE INSIDE</text>' +
    '<text x="52" y="21" font-family="monospace" font-size="7" fill="#ffdddd" text-anchor="middle">NO USER PARTS. NO USERS.</text></svg>',
  readout: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 118 24" shape-rendering="crispEdges">' +
    '<rect width="118" height="24" fill="#0d1a15" stroke="#8f9a96" stroke-width="1.5"/>' +
    '<text x="6" y="16" font-family="monospace" font-size="11" fill="#5cffc0">SR 072  NORMAL</text></svg>',
  strain: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 46">' +
    '<path d="M20 46 C20 30 8 30 8 14" stroke="#7d8683" stroke-width="6" fill="none" stroke-linecap="round"/>' +
    '<path d="M20 46 C20 32 30 30 30 18" stroke="#96a09c" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<rect x="4" y="8" width="9" height="8" rx="2" fill="#5f6764"/><rect x="26" y="12" width="9" height="8" rx="2" fill="#5f6764"/></svg>',
  crack: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" preserveAspectRatio="none">' +
    '<path d="M200 6 L172 26 L178 40 L150 56 L156 70 L128 92" stroke="rgba(40,34,26,0.85)" stroke-width="1.6" fill="none"/>' +
    '<path d="M172 26 L182 18 M150 56 L162 52 M156 70 L146 78" stroke="rgba(40,34,26,0.6)" stroke-width="1.2" fill="none"/>' +
    '<path d="M200 6 L172 26 L178 40 L150 56" stroke="rgba(255,255,255,0.35)" stroke-width="0.7" fill="none" transform="translate(1,1)"/></svg>',
  crown: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 30" shape-rendering="crispEdges">' +
    '<rect x="72" y="0" width="6" height="14" fill="#fff6c2"/><rect x="66" y="4" width="18" height="5" fill="#fff6c2"/>' +
    '<rect x="30" y="16" width="90" height="4" fill="#fff6c2"/><rect x="40" y="20" width="70" height="3" fill="#8a5f06"/>' +
    '</svg>',
  marquee: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 20" shape-rendering="crispEdges">' +
    '<rect width="170" height="20" fill="#120a30"/><rect x="1" y="1" width="168" height="18" fill="none" stroke="#ff7ad9" stroke-width="2"/>' +
    Array.from({ length: 14 }, (_, i) => '<rect x="' + (6 + i * 12) + '" y="2" width="3" height="3" fill="' + (i % 2 ? '#ffff55' : '#ffffff') + '"/><rect x="' + (6 + i * 12) + '" y="15" width="3" height="3" fill="' + (i % 2 ? '#ffffff' : '#ffff55') + '"/>').join('') +
    '<text x="85" y="14" font-family="monospace" font-size="10" fill="#55ffff" text-anchor="middle">INSERT COIN</text></svg>',
  dims: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 22" shape-rendering="crispEdges">' +
    '<rect x="0" y="9" width="120" height="1" fill="#e8f2ff"/><rect x="0" y="4" width="1" height="11" fill="#e8f2ff"/><rect x="119" y="4" width="1" height="11" fill="#e8f2ff"/>' +
    '<rect x="14" y="2" width="92" height="14" fill="#1d4a9a"/>' +
    '<text x="60" y="13" font-family="monospace" font-size="9" fill="#e8f2ff" text-anchor="middle">640 x 480 mm</text></svg>',
  ...DECO_NEW
};

/* ---- Dave's other shelves ------------------------------------------------------------------------------------------------
   Everything above is something you put on the machine. These are things you give to an app that is already on it: a
   picture for the desktop, a brush, a layer, a pack of instruments, a different bottle, something for the elephant to wear.
   Each list is { id, name, price, blurb }; `Cos.has(cat, id)` is how the app finds out it has been bought, and `COS_CATS[cat].app`
   (kernel/cos.js) is which app to open from the shop. Adding to a list is all it takes to put a new thing on a shelf. */

/* BACKDROPS: the pictures of the blackout, pressed to the sixteen colours (assets/blackout/). Each one is on this shelf only once
   a blackout has dealt it (kernel/backdrops.js: `Cos.shelf` hides the rest, `Cos.buy` refuses them). Buying one writes it into
   ::/Home/Backdrops as a real picture too, so the viewer and a folder can set it as the background as well. */
export const WALLS = [
  { id: 'city',      name: 'SNOWY BRIDGE', price: 300, src: 'assets/blackout/city.png',      blurb: 'A bridge in a city, in the snow. Nobody is on it.' },
  { id: 'park',      name: 'THE BENCH',    price: 300, src: 'assets/blackout/park.png',      blurb: 'Chickens, on a park bench. They have been there a while.' },
  { id: 'cd',        name: 'THE HEAP',     price: 350, src: 'assets/blackout/cd.png',        blurb: 'Every disc you ever burned, in one pile.' },
  { id: 'turtle',    name: 'LITTLE ONE',   price: 350, src: 'assets/blackout/turtle.png',    blurb: 'A baby turtle. It has somewhere to be.' },
  { id: 'boulder',   name: 'THE PROBLEM',  price: 450, src: 'assets/blackout/boulder.png',   blurb: 'A wall, a handhold, and a Saturday.' },
  { id: 'ultrakill', name: 'THE CORRIDOR', price: 450, src: 'assets/blackout/ultrakill.png', blurb: 'Stone, blood, and a long way down.' },
  { id: 'lol',       name: 'THE MATCH',    price: 500, src: 'assets/blackout/lol.png',       blurb: 'Nineteen minutes in. Somebody should have backed.' },
  { id: 'posers', name: 'THE FIVE POSERS', price: 400, src: 'assets/blackout/posers.png', blurb: 'Five men, one yellow square, and a pose they have held since the first book.' },
  { id: 'penguin', name: 'THE PENGUIN', price: 350, src: 'assets/blackout/penguin.png', blurb: 'A penguin in a leather jacket, pointing straight at you. He knows.' },
  { id: 'shard', name: 'THE SHARD SITTER', price: 450, src: 'assets/blackout/shard.png', blurb: 'Someone sitting in a room full of broken glass, very calm about it.' },
  { id: 'stargazing', name: 'STARGAZING', price: 400, src: 'assets/blackout/stargazing.png', blurb: 'A girl in the grass, looking up. The grass is not sure about this.' },
  { id: 'lake', name: 'THE FROZEN LAKE', price: 350, src: 'assets/blackout/lake.png', blurb: 'A lake under the snow. Nobody has skated on it yet. Nobody will.' },
  { id: 'mosaic', name: 'THE SKULL MOSAIC', price: 450, src: 'assets/blackout/mosaic.png', blurb: 'Pink and blue, and a great many skulls in a pattern that means nothing good.' },
  { id: 'bedroom', name: 'THE NEON BEDROOM', price: 400, src: 'assets/blackout/bedroom.png', blurb: 'A bedroom with a television, a bed and a lot of purple. The television is on.' },
  { id: 'stairs', name: 'THE STAIRS', price: 350, src: 'assets/blackout/stairs.png', blurb: 'A long flight of stairs, and a girl at the bottom who has decided not to.' },
  { id: 'lawn', name: 'THE LAWN WAR', price: 500, src: 'assets/blackout/lawn.png', blurb: 'Sunflowers against zombies, on a lawn that will never be finished.' },
  { id: 'hill', name: 'THE HILL', price: 450, src: 'assets/blackout/hill.png', blurb: 'A bear and a child on a hill at sunset. The bear has a hat and no plans.' },
  { id: 'temple', name: 'THE THIRD TEMPLE', price: 500, src: 'assets/blackout/temple.png', blurb: 'Ninety-three percent of the third temple, and one small figure at the bottom of it.' },
  { id: 'poster', name: 'THE BOOK AND THE MASK', price: 450, src: 'assets/blackout/poster.png', blurb: 'Two men in the dark, one with a book and one with a mask. Neither is smiling.' },
  { id: 'glitter', name: 'THE GLITTER GIRL', price: 400, src: 'assets/blackout/glitter.png', blurb: 'Purple hair, a long dress and a great deal of static. The static is on purpose.' },
  { id: 'chaos', name: 'WHY IS THE WORLD IN CHAOS', price: 300, src: 'assets/blackout/chaos.png', blurb: 'A question, and a man who knows the answer. He has not said it yet.' },
  { id: 'meow', name: 'THE MEOW NIGHT', price: 350, src: 'assets/blackout/meow.png', blurb: 'Something in a hood, in a green night, asking whether that was a meow.' },
  { id: 'grin', name: 'THE GRIN', price: 300, src: 'assets/blackout/grin.png', blurb: 'The face everybody knows the meaning of, and nobody will explain.' },
  { id: 'boot', name: 'THE RED BOOT', price: 450, src: 'assets/blackout/boot.png', blurb: 'A red boot with a point you could hang a coat on. Dave has seen worse.' },
  { id: 'halo', name: 'THE HALO ANGEL', price: 500, src: 'assets/blackout/halo.png', blurb: 'An angel in black and white, and a halo that is not doing its job.' },
  { id: 'aurora', name: 'THE NORTHERN LIGHTS', price: 450, src: 'assets/blackout/aurora.png', blurb: 'A village road under green lights. The snow is the only thing keeping its temper.' },
  { id: 'axe', name: 'THE AXE', price: 400, src: 'assets/blackout/axe.png', blurb: 'An axe with a worn handle and a blade that has done real work. Mind the edge.' },
  { id: 'pond', name: 'THE ICE POND', price: 400, src: 'assets/blackout/pond.png', blurb: 'A boy crouched by a frozen pond with a stick, waiting for the ice to say something.' },
  { id: 'monitor', name: 'THE NEW MONITOR', price: 450, src: 'assets/blackout/monitor.png', blurb: 'A man in a blue shirt, a carpet and a very large screen he is very proud of. It is not on.' },
  { id: 'tictac', name: 'THE MINT', price: 400, src: 'assets/blackout/tictac.png', blurb: 'A man with wild hair holds up a box of mints as though it were evidence. It is a box of mints.' },
  { id: 'phone', name: 'THE CALL', price: 350, src: 'assets/blackout/phone.png', blurb: 'A white cap on backwards, a phone at the ear, and the face of somebody whose call is not going well.' },
  { id: 'crest', name: 'THE SWORD AND THE SCALES', price: 500, src: 'assets/blackout/crest.png', blurb: 'A sword, a pair of scales and the machine\'s own name in yellow letters. The scales are not level.' },
  { id: 'domnule', name: 'THE BOW TIE', price: 400, src: 'assets/blackout/domnule.png', blurb: 'A navy jacket, a bow tie, one finger pointed at you, and a sentence that begins with Sir and does not stop.' },
  { id: 'kitten', name: 'THE BITE', price: 450, src: 'assets/blackout/kitten.png', blurb: 'A boy, a black and white kitten, and an ear in the wrong place. Neither of them planned this and both are delighted.' },
  { id: 'bear', name: 'THE TALL BEAR', price: 500, src: 'assets/blackout/bear.png', blurb: 'A girl beside a bear that is taller than the house, in a shirt that says boutique. The bear is not for sale.' },
  { id: 'labcoat', name: 'THE LAB COAT', price: 400, src: 'assets/blackout/labcoat.png', blurb: 'A white coat with writing on it, arms wide, two tall doors behind. Sepia, for the occasion.' }
];

/* CRAYON: eight more brushes, and the clear sheets it can draw on over the drawing */
export const CRAYON = [
  { id: 'chalk',    kind: 'brush', name: 'CHALK',          price: 220, blurb: 'Dry and broken. The paper shows through every stroke.' },
  { id: 'charcoal', kind: 'brush', name: 'CHARCOAL',       price: 260, blurb: 'It smudges. Dark where you press, grey where you hurry.' },
  { id: 'ink',      kind: 'brush', name: 'INK PEN',        price: 300, blurb: 'A nib: thick on the downstroke, a hair across.' },
  { id: 'stars',    kind: 'brush', name: 'STAR STAMP',     price: 320, blurb: 'Stars, scattered as you drag.' },
  { id: 'wash',     kind: 'brush', name: 'WATERCOLOUR',    price: 360, blurb: 'Wet washes that pool dark at their edges.' },
  { id: 'bristle',  kind: 'brush', name: 'PAINT BRUSH',    price: 400, blurb: 'A dozen hairs, each with its own idea.' },
  { id: 'rainbow',  kind: 'brush', name: 'RAINBOW WAX',    price: 500, blurb: 'The colour turns as you draw.' },
  { id: 'neon',     kind: 'brush', name: 'NEON TUBE',      price: 640, blurb: 'A glow on the paper. It is cheating, and it is pretty.' },
  { id: 'layer2',   kind: 'layer', name: 'LAYER 2',        price: 400,  blurb: 'A clear sheet over the drawing. Draw on it, hide it, clear it, fold it down.' },
  { id: 'layer3',   kind: 'layer', name: 'LAYER 3',        price: 900,  blurb: 'A third sheet. Backgrounds behind, faces in front.' },
  { id: 'layer4',   kind: 'layer', name: 'LAYER 4',        price: 1800, blurb: 'Four sheets. Now it is a method.' },
  { id: 'layer5',   kind: 'layer', name: 'LAYER 5',        price: 3200, blurb: 'Five. Nobody needs five. You will use all five.' }
];

/* GARAGE: instruments, in packs. `inst` are ids in assets/instruments/index.json that the Garage's picker lists once the pack is yours. */
export const GARAGE = [
  { id: 'folk',      name: 'THE FOLK PACK',      price: 320, inst: ['accordion', 'harmonica', 'banjo'],
    blurb: 'Accordion, harmonica, banjo. Three instruments that have been to a wedding.' },
  { id: 'dream',     name: 'THE DREAM PACK',     price: 500, inst: ['celesta', 'voiceoohs', 'tinklebell'],
    blurb: 'Celesta, a choir that only says oo, and a very small bell. For the part of the song where it snows.' },
  { id: 'world',     name: 'THE WORLD PACK',     price: 420, inst: ['sitar', 'koto', 'panflute', 'shamisen'],
    blurb: 'Sitar, koto, pan flute, shamisen. Four ways of plucking and blowing you did not grow up with.' },
  { id: 'orchestra', name: 'THE ORCHESTRA PACK', price: 650, inst: ['viola', 'oboe', 'frenchhorn', 'trombone', 'tuba'],
    blurb: 'Viola, oboe, horn, trombone and tuba. The rest of the pit.' },
  { id: 'electric',  name: 'THE ELECTRIC PACK',  price: 700, inst: ['synthlead', 'synthpad', 'synthbass', 'distgtr'],
    blurb: 'A saw lead, a warm pad, a synth bass and a guitar turned up past sensible.' }
];

/* DRINKS: other bottles for THE BOTTLE. `strength` is how much one measure counts against the limit, with Jägermeister (35%) as one.
   glass / liquor / label are the three colours the bottle is built from (apps/bottle/drinks.js makes the rest from them). */
export const DRINKS = [
  { id: 'jager',    name: 'JÄGERMEISTER',     price: 0,   abv: 35, strength: 1,    glass: '#1f5a28', liquor: '#d98a32', label: '#f08a14', blurb: 'Fifty-six herbs and a stag. The bottle it came with.' },
  { id: 'cordial',  name: 'HOLUNDER CORDIAL', price: 80,  abv: 0,  strength: 0,    glass: '#cfe3d0', liquor: '#f2eaa0', label: '#ffffff', blurb: 'Elderflower. Nothing in it at all. For when you want the bottle and not the floor.' },
  { id: 'mead',     name: 'MJØD',             price: 140, abv: 14, strength: 0.4,  glass: '#8a5a14', liquor: '#e0a020', label: '#f0e0b0', blurb: 'Honey wine. Sweet, slow, and gentler than it tastes.' },
  { id: 'blaabaer', name: 'BLÅBÆR',           price: 180, abv: 20, strength: 0.57, glass: '#3a1f6a', liquor: '#7a48c8', label: '#d8c8f0', blurb: 'A blueberry liqueur the colour of a bruise on a good day.' },
  { id: 'aquavit',  name: 'LINIE AKVAVIT',    price: 220, abv: 40, strength: 1.14, glass: '#7fb7c4', liquor: '#e8dca0', label: '#f2efe4', blurb: 'Caraway, and a year in a barrel on a boat. It crossed the equator for you.' },
  { id: 'sambuca',  name: 'SAMBUCA',          price: 260, abv: 38, strength: 1.09, glass: '#d8e6ee', liquor: '#e4f2f8', label: '#202020', blurb: 'Aniseed. Clear as water, and nothing like it.' },
  { id: 'fernet',   name: 'FERNET',           price: 300, abv: 39, strength: 1.11, glass: '#2a1a12', liquor: '#1a0e08', label: '#c9a227', blurb: 'Bitter, black, medicinal. You will say you like it.' },
  { id: 'rum',      name: 'DARK RUM',         price: 340, abv: 40, strength: 1.14, glass: '#5a1c14', liquor: '#b0602c', label: '#e8d8a8', blurb: 'Molasses and a skull on the label, which is honest of it.' },
  { id: 'absinthe', name: 'ABSINTHE',         price: 700, abv: 68, strength: 1.94, glass: '#2f7a3a', liquor: '#8fdc50', label: '#101010', blurb: 'Sixty-eight per cent. The green fairy. Two measures and you are in the next stage.' }
];

/* ELEPHANT: something to wear (one of each slot at a time), and the one thing that lets him out of the window */
export const ELEPHANT = [
  { id: 'partyhat', slot: 'head', name: 'PARTY HAT',        price: 150, blurb: 'A cone on a rubber band. He wears it with dignity.' },
  { id: 'tophat',   slot: 'head', name: 'TOP HAT',          price: 300, blurb: 'Black silk, a red band, and a very large head to put it on.' },
  { id: 'wizard',   slot: 'head', name: 'WIZARD HAT',       price: 550, blurb: 'Blue, starred, a little bent. It knows things.' },
  { id: 'crown',    slot: 'head', name: 'THE CROWN',        price: 900, blurb: 'Gold and four points. He has always been the king of something.' },
  { id: 'glasses',  slot: 'face', name: 'ROUND GLASSES',    price: 220, blurb: 'Two circles of wire. He looks like he has read it.' },
  { id: 'shades',   slot: 'face', name: 'SHADES',           price: 300, blurb: 'Black, flat, and unbothered.' },
  { id: 'monocle',  slot: 'face', name: 'MONOCLE',          price: 350, blurb: 'One lens, one eyebrow, one chain.' },
  { id: 'bowtie',   slot: 'neck', name: 'BOW TIE',          price: 180, blurb: 'Red. Clipped to the root of the trunk. It is secure.' },
  { id: 'scarf',    slot: 'neck', name: 'STRIPED SCARF',    price: 260, blurb: 'Knitted by somebody who loved him, and miscounted.' },
  { id: 'blanket',  slot: 'body', name: 'RIDING BLANKET',   price: 400, blurb: 'Red and gold, with tassels. For the procession.' },
  { id: 'cape',     slot: 'body', name: 'THE CAPE',         price: 650, blurb: 'Purple, with a white collar. It does not make him fly.' },
  { id: 'boots',    slot: 'feet', name: 'RED BOOTS',        price: 320, blurb: 'Four of them. He had them made.' },
  { id: 'pet',      slot: 'free', name: 'FREE RANGE',       price: 2500, blurb: 'Let him out of the window. He will walk about the desktop, lie down and sleep, say things, and move your icons when he thinks they are in the way.' }
];

/* what Dave does not sell (kernel/cos_rewards.js): on the same shelves, after everything that is for sale */
FRAMES.push(...FRAMES_R, ...FRAMES_M); LOGOS.push(...LOGOS_R, ...LOGOS_M); CURSORS.push(...CURSORS_R, ...cursorsM(CUR_ARROW)); SCHEMES.push(...SCHEMES_R, ...SCHEMES_M); ELEPHANT.push(...ELEPHANT_R, ...ELEPHANT_M);
Object.assign(DECO_SVG, DECO_M);                                /* the little plates on the second stock's frames (kernel/cos_more_frames.js) */
/* DRINKS: what the four on the credits screen give (not on the shelf until given: kernel/gifts.js), then what a trophy gives, after everything for sale */
DRINKS.push(...DRINKS_G, ...DRINKS_R, ...DRINKS_M);
SPECIES.push(...SPECIES_G);                                     /* and Biscu's flower, which is not on the shelf until it is given */
const unsold = a => (a.reward || a.earn || a.gift) ? 1 : 0;
[FRAMES, LOGOS, CURSORS, SCHEMES, WALLS].forEach(l => l.sort((a, b) => unsold(a) - unsold(b) || a.price - b.price));
/* the items that are for sale: a count of "everything Dave has" never includes what only a trophy can give */
export const forSale = list => list.filter(it => !it.reward && !it.earn && !it.gift);

/* Solitaire's trophies each give one thing for the table (apps/solitaire/cosmetics.js): earned, never bought */
import { ITEMS as SOL_ITEMS } from '../apps/solitaire/cosmetics.js';
export const SOLITAIRE = SOL_ITEMS.map(i => ({ id: i.id, sub: i.sub, name: i.name, blurb: i.blurb, earn: i.earn, price: 0 }));
