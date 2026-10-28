import React from 'react';
import { LogOut } from 'lucide-react';

export const LogoutOverlay = ({ isLoggingOut }) => {
  if (!isLoggingOut) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Déconnexion en cours"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        color: 'white'
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px 36px',
          maxWidth: '430px',
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          color: '#1e293b'
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#fee2e2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}
        >
          <LogOut size={26} />
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>
          Déconnexion Sécurisée
        </h3>
        <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5 }}>
          Révocation de vos habilitations actives et clôture de vos sessions sur l'ensemble des applications métier...
        </p>
        <div
          style={{
            width: '100%',
            height: '4px',
            background: '#e2e8f0',
            borderRadius: '2px',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              background: '#dc2626',
              animation: 'indeterminate 1.5s infinite linear'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default LogoutOverlay;
