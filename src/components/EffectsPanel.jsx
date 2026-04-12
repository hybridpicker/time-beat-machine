import React from 'react';
import { TRACKS } from '../utils/patternHelpers';

export default function EffectsPanel({
  reverbMix, onReverbChange,
  compThreshold, compRatio, onCompThresholdChange, onCompRatioChange,
  voiceParams, onVoiceParamChange,
  collapsed, darkMode,
}) {
  const dm = darkMode;
  const labelClass = `text-[10px] sm:text-xs ${dm ? 'text-neutral-400' : 'text-neutral-600'}`;
  const valueBadgeClass = `font-mono font-bold text-[10px] px-1.5 py-0.5 rounded ${
    dm ? 'text-neutral-200 bg-neutral-700/60' : 'text-neutral-900 bg-neutral-100/60'
  }`;
  const smallLabelClass = `text-[9px] sm:text-[10px] ${dm ? 'text-neutral-500' : 'text-neutral-500'}`;
  const tinyLabelClass = `text-[8px] ${dm ? 'text-neutral-500' : 'text-neutral-400'}`;
  const trackNameClass = `text-[9px] sm:text-[10px] font-medium w-12 truncate ${dm ? 'text-neutral-400' : 'text-neutral-600'}`;

  return (
    <div className={`transition-all duration-300 overflow-hidden ${
      collapsed ? 'max-h-0 opacity-0 lg:max-h-none lg:opacity-100' : 'max-h-[48rem] opacity-100'
    }`}>
      {/* Master Effects */}
      <div className="mb-3">
        <div className="mb-2">
          <label className={`${labelClass} flex justify-between mb-1`}>
            <span>Reverb</span>
            <span className={valueBadgeClass}>{reverbMix}%</span>
          </label>
          <input
            type="range" min={0} max={100} value={reverbMix}
            onChange={(e) => onReverbChange(parseInt(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer slider"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={`${smallLabelClass} flex justify-between mb-1`}>
              <span>Comp Thresh</span>
              <span className="font-mono">{compThreshold}dB</span>
            </label>
            <input
              type="range" min={-40} max={0} value={compThreshold}
              onChange={(e) => onCompThresholdChange(parseInt(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer slider"
            />
          </div>
          <div>
            <label className={`${smallLabelClass} flex justify-between mb-1`}>
              <span>Comp Ratio</span>
              <span className="font-mono">{compRatio}:1</span>
            </label>
            <input
              type="range" min={1} max={20} value={compRatio}
              onChange={(e) => onCompRatioChange(parseInt(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer slider"
            />
          </div>
        </div>
      </div>

      {/* Per-Voice Tuning & Decay */}
      <div className={`border-t pt-2 ${dm ? 'border-neutral-700/40' : 'border-neutral-200/40'}`}>
        <span className={`text-[9px] sm:text-[10px] font-medium uppercase tracking-wider block mb-2 ${dm ? 'text-neutral-500' : 'text-neutral-500'}`}>Voice Shaping</span>
        <div className="space-y-1.5">
          {TRACKS.map(track => {
            const vp = voiceParams[track.id] || { tune: 0, decay: 1.0 };
            return (
              <div key={track.id} className="flex items-center gap-2">
                <span className={trackNameClass}>{track.name}</span>
                <div className="flex-1 flex items-center gap-1">
                  <span className={`${tinyLabelClass} w-6`}>Tune</span>
                  <input
                    type="range" min={-12} max={12} value={vp.tune}
                    onChange={(e) => onVoiceParamChange(track.id, 'tune', parseInt(e.target.value))}
                    className="flex-1 h-1 slider"
                    title={`Tune: ${vp.tune > 0 ? '+' : ''}${vp.tune} st`}
                  />
                  <span className={`${tinyLabelClass} font-mono w-6 text-right`}>{vp.tune > 0 ? '+' : ''}{vp.tune}</span>
                </div>
                <div className="flex-1 flex items-center gap-1">
                  <span className={`${tinyLabelClass} w-8`}>Decay</span>
                  <input
                    type="range" min={25} max={300} value={Math.round(vp.decay * 100)}
                    onChange={(e) => onVoiceParamChange(track.id, 'decay', parseInt(e.target.value) / 100)}
                    className="flex-1 h-1 slider"
                    title={`Decay: ${Math.round(vp.decay * 100)}%`}
                  />
                  <span className={`${tinyLabelClass} font-mono w-6 text-right`}>{Math.round(vp.decay * 100)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className={`text-[8px] sm:text-[10px] mt-2 p-1.5 sm:p-2 rounded-lg ${
        dm ? 'text-neutral-500 bg-neutral-800/40' : 'text-neutral-500 bg-neutral-50/60'
      }`}>
        Master reverb, compressor, per-voice tuning & decay
      </p>
    </div>
  );
}
