import { Platform } from 'react-native';
import Papa from 'papaparse';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Transaction, Account, Category } from '../db/database';

export interface CSVRow {
  Date: string;
  Type: string;
  Amount: string;
  Account: string;
  'To Account'?: string;
  Category?: string;
  Source?: string;
  Merchant?: string;
  Note?: string;
  Tags?: string;
  Receipt?: string;
}

export const exportTransactionsToCSV = async (
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[]
): Promise<void> => {
  const accountMap = new Map(accounts.map(a => [a.id, a.name]));
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  const csvRows: CSVRow[] = transactions.map(t => ({
    Date: t.date,
    Type: t.type,
    Amount: t.amount.toString(),
    Account: accountMap.get(t.accountId) || 'Unknown Account',
    'To Account': t.toAccountId ? accountMap.get(t.toAccountId) || '' : '',
    Category: t.categoryId ? categoryMap.get(t.categoryId) || '' : '',
    Source: t.source || '',
    Merchant: t.merchantName || '',
    Note: t.note || '',
    Tags: t.tags || '',
    Receipt: t.receiptUri || ''
  }));

  const csvString = Papa.unparse(csvRows);
  const filename = `money_tracker_export_${new Date().toISOString().split('T')[0]}.csv`;

  if (Platform.OS === 'web') {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    const fileUri = (FileSystem.documentDirectory || '') + filename;
    await FileSystem.writeAsStringAsync(fileUri, csvString, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export Transactions' });
    } else {
      throw new Error('Sharing is not available on this platform.');
    }
  }
};

export interface CSVImportPreview {
  valid: boolean;
  transactions: Omit<Transaction, 'id'>[];
  errors: string[];
  totalRows: number;
}

export const parseCSVString = (csvString: string): Promise<CSVRow[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data as CSVRow[]);
      },
      error: (error: Error) => {
        reject(error);
      }
    });
  });
};

export const validateAndPrepareCSVImport = async (
  rows: CSVRow[],
  accounts: Account[],
  categories: Category[]
): Promise<CSVImportPreview> => {
  const errors: string[] = [];
  const validTransactions: Omit<Transaction, 'id'>[] = [];

  const accountMap = new Map(accounts.map(a => [a.name.toLowerCase(), a]));
  const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c]));

  rows.forEach((row, index) => {
    const rowNum = index + 1;
    const {
      Date: date,
      Type: type,
      Amount: amountStr,
      Account: accName,
      'To Account': toAccName,
      Category: catName,
      Source: source,
      Merchant: merchantName,
      Note: note,
      Tags: tags,
      Receipt: receiptUri
    } = row;

    if (!date || !type || !amountStr || !accName) {
      errors.push(`Row ${rowNum}: Missing required fields (Date, Type, Amount, and Account are mandatory).`);
      return;
    }

    // 1. Validate Date (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      errors.push(`Row ${rowNum}: Invalid date format "${date}". Must be YYYY-MM-DD.`);
      return;
    }

    // 2. Validate Type
    const txType = type.toLowerCase().trim();
    if (txType !== 'income' && txType !== 'expense' && txType !== 'transfer') {
      errors.push(`Row ${rowNum}: Invalid type "${type}". Must be "income", "expense", or "transfer".`);
      return;
    }

    // 3. Validate Amount
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      errors.push(`Row ${rowNum}: Invalid amount "${amountStr}". Must be a number greater than 0.`);
      return;
    }

    // 4. Validate Accounts
    const mainAccount = accountMap.get(accName.toLowerCase().trim());
    if (!mainAccount) {
      errors.push(`Row ${rowNum}: Account "${accName}" not found in current accounts.`);
      return;
    }

    let toAccountId: number | undefined = undefined;
    if (txType === 'transfer') {
      if (!toAccName) {
        errors.push(`Row ${rowNum}: "To Account" is required for transfer transactions.`);
        return;
      }
      const destAccount = accountMap.get(toAccName.toLowerCase().trim());
      if (!destAccount) {
        errors.push(`Row ${rowNum}: Destination Account "${toAccName}" not found in current accounts.`);
        return;
      }
      if (mainAccount.id === destAccount.id) {
        errors.push(`Row ${rowNum}: Source and destination accounts for transfers must be different.`);
        return;
      }
      toAccountId = destAccount.id;
    }

    // 5. Validate Categories (for Income/Expense)
    let categoryId: number | undefined = undefined;
    if (txType !== 'transfer') {
      if (!catName) {
        errors.push(`Row ${rowNum}: Category is required for ${txType} transactions.`);
        return;
      }
      const category = categoryMap.get(catName.toLowerCase().trim());
      if (!category) {
        errors.push(`Row ${rowNum}: Category "${catName}" not found. Create it first or choose a default.`);
        return;
      }
      if (category.type !== txType) {
        errors.push(`Row ${rowNum}: Category "${catName}" has type "${category.type}", which does not match transaction type "${txType}".`);
        return;
      }
      categoryId = category.id;
    }

    validTransactions.push({
      type: txType as 'income' | 'expense' | 'transfer',
      amount,
      accountId: mainAccount.id,
      toAccountId,
      categoryId,
      date,
      source: source || '',
      merchantName: merchantName || '',
      note: note || '',
      receiptUri: receiptUri || '',
      tags: tags || '',
      isRecurring: 0,
      recurringInterval: 'none'
    });
  });

  return {
    valid: errors.length === 0,
    transactions: validTransactions,
    errors,
    totalRows: rows.length
  };
};
