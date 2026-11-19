export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let engineFilter = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenLfo = null;
  let muted = false;
  let radioNodes = null;
  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.4;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineOsc2 = ctx.createOscillator();
      engineOsc2.type = 'sawtooth';
      engineOsc2.frequency.value = 82;
      engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineOsc2.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      engineOsc2.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 720;
      sirenLfo = ctx.createOscillator();
      sirenLfo.type = 'square';
      sirenLfo.frequency.value = 0.55;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 180;
      sirenLfo.connect(lfoGain);
      lfoGain.connect(sirenOsc.frequency);
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      sirenLfo.start();
      return true;
    } catch {
      return false;
    }
  }
  function unlock() {
    if (ensure() && ctx.state === 'suspended') ctx.resume();
  }
  function noiseBurst(seconds, filterFreq, gainValue) {
    if (!ctx) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.value = gainValue;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
  }
  function tone(freq, seconds, type, gainValue, slideTo) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + seconds);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + seconds + 0.02);
  }
  function sfx(name) {
    if (!ctx || muted) return;
    if (name === 'shot') {
      noiseBurst(0.12, 3200, 0.5);
      tone(140, 0.08, 'square', 0.25, 60);
    } else if (name === 'crash') {
      noiseBurst(0.3, 900, 0.6);
    } else if (name === 'pickup') {
      tone(660, 0.09, 'sine', 0.3);
      setTimeout(() => tone(990, 0.12, 'sine', 0.3), 80);
    } else if (name === 'cash') {
      tone(880, 0.08, 'sine', 0.25);
      setTimeout(() => tone(1174, 0.08, 'sine', 0.25), 70);
      setTimeout(() => tone(1568, 0.14, 'sine', 0.25), 140);
    } else if (name === 'click') {
      tone(1200, 0.04, 'square', 0.12);
    } else if (name === 'fail') {
      tone(220, 0.35, 'sawtooth', 0.2, 110);
    } else if (name === 'door') {
      noiseBurst(0.08, 1400, 0.25);
      tone(180, 0.06, 'square', 0.15, 120);
    } else if (name === 'siren-on') {
      tone(720, 0.15, 'sine', 0.15, 960);
    }
  }
  function engine(rpm, on) {
    if (!ctx) return;
    const target = on && !muted ? 0.05 + rpm * 0.11 : 0;
    engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
    engineOsc.frequency.setTargetAtTime(52 + rpm * 130, ctx.currentTime, 0.08);
    engineOsc2.frequency.setTargetAtTime(78 + rpm * 190, ctx.currentTime, 0.08);
  }
  function siren(on) {
    if (!ctx) return;
    sirenGain.gain.setTargetAtTime(on && !muted ? 0.045 : 0, ctx.currentTime, 0.2);
  }
  function setMuted(value) {
    muted = value;
    if (master) master.gain.value = muted ? 0 : 0.4;
  }
  function isMuted() {
    return muted;
  }
  return { unlock, sfx, engine, siren, setMuted, isMuted };
}
