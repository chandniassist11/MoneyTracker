import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../hooks/useRedux';
import { COLORS, SPACING, RADIUS, SHADOWS, globalStyles } from '../theme/theme';
import { formatCurrency, formatShortDate, getFinancialMonthRange } from '../utils/formatters';
import { Transaction } from '../db/database';

// ─── Sub-Components ──────────────────────────────────────────────────────────

function HeaderGradient() {
  return (
    <View style={styles.headerGradient}>
      <View style={styles.headerOrb1} />
      <View style={styles.headerOrb2} />
    </View>
  );
}

function SummaryCard({ income, expense, balance, currency }: { income: number; expense: number; balance: number; currency: string }) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryMain}>
        <Text style={styles.summaryLabel}>CURRENT BALANCE</Text>
        <Text style={[styles.summaryBalance, balance >= 0 ? { color: COLORS.textWhite } : { color: COLORS.expense }]}>
          {formatCurrency(balance, currency)}
        </Text>
      </View>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIconBg, { backgroundColor: COLORS.incomeBg }]}>
            <Ionicons name="arrow-down" size={14} color={COLORS.income} />
          </View>
          <View>
            <Text style={styles.summarySubLabel}>Income</Text>
            <Text style={[styles.summarySubAmount, { color: COLORS.income }]}>
              {formatCurrency(income, currency)}
            </Text>
          </View>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIconBg, { backgroundColor: COLORS.expenseBg }]}>
            <Ionicons name="arrow-up" size={14} color={COLORS.expense} />
          </View>
          <View>
            <Text style={styles.summarySubLabel}>Expense</Text>
            <Text style={[styles.summarySubAmount, { color: COLORS.expense }]}>
              {formatCurrency(expense, currency)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function AccountCard({ name, balance, color, icon, currency }: { name: string; balance: number; color: string; icon: string; currency: string }) {
  return (
    <View style={[styles.accountCard, { borderLeftColor: color }]}>
      <View style={[styles.accountIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.accountName}>{name}</Text>
        <Text style={[styles.accountBalance, { color: balance >= 0 ? COLORS.textPrimary : COLORS.expense }]}>
          {formatCurrency(balance, currency)}
        </Text>
      </View>
    </View>
  );
}

function BudgetProgressBar({ label, spent, total, currency }: { label: string; spent: number; total: number; currency: string }) {
  const pct = total > 0 ? Math.min(spent / total, 1) : 0;
  const color = pct < 0.7 ? COLORS.income : pct < 0.9 ? COLORS.transfer : COLORS.expense;
  return (
    <View style={styles.budgetItem}>
      <View style={globalStyles.spaceBetween}>
        <Text style={styles.budgetLabel}>{label}</Text>
        <Text style={styles.budgetNumbers}>
          {formatCurrency(spent, currency)} / {formatCurrency(total, currency)}
        </Text>
      </View>
      <View style={styles.budgetTrack}>
        <View style={[styles.budgetFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.budgetPct, { color }]}>{Math.round(pct * 100)}% used</Text>
    </View>
  );
}

function TxRow({ tx, accountName, categoryName, currency }: { tx: Transaction; accountName: string; categoryName: string; currency: string }) {
  const isIncome = tx.type === 'income';
  const isTransfer = tx.type === 'transfer';
  const iconMap: Record<string, string> = {
    income: 'arrow-down-circle',
    expense: 'arrow-up-circle',
    transfer: 'swap-horizontal'
  };
  const colorMap: Record<string, string> = {
    income: COLORS.income,
    expense: COLORS.expense,
    transfer: COLORS.transfer
  };

  return (
    <View style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: colorMap[tx.type] + '22' }]}>
        <Ionicons name={iconMap[tx.type] as any} size={20} color={colorMap[tx.type]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.txCat}>{categoryName || accountName}</Text>
        <Text style={styles.txMeta}>{accountName} · {formatShortDate(tx.date)}</Text>
      </View>
      <Text style={[styles.txAmount, { color: isIncome ? COLORS.income : isTransfer ? COLORS.transfer : COLORS.expense }]}>
        {isIncome ? '+' : isTransfer ? '↔' : '-'}{formatCurrency(tx.amount, currency)}
      </Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { accounts, transactions, budgets, categories, settings, loading } = useAppSelector(s => s.finance);

  const monthRange = useMemo(
    () => getFinancialMonthRange(settings),
    [settings]
  );

  const periodTxs = useMemo(
    () => transactions.filter(t => t.date >= monthRange.start && t.date <= monthRange.end),
    [transactions, monthRange]
  );

  const income = useMemo(() => periodTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [periodTxs]);
  const expense = useMemo(() => periodTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [periodTxs]);
  const balance = useMemo(() => accounts.reduce((s, a) => s + a.balance, 0), [accounts]);
  const recentTxs = useMemo(() => transactions.slice(0, 5), [transactions]);

  const currency = settings.currency;

  const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  const budgetItems = useMemo(() => {
    return budgets.map(budget => {
      const cat = categories.find(c => c.id === budget.categoryId);
      const spent = periodTxs
        .filter(t => t.type === 'expense' && t.categoryId === budget.categoryId)
        .reduce((s, t) => s + t.amount, 0);
      return { label: cat?.name || 'Unknown', spent, total: budget.amount };
    });
  }, [budgets, categories, periodTxs]);

  if (loading.db) {
    return (
      <SafeAreaView style={globalStyles.screenContainer}>
        <View style={styles.loadingCenter}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={globalStyles.screenContainer} edges={['top']}>
      <HeaderGradient />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good {getGreeting()} 👋</Text>
            <Text style={styles.period}>
              {formatShortDate(monthRange.start)} – {formatShortDate(monthRange.end)}
            </Text>
          </View>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        <SummaryCard income={income} expense={expense} balance={balance} currency={currency} />

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {[
            { label: 'Income', icon: 'add-circle', color: COLORS.income, type: 'income' },
            { label: 'Expense', icon: 'remove-circle', color: COLORS.expense, type: 'expense' },
            { label: 'Transfer', icon: 'swap-horizontal', color: COLORS.transfer, type: 'transfer' },
          ].map(action => (
            <TouchableOpacity
              key={action.type}
              style={styles.quickBtn}
              onPress={() => navigation.navigate('TransactionEntry', { type: action.type })}
              activeOpacity={0.75}
            >
              <View style={[styles.quickIcon, { backgroundColor: action.color + '20' }]}>
                <Ionicons name={action.icon as any} size={24} color={action.color} />
              </View>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Account Balances */}
        <View style={styles.section}>
          <View style={globalStyles.spaceBetween}>
            <Text style={globalStyles.sectionTitle}>Accounts</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Accounts')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountsScroll}>
            {accounts.map(acc => (
              <AccountCard
                key={acc.id}
                name={acc.name}
                balance={acc.balance}
                color={acc.color}
                icon={acc.icon}
                currency={currency}
              />
            ))}
          </ScrollView>
        </View>

        {/* Budget Progress */}
        {budgetItems.length > 0 && (
          <View style={styles.section}>
            <View style={globalStyles.spaceBetween}>
              <Text style={globalStyles.sectionTitle}>Budget Status</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Budgets')}>
                <Text style={styles.seeAll}>Manage</Text>
              </TouchableOpacity>
            </View>
            <View style={globalStyles.card}>
              {budgetItems.map((b, i) => (
                <View key={i}>
                  <BudgetProgressBar {...b} currency={currency} />
                  {i < budgetItems.length - 1 && <View style={globalStyles.divider} />}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={globalStyles.spaceBetween}>
            <Text style={globalStyles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {recentTxs.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="receipt-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubText}>Tap + to add your first transaction</Text>
            </View>
          ) : (
            <View style={globalStyles.card}>
              {recentTxs.map((tx, i) => (
                <View key={tx.id}>
                  <TxRow
                    tx={tx}
                    accountName={accountMap.get(tx.accountId)?.name || 'Unknown'}
                    categoryName={tx.categoryId ? (categoryMap.get(tx.categoryId)?.name || '') : ''}
                    currency={currency}
                  />
                  {i < recentTxs.length - 1 && <View style={globalStyles.divider} />}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('TransactionEntry', { type: 'expense' })}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={COLORS.textWhite} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  headerGradient: { ...StyleSheet.absoluteFill, overflow: 'hidden', pointerEvents: 'none' as any },
  headerOrb1: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(99,102,241,0.15)', top: -80, left: -60,
  },
  headerOrb2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(139,92,246,0.1)', top: 40, right: -60,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: SPACING.md,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  period: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  settingsBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.bgCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  summaryCard: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginVertical: SPACING.md,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  summaryMain: { marginBottom: SPACING.md },
  summaryLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.2 },
  summaryBalance: { fontSize: 38, fontWeight: '900', color: '#fff', marginTop: 4, letterSpacing: -1 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: SPACING.sm },
  summaryIconBg: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  summaryDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: SPACING.md },
  summarySubLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  summarySubAmount: { fontSize: 15, fontWeight: '700', marginTop: 1 },
  quickActions: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: SPACING.lg, gap: SPACING.sm,
  },
  quickBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    paddingVertical: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  quickIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  section: { marginBottom: SPACING.lg },
  seeAll: { fontSize: 13, color: COLORS.accentLight, fontWeight: '600' },
  accountsScroll: { marginTop: SPACING.sm },
  accountCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: SPACING.md, marginRight: SPACING.sm, minWidth: 150,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 3,
    ...SHADOWS.card,
  },
  accountIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  accountName: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  accountBalance: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  budgetItem: { paddingVertical: SPACING.xs },
  budgetLabel: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '600' },
  budgetNumbers: { fontSize: 12, color: COLORS.textSecondary },
  budgetTrack: {
    height: 6, backgroundColor: COLORS.bgInput, borderRadius: 3,
    marginTop: SPACING.sm, overflow: 'hidden',
  },
  budgetFill: { height: 6, borderRadius: 3 },
  budgetPct: { fontSize: 11, marginTop: 4, fontWeight: '600' },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xs },
  txIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  txCat: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  txMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.sm },
  emptyText: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary },
  emptySubText: { fontSize: 13, color: COLORS.textMuted },
  fab: {
    position: 'absolute', right: SPACING.md,
    bottom: Platform.OS === 'web' ? SPACING.md : SPACING.xl + SPACING.lg,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.fab,
  },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16, color: COLORS.textSecondary },
});
