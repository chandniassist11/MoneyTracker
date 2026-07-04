import { Platform } from 'react-native';
import { FinanceService } from './types';
import { SQLiteFinanceService } from './sqliteService';
import { AsyncStorageFinanceService } from './asyncStorageService';

export const dbService: FinanceService = Platform.OS === 'web'
  ? new AsyncStorageFinanceService()
  : new SQLiteFinanceService();

export * from './types';
export * from './sqliteService';
export * from './asyncStorageService';
