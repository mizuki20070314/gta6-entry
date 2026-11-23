// All audio is synthesized locally; the game never fetches sound files.
// Engine and siren layers follow simulation state after the first user gesture.
// Each effect owns short oscillator nodes that clean themselves up when done.
let AUDIO_CTX = null;
let AUDIO_MUTED = false;
let AUDIO_READY = false;
let ENGINE_OSC = null;
let ENGINE_GAIN = null;
let SIREN_OSC1 = null;
let SIREN_OSC2 = null;
let SIREN_GAIN = null;
let TITLE_NODES = null;

function audioInit() {
  if (AUDIO_CTX) return AUDIO_CTX;
  try {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    AUDIO_CTX = new AudioCtor();

    ENGINE_OSC = AUDIO_CTX.createOscillator();
    ENGINE_OSC.type = "sawtooth";
    ENGINE_OSC.frequency.value = 80;
    ENGINE_GAIN = AUDIO_CTX.createGain();
    ENGINE_GAIN.gain.value = 0;
    ENGINE_OSC.connect(ENGINE_GAIN).connect(AUDIO_CTX.destination);
    ENGINE_OSC.start();

    SIREN_OSC1 = AUDIO_CTX.createOscillator();
    SIREN_OSC1.type = "square";
    SIREN_OSC1.frequency.value = 660;
    SIREN_OSC2 = AUDIO_CTX.createOscillator();
    SIREN_OSC2.type = "square";
    SIREN_OSC2.frequency.value = 880;
    SIREN_GAIN = AUDIO_CTX.createGain();
    SIREN_GAIN.gain.value = 0;
    SIREN_OSC1.connect(SIREN_GAIN);
    SIREN_OSC2.connect(SIREN_GAIN);
    SIREN_GAIN.connect(AUDIO_CTX.destination);
    SIREN_OSC1.start();
    SIREN_OSC2.start();
    AUDIO_READY = true;
  } catch (error) {
    AUDIO_CTX = null;
  }
  return AUDIO_CTX;
}

function audioResume() {
  if (!AUDIO_CTX) audioInit();
  if (AUDIO_CTX && AUDIO_CTX.state === "suspended") {
    try {
      const resume = AUDIO_CTX.resume();
      if (resume && resume.catch) resume.catch(() => {});
    } catch (error) {}
  }
}

window.addEventListener("keydown", audioResume, { once: true });
window.addEventListener("mousedown", audioResume, { once: true });
window.addEventListener("touchstart", audioResume, { once: true });

function setMute(value) {
  AUDIO_MUTED = !!value;
  if (AUDIO_MUTED) {
    if (ENGINE_GAIN) ENGINE_GAIN.gain.value = 0;
    if (SIREN_GAIN) SIREN_GAIN.gain.value = 0;
  }
}

function updateAudio(dt) {
  if (!AUDIO_CTX || AUDIO_MUTED) {
    if (ENGINE_GAIN) ENGINE_GAIN.gain.value = 0;
    if (SIREN_GAIN) SIREN_GAIN.gain.value = 0;
    return;
  }

  try {
    let speed = 0;
    if (!PLAYER.onFoot && PLAYER.vehicleId >= 0) {
      const ride = VEHICLES.find((vehicle) => vehicle.id === PLAYER.vehicleId);
      if (ride) speed = Math.abs(ride.speed || 0);
    }
    if (ENGINE_OSC) ENGINE_OSC.frequency.value = 70 + speed * 0.6;
    if (ENGINE_GAIN) ENGINE_GAIN.gain.value = !PLAYER.onFoot ? 0.06 + Math.min(0.08, speed / 4000) : 0;
  } catch (error) {}

  try {
    if (WANTED <= 0) {
      if (SIREN_GAIN) SIREN_GAIN.gain.value = 0;
      return;
    }
    const player = getPlayerPos();
    let closest = null;
    let closestDistance = Infinity;
    for (const vehicle of VEHICLES) {
      if (!vehicle.isPolice) continue;
      const distance = Math.hypot(vehicle.x - player.x, vehicle.y - player.y);
      if (distance < closestDistance) { closest = vehicle; closestDistance = distance; }
    }
    if (!closest) {
      if (SIREN_GAIN) SIREN_GAIN.gain.value = 0;
      return;
    }
    if (SIREN_GAIN) SIREN_GAIN.gain.value = Math.max(0.02, 0.12 - closestDistance / 8000);
    const now = performance.now() / 1000;
    if (SIREN_OSC1) SIREN_OSC1.frequency.value = 660 + Math.sin(now * 6) * 120;
    if (SIREN_OSC2) SIREN_OSC2.frequency.value = 880 + Math.sin(now * 6 + Math.PI) * 120;
  } catch (error) {}
}

function playNoise(dur, freq, vol) {
  if (!AUDIO_CTX || AUDIO_MUTED) return;
  try {
    const envelope = AUDIO_CTX.createGain();
    envelope.gain.value = vol || 0.3;
    envelope.connect(AUDIO_CTX.destination);
    const tone = AUDIO_CTX.createOscillator();
    tone.type = "square";
    tone.frequency.value = freq || 200;
    tone.connect(envelope);
    tone.start();
    envelope.gain.exponentialRampToValueAtTime(0.001, AUDIO_CTX.currentTime + dur);
    tone.stop(AUDIO_CTX.currentTime + dur);
  } catch (error) {}
}

function playGunshot() { playNoise(0.12, 180, 0.25); }
function playExplosion() { playNoise(0.6, 60, 0.4); }

function playMissionComplete() {
  if (!AUDIO_CTX || AUDIO_MUTED) return;
  try {
    [523, 659, 784, 1046].forEach((frequency, index) => {
      const tone = AUDIO_CTX.createOscillator();
      tone.type = "triangle";
      tone.frequency.value = frequency;
      const envelope = AUDIO_CTX.createGain();
      envelope.gain.value = 0.15;
      tone.connect(envelope).connect(AUDIO_CTX.destination);
      const start = AUDIO_CTX.currentTime + index * 0.12;
      tone.start(start);
      envelope.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
      tone.stop(start + 0.2);
    });
  } catch (error) {}
}

function playTitleTheme() {
  if (!AUDIO_CTX || AUDIO_MUTED) return;
  try {
    const chordSet = [[261, 329, 392], [293, 369, 440], [329, 415, 493], [261, 329, 392]];
    let start = AUDIO_CTX.currentTime;
    for (const chord of chordSet) {
      for (const frequency of chord) {
        const tone = AUDIO_CTX.createOscillator();
        tone.type = "sine";
        tone.frequency.value = frequency;
        const envelope = AUDIO_CTX.createGain();
        envelope.gain.value = 0.05;
        tone.connect(envelope).connect(AUDIO_CTX.destination);
        tone.start(start);
        envelope.gain.exponentialRampToValueAtTime(0.001, start + 0.9);
        tone.stop(start + 1);
      }
      start += 1;
    }
  } catch (error) {}
}

window.addEventListener("keydown", (event) => {
  if (event.code === "KeyM") setMute(!AUDIO_MUTED);
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
window.AUDIO_CTX = () => AUDIO_CTX;
