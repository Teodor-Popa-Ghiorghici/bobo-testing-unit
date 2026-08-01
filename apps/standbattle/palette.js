/* Stand Battle Arena — colour ramps.
   Everything on screen is painted from a *ramp*: an ordered array of 5
   colours, darkest -> lightest, used as [core shadow, shadow, base,
   light, rim]. Shadows are hue-shifted toward blue/violet and highlights
   toward warm, which is what makes cel-shaded animation art read as
   "lit" instead of "tinted" -- a flat darker version of the base colour
   always looks like dirt.

   By explicit request this app goes beyond the machine's base 16-colour
   VGA rule (see README) so characters can hold anime-grade shading.
   Smoothing stays off and everything still lands on whole pixels. */

export const S = 0, SH = 1, BASE = 2, LT = 3, RIM = 4;

/* pick a ramp step with clamping, so callers can say ramp[BASE+1] freely */
export function step(r, i) { return r[Math.max(0, Math.min(4, i | 0))]; }

/* ---- characters ------------------------------------------------------ */

export const JOTARO = {
  coat: ['#0C1024', '#1A2148', '#2C3670', '#4351A0', '#6E80D4'],
  coatIn: ['#100A1C', '#1D1330', '#2E2050', '#443272', '#65509E'],
  pants: ['#0E1220', '#191F38', '#2A3358', '#3D4878', '#5B69A4'],
  boot: ['#040508', '#0C0E15', '#171A26', '#282D3E', '#454C63'],
  skin: ['#7A4632', '#A9664A', '#D99873', '#F0BE99', '#FFE0C4'],
  hair: ['#06060E', '#101026', '#1E2040', '#333764', '#5763A0'],
  gold: ['#57390C', '#8E6318', '#C9932A', '#EFC24E', '#FFF0A6'],
  green: ['#0D2A1C', '#17442C', '#256B44', '#3A9660', '#63C48C'],
  ink: '#05060C'
};

export const STAR = {
  body: ['#2A1145', '#42206E', '#5E3199', '#8355C6', '#AC85E8'],
  flesh: ['#4C3E70', '#6E5F98', '#9A8CC0', '#C4BADF', '#EAE4F7'],
  teal: ['#08302F', '#0F524C', '#1A7E72', '#2FAF9B', '#66DCC4'],
  gold: ['#6B4A10', '#A87A1E', '#D8A82E', '#F5D460', '#FFF6BE'],
  ink: '#0A0616',
  glow: '#B98BFF'
};

export const THUG = {
  jacket: ['#1B1008', '#2E1C0D', '#472C16', '#6A4423', '#96683A'],
  shirt: ['#3A0E12', '#5C171E', '#8A2630', '#B84350', '#DE7B84'],
  jeans: ['#101C30', '#1B2F4E', '#2B4670', '#3F6299', '#6288C4'],
  skin: ['#6E4028', '#9B5F3E', '#CC8C60', '#E8B489', '#FBD8B6'],
  hair: ['#5A3A0A', '#8A5C12', '#C08D22', '#E4B742', '#FFE38A'],
  ink: '#0A0708'
};

export const ANGELO = {
  coat: ['#1A1A12', '#2C2C1E', '#45452F', '#616148', '#8A8A6C'],
  shirt: ['#141B22', '#212C38', '#334352', '#4A5F72', '#71889E'],
  skin: ['#3F4A32', '#5C6A46', '#828E62', '#A6B085', '#CBD2AE'],
  hair: ['#100C08', '#1E1710', '#31261A', '#48392A', '#6B5742'],
  eye: ['#4A0A0A', '#7A1414', '#B82424', '#E24A3C', '#FF8A70'],
  ink: '#070806'
};

export const KQ = {
  pink: ['#4A1030', '#7A1D4E', '#B02F72', '#E15A9C', '#FFA0CB'],
  black: ['#050508', '#0D0D14', '#1A1A26', '#2C2C3E', '#4A4A62'],
  gold: ['#5C3C0A', '#966618', '#D19A28', '#F2CB58', '#FFF2B4'],
  flesh: ['#5A2440', '#833B5E', '#B05F86', '#D48DAC', '#F2C0D2'],
  ink: '#040407',
  glow: '#FF4A7E'
};

/* ---- environment ----------------------------------------------------- */

export const SKY = {
  dusk: ['#141A3E', '#2A2560', '#5B3A7A', '#9E4E76', '#D97A63', '#F2A96A', '#FBD79B'],
  day: ['#1F4C96', '#2F68B4', '#4C8BD0', '#7FB3E4', '#B6D8F3', '#DDEEFB', '#F4FAFF'],
  night: ['#04060F', '#0A0E22', '#121A3A', '#1D2A55', '#2C3C72', '#3E538F', '#5570AE'],
  storm: ['#0B0E18', '#161B2C', '#242C44', '#353F5E', '#4A5779', '#636F92', '#828DAB']
};

export const TOWN = {
  wallA: ['#231F2E', '#332D42', '#4A4460', '#655E80', '#8A83A6'],
  wallB: ['#2B1E1A', '#3F2C25', '#5A4136', '#7B5C4C', '#A5836E'],
  wallC: ['#16232B', '#20343F', '#2E4A59', '#436676', '#658D9E'],
  roof: ['#1A1220', '#281B30', '#3B2A46', '#523E60', '#75607F'],
  win: ['#0B0D18', '#151A2C', '#FFDE8A', '#FFF3C4', '#FFFFFF'],
  road: ['#0F1016', '#191B24', '#262934', '#373B49', '#4E5364'],
  walk: ['#1D1E26', '#2C2E3A', '#414455', '#5A5D72', '#7C8098'],
  leaf: ['#0A2415', '#123A22', '#1D5A34', '#2E8449', '#4FB56A'],
  wood: ['#211409', '#37220F', '#523618', '#734F26', '#9C7440'],
  metal: ['#141821', '#212734', '#333B4D', '#4C566C', '#727E96'],
  neon: ['#7A0F2E', '#B8184A', '#F02A6E', '#FF6BA0', '#FFC2D8'],
  cloud: ['#3E3860', '#6A5A84', '#9A80A2', '#C9A7B4', '#F6DCCB']
};

/* ---- effects --------------------------------------------------------- */

export const FX = {
  spark: ['#FF6B18', '#FF9A2E', '#FFC94A', '#FFF08A', '#FFFFFF'],
  blood: ['#4A0B12', '#7C141E', '#B2202C', '#DE3A44', '#FF7A72'],
  guard: ['#0B2E4A', '#12587E', '#1E93B8', '#4FD0E6', '#C4F6FF'],
  ghost: ['#152A55', '#22458A', '#3670C4', '#63A6EE', '#B7DBFF'],
  aura: ['#2A0F4E', '#471880', '#6E2BB8', '#9C5AE4', '#D5A8FF'],
  dust: ['#332B26', '#4C4139', '#6B5D51', '#8E7F70', '#B8A896'],
  white: '#FFFFFF',
  ink: '#04050A'
};

/* light direction shared by every sprite and prop: key light from the
   upper-left-front, so shadows fall to the lower-right and the rim light
   sits on the upper-right edge. Sprites read as one scene only if they
   all agree on this. */
export const LIGHT = { x: -0.62, y: -0.78 };

/* Atmospheric perspective: mix a ramp toward a distance colour. Far
   layers lose contrast and take on the sky's hue, which is what makes a
   flat 2D town read as having depth. */
export function haze(ramp, amount, target) {
  const mix = hex => {
    const a = parseInt(hex.slice(1), 16), b = parseInt(target.slice(1), 16);
    const r = Math.round((a >> 16) * (1 - amount) + (b >> 16) * amount);
    const g = Math.round(((a >> 8) & 255) * (1 - amount) + ((b >> 8) & 255) * amount);
    const bl = Math.round((a & 255) * (1 - amount) + (b & 255) * amount);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
  };
  return ramp.map(mix);
}
