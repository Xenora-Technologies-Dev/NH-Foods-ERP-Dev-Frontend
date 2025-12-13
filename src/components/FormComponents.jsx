import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Common form input component with consistent styling
 */
export const FormInput = ({ 
  label, 
  icon: Icon, 
  error, 
  helper,
  required = false,
  disabled = false,
  type = 'text',
  ...props 
}) => (
  <div>
    {label && (
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {Icon && <Icon size={16} className="inline mr-2" />} 
        {label} 
        {required && <span className="text-red-600">*</span>}
      </label>
    )}
    <input
      {...props}
      type={type}
      disabled={disabled}
      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed ${
        error ? "border-red-300 bg-red-50" : "border-gray-300"
      }`}
    />
    {error && (
      <div className="mt-2 flex items-center gap-1 text-sm text-red-600">
        <AlertCircle size={14} />
        {error}
      </div>
    )}
    {helper && !error && (
      <p className="mt-1 text-xs text-gray-500">{helper}</p>
    )}
  </div>
);

/**
 * Common form select component
 */
export const FormSelect = ({ 
  label, 
  icon: Icon, 
  error, 
  options = [],
  required = false,
  disabled = false,
  placeholder = 'Select an option',
  ...props 
}) => (
  <div>
    {label && (
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {Icon && <Icon size={16} className="inline mr-2" />} 
        {label} 
        {required && <span className="text-red-600">*</span>}
      </label>
    )}
    <select
      {...props}
      disabled={disabled}
      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed ${
        error ? "border-red-300 bg-red-50" : "border-gray-300"
      }`}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && (
      <div className="mt-2 flex items-center gap-1 text-sm text-red-600">
        <AlertCircle size={14} />
        {error}
      </div>
    )}
  </div>
);

/**
 * Common form textarea component
 */
export const FormTextarea = ({ 
  label, 
  icon: Icon, 
  error, 
  rows = 4,
  required = false,
  disabled = false,
  ...props 
}) => (
  <div>
    {label && (
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {Icon && <Icon size={16} className="inline mr-2" />} 
        {label} 
        {required && <span className="text-red-600">*</span>}
      </label>
    )}
    <textarea
      {...props}
      rows={rows}
      disabled={disabled}
      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none ${
        error ? "border-red-300 bg-red-50" : "border-gray-300"
      }`}
    />
    {error && (
      <div className="mt-2 flex items-center gap-1 text-sm text-red-600">
        <AlertCircle size={14} />
        {error}
      </div>
    )}
  </div>
);

/**
 * Common form checkbox component
 */
export const FormCheckbox = ({ 
  label, 
  error, 
  disabled = false,
  ...props 
}) => (
  <div>
    <label className="flex items-center gap-3">
      <input
        {...props}
        type="checkbox"
        disabled={disabled}
        className="w-5 h-5 border border-gray-300 rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <span className={`text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
        {label}
      </span>
    </label>
    {error && (
      <div className="mt-2 flex items-center gap-1 text-sm text-red-600">
        <AlertCircle size={14} />
        {error}
      </div>
    )}
  </div>
);

/**
 * Form grid layout helper
 */
export const FormGrid = ({ children, cols = 2 }) => {
  const colClass = {
    1: 'grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4'
  };

  return (
    <div className={`grid ${colClass[cols]} gap-6`}>
      {children}
    </div>
  );
};

export default {
  FormInput,
  FormSelect,
  FormTextarea,
  FormCheckbox,
  FormGrid
};
