export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min));
}
export function randPick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
export function randRange(rng, min, max) {
  return min + rng() * (max - min);
}
