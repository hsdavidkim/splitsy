// The modular split engine. A SplitConfig describes HOW to divide an amount
// among a set of participants. Given a total and a config, computeSplit returns
// the exact amount each participant owes, guaranteeing the parts sum to the
// total (largest-remainder rounding to the cent).

export type SplitType = "equal" | "percentage" | "shares" | "exact";

export interface SplitEntry {
  userId: string;
  value: number; // meaning depends on type (percent / weight / fixed amount)
}

export interface SplitConfigShape {
  type: SplitType;
  entries: SplitEntry[];
}

export interface ComputedShare {
  userId: string;
  amount: number; // in dollars, rounded to the cent
}

/** Round to cents, avoiding binary float drift. */
function toCents(n: number): number {
  return Math.round(n * 100);
}

/**
 * Distribute `totalCents` across weights so the parts are integers that sum
 * exactly to the total. Uses the largest-remainder method.
 */
function apportion(totalCents: number, weights: number[]): number[] {
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (weightSum <= 0) {
    // Degenerate: split as evenly as possible.
    return apportion(
      totalCents,
      weights.map(() => 1)
    );
  }
  const raw = weights.map((w) => (totalCents * w) / weightSum);
  const floors = raw.map((r) => Math.floor(r));
  let remainder = totalCents - floors.reduce((a, b) => a + b, 0);
  // Hand out the leftover cents to the largest fractional remainders first.
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);
  const result = [...floors];
  for (let k = 0; k < order.length && remainder > 0; k++) {
    result[order[k].i] += 1;
    remainder--;
  }
  return result;
}

/**
 * Compute per-participant owed amounts for a given total and config.
 * `participantIds` bounds the split (e.g. current group members). For equal
 * splits all participants are used; for other types only entries whose userId
 * is in participantIds are honored.
 */
export function computeSplit(
  total: number,
  config: SplitConfigShape,
  participantIds: string[]
): ComputedShare[] {
  const totalCents = toCents(total);

  if (config.type === "equal") {
    const ids = participantIds;
    if (ids.length === 0) return [];
    const parts = apportion(
      totalCents,
      ids.map(() => 1)
    );
    return ids.map((userId, i) => ({ userId, amount: parts[i] / 100 }));
  }

  // For the weighted / exact types, restrict to entries that apply to members.
  const relevant = config.entries.filter((e) =>
    participantIds.includes(e.userId)
  );

  if (config.type === "exact") {
    // Values are fixed dollar amounts. They should sum to the total; if they
    // don't, we scale proportionally so the split still balances.
    const cents = relevant.map((e) => toCents(e.value));
    const sum = cents.reduce((a, b) => a + b, 0);
    if (sum === totalCents || sum === 0) {
      // Exact match (common case) — use as-is, correcting any 1-cent drift.
      const result = relevant.map((e, i) => ({
        userId: e.userId,
        cents: cents[i],
      }));
      let drift = totalCents - sum;
      // Nudge the first entry to absorb rounding drift.
      if (result.length > 0) result[0].cents += drift;
      return result.map((r) => ({ userId: r.userId, amount: r.cents / 100 }));
    }
    // Scale to fit.
    const parts = apportion(totalCents, cents);
    return relevant.map((e, i) => ({ userId: e.userId, amount: parts[i] / 100 }));
  }

  // "percentage" and "shares" are both weighted distributions.
  const weights = relevant.map((e) => Math.max(0, e.value));
  const parts = apportion(totalCents, weights);
  return relevant.map((e, i) => ({ userId: e.userId, amount: parts[i] / 100 }));
}

/** Validate a config shape, returning an error string or null. */
export function validateConfig(
  type: string,
  entries: SplitEntry[]
): string | null {
  if (!["equal", "percentage", "shares", "exact"].includes(type)) {
    return "Invalid split type";
  }
  if (type === "equal") return null;
  if (!Array.isArray(entries) || entries.length === 0) {
    return "At least one participant is required";
  }
  for (const e of entries) {
    if (typeof e.userId !== "string" || !e.userId) return "Invalid participant";
    if (typeof e.value !== "number" || isNaN(e.value) || e.value < 0) {
      return "Values must be non-negative numbers";
    }
  }
  if (type === "percentage") {
    const sum = entries.reduce((a, b) => a + b.value, 0);
    if (Math.abs(sum - 100) > 0.01) {
      return `Percentages must add up to 100 (currently ${sum})`;
    }
  }
  if (type === "shares") {
    const sum = entries.reduce((a, b) => a + b.value, 0);
    if (sum <= 0) return "Shares must add up to more than 0";
  }
  return null;
}
