import { useState, useEffect, useRef } from 'react';
import { IconPackage, IconLargeTruck } from '../components/Icon';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { colors } from '../styles';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, signIn, signUp, renderGoogleButton } = useAuth();
  const { showNotification } = useNotification();
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Already logged in → route based on stored role.
  // Existing users with role=driver → /driver-jobs; renter/admin → / (叫車畫面).
  // New Google sign-in (no user doc) → /onboarding to pick role.
  useEffect(() => {
    if (!user) return;
    // Heuristic: if phone is empty AND createdAt is within the last minute,
    // treat as new user and route to onboarding.
    const isNewUser = !user.phone && user.createdAt &&
      (Date.now() - new Date(user.createdAt).getTime()) < 60_000;
    if (isNewUser) {
      navigate('/onboarding');
    } else if (user.role === 'driver') {
      navigate('/driver-jobs');
    } else {
      navigate('/');
    }
  }, [user]);

  // Mount a real Google Sign-In button (rendered by Google Identity Services).
  // This replaces the previous One Tap UX which was hidden in the corner and
  // could leave the loading state stuck if dismissed.
  // (moved above with role state)

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'driver' | 'renter'>('renter');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Mount a real Google Sign-In button (rendered by Google Identity Services).
  // Role is NOT collected on sign-in — the stored role (or default 'renter' for
  // new users) comes from the Firestore user doc. New users are routed to
  // /onboarding by the user-effect above to pick their role.
  useEffect(() => {
    if (!googleButtonRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        await renderGoogleButton(googleButtonRef.current!, (msg) => {
          if (cancelled) return;
          showNotification({ title: 'Google 登入失敗', body: msg, type: 'error' });
        });
      } catch (err: any) {
        if (cancelled) return;
        showNotification({ title: '錯誤', body: err?.message || 'Google 登入初始化失敗', type: 'error' });
      }
    })();
    return () => { cancelled = true; };
  }, [renderGoogleButton, showNotification]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && (!name || !phone))) return;
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        showNotification({ title: '登入成功', body: '歡迎回來！', type: 'success' });
        // Routing handled by the user-effect above based on stored role.
      } else {
        await signUp(email, password, name, phone, role);
        showNotification({ title: '註冊成功', body: '歡迎加入 OpenVan！', type: 'success' });
        navigate('/onboarding');
      }
    } catch (err: any) {
      showNotification({ title: '錯誤', body: err.message || '操作失敗', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // handleGoogle is no longer used — the real Google button is rendered by renderGoogleButton().

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.darkGrey} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span style={s.topTitle}>{isLogin ? '登入' : '註冊'}</span>
        <div style={{ width: 40 }} />
      </div>

      {/* Logo */}
      <div style={s.logoSection}>
        <div style={s.logoMark}><IconLargeTruck size={48} color={colors.primaryBlue} /></div>
        <div style={s.logoText}>open<span style={s.logoAccent}>van</span></div>
        <div style={s.tagline}>香港貨 Van 租賃平台</div>
      </div>

      {/* Role selector (signup only) */}
      {!isLogin && (
        <div style={s.roleSection}>
          <div style={s.roleLabel}>我想以...</div>
          <div style={s.roleGrid}>
            {([
              { key: 'renter' as const, text: '租用者' },
              { key: 'driver' as const, text: '司機' },
            ]).map(r => (
              <div
                key={r.key}
                style={role === r.key ? s.roleCardActive : s.roleCard}
                onClick={() => setRole(r.key as typeof role)}
              >
                <span style={s.roleEmoji}>
                  {r.key === 'renter' ? <IconPackage size={28} color={role === r.key ? colors.primaryBlue : colors.darkGrey} /> : <IconLargeTruck size={28} color={role === r.key ? colors.primaryBlue : colors.darkGrey} />}
                </span>
                <span style={role === r.key ? s.roleTextActive : s.roleText}>{r.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      <form style={s.form} onSubmit={handleSubmit}>
        {!isLogin && (
          <>
            <div style={s.field}>
              <label style={s.label}>姓名</label>
              <input style={s.input} placeholder="你的名稱" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div style={s.field}>
              <label style={s.label}>電話</label>
              <input style={s.input} placeholder="+852 XXXX XXXX" value={phone} onChange={e => setPhone(e.target.value)} required />
            </div>
          </>
        )}

        <div style={s.field}>
          <label style={s.label}>電郵</label>
          <input style={s.input} type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>

        <div style={s.field}>
          <label style={s.label}>密碼</label>
          <input style={s.input} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>

        <button type="submit" style={loading ? s.btnDisabled : s.btnPrimary} disabled={loading}>
          {loading ? '處理中…' : isLogin ? '登入' : '註冊'}
        </button>

        <div style={s.divider}>
          <div style={s.divLine} />
          <span style={s.divText}>或</span>
          <div style={s.divLine} />
        </div>

        {/* Real Google Sign-In button — rendered by Google Identity Services */}
        <div
          ref={googleButtonRef}
          style={s.googleButtonContainer}
        />
      </form>

      {/* Toggle */}
      <div style={s.toggle}>
        {isLogin ? '還未成為會員？' : '已經是會員？'}
        <span style={s.toggleLink} onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? '立即註冊' : '登入'}
        </span>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100dvh',
    background: '#F5F7FA',
    fontFamily: 'Inter, system-ui, sans-serif',
    paddingTop: 'env(safe-area-inset-top)',
  },
  header: {
    position: 'fixed' as const, top: 0, left: 0, right: 0,
    height: 56, background: colors.white,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 16px', paddingTop: 'env(safe-area-inset-top)', zIndex: 200,
    borderBottom: `1px solid ${colors.border}`,
  },
  backBtn: {
    background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
  },
  topTitle: { fontSize: 16, fontWeight: 600, color: colors.darkGrey },
  logoSection: {
    paddingTop: 88, textAlign: 'center' as const, marginBottom: 28,
  },
  logoMark: { fontSize: 48, marginBottom: 8 },
  logoText: {
    fontFamily: '"Space Grotesk", sans-serif',
    fontSize: 30, fontWeight: 700, letterSpacing: '-0.5px',
    color: '#111827',
  },
  logoAccent: { color: '#0070f3' },
  tagline: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  roleSection: { padding: '0 24px', marginBottom: 20 },
  roleLabel: { fontSize: 13, fontWeight: 600, color: '#6B7280', marginBottom: 8 },
  roleGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  roleCard: {
    padding: '14px 12px', borderRadius: 12,
    border: '1.5px solid #E4E7EC',
    textAlign: 'center' as const, cursor: 'pointer',
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 6,
    transition: 'all 0.15s',
  },
  roleCardActive: {
    padding: '14px 12px', borderRadius: 12,
    border: '2px solid #0070f3',
    background: '#E8F1FF',
    textAlign: 'center' as const, cursor: 'pointer',
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 6,
  },
  roleEmoji: { fontSize: 24 },
  roleText: { fontSize: 14, fontWeight: 600, color: '#6B7280' },
  roleTextActive: { fontSize: 14, fontWeight: 700, color: '#0070f3' },
  form: {
    padding: '0 24px', display: 'flex', flexDirection: 'column' as const, gap: 14,
  },
  field: { display: 'flex', flexDirection: 'column' as const, gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#6B7280' },
  input: {
    width: '100%', padding: '12px 16px',
    border: '1.5px solid #E4E7EC', borderRadius: 12,
    fontSize: 15, background: '#fff', color: '#111827',
    outline: 'none', boxSizing: 'border-box' as const,
    fontFamily: 'Inter, sans-serif',
  },
  btnPrimary: {
    background: colors.primaryBlue, color: colors.darkGrey,
    border: 'none', borderRadius: 12,
    padding: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4,
  },
  btnDisabled: {
    background: '#9CA3AF', color: 'white',
    border: 'none', borderRadius: 12,
    padding: 14, fontSize: 15, fontWeight: 700, cursor: 'not-allowed', marginTop: 4,
  },
  btnGoogle: {
    background: '#fff', color: '#111827',
    border: '1.5px solid #E4E7EC', borderRadius: 12,
    padding: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  googleButtonContainer: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    minHeight: 48, // prevent layout shift while GIS loads
  },
  divider: { display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' },
  divLine: { flex: 1, height: 1, background: '#E4E7EC' },
  divText: { fontSize: 13, color: '#9CA3AF' },
  toggle: {
    textAlign: 'center' as const, marginTop: 20,
    fontSize: 14, color: '#6B7280',
  },
  toggleLink: {
    color: '#0070f3', fontWeight: 700, cursor: 'pointer', marginLeft: 4,
  },
};
