import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { colors } from '../styles';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isOwner = user?.role === 'owner';

  // Owner: 搶單, 行程, 我的Van, 我的
  // Renter: 首頁, 貨運, 搵車, 我的
  const ownerItems = [
    { path: '/driver-jobs', icon: '📋', label: '搶單' },
    { path: '/trips', icon: '📋', label: '行程' },
    { path: '/my-vans', icon: '🚚', label: '我的Van' },
    { path: '/profile', icon: '👤', label: '我的', accent: false },
  ];

  const renterItems = [
    { path: '/', icon: '🏠', label: '首頁' },
    { path: '/trips', icon: '📋', label: '貨運' },
    { path: '/publish', icon: '＋', label: '搵車', accent: true },
    { path: '/profile', icon: '👤', label: '我的' },
  ];

  const items = isOwner ? ownerItems : renterItems;

  return (
    <div style={styles.nav}>
      {items.map(item => {
        const isActive = location.pathname === item.path;
        return (
          <div
            key={item.path}
            style={isActive ? styles.itemActive : styles.item}
            onClick={() => navigate(item.path)}
          >
            <span style={item.accent ? styles.fab : isActive ? styles.iconActive : styles.icon}>
              {item.icon}
            </span>
            <span style={isActive ? styles.labelActive : styles.label}>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 'auto',
    minHeight: '76px',
    background: colors.white,
    borderTop: `1px solid ${colors.border}`,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    zIndex: 200,
    paddingBottom: 'env(safe-area-inset-bottom)',
    paddingTop: 8,
  },
  item: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 3,
    padding: '6px 14px',
    cursor: 'pointer',
    minWidth: 60,
  },
  itemActive: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 3,
    padding: '6px 14px',
    cursor: 'pointer',
    minWidth: 60,
  },
  icon: {
    fontSize: 20,
    color: colors.textMuted,
  },
  iconActive: {
    fontSize: 20,
    color: colors.darkGrey,
  },
  fab: {
    fontSize: 22,
    background: colors.primaryBlue,
    color: colors.darkGrey,
    width: 48,
    height: 48,
    borderRadius: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    boxShadow: '0 4px 12px rgba(0,136,204,0.35)',
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.darkGrey,
    letterSpacing: '0.02em',
  },
  labelActive: {
    fontSize: 11,
    fontWeight: 700,
    color: colors.darkGrey,
    letterSpacing: '0.02em',
  },
};
