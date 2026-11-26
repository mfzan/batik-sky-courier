// WebAudio synthesis only — no audio files.
// Engine drone, wind noise, ring chime, landing thud, fanfare, rain hiss.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.windSrc = null;
    this.windGain = null;
    this.rainGain = null;
    this.started = false;
  }

  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    this.startEngine();
    this.startWind();
    this.started = true;
  }

  resume() {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  startEngine() {
    const ctx = this.ctx;
    this.engineOsc = ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 62;
    const sub = ctx.createOscillator();
    sub.type = 'square';
    sub.frequency.value = 31;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0.05;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.03;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    this.engineOsc.connect(lp);
    sub.connect(subGain);
    subGain.connect(lp);
    lp.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
    sub.start();
    this.engineSub = sub;
  }

  setEngine(throttle, speed) {
    if (!this.ctx || !this.engineOsc) return;
    const t = this.ctx.currentTime;
    const rpm = 55 + throttle * 55 + speed * 0.12;
    this.engineOsc.frequency.setTargetAtTime(rpm, t, 0.08);
    if (this.engineSub) this.engineSub.frequency.setTargetAtTime(rpm / 2, t, 0.08);
    this.engineGain.gain.setTargetAtTime(0.03 + throttle * 0.05, t, 0.1);
    if (this.windGain) this.windGain.gain.setTargetAtTime(0.008 + speed * 0.00045, t, 0.15);
  }

  startWind() {
    const ctx = this.ctx;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.windSrc = ctx.createBufferSource();
    this.windSrc.buffer = buf;
    this.windSrc.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 700;
    bp.Q.value = 0.6;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.01;
    this.windSrc.connect(bp);
    bp.connect(this.windGain);
    this.windGain.connect(this.master);
    this.windSrc.start();
    // Rain hiss: second noise loop, high-passed, gain controlled by weather.
    const rain = ctx.createBufferSource();
    rain.buffer = buf;
    rain.loop = true;
    rain.playbackRate.value = 1.7;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2600;
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;
    rain.connect(hp);
    hp.connect(this.rainGain);
    this.rainGain.connect(this.master);
    rain.start();
  }

  setRain(amount) {
    if (this.rainGain && this.ctx) {
      this.rainGain.gain.setTargetAtTime(amount * 0.05, this.ctx.currentTime, 0.2);
    }
  }

  blip(freq, dur, type, vol, when = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  ringChime() {
    this.blip(880, 0.35, 'sine', 0.22);
    this.blip(1318, 0.5, 'sine', 0.16, 0.07);
    this.blip(1760, 0.55, 'triangle', 0.1, 0.14);
  }

  thud() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.18);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.35);
  }

  fanfare() {
    const notes = [523, 659, 784, 1047, 784, 1047];
    notes.forEach((n, i) => this.blip(n, 0.4, 'triangle', 0.2, i * 0.13));
  }

  crashSound() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.5);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.65);
    this.thud();
  }
}
