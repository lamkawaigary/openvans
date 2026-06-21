import { useState } from 'react';
import { IconLargeTruck, IconPackage, IconChart, IconClipboard, IconLogout, IconUser, IconPhone, IconMail } from '../components/Icon';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { colors, sp, rd } from '../styles';

export default function ProfilePage() {
  const { user, signOutUser, updateUserProfile } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleSave = async () => {
    try {
      await updateUserProfile({ name, phone });
      showNotification({ title: '更新成功', body: '個人資料已更新', type: 'success' });
      setEditing(false);
    } catch (err: any) {
      showNotification({ title: '更新失敗', body: err.message, type: 'error' });
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    navigate('/');
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
        <span style={s.title}>個人資料</span>
        <button style={editing ? s.saveBtn : s.editBtn} onClick={() => editing ? handleSave() : setEditing(true)}>
          {editing ? '儲存' : '編輯'}
        </button>
      </div>

      {/* Avatar + name hero */}
      <div style={s.heroSection}>
        <div style={s.avatarRing}>
          <div style={s.avatar}>{user.name?.charAt(0).toUpperCase() || 'U'}</div>
        </div>
        {!editing ? (
          <>
            <div style={s.userName}>{user.name || '未設定姓名'}</div>
            <div style={s.userRole}>
              <span style={s.roleBadge}>
                {user.role === 'driver'
                  ? <><IconLargeTruck size={14} color={colors.textSecondary} /> 司機</>
                  : <><IconPackage size={14} color={colors.textSecondary} /> 租用者</>}
              </span>
            </div>
          </>
        ) : (
          <div style={s.editHint}>編輯中…</div>
        )}
      </div>

      {/* Profile card */}
      <div style={s.card}>
        <div style={s.cardTitle}>聯絡資料</div>
        <div style={s.field}>
          <div style={s.fieldRow}>
            <span style={s.fieldIcon}><IconUser size={20} color={colors.textMuted} /></span>
            <div style={s.fieldContent}>
              <span style={s.fieldLabel}>姓名</span>
              {editing ? (
                <input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="輸入姓名" />
              ) : (
                <span style={s.fieldValue}>{user.name || '未設定'}</span>
              )}
            </div>
          </div>
        </div>
        <div style={s.divider} />
        <div style={s.field}>
          <div style={s.fieldRow}>
            <span style={s.fieldIcon}><IconPhone size={20} color={colors.textMuted} /></span>
            <div style={s.fieldContent}>
              <span style={s.fieldLabel}>電話</span>
              {editing ? (
                <input style={s.input} value={phone} onChange={e => setPhone(e.target.value)} placeholder="輸入電話" />
              ) : (
                <span style={s.fieldValue}>{user.phone || '未設定'}</span>
              )}
            </div>
          </div>
        </div>
        <div style={s.divider} />
        <div style={s.field}>
          <div style={s.fieldRow}>
            <span style={s.fieldIcon}><IconMail size={20} color={colors.textMuted} /></span>
            <div style={s.fieldContent}>
              <span style={s.fieldLabel}>電郵</span>
              <span style={s.fieldValue}>{user.email || '未設定'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div style={s.menuSection}>
        <div style={s.cardTitle}>功能</div>
        {user.role === 'driver' && (
          <>
            <div style={s.menuItem} onClick={() => navigate('/my-vans')}>
              <div style={s.menuIconWrap}><IconLargeTruck size={20} color={colors.textPrimary} /></div>
              <div style={s.menuText}>
                <span style={s.menuLabel}>我的貨車</span>
                <span style={s.menuSub}>管理你的車隊</span>
              </div>
              <span style={s.menuArrow}>›</span>
            </div>
            <div style={s.menuItem} onClick={() => navigate('/dashboard')}>
              <div style={s.menuIconWrap}><IconChart size={20} color={colors.textPrimary} /></div>
              <div style={s.menuText}>
                <span style={s.menuLabel}>司機 Dashboard</span>
                <span style={s.menuSub}>接受訂單、管理行程</span>
              </div>
              <span style={s.menuArrow}>›</span>
            </div>
          </>
        )}
        <div style={s.menuItem} onClick={() => navigate('/trips')}>
          <div style={s.menuIconWrap}><IconClipboard size={20} color={colors.textPrimary} /></div>
          <div style={s.menuText}>
            <span style={s.menuLabel}>我的貨運訂單</span>
            <span style={s.menuSub}>查看歷史記錄</span>
          </div>
          <span style={s.menuArrow}>›</span>
        </div>
      </div>

      {/* Sign out */}
      <button style={s.signOutBtn} onClick={handleSignOut}>
        <IconLogout size={18} color={colors.error} /> 登出
      </button>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100dvh', background: colors.background, fontFamily: 'Inter, system-ui, sans-serif', paddingBottom: '40px' },
  header: {
    position: 'fixed' as const, top: 0, left: 0, right: 0, height: 56,
    background: colors.white, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 16px', zIndex: 200, boxShadow: `0 1px 3px ${colors.border}`, paddingTop: 'env(safe-area-inset-top)',
  },
  backBtn: { background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: 700, color: colors.darkGrey },
  editBtn: { background: 'transparent', border: `1.5px solid ${colors.primaryBlue}`, color: colors.primaryBlue, borderRadius: rd.md, padding: '5px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  saveBtn: { background: colors.primaryBlue, border: 'none', color: colors.darkGrey, borderRadius: rd.md, padding: '5px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  heroSection: {
    paddingTop: 76, paddingBottom: 20, textAlign: 'center' as const,
    background: colors.white, marginBottom: sp.md,
  },
  avatarRing: {
    width: 88, height: 88, borderRadius: 44,
    background: `linear-gradient(135deg, ${colors.primaryBlue}, ${colors.primary})`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 12px', padding: 3,
  },
  avatar: {
    width: 82, height: 82, borderRadius: 41,
    background: colors.white, color: colors.primaryBlue,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 34, fontWeight: 800,
  },
  userName: { fontSize: 22, fontWeight: 800, color: colors.darkGrey, marginBottom: 6 },
  userRole: { display: 'flex', justifyContent: 'center' },
  roleBadge: { fontSize: 13, fontWeight: 600, color: colors.textSecondary, background: colors.background, padding: '3px 12px', borderRadius: 20 },
  editHint: { fontSize: 13, color: colors.primaryBlue, fontWeight: 600 },
  card: { background: colors.surface, margin: `0 ${sp.md} ${sp.md}`, borderRadius: rd.lg, padding: sp.md },
  cardTitle: { fontSize: 12, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: sp.sm, padding: '0 4px' },
  field: { padding: '10px 4px' },
  fieldRow: { display: 'flex', alignItems: 'center', gap: 12 },
  fieldIcon: { fontSize: 20, width: 28, textAlign: 'center' as const },
  fieldContent: { flex: 1, display: 'flex', flexDirection: 'column' as const, gap: 2 },
  fieldLabel: { fontSize: 12, fontWeight: 600, color: colors.textMuted },
  fieldValue: { fontSize: 15, fontWeight: 600, color: colors.darkGrey },
  input: { width: '100%', padding: '4px 0', border: 'none', borderBottom: `2px solid ${colors.primaryBlue}`, fontSize: 15, fontWeight: 600, color: colors.darkGrey, outline: 'none', background: 'transparent' },
  divider: { height: 1, background: colors.lightGrey, margin: '0 4px' },
  menuSection: { padding: `0 ${sp.md}`, display: 'flex', flexDirection: 'column' as const, gap: sp.xs },
  menuItem: { background: colors.surface, borderRadius: rd.lg, padding: '14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' },
  menuIconWrap: { width: 40, height: 40, borderRadius: 12, background: colors.background, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  menuIcon: { fontSize: 20 },
  menuText: { flex: 1, display: 'flex', flexDirection: 'column' as const, gap: 2 },
  menuLabel: { fontSize: 15, fontWeight: 700, color: colors.darkGrey },
  menuSub: { fontSize: 12, color: colors.textMuted },
  menuArrow: { fontSize: 22, color: colors.textMuted, fontWeight: 300 },
  signOutBtn: { display: 'block', margin: `${sp.lg}px ${sp.md} 0`, background: colors.surface, color: colors.error, border: `1.5px solid ${colors.error}22`, borderRadius: rd.lg, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer', width: 'calc(100% - 32px)' },
};