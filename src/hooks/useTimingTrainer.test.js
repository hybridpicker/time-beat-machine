import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useTimingTrainer from './useTimingTrainer';

describe('useTimingTrainer', () => {
  it('initial state: no mode active', () => {
    const { result } = renderHook(() => useTimingTrainer());
    expect(result.current.trainerMode).toBeNull();
    expect(result.current.trainerConfig).toBeNull();
  });

  // ── toggleMode ──

  describe('toggleMode', () => {
    it('activates a mode', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('callResponse'));
      expect(result.current.trainerMode).toBe('callResponse');
      expect(result.current.trainerConfig).toEqual({ play: 2, silence: 2 });
    });

    it('deactivates when toggling same mode', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('steadyGap'));
      act(() => result.current.toggleMode('steadyGap'));
      expect(result.current.trainerMode).toBeNull();
    });

    it('switches between modes', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('callResponse'));
      act(() => result.current.toggleMode('deepDive'));
      expect(result.current.trainerMode).toBe('deepDive');
      expect(result.current.trainerConfig).toEqual({ play: 2, silence: 4 });
    });
  });

  // ── isInGap (uses absolute bar counter via onStepAdvance) ──

  describe('isInGap', () => {
    it('returns false when no mode', () => {
      const { result } = renderHook(() => useTimingTrainer());
      expect(result.current.isInGap()).toBe(false);
    });

    it('callResponse: play=2, silence=2 — bars 0,1 play, bars 2,3 gap', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('callResponse'));

      // Initialize stepping (first call sets lastSeenStep)
      act(() => result.current.onStepAdvance(0, 32));
      // Bar 0 → play
      expect(result.current.isInGap()).toBe(false);

      // Advance to bar 1
      act(() => result.current.onStepAdvance(16, 32));
      expect(result.current.isInGap()).toBe(false);

      // Advance to bar 2 (loop wraps, step goes back to 0)
      act(() => result.current.onStepAdvance(0, 32));
      expect(result.current.isInGap()).toBe(true);

      // Advance to bar 3
      act(() => result.current.onStepAdvance(16, 32));
      expect(result.current.isInGap()).toBe(true);

      // Advance to bar 4 → play again (cycle repeats)
      act(() => result.current.onStepAdvance(0, 32));
      expect(result.current.isInGap()).toBe(false);
    });

    it('steadyGap: play=3, silence=1 — bars 0,1,2 play, bar 3 gap', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('steadyGap'));

      act(() => result.current.onStepAdvance(0, 32));
      expect(result.current.isInGap()).toBe(false); // bar 0

      act(() => result.current.onStepAdvance(16, 32));
      expect(result.current.isInGap()).toBe(false); // bar 1

      act(() => result.current.onStepAdvance(0, 32));
      expect(result.current.isInGap()).toBe(false); // bar 2

      act(() => result.current.onStepAdvance(16, 32));
      expect(result.current.isInGap()).toBe(true); // bar 3 → gap
    });

    it('works with 1-bar loops', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('callResponse')); // play=2, silence=2

      // 1-bar loop: steps 0-15, then wraps. Simulate step transitions
      // via first and last step of each bar to trigger wrap detection.
      act(() => result.current.onStepAdvance(0, 16)); // init, bar 0
      expect(result.current.isInGap()).toBe(false);

      act(() => result.current.onStepAdvance(15, 16)); // end of loop
      act(() => result.current.onStepAdvance(0, 16));  // wrap → bar 1
      expect(result.current.isInGap()).toBe(false);

      act(() => result.current.onStepAdvance(15, 16));
      act(() => result.current.onStepAdvance(0, 16));  // wrap → bar 2
      expect(result.current.isInGap()).toBe(true); // gap

      act(() => result.current.onStepAdvance(15, 16));
      act(() => result.current.onStepAdvance(0, 16));  // wrap → bar 3
      expect(result.current.isInGap()).toBe(true); // still gap

      act(() => result.current.onStepAdvance(15, 16));
      act(() => result.current.onStepAdvance(0, 16));  // wrap → bar 4
      expect(result.current.isInGap()).toBe(false); // play again
    });
  });

  // ── fadeAway ──

  describe('fadeAway mode', () => {
    it('starts at phase 0 (play=4, silence=1)', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('fadeAway'));
      expect(result.current.fadePhase).toBe(0);
      expect(result.current.trainerConfig).toEqual({ play: 4, silence: 1 });
    });

    it('resetOnStop resets phase to 0', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('fadeAway'));
      // Simulate some phase progression via onStepAdvance
      // Then reset
      act(() => result.current.resetOnStop());
      expect(result.current.fadePhase).toBe(0);
    });
  });

  // ── getStatusBadge ──

  describe('getStatusBadge', () => {
    it('returns "Aus" when no mode active', () => {
      const { result } = renderHook(() => useTimingTrainer());
      const badge = result.current.getStatusBadge(0, true);
      expect(badge.text).toBe('Off');
      expect(badge.inSilence).toBe(false);
    });

    it('returns "Aus" when not playing', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('callResponse'));
      const badge = result.current.getStatusBadge(0, false);
      expect(badge.text).toBe('Off');
    });

    it('shows play badge during play phase', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('callResponse'));
      const badge = result.current.getStatusBadge(0, true);
      expect(badge.inSilence).toBe(false);
      expect(badge.text).toContain('Play');
    });

    it('shows silence badge during gap', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('callResponse'));
      // Advance to bar 2 (gap for callResponse: play=2, silence=2)
      act(() => result.current.onStepAdvance(0, 32));
      act(() => result.current.onStepAdvance(16, 32));
      act(() => result.current.onStepAdvance(0, 32));

      const badge = result.current.getStatusBadge(0, true);
      expect(badge.inSilence).toBe(true);
      expect(badge.text).toContain('Gap');
    });
  });

  // ── resetOnStop ──

  describe('resetOnStop', () => {
    it('does nothing when not in fadeAway mode', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('callResponse'));
      act(() => result.current.resetOnStop()); // should not throw
      expect(result.current.trainerMode).toBe('callResponse');
    });

    it('resets absolute bar counter on stop', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('callResponse'));
      // Advance to gap
      act(() => result.current.onStepAdvance(0, 32));
      act(() => result.current.onStepAdvance(16, 32));
      act(() => result.current.onStepAdvance(0, 32));
      expect(result.current.isInGap()).toBe(true);

      // Reset on stop
      act(() => result.current.resetOnStop());
      // After reset, should be back to bar 0 → play
      act(() => result.current.onStepAdvance(0, 32));
      expect(result.current.isInGap()).toBe(false);
    });
  });

  // ── toggleLastMode ──

  describe('toggleLastMode', () => {
    it('toggles off when mode is active', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('callResponse'));
      act(() => result.current.toggleLastMode());
      expect(result.current.trainerMode).toBeNull();
    });

    it('re-activates last mode when no mode is active', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('steadyGap'));
      act(() => result.current.toggleMode('steadyGap')); // turn off
      expect(result.current.trainerMode).toBeNull();
      act(() => result.current.toggleLastMode());
      expect(result.current.trainerMode).toBe('steadyGap');
    });

    it('does nothing when no last mode', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleLastMode());
      expect(result.current.trainerMode).toBeNull();
    });
  });

  // ── onStepAdvance ──

  describe('onStepAdvance', () => {
    it('does nothing when not in fadeAway mode', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('callResponse'));
      act(() => result.current.onStepAdvance(32, 64));
      // Should not affect fadePhase
      expect(result.current.fadePhase).toBe(0);
    });

    it('advances fadePhase on cycle completion in fadeAway mode', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('fadeAway'));
      // fadeAway phase 0: play=4, silence=1, totalCycle=5
      // Cycle completes at bar 5
      // Advance through bars 0-4 (5 bar transitions)
      act(() => result.current.onStepAdvance(0, 64)); // init, bar 0
      act(() => result.current.onStepAdvance(16, 64)); // bar 1
      act(() => result.current.onStepAdvance(32, 64)); // bar 2
      act(() => result.current.onStepAdvance(48, 64)); // bar 3
      act(() => result.current.onStepAdvance(0, 64));  // bar 4
      // At bar 5, cycle completes → phase should advance
      act(() => result.current.onStepAdvance(16, 64)); // bar 5
      expect(result.current.fadePhase).toBe(1);
    });
  });

  // ── custom mode ──

  describe('custom mode', () => {
    it('uses custom play/silence values', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('custom'));
      // Default custom: play=3, silence=1
      expect(result.current.trainerConfig).toEqual({ play: 3, silence: 1 });
    });

    it('updates when custom values change', () => {
      const { result } = renderHook(() => useTimingTrainer());
      act(() => result.current.toggleMode('custom'));
      act(() => result.current.setCustomPlay(5));
      act(() => result.current.setCustomSilence(3));
      expect(result.current.trainerConfig).toEqual({ play: 5, silence: 3 });
    });
  });
});
