export function reconstructScaled(events) {
    const supply = new Map();
    const borrow = new Map();
    for (const event of events) {
        const book = event.side === "supply" ? supply : borrow;
        book.set(event.symbol, (book.get(event.symbol) ?? 0n) + event.scaledWad);
    }
    return { supply, borrow };
}
