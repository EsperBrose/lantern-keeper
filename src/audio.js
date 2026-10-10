// Tiny synthesized sound effects (Web Audio). No audio files needed.
let ac = null;
let master = null;
let muted = false;
const lastPlayed = {};

// Browsers only allow audio after a user gesture, so start lazily.
function ensure() {
  if (ac) return ac;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  ac = new Ctx();
  master = ac.createGain();
  master.gain.value = 0.35;
  master.connect(ac.destination);
  return ac;
}
for (const ev of ['keydown', 'pointerdown']) {
  window.addEventListener(ev, () => {
    if (ensure() && ac.state === 'suspended') ac.resume();
  });
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(type, f0, f1, dur, vol, delay = 0) {
  const t = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, vol, freq, delay = 0) {
  const t = ac.currentTime + delay;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const g = ac.createGain();
  g.gain.value = vol;
  src.connect(filter).connect(g).connect(master);
  src.start(t);
}

const SOUNDS = {
  swing: () => noise(0.08, 0.25, 1800),
  chop: () => {
    noise(0.07, 0.6, 900);
    tone('triangle', 220, 120, 0.08, 0.3);
  },
  mine: () => {
    noise(0.05, 0.5, 3000);
    tone('square', 900, 600, 0.05, 0.12);
  },
  hit: () => tone('square', 180, 90, 0.1, 0.18),
  kill: () => {
    tone('sawtooth', 160, 50, 0.35, 0.18);
    noise(0.2, 0.3, 500);
  },
  place: () => tone('triangle', 160, 110, 0.09, 0.35),
  arrow: () => {
    tone('triangle', 700, 300, 0.08, 0.12);
    noise(0.05, 0.15, 2500);
  },
  zap: () => {
    noise(0.18, 0.35, 4000);
    tone('square', 1200, 300, 0.15, 0.1);
  },
  hurt: () => tone('square', 140, 70, 0.15, 0.2),
  break: () => {
    noise(0.3, 0.6, 700);
    tone('triangle', 120, 50, 0.3, 0.3);
  },
  night: () => {
    tone('sine', 110, 82, 1.6, 0.35);
    tone('sine', 165, 123, 1.6, 0.2);
  },
  dawn: () => {
    tone('sine', 523, 523, 0.25, 0.2);
    tone('sine', 659, 659, 0.25, 0.2, 0.15);
    tone('sine', 784, 784, 0.4, 0.2, 0.3);
  },
  over: () => {
    tone('sawtooth', 300, 200, 0.3, 0.2);
    tone('sawtooth', 200, 100, 0.5, 0.2, 0.3);
  },
};

// Plays a named sound, skipping rapid repeats of the same one.
export function sfx(name, minGap = 0.05) {
  if (muted || !ensure() || ac.state !== 'running') return;
  const now = ac.currentTime;
  if (now - (lastPlayed[name] || -1) < minGap) return;
  lastPlayed[name] = now;
  SOUNDS[name]();
}
