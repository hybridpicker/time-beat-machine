import React, { useCallback, useMemo } from 'react';
import { STEPS_PER_BAR } from '../utils/patternHelpers';

// Memoized step button — only re-renders when its own props change.
const StepButton = React.memo(function StepButton({
  value, isPlayhead, isBeat, isBarStart, isMobile, patternLength,
  darkMode, trackId, actualIndex, i, name, isDragging,
  onDragStart, onDragEnter, onToggleStep,
}) {
  const isActive = value > 0;

  const sizeClass = isMobile
    ? 'h-12 sm:h-14 rounded-md'
    : patternLength <= 16
      ? 'h-10 sm:h-12 md:h-14 rounded-md'
      : 'h-8 sm:h-10 md:h-12 rounded-sm sm:rounded';

  const colorClass = isActive
    ? darkMode
      ? 'bg-neutral-200 text-neutral-900 border-transparent'
      : 'bg-neutral-700 text-white border-transparent'
    : darkMode
      ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700 hover:border-neutral-600'
      : 'bg-neutral-100 border-neutral-200 hover:bg-neutral-200 hover:border-neutral-300';

  const beatClass = isBeat && !isActive
    ? darkMode ? 'border-l-2 border-l-neutral-600' : 'border-l-2 border-l-neutral-300'
    : '';

  const playheadClass = isPlayhead
    ? 'ring-2 ring-indigo-500/60 ring-offset-1 sm:ring-offset-2'
    : '';

  const barStartClass = !isMobile && isBarStart
    ? darkMode ? 'border-l-4 border-l-neutral-600' : 'border-l-4 border-l-neutral-300'
    : '';

  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onToggleStep(trackId, actualIndex);
        if (onDragStart) onDragStart(trackId, actualIndex, value);
      }}
      onMouseEnter={(e) => {
        if (isDragging && onDragEnter) { e.preventDefault(); onDragEnter(trackId, actualIndex); }
      }}
      onTouchStart={(e) => { e.preventDefault(); onToggleStep(trackId, actualIndex); }}
      className={[
        sizeClass,
        'border relative cursor-pointer select-none transition-all duration-150',
        colorClass,
        beatClass,
        playheadClass,
        barStartClass,
        'active:scale-95 touch-manipulation',
      ].join(' ')}
      aria-label={`${name} step ${actualIndex + 1} ${isActive ? 'active' : 'inactive'}`}
      type="button"
    >
      {isMobile && i % 4 === 0 && (
        <span className={`absolute -top-2 sm:-top-3 left-0 text-[8px] sm:text-[9px] font-mono font-medium pointer-events-none px-0.5 sm:px-1 rounded ${
          darkMode ? 'text-neutral-500 bg-neutral-900/60' : 'text-neutral-400 bg-white/60'
        }`}>
          {(isMobile ? i : actualIndex % STEPS_PER_BAR) + 1}
        </span>
      )}
    </button>
  );
});

const TrackGrid = React.memo(function TrackGrid({
  trackId, name, pattern, playhead, isPlaying,
  isMobileDevice, bars, activeMobileBar, setActiveMobileBar,
  onToggleStep, volume, mute, solo, onVolumeChange, onMuteToggle, onSoloToggle,
  isDragging, onDragStart, onDragEnter,
  onCopy, onPaste, hasClipboard, darkMode,
}) {
  const displayPlayhead = isPlaying ? playhead : -1;

  const isMobile = isMobileDevice;
  const currentBarPattern = isMobile
    ? pattern.slice(activeMobileBar * STEPS_PER_BAR, (activeMobileBar + 1) * STEPS_PER_BAR)
    : pattern;
  const patternOffset = isMobile ? activeMobileBar * STEPS_PER_BAR : 0;

  // Force re-render when activeMobileBar changes to show fresh data
  const activeCount = useMemo(() => pattern.filter((x) => !!x).length, [pattern, activeMobileBar]);

  const dm = darkMode;
  const showDesktopRuler = !isMobile;
  const controlButtonClass = `inline-flex h-5 sm:h-6 min-w-5 sm:min-w-6 items-center justify-center rounded-full border px-1.5 sm:px-2 text-[9px] sm:text-[10px] font-mono uppercase tracking-[0.18em] transition-colors ${
    dm ? 'border-neutral-700 text-neutral-500 hover:text-neutral-200 hover:border-neutral-500' : 'border-neutral-200 text-neutral-400 hover:text-neutral-700 hover:border-neutral-300'
  }`;

  return (
    <div className={`py-2.5 sm:py-3 border-b last:border-b-0 ${darkMode ? 'border-neutral-800' : 'border-neutral-100'}`}>
      <div className="flex items-start justify-between gap-3 mb-2 sm:mb-2.5">
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <span className={`text-xs font-medium min-w-[3.5rem] sm:min-w-[4rem] tracking-tight ${dm ? 'text-neutral-300' : 'text-neutral-600'}`}>{name}</span>
            {mute && (
              <span className={`rounded-full px-1.5 py-0.5 text-[8px] sm:text-[9px] font-mono uppercase tracking-[0.2em] ${
                dm ? 'bg-red-950/50 text-red-400' : 'bg-red-50 text-red-500'
              }`}>
                Mute
              </span>
            )}
            {solo && (
              <span className={`rounded-full px-1.5 py-0.5 text-[8px] sm:text-[9px] font-mono uppercase tracking-[0.2em] ${
                dm ? 'bg-amber-950/50 text-amber-400' : 'bg-amber-50 text-amber-600'
              }`}>
                Solo
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => onMuteToggle(trackId)}
              className={`${controlButtonClass} ${
                mute
                  ? (dm ? 'border-red-500/60 bg-red-950/40 text-red-300' : 'border-red-200 bg-red-50 text-red-600')
                  : ''
              }`}
              title="Mute"
            >m</button>
            <button
              onClick={() => onSoloToggle(trackId)}
              className={`${controlButtonClass} ${
                solo
                  ? (dm ? 'border-amber-500/60 bg-amber-950/40 text-amber-300' : 'border-amber-200 bg-amber-50 text-amber-600')
                  : ''
              }`}
              title="Solo"
            >s</button>
            <input
              type="range"
              min={0} max={100} value={volume}
              onChange={(e) => onVolumeChange(trackId, parseInt(e.target.value))}
              className="hidden sm:block w-16 md:w-20 h-px slider opacity-40 hover:opacity-80 transition-opacity"
              title={`Volume: ${volume}%`}
            />
            <span className={`hidden sm:inline text-[9px] font-mono tabular-nums uppercase tracking-[0.18em] ${dm ? 'text-neutral-600' : 'text-neutral-400'}`}>
              {volume}%
            </span>
            {onCopy && (
              <button
                onClick={() => onCopy(trackId)}
                className={`${controlButtonClass} hidden sm:inline-flex`}
                title="Copy track pattern"
              >c</button>
            )}
            {onPaste && hasClipboard && (
              <button
                onClick={() => onPaste(trackId)}
                className={`${controlButtonClass} hidden sm:inline-flex`}
                title="Paste copied pattern"
              >p</button>
            )}
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] sm:text-xs font-mono tabular-nums ${dm ? 'border-neutral-800 text-neutral-500 bg-neutral-950/60' : 'border-neutral-200 text-neutral-400 bg-neutral-50'}`}>
          {activeCount}/{pattern.length}
        </span>
      </div>

      {showDesktopRuler && (
        <div
          className="grid gap-1 sm:gap-1.5 mb-1.5 sm:mb-2"
          style={{ gridTemplateColumns: `repeat(${currentBarPattern.length}, minmax(0, 1fr))` }}
          aria-hidden="true"
        >
          {currentBarPattern.map((_, i) => {
            const actualIndex = patternOffset + i;
            const isBeatMarker = actualIndex % 4 === 0;
            const isBarMarker = actualIndex % STEPS_PER_BAR === 0;

            return (
              <div key={`ruler-${trackId}-${actualIndex}`} className="relative h-5 sm:h-6">
                {isBeatMarker && (
                  <span className={`absolute left-0 top-2 text-[8px] sm:text-[9px] font-mono font-medium ${
                    dm ? 'text-neutral-600' : 'text-neutral-400'
                  }`}>
                    {(actualIndex % STEPS_PER_BAR) + 1}
                  </span>
                )}
                {isBarMarker && bars > 1 && (
                  <span className={`absolute left-0 top-0 text-[9px] sm:text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border ${
                    dm ? 'text-neutral-500 bg-neutral-900 border-neutral-700' : 'text-neutral-400 bg-white border-neutral-200'
                  }`}>
                    Bar {Math.floor(actualIndex / STEPS_PER_BAR) + 1}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Step Grid */}
      <div
        className={`grid gap-1 sm:gap-1.5 ${mute ? 'opacity-30' : ''}`}
        style={{ gridTemplateColumns: `repeat(${currentBarPattern.length}, minmax(0, 1fr))` }}
        onTouchStart={(e) => {
          if (isMobile) {
            const touch = e.touches[0];
            e.currentTarget.dataset.touchStartX = touch.clientX.toString();
            e.currentTarget.dataset.touchStartY = touch.clientY.toString();
          }
        }}
        onTouchEnd={(e) => {
          if (isMobile && e.currentTarget.dataset.touchStartX) {
            const startX = parseFloat(e.currentTarget.dataset.touchStartX);
            const startY = parseFloat(e.currentTarget.dataset.touchStartY);
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 30) {
              if (deltaX > 0 && activeMobileBar > 0) setActiveMobileBar(activeMobileBar - 1);
              else if (deltaX < 0 && activeMobileBar < bars - 1) setActiveMobileBar(activeMobileBar + 1);
            }
            delete e.currentTarget.dataset.touchStartX;
            delete e.currentTarget.dataset.touchStartY;
          }
        }}
      >
        {currentBarPattern.map((value, i) => {
          const actualIndex = patternOffset + i;
          return (
            <StepButton
              key={`${trackId}-${actualIndex}`}
              value={value}
              isPlayhead={displayPlayhead === actualIndex}
              isBeat={i % 4 === 0}
              isBarStart={!isMobile && actualIndex % STEPS_PER_BAR === 0 && actualIndex > 0}
              isMobile={isMobile}
              patternLength={pattern.length}
              darkMode={darkMode}
              trackId={trackId}
              actualIndex={actualIndex}
              i={i}
              name={name}
              isDragging={isDragging}
              onDragStart={onDragStart}
              onDragEnter={onDragEnter}
              onToggleStep={onToggleStep}
            />
          );
        })}
      </div>
    </div>
  );
});

// Custom comparison function to force re-render when activeMobileBar or pattern changes
function areEqual(prevProps, nextProps) {
  if (prevProps.activeMobileBar !== nextProps.activeMobileBar) return false;
  // Compare pattern arrays by value (not reference)
  if (prevProps.pattern.length !== nextProps.pattern.length) return false;
  if (!prevProps.pattern.every((val, i) => val === nextProps.pattern[i])) return false;
  if (prevProps.isPlaying !== nextProps.isPlaying) return false;
  if (prevProps.playhead !== nextProps.playhead) return false;
  return (
    prevProps.trackId === nextProps.trackId &&
    prevProps.name === nextProps.name &&
    prevProps.isMobileDevice === nextProps.isMobileDevice &&
    prevProps.bars === nextProps.bars &&
    prevProps.onToggleStep === nextProps.onToggleStep &&
    prevProps.volume === nextProps.volume &&
    prevProps.mute === nextProps.mute &&
    prevProps.solo === nextProps.solo &&
    prevProps.onVolumeChange === nextProps.onVolumeChange &&
    prevProps.onMuteToggle === nextProps.onMuteToggle &&
    prevProps.onSoloToggle === nextProps.onSoloToggle &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.onDragStart === nextProps.onDragStart &&
    prevProps.onDragEnter === nextProps.onDragEnter &&
    prevProps.onCopy === nextProps.onCopy &&
    prevProps.onPaste === nextProps.onPaste &&
    prevProps.hasClipboard === nextProps.hasClipboard &&
    prevProps.darkMode === nextProps.darkMode
  );
}

export default React.memo(TrackGrid, areEqual);
