import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ 
  open, 
  onClose, 
  title, 
  children, 
  className = '',
  size = 'md',
  closeButton = true,
  backdrop = true
}) => {
  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    full: 'max-w-[90vw]'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {backdrop && (
        <div 
          className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300" 
          onClick={onClose} 
        />
      )}
      <div 
        className={`relative max-h-[90vh] overflow-auto bg-white rounded-2xl shadow-2xl p-6 border border-gray-200/50 transition-all duration-300 scale-100 ${sizeClasses[size]} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200/50">
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            {closeButton && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                aria-label="Close modal"
              >
                <X size={20} className="text-gray-600" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="text-gray-700">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
