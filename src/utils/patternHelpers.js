export const STEPS_PER_BAR = 16;
export const MAX_BARS = 4;

export const emptyPattern = (bars) => Array(bars * STEPS_PER_BAR).fill(0);

export function seed(indices, bars, value = 1) {
  const arr = emptyPattern(bars);
  for (let b = 0; b < bars; b++) {
    indices.forEach((i) => (arr[b * STEPS_PER_BAR + i] = value));
  }
  return arr;
}

export function every(n, bars) {
  const arr = emptyPattern(bars);
  for (let i = 0; i < arr.length; i += n) arr[i] = 1;
  return arr;
}

export function mix(a, b) {
  return a.map((v, i) => (v || b[i] ? 1 : 0));
}

export function resizePattern(prev, bars) {
  const newLen = bars * STEPS_PER_BAR;
  const next = emptyPattern(bars);
  for (let i = 0; i < Math.min(prev.length, newLen); i++) next[i] = prev[i];
  return next;
}

export const midiToFreq = (midiNote) => 440 * Math.pow(2, (midiNote - 69) / 12);

export const getNoteNameFromMidi = (midiNote) => {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = noteNames[midiNote % 12];
  return `${noteName}${octave}`;
};

// Track definitions — monochrome, no per-track colors
export const TRACKS = [
  { id: 'kick',    name: 'Kick'     },
  { id: 'snare',   name: 'Snare'    },
  { id: 'hat',     name: 'Hi-Hat'   },
  { id: 'openhat', name: 'Open Hat' },
  { id: 'clap',    name: 'Clap'     },
  { id: 'cymbal',  name: 'Cymbal'   },
  { id: 'tom',     name: 'Tom'      },
  { id: 'rim',     name: 'Rimshot'  },
];

// Accent color classes (ring for 3-state velocity)
export const ACCENT_RING = 'ring-2 ring-white/70 ring-inset';

// Presets generate patterns for all 8 tracks
export const presets = {
  "Classic 1": ({ bars }) => ({
    kick: seed([0, 8], bars),
    snare: seed([4, 12], bars),
    hat: every(2, bars),
    openhat: emptyPattern(bars),
    clap: emptyPattern(bars),
    cymbal: seed([0], bars),
    tom: emptyPattern(bars),
    rim: emptyPattern(bars),
  }),
  "Classic 2": ({ bars }) => ({
    kick: seed([0, 7, 8, 10, 15], bars),
    snare: seed([4, 12], bars),
    hat: every(1, bars),
    openhat: emptyPattern(bars),
    clap: emptyPattern(bars),
    cymbal: seed([0, 8], bars),
    tom: emptyPattern(bars),
    rim: emptyPattern(bars),
  }),
  "New Jack": ({ bars }) => ({
    kick: seed([0, 6, 8, 11], bars),
    snare: seed([4, 12], bars),
    hat: mix(every(1, bars), seed([3, 7, 11, 15], bars)),
    openhat: seed([6, 14], bars),
    clap: emptyPattern(bars),
    cymbal: seed([0, 14], bars),
    tom: emptyPattern(bars),
    rim: emptyPattern(bars),
  }),
  "Breakbeat": ({ bars }) => ({
    kick: seed([0, 10, 13], bars),
    snare: seed([4, 12], bars),
    hat: seed([2, 6, 9, 14], bars),
    openhat: seed([4, 12], bars),
    clap: emptyPattern(bars),
    cymbal: seed([0, 15], bars),
    tom: emptyPattern(bars),
    rim: seed([7], bars),
  }),
  "Four Floor": ({ bars }) => ({
    kick: every(4, bars),
    snare: seed([4, 12], bars),
    hat: every(1, bars),
    openhat: seed([2, 6, 10, 14], bars),
    clap: seed([4, 12], bars),
    cymbal: seed([0], bars),
    tom: emptyPattern(bars),
    rim: emptyPattern(bars),
  }),
  "Jungle": ({ bars }) => ({
    kick: seed([0, 3, 8, 11, 14], bars),
    snare: seed([4, 10, 12, 15], bars),
    hat: every(1, bars),
    openhat: seed([2, 10], bars),
    clap: emptyPattern(bars),
    cymbal: seed([0, 6, 8, 14], bars),
    tom: seed([6, 13], bars),
    rim: emptyPattern(bars),
  }),
  "Trap": ({ bars }) => ({
    kick: seed([0, 4, 8, 12], bars),
    snare: seed([6, 14], bars),
    hat: seed([1, 2, 3, 5, 7, 9, 10, 11, 13, 15], bars),
    openhat: seed([4, 12], bars),
    clap: seed([6, 14], bars),
    cymbal: seed([0, 8], bars),
    tom: emptyPattern(bars),
    rim: emptyPattern(bars),
  }),
  "Ambient": ({ bars }) => ({
    kick: seed([0, 12], bars),
    snare: seed([8], bars),
    hat: seed([4, 6, 10, 14], bars),
    openhat: seed([2], bars),
    clap: emptyPattern(bars),
    cymbal: seed([0, 7, 15], bars),
    tom: seed([4], bars),
    rim: seed([10], bars),
  }),
  "Dilla Bounce": ({ bars }) => ({
    kick: mix(seed([0, 7, 10], bars), seed([13], bars, 2)),
    snare: mix(seed([4, 12], bars), seed([15], bars)),
    hat: mix(seed([0, 2, 3, 6, 8, 10, 11, 14], bars), seed([15], bars, 2)),
    openhat: seed([5, 13], bars),
    clap: seed([4, 12], bars),
    cymbal: emptyPattern(bars),
    tom: emptyPattern(bars),
    rim: seed([9], bars),
  }),
  "Dilla Ghost": ({ bars }) => ({
    kick: mix(seed([0, 8], bars, 2), seed([3, 11, 14], bars)),
    snare: mix(seed([4, 12], bars), seed([10], bars)),
    hat: mix(seed([1, 2, 5, 6, 9, 10, 13, 14], bars), seed([3, 11, 15], bars, 2)),
    openhat: seed([7], bars),
    clap: seed([12], bars),
    cymbal: emptyPattern(bars),
    tom: seed([15], bars),
    rim: seed([6], bars),
  }),
  // ── Jazz Presets (set Swing 40–55% for authentic jazz feel) ──
  "Jazz Swing": ({ bars }) => ({
    // Straight-ahead swing for standards, blues, and medium-up tunes
    kick: seed([0, 4, 8, 12], bars),    // Feathered four-on-the-floor
    snare: seed([10], bars),            // Light comping answer
    hat: seed([4, 12], bars, 2),        // Hi-hat on beats 2 & 4
    openhat: emptyPattern(bars),
    clap: emptyPattern(bars),
    cymbal: mix(seed([0, 4, 8, 12], bars), seed([2, 6, 10, 14], bars, 2)),
    tom: emptyPattern(bars),
    rim: seed([6, 14], bars),           // Small comping taps
  }),
  "Bebop": ({ bars }) => ({
    // Classic bebop ride pattern: 8th notes on ride, hi-hat on 2 & 4
    // With triplet feel + swing this lands closer to a real spang-a-lang pulse
    kick: seed([0, 8], bars),           // Feathered kick on beats 1 & 3
    snare: emptyPattern(bars),          // Jazz: minimal snare, comping with hands
    hat: seed([4, 12], bars, 2),        // Hi-hat on beats 2 & 4 (foot chick)
    openhat: emptyPattern(bars),
    clap: emptyPattern(bars),
    cymbal: mix(seed([0, 2, 4, 6, 8, 10, 12, 14], bars), seed([0, 6, 8, 14], bars, 2)),
    tom: emptyPattern(bars),
    rim: seed([10], bars),              // Small comping answer
  }),
  "Jazz Modern": ({ bars }) => ({
    // Post-bop / modern jazz: open ride variations, displaced kicks, comping snare
    kick: mix(seed([0, 9], bars), seed([13], bars, 2)),
    snare: mix(seed([4, 10], bars), seed([12], bars, 2)),
    hat: seed([4, 12], bars, 2),        // Hi-hat still on 2 & 4
    openhat: seed([6, 14], bars),       // Open hi-hat for texture
    clap: emptyPattern(bars),
    cymbal: mix(mix(seed([0, 4, 8, 12], bars, 2), seed([2, 6, 10, 14], bars)), seed([11], bars)),
    tom: seed([7], bars, 2),            // Tom accent on upbeat
    rim: seed([2, 14], bars),           // Rimshot comping
  }),
};

// Timing trainer preset configurations
export const TRAINER_PRESETS = {
  callResponse: { label: 'Call & Response', play: 2, silence: 2, desc: 'Listen, then keep the groove going' },
  steadyGap: { label: 'Steady Gap', play: 3, silence: 1, desc: 'Short gap — hold the groove' },
  deepDive: { label: 'Deep Dive', play: 2, silence: 4, desc: 'Minimal reference, maximum independence' },
  checkIn: { label: 'Check-In', play: 1, silence: 3, desc: 'Minimal check-in, maximum inner clock' },
  fadeAway: { label: 'Fade Away', play: null, silence: null, desc: 'Less and less reference over time' },
  custom: { label: 'Custom', play: null, silence: null, desc: 'Set your own play / silence ratio' },
};
