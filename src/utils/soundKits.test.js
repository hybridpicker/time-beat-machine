import { describe, it, expect } from 'vitest';
import { SOUND_KITS, createVoiceParamsFromKit, getKitSettings, getRecommendedKitForPreset } from './soundKits';

describe('soundKits', () => {
  it('exposes the three supported kits', () => {
    expect(Object.keys(SOUND_KITS)).toEqual(['standard', 'hiphop', 'jazz']);
  });

  it('creates voice params from a kit', () => {
    const jazz = createVoiceParamsFromKit('jazz');
    expect(jazz.cymbal.decay).toBeGreaterThan(1);
    expect(jazz.kick.tune).toBeLessThan(0);
  });

  it('returns full settings for a kit', () => {
    const hiphop = getKitSettings('hiphop');
    expect(hiphop.soundKit).toBe('hiphop');
    expect(hiphop.compRatio).toBe(6);
    expect(hiphop.voiceParams.kick.decay).toBeCloseTo(1.52);
    expect(hiphop.voiceParams.kick.punch).toBe(1);
  });

  it('recommends hip hop kit for Dilla presets and jazz kit for jazz presets', () => {
    expect(getRecommendedKitForPreset('Dilla Bounce')).toBe('hiphop');
    expect(getRecommendedKitForPreset('Bebop')).toBe('jazz');
    expect(getRecommendedKitForPreset('Classic 1')).toBe('standard');
  });
});
