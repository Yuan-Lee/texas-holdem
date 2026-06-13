import { ActionType } from '../engine/types';

const STORAGE_KEY = 'texas-holdem-muted';

function getStoredMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function setStoredMuted(v: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, v ? 'true' : 'false');
  } catch {}
}

let ctx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

let _muted = getStoredMuted();

export function isMuted(): boolean {
  return _muted;
}

export function toggleMute(): boolean {
  _muted = !_muted;
  setStoredMuted(_muted);
  return _muted;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.12) {
  if (_muted) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration);
  } catch {}
}

function playNoise(duration: number, volume = 0.06) {
  if (_muted) return;
  try {
    const c = getCtx();
    const bufferSize = c.sampleRate * duration;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = c.createBufferSource();
    source.buffer = buffer;
    const gain = c.createGain();
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    source.connect(gain);
    gain.connect(c.destination);
    source.start();
  } catch {}
}

function playDoubleTone(f1: number, f2: number, d: number, type: OscillatorType = 'sine', vol = 0.1) {
  playTone(f1, d, type, vol);
  setTimeout(() => playTone(f2, d, type, vol), d * 400);
}

export function playDeal() {
  playNoise(0.08, 0.07);
}

export function playChip() {
  playTone(1200, 0.08, 'sine', 0.08);
}

export function playFold() {
  playTone(400, 0.15, 'triangle', 0.08);
  setTimeout(() => playTone(300, 0.15, 'triangle', 0.06), 120);
}

export function playCheck() {
  playTone(800, 0.06, 'sine', 0.06);
}

export function playCall() {
  playDoubleTone(1000, 1200, 0.06, 'sine', 0.08);
}

export function playRaise() {
  playTone(600, 0.1, 'triangle', 0.1);
  setTimeout(() => playTone(900, 0.1, 'triangle', 0.08), 80);
  setTimeout(() => playTone(1200, 0.12, 'triangle', 0.07), 160);
}

export function playAllIn() {
  if (_muted) return;
  const c = getCtx();
  try {
    const now = c.currentTime;
    for (let i = 0; i < 4; i++) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400 + i * 120, now + i * 0.08);
      gain.gain.setValueAtTime(0.12 - i * 0.02, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.2);
    }
  } catch {}
}

export function playWin() {
  if (_muted) return;
  const c = getCtx();
  try {
    const now = c.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.12);
      gain.gain.setValueAtTime(0.1, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.35);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.35);
    });
  } catch {}
}

export function playLose() {
  playTone(400, 0.25, 'triangle', 0.1);
  setTimeout(() => playTone(300, 0.3, 'triangle', 0.08), 200);
  setTimeout(() => playTone(200, 0.4, 'triangle', 0.06), 400);
}

export function playShuffle() {
  playNoise(0.3, 0.05);
}

export function playButtonClick() {
  playTone(660, 0.03, 'sine', 0.05);
}

export function playActionSound(action: ActionType) {
  switch (action) {
    case ActionType.Fold:
      playFold();
      break;
    case ActionType.Check:
      playCheck();
      break;
    case ActionType.Call:
      playCall();
      break;
    case ActionType.Raise:
      playRaise();
      break;
    case ActionType.AllIn:
      playAllIn();
      break;
  }
}