const STATIONS = [
  {
    name: 'SOLMAR FM',
    bpm: 132,
    bass: [55, 0, 55, 0, 65.41, 0, 55, 0, 87.31, 0, 87.31, 0, 98, 0, 82.41, 0],
    lead: [220, 0, 0, 261.63, 0, 0, 329.63, 0, 0, 392, 0, 0, 329.63, 0, 261.63, 0],
    bassType: 'sawtooth',
    leadType: 'square',
  },
  {
    name: 'PALM 98',
    bpm: 84,
    chords: [
      [220, 261.63, 329.63],
      [174.61, 220, 261.63],
      [196, 246.94, 293.66],
      [196, 246.94, 293.66],
    ],
    bass: [110, 0, 0, 0, 87.31, 0, 0, 0, 130.81, 0, 0, 0, 98, 0, 0, 0],
    padType: 'triangle',
  },
  {
    name: 'VISTA TALK',
    bpm: 100,
    talk: [1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0],
    pitches: [180, 210, 160, 240, 190, 220, 170],
  },
];
export function createRadio(G) {
  let ctx = null;
  let radioGain = null;
  let station = 0;
  let step = 0;
  let nextStepTime = 0;
  let dead = false; 
  function ensureCtx() {
    if (ctx || dead) return !!ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        dead = true;
        return false;
      }
      ctx = new AC();
      radioGain = ctx.createGain();
      radioGain.gain.value = 0;
      radioGain.connect(ctx.destination);
      return true;
    } catch {
      dead = true;
      return false;
    }
  }
  function inCar() {
    const p = G.player;
    return !!p && !p.onFoot && !!p.car && G.screen === 'playing';
  }
  function muted() {
    return !!G.api.audio?.isMuted?.();
  }
  function playNote(freq, at, dur, type, vol) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, at + dur);
    osc.connect(g);
    g.connect(radioGain);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }
  function scheduleStep(st, idx, at) {
    const stepDur = 60 / st.bpm / 2; 
    if (st.bass) {
      const f = st.bass[idx];
      if (f) playNote(f, at, stepDur * 1.8, st.bassType || 'sawtooth', 0.5);
    }
    if (st.lead) {
      const f = st.lead[idx];
      if (f) playNote(f, at, stepDur * 0.9, st.leadType || 'square', 0.16);
    }
    if (st.chords && idx % 4 === 0) {
      const chord = st.chords[(idx / 4) | 0];
      for (const f of chord) playNote(f, at, stepDur * 4.5, st.padType || 'triangle', 0.12);
    }
    if (st.talk && st.talk[idx]) {
      const p = st.pitches[(idx * 7 + 3) % st.pitches.length];
      playNote(p, at, 0.09, 'square', 0.22);
      playNote(p * 1.5, at + 0.05, 0.06, 'square', 0.1);
    }
  }
  function currentName() {
    return STATIONS[station].name;
  }
  function setStation(i) {
    station = ((i % STATIONS.length) + STATIONS.length) % STATIONS.length;
    step = 0;
    nextStepTime = 0; 
    G.announce?.(`Radio: ${currentName()}`);
    return currentName();
  }
  function next() {
    return setStation(station + 1);
  }
  function update() {
    if (dead) return;
    const on = inCar() && !muted();
    if (!on) {
      if (radioGain) radioGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
      nextStepTime = 0; 
      return;
    }
    if (!ensureCtx()) return;
    if (ctx.state === 'suspended') void ctx.resume();
    radioGain.gain.setTargetAtTime(0.11, ctx.currentTime, 0.15);
    const st = STATIONS[station];
    const stepDur = 60 / st.bpm / 2;
    if (!nextStepTime) nextStepTime = ctx.currentTime + 0.05;
    while (nextStepTime < ctx.currentTime + 0.18) {
      scheduleStep(st, step, nextStepTime);
      step = (step + 1) % 16;
      nextStepTime += stepDur;
    }
  }
  return {
    update,
    next,
    setStation,
    currentName,
    stationNames: STATIONS.map((s) => s.name),
    get station() {
      return station;
    },
    get playing() {
      return !!ctx && inCar() && !muted();
    },
  };
}
