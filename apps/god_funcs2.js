function godStir() {
  const t = (typeof performance !== 'undefined' && performance.now)
    ? Math.floor(performance.now() * 1000) : Date.now();
  godSeed ^= (t >>> 0) ^ ((Date.now() & 0xFFFF) << 13);
  try {
    if (window.crypto && window.crypto.getRandomValues) {
      const a = new Uint32Array(1);
      window.crypto.getRandomValues(a);
      godSeed ^= a[0];
    }
  } catch (e) {}
  godSeed >>>= 0;
}
function godNext() {
  let x = godSeed || 1;
  x ^= x << 13; x >>>= 0;
  x ^= x >>> 17;
  x ^= x << 5;  x >>>= 0;
  godSeed = x;
  return x;
}
