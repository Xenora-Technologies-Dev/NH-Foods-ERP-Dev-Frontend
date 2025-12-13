import React from 'react';
import DirhamIcon from '../assets/dirham.svg';
import { formatAED, formatAmount, getCurrencyClass } from '../utils/currencyUtils';

/**
 * Display currency amount with AED symbol
 */
export const CurrencyDisplay = ({ 
  amount = 0, 
  showSymbol = true,
  className = '',
  size = 'md',
  variant = 'default' // 'default', 'light', 'bold'
}) => {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl'
  };

  const variantClasses = {
    default: 'font-medium',
    light: 'font-normal',
    bold: 'font-bold'
  };

  const currencyClass = getCurrencyClass(amount);

  return (
    <div className={`flex items-center gap-1 ${sizeClasses[size]} ${variantClasses[variant]} ${currencyClass} ${className}`}>
      {showSymbol && (
        <img src={DirhamIcon} alt="AED" className="w-4 h-4 opacity-80" />
      )}
      <span>{formatAED(amount, false)}</span>
    </div>
  );
};

/**
 * Display currency in table cell
 */
export const CurrencyCell = ({ 
  amount = 0,
  className = ''
}) => {
  return (
    <div className={`flex items-center gap-1 text-gray-900 font-medium ${className}`}>
      <img src={DirhamIcon} alt="AED" className="w-4 h-4" />
      <span>{formatAmount(amount)}</span>
    </div>
  );
};

/**
 * Currency input with formatting
 */
export const CurrencyInput = ({
  value = 0,
  onChange,
  onBlur,
  label,
  error,
  required = false,
  disabled = false,
  placeholder = '0.00',
  ...props
}) => {
  const handleChange = (e) => {
    const inputValue = e.target.value;
    // Allow only numbers and decimal point
    const sanitized = inputValue.replace(/[^\d.]/g, '');
    onChange?.(sanitized);
  };

  const handleBlur = (e) => {
    // Format the value on blur
    const num = parseFloat(e.target.value) || 0;
    onChange?.(num.toFixed(2));
    onBlur?.(e);
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-600">*</span>}
        </label>
      )}
      <div className="relative">
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-gray-500">
          <img src={DirhamIcon} alt="AED" className="w-4 h-4" />
          <span className="text-sm font-medium">AED</span>
        </div>
        <input
          {...props}
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full pl-16 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

/**
 * Currency summary card
 */
export const CurrencySummaryCard = ({
  title,
  amount = 0,
  subtitle,
  bgColor = 'bg-blue-50',
  borderColor = 'border-blue-200',
  icon: Icon,
  trend,
  change
}) => {
  return (
    <div className={`p-4 rounded-xl border ${borderColor} ${bgColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="flex items-center gap-1 mt-2">
            <img src={DirhamIcon} alt="AED" className="w-5 h-5" />
            <h3 className="text-2xl font-bold text-gray-900">{formatAmount(amount)}</h3>
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <Icon size={20} className="text-gray-600" />
          </div>
        )}
      </div>
      {(change || trend) && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <span className={`text-sm font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? '↑' : '↓'} {change}
          </span>
        </div>
      )}
    </div>
  );
};

export default {
  CurrencyDisplay,
  CurrencyCell,
  CurrencyInput,
  CurrencySummaryCard
};
