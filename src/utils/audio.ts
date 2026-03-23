export const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

export const playTone = (freq: number, type: OscillatorType, duration: number, vol: number = 0.1) => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
};

export const playDing = () => {
  playTone(880, 'sine', 0.1, 0.2);
  setTimeout(() => playTone(1100, 'sine', 0.3, 0.2), 100);
};
export const playBuzz = () => playTone(150, 'sawtooth', 0.5, 0.2);
export const playFlip = () => playTone(300, 'triangle', 0.1, 0.1);
export const playBell = () => {
  playTone(1000, 'sine', 1.0, 0.3);
  playTone(1200, 'sine', 1.0, 0.2);
};
export const playTick = () => playTone(600, 'square', 0.05, 0.05);
