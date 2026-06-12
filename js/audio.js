// Tiny WebAudio synth for retro sound effects. No audio files needed.
export class SFX {
  constructor() {
    this.ctx = null;
    this.master = null;
  }

  // Must be called from a user gesture (tap/click) to satisfy mobile autoplay rules.
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  tone({ freq = 440, endFreq = null, dur = 0.15, type = 'square', vol = 1, delay = 0 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  jump()  { this.tone({ freq: 280, endFreq: 720, dur: 0.18, type: 'square', vol: 0.5 }); }
  coin()  {
    this.tone({ freq: 988,  dur: 0.09, type: 'square', vol: 0.45 });
    this.tone({ freq: 1319, dur: 0.30, type: 'square', vol: 0.45, delay: 0.08 });
  }
  stomp() { this.tone({ freq: 350, endFreq: 90, dur: 0.18, type: 'triangle', vol: 0.9 }); }
  bump()  { this.tone({ freq: 140, endFreq: 80, dur: 0.10, type: 'square', vol: 0.6 }); }
  brick() {
    this.tone({ freq: 220, endFreq: 60, dur: 0.15, type: 'sawtooth', vol: 0.7 });
    this.tone({ freq: 500, endFreq: 150, dur: 0.10, type: 'square', vol: 0.3, delay: 0.02 });
  }
  hurt() {
    this.tone({ freq: 520, endFreq: 130, dur: 0.35, type: 'sawtooth', vol: 0.6 });
  }
  die() {
    [392, 330, 262, 196].forEach((f, i) =>
      this.tone({ freq: f, dur: 0.18, type: 'square', vol: 0.5, delay: i * 0.14 }));
  }
  checkpoint() {
    [523, 659, 784].forEach((f, i) =>
      this.tone({ freq: f, dur: 0.12, type: 'square', vol: 0.45, delay: i * 0.09 }));
  }
  win() {
    [392, 523, 659, 784, 1047, 1319].forEach((f, i) =>
      this.tone({ freq: f, dur: 0.22, type: 'square', vol: 0.5, delay: i * 0.12 }));
  }
}
