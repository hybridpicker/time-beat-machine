// Cached noise buffers - created once per AudioContext
let noiseCache = null;
let noiseCacheCtx = null;

function ensureNoiseCache(ctx) {
  if (noiseCacheCtx === ctx && noiseCache) return;
  noiseCacheCtx = ctx;
  const sr = ctx.sampleRate;
  const makeBuffer = (seconds) => {
    const buf = ctx.createBuffer(1, seconds * sr, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  };
  noiseCache = {
    short: makeBuffer(0.1),   // hats, rimshot
    medium: makeBuffer(0.3),  // snare, clap
    long: makeBuffer(2.0),    // cymbal
  };
}

function noiseSource(ctx, type) {
  ensureNoiseCache(ctx);
  const src = ctx.createBufferSource();
  src.buffer = noiseCache[type];
  return src;
}

// velocity: 1 = normal, 2 = accent (1.5x)
export function velGain(velocity) {
  return velocity === 2 ? 1.5 : 1.0;
}

// Per-voice params:
// { tune: 0 (semitones), decay: 1.0 (multiplier), tone: 0.5, texture: 0.5, punch: 0.5 }
export function getTune(params) { return params?.tune ? Math.pow(2, params.tune / 12) : 1.0; }
export function getDecay(params) { return params?.decay ?? 1.0; }
export function getTone(params) { return params?.tone ?? 0.5; }
export function getTexture(params) { return params?.texture ?? 0.5; }
export function getPunch(params) { return params?.punch ?? 0.5; }

export function triggerKick(ctx, dest, time, velocity = 1, params) {
  const v = velGain(velocity);
  const tune = getTune(params);
  const decay = getDecay(params);
  const tone = getTone(params);
  const punch = getPunch(params);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime((95 + tone * 45) * tune, time);
  osc.frequency.exponentialRampToValueAtTime((32 + tone * 18) * tune, time + (0.12 + punch * 0.06) * decay);
  gain.gain.setValueAtTime((0.75 + punch * 0.3) * v, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + (0.15 + (1 - tone) * 0.08) * decay);
  osc.connect(gain).connect(dest);
  osc.start(time);
  osc.stop(time + (0.18 + (1 - tone) * 0.08) * decay);

  const clickOsc = ctx.createOscillator();
  clickOsc.type = punch > 0.75 ? 'square' : 'triangle';
  clickOsc.frequency.setValueAtTime((900 + punch * 1800 + tone * 400) * tune, time);
  clickOsc.frequency.exponentialRampToValueAtTime((180 + tone * 120) * tune, time + 0.012);
  const clickGain = ctx.createGain();
  clickGain.gain.setValueAtTime((0.015 + punch * 0.09) * v, time);
  clickGain.gain.exponentialRampToValueAtTime(0.001, time + (0.01 + punch * 0.01));
  clickOsc.connect(clickGain).connect(dest);
  clickOsc.start(time);
  clickOsc.stop(time + 0.02);
}

export function triggerSnare(ctx, dest, time, velocity = 1, params) {
  const v = velGain(velocity);
  const tune = getTune(params);
  const decay = getDecay(params);
  const tone = getTone(params);
  const texture = getTexture(params);
  const noise = noiseSource(ctx, 'medium');
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "highpass";
  noiseFilter.frequency.value = (500 + tone * 900) * tune;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime((0.35 + texture * 0.45) * v, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + (0.1 + texture * 0.1) * decay);
  noise.connect(noiseFilter).connect(noiseGain).connect(dest);

  const osc = ctx.createOscillator();
  osc.type = "triangle";
  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime((0.18 + (1 - texture) * 0.24) * v, time);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, time + (0.09 + (1 - tone) * 0.08) * decay);
  osc.frequency.setValueAtTime((150 + tone * 90) * tune, time);
  osc.connect(bodyGain).connect(dest);

  noise.start(time);
  noise.stop(time + (0.18 + texture * 0.12) * decay);
  osc.start(time);
  osc.stop(time + (0.11 + (1 - texture) * 0.08) * decay);
}

export function triggerHat(ctx, dest, time, velocity = 1, params) {
  const v = velGain(velocity);
  const tune = getTune(params);
  const decay = getDecay(params);
  const tone = getTone(params);
  const texture = getTexture(params);
  const noise = noiseSource(ctx, 'short');
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = (5000 + tone * 5500) * tune;
  bp.Q.value = 0.5 + texture * 1.2;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime((0.14 + texture * 0.18) * v, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + (0.035 + tone * 0.06) * decay);
  noise.connect(bp).connect(gain).connect(dest);
  noise.start(time);
  noise.stop(time + (0.045 + tone * 0.055) * decay);
}

export function triggerOpenHat(ctx, dest, time, velocity = 1, params) {
  const v = velGain(velocity);
  const tune = getTune(params);
  const decay = getDecay(params);
  const tone = getTone(params);
  const texture = getTexture(params);
  const noise = noiseSource(ctx, 'medium');
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = (4800 + tone * 5200) * tune;
  bp.Q.value = 0.4 + texture;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime((0.18 + texture * 0.18) * v, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + (0.12 + tone * 0.16) * decay);
  noise.connect(bp).connect(gain).connect(dest);
  noise.start(time);
  noise.stop(time + (0.14 + tone * 0.18) * decay);
}

export function triggerClap(ctx, dest, time, velocity = 1, params) {
  const v = velGain(velocity);
  const tune = getTune(params);
  const decay = getDecay(params);
  const tone = getTone(params);
  const texture = getTexture(params);

  // 3 rapid attack bursts — the "smack" transient of a hand clap.
  // Key: 8ms apart (not 25ms — that causes the guiro/scraping sound).
  [0, 0.008, 0.016].forEach((offset, i) => {
    const t = time + offset;
    const noise = noiseSource(ctx, 'short');
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = (900 + tone * 900) * tune;
    hp.Q.value = 0.5;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = (1900 + tone * 1700) * tune;
    bp.Q.value = 1.4 + texture * 2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime((i === 2 ? 0.4 + texture * 0.2 : 0.28 + texture * 0.16) * v, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.006 * decay);
    noise.connect(hp).connect(bp).connect(gain).connect(dest);
    noise.start(t);
    noise.stop(t + 0.009);
  });

  // Airy tail — body of the clap, starts right after the transient
  const tail = noiseSource(ctx, 'medium');
  const tailHp = ctx.createBiquadFilter();
  tailHp.type = 'highpass';
  tailHp.frequency.value = (650 + tone * 700) * tune;
  tailHp.Q.value = 0.3;
  const tailBp = ctx.createBiquadFilter();
  tailBp.type = 'bandpass';
  tailBp.frequency.value = (1500 + tone * 1200) * tune;
  tailBp.Q.value = 0.8 + texture;
  const tailGain = ctx.createGain();
  tailGain.gain.setValueAtTime((0.24 + texture * 0.26) * v, time + 0.022);
  tailGain.gain.exponentialRampToValueAtTime(0.001, time + 0.13 * decay);
  tail.connect(tailHp).connect(tailBp).connect(tailGain).connect(dest);
  tail.start(time + 0.022);
  tail.stop(time + 0.18 * decay);
}

export function triggerCymbal(ctx, dest, time, velocity = 1, params) {
  const v = velGain(velocity);
  const tune = getTune(params);
  const decay = getDecay(params);
  const tone = getTone(params);
  const texture = getTexture(params);
  const noise = noiseSource(ctx, 'long');
  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = (1800 + tone * 2600) * tune;
  highpass.Q.value = 0.35 + texture * 0.4;
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = (6200 + tone * 5200) * tune;
  bandpass.Q.value = 1.2 + texture * 1.5;
  const shimmerBandpass = ctx.createBiquadFilter();
  shimmerBandpass.type = "bandpass";
  shimmerBandpass.frequency.value = (3200 + (1 - tone) * 1800) * tune;
  shimmerBandpass.Q.value = 0.7 + texture * 0.8;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime((0.22 + texture * 0.26) * v, time);
  gain.gain.exponentialRampToValueAtTime((0.1 + tone * 0.14) * v, time + 0.1 * decay);
  gain.gain.exponentialRampToValueAtTime(0.001, time + (0.95 + texture * 0.95) * decay);
  const shimmerGain = ctx.createGain();
  shimmerGain.gain.setValueAtTime((0.025 + texture * 0.045) * v, time);
  shimmerGain.gain.exponentialRampToValueAtTime(0.001, time + (0.35 + texture * 0.8) * decay);
  noise.connect(highpass).connect(bandpass).connect(gain).connect(dest);
  noise.connect(shimmerBandpass).connect(shimmerGain).connect(dest);
  noise.start(time);
  noise.stop(time + (1.15 + texture * 1.1) * decay);

  const bellOsc = ctx.createOscillator();
  bellOsc.type = tone < 0.35 ? 'triangle' : 'sine';
  bellOsc.frequency.setValueAtTime((820 + (1 - tone) * 420) * tune, time);
  bellOsc.frequency.exponentialRampToValueAtTime((660 + (1 - tone) * 160) * tune, time + 0.18 * decay);
  const bellGain = ctx.createGain();
  bellGain.gain.setValueAtTime((0.008 + (1 - tone) * 0.018 + texture * 0.008) * v, time);
  bellGain.gain.exponentialRampToValueAtTime(0.001, time + (0.18 + texture * 0.24) * decay);
  bellOsc.connect(bellGain).connect(dest);
  bellOsc.start(time);
  bellOsc.stop(time + (0.22 + texture * 0.28) * decay);
}

export function triggerTom(ctx, dest, time, velocity = 1, params) {
  const v = velGain(velocity);
  const tune = getTune(params);
  const decay = getDecay(params);
  const tone = getTone(params);
  const punch = getPunch(params);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime((150 + tone * 90) * tune, time);
  osc.frequency.exponentialRampToValueAtTime((65 + tone * 35) * tune, time + (0.12 + punch * 0.06) * decay);
  gain.gain.setValueAtTime((0.45 + punch * 0.35) * v, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + (0.12 + (1 - tone) * 0.08) * decay);
  osc.connect(gain).connect(dest);
  osc.start(time);
  osc.stop(time + (0.14 + (1 - tone) * 0.1) * decay);
}

export function triggerRimshot(ctx, dest, time, velocity = 1, params) {
  const v = velGain(velocity);
  const tune = getTune(params);
  const decay = getDecay(params);
  const tone = getTone(params);
  const texture = getTexture(params);

  // Jazz-friendly side-stick: woody click, a little shell body, very little crack.
  const clickOsc = ctx.createOscillator();
  clickOsc.type = texture < 0.25 ? "sine" : "triangle";
  clickOsc.frequency.setValueAtTime((820 + tone * 900) * tune, time);
  clickOsc.frequency.exponentialRampToValueAtTime((520 + tone * 420) * tune, time + 0.014 * decay);
  const clickGain = ctx.createGain();
  clickGain.gain.setValueAtTime((0.08 + tone * 0.09) * v, time);
  clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.018 * decay);
  clickOsc.connect(clickGain).connect(dest);
  clickOsc.start(time);
  clickOsc.stop(time + 0.022 * decay);

  const bodyOsc = ctx.createOscillator();
  bodyOsc.type = "sine";
  bodyOsc.frequency.setValueAtTime((280 + (1 - tone) * 200) * tune, time);
  bodyOsc.frequency.exponentialRampToValueAtTime((190 + (1 - tone) * 120) * tune, time + 0.045 * decay);
  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime((0.08 + (1 - texture) * 0.1) * v, time);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.06 * decay);
  bodyOsc.connect(bodyGain).connect(dest);
  bodyOsc.start(time);
  bodyOsc.stop(time + 0.07 * decay);

  const noise = noiseSource(ctx, 'short');
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = (850 + tone * 1200) * tune;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = (1600 + tone * 1400) * tune;
  bp.Q.value = 0.8 + texture * 1.3;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime((0.045 + texture * 0.12) * v, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.022 * decay);
  noise.connect(hp).connect(bp).connect(noiseGain).connect(dest);
  noise.start(time);
  noise.stop(time + 0.03 * decay);
}

// Map track IDs to trigger functions
export const triggerMap = {
  kick: triggerKick,
  snare: triggerSnare,
  hat: triggerHat,
  openhat: triggerOpenHat,
  clap: triggerClap,
  cymbal: triggerCymbal,
  tom: triggerTom,
  rim: triggerRimshot,
};
