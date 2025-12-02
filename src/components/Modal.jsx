import React from 'react';

const Modal = ({ open, onClose, title, children, className = '' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative max-h-[90vh] overflow-auto bg-white rounded-2xl shadow-xl p-4 ${className}`}>
        {title && <div className="mb-3 font-semibold text-slate-800">{title}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
