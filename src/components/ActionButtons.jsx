import React from 'react';
import { Save, X, Trash2, Edit, Plus } from 'lucide-react';

/**
 * Common action buttons component for forms
 * Provides consistent button styling and behavior across the app
 */
export const FormActionButtons = ({ 
  onSave, 
  onCancel, 
  onDelete,
  savingText = 'Saving...',
  isSaving = false,
  isDeleting = false,
  showDelete = false,
  deleteText = 'Delete',
  saveText = 'Save',
  cancelText = 'Cancel',
  variant = 'primary' // 'primary', 'secondary', 'danger'
}) => {
  return (
    <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-200/50">
      {showDelete && (
        <button
          onClick={onDelete}
          disabled={isSaving || isDeleting}
          className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-200 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDeleting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {deleteText}...
            </>
          ) : (
            <>
              <Trash2 size={16} />
              {deleteText}
            </>
          )}
        </button>
      )}
      
      <div className={`flex gap-3 ${showDelete ? 'flex-1' : 'w-full'}`}>
        <button
          onClick={onCancel}
          disabled={isSaving || isDeleting}
          className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <X size={16} />
          {cancelText}
        </button>
        
        <button
          onClick={onSave}
          disabled={isSaving || isDeleting}
          className={`flex-1 px-4 py-3 rounded-xl transition-all duration-200 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-white ${
            variant === 'danger'
              ? 'bg-red-600 hover:bg-red-700'
              : variant === 'secondary'
              ? 'bg-gray-600 hover:bg-gray-700'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {savingText}
            </>
          ) : (
            <>
              <Save size={16} />
              {saveText}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

/**
 * Common table action buttons (Edit, Delete)
 */
export const TableActionButtons = ({
  onEdit,
  onDelete,
  editLabel = 'Edit',
  deleteLabel = 'Delete',
  disabled = false,
  compact = false
}) => {
  return (
    <div className={`flex items-center gap-2 ${compact ? '' : 'space-x-2'}`}>
      <button
        onClick={onEdit}
        disabled={disabled}
        className={`p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 ${compact ? '' : ''}`}
        title={editLabel}
      >
        <Edit size={compact ? 16 : 18} />
        {!compact && <span className="text-sm">{editLabel}</span>}
      </button>
      <button
        onClick={onDelete}
        disabled={disabled}
        className={`p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 ${compact ? '' : ''}`}
        title={deleteLabel}
      >
        <Trash2 size={compact ? 16 : 18} />
        {!compact && <span className="text-sm">{deleteLabel}</span>}
      </button>
    </div>
  );
};

/**
 * Common header action button
 */
export const HeaderActionButton = ({
  onClick,
  icon: Icon = Plus,
  label,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      <Icon size={20} />
      {label}
    </button>
  );
};

export default {
  FormActionButtons,
  TableActionButtons,
  HeaderActionButton
};
