import React, { createContext, useContext, useState, useCallback } from 'react';
import { IconInfo, IconSuccess, IconWarning, IconError } from '../components/Icon';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  showNotification: (n: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((
    n: Omit<Notification, 'id' | 'isRead' | 'createdAt'>
  ) => {
    const notification: Notification = {
      ...n,
      id: Date.now().toString(),
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [notification, ...prev].slice(0, 50)); // keep last 50

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(x => x.id !== notification.id));
    }, 4000);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const dismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const dismissAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, showNotification, dismiss, dismissAll }}>
      {children}
      {/* Toast notifications */}
      <div style={{
        position: 'fixed',
        top: '70px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '90%',
        maxWidth: '400px',
        pointerEvents: 'none',
      }}>
        {notifications.map(n => (
          <Toast key={n.id} notification={n} onDismiss={() => dismiss(n.id)} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

function Toast({ notification, onDismiss }: { notification: Notification; onDismiss: () => void }) {
  const bgMap = {
    info: '#e3f2fd',
    success: '#e8f5e9',
    warning: '#fff3e0',
    error: '#ffebee',
  };
  const colorMap = {
    info: '#0d47a1',
    success: '#1b5e20',
    warning: '#e65100',
    error: '#b71c1c',
  };
  const iconMap = {
    info: IconInfo,
    success: IconSuccess,
    warning: IconWarning,
    error: IconError,
  };

  return (
    <div
      style={{
        background: bgMap[notification.type],
        color: colorMap[notification.type],
        borderRadius: '12px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        pointerEvents: 'auto',
        cursor: 'pointer',
        animation: 'slideDown 0.3s ease',
      }}
      onClick={onDismiss}
    >
      <span style={{ flexShrink: 0 }}>{React.createElement(iconMap[notification.type], { size: 18, color: colorMap[notification.type] })}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>
          {notification.title}
        </div>
        <div style={{ fontSize: '13px', opacity: 0.8 }}>{notification.body}</div>
      </div>
    </div>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be within NotificationProvider');
  return ctx;
}
