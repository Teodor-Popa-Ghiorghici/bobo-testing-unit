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
      { svg: 'screws', pos: 'left 0px top 0px', size: '100% 100%' },
      { svg: 'danger', pos: 'left 2.5% bottom 3%', size: '104px 26px' }
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
      { svg: 'readout', pos: 'left 2.5% bottom 3%', size: '118px 24px' },
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
      { svg: 'moss', pos: 'left 0 top 0', size: '100% 100%' },
      { svg: 'vine', pos: 'right 0 top 0', size: '120px 100%' }
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
      { svg: 'tape', pos: 'left 4% top 2%', size: '96px 46px' }
    ]
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
export const CURSORS = [

  { id: 'stock',  name: 'STOCK ARROW', price: 0,   blurb: 'Whatever your machine already had.', system: true },
  { id: 'bone',   name: 'BONE',        price: 90,  blurb: 'White. Sharp. Unkind.',            mask: CUR_ARROW, o: '#000000', f: '#FFFFFF' },
  { id: 'gold',   name: 'GOLD LEAF',   price: 140, blurb: 'The pointer of a man who has money and no taste.', mask: CUR_ARROW, o: '#AA5500', f: '#FFFF55' },
  { id: 'silk',   name: 'SILK THREAD', price: 140, blurb: 'Cold blue. Points at things politely.', mask: CUR_ARROW, o: '#0000AA', f: '#55FFFF' },
  { id: 'ember',  name: 'EMBER',       price: 190, blurb: 'Slightly too warm to hold.',         mask: CUR_ARROW, o: '#AA0000', f: '#FF5555' },
  { id: 'pincer', name: 'MANDIBLE',    price: 260, blurb: 'It closes when you click. It does not, but it looks like it does.', mask: CUR_PINCER, o: '#000000', f: '#FF5555', hx: 6, hy: 0 },
  { id: 'broom',  name: 'THE BROOM',   price: 340, blurb: 'PERKELE.',                            mask: CUR_BROOM, o: '#000000', f: '#FFFF55' }
];
export const SCHEMES = [
  { id: 'vga',    name: 'VGA 16',       price: 0,   blurb: 'The palette the machine was built on.',
    v: { bg: '#000000', fg: '#FFFFFF', ok: '#55FF55', hi: '#FFFF55', err: '#FF5555', dim: '#AAAAAA', acc: '#55FFFF' } },
  { id: 'amber',  name: 'AMBER',        price: 110, blurb: 'One phosphor. Twelve hours. No headache.',
    v: { bg: '#120a00', fg: '#FFD060', ok: '#FFA000', hi: '#FFE9A0', err: '#FF6A2A', dim: '#8A5A10', acc: '#FFC040' } },
  { id: 'green',  name: 'P1 GREEN',     price: 110, blurb: 'The colour of every terminal your father used.',
    v: { bg: '#000a00', fg: '#B8FFB8', ok: '#33FF33', hi: '#DFFFCF', err: '#FF8080', dim: '#1E7A1E', acc: '#66FF99' } },
  { id: 'ice',    name: 'ICE',          price: 170, blurb: 'For rooms that are already cold.',
    v: { bg: '#02080f', fg: '#DDEEFF', ok: '#79D8FF', hi: '#FFFFFF', err: '#FF7B9C', dim: '#3A6A88', acc: '#B0E8FF' } },
  { id: 'oxblood',name: 'OXBLOOD',      price: 210, blurb: 'Read the errors first. There will be errors.',
    v: { bg: '#120404', fg: '#F0C8C8', ok: '#E06060', hi: '#FFD9A0', err: '#FF3030', dim: '#7A2A2A', acc: '#FF9090' } },
  { id: 'paper',  name: 'PAPER',        price: 240, blurb: 'Black on white, like a document. Deeply wrong on a tube.',
    v: { bg: '#E8E2D4', fg: '#1A1A1A', ok: '#1A4A1A', hi: '#8B1A1A', err: '#B23A2A', dim: '#6B6357', acc: '#4A2C3D' } },
  { id: 'uv',     name: 'ULTRAVIOLET',  price: 300, blurb: 'Everything here is slightly radioactive.',
    v: { bg: '#0a0016', fg: '#E8D0FF', ok: '#C060FF', hi: '#FFFF80', err: '#FF60C0', dim: '#5A2A8A', acc: '#A0A0FF' } }
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
    c: ['#5c3d22', '#7a5230', '#3a2614'], buff: { grow: 1.4, yield: 1.5, water: 1.5 } }
];
export const SPECIES = [
  { id: 'sunshoot', name: 'SUNSHOOT',  price: 0,   yield: 2,  grow: 40,  drop: 55, note: 0, hue: ['#c8d84a', '#8fae2c', '#e8f07a'],
    blurb: 'Grows anywhere. Pays a little. Never complains.' },
  { id: 'mosscap',  name: 'MOSSCAP',   price: 120, yield: 3,  grow: 55,  drop: 62, note: 1, hue: ['#6f9a4a', '#4a6e2d', '#9dc46a'],
    blurb: 'A mushroom with opinions about damp.' },
  { id: 'bellvine', name: 'BELLVINE',  price: 240, yield: 5,  grow: 80,  drop: 70, note: 2, hue: ['#7ab8a0', '#3f7a66', '#a8e0cc'],
    blurb: 'Rings when poked. Rings when not poked, quieter.' },
  { id: 'embercup', name: 'EMBERCUP',  price: 420, yield: 7,  grow: 110, drop: 78, note: 3, hue: ['#d1683a', '#9a3f1e', '#f2a06a'],
    blurb: 'Warm to the touch. Do not water with anything flammable.' },
  { id: 'glassreed',name: 'GLASSREED', price: 640, yield: 10, grow: 150, drop: 86, note: 4, hue: ['#9ac6d8', '#5a8ea6', '#d4eef8'],
    blurb: 'Hollow. Sings in a draught. Snaps if you look at it.' },
  { id: 'nightpea', name: 'NIGHTPEA',  price: 900, yield: 18, grow: 170, drop: 92, note: 5, hue: ['#7a6ab8', '#4a3d80', '#b0a0e8'], night: true,
    blurb: 'Pays nothing in daylight. Pays properly after dark.' },
  { id: 'ironbud',  name: 'IRONBUD',   price: 1300,yield: 20, grow: 240, drop: 110, note: 6, hue: ['#8a8f96', '#5c6067', '#c4c9d0'],
    blurb: 'Takes an age. Worth the age.' },
  { id: 'halofern', name: 'HALOFERN',  price: 2000,yield: 34, grow: 320, drop: 130, note: 7, hue: ['#e8d86a', '#b0a03a', '#fff4b0'],
    blurb: 'Glows faintly. The garden gets quieter around it.' }
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
  screws: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" preserveAspectRatio="none">' +
    ['8,8', '192,8', '8,192', '192,192'].map(p => {
      const c = p.split(',');
      return '<g transform="translate(' + c[0] + ',' + c[1] + ')">' +
        '<circle r="5" fill="#0d0f11" stroke="#585d64" stroke-width="1.5"/>' +
        '<rect x="-3.5" y="-0.9" width="7" height="1.8" fill="#585d64"/></g>';
    }).join('') + '</svg>',
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
  moss: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" preserveAspectRatio="none">' +
    '<path d="M0 0 h44 c-4 10 -14 12 -18 22 c-6 14 -20 10 -26 22 z" fill="rgba(74,110,45,0.85)"/>' +
    '<path d="M0 0 h26 c-2 8 -10 10 -12 18 z" fill="rgba(126,168,70,0.8)"/>' +
    '<path d="M200 200 h-52 c6 -12 18 -10 24 -22 c6 -12 18 -8 28 -20 z" fill="rgba(74,110,45,0.8)"/>' +
    '<path d="M200 200 h-30 c4 -8 12 -8 16 -16 z" fill="rgba(126,168,70,0.75)"/>' +
    '<path d="M0 200 h34 c-6 -10 -20 -8 -34 -20 z" fill="rgba(60,96,40,0.7)"/></svg>',
  vine: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 400" preserveAspectRatio="none">' +
    '<path d="M104 0 C88 40 116 70 96 112 C78 152 110 180 92 226 C76 268 106 300 90 350 C82 374 92 390 96 400" ' +
    'stroke="#4a6e2d" stroke-width="4" fill="none"/>' +
    [30, 84, 140, 198, 254, 312, 366].map((y, i) =>
      '<ellipse cx="' + (i % 2 ? 78 : 112) + '" cy="' + y + '" rx="11" ry="6" fill="#6f9a3c" transform="rotate(' +
      (i % 2 ? -28 : 22) + ' ' + (i % 2 ? 78 : 112) + ' ' + y + ')"/>').join('') + '</svg>',
  crack: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" preserveAspectRatio="none">' +
    '<path d="M200 6 L172 26 L178 40 L150 56 L156 70 L128 92" stroke="rgba(40,34,26,0.85)" stroke-width="1.6" fill="none"/>' +
    '<path d="M172 26 L182 18 M150 56 L162 52 M156 70 L146 78" stroke="rgba(40,34,26,0.6)" stroke-width="1.2" fill="none"/>' +
    '<path d="M200 6 L172 26 L178 40 L150 56" stroke="rgba(255,255,255,0.35)" stroke-width="0.7" fill="none" transform="translate(1,1)"/></svg>',
  tape: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 46">' +
    '<g transform="rotate(-14 48 23)"><rect x="4" y="14" width="88" height="17" fill="rgba(216,204,168,0.72)"/>' +
    '<rect x="4" y="14" width="88" height="2" fill="rgba(255,255,255,0.35)"/>' +
    '<rect x="4" y="29" width="88" height="2" fill="rgba(0,0,0,0.18)"/></g></svg>',
  crown: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 30" shape-rendering="crispEdges">' +
    '<rect x="72" y="0" width="6" height="14" fill="#fff6c2"/><rect x="66" y="4" width="18" height="5" fill="#fff6c2"/>' +
    '<rect x="30" y="16" width="90" height="4" fill="#fff6c2"/><rect x="40" y="20" width="70" height="3" fill="#8a5f06"/>' +
    '</svg>'
};
