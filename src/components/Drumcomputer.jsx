import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { STEPS_PER_BAR, MAX_BARS, TRACKS, emptyPattern, resizePattern, presets } from '../utils/patternHelpers';
import { createAudioEngine } from '../audio/AudioEngine';
import useScheduler from '../hooks/useScheduler';
import useTimingTrainer from '../hooks/useTimingTrainer';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
import useTapTempo from '../hooks/useTapTempo';
import TrackGrid from './TrackGrid';
import TimingTrainer from './TimingTrainer';
import PatternManager from './PatternManager';
import EffectsPanel from './EffectsPanel';
import { autoSave, autoLoad, saveToSlot, loadFromUrlHash, getShareUrl } from '../utils/patternStorage';
import { exportWav } from '../utils/wavExport';
import useUndoRedo from '../hooks/useUndoRedo';

// Create audio engine singleton
const audioEngine = createAudioEngine();

export default function Drumcomputer() {
  // ── Load initial state from URL hash or auto-save ──
  const initialState = useMemo(() => {
    const fromUrl = loadFromUrlHash();
    if (fromUrl) {
      // Clear hash after loading
      window.history.replaceState(null, '', window.location.pathname);
      return fromUrl;
    }
    const fromStorage = autoLoad();
    if (fromStorage) return fromStorage;
    return { patterns: presets["Classic 1"]({ bars: 2 }), bpm: 100, swing: 0, bars: 2 };
  }, []);

  // ── Dark Mode ──
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('drumcomputer_dark') === 'true'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('drumcomputer_dark', darkMode); } catch {}
  }, [darkMode]);

  // ── UI State ──
  const [bpm, setBpm] = useState(initialState.bpm);
  const [bars, setBars] = useState(initialState.bars);
  const [swing, setSwing] = useState(initialState.swing);
  const [grooveOffset, setGrooveOffset] = useState(0);
  const [einsClick, setEinsClick] = useState(false);
  const [deviceType, setDeviceType] = useState(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isPortrait = height > width;
    
    if (width < 768) return 'phone';
    if (width >= 768 && width < 1024) return isTouch ? 'tablet' : 'small-desktop';
    if (width >= 1024 && width < 1280 && isTouch) return 'large-tablet';
    return 'desktop';
  });
  const isMobileDevice = deviceType !== 'desktop' && deviceType !== 'small-desktop';
  const [activeMobileBar, setActiveMobileBar] = useState(0);
  const [showTools, setShowTools] = useState(false);
  const [showControls, setShowControls] = useState(() => {
    // Collapsed by default on touch devices / small screens
    const w = window.innerWidth;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (w < 1024) return false;
    if (isTouch) return false;
    return true;
  });
  const [isEditingBpm, setIsEditingBpm] = useState(false);
  const [tempBpmValue, setTempBpmValue] = useState(bpm);

  // ── Patterns (8 tracks, 3-level velocity: 0=off, 1=normal, 2=accent) ──
  const [patterns, setPatterns] = useState(() => initialState.patterns);

  // Refs for scheduler access (avoids stale closures)
  const patternsRef = useRef(patterns);
  useEffect(() => { patternsRef.current = patterns; }, [patterns]);

  // ── Mixer State ──
  const [mixer, setMixer] = useState(() => {
    if (initialState.mixer) return initialState.mixer;
    const m = {};
    TRACKS.forEach(t => { m[t.id] = { volume: 100, mute: false, solo: false }; });
    return m;
  });
  const mixerRef = useRef(mixer);
  useEffect(() => { mixerRef.current = mixer; }, [mixer]);

  // Apply mixer volume changes to audio engine
  useEffect(() => {
    TRACKS.forEach(t => {
      audioEngine.setTrackVolume(t.id, mixer[t.id]?.volume ?? 100);
    });
  }, [mixer]);

  // ── Effects State ──
  const [reverbMix, setReverbMix] = useState(0);
  const [compThreshold, setCompThreshold] = useState(-12);
  const [compRatio, setCompRatio] = useState(4);
  const [voiceParams, setVoiceParams] = useState(() => {
    const vp = {};
    TRACKS.forEach(t => { vp[t.id] = { tune: 0, decay: 1.0 }; });
    return vp;
  });
  const voiceParamsRef = useRef(voiceParams);
  useEffect(() => { voiceParamsRef.current = voiceParams; }, [voiceParams]);

  // Sync effects to audio engine
  useEffect(() => { audioEngine.setReverbMix(reverbMix); }, [reverbMix]);
  useEffect(() => { audioEngine.setCompressorThreshold(compThreshold); }, [compThreshold]);
  useEffect(() => { audioEngine.setCompressorRatio(compRatio); }, [compRatio]);

  const handleVoiceParamChange = useCallback((trackId, param, value) => {
    setVoiceParams(prev => ({
      ...prev,
      [trackId]: { ...prev[trackId], [param]: value },
    }));
  }, []);

  // ── Undo/Redo ──
  const undoRedo = useUndoRedo(initialState.patterns);

  // Push to undo stack on pattern change (debounced via ref to avoid flood)
  const lastPushedRef = useRef(null);
  useEffect(() => {
    const key = JSON.stringify(patterns);
    if (key !== lastPushedRef.current) {
      lastPushedRef.current = key;
      undoRedo.push(patterns);
    }
  }, [patterns, undoRedo]);

  const handleUndo = useCallback(() => {
    const prev = undoRedo.undo();
    if (prev) { setPatterns(prev); patternsRef.current = prev; }
  }, [undoRedo]);

  const handleRedo = useCallback(() => {
    const next = undoRedo.redo();
    if (next) { setPatterns(next); patternsRef.current = next; }
  }, [undoRedo]);

  // ── Clipboard (copy/paste tracks) ──
  const [clipboard, setClipboard] = useState(null);

  const copyTrack = useCallback((trackId) => {
    setClipboard({ trackId, pattern: [...patterns[trackId]] });
  }, [patterns]);

  const pasteTrack = useCallback((targetTrackId) => {
    if (!clipboard) return;
    setPatterns(prev => {
      const next = { ...prev };
      // Resize clipboard pattern to match target length
      const srcLen = clipboard.pattern.length;
      const tgtLen = prev[targetTrackId].length;
      const pat = Array(tgtLen).fill(0);
      for (let i = 0; i < Math.min(srcLen, tgtLen); i++) pat[i] = clipboard.pattern[i];
      next[targetTrackId] = pat;
      patternsRef.current = next;
      return next;
    });
  }, [clipboard]);

  // ── Metronome ──
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const metronomeRef = useRef(metronomeEnabled);
  useEffect(() => { metronomeRef.current = metronomeEnabled; }, [metronomeEnabled]);

  // ── Timing Trainer ──
  const trainerHook = useTimingTrainer();

  // ── Scheduler ──
  const scheduler = useScheduler(audioEngine, patternsRef, mixerRef, trainerHook, voiceParamsRef, metronomeRef);

  // Destructure stable scheduler callbacks with sc- prefix to avoid name collisions
  const {
    setBpm: scSetBpm, setSwing: scSetSwing, setGrooveOffset: scSetGrooveOffset,
    setEinsClick: scSetEinsClick, setBarsRef: scSetBarsRef, currentStepRef,
  } = scheduler;

  // Sync BPM/Swing/Bars to scheduler refs
  useEffect(() => { scSetBpm(bpm); }, [bpm, scSetBpm]);
  useEffect(() => { scSetSwing(swing); }, [swing, scSetSwing]);
  useEffect(() => { scSetGrooveOffset(grooveOffset); }, [grooveOffset, scSetGrooveOffset]);
  useEffect(() => { scSetEinsClick(einsClick); }, [einsClick, scSetEinsClick]);
  useEffect(() => { scSetBarsRef(bars); }, [bars, scSetBarsRef]);

  // ── Resize patterns when bars change ──
  useEffect(() => {
    setPatterns(prev => {
      const next = {};
      TRACKS.forEach(t => {
        next[t.id] = resizePattern(prev[t.id] || emptyPattern(bars), bars);
      });
      return next;
    });
    if (currentStepRef.current >= bars * STEPS_PER_BAR) {
      currentStepRef.current = 0;
    }
  }, [bars, currentStepRef]);

  // ── Device type detection with resize handling ──
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isPortrait = height > width;
      
      if (width < 768) {
        setDeviceType('phone');
      } else if (width >= 768 && width < 1024) {
        setDeviceType(isTouch ? 'tablet' : 'small-desktop');
      } else if (width >= 1024 && width < 1280 && isTouch) {
        setDeviceType('large-tablet');
      } else {
        setDeviceType('desktop');
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Mobile bar follows playhead ──
  useEffect(() => {
    if (scheduler.isPlaying && bars > 1) {
      const currentBar = Math.floor(scheduler.uiStep / STEPS_PER_BAR);
      if (currentBar !== activeMobileBar && currentBar < bars) {
        setActiveMobileBar(currentBar);
      }
    }
  }, [scheduler.uiStep, scheduler.isPlaying, bars, activeMobileBar]);

  // ── Tap Tempo ──
  const transport = useTapTempo(setBpm);

  // ── Keyboard Shortcuts ──
  const toggleDarkMode = useCallback(() => setDarkMode(d => !d), []);
  useKeyboardShortcuts({
    handleToggle: scheduler.handleToggle,
    handleTapTempo: transport.handleTapTempo,
    toggleTrainerShortcut: trainerHook.toggleLastMode,
    handleUndo,
    handleRedo,
    toggleDarkMode,
  });

  // ── Pattern Manipulation ──
  const toggleStep = useCallback((trackId, idx) => {
    setPatterns(prev => {
      const next = { ...prev };
      const pat = [...prev[trackId]];
      // 2-state toggle: 0 → 1 → 0
      pat[idx] = pat[idx] === 0 ? 1 : 0;
      next[trackId] = pat;
      // Update ref immediately
      patternsRef.current = next;
      // Schedule if just turned on
      if (pat[idx] === 1 && prev[trackId][idx] === 0) {
        scheduler.scheduleIfSoon(trackId, idx);
      }
      return next;
    });
  }, [scheduler.scheduleIfSoon]);

  const clearAll = useCallback(() => {
    const next = {};
    TRACKS.forEach(t => { next[t.id] = emptyPattern(bars); });
    setPatterns(next);
    patternsRef.current = next;
  }, [bars]);

  const loadPreset = useCallback((name) => {
    const p = presets[name]({ bars });
    setPatterns(p);
    patternsRef.current = p;
  }, [bars]);

  // ── Mixer Controls ──
  const handleVolumeChange = useCallback((trackId, volume) => {
    setMixer(prev => ({ ...prev, [trackId]: { ...prev[trackId], volume } }));
  }, []);

  const handleMuteToggle = useCallback((trackId) => {
    setMixer(prev => ({ ...prev, [trackId]: { ...prev[trackId], mute: !prev[trackId].mute } }));
  }, []);

  const handleSoloToggle = useCallback((trackId) => {
    setMixer(prev => ({ ...prev, [trackId]: { ...prev[trackId], solo: !prev[trackId].solo } }));
  }, []);

  // ── Auto-save on state change ──
  useEffect(() => {
    autoSave({ patterns, bpm, swing, bars, mixer });
  }, [patterns, bpm, swing, bars, mixer]);

  // ── Pattern Manager handlers ──
  const handleSaveSlot = useCallback((slotIndex, name) => {
    saveToSlot(slotIndex, { name, patterns, bpm, swing, bars, mixer });
  }, [patterns, bpm, swing, bars, mixer]);

  const handleLoadSlot = useCallback((data) => {
    if (data.patterns) { setPatterns(data.patterns); patternsRef.current = data.patterns; }
    if (data.bpm) setBpm(data.bpm);
    if (data.swing !== undefined) setSwing(data.swing);
    if (data.bars) setBars(data.bars);
    if (data.mixer) setMixer(data.mixer);
  }, []);

  const handleShare = useCallback(() => {
    return getShareUrl({ patterns, bpm, swing, bars });
  }, [patterns, bpm, swing, bars]);

  const handleExportWav = useCallback(() => {
    return exportWav({ patterns, bpm, swing, bars, mixer });
  }, [patterns, bpm, swing, bars, mixer]);

  // ── Click-drag step entry ──
  const [isDragging, setIsDragging] = useState(false);
  const dragTrackRef = useRef(null);
  const dragValueRef = useRef(0);

  const handleDragStart = useCallback((trackId, stepIndex, currentValue) => {
    setIsDragging(true);
    dragTrackRef.current = trackId;
    // Drag paints the opposite: if step was off, paint on; if on, paint off
    dragValueRef.current = currentValue > 0 ? 0 : 1;
  }, []);

  const handleDragEnter = useCallback((trackId, stepIndex) => {
    if (!isDragging || trackId !== dragTrackRef.current) return;
    setPatterns(prev => {
      const next = { ...prev };
      const pat = [...prev[trackId]];
      pat[stepIndex] = dragValueRef.current;
      next[trackId] = pat;
      patternsRef.current = next;
      return next;
    });
  }, [isDragging]);

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
      dragTrackRef.current = null;
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // ── Derived ──
  const totalSteps = useMemo(() => bars * STEPS_PER_BAR, [bars]);
  const trainerStatus = trainerHook.getStatusBadge(scheduler.uiStep, scheduler.isPlaying);
  const isCurrentlyInSilence = useMemo(() => {
    if (!trainerHook.trainerConfig || !scheduler.isPlaying) return false;
    return trainerHook.isInGap();
  }, [trainerHook, scheduler.isPlaying, scheduler.uiStep]);

  // ── Background — very subtle silence tint ──
  const bgGradient = darkMode
    ? (isCurrentlyInSilence ? 'from-neutral-950 via-amber-950/10 to-neutral-950' : 'from-neutral-950 to-neutral-950')
    : (isCurrentlyInSilence ? 'from-[#F9FAFB] via-amber-50 to-[#F9FAFB]' : 'from-[#F9FAFB] to-[#F9FAFB]');

  // Dark mode CSS classes
  const dm = darkMode;
  const cardClass = dm
    ? 'bg-neutral-900 border border-neutral-800 rounded-xl p-3 sm:p-4 md:p-5 transition-all duration-200'
    : 'bg-white border border-neutral-200 rounded-xl p-3 sm:p-4 md:p-5 transition-all duration-200';
  const textPrimary = dm ? 'text-neutral-100' : 'text-[#1A1A1B]';
  const textSecondary = dm ? 'text-neutral-400' : 'text-neutral-500';
  const sectionLabel = dm
    ? 'text-[10px] font-medium uppercase tracking-widest text-neutral-500'
    : 'text-[10px] font-medium uppercase tracking-widest text-neutral-400';

  return (
    <div className={`min-h-screen w-full bg-gradient-to-br ${bgGradient} ${textPrimary} p-3 sm:p-4 md:p-6 transition-colors duration-500`}>
      <div className="max-w-7xl mx-auto">

        {/* Header — minimal */}
        <header className="mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`w-1 h-5 sm:h-6 rounded-full shrink-0 ${dm ? 'bg-neutral-600' : 'bg-neutral-300'}`}></div>
            <h1 className={`text-lg sm:text-xl md:text-2xl font-semibold ${dm ? 'text-neutral-100' : 'text-[#1A1A1B]'}`}>Time Beat Machine</h1>
            <span className={`px-2 py-0.5 text-[10px] rounded font-medium border hidden sm:inline ${
              dm ? 'border-neutral-700 text-neutral-500' : 'border-neutral-200 text-neutral-400'
            }`}>Timing Trainer</span>
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setMetronomeEnabled(m => !m)}
                className={`px-2 py-1 rounded-md text-[10px] sm:text-xs font-medium transition-all border ${
                  metronomeEnabled
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : (dm ? 'border-neutral-700 text-neutral-400 hover:border-neutral-600' : 'border-neutral-200 text-neutral-500 hover:border-neutral-300')
                }`}
                title="Metronome (click track)"
              >Met</button>
              <button
                onClick={toggleDarkMode}
                className={`px-2 py-1 rounded-md text-[10px] sm:text-xs font-medium transition-all border ${
                  dm ? 'border-neutral-700 text-neutral-400 hover:border-neutral-600' : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
                }`}
                title="Toggle dark mode (D)"
              >{dm ? '☀' : '🌙'}</button>
              {undoRedo.canUndo && (
                <button onClick={handleUndo} className={`px-1.5 py-1 rounded text-[10px] font-mono ${dm ? 'bg-neutral-700/60 text-neutral-400' : 'bg-neutral-100/60 text-neutral-500'}`} title="Undo (Cmd+Z)">↩</button>
              )}
              {undoRedo.canRedo && (
                <button onClick={handleRedo} className={`px-1.5 py-1 rounded text-[10px] font-mono ${dm ? 'bg-neutral-700/60 text-neutral-400' : 'bg-neutral-100/60 text-neutral-500'}`} title="Redo (Cmd+Shift+Z)">↪</button>
              )}
            </div>
          </div>
        </header>

        {/* Transport + Controls — borderless */}
        <div className="mb-6 sm:mb-8">

          {/* Row 1: Play + Bars + Toggles */}
          <div className="flex items-center gap-2 sm:gap-3 mb-3">
            <button
              onClick={transport.handleTapTempo}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 active:scale-95 shrink-0 border ${
                transport.tapActive
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : dm ? 'border-neutral-700 text-neutral-400 hover:border-neutral-600' : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
              }`}
              title={`Tap tempo (T)${transport.tapTimes.length > 0 ? ` – ${transport.tapTimes.length} taps` : ''}`}
            >Tap{transport.tapTimes.length > 0 && <span className="ml-1 opacity-50">×{transport.tapTimes.length}</span>}</button>

            <button
              onClick={scheduler.handleToggle}
              className={`px-5 sm:px-8 py-1.5 sm:py-2 rounded-md text-sm font-semibold transition-all duration-200 active:scale-95 shrink-0 ${
                scheduler.isPlaying
                  ? dm ? 'bg-neutral-200 text-neutral-900' : 'bg-neutral-900 text-white'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
              title="Start/Stop (Space)"
            >{scheduler.isPlaying ? '■ Stop' : '▶ Start'}</button>

            {/* Bars — hidden on small mobile, shown sm+ */}
            <div className={`hidden sm:flex items-center gap-1 shrink-0`}>
              <span className={`text-[10px] sm:text-xs mr-1 font-medium ${dm ? 'text-neutral-400' : 'text-neutral-500'}`}>Bars</span>
              {[1, 2, 3, 4].map(b => (
                <button
                  key={b}
                  onClick={() => setBars(b)}
                  className={`w-7 h-7 text-xs rounded-md font-semibold transition-all duration-200 active:scale-95 ${
                    bars === b
                      ? dm ? 'bg-neutral-100 text-neutral-900' : 'bg-neutral-900 text-white'
                      : dm ? 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >{b}</button>
              ))}
            </div>

            {/* Right-side toggles */}
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              {/* ⚙ Controls toggle — always visible on mobile/tablet */}
              {isMobileDevice && (
                <button
                  onClick={() => setShowControls(v => !v)}
                  className={`w-8 h-8 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1.5 flex items-center justify-center rounded-md text-sm sm:text-xs font-semibold border transition-all duration-200 ${
                    showControls
                      ? dm ? 'bg-neutral-200 text-neutral-900 border-neutral-200' : 'bg-neutral-900 text-white border-neutral-900'
                      : dm ? 'border-neutral-700 text-neutral-400 hover:border-neutral-600' : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
                  }`}
                  title="BPM / Swing / Groove / Presets"
                >⚙</button>
              )}
              <button
                onClick={() => setShowTools(t => !t)}
                className={`w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 flex items-center justify-center rounded-md text-xs font-semibold border transition-all duration-200 ${
                  showTools
                    ? dm ? 'bg-neutral-100 text-neutral-900 border-neutral-100' : 'bg-neutral-900 text-white border-neutral-900'
                    : dm ? 'border-neutral-700 text-neutral-400 hover:border-neutral-600' : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                }`}
              ><span className="hidden sm:inline">{showTools ? '▲ Tools' : '▼ Tools'}</span><span className="sm:hidden">{showTools ? '▲' : '▼'}</span></button>
            </div>
          </div>

          {/* Bars — mobile only, below play row */}
          <div className="flex sm:hidden items-center gap-1 mb-1">
            <span className={`text-[10px] mr-1 font-medium ${dm ? 'text-neutral-400' : 'text-neutral-500'}`}>Bars</span>
            {[1, 2, 3, 4].map(b => (
              <button
                key={b}
                onClick={() => setBars(b)}
                className={`w-7 h-7 text-xs rounded-md font-semibold transition-all duration-200 active:scale-95 ${
                  bars === b
                    ? dm ? 'bg-neutral-100 text-neutral-900' : 'bg-neutral-900 text-white shadow-sm'
                    : dm ? 'bg-neutral-700/60 text-neutral-400 hover:bg-neutral-600/60' : 'bg-neutral-100/60 text-neutral-600 hover:bg-neutral-200/60'
                }`}
              >{b}</button>
            ))}
          </div>

          {/* Row 2 + 3: Collapsible on mobile/tablet */}
          {(!isMobileDevice || showControls) && (<>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 mb-3 mt-3">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] sm:text-xs w-10 shrink-0 font-medium ${dm ? 'text-neutral-400' : 'text-neutral-500'}`}>BPM</span>
              <input
                type="range" min={50} max={220} value={bpm}
                onChange={(e) => setBpm(parseInt(e.target.value))}
                className="flex-1 slider"
              />
              {isEditingBpm ? (
                <input
                  type="number"
                  min={50}
                  max={220}
                  value={tempBpmValue}
                  ref={(el) => {
                    if (el && ('ontouchstart' in window)) {
                      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                    }
                  }}
                  onChange={(e) => setTempBpmValue(parseInt(e.target.value) || 0)}
                  onBlur={() => {
                    setIsEditingBpm(false);
                    if (tempBpmValue >= 50 && tempBpmValue <= 220) {
                      setBpm(tempBpmValue);
                    } else {
                      setTempBpmValue(bpm);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditingBpm(false);
                      if (tempBpmValue >= 50 && tempBpmValue <= 220) {
                        setBpm(tempBpmValue);
                      } else {
                        setTempBpmValue(bpm);
                      }
                    } else if (e.key === 'Escape') {
                      setIsEditingBpm(false);
                      setTempBpmValue(bpm);
                    }
                  }}
                  className={`font-mono text-xs font-bold w-12 text-right shrink-0 ${dm ? 'bg-neutral-700 text-neutral-100 border-neutral-600' : 'bg-neutral-100 text-neutral-900 border-neutral-300'} border rounded px-1 py-0.5`}
                  autoFocus
                />
              ) : (
                <span 
                  className={`font-mono text-xs font-bold w-12 text-right shrink-0 ${dm ? 'text-neutral-200 hover:text-neutral-100 hover:bg-neutral-700/50' : 'text-neutral-900 hover:text-neutral-900 hover:bg-neutral-200/50'} rounded px-1 py-0.5 cursor-pointer`}
                  onClick={() => {
                    setIsEditingBpm(true);
                    setTempBpmValue(bpm);
                  }}
                >
                  {bpm}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] sm:text-xs w-10 shrink-0 font-medium ${dm ? 'text-neutral-400' : 'text-neutral-500'}`}>Swing</span>
              <input
                type="range" min={0} max={60} value={swing}
                onChange={(e) => setSwing(parseInt(e.target.value))}
                className="flex-1 slider"
              />
              <span className={`font-mono text-xs font-bold w-12 text-right shrink-0 ${dm ? 'text-neutral-200' : 'text-neutral-900'}`}>{swing}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] sm:text-xs w-10 shrink-0 font-medium ${dm ? 'text-neutral-400' : 'text-neutral-500'}`}>Groove</span>
              <input
                type="range" min={-100} max={100} value={grooveOffset}
                onChange={(e) => setGrooveOffset(parseInt(e.target.value))}
                className="flex-1 slider"
              />
              <span className={`font-mono text-xs font-bold w-12 text-right shrink-0 ${dm ? 'text-neutral-200' : 'text-neutral-900'}`}>
                {grooveOffset === 0 ? '0ms' : grooveOffset > 0 ? `+${grooveOffset}ms` : `${grooveOffset}ms`}
              </span>
              <button
                onClick={() => setEinsClick(v => !v)}
                title="Eins-Click: fester Downbeat auf der 1"
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 border transition-colors ${
                  einsClick
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : dm ? 'border-neutral-700 text-neutral-400 hover:border-neutral-600' : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
                }`}
              >1</button>
            </div>
          </div>

          {/* Row 3: Groove presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
            {Object.keys(presets).map(name => (
              <button
                key={name}
                onClick={() => loadPreset(name)}
                className={`text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-md font-medium transition-all duration-200 whitespace-nowrap shrink-0 border ${
                  dm ? 'border-neutral-700 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300' : 'border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:text-neutral-800'
                }`}
              >{name}</button>
            ))}
            <button
              onClick={clearAll}
              className={`text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-md font-medium transition-all duration-200 whitespace-nowrap shrink-0 ${dm ? 'text-neutral-600 hover:text-red-400' : 'text-neutral-400 hover:text-red-500'}`}
            >Clear</button>
          </div>
          </>)}
        </div>

        {/* Tools Panel — directly below transport, visible when open */}
        {showTools && (
          <div className="mb-3 sm:mb-4 space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Timing Trainer */}
              <div className={`${dm ? 'bg-neutral-900' : 'bg-white'} border rounded-xl p-3 sm:p-4 md:p-5 transition-all duration-200 ${
                isCurrentlyInSilence ? (dm ? 'border-amber-800/60' : 'border-amber-200') : (dm ? 'border-neutral-800' : 'border-neutral-200')
              }`}>
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <span className={`text-xs sm:text-sm font-semibold ${sectionLabel}`}>Timing Trainer</span>
                  {trainerHook.trainerMode && (
                    <span className={`ml-auto text-[9px] sm:text-[10px] font-medium ${
                      isCurrentlyInSilence ? 'text-amber-600' : textSecondary
                    }`}>{trainerStatus.text}</span>
                  )}
                </div>
                <TimingTrainer
                  trainerMode={trainerHook.trainerMode}
                  customPlay={trainerHook.customPlay}
                  customSilence={trainerHook.customSilence}
                  fadePhase={trainerHook.fadePhase}
                  onToggleMode={trainerHook.toggleMode}
                  onCustomPlayChange={trainerHook.setCustomPlay}
                  onCustomSilenceChange={trainerHook.setCustomSilence}
                  statusBadge={trainerStatus}
                  collapsed={false}
                />
              </div>

              {/* Patterns */}
              <div className={cardClass}>
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <span className={`text-xs sm:text-sm font-semibold ${sectionLabel}`}>Patterns</span>
                </div>
                <PatternManager
                  onSave={handleSaveSlot}
                  onLoad={handleLoadSlot}
                  onShare={handleShare}
                  onExport={handleExportWav}
                  collapsed={false}
                />
              </div>
            </div>

            {/* Effects — full width */}
            <div className={cardClass}>
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <span className={`text-xs sm:text-sm font-semibold ${sectionLabel}`}>Effects & Sound Design</span>
              </div>
              <EffectsPanel
                reverbMix={reverbMix}
                onReverbChange={setReverbMix}
                compThreshold={compThreshold}
                compRatio={compRatio}
                onCompThresholdChange={setCompThreshold}
                onCompRatioChange={setCompRatio}
                voiceParams={voiceParams}
                onVoiceParamChange={handleVoiceParamChange}
                collapsed={false}
              />
            </div>
          </div>
        )}

        {/* SEQUENCER — main focus */}
        <div className={`${dm ? 'bg-neutral-900' : 'bg-white'} border rounded-xl p-3 sm:p-4 md:p-6 transition-all duration-200 ${
          isCurrentlyInSilence ? (dm ? 'border-amber-800/60' : 'border-amber-200') : (dm ? 'border-neutral-800' : 'border-neutral-200')
        }`}>
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div className="flex items-center gap-2 sm:gap-3">
              <h2 className={`text-xs sm:text-sm font-semibold ${sectionLabel}`}>
                <span className="hidden sm:inline">Pattern Sequencer</span>
                <span className="sm:hidden">Sequencer</span>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {isCurrentlyInSilence ? (
                <span className={`text-[10px] sm:text-xs font-medium px-2 py-1 rounded border ${dm ? 'text-amber-500 border-amber-800/60' : 'text-amber-700 border-amber-200 bg-amber-50'}`}>
                  Your Turn
                </span>
              ) : trainerHook.trainerMode && scheduler.isPlaying ? (
                <span className={`text-[10px] sm:text-xs ${textSecondary}`}>
                  Listen
                </span>
              ) : null}
              <div className={`flex items-center gap-1.5 text-[10px] sm:text-xs ${textSecondary}`}>
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                <span className="hidden sm:inline">Playhead</span>
              </div>
            </div>
          </div>

          {/* Global mobile bar selector — shown once, not per track */}
          {isMobileDevice && bars > 1 && (
            <div className="flex items-center gap-3 mb-3 lg:hidden">
              <span className={`text-[10px] font-mono ${textSecondary}`}>Bar</span>
              <div className="flex gap-1.5">
                {Array.from({ length: bars }, (_, barIndex) => (
                  <button
                    key={barIndex}
                    onClick={() => setActiveMobileBar(barIndex)}
                    className={`w-6 h-6 rounded-full text-[10px] font-mono font-bold transition-all duration-150 ${
                      activeMobileBar === barIndex
                        ? dm ? 'bg-neutral-600 text-neutral-100' : 'bg-neutral-200 text-neutral-800'
                        : dm ? 'text-neutral-500 hover:text-neutral-300' : 'text-neutral-400 hover:text-neutral-600'
                    }`}
                  >
                    {barIndex + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          {TRACKS.map(track => (
            <TrackGrid
              key={track.id}
              trackId={track.id}
              name={track.name}
              pattern={patterns[track.id] || emptyPattern(bars)}
              playhead={scheduler.uiStep}
              isPlaying={scheduler.isPlaying}
              isMobileDevice={isMobileDevice}
              bars={bars}
              activeMobileBar={activeMobileBar}
              setActiveMobileBar={setActiveMobileBar}
              onToggleStep={toggleStep}
              volume={mixer[track.id]?.volume ?? 100}
              mute={mixer[track.id]?.mute ?? false}
              solo={mixer[track.id]?.solo ?? false}
              onVolumeChange={handleVolumeChange}
              onMuteToggle={handleMuteToggle}
              onSoloToggle={handleSoloToggle}
              isDragging={isDragging}
              onDragStart={handleDragStart}
              onDragEnter={handleDragEnter}
              onCopy={copyTrack}
              onPaste={pasteTrack}
              hasClipboard={!!clipboard}
              darkMode={darkMode}
            />
          ))}

          <div className={`mt-4 sm:mt-6 pt-4 sm:pt-6 border-t ${dm ? 'border-neutral-800' : 'border-neutral-100'}`}>
            <p className={`text-[10px] sm:text-[11px] ${textSecondary}`}>
              <span className="hidden sm:inline">Click = On / Off — Tools (▼) → Timing Trainer (G) to practice with silence gaps</span>
              <span className="sm:hidden">Tap to toggle steps — Tools → Timing Trainer</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className={`mt-6 sm:mt-8 md:mt-10 text-center text-[10px] sm:text-[11px] ${textSecondary}`}>
          <div className={`border-t ${dm ? 'border-neutral-800' : 'border-neutral-100'} pt-4 sm:pt-6`}>
            <p className="mb-3">Time Beat Machine by <strong>Lukas Schönsgibl</strong> · <a href="https://schoensgibl.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">schoensgibl.com</a></p>
            <div className="flex items-center justify-center gap-3 sm:gap-5 flex-wrap">
              {[['Space', 'Start/Stop'], ['T', 'Tap Tempo'], ['G', 'Trainer'], ['D', 'Dark Mode'], ['Cmd+Z', 'Undo']].map(([key, label]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <kbd className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                    dm ? 'text-neutral-400 border-neutral-700' : 'text-neutral-500 border-neutral-200'
                  }`}>{key}</kbd>
                  <span className="text-[9px]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
