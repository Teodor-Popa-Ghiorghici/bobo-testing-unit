/* five rooms, each its own rack of pots. `kinPot` is the pot the room is "set" for (synergy.js: a room standing in its own pot
   gives every plant in it a bonus). The buff is on top of whatever the
   pot already grants -- a room is a bigger lever than a pot, and
   costs like one. 'night' forces night-only plants (and the visuals) on
   regardless of the clock; 'blessed' is a chance for a collected drop to
   come in double, the shrine's whole reason to exist. What a room looks and
   sounds like is its stage (stages.js), not anything in this table. */
export const ROOM_DEFS = [
  { id: 'yard', kinPot: 'terra', name: 'YARD', price: 0, tint: null,
    buff: { grow: 1, yield: 1, water: 1, night: false, blessed: 0 },
    blurb: 'Where every garden starts.' },
  { id: 'greenhouse', kinPot: 'glaze', name: 'GREENHOUSE', price: 800, tint: 'rgba(255,170,50,0.16)',
    buff: { grow: 1.35, yield: 1, water: 0.7, night: false, blessed: 0 },
    blurb: 'Trapped heat. Grows fast, dries out just as fast.' },
  { id: 'cellar', kinPot: 'stump', name: 'CELLAR', price: 1400, tint: 'rgba(18,18,46,0.55)',
    buff: { grow: 0.85, yield: 1, water: 1.3, night: true, blessed: 0 },
    blurb: 'No sun ever reaches down here. Night-lovers never stop.' },
  { id: 'rooftop', kinPot: 'iron', name: 'ROOFTOP', price: 2200, tint: 'rgba(150,220,255,0.14)',
    buff: { grow: 1, yield: 1.4, water: 0.55, night: false, blessed: 0 },
    blurb: 'All the light there is, and a wind that will not quit.' },
  { id: 'shrine', kinPot: 'bone', name: 'SHRINE', price: 3200, tint: 'rgba(198,120,255,0.20)',
    buff: { grow: 1.1, yield: 1.1, water: 1, night: false, blessed: 0.12 },
    blurb: 'Something in the air blesses a harvest, now and then.' }
];
