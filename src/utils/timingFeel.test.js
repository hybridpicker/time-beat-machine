import { describe, it, expect } from 'vitest';
import { getSwingOffset, getTrackTimingOffsetMs } from './timingFeel';

describe('timingFeel', () => {
  it('swings eighth offbeats in triplet mode', () => {
    const beat = 60 / 120;
    expect(getSwingOffset(2, 120, 60, 'triplet')).toBeCloseTo(beat / 6, 6);
    expect(getSwingOffset(1, 120, 60, 'triplet')).toBe(0);
  });

  it('swings odd sixteenths in sixteenth mode', () => {
    const sixteenth = (60 / 120) / 4;
    expect(getSwingOffset(1, 120, 60, 'sixteenth')).toBeCloseTo(sixteenth * 0.5, 6);
    expect(getSwingOffset(2, 120, 60, 'sixteenth')).toBe(0);
  });

  it('returns deterministic humanize offsets per track/step', () => {
    const first = getTrackTimingOffsetMs('snare', 10, 14, 'triplet');
    const second = getTrackTimingOffsetMs('snare', 10, 14, 'triplet');
    expect(first).toBe(second);
  });

  it('includes track bias in triplet mode even without humanize', () => {
    expect(getTrackTimingOffsetMs('cymbal', 0, 0, 'triplet')).toBe(-2);
    expect(getTrackTimingOffsetMs('cymbal', 0, 0, 'sixteenth')).toBe(0);
  });
});
