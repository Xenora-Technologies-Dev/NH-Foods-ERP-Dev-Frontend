/**
 * Currency utilities for AED/Dirham operations
 * Centralizes all AED formatting and display logic
 */

// AED Dirham symbol (Unicode ﺩ.ﺇ)
export const AED_SYMBOL = 'د.إ';
export const AED_CODE = 'AED';

/**
 * Format amount as AED currency with symbol
 * @param {number} value - The amount to format
 * @param {boolean} withSymbol - Include dirham symbol (default: true)
 * @returns {string} Formatted currency string
 */
export const formatAED = (value, withSymbol = true) => {
  const num = Number(value || 0);
  const formatted = new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
  
  return withSymbol ? `${AED_SYMBOL} ${formatted}` : formatted;
};

/**
 * Format amount as AED with code (e.g., "AED 1,234.56")
 * @param {number} value - The amount to format
 * @returns {string} Formatted currency string with AED code
 */
export const formatAEDCode = (value) => {
  const num = Number(value || 0);
  const formatted = new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
  
  return `${AED_CODE} ${formatted}`;
};

/**
 * Format amount as AED currency for display (symbol on left)
 * @param {number} value - The amount to format
 * @returns {string} Formatted as "د.إ 1,234.56"
 */
export const formatCurrencySymbol = (value) => formatAED(value, true);

/**
 * Format number without currency
 * @param {number} value - The amount to format
 * @returns {string} Just the formatted number
 */
export const formatAmount = (value) => {
  const num = Number(value || 0);
  return new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

/**
 * Parse AED string to number
 * @param {string} value - The AED string to parse
 * @returns {number} The numeric value
 */
export const parseAED = (value) => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  // Remove AED symbol, code, and whitespace
  const cleaned = String(value)
    .replace(/د\.إ/g, '')
    .replace(/AED/g, '')
    .replace(/\s/g, '')
    .replace(/,/g, '');
  
  return Number(cleaned) || 0;
};

/**
 * Check if value is a valid currency amount
 * @param {any} value - Value to check
 * @returns {boolean} True if valid currency
 */
export const isValidCurrency = (value) => {
  const num = parseAED(value);
  return !isNaN(num) && isFinite(num);
};

/**
 * Safely add two currency amounts
 * @param {number} a - First amount
 * @param {number} b - Second amount
 * @returns {number} Sum with proper decimal handling
 */
export const addCurrency = (a, b) => {
  const minor1 = Math.round((Number(a || 0)) * 100);
  const minor2 = Math.round((Number(b || 0)) * 100);
  return (minor1 + minor2) / 100;
};

/**
 * Calculate total from array of amounts
 * @param {number[]} amounts - Array of amounts
 * @returns {number} Total sum
 */
export const sumCurrency = (amounts = []) => {
  return amounts.reduce((sum, amount) => addCurrency(sum, amount), 0);
};

/**
 * Calculate percentage of amount
 * @param {number} amount - Base amount
 * @param {number} percentage - Percentage value
 * @returns {number} Calculated amount
 */
export const calculatePercentage = (amount, percentage) => {
  return addCurrency(0, (Number(amount || 0) * Number(percentage || 0)) / 100);
};

/**
 * Format currency for display in tables/lists
 * @param {number} value - Amount to format
 * @param {boolean} asSymbol - Use symbol vs code
 * @returns {string} Formatted display string
 */
export const displayCurrency = (value, asSymbol = true) => {
  return asSymbol ? formatAED(value) : formatAEDCode(value);
};

/**
 * Get currency class for styling (positive/negative/zero)
 * @param {number} value - Amount to check
 * @returns {string} CSS class name
 */
export const getCurrencyClass = (value) => {
  const num = Number(value || 0);
  if (num > 0) return 'text-green-600';
  if (num < 0) return 'text-red-600';
  return 'text-gray-600';
};

/**
 * Format currency with custom styling
 * @param {number} value - Amount to format
 * @param {string} className - Additional CSS classes
 * @returns {string} Formatted amount with styling info
 */
export const formatCurrencyWithStyle = (value, className = '') => {
  const amount = formatAED(value);
  const currencyClass = getCurrencyClass(value);
  return { amount, className: `${currencyClass} ${className}` };
};

export default {
  AED_SYMBOL,
  AED_CODE,
  formatAED,
  formatAEDCode,
  formatCurrencySymbol,
  formatAmount,
  parseAED,
  isValidCurrency,
  addCurrency,
  sumCurrency,
  calculatePercentage,
  displayCurrency,
  getCurrencyClass,
  formatCurrencyWithStyle,
};
