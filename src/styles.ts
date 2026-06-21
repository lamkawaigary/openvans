// ============================================
// OpenVan Design System
// ============================================

export const colors = {
  // Brand
  brand: '#c3ea4f',        // Electric blue (primary action)
  brandDark: '#a8d63f',    // Hover / pressed
  brandLight: '#eef9d4',   // Light blue bg

  // OpenVan Design System (GoGoX/Lalamove style)
  primaryBlue: '#c3ea4f',  // Brand primary (electric green)
  orange: '#FF6600',       // Destination marker, selected tip chip
  yellow: '#FFD700',       // Active filter pill
  lightGrey: '#F2F2F2',    // Inactive pills, backgrounds
  darkGrey: '#4A4A4A',     // Body text

  // Neutrals
  primary: '#111827',       // Near black (headers, key text)
  surface: '#FFFFFF',        // Card/panel bg
  background: '#F5F7FA',    // Page bg (softer than white)
  border: '#E4E7EC',        // Subtle dividers

  // Text
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',

  // Status
  success: '#10B981',
  successBg: '#ECFDF5',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  error: '#EF4444',
  errorBg: '#FEF2F2',

  // Misc
  white: '#F2F2F2',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.4)',

  // Layered Shadows (soft, layered feel)
  shadowSm: '0 2px 8px rgba(0,0,0,0.08)',
  shadowMd: '0 4px 16px rgba(0,0,0,0.10)',
  shadowLg: '0 8px 32px rgba(0,0,0,0.14)',
  shadowXl: '0 12px 48px rgba(0,0,0,0.18)',

  // Glass effect (translucent)
  glassSm: 'backdrop-filter: blur(8px); background: rgba(255,255,255,0.72); border: 1px solid rgba(255,255,255,0.4);',
  glassMd: 'backdrop-filter: blur(16px); background: rgba(255,255,255,0.65); border: 1px solid rgba(255,255,255,0.35);',
  glassLg: 'backdrop-filter: blur(24px); background: rgba(255,255,255,0.55); border: 1px solid rgba(255,255,255,0.30);',
}

// ============================================
// Spacing (consistent 4px grid)
// ============================================
export const sp = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
}

// ============================================
// Border Radius (harmonized)
// ============================================
export const rd = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
}

// ============================================
// Typography
// ============================================
export const fonts = {
  regular: 'fontFamily: "Inter", system-ui, sans-serif',
}

// ============================================
// Shared Styles
// ============================================

// Page container
export const page = {
  minHeight: '100vh',
  background: colors.background,
  fontFamily: 'Inter, system-ui, sans-serif',
  color: colors.textPrimary,
  paddingBottom: '88px', // bottom nav height + buffer
  maxWidth: '480px',
  margin: '0 auto',
  position: 'relative',
}

// Fixed header
export const header = {
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
  maxWidth: '480px',
  margin: '0 auto',
  boxShadow: colors.shadowSm,
}

// Bottom nav
export const bottomNav = {
  position: 'fixed' as const,
  bottom: 0,
  left: 0,
  right: 0,
  height: '76px',
  background: colors.white,
  borderTop: `1px solid ${colors.border}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-around',
  zIndex: 200,
  maxWidth: '480px',
  margin: '0 auto',
  paddingBottom: '8px', // safe area for iOS
}

// Card (default) — soft layered shadow + subtle border
export const card = {
  background: colors.surface,
  borderRadius: rd.lg,
  padding: sp.md,
  boxShadow: colors.shadowMd,
  border: '1px solid rgba(0,0,0,0.05)',
}

// Card elevated — stronger shadow for floating cards
export const cardElevated = {
  background: colors.surface,
  borderRadius: rd.lg,
  padding: sp.md,
  boxShadow: colors.shadowLg,
  border: '1px solid rgba(255,255,255,0.8)',
}

// Card glass — translucent glass effect
export const cardGlass = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderRadius: rd.lg,
  padding: sp.md,
  boxShadow: colors.shadowSm,
  border: '1px solid rgba(255,255,255,0.5)',
}

// Input
export const inputBase = {
  width: '100%' as const,
  padding: `${sp.sm} ${sp.md}`,
  border: `1.5px solid ${colors.border}`,
  borderRadius: rd.md,
  fontSize: '15px',
  background: colors.surface,
  color: colors.textPrimary,
  outline: 'none',
  boxSizing: 'border-box' as const,
  transition: 'border-color 0.15s',
  fontFamily: 'Inter, system-ui, sans-serif',
}

// Primary button — pill shape with soft shadow
export const btnPrimary = {
  background: colors.brand,
  color: colors.darkGrey,
  border: 'none',
  borderRadius: rd.full,
  padding: `${sp.sm} ${sp.lg}`,
  fontSize: '15px',
  fontWeight: 700,
  cursor: 'pointer',
  width: '100%' as const,
  textAlign: 'center' as const,
  transition: 'all 0.2s ease',
  boxShadow: '0 4px 14px rgba(195,234,79,0.35)',
}

// Primary button ghost (outline pill)
export const btnPrimaryGhost = {
  background: 'transparent',
  color: colors.brand,
  border: `2px solid ${colors.brand}`,
  borderRadius: rd.full,
  padding: `${sp.sm} ${sp.lg}`,
  fontSize: '15px',
  fontWeight: 700,
  cursor: 'pointer',
  width: '100%' as const,
  textAlign: 'center' as const,
  transition: 'all 0.2s ease',
}

// Secondary button — pill shape
export const btnSecondary = {
  background: colors.surface,
  color: colors.textPrimary,
  border: `1.5px solid ${colors.border}`,
  borderRadius: rd.full,
  padding: `${sp.sm} ${sp.md}`,
  fontSize: '15px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
}

// Pill tag
export const badge = (bg: string, color: string) => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '3px 10px',
  borderRadius: rd.full,
  fontSize: '12px',
  fontWeight: 600,
  background: bg,
  color,
})

// Section heading
export const sectionTitle = {
  fontSize: '18px',
  fontWeight: 700,
  color: colors.textPrimary,
  marginBottom: sp.sm,
}

// Sub-section label
export const label = {
  fontSize: '13px',
  fontWeight: 600,
  color: colors.textSecondary,
  marginBottom: sp.xs,
  display: 'block',
}

// ============================================
// All component styles
// ============================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const styles: Record<string, any> = {

  // --- Layout ---
  pageContainer: { ...page, paddingTop: 'calc(56px + env(safe-area-inset-top))' },
  contentArea: {
    paddingTop: '56px',
  },

  // --- Header ---
  headerBar: { ...header, top: 'env(safe-area-inset-top)' },
  menuBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rd.sm,
  },
  brand: {
    fontFamily: '"Space Grotesk", sans-serif',
    fontSize: '20px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
    color: colors.primary,
  },
  brandAccent: { color: colors.brand },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: sp.xs,
  },
  loginBtn: {
    background: colors.brand,
    color: colors.darkGrey,
    border: 'none',
    borderRadius: rd.full,
    padding: '7px 18px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  userPill: {
    display: 'flex',
    alignItems: 'center',
    gap: sp.xs,
    background: colors.brandLight,
    border: 'none',
    borderRadius: rd.full,
    padding: '4px 12px 4px 4px',
    cursor: 'pointer',
  },
  userAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: rd.full,
    background: colors.brand,
    color: colors.darkGrey,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 700,
  },
  userName: {
    color: colors.brand,
    fontSize: '14px',
    fontWeight: 600,
  },

  // --- Side Menu ---
  overlay: {
    position: 'fixed' as const,
    top: 0, left: 0, right: 0, bottom: 0,
    background: colors.overlay,
    zIndex: 300,
  },
  sideMenu: {
    position: 'fixed' as const,
    top: 0, right: 0, bottom: 0,
    width: '280px',
    background: colors.surface,
    zIndex: 400,
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '-4px 0 20px rgba(0,0,0,0.12)',
  },
  menuHeader: {
    padding: `${sp.xl} ${sp.md}`,
    borderBottom: `1px solid ${colors.border}`,
  },
  menuLogo: {
    fontFamily: '"Space Grotesk", sans-serif',
    fontSize: '22px',
    fontWeight: 700,
    letterSpacing: '-0.5px',
    color: colors.primary,
  },
  menuUserAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: rd.full,
    background: colors.primary,
    color: colors.white,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 700,
    marginBottom: sp.xs,
  },
  menuUserName: {
    fontSize: '16px',
    fontWeight: 700,
    color: colors.textPrimary,
    marginBottom: '2px',
  },
  menuUserRole: {
    fontSize: '13px',
    color: colors.textSecondary,
  },
  menuNav: {
    flex: 1,
    padding: sp.sm,
    overflowY: 'auto' as const,
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: sp.sm,
    padding: `${sp.sm} ${sp.sm}`,
    borderRadius: rd.md,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  menuItemActive: {
    display: 'flex',
    alignItems: 'center',
    gap: sp.sm,
    padding: `${sp.sm} ${sp.sm}`,
    borderRadius: rd.md,
    background: colors.brandLight,
    cursor: 'pointer',
  },
  menuLabel: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.textSecondary,
  },
  menuLabelActive: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.brand,
  },
  menuFooter: {
    padding: sp.sm,
    borderTop: `1px solid ${colors.border}`,
  },

  // --- Bottom Navigation ---
  bottomNavBar: { ...bottomNav },
  navItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '2px',
    padding: '8px 12px',
    cursor: 'pointer',
    minWidth: '60px',
  },
  navItemActive: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '2px',
    padding: '8px 12px',
    cursor: 'pointer',
    minWidth: '60px',
  },
  navLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: colors.textMuted,
    letterSpacing: '0.02em',
  },
  navLabelActive: {
    fontSize: '11px',
    fontWeight: 700,
    color: colors.brand,
    letterSpacing: '0.02em',
  },

  // --- Cards ---
  card: { ...card },
  cardElevated: { ...cardElevated },
  cardGlass: { ...cardGlass },
  cardActive: {
    ...card,
    border: `2px solid ${colors.brand}`,
    boxShadow: colors.shadowLg,
  },

  // --- Buttons ---
  primaryBtn: { ...btnPrimary },
  primaryBtnGhost: { ...btnPrimaryGhost },
  secondaryBtn: { ...btnSecondary },
  outlineBtn: {
    background: 'transparent',
    color: colors.brand,
    border: `2px solid ${colors.brand}`,
    borderRadius: rd.full,
    padding: `${sp.sm} ${sp.md}`,
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  // --- Form Inputs ---
  input: { ...inputBase },
  inputFocused: {
    ...inputBase,
    borderColor: colors.brand,
  },
  select: {
    ...inputBase,
    cursor: 'pointer',
  },

  // --- Tabs ---
  tabBar: {
    display: 'flex',
    gap: '4px',
    padding: '4px',
    background: colors.border,
    borderRadius: rd.md,
    marginBottom: sp.md,
  },
  tab: {
    flex: 1,
    padding: `${sp.xs} 4px`,
    textAlign: 'center' as const,
    fontSize: '13px',
    fontWeight: 600,
    borderRadius: rd.sm,
    cursor: 'pointer',
    color: colors.textSecondary,
    transition: 'all 0.15s',
  },
  tabActive: {
    flex: 1,
    padding: `${sp.xs} 4px`,
    textAlign: 'center' as const,
    fontSize: '13px',
    fontWeight: 700,
    borderRadius: rd.sm,
    cursor: 'pointer',
    background: colors.surface,
    color: colors.textPrimary,
    boxShadow: colors.shadowSm,
  },

  // --- Status Badges ---
  badgePending: {
    ...badge(colors.warningBg, '#92400E'),
  },
  badgeConfirmed: {
    ...badge(colors.brandLight, colors.brandDark),
  },
  badgeInProgress: {
    ...badge(colors.successBg, '#065F46'),
  },
  badgeCompleted: {
    ...badge('#F3F4F6', '#6B7280'),
  },
  badgeCancelled: {
    ...badge(colors.errorBg, colors.error),
  },

  // --- Section Headers ---
  sectionHeader: { ...sectionTitle },
  pageTitle: {
    fontSize: '24px',
    fontWeight: 800,
    color: colors.textPrimary,
    letterSpacing: '-0.3px',
  },
  pageSubtitle: {
    fontSize: '14px',
    color: colors.textSecondary,
    marginBottom: sp.lg,
  },

  // --- Empty State ---
  emptyState: {
    textAlign: 'center' as const,
    padding: `${sp.xxl} ${sp.lg}`,
    color: colors.textMuted,
  },
  emptyIcon: {
    fontSize: '56px',
    marginBottom: sp.md,
    opacity: 0.6,
  },

  // --- Loading ---
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
  },

  // --- Grid helpers ---
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: sp.sm,
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: sp.xs,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: sp.xs,
  },
  spacer: {
    height: sp.sm,
  },

  // --- Divider ---
  divider: {
    height: '1px',
    background: colors.border,
    margin: `${sp.md} 0`,
  },

  // --- Avatar (large) ---
  avatarLg: {
    width: '72px',
    height: '72px',
    borderRadius: rd.full,
    background: colors.primary,
    color: colors.white,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    fontWeight: 700,
    margin: '0 auto',
  },

  // --- Page padding (consistent) ---
  pagePadding: {
    padding: `0 ${sp.md}`,
  },
  pagePaddingLg: {
    padding: `0 ${sp.lg}`,
  },

  // --- Aliases for top-level style functions ---
  // Pre-existing bug fix: DriverJobsPage and VanDashboard use styles.badge(...)
  // but badge was a top-level export. Aliasing here to keep those callers working.
  badge,
};
