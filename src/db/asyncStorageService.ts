import AsyncStorage from '@react-native-async-storage/async-storage';
import { Account, Category, Transaction, Budget, Settings, TransactionFilters, FinanceService } from './types';

const KEYS = {
  ACCOUNTS: 'MT_ACCOUNTS',
  CATEGORIES: 'MT_CATEGORIES',
  TRANSACTIONS: 'MT_TRANSACTIONS',
  BUDGETS: 'MT_BUDGETS',
  SETTINGS: 'MT_SETTINGS'
};

export class AsyncStorageFinanceService implements FinanceService {
  async initDb(): Promise<void> {
    // 1. Settings Seeding
    const settingsStr = await AsyncStorage.getItem(KEYS.SETTINGS);
    if (!settingsStr) {
      const defaultSettings: Settings = { id: 1, financialMonthStart: 1, carryForwardEnabled: 1, currency: '₹' };
      await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(defaultSettings));
    }

    // 2. Accounts Seeding
    const accountsStr = await AsyncStorage.getItem(KEYS.ACCOUNTS);
    if (!accountsStr) {
      const defaultAccounts: Account[] = [
        { id: 1, name: 'Cash', type: 'Cash', balance: 0.0, openingBalance: 0.0, totalIncome: 0.0, totalExpenses: 0.0, color: '#10B981', icon: 'cash' },
        { id: 2, name: 'UPI', type: 'UPI', balance: 0.0, openingBalance: 0.0, totalIncome: 0.0, totalExpenses: 0.0, color: '#6366F1', icon: 'wallet' },
        { id: 3, name: 'Debit Card', type: 'Debit Card', balance: 0.0, openingBalance: 0.0, totalIncome: 0.0, totalExpenses: 0.0, color: '#3B82F6', icon: 'card' },
        { id: 4, name: 'Credit Card', type: 'Credit Card', balance: 0.0, openingBalance: 0.0, totalIncome: 0.0, totalExpenses: 0.0, color: '#EF4444', icon: 'card-outline' },
        { id: 5, name: 'Bank Account', type: 'Bank Account', balance: 0.0, openingBalance: 0.0, totalIncome: 0.0, totalExpenses: 0.0, color: '#8B5CF6', icon: 'business' },
        { id: 6, name: 'Wallet', type: 'Wallet', balance: 0.0, openingBalance: 0.0, totalIncome: 0.0, totalExpenses: 0.0, color: '#F59E0B', icon: 'wallet-outline' }
      ];
      await AsyncStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(defaultAccounts));
    }

    // 3. Categories Seeding
    const categoriesStr = await AsyncStorage.getItem(KEYS.CATEGORIES);
    if (!categoriesStr) {
      const defaultCategories: Category[] = [
        // Income
        { id: 1, name: 'Salary', type: 'income', icon: 'briefcase' },
        { id: 2, name: 'Freelancing', type: 'income', icon: 'laptop' },
        { id: 3, name: 'Business', type: 'income', icon: 'trending-up' },
        { id: 4, name: 'Interest', type: 'income', icon: 'analytics' },
        { id: 5, name: 'Gifts', type: 'income', icon: 'gift' },
        { id: 6, name: 'Refunds', type: 'income', icon: 'refresh' },
        { id: 7, name: 'Others (Income)', type: 'income', icon: 'help-circle' },
        // Expenses
        { id: 8, name: 'Food', type: 'expense', icon: 'fast-food' },
        { id: 9, name: 'Dairy', type: 'expense', icon: 'cafe' },
        { id: 10, name: 'Transportation', type: 'expense', icon: 'car' },
        { id: 11, name: 'Rent', type: 'expense', icon: 'home' },
        { id: 12, name: 'Shopping', type: 'expense', icon: 'cart' },
        { id: 13, name: 'Bills', type: 'expense', icon: 'document-text' },
        { id: 14, name: 'Entertainment', type: 'expense', icon: 'film' },
        { id: 15, name: 'Medical', type: 'expense', icon: 'medical' },
        { id: 16, name: 'Education', type: 'expense', icon: 'book' },
        { id: 17, name: 'Travel', type: 'expense', icon: 'airplane' },
        { id: 18, name: 'Others (Expense)', type: 'expense', icon: 'help' }
      ];
      await AsyncStorage.setItem(KEYS.CATEGORIES, JSON.stringify(defaultCategories));
    }

    // 4. Transactions Seeding
    const transactionsStr = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
    if (!transactionsStr) {
      await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify([]));
    }

    // 5. Budgets Seeding
    const budgetsStr = await AsyncStorage.getItem(KEYS.BUDGETS);
    if (!budgetsStr) {
      await AsyncStorage.setItem(KEYS.BUDGETS, JSON.stringify([]));
    }

    await this.migrateTransactions();
    await this.migrateAccountStats();
  }

  // --- ACCOUNTS ---
  async getAccounts(): Promise<Account[]> {
    const data = await AsyncStorage.getItem(KEYS.ACCOUNTS);
    const accounts: Account[] = data ? JSON.parse(data) : [];
    return accounts.sort((a, b) => a.name.localeCompare(b.name));
  }

  async addAccount(account: Omit<Account, 'id'>): Promise<Account> {
    const accounts = await this.getAccounts();
    const nextId = accounts.length > 0 ? Math.max(...accounts.map(a => a.id)) + 1 : 1;
    const newAccount: Account = {
      ...account,
      id: nextId,
      openingBalance: account.openingBalance ?? account.balance,
      totalIncome: account.totalIncome ?? 0,
      totalExpenses: account.totalExpenses ?? 0
    };
    accounts.push(newAccount);
    await AsyncStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(accounts));
    return newAccount;
  }

  async updateAccount(account: Account): Promise<void> {
    let accounts = await this.getAccounts();
    accounts = accounts.map(a => {
      if (a.id !== account.id) return a;
      const openingBalanceDelta = account.openingBalance - a.openingBalance;
      return {
        ...account,
        balance: a.balance + openingBalanceDelta
      };
    });
    await AsyncStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(accounts));
  }

  async deleteAccount(id: number): Promise<void> {
    let accounts = await this.getAccounts();
    accounts = accounts.filter(a => a.id !== id);
    await AsyncStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(accounts));
  }

  // --- CATEGORIES ---
  async getCategories(): Promise<Category[]> {
    const data = await AsyncStorage.getItem(KEYS.CATEGORIES);
    const categories: Category[] = data ? JSON.parse(data) : [];
    return categories.sort((a, b) => a.name.localeCompare(b.name));
  }

  async addCategory(category: Omit<Category, 'id'>): Promise<Category> {
    const categories = await this.getCategories();
    const nextId = categories.length > 0 ? Math.max(...categories.map(c => c.id)) + 1 : 1;
    const newCategory: Category = { ...category, id: nextId };
    categories.push(newCategory);
    await AsyncStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
    return newCategory;
  }

  async deleteCategory(id: number): Promise<void> {
    let categories = await this.getCategories();
    categories = categories.filter(c => c.id !== id);
    await AsyncStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
  }

  // --- TRANSACTIONS ---
  async getTransactions(filters?: TransactionFilters): Promise<Transaction[]> {
    const data = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
    let transactions: Transaction[] = data ? JSON.parse(data) : [];

    if (filters) {
      if (filters.startDate) {
        transactions = transactions.filter(t => t.date >= filters.startDate!);
      }
      if (filters.endDate) {
        transactions = transactions.filter(t => t.date <= filters.endDate!);
      }
      if (filters.accountId) {
        transactions = transactions.filter(
          t => t.accountId === filters.accountId || t.toAccountId === filters.accountId
        );
      }
      if (filters.categoryId) {
        transactions = transactions.filter(t => t.categoryId === filters.categoryId);
      }
      if (filters.type) {
        transactions = transactions.filter(t => t.type === filters.type);
      }
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        transactions = transactions.filter(t => t.note?.toLowerCase().includes(query));
      }
    }

    // Sort by date desc, then by id desc
    return transactions.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.id - a.id;
    });
  }

  async addTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    const data = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
    const transactions: Transaction[] = data ? JSON.parse(data) : [];
    const nextId = transactions.length > 0 ? Math.max(...transactions.map(t => t.id)) + 1 : 1;

    const newTransaction: Transaction = {
      ...transaction,
      source: transaction.source || '',
      merchantName: transaction.merchantName || '',
      id: nextId,
      note: transaction.note || '',
      receiptUri: transaction.receiptUri || '',
      tags: transaction.tags || ''
    };

    transactions.push(newTransaction);
    await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));

    // Update account balances
    await this.applyTransactionBalances(newTransaction);

    return newTransaction;
  }

  async updateTransaction(transaction: Transaction): Promise<void> {
    const data = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
    let transactions: Transaction[] = data ? JSON.parse(data) : [];

    const oldTxIndex = transactions.findIndex(t => t.id === transaction.id);
    if (oldTxIndex === -1) {
      throw new Error(`Transaction with id ${transaction.id} not found.`);
    }

    const oldTx = transactions[oldTxIndex];

    // 1. Reverse old transaction effect on balances
    await this.reverseTransactionBalances(oldTx);

    // 2. Update transaction
    transactions[oldTxIndex] = {
      ...transaction,
      source: transaction.source || '',
      merchantName: transaction.merchantName || '',
      note: transaction.note || '',
      receiptUri: transaction.receiptUri || '',
      tags: transaction.tags || ''
    };
    await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));

    // 3. Apply new transaction effect on balances
    await this.applyTransactionBalances(transaction);
  }

  async deleteTransaction(id: number): Promise<void> {
    const data = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
    let transactions: Transaction[] = data ? JSON.parse(data) : [];

    const oldTx = transactions.find(t => t.id === id);
    if (oldTx) {
      await this.reverseTransactionBalances(oldTx);
    }

    transactions = transactions.filter(t => t.id !== id);
    await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }

  // --- BUDGETS ---
  async getBudgets(month: string): Promise<Budget[]> {
    const data = await AsyncStorage.getItem(KEYS.BUDGETS);
    const budgets: Budget[] = data ? JSON.parse(data) : [];
    return budgets.filter(b => b.month === month);
  }

  async setBudget(categoryId: number, amount: number, month: string): Promise<void> {
    const data = await AsyncStorage.getItem(KEYS.BUDGETS);
    let budgets: Budget[] = data ? JSON.parse(data) : [];

    const existingIndex = budgets.findIndex(b => b.categoryId === categoryId && b.month === month);

    if (existingIndex > -1) {
      budgets[existingIndex].amount = amount;
    } else {
      const nextId = budgets.length > 0 ? Math.max(...budgets.map(b => b.id)) + 1 : 1;
      budgets.push({ id: nextId, categoryId, amount, month });
    }

    await AsyncStorage.setItem(KEYS.BUDGETS, JSON.stringify(budgets));
  }

  // --- SETTINGS ---
  async getSettings(): Promise<Settings> {
    const data = await AsyncStorage.getItem(KEYS.SETTINGS);
    if (!data) {
      return { id: 1, financialMonthStart: 1, carryForwardEnabled: 1, currency: '₹' };
    }
    return JSON.parse(data);
  }

  async updateSettings(settings: Partial<Settings>): Promise<void> {
    const current = await this.getSettings();
    const updated: Settings = {
      id: current.id,
      financialMonthStart: settings.financialMonthStart !== undefined ? settings.financialMonthStart : current.financialMonthStart,
      carryForwardEnabled: settings.carryForwardEnabled !== undefined ? settings.carryForwardEnabled : current.carryForwardEnabled,
      currency: settings.currency !== undefined ? settings.currency : current.currency
    };
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(updated));
  }

  // --- HELPER METHODS FOR BALANCES ---
  private async applyTransactionBalances(tx: Transaction): Promise<void> {
    const accounts = await this.getAccounts();
    const updatedAccounts = accounts.map(acc => {
      let balance = acc.balance;
      if (tx.type === 'income' && acc.id === tx.accountId) {
        balance += tx.amount;
        return { ...acc, balance, totalIncome: acc.totalIncome + tx.amount };
      } else if (tx.type === 'expense' && acc.id === tx.accountId) {
        balance -= tx.amount;
        return { ...acc, balance, totalExpenses: acc.totalExpenses + tx.amount };
      } else if (tx.type === 'transfer') {
        if (acc.id === tx.accountId) {
          balance -= tx.amount;
        } else if (acc.id === tx.toAccountId) {
          balance += tx.amount;
        }
      }
      return { ...acc, balance };
    });
    await AsyncStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(updatedAccounts));
  }

  private async reverseTransactionBalances(tx: Transaction): Promise<void> {
    const accounts = await this.getAccounts();
    const updatedAccounts = accounts.map(acc => {
      let balance = acc.balance;
      if (tx.type === 'income' && acc.id === tx.accountId) {
        balance -= tx.amount;
        return { ...acc, balance, totalIncome: acc.totalIncome - tx.amount };
      } else if (tx.type === 'expense' && acc.id === tx.accountId) {
        balance += tx.amount;
        return { ...acc, balance, totalExpenses: acc.totalExpenses - tx.amount };
      } else if (tx.type === 'transfer') {
        if (acc.id === tx.accountId) {
          balance += tx.amount;
        } else if (acc.id === tx.toAccountId) {
          balance -= tx.amount;
        }
      }
      return { ...acc, balance };
    });
    await AsyncStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(updatedAccounts));
  }

  private async migrateAccountStats(): Promise<void> {
    const data = await AsyncStorage.getItem(KEYS.ACCOUNTS);
    if (!data) return;

    const accounts = JSON.parse(data) as Partial<Account>[];
    const hasOldAccounts = accounts.some(a =>
      a.openingBalance === undefined || a.totalIncome === undefined || a.totalExpenses === undefined
    );
    if (!hasOldAccounts) return;

    const txData = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
    const transactions: Transaction[] = txData ? JSON.parse(txData) : [];
    const migrated = accounts.map(account => {
      const id = account.id!;
      let income = 0;
      let expenses = 0;
      let transferNet = 0;

      transactions.forEach(tx => {
        if (tx.type === 'income' && tx.accountId === id) {
          income += tx.amount;
        } else if (tx.type === 'expense' && tx.accountId === id) {
          expenses += tx.amount;
        } else if (tx.type === 'transfer') {
          if (tx.accountId === id) transferNet -= tx.amount;
          if (tx.toAccountId === id) transferNet += tx.amount;
        }
      });

      const balance = account.balance ?? 0;
      return {
        ...account,
        balance,
        openingBalance: account.openingBalance ?? balance - income + expenses - transferNet,
        totalIncome: account.totalIncome ?? income,
        totalExpenses: account.totalExpenses ?? expenses
      } as Account;
    });

    await AsyncStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(migrated));
  }

  private async migrateTransactions(): Promise<void> {
    const data = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
    if (!data) return;

    const transactions = JSON.parse(data) as Partial<Transaction>[];
    const needsMigration = transactions.some(tx =>
      tx.source === undefined || tx.merchantName === undefined || tx.receiptUri === undefined || tx.tags === undefined
    );
    if (!needsMigration) return;

    const migrated = transactions.map(tx => ({
      ...tx,
      source: tx.source || '',
      merchantName: tx.merchantName || '',
      receiptUri: tx.receiptUri || '',
      tags: tx.tags || ''
    }));

    await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(migrated));
  }
}
