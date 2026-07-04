import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { addAccountThunk, updateAccountThunk, deleteAccountThunk } from '../store/financeSlice';
import { COLORS, SPACING, RADIUS, SHADOWS, globalStyles } from '../theme/theme';
import { formatCurrency } from '../utils/formatters';
import { Account } from '../db/database';

const ACCOUNT_TYPES = ['Cash', 'UPI', 'Debit Card', 'Credit Card', 'Bank Account', 'Wallet', 'Custom'];

const ACCOUNT_COLORS = [
  '#10B981', '#6366F1', '#3B82F6', '#EF4444',
  '#8B5CF6', '#F59E0B', '#EC4899', '#14B8A6', '#F97316'
];

const ACCOUNT_ICONS = [
  'cash', 'wallet', 'card', 'card-outline', 'business', 'wallet-outline',
  'briefcase', 'phone-portrait', 'globe', 'trending-up'
];

interface AccountFormState {
  name: string;
  type: string;
  balance: string;
  color: string;
  icon: string;
}

const defaultForm: AccountFormState = {
  name: '',
  type: 'Cash',
  balance: '0',
  color: ACCOUNT_COLORS[0],
  icon: ACCOUNT_ICONS[0],
};

export default function AccountsScreen() {
  const dispatch = useAppDispatch();
  const { accounts, settings } = useAppSelector(s => s.finance);
  const currency = settings.currency;

  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [form, setForm] = useState<AccountFormState>(defaultForm);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  const openAddModal = () => {
    setEditingAccount(null);
    setForm(defaultForm);
    setModalVisible(true);
  };

  const openEditModal = (acc: Account) => {
    setEditingAccount(acc);
    setForm({ name: acc.name, type: acc.type, balance: acc.openingBalance.toString(), color: acc.color, icon: acc.icon });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Error', 'Account name is required.');
      return;
    }
    const balanceNum = parseFloat(form.balance) || 0;

    if (editingAccount) {
      await dispatch(updateAccountThunk({
        ...editingAccount,
        name: form.name.trim(),
        type: form.type,
        openingBalance: balanceNum,
        color: form.color,
        icon: form.icon
      }));
    } else {
      await dispatch(addAccountThunk({
        name: form.name.trim(),
        type: form.type,
        balance: balanceNum,
        openingBalance: balanceNum,
        totalIncome: 0,
        totalExpenses: 0,
        color: form.color,
        icon: form.icon
      }));
    }
    setModalVisible(false);
  };

  const handleDelete = (acc: Account) => {
    Alert.alert(
      'Delete Account',
      `Are you sure you want to delete "${acc.name}"? All associated transactions will also be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => dispatch(deleteAccountThunk(acc.id))
        }
      ]
    );
  };

  return (
    <SafeAreaView style={globalStyles.screenContainer} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Accounts</Text>
            <Text style={styles.subtitle}>Manage your money accounts</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
            <Ionicons name="add" size={22} color={COLORS.textWhite} />
          </TouchableOpacity>
        </View>

        {/* Total Balance Card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>TOTAL BALANCE</Text>
          <Text style={styles.totalBalance}>{formatCurrency(totalBalance, currency)}</Text>
          <Text style={styles.totalSub}>{accounts.length} account{accounts.length !== 1 ? 's' : ''}</Text>
        </View>

        {/* Accounts List */}
        <Text style={[globalStyles.sectionTitle, { marginBottom: SPACING.sm }]}>Your Accounts</Text>
        {accounts.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="wallet-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No accounts yet</Text>
            <Text style={styles.emptySubText}>Tap + to add your first account</Text>
          </View>
        ) : (
          accounts.map(acc => (
            <TouchableOpacity key={acc.id} style={styles.accCard} onPress={() => openEditModal(acc)} activeOpacity={0.8}>
              <View style={[styles.accIconBox, { backgroundColor: acc.color + '22' }]}>
                <Ionicons name={acc.icon as any} size={24} color={acc.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.accName}>{acc.name}</Text>
                <Text style={styles.accType}>{acc.type}</Text>
                <Text style={styles.accStats}>
                  In {formatCurrency(acc.totalIncome, currency)} · Out {formatCurrency(acc.totalExpenses, currency)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.accBalance, { color: acc.balance >= 0 ? COLORS.textPrimary : COLORS.expense }]}>
                  {formatCurrency(acc.balance, currency)}
                </Text>
                <TouchableOpacity onPress={() => handleDelete(acc)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={16} color={COLORS.expense} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{editingAccount ? 'Edit Account' : 'New Account'}</Text>

            {/* Name */}
            <Text style={globalStyles.label}>Account Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
              placeholder="e.g. HDFC Salary Account"
              placeholderTextColor={COLORS.textMuted}
              maxLength={40}
            />

            {/* Account Type */}
            <Text style={[globalStyles.label, { marginTop: SPACING.md }]}>Account Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {ACCOUNT_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, form.type === t && styles.typeChipActive]}
                  onPress={() => setForm(f => ({ ...f, type: t }))}
                >
                  <Text style={[styles.typeChipText, form.type === t && styles.typeChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Balance */}
            <Text style={[globalStyles.label, { marginTop: SPACING.md }]}>Opening Balance</Text>
            <TextInput
              style={styles.input}
              value={form.balance}
              onChangeText={v => setForm(f => ({ ...f, balance: v }))}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
            />

            {/* Color */}
            <Text style={[globalStyles.label, { marginTop: SPACING.md }]}>Color</Text>
            <View style={styles.colorRow}>
              {ACCOUNT_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, form.color === c && styles.colorDotActive]}
                  onPress={() => setForm(f => ({ ...f, color: c }))}
                >
                  {form.color === c && <Ionicons name="checkmark" size={14} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>

            {/* Icon */}
            <Text style={[globalStyles.label, { marginTop: SPACING.md }]}>Icon</Text>
            <View style={styles.iconRow}>
              {ACCOUNT_ICONS.map(ic => (
                <TouchableOpacity
                  key={ic}
                  style={[styles.iconBtn, form.icon === ic && { backgroundColor: form.color + '30', borderColor: form.color }]}
                  onPress={() => setForm(f => ({ ...f, icon: ic }))}
                >
                  <Ionicons name={ic as any} size={22} color={form.icon === ic ? form.color : COLORS.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Buttons */}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>{editingAccount ? 'Update' : 'Add Account'}</Text>
              </TouchableOpacity>
            </View>
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
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  addBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.fab
  },
  totalCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, padding: SPACING.lg,
    marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
    ...SHADOWS.card,
  },
  totalLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1.2 },
  totalBalance: { fontSize: 36, fontWeight: '900', color: COLORS.textPrimary, marginTop: 4 },
  totalSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  accCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, gap: SPACING.md, ...SHADOWS.card,
  },
  accIconBox: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  accName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  accType: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  accStats: { fontSize: 11, color: COLORS.textMuted, marginTop: 3 },
  accBalance: { fontSize: 16, fontWeight: '800' },
  deleteBtn: { marginTop: 4, padding: 4 },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.sm },
  emptyText: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary },
  emptySubText: { fontSize: 13, color: COLORS.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.bgModal, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg, paddingTop: SPACING.md, maxHeight: '90%',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.textMuted, alignSelf: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.md },
  input: {
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md, padding: SPACING.md,
    color: COLORS.textPrimary, fontSize: 15, marginTop: SPACING.xs,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipScroll: { marginTop: SPACING.xs },
  typeChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgInput, marginRight: SPACING.xs, borderWidth: 1, borderColor: COLORS.border,
  },
  typeChipActive: { backgroundColor: COLORS.accent + '30', borderColor: COLORS.accent },
  typeChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  typeChipTextActive: { color: COLORS.accentLight, fontWeight: '700' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.xs },
  colorDot: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  colorDotActive: { borderColor: COLORS.textWhite },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.xs },
  iconBtn: {
    width: 44, height: 44, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bgInput, borderWidth: 1, borderColor: COLORS.border,
  },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  cancelBtn: {
    flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.bgInput,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 15 },
  saveBtn: {
    flex: 2, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.accent,
    alignItems: 'center', ...SHADOWS.fab,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
