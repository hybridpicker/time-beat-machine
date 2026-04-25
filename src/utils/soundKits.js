import { TRACKS } from './patternHelpers';

export const SOUND_KITS = {
  standard: {
    label: 'Standard',
    reverbMix: 8,
    compThreshold: -12,
    compRatio: 4,
    voiceParams: {
      kick: { tune: 0, decay: 1.0, tone: 0.58, texture: 0.3, punch: 0.68 },
      snare: { tune: 0, decay: 1.0, tone: 0.58, texture: 0.52, punch: 0.58 },
      hat: { tune: 0, decay: 1.0, tone: 0.76, texture: 0.56, punch: 0.42 },
      openhat: { tune: 0, decay: 1.0, tone: 0.74, texture: 0.5, punch: 0.42 },
      clap: { tune: 0, decay: 1.0, tone: 0.58, texture: 0.66, punch: 0.58 },
      cymbal: { tune: 0, decay: 1.0, tone: 0.72, texture: 0.58, punch: 0.42 },
      tom: { tune: 0, decay: 1.0, tone: 0.54, texture: 0.3, punch: 0.58 },
      rim: { tune: 0, decay: 1.0, tone: 0.38, texture: 0.48, punch: 0.38 },
    },
  },
  hiphop: {
    label: 'Hip Hop',
    reverbMix: 14,
    compThreshold: -18,
    compRatio: 6,
    voiceParams: {
      kick: { tune: -3, decay: 1.52, tone: 0.16, texture: 0.18, punch: 1.0 },
      snare: { tune: -1, decay: 1.18, tone: 0.34, texture: 0.9, punch: 0.92 },
      hat: { tune: -2, decay: 0.76, tone: 0.32, texture: 0.28, punch: 0.52 },
      openhat: { tune: -1, decay: 1.08, tone: 0.36, texture: 0.26, punch: 0.46 },
      clap: { tune: -1, decay: 1.24, tone: 0.36, texture: 1.0, punch: 0.82 },
      cymbal: { tune: -4, decay: 0.78, tone: 0.18, texture: 0.18, punch: 0.32 },
      tom: { tune: -2, decay: 1.24, tone: 0.26, texture: 0.22, punch: 0.9 },
      rim: { tune: -1, decay: 0.98, tone: 0.44, texture: 0.82, punch: 0.74 },
    },
  },
  jazz: {
    label: 'Jazz',
    reverbMix: 16,
    compThreshold: -8,
    compRatio: 2,
    voiceParams: {
      kick: { character: 'acoustic', tune: -3, decay: 1.08, tone: 0.24, texture: 0.18, punch: 0.26 },
      snare: { character: 'acoustic', tune: 0, decay: 1.18, tone: 0.48, texture: 0.42, punch: 0.24 },
      hat: { character: 'acoustic', tune: -1, decay: 0.92, tone: 0.62, texture: 0.34, punch: 0.18 },
      openhat: { character: 'acoustic', tune: -2, decay: 1.18, tone: 0.58, texture: 0.36, punch: 0.16 },
      clap: { tune: 0, decay: 0.82, tone: 0.28, texture: 0.24, punch: 0.22 },
      cymbal: { character: 'acoustic', tune: -2, decay: 1.42, tone: 0.5, texture: 0.56, punch: 0.18 },
      tom: { tune: -2, decay: 1.12, tone: 0.28, texture: 0.18, punch: 0.28 },
      rim: { tune: -2, decay: 0.78, tone: 0.2, texture: 0.12, punch: 0.12 },
    },
  },
};

export function createDefaultVoiceParams() {
  const params = {};
  TRACKS.forEach((track) => {
    params[track.id] = { tune: 0, decay: 1.0, tone: 0.5, texture: 0.5, punch: 0.5 };
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
