import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { colors, sp, rd } from '../styles';
import { IconPackage, IconLargeTruck, IconCheck, IconUser, IconPhone } from '../components/Icon';

interface OnboardingProps {
  isFirstTime?: boolean;
}

export default function OnboardingPage({ isFirstTime = true }: OnboardingProps) {
  const { user, updateUserProfile } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [role, setRole] = useState<'owner' | 'renter' | 'admin'>(user?.role || 'renter');

  const handleComplete = async () => {
    if (!name.trim() || !phone.trim()) {
      showNotification({ title: '請填寫所有欄位', body: '姓名和電話為必填', type: 'warning' });
      return;
    }
    setLoading(true);
    try {
      await updateUserProfile({ name: name.trim(), phone: phone.trim(), role });
      showNotification({ title: '資料已完善！', body: '歡迎加入 OpenVan', type: 'success' });
      // Owner (driver) goes to driver jobs page; renter goes to home
      navigate(role === 'owner' ? '/driver-jobs' : '/');
    } catch (err: any) {
      showNotification({ title: '儲存失敗', body: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <span style={s.headerTitle}>{isFirstTime ? '成為會員' : '完善資料'}</span>
      </div>

      {/* Hero */}
      <div style={s.hero}>
        <div style={s.avatarRing}>
          <div style={s.avatar}>{name.charAt(0)?.toUpperCase() || 'U'}</div>
        </div>
        <div style={s.welcomeTitle}>
          {isFirstTime ? '歡迎加入 OpenVan！' : '更新你的資料'}
        </div>
        <div style={s.welcomeSub}>
          {isFirstTime
            ? '完成以下資料，即可開始使用'
            : '確保你的資料是最新的'}
        </div>
      </div>

      {/* Form card */}
      <div style={s.card}>
        {/* Role selection */}
        <div style={s.section}>
          <div style={s.sectionLabel}>我想以...</div>
          <div style={s.roleGrid}>
            {([
              { key: 'renter', emoji: <IconPackage size={32} />, title: '租用者', desc: '需要運貨/送貨服務' },
              { key: 'owner', emoji: <IconLargeTruck size={32} />, title: '車主', desc: '提供貨Van 服務' },
            ] as const).map(r => (
              <div
                key={r.key}
                style={role === r.key ? s.roleCardActive : s.roleCard}
                onClick={() => setRole(r.key)}
              >
                <span style={s.roleEmoji}>{r.emoji}</span>
                <div style={s.roleTextGroup}>
                  <span style={role === r.key ? s.roleTitleActive : s.roleTitle}>{r.title}</span>
                  <span style={s.roleDesc}>{r.desc}</span>
                </div>
                {role === r.key && (
                  <div style={s.roleCheck}><IconCheck size={16} color={colors.brand} /></div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={s.divider} />

        {/* Name */}
        <div style={s.field}>
          <label style={s.label}><IconUser size={14} color={colors.textSecondary} /> 姓名</label>
          <input
            style={s.input}
            placeholder="如何稱呼你？"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={30}
          />
        </div>

        {/* Phone */}
        <div style={s.field}>
          <label style={s.label}><IconPhone size={14} color={colors.textSecondary} /> 電話（用於司機聯絡）</label>
          <input
            style={s.input}
            type="tel"
            placeholder="+852 XXXX XXXX"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            maxLength={20}
          />
        </div>
      </div>

      {/* Email (read-only) */}
      {user?.email && (
        <div style={s.emailCard}>
          <span style={s.emailLabel}>✉️ 電郵</span>
          <span style={s.emailValue}>{user.email}</span>
        </div>
      )}

      {/* CTA */}
      <div style={s.bottomCta}>
        <button
          style={loading || !name.trim() || !phone.trim() ? s.btnDisabled : s.btnPrimary}
          disabled={loading || !name.trim() || !phone.trim()}
          onClick={handleComplete}
        >
          {loading ? '儲存中…' : isFirstTime ? '開始使用 OpenVan →' : '儲存資料'}
        </button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100dvh',
    background: colors.background,
    fontFamily: 'Inter, system-ui, sans-serif',
    paddingBottom: '32px',
  },
  header: {
    position: 'fixed' as const, top: 0, left: 0, right: 0,
    height: 56, background: colors.white,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 16px', paddingTop: 'env(safe-area-inset-top)', zIndex: 200,
    borderBottom: `1px solid ${colors.border}`,
  },
  headerTitle: {
    fontSize: 16, fontWeight: 700, color: colors.darkGrey,
  },
  hero: {
    paddingTop: 76, paddingBottom: sp.md,
    background: colors.white,
    textAlign: 'center' as const,
    marginBottom: sp.md,
  },
  avatarRing: {
    width: 72, height: 72, borderRadius: 36,
    background: `linear-gradient(135deg, ${colors.primaryBlue}, ${colors.primary})`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: `0 auto ${sp.sm}`, padding: 3,
  },
  avatar: {
    width: 66, height: 66, borderRadius: 33,
    background: colors.white, color: colors.primaryBlue,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 28, fontWeight: 800,
  },
  welcomeTitle: {
    fontSize: 22, fontWeight: 800, color: colors.darkGrey,
    marginBottom: 4,
  },
  welcomeSub: {
    fontSize: 14, color: colors.textSecondary,
  },
  card: {
    background: colors.surface,
    margin: `0 ${sp.md} ${sp.md}`,
    borderRadius: rd.lg,
    padding: sp.md,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: sp.md,
  },
  section: { display: 'flex', flexDirection: 'column' as const, gap: sp.sm },
  sectionLabel: {
    fontSize: 13, fontWeight: 700, color: colors.textMuted,
    textTransform: 'uppercase' as const, letterSpacing: '0.06em',
  },
  roleGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  roleCard: {
    padding: '14px 12px', borderRadius: rd.lg,
    border: '1.5px solid #E4E7EC',
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
    gap: 6, cursor: 'pointer',
    background: colors.surface,
    transition: 'all 0.15s',
  },
  roleCardActive: {
    padding: '14px 12px', borderRadius: rd.lg,
    border: '2px solid #0070f3',
    background: '#E8F1FF',
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
    gap: 6, cursor: 'pointer',
    transition: 'all 0.15s',
  },
  roleEmoji: { fontSize: 28 },
  roleTextGroup: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 2 },
  roleTitle: { fontSize: 13, fontWeight: 600, color: '#6B7280' },
  roleTitleActive: { fontSize: 13, fontWeight: 700, color: colors.primaryBlue },
  roleDesc: { fontSize: 11, color: colors.textMuted },
  roleCheck: {
    fontSize: 14, fontWeight: 800,
    width: 20, height: 20, borderRadius: 10,
    background: colors.primaryBlue, color: colors.darkGrey,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  divider: { height: 1, background: colors.lightGrey },
  field: { display: 'flex', flexDirection: 'column' as const, gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: colors.textMuted },
  input: {
    width: '100%', padding: '12px 16px',
    border: '1.5px solid #E4E7EC', borderRadius: rd.md,
    fontSize: 15, background: colors.white, color: colors.darkGrey,
    outline: 'none', boxSizing: 'border-box' as const,
    fontFamily: 'Inter, sans-serif',
  },
  emailCard: {
    margin: `0 ${sp.md} ${sp.md}`,
    background: colors.surface,
    borderRadius: rd.lg,
    padding: '12px 16px',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  emailLabel: { fontSize: 13, color: colors.textMuted },
  emailValue: { fontSize: 13, fontWeight: 600, color: colors.darkGrey },
  bottomCta: { padding: `0 ${sp.md}`, marginTop: sp.sm },
  btnPrimary: {
    width: '100%', padding: '14px',
    background: colors.primaryBlue, color: colors.darkGrey,
    border: 'none', borderRadius: rd.md,
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
  },
  btnDisabled: {
    width: '100%', padding: '14px',
    background: '#D1D5DB', color: '#9CA3AF',
    border: 'none', borderRadius: rd.md,
    fontSize: 15, fontWeight: 700, cursor: 'not-allowed',
  },
};