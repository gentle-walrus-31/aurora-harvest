// A small seeded random number generator (mulberry32): the same seed gives
// the same night sky and the same falling pattern, which is what makes the
// screenshot scenes repeatable from one run to the next.
export function createRandom(seed) {
  let state = seed | 0;
  return function random() {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random number between `low` and `high` (inclusive of low, exclusive of high). */
export function randRange(random, low, high) {
  return low + random() * (high - low);
}

/** A random pick from a short array. */
export function randPick(random, items) {
  return items[Math.floor(random() * items.length)];
}
