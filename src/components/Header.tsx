import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { colors, sp, rd } from '../styles';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  onMenuOpen: () => void;
}

export default function Header({ title, showBack, onBack, onMenuOpen }: HeaderProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  return (
    <div style={styles.header}>
      <div style={styles.left}>
        {showBack ? (
          <button style={styles.backBtn} onClick={handleBack}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.primaryBlue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        ) : (
          <div style={styles.brand}>open<span style={styles.brandAccent}>van</span></div>
        )}
      </div>

      <div style={styles.center}>
        {title && <span style={styles.title}>{title}</span>}
      </div>

      <div style={styles.right}>
        {user ? (
          /* User avatar pill — opens menu */
          <button style={styles.userPill} onClick={onMenuOpen}>
            <div style={styles.avatar}>
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </button>
        ) : (
          /* Login button */
          <button style={styles.loginBtn} onClick={() => navigate('/login')}>
            登入
          </button>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    height: '56px',
    background: colors.white,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `0 ${sp.md}`,
    zIndex: 200,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  left: { width: '60px', display: 'flex', alignItems: 'center' },
  center: { flex: 1, textAlign: 'center' as const },
  right: { width: '60px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' },
  brand: {
    fontFamily: '"Space Grotesk", sans-serif',
    fontSize: '20px',
    fontWeight: 700,
    letterSpacing: '-1px',
    color: colors.darkGrey,
  },
  brandAccent: { color: colors.primaryBlue },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.darkGrey,
  },
  backBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  userPill: {
    display: 'flex',
    alignItems: 'center',
    gap: sp.xs,
    background: colors.primaryBlue,
    border: 'none',
    borderRadius: rd.full,
    padding: '3px 12px 3px 3px',
    cursor: 'pointer',
  },
  avatar: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    background: colors.white,
    color: colors.primaryBlue,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 700,
  },
  loginBtn: {
    background: colors.primaryBlue,
    color: colors.darkGrey,
    border: 'none',
    borderRadius: rd.full,
    padding: '7px 16px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
};