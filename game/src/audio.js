// Tiny synthesised sounds for Rune Clash: no audio files, no network — a few WebAudio
// oscillators and a noise burst, started only after the player's first interaction.
let audioCtx = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

function ensureCtx() {
  if (audioCtx) return audioCtx;
  const AC = window.AudioContext ?? window.webkitAudioContext;
  if (!AC) return null;
  audioCtx = new AC();
  return audioCtx;
}

export function unlockAudio() {
  const ctx = ensureCtx();
  if (ctx && ctx.state === 'suspended') void ctx.resume();
}

function tone(freq, duration, type, gainValue, when = 0) {
  if (muted) return;
  const ctx = ensureCtx();
  if (!ctx) return;
  const start = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function noiseBurst(duration, gainValue) {
  if (muted) return;
  const ctx = ensureCtx();
  if (!ctx) return;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = gainValue;
  source.connect(gain).connect(ctx.destination);
  source.start();
}

export const sfx = {
  click() {
    tone(660, 0.07, 'sine', 0.12);
  },
  play() {
    tone(392, 0.12, 'triangle', 0.16);
    tone(523, 0.14, 'triangle', 0.14, 0.06);
  },
  hit() {
    noiseBurst(0.16, 0.22);
    tone(140, 0.16, 'sawtooth', 0.1);
  },
  heal() {
    tone(523, 0.18, 'sine', 0.12);
    tone(784, 0.22, 'sine', 0.1, 0.09);
  },
  turn() {
    tone(440, 0.1, 'triangle', 0.1);
  },
  win() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'triangle', 0.16, i * 0.12));
  },
  lose() {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.32, 'sine', 0.14, i * 0.14));
  },
};
