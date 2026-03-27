import { useRef, useState, useCallback, useEffect } from 'react';
import { STEPS_PER_BAR } from '../utils/patternHelpers';
import { triggerMap } from '../audio/DrumSynths';

export default function useScheduler(audioEngine, patternsRef, mixerRef, trainerHook, voiceParamsRef, metronomeRef) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [uiStep, setUiStep] = useState(0);

  const nextNoteTimeRef = useRef(0);
  const currentStepRef = useRef(0);
  const scheduleTimerRef = useRef(null);
  const rafRef = useRef(0);
  const isPlayingRef = useRef(false);
  // Track scheduled {step, time} pairs so the visual playhead follows actual audio time
  const scheduleTimesRef = useRef([]);

  const bpmRef = useRef(100);
  const swingRef = useRef(0);
  const grooveOffsetRef = useRef(0); // ms, positive = laid back, negative = push
  const einsClickRef = useRef(false); // prominent downbeat click on beat 1, always on grid
  const barsRef = useRef(2);
  const lastUiStepRef = useRef(-1);

  const setBpm = useCallback((v) => { bpmRef.current = v; }, []);
  const setSwing = useCallback((v) => { swingRef.current = v; }, []);
  const setGrooveOffset = useCallback((v) => { grooveOffsetRef.current = v; }, []);
  const setEinsClick = useCallback((v) => { einsClickRef.current = v; }, []);
  const setBarsRef = useCallback((v) => { barsRef.current = v; }, []);

  const swingOffsetForStep = useCallback((stepIndex) => {
    const sixteenth = (60 / bpmRef.current) / 4;
    const isOffbeat = stepIndex % 2 === 1;
    const swingPct = swingRef.current / 100;
    return isOffbeat ? swingPct * sixteenth * 0.5 : 0;
  }, []);

  const scheduler = useCallback(() => {
    const ctx = audioEngine.getContext();
    if (!ctx) return;
    const secondsPerBeat = 60.0 / bpmRef.current;
    const sixteenth = secondsPerBeat / 4;
    const total = barsRef.current * STEPS_PER_BAR;

    while (nextNoteTimeRef.current < ctx.currentTime + 0.12) {
      const step = currentStepRef.current % total;
      const swingOffset = swingOffsetForStep(step);
      const t = nextNoteTimeRef.current + swingOffset;
      // Drum hits are offset by grooveOffset (ms); metronome click stays on the grid
      const drumTime = t + grooveOffsetRef.current / 1000;

      // Record scheduled drum time for accurate visual sync
      scheduleTimesRef.current.push({ step, time: drumTime });
      if (scheduleTimesRef.current.length > total + 8) {
        scheduleTimesRef.current = scheduleTimesRef.current.slice(-(total + 8));
      }

      trainerHook.onStepAdvance(step, total);
      const muted = trainerHook.isInGap();

      // Beat-Click: low thud on all 4 beats — always on the grid, no groove offset
      // Beat 1 (Eins) is louder and lower than beats 2–4
      if (einsClickRef.current && step % 4 === 0) {
        const isEins = step % STEPS_PER_BAR === 0;
        const einsOsc = ctx.createOscillator();
        const einsGain = ctx.createGain();
        einsOsc.type = 'sine';
        einsOsc.frequency.setValueAtTime(isEins ? 900 : 500, t);
        einsOsc.frequency.exponentialRampToValueAtTime(isEins ? 300 : 150, t + 0.06);
        einsGain.gain.setValueAtTime(isEins ? 0.4 : 0.2, t);
        einsGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        einsOsc.connect(einsGain).connect(ctx.destination);
        einsOsc.start(t);
        einsOsc.stop(t + 0.13);
      }

      // Metronome click on beats (every 4 steps) — always on the grid, no groove offset
      if (metronomeRef?.current && step % 4 === 0) {
        const clickOsc = ctx.createOscillator();
        const clickGain = ctx.createGain();
        clickOsc.type = 'sine';
        const isDownbeat = step % STEPS_PER_BAR === 0;
        clickOsc.frequency.setValueAtTime(isDownbeat ? 1200 : 800, t);
        clickGain.gain.setValueAtTime(isDownbeat ? 0.15 : 0.08, t);
        clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
        clickOsc.connect(clickGain).connect(ctx.destination);
        clickOsc.start(t);
        clickOsc.stop(t + 0.04);
      }

      if (!muted) {
        const patterns = patternsRef.current;
        const mixer = mixerRef.current;
        const hasSolo = Object.values(mixer).some(m => m.solo);

        Object.keys(patterns).forEach(trackId => {
          const pat = patterns[trackId];
          if (!pat || step >= pat.length) return;
          const val = pat[step];
          if (!val) return;

          const mx = mixer[trackId];
          if (!mx) return;
          if (mx.mute) return;
          if (hasSolo && !mx.solo) return;

          const dest = audioEngine.getTrackGain(trackId);
          if (!dest) return;
          const trigger = triggerMap[trackId];
          const vp = voiceParamsRef?.current?.[trackId];
          if (trigger) trigger(ctx, dest, drumTime, val, vp); // val: 1=normal, 2=accent
        });
      }

      nextNoteTimeRef.current += sixteenth;
      currentStepRef.current = (currentStepRef.current + 1) % total;
    }
  }, [audioEngine, patternsRef, mixerRef, trainerHook, voiceParamsRef, metronomeRef, swingOffsetForStep]);

  const handleStart = useCallback(async () => {
    const ctx = await audioEngine.ensureContext();
    currentStepRef.current = 0;
    nextNoteTimeRef.current = ctx.currentTime + 0.05;
    isPlayingRef.current = true;
    setIsPlaying(true);
    scheduleTimerRef.current = setInterval(scheduler, 25);
    const tick = () => {
      const ctx2 = audioEngine.getContext();
      if (ctx2) {
        const now = ctx2.currentTime;
        // outputLatency: delay from audio processing to speaker output.
        // The user hears a sound scheduled at time T when ctx.currentTime ≈ T + outputLatency.
        // Delaying the visual by outputLatency keeps highlight and sound in sync.
        const outputLatency = ctx2.outputLatency || 0;
        const scheduled = scheduleTimesRef.current;
        // Find the most recently scheduled step that the user can now hear
        let playingStep = null;
        for (let i = scheduled.length - 1; i >= 0; i--) {
          if (scheduled[i].time + outputLatency <= now) {
            playingStep = scheduled[i].step;
            break;
          }
        }
        if (playingStep !== null && playingStep !== lastUiStepRef.current) {
          lastUiStepRef.current = playingStep;
          setUiStep(playingStep);
        }
        // Clean up entries older than 0.5s
        scheduleTimesRef.current = scheduled.filter(s => s.time > now - 0.5);
      }
      if (isPlayingRef.current) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [audioEngine, scheduler]);

  const handleStop = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    if (scheduleTimerRef.current) clearInterval(scheduleTimerRef.current);
    scheduleTimerRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    currentStepRef.current = 0;
    setUiStep(0);
    trainerHook.resetOnStop();
  }, [trainerHook]);

  const handleToggle = useCallback(() => {
    if (isPlayingRef.current) handleStop(); else handleStart();
  }, [handleStart, handleStop]);

  const scheduleIfSoon = useCallback((trackId, stepIndex) => {
    if (!isPlayingRef.current) return;
    const ctx = audioEngine.getContext();
    if (!ctx) return;
    const total = barsRef.current * STEPS_PER_BAR;
    const sixteenth = (60.0 / bpmRef.current) / 4;
    const stepNow = currentStepRef.current % total;
    const stepsAhead = (stepIndex - stepNow + total) % total;
    const t = nextNoteTimeRef.current + stepsAhead * sixteenth + swingOffsetForStep(stepIndex);

    if (t >= ctx.currentTime && t <= ctx.currentTime + 0.12) {
      if (!trainerHook.isInGap()) {
        const dest = audioEngine.getTrackGain(trackId);
        const trigger = triggerMap[trackId];
        if (dest && trigger) trigger(ctx, dest, t, 1);
      }
    }
  }, [audioEngine, trainerHook, swingOffsetForStep]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scheduleTimerRef.current) clearInterval(scheduleTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return {
    isPlaying, uiStep, handleStart, handleStop, handleToggle, scheduleIfSoon,
    bpmRef, swingRef, grooveOffsetRef, einsClickRef, barsRef,
    setBpm, setSwing, setGrooveOffset, setEinsClick, setBarsRef,
    currentStepRef,
  };
}
