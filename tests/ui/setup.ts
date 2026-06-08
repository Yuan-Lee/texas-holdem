import '@testing-library/jest-dom';

// Mock AudioContext which doesn't exist in jsdom
class MockAudioContext {
  state = 'running';
  createOscillator() {
    return {
      type: 'sine',
      frequency: { setValueAtTime: () => {} },
      connect: () => {},
      start: () => {},
      stop: () => {},
    };
  }
  createGain() {
    return {
      gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      connect: () => {},
    };
  }
  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      start: () => {},
      stop: () => {},
    };
  }
  createBuffer() {
    return { getChannelData: () => new Float32Array(100) };
  }
  resume() {}
  get currentTime() { return 0; }
  get sampleRate() { return 44100; }
  get destination() { return {}; }
}

globalThis.AudioContext = MockAudioContext as unknown as typeof AudioContext;

// Mock localStorage
const store: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
} as Storage;