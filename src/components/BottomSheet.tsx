import { useState, useRef, useEffect, type ReactNode } from 'react';
import { colors } from '../styles';

export type BottomSheetState = 'peek' | 'half' | 'full';

interface BottomSheetProps {
  /** Initial state. Default 'half' */
  initialState?: BottomSheetState;
  /** Peek height in px (when state='peek'). Default 80 */
  peekHeight?: number;
  /** Half height as ratio of viewport (0-1). Default 0.5 */
  halfRatio?: number;
  /** Children rendered inside the sheet */
  children: ReactNode;
  /** Called when state changes */
  onStateChange?: (state: BottomSheetState) => void;
  /** Whether the drag handle is visible. Default true */
  showHandle?: boolean;
  /**
   * Externally controlled state. When set, the sheet height follows this
   * value and drag/tap interactions are disabled. The parent is expected
   * to update this prop to drive the sheet (e.g. for sheet modes that
   * go beyond peek/half/full, like 'searching' full-screen).
   */
  externalState?: BottomSheetState;
  /** Called when drag/tap is detected. Parent can decide whether to honor. */
  onUserInteract?: (newState: BottomSheetState) => void;
}

/**
 * Mobile-style bottom sheet with three snap states: peek, half, full.
 *
 * - Tap the drag handle to cycle: peek → half → full → half
 * - Drag the handle up/down to free-move; release to snap to nearest state
 * - Uses native CSS transitions for performance (no animation libraries)
 * - Respects iOS safe-area-inset-bottom
 */
export default function BottomSheet({
  initialState = 'half',
  peekHeight = 240,
  halfRatio = 0.62,
  children,
  onStateChange,
  showHandle = true,
  externalState,
  onUserInteract,
}: BottomSheetProps) {
  const [internalState, setInternalState] = useState<BottomSheetState>(initialState);
  // When externalState is set, it overrides internal state
  const state = externalState ?? internalState;
  const dragStartY = useRef<number | null>(null);
  const dragStartHeight = useRef<number>(0);
  const [dragHeight, setDragHeight] = useState<number | null>(null);

  // Notify parent on state change
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // Compute target height for each state
  const getTargetHeight = (s: BottomSheetState): number => {
    const vh = window.innerHeight;
    if (s === 'peek') return peekHeight;
    if (s === 'half') return vh * halfRatio;
    return Math.min(vh * 0.92, vh - 44); // full = 92% viewport
  };

  // Current height: drag height if dragging, else state height
  const currentHeight = dragHeight ?? getTargetHeight(state);
  const isDragging = dragHeight != null;

  // Cycle to next state on handle tap
  const handleTap = () => {
    if (isDragging) return;
    let next: BottomSheetState;
    if (state === 'peek') next = 'half';
    else if (state === 'half') next = 'full';
    else next = 'half';
    if (externalState !== undefined) {
      onUserInteract?.(next);
    } else {
      setInternalState(next);
    }
  };

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    dragStartHeight.current = currentHeight;
    setDragHeight(currentHeight);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragStartY.current == null) return;
    const dy = dragStartY.current - e.clientY; // positive = drag up
    const vh = window.innerHeight;
    const next = Math.max(peekHeight, Math.min(vh * 0.92, dragStartHeight.current + dy));
    setDragHeight(next);
  };

  const handlePointerUp = (_e: React.PointerEvent) => {
    if (dragStartY.current == null) return;
    dragStartY.current = null;
    // Snap to nearest state
    const vh = window.innerHeight;
    const snapPoints: Array<[BottomSheetState, number]> = [
      ['peek', peekHeight],
      ['half', vh * halfRatio],
      ['full', vh * 0.92],
    ];
    const finalHeight = dragHeight ?? dragStartHeight.current;
    const closest = snapPoints.reduce((acc, cur) =>
      Math.abs(cur[1] - finalHeight) < Math.abs(acc[1] - finalHeight) ? cur : acc
    );
    setDragHeight(null);
    if (externalState !== undefined) {
      onUserInteract?.(closest[0]);
    } else {
      setInternalState(closest[0]);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: `${currentHeight}px`,
        background: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        boxShadow: '0 -4px 24px rgba(0,0,0,0.1)',
        zIndex: 100,
        transition: isDragging ? 'none' : 'height 0.4s cubic-bezier(0.32, 0.72, 0, 1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        // iOS-like overscroll behavior
        overscrollBehavior: 'contain',
        touchAction: 'none',
      }}
    >
      {showHandle && (
        <div
          onClick={handleTap}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            width: 36,
            height: 4,
            background: '#D1D5DB',
            borderRadius: 2,
            margin: '8px auto 0',
            cursor: 'grab',
            flexShrink: 0,
            touchAction: 'none',
          }}
        />
      )}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
        }}
      >
        {children}
      </div>
    </div>
  );
}
