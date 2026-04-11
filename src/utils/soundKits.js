import { TRACKS } from './patternHelpers';

export const SOUND_KITS = {
  standard: {
    label: 'Standard',
    reverbMix: 8,
    compThreshold: -12,
    compRatio: 4,
    voiceParams: {
      kick: { tune: 0, decay: 1.0 },
      snare: { tune: 0, decay: 1.0 },
      hat: { tune: 0, decay: 1.0 },
      openhat: { tune: 0, decay: 1.0 },
      clap: { tune: 0, decay: 1.0 },
      cymbal: { tune: 0, decay: 1.0 },
      tom: { tune: 0, decay: 1.0 },
      rim: { tune: 0, decay: 1.0 },
    },
  },
  hiphop: {
    label: 'Hip Hop',
    reverbMix: 14,
    compThreshold: -18,
    compRatio: 6,
    voiceParams: {
      kick: { tune: -3, decay: 1.45 },
      snare: { tune: -1, decay: 1.15 },
      hat: { tune: -2, decay: 0.8 },
      openhat: { tune: -1, decay: 1.15 },
      clap: { tune: -1, decay: 1.2 },
      cymbal: { tune: -4, decay: 0.85 },
      tom: { tune: -2, decay: 1.2 },
      rim: { tune: -1, decay: 0.95 },
    },
  },
  jazz: {
    label: 'Jazz',
    reverbMix: 10,
    compThreshold: -10,
    compRatio: 3,
    voiceParams: {
      kick: { tune: -2, decay: 0.8 },
      snare: { tune: 1, decay: 0.8 },
      hat: { tune: -3, decay: 0.75 },
      openhat: { tune: -4, decay: 0.95 },
      clap: { tune: 0, decay: 0.85 },
      cymbal: { tune: -5, decay: 1.35 },
      tom: { tune: -1, decay: 0.9 },
      rim: { tune: -2, decay: 0.8 },
    },
  },
};

export function createDefaultVoiceParams() {
  const params = {};
  TRACKS.forEach((track) => {
    params[track.id] = { tune: 0, decay: 1.0 };
  });
  return params;
}

export function createVoiceParamsFromKit(kitId = 'standard') {
  const defaults = createDefaultVoiceParams();
  const kit = SOUND_KITS[kitId] || SOUND_KITS.standard;

  Object.entries(kit.voiceParams || {}).forEach(([trackId, value]) => {
    defaults[trackId] = { ...defaults[trackId], ...value };
  });

  return defaults;
}

export function getKitSettings(kitId = 'standard') {
  const kit = SOUND_KITS[kitId] || SOUND_KITS.standard;
  return {
    soundKit: kitId in SOUND_KITS ? kitId : 'standard',
    reverbMix: kit.reverbMix,
    compThreshold: kit.compThreshold,
    compRatio: kit.compRatio,
    voiceParams: createVoiceParamsFromKit(kitId),
  };
}

export function getRecommendedKitForPreset(name) {
  if (name === 'Bebop' || name === 'Jazz Modern') return 'jazz';
  if (name === 'Trap' || name === 'New Jack' || name === 'Dilla Bounce' || name === 'Dilla Ghost') return 'hiphop';
  return 'standard';
}
