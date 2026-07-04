import { StyleSheet } from 'react-native';

export const COLORS = {
  // Backgrounds
  bg: '#0F1628',
  bgCard: '#1A2540',
  bgCardLight: '#1E2D4D',
  bgInput: '#243050',
  bgModal: '#131E36',

  // Borders
  border: 'rgba(255,255,255,0.09)',
  borderStrong: 'rgba(255,255,255,0.15)',

  // Brand Accents
  accent: '#6366F1',       // Indigo primary
  accentLight: '#818CF8',  // Lighter indigo for text
  accentDark: '#4F46E5',   // Darker indigo for presses
  accentViolet: '#8B5CF6', // Violet secondary

  // Status Colors
  income: '#10B981',       // Emerald green - income
  incomeLight: '#34D399',
  incomeBg: 'rgba(16, 185, 129, 0.12)',
  expense: '#EF4444',      // Red - expense
  expenseLight: '#F87171',
  expenseBg: 'rgba(239, 68, 68, 0.12)',
  transfer: '#F59E0B',     // Amber - transfer
  transferLight: '#FCD34D',
  transferBg: 'rgba(245, 158, 11, 0.12)',

  // Text
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textWhite: '#FFFFFF',

  // Account Colors
  cash: '#10B981',
  upi: '#6366F1',
  debit: '#3B82F6',
  credit: '#EF4444',
  bank: '#8B5CF6',
  wallet: '#F59E0B',

  // Budget Progress
  budgetSafe: '#10B981',
  budgetWarn: '#F59E0B',
  budgetDanger: '#EF4444',

  // Chart Colors
  chart: ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6', '#EC4899', '#14B8A6'],

  // Tab
  tabActive: '#6366F1',
  tabInactive: '#475569',
  tabBar: '#131E36',
};

export const FONTS = {
  regular: undefined, // Uses system default sans-serif
  medium: undefined,
  bold: undefined,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  fab: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  }
};

export const globalStyles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    letterSpacing: 0.3,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  amount: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  balancePositive: {
    color: COLORS.income,
  },
  balanceNegative: {
    color: COLORS.expense,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chip: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  chipText: {
    fontSize: 12,
    color: COLORS.accentLight,
    fontWeight: '600',
  },
  incomeChip: {
    backgroundColor: COLORS.incomeBg,
    borderColor: COLORS.income,
  },
  expenseChip: {
    backgroundColor: COLORS.expenseBg,
    borderColor: COLORS.expense,
  },
  transferChip: {
    backgroundColor: COLORS.transferBg,
    borderColor: COLORS.transfer,
  },
  incomeText: {
    color: COLORS.income,
    fontWeight: '600',
  },
  expenseText: {
    color: COLORS.expense,
    fontWeight: '600',
  },
  transferText: {
    color: COLORS.transfer,
    fontWeight: '600',
  },
});
