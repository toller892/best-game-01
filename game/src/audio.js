// Synthesised sound effects through WebAudio: no audio files, no network.
// The context is created on the first user gesture, so browsers allow it.

let ctx = null;
let muted = false;
let master = null;

/** Create (or resume) the audio context; call from a user gesture. */
export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.22;
  return muted;
}

function tone(freq, duration, type, volume, slideTo) {
  if (!ctx || muted) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function noiseBurst(duration, volume, lowFreq) {
  if (!ctx || muted) return;
  const now = ctx.currentTime;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowFreq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start(now);
}

/** A sprite latched on; the pitch climbs with how many are carried. */
export function sfxPickup(carried) {
  tone(620 + carried * 45, 0.09, 'sine', 0.5, 940 + carried * 45);
}

/** All carried sprites delivered: a rising chime. */
export function sfxDeliver(count) {
  const base = 523;
  for (let i = 0; i < Math.min(count, 6); i += 1) {
    setTimeout(() => tone(base * [1, 1.25, 1.5, 2][i % 4], 0.16, 'triangle', 0.45), i * 55);
  }
}

/** A wisp hit: low thud plus noise. */
export function sfxHit() {
  tone(140, 0.28, 'sawtooth', 0.5, 55);
  noiseBurst(0.22, 0.4, 900);
}

/** The pulse shockwave. */
export function sfxPulse() {
  tone(300, 0.3, 'sine', 0.4, 90);
  noiseBurst(0.25, 0.25, 2400);
}

/** A wave cleared: a short fanfare. */
export function sfxWaveClear() {
  [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.5), i * 90));
}

/** The game is won. */
export function sfxWin() {
  [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.5), i * 110));
}

/** The game is lost. */
export function sfxLose() {
  [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.32, 'sawtooth', 0.35), i * 130));
}

/** A button click / start. */
export function sfxClick() {
  tone(760, 0.07, 'sine', 0.4, 980);
}
