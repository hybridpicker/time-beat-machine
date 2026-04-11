const MAX_SWING = 60;

const TRACK_HUMANIZE_MULTIPLIER = {
  kick: 0.45,
  snare: 0.8,
  hat: 0.35,
  openhat: 0.5,
  clap: 0.55,
  cymbal: 0.25,
  tom: 0.7,
  rim: 0.75,
};

const TRIPLET_TRACK_BIAS_MS = {
  kick: 4,
  snare: 2,
  hat: 1,
  openhat: 2,
  clap: 2,
  cymbal: -2,
  tom: 3,
  rim: 1,
};

export const FEEL_MODES = {
  sixteenth: 'Sixteenth',
  triplet: 'Triplet',
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function seededUnit(stepIndex, trackId) {
  const input = `${trackId}:${stepIndex}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 999;
}

export function getSwingOffset(stepIndex, bpm, swing = 0, feelMode = 'sixteenth') {
  const normalizedSwing = clamp(swing, 0, MAX_SWING) / MAX_SWING;
  if (normalizedSwing === 0) return 0;

  const beat = 60 / bpm;
  const sixteenth = beat / 4;

  if (feelMode === 'triplet') {
    const stepInBeat = stepIndex % 4;
    if (stepInBeat !== 2) return 0;
    return normalizedSwing * (beat / 6);
  }

  return stepIndex % 2 === 1 ? normalizedSwing * sixteenth * 0.5 : 0;
}

export function getTrackTimingOffsetMs(trackId, stepIndex, humanize = 0, feelMode = 'sixteenth') {
  const baseBias = feelMode === 'triplet' ? (TRIPLET_TRACK_BIAS_MS[trackId] || 0) : 0;
  if (!humanize) return baseBias;

  const multiplier = TRACK_HUMANIZE_MULTIPLIER[trackId] || 0.5;
  const jitter = (seededUnit(stepIndex, trackId) * 2 - 1) * humanize * multiplier;
  return baseBias + jitter;
}

