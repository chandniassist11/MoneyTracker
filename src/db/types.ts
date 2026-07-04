export interface Account {
  id: number;
  name: string;
  type: string; // 'Cash' | 'UPI' | 'Debit Card' | 'Credit Card' | 'Bank Account' | 'Wallet' | 'Custom'
  balance: number; // Current balance
  openingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  color: string;
  icon: string;
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  icon: string;
}

export interface Transaction {
  id: number;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  accountId: number;
  toAccountId?: number; // Used only for transfers
  categoryId?: number; // Nullable for transfers
  date: string; // YYYY-MM-DD
  source?: string;
  merchantName?: string;
  note?: string;
  receiptUri?: string;
  tags?: string;
  isRecurring: number; // 0 or 1
  recurringInterval: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface Budget {
  id: number;
  categoryId: number;
  amount: number;
  month: string; // YYYY-MM
}

export interface Settings {
  id: number;
  financialMonthStart: number; // 1 to 28/31
  carryForwardEnabled: number; // 0 or 1
  currency: string; // Default: '₹'
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  accountId?: number;
  categoryId?: number;
  type?: 'income' | 'expense' | 'transfer';
  searchQuery?: string;
}

export interface FinanceService {
  initDb(): Promise<void>;
  getAccounts(): Promise<Account[]>;
  addAccount(account: Omit<Account, 'id'>): Promise<Account>;
  updateAccount(account: Account): Promise<void>;
  deleteAccount(id: number): Promise<void>;
  getCategories(): Promise<Category[]>;
  addCategory(category: Omit<Category, 'id'>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;
  getTransactions(filters?: TransactionFilters): Promise<Transaction[]>;
  addTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction>;
  updateTransaction(transaction: Transaction): Promise<void>;
  deleteTransaction(id: number): Promise<void>;
  getBudgets(month: string): Promise<Budget[]>;
  setBudget(categoryId: number, amount: number, month: string): Promise<void>;
  getSettings(): Promise<Settings>;
  updateSettings(settings: Partial<Settings>): Promise<void>;
}
