// Shared formatting and decimal-safe helpers for PO/Invoice modules

// Format a number with fixed decimals using Intl for consistent grouping
export const formatNumber = (value, decimals = 2, locale = 'en-GB') => {
  const n = Number(value || 0);
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
};

// Currency formatter for AED; returns with currency symbol
export const formatCurrencyAED = (value, locale = 'en-AE') => {
  const n = Number(value || 0);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

// Simple date formatting to dd/mm/yyyy (GB)
export const formatDateGB = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB');
};

// Decimal-safe helpers: add and sum using integer minor units (cents)
const toMinor = (v) => Math.round(Number(v || 0) * 100);
const fromMinor = (v) => v / 100;

export const decimalAdd = (a, b) => fromMinor(toMinor(a) + toMinor(b));

export const decimalSum = (arr) => {
  const totalMinor = (arr || []).reduce((acc, v) => acc + toMinor(v), 0);
  return fromMinor(totalMinor);
};

export const decimalRound = (v, decimals = 2) => {
  const m = Math.pow(10, decimals);
  return Math.round(Number(v || 0) * m) / m;
};
