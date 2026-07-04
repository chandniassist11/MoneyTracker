import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { updateSettingsThunk, addTransactionThunk } from '../store/financeSlice';
import { COLORS, SPACING, RADIUS, SHADOWS, globalStyles } from '../theme/theme';
import { exportTransactionsToCSV, parseCSVString, validateAndPrepareCSVImport, CSVImportPreview } from '../utils/csv';

export default function SettingsScreen() {
  const dispatch = useAppDispatch();
  const { settings, transactions, accounts, categories } = useAppSelector(s => s.finance);

  const [financialMonthStart, setFinancialMonthStart] = useState(settings.financialMonthStart.toString());
  const [currency, setCurrency] = useState(settings.currency);
  const [carryForward, setCarryForward] = useState(settings.carryForwardEnabled === 1);

  const [importPreview, setImportPreview] = useState<CSVImportPreview | null>(null);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleSaveSettings = async () => {
    const dayNum = parseInt(financialMonthStart);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 28) {
      Alert.alert('Error', 'Financial month start day must be between 1 and 28.');
      return;
    }
    await dispatch(updateSettingsThunk({
      financialMonthStart: dayNum,
      currency: currency.trim() || '₹',
      carryForwardEnabled: carryForward ? 1 : 0,
    }));
    Alert.alert('Success', 'Settings saved successfully.');
  };

  const handleExport = async () => {
    try {
      await exportTransactionsToCSV(transactions, accounts, categories);
      if (Platform.OS !== 'web') {
        Alert.alert('Success', 'Transactions exported and ready to share.');
      }
    } catch (e: any) {
      Alert.alert('Export Failed', e.message || 'An error occurred during export.');
    }
  };

  const handleImport = async () => {
    try {
      let csvText = '';

      if (Platform.OS === 'web') {
        // Web: use file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.onchange = async (event: any) => {
          const file = event.target.files[0];
          if (!file) return;
          const text = await file.text();
          processCSVText(text);
        };
        input.click();
        return;
      } else {
        // Native: use document picker
        const result = await (DocumentPicker as any).getDocumentAsync({ type: 'text/comma-separated-values' });
        if (result.canceled) return;
        csvText = await FileSystem.readAsStringAsync(result.assets[0].uri);
        processCSVText(csvText);
      }
    } catch (e: any) {
      Alert.alert('Import Failed', e.message || 'An error occurred during import.');
    }
  };

  const processCSVText = async (csvText: string) => {
    setImporting(true);
    try {
      const rows = await parseCSVString(csvText);
      const preview = await validateAndPrepareCSVImport(rows, accounts, categories);
      setImportPreview(preview);
      setImportModalVisible(true);
    } catch (e: any) {
      Alert.alert('Parse Error', e.message);
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview || !importPreview.valid) return;
    setImporting(true);
    try {
      for (const tx of importPreview.transactions) {
        await dispatch(addTransactionThunk(tx)).unwrap();
      }
      setImportModalVisible(false);
      setImportPreview(null);
      Alert.alert('Success', `${importPreview.transactions.length} transactions imported successfully.`);
    } catch (e: any) {
      Alert.alert('Import Error', e.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <SafeAreaView style={globalStyles.screenContainer} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Settings</Text>

        {/* Financial Month Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.accentLight} /> Financial Cycle
          </Text>
          <View style={globalStyles.card}>
            <Text style={globalStyles.label}>Financial Month Start Day (1–28)</Text>
            <TextInput
              style={styles.input}
              value={financialMonthStart}
              onChangeText={setFinancialMonthStart}
              keyboardType="numeric"
              maxLength={2}
              placeholder="1"
              placeholderTextColor={COLORS.textMuted}
            />
            <Text style={styles.hint}>
              E.g. set to 25 if your salary comes on the 25th (cycle: 25th → 24th)
            </Text>
          </View>
        </View>

        {/* Carry Forward */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>
            <Ionicons name="arrow-forward-circle-outline" size={16} color={COLORS.accentLight} /> Carry Forward
          </Text>
          <View style={globalStyles.card}>
            <TouchableOpacity style={styles.toggleRow} onPress={() => setCarryForward(v => !v)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Enable Carry Forward Balance</Text>
                <Text style={styles.toggleHint}>Carry unused balance to the next month</Text>
              </View>
              <View style={[styles.togglePill, carryForward && styles.togglePillActive]}>
                <View style={[styles.toggleThumb, carryForward && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Currency */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>
            <Ionicons name="cash-outline" size={16} color={COLORS.accentLight} /> Currency
          </Text>
          <View style={globalStyles.card}>
            <Text style={globalStyles.label}>Currency Symbol</Text>
            <TextInput
              style={styles.input}
              value={currency}
              onChangeText={setCurrency}
              maxLength={4}
              placeholder="₹"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSettings}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.saveBtnText}>Save Settings</Text>
        </TouchableOpacity>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>
            <Ionicons name="server-outline" size={16} color={COLORS.accentLight} /> Data Management
          </Text>

          <TouchableOpacity style={styles.dataBtn} onPress={handleExport}>
            <View style={[styles.dataIcon, { backgroundColor: COLORS.income + '22' }]}>
              <Ionicons name="download-outline" size={22} color={COLORS.income} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dataBtnLabel}>Export Transactions</Text>
              <Text style={styles.dataBtnSub}>Download all transactions as CSV</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.dataBtn, { marginTop: SPACING.sm }]} onPress={handleImport} disabled={importing}>
            <View style={[styles.dataIcon, { backgroundColor: COLORS.accent + '22' }]}>
              <Ionicons name="cloud-upload-outline" size={22} color={COLORS.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dataBtnLabel}>Import Transactions</Text>
              <Text style={styles.dataBtnSub}>Import from a CSV file with preview</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.accentLight} /> About
          </Text>
          <View style={globalStyles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>App Name</Text>
              <Text style={styles.infoValue}>Money Tracker</Text>
            </View>
            <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: SPACING.sm, paddingTop: SPACING.sm }]}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0 (MVP)</Text>
            </View>
            <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: SPACING.sm, paddingTop: SPACING.sm }]}>
              <Text style={styles.infoLabel}>Total Transactions</Text>
              <Text style={styles.infoValue}>{transactions.length}</Text>
            </View>
            <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: SPACING.sm, paddingTop: SPACING.sm }]}>
              <Text style={styles.infoLabel}>Total Accounts</Text>
              <Text style={styles.infoValue}>{accounts.length}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* Import Preview Modal */}
      <Modal visible={importModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Import Preview</Text>

            {importPreview && (
              <>
                <View style={styles.previewStats}>
                  <View style={styles.previewStat}>
                    <Text style={styles.previewStatNum}>{importPreview.totalRows}</Text>
                    <Text style={styles.previewStatLabel}>Total Rows</Text>
                  </View>
                  <View style={styles.previewStat}>
                    <Text style={[styles.previewStatNum, { color: COLORS.income }]}>{importPreview.transactions.length}</Text>
                    <Text style={styles.previewStatLabel}>Valid</Text>
                  </View>
                  <View style={styles.previewStat}>
                    <Text style={[styles.previewStatNum, { color: COLORS.expense }]}>{importPreview.errors.length}</Text>
                    <Text style={styles.previewStatLabel}>Errors</Text>
                  </View>
                </View>

                {importPreview.errors.length > 0 && (
                  <ScrollView style={styles.errorList} nestedScrollEnabled>
                    {importPreview.errors.map((e, i) => (
                      <View key={i} style={styles.errorItem}>
                        <Ionicons name="warning" size={14} color={COLORS.expense} />
                        <Text style={styles.errorText}>{e}</Text>
                      </View>
                    ))}
                  </ScrollView>
                )}

                {importPreview.valid ? (
                  <Text style={styles.previewValid}>
                    ✓ All rows are valid and ready to import.
                  </Text>
                ) : (
                  <Text style={styles.previewInvalid}>
                    Fix the errors above in your CSV file before importing.
                  </Text>
                )}

                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setImportModalVisible(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  {importPreview.valid && (
                    <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmImport} disabled={importing}>
                      <Text style={styles.confirmBtnText}>
                        {importing ? 'Importing...' : `Import ${importPreview.transactions.length} Transactions`}
                      </Text>
                    </TouchableOpacity>
                  )}
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
  title: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.lg },
  section: { marginBottom: SPACING.lg },
  sectionHeader: { fontSize: 14, fontWeight: '700', color: COLORS.accentLight, marginBottom: SPACING.sm, letterSpacing: 0.5 },
  input: {
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md, padding: SPACING.md,
    color: COLORS.textPrimary, fontSize: 15, marginTop: SPACING.xs,
    borderWidth: 1, borderColor: COLORS.border,
  },
  hint: { fontSize: 12, color: COLORS.textMuted, marginTop: SPACING.xs, fontStyle: 'italic' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  toggleLabel: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '600' },
  toggleHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  togglePill: { width: 44, height: 24, borderRadius: 12, backgroundColor: COLORS.bgInput, padding: 2, justifyContent: 'center' },
  togglePillActive: { backgroundColor: COLORS.accent },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.textMuted },
  toggleThumbActive: { backgroundColor: '#fff', alignSelf: 'flex-end' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.accent, borderRadius: RADIUS.lg, padding: SPACING.md,
    gap: SPACING.sm, marginBottom: SPACING.lg, ...SHADOWS.fab,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  dataBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
    gap: SPACING.md, ...SHADOWS.card,
  },
  dataIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  dataBtnLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  dataBtnSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 14, color: COLORS.textSecondary },
  infoValue: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.bgModal, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg, paddingTop: SPACING.md, maxHeight: '80%',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.textMuted, alignSelf: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.md },
  previewStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: SPACING.md },
  previewStat: { alignItems: 'center' },
  previewStatNum: { fontSize: 28, fontWeight: '900', color: COLORS.textPrimary },
  previewStatLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  errorList: { maxHeight: 180, marginBottom: SPACING.md, backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md, padding: SPACING.sm },
  errorItem: { flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.xs, alignItems: 'flex-start' },
  errorText: { fontSize: 12, color: COLORS.expenseLight, flex: 1 },
  previewValid: { fontSize: 14, color: COLORS.income, fontWeight: '600', textAlign: 'center', marginBottom: SPACING.md },
  previewInvalid: { fontSize: 14, color: COLORS.expense, fontWeight: '600', textAlign: 'center', marginBottom: SPACING.md },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm },
  cancelBtn: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.bgInput, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 15 },
  confirmBtn: { flex: 2, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.income, alignItems: 'center', ...SHADOWS.fab },
  confirmBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
