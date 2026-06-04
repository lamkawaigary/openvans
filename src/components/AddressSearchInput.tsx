import { useState, useRef, useEffect } from 'react';
import { colors, sp, rd } from '../styles';
import { getPlaceSuggestions, type PlaceSuggestion } from '../pages/HomePage';

interface AddressSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: string, coord: [number, number]) => void;
  placeholder?: string;
}

export default function AddressSearchInput({
  value,
  onChange,
  onSelect,
  placeholder = '輸入地址',
}: AddressSearchInputProps) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await getPlaceSuggestions(value.trim());
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [value]);

  const handleSelect = async (suggestion: PlaceSuggestion) => {
    console.log('[AddressSearchInput] handleSelect called, placeId:', suggestion.placeId);
    onChange(suggestion.description);
    setShowSuggestions(false);
    setSuggestions([]);
    if (suggestion.lat && suggestion.lon) {
      onSelect(suggestion.description, [suggestion.lat, suggestion.lon]);
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', flex: 1 }}>
      <input
        ref={inputRef}
        style={inputStyle}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
      />
      {loading && <span style={{ color: colors.textMuted, fontSize: 12, marginLeft: 6 }}>...</span>}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div style={dropdown}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              style={suggestionItem}
              onClick={() => handleSelect(s)}
              onMouseDown={e => e.preventDefault()} // Prevent blur before click
            >
              <span style={suggestionMain}>{s.mainText}</span>
              {s.secondaryText && (
                <span style={suggestionSecondary}> — {s.secondaryText}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  border: `1.5px solid ${colors.lightGrey}`,
  borderRadius: rd.md,
  padding: `${sp.sm}px ${sp.md}px`,
  fontSize: 15,
  fontFamily: 'Inter, system-ui, sans-serif',
  color: colors.darkGrey,
  outline: 'none',
  background: colors.white,
  boxSizing: 'border-box',
};

const dropdown: React.CSSProperties = {
  position: 'absolute' as const,
  top: '100%',
  left: 0,
  right: 0,
  background: colors.white,
  border: `1.5px solid ${colors.lightGrey}`,
  borderRadius: rd.md,
  marginTop: 4,
  zIndex: 999,
  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
  maxHeight: 220,
  overflowY: 'auto' as const,
};

const suggestionItem: React.CSSProperties = {
  padding: `${sp.sm}px ${sp.md}px`,
  cursor: 'pointer',
  borderBottom: `1px solid ${colors.lightGrey}`,
  fontSize: 14,
};

const suggestionMain: React.CSSProperties = {
  fontWeight: 600,
  color: colors.darkGrey,
};

const suggestionSecondary: React.CSSProperties = {
  color: colors.textMuted,
  fontWeight: 400,
};