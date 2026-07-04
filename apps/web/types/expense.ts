export interface ExpenseRow {
  id: string;
  orgId: string;
  category: string;
  amount: string;
  date: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpensesResponse {
  rows: ExpenseRow[];
  categories: string[];
}
