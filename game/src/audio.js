// audio.js — pure WebAudio synthesis (no files)
let AUDIO_CTX = null;
let AUDIO_MUTED = false;
let AUDIO_READY = false;
let ENGINE_OSC = null, ENGINE_GAIN = null;
let SIREN_OSC1 = null, SIREN_OSC2 = null, SIREN_GAIN = null;
let TITLE_NODES = null;

function audioInit() {
  if (AUDIO_CTX) return AUDIO_CTX;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    AUDIO_CTX = new Ctx();
    // engine
    ENGINE_OSC = AUDIO_CTX.createOscillator();
    ENGINE_OSC.type = 'sawtooth';
    ENGINE_OSC.frequency.value = 80;
    ENGINE_GAIN = AUDIO_CTX.createGain();
    ENGINE_GAIN.gain.value = 0;
    ENGINE_OSC.connect(ENGINE_GAIN).connect(AUDIO_CTX.destination);
    ENGINE_OSC.start();
    // siren
    SIREN_OSC1 = AUDIO_CTX.createOscillator(); SIREN_OSC1.type = 'square'; SIREN_OSC1.frequency.value = 660;
    SIREN_OSC2 = AUDIO_CTX.createOscillator(); SIREN_OSC2.type = 'square'; SIREN_OSC2.frequency.value = 880;
    SIREN_GAIN = AUDIO_CTX.createGain(); SIREN_GAIN.gain.value = 0;
    SIREN_OSC1.connect(SIREN_GAIN); SIREN_OSC2.connect(SIREN_GAIN); SIREN_GAIN.connect(AUDIO_CTX.destination);
    SIREN_OSC1.start(); SIREN_OSC2.start();
    AUDIO_READY = true;
  } catch (e) { AUDIO_CTX = null; }
  return AUDIO_CTX;
}

function audioResume() {
  if (!AUDIO_CTX) audioInit();
  if (AUDIO_CTX && AUDIO_CTX.state === 'suspended') { try { AUDIO_CTX.resume(); } catch (e) {} }
}

// call on first user input
window.addEventListener('keydown', audioResume, { once: true });
window.addEventListener('mousedown', audioResume, { once: true });
window.addEventListener('touchstart', audioResume, { once: true });

function setMute(v) { AUDIO_MUTED = !!v; if (ENGINE_GAIN) ENGINE_GAIN.gain.value = AUDIO_MUTED ? 0 : ENGINE_GAIN.gain.value; }

function updateAudio(dt) {
  if (!AUDIO_CTX || AUDIO_MUTED) {
    if (ENGINE_GAIN) ENGINE_GAIN.gain.value = 0;
    if (SIREN_GAIN) SIREN_GAIN.gain.value = 0;
    return;
  }
  // engine
  try {
    let speed = 0;
    if (!PLAYER.onFoot && PLAYER.vehicleId >= 0) {
      const v = VEHICLES.find(x => x.id === PLAYER.vehicleId);
      if (v) speed = Math.abs(v.speed || 0);
    }
    if (ENGINE_OSC) ENGINE_OSC.frequency.value = 70 + speed * 0.6;
    if (ENGINE_GAIN) ENGINE_GAIN.gain.value = (!PLAYER.onFoot) ? 0.06 + Math.min(0.08, speed / 4000) : 0;
  } catch (e) {}
  // siren
  try {
    if (WANTED > 0) {
      const pp = getPlayerPos();
      let near = null, nearD = 1e9;
      for (const v of VEHICLES) if (v.isPolice) { const d = Math.hypot(v.x - pp.x, v.y - pp.y); if (d < nearD) { nearD = d; near = v; } }
      if (near) {
        const vol = Math.max(0.02, 0.12 - nearD / 8000);
        if (SIREN_GAIN) SIREN_GAIN.gain.value = vol;
        const t = performance.now() / 1000;
        const f1 = 660 + Math.sin(t * 6) * 120;
        const f2 = 880 + Math.sin(t * 6 + Math.PI) * 120;
        if (SIREN_OSC1) SIREN_OSC1.frequency.value = f1;
        if (SIREN_OSC2) SIREN_OSC2.frequency.value = f2;
      } else {
        if (SIREN_GAIN) SIREN_GAIN.gain.value = 0;
      }
    } else {
      if (SIREN_GAIN) SIREN_GAIN.gain.value = 0;
    }
  } catch (e) {}
}

function playNoise(dur, freq, vol) {
  if (!AUDIO_CTX || AUDIO_MUTED) return;
  try {
    const g = AUDIO_CTX.createGain();
    g.gain.value = vol || 0.3;
    g.connect(AUDIO_CTX.destination);
    const o = AUDIO_CTX.createOscillator();
    o.type = 'square';
    o.frequency.value = freq || 200;
    o.connect(g);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, AUDIO_CTX.currentTime + dur);
    o.stop(AUDIO_CTX.currentTime + dur);
  } catch (e) {}
}

function playGunshot() { playNoise(0.12, 180, 0.25); }
function playExplosion() { playNoise(0.6, 60, 0.4); }
function playMissionComplete() {
  if (!AUDIO_CTX || AUDIO_MUTED) return;
  try {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => {
      const o = AUDIO_CTX.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const g = AUDIO_CTX.createGain(); g.gain.value = 0.15;
      o.connect(g).connect(AUDIO_CTX.destination);
      const t = AUDIO_CTX.currentTime + i * 0.12;
      o.start(t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o.stop(t + 0.2);
    });
  } catch (e) {}
}

function playTitleTheme() {
  // simple warm chords loop (one-shot short)
  if (!AUDIO_CTX || AUDIO_MUTED) return;
  try {
    const chords = [[261, 329, 392], [293, 369, 440], [329, 415, 493], [261, 329, 392]];
    let t = AUDIO_CTX.currentTime;
    chords.forEach((c) => {
      c.forEach((f) => {
        const o = AUDIO_CTX.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const g = AUDIO_CTX.createGain(); g.gain.value = 0.05;
        o.connect(g).connect(AUDIO_CTX.destination);
        o.start(t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.9); o.stop(t + 1);
      });
      t += 1;
    });
  } catch (e) {}
}

// mute toggle
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM') { AUDIO_MUTED = !AUDIO_MUTED; }
});

window.audioInit = audioInit;
window.audioResume = audioResume;
window.updateAudio = updateAudio;
window.playGunshot = playGunshot;
window.playExplosion = playExplosion;
window.playMissionComplete = playMissionComplete;
window.playTitleTheme = playTitleTheme;
window.AUDIO_MUTED = () => AUDIO_MUTED;
window.setMute = setMute;