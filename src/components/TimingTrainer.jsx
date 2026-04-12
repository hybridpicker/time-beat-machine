import React from 'react';
import { TRAINER_PRESETS } from '../utils/patternHelpers';

export default function TimingTrainer({
  trainerMode, customPlay, customSilence, fadePhase,
  onToggleMode, onCustomPlayChange, onCustomSilenceChange,
  statusBadge, collapsed, onToggle, darkMode,
}) {
  const presetKeys = Object.keys(TRAINER_PRESETS);
  const dm = darkMode;

  return (
    <div className={`transition-all duration-300 overflow-hidden ${
      collapsed ? 'max-h-0 opacity-0 lg:max-h-none lg:opacity-100' : 'max-h-[32rem] opacity-100'
    }`}>
      {/* Preset Buttons - 3x2 grid */}
      <div className="grid grid-cols-3 gap-1 sm:gap-2 mb-3">
        {presetKeys.map(key => {
          const preset = TRAINER_PRESETS[key];
          const isActive = trainerMode === key;
          return (
            <button
              key={key}
              onClick={() => onToggleMode(key)}
              className={`text-[9px] sm:text-xs px-1.5 sm:px-2 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium transition-all duration-200 border ${
                isActive
                  ? dm
                    ? 'bg-neutral-100 text-neutral-900 border-transparent shadow-lg'
                    : 'bg-neutral-900 text-white border-transparent shadow-lg'
                  : dm
                    ? 'bg-neutral-800/60 text-neutral-300 border-neutral-700/40 hover:bg-neutral-700/60'
                    : 'bg-neutral-100/60 text-neutral-700 border-neutral-200/40 hover:bg-neutral-200/60'
              }`}
            >
              <span className="block leading-tight">{preset.label}</span>
            </button>
          );
        })}
      </div>

      {/* Custom sliders - only when custom mode active */}
      {trainerMode === 'custom' && (
        <div className={`grid grid-cols-2 gap-2 sm:gap-3 mb-3 p-2 rounded-lg ${
          dm ? 'bg-neutral-800/40' : 'bg-neutral-100/40'
        }`}>
          <div>
            <label className={`text-[10px] sm:text-xs mb-1 block ${dm ? 'text-neutral-400' : 'text-neutral-600'}`}>
              Play: <span className="font-mono font-bold">{customPlay}</span> Bars
            </label>
            <input
              type="range" min={1} max={8} value={customPlay}
              onChange={(e) => onCustomPlayChange(parseInt(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer slider"
            />
          </div>
          <div>
            <label className={`text-[10px] sm:text-xs mb-1 block ${dm ? 'text-neutral-400' : 'text-neutral-600'}`}>
              Silence: <span className="font-mono font-bold">{customSilence}</span> Bars
            </label>
            <input
              type="range" min={1} max={8} value={customSilence}
              onChange={(e) => onCustomSilenceChange(parseInt(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer slider"
            />
          </div>
        </div>
      )}

      {/* Fade Away phase indicator */}
      {trainerMode === 'fadeAway' && (
        <div className={`flex items-center gap-2 mb-3 p-2 rounded-lg ${
          dm ? 'bg-neutral-800/40' : 'bg-neutral-100/40'
        }`}>
          <span className={`text-[10px] sm:text-xs ${dm ? 'text-neutral-400' : 'text-neutral-600'}`}>Phase:</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map(p => (
              <div
                key={p}
                className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 transition-colors ${
                  p <= fadePhase
                    ? dm ? 'bg-neutral-200 border-neutral-200' : 'bg-neutral-900 border-neutral-900'
                    : dm ? 'bg-transparent border-neutral-600' : 'bg-transparent border-neutral-300'
                }`}
              />
            ))}
          </div>
          <span className={`text-[9px] sm:text-[10px] ml-auto font-mono ${dm ? 'text-neutral-500' : 'text-neutral-500'}`}>
            {Math.max(1, 4 - fadePhase)}P / {Math.min(4, 1 + fadePhase)}S
          </span>
        </div>
      )}

      {/* Description text */}
      {trainerMode && (
        <p className={`text-[9px] sm:text-[10px] p-1.5 sm:p-2 rounded-lg ${
          dm ? 'text-neutral-400 bg-neutral-800/40' : 'text-neutral-500 bg-neutral-50/60'
        }`}>
          {TRAINER_PRESETS[trainerMode]?.desc}
        </p>
      )}
      {!trainerMode && (
        <p className={`text-[9px] sm:text-[10px] p-1.5 sm:p-2 rounded-lg ${
          dm ? 'text-neutral-400 bg-neutral-800/40' : 'text-neutral-500 bg-neutral-50/60'
        }`}>
          Timing Trainer: silence gaps to practice your inner clock
        </p>
      )}
    </div>
  );
}
