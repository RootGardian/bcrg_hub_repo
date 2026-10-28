import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export const ToastNotification = ({ toast, onClose }) => {
  if (!toast) return null;

  const isError = toast.type === 'error';
  const isInfo = toast.type === 'info';

  const bgColor = isError ? '#fef2f2' : isInfo ? '#eff6ff' : '#f0fdf4';
  const borderColor = isError ? '#fecaca' : isInfo ? '#bfdbfe' : '#bbf7d0';
  const textColor = isError ? '#991b1b' : isInfo ? '#1e40af' : '#166534';
  const Icon = isError ? AlertTriangle : isInfo ? Info : CheckCircle2;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 99999,
        background: bgColor,
        border: `1px solid ${borderColor}`,
        color: textColor,
        padding: '12px 18px',
        borderRadius: '10px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '440px',
        fontSize: '0.9rem',
        fontWeight: 600,
        animation: 'slideUp 0.2s ease-out'
      }}
    >
      <Icon size={18} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: textColor,
            cursor: 'pointer',
            padding: '2px',
            opacity: 0.8
          }}
          aria-label="Fermer la notification"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
};

export default ToastNotification;
