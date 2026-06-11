import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { colors, sp, rd } from '../styles';

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
}

export default function SideMenu({ open, onClose }: SideMenuProps) {
  const { user, signOutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNav = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleAuth = async () => {
    if (user) {
      await signOutUser();
    }
    onClose();
    navigate('/login');
  };

  if (!open) return null;

  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div style={styles.menu}>
        {/* Header */}
        <div style={styles.menuHeader}>
          <button style={styles.closeBtn} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.darkGrey} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          {user ? (
            <div style={styles.userInfo}>
              <div style={styles.avatar}>{user.name?.charAt(0).toUpperCase() || 'U'}</div>
              <div style={styles.userName}>{user.name}</div>
              <div style={styles.userPhone}>{user.phone}</div>
            </div>
          ) : (
            <div style={styles.logo}>Open<span style={{ color: colors.primaryBlue }}>Vans</span></div>
          )}
        </div>

        {/* Nav Items — role-aware */}
        <nav style={styles.nav}>
          {user?.role === 'owner' && (
            <>
              {[
                { path: '/driver-jobs', label: '搶單', icon: '📋' },
                { path: '/my-vans', label: '我的車隊', icon: '🚚' },
                { path: '/dashboard', label: '車輛Dashboard', icon: '📊' },
                { path: '/profile', label: '個人資料', icon: '👤' },
              ].map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <div
                    key={item.path}
                    style={isActive ? styles.menuItemActive : styles.menuItem}
                    onClick={() => handleNav(item.path)}
                  >
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <span style={isActive ? styles.labelActive : styles.label}>{item.label}</span>
                  </div>
                );
              })}
            </>
          )}
          {user?.role === 'renter' && (
            <>
              {[
                { path: '/', label: '首頁', icon: '🏠' },
                { path: '/trips', label: '你的柯打', icon: '📋' },
                { path: '/publish', label: '搵車', icon: '🚛' },
              ].map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <div
                    key={item.path}
                    style={isActive ? styles.menuItemActive : styles.menuItem}
                    onClick={() => handleNav(item.path)}
                  >
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <span style={isActive ? styles.labelActive : styles.label}>{item.label}</span>
                  </div>
                );
              })}
            </>
          )}
          {user?.role === 'admin' && (
            <>
              {[
                { path: '/admin', label: '管理後台', icon: '🔧' },
                { path: '/', label: '首頁', icon: '🏠' },
                { path: '/trips', label: '你的柯打', icon: '📋' },
                { path: '/publish', label: '搵車', icon: '🚛' },
                { path: '/my-vans', label: '我的車隊', icon: '🚚' },
                { path: '/driver-jobs', label: '訂單公海', icon: '📋' },
                { path: '/profile', label: '個人資料', icon: '👤' },
              ].map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <div
                    key={item.path}
                    style={isActive ? styles.menuItemActive : styles.menuItem}
                    onClick={() => handleNav(item.path)}
                  >
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <span style={isActive ? styles.labelActive : styles.label}>{item.label}</span>
                  </div>
                );
              })}
            </>
          )}

          <div style={styles.divider} />

          {[
            { label: '設置', icon: '⚙️' },
            { label: '幫助與客服', icon: '💬' },
            { label: '法律條款', icon: '📄' },
          ].map(item => (
            <div key={item.label} style={styles.menuItem} onClick={onClose}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span style={styles.label}>{item.label}</span>
            </div>
          ))}
        </nav>

        {/* Footer — Sign out */}
        <div style={styles.footer}>
          <div style={styles.footerBtn} onClick={handleAuth}>
            <span style={{ fontSize: 18 }}>🚪</span>
            <span style={styles.footerLabel}>登出</span>
          </div>
        </div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed' as const,
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 300,
  },
  menu: {
    position: 'fixed' as const,
    top: 0, right: 0, bottom: 0,
    width: 280,
    background: colors.white,
    zIndex: 400,
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '-4px 0 24px rgba(0,0,0,0.18)',
  },
  menuHeader: {
    padding: `${sp.md}px`,
    borderBottom: `1px solid ${colors.border}`,
    background: colors.white,
  },
  closeBtn: {
    position: 'absolute' as const,
    top: sp.md,
    right: sp.md,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
  },
  avatar: {
    width: 48, height: 48,
    borderRadius: 24,
    background: colors.primaryBlue,
    color: colors.darkGrey,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    fontWeight: 700,
    marginBottom: sp.xs,
  },
  userInfo: {
    paddingTop: sp.xs,
  },
  userName: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.darkGrey,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 13,
    color: colors.textMuted,
  },
  logo: {
    fontFamily: '"Space Grotesk", sans-serif',
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '-1px',
    color: colors.darkGrey,
  },
  nav: {
    flex: 1,
    padding: `${sp.sm}px ${sp.sm}px`,
    overflowY: 'auto' as const,
  },
  divider: {
    height: 1,
    background: colors.border,
    margin: `${sp.sm}px 0`,
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: sp.sm,
    padding: `${sp.sm}px ${sp.sm}px`,
    borderRadius: rd.md,
    cursor: 'pointer',
  },
  menuItemActive: {
    display: 'flex',
    alignItems: 'center',
    gap: sp.sm,
    padding: `${sp.sm}px ${sp.sm}px`,
    borderRadius: rd.md,
    background: colors.lightGrey,
    cursor: 'pointer',
  },
  label: {
    fontSize: 15,
    fontWeight: 600,
    color: colors.darkGrey,
  },
  labelActive: {
    fontSize: 15,
    fontWeight: 700,
    color: colors.primaryBlue,
  },
  footer: {
    padding: `${sp.sm}px`,
    borderTop: `1px solid ${colors.border}`,
  },
  footerBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: sp.sm,
    padding: `${sp.sm}px ${sp.sm}px`,
    borderRadius: rd.md,
    cursor: 'pointer',
  },
  footerLabel: {
    fontSize: 15,
    fontWeight: 600,
    color: colors.error,
  },
};
