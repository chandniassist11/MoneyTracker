import { Settings } from '../db/database';

export const formatCurrency = (amount: number, currency = '₹'): string => {
  const formatted = Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${currency}${formatted}`;
};

export const formatDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-');
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatShortDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-');
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

export const getFinancialMonthRange = (
  settings: Settings,
  referenceDate?: Date
): { start: string; end: string } => {
  const ref = referenceDate || new Date();
  const day = ref.getDate();
  const startDay = settings.financialMonthStart;

  let startYear = ref.getFullYear();
  let startMonth = ref.getMonth(); // 0-indexed

  // If today is before the start day, the current financial month started last calendar month
  if (day < startDay) {
    startMonth -= 1;
    if (startMonth < 0) {
      startMonth = 11;
      startYear -= 1;
    }
  }

  const startDate = new Date(startYear, startMonth, startDay);

  let endYear = startYear;
  let endMonth = startMonth + 1;
  if (endMonth > 11) {
    endMonth = 0;
    endYear += 1;
  }
  const endDate = new Date(endYear, endMonth, startDay - 1);

  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    start: `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`,
    end: `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}`
  };
};

export const getCurrentMonth = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const getTodayString = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
