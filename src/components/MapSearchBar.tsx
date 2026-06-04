import { colors, sp, rd } from '../styles';

interface MapSearchBarProps {
  onSearch: () => void;
}

export default function MapSearchBar({ onSearch }: MapSearchBarProps) {
  return (
    <div style={styles.wrap} onClick={onSearch}>
      <span style={styles.icon}>🔍</span>
      <span style={styles.placeholder}>在哪裡？</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    background: colors.white,
    borderRadius: rd.full,
    padding: `${sp.sm} ${sp.md}`,
    display: 'flex',
    alignItems: 'center',
    gap: sp.xs,
    boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
    cursor: 'pointer',
    flex: 1,
  },
  icon: {
    fontSize: 16,
    flexShrink: 0,
  },
  placeholder: {
    fontSize: 15,
    fontWeight: 600,
    color: colors.darkGrey,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
};
