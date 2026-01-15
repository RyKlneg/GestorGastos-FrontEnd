export interface Expense {
  id: number;
  description: string;
  amount: number;
  date: string;
  category: string;
}

export interface ExpenseCreate {
  description: string;
  amount: number;
  date?: string;
  category: string;
}

export interface ExpenseUpdate {
  description?: string;
  amount?: number;
  date?: string;
  category?: string;
}

export interface PaginatedResponse {
  data: Expense[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  query?: string;
  category?: string;
}

