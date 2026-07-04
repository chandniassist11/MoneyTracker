import * as SQLite from 'expo-sqlite';
import { Account, Category, Transaction, Budget, Settings, TransactionFilters, FinanceService } from './types';

const DB_NAME = 'moneytracker.db';

export class SQLiteFinanceService implements FinanceService {
  private db!: SQLite.SQLiteDatabase;

  async initDb(): Promise<void> {
    this.db = SQLite.openDatabaseSync(DB_NAME);

    // Create tables synchronously
    this.db.execSync(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        type TEXT,
        balance REAL,
        openingBalance REAL DEFAULT 0,
        totalIncome REAL DEFAULT 0,
        totalExpenses REAL DEFAULT 0,
        color TEXT,
        icon TEXT
      );

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        type TEXT,
        icon TEXT
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT,
        amount REAL,
        accountId INTEGER,
        toAccountId INTEGER,
        categoryId INTEGER,
        date TEXT,
        source TEXT,
        merchantName TEXT,
        note TEXT,
        receiptUri TEXT,
        tags TEXT,
        isRecurring INTEGER DEFAULT 0,
        recurringInterval TEXT DEFAULT 'none',
        FOREIGN KEY(accountId) REFERENCES accounts(id) ON DELETE CASCADE,
        FOREIGN KEY(toAccountId) REFERENCES accounts(id) ON DELETE CASCADE,
        FOREIGN KEY(categoryId) REFERENCES categories(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        categoryId INTEGER,
        amount REAL,
        month TEXT,
        UNIQUE(categoryId, month),
        FOREIGN KEY(categoryId) REFERENCES categories(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        financialMonthStart INTEGER DEFAULT 1,
        carryForwardEnabled INTEGER DEFAULT 1,
        currency TEXT DEFAULT '₹'
      );
    `);

    this.ensureAccountColumns();
    this.ensureTransactionColumns();
    this.backfillAccountStats();

    // Seed default settings if not exists
    const settingsCount = this.db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM settings');
    if (!settingsCount || settingsCount.count === 0) {
      this.db.runSync(
        'INSERT INTO settings (financialMonthStart, carryForwardEnabled, currency) VALUES (?, ?, ?)',
        [1, 1, '₹']
      );
    }

    // Seed default accounts if not exists
    const accountsCount = this.db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM accounts');
    if (!accountsCount || accountsCount.count === 0) {
      const defaultAccounts = [
        { name: 'Cash', type: 'Cash', balance: 0.0, openingBalance: 0.0, totalIncome: 0.0, totalExpenses: 0.0, color: '#10B981', icon: 'cash' },
        { name: 'UPI', type: 'UPI', balance: 0.0, openingBalance: 0.0, totalIncome: 0.0, totalExpenses: 0.0, color: '#6366F1', icon: 'wallet' },
        { name: 'Debit Card', type: 'Debit Card', balance: 0.0, openingBalance: 0.0, totalIncome: 0.0, totalExpenses: 0.0, color: '#3B82F6', icon: 'card' },
        { name: 'Credit Card', type: 'Credit Card', balance: 0.0, openingBalance: 0.0, totalIncome: 0.0, totalExpenses: 0.0, color: '#EF4444', icon: 'card-outline' },
        { name: 'Bank Account', type: 'Bank Account', balance: 0.0, openingBalance: 0.0, totalIncome: 0.0, totalExpenses: 0.0, color: '#8B5CF6', icon: 'business' },
        { name: 'Wallet', type: 'Wallet', balance: 0.0, openingBalance: 0.0, totalIncome: 0.0, totalExpenses: 0.0, color: '#F59E0B', icon: 'wallet-outline' }
      ];
      for (const acc of defaultAccounts) {
        this.db.runSync(
          `INSERT OR IGNORE INTO accounts
           (name, type, balance, openingBalance, totalIncome, totalExpenses, color, icon)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [acc.name, acc.type, acc.balance, acc.openingBalance, acc.totalIncome, acc.totalExpenses, acc.color, acc.icon]
        );
      }
    }

    // Seed default categories if not exists
    const categoriesCount = this.db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM categories');
    if (!categoriesCount || categoriesCount.count === 0) {
      const defaultCategories = [
        // Income
        { name: 'Salary', type: 'income', icon: 'briefcase' },
        { name: 'Freelancing', type: 'income', icon: 'laptop' },
        { name: 'Business', type: 'income', icon: 'trending-up' },
        { name: 'Interest', type: 'income', icon: 'analytics' },
        { name: 'Gifts', type: 'income', icon: 'gift' },
        { name: 'Refunds', type: 'income', icon: 'refresh' },
        { name: 'Others (Income)', type: 'income', icon: 'help-circle' },
        // Expenses
        { name: 'Food', type: 'expense', icon: 'fast-food' },
        { name: 'Dairy', type: 'expense', icon: 'cafe' },
        { name: 'Transportation', type: 'expense', icon: 'car' },
        { name: 'Rent', type: 'expense', icon: 'home' },
        { name: 'Shopping', type: 'expense', icon: 'cart' },
        { name: 'Bills', type: 'expense', icon: 'document-text' },
        { name: 'Entertainment', type: 'expense', icon: 'film' },
        { name: 'Medical', type: 'expense', icon: 'medical' },
        { name: 'Education', type: 'expense', icon: 'book' },
        { name: 'Travel', type: 'expense', icon: 'airplane' },
        { name: 'Others (Expense)', type: 'expense', icon: 'help' }
      ];
      for (const cat of defaultCategories) {
        this.db.runSync(
          'INSERT OR IGNORE INTO categories (name, type, icon) VALUES (?, ?, ?)',
          [cat.name, cat.type, cat.icon]
        );
      }
    }
  }

  // --- ACCOUNTS ---
  async getAccounts(): Promise<Account[]> {
    return this.db.getAllSync<Account>('SELECT * FROM accounts ORDER BY name ASC');
  }

  async addAccount(account: Omit<Account, 'id'>): Promise<Account> {
    const openingBalance = account.openingBalance ?? account.balance;
    const totalIncome = account.totalIncome ?? 0;
    const totalExpenses = account.totalExpenses ?? 0;
    const result = this.db.runSync(
      `INSERT INTO accounts (name, type, balance, openingBalance, totalIncome, totalExpenses, color, icon)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [account.name, account.type, account.balance, openingBalance, totalIncome, totalExpenses, account.color, account.icon]
    );
    return {
      ...account,
      openingBalance,
      totalIncome,
      totalExpenses,
      id: result.lastInsertRowId
    };
  }

  async updateAccount(account: Account): Promise<void> {
    const oldAccount = this.db.getFirstSync<Account>('SELECT * FROM accounts WHERE id = ?', [account.id]);
    const openingBalanceDelta = oldAccount ? account.openingBalance - oldAccount.openingBalance : 0;
    this.db.runSync(
      `UPDATE accounts
       SET name = ?, type = ?, balance = balance + ?, openingBalance = ?, totalIncome = ?, totalExpenses = ?, color = ?, icon = ?
       WHERE id = ?`,
      [
        account.name,
        account.type,
        openingBalanceDelta,
        account.openingBalance,
        account.totalIncome,
        account.totalExpenses,
        account.color,
        account.icon,
        account.id
      ]
    );
  }

  async deleteAccount(id: number): Promise<void> {
    this.db.runSync('DELETE FROM accounts WHERE id = ?', [id]);
  }

  // --- CATEGORIES ---
  async getCategories(): Promise<Category[]> {
    return this.db.getAllSync<Category>('SELECT * FROM categories ORDER BY name ASC');
  }

  async addCategory(category: Omit<Category, 'id'>): Promise<Category> {
    const result = this.db.runSync(
      'INSERT INTO categories (name, type, icon) VALUES (?, ?, ?)',
      [category.name, category.type, category.icon]
    );
    return {
      ...category,
      id: result.lastInsertRowId
    };
  }

  async deleteCategory(id: number): Promise<void> {
    this.db.runSync('DELETE FROM categories WHERE id = ?', [id]);
  }

  // --- TRANSACTIONS ---
  async getTransactions(filters?: TransactionFilters): Promise<Transaction[]> {
    let query = 'SELECT * FROM transactions WHERE 1=1';
    const params: any[] = [];

    if (filters) {
      if (filters.startDate) {
        query += ' AND date >= ?';
        params.push(filters.startDate);
      }
      if (filters.endDate) {
        query += ' AND date <= ?';
        params.push(filters.endDate);
      }
      if (filters.accountId) {
        query += ' AND (accountId = ? OR toAccountId = ?)';
        params.push(filters.accountId, filters.accountId);
      }
      if (filters.categoryId) {
        query += ' AND categoryId = ?';
        params.push(filters.categoryId);
      }
      if (filters.type) {
        query += ' AND type = ?';
        params.push(filters.type);
      }
      if (filters.searchQuery) {
        query += ' AND note LIKE ?';
        params.push(`%${filters.searchQuery}%`);
      }
    }

    query += ' ORDER BY date DESC, id DESC';
    return this.db.getAllSync<Transaction>(query, ...params);
  }

  async addTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    const result = this.db.runSync(
      `INSERT INTO transactions
       (type, amount, accountId, toAccountId, categoryId, date, source, merchantName, note, receiptUri, tags, isRecurring, recurringInterval)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction.type,
        transaction.amount,
        transaction.accountId,
        transaction.toAccountId || null,
        transaction.categoryId || null,
        transaction.date,
        transaction.source || '',
        transaction.merchantName || '',
        transaction.note || '',
        transaction.receiptUri || '',
        transaction.tags || '',
        transaction.isRecurring,
        transaction.recurringInterval
      ]
    );

    const newTransaction = {
      ...transaction,
      id: result.lastInsertRowId
    };

    // Update account balances
    await this.applyTransactionBalances(newTransaction);

    return newTransaction;
  }

  async updateTransaction(transaction: Transaction): Promise<void> {
    // 1. Fetch old transaction
    const oldTx = this.db.getFirstSync<Transaction>('SELECT * FROM transactions WHERE id = ?', [transaction.id]);
    if (!oldTx) {
      throw new Error(`Transaction with id ${transaction.id} not found.`);
    }

    // 2. Reverse old balances
    await this.reverseTransactionBalances(oldTx);

    // 3. Update transaction row
    this.db.runSync(
      `UPDATE transactions 
       SET type = ?, amount = ?, accountId = ?, toAccountId = ?, categoryId = ?, date = ?, source = ?, merchantName = ?, note = ?, receiptUri = ?, tags = ?, isRecurring = ?, recurringInterval = ?
       WHERE id = ?`,
      [
        transaction.type,
        transaction.amount,
        transaction.accountId,
        transaction.toAccountId || null,
        transaction.categoryId || null,
        transaction.date,
        transaction.source || '',
        transaction.merchantName || '',
        transaction.note || '',
        transaction.receiptUri || '',
        transaction.tags || '',
        transaction.isRecurring,
        transaction.recurringInterval,
        transaction.id
      ]
    );

    // 4. Apply new balances
    await this.applyTransactionBalances(transaction);
  }

  async deleteTransaction(id: number): Promise<void> {
    const oldTx = this.db.getFirstSync<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
    if (oldTx) {
      await this.reverseTransactionBalances(oldTx);
    }
    this.db.runSync('DELETE FROM transactions WHERE id = ?', [id]);
  }

  // --- BUDGETS ---
  async getBudgets(month: string): Promise<Budget[]> {
    return this.db.getAllSync<Budget>('SELECT * FROM budgets WHERE month = ?', [month]);
  }

  async setBudget(categoryId: number, amount: number, month: string): Promise<void> {
    this.db.runSync(
      `INSERT OR REPLACE INTO budgets (categoryId, amount, month)
       VALUES (?, ?, ?)`,
      [categoryId, amount, month]
    );
  }

  // --- SETTINGS ---
  async getSettings(): Promise<Settings> {
    const settings = this.db.getFirstSync<Settings>('SELECT * FROM settings LIMIT 1');
    if (!settings) {
      // Fallback
      return { id: 1, financialMonthStart: 1, carryForwardEnabled: 1, currency: '₹' };
    }
    return settings;
  }

  async updateSettings(settings: Partial<Settings>): Promise<void> {
    const current = await this.getSettings();
    const financialMonthStart = settings.financialMonthStart !== undefined ? settings.financialMonthStart : current.financialMonthStart;
    const carryForwardEnabled = settings.carryForwardEnabled !== undefined ? settings.carryForwardEnabled : current.carryForwardEnabled;
    const currency = settings.currency !== undefined ? settings.currency : current.currency;

    this.db.runSync(
      'UPDATE settings SET financialMonthStart = ?, carryForwardEnabled = ?, currency = ? WHERE id = ?',
      [financialMonthStart, carryForwardEnabled, currency, current.id]
    );
  }

  // --- HELPER METHODS FOR BALANCES ---
  private async applyTransactionBalances(tx: Transaction): Promise<void> {
    if (tx.type === 'income') {
      this.db.runSync('UPDATE accounts SET balance = balance + ?, totalIncome = totalIncome + ? WHERE id = ?', [tx.amount, tx.amount, tx.accountId]);
    } else if (tx.type === 'expense') {
      this.db.runSync('UPDATE accounts SET balance = balance - ?, totalExpenses = totalExpenses + ? WHERE id = ?', [tx.amount, tx.amount, tx.accountId]);
    } else if (tx.type === 'transfer' && tx.toAccountId) {
      this.db.runSync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [tx.amount, tx.accountId]);
      this.db.runSync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [tx.amount, tx.toAccountId]);
    }
  }

  private async reverseTransactionBalances(tx: Transaction): Promise<void> {
    if (tx.type === 'income') {
      this.db.runSync('UPDATE accounts SET balance = balance - ?, totalIncome = totalIncome - ? WHERE id = ?', [tx.amount, tx.amount, tx.accountId]);
    } else if (tx.type === 'expense') {
      this.db.runSync('UPDATE accounts SET balance = balance + ?, totalExpenses = totalExpenses - ? WHERE id = ?', [tx.amount, tx.amount, tx.accountId]);
    } else if (tx.type === 'transfer' && tx.toAccountId) {
      this.db.runSync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [tx.amount, tx.accountId]);
      this.db.runSync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [tx.amount, tx.toAccountId]);
    }
  }

  private ensureAccountColumns(): void {
    const columns = this.db.getAllSync<{ name: string }>('PRAGMA table_info(accounts)');
    const names = new Set(columns.map(col => col.name));
    if (!names.has('openingBalance')) {
      this.db.execSync('ALTER TABLE accounts ADD COLUMN openingBalance REAL DEFAULT 0');
    }
    if (!names.has('totalIncome')) {
      this.db.execSync('ALTER TABLE accounts ADD COLUMN totalIncome REAL DEFAULT 0');
    }
    if (!names.has('totalExpenses')) {
      this.db.execSync('ALTER TABLE accounts ADD COLUMN totalExpenses REAL DEFAULT 0');
    }
  }

  private ensureTransactionColumns(): void {
    const columns = this.db.getAllSync<{ name: string }>('PRAGMA table_info(transactions)');
    const names = new Set(columns.map(col => col.name));
    if (!names.has('source')) {
      this.db.execSync('ALTER TABLE transactions ADD COLUMN source TEXT DEFAULT ""');
    }
    if (!names.has('merchantName')) {
      this.db.execSync('ALTER TABLE transactions ADD COLUMN merchantName TEXT DEFAULT ""');
    }
    if (!names.has('receiptUri')) {
      this.db.execSync('ALTER TABLE transactions ADD COLUMN receiptUri TEXT DEFAULT ""');
    }
    if (!names.has('tags')) {
      this.db.execSync('ALTER TABLE transactions ADD COLUMN tags TEXT DEFAULT ""');
    }
  }

  private backfillAccountStats(): void {
    const accounts = this.db.getAllSync<Account>('SELECT * FROM accounts');
    const transactions = this.db.getAllSync<Transaction>('SELECT * FROM transactions');

    for (const account of accounts) {
      let income = 0;
      let expenses = 0;
      let transferNet = 0;

      for (const tx of transactions) {
        if (tx.type === 'income' && tx.accountId === account.id) {
          income += tx.amount;
        } else if (tx.type === 'expense' && tx.accountId === account.id) {
          expenses += tx.amount;
        } else if (tx.type === 'transfer') {
          if (tx.accountId === account.id) transferNet -= tx.amount;
          if (tx.toAccountId === account.id) transferNet += tx.amount;
        }
      }

      const openingBalance = account.balance - income + expenses - transferNet;
      this.db.runSync(
        'UPDATE accounts SET openingBalance = ?, totalIncome = ?, totalExpenses = ? WHERE id = ?',
        [openingBalance, income, expenses, account.id]
      );
    }
  }
}
