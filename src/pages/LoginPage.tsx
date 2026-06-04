import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleAuthProvider, signInWithRedirect } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { colors } from '../styles';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, signIn, signUp, signInWithGoogle } = useAuth();
  const { showNotification } = useNotification();

  // Already logged in → go home (onboarding check happens there)
  useEffect(() => {
    if (user) navigate('/');
  }, [user]);

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'owner' | 'renter'>('renter');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && (!name || !phone))) return;
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        showNotification({ title: '登入成功', body: '歡迎回來！', type: 'success' });
        navigate('/');
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

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await signInWithGoogle(role);
      showNotification({ title: '登入成功', body: '以 Google 帳戶登入', type: 'success' });
      navigate('/onboarding');
    } catch (err: any) {
      if (err.message === 'popup_blocked') {
        showNotification({ 
          title: '請稍等', 
          body: '正在打開 Google 登入...', 
          type: 'info' 
        });
        try {
          const provider = new GoogleAuthProvider();
          await signInWithRedirect(auth, provider);
        } catch (redirectErr) {
          showNotification({ title: '錯誤', body: '無法打開 Google 登入，請允許彈出窗口', type: 'error' });
        }
      } else if (err.message === 'unauthorized_domain') {
        showNotification({ title: '錯誤', body: '網域未被授權，請聯絡系統管理員', type: 'error' });
      } else {
        showNotification({ title: '錯誤', body: err.message || 'Google 登入失敗', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

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
        <div style={s.logoMark}>🚛</div>
        <div style={s.logoText}>open<span style={s.logoAccent}>van</span></div>
        <div style={s.tagline}>香港貨 Van 租賃平台</div>
      </div>

      {/* Role selector (signup only) */}
      {!isLogin && (
        <div style={s.roleSection}>
          <div style={s.roleLabel}>我想以...</div>
          <div style={s.roleGrid}>
            {[
              { key: 'renter', emoji: '📦', text: '租用者' },
              { key: 'owner', emoji: '🚛', text: '車主' },
            ].map(r => (
              <div
                key={r.key}
                style={role === r.key ? s.roleCardActive : s.roleCard}
                onClick={() => setRole(r.key as typeof role)}
              >
                <span style={s.roleEmoji}>{r.emoji}</span>
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

        <button type="button" style={s.btnGoogle} onClick={handleGoogle}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {isLogin ? '以 Google 登入' : '以 Google 註冊'}
        </button>
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
