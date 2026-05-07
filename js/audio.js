/* js/audio.js — Web Audio API Arcade Sound System */

const Audio = (() => {
  let ctx = null;
  let musicGain = null;
  let sfxGain   = null;
  let musicOscillators = [];
  let sfxEnabled   = true;
  let musicEnabled = true;
  let musicPlaying = false;
  let musicBeat = 0;
  let musicTimer = null;

  function init() {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      musicGain = ctx.createGain();
      sfxGain   = ctx.createGain();
      musicGain.gain.value = 0.18;
      sfxGain.gain.value   = 0.45;
      musicGain.connect(ctx.destination);
      sfxGain.connect(ctx.destination);
    } catch(e) {
      console.warn('Web Audio not supported');
    }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  /* ---- PRIMITIVE SYNTH ---- */
  function tone(freq, type, duration, gainVal, gainNode) {
    if (!ctx) return;
    resume();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(gainNode || sfxGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
    return osc;
  }

  function sweep(freqStart, freqEnd, type, duration, gainVal) {
    if (!ctx) return;
    resume();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + duration);
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  /* ---- SFX ---- */
  const SFX = {
    shoot() {
      if (!sfxEnabled) return;
      sweep(800, 1800, 'square', 0.08, 0.3);
    },

    segmentHit() {
      if (!sfxEnabled) return;
      sweep(200, 80, 'sawtooth', 0.15, 0.5);
      setTimeout(() => sweep(300, 100, 'square', 0.1, 0.3), 40);
    },

    mushroomDestroy() {
      if (!sfxEnabled) return;
      sweep(400, 200, 'square', 0.12, 0.35);
    },

    centipedeSplit() {
      if (!sfxEnabled) return;
      for (let i = 0; i < 3; i++) {
        setTimeout(() => sweep(500 + i*200, 800 + i*100, 'sawtooth', 0.1, 0.2), i * 60);
      }
    },

    playerHit() {
      if (!sfxEnabled) return;
      sweep(300, 50, 'sawtooth', 0.2, 0.7);
      setTimeout(() => sweep(200, 40, 'square', 0.15, 0.5), 80);
    },

    powerupCollect() {
      if (!sfxEnabled) return;
      [523, 659, 784, 1047].forEach((f, i) => {
        setTimeout(() => tone(f, 'sine', 0.15, 0.4), i * 60);
      });
    },

    levelComplete() {
      if (!sfxEnabled) return;
      const notes = [523, 659, 784, 1047, 1319];
      notes.forEach((f, i) => {
        setTimeout(() => tone(f, 'square', 0.2, 0.4), i * 80);
      });
    },

    gameOver() {
      if (!sfxEnabled) return;
      const notes = [440, 392, 349, 294, 220];
      notes.forEach((f, i) => {
        setTimeout(() => tone(f, 'sawtooth', 0.25, 0.45), i * 120);
      });
    },

    extraLife() {
      if (!sfxEnabled) return;
      [440, 523, 659, 880].forEach((f, i) => {
        setTimeout(() => tone(f, 'sine', 0.2, 0.5), i * 70);
      });
    },

    bomb() {
      if (!sfxEnabled) return;
      sweep(100, 40, 'sawtooth', 0.4, 0.8);
      setTimeout(() => sweep(80, 20, 'square', 0.5, 0.6), 100);
    },

    ambientBuzz(intensity = 0) {
      // Called per-frame for proximity effect — handled via oscillator in music
    }
  };

  /* ---- MUSIC ---- */
  const musicNotes = [
    // Simple arcade loop — 16 beats
    [196, 220, 247, 262, 220, 196, 175, 196,
     220, 262, 294, 330, 294, 262, 220, 196]
  ];

  function startMusic() {
    if (!ctx || !musicEnabled || musicPlaying) return;
    musicPlaying = true;
    musicBeat = 0;
    scheduleMusic();
  }

  function scheduleMusic() {
    if (!musicPlaying || !musicEnabled) return;
    const notes = musicNotes[0];
    const note  = notes[musicBeat % notes.length];
    const speed = window.Game ? window.Game.getMusicTempo() : 0.18;

    if (ctx) {
      const osc   = ctx.createOscillator();
      const gain  = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(note, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + speed * 0.8);
      osc.connect(gain);
      gain.connect(musicGain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + speed);
    }

    musicBeat++;
    musicTimer = setTimeout(scheduleMusic, speed * 1000);
  }

  function stopMusic() {
    musicPlaying = false;
    if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
  }

  /* ---- PUBLIC API ---- */
  return {
    init,
    sfx: SFX,
    startMusic,
    stopMusic,
    setSFX(on)   { sfxEnabled = on; },
    setMusic(on) {
      musicEnabled = on;
      if (!on) stopMusic();
      else if (!musicPlaying) startMusic();
    },
    isPlaying: () => musicPlaying,
    resume,
  };
})();
