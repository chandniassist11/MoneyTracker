import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart, BarChart, LineChart } from 'react-native-gifted-charts';
import { useAppSelector } from '../hooks/useRedux';
import { COLORS, SPACING, RADIUS, SHADOWS, globalStyles } from '../theme/theme';
import { formatCurrency, getFinancialMonthRange, formatShortDate } from '../utils/formatters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - SPACING.md * 2 - 32;

const FILTERS = ['Monthly', 'This Month', 'Last 3 Months', 'This Year'];

export default function AnalyticsScreen() {
  const { transactions, categories, settings, accounts } = useAppSelector(s => s.finance);
  const currency = settings.currency;
  const [activeFilter, setActiveFilter] = useState('This Month');

  const monthRange = useMemo(() => getFinancialMonthRange(settings), [settings]);

  // Filter transactions by period
  const filteredTxs = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (activeFilter === 'This Month') {
      return transactions.filter(t => t.date >= monthRange.start && t.date <= monthRange.end);
    } else if (activeFilter === 'Last 3 Months') {
      const startDate = new Date(year, month - 2, 1);
      const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-01`;
      return transactions.filter(t => t.date >= startStr);
    } else if (activeFilter === 'This Year') {
      return transactions.filter(t => t.date.startsWith(year.toString()));
    }
    return transactions;
  }, [transactions, activeFilter, monthRange]);

  const totalIncome = useMemo(() => filteredTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [filteredTxs]);
  const totalExpense = useMemo(() => filteredTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [filteredTxs]);
  const savings = totalIncome - totalExpense;

  // Expense by category for Pie chart
  const pieData = useMemo(() => {
    const expMap = new Map<number, number>();
    filteredTxs.filter(t => t.type === 'expense' && t.categoryId).forEach(t => {
      expMap.set(t.categoryId!, (expMap.get(t.categoryId!) || 0) + t.amount);
    });
    return Array.from(expMap.entries())
      .map(([catId, value], i) => {
        const cat = categories.find(c => c.id === catId);
        return { value, color: COLORS.chart[i % COLORS.chart.length], text: cat?.name || 'Other', key: catId };
      })
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredTxs, categories]);

  // Monthly bar chart (last 6 months)
  const barData = useMemo(() => {
    const months: { label: string; start: string; end: string }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, d.getMonth() + 1, 0).getDate();
      months.push({
        label: d.toLocaleString('en', { month: 'short' }),
        start: `${y}-${m}-01`,
        end: `${y}-${m}-${lastDay}`,
      });
    }
    return months.map(m => {
      const monthTxs = transactions.filter(t => t.date >= m.start && t.date <= m.end);
      const income = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return { label: m.label, income, expense };
    });
  }, [transactions]);

  // Line chart - income vs expense
  const lineIncomeData = barData.map(d => ({ value: d.income }));
  const lineExpenseData = barData.map(d => ({ value: d.expense }));
  const barChartData = barData.flatMap((d, i) => [
    { value: d.income, label: d.label, frontColor: COLORS.income, spacing: 4 },
    { value: d.expense, label: '', frontColor: COLORS.expense },
  ]);

  return (
    <SafeAreaView style={globalStyles.screenContainer} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
        </View>

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, activeFilter === f && styles.filterBtnActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderColor: COLORS.income + '40' }]}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryVal, { color: COLORS.income }]}>{formatCurrency(totalIncome, currency)}</Text>
          </View>
          <View style={[styles.summaryCard, { borderColor: COLORS.expense + '40' }]}>
            <Text style={styles.summaryLabel}>Expense</Text>
            <Text style={[styles.summaryVal, { color: COLORS.expense }]}>{formatCurrency(totalExpense, currency)}</Text>
          </View>
          <View style={[styles.summaryCard, { borderColor: (savings >= 0 ? COLORS.income : COLORS.expense) + '40' }]}>
            <Text style={styles.summaryLabel}>Savings</Text>
            <Text style={[styles.summaryVal, { color: savings >= 0 ? COLORS.income : COLORS.expense }]}>
              {formatCurrency(savings, currency)}
            </Text>
          </View>
        </View>

        {/* Expense Distribution Pie Chart */}
        {pieData.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={globalStyles.sectionTitle}>Expense Distribution</Text>
            <View style={styles.pieContainer}>
              <PieChart
                data={pieData}
                donut
                radius={90}
                innerRadius={55}
                innerCircleColor={COLORS.bgCard}
                centerLabelComponent={() => (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.pieCenterLabel}>Total</Text>
                    <Text style={styles.pieCenterValue}>{formatCurrency(totalExpense, currency)}</Text>
                  </View>
                )}
              />
            </View>
            <View style={styles.legend}>
              {pieData.map((d, i) => (
                <View key={i} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                  <Text style={styles.legendLabel}>{d.text}</Text>
                  <Text style={styles.legendVal}>{formatCurrency(d.value, currency)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Monthly Bar Chart */}
        <View style={styles.chartCard}>
          <Text style={globalStyles.sectionTitle}>Monthly Spending (6 Months)</Text>
          <View style={styles.barLegend}>
            <View style={styles.barLegendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.income }]} />
              <Text style={styles.legendLabel}>Income</Text>
            </View>
            <View style={styles.barLegendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.expense }]} />
              <Text style={styles.legendLabel}>Expense</Text>
            </View>
          </View>
          <BarChart
            data={barChartData}
            barWidth={16}
            spacing={20}
            roundedTop
            roundedBottom={false}
            hideRules
            xAxisThickness={1}
            xAxisColor={COLORS.border}
            yAxisThickness={0}
            yAxisTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: COLORS.textSecondary, fontSize: 10 }}
            noOfSections={4}
            barBorderRadius={4}
            width={CHART_WIDTH}
            height={160}
          />
        </View>

        {/* Line Chart - Income vs Expense Trend */}
        {lineIncomeData.some(d => d.value > 0) && (
          <View style={styles.chartCard}>
            <Text style={globalStyles.sectionTitle}>Income vs Expense Trend</Text>
            <View style={styles.barLegend}>
              <View style={styles.barLegendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.income }]} />
                <Text style={styles.legendLabel}>Income</Text>
              </View>
              <View style={styles.barLegendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.expense }]} />
                <Text style={styles.legendLabel}>Expense</Text>
              </View>
            </View>
            <LineChart
              data={lineIncomeData}
              data2={lineExpenseData}
              color1={COLORS.income}
              color2={COLORS.expense}
              dataPointsColor1={COLORS.income}
              dataPointsColor2={COLORS.expense}
              startFillColor1={COLORS.income + '40'}
              startFillColor2={COLORS.expense + '40'}
              endFillColor1={COLORS.income + '05'}
              endFillColor2={COLORS.expense + '05'}
              areaChart
              curved
              hideRules
              xAxisThickness={1}
              xAxisColor={COLORS.border}
              yAxisThickness={0}
              yAxisTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
              xAxisLabelTexts={barData.map(d => d.label)}
              xAxisLabelTextStyle={{ color: COLORS.textSecondary, fontSize: 10 }}
              width={CHART_WIDTH}
              height={150}
            />
          </View>
        )}

        {/* No Data State */}
        {filteredTxs.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No transactions in this period</Text>
            <Text style={styles.emptySubText}>Add some transactions to see analytics</Text>
          </View>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md },
  header: { marginBottom: SPACING.md },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary },
  filterScroll: { marginBottom: SPACING.md },
  filterBtn: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard, marginRight: SPACING.xs,
    borderWidth: 1, borderColor: COLORS.border,
  },
  filterBtnActive: { backgroundColor: COLORS.accent + '30', borderColor: COLORS.accent },
  filterText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  filterTextActive: { color: COLORS.accentLight },
  summaryRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  summaryCard: {
    flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: SPACING.sm + 2, borderWidth: 1, alignItems: 'center', ...SHADOWS.card,
  },
  summaryLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '700', letterSpacing: 0.8 },
  summaryVal: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  chartCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md,
    marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card,
  },
  pieContainer: { alignItems: 'center', marginVertical: SPACING.md },
  pieCenterLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  pieCenterValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '800', marginTop: 2 },
  legend: { marginTop: SPACING.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs, gap: SPACING.sm },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 13, color: COLORS.textSecondary },
  legendVal: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '700' },
  barLegend: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  barLegendItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.sm },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '600' },
  emptySubText: { fontSize: 13, color: COLORS.textMuted },
});
