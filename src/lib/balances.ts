// Turn a group's expenses + settlements into net balances and a minimal set of
// "who pays whom" suggestions to settle up.

export interface LedgerExpense {
  paidById: string;
  shares: { userId: string; amount: number }[];
}

export interface LedgerSettlement {
  fromId: string;
  toId: string;
  amount: number;
}

export interface NetBalance {
  userId: string;
  net: number; // positive => owed money (creditor); negative => owes (debtor)
}

export interface SettleSuggestion {
  fromId: string; // debtor
  toId: string; // creditor
  amount: number;
}

/** Net position per user across all expenses and recorded settlements. */
export function computeNetBalances(
  memberIds: string[],
  expenses: LedgerExpense[],
  settlements: LedgerSettlement[]
): NetBalance[] {
  const net = new Map<string, number>();
  for (const id of memberIds) net.set(id, 0);

  for (const exp of expenses) {
    // Payer fronted the whole amount; everyone owes their share.
    for (const share of exp.shares) {
      net.set(share.userId, (net.get(share.userId) ?? 0) - share.amount);
    }
    const paidTotal = exp.shares.reduce((a, s) => a + s.amount, 0);
    net.set(exp.paidById, (net.get(exp.paidById) ?? 0) + paidTotal);
  }

  for (const s of settlements) {
    // `from` paid `to`, reducing what `from` owes and what `to` is owed.
    net.set(s.fromId, (net.get(s.fromId) ?? 0) + s.amount);
    net.set(s.toId, (net.get(s.toId) ?? 0) - s.amount);
  }

  return memberIds.map((userId) => ({
    userId,
    net: Math.round((net.get(userId) ?? 0) * 100) / 100,
  }));
}

/**
 * Greedy minimal settle-up: repeatedly match the biggest debtor with the
 * biggest creditor. Produces at most n-1 transactions.
 */
export function suggestSettlements(balances: NetBalance[]): SettleSuggestion[] {
  const creditors = balances
    .filter((b) => b.net > 0.005)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.net - a.net);
  const debtors = balances
    .filter((b) => b.net < -0.005)
    .map((b) => ({ ...b, net: -b.net }))
    .sort((a, b) => b.net - a.net);

  const suggestions: SettleSuggestion[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const amount = Math.round(Math.min(c.net, d.net) * 100) / 100;
    if (amount > 0) {
      suggestions.push({ fromId: d.userId, toId: c.userId, amount });
    }
    c.net -= amount;
    d.net -= amount;
    if (c.net <= 0.005) ci++;
    if (d.net <= 0.005) di++;
  }
  return suggestions;
}
