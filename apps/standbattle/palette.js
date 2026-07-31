/* Extended, curated palette for Stand Battle Arena's sprites and
   backgrounds -- deliberately beyond the machine's base 16-colour VGA set
   (see README) so faces, cloth and buildings can read as retro-quality
   art rather than flat colour blocks. Grouped per character/subject so
   each sprite file only reaches into its own corner of it. */

export const EXT = {
  jotaro: {
    skin: '#E8B894', skinHi: '#F6D3AC', skinSh: '#B4855A',
    hair: '#17171B', hairHi: '#33333E',
    gakuran: '#131317', gakuranHi: '#2A2A33', gakuranSh: '#09090B',
    button: '#C9A83E', cap: '#101014', capBrim: '#050506',
    scarf: '#2C6B4A'
  },
  starPlatinum: {
    base: '#6B2FA0', dark: '#451A73', hi: '#A468DC',
    skin: '#C8B4E0', skinSh: '#9A80BE',
    trim: '#2E1050', eye: '#FFE95C'
  },
  killerQueen: {
    pink: '#E85A9C', pinkDark: '#A5326E', pinkHi: '#FFA6CE',
    black: '#17171B', gold: '#C9A227', vent: '#5A1A3E'
  },
  thug: {
    skin: '#D9A876', skinSh: '#A97848',
    leather: '#3A2818', leatherHi: '#5C4026', leatherSh: '#1E140A',
    hair: '#D8C878', shirt: '#8A2A2A'
  },
  angelo: {
    skin: '#AEAE7C', skinSh: '#7C7C52', skinSick: '#8FA070',
    coat: '#5F5646', coatHi: '#7A6E58', hair: '#3C2E1C', eye: '#D0483A'
  },
  bg: {
    sky1: '#1D2E63', sky2: '#33488C', sky3: '#5C77B8', sky4: '#96AEDD', sky5: '#D9E6F5',
    cloud: '#F0F0F0', cloudSh: '#B9C4DC',
    bldgA: '#4A4A5C', bldgAHi: '#63637A', bldgASh: '#33333F',
    bldgB: '#5E4B3C', bldgBHi: '#7A6450', bldgBSh: '#3C2F26',
    bldgC: '#414A54', bldgCHi: '#57626E', bldgCSh: '#2B3238',
    winLit: '#F6D25E', winLitSh: '#C79A2E', winDim: '#232336', winFrame: '#161620',
    sign: '#D8483C', signHi: '#F07A6C', signText: '#F6E8C8',
    sidewalk: '#8D8D95', sidewalkHi: '#A6A6AE', sidewalkSh: '#6E6E76', curb: '#5E5E68',
    pole: '#3A3A42', wireDk: '#1A1A20'
  },
  fx: {
    sparkHot: '#FFF6C0', sparkMid: '#FFD24A', sparkCool: '#FF7A3C',
    hitFlash: '#FFFFFF', guardCyan: '#8CE8FF', dodgeGhost: '#79C9FF',
    bruise: '#7A4468'
  }
};
