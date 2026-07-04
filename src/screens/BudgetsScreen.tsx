import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { setBudgetThunk, setBudgetMonth } from '../store/financeSlice';
import { COLORS, SPACING, RADIUS, SHADOWS, globalStyles } from '../theme/theme';
import { formatCurrency, getCurrentMonth, getFinancialMonthRange } from '../utils/formatters';
import { Category } from '../db/database';

export default function BudgetsScreen() {
  const dispatch = useAppDispatch();
  const { budgets, categories, transactions, settings, currentBudgetMonth } = useAppSelector(s => s.finance);

  const expenseCategories = useMemo(
    () => categories.filter(c => c.type === 'expense'),
    [categories]
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [budgetAmount, setBudgetAmountStr] = useState('');

  const monthRange = useMemo(() => getFinancialMonthRange(settings), [settings]);

  const periodExpenses = useMemo(() => {
    const map = new Map<number, number>();
    transactions
      .filter(t => t.type === 'expense' && t.date >= monthRange.start && t.date <= monthRange.end)
      .forEach(t => {
        if (t.categoryId) {
          map.set(t.categoryId, (map.get(t.categoryId) || 0) + t.amount);
        }
      });
    return map;
  }, [transactions, monthRange]);

  const budgetMap = useMemo(() => {
    const map = new Map<number, number>();
    budgets.forEach(b => map.set(b.categoryId, b.amount));
    return map;
  }, [budgets]);

  const openSetBudget = (cat: Category) => {
    setSelectedCat(cat);
    const existing = budgetMap.get(cat.id);
    setBudgetAmountStr(existing ? existing.toString() : '');
    setModalVisible(true);
  };

  const handleSaveBudget = async () => {
    if (!selectedCat) return;
    const amt = parseFloat(budgetAmount);
    if (isNaN(amt) || amt < 0) {
      Alert.alert('Error', 'Please enter a valid budget amount.');
      return;
    }
    await dispatch(setBudgetThunk({ categoryId: selectedCat.id, amount: amt, month: currentBudgetMonth }));
    setModalVisible(false);
  };

  const totalBudget = useMemo(() => budgets.reduce((s, b) => s + b.amount, 0), [budgets]);
  const totalSpent = useMemo(() => {
    let sum = 0;
    budgets.forEach(b => { sum += periodExpenses.get(b.categoryId) || 0; });
    return sum;
  }, [budgets, periodExpenses]);

  const currency = settings.currency;

  return (
    <SafeAreaView style={globalStyles.screenContainer} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Budgets</Text>
            <Text style={styles.subtitle}>{currentBudgetMonth.replace('-', ' / ')}</Text>
          </View>
        </View>

        {/* Overview Card */}
        {budgets.length > 0 && (
          <View style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>Total Budget Used</Text>
            <Text style={styles.overviewAmount}>{formatCurrency(totalSpent, currency)}</Text>
            <Text style={styles.overviewTotal}>of {formatCurrency(totalBudget, currency)}</Text>
            <View style={styles.totalTrack}>
              <View
                style={[
                  styles.totalFill,
                  {
                    width: `${Math.min((totalSpent / Math.max(totalBudget, 1)) * 100, 100)}%` as any,
                    backgroundColor: totalSpent > totalBudget ? COLORS.expense : COLORS.income,
                  }
                ]}
              />
            </View>
          </View>
        )}

        {/* Categories with Budgets */}
        <Text style={[globalStyles.sectionTitle, { marginBottom: SPACING.sm }]}>Category Budgets</Text>
        <Text style={styles.hint}>Tap any category to set or update its budget</Text>

        {expenseCategories.map(cat => {
          const spent = periodExpenses.get(cat.id) || 0;
          const budget = budgetMap.get(cat.id);
          const hasBudget = budget !== undefined && budget > 0;
          const pct = hasBudget ? Math.min(spent / budget!, 1) : 0;
          const barColor = pct < 0.7 ? COLORS.income : pct < 0.9 ? COLORS.transfer : COLORS.expense;

          return (
            <TouchableOpacity
              key={cat.id}
              style={styles.catCard}
              onPress={() => openSetBudget(cat)}
              activeOpacity={0.8}
            >
              <View style={[styles.catIcon, { backgroundColor: (hasBudget ? barColor : COLORS.textMuted) + '22' }]}>
                <Ionicons name={cat.icon as any} size={20} color={hasBudget ? barColor : COLORS.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={globalStyles.spaceBetween}>
                  <Text style={styles.catName}>{cat.name}</Text>
                  {hasBudget ? (
                    <Text style={styles.catBudgetText}>
                      {formatCurrency(spent, currency)} / {formatCurrency(budget!, currency)}
                    </Text>
                  ) : (
                    <Text style={styles.noBudgetText}>Tap to set</Text>
                  )}
                </View>
                {hasBudget ? (
                  <>
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${pct * 100}%` as any, backgroundColor: barColor }]} />
                    </View>
                    <Text style={[styles.pctText, { color: barColor }]}>{Math.round(pct * 100)}% used</Text>
                  </>
                ) : (
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: spent > 0 ? '100%' : '0%', backgroundColor: COLORS.textMuted + '66' }]} />
                  </View>
                )}
                {spent > 0 && !hasBudget && (
                  <Text style={styles.spentText}>Spent: {formatCurrency(spent, currency)}</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* Set Budget Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            {selectedCat && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalCatIcon, { backgroundColor: COLORS.expense + '22' }]}>
                    <Ionicons name={selectedCat.icon as any} size={24} color={COLORS.expense} />
                  </View>
                  <Text style={styles.modalTitle}>Budget for {selectedCat.name}</Text>
                </View>
                <Text style={[globalStyles.label, { marginTop: SPACING.md }]}>Monthly Budget Amount</Text>
                <View style={styles.amountRow}>
                  <Text style={styles.currencySymbol}>{currency}</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={budgetAmount}
                    onChangeText={setBudgetAmountStr}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={COLORS.textMuted}
                    autoFocus
                  />
                </View>
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveBudget}>
                    <Text style={styles.saveBtnText}>Set Budget</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.lg },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  overviewCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, padding: SPACING.lg,
    marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
    ...SHADOWS.card,
  },
  overviewLabel: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 1.2, fontWeight: '700' },
  overviewAmount: { fontSize: 36, fontWeight: '900', color: COLORS.textPrimary, marginTop: 4 },
  overviewTotal: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  totalTrack: {
    height: 8, backgroundColor: COLORS.bgInput, borderRadius: 4,
    marginTop: SPACING.md, overflow: 'hidden', width: '100%',
  },
  totalFill: { height: 8, borderRadius: 4 },
  hint: { fontSize: 12, color: COLORS.textMuted, marginBottom: SPACING.md, fontStyle: 'italic' },
  catCard: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, gap: SPACING.md, ...SHADOWS.card,
  },
  catIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  catBudgetText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  noBudgetText: { fontSize: 12, color: COLORS.accentLight, fontWeight: '600' },
  track: { height: 6, backgroundColor: COLORS.bgInput, borderRadius: 3, marginTop: SPACING.sm, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  pctText: { fontSize: 11, marginTop: 4, fontWeight: '600' },
  spentText: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.bgModal, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg, paddingTop: SPACING.md,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.textMuted, alignSelf: 'center', marginBottom: SPACING.md },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  modalCatIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  amountRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.xs, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm },
  currencySymbol: { fontSize: 24, fontWeight: '800', color: COLORS.textSecondary },
  amountInput: { flex: 1, fontSize: 32, fontWeight: '900', color: COLORS.textPrimary },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  cancelBtn: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.bgInput, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 15 },
  saveBtn: { flex: 2, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.accent, alignItems: 'center', ...SHADOWS.fab },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
