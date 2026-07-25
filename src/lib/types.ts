import type { SplitEntry } from "./split";

export interface MemberDTO {
  userId: string;
  name: string;
  email: string;
  role: string;
}

export interface ConfigDTO {
  id: string;
  name: string;
  type: string;
  entries: SplitEntry[];
  isDefault: boolean;
}

export interface ExpenseDTO {
  id: string;
  description: string;
  category: string | null;
  amount: number;
  paidById: string;
  paidByName: string;
  date: string;
  configName: string | null;
  shares: { userId: string; amount: number }[];
}

export interface SettlementDTO {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
  date: string;
}

export interface BalanceDTO {
  userId: string;
  name: string;
  net: number;
}

export interface SuggestionDTO {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export interface GroupPayload {
  id: string;
  name: string;
  currentUserId: string;
  defaultConfigId: string | null;
  members: MemberDTO[];
  configs: ConfigDTO[];
  expenses: ExpenseDTO[];
  settlements: SettlementDTO[];
  balances: BalanceDTO[];
  suggestions: SuggestionDTO[];
}
