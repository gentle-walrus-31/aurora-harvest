// Aurora Harvest — every sound is synthesised with WebAudio, no audio
// files and no network. Short blips mark each action; a quiet pentatonic
// pad loops underneath while the game runs. Everything is guarded, so a
// browser without audio simply plays silent.
export function createAudio() {
  let context = null;
  let master = null;
  let musicTimer = null;
  let musicStep = 0;
  let muted = false;

  /** Create (or resume) the audio graph on the first user gesture. */
  function ensure() {
    try {
      if (context === null) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return false;
        context = new AudioContext();
        master = context.createGain();
        master.gain.value = 0.5;
        master.connect(context.destination);
      }
      if (context.state === 'suspended') void context.resume();
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, duration, type, volume, delay, slideTo) {
    if (muted || !ensure()) return;
    try {
      const start = context.currentTime + (delay || 0);
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, start);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), start + duration);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    } catch {
      // Sound is decoration: never let it break the game.
    }
  }

  /** A soft pentatonic pad note, cycling through a calm scale. */
  const PAD_NOTES = [220, 261.63, 293.66, 329.63, 392, 440, 523.25];

  function startMusic() {
    if (musicTimer !== null || !ensure()) return;
    musicTimer = window.setInterval(() => {
      if (muted) return;
      const note = PAD_NOTES[musicStep % PAD_NOTES.length];
      musicStep += 1;
      tone(note, 1.6, 'sine', 0.045, 0);
      tone(note * 2, 1.2, 'triangle', 0.02, 0.05);
    }, 900);
  }

  function stopMusic() {
    if (musicTimer !== null) {
      window.clearInterval(musicTimer);
      musicTimer = null;
    }
  }

  return {
    ensure,
    startMusic,
    stopMusic,
    /** Flip the mute flag; returns the new muted state. */
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() {
      return muted;
    },
    /** A collect blip that climbs in pitch as the combo grows. */
    playCollect(combo) {
      const base = 520 + Math.min(combo, 8) * 45;
      tone(base, 0.12, 'sine', 0.22, 0);
      tone(base * 1.5, 0.16, 'sine', 0.16, 0.05);
    },
    /** A low, rough buzz for taking a storm hit. */
    playHit() {
      tone(130, 0.28, 'sawtooth', 0.28, 0, 55);
      tone(65, 0.32, 'square', 0.14, 0, 40);
    },
    /** A bright three-note arpeggio for comets and shields. */
    playPower() {
      tone(660, 0.14, 'triangle', 0.22, 0);
      tone(880, 0.14, 'triangle', 0.22, 0.09);
      tone(1320, 0.22, 'triangle', 0.2, 0.18);
    },
    /** A short chime when the level rises. */
    playLevel() {
      tone(587.33, 0.12, 'sine', 0.18, 0);
      tone(880, 0.2, 'sine', 0.18, 0.1);
    },
    /** An ascending fanfare for reaching the target score. */
    playWin() {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, index) => tone(freq, 0.3, 'triangle', 0.24, index * 0.13));
    },
    /** A slow falling phrase for losing the last life. */
    playLose() {
      const notes = [392, 329.63, 261.63, 196];
      notes.forEach((freq, index) => tone(freq, 0.32, 'sine', 0.2, index * 0.16));
    },
  };
}
