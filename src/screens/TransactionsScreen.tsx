import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { deleteTransactionThunk } from '../store/financeSlice';
import { COLORS, SPACING, RADIUS, globalStyles } from '../theme/theme';
import { formatCurrency, formatShortDate } from '../utils/formatters';
import { Transaction } from '../db/database';

const FILTER_OPTIONS = ['All', 'Income', 'Expense', 'Transfer'];

export default function TransactionsScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { transactions, accounts, categories, settings } = useAppSelector(s => s.finance);
  const currency = settings.currency;

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  const filtered = useMemo(() => {
    let list = transactions;
    if (activeFilter !== 'All') {
      list = list.filter(t => t.type === activeFilter.toLowerCase());
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        (t.note || '').toLowerCase().includes(q) ||
        (t.source || '').toLowerCase().includes(q) ||
        (t.merchantName || '').toLowerCase().includes(q) ||
        (t.tags || '').toLowerCase().includes(q) ||
        (accountMap.get(t.accountId)?.name || '').toLowerCase().includes(q) ||
        (t.categoryId ? categoryMap.get(t.categoryId)?.name || '' : '').toLowerCase().includes(q) ||
        t.amount.toString().includes(q)
      );
    }
    return list;
  }, [transactions, activeFilter, search, accountMap, categoryMap]);

  const handleDelete = (tx: Transaction) => {
    Alert.alert('Delete Transaction', 'Are you sure you want to delete this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(deleteTransactionThunk(tx.id)) }
    ]);
  };

  const colorMap: Record<string, string> = {
    income: COLORS.income,
    expense: COLORS.expense,
    transfer: COLORS.transfer,
  };
  const iconMap: Record<string, string> = {
    income: 'arrow-down-circle',
    expense: 'arrow-up-circle',
    transfer: 'swap-horizontal',
  };

  const renderItem = ({ item: tx }: { item: Transaction }) => {
    const acc = accountMap.get(tx.accountId);
    const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : null;
    const color = colorMap[tx.type];
    const title = tx.type === 'income'
      ? tx.source || cat?.name || 'Income'
      : tx.type === 'expense'
        ? tx.merchantName || cat?.name || 'Expense'
        : 'Transfer';
    const subtitle = [cat?.name, acc?.name, formatShortDate(tx.date)].filter(Boolean).join(' · ');
    return (
      <TouchableOpacity
        style={styles.txCard}
        onLongPress={() => handleDelete(tx)}
        onPress={() => navigation.navigate('TransactionEntry', { transaction: tx })}
        activeOpacity={0.8}
      >
        <View style={[styles.txIcon, { backgroundColor: color + '22' }]}>
          <Ionicons name={iconMap[tx.type] as any} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.txTitle}>{title}</Text>
          <Text style={styles.txSub}>{subtitle}</Text>
          {tx.note ? <Text style={styles.txNote}>{tx.note}</Text> : null}
          {tx.tags ? <Text style={styles.txTags}>{tx.tags}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.txAmount, { color }]}>
            {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '↔' : '-'}{formatCurrency(tx.amount, currency)}
          </Text>
          {tx.receiptUri ? (
            <Ionicons name="image-outline" size={15} color={COLORS.textMuted} style={{ marginTop: 5 }} />
          ) : null}
          {tx.isRecurring === 1 && (
            <View style={styles.recurBadge}>
              <Ionicons name="repeat" size={10} color={COLORS.accent} />
              <Text style={styles.recurText}>{tx.recurringInterval}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={globalStyles.screenContainer} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('TransactionEntry', { type: 'expense' })}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search transactions..."
          placeholderTextColor={COLORS.textMuted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, activeFilter === f && styles.filterBtnActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Count */}
      <Text style={styles.count}>{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</Text>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
  },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary },
  addBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md, marginHorizontal: SPACING.md, marginBottom: SPACING.sm,
    padding: SPACING.md, gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 15 },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: SPACING.md, gap: SPACING.xs, marginBottom: SPACING.xs,
  },
  filterBtn: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
  },
  filterBtnActive: { backgroundColor: COLORS.accent + '30', borderColor: COLORS.accent },
  filterText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  filterTextActive: { color: COLORS.accentLight },
  count: { fontSize: 12, color: COLORS.textMuted, paddingHorizontal: SPACING.md, marginBottom: SPACING.xs },
  list: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xxl },
  txCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm,
  },
  txIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  txTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  txSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  txNote: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontStyle: 'italic' },
  txTags: { fontSize: 11, color: COLORS.accentLight, marginTop: 3, fontWeight: '600' },
  txAmount: { fontSize: 15, fontWeight: '800' },
  recurBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4,
    backgroundColor: COLORS.accent + '20', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  recurText: { fontSize: 10, color: COLORS.accentLight, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.sm },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '600' },
});
