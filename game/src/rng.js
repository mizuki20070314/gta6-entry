// Mulberry32 supplies repeatable choices without replacing browser randomness.
// Each caller receives its own stream, so city details cannot disturb another.
// These small wrappers keep coordinate and palette choices easy to read.
function buildRandomStream(seed) {
  let cursor = seed >>> 0;
  return function nextRandom() {
    cursor = (cursor + 0x6D2B79F5) | 0;
    let bits = Math.imul(cursor ^ (cursor >>> 15), 1 | cursor);
    bits = (bits + Math.imul(bits ^ (bits >>> 7), 61 | bits)) ^ bits;
    return ((bits ^ (bits >>> 14)) >>> 0) / 4294967296;
  };
}

function createRng(seed) {
  return buildRandomStream((seed >>> 0) || 1);
}

function rngInt(rng, n) {
  return Math.floor(rng() * n);
}

function rngPick(rng, arr) {
  return arr[rngInt(rng, arr.length)];
}

function rngRange(rng, a, b) {
  return a + rng() * (b - a);
}

window.createRng = createRng;
window.rngInt = rngInt;
window.rngPick = rngPick;
window.rngRange = rngRange;
