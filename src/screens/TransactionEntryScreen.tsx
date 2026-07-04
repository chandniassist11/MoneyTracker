import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, Platform, KeyboardAvoidingView, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { addTransactionThunk, updateTransactionThunk } from '../store/financeSlice';
import { COLORS, SPACING, RADIUS, SHADOWS, globalStyles } from '../theme/theme';
import { getTodayString } from '../utils/formatters';
import { Transaction } from '../db/database';

type TxType = 'income' | 'expense' | 'transfer';

export default function TransactionEntryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const { accounts, categories, settings } = useAppSelector(s => s.finance);

  const editingTx: Transaction | undefined = route.params?.transaction;
  const defaultType: TxType = route.params?.type || (editingTx?.type as TxType) || 'expense';

  const [txType, setTxType] = useState<TxType>(editingTx?.type as TxType || defaultType);
  const [amount, setAmount] = useState(editingTx ? editingTx.amount.toString() : '');
  const [accountId, setAccountId] = useState<number | null>(editingTx?.accountId || (accounts[0]?.id ?? null));
  const [toAccountId, setToAccountId] = useState<number | null>(editingTx?.toAccountId || null);
  const [categoryId, setCategoryId] = useState<number | null>(editingTx?.categoryId || null);
  const [date, setDate] = useState(editingTx?.date || getTodayString());
  const [source, setSource] = useState(editingTx?.source || '');
  const [merchantName, setMerchantName] = useState(editingTx?.merchantName || '');
  const [note, setNote] = useState(editingTx?.note || '');
  const [receiptUri, setReceiptUri] = useState(editingTx?.receiptUri || '');
  const [tags, setTags] = useState(editingTx?.tags || '');
  const [isRecurring, setIsRecurring] = useState(editingTx ? editingTx.isRecurring === 1 : false);
  const [recurringInterval, setRecurringInterval] = useState<string>(editingTx?.recurringInterval || 'none');

  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showToAccountPicker, setShowToAccountPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const filteredCategories = useMemo(
    () => categories.filter(c => txType !== 'transfer' && c.type === txType),
    [categories, txType]
  );

  const selectedAccount = accounts.find(a => a.id === accountId);
  const selectedToAccount = accounts.find(a => a.id === toAccountId);
  const selectedCategory = categories.find(c => c.id === categoryId);

  const handleSave = async () => {
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }
    if (!accountId) {
      Alert.alert('Error', 'Please select an account.');
      return;
    }
    if (txType === 'transfer') {
      if (!toAccountId) {
        Alert.alert('Error', 'Please select a destination account for the transfer.');
        return;
      }
      if (accountId === toAccountId) {
        Alert.alert('Error', 'Source and destination accounts must be different.');
        return;
      }
    } else if (!categoryId) {
      Alert.alert('Error', 'Please select a category.');
      return;
    }

    const tx = {
      type: txType,
      amount: amountNum,
      accountId,
      toAccountId: txType === 'transfer' ? toAccountId! : undefined,
      categoryId: txType !== 'transfer' ? categoryId! : undefined,
      date,
      source: txType === 'income' ? source.trim() : '',
      merchantName: txType === 'expense' ? merchantName.trim() : '',
      note,
      receiptUri: txType === 'expense' ? receiptUri : '',
      tags: tags.trim(),
      isRecurring: isRecurring ? 1 : 0,
      recurringInterval: isRecurring ? recurringInterval : 'none' as any,
    };

    if (editingTx) {
      await dispatch(updateTransactionThunk({ ...tx, id: editingTx.id }));
    } else {
      await dispatch(addTransactionThunk(tx));
    }
    navigation.goBack();
  };

  const pickReceipt = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true
    });
    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const TYPE_CONFIG = {
    income: { label: 'Income', color: COLORS.income, icon: 'arrow-down-circle' },
    expense: { label: 'Expense', color: COLORS.expense, icon: 'arrow-up-circle' },
    transfer: { label: 'Transfer', color: COLORS.transfer, icon: 'swap-horizontal' },
  };

  const activeColor = TYPE_CONFIG[txType].color;

  return (
    <SafeAreaView style={globalStyles.screenContainer} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>{editingTx ? 'Edit Transaction' : 'New Transaction'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Type Selector */}
          <View style={styles.typeSelector}>
            {(['income', 'expense', 'transfer'] as TxType[]).map(t => {
              const c = TYPE_CONFIG[t];
              const isActive = txType === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, isActive && { backgroundColor: c.color, borderColor: c.color }]}
                  onPress={() => { setTxType(t); setCategoryId(null); }}
                >
                  <Ionicons name={c.icon as any} size={16} color={isActive ? '#fff' : COLORS.textSecondary} />
                  <Text style={[styles.typeBtnText, isActive && { color: '#fff' }]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Amount Input */}
          <View style={[styles.amountCard, { borderColor: activeColor + '40' }]}>
            <Text style={[styles.currencySymbol, { color: activeColor }]}>{settings.currency}</Text>
            <TextInput
              style={[styles.amountInput, { color: activeColor }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={activeColor + '55'}
              maxLength={12}
            />
          </View>

          {/* From Account */}
          <Selector
            label="From Account"
            value={selectedAccount ? selectedAccount.name : 'Select Account'}
            icon={selectedAccount ? selectedAccount.icon : 'wallet-outline'}
            color={selectedAccount ? selectedAccount.color : COLORS.textMuted}
            onPress={() => setShowAccountPicker(true)}
          />

          {/* To Account (transfer only) */}
          {txType === 'transfer' && (
            <Selector
              label="To Account"
              value={selectedToAccount ? selectedToAccount.name : 'Select Destination'}
              icon={selectedToAccount ? selectedToAccount.icon : 'wallet-outline'}
              color={selectedToAccount ? selectedToAccount.color : COLORS.textMuted}
              onPress={() => setShowToAccountPicker(true)}
            />
          )}

          {/* Category (income/expense) */}
          {txType !== 'transfer' && (
            <Selector
              label="Category"
              value={selectedCategory ? selectedCategory.name : 'Select Category'}
              icon={selectedCategory ? selectedCategory.icon : 'grid-outline'}
              color={activeColor}
              onPress={() => setShowCategoryPicker(true)}
            />
          )}

          {txType === 'income' && (
            <View style={styles.field}>
              <Text style={globalStyles.label}>Source</Text>
              <TextInput
                style={styles.input}
                value={source}
                onChangeText={setSource}
                placeholder="e.g. Salary, Freelancing, Refund"
                placeholderTextColor={COLORS.textMuted}
                maxLength={80}
              />
            </View>
          )}

          {txType === 'expense' && (
            <>
              <View style={styles.field}>
                <Text style={globalStyles.label}>Merchant</Text>
                <TextInput
                  style={styles.input}
                  value={merchantName}
                  onChangeText={setMerchantName}
                  placeholder="e.g. Domino's, BigBasket, Uber"
                  placeholderTextColor={COLORS.textMuted}
                  maxLength={80}
                />
              </View>

              <View style={styles.field}>
                <Text style={globalStyles.label}>Receipt</Text>
                <TouchableOpacity style={styles.selector} onPress={pickReceipt} activeOpacity={0.8}>
                  <View style={[styles.selectorIcon, { backgroundColor: COLORS.accent + '22' }]}>
                    <Ionicons name="image-outline" size={18} color={COLORS.accentLight} />
                  </View>
                  <Text style={styles.selectorText}>{receiptUri ? 'Receipt attached' : 'Attach image or PDF'}</Text>
                  {receiptUri ? (
                    <TouchableOpacity onPress={() => setReceiptUri('')}>
                      <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="cloud-upload-outline" size={18} color={COLORS.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Date */}
          <View style={styles.field}>
            <Text style={globalStyles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
              maxLength={10}
            />
          </View>

          {/* Note */}
          <View style={styles.field}>
            <Text style={globalStyles.label}>Tags</Text>
            <TextInput
              style={styles.input}
              value={tags}
              onChangeText={setTags}
              placeholder="e.g. Dinner, Friends"
              placeholderTextColor={COLORS.textMuted}
              maxLength={120}
            />
          </View>

          <View style={styles.field}>
            <Text style={globalStyles.label}>Note (Optional)</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={note}
              onChangeText={setNote}
              placeholder="Add a note..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={200}
            />
          </View>

          {/* Recurring Toggle */}
          <View style={styles.field}>
            <TouchableOpacity style={styles.toggleRow} onPress={() => setIsRecurring(r => !r)}>
              <View style={styles.toggleLeft}>
                <Ionicons name="repeat" size={20} color={isRecurring ? COLORS.accent : COLORS.textSecondary} />
                <Text style={[styles.toggleLabel, isRecurring && { color: COLORS.accentLight }]}>Recurring Transaction</Text>
              </View>
              <View style={[styles.togglePill, isRecurring && styles.togglePillActive]}>
                <View style={[styles.toggleThumb, isRecurring && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>
          </View>

          {isRecurring && (
            <View style={styles.field}>
              <Text style={globalStyles.label}>Frequency</Text>
              <View style={styles.frequencyRow}>
                {['daily', 'weekly', 'monthly', 'yearly'].map(f => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.freqBtn, recurringInterval === f && styles.freqBtnActive]}
                    onPress={() => setRecurringInterval(f)}
                  >
                    <Text style={[styles.freqBtnText, recurringInterval === f && styles.freqBtnTextActive]}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: activeColor }]} onPress={handleSave}>
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={styles.saveBtnText}>{editingTx ? 'Update Transaction' : 'Save Transaction'}</Text>
          </TouchableOpacity>

          <View style={{ height: SPACING.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Account Picker */}
      <PickerModal
        visible={showAccountPicker}
        title="Select Account"
        items={accounts.map(a => ({ id: a.id, label: a.name, sub: a.type, icon: a.icon, color: a.color }))}
        selectedId={accountId}
        onSelect={(id) => { setAccountId(id); setShowAccountPicker(false); }}
        onClose={() => setShowAccountPicker(false)}
      />

      {/* To Account Picker */}
      <PickerModal
        visible={showToAccountPicker}
        title="Select Destination Account"
        items={accounts.filter(a => a.id !== accountId).map(a => ({ id: a.id, label: a.name, sub: a.type, icon: a.icon, color: a.color }))}
        selectedId={toAccountId}
        onSelect={(id) => { setToAccountId(id); setShowToAccountPicker(false); }}
        onClose={() => setShowToAccountPicker(false)}
      />

      {/* Category Picker */}
      <PickerModal
        visible={showCategoryPicker}
        title="Select Category"
        items={filteredCategories.map(c => ({ id: c.id, label: c.name, sub: c.type, icon: c.icon, color: txType === 'income' ? COLORS.income : COLORS.expense }))}
        selectedId={categoryId}
        onSelect={(id) => { setCategoryId(id); setShowCategoryPicker(false); }}
        onClose={() => setShowCategoryPicker(false)}
      />
    </SafeAreaView>
  );
}

// ─── Selector Component ──────────────────────────────────────────────────────
function Selector({ label, value, icon, color, onPress }: {
  label: string; value: string; icon: string; color: string; onPress: () => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={globalStyles.label}>{label}</Text>
      <TouchableOpacity style={styles.selector} onPress={onPress} activeOpacity={0.8}>
        <View style={[styles.selectorIcon, { backgroundColor: color + '22' }]}>
          <Ionicons name={icon as any} size={18} color={color} />
        </View>
        <Text style={styles.selectorText}>{value}</Text>
        <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Picker Modal Component ──────────────────────────────────────────────────
function PickerModal({ visible, title, items, selectedId, onSelect, onClose }: {
  visible: boolean; title: string;
  items: { id: number; label: string; sub: string; icon: string; color: string }[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
            {items.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[styles.pickerItem, item.id === selectedId && { backgroundColor: item.color + '15', borderColor: item.color + '40' }]}
                onPress={() => onSelect(item.id)}
              >
                <View style={[styles.pickerItemIcon, { backgroundColor: item.color + '22' }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerItemLabel}>{item.label}</Text>
                  <Text style={styles.pickerItemSub}>{item.sub}</Text>
                </View>
                {item.id === selectedId && <Ionicons name="checkmark-circle" size={22} color={item.color} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
            <Text style={styles.modalCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.bgCard,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  scroll: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md },
  typeSelector: {
    flexDirection: 'row', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: 4, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
  },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACING.sm, borderRadius: RADIUS.sm, gap: 6,
    borderWidth: 1, borderColor: 'transparent',
  },
  typeBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  amountCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.lg,
    borderWidth: 2, justifyContent: 'center', gap: SPACING.sm,
  },
  currencySymbol: { fontSize: 28, fontWeight: '900' },
  amountInput: { fontSize: 44, fontWeight: '900', minWidth: 100, textAlign: 'center' },
  field: { marginBottom: SPACING.md },
  selector: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.xs,
    borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm,
  },
  selectorIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  selectorText: { flex: 1, color: COLORS.textPrimary, fontSize: 15, fontWeight: '500' },
  input: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md,
    color: COLORS.textPrimary, fontSize: 15, marginTop: SPACING.xs,
    borderWidth: 1, borderColor: COLORS.border,
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  toggleLabel: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '500' },
  togglePill: {
    width: 44, height: 24, borderRadius: 12, backgroundColor: COLORS.bgInput,
    padding: 2, justifyContent: 'center',
  },
  togglePillActive: { backgroundColor: COLORS.accent },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.textMuted },
  toggleThumbActive: { backgroundColor: '#fff', alignSelf: 'flex-end' },
  frequencyRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs, flexWrap: 'wrap' },
  freqBtn: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgInput, borderWidth: 1, borderColor: COLORS.border,
  },
  freqBtnActive: { backgroundColor: COLORS.accent + '30', borderColor: COLORS.accent },
  freqBtnText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  freqBtnTextActive: { color: COLORS.accentLight },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: SPACING.md, borderRadius: RADIUS.lg, gap: SPACING.sm, marginTop: SPACING.md,
    ...SHADOWS.fab,
  },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.bgModal, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg, paddingTop: SPACING.md,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.textMuted,
    alignSelf: 'center', marginBottom: SPACING.md,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.md },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderRadius: RADIUS.md,
    marginBottom: SPACING.xs, borderWidth: 1, borderColor: 'transparent', gap: SPACING.md,
  },
  pickerItemIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pickerItemLabel: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '600' },
  pickerItemSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  modalCloseBtn: {
    padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.bgInput,
    alignItems: 'center', marginTop: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  modalCloseBtnText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 15 },
});
