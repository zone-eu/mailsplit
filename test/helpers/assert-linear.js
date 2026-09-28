'use strict';

// Asserts that `run` scales linearly by timing it on `small` and on four times `small`.
// Quadrupling the input costs a linear implementation about 4x and a quadratic one about
// 16x, so the bound of 6x sits well clear of both without any absolute millisecond limit.
// Each size is timed three times and the fastest run counts, which filters out GC pauses.
// `run(size)` may return a Promise.

const RUNS = 3;
const FACTOR = 6;
const SLACK_MS = 50;

const time = async (run, size) => {
    let best = Infinity;
    for (let i = 0; i < RUNS; i++) {
        let start = process.hrtime.bigint();
        // runs must not overlap, or they would time each other
        // eslint-disable-next-line no-await-in-loop
        await run(size);
        best = Math.min(best, Number(process.hrtime.bigint() - start) / 1e6);
    }
    return best;
};

module.exports = async (test, run, small) => {
    await run(Math.ceil(small / 10)); // warm up
    let smallMs = await time(run, small);
    let largeMs = await time(run, small * 4);
    test.ok(largeMs <= smallMs * FACTOR + SLACK_MS, `quadrupling the input took ${smallMs.toFixed(1)} ms -> ${largeMs.toFixed(1)} ms`);
};
