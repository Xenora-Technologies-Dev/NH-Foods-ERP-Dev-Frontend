import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

/**
 * Toast notification component
 * Shows temporary notifications for success, error, warning, info
 */
export const Toast = ({
  visible = false,
  message = '',
  type = 'success', // 'success', 'error', 'warning', 'info'
  duration = 3000,
  onClose,
  action,
  actionLabel = 'Undo'
}) => {
  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [visible, duration, onClose]);

  if (!visible) return null;

  const typeConfig = {
    success: {
      bg: 'bg-emerald-500',
      icon: CheckCircle,
      border: 'border-emerald-200'
    },
    error: {
      bg: 'bg-red-500',
      icon: AlertCircle,
      border: 'border-red-200'
    },
    warning: {
      bg: 'bg-orange-500',
      icon: AlertTriangle,
      border: 'border-orange-200'
    },
    info: {
      bg: 'bg-blue-500',
      icon: Info,
      border: 'border-blue-200'
    }
  };

  const config = typeConfig[type] || typeConfig.info;
  const IconComponent = config.icon;

  return (
    <div className="fixed top-4 right-4 z-50 transform transition-all duration-300 scale-100 opacity-100">
      <div className={`${config.bg} text-white rounded-xl shadow-lg p-4 flex items-start gap-3 max-w-sm border ${config.border}`}>
        <IconComponent size={20} className="flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium">{message}</p>
          {action && (
            <button
              onClick={() => {
                action();
                onClose?.();
              }}
              className="text-sm font-medium mt-2 underline hover:opacity-80 transition"
            >
              {actionLabel}
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition"
          aria-label="Close notification"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

/**
 * Hook to use toast notifications
 */
export const useToast = () => {
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success',
    duration: 3000
  });

  const showToast = (message, type = 'success', duration = 3000) => {
    setToast({
      visible: true,
      message,
      type,
      duration
    });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  return {
    showToast,
    hideToast,
    toast
  };
};

export default Toast;
