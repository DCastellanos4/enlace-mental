// Pequeña utilidad para generar sonidos sin necesitar archivos de audio usando Web Audio API
let audioCtx = null;

export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
};

const playTone = (freq, type, duration, vol=0.1) => {
  if (!audioCtx) return;
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
  
  gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duration);
};

export const playPop = () => {
  initAudio();
  playTone(600, 'sine', 0.1, 0.05);
};

export const playTick = () => {
  initAudio();
  playTone(800, 'triangle', 0.05, 0.02);
};

export const playWin = () => {
  initAudio();
  playTone(440, 'sine', 0.2, 0.1);
  setTimeout(() => playTone(554, 'sine', 0.2, 0.1), 100);
  setTimeout(() => playTone(659, 'sine', 0.4, 0.1), 200);
};
