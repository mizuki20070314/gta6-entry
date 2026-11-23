// rng.js - mulberry32 PRNG; the entire world derives from a single seed
// A single seed drives the whole city layout, traffic and pedestrian placement.
// Mulberry32 is small, fast and deterministic across browsers.
// Helpers below wrap the raw generator with int/pick/range conveniences.
function makeMulberry32(seed) {
    let state = seed >>> 0;
    return function next() {
        state |= 0;
        state = (state + 0x6D2B79F5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function createRng(seed) {
    return makeMulberry32((seed >>> 0) || 1);
}

function rngInt(rng, n) {
    return Math.floor(rng() * n);
}

function rngPick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
}

function rngRange(rng, a, b) {
    return a + rng() * (b - a);
}

window.createRng = createRng;
window.rngInt = rngInt;
window.rngPick = rngPick;
window.rngRange = rngRange;