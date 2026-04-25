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
export function getCharacter(params) { return params?.character || 'synthetic'; }

function isAcoustic(params) {
  return getCharacter(params) === 'acoustic';
}

export function triggerKick(ctx, dest, time, velocity = 1, params) {
  const v = velGain(velocity);
  const tune = getTune(params);
  const decay = getDecay(params);
  const tone = getTone(params);
  const punch = getPunch(params);

  if (isAcoustic(params)) {
    const shell = ctx.createOscillator();
    const shellGain = ctx.createGain();
    shell.type = "sine";
    shell.frequency.setValueAtTime((78 + tone * 18) * tune, time);
    shell.frequency.exponentialRampToValueAtTime((48 + tone * 10) * tune, time + 0.11 * decay);
    shellGain.gain.setValueAtTime((0.52 + punch * 0.16) * v, time);
    shellGain.gain.exponentialRampToValueAtTime(0.001, time + (0.26 + tone * 0.08) * decay);
    shell.connect(shellGain).connect(dest);
    shell.start(time);
    shell.stop(time + (0.32 + tone * 0.08) * decay);

    const head = ctx.createOscillator();
    const headGain = ctx.createGain();
    head.type = "triangle";
    head.frequency.setValueAtTime((118 + tone * 28) * tune, time);
    head.frequency.exponentialRampToValueAtTime((68 + tone * 12) * tune, time + 0.055 * decay);
    headGain.gain.setValueAtTime((0.14 + punch * 0.08) * v, time);
    headGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08 * decay);
    head.connect(headGain).connect(dest);
    head.start(time);
    head.stop(time + 0.11 * decay);

    const beater = noiseSource(ctx, 'short');
    const beaterFilter = ctx.createBiquadFilter();
    beaterFilter.type = "bandpass";
    beaterFilter.frequency.value = (1150 + punch * 900 + tone * 350) * tune;
    beaterFilter.Q.value = 1.8;
    const beaterGain = ctx.createGain();
    beaterGain.gain.setValueAtTime((0.035 + punch * 0.05) * v, time);
    beaterGain.gain.exponentialRampToValueAtTime(0.001, time + 0.018);
    beater.connect(beaterFilter).connect(beaterGain).connect(dest);
    beater.start(time);
    beater.stop(time + 0.026);
    return;
  }

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
  const punch = getPunch(params);

  if (isAcoustic(params)) {
    const shell = ctx.createOscillator();
    shell.type = "sine";
    shell.frequency.setValueAtTime((172 + tone * 42) * tune, time);
    shell.frequency.exponentialRampToValueAtTime((138 + tone * 18) * tune, time + 0.055 * decay);
    const shellGain = ctx.createGain();
    shellGain.gain.setValueAtTime((0.13 + (1 - texture) * 0.08) * v, time);
    shellGain.gain.exponentialRampToValueAtTime(0.001, time + (0.11 + tone * 0.035) * decay);
    shell.connect(shellGain).connect(dest);
    shell.start(time);
    shell.stop(time + (0.15 + tone * 0.035) * decay);

    const stick = noiseSource(ctx, 'short');
    const stickHp = ctx.createBiquadFilter();
    stickHp.type = "highpass";
    stickHp.frequency.value = (1200 + tone * 500) * tune;
    const stickBp = ctx.createBiquadFilter();
    stickBp.type = "bandpass";
    stickBp.frequency.value = (2100 + punch * 900 + tone * 420) * tune;
    stickBp.Q.value = 1.4;
    const stickGain = ctx.createGain();
    stickGain.gain.setValueAtTime((0.12 + punch * 0.04) * v, time);
    stickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.012);
    stick.connect(stickHp).connect(stickBp).connect(stickGain).connect(dest);
    stick.start(time);
    stick.stop(time + 0.018);

    const wireCrack = noiseSource(ctx, 'short');
    const crackHp = ctx.createBiquadFilter();
    crackHp.type = "highpass";
    crackHp.frequency.value = (1550 + tone * 550) * tune;
    crackHp.Q.value = 0.2;
    const crackGain = ctx.createGain();
    crackGain.gain.setValueAtTime((0.18 + texture * 0.16) * v, time + 0.002);
    crackGain.gain.exponentialRampToValueAtTime(0.001, time + 0.045 * decay);
    wireCrack.connect(crackHp).connect(crackGain).connect(dest);
    wireCrack.start(time + 0.002);
    wireCrack.stop(time + 0.06 * decay);

    const wires = noiseSource(ctx, 'medium');
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = (1800 + tone * 700) * tune;
    hp.Q.value = 0.16;
    const shelf = ctx.createBiquadFilter();
    shelf.type = "highshelf";
    shelf.frequency.value = 5200 * tune;
    shelf.gain.value = -4 + texture * 2;
    const wireGain = ctx.createGain();
    wireGain.gain.setValueAtTime((0.13 + texture * 0.2) * v, time + 0.014);
    wireGain.gain.exponentialRampToValueAtTime(0.001, time + (0.16 + texture * 0.1) * decay);
    wires.connect(hp).connect(shelf).connect(wireGain).connect(dest);
    wires.start(time + 0.014);
    wires.stop(time + (0.22 + texture * 0.12) * decay);
    return;
  }

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

  if (isAcoustic(params)) {
    const noise = noiseSource(ctx, 'short');
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = (6200 + tone * 2600) * tune;
    hp.Q.value = 0.2;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = (9400 + texture * 1600) * tune;
    bp.Q.value = 0.55 + texture * 0.45;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime((0.09 + texture * 0.08) * v, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + (0.055 + tone * 0.035) * decay);
    noise.connect(hp).connect(bp).connect(gain).connect(dest);
    noise.start(time);
    noise.stop(time + (0.07 + tone * 0.04) * decay);
    return;
  }

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

  if (isAcoustic(params)) {
    const noise = noiseSource(ctx, 'medium');
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = (5200 + tone * 2600) * tune;
    hp.Q.value = 0.2;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = (8400 + texture * 2100) * tune;
    bp.Q.value = 0.45 + texture * 0.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime((0.11 + texture * 0.1) * v, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + (0.28 + tone * 0.16) * decay);
    noise.connect(hp).connect(bp).connect(gain).connect(dest);
    noise.start(time);
    noise.stop(time + (0.34 + tone * 0.18) * decay);
    return;
  }

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

  if (isAcoustic(params)) {
    const stick = noiseSource(ctx, 'short');
    const stickHp = ctx.createBiquadFilter();
    stickHp.type = 'highpass';
    stickHp.frequency.value = (2600 + tone * 900) * tune;
    stickHp.Q.value = 0.2;
    const stickBp = ctx.createBiquadFilter();
    stickBp.type = 'bandpass';
    stickBp.frequency.value = (4300 + texture * 1200) * tune;
    stickBp.Q.value = 1.1;
    const stickGain = ctx.createGain();
    stickGain.gain.setValueAtTime((0.12 + texture * 0.03) * v, time);
    stickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.026);
    stick.connect(stickHp).connect(stickBp).connect(stickGain).connect(dest);
    stick.start(time);
    stick.stop(time + 0.035);

    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell.type = 'sine';
    bell.frequency.setValueAtTime((980 + tone * 220) * tune, time);
    bellGain.gain.setValueAtTime((0.018 + texture * 0.006) * v, time);
    bellGain.gain.exponentialRampToValueAtTime(0.001, time + 0.09 * decay);
    bell.connect(bellGain).connect(dest);
    bell.start(time);
    bell.stop(time + 0.12 * decay);

    const wash = noiseSource(ctx, 'long');
    const washHp = ctx.createBiquadFilter();
    washHp.type = 'highpass';
    washHp.frequency.value = (2900 + tone * 1100) * tune;
    washHp.Q.value = 0.15;
    const washShelf = ctx.createBiquadFilter();
    washShelf.type = 'highshelf';
    washShelf.frequency.value = 7600 * tune;
    washShelf.gain.value = -5 + texture * 2;
    const washGain = ctx.createGain();
    washGain.gain.setValueAtTime((0.045 + texture * 0.035) * v, time + 0.006);
    washGain.gain.exponentialRampToValueAtTime((0.026 + texture * 0.028) * v, time + 0.11);
    washGain.gain.exponentialRampToValueAtTime(0.001, time + (1.7 + texture * 1.2) * decay);
    wash.connect(washHp).connect(washShelf).connect(washGain).connect(dest);
    wash.start(time + 0.006);
    wash.stop(time + (2.1 + texture * 1.7) * decay);
    return;
  }

  // Stick-click: short noise burst shaped like a ride "tick"
  const tick = noiseSource(ctx, 'short');
  const tickHp = ctx.createBiquadFilter();
  tickHp.type = 'highpass';
  tickHp.frequency.value = (3500 + tone * 2000) * tune;
  const tickLp = ctx.createBiquadFilter();
  tickLp.type = 'lowpass';
  tickLp.frequency.value = (9000 + tone * 2000) * tune;
  const tickGain = ctx.createGain();
  tickGain.gain.setValueAtTime((0.18 + texture * 0.1) * v, time);
  tickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.014);
  tick.connect(tickHp).connect(tickLp).connect(tickGain).connect(dest);
  tick.start(time);
  tick.stop(time + 0.02);

  // Shimmer: bandpass noise — metallic sizzle layer
  const shimmer = noiseSource(ctx, 'medium');
  const shimmerBp = ctx.createBiquadFilter();
  shimmerBp.type = 'bandpass';
  shimmerBp.frequency.value = (7000 + tone * 3000) * tune;
  shimmerBp.Q.value = 0.35 + texture * 0.4;
  const shimmerGain = ctx.createGain();
  shimmerGain.gain.setValueAtTime((0.07 + texture * 0.08) * v, time);
  shimmerGain.gain.exponentialRampToValueAtTime(0.001, time + (0.12 + texture * 0.22) * decay);
  shimmer.connect(shimmerBp).connect(shimmerGain).connect(dest);
  shimmer.start(time);
  shimmer.stop(time + (0.18 + texture * 0.28) * decay);

  // Wash: main cymbal body — highpass noise, long sustain
  const wash = noiseSource(ctx, 'long');
  const washHp = ctx.createBiquadFilter();
  washHp.type = 'highpass';
  washHp.frequency.value = (2500 + tone * 2000) * tune;
  washHp.Q.value = 0.3;
  const washGain = ctx.createGain();
  washGain.gain.setValueAtTime((0.07 + texture * 0.1) * v, time);
  washGain.gain.exponentialRampToValueAtTime((0.035 + texture * 0.06) * v, time + 0.1);
  washGain.gain.exponentialRampToValueAtTime(0.001, time + (1.0 + texture * 1.2) * decay);
  wash.connect(washHp).connect(washGain).connect(dest);
  wash.start(time);
  wash.stop(time + (1.2 + texture * 1.4) * decay);
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
