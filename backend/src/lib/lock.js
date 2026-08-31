let tail = Promise.resolve();
/** Serializes accrual and balance writes in this process. */
export function withLock(fn) {
    const run = tail.then(fn, fn);
    tail = run.then(() => undefined, () => undefined);
    return run;
}
