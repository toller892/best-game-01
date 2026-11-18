// A small seeded random source (mulberry32) so a screenshot seed always plays the
// same game, plus the helpers the world uses to place things.

/** A deterministic 32-bit generator from one integer seed. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A float in [min, max). */
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

/** An angle in [0, 2*PI). */
export function angle(rng) {
  return rng() * Math.PI * 2;
}

/** Pick one element of a list. */
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}
