// Tiny Web Audio sound cues — no audio files needed. Honours a persisted
// mute preference ('qn_sound' === 'off') and a reduced-motion-style opt-out.

let ctx;
const getCtx = () => {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
  }
  return ctx;
};

export const isSoundOn = () => {
  try { return localStorage.getItem('qn_sound') !== 'off'; } catch { return true; }
};

export const setSoundOn = (on) => {
  try { localStorage.setItem('qn_sound', on ? 'on' : 'off'); } catch { /* ignore */ }
};

const tone = (ac, freq, start, dur, type = 'sine', gain = 0.15) => {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(g);
  g.connect(ac.destination);
  const t = ac.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.start(t);
  osc.stop(t + dur + 0.03);
};

const play = (notes) => {
  if (!isSoundOn()) return;
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === 'suspended') ac.resume();
  notes.forEach((n) => tone(ac, n.f, n.t, n.d, n.type, n.g));
};

// Cheerful rising chime
export const playCorrect = () => play([
  { f: 523.25, t: 0, d: 0.16, type: 'triangle', g: 0.16 },
  { f: 659.25, t: 0.1, d: 0.16, type: 'triangle', g: 0.16 },
  { f: 783.99, t: 0.2, d: 0.28, type: 'triangle', g: 0.18 },
]);

// Soft descending buzz
export const playWrong = () => play([
  { f: 207.65, t: 0, d: 0.28, type: 'sawtooth', g: 0.12 },
  { f: 155.56, t: 0.1, d: 0.32, type: 'sawtooth', g: 0.12 },
]);

// Subtle click when an answer is locked in
export const playLock = () => play([
  { f: 660, t: 0, d: 0.07, type: 'square', g: 0.07 },
]);

// Gentle "time's up" tone
export const playTimesUp = () => play([
  { f: 440, t: 0, d: 0.12, type: 'sine', g: 0.14 },
  { f: 330, t: 0.13, d: 0.2, type: 'sine', g: 0.14 },
]);

// --- Presenter (TV) cues ---

// Urgent countdown tick
export const playTick = () => play([
  { f: 1050, t: 0, d: 0.05, type: 'square', g: 0.05 },
]);

// Dramatic reveal sting
export const playReveal = () => play([
  { f: 392, t: 0, d: 0.14, type: 'triangle', g: 0.15 },
  { f: 523.25, t: 0.12, d: 0.14, type: 'triangle', g: 0.15 },
  { f: 659.25, t: 0.24, d: 0.34, type: 'triangle', g: 0.18 },
]);

// Rising arpeggio for the leaderboard
export const playRiser = () => play([
  { f: 261.63, t: 0, d: 0.1, type: 'triangle', g: 0.1 },
  { f: 329.63, t: 0.08, d: 0.1, type: 'triangle', g: 0.11 },
  { f: 392, t: 0.16, d: 0.1, type: 'triangle', g: 0.12 },
  { f: 523.25, t: 0.24, d: 0.1, type: 'triangle', g: 0.13 },
  { f: 659.25, t: 0.32, d: 0.24, type: 'triangle', g: 0.14 },
]);

// Podium fanfare
export const playFanfare = () => play([
  { f: 392, t: 0, d: 0.16, type: 'triangle', g: 0.16 },
  { f: 392, t: 0.18, d: 0.1, type: 'triangle', g: 0.14 },
  { f: 392, t: 0.3, d: 0.1, type: 'triangle', g: 0.14 },
  { f: 523.25, t: 0.42, d: 0.5, type: 'triangle', g: 0.18 },
  { f: 659.25, t: 0.42, d: 0.5, type: 'triangle', g: 0.12 },
  { f: 783.99, t: 0.95, d: 0.6, type: 'triangle', g: 0.16 },
]);

// Small pop for awards / toasts
export const playPop = () => play([
  { f: 740, t: 0, d: 0.06, type: 'square', g: 0.06 },
  { f: 988, t: 0.05, d: 0.09, type: 'square', g: 0.06 },
]);
