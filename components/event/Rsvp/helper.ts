// ─── Capacity helper ──────────────────────────────────────────────────────────


/**
 * Checks if all tickets are at capacity.
 * @param tickets - Array of ticket objects with `quantitySold` and `quantity` properties.
 * @returns `true` if all tickets are at capacity, otherwise `false`.
 */

export function isAtCapacity(tickets: { quantitySold?: number, quantity?: number }[]) {
  if (!tickets || tickets.length === 0) return false;
  return tickets.every(
    (t) => (t.quantitySold ?? 0) >= (t.quantity ?? Infinity)
  );
}

/**
 * Formats a price with the given currency.
 * @param price - The price value to format.
 * @param currency - The currency code (default is "NGN").
 * @returns A formatted price string.
 */

export function formatPrice(price: number, currency: string = "NGN"): string {
  if (price === 0) return "Free";
  const sym: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€", CAD: "CA$" };
  return `${sym[currency] ?? currency}${Number(price).toLocaleString()}`;
}
