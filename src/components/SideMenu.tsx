import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { colors, sp, rd } from '../styles';
import {
  IconClipboard, IconTruck, IconUser,
  IconHome, IconLargeTruck, IconWrench,
  IconSettings, IconChat, IconDocument, IconLogout,
} from './Icon';

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
            <IconLogout size={20} color={colors.darkGrey} />
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
          {user?.role === 'driver' && (
            <>
              {[
                { path: '/driver-jobs', label: '搶單', icon: <IconClipboard size={18} /> },
                { path: '/my-vans', label: '我的車隊', icon: <IconTruck size={18} /> },
                { path: '/profile', label: '個人資料', icon: <IconUser size={18} /> },
              ].map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <div
                    key={item.path}
                    style={isActive ? styles.menuItemActive : styles.menuItem}
                    onClick={() => handleNav(item.path)}
                  >
                    <span style={isActive ? styles.iconActive : styles.icon}>{item.icon}</span>
                    <span style={isActive ? styles.labelActive : styles.label}>{item.label}</span>
                  </div>
                );
              })}
            </>
          )}
          {user?.role === 'renter' && (
            <>
              {[
                { path: '/', label: '首頁', icon: <IconHome size={18} /> },
                { path: '/trips', label: '你的柯打', icon: <IconClipboard size={18} /> },
                { path: '/publish', label: '搵車', icon: <IconLargeTruck size={18} /> },
              ].map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <div
                    key={item.path}
                    style={isActive ? styles.menuItemActive : styles.menuItem}
                    onClick={() => handleNav(item.path)}
                  >
                    <span style={isActive ? styles.iconActive : styles.icon}>{item.icon}</span>
                    <span style={isActive ? styles.labelActive : styles.label}>{item.label}</span>
                  </div>
                );
              })}
            </>
          )}
          {user?.role === 'admin' && (
            <>
              {[
                { path: '/admin', label: '管理後台', icon: <IconWrench size={18} /> },
                { path: '/', label: '首頁', icon: <IconHome size={18} /> },
                { path: '/trips', label: '你的柯打', icon: <IconClipboard size={18} /> },
                { path: '/publish', label: '搵車', icon: <IconLargeTruck size={18} /> },
                { path: '/my-vans', label: '我的車隊', icon: <IconTruck size={18} /> },
                { path: '/driver-jobs', label: '訂單公海', icon: <IconClipboard size={18} /> },
                { path: '/profile', label: '個人資料', icon: <IconUser size={18} /> },
              ].map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <div
                    key={item.path}
                    style={isActive ? styles.menuItemActive : styles.menuItem}
                    onClick={() => handleNav(item.path)}
                  >
                    <span style={isActive ? styles.iconActive : styles.icon}>{item.icon}</span>
                    <span style={isActive ? styles.labelActive : styles.label}>{item.label}</span>
                  </div>
                );
              })}
            </>
          )}

          <div style={styles.divider} />

          {[
            { label: '設置', icon: <IconSettings size={18} /> },
            { label: '幫助與客服', icon: <IconChat size={18} /> },
            { label: '法律條款', icon: <IconDocument size={18} /> },
          ].map(item => (
            <div key={item.label} style={styles.menuItem} onClick={onClose}>
              <span style={styles.icon}>{item.icon}</span>
              <span style={styles.label}>{item.label}</span>
            </div>
          ))}
        </nav>

        {/* Footer — Sign out */}
        <div style={styles.footer}>
          <div style={styles.footerBtn} onClick={handleAuth}>
            <span style={styles.icon}><IconLogout size={18} /></span>
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
    boxShadow: '-8px 0 32px rgba(0,0,0,0.20)',
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
    borderRadius: rd.full,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  menuItemActive: {
    display: 'flex',
    alignItems: 'center',
    gap: sp.sm,
    padding: `${sp.sm}px ${sp.sm}px`,
    borderRadius: rd.full,
    background: 'rgba(195,234,79,0.15)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  icon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.darkGrey,
  },
  iconActive: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.primaryBlue,
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
