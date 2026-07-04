import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { dbService, Account, Category, Transaction, Budget, Settings, TransactionFilters } from '../db/database';

interface FinanceState {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  settings: Settings;
  currentBudgetMonth: string; // YYYY-MM
  filters: TransactionFilters;
  loading: {
    db: boolean;
    accounts: boolean;
    categories: boolean;
    transactions: boolean;
    budgets: boolean;
    settings: boolean;
  };
  error: string | null;
}

const getInitialMonth = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const initialState: FinanceState = {
  accounts: [],
  categories: [],
  transactions: [],
  budgets: [],
  settings: { id: 1, financialMonthStart: 1, carryForwardEnabled: 1, currency: '₹' },
  currentBudgetMonth: getInitialMonth(),
  filters: {},
  loading: {
    db: false,
    accounts: false,
    categories: false,
    transactions: false,
    budgets: false,
    settings: false
  },
  error: null
};

// --- ASYNC THUNKS ---

export const initDbThunk = createAsyncThunk(
  'finance/initDb',
  async (_, { dispatch }) => {
    await dbService.initDb();
    await dispatch(fetchSettingsThunk());
    await dispatch(fetchAccountsThunk());
    await dispatch(fetchCategoriesThunk());
    await dispatch(fetchTransactionsThunk());
    const initialMonth = getInitialMonth();
    await dispatch(fetchBudgetsThunk(initialMonth));
  }
);

export const fetchAccountsThunk = createAsyncThunk(
  'finance/fetchAccounts',
  async () => {
    return await dbService.getAccounts();
  }
);

export const addAccountThunk = createAsyncThunk(
  'finance/addAccount',
  async (account: Omit<Account, 'id'>, { dispatch }) => {
    const newAcc = await dbService.addAccount(account);
    dispatch(fetchAccountsThunk());
    return newAcc;
  }
);

export const updateAccountThunk = createAsyncThunk(
  'finance/updateAccount',
  async (account: Account, { dispatch }) => {
    await dbService.updateAccount(account);
    dispatch(fetchAccountsThunk());
  }
);

export const deleteAccountThunk = createAsyncThunk(
  'finance/deleteAccount',
  async (id: number, { dispatch }) => {
    await dbService.deleteAccount(id);
    dispatch(fetchAccountsThunk());
    dispatch(fetchTransactionsThunk());
  }
);

export const fetchCategoriesThunk = createAsyncThunk(
  'finance/fetchCategories',
  async () => {
    return await dbService.getCategories();
  }
);

export const addCategoryThunk = createAsyncThunk(
  'finance/addCategory',
  async (category: Omit<Category, 'id'>, { dispatch }) => {
    const newCat = await dbService.addCategory(category);
    dispatch(fetchCategoriesThunk());
    return newCat;
  }
);

export const deleteCategoryThunk = createAsyncThunk(
  'finance/deleteCategory',
  async (id: number, { dispatch }) => {
    await dbService.deleteCategory(id);
    dispatch(fetchCategoriesThunk());
    dispatch(fetchTransactionsThunk());
  }
);

export const fetchTransactionsThunk = createAsyncThunk(
  'finance/fetchTransactions',
  async (_, { getState }) => {
    const state = getState() as { finance: FinanceState };
    return await dbService.getTransactions(state.finance.filters);
  }
);

export const addTransactionThunk = createAsyncThunk(
  'finance/addTransaction',
  async (transaction: Omit<Transaction, 'id'>, { dispatch }) => {
    const newTx = await dbService.addTransaction(transaction);
    dispatch(fetchTransactionsThunk());
    dispatch(fetchAccountsThunk());
    return newTx;
  }
);

export const updateTransactionThunk = createAsyncThunk(
  'finance/updateTransaction',
  async (transaction: Transaction, { dispatch }) => {
    await dbService.updateTransaction(transaction);
    dispatch(fetchTransactionsThunk());
    dispatch(fetchAccountsThunk());
  }
);

export const deleteTransactionThunk = createAsyncThunk(
  'finance/deleteTransaction',
  async (id: number, { dispatch }) => {
    await dbService.deleteTransaction(id);
    dispatch(fetchTransactionsThunk());
    dispatch(fetchAccountsThunk());
  }
);

export const fetchBudgetsThunk = createAsyncThunk(
  'finance/fetchBudgets',
  async (month: string) => {
    return await dbService.getBudgets(month);
  }
);

export const setBudgetThunk = createAsyncThunk(
  'finance/setBudget',
  async ({ categoryId, amount, month }: { categoryId: number; amount: number; month: string }, { dispatch }) => {
    await dbService.setBudget(categoryId, amount, month);
    dispatch(fetchBudgetsThunk(month));
  }
);

export const fetchSettingsThunk = createAsyncThunk(
  'finance/fetchSettings',
  async () => {
    return await dbService.getSettings();
  }
);

export const updateSettingsThunk = createAsyncThunk(
  'finance/updateSettings',
  async (settings: Partial<Settings>, { dispatch }) => {
    await dbService.updateSettings(settings);
    dispatch(fetchSettingsThunk());
    dispatch(fetchTransactionsThunk()); // Settings changes like financialMonthStart might impact date filters
  }
);

// --- SLICE ---

const financeSlice = createSlice({
  name: 'finance',
  initialState,
  reducers: {
    setBudgetMonth(state, action: PayloadAction<string>) {
      state.currentBudgetMonth = action.payload;
    },
    setFilters(state, action: PayloadAction<TransactionFilters>) {
      state.filters = action.payload;
    },
    clearFilters(state) {
      state.filters = {};
    }
  },
  extraReducers: (builder) => {
    // initDb
    builder.addCase(initDbThunk.pending, (state) => {
      state.loading.db = true;
    });
    builder.addCase(initDbThunk.fulfilled, (state) => {
      state.loading.db = false;
      state.error = null;
    });
    builder.addCase(initDbThunk.rejected, (state, action) => {
      state.loading.db = false;
      state.error = action.error.message || 'Failed to initialize database';
    });

    // fetchAccounts
    builder.addCase(fetchAccountsThunk.pending, (state) => {
      state.loading.accounts = true;
    });
    builder.addCase(fetchAccountsThunk.fulfilled, (state, action) => {
      state.loading.accounts = false;
      state.accounts = action.payload;
    });

    // fetchCategories
    builder.addCase(fetchCategoriesThunk.pending, (state) => {
      state.loading.categories = true;
    });
    builder.addCase(fetchCategoriesThunk.fulfilled, (state, action) => {
      state.loading.categories = false;
      state.categories = action.payload;
    });

    // fetchTransactions
    builder.addCase(fetchTransactionsThunk.pending, (state) => {
      state.loading.transactions = true;
    });
    builder.addCase(fetchTransactionsThunk.fulfilled, (state, action) => {
      state.loading.transactions = false;
      state.transactions = action.payload;
    });

    // fetchBudgets
    builder.addCase(fetchBudgetsThunk.pending, (state) => {
      state.loading.budgets = true;
    });
    builder.addCase(fetchBudgetsThunk.fulfilled, (state, action) => {
      state.loading.budgets = false;
      state.budgets = action.payload;
    });

    // fetchSettings
    builder.addCase(fetchSettingsThunk.pending, (state) => {
      state.loading.settings = true;
    });
    builder.addCase(fetchSettingsThunk.fulfilled, (state, action) => {
      state.loading.settings = false;
      state.settings = action.payload;
    });
  }
});

export const { setBudgetMonth, setFilters, clearFilters } = financeSlice.actions;
export default financeSlice.reducer;
